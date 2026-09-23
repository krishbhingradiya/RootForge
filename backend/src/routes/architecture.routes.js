import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { aiService } from '../ai/aiService.js';
import { getWorkspaceContext } from '../services/workspaceContext.service.js';
import {
  assertWorkspaceAccess,
  assertWorkspaceWriteAccess,
  handleRouteError
} from '../services/authorization.service.js';
import {
  validateArchitectureTopology,
  normalizeArchitectureData
} from '../ai/schemas/architecture.schema.js';
import {
  mapArchitectureToPrisma,
  mapNodesToPrisma,
  mapEdgesToPrisma,
  validateArchitectureForPersistence,
  persistArchitectureAtomic,
  sanitizeNodeType,
  sanitizeTier,
  sanitizeSource,
  sanitizeValidationStatus,
  formatIdList,
  ensureString
} from '../services/architecturePersistence.service.js';

const router = Router();

/**
 * Computes a deterministic hash of upstream Stage 2/3 inputs to detect architecture staleness
 */
function computeArchitectureContextHash(context) {
  const sol = context.solution || {};
  const option = sol.selectedOption || '';
  const tech = JSON.stringify(sol.classifiedTechStack || sol.techStack || '');
  const reqs = JSON.stringify((context.businessAnalysis?.requirements || []).map(r => (typeof r === 'object' ? r.id || r.text : r)));
  const systems = JSON.stringify(context.businessAnalysis?.existingSystems || []);
  return crypto.createHash('sha256').update(`${option}|${tech}|${reqs}|${systems}`).digest('hex').slice(0, 16);
}

// Get architecture canvas (tenant-scoped)
router.get('/:id/architecture', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const architecture = await prisma.architecture.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        nodes: true,
        edges: true
      }
    });

    if (!architecture) {
      const context = await getWorkspaceContext(req.params.id, req.user);
      const isStage3Approved = context.solution?.status === 'APPROVED' || !!context.solution?.selectedOption;
      return res.json({
        architecture: null,
        isStale: false,
        isStage3Approved,
        hasStage3Solution: !!context.solution
      });
    }

    // Verify workspace isolation
    if (architecture.workspaceId !== req.params.id) {
      return res.status(403).json({ error: 'Workspace isolation violation' });
    }

    // Check for Stale Architecture
    const context = await getWorkspaceContext(req.params.id, req.user);
    const currentHash = computeArchitectureContextHash(context);
    const currentOption = context.solution?.selectedOption || '';

    let isStale = false;
    let staleReason = null;

    if (architecture.sourceSolutionOptionId && currentOption && architecture.sourceSolutionOptionId !== currentOption) {
      isStale = true;
      staleReason = `Architecture was generated with Stage 3 option (${architecture.sourceSolutionOptionId}), but the active option is now (${currentOption}).`;
    } else if (architecture.sourceContextHash && architecture.sourceContextHash !== currentHash) {
      isStale = true;
      staleReason = 'Architecture is based on an older Solution Builder version or modified requirements.';
    }

    const isStage3Approved = context.solution?.status === 'APPROVED' || !!context.solution?.selectedOption;

    res.json({
      architecture,
      isStale,
      staleReason,
      isStage3Approved,
      hasStage3Solution: !!context.solution
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve architecture.');
  }
});

// Shared handler for generating or regenerating architecture
const generateArchitectureHandler = async (req, res) => {
  const workspaceId = req.params.id;
  try {
    await assertWorkspaceWriteAccess(workspaceId, req.user);

    console.log(`[ARCHITECTURE_GENERATION_STARTED] workspaceId=${workspaceId}`);

    const context = await getWorkspaceContext(workspaceId, req.user);
    const workspace = context.workspace;

    // Strict workspace isolation check
    if (!workspace || workspace.id !== workspaceId) {
      return res.status(404).json({ error: 'Workspace not found or unauthorized' });
    }

    // Check upstream Stage 3 solution presence & isolation
    if (!context.solution || context.solution.workspaceId !== workspaceId) {
      return res.status(400).json({
        error: 'Architecture is unavailable until a Solution Builder strategy has been selected for this workspace.'
      });
    }

    const generatedRaw = await aiService.generateArchitecture(context, context.solution);
    console.log(`[ARCHITECTURE_AI_RESPONSE_RECEIVED] workspaceId=${workspaceId}`);

    const normalized = normalizeArchitectureData(generatedRaw, context);
    console.log(`[ARCHITECTURE_NORMALIZED] workspaceId=${workspaceId}`);

    // Validate topology integrity (zero dangling edges, valid tiers, DAG consistency)
    const topologyValidation = validateArchitectureTopology(normalized);
    if (!topologyValidation.valid) {
      console.error(`[ARCHITECTURE_VALIDATED] Failed topology validation for workspace ${workspaceId}:`, topologyValidation.errors);
      return res.status(422).json({
        error: 'Generated architecture topology failed validation',
        validationErrors: topologyValidation.errors,
        warnings: topologyValidation.warnings
      });
    }
    console.log(`[ARCHITECTURE_VALIDATED] workspaceId=${workspaceId} valid=true`);

    // Fetch existing architecture to get next version and preserve USER_ADDED nodes
    const existing = await prisma.architecture.findFirst({
      where: { workspaceId },
      orderBy: { version: 'desc' },
      include: { nodes: true, edges: true }
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    // Preserve any manual user-added nodes from the previous architecture
    const manualNodes = (existing?.nodes || []).filter(
      n => n.classification === 'USER_ADDED' || n.source === 'USER_PROVIDED'
    );
    const manualNodeIds = new Set(manualNodes.map(n => n.id));
    const manualEdges = (existing?.edges || []).filter(
      e => manualNodeIds.has(e.sourceId) || manualNodeIds.has(e.targetId)
    );

    const nodeIdMap = {};
    const prefix = `node_${Date.now()}_`;
    normalized.nodes.forEach((n, i) => {
      nodeIdMap[n.id] = `${prefix}${i + 1}`;
    });

    const contextHash = computeArchitectureContextHash(context);
    const currentOption = context.solution?.selectedOption || 'OPTION_B';

    // Build Prisma-compatible architecture payload (strictly scalar fields)
    const architectureData = mapArchitectureToPrisma(
      normalized,
      workspace.id,
      context.solution?.id || null,
      currentOption,
      contextHash,
      nextVersion
    );

    // Build Prisma-compatible nodes and edges payloads
    const mappedNodes = mapNodesToPrisma(normalized.nodes, null, nodeIdMap);
    const validNodeIds = new Set([...mappedNodes.map(n => n.id), ...manualNodes.map(n => n.id)]);
    const mappedEdges = mapEdgesToPrisma(normalized.edges, null, nodeIdMap, validNodeIds);

    // Run persistence-level validation
    const persistenceValidation = validateArchitectureForPersistence({
      workspaceId,
      architectureData,
      nodesData: [...mappedNodes, ...manualNodes],
      edgesData: [...mappedEdges, ...manualEdges],
      sourceSolutionId: context.solution?.id,
      sourceSolutionOptionId: currentOption
    });

    if (!persistenceValidation.valid) {
      console.error(`[ARCHITECTURE_PERSISTENCE_FAILED] Validation failed:`, persistenceValidation.errors);
      return res.status(422).json({
        error: 'Architecture validation failed before persistence.',
        details: persistenceValidation.errors
      });
    }

    console.log(`[ARCHITECTURE_PERSISTENCE_STARTED] workspaceId=${workspaceId}`);

    let architecture;
    try {
      architecture = await persistArchitectureAtomic(prisma, {
        architectureData,
        nodesData: mappedNodes,
        edgesData: mappedEdges,
        manualNodes,
        manualEdges
      });
      console.log(`[ARCHITECTURE_PERSISTENCE_SUCCESS] workspaceId=${workspaceId} archId=${architecture.id}`);
    } catch (persistErr) {
      console.error(`[ARCHITECTURE_PERSISTENCE_FAILED]`, {
        workspaceId,
        fieldName: persistErr.meta?.target || persistErr.meta?.field_name || 'unknown',
        expectedType: 'Prisma Schema Type',
        receivedType: typeof persistErr,
        prismaCode: persistErr.code || 'UNKNOWN',
        message: persistErr.message
      });
      return res.status(500).json({
        error: 'Architecture generation could not be saved.',
        details: 'Generated architecture passed validation but could not be persisted.'
      });
    }

    const updateData = { status: 'ARCHITECTURE' };
    if (normalized._meta?.tokensUsed && normalized._meta.tokensUsed > 0) {
      updateData.aiTokensUsed = { increment: normalized._meta.tokensUsed };
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: updateData
    });

    const promptVer = normalized._meta?.promptVersion ? ` (prompt: ${normalized._meta.promptVersion})` : '';

    await prisma.artifactVersion.create({
      data: {
        workspaceId: workspace.id,
        artifactType: 'ARCHITECTURE',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(architecture),
        notes: `Generated Architecture Topology v${nextVersion}${promptVer}`,
        createdById: req.user.id
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'GENERATED',
        details: `Generated Architecture Canvas v${nextVersion}${promptVer}`
      }
    });

    res.status(201).json({
      architecture,
      isStale: false,
      validationWarnings: topologyValidation.warnings,
      _meta: normalized._meta
    });
  } catch (error) {
    console.error(`[ARCHITECTURE_PERSISTENCE_FAILED] unexpected error:`, error.message);
    handleRouteError(res, error, 'Failed to generate architecture.');
  }
};

// Generate architecture endpoints (canonical + aliases)
router.post('/:id/architecture', authenticate, generateArchitectureHandler);
router.post('/:id/architecture/generate', authenticate, generateArchitectureHandler);
router.post('/:id/architecture/regenerate', authenticate, generateArchitectureHandler);

// Get architecture status and staleness
router.get('/:id/architecture/status', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);
    const context = await getWorkspaceContext(req.params.id, req.user);
    const architecture = await prisma.architecture.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' }
    });

    const isStage3Approved = context.solution?.status === 'APPROVED' || !!context.solution?.selectedOption;
    const hasStage3Solution = !!context.solution;

    if (!architecture) {
      return res.json({
        exists: false,
        isStale: false,
        isStage3Approved,
        hasStage3Solution,
        version: 0
      });
    }

    const currentHash = computeArchitectureContextHash(context);
    const currentOption = context.solution?.selectedOption || '';
    const isStale = (architecture.sourceSolutionOptionId && currentOption && architecture.sourceSolutionOptionId !== currentOption) ||
                    (architecture.sourceContextHash && architecture.sourceContextHash !== currentHash);

    res.json({
      exists: true,
      id: architecture.id,
      version: architecture.version,
      status: architecture.status,
      isStale,
      isStage3Approved,
      hasStage3Solution
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve architecture status.');
  }
});

// Get architecture version history
router.get('/:id/architecture/versions', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);
    const versions = await prisma.artifactVersion.findMany({
      where: { workspaceId: req.params.id, artifactType: 'ARCHITECTURE' },
      orderBy: { versionNumber: 'desc' }
    });
    res.json({ versions });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve architecture versions.');
  }
});

// Save architecture version snapshot (tenant-scoped + write permission)
router.post('/:id/architecture/version', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { notes } = req.body;
    const current = await prisma.architecture.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { nodes: true, edges: true }
    });

    if (!current) return res.status(404).json({ error: 'Architecture not found.' });

    const nextVersion = current.version + 1;
    const updated = await prisma.architecture.update({
      where: { id: current.id },
      data: { version: nextVersion },
      include: { nodes: true, edges: true }
    });

    await prisma.artifactVersion.create({
      data: {
        workspaceId: req.params.id,
        artifactType: 'ARCHITECTURE',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(updated),
        notes: notes || `Target Architecture v${nextVersion}`,
        createdById: req.user.id
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'VERSIONED',
        details: `Saved Architecture Topology v${nextVersion}`
      }
    });

    res.json({ architecture: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to save architecture version.');
  }
});

// Update architecture specifications (tenant-scoped + write permission)
router.patch('/:id/architecture', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { highLevelDesign, lowLevelDesign, integrationArch, infrastructureArch, securityArch, deploymentArch } = req.body;
    const current = await prisma.architecture.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) return res.status(404).json({ error: 'Architecture not found.' });

    const updated = await prisma.architecture.update({
      where: { id: current.id },
      data: {
        ...(highLevelDesign && { highLevelDesign }),
        ...(lowLevelDesign && { lowLevelDesign }),
        ...(integrationArch && { integrationArch }),
        ...(infrastructureArch && { infrastructureArch }),
        ...(securityArch && { securityArch }),
        ...(deploymentArch && { deploymentArch })
      },
      include: { nodes: true, edges: true }
    });

    res.json({ architecture: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update architecture.');
  }
});

// Add architecture node (tenant-scoped + write permission)
router.post('/:id/architecture/nodes', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const {
      label,
      type,
      tier,
      description,
      posX,
      posY,
      tech,
      purpose,
      source,
      confidence,
      requirementIds,
      capabilityIds,
      dependencies,
      validationStatus
    } = req.body;

    const current = await prisma.architecture.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) return res.status(404).json({ error: 'Architecture not found.' });

    const node = await prisma.architectureNode.create({
      data: {
        architectureId: current.id,
        label: ensureString(label, 'New Service Node'),
        type: sanitizeNodeType(type),
        tier: sanitizeTier(tier),
        description: ensureString(description, 'Custom enterprise service component'),
        posX: typeof posX === 'number' && !isNaN(posX) ? posX : 400,
        posY: typeof posY === 'number' && !isNaN(posY) ? posY : 200,
        tech: ensureString(tech, 'Microservice'),
        purpose: ensureString(purpose, 'Handles dedicated business capabilities.'),
        source: sanitizeSource(source || 'USER_PROVIDED'),
        confidence: typeof confidence === 'number' && !isNaN(confidence) ? confidence : 1.0,
        requirementIds: formatIdList(requirementIds),
        capabilityIds: formatIdList(capabilityIds),
        dependencies: formatIdList(dependencies),
        validationStatus: sanitizeValidationStatus(validationStatus || 'PROPOSED'),
        classification: 'USER_ADDED'
      }
    });

    res.status(201).json({ node });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create architecture node.');
  }
});

// Move or edit node (tenant-scoped + subresource check)
router.patch('/:id/architecture/nodes/:nodeId', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const existingNode = await prisma.architectureNode.findUnique({
      where: { id: req.params.nodeId },
      include: { architecture: true }
    });
    if (!existingNode || existingNode.architecture.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Architecture node not found.' });
    }

    const {
      posX,
      posY,
      label,
      description,
      tech,
      tier,
      purpose,
      source,
      validationStatus,
      requirementIds,
      capabilityIds,
      dependencies
    } = req.body;

    const node = await prisma.architectureNode.update({
      where: { id: req.params.nodeId },
      data: {
        ...(posX !== undefined && { posX: Number(posX) }),
        ...(posY !== undefined && { posY: Number(posY) }),
        ...(label !== undefined && { label: ensureString(label) }),
        ...(description !== undefined && { description: ensureString(description) }),
        ...(tech !== undefined && { tech: ensureString(tech) }),
        ...(tier !== undefined && { tier: sanitizeTier(tier) }),
        ...(purpose !== undefined && { purpose: ensureString(purpose) }),
        ...(source !== undefined && { source: sanitizeSource(source) }),
        ...(validationStatus !== undefined && { validationStatus: sanitizeValidationStatus(validationStatus) }),
        ...(requirementIds !== undefined && { requirementIds: formatIdList(requirementIds) }),
        ...(capabilityIds !== undefined && { capabilityIds: formatIdList(capabilityIds) }),
        ...(dependencies !== undefined && { dependencies: formatIdList(dependencies) })
      }
    });

    res.json({ node });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update node.');
  }
});

// Delete node (tenant-scoped + subresource check)
router.delete('/:id/architecture/nodes/:nodeId', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const existingNode = await prisma.architectureNode.findUnique({
      where: { id: req.params.nodeId },
      include: { architecture: true }
    });
    if (!existingNode || existingNode.architecture.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Architecture node not found.' });
    }

    await prisma.architectureNode.delete({ where: { id: req.params.nodeId } });
    res.json({ success: true, message: 'Node deleted.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete node.');
  }
});

export default router;

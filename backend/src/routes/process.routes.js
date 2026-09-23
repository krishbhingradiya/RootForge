import { Router } from 'express';
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
  computeProcessContextHash,
  persistProcessAtomic,
  ensureDecisionGateTransitions
} from '../services/processPersistence.service.js';
import { validateProcessWorkflow } from '../services/processValidation.service.js';

const router = Router();

// Helper to check for stale process against upstream context
function evaluateProcessStaleState(processModel, context) {
  if (!processModel) return { isStale: false, staleReason: null };

  const currentOption = context?.solution?.selectedOption || '';
  const currentArch = context?.architecture || null;
  const currentHash = computeProcessContextHash(context);

  if (processModel.sourceSolutionOptionId && currentOption && processModel.sourceSolutionOptionId !== currentOption) {
    return {
      isStale: true,
      staleReason: `Process was generated with Stage 3 option (${processModel.sourceSolutionOptionId}), but the active option is now (${currentOption}).`
    };
  }

  if (processModel.sourceArchitectureId && currentArch?.id && processModel.sourceArchitectureId !== currentArch.id) {
    return {
      isStale: true,
      staleReason: 'Target Architecture was replaced with a new architecture model.'
    };
  }

  if (processModel.sourceArchitectureVersion && currentArch?.version && processModel.sourceArchitectureVersion !== currentArch.version) {
    return {
      isStale: true,
      staleReason: `Target Architecture was updated to v${currentArch.version}.`
    };
  }

  if (processModel.sourceContextHash && processModel.sourceContextHash !== currentHash) {
    return {
      isStale: true,
      staleReason: 'Upstream requirements or solution specifications have been modified.'
    };
  }

  return { isStale: false, staleReason: null };
}

// Get process model (tenant-scoped)
router.get('/:id/process', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const processModel = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        nodes: { orderBy: { stepOrder: 'asc' } }
      }
    });

    const context = await getWorkspaceContext(req.params.id, req.user);
    const hasArchitecture = Boolean(context.architecture);
    const hasSolution = Boolean(context.solution);

    if (!processModel) {
      return res.json({
        processModel: null,
        isStale: false,
        staleReason: null,
        hasArchitecture,
        hasSolution
      });
    }

    // Verify workspace isolation
    if (processModel.workspaceId !== req.params.id) {
      return res.status(403).json({ error: 'Workspace isolation violation' });
    }

    // Auto-heal missing decision branches if any exist
    let transitions = [];
    try {
      transitions = processModel.transitionsJson ? JSON.parse(processModel.transitionsJson) : [];
    } catch (e) {
      transitions = [];
    }

    const hasIncompleteDecisionGate = processModel.nodes.some(n => {
      const normType = (n.type || '').toUpperCase();
      if (normType !== 'DECISION_GATE' && normType !== 'DECISION') return false;
      const outgoing = transitions.filter(t => t.fromStepOrder === n.stepOrder);
      const hasFalse = outgoing.some(t =>
        t.isFalsePath ||
        t.isRejection ||
        (t.condition && /false|fail|reject|escalat|invalid|else/i.test(t.condition))
      );
      return !hasFalse;
    });

    let effectiveModel = processModel;
    if (hasIncompleteDecisionGate) {
      const healedTransitions = ensureDecisionGateTransitions(processModel.nodes, transitions);
      let decisionRules = [];
      try {
        decisionRules = processModel.decisionRulesJson ? JSON.parse(processModel.decisionRulesJson) : [];
      } catch (e) {
        decisionRules = [];
      }

      const healedReport = validateProcessWorkflow({
        title: processModel.title,
        description: processModel.description,
        nodes: processModel.nodes,
        transitions: healedTransitions,
        decisionRules
      }, context);

      effectiveModel = await prisma.processModel.update({
        where: { id: processModel.id },
        data: {
          transitionsJson: JSON.stringify(healedTransitions),
          validationStateJson: JSON.stringify(healedReport),
          status: healedReport.isValid ? 'VALIDATED' : processModel.status
        },
        include: { nodes: { orderBy: { stepOrder: 'asc' } } }
      });
    }

    const { isStale, staleReason } = evaluateProcessStaleState(effectiveModel, context);

    res.json({
      processModel: effectiveModel,
      isStale,
      staleReason,
      hasArchitecture,
      hasSolution
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve process model.');
  }
});

// Shared handler for generating or regenerating process workflow
const generateProcessHandler = async (req, res) => {
  const workspaceId = req.params.id;
  try {
    await assertWorkspaceWriteAccess(workspaceId, req.user);

    console.log(`[PROCESS_GENERATION_STARTED] workspaceId=${workspaceId}`);

    const context = await getWorkspaceContext(workspaceId, req.user);
    
    // Strict workspace isolation check
    if (context.workspace.id !== workspaceId) {
      return res.status(403).json({ error: 'Workspace isolation violation' });
    }

    // Generate process using AI service (consumes context, solution, and architecture)
    const generated = await aiService.generateProcess(context, context.solution);

    // Atomically persist generated workflow, preserving any manual USER_ADDED steps
    const processModel = await persistProcessAtomic(
      workspaceId,
      generated,
      context,
      req.user
    );

    // Track AI token usage if available
    if (generated._meta?.tokensUsed && generated._meta.tokensUsed > 0) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { aiTokensUsed: { increment: generated._meta.tokensUsed } }
      });
    }

    console.log(`[PROCESS_GENERATION_COMPLETED] workspaceId=${workspaceId} nodes=${processModel.nodes?.length}`);

    res.status(201).json({
      processModel,
      isStale: false,
      staleReason: null,
      _meta: generated._meta
    });
  } catch (error) {
    console.error(`[PROCESS_GENERATION_FAILED] workspaceId=${workspaceId}:`, error);
    handleRouteError(res, error, 'Failed to generate process model.');
  }
};

// Generate or regenerate endpoints
router.post('/:id/process', authenticate, generateProcessHandler);
router.post('/:id/process/generate', authenticate, generateProcessHandler);
router.post('/:id/process/regenerate', authenticate, generateProcessHandler);

// Check process staleness & upstream readiness status
router.get('/:id/process/status', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const context = await getWorkspaceContext(req.params.id, req.user);
    const processModel = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    const { isStale, staleReason } = evaluateProcessStaleState(processModel, context);

    res.json({
      hasProcess: !!processModel,
      isStale,
      staleReason,
      version: processModel?.version || null,
      status: processModel?.status || 'NOT_STARTED',
      hasArchitecture: !!context.architecture,
      hasSolution: !!context.solution
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to check process status.');
  }
});

// Run process validation engine on demand
router.post('/:id/process/validate', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const context = await getWorkspaceContext(req.params.id, req.user);
    const current = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    if (!current) return res.status(404).json({ error: 'Process model not found.' });

    let transitions = [];
    try {
      transitions = current.transitionsJson ? JSON.parse(current.transitionsJson) : [];
    } catch (e) {
      transitions = [];
    }

    let decisionRules = [];
    try {
      decisionRules = current.decisionRulesJson ? JSON.parse(current.decisionRulesJson) : [];
    } catch (e) {
      decisionRules = [];
    }

    // Auto-heal missing decision branches so that legitimate models are not blocked
    transitions = ensureDecisionGateTransitions(current.nodes, transitions);

    const validationReport = validateProcessWorkflow({
      title: current.title,
      description: current.description,
      nodes: current.nodes,
      transitions,
      decisionRules
    }, context);

    const updated = await prisma.processModel.update({
      where: { id: current.id },
      data: {
        transitionsJson: JSON.stringify(transitions),
        validationStateJson: JSON.stringify(validationReport),
        status: validationReport.isValid ? 'VALIDATED' : 'NEEDS_REVIEW'
      },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    res.json({
      processModel: updated,
      validationReport
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to validate process model.');
  }
});

// Get historical version snapshots
router.get('/:id/process/versions', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const versions = await prisma.artifactVersion.findMany({
      where: {
        workspaceId: req.params.id,
        artifactType: 'PROCESS'
      },
      orderBy: { versionNumber: 'desc' }
    });

    res.json({ versions });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve process versions.');
  }
});

// Save process version snapshot (tenant-scoped + write permission)
router.post('/:id/process/version', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { notes } = req.body;
    const current = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    if (!current) return res.status(404).json({ error: 'Process model not found.' });

    const nextVersion = current.version + 1;
    const updated = await prisma.processModel.update({
      where: { id: current.id },
      data: { version: nextVersion },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    await prisma.artifactVersion.create({
      data: {
        workspaceId: req.params.id,
        artifactType: 'PROCESS',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(updated),
        notes: notes || `Target Process Model v${nextVersion}`,
        createdById: req.user.id
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'VERSIONED',
        details: `Saved Process Workflow v${nextVersion}`
      }
    });

    res.json({ processModel: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to save process version.');
  }
});

// Restore historical process version snapshot (tenant-scoped + write permission)
router.post('/:id/process/versions/:versionNumber/restore', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const versionNum = parseInt(req.params.versionNumber, 10);
    if (isNaN(versionNum)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    const snapshot = await prisma.artifactVersion.findFirst({
      where: {
        workspaceId: req.params.id,
        artifactType: 'PROCESS',
        versionNumber: versionNum
      }
    });

    if (!snapshot || !snapshot.snapshotData) {
      return res.status(404).json({ error: `Version snapshot v${versionNum} not found.` });
    }

    let parsedData = null;
    try {
      parsedData = JSON.parse(snapshot.snapshotData);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to deserialize snapshot data.' });
    }

    const current = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    const nextVersion = current ? current.version + 1 : versionNum + 1;

    // Restore inside transaction
    const restored = await prisma.$transaction(async (tx) => {
      // Create new process model representing restored snapshot at nextVersion
      const newModel = await tx.processModel.create({
        data: {
          workspaceId: req.params.id,
          title: parsedData.title || 'Restored Process Workflow',
          description: parsedData.description || '',
          type: parsedData.type || 'WORKFLOW',
          status: parsedData.status || 'VALIDATED',
          version: nextVersion,
          sourceArchitectureId: parsedData.sourceArchitectureId || null,
          sourceArchitectureVersion: parsedData.sourceArchitectureVersion || null,
          sourceSolutionOptionId: parsedData.sourceSolutionOptionId || null,
          sourceContextHash: parsedData.sourceContextHash || null,
          transitionsJson: parsedData.transitionsJson || null,
          decisionRulesJson: parsedData.decisionRulesJson || null,
          validationStateJson: parsedData.validationStateJson || null,
          metadataJson: parsedData.metadataJson || null,
          nodes: {
            create: (parsedData.nodes || []).map(n => ({
              stepOrder: n.stepOrder,
              label: n.label,
              type: n.type,
              actor: n.actor,
              description: n.description || '',
              condition: n.condition || null,
              nextStepId: n.nextStepId || null,
              system: n.system || null,
              input: n.input || null,
              action: n.action || null,
              output: n.output || null,
              aiCapability: n.aiCapability || null,
              confidence: n.confidence || null,
              sla: n.sla || null,
              retryPolicy: n.retryPolicy || null,
              failureHandling: n.failureHandling || null,
              timeoutPolicy: n.timeoutPolicy || null,
              escalationPolicy: n.escalationPolicy || null,
              preconditions: n.preconditions || null,
              postconditions: n.postconditions || null,
              requirementIds: n.requirementIds || null,
              architectureNodeId: n.architectureNodeId || null,
              classification: n.classification || 'AI_PROPOSED',
              validationStatus: n.validationStatus || 'PROPOSED',
              sourceContext: 'RESTORED'
            }))
          }
        },
        include: {
          nodes: { orderBy: { stepOrder: 'asc' } }
        }
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          workspaceId: req.params.id,
          userId: req.user.id,
          userName: req.user.name,
          action: 'RESTORED',
          details: `Restored Process Workflow from v${versionNum} to v${nextVersion}`
        }
      });

      return newModel;
    });

    res.json({
      success: true,
      message: `Restored process model snapshot v${versionNum}`,
      processModel: restored
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to restore process version.');
  }
});

// Update process model metadata (tenant-scoped + write permission)
router.patch('/:id/process', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { title, description, type, status } = req.body;
    const current = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) return res.status(404).json({ error: 'Process model not found.' });

    const updated = await prisma.processModel.update({
      where: { id: current.id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(type && { type }),
        ...(status && { status })
      },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    res.json({ processModel: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update process model.');
  }
});

// Shared step create handler
const addStepHandler = async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const {
      label,
      type,
      actor,
      description,
      condition,
      stepOrder,
      system,
      input,
      action,
      output,
      aiCapability,
      confidence,
      sla,
      retryPolicy,
      failureHandling,
      timeoutPolicy,
      escalationPolicy,
      preconditions,
      postconditions,
      requirementIds,
      architectureNodeId,
      validationStatus
    } = req.body;

    const current = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) return res.status(404).json({ error: 'Process model not found.' });

    const maxNode = await prisma.processNode.findFirst({
      where: { processModelId: current.id },
      orderBy: { stepOrder: 'desc' }
    });

    const node = await prisma.processNode.create({
      data: {
        processModelId: current.id,
        stepOrder: stepOrder || (maxNode ? maxNode.stepOrder + 1 : 1),
        label: label || 'New Process Step',
        type: type || 'ACTION',
        actor: actor || 'Operator',
        description: description || 'Process step description',
        condition: condition || null,
        system: system || null,
        input: input || null,
        action: action || null,
        output: output || null,
        aiCapability: aiCapability || null,
        confidence: typeof confidence === 'number' ? confidence : null,
        sla: sla || null,
        retryPolicy: retryPolicy || null,
        failureHandling: failureHandling || null,
        timeoutPolicy: timeoutPolicy || null,
        escalationPolicy: escalationPolicy || null,
        preconditions: Array.isArray(preconditions) ? preconditions.join(', ') : (preconditions || null),
        postconditions: Array.isArray(postconditions) ? postconditions.join(', ') : (postconditions || null),
        requirementIds: Array.isArray(requirementIds) ? requirementIds.join(', ') : (requirementIds || null),
        architectureNodeId: architectureNodeId || null,
        classification: 'USER_ADDED',
        validationStatus: validationStatus || 'PROPOSED',
        sourceContext: 'USER_ADDED'
      }
    });

    res.status(201).json({ node });
  } catch (error) {
    handleRouteError(res, error, 'Failed to add process node.');
  }
};

router.post('/:id/process/nodes', authenticate, addStepHandler);
router.post('/:id/process/steps', authenticate, addStepHandler);

// Shared step update handler
const updateStepHandler = async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const stepId = req.params.stepId || req.params.nodeId;
    const existingNode = await prisma.processNode.findUnique({
      where: { id: stepId },
      include: { processModel: true }
    });
    if (!existingNode || existingNode.processModel.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Process node not found.' });
    }

    const {
      label,
      type,
      actor,
      description,
      condition,
      stepOrder,
      system,
      input,
      action,
      output,
      aiCapability,
      confidence,
      sla,
      retryPolicy,
      failureHandling,
      timeoutPolicy,
      escalationPolicy,
      preconditions,
      postconditions,
      requirementIds,
      architectureNodeId,
      validationStatus
    } = req.body;

    const classification = existingNode.classification === 'USER_ADDED' ? 'USER_ADDED' : 'USER_MODIFIED';

    const node = await prisma.processNode.update({
      where: { id: stepId },
      data: {
        ...(label && { label }),
        ...(type && { type }),
        ...(actor && { actor }),
        ...(description && { description }),
        ...(condition !== undefined && { condition }),
        ...(stepOrder !== undefined && { stepOrder: Number(stepOrder) }),
        ...(system !== undefined && { system }),
        ...(input !== undefined && { input }),
        ...(action !== undefined && { action }),
        ...(output !== undefined && { output }),
        ...(aiCapability !== undefined && { aiCapability }),
        ...(confidence !== undefined && { confidence: typeof confidence === 'number' ? confidence : null }),
        ...(sla !== undefined && { sla }),
        ...(retryPolicy !== undefined && { retryPolicy }),
        ...(failureHandling !== undefined && { failureHandling }),
        ...(timeoutPolicy !== undefined && { timeoutPolicy }),
        ...(escalationPolicy !== undefined && { escalationPolicy }),
        ...(preconditions !== undefined && { preconditions: Array.isArray(preconditions) ? preconditions.join(', ') : preconditions }),
        ...(postconditions !== undefined && { postconditions: Array.isArray(postconditions) ? postconditions.join(', ') : postconditions }),
        ...(requirementIds !== undefined && { requirementIds: Array.isArray(requirementIds) ? requirementIds.join(', ') : requirementIds }),
        ...(architectureNodeId !== undefined && { architectureNodeId }),
        ...(validationStatus !== undefined && { validationStatus }),
        classification
      }
    });

    res.json({ node });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update process node.');
  }
};

router.patch('/:id/process/nodes/:nodeId', authenticate, updateStepHandler);
router.patch('/:id/process/steps/:stepId', authenticate, updateStepHandler);

// Shared step delete handler
const deleteStepHandler = async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const stepId = req.params.stepId || req.params.nodeId;
    const existingNode = await prisma.processNode.findUnique({
      where: { id: stepId },
      include: { processModel: true }
    });
    if (!existingNode || existingNode.processModel.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Process node not found.' });
    }

    await prisma.processNode.delete({ where: { id: stepId } });
    res.json({ success: true, message: 'Process node deleted.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete process node.');
  }
};

router.delete('/:id/process/nodes/:nodeId', authenticate, deleteStepHandler);
router.delete('/:id/process/steps/:stepId', authenticate, deleteStepHandler);

// Process Approval Endpoint (Guards UX transition with validation check)
router.post('/:id/process/approve', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const current = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    if (!current) {
      return res.status(404).json({ error: 'No process model found to approve.' });
    }

    let transitions = [];
    try {
      transitions = current.transitionsJson ? JSON.parse(current.transitionsJson) : [];
    } catch (e) {
      transitions = [];
    }
    transitions = ensureDecisionGateTransitions(current.nodes, transitions);

    let decisionRules = [];
    try {
      decisionRules = current.decisionRulesJson ? JSON.parse(current.decisionRulesJson) : [];
    } catch (e) {
      decisionRules = [];
    }

    const context = await getWorkspaceContext(req.params.id, req.user);
    const report = validateProcessWorkflow({
      title: current.title,
      description: current.description,
      nodes: current.nodes,
      transitions,
      decisionRules
    }, context);

    if (!report.isValid) {
      return res.status(400).json({
        error: `Process approval blocked: ${report.errors.length} blocking error(s) must be resolved first.`,
        validationErrors: report.errors,
        report
      });
    }

    const updated = await prisma.processModel.update({
      where: { id: current.id },
      data: { status: 'APPROVED' },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'APPROVED',
        details: `Approved Process Workflow v${current.version}`
      }
    });

    res.json({
      success: true,
      message: 'Process model approved.',
      processModel: updated,
      report
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to approve process model.');
  }
});

// Process Optimization Analysis Endpoint
router.post('/:id/process/optimize', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const current = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    if (!current) {
      return res.status(404).json({ error: 'No process model found to optimize.' });
    }

    const context = await getWorkspaceContext(req.params.id, req.user);

    // Compute optimizations
    const nodes = current.nodes || [];
    let transitions = [];
    try {
      transitions = current.transitionsJson ? JSON.parse(current.transitionsJson) : [];
    } catch (e) {
      transitions = [];
    }

    const recommendations = [];
    let handoffCount = 0;
    let bottleneckCount = 0;
    let automationCandidateCount = 0;

    const stepMap = new Map();
    nodes.forEach(n => stepMap.set(n.stepOrder, n));

    // 1. Bottlenecks
    nodes.forEach(n => {
      const type = (n.type || '').toUpperCase();
      const hasLongSla = n.sla && (n.sla.toLowerCase().includes('hour') || n.sla.toLowerCase().includes('day') || parseInt(n.sla, 10) > 30);
      const isManual = type === 'HUMAN_APPROVAL' || type === 'APPROVAL';
      if (hasLongSla || isManual) {
        bottleneckCount++;
        recommendations.push({
          id: `opt_bottleneck_${n.stepOrder}`,
          category: 'BOTTLENECK',
          title: `Latency Gate in Step #${n.stepOrder}: ${n.label}`,
          impact: 'HIGH',
          effort: 'MEDIUM',
          affectedStepOrders: [n.stepOrder],
          problem: `Step #${n.stepOrder} requires manual intervention with SLA '${n.sla || 'undefined'}', creating an operational queuing choke-point.`,
          recommendation: isManual
            ? 'Introduce automated straight-through processing (STP) thresholds for low-risk transactions to bypass manual sign-off.'
            : 'Introduce asynchronous queue worker processing and tighter webhook timeouts to shrink queue dwell time.',
          action: isManual ? 'Enable Conditional STP Auto-Approval' : 'Configure Async Queue Processing'
        });
      }
    });

    // 2. Cross-Lane Handoffs
    transitions.forEach(edge => {
      const src = stepMap.get(edge.fromStepOrder);
      const tgt = stepMap.get(edge.toStepOrder);
      if (src && tgt && src.actor && tgt.actor && src.actor !== tgt.actor) {
        handoffCount++;
        if (
          !src.actor.toLowerCase().includes('system') &&
          !src.actor.toLowerCase().includes('ai') &&
          !tgt.actor.toLowerCase().includes('system') &&
          !tgt.actor.toLowerCase().includes('ai')
        ) {
          recommendations.push({
            id: `opt_handoff_${src.stepOrder}_${tgt.stepOrder}`,
            category: 'HANDOFF',
            title: `Inter-Departmental Handoff (${src.actor} → ${tgt.actor})`,
            impact: 'MEDIUM',
            effort: 'LOW',
            affectedStepOrders: [src.stepOrder, tgt.stepOrder],
            problem: `Sequential handoff from '${src.actor}' (Step #${src.stepOrder}) to '${tgt.actor}' (Step #${tgt.stepOrder}) creates organizational friction and context-switching overhead.`,
            recommendation: 'Implement shared collaborative workspace context and automated state notifications to eliminate manual dispatch delay.',
            action: 'Establish Automated Event Dispatch Bridge'
          });
        }
      }
    });

    // 3. Automation Opportunities
    nodes.forEach(n => {
      const type = (n.type || '').toUpperCase();
      if ((type === 'ACTION' || type === 'STEP') && n.system) {
        automationCandidateCount++;
        recommendations.push({
          id: `opt_auto_${n.stepOrder}`,
          category: 'AUTOMATION',
          title: `Automation Candidate: Step #${n.stepOrder} (${n.label})`,
          impact: 'HIGH',
          effort: 'LOW',
          affectedStepOrders: [n.stepOrder],
          problem: `Step #${n.stepOrder} is performed as a standard ACTION against system '${n.system}', which can be upgraded to headless AUTOMATION.`,
          recommendation: `Convert Step #${n.stepOrder} to an AUTOMATION or INTEGRATION node leveraging API direct connector to remove manual keying.`,
          action: 'Upgrade Step to Headless AUTOMATION'
        });
      }
    });

    // 4. Resilience
    nodes.forEach(n => {
      const type = (n.type || '').toUpperCase();
      const isExternal = ['INTEGRATION', 'AUTOMATION', 'NOTIFICATION'].includes(type);
      if (isExternal && !n.retryPolicy) {
        recommendations.push({
          id: `opt_resilience_${n.stepOrder}`,
          category: 'RESILIENCE',
          title: `Missing Fault Tolerance on Step #${n.stepOrder}`,
          impact: 'HIGH',
          effort: 'LOW',
          affectedStepOrders: [n.stepOrder],
          problem: `Step #${n.stepOrder} (${n.label}) interacts with external boundary '${n.system || 'Service'}' without an automated retry policy.`,
          recommendation: 'Configure exponential backoff retry (3 attempts, 2s base) with circuit breaker fallback to prevent workflow stalling.',
          action: 'Attach Exponential Retry & Circuit Breaker'
        });
      }
    });

    const cycleTimePotential = `${Math.min(65, 20 + bottleneckCount * 12 + automationCandidateCount * 8)}%`;
    const optimizations = {
      metrics: {
        cycleTimePotential,
        handoffCount,
        bottleneckCount,
        automationCandidateCount,
        totalRecommendations: recommendations.length
      },
      summary: `Identified ${recommendations.length} high-impact workflow optimizations across bottlenecks, cross-lane handoffs, and automation opportunities, offering an estimated ${cycleTimePotential} cycle time reduction.`,
      recommendations
    };

    res.json({
      success: true,
      optimizations
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to analyze process optimizations.');
  }
});

// Process Multi-Format Export Endpoint
router.get('/:id/process/export', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const format = (req.query.format || 'json').toLowerCase();
    const current = await prisma.processModel.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    if (!current) {
      return res.status(404).json({ error: 'No process model found to export.' });
    }

    const filename = `${current.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v${current.version}`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.send(JSON.stringify(current, null, 2));
    } else if (format === 'csv') {
      const headers = ['StepOrder', 'Label', 'Type', 'Actor', 'System', 'Description', 'Condition', 'SLA', 'RetryPolicy', 'FailureHandling'];
      const rows = current.nodes.map(n => [
        n.stepOrder,
        `"${(n.label || '').replace(/"/g, '""')}"`,
        n.type,
        `"${(n.actor || '').replace(/"/g, '""')}"`,
        `"${(n.system || '').replace(/"/g, '""')}"`,
        `"${(n.description || '').replace(/"/g, '""')}"`,
        `"${(n.condition || '').replace(/"/g, '""')}"`,
        `"${(n.sla || '').replace(/"/g, '""')}"`,
        `"${(n.retryPolicy || '').replace(/"/g, '""')}"`,
        `"${(n.failureHandling || '').replace(/"/g, '""')}"`
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\r\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    } else {
      // Default to JSON
      return res.json({ processModel: current });
    }
  } catch (error) {
    handleRouteError(res, error, 'Failed to export process model.');
  }
});

export default router;

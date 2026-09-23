import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { aiService } from '../ai/aiService.js';
import { getWorkspaceContext } from '../services/workspaceContext.service.js';
import { calculateStage2HandoffGate } from '../utils/handoffGate.js';
import { normalizeStage2Contract, computeStage2ContextHash } from '../utils/stage2Contract.js';
import {
  assertWorkspaceAccess,
  assertWorkspaceWriteAccess,
  handleRouteError
} from '../services/authorization.service.js';

const router = Router();

// Get solution for workspace (tenant-scoped)
router.get('/:id/solution', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const analysis = await prisma.businessAnalysis.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' }
    });
    const handoffGate = analysis ? calculateStage2HandoffGate(analysis) : null;

    const solution = await prisma.solution.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' }
    });

    const context = await getWorkspaceContext(req.params.id, req.user);
    const canonical = normalizeStage2Contract(context, analysis);
    const currentContextHash = computeStage2ContextHash(canonical);

    const isStale = Boolean(
      solution &&
      analysis &&
      (
        (solution.sourceContextHash && solution.sourceContextHash !== currentContextHash) ||
        new Date(analysis.updatedAt) > new Date(solution.createdAt)
      )
    );

    const reqCount = canonical.requirements.length;
    const waitingForAnalysis = !analysis || reqCount === 0;

    res.json({
      solution,
      handoffGate,
      isStale,
      waitingForAnalysis,
      analysisVersion: analysis?.version || null,
      sourceContextHash: solution?.sourceContextHash || null,
      currentContextHash
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve solution.');
  }
});

// Generate or Regenerate solution (tenant-scoped + write permission)
router.post('/:id/solution', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const analysis = await prisma.businessAnalysis.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' }
    });

    if (!analysis) {
      return res.status(400).json({
        error: 'Solution Builder is waiting for verified Business Analysis data. Please generate Stage 2 first.'
      });
    }

    const context = await getWorkspaceContext(req.params.id, req.user);
    const canonical = normalizeStage2Contract(context, analysis);

    if (!Array.isArray(canonical.requirements) || canonical.requirements.length === 0) {
      return res.status(400).json({
        error: 'Stage 2 contains zero requirements; cannot generate solution options without verified requirements.'
      });
    }

    const handoffGate = calculateStage2HandoffGate(analysis);
    const solutionStatus = !handoffGate.canProceed ? 'CANDIDATE_PENDING_VALIDATION' : 'DRAFT';

    const workspace = context.workspace;
    const contextHash = computeStage2ContextHash(canonical);
    const generated = await aiService.recommendSolutions(context, canonical);

    const existing = await prisma.solution.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' }
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    const solution = await prisma.solution.create({
      data: {
        workspaceId: workspace.id,
        name: generated.name,
        summary: generated.summary,
        businessValue: generated.businessValue,
        keyCapabilities: JSON.stringify(generated.keyCapabilities),
        automationOpps: JSON.stringify(generated.automationOpps),
        aiOpps: JSON.stringify(generated.aiOpps),
        techStack: JSON.stringify(generated.techStack),
        implementationApproach: generated.implementationApproach,
        risks: JSON.stringify(generated.risks),
        assumptions: JSON.stringify(generated.assumptions),
        dependencies: JSON.stringify(generated.dependencies),
        options: JSON.stringify(generated.options),
        selectedOption: generated.selectedOption || 'OPTION_B',
        version: nextVersion,
        status: solutionStatus,
        sourceAnalysisId: analysis.id,
        sourceAnalysisVersion: analysis.version,
        sourceContextHash: contextHash
      }
    });

    // Update workspace status to SOLUTION and increment token usage if applicable
    const updateData = { status: 'SOLUTION' };
    if (generated._meta?.tokensUsed && generated._meta.tokensUsed > 0) {
      updateData.aiTokensUsed = { increment: generated._meta.tokensUsed };
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: updateData
    });

    const promptVer = generated._meta?.promptVersion ? ` (prompt: ${generated._meta.promptVersion})` : '';

    // Version record
    await prisma.artifactVersion.create({
      data: {
        workspaceId: workspace.id,
        artifactType: 'SOLUTION',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(solution),
        notes: `Generated Solution Architecture Blueprint v${nextVersion}${promptVer}`,
        createdById: req.user.id
      }
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'GENERATED',
        details: `Generated Solution "${solution.name}" v${nextVersion}${promptVer}`
      }
    });

    res.status(201).json({ solution, _meta: generated._meta });
  } catch (error) {
    handleRouteError(res, error, 'Failed to generate solution.');
  }
});

// Update / Select Option / Edit Solution (tenant-scoped + write permission)
router.patch('/:id/solution', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const {
      name,
      summary,
      businessValue,
      keyCapabilities,
      automationOpps,
      aiOpps,
      techStack,
      implementationApproach,
      risks,
      assumptions,
      dependencies,
      selectedOption,
      status
    } = req.body;

    const current = await prisma.solution.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) {
      return res.status(404).json({ error: 'No solution found to update.' });
    }

    const updated = await prisma.solution.update({
      where: { id: current.id },
      data: {
        ...(name && { name }),
        ...(summary && { summary }),
        ...(businessValue && { businessValue }),
        ...(keyCapabilities && { keyCapabilities: typeof keyCapabilities === 'string' ? keyCapabilities : JSON.stringify(keyCapabilities) }),
        ...(automationOpps && { automationOpps: typeof automationOpps === 'string' ? automationOpps : JSON.stringify(automationOpps) }),
        ...(aiOpps && { aiOpps: typeof aiOpps === 'string' ? aiOpps : JSON.stringify(aiOpps) }),
        ...(techStack && { techStack: typeof techStack === 'string' ? techStack : JSON.stringify(techStack) }),
        ...(implementationApproach && { implementationApproach }),
        ...(risks && { risks: typeof risks === 'string' ? risks : JSON.stringify(risks) }),
        ...(assumptions && { assumptions: typeof assumptions === 'string' ? assumptions : JSON.stringify(assumptions) }),
        ...(dependencies && { dependencies: typeof dependencies === 'string' ? dependencies : JSON.stringify(dependencies) }),
        ...(selectedOption && { selectedOption }),
        ...(status && { status })
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'UPDATED',
        details: selectedOption ? `Switched primary solution to ${selectedOption}` : 'Updated solution details'
      }
    });

    res.json({ solution: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update solution.');
  }
});

// Approve solution (tenant-scoped + write permission)
router.post('/:id/solution/approve', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const current = await prisma.solution.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) return res.status(404).json({ error: 'No solution found to approve.' });

    // Validate Stage 2 gate prior to approving architecture
    const analysis = await prisma.businessAnalysis.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' }
    });
    if (analysis) {
      const handoffGate = calculateStage2HandoffGate(analysis);
      if (!handoffGate.canProceed) {
        return res.status(400).json({
          error: 'Architecture handoff blocked by unresolved validation blockers in Stage 2.',
          blockers: handoffGate.blockers
        });
      }
    }

    const approved = await prisma.solution.update({
      where: { id: current.id },
      data: { status: 'APPROVED' }
    });

    await prisma.approval.create({
      data: {
        workspaceId: req.params.id,
        artifactType: 'SOLUTION',
        artifactId: current.id,
        userId: req.user.id,
        status: 'APPROVED',
        comments: req.body.comments || 'Approved recommended solution architecture strategy.',
        approvedAt: new Date()
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'APPROVED',
        details: `${req.user.name} approved Solution Recommendation`
      }
    });

    res.json({ solution: approved, message: 'Solution approved successfully.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to approve solution.');
  }
});

export default router;

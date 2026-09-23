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
import { calculateStage2HandoffGate } from '../utils/handoffGate.js';

const router = Router();

// Get analysis for workspace (tenant-scoped)
router.get('/:id/analysis', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const analysis = await prisma.businessAnalysis.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    const handoffGate = analysis ? calculateStage2HandoffGate(analysis) : null;
    res.json({ analysis, handoffGate });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve business analysis.');
  }
});

// Generate or Regenerate analysis (tenant-scoped + write permission)
router.post('/:id/analysis', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const context = await getWorkspaceContext(req.params.id, req.user);
    const workspace = context.workspace;

    const generated = await aiService.analyzeBusinessContext(context);

    // Determine next version number
    const existing = await prisma.businessAnalysis.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' }
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    const analysis = await prisma.businessAnalysis.create({
      data: {
        workspaceId: workspace.id,
        currentState: generated.currentState,
        futureState: generated.futureState,
        goals: JSON.stringify(generated.goals),
        painPoints: JSON.stringify(generated.painPoints),
        stakeholders: JSON.stringify(generated.stakeholders),
        requirements: JSON.stringify(generated.requirements),
        gaps: JSON.stringify(generated.gaps || []),
        processIssues: JSON.stringify(generated.processIssues || []),
        automationOpportunities: JSON.stringify(generated.automationOpportunities),
        digitalMaturityScore: generated.digitalMaturityScore,
        improvementOpportunities: JSON.stringify(generated.improvementOpportunities || []),
        version: nextVersion,
        status: 'DRAFT',
        // Enhanced Canonical Fields
        executiveSummary: generated.executiveSummary || null,
        assessmentScores: generated.assessmentScores ? JSON.stringify(generated.assessmentScores) : null,
        strategicGoals: generated.strategicGoals ? JSON.stringify(generated.strategicGoals) : null,
        operationalPainPoints: generated.operationalPainPoints ? JSON.stringify(generated.operationalPainPoints) : null,
        requirementsData: generated.requirementsData ? JSON.stringify(generated.requirementsData) : null,
        openQuestions: generated.openQuestions ? JSON.stringify(generated.openQuestions) : null,
        assumptions: generated.assumptions ? JSON.stringify(generated.assumptions) : null,
        recommendations: generated.recommendations ? JSON.stringify(generated.recommendations) : null,
        evidenceReferences: generated.evidenceReferences ? JSON.stringify(generated.evidenceReferences) : null,
        currentOperatingContext: generated.currentOperatingContext ? JSON.stringify(generated.currentOperatingContext) : null,
        futureOperatingState: generated.futureOperatingState ? JSON.stringify(generated.futureOperatingState) : null,
        validationSummary: generated.validationSummary ? JSON.stringify(generated.validationSummary) : null,
        model: generated._meta?.model || 'gemini-3.1-flash-lite'
      }
    });

    // Update workspace status to ANALYSIS and increment token usage if applicable
    const updateData = { status: 'ANALYSIS' };
    if (generated._meta?.tokensUsed && generated._meta.tokensUsed > 0) {
      updateData.aiTokensUsed = { increment: generated._meta.tokensUsed };
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: updateData
    });

    const promptVer = generated._meta?.promptVersion ? ` (prompt: ${generated._meta.promptVersion})` : '';

    // Log version
    await prisma.artifactVersion.create({
      data: {
        workspaceId: workspace.id,
        artifactType: 'ANALYSIS',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(analysis),
        notes: `Generated Business Analysis v${nextVersion}${promptVer}`,
        createdById: req.user.id
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'GENERATED',
        details: `Generated Business Analysis v${nextVersion}${promptVer}`
      }
    });

    const handoffGate = calculateStage2HandoffGate(analysis);
    res.status(201).json({ analysis, handoffGate, _meta: generated._meta });
  } catch (error) {
    handleRouteError(res, error, 'Failed to generate business analysis.');
  }
});

// Update / Edit analysis (tenant-scoped + write permission)
router.patch('/:id/analysis', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const {
      currentState,
      futureState,
      goals,
      painPoints,
      stakeholders,
      requirements,
      gaps,
      processIssues,
      automationOpportunities,
      digitalMaturityScore,
      improvementOpportunities,
      executiveSummary,
      assessmentScores,
      strategicGoals,
      operationalPainPoints,
      requirementsData,
      openQuestions,
      assumptions,
      recommendations,
      evidenceReferences,
      currentOperatingContext,
      futureOperatingState,
      validationSummary,
      status
    } = req.body;

    const current = await prisma.businessAnalysis.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) {
      return res.status(404).json({ error: 'No analysis found to update.' });
    }

    const updated = await prisma.businessAnalysis.update({
      where: { id: current.id },
      data: {
        ...(currentState !== undefined && { currentState }),
        ...(futureState !== undefined && { futureState }),
        ...(goals !== undefined && { goals: typeof goals === 'string' ? goals : JSON.stringify(goals) }),
        ...(painPoints !== undefined && { painPoints: typeof painPoints === 'string' ? painPoints : JSON.stringify(painPoints) }),
        ...(stakeholders !== undefined && { stakeholders: typeof stakeholders === 'string' ? stakeholders : JSON.stringify(stakeholders) }),
        ...(requirements !== undefined && { requirements: typeof requirements === 'string' ? requirements : JSON.stringify(requirements) }),
        ...(gaps !== undefined && { gaps: typeof gaps === 'string' ? gaps : JSON.stringify(gaps) }),
        ...(processIssues !== undefined && { processIssues: typeof processIssues === 'string' ? processIssues : JSON.stringify(processIssues) }),
        ...(automationOpportunities !== undefined && { automationOpportunities: typeof automationOpportunities === 'string' ? automationOpportunities : JSON.stringify(automationOpportunities) }),
        ...(digitalMaturityScore !== undefined && { digitalMaturityScore: Number(digitalMaturityScore) }),
        ...(improvementOpportunities !== undefined && { improvementOpportunities: typeof improvementOpportunities === 'string' ? improvementOpportunities : JSON.stringify(improvementOpportunities) }),
        ...(executiveSummary !== undefined && { executiveSummary }),
        ...(assessmentScores !== undefined && { assessmentScores: typeof assessmentScores === 'string' ? assessmentScores : JSON.stringify(assessmentScores) }),
        ...(strategicGoals !== undefined && { strategicGoals: typeof strategicGoals === 'string' ? strategicGoals : JSON.stringify(strategicGoals) }),
        ...(operationalPainPoints !== undefined && { operationalPainPoints: typeof operationalPainPoints === 'string' ? operationalPainPoints : JSON.stringify(operationalPainPoints) }),
        ...(requirementsData !== undefined && { requirementsData: typeof requirementsData === 'string' ? requirementsData : JSON.stringify(requirementsData) }),
        ...(openQuestions !== undefined && { openQuestions: typeof openQuestions === 'string' ? openQuestions : JSON.stringify(openQuestions) }),
        ...(assumptions !== undefined && { assumptions: typeof assumptions === 'string' ? assumptions : JSON.stringify(assumptions) }),
        ...(recommendations !== undefined && { recommendations: typeof recommendations === 'string' ? recommendations : JSON.stringify(recommendations) }),
        ...(evidenceReferences !== undefined && { evidenceReferences: typeof evidenceReferences === 'string' ? evidenceReferences : JSON.stringify(evidenceReferences) }),
        ...(currentOperatingContext !== undefined && { currentOperatingContext: typeof currentOperatingContext === 'string' ? currentOperatingContext : JSON.stringify(currentOperatingContext) }),
        ...(futureOperatingState !== undefined && { futureOperatingState: typeof futureOperatingState === 'string' ? futureOperatingState : JSON.stringify(futureOperatingState) }),
        ...(validationSummary !== undefined && { validationSummary: typeof validationSummary === 'string' ? validationSummary : JSON.stringify(validationSummary) }),
        ...(status !== undefined && { status })
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'UPDATED',
        details: 'Saved edits to Business Analysis'
      }
    });

    const handoffGate = calculateStage2HandoffGate(updated);
    res.json({ analysis: updated, handoffGate });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update business analysis.');
  }
});

// Approve analysis (tenant-scoped + write permission)
router.post('/:id/analysis/approve', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const current = await prisma.businessAnalysis.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) {
      return res.status(404).json({ error: 'No analysis found to approve.' });
    }

    const handoffGate = calculateStage2HandoffGate(current);
    if (!handoffGate.canProceed) {
      return res.status(400).json({
        error: 'Architecture handoff blocked because unresolved blocker items require confirmation.',
        handoffGate,
        blockers: handoffGate.blockers
      });
    }

    const approved = await prisma.businessAnalysis.update({
      where: { id: current.id },
      data: { status: 'APPROVED' }
    });

    // Create approval record
    await prisma.approval.create({
      data: {
        workspaceId: req.params.id,
        artifactType: 'ANALYSIS',
        artifactId: current.id,
        userId: req.user.id,
        status: 'APPROVED',
        comments: req.body.comments || 'Approved business analysis specifications.',
        approvedAt: new Date()
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'APPROVED',
        details: `${req.user.name} approved Business Analysis`
      }
    });

    res.json({ analysis: approved, handoffGate, message: 'Business Analysis approved successfully.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to approve business analysis.');
  }
});

export default router;

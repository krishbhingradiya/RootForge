import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import {
  assertWorkspaceAccess,
  assertWorkspaceWriteAccess,
  getTenantWorkspaceWhere,
  handleRouteError
} from '../services/authorization.service.js';
import {
  getLifecycleStageStatus,
  getWorkspaceReadiness,
  getNextRecommendedAction
} from '../services/workspaceLifecycle.service.js';

const router = Router();

/**
 * Helper to dynamically extract the business problem diagnostic strictly separating:
 * 1. Target Users & Personas (stakeholders/target personas)
 * 2. Current Operating Friction (what is wrong today - NEVER a solution)
 * 3. Target Outcome (desired business results - NEVER bare scores like "70")
 */
export function deriveProblemDiagnostic(workspace) {
  const latestAnalysis = workspace.businessAnalyses?.[0] || null;

  const isBareNumericScore = (val) => {
    if (val === null || val === undefined) return false;
    const str = String(val).trim();
    return /^\d+(\.\d+)?%?$/.test(str) || /^\d+\s*\/\s*\d+$/.test(str);
  };

  const isSolutionSentence = (sentence) => {
    if (!sentence) return false;
    const s = sentence.trim().toLowerCase();
    return (
      s.startsWith('improve') ||
      s.startsWith('we want to build') ||
      s.startsWith('we want to create') ||
      s.startsWith('we want a') ||
      s.startsWith('build ') ||
      s.startsWith('create ') ||
      s.startsWith('replace ') ||
      s.startsWith('by replacing') ||
      s.startsWith('the goal is') ||
      s.startsWith('our goal is') ||
      s.startsWith('centralize') ||
      s.startsWith('streamline') ||
      s.startsWith('modernize') ||
      s.startsWith('enable') ||
      s.startsWith('deliver') ||
      s.startsWith('achieve')
    );
  };

  const isFrictionSentence = (sentence) => {
    if (!sentence) return false;
    const s = sentence.trim().toLowerCase();
    return (
      s.includes('currently') ||
      s.includes('manage') ||
      s.includes('struggle') ||
      s.includes('manual') ||
      s.includes('spreadsheet') ||
      s.includes('phone call') ||
      s.includes('waiting time') ||
      s.includes('conflict') ||
      s.includes('difficulty') ||
      s.includes('delay') ||
      s.includes('bottleneck') ||
      s.includes('siloed') ||
      s.includes('lack') ||
      s.includes('visibility') ||
      s.includes('fragmented') ||
      s.includes('track')
    );
  };

  const extractSentences = (text) => {
    if (!text) return [];
    const matches = text.match(/[^.!?\n]+[.!?\n]*/g);
    return matches ? matches.map(s => s.trim()).filter(Boolean) : [text.trim()];
  };

  // 1. Target Users & Personas
  let targetUsers = '';
  if (latestAnalysis?.stakeholders) {
    let parsedStakeholders = [];
    try {
      parsedStakeholders = typeof latestAnalysis.stakeholders === 'string'
        ? JSON.parse(latestAnalysis.stakeholders)
        : latestAnalysis.stakeholders;
    } catch (e) {
      parsedStakeholders = [];
    }
    if (Array.isArray(parsedStakeholders) && parsedStakeholders.length > 0) {
      targetUsers = parsedStakeholders
        .map(s => (typeof s === 'string' ? s : s?.role))
        .filter(Boolean)
        .join(', ');
    }
  }
  if (!targetUsers && workspace.targetUsers && workspace.targetUsers.trim()) {
    targetUsers = workspace.targetUsers.trim();
  }
  if (!targetUsers) {
    targetUsers = 'Not identified yet';
  }

  // 2. Current Operating Friction (Current State & Problem - NEVER Solution)
  let operatingFriction = '';
  if (latestAnalysis?.currentState && latestAnalysis.currentState.trim()) {
    const sentences = extractSentences(latestAnalysis.currentState);
    const frictionOnly = sentences.filter(s => !isSolutionSentence(s));
    operatingFriction = (frictionOnly.length > 0 ? frictionOnly.join(' ') : latestAnalysis.currentState).trim();
  } else if (latestAnalysis?.painPoints) {
    let parsedPainPoints = [];
    try {
      parsedPainPoints = typeof latestAnalysis.painPoints === 'string'
        ? JSON.parse(latestAnalysis.painPoints)
        : latestAnalysis.painPoints;
    } catch (e) {}
    if (Array.isArray(parsedPainPoints) && parsedPainPoints.length > 0) {
      operatingFriction = parsedPainPoints.filter(Boolean).join('; ');
    }
  }

  if (!operatingFriction) {
    if (workspace.challenge && workspace.challenge.trim() && !isSolutionSentence(workspace.challenge)) {
      operatingFriction = workspace.challenge.trim();
    } else {
      const objSentences = extractSentences(workspace.objective);
      const frictionSentences = objSentences.filter(s => isFrictionSentence(s) && !isSolutionSentence(s));
      if (frictionSentences.length > 0) {
        operatingFriction = frictionSentences.join(' ');
      } else if (workspace.challenge && workspace.challenge.trim()) {
        operatingFriction = workspace.challenge.trim();
      }
    }
  }

  if (!operatingFriction) {
    operatingFriction = 'Business analysis not available yet';
  }

  // 3. Target Outcome (Target Business Result - NEVER bare numeric scores like "70")
  let targetOutcome = '';
  if (latestAnalysis?.goals) {
    let parsedGoals = [];
    try {
      parsedGoals = typeof latestAnalysis.goals === 'string'
        ? JSON.parse(latestAnalysis.goals)
        : latestAnalysis.goals;
    } catch (e) {}
    if (Array.isArray(parsedGoals) && parsedGoals.length > 0) {
      const validGoals = parsedGoals.filter(g => typeof g === 'string' && !isBareNumericScore(g) && g.trim().length > 3);
      if (validGoals.length > 0) {
        targetOutcome = validGoals.join('; ');
      }
    }
  }
  if (!targetOutcome && latestAnalysis?.futureState && latestAnalysis.futureState.trim()) {
    targetOutcome = latestAnalysis.futureState.trim();
  }

  if (!targetOutcome && workspace.expectedOutcome && workspace.expectedOutcome.trim()) {
    const trimmed = workspace.expectedOutcome.trim();
    if (!isBareNumericScore(trimmed)) {
      targetOutcome = trimmed;
    }
  }

  if (!targetOutcome) {
    const objSentences = extractSentences(workspace.objective);
    const solutionSentences = objSentences.filter(s => isSolutionSentence(s));
    if (solutionSentences.length > 0) {
      targetOutcome = solutionSentences.join(' ');
    } else if (workspace.challenge && workspace.challenge.trim() && isSolutionSentence(workspace.challenge)) {
      targetOutcome = workspace.challenge.trim();
    } else if (workspace.objective && workspace.objective.trim() && !isBareNumericScore(workspace.objective)) {
      targetOutcome = workspace.objective.trim();
    }
  }

  if (!targetOutcome) {
    targetOutcome = 'Business outcome not defined yet';
  }

  return {
    targetUsers,
    operatingFriction,
    targetOutcome,
    isFromAnalysis: !!latestAnalysis
  };
}

// List all workspaces (scoped strictly to user's organization for non-admins)
router.get('/', authenticate, async (req, res) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: getTenantWorkspaceWhere(req.user),
      orderBy: { createdAt: 'desc' },
      include: {
        organization: true,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            documents: true,
            businessAnalyses: true,
            solutions: true,
            architectures: true,
            processes: true,
            uxDesigns: true,
            databaseDesigns: true,
            implementationPlans: true,
            comments: true
          }
        }
      }
    });

    const sanitizedWorkspaces = workspaces.map(ws => {
      if (!ws.isDemo && ws.id !== 'ws-demo-customer-support' && ws.organization?.name?.toLowerCase().includes('acme retail global')) {
        return { ...ws, organization: null, organizationId: null };
      }
      return ws;
    });

    res.json({ workspaces: sanitizedWorkspaces });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve workspaces.');
  }
});

// Create new workspace (strictly bound to user's organization)
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'VIEWER') {
      return res.status(403).json({ error: 'Access denied. Viewers have read-only permissions.' });
    }

    const { name, organizationName, industry, objective, challenge, targetUsers, expectedOutcome } = req.body;

    if (!name || !objective || !challenge) {
      return res.status(400).json({ error: 'Project name, business objective, and challenge are required.' });
    }

    // Determine organizationId:
    // Never leak demo organization "Acme Retail Global" into new workspaces.
    let organizationId = null;

    if (req.user.role === 'ADMIN') {
      if (req.body.organizationId) {
        organizationId = req.body.organizationId;
      } else if (organizationName && organizationName.trim()) {
        let org = await prisma.organization.findFirst({
          where: { name: organizationName.trim() }
        });
        if (!org) {
          org = await prisma.organization.create({
            data: {
              name: organizationName.trim(),
              industry: industry || 'Enterprise'
            }
          });
        }
        organizationId = org.id;
      } else {
        organizationId = null;
      }
    } else {
      // Standard users (CONSULTANT, ANALYST)
      const userOrg = req.user.organizationId
        ? await prisma.organization.findUnique({ where: { id: req.user.organizationId } })
        : null;
      const isDemoOrg = userOrg?.name?.toLowerCase().includes('acme retail global');

      if (!isDemoOrg && req.user.organizationId) {
        // Genuine tenant user (e.g. Tenant Alpha): bound strictly to their tenant organization (Scenario J)
        organizationId = req.user.organizationId;
      } else if (organizationName && organizationName.trim()) {
        // User on demo seed org or unassigned: create or bind to their specified genuine organization
        let org = await prisma.organization.findFirst({
          where: { name: organizationName.trim() }
        });
        if (!org) {
          org = await prisma.organization.create({
            data: {
              name: organizationName.trim(),
              industry: industry || 'Enterprise'
            }
          });
        }
        organizationId = org.id;

        await prisma.user.update({
          where: { id: req.user.id },
          data: { organizationId: org.id }
        });
        req.user.organizationId = org.id;
      } else {
        organizationId = null;
      }
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        organizationId,
        industry: industry || 'Technology & Business Services',
        objective,
        challenge,
        targetUsers: targetUsers || 'Frontline Teams, Managers, End Customers',
        expectedOutcome: expectedOutcome || 'Operational automation and efficiency gains',
        status: 'DISCOVERY',
        createdById: req.user.id
      },
      include: {
        organization: true,
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    // Create default conversation
    await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        title: `${name} Discovery Session`,
        messages: {
          create: [
            {
              role: 'assistant',
              content: `Welcome to the Discovery workspace for **${workspace.name}**.\n\nI am your AI Business Consultant. I have indexed your initial objective: *"${workspace.objective}"*.\n\nTo tailor the architecture, workflow, and technology recommendations, let's explore your current operating constraints. What is the single biggest operational bottleneck you want to eliminate?`
            }
          ]
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'CREATED',
        details: `Created workspace "${workspace.name}"`
      }
    });

    res.status(201).json({ workspace });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace.' });
  }
});

// Get workspace by ID with stage progression summary
router.get('/:id', authenticate, async (req, res) => {
  try {
    const workspace = await assertWorkspaceAccess(req.params.id, req.user, {
      include: {
        organization: true,
        createdBy: { select: { id: true, name: true, email: true } },
        documents: {
          select: { id: true, workspaceId: true, filename: true, originalName: true, fileType: true, fileSize: true, status: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' }
        },
        businessAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
        solutions: { orderBy: { createdAt: 'desc' }, take: 1 },
        architectures: { orderBy: { createdAt: 'desc' }, take: 1, include: { nodes: true, edges: true } },
        processes: { orderBy: { createdAt: 'desc' }, take: 1, include: { nodes: true } },
        uxDesigns: { orderBy: { createdAt: 'desc' }, take: 1 },
        databaseDesigns: { orderBy: { createdAt: 'desc' }, take: 1 },
        apiDesigns: { orderBy: { createdAt: 'desc' }, take: 1 },
        implementationPlans: { orderBy: { createdAt: 'desc' }, take: 1, include: { tasks: true } },
        exportJobs: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        versions: {
          select: { id: true, workspaceId: true, artifactType: true, versionNumber: true, notes: true, createdById: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
        conversations: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Canonical Single Source of Truth Lifecycle calculation
    const stages = getLifecycleStageStatus(workspace);
    const nextAction = getNextRecommendedAction(workspace, stages);
    const assessmentScores = getWorkspaceReadiness(workspace, stages);

    // Sanitize workspace: never leak Acme Retail Global to non-demo workspaces
    if (!workspace.isDemo && workspace.id !== 'ws-demo-customer-support' && workspace.organization?.name?.toLowerCase().includes('acme retail global')) {
      workspace.organization = null;
      workspace.organizationId = null;
    }

    const problemDiagnostic = deriveProblemDiagnostic(workspace);

    res.json({
      workspace,
      stages,
      nextAction,
      assessmentScores,
      problemDiagnostic
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve workspace details.');
  }
});

// Update workspace
router.patch('/:id', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { name, objective, challenge, targetUsers, expectedOutcome, status } = req.body;

    const updated = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(objective && { objective }),
        ...(challenge && { challenge }),
        ...(targetUsers && { targetUsers }),
        ...(expectedOutcome && { expectedOutcome }),
        ...(status && { status })
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'UPDATED',
        details: 'Updated workspace metadata'
      }
    });

    res.json({ workspace: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update workspace.');
  }
});

// Delete workspace
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    await prisma.workspace.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Workspace deleted.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete workspace.');
  }
});

// Transformation Dashboard Summary & Assessment Scores
router.get('/:id/dashboard', authenticate, async (req, res) => {
  try {
    const workspace = await assertWorkspaceAccess(req.params.id, req.user, {
      include: {
        businessAnalyses: { take: 1, orderBy: { createdAt: 'desc' } },
        solutions: { take: 1, orderBy: { createdAt: 'desc' } },
        architectures: { take: 1, orderBy: { createdAt: 'desc' }, include: { nodes: true, edges: true } },
        processes: { take: 1, orderBy: { createdAt: 'desc' }, include: { nodes: true } },
        uxDesigns: { take: 1, orderBy: { createdAt: 'desc' } },
        databaseDesigns: { take: 1, orderBy: { createdAt: 'desc' } },
        apiDesigns: { take: 1, orderBy: { createdAt: 'desc' } },
        implementationPlans: { take: 1, orderBy: { createdAt: 'desc' }, include: { tasks: true } },
        exportJobs: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'desc' } },
        versions: {
          select: { id: true, workspaceId: true, artifactType: true, versionNumber: true, notes: true, createdById: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          select: { id: true, workspaceId: true, filename: true, originalName: true, fileType: true, fileSize: true, status: true, createdAt: true, updatedAt: true }
        },
        conversations: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const analysis = workspace.businessAnalyses[0];
    const solution = workspace.solutions[0];
    const plan = workspace.implementationPlans[0];

    const stages = getLifecycleStageStatus(workspace);
    const assessmentScores = getWorkspaceReadiness(workspace, stages);
    const nextAction = getNextRecommendedAction(workspace, stages);

    const tasks = plan?.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length;

    const automationOpportunitiesCount = analysis ? (JSON.parse(analysis.automationOpportunities || '[]')).length : 0;
    const projectHealth = blockedTasks > 0
      ? 'ACTION REQUIRED / BLOCKED'
      : (inProgressTasks > 0 || completedTasks > 0)
        ? 'ACTIVE / IN PROGRESS'
        : 'STABLE / ON TRACK';
    const riskLevel = blockedTasks > 0 ? 'HIGH' : 'LOW - MODERATE';

    res.json({
      assessmentScores,
      stages,
      nextAction,
      metrics: {
        automationOpportunitiesCount,
        projectHealth,
        riskLevel,
        openDecisionsCount: solution ? (solution.status === 'APPROVED' ? 0 : 1) : 0,
        tasksCount: tasks.length,
        completedTasksCount: completedTasks,
        inProgressTasksCount: inProgressTasks,
        blockedTasksCount: blockedTasks,
        planningProgress: stages.planning?.progress || 0,
        documentsCount: workspace.documents.length,
        approvalsCount: workspace.approvals.filter(a => a.status === 'APPROVED').length
      },
      recommendedNextSteps: [
        `Execute current milestone: ${nextAction}`,
        'Verify architecture and API contract alignment with enterprise standards',
        'Review sprint allocation and implementation dependencies in the transformation roadmap'
      ]
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to calculate dashboard statistics.');
  }
});

export default router;

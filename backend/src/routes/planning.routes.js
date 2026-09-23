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

const router = Router();

// Get implementation plan with tasks and project context (tenant-scoped)
router.get('/:id/planning', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const plan = await prisma.implementationPlan.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: { orderBy: [{ sprint: 'asc' }, { taskOrder: 'asc' }, { createdAt: 'asc' }] }
      }
    });

    // Provide project context summary for dropdowns and role suggestion
    const context = await getWorkspaceContext(req.params.id, req.user).catch(() => null);
    const contextSummary = context ? {
      industry: context.workspace?.industry || '',
      domain: context.domain || '',
      objective: context.workspace?.objective || '',
      requirements: (context.businessAnalysis?.requirements || []).map(r => ({
        id: r.id || '',
        text: r.text || (typeof r === 'string' ? r : '')
      })),
      entities: (context.database?.entities || []).map(e => e.name || e.label).filter(Boolean),
      endpoints: (context.api?.endpoints || []).map(e => `${e.method || 'POST'} ${e.endpoint || e.path}`).filter(Boolean),
      screens: (context.ux?.screens || []).map(s => s.name || s.title).filter(Boolean),
      processSteps: (context.process?.nodes || []).map(n => n.label || n.name).filter(Boolean)
    } : null;

    res.json({ plan, contextSummary });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve implementation plan.');
  }
});

// Generate implementation plan (tenant-scoped + write permission)
router.post('/:id/planning', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const context = await getWorkspaceContext(req.params.id, req.user);
    const workspace = context.workspace;
    const { preserveUserEdits } = req.body || {};

    // Check for existing user-edited tasks to preserve
    const existing = await prisma.implementationPlan.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' },
      include: { tasks: true }
    });

    const userEditedTasks = (existing?.tasks || []).filter(t => t.isUserEdited === true);

    const generated = await aiService.generateImplementationPlan(context, context.solution);

    const nextVersion = existing ? existing.version + 1 : 1;

    // Prepare generated tasks list
    const tasksToCreate = generated.tasks.map((t, idx) => ({
      phaseName: t.phaseName,
      title: t.title,
      description: t.description,
      assignedRole: t.assignedRole,
      durationWeeks: t.durationWeeks ? Number(t.durationWeeks) : 1.0,
      sprint: t.sprint || 'Sprint 1',
      status: t.status || 'TODO',
      riskLevel: t.riskLevel || 'LOW',
      riskReason: t.riskReason || null,
      riskMitigation: t.riskMitigation || null,
      sourceRequirement: t.sourceRequirement || null,
      dependencies: t.dependencies ? (typeof t.dependencies === 'string' ? t.dependencies : JSON.stringify(t.dependencies)) : null,
      isUserEdited: false,
      taskOrder: idx + 1
    }));

    // If preserving user edits, merge preserved tasks into the task list
    if (preserveUserEdits && userEditedTasks.length > 0) {
      for (const ut of userEditedTasks) {
        // If not already in the generated list by title
        const existingIdx = tasksToCreate.findIndex(gt => gt.title.trim().toLowerCase() === ut.title.trim().toLowerCase());
        const userTaskData = {
          phaseName: ut.phaseName,
          title: ut.title,
          description: ut.description,
          assignedRole: ut.assignedRole,
          durationWeeks: ut.durationWeeks,
          sprint: ut.sprint,
          status: ut.status,
          riskLevel: ut.riskLevel,
          riskReason: ut.riskReason,
          riskMitigation: ut.riskMitigation,
          sourceRequirement: ut.sourceRequirement,
          dependencies: ut.dependencies,
          isUserEdited: true,
          taskOrder: tasksToCreate.length + 1
        };

        if (existingIdx >= 0) {
          tasksToCreate[existingIdx] = userTaskData;
        } else {
          tasksToCreate.push(userTaskData);
        }
      }
    }

    const plan = await prisma.implementationPlan.create({
      data: {
        workspaceId: workspace.id,
        title: generated.title,
        phases: JSON.stringify(generated.phases),
        estimatedDurationWeeks: generated.estimatedDurationWeeks,
        estimatedCost: generated.estimatedCost,
        methodology: generated.methodology,
        version: nextVersion,
        status: 'DRAFT',
        tasks: {
          create: tasksToCreate
        }
      },
      include: { tasks: true }
    });

    const updateData = { status: 'PLANNING' };
    if (generated._meta?.tokensUsed && generated._meta.tokensUsed > 0) {
      updateData.aiTokensUsed = { increment: generated._meta.tokensUsed };
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: updateData
    });

    const promptVer = generated._meta?.promptVersion ? ` (prompt: ${generated._meta.promptVersion})` : '';

    await prisma.artifactVersion.create({
      data: {
        workspaceId: workspace.id,
        artifactType: 'PLANNING',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(plan),
        notes: `Generated Implementation Roadmap v${nextVersion}${promptVer}${preserveUserEdits ? ' (User edits preserved)' : ''}`,
        createdById: req.user.id
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'GENERATED',
        details: `Generated Transformation Roadmap v${nextVersion}${promptVer}`
      }
    });

    res.status(201).json({ plan, _meta: generated._meta });
  } catch (error) {
    handleRouteError(res, error, 'Failed to generate implementation plan.');
  }
});

// Update plan properties (tenant-scoped + write permission)
router.patch('/:id/planning', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { phases, estimatedDurationWeeks, estimatedCost, methodology, title, status } = req.body;
    const current = await prisma.implementationPlan.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) return res.status(404).json({ error: 'Plan not found.' });

    const updated = await prisma.implementationPlan.update({
      where: { id: current.id },
      data: {
        ...(title && { title }),
        ...(phases && { phases: typeof phases === 'string' ? phases : JSON.stringify(phases) }),
        ...(estimatedDurationWeeks !== undefined && { estimatedDurationWeeks: Number(estimatedDurationWeeks) }),
        ...(estimatedCost && { estimatedCost }),
        ...(methodology && { methodology }),
        ...(status && { status })
      },
      include: { tasks: true }
    });

    res.json({ plan: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update plan.');
  }
});

// Add task (tenant-scoped + write permission)
router.post('/:id/planning/tasks', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const {
      phaseName,
      title,
      description,
      assignedRole,
      durationWeeks,
      sprint,
      riskLevel,
      riskReason,
      riskMitigation,
      sourceRequirement,
      dependencies,
      status
    } = req.body;

    const current = await prisma.implementationPlan.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { tasks: true }
    });

    if (!current) return res.status(404).json({ error: 'Plan not found.' });

    const task = await prisma.task.create({
      data: {
        planId: current.id,
        phaseName: phaseName || 'Phase 1: Architecture & Security Foundation',
        title: title || 'New Implementation Task',
        description: description || 'Task scope and technical acceptance criteria',
        assignedRole: assignedRole || 'Software Engineer',
        durationWeeks: durationWeeks ? Number(durationWeeks) : 1.0,
        sprint: sprint || 'Sprint 1',
        riskLevel: riskLevel || 'LOW',
        riskReason: riskReason || null,
        riskMitigation: riskMitigation || null,
        sourceRequirement: sourceRequirement || null,
        dependencies: dependencies ? (typeof dependencies === 'string' ? dependencies : JSON.stringify(dependencies)) : null,
        status: status || 'TODO',
        isUserEdited: true,
        taskOrder: (current.tasks.length || 0) + 1
      }
    });

    res.status(201).json({ task });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create task.');
  }
});

// Update task status or fields (tenant-scoped + subresource check)
router.patch('/:id/planning/tasks/:taskId', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const existingTask = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { plan: true }
    });
    if (!existingTask || existingTask.plan.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const {
      title,
      description,
      assignedRole,
      durationWeeks,
      sprint,
      phaseName,
      status,
      riskLevel,
      riskReason,
      riskMitigation,
      sourceRequirement,
      dependencies,
      isUserEdited
    } = req.body;

    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(assignedRole !== undefined && { assignedRole }),
        ...(durationWeeks !== undefined && { durationWeeks: Number(durationWeeks) }),
        ...(sprint !== undefined && { sprint }),
        ...(phaseName !== undefined && { phaseName }),
        ...(status !== undefined && { status }),
        ...(riskLevel !== undefined && { riskLevel }),
        ...(riskReason !== undefined && { riskReason }),
        ...(riskMitigation !== undefined && { riskMitigation }),
        ...(sourceRequirement !== undefined && { sourceRequirement }),
        ...(dependencies !== undefined && {
          dependencies: typeof dependencies === 'string' ? dependencies : JSON.stringify(dependencies)
        }),
        isUserEdited: isUserEdited !== undefined ? isUserEdited : true
      }
    });

    res.json({ task });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update task.');
  }
});

// Delete task (tenant-scoped + subresource check)
router.delete('/:id/planning/tasks/:taskId', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const existingTask = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { plan: { include: { tasks: true } } }
    });
    if (!existingTask || existingTask.plan.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Clean up dependencies in remaining tasks referencing this deleted task
    const remainingTasks = existingTask.plan.tasks.filter(t => t.id !== req.params.taskId);
    for (const other of remainingTasks) {
      if (!other.dependencies) continue;
      try {
        const deps = JSON.parse(other.dependencies);
        if (Array.isArray(deps)) {
          const filtered = deps.filter(d => d !== req.params.taskId && d !== existingTask.title);
          if (filtered.length !== deps.length) {
            await prisma.task.update({
              where: { id: other.id },
              data: { dependencies: JSON.stringify(filtered) }
            });
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }

    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ success: true, message: 'Task deleted.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to delete task.');
  }
});

export default router;


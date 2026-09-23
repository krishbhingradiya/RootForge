import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import {
  assertWorkspaceAccess,
  assertWorkspaceWriteAccess,
  handleRouteError
} from '../services/authorization.service.js';

const router = Router();

/**
 * ARTIFACT_TYPE_LABELS — Canonical mapping from artifactType to human-readable module names.
 * Used to label artifacts in the Collaboration hub dynamically.
 */
const ARTIFACT_TYPE_LABELS = {
  DISCOVERY: 'Discovery',
  ANALYSIS: 'Business Analysis',
  SOLUTION: 'Solution Builder',
  ARCHITECTURE: 'Architecture',
  PROCESS: 'Process Designer',
  UX: 'UX Designer',
  DATABASE: 'Database & APIs',
  PLANNING: 'Planning'
};

/**
 * Helper: Collect workspace artifact summaries from all lifecycle modules.
 * Returns an array of { artifactType, artifactName, version, status, artifactId }.
 */
async function getWorkspaceArtifactSummaries(workspaceId) {
  const artifacts = [];

  // Discovery — workspace always has discovery context from the workspace itself
  // Discovery doesn't have a separate DB model, it's part of the workspace + conversations
  artifacts.push({
    artifactType: 'DISCOVERY',
    artifactName: 'Discovery Context',
    version: 1,
    status: 'COMPLETED',
    artifactId: null
  });

  // Business Analysis
  const analyses = await prisma.businessAnalysis.findMany({
    where: { workspaceId },
    select: { id: true, version: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 1
  });
  if (analyses.length > 0) {
    artifacts.push({
      artifactType: 'ANALYSIS',
      artifactName: 'Business Analysis',
      version: analyses[0].version,
      status: analyses[0].status,
      artifactId: analyses[0].id
    });
  }

  // Solution
  const solutions = await prisma.solution.findMany({
    where: { workspaceId },
    select: { id: true, name: true, version: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 1
  });
  if (solutions.length > 0) {
    artifacts.push({
      artifactType: 'SOLUTION',
      artifactName: solutions[0].name || 'Solution Blueprint',
      version: solutions[0].version,
      status: solutions[0].status,
      artifactId: solutions[0].id
    });
  }

  // Architecture
  const archs = await prisma.architecture.findMany({
    where: { workspaceId },
    select: { id: true, title: true, version: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 1
  });
  if (archs.length > 0) {
    artifacts.push({
      artifactType: 'ARCHITECTURE',
      artifactName: archs[0].title || 'Solution Architecture',
      version: archs[0].version,
      status: archs[0].status,
      artifactId: archs[0].id
    });
  }

  // Process
  const processes = await prisma.processModel.findMany({
    where: { workspaceId },
    select: { id: true, title: true, version: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 1
  });
  if (processes.length > 0) {
    artifacts.push({
      artifactType: 'PROCESS',
      artifactName: processes[0].title || 'Process Workflow',
      version: processes[0].version,
      status: processes[0].status,
      artifactId: processes[0].id
    });
  }

  // UX
  const uxDesigns = await prisma.uXDesign.findMany({
    where: { workspaceId },
    select: { id: true, title: true, version: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 1
  });
  if (uxDesigns.length > 0) {
    artifacts.push({
      artifactType: 'UX',
      artifactName: uxDesigns[0].title || 'UX Wireframes',
      version: uxDesigns[0].version,
      status: uxDesigns[0].status,
      artifactId: uxDesigns[0].id
    });
  }

  // Database
  const dbDesigns = await prisma.databaseDesign.findMany({
    where: { workspaceId },
    select: { id: true, title: true, version: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 1
  });
  if (dbDesigns.length > 0) {
    artifacts.push({
      artifactType: 'DATABASE',
      artifactName: dbDesigns[0].title || 'Data Model & ERD',
      version: dbDesigns[0].version,
      status: dbDesigns[0].status,
      artifactId: dbDesigns[0].id
    });
  }

  // Planning
  const plans = await prisma.implementationPlan.findMany({
    where: { workspaceId },
    select: { id: true, title: true, version: true, status: true },
    orderBy: { updatedAt: 'desc' },
    take: 1
  });
  if (plans.length > 0) {
    artifacts.push({
      artifactType: 'PLANNING',
      artifactName: plans[0].title || 'Implementation Roadmap',
      version: plans[0].version,
      status: plans[0].status,
      artifactId: plans[0].id
    });
  }

  return artifacts;
}

// ─── GET Collaboration Summary ─────────────────────────────────────────────
// Returns comments, approvals, activity logs, AND workspace artifact summaries
router.get('/:id/collaboration', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const [comments, approvals, activityLogs, artifacts] = await Promise.all([
      prisma.comment.findMany({
        where: { workspaceId: req.params.id },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.approval.findMany({
        where: { workspaceId: req.params.id },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.activityLog.findMany({
        where: { workspaceId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      getWorkspaceArtifactSummaries(req.params.id)
    ]);

    res.json({ comments, approvals, activityLogs, artifacts });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve collaboration data.');
  }
});

// ─── POST Comment ──────────────────────────────────────────────────────────
// Supports artifactName, versionNumber, parentId for threading, mentions
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const { artifactType, content, mentions, artifactId, artifactName, versionNumber, parentId } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required.' });
    }

    // If parentId is provided, verify the parent comment exists and belongs to the same workspace
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.workspaceId !== req.params.id) {
        return res.status(400).json({ error: 'Parent comment not found in this workspace.' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        workspaceId: req.params.id,
        artifactType: artifactType || 'GENERAL',
        artifactId: artifactId || null,
        artifactName: artifactName || null,
        versionNumber: versionNumber ? parseInt(versionNumber, 10) : null,
        parentId: parentId || null,
        userId: req.user.id,
        content: content.trim(),
        mentions: mentions ? JSON.stringify(mentions) : null,
        status: 'OPEN'
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'COMMENT_ADDED',
        details: `${req.user.name} commented on ${ARTIFACT_TYPE_LABELS[artifactType] || artifactType || 'Workspace'}${versionNumber ? ` V${versionNumber}` : ''}`,
        artifactType: artifactType || 'GENERAL',
        artifactName: artifactName || null,
        versionNumber: versionNumber ? parseInt(versionNumber, 10) : null,
        resultingStatus: 'OPEN'
      }
    });

    res.status(201).json({ comment });
  } catch (error) {
    handleRouteError(res, error, 'Failed to post comment.');
  }
});

// ─── PATCH Resolve / Reopen Comment ────────────────────────────────────────
router.patch('/:id/comments/:commentId/resolve', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const { status } = req.body; // 'RESOLVED' or 'REOPENED'
    if (!['RESOLVED', 'REOPENED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be RESOLVED or REOPENED.' });
    }

    const existing = await prisma.comment.findUnique({ where: { id: req.params.commentId } });
    if (!existing || existing.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const previousStatus = existing.status;

    const updated = await prisma.comment.update({
      where: { id: req.params.commentId },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    });

    const auditAction = status === 'RESOLVED' ? 'COMMENT_RESOLVED' : 'COMMENT_REOPENED';
    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: auditAction,
        details: `${req.user.name} ${status === 'RESOLVED' ? 'resolved' : 'reopened'} a comment on ${ARTIFACT_TYPE_LABELS[existing.artifactType] || existing.artifactType}`,
        artifactType: existing.artifactType,
        artifactName: existing.artifactName,
        versionNumber: existing.versionNumber,
        resultingStatus: status,
        beforeState: previousStatus,
        afterState: status
      }
    });

    res.json({ comment: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update comment status.');
  }
});

// ─── POST Submit / Update Approval (with duplicate prevention) ─────────────
// Supports: DRAFT, IN_REVIEW, APPROVED, CHANGES_REQUESTED, REJECTED, SUPERSEDED
router.post('/:id/approvals', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { artifactType, status, comments, artifactId, artifactName, versionNumber, stage } = req.body;

    if (!artifactType) {
      return res.status(400).json({ error: 'artifactType is required.' });
    }

    const resolvedStatus = status || 'IN_REVIEW';
    const resolvedStage = stage || 'REVIEW';
    const resolvedVersion = versionNumber ? parseInt(versionNumber, 10) : null;

    // Upsert: prevent duplicate sign-offs for same workspace+artifact+version+stage+user
    let approval;
    const uniqueWhere = {
      workspaceId_artifactType_versionNumber_stage_userId: {
        workspaceId: req.params.id,
        artifactType,
        versionNumber: resolvedVersion ?? 0,
        stage: resolvedStage,
        userId: req.user.id
      }
    };

    const existing = await prisma.approval.findUnique({ where: uniqueWhere });

    if (existing) {
      // Update existing sign-off
      const previousStatus = existing.status;
      approval = await prisma.approval.update({
        where: { id: existing.id },
        data: {
          status: resolvedStatus,
          comments: comments || existing.comments,
          artifactName: artifactName || existing.artifactName,
          artifactId: artifactId || existing.artifactId,
          approvedAt: resolvedStatus === 'APPROVED' ? new Date() : existing.approvedAt
        },
        include: { user: { select: { id: true, name: true, email: true, role: true } } }
      });

      // Audit: status change
      await prisma.activityLog.create({
        data: {
          workspaceId: req.params.id,
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: resolvedStatus === 'APPROVED' ? 'SIGN_OFF_APPROVED' :
                  resolvedStatus === 'REJECTED' ? 'SIGN_OFF_REJECTED' :
                  resolvedStatus === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' :
                  'SIGN_OFF_SUBMITTED',
          details: `${req.user.name} updated ${ARTIFACT_TYPE_LABELS[artifactType] || artifactType}${resolvedVersion ? ` V${resolvedVersion}` : ''} sign-off to ${resolvedStatus}`,
          artifactType,
          artifactName: artifactName || null,
          versionNumber: resolvedVersion,
          resultingStatus: resolvedStatus,
          beforeState: previousStatus,
          afterState: resolvedStatus
        }
      });
    } else {
      // Create new sign-off
      approval = await prisma.approval.create({
        data: {
          workspaceId: req.params.id,
          artifactType,
          artifactId: artifactId || null,
          artifactName: artifactName || null,
          versionNumber: resolvedVersion ?? 0,
          versionId: null,
          stage: resolvedStage,
          userId: req.user.id,
          status: resolvedStatus,
          comments: comments || null,
          approvedAt: resolvedStatus === 'APPROVED' ? new Date() : null
        },
        include: { user: { select: { id: true, name: true, email: true, role: true } } }
      });

      await prisma.activityLog.create({
        data: {
          workspaceId: req.params.id,
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: resolvedStatus === 'APPROVED' ? 'SIGN_OFF_APPROVED' :
                  resolvedStatus === 'REJECTED' ? 'SIGN_OFF_REJECTED' :
                  resolvedStatus === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' :
                  'SIGN_OFF_SUBMITTED',
          details: `${req.user.name} signed off on ${ARTIFACT_TYPE_LABELS[artifactType] || artifactType}${resolvedVersion ? ` V${resolvedVersion}` : ''} as ${resolvedStatus}`,
          artifactType,
          artifactName: artifactName || null,
          versionNumber: resolvedVersion,
          resultingStatus: resolvedStatus
        }
      });
    }

    // If approving a new version, SUPERSEDE older version approvals for same artifact+stage
    if (resolvedStatus === 'APPROVED' && resolvedVersion) {
      await prisma.approval.updateMany({
        where: {
          workspaceId: req.params.id,
          artifactType,
          stage: resolvedStage,
          versionNumber: { lt: resolvedVersion },
          status: 'APPROVED'
        },
        data: { status: 'SUPERSEDED' }
      });
    }

    // Synchronize underlying artifact status if approved
    if (resolvedStatus === 'APPROVED') {
      try {
        if (artifactType === 'ANALYSIS') {
          const a = await prisma.businessAnalysis.findFirst({ where: { workspaceId: req.params.id }, orderBy: { createdAt: 'desc' } });
          if (a) await prisma.businessAnalysis.update({ where: { id: a.id }, data: { status: 'APPROVED' } });
        } else if (artifactType === 'SOLUTION') {
          const s = await prisma.solution.findFirst({ where: { workspaceId: req.params.id }, orderBy: { createdAt: 'desc' } });
          if (s) await prisma.solution.update({ where: { id: s.id }, data: { status: 'APPROVED' } });
        } else if (artifactType === 'ARCHITECTURE') {
          const arch = await prisma.architecture.findFirst({ where: { workspaceId: req.params.id }, orderBy: { createdAt: 'desc' } });
          if (arch) await prisma.architecture.update({ where: { id: arch.id }, data: { status: 'APPROVED' } });
        } else if (artifactType === 'PROCESS') {
          const p = await prisma.processModel.findFirst({ where: { workspaceId: req.params.id }, orderBy: { createdAt: 'desc' } });
          if (p) await prisma.processModel.update({ where: { id: p.id }, data: { status: 'APPROVED' } });
        } else if (artifactType === 'UX') {
          const u = await prisma.uXDesign.findFirst({ where: { workspaceId: req.params.id }, orderBy: { createdAt: 'desc' } });
          if (u) await prisma.uXDesign.update({ where: { id: u.id }, data: { status: 'APPROVED' } });
        } else if (artifactType === 'DATABASE') {
          const d = await prisma.databaseDesign.findFirst({ where: { workspaceId: req.params.id }, orderBy: { createdAt: 'desc' } });
          if (d) await prisma.databaseDesign.update({ where: { id: d.id }, data: { status: 'APPROVED' } });
        } else if (artifactType === 'API') {
          const ap = await prisma.apiDesign.findFirst({ where: { workspaceId: req.params.id }, orderBy: { createdAt: 'desc' } });
          if (ap) await prisma.apiDesign.update({ where: { id: ap.id }, data: { status: 'APPROVED' } });
        } else if (artifactType === 'PLANNING') {
          const pl = await prisma.implementationPlan.findFirst({ where: { workspaceId: req.params.id }, orderBy: { createdAt: 'desc' } });
          if (pl) await prisma.implementationPlan.update({ where: { id: pl.id }, data: { status: 'APPROVED' } });
        }
      } catch (syncErr) {
        console.warn('Artifact status sync warning:', syncErr.message);
      }
    }

    res.status(existing ? 200 : 201).json({ approval, updated: !!existing });
  } catch (error) {
    handleRouteError(res, error, 'Failed to record approval.');
  }
});

export default router;

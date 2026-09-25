import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import {
  assertWorkspaceAccess,
  assertWorkspaceWriteAccess,
  handleRouteError
} from '../services/authorization.service.js';

const router = Router();

// Get version history for workspace / artifactType (tenant-scoped)
router.get('/:id/versions', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const { artifactType } = req.query;
    const versions = await prisma.artifactVersion.findMany({
      where: {
        workspaceId: req.params.id,
        ...(artifactType && { artifactType })
      },
      select: {
        id: true,
        workspaceId: true,
        artifactType: true,
        versionNumber: true,
        notes: true,
        createdById: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ versions });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve version history.');
  }
});

// Explicitly save a new version snapshot (tenant-scoped + write permission)
router.post('/:id/versions', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { artifactType, snapshotData, notes } = req.body;

    if (!artifactType || !snapshotData) {
      return res.status(400).json({ error: 'artifactType and snapshotData are required.' });
    }

    const latest = await prisma.artifactVersion.findFirst({
      where: { workspaceId: req.params.id, artifactType },
      orderBy: { versionNumber: 'desc' }
    });

    const nextVersion = latest ? latest.versionNumber + 1 : 1;

    const version = await prisma.artifactVersion.create({
      data: {
        workspaceId: req.params.id,
        artifactType,
        versionNumber: nextVersion,
        snapshotData: typeof snapshotData === 'string' ? snapshotData : JSON.stringify(snapshotData),
        notes: notes || `Manual snapshot v${nextVersion}`,
        createdById: req.user.id
      },
      include: { createdBy: { select: { id: true, name: true } } }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'VERSION_CREATED',
        details: `Saved version ${nextVersion} of ${artifactType}`,
        artifactType,
        versionNumber: nextVersion,
        resultingStatus: 'CREATED'
      }
    });

    res.status(201).json({ version });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create version snapshot.');
  }
});

// ─── SAFE RESTORE ──────────────────────────────────────────────────────────
// Creates a NEW version based on the source version's snapshot data.
// NEVER overwrites or deletes the current version.
// V4 remains, V5 remains, V6 = "Restored from V4"
router.post('/:id/versions/:versionId/restore', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const sourceVersion = await prisma.artifactVersion.findUnique({
      where: { id: req.params.versionId }
    });

    if (!sourceVersion || sourceVersion.workspaceId !== req.params.id) {
      return res.status(404).json({ error: 'Version not found.' });
    }

    // Find the latest version number for this artifact type
    const latest = await prisma.artifactVersion.findFirst({
      where: { workspaceId: req.params.id, artifactType: sourceVersion.artifactType },
      orderBy: { versionNumber: 'desc' }
    });

    const newVersionNumber = latest ? latest.versionNumber + 1 : 1;
    const parsedData = JSON.parse(sourceVersion.snapshotData);

    // 1. Create the new version record (safe — no data lost)
    const newVersion = await prisma.artifactVersion.create({
      data: {
        workspaceId: req.params.id,
        artifactType: sourceVersion.artifactType,
        versionNumber: newVersionNumber,
        snapshotData: sourceVersion.snapshotData,
        notes: `Restored from V${sourceVersion.versionNumber}`,
        createdById: req.user.id
      },
      include: { createdBy: { select: { id: true, name: true } } }
    });

    // 2. Apply the snapshot data to the current artifact (same restoration logic)
    if (sourceVersion.artifactType === 'ANALYSIS') {
      await prisma.businessAnalysis.updateMany({
        where: { workspaceId: req.params.id },
        data: {
          currentState: parsedData.currentState,
          futureState: parsedData.futureState,
          goals: typeof parsedData.goals === 'string' ? parsedData.goals : JSON.stringify(parsedData.goals || []),
          painPoints: typeof parsedData.painPoints === 'string' ? parsedData.painPoints : JSON.stringify(parsedData.painPoints || []),
          requirements: typeof parsedData.requirements === 'string' ? parsedData.requirements : JSON.stringify(parsedData.requirements || []),
          status: 'DRAFT',
          version: newVersionNumber
        }
      });
    } else if (sourceVersion.artifactType === 'SOLUTION') {
      await prisma.solution.updateMany({
        where: { workspaceId: req.params.id },
        data: {
          name: parsedData.name,
          summary: parsedData.summary,
          selectedOption: parsedData.selectedOption,
          version: newVersionNumber
        }
      });
    } else if (sourceVersion.artifactType === 'ARCHITECTURE') {
      await prisma.architecture.updateMany({
        where: { workspaceId: req.params.id },
        data: {
          highLevelDesign: parsedData.highLevelDesign,
          lowLevelDesign: parsedData.lowLevelDesign,
          securityArch: parsedData.securityArch,
          integrationArch: parsedData.integrationArch,
          version: newVersionNumber
        }
      });
    } else if (sourceVersion.artifactType === 'PROCESS') {
      await prisma.processModel.updateMany({
        where: { workspaceId: req.params.id },
        data: {
          title: parsedData.title,
          description: parsedData.description,
          version: newVersionNumber
        }
      });
    } else if (sourceVersion.artifactType === 'UX') {
      await prisma.uXDesign.updateMany({
        where: { workspaceId: req.params.id },
        data: {
          title: parsedData.title,
          screens: typeof parsedData.screens === 'string' ? parsedData.screens : JSON.stringify(parsedData.screens || []),
          designTokens: typeof parsedData.designTokens === 'string' ? parsedData.designTokens : JSON.stringify(parsedData.designTokens || {}),
          version: newVersionNumber
        }
      });
    } else if (sourceVersion.artifactType === 'DATABASE') {
      await prisma.databaseDesign.updateMany({
        where: { workspaceId: req.params.id },
        data: {
          entities: typeof parsedData.entities === 'string' ? parsedData.entities : JSON.stringify(parsedData.entities || []),
          relations: typeof parsedData.relations === 'string' ? parsedData.relations : JSON.stringify(parsedData.relations || []),
          sqlSchema: parsedData.sqlSchema,
          prismaSchema: parsedData.prismaSchema,
          version: newVersionNumber
        }
      });
    } else if (sourceVersion.artifactType === 'PLANNING') {
      await prisma.implementationPlan.updateMany({
        where: { workspaceId: req.params.id },
        data: {
          title: parsedData.title,
          phases: typeof parsedData.phases === 'string' ? parsedData.phases : JSON.stringify(parsedData.phases || []),
          estimatedDurationWeeks: parsedData.estimatedDurationWeeks,
          estimatedCost: parsedData.estimatedCost,
          methodology: parsedData.methodology,
          version: newVersionNumber
        }
      });
    }

    // 3. Create audit event: VERSION_RESTORED
    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'VERSION_RESTORED',
        details: `Restored ${sourceVersion.artifactType} from V${sourceVersion.versionNumber} → created V${newVersionNumber}`,
        artifactType: sourceVersion.artifactType,
        versionNumber: newVersionNumber,
        resultingStatus: 'RESTORED',
        beforeState: `V${sourceVersion.versionNumber}`,
        afterState: `V${newVersionNumber}`
      }
    });

    res.json({
      success: true,
      message: `Created V${newVersionNumber} of ${sourceVersion.artifactType} (restored from V${sourceVersion.versionNumber})`,
      sourceVersion: sourceVersion.versionNumber,
      newVersion: newVersionNumber,
      version: newVersion
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to restore version.');
  }
});

export default router;

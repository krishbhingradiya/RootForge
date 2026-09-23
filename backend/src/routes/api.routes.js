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

// Get API design (tenant-scoped)
router.get('/:id/api', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const apiDesign = await prisma.apiDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ apiDesign });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve API design.');
  }
});

// Generate API blueprints (tenant-scoped + write permission)
router.post('/:id/api', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const context = await getWorkspaceContext(req.params.id, req.user);
    const workspace = context.workspace;
    const generated = await aiService.generateAPIs(context, context.solution);

    const existing = await prisma.apiDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' }
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    const apiDesign = await prisma.apiDesign.create({
      data: {
        workspaceId: workspace.id,
        title: generated.title,
        baseUrl: generated.baseUrl || '/api/v1',
        authType: generated.authType || 'Bearer JWT',
        endpoints: JSON.stringify(generated.endpoints),
        version: nextVersion,
        status: 'DRAFT'
      }
    });

    if (generated._meta?.tokensUsed && generated._meta.tokensUsed > 0) {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          aiTokensUsed: { increment: generated._meta.tokensUsed }
        }
      });
    }

    const promptVer = generated._meta?.promptVersion ? ` (prompt: ${generated._meta.promptVersion})` : '';

    await prisma.artifactVersion.create({
      data: {
        workspaceId: workspace.id,
        artifactType: 'API',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(apiDesign),
        notes: `Generated REST API Specifications v${nextVersion}${promptVer}`,
        createdById: req.user.id
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'GENERATED',
        details: `Generated REST API Blueprints v${nextVersion}${promptVer}`
      }
    });

    res.status(201).json({ apiDesign, _meta: generated._meta });
  } catch (error) {
    handleRouteError(res, error, 'Failed to generate API specifications.');
  }
});

// Update API endpoints (tenant-scoped + write permission)
router.patch('/:id/api', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { endpoints, baseUrl, authType, title, status } = req.body;
    const current = await prisma.apiDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) return res.status(404).json({ error: 'API design not found.' });

    const updated = await prisma.apiDesign.update({
      where: { id: current.id },
      data: {
        ...(title && { title }),
        ...(baseUrl && { baseUrl }),
        ...(authType && { authType }),
        ...(endpoints && { endpoints: typeof endpoints === 'string' ? endpoints : JSON.stringify(endpoints) }),
        ...(status && { status })
      }
    });

    res.json({ apiDesign: updated });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update API design.');
  }
});

export default router;

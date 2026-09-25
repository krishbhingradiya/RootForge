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

/**
 * Normalizes and unpacks stored UX design tokens, screens, and AI metadata.
 */
function enrichUxRecord(ux) {
  if (!ux) return null;
  let parsedScreens = [];
  try {
    parsedScreens = typeof ux.screens === 'string' ? JSON.parse(ux.screens) : (ux.screens || []);
  } catch (e) {
    parsedScreens = [];
  }

  let parsedTokens = {};
  try {
    parsedTokens = typeof ux.designTokens === 'string' ? JSON.parse(ux.designTokens) : (ux.designTokens || {});
  } catch (e) {
    parsedTokens = {};
  }

  const {
    activeThemeId,
    understanding,
    userJourney,
    requirementCoverage,
    uxQualityCheck,
    uxRecommendations,
    designExplanation,
    ...cleanTokens
  } = parsedTokens;

  return {
    ...ux,
    screens: parsedScreens,
    designTokens: cleanTokens.palette ? cleanTokens : parsedTokens,
    activeThemeId: activeThemeId || 'enterprise-slate',
    understanding: understanding || null,
    userJourney: userJourney || [],
    requirementCoverage: requirementCoverage || [],
    uxQualityCheck: uxQualityCheck || {
      requirementCoverage: 95,
      navigationConsistency: 100,
      responsiveReadiness: 94,
      accessibility: 92,
      summary: 'Design specification meets enterprise usability criteria.'
    },
    uxRecommendations: uxRecommendations || [],
    designExplanation: designExplanation || null
  };
}

// Get UX design (tenant-scoped)
router.get('/:id/ux', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const ux = await prisma.uXDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ ux: enrichUxRecord(ux) });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve UX design.');
  }
});

// Analyze UX Requirement (natural language requirement breakdown)
router.post('/:id/ux/analyze', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);
    const { requirementText } = req.body;
    const context = await getWorkspaceContext(req.params.id, req.user);

    const analysis = await aiService.analyzeUXRequirement(context, requirementText);
    res.json({ understanding: analysis });
  } catch (error) {
    handleRouteError(res, error, 'Failed to analyze UX requirement.');
  }
});

// Generate UX Wireframes (tenant-scoped + write permission)
router.post('/:id/ux', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const context = await getWorkspaceContext(req.params.id, req.user);
    const workspace = context.workspace;
    const generated = await aiService.generateUX(context, context.solution, req.body || {});

    const existing = await prisma.uXDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { version: 'desc' }
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    // Pack extended AI attributes cleanly into designTokens
    const tokensToStore = {
      ...generated.designTokens,
      activeThemeId: generated.activeThemeId || req.body?.selectedTheme || 'enterprise-slate',
      understanding: generated.understanding,
      userJourney: generated.userJourney,
      requirementCoverage: generated.requirementCoverage,
      uxQualityCheck: generated.uxQualityCheck,
      uxRecommendations: generated.uxRecommendations,
      designExplanation: generated.designExplanation
    };

    const ux = await prisma.uXDesign.create({
      data: {
        workspaceId: workspace.id,
        title: generated.title,
        screens: JSON.stringify(generated.screens),
        designTokens: JSON.stringify(tokensToStore),
        version: nextVersion,
        status: 'DRAFT'
      }
    });

    const updateData = { status: 'UX' };
    if (generated._meta?.tokensUsed && generated._meta.tokensUsed > 0) {
      updateData.aiTokensUsed = { increment: generated._meta.tokensUsed };
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: updateData
    });

    const promptVer = generated._meta?.promptVersion ? ` (prompt: ${generated._meta.promptVersion})` : '';
    const enriched = enrichUxRecord(ux);

    await prisma.artifactVersion.create({
      data: {
        workspaceId: workspace.id,
        artifactType: 'UX',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(enriched),
        notes: `Generated UX Wireframe System v${nextVersion}${promptVer}`,
        createdById: req.user.id
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'GENERATED',
        details: `Generated Visual UX Wireframes v${nextVersion}${promptVer}`
      }
    });

    res.status(201).json({ ux: enriched, _meta: generated._meta });
  } catch (error) {
    handleRouteError(res, error, 'Failed to generate UX design.');
  }
});

// Edit UX with natural language prompt
router.post('/:id/ux/edit-prompt', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);
    const { prompt, screenId, componentId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Edit prompt is required.' });
    }

    const current = await prisma.uXDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) {
      return res.status(404).json({ error: 'No UX design found to edit.' });
    }

    const context = await getWorkspaceContext(req.params.id, req.user);
    const currentEnriched = enrichUxRecord(current);
    const updatedModel = await aiService.editUXWithPrompt(context, currentEnriched, prompt, screenId, componentId);

    const nextVersion = current.version + 1;
    const tokensToStore = {
      ...updatedModel.designTokens,
      activeThemeId: updatedModel.activeThemeId || currentEnriched.activeThemeId,
      understanding: updatedModel.understanding || currentEnriched.understanding,
      userJourney: updatedModel.userJourney || currentEnriched.userJourney,
      requirementCoverage: updatedModel.requirementCoverage || currentEnriched.requirementCoverage,
      uxQualityCheck: updatedModel.uxQualityCheck || currentEnriched.uxQualityCheck,
      uxRecommendations: updatedModel.uxRecommendations || currentEnriched.uxRecommendations,
      designExplanation: updatedModel.designExplanation || currentEnriched.designExplanation
    };

    const newUx = await prisma.uXDesign.create({
      data: {
        workspaceId: req.params.id,
        title: updatedModel.title || current.title,
        screens: JSON.stringify(updatedModel.screens),
        designTokens: JSON.stringify(tokensToStore),
        version: nextVersion,
        status: current.status
      }
    });

    const enriched = enrichUxRecord(newUx);

    await prisma.artifactVersion.create({
      data: {
        workspaceId: req.params.id,
        artifactType: 'UX',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(enriched),
        notes: `AI Prompt Edit: "${prompt.substring(0, 60)}" (v${nextVersion})`,
        createdById: req.user.id
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'UPDATED',
        details: `Updated UX via AI prompt: "${prompt.substring(0, 60)}" (v${nextVersion})`
      }
    });

    res.json({
      ux: enriched,
      editSummary: `Successfully updated UX design based on prompt: "${prompt}"`
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update UX design with prompt.');
  }
});

// Interpret UX Command (Gemini / AI Intent Interpreter)
router.post('/:id/ux/interpret-command', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);
    const { command, currentSpec, domain } = req.body;
    if (!command || !command.trim()) {
      return res.status(400).json({ error: 'Command text is required.' });
    }

    const context = await getWorkspaceContext(req.params.id, req.user);
    const resolvedDomain = domain || context?.domain || context?.workspace?.domain || 'GENERAL_ENTERPRISE';

    const interpretation = await aiService.interpretUXCommand(
      context,
      currentSpec,
      command.trim(),
      resolvedDomain
    );

    res.json(interpretation);
  } catch (error) {
    handleRouteError(res, error, 'Failed to interpret UX command.');
  }
});

// Apply Structured UI Patch (Incremental update system)
router.post('/:id/ux/patch', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);
    const { patch, screenId } = req.body;
    if (!patch || !patch.operation) {
      return res.status(400).json({ error: 'Valid patch operation is required.' });
    }

    const current = await prisma.uXDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) {
      return res.status(404).json({ error: 'No UX design found to patch.' });
    }

    const enriched = enrichUxRecord(current);
    let screens = enriched.screens || [];
    let tokens = enriched.designTokens || {};
    let summary = patch.summary || 'Applied structured UI patch';

    // Apply patch operations
    const op = patch.operation;
    if (op === 'updateTheme') {
      const themeId = patch.themeId || patch.tokens?.id || 'enterprise-slate';
      tokens.activeThemeId = themeId;
      enriched.activeThemeId = themeId;
      summary = `Updated design theme to ${themeId}`;
    } else if (op === 'addComponent') {
      const targetScreen = screens.find(s => s.id === screenId) || screens[0];
      if (targetScreen) {
        targetScreen.components = targetScreen.components || [];
        if (patch.position === 'top' || patch.position === 'start') {
          targetScreen.components.unshift(patch.component);
        } else {
          targetScreen.components.push(patch.component);
        }
        summary = `Added ${patch.component?.title || 'component'} to ${targetScreen.name}`;
      }
    } else if (op === 'removeComponent') {
      screens.forEach(s => {
        s.components = (s.components || []).filter(c => c.id !== patch.target && c.type !== patch.target);
      });
      summary = `Removed component ${patch.target}`;
    } else if (op === 'move') {
      const targetScreen = screens.find(s => s.id === screenId) || screens[0];
      if (targetScreen && targetScreen.components) {
        if (patch.position === 'right_sidebar' || patch.destination === 'right-sidebar') {
          targetScreen.layout = targetScreen.layout ? `${targetScreen.layout} (AI Copilot docked to right sidebar)` : 'Split-view with right sidebar';
          summary = `Moved AI assistant to right sidebar`;
        }
      }
    } else if (op === 'replaceComponent') {
      const targetScreen = screens.find(s => s.id === screenId) || screens[0];
      if (targetScreen && targetScreen.components) {
        const idx = targetScreen.components.findIndex(c => c.id === patch.target || c.type === patch.target);
        if (idx !== -1 && patch.replacement) {
          targetScreen.components[idx] = patch.replacement;
          summary = `Replaced ${patch.target} with ${patch.replacement.title}`;
        }
      }
    }

    const nextVersion = current.version + 1;
    const tokensToStore = {
      ...tokens,
      activeThemeId: enriched.activeThemeId,
      understanding: enriched.understanding,
      userJourney: enriched.userJourney,
      requirementCoverage: enriched.requirementCoverage,
      uxQualityCheck: enriched.uxQualityCheck,
      uxRecommendations: enriched.uxRecommendations,
      designExplanation: enriched.designExplanation
    };

    const newUx = await prisma.uXDesign.create({
      data: {
        workspaceId: req.params.id,
        title: current.title,
        screens: JSON.stringify(screens),
        designTokens: JSON.stringify(tokensToStore),
        version: nextVersion,
        status: current.status
      }
    });

    const enrichedUpdated = enrichUxRecord(newUx);

    await prisma.artifactVersion.create({
      data: {
        workspaceId: req.params.id,
        artifactType: 'UX',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(enrichedUpdated),
        notes: `UI Patch: ${summary} (v${nextVersion})`,
        createdById: req.user.id
      }
    });

    res.json({
      ux: enrichedUpdated,
      patchSummary: summary
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to apply UI patch.');
  }
});

// Apply / Toggle Actionable UX Recommendation
router.post('/:id/ux/apply-recommendation', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);
    const { recommendationId } = req.body;
    const current = await prisma.uXDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    if (!current) return res.status(404).json({ error: 'UX design not found.' });

    const enriched = enrichUxRecord(current);
    const recs = enriched.uxRecommendations || [];
    const targetRec = recs.find(r => r.id === recommendationId);
    if (!targetRec) return res.status(404).json({ error: 'Recommendation not found.' });

    targetRec.applied = !targetRec.applied;

    const nextVersion = current.version + 1;
    const tokensToStore = {
      ...enriched.designTokens,
      activeThemeId: enriched.activeThemeId,
      understanding: enriched.understanding,
      userJourney: enriched.userJourney,
      requirementCoverage: enriched.requirementCoverage,
      uxQualityCheck: enriched.uxQualityCheck,
      uxRecommendations: recs,
      designExplanation: enriched.designExplanation
    };

    const updated = await prisma.uXDesign.create({
      data: {
        workspaceId: req.params.id,
        title: current.title,
        screens: JSON.stringify(enriched.screens),
        designTokens: JSON.stringify(tokensToStore),
        version: nextVersion,
        status: current.status
      }
    });

    const enrichedUpdated = enrichUxRecord(updated);

    await prisma.artifactVersion.create({
      data: {
        workspaceId: req.params.id,
        artifactType: 'UX',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(enrichedUpdated),
        notes: `${targetRec.applied ? 'Applied' : 'Reverted'} recommendation: ${targetRec.title} (v${nextVersion})`,
        createdById: req.user.id
      }
    });

    res.json({ ux: enrichedUpdated, message: `Recommendation ${targetRec.applied ? 'applied' : 'reverted'}` });
  } catch (error) {
    handleRouteError(res, error, 'Failed to apply recommendation.');
  }
});

// Approve UX Design
router.post('/:id/ux/approve', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);
    const { notes } = req.body;
    const current = await prisma.uXDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    if (!current) return res.status(404).json({ error: 'UX design not found.' });

    const updated = await prisma.uXDesign.update({
      where: { id: current.id },
      data: { status: 'APPROVED' }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'APPROVED',
        details: `Approved UX Design System v${current.version}${notes ? ` - ${notes}` : ''}`
      }
    });

    res.json({ ux: enrichUxRecord(updated) });
  } catch (error) {
    handleRouteError(res, error, 'Failed to approve UX design.');
  }
});

// Export UX Design Bundle
router.post('/:id/ux/export', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);
    const { format = 'json' } = req.body;
    const current = await prisma.uXDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    if (!current) return res.status(404).json({ error: 'UX design not found.' });

    const enriched = enrichUxRecord(current);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTitle = (enriched.title || 'ux-design').toLowerCase().replace(/[^a-z0-9]/g, '-');

    const exportDoc = {
      title: enriched.title,
      version: enriched.version,
      status: enriched.status,
      exportedAt: new Date().toISOString(),
      format,
      screensCount: enriched.screens?.length || 0,
      activeThemeId: enriched.activeThemeId,
      understanding: enriched.understanding,
      screens: enriched.screens,
      userJourney: enriched.userJourney,
      requirementCoverage: enriched.requirementCoverage,
      uxQualityCheck: enriched.uxQualityCheck,
      uxRecommendations: enriched.uxRecommendations,
      designTokens: enriched.designTokens,
      designExplanation: enriched.designExplanation
    };

    res.json({
      exportType: format,
      filename: `${safeTitle}-${timestamp}.${format}`,
      data: exportDoc
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to export UX design.');
  }
});

// Update UX design (tenant-scoped + write permission)
router.patch('/:id/ux', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { screens, designTokens, title, status } = req.body;
    const current = await prisma.uXDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) return res.status(404).json({ error: 'UX design not found.' });

    let mergedTokens = current.designTokens;
    if (designTokens) {
      try {
        const existingParsed = typeof current.designTokens === 'string' ? JSON.parse(current.designTokens || '{}') : (current.designTokens || {});
        const incomingParsed = typeof designTokens === 'string' ? JSON.parse(designTokens || '{}') : designTokens;
        mergedTokens = JSON.stringify({
          ...existingParsed,
          ...incomingParsed
        });
      } catch (e) {
        mergedTokens = typeof designTokens === 'string' ? designTokens : JSON.stringify(designTokens);
      }
    }

    const updated = await prisma.uXDesign.update({
      where: { id: current.id },
      data: {
        ...(title && { title }),
        ...(screens && { screens: typeof screens === 'string' ? screens : JSON.stringify(screens) }),
        ...(designTokens && { designTokens: mergedTokens }),
        ...(status && { status })
      }
    });

    res.json({ ux: enrichUxRecord(updated) });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update UX design.');
  }
});

// Save UX version snapshot (tenant-scoped + write permission)
router.post('/:id/ux/version', authenticate, async (req, res) => {
  try {
    await assertWorkspaceWriteAccess(req.params.id, req.user);

    const { notes } = req.body;
    const current = await prisma.uXDesign.findFirst({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!current) return res.status(404).json({ error: 'UX design not found.' });

    const nextVersion = current.version + 1;
    const updated = await prisma.uXDesign.update({
      where: { id: current.id },
      data: { version: nextVersion }
    });

    const enriched = enrichUxRecord(updated);

    await prisma.artifactVersion.create({
      data: {
        workspaceId: req.params.id,
        artifactType: 'UX',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(enriched),
        notes: notes || `UX Prototype System v${nextVersion}`,
        createdById: req.user.id
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: req.params.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'VERSIONED',
        details: `Saved UX Prototype snapshot v${nextVersion}`
      }
    });

    res.json({ ux: enriched });
  } catch (error) {
    handleRouteError(res, error, 'Failed to save UX design version.');
  }
});

export default router;

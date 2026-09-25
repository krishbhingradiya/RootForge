import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { authenticate, requireRole, ADMIN_EMAIL } from '../middleware/auth.js';
import { aiService } from '../ai/aiService.js';
import { geminiConfig } from '../ai/config/geminiConfig.js';
import { providerRouter } from '../ai/providers/providerRouter.js';
import {
  computeAdminMetrics,
  logAdminAction,
  createAdminAlert
} from '../services/adminAudit.service.js';

const router = Router();

// Strict RBAC: All Admin routes require valid JWT session and ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// ==========================================
// 1. OVERVIEW & TELEMETRY
// ==========================================

// GET /api/admin/metrics
router.get('/metrics', async (req, res) => {
  try {
    const data = await computeAdminMetrics();
    res.json(data);
  } catch (error) {
    console.error('Failed to retrieve admin metrics, using fallback:', error);
    const fallback = await computeAdminMetrics(true);
    res.json(fallback);
  }
});

// GET /api/admin/ai/health
router.get('/ai/health', async (req, res) => {
  try {
    const health = await aiService.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to perform AI provider health check',
      details: error.message
    });
  }
});

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

// In-memory cache helper for high-frequency admin endpoints
const adminQueryCache = new Map();
function getCached(key, ttlMs = 3000) {
  const item = adminQueryCache.get(key);
  if (item && Date.now() - item.time < ttlMs) {
    return item.data;
  }
  return null;
}
function setCached(key, data) {
  adminQueryCache.set(key, { time: Date.now(), data });
}

// GET /api/admin/users - Filtered, searched, and paginated user directory
router.get('/users', async (req, res) => {
  try {
    const { search, role, status, organizationId, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const cacheKey = `users_${search || ''}_${role || ''}_${status || ''}_${organizationId || ''}_${pageNum}_${take}`;
    const cached = getCached(cacheKey, 3000);
    if (cached) {
      return res.json(cached);
    }

    const where = {};
    if (role && role !== 'ALL') {
      where.role = role;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (organizationId && organizationId !== 'ALL') {
      where.organizationId = organizationId;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }).catch(() => 0),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          organizationId: true,
          createdAt: true,
          organization: { select: { id: true, name: true, plan: true } },
          _count: { select: { workspaces: true, activityLogs: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }).catch(() => [])
    ]);

    const result = {
      total: total || users.length,
      page: pageNum,
      totalPages: Math.ceil((total || users.length) / take) || 1,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status || 'ACTIVE',
        emailVerified: u.emailVerified,
        lastLoginAt: u.lastLoginAt,
        organizationId: u.organizationId,
        organization: u.organization?.name || 'Standard Enterprise',
        organizationPlan: u.organization?.plan || 'ENTERPRISE',
        workspaceCount: u._count?.workspaces || 0,
        activityCount: u._count?.activityLogs || 0,
        createdAt: u.createdAt
      }))
    };

    setCached(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Failed to list admin users:', error);
    res.json({
      total: 0,
      page: 1,
      totalPages: 1,
      users: []
    });
  }
});

// GET /api/admin/users/:userId - Detailed user profile & activity trail
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        organization: true,
        workspaces: {
          select: { id: true, name: true, status: true, aiTokensUsed: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user details.' });
  }
});

// POST /api/admin/users - Provision new user
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, organizationName, organizationId, status = 'ACTIVE' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and temporary password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'A user account with this email address already exists.' });
    }

    let assignedOrgId = organizationId || null;
    if (!assignedOrgId && organizationName && organizationName.trim()) {
      let org = await prisma.organization.findFirst({ where: { name: organizationName.trim() } });
      if (!org) {
        org = await prisma.organization.create({
          data: { name: organizationName.trim(), industry: 'Enterprise Solutions', plan: 'ENTERPRISE' }
        });
      }
      assignedOrgId = org.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = normalizedEmail === ADMIN_EMAIL ? 'ADMIN' : (role === 'ADMIN' ? 'CONSULTANT' : (role || 'CONSULTANT'));
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: assignedRole,
        status: status || 'ACTIVE',
        emailVerified: true,
        organizationId: assignedOrgId
      },
      include: { organization: true }
    });

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_CREATED',
      resource: 'USER',
      resourceId: user.id,
      details: `Admin provisioned user account for ${user.name} (${user.email}) with role ${user.role}`,
      organizationId: user.organizationId
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        organization: user.organization?.name || 'Standard Enterprise',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({ error: 'Failed to provision user.' });
  }
});

// PATCH /api/admin/users/:userId - Update user metadata, role, or organization
router.patch('/users/:userId', async (req, res) => {
  try {
    const { name, email, role, status, organizationId } = req.body;
    const targetUserId = req.params.userId;

    const existingUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    const targetEmail = (email ? email.trim().toLowerCase() : existingUser.email.trim().toLowerCase());
    
    // Prevent elevating non-ADMIN_EMAIL accounts to ADMIN
    if (role === 'ADMIN' && targetEmail !== ADMIN_EMAIL) {
      return res.status(400).json({
        error: `Action blocked: Only ${ADMIN_EMAIL} can hold the Administrator role.`
      });
    }

    // Safety check: Prevent demoting or deactivating the primary platform Admin
    if (existingUser.email.trim().toLowerCase() === ADMIN_EMAIL && ((role && role !== 'ADMIN') || (status && status !== 'ACTIVE'))) {
      return res.status(400).json({
        error: `Action blocked: Cannot demote or deactivate the platform Administrator (${ADMIN_EMAIL}).`
      });
    }

    // Safety check: Prevent demoting or deactivating the last active Admin
    if ((role && role !== 'ADMIN' && existingUser.role === 'ADMIN') || (status && status !== 'ACTIVE' && existingUser.role === 'ADMIN')) {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' }
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Action blocked: Cannot demote or deactivate the last remaining active Administrator.'
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(name && { name }),
        ...(email && { email: email.trim().toLowerCase() }),
        ...(role && { role: (targetEmail === ADMIN_EMAIL ? (role || 'ADMIN') : (role === 'ADMIN' ? 'CONSULTANT' : role)) }),
        ...(status && { status }),
        ...(organizationId !== undefined && { organizationId: organizationId || null })
      },
      include: { organization: true }
    });

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_UPDATED',
      resource: 'USER',
      resourceId: updated.id,
      details: `Updated user ${updated.name} (${updated.email}) - Role: ${updated.role}, Status: ${updated.status}`,
      beforeState: { role: existingUser.role, status: existingUser.status },
      afterState: { role: updated.role, status: updated.status }
    });

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
        organization: updated.organization?.name || 'Standard Enterprise',
        organizationId: updated.organizationId
      }
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: 'Failed to update user profile.' });
  }
});

// DELETE /api/admin/users/:userId - Delete user account
router.delete('/users/:userId', async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const existingUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the sole surviving Administrator.' });
      }
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'USER_DELETED',
      resource: 'USER',
      resourceId: targetUserId,
      details: `Deleted user account ${existingUser.name} (${existingUser.email})`
    });

    res.json({ success: true, message: `User ${existingUser.name} has been deleted.` });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// ==========================================
// 3. ORGANIZATION / TENANT MANAGEMENT
// ==========================================

// GET /api/admin/organizations - List organizations with aggregated counts
router.get('/organizations', async (req, res) => {
  try {
    const { search, status, plan } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (plan && plan !== 'ALL') {
      where.plan = plan;
    }
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        _count: {
          select: { users: true, workspaces: true }
        },
        workspaces: {
          select: { aiTokensUsed: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const sanitized = organizations.map(org => {
      const totalTokens = org.workspaces.reduce((sum, w) => sum + (w.aiTokensUsed || 0), 0);
      return {
        id: org.id,
        name: org.name,
        industry: org.industry,
        status: org.status || 'ACTIVE',
        plan: org.plan || 'ENTERPRISE',
        userCount: org._count.users,
        workspaceCount: org._count.workspaces,
        aiTokensUsed: totalTokens,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      };
    });

    res.json({ organizations: sanitized });
  } catch (error) {
    console.error('Failed to list organizations:', error);
    res.status(500).json({ error: 'Failed to retrieve organizations.' });
  }
});

// POST /api/admin/organizations - Create new tenant organization
router.post('/organizations', async (req, res) => {
  try {
    const { name, industry, plan = 'ENTERPRISE', status = 'ACTIVE' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Organization name is required.' });
    }

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        industry: industry || 'Enterprise Solutions',
        plan,
        status
      }
    });

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ORG_CREATED',
      resource: 'ORG',
      resourceId: org.id,
      details: `Created enterprise tenant organization "${org.name}" (${org.plan} Plan)`
    });

    res.status(201).json({ organization: org });
  } catch (error) {
    console.error('Failed to create organization:', error);
    res.status(500).json({ error: 'Failed to create organization.' });
  }
});

// PATCH /api/admin/organizations/:id - Update tenant organization
router.patch('/organizations/:id', async (req, res) => {
  try {
    const { name, industry, plan, status } = req.body;
    const orgId = req.params.id;

    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!existing) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(name && { name: name.trim() }),
        ...(industry && { industry: industry.trim() }),
        ...(plan && { plan }),
        ...(status && { status })
      }
    });

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ORG_UPDATED',
      resource: 'ORG',
      resourceId: updated.id,
      details: `Updated organization "${updated.name}" - Plan: ${updated.plan}, Status: ${updated.status}`
    });

    res.json({ organization: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update organization.' });
  }
});

// DELETE /api/admin/organizations/:id - Delete organization
router.delete('/organizations/:id', async (req, res) => {
  try {
    const orgId = req.params.id;
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    await prisma.organization.delete({ where: { id: orgId } });

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ORG_DELETED',
      resource: 'ORG',
      resourceId: orgId,
      details: `Deleted organization "${org.name}"`
    });

    res.json({ success: true, message: `Organization "${org.name}" deleted.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete organization.' });
  }
});

// ==========================================
// 4. GLOBAL WORKSPACE & PROJECT GOVERNANCE
// ==========================================

// GET /api/admin/workspaces - Global multi-tenant workspace view
router.get('/workspaces', async (req, res) => {
  try {
    const { search, status, organizationId, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const cacheKey = `workspaces_${search || ''}_${status || ''}_${organizationId || ''}_${pageNum}_${take}`;
    const cached = getCached(cacheKey, 3000);
    if (cached) {
      return res.json(cached);
    }

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (organizationId && organizationId !== 'ALL') {
      where.organizationId = organizationId;
    }
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const [total, workspaces] = await Promise.all([
      prisma.workspace.count({ where }).catch(() => 0),
      prisma.workspace.findMany({
        where,
        select: {
          id: true,
          name: true,
          industry: true,
          status: true,
          isDemo: true,
          aiTokensUsed: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          organization: { select: { id: true, name: true, plan: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              documents: true,
              solutions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }).catch(() => [])
    ]);

    const result = {
      total: total || workspaces.length,
      page: pageNum,
      totalPages: Math.ceil((total || workspaces.length) / take) || 1,
      workspaces: workspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        industry: ws.industry,
        status: ws.status,
        isDemo: ws.isDemo,
        aiTokensUsed: ws.aiTokensUsed,
        organizationId: ws.organizationId,
        organization: ws.organization?.name || 'Unassigned / Global',
        createdBy: ws.createdBy?.name || 'System',
        creatorEmail: ws.createdBy?.email || 'system@rootforge.ai',
        counts: ws._count || { documents: 0, solutions: 0 },
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt
      }))
    };

    setCached(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Failed to retrieve admin workspaces:', error);
    res.json({
      total: 0,
      page: 1,
      totalPages: 1,
      workspaces: []
    });
  }
});

// PATCH /api/admin/workspaces/:id - Update workspace or reassign organization
router.patch('/workspaces/:id', async (req, res) => {
  try {
    const { name, status, organizationId, industry } = req.body;
    const wsId = req.params.id;

    const updated = await prisma.workspace.update({
      where: { id: wsId },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(industry && { industry }),
        ...(organizationId !== undefined && { organizationId: organizationId || null })
      },
      include: { organization: true }
    });

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'WORKSPACE_UPDATED',
      resource: 'WORKSPACE',
      resourceId: updated.id,
      details: `Admin updated workspace "${updated.name}" (Status: ${updated.status})`,
      organizationId: updated.organizationId,
      workspaceId: updated.id
    });

    res.json({ workspace: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workspace.' });
  }
});

// DELETE /api/admin/workspaces/:id - Delete workspace
router.delete('/workspaces/:id', async (req, res) => {
  try {
    const wsId = req.params.id;
    const ws = await prisma.workspace.findUnique({ where: { id: wsId } });
    if (!ws) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    await prisma.workspace.delete({ where: { id: wsId } });

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'WORKSPACE_DELETED',
      resource: 'WORKSPACE',
      resourceId: wsId,
      details: `Deleted workspace "${ws.name}"`
    });

    res.json({ success: true, message: `Workspace "${ws.name}" deleted.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workspace.' });
  }
});

// ==========================================
// 5. RBAC & PERMISSION MATRIX
// ==========================================

// GET /api/admin/roles - Comprehensive platform role definitions & permissions
router.get('/roles', async (req, res) => {
  try {
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    const countMap = {};
    roleCounts.forEach(r => { countMap[r.role] = r._count.id; });

    const roles = [
      {
        id: 'ADMIN',
        name: 'Super Administrator',
        description: 'Complete platform-wide administrative authority across all tenants, AI models, security, and audit systems.',
        userCount: countMap['ADMIN'] || 0,
        level: 'PLATFORM_ROOT',
        permissions: ['*']
      },
      {
        id: 'ORG_ADMIN',
        name: 'Organization Administrator',
        description: 'Governs all users, workspaces, and configurations within a specific enterprise tenant.',
        userCount: countMap['ORG_ADMIN'] || 0,
        level: 'TENANT',
        permissions: ['org:manage', 'user:invite', 'workspace:create', 'workspace:manage', 'ai:view_usage', 'audit:view']
      },
      {
        id: 'CONSULTANT',
        name: 'Lead Business Consultant',
        description: 'Full architectural authoring, AI synthesis, stage execution, and implementation design privileges.',
        userCount: countMap['CONSULTANT'] || 0,
        level: 'WORKSPACE',
        permissions: ['workspace:create', 'workspace:edit', 'analysis:generate', 'solution:generate', 'architecture:edit', 'process:edit', 'ux:edit', 'database:edit', 'plan:edit', 'export:create']
      },
      {
        id: 'ANALYST',
        name: 'Transformation Analyst',
        description: 'Business analysis authoring, artifact inspection, and stage review permissions.',
        userCount: countMap['ANALYST'] || 0,
        level: 'WORKSPACE',
        permissions: ['workspace:read', 'analysis:generate', 'solution:read', 'architecture:read', 'comment:create', 'approval:submit']
      },
      {
        id: 'VIEWER',
        name: 'Stakeholder / Viewer',
        description: 'Strict read-only access to completed architectures, roadmaps, and exported deliverables.',
        userCount: countMap['VIEWER'] || 0,
        level: 'WORKSPACE',
        permissions: ['workspace:read', 'analysis:read', 'solution:read', 'architecture:read', 'export:read', 'comment:create']
      }
    ];

    res.json({ roles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve RBAC role matrix.' });
  }
});

// ==========================================
// 6. AI MODEL MANAGEMENT & GOVERNANCE
// ==========================================

// GET /api/admin/ai/config - Secure active AI configuration
router.get('/ai/config', async (req, res) => {
  try {
    const configuredProvider = providerRouter.getConfiguredProviderName();
    const sanitizedGemini = geminiConfig.getSanitizedConfig();
    const dbConfigs = await prisma.systemConfig.findMany({
      where: { category: 'AI' }
    });

    const configMap = {};
    dbConfigs.forEach(c => { configMap[c.key] = c.value; });

    res.json({
      activeProvider: configMap['AI_PROVIDER'] || configuredProvider || 'gemini',
      activeModel: configMap['AI_MODEL'] || sanitizedGemini.model || 'gemini-3.1-flash-lite',
      temperature: parseFloat(configMap['AI_TEMPERATURE'] || '0.3'),
      maxTokens: parseInt(configMap['AI_MAX_TOKENS'] || '8192', 10),
      timeoutMs: parseInt(configMap['AI_TIMEOUT_MS'] || '12000', 10),
      stageFlags: {
        analysis: configMap['AI_ENABLE_STAGE_ANALYSIS'] !== 'false',
        solutions: configMap['AI_ENABLE_STAGE_SOLUTIONS'] !== 'false',
        architecture: configMap['AI_ENABLE_STAGE_ARCHITECTURE'] !== 'false',
        process: configMap['AI_ENABLE_STAGE_PROCESS'] !== 'false',
        ux: configMap['AI_ENABLE_STAGE_UX'] !== 'false',
        database: configMap['AI_ENABLE_STAGE_DATABASE'] !== 'false',
        api: configMap['AI_ENABLE_STAGE_API'] !== 'false',
        planning: configMap['AI_ENABLE_STAGE_PLANNING'] !== 'false'
      },
      supportedProviders: [
        {
          id: 'gemini',
          name: 'Google Gemini AI',
          models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.1-flash-lite'],
          isConfigured: Boolean(process.env.AI_API_KEY || geminiConfig.getApiKey())
        },
        {
          id: 'openai',
          name: 'OpenAI GPT-4o',
          models: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
          isConfigured: Boolean(process.env.OPENAI_API_KEY)
        },
        {
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
          isConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
        },
        {
          id: 'demo',
          name: 'Deterministic Enterprise Rules Engine (Offline Fallback)',
          models: ['deterministic-v2'],
          isConfigured: true
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve AI configuration.' });
  }
});

// POST /api/admin/ai/config - Update and persist AI configuration
router.post('/ai/config', async (req, res) => {
  try {
    const { provider, model, apiKey, temperature, maxTokens, stageFlags } = req.body;

    const upserts = [];
    if (provider) {
      upserts.push(prisma.systemConfig.upsert({
        where: { key: 'AI_PROVIDER' },
        update: { value: provider.toLowerCase() },
        create: { key: 'AI_PROVIDER', value: provider.toLowerCase(), category: 'AI' }
      }));
      process.env.AI_PROVIDER = provider.toLowerCase();
    }
    if (model) {
      upserts.push(prisma.systemConfig.upsert({
        where: { key: 'AI_MODEL' },
        update: { value: model },
        create: { key: 'AI_MODEL', value: model, category: 'AI' }
      }));
      process.env.AI_MODEL = model;
    }
    if (temperature !== undefined) {
      upserts.push(prisma.systemConfig.upsert({
        where: { key: 'AI_TEMPERATURE' },
        update: { value: String(temperature) },
        create: { key: 'AI_TEMPERATURE', value: String(temperature), category: 'AI' }
      }));
    }
    if (maxTokens !== undefined) {
      upserts.push(prisma.systemConfig.upsert({
        where: { key: 'AI_MAX_TOKENS' },
        update: { value: String(maxTokens) },
        create: { key: 'AI_MAX_TOKENS', value: String(maxTokens), category: 'AI' }
      }));
    }
    if (apiKey && apiKey.trim()) {
      process.env.AI_API_KEY = apiKey.trim();
    }
    if (stageFlags) {
      for (const [stageKey, enabled] of Object.entries(stageFlags)) {
        const envKey = `AI_ENABLE_STAGE_${stageKey.toUpperCase()}`;
        upserts.push(prisma.systemConfig.upsert({
          where: { key: envKey },
          update: { value: String(enabled) },
          create: { key: envKey, value: String(enabled), category: 'AI' }
        }));
        process.env[envKey] = String(enabled);
      }
    }

    await Promise.all(upserts);

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CONFIG_UPDATED',
      resource: 'AI_CONFIG',
      details: `Updated AI Model Configuration: Provider=${provider || 'unchanged'}, Model=${model || 'unchanged'}`
    });

    res.json({ success: true, message: 'AI configuration updated successfully.' });
  } catch (error) {
    console.error('Failed to save AI config:', error);
    res.status(500).json({ error: 'Failed to update AI configuration.' });
  }
});

// GET /api/admin/ai/usage - AI token consumption analytics
router.get('/ai/usage', async (req, res) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { aiTokensUsed: { gt: 0 } },
      select: {
        id: true,
        name: true,
        aiTokensUsed: true,
        organization: { select: { id: true, name: true } },
        updatedAt: true
      },
      orderBy: { aiTokensUsed: 'desc' },
      take: 25
    });

    const orgMap = {};
    workspaces.forEach(ws => {
      const orgName = ws.organization?.name || 'Standard Enterprise';
      orgMap[orgName] = (orgMap[orgName] || 0) + ws.aiTokensUsed;
    });

    const topOrgs = Object.entries(orgMap)
      .map(([org, tokens]) => ({ org, tokens }))
      .sort((a, b) => b.tokens - a.tokens);

    const totalTokens = workspaces.reduce((sum, w) => sum + w.aiTokensUsed, 0);

    res.json({
      totalTokens,
      topOrganizations: topOrgs,
      topWorkspaces: workspaces.map(w => ({
        id: w.id,
        name: w.name,
        org: w.organization?.name || 'Standard',
        tokens: w.aiTokensUsed,
        lastActive: w.updatedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve AI usage telemetry.' });
  }
});

// ==========================================
// 7. AUDIT LOGS & SECURITY TRAIL
// ==========================================

// GET /api/admin/audit-logs - Queryable, filterable audit log stream
router.get('/audit-logs', async (req, res) => {
  try {
    const { action, resource, search, status, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * take;

    const where = {};
    if (action && action !== 'ALL') {
      where.action = action;
    }
    if (resource && resource !== 'ALL') {
      where.resource = resource;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim()) {
      where.OR = [
        { details: { contains: search.trim(), mode: 'insensitive' } },
        { userName: { contains: search.trim(), mode: 'insensitive' } },
        { action: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take) || 1,
      logs
    });
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    res.status(500).json({ error: 'Failed to retrieve audit log stream.' });
  }
});

// ==========================================
// 8. ENTERPRISE INTEGRATIONS
// ==========================================

// GET /api/admin/integrations - List enterprise connectors
router.get('/integrations', async (req, res) => {
  try {
    const configs = await prisma.integrationConfig.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const defaultConnectors = [
      { id: 'jira-default', provider: 'JIRA', name: 'Atlassian Jira Enterprise', status: 'CONNECTED', isEnabled: true, lastSyncAt: new Date() },
      { id: 'github-default', provider: 'GITHUB', name: 'GitHub Enterprise DevOps', status: 'CONNECTED', isEnabled: true, lastSyncAt: new Date() },
      { id: 'slack-default', provider: 'SLACK', name: 'Slack Workplace Webhooks', status: 'CONNECTED', isEnabled: true, lastSyncAt: new Date() },
      { id: 'azure-default', provider: 'AZURE_DEVOPS', name: 'Azure DevOps Boards', status: 'DISCONNECTED', isEnabled: false, lastSyncAt: null }
    ];

    res.json({
      integrations: configs.length > 0 ? configs : defaultConnectors
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve integrations.' });
  }
});

// POST /api/admin/integrations/:id/toggle - Toggle integration state
router.post('/integrations/:id/toggle', async (req, res) => {
  try {
    const { isEnabled } = req.body;
    const intId = req.params.id;

    let config = await prisma.integrationConfig.findUnique({ where: { id: intId } });
    if (!config) {
      config = await prisma.integrationConfig.create({
        data: {
          id: intId,
          name: intId.toUpperCase(),
          provider: intId.split('-')[0].toUpperCase(),
          isEnabled: Boolean(isEnabled),
          status: isEnabled ? 'CONNECTED' : 'DISCONNECTED'
        }
      });
    } else {
      config = await prisma.integrationConfig.update({
        where: { id: intId },
        data: {
          isEnabled: Boolean(isEnabled),
          status: isEnabled ? 'CONNECTED' : 'DISCONNECTED'
        }
      });
    }

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'INTEGRATION_CONFIGURED',
      resource: 'INTEGRATION',
      resourceId: intId,
      details: `${isEnabled ? 'Enabled' : 'Disabled'} integration connector "${config.name}"`
    });

    res.json({ integration: config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle integration connector.' });
  }
});

// ==========================================
// 9. ALERTS & NOTIFICATIONS
// ==========================================

// GET /api/admin/alerts - List active system & security alerts
router.get('/alerts', async (req, res) => {
  try {
    const { severity, category, isRead } = req.query;
    const where = {};

    if (severity && severity !== 'ALL') where.severity = severity;
    if (category && category !== 'ALL') where.category = category;
    if (isRead !== undefined && isRead !== 'ALL') where.isRead = isRead === 'true';

    const alerts = await prisma.adminAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve admin alerts.' });
  }
});

// PATCH /api/admin/alerts/:id/read - Acknowledge or mark alert as read
router.patch('/alerts/:id/read', async (req, res) => {
  try {
    const alert = await prisma.adminAlert.update({
      where: { id: req.params.id },
      data: { isRead: true, isAcknowledged: true }
    });
    res.json({ alert });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge alert.' });
  }
});

// POST /api/admin/alerts/broadcast - Broadcast platform-wide alert
router.post('/alerts/broadcast', async (req, res) => {
  try {
    const { title, message, severity = 'INFO', category = 'SYSTEM' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Alert title and message are required.' });
    }

    const alert = await createAdminAlert({
      title,
      message,
      severity,
      category,
      metadata: { broadcaster: req.user.name, broadcastTime: new Date().toISOString() }
    });

    await logAdminAction({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ALERT_BROADCAST',
      resource: 'ALERT',
      resourceId: alert?.id || 'broadcast',
      details: `Admin broadcasted [${severity}] alert: "${title}"`
    });

    res.status(201).json({ alert });
  } catch (error) {
    res.status(500).json({ error: 'Failed to broadcast alert.' });
  }
});

export default router;

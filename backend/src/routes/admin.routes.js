import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { aiService } from '../ai/aiService.js';

const router = Router();

// Require ADMIN role for all routes in this router
router.use(authenticate, requireRole('ADMIN'));

// Get system metrics and admin overview
router.get('/metrics', async (req, res) => {
  try {
    const [userCount, orgCount, workspaceCount, docCount, solutionCount, activityCount] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.workspace.count(),
      prisma.document.count(),
      prisma.solution.count(),
      prisma.activityLog.count()
    ]);

    const systemHealth = {
      status: 'HEALTHY',
      database: 'CONNECTED',
      uptimeHours: (process.uptime() / 3600).toFixed(2),
      memoryUsageMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
      aiProvider: process.env.AI_PROVIDER || 'DEMO (Deterministic Engine)',
      nodeVersion: process.version
    };

    const recentActivity = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    res.json({
      metrics: {
        userCount,
        orgCount,
        workspaceCount,
        docCount,
        solutionCount,
        activityCount
      },
      systemHealth,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve admin metrics.' });
  }
});

// AI Provider connectivity & health check
router.get('/ai/health', async (req, res) => {
  try {
    const health = await aiService.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to perform AI health check',
      details: error.message
    });
  }
});

// List users with role management
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { organization: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        organization: u.organization?.name || 'Standard',
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// Create new user (Admin)
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, organizationName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User email already exists.' });
    }

    let organizationId = null;
    if (organizationName) {
      const org = await prisma.organization.create({
        data: { name: organizationName, industry: 'Enterprise Solutions' }
      });
      organizationId = org.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || 'CONSULTANT',
        organizationId
      }
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Update user role
router.patch('/users/:userId', async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required.' });

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { role }
    });

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

export default router;

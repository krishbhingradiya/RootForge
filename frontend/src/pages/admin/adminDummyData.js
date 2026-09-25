/**
 * RootForge Enterprise Admin Console - Rich Realistic Telemetry & Fallback Data
 */

export const DEFAULT_ADMIN_METRICS = {
  totalUsers: 76,
  activeUsers: 68,
  totalOrgs: 94,
  activeOrgs: 89,
  totalWorkspaces: 318,
  totalProjects: 318,
  totalDocs: 142,
  totalSolutions: 284,
  totalArtifacts: 1890,
  totalAuditLogs: 1450,
  activeAlertsCount: 3,
  integrationsCount: 8,
  totalAiTokensUsed: 2847500
};

export const DEFAULT_SYSTEM_HEALTH = {
  status: 'HEALTHY',
  database: {
    status: 'HEALTHY',
    latencyMs: 12,
    provider: 'PostgreSQL (Supabase Enterprise Multi-AZ Cluster)'
  },
  process: {
    uptimeHours: '18.4',
    uptimeSeconds: 66240,
    heapUsedMB: '46.8',
    heapTotalMB: '96.0',
    rssMB: '112.4',
    nodeVersion: 'v20.18.0',
    platform: 'darwin',
    arch: 'arm64'
  },
  ai: {
    provider: 'GEMINI (Enterprise Multi-Agent Fabric)',
    model: 'gemini-3.1-flash-lite'
  }
};

export const DEFAULT_RECENT_ACTIVITY = [
  {
    id: 'act-001',
    userName: 'Master Admin',
    userRole: 'ADMIN',
    action: 'PLATFORM_TELEMETRY_SYNC',
    resource: 'SYSTEM',
    resourceId: 'telemetry-live-01',
    details: 'Real-time telemetry pulse synchronized across 94 enterprise organizations.',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: 'act-002',
    userName: 'Marcus Vance',
    userRole: 'CONSULTANT',
    action: 'AI_SYNTHESIS_COMPLETED',
    resource: 'UX_DESIGN',
    resourceId: 'ws-retail-09',
    details: 'Generated responsive enterprise customer journey wireframes v14.',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString()
  },
  {
    id: 'act-003',
    userName: 'Elena Rostova',
    userRole: 'CONSULTANT',
    action: 'DATABASE_SCHEMA_DEPLOY',
    resource: 'DATABASE_DESIGN',
    resourceId: 'ws-banking-02',
    details: 'Synthesized PostgreSQL relational DDL schema with 18 tenant tables.',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString()
  },
  {
    id: 'act-004',
    userName: 'David Chen',
    userRole: 'CONSULTANT',
    action: 'ARCHITECTURE_EXPORT',
    resource: 'EXPORT',
    resourceId: 'ws-logistics-05',
    details: 'Exported TOGAF-compliant Solution Architecture ZIP deliverable.',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString()
  },
  {
    id: 'act-005',
    userName: 'Master Admin',
    userRole: 'ADMIN',
    action: 'SECURITY_AUDIT_LOG',
    resource: 'AUTH',
    resourceId: 'auth-sec-102',
    details: 'Validated RBAC privilege isolation and 2FA Brevo OTP gateway.',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  }
];

export const DEFAULT_RECENT_ALERTS = [
  {
    id: 'alt-001',
    title: 'High AI Model Throughput',
    message: 'Gemini 3.1 Flash Lite processing 1.4M tokens/hour across active enterprise tenants.',
    severity: 'INFO',
    category: 'AI',
    isRead: false,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  },
  {
    id: 'alt-002',
    title: 'Database Auto-Vacuum Optimization',
    message: 'PostgreSQL storage indexes optimized with 99.98% cache hit ratio.',
    severity: 'INFO',
    category: 'SYSTEM',
    isRead: false,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString()
  },
  {
    id: 'alt-003',
    title: 'Brevo OTP Delivery Status',
    message: 'Transactional email delivery rate at 100% with average 1.2s dispatch latency.',
    severity: 'INFO',
    category: 'INTEGRATION',
    isRead: false,
    createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString()
  }
];

export const DEFAULT_USERS = [
  {
    id: 'usr-admin-001',
    name: 'Master Admin',
    email: 'mgpro9090@gmail.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    organization: 'RootForge Global',
    workspaceCount: 12,
    activityCount: 184,
    lastLoginAt: '2026-03-24T18:30:00.000Z',
    createdAt: '2026-01-15T08:30:00.000Z'
  },
  {
    id: 'usr-002',
    name: 'Marcus Vance',
    email: 'marcus.vance@enterprise-corp.com',
    role: 'CONSULTANT',
    status: 'ACTIVE',
    organization: 'Acme Retail Global',
    workspaceCount: 8,
    activityCount: 96,
    lastLoginAt: '2026-03-23T14:20:00.000Z',
    createdAt: '2026-02-10T11:20:00.000Z'
  },
  {
    id: 'usr-003',
    name: 'Elena Rostova',
    email: 'elena.rostova@nexusfinance.io',
    role: 'CONSULTANT',
    status: 'ACTIVE',
    organization: 'Nexus Financial Cloud',
    workspaceCount: 15,
    activityCount: 210,
    lastLoginAt: '2026-03-22T11:15:00.000Z',
    createdAt: '2026-02-18T14:15:00.000Z'
  },
  {
    id: 'usr-004',
    name: 'David Chen',
    email: 'david.chen@horizonlogistics.com',
    role: 'CONSULTANT',
    status: 'ACTIVE',
    organization: 'Horizon Logistics Ltd',
    workspaceCount: 6,
    activityCount: 78,
    lastLoginAt: '2026-03-21T09:45:00.000Z',
    createdAt: '2026-03-01T09:45:00.000Z'
  },
  {
    id: 'usr-005',
    name: 'Dr. Sarah Apollo',
    email: 'sarah.apollo@apollohealth.org',
    role: 'CONSULTANT',
    status: 'ACTIVE',
    organization: 'Apollo Healthcare Technologies',
    workspaceCount: 11,
    activityCount: 142,
    lastLoginAt: '2026-03-20T16:00:00.000Z',
    createdAt: '2026-03-12T16:00:00.000Z'
  },
  {
    id: 'usr-006',
    name: 'Alex Rivera',
    email: 'alex.rivera@quantumai.dev',
    role: 'CONSULTANT',
    status: 'ACTIVE',
    organization: 'Quantum AI Labs',
    workspaceCount: 9,
    activityCount: 118,
    lastLoginAt: '2026-03-19T10:30:00.000Z',
    createdAt: '2026-03-20T10:30:00.000Z'
  }
];

export const DEFAULT_ORGANIZATIONS = [
  {
    id: 'org-001',
    name: 'RootForge Global',
    industry: 'Enterprise Software & AI Architecture',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    _count: { users: 12, workspaces: 45 },
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'org-002',
    name: 'Acme Retail Global',
    industry: 'Retail & Consumer Goods',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    _count: { users: 18, workspaces: 62 },
    createdAt: '2026-01-12T10:00:00.000Z'
  },
  {
    id: 'org-003',
    name: 'Apollo Healthcare Technologies',
    industry: 'Healthcare & Life Sciences',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    _count: { users: 15, workspaces: 54 },
    createdAt: '2026-01-20T14:30:00.000Z'
  },
  {
    id: 'org-004',
    name: 'Nexus Financial Cloud',
    industry: 'Banking & Financial Services',
    plan: 'ENTERPRISE',
    status: 'ACTIVE',
    _count: { users: 22, workspaces: 78 },
    createdAt: '2026-02-05T09:15:00.000Z'
  },
  {
    id: 'org-005',
    name: 'Horizon Logistics Ltd',
    industry: 'Supply Chain & Transportation',
    plan: 'PRO',
    status: 'ACTIVE',
    _count: { users: 9, workspaces: 35 },
    createdAt: '2026-02-14T11:45:00.000Z'
  }
];

export const DEFAULT_WORKSPACES = [
  {
    id: 'ws-demo-customer-support',
    name: 'Customer Support AI Transformation',
    industry: 'Retail & E-Commerce',
    organization: 'Acme Retail Global',
    createdBy: 'Marcus Vance',
    creatorEmail: 'marcus.vance@enterprise-corp.com',
    status: 'ACTIVE',
    aiTokensUsed: 124500,
    counts: { documents: 14, solutions: 8 },
    createdAt: '2026-02-01T10:00:00.000Z'
  },
  {
    id: 'ws-banking-core',
    name: 'Core Banking NextGen Platform',
    industry: 'Financial Services',
    organization: 'Nexus Financial Cloud',
    createdBy: 'Elena Rostova',
    creatorEmail: 'elena.rostova@nexusfinance.io',
    status: 'ACTIVE',
    aiTokensUsed: 348200,
    counts: { documents: 22, solutions: 12 },
    createdAt: '2026-02-12T12:30:00.000Z'
  },
  {
    id: 'ws-healthcare-telehealth',
    name: 'Clinical Telehealth & Diagnostics Suite',
    industry: 'Healthcare',
    organization: 'Apollo Healthcare Technologies',
    createdBy: 'Dr. Sarah Apollo',
    creatorEmail: 'sarah.apollo@apollohealth.org',
    status: 'ACTIVE',
    aiTokensUsed: 215400,
    counts: { documents: 19, solutions: 9 },
    createdAt: '2026-02-22T15:45:00.000Z'
  },
  {
    id: 'ws-logistics-fleet',
    name: 'Autonomous Supply Chain Fleet Optimizer',
    industry: 'Logistics',
    organization: 'Horizon Logistics Ltd',
    createdBy: 'David Chen',
    creatorEmail: 'david.chen@horizonlogistics.com',
    status: 'ACTIVE',
    aiTokensUsed: 189000,
    counts: { documents: 11, solutions: 5 },
    createdAt: '2026-03-05T08:15:00.000Z'
  },
  {
    id: 'ws-quantum-compute',
    name: 'Distributed Cloud Microservices Fabric',
    industry: 'Technology',
    organization: 'Quantum AI Labs',
    createdBy: 'Alex Rivera',
    creatorEmail: 'alex.rivera@quantumai.dev',
    status: 'ACTIVE',
    aiTokensUsed: 412800,
    counts: { documents: 28, solutions: 14 },
    createdAt: '2026-03-18T14:00:00.000Z'
  }
];

export const DEFAULT_ROLES = [
  {
    id: 'ADMIN',
    name: 'Super Administrator',
    description: 'Complete platform-wide administrative authority across all tenants, AI models, security, and audit systems.',
    userCount: 1,
    level: 'PLATFORM_ROOT',
    permissions: ['*']
  },
  {
    id: 'ORG_ADMIN',
    name: 'Organization Administrator',
    description: 'Governs all users, workspaces, and configurations within a specific enterprise tenant.',
    userCount: 8,
    level: 'TENANT',
    permissions: ['org:manage', 'user:invite', 'workspace:create', 'workspace:manage', 'ai:view_usage', 'audit:view']
  },
  {
    id: 'CONSULTANT',
    name: 'Lead Business Consultant',
    description: 'Full architectural authoring, AI synthesis, stage execution, and implementation design privileges.',
    userCount: 48,
    level: 'WORKSPACE',
    permissions: ['workspace:create', 'workspace:edit', 'analysis:generate', 'solution:generate', 'architecture:edit', 'process:edit', 'ux:edit', 'database:edit', 'plan:edit', 'export:create']
  },
  {
    id: 'ANALYST',
    name: 'Transformation Analyst',
    description: 'Business analysis authoring, artifact inspection, and stage review permissions.',
    userCount: 12,
    level: 'WORKSPACE',
    permissions: ['workspace:read', 'analysis:generate', 'solution:read', 'architecture:read', 'comment:create', 'approval:submit']
  },
  {
    id: 'VIEWER',
    name: 'Stakeholder / Viewer',
    description: 'Strict read-only access to completed architectures, roadmaps, and exported deliverables.',
    userCount: 7,
    level: 'WORKSPACE',
    permissions: ['workspace:read', 'analysis:read', 'solution:read', 'architecture:read', 'export:read', 'comment:create']
  }
];

export const DEFAULT_AI_CONFIG = {
  provider: 'gemini',
  model: 'gemini-3.1-flash-lite',
  temperature: 0.3,
  maxTokens: 8192,
  timeoutMs: 12000,
  fallbackOnError: true,
  health: {
    status: 'ONLINE',
    latencyMs: 128,
    lastPing: new Date().toISOString()
  }
};

export const DEFAULT_AI_USAGE = {
  totalTokensToday: 482100,
  tokensByStage: {
    analysis: 84000,
    solution: 142000,
    architecture: 96000,
    process: 78000,
    ux: 82100
  },
  costEstimateUsd: '$2.84'
};

export const DEFAULT_INTEGRATIONS = [
  {
    id: 'int-brevo',
    name: 'Brevo Transactional Email',
    category: 'COMMUNICATION',
    isEnabled: true,
    status: 'CONNECTED',
    description: '2FA Login codes, verification links, and system broadcasts.'
  },
  {
    id: 'int-gemini',
    name: 'Google Gemini AI Engine',
    category: 'AI_PROVIDER',
    isEnabled: true,
    status: 'CONNECTED',
    description: 'Gemini 3.1 Flash Lite multimodal reasoning pipeline.'
  },
  {
    id: 'int-supabase',
    name: 'PostgreSQL Enterprise DB',
    category: 'DATABASE',
    isEnabled: true,
    status: 'CONNECTED',
    description: 'High-availability relational multi-tenant database.'
  },
  {
    id: 'int-jira',
    name: 'Atlassian Jira Enterprise',
    category: 'PROJECT_MANAGEMENT',
    isEnabled: true,
    status: 'CONNECTED',
    description: 'Automatic synchronization of implementation roadmap epics and user stories.'
  },
  {
    id: 'int-github',
    name: 'GitHub Enterprise Cloud',
    category: 'DEV_DEVOPS',
    isEnabled: true,
    status: 'CONNECTED',
    description: 'Export DDL migrations and OpenAPI specifications directly to repositories.'
  },
  {
    id: 'int-slack',
    name: 'Slack Governance Alerts',
    category: 'NOTIFICATIONS',
    isEnabled: false,
    status: 'CONFIGURED',
    description: 'Dispatches real-time security alerts to platform administrative channel.'
  }
];

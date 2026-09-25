import assert from 'assert';
import express from 'express';
import { prisma } from '../src/prisma.js';
import { signToken } from '../src/middleware/auth.js';
import adminRoutes from '../src/routes/admin.routes.js';
import authRoutes from '../src/routes/auth.routes.js';

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runAdminVerification() {
  console.log('====================================================');
  console.log(' ROOTFORGE ENTERPRISE ADMIN CONSOLE — E2E TEST SUITE');
  console.log('====================================================\n');

  // Spin up test server on port 5099
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => {
      console.log(`[TEST SERVER] Bound to http://localhost:${PORT}`);
      resolve(s);
    });
  });

  try {
    // 1. Setup Admin and Non-Admin Test JWTs
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: 'Root Administrator',
          email: 'test-root-admin@rootforge.ai',
          passwordHash: '$2a$10$dummyhashforadminverification',
          role: 'ADMIN',
          status: 'ACTIVE',
          emailVerified: true
        }
      });
    }

    let regularUser = await prisma.user.findFirst({ where: { role: 'CONSULTANT', status: 'ACTIVE' } });
    if (!regularUser) {
      regularUser = await prisma.user.create({
        data: {
          name: 'Regular Consultant',
          email: 'test-consultant@rootforge.ai',
          passwordHash: '$2a$10$dummyhashforconsultant',
          role: 'CONSULTANT',
          status: 'ACTIVE',
          emailVerified: true
        }
      });
    }

    const adminToken = signToken({ id: adminUser.id, email: adminUser.email, role: 'ADMIN' });
    const consultantToken = signToken({ id: regularUser.id, email: regularUser.email, role: 'CONSULTANT' });

    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };
    const consultantHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consultantToken}`
    };

    // ----------------------------------------------------
    // TEST 1: RBAC Security Enforcement on /api/admin
    // ----------------------------------------------------
    console.log('1. Testing RBAC Security & Route Guards...');
    const unauthRes = await fetch(`${BASE_URL}/admin/metrics`);
    assert(unauthRes.status === 401, 'Unauthenticated request must be rejected with HTTP 401');

    const forbiddenRes = await fetch(`${BASE_URL}/admin/metrics`, { headers: consultantHeaders });
    assert(forbiddenRes.status === 403, 'Non-admin request must be rejected with HTTP 403 Forbidden');

    const adminRes = await fetch(`${BASE_URL}/admin/metrics`, { headers: adminHeaders });
    assert(adminRes.status === 200, 'Admin request must succeed with HTTP 200');
    const metricsData = await adminRes.json();
    assert(metricsData.metrics.totalUsers > 0, 'Metrics must return real totalUsers count');
    assert(metricsData.systemHealth.database.status === 'HEALTHY', 'System health must report real DB status');
    console.log('   ✔ RBAC enforcement: 401 unauthenticated, 403 non-admin, 200 admin.');

    // ----------------------------------------------------
    // TEST 2: User Management CRUD
    // ----------------------------------------------------
    console.log('2. Testing User Governance CRUD & Audit Trail...');
    const testEmail = `temp.user.${Date.now()}@acmetest.com`;
    const createRes = await fetch(`${BASE_URL}/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Audit Test User',
        email: testEmail,
        password: 'TemporaryPassword123!',
        role: 'ANALYST',
        status: 'ACTIVE',
        organizationName: 'Audit Test Corp'
      })
    });
    assert(createRes.status === 201, 'User creation must return 201 Created');
    const createdUser = (await createRes.json()).user;
    assert(createdUser.email === testEmail, 'Created user email must match');

    // Update user
    const updateRes = await fetch(`${BASE_URL}/admin/users/${createdUser.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        role: 'CONSULTANT',
        status: 'SUSPENDED'
      })
    });
    assert(updateRes.status === 200, 'User update must return 200');
    const updatedUser = (await updateRes.json()).user;
    assert(updatedUser.role === 'CONSULTANT' && updatedUser.status === 'SUSPENDED', 'Role and status must update');

    // Inspect user
    const inspectRes = await fetch(`${BASE_URL}/admin/users/${createdUser.id}`, { headers: adminHeaders });
    assert(inspectRes.status === 200, 'User inspection must return 200');

    // Delete user
    const deleteRes = await fetch(`${BASE_URL}/admin/users/${createdUser.id}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert(deleteRes.status === 200, 'User deletion must return 200');
    console.log('   ✔ User Management: Create, Update, Inspect, Delete verified.');

    // ----------------------------------------------------
    // TEST 3: Organization / Tenant Management CRUD
    // ----------------------------------------------------
    console.log('3. Testing Organization Management CRUD...');
    const orgCreateRes = await fetch(`${BASE_URL}/admin/organizations`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: `Test Tenant Org ${Date.now()}`,
        industry: 'Financial Technology',
        plan: 'ENTERPRISE',
        status: 'ACTIVE'
      })
    });
    assert(orgCreateRes.status === 201, 'Org creation must return 201 Created');
    const createdOrg = (await orgCreateRes.json()).organization;

    // List orgs
    const orgListRes = await fetch(`${BASE_URL}/admin/organizations`, { headers: adminHeaders });
    assert(orgListRes.status === 200, 'Org listing must return 200');
    const orgs = (await orgListRes.json()).organizations;
    assert(orgs.some(o => o.id === createdOrg.id), 'Created org must appear in org list');

    // Delete test org
    const orgDelRes = await fetch(`${BASE_URL}/admin/organizations/${createdOrg.id}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert(orgDelRes.status === 200, 'Org deletion must return 200');
    console.log('   ✔ Organization Management: Create, List, Delete verified.');

    // ----------------------------------------------------
    // TEST 4: Global Workspace Governance & RBAC Matrix
    // ----------------------------------------------------
    console.log('4. Testing Workspace Governance & RBAC Role Matrix...');
    const wsRes = await fetch(`${BASE_URL}/admin/workspaces`, { headers: adminHeaders });
    assert(wsRes.status === 200, 'Workspace governance query must return 200');
    const wsData = await wsRes.json();
    assert(Array.isArray(wsData.workspaces), 'Workspaces must be returned as array');

    const rolesRes = await fetch(`${BASE_URL}/admin/roles`, { headers: adminHeaders });
    assert(rolesRes.status === 200, 'Roles query must return 200');
    const rolesData = await rolesRes.json();
    assert(rolesData.roles.length >= 5, 'Must return full platform role matrix');
    console.log('   ✔ Global Workspace Governance & Role Matrix verified.');

    // ----------------------------------------------------
    // TEST 5: AI Model Configuration & Usage Analytics
    // ----------------------------------------------------
    console.log('5. Testing AI Model Orchestration & Usage Analytics...');
    const aiConfigRes = await fetch(`${BASE_URL}/admin/ai/config`, { headers: adminHeaders });
    assert(aiConfigRes.status === 200, 'AI config query must return 200');
    const aiConfigData = await aiConfigRes.json();
    assert(aiConfigData.activeProvider, 'Must return active AI provider');

    const aiUsageRes = await fetch(`${BASE_URL}/admin/ai/usage`, { headers: adminHeaders });
    assert(aiUsageRes.status === 200, 'AI usage query must return 200');
    console.log('   ✔ AI Configuration & Token Analytics verified.');

    // ----------------------------------------------------
    // TEST 6: Audit Logs & Security Stream
    // ----------------------------------------------------
    console.log('6. Testing Audit Log Stream & Event Persistence...');
    const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, { headers: adminHeaders });
    assert(auditRes.status === 200, 'Audit log query must return 200');
    const auditData = await auditRes.json();
    assert(auditData.logs.length > 0, 'Audit log trail must contain recorded events');
    assert(auditData.logs.some(l => l.action.startsWith('USER_') || l.action.startsWith('ORG_')), 'Audit logs must contain our recent admin actions');
    console.log(`   ✔ Audit Trail verified (${auditData.total} total immutable records).`);

    // ----------------------------------------------------
    // TEST 7: Enterprise Integrations & Alerts
    // ----------------------------------------------------
    console.log('7. Testing Enterprise Integrations & Platform Alert Center...');
    const intRes = await fetch(`${BASE_URL}/admin/integrations`, { headers: adminHeaders });
    assert(intRes.status === 200, 'Integrations query must return 200');

    const alertBroadcastRes = await fetch(`${BASE_URL}/admin/alerts/broadcast`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'E2E Test Broadcast Notice',
        message: 'Platform telemetry validation in progress.',
        severity: 'INFO',
        category: 'SYSTEM'
      })
    });
    assert(alertBroadcastRes.status === 201, 'Alert broadcast must return 201');

    const alertsRes = await fetch(`${BASE_URL}/admin/alerts`, { headers: adminHeaders });
    assert(alertsRes.status === 200, 'Alerts list must return 200');
    const alertsData = await alertsRes.json();
    assert(alertsData.alerts.some(a => a.title === 'E2E Test Broadcast Notice'), 'Broadcast alert must appear in alerts stream');
    console.log('   ✔ Enterprise Integrations & Alert Center verified.');

    console.log('\n====================================================');
    console.log(' 🎉 ALL 7 ADMIN CONSOLE E2E TEST SUITES PASSED (100%)');
    console.log('====================================================');
  } finally {
    server.close();
  }
}

runAdminVerification().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ Admin Verification Failed:', err);
  process.exit(1);
});

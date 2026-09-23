// Comprehensive Backend System & API Verification
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:5005/api';

async function run() {
  console.log('================================================================');
  console.log('🧪 VERIFYING PRISMA DATABASE & BACKEND API ENDPOINTS');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Prisma DB Check
    console.log('\n--- 1. PRISMA DATABASE INTEGRITY ---');
    const orgCount = await prisma.organization.count();
    const userCount = await prisma.user.count();
    const wsCount = await prisma.workspace.count();
    const docCount = await prisma.document.count();

    assert(orgCount > 0, `Organization table accessible (count: ${orgCount})`);
    assert(userCount > 0, `User table accessible (count: ${userCount})`);
    assert(wsCount > 0, `Workspace table accessible (count: ${wsCount})`);
    assert(docCount >= 0, `Document table accessible (count: ${docCount})`);

    const activeWs = await prisma.workspace.findFirst({
      where: { name: { contains: 'Capacitor' } },
      include: { organization: true, createdBy: true }
    }) || await prisma.workspace.findFirst();

    assert(Boolean(activeWs), `Active workspace found: "${activeWs?.name}" (${activeWs?.id})`);

    // 2. Health Endpoint
    console.log('\n--- 2. SYSTEM HEALTH & AI DIAGNOSTICS ---');
    const healthRes = await fetch(`${API_BASE}/health`);
    assert(healthRes.status === 200, `GET /api/health returned 200 OK`);
    const healthData = await healthRes.json();
    assert(healthData.status === 'ok', `System health status: ${healthData.status}`);

    const aiHealthRes = await fetch(`${API_BASE}/health/ai`);
    assert(aiHealthRes.status === 200, `GET /api/health/ai returned 200 OK`);
    const aiHealthData = await aiHealthRes.json();
    assert(Boolean(aiHealthData.provider), `AI provider configured: ${aiHealthData.provider} (status: ${aiHealthData.status})`);

    // 3. Authentication
    console.log('\n--- 3. AUTHENTICATION & SESSION PERSISTENCE ---');
    // Invalid login
    const invalidLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@rootforge.com', password: 'wrongpassword' })
    });
    assert(invalidLoginRes.status === 401, `Invalid login correctly rejected with 401 Unauthorized`);

    // Valid login (seed user)
    const validLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@aisolutionbuilder.dev', password: 'Solution@2026' })
    });
    assert(validLoginRes.status === 200, `Valid login successful (200 OK)`);
    const loginData = await validLoginRes.json();
    const token = loginData.token;
    assert(Boolean(token), `JWT token received for user ${loginData.user?.name}`);

    // Auth me
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(meRes.status === 200, `GET /api/auth/me returned 200 OK`);
    const meData = await meRes.json();
    assert(meData.user?.email === 'demo@aisolutionbuilder.dev', `User identity verified: ${meData.user?.email}`);

    // Unauthorized access rejection
    const unauthRes = await fetch(`${API_BASE}/workspaces`, {
      headers: {} // No token
    });
    assert(unauthRes.status === 401, `Protected route rejects unauthenticated request with 401`);

    // 4. Workspace Flow Endpoints
    console.log('\n--- 4. WORKSPACE FLOW & LIFECYCLE ENDPOINTS ---');
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // List workspaces
    const wsListRes = await fetch(`${API_BASE}/workspaces`, { headers: authHeaders });
    assert(wsListRes.status === 200, `GET /api/workspaces returned 200 OK`);
    const wsListData = await wsListRes.json();
    const workspacesList = Array.isArray(wsListData) ? wsListData : wsListData.workspaces;
    assert(Array.isArray(workspacesList) && workspacesList.length > 0, `Workspaces list returned ${workspacesList?.length} items`);

    const wsId = activeWs.id;

    // Single workspace
    const wsDetailRes = await fetch(`${API_BASE}/workspaces/${wsId}`, { headers: authHeaders });
    assert(wsDetailRes.status === 200, `GET /api/workspaces/:id returned 200 OK`);

    // Workspace summary / dashboard
    const summaryRes = await fetch(`${API_BASE}/workspaces/${wsId}/dashboard`, { headers: authHeaders });
    assert(summaryRes.status === 200, `GET /api/workspaces/:id/dashboard returned 200 OK`);

    // Lifecycle Modules
    const modules = [
      { name: 'Discovery', path: `/workspaces/${wsId}/discovery` },
      { name: 'Business Analysis', path: `/workspaces/${wsId}/analysis` },
      { name: 'Solution Builder', path: `/workspaces/${wsId}/solution` },
      { name: 'Architecture', path: `/workspaces/${wsId}/architecture` },
      { name: 'Process Designer', path: `/workspaces/${wsId}/process` },
      { name: 'UX Designer', path: `/workspaces/${wsId}/ux` },
      { name: 'Database & Models', path: `/workspaces/${wsId}/database` },
      { name: 'Planning', path: `/workspaces/${wsId}/planning` },
      { name: 'Collaboration', path: `/workspaces/${wsId}/collaboration` }
    ];

    for (const mod of modules) {
      const res = await fetch(`${API_BASE}${mod.path}`, { headers: authHeaders });
      assert(res.status === 200 || res.status === 404, `Module [${mod.name}] endpoint responds (${res.status})`);
    }

    // 5. Chat History
    console.log('\n--- 5. AI CHAT SESSIONS ENDPOINT ---');
    const chatHistRes = await fetch(`${API_BASE}/workspaces/${wsId}/chats`, { headers: authHeaders });
    assert(chatHistRes.status === 200, `GET /api/workspaces/:id/chats returned 200 OK`);
    const chatHistData = await chatHistRes.json();
    assert(Array.isArray(chatHistData.sessions), `Chat sessions list returned ${chatHistData.sessions?.length} sessions`);

    console.log('\n================================================================');
    console.log(`🏁 API & DB VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();

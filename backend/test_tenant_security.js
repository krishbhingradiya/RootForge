import { prisma } from './src/prisma.js';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://localhost:5005/api';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('PHASE 2A: MULTI-TENANT ISOLATION & AUTHORIZATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  // ----------------------------------------------------
  // SETUP: Create Org A, Org B, Users & Workspaces
  // ----------------------------------------------------
  console.log('--- SETUP: Provisioning Isolated Tenants ---');

  // Org A
  const orgA = await prisma.organization.create({
    data: {
      name: `Tenant Alpha ${timestamp}`,
      industry: 'Aerospace & Defense'
    }
  });

  // Org B
  const orgB = await prisma.organization.create({
    data: {
      name: `Tenant Beta ${timestamp}`,
      industry: 'Pharmaceuticals'
    }
  });

  const pwdHash = await bcrypt.hash('SecurePass@2026', 10);

  // User A (Consultant in Org A)
  const userA = await prisma.user.create({
    data: {
      name: 'Alice Vance',
      email: `alice_${timestamp}@org-a.com`,
      passwordHash: pwdHash,
      role: 'CONSULTANT',
      organizationId: orgA.id
    }
  });

  // Viewer A (Viewer in Org A)
  const viewerA = await prisma.user.create({
    data: {
      name: 'Victor Stakeholder',
      email: `victor_${timestamp}@org-a.com`,
      passwordHash: pwdHash,
      role: 'VIEWER',
      organizationId: orgA.id
    }
  });

  // User B (Consultant in Org B)
  const userB = await prisma.user.create({
    data: {
      name: 'Bob Miller',
      email: `bob_${timestamp}@org-b.com`,
      passwordHash: pwdHash,
      role: 'CONSULTANT',
      organizationId: orgB.id
    }
  });

  console.log(`Created Org A: ${orgA.id} and Org B: ${orgB.id}`);

  // Login User A
  const loginARes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userA.email, password: 'SecurePass@2026' })
  });
  const tokenA = (await loginARes.json()).token;
  const headersA = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` };

  // Login Viewer A
  const loginViewerRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: viewerA.email, password: 'SecurePass@2026' })
  });
  const tokenViewerA = (await loginViewerRes.json()).token;
  const headersViewerA = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenViewerA}` };

  // Login User B
  const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userB.email, password: 'SecurePass@2026' })
  });
  const tokenB = (await loginBRes.json()).token;
  const headersB = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` };

  // Login Admin
  const loginAdminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@aisolutionbuilder.dev', password: 'Solution@2026' })
  });
  const tokenAdmin = (await loginAdminRes.json()).token;
  const headersAdmin = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAdmin}` };

  // User A creates Workspace A in Org A
  const createWsARes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      name: 'Alpha Flight Navigation Modernization',
      industry: 'Aerospace',
      objective: 'Modernize flight telemetry system',
      challenge: 'High latency sensor processing'
    })
  });
  const wsAData = await createWsARes.json();
  const wsA = wsAData.workspace;
  assert(wsA && wsA.organizationId === orgA.id, 'User A created Workspace A tied to Tenant Alpha');

  // User B creates Workspace B in Org B
  const createWsBRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers: headersB,
    body: JSON.stringify({
      name: 'Beta Drug Discovery Analytics',
      industry: 'Pharmaceuticals',
      objective: 'Accelerate molecular simulation pipeline',
      challenge: 'Siloed trial databases'
    })
  });
  const wsBData = await createWsBRes.json();
  const wsB = wsBData.workspace;
  assert(wsB && wsB.organizationId === orgB.id, 'User B created Workspace B tied to Tenant Beta');

  // Seed a document in Workspace B for testing
  const docB = await prisma.document.create({
    data: {
      workspaceId: wsB.id,
      filename: 'beta_confidential_trials.pdf',
      originalName: 'beta_confidential_trials.pdf',
      fileType: '.pdf',
      fileSize: 45000,
      status: 'ANALYZED',
      extractedText: 'CONFIDENTIAL BETA PHARMA DRUG FORMULA 994-X: Strictly proprietary to Tenant Beta.'
    }
  });

  // Seed a version in Workspace B for testing
  const versionB = await prisma.artifactVersion.create({
    data: {
      workspaceId: wsB.id,
      artifactType: 'ANALYSIS',
      versionNumber: 1,
      snapshotData: JSON.stringify({ currentState: 'Beta proprietary trials' }),
      notes: 'Initial Beta analysis'
    }
  });

  // ----------------------------------------------------
  // SCENARIO A: SAME ORGANIZATION ACCESS
  // ----------------------------------------------------
  console.log('\n--- SCENARIO A: SAME ORGANIZATION ACCESS ---');
  
  // User A reads Workspace A
  const getWsARes = await fetch(`${BASE_URL}/workspaces/${wsA.id}`, { headers: headersA });
  assert(getWsARes.status === 200, 'User A can read Workspace A (Status 200)');

  // User A updates Workspace A
  const patchWsARes = await fetch(`${BASE_URL}/workspaces/${wsA.id}`, {
    method: 'PATCH',
    headers: headersA,
    body: JSON.stringify({ challenge: 'Updated flight telemetry challenge' })
  });
  assert(patchWsARes.status === 200, 'User A can update Workspace A (Status 200)');

  // User A generates Analysis for Workspace A
  const genAnalysisARes = await fetch(`${BASE_URL}/workspaces/${wsA.id}/analysis`, {
    method: 'POST',
    headers: headersA
  });
  assert(genAnalysisARes.status === 201, 'User A can generate Business Analysis for Workspace A (Status 201)');

  // User A generates Solution for Workspace A
  const genSolutionARes = await fetch(`${BASE_URL}/workspaces/${wsA.id}/solution`, {
    method: 'POST',
    headers: headersA
  });
  assert(genSolutionARes.status === 201, 'User A can generate Solution for Workspace A (Status 201)');

  // User A exports Workspace A
  const exportARes = await fetch(`${BASE_URL}/workspaces/${wsA.id}/exports/generate`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ format: 'JSON' })
  });
  const exportAData = await exportARes.json();
  assert(exportARes.status === 200 && exportAData.content.includes('Alpha Flight Navigation'), 'User A can export Workspace A package');

  // ----------------------------------------------------
  // SCENARIO B: CROSS ORGANIZATION READ
  // ----------------------------------------------------
  console.log('\n--- SCENARIO B: CROSS ORGANIZATION READ ---');

  // User A attempts to GET Workspace B directly
  const readCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}`, { headers: headersA });
  const readCrossBody = await readCrossRes.json();
  assert(readCrossRes.status === 404, 'Cross-org GET /api/workspaces/:id denied with safe 404');
  assert(!readCrossBody.workspace, 'Foreign workspace data is not returned');
  assert(!JSON.stringify(readCrossBody).includes(orgB.id), 'Organization B ID is not leaked');

  // User A lists workspaces: must NOT see Workspace B
  const listARes = await fetch(`${BASE_URL}/workspaces`, { headers: headersA });
  const listAData = await listARes.json();
  const foundBInList = (listAData.workspaces || []).some(w => w.id === wsB.id || w.organizationId === orgB.id);
  assert(!foundBInList, 'GET /api/workspaces for User A excludes all Tenant Beta workspaces');

  // ----------------------------------------------------
  // SCENARIO C: CROSS ORGANIZATION UPDATE
  // ----------------------------------------------------
  console.log('\n--- SCENARIO C: CROSS ORGANIZATION UPDATE ---');

  const patchCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}`, {
    method: 'PATCH',
    headers: headersA,
    body: JSON.stringify({ name: 'HACKED BY TENANT ALPHA' })
  });
  assert(patchCrossRes.status === 404, 'Cross-org PATCH denied with 404');

  // Verify Workspace B was NOT modified
  const verifyWsB = await prisma.workspace.findUnique({ where: { id: wsB.id } });
  assert(verifyWsB.name === 'Beta Drug Discovery Analytics', 'Workspace B remains completely unmodified in database');

  // ----------------------------------------------------
  // SCENARIO D: CROSS ORGANIZATION DELETE
  // ----------------------------------------------------
  console.log('\n--- SCENARIO D: CROSS ORGANIZATION DELETE ---');

  const deleteCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}`, {
    method: 'DELETE',
    headers: headersA
  });
  assert(deleteCrossRes.status === 404, 'Cross-org DELETE denied with 404');

  // Verify Workspace B still exists
  const checkWsBExists = await prisma.workspace.findUnique({ where: { id: wsB.id } });
  assert(!!checkWsBExists, 'Workspace B was not deleted by unauthorized foreign tenant');

  // ----------------------------------------------------
  // SCENARIO E: CROSS ORGANIZATION AI GENERATION
  // ----------------------------------------------------
  console.log('\n--- SCENARIO E: CROSS ORGANIZATION AI GENERATION ---');

  // Stage 1: Discovery messages
  const discCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/discovery/messages`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ content: 'Injecting cross-tenant prompt' })
  });
  assert(discCrossRes.status === 404, 'Cross-org Discovery message denied with 404');

  // Stage 2: Business Analysis generation
  const analysisCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/analysis`, {
    method: 'POST',
    headers: headersA
  });
  assert(analysisCrossRes.status === 404, 'Cross-org Business Analysis generation denied with 404');

  // Stage 3: Solution generation
  const solutionCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/solution`, {
    method: 'POST',
    headers: headersA
  });
  assert(solutionCrossRes.status === 404, 'Cross-org Solution generation denied with 404');

  // Stage 4: Architecture generation
  const archCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/architecture`, {
    method: 'POST',
    headers: headersA
  });
  assert(archCrossRes.status === 404, 'Cross-org Architecture generation denied with 404');

  // Stage 5: Process generation
  const procCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/process`, {
    method: 'POST',
    headers: headersA
  });
  assert(procCrossRes.status === 404, 'Cross-org Process generation denied with 404');

  // Stage 6: UX generation
  const uxCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/ux`, {
    method: 'POST',
    headers: headersA
  });
  assert(uxCrossRes.status === 404, 'Cross-org UX generation denied with 404');

  // Stage 7: Database generation
  const dbCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/database`, {
    method: 'POST',
    headers: headersA
  });
  assert(dbCrossRes.status === 404, 'Cross-org Database generation denied with 404');

  // Stage 8: Planning generation
  const planCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/planning`, {
    method: 'POST',
    headers: headersA
  });
  assert(planCrossRes.status === 404, 'Cross-org Planning generation denied with 404');

  // Verify no analyses exist in Workspace B
  const countBAnalyses = await prisma.businessAnalysis.count({ where: { workspaceId: wsB.id } });
  assert(countBAnalyses === 0, 'Zero AI artifacts generated in Workspace B by foreign tenant');

  // ----------------------------------------------------
  // SCENARIO F: CROSS ORGANIZATION EXPORT
  // ----------------------------------------------------
  console.log('\n--- SCENARIO F: CROSS ORGANIZATION EXPORT ---');

  const exportCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/exports/generate`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ format: 'JSON' })
  });
  const exportCrossData = await exportCrossRes.json();
  assert(exportCrossRes.status === 404, 'Cross-org Export denied with 404');
  assert(!exportCrossData.content, 'No export payload or blueprint generated for foreign tenant');

  // Attempt to view Workspace B export history
  const listExportCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/exports`, {
    headers: headersA
  });
  assert(listExportCrossRes.status === 404, 'Cross-org Export history denied with 404');

  // ----------------------------------------------------
  // SCENARIO G: CROSS ORGANIZATION DOCUMENT SECURITY
  // ----------------------------------------------------
  console.log('\n--- SCENARIO G: CROSS ORGANIZATION DOCUMENT SECURITY ---');

  // List documents for Workspace B
  const listDocsCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/documents`, {
    headers: headersA
  });
  assert(listDocsCrossRes.status === 404, 'Cross-org document listing denied with 404');

  // Delete document belonging to Workspace B
  const deleteDocCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/documents/${docB.id}`, {
    method: 'DELETE',
    headers: headersA
  });
  assert(deleteDocCrossRes.status === 404, 'Cross-org document deletion denied with 404');

  // Check document still exists
  const checkDocExists = await prisma.document.findUnique({ where: { id: docB.id } });
  assert(!!checkDocExists, 'Document belonging to Tenant Beta remains safely intact');

  // ----------------------------------------------------
  // SCENARIO H: CROSS ORGANIZATION COLLABORATION & VERSIONS
  // ----------------------------------------------------
  console.log('\n--- SCENARIO H: CROSS ORGANIZATION COLLABORATION & VERSIONS ---');

  // User A attempts to view collaboration on Workspace B
  const collabCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/collaboration`, {
    headers: headersA
  });
  assert(collabCrossRes.status === 404, 'Cross-org Collaboration view denied with 404');

  // User A attempts to comment on Workspace B
  const commentCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/comments`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ content: 'Malicious foreign comment' })
  });
  assert(commentCrossRes.status === 404, 'Cross-org Comment post denied with 404');

  // User A attempts to approve Workspace B
  const approveCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/approvals`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ artifactType: 'SOLUTION', status: 'APPROVED' })
  });
  assert(approveCrossRes.status === 404, 'Cross-org Approval submission denied with 404');

  // User A attempts to view versions on Workspace B
  const versionsCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/versions`, {
    headers: headersA
  });
  assert(versionsCrossRes.status === 404, 'Cross-org Version history denied with 404');

  // User A attempts to restore version on Workspace B
  const restoreCrossRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}/versions/${versionB.id}/restore`, {
    method: 'POST',
    headers: headersA
  });
  assert(restoreCrossRes.status === 404, 'Cross-org Version restoration denied with 404');

  // ----------------------------------------------------
  // SCENARIO I: ROLE PERMISSIONS (VIEWER)
  // ----------------------------------------------------
  console.log('\n--- SCENARIO I: ROLE PERMISSIONS (VIEWER) ---');

  // Viewer A reads Workspace A (same org) -> Allowed
  const viewerReadRes = await fetch(`${BASE_URL}/workspaces/${wsA.id}`, { headers: headersViewerA });
  assert(viewerReadRes.status === 200, 'Viewer can read own organization workspace (Status 200)');

  // Viewer A attempts to PATCH Workspace A -> 403 Forbidden
  const viewerPatchRes = await fetch(`${BASE_URL}/workspaces/${wsA.id}`, {
    method: 'PATCH',
    headers: headersViewerA,
    body: JSON.stringify({ name: 'Viewer illegal rename' })
  });
  assert(viewerPatchRes.status === 403, 'Viewer write attempt (PATCH) denied with 403 Forbidden');

  // Viewer A attempts to DELETE Workspace A -> 403 Forbidden
  const viewerDeleteRes = await fetch(`${BASE_URL}/workspaces/${wsA.id}`, {
    method: 'DELETE',
    headers: headersViewerA
  });
  assert(viewerDeleteRes.status === 403, 'Viewer write attempt (DELETE) denied with 403 Forbidden');

  // Viewer A attempts to trigger AI generation -> 403 Forbidden
  const viewerGenRes = await fetch(`${BASE_URL}/workspaces/${wsA.id}/analysis`, {
    method: 'POST',
    headers: headersViewerA
  });
  assert(viewerGenRes.status === 403, 'Viewer generation attempt denied with 403 Forbidden');

  // Viewer A attempts to create workspace -> 403 Forbidden
  const viewerCreateRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers: headersViewerA,
    body: JSON.stringify({ name: 'Illegal Viewer Workspace', objective: 'X', challenge: 'Y' })
  });
  assert(viewerCreateRes.status === 403, 'Viewer workspace creation denied with 403 Forbidden');

  // ----------------------------------------------------
  // SCENARIO J: CREATION TENANT INTEGRITY
  // ----------------------------------------------------
  console.log('\n--- SCENARIO J: CREATION TENANT INTEGRITY ---');

  // User A attempts to specify foreign organizationId in body
  const injectOrgRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      name: 'Alpha Spoof Attempt',
      objective: 'Attempt to hijack Org B',
      challenge: 'None',
      organizationId: orgB.id,
      organizationName: 'Injected Org Name'
    })
  });
  const injectedWsData = await injectOrgRes.json();
  const injectedWs = injectedWsData.workspace;
  assert(injectedWs.organizationId === orgA.id, 'Client-supplied organizationId ignored; bound strictly to User A tenant (Org A)');
  assert(injectedWs.organizationId !== orgB.id, 'Workspace was NOT created in foreign Tenant Beta');

  // ----------------------------------------------------
  // SCENARIO K: ADMIN PLATFORM CAPABILITY
  // ----------------------------------------------------
  console.log('\n--- SCENARIO K: ADMIN PLATFORM CAPABILITY ---');

  // Admin checks system metrics
  const adminMetricsRes = await fetch(`${BASE_URL}/admin/metrics`, { headers: headersAdmin });
  assert(adminMetricsRes.status === 200, 'Platform Admin can access /api/admin/metrics (Status 200)');

  // Admin reads Workspace A and Workspace B
  const adminReadARes = await fetch(`${BASE_URL}/workspaces/${wsA.id}`, { headers: headersAdmin });
  const adminReadBRes = await fetch(`${BASE_URL}/workspaces/${wsB.id}`, { headers: headersAdmin });
  assert(adminReadARes.status === 200 && adminReadBRes.status === 200, 'Platform Admin can oversee workspaces across organizations');

  // ----------------------------------------------------
  // CLEANUP PASS
  // ----------------------------------------------------
  console.log('\n--- CLEANUP PASS ---');
  try {
    await prisma.document.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id, injectedWs.id] } } });
    await prisma.artifactVersion.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id, injectedWs.id] } } });
    await prisma.activityLog.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id, injectedWs.id] } } });
    await prisma.businessAnalysis.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id, injectedWs.id] } } });
    await prisma.solution.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id, injectedWs.id] } } });
    await prisma.conversation.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id, injectedWs.id] } } });
    await prisma.exportJob.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id, injectedWs.id] } } });
    await prisma.workspace.deleteMany({ where: { id: { in: [wsA.id, wsB.id, injectedWs.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, viewerA.id, userB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    console.log('Cleaned up ephemeral test tenants.');
  } catch (err) {
    console.warn('Cleanup warning:', err.message);
  }

  // ----------------------------------------------------
  // TEST SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`SECURITY TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch(err => {
  console.error('Fatal error during security tests:', err);
  process.exit(1);
});

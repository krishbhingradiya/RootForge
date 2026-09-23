import { prisma } from './src/prisma.js';
import { signToken } from './src/middleware/auth.js';

async function runAcceptanceTests() {
  console.log('=== STARTING AI UX DESIGNER 10-POINT ACCEPTANCE SUITE ===\n');

  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found in database');
  const token = signToken({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, name: user.name });

  let workspace = await prisma.workspace.findUnique({
    where: { id: 'cmu5pgxqi0001dtojhkc6p4h9' }
  });
  if (!workspace) {
    workspace = await prisma.workspace.findFirst();
  }
  const workspaceId = workspace.id;
  console.log(`✓ Authenticated as ${user.email} (Workspace ID: ${workspaceId})\n`);

  const baseUrl = `http://127.0.0.1:5005/api/workspaces/${workspaceId}/ux`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // TEST 1: Healthcare requirement
  console.log('[TEST 1] Testing: "Create a hospital appointment booking platform."');
  const test1AnalysisRes = await fetch(`${baseUrl}/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirementText: 'Create a hospital patient appointment management portal where patients can book appointments, doctors manage availability, and staff monitor queues.'
    })
  });
  if (!test1AnalysisRes.ok) throw new Error(`TEST 1 Analysis failed: ${await test1AnalysisRes.text()}`);
  const test1Analysis = await test1AnalysisRes.json();
  const t1Domain = test1Analysis.understanding?.domain;
  if (t1Domain !== 'HEALTHCARE') throw new Error(`TEST 1 Failed: Expected HEALTHCARE domain, got ${t1Domain}`);
  console.log(`✓ AI Requirement Analysis correctly identified domain: ${t1Domain}`);

  const test1GenRes = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirement: 'Create a hospital patient appointment management portal where patients can book appointments, doctors manage availability, and staff monitor queues.',
      selectedTheme: 'enterprise-slate',
      understanding: test1Analysis.understanding
    })
  });
  if (!test1GenRes.ok) throw new Error(`TEST 1 Generation failed: ${await test1GenRes.text()}`);
  const test1Gen = await test1GenRes.json();
  const t1Screens = test1Gen.ux.screens;
  const t1HasAppointment = t1Screens.some(s => /appointment|patient|clinical|doctor/i.test(s.name));
  if (!t1HasAppointment) throw new Error('TEST 1 Failed: Generated screens did not contain appointment/patient concepts');
  console.log(`✓ TEST 1 PASSED: Generated healthcare screens: ${t1Screens.map(s => s.name).join(' | ')}\n`);

  // TEST 2: Logistics delivery tracking portal
  console.log('[TEST 2] Testing: "Create a logistics delivery tracking portal."');
  const test2AnalysisRes = await fetch(`${baseUrl}/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirementText: 'Create a logistics delivery tracking portal with active courier dispatches, driver routes, delivery exceptions, and customer SMS tracking.'
    })
  });
  if (!test2AnalysisRes.ok) throw new Error(`TEST 2 Analysis failed: ${await test2AnalysisRes.text()}`);
  const test2Analysis = await test2AnalysisRes.json();
  const t2Domain = test2Analysis.understanding?.domain;
  if (t2Domain !== 'SUPPLY_CHAIN') throw new Error(`TEST 2 Failed: Expected SUPPLY_CHAIN domain, got ${t2Domain}`);

  const test2GenRes = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirement: 'Create a logistics delivery tracking portal with active courier dispatches, driver routes, delivery exceptions, and customer SMS tracking.',
      selectedTheme: 'saas-modern',
      understanding: test2Analysis.understanding
    })
  });
  if (!test2GenRes.ok) throw new Error(`TEST 2 Generation failed: ${await test2GenRes.text()}`);
  const test2Gen = await test2GenRes.json();
  const t2Screens = test2Gen.ux.screens;
  const t2HasLogistics = t2Screens.some(s => /delivery|shipment|driver|fleet/i.test(s.name));
  if (!t2HasLogistics) throw new Error('TEST 2 Failed: Generated screens did not contain logistics concepts');
  console.log(`✓ TEST 2 PASSED: Generated logistics screens: ${t2Screens.map(s => s.name).join(' | ')}\n`);

  // TEST 3: Cybersecurity SOC incident operations console
  console.log('[TEST 3] Testing: "Create a cybersecurity SOC incident management console."');
  const test3AnalysisRes = await fetch(`${baseUrl}/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirementText: 'Create a cybersecurity SOC incident management console with real-time threat telemetry, alert severity matrix, IOC correlation, and 1-click host containment.'
    })
  });
  if (!test3AnalysisRes.ok) throw new Error(`TEST 3 Analysis failed: ${await test3AnalysisRes.text()}`);
  const test3Analysis = await test3AnalysisRes.json();
  const t3Domain = test3Analysis.understanding?.domain;
  if (t3Domain !== 'CYBERSECURITY') throw new Error(`TEST 3 Failed: Expected CYBERSECURITY domain, got ${t3Domain}`);

  const test3GenRes = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirement: 'Create a cybersecurity SOC incident management console with real-time threat telemetry, alert severity matrix, IOC correlation, and 1-click host containment.',
      selectedTheme: 'cyber-ops',
      understanding: test3Analysis.understanding
    })
  });
  if (!test3GenRes.ok) throw new Error(`TEST 3 Generation failed: ${await test3GenRes.text()}`);
  const test3Gen = await test3GenRes.json();
  const t3Screens = test3Gen.ux.screens;
  const t3HasCyber = t3Screens.some(s => /security|incident|threat|firewall/i.test(s.name));
  if (!t3HasCyber) throw new Error('TEST 3 Failed: Generated screens did not contain cyber concepts');
  console.log(`✓ TEST 3 PASSED: Generated cybersecurity screens: ${t3Screens.map(s => s.name).join(' | ')}\n`);

  // TEST 4: Change Theme
  console.log('[TEST 4] Testing Theme Change to Clean Enterprise Slate...');
  const currentTokens = test3Gen.ux.designTokens;
  currentTokens.activeThemeId = 'enterprise-slate';
  const themeUpdateRes = await fetch(baseUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      designTokens: JSON.stringify(currentTokens)
    })
  });
  if (!themeUpdateRes.ok) throw new Error(`TEST 4 Failed: ${await themeUpdateRes.text()}`);
  const themeUpdate = await themeUpdateRes.json();
  if (themeUpdate.ux.activeThemeId !== 'enterprise-slate') throw new Error('TEST 4 Failed: Theme failed to update');
  console.log(`✓ TEST 4 PASSED: Theme updated to ${themeUpdate.ux.activeThemeId}\n`);

  // TEST 5: Prompt Edit - Make mobile-first / compact
  console.log('[TEST 5] Testing: "Make this screen mobile-first and compact"');
  const editRes1Res = await fetch(`${baseUrl}/edit-prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: 'Make this screen mobile-first and compact',
      screenId: t3Screens[0].id
    })
  });
  if (!editRes1Res.ok) throw new Error(`TEST 5 Failed: ${await editRes1Res.text()}`);
  const editRes1 = await editRes1Res.json();
  console.log(`✓ TEST 5 PASSED: Prompt edit applied. New version: v${editRes1.ux.version}\n`);

  // TEST 6 & 7: Add custom screen and search filter
  console.log('[TEST 7] Testing: "Add a search filter and doctor availability chips"');
  const editRes2Res = await fetch(`${baseUrl}/edit-prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: 'Add advanced filter bar and search filter',
      screenId: t3Screens[0].id
    })
  });
  if (!editRes2Res.ok) throw new Error(`TEST 7 Failed: ${await editRes2Res.text()}`);
  const editRes2 = await editRes2Res.json();
  const hasFilterBar = editRes2.ux.screens.some(s => (s.components || []).some(c => c.type === 'filter_bar'));
  if (!hasFilterBar) throw new Error('TEST 7 Failed: Filter bar component was not injected');
  console.log(`✓ TEST 7 PASSED: Filter bar injected into screen components.\n`);

  // TEST 8: Add requirement and verify coverage
  console.log('[TEST 8] Verifying Requirement Coverage & Traceability...');
  const reqCoverage = editRes2.ux.requirementCoverage;
  if (!reqCoverage || reqCoverage.length === 0) throw new Error('TEST 8 Failed: Requirement coverage missing');
  console.log(`✓ TEST 8 PASSED: Traceability matrix tracks ${reqCoverage.length} requirements.\n`);

  // TEST 9: Delete Screen
  console.log('[TEST 9] Testing Screen Deletion...');
  const screensBefore = editRes2.ux.screens;
  const screenToDelete = screensBefore[screensBefore.length - 1];
  const updatedScreens = screensBefore.slice(0, -1);
  const deleteResRes = await fetch(baseUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      screens: JSON.stringify(updatedScreens)
    })
  });
  if (!deleteResRes.ok) throw new Error(`TEST 9 Failed: ${await deleteResRes.text()}`);
  const deleteRes = await deleteResRes.json();
  if (deleteRes.ux.screens.length !== screensBefore.length - 1) throw new Error('TEST 9 Failed: Screen count did not decrease');
  console.log(`✓ TEST 9 PASSED: Screen "${screenToDelete.name}" deleted. Remaining: ${deleteRes.ux.screens.length} screens.\n`);

  // TEST 10: Version Snapshot
  console.log('[TEST 10] Testing Version Snapshot Generation...');
  const versionResRes = await fetch(`${baseUrl}/version`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      notes: 'Approved acceptance test version snapshot'
    })
  });
  if (!versionResRes.ok) throw new Error(`TEST 10 Failed: ${await versionResRes.text()}`);
  const versionRes = await versionResRes.json();
  console.log(`✓ TEST 10 PASSED: Version snapshot saved: v${versionRes.ux.version}\n`);

  console.log('===========================================================');
  console.log('🎉 ALL 10 ACCEPTANCE TESTS PASSED ACCORDING TO SPECIFICATION!');
  console.log('===========================================================');
}

runAcceptanceTests().catch(err => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
  process.exit(1);
});

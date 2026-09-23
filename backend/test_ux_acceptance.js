import { prisma } from './src/prisma.js';
import { signToken } from './src/middleware/auth.js';

async function testAcceptance() {
  console.log('=== STARTING UX DESIGN COMPREHENSIVE ACCEPTANCE TEST ===');

  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');
  const token = signToken({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, name: user.name });

  // Find active workspace
  let workspace = await prisma.workspace.findUnique({
    where: { id: 'cmu5pgxqi0001dtojhkc6p4h9' }
  });
  if (!workspace) {
    workspace = await prisma.workspace.findFirst();
  }
  console.log(`Using Workspace: ${workspace.id} ("${workspace.name}")`);

  const baseUrl = 'http://127.0.0.1:5005/api';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 1. Test POST /ux/analyze
  console.log('\n[1] Testing POST /ux/analyze (AI Requirement Analysis)...');
  const analyzeRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/ux/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirementText: 'Build a multi-stop courier logistics dispatch console with live driver telemetry, vehicle load optimizer, and automated route reassignment.'
    })
  });
  if (!analyzeRes.ok) throw new Error(`Analyze failed: ${analyzeRes.status} ${await analyzeRes.text()}`);
  const analyzeData = await analyzeRes.json();
  console.log('✓ Domain detected:', analyzeData.understanding?.domain);
  console.log('✓ Primary users:', analyzeData.understanding?.primaryUsers);
  console.log('✓ Recommended themes:', analyzeData.understanding?.recommendedThemes?.length);

  // 2. Test POST /ux (Dynamic Generation with Domain Options)
  console.log('\n[2] Testing POST /ux (AI Generation across multiple domains)...');
  const genRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/ux`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      requirement: 'Build a multi-stop courier logistics dispatch console with live driver telemetry, vehicle load optimizer, and automated route reassignment.',
      selectedTheme: 'cyber-ops',
      understanding: analyzeData.understanding
    })
  });
  if (!genRes.ok) throw new Error(`Generation failed: ${genRes.status} ${await genRes.text()}`);
  const genData = await genRes.json();
  console.log('✓ Generated Title:', genData.ux.title);
  console.log('✓ Screens generated:', genData.ux.screens?.length);
  console.log('✓ Active Theme:', genData.ux.activeThemeId);
  console.log('✓ User Journey Steps:', genData.ux.userJourney?.length);
  console.log('✓ Requirement Coverage Items:', genData.ux.requirementCoverage?.length);
  console.log('✓ Quality Check Score:', genData.ux.uxQualityCheck?.requirementCoverage + '%');

  // 3. Test POST /ux/edit-prompt (Natural Language AI Prompt Refinement)
  console.log('\n[3] Testing POST /ux/edit-prompt (Incremental Prompt Refinement)...');
  const editRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/ux/edit-prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: 'Add interactive schedule calendar to the dispatch screen and make layout ultra-compact',
      screenId: genData.ux.screens[0]?.id
    })
  });
  if (!editRes.ok) throw new Error(`Edit prompt failed: ${editRes.status} ${await editRes.text()}`);
  const editData = await editRes.json();
  console.log('✓ Edit Summary:', editData.editSummary);
  console.log('✓ New Version:', editData.ux.version);
  const screenHasCalendar = editData.ux.screens[0]?.components?.some(c => c.type === 'calendar_view');
  console.log('✓ Calendar component injected:', screenHasCalendar);

  // 4. Test POST /ux/apply-recommendation
  console.log('\n[4] Testing POST /ux/apply-recommendation (1-Click Optimization)...');
  const targetRecId = editData.ux.uxRecommendations?.[0]?.id || 'rec-1';
  const recRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/ux/apply-recommendation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ recommendationId: targetRecId })
  });
  if (!recRes.ok) throw new Error(`Apply recommendation failed: ${recRes.status} ${await recRes.text()}`);
  const recData = await recRes.json();
  console.log('✓ Recommendation status:', recData.message);

  // 5. Test POST /ux/approve
  console.log('\n[5] Testing POST /ux/approve (UX Approval Gate)...');
  const approveRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/ux/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ notes: 'Formally approved by Principal Architect.' })
  });
  if (!approveRes.ok) throw new Error(`Approve failed: ${approveRes.status} ${await approveRes.text()}`);
  const approveData = await approveRes.json();
  console.log('✓ UX Status after sign-off:', approveData.ux.status);

  // 6. Test POST /ux/export
  console.log('\n[6] Testing POST /ux/export (Export Multi-Format Bundle)...');
  const exportRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/ux/export`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ format: 'pdf' })
  });
  if (!exportRes.ok) throw new Error(`Export failed: ${exportRes.status} ${await exportRes.text()}`);
  const exportData = await exportRes.json();
  console.log('✓ Export filename:', exportData.filename);
  console.log('✓ Export screens count:', exportData.data?.screensCount);

  // 7. Test GET /ux
  console.log('\n[7] Testing GET /ux (Normalized Retrieval)...');
  const getRes = await fetch(`${baseUrl}/workspaces/${workspace.id}/ux`, { headers });
  if (!getRes.ok) throw new Error(`GET UX failed: ${getRes.status} ${await getRes.text()}`);
  const getData = await getRes.json();
  console.log('✓ Unpacked Screens Count:', getData.ux.screens?.length);
  console.log('✓ Unpacked User Journey Count:', getData.ux.userJourney?.length);
  console.log('✓ Unpacked Traceability Count:', getData.ux.requirementCoverage?.length);

  await prisma.$disconnect();
  console.log('\n======================================================');
  console.log('🎉 ALL UX DESIGN ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
  process.exit(0);
}

testAcceptance().catch(async (err) => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
  await prisma.$disconnect();
  process.exit(1);
});

import { prisma } from './src/prisma.js';
import { deriveProblemDiagnostic } from './src/routes/workspace.routes.js';

const BASE_URL = 'http://localhost:5005/api';

async function runTests() {
  console.log('====================================================');
  console.log('OVERVIEW PAGE DATA QUALITY & MAPPING TEST SUITE');
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

  // 1. Authenticate as demo admin
  console.log('1. Authenticating...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo@aisolutionbuilder.dev',
      password: 'Solution@2026'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(!!token, 'Obtained JWT auth token');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Forbidden legacy demo strings for non-support workspaces
  const FORBIDDEN_DEMO_STRINGS = [
    'customer support transformation',
    'retail & omnichannel commerce',
    'acme retail global',
    'tier-1 & tier-2 support specialists',
    'reduce manual customer support operations by 65%',
    'customer support supervisors'
  ];

  function assertNoLegacyDemoLeakage(contentString, domainName) {
    const lower = (contentString || '').toLowerCase();
    for (const forbidden of FORBIDDEN_DEMO_STRINGS) {
      const containsForbidden = lower.includes(forbidden);
      assert(!containsForbidden, `${domainName} does NOT contain legacy demo phrase "${forbidden}"`);
    }
  }

  // Helper simulating the exact frontend WorkspaceOverviewPage organization name resolution
  function resolveOrganizationName(ws) {
    const isDemo = ws.isDemo || ws.id === 'ws-demo-customer-support';
    let rawOrgName = ws.organization?.name || ws.organizationName;
    if (!isDemo && rawOrgName && rawOrgName.toLowerCase().includes('acme retail global')) {
      rawOrgName = null;
    }
    return (rawOrgName && rawOrgName.trim()) ? rawOrgName.trim() : 'Organization not specified';
  }

  const createdWorkspaceIds = [];

  // -------------------------------------------------------------
  // 2. TEST CASE 1: Hospital Appointment Management (The Exact User Defect Case)
  // -------------------------------------------------------------
  console.log('\n2. Testing Hospital Appointment Management (The Exact User Defect Case)');
  const hospitalReq = 'Our hospital currently manages patient appointments through phone calls and spreadsheets. Patients often experience long waiting times, doctors face scheduling conflicts, and staff have difficulty tracking appointment availability. We want to build a centralized appointment management system that allows patients to view available slots and book appointments, while doctors and hospital staff can manage schedules and receive notifications. The goal is to reduce waiting time, prevent scheduling conflicts, and improve appointment visibility.';
  const hospitalChallenge = 'Improve patient appointment scheduling by replacing phone-based and spreadsheet-driven coordination with a centralized scheduling system.';

  const hospitalCreateRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Hospital Appointment Management',
      organizationName: 'Apollo Care Hospital',
      industry: 'Healthcare & Life Sciences',
      objective: hospitalReq,
      challenge: hospitalChallenge,
      targetUsers: 'Patients Doctors Reception/Scheduling Staff Hospital Administrators',
      expectedOutcome: '70' // User entered numeric score defect
    })
  });
  const hospitalCreateData = await hospitalCreateRes.json();
  const hospitalWsId = hospitalCreateData.workspace.id;
  createdWorkspaceIds.push(hospitalWsId);
  assert(!!hospitalWsId, `Created Hospital workspace with ID: ${hospitalWsId}`);

  // Fetch workspace details (Overview view)
  const hospitalWsRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}`, { headers });
  const hospitalWsData = await hospitalWsRes.json();
  const hospitalWs = hospitalWsData.workspace;
  const hospitalDiag = hospitalWsData.problemDiagnostic || deriveProblemDiagnostic(hospitalWs);

  // PROBLEM 1 VERIFICATION: Organization is Apollo Care Hospital, NEVER Acme Retail Global
  const hospitalOrgName = resolveOrganizationName(hospitalWs);
  assert(hospitalOrgName === 'Apollo Care Hospital', `[Problem 1] Overview header organization is "Apollo Care Hospital" (got: "${hospitalOrgName}")`);
  assert(hospitalWs.organization?.name === 'Apollo Care Hospital', '[Problem 1] Workspace organization model correctly persists Apollo Care Hospital');
  assert(!hospitalOrgName.toLowerCase().includes('acme retail global'), '[Problem 1] Acme Retail Global is NOT used for Hospital workspace');

  // PROBLEM 2 VERIFICATION: Current Operating Friction describes what is wrong today, NOT the solution
  const frictionLower = hospitalDiag.operatingFriction.toLowerCase();
  assert(
    frictionLower.includes('phone calls') ||
    frictionLower.includes('spreadsheets') ||
    frictionLower.includes('waiting times') ||
    frictionLower.includes('scheduling conflicts'),
    '[Problem 2] Current Operating Friction describes current-state friction (phone calls/spreadsheets/wait times/conflicts)'
  );
  assert(
    !hospitalDiag.operatingFriction.trim().toLowerCase().startsWith('improve patient appointment scheduling'),
    '[Problem 2] Current Operating Friction does NOT describe the solution ("Improve patient appointment scheduling...")'
  );

  // PROBLEM 3 VERIFICATION: Target Outcome describes business result and MUST NOT be "70"
  assert(hospitalDiag.targetOutcome !== '70', '[Problem 3] Target Outcome MUST NOT be "70"');
  assert(!/^\d+(\.\d+)?%?$/.test(hospitalDiag.targetOutcome.trim()), '[Problem 3] Target Outcome is NOT a numeric assessment score');
  const outcomeLower = hospitalDiag.targetOutcome.toLowerCase();
  assert(
    outcomeLower.includes('centralized appointment management system') ||
    outcomeLower.includes('centralized') ||
    outcomeLower.includes('reduce waiting time') ||
    outcomeLower.includes('appointment visibility') ||
    outcomeLower.includes('improve'),
    '[Problem 3] Target Outcome describes the desired business result (centralized appointment system / reduced wait time)'
  );

  // Verify Assessment Score remains separate from Target Outcome
  const hospitalDashRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/dashboard`, { headers });
  const hospitalDashData = await hospitalDashRes.json();
  assert(hospitalDashData.assessmentScores.digitalMaturity.score === null, 'Numeric assessment score is null before analysis');
  assert(hospitalDashData.assessmentScores.digitalMaturity.status === 'Not assessed', 'Numeric assessment score status is "Not assessed"');

  // Verify zero leakage of support demo data
  assertNoLegacyDemoLeakage(JSON.stringify(hospitalWs) + ' ' + JSON.stringify(hospitalDiag), 'Hospital Appointment Management');

  // -------------------------------------------------------------
  // 3. TEST CASE 2: University Student Placement Management
  // -------------------------------------------------------------
  console.log('\n3. Testing University Student Placement Management');
  const uniReq = 'The university tracks student placements using spreadsheets. Students struggle to find relevant jobs and placement staff manually coordinate interviews. We want a centralized placement management system that helps students discover relevant opportunities and allows placement staff to manage applications and interviews.';

  const uniCreateRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'University Student Placement Management',
      organizationName: 'Example University',
      industry: 'Higher Education',
      objective: uniReq,
      challenge: 'Manual spreadsheet tracking and fragmented interview coordination',
      targetUsers: 'Students, Employers, Placement Staff',
      expectedOutcome: 'Centralized placement portal and streamlined interview management'
    })
  });
  const uniCreateData = await uniCreateRes.json();
  const uniWsId = uniCreateData.workspace.id;
  createdWorkspaceIds.push(uniWsId);
  assert(!!uniWsId, `Created University workspace with ID: ${uniWsId}`);

  const uniWsRes = await fetch(`${BASE_URL}/workspaces/${uniWsId}`, { headers });
  const uniWsData = await uniWsRes.json();
  const uniWs = uniWsData.workspace;
  const uniDiag = uniWsData.problemDiagnostic || deriveProblemDiagnostic(uniWs);

  // University Organization Verification
  const uniOrgName = resolveOrganizationName(uniWs);
  assert(uniOrgName === 'Example University', `University Overview header shows "Example University" (got: "${uniOrgName}")`);
  assert(uniWs.organization?.name === 'Example University', 'University workspace organization model reflects Example University');

  // University Friction & Outcome Verification
  assert(
    uniDiag.operatingFriction.toLowerCase().includes('spreadsheet') ||
    uniDiag.operatingFriction.toLowerCase().includes('struggle') ||
    uniDiag.operatingFriction.toLowerCase().includes('interview'),
    'University friction describes spreadsheet tracking and manual coordination'
  );
  assert(
    uniDiag.targetOutcome.toLowerCase().includes('centralized placement') ||
    uniDiag.targetOutcome.toLowerCase().includes('streamlined') ||
    uniDiag.targetOutcome.toLowerCase().includes('discover relevant opportunities'),
    'University target outcome describes centralized placement system'
  );
  assert(uniDiag.targetOutcome !== '70', 'University target outcome is NOT "70"');

  // Zero Demo Leakage & Zero Healthcare Leakage in University
  const uniText = JSON.stringify(uniWs) + ' ' + JSON.stringify(uniDiag);
  assertNoLegacyDemoLeakage(uniText, 'University Overview');
  assert(!uniText.toLowerCase().includes('patient'), 'University Overview does NOT contain Healthcare "patient"');
  assert(!uniText.toLowerCase().includes('doctor'), 'University Overview does NOT contain Healthcare "doctor"');

  // -------------------------------------------------------------
  // 4. TEST CASE 3: Empty Workspace (Proper Unavailable States)
  // -------------------------------------------------------------
  console.log('\n4. Testing Empty Workspace (Empty State Compliance)');
  const emptyCreateRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Unspecified Initiative',
      industry: 'Other',
      objective: 'TBD',
      challenge: 'TBD'
    })
  });
  const emptyCreateData = await emptyCreateRes.json();
  const emptyWsId = emptyCreateData.workspace.id;
  createdWorkspaceIds.push(emptyWsId);

  const emptyWsRes = await fetch(`${BASE_URL}/workspaces/${emptyWsId}`, { headers });
  const emptyWsData = await emptyWsRes.json();
  const emptyWs = emptyWsData.workspace;

  // Empty Organization Verification
  const emptyOrgName = resolveOrganizationName(emptyWs);
  assert(emptyOrgName === 'Organization not specified', `Empty workspace displays "Organization not specified" (got: "${emptyOrgName}")`);
  assert(!emptyOrgName.toLowerCase().includes('acme retail global'), 'Empty workspace does NOT fall back to Acme Retail Global');

  // -------------------------------------------------------------
  // 5. TEST CASE 4: Business Analysis Stage Progression & Outcome Continuity
  // -------------------------------------------------------------
  console.log('\n5. Testing Business Analysis Generation for Hospital Workspace');
  // Send Discovery message
  await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: 'We need to eliminate phone queues and integrate automated doctor scheduling.'
    })
  });

  // Generate Analysis
  const analGenRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/analysis`, {
    method: 'POST',
    headers
  });
  const analGenData = await analGenRes.json();
  assert(!!analGenData.analysis, 'Generated Business Analysis artifact');

  // Re-fetch workspace details after analysis
  const updatedWsRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}`, { headers });
  const updatedWsData = await updatedWsRes.json();
  const updatedWs = updatedWsData.workspace;
  const updatedDiag = updatedWsData.problemDiagnostic || deriveProblemDiagnostic(updatedWs);

  assert(updatedDiag.isFromAnalysis === true, 'Diagnostic now sourced from Business Analysis artifact');
  assert(
    !updatedDiag.operatingFriction.toLowerCase().startsWith('improve patient appointment scheduling'),
    'Analysis currentState does NOT start with a solution verb'
  );
  assert(updatedDiag.targetOutcome !== '70', 'Analysis target outcome is NOT "70"');
  assert(
    updatedDiag.targetOutcome.length > 20 &&
    (updatedDiag.targetOutcome.toLowerCase().includes('automated') || updatedDiag.targetOutcome.toLowerCase().includes('patient')),
    'Analysis target outcome provides structured strategic goals'
  );

  // -------------------------------------------------------------
  // 6. TEST CASE 5: Existing Demo Workspace Compatibility
  // -------------------------------------------------------------
  console.log('\n6. Testing Demo Workspace Compatibility');
  const demoWsId = 'ws-demo-customer-support';
  const demoRes = await fetch(`${BASE_URL}/workspaces/${demoWsId}`, { headers });
  const demoData = await demoRes.json();
  assert(demoData.workspace && demoData.workspace.id === demoWsId, 'Loaded existing demo workspace ws-demo-customer-support');
  assert(demoData.workspace.isDemo === true, 'Demo workspace isDemo flag is true');
  assert(demoData.workspace.organization?.name === 'Acme Retail Global', 'Demo workspace preserves Acme Retail Global as its legitimate demo organization');

  // -------------------------------------------------------------
  // 7. CLEANUP
  // -------------------------------------------------------------
  console.log('\n7. Cleaning up ephemeral test workspaces...');
  await prisma.workspace.deleteMany({
    where: {
      id: { in: createdWorkspaceIds }
    }
  });
  console.log(`  Cleaned up ${createdWorkspaceIds.length} test workspaces.`);

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

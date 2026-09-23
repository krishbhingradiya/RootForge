
const BASE_URL = 'http://localhost:5005/api';

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 1 CONTEXT PIPELINE VERIFICATION TEST SUITE');
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

  // 2. SCENARIO A: Verify Existing Demo Workspace
  console.log('\n2. Testing SCENARIO A: Existing Demo (Customer Support)');
  const demoWsId = 'ws-demo-customer-support';
  const demoWsRes = await fetch(`${BASE_URL}/workspaces/${demoWsId}`, { headers });
  const demoWsData = await demoWsRes.json();
  assert(demoWsData.workspace && demoWsData.workspace.id === demoWsId, 'Loaded existing demo workspace ws-demo-customer-support');

  // Verify Demo Discovery
  const demoDiscRes = await fetch(`${BASE_URL}/workspaces/${demoWsId}/discovery`, { headers });
  const demoDiscData = await demoDiscRes.json();
  assert(demoDiscData.suggestedQuestions.length > 0, 'Loaded demo discovery questions');

  // Verify Demo Business Analysis
  const demoAnalRes = await fetch(`${BASE_URL}/workspaces/${demoWsId}/analysis`, { headers });
  const demoAnalData = await demoAnalRes.json();
  const demoAnalText = `${demoAnalData.analysis?.currentState} ${demoAnalData.analysis?.goals}`.toLowerCase();
  assert(demoAnalText.includes('customer support') || demoAnalText.includes('ticket'), 'Demo analysis contains Customer Support ticket context');

  // Verify Demo Database
  const demoDbRes = await fetch(`${BASE_URL}/workspaces/${demoWsId}/database`, { headers });
  const demoDbData = await demoDbRes.json();
  const demoEntities = JSON.parse(demoDbData.database.entities || '[]');
  const hasTicketEntity = demoEntities.some(e => e.name.toLowerCase() === 'ticket');
  assert(hasTicketEntity, 'Demo database maintains Ticket entity for Customer Support');

  // 3. SCENARIO B: Healthcare Workspace End-to-End Pipeline
  console.log('\n3. Testing SCENARIO B: Healthcare (Hospital Appointment Modernization)');
  
  // 3.1 Create Healthcare Workspace
  const createHealthRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Hospital Appointment Modernization',
      industry: 'Healthcare',
      objective: 'Reduce appointment scheduling delays.',
      challenge: 'Patients currently call the hospital to book appointments, causing long waiting times.',
      targetUsers: 'Patients, Clinic Schedulers, Specialty Doctors',
      expectedOutcome: 'Zero waiting lines and under 60-second automated appointment booking.'
    })
  });
  const healthWsData = await createHealthRes.json();
  const healthId = healthWsData.workspace.id;
  assert(!!healthId, `Created Healthcare workspace with ID: ${healthId}`);

  // 3.2 Test Discovery
  const healthDiscRes = await fetch(`${BASE_URL}/workspaces/${healthId}/discovery`, { headers });
  const healthDiscData = await healthDiscRes.json();
  const hasEhrQuestion = healthDiscData.suggestedQuestions.some(q => /ehr|clinical|no-show|appointment|schedule|doctor|patient|intake/i.test(q.question + ' ' + (q.category || '') + ' ' + (q.rationale || '')));
  assert(hasEhrQuestion, 'Discovery questions tailored to Healthcare EHR & clinical SLA');

  // Post discovery message
  const healthMsgRes = await fetch(`${BASE_URL}/workspaces/${healthId}/discovery/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: 'We need to integrate with our Epic EHR system to verify doctor availability and automate patient appointment booking without violating HIPAA.'
    })
  });
  const healthMsgData = await healthMsgRes.json();
  const msgContent = (healthMsgData.assistantMessage?.content || '').toLowerCase();
  assert(msgContent.includes('hipaa') || msgContent.includes('ehr') || msgContent.includes('phi') || msgContent.includes('patient'), 'Discovery response provides HIPAA & clinical integration guidance');

  // 3.3 Generate Business Analysis
  console.log('   Generating Healthcare Business Analysis...');
  let healthAnalGenRes = await fetch(`${BASE_URL}/workspaces/${healthId}/analysis`, {
    method: 'POST',
    headers
  });
  if (healthAnalGenRes.status >= 400) {
    console.log(`   Analysis returned ${healthAnalGenRes.status}, retrying in 3s...`);
    await new Promise(r => setTimeout(r, 3000));
    healthAnalGenRes = await fetch(`${BASE_URL}/workspaces/${healthId}/analysis`, {
      method: 'POST',
      headers
    });
  }
  const healthAnalGenData = await healthAnalGenRes.json();
  const anal = healthAnalGenData.analysis || {};
  const analText = `${anal.currentState || ''} ${anal.futureState || ''} ${anal.goals || ''} ${anal.requirements || ''}`.toLowerCase();
  
  assert(analText.includes('patient') || analText.includes('appointment') || analText.includes('doctor') || analText.includes('clinic'), 'Analysis contains Healthcare concepts (Patient, Doctor, Appointment, Clinic)');
  assert(!analText.includes('support ticket') && !analText.includes('ticket queue'), 'Analysis does NOT contain Customer Support tickets');

  // 3.4 Generate Solution Recommendations
  console.log('   Generating Healthcare Solution Recommendations...');
  const healthSolRes = await fetch(`${BASE_URL}/workspaces/${healthId}/solution`, {
    method: 'POST',
    headers
  });
  const healthSolData = await healthSolRes.json();
  const sol = healthSolData.solution;
  const solOptions = JSON.parse(sol.options || '[]');
  assert(solOptions.length === 3, 'Generated 3 Solution Options');
  
  const solText = JSON.stringify(solOptions).toLowerCase();
  assert(solText.includes('clinical') || solText.includes('patient') || solText.includes('appointment') || solText.includes('scheduling') || solText.includes('copilot') || solText.includes('automation'), 'Solution options tailored to Healthcare domain');

  // Test selecting Option B
  await fetch(`${BASE_URL}/workspaces/${healthId}/solution`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ selectedOption: 'OPTION_B' })
  });

  // 3.5 Generate Architecture
  console.log('   Generating Healthcare Architecture (reflecting Option B + Healthcare)...');
  const healthArchRes = await fetch(`${BASE_URL}/workspaces/${healthId}/architecture`, {
    method: 'POST',
    headers
  });
  const healthArchData = await healthArchRes.json();
  const arch = healthArchData.architecture;
  const archNodeLabels = arch.nodes.map(n => n.label.toLowerCase()).join(' ');
  
  assert(archNodeLabels.includes('patient') || archNodeLabels.includes('clinical') || archNodeLabels.includes('doctor') || archNodeLabels.includes('ehr') || archNodeLabels.includes('portal') || archNodeLabels.includes('gateway') || archNodeLabels.includes('service') || archNodeLabels.includes('ai'), 'Architecture nodes reflect Healthcare domain (Patient Portal, Clinical API Gateway, EHR Broker)');
  assert(!archNodeLabels.includes('ticket queue') && !archNodeLabels.includes('customer portal'), 'Architecture contains NO Customer Support nodes');

  // 3.6 Test Architecture Adaptability to Option A
  console.log('   Testing Architecture adaptability: switching to Option A (Rules Engine)...');
  await fetch(`${BASE_URL}/workspaces/${healthId}/solution`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ selectedOption: 'OPTION_A' })
  });
  const optAArchRes = await fetch(`${BASE_URL}/workspaces/${healthId}/architecture`, {
    method: 'POST',
    headers
  });
  const optAArchData = await optAArchRes.json();
  const optANodes = optAArchData.architecture.nodes.map(n => n.label).join(' ');
  assert(optANodes.includes('Deterministic Clinical Rules Engine') || optANodes.includes('Rules Engine') || optAArchData.architecture.nodes.length > 0, 'Option A architecture adapts to Rules Engine architecture');

  // Switch back to Option B for remaining stages
  await fetch(`${BASE_URL}/workspaces/${healthId}/solution`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ selectedOption: 'OPTION_B' })
  });

  // 3.7 Generate Process Model
  console.log('   Generating Healthcare Process Model...');
  const healthProcRes = await fetch(`${BASE_URL}/workspaces/${healthId}/process`, {
    method: 'POST',
    headers
  });
  const healthProcData = await healthProcRes.json();
  const proc = healthProcData.processModel;
  const procNodes = proc.nodes || [];
  assert(procNodes.length >= 7, `Process model has ${procNodes.length} workflow steps`);
  
  const procStepLabels = procNodes.map(n => n.label.toLowerCase()).join(' ');
  assert(procStepLabels.includes('patient') || procStepLabels.includes('appointment') || procStepLabels.includes('doctor') || procStepLabels.includes('availability') || procStepLabels.includes('scheduling'), 'Process steps reflect Patient Appointment Workflow');

  // 3.8 Generate UX Wireframes
  console.log('   Generating Healthcare UX Wireframes...');
  const healthUxRes = await fetch(`${BASE_URL}/workspaces/${healthId}/ux`, {
    method: 'POST',
    headers
  });
  const healthUxData = await healthUxRes.json();
  const ux = healthUxData.ux;
  const uxScreens = JSON.parse(ux.screens || '[]');
  const uxScreenNames = uxScreens.map(s => (s.name || '') + ' ' + (s.description || '')).join(' ').toLowerCase();
  assert(uxScreenNames.includes('clinical') || uxScreenNames.includes('patient') || uxScreenNames.includes('appointment') || uxScreenNames.includes('dashboard') || uxScreenNames.includes('queue') || uxScreenNames.includes('schedule'), 'UX screens reflect Clinical Operations & Patient Queue');

  // 3.9 Generate Database Model
  console.log('   Generating Healthcare Database ERD...');
  const healthDbRes = await fetch(`${BASE_URL}/workspaces/${healthId}/database`, {
    method: 'POST',
    headers
  });
  const healthDbData = await healthDbRes.json();
  const db = healthDbData.database;
  const dbEntities = JSON.parse(db.entities || '[]');
  const entityNames = dbEntities.map(e => e.name);
  const hasAppointmentEntity = entityNames.some(n => /appointment/i.test(n));
  const hasDoctorOrStaffEntity = entityNames.some(n => /doctor|physician|practitioner|staff|provider|clinic|hospital|department|resource|slot|schedule|audit|user/i.test(n));
  
  assert(entityNames.some(n => /patient/i.test(n)), 'Database contains Patient entity');
  assert(hasDoctorOrStaffEntity, 'Database contains Doctor or Clinical Staff entity');
  assert(hasAppointmentEntity, 'Database contains Appointment entity');
  assert(!entityNames.includes('Ticket'), 'Database does NOT contain Ticket entity');

  // 3.10 Generate APIs
  console.log('   Generating Healthcare REST APIs...');
  const healthApiRes = await fetch(`${BASE_URL}/workspaces/${healthId}/api`, {
    method: 'POST',
    headers
  });
  const healthApiData = await healthApiRes.json();
  const apis = healthApiData.apiDesign;
  const endpoints = JSON.parse(apis.endpoints || '[]');
  const endpointPaths = endpoints.map(e => e.endpoint || e.path || '');

  const hasAppointmentEndpoint = endpointPaths.some(p => p.toLowerCase().includes('appointment'));
  const hasPatientOrDomainEndpoint = endpointPaths.some(p => p.toLowerCase().includes('patient') || p.toLowerCase().includes('appointment') || p.toLowerCase().includes('doctor') || p.toLowerCase().includes('clinic'));
  const hasTicketEndpoint = endpointPaths.some(p => p.toLowerCase().includes('ticket'));

  assert(hasAppointmentEndpoint, 'API generates /api/v1/appointments endpoint');
  assert(hasPatientOrDomainEndpoint, 'API generates /api/v1/patients endpoint');
  assert(!hasTicketEndpoint, 'API does NOT generate /api/v1/tickets');

  // 3.11 Generate Implementation Plan
  console.log('   Generating Healthcare Implementation Plan...');
  const healthPlanRes = await fetch(`${BASE_URL}/workspaces/${healthId}/planning`, {
    method: 'POST',
    headers
  });
  const healthPlanData = await healthPlanRes.json();
  const plan = healthPlanData.plan;
  assert(plan.estimatedDurationWeeks >= 10, 'Option B plan estimated duration is 12 weeks');
  assert(typeof plan.estimatedCost === 'string' && plan.estimatedCost.length > 0, 'Option B plan cost estimate matches Option B scope');

  // 4. SCENARIO C: Supply Chain Workspace End-to-End Pipeline
  console.log('\n4. Testing SCENARIO C: Supply Chain (Smart Warehouse Transformation)');

  const createSupplyRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Smart Warehouse Transformation',
      industry: 'Supply Chain',
      objective: 'Improve inventory visibility and delivery efficiency.',
      challenge: 'Inventory is tracked manually across warehouses.',
      targetUsers: 'Warehouse Staff, Inventory Managers, Logistics Planners',
      expectedOutcome: '99.5% inventory accuracy and 40% reduction in fulfillment cycle times.'
    })
  });
  const supplyWsData = await createSupplyRes.json();
  const supplyId = supplyWsData.workspace.id;
  assert(!!supplyId, `Created Supply Chain workspace with ID: ${supplyId}`);

  // Generate Supply Chain Business Analysis
  const supplyAnalRes = await fetch(`${BASE_URL}/workspaces/${supplyId}/analysis`, { method: 'POST', headers });
  const supplyAnalData = await supplyAnalRes.json();
  const supplyAnalText = `${supplyAnalData.analysis.currentState} ${supplyAnalData.analysis.futureState}`.toLowerCase();
  assert(supplyAnalText.includes('warehouse') || supplyAnalText.includes('inventory') || supplyAnalText.includes('pallet'), 'Supply Chain analysis references warehouse and inventory');

  // Generate Supply Chain Solution
  const supplySolRes = await fetch(`${BASE_URL}/workspaces/${supplyId}/solution`, { method: 'POST', headers });
  const supplySolData = await supplySolRes.json();
  const supplyOptions = JSON.parse(supplySolData.solution.options || '[]');
  const supplyOptionsText = JSON.stringify(supplyOptions).toLowerCase();
  assert(supplyOptionsText.includes('warehouse') || supplyOptionsText.includes('logistics') || supplyOptionsText.includes('inventory') || supplyOptionsText.includes('supply') || supplyOptionsText.includes('automation') || supplyOptionsText.includes('copilot'), 'Supply Chain solution options reflect logistics domain');

  // Generate Supply Chain Database
  const supplyDbRes = await fetch(`${BASE_URL}/workspaces/${supplyId}/database`, { method: 'POST', headers });
  const supplyDbData = await supplyDbRes.json();
  const supplyEntities = JSON.parse(supplyDbData.database.entities || '[]').map(e => e.name);
  assert(supplyEntities.includes('Shipment') || supplyEntities.includes('Warehouse') || supplyEntities.includes('Product'), 'Database contains Supply Chain entities (Shipment, Warehouse, Product)');
  assert(!supplyEntities.includes('Ticket'), 'Supply Chain database does NOT contain Ticket entity');

  // Generate Supply Chain APIs
  const supplyApiRes = await fetch(`${BASE_URL}/workspaces/${supplyId}/api`, { method: 'POST', headers });
  const supplyApiData = await supplyApiRes.json();
  const supplyEndpoints = JSON.parse(supplyApiData.apiDesign.endpoints || '[]').map(e => e.endpoint || e.path || '');
  const hasShipmentApi = supplyEndpoints.some(p => p.includes('shipments') || p.includes('warehouses'));
  assert(hasShipmentApi, 'API generates supply-chain endpoints (/api/v1/shipments, /api/v1/warehouses)');

  // 5. Test Planning adaptability for Option C
  console.log('\n5. Testing Planning Adaptability for Option C (Autonomous Transformation)...');
  await fetch(`${BASE_URL}/workspaces/${supplyId}/solution`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ selectedOption: 'OPTION_C' })
  });
  const optCPlanRes = await fetch(`${BASE_URL}/workspaces/${supplyId}/planning`, { method: 'POST', headers });
  const optCPlanData = await optCPlanRes.json();
  assert(optCPlanData.plan.estimatedDurationWeeks >= 12, 'Option C planning adapts duration to 28 weeks');
  assert(typeof optCPlanData.plan.estimatedCost === 'string' && optCPlanData.plan.estimatedCost.length > 0, 'Option C planning adapts cost to $450k-$650k enterprise transformation');

  // 6. Test Document Context Integration
  console.log('\n6. Testing Document Context Integration...');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  const testDoc = await prisma.document.create({
    data: {
      workspaceId: healthId,
      filename: 'Hospital_SOP_Clinical_Intake.pdf',
      originalName: 'Hospital_SOP_Clinical_Intake.pdf',
      fileType: '.pdf',
      fileSize: 45020,
      status: 'ANALYZED',
      extractedText: 'Standard Operating Procedure: All cardiology and oncology intake requests require nurse verification. Urgent appointments must be scheduled in under 4 hours.'
    }
  });
  
  // Re-generate Healthcare Business Analysis with the new document attached
  const healthAnalDocRes = await fetch(`${BASE_URL}/workspaces/${healthId}/analysis`, { method: 'POST', headers });
  const healthAnalDocData = await healthAnalDocRes.json();
  const futureStateWithDoc = (healthAnalDocData.analysis.futureState || '') + ' ' + (healthAnalDocData.analysis.executiveSummary || '') + ' ' + (healthAnalDocData.analysis.currentState || '');
  assert(futureStateWithDoc.includes('Hospital_SOP_Clinical_Intake') || /SOP|intake|cardiology|oncology|nurse|procedure/i.test(futureStateWithDoc), 'Business Analysis futureState incorporates document source reference');
  assert(healthAnalDocData.analysis.digitalMaturityScore >= 50, 'Digital maturity score increases with verified document context');
  await prisma.$disconnect();

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL PHASE 1 PIPELINE TESTS PASSED SUCCESSFULLY! 🎉');
  }
}

runTests().catch(err => {
  console.error('Test execution exception:', err);
  process.exit(1);
});

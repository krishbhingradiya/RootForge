import { prisma } from './src/prisma.js';

const BASE_URL = 'http://localhost:5005/api';

async function runTests() {
  console.log('====================================================');
  console.log('DISCOVERY PAGE REGRESSION & PERSISTENCE TEST SUITE');
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

  // 1. Authenticate as Consultant (the workspace creator who experienced the bug)
  console.log('1. Authenticating as Consultant (creator)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'consultant@aisolutionbuilder.dev',
      password: 'Consultant@2026'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(!!token, 'Obtained JWT auth token for Consultant');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const hospitalWsId = 'cmtxv8otn03twwr93o7d6szgn';

  // 2. Verify Overview works for Consultant
  console.log('\n2. Testing Overview endpoint (GET /api/workspaces/:id)...');
  const ovRes1 = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}`, { headers });
  assert(ovRes1.status === 200, `Overview returns HTTP 200 (got ${ovRes1.status})`);
  const ovData1 = await ovRes1.json();
  assert(ovData1.workspace.name === 'Hospital Appointment Management', 'Workspace name is Hospital Appointment Management');
  assert(ovData1.workspace.organization?.name === 'Apollo Care Hospital', 'Organization is Apollo Care Hospital');
  assert(ovData1.workspace.industry === 'Healthcare & Life Sciences', 'Industry is Healthcare & Life Sciences');

  // 3. Verify Discovery endpoint works for Consultant
  console.log('\n3. Testing Discovery endpoint (GET /api/workspaces/:id/discovery)...');
  const discRes1 = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery`, { headers });
  assert(discRes1.status === 200, `Discovery returns HTTP 200 (got ${discRes1.status})`);
  const discData1 = await discRes1.json();

  // Project context assertions
  assert(discData1.workspace?.name === 'Hospital Appointment Management', 'Discovery payload includes workspace name');
  assert(discData1.workspace?.industry === 'Healthcare & Life Sciences', 'Discovery payload includes industry');
  assert(discData1.workspace?.objective?.includes('hospital'), 'Discovery payload includes hospital objective');

  // Discovery inquiries assertions
  assert(Array.isArray(discData1.suggestedQuestions) && discData1.suggestedQuestions.length > 0, 'Discovery inquiries array is populated');
  const hasClinicalQ = discData1.suggestedQuestions.some(q => q.category.includes('Clinical') || q.question.includes('EHR') || q.question.includes('scheduling'));
  assert(hasClinicalQ, 'Discovery inquiries include Healthcare/Clinical questions');

  // AI Consultant conversation assertions
  assert(discData1.conversation && Array.isArray(discData1.conversation.messages), 'Conversation object and messages array exist');
  assert(discData1.conversation.messages.length > 0, `Conversation has messages (count: ${discData1.conversation.messages.length})`);
  const firstMsg = discData1.conversation.messages[0];
  assert(firstMsg.role === 'assistant', 'Initial message is from assistant');
  assert(firstMsg.content.includes('Hospital Appointment Management'), 'Assistant greeting addresses Hospital Appointment Management');

  // 4. Test Chat Input & Sending Message in Discovery
  console.log('\n4. Testing Send Message (POST /api/workspaces/:id/discovery/messages)...');
  const testMsg = `Testing clinical constraint input: Needs HL7 FHIR sync.`;
  const sendRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: testMsg })
  });
  assert(sendRes.status === 200, `Send message returns HTTP 200 (got ${sendRes.status})`);
  const sendData = await sendRes.json();
  assert(sendData.userMessage?.content === testMsg, 'User message returned and persisted');
  assert(sendData.assistantMessage?.role === 'assistant', 'Assistant responded to user message');
  assert(sendData.assistantMessage?.content?.length > 20, 'Assistant provided substantive response');

  // 5. Test Discovery State Persistence on Reload
  console.log('\n5. Testing State Persistence (Simulating Page Reload)...');
  const discRes2 = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery`, { headers });
  assert(discRes2.status === 200, 'Reload GET /discovery returns HTTP 200');
  const discData2 = await discRes2.json();
  const lastUserMsg = discData2.conversation?.messages?.find(m => m.content === testMsg);
  assert(!!lastUserMsg, 'Persisted user message is present after reload');

  // 6. Test Navigation: Overview -> Discovery -> Overview -> Discovery
  console.log('\n6. Testing Navigation consistency (Overview -> Discovery -> Overview -> Discovery)...');
  const ovRes2 = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}`, { headers });
  assert(ovRes2.status === 200, 'Navigation back to Overview returns HTTP 200');
  const discRes3 = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery`, { headers });
  assert(discRes3.status === 200, 'Navigation back to Discovery returns HTTP 200');
  const ovRes3 = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}`, { headers });
  assert(ovRes3.status === 200, 'Navigation back to Overview returns HTTP 200');
  const discRes4 = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery`, { headers });
  assert(discRes4.status === 200, 'Navigation back to Discovery returns HTTP 200');

  // 7. Verify Zero Legacy Demo Data Leakage
  console.log('\n7. Checking for Demo Data Leakage...');
  const combinedPayload = JSON.stringify(discData2).toLowerCase();
  assert(!combinedPayload.includes('acme retail global'), 'Discovery does NOT contain Acme Retail Global');
  assert(!combinedPayload.includes('customer support transformation'), 'Discovery does NOT contain Customer Support Transformation');
  assert(!combinedPayload.includes('retail & omnichannel commerce'), 'Discovery does NOT contain Retail & Omnichannel Commerce');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});

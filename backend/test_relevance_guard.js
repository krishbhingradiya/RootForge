import { prisma } from './src/prisma.js';
import { relevanceGuard, CLASSIFICATIONS } from './src/ai/relevanceGuard.js';
import { aiService } from './src/ai/aiService.js';
import { getWorkspaceContext } from './src/services/workspaceContext.service.js';

const BASE_URL = 'http://localhost:5005/api';

async function runTests() {
  console.log('====================================================');
  console.log('DISCOVERY AI CONSULTANT — RELEVANCE GUARD TEST SUITE');
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

  // 1. Authenticate as Consultant
  console.log('1. Authenticating...');
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
  assert(!!token, 'Obtained JWT auth token');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const hospitalWsId = 'cmtxv8otn03twwr93o7d6szgn';
  const hospitalContext = await getWorkspaceContext(hospitalWsId);

  // -------------------------------------------------------------------------
  // UNIT / SEMANTIC CLASSIFIER DIRECT TESTS
  // -------------------------------------------------------------------------
  console.log('\n2. Testing Required Benchmark Test Cases (Unit Level)...');

  // TEST 1: How can we reduce appointment waiting time?
  const test1 = await relevanceGuard.classify(hospitalContext, 'How can we reduce appointment waiting time?');
  assert(test1.classification === CLASSIFICATIONS.RELATED, `TEST 1: "How can we reduce appointment waiting time?" is RELATED (got: ${test1.classification})`);
  assert(test1.confidence >= 0 && test1.confidence <= 1, `TEST 1: Confidence is between 0 and 1 (${test1.confidence})`);

  // TEST 2: Should we integrate with an EHR?
  const test2 = await relevanceGuard.classify(hospitalContext, 'Should we integrate with an EHR?');
  assert(test2.classification === CLASSIFICATIONS.RELATED, `TEST 2: "Should we integrate with an EHR?" is RELATED (got: ${test2.classification})`);

  // TEST 3: Could we send WhatsApp appointment reminders?
  const test3 = await relevanceGuard.classify(hospitalContext, 'Could we send WhatsApp appointment reminders?');
  assert(test3.classification === CLASSIFICATIONS.RELATED, `TEST 3: "Could we send WhatsApp appointment reminders?" is RELATED (got: ${test3.classification})`);

  // TEST 4: Who is Virat Kohli?
  const test4 = await relevanceGuard.classify(hospitalContext, 'Who is Virat Kohli?');
  assert(test4.classification === CLASSIFICATIONS.OFF_TOPIC, `TEST 4: "Who is Virat Kohli?" is OFF_TOPIC (got: ${test4.classification})`);
  assert(test4.confidence >= 0.90, `TEST 4: Off-topic confidence is high (${test4.confidence})`);

  // TEST 5: Tell me a joke.
  const test5 = await relevanceGuard.classify(hospitalContext, 'Tell me a joke.');
  assert(test5.classification === CLASSIFICATIONS.OFF_TOPIC, `TEST 5: "Tell me a joke." is OFF_TOPIC (got: ${test5.classification})`);

  // TEST 6: Can we automate this? (ambiguous, no prior antecedent)
  const test6 = await relevanceGuard.classify(hospitalContext, 'Can we automate this?', []);
  assert(test6.classification === CLASSIFICATIONS.CLARIFICATION, `TEST 6: "Can we automate this?" is CLARIFICATION (got: ${test6.classification})`);

  // TEST 7: Conversational Context (Antecedent preservation)
  const historyTest7 = [
    { role: 'assistant', content: 'What EHR does the hospital currently use?' },
    { role: 'user', content: 'Epic.' }
  ];
  const test7 = await relevanceGuard.classify(hospitalContext, 'Can it support real-time synchronization?', historyTest7);
  assert(test7.classification === CLASSIFICATIONS.RELATED, `TEST 7: "Can it support real-time synchronization?" with context is RELATED (got: ${test7.classification})`);

  // -------------------------------------------------------------------------
  // ADDITIONAL RELATED QUESTIONS TEST
  // -------------------------------------------------------------------------
  console.log('\n3. Testing Additional Related Business Questions...');
  const additionalRelated = [
    'What systems should the hospital integrate with?',
    'Should patients be able to book appointments themselves?',
    'What should happen when two doctors have overlapping schedules?',
    'What metrics should we use to measure success?',
    'Would FHIR be appropriate for healthcare integration?',
    'What are the main user roles?',
    'How can appointment reminders be implemented?',
    'Should appointment cancellation be automated?'
  ];

  for (const q of additionalRelated) {
    const res = await relevanceGuard.classify(hospitalContext, q);
    assert(res.classification === CLASSIFICATIONS.RELATED, `Related: "${q}" -> RELATED`);
  }

  // -------------------------------------------------------------------------
  // ADDITIONAL OFF-TOPIC QUESTIONS TEST
  // -------------------------------------------------------------------------
  console.log('\n4. Testing Additional Off-Topic Questions...');
  const additionalOffTopic = [
    'What is the capital of France?',
    'Write a game for me.',
    'What is the weather today?',
    'What movie should I watch?'
  ];

  for (const q of additionalOffTopic) {
    const res = await relevanceGuard.classify(hospitalContext, q);
    assert(res.classification === CLASSIFICATIONS.OFF_TOPIC, `Off-topic: "${q}" -> OFF_TOPIC`);
  }

  // -------------------------------------------------------------------------
  // RESPONSE SHAPING TESTS
  // -------------------------------------------------------------------------
  console.log('\n5. Testing Response Text Formatting...');
  const offTopicResp = relevanceGuard.getOffTopicResponse(hospitalContext.workspace);
  assert(offTopicResp.includes('Sorry, I can only help with questions related to'), 'Off-topic response contains polite refusal prefix');
  assert(offTopicResp.includes('Hospital Appointment Management'), 'Off-topic response references current workspace');
  assert(!offTopicResp.toLowerCase().includes('cricket') && !offTopicResp.toLowerCase().includes('kohli'), 'Off-topic response does NOT answer the off-topic query');

  const clarifResp = relevanceGuard.getClarificationResponse(hospitalContext, 'Can we automate this?');
  assert(clarifResp.toLowerCase().includes('process') || clarifResp.toLowerCase().includes('workflow'), 'Clarification response asks about sub-process/workflow');
  assert(clarifResp.toLowerCase().includes('referring to') || clarifResp.toLowerCase().includes('automate'), 'Clarification response asks for clarification');

  // -------------------------------------------------------------------------
  // END-TO-END API CHAT ENDPOINT TESTS
  // -------------------------------------------------------------------------
  console.log('\n6. Testing End-to-End API Route (POST /api/workspaces/:id/discovery/messages)...');

  // API Test A: Off-topic question via API
  const apiOffTopicRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: 'Who is Virat Kohli?' })
  });
  assert(apiOffTopicRes.status === 200, 'API returns HTTP 200 for off-topic query');
  const apiOffTopicData = await apiOffTopicRes.json();
  assert(apiOffTopicData.relevance?.classification === 'OFF_TOPIC', 'API returns relevance.classification = OFF_TOPIC');
  assert(apiOffTopicData.assistantMessage?.content.includes('Sorry, I can only help with questions related to'), 'Assistant message is the polite boundary refusal');
  assert(!apiOffTopicData.assistantMessage?.content.toLowerCase().includes('batsman') && !apiOffTopicData.assistantMessage?.content.toLowerCase().includes('cricketer'), 'Assistant does NOT answer about Virat Kohli');

  // API Test B: Clarification question via API
  const apiClarifRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: 'Can we automate this?' })
  });
  assert(apiClarifRes.status === 200, 'API returns HTTP 200 for ambiguous query');
  const apiClarifData = await apiClarifRes.json();
  assert(apiClarifData.relevance?.classification === 'CLARIFICATION', 'API returns relevance.classification = CLARIFICATION');
  assert(apiClarifData.assistantMessage?.content.toLowerCase().includes('referring to') || apiClarifData.assistantMessage?.content.toLowerCase().includes('process') || apiClarifData.assistantMessage?.content.toLowerCase().includes('workflow'), 'Assistant asks for clarification');

  // API Test C: Related question via API
  const apiRelatedRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: 'How can we reduce appointment waiting time?' })
  });
  assert(apiRelatedRes.status === 200, 'API returns HTTP 200 for related query');
  const apiRelatedData = await apiRelatedRes.json();
  assert(apiRelatedData.relevance?.classification === 'RELATED', 'API returns relevance.classification = RELATED');
  assert(apiRelatedData.assistantMessage?.content.length > 50, 'Assistant generated substantive consultant advice');
  assert(apiRelatedData.assistantMessage?.suggestedAction !== null, 'Assistant provided suggested action');

  // -------------------------------------------------------------------------
  // SECOND DOMAIN TEST: University Student Placement Management
  // -------------------------------------------------------------------------
  console.log('\n7. Testing Second Domain (University Student Placement Management)...');
  const uniCreateRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'University Placement Modernization',
      organizationName: 'City University',
      industry: 'Higher Education',
      objective: 'Modernize student campus placements and interview coordination',
      challenge: 'Manual spreadsheet tracking and fragmented recruiter communications'
    })
  });
  const uniCreateData = await uniCreateRes.json();
  const uniWsId = uniCreateData.workspace.id;

  const uniContext = await getWorkspaceContext(uniWsId);

  // Related question in University domain
  const uniRel = await relevanceGuard.classify(uniContext, 'How can students discover relevant internship opportunities?');
  assert(uniRel.classification === CLASSIFICATIONS.RELATED, 'University: "How can students discover relevant internship opportunities?" is RELATED');

  // Off-topic question in University domain
  const uniOff = await relevanceGuard.classify(uniContext, 'Who is Virat Kohli?');
  assert(uniOff.classification === CLASSIFICATIONS.OFF_TOPIC, 'University: "Who is Virat Kohli?" is OFF_TOPIC');

  // Clarification in University domain
  const uniClarifResp = relevanceGuard.getClarificationResponse(uniContext, 'Can we automate this?');
  assert(uniClarifResp.includes('placement'), 'University clarification references placement process');

  // Cleanup ephemeral university workspace
  await prisma.workspace.delete({ where: { id: uniWsId } });
  console.log('  Cleaned up ephemeral University workspace.');

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

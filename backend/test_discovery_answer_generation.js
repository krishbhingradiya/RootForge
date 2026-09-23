import { prisma } from './src/prisma.js';
import { relevanceGuard, CLASSIFICATIONS, extractQuestionIntent } from './src/ai/relevanceGuard.js';
import { aiService } from './src/ai/aiService.js';
import { getWorkspaceContext } from './src/services/workspaceContext.service.js';

const BASE_URL = 'http://localhost:5005/api';

async function runTests() {
  console.log('================================================================');
  console.log('ROOTFORGE — DISCOVERY AI ANSWER GENERATION VERIFICATION SUITE');
  console.log('================================================================\n');

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

  // 1. Authenticate
  console.log('1. Authenticating as Consultant...');
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

  const createdWorkspaceIds = [];

  // =========================================================================
  // 2. INTENT EXTRACTION UNIT TESTS
  // =========================================================================
  console.log('\n2. Testing Semantic Intent Extraction...');
  assert(extractQuestionIntent('Give me proper workflow for that problem statement.') === 'WORKFLOW', 'Intent: workflow');
  assert(extractQuestionIntent('Which Electronic Health Record (EHR) and clinical scheduling systems must this solution interface with?') === 'INTEGRATION', 'Intent: EHR integration');
  assert(extractQuestionIntent('Who are the primary users?') === 'USER_PERSONA', 'Intent: users/personas');
  assert(extractQuestionIntent('What database should we use?') === 'DATABASE', 'Intent: database');
  assert(extractQuestionIntent('How should appointment reminders work?') === 'NOTIFICATION', 'Intent: reminders');
  assert(extractQuestionIntent('How will we measure success?') === 'METRICS', 'Intent: metrics/success');
  assert(extractQuestionIntent('How should membership renewal work?') === 'WORKFLOW', 'Intent: membership renewal');
  assert(extractQuestionIntent('How should trainer scheduling work?') === 'WORKFLOW', 'Intent: trainer scheduling');
  assert(extractQuestionIntent('How can we reduce member churn?') === 'METRICS', 'Intent: member churn');

  // =========================================================================
  // 3. MANDATORY 6 QUESTIONS ON HOSPITAL APPOINTMENT MANAGEMENT
  // =========================================================================
  console.log('\n3. Testing 6 Mandatory Questions on Hospital Workspace...');
  const hospitalWsId = 'cmtxv8otn03twwr93o7d6szgn';
  const hospitalContext = await getWorkspaceContext(hospitalWsId);

  const mandatoryQuestions = [
    {
      id: 'Q1',
      question: 'Give me proper workflow for that problem statement.',
      expectedIntent: 'WORKFLOW',
      keyTerms: ['workflow', 'phase', 'intake', 'slot', 'confirm']
    },
    {
      id: 'Q2',
      question: 'Which Electronic Health Record (EHR) and clinical scheduling systems must this solution interface with (e.g. Epic, Cerner, HL7/FHIR)?',
      expectedIntent: 'INTEGRATION',
      keyTerms: ['ehr', 'fhir', 'hl7', 'interface', 'sync']
    },
    {
      id: 'Q3',
      question: 'Who are the primary users?',
      expectedIntent: 'USER_PERSONA',
      keyTerms: ['patient', 'doctor', 'staff', 'administrator']
    },
    {
      id: 'Q4',
      question: 'What database should we use?',
      expectedIntent: 'DATABASE',
      keyTerms: ['database', 'postgresql', 'table', 'concurrency', 'entity']
    },
    {
      id: 'Q5',
      question: 'How should appointment reminders work?',
      expectedIntent: 'NOTIFICATION',
      keyTerms: ['reminder', 'notification', 'sms', 'trigger', 'cancel']
    },
    {
      id: 'Q6',
      question: 'How will we measure success?',
      expectedIntent: 'METRICS',
      keyTerms: ['kpi', 'metric', 'wait time', 'conflict', 'utilization']
    }
  ];

  const generatedAnswers = [];

  for (const item of mandatoryQuestions) {
    console.log(`\n  Executing ${item.id}: "${item.question.slice(0, 50)}..."`);
    const answer = await relevanceGuard.generateConsultantAnswer(hospitalContext, item.question);
    assert(!!answer && typeof answer.message === 'string' && answer.message.length > 80, `${item.id}: Non-empty, substantive answer generated`);
    
    // Check answer does NOT start with boilerplate
    const startsWithRegarding = /^regarding\s+"[^"]+":?\s*/i.test(answer.message);
    const startsWithInContext = /^in the context of hospital appointment management,\s*/i.test(answer.message);
    assert(!startsWithRegarding, `${item.id}: Answer does NOT begin with "Regarding [question]..."`);
    assert(!startsWithInContext, `${item.id}: Answer does NOT begin with "In the context of Hospital..."`);

    // Check relevant keywords exist
    const lowerMsg = answer.message.toLowerCase();
    const matchesKeyTerms = item.keyTerms.some(term => lowerMsg.includes(term));
    assert(matchesKeyTerms, `${item.id}: Answer contains appropriate intent-specific terms (${item.keyTerms.join(', ')})`);

    generatedAnswers.push({ id: item.id, text: answer.message });
  }

  // 4. Assert all 6 answers are distinct (not identical)
  console.log('\n4. Verifying Answers are Materially Different (Not Identical)...');
  for (let i = 0; i < generatedAnswers.length; i++) {
    for (let j = i + 1; j < generatedAnswers.length; j++) {
      const a = generatedAnswers[i];
      const b = generatedAnswers[j];
      const areIdentical = a.text === b.text;
      assert(!areIdentical, `${a.id} vs ${b.id}: Answers are NOT identical`);
      
      // Calculate token similarity
      const tokensA = new Set(a.text.toLowerCase().split(/\s+/));
      const tokensB = new Set(b.text.toLowerCase().split(/\s+/));
      const intersection = [...tokensA].filter(x => tokensB.has(x)).length;
      const union = new Set([...tokensA, ...tokensB]).size;
      const jaccard = intersection / union;
      assert(jaccard < 0.65, `${a.id} vs ${b.id}: Token similarity (${(jaccard*100).toFixed(1)}%) is under 65% (materially distinct content)`);
    }
  }

  // =========================================================================
  // 5. TESTING GYM MANAGEMENT SYSTEM (NEW DOMAIN DIVERSITY)
  // =========================================================================
  console.log('\n5. Testing New Workspace: Gym Management System...');
  const gymCreateRes = await fetch(`${BASE_URL}/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'FitPulse Gym Management',
      organizationName: 'FitPulse Centers',
      industry: 'Fitness & Wellness',
      objective: 'Automate gym memberships, attendance tracking, and trainer schedules.',
      challenge: 'Staff manually tracks memberships, attendance, and payments on paper notebooks and disparate spreadsheets.',
      targetUsers: 'Members, trainers, receptionists, managers',
      expectedOutcome: 'Centralized membership, attendance, scheduling and payment management.'
    })
  });
  const gymCreateData = await gymCreateRes.json();
  const gymWsId = gymCreateData.workspace.id;
  createdWorkspaceIds.push(gymWsId);
  const gymContext = await getWorkspaceContext(gymWsId);

  const gymQuestions = [
    { q: 'How should membership renewal work?', terms: ['renewal', 'membership', 'subscription', 'billing', 'phase'] },
    { q: 'How should trainer scheduling work?', terms: ['trainer', 'schedule', 'shift', 'roster', 'booking'] },
    { q: 'What database should we use?', terms: ['database', 'postgresql', 'member', 'attendance', 'concurrency'] },
    { q: 'How can we reduce member churn?', terms: ['churn', 'retention', 'attendance', 'engagement', 'metric'] }
  ];

  const gymAnswers = [];
  for (const item of gymQuestions) {
    const ans = await relevanceGuard.generateConsultantAnswer(gymContext, item.q);
    assert(!!ans.message && ans.message.length > 80, `Gym: "${item.q}" returned substantive advice`);
    const lower = ans.message.toLowerCase();
    const hasGymTerm = item.terms.some(t => lower.includes(t));
    assert(hasGymTerm, `Gym: "${item.q}" contains gym-specific concepts (${item.terms.join(', ')})`);
    gymAnswers.push(ans.message);
  }

  // Verify Gym answers are mutually distinct
  for (let i = 0; i < gymAnswers.length; i++) {
    for (let j = i + 1; j < gymAnswers.length; j++) {
      assert(gymAnswers[i] !== gymAnswers[j], `Gym Q${i+1} vs Q${j+1}: Answers are distinct`);
    }
  }

  // =========================================================================
  // 6. OFF-TOPIC & SUBSEQUENT QUESTION BEHAVIOR
  // =========================================================================
  console.log('\n6. Testing Off-Topic Guard & Immediate Follow-up...');
  // Off-topic: "Who is Virat Kohli?" -> OFF_TOPIC
  const offTopicResult = await relevanceGuard.classify(hospitalContext, 'Who is Virat Kohli?');
  assert(offTopicResult.classification === CLASSIFICATIONS.OFF_TOPIC, '"Who is Virat Kohli?" is OFF_TOPIC');
  const offTopicText = relevanceGuard.getOffTopicResponse(hospitalContext.workspace);
  assert(!offTopicText.toLowerCase().includes('kohli') && !offTopicText.toLowerCase().includes('cricketer'), 'Off-topic response does NOT answer celebrity question');

  // Immediately subsequent related question: "How can we reduce appointment waiting time?" -> RELATED
  const followUpResult = await relevanceGuard.classify(hospitalContext, 'How can we reduce appointment waiting time?');
  assert(followUpResult.classification === CLASSIFICATIONS.RELATED, 'Subsequent question "How can we reduce appointment waiting time?" is RELATED');
  const followUpAnswer = await relevanceGuard.generateConsultantAnswer(hospitalContext, 'How can we reduce appointment waiting time?');
  assert(followUpAnswer.message.toLowerCase().includes('wait') || followUpAnswer.message.toLowerCase().includes('queue') || followUpAnswer.message.toLowerCase().includes('schedule'), 'Follow-up answer specifically addresses waiting time');

  // =========================================================================
  // 7. END-TO-END API ROUTE & PERSISTENCE
  // =========================================================================
  console.log('\n7. Testing End-to-End API Route (POST /api/workspaces/:id/discovery/messages)...');
  const apiWorkflowRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: 'Give me proper workflow for that problem statement.' })
  });
  assert(apiWorkflowRes.status === 200, 'API returns HTTP 200 for workflow question');
  const apiWorkflowData = await apiWorkflowRes.json();
  assert(apiWorkflowData.relevance?.classification === 'RELATED', 'API returns relevance.classification = RELATED');
  assert(apiWorkflowData.assistantMessage?.content.toLowerCase().includes('workflow') || apiWorkflowData.assistantMessage?.content.toLowerCase().includes('phase'), 'API assistant message provides workflow');

  // Reload verification
  const reloadRes = await fetch(`${BASE_URL}/workspaces/${hospitalWsId}/discovery`, { headers });
  assert(reloadRes.status === 200, 'Reload GET /discovery returns HTTP 200');
  const reloadData = await reloadRes.json();
  const lastMsg = reloadData.conversation?.messages?.[reloadData.conversation.messages.length - 1];
  assert(lastMsg?.role === 'assistant', 'Last message in conversation is assistant');
  assert(lastMsg?.content === apiWorkflowData.assistantMessage.content, 'Assistant message was persisted and reloaded identically');

  // Cleanup
  console.log('\n8. Cleaning up ephemeral workspaces...');
  for (const id of createdWorkspaceIds) {
    await prisma.workspace.delete({ where: { id } }).catch(() => {});
  }
  console.log('  Cleaned up ephemeral workspaces.');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

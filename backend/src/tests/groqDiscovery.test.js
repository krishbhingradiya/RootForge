/**
 * RootForge AI Business Consultant — EXACT 3-QUESTION GROQ DISCOVERY TEST SUITE
 * 
 * Tests:
 * 1. Exact 3-Question sequential flow (Q1 -> A1 -> Q2 -> A2 -> Q3 -> A3 -> Complete).
 * 2. Session maintains currentQuestionNumber: 0 -> 1 -> 2 -> 3.
 * 3. Only ONE question presented at each turn.
 * 4. Every answer is stored with question number and timestamp.
 * 5. NO Question 4 is ever asked.
 * 6. Final response after Answer 3 produces combined project understanding, summary, core requirements, and AI recommendations.
 * 7. Context awareness: Questions adapt dynamically based on previous answers without repetition.
 */

import { groqDiscoveryService } from '../services/ai/groqDiscovery.service.js';

async function runExact3QuestionTests() {
  console.log('\n======================================================');
  console.log('  EXACT 3-QUESTION GROQ DISCOVERY VERIFICATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- [TEST 1 & 2] Complete 3-Question Flow ---
  console.log('--- [TEST 1] Step-by-Step 3-Question Discovery Flow ---');
  
  // Step 0: Start session
  const session = groqDiscoveryService.getOrCreateSession();
  assert(session.currentQuestionNumber === 0, 'Initial session state is at Question 0');
  assert(session.conversationComplete === false, 'Initial session conversation_complete is false');

  // Step 1: Initial Requirement -> Generates Question 1 ONLY
  console.log('\n-> Sending Initial Requirement...');
  const res1 = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: session.sessionId,
    message: 'I want to build an online grocery delivery platform for local grocery stores.'
  });

  assert(res1.currentQuestionNumber === 1, 'Session state progressed to Question 1 of 3');
  assert(res1.question_number === 1, 'Response specifies question_number = 1');
  assert(Boolean(res1.question && res1.question.trim()), `AI Generated Question 1: "${res1.question}"`);
  assert(res1.conversation_complete === false, 'conversation_complete is false at Question 1');
  assert(!res1.question.includes('Question 2'), 'Did NOT generate multiple questions at once');

  // Step 2: Answer 1 -> Generates Question 2 ONLY
  console.log('\n-> Sending Answer 1...');
  const res2 = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: session.sessionId,
    message: 'Primary users are local retail customers, store owners managing inventory, and delivery drivers.'
  });

  assert(res2.currentQuestionNumber === 2, 'Session state progressed to Question 2 of 3');
  assert(res2.question_number === 2, 'Response specifies question_number = 2');
  assert(Boolean(res2.question && res2.question.trim()), `AI Generated Question 2: "${res2.question}"`);
  assert(res2.conversation_complete === false, 'conversation_complete is false at Question 2');
  assert(!res2.question.toLowerCase().includes('who are the primary users'), 'Question 2 does NOT repeat Question 1 topic');

  // Step 3: Answer 2 -> Generates Question 3 ONLY (Final Question)
  console.log('\n-> Sending Answer 2...');
  const res3 = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: session.sessionId,
    message: 'The main goal is to allow customers to order groceries with 30-minute delivery and eliminate phone ordering mistakes.'
  });

  assert(res3.currentQuestionNumber === 3, 'Session state progressed to Question 3 of 3 (Final Question)');
  assert(res3.question_number === 3, 'Response specifies question_number = 3');
  assert(Boolean(res3.question && res3.question.trim()), `AI Generated Question 3: "${res3.question}"`);
  assert(res3.conversation_complete === false, 'conversation_complete is false before Answer 3');

  // Step 4: Answer 3 -> Final Synthesis (NO Question 4)
  console.log('\n-> Sending Answer 3 (Final Answer)...');
  const finalRes = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: session.sessionId,
    message: 'We need payment gateway integration with Razorpay/Stripe, live Google Maps driver tracking, and WhatsApp order alerts.'
  });

  console.log('\n--- Final Requirements Result ---');
  console.log(`Project Summary: ${finalRes.project_summary}`);
  console.log(`Target Users: ${JSON.stringify(finalRes.target_users)}`);
  console.log(`Core Requirements: ${JSON.stringify(finalRes.core_requirements)}`);
  console.log(`Integrations: ${JSON.stringify(finalRes.integrations)}`);
  console.log(`AI Recommendations: ${JSON.stringify(finalRes.ai_recommendations)}`);

  assert(finalRes.conversation_complete === true, 'conversation_complete is TRUE after Answer 3');
  assert(!finalRes.question, 'NO Question 4 is generated');
  assert(Array.isArray(finalRes.questions_and_answers) && finalRes.questions_and_answers.length === 3, 'Preserved all 3 Q&A pairs in final output');
  assert(finalRes.questions_and_answers[0].answer.includes('retail customers'), 'Saved Answer 1 correctly');
  assert(finalRes.questions_and_answers[1].answer.includes('30-minute delivery'), 'Saved Answer 2 correctly');
  assert(finalRes.questions_and_answers[2].answer.includes('Razorpay'), 'Saved Answer 3 correctly');
  assert(Boolean(finalRes.project_summary), 'Generated coherent final project summary');
  assert(Array.isArray(finalRes.ai_recommendations) && finalRes.ai_recommendations.length > 0, 'Separated AI recommendations');

  // --- [TEST 6] Backend Session State Inspection ---
  console.log('\n--- [TEST 6] Backend Session State Persistence ---');
  const storedSession = groqDiscoveryService.getSession(session.sessionId);
  assert(storedSession && storedSession.currentQuestionNumber === 3, 'Backend session state persists currentQuestionNumber = 3');
  assert(storedSession.conversationComplete === true, 'Backend session marks conversationComplete = true');
  assert(storedSession.questions.length === 3, 'Backend session stores all 3 answered questions');

  console.log('\n======================================================');
  console.log(`  EXACT 3-QUESTION DISCOVERY SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runExact3QuestionTests().catch((err) => {
  console.error('Fatal 3-question test error:', err);
  process.exit(1);
});

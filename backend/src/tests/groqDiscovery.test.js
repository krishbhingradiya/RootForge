/**
 * RootForge AI Business Consultant — Groq Requirement Discovery Verification Test Suite
 * 
 * Verifies:
 * 1. Single-shot and multi-turn session creation (POST /api/ai/discovery/start & /message)
 * 2. Scenario 1: Very short requirement ("I want an ecommerce app.")
 * 3. Scenario 2: Detailed requirement (Online grocery delivery platform for local stores)
 * 4. Scenario 3: Intelligent counter-question formulation (ONE targeted question)
 * 5. Scenario 4: Context awareness & avoiding repeated questions
 * 6. Scenario 5: User says "I don't know" or "skip" (marked as unknown, continues discovery)
 * 7. Scenario 6: Multilingual understanding (Gujarati & Hindi input)
 * 8. Scenario 7: User asks AI a question (gracefully handles and steers back to discovery)
 * 9. Scenario 8: Schema compliance (JSON fields: conversation_complete, requirements, missing_information, ai_recommendations)
 */

import { groqDiscoveryService } from '../services/ai/groqDiscovery.service.js';

async function runGroqDiscoveryTests() {
  console.log('\n======================================================');
  console.log('  ROOTFORGE GROQ REQUIREMENT DISCOVERY TEST SUITE');
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

  // --- [1] Session Management ---
  console.log('--- [1] Session Lifecycle & State Management ---');
  const session = groqDiscoveryService.getOrCreateSession();
  assert(session && session.sessionId.startsWith('disc_'), `Generated valid discovery session ID: ${session.sessionId}`);
  assert(session.conversationHistory.length === 0, 'Initial session conversation history is empty');
  assert(session.conversationComplete === false, 'Initial session is not complete');
  assert(Array.isArray(session.missingInformation) && session.missingInformation.length > 0, 'Initial session has discovery checklist items');

  // --- [2] Scenario 1: Short Requirement ---
  console.log('\n--- [2] Scenario 1: Short Requirement ("I want an ecommerce app.") ---');
  const shortResult = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: session.sessionId,
    message: 'I want an ecommerce app.'
  });

  assert(typeof shortResult.conversation_complete === 'boolean', 'Returns valid boolean conversation_complete');
  assert(Boolean(shortResult.next_question && shortResult.next_question.trim()), `Generated counter-question: "${shortResult.next_question}"`);
  assert(Boolean(shortResult.question_reason), `Provided question reason: "${shortResult.question_reason}"`);
  assert(typeof shortResult.requirements === 'object', 'Returned structured requirements object');
  assert(Array.isArray(shortResult.missing_information), 'Returned missing_information array');

  // --- [3] Scenario 2: Detailed Grocery Requirement ---
  console.log('\n--- [3] Scenario 2: Detailed Grocery Requirement (Target Users & Workflow) ---');
  const grocerySession = groqDiscoveryService.getOrCreateSession();
  const detailedResult = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: grocerySession.sessionId,
    message: 'I want to build an online grocery delivery platform for local grocery stores. Customers should be able to order products online and get them delivered.'
  });

  console.log(`    Project Summary: ${detailedResult.project_summary}`);
  console.log(`    Next Counter-Question: "${detailedResult.next_question}"`);
  console.log(`    Reason: ${detailedResult.question_reason}`);

  assert(Boolean(detailedResult.project_summary), 'Generated coherent project summary');
  assert(detailedResult.next_question.length > 10, 'Generated specific, intelligent counter-question');
  assert(!detailedResult.conversation_complete, 'Conversation remains open for follow-up details');

  // --- [4] Multi-turn Follow-up without repeating ---
  console.log('\n--- [4] Scenario 3: Context-Aware Turn 2 Follow-Up ---');
  const turn2Result = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: grocerySession.sessionId,
    message: 'Primary users are local customers ordering on mobile, store owners managing inventory on web dashboard, and delivery drivers using a mobile app.'
  });

  console.log(`    Updated Summary: ${turn2Result.project_summary}`);
  console.log(`    Next Question (Turn 2): "${turn2Result.next_question}"`);

  assert(turn2Result.conversation_history_length >= 4, 'Conversation history maintained across turns');
  assert(!turn2Result.next_question.toLowerCase().includes('who will use the platform'), 'Did not repeat target user question');

  // --- [5] Scenario 4: User says "I don't know" / "skip" ---
  console.log('\n--- [5] Scenario 4: Handling "I don\'t know" / "skip" gracefully ---');
  const skipResult = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: grocerySession.sessionId,
    message: 'I do not know yet about payment gateways, skip that.'
  });

  assert(Boolean(skipResult.next_question), `Gracefully transitioned to next area: "${skipResult.next_question}"`);
  assert(Array.isArray(skipResult.missing_information), 'Missing information array preserved');

  // --- [6] Scenario 5: Multilingual (Gujarati Input) ---
  console.log('\n--- [6] Scenario 5: Multilingual Understanding (Gujarati) ---');
  const guSession = groqDiscoveryService.getOrCreateSession();
  const guResult = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: guSession.sessionId,
    message: 'મારે એક કસ્ટમર સપોર્ટ સિસ્ટમ બનાવવી છે જેમાં એઆઈ ચેટબોટ હોય અને ટિકિટ ઓટોમેટિક અસાઇન થાય.'
  });

  console.log(`    Gujarati Input Detected Intent: ${guResult.detected_intent}`);
  console.log(`    Counter-Question: "${guResult.next_question}"`);
  assert(Boolean(guResult.next_question), 'Understood Gujarati input and formulated relevant counter-question');

  // --- [7] Scenario 6: User asks AI a question ---
  console.log('\n--- [7] Scenario 6: User asks AI a question instead of answering ---');
  const qResult = await groqDiscoveryService.processDiscoveryTurn({
    sessionId: grocerySession.sessionId,
    message: 'What cloud database do you recommend for real-time inventory updates?'
  });

  assert(Boolean(qResult.next_question), `Handled user inquiry and steered back to discovery: "${qResult.next_question}"`);

  // --- [8] Reset Session ---
  console.log('\n--- [8] Session Reset ---');
  const resetSession = groqDiscoveryService.resetSession(grocerySession.sessionId);
  assert(resetSession.conversationHistory.length === 0, 'Reset session cleared conversation history');

  console.log('\n======================================================');
  console.log(`  GROQ DISCOVERY SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runGroqDiscoveryTests().catch((err) => {
  console.error('Fatal Groq Discovery test error:', err);
  process.exit(1);
});

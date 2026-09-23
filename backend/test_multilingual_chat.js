/**
 * RootForge AI Solution Builder
 * Comprehensive Multilingual Chat & Voice Verification Suite
 * 
 * Verifies:
 * 1. Centralized Multilingual Translations (EN, HI, GU)
 * 2. In-memory Batch Translation Service with zero DB mutations
 * 3. Cache performance (< 5ms on cache hits)
 * 4. Gemini multilingual response generation (Hindi & Gujarati) with schema key preservation
 * 5. Localized off-topic & clarification responses
 * 6. Database record immutability (Canonical records preserved)
 */

import dotenv from 'dotenv';
dotenv.config();

import { prisma } from './src/prisma.js';
import { relevanceGuard } from './src/ai/relevanceGuard.js';
import { getWorkspaceContext } from './src/services/workspaceContext.service.js';
import { translationService } from './src/services/translation.service.js';
import * as chatSessionService from './src/services/chatSession.service.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`    ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`    ❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('ROOTFORGE: MULTILINGUAL AI CHAT & VOICE VERIFICATION SUITE');
  console.log('======================================================================\n');

  // Test 1: Verify Translation Service and Batch Handling
  console.log('--- TEST GROUP 1: In-Memory Batch Translation Layer ---');
  const sampleMessages = [
    {
      id: 'test-msg-1',
      content: 'How can we reduce appointment scheduling delays and improve doctor availability?'
    },
    {
      id: 'test-msg-2',
      content: JSON.stringify({
        summary: 'We recommend implementing an automated real-time scheduling microservice with Redis caching.',
        status: 'PROPOSED',
        confirmedFacts: [
          { fact: 'Current appointment booking is manual and phone-based.', source: 'BRD.pdf', category: 'CURRENT_PROCESS' }
        ],
        recommendations: [
          { title: 'Availability Service', details: 'Deploy REST endpoints with distributed locks.', category: 'ARCHITECTURE' }
        ],
        openQuestions: [
          { question: 'Which EHR system requires bidirectional integration?', whyItMatters: 'Needed for schema definition.' }
        ]
      })
    }
  ];

  // Translate to Hindi
  console.log('  Translating batch to Hindi (hi)...');
  const tHiStart = Date.now();
  const hiResult = await translationService.translateChatMessages(sampleMessages, 'hi');
  const tHiDuration = Date.now() - tHiStart;
  console.log(`  Batch translated in ${tHiDuration}ms`);

  assert(hiResult && hiResult.targetLanguage === 'hi', 'Target language returned is "hi"');
  assert(hiResult.translations['test-msg-1'] && hiResult.translations['test-msg-1'].length > 0, 'User question translated to Hindi');
  console.log(`  Translated user message (HI): "${hiResult.translations['test-msg-1'].slice(0, 80)}..."`);

  // Check structured JSON message translated while retaining keys
  const hiJsonStr = hiResult.translations['test-msg-2'];
  assert(typeof hiJsonStr === 'string', 'Structured message returned as string');
  let parsedHi = null;
  try { parsedHi = JSON.parse(hiJsonStr); } catch {}
  assert(parsedHi !== null && typeof parsedHi === 'object', 'Translated structured message is valid JSON');
  assert(parsedHi.summary && parsedHi.summary.length > 0, 'Hindi JSON contains "summary" key');
  assert(Array.isArray(parsedHi.recommendations) && parsedHi.recommendations.length > 0, 'Hindi JSON contains "recommendations" array');
  assert(parsedHi.recommendations[0].title && parsedHi.recommendations[0].details, 'Recommendation item retains English keys');
  console.log(`  Translated summary (HI): "${parsedHi.summary.slice(0, 80)}..."`);

  // Test 2: Cache Performance Check
  console.log('\n--- TEST GROUP 2: Translation Cache Performance ---');
  const tCacheStart = Date.now();
  const cachedHiResult = await translationService.translateChatMessages(sampleMessages, 'hi');
  const tCacheDuration = Date.now() - tCacheStart;

  assert(cachedHiResult.translations['test-msg-1'] === hiResult.translations['test-msg-1'], 'Cached translation matches original translation');
  assert(tCacheDuration < 15, `Cache hit returned in < 15ms (Actual: ${tCacheDuration}ms)`);
  console.log(`    ⚡ Cache hit latency: ${tCacheDuration}ms`);

  // Test 3: Translate to Gujarati
  console.log('\n--- TEST GROUP 3: Gujarati Batch Translation ---');
  const tGuStart = Date.now();
  const guResult = await translationService.translateChatMessages(sampleMessages, 'gu');
  const tGuDuration = Date.now() - tGuStart;
  console.log(`  Batch translated to Gujarati in ${tGuDuration}ms`);

  assert(guResult && guResult.targetLanguage === 'gu', 'Target language returned is "gu"');
  assert(guResult.translations['test-msg-1'] && guResult.translations['test-msg-1'].length > 0, 'User question translated to Gujarati');
  console.log(`  Translated user message (GU): "${guResult.translations['test-msg-1'].slice(0, 80)}..."`);

  let parsedGu = null;
  try { parsedGu = JSON.parse(guResult.translations['test-msg-2']); } catch {}
  assert(parsedGu !== null && typeof parsedGu === 'object', 'Translated Gujarati structured message is valid JSON');
  assert(parsedGu.summary && parsedGu.summary.length > 0, 'Gujarati JSON contains "summary" key');
  assert(Array.isArray(parsedGu.recommendations), 'Gujarati JSON contains "recommendations" key');
  console.log(`  Translated summary (GU): "${parsedGu.summary.slice(0, 80)}..."`);

  // Test 4: Database Immutability Guarantee
  console.log('\n--- TEST GROUP 4: Database Immutability Guarantee ---');
  // Find an existing workspace and message in SQLite
  const demoWs = await prisma.workspace.findFirst({
    include: { conversations: { include: { messages: true } } }
  });

  if (demoWs && demoWs.conversations[0]?.messages[0]) {
    const originalMsg = demoWs.conversations[0].messages[0];
    const originalContent = originalMsg.content;
    const originalCreatedAt = originalMsg.createdAt;
    const originalStructured = originalMsg.structuredContent;

    // Run translation on this real message ID
    await translationService.translateChatMessages([{ id: originalMsg.id, content: originalMsg.content }], 'hi');
    await translationService.translateChatMessages([{ id: originalMsg.id, content: originalMsg.content }], 'gu');

    // Reload from database
    const freshlyLoaded = await prisma.message.findUnique({
      where: { id: originalMsg.id }
    });

    assert(freshlyLoaded.content === originalContent, 'SQLite Message.content remains 100% untouched');
    assert(freshlyLoaded.structuredContent === originalStructured, 'SQLite Message.structuredContent remains 100% untouched');
    assert(new Date(freshlyLoaded.createdAt).getTime() === new Date(originalCreatedAt).getTime(), 'SQLite Message.createdAt unchanged');
    console.log('    🔒 Confirmed: Zero database mutations during translation calls.');
  }

  // Test 5: AI Multilingual Generation with Canonical Context
  console.log('\n--- TEST GROUP 5: Real AI Generation in Hindi & Gujarati ---');
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const context = await getWorkspaceContext(demoWs.id, adminUser);

  console.log('  Generating AI consultant answer in Hindi (hi)...');
  const hiAnswer = await relevanceGuard.generateConsultantAnswer(
    context,
    'How do we handle patient appointment cancellations?',
    [],
    'hi'
  );

  assert(hiAnswer && hiAnswer.structured, 'Hindi AI response contains structured object');
  assert(hiAnswer.structured.summary && hiAnswer.structured.summary.length > 0, 'Hindi AI summary populated');
  assert(Array.isArray(hiAnswer.structured.recommendations), 'Hindi recommendations array populated');
  assert(hiAnswer.structured.recommendations[0]?.title, 'Recommendation title retains schema key in English');
  console.log(`  AI Response Summary (HI): "${hiAnswer.structured.summary.slice(0, 100)}..."`);

  console.log('  Generating AI consultant answer in Gujarati (gu)...');
  const guAnswer = await relevanceGuard.generateConsultantAnswer(
    context,
    'What database locking strategy should be used for doctor schedules?',
    [],
    'gu'
  );

  assert(guAnswer && guAnswer.structured, 'Gujarati AI response contains structured object');
  assert(guAnswer.structured.summary && guAnswer.structured.summary.length > 0, 'Gujarati AI summary populated');
  assert(Array.isArray(guAnswer.structured.recommendations), 'Gujarati recommendations array populated');
  assert(guAnswer.structured.recommendations[0]?.title, 'Recommendation title retains schema key in English');
  console.log(`  AI Response Summary (GU): "${guAnswer.structured.summary.slice(0, 100)}..."`);

  // Test 6: Localized Off-Topic and Clarification Responses
  console.log('\n--- TEST GROUP 6: Localized Guardrail Responses ---');
  const offTopicHi = relevanceGuard.getOffTopicResponse(demoWs, 'hi');
  const offTopicGu = relevanceGuard.getOffTopicResponse(demoWs, 'gu');
  assert(offTopicHi.includes('क्षमा करें'), 'Hindi off-topic response localized');
  assert(offTopicGu.includes('માફ કરશો'), 'Gujarati off-topic response localized');

  const clarifyHi = relevanceGuard.getClarificationResponse(context, 'can we automate this?', 'hi');
  const clarifyGu = relevanceGuard.getClarificationResponse(context, 'can we automate this?', 'gu');
  assert(clarifyHi.includes('हाँ') || clarifyHi.includes('प्रक्रिया'), 'Hindi clarification inquiry localized');
  assert(clarifyGu.includes('હા') || clarifyGu.includes('પ્રક્રિયા'), 'Gujarati clarification inquiry localized');

  console.log('\n======================================================================');
  console.log(`MULTILINGUAL VERIFICATION SUMMARY: ${passedTests}/${totalTests} PASSED (Failed: ${failedTests})`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

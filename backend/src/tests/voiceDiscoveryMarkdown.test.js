/**
 * RootForge AI Voice Discovery & Markdown Generation Test Suite
 * 
 * Verifies:
 * 1. Sequential turn recording (greeting, initial requirement, Q1, A1, Q2, A2, Q3, A3).
 * 2. Exact spoken AI text persistence before TTS dispatch.
 * 3. Final STT user transcript persistence (with Gujarati/Hindi script and English normalization).
 * 4. Question / Answer mapping preservation.
 * 5. Deterministic Markdown file generation and filesystem storage under uploads/voice-discovery/.
 * 6. Database persistence (VoiceSession, VoiceConversationMessage, VoiceConversationDocument).
 * 7. Incomplete call handling (early termination preserves partial transcript and marks Incomplete).
 * 8. Strict duplicate message prevention.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { twilioVoiceService } from '../services/voice/twilioVoice.service.js';
import { voiceWebhookService } from '../services/voice/voiceWebhook.service.js';
import { aiVoiceConsultantService } from '../services/voice/aiVoiceConsultant.service.js';
import { prisma } from '../prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', '..', '..', 'uploads', 'voice-discovery');

async function runVoiceDiscoveryTests() {
  console.log('\n======================================================');
  console.log('  ROOTFORGE VOICE DISCOVERY & MARKDOWN VERIFICATION');
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

  const testSessionId = `vses_test_${Date.now()}`;
  const testCallSid = `CA_test_${Date.now()}`;

  // --- [TEST 1] Create Voice Session ---
  console.log('--- [1] Voice Session Creation & Greeting Persistence ---');
  let session = await twilioVoiceService.createSession({
    phoneNumber: '+919876543210'
  });
  assert(session && session.id, `Created VoiceSession: ${session.id}`);

  // Update with Call SID
  await twilioVoiceService.updateSession(session.id, {
    twilioCallSid: testCallSid,
    status: 'initiating'
  });

  // Call incoming webhook to trigger greeting
  const greetingTwiML = await voiceWebhookService.generateIncomingTwiML({
    callSid: testCallSid,
    sessionId: session.id
  });
  assert(greetingTwiML && greetingTwiML.includes('<Gather') && greetingTwiML.includes('RootForge AI Business Consultant'), 'Generated initial greeting TwiML with <Gather>');

  const turnsAfterGreeting = await twilioVoiceService.getConversationMessages(session.id);
  assert(turnsAfterGreeting.length === 1, `Turn 1 (Greeting) persisted: ${turnsAfterGreeting[0]?.text?.slice(0, 40)}...`);
  assert(turnsAfterGreeting[0]?.speaker === 'assistant', 'Turn 1 speaker is "assistant"');

  // --- [TEST 2] Duplicate Prevention Test ---
  console.log('\n--- [2] Duplicate Prevention Test ---');
  // Attempt to save identical greeting again with same turnId
  const dupMsg = await twilioVoiceService.saveConversationMessage({
    sessionId: session.id,
    speaker: 'assistant',
    text: turnsAfterGreeting[0].text,
    turnId: `assistant_${session.id}_greeting`
  });
  const turnsAfterDupAttempt = await twilioVoiceService.getConversationMessages(session.id);
  assert(turnsAfterDupAttempt.length === 1, 'Duplicate greeting with identical turnId was prevented');

  // --- [TEST 3] User Initial Requirement (Gujarati) ---
  console.log('\n--- [3] User Initial Requirement (Gujarati Speech) ---');
  const gujaratiRequirement = 'મારે એક ઓનલાઇન ગ્રોસરી ડિલિવરી પ્લેટફોર્મ બનાવવું છે.';
  const speechTwiML1 = await voiceWebhookService.processSpeech({
    callSid: testCallSid,
    sessionId: session.id,
    speechResult: gujaratiRequirement
  });

  const turnsAfterTurn1 = await twilioVoiceService.getConversationMessages(session.id);
  assert(turnsAfterTurn1.length === 3, `Turns after Turn 1: 3 (Greeting, User Initial, AI Question 1)`);
  
  const userMsg1 = turnsAfterTurn1.find(m => m.speaker === 'user' && m.sequence === 2);
  assert(userMsg1 && userMsg1.text === gujaratiRequirement, 'Preserved original Gujarati user transcript');
  assert(userMsg1 && userMsg1.language === 'gu-IN', 'Detected language as gu-IN');
  assert(userMsg1 && userMsg1.englishText && userMsg1.englishText.length > 0, `Generated English normalized text: "${userMsg1.englishText}"`);

  const aiQuestion1 = turnsAfterTurn1.find(m => m.speaker === 'assistant' && m.questionNumber === 1);
  assert(aiQuestion1 && aiQuestion1.text && aiQuestion1.text.length > 0, `Turn 3 (AI Question 1) saved exact spoken text: "${aiQuestion1.text}"`);

  // --- [TEST 4] User Answer 1 & AI Question 2 ---
  console.log('\n--- [4] User Answer 1 & AI Question 2 ---');
  const answer1 = 'ગ્રાહકો અને કરિયાણાની દુકાનના માલિકો.'; // Customers and grocery store owners
  await voiceWebhookService.processSpeech({
    callSid: testCallSid,
    sessionId: session.id,
    speechResult: answer1
  });

  const turnsAfterTurn2 = await twilioVoiceService.getConversationMessages(session.id);
  assert(turnsAfterTurn2.length === 5, `Turns after Turn 2: 5 (Greeting, User Init, AI Q1, User A1, AI Q2)`);

  const userMsg2 = turnsAfterTurn2.find(m => m.speaker === 'user' && m.questionNumber === 1);
  assert(userMsg2 && userMsg2.text === answer1, `Turn 4 (User Answer 1) saved: "${userMsg2.text}"`);

  const aiQuestion2 = turnsAfterTurn2.find(m => m.speaker === 'assistant' && m.questionNumber === 2);
  assert(aiQuestion2 && aiQuestion2.text && aiQuestion2.text.length > 0, `Turn 5 (AI Question 2) saved exact spoken text: "${aiQuestion2.text}"`);

  // --- [TEST 5] User Answer 2 & AI Question 3 ---
  console.log('\n--- [5] User Answer 2 & AI Question 3 ---');
  const answer2 = 'હાલમાં ગ્રાહકોને ઓર્ડર આપવા માટે દુકાને ફોન કરવો પડે છે.'; // Currently customers have to call stores to place orders
  await voiceWebhookService.processSpeech({
    callSid: testCallSid,
    sessionId: session.id,
    speechResult: answer2
  });

  const turnsAfterTurn3 = await twilioVoiceService.getConversationMessages(session.id);
  assert(turnsAfterTurn3.length === 7, `Turns after Turn 3: 7 (Greeting, User Init, AI Q1, User A1, AI Q2, User A2, AI Q3)`);

  const userMsg3 = turnsAfterTurn3.find(m => m.speaker === 'user' && m.questionNumber === 2);
  assert(userMsg3 && userMsg3.text === answer2, `Turn 6 (User Answer 2) saved: "${userMsg3.text}"`);

  const aiQuestion3 = turnsAfterTurn3.find(m => m.speaker === 'assistant' && m.questionNumber === 3);
  assert(aiQuestion3 && aiQuestion3.text && aiQuestion3.text.length > 0, `Turn 7 (AI Question 3) saved exact spoken text: "${aiQuestion3.text}"`);

  // --- [TEST 6] User Answer 3 & Discovery Completion ---
  console.log('\n--- [6] User Answer 3 & Discovery Completion ---');
  const answer3 = 'હા, ગ્રાહકોને લાઇવ ડિલિવરી ટ્રેકિંગ મળવું જોઈએ.'; // Yes, customers should receive live delivery tracking
  const finalTwiML = await voiceWebhookService.processSpeech({
    callSid: testCallSid,
    sessionId: session.id,
    speechResult: answer3
  });

  assert(finalTwiML.includes('<Hangup/>') || finalTwiML.includes('<Hangup />'), 'Final completion TwiML includes <Hangup/>');

  const allTurns = await twilioVoiceService.getConversationMessages(session.id);
  assert(allTurns.length === 8, `Complete 8-turn conversation recorded (Greeting + User Init + 3 Q&A pairs)`);

  // --- [TEST 7] Markdown File Verification on Disk & DB ---
  console.log('\n--- [7] Markdown File & Metadata Verification ---');
  const docMeta = await twilioVoiceService.getConversationDocument(session.id);
  assert(docMeta && docMeta.fileName === `voice-discovery-${session.id}.md`, `VoiceConversationDocument metadata saved: ${docMeta?.fileName}`);
  assert(docMeta && docMeta.storagePath.includes('voice-discovery'), `Storage path is: ${docMeta?.storagePath}`);

  const targetFilePath = path.resolve(process.cwd(), docMeta.storagePath);
  assert(fs.existsSync(targetFilePath), `Markdown file exists on disk: ${targetFilePath}`);

  const mdContent = fs.readFileSync(targetFilePath, 'utf8');
  assert(mdContent.includes('# RootForge AI Voice Discovery'), 'Markdown contains header "# RootForge AI Voice Discovery"');
  assert(mdContent.includes('## Session Information'), 'Markdown contains "## Session Information"');
  assert(mdContent.includes(`- Session ID: ${session.id}`), `Markdown contains Session ID ${session.id}`);
  assert(mdContent.includes('Discovery Status: Completed'), 'Markdown contains "Discovery Status: Completed"');
  assert(mdContent.includes('# Initial Project Requirement'), 'Markdown contains "# Initial Project Requirement"');
  assert(mdContent.includes(gujaratiRequirement), 'Markdown contains raw user requirement in Gujarati');
  assert(mdContent.includes('# Conversation Transcript'), 'Markdown contains "# Conversation Transcript"');
  assert(mdContent.includes('## AI — Question 1'), 'Markdown contains "## AI — Question 1"');
  assert(mdContent.includes('## User — Answer 1'), 'Markdown contains "## User — Answer 1"');
  assert(mdContent.includes('## AI — Question 2'), 'Markdown contains "## AI — Question 2"');
  assert(mdContent.includes('## User — Answer 2'), 'Markdown contains "## User — Answer 2"');
  assert(mdContent.includes('## AI — Question 3'), 'Markdown contains "## AI — Question 3"');
  assert(mdContent.includes('## User — Answer 3'), 'Markdown contains "## User — Answer 3"');
  assert(mdContent.includes('# Complete Conversation'), 'Markdown contains "# Complete Conversation"');
  assert(mdContent.includes('# Collected Requirements'), 'Markdown contains "# Collected Requirements"');
  assert(mdContent.includes('## Business Problem'), 'Markdown contains "## Business Problem"');
  assert(mdContent.includes('## Core Requirements'), 'Markdown contains "## Core Requirements"');
  assert(mdContent.includes('# Missing Information'), 'Markdown contains "# Missing Information"');
  assert(mdContent.includes('# AI Recommendations'), 'Markdown contains "# AI Recommendations"');
  assert(mdContent.includes('> English interpretation:'), 'Markdown formats English translation with "> English interpretation:"');

  // --- [TEST 8] Incomplete Call Termination Test ---
  console.log('\n--- [8] Incomplete Call Termination Test ---');
  const incompleteSession = await twilioVoiceService.createSession({
    phoneNumber: '+919876500000'
  });
  const incompleteCallSid = `CA_incomplete_${Date.now()}`;

  await voiceWebhookService.generateIncomingTwiML({
    callSid: incompleteCallSid,
    sessionId: incompleteSession.id
  });

  // User only answers initial requirement and hangs up
  await voiceWebhookService.processSpeech({
    callSid: incompleteCallSid,
    sessionId: incompleteSession.id,
    speechResult: 'I want a simple expense management app.'
  });

  // Twilio sends status callback: user hung up (status: completed or failed before Q3)
  await voiceWebhookService.handleStatusCallback({
    callSid: incompleteCallSid,
    callStatus: 'completed',
    sessionId: incompleteSession.id
  });

  const incompleteDocMeta = await twilioVoiceService.getConversationDocument(incompleteSession.id);
  assert(incompleteDocMeta && incompleteDocMeta.fileName, 'Incomplete call generated a Markdown document');

  const incompleteFilePath = path.resolve(process.cwd(), incompleteDocMeta.storagePath);
  const incompleteMd = fs.readFileSync(incompleteFilePath, 'utf8');
  assert(incompleteMd.includes('Discovery Status: Incomplete — user ended the call before completing discovery.'), 'Incomplete call document has Incomplete status banner');
  assert(incompleteMd.includes('I want a simple expense management app.'), 'Incomplete call preserved partial user transcript');

  // Clean up test DB records
  console.log('\n--- [9] Database Cleanup ---');
  if (prisma?.voiceSession) {
    try {
      await prisma.voiceSession.deleteMany({
        where: { id: { in: [session.id, incompleteSession.id] } }
      });
      console.log('  ✅ [PASS] Cleaned up temporary test records from PostgreSQL');
      passed++;
    } catch {}
  }

  // Clean up generated test files
  try {
    if (fs.existsSync(targetFilePath)) fs.unlinkSync(targetFilePath);
    if (fs.existsSync(incompleteFilePath)) fs.unlinkSync(incompleteFilePath);
    console.log('  ✅ [PASS] Cleaned up temporary test Markdown files');
    passed++;
  } catch {}

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVoiceDiscoveryTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

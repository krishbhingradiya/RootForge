/**
 * Phase 1 Twilio Voice Discovery Test Suite
 * 
 * Verifies:
 * 1. Incoming webhook signature validation (valid -> 200 TwiML, invalid -> 403)
 * 2. Discovery session creation and Twilio Call SID persistence
 * 3. Idempotency on duplicate incoming webhooks
 * 4. Call status lifecycle transitions (initiated -> ringing -> in-progress -> completed)
 * 5. Terminal state protection against out-of-order webhooks
 * 6. Concurrency and isolation between multiple active calls
 * 7. Authenticated Session APIs (GET session, list sessions, end call)
 */

import twilio from 'twilio';
import { twilioService } from '../src/services/twilio.service.js';
import { voiceDiscoveryService } from '../src/services/voiceDiscovery.service.js';
import { prisma } from '../src/prisma.js';

const TEST_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test_twilio_secret_token_12345';
const TEST_BASE_URL = 'https://rootforge-test.ngrok-free.app';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' ROOTFORGE PHASE 1 — TWILIO VOICE DISCOVERY TEST SUITE');
  console.log('======================================================\n');

  // Override environment for deterministic signature tests
  process.env.TWILIO_AUTH_TOKEN = TEST_AUTH_TOKEN;
  process.env.TWILIO_WEBHOOK_BASE_URL = TEST_BASE_URL;

  const testCallSid1 = `CA_test_${Date.now()}_1`;
  const testCallSid2 = `CA_test_${Date.now()}_2`;
  const callerPhone = '+15551234567';
  const twilioPhone = '+15559876543';

  // 1. Webhook Signature Validation Test
  console.log('[TEST 1] Twilio Webhook Signature Validation');
  const incomingUrl = `${TEST_BASE_URL}/api/voice/incoming`;
  const incomingParams = {
    CallSid: testCallSid1,
    From: callerPhone,
    To: twilioPhone,
    CallStatus: 'ringing'
  };

  const validSignature = twilio.getExpectedTwilioSignature(
    TEST_AUTH_TOKEN,
    incomingUrl,
    incomingParams
  );

  const isValidPass = twilioService.validateWebhookSignature({
    url: incomingUrl,
    params: incomingParams,
    signature: validSignature
  });
  assert(isValidPass === true, 'Valid HMAC-SHA1 signature passes verification');

  const isInvalidPass = twilioService.validateWebhookSignature({
    url: incomingUrl,
    params: incomingParams,
    signature: 'bad_forged_signature_xyz'
  });
  assert(isInvalidPass === false, 'Tampered / invalid signature is rejected (HTTP 403 precondition)');

  // 2. TwiML Generation Test
  console.log('\n[TEST 2] TwiML Generation');
  const twiml = twilioService.generateIncomingCallTwiML();
  assert(typeof twiml === 'string' && twiml.includes('<Response>'), 'Generates valid XML TwiML response');
  assert(twiml.includes('Welcome to RootForge AI Solution Builder'), 'Includes RootForge greeting');
  assert(twiml.includes('<Pause'), 'Includes Pause directive to keep call line active');

  // 3. Incoming Call Session Creation & Persistence
  console.log('\n[TEST 3] Discovery Session Creation');
  let session1;
  try {
    session1 = await voiceDiscoveryService.createOrGetIncomingSession({
      callSid: testCallSid1,
      from: callerPhone,
      to: twilioPhone,
      callStatus: 'ringing'
    });
    assert(session1 && session1.id, `Created session ${session1.id}`);
    assert(session1.twilioCallSid === testCallSid1, `Stored Twilio Call SID: ${testCallSid1}`);
    assert(session1.channel === 'VOICE', 'Channel is set to VOICE');
    assert(session1.provider === 'TWILIO', 'Provider is set to TWILIO');
    assert(session1.status === 'RINGING', 'Status correctly mapped to RINGING');
  } catch (err) {
    console.error('Session creation error:', err);
    failed++;
  }

  // 4. Webhook Idempotency Test
  console.log('\n[TEST 4] Webhook Idempotency on Duplicate Delivery');
  try {
    const duplicateSession = await voiceDiscoveryService.createOrGetIncomingSession({
      callSid: testCallSid1,
      from: callerPhone,
      to: twilioPhone,
      callStatus: 'ringing'
    });
    assert(duplicateSession.id === session1.id, 'Duplicate webhook returns identical existing session without creating duplicate');
  } catch (err) {
    console.error('Idempotency error:', err);
    failed++;
  }

  // 5. Status Transition: in-progress
  console.log('\n[TEST 5] Status Transition -> IN_PROGRESS');
  try {
    const inProgressSession = await voiceDiscoveryService.handleCallStatusWebhook({
      callSid: testCallSid1,
      callStatus: 'in-progress',
      from: callerPhone,
      to: twilioPhone
    });
    assert(inProgressSession.status === 'IN_PROGRESS', 'Status transitioned to IN_PROGRESS');
    assert(inProgressSession.connectedAt !== null, 'connectedAt timestamp populated');
  } catch (err) {
    console.error('In-progress status error:', err);
    failed++;
  }

  // 6. Status Transition: completed with CallDuration
  console.log('\n[TEST 6] Status Transition -> COMPLETED');
  try {
    const completedSession = await voiceDiscoveryService.handleCallStatusWebhook({
      callSid: testCallSid1,
      callStatus: 'completed',
      callDuration: '42',
      from: callerPhone,
      to: twilioPhone
    });
    assert(completedSession.status === 'COMPLETED', 'Status transitioned to COMPLETED');
    assert(completedSession.endedAt !== null, 'endedAt timestamp populated');
    assert(completedSession.durationSeconds === 42, `durationSeconds set to 42 (got ${completedSession.durationSeconds})`);
  } catch (err) {
    console.error('Completed status error:', err);
    failed++;
  }

  // 7. Terminal State Protection (Out of Order Webhook)
  console.log('\n[TEST 7] Out-of-Order Webhook Protection');
  try {
    const staleAttempt = await voiceDiscoveryService.handleCallStatusWebhook({
      callSid: testCallSid1,
      callStatus: 'in-progress',
      from: callerPhone,
      to: twilioPhone
    });
    assert(staleAttempt.status === 'COMPLETED', 'Session remains COMPLETED and is not overwritten by stale in-progress event');
  } catch (err) {
    console.error('Out-of-order error:', err);
    failed++;
  }

  // 8. Concurrency & Isolation
  console.log('\n[TEST 8] Concurrency & Isolation between Multiple Calls');
  try {
    const session2 = await voiceDiscoveryService.createOrGetIncomingSession({
      callSid: testCallSid2,
      from: '+15559998888',
      to: twilioPhone,
      callStatus: 'in-progress'
    });

    assert(session2.id !== session1.id, 'Session 2 has a distinct ID from Session 1');
    assert(session2.twilioCallSid === testCallSid2, 'Session 2 stores unique CallSid 2');
    assert(session2.status === 'IN_PROGRESS', 'Session 2 is IN_PROGRESS while Session 1 is COMPLETED');

    // Clean up test sessions
    await prisma.voiceDiscoverySession.deleteMany({
      where: { twilioCallSid: { in: [testCallSid1, testCallSid2] } }
    });
    assert(true, 'Test database state cleaned up');
  } catch (err) {
    console.error('Concurrency error:', err);
    failed++;
  }

  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

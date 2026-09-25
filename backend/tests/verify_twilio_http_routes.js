/**
 * HTTP Integration Test for Twilio Voice Endpoints
 * 
 * Verifies live HTTP requests against /api/voice/incoming and /api/voice/status.
 */

import express from 'express';
import twilio from 'twilio';
import voiceRoutes from '../src/routes/voice.routes.js';
import { prisma } from '../src/prisma.js';

const TEST_AUTH_TOKEN = 'test_twilio_secret_token_12345';
const TEST_BASE_URL = 'http://127.0.0.1:5099';

process.env.TWILIO_AUTH_TOKEN = TEST_AUTH_TOKEN;
process.env.TWILIO_WEBHOOK_BASE_URL = TEST_BASE_URL;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/voice', voiceRoutes);

let server;
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

async function testHttp() {
  console.log('\n======================================================');
  console.log(' HTTP INTEGRATION TESTS — /api/voice Endpoints');
  console.log('======================================================\n');

  await new Promise((resolve) => {
    server = app.listen(5099, '127.0.0.1', resolve);
  });

  const testCallSid = `CA_http_${Date.now()}`;
  const incomingUrl = `${TEST_BASE_URL}/api/voice/incoming`;
  const incomingParams = {
    CallSid: testCallSid,
    From: '+15551112222',
    To: '+15553334444',
    CallStatus: 'ringing'
  };

  // 1. Test invalid signature on POST /api/voice/incoming -> HTTP 403
  console.log('[HTTP TEST 1] POST /api/voice/incoming with invalid signature');
  const badRes = await fetch(incomingUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': 'invalid_sig'
    },
    body: new URLSearchParams(incomingParams).toString()
  });
  assert(badRes.status === 403, `Expected HTTP 403, got HTTP ${badRes.status}`);

  // 2. Test valid signature on POST /api/voice/incoming -> HTTP 200 TwiML
  console.log('\n[HTTP TEST 2] POST /api/voice/incoming with valid signature');
  const validSig = twilio.getExpectedTwilioSignature(
    TEST_AUTH_TOKEN,
    incomingUrl,
    incomingParams
  );

  const goodRes = await fetch(incomingUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': validSig
    },
    body: new URLSearchParams(incomingParams).toString()
  });

  assert(goodRes.status === 200, `Expected HTTP 200, got HTTP ${goodRes.status}`);
  const contentType = goodRes.headers.get('content-type') || '';
  assert(contentType.includes('text/xml'), `Content-Type is text/xml (got ${contentType})`);
  const twimlBody = await goodRes.text();
  assert(twimlBody.includes('<Say'), 'TwiML contains <Say> greeting');
  assert(twimlBody.includes('Welcome to RootForge'), 'TwiML contains Welcome greeting');

  // 3. Test POST /api/voice/status with valid signature -> HTTP 200
  console.log('\n[HTTP TEST 3] POST /api/voice/status with completed call event');
  const statusUrl = `${TEST_BASE_URL}/api/voice/status`;
  const statusParams = {
    CallSid: testCallSid,
    CallStatus: 'completed',
    CallDuration: '65',
    From: '+15551112222',
    To: '+15553334444'
  };

  const validStatusSig = twilio.getExpectedTwilioSignature(
    TEST_AUTH_TOKEN,
    statusUrl,
    statusParams
  );

  const statusRes = await fetch(statusUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': validStatusSig
    },
    body: new URLSearchParams(statusParams).toString()
  });

  assert(statusRes.status === 200, `Status endpoint returned HTTP 200 (got ${statusRes.status})`);

  // Verify database record updated to COMPLETED
  const savedSession = await prisma.voiceDiscoverySession.findUnique({
    where: { twilioCallSid: testCallSid }
  });
  assert(savedSession && savedSession.status === 'COMPLETED', `Session in DB has status COMPLETED (got ${savedSession?.status})`);
  assert(savedSession && savedSession.durationSeconds === 65, `Session in DB has duration 65s (got ${savedSession?.durationSeconds})`);

  // Clean up
  await prisma.voiceDiscoverySession.deleteMany({
    where: { twilioCallSid: testCallSid }
  });

  server.close();

  console.log('\n======================================================');
  console.log(` HTTP TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

testHttp().catch(err => {
  console.error('HTTP test error:', err);
  if (server) server.close();
  process.exit(1);
});

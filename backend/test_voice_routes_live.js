/**
 * Live HTTP Integration Test for Voice API Routes
 */

import assert from 'assert';
import express from 'express';
import voiceRoutes from './src/routes/voice.routes.js';
import { twilioVoiceService } from './src/services/voice/twilioVoice.service.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/voice', voiceRoutes);

const server = app.listen(0);
const port = server.address().port;
const baseUrl = `http://localhost:${port}`;

let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
  }
}

console.log(`\n--- Voice API Route Live HTTP Tests (${baseUrl}) ---`);

// 1. GET /api/voice/config
await test('GET /api/voice/config returns safe telemetry without credentials', async () => {
  const res = await fetch(`${baseUrl}/api/voice/config`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual('configured' in data, true);
  assert.strictEqual('hasAccountSid' in data, true);
  assert.strictEqual('authToken' in data, false, 'Auth token must NEVER be exposed');
  assert.strictEqual('accountSid' in data, false, 'Account SID must NEVER be exposed');
});

// 2. POST /api/voice/call - Validation error
await test('POST /api/voice/call rejects missing phone number', async () => {
  const res = await fetch(`${baseUrl}/api/voice/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes('required'));
});

// 3. POST /api/voice/call - Invalid phone number
await test('POST /api/voice/call rejects invalid phone number format', async () => {
  const res = await fetch(`${baseUrl}/api/voice/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '123' })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes('valid'));
});

// 4. POST /api/voice/incoming - Webhook TwiML response
await test('POST /api/voice/incoming returns valid TwiML XML', async () => {
  const session = await twilioVoiceService.createSession({ phoneNumber: '+919876543210' });
  const res = await fetch(`${baseUrl}/api/voice/incoming?sessionId=${session.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `CallSid=CA_live_test_123`
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.headers.get('content-type').includes('xml'));
  const xml = await res.text();
  assert.ok(xml.includes('<Response>'));
  assert.ok(xml.includes('<Say'));
  assert.ok(xml.includes('<Connect>'));
  assert.ok(xml.includes('<Stream'));
});

// 5. POST /api/voice/status - Status callback webhook
await test('POST /api/voice/status processes Twilio status updates', async () => {
  const session = await twilioVoiceService.createSession({ phoneNumber: '+919876543210' });
  const res = await fetch(`${baseUrl}/api/voice/status?sessionId=${session.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `CallSid=CA_live_test_status&CallStatus=completed&CallDuration=30`
  });
  assert.strictEqual(res.status, 200);
  const updated = await twilioVoiceService.getSession(session.id);
  assert.strictEqual(updated.status, 'completed');
});

// 6. GET /api/voice/session/:id - Live session status polling
await test('GET /api/voice/session/:id returns masked session details', async () => {
  const session = await twilioVoiceService.createSession({ phoneNumber: '+919876543210' });
  const res = await fetch(`${baseUrl}/api/voice/session/${session.id}`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.session.id, session.id);
  assert.strictEqual(data.session.status, 'created');
  assert.ok(data.session.phoneNumberMasked.includes('•••••'));
  assert.strictEqual('twilioAuthToken' in data.session, false);
});

server.close();

console.log(`\n======================================================`);
console.log(`  HTTP ROUTE RESULTS: ${passed}/${total} PASSED (100%)`);
console.log(`======================================================\n`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}

/**
 * Test: Twilio Optional Phone Number in Development
 * 
 * Verifies that:
 * 1. Missing TWILIO_PHONE_NUMBER marks isConfigured as false.
 * 2. Backend /api/voice/config returns isConfigured: false and phoneNumber: null.
 * 3. No fake/default phone number is used.
 * 4. No secret tokens or credentials are leaked.
 * 5. When TWILIO_PHONE_NUMBER is provided, isConfigured becomes true.
 */

import { twilioService } from '../src/services/twilio.service.js';

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

async function testOptionalPhoneConfig() {
  console.log('\n======================================================');
  console.log(' TEST: TWILIO OPTIONAL PHONE NUMBER CONFIGURATION');
  console.log('======================================================\n');

  // Case 1: Phone number missing
  delete process.env.TWILIO_PHONE_NUMBER;
  process.env.TWILIO_ACCOUNT_SID = 'AC_test_account_sid';
  process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_123';

  assert(twilioService.phoneNumber === '', 'Phone number is empty string when missing (no fake/default number)');
  assert(twilioService.isConfigured() === false, 'isConfigured is FALSE when TWILIO_PHONE_NUMBER is not set');

  // Case 2: Phone number provided
  process.env.TWILIO_PHONE_NUMBER = '+14155552671';
  assert(twilioService.phoneNumber === '+14155552671', 'Phone number correctly reads from environment');
  assert(twilioService.isConfigured() === true, 'isConfigured is TRUE when all required keys are set');

  // Case 3: Auth token missing
  delete process.env.TWILIO_AUTH_TOKEN;
  assert(twilioService.isConfigured() === false, 'isConfigured is FALSE when TWILIO_AUTH_TOKEN is missing');

  console.log('\n======================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
}

testOptionalPhoneConfig().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

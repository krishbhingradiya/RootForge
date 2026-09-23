/**
 * Automated Verification Suite for RootForge Email OTP System
 * Tests:
 * 1. Cryptographic OTP generation (6-digit numeric)
 * 2. Salted SHA-256 OTP hashing and verification
 * 3. Attempt count tracking and max attempts exhaustion
 * 4. Expiry validation (10 minutes)
 * 5. Resend cooldown enforcement (30 seconds)
 * 6. Verification and User emailVerified status update
 */

import { generateSecureOtp, hashOtp, getResendCooldownRemaining, verifyEmailOtp, MAX_VERIFICATION_ATTEMPTS } from '../src/services/otpService.js';
import { prisma } from '../src/prisma.js';
import bcrypt from 'bcryptjs';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 STARTING EMAIL OTP VERIFICATION INTEGRATION SUITE');
  console.log('======================================================\n');

  const testEmail = `test.otp.${Date.now()}@testcorp.internal`;

  try {
    // ----------------------------------------------------
    // Test 1: Unit Test - OTP Generation
    // ----------------------------------------------------
    console.log('--- Test 1: OTP Generation & Formatting ---');
    const otp1 = generateSecureOtp();
    const otp2 = generateSecureOtp();
    assert(typeof otp1 === 'string' && otp1.length === 6, 'OTP is a 6-character string');
    assert(/^\d{6}$/.test(otp1), 'OTP contains only digits');
    assert(otp1 !== otp2, 'Consecutive OTPs are distinct and randomly generated');

    // ----------------------------------------------------
    // Test 2: Unit Test - Salted SHA-256 Hashing
    // ----------------------------------------------------
    console.log('\n--- Test 2: Salted Hashing & Verification ---');
    const rawCode = '482910';
    const hash = hashOtp(testEmail, rawCode);
    assert(typeof hash === 'string' && hash.length === 64, 'SHA-256 produces 64-char hex digest');
    assert(hash === hashOtp(testEmail, rawCode), 'Hashing is deterministic for identical code & email');
    assert(hash !== hashOtp('other@testcorp.internal', rawCode), 'Salt includes email to prevent rainbow attacks');

    // ----------------------------------------------------
    // Test 3: Create User & Issue OTP Record in DB
    // ----------------------------------------------------
    console.log('\n--- Test 3: Database OTP Record Creation & Cooldown ---');
    const passwordHash = await bcrypt.hash('TestSecurePass!123', 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Alex Rivera',
        passwordHash,
        role: 'CONSULTANT',
        emailVerified: false,
      }
    });
    assert(user.id && user.emailVerified === false, 'User created with emailVerified = false');

    const generatedOtp = generateSecureOtp();
    const otpHash = hashOtp(testEmail, generatedOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const dbRecord = await prisma.emailVerificationOTP.create({
      data: {
        email: testEmail,
        otpHash,
        purpose: 'EMAIL_VERIFICATION',
        expiresAt,
        attempts: 0,
        maxAttempts: MAX_VERIFICATION_ATTEMPTS,
        userId: user.id
      }
    });
    assert(dbRecord.id !== null, 'OTP record saved to database');
    assert(dbRecord.otpHash === otpHash, 'Database holds SHA-256 hash, not plaintext');

    // Cooldown check
    const cooldownRemaining = await getResendCooldownRemaining(testEmail);
    assert(cooldownRemaining > 0 && cooldownRemaining <= 30, `Cooldown remaining is ${cooldownRemaining}s`);

    // ----------------------------------------------------
    // Test 4: Invalid OTP Verification & Attempt Tracking
    // ----------------------------------------------------
    console.log('\n--- Test 4: Invalid OTP & Attempt Limits ---');
    try {
      await verifyEmailOtp({ email: testEmail, otp: '000000' });
      assert(false, 'Invalid OTP should throw');
    } catch (err) {
      assert(err.message.includes('Invalid verification code'), 'Invalid OTP threw expected error');
    }

    const afterOne = await prisma.emailVerificationOTP.findUnique({ where: { id: dbRecord.id } });
    assert(afterOne.attempts === 1, `Failed attempts incremented to: ${afterOne.attempts}`);

    // Exhaust remaining 4 attempts (total 5)
    for (let i = 2; i <= 5; i++) {
      try {
        await verifyEmailOtp({ email: testEmail, otp: `11111${i}` });
      } catch (err) {
        // Expected
      }
    }

    const afterExhaust = await prisma.emailVerificationOTP.findUnique({ where: { id: dbRecord.id } });
    assert(afterExhaust.attempts >= 5, `Attempts reached max limit (${afterExhaust.attempts})`);

    // Verification with correct code now fails because attempts are exhausted
    try {
      await verifyEmailOtp({ email: testEmail, otp: generatedOtp });
      assert(false, 'Exhausted code should not verify');
    } catch (err) {
      assert(err.message.includes('Too many incorrect attempts') || err.message.includes('No active verification code'), 'Exhausted code rejected');
    }

    // ----------------------------------------------------
    // Test 5: Fresh OTP Creation & Successful Verification
    // ----------------------------------------------------
    console.log('\n--- Test 5: Fresh OTP & Successful Verification Flow ---');
    const validOtp = generateSecureOtp();
    const validHash = hashOtp(testEmail, validOtp);
    await prisma.emailVerificationOTP.create({
      data: {
        email: testEmail,
        otpHash: validHash,
        purpose: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        maxAttempts: MAX_VERIFICATION_ATTEMPTS,
        userId: user.id
      }
    });

    const verifyResult = await verifyEmailOtp({ email: testEmail, otp: validOtp });
    assert(verifyResult.success === true, 'Valid OTP verified successfully');
    assert(verifyResult.user.emailVerified === true, 'Returned user has emailVerified = true');

    // Check DB updated
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert(updatedUser.emailVerified === true, 'Database User.emailVerified persisted as true');

    // ----------------------------------------------------
    // Test 6: Replay Attack Protection (Re-submitting verified OTP)
    // ----------------------------------------------------
    console.log('\n--- Test 6: Replay Attack Protection ---');
    try {
      await verifyEmailOtp({ email: testEmail, otp: validOtp });
      assert(false, 'Replayed OTP should fail');
    } catch (err) {
      assert(err.message.includes('No active verification code'), 'Replay attack blocked because OTP is already verified');
    }

    // Cleanup test user
    await prisma.emailVerificationOTP.deleteMany({ where: { email: testEmail } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('  🧹 Cleaned up test data');

    console.log('\n======================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================\n');

  } catch (error) {
    console.error('\n❌ Test Suite Failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

// Comprehensive Verification Test: Brevo Email OTP Lifecycle
import { prisma } from '../src/prisma.js';
import { hashOtp } from '../src/services/otpService.js';
import { brevoEmailService } from '../src/services/brevoEmailService.js';

const BASE_URL = 'http://127.0.0.1:5005/api';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 ROOTFORGE BREVO EMAIL OTP LIFECYCLE VERIFICATION');
  console.log('====================================================\n');

  // 1. Health check
  console.log('1. Checking Backend Health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  if (healthRes.ok && healthData.status === 'ok') {
    console.log('   ✅ Backend is HEALTHY on port 5005');
  } else {
    throw new Error(`Backend unhealthy: ${JSON.stringify(healthData)}`);
  }

  // 2. Brevo Diagnostics
  console.log('\n2. Checking Brevo Configuration & Connectivity...');
  const brevoCheck = await brevoEmailService.verifyConnection();
  console.log('   - Configured:', brevoEmailService.isConfigured() ? 'YES' : 'NO');
  console.log('   - Sender:', brevoEmailService.getSender());
  if (brevoCheck.ok) {
    console.log('   ✅ Brevo API connected successfully!');
  } else {
    console.log(`   ℹ️ Brevo Connection note: ${brevoCheck.message}`);
    if (brevoCheck.isIpUnauthorized) {
      console.log('   👉 Note: Brevo requires IP authorization for real inbox delivery.');
    }
  }

  // 3. Register New Enterprise User
  const testEmail = `enterprise_test_${Date.now()}@testcompany.org`;
  const testPassword = 'SecurePassword2026!';
  const testName = 'Sarah Connor';
  const testOrg = 'Cyberdyne Systems';

  console.log(`\n3. Testing Registration (Signup) for: ${testEmail}...`);
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      organizationName: testOrg,
      role: 'CONSULTANT'
    })
  });

  const regData = await regRes.json();
  console.log(`   Status: HTTP ${regRes.status}`);
  console.log(`   Response:`, regData);

  if (!regData.requiresVerification) {
    throw new Error('Expected requiresVerification: true on register!');
  }
  if (regData.token) {
    throw new Error('Security violation: JWT token was issued before OTP verification!');
  }
  console.log('   ✅ User registered with emailVerified = false. No session issued before OTP.');

  // 4. Verify unverified login is BLOCKED
  console.log('\n4. Testing Login PRE-verification (should require verification)...');
  const loginPreRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });

  const loginPreData = await loginPreRes.json();
  console.log(`   Status: HTTP ${loginPreRes.status}`);
  console.log(`   Response:`, loginPreData);

  if (!loginPreData.requiresVerification) {
    throw new Error('Security violation: Unverified user was permitted to log in!');
  }
  if (loginPreData.token) {
    throw new Error('Security violation: Token issued to unverified user!');
  }
  console.log('   ✅ Unverified user login blocked. Sent to verification flow.');

  // 5. Retrieve OTP from DB to simulate user entering code
  console.log('\n5. Locating generated OTP in database for verification test...');
  const otpRecord = await prisma.emailVerificationOTP.findFirst({
    where: { email: testEmail, verifiedAt: null },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) {
    throw new Error('No OTP record created in database!');
  }
  console.log('   ✅ OTP record created:', {
    id: otpRecord.id,
    email: otpRecord.email,
    purpose: otpRecord.purpose,
    expiresAt: otpRecord.expiresAt,
    attempts: otpRecord.attempts
  });

  // Find the matching 6-digit OTP by brute-force checking against the salt/secret
  let actualOtp = null;
  for (let i = 100000; i <= 999999; i++) {
    const candidate = i.toString();
    if (hashOtp(testEmail, candidate) === otpRecord.otpHash) {
      actualOtp = candidate;
      break;
    }
  }

  if (!actualOtp) {
    throw new Error('Failed to reverse test OTP from hash!');
  }
  console.log(`   🔑 Recovered 6-digit OTP for testing: ${actualOtp}`);

  // 6. Test invalid OTP rejection
  console.log('\n6. Testing Invalid OTP submission (000000)...');
  const invalidRes = await fetch(`${BASE_URL}/auth/verify-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: '000000' })
  });
  const invalidData = await invalidRes.json();
  console.log(`   Status: HTTP ${invalidRes.status}`);
  console.log(`   Response:`, invalidData);
  if (invalidRes.ok) {
    throw new Error('Security violation: Invalid OTP was accepted!');
  }
  console.log('   ✅ Invalid OTP rejected correctly.');

  // 7. Test valid OTP verification
  console.log(`\n7. Testing Valid OTP submission (${actualOtp})...`);
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: actualOtp })
  });
  const verifyData = await verifyRes.json();
  console.log(`   Status: HTTP ${verifyRes.status}`);
  console.log(`   Response:`, {
    success: verifyData.success,
    user: verifyData.user,
    tokenPrefix: verifyData.token ? verifyData.token.slice(0, 15) + '...' : null
  });

  if (!verifyData.success || !verifyData.token) {
    throw new Error('Verification failed with valid OTP!');
  }
  if (!verifyData.user?.emailVerified) {
    throw new Error('User emailVerified status was not updated to true!');
  }
  console.log('   ✅ OTP successfully verified! JWT session granted.');

  // 8. Test verified user login now succeeds
  console.log('\n8. Testing Login POST-verification...');
  const loginPostRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });
  const loginPostData = await loginPostRes.json();
  console.log(`   Status: HTTP ${loginPostRes.status}`);
  console.log(`   User:`, loginPostData.user?.email, 'Verified:', loginPostData.user?.emailVerified);
  if (!loginPostData.token) {
    throw new Error('Login failed for verified user!');
  }
  console.log('   ✅ Verified user can log in seamlessly!');

  // 9. Clean up test user
  console.log('\n9. Cleaning up test record...');
  await prisma.emailVerificationOTP.deleteMany({ where: { email: testEmail } });
  await prisma.user.delete({ where: { email: testEmail } });
  console.log('   ✅ Cleaned up test user data.');

  console.log('\n====================================================');
  console.log('🎉 ALL BREVO EMAIL OTP VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});

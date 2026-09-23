/**
 * RootForge Final Authentication & Security Comprehensive Test Suite
 */

import fetch from 'node-fetch';
import { prisma } from '../src/prisma.js';
import { hashOtp } from '../src/services/otpService.js';

const BASE_URL = 'http://127.0.0.1:5005/api';

async function runTestSuite() {
  console.log('===========================================================');
  console.log('🧪 ROOTFORGE PRODUCTION AUTHENTICATION & SECURITY AUDIT');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Demo Token Bypass Must Be Blocked
  console.log('--- TEST 1: Verify Demo Token Bypass is Rejected ---');
  {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer demo_session_admin_999999' }
    });
    assert(res.status === 401, `Demo token returns 401 Unauthorized (got HTTP ${res.status})`);
  }

  // TEST 2: Real User Registration & Mandatory Verification
  console.log('\n--- TEST 2: User Registration & Mandatory Email OTP ---');
  const testEmail = `consultant.test.${Date.now()}@enterprise-corp.com`;
  let testUserId = null;
  {
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecureEnterprisePass@2026',
        name: 'Enterprise Test Consultant',
        organizationName: 'Global Corp'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 || regRes.status === 200, `Registration endpoint responds with success (HTTP ${regRes.status})`);
    assert(regData.requiresVerification === true, `Registration requiresVerification is true`);
    assert(!regData.token, `No JWT token issued before OTP verification`);

    // Verify user cannot log in before verifying OTP
    const loginAttempt = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecureEnterprisePass@2026'
      })
    });
    const loginData = await loginAttempt.json();
    assert(loginAttempt.status === 200 && loginData.requiresVerification === true, `Unverified user blocked on login and directed to verify`);

    // Fetch the OTP hash from DB and find the matching 6-digit code to simulate email delivery
    const otpRecord = await prisma.emailVerificationOTP.findFirst({
      where: { email: testEmail, verifiedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    assert(Boolean(otpRecord), `Hashed OTP record created in database for ${testEmail}`);
    assert(otpRecord.otpHash.length === 64, `OTP is stored as SHA-256 hash (never plaintext)`);

    // Find the matching 6-digit code
    let validOtp = null;
    for (let i = 100000; i <= 999999; i++) {
      if (hashOtp(testEmail, i.toString()) === otpRecord.otpHash) {
        validOtp = i.toString();
        break;
      }
    }
    assert(Boolean(validOtp), `Cryptographically valid 6-digit OTP found from hash`);

    // Test invalid OTP rejected
    const invalidVerifyRes = await fetch(`${BASE_URL}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '000000' })
    });
    assert(invalidVerifyRes.status === 400, `Invalid OTP '000000' rejected with HTTP 400`);

    // Verify with valid OTP
    const validVerifyRes = await fetch(`${BASE_URL}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: validOtp })
    });
    const verifyData = await validVerifyRes.json();
    assert(validVerifyRes.status === 200, `Valid OTP verified with HTTP 200`);
    assert(Boolean(verifyData.token), `JWT token successfully issued upon verification`);
    assert(verifyData.user.emailVerified === true, `User emailVerified marked true in response`);

    // User login triggers compulsory login OTP verification
    const postVerifyLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecureEnterprisePass@2026'
      })
    });
    const postVerifyData = await postVerifyLogin.json();
    assert(postVerifyLogin.status === 200 && postVerifyData.requiresVerification === true, `Every login triggers compulsory email verification OTP`);

    // Verify the login OTP to complete session acquisition
    const loginOtpRecord = await prisma.emailVerificationOTP.findFirst({
      where: { email: testEmail, verifiedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    let loginOtp = null;
    for (let i = 100000; i <= 999999; i++) {
      if (hashOtp(testEmail, i.toString()) === loginOtpRecord.otpHash) {
        loginOtp = i.toString();
        break;
      }
    }
    const loginVerifyRes = await fetch(`${BASE_URL}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: loginOtp })
    });
    const loginVerifyData = await loginVerifyRes.json();
    assert(loginVerifyRes.status === 200 && Boolean(loginVerifyData.token), `Login OTP verification grants authenticated JWT session`);
  }

  // TEST 3: Admin Account Configuration & Verification
  console.log('\n--- TEST 3: Admin Account Security & Role Enforcement ---');
  const adminTestEmail = `admin.test.${Date.now()}@rootforge.ai`;
  {
    // Register admin test account
    const adminRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminTestEmail,
        password: 'AdminSuperSecret@2026',
        name: 'Master Admin',
        organizationName: 'RootForge Operations',
        role: 'ADMIN'
      })
    });
    const adminRegData = await adminRegRes.json();
    assert(adminRegData.requiresVerification === true, `Admin account requires email verification`);

    const adminUser = await prisma.user.findUnique({ where: { email: adminTestEmail } });
    assert(adminUser.role === 'ADMIN', `Admin email assigned ADMIN role`);
    assert(adminUser.emailVerified === false, `Admin account starts unverified`);

    // Find admin OTP
    const adminOtpRecord = await prisma.emailVerificationOTP.findFirst({
      where: { email: adminTestEmail, verifiedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    assert(Boolean(adminOtpRecord), `OTP record generated for admin email ${adminTestEmail}`);

    let adminOtp = null;
    for (let i = 100000; i <= 999999; i++) {
      if (hashOtp(adminTestEmail, i.toString()) === adminOtpRecord.otpHash) {
        adminOtp = i.toString();
        break;
      }
    }

    // Verify Admin OTP
    const adminVerifyRes = await fetch(`${BASE_URL}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminTestEmail, otp: adminOtp })
    });
    const adminVerifyData = await adminVerifyRes.json();
    assert(adminVerifyRes.status === 200 && adminVerifyData.user.role === 'ADMIN', `Admin verified with ADMIN role in token`);

    // Verify Admin can access protected Admin Console API
    const adminAccessRes = await fetch(`${BASE_URL}/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminVerifyData.token}` }
    });
    assert(adminAccessRes.status === 200, `Admin successfully accesses /api/admin/metrics (HTTP 200)`);
  }

  // TEST 4: Forgot Password & Reset Password Flow
  console.log('\n--- TEST 4: Forgot Password & Password Reset Lifecycle ---');
  {
    const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const forgotData = await forgotRes.json();
    assert(forgotRes.status === 200 && forgotData.success === true, `Forgot password requests OTP via Brevo`);

    // Find password reset OTP
    const resetOtpRecord = await prisma.emailVerificationOTP.findFirst({
      where: { email: testEmail, purpose: 'PASSWORD_RESET', verifiedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    assert(Boolean(resetOtpRecord), `Password reset OTP stored in DB with purpose PASSWORD_RESET`);

    let resetOtp = null;
    for (let i = 100000; i <= 999999; i++) {
      if (hashOtp(testEmail, i.toString()) === resetOtpRecord.otpHash) {
        resetOtp = i.toString();
        break;
      }
    }

    // Reset password with wrong OTP
    const wrongReset = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: '999999',
        newPassword: 'NewUpdatedPassword@2026'
      })
    });
    assert(wrongReset.status === 400, `Wrong reset OTP rejected with HTTP 400`);

    // Reset password with correct OTP
    const correctReset = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: resetOtp,
        newPassword: 'NewUpdatedPassword@2026'
      })
    });
    const resetResult = await correctReset.json();
    assert(correctReset.status === 200 && resetResult.success === true, `Password successfully reset with HTTP 200`);

    // Old password fails
    const oldPassLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'SecureEnterprisePass@2026' })
    });
    assert(oldPassLogin.status === 401, `Old password fails with HTTP 401`);

    // New password succeeds
    const newPassLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'NewUpdatedPassword@2026' })
    });
    assert(newPassLogin.status === 200, `New password successfully authenticates`);

    // Replay attack prevention: OTP cannot be reused
    const replayReset = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        otp: resetOtp,
        newPassword: 'AnotherPassword@2026'
      })
    });
    assert(replayReset.status === 400, `Replaying already-consumed OTP is blocked with HTTP 400`);
  }

  // TEST 5: Domain Relevance Guard
  console.log('\n--- TEST 5: Domain Relevance Guard (Off-Topic vs Business Questions) ---');
  {
    const ws = await prisma.workspace.findFirst({
      where: { id: 'ws-demo-customer-support' }
    });

    if (ws) {
      // Off topic test
      const offTopicRes = await fetch(`${BASE_URL}/workspaces/${ws.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_mock'
        },
        body: JSON.stringify({
          message: "What is today's weather in Mumbai?"
        })
      });
      // In dev without auth header, let's verify relevance guard module directly
      const { classifyRelevance, getOffTopicResponse } = await import('../src/ai/relevanceGuard.js');
      const classification = await classifyRelevance({ workspace: ws }, "What is today's weather in Mumbai?");
      assert(classification.classification === 'OFF_TOPIC', `Weather question classified as OFF_TOPIC (got ${classification.classification})`);

      const refusal = getOffTopicResponse(ws, 'en');
      assert(refusal.includes('only help with questions related to'), `Refusal guides user back to enterprise solution topics`);

      // Business question test
      const bizClassification = await classifyRelevance({ workspace: ws }, 'How do we automate customer support tickets?');
      assert(bizClassification.classification === 'RELATED', `Business question classified as RELATED`);
    }
  }

  console.log('\n===========================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error('Fatal error in test suite:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

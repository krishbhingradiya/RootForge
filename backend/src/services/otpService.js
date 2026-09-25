import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { brevoEmailService } from './brevoEmailService.js';

export const RESEND_COOLDOWN_SECONDS = 30;
export const DEFAULT_OTP_EXPIRY_MINUTES = 10;
export const MAX_VERIFICATION_ATTEMPTS = 5;

/**
 * Computes salted SHA-256 hash of an OTP for a given email address
 */
export function hashOtp(email, otp) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const secret = process.env.JWT_SECRET || 'rootforge_enterprise_otp_salt_2026';
  return crypto
    .createHash('sha256')
    .update(`${normalizedEmail}:${otp}:${secret}`)
    .digest('hex');
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP string
 */
export function generateSecureOtp() {
  const otpNumber = crypto.randomInt(100000, 1000000);
  return otpNumber.toString();
}

/**
 * Checks remaining cooldown seconds for an email (optionally scoped by purpose)
 */
export async function getResendCooldownRemaining(email, purpose = null) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const where = { email: normalizedEmail, verifiedAt: null };
  if (purpose) {
    where.purpose = purpose;
  }
  const latestOtp = await prisma.emailVerificationOTP.findFirst({
    where,
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!latestOtp) return 0;

  const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime();
  const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000;

  if (elapsedMs < cooldownMs) {
    return Math.ceil((cooldownMs - elapsedMs) / 1000);
  }

  return 0;
}

/**
 * Generates a secure OTP, saves hashed record in database, and sends email via Brevo
 * 
 * @param {Object} params
 * @param {string} params.email - User email address
 * @param {string} [params.name] - User name
 * @param {string} [params.userId] - Optional User ID reference
 * @returns {Promise<{ success: boolean, email: string, expiresAt: Date, cooldownSeconds: number }>}
 */
export async function createAndSendVerificationOtp({ email, name = '', userId = null }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid corporate email address is required.');
  }

  // 1. Enforce 30s resend cooldown
  const remainingCooldown = await getResendCooldownRemaining(normalizedEmail);
  if (remainingCooldown > 0) {
    const error = new Error(`Please wait ${remainingCooldown}s before requesting a new verification code.`);
    error.statusCode = 429;
    error.cooldownRemaining = remainingCooldown;
    throw error;
  }

  // 2. Invalidate any existing unverified OTPs for this email
  await prisma.emailVerificationOTP.updateMany({
    where: {
      email: normalizedEmail,
      verifiedAt: null
    },
    data: {
      verifiedAt: new Date(0) // Marker for superseded/invalidated OTP
    }
  });

  // 3. Generate secure 6-digit OTP
  const rawOtp = generateSecureOtp();
  const otpHash = hashOtp(normalizedEmail, rawOtp);

  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || DEFAULT_OTP_EXPIRY_MINUTES;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // 4. Store hashed OTP in database
  await prisma.emailVerificationOTP.create({
    data: {
      email: normalizedEmail,
      otpHash,
      purpose: 'EMAIL_VERIFICATION',
      expiresAt,
      attempts: 0,
      maxAttempts: MAX_VERIFICATION_ATTEMPTS,
      userId: userId || undefined
    }
  });

  // 5. Send real transactional email via Brevo
  try {
    // In dev mode, log OTP to server console for local testing and visibility
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`🔑 [RootForge OTP Dispatch]`);
      console.log(`📧 Recipient: ${normalizedEmail}`);
      console.log(`🔢 6-Digit Code: ${rawOtp}`);
      console.log(`⏱️ Expiry: ${expiryMinutes} minutes`);
      console.log(`======================================================\n`);
    }

    await brevoEmailService.sendVerificationEmail({
      toEmail: normalizedEmail,
      toName: name,
      otp: rawOtp,
      expiryMinutes
    });
  } catch (emailError) {
    // If Brevo delivery fails, log cleanly
    console.error('[OTP Service] Brevo delivery error:', emailError.message);
    if (emailError.isIpUnauthorized) {
      const ipMatch = emailError.message.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
      const detectedIp = ipMatch ? ipMatch[0] : '';
      console.log(`\n------------------------------------------------------`);
      console.log(`🚨 [BREVO IP AUTHORIZATION REQUIRED]`);
      if (detectedIp) {
        console.log(`👉 Detected IP to authorize: ${detectedIp}`);
      }
      console.log(`👉 Please visit: https://app.brevo.com/security/authorised_ips`);
      console.log(`👉 Add your IP or disable IP filtering in Brevo to deliver real emails.`);
      console.log(`------------------------------------------------------\n`);
      const err = new Error(`Brevo blocked delivery: Your IP address (${detectedIp || 'current'}) must be authorized in Brevo settings (https://app.brevo.com/security/authorised_ips).`);
      err.statusCode = 403;
      err.isIpUnauthorized = true;
      err.detectedIp = detectedIp;
      err.rawOtp = rawOtp;
      throw err;
    }
    // Don't re-throw raw provider errors to client in production
    const err = new Error(emailError.message || 'Failed to deliver verification code to your email. Please verify your email address and try again.');
    err.statusCode = emailError.statusCode || 500;
    err.rawOtp = rawOtp;
    throw err;
  }

  return {
    success: true,
    email: normalizedEmail,
    expiresAt,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS
  };
}

/**
 * Validates a submitted 6-digit OTP against the stored hash
 * 
 * @param {Object} params
 * @param {string} params.email - User email address
 * @param {string} params.otp - Submitted 6-digit OTP
 * @returns {Promise<{ success: boolean, user: Object }>}
 */
export async function verifyEmailOtp({ email, otp }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanOtp = (otp || '').toString().trim();

  if (!normalizedEmail || !cleanOtp) {
    const error = new Error('Email address and 6-digit verification code are required.');
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{6}$/.test(cleanOtp)) {
    const error = new Error('Verification code must be exactly 6 digits.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch latest active unverified OTP for this email
  const otpRecord = await prisma.emailVerificationOTP.findFirst({
    where: {
      email: normalizedEmail,
      verifiedAt: null
    },
    select: {
      id: true,
      otpHash: true,
      expiresAt: true,
      attempts: true,
      maxAttempts: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) {
    const error = new Error('No active verification code found. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Check Expiration
  if (new Date() > new Date(otpRecord.expiresAt)) {
    const error = new Error('Verification code has expired. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Check Maximum Attempt Limit
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    // Invalidate the record due to brute-force lockout
    await prisma.emailVerificationOTP.update({
      where: { id: otpRecord.id },
      data: { verifiedAt: new Date(0) }
    });
    const error = new Error('Too many incorrect attempts. This code is now invalid. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Verify OTP Hash
  const submittedHash = hashOtp(normalizedEmail, cleanOtp);

  if (submittedHash !== otpRecord.otpHash) {
    // Increment failed attempt counter
    const updated = await prisma.emailVerificationOTP.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } }
    });

    const attemptsRemaining = otpRecord.maxAttempts - updated.attempts;
    let message = 'Invalid verification code. Please check and try again.';
    if (attemptsRemaining > 0 && attemptsRemaining <= 3) {
      message = `Invalid verification code. ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining before code is invalidated.`;
    }

    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  // 5. Success: Mark OTP verified
  await prisma.emailVerificationOTP.update({
    where: { id: otpRecord.id },
    data: { verifiedAt: new Date() }
  });

  // 6. Update user's emailVerified status in database
  const user = await prisma.user.update({
    where: { email: normalizedEmail },
    data: { emailVerified: true },
    include: { organization: true }
  });

  return {
    success: true,
    user
  };
}

/**
 * Generates and sends a single-use Password Reset OTP via Brevo
 * 
 * @param {Object} params
 * @param {string} params.email - User email address
 * @returns {Promise<{ success: boolean, email: string, expiresAt?: Date, cooldownSeconds?: number, message?: string }>}
 */
export async function createAndSendPasswordResetOtp({ email }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid corporate email address is required.');
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    // Return success to prevent corporate email enumeration
    return {
      success: true,
      email: normalizedEmail,
      message: 'If an account with this corporate email exists, a password reset code has been sent.',
      cooldownSeconds: RESEND_COOLDOWN_SECONDS
    };
  }

  // 1. Enforce 30s resend cooldown
  const remainingCooldown = await getResendCooldownRemaining(normalizedEmail, 'PASSWORD_RESET');
  if (remainingCooldown > 0) {
    const error = new Error(`Please wait ${remainingCooldown}s before requesting a new password reset code.`);
    error.statusCode = 429;
    error.cooldownRemaining = remainingCooldown;
    throw error;
  }

  // 2. Invalidate any existing unverified OTPs for this email with purpose PASSWORD_RESET
  await prisma.emailVerificationOTP.updateMany({
    where: {
      email: normalizedEmail,
      purpose: 'PASSWORD_RESET',
      verifiedAt: null
    },
    data: {
      verifiedAt: new Date(0)
    }
  });

  // 3. Generate secure 6-digit OTP
  const rawOtp = generateSecureOtp();
  const otpHash = hashOtp(normalizedEmail, rawOtp);

  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || DEFAULT_OTP_EXPIRY_MINUTES;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // 4. Store hashed OTP record in database
  await prisma.emailVerificationOTP.create({
    data: {
      email: normalizedEmail,
      otpHash,
      purpose: 'PASSWORD_RESET',
      expiresAt,
      attempts: 0,
      maxAttempts: MAX_VERIFICATION_ATTEMPTS,
      userId: user.id
    }
  });

  // 5. Send real password reset email via Brevo
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`🔑 [RootForge Password Reset OTP Dispatch]`);
      console.log(`📧 Recipient: ${normalizedEmail}`);
      console.log(`🔢 6-Digit Code: ${rawOtp}`);
      console.log(`⏱️ Expiry: ${expiryMinutes} minutes`);
      console.log(`======================================================\n`);
    }

    await brevoEmailService.sendPasswordResetEmail({
      toEmail: normalizedEmail,
      toName: user.name,
      otp: rawOtp,
      expiryMinutes
    });
  } catch (emailError) {
    console.error('[OTP Service] Brevo password reset delivery error:', emailError.message);
    if (emailError.isIpUnauthorized) {
      const err = new Error(`Brevo blocked delivery: Your IP address must be authorized in Brevo settings (https://app.brevo.com/security/authorised_ips).`);
      err.statusCode = 403;
      err.isIpUnauthorized = true;
      err.rawOtp = rawOtp;
      throw err;
    }
    const err = new Error(emailError.message || 'Failed to deliver password reset code to your email.');
    err.statusCode = emailError.statusCode || 500;
    err.rawOtp = rawOtp;
    throw err;
  }

  return {
    success: true,
    email: normalizedEmail,
    expiresAt,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS
  };
}

/**
 * Verifies single-use Password Reset OTP and updates password hash with bcrypt
 * 
 * @param {Object} params
 * @param {string} params.email - User email address
 * @param {string} params.otp - 6-digit OTP
 * @param {string} params.newPassword - New plaintext password to hash
 * @returns {Promise<{ success: boolean, message: string, user: Object }>}
 */
export async function verifyPasswordResetOtp({ email, otp, newPassword }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanOtp = (otp || '').toString().trim();

  if (!normalizedEmail || !cleanOtp || !newPassword) {
    const error = new Error('Email, 6-digit verification code, and new password are required.');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 6) {
    const error = new Error('New password must be at least 6 characters long.');
    error.statusCode = 400;
    throw error;
  }

  if (!/^\d{6}$/.test(cleanOtp)) {
    const error = new Error('Verification code must be exactly 6 digits.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch latest active unverified PASSWORD_RESET OTP
  const otpRecord = await prisma.emailVerificationOTP.findFirst({
    where: {
      email: normalizedEmail,
      purpose: 'PASSWORD_RESET',
      verifiedAt: null
    },
    select: {
      id: true,
      otpHash: true,
      expiresAt: true,
      attempts: true,
      maxAttempts: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) {
    const error = new Error('No active password reset request found. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Check Expiry
  if (new Date() > new Date(otpRecord.expiresAt)) {
    const error = new Error('Password reset code has expired. Please request a new code.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Check Maximum Attempt Limit
  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await prisma.emailVerificationOTP.update({
      where: { id: otpRecord.id },
      data: { verifiedAt: new Date(0) }
    });
    const error = new Error('Too many incorrect attempts. This code is now invalid. Please request a new password reset code.');
    error.statusCode = 400;
    throw error;
  }

  // 4. Verify OTP Hash
  const submittedHash = hashOtp(normalizedEmail, cleanOtp);

  if (submittedHash !== otpRecord.otpHash) {
    const updated = await prisma.emailVerificationOTP.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } }
    });

    const attemptsRemaining = otpRecord.maxAttempts - updated.attempts;
    let message = 'Invalid reset code. Please check and try again.';
    if (attemptsRemaining > 0 && attemptsRemaining <= 3) {
      message = `Invalid reset code. ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining before code is invalidated.`;
    }

    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }

  // 5. Mark OTP verified / consumed (single-use)
  await prisma.emailVerificationOTP.update({
    where: { id: otpRecord.id },
    data: { verifiedAt: new Date() }
  });

  // 6. Hash new password with bcrypt
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // 7. Update user password in database
  const user = await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      passwordHash,
      emailVerified: true
    },
    include: { organization: true }
  });

  return {
    success: true,
    message: 'Your password has been reset successfully. Please sign in with your new password.',
    user
  };
}

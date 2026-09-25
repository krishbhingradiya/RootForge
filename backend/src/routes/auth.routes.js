import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { signToken, authenticate } from '../middleware/auth.js';
import {
  createAndSendVerificationOtp,
  verifyEmailOtp,
  getResendCooldownRemaining,
  createAndSendPasswordResetOtp,
  verifyPasswordResetOtp
} from '../services/otpService.js';
import { logAdminAction } from '../services/adminAudit.service.js';

const router = Router();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'mgpro9090@gmail.com').trim().toLowerCase();

// Register new user (with mandatory Email OTP verification)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, organizationName, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({ error: 'A verified account with this corporate email already exists. Please sign in.' });
    }

    let orgId = null;
    if (organizationName) {
      const org = await prisma.organization.create({
        data: {
          name: organizationName,
          industry: 'Enterprise Solutions'
        }
      });
      orgId = org.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = normalizedEmail === ADMIN_EMAIL ? 'ADMIN' : 'CONSULTANT';
    let user;

    if (existingUser && !existingUser.emailVerified) {
      // Update pending unverified account
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          name,
          role: assignedRole,
          organizationId: orgId || existingUser.organizationId
        },
        include: { organization: true }
      });
    } else {
      // Create new unverified user
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          role: assignedRole,
          emailVerified: false,
          organizationId: orgId
        },
        include: { organization: true }
      });
    }

    // Generate and send real OTP via Brevo
    try {
      await createAndSendVerificationOtp({
        email: normalizedEmail,
        name: user.name,
        userId: user.id
      });
    } catch (otpErr) {
      if (otpErr.statusCode === 429) {
        // Cooldown active; still redirect to verification
        return res.status(200).json({
          requiresVerification: true,
          email: normalizedEmail,
          message: 'A verification code was recently sent. Please check your inbox.',
          cooldownRemaining: otpErr.cooldownRemaining
        });
      }

      console.error('Failed to send verification OTP on register:', otpErr.message);

      if (process.env.NODE_ENV !== 'production') {
        const isIp = otpErr.isIpUnauthorized;
        return res.status(201).json({
          requiresVerification: true,
          email: normalizedEmail,
          warning: isIp
            ? `Brevo blocked real email delivery because IP ${otpErr.detectedIp || ''} is not authorized in Brevo settings.`
            : (otpErr.message || 'Email delivery notice'),
          message: isIp
            ? 'Brevo IP authorization required (https://app.brevo.com/security/authorised_ips). To deliver real emails, add your IP or disable IP filtering in Brevo.'
            : `Real email delivery encountered an issue (${otpErr.message}).`,
          devCode: otpErr.rawOtp || null,
          detectedIp: otpErr.detectedIp || null
        });
      }

      return res.status(otpErr.statusCode || 500).json({ error: otpErr.message || 'Failed to send verification email. Please try again.' });
    }

    // Return requiresVerification response (do NOT issue token until OTP verified)
    res.status(201).json({
      requiresVerification: true,
      email: normalizedEmail,
      message: 'Registration initiated. Verification code sent to your email.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed due to server error.' });
  }
});

// Login (enforces email verification for all accounts)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compulsory Email Verification OTP on EVERY login (Two-Factor / Login OTP)
    let lastOtpErr = null;
    let cooldown = 30;
    try {
      const otpRes = await createAndSendVerificationOtp({
        email: normalizedEmail,
        name: user.name,
        userId: user.id
      });
      cooldown = otpRes.cooldownSeconds || 30;
    } catch (otpErr) {
      lastOtpErr = otpErr;
      cooldown = otpErr.cooldownRemaining || 30;
    }

    return res.status(200).json({
      requiresVerification: true,
      email: normalizedEmail,
      warning: lastOtpErr?.isIpUnauthorized
        ? `Brevo blocked real email delivery because IP ${lastOtpErr.detectedIp || ''} is not authorized in Brevo.`
        : lastOtpErr ? lastOtpErr.message : null,
      message: 'A 6-digit verification code has been dispatched to your email to complete login.',
      cooldownRemaining: cooldown,
      devCode: (process.env.NODE_ENV !== 'production' && lastOtpErr?.rawOtp) ? lastOtpErr.rawOtp : null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed due to server error.' });
  }
});

// Verify 6-digit Email OTP (issues authenticated JWT session for registration or login)
router.post('/verify-email-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email address and 6-digit verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { user } = await verifyEmailOtp({ email: normalizedEmail, otp });

    const isRealAdmin = normalizedEmail === ADMIN_EMAIL;
    const effectiveRole = isRealAdmin ? 'ADMIN' : (user.role === 'ADMIN' ? 'CONSULTANT' : user.role);

    // Update lastLoginAt timestamp and ensure non-admin email does not retain ADMIN role
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...(!isRealAdmin && user.role === 'ADMIN' ? { role: 'CONSULTANT' } : {})
      }
    });

    // Record login in immutable audit log
    await logAdminAction({
      userId: user.id,
      userName: user.name,
      userRole: effectiveRole,
      action: 'USER_LOGIN',
      resource: 'AUTH',
      resourceId: user.id,
      details: `User ${user.name} (${user.email}) logged in successfully via 2FA Email OTP.`,
      organizationId: user.organizationId
    });

    // Issue authenticated JWT session
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole,
      organizationId: user.organizationId
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: effectiveRole,
        emailVerified: true,
        organization: user.organization
      }
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message || 'Verification failed.' });
  }
});

// Resend Email Verification OTP
router.post('/resend-verification-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    const result = await createAndSendVerificationOtp({
      email: normalizedEmail,
      name: user?.name || '',
      userId: user?.id || null
    });

    res.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      cooldownSeconds: result.cooldownSeconds
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      return res.json({
        success: true,
        warning: error.isIpUnauthorized
          ? `Brevo blocked real email delivery because IP ${error.detectedIp || ''} is not authorized in Brevo settings.`
          : (error.message || 'Email delivery notice'),
        message: error.isIpUnauthorized
          ? 'Brevo IP authorization required (https://app.brevo.com/security/authorised_ips).'
          : 'Fresh verification code generated.',
        devCode: error.rawOtp || null,
        cooldownSeconds: 30
      });
    }
    const status = error.statusCode || 400;
    res.status(status).json({
      error: error.message || 'Failed to resend verification code.',
      cooldownRemaining: error.cooldownRemaining
    });
  }
});

// Alias: Send Verification OTP
router.post('/send-verification-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    const result = await createAndSendVerificationOtp({
      email: normalizedEmail,
      name: user?.name || '',
      userId: user?.id || null
    });

    res.json({
      success: true,
      message: 'Verification code sent.',
      cooldownSeconds: result.cooldownSeconds
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && error.isIpUnauthorized) {
      return res.json({
        success: true,
        message: 'Brevo IP authorization required (https://app.brevo.com/security/authorised_ips). A fresh code was logged to your dev terminal.',
        cooldownSeconds: 30
      });
    }
    const status = error.statusCode || 400;
    res.status(status).json({
      error: error.message || 'Failed to send verification code.',
      cooldownRemaining: error.cooldownRemaining
    });
  }
});

// Request Password Reset OTP (Sends 6-digit OTP via Brevo)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Corporate email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await createAndSendPasswordResetOtp({ email: normalizedEmail });

    res.json({
      success: true,
      message: result.message || 'If an account exists with this corporate email, a password reset code has been sent.',
      cooldownSeconds: result.cooldownSeconds
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (process.env.NODE_ENV !== 'production' && error.isIpUnauthorized) {
      return res.json({
        success: true,
        message: 'Brevo IP authorization required (https://app.brevo.com/security/authorised_ips). A fresh code was logged to your dev terminal.',
        devCode: error.rawOtp || null,
        cooldownSeconds: 30
      });
    }
    const status = error.statusCode || 400;
    res.status(status).json({
      error: error.message || 'Failed to process password reset request.',
      cooldownRemaining: error.cooldownRemaining
    });
  }
});

// Reset Password with single-use OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await verifyPasswordResetOtp({
      email: normalizedEmail,
      otp,
      newPassword
    });

    res.json(result);
  } catch (error) {
    console.error('Password reset error:', error);
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message || 'Password reset failed.' });
  }
});

// Get Current User Profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        organization: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isRealAdmin = user.email.trim().toLowerCase() === ADMIN_EMAIL;
    user.role = isRealAdmin ? 'ADMIN' : (user.role === 'ADMIN' ? 'CONSULTANT' : user.role);

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

export default router;


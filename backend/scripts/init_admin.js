#!/usr/bin/env node
/**
 * RootForge Admin Account Initialization Script
 * 
 * Securely creates or updates the administrator account using environment variables.
 * NEVER prints or logs secret credentials.
 * 
 * Usage:
 *   ADMIN_PASSWORD="YourSecurePasswordHere" node scripts/init_admin.js
 *   or configure ADMIN_PASSWORD in backend/.env
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma.js';
import { createAndSendVerificationOtp } from '../src/services/otpService.js';

async function initAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'mgpro9090@gmail.com').trim().toLowerCase();
  const rawPassword = (process.env.ADMIN_PASSWORD || '').trim();

  console.log('====================================================');
  console.log('🛡️  RootForge Administrator Setup & Verification');
  console.log(`📧 Target Admin Email: ${adminEmail}`);
  console.log('====================================================');

  if (!rawPassword) {
    console.error('\n⚠️  [ADMIN CONFIGURATION REQUIRED]');
    console.error('👉 Please set ADMIN_PASSWORD in your backend/.env file.');
    console.error('👉 Example: ADMIN_PASSWORD=YourStrongSecretKey2026\n');
    process.exit(1);
  }

  // 1. Ensure Organization Exists
  let org = await prisma.organization.findFirst({
    where: { name: 'RootForge Global' }
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'RootForge Global',
        industry: 'Enterprise Solutions'
      }
    });
  }

  // 2. Hash Password Securely with bcrypt
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 3. Upsert Admin User
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  let adminUser;
  if (existingUser) {
    adminUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: 'ADMIN',
        passwordHash,
        organizationId: org.id
      }
    });
    console.log(`✅ Existing account updated with ADMIN role and updated credentials.`);
  } else {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'RootForge Administrator',
        role: 'ADMIN',
        emailVerified: false,
        organizationId: org.id
      }
    });
    console.log(`✅ New Administrator account created in database.`);
  }

  // 4. Verification Check
  if (!adminUser.emailVerified) {
    console.log(`\n📬 Dispatching real email OTP verification to: ${adminEmail}...`);
    try {
      await createAndSendVerificationOtp({
        email: adminEmail,
        name: adminUser.name,
        userId: adminUser.id
      });
      console.log(`✅ Verification email dispatched via Brevo to ${adminEmail}.`);
      console.log(`👉 Please check the inbox of ${adminEmail} to complete verification.`);
    } catch (err) {
      console.warn(`ℹ️  OTP dispatch notice: ${err.message}`);
    }
  } else {
    console.log(`🔒 Account is already email-verified. Ready for Sign In.`);
  }

  console.log('\n====================================================');
  console.log('🎉 Admin initialization completed successfully.');
  console.log('====================================================\n');
}

initAdmin()
  .catch((err) => {
    console.error('❌ Admin initialization failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

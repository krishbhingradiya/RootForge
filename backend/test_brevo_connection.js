// Brevo Connection & Diagnostic Verification Tool for RootForge
import './src/config/env.js';
import { brevoEmailService } from './src/services/brevoEmailService.js';

async function runDiagnostics() {
  console.log('\n======================================================');
  console.log('🔍 ROOTFORGE BREVO EMAIL SERVICE DIAGNOSTICS');
  console.log('======================================================\n');

  // Step 1: Check Environment Variables
  const apiKey = brevoEmailService.getApiKey();
  const sender = brevoEmailService.getSender();
  const isConfigured = brevoEmailService.isConfigured();

  console.log('1. Configuration Check:');
  console.log(`   - Configured: ${isConfigured ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Sender Name: ${sender.name || 'Not set'}`);
  console.log(`   - Sender Email: ${sender.email || 'Not set'}`);
  console.log(`   - API Key Prefix: ${apiKey ? apiKey.substring(0, 12) + '...' : 'Missing'}`);

  if (!isConfigured) {
    console.error('\n❌ BREVO_API_KEY is not properly set in backend/.env');
    process.exit(1);
  }

  // Step 2: Test API Connectivity & Account Status
  console.log('\n2. Testing Brevo API Connectivity (/v3/account)...');
  const connResult = await brevoEmailService.verifyConnection();

  if (!connResult.ok) {
    console.error(`\n❌ Brevo API Connection Failed (Status: ${connResult.statusCode || 'N/A'})`);
    console.error(`   Message: ${connResult.message}`);

    if (connResult.isIpUnauthorized) {
      console.log('\n------------------------------------------------------');
      console.log('🚨 ACTION REQUIRED: AUTHORIZE YOUR IP IN BREVO');
      console.log('------------------------------------------------------');
      console.log('Brevo security has blocked this request because your current');
      console.log('IP address is not in your Brevo account\'s Authorized IPs.');
      console.log('\n👉 HOW TO FIX:');
      console.log('1. Open: https://app.brevo.com/security/authorised_ips');
      console.log('2. Look at the IP address mentioned in the error above (e.g. 117.239.83.194)');
      console.log('3. Add that IP to the "Authorized IPs" list, OR disable IP filtering.');
      console.log('4. Run this script again: node test_brevo_connection.js\n');
    }
    return;
  }

  console.log('   ✅ API Connection Successful!');
  console.log(`   - Brevo Account Email: ${connResult.account?.email}`);
  console.log(`   - Brevo Company: ${connResult.account?.companyName || 'N/A'}`);

  // Step 3: Test Sending a Real Transactional Verification Email
  const testRecipient = process.argv[2] || sender.email;
  console.log(`\n3. Sending Test Verification Email to: ${testRecipient}...`);

  try {
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const sendResult = await brevoEmailService.sendVerificationEmail({
      toEmail: testRecipient,
      toName: 'RootForge Admin',
      otp: testOtp,
      expiryMinutes: 10
    });

    console.log('\n======================================================');
    console.log('🎉 EMAIL DISPATCH SUCCESSFUL!');
    console.log(`   - Message ID: ${sendResult.messageId || 'sent'}`);
    console.log(`   - Destination: ${testRecipient}`);
    console.log(`   - Verification OTP: ${testOtp}`);
    console.log('   Please check your email inbox (and spam/promotions folder).');
    console.log('======================================================\n');
  } catch (err) {
    console.error(`\n❌ Email send failed: ${err.message}`);
  }
}

runDiagnostics().catch(console.error);

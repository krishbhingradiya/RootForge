// Brevo Transactional Email Service for RootForge
// Strictly Backend-Only: Never expose BREVO_API_KEY to frontend or mobile clients

export class BrevoEmailService {
  constructor() {
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
  }

  getApiKey() {
    return (process.env.BREVO_API_KEY || '').trim();
  }

  getSender() {
    return {
      name: (process.env.BREVO_SENDER_NAME || 'RootForge').trim(),
      email: (process.env.BREVO_SENDER_EMAIL || 'noreply@rootforge.com').trim()
    };
  }

  isConfigured() {
    const key = this.getApiKey();
    return Boolean(key && key !== 'your_real_brevo_api_key');
  }

  /**
   * Generates a responsive, enterprise-grade HTML email template for RootForge OTP
   */
  generateOtpEmailHtml(name, otp, expiryMinutes = 10) {
    const greetingName = name ? `Hello ${name},` : 'Hello,';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your RootForge email address</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0B0F17;
      margin: 0;
      padding: 24px 12px;
      color: #E2E8F0;
    }
    .email-container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #111827;
      border: 1px solid #1F2937;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #182234 0%, #0B0F17 100%);
      padding: 28px 32px;
      border-bottom: 1px solid #1F2937;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      background: linear-gradient(135deg, #D97706, #B45309);
      color: #FFFFFF;
      font-weight: 800;
      font-size: 14px;
      padding: 6px 14px;
      border-radius: 6px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .brand-title {
      color: #F8FAFC;
      font-size: 20px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px 32px 24px 32px;
      color: #CBD5E1;
      font-size: 15px;
      line-height: 1.6;
    }
    .otp-card {
      background: #0B0F17;
      border: 1px solid #374151;
      border-left: 4px solid #D97706;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      color: #94A3B8;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SF Mono', 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      color: #F59E0B;
      letter-spacing: 8px;
      margin: 0;
    }
    .expiry-note {
      color: #94A3B8;
      font-size: 13px;
      margin-top: 10px;
    }
    .security-notice {
      background-color: #1E293B;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 13px;
      color: #94A3B8;
      margin-top: 20px;
    }
    .footer {
      background-color: #0B0F17;
      padding: 20px 32px;
      border-top: 1px solid #1F2937;
      text-align: center;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo-badge">RootForge</div>
      <div class="brand-title">AI Solution Builder</div>
    </div>
    <div class="content">
      <p style="font-size: 16px; font-weight: 600; color: #F1F5F9; margin-top: 0;">${greetingName}</p>
      <p>Thank you for creating an account with RootForge. To verify your corporate email address and activate your account, please enter the following verification code:</p>
      
      <div class="otp-card">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏱️ This code will expire in <strong>${expiryMinutes} minutes</strong>.</div>
      </div>

      <div class="security-notice">
        🔒 <strong>Security Reminder:</strong> RootForge team members will never ask for your verification code. If you did not request this code, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">© ${new Date().getFullYear()} RootForge Platform. Enterprise AI Solutions.</p>
      <p style="margin: 0;">Automated message — please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Verifies Brevo API connection and account status
   * @returns {Promise<{ ok: boolean, code?: string, message?: string, account?: object, isIpUnauthorized?: boolean }>}
   */
  async verifyConnection() {
    const apiKey = this.getApiKey();
    if (!this.isConfigured()) {
      return {
        ok: false,
        message: 'BREVO_API_KEY is not configured in backend/.env'
      };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: {
          'api-key': apiKey,
          'Accept': 'application/json'
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || `HTTP ${response.status} from Brevo`;
        const isIpUnauthorized = errorMsg.includes('unrecognised IP address') || errorMsg.includes('authorised_ips');
        return {
          ok: false,
          statusCode: response.status,
          code: data.code || 'UNKNOWN_ERROR',
          message: errorMsg,
          isIpUnauthorized
        };
      }

      return {
        ok: true,
        account: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          companyName: data.companyName,
          plan: data.plan
        }
      };
    } catch (err) {
      return {
        ok: false,
        message: err.message
      };
    }
  }

  /**
   * Sends transactional verification email with real OTP through Brevo API
   * 
   * @param {Object} params
   * @param {string} params.toEmail - Recipient corporate email
   * @param {string} params.toName - Recipient user name
   * @param {string} params.otp - Cryptographically generated 6-digit OTP
   * @param {number} [params.expiryMinutes=10] - OTP expiry duration in minutes
   * @returns {Promise<{ success: boolean, messageId?: string, simulated?: boolean }>}
   */
  async sendVerificationEmail({ toEmail, toName = '', otp, expiryMinutes = 10 }) {
    if (!toEmail) {
      throw new Error('Recipient email is required.');
    }
    if (!otp) {
      throw new Error('Verification OTP is required.');
    }

    const sender = this.getSender();
    const apiKey = this.getApiKey();

    if (!this.isConfigured()) {
      console.warn('[Brevo Email Service] BREVO_API_KEY is not configured in backend/.env. Real email delivery skipped in development.');
      // In dev mode when API key is not yet configured, return safe result without crashing
      return {
        success: true,
        simulated: true,
        warning: 'BREVO_API_KEY not configured. Configure in backend/.env for real delivery.'
      };
    }

    const payload = {
      sender: {
        name: sender.name,
        email: sender.email
      },
      to: [
        {
          email: toEmail.trim().toLowerCase(),
          ...(toName ? { name: toName.trim() } : {})
        }
      ],
      subject: 'Verify your RootForge email address',
      htmlContent: this.generateOtpEmailHtml(toName, otp, expiryMinutes),
      textContent: `Hello ${toName || ''},\n\nYour RootForge verification code is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not request this verification code, you can ignore this email.\n\nRegards,\nRootForge Team`
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || `Failed to send email through Brevo (HTTP ${response.status})`;
        const isIpUnauthorized = errorMsg.includes('unrecognised IP address') || errorMsg.includes('authorised_ips');

        console.error(`[Brevo Email Service] HTTP ${response.status} error from Brevo API:`, {
          status: response.status,
          code: data.code || 'UNKNOWN_ERROR',
          message: errorMsg
        });

        if (isIpUnauthorized) {
          console.error(`\n🚨 [BREVO IP AUTHORIZATION REQUIRED]`);
          console.error(`👉 Brevo blocked API access because your machine's current IP is not authorized.`);
          console.error(`👉 Please visit: https://app.brevo.com/security/authorised_ips and add your IP or disable IP filtering.\n`);
        }

        const customError = new Error(errorMsg);
        customError.isIpUnauthorized = isIpUnauthorized;
        customError.statusCode = response.status;
        throw customError;
      }

      console.log(`[Brevo Email Service] Verification email dispatched successfully to ${toEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')} (Message ID: ${data.messageId || 'sent'})`);

      return {
        success: true,
        messageId: data.messageId
      };
    } catch (error) {
      console.error('[Brevo Email Service] Error sending email:', error.message);
      throw error;
    }
  }

  /**
   * Generates a responsive, enterprise-grade HTML email template for RootForge Password Reset
   */
  generatePasswordResetEmailHtml(name, otp, expiryMinutes = 10) {
    const greetingName = name ? `Hello ${name},` : 'Hello,';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your RootForge password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0B0F17;
      margin: 0;
      padding: 24px 12px;
      color: #E2E8F0;
    }
    .email-container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #111827;
      border: 1px solid #1F2937;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #182234 0%, #0B0F17 100%);
      padding: 28px 32px;
      border-bottom: 1px solid #1F2937;
      text-align: center;
    }
    .logo-badge {
      display: inline-block;
      background: linear-gradient(135deg, #D97706, #B45309);
      color: #FFFFFF;
      font-weight: 800;
      font-size: 14px;
      padding: 6px 14px;
      border-radius: 6px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .brand-title {
      color: #F8FAFC;
      font-size: 20px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px 32px 24px 32px;
      color: #CBD5E1;
      font-size: 15px;
      line-height: 1.6;
    }
    .otp-card {
      background: #0B0F17;
      border: 1px solid #374151;
      border-left: 4px solid #D97706;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      color: #94A3B8;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SF Mono', 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      color: #F59E0B;
      letter-spacing: 8px;
      margin: 0;
    }
    .expiry-note {
      color: #94A3B8;
      font-size: 13px;
      margin-top: 10px;
    }
    .security-notice {
      background-color: #1E293B;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 13px;
      color: #94A3B8;
      margin-top: 20px;
    }
    .footer {
      background-color: #0B0F17;
      padding: 20px 32px;
      border-top: 1px solid #1F2937;
      text-align: center;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo-badge">RootForge</div>
      <div class="brand-title">AI Solution Builder</div>
    </div>
    <div class="content">
      <p style="font-size: 16px; font-weight: 600; color: #F1F5F9; margin-top: 0;">${greetingName}</p>
      <p>We received a request to reset the password for your RootForge account. Please enter the following 6-digit verification code to reset your password:</p>
      
      <div class="otp-card">
        <div class="otp-label">Password Reset Code</div>
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏱️ This code will expire in <strong>${expiryMinutes} minutes</strong> and can only be used once.</div>
      </div>

      <div class="security-notice">
        🔒 <strong>Security Alert:</strong> If you did not request a password reset, please ignore this email or contact your administrator immediately. Your password will remain unchanged.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">© ${new Date().getFullYear()} RootForge Platform. Enterprise AI Solutions.</p>
      <p style="margin: 0;">Automated message — please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Sends password reset verification email with real OTP through Brevo API
   * 
   * @param {Object} params
   * @param {string} params.toEmail - Recipient corporate email
   * @param {string} params.toName - Recipient user name
   * @param {string} params.otp - Cryptographically generated 6-digit OTP
   * @param {number} [params.expiryMinutes=10] - OTP expiry duration in minutes
   * @returns {Promise<{ success: boolean, messageId?: string, simulated?: boolean }>}
   */
  async sendPasswordResetEmail({ toEmail, toName = '', otp, expiryMinutes = 10 }) {
    if (!toEmail) {
      throw new Error('Recipient email is required.');
    }
    if (!otp) {
      throw new Error('Verification OTP is required.');
    }

    const sender = this.getSender();
    const apiKey = this.getApiKey();

    if (!this.isConfigured()) {
      console.warn('[Brevo Email Service] BREVO_API_KEY is not configured in backend/.env. Password reset email delivery skipped.');
      return {
        success: true,
        simulated: true,
        warning: 'BREVO_API_KEY not configured. Configure in backend/.env for real delivery.'
      };
    }

    const payload = {
      sender: {
        name: sender.name,
        email: sender.email
      },
      to: [
        {
          email: toEmail.trim().toLowerCase(),
          ...(toName ? { name: toName.trim() } : {})
        }
      ],
      subject: 'Reset your RootForge account password',
      htmlContent: this.generatePasswordResetEmailHtml(toName, otp, expiryMinutes),
      textContent: `Hello ${toName || ''},\n\nYour RootForge password reset code is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you did not request this password reset, you can safely ignore this email.\n\nRegards,\nRootForge Team`
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || `Failed to send password reset email through Brevo (HTTP ${response.status})`;
        const isIpUnauthorized = errorMsg.includes('unrecognised IP address') || errorMsg.includes('authorised_ips');

        console.error(`[Brevo Email Service] HTTP ${response.status} error from Brevo API:`, {
          status: response.status,
          code: data.code || 'UNKNOWN_ERROR',
          message: errorMsg
        });

        const customError = new Error(errorMsg);
        customError.isIpUnauthorized = isIpUnauthorized;
        customError.statusCode = response.status;
        throw customError;
      }

      console.log(`[Brevo Email Service] Password reset email dispatched successfully to ${toEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')} (Message ID: ${data.messageId || 'sent'})`);

      return {
        success: true,
        messageId: data.messageId
      };
    } catch (error) {
      console.error('[Brevo Email Service] Error sending password reset email:', error.message);
      throw error;
    }
  }
}

export const brevoEmailService = new BrevoEmailService();


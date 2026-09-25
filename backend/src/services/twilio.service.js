/**
 * Twilio Service
 * 
 * Handles Twilio client initialization, TwiML generation, webhook signature validation,
 * and call management for Voice AI Discovery Phase 1.
 * 
 * Never hardcodes secrets and strictly adheres to enterprise security standards.
 */

import twilio from 'twilio';

class TwilioService {
  constructor() {
    this._client = null;
  }

  /**
   * Returns Twilio Account SID from environment
   */
  get accountSid() {
    return process.env.TWILIO_ACCOUNT_SID || '';
  }

  /**
   * Returns Twilio Auth Token from environment (Backend Only)
   */
  get authToken() {
    return process.env.TWILIO_AUTH_TOKEN || '';
  }

  /**
   * Returns Twilio inbound phone number from environment
   */
  get phoneNumber() {
    return process.env.TWILIO_PHONE_NUMBER || '';
  }

  /**
   * Returns Webhook base URL (e.g. https://xxxx.ngrok-free.app or production domain)
   */
  get webhookBaseUrl() {
    const raw = process.env.TWILIO_WEBHOOK_BASE_URL || '';
    return raw.replace(/\/+$/, '');
  }

  /**
   * Checks if all required Twilio credentials are configured
   */
  isConfigured() {
    return Boolean(this.accountSid && this.authToken && this.phoneNumber);
  }

  /**
   * Lazily instantiates and returns the official Twilio client
   */
  getClient() {
    if (!this._client && this.accountSid && this.authToken) {
      this._client = twilio(this.accountSid, this.authToken);
    }
    return this._client;
  }

  /**
   * Validates the incoming Twilio webhook cryptographic signature (HMAC-SHA1).
   * 
   * @param {object} params
   * @param {string} params.url - The exact webhook URL requested by Twilio
   * @param {object} params.params - The POST form body/parameters
   * @param {string} params.signature - The 'X-Twilio-Signature' header value
   * @returns {boolean}
   */
  validateWebhookSignature({ url, params = {}, signature }) {
    if (!this.authToken) {
      console.warn('[VOICE] TWILIO_AUTH_TOKEN is not configured. Webhook validation cannot proceed.');
      return false;
    }

    if (!signature) {
      console.warn('[VOICE] Missing X-Twilio-Signature header on incoming webhook.');
      return false;
    }

    try {
      // In development behind reverse proxies (like ngrok), url may need base URL reconciliation
      const targetUrl = url || `${this.webhookBaseUrl}/api/voice/incoming`;
      
      const isValid = twilio.validateRequest(
        this.authToken,
        signature,
        targetUrl,
        params
      );

      if (!isValid) {
        // Also check with raw incoming URL if targetUrl differed
        if (url && url !== targetUrl) {
          const retryValid = twilio.validateRequest(this.authToken, signature, url, params);
          if (retryValid) return true;
        }
        console.warn(`[VOICE] Invalid Twilio signature for URL: ${targetUrl}`);
      }

      return isValid;
    } catch (err) {
      console.error('[VOICE] Error during Twilio signature validation:', err.message);
      return false;
    }
  }

  /**
   * Generates production-ready TwiML response for incoming voice discovery calls.
   * 
   * @param {object} options
   * @param {string} [options.greeting] - Short professional greeting message
   * @param {string} [options.statusCallbackUrl] - Status callback URL for Twilio events
   * @returns {string} XML string
   */
  generateIncomingCallTwiML(options = {}) {
    const response = new twilio.twiml.VoiceResponse();
    
    const greetingText = options.greeting || 
      'Welcome to RootForge AI Solution Builder. Your discovery session has started.';

    // Professional voice output
    response.say(
      {
        voice: 'Polly.Aditi',
        language: 'en-IN'
      },
      greetingText
    );

    // Keep call active for discovery interaction without immediately hanging up
    // In Phase 1, Pause keeps the line active for status tracking
    // Phase 2 will attach bidirectional media streaming / audio capture here
    response.pause({ length: 60 });

    return response.toString();
  }

  /**
   * Terminates an active call safely via Twilio REST API
   * 
   * @param {string} callSid - Twilio Call SID
   * @returns {Promise<object>}
   */
  async endCall(callSid) {
    if (!callSid) {
      throw new Error('CallSid is required to end a call.');
    }

    const client = this.getClient();
    if (!client) {
      throw new Error('Twilio client is not configured.');
    }

    console.log(`[VOICE] Terminating Twilio call: ${callSid}`);
    return await client.calls(callSid).update({ status: 'completed' });
  }

  /**
   * Fetches live call status metadata from Twilio REST API
   * 
   * @param {string} callSid - Twilio Call SID
   * @returns {Promise<object>}
   */
  async fetchCall(callSid) {
    if (!callSid) {
      throw new Error('CallSid is required to fetch call details.');
    }

    const client = this.getClient();
    if (!client) {
      throw new Error('Twilio client is not configured.');
    }

    return await client.calls(callSid).fetch();
  }
}

export const twilioService = new TwilioService();

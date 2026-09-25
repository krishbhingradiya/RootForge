/**
 * Enterprise Twilio Outbound Voice Call Service
 * 
 * Features:
 * 1. Strict server-side credential isolation (never exposed to client).
 * 2. Twilio Trial & Paid account compatibility (zero disallowed parameters).
 * 3. PostgreSQL primary persistence via Prisma VoiceSession model with in-memory fallback.
 * 4. PII-safe masked logging: [TwilioVoiceService], [VoiceSession].
 * 5. Structured error classification for unverified numbers, geo-restrictions, auth failures.
 */

import twilio from 'twilio';
import { prisma } from '../../prisma.js';
import { validatePhoneNumber, maskPhoneNumber } from '../../utils/phoneValidator.js';

// Development & Transient In-Memory Cache
const inMemoryVoiceSessions = new Map();

export class TwilioVoiceService {
  constructor() {
    this._initializeClient();
  }

  _initializeClient() {
    this.accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    this.authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    this.fromNumber = (process.env.TWILIO_PHONE_NUMBER || '').trim();
    
    // Webhook base URL: Prioritize PUBLIC_BASE_URL, then TWILIO_WEBHOOK_BASE_URL, then RENDER_EXTERNAL_URL
    const rawBaseUrl = process.env.PUBLIC_BASE_URL ||
      process.env.TWILIO_WEBHOOK_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'https://rootforge.onrender.com';
    
    this.webhookBaseUrl = rawBaseUrl.replace(/\/+$/, '');

    if (this.accountSid && this.authToken && this.accountSid.startsWith('AC')) {
      try {
        this.client = twilio(this.accountSid, this.authToken);
      } catch (err) {
        console.error('[TwilioVoiceService] Failed to initialize Twilio client:', err.message);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    this._initializeClient();
    return Boolean(this.client && this.accountSid && this.authToken && this.fromNumber);
  }

  getConfigStatus() {
    this._initializeClient();
    return {
      configured: this.isConfigured(),
      hasAccountSid: Boolean(this.accountSid && this.accountSid.startsWith('AC')),
      hasAuthToken: Boolean(this.authToken),
      hasPhoneNumber: Boolean(this.fromNumber),
      phoneNumberMasked: this.fromNumber ? maskPhoneNumber(this.fromNumber) : null,
      webhookBaseUrl: this.webhookBaseUrl
    };
  }

  /**
   * Creates a voice session in PostgreSQL (primary) and caches in memory
   */
  async createSession({ userId = null, workspaceId = null, phoneNumber }) {
    const id = `vses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const sessionData = {
      id,
      userId,
      workspaceId,
      phoneNumber,
      twilioCallSid: null,
      twilioStreamSid: null,
      status: 'created',
      startedAt: null,
      connectedAt: null,
      endedAt: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 1. Primary PostgreSQL persistence via Prisma
    try {
      if (prisma?.voiceSession) {
        // Verify user exists if userId provided to prevent foreign key violations
        let validUserId = null;
        if (userId) {
          try {
            const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
            if (userExists) validUserId = userId;
          } catch {}
        }

        const dbRecord = await prisma.voiceSession.create({
          data: {
            id,
            userId: validUserId,
            workspaceId,
            phoneNumber,
            status: 'created'
          }
        });

        console.log(`[VoiceSession] Created record in PostgreSQL: ${id} for ${maskPhoneNumber(phoneNumber)}`);
        inMemoryVoiceSessions.set(id, dbRecord);
        return dbRecord;
      }
    } catch (err) {
      console.warn(`[VoiceSession] Primary DB insert failed (${err.message}). Using fallback memory session.`);
    }

    // 2. Fallback memory caching
    inMemoryVoiceSessions.set(id, sessionData);
    return sessionData;
  }

  /**
   * Retrieves session by ID or Twilio Call SID from PostgreSQL (primary) or cache
   */
  async getSession(idOrCallSid) {
    if (!idOrCallSid) return null;

    // 1. Primary PostgreSQL query
    try {
      if (prisma?.voiceSession) {
        const dbRecord = await prisma.voiceSession.findFirst({
          where: {
            OR: [
              { id: idOrCallSid },
              { twilioCallSid: idOrCallSid }
            ]
          }
        });
        if (dbRecord) {
          inMemoryVoiceSessions.set(dbRecord.id, dbRecord);
          return dbRecord;
        }
      }
    } catch (err) {
      console.warn(`[VoiceSession] DB lookup error for ${idOrCallSid}:`, err.message);
    }

    // 2. In-Memory lookup fallback
    if (inMemoryVoiceSessions.has(idOrCallSid)) {
      return inMemoryVoiceSessions.get(idOrCallSid);
    }

    for (const session of inMemoryVoiceSessions.values()) {
      if (session.twilioCallSid === idOrCallSid) {
        return session;
      }
    }

    return null;
  }

  /**
   * Updates session in PostgreSQL (primary) and memory cache
   */
  async updateSession(idOrCallSid, updates) {
    const session = await this.getSession(idOrCallSid);
    if (!session) return null;

    const updatedData = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };

    inMemoryVoiceSessions.set(session.id, updatedData);
    if (updatedData.twilioCallSid) {
      inMemoryVoiceSessions.set(updatedData.twilioCallSid, updatedData);
    }

    // 1. Primary PostgreSQL update
    try {
      if (prisma?.voiceSession) {
        const updatePayload = {};
        if (updates.status) updatePayload.status = updates.status;
        if (updates.twilioCallSid) updatePayload.twilioCallSid = updates.twilioCallSid;
        if (updates.twilioStreamSid) updatePayload.twilioStreamSid = updates.twilioStreamSid;
        if (updates.startedAt) updatePayload.startedAt = updates.startedAt;
        if (updates.connectedAt) updatePayload.connectedAt = updates.connectedAt;
        if (updates.endedAt) updatePayload.endedAt = updates.endedAt;
        if (updates.errorMessage !== undefined) updatePayload.errorMessage = updates.errorMessage;

        const dbRecord = await prisma.voiceSession.update({
          where: { id: session.id },
          data: updatePayload
        });

        console.log(`[VoiceSession] Updated in PostgreSQL: ${session.id} -> status: ${updates.status || session.status}`);
        inMemoryVoiceSessions.set(session.id, dbRecord);
        return dbRecord;
      }
    } catch (err) {
      console.warn(`[VoiceSession] DB session update failed for ${session.id}:`, err.message);
    }

    return updatedData;
  }

  /**
   * Initiates an outbound AI phone call to the user's mobile phone via Twilio REST API.
   * STRICTLY compatible with Twilio Trial and Full Production accounts.
   */
  async createOutboundCall({ phoneNumber, userId = null, workspaceId = null }) {
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      const err = new Error(phoneValidation.error);
      err.statusCode = 400;
      err.code = 'INVALID_PHONE_NUMBER';
      throw err;
    }

    const destinationPhone = phoneValidation.normalized;

    // Create session record in DB
    const session = await this.createSession({
      userId,
      workspaceId,
      phoneNumber: destinationPhone
    });

    console.log(`[TwilioVoiceService] Initiating outbound AI call to: ${maskPhoneNumber(destinationPhone)} (Session: ${session.id})`);

    if (!this.isConfigured()) {
      const errorMsg = 'Twilio voice service is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in the backend environment.';
      await this.updateSession(session.id, {
        status: 'failed',
        errorMessage: errorMsg,
        endedAt: new Date()
      });
      const err = new Error(errorMsg);
      err.statusCode = 503;
      err.code = 'TWILIO_NOT_CONFIGURED';
      err.sessionId = session.id;
      throw err;
    }

    const webhookUrl = `${this.webhookBaseUrl}/api/voice/incoming?sessionId=${encodeURIComponent(session.id)}`;
    const statusCallbackUrl = `${this.webhookBaseUrl}/api/voice/status?sessionId=${encodeURIComponent(session.id)}`;

    try {
      await this.updateSession(session.id, {
        status: 'initiating',
        startedAt: new Date()
      });

      /**
       * TWILIO TRIAL-SAFE CALL PARAMETERS:
       * Only pass universally supported parameters:
       * - to: E.164 destination number
       * - from: Twilio registered number
       * - url: Webhook URL returning TwiML
       * - method: POST
       * - statusCallback: Status callback URL
       * - statusCallbackMethod: POST
       * 
       * DO NOT pass `record: false`, `timeout`, or `statusCallbackEvent` array
       * as these trigger trial account parameter restrictions.
       */
      const callParams = {
        to: destinationPhone,
        from: this.fromNumber,
        url: webhookUrl,
        method: 'POST',
        statusCallback: statusCallbackUrl,
        statusCallbackMethod: 'POST'
      };

      console.log(`[TwilioVoiceService] Dispatching Twilio Call. From: ${maskPhoneNumber(this.fromNumber)} To: ${maskPhoneNumber(destinationPhone)} Webhook: ${webhookUrl}`);

      const call = await this.client.calls.create(callParams);

      console.log(`[TwilioVoiceService] Twilio Call created successfully. Call SID: ${call.sid.slice(0, 8)}... (Status: ${call.status})`);

      const updatedSession = await this.updateSession(session.id, {
        twilioCallSid: call.sid,
        status: call.status === 'queued' || call.status === 'initiated' ? 'initiating' : (call.status === 'ringing' ? 'ringing' : 'initiating')
      });

      return {
        success: true,
        sessionId: session.id,
        callSid: call.sid,
        status: updatedSession.status,
        phoneNumberMasked: maskPhoneNumber(destinationPhone),
        message: 'Calling your phone now. Please answer when it rings.'
      };

    } catch (err) {
      console.error('[TwilioVoiceService] Twilio call creation failed:', err.message, 'Code:', err.code, 'Status:', err.status);

      let userFriendlyMessage = 'Unable to start the voice call. Please try again.';
      let statusCode = 500;
      let errorCode = err.code || 'TWILIO_API_ERROR';

      // 1. Twilio Trial unverified destination restriction (Code 21608, 21215)
      if (
        err.code === 21608 ||
        err.code === 21215 ||
        err.message?.toLowerCase().includes('unverified') ||
        err.message?.toLowerCase().includes('trial')
      ) {
        userFriendlyMessage = 'This Twilio Trial account can only call verified phone numbers. Verify this number in Twilio Console or upgrade the Twilio account.';
        statusCode = 400;
        errorCode = 'TRIAL_UNVERIFIED_NUMBER';
      }
      // 2. Invalid phone number format (Code 21211)
      else if (err.code === 21211 || err.message?.toLowerCase().includes('valid phone number')) {
        userFriendlyMessage = 'The provided phone number is not a valid mobile number format.';
        statusCode = 400;
        errorCode = 'INVALID_PHONE_NUMBER';
      }
      // 3. Twilio authentication failure (Code 20003 or HTTP 401)
      else if (err.code === 20003 || err.status === 401) {
        userFriendlyMessage = 'Authentication with Twilio failed. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in the backend environment.';
        statusCode = 502;
        errorCode = 'TWILIO_AUTH_FAILED';
      }
      // 4. Geo Permission restriction (Code 21408)
      else if (err.code === 21408 || err.message?.toLowerCase().includes('geo permission')) {
        userFriendlyMessage = 'Calls to this destination country are restricted by Twilio Geo Permissions. Please enable voice permissions in Twilio Console.';
        statusCode = 403;
        errorCode = 'GEO_PERMISSIONS_RESTRICTED';
      }
      // 5. Insufficient funds / Trial balance exhausted (Code 20001, 20005)
      else if (err.code === 20001 || err.code === 20005 || err.message?.toLowerCase().includes('balance')) {
        userFriendlyMessage = 'Twilio account has insufficient balance or trial credits. Please check your Twilio console.';
        statusCode = 402;
        errorCode = 'TWILIO_INSUFFICIENT_FUNDS';
      }

      await this.updateSession(session.id, {
        status: 'failed',
        errorMessage: userFriendlyMessage,
        endedAt: new Date()
      });

      const errorObj = new Error(userFriendlyMessage);
      errorObj.statusCode = statusCode;
      errorObj.code = errorCode;
      errorObj.sessionId = session.id;
      throw errorObj;
    }
  }

  /**
   * Gracefully terminates an ongoing call
   */
  async cancelCall(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      const err = new Error('Voice session not found.');
      err.statusCode = 404;
      err.code = 'SESSION_NOT_FOUND';
      throw err;
    }

    if (session.twilioCallSid && this.client) {
      try {
        console.log(`[TwilioVoiceService] Terminating active Call SID: ${session.twilioCallSid.slice(0, 8)}...`);
        await this.client.calls(session.twilioCallSid).update({ status: 'completed' });
      } catch (err) {
        console.warn(`[TwilioVoiceService] Could not terminate Call ${session.twilioCallSid}:`, err.message);
      }
    }

    const updated = await this.updateSession(session.id, {
      status: 'completed',
      endedAt: new Date()
    });

    return {
      success: true,
      sessionId: session.id,
      status: 'completed',
      message: 'Call ended successfully.'
    };
  }
}

export const twilioVoiceService = new TwilioVoiceService();

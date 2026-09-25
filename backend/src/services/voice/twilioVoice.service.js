/**
 * Enterprise Twilio Outbound Voice Call Service
 * 
 * Handles:
 * 1. Secure server-side credential isolation (never exposed to client).
 * 2. Outbound REST API call creation from Twilio source to user's mobile destination.
 * 3. Robust session state tracking with Prisma database and memory fallback.
 * 4. Error mapping for Twilio trial accounts, invalid destinations, and network issues.
 * 5. TwiML Media Stream connection for AI Voice WebSocket pipeline.
 */

import twilio from 'twilio';
import { prisma } from '../../prisma.js';
import { validatePhoneNumber, maskPhoneNumber } from '../../utils/phoneValidator.js';

// Resilient In-Memory Session Cache (Guarantees zero downtime even during transient DB glitches)
const inMemoryVoiceSessions = new Map();

export class TwilioVoiceService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.webhookBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://rootforge.onrender.com';

    this.client = null;
    this._initializeClient();
  }

  _initializeClient() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.webhookBaseUrl = (process.env.TWILIO_WEBHOOK_BASE_URL || 'https://rootforge.onrender.com').replace(/\/+$/, '');

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
   * Creates or updates a voice session in DB + in-memory store
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

    inMemoryVoiceSessions.set(id, sessionData);

    try {
      if (prisma?.voiceSession) {
        const dbRecord = await prisma.voiceSession.create({
          data: {
            id,
            userId,
            workspaceId,
            phoneNumber,
            status: 'created'
          }
        });
        inMemoryVoiceSessions.set(id, { ...sessionData, ...dbRecord });
        return dbRecord;
      }
    } catch (err) {
      console.warn('[TwilioVoiceService] Database write fallback to in-memory session:', err.message);
    }

    return sessionData;
  }

  /**
   * Retrieves session by ID or Twilio Call SID
   */
  async getSession(idOrCallSid) {
    if (!idOrCallSid) return null;

    // Check in-memory first for ultra-fast lookup
    if (inMemoryVoiceSessions.has(idOrCallSid)) {
      return inMemoryVoiceSessions.get(idOrCallSid);
    }

    for (const session of inMemoryVoiceSessions.values()) {
      if (session.twilioCallSid === idOrCallSid) {
        return session;
      }
    }

    // Check Prisma DB
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
      console.warn('[TwilioVoiceService] DB lookup failed:', err.message);
    }

    return null;
  }

  /**
   * Updates session status and timestamps
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

    try {
      if (prisma?.voiceSession) {
        await prisma.voiceSession.update({
          where: { id: session.id },
          data: {
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.twilioCallSid ? { twilioCallSid: updates.twilioCallSid } : {}),
            ...(updates.twilioStreamSid ? { twilioStreamSid: updates.twilioStreamSid } : {}),
            ...(updates.startedAt ? { startedAt: updates.startedAt } : {}),
            ...(updates.connectedAt ? { connectedAt: updates.connectedAt } : {}),
            ...(updates.endedAt ? { endedAt: updates.endedAt } : {}),
            ...(updates.errorMessage !== undefined ? { errorMessage: updates.errorMessage } : {})
          }
        });
      }
    } catch (err) {
      console.warn('[TwilioVoiceService] DB session update failed:', err.message);
    }

    return updatedData;
  }

  /**
   * Initiates an outbound AI phone call to the user's mobile phone via Twilio REST API
   */
  async createOutboundCall({ phoneNumber, userId = null, workspaceId = null }) {
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      const err = new Error(phoneValidation.error);
      err.statusCode = 400;
      throw err;
    }

    const destinationPhone = phoneValidation.normalized;

    // Create session record
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
      throw err;
    }

    const webhookUrl = `${this.webhookBaseUrl}/api/voice/incoming?sessionId=${encodeURIComponent(session.id)}`;
    const statusCallbackUrl = `${this.webhookBaseUrl}/api/voice/status?sessionId=${encodeURIComponent(session.id)}`;

    try {
      await this.updateSession(session.id, {
        status: 'initiating',
        startedAt: new Date()
      });

      // Call Twilio REST API
      const call = await this.client.calls.create({
        to: destinationPhone,
        from: this.fromNumber,
        url: webhookUrl,
        method: 'POST',
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        timeout: 60, // 60s ring timeout
        record: false // Zero sensitive audio recording on third-party servers
      });

      console.log(`[TwilioVoiceService] Twilio Call created successfully. Call SID: ${call.sid.slice(0, 8)}... (Status: ${call.status})`);

      const updatedSession = await this.updateSession(session.id, {
        twilioCallSid: call.sid,
        status: call.status === 'queued' || call.status === 'initiated' ? 'initiating' : (call.status === 'ringing' ? 'ringing' : 'initiating')
      });

      return {
        success: true,
        sessionId: session.id,
        status: updatedSession.status,
        phoneNumberMasked: maskPhoneNumber(destinationPhone),
        message: 'Your phone should ring shortly.'
      };

    } catch (err) {
      console.error('[TwilioVoiceService] Twilio call creation failed:', err.message, err.code);

      let userFriendlyMessage = 'Unable to start the voice call. Please try again.';
      let statusCode = 500;

      // Handle Twilio Trial Account destination verification requirement (Code 21608 / 21215)
      if (err.code === 21608 || err.code === 21215 || err.message?.includes('unverified')) {
        userFriendlyMessage = 'This phone number cannot be called because the Twilio trial account requires destination numbers to be verified. Please verify this number in Twilio Console or upgrade the Twilio account.';
        statusCode = 400;
      } else if (err.code === 21211 || err.message?.includes('valid phone number')) {
        userFriendlyMessage = 'The provided phone number is not a valid mobile number.';
        statusCode = 400;
      } else if (err.code === 20003 || err.status === 401) {
        userFriendlyMessage = 'Authentication with Twilio failed. Please verify Twilio Account SID and Auth Token.';
        statusCode = 502;
      } else if (err.code === 21408 || err.message?.includes('Permission to send an SMS has not been enabled') || err.message?.includes('Geo Permission')) {
        userFriendlyMessage = 'Calls to this destination country are restricted by Twilio Geo Permissions. Please enable voice permissions in Twilio Console.';
        statusCode = 403;
      }

      await this.updateSession(session.id, {
        status: 'failed',
        errorMessage: userFriendlyMessage,
        endedAt: new Date()
      });

      const errorObj = new Error(userFriendlyMessage);
      errorObj.statusCode = statusCode;
      errorObj.code = err.code || 'TWILIO_API_ERROR';
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
      throw err;
    }

    if (session.twilioCallSid && this.client) {
      try {
        await this.client.calls(session.twilioCallSid).update({ status: 'completed' });
      } catch (err) {
        console.warn(`[TwilioVoiceService] Could not cancel Call ${session.twilioCallSid}:`, err.message);
      }
    }

    const updated = await this.updateSession(session.id, {
      status: 'completed',
      endedAt: new Date()
    });

    return {
      success: true,
      sessionId: session.id,
      status: 'completed'
    };
  }
}

export const twilioVoiceService = new TwilioVoiceService();

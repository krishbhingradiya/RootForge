/**
 * Enterprise Voice Webhook & TwiML Generator
 * 
 * Handles:
 * 1. Twilio Voice Answer Webhook (POST /api/voice/incoming and POST /api/voice/answer).
 * 2. Instant generation of valid TwiML with zero blocking third-party API calls.
 * 3. Processing Twilio Call Status Callbacks.
 * 4. Linking session state asynchronously in PostgreSQL.
 */

import twilio from 'twilio';
import { twilioVoiceService } from './twilioVoice.service.js';

export class VoiceWebhookService {
  constructor() {
    this.name = 'voice-webhook-service';
  }

  /**
   * Generates clean, valid TwiML XML immediately when the user answers
   */
  async generateIncomingTwiML({ callSid = null, sessionId = null, toPhone = null }) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Natural greeting via Indian English Polly voice
    const greetingText = 'Hello! Welcome to RootForge AI Business Consultant. I am ready to understand your business idea.';

    response.say(
      {
        voice: 'Polly.Aditi',
        language: 'en-IN'
      },
      greetingText
    );

    // Update session state asynchronously without blocking TwiML delivery
    (async () => {
      try {
        let session = null;
        if (sessionId) {
          session = await twilioVoiceService.getSession(sessionId);
        }
        if (!session && callSid) {
          session = await twilioVoiceService.getSession(callSid);
        }
        if (!session && toPhone) {
          session = await twilioVoiceService.getSession(toPhone);
        }

        if (session) {
          await twilioVoiceService.updateSession(session.id, {
            twilioCallSid: callSid || session.twilioCallSid,
            status: 'connected',
            connectedAt: new Date()
          });
        }
      } catch (err) {
        console.warn('[VoiceWebhook] Non-blocking session update notice:', err.message);
      }
    })();

    return response.toString();
  }

  /**
   * Handles Twilio Status Callback events (ringing, in-progress, completed, failed, busy, no-answer)
   */
  async handleStatusCallback({ callSid, callStatus, duration = 0, error = null, sessionId = null }) {
    console.log(`[VoiceWebhook] Twilio status callback: Call ${callSid?.slice(0, 8) || 'N/A'}... -> status: ${callStatus} (Duration: ${duration}s)`);

    try {
      let session = null;
      if (sessionId) {
        session = await twilioVoiceService.getSession(sessionId);
      }
      if (!session && callSid) {
        session = await twilioVoiceService.getSession(callSid);
      }

      if (!session) {
        return;
      }

      let mappedStatus = session.status;
      let updates = {};

      switch (callStatus?.toLowerCase()) {
        case 'initiated':
        case 'queued':
          mappedStatus = 'initiating';
          break;
        case 'ringing':
          mappedStatus = 'ringing';
          break;
        case 'in-progress':
        case 'answered':
          mappedStatus = 'active';
          if (!session.connectedAt) {
            updates.connectedAt = new Date();
          }
          break;
        case 'completed':
          mappedStatus = 'completed';
          updates.endedAt = new Date();
          break;
        case 'busy':
          mappedStatus = 'failed';
          updates.errorMessage = 'The destination number was busy.';
          updates.endedAt = new Date();
          break;
        case 'no-answer':
          mappedStatus = 'failed';
          updates.errorMessage = 'No answer from the destination phone number.';
          updates.endedAt = new Date();
          break;
        case 'failed':
          mappedStatus = 'failed';
          updates.errorMessage = error || 'The call could not be completed.';
          updates.endedAt = new Date();
          break;
        case 'canceled':
          mappedStatus = 'cancelled';
          updates.endedAt = new Date();
          break;
        default:
          break;
      }

      updates.status = mappedStatus;
      await twilioVoiceService.updateSession(session.id, updates);
    } catch (err) {
      console.warn('[VoiceWebhook] Status callback update error:', err.message);
    }
  }
}

export const voiceWebhookService = new VoiceWebhookService();

/**
 * Enterprise Voice Webhook & TwiML Generator
 * 
 * Handles:
 * 1. Twilio Voice Webhooks (POST /api/voice/incoming and POST /api/voice/answer).
 * 2. Generating valid, robust TwiML with neural greeting and Media Stream connection.
 * 3. Processing Twilio Call Status Callbacks (ringing, in-progress, completed, failed, busy).
 * 4. Associating CallSid and Stream metadata with the user's PostgreSQL voice session.
 */

import twilio from 'twilio';
import { twilioVoiceService } from './twilioVoice.service.js';

export class VoiceWebhookService {
  constructor() {
    this.name = 'voice-webhook-service';
  }

  /**
   * Generates valid TwiML for Twilio when user answers the outbound phone call
   */
  async generateIncomingTwiML({ callSid, sessionId = null, host = null, protocol = 'https' }) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Match session by sessionId or CallSid
    let session = null;
    if (sessionId) {
      session = await twilioVoiceService.getSession(sessionId);
    }
    if (!session && callSid) {
      session = await twilioVoiceService.getSession(callSid);
    }

    if (session) {
      await twilioVoiceService.updateSession(session.id, {
        twilioCallSid: callSid || session.twilioCallSid,
        status: 'connected',
        connectedAt: new Date()
      });
      console.log(`[VoiceWebhook] User answered call! Session: ${session.id}, CallSid: ${callSid?.slice(0, 8) || 'N/A'}... -> status: 'connected'`);
    } else {
      console.log(`[VoiceWebhook] Webhook invoked for CallSid: ${callSid?.slice(0, 8) || 'N/A'}... (No session matched)`);
    }

    // Determine WebSocket host URL
    const envBaseUrl = process.env.PUBLIC_BASE_URL || process.env.TWILIO_WEBHOOK_BASE_URL || process.env.RENDER_EXTERNAL_URL || '';
    let wsHost = host || 'rootforge.onrender.com';

    if (envBaseUrl) {
      try {
        const parsed = new URL(envBaseUrl);
        wsHost = parsed.host;
      } catch {}
    }

    // Use wss for production/Render and ws for local development
    const isLocal = wsHost.includes('localhost') || wsHost.includes('127.0.0.1');
    const wsProtocol = isLocal ? 'ws' : 'wss';
    const streamUrl = `${wsProtocol}://${wsHost}/api/voice/stream`;

    console.log(`[VoiceWebhook] Connecting call to real-time WebSocket Media Stream: ${streamUrl}`);

    // Initial greeting in natural Indian English (Polly.Aditi)
    const greetingText = 'Hello, welcome to RootForge AI Business Consultant. Please tell me about the business idea or problem you want to solve.';

    response.say(
      {
        voice: 'Polly.Aditi',
        language: 'en-IN'
      },
      greetingText
    );

    // Connect call to real-time WebSocket Media Stream
    const connect = response.connect();
    const stream = connect.stream({
      url: streamUrl,
      name: 'rootforge-ai-voice-stream'
    });

    // Pass session metadata to WebSocket stream start event
    if (session) {
      stream.parameter({
        name: 'sessionId',
        value: session.id
      });
    }

    return response.toString();
  }

  /**
   * Handles Twilio Status Callback events (ringing, in-progress, completed, failed, busy, no-answer)
   */
  async handleStatusCallback({ callSid, callStatus, duration = 0, error = null, sessionId = null }) {
    console.log(`[VoiceWebhook] Twilio status callback: Call ${callSid?.slice(0, 8)}... -> status: ${callStatus} (Duration: ${duration}s)`);

    let session = null;
    if (sessionId) {
      session = await twilioVoiceService.getSession(sessionId);
    }
    if (!session && callSid) {
      session = await twilioVoiceService.getSession(callSid);
    }

    if (!session) {
      console.warn(`[VoiceWebhook] No active voice session found for status callback CallSid: ${callSid}`);
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
    console.log(`[VoiceSession] Updated status callback in PostgreSQL: ${session.id} -> ${mappedStatus}`);
  }
}

export const voiceWebhookService = new VoiceWebhookService();

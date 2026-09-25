/**
 * Enterprise Outbound AI Voice API Routes
 * 
 * Endpoints:
 * - POST /api/voice/call             -> Initiates outbound AI phone call to user's mobile
 * - POST /api/voice/incoming         -> Twilio Voice Webhook returning TwiML & stream connection
 * - POST /api/voice/status           -> Twilio Call Status Callback Webhook
 * - GET  /api/voice/session/:id      -> Live voice session polling / status check
 * - POST /api/voice/session/:id/cancel -> Gracefully terminates ongoing voice call
 * - GET  /api/voice/config           -> Non-sensitive configuration telemetry
 */

import express from 'express';
import { twilioVoiceService } from '../services/voice/twilioVoice.service.js';
import { voiceWebhookService } from '../services/voice/voiceWebhook.service.js';
import { maskPhoneNumber } from '../utils/phoneValidator.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-enterprise-jwt-key-2026-solution-builder';

// Optional/Soft Authentication Middleware (attaches user if token present)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {}
  }
  next();
};

// In-Memory Rate Limiter to prevent duplicate clicks and call spamming
const callRateLimitMap = new Map(); // key -> [timestamp1, timestamp2]
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CALLS_PER_WINDOW = 5;

const rateLimitVoiceCalls = (req, res, next) => {
  const identifier = req.user?.id || req.ip || 'anonymous';
  const now = Date.now();

  const timestamps = callRateLimitMap.get(identifier) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_CALLS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: 'Too many call requests. Please wait a few minutes before requesting another AI voice call.'
    });
  }

  validTimestamps.push(now);
  callRateLimitMap.set(identifier, validTimestamps);
  next();
};

/**
 * POST /api/voice/call
 * Initiates an outbound AI call to the user's mobile number
 */
router.post('/call', optionalAuth, rateLimitVoiceCalls, async (req, res) => {
  try {
    const { phoneNumber, workspaceId = null } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Mobile phone number is required.'
      });
    }

    const userId = req.user?.id || null;

    const result = await twilioVoiceService.createOutboundCall({
      phoneNumber,
      userId,
      workspaceId
    });

    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Unable to start the voice call. Please try again.',
      code: err.code || 'CALL_INITIATION_FAILED'
    });
  }
});

/**
 * POST /api/voice/incoming
 * Twilio Voice Webhook: Executed when user answers their phone
 * Returns TwiML connecting the call to WebSocket stream
 */
router.post('/incoming', async (req, res) => {
  try {
    const callSid = req.body.CallSid || req.query.CallSid;
    const sessionId = req.query.sessionId || req.body.sessionId;
    const host = req.headers.host;

    const twiml = await voiceWebhookService.generateIncomingTwiML({
      callSid,
      sessionId,
      host,
      protocol: req.protocol
    });

    res.type('text/xml');
    res.send(twiml);
  } catch (err) {
    console.error('[VoiceRoute] Error generating incoming TwiML:', err.message);
    res.type('text/xml');
    res.send(`
      <Response>
        <Say voice="Polly.Aditi" language="en-IN">We are connecting you to RootForge AI Business Consultant.</Say>
        <Connect>
          <Stream url="wss://${req.headers.host || 'rootforge.onrender.com'}/api/voice/stream" />
        </Connect>
      </Response>
    `);
  }
});

/**
 * POST /api/voice/status
 * Twilio Call Status Callback Webhook
 */
router.post('/status', async (req, res) => {
  try {
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;
    const duration = req.body.CallDuration || 0;
    const error = req.body.ErrorMessage || null;
    const sessionId = req.query.sessionId || req.body.sessionId;

    await voiceWebhookService.handleStatusCallback({
      callSid,
      callStatus,
      duration,
      error,
      sessionId
    });

    res.type('text/xml');
    res.send('<Response />');
  } catch (err) {
    console.warn('[VoiceRoute] Error in status callback:', err.message);
    res.type('text/xml');
    res.send('<Response />');
  }
});

/**
 * GET /api/voice/session/:id
 * Fetches status of an active or recent voice session
 */
router.get('/session/:id', optionalAuth, async (req, res) => {
  try {
    const session = await twilioVoiceService.getSession(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Voice session not found.'
      });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        phoneNumberMasked: maskPhoneNumber(session.phoneNumber),
        startedAt: session.startedAt,
        connectedAt: session.connectedAt,
        endedAt: session.endedAt,
        errorMessage: session.errorMessage,
        createdAt: session.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voice session status.'
    });
  }
});

/**
 * POST /api/voice/session/:id/cancel
 * Cancels / hangs up an active voice call
 */
router.post('/session/:id/cancel', optionalAuth, async (req, res) => {
  try {
    const result = await twilioVoiceService.cancelCall(req.params.id);
    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Failed to cancel voice call.'
    });
  }
});

/**
 * GET /api/voice/config
 * Non-sensitive configuration check for frontend UI
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    ...twilioVoiceService.getConfigStatus()
  });
});

export default router;

/**
 * Enterprise Outbound AI Voice API Routes
 * 
 * Endpoints:
 * - POST /api/voice/call          -> Initiates outbound AI phone call to user's mobile
 * - POST /api/voice/incoming      -> Twilio Voice Answer Webhook returning instant TwiML
 * - GET  /api/voice/incoming      -> Browser/GET preview for incoming webhook
 * - POST /api/voice/answer        -> Alias for incoming webhook
 * - GET  /api/voice/answer        -> Alias for incoming webhook
 * - GET  /api/voice/health        -> Health status endpoint { success: true, service: "twilio-voice", status: "ready" }
 * - GET  /api/voice/test-twiml    -> Raw TwiML validation endpoint
 * - POST /api/voice/status        -> Twilio Call Status Callback Webhook
 * - GET  /api/voice/session/:id   -> Live voice session polling / status check
 * - POST /api/voice/session/:id/cancel -> Gracefully terminates ongoing voice call
 * - GET  /api/voice/config        -> Non-sensitive configuration telemetry
 */

import express from 'express';
import twilio from 'twilio';
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

/**
 * Safe Twilio Signature Telemetry Middleware
 * Verifies and logs Twilio authenticity without dropping legitimate calls due to proxy/header mismatches.
 */
const validateTwilioSignatureSafe = (req, res, next) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'];

  if (!signature) {
    // Allows testing via curl/browser while logging info
    return next();
  }

  if (!authToken) {
    console.warn('[TwilioVoiceWebhook] TWILIO_AUTH_TOKEN not configured for signature check.');
    return next();
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const originalUrl = req.originalUrl || req.url;
    const fullUrl = `${protocol}://${host}${originalUrl}`;

    const isValid = twilio.validateRequest(
      authToken,
      signature,
      fullUrl,
      req.body || {}
    );

    console.log(`[TwilioVoiceWebhook] Signature check: ${isValid ? 'VALID' : 'MISMATCH'} (Path: ${req.path})`);
  } catch (err) {
    console.warn('[TwilioVoiceWebhook] Signature evaluation warning:', err.message);
  }

  next();
};

// In-Memory Rate Limiter to prevent duplicate clicks and call spamming
const callRateLimitMap = new Map();
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
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many call requests. Please wait a few minutes before requesting another AI voice call.'
    });
  }

  validTimestamps.push(now);
  callRateLimitMap.set(identifier, validTimestamps);
  next();
};

/**
 * GET /api/voice/health
 * Required health check response
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'twilio-voice',
    status: 'ready'
  });
});

/**
 * GET /api/voice/test-twiml
 * Simple TwiML test endpoint returning pure XML
 */
router.get('/test-twiml', (req, res) => {
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Twilio voice connection is working.</Say>
</Response>`);
});

/**
 * POST /api/voice/call
 * Initiates an outbound AI call to the user's mobile number
 */
router.post('/call', optionalAuth, rateLimitVoiceCalls, async (req, res) => {
  try {
    const { phoneNumber, countryCode = '+91', workspaceId = null } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_PHONE_NUMBER',
        message: 'Mobile phone number is required.'
      });
    }

    const userId = req.user?.id || null;

    const result = await twilioVoiceService.createOutboundCall({
      phoneNumber,
      countryCode,
      userId,
      workspaceId
    });

    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      errorCode: err.code || 'CALL_INITIATION_FAILED',
      message: err.message || 'Unable to start the voice call. Please try again.',
      sessionId: err.sessionId || null
    });
  }
});

/**
 * POST /api/voice/incoming & POST /api/voice/answer
 * Twilio Voice Answer Webhook: Executed immediately when user answers the phone
 * Returns immediate, valid TwiML with zero blocking external dependencies.
 */
const handleIncomingTwiML = async (req, res) => {
  const callSid = req.body.CallSid || req.query.CallSid || 'UNKNOWN_CALL_SID';
  const sessionId = req.query.sessionId || req.body.sessionId || null;
  const toPhone = req.body.To || null;

  console.log('[TwilioVoiceWebhook] Request received');
  console.log(`[TwilioVoiceWebhook] CallSid: ${callSid}`);
  console.log('[TwilioVoiceWebhook] Returning TwiML');

  try {
    const twiml = await voiceWebhookService.generateIncomingTwiML({
      callSid,
      sessionId,
      toPhone
    });

    res.type('text/xml');
    res.send(twiml);
    console.log('[TwilioVoiceWebhook] TwiML response sent');
  } catch (err) {
    console.error(`[TwilioVoiceWebhook] ERROR: ${err.message}`);
    // Guaranteed fallback TwiML so Twilio never receives an error
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Hello! Welcome to RootForge AI Business Consultant. I am ready to understand your business idea.</Say>
</Response>`);
    console.log('[TwilioVoiceWebhook] TwiML response sent');
  }
};

router.post('/incoming', validateTwilioSignatureSafe, handleIncomingTwiML);
router.get('/incoming', handleIncomingTwiML);
router.post('/answer', validateTwilioSignatureSafe, handleIncomingTwiML);
router.get('/answer', handleIncomingTwiML);

/**
 * POST /api/voice/status
 * Twilio Call Status Callback Webhook
 */
router.post('/status', validateTwilioSignatureSafe, async (req, res) => {
  try {
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;
    const duration = parseInt(req.body.CallDuration || '0', 10);
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
        errorCode: 'SESSION_NOT_FOUND',
        message: 'Voice session not found.'
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
      errorCode: 'SESSION_FETCH_ERROR',
      message: 'Failed to retrieve voice session status.'
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
      errorCode: err.code || 'CANCEL_FAILED',
      message: err.message || 'Failed to cancel voice call.'
    });
  }
});

/**
 * GET /api/voice/config
 * Non-sensitive configuration telemetry for frontend UI
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    ...twilioVoiceService.getConfigStatus()
  });
});

export default router;

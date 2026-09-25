/**
 * Enterprise Outbound AI Voice API Routes
 * 
 * Endpoints:
 * - POST /api/voice/call               -> Initiates outbound AI phone call to user's mobile
 * - POST /api/voice/incoming           -> Twilio Voice Webhook returning TwiML & stream connection
 * - POST /api/voice/answer             -> Alias for /incoming Webhook
 * - POST /api/voice/status             -> Twilio Call Status Callback Webhook
 * - GET  /api/voice/session/:id        -> Live voice session polling / status check
 * - POST /api/voice/session/:id/cancel -> Gracefully terminates ongoing voice call
 * - GET  /api/voice/health             -> Health & diagnostic status for Voice AI subsystem
 * - GET  /api/voice/config             -> Non-sensitive configuration telemetry
 * - POST /api/voice/test-call          -> Safe dev-only test endpoint (NODE_ENV !== "production")
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
 * Twilio Webhook Signature Verification Middleware
 * Validates X-Twilio-Signature using official Twilio SDK in production.
 * Allows safe local/testing bypass in development when signature header is absent.
 */
const validateTwilioSignature = (req, res, next) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'];
  const isProduction = process.env.NODE_ENV === 'production';
  const bypassDev = process.env.BYPASS_TWILIO_SIGNATURE_DEV === 'true' || !isProduction;

  // In development, allow requests without signature for local curl/testing
  if (bypassDev && !signature) {
    return next();
  }

  if (!authToken) {
    console.warn('[TwilioWebhook] TWILIO_AUTH_TOKEN not configured for signature verification.');
    return next();
  }

  if (!signature) {
    console.warn('[TwilioWebhook] Missing X-Twilio-Signature header on webhook request.');
    if (isProduction) {
      return res.status(403).send('Forbidden: Missing Twilio Signature');
    }
    return next();
  }

  // Construct full request URL as seen by Twilio
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

  if (!isValid) {
    console.warn(`[TwilioWebhook] Invalid X-Twilio-Signature for URL: ${fullUrl}`);
    if (isProduction) {
      return res.status(403).send('Forbidden: Invalid Twilio Signature');
    }
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
 * Twilio Voice Webhook: Executed when user answers their phone
 * Returns TwiML connecting the call to WebSocket stream
 */
const handleIncomingWebhook = async (req, res) => {
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
};

router.post('/incoming', validateTwilioSignature, handleIncomingWebhook);
router.post('/answer', validateTwilioSignature, handleIncomingWebhook);
router.get('/incoming', handleIncomingWebhook);
router.get('/answer', handleIncomingWebhook);

/**
 * POST /api/voice/status
 * Twilio Call Status Callback Webhook
 */
router.post('/status', validateTwilioSignature, async (req, res) => {
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
 * POST /api/voice/test-call (Safe Development Test Endpoint)
 * Allowed only in non-production environments
 */
router.post('/test-call', optionalAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production' && req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: 'DEV_ONLY_ENDPOINT',
      message: 'This test endpoint is only accessible in development or by administrators.'
    });
  }

  try {
    const { phoneNumber } = req.body;
    const testNumber = phoneNumber || process.env.TWILIO_TEST_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER;

    if (!testNumber) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_PHONE_NUMBER',
        message: 'Please provide a test phoneNumber in the request body.'
      });
    }

    const result = await twilioVoiceService.createOutboundCall({
      phoneNumber: testNumber,
      userId: req.user?.id || null
    });

    res.json({
      success: true,
      isTestCall: true,
      ...result
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      errorCode: err.code || 'TEST_CALL_FAILED',
      message: err.message || 'Test call failed.'
    });
  }
});

/**
 * GET /api/voice/health
 * Diagnostic health status for Voice AI subsystem
 */
router.get(['/health', '/'], (req, res) => {
  const config = twilioVoiceService.getConfigStatus();
  res.json({
    status: 'ok',
    service: 'RootForge Outbound AI Voice Service',
    timestamp: new Date().toISOString(),
    voiceAgentEnabled: process.env.VOICE_AGENT_ENABLED !== 'false',
    twilio: config
  });
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

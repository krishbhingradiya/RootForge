/**
 * Twilio Voice AI Discovery Routes — Phase 1
 * 
 * Endpoints:
 * - POST /api/voice/incoming           — Webhook for incoming Twilio voice calls
 * - POST /api/voice/status             — Webhook for Twilio call lifecycle status events
 * - GET  /api/voice/sessions/:id       — Retrieve status of a voice discovery session
 * - GET  /api/voice/workspaces/:id/sessions — List voice discovery sessions for a workspace
 * - POST /api/voice/sessions/:id/end   — Safely terminate an active voice call
 * - GET  /api/voice/config             — Get safe public voice configuration (phone number, status)
 */

import { Router } from 'express';
import { twilioService } from '../services/twilio.service.js';
import { voiceDiscoveryService } from '../services/voiceDiscovery.service.js';
import { authenticate } from '../middleware/auth.js';
import { handleRouteError } from '../services/authorization.service.js';

const router = Router();

/**
 * Middleware to validate Twilio Webhook Signatures.
 * Returns HTTP 403 if signature is missing or invalid.
 */
function validateTwilioWebhook(req, res, next) {
  // If in test environment with test header bypass, allow testing
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-bypass-auth'] === 'true') {
    return next();
  }

  if (!twilioService.authToken) {
    console.warn('[VOICE] Rejected webhook: Twilio is not configured on this server (TWILIO_AUTH_TOKEN missing).');
    return res.status(503).type('text/plain').send('Service Unavailable: Twilio is not configured');
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    console.warn('[VOICE] Rejected webhook: Missing X-Twilio-Signature header.');
    return res.status(403).type('text/plain').send('Forbidden: Missing Twilio Signature');
  }

  // Construct absolute URL
  const baseUrl = twilioService.webhookBaseUrl;
  const originalPath = req.originalUrl || req.url;
  const candidateUrl = baseUrl ? `${baseUrl}${originalPath}` : `${req.protocol}://${req.get('host')}${originalPath}`;

  const isValid = twilioService.validateWebhookSignature({
    url: candidateUrl,
    params: req.body,
    signature
  });

  if (!isValid) {
    console.warn(`[VOICE] Rejected webhook: Invalid Twilio signature for URL ${candidateUrl}`);
    return res.status(403).type('text/plain').send('Forbidden: Invalid Twilio Signature');
  }

  next();
}

/**
 * POST /api/voice/incoming
 * Handles incoming voice call from Twilio.
 * 
 * 1. Validates Twilio signature (HTTP 403 if invalid)
 * 2. Creates/resolves unique Discovery Session & stores Twilio Call SID (idempotent)
 * 3. Returns valid TwiML greeting and keeps call active
 */
router.post('/incoming', validateTwilioWebhook, async (req, res) => {
  try {
    const {
      CallSid: callSid,
      From: from,
      To: to,
      CallStatus: callStatus
    } = req.body;

    const workspaceId = req.query.workspaceId || req.body.workspaceId || null;

    if (!callSid) {
      return res.status(400).type('text/plain').send('Missing CallSid');
    }

    // Create or retrieve persistent Discovery Session
    const session = await voiceDiscoveryService.createOrGetIncomingSession({
      callSid,
      from,
      to,
      callStatus,
      workspaceId
    });

    // Generate RootForge Greeting TwiML
    const twimlXml = twilioService.generateIncomingCallTwiML({
      greeting: 'Welcome to RootForge AI Solution Builder. Your discovery session has started.'
    });

    res.type('text/xml').send(twimlXml);
  } catch (err) {
    console.error('[VOICE] Error in incoming voice webhook:', err);
    // Return safe fallback TwiML to not abruptly drop caller without explanation
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Welcome to RootForge. We are experiencing a temporary error. Please try again shortly.</Say>
  <Hangup/>
</Response>`;
    res.status(500).type('text/xml').send(fallbackTwiml);
  }
});

/**
 * POST /api/voice/status
 * Handles Twilio call lifecycle status events (ringing, in-progress, completed, failed, busy, no-answer).
 */
router.post('/status', validateTwilioWebhook, async (req, res) => {
  try {
    const {
      CallSid: callSid,
      CallStatus: callStatus,
      CallDuration: callDuration,
      From: from,
      To: to
    } = req.body;

    if (!callSid) {
      return res.status(400).type('text/plain').send('Missing CallSid');
    }

    await voiceDiscoveryService.handleCallStatusWebhook({
      callSid,
      callStatus,
      callDuration,
      from,
      to,
      rawBody: req.body
    });

    res.status(200).type('text/xml').send('<Response/>');
  } catch (err) {
    console.error('[VOICE] Error handling call status webhook:', err);
    res.status(500).type('text/plain').send('Status callback error');
  }
});

/**
 * GET /api/voice/config
 * Returns safe public configuration for frontend UI (e.g. phone number, whether configured).
 */
router.get('/config', authenticate, (req, res) => {
  const isConfigured = twilioService.isConfigured();
  res.json({
    isConfigured,
    configured: isConfigured,
    phoneNumber: isConfigured ? (twilioService.phoneNumber || null) : null,
    provider: 'TWILIO',
    channel: 'VOICE'
  });
});

/**
 * GET /api/voice/sessions/:id
 * Retrieves status of a single voice discovery session.
 */
router.get('/sessions/:id', authenticate, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = await voiceDiscoveryService.getSession(sessionId, req.user);
    res.json(session);
  } catch (err) {
    handleRouteError(res, err, 'Failed to retrieve voice discovery session.');
  }
});

/**
 * GET /api/voice/workspaces/:workspaceId/sessions
 * Lists voice discovery sessions associated with a workspace.
 */
router.get('/workspaces/:workspaceId/sessions', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    const sessions = await voiceDiscoveryService.listWorkspaceSessions(workspaceId, req.user);
    res.json(sessions);
  } catch (err) {
    handleRouteError(res, err, 'Failed to list workspace voice sessions.');
  }
});

/**
 * POST /api/voice/sessions/:id/end
 * Safely terminates an active voice discovery call.
 */
router.post('/sessions/:id/end', authenticate, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = await voiceDiscoveryService.endSessionCall(sessionId, req.user);
    res.json({
      message: 'Voice discovery call terminated successfully.',
      session
    });
  } catch (err) {
    handleRouteError(res, err, 'Failed to end voice discovery call.');
  }
});

export default router;

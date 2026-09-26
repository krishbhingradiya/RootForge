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
import { aiVoiceConsultantService } from '../services/voice/aiVoiceConsultant.service.js';
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
 * POST /api/voice/process-speech & GET /api/voice/process-speech
 * Twilio Gather Webhook: Invoked when user speaks into the call
 */
const handleProcessSpeech = async (req, res) => {
  const speechResult = req.body.SpeechResult || req.query.SpeechResult || req.body.speechResult || '';
  const confidence = parseFloat(req.body.Confidence || req.query.Confidence || '1');
  const callSid = req.body.CallSid || req.query.CallSid || null;
  const from = req.body.From || req.query.From || null;
  const to = req.body.To || req.query.To || null;
  const sessionId = req.query.sessionId || req.body.sessionId || null;

  try {
    const twiml = await voiceWebhookService.processSpeech({
      callSid,
      speechResult,
      confidence,
      from,
      to,
      sessionId
    });

    res.type('text/xml');
    res.send(twiml);
  } catch (err) {
    console.error(`[TwilioVoiceWebhook] ERROR processing speech: ${err.message}`);
    const fallbackTwiML = voiceWebhookService.buildListeningTwiML('I am ready to help you. Please tell me more about your requirements.');
    res.type('text/xml');
    res.send(fallbackTwiML);
  }
};

router.post('/process-speech', validateTwilioSignatureSafe, handleProcessSpeech);
router.get('/process-speech', handleProcessSpeech);

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

    const state = voiceWebhookService.getSessionDetails(session.id) ||
      (session.twilioCallSid ? voiceWebhookService.getSessionDetails(session.twilioCallSid) : null);

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
        createdAt: session.createdAt,
        turnCount: state?.conversation ? state.conversation.length : 0,
        lastLanguage: state?.lastDetectedLanguage || 'en-IN',
        hasGeneratedDoc: Boolean(state?.generatedDoc)
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
 * GET /api/voice/session/:id/requirements
 * Fetches discovered structured requirements, conversation transcript, and generated document
 */
router.get('/session/:id/requirements', optionalAuth, async (req, res) => {
  try {
    const session = await twilioVoiceService.getSession(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        errorCode: 'SESSION_NOT_FOUND',
        message: 'Voice session not found.'
      });
    }

    const state = voiceWebhookService.getSessionDetails(session.id) ||
      (session.twilioCallSid ? voiceWebhookService.getSessionDetails(session.twilioCallSid) : null);

    // If generatedDoc is not yet created, generate it on-the-fly
    let generatedDoc = state?.generatedDoc || null;
    if (!generatedDoc && state?.conversation && state.conversation.length > 0) {
      try {
        generatedDoc = await aiVoiceConsultantService.generateProjectRequirementsDocument({
          session,
          conversation: state.conversation,
          requirements: state.requirements || {}
        });
        if (state) state.generatedDoc = generatedDoc;
      } catch (err) {
        console.warn('[VoiceRoutes] On-demand markdown generation warning:', err.message);
      }
    }

    res.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      conversation: state?.conversation || [],
      requirements: state?.requirements || {},
      generatedDoc: generatedDoc || null,
      markdownContent: generatedDoc?.markdownContent || '',
      fileName: generatedDoc?.fileName || `project-requirements-${session.id}.md`,
      detectedLanguage: state?.lastDetectedLanguage || 'en-IN'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      errorCode: 'REQUIREMENTS_FETCH_ERROR',
      message: 'Failed to retrieve voice session requirements.'
    });
  }
});

/**
 * GET /api/voice/session/:id/markdown
 * Returns the raw or downloadable markdown document
 */
router.get('/session/:id/markdown', optionalAuth, async (req, res) => {
  try {
    const session = await twilioVoiceService.getSession(req.params.id);

    if (!session) {
      return res.status(404).send('# Session Not Found\nThe requested voice session does not exist.');
    }

    const state = voiceWebhookService.getSessionDetails(session.id) ||
      (session.twilioCallSid ? voiceWebhookService.getSessionDetails(session.twilioCallSid) : null);

    let markdown = state?.generatedDoc?.markdownContent;
    let fileName = state?.generatedDoc?.fileName;

    // If not generated, synthesize immediately
    if (!markdown) {
      try {
        const docResult = await aiVoiceConsultantService.generateProjectRequirementsDocument({
          session,
          conversation: state?.conversation || [],
          requirements: state?.requirements || {}
        });
        if (state) state.generatedDoc = docResult;
        markdown = docResult.markdownContent;
        fileName = docResult.fileName;
      } catch (err) {
        markdown = `# Project Requirements Document\n\n## 1. Project Overview\nVoice discovery session: ${session.id}\n\n## 2. Business Problem\nDiscovered via RootForge AI Consultant.`;
        fileName = `project-requirements-${session.id}.md`;
      }
    }

    const finalFileName = fileName || `project-requirements-${session.id}.md`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFileName}"`);
    res.send(markdown);
  } catch (err) {
    res.status(500).send('# Error\nFailed to generate or retrieve markdown document.');
  }
});


/**
 * POST /api/voice/recording-status & POST /api/voice/recording
 * Twilio Call Recording Status Callback Webhook
 * Twilio sends this when call recording is complete and ready.
 */
const handleRecordingWebhook = async (req, res) => {
  const callSid = req.body.CallSid || req.query.CallSid || null;
  const recordingSid = req.body.RecordingSid || req.query.RecordingSid || null;
  const recordingUrl = req.body.RecordingUrl || req.query.RecordingUrl || null;
  const recordingStatus = req.body.RecordingStatus || req.query.RecordingStatus || 'completed';
  const recordingDuration = parseInt(req.body.RecordingDuration || req.query.RecordingDuration || '0', 10);
  const sessionId = req.query.sessionId || req.body.sessionId || null;

  console.log(`[TwilioRecordingWebhook] Received for Call: ${callSid}, Recording: ${recordingSid}, Status: ${recordingStatus}`);

  // Fast response back to Twilio so webhook never blocks
  res.type('text/xml');
  res.send('<Response />');

  try {
    await voiceWebhookService.handleRecordingCallback({
      callSid,
      recordingSid,
      recordingUrl,
      recordingStatus,
      recordingDuration,
      sessionId
    });
  } catch (err) {
    console.error('[TwilioRecordingWebhook] Processing error:', err.message);
  }
};

router.post('/recording-status', validateTwilioSignatureSafe, handleRecordingWebhook);
router.get('/recording-status', handleRecordingWebhook);
router.post('/recording', validateTwilioSignatureSafe, handleRecordingWebhook);
router.get('/recording', handleRecordingWebhook);

/**
 * GET /api/voice/session/:id/pipeline-status
 * Detailed pipeline observability & diagnostic endpoint
 */
router.get('/session/:id/pipeline-status', optionalAuth, async (req, res) => {
  try {
    const session = await twilioVoiceService.getSession(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        errorCode: 'SESSION_NOT_FOUND',
        message: 'Voice session not found.'
      });
    }

    const state = await voiceWebhookService.getSessionDetails(session.id);

    res.json({
      success: true,
      sessionId: session.id,
      callSid: session.twilioCallSid,
      phoneNumberMasked: maskPhoneNumber(session.phoneNumber),
      workspaceId: session.workspaceId,
      callStatus: session.status,
      processingStatus: session.processingStatus || 'PENDING',
      transcriptStatus: session.transcriptStatus || 'PENDING',
      analysisStatus: session.analysisStatus || 'PENDING',
      recordingSid: session.recordingSid || state?.recordingSid || null,
      recordingUrl: session.recordingUrl || state?.recordingUrl || null,
      recordingDuration: session.recordingDuration || state?.recordingDuration || 0,
      detectedLanguage: session.detectedLanguage || state?.lastDetectedLanguage || 'en-IN',
      turnCount: state?.conversation ? state.conversation.length : 0,
      rawTranscriptLength: session.rawTranscript ? session.rawTranscript.length : 0,
      hasRawTranscript: Boolean(session.rawTranscript),
      rawTranscript: session.rawTranscript || null,
      requirementsJson: session.requirementsJson ? (typeof session.requirementsJson === 'string' ? JSON.parse(session.requirementsJson) : session.requirementsJson) : (state?.requirements || null),
      conversation: state?.conversation || [],
      generatedDoc: state?.generatedDoc || null,
      lastError: session.lastError || null,
      retryCount: session.retryCount || 0,
      timestamps: {
        startedAt: session.startedAt,
        connectedAt: session.connectedAt,
        endedAt: session.endedAt,
        createdAt: session.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      errorCode: 'PIPELINE_STATUS_ERROR',
      message: err.message || 'Failed to fetch pipeline status.'
    });
  }
});

/**
 * POST /api/voice/session/:id/retry-pipeline
 * Retries the entire background intelligence pipeline for a session
 */
router.post('/session/:id/retry-pipeline', optionalAuth, async (req, res) => {
  try {
    const session = await twilioVoiceService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Voice session not found.' });
    }

    if (!session.recordingUrl && !session.rawTranscript) {
      return res.status(400).json({
        success: false,
        message: 'No recording URL or transcript available to process.'
      });
    }

    // Trigger async background retry
    setImmediate(() => {
      voiceWebhookService.processRecordingPipeline({
        callSid: session.twilioCallSid,
        recordingSid: session.recordingSid,
        recordingUrl: session.recordingUrl,
        recordingDuration: session.recordingDuration,
        sessionId: session.id
      }).catch(err => {
        console.error('[VoiceRoute] Retry pipeline error:', err.message);
      });
    });

    res.json({
      success: true,
      message: 'Voice intelligence pipeline re-triggered in background.',
      sessionId: session.id
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/voice/session/:id/retry-analysis
 * Re-runs Groq deep analysis & document generation from existing transcript
 */
router.post('/session/:id/retry-analysis', optionalAuth, async (req, res) => {
  try {
    const session = await twilioVoiceService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Voice session not found.' });
    }

    const state = await voiceWebhookService.getSessionDetails(session.id);
    const transcript = session.rawTranscript || state?.conversation?.map(c => `${c.role}: ${c.text}`).join('\n');

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({
        success: false,
        message: 'No conversation transcript available to analyze.'
      });
    }

    // Extract Groq structured analysis
    const structuredAnalysis = await aiVoiceConsultantService.extractDeepStructuredAnalysis({
      transcript,
      conversation: state?.conversation || [],
      session
    });

    // Generate Document
    const docResult = await aiVoiceConsultantService.generateProjectRequirementsDocument({
      session,
      conversation: state?.conversation || [],
      requirements: structuredAnalysis,
      rawTranscript: session.rawTranscript
    });

    if (state) state.generatedDoc = docResult;

    if (prisma?.voiceSession) {
      await prisma.voiceSession.update({
        where: { id: session.id },
        data: {
          requirementsJson: JSON.stringify(structuredAnalysis),
          analysisStatus: 'COMPLETED',
          processingStatus: 'COMPLETED'
        }
      });
    }

    res.json({
      success: true,
      message: 'AI analysis and document regenerated successfully.',
      structuredAnalysis,
      generatedDoc: docResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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



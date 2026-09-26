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
import fs from 'fs';
import path from 'path';
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
 * Helper to fetch session, messages, and document for route handlers
 */
const fetchSessionData = async (idOrSessionId) => {
  const session = await twilioVoiceService.getSession(idOrSessionId);
  if (!session) return null;

  const messages = await twilioVoiceService.getConversationMessages(session.id);
  const docMeta = await twilioVoiceService.getConversationDocument(session.id);
  const stateDetails = await voiceWebhookService.getSessionDetails(session.id);

  let markdownContent = '';
  let fileName = docMeta?.fileName || `voice-discovery-${session.id}.md`;

  if (docMeta?.storagePath) {
    try {
      const fullPath = path.resolve(process.cwd(), docMeta.storagePath);
      if (fs.existsSync(fullPath)) {
        markdownContent = fs.readFileSync(fullPath, 'utf8');
      }
    } catch {}
  }

  // If markdown document not yet created on disk, generate it deterministically
  if (!markdownContent && messages.length > 0) {
    try {
      const generated = await aiVoiceConsultantService.generateAndSaveVoiceDiscoveryMarkdown({
        session,
        messages,
        requirements: stateDetails?.requirements || {},
        initialRequirement: stateDetails?.requirements?.business_problem || messages.find(m => m.speaker === 'user')?.text || '',
        status: session.status === 'completed' ? 'Completed' : 'Incomplete'
      });
      markdownContent = generated.markdownContent;
      fileName = generated.fileName;
    } catch (err) {
      console.warn('[VoiceRoute] Markdown generation notice:', err.message);
    }
  }

  return {
    session,
    messages,
    docMeta,
    stateDetails,
    markdownContent,
    fileName
  };
};

/**
 * GET /api/voice/session/:id & GET /api/voice/sessions/:sessionId
 * Fetches status, metadata, and turn count of an active or past voice session
 */
const handleGetSession = async (req, res) => {
  try {
    const sessionId = req.params.id || req.params.sessionId;
    const sessionData = await fetchSessionData(sessionId);

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        errorCode: 'SESSION_NOT_FOUND',
        message: 'Voice session not found.'
      });
    }

    const { session, messages, docMeta, stateDetails } = sessionData;
    const isCompleted = session.status === 'completed';

    res.json({
      success: true,
      sessionId: session.id,
      session: {
        id: session.id,
        status: session.status,
        phoneNumberMasked: maskPhoneNumber(session.phoneNumber),
        startedAt: session.startedAt,
        connectedAt: session.connectedAt,
        endedAt: session.endedAt,
        errorMessage: session.errorMessage,
        createdAt: session.createdAt,
        completionStatus: isCompleted ? 'completed' : (session.status === 'failed' || session.status === 'cancelled' ? 'incomplete' : 'in-progress'),
        turnCount: messages.length,
        userTurns: messages.filter(m => m.speaker === 'user').length,
        assistantTurns: messages.filter(m => m.speaker === 'assistant').length,
        lastLanguage: stateDetails?.lastDetectedLanguage || messages[messages.length - 1]?.language || 'en-IN',
        hasGeneratedDoc: Boolean(docMeta || sessionData.markdownContent)
      },
      messages
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      errorCode: 'SESSION_FETCH_ERROR',
      message: 'Failed to retrieve voice session status.'
    });
  }
};

router.get('/session/:id', optionalAuth, handleGetSession);
router.get('/sessions/:sessionId', optionalAuth, handleGetSession);

/**
 * GET /api/voice/session/:id/transcript & GET /api/voice/sessions/:sessionId/transcript
 * Returns the conversation transcript in structured chronological format and Q&A mapping
 */
const handleGetTranscript = async (req, res) => {
  try {
    const sessionId = req.params.id || req.params.sessionId;
    const sessionData = await fetchSessionData(sessionId);

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        errorCode: 'SESSION_NOT_FOUND',
        message: 'Voice session not found.'
      });
    }

    const { session, messages } = sessionData;

    // Build Q&A mapping
    const q1A = messages.find(m => m.speaker === 'assistant' && m.questionNumber === 1);
    const q1U = messages.find(m => m.speaker === 'user' && m.questionNumber === 1);
    const q2A = messages.find(m => m.speaker === 'assistant' && m.questionNumber === 2);
    const q2U = messages.find(m => m.speaker === 'user' && m.questionNumber === 2);
    const q3A = messages.find(m => m.speaker === 'assistant' && m.questionNumber === 3);
    const q3U = messages.find(m => m.speaker === 'user' && m.questionNumber === 3);

    const questionsAndAnswers = [
      { questionNumber: 1, question: q1A?.text || null, answer: q1U?.text || null, englishAnswer: q1U?.englishText || null },
      { questionNumber: 2, question: q2A?.text || null, answer: q2U?.text || null, englishAnswer: q2U?.englishText || null },
      { questionNumber: 3, question: q3A?.text || null, answer: q3U?.text || null, englishAnswer: q3U?.englishText || null }
    ].filter(qa => qa.question || qa.answer);

    res.json({
      success: true,
      sessionId: session.id,
      callSid: session.twilioCallSid,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      status: session.status,
      totalTurns: messages.length,
      questionsAndAnswers,
      messages: messages.map(m => ({
        sequence: m.sequence,
        speaker: m.speaker,
        text: m.text,
        englishText: m.englishText,
        language: m.language,
        questionNumber: m.questionNumber,
        timestamp: m.timestamp
      }))
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      errorCode: 'TRANSCRIPT_FETCH_ERROR',
      message: 'Failed to retrieve transcript.'
    });
  }
};

router.get('/session/:id/transcript', optionalAuth, handleGetTranscript);
router.get('/sessions/:sessionId/transcript', optionalAuth, handleGetTranscript);

/**
 * GET /api/voice/session/:id/requirements & GET /api/voice/sessions/:sessionId/requirements
 * Fetches discovered structured requirements, conversation transcript, and generated document
 */
const handleGetRequirements = async (req, res) => {
  try {
    const sessionId = req.params.id || req.params.sessionId;
    const sessionData = await fetchSessionData(sessionId);

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        errorCode: 'SESSION_NOT_FOUND',
        message: 'Voice session not found.'
      });
    }

    const { session, messages, docMeta, stateDetails, markdownContent, fileName } = sessionData;

    res.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      conversation: messages,
      messages: messages,
      requirements: stateDetails?.requirements || {},
      generatedDoc: {
        fileName,
        storagePath: docMeta?.storagePath || `uploads/voice-discovery/${fileName}`,
        fileSize: docMeta?.fileSize || Buffer.byteLength(markdownContent || '', 'utf8'),
        markdownContent
      },
      markdownContent: markdownContent || '',
      fileName: fileName || `voice-discovery-${session.id}.md`,
      detectedLanguage: stateDetails?.lastDetectedLanguage || 'en-IN'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      errorCode: 'REQUIREMENTS_FETCH_ERROR',
      message: 'Failed to retrieve voice session requirements.'
    });
  }
};

router.get('/session/:id/requirements', optionalAuth, handleGetRequirements);
router.get('/sessions/:sessionId/requirements', optionalAuth, handleGetRequirements);

/**
 * GET /api/voice/session/:id/markdown & GET /api/voice/sessions/:sessionId/markdown
 * Returns the raw or downloadable markdown document
 */
const handleGetMarkdown = async (req, res) => {
  try {
    const sessionId = req.params.id || req.params.sessionId;
    const sessionData = await fetchSessionData(sessionId);

    if (!sessionData) {
      return res.status(404).send('# Session Not Found\nThe requested voice session does not exist.');
    }

    const { session, markdownContent, fileName } = sessionData;
    const finalFileName = fileName || `voice-discovery-${session.id}.md`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFileName}"`);
    res.send(markdownContent || '# No Conversation Recorded\n\nThis session contains no conversation turns.');
  } catch (err) {
    res.status(500).send('# Error\nFailed to generate or retrieve markdown document.');
  }
};

router.get('/session/:id/markdown', optionalAuth, handleGetMarkdown);
router.get('/sessions/:sessionId/markdown', optionalAuth, handleGetMarkdown);

/**
 * POST /api/voice/session/:id/cancel & POST /api/voice/sessions/:sessionId/cancel
 * Cancels / hangs up an active voice call
 */
const handleCancelSession = async (req, res) => {
  try {
    const sessionId = req.params.id || req.params.sessionId;
    const result = await twilioVoiceService.cancelCall(sessionId);
    res.json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      errorCode: err.code || 'CANCEL_FAILED',
      message: err.message || 'Failed to cancel voice call.'
    });
  }
};

router.post('/session/:id/cancel', optionalAuth, handleCancelSession);
router.post('/sessions/:sessionId/cancel', optionalAuth, handleCancelSession);

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



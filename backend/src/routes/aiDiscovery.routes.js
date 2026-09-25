/**
 * RootForge AI Business Consultant — Groq Discovery API Routes
 * 
 * Endpoints:
 * - POST /api/ai/discovery            -> Shorthand discovery turn (accepts message & optional sessionId)
 * - POST /api/ai/discovery/start      -> Creates a new discovery session
 * - POST /api/ai/discovery/message    -> Submits message for active discovery session
 * - GET  /api/ai/discovery/:sessionId -> Retrieves current state, history, and requirements of session
 * - POST /api/ai/discovery/reset      -> Resets an existing session
 * - GET  /api/ai/discovery/health     -> Telemetry & health status of Groq service
 */

import express from 'express';
import { groqDiscoveryService } from '../services/ai/groqDiscovery.service.js';

const router = express.Router();

/**
 * GET /api/ai/discovery/health
 * Health check & configuration status
 */
router.get('/health', (req, res) => {
  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
  const hasGemini = Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY.trim());

  res.json({
    success: true,
    service: 'groq-discovery',
    model: groqDiscoveryService.model,
    configured: hasGroq || hasGemini,
    primaryProvider: hasGroq ? 'groq' : (hasGemini ? 'gemini' : 'deterministic-fallback')
  });
});

/**
 * POST /api/ai/discovery/start
 * Initiates a new discovery session
 */
router.post('/start', async (req, res) => {
  try {
    const { initialMessage = '' } = req.body || {};
    const session = groqDiscoveryService.getOrCreateSession();

    if (initialMessage && initialMessage.trim()) {
      const result = await groqDiscoveryService.processDiscoveryTurn({
        sessionId: session.sessionId,
        message: initialMessage
      });
      return res.json({
        success: true,
        ...result
      });
    }

    res.json({
      success: true,
      sessionId: session.sessionId,
      conversation_complete: false,
      message: 'Discovery session initialized. Send your first business requirement to begin.',
      requirements: session.requirements,
      missing_information: session.missingInformation
    });
  } catch (err) {
    console.error('[AiDiscoveryRoutes] Start session error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to start discovery session'
    });
  }
});

/**
 * POST /api/ai/discovery/message
 * Handles a conversation turn with an existing session ID
 */
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required.'
      });
    }

    const result = await groqDiscoveryService.processDiscoveryTurn({
      sessionId,
      message
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('[AiDiscoveryRoutes] Process message error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process discovery message'
    });
  }
});

/**
 * POST /api/ai/discovery
 * Universal single-shot or session-based discovery endpoint
 */
router.post('/', async (req, res) => {
  try {
    const { message, sessionId = null } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required in request body: { "message": "..." }'
      });
    }

    const result = await groqDiscoveryService.processDiscoveryTurn({
      sessionId,
      message
    });

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('[AiDiscoveryRoutes] Discovery error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Discovery processing error'
    });
  }
});

/**
 * GET /api/ai/discovery/:sessionId
 * Retrieves detailed session status, history, and requirements
 */
router.get('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = groqDiscoveryService.getSession(sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Discovery session not found or expired.'
    });
  }

  res.json({
    success: true,
    sessionId: session.sessionId,
    conversation_complete: session.conversationComplete,
    detected_intent: session.detectedIntent,
    project_summary: session.projectSummary,
    next_question: session.lastQuestion,
    question_reason: session.lastQuestionReason,
    requirements: session.requirements,
    missing_information: session.missingInformation,
    ai_recommendations: session.aiRecommendations,
    conversation_history: session.conversationHistory,
    created_at: session.createdAt,
    updated_at: session.updatedAt
  });
});

/**
 * POST /api/ai/discovery/reset
 * Resets a discovery session
 */
router.post('/reset', (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'sessionId is required to reset session.'
    });
  }

  const session = groqDiscoveryService.resetSession(sessionId);
  res.json({
    success: true,
    sessionId: session.sessionId,
    message: 'Discovery session has been reset.'
  });
});

export default router;

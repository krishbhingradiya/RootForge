import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { aiService } from '../ai/aiService.js';
import { getWorkspaceContext } from '../services/workspaceContext.service.js';
import {
  assertWorkspaceAccess,
  assertWorkspaceWriteAccess,
  handleRouteError
} from '../services/authorization.service.js';
import * as chatSessionService from '../services/chatSession.service.js';
import { resolveConversationalLanguage } from '../utils/languageDetector.js';

const router = Router();

// In-memory cache for suggested discovery questions (keyed by workspaceId_docCount)
// Eliminates the 4-10s Gemini call when users simply refresh or view discovery history
const suggestedQuestionsCache = new Map();

/**
 * GET /api/workspaces/:id/discovery
 * Retrieves discovery state: active conversation, chat session list, and suggested questions.
 * Supports ?chatId=... to switch active session without recreating.
 * Supports ?refreshQuestions=true to regenerate suggested questions on demand.
 */
router.get('/:id/discovery', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const context = await getWorkspaceContext(workspaceId, req.user);
    const workspace = context.workspace;

    const requestedChatId = req.query.chatId;
    let conversation = null;

    if (requestedChatId) {
      conversation = await chatSessionService.getChatSessionWithMessages(
        requestedChatId,
        workspace.id
      );
    }

    if (!conversation) {
      conversation = await chatSessionService.getOrCreateDefaultSession(
        workspace.id,
        'discovery',
        workspace
      );
    }

    // List all non-archived sessions for the discovery stage
    const sessions = await chatSessionService.listChatSessions(workspace.id, 'discovery');

    // Dynamic discovery questions caching
    const docCount = (context.documents && context.documents.length) || 0;
    const cacheKey = `${workspace.id}_${docCount}`;
    const shouldRefreshQuestions = req.query.refreshQuestions === 'true';

    let suggestedQuestions = suggestedQuestionsCache.get(cacheKey);

    if (!suggestedQuestions || shouldRefreshQuestions) {
      try {
        suggestedQuestions = await aiService.generateDiscoveryQuestions(context);
        if (Array.isArray(suggestedQuestions) && suggestedQuestions.length > 0) {
          suggestedQuestionsCache.set(cacheKey, suggestedQuestions);
        }
      } catch (err) {
        // If question generation fails, fall back to empty or previous cache
        console.warn('Suggested questions generation notice:', err.message);
        suggestedQuestions = suggestedQuestions || [];
      }
    }

    res.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        objective: workspace.objective,
        challenge: workspace.challenge,
        industry: workspace.industry,
        targetUsers: workspace.targetUsers,
        expectedOutcome: workspace.expectedOutcome,
        documentsCount: docCount
      },
      conversation,
      sessions,
      suggestedQuestions: suggestedQuestions || [],
      canonicalDiscovery: {
        userConfirmedFacts: context.discovery.userConfirmedFacts || [],
        userCorrections: context.discovery.userCorrections || [],
        openQuestions: context.discovery.openQuestions || [],
        discoveredGoals: context.discovery.discoveredGoals || [],
        discoveredConstraints: context.discovery.discoveredConstraints || []
      }
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve discovery state.');
  }
});

/**
 * POST /api/workspaces/:id/discovery/messages
 * Sends a message in the active or specified discovery conversation.
 * Supports chatId and clientRequestId for idempotency and session scoping.
 */
router.post('/:id/discovery/messages', authenticate, async (req, res) => {
  const tTotalStart = Date.now();
  try {
    const workspaceId = req.params.id;
    await assertWorkspaceWriteAccess(workspaceId, req.user);

    const { content, chatId: specifiedChatId, clientRequestId = null } = req.body;
    const uiLanguage = (req.body.uiLanguage || req.body.language || req.query.language || 'en').toLowerCase().trim();
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const conversationalLanguage = resolveConversationalLanguage(content, uiLanguage);

    const context = await getWorkspaceContext(workspaceId, req.user);
    const workspace = context.workspace;

    // Resolve target conversation
    let conversation = null;
    if (specifiedChatId) {
      conversation = await chatSessionService.getChatSessionWithMessages(specifiedChatId, workspace.id);
    }
    if (!conversation) {
      conversation = await chatSessionService.getOrCreateDefaultSession(workspace.id, 'discovery', workspace);
    }

    const targetChatId = conversation.id;

    // Save user message with idempotency check
    const { userMessage, isDuplicate } = await chatSessionService.saveUserMessage(
      targetChatId,
      content.trim(),
      clientRequestId
    );

    // If duplicate send, return existing assistant response
    if (isDuplicate) {
      const existingAssistantMsg = await prisma.message.findFirst({
        where: {
          conversationId: targetChatId,
          role: 'assistant',
          createdAt: { gte: userMessage.createdAt }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (existingAssistantMsg) {
        let structured = null;
        if (existingAssistantMsg.structuredContent) {
          try { structured = JSON.parse(existingAssistantMsg.structuredContent); } catch {}
        }
        return res.json({
          userMessage,
          assistantMessage: existingAssistantMsg,
          structured,
          relevance: 'RELATED',
          language: conversationalLanguage,
          conversationalLanguage,
          uiLanguage,
          isDuplicate: true,
          _perf: { totalMs: Date.now() - tTotalStart, cached: true }
        });
      }
    }

    // Bounded conversation history for prompt context
    const recentMessages = await prisma.message.findMany({
      where: { conversationId: targetChatId },
      orderBy: { createdAt: 'desc' },
      take: 8
    });
    const conversationHistory = recentMessages.reverse().map(m => ({
      role: m.role,
      content: m.content
    }));

    // Generate AI Consultant response
    const tProviderStart = Date.now();
    const aiResponse = await aiService.answerDiscoveryQuestion(
      context,
      content.trim(),
      conversationHistory,
      conversationalLanguage
    );
    const providerMs = Date.now() - tProviderStart;

    // Save assistant message
    const tPersistStart = Date.now();
    const assistantMessage = await chatSessionService.saveAssistantMessage(
      targetChatId,
      aiResponse.message,
      aiResponse.structured,
      aiResponse.suggestedAction
    );
    const persistenceMs = Date.now() - tPersistStart;

    // Non-blocking activity log
    prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        userName: req.user.name,
        action: 'DISCOVERY',
        details: `Consulted on: "${content.slice(0, 60)}..."`
      }
    }).catch(err => console.warn('Non-critical activity log error:', err.message));

    res.json({
      userMessage,
      assistantMessage,
      structured: aiResponse.structured || null,
      relevance: aiResponse.relevance || 'RELATED',
      language: aiResponse.language || conversationalLanguage,
      conversationalLanguage: aiResponse.language || conversationalLanguage,
      uiLanguage,
      _perf: {
        providerMs,
        persistenceMs,
        totalMs: Date.now() - tTotalStart
      }
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to process discovery message.');
  }
});

export default router;

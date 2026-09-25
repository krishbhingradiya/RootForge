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

    const { content, chatId: specifiedChatId, clientRequestId = null, detectedLanguage: clientDetectedLang = null, inputType = 'text' } = req.body;
    const requestedLanguage = (req.body.language || req.body.uiLanguage || req.query.language || 'auto').toLowerCase().trim();
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const conversationalLanguage = resolveConversationalLanguage(content, requestedLanguage);
    const detectedLanguage = clientDetectedLang && clientDetectedLang !== 'auto'
      ? clientDetectedLang
      : resolveConversationalLanguage(content, null);

    const wantsStream = req.query.stream === 'true' || req.body.stream === true || req.headers.accept?.includes('text/event-stream');

    // Resolve target conversation & context in parallel
    const [context, targetSession] = await Promise.all([
      getWorkspaceContext(workspaceId, req.user, { query: content.trim() }),
      specifiedChatId
        ? chatSessionService.getChatSessionWithMessages(specifiedChatId, workspaceId)
        : null
    ]);

    const workspace = context.workspace;
    let conversation = targetSession;
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
        const dupResponse = {
          userMessage,
          assistantMessage: existingAssistantMsg,
          structured,
          relevance: 'RELATED',
          language: conversationalLanguage,
          conversationalLanguage,
          detectedLanguage,
          responseLanguage: conversationalLanguage,
          inputType,
          isDuplicate: true,
          _perf: { totalMs: Date.now() - tTotalStart, cached: true }
        };

        if (wantsStream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.write(`event: start\ndata: ${JSON.stringify({ userMessage, chatId: targetChatId, clientRequestId })}\n\n`);
          const existingText = existingAssistantMsg.content;
          res.write(`event: chunk\ndata: ${JSON.stringify({ delta: existingText, text: existingText })}\n\n`);
          res.write(`event: done\ndata: ${JSON.stringify(dupResponse)}\n\n`);
          return res.end();
        }

        return res.json(dupResponse);
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

    // Streaming path
    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      res.write(`event: start\ndata: ${JSON.stringify({ userMessage, chatId: targetChatId, clientRequestId })}\n\n`);

      const tProviderStart = Date.now();
      let firstTokenMs = null;

      const aiResponse = await relevanceGuard.streamConsultantAnswer(
        context,
        content.trim(),
        conversationHistory,
        conversationalLanguage,
        {
          onFirstToken: (ftMs) => {
            firstTokenMs = ftMs;
          },
          onChunk: ({ delta, accumulatedText }) => {
            res.write(`event: chunk\ndata: ${JSON.stringify({ delta, text: accumulatedText })}\n\n`);
          }
        }
      );
      const providerMs = Date.now() - tProviderStart;

      // Persist assistant message
      const tPersistStart = Date.now();
      const assistantMessage = await chatSessionService.saveAssistantMessage(
        targetChatId,
        aiResponse.message,
        aiResponse.structured,
        aiResponse.suggestedAction
      );
      const persistenceMs = Date.now() - tPersistStart;

      // Activity log (non-blocking)
      prisma.activityLog.create({
        data: {
          workspaceId: workspace.id,
          userId: req.user.id,
          userName: req.user.name,
          action: 'DISCOVERY',
          details: `Consulted on: "${content.slice(0, 60)}..."`
        }
      }).catch(err => console.warn('Non-critical activity log error:', err.message));

      const donePayload = {
        userMessage,
        assistantMessage,
        structured: aiResponse.structured || null,
        relevance: aiResponse.relevance || 'RELATED',
        language: aiResponse.language || conversationalLanguage,
        conversationalLanguage: aiResponse.language || conversationalLanguage,
        detectedLanguage,
        responseLanguage: aiResponse.language || conversationalLanguage,
        inputType,
        _perf: {
          firstTokenMs: firstTokenMs || aiResponse._perf?.firstTokenMs,
          providerMs,
          persistenceMs,
          totalMs: Date.now() - tTotalStart
        }
      };

      res.write(`event: done\ndata: ${JSON.stringify(donePayload)}\n\n`);
      return res.end();
    }

    // Standard Non-Streaming Path
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
      detectedLanguage,
      responseLanguage: aiResponse.language || conversationalLanguage,
      inputType,
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

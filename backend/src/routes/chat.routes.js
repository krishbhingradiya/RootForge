import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { relevanceGuard } from '../ai/relevanceGuard.js';
import { getWorkspaceContext } from '../services/workspaceContext.service.js';
import {
  assertWorkspaceAccess,
  assertWorkspaceWriteAccess,
  assertChatSessionAccess,
  handleRouteError
} from '../services/authorization.service.js';
import * as chatSessionService from '../services/chatSession.service.js';
import { translationService } from '../services/translation.service.js';
import { transcriptionService } from '../services/transcription.service.js';
import { ttsService } from '../services/tts.service.js';
import { resolveConversationalLanguage } from '../utils/languageDetector.js';

const router = Router();

/**
 * GET /api/workspaces/:id/chats
 * Lists lightweight chat sessions for a workspace and stage.
 * Never loads full message bodies; returns in <15ms.
 */
router.get('/:id/chats', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    await assertWorkspaceAccess(workspaceId, req.user);

    const stage = (req.query.stage || 'discovery').toLowerCase().trim();
    const sessions = await chatSessionService.listChatSessions(workspaceId, stage);

    res.json({
      workspaceId,
      stage,
      sessions,
      count: sessions.length
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to list chat sessions.');
  }
});

/**
 * POST /api/workspaces/:id/chats
 * Creates a new chat session for a workspace and stage (+ New Chat).
 * Does not delete or mutate existing sessions.
 */
router.post('/:id/chats', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await assertWorkspaceWriteAccess(workspaceId, req.user);

    const { stage = 'discovery', title = null, initialMessage = null } = req.body;
    const session = await chatSessionService.createChatSession(
      workspaceId,
      stage,
      title,
      initialMessage,
      workspace
    );

    res.status(201).json({
      message: 'New chat session created.',
      session
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to create chat session.');
  }
});

/**
 * GET /api/workspaces/:id/chats/:chatId
 * Retrieves full messages for a specific chat session.
 */
router.get('/:id/chats/:chatId', authenticate, async (req, res) => {
  try {
    const { id: workspaceId, chatId } = req.params;
    await assertChatSessionAccess(chatId, workspaceId, req.user);

    const limit = parseInt(req.query.limit || '100', 10);
    const session = await chatSessionService.getChatSessionWithMessages(chatId, workspaceId, limit);

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found.' });
    }

    res.json({ session });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve chat session.');
  }
});

/**
 * POST /api/workspaces/:id/chats/translate
 * Translates a batch of chat messages to the target language ('en' | 'hi' | 'gu').
 * Uses in-memory cache and 1-single batch Gemini call. Zero database mutations.
 */
router.post('/:id/chats/translate', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    await assertWorkspaceAccess(workspaceId, req.user);

    const { messages = [], targetLanguage = 'en' } = req.body;
    const result = await translationService.translateChatMessages(messages, targetLanguage);

    res.json(result);
  } catch (error) {
    handleRouteError(res, error, 'Failed to translate chat messages.');
  }
});

/**
 * POST /api/workspaces/:id/chats/:chatId/messages
 * Sends a message in a specific chat session with idempotency protection.
 * Runs AI Consultant with canonical business context and bounded conversation window.
 * Returns structured findings and performance metrics.
 */
router.post('/:id/chats/:chatId/messages', authenticate, async (req, res) => {
  const tTotalStart = Date.now();
  try {
    const { id: workspaceId, chatId } = req.params;
    const session = await assertChatSessionAccess(chatId, workspaceId, req.user, { requireWrite: true });

    const { content, clientRequestId = null } = req.body;
    const uiLanguage = (req.body.uiLanguage || req.body.language || req.query.language || 'en').toLowerCase().trim();
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // Resolve conversational language using 3-tier hierarchy:
    // Priority 1: Current message script -> Priority 2: UI language fallback -> Priority 3: Explicit instruction
    const conversationalLanguage = resolveConversationalLanguage(content, uiLanguage);

    // 1. Idempotency Check & Save User Message
    const { userMessage, isDuplicate } = await chatSessionService.saveUserMessage(
      chatId,
      content.trim(),
      clientRequestId
    );

    // If duplicate send, check if assistant response already exists
    if (isDuplicate) {
      const existingAssistantMsg = await prisma.message.findFirst({
        where: {
          conversationId: chatId,
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

    // 2. Canonical Business Context Retrieval with Query-Aware Chunk Relevance
    const tContextStart = Date.now();
    const context = await getWorkspaceContext(workspaceId, req.user, { query: content.trim() });
    const contextMs = Date.now() - tContextStart;

    // 3. Bounded Conversation History (last 8 messages for optimal token window)
    const recentMessages = await prisma.message.findMany({
      where: { conversationId: chatId },
      orderBy: { createdAt: 'desc' },
      take: 8
    });
    const conversationHistory = recentMessages.reverse().map(m => ({
      role: m.role,
      content: m.content
    }));

    // 4. Run AI Business Consultant using resolved conversational language
    const tProviderStart = Date.now();
    const aiResponse = await relevanceGuard.generateConsultantAnswer(
      context,
      content.trim(),
      conversationHistory,
      conversationalLanguage
    );
    const providerMs = Date.now() - tProviderStart;

    // 5. Persist Assistant Response & Structured Data
    const tPersistStart = Date.now();
    const assistantMessage = await chatSessionService.saveAssistantMessage(
      chatId,
      aiResponse.message,
      aiResponse.structured,
      aiResponse.suggestedAction
    );
    const persistenceMs = Date.now() - tPersistStart;

    // 6. Non-blocking Activity Log
    prisma.user.findUnique({ where: { id: req.user.id } })
      .then(u => {
        if (u) {
          return prisma.activityLog.create({
            data: {
              workspaceId,
              userId: req.user.id,
              userName: req.user.name,
              action: 'AI_CONSULTANT',
              details: `Consulted on [${session.stage}]: "${content.slice(0, 60)}..."`
            }
          });
        }
      })
      .catch(err => console.warn('Non-critical activity log error:', err.message));

    const totalMs = Date.now() - tTotalStart;

    res.json({
      userMessage,
      assistantMessage,
      structured: aiResponse.structured || null,
      relevance: aiResponse.relevance || 'RELATED',
      domain: aiResponse.domain || 'WORKSPACE_RELATED',
      language: aiResponse.language || conversationalLanguage,
      conversationalLanguage: aiResponse.language || conversationalLanguage,
      uiLanguage,
      _perf: {
        contextMs,
        providerMs,
        persistenceMs,
        totalMs
      }
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to process chat message.');
  }
});

/**
 * POST /api/workspaces/:id/chats/tts
 * Guaranteed text-to-speech synthesis supporting Gujarati (gu), Hindi (hi), and English (en).
 * Handles mixed-language segments, technical terms, and returns playable base64 MP3 stream.
 */
router.post('/:id/chats/tts', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    await assertWorkspaceAccess(workspaceId, req.user);

    const { text, language = 'gu', segments = null } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Valid non-empty text string is required for speech synthesis.' });
    }

    const result = await ttsService.synthesizeSpeech({
      text,
      language,
      segments
    });

    res.json({
      success: true,
      available: true,
      audioBase64: result.audioBase64,
      audioDataUrl: result.audioDataUrl,
      mimeType: result.mimeType,
      language: result.language,
      durationEstimateMs: result.durationEstimateMs,
      cached: result.cached
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to synthesize speech audio.');
  }
});

/**
 * PATCH /api/workspaces/:id/chats/:chatId
 * Renames or updates a chat session.
 */
router.patch('/:id/chats/:chatId', authenticate, async (req, res) => {
  try {
    const { id: workspaceId, chatId } = req.params;
    await assertChatSessionAccess(chatId, workspaceId, req.user, { requireWrite: true });

    await chatSessionService.updateChatSession(chatId, workspaceId, req.body);
    res.json({ message: 'Chat session updated.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to update chat session.');
  }
});

/**
 * DELETE /api/workspaces/:id/chats/:chatId
 * Soft-deletes (archives) a chat session without deleting canonical business findings.
 */
router.delete('/:id/chats/:chatId', authenticate, async (req, res) => {
  try {
    const { id: workspaceId, chatId } = req.params;
    await assertChatSessionAccess(chatId, workspaceId, req.user, { requireWrite: true });

    await chatSessionService.archiveChatSession(chatId, workspaceId);
    res.json({ message: 'Chat session archived successfully.' });
  } catch (error) {
    handleRouteError(res, error, 'Failed to archive chat session.');
  }
});

/**
 * POST /api/workspaces/:id/chats/transcribe-audio
 * Server-side speech-to-text audio transcription powered by Google Gemini multimodal audio.
 * Accepts base64 encoded audio and target language (en, hi, gu).
 */
router.post('/:id/chats/transcribe-audio', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    await assertWorkspaceAccess(workspaceId, req.user);

    const { audioData, mimeType = 'audio/webm', language = 'en' } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required for transcription.' });
    }

    const result = await transcriptionService.transcribeAudio({
      audioBase64: audioData,
      mimeType,
      expectedLanguage: language
    });

    res.json(result);
  } catch (error) {
    handleRouteError(res, error, 'Failed to transcribe audio.');
  }
});

export default router;


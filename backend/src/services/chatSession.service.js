/**
 * RootForge AI Solution Builder
 * Chat Session & Message Persistence Service
 * 
 * Manages workspace-scoped and stage-scoped conversations, fast retrieval,
 * deterministic title generation, idempotency tokens, and lightweight payloads.
 */

import { prisma } from '../prisma.js';

/**
 * Deterministically generates a human-friendly conversation title from the first user message.
 * Operates with 0ms latency and 0 LLM token cost.
 * 
 * @param {string} message - First user message
 * @returns {string} Clean, concise conversation title
 */
export function generateChatTitleFromMessage(message) {
  if (!message || typeof message !== 'string') return 'New Conversation';

  let cleaned = message.trim();

  // Strip leading conversational fillers
  cleaned = cleaned
    .replace(/^what\s+(are|is|do|does|can|should|would)\s+(the\s+)?/i, '')
    .replace(/^how\s+(can|do|does|should|would|will)\s+(we\s+|the\s+system\s+)?/i, '')
    .replace(/^which\s+(is|are)?\s*/i, '')
    .replace(/^tell\s+me\s+(about\s+)?/i, '')
    .replace(/^can\s+you\s+(explain|describe|clarify|detail)\s+/i, '')
    .replace(/^please\s+(explain|detail|clarify)\s+/i, '')
    .replace(/^do\s+we\s+(have|use|support)\s+/i, '')
    .replace(/^why\s+(is|are|does|do)\s+/i, '')
    .replace(/[?!.:;]+$/, '')
    .trim();

  if (!cleaned) {
    cleaned = message.trim().slice(0, 30);
  }

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // If longer than 40 characters, truncate cleanly at word boundary
  if (cleaned.length > 40) {
    const truncated = cleaned.slice(0, 37);
    const lastSpace = truncated.lastIndexOf(' ');
    cleaned = (lastSpace > 15 ? truncated.slice(0, lastSpace) : truncated).trim() + '...';
  }

  return cleaned || 'New Conversation';
}

/**
 * Lists lightweight chat session metadata for a workspace and stage.
 * Never loads full message bodies when listing chats for maximum performance.
 * 
 * @param {string} workspaceId - Workspace CUID
 * @param {string} stage - Stage identifier (e.g. discovery, analysis, solution, etc.)
 * @returns {Promise<Array>} Lightweight session records
 */
export async function listChatSessions(workspaceId, stage = 'discovery') {
  const normalizedStage = (stage || 'discovery').toLowerCase().trim();

  const sessions = await prisma.conversation.findMany({
    where: {
      workspaceId,
      stage: normalizedStage,
      isArchived: false
    },
    select: {
      id: true,
      title: true,
      stage: true,
      createdAt: true,
      updatedAt: true,
      lastMessageAt: true,
      _count: {
        select: { messages: true }
      }
    },
    orderBy: {
      lastMessageAt: 'desc'
    }
  });

  // Ensure descending chronological order (newest chat always on top)
  sessions.sort((a, b) => {
    const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
    const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
    return timeB - timeA;
  });

  return sessions.map(s => ({
    id: s.id,
    title: s.title,
    stage: s.stage,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    lastMessageAt: s.lastMessageAt,
    messageCount: s._count.messages
  }));
}

/**
 * Gets the active/most recent chat session for a workspace and stage,
 * or creates the first default session if none exists.
 * 
 * @param {string} workspaceId - Workspace CUID
 * @param {string} stage - Stage identifier
 * @param {object} workspaceMeta - { name, objective } for initial message personalization
 * @returns {Promise<object>} Active conversation with messages
 */
export async function getOrCreateDefaultSession(
  workspaceId,
  stage = 'discovery',
  workspaceMeta = {}
) {
  const normalizedStage = (stage || 'discovery').toLowerCase().trim();

  let session = await prisma.conversation.findFirst({
    where: {
      workspaceId,
      stage: normalizedStage,
      isArchived: false
    },
    orderBy: {
      lastMessageAt: 'desc'
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!session) {
    const wsName = workspaceMeta.name || 'Workspace';
    const wsObj = workspaceMeta.objective || 'Transform enterprise operations';

    let initialWelcome = `Welcome to the ${wsName} discovery session.\n\nI am your AI Business Consultant. I have cataloged your initial objective: "${wsObj}".\n\nTo tailor your solution architecture and technical roadmap, what are the primary operating bottlenecks or constraints in your environment today?`;

    if (normalizedStage === 'analysis') {
      initialWelcome = `Welcome to the Business Analysis consultation for ${wsName}.\n\nI can help evaluate current vs. future state, digital maturity scoring, and pain points. What specific business capabilities would you like to analyze?`;
    } else if (normalizedStage === 'solution') {
      initialWelcome = `Welcome to Solution Architecture formulation for ${wsName}.\n\nWe can review the trade-offs between Options A, B, and C. Which architecture strategy or cost trade-off would you like to explore?`;
    } else if (normalizedStage === 'architecture') {
      initialWelcome = `Welcome to System Topology & Technical Architecture for ${wsName}.\n\nI can advise on service tiering, protocol boundaries, and security controls. What technical layer would you like to review?`;
    } else if (normalizedStage === 'database' || normalizedStage === 'api') {
      initialWelcome = `Welcome to Database & API Design consultation for ${wsName}.\n\nI can help optimize relational schemas, SQL DDL, and REST API payload contracts. What data model or endpoint would you like to examine?`;
    } else if (normalizedStage === 'planning') {
      initialWelcome = `Welcome to Implementation & Sprint Planning for ${wsName}.\n\nI can review sprint allocations, task dependencies, and risk mitigation. What phase of the 12-week roadmap shall we inspect?`;
    }

    session = await prisma.conversation.create({
      data: {
        workspaceId,
        stage: normalizedStage,
        title: `${wsName} ${capitalize(normalizedStage)} Chat`,
        lastMessageAt: new Date(),
        messages: {
          create: [
            {
              role: 'assistant',
              content: initialWelcome
            }
          ]
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  return normalizeSession(session);
}

/**
 * Creates a brand new chat session for a workspace and stage (+ New Chat).
 * Does not alter existing chats.
 * 
 * @param {string} workspaceId - Workspace CUID
 * @param {string} stage - Stage identifier
 * @param {string} title - Optional title (defaults to "New Chat")
 * @param {string} initialWelcome - Optional custom initial assistant message
 * @param {object} workspaceMeta - Workspace metadata
 * @returns {Promise<object>} Fresh conversation record
 */
export async function createChatSession(
  workspaceId,
  stage = 'discovery',
  title = null,
  initialWelcome = null,
  workspaceMeta = {}
) {
  const normalizedStage = (stage || 'discovery').toLowerCase().trim();
  const wsName = workspaceMeta.name || 'Workspace';

  let welcomeMessage = initialWelcome;
  if (!welcomeMessage) {
    welcomeMessage = `Started a new ${capitalize(normalizedStage)} conversation for ${wsName}.\n\nI am grounded in your canonical workspace context and uploaded documents. How can I advise you today?`;
  }

  const session = await prisma.conversation.create({
    data: {
      workspaceId,
      stage: normalizedStage,
      title: title || `New ${capitalize(normalizedStage)} Chat`,
      lastMessageAt: new Date(),
      messages: {
        create: [
          {
            role: 'assistant',
            content: welcomeMessage
          }
        ]
      }
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  return normalizeSession(session);
}

/**
 * Retrieves a chat session with full messages and parsed structured content.
 * 
 * @param {string} chatId - Conversation CUID
 * @param {string} workspaceId - Workspace CUID
 * @param {number} limit - Maximum messages to retrieve
 * @returns {Promise<object>} Session with messages
 */
export async function getChatSessionWithMessages(chatId, workspaceId, limit = 100) {
  const session = await prisma.conversation.findFirst({
    where: {
      id: chatId,
      workspaceId,
      isArchived: false
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: limit
      }
    }
  });

  if (!session) return null;
  return normalizeSession(session);
}

/**
 * Saves a user message with double-send idempotency protection.
 * If clientRequestId already exists in this conversation, returns the existing message without duplicating.
 * 
 * @param {string} chatId - Conversation CUID
 * @param {string} content - Message text
 * @param {string} clientRequestId - Optional unique client token
 * @returns {Promise<{ userMessage: object, isDuplicate: boolean }>}
 */
export async function saveUserMessage(chatId, content, clientRequestId = null) {
  if (clientRequestId) {
    const existing = await prisma.message.findFirst({
      where: {
        conversationId: chatId,
        clientRequestId
      }
    });

    if (existing) {
      return { userMessage: existing, isDuplicate: true };
    }
  }

  const userMessage = await prisma.message.create({
    data: {
      conversationId: chatId,
      role: 'user',
      content: content.trim(),
      clientRequestId: clientRequestId || null
    }
  });

  // Check if conversation still has default placeholder title; if so, update with smart title
  const conv = await prisma.conversation.findUnique({
    where: { id: chatId },
    select: { title: true, _count: { select: { messages: true } } }
  });

  if (conv) {
    const isGenericTitle = 
      conv.title === 'New Chat' ||
      conv.title.startsWith('New ') ||
      conv.title.endsWith('Session') ||
      conv.title === 'Discovery Conversation';

    if (isGenericTitle || conv._count.messages <= 3) {
      const smartTitle = generateChatTitleFromMessage(content);
      await prisma.conversation.update({
        where: { id: chatId },
        data: {
          title: smartTitle,
          lastMessageAt: new Date()
        }
      });
    } else {
      await prisma.conversation.update({
        where: { id: chatId },
        data: { lastMessageAt: new Date() }
      });
    }
  }

  return { userMessage, isDuplicate: false };
}

/**
 * Saves assistant response and optional structured consultant findings.
 * 
 * @param {string} chatId - Conversation CUID
 * @param {string} content - Rendered message string
 * @param {object} structured - Structured consultant JSON payload
 * @param {string} suggestedAction - Optional action recommendation
 * @returns {Promise<object>} Assistant message record
 */
export async function saveAssistantMessage(
  chatId,
  content,
  structured = null,
  suggestedAction = null
) {
  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: chatId,
      role: 'assistant',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      structuredContent: structured ? JSON.stringify(structured) : null,
      suggestedAction: suggestedAction || null
    }
  });

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id: chatId },
    data: { lastMessageAt: new Date() }
  });

  return {
    ...assistantMessage,
    structured: structured || null
  };
}

/**
 * Soft-deletes (archives) a chat session.
 * 
 * @param {string} chatId - Conversation CUID
 * @param {string} workspaceId - Workspace CUID
 */
export async function archiveChatSession(chatId, workspaceId) {
  return prisma.conversation.updateMany({
    where: {
      id: chatId,
      workspaceId
    },
    data: {
      isArchived: true
    }
  });
}

/**
 * Updates a conversation's title or properties.
 * 
 * @param {string} chatId - Conversation CUID
 * @param {string} workspaceId - Workspace CUID
 * @param {object} data - { title }
 */
export async function updateChatSession(chatId, workspaceId, data) {
  return prisma.conversation.updateMany({
    where: {
      id: chatId,
      workspaceId
    },
    data: {
      title: data.title ? data.title.trim() : undefined
    }
  });
}

/**
 * Normalizes conversation records, parsing serialized structured content.
 */
function normalizeSession(session) {
  if (!session) return null;

  const messages = (session.messages || []).map(m => {
    let structured = null;
    if (m.structuredContent) {
      try {
        structured = JSON.parse(m.structuredContent);
      } catch {}
    } else if (m.role === 'assistant') {
      try {
        const parsed = JSON.parse(m.content);
        if (parsed && typeof parsed === 'object' && (parsed.summary || parsed.confirmedFacts)) {
          structured = parsed;
        }
      } catch {}
    }

    return {
      id: m.id,
      role: m.role,
      content: m.content,
      structured,
      suggestedAction: m.suggestedAction,
      clientRequestId: m.clientRequestId,
      createdAt: m.createdAt
    };
  });

  return {
    id: session.id,
    workspaceId: session.workspaceId,
    stage: session.stage,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    lastMessageAt: session.lastMessageAt,
    messages
  };
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

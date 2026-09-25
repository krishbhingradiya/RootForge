import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useWorkspace } from './WorkspaceContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { currentWorkspace } = useWorkspace();

  // Mapping of `${workspaceId}::${stage}` -> activeChatId
  const [activeChatIds, setActiveChatIds] = useState({});

  // Mapping of `${workspaceId}::${stage}` -> Array<ChatSessionMetadata>
  const [sessionsByScope, setSessionsByScope] = useState({});

  // Mapping of `chatId` -> Array<ChatMessage>
  const [messagesByChatId, setMessagesByChatId] = useState({});

  // Comprehensive per-session state model: `chatId` -> SessionState
  // SessionState: { id, chatId, workspaceId, stage, title, status: 'idle' | 'generating' | 'error' | 'cancelled', isGenerating: boolean, activeRequestId: string | null, error: object | null, lastActivity: string }
  const [chatSessions, setChatSessions] = useState({});

  // Fast sending lookup: `chatId` -> boolean
  const [sendingByChat, setSendingByChat] = useState({});

  // Loading flags for metadata lists & messages
  const [loadingSessions, setLoadingSessions] = useState({});
  const [loadingMessages, setLoadingMessages] = useState({});

  // Ref tracking per-chat AbortControllers for independent cancellation
  const abortControllersRef = useRef(new Map());

  // Ref tracking in-flight request tokens to prevent duplicate double-sends on same chat
  const inFlightTokensRef = useRef(new Set());

  const getScopeKey = useCallback((workspaceId, stage) => {
    const wsId = workspaceId || currentWorkspace?.id || 'default';
    const stg = (stage || 'discovery').toLowerCase().trim();
    return `${wsId}::${stg}`;
  }, [currentWorkspace]);

  /**
   * Helper to ensure a chat session state entry exists in chatSessions map
   */
  const ensureSessionState = useCallback((session, stage = 'discovery', workspaceId = null) => {
    if (!session || !session.id) return;
    const chatId = session.id;
    setChatSessions(prev => {
      if (prev[chatId]) {
        return {
          ...prev,
          [chatId]: {
            ...prev[chatId],
            title: session.title || prev[chatId].title,
            lastMessageAt: session.lastMessageAt || prev[chatId].lastMessageAt,
            messageCount: session.messageCount ?? prev[chatId].messageCount
          }
        };
      }
      return {
        ...prev,
        [chatId]: {
          id: chatId,
          chatId,
          workspaceId: workspaceId || session.workspaceId,
          stage: stage || session.stage || 'discovery',
          title: session.title || 'New Chat',
          status: 'idle',
          isGenerating: false,
          activeRequestId: null,
          error: null,
          messageCount: session.messageCount || 0,
          createdAt: session.createdAt || new Date().toISOString(),
          lastMessageAt: session.lastMessageAt || session.createdAt || new Date().toISOString()
        }
      };
    });
  }, []);

  /**
   * Loads the list of chat sessions for a given workspace and stage.
   * Caches sessions for instant UI rendering; revalidates seamlessly in background.
   */
  const loadSessions = useCallback(async (workspaceId, stage = 'discovery', force = false) => {
    if (!workspaceId) return [];
    const scopeKey = getScopeKey(workspaceId, stage);

    // Fast memory return if already cached
    if (!force && sessionsByScope[scopeKey] && sessionsByScope[scopeKey].length > 0) {
      return sessionsByScope[scopeKey];
    }

    try {
      setLoadingSessions(prev => ({ ...prev, [scopeKey]: true }));
      const res = await api.getChatSessions(workspaceId, stage);
      const rawSessions = res?.sessions || [];
      const sessions = rawSessions.slice().sort((a, b) => 
        new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime()
      );

      setSessionsByScope(prev => ({
        ...prev,
        [scopeKey]: sessions
      }));

      // Initialize session states in chatSessions map
      sessions.forEach(s => ensureSessionState(s, stage, workspaceId));

      // Automatically select the most recent session if none is currently active for this scope
      if (sessions.length > 0 && !activeChatIds[scopeKey]) {
        setActiveChatIds(prev => ({
          ...prev,
          [scopeKey]: sessions[0].id
        }));
      }

      return sessions;
    } catch (err) {
      console.error(`Failed to load chat sessions for ${scopeKey}:`, err);
      return [];
    } finally {
      setLoadingSessions(prev => ({ ...prev, [scopeKey]: false }));
    }
  }, [getScopeKey, sessionsByScope, activeChatIds, ensureSessionState]);

  /**
   * Loads messages for a specific chat session.
   * Returns immediately if cached; updates cache on retrieval.
   */
  const loadMessages = useCallback(async (workspaceId, chatId, force = false) => {
    if (!workspaceId || !chatId) return [];

    if (!force && messagesByChatId[chatId]) {
      return messagesByChatId[chatId];
    }

    try {
      setLoadingMessages(prev => ({ ...prev, [chatId]: true }));
      const res = await api.getChatMessages(workspaceId, chatId);
      const session = res.session || {};
      const msgs = session.messages || [];

      setMessagesByChatId(prev => ({
        ...prev,
        [chatId]: msgs
      }));

      ensureSessionState(session, session.stage, workspaceId);

      return msgs;
    } catch (err) {
      console.error(`Failed to load messages for chat ${chatId}:`, err);
      return [];
    } finally {
      setLoadingMessages(prev => ({ ...prev, [chatId]: false }));
    }
  }, [messagesByChatId, ensureSessionState]);

  /**
   * Sets the active chat session for a workspace and stage.
   * Pure view-switch operation: NEVER cancels in-flight requests in other sessions!
   */
  const setActiveChat = useCallback((workspaceId, stage, chatId) => {
    const scopeKey = getScopeKey(workspaceId, stage);
    setActiveChatIds(prev => ({
      ...prev,
      [scopeKey]: chatId
    }));
  }, [getScopeKey]);

  /**
   * Creates a fresh chat session (+ New Chat) for the current workspace and stage.
   * Prepends the session to history and activates it immediately.
   */
  const createNewChat = useCallback(async (workspaceId, stage = 'discovery', title = null) => {
    if (!workspaceId) return null;
    const scopeKey = getScopeKey(workspaceId, stage);

    try {
      setLoadingSessions(prev => ({ ...prev, [scopeKey]: true }));
      const res = await api.createChatSession(workspaceId, stage, title);
      const newSession = res.session;

      if (!newSession) throw new Error('No session returned from create API');

      // Update sessions list (prepend new session and sort chronologically)
      setSessionsByScope(prev => {
        const existing = prev[scopeKey] || [];
        const newEntry = {
          id: newSession.id,
          title: newSession.title,
          stage: newSession.stage,
          createdAt: newSession.createdAt,
          updatedAt: newSession.updatedAt,
          lastMessageAt: newSession.lastMessageAt,
          messageCount: (newSession.messages || []).length
        };
        const updated = [newEntry, ...existing.filter(s => s.id !== newSession.id)];
        return {
          ...prev,
          [scopeKey]: updated.sort((a, b) => 
            new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime()
          )
        };
      });

      // Cache initial messages
      setMessagesByChatId(prev => ({
        ...prev,
        [newSession.id]: newSession.messages || []
      }));

      // Initialize session state
      ensureSessionState(newSession, stage, workspaceId);

      // Set as active session
      setActiveChatIds(prev => ({
        ...prev,
        [scopeKey]: newSession.id
      }));

      return newSession;
    } catch (err) {
      console.error('Failed to create new chat session:', err);
      throw err;
    } finally {
      setLoadingSessions(prev => ({ ...prev, [scopeKey]: false }));
    }
  }, [getScopeKey, ensureSessionState]);

  /**
   * Cancels the active generation of a specific chat session without affecting any other chats.
   */
  const cancelMessage = useCallback((chatId) => {
    if (!chatId) return;

    // Abort network request if active
    const controller = abortControllersRef.current.get(chatId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(chatId);
    }

    setSendingByChat(prev => ({ ...prev, [chatId]: false }));

    setChatSessions(prev => {
      const current = prev[chatId] || { id: chatId, chatId };
      return {
        ...prev,
        [chatId]: {
          ...current,
          status: 'cancelled',
          isGenerating: false,
          activeRequestId: null,
          error: null
        }
      };
    });

    // Mark temp optimistic message as cancelled
    setMessagesByChatId(prev => {
      const msgs = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: msgs.map(m => m.id?.startsWith('temp_') ? { ...m, isCancelled: true } : m)
      };
    });
  }, []);

  /**
   * Sends a message in a specific chat session.
   * Fully independent, concurrent, and isolated per chatId with unique requestId and AbortController.
   */
  const sendMessage = useCallback(async (workspaceId, stage, chatId, content, language = 'en', uiLanguage = null, detectedLanguage = null, inputType = 'text') => {
    if (!workspaceId || !chatId || !content?.trim()) return null;

    const trimmedContent = content.trim();

    // Prevent concurrent duplicate sends for same content & session
    const requestToken = `${chatId}::${trimmedContent}`;
    if (inFlightTokensRef.current.has(requestToken)) {
      console.warn(`[Chat] Duplicate send attempt in session ${chatId} ignored.`);
      return null;
    }
    inFlightTokensRef.current.add(requestToken);

    // Generate unique client request ID
    const clientRequestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const scopeKey = getScopeKey(workspaceId, stage);

    // Create a dedicated AbortController for this chat session
    const abortController = new AbortController();
    abortControllersRef.current.set(chatId, abortController);

    // Optimistically append user message and streaming assistant placeholder
    const tempUserMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: trimmedContent,
      clientRequestId,
      detectedLanguage,
      inputType,
      createdAt: new Date().toISOString()
    };

    const tempAssistantMsg = {
      id: `stream_${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString()
    };

    setMessagesByChatId(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), tempUserMsg, tempAssistantMsg]
    }));

    // Update session state to generating
    setSendingByChat(prev => ({ ...prev, [chatId]: true }));
    setChatSessions(prev => {
      const current = prev[chatId] || { id: chatId, chatId, workspaceId, stage };
      return {
        ...prev,
        [chatId]: {
          ...current,
          status: 'generating',
          isGenerating: true,
          activeRequestId: clientRequestId,
          error: null,
          lastActivity: new Date().toISOString()
        }
      };
    });

    try {
      const onChunk = ({ delta, text, structured }) => {
        setMessagesByChatId(prev => {
          const list = prev[chatId] || [];
          const updated = list.map(m => {
            if (m.id === tempAssistantMsg.id) {
              return {
                ...m,
                content: text || m.content,
                structured: structured || m.structured || null,
                isStreaming: true
              };
            }
            return m;
          });
          return {
            ...prev,
            [chatId]: updated
          };
        });
      };

      const res = await api.sendChatMessage(
        workspaceId,
        chatId,
        trimmedContent,
        clientRequestId,
        language,
        uiLanguage || language,
        detectedLanguage,
        inputType,
        { signal: abortController.signal, onChunk }
      );

      const serverUserMsg = res.userMessage;
      const assistantMsg = {
        ...res.assistantMessage,
        structured: res.structured || null,
        isStreaming: false
      };

      // Replace temp messages with confirmed server user message + assistant response
      setMessagesByChatId(prev => {
        const current = (prev[chatId] || []).filter(
          m => m.id !== tempUserMsg.id && m.id !== tempAssistantMsg.id
        );
        return {
          ...prev,
          [chatId]: [...current, serverUserMsg, assistantMsg]
        };
      });

      // Update session state to idle & completed
      setChatSessions(prev => {
        const current = prev[chatId] || { id: chatId, chatId };
        return {
          ...prev,
          [chatId]: {
            ...current,
            status: 'idle',
            isGenerating: false,
            activeRequestId: null,
            error: null,
            lastMessageAt: new Date().toISOString(),
            messageCount: (current.messageCount || 0) + 2
          }
        };
      });

      // Update session title and lastMessageAt in sessions list
      setSessionsByScope(prev => {
        const list = prev[scopeKey] || [];
        return {
          ...prev,
          [scopeKey]: list.map(s => {
            if (s.id === chatId) {
              return {
                ...s,
                lastMessageAt: new Date().toISOString(),
                messageCount: (s.messageCount || 0) + 2
              };
            }
            return s;
          }).sort((a, b) => 
            new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime()
          )
        };
      });

      return {
        userMessage: serverUserMsg,
        assistantMessage: assistantMsg,
        structured: res.structured,
        relevance: res.relevance,
        _perf: res._perf
      };
    } catch (err) {
      if (err?.name === 'AbortError') {
        console.log(`[Chat] Message generation in chat ${chatId} was cancelled by user.`);
        setChatSessions(prev => {
          const current = prev[chatId] || { id: chatId, chatId };
          return {
            ...prev,
            [chatId]: {
              ...current,
              status: 'cancelled',
              isGenerating: false,
              activeRequestId: null,
              error: null
            }
          };
        });
        setMessagesByChatId(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(m => {
            if (m.id === tempUserMsg.id) {
              return { ...m, isCancelled: true };
            }
            if (m.id === tempAssistantMsg.id) {
              return {
                ...m,
                isStreaming: false,
                isCancelled: true,
                content: m.content || 'Response generation stopped.'
              };
            }
            return m;
          })
        }));
        return null;
      }

      const errMsg = (err?.message || '').toLowerCase();
      let friendlyError = 'Unable to send your message. Please try again.';
      if (err?.status === 403 || errMsg.includes('read-only') || errMsg.includes('viewer') || errMsg.includes('denied') || errMsg.includes('permission')) {
        friendlyError = 'You have read-only access and cannot send messages.';
      } else if (err?.status === 401 || errMsg.includes('auth') || errMsg.includes('expired') || errMsg.includes('token') || errMsg.includes('unauthorized') || errMsg.includes('session')) {
        friendlyError = 'Your session has expired. Please sign in again.';
      } else if (errMsg.includes('network') || errMsg.includes('failed to fetch') || errMsg.includes('offline')) {
        friendlyError = 'Unable to connect to AI. Please check your network connection.';
      } else if (errMsg.includes('timeout') || errMsg.includes('504') || errMsg.includes('timed out')) {
        friendlyError = 'AI Consultant request timed out. Please retry.';
      }

      // Record error on chat session
      const errorObj = {
        message: friendlyError,
        rawError: err.message,
        lastQuery: trimmedContent
      };

      setChatSessions(prev => {
        const current = prev[chatId] || { id: chatId, chatId };
        return {
          ...prev,
          [chatId]: {
            ...current,
            status: 'error',
            isGenerating: false,
            activeRequestId: null,
            error: errorObj
          }
        };
      });

      // Preserve optimistic user message and any partial assistant content on failure
      setMessagesByChatId(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m => {
          if (m.id === tempUserMsg.id) {
            return {
              ...m,
              isFailed: true,
              errorMessage: friendlyError,
              rawError: err.message
            };
          }
          if (m.id === tempAssistantMsg.id) {
            return {
              ...m,
              isStreaming: false,
              isFailed: true,
              content: m.content ? `${m.content}\n\n*(Connection interrupted)*` : ''
            };
          }
          return m;
        }).filter(m => m.id !== tempAssistantMsg.id || m.content)
      }));

      throw err;
    } finally {
      inFlightTokensRef.current.delete(requestToken);
      abortControllersRef.current.delete(chatId);
      setSendingByChat(prev => ({ ...prev, [chatId]: false }));
    }
  }, [getScopeKey]);

  /**
   * Archives a chat session.
   */
  const archiveChat = useCallback(async (workspaceId, stage, chatId) => {
    if (!workspaceId || !chatId) return;
    const scopeKey = getScopeKey(workspaceId, stage);

    // Cancel any active generation first
    cancelMessage(chatId);

    try {
      await api.archiveChatSession(workspaceId, chatId);

      setSessionsByScope(prev => {
        const remaining = (prev[scopeKey] || []).filter(s => s.id !== chatId);
        return {
          ...prev,
          [scopeKey]: remaining
        };
      });

      setChatSessions(prev => {
        const copy = { ...prev };
        delete copy[chatId];
        return copy;
      });

      // If active session was deleted, select next available or null
      setActiveChatIds(prev => {
        if (prev[scopeKey] === chatId) {
          const remaining = (sessionsByScope[scopeKey] || []).filter(s => s.id !== chatId);
          return {
            ...prev,
            [scopeKey]: remaining.length > 0 ? remaining[0].id : null
          };
        }
        return prev;
      });
    } catch (err) {
      console.error(`Failed to archive chat ${chatId}:`, err);
      throw err;
    }
  }, [getScopeKey, sessionsByScope, cancelMessage]);

  return (
    <ChatContext.Provider
      value={{
        activeChatIds,
        sessionsByScope,
        messagesByChatId,
        chatSessions,
        sendingByChat,
        loadingSessions,
        loadingMessages,
        getScopeKey,
        loadSessions,
        loadMessages,
        setActiveChat,
        createNewChat,
        sendMessage,
        cancelMessage,
        archiveChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

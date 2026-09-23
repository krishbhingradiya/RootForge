import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useWorkspace } from './WorkspaceContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { currentWorkspace } = useWorkspace();

  // Mapping of `${workspaceId}_${stage}` -> activeChatId
  const [activeChatIds, setActiveChatIds] = useState({});

  // Mapping of `${workspaceId}_${stage}` -> Array<ChatSessionMetadata>
  const [sessionsByScope, setSessionsByScope] = useState({});

  // Mapping of `chatId` -> Array<ChatMessage>
  const [messagesByChatId, setMessagesByChatId] = useState({});

  // Loading states
  const [loadingSessions, setLoadingSessions] = useState({});
  const [loadingMessages, setLoadingMessages] = useState({});
  const [sendingByChat, setSendingByChat] = useState({});

  // Ref tracking in-flight client requests to prevent accidental duplicate sends
  const inFlightRequests = useRef(new Set());

  const getScopeKey = useCallback((workspaceId, stage) => {
    const wsId = workspaceId || currentWorkspace?.id || 'default';
    const stg = (stage || 'discovery').toLowerCase().trim();
    return `${wsId}::${stg}`;
  }, [currentWorkspace]);

  /**
   * Loads the list of chat sessions for a given workspace and stage.
   * Uses cached sessions if available for instant display; revalidates in background.
   */
  const loadSessions = useCallback(async (workspaceId, stage = 'discovery', force = false) => {
    if (!workspaceId) return [];
    const scopeKey = getScopeKey(workspaceId, stage);

    // Fast memory return if cached
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

      // Automatically select the most recent session if none is currently active
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
  }, [getScopeKey, sessionsByScope, activeChatIds]);

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

      return msgs;
    } catch (err) {
      console.error(`Failed to load messages for chat ${chatId}:`, err);
      return [];
    } finally {
      setLoadingMessages(prev => ({ ...prev, [chatId]: false }));
    }
  }, [messagesByChatId]);

  /**
   * Sets the active chat session for a workspace and stage.
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
   * Prepends the session to history and makes it active immediately.
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

      // Cache the initial messages
      setMessagesByChatId(prev => ({
        ...prev,
        [newSession.id]: newSession.messages || []
      }));

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
  }, [getScopeKey]);

  /**
   * Sends a message in a specific chat session with idempotency tokens and duplicate protection.
   */
  const sendMessage = useCallback(async (workspaceId, stage, chatId, content, language = 'en', uiLanguage = null) => {
    if (!workspaceId || !chatId || !content?.trim()) return null;

    // Prevent concurrent duplicate sends for same content & session
    const requestToken = `${chatId}::${content.trim()}`;
    if (inFlightRequests.current.has(requestToken)) {
      console.warn('Duplicate send attempt ignored.');
      return null;
    }
    inFlightRequests.current.add(requestToken);

    const clientRequestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const scopeKey = getScopeKey(workspaceId, stage);

    // Optimistically append user message
    const tempUserMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      clientRequestId,
      createdAt: new Date().toISOString()
    };

    setMessagesByChatId(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), tempUserMsg]
    }));

    setSendingByChat(prev => ({ ...prev, [chatId]: true }));

    try {
      const res = await api.sendChatMessage(workspaceId, chatId, content.trim(), clientRequestId, language, uiLanguage || language);

      const serverUserMsg = res.userMessage;
      const assistantMsg = {
        ...res.assistantMessage,
        structured: res.structured || null
      };

      // Replace temp message with confirmed server user message + assistant response
      setMessagesByChatId(prev => {
        const current = (prev[chatId] || []).filter(m => m.id !== tempUserMsg.id);
        return {
          ...prev,
          [chatId]: [...current, serverUserMsg, assistantMsg]
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
                messageCount: s.messageCount + 2
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
      // Preserve optimistic user message on failure so the user does not lose their typed message
      setMessagesByChatId(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m => m.id === tempUserMsg.id ? { ...m, isFailed: true } : m)
      }));
      throw err;
    } finally {
      inFlightRequests.current.delete(requestToken);
      setSendingByChat(prev => ({ ...prev, [chatId]: false }));
    }
  }, [getScopeKey]);

  /**
   * Archives a chat session.
   */
  const archiveChat = useCallback(async (workspaceId, stage, chatId) => {
    if (!workspaceId || !chatId) return;
    const scopeKey = getScopeKey(workspaceId, stage);

    try {
      await api.archiveChatSession(workspaceId, chatId);

      setSessionsByScope(prev => {
        const remaining = (prev[scopeKey] || []).filter(s => s.id !== chatId);
        return {
          ...prev,
          [scopeKey]: remaining
        };
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
  }, [getScopeKey, sessionsByScope]);

  return (
    <ChatContext.Provider
      value={{
        activeChatIds,
        sessionsByScope,
        messagesByChatId,
        loadingSessions,
        loadingMessages,
        sendingByChat,
        getScopeKey,
        loadSessions,
        loadMessages,
        setActiveChat,
        createNewChat,
        sendMessage,
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

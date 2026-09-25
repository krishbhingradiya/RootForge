import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useChat } from '../../context/ChatContext';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Clock,
  ChevronDown,
  History,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  Square
} from 'lucide-react';
import { AssistantWelcomeCard } from './AssistantWelcomeCard';
import { isInitialWelcomeMessage, renderFormattedText } from './chatTextFormatter';
import { StructuredConsultantCard } from './StructuredConsultantCard';
import { useChatTranslation } from '../../hooks/useChatTranslation';
import { ChatVoiceInput, ChatMessageSpeaker, speechManager } from './ChatVoiceControl';
import {
  LANGUAGE_OPTIONS,
  LANGUAGE_DISPLAY_MAP,
  resolveConversationalLanguage
} from '../../utils/languageDetector';

function formatRelativeDate(dateString, t) {
  if (!dateString) return t ? (t('chat.justNow') || 'Just now') : 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t ? (t('chat.justNow') || 'Just now') : 'Just now';
  if (diffMins < 60) return `${diffMins}${t ? (t('chat.minutesAgo') || 'm ago') : 'm ago'}`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}${t ? (t('chat.hoursAgo') || 'h ago') : 'h ago'}`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return t ? (t('chat.yesterday') || 'Yesterday') : 'Yesterday';
  if (diffDays < 7) return `${diffDays}${t ? (t('chat.daysAgo') || 'd ago') : 'd ago'}`;
  return date.toLocaleDateString();
}

export const AiConsultantDrawer = ({ isOpen, onClose }) => {
  const { currentWorkspace, workspaces } = useWorkspace();
  const { t, lang } = useLanguage();
  const location = useLocation();
  const scrollRef = useRef(null);

  const {
    sessionsByScope,
    activeChatIds,
    messagesByChatId,
    chatSessions,
    sendingByChat,
    loadSessions,
    loadMessages,
    setActiveChat,
    createNewChat,
    sendMessage,
    cancelMessage,
    getScopeKey
  } = useChat();

  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('auto'); // 'auto' | 11 language codes
  const [detectedVoiceLanguage, setDetectedVoiceLanguage] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Derive active stage from route pathname
  const getStageFromPath = (pathname) => {
    if (!pathname) return 'overview';
    if (pathname.includes('/analysis')) return 'analysis';
    if (pathname.includes('/solution')) return 'solution';
    if (pathname.includes('/architecture')) return 'architecture';
    if (pathname.includes('/process')) return 'process';
    if (pathname.includes('/ux')) return 'ux';
    if (pathname.includes('/database')) return 'database';
    if (pathname.includes('/planning')) return 'planning';
    if (pathname.includes('/discovery')) return 'discovery';
    return 'overview';
  };

  const currentStage = getStageFromPath(location.pathname);
  const effectiveWorkspace = currentWorkspace || (workspaces && workspaces[0]) || null;
  const wsId = effectiveWorkspace?.id;
  const scopeKey = getScopeKey(wsId, currentStage);

  const sessions = sessionsByScope[scopeKey] || [];
  const activeChatId = activeChatIds[scopeKey] || (sessions[0]?.id) || null;
  const messages = (activeChatId && messagesByChatId[activeChatId]) || [];

  // Active session-specific state
  const activeSessionState = (activeChatId && chatSessions[activeChatId]) || {};
  const isCurrentGenerating = Boolean(activeSessionState.isGenerating || (activeChatId && sendingByChat[activeChatId]));
  const error = activeSessionState.error || localError;

  // Presentation translation layer
  const { translating, getTranslatedContent, getTranslatedStructured } = useChatTranslation(wsId, messages, lang);

  // Load stage-scoped sessions when drawer is open
  useEffect(() => {
    let isMounted = true;
    if (isOpen && wsId) {
      if (!sessions || sessions.length === 0) {
        setInitialLoading(true);
      }
      setLocalError(null);
      loadSessions(wsId, currentStage)
        .then((loadedSessions) => {
          if (!isMounted) return;
          const targetId = activeChatId || (loadedSessions && loadedSessions[0]?.id);
          if (targetId) {
            return loadMessages(wsId, targetId);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn('Could not load AI Copilot sessions:', err);
            setLocalError({ message: 'Unable to connect to AI' });
          }
        })
        .finally(() => {
          if (isMounted) {
            setInitialLoading(false);
          }
        });
    } else {
      setInitialLoading(false);
    }
    return () => {
      isMounted = false;
      speechManager.stop();
    };
  }, [isOpen, wsId, currentStage]);

  // Scroll to bottom on new messages or generation change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isCurrentGenerating]);

  // Handle back button (Android hardware back via nativeService + Esc key) & native close event
  useEffect(() => {
    if (!isOpen) return;
    const handleCloseDrawer = () => onClose();
    window.addEventListener('rootforge:close-drawer', handleCloseDrawer);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('rootforge:close-drawer', handleCloseDrawer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset local error when switching stage or chat
  useEffect(() => {
    setLocalError(null);
  }, [currentStage, activeChatId]);

  // Conditional return ONLY AFTER all hooks are called
  if (!isOpen) return null;

  const quickPrompts = [
    t('What are the primary operational risks in this solution?'),
    t('How should we structure the API Gateway for scalability?'),
    t('What automation opportunities offer the quickest ROI?'),
    t('How do we handle human-in-the-loop exception fallbacks?')
  ];

  const handleCreateNewChat = async () => {
    if (!wsId || creatingChat) return;
    speechManager.stop();
    try {
      setCreatingChat(true);
      setLocalError(null);
      const newSession = await createNewChat(wsId, currentStage);
      if (newSession) {
        await loadMessages(wsId, newSession.id);
      }
      setShowHistory(false);
    } catch (err) {
      console.error('Failed to create new chat in drawer:', err);
      setLocalError({ message: err.message || 'Failed to create new chat session' });
    } finally {
      setCreatingChat(false);
    }
  };

  const handleSelectSession = (chatId) => {
    if (!wsId || chatId === activeChatId) return;
    speechManager.stop();
    setLocalError(null);
    setActiveChat(wsId, currentStage, chatId);
    loadMessages(wsId, chatId);
    setShowHistory(false);
  };

  const handleSend = (textToSend = null, messageLanguage = null, forcedDetectedLang = null, inputType = 'text') => {
    const query = textToSend || input;
    if (!query || !query.trim() || isCurrentGenerating || !wsId) return;

    const chosenLang = messageLanguage || selectedLanguage;
    const effectiveLang = chosenLang === 'auto' ? null : chosenLang;
    const detectedLang = forcedDetectedLang || resolveConversationalLanguage(query.trim(), effectiveLang || lang);

    setInput('');
    setDetectedVoiceLanguage(null);
    setLocalError(null);

    // Asynchronous dispatch: does NOT block UI or other chats!
    (async () => {
      try {
        let chatId = activeChatId;
        if (!chatId) {
          const newSession = await createNewChat(wsId, currentStage);
          chatId = newSession?.id;
        }

        if (chatId) {
          await sendMessage(
            wsId,
            currentStage,
            chatId,
            query.trim(),
            effectiveLang || 'auto',
            lang,
            detectedLang,
            inputType
          );
        }
      } catch (err) {
        console.error('AI Consultant send background notification:', err.message);
      }
    })();
  };

  const activeSessionObj = sessions.find(s => s.id === activeChatId);

  return (
    <>
      <div className="ai-consultant-backdrop" onClick={onClose} />
      <div
        className="ai-consultant-drawer"
        role="dialog"
        aria-label="AI Business Consultant"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 460,
          maxWidth: '100vw',
          height: '100dvh',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 200,
          isolation: 'isolate'
        }}
      >
      {/* Structured AI Business Consultant Header */}
      <div className="ai-chat-header">
        {/* ROW 1: [← Back] [AI Icon] AI Business Consultant [× Close] */}
        <div className="ai-chat-header-row-1">
          <div className="ai-chat-header-title-group">
            <button
              type="button"
              onClick={onClose}
              className="ai-chat-back-btn"
              aria-label="Back"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="ai-chat-icon-container">
              <Sparkles size={20} color="#FFFFFF" />
            </div>
            <h1 className="ai-chat-title-text">
              {t.aiConsultant?.title || 'AI Business Consultant'}
            </h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ai-chat-close-btn"
            aria-label="Close"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ROW 2: Autonomous Consultant Subtitle */}
        <div className="ai-chat-header-row-2">
          <div className="ai-chat-subtitle-text">
            {activeSessionObj?.title || 'Autonomous Consultant'}
          </div>
        </div>

        {/* ROW 3: [✦ OVERVIEW] [⋮ 0 ˅] [+ New Chat] */}
        <div className="ai-chat-header-row-3">
          <div className="ai-chat-controls-left">
            {/* Status Pill */}
            <span className="ai-chat-stage-pill" title={`Stage: ${currentStage}`}>
              <Sparkles size={11} />
              <span>{currentStage}</span>
            </span>

            {/* Conversation Selector */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="ai-chat-session-selector"
                title={t('chat.history') || 'Chat Sessions'}
                aria-label="Chat Sessions Menu"
                aria-expanded={showHistory}
              >
                <MoreVertical size={14} color="var(--accent-amber)" />
                <span>{sessions.length}</span>
                <ChevronDown size={12} />
              </button>

              {showHistory && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: 260,
                    maxWidth: 'calc(100vw - 32px)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-xl)',
                    zIndex: 250,
                    padding: '6px 0',
                    maxHeight: 280,
                    overflowY: 'auto'
                  }}
                >
                  <div style={{ padding: '6px 12px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {t('chat.sessions') || 'Chat Sessions'} ({currentStage})
                  </div>
                  {sessions
                    .slice()
                    .sort((a, b) => new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime())
                    .map((s) => {
                      const isActive = s.id === activeChatId;
                      const sState = chatSessions[s.id] || {};
                      const isSessionGenerating = Boolean(sState.isGenerating || sendingByChat[s.id]);
                      const isSessionError = Boolean(sState.status === 'error');
                      const count = s.messageCount || 0;
                      const messageLabel = count === 1 ? (1 + ' ' + (t('chat.messageCountSingle') || 'message')) : (count + ' ' + (t('chat.messagesCount') || 'messages'));
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSession(s.id)}
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 6,
                            cursor: 'pointer',
                            backgroundColor: isActive ? 'var(--accent-amber-light)' : 'transparent',
                            borderLeft: isActive ? '3px solid var(--accent-amber)' : '3px solid transparent'
                          }}
                          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? 'var(--accent-amber-text)' : 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {s.title}
                              </span>
                              {isSessionGenerating && (
                                <span style={{
                                  fontSize: '0.6rem',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  backgroundColor: 'rgba(217, 119, 6, 0.15)',
                                  color: 'var(--accent-amber)',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'var(--accent-amber)', animation: 'pulse 1s infinite' }} />
                                  Thinking...
                                </span>
                              )}
                              {isSessionError && (
                                <span style={{
                                  fontSize: '0.6rem',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: '#EF4444',
                                  fontWeight: 700
                                }}>
                                  Error
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>
                              {formatRelativeDate(s.lastMessageAt || s.createdAt, t)} • {messageLabel}
                            </div>
                          </div>
                          {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent-amber)' }} />}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* + New Chat Button */}
          <button
            type="button"
            onClick={handleCreateNewChat}
            disabled={creatingChat}
            className="ai-chat-new-btn"
            title={t('chat.newChat') || 'Start new conversation'}
            aria-label={t('chat.newChat') || 'Start new conversation'}
          >
            <Plus size={15} />
            <span>{creatingChat ? (t('chat.creating') || 'Creating...') : (t('chat.newChat') || 'New Chat')}</span>
          </button>
        </div>
      </div>

      {/* Body Content */}
      {initialLoading ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
            textAlign: 'center',
            gap: 16
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sparkles size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Loading AI Copilot...
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Preparing autonomous architecture context
            </p>
          </div>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2.5px solid rgba(217, 119, 6, 0.2)',
              borderTopColor: 'var(--accent-amber)',
              animation: 'spin 0.8s linear infinite'
            }}
          />
        </div>
      ) : error && messages.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
            textAlign: 'center',
            gap: 16
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Unable to connect to AI
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Please try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setInitialLoading(true);
              loadSessions(wsId, currentStage, true)
                .then(s => {
                  if (s && s[0]?.id) return loadMessages(wsId, s[0].id, true);
                })
                .catch(() => setError({ message: 'Unable to connect to AI' }))
                .finally(() => setInitialLoading(false));
            }}
            className="btn btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <>
          {/* Recommended Inquiries Horizontal Scroll */}
          <div className="ai-inquiries-container">
            <div className="ai-inquiries-title">
              {t.aiConsultant?.quickPromptsTitle || 'Recommended for you'}
            </div>
            <div className="ai-inquiries-scroll">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(qp)}
                  className="ai-inquiry-chip"
                >
                  <Sparkles size={11} color="var(--accent-amber)" />
                  <span>{qp}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={scrollRef}
            className="ai-messages-container"
          >
            {translating && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                borderRadius: 6,
                fontSize: '0.72rem',
                color: 'var(--accent-amber-text, #B45309)',
                alignSelf: 'center'
              }}>
                <Sparkles size={12} className="animate-spin" color="var(--accent-amber)" />
                <span>{t('chat.translating') || 'Translating conversation...'}</span>
              </div>
            )}
            {!messages.some(m => m.role === 'user') ? (
              <AssistantWelcomeCard
                stage={currentStage}
                workspace={currentWorkspace}
                documentCount={currentWorkspace?.documentsCount ?? currentWorkspace?.documents?.length}
                onSelectPrompt={(chipText) => handleSend(chipText)}
                compact={true}
              />
            ) : (
              messages
                .filter((m, idx) => !(idx === 0 && m.role === 'assistant' && isInitialWelcomeMessage(m)))
                .map((m, idx) => {
                  const translatedContent = getTranslatedContent(m);
                  const structuredData = m.role === 'assistant' ? getTranslatedStructured(m) : null;

                  if (m.role === 'user') {
                    return (
                      <div
                        key={m.id || idx}
                        className="ai-message-row ai-message-row-user"
                      >
                        <div className="ai-user-bubble">
                          <div className="ai-user-bubble-content">
                            {m.content}
                          </div>
                          <div className="ai-user-bubble-footer">
                            <span>{formatRelativeDate(m.createdAt, t)}</span>
                          </div>
                          {m.isFailed && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#FEE2E2', fontSize: '0.72rem' }}>
                              <AlertCircle size={12} color="#FCA5A5" />
                              <span>{t('chat.failedToSend') || 'Failed to send'}</span>
                              <button
                                type="button"
                                onClick={() => handleSend(m.content)}
                                style={{
                                  background: 'rgba(255,255,255,0.25)',
                                  border: 'none',
                                  borderRadius: 4,
                                  color: '#FFFFFF',
                                  padding: '2px 8px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                {t('common.retry') || 'Retry'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Assistant message
                  const hasStructuredFindings = structuredData && (
                    (Array.isArray(structuredData.confirmedFacts) && structuredData.confirmedFacts.length > 0) ||
                    (Array.isArray(structuredData.recommendations) && structuredData.recommendations.length > 0) ||
                    (Array.isArray(structuredData.inferences) && structuredData.inferences.length > 0) ||
                    (Array.isArray(structuredData.requirements) && structuredData.requirements.length > 0) ||
                    (Array.isArray(structuredData.openQuestions) && structuredData.openQuestions.length > 0) ||
                    (Array.isArray(structuredData.sources) && structuredData.sources.length > 0)
                  );

                  return (
                    <div
                      key={m.id || idx}
                      className="ai-message-row ai-message-row-assistant"
                    >
                      {hasStructuredFindings ? (
                        <div style={{ maxWidth: '92%', width: '100%' }}>
                          <StructuredConsultantCard
                            messageId={`drawer_msg_${m.id || idx}`}
                            data={structuredData}
                            compact={true}
                            lang={lang}
                          />
                        </div>
                      ) : (
                        <div className="ai-assistant-card">
                          <div className="ai-assistant-header">
                            <div className="ai-assistant-header-left">
                              <div className="ai-assistant-icon-badge">
                                <Sparkles size={13} color="#FFFFFF" />
                              </div>
                              <span className="ai-assistant-title">
                                {t.aiConsultant?.title || 'AI Business Consultant'}
                              </span>
                              {structuredData?.status && (
                                <span
                                  className="ai-assistant-status-pill"
                                  style={{
                                    backgroundColor: structuredData.status === 'CONFIRMED' ? '#ECFDF5' : '#FEF3C7',
                                    color: structuredData.status === 'CONFIRMED' ? '#059669' : '#D97706'
                                  }}
                                >
                                  {structuredData.status}
                                </span>
                              )}
                            </div>
                            <div className="ai-assistant-header-right">
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                {formatRelativeDate(m.createdAt, t)}
                              </span>
                              <ChatMessageSpeaker text={translatedContent || structuredData?.summary || ''} lang={lang} />
                            </div>
                          </div>
                          <div className="ai-assistant-body">
                            {renderFormattedText(translatedContent || structuredData?.summary || '')}
                          </div>
                          {(structuredData?.suggestedNextAction || m.suggestedAction) && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  backgroundColor: 'rgba(217, 119, 6, 0.1)',
                                  color: 'var(--accent-amber-text)',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Sparkles size={11} color="var(--accent-amber)" />
                                {structuredData?.suggestedNextAction || m.suggestedAction}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
            {isCurrentGenerating && (
              <div className="ai-message-row ai-message-row-assistant">
                <div className="ai-thinking-indicator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="ai-thinking-icon">
                      <Sparkles size={14} color="var(--accent-amber)" />
                    </div>
                    <span className="ai-thinking-text">
                      AI Business Consultant is thinking
                    </span>
                    <span className="ai-thinking-dots">
                      <span className="dot dot-1" />
                      <span className="dot dot-2" />
                      <span className="dot dot-3" />
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelMessage(activeChatId)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      borderRadius: 4,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#EF4444',
                      cursor: 'pointer'
                    }}
                    title="Stop generating"
                  >
                    <Square size={10} fill="currentColor" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Input bar */}
      {/* Bottom Chat Composer */}
      <div className="ai-composer-container">
        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EF4444', fontSize: '0.78rem' }}>
              <AlertCircle size={15} />
              <span>{error.message || 'Unable to connect to AI'}</span>
            </div>
            {error.lastQuery && (
              <button
                type="button"
                onClick={() => {
                  const q = error.lastQuery;
                  setLocalError(null);
                  handleSend(q);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '3px 8px', height: 'auto', minHeight: 28 }}
              >
                Retry
              </button>
            )}
          </div>
        )}
        {/* Language Override Selector & Dynamic Detection Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Language:
            </span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={isCurrentGenerating}
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                outline: 'none'
              }}
              title="Select response language or use Auto Detect"
              aria-label="Language Mode Selector"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.flag} {opt.label} {opt.native !== opt.label ? `(${opt.native})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Dynamic Language Detection Badge */}
          {input.trim() && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'rgba(217, 119, 6, 0.12)',
                color: 'var(--accent-amber-text, #D97706)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Sparkles size={10} color="var(--accent-amber)" />
              <span>
                {selectedLanguage !== 'auto'
                  ? `Forced: ${LANGUAGE_DISPLAY_MAP[selectedLanguage] || selectedLanguage}`
                  : `Detected: ${LANGUAGE_DISPLAY_MAP[detectedVoiceLanguage || resolveConversationalLanguage(input, lang)] || 'English'}`}
              </span>
            </span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="ai-composer-form"
        >
          {/* Quick New Chat [+] Button */}
          <button
            type="button"
            onClick={handleCreateNewChat}
            disabled={creatingChat}
            className="ai-composer-plus-btn"
            title={t('chat.newChat') || 'New Conversation'}
            aria-label="New Conversation"
          >
            <Plus size={18} />
          </button>
          <input
            type="text"
            placeholder={t('chat.placeholder') || t.aiConsultant?.placeholder || 'Ask the AI Consultant...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isCurrentGenerating}
            className="ai-composer-input"
            aria-label="Ask the AI Consultant"
          />
          <ChatVoiceInput
            lang={selectedLanguage === 'auto' ? 'auto' : selectedLanguage}
            workspaceId={wsId}
            sessionId={activeChatId}
            onInterimPreview={(previewText) => {
              setInput(previewText);
            }}
            onFinalTranscript={(finalSpokenText, detectedLang) => {
              setInput(finalSpokenText);
              if (detectedLang && selectedLanguage === 'auto') {
                setDetectedVoiceLanguage(detectedLang);
              }
            }}
            disabled={isCurrentGenerating}
          />
          {isCurrentGenerating ? (
            <button
              type="button"
              onClick={() => cancelMessage(activeChatId)}
              className="ai-composer-send-btn"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              title="Stop generating"
              aria-label="Stop generating"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="ai-composer-send-btn"
              title={t('chat.send') || t.aiConsultant?.send || 'Send'}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          )}
        </form>
      </div>
    </div>
    </>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import {
  Sparkles,
  Send,
  Bot,
  User,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Building2,
  FileSearch,
  MessageSquarePlus,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Plus,
  Loader2
} from 'lucide-react';
import { AssistantWelcomeCard } from '../../components/ai/AssistantWelcomeCard';
import { isInitialWelcomeMessage, renderFormattedText } from '../../components/ai/chatTextFormatter';
import { StructuredConsultantCard } from '../../components/ai/StructuredConsultantCard';
import { useChatTranslation } from '../../hooks/useChatTranslation';
import { ChatVoiceInput, ChatMessageSpeaker, speechManager } from '../../components/ai/ChatVoiceControl';

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


export const DiscoveryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();

  const [workspace, setWorkspace] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const chatBottomRef = useRef(null);

  // Presentation translation layer
  const { translating, getTranslatedContent, getTranslatedStructured } = useChatTranslation(id, messages, lang);

  // Load initial discovery state or load when workspace ID changes
  const loadDiscovery = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      // Clear previous messages immediately on workspace change (Zero Leakage)
      setMessages([]);
      setSessions([]);
      setActiveChatId(null);

      const res = await api.getDiscovery(id);

      setWorkspace(res.workspace);
      const sortedSessions = (res.sessions || []).slice().sort((a, b) => 
        new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime()
      );
      setSessions(sortedSessions);
      if (res.conversation) {
        setActiveChatId(res.conversation.id);
        setMessages(res.conversation.messages || []);
      } else if (sortedSessions.length > 0) {
        setActiveChatId(sortedSessions[0].id);
        const msgsRes = await api.getChatMessages(id, sortedSessions[0].id);
        if (msgsRes.session) {
          setMessages(msgsRes.session.messages || []);
        }
      }
      setSuggestedQuestions(res.suggestedQuestions || []);
    } catch (err) {
      console.error('Failed to load discovery session:', err);
      setError(err.message || 'Error loading discovery conversation');
      showToast(err.message || 'Error loading discovery conversation', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDiscovery();
    return () => {
      speechManager.stop();
    };
  }, [loadDiscovery]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Handle switching to another existing chat session
  const handleSelectSession = async (chatId) => {
    if (chatId === activeChatId || loadingMessages) return;
    speechManager.stop();
    try {
      setLoadingMessages(true);
      setActiveChatId(chatId);
      const res = await api.getChatMessages(id, chatId);
      if (res.session) {
        setMessages(res.session.messages || []);
      }
    } catch (err) {
      showToast('Failed to switch chat session', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Handle creating a fresh chat session (+ New Chat)
  const handleCreateNewChat = async () => {
    if (creatingChat) return;
    speechManager.stop();
    try {
      setCreatingChat(true);
      const res = await api.createChatSession(id, 'discovery');
      const newSession = res.session;
      if (newSession) {
        setActiveChatId(newSession.id);
        setMessages(newSession.messages || []);
        setSessions(prev => {
          const newEntry = {
            id: newSession.id,
            title: newSession.title,
            stage: 'discovery',
            createdAt: newSession.createdAt,
            lastMessageAt: newSession.lastMessageAt,
            messageCount: (newSession.messages || []).length
          };
          const updated = [newEntry, ...prev.filter(s => s.id !== newSession.id)];
          return updated.sort((a, b) => 
            new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime()
          );
        });
        showToast('New Discovery session started', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to start new chat', 'error');
    } finally {
      setCreatingChat(false);
    }
  };

  const handleSendMessage = async (customText, messageLanguage = null) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || sending) return;

    const effectiveLang = messageLanguage || lang;

    const optimisticUserMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      setSending(true);
      setInput('');
      setMessages((prev) => [...prev, optimisticUserMsg]);

      // Send to active chat session
      const clientRequestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const res = await api.sendDiscoveryMessage(id, textToSend.trim(), activeChatId, clientRequestId, effectiveLang, lang);

      setMessages((prev) => {
        const withoutTemp = prev.filter(m => m.id !== optimisticUserMsg.id);
        return [...withoutTemp, res.userMessage, res.assistantMessage];
      });

      // Update session title and lastMessageAt in sessions list
      const resolvedChatId = activeChatId || res.userMessage?.conversationId;
      if (resolvedChatId && !activeChatId) {
        setActiveChatId(resolvedChatId);
      }

      setSessions(prev => {
        const targetId = resolvedChatId || activeChatId;
        const exists = prev.some(s => s.id === targetId);
        if (!exists && targetId) {
          const newEntry = {
            id: targetId,
            title: res.sessionTitle || textToSend.slice(0, 32),
            stage: 'discovery',
            createdAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            messageCount: 2
          };
          return [newEntry, ...prev];
        }
        return prev.map(s => {
          if (s.id === targetId) {
            return {
              ...s,
              title: res.sessionTitle || s.title,
              lastMessageAt: new Date().toISOString(),
              messageCount: (s.messageCount || 0) + 2
            };
          }
          return s;
        }).sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
      });
    } catch (err) {
      setMessages((prev) => prev.filter(m => m.id !== optimisticUserMsg.id));
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleAdvanceToAnalysis = () => {
    navigate(`/app/workspaces/${id}/analysis`);
  };

  const defaultQuestions = [
    {
      question: `What is the single most critical operational bottleneck affecting ${workspace?.name || 'this initiative'} today?`,
      category: 'Problem Definition',
      rationale: 'Pinpoints the primary source of latency, manual cost overhead, or customer friction.'
    },
    {
      question: 'Who are the primary end users and departmental stakeholders interacting with this workflow?',
      category: 'Stakeholders',
      rationale: 'Establishes stakeholder personas and organizational change hurdles.'
    },
    {
      question: 'What existing enterprise core systems or databases must this solution integrate with?',
      category: 'Technical Constraints',
      rationale: 'Surfaces API readiness, perimeter security, and data pipeline requirements.'
    },
    {
      question: 'Which specific decision gates or compliance checks currently demand manual supervisor sign-off?',
      category: 'Process Intelligence',
      rationale: 'Separates deterministic approval rules from candidate AI assistive automations.'
    },
    {
      question: 'What measurable target metrics (SLA reduction, labor savings, error rate) will validate business ROI?',
      category: 'Business Value',
      rationale: 'Frames quantifiable ROI justification for executive transformation sign-off.'
    }
  ];

  const questionsToDisplay = (suggestedQuestions && suggestedQuestions.length > 0) ? suggestedQuestions : defaultQuestions;

  if (loading && !workspace) {
    return (
      <div className="ai-thinking-scene">
        <div className="ai-thinking-orb-container">
          <div className="ai-thinking-halo" />
          <div className="ai-thinking-ring-outer" />
          <div className="ai-thinking-ring-inner" />
          <div className="ai-thinking-core">
            <Bot size={26} color="var(--accent-amber)" />
          </div>
        </div>

        <div className="ai-thinking-text-wrap">
          <div className="ai-thinking-heading">
            <span>{t('discovery.aiConsultant') || 'AI Business Consultant'} is thinking</span>
            <span className="ai-thinking-wave-dots">
              <span />
              <span />
              <span />
            </span>
          </div>
          <div className="ai-thinking-subtext">
            {t('discovery.loadingSubtitle') || 'Analyzing project context & structuring discovery session'}
          </div>
        </div>
      </div>
    );
  }

  if (error && !workspace) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 160px)', padding: 24 }}>
        <div className="card" style={{ maxWidth: 500, width: '100%', padding: '36px 30px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#EF4444' }}>
            <HelpCircle size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            {t('discovery.errorTitle') || 'Unable to Open Discovery Section'}
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => loadDiscovery()}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Sparkles size={16} />
              {t('common.tryAgain') || 'Try Again'}
            </button>
            <button
              onClick={() => navigate('/app/workspaces')}
              className="btn btn-secondary"
            >
              {t('common.back') || 'Return to Workspaces'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="discovery-layout">
      {/* Left Column: Business Context & Discovery Prompts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Context Card */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.discovery?.projectContext || 'PROJECT CONTEXT'}
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 4, marginBottom: 8 }}>
            {(workspace?.id === 'ws-demo-customer-support' || workspace?.isDemo) && (lang === 'hi' || lang === 'gu')
              ? (t.overview?.customerSupportTitle || workspace?.name)
              : (workspace?.name || 'Initiative')}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {(workspace?.id === 'ws-demo-customer-support' || workspace?.isDemo) && (lang === 'hi' || lang === 'gu')
              ? (t.overview?.customerSupportDesc || workspace?.objective)
              : workspace?.objective}
          </p>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div>{t.discovery?.industry || 'Industry:'} <strong>{(workspace?.id === 'ws-demo-customer-support' || workspace?.isDemo) && (lang === 'hi' || lang === 'gu') ? t.overview?.industry : workspace?.industry}</strong></div>
            <div style={{ marginTop: 4 }}>Documents: <strong>{workspace?.documentsCount || 0} {t.discovery?.documentsIndexed || 'indexed'}</strong></div>
          </div>
        </div>

        {/* Discovery Prompts Guidance */}
        <div className="card" style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <HelpCircle size={16} color="var(--accent-amber)" />
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.discovery?.inquiriesTitle || 'Discovery Inquiries'}
            </h4>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            {t.discovery?.inquiriesDesc || 'Click any question to ask your AI Consultant and record constraints in this workspace:'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
            {questionsToDisplay.map((q, idx) => {
              const qText = typeof q === 'string' ? q : (q?.question || q?.text || '');
              const qCat = typeof q === 'object' ? (q?.category || 'Discovery') : 'Discovery';
              const qRationale = typeof q === 'object' ? (q?.whyItMatters || q?.rationale || '') : '';
              const qStatus = typeof q === 'object' ? q?.status : null;
              if (!qText) return null;

              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qText)}
                  disabled={sending}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.35
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-amber)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                      {qCat}
                    </span>
                    {qStatus && (
                      <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4, backgroundColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                        {qStatus}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600 }}>{qText}</div>
                  {qRationale && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {qRationale}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={handleAdvanceToAnalysis}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <FileSearch size={16} />
              {t.discovery?.continueToAnalysis || 'Continue to Business Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Chat Stream */}
      <div className="card discovery-chat-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Chat Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: '#1E232D',
            color: '#FAF8F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  {t.discovery?.aiConsultant || 'AI Business Consultant'}
                </span>
                {sessions.length > 0 && (
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '2px 7px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(217, 119, 6, 0.2)',
                    color: '#FCD34D',
                    fontWeight: 700
                  }}>
                    {sessions.find(s => s.id === activeChatId)?.title || 'Discovery Session'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                {t.discovery?.consultantSubtitle || 'Contextual Interview & Operational Discovery Session'}
              </div>
            </div>
          </div>

          {/* Chat Session Actions & Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Session History Dropdown */}
            {sessions.length > 1 && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowSessionMenu(!showSessionMenu)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.75rem',
                    padding: '5px 10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <History size={13} color="#F59E0B" />
                  <span>{t('chat.history') || 'History'} ({sessions.length})</span>
                  <ChevronDown size={12} />
                </button>

                {showSessionMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 6,
                      width: 'min(280px, calc(100vw - 48px))',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 8,
                      boxShadow: 'var(--shadow-xl)',
                      zIndex: 100,
                      padding: '6px 0',
                      maxHeight: 300,
                      overflowY: 'auto'
                    }}
                  >
                    <div style={{ padding: '6px 14px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {t('chat.discoverySessions') || 'Discovery Chat Sessions'}
                    </div>
                    {sessions
                      .slice()
                      .sort((a, b) => new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime())
                      .map((s) => {
                        const isActive = s.id === activeChatId;
                        const count = s.messageCount || 0;
                        const messageLabel = count === 1 ? (1 + ' ' + (t('chat.messageCountSingle') || 'message')) : (count + ' ' + (t('chat.messagesCount') || 'messages'));
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              handleSelectSession(s.id);
                              setShowSessionMenu(false);
                            }}
                            style={{
                              padding: '8px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              cursor: 'pointer',
                              backgroundColor: isActive ? 'var(--accent-amber-light)' : 'transparent',
                              borderLeft: isActive ? '3px solid var(--accent-amber)' : '3px solid transparent'
                            }}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'; }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '0.8rem',
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? 'var(--accent-amber-text)' : 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {s.title}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
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
            )}

            {/* + New Chat Button */}
            <button
              type="button"
              onClick={handleCreateNewChat}
              disabled={creatingChat}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: '0.75rem',
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <Plus size={14} />
              <span>{creatingChat ? (t('chat.creating') || 'Creating...') : (t('chat.newChat') || 'New Chat')}</span>
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {translating && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              borderRadius: 6,
              fontSize: '0.74rem',
              color: 'var(--accent-amber-text, #B45309)',
              alignSelf: 'center'
            }}>
              <Sparkles size={13} className="animate-spin" color="var(--accent-amber)" />
              <span>{t('chat.translating') || 'Translating conversation...'}</span>
            </div>
          )}
          {!messages.some(m => m.role === 'user') ? (
            <AssistantWelcomeCard
              stage="discovery"
              workspace={workspace}
              documentCount={workspace?.documentsCount}
              onSelectPrompt={(prompt) => handleSendMessage(`Tell me about our ${(prompt || '').toLowerCase()}`)}
            />
          ) : (
            messages
              .filter((m, idx) => !(idx === 0 && m.role === 'assistant' && isInitialWelcomeMessage(m)))
              .map((m) => {
                const translatedContent = getTranslatedContent(m);
                const structuredData = m.role === 'assistant' ? getTranslatedStructured(m) : null;

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: m.role === 'user' ? '75%' : '90%',
                      width: structuredData ? '100%' : 'auto'
                    }}
                  >
                    {m.role === 'assistant' && (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: '#D97706',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2
                        }}
                      >
                        <Bot size={18} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {structuredData ? (
                        <StructuredConsultantCard messageId={`msg_${m.id}`} data={structuredData} onAdvance={handleAdvanceToAnalysis} lang={lang} />
                      ) : (
                        <div
                          style={{
                            backgroundColor: m.role === 'user' ? '#1E232D' : 'var(--bg-subtle)',
                            color: m.role === 'user' ? '#FAF8F5' : 'var(--text-primary)',
                            padding: '14px 18px',
                            borderRadius: 12,
                            fontSize: '0.9rem',
                            lineHeight: 1.55,
                            border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {renderFormattedText(translatedContent)}
                        </div>
                      )}

                      {m.role === 'assistant' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                          {m.suggestedAction && !structuredData ? (
                            <button
                              onClick={handleAdvanceToAnalysis}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber-text)' }}
                            >
                              <Sparkles size={13} color="var(--accent-amber)" />
                              {m.suggestedAction} <ArrowRight size={13} />
                            </button>
                          ) : <div />}
                          {!structuredData && <ChatMessageSpeaker messageId={`msg_${m.id}`} text={translatedContent} lang={lang} />}
                        </div>
                      )}
                    </div>

                {m.role === 'user' && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: 'var(--border-medium)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <User size={18} color="var(--text-secondary)" />
                  </div>
                )}
              </div>
            );
          }))}

          {sending && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Sparkles size={16} color="var(--accent-amber)" />
              <span>{t('chat.thinking') || 'Synthesizing enterprise constraints and advice...'}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <input
              type="text"
              placeholder={t('chat.placeholder') || t.discovery?.placeholder || "Ask the AI Consultant or describe system constraints..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              className="form-input"
              style={{ fontSize: '0.9rem', padding: '10px 14px', flex: 1, minWidth: 0, minHeight: 44 }}
            />
            <ChatVoiceInput
              lang={lang}
              workspaceId={id}
              sessionId={activeChatId}
              onInterimPreview={(previewText) => {
                setInput(previewText);
              }}
              onFinalTranscript={(finalSpokenText) => {
                setInput(finalSpokenText);
              }}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="btn btn-primary"
              style={{ padding: '0 16px', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}
            >
              <Send size={16} />
              <span className="hide-on-mobile">{t('chat.send') || t.discovery?.send || 'Send'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

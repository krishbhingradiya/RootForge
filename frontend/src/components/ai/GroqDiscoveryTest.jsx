import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, RefreshCw, CheckCircle2, AlertCircle, 
  HelpCircle, Layers, ArrowRight, User, Bot, Clock, 
  MessageSquare, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../services/api';

export const GroqDiscoveryTest = ({ workspaceId = null }) => {
  const [sessionId, setSessionId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Active state
  const [discoveryResult, setDiscoveryResult] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);

  const messagesEndRef = useRef(null);

  // Initialize session on mount
  useEffect(() => {
    initSession();
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const h = await api.getAiDiscoveryHealth();
      setHealthStatus(h);
    } catch (err) {
      console.warn('Health check notice:', err.message);
    }
  };

  const initSession = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.startAiDiscovery();
      if (res && res.sessionId) {
        setSessionId(res.sessionId);
        setDiscoveryResult(res);
        setConversationHistory([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize discovery session');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError('');

    // Optimistically update conversation history
    const userTurn = { role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    setConversationHistory(prev => [...prev, userTurn]);
    setInputMessage('');

    try {
      const res = await api.sendAiDiscoveryMessage(sessionId, trimmed);
      if (res && res.success) {
        setDiscoveryResult(res);
        if (res.next_question) {
          const aiTurn = { role: 'assistant', content: res.next_question, timestamp: new Date().toISOString() };
          setConversationHistory(prev => [...prev, aiTurn]);
        }
      } else {
        setError(res?.error || 'Failed to process discovery message');
      }
    } catch (err) {
      setError(err.message || 'Failed to contact Groq discovery service');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await api.resetAiDiscoverySession(sessionId);
      setDiscoveryResult(null);
      setConversationHistory([]);
      initSession();
    } catch (err) {
      setError(err.message || 'Failed to reset session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', color: 'var(--text-primary, #FAF8F5)' }}>
      {/* Header Bar */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-medium, #2A313C)',
          paddingBottom: 16,
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div 
            style={{ 
              width: 42, 
              height: 42, 
              borderRadius: 10, 
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
              color: 'var(--accent-amber, #D97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(217, 119, 6, 0.3)'
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              AI Business Consultant — Groq Discovery Test
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94A3B8)', margin: 0, marginTop: 3 }}>
              Live requirements gathering engine powered by Groq <code style={{ color: '#F59E0B' }}>llama-3.3-70b-versatile</code>.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {healthStatus && (
            <span 
              style={{ 
                fontSize: '0.75rem', 
                padding: '4px 10px', 
                borderRadius: 20, 
                backgroundColor: healthStatus.configured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: healthStatus.configured ? '#10B981' : '#EF4444',
                border: `1px solid ${healthStatus.configured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                fontWeight: 600
              }}
            >
              Provider: {healthStatus.primaryProvider?.toUpperCase()}
            </span>
          )}

          <button 
            type="button"
            onClick={handleReset} 
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '7px 14px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Reset Session</span>
          </button>
        </div>
      </div>

      {/* Grid Layout: Input & Live Analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left Column: Interactive Chat & Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Conversation History Card */}
          <div 
            className="card"
            style={{ 
              backgroundColor: 'var(--bg-surface, #1E232D)',
              border: '1px solid var(--border-medium, #2A313C)',
              borderRadius: 12,
              padding: 16,
              height: 420,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, #2A313C)', paddingBottom: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                CONVERSATION HISTORY ({conversationHistory.length} TURNS)
              </span>
              {sessionId && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  ID: {sessionId.slice(0, 16)}...
                </span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 6 }}>
              {conversationHistory.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>No messages yet. Type your business idea or problem below to start discovery.</p>
                </div>
              ) : (
                conversationHistory.map((msg, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '90%'
                    }}
                  >
                    {msg.role === 'assistant' && (
                      <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(217, 119, 6, 0.2)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Bot size={16} />
                      </div>
                    )}
                    <div 
                      style={{
                        backgroundColor: msg.role === 'user' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(0, 0, 0, 0.25)',
                        border: `1px solid ${msg.role === 'user' ? 'rgba(217, 119, 6, 0.35)' : 'var(--border-subtle, #2A313C)'}`,
                        borderRadius: 10,
                        padding: '10px 14px',
                        fontSize: '0.85rem',
                        lineHeight: 1.45,
                        color: 'var(--text-primary)'
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, color: msg.role === 'user' ? 'var(--accent-amber)' : '#10B981' }}>
                        {msg.role === 'user' ? 'You' : 'AI Business Consultant'}
                      </div>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={16} />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* User Input Form */}
          <form onSubmit={handleSendMessage}>
            <div 
              style={{
                backgroundColor: 'var(--bg-surface, #1E232D)',
                border: '1px solid var(--border-medium, #2A313C)',
                borderRadius: 12,
                padding: 12
              }}
            >
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                YOUR BUSINESS REQUIREMENT / ANSWER:
              </label>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Example: I want to build an online grocery delivery platform for local grocery stores with fast search and delivery tracking..."
                rows={3}
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-subtle, #181C24)',
                  border: '1px solid var(--border-subtle, #2A313C)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              {error && (
                <div style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Press Enter to send (Shift+Enter for newline). Multilingual supported.
                </span>
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: 'var(--accent-amber, #D97706)',
                    borderColor: 'var(--accent-amber, #D97706)',
                    color: '#FFFFFF',
                    padding: '8px 18px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Send size={14} />
                  <span>{loading ? 'Reasoning with Groq...' : 'Send to AI'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Structured AI Understanding & Requirements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI Understanding & Counter-Question Card */}
          <div 
            className="card"
            style={{ 
              backgroundColor: 'var(--bg-surface, #1E232D)',
              border: '1px solid var(--border-medium, #2A313C)',
              borderRadius: 12,
              padding: 18
            }}
          >
            {/* Status Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle, #2A313C)', paddingBottom: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="var(--accent-amber)" />
                <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>AI DISCOVERY STATE</span>
              </div>
              <span 
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  backgroundColor: discoveryResult?.conversation_complete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(217, 119, 6, 0.2)',
                  color: discoveryResult?.conversation_complete ? '#10B981' : 'var(--accent-amber)'
                }}
              >
                COMPLETE: {discoveryResult?.conversation_complete ? 'YES' : 'NO'}
              </span>
            </div>

            {/* AI Next Counter-Question */}
            <div 
              style={{
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 16
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-amber)', marginBottom: 4 }}>
                AI COUNTER-QUESTION:
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {discoveryResult?.next_question || 'Please provide your project requirement to begin discovery.'}
              </div>
              {discoveryResult?.question_reason && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>
                  Reason: {discoveryResult.question_reason}
                </div>
              )}
            </div>

            {/* Project Summary */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                AI UNDERSTANDING & SUMMARY:
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #CBD5E1)', lineHeight: 1.45 }}>
                {discoveryResult?.project_summary || 'Waiting for initial requirement description.'}
              </div>
            </div>

            {/* Missing Information Checklist */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                MISSING INFORMATION:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Array.isArray(discoveryResult?.missing_information) && discoveryResult.missing_information.length > 0 ? (
                  discoveryResult.missing_information.map((item, idx) => (
                    <span 
                      key={idx}
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: 4,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#F87171'
                      }}
                    >
                      • {item}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.78rem', color: '#10B981' }}>All major business areas identified!</span>
                )}
              </div>
            </div>
          </div>

          {/* Collected Requirements Breakdown Card */}
          <div 
            className="card"
            style={{ 
              backgroundColor: 'var(--bg-surface, #1E232D)',
              border: '1px solid var(--border-medium, #2A313C)',
              borderRadius: 12,
              padding: 18,
              maxHeight: 280,
              overflowY: 'auto'
            }}
          >
            <div style={{ fontSize: '0.84rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle, #2A313C)', paddingBottom: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} color="#10B981" />
              <span>COLLECTED REQUIREMENTS (STRUCTURED)</span>
            </div>

            {discoveryResult?.requirements ? (
              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {discoveryResult.requirements.business_problem && (
                  <div>
                    <strong style={{ color: 'var(--accent-amber)' }}>Problem: </strong>
                    <span>{discoveryResult.requirements.business_problem}</span>
                  </div>
                )}
                {Array.isArray(discoveryResult.requirements.target_users) && discoveryResult.requirements.target_users.length > 0 && (
                  <div>
                    <strong style={{ color: '#3B82F6' }}>Target Users: </strong>
                    <span>{discoveryResult.requirements.target_users.join(', ')}</span>
                  </div>
                )}
                {Array.isArray(discoveryResult.requirements.features) && discoveryResult.requirements.features.length > 0 && (
                  <div>
                    <strong style={{ color: '#10B981' }}>Features: </strong>
                    <span>{discoveryResult.requirements.features.join(', ')}</span>
                  </div>
                )}
                {Array.isArray(discoveryResult.requirements.integrations) && discoveryResult.requirements.integrations.length > 0 && (
                  <div>
                    <strong style={{ color: '#A855F7' }}>Integrations: </strong>
                    <span>{discoveryResult.requirements.integrations.join(', ')}</span>
                  </div>
                )}
                {Array.isArray(discoveryResult.requirements.workflows) && discoveryResult.requirements.workflows.length > 0 && (
                  <div>
                    <strong style={{ color: '#EC4899' }}>Workflows: </strong>
                    <span>{discoveryResult.requirements.workflows.join(', ')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No structured requirements captured yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroqDiscoveryTest;

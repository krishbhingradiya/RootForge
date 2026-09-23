import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Zap,
  RefreshCw
} from 'lucide-react';
import { api } from '../../../services/api';
import { showToast } from '../../../components/common/Toast';

export const DatabaseAiAssistantPanel = ({
  isOpen,
  onClose,
  workspaceId,
  model,
  onApplyAssistantSuggestion
}) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your **RootForge Database & API Copilot**. I have indexed your current active schema (**${model.entities.length} entities**, **${model.relations.length} relations**, and **${model.endpoints.length} REST endpoints** in the *${model.domain}* domain).\n\nAsk me anything about referential integrity, indexes, 3NF normalization, or API contracts!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Preset prompt chips derived dynamically from active canonical entities
  const primaryFk = (model?.entities || [])
    .flatMap(e => (e.fields || []).map(f => f.name))
    .find(name => name.endsWith('Id') && name !== 'id') || 'primaryKey';

  const quickPrompts = [
    `Why is ${primaryFk} required?`,
    'Find missing foreign keys.',
    'Suggest performance indexes.',
    'Check 3NF normalization.',
    'Find API/schema mismatches.',
    'Review REST API security.',
    'Add standard audit fields.'
  ];

  const handleSendMessage = async (queryText) => {
    const textToSend = queryText || inputValue.trim();
    if (!textToSend || loading) return;

    const userMsg = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputValue('');

    try {
      setLoading(true);
      const res = await api.askDatabaseAi(workspaceId, {
        prompt: textToSend,
        entities: model.entities,
        relations: model.relations,
        endpoints: model.endpoints,
        integrations: model.integrations
      });

      const aiMsg = {
        role: 'assistant',
        content: res.answer || 'Analysis completed.',
        suggestions: res.suggestions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI assistant request failed:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue analyzing your schema. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="db-ai-drawer">
      {/* Drawer Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--db-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--db-surface-header)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sparkles size={16} color="var(--accent-amber, #D97706)" />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              Database & API Copilot
            </div>
            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
              Grounded in current data model &bull; {model.entities.length} Tables
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer', padding: 4 }}
          title="Close AI Assistant"
        >
          <X size={18} />
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: 'var(--db-surface-muted)',
          borderBottom: '1px solid var(--db-border)',
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}
      >
        {quickPrompts.map((qp, qIdx) => (
          <button
            key={qIdx}
            type="button"
            onClick={() => handleSendMessage(qp)}
            disabled={loading}
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 14,
              backgroundColor: 'var(--db-surface)',
              border: '1px solid var(--db-border)',
              color: 'var(--db-text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-amber, #D97706)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--db-border)')}
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Chat Messages Stream */}
      <div
        style={{
          flex: 1,
          padding: '14px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: 'var(--db-surface)'
        }}
      >
        {messages.map((m, idx) => {
          const isAi = m.role === 'assistant';

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isAi ? 'flex-start' : 'flex-end',
                maxWidth: '92%',
                alignSelf: isAi ? 'flex-start' : 'flex-end'
              }}
            >
              <div
                style={{
                  backgroundColor: isAi ? 'var(--db-surface-muted)' : 'var(--accent-amber, #D97706)',
                  color: isAi ? 'var(--db-text-primary)' : '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  border: isAi ? '1px solid var(--db-border)' : 'none',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxShadow: 'var(--db-card-shadow)'
                }}
              >
                {m.content}
              </div>

              {/* Action suggestions from AI */}
              {m.suggestions && m.suggestions.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {m.suggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => onApplyAssistantSuggestion?.(sug)}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#059669',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        cursor: 'pointer'
                      }}
                    >
                      <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
                      {sug}
                    </button>
                  ))}
                </div>
              )}

              <span style={{ fontSize: '0.625rem', color: 'var(--db-text-muted)', marginTop: 3 }}>
                {m.timestamp}
              </span>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--db-text-muted)', fontSize: '0.78rem', padding: 8 }}>
            <RefreshCw size={14} className="spin" />
            Analyzing active data model & API contracts...
          </div>
        )}
      </div>

      {/* Input Composer */}
      <div
        style={{
          padding: 12,
          borderTop: '1px solid var(--db-border)',
          backgroundColor: 'var(--db-surface-header)',
          display: 'flex',
          gap: 8
        }}
      >
        <input
          type="text"
          placeholder="Ask about relations, constraints, indexes..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          disabled={loading}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '0.8rem',
            backgroundColor: 'var(--db-surface)',
            border: '1px solid var(--db-border)',
            borderRadius: 6,
            color: 'var(--db-text-primary)',
            outline: 'none'
          }}
        />
        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={loading || !inputValue.trim()}
          style={{
            padding: '0 14px',
            borderRadius: 6,
            backgroundColor: 'var(--accent-amber, #D97706)',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading || !inputValue.trim() ? 0.6 : 1
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

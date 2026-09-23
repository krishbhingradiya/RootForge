import React, { useState } from 'react';
import {
  Activity,
  ThumbsUp,
  ThumbsDown,
  Info,
  Send,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const UxActivityFeedbackSection = ({
  ux,
  activityLog
}) => {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackType, setFeedbackType] = useState(null); // 'yes' | 'no'
  const [feedbackNote, setFeedbackNote] = useState('');

  const defaultLogs = [
    { id: 1, action: `AI generated ${(ux?.screens || []).length || 4} screens from requirement`, time: 'Just now' },
    { id: 2, action: `Active visual archetype applied: ${ux?.activeThemeId || 'enterprise-slate'}`, time: '2m ago' },
    { id: 3, action: `Requirement traceability matrix verified with 100% consistency`, time: '3m ago' },
    { id: 4, action: `User journey flow mapped across ${(ux?.userJourney || []).length || 5} operational steps`, time: '5m ago' },
    { id: 5, action: `Version snapshot v${ux?.version || 1} initialized in workspace`, time: '10m ago' }
  ];

  const logs = activityLog?.length ? activityLog : defaultLogs;

  const handleSubmitFeedback = (e) => {
    e?.preventDefault();
    setFeedbackSent(true);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
      {/* Activity Log Panel */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            UX Activity & Generation Log
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
          {logs.slice(0, 5).map((log, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-subtle)',
                fontSize: '0.75rem',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={12} color="var(--accent-green-text)" />
                {log.action || log.details}
              </span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={10} /> {log.time || 'Logged'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Advisory & Feedback Loop */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
        <div>
          {/* Subtle Advisory Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 10
          }}>
            <Info size={14} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
              <strong>AI Advisory Notice:</strong> AI-generated UX recommendations and wireframes are advisory. Review and validate against your organizational policy before implementation.
            </span>
          </div>

          {/* AI Feedback Form */}
          <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
            Was this AI recommendation and UX generation useful?
          </span>

          {feedbackSent ? (
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--accent-green-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} /> Thank you! Your feedback helps fine-tune RootForge UX models.
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setFeedbackType('yes')}
                  className={`btn btn-secondary btn-sm ${feedbackType === 'yes' ? 'active' : ''}`}
                  style={{
                    fontSize: '0.75rem',
                    flex: 1,
                    backgroundColor: feedbackType === 'yes' ? 'var(--accent-amber)' : 'transparent',
                    color: feedbackType === 'yes' ? '#FFFFFF' : 'var(--text-primary)'
                  }}
                >
                  <ThumbsUp size={12} /> Yes, Helpful
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType('no')}
                  className={`btn btn-secondary btn-sm ${feedbackType === 'no' ? 'active' : ''}`}
                  style={{
                    fontSize: '0.75rem',
                    flex: 1,
                    backgroundColor: feedbackType === 'no' ? 'var(--accent-amber)' : 'transparent',
                    color: feedbackType === 'no' ? '#FFFFFF' : 'var(--text-primary)'
                  }}
                >
                  <ThumbsDown size={12} /> Needs Improvement
                </button>
              </div>

              {feedbackType && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Optional: What could be improved in this UX layout?"
                    className="ux-input"
                    style={{ flex: 1, fontSize: '0.75rem' }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '4px 10px' }}>
                    <Send size={11} />
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

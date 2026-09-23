import React from 'react';
import { Compass, ArrowRight, User, Bot, ChevronRight } from 'lucide-react';

export const UserJourneyFlowSection = ({
  userJourney,
  screens,
  selectedScreenId,
  onSelectScreen
}) => {
  if (!userJourney || userJourney.length === 0) return null;

  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Compass size={18} color="var(--accent-amber)" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            End-to-End User Journey Flow
          </h2>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Click any step to inspect the corresponding screen
        </span>
      </div>

      <div className="ux-journey-track">
        {userJourney.map((step, idx) => {
          const isSelected = selectedScreenId === step.screenId;
          const targetScreen = (screens || []).find((s) => s.id === step.screenId);
          const isBot = (step.actor || '').toLowerCase().includes('bot') || (step.actor || '').toLowerCase().includes('ai');

          return (
            <React.Fragment key={step.id || idx}>
              <div
                onClick={() => step.screenId && onSelectScreen(step.screenId)}
                className={`ux-journey-node ${isSelected ? 'active' : ''}`}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)'
                    }}>
                      {idx + 1}
                    </span>
                    <span className={`badge ${isBot ? 'badge-amber' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                      {step.actor || 'User'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {step.stepName}
                  </div>
                  <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                    {step.action}
                  </p>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <span>Screen: {targetScreen?.name || step.screenId}</span>
                </div>
              </div>

              {idx < userJourney.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--border-medium)', padding: '0 2px' }}>
                  <ChevronRight size={16} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

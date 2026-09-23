import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Bot,
  CheckCircle2,
  Sliders,
  Send,
  Calendar,
  Search,
  Activity,
  Zap,
  TrendingUp,
  Inbox
} from 'lucide-react';

export const CustomScreenView = ({
  screen,
  allScreens,
  domain,
  deviceView,
  isPrototype = false,
  onTriggerAction
}) => {
  const isMobile = deviceView === 'mobile';
  const isTablet = deviceView === 'tablet';

  const [filterText, setFilterText] = useState('');
  const [activeItem, setActiveItem] = useState(0);
  const [actionNotice, setActionNotice] = useState(null);

  const stats = screen.stats || [
    { label: 'Screen Throughput', value: '420/hr', change: '+10% efficiency', trend: 'up' },
    { label: 'AI Optimization', value: '96.2%', change: 'High compliance', trend: 'up' },
    { label: 'SLA Health', value: '99.5%', change: 'Normal', trend: 'up' },
    { label: 'Quality Score', value: '100%', change: 'Audited', trend: 'up' }
  ];

  const components = screen.components || [];

  const handleAction = (label) => {
    const msg = `Action executed: "${label}" on ${screen.name}`;
    setActionNotice(msg);
    onTriggerAction?.(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Notice */}
      {actionNotice && (
        <div
          style={{
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: 'var(--theme-radius, 6px)',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
          }}
        >
          <CheckCircle2 size={16} /> {actionNotice}
        </div>
      )}

      {/* Screen Overview Strip */}
      <div
        style={{
          backgroundColor: 'var(--theme-surface, #1E293B)',
          border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
          borderRadius: 'var(--theme-radius, 8px)',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)' }}>
              {screen.name}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'var(--theme-badge-bg, rgba(217, 119, 6, 0.15))',
                color: 'var(--theme-accent, #D97706)'
              }}
            >
              CUSTOM EXTENSION
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--theme-muted, #94A3B8)', marginTop: 2 }}>
            {screen.purpose || screen.description}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => handleAction('Execute Screen Workflow')}
            style={{
              padding: '6px 14px',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: 'var(--theme-radius, 6px)',
              backgroundColor: 'var(--theme-accent, #D97706)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Zap size={13} /> Trigger Workflow
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 12
        }}
      >
        {stats.map((st, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'var(--theme-surface, #1E293B)',
              border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
              borderRadius: 'var(--theme-radius, 8px)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}
          >
            <div style={{ fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)', fontWeight: 600 }}>
              {st.label}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)' }}>
              {st.value}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <TrendingUp size={11} /> {st.change}
            </div>
          </div>
        ))}
      </div>

      {/* Declared Custom Component Modules */}
      <div
        style={{
          backgroundColor: 'var(--theme-surface, #1E293B)',
          border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
          borderRadius: 'var(--theme-radius, 8px)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
          Configured Operational Modules ({components.length})
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {components.map((cmp, cIdx) => (
            <div
              key={cmp.id || cIdx}
              style={{
                backgroundColor: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
                borderRadius: 'var(--theme-radius, 6px)',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 10
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
                    {cmp.title || cmp.name || `Widget ${cIdx + 1}`}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--theme-muted, #94A3B8)' }}>
                    {cmp.id}
                  </span>
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)' }}>
                  Type: {cmp.type || 'standard_widget'} &bull; Status: Active
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAction(`Inspect ${cmp.title || cmp.id}`)}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  borderRadius: 4,
                  backgroundColor: 'var(--theme-badge-bg, rgba(217, 119, 6, 0.15))',
                  color: 'var(--theme-accent, #D97706)',
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                  cursor: 'pointer',
                  alignSelf: 'flex-start'
                }}
              >
                Inspect Module
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

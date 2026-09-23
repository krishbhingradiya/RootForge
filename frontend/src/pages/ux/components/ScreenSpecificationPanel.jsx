import React, { useState } from 'react';
import {
  FileCode,
  User,
  Target,
  Layers,
  Compass,
  Shield,
  Smartphone,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check
} from 'lucide-react';

export const ScreenSpecificationPanel = ({ screen, allScreens, onNavigateScreen }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!screen) return null;

  const spec = screen.specification || {
    purpose: screen.description || screen.purpose || 'Operational interface engineered for rapid task execution and situational awareness.',
    primaryUser: screen.primaryUser || 'Operations Specialist',
    userGoal: 'Manage queue throughput, review active case items, and trigger autonomous execution.',
    businessObjective: 'Eliminate operational latency and improve straight-through resolution SLA.',
    primaryActions: ['Execute Resolution', 'Approve Queue Item', 'Filter Records'],
    secondaryActions: ['Export Data Manifest', 'Trigger Notification', 'Inspect Historical Audit Log'],
    requiredData: ['Active Queue Telemetry', 'User Role Permissions', 'Item Status & Timestamps'],
    components: (screen.components || []).map(c => c.title || c.type || 'Component'),
    navigation: (allScreens || []).filter(s => s.id !== screen.id).map(s => s.name),
    states: ['Default / Nominal', 'Active Triage State', 'Item Locked by Operator', 'Action Confirmation Toast'],
    validation: ['Mandatory fields verified', 'User role authorization checked before write action'],
    permissions: ['Tier 1 Operator', 'Team Supervisor', 'System Administrator'],
    responsive: {
      desktop: 'Ergonomic 3-column split view with persistent active queue list and real-time copilot',
      tablet: '2-column responsive layout with collapsible secondary filters',
      mobile: 'Single column stacked cards with floating bottom CTA bar'
    },
    accessibilityNotes: 'WCAG 2.1 AA compliant, 4.5:1 minimum color contrast ratio, full keyboard navigation with focus traps'
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
      {/* Header bar toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: 'var(--bg-subtle)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileCode size={16} color="var(--accent-amber)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            AI UX Specification & Technical Contract: <span style={{ color: 'var(--accent-amber)' }}>{screen.name}</span>
          </span>
          <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
            {isExpanded ? 'Active Inspector' : 'Click to Inspect'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>{isExpanded ? 'Hide Specification' : 'View AI UX Specification'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expandable Technical Specification Body */}
      {isExpanded && (
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: 'var(--bg-surface)' }}>
          {/* Row 1: Purpose & Objectives */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                <Target size={12} color="var(--accent-amber)" /> Screen Purpose & User Goal
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                {spec.purpose}
              </p>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <strong>User Goal:</strong> {spec.userGoal}
              </div>
            </div>

            <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                <User size={12} color="var(--accent-amber)" /> Primary User & Business Goal
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0 }}>
                <strong>Primary User:</strong> {spec.primaryUser}
              </p>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <strong>Business Objective:</strong> {spec.businessObjective}
              </div>
            </div>
          </div>

          {/* Row 2: Actions & Components */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Primary Actions
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(spec.primaryActions || []).map((act, i) => (
                  <span key={i} className="badge badge-amber" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                    ✦ {act}
                  </span>
                ))}
              </div>

              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginTop: 10, marginBottom: 6 }}>
                Secondary Actions
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(spec.secondaryActions || []).map((act, i) => (
                  <span key={i} className="badge badge-gray" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                    {act}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Required Components
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(spec.components || []).map((cmp, i) => (
                  <span key={i} className="ux-chip active" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                    <Layers size={10} /> {cmp}
                  </span>
                ))}
              </div>

              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginTop: 10, marginBottom: 6 }}>
                Screen Navigation Flow
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(spec.navigation || []).map((nav, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const target = (allScreens || []).find(s => s.name === nav || s.id === nav);
                      if (target && onNavigateScreen) onNavigateScreen(target.id);
                    }}
                    className="ux-chip"
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                  >
                    <Compass size={10} /> → {nav}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Responsive Behavior & Technical Guards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                <Smartphone size={12} color="var(--accent-amber)" /> Responsive Behavior
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li><strong>Desktop:</strong> {spec.responsive?.desktop || 'Multi-column ergonomic grid'}</li>
                <li><strong>Tablet:</strong> {spec.responsive?.tablet || '2-column responsive layout with collapsible drawer'}</li>
                <li><strong>Mobile:</strong> {spec.responsive?.mobile || 'Single-column vertical stack with floating CTA'}</li>
              </ul>
            </div>

            <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                <Shield size={12} color="var(--accent-amber)" /> Permissions & Accessibility
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <strong>Authorized Roles:</strong> {(spec.permissions || []).join(', ')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <strong>Accessibility Notes:</strong> {spec.accessibilityNotes}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

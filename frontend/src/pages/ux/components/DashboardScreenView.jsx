import React from 'react';
import {
  Inbox,
  Clock,
  ShieldCheck,
  Bot,
  TrendingUp,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  Activity,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

export const DashboardScreenView = ({
  screen,
  allScreens,
  domain,
  deviceView,
  isPrototype = false,
  onScreenChange,
  onTriggerAction
}) => {
  const isMobile = deviceView === 'mobile';
  const isTablet = deviceView === 'tablet';

  const stats = screen.stats || [
    { label: 'Operational Volume Today', value: '1,420', change: '+18.4% vs last week', trend: 'up', icon: 'Inbox' },
    { label: 'AI Automation Rate', value: '82.6%', change: '+34% straight-through', trend: 'up', icon: 'Bot' },
    { label: 'Avg Processing Time', value: '2.4 min', change: 'Prior baseline: 14.8 min', trend: 'down', icon: 'Clock' },
    { label: 'SLA Compliance Rate', value: '99.2%', change: '+12% target adherence', trend: 'up', icon: 'ShieldCheck' }
  ];

  // Domain-specific priority queue items
  const isCyber = /cyber|soc|threat|incident/i.test(domain + ' ' + screen.name);
  const isLogistics = /logistics|supply|fleet|dispatch|vehicle|driver/i.test(domain + ' ' + screen.name);
  const isFood = /food|delivery|kitchen/i.test(domain + ' ' + screen.name);
  const isFintech = /fraud|fintech|bank|transaction/i.test(domain + ' ' + screen.name);

  const priorityItems = isCyber ? [
    { id: 'SEC-901', name: 'Ransomware C2 Beaconing (Host-104)', severity: 'CRITICAL', time: '1m ago', owner: 'SOC Tier 2' },
    { id: 'SEC-902', name: 'SSH Auth Brute-Force from Tor Node', severity: 'HIGH', time: '4m ago', owner: 'Auto-Quarantine' },
    { id: 'SEC-903', name: 'Privilege Escalation via CVE-2024-3801', severity: 'HIGH', time: '12m ago', owner: 'Analyst J. Cole' }
  ] : isLogistics ? [
    { id: 'FLT-401', name: 'Route Zone 4A: Van #12 Engine Alert', severity: 'CRITICAL', time: '2m ago', owner: 'Carlos R. (Van 12)' },
    { id: 'FLT-402', name: 'Route Zone 2B: Refrigerated Medical Delay', severity: 'HIGH', time: '8m ago', owner: 'Elena V. (Truck 08)' },
    { id: 'FLT-403', name: 'Route Zone 7C: Hub Gate Congestion', severity: 'MEDIUM', time: '15m ago', owner: 'Hub Supervisor' }
  ] : isFood ? [
    { id: 'ORD-501', name: 'Kitchen #4 Prep Delay (18 mins)', severity: 'HIGH', time: '3m ago', owner: 'Rider Dave M.' },
    { id: 'ORD-502', name: 'Courier Reassignment Required', severity: 'MEDIUM', time: '7m ago', owner: 'Auto-Dispatch' },
    { id: 'ORD-503', name: 'VIP Priority Order Spike', severity: 'LOW', time: '14m ago', owner: 'Kitchen Lead' }
  ] : isFintech ? [
    { id: 'TXN-801', name: 'Rapid Card Velocity ($14,500 Wire)', severity: 'CRITICAL', time: '30s ago', owner: 'Risk Desk Alpha' },
    { id: 'TXN-802', name: 'Cross-Border ATM Geolocation Mismatch', severity: 'HIGH', time: '5m ago', owner: 'Fraud Auto-Freeze' },
    { id: 'TXN-803', name: 'Merchant Category Code Anomaly', severity: 'MEDIUM', time: '11m ago', owner: 'AML Tier 1' }
  ] : [
    { id: 'PT-1049', name: 'Elena Rostova (Urgent Cardiology Consult)', severity: 'CRITICAL', time: '2m ago', owner: 'Dr. Marcus Vance' },
    { id: 'PT-1050', name: 'Julian Chen (Pre-Op Vitals Check-in)', severity: 'HIGH', time: '6m ago', owner: 'Nurse Station 3' },
    { id: 'PT-1051', name: 'Amina Al-Mansoor (Overbooked Slot Conflict)', severity: 'MEDIUM', time: '14m ago', owner: 'Intake Desk' }
  ];

  // Find queue screen to transition to if in prototype
  const queueScreen = (allScreens || []).find(s =>
    /queue|intake|workflow|dispatch|triage|investigation|console/i.test(s.name + ' ' + (s.description || ''))
  ) || (allScreens && allScreens[1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 16 }}>
      {/* 1. Metric Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isMobile ? 8 : 12
        }}
      >
        {stats.map((st, idx) => {
          const isSpanTwo = isMobile && stats.length % 2 !== 0 && idx === stats.length - 1;
          return (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--theme-surface, #1E293B)',
                border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
                borderRadius: 'var(--theme-radius, 8px)',
                padding: isMobile ? '10px 12px' : '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 4 : 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                gridColumn: isSpanTwo ? 'span 2' : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: isMobile ? '0.675rem' : '0.725rem', color: 'var(--theme-muted, #94A3B8)', fontWeight: 600 }}>
                  {st.label}
                </span>
                <div
                  style={{
                    width: isMobile ? 22 : 26,
                    height: isMobile ? 22 : 26,
                    borderRadius: 6,
                    backgroundColor: 'var(--theme-badge-bg, rgba(217, 119, 6, 0.15))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--theme-accent, #D97706)',
                    flexShrink: 0
                  }}
                >
                  {idx === 0 ? <Inbox size={isMobile ? 12 : 14} /> : idx === 1 ? <Bot size={isMobile ? 12 : 14} /> : idx === 2 ? <Clock size={isMobile ? 12 : 14} /> : <ShieldCheck size={isMobile ? 12 : 14} />}
                </div>
              </div>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)', letterSpacing: '-0.02em' }}>
                {st.value}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                <TrendingUp size={11} /> {st.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Executive Quick Action Bar */}
      <div
        style={{
          backgroundColor: 'var(--theme-surface, #1E293B)',
          border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
          borderRadius: 'var(--theme-radius, 8px)',
          padding: isMobile ? '10px 12px' : '10px 16px',
          display: 'flex',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 8 : 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={14} color="var(--theme-accent, #D97706)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
              Operational Actions
            </span>
          </div>
          <span
            style={{
              fontSize: '0.6rem',
              padding: '2px 7px',
              borderRadius: 10,
              backgroundColor: 'var(--theme-badge-bg, rgba(217, 119, 6, 0.15))',
              color: 'var(--theme-badge-text, #F59E0B)',
              fontWeight: 700
            }}
          >
            LIVE TELEMETRY
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
          <button
            type="button"
            onClick={() => onTriggerAction?.('Auto-Balance Workload')}
            style={{
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: 'var(--theme-radius, 6px)',
              backgroundColor: 'var(--theme-badge-bg, rgba(217, 119, 6, 0.15))',
              color: 'var(--theme-accent, #D97706)',
              border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <Zap size={12} /> Auto-Balance Load
          </button>

          {queueScreen && (
            <button
              type="button"
              onClick={() => {
                if (onScreenChange) {
                  onScreenChange(queueScreen.id);
                  onTriggerAction?.(`Navigated to ${queueScreen.name}`);
                }
              }}
              style={{
                width: isMobile ? '100%' : 'auto',
                justifyContent: 'center',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 'var(--theme-radius, 6px)',
                backgroundColor: 'var(--theme-accent, #D97706)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              Open Active Queue <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Dashboard Body: Velocity Ring & Priority Cases */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr',
          gap: isMobile ? 10 : 14
        }}
      >
        {/* Left: Transformation Health & Velocity Ring */}
        <div
          style={{
            backgroundColor: 'var(--theme-surface, #1E293B)',
            border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--theme-radius, 8px)',
            padding: isMobile ? 12 : 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: isMobile ? 10 : 14
          }}
        >
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)', marginBottom: 2 }}>
              Throughput Velocity
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--theme-muted, #94A3B8)' }}>
              Autonomous dispatch vs manual human intervention
            </div>
          </div>

          {/* SVG Circular Progress Ring */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', height: isMobile ? 120 : 140 }}>
            <svg width={isMobile ? 110 : 130} height={isMobile ? 110 : 130} viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="var(--theme-border, rgba(255,255,255,0.1))"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="var(--theme-accent, #D97706)"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset="44"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '1.3rem' : '1.5rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)' }}>
                82.6%
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--theme-muted, #94A3B8)', fontWeight: 600 }}>
                AUTOMATED
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.725rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-muted, #94A3B8)' }}>
              <span>Autonomous Flow:</span>
              <strong style={{ color: 'var(--theme-text, #F8FAFC)' }}>1,173 items</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--theme-muted, #94A3B8)' }}>
              <span>Manual Review:</span>
              <strong style={{ color: 'var(--theme-text, #F8FAFC)' }}>247 items</strong>
            </div>
          </div>
        </div>

        {/* Right: High-Priority Exception Queue */}
        <div
          style={{
            backgroundColor: 'var(--theme-surface, #1E293B)',
            border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--theme-radius, 8px)',
            padding: isMobile ? 12 : 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
                Priority Exceptions &amp; Urgent Workload
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--theme-muted, #94A3B8)' }}>
                Items requiring real-time supervisor clearance or dispatch
              </div>
            </div>
            <span
              style={{
                fontSize: '0.625rem',
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {priorityItems.length} PENDING
            </span>
          </div>

          {/* MOBILE VIEW: Card List vs DESKTOP VIEW: Table */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {priorityItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--theme-bg, #0F172A)',
                    border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
                    borderRadius: 'var(--theme-radius, 6px)',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.75rem', color: 'var(--theme-accent, #D97706)' }}>
                      {item.id}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: item.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: item.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B'
                        }}
                      >
                        {item.severity}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--theme-muted, #94A3B8)' }}>
                        {item.time}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)', lineHeight: 1.35 }}>
                    {item.name}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--theme-muted, #94A3B8)' }}>
                      👤 {item.owner}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (queueScreen && onScreenChange) {
                          onScreenChange(queueScreen.id);
                        }
                        onTriggerAction?.(`Triage initiated for ${item.id}`);
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        borderRadius: 4,
                        backgroundColor: 'var(--theme-badge-bg, rgba(217,119,6,0.15))',
                        color: 'var(--theme-accent, #D97706)',
                        border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      Triage <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--theme-border, rgba(255,255,255,0.1))', textAlign: 'left', color: 'var(--theme-muted, #94A3B8)' }}>
                    <th style={{ padding: '8px 10px' }}>ID</th>
                    <th style={{ padding: '8px 10px' }}>Exception Details</th>
                    <th style={{ padding: '8px 10px' }}>Severity</th>
                    <th style={{ padding: '8px 10px' }}>Assigned Agent</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityItems.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--theme-border, rgba(255,255,255,0.05))',
                        color: 'var(--theme-text, #F8FAFC)'
                      }}
                    >
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700 }}>
                        {item.id}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>
                        {item.name}
                        <div style={{ fontSize: '0.675rem', color: 'var(--theme-muted, #94A3B8)' }}>{item.time}</div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: item.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: item.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B'
                          }}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)' }}>
                        {item.owner}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (queueScreen && onScreenChange) {
                              onScreenChange(queueScreen.id);
                            }
                            onTriggerAction?.(`Triage initiated for ${item.id}`);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            borderRadius: 4,
                            backgroundColor: 'var(--theme-badge-bg, rgba(217,119,6,0.15))',
                            color: 'var(--theme-accent, #D97706)',
                            border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          Triage Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

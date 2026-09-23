import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Clock,
  ShieldCheck,
  Calendar,
  Download,
  Filter,
  BarChart2,
  PieChart,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';

export const AnalyticsScreenView = ({
  screen,
  allScreens,
  domain,
  deviceView,
  isPrototype = false,
  onTriggerAction
}) => {
  const isMobile = deviceView === 'mobile';
  const isTablet = deviceView === 'tablet';

  const [dateRange, setDateRange] = useState('30d');
  const [exportNotice, setExportNotice] = useState(null);

  const stats = screen.stats || [
    { label: 'Net Efficiency Gain', value: '+42.8%', change: 'Post-automation', trend: 'up', icon: 'TrendingUp' },
    { label: 'Cost Reduction Est.', value: '$24,500/mo', change: '-38% manual effort', trend: 'up', icon: 'DollarSign' },
    { label: 'Mean Turnaround SLA', value: '2.4 min', change: 'Prior baseline: 18.5 min', trend: 'down', icon: 'Clock' },
    { label: 'User Satisfaction (CSAT)', value: '4.92 / 5.0', change: '+24% Net Promoter', trend: 'up', icon: 'ShieldCheck' }
  ];

  const handleExport = (format) => {
    const msg = `Exported analytics report (${format.toUpperCase()}) for ${dateRange} period.`;
    setExportNotice(msg);
    onTriggerAction?.(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Notice */}
      {exportNotice && (
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
          <CheckCircle2 size={16} /> {exportNotice}
        </div>
      )}

      {/* Top Filter Bar with Date Selector & Export Actions */}
      <div
        style={{
          backgroundColor: 'var(--theme-surface, #1E293B)',
          border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
          borderRadius: 'var(--theme-radius, 8px)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={16} color="var(--theme-accent, #D97706)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)' }}>
            Performance & Transformation Analytics
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Date Selector */}
          <div style={{ display: 'flex', gap: 2, backgroundColor: 'rgba(0,0,0,0.2)', padding: 2, borderRadius: 6 }}>
            {[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'qtd', label: 'Quarter' }
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateRange(d.id)}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: dateRange === d.id ? 'var(--theme-accent, #D97706)' : 'transparent',
                  color: dateRange === d.id ? '#FFFFFF' : 'var(--theme-muted, #94A3B8)',
                  cursor: 'pointer'
                }}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleExport('csv')}
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 'var(--theme-radius, 6px)',
              backgroundColor: 'var(--theme-badge-bg, rgba(217,119,6,0.15))',
              color: 'var(--theme-accent, #D97706)',
              border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Download size={12} /> CSV
          </button>

          <button
            type="button"
            onClick={() => handleExport('pdf')}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: 'var(--theme-radius, 6px)',
              backgroundColor: 'var(--theme-accent, #D97706)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Download size={12} /> Export PDF Report
          </button>
        </div>
      </div>

      {/* 1. Metric Stat Cards */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)', fontWeight: 600 }}>
                {st.label}
              </span>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: 'var(--theme-badge-bg, rgba(217, 119, 6, 0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--theme-accent, #D97706)'
                }}
              >
                {idx === 0 ? <TrendingUp size={13} /> : idx === 1 ? <DollarSign size={13} /> : idx === 2 ? <Clock size={13} /> : <ShieldCheck size={13} />}
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--theme-text, #F8FAFC)' }}>
              {st.value}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              <ArrowUpRight size={11} /> {st.change}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Charts Area: Processing Latency vs SLA Timeline & Category Distribution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1.2fr',
          gap: 14
        }}
      >
        {/* Left Chart: Latency vs SLA Timeline */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
                Processing Latency vs Target SLA
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)' }}>
                Average cycle-time reduction across 4 consecutive operating weeks
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: '0.7rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--theme-accent, #D97706)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--theme-accent, #D97706)' }} />
                Actual Cycle Time
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--theme-muted, #94A3B8)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--theme-border, rgba(255,255,255,0.3))' }} />
                Target Baseline
              </span>
            </div>
          </div>

          {/* Graphical Bars Visualizer */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 20, paddingBottom: 10, borderBottom: '1px solid var(--theme-border, rgba(255,255,255,0.1))' }}>
            {[
              { label: 'Week 1', actual: 40, target: 85, mins: '4.2m' },
              { label: 'Week 2', actual: 32, target: 85, mins: '3.1m' },
              { label: 'Week 3', actual: 26, target: 85, mins: '2.6m' },
              { label: 'Week 4', actual: 20, target: 85, mins: '2.1m' }
            ].map((col, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                <span style={{ fontSize: '0.675rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
                  {col.mins}
                </span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
                  <div
                    style={{
                      width: 18,
                      height: `${col.actual}%`,
                      backgroundColor: 'var(--theme-accent, #D97706)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                    title={`Actual: ${col.mins}`}
                  />
                  <div
                    style={{
                      width: 18,
                      height: `${col.target}%`,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px 4px 0 0'
                    }}
                    title="Target SLA: 15.0m"
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--theme-muted, #94A3B8)', fontWeight: 600 }}>
                  {col.label}
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Target SLA: &lt; 15.0 mins</span>
            <span style={{ color: '#10B981', fontWeight: 700 }}>86% Faster than Legacy Baseline</span>
          </div>
        </div>

        {/* Right Chart: Volume Breakdown by Category */}
        <div
          style={{
            backgroundColor: 'var(--theme-surface, #1E293B)',
            border: '1px solid var(--theme-border, rgba(255, 255, 255, 0.08))',
            borderRadius: 'var(--theme-radius, 8px)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--theme-text, #F8FAFC)' }}>
              Operational Distribution by Category
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--theme-muted, #94A3B8)', marginBottom: 12 }}>
              Workload share across top departments & channels
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Priority Scheduled Encounters', pct: 48, count: '682 items' },
                { label: 'Autonomous AI Triage Stream', pct: 34, count: '483 items' },
                { label: 'Manual Supervisor Escalations', pct: 14, count: '198 items' },
                { label: 'Exception Hold & Audit Review', pct: 4, count: '57 items' }
              ].map((cat, cIdx) => (
                <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--theme-text, #F8FAFC)', fontWeight: 600 }}>{cat.label}</span>
                    <span style={{ color: 'var(--theme-muted, #94A3B8)' }}>{cat.count} ({cat.pct}%)</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${cat.pct}%`,
                        backgroundColor: cIdx === 0 ? 'var(--theme-accent, #D97706)' : cIdx === 1 ? '#10B981' : cIdx === 2 ? '#3B82F6' : '#EF4444',
                        borderRadius: 3
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: 10,
              backgroundColor: 'rgba(0,0,0,0.15)',
              borderRadius: 6,
              border: '1px solid var(--theme-border, rgba(255,255,255,0.05))',
              fontSize: '0.7rem',
              color: 'var(--theme-muted, #94A3B8)',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span>Audit Status: <strong>Verified</strong></span>
            <span>Compliance: <strong>100%</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

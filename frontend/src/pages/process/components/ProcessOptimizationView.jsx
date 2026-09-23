import React, { useState } from 'react';
import {
  Zap,
  TrendingUp,
  Clock,
  Shuffle,
  Cpu,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const ProcessOptimizationView = ({ vm, onSelectStep, onEditStep }) => {
  const [filter, setFilter] = useState('ALL');

  if (!vm || !vm.optimizations) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Optimization analysis data is unavailable.
      </div>
    );
  }

  const { metrics, summary, recommendations } = vm.optimizations;

  const filteredRecommendations = recommendations.filter((r) => {
    if (filter === 'ALL') return true;
    return r.category === filter;
  });

  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'BOTTLENECK':
        return { label: 'BOTTLENECK', icon: <Clock size={13} />, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
      case 'HANDOFF':
        return { label: 'CROSS-LANE HANDOFF', icon: <Shuffle size={13} />, color: 'var(--accent-amber)', bg: 'rgba(245, 158, 11, 0.12)' };
      case 'AUTOMATION':
        return { label: 'AUTOMATION OPPORTUNITY', icon: <Cpu size={13} />, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' };
      case 'PARALLELIZATION':
        return { label: 'PARALLEL FORK', icon: <TrendingUp size={13} />, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'RESILIENCE':
        return { label: 'FAULT RESILIENCE', icon: <ShieldAlert size={13} />, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' };
      default:
        return { label: cat, icon: <Zap size={13} />, color: 'var(--text-primary)', bg: 'var(--bg-subtle)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top AI Optimization Insight Card */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid var(--border-medium)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={22} color="var(--accent-amber)" />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              AI Process Optimization Intelligence
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              {summary}
            </p>
          </div>
        </div>

        {/* 4 Key Optimization Metric Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div style={{ padding: 14, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cycle Time Reduction</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-green-text)', marginTop: 2 }}>{metrics.cycleTimePotential}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Estimated turnaround lift</div>
          </div>

          <div style={{ padding: 14, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cross-Lane Handoffs</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-amber-text)', marginTop: 2 }}>{metrics.handoffCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Context transitions</div>
          </div>

          <div style={{ padding: 14, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Identified Bottlenecks</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#EF4444', marginTop: 2 }}>{metrics.bottleneckCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>High-latency queue gates</div>
          </div>

          <div style={{ padding: 14, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Automation Candidates</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#2563EB', marginTop: 2 }}>{metrics.automationCandidateCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Digital manual tasks</div>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
          <Filter size={12} /> Filter:
        </span>
        {[
          { key: 'ALL', label: 'All Opportunities', count: recommendations.length },
          { key: 'BOTTLENECK', label: 'Bottlenecks', count: recommendations.filter(r => r.category === 'BOTTLENECK').length },
          { key: 'HANDOFF', label: 'Handoffs', count: recommendations.filter(r => r.category === 'HANDOFF').length },
          { key: 'AUTOMATION', label: 'Automation', count: recommendations.filter(r => r.category === 'AUTOMATION').length },
          { key: 'PARALLELIZATION', label: 'Parallelization', count: recommendations.filter(r => r.category === 'PARALLELIZATION').length },
          { key: 'RESILIENCE', label: 'Resilience', count: recommendations.filter(r => r.category === 'RESILIENCE').length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="btn btn-sm"
            style={{
              backgroundColor: filter === tab.key ? 'var(--accent-amber)' : 'var(--bg-subtle)',
              color: filter === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
              borderColor: filter === tab.key ? 'var(--accent-amber)' : 'var(--border-subtle)',
              fontSize: '0.75rem',
              padding: '4px 10px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '0.64rem',
                padding: '0 5px',
                borderRadius: 10,
                backgroundColor: filter === tab.key ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-surface)',
                color: filter === tab.key ? '#FFFFFF' : 'var(--text-muted)'
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Recommendations Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredRecommendations.length === 0 ? (
          <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {recommendations.length === 0
              ? 'No optimization opportunities identified from the current process evidence.'
              : 'No recommendations found for this category filter.'}
          </div>
        ) : (
          filteredRecommendations.map((rec) => {
            const meta = getCategoryMeta(rec.category);
            const targetStep = rec.affectedStepOrders[0] ? vm.stepMap.get(rec.affectedStepOrders[0]) : null;

            return (
              <div
                key={rec.id}
                className="card"
                style={{
                  padding: '18px 22px',
                  borderLeft: `5px solid ${meta.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        backgroundColor: meta.bg,
                        color: meta.color
                      }}
                    >
                      {meta.icon} {meta.label}
                    </span>

                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                      {rec.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 4,
                        backgroundColor: rec.impact === 'HIGH' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: rec.impact === 'HIGH' ? '#EF4444' : 'var(--accent-amber-text)',
                        border: `1px solid ${rec.impact === 'HIGH' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                      }}
                    >
                      {rec.impact} IMPACT
                    </span>

                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 4,
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      {rec.effort} EFFORT
                    </span>
                  </div>
                </div>

                {/* Problem Description */}
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Observed Friction: </strong>
                  {rec.problem}
                </div>

                {/* Recommended Operational Solution */}
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.4
                  }}
                >
                  <strong style={{ color: 'var(--accent-amber-text)' }}>AI Recommendation: </strong>
                  {rec.recommendation}
                </div>

                {/* Footer: Affected Steps & Action Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Affected Steps:</span>
                    {rec.affectedStepOrders.map((ord) => {
                      const st = vm.stepMap.get(ord);
                      return (
                        <button
                          key={ord}
                          onClick={() => st && onSelectStep(st.id)}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: 'var(--accent-blue-light)',
                            color: 'var(--accent-blue-text)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            cursor: 'pointer'
                          }}
                        >
                          #{ord} {st ? st.label.slice(0, 16) : `Step ${ord}`}
                        </button>
                      );
                    })}
                  </div>

                  {targetStep && onEditStep && (
                    <button
                      onClick={() => onEditStep(targetStep)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Zap size={12} color="var(--accent-amber)" />
                      {rec.action}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

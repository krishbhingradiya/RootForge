import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Wrench,
  Check,
  Zap,
  TrendingUp
} from 'lucide-react';

export const ValidationReportView = ({
  validation,
  onApplyFix,
  onRevalidate
}) => {
  const {
    score = 100,
    criticalIssues = [],
    warnings = [],
    suggestions = [],
    totalIssues = 0
  } = validation || {};

  const getScoreColor = (sc) => {
    if (sc >= 85) return '#10B981';
    if (sc >= 65) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Validation Score Banner */}
      <div className="val-score-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Circular Score Badge */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--db-surface-muted)',
              border: `4px solid ${getScoreColor(score)}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: getScoreColor(score), lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: '0.6rem', color: 'var(--db-text-muted)', fontWeight: 700 }}>/ 100</span>
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              Schema & API Architectural Validation
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--db-text-muted)' }}>
              Deterministic 14-rule integrity engine validating 3NF relational normalization, foreign key completeness, B-Tree index coverage, and REST API parity.
            </p>
          </div>
        </div>

        {/* Issue Counter Chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ padding: '6px 12px', borderRadius: 6, backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={14} color="#EF4444" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444' }}>
              {criticalIssues.length} Critical
            </span>
          </div>

          <div style={{ padding: '6px 12px', borderRadius: 6, backgroundColor: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} color="var(--accent-amber, #D97706)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-amber, #D97706)' }}>
              {warnings.length} Warnings
            </span>
          </div>

          <div style={{ padding: '6px 12px', borderRadius: 6, backgroundColor: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Info size={14} color="#2563EB" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB' }}>
              {suggestions.length} Suggestions
            </span>
          </div>
        </div>
      </div>

      {/* Critical Issues Section */}
      {criticalIssues.length > 0 && (
        <div style={{ padding: 18, backgroundColor: 'var(--db-surface)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, boxShadow: 'var(--db-card-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ShieldAlert size={18} color="#EF4444" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#EF4444' }}>
              Critical Architectural Issues ({criticalIssues.length})
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {criticalIssues.map((issue) => (
              <div key={issue.id} className="val-issue-item" style={{ borderLeft: '3px solid #EF4444' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--db-text-primary)' }}>
                      {issue.problem}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      {issue.affectedItem}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.775rem', color: 'var(--db-text-secondary)', lineHeight: 1.4 }}>
                    {issue.explanation}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: 2 }}>
                    <strong>Recommended Fix:</strong> {issue.recommendedFix}
                  </div>
                </div>

                {issue.fixType && (
                  <button
                    type="button"
                    onClick={() => onApplyFix(issue)}
                    className="btn btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Wrench size={12} /> Apply Fix
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div style={{ padding: 18, backgroundColor: 'var(--db-surface)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: 8, boxShadow: 'var(--db-card-shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={18} color="var(--accent-amber, #D97706)" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-amber, #D97706)' }}>
              Referential & Schema Warnings ({warnings.length})
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {warnings.map((issue) => (
              <div key={issue.id} className="val-issue-item" style={{ borderLeft: '3px solid var(--accent-amber, #D97706)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--db-text-primary)' }}>
                      {issue.problem}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--accent-amber, #D97706)', backgroundColor: 'rgba(217,119,6,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      {issue.affectedItem}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.775rem', color: 'var(--db-text-secondary)', lineHeight: 1.4 }}>
                    {issue.explanation}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: 2 }}>
                    <strong>Recommended Fix:</strong> {issue.recommendedFix}
                  </div>
                </div>

                {issue.fixType && (
                  <button
                    type="button"
                    onClick={() => onApplyFix(issue)}
                    className="btn btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: 'rgba(217, 119, 6, 0.12)',
                      color: 'var(--accent-amber, #D97706)',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Wrench size={12} /> Apply Fix
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions Section */}
      <div style={{ padding: 18, backgroundColor: 'var(--db-surface)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 8, boxShadow: 'var(--db-card-shadow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Info size={18} color="#2563EB" />
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#2563EB' }}>
            Performance & Compliance Suggestions ({suggestions.length})
          </h4>
        </div>

        {suggestions.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} /> All performance and audit compliance suggestions have been implemented!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggestions.map((issue) => (
              <div key={issue.id} className="val-issue-item" style={{ borderLeft: '3px solid #2563EB' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--db-text-primary)' }}>
                      {issue.problem}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      {issue.affectedItem}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.775rem', color: 'var(--db-text-secondary)', lineHeight: 1.4 }}>
                    {issue.explanation}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: 2 }}>
                    <strong>Recommended Fix:</strong> {issue.recommendedFix}
                  </div>
                </div>

                {issue.fixType && issue.fixType !== 'ADD_INDEX_HINT' && (
                  <button
                    type="button"
                    onClick={() => onApplyFix(issue)}
                    className="btn btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: 'rgba(37, 99, 235, 0.12)',
                      color: '#2563EB',
                      border: '1px solid rgba(37, 99, 235, 0.25)',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Wrench size={12} /> Apply Fix
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

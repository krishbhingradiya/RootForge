import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Edit2,
  CheckSquare,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { parseActionableIssues } from '../processViewModel';

export const ValidationView = ({ vm, onSelectStep, onEditStep, onValidate, validating }) => {
  if (!vm || !vm.validationReport) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Validation report is unavailable.
      </div>
    );
  }

  const { validationReport, steps } = vm;
  const issues = parseActionableIssues(validationReport, steps);
  const isValid = validationReport.isValid;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Validation Status Hero */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          borderLeft: `5px solid ${isValid ? 'var(--accent-green)' : '#EF4444'}`,
          backgroundColor: isValid ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {isValid ? (
            <CheckCircle2 size={32} color="var(--accent-green)" />
          ) : (
            <ShieldAlert size={32} color="#EF4444" />
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                20-Point Production Workflow Validation Engine
              </h3>
              <span
                className="badge"
                style={{
                  backgroundColor: isValid ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
                  color: isValid ? 'var(--accent-green-text)' : 'var(--accent-red-text)',
                  fontWeight: 800,
                  fontSize: '0.72rem'
                }}
              >
                {validationReport.status}
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {validationReport.summary}
            </p>
          </div>
        </div>

        <button
          onClick={onValidate}
          disabled={validating}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={13} className={validating ? 'spin' : ''} />
          {validating ? 'Running 20 Checks...' : 'Re-run Validation'}
        </button>
      </div>

      {/* Validation Scorecard Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div style={{ padding: 14, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Checks</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{validationReport.checksCount || 20}</div>
        </div>

        <div style={{ padding: 14, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-green-text)', fontWeight: 700, textTransform: 'uppercase' }}>Passed Checks</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-green-text)', marginTop: 2 }}>{validationReport.passedCount || (20 - (validationReport.errorCount || 0) - (validationReport.warningCount || 0))}</div>
        </div>

        <div style={{ padding: 14, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase' }}>Blocking Errors</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#EF4444', marginTop: 2 }}>{validationReport.errorCount || 0}</div>
        </div>

        <div style={{ padding: 14, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber-text)', fontWeight: 700, textTransform: 'uppercase' }}>Actionable Warnings</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-amber-text)', marginTop: 2 }}>{validationReport.warningCount || 0}</div>
        </div>
      </div>

      {/* Actionable Remediation Items */}
      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
          Actionable Workflow Remediation Items ({issues.length})
        </h4>

        {issues.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '24px',
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid var(--accent-green)',
              borderRadius: 8,
              textAlign: 'center',
              color: 'var(--accent-green-text)'
            }}
          >
            <ShieldCheck size={36} color="var(--accent-green)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 800, fontSize: '0.96rem' }}>All 20 Validation Integrity Checks Passed</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Topology, actor swimlanes, failure policies, requirement traceability, and decision routes are fully verified.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {issues.map((issue) => {
              const isError = issue.severity === 'ERROR';
              const targetStep = issue.stepId ? vm.stepMap.get(issue.stepId) : null;

              return (
                <div
                  key={issue.id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    borderRadius: 8,
                    backgroundColor: isError ? 'rgba(239, 68, 68, 0.04)' : 'rgba(245, 158, 11, 0.04)',
                    border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: isError ? 'var(--accent-red-light)' : 'var(--accent-amber-light)',
                          color: isError ? '#EF4444' : 'var(--accent-amber-text)',
                          fontWeight: 800,
                          fontSize: '0.68rem'
                        }}
                      >
                        {isError ? 'BLOCKING ERROR' : 'ACTIONABLE WARNING'}
                      </span>

                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {issue.rule}
                      </span>

                      {issue.stepOrder && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({issue.stepLabel})
                        </span>
                      )}
                    </div>

                    {targetStep && onEditStep && (
                      <button
                        onClick={() => onEditStep(targetStep)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '4px 10px', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Edit2 size={11} /> Fix Step #{targetStep.stepOrder}
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Problem:</strong> {issue.problem}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.78rem' }}>
                    <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Expected: </span>
                      <span style={{ color: 'var(--text-primary)' }}>{issue.expected}</span>
                    </div>
                    <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Current: </span>
                      <span style={{ color: isError ? '#EF4444' : 'var(--accent-amber-text)' }}>{issue.current}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--accent-amber-text)',
                      backgroundColor: 'var(--bg-surface)',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px dashed var(--border-subtle)'
                    }}
                  >
                    <strong>Recommended Action:</strong> {issue.recommendedAction}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

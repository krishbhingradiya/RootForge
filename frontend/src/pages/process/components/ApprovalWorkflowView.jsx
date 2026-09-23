import React from 'react';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  ShieldCheck,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const ApprovalWorkflowView = ({ vm, onSelectStep, onAddApproval, onEditStep }) => {
  if (!vm) return null;

  if (!vm.hasApprovals || vm.approvals.length === 0) {
    return (
      <div className="card" style={{ padding: '50px 30px', textAlign: 'center', maxWidth: 720, margin: '20px auto' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <UserCheck size={28} color="var(--accent-green)" />
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          No human approval gate is required by the current business context.
        </h3>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.5 }}>
          Approval is not required by the current business context. Based on the active workspace requirements and governance policies, this workflow operates with straight-through automated processing and does not mandate human supervisor sign-off gates. If regulatory compliance, risk thresholds, or exception handling require supervisory intervention, an approval gate can be added below.
        </p>

        <button
          onClick={onAddApproval}
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 auto' }}
        >
          <Plus size={14} /> Add Approval Step
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header & Governance Banner */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldCheck size={24} color="var(--accent-green)" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
              Enterprise Approval & Governance Chains
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {vm.approvals.length} active approval gate(s) enforcing operational compliance and supervisory sign-off.
            </div>
          </div>
        </div>

        <button
          onClick={onAddApproval}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={13} /> Add Another Approval Gate
        </button>
      </div>

      {/* List of Approval Workflow Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {vm.approvals.map((appr) => (
          <div
            key={appr.stepId}
            className="card"
            style={{
              padding: '20px 24px',
              borderLeft: '5px solid var(--accent-green)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {/* Header: Step Number, Label, Role, SLA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--accent-green-text)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: 6
                  }}
                >
                  GATE #{appr.stepOrder}
                </span>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {appr.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 4,
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  👤 Approver: <strong>{appr.approverRole}</strong>
                </span>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: 4,
                    background: 'var(--accent-amber-light)',
                    color: 'var(--accent-amber-text)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Clock size={11} /> SLA: {appr.sla}
                </span>
              </div>
            </div>

            {/* Description */}
            {appr.description && (
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {appr.description}
              </div>
            )}

            {/* Approval Criteria */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem'
              }}
            >
              <strong style={{ color: 'var(--accent-amber-text)' }}>EVALUATION CRITERIA:</strong>{' '}
              <span style={{ color: 'var(--text-primary)' }}>{appr.criteria}</span>
            </div>

            {/* 3 Branching Routes: Approved, Rejected, Escalated */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {/* Approved Route */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(16, 185, 129, 0.06)',
                  borderRadius: 8,
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-green-text)', textTransform: 'uppercase' }}>
                  <CheckCircle2 size={14} /> Approved Route
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {appr.approvedRoute}
                </div>
              </div>

              {/* Rejected Route */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.06)',
                  borderRadius: 8,
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-red-text)', textTransform: 'uppercase' }}>
                  <XCircle size={14} /> Rejection Route
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {appr.rejectedRoute}
                </div>
              </div>

              {/* Escalated Route */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(245, 158, 11, 0.06)',
                  borderRadius: 8,
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-amber-text)', textTransform: 'uppercase' }}>
                  <AlertTriangle size={14} /> Escalation / SLA Timeout
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {appr.escalatedRoute}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => onSelectStep(appr.stepId)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem' }}
              >
                Inspect Step #{appr.stepOrder}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

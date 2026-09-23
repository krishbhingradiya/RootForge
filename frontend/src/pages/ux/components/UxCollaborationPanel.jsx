import React, { useState } from 'react';
import { UserCheck, CheckCircle2, ShieldCheck } from 'lucide-react';

export const UxCollaborationPanel = ({
  ux,
  onApprove,
  approving
}) => {
  const [notes, setNotes] = useState('');
  const isApproved = ux?.status === 'APPROVED';

  const handleApprove = () => {
    onApprove(notes);
    setNotes('');
  };

  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={18} color="var(--accent-amber)" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Collaboration & Formal Approval Gate
          </h2>
        </div>

        <span className={`badge ${isApproved ? 'badge-green' : 'badge-amber'}`}>
          {isApproved ? 'APPROVED' : 'IN REVIEW'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Stakeholder Review Notes / Feedback
        </label>
        <textarea
          rows={2}
          value={notes}
          disabled={isApproved}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isApproved ? "UX Design System approved." : "Add approval notes or requested changes (e.g. 'Approved with 4 core screens')..."}
          className="ux-textarea"
          style={{ minHeight: 48 }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} color="var(--accent-green)" />
          <span>All upstream process workflow and UX traceability gates verified</span>
        </div>

        <button
          type="button"
          onClick={handleApprove}
          disabled={approving || isApproved}
          className={`btn btn-sm ${isApproved ? 'btn-secondary' : 'btn-primary'}`}
          style={{ fontWeight: 700 }}
        >
          <CheckCircle2 size={14} />
          {isApproved ? 'Sign-Off Complete' : approving ? 'Signing off...' : 'Approve UX Design System'}
        </button>
      </div>
    </div>
  );
};

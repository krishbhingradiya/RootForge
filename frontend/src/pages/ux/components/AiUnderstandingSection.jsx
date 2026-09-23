import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Edit3,
  RefreshCw,
  Layers,
  Users,
  Target,
  ListChecks,
  Monitor,
  CheckCircle2,
  X
} from 'lucide-react';

export const AiUnderstandingSection = ({
  understanding,
  onGenerate,
  onRegenerate,
  onUpdateUnderstanding
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(understanding || {});

  if (!understanding) return null;

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (onUpdateUnderstanding) {
      onUpdateUnderstanding(editForm);
    }
    setIsEditing(false);
  };

  const detectedWorkflows = understanding.importantWorkflows || [
    'User Ingestion & Triage',
    'Case Item Selection',
    'AI Resolution Assistance',
    'Execution & Confirmation'
  ];

  const detectedScreens = understanding.expectedScreens || [
    'Operations Status Dashboard',
    'Case Processing Workspace',
    'Routing Rules & Configuration',
    'Throughput & SLA Analytics'
  ];

  const functionalReqs = understanding.functionalRequirements || [
    'Real-time operational dashboard',
    'Actionable split-view console',
    'Policy threshold manager',
    'Audit compliance analytics'
  ];

  return (
    <div className="card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="var(--accent-amber)" />
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              AI REQUIREMENT ANALYSIS
            </h3>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Synthesized domain taxonomy, user personas, detected workflows, and screen architecture
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setEditForm(understanding);
              setIsEditing(true);
            }}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '3px 10px' }}
          >
            <Edit3 size={12} /> Edit Analysis
          </button>

          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 10px' }}
            >
              <RefreshCw size={12} /> Regenerate Analysis
            </button>
          )}

          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 12px', fontWeight: 700 }}
            >
              Generate UX from Analysis <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Analysis Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
        {/* Domain & Goal */}
        <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Domain / Industry
          </span>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {understanding.domain || 'Operational Enterprise'} ({understanding.businessIndustry || 'Enterprise Systems'})
          </div>

          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Primary Business Goal
          </span>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            {understanding.businessGoal}
          </p>
        </div>

        {/* Personas */}
        <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Primary Persona
          </span>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 8 }}>
            ✦ {understanding.primaryUsers}
          </div>

          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            Secondary Personas
          </span>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            {understanding.secondaryUsers || 'Operations Lead, Supervisor, Auditor'}
          </div>
        </div>

        {/* Detected Workflows */}
        <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Detected Workflows ({detectedWorkflows.length})
          </span>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {detectedWorkflows.map((wf, idx) => (
              <li key={idx} style={{ fontWeight: 500 }}>{wf}</li>
            ))}
          </ol>
        </div>

        {/* Detected Screens */}
        <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Detected Screens ({detectedScreens.length})
          </span>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {detectedScreens.map((sc, idx) => (
              <li key={idx} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sc}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* Edit Analysis Modal */}
      {isEditing && (
        <div className="ux-modal-backdrop">
          <div className="ux-modal-dialog" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={18} color="var(--accent-amber)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Edit Requirement Analysis
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary btn-sm"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Primary Persona
                </label>
                <input
                  type="text"
                  value={editForm.primaryUsers || ''}
                  onChange={(e) => setEditForm({ ...editForm, primaryUsers: e.target.value })}
                  className="ux-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Secondary Personas
                </label>
                <input
                  type="text"
                  value={editForm.secondaryUsers || ''}
                  onChange={(e) => setEditForm({ ...editForm, secondaryUsers: e.target.value })}
                  className="ux-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Primary Goal
                </label>
                <textarea
                  rows={2}
                  value={editForm.businessGoal || ''}
                  onChange={(e) => setEditForm({ ...editForm, businessGoal: e.target.value })}
                  className="ux-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Save Analysis Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

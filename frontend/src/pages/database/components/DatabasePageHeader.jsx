import React, { useState } from 'react';
import {
  Database,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Download,
  History,
  MessageSquare,
  Save,
  Check,
  ChevronDown
} from 'lucide-react';

export const DatabasePageHeader = ({
  model,
  t,
  id,
  navigate,
  onSaveVersion,
  onOpenVersionModal,
  onOpenExportModal,
  onOpenCollabModal,
  onToggleAi,
  onRegenerateComponent,
  generating,
  hasUnsavedChanges
}) => {
  const [showRegenMenu, setShowRegenMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSaveVersion();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={24} color="var(--accent-amber, #D97706)" />
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: 0, color: 'var(--db-text-primary)' }}>
              Database Schema & API Contract Designer
            </h1>
          </div>
          <span
            className="badge badge-green"
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 12,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            {model.status || 'DRAFT'}
          </span>
          <span
            className="badge badge-gray"
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 12,
              backgroundColor: 'var(--db-chip-bg)',
              color: 'var(--db-text-secondary)',
              border: '1px solid var(--db-border)'
            }}
          >
            v{model.version || 1}
          </span>
          {hasUnsavedChanges && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--accent-amber, #D97706)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent-amber, #D97706)' }} />
              Unsaved Changes
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--db-text-muted)', marginTop: 6, marginBottom: 0, maxWidth: 840, lineHeight: 1.4 }}>
          Generate 3NF normalized relational database schemas, PostgreSQL SQL DDL, Prisma ORM definitions, and REST API endpoint specifications.
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Save Version */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: hasUnsavedChanges ? 'var(--accent-amber, #D97706)' : 'var(--db-surface)',
            color: hasUnsavedChanges ? '#FFFFFF' : 'var(--db-text-primary)',
            borderColor: hasUnsavedChanges ? 'var(--accent-amber, #D97706)' : 'var(--db-border)',
            fontSize: '0.78rem',
            fontWeight: 700
          }}
          title="Save Current State as New Snapshot Version"
        >
          <Save size={13} />
          {saving ? 'Saving...' : 'Save Version'}
        </button>

        {/* Version History */}
        <button
          type="button"
          onClick={onOpenVersionModal}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}
          title="View Version History & Compare Diffs"
        >
          <History size={13} />
          History
        </button>

        {/* Collaboration */}
        <button
          type="button"
          onClick={onOpenCollabModal}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}
          title="Collaboration & Approval Review"
        >
          <MessageSquare size={13} />
          Review
        </button>

        {/* Export */}
        <button
          type="button"
          onClick={onOpenExportModal}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}
          title="Export Multi-Format Artifacts"
        >
          <Download size={13} />
          Export
        </button>

        {/* AI Assistant Toggle */}
        <button
          type="button"
          onClick={onToggleAi}
          className="btn btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(217, 119, 6, 0.15)',
            color: 'var(--accent-amber, #D97706)',
            borderColor: 'rgba(217, 119, 6, 0.3)',
            fontSize: '0.78rem',
            fontWeight: 700
          }}
          title="Toggle Contextual AI Schema & API Copilot"
        >
          <Sparkles size={13} />
          AI Copilot
        </button>

        {/* Regenerate Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowRegenMenu(!showRegenMenu)}
            disabled={generating}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}
          >
            <RefreshCw size={13} className={generating ? 'spin' : ''} />
            Regenerate <ChevronDown size={11} />
          </button>

          {showRegenMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                backgroundColor: 'var(--db-surface)',
                border: '1px solid var(--db-border)',
                borderRadius: 6,
                boxShadow: 'var(--db-card-shadow)',
                zIndex: 100,
                minWidth: 190,
                overflow: 'hidden'
              }}
            >
              {[
                { key: 'everything', label: 'Regenerate Everything' },
                { key: 'erd', label: 'Regenerate ERD & Tables' },
                { key: 'sql', label: 'Regenerate SQL DDL' },
                { key: 'prisma', label: 'Regenerate Prisma Schema' },
                { key: 'apis', label: 'Regenerate REST APIs' },
                { key: 'integration', label: 'Regenerate Integration Topology' },
                { key: 'dataflow', label: 'Regenerate Data Flow Sequence' }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setShowRegenMenu(false);
                    onRegenerateComponent(item.key);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    fontSize: '0.75rem',
                    color: item.key === 'everything' ? 'var(--accent-amber, #D97706)' : 'var(--db-text-primary)',
                    fontWeight: item.key === 'everything' ? 700 : 500,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--db-surface-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Next Stage: Planning */}
        <button
          type="button"
          onClick={() => navigate(`/app/workspaces/${id}/planning`)}
          className="btn btn-dark btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700 }}
        >
          {t?.nav?.planning || 'Planning'} <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

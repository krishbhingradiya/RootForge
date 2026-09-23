import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  RotateCcw,
  GitCompare,
  Calendar,
  User,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { api } from '../../../services/api';
import { showToast } from '../../../components/common/Toast';

export const VersionHistoryModal = ({
  isOpen,
  onClose,
  workspaceId,
  currentModel,
  onRestoreSnapshot
}) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [compareVersionId, setCompareVersionId] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchVersions = async () => {
      try {
        setLoading(true);
        const res = await api.getVersions(workspaceId, 'DATABASE');
        const list = res.versions || [];
        setVersions(list);
        if (list.length > 0) {
          setSelectedVersionId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch versions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const activeVersion = versions.find(v => v.id === selectedVersionId);
  const compareVersion = versions.find(v => v.id === compareVersionId);

  let activeData = null;
  if (activeVersion?.snapshotData) {
    try {
      activeData = typeof activeVersion.snapshotData === 'string'
        ? JSON.parse(activeVersion.snapshotData)
        : activeVersion.snapshotData;
    } catch {
      activeData = null;
    }
  }

  let compareData = null;
  if (compareVersion?.snapshotData) {
    try {
      compareData = typeof compareVersion.snapshotData === 'string'
        ? JSON.parse(compareVersion.snapshotData)
        : compareVersion.snapshotData;
    } catch {
      compareData = null;
    }
  }

  const handleRestore = async (version) => {
    if (!window.confirm(`Restore Database Schema snapshot v${version.versionNumber}? Current unsaved edits will be replaced.`)) {
      return;
    }

    try {
      setRestoring(true);
      await api.restoreVersion(workspaceId, version.id);
      showToast(`Restored version v${version.versionNumber}`);
      onRestoreSnapshot?.(version);
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to restore version', 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--db-surface)',
          border: '1px solid var(--db-border)',
          borderRadius: 10,
          width: '940px',
          maxWidth: '96vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--db-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--db-surface-header)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="var(--accent-amber, #D97706)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              Database & API Version History
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, minHeight: 420, overflow: 'hidden' }}>
          {/* Left: Version List */}
          <div style={{ borderRight: '1px solid var(--db-border)', padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, backgroundColor: 'var(--db-surface-muted)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Snapshots ({versions.length})
            </div>

            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--db-text-muted)', fontSize: '0.8rem' }}>
                Loading version history...
              </div>
            ) : versions.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--db-text-muted)', fontSize: '0.78rem' }}>
                No saved snapshot versions yet. Click "Save Version" on the toolbar to create one.
              </div>
            ) : (
              versions.map((v) => {
                const isSelected = selectedVersionId === v.id;
                const isCompare = compareVersionId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVersionId(v.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      backgroundColor: isSelected ? 'rgba(217, 119, 6, 0.15)' : 'var(--db-surface)',
                      border: `1px solid ${isSelected ? 'var(--accent-amber, #D97706)' : 'var(--db-border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isSelected ? 'var(--accent-amber, #D97706)' : 'var(--db-text-primary)' }}>
                        Version {v.versionNumber}
                      </span>
                      {v.versionNumber === currentModel.version && (
                        <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.15)', padding: '1px 5px', borderRadius: 4 }}>
                          CURRENT
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                      {v.notes || `Snapshot v${v.versionNumber}`}
                    </div>

                    <div style={{ fontSize: '0.675rem', color: 'var(--db-text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} /> {new Date(v.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Version Inspector / Compare Diff */}
          <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, backgroundColor: 'var(--db-surface)' }}>
            {activeVersion ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
                      Version {activeVersion.versionNumber} Details
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>
                      Created on {new Date(activeVersion.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleRestore(activeVersion)}
                      disabled={restoring}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      <RotateCcw size={13} /> Restore This Version
                    </button>
                  </div>
                </div>

                {/* Compare Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6 }}>
                  <GitCompare size={14} color="var(--accent-amber, #D97706)" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}>Compare against:</span>
                  <select
                    value={compareVersionId || ''}
                    onChange={(e) => setCompareVersionId(e.target.value || null)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.75rem',
                      borderRadius: 4,
                      backgroundColor: 'var(--db-surface)',
                      border: '1px solid var(--db-border)',
                      color: 'var(--db-text-primary)'
                    }}
                  >
                    <option value="">Select version to compare...</option>
                    {versions.filter(v => v.id !== activeVersion.id).map(v => (
                      <option key={v.id} value={v.id}>
                        Version {v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compare View or Single View */}
                {compareVersion && compareData ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-amber, #D97706)', marginBottom: 6 }}>
                        Version {activeVersion.versionNumber} (Selected)
                      </div>
                      <pre style={{ margin: 0, padding: 12, backgroundColor: 'var(--db-code-bg)', color: 'var(--db-code-text)', border: '1px solid var(--db-border)', fontSize: '0.725rem', fontFamily: 'monospace', borderRadius: 6, maxHeight: 280, overflowY: 'auto' }}>
                        {activeData?.sqlSchema || JSON.stringify(activeData?.entities, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', marginBottom: 6 }}>
                        Version {compareVersion.versionNumber} (Comparison Target)
                      </div>
                      <pre style={{ margin: 0, padding: 12, backgroundColor: 'var(--db-code-bg)', color: 'var(--db-code-text)', border: '1px solid var(--db-border)', fontSize: '0.725rem', fontFamily: 'monospace', borderRadius: 6, maxHeight: 280, overflowY: 'auto' }}>
                        {compareData?.sqlSchema || JSON.stringify(compareData?.entities, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-muted)', marginBottom: 6 }}>
                      SQL DDL Definition Snapshot
                    </div>
                    <pre style={{ margin: 0, padding: 14, backgroundColor: 'var(--db-code-bg)', color: 'var(--db-code-text)', border: '1px solid var(--db-border)', fontSize: '0.75rem', fontFamily: 'monospace', borderRadius: 6, maxHeight: 280, overflowY: 'auto' }}>
                      {activeData?.sqlSchema || '-- No SQL DDL stored in this snapshot.'}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--db-text-muted)' }}>
                Select a version to inspect snapshot metadata and schema code.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

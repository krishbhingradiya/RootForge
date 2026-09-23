import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, X, History, Check } from 'lucide-react';
import { api } from '../../../services/api';
import { showToast } from '../../../components/common/Toast';

export const VersionHistoryModal = ({
  workspaceId,
  currentVersion,
  onClose,
  onVersionRestored
}) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        const res = await api.getUXVersions(workspaceId);
        setVersions(res.versions || []);
      } catch (err) {
        console.error('Failed to load UX versions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [workspaceId]);

  const handleRestore = async (ver) => {
    try {
      setRestoring(true);
      await api.restoreUXVersion(workspaceId, ver.id);
      showToast(`Restored UX design to snapshot v${ver.versionNumber}!`);
      onVersionRestored();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to restore version', 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="ux-modal-backdrop">
      <div className="ux-modal-dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Version History
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ border: 'none', background: 'transparent' }}
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Loading snapshot versions...
          </div>
        ) : versions.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            No previous snapshots saved yet. Use 'Save Snapshot' in header.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {versions.map((ver) => {
              const isCurrent = ver.versionNumber === currentVersion;
              return (
                <div
                  key={ver.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: isCurrent ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        V{ver.versionNumber}
                      </span>
                      {isCurrent && (
                        <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                          Current
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      {ver.notes || 'Snapshot record'}
                    </p>
                    <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                      {new Date(ver.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRestore(ver)}
                      disabled={restoring}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.725rem', padding: '3px 8px' }}
                    >
                      <RotateCcw size={12} color="var(--accent-amber)" /> Restore
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

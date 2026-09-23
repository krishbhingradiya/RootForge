import React, { useState } from 'react';
import {
  Clock,
  RotateCcw,
  MessageSquare,
  Activity,
  Send,
  User,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const HistoryCollaborationView = ({
  vm,
  versions = [],
  loadingVersions,
  onRestoreVersion,
  onSaveVersion,
  comments = [],
  loadingComments,
  onAddComment,
  activityLogs = []
}) => {
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('VERSIONS'); // 'VERSIONS' | 'COMMENTS' | 'ACTIVITY'

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      await onAddComment(commentText.trim());
      setCommentText('');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Sub-navigation bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'VERSIONS', label: 'Version Snapshots', icon: <Clock size={13} />, count: versions.length },
            { key: 'COMMENTS', label: 'Review Notes & Comments', icon: <MessageSquare size={13} />, count: comments.length },
            { key: 'ACTIVITY', label: 'Audit Activity Log', icon: <Activity size={13} />, count: activityLogs.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className="btn btn-sm"
              style={{
                backgroundColor: activeSubTab === tab.key ? 'var(--accent-amber)' : 'var(--bg-subtle)',
                color: activeSubTab === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
                borderColor: activeSubTab === tab.key ? 'var(--accent-amber)' : 'var(--border-subtle)',
                fontWeight: 600,
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  style={{
                    fontSize: '0.66rem',
                    padding: '0 6px',
                    borderRadius: 10,
                    backgroundColor: activeSubTab === tab.key ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-surface)',
                    color: activeSubTab === tab.key ? '#FFFFFF' : 'var(--text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeSubTab === 'VERSIONS' && (
          <button
            onClick={onSaveVersion}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            Save New Version Snapshot
          </button>
        )}
      </div>

      {/* SUB-TAB 1: Version Snapshots */}
      {activeSubTab === 'VERSIONS' && (
        <div className="card" style={{ padding: 20 }}>
          {loadingVersions ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px' }} />
              Loading process version history...
            </div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No historical version snapshots recorded yet. Current active version is v{vm?.version || 1}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {versions.map((v) => {
                const isCurrent = v.versionNumber === vm?.version;
                const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleString() : 'Unknown date';

                return (
                  <div
                    key={v.id || v.versionNumber}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: 8,
                      backgroundColor: isCurrent ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-subtle)',
                      border: `1px solid ${isCurrent ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
                      gap: 16,
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                          Version {v.versionNumber}
                        </span>
                        {isCurrent ? (
                          <span className="badge badge-amber" style={{ fontSize: '0.66rem' }}>ACTIVE</span>
                        ) : (
                          <span className="badge badge-gray" style={{ fontSize: '0.66rem' }}>HISTORICAL</span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                        Created: {dateStr} {v.createdByName ? `• by ${v.createdByName}` : ''}
                      </div>

                      {v.notes && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          {v.notes}
                        </div>
                      )}
                    </div>

                    <div>
                      {isCurrent ? (
                        <span style={{ fontSize: '0.76rem', color: 'var(--accent-green-text)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={13} /> Active Model
                        </span>
                      ) : (
                        <button
                          onClick={() => onRestoreVersion(v.versionNumber)}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}
                        >
                          <RotateCcw size={12} /> Restore v{v.versionNumber}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Review Notes & Comments */}
      {activeSubTab === 'COMMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Post Comment Input Form */}
          <form onSubmit={handleSubmitComment} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Add Process Review Comment
            </label>
            <textarea
              rows={2}
              className="form-textarea"
              placeholder="Leave feedback on process stages, SLAs, or required approval gates..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Send size={12} />
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>

          {/* Comments Feed */}
          <div className="card" style={{ padding: 20 }}>
            {loadingComments ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No review comments posted yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-blue-light)',
                            color: 'var(--accent-blue-text)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}
                        >
                          <User size={13} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                          {c.user?.name || 'Reviewer'}
                        </span>
                        {c.user?.role && (
                          <span className="badge badge-gray" style={{ fontSize: '0.62rem' }}>
                            {c.user.role}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginLeft: 32 }}>
                      {c.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Activity Log */}
      {activeSubTab === 'ACTIVITY' && (
        <div className="card" style={{ padding: 20 }}>
          {activityLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No process activity logs recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 6,
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: 4,
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--accent-amber-text)',
                        border: '1px solid var(--border-medium)'
                      }}
                    >
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>{log.details}</span>
                  </div>

                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

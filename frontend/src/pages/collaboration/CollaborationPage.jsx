import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { showToast } from '../../components/common/Toast';
import {
  Users,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  History,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  UserCheck,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  CornerDownRight,
  RefreshCw
} from 'lucide-react';

/* ── Canonical artifact type mapping ───────────────────────────────────── */
const ARTIFACT_TYPE_LABELS = {
  DISCOVERY: 'Discovery',
  ANALYSIS: 'Business Analysis',
  SOLUTION: 'Solution Builder',
  ARCHITECTURE: 'Architecture',
  PROCESS: 'Process Designer',
  UX: 'UX Designer',
  DATABASE: 'Database & APIs',
  PLANNING: 'Planning'
};

const ALL_ARTIFACT_TYPES = [
  'DISCOVERY', 'ANALYSIS', 'SOLUTION', 'ARCHITECTURE',
  'PROCESS', 'UX', 'DATABASE', 'PLANNING'
];

const COMMENT_CATEGORIES = [
  'GENERAL', ...ALL_ARTIFACT_TYPES
];

const STATUS_OPTIONS = [
  { value: 'IN_REVIEW', label: 'Submit for Review' },
  { value: 'APPROVED', label: 'Approve' },
  { value: 'CHANGES_REQUESTED', label: 'Request Changes' },
  { value: 'REJECTED', label: 'Reject' }
];

const STATUS_COLORS = {
  DRAFT: {
    bg: '#F1F5F9',
    fg: '#334155',
    border: '1px solid #CBD5E1'
  },
  REVIEW: {
    bg: 'var(--accent-blue-light, #DBEAFE)',
    fg: 'var(--accent-blue-text, #1E40AF)',
    border: '1px solid rgba(37, 99, 235, 0.25)'
  },
  IN_REVIEW: {
    bg: 'var(--accent-blue-light, #DBEAFE)',
    fg: 'var(--accent-blue-text, #1E40AF)',
    border: '1px solid rgba(37, 99, 235, 0.25)'
  },
  APPROVED: {
    bg: 'var(--accent-green-light, #D1FAE5)',
    fg: 'var(--accent-green-text, #065F46)',
    border: '1px solid rgba(5, 150, 105, 0.25)'
  },
  COMPLETED: {
    bg: 'var(--accent-green-light, #D1FAE5)',
    fg: 'var(--accent-green-text, #065F46)',
    border: '1px solid rgba(5, 150, 105, 0.25)'
  },
  CHANGES_REQUESTED: {
    bg: 'var(--accent-amber-light, #FEF3C7)',
    fg: 'var(--accent-amber-text, #92400E)',
    border: '1px solid rgba(217, 119, 6, 0.25)'
  },
  REJECTED: {
    bg: 'var(--accent-red-light, #FEE2E2)',
    fg: 'var(--accent-red-text, #DC2626)',
    border: '1px solid rgba(220, 38, 38, 0.25)'
  },
  SUPERSEDED: {
    bg: '#F3F4F6',
    fg: '#4B5563',
    border: '1px solid #D1D5DB'
  },
  PENDING: {
    bg: 'var(--accent-blue-light, #DBEAFE)',
    fg: 'var(--accent-blue-text, #1E40AF)',
    border: '1px solid rgba(37, 99, 235, 0.25)'
  }
};

const STATUS_BADGE_MAP = {
  APPROVED: 'badge-green',
  COMPLETED: 'badge-green',
  IN_REVIEW: 'badge-blue',
  REVIEW: 'badge-blue',
  PENDING: 'badge-blue',
  CHANGES_REQUESTED: 'badge-amber',
  REJECTED: 'badge-red',
  DRAFT: 'badge-gray',
  SUPERSEDED: 'badge-gray'
};

const AUDIT_ACTION_ICONS = {
  VERSION_CREATED: '📦',
  VERSION_RESTORED: '🔄',
  SIGN_OFF_SUBMITTED: '📋',
  SIGN_OFF_APPROVED: '✅',
  SIGN_OFF_REJECTED: '❌',
  CHANGES_REQUESTED: '⚠️',
  COMMENT_ADDED: '💬',
  COMMENT_RESOLVED: '☑️',
  COMMENT_REOPENED: '🔓',
  ARTIFACT_REGENERATED: '⚙️',
  TASK_UPDATED: '📝',
  EXPORT_CREATED: '📤',
  COMMENTED: '💬',
  APPROVED: '✅',
  REVIEWED: '📋',
  VERSIONED: '📦',
  RESTORED: '🔄',
  GENERATED: '⚙️',
  CREATED: '📦',
  UPDATED: '📝',
  EXPORTED: '📤'
};

/* ── Helpers ──────────────────────────────────────────────────────────── */
function getStatusBadge(status) {
  const norm = (status || 'DRAFT').toUpperCase().replace(/\s+/g, '_');
  const colors = STATUS_COLORS[norm] || STATUS_COLORS.DRAFT;
  return {
    backgroundColor: colors.bg,
    color: colors.fg,
    border: colors.border || '1px solid transparent',
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '2.5px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1.2
  };
}

function formatTimestamp(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = d.getDate();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day} ${month} ${year} · ${time}`;
}

function getActionLabel(user, t) {
  if (!user) return t.collaboration?.submitSignoff || 'Submit Sign-off';
  const role = (user.role || '').toUpperCase();
  if (role === 'ADMIN') return t.collaboration?.executiveSignoff || 'Executive Sign-off';
  return t.collaboration?.submitSignoff || 'Submit Sign-off';
}

/* ── Status Badge Component ──────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const norm = (status || 'DRAFT').toUpperCase().replace(/\s+/g, '_');
  const badgeClass = STATUS_BADGE_MAP[norm] || 'badge-gray';
  const colors = STATUS_COLORS[norm] || STATUS_COLORS.DRAFT;
  const label = norm === 'IN_REVIEW' ? 'IN REVIEW' : norm.replace(/_/g, ' ');

  return (
    <span
      className={`badge ${badgeClass}`}
      style={{
        fontSize: '0.68rem',
        fontWeight: 700,
        padding: '2.5px 8px',
        borderRadius: 4,
        letterSpacing: '0.04em',
        backgroundColor: colors.bg,
        color: colors.fg,
        border: colors.border,
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 1.2
      }}
    >
      {label}
    </span>
  );
};

/* ── Restore Confirmation Modal ──────────────────────────────────────── */
const RestoreModal = ({ version, t, onCancel, onConfirm, loading }) => (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  }}>
    <div className="card" style={{
      padding: 28, maxWidth: 440, width: '100%',
      borderTop: '4px solid var(--accent-amber)'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 12 }}>
        {t.collaboration?.restoreTitle || 'Restore Version'} V{version.versionNumber}?
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 20 }}>
        {t.collaboration?.restoreConfirm || 'This will create a new version based on the selected snapshot. The current version will remain available in history.'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-outline" onClick={onCancel} disabled={loading}>
          {t.common?.cancel || 'Cancel'}
        </button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={loading}
          style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}>
          <RotateCcw size={14} /> {t.collaboration?.restoreBtn || 'Create Restored Version'}
        </button>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════ */
/* ── MAIN COMPONENT                                                     */
/* ═══════════════════════════════════════════════════════════════════════ */
export const CollaborationPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  /* ── State ──────────────────────────────────────────────────────────── */
  const [comments, setComments] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [versions, setVersions] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Comment form
  const [newComment, setNewComment] = useState('');
  const [commentCategory, setCommentCategory] = useState('GENERAL');
  const [commentArtifactName, setCommentArtifactName] = useState('');
  const [commentVersionNumber, setCommentVersionNumber] = useState('');
  const [replyToId, setReplyToId] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Sign-off form
  const [approvalArtifact, setApprovalArtifact] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('APPROVED');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Restore modal
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);

  /* ── Data Loading ──────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [collabRes, verRes] = await Promise.all([
        api.getCollaboration(id),
        api.getVersions(id)
      ]);
      setComments(collabRes.comments || []);
      setApprovals(collabRes.approvals || []);
      setActivityLogs(collabRes.activityLogs || []);
      setArtifacts(collabRes.artifacts || []);
      setVersions(verRes.versions || []);

      // Auto-select first available artifact for sign-off form
      if (collabRes.artifacts?.length > 0 && !approvalArtifact) {
        setApprovalArtifact(collabRes.artifacts[0].artifactType);
      }
    } catch (err) {
      console.error('Failed to load collaboration hub:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Derived Data ──────────────────────────────────────────────────── */
  const selectedArtifact = useMemo(() => {
    return artifacts.find(a => a.artifactType === approvalArtifact) || null;
  }, [artifacts, approvalArtifact]);

  // Organize comments into threads (top-level + replies)
  const threadedComments = useMemo(() => {
    const topLevel = comments.filter(c => !c.parentId);
    const replies = {};
    comments.forEach(c => {
      if (c.parentId) {
        if (!replies[c.parentId]) replies[c.parentId] = [];
        replies[c.parentId].push(c);
      }
    });
    return { topLevel, replies };
  }, [comments]);

  /* ── Comment Handlers ──────────────────────────────────────────────── */
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const payload = {
        content: newComment.trim(),
        artifactType: commentCategory,
        parentId: replyToId || undefined
      };

      // Link to artifact if a specific category is selected
      if (commentCategory !== 'GENERAL') {
        const linked = artifacts.find(a => a.artifactType === commentCategory);
        if (linked) {
          payload.artifactName = linked.artifactName;
          payload.versionNumber = linked.version;
        }
      }

      const res = await api.createComment(id, payload);
      setComments([res.comment, ...comments]);
      setNewComment('');
      setReplyToId(null);
      showToast('Comment posted.');
      // Refresh audit logs
      loadData();
    } catch (err) {
      showToast('Failed to post comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleResolveComment = async (commentId, newStatus) => {
    try {
      const res = await api.resolveComment(id, commentId, newStatus);
      setComments(comments.map(c => c.id === commentId ? res.comment : c));
      showToast(`Comment ${newStatus === 'RESOLVED' ? 'resolved' : 'reopened'}.`);
      loadData();
    } catch (err) {
      showToast('Failed to update comment', 'error');
    }
  };

  /* ── Sign-off Handler ──────────────────────────────────────────────── */
  const handleSignApproval = async () => {
    if (!approvalArtifact) {
      showToast('Please select an artifact to sign off on.', 'error');
      return;
    }

    try {
      setSubmittingApproval(true);
      const payload = {
        artifactType: approvalArtifact,
        status: approvalStatus,
        comments: approvalNotes || undefined,
        artifactName: selectedArtifact?.artifactName || undefined,
        versionNumber: selectedArtifact?.version || undefined,
        stage: 'REVIEW'
      };

      const res = await api.submitApproval(id, payload);

      if (res.updated) {
        setApprovals(approvals.map(a =>
          a.id === res.approval.id ? res.approval : a
        ));
        showToast(`Sign-off updated for ${ARTIFACT_TYPE_LABELS[approvalArtifact] || approvalArtifact}.`);
      } else {
        setApprovals([res.approval, ...approvals]);
        showToast(`Signed off on ${ARTIFACT_TYPE_LABELS[approvalArtifact] || approvalArtifact}!`);
      }

      window.dispatchEvent(new CustomEvent('rootforge:workspace-updated', { detail: { workspaceId: id } }));
      setApprovalNotes('');
      loadData();
    } catch (err) {
      showToast('Failed to submit sign-off', 'error');
    } finally {
      setSubmittingApproval(false);
    }
  };

  /* ── Restore Handler ───────────────────────────────────────────────── */
  const handleRestoreVersion = async () => {
    if (!restoreTarget) return;
    try {
      setRestoring(true);
      await api.restoreVersion(id, restoreTarget.id);
      showToast(`Created new version of ${restoreTarget.artifactType} (restored from V${restoreTarget.versionNumber}).`);
      setRestoreTarget(null);
      loadData();
    } catch (err) {
      showToast('Failed to restore version', 'error');
    } finally {
      setRestoring(false);
    }
  };

  /* ── Render: Loading ───────────────────────────────────────────────── */
  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>{t.common?.loading || 'Loading...'}</div>;
  }

  const stageLabel = (type) => {
    const key = type?.toLowerCase();
    return t.stages?.[key] || ARTIFACT_TYPE_LABELS[type] || type || 'Unknown';
  };

  /* ═════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t.collaboration?.title || 'Enterprise Collaboration & Sign-off Hub'}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {t.collaboration?.subtitle || 'Stakeholder reviews, immutable version snapshots, team notes, and governance approvals'}
        </p>
      </div>

      <div className="grid-overview-2col" style={{ gap: 24 }}>
        {/* ════ LEFT COLUMN ═══════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Sign-off Approval Box ──────────────────────────────────── */}
          <div className="card" style={{ padding: 20, borderLeft: '5px solid var(--accent-green)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ShieldCheck size={20} color="#059669" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.collaboration?.approvals || 'Stage Sign-offs & Approvals'}</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              {t.collaboration?.signoffNotes || 'Review Notes'}
            </p>

            {/* Sign-off Form: Artifact + Version + Status + Notes + Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {/* Artifact selector — populated from workspace artifacts */}
                <select
                  className="form-select"
                  value={approvalArtifact}
                  onChange={(e) => setApprovalArtifact(e.target.value)}
                  style={{ fontSize: '0.82rem', flex: '1 1 200px', minWidth: 0 }}
                >
                  <option value="" disabled>{t.collaboration?.selectArtifact || 'Select artifact...'}</option>
                  {artifacts.map(a => (
                    <option key={a.artifactType} value={a.artifactType}>
                      {stageLabel(a.artifactType)} — {a.artifactName} (V{a.version})
                    </option>
                  ))}
                  {/* Fallback if no artifacts generated yet */}
                  {artifacts.length === 0 && ALL_ARTIFACT_TYPES.map(type => (
                    <option key={type} value={type}>{stageLabel(type)}</option>
                  ))}
                </select>

                {/* Version display */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'var(--bg-subtle)', borderRadius: 6,
                  fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0 14px', minHeight: 38
                }}>
                  V{selectedArtifact?.version || '—'}
                </div>

                {/* Status selector */}
                <select
                  className="form-select"
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value)}
                  style={{ fontSize: '0.82rem', flex: '1 1 120px' }}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <input
                  type="text"
                  placeholder={t.collaboration?.commentPlaceholder || 'Share feedback, mention @colleague, or suggest changes...'}
                  className="form-input"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  style={{ flex: '1 1 220px', minWidth: 0 }}
                />

                <button
                  onClick={handleSignApproval}
                  className="btn btn-primary"
                  disabled={!approvalArtifact || submittingApproval}
                  style={{ backgroundColor: 'var(--accent-green)', borderColor: 'var(--accent-green)', whiteSpace: 'nowrap', minHeight: 44 }}
                >
                  <CheckCircle2 size={15} /> {getActionLabel(user, t)}
                </button>
              </div>
            </div>

            {/* ── Past Approvals List ──────────────────────────────────── */}
            {approvals.length > 0 ? (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                  {t.collaboration?.recordedSignoffs || 'RECORDED SIGN-OFFS'} ({approvals.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {approvals.map((appr) => (
                    <div
                      key={appr.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong>{appr.user?.name || 'Reviewer'}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>·</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{appr.user?.role || ''}</span>
                        </div>
                        <StatusBadge status={appr.status} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 600 }}>{stageLabel(appr.artifactType)}</span>
                        {appr.artifactName && <span>· {appr.artifactName}</span>}
                        {appr.versionNumber > 0 && <span className="badge badge-gray" style={{ fontSize: '0.65rem', fontWeight: 800 }}>V{appr.versionNumber}</span>}
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                          {formatTimestamp(appr.updatedAt || appr.createdAt)}
                        </span>
                      </div>
                      {appr.comments && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                          "{appr.comments}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {t.collaboration?.noSignoffs || 'No sign-offs recorded for this workspace.'}
              </div>
            )}
          </div>

          {/* ── Team Discussion & Review Feedback ─────────────────────── */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <MessageSquare size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.collaboration?.teamDiscussion || 'Team Discussion & Review Feedback'}</h3>
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} style={{ marginBottom: 18 }}>
              {replyToId && (
                <div style={{
                  fontSize: '0.78rem', color: 'var(--accent-amber)', marginBottom: 6,
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <CornerDownRight size={14} />
                  Replying to comment...
                  <button type="button" onClick={() => setReplyToId(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                    ✕ Cancel
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <select
                  className="form-select"
                  style={{ width: 180, fontSize: '0.82rem' }}
                  value={commentCategory}
                  onChange={(e) => setCommentCategory(e.target.value)}
                >
                  {COMMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{stageLabel(cat)}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder={t.collaboration?.commentPlaceholder || 'Share feedback, mention @colleague, or suggest changes...'}
                  className="form-input"
                  style={{ flex: 1 }}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="btn btn-primary"
                >
                  <Send size={15} /> {t.collaboration?.postComment || 'Post'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {threadedComments.topLevel.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '12px 0' }}>
                  {t.collaboration?.noComments || 'No review feedback yet.'}
                </div>
              ) : (
                threadedComments.topLevel.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    replies={threadedComments.replies[comment.id] || []}
                    stageLabel={stageLabel}
                    onReply={() => setReplyToId(comment.id)}
                    onResolve={handleResolveComment}
                    t={t}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ════ RIGHT COLUMN ══════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Version History & Snapshots ────────────────────────────── */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <History size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.collaboration?.versionHistory || 'Version History & Snapshots'}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
              {versions.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {t.collaboration?.noVersions || 'No version snapshots available.'}
                </div>
              ) : (
                versions.map((ver) => (
                  <div
                    key={ver.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="badge badge-gray" style={{ fontWeight: 800 }}>V{ver.versionNumber}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                          {stageLabel(ver.artifactType)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {ver.notes || 'Automated snapshot'} · {ver.createdBy?.name || 'System'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {formatTimestamp(ver.createdAt)}
                      </div>
                    </div>

                    <button
                      onClick={() => setRestoreTarget(ver)}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      title={t.collaboration?.restoreTitle || 'Restore this version'}
                    >
                      <RotateCcw size={12} /> {t.collaboration?.restoreTitle?.split(' ')[0] || 'Restore'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── System Audit Trail ─────────────────────────────────────── */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Clock size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.collaboration?.auditTrail || 'System Audit Trail'}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
              {activityLogs.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {t.collaboration?.noAuditEvents || 'No audit events recorded yet.'}
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', gap: 10, fontSize: '0.8rem' }}>
                    <div style={{ fontSize: '1rem', lineHeight: 1 }}>
                      {AUDIT_ACTION_ICONS[log.action] || '•'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <strong>{log.userName || 'System'}</strong>
                        {log.userRole && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 4 }}>({log.userRole})</span>}
                        {' '}: {log.details}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        {log.artifactType && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                            {stageLabel(log.artifactType)}
                          </span>
                        )}
                        {log.versionNumber && (
                          <span className="badge badge-gray" style={{ fontSize: '0.6rem' }}>V{log.versionNumber}</span>
                        )}
                        {log.resultingStatus && <StatusBadge status={log.resultingStatus} />}
                        {log.beforeState && log.afterState && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {log.beforeState} → {log.afterState}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {formatTimestamp(log.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Restore Modal ────────────────────────────────────────────── */}
      {restoreTarget && (
        <RestoreModal
          version={restoreTarget}
          t={t}
          onCancel={() => setRestoreTarget(null)}
          onConfirm={handleRestoreVersion}
          loading={restoring}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════ */
/* ── Comment Card Sub-Component                                         */
/* ═══════════════════════════════════════════════════════════════════════ */
const CommentCard = ({ comment, replies, stageLabel, onReply, onResolve, t }) => {
  const isResolved = comment.status === 'RESOLVED';

  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 8,
      backgroundColor: 'var(--bg-subtle)',
      border: `1px solid ${isResolved ? 'var(--accent-green)' : 'var(--border-subtle)'}`,
      opacity: isResolved ? 0.75 : 1
    }}>
      {/* Comment Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            backgroundColor: 'var(--accent-amber)', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700
          }}>
            {comment.user?.name ? comment.user.name[0] : 'U'}
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{comment.user?.name}</span>
          {comment.user?.role && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>({comment.user.role})</span>
          )}
          <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
            {stageLabel(comment.artifactType)}
          </span>
          {isResolved && (
            <span style={{ fontSize: '0.65rem', color: 'var(--accent-green)', fontWeight: 600 }}>
              ✓ {t.collaboration?.resolved || 'Resolved'}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {formatTimestamp(comment.createdAt)}
        </span>
      </div>

      {/* Artifact linkage */}
      {comment.artifactName && (
        <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', marginBottom: 4 }}>
          {comment.artifactName}{comment.versionNumber ? ` · V${comment.versionNumber}` : ''}
        </div>
      )}

      {/* Comment body */}
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: 4 }}>
        {comment.content}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={onReply}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.72rem', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          <CornerDownRight size={12} /> {t.collaboration?.reply || 'Reply'}
        </button>
        {isResolved ? (
          <button
            onClick={() => onResolve(comment.id, 'REOPENED')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.72rem', color: 'var(--accent-amber)',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <RefreshCw size={12} /> {t.collaboration?.reopen || 'Reopen'}
          </button>
        ) : (
          <button
            onClick={() => onResolve(comment.id, 'RESOLVED')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.72rem', color: 'var(--accent-green)',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <CheckCheck size={12} /> {t.collaboration?.resolve || 'Resolve'}
          </button>
        )}
      </div>

      {/* Threaded Replies */}
      {replies.length > 0 && (
        <div style={{ marginTop: 10, marginLeft: 20, borderLeft: '2px solid var(--border-subtle)', paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {replies.map(reply => (
            <div key={reply.id} style={{ fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  backgroundColor: 'var(--accent-amber)', color: '#FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700
                }}>
                  {reply.user?.name ? reply.user.name[0] : 'U'}
                </div>
                <strong style={{ fontSize: '0.8rem' }}>{reply.user?.name}</strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {formatTimestamp(reply.createdAt)}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 2, marginLeft: 26 }}>
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

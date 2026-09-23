import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { api } from '../../../services/api';
import { showToast } from '../../../components/common/Toast';

export const DatabaseCollaborationModal = ({
  isOpen,
  onClose,
  workspaceId,
  model,
  onStatusChange
}) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(model.status || 'DRAFT');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCollab = async () => {
      try {
        const res = await api.getCollaboration(workspaceId);
        if (res.comments) {
          setComments(res.comments);
        }
      } catch (err) {
        console.warn('Failed to load comments:', err.message);
      }
    };

    fetchCollab();
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      const res = await api.addComment(workspaceId, {
        text: newComment.trim(),
        artifactType: 'DATABASE',
        context: 'Database Schema & API Designer Review'
      });

      setComments(prev => [
        ...prev,
        res.comment || {
          id: `cmt_${Date.now()}`,
          text: newComment.trim(),
          createdAt: new Date().toISOString(),
          user: { name: 'Consultant Lead' }
        }
      ]);
      setNewComment('');
      showToast('Comment posted');
    } catch (err) {
      showToast(err.message || 'Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStat) => {
    try {
      setApproving(true);
      await api.submitApproval(workspaceId, {
        stage: 'database',
        status: newStat,
        notes: approvalNotes || `Status transitioned to ${newStat}`
      });

      setStatus(newStat);
      onStatusChange?.(newStat);
      showToast(`Database design status updated to ${newStat}`);
    } catch (err) {
      showToast(err.message || 'Failed to update approval status', 'error');
    } finally {
      setApproving(false);
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
          width: '740px',
          maxWidth: '96vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
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
            <MessageSquare size={18} color="var(--accent-amber, #D97706)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              Design Review & Team Collaboration
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

        {/* Content Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden', backgroundColor: 'var(--db-surface)' }}>
          {/* Left: Approval Workflow State */}
          <div style={{ padding: 18, borderRight: '1px solid var(--db-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase' }}>
              Approval Sign-Off Status
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {['DRAFT', 'REVIEW', 'APPROVED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleUpdateStatus(st)}
                  disabled={approving}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    border: '1px solid var(--db-border)',
                    cursor: 'pointer',
                    backgroundColor: status === st
                      ? (st === 'APPROVED' ? '#059669' : st === 'REVIEW' ? 'var(--accent-amber, #D97706)' : 'var(--accent-amber, #D97706)')
                      : 'var(--db-surface-muted)',
                    color: status === st ? '#FFFFFF' : 'var(--db-text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--db-text-primary)', backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', padding: 12, borderRadius: 6, lineHeight: 1.4 }}>
              <strong>Current Governance State:</strong>{' '}
              <span style={{ color: status === 'APPROVED' ? '#059669' : 'var(--accent-amber, #D97706)', fontWeight: 700 }}>
                {status}
              </span>
              <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>
                Transitioning to <strong>APPROVED</strong> locks the relational DDL and REST API contract for implementation planning and backend code generation.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)', fontWeight: 600 }}>Sign-Off Review Notes</label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Optional architectural sign-off notes or review feedback..."
                style={{
                  height: 80,
                  padding: 10,
                  fontSize: '0.78rem',
                  backgroundColor: 'var(--db-surface-muted)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-text-primary)',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>
          </div>

          {/* Right: Comments Thread */}
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase' }}>
              Design Review Feedback ({comments.length})
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {comments.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--db-text-muted)', fontSize: '0.78rem' }}>
                  No comments posted on this schema version yet.
                </div>
              ) : (
                comments.map((cmt, idx) => (
                  <div key={cmt.id || idx} style={{ padding: 10, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>
                        {cmt.user?.name || 'Reviewer'}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--db-text-muted)' }}>
                        {new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--db-text-secondary)', lineHeight: 1.3 }}>
                      {cmt.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Leave review note or feedback..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  backgroundColor: 'var(--db-surface-muted)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-text-primary)',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="btn btn-primary btn-sm"
                style={{ padding: '0 12px' }}
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

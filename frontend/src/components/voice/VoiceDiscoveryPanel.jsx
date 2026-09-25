import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneCall, PhoneOff, PhoneForwarded, Radio, Clock, ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle, Copy, Check, Sparkles, Info } from 'lucide-react';
import api from '../../services/api';

/**
 * Status badge style mappings
 */
const STATUS_CONFIG = {
  INITIATED: { label: 'Initiating...', color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.3)', icon: Radio },
  RINGING: { label: 'Ringing...', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', icon: PhoneForwarded },
  CONNECTED: { label: 'Connected', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', icon: PhoneCall },
  IN_PROGRESS: { label: 'Discovery In Progress', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', icon: PhoneCall },
  COMPLETED: { label: 'Completed', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)', border: 'rgba(107, 114, 128, 0.25)', icon: CheckCircle2 },
  FAILED: { label: 'Call Ended / Failed', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', icon: AlertCircle },
  CANCELLED: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', icon: AlertCircle }
};

export const VoiceDiscoveryPanel = ({ workspaceId }) => {
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [endingCall, setEndingCall] = useState(false);
  const [copied, setCopied] = useState(false);
  const [callDuration, setCallDuration] = useState('00:00');

  const pollIntervalRef = useRef(null);

  // Format seconds to MM:SS
  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Fetch voice configuration & recent sessions
  const loadVoiceData = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [cfg, sessList] = await Promise.allSettled([
        api.getVoiceConfig(),
        api.listWorkspaceVoiceSessions(workspaceId)
      ]);

      if (cfg.status === 'fulfilled' && cfg.value) {
        setConfig(cfg.value);
      }

      if (sessList.status === 'fulfilled' && Array.isArray(sessList.value)) {
        setSessions(sessList.value);
        // Find most recent active or completed session
        const currentActive = sessList.value.find(s => ['INITIATED', 'RINGING', 'CONNECTED', 'IN_PROGRESS'].includes(s.status));
        setActiveSession(currentActive || sessList.value[0] || null);
      }
    } catch (err) {
      console.warn('[VOICE] Failed to fetch voice discovery state:', err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Initial load
  useEffect(() => {
    loadVoiceData();
  }, [loadVoiceData]);

  // Dynamic Polling: poll every 3s while active call is in progress, or 10s if configured and idle
  useEffect(() => {
    if (config && !config.isConfigured) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const isLive = activeSession && ['INITIATED', 'RINGING', 'CONNECTED', 'IN_PROGRESS'].includes(activeSession.status);
    const intervalMs = isLive ? 3000 : 10000;

    pollIntervalRef.current = setInterval(() => {
      loadVoiceData();
    }, intervalMs);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeSession, config, loadVoiceData]);

  // Live Timer derived from backend connectedAt / startedAt timestamp
  useEffect(() => {
    if (!activeSession) {
      setCallDuration('00:00');
      return;
    }

    if (activeSession.status === 'COMPLETED' || activeSession.status === 'FAILED') {
      if (activeSession.durationSeconds) {
        setCallDuration(formatDuration(activeSession.durationSeconds));
      }
      return;
    }

    const startTimeStr = activeSession.connectedAt || activeSession.startedAt;
    if (!startTimeStr) return;

    const startMs = new Date(startTimeStr).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000));
      setCallDuration(formatDuration(elapsedSec));
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);

    return () => clearInterval(timerId);
  }, [activeSession]);

  // Handle End Call action
  const handleEndCall = async () => {
    if (!activeSession?.id || endingCall) return;
    try {
      setEndingCall(true);
      const res = await api.endVoiceSession(activeSession.id);
      if (res?.session) {
        setActiveSession(res.session);
      }
      await loadVoiceData();
    } catch (err) {
      console.error('[VOICE] Error ending call:', err);
    } finally {
      setEndingCall(false);
    }
  };

  const handleCopyNumber = (num) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConfigured = Boolean(config?.isConfigured);
  const isLive = activeSession && ['INITIATED', 'RINGING', 'CONNECTED', 'IN_PROGRESS'].includes(activeSession.status);
  const statusInfo = STATUS_CONFIG[activeSession?.status] || {
    label: 'Waiting for Call',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.1)',
    border: 'rgba(217, 119, 6, 0.25)',
    icon: Radio
  };
  const StatusIcon = statusInfo.icon;

  // Unconfigured State (Graceful fallback when TWILIO_PHONE_NUMBER is not set)
  if (!loading && !isConfigured) {
    return (
      <div
        className="card voice-discovery-panel"
        style={{
          padding: '14px 16px',
          marginBottom: 16,
          borderRadius: 12,
          backgroundColor: 'var(--bg-surface, #181B20)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(107, 114, 128, 0.12)',
                color: 'var(--text-muted, #9CA3AF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PhoneOff size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AI Voice Discovery (Twilio)
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Twilio Voice is not configured (TWILIO_PHONE_NUMBER missing in .env)
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 10,
              backgroundColor: 'rgba(107, 114, 128, 0.12)',
              color: 'var(--text-muted, #9CA3AF)',
              border: '1px solid rgba(107, 114, 128, 0.2)'
            }}
          >
            Development Mode
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card voice-discovery-panel"
      style={{
        padding: 16,
        marginBottom: 16,
        borderRadius: 12,
        backgroundColor: 'var(--bg-surface, #181B20)',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(217, 119, 6, 0.15)',
              color: isLive ? '#10B981' : '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <PhoneCall size={17} />
          </div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              AI Voice Discovery
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Phase 1 • Twilio Inbound Voice Pipeline
            </div>
          </div>
        </div>

        {/* Live Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 12,
            backgroundColor: statusInfo.bg,
            border: `1px solid ${statusInfo.border}`,
            color: statusInfo.color,
            fontSize: '0.72rem',
            fontWeight: 700
          }}
        >
          <StatusIcon size={13} className={isLive ? 'animate-pulse' : ''} />
          <span>{activeSession ? statusInfo.label : 'Waiting for Inbound Call'}</span>
        </div>
      </div>

      {/* Main Stats / Info Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          backgroundColor: 'var(--bg-subtle, #1E232D)',
          padding: 12,
          borderRadius: 8,
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
          marginBottom: 12
        }}
      >
        {/* Phone Number to Call */}
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Twilio Phone Number
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {config?.phoneNumber || 'Not configured'}
            </span>
            {config?.phoneNumber && (
              <button
                type="button"
                onClick={() => handleCopyNumber(config.phoneNumber)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  color: copied ? '#10B981' : 'var(--text-muted)'
                }}
                title="Copy phone number"
                aria-label="Copy phone number"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* Duration */}
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Call Duration
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Clock size={13} color="var(--text-muted)" />
            <span>{callDuration}</span>
          </div>
        </div>

        {/* Language */}
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Language
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent-amber, #D97706)' }}>
            <Sparkles size={12} />
            <span>AUTO DETECT</span>
          </div>
        </div>

        {/* Session ID */}
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Session ID
          </div>
          <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeSession?.id ? activeSession.id.slice(0, 14) + '...' : 'None active'}
          </div>
        </div>
      </div>

      {/* Footer / Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={13} color="#10B981" />
          <span>Webhook signature validated • Multilingual ready</span>
        </div>

        {isLive && (
          <button
            type="button"
            onClick={handleEndCall}
            disabled={endingCall}
            className="btn btn-secondary"
            style={{
              padding: '4px 12px',
              fontSize: '0.75rem',
              color: '#EF4444',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <PhoneOff size={13} />
            <span>{endingCall ? 'Ending...' : 'End Call'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

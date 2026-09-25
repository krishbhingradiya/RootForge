import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, PhoneForwarded, X, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Sparkles, Volume2 } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' }
];

export const OutboundVoiceCallModal = ({
  isOpen = false,
  onClose = () => {},
  workspaceId = null
}) => {
  const { t } = useLanguage();

  const [selectedCountryCode, setSelectedCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callState, setCallState] = useState('idle'); // 'idle' | 'starting' | 'calling' | 'connected' | 'active' | 'completed' | 'error'
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  const pollTimerRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Clean up timers on unmount or close
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  // Duration counter when call is connected
  useEffect(() => {
    if (callState === 'connected' || callState === 'active') {
      durationTimerRef.current = setInterval(() => {
        setCallDurationSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // Session status polling
  useEffect(() => {
    if (activeSessionId && (callState === 'starting' || callState === 'calling' || callState === 'connected' || callState === 'active')) {
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await api.getVoiceSessionStatus(activeSessionId);
          if (res && res.session) {
            const s = res.session.status;
            if (s === 'ringing' || s === 'initiating') {
              setCallState('calling');
              setStatusMessage('Your phone should ring shortly.');
            } else if (s === 'connected' || s === 'active') {
              setCallState('active');
              setStatusMessage('AI Voice Session Active');
            } else if (s === 'completed') {
              setCallState('completed');
              setStatusMessage('Call Completed');
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            } else if (s === 'failed') {
              setCallState('error');
              setErrorMessage(res.session.errorMessage || 'Unable to connect the voice call. Please try again.');
              setStatusMessage('Call Failed');
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            }
          }
        } catch (err) {
          console.warn('[OutboundVoiceCall] Polling error:', err.message);
        }
      }, 2500);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeSessionId, callState]);

  if (!isOpen) return null;

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleStartCall = async (e) => {
    if (e) e.preventDefault();
    if (callState === 'starting' || callState === 'calling') return;

    const trimmedNumber = phoneNumber.trim().replace(/[\s\-\(\)\.]/g, '');
    if (!trimmedNumber) {
      setCallState('error');
      setErrorMessage('Please enter your mobile phone number.');
      setStatusMessage('Invalid Number');
      return;
    }

    const fullPhoneNumber = trimmedNumber.startsWith('+')
      ? trimmedNumber
      : `${selectedCountryCode}${trimmedNumber}`;

    setCallState('starting');
    setStatusMessage('Starting your AI call...');
    setErrorMessage('');
    setCallDurationSeconds(0);

    try {
      const res = await api.initiateVoiceCall({
        phoneNumber: fullPhoneNumber,
        countryCode: selectedCountryCode,
        nationalNumber: trimmedNumber,
        workspaceId
      });

      if (res && res.success) {
        setActiveSessionId(res.sessionId);
        setCallState('calling');
        const masked = res.phoneNumberMasked || fullPhoneNumber;
        setStatusMessage(`Calling ${masked}... Please answer when it rings.`);
      } else {
        setCallState('error');
        setErrorMessage(res?.message || res?.error || 'Unable to start the AI voice call.');
        setStatusMessage('Call Failed');
      }
    } catch (err) {
      console.error('[OutboundVoiceCall] Failed to start call:', err);
      setCallState('error');
      const userMessage = err?.data?.message || err?.message || 'Unable to connect to the voice gateway. Please verify your phone number and try again.';
      setErrorMessage(userMessage);
      setStatusMessage('Call Failed');
    }
  };

  const handleEndCall = async () => {
    if (!activeSessionId) {
      setCallState('idle');
      setStatusMessage('Ready');
      return;
    }

    try {
      await api.cancelVoiceCall(activeSessionId);
    } catch (err) {
      console.warn('Could not cancel call on server:', err.message);
    } finally {
      setCallState('completed');
      setStatusMessage('Call Ended');
    }
  };

  const handleReset = () => {
    setCallState('idle');
    setStatusMessage('Ready');
    setErrorMessage('');
    setActiveSessionId(null);
    setCallDurationSeconds(0);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && callState !== 'calling' && callState !== 'active') {
          onClose();
        }
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--bg-surface, #1E232D)',
          border: '1px solid var(--border-medium, #2A313C)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          padding: 0
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-subtle, #2A313C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#181C24'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
                color: 'var(--accent-amber, #D97706)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PhoneCall size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #FAF8F5)' }}>
                AI Voice Business Consultant
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', margin: 0, marginTop: 2 }}>
                Talk to your AI Business Consultant by phone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: 6, borderRadius: '50%', color: 'var(--text-muted)' }}
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '22px 24px' }}>
          {/* Status Badge */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: callState === 'active' || callState === 'connected'
                ? 'rgba(16, 185, 129, 0.12)'
                : callState === 'calling' || callState === 'starting'
                ? 'rgba(217, 119, 6, 0.12)'
                : callState === 'error'
                ? 'rgba(239, 68, 68, 0.12)'
                : 'var(--bg-subtle, #181C24)',
              border: `1px solid ${
                callState === 'active' || callState === 'connected'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : callState === 'calling' || callState === 'starting'
                  ? 'rgba(217, 119, 6, 0.3)'
                  : callState === 'error'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'var(--border-subtle, #2A313C)'
              }`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {callState === 'starting' || callState === 'calling' ? (
                <Loader2 size={18} className="spin" color="var(--accent-amber, #D97706)" />
              ) : callState === 'active' || callState === 'connected' ? (
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10B981', animation: 'pulse 1s infinite' }} />
              ) : callState === 'error' ? (
                <AlertCircle size={18} color="#EF4444" />
              ) : callState === 'completed' ? (
                <CheckCircle2 size={18} color="#10B981" />
              ) : (
                <Sparkles size={18} color="var(--accent-amber, #D97706)" />
              )}
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: callState === 'error' ? '#EF4444' : callState === 'active' ? '#10B981' : 'var(--text-primary)'
                }}
              >
                {statusMessage}
              </span>
            </div>

            {(callState === 'active' || callState === 'connected') && (
              <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 700, color: '#10B981' }}>
                {formatDuration(callDurationSeconds)}
              </span>
            )}
          </div>

          {/* Active Call Visualization */}
          {callState === 'calling' || callState === 'active' || callState === 'connected' ? (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                borderRadius: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: '1px dashed var(--border-medium, #2A313C)',
                marginBottom: 20
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: callState === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                  color: callState === 'active' ? '#10B981' : 'var(--accent-amber)',
                  border: `2px solid ${callState === 'active' ? '#10B981' : 'var(--accent-amber)'}`,
                  animation: 'pulse 1.8s infinite'
                }}
              >
                <PhoneCall size={30} />
              </div>

              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {callState === 'active' ? 'Voice Session In Progress' : 'Calling Your Mobile Phone'}
              </h4>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {callState === 'active'
                  ? 'Speak naturally to discuss architecture, business workflows, and constraints.'
                  : 'Please answer your phone when it rings to connect to RootForge AI.'}
              </p>

              <button
                type="button"
                onClick={handleEndCall}
                className="btn btn-secondary"
                style={{
                  marginTop: 20,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  borderColor: '#EF4444',
                  padding: '8px 24px',
                  fontWeight: 600
                }}
              >
                <PhoneOff size={16} />
                <span>End Call</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleStartCall}>
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="user-mobile-input"
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 8
                  }}
                >
                  Mobile Number
                </label>

                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                    disabled={callState === 'starting'}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #2A313C)',
                      backgroundColor: 'var(--bg-subtle, #181C24)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                      minWidth: 100
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <input
                    id="user-mobile-input"
                    type="tel"
                    placeholder="9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={callState === 'starting'}
                    autoFocus
                    className="form-input"
                    style={{
                      flex: 1,
                      fontSize: '0.95rem',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border-medium, #2A313C)',
                      backgroundColor: 'var(--bg-subtle, #181C24)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Example: 9876543210 (We will dial your phone via our secure AI voice bridge).
                </span>
              </div>

              {/* Error Message Display */}
              {errorMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#EF4444',
                    fontSize: '0.78rem',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                {callState === 'error' || callState === 'completed' ? (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn btn-secondary"
                    style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                  >
                    Reset
                  </button>
                ) : null}

                <button
                  type="submit"
                  disabled={callState === 'starting' || !phoneNumber.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 24px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'var(--accent-amber, #D97706)',
                    borderColor: 'var(--accent-amber, #D97706)',
                    color: '#FFFFFF'
                  }}
                >
                  {callState === 'starting' ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Starting AI Call...</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall size={16} />
                      <span>Start AI Voice Call</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security / Privacy Footer */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderTop: '1px solid var(--border-subtle, #2A313C)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}
        >
          <ShieldCheck size={14} color="var(--accent-amber, #D97706)" />
          <span>Outbound calls are routed via RootForge secure backend. No credentials exposed to client.</span>
        </div>
      </div>
    </div>
  );
};

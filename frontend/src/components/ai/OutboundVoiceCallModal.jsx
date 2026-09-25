import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneCall, PhoneOff, PhoneForwarded, X, Loader2, AlertCircle, 
  CheckCircle2, ShieldCheck, Sparkles, Volume2, Download, FileText, 
  ArrowRight, MessageSquare, ListCheck, Layers
} from 'lucide-react';
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
  workspaceId = null,
  onDiscoveryComplete = null
}) => {
  const { t } = useLanguage();

  const [selectedCountryCode, setSelectedCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callState, setCallState] = useState('idle'); // 'idle' | 'starting' | 'calling' | 'connected' | 'active' | 'completed' | 'error'
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  // Completed Discovery Data
  const [discoveryData, setDiscoveryData] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loadingRequirements, setLoadingRequirements] = useState(false);

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
              setStatusMessage('Calling your phone... Please answer when it rings.');
            } else if (s === 'connected' || s === 'active') {
              setCallState('active');
              setStatusMessage('AI Voice Agent connected — Listening & Analyzing...');
            } else if (s === 'completed') {
              setCallState('completed');
              setStatusMessage('Discovery Completed');
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              fetchRequirements(activeSessionId);
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

  const fetchRequirements = async (sessionId) => {
    setLoadingRequirements(true);
    try {
      const data = await api.getVoiceSessionRequirements(sessionId);
      if (data && data.success) {
        setDiscoveryData(data);
        if (typeof onDiscoveryComplete === 'function') {
          onDiscoveryComplete(data);
        }
      }
    } catch (err) {
      console.warn('[OutboundVoiceCall] Could not fetch requirements:', err.message);
    } finally {
      setLoadingRequirements(false);
    }
  };

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
    setDiscoveryData(null);
    setShowTranscript(false);

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
      setStatusMessage('Discovery Completed');
      fetchRequirements(activeSessionId);
    }
  };

  const handleReset = () => {
    setCallState('idle');
    setStatusMessage('Ready');
    setErrorMessage('');
    setActiveSessionId(null);
    setCallDurationSeconds(0);
    setDiscoveryData(null);
    setShowTranscript(false);
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownloadMarkdown = async () => {
    setDownloading(true);
    try {
      // 1. If markdown content is already available in memory, download instantly via Blob
      const inlineMarkdown = discoveryData?.markdownContent || discoveryData?.generatedDoc?.markdownContent;
      const targetFilename = discoveryData?.fileName || discoveryData?.generatedDoc?.fileName || `project-requirements-${activeSessionId || 'session'}.md`;

      if (inlineMarkdown && inlineMarkdown.trim()) {
        const blob = new Blob([inlineMarkdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = targetFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      // 2. Otherwise request requirements and generate document on the fly
      if (activeSessionId) {
        const reqData = await api.getVoiceSessionRequirements(activeSessionId);
        const fetchedMd = reqData?.markdownContent || reqData?.generatedDoc?.markdownContent;
        const fetchedName = reqData?.fileName || reqData?.generatedDoc?.fileName || `project-requirements-${activeSessionId}.md`;

        if (fetchedMd && fetchedMd.trim()) {
          setDiscoveryData(reqData);
          const blob = new Blob([fetchedMd], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fetchedName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          return;
        }

        // 3. Direct URL fallback
        const downloadUrl = api.getVoiceSessionMarkdownUrl(activeSessionId);
        window.open(downloadUrl, '_blank');
      }
    } catch (err) {
      console.warn('[VoiceModal] Download error:', err);
      if (activeSessionId) {
        window.open(api.getVoiceSessionMarkdownUrl(activeSessionId), '_blank');
      }
    } finally {
      setDownloading(false);
    }
  };


  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: callState === 'completed' && discoveryData ? 620 : 480,
          backgroundColor: 'var(--bg-surface, #1E232D)',
          border: '1px solid var(--border-medium, #2A313C)',
          borderRadius: 16,
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          padding: 0,
          transition: 'all 0.3s ease'
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
                Real-time discovery agent powered by Groq & Multilingual Voice.
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
        <div style={{ padding: '22px 24px', maxHeight: '75vh', overflowY: 'auto' }}>
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
                : callState === 'completed'
                ? 'rgba(16, 185, 129, 0.12)'
                : 'var(--bg-subtle, #181C24)',
              border: `1px solid ${
                callState === 'active' || callState === 'connected'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : callState === 'calling' || callState === 'starting'
                  ? 'rgba(217, 119, 6, 0.3)'
                  : callState === 'error'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : callState === 'completed'
                  ? 'rgba(16, 185, 129, 0.3)'
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
                  color: callState === 'error' ? '#EF4444' : (callState === 'active' || callState === 'completed') ? '#10B981' : 'var(--text-primary)'
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
                {callState === 'active' ? 'Voice Consultant Active' : 'Calling Your Mobile Phone'}
              </h4>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {callState === 'active'
                  ? 'Speak freely in English, Hindi, or Gujarati. AI is reasoning and asking focused counter-questions.'
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
                <span>Finish / End Call</span>
              </button>
            </div>
          ) : callState === 'completed' ? (
            /* Completed Discovery View */
            <div>
              <div
                style={{
                  padding: '16px 18px',
                  borderRadius: 12,
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  marginBottom: 16
                }}
              >
                <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} />
                  <span>Requirements Discovered & Saved</span>
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary, #CBD5E1)', lineHeight: 1.5 }}>
                  The 28-section <code style={{ color: '#F59E0B' }}>project-requirements.md</code> document has been generated and linked directly to your RootForge Solution Builder pipeline.
                </p>
              </div>

              {/* Discovered Highlights Summary */}
              {discoveryData?.requirements && (
                <div
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    border: '1px solid var(--border-subtle, #2A313C)',
                    marginBottom: 16
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    Discovered Overview
                  </span>
                  {discoveryData.requirements.business_problem && (
                    <div style={{ marginTop: 8, fontSize: '0.84rem' }}>
                      <strong style={{ color: 'var(--accent-amber, #D97706)' }}>Problem: </strong>
                      <span style={{ color: 'var(--text-primary)' }}>{discoveryData.requirements.business_problem}</span>
                    </div>
                  )}
                  {Array.isArray(discoveryData.requirements.features) && discoveryData.requirements.features.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: '0.84rem' }}>
                      <strong style={{ color: '#10B981' }}>Key Features: </strong>
                      <span style={{ color: 'var(--text-primary)' }}>{discoveryData.requirements.features.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript Drawer Toggle */}
              {discoveryData?.conversation && discoveryData.conversation.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <button
                    type="button"
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="btn btn-ghost"
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: 'var(--accent-amber, #D97706)'
                    }}
                  >
                    <MessageSquare size={15} />
                    <span>{showTranscript ? 'Hide Conversation Transcript' : `View Conversation Transcript (${discoveryData.conversation.length} turns)`}</span>
                  </button>

                  {showTranscript && (
                    <div
                      style={{
                        marginTop: 10,
                        maxHeight: 220,
                        overflowY: 'auto',
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                        border: '1px solid var(--border-medium, #2A313C)',
                        fontSize: '0.8rem'
                      }}
                    >
                      {discoveryData.conversation.map((c, idx) => (
                        <div key={idx} style={{ marginBottom: 10 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: c.role === 'assistant' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: c.role === 'assistant' ? 'var(--accent-amber)' : '#10B981',
                              marginRight: 8
                            }}
                          >
                            {c.role}
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>{c.text}</span>
                          {c.englishText && c.englishText !== c.text && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: 8, marginTop: 2, fontStyle: 'italic' }}>
                              Normalized: {c.englishText}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-secondary"
                  style={{ padding: '9px 16px', fontSize: '0.84rem' }}
                >
                  Start New Call
                </button>

                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  disabled={downloading}
                  className="btn btn-secondary"
                  style={{
                    padding: '9px 16px',
                    fontSize: '0.84rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {downloading ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      <span>Generating .md...</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      <span>Download .md</span>
                    </>
                  )}
                </button>


                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{
                    padding: '9px 20px',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'var(--accent-amber, #D97706)',
                    borderColor: 'var(--accent-amber, #D97706)',
                    color: '#FFFFFF'
                  }}
                >
                  <span>Continue with Solution Builder</span>
                  <ArrowRight size={15} />
                </button>
              </div>
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
                    placeholder="8200818728"
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
                  Example: 8200818728 (We will dial your phone via our secure AI voice bridge).
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
                {callState === 'error' ? (
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

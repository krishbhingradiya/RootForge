import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Mic, MicOff, Square, Loader2, Volume2, VolumeX, AlertCircle, ShieldAlert } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useLanguage } from '../../context/LanguageContext';
import { WorkspaceContext } from '../../context/WorkspaceContext';
import api from '../../services/api';
import {
  resolveConversationalLanguage,
  LANGUAGE_DISPLAY_MAP,
  SUPPORTED_LANGUAGES
} from '../../utils/languageDetector';

// Map application language codes to Web Speech API BCP-47 locale tags
const SPEECH_LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  gu: 'gu-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-PK'
};

/**
 * Robust Multilingual Voice Input Controller.
 * 
 * Features:
 * 1. Native Capacitor & Web MediaRecorder audio capture with automatic MIME type discovery.
 * 2. Multi-language Gemini audio transcription via backend /api/workspaces/:id/chats/transcribe-audio.
 * 3. Web Speech API real-time continuous streaming on desktop browsers with automated fallback.
 * 4. Comprehensive permission tracking and resilient auto-recovery.
 * 5. Short/empty audio detection with localized feedback.
 * 6. Direct insertion of speech transcript into the active chat input.
 */
export const ChatVoiceInput = ({
  lang = 'en',
  workspaceId = null,
  sessionId = null,
  onInterimPreview = null,
  onFinalTranscript = null,
  onTranscript = null, // backwards compatibility
  disabled = false
}) => {
  const { t } = useLanguage();
  const wsContext = useContext(WorkspaceContext);
  const currentWorkspace = wsContext?.currentWorkspace;

  const [state, setState] = useState('idle'); // 'idle' | 'starting' | 'listening' | 'processing' | 'error' | 'permissionDenied' | 'unsupported'
  const [errorMessage, setErrorMessage] = useState('');

  // Recognition and buffer refs
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const recordingStartTimeRef = useRef(0);

  const isListeningRef = useRef(false);
  const isUserStoppingRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const restartCountRef = useRef(0);

  // Separate final and interim transcript accumulators
  const accumulatedFinalTextRef = useRef('');
  const currentSessionFinalTextRef = useRef('');
  const currentInterimTextRef = useRef('');
  const activeVoiceLangRef = useRef(lang);

  // Keep activeVoiceLangRef in sync with lang prop
  useEffect(() => {
    activeVoiceLangRef.current = lang;
  }, [lang]);

  // Check browser capabilities
  const hasWebSpeech = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasMediaDevices = typeof navigator !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const isSupported = hasWebSpeech || hasMediaDevices;

  useEffect(() => {
    if (!isSupported) {
      setState('unsupported');
    }
  }, [isSupported]);

  // Teardown when language changes while active
  useEffect(() => {
    if (isListeningRef.current) {
      console.log('[VOICE DEBUG] Language switched during recording. Safely aborting current session.');
      stopListeningCleanly(false);
    }
  }, [lang]);

  // Teardown when disabled transitions to true (e.g. message sending)
  useEffect(() => {
    if (disabled && isListeningRef.current) {
      console.log('[VOICE DEBUG] Chat input disabled while recording. Safely stopping recognition.');
      stopListeningCleanly(false);
    }
  }, [disabled]);

  // Reset state and re-check permission when application resumes from Android Settings / background
  useEffect(() => {
    const handleAppResume = () => {
      console.log('[VOICE DEBUG] App resumed/became visible. Clearing stale permission states.');
      setState(prev => (prev === 'permissionDenied' || prev === 'error' ? 'idle' : prev));
      setErrorMessage('');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleAppResume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    let appListenerHandle = null;
    try {
      if (typeof App !== 'undefined' && App.addListener) {
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            handleAppResume();
          }
        }).then(handle => {
          appListenerHandle = handle;
        }).catch(() => {});
      }
    } catch {}

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (appListenerHandle && typeof appListenerHandle.remove === 'function') {
        appListenerHandle.remove();
      }
    };
  }, []);

  // Global unmount cleanup
  useEffect(() => {
    return () => {
      stopListeningCleanly(false);
    };
  }, []);

  const stopListeningCleanly = (shouldSubmit = false) => {
    isListeningRef.current = false;
    isUserStoppingRef.current = true;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    // Stop Web Speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder if running
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }

    if (!shouldSubmit) {
      accumulatedFinalTextRef.current = '';
      currentSessionFinalTextRef.current = '';
      currentInterimTextRef.current = '';
      setState('idle');
    }
  };

  /**
   * Finalizes transcript buffer and submits to parent callback.
   */
  /**
   * Finalizes transcript buffer and submits to parent callback instantaneously.
   */
  const finalizeAndSubmit = useCallback((forceText = null, forcedDetectedLang = null) => {
    clearTimeout(silenceTimerRef.current);
    isListeningRef.current = false;
    isUserStoppingRef.current = true;

    const voiceLang = activeVoiceLangRef.current || 'auto';

    // Stop recognition engine cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const finalRaw = (forceText || `${accumulatedFinalTextRef.current} ${currentSessionFinalTextRef.current}`).trim();

    // Reset accumulators
    accumulatedFinalTextRef.current = '';
    currentSessionFinalTextRef.current = '';
    currentInterimTextRef.current = '';

    if (!finalRaw || finalRaw.length === 0) {
      console.warn('[VOICE DEBUG] No speech detected in final buffer.');
      setState('error');
      setErrorMessage(t('chat.voice.noSpeech') || 'No speech detected. Please try again.');
      resetTimerRef.current = setTimeout(() => setState('idle'), 2500);
      return;
    }

    const detectedLang = forcedDetectedLang || resolveConversationalLanguage(finalRaw, voiceLang === 'auto' ? null : voiceLang);
    console.log('[VOICE DEBUG] Final transcript produced:', `"${finalRaw}"`, 'detectedLang:', detectedLang, 'voiceLang:', voiceLang);
    setState('idle');

    if (onFinalTranscript) {
      onFinalTranscript(finalRaw, detectedLang, 'voice');
    } else if (onTranscript) {
      onTranscript(finalRaw);
    }
  }, [onFinalTranscript, onTranscript, t]);

  /**
   * Converts Blob to base64 string safely via Promise
   */
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const res = reader.result;
          if (typeof res === 'string') {
            const base64 = res.includes(',') ? res.split(',')[1] : res;
            resolve(base64);
          } else {
            reject(new Error('FileReader result is not a string'));
          }
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to read audio blob'));
      reader.readAsDataURL(blob);
    });
  };

  /**
   * MediaRecorder + Backend Gemini Audio STT.
   * Primary voice capture method on Capacitor Android/iOS and fallback/multilingual on Web.
   */
  const startMediaRecorderFallback = useCallback(async () => {
    if (!hasMediaDevices) {
      setState('unsupported');
      setErrorMessage('Microphone is not available on this device.');
      return;
    }

    try {
      setState('starting');
      setErrorMessage('');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      mediaStreamRef.current = stream;

      // Select best supported MIME container for this browser/WebView
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
      let chosenMime = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        for (const cand of candidates) {
          if (MediaRecorder.isTypeSupported(cand)) {
            chosenMime = cand;
            break;
          }
        }
      }

      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      const mimeType = recorder.mimeType || chosenMime || 'audio/webm';
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      // Optional real-time interim preview via WebSpeech while recording
      let liveRecognition = null;
      let lastLiveText = '';
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition && !Capacitor.isNativePlatform()) {
        try {
          liveRecognition = new SpeechRecognition();
          liveRecognition.continuous = true;
          liveRecognition.interimResults = true;
          const currentReqLang = activeVoiceLangRef.current;
          liveRecognition.lang = SPEECH_LANG_MAP[currentReqLang] || 'en-IN';
          liveRecognition.onresult = (e) => {
            let liveTxt = '';
            for (let i = 0; i < e.results.length; ++i) {
              liveTxt += e.results[i][0].transcript + ' ';
            }
            const trimmed = liveTxt.trim();
            if (trimmed) {
              lastLiveText = trimmed;
              if (isListeningRef.current && onInterimPreview) {
                onInterimPreview(trimmed);
              }
            }
          };
          liveRecognition.onerror = () => {};
          liveRecognition.start();
        } catch {}
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstart = () => {
        isListeningRef.current = true;
        recordingStartTimeRef.current = Date.now();
        setState('listening');
        setErrorMessage('');
      };

      recorder.onstop = async () => {
        const stopTime = Date.now();
        if (liveRecognition) {
          try { liveRecognition.stop(); } catch {}
        }
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        mediaStreamRef.current = null;
        setState('processing');

        const durationSec = (stopTime - recordingStartTimeRef.current) / 1000;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (durationSec < 0.3) {
          setState('error');
          setErrorMessage(t('chat.voice.tooShort') || 'Recording was too short. Please try again.');
          resetTimerRef.current = setTimeout(() => setState('idle'), 2000);
          return;
        }

        if (audioBlob.size < 200) {
          if (lastLiveText) {
            const detected = resolveConversationalLanguage(lastLiveText, activeVoiceLangRef.current);
            finalizeAndSubmit(lastLiveText, detected);
            return;
          }
          setState('error');
          setErrorMessage(t('chat.voice.noSpeech') || 'No speech detected. Please try again.');
          resetTimerRef.current = setTimeout(() => setState('idle'), 2000);
          return;
        }

        try {
          const base64Audio = await blobToBase64(audioBlob);
          const effectiveWsId = workspaceId || currentWorkspace?.id || 'ws-demo-customer-support';

          const res = await api.transcribeAudio(effectiveWsId, {
            audioData: base64Audio,
            mimeType,
            language: activeVoiceLangRef.current || 'auto'
          });

          const transcriptionLatency = Date.now() - stopTime;
          console.log(`[Voice STT] Recording stopped -> Transcription received in ${transcriptionLatency}ms`, {
            transcript: res?.transcript,
            detectedLanguage: res?.detectedLanguage
          });

          if (res && res.hasSpeech && res.transcript && res.transcript.trim()) {
            const detected = res.detectedLanguage || resolveConversationalLanguage(res.transcript.trim(), activeVoiceLangRef.current);
            finalizeAndSubmit(res.transcript.trim(), detected);
          } else if (lastLiveText) {
            console.log('[Voice STT] Gemini returned no transcript, falling back to Web Speech interim text:', lastLiveText);
            const detected = resolveConversationalLanguage(lastLiveText, activeVoiceLangRef.current);
            finalizeAndSubmit(lastLiveText, detected);
          } else {
            setState('error');
            setErrorMessage(t('chat.voice.noSpeech') || 'No speech detected. Please try again.');
            resetTimerRef.current = setTimeout(() => setState('idle'), 2000);
          }
        } catch (err) {
          console.error('[Voice STT] Server audio transcription error:', err);
          if (lastLiveText) {
            console.log('[Voice STT] Falling back to Web Speech interim text on error:', lastLiveText);
            const detected = resolveConversationalLanguage(lastLiveText, activeVoiceLangRef.current);
            finalizeAndSubmit(lastLiveText, detected);
          } else {
            setState('error');
            setErrorMessage(
              err?.message?.includes('Network')
                ? (t('chat.voice.network') || 'Voice recognition network error. Please try again.')
                : (t('chat.voice.error') || 'Voice recognition error. Click to retry.')
            );
            resetTimerRef.current = setTimeout(() => setState('idle'), 2500);
          }
        } finally {
          setState(prev => (prev === 'processing' ? 'idle' : prev));
        }
      };

      recorder.start(150); // 150ms chunks for responsive buffering

    } catch (err) {
      console.warn('[Voice STT] getUserMedia failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        setState('permissionDenied');
        setErrorMessage(t('chat.voice.permissionDenied') || 'Microphone permission is required. Please allow microphone access or enable it in Settings.');
        setTimeout(() => {
          setState(prev => (prev === 'permissionDenied' ? 'idle' : prev));
        }, 3500);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setState('unsupported');
        setErrorMessage('Microphone is not available on this device.');
      } else {
        setState('error');
        setErrorMessage(t('chat.voice.error') || 'Unable to start the microphone. Please tap to try again.');
        setTimeout(() => setState('idle'), 2500);
      }
    }
  }, [hasMediaDevices, workspaceId, currentWorkspace, finalizeAndSubmit, t, onInterimPreview]);

  /**
   * Starts Web Speech API recognition session with real-time live streaming interim text.
   */
  const startWebSpeech = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (hasMediaDevices) {
        startMediaRecorderFallback();
      } else {
        setState('unsupported');
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      const speechLocale = SPEECH_LANG_MAP[lang] || 'en-US';
      activeVoiceLangRef.current = lang;

      console.log('[VOICE DEBUG] Starting real-time Web Speech session. Locale:', speechLocale);

      recognition.lang = speechLocale;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      accumulatedFinalTextRef.current = '';
      currentSessionFinalTextRef.current = '';
      currentInterimTextRef.current = '';
      restartCountRef.current = 0;
      isListeningRef.current = true;
      isUserStoppingRef.current = false;

      recognition.onstart = () => {
        console.log('[VOICE DEBUG] Web Speech listening active (real-time streaming enabled).');
        setState('listening');
        setErrorMessage('');
      };

      recognition.onresult = (event) => {
        if (!isListeningRef.current) return;

        let sessionFinal = '';
        let interim = '';

        // Extract both finalized words and live interim syllables in real-time
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            sessionFinal += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        currentSessionFinalTextRef.current = sessionFinal;
        currentInterimTextRef.current = interim;

        const livePreview = `${accumulatedFinalTextRef.current} ${sessionFinal} ${interim}`.trim();

        if (livePreview) {
          // Immediately stream live speech to the input box in real-time
          if (onInterimPreview) {
            onInterimPreview(livePreview);
          } else if (onTranscript) {
            onTranscript(livePreview);
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('[VOICE DEBUG] Speech recognition error event:', event.error);
        clearTimeout(silenceTimerRef.current);

        if (event.error === 'no-speech') {
          const hasText = `${accumulatedFinalTextRef.current} ${currentSessionFinalTextRef.current}`.trim();
          if (!hasText && !isUserStoppingRef.current) {
            setState('error');
            setErrorMessage(t('chat.voice.noSpeech') || 'No speech detected. Please try again.');
            resetTimerRef.current = setTimeout(() => setState('idle'), 2000);
          }
          return;
        }

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          if (hasMediaDevices) {
            console.log('[VOICE DEBUG] Web Speech not allowed. Triggering getUserMedia fallback...');
            startMediaRecorderFallback();
            return;
          }
          isListeningRef.current = false;
          setState('permissionDenied');
          setErrorMessage(t('chat.voice.permissionDenied') || 'Microphone access denied. Please allow microphone permissions.');
          setTimeout(() => setState(prev => (prev === 'permissionDenied' ? 'idle' : prev)), 3000);
          return;
        }

        if (event.error === 'network' || event.error === 'service-not-allowed') {
          console.warn('[VOICE DEBUG] Web Speech service/network issue. Falling back to backend audio transcription...');
          if (hasMediaDevices) {
            startMediaRecorderFallback();
            return;
          }
          isListeningRef.current = false;
          setState('error');
          setErrorMessage(t('chat.voice.network') || 'Voice recognition network error. Please try again.');
          resetTimerRef.current = setTimeout(() => setState('idle'), 2500);
          return;
        }

        isListeningRef.current = false;
        setState('error');
        setErrorMessage(t('chat.voice.error') || 'Voice recognition error. Click to retry.');
        resetTimerRef.current = setTimeout(() => setState('idle'), 2000);
      };

      recognition.onend = () => {
        if (isListeningRef.current && !isUserStoppingRef.current) {
          accumulatedFinalTextRef.current = `${accumulatedFinalTextRef.current} ${currentSessionFinalTextRef.current}`.trim();
          currentSessionFinalTextRef.current = '';

          if (restartCountRef.current < 4) {
            restartCountRef.current += 1;
            console.log('[VOICE DEBUG] Auto-reconnecting real-time stream (attempt', restartCountRef.current, ')');
            try {
              recognition.start();
              return;
            } catch (err) {
              console.warn('[VOICE DEBUG] Failed to restart recognition:', err);
            }
          }
        }

        if (!isUserStoppingRef.current && state === 'listening') {
          setState('idle');
        }
      };

      setState('starting');
      recognition.start();
    } catch (err) {
      console.warn('[VOICE DEBUG] recognition.start() threw:', err);
      if (hasMediaDevices) {
        startMediaRecorderFallback();
      } else {
        setState('error');
        resetTimerRef.current = setTimeout(() => setState('idle'), 2000);
      }
    }
  }, [lang, hasMediaDevices, onInterimPreview, onTranscript, finalizeAndSubmit, startMediaRecorderFallback, t]);

  // Click handler (toggle listening vs stop)
  const handleClick = (e) => {
    e.preventDefault();
    if (disabled || state === 'processing') return;

    if (state === 'listening') {
      console.log('[VOICE DEBUG] User clicked stop button. Finalizing transcript...');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      } else {
        finalizeAndSubmit();
      }
    } else {
      // Allow starting from idle, error, or permissionDenied without permanently locking
      setErrorMessage('');
      if (Capacitor.isNativePlatform()) {
        startMediaRecorderFallback();
      } else if (!activeVoiceLangRef.current || activeVoiceLangRef.current === 'auto') {
        // In Auto-Detect mode, backend Gemini Multimodal STT receives audio and auto-detects language in native script
        startMediaRecorderFallback();
      } else if (hasWebSpeech) {
        startWebSpeech();
      } else if (hasMediaDevices) {
        startMediaRecorderFallback();
      } else {
        setState('unsupported');
      }
    }
  };

  // Tooltip & accessible text based on current state
  const getTooltip = () => {
    switch (state) {
      case 'starting':
        return t('chat.voice.processing') || 'Starting microphone...';
      case 'listening':
        return t('chat.voice.listening') || 'Listening... Click to stop';
      case 'processing':
        return t('chat.voice.processing') || 'Processing speech...';
      case 'permissionDenied':
        return errorMessage || (t('chat.voice.permissionDenied') || 'Microphone access denied');
      case 'unsupported':
        return t('chat.voice.unsupported') || 'Speech recognition not supported in this browser';
      case 'error':
        return errorMessage || (t('chat.voice.error') || 'Voice recognition error');
      default:
        return t('chat.voice.start') || 'Start Voice Input';
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === 'unsupported' || state === 'processing'}
        title={getTooltip()}
        aria-label={getTooltip()}
        className="btn btn-secondary"
        style={{
          padding: state === 'listening' ? '0 14px' : '0 12px',
          height: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          position: 'relative',
          transition: 'all 0.2s ease',
          backgroundColor: state === 'listening'
            ? 'rgba(239, 68, 68, 0.12)'
            : state === 'error' || state === 'permissionDenied'
            ? 'rgba(239, 68, 68, 0.1)'
            : 'var(--bg-subtle)',
          borderColor: state === 'listening'
            ? '#EF4444'
            : state === 'error' || state === 'permissionDenied'
            ? '#EF4444'
            : 'var(--border-subtle)',
          color: state === 'listening'
            ? '#EF4444'
            : state === 'error' || state === 'permissionDenied'
            ? '#EF4444'
            : 'var(--text-primary)',
          cursor: (disabled || state === 'unsupported' || state === 'processing') ? 'not-allowed' : 'pointer'
        }}
      >
        {state === 'listening' ? (
          <>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#EF4444' }}>
              {t('chat.voice.listeningShort') || t('Listening') || 'Listening'}
            </span>
            <Square size={12} fill="#EF4444" color="#EF4444" style={{ marginLeft: 2 }} />
          </>
        ) : (state === 'processing' || state === 'starting') ? (
          <>
            <Loader2 size={15} className="animate-spin" color="#D97706" />
            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#D97706' }}>
              {t('chat.voice.processing') || t('Processing') || 'Processing...'}
            </span>
          </>
        ) : state === 'unsupported' ? (
          <MicOff size={16} color="var(--text-muted)" />
        ) : state === 'permissionDenied' ? (
          <ShieldAlert size={16} color="#EF4444" />
        ) : state === 'error' ? (
          <AlertCircle size={16} color="#EF4444" />
        ) : (
          <Mic size={16} color="var(--accent-amber)" />
        )}
      </button>

      {/* Accessible error / permission denied badge */}
      {(state === 'error' || state === 'permissionDenied') && errorMessage && (
        <span
          style={{
            position: 'absolute',
            bottom: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.68rem',
            fontWeight: 600,
            color: '#EF4444',
            whiteSpace: 'nowrap',
            backgroundColor: 'var(--bg-surface)',
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #EF4444',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 20
          }}
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
};

/**
 * Strips markdown syntax, JSON relics, and internal classifications for natural TTS pronunciation.
 */
export function cleanTextForSpeech(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    // Strip markdown code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Strip inline code
    .replace(/`([^`]+)`/g, '$1')
    // Strip markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip internal classification badges [DOCUMENT_FACT], [CONFIRMED_FACT], etc.
    .replace(/\[(?:DOCUMENT_FACT|USER_PROVIDED_FACT|SYSTEM_FACT|CONFIRMED_FACT|UNKNOWN|PROPOSED|NEEDS_INPUT)\]/gi, ' ')
    // Strip markdown headings
    .replace(/^#+\s+/gm, '')
    // Strip bullet stars, dashes, markers
    .replace(/^[\s*•-]+/gm, ' ')
    // Strip bold / italic stars and underscores
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/[*#_>]/g, ' ')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts complete speakable text from a message or structured consultant response.
 * Preserves numbers, percentages, technical terms, and all meaningful sections.
 * Localizes section headings based on active display language ('en' | 'hi' | 'gu').
 * 
 * @param {object|string} messageOrData 
 * @param {string} language 'en' | 'hi' | 'gu'
 * @returns {string}
 */
export function getSpeakableMessageText(messageOrData, language = 'en') {
  if (!messageOrData) return '';
  const normLang = (language || 'en').toLowerCase().trim();

  let data = messageOrData;
  if (typeof messageOrData === 'string') {
    try {
      const parsed = JSON.parse(messageOrData);
      if (parsed && typeof parsed === 'object') {
        data = parsed;
      }
    } catch {}
  } else if (typeof messageOrData === 'object' && messageOrData !== null) {
    if (messageOrData.structured) {
      data = messageOrData.structured;
    }
  }

  // If structured consultant card data
  if (typeof data === 'object' && data !== null && (data.summary || data.confirmedFacts || data.recommendations)) {
    const parts = [];

    // Localized section headings for all 11 supported languages
    const prefixes = {
      summary: normLang === 'gu' ? 'સારાંશ: ' : normLang === 'hi' ? 'सारांश: ' : normLang === 'mr' ? 'सारांश: ' : normLang === 'bn' ? 'সারসংক্ষেপ: ' : normLang === 'ta' ? 'சுருக்கம்: ' : normLang === 'te' ? 'సారాంశం: ' : normLang === 'kn' ? 'ಸಾರಾಂಶ: ' : normLang === 'ml' ? 'സംഗ്രഹം: ' : normLang === 'pa' ? 'ਸੰਖੇਪ: ' : normLang === 'ur' ? 'خلاصہ: ' : 'Summary: ',
      facts: normLang === 'gu' ? 'પુષ્ટિ થયેલા તથ્યો: ' : normLang === 'hi' ? 'पुष्ट तथ्य: ' : normLang === 'mr' ? 'पुष्टी केलेले तथ्य: ' : normLang === 'bn' ? 'নিশ্চিত তথ্য: ' : normLang === 'ta' ? 'உறுதிப்படுத்தப்பட்ட உண்மைகள்: ' : normLang === 'te' ? 'ధృవీకరించబడిన వాస్తవాలు: ' : normLang === 'kn' ? 'ದೃಢೀಕರಿಸಿದ ಸಂಗತಿಗಳು: ' : normLang === 'ml' ? 'സ്ഥിരീകരിച്ച വസ്തുതകൾ: ' : normLang === 'pa' ? 'ਪੁਸ਼ਟੀ ਕੀਤੇ ਤੱਥ: ' : normLang === 'ur' ? 'تصدیق شدہ حقائق: ' : 'Confirmed Facts: ',
      inferences: normLang === 'gu' ? 'તારણો: ' : normLang === 'hi' ? 'निष्कर्ष: ' : normLang === 'mr' ? 'निष्कर्ष: ' : normLang === 'bn' ? 'সিদ্ধান্ত: ' : normLang === 'ta' ? 'முடிவுகள்: ' : normLang === 'te' ? 'ముగింపులు: ' : normLang === 'kn' ? 'ತೀರ್ಮಾನಗಳು: ' : normLang === 'ml' ? 'നിഗമനങ്ങൾ: ' : normLang === 'pa' ? 'ਸਿੱਟੇ: ' : normLang === 'ur' ? 'نتائج: ' : 'Inferences: ',
      requirements: normLang === 'gu' ? 'ઓળખાયેલી આવશ્યકતાઓ: ' : normLang === 'hi' ? 'आवश्यकताएं: ' : normLang === 'mr' ? 'आवश्यकता: ' : normLang === 'bn' ? 'প্রয়োজনীয়তা: ' : normLang === 'ta' ? 'தேவைகள்: ' : normLang === 'te' ? 'అవసరాలు: ' : normLang === 'kn' ? 'ಅಗತ್ಯತೆಗಳು: ' : normLang === 'ml' ? 'ആവശ്യകതകൾ: ' : normLang === 'pa' ? 'ਲੋੜਾਂ: ' : normLang === 'ur' ? 'ضروریات: ' : 'Requirements: ',
      recommendations: normLang === 'gu' ? 'ભલામણો: ' : normLang === 'hi' ? 'सिफारिशें: ' : normLang === 'mr' ? 'शिफारसी: ' : normLang === 'bn' ? 'সুপারিশ: ' : normLang === 'ta' ? 'பரிந்துரைகள்: ' : normLang === 'te' ? 'సిఫార్సులు: ' : normLang === 'kn' ? 'ಶಿಫಾರಸುಗಳು: ' : normLang === 'ml' ? 'ശുപാർശകൾ: ' : normLang === 'pa' ? 'ਸਿਫ਼ਾਰਸ਼ਾਂ: ' : normLang === 'ur' ? 'تجاویز: ' : 'Recommendations: ',
      nextSteps: normLang === 'gu' ? 'આગળના પગલાં: ' : normLang === 'hi' ? 'अगले कदम: ' : normLang === 'mr' ? 'पुढील पावले: ' : normLang === 'bn' ? 'পরবর্তী পদক্ষেপ: ' : normLang === 'ta' ? 'அடுத்த படிகள்: ' : normLang === 'te' ? 'తదుపరి దశలు: ' : normLang === 'kn' ? 'ಮುಂದಿನ ಹಂತಗಳು: ' : normLang === 'ml' ? 'അടുത്ത ഘട്ടങ്ങൾ: ' : normLang === 'pa' ? 'ਅਗਲੇ ਕਦਮ: ' : normLang === 'ur' ? 'اگلے اقدامات: ' : 'Next Steps: ',
      questions: normLang === 'gu' ? 'ખુલ્લા પ્રશ્નો: ' : normLang === 'hi' ? 'खुले प्रश्न: ' : normLang === 'mr' ? 'खुले प्रश्न: ' : normLang === 'bn' ? 'উন্মুক্ত প্রশ্ন: ' : normLang === 'ta' ? 'திறந்த கேள்விகள்: ' : normLang === 'te' ? 'ఓపెన్ ప్రశ్నలు: ' : normLang === 'kn' ? 'ತೆರೆದ ಪ್ರಶ್ನೆಗಳು: ' : normLang === 'ml' ? 'തുറന്ന ചോദ്യങ്ങൾ: ' : normLang === 'pa' ? 'ਖੁੱਲ੍ਹੇ ਸਵਾਲ: ' : normLang === 'ur' ? 'کھلے سوالات: ' : 'Open Questions: '
    };

    if (data.summary) {
      parts.push(cleanTextForSpeech(data.summary));
    }

    if (Array.isArray(data.confirmedFacts) && data.confirmedFacts.length > 0) {
      const factItems = data.confirmedFacts.map(f => {
        const text = typeof f === 'string' ? f : (f.fact || '');
        return cleanTextForSpeech(text);
      }).filter(Boolean);
      if (factItems.length > 0) {
        parts.push(prefixes.facts + factItems.join('. '));
      }
    }

    if (Array.isArray(data.inferences) && data.inferences.length > 0) {
      const infItems = data.inferences.map(inf => {
        const text = typeof inf === 'string' ? inf : (inf.inference || '');
        return cleanTextForSpeech(text);
      }).filter(Boolean);
      if (infItems.length > 0) {
        parts.push(prefixes.inferences + infItems.join('. '));
      }
    }

    if (Array.isArray(data.requirements) && data.requirements.length > 0) {
      const reqItems = data.requirements.map(r => {
        const text = typeof r === 'string' ? r : (r.statement || '');
        return cleanTextForSpeech(text);
      }).filter(Boolean);
      if (reqItems.length > 0) {
        parts.push(prefixes.requirements + reqItems.join('. '));
      }
    }

    if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
      const recItems = data.recommendations.map(r => {
        if (typeof r === 'string') return cleanTextForSpeech(r);
        const title = r.title ? cleanTextForSpeech(r.title) : '';
        const details = r.details ? cleanTextForSpeech(r.details) : '';
        return title ? `${title}: ${details}` : details;
      }).filter(Boolean);
      if (recItems.length > 0) {
        parts.push(prefixes.recommendations + recItems.join('. '));
      }
    }

    if (data.suggestedNextAction || data.suggestedAction || (Array.isArray(data.nextSteps) && data.nextSteps.length > 0)) {
      const nextText = data.suggestedNextAction || data.suggestedAction || (Array.isArray(data.nextSteps) ? data.nextSteps.join('. ') : data.nextSteps);
      const cleanedNext = cleanTextForSpeech(nextText);
      if (cleanedNext) {
        parts.push(prefixes.nextSteps + cleanedNext);
      }
    }

    if (Array.isArray(data.openQuestions) && data.openQuestions.length > 0) {
      const qItems = data.openQuestions.map(q => {
        const text = typeof q === 'string' ? q : (q.question || '');
        return cleanTextForSpeech(text);
      }).filter(Boolean);
      if (qItems.length > 0) {
        parts.push(prefixes.questions + qItems.join('. '));
      }
    }

    return parts.join('. ').replace(/\.\s*\./g, '.').trim();
  }

  // Otherwise clean raw markdown/text
  const rawStr = typeof messageOrData === 'string' ? messageOrData : JSON.stringify(messageOrData);
  return cleanTextForSpeech(rawStr);
}

/**
 * Splits text into sentence-level chunks safe for browser speech synthesis engines.
 * Breaks on sentence terminals (. ! ? । ॥ \n) and clauses if a sentence is extra long.
 */
export function splitIntoSpeakableChunks(text, maxChunkLen = 160) {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (trimmed.length <= maxChunkLen) return [trimmed];

  // Split on sentence boundaries (including Hindi / Devanagari danda । and ॥)
  const sentenceDelim = /(?<=[.!?।॥\n])\s+/;
  const rawSentences = trimmed.split(sentenceDelim).filter(Boolean);
  const chunks = [];

  for (const sentence of rawSentences) {
    if (sentence.length <= maxChunkLen) {
      chunks.push(sentence.trim());
    } else {
      // Split long sentences on clause boundaries (commas, semicolons, colons, dashes)
      const clauseDelim = /(?<=[,;:،\u060C\u2013\u2014-])\s+/;
      const clauses = sentence.split(clauseDelim).filter(Boolean);
      let buffer = '';
      for (const clause of clauses) {
        if ((buffer + ' ' + clause).trim().length > maxChunkLen) {
          if (buffer.trim()) chunks.push(buffer.trim());
          buffer = clause;
        } else {
          buffer = buffer ? `${buffer} ${clause}` : clause;
        }
      }
      if (buffer.trim()) chunks.push(buffer.trim());
    }
  }

  return chunks.filter(Boolean);
}

/**
 * Splits text into ordered language segments (Indic vs Latin technical terms).
 * Preserves strict sentence order for mixed-language speech synthesis.
 */
export function splitIntoLanguageSegments(text, baseLang = 'en') {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (baseLang === 'en') {
    return [{ text: trimmed, lang: 'en' }];
  }

  const segments = [];
  const wordsWithSeparators = trimmed.split(/(\s+)/);

  let currentLang = null;
  let currentBuffer = '';

  for (const part of wordsWithSeparators) {
    if (!part) continue;

    const hasGu = /[\u0A80-\u0AFF]/.test(part);
    const hasHi = /[\u0900-\u097F]/.test(part);
    const hasBn = /[\u0980-\u09FF]/.test(part);
    const hasTa = /[\u0B80-\u0BFF]/.test(part);
    const hasTe = /[\u0C00-\u0C7F]/.test(part);
    const hasKn = /[\u0C80-\u0CFF]/.test(part);
    const hasMl = /[\u0D00-\u0D7F]/.test(part);
    const hasPa = /[\u0A00-\u0A7F]/.test(part);
    const hasUr = /[\u0600-\u06FF]/.test(part);
    const hasLatin = /[a-zA-Z]/.test(part);

    let partLang = currentLang || baseLang;
    if (hasGu) partLang = 'gu';
    else if (hasBn) partLang = 'bn';
    else if (hasTa) partLang = 'ta';
    else if (hasTe) partLang = 'te';
    else if (hasKn) partLang = 'kn';
    else if (hasMl) partLang = 'ml';
    else if (hasPa) partLang = 'pa';
    else if (hasUr) partLang = 'ur';
    else if (hasHi) partLang = 'hi';
    else if (hasLatin) partLang = 'en';
    else partLang = currentLang || baseLang;

    if (currentLang === null) {
      currentLang = partLang;
      currentBuffer = part;
    } else if (partLang === currentLang) {
      currentBuffer += part;
    } else {
      if (currentBuffer.trim()) {
        segments.push({ text: currentBuffer.trim(), lang: currentLang });
      }
      currentLang = partLang;
      currentBuffer = part;
    }
  }

  if (currentBuffer.trim()) {
    segments.push({ text: currentBuffer.trim(), lang: currentLang });
  }

  return segments.filter(s => s.text && s.text.length > 0);
}

/**
 * Global Speech Synthesis & Audio Controller.
 * Ensures single active utterance across the entire application:
 * - Level 1: Native browser Web Speech API when valid locale voice is present in OS.
 * - Level 2: Server-side Cloud TTS fallback with authentic pronunciation and mixed-language segmentation.
 * - Prevents fake voices: never uses English voice to mispronounce Indic languages.
 */
class GlobalSpeechManager {
  constructor() {
    this.activeSpeakerId = null;
    this.currentChunks = [];
    this.chunkIndex = 0;
    this.listeners = new Set();
    this.voices = [];
    this.activeAudioElement = null;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this._loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
      }
    }
  }

  _loadVoices() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.voices = window.speechSynthesis.getVoices() || [];
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.activeSpeakerId);
      } catch (err) {
        console.warn('[SpeechManager] Listener error:', err);
      }
    }
  }

  findBestVoice(lang, targetLocale) {
    if (!this.voices || this.voices.length === 0) {
      this._loadVoices();
    }
    const voices = this.voices || [];
    const normLang = (lang || 'en').toLowerCase().trim();
    const normLocale = (targetLocale || SPEECH_LANG_MAP[normLang] || 'en-IN').toLowerCase().trim();

    // 1. Indian English Voice Detection
    if (normLang === 'en') {
      const indianVoice = voices.find(v => {
        const vLang = (v?.lang || '').toLowerCase().replace(/_/g, '-');
        const vName = (v?.name || '').toLowerCase();
        return (
          vLang === 'en-in' ||
          vLang.startsWith('en-in') ||
          vName.includes('india') ||
          vName.includes('rishi') ||
          vName.includes('veena') ||
          vName.includes('lekha') ||
          vName.includes('heera') ||
          vName.includes('ravi') ||
          vName.includes('neerja') ||
          vName.includes('prabhat')
        );
      });
      if (indianVoice) return indianVoice;
      return null;
    }

    // 2. Strict non-English Voice Detection for Indic Languages
    const langVoice = voices.find(v => {
      const vLang = (v?.lang || '').toLowerCase().replace(/_/g, '-');
      const vName = (v?.name || '').toLowerCase();
      const codeMatches = vLang.startsWith(`${normLang}-`) || vLang === normLang;
      const notEnglish = !vLang.startsWith('en');
      return (codeMatches || vName.includes(normLang)) && notEnglish;
    });

    if (langVoice) return langVoice;

    let matchedLocale = voices.find(v => (v?.lang || '').toLowerCase() === normLocale);
    if (matchedLocale && !matchedLocale.lang.toLowerCase().startsWith('en')) {
      return matchedLocale;
    }

    return null;
  }

  hasNativeVoiceFor(lang) {
    if (!this.voices || this.voices.length === 0) {
      this._loadVoices();
    }
    const normLang = (lang || 'en').toLowerCase().trim();
    const targetLocale = SPEECH_LANG_MAP[normLang] || 'en-IN';
    return !!this.findBestVoice(normLang, targetLocale);
  }

  hasVoiceFor(lang) {
    // Guaranteed cloud TTS fallback for all 11 languages
    return true;
  }

  stop() {
    this.currentChunks = [];
    this.chunkIndex = 0;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement.currentTime = 0;
      } catch {}
      this.activeAudioElement = null;
    }
    if (this.activeSpeakerId !== null) {
      this.activeSpeakerId = null;
      this.notify();
    }
  }

  playAudioStream({ id, audioDataUrl, onStart, onEnd, onError }) {
    this.stop();
    this.activeSpeakerId = id;
    this.notify();

    try {
      const audio = new Audio(audioDataUrl);
      this.activeAudioElement = audio;

      audio.onplay = () => {
        if (onStart) onStart();
      };

      audio.onended = () => {
        if (this.activeSpeakerId === id) {
          this.activeSpeakerId = null;
          this.activeAudioElement = null;
          this.notify();
          if (onEnd) onEnd();
        }
      };

      audio.onerror = (e) => {
        console.warn('[SpeechManager] Audio stream error:', e);
        if (this.activeSpeakerId === id) {
          this.activeSpeakerId = null;
          this.activeAudioElement = null;
          this.notify();
        }
        if (onError) onError(e);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[SpeechManager] Audio play() promise rejected:', err);
          if (this.activeSpeakerId === id) {
            this.activeSpeakerId = null;
            this.activeAudioElement = null;
            this.notify();
          }
          if (onError) onError(err);
        });
      }
    } catch (err) {
      this.activeSpeakerId = null;
      this.activeAudioElement = null;
      this.notify();
      if (onError) onError(err);
    }
  }

  speak({ id, text, data = null, lang = 'en', onChunkEnd = null, onComplete = null, onError = null }) {
    this.stop();

    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const speakableText = getSpeakableMessageText(data || text, lang);
    if (!speakableText) return;

    const effectiveLang = (lang && lang !== 'auto')
      ? lang
      : resolveConversationalLanguage(speakableText, 'en');

    const rawChunks = splitIntoSpeakableChunks(speakableText);
    if (rawChunks.length === 0) return;

    const orderedSegments = [];
    for (const rawChunk of rawChunks) {
      const segs = splitIntoLanguageSegments(rawChunk, effectiveLang);
      orderedSegments.push(...segs);
    }

    if (orderedSegments.length === 0) return;

    this.activeSpeakerId = id;
    this.currentChunks = orderedSegments;
    this.chunkIndex = 0;
    this.notify();

    this._speakChunkSequence({ id, lang: effectiveLang, onChunkEnd, onComplete, onError });
  }

  _speakChunkSequence({ id, lang, onChunkEnd, onComplete, onError }) {
    if (this.activeSpeakerId !== id || this.chunkIndex >= this.currentChunks.length) {
      this.activeSpeakerId = null;
      this.notify();
      if (onComplete) onComplete();
      return;
    }

    const chunk = this.currentChunks[this.chunkIndex];
    const chunkText = typeof chunk === 'string' ? chunk : chunk.text;
    const chunkLang = typeof chunk === 'string' ? lang : (chunk.lang || lang);

    const utterance = new SpeechSynthesisUtterance(chunkText);
    const targetLocale = SPEECH_LANG_MAP[chunkLang] || 'en-IN';
    utterance.lang = targetLocale;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const bestVoice = this.findBestVoice(chunkLang, targetLocale);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onend = () => {
      if (this.activeSpeakerId === id) {
        if (onChunkEnd) onChunkEnd(this.chunkIndex, this.currentChunks.length);
        this.chunkIndex += 1;
        this._speakChunkSequence({ id, lang, onChunkEnd, onComplete, onError });
      }
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      console.warn('[SpeechManager] Synthesis chunk error:', e.error);
      this.stop();
      if (onError) onError(e);
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const speechManager = new GlobalSpeechManager();

const SPEAKER_LABELS = {
  en: { idle: 'Listen', generating: 'Generating...', playing: 'Stop', error: 'Playback failed' },
  hi: { idle: 'सुनें', generating: 'तैयार हो रहा है...', playing: 'रोकें', error: 'आवाज चलाई नहीं जा सकी' },
  gu: { idle: 'સાંભળો', generating: 'તૈયાર થઈ રહ્યું છે...', playing: 'બંધ કરો', error: 'અવાજ ચલાવી શકાયો નથી' },
  mr: { idle: 'ऐका', generating: 'तयार होत आहे...', playing: 'थांबवा', error: 'प्लेबॅक अयशस्वी' },
  bn: { idle: 'শুনুন', generating: 'তৈরি হচ্ছে...', playing: 'থামান', error: 'প্লেব্যাক ব্যর্থ' },
  ta: { idle: 'கேளுங்கள்', generating: 'தயாராகிறது...', playing: 'நிறுத்துங்கள்', error: 'பின்னணி தோல்வி' },
  te: { idle: 'వినండి', generating: 'సిద్ధమవుతోంది...', playing: 'ఆపండి', error: 'ప్లేబ్యాక్ విఫలమైంది' },
  kn: { idle: 'ಕೇಳಿ', generating: 'ಸಿದ್ಧವಾಗುತ್ತಿದೆ...', playing: 'ನಿಲ್ಲಿಸಿ', error: 'ಪ್ಲೇಬ್ಯಾಕ್ ವಿಫಲವಾಗಿದೆ' },
  ml: { idle: 'കേൾക്കൂ', generating: 'തയ്യാറാക്കുന്നു...', playing: 'നിർത്തൂ', error: 'പ്ലേബാക്ക് പരാജയപ്പെട്ടു' },
  pa: { idle: 'ਸੁਣੋ', generating: 'ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ...', playing: 'ਰੋਕੋ', error: 'ਪਲੇਅਬੈਕ ਅਸਫਲ ਰਿਹਾ' },
  ur: { idle: 'سنیں', generating: 'تیار ہو رہا ہے...', playing: 'روکیں', error: 'پلے بیک ناکام ہو گیا' }
};

/**
 * Enterprise Assistant Message Text-to-Speech Playback Control.
 * Guarantees complete spoken responses in the message's natural language.
 */
export const ChatMessageSpeaker = ({
  messageId = null,
  text = '',
  data = null,
  lang = 'en',
  workspaceId = null
}) => {
  const { t } = useLanguage();
  const params = useParams();
  const activeWorkspaceId = workspaceId || params?.id || data?.workspaceId || 'ws-demo-customer-support';

  const speakerId = messageId || (data?.id || (typeof text === 'string' ? text.slice(0, 40) : 'speaker_msg'));
  const [isSpeaking, setIsSpeaking] = useState(speechManager.activeSpeakerId === speakerId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorState, setErrorState] = useState(null);

  useEffect(() => {
    const unsubscribe = speechManager.subscribe((activeId) => {
      setIsSpeaking(activeId === speakerId);
      if (activeId !== speakerId) {
        setIsGenerating(false);
      }
    });
    return () => unsubscribe();
  }, [speakerId]);

  // Stop active speech immediately if language switches
  useEffect(() => {
    if (isSpeaking) {
      speechManager.stop();
    }
  }, [lang]);

  // Determine effective conversational language of this message:
  const rawContent = typeof text === 'string' ? text : JSON.stringify(data || '');
  const messageExplicitLang = data?.responseLanguage || data?.detectedLanguage || data?.language;
  const normLang = messageExplicitLang && messageExplicitLang !== 'auto' && SUPPORTED_LANGUAGES.includes(messageExplicitLang)
    ? messageExplicitLang
    : resolveConversationalLanguage(rawContent, lang);

  const hasNativeVoice = speechManager.hasNativeVoiceFor(normLang);

  const handleToggleSpeak = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSpeaking) {
      speechManager.stop();
      return;
    }

    setErrorState(null);

    // LEVEL 1: If native voice exists in OS, use browser speech synthesis
    if (hasNativeVoice) {
      speechManager.speak({
        id: speakerId,
        text,
        data,
        lang: normLang,
        onError: (err) => {
          console.warn('[ChatMessageSpeaker] Native speech error:', err);
        }
      });
      return;
    }

    // LEVEL 2: Server-side Cloud TTS Fallback (Guaranteed authentic audio)
    try {
      setIsGenerating(true);
      const speakableText = getSpeakableMessageText(data || text, normLang);

      if (!speakableText) {
        setIsGenerating(false);
        return;
      }

      const res = await api.synthesizeTts(activeWorkspaceId, {
        text: speakableText,
        language: normLang
      });

      setIsGenerating(false);

      if (res && res.audioDataUrl) {
        speechManager.playAudioStream({
          id: speakerId,
          audioDataUrl: res.audioDataUrl,
          onError: (err) => {
            console.warn('[ChatMessageSpeaker] Audio stream playback error:', err);
            setErrorState('TTS_FAILED');
            setTimeout(() => setErrorState(null), 3500);
          }
        });
      } else {
        console.warn('[ChatMessageSpeaker] Server TTS did not return audio data.');
        setErrorState('TTS_FAILED');
        setTimeout(() => setErrorState(null), 3500);
      }
    } catch (err) {
      console.warn('[ChatMessageSpeaker] Server TTS synthesis request failed:', err);
      setIsGenerating(false);
      setErrorState('TTS_FAILED');
      setTimeout(() => setErrorState(null), 3500);
    }
  };

  const labels = SPEAKER_LABELS[normLang] || SPEAKER_LABELS.en;
  const langNativeName = LANGUAGE_DISPLAY_MAP[normLang] || 'English';

  const currentLabel = errorState === 'TTS_FAILED'
    ? labels.error
    : isGenerating
    ? labels.generating
    : isSpeaking
    ? labels.playing
    : labels.idle;

  const tooltip = errorState === 'TTS_FAILED'
    ? labels.error
    : isGenerating
    ? labels.generating
    : isSpeaking
    ? labels.playing
    : `${labels.idle} (${langNativeName})`;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={handleToggleSpeak}
        disabled={isGenerating}
        className="btn btn-ghost btn-xs"
        title={tooltip}
        aria-label={tooltip}
        data-testid="listen-button"
        style={{
          padding: '3px 8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          color: errorState === 'TTS_FAILED'
            ? '#EF4444'
            : isSpeaking
            ? 'var(--accent-amber)'
            : 'var(--text-muted)',
          backgroundColor: errorState === 'TTS_FAILED'
            ? 'rgba(239, 68, 68, 0.1)'
            : isSpeaking
            ? 'rgba(217, 119, 6, 0.12)'
            : 'transparent',
          border: errorState === 'TTS_FAILED'
            ? '1px solid #EF4444'
            : isSpeaking
            ? '1px solid var(--accent-amber)'
            : '1px solid transparent',
          borderRadius: 4,
          cursor: isGenerating ? 'wait' : 'pointer',
          fontSize: '0.74rem',
          fontWeight: isSpeaking ? 700 : 500,
          transition: 'all 0.15s ease'
        }}
      >
        {isSpeaking ? (
          <Square size={12} fill="#D97706" color="#D97706" />
        ) : (
          <Volume2 size={13} />
        )}
        <span>{currentLabel}</span>
      </button>
    </div>
  );
};


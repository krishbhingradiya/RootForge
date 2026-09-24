import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Mic, MicOff, Square, Loader2, Volume2, VolumeX, AlertCircle, ShieldAlert } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

// Map application language codes to Web Speech API BCP-47 locale tags
const SPEECH_LANG_MAP = {
  en: 'en-US',
  hi: 'hi-IN',
  gu: 'gu-IN'
};

/**
 * Robust Multilingual Voice Input Controller.
 * 
 * Features:
 * 1. Web Speech API (SpeechRecognition / webkitSpeechRecognition) with continuous=true & interimResults=true.
 * 2. Cumulative result array iteration (i = 0 to length - 1) — zero loss of earlier phrases.
 * 3. Strict separation of interim vs. final transcripts — prevents duplicate concatenation.
 * 4. Natural pause handling with silence watchdog timer (2.8s pause after speech before auto-finalizing).
 * 5. MediaRecorder + Server-Side Gemini audio transcription fallback for unsupported browsers/network errors.
 * 6. Explicit 6-state machine: idle, starting, listening, processing, error, unsupported.
 * 7. Safe language switching teardown — stops recognition if language changes while listening.
 * 8. Zero empty transcript submissions; triggers localized user feedback.
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
  const [state, setState] = useState('idle'); // 'idle' | 'starting' | 'listening' | 'processing' | 'error' | 'permissionDenied' | 'unsupported'
  const [errorMessage, setErrorMessage] = useState('');

  // Recognition and buffer refs
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);

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

  // Teardown when workspace or session changes
  useEffect(() => {
    if (isListeningRef.current) {
      console.log('[VOICE DEBUG] Workspace/session changed. Aborting voice session.');
      stopListeningCleanly(false);
    }
  }, [workspaceId, sessionId]);

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
  const finalizeAndSubmit = useCallback((forceText = null) => {
    clearTimeout(silenceTimerRef.current);
    isListeningRef.current = false;
    isUserStoppingRef.current = true;

    setState('processing');

    const voiceLang = activeVoiceLangRef.current || 'en';

    // Stop recognition engine cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    // Small delay to allow any pending onresult events to deliver
    setTimeout(() => {
      const finalRaw = (forceText || `${accumulatedFinalTextRef.current} ${currentSessionFinalTextRef.current}`).trim();

      // Reset accumulators
      accumulatedFinalTextRef.current = '';
      currentSessionFinalTextRef.current = '';
      currentInterimTextRef.current = '';

      if (!finalRaw || finalRaw.length === 0) {
        console.warn('[VOICE DEBUG] No speech detected in final buffer.');
        setState('error');
        setErrorMessage(t('chat.voice.noSpeech') || 'No speech detected. Please try again.');
        resetTimerRef.current = setTimeout(() => setState('idle'), 3000);
        return;
      }

      console.log('[VOICE DEBUG] Final transcript produced:', `"${finalRaw}"`, 'for voiceLang:', voiceLang);
      setState('idle');

      if (onFinalTranscript) {
        onFinalTranscript(finalRaw, voiceLang);
      } else if (onTranscript) {
        onTranscript(finalRaw);
      }
    }, 200);
  }, [onFinalTranscript, onTranscript, t]);

  /**
   * Starts Web Speech API recognition session with real-time live streaming interim text.
   */
  const startWebSpeech = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (hasMediaDevices && workspaceId) {
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

          // Natural pause watchdog: auto-finalize after natural pause
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            console.log('[VOICE DEBUG] Natural pause reached. Finalizing real-time transcript...');
            finalizeAndSubmit();
          }, 2600);
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
            resetTimerRef.current = setTimeout(() => setState('idle'), 3000);
          }
          return;
        }

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          // Attempt getUserMedia fallback to trigger native Android permission prompt if needed
          if (hasMediaDevices && workspaceId) {
            console.log('[VOICE DEBUG] Web Speech not allowed. Triggering getUserMedia fallback...');
            startMediaRecorderFallback();
            return;
          }
          isListeningRef.current = false;
          setState('permissionDenied');
          setErrorMessage(t('chat.voice.permissionDenied') || 'Microphone access denied. Please allow microphone permissions.');
          setTimeout(() => setState(prev => (prev === 'permissionDenied' ? 'idle' : prev)), 4000);
          return;
        }

        if (event.error === 'network' || event.error === 'service-not-allowed') {
          console.warn('[VOICE DEBUG] Web Speech service/network issue. Falling back to backend audio transcription...');
          if (hasMediaDevices && workspaceId) {
            startMediaRecorderFallback();
            return;
          }
          isListeningRef.current = false;
          setState('error');
          setErrorMessage(t('chat.voice.network') || 'Voice recognition network error. Please try again.');
          resetTimerRef.current = setTimeout(() => setState('idle'), 4000);
          return;
        }

        isListeningRef.current = false;
        setState('error');
        setErrorMessage(t('chat.voice.error') || 'Voice recognition error. Click to retry.');
        resetTimerRef.current = setTimeout(() => setState('idle'), 3500);
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
      if (hasMediaDevices && workspaceId) {
        startMediaRecorderFallback();
      } else {
        setState('error');
        resetTimerRef.current = setTimeout(() => setState('idle'), 3000);
      }
    }
  }, [lang, workspaceId, hasMediaDevices, onInterimPreview, onTranscript, finalizeAndSubmit, startMediaRecorderFallback, t]);

  /**
   * MediaRecorder + Backend Gemini Audio STT fallback.
   * Primary voice capture method on Capacitor Android WebView and fallback on Web.
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstart = () => {
        isListeningRef.current = true;
        setState('listening');
        setErrorMessage('');
        console.log('[VOICE DEBUG] MediaRecorder audio recording started with mimeType:', mimeType);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setState('processing');

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) {
          setState('error');
          setErrorMessage(t('chat.voice.noSpeech') || 'No speech detected. Please try again.');
          setTimeout(() => setState('idle'), 3000);
          return;
        }

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result.split(',')[1];
            if (!workspaceId) {
              setState('idle');
              return;
            }

            console.log('[VOICE DEBUG] Dispatching audio to backend Gemini transcription endpoint...');
            const res = await api.transcribeAudio(workspaceId, {
              audioData: base64Audio,
              mimeType,
              language: activeVoiceLangRef.current
            });

            if (res && res.hasSpeech && res.transcript) {
              finalizeAndSubmit(res.transcript);
            } else {
              setState('error');
              setErrorMessage(t('chat.voice.noSpeech') || 'No speech detected. Please try again.');
              setTimeout(() => setState('idle'), 3000);
            }
          };
        } catch (err) {
          console.error('[VOICE DEBUG] Server audio transcription failed:', err);
          setState('error');
          setErrorMessage(t('chat.voice.error') || 'Voice recognition error. Click to retry.');
          setTimeout(() => setState('idle'), 3000);
        }
      };

      recorder.start(500); // 500ms timeslices

    } catch (err) {
      console.warn('[VOICE DEBUG] getUserMedia failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        setState('permissionDenied');
        setErrorMessage(t('chat.voice.permissionDenied') || 'Microphone permission is required. Please allow microphone access or enable it in Android Settings.');
        setTimeout(() => {
          setState(prev => (prev === 'permissionDenied' ? 'idle' : prev));
        }, 4500);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setState('unsupported');
        setErrorMessage('Microphone is not available on this device.');
      } else {
        setState('error');
        setErrorMessage(t('chat.voice.error') || 'Unable to start the microphone. Please tap to try again.');
        setTimeout(() => setState('idle'), 3500);
      }
    }
  }, [hasMediaDevices, workspaceId, finalizeAndSubmit, t]);

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
      } else if (hasWebSpeech) {
        startWebSpeech();
      } else if (hasMediaDevices && workspaceId) {
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

    // Localized section headings strictly adhering to Section 19
    const prefixes = {
      summary: normLang === 'gu' ? 'સારાંશ: ' : normLang === 'hi' ? 'सारांश: ' : 'Summary: ',
      facts: normLang === 'gu' ? 'પુષ્ટિ થયેલા તથ્યો: ' : normLang === 'hi' ? 'पुष्ट तथ्य: ' : 'Confirmed Facts: ',
      inferences: normLang === 'gu' ? 'તારણો: ' : normLang === 'hi' ? 'निष्कर्ष: ' : 'Inferences: ',
      requirements: normLang === 'gu' ? 'ઓળખાયેલી આવશ્યકતાઓ: ' : normLang === 'hi' ? 'आवश्यकताएं: ' : 'Requirements: ',
      recommendations: normLang === 'gu' ? 'ભલામણો: ' : normLang === 'hi' ? 'सिफारिशें: ' : 'Recommendations: ',
      nextSteps: normLang === 'gu' ? 'આગળના પગલાં: ' : normLang === 'hi' ? 'अगले कदम: ' : 'Next Steps: ',
      questions: normLang === 'gu' ? 'ખુલ્લા પ્રશ્નો: ' : normLang === 'hi' ? 'खुले प्रश्न: ' : 'Open Questions: '
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
    const hasLatin = /[a-zA-Z]/.test(part);

    let partLang = currentLang || baseLang;
    if (hasGu) {
      partLang = 'gu';
    } else if (hasHi) {
      partLang = 'hi';
    } else if (hasLatin) {
      partLang = 'en';
    } else {
      partLang = currentLang || baseLang;
    }

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
 * - Switching messages cancels previous speech.
 * - Changing language immediately stops active speech.
 * - Level 1: Native browser Web Speech API when valid locale voice is present.
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
    const normLocale = (targetLocale || 'en-US').toLowerCase().trim();

    // 1. Strict Gujarati Voice Detection — NEVER match English voice
    if (normLang === 'gu') {
      const guVoice = voices.find(v => 
        (v.lang.toLowerCase().startsWith('gu') || v.name.toLowerCase().includes('gujarat')) &&
        !v.lang.toLowerCase().startsWith('en')
      );
      return guVoice || null;
    }

    // 2. Strict Hindi Voice Detection — NEVER match English (India) voice
    if (normLang === 'hi') {
      const hiVoice = voices.find(v => 
        (v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi')) &&
        !v.lang.toLowerCase().startsWith('en')
      );
      return hiVoice || null;
    }

    // 3. English Voice Detection
    let matched = voices.find(v => v.lang.toLowerCase() === normLocale);
    if (matched) return matched;
    return voices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
  }

  hasNativeVoiceFor(lang) {
    if (!this.voices || this.voices.length === 0) {
      this._loadVoices();
    }
    const normLang = (lang || 'en').toLowerCase().trim();
    const targetLocale = SPEECH_LANG_MAP[normLang] || 'en-US';
    return !!this.findBestVoice(normLang, targetLocale);
  }

  hasVoiceFor(lang) {
    const normLang = (lang || 'en').toLowerCase().trim();
    // For Gujarati and Hindi, server-side cloud TTS fallback is guaranteed
    if (normLang === 'gu' || normLang === 'hi') {
      return true;
    }
    return this.hasNativeVoiceFor(normLang);
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

    let effectiveLang = (lang || 'en').toLowerCase().trim();
    const hasGu = /[\u0A80-\u0AFF]/.test(speakableText);
    const hasHi = /[\u0900-\u097F]/.test(speakableText);
    if (hasGu) {
      effectiveLang = 'gu';
    } else if (hasHi) {
      effectiveLang = 'hi';
    } else if (effectiveLang === 'gu' || effectiveLang === 'hi') {
      effectiveLang = 'en';
    }

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
    const targetLocale = SPEECH_LANG_MAP[chunkLang] || 'en-US';
    utterance.lang = targetLocale;

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

/**
 * Enterprise Assistant Message Text-to-Speech Playback Control.
 * Guarantees complete spoken responses in the message's natural language.
 * 
 * 2-Tier Architecture:
 * - Level 1: Native browser voice synthesis if gu-IN voice exists in OS.
 * - Level 2: Server-side Cloud TTS fallback with authentic pronunciation and mixed-language technical term handling.
 * 
 * UX States (Section 20):
 * - IDLE: 🔊 Listen / 🔊 સાંભળો / 🔊 सुनें
 * - GENERATING: ⏳ તૈયાર થઈ રહ્યું છે... / ⏳ Generating...
 * - PLAYING: ⏹ બંધ કરો / ⏹ Stop / ⏹ रोकें
 * - ERROR: ⚠ અવાજ ચલાવી શકાયો નથી / ⚠ Playback failed
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

  // Stop active speech immediately if language switches (Section 23)
  useEffect(() => {
    if (isSpeaking) {
      speechManager.stop();
    }
  }, [lang]);

  // Determine effective conversational language of this message:
  const rawContent = typeof text === 'string' ? text : JSON.stringify(data || '');
  const hasGuChars = /[\u0A80-\u0AFF]/.test(rawContent);
  const hasHiChars = /[\u0900-\u097F]/.test(rawContent);

  let effectiveLang = (lang || 'en').toLowerCase().trim();
  if (hasGuChars) {
    effectiveLang = 'gu';
  } else if (hasHiChars) {
    effectiveLang = 'hi';
  } else if (effectiveLang === 'gu' || effectiveLang === 'hi') {
    effectiveLang = 'en';
  }

  const normLang = effectiveLang;
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

  // Section 20 Button labels:
  const idleLabel = normLang === 'gu'
    ? 'સાંભળો'
    : normLang === 'hi'
    ? 'सुनें'
    : 'Listen';

  const generatingLabel = normLang === 'gu'
    ? 'તૈયાર થઈ રહ્યું છે...'
    : normLang === 'hi'
    ? 'तैयार हो रहा है...'
    : 'Generating...';

  const playingLabel = normLang === 'gu'
    ? 'બંધ કરો'
    : normLang === 'hi'
    ? 'रोकें'
    : 'Stop';

  const errorLabel = normLang === 'gu'
    ? 'અવાજ ચલાવી શકાયો નથી'
    : normLang === 'hi'
    ? 'आवाज चलाई नहीं जा सकी'
    : 'Playback failed';

  const currentLabel = errorState === 'TTS_FAILED'
    ? errorLabel
    : isGenerating
    ? generatingLabel
    : isSpeaking
    ? playingLabel
    : idleLabel;

  const tooltip = errorState === 'TTS_FAILED'
    ? errorLabel
    : isGenerating
    ? generatingLabel
    : isSpeaking
    ? playingLabel
    : `${idleLabel} (${normLang === 'gu' ? 'ગુજરાતી' : normLang === 'hi' ? 'हिन्दी' : 'English'})`;

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
        <span>{isSpeaking ? playingLabel : idleLabel}</span>
      </button>
    </div>
  );
};


import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

// Global presentation cache across component unmounts / switches
// Structure: { [language]: { [messageId]: translatedContent } }
const globalTranslationCache = {
  hi: {},
  gu: {},
  en: {}
};

/**
 * Custom hook providing a presentation/translation layer for chat messages.
 * 
 * Guarantees:
 * - Zero SQLite database mutations.
 * - Single-request batch translation for uncached messages (no N+1).
 * - Instant rendering with original messages (never blank).
 * - Seamless in-place replacement when translations arrive.
 * 
 * @param {string} workspaceId 
 * @param {Array} messages 
 * @param {string} targetLanguage 'en' | 'hi' | 'gu'
 */
export function useChatTranslation(workspaceId, messages = [], targetLanguage = 'en') {
  const normLang = (targetLanguage || 'en').toLowerCase().trim();
  const [translating, setTranslating] = useState(false);
  const [localVersion, setLocalVersion] = useState(0);
  const inFlightRef = useRef(new Set());

  // Determine which visible messages lack translation for the active language
  useEffect(() => {
    if (!workspaceId || normLang === 'en' || !Array.isArray(messages) || messages.length === 0) {
      setTranslating(false);
      return;
    }

    const langCache = globalTranslationCache[normLang] || (globalTranslationCache[normLang] = {});
    const uncached = [];

    for (const msg of messages) {
      if (!msg || !msg.id || msg.id.startsWith('temp_')) continue;
      if (!langCache[msg.id] && !inFlightRef.current.has(`${msg.id}_${normLang}`)) {
        uncached.push({
          id: msg.id,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        });
      }
    }

    if (uncached.length === 0) {
      setTranslating(false);
      return;
    }

    // Mark as in-flight
    for (const u of uncached) {
      inFlightRef.current.add(`${u.id}_${normLang}`);
    }

    let isMounted = true;
    setTranslating(true);

    api.translateChatMessages(workspaceId, {
      targetLanguage: normLang,
      messages: uncached
    })
      .then((res) => {
        if (!isMounted) return;
        const newTranslations = res?.translations || {};
        for (const [id, translated] of Object.entries(newTranslations)) {
          langCache[id] = translated;
        }
        setLocalVersion(v => v + 1);
      })
      .catch((err) => {
        console.warn(`[useChatTranslation] Failed to translate messages to ${normLang}:`, err.message);
      })
      .finally(() => {
        for (const u of uncached) {
          inFlightRef.current.delete(`${u.id}_${normLang}`);
        }
        if (isMounted) setTranslating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId, messages, normLang]);

  /**
   * Retrieves the presentation content for a message in the active language.
   * Falls back smoothly to original message content while translations load.
   */
  const getTranslatedContent = useCallback((msg) => {
    if (!msg) return '';
    if (normLang === 'en') return msg.content;
    const langCache = globalTranslationCache[normLang];
    return (langCache && langCache[msg.id]) || msg.content;
  }, [normLang, localVersion]);

  /**
   * Retrieves parsed structured data for an assistant response card in the active language.
   */
  const getTranslatedStructured = useCallback((msg) => {
    if (!msg) return null;
    const content = getTranslatedContent(msg);

    if (typeof content === 'object' && content !== null) {
      return content;
    }

    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && (parsed.summary || parsed.confirmedFacts)) {
          return parsed;
        }
      } catch {}
    }

    return msg.structured || null;
  }, [getTranslatedContent]);

  return {
    translating,
    getTranslatedContent,
    getTranslatedStructured
  };
}

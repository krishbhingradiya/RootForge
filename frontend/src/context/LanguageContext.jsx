import React, { createContext, useContext, useState, useMemo } from 'react';
import { translations, phraseDictionary } from './translations';
import { speechManager } from '../components/ai/ChatVoiceControl';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('aisb_lang') || 'en');

  const changeLanguage = (newLang) => {
    // Stop any currently playing speech immediately when language switches
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      speechManager.stop();
    } catch {}

    setLang(newLang);
    localStorage.setItem('aisb_lang', newLang);
  };

  const currentTranslations = translations[lang] || translations.en;
  const enTranslations = translations.en;

  // Smart translation helper: supports property access t.exports.title
  // AND function invocation t('exports.title') or t('Executive Export Center')
  const t = useMemo(() => {
    const helper = (keyOrText, fallback) => {
      if (!keyOrText) return fallback || '';

      // 1. Check dot notation: e.g. "exports.title"
      if (typeof keyOrText === 'string' && keyOrText.includes('.')) {
        const parts = keyOrText.split('.');
        let val = currentTranslations;
        for (const p of parts) {
          val = val?.[p];
          if (val === undefined) break;
        }
        if (val !== undefined && typeof val === 'string') return val;

        // Fallback to English
        let enVal = enTranslations;
        for (const p of parts) {
          enVal = enVal?.[p];
          if (enVal === undefined) break;
        }
        if (enVal !== undefined && typeof enVal === 'string') return enVal;
      }

      // 2. Direct phrase dictionary lookup
      if (phraseDictionary && phraseDictionary[keyOrText]) {
        return phraseDictionary[keyOrText][lang] || phraseDictionary[keyOrText].en || keyOrText;
      }

      // 3. Trimmed phrase dictionary lookup
      const trimmed = typeof keyOrText === 'string' ? keyOrText.trim() : '';
      if (trimmed && phraseDictionary && phraseDictionary[trimmed]) {
        return phraseDictionary[trimmed][lang] || phraseDictionary[trimmed].en || keyOrText;
      }

      if (fallback !== undefined) return fallback;
      if (typeof keyOrText === 'string' && keyOrText.includes('.')) {
        const lastPart = keyOrText.split('.').pop();
        if (lastPart) {
          // Capitalize first letter of fallback key segment
          return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
        }
      }
      return keyOrText;
    };

    // Attach all top-level sections as properties: t.nav, t.common, t.exports, etc.
    Object.assign(helper, currentTranslations);

    return helper;
  }, [lang, currentTranslations, enTranslations]);

  const tDynamic = (enText, hiText, guText) => {
    if (lang === 'hi') return hiText || enText;
    if (lang === 'gu') return guText || hiText || enText;
    return enText;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLanguage, t, tDynamic }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

export default LanguageContext;

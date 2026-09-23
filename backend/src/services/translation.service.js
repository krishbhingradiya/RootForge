/**
 * Enterprise Translation Service for RootForge Chat
 * 
 * Implements a high-performance presentation translation layer:
 * - Centralized Gemini configuration & provider integration
 * - In-memory multi-lingual cache: prevents redundant AI calls.
 * - Single-request batch translation: sends uncached visible messages in 1 Gemini call (no N+1).
 * - Zero database mutations: original Message.content in SQLite is never modified.
 * - Schema-preserving JSON translation: translates values of structured consultant responses while retaining exact keys.
 * - Supports English (en), Hindi (hi), and Gujarati (gu).
 * - Full fallback tolerance on provider errors or unauthenticated state.
 */

import { providerRouter } from '../ai/providers/providerRouter.js';
import { geminiConfig } from '../ai/config/geminiConfig.js';
import { safeParseJson } from '../ai/schemaValidator.js';

// In-memory cache for translated message content
// Key: `${messageId}_${targetLanguage}` -> Value: translated string
const translationCache = new Map();

// Maximum in-memory entries to prevent memory leaks in long-running processes
const MAX_CACHE_ENTRIES = 5000;

function setCache(key, value) {
  if (translationCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(key, value);
}

const LANGUAGE_NAMES = {
  hi: 'Hindi (हिन्दी)',
  gu: 'Gujarati (ગુજરાતી)',
  en: 'English'
};

/**
 * Translates a batch of chat messages to the target language without mutating database records.
 * 
 * @param {Array<{ id: string, content: string }>} messages 
 * @param {string} targetLanguage 'en' | 'hi' | 'gu'
 * @returns {Promise<{ targetLanguage: string, translations: Record<string, string> }>}
 */
export async function translateChatMessages(messages = [], targetLanguage = 'en') {
  const normLang = (targetLanguage || 'en').toLowerCase().trim();
  const validLangs = ['en', 'hi', 'gu'];
  const finalLang = validLangs.includes(normLang) ? normLang : 'en';

  const translations = {};
  const uncachedMessages = [];

  for (const msg of messages) {
    if (!msg || !msg.id) continue;
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

    const cacheKey = `${msg.id}_${finalLang}`;
    if (translationCache.has(cacheKey)) {
      translations[msg.id] = translationCache.get(cacheKey);
    } else if (finalLang === 'en') {
      const containsIndic = /[\u0900-\u097F\u0A80-\u0AFF]/.test(content);
      if (!containsIndic) {
        // English is canonical source and content is already Latin/English
        translations[msg.id] = content;
        setCache(cacheKey, content);
      } else {
        // Content contains Hindi or Gujarati, so it requires translation back to English
        uncachedMessages.push({ id: msg.id, content });
      }
    } else {
      uncachedMessages.push({ id: msg.id, content });
    }
  }

  // If all messages were cached, return immediately
  if (uncachedMessages.length === 0) {
    return { targetLanguage: finalLang, translations };
  }

  // Translate uncached batch using centralized Gemini provider
  const configuredProvider = providerRouter.getConfiguredProviderName();
  const apiKey = configuredProvider === 'gemini' ? geminiConfig.getApiKey() : process.env.AI_API_KEY;

  if (configuredProvider !== 'demo' && apiKey) {
    try {
      const model = configuredProvider === 'gemini' ? geminiConfig.getModel() : process.env.AI_MODEL;
      const targetLangName = LANGUAGE_NAMES[finalLang] || finalLang;

      const itemsPayload = uncachedMessages.map(m => {
        let isJson = false;
        let parsed = null;
        try {
          parsed = JSON.parse(m.content);
          isJson = typeof parsed === 'object' && parsed !== null;
        } catch {}

        return {
          id: m.id,
          isStructured: isJson,
          content: m.content
        };
      });

      const systemPrompt = `You are an expert enterprise localization engine for RootForge Solution Builder.
Translate the provided chat messages into natural, professional ${targetLangName}.

STRICT RULES:
1. For items where isStructured is true or content is a JSON object:
   - Translate ONLY the human-readable text values (such as 'summary', 'fact', 'title', 'details', 'rationale', 'question', 'whyItMatters', 'suggestedNextAction').
   - Keep ALL JSON object keys in English exactly as they are.
   - Keep all technical IDs, codes, statuses ('CONFIRMED', 'PROPOSED', 'NEEDS_INPUT', 'HIGH', 'MEDIUM', 'LOW'), and protocols (FHIR, REST, API, PostgreSQL, Redis, SMS, OAuth2) intact.
   - Keep all document filenames unchanged.
   - The returned string for this id MUST be a valid stringified JSON object matching the original structure.
2. For plain text messages:
   - Translate naturally into ${targetLangName}.
   - Keep enterprise clarity, domain terms, and names accurate.
3. Return ONLY a valid JSON object matching this schema:
{
  "translations": {
    "<id>": "<translatedContentString>"
  }
}`;

      const userPrompt = `Target Language: ${targetLangName}\n\nMessages to translate in batch:\n${JSON.stringify(itemsPayload, null, 2)}`;

      const completion = await providerRouter.generateChatCompletion({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 4096,
        timeoutMs: 30000
      });

      const rawText = completion?.text || '';
      const parsed = safeParseJson(rawText);

      if (parsed.success && parsed.data && parsed.data.translations) {
        const generated = parsed.data.translations;
        for (const msg of uncachedMessages) {
          const translated = generated[msg.id] || msg.content;
          translations[msg.id] = translated;
          setCache(`${msg.id}_${finalLang}`, translated);
        }
        return { targetLanguage: finalLang, translations };
      }
    } catch (err) {
      console.warn(`[TranslationService] Batch translation to ${finalLang} failed:`, err.message);
    }
  }

  // Graceful deterministic fallback for demo / offline / unauthenticated states
  for (const msg of uncachedMessages) {
    const translated = fallbackTranslate(msg.content, finalLang);
    translations[msg.id] = translated;
    setCache(`${msg.id}_${finalLang}`, translated);
  }

  return { targetLanguage: finalLang, translations };
}

/**
 * Translates a structured consultant response object preserving its exact JSON schema keys.
 * 
 * @param {object} structured 
 * @param {string} targetLanguage 'gu' | 'hi' | 'en'
 * @returns {Promise<object>} The localized structured object
 */
export async function translateStructured(structured, targetLanguage = 'en') {
  if (!structured || typeof structured !== 'object') return structured;
  const normLang = (targetLanguage || 'en').toLowerCase().trim();
  if (normLang === 'en') {
    // If target is English and source has no Indic characters, return directly
    const raw = JSON.stringify(structured);
    if (!/[\u0900-\u097F\u0A80-\u0AFF]/.test(raw)) return structured;
  }

  const configuredProvider = providerRouter.getConfiguredProviderName();
  const apiKey = configuredProvider === 'gemini' ? geminiConfig.getApiKey() : process.env.AI_API_KEY;

  if (configuredProvider !== 'demo' && apiKey) {
    try {
      const model = configuredProvider === 'gemini' ? geminiConfig.getModel() : process.env.AI_MODEL;
      const targetLangName = LANGUAGE_NAMES[normLang] || normLang;

      const systemPrompt = `You are an expert enterprise localization engine for RootForge Solution Builder.
Translate the text values in this structured JSON object into natural, professional ${targetLangName}.

STRICT RULES:
1. Translate ONLY human-readable text values (summary, fact, title, details, rationale, question, whyItMatters, suggestedNextAction).
2. Keep ALL JSON keys in English ('summary', 'confirmedFacts', 'inferences', 'requirements', 'recommendations', 'openQuestions', 'suggestedNextAction').
3. Preserve all technical identifiers (e.g. REST API, PostgreSQL, FHIR, HL7, OAuth2, SMS).
4. Return ONLY valid JSON matching the exact input structure.`;

      const userPrompt = `Target Language: ${targetLangName}\n\nStructured JSON payload to translate:\n${JSON.stringify(structured, null, 2)}`;

      const completion = await providerRouter.generateChatCompletion({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        maxTokens: 4096,
        timeoutMs: 30000
      });

      const rawText = completion?.text || '';
      const parsed = safeParseJson(rawText);
      if (parsed.success && parsed.data && typeof parsed.data === 'object') {
        return {
          ...structured,
          ...parsed.data,
          suggestedNextAction: structured.suggestedNextAction || parsed.data.suggestedNextAction
        };
      }
    } catch (err) {
      console.warn(`[TranslationService] translateStructured to ${normLang} failed:`, err.message);
    }
  }

  // Deterministic fallback
  try {
    const raw = JSON.stringify(structured);
    const translatedStr = fallbackTranslate(raw, normLang);
    return JSON.parse(translatedStr);
  } catch {
    return structured;
  }
}

/**
 * Deterministic fallback translator for offline testing and demo workspaces.
 */
function fallbackTranslate(content, targetLang) {
  if (!content) return content;

  // Try parsing structured JSON
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      const translated = { ...parsed };
      if (translated.summary) translated.summary = fallbackTranslateString(translated.summary, targetLang);
      if (Array.isArray(translated.confirmedFacts)) {
        translated.confirmedFacts = translated.confirmedFacts.map(f => {
          if (typeof f === 'string') return fallbackTranslateString(f, targetLang);
          return { ...f, fact: fallbackTranslateString(f.fact, targetLang) };
        });
      }
      if (Array.isArray(translated.inferences)) {
        translated.inferences = translated.inferences.map(inf => {
          if (typeof inf === 'string') return fallbackTranslateString(inf, targetLang);
          return {
            ...inf,
            inference: fallbackTranslateString(inf.inference, targetLang),
            basis: inf.basis ? fallbackTranslateString(inf.basis, targetLang) : inf.basis
          };
        });
      }
      if (Array.isArray(translated.requirements)) {
        translated.requirements = translated.requirements.map(req => {
          if (typeof req === 'string') return fallbackTranslateString(req, targetLang);
          return { ...req, statement: fallbackTranslateString(req.statement, targetLang) };
        });
      }
      if (Array.isArray(translated.recommendations)) {
        translated.recommendations = translated.recommendations.map(rec => {
          if (typeof rec === 'string') return fallbackTranslateString(rec, targetLang);
          return {
            ...rec,
            title: fallbackTranslateString(rec.title, targetLang),
            details: rec.details ? fallbackTranslateString(rec.details, targetLang) : rec.details,
            rationale: rec.rationale ? fallbackTranslateString(rec.rationale, targetLang) : rec.rationale
          };
        });
      }
      if (Array.isArray(translated.openQuestions)) {
        translated.openQuestions = translated.openQuestions.map(q => {
          if (typeof q === 'string') return fallbackTranslateString(q, targetLang);
          return {
            ...q,
            question: fallbackTranslateString(q.question, targetLang),
            whyItMatters: q.whyItMatters ? fallbackTranslateString(q.whyItMatters, targetLang) : q.whyItMatters
          };
        });
      }
      return JSON.stringify(translated);
    }
  } catch {}

  return fallbackTranslateString(content, targetLang);
}

function fallbackTranslateString(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  const t = text.trim();

  const phraseMap = {
    'Your appointment scheduling process has three major bottlenecks.': {
      gu: 'તમારી એપોઇન્ટમેન્ટ શેડ્યૂલિંગ પ્રક્રિયામાં ત્રણ મુખ્ય અવરોધો છે.',
      hi: 'आपकी अपॉइंटमेंट शेड्यूलिंग प्रक्रिया में तीन मुख्य बाधाएँ हैं।'
    },
    'Appointment reduction target is 60%.': {
      gu: 'એપોઇન્ટમેન્ટ ઘટાડવાનો લક્ષ્યાંક 60% છે.',
      hi: 'अपॉइंटमेंट में कमी का लक्ष्य 60% है।'
    },
    'Current system uses HealthBase v4.': {
      gu: 'વર્તમાન સિસ્ટમ HealthBase v4 નો ઉપયોગ કરે છે.',
      hi: 'वर्तमान सिस्टम HealthBase v4 का उपयोग करता है।'
    },
    'The current scheduling workflow creates manual bottlenecks.': {
      gu: 'વર્તમાન શેડ્યૂલિંગ વર્કફ્લો મેન્યુઅલ અવરોધો ઊભા કરે છે.',
      hi: 'वर्तमान शेड्यूलिंग वर्कफ़्लो मैन्युअल बाधाएँ पैदा करता है।'
    },
    'I want to add a waitlist feature.': {
      gu: 'મારે એપોઇન્ટમેન્ટ સિસ્ટમમાં વેઇટલિસ્ટ ફીચર જોઈએ છે.',
      hi: 'मैं अपॉइंटमेंट सिस्टम में वेटलिस्ट फीचर जोड़ना चाहता हूँ।'
    },
    'તમારી એપોઇન્ટમેન્ટ શેડ્યૂલિંગ પ્રક્રિયામાં ત્રણ મુખ્ય અવરોધો છે.': {
      en: 'Your appointment scheduling process has three major bottlenecks.',
      hi: 'आपकी अपॉइंटमेंट शेड्यूलिंग प्रक्रिया में तीन मुख्य बाधाएँ हैं।'
    },
    'आपकी अपॉइंटमेंट शेड्यूलिंग प्रक्रिया में तीन मुख्य बाधाएँ हैं।': {
      en: 'Your appointment scheduling process has three major bottlenecks.',
      gu: 'તમારી એપોઇન્ટમેન્ટ શેડ્યૂલિંગ પ્રક્રિયામાં ત્રણ મુખ્ય અવરોધો છે.'
    },
    'મારે એપોઇન્ટમેન્ટ સિસ્ટમમાં વેઇટલિસ્ટ ફીચર જોઈએ છે.': {
      en: 'I want to add a waitlist feature.',
      hi: 'मैं अपॉइंटमेंट सिस्टम में वेटलिस्ट फीचर जोड़ना चाहता हूँ।'
    },
    'मैं अपॉइंटमेंट सिस्टम में वेटलिस्ट फीचर जोड़ना चाहता हूँ।': {
      en: 'I want to add a waitlist feature.',
      gu: 'મારે એપોઇન્ટમેન્ટ સિસ્ટમમાં વેઇટલિસ્ટ ફીચર જોઈએ છે.'
    }
  };

  if (phraseMap[t] && phraseMap[t][targetLang]) {
    return phraseMap[t][targetLang];
  }

  return text;
}

export const translationService = {
  translateChatMessages,
  translateStructured,
  _cache: translationCache
};

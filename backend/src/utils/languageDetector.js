/**
 * Enterprise Language Detection & Resolution Engine
 * 
 * Implements the RootForge Language Resolution Hierarchy:
 * - PRIORITY 1: Explicit User Language Directives (e.g. "in Gujarati", "gujarati ma", "ગુજરાતીમાં", "in Hindi", "hindi me", "in English")
 * - PRIORITY 2: Character Script Analysis of CURRENT MESSAGE (Indic Unicode scripts: Gujarati \u0A80-\u0AFF, Devanagari \u0900-\u097F)
 * - PRIORITY 3: Conversational vocabulary / Romanized dialect markers
 * - PRIORITY 4: Fallback to current UI language selector
 */

export const SUPPORTED_LANGUAGES = ['en', 'gu', 'hi'];

/**
 * Resolves the conversational language for an incoming message.
 * 
 * @param {string} messageContent - The raw user message text
 * @param {string} fallbackUiLanguage - The active UI language ('en' | 'gu' | 'hi')
 * @returns {'en' | 'gu' | 'hi'} The authoritative conversational language
 */
export function resolveConversationalLanguage(messageContent = '', fallbackUiLanguage = 'en') {
  const normUi = (fallbackUiLanguage || 'en').toLowerCase().trim();
  const safeUi = SUPPORTED_LANGUAGES.includes(normUi) ? normUi : 'en';

  if (!messageContent || typeof messageContent !== 'string') {
    return safeUi;
  }

  const text = messageContent.trim();
  if (text.length === 0) {
    return safeUi;
  }

  const lower = text.toLowerCase();

  // PRIORITY 1: Explicit User Language Directives (English, Gujarati, Hindi)
  // Handles English, Romanized transliterations ("gujarati ma", "hindi me"), and native scripts
  const gujaratiDirectives = [
    /\b(?:in\s+gujarati|gujarati\s+ma|gujarati\s+maa|gujarati\s+bhasha|gujarati\s+language)\b/i,
    /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+gujarati\b/i,
    /\b(?:ગુજરાતીમાં|ગુજરાતી\s+ભાષામાં|ગુજરાતી\s+માં|ગુજરાતી)\b/,
    /\b(?:samjavo|samjao|mane\s+samjavo|mane\s+samjao|kaho\s+mane)\b/i
  ];
  if (gujaratiDirectives.some(pat => pat.test(lower))) {
    return 'gu';
  }

  const hindiDirectives = [
    /\b(?:in\s+hindi|hindi\s+me|hindi\s+mein|hindi\s+bhasha|hindi\s+language)\b/i,
    /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+hindi\b/i,
    /\b(?:हिन्दी\s*में|हिंदी\s*में|हिन्दी\s+भाषा\s+में|हिंदी|हिन्दी)\b/,
    /\b(?:samjhao|batao|bataiye|mujhe\s+batao|samjhaiye)\b/i
  ];
  if (hindiDirectives.some(pat => pat.test(lower))) {
    return 'hi';
  }

  const englishDirectives = [
    /\b(?:in\s+english|english\s+me|english\s+ma|english\s+language)\b/i,
    /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in)\s+english\b/i,
    /\b(?:અંગ્રેજીમાં|અંગ્રેજી\s+ભાષામાં|अंग्रेजी\s*में|अंग्रेजी\s+भाषा\s+में)\b/
  ];
  if (englishDirectives.some(pat => pat.test(lower))) {
    return 'en';
  }

  // PRIORITY 2: Character Script Analysis of CURRENT MESSAGE
  const gujaratiMatches = text.match(/[\u0A80-\u0AFF]/g) || [];
  const hindiMatches = text.match(/[\u0900-\u097F]/g) || [];
  const latinMatches = text.match(/[a-zA-Z]/g) || [];

  const gujaratiCount = gujaratiMatches.length;
  const hindiCount = hindiMatches.length;
  const latinCount = latinMatches.length;

  if (gujaratiCount > 0 && gujaratiCount >= hindiCount) {
    return 'gu';
  }
  if (hindiCount > 0 && hindiCount > gujaratiCount) {
    return 'hi';
  }

  // PRIORITY 3: Common Romanized Dialect Phrases
  if (/\b(su\s+che|kem\s+che|aa\s+mane|karo|kariye|nathi|hoyi|tamne|amne|chhe|kayi\s+rite)\b/i.test(lower)) {
    return 'gu';
  }
  if (/\b(kya\s+hai|kaise\s+kare|yeh\s+kya|kaise\s+hoga|hume|apko|batao|kijiye)\b/i.test(lower)) {
    return 'hi';
  }

  // PRIORITY 4: Substantive English queries
  if (latinCount >= 5) {
    const englishGrammarWords = /\b(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did|will|the|this|that|these|those|there|here|with|about|from|have|has|system|problem|bottleneck|appointment|schedule|scheduling|integrate|integration|database|architecture|process|solution|workflow|reduce|improve|optimize|cost|delay|waitlist|patient|hospital|user|users)\b/i;
    if (englishGrammarWords.test(text) || latinCount >= 18) {
      return 'en';
    }
  }

  // Fallback: Default to active UI language
  return safeUi;
}

/**
 * Detects explicit response-length and formatting constraints in user message.
 * 
 * @param {string} messageContent - The raw user message text
 * @returns {{
 *   length: 'SHORT' | 'MEDIUM' | 'DETAILED',
 *   format: 'DEFAULT' | 'BULLETS' | 'STEPS' | 'EXAMPLE' | 'SINGLE_SENTENCE',
 *   pointCount: number | null
 * }}
 */
export function detectResponseConstraints(messageContent = '') {
  if (!messageContent || typeof messageContent !== 'string') {
    return { length: 'MEDIUM', format: 'DEFAULT', pointCount: null };
  }

  const text = messageContent.trim();
  const lower = text.toLowerCase();

  // Point count detection (e.g. "in 3 points", "3 મુદ્દામાં", "3 बिंदुओं में")
  let pointCount = null;
  const pointMatch = lower.match(/\b(\d+)\s*(?:points?|bullets?|મુદ્દા|મુદ્દાઓ|બિંદુ|बिंदुओं|पॉइंट्स?)\b/i) ||
                     text.match(/(\d+)\s*(?:મુદ્દા|મુદ્દાઓ|બિંદુ|बिंदु|बिंदुओं|પૉઇન્ટ|પોઇન્ટ|પોઈન્ટ)/);
  if (pointMatch) {
    pointCount = parseInt(pointMatch[1], 10);
  }

  // Format detection
  let format = 'DEFAULT';
  if (pointCount || /\b(bullet|bullets|point|points|bullet\s+points)\b/i.test(lower) || /(પોઈન્ટ|પોઈન્ટ્સ|પોઇન્ટ|મુદ્દા|મુદ્દાઓ|બિંદુ|बिंदુ|बिंदुओं)/.test(text)) {
    format = 'BULLETS';
  } else if (/\b(step\s+by\s+step|steps)\b/i.test(lower) || /(પગલાં|તબક્કાવાર|चरणबद्ध)/.test(text)) {
    format = 'STEPS';
  } else if (/\b(compare|comparison|versus|vs|pros\s+and\s+cons)\b/i.test(lower) || /(સરખામણી|તુલના)/.test(text)) {
    format = 'COMPARISON';
  } else if (/\b(example|for\s+example)\b/i.test(lower) || /(દાખલો|ઉદાહરણ|उदाहरण)/.test(text)) {
    format = 'EXAMPLE';
  } else if (/\b(one\s+sentence|single\s+sentence)\b/i.test(lower) || /(એક\s+વાક્ય|एक\s+वाक्य)/.test(text)) {
    format = 'SINGLE_SENTENCE';
  }

  // Length detection: SHORT
  const shortPatterns = [
    /\b(short|in\s+short|keep\s+it\s+short|short\s+answer|brief|briefly|quickly|shortly|concise|concisely)\b/i,
    /\b(give\s+me\s+only\s+the\s+answer|only\s+the\s+answer|one\s+sentence|summary\s+only|just\s+answer)\b/i,
    /(ટૂંકમાં|ટૂંકું|ટૂંકો|સંક્ષિપ્ત|સંક્ષિપ્તમાં|ટુંકમાં)/,
    /(संक्षेप\s*में|छोटा\s*उत्तर|संक्षिप्त|कम\s+शब्दों\s+में)/
  ];

  // Length detection: DETAILED
  const detailedPatterns = [
    /\b(detailed|in\s+detail|in-depth|comprehensive|thorough|thoroughly|explain\s+deeply|deep\s+dive|full\s+explanation)\b/i,
    /\b(step\s+by\s+step\s+guide|exhaustive|elaborate|elaborately)\b/i,
    /(વિગતવાર|વિસ્તારથી|વિસ્તૃત|ઊંડાણપૂર્વક)/,
    /(विस्तार\s*से|गहराई\s*से|विस्तृत|विस्तारपूर्वक)/
  ];

  let length = 'MEDIUM';
  if (shortPatterns.some(p => p.test(lower))) {
    length = 'SHORT';
  } else if (detailedPatterns.some(p => p.test(lower))) {
    length = 'DETAILED';
  } else if (pointCount && pointCount <= 3) {
    length = 'SHORT';
  }

  return {
    length,
    format,
    pointCount
  };
}

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
 * Implements deterministic response-length and format directives:
 * - ONE_LINE: Exactly 1 concise sentence (approx 15-25 words)
 * - TWO_LINES: Approximately 2 lines / 2 sentences
 * - BULLETS: Exactly N points/bullets when specified (e.g. "3 points", "give me 3 risks")
 * - SHORT / BRIEF: Concise answer in 2-4 sentences or bullets, no fluff
 * - DETAILED: Comprehensive structured explanation
 * - NORMAL: Default standard consultation depth
 * 
 * @param {string} messageContent - The raw user message text
 * @returns {{
 *   length: 'ONE_LINE' | 'TWO_LINES' | 'SHORT' | 'NORMAL' | 'DETAILED',
 *   format: 'DEFAULT' | 'BULLETS' | 'STEPS' | 'COMPARISON' | 'EXAMPLE' | 'SINGLE_SENTENCE' | 'TWO_LINES',
 *   pointCount: number | null,
 *   maxTokensLimit: number,
 *   instruction: string
 * }}
 */
export function detectResponseConstraints(messageContent = '') {
  if (!messageContent || typeof messageContent !== 'string') {
    return {
      length: 'NORMAL',
      format: 'DEFAULT',
      pointCount: null,
      maxTokensLimit: 2048,
      instruction: 'Provide a useful, structured answer with appropriate detail.'
    };
  }

  const text = messageContent.trim();
  const lower = text.toLowerCase();

  // 1. One Line / Single Sentence detection
  const isOneLine =
    /\b(?:answer\s+in\s+one\s+line|in\s+one\s+line|one\s+line|1\s+line|single\s+line|in\s+a\s+single\s+line|one\s+sentence|in\s+one\s+sentence|single\s+sentence|1\s+sentence)\b/i.test(lower) ||
    /(?:એક\s+વાક્યમાં|એક\s+લાઇનમાં|૧\s+વાક્ય|1\s+વાક્ય|એક\s+વાક્ય|एक\s+लाइन\s+में|एक\s+वाक्य\s+में|1\s+वाक्य|૧\s+લાઇન)/.test(text);

  // 2. Two Lines / Two Sentences detection
  const isTwoLines =
    /\b(?:answer\s+in\s+2\s+lines|in\s+2\s+lines|2\s+lines|two\s+lines|in\s+two\s+lines|2\s+sentences|two\s+sentences|in\s+2\s+sentences|in\s+two\s+sentences)\b/i.test(lower) ||
    /(?:બે\s+વાક્યમાં|બે\s+લાઇનમાં|૨\s+વાક્ય|2\s+વાક્ય|બે\s+વાક્ય|दो\s+लाइन\s+में|दो\s+वाक्य\s+में|2\s+वाक्य|૨\s+લાઇન)/.test(text);

  // 3. Point count detection (e.g. "3 points", "give me 3 risks", "5 bullets", "3 મુદ્દા", "3 બિંદુ", "3 बिंदु")
  let pointCount = null;
  const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const pointMatch =
    lower.match(/\b(?:give\s+me\s+|in\s+|show\s+|list\s+|provide\s+)?(\d+)\s*(?:[\w\s]{0,25}?)\s*(?:points?|bullets?|risks?|items?|reasons?|recommendations?|solutions?|steps?|features?)\b/i) ||
    text.match(/(\d+)\s*(?:[\u0A80-\u0AFF\u0900-\u097F\w\s]{0,20}?)\s*(?:મુદ્દા|મુદ્દાઓ|બિંદુ|बिંદુ|बिંદुओं|પૉઇન્ટ|પોઇન્ટ|પોઈન્ટ|જોખિમ|પડકારો|કારણો|સૂચનો)/) ||
    lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:[\w\s]{0,25}?)\s*(?:points?|bullets?|risks?|items?|recommendations?)\b/i);

  if (pointMatch) {
    const rawVal = pointMatch[1]?.toLowerCase().trim();
    if (/^\d+$/.test(rawVal)) {
      pointCount = parseInt(rawVal, 10);
    } else if (rawVal && wordToNum[rawVal]) {
      pointCount = wordToNum[rawVal];
    }
  }

  // 4. Detailed detection
  const detailedPatterns = [
    /\b(detailed|in\s+detail|in-depth|comprehensive|thorough|thoroughly|explain\s+deeply|deep\s+dive|full\s+explanation)\b/i,
    /\b(give\s+me\s+a\s+detailed\s+explanation|detailed\s+breakdown|step\s+by\s+step\s+guide|exhaustive|elaborate|elaborately)\b/i,
    /(વિગતવાર|વિસ્તારથી|વિસ્તૃત|ઊંડાણપૂર્વક)/,
    /(विस्तार\s*से|गहराई\s*से|विस्तृत|विस्तारपूर्वक)/
  ];
  const isDetailed = detailedPatterns.some(p => p.test(lower));

  // 5. Short / Brief / Summary detection
  const shortPatterns = [
    /\b(short|in\s+short|keep\s+it\s+short|short\s+answer|brief|briefly|explain\s+briefly|quickly|shortly|concise|concisely|give\s+me\s+a\s+concise\s+answer)\b/i,
    /\b(summarize|summary|tldr|tl;dr|tl-dr|in\s+a\s+nutshell|quick\s+summary|give\s+me\s+only\s+the\s+answer|only\s+the\s+answer|just\s+answer)\b/i,
    /(ટૂંકમાં|ટૂંકું|ટૂંકો|સંક્ષિપ્ત|સંક્ષિપ્તમાં|ટુંકમાં|ટૂંકમાં\s+સમજાવો)/,
    /(संक्षेप\s*में|छोटा\s*उत्तर|संक्षिप्त|कम\s+शब्दों\s+में|संक्षेप\s+में\s+बताएं)/
  ];
  const isShort = shortPatterns.some(p => p.test(lower));

  // Resolve Length & Format Hierarchy (User explicit request is King)
  if (isOneLine) {
    return {
      length: 'ONE_LINE',
      format: 'SINGLE_SENTENCE',
      pointCount: null,
      maxTokensLimit: 256,
      instruction: 'Answer in EXACTLY one concise sentence (approx 15-25 words). Absolutely no extra paragraphs, no bullet points, no filler.'
    };
  }

  if (isTwoLines) {
    return {
      length: 'TWO_LINES',
      format: 'TWO_LINES',
      pointCount: null,
      maxTokensLimit: 384,
      instruction: 'Answer in approximately 2 concise sentences/lines. Avoid unnecessary background.'
    };
  }

  if (pointCount !== null) {
    return {
      length: pointCount <= 3 ? 'SHORT' : (pointCount <= 5 ? 'NORMAL' : 'DETAILED'),
      format: 'BULLETS',
      pointCount,
      maxTokensLimit: Math.min(1024, pointCount * 120 + 200),
      instruction: `Return EXACTLY ${pointCount} concise bullet points. No introductory filler, no concluding boilerplate.`
    };
  }

  if (isDetailed) {
    return {
      length: 'DETAILED',
      format: 'DEFAULT',
      pointCount: null,
      maxTokensLimit: 4096,
      instruction: 'Provide a comprehensive, in-depth structured explanation covering architecture, operational impact, and concrete recommendations.'
    };
  }

  if (isShort) {
    return {
      length: 'SHORT',
      format: 'DEFAULT',
      pointCount: null,
      maxTokensLimit: 512,
      instruction: 'Answer concisely in 2 to 4 short sentences or bullets. Avoid unnecessary background or repetitive text.'
    };
  }

  // Formatting-only directives (without explicit length)
  let format = 'DEFAULT';
  if (/\b(bullet|bullets|point|points|bullet\s+points)\b/i.test(lower) || /(પોઈન્ટ|પોઈન્ટ્સ|પોઇન્ટ|મુદ્દા|મુદ્દાઓ|બિંદુ|बिંદુ|बिંદुओं)/.test(text)) {
    format = 'BULLETS';
  } else if (/\b(step\s+by\s+step|steps)\b/i.test(lower) || /(પગલાં|તબક્કાવાર|चरणबद्ध)/.test(text)) {
    format = 'STEPS';
  } else if (/\b(compare|comparison|versus|vs|pros\s+and\s+cons)\b/i.test(lower) || /(સરખામણી|તુલના)/.test(text)) {
    format = 'COMPARISON';
  } else if (/\b(example|for\s+example)\b/i.test(lower) || /(દાખલો|ઉદાહરણ|उदाहरण)/.test(text)) {
    format = 'EXAMPLE';
  }

  return {
    length: 'NORMAL',
    format,
    pointCount: null,
    maxTokensLimit: 2048,
    instruction: 'Provide a useful, structured answer with appropriate detail.'
  };
}

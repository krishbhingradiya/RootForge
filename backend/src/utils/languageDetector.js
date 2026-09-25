/**
 * Enterprise Language Detection & Resolution Engine
 * 
 * Supports all major Indic & global enterprise languages:
 * - English (en)
 * - Hindi (hi)
 * - Gujarati (gu)
 * - Marathi (mr)
 * - Bengali (bn)
 * - Tamil (ta)
 * - Telugu (te)
 * - Kannada (kn)
 * - Malayalam (ml)
 * - Punjabi (pa)
 * - Urdu (ur)
 * 
 * Implements the RootForge Language Resolution Hierarchy:
 * - PRIORITY 1: Explicit User Language Directives ("in Gujarati", "hindi me", "marathi madhe", "tell in tamil", etc.)
 * - PRIORITY 2: Character Script Analysis of CURRENT MESSAGE (Unicode block frequency)
 * - PRIORITY 3: Conversational vocabulary / Romanized dialect & mixed-speech markers (Gujlish, Hinglish, Marathlish, Tanglish, etc.)
 * - PRIORITY 4: Substantive English grammar & vocabulary
 * - PRIORITY 5: Fallback to active language / English
 */

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'pa', 'ur'];

export const LANGUAGE_NAMES = {
  en: { code: 'en', name: 'English', native: 'English', bcp47: 'en-IN' },
  hi: { code: 'hi', name: 'Hindi', native: 'हिन्दी', bcp47: 'hi-IN' },
  gu: { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', bcp47: 'gu-IN' },
  mr: { code: 'mr', name: 'Marathi', native: 'मराठी', bcp47: 'mr-IN' },
  bn: { code: 'bn', name: 'Bengali', native: 'বাংলা', bcp47: 'bn-IN' },
  ta: { code: 'ta', name: 'Tamil', native: 'தமிழ்', bcp47: 'ta-IN' },
  te: { code: 'te', name: 'Telugu', native: 'తెలుగు', bcp47: 'te-IN' },
  kn: { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
  ml: { code: 'ml', name: 'Malayalam', native: 'മലയാളം', bcp47: 'ml-IN' },
  pa: { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', bcp47: 'pa-IN' },
  ur: { code: 'ur', name: 'Urdu', native: 'اردو', bcp47: 'ur-PK' }
};

/**
 * Resolves the conversational language for an incoming message.
 * 
 * @param {string} messageContent - The raw user message text
 * @param {string} fallbackUiLanguage - The active UI language or manual selection
 * @returns {string} The authoritative conversational language code
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

  // PRIORITY 1: Explicit User Language Directives
  if (/\b(?:in\s+gujarati|gujarati\s+ma|gujarati\s+maa|gujarati\s+bhasha|gujarati\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+gujarati\b/i.test(lower) ||
      /\b(?:ગુજરાતીમાં|ગુજરાતી\s+ભાષામાં|ગુજરાતી\s+માં)\b/.test(text)) {
    return 'gu';
  }

  if (/\b(?:in\s+hindi|hindi\s+me|hindi\s+mein|hindi\s+bhasha|hindi\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+hindi\b/i.test(lower) ||
      /\b(?:हिन्दी\s*में|हिंदी\s*में|हिन्दी\s+भाषा\s+में)\b/.test(text)) {
    return 'hi';
  }

  if (/\b(?:in\s+marathi|marathi\s+madhe|marathi\s+bhasha|marathi\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+marathi\b/i.test(lower) ||
      /\b(?:मराठीत|मराठीमध्ये|मराठी\s+भाषेत)\b/.test(text)) {
    return 'mr';
  }

  if (/\b(?:in\s+bengali|in\s+bangla|bangla\s+te|bengali\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+(?:bengali|bangla)\b/i.test(lower) ||
      /\b(?:বাংলায়|বাংলা\s+ভাষায়)\b/.test(text)) {
    return 'bn';
  }

  if (/\b(?:in\s+tamil|tamil\s+il|tamil\s+la|tamil\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+tamil\b/i.test(lower) ||
      /\b(?:தமிழில்|தமிழ்\s+மொழியில்)\b/.test(text)) {
    return 'ta';
  }

  if (/\b(?:in\s+telugu|telugu\s+lo|telugu\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+telugu\b/i.test(lower) ||
      /\b(?:తెలుగులో|తెలుగు\s+భాషలో)\b/.test(text)) {
    return 'te';
  }

  if (/\b(?:in\s+kannada|kannada\s+dalli|kannada\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+kannada\b/i.test(lower) ||
      /\b(?:ಕನ್ನಡದಲ್ಲಿ|ಕನ್ನಡ\s+ಭಾಷೆಯಲ್ಲಿ)\b/.test(text)) {
    return 'kn';
  }

  if (/\b(?:in\s+malayalam|malayalam\s+il|malayalam\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+malayalam\b/i.test(lower) ||
      /\b(?:മലയാളത്തിൽ|മലയാളം\s+ഭാഷയിൽ)\b/.test(text)) {
    return 'ml';
  }

  if (/\b(?:in\s+punjabi|punjabi\s+vich|punjabi\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+punjabi\b/i.test(lower) ||
      /\b(?:ਪੰਜਾਬੀ\s+ਵਿੱਚ|ਪੰਜਾਬੀ\s+ਵਿਚ)\b/.test(text)) {
    return 'pa';
  }

  if (/\b(?:in\s+urdu|urdu\s+mein|urdu\s+me|urdu\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in|tell\s+in)\s+urdu\b/i.test(lower) ||
      /\b(?:اردو\s+میں)\b/.test(text)) {
    return 'ur';
  }

  if (/\b(?:in\s+english|english\s+me|english\s+ma|english\s+language)\b/i.test(lower) ||
      /(?:answer\s+in|respond\s+in|speak\s+in|write\s+in|explain\s+in)\s+english\b/i.test(lower) ||
      /\b(?:અંગ્રેજીમાં|अंग्रेजी\s*में|इंग्रजीत|ইংরেজিতে|ஆங்கிலத்தில்|ఇంగ్లీష్‌లో)\b/.test(text)) {
    return 'en';
  }

  // PRIORITY 2: Character Script Analysis of CURRENT MESSAGE
  const gujaratiMatches = text.match(/[\u0A80-\u0AFF]/g) || [];
  const devanagariMatches = text.match(/[\u0900-\u097F]/g) || [];
  const bengaliMatches = text.match(/[\u0980-\u09FF]/g) || [];
  const tamilMatches = text.match(/[\u0B80-\u0BFF]/g) || [];
  const teluguMatches = text.match(/[\u0C00-\u0C7F]/g) || [];
  const kannadaMatches = text.match(/[\u0C80-\u0CFF]/g) || [];
  const malayalamMatches = text.match(/[\u0D00-\u0D7F]/g) || [];
  const gurmukhiMatches = text.match(/[\u0A00-\u0A7F]/g) || [];
  const arabicMatches = text.match(/[\u0600-\u06FF]/g) || [];
  const latinMatches = text.match(/[a-zA-Z]/g) || [];

  if (gujaratiMatches.length > 0 && gujaratiMatches.length >= devanagariMatches.length) {
    return 'gu';
  }
  if (bengaliMatches.length > 0) return 'bn';
  if (tamilMatches.length > 0) return 'ta';
  if (teluguMatches.length > 0) return 'te';
  if (kannadaMatches.length > 0) return 'kn';
  if (malayalamMatches.length > 0) return 'ml';
  if (gurmukhiMatches.length > 0) return 'pa';
  if (arabicMatches.length > 0) return 'ur';

  // Devanagari script: Differentiate Marathi (mr) vs Hindi (hi)
  if (devanagariMatches.length > 0) {
    const marathiDevanagariWords = /\b(?:आहे|नाही|कसे|करावे|मला|पाहिजे|सांगा|करायचे|आहेत|कसा|कशी|काय|आम्हाला|माहिती|द्या|द्यावी|झाले|होते)\b/;
    if (marathiDevanagariWords.test(text)) {
      return 'mr';
    }
    return 'hi';
  }

  // PRIORITY 3: Common Romanized Dialect Phrases & Mixed Language Analysis
  // 3.1 Gujarati / Gujlish
  if (/\b(?:maru\s+naam|maru|maro|mari|mare|tamaru|tamaro|tamari|aapdu|aapda|aapdi|chhe|che|nathi|samjhavo|samjaav|kaho|kem|banaavo|mane|apne|aa\s+project|project\s+samjhavo|su\s+che|kem\s+che|aa\s+mane|kariye|hoyi|tamne|amne|kayi\s+rite|karvu\s+che|karvo\s+che|banavvo\s+che|banavvu\s+che|thodu\s+simple|thodu|simple\s+kar|saral\s+kar|aama\s+|tema\s+|banaav|su\s+karyu|kevi\s+rite|kem\s+karo|joiye\s+che|joie\s+che|nu\s+workflow|nu\s+system|nu\s+design|aeno|aeni)\b/i.test(lower)) {
    return 'gu';
  }

  // 3.2 Marathi / Marathlish
  if (/\b(?:mala\s+pahije|kasa\s+karaycha|kashi\s+karaychi|saanga|sangava|aahe|nahi|kiti|aamhi|kashala|kay\s+aahe|aamchya|tumchya|mahiti\s+dya|kase\s+karnar)\b/i.test(lower)) {
    return 'mr';
  }

  // 3.3 Hindi / Hinglish
  if (/\b(?:mera\s+naam|mera|meri|mere|samjhao|samjhaiye|batao|bataiye|karo|kijiye|hoga|hogi|hoge|hai|hain|nahi|nahin|maine|aapka|aapki|aapke|humara|humari|humare|mujhe|tumhe|kya|kyun|kaise|kab|kahan|kya\s+hai|kaise\s+kare|yeh\s+kya|kaise\s+hoga|hume|apko|karna\s+hai|banana\s+hai|thoda\s+simple|thoda|simple\s+karo|aasan\s+karo|isme\s+|usme\s+|isko|usko|bataye|kaise\s+banaye|chahiye|iska\s+architecture|iska\s+database|ka\s+workflow)\b/i.test(lower)) {
    return 'hi';
  }

  // 3.4 Bengali / Banglish
  if (/\b(?:amake\s+bolun|kivabe\s+korbo|chai|korte\s+hobe|dorkar|bujhiye\s+din|ki\s+vabe|amader|apnar|janan)\b/i.test(lower)) {
    return 'bn';
  }

  // 3.5 Tamil / Tanglish
  if (/\b(?:enakku\s+vendum|eppadi\s+pannuvathu|sollunga|vilakkunga|puriyala|panna\s+vendum|solli\s+thanga|kudunga)\b/i.test(lower)) {
    return 'ta';
  }

  // 3.6 Telugu / Teluglish
  if (/\b(?:naaku\s+kavali|ela\s+cheyyali|cheppandi|vivarinchandi|enti|cheyyandi|cheppara)\b/i.test(lower)) {
    return 'te';
  }

  // 3.7 Kannada / Kanglish
  if (/\b(?:nanage\s+beku|hege\s+madodu|heli|vivarisi|madbeku|enu\s+madodu)\b/i.test(lower)) {
    return 'kn';
  }

  // 3.8 Malayalam / Manglish
  if (/\b(?:enikku\s+venam|engane\s+cheyyam|parayoo|cheyyanam|vishadheekarikkoo|enthanu)\b/i.test(lower)) {
    return 'ml';
  }

  // 3.9 Punjabi / Roman Punjabi
  if (/\b(?:mainu\s+chahida|kive\s+kariye|dasso|samjhao|daso|chahidi|karna\s+ae)\b/i.test(lower)) {
    return 'pa';
  }

  // 3.10 Urdu / Roman Urdu
  if (/\b(?:mujhe\s+chahiye|kaise\s+karein|bataiye|samjhaiye|wazahat\s+karein|kya\s+tareeqa\s+hai)\b/i.test(lower)) {
    return 'ur';
  }

  // PRIORITY 4: Substantive English queries
  if (latinMatches.length >= 4) {
    const englishGrammarWords = /\b(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did|will|the|this|that|these|those|there|here|with|about|from|have|has|system|problem|bottleneck|appointment|schedule|scheduling|integrate|integration|database|architecture|process|solution|workflow|reduce|improve|optimize|cost|delay|waitlist|patient|hospital|user|users|diagram|prompt|failing|explain|design|create|now)\b/i;
    if (englishGrammarWords.test(text) || latinMatches.length >= 16) {
      return 'en';
    }
  }

  // Fallback: Default to active UI language or safe English
  return safeUi;
}

/**
 * Detects explicit response-length, formatting, and intent constraints in user message.
 * 
 * Implements deterministic directives:
 * - SIMPLIFIED: Simple, plain-language breakdown / simplification of previous context
 * - PROMPT: Usable, copy-paste prompt template
 * - WORKFLOW: Direct step-by-step flow diagram structure with actors and stages
 * - DIAGNOSTICS: Root cause analysis + actionable fix
 * - ONE_LINE: Exactly 1 concise sentence (approx 15-25 words)
 * - TWO_LINES: Approximately 2 lines / 2 sentences
 * - BULLETS: Exactly N points/bullets when specified
 * - SHORT / BRIEF: Concise answer in 2-4 sentences or bullets, no fluff
 * - DETAILED: Comprehensive structured explanation
 * - NORMAL: Default standard consultation depth
 * 
 * @param {string} messageContent - The raw user message text
 * @returns {{
 *   length: 'ONE_LINE' | 'TWO_LINES' | 'SHORT' | 'NORMAL' | 'DETAILED',
 *   format: 'DEFAULT' | 'BULLETS' | 'STEPS' | 'COMPARISON' | 'EXAMPLE' | 'SINGLE_SENTENCE' | 'TWO_LINES' | 'SIMPLIFIED' | 'PROMPT' | 'WORKFLOW' | 'DIAGNOSTICS',
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

  // 0. Simplification detection ("make it simple", "aa thodu simple kar", "thoda simple karo", "simplify")
  const isSimplify =
    /\b(?:make\s+it\s+simple|simplify(?:\s+this)?|keep\s+it\s+simple|simple\s+terms?|in\s+simple\s+words?|explain\s+simply|plain\s+english|plain\s+terms?)\b/i.test(lower) ||
    /\b(?:aa\s+thodu\s+simple\s+kar|thodu\s+simple\s+kar|simple\s+kar|saral\s+karo|saral\s+kar|thoda\s+simple\s+karo|aasan\s+banao|aasan\s+shabdo\s+me)\b/i.test(lower) ||
    /(?:સરળ\s+કરો|સરળ\s+ભાષામાં|ટૂંકું\s+અને\s+સરળ|આસાન\s+કરો|सरल\s+करें|सरल\s+भाषा\s+में|आसान\s+बनाएं)/.test(text);

  if (isSimplify) {
    return {
      length: 'SHORT',
      format: 'SIMPLIFIED',
      pointCount: null,
      maxTokensLimit: 768,
      instruction: 'Simplify the previous concept/answer into clear, plain-language points with zero corporate jargon. Directly explain what it does in 3-4 easy bullet points.'
    };
  }

  // 0.1 Prompt Request detection ("give me prompt for this", "write a prompt", "prompt do", "prompt aap")
  const isPromptRequest =
    /\b(?:give\s+me\s+(?:a\s+)?prompt|write\s+(?:a\s+)?prompt|create\s+(?:a\s+)?prompt|generate\s+(?:a\s+)?prompt|prompt\s+for\s+this|prompt\s+do|prompt\s+aap|prompt\s+banao)\b/i.test(lower) ||
    /(?:પ્રોમ્પ્ટ\s+આપો|પ્રોમ્પ્ટ\s+લખો|પ્રોમ્પ્ટ\s+બનાવો|प्रॉम्प्ट\s+दें|प्रॉम्प्ट\s+लिखें|प्रॉम्प्ट\s+बनाएं)/.test(text);

  if (isPromptRequest) {
    return {
      length: 'NORMAL',
      format: 'PROMPT',
      pointCount: null,
      maxTokensLimit: 1024,
      instruction: 'Provide a clean, copy-pasteable, production-ready prompt template tailored specifically to the current context. Include placeholders in [SQUARE_BRACKETS] and clear instructions.'
    };
  }

  // 0.2 Flow Diagram / Workflow Request detection
  const isWorkflowRequest =
    /\b(?:flow\s+diagram|flowchart|flow\s+chart|workflow|create\s+a\s+flow|make\s+a\s+flow|flow\s+banavvo|flow\s+banana|process\s+flow)\b/i.test(lower) ||
    /(?:ફ્લો\s+ડાયાગ્રામ|ફ્લોચાર્ટ|વર્કફ્લો|ફ્લો\s+બનાવો|ફ્લો\s+બનાવવો|फ्लो\s+डायग्राम|फ्लोचार्ट|वर्कफ़्लो|फ्लो\s+बनाएं)/.test(text);

  // 0.3 Diagnostics / Why is this failing detection
  const isDiagnosticsRequest =
    /\b(?:why\s+is\s+this\s+failing|why\s+failing|what\s+is\s+failing|why\s+error|error\s+kem\s+aave|kyun\s+fail\s+ho\s+raha|why\s+broken|debug\s+this|how\s+to\s+fix\s+this)\b/i.test(lower) ||
    /(?:આ\s+કેમ\s+ફેલ\s+થાય\s+છે|ભૂલ\s+કેમ\s+આવે\s+છે|यह\s+क्यों\s+विफल\s+हो\s+रहा\s+है|त्रुटि\s+क्यों\s+आ\s+रही\s+है)/.test(text);

  if (isDiagnosticsRequest) {
    return {
      length: 'NORMAL',
      format: 'DIAGNOSTICS',
      pointCount: null,
      maxTokensLimit: 1200,
      instruction: 'Identify the exact likely root cause(s) based on available context and technical constraints, followed by concrete, actionable steps to resolve the issue.'
    };
  }

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

  if (isWorkflowRequest) {
    return {
      length: 'NORMAL',
      format: 'WORKFLOW',
      pointCount: null,
      maxTokensLimit: 1536,
      instruction: 'Provide a structured, step-by-step workflow with clear stages (e.g. Intake -> Validation -> Processing -> Completion) and decision branches.'
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

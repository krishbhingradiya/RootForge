/**
 * Enterprise Client-Side Language Detection & Resolution Engine
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
 */

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml', 'pa', 'ur'];

export const LANGUAGE_OPTIONS = [
  { code: 'auto', label: 'Auto Detect', native: 'Auto Detect', flag: '🌐' },
  { code: 'en', label: 'English', native: 'English', flag: '🇺🇸', bcp47: 'en-IN' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', bcp47: 'hi-IN' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳', bcp47: 'gu-IN' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🇮🇳', bcp47: 'mr-IN' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🇮🇳', bcp47: 'bn-IN' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳', bcp47: 'ta-IN' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳', bcp47: 'te-IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳', bcp47: 'kn-IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳', bcp47: 'ml-IN' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳', bcp47: 'pa-IN' },
  { code: 'ur', label: 'Urdu', native: 'اردو', flag: '🇵🇰', bcp47: 'ur-PK' }
];

export const LANGUAGE_DISPLAY_MAP = {
  en: 'English',
  hi: 'हिन्दी',
  gu: 'ગુજરાતી',
  mr: 'मराठी',
  bn: 'বাংলা',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  pa: 'ਪੰਜਾਬੀ',
  ur: 'اردو'
};

/**
 * Resolves the conversational language for an incoming message.
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

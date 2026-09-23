/**
 * RootForge AI Consultant — Domain Classifier & Boundary Guard
 * 
 * Classifies incoming messages BEFORE context assembly and LLM generation:
 * - WORKSPACE_RELATED: Questions regarding workspace facts, goals, constraints, bottlenecks, actors
 * - BUSINESS_RELATED: Business requirements, challenges, KPIs, processes, ROI, workflows
 * - ROOTFORGE_RELATED: Architecture, API blueprints, database schemas, RootForge modules
 * - DOCUMENT_RELATED: Questions querying uploaded documents, SOPs, BRDs, technical docs
 * - GREETING: Polite conversational greetings (e.g. "Hello", "Hi", "નમસ્તે", "नमस्ते")
 * - GENERAL_OFF_DOMAIN: General trivia, weather, sports, jokes, stocks, casual chitchat
 */

export const DOMAIN_CLASSES = {
  WORKSPACE_RELATED: 'WORKSPACE_RELATED',
  BUSINESS_RELATED: 'BUSINESS_RELATED',
  ROOTFORGE_RELATED: 'ROOTFORGE_RELATED',
  DOCUMENT_RELATED: 'DOCUMENT_RELATED',
  GREETING: 'GREETING',
  GENERAL_OFF_DOMAIN: 'GENERAL_OFF_DOMAIN'
};

const GREETING_PATTERNS = [
  /^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|greetings|howdy)[\s!.]*$/i,
  /^(નમસ્તે|નમસ્કાર|કેમ\s+છો|કેમ\s+છે|હેલો)[\s!.]*$/u,
  /^(नमस्ते|प्रणाम|सुप्रभात|शुभ\s+संध्या|हैलो)[\s!.]*$/u
];

const OFF_DOMAIN_PATTERNS = [
  // Weather
  /\b(weather|temperature|forecast|rain|raining|will\s+it\s+rain|sunny|climate|humidity)\b/i,
  /(હવામાન|તાપમાન|વરસાદ|વાદળ|ગરમી)/u,
  /(मौसम|तापमान|बारिश|वर्षा|बादल|धूप)/u,

  // Jokes, humor, creative writing
  /\b(tell\s+(me\s+)?(a\s+)?joke|funny|make\s+me\s+laugh|riddle|pun)\b/i,
  /\bwrite\s+(me\s+)?(a\s+)?(poem|story|song|script|essay|rap|love\s+letter|birthday\s+message)\b/i,
  /(જોક|જોક્સ|રમુજ|વાર્તા|કવિતા|ગીત|જન્મદિવસ)/u,
  /(चुटकुला|चुटकुले|मजाक|कहानी|कविता|गाना|गीत|जन्मदिन)/u,

  // Sports, match scores, trivia
  /\b(who\s+won\s+yesterday|yesterday's\s+match|cricket\s+score|ipl|world\s+cup|football\s+match|premier\s+league|nba|tennis)\b/i,
  /(મેચ|ક્રિકેટ|ફૂટબોલ|વર્લ્ડ\s+કપ)/u,
  /(मैच|क्रिकेट|फुटबॉल|वर्ल्ड\s+कप|स्कोर)/u,

  // General trivia, geography, celebrities
  /\b(capital\s+of|who\s+is\s+the\s+president\s+of|who\s+is\s+the\s+prime\s+minister\s+of|tallest\s+mountain|distance\s+to\s+moon)\b/i,
  /\b(best\s+movie|recommend\s+a\s+movie|hollywood|bollywood|actor|actress)\b/i,

  // Financial stocks & crypto speculation
  /\b(stock\s+price|today's\s+stock|bitcoin\s+price|crypto\s+price|share\s+price|nifty|sensex)\b/i,
  /(શેર\s+બજાર|શેરનો\s+ભાવ|સ્ટોક\s+પ્રાઈસ)/u,
  /(शेयर\s+बाजार|शेयर\s+का\s+भाव|स्टॉक\s+प्राइस)/u,

  // General cooking / recipes
  /\b(recipe\s+for|how\s+to\s+cook|how\s+to\s+bake|ingredients\s+for)\b/i
];

const DOCUMENT_PATTERNS = [
  /\b(document|documents|file|files|doc|docs|sop|brd|uploaded|upload|pdf|spec|attachment|handbook|manual)\b/i,
  /(દસ્તાવેજ|ફાઇલ|ડોક્યુમેન્ટ|એસઓપી|બીઆરડી)/u,
  /(दस्तावेज़|फ़ाइल|दस्तावेज|दस्तावेजों|एसओपी)/u
];

const ROOTFORGE_PATTERNS = [
  /\b(architecture|architectural|api|apis|rest\s+api|endpoint|endpoints|database|databases|schema|tables|microservices|integration|integrations|connector|gateway|webhook|discovery\s+module|solution\s+builder|rootforge)\b/i,
  /(આર્કિટેક્ચર|એપીઆઈ|ડેટાબેઝ|સ્કીમા|ઇન્ટિગ્રેશન|રૂટફોર્જ)/u,
  /(आर्किटेक्चर|एपीआई|डेटाबेस|स्कीमा|इंटीग्रेशन|रूटफोर्ज)/u
];

const BUSINESS_PATTERNS = [
  /\b(business\s+requirement|business\s+requirements|requirement|requirements|objective|objectives|kpi|kpis|metric|metrics|challenge|challenges|bottleneck|bottlenecks|friction|roi|workflow|process|steps|turnaround|efficiency|sla|compliance|stakeholder|stakeholders|target\s+users)\b/i,
  /(જરૂરિયાતો|જરૂરિયાત|ઉદ્દેશ|પડકાર|અવરોધ|વર્કફ્લો|પ્રક્રિયા|કાર્યક્ષમતા|મેન્યુઅલ)/u,
  /(आवश्यकता|आवश्यकताएं|उद्देश्य|चुनौती|बाधा|वर्कफ़्लो|प्रक्रिया|दक्षता|हितधारक)/u
];

/**
 * Classifies an incoming message into one of the canonical domain classes.
 * 
 * @param {string} userMessage - Raw message text
 * @param {object} context - Consolidated workspace context
 * @param {Array} conversationHistory - Prior conversation messages
 * @returns {{
 *   domain: string,
 *   confidence: number,
 *   reason: string
 * }}
 */
export function classifyDomain(userMessage = '', context = {}, conversationHistory = []) {
  const text = (userMessage || '').trim();
  if (!text) {
    return {
      domain: DOMAIN_CLASSES.WORKSPACE_RELATED,
      confidence: 0.9,
      reason: 'Empty message'
    };
  }

  const lower = text.toLowerCase();

  // 1. Check for pure polite greetings
  if (GREETING_PATTERNS.some(pat => pat.test(lower) || pat.test(text))) {
    return {
      domain: DOMAIN_CLASSES.GREETING,
      confidence: 0.98,
      reason: 'Polite initial greeting or conversational opening'
    };
  }

  // 2. Extract workspace tokens to avoid false off-domain classification if workspace matches
  const ws = context?.workspace || {};
  const wsKeywords = [
    ws.name,
    ws.industry,
    ws.objective,
    ws.challenge,
    ws.targetUsers
  ].filter(Boolean).join(' ').toLowerCase();

  // 3. Check for explicit off-domain queries
  const isOffDomain = OFF_DOMAIN_PATTERNS.some(pat => pat.test(lower) || pat.test(text));
  if (isOffDomain) {
    // Check if the query also specifically references the workspace
    const hasExplicitWorkspaceRef = ws.name && lower.includes(ws.name.toLowerCase());
    if (!hasExplicitWorkspaceRef) {
      return {
        domain: DOMAIN_CLASSES.GENERAL_OFF_DOMAIN,
        confidence: 0.98,
        reason: 'Inquiry relates to general off-domain knowledge, weather, sports, or entertainment'
      };
    }
  }

  // 4. Document-focused queries
  if (DOCUMENT_PATTERNS.some(pat => pat.test(lower) || pat.test(text))) {
    return {
      domain: DOMAIN_CLASSES.DOCUMENT_RELATED,
      confidence: 0.95,
      reason: 'Inquiry queries uploaded documents, specifications, or SOPs'
    };
  }

  // 5. RootForge technical platform / architecture queries
  if (ROOTFORGE_PATTERNS.some(pat => pat.test(lower) || pat.test(text))) {
    return {
      domain: DOMAIN_CLASSES.ROOTFORGE_RELATED,
      confidence: 0.93,
      reason: 'Inquiry relates to solution architecture, databases, APIs, or RootForge capabilities'
    };
  }

  // 6. Business requirements and transformation queries
  if (BUSINESS_PATTERNS.some(pat => pat.test(lower) || pat.test(text))) {
    return {
      domain: DOMAIN_CLASSES.BUSINESS_RELATED,
      confidence: 0.92,
      reason: 'Inquiry relates to business requirements, bottlenecks, processes, or KPIs'
    };
  }

  // 7. Conversational follow-ups (e.g. "what about that?", "how to solve it?", "આમાં શું કરવું?")
  const hasHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0;
  if (hasHistory) {
    return {
      domain: DOMAIN_CLASSES.WORKSPACE_RELATED,
      confidence: 0.88,
      reason: 'Conversational follow-up in active workspace consultation'
    };
  }

  // 8. Default to workspace-related if relevant
  return {
    domain: DOMAIN_CLASSES.WORKSPACE_RELATED,
    confidence: 0.85,
    reason: 'Enterprise workspace consultation inquiry'
  };
}

/**
 * Returns a strict, professional boundary refusal when user asks off-domain questions.
 * 
 * @param {string} language - Target language ('en' | 'gu' | 'hi')
 * @param {object} workspace - Workspace object
 * @returns {string} Professional refusal string
 */
export function getDomainBoundaryResponse(language = 'en', workspace = {}) {
  const normLang = (language || 'en').toLowerCase().trim();
  const wsName = workspace?.name ? `the ${workspace.name}` : 'RootForge';

  if (normLang === 'gu') {
    return `હું RootForge અને આ વર્કસ્પેસ માટે તમારો AI Business Consultant છું. હું તમારી business requirements, processes, architecture, documents અને enterprise transformation સંબંધિત પ્રશ્નોમાં મદદ કરવા માટે ઉપલબ્ધ છું.`;
  }
  if (normLang === 'hi') {
    return `मैं RootForge और इस कार्यक्षेत्र के लिए आपका AI Business Consultant हूँ। मैं आपकी व्यावसायिक आवश्यकताओं, प्रक्रियाओं, आर्किटेक्चर, दस्तावेज़ों और समाधान निर्णयों में सहायता कर सकता हूँ।`;
  }
  return `I am the AI Business Consultant for RootForge and ${wsName}. I focus on your business requirements, processes, solution options, architecture, documents, and enterprise decisions. How can I help with your project?`;
}

/**
 * Returns a concise, professional greeting response inviting workspace consultation.
 * 
 * @param {string} language - Target language ('en' | 'gu' | 'hi')
 * @param {object} workspace - Workspace object
 * @returns {string} Professional greeting string
 */
export function getGreetingResponse(language = 'en', workspace = {}) {
  const normLang = (language || 'en').toLowerCase().trim();
  const wsName = workspace?.name || 'your workspace';

  if (normLang === 'gu') {
    return `નમસ્તે! હું ${wsName} માટે તમારો AI Business Consultant છું. આજે હું તમારી business requirements, architecture અથવા documents માં કેવી રીતે મદદ કરી શકું?`;
  }
  if (normLang === 'hi') {
    return `नमस्ते! मैं ${wsName} के लिए आपका AI Business Consultant हूँ। आज मैं आपकी व्यावसायिक आवश्यकताओं, आर्किटेक्चर या दस्तावेज़ों में कैसे सहायता कर सकता हूँ?`;
  }
  return `Hello! I am your AI Business Consultant for ${wsName}. How can I assist with your business requirements, processes, architecture, or documents today?`;
}

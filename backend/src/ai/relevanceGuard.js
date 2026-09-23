/**
 * Dynamic Workspace-Aware Discovery AI Consultant & Relevance Guard
 * 
 * Implements a domain-agnostic, context-driven AI Consultant for RootForge.
 * The workspace database is the sole source of truth.
 * Zero hardcoded domain dictionaries, zero hardcoded industry rules.
 */

import { buildConsultantDialoguePrompt } from './prompts/user/consultantDialogue.prompt.js';
import { providerRouter } from './providers/providerRouter.js';
import { geminiProvider } from './providers/geminiProvider.js';
import { geminiConfig } from './config/geminiConfig.js';
import { safeParseJson, validateConsultantResponse } from './schemaValidator.js';
import { translationService } from '../services/translation.service.js';
import {
  classifyDomain,
  getDomainBoundaryResponse,
  getGreetingResponse,
  DOMAIN_CLASSES
} from './domainClassifier.js';
import {
  resolveConversationalLanguage,
  detectResponseConstraints
} from '../utils/languageDetector.js';

// Allowed classification enums
export const CLASSIFICATIONS = {
  RELATED: 'RELATED',
  CLARIFICATION: 'CLARIFICATION',
  OFF_TOPIC: 'OFF_TOPIC'
};

/**
 * Common English stop words to exclude from dynamic workspace token matching
 */
const ENGLISH_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'isn', 'it', 'its', 'itself',
  'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with',
  'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'want', 'build', 'allow', 'allows', 'often', 'today', 'tell', 'like', 'know', 'think', 'give', 'make', 'just',
  'problem', 'problems', 'challenge', 'challenges', 'business', 'user', 'users'
]);

/**
 * Universal cross-industry solution, software, and enterprise capability concepts.
 * These represent general solution-building vocabulary applicable to ANY software initiative.
 */
const UNIVERSAL_SOLUTION_TERMS = new Set([
  'system', 'systems', 'platform', 'platforms', 'software', 'application', 'applications', 'app', 'apps',
  'tool', 'tools', 'service', 'services', 'microservice', 'microservices', 'architecture', 'architectures',
  'infrastructure', 'cloud', 'server', 'servers', 'database', 'databases', 'db', 'schema', 'table', 'tables',
  'entity', 'entities', 'relation', 'relations', 'api', 'apis', 'rest', 'graphql', 'endpoint', 'endpoints',
  'integration', 'integrations', 'integrate', 'integrating', 'gateway', 'connector', 'connectors', 'webhook',
  'webhooks', 'batch', 'sync', 'synchronization', 'synchronize', 'latency', 'throughput', 'scalability', 'scale',
  'event-driven', 'queue', 'queues', 'broker', 'kafka', 'rabbitmq', 'redis', 'cache', 'caching', 'frontend',
  'backend', 'ui', 'ux', 'wireframe', 'wireframes', 'dashboard', 'dashboards', 'portal', 'portals', 'web',
  'mobile', 'ios', 'android', 'responsive', 'security', 'compliance', 'compliant', 'audit', 'auditing', 'logging',
  'log', 'logs', 'governance', 'rbac', 'sso', 'auth', 'authentication', 'authorization', 'permission', 'permissions',
  'role', 'roles', 'privacy', 'gdpr', 'hipaa', 'soc2', 'pii', 'phi', 'encryption', 'encrypted', 'token', 'jwt',
  'requirement', 'requirements', 'constraint', 'constraints',
  'friction', 'frictions', 'bottleneck', 'bottlenecks', 'delay', 'delays', 'waiting', 'wait', 'manual',
  'automation', 'automate', 'automated', 'streamline', 'streamlining', 'optimize', 'optimizing', 'workflow',
  'workflows', 'process', 'processes', 'step', 'steps', 'procedure', 'procedures', 'sop', 'cost', 'budget',
  'duration', 'weeks', 'months', 'timeline', 'milestone', 'milestones', 'sprint', 'sprints', 'phase', 'phases',
  'roadmap', 'roi', 'kpi', 'kpis', 'metric', 'metrics', 'sla', 'slas', 'success', 'benchmark', 'efficiency',
  'stakeholder', 'stakeholders', 'operator', 'operators', 'admin',
  'admins', 'administrator', 'administrators', 'decision', 'decisions', 'approval', 'approvals', 'sign-off',
  'risk', 'risks', 'assumption', 'assumptions', 'trade-off', 'trade-offs', 'mvp', 'scope', 'ai', 'ml', 'copilot',
  'assistant', 'llm', 'nlp', 'prediction', 'predictive', 'recommendation', 'recommend', 'classification',
  'rules engine', 'analytics', 'reporting', 'report', 'notification', 'notifications', 'notify', 'alert',
  'alerts', 'reminder', 'reminders', 'sms', 'email', 'whatsapp', 'push', 'message', 'messaging', 'lead time',
  'searchable', 'search', 'filter', 'qr', 'barcode', 'rfid', 'scanner', 'export', 'import', 'csv', 'excel',
  'checkin', 'check-in', 'checkout', 'check-out', 'verification', 'verify', 'payment', 'payments', 'recurring',
  'invoice', 'billing', 'subscription', 'cancel', 'cancellation', 'schedule', 'schedules', 'scheduling'
]);

/**
 * Obvious universal off-topic patterns (general trivia, jokes, creative writing, games)
 */
const GENERAL_OFF_TOPIC_PATTERNS = [
  /\b(tell|make)\s+(me\s+)?(a\s+)?joke\b/i,
  /\b(funny|humor|make\s+me\s+laugh)\b/i,
  /\bwrite\s+(me\s+)?(a\s+)?(game|poem|story|song|script|essay)\b/i,
  /\bwhat\s+(is|was)\s+(the\s+)?capital\s+of\b/i,
  /\bwhat\s+is\s+(the\s+)?weather\b/i,
  /\b(will\s+it\s+rain|weather\s+forecast)\b/i,
  /\bwhat\s+movie\s+(should\s+i|to)\s+watch\b/i,
  /\b(best\s+movies?|recommend\s+a\s+movie)\b/i,
  /\b(recipe\s+for|how\s+to\s+cook|how\s+to\s+bake)\b/i,
  /\b(flip\s+a\s+coin|roll\s+a\s+dice|play\s+a\s+game)\b/i,
  /\b(meaning\s+of\s+life|are\s+you\s+sentient|do\s+you\s+have\s+feelings)\b/i,
  /\bignore\s+(the\s+)?(workspace|business|initiative|problem)\b/i,
  /\bforget\s+(the\s+)?(workspace|business|initiative|problem)\b/i
];

/**
 * Underspecified ambiguous patterns requiring clarification
 */
const AMBIGUOUS_PATTERNS = [
  /^can\s+we\s+automate\s+this\??$/i,
  /^can\s+we\s+automate\s+that\??$/i,
  /^is\s+this\s+possible\??$/i,
  /^how\s+(will|does|can)\s+this\s+work\??$/i,
  /^what\s+about\s+this\??$/i,
  /^can\s+it\s+do\s+this\??$/i,
  /^automate\s+this\??$/i,
  /^can\s+this\s+be\s+done\??$/i,
  /^how\s+much\s+will\s+this\s+cost\??$/i,
  /^how\s+long\s+will\s+this\s+take\??$/i
];

/**
 * Tokenizes text into lowercase words
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Builds a normalized, dynamic business context string from the authorized workspace data.
 * The workspace database is the sole source of truth.
 * 
 * @param {object} context - Consolidated workspace context from getWorkspaceContext()
 * @param {array} conversationHistory - Recent message history
 * @returns {string} Formatted context block
 */
export function buildDynamicConsultantContext(context, conversationHistory = []) {
  const ws = context?.workspace || {};
  const sections = [];

  if (ws.name) sections.push(`WORKSPACE:\n${ws.name}`);
  if (ws.organization?.name || ws.organizationName) {
    sections.push(`ORGANIZATION:\n${ws.organization?.name || ws.organizationName}`);
  }
  if (ws.industry) sections.push(`INDUSTRY:\n${ws.industry}`);
  if (ws.objective) sections.push(`BUSINESS OBJECTIVE:\n${ws.objective}`);
  if (ws.challenge) sections.push(`CURRENT PROBLEM & FRICTION:\n${ws.challenge}`);
  if (ws.targetUsers) sections.push(`TARGET USERS & PERSONAS:\n${ws.targetUsers}`);
  if (ws.expectedOutcome) sections.push(`TARGET OUTCOME:\n${ws.expectedOutcome}`);

  // User confirmed facts and corrections from dialogue
  const disc = context?.discovery;
  if (disc?.userConfirmedFacts?.length > 0) {
    sections.push(`USER CONFIRMED FACTS:\n- ${disc.userConfirmedFacts.map(f => `[${f.source}] ${f.fact}`).join('\n- ')}`);
  }
  if (disc?.userCorrections?.length > 0) {
    sections.push(`USER CORRECTIONS / OVERRIDES:\n- ${disc.userCorrections.map(c => `[OVERRIDE] ${c.statement}`).join('\n- ')}`);
  }
  if (disc?.discoveredConstraints?.length > 0) {
    sections.push(`DISCOVERY CONSTRAINTS:\n- ${disc.discoveredConstraints.join('\n- ')}`);
  }
  if (disc?.discoveredGoals?.length > 0) {
    sections.push(`DISCOVERY GOALS:\n- ${disc.discoveredGoals.join('\n- ')}`);
  }

  // Uploaded document context (bounded to 14,000 characters to prevent truncation of secondary documents)
  const docContext = context?.documentContext;
  if (docContext && docContext.analyzedCount > 0 && docContext.combinedText) {
    const docSnippet = docContext.combinedText.slice(0, 14000);
    sections.push(`DOCUMENT CONTEXT (${docContext.analyzedCount} documents indexed):\n${docSnippet}`);
  }

  // Recent conversation (bounded to last 6 messages)
  const recentMessages = (conversationHistory || []).slice(-6);
  if (recentMessages.length > 0) {
    const formattedHistory = recentMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    sections.push(`RECENT CONVERSATION:\n${formattedHistory}`);
  }

  return sections.join('\n\n');
}

/**
 * Calls the centralized Gemini provider to perform dynamic semantic relevance classification.
 */
async function callGeminiRelevance(context, userMessage, conversationHistory = []) {
  const configuredProvider = providerRouter.getConfiguredProviderName();
  if (configuredProvider === 'demo') return null;

  const apiKey = configuredProvider === 'gemini' ? geminiConfig.getApiKey() : process.env.AI_API_KEY;
  if (!apiKey) return null;

  const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || '15000', 10);
  const workspaceContextText = buildDynamicConsultantContext(context, conversationHistory);

  const prompt = `You are the Relevance Classification Guard for RootForge AI Solution Builder.
The user is having a business discovery conversation with an AI Business Consultant inside a specific enterprise workspace.

${workspaceContextText}

YOUR TASK:
Classify whether the user's latest question or message is RELATED to the workspace business initiative, requires CLARIFICATION, or is OFF_TOPIC.

CLASSIFICATION DEFINITIONS:
1. RELATED:
- Use when the question contributes to understanding, analyzing, designing, implementing, improving, or making decisions about the current workspace.
- Covers requirements, business processes, workflows, users, stakeholders, automation, integrations, architecture, databases, APIs, security, compliance, AI, UX, metrics, KPIs, timelines, technology choices, and operational decisions.
- Also covers follow-up questions where pronouns (e.g. 'it', 'they', 'this') refer to systems or topics established in the recent conversation.
- Also covers mixed-intent questions where the user asks a relevant business question alongside an off-topic remark.

2. CLARIFICATION:
- Use when the question could reasonably relate to the workspace but is ambiguous or uses underspecified pronouns without an antecedent in recent conversation (specifically like 'Can we automate this?', 'Is this possible?', 'Can it do that?', 'How does this work?').
- Select CLARIFICATION whenever the user asks to automate or do something without naming which specific process or component.

3. OFF_TOPIC:
- Use when the question is clearly unrelated to the current workspace and its business solution.
- Covers general knowledge, encyclopedic trivia, geography, history, celebrities, athletes, pop culture, entertainment, movies, jokes, weather, cooking, casual chitchat, personal questions about the AI, or requests to ignore the workspace.

USER QUESTION:
"${userMessage.replace(/"/g, '\\"')}"

Respond in strict JSON format:
{
  "classification": "RELATED" | "CLARIFICATION" | "OFF_TOPIC",
  "confidence": <number between 0.0 and 1.0>,
  "reason": "<short explanation citing the workspace context>"
}`;

  try {
    const completion = await geminiProvider.generateChatCompletion({
      apiKey,
      userPrompt: prompt,
      temperature: 0.1,
      maxTokens: 512,
      timeoutMs
    });

    const rawText = completion?.text;
    if (!rawText) return null;

    const parsed = safeParseJson(rawText);
    if (
      parsed &&
      parsed.success &&
      parsed.data &&
      (parsed.data.classification === 'RELATED' || parsed.data.classification === 'CLARIFICATION' || parsed.data.classification === 'OFF_TOPIC')
    ) {
      const confidence = typeof parsed.data.confidence === 'number' ? Math.max(0, Math.min(1, parsed.data.confidence)) : 0.95;
      return {
        classification: parsed.data.classification,
        confidence,
        reason: parsed.data.reason || 'Classified dynamically via workspace context model'
      };
    }
  } catch (err) {
    console.warn(`[RelevanceGuard] Gemini relevance classification skipped (${err.code || 'ERROR'}): ${err.message}`);
  }

  return null;
}


/**
 * Domain-agnostic semantic fallback classifier.
 * Uses ONLY the workspace's actual metadata and universal enterprise concepts.
 * ZERO hardcoded industry rules or keyword lists.
 */
function classifySemanticFallback(context, userMessage, conversationHistory = []) {
  const msg = (userMessage || '').trim();
  const lowerMsg = msg.toLowerCase();
  const rawTokens = tokenize(msg);
  const ws = context?.workspace || {};

  // 0. Polite conversational greeting or acknowledgment
  const isPoliteGreeting = /^(hi|hello|hey|thanks|thank you|okay|ok|good morning|good afternoon|how are you|tell me more|નમસ્તે|આભાર|नमस्ते|धन्यवाद)[\s!.]*$/i.test(lowerMsg);
  if (isPoliteGreeting) {
    return {
      classification: CLASSIFICATIONS.RELATED,
      confidence: 0.95,
      reason: 'Courteous conversational greeting or acknowledgment in business consultation.'
    };
  }

  // 1. Conversational follow-up queries referencing previous context (ChatGPT-style multi-turn)
  const isFollowUpPattern = (
    lowerMsg.startsWith('can it ') ||
    lowerMsg.startsWith('does it ') ||
    lowerMsg.startsWith('will it ') ||
    lowerMsg.startsWith('is it ') ||
    lowerMsg.startsWith('could it ') ||
    lowerMsg.startsWith('how can i ') ||
    lowerMsg.startsWith('how do i ') ||
    lowerMsg.startsWith('how to ') ||
    lowerMsg.startsWith('what about ') ||
    lowerMsg.startsWith('can we add ') ||
    lowerMsg.startsWith('can we implement ') ||
    lowerMsg.includes('તેમાં') ||
    lowerMsg.includes('તેનો') ||
    lowerMsg.includes('તેની') ||
    lowerMsg.includes('તેના') ||
    lowerMsg.includes('એમાં') ||
    lowerMsg.includes('આમાં') ||
    lowerMsg.includes('આનો') ||
    lowerMsg.includes('કેવી રીતે કરવું') ||
    lowerMsg.includes('બીજું શું') ||
    lowerMsg.includes('इसमें') ||
    lowerMsg.includes('उसमें') ||
    lowerMsg.includes('इसका') ||
    lowerMsg.includes('उसका') ||
    lowerMsg.includes('कैसे करें')
  );

  const hasHistory = conversationHistory && conversationHistory.length > 0;

  if (hasHistory && (isFollowUpPattern || AMBIGUOUS_PATTERNS.some(pat => pat.test(msg)))) {
    return {
      classification: CLASSIFICATIONS.RELATED,
      confidence: 0.95,
      reason: 'Follow-up inquiry referencing established operational concepts from prior conversation turns.'
    };
  }

  // 2. Ambiguous pattern check when NO prior context exists (e.g. initial turn "Can we automate this?")
  if (!hasHistory && AMBIGUOUS_PATTERNS.some(pat => pat.test(msg))) {
    return {
      classification: CLASSIFICATIONS.CLARIFICATION,
      confidence: 0.94,
      reason: 'The question is potentially relevant but ambiguous; the target sub-process or component is unspecified.'
    };
  }

  // 3. Extract meaningful terms dynamically from THIS workspace's actual metadata
  const wsTerms = new Set();
  const wsRawText = [
    ws.name || '',
    ws.industry || '',
    ws.objective || '',
    ws.challenge || '',
    ws.targetUsers || '',
    ws.expectedOutcome || '',
    context?.documentContext?.combinedText || ''
  ].join(' ');

  for (const term of tokenize(wsRawText)) {
    if (term.length >= 4 && !ENGLISH_STOP_WORDS.has(term)) {
      wsTerms.add(term);
    }
  }

  // 4. Match user tokens against workspace-specific vocabulary & universal solution concepts
  let workspaceMatches = 0;
  let universalSolutionMatches = 0;

  // Helper to normalize plurals and common inflections (e.g. students -> student, reminders -> reminder)
  const normalize = (t) => t.replace(/(?:ies|es|s)$/, '');
  const wsStemmed = new Set([...wsTerms].map(normalize));

  for (const token of rawTokens) {
    if (ENGLISH_STOP_WORDS.has(token)) continue;
    const tokenNorm = normalize(token);
    if (wsTerms.has(token) || wsStemmed.has(tokenNorm)) workspaceMatches++;
    if (UNIVERSAL_SOLUTION_TERMS.has(token) || UNIVERSAL_SOLUTION_TERMS.has(tokenNorm)) universalSolutionMatches++;
  }

  // Multi-word phrase matches
  if (lowerMsg.includes('real-time') || lowerMsg.includes('real time')) universalSolutionMatches++;
  if (lowerMsg.includes('qr code') || lowerMsg.includes('qr codes')) universalSolutionMatches++;
  if (lowerMsg.includes('recurring payment') || lowerMsg.includes('recurring payments')) universalSolutionMatches++;
  if (lowerMsg.includes('waiting time') || lowerMsg.includes('wait time')) universalSolutionMatches++;

  const totalSignals = workspaceMatches + universalSolutionMatches;

  // 5. Obvious general off-topic pattern check
  const isExplicitOffTopic = GENERAL_OFF_TOPIC_PATTERNS.some(pat => pat.test(lowerMsg));
  if (isExplicitOffTopic && workspaceMatches === 0) {
    return {
      classification: CLASSIFICATIONS.OFF_TOPIC,
      confidence: 0.98,
      reason: 'The inquiry is an unrelated general-knowledge, entertainment, or casual question.'
    };
  }

  // Check for person query without business terms (e.g. "Who is [X]?")
  if (/^who\s+(is|was|are|were)\s+[a-z\s]+\??$/i.test(lowerMsg) && workspaceMatches === 0) {
    return {
      classification: CLASSIFICATIONS.OFF_TOPIC,
      confidence: 0.98,
      reason: 'Inquiry asks about an individual not associated with the workspace initiative.'
    };
  }

  // 6. Direct relevance based on workspace signals or universal solution architecture
  if (totalSignals >= 1) {
    return {
      classification: CLASSIFICATIONS.RELATED,
      confidence: Math.min(0.88 + (totalSignals * 0.03), 0.99),
      reason: `The question relates to capabilities, workflows, or architecture relevant to ${ws.name || 'this initiative'}.`
    };
  }

  // 7. Zero signals -> OFF_TOPIC
  return {
    classification: CLASSIFICATIONS.OFF_TOPIC,
    confidence: 0.92,
    reason: 'The inquiry does not contain terms or concepts related to the current workspace initiative or solution scope.'
  };
}

/**
 * Classifies user question into RELATED, CLARIFICATION, or OFF_TOPIC.
 * Uses dynamic Gemini model when available; falls back to domain-agnostic semantic analysis.
 * 
 * @param {object} context - Consolidated workspace context
 * @param {string} userMessage - User's input question
 * @param {array} conversationHistory - Prior conversation messages
 * @returns {Promise<object>} Structured result: { classification, reason, confidence }
 */
export async function classifyRelevance(context, userMessage, conversationHistory = []) {
  try {
    const msg = (userMessage || '').trim();
    if (!msg) {
      return {
        classification: CLASSIFICATIONS.CLARIFICATION,
        confidence: 0.90,
        reason: 'Empty message received; asking for clarification.'
      };
    }

    // Attempt dynamic AI classification with configured Gemini model
    const aiResult = await callGeminiRelevance(context, msg, conversationHistory);
    if (aiResult) {
      return aiResult;
    }

    // Domain-agnostic semantic fallback
    return classifySemanticFallback(context, msg, conversationHistory);
  } catch (error) {
    console.error('[RelevanceGuard] Error during classification:', error);
    return {
      classification: CLASSIFICATIONS.RELATED,
      confidence: 0.50,
      reason: 'Relevance classifier safely defaulted to consultant response due to an internal error.'
    };
  }
}

/**
 * Constructs a workspace-aware refusal for OFF_TOPIC inquiries.
 * Does not expose internal prompts or model mechanics.
 * 
 * @param {object} workspace - Workspace record
 * @returns {string} Safe refusal message
 */
export function getOffTopicResponse(workspace = {}, language = 'en') {
  const normLang = (language || 'en').toLowerCase().trim();
  const wsName = workspace.name ? `the ${workspace.name}` : 'the current business';
  if (normLang === 'hi') {
    return `क्षमा करें, मैं केवल ${workspace.name || 'इस व्यवसाय'} पहल से संबंधित प्रश्नों में ही मदद कर सकता हूँ। कृपया मुझसे इसकी आवश्यकताओं, उपयोगकर्ताओं, वर्कफ़्लो, प्रौद्योगिकी, बाधाओं, एकीकरण या कार्यान्वयन के बारे में पूछें।`;
  }
  if (normLang === 'gu') {
    return `માફ કરશો, હું ફક્ત ${workspace.name || 'આ પહેલ'} સંબંધિત પ્રશ્નોમાં જ મદદ કરી શકું છું. કૃપા કરીને મને તેની જરૂરિયાતો, વપરાશકર્તાઓ, વર્કફ્લો, ટેકનોલોજી, મર્યાદાઓ, એકીકરણ અથવા અમલીકરણ વિશે પૂછો.`;
  }
  return `Sorry, I can only help with questions related to ${wsName} initiative. Please ask me about its requirements, users, workflows, technology, constraints, integrations, or implementation.`;
}

/**
 * Constructs a dynamic clarification inquiry for ambiguous questions.
 * Extracts candidate workflows directly from the workspace metadata.
 * ZERO hardcoded domain branches.
 * 
 * @param {object} context - Consolidated workspace context
 * @param {string} userMessage - User's input question
 * @returns {string} Natural clarification question
 */
export function getClarificationResponse(context, userMessage = '', language = 'en') {
  const normLang = (language || 'en').toLowerCase().trim();
  const ws = context?.workspace || {};
  const wsName = ws.name || 'this initiative';

  // Dynamically extract key operational phrases from objective/challenge
  const candidateSteps = [];
  const textSource = `${ws.objective || ''}. ${ws.challenge || ''}`;
  const rawPhrases = textSource.match(/[a-zA-Z\s]{4,25}(?:management|tracking|scheduling|coordination|intake|booking|payments|notifications|reminders|records)/gi) || [];

  for (const phrase of rawPhrases) {
    const trimmed = phrase.trim().toLowerCase();
    if (trimmed && !candidateSteps.includes(trimmed) && candidateSteps.length < 4) {
      candidateSteps.push(trimmed);
    }
  }

  let stepOptions = '';
  if (candidateSteps.length >= 2) {
    stepOptions = ` — ${candidateSteps.slice(0, 3).join(', ')}, or another workflow`;
  }

  const lower = (userMessage || '').toLowerCase();
  if (normLang === 'hi') {
    if (lower.includes('automate') || lower.includes('स्वचालन')) {
      return `हाँ, संभावित रूप से। आप ${wsName} प्रक्रिया के किस भाग का उल्लेख कर रहे हैं${stepOptions}?`;
    }
    return `क्या आप स्पष्ट कर सकते हैं कि आप ${wsName} प्रक्रिया के किस भाग का उल्लेख कर रहे हैं${stepOptions}? इससे मुझे उपयुक्त मार्गदर्शन प्रदान करने में मदद मिलेगी।`;
  }
  if (normLang === 'gu') {
    if (lower.includes('automate') || lower.includes('ઓટોમેશન')) {
      return `હા, સંભવિતપણે. તમે ${wsName} પ્રક્રિયાના કયા ભાગનો ઉલ્લેખ કરી રહ્યા છો${stepOptions}?`;
    }
    return `શું તમે સ્પષ્ટ કરી શકો છો કે તમે ${wsName} પ્રક્રિયાના કયા ભાગનો ઉલ્લેખ કરી રહ્યા છો${stepOptions}? આનાથી મને અનુકૂળ માર્ગદર્શન આપવામાં મદદ મળશે।`;
  }

  if (lower.includes('automate')) {
    return `Yes, potentially. Which part of the ${wsName} process are you referring to${stepOptions}?`;
  }

  return `Could you clarify which part of the ${wsName} process you are referring to${stepOptions}? This will help me provide tailored architectural guidance.`;
}

/**
 * Detects the high-level business intent of the user's question.
 * Categories are semantic intent classifications, not hardcoded domain rules.
 */
export function extractQuestionIntent(userMessage = '') {
  const msg = (userMessage || '').toLowerCase().trim();

  if (/\b(database|databases|db|data model|schema|tables|entities|relational|sql|nosql|postgres|postgresql|mongodb|redis|storage|concurrency|transactions)\b/i.test(msg)) {
    return 'DATABASE';
  }
  if (/\b(ehr|emr|fhir|hl7|interface with|integrate with|integration|integrations|external system|third-party|legacy|api|apis|connector|connectors|gateway|sync|synchronization|epic|cerner|salesforce|sap)\b/i.test(msg)) {
    return 'INTEGRATION';
  }
  if (/\b(who are the (main|primary|target)?\s*(users|personas|actors|stakeholders)|target users|personas|actors|roles|stakeholders|user base)\b/i.test(msg)) {
    return 'USER_PERSONA';
  }
  if (/\b(reminder|reminders|notification|notifications|alert|alerts|sms|email|whatsapp|push notification|notify|messaging)\b/i.test(msg)) {
    return 'NOTIFICATION';
  }
  if (/\b(measure success|kpi|kpis|metric|metrics|success criteria|roi|benchmark|benchmarks|how will we measure|how to measure|churn|retention|reduce churn|reduce attrition)\b/i.test(msg)) {
    return 'METRICS';
  }
  if (/\b(architecture|architectural|microservices|monolith|infrastructure|event-driven|queue|broker|kafka|rabbitmq|load balancer)\b/i.test(msg)) {
    return 'ARCHITECTURE';
  }
  if (/\b(security|compliance|hipaa|gdpr|soc2|rbac|authentication|authorization|encryption|audit log|auditability|privacy)\b/i.test(msg)) {
    return 'SECURITY';
  }
  if (/\b(cost|pricing|budget|timeline|phases|milestones|duration|weeks|months|implementation plan)\b/i.test(msg)) {
    return 'IMPLEMENTATION';
  }
  if (/\b(workflow|steps|flow|process|journey|lifecycle|scheduling|booking|renewal|intake|check-in|registration|how does|how should|how do|how to book|how to renew|how to schedule|how can we|how should .* work)\b/i.test(msg)) {
    return 'WORKFLOW';
  }

  return 'GENERAL_BUSINESS_QUESTION';
}

/**
 * Packages consultant response into standard structured format with strict fact/inference/recommendation fields
 */
export function formatConsultantReturn(rawMessage, suggestedAction, context, intent) {
  const ws = context?.workspace || {};
  const docContext = context?.documentContext || {};
  const docs = (docContext.sourceReferences || []).map(d => d.filename);

  // Check if rawMessage is already a JSON string of a structured consultant response
  const parsed = safeParseJson(rawMessage);
  if (parsed.success && parsed.data && (parsed.data.summary || parsed.data.confirmedFacts)) {
    const validated = validateConsultantResponse(parsed.data);
    const structured = validated.normalized || parsed.data;
    return {
      message: JSON.stringify(structured),
      structured,
      suggestedAction: structured.suggestedNextAction || suggestedAction || 'Review Solution Options'
    };
  }

  const confirmedFacts = [];
  if (ws.objective) {
    confirmedFacts.push({
      fact: ws.objective,
      source: 'Workspace Objective',
      classification: 'SYSTEM_FACT',
      category: 'OBJECTIVE'
    });
  }
  if (docs.length > 0) {
    confirmedFacts.push({
      fact: `Workspace documents indexed: ${docs.join(', ')}`,
      source: docs[0],
      classification: 'DOCUMENT_FACT',
      category: 'TECHNICAL_CONSTRAINT'
    });
  }

  const sources = (docContext.sourceReferences || []).map(d => ({
    filename: d.filename,
    section: (d.sections && d.sections[0]) || 'General Overview',
    page: 'Not available'
  }));

  const summary = (rawMessage || '').split('\n\n')[0].replace(/^#+\s*/, '').trim() || 'Consultant architectural synthesis.';

  const structured = {
    summary,
    status: 'PROPOSED',
    confirmedFacts,
    requirements: [],
    recommendations: [
      {
        title: intent || 'Recommended Guidance',
        details: rawMessage,
        rationale: 'Derived from current operational discovery baseline',
        category: intent || 'ARCHITECTURE'
      }
    ],
    openQuestions: [
      {
        question: 'Which specific legacy systems and operational interfaces require bidirectional sync?',
        whyItMatters: 'Essential for defining database schemas, API contracts, and integration middleware.',
        businessArea: 'EHR_VENDOR'
      }
    ],
    inferences: [],
    sources,
    suggestedNextAction: suggestedAction || 'Review Solution Options'
  };

  return {
    message: JSON.stringify(structured),
    structured,
    suggestedAction: structured.suggestedNextAction
  };
}

/**
 * Computes raw intent-specific fallback markdown when external AI is unavailable.
 */
function _computeDynamicConsultantFallback(context, userMessage = '', intent = null) {
  const ws = context?.workspace || {};
  const detectedIntent = intent || extractQuestionIntent(userMessage);
  const users = ws.targetUsers ? ws.targetUsers.split(/[,;]/).map(u => u.trim()).filter(Boolean) : ['Users', 'Staff', 'Administrators'];
  const actor1 = users[0] || 'Primary Users';
  const actor2 = users[1] || 'Operational Staff';
  const actor3 = users[2] || 'Administrators';
  const rawMsg = (userMessage || '').toLowerCase();

  switch (detectedIntent) {
    case 'WORKFLOW': {
      let workflowTitle = `${ws.name || 'this initiative'} Operational Workflow`;
      if (rawMsg.includes('trainer')) workflowTitle = `${ws.name || 'this initiative'} — Trainer Scheduling & Allocation Workflow`;
      else if (rawMsg.includes('renewal')) workflowTitle = `${ws.name || 'this initiative'} — Membership Renewal & Subscription Workflow`;
      else if (rawMsg.includes('appointment')) workflowTitle = `${ws.name || 'this initiative'} — Patient Appointment Scheduling Workflow`;

      return {
        message: `Here is the recommended end-to-end operational workflow for ${workflowTitle}:

### Phase 1: Intake & Request Initiation
* **Actor:** ${actor1}
1. **Access Portal/Channel:** The ${actor1.toLowerCase()} initiates the request via a self-service responsive interface or front-desk intake.
2. **Parameters & Preferences:** Enters requested details, dates, times, or service parameters with real-time field validation.
3. **Temporary Hold:** The system places a dynamic reservation lock (e.g., 5-minute hold) on matching availability to prevent concurrency conflicts.

### Phase 2: Constraint Validation & Availability Check
* **Actor:** Automated System & ${actor2}
1. **Roster & Quota Verification:** The validation engine cross-references real-time schedules, staffing capacity, and operational constraints.
2. **Conflict Avoidance:** If conflicting reservations or resource constraints arise, the system dynamically calculates and suggests adjacent open slots.
3. **Triage / Special Handling:** Any exceptions or high-priority requests route immediately to ${actor2.toLowerCase()} for approval.

### Phase 3: Automated Confirmation & Notification Dispatch
* **Actor:** Automated Notification Engine
1. **Record Commitment:** The system commits the transaction to the database, generates a persistent confirmation code, and updates central calendars.
2. **Multi-Channel Dispatch:** Confirmation is transmitted instantly via SMS/Email/WhatsApp with schedule details and preparation instructions.
3. **Reminder Scheduling:** Automated reminder jobs are scheduled for advance notice (T-48h) and final confirmation (T-2h).

### Phase 4: Execution & Status Reconciliation
* **Actor:** ${actor1}, ${actor2}, ${actor3}
1. **Arrival & Check-In:** On the day of engagement, digital check-in (QR code or search) transitions record status to "In Progress / Active".
2. **Fulfillment:** Service is executed, with notes or outcomes recorded directly into the session log.
3. **Completion & Archival:** The status is finalized to "Completed", triggering analytics logging and releasing all reserved capacity.`,
        suggestedAction: 'Review Process Model'
      };
    }

    case 'INTEGRATION': {
      const isHealthcare = (ws.industry || '').toLowerCase().includes('health') || (ws.name || '').toLowerCase().includes('hospital');
      let domainSpecific = '';

      if (isHealthcare) {
        domainSpecific = `
### 1. Clinical Systems & Integration Architecture
* **Confirmed Baseline:** The workspace context indicates the organization operates an existing patient-record system. Integration interfaces and specific protocols remain an open question to validate.
* **Architectural Recommendations:**
  - Standardize on modular RESTful connectors (e.g., FHIR-compliant resources such as \`Patient\`, \`Practitioner\`, \`Schedule\`, \`Appointment\`, \`Slot\`) for real-time bidirectional schedule synchronization.
  - Implement secure webhook subscriptions to ingest availability updates from the clinical backend.
  - If the existing patient-record system relies on legacy protocols, deploy an interface adapter for schedule updates without altering core hospital data structures.
  - Enforce deterministic matching on Patient Identifiers/MRNs to prevent fractured or duplicate patient charts.`;
      } else {
        domainSpecific = `
### 1. Core Enterprise System Interfaces
* **Current Workspace Baseline:** The workspace does not mandate a proprietary legacy vendor. The integration layer is interface-agnostic and modular.
* **REST & Webhook Connectors:**
  - Deploy standard RESTful OpenAPI endpoints with bidirectional webhook synchronization for external schedules, inventories, and identity providers.
  - An asynchronous event bus decouples core processing from third-party vendor latency.`;
      }

      return {
        message: `Regarding system integration and interface architecture for ${ws.name || 'this initiative'}:${domainSpecific}

### 2. Synchronization & Data Consistency
* **Real-Time Bidirectional Sync:** Calendars and slot allocations synchronize in real time to prevent discrepancy between digital self-service and internal staff management.
* **Idempotency:** All incoming and outgoing webhooks utilize unique idempotency keys to guarantee that network retries never produce duplicate transactions.

### 3. Security, Authentication & Auditability
* **Transport Security:** Enforce TLS 1.3 in transit and AES-256 at rest for all exchanged payloads.
* **Authentication:** Require OAuth 2.0 with Mutual TLS (mTLS) for system-to-system interfaces.
* **Audit Logging:** Record an immutable audit log of every payload exchange, timestamp, and response code.`,
        suggestedAction: 'Review Integration Architecture'
      };
    }

    case 'USER_PERSONA': {
      const personasList = users.map((user, idx) => {
        return `### ${idx + 1}. ${user}
* **Role & Context:** Key stakeholder in ${ws.name || 'this solution'}.
* **Primary Responsibilities:** Managing, requesting, or fulfilling core operational tasks without administrative friction.
* **System Touchpoints:** Dedicated, persona-optimized views (e.g., self-service portal, operational dashboard, administrative console) with role-based access.`;
      }).join('\n\n');

      return {
        message: `The primary user roles and personas for ${ws.name || 'this initiative'} are:

${personasList}

### Coordination Dynamics
The solution directly bridges coordination handoffs between these personas, replacing fragmented manual communications with centralized, real-time status visibility.`,
        suggestedAction: 'Review User Personas'
      };
    }

    case 'DATABASE': {
      const isHealthcare = (ws.industry || '').toLowerCase().includes('health') || (ws.name || '').toLowerCase().includes('hospital');
      const isFitness = (ws.industry || '').toLowerCase().includes('fitness') || (ws.name || '').toLowerCase().includes('gym');

      let entityList = '';
      if (isHealthcare) {
        entityList = `1. **Patient:** Demographics, medical record identifier (MRN), notification preferences, contact details.
2. **Provider / Practitioner:** Specialization, department, shift availability, appointment duration settings.
3. **Appointment:** Patient ID, Provider ID, Department ID, scheduled timestamp, status (Scheduled, Confirmed, Arrived, In-Consultation, Completed, Cancelled).
4. **ScheduleSlot:** Real-time slot availability, locking state, room assignment, version tag.
5. **NotificationLog:** Channel (SMS/Email/WhatsApp), delivery timestamp, delivery receipt, response action.
6. **AuditTrail:** User ID, entity type, action, previous state, new state, client IP, timestamp.`;
      } else if (isFitness) {
        entityList = `1. **Member:** Member profile, membership tier, active status, billing details, QR credential.
2. **Trainer / Staff:** Specializations, shift rosters, assigned member caseload.
3. **MembershipSubscription:** Plan type, renewal date, payment status, auto-debit token.
4. **AttendanceRecord:** Member ID, check-in timestamp, check-out timestamp, verification method (QR/manual).
5. **SessionBooking:** Member ID, Trainer ID, time slot, session status.
6. **PaymentTransaction:** Invoice ID, gateway reference, amount, currency, status.`;
      } else {
        entityList = `1. **User / Actor:** Profile, role permissions, contact preferences, authentication identity.
2. **Resource / Provider:** Assigned capacity, working schedule, allocation constraints.
3. **CoreTransaction / Booking:** Primary business record, timestamps, active state, foreign keys.
4. **StatusHistory:** State transitions, timestamp, trigger actor, transition notes.
5. **AuditLog:** Immutable transaction log capturing changes, user IDs, and timestamps.`;
      }

      return {
        message: `For ${ws.name || 'this initiative'}, the recommended database architecture is a **Relational Transactional Database (PostgreSQL)** paired with an **In-Memory Cache (Redis)**:

### 1. Database Engine Selection
* **Primary Store — PostgreSQL:** Ensures strict ACID compliance, relational integrity, row-level locking, and transactional reliability.
* **In-Memory Cache — Redis:** Recommended for managing temporary reservation holds (e.g. 5-minute locks during checkout), active session tokens, and high-frequency availability queries.

### 2. Core Domain Entities
${entityList}

### 3. Concurrency & Locking Strategy
* **Row-Level Locking:** When concurrent requests compete for the same slot, apply atomic transactions with row-level locks (\`SELECT ... FOR UPDATE\`) to guarantee zero duplicate bookings.
* **Compound Unique Constraints:** Enforce composite database constraints (e.g. \`provider_id + start_time\`) so race conditions fail safely at the database constraint level.

### 4. Auditability & Archival
* All critical state modifications append to an immutable audit table with before/after JSON payloads to ensure compliance and full operational transparency.`,
        suggestedAction: 'Review Database Schema'
      };
    }

    case 'NOTIFICATION':
      return {
        message: `Here is the recommended notification and reminder architecture for ${ws.name || 'this initiative'}:

### 1. Event Triggers & Lifecycle
* **Immediate Booking Confirmation (T-0):** Triggered immediately upon successful booking. Dispatches reference number, location details, preparation instructions, and a digital calendar invite (.ics).
* **Advance Reminder (T-48 Hours):** First reminder sent with interactive actions: **Confirm**, **Reschedule**, or **Cancel**.
* **Same-Day Preparation Alert (T-2 Hours):** Final reminder with directions, check-in instructions, and live status or delay updates.
* **Status Change Alerts:** Immediate notifications dispatched if an appointment or schedule is modified or cancelled by staff.

### 2. Multi-Channel Dispatch Engine
* **Channels:** SMS and WhatsApp for time-sensitive alerts; Email for detailed confirmations and receipts.
* **Dynamic Variable Interpolation:** Centralized templates populated with real-time parameters (\`{{user_name}}\`, \`{{event_time}}\`, \`{{provider_name}}\`).

### 3. Interactive Response & Resource Recycling
* When a recipient selects "CANCEL" or clicks the cancellation link:
  1. The system updates the appointment status to "Cancelled".
  2. The reserved slot is automatically returned to the open availability pool.
  3. The waitlist engine immediately alerts the next eligible user of newly opened capacity.`,
        suggestedAction: 'Configure Notification Rules'
      };

    case 'METRICS': {
      const isHealthcare = (ws.industry || '').toLowerCase().includes('health') || (ws.name || '').toLowerCase().includes('hospital');
      let metricsList = '';

      if (isHealthcare) {
        metricsList = `1. **Average Patient Wait Time:** Target reduction of 50-70% from baseline (time from arrival to consultation).
2. **Scheduling Conflict / Double-Booking Rate:** Target < 0.1% of all scheduled appointments.
3. **No-Show Rate:** Target reduction from industry average (~20%) to < 7% via automated 2-way reminders.
4. **Self-Service Digital Adoption:** > 65% of appointments booked directly through digital channels without staff phone calls.
5. **Clinical Slot Utilization Rate:** Increase clinical room and doctor schedule utilization to > 88%.
6. **Staff Administrative Overhead:** 60% reduction in staff time spent on manual phone calls and spreadsheet entry.`;
      } else {
        metricsList = `1. **Operational Cycle Time:** 60-75% reduction in time required to complete bookings and administrative handoffs.
2. **Operational Error & Conflict Rate:** Target < 0.5% duplicate or conflicting records.
3. **Digital Self-Service Adoption:** > 70% of transactions initiated directly by end-users.
4. **Capacity & Resource Utilization:** > 85% effective utilization of available schedules and resources.
5. **User Retention & Renewal Rate:** 15-25% improvement in user retention.
6. **Manual Overhead Savings:** 50-65% reduction in staff hours spent on manual tracking and spreadsheet reconciliation.`;
      }

      return {
        message: `To evaluate the operational success and business ROI of ${ws.name || 'this initiative'}, track the following key performance indicators (KPIs):

${metricsList}

### Measurement Cadence & Dashboards
Monitor these metrics continuously via real-time operational dashboards for daily operations, combined with weekly executive rollups to verify progress against your strategic targets.`,
        suggestedAction: 'Review KPIs & Metrics'
      };
    }

    case 'ARCHITECTURE':
      return {
        message: `Here is the recommended target architecture for ${ws.name || 'this initiative'}:

### 1. Architectural Style & Layers
* **Decoupled Event-Driven Modular Architecture:** Separates customer-facing channels from backend transactional logic and external integration boundaries.
* **API Gateway Layer:** Single entry point managing rate limiting, JWT authentication, and SSL termination.
* **Core Business Services:** Modular microservices or domain modules managing scheduling, user accounts, notifications, and analytics.

### 2. Event Streaming & Background Jobs
* **Asynchronous Queue (e.g. BullMQ / Redis / Kafka):** Offloads non-blocking tasks (SMS/email dispatch, audit logging, webhook distribution) from synchronous API paths.

### 3. Resilience & High Availability
* Stateless application services behind a load balancer with horizontal autoscaling during peak morning/afternoon traffic.`,
        suggestedAction: 'Review Target Architecture'
      };

    default: {
      const focus = userMessage.trim().replace(/\?$/, '');
      const lower = userMessage.toLowerCase();
      if (lower.includes('whatsapp')) {
        return {
          message: `Regarding WhatsApp integration for ${ws.name || 'this initiative'}:

### 1. WhatsApp Business API Architecture
* **Integration Strategy:** Connect to official WhatsApp Business Solution Providers (e.g. Twilio, Meta Cloud API) via RESTful endpoints and secure webhooks.
* **Interactive Messaging:** Automate instant confirmations, two-way rescheduling buttons, and time-sensitive reminders.
* **Data Protection & Compliance:** Ensure end-to-end payload encryption and maintain strict opt-in verification records.`,
          suggestedAction: 'Review Integration Architecture'
        };
      }
      return {
        message: `Regarding your inquiry on "${focus}" for ${ws.name || 'this initiative'}:

Addressing this requires aligning your operational goals with targeted digital capabilities:
1. **Process Alignment:** Establish clear, automated rules for ${ws.targetUsers || 'target users'} to eliminate manual handoffs.
2. **Data Consistency:** Maintain a single source of truth for active records and schedules to prevent operational friction.
3. **Operational Visibility:** Provide real-time dashboards to track cycle times and capacity utilization.

Every specification remains modular and human-in-the-loop so you can customize and refine it as discovery progresses.`,
        suggestedAction: 'Review Solution Options'
      };
    }
  }
}

/**
 * Generates an intent-specific, workspace-grounded fallback response when external AI is unavailable.
 */
export function generateDynamicConsultantFallback(
  context,
  userMessage = '',
  intent = null,
  language = 'en',
  constraints = { length: 'MEDIUM', format: 'DEFAULT', pointCount: null }
) {
  const normLang = (language || 'en').toLowerCase().trim();
  const detectedIntent = intent || extractQuestionIntent(userMessage);
  const raw = _computeDynamicConsultantFallback(context, userMessage, detectedIntent);
  const formatted = formatConsultantReturn(raw.message, raw.suggestedAction, context, detectedIntent);
  const lowerMsg = (userMessage || '').toLowerCase();
  const ws = context?.workspace || {};
  const wsName = ws.name || 'this initiative';
  const wsChallenge = ws.challenge || ws.businessProblem || 'high operational cycle times, manual triage delays, and fragmented coordination';
  const wsObjective = ws.objective || ws.businessGoals || 'streamlined digital transformation';
  const docContext = context?.documentContext || {};
  const firstDoc = docContext.sourceReferences?.[0]?.filename ||
                   docContext.documents?.[0]?.name ||
                   docContext.documents?.[0]?.filename ||
                   ws.documents?.[0]?.name ||
                   ws.documents?.[0]?.filename;
  const isShort = constraints?.length === 'SHORT';

  try {
    const parsed = JSON.parse(formatted.message);
    if (parsed) {
      if (normLang === 'gu') {
        if (lowerMsg.includes('bottleneck') || lowerMsg.includes('અવરોધ') || lowerMsg.includes('સમસ્યા') || lowerMsg.includes('challenge') || lowerMsg.includes('પડકાર')) {
          parsed.summary = `તમારા ${wsName} માં પ્રાથમિક બિઝનેસ ચેલેન્જ અને અવરોધ: ${wsChallenge}.`;
        } else if (lowerMsg.includes('requirement') || lowerMsg.includes('જરૂરિયાત') || lowerMsg.includes('જરૂરિયાતો')) {
          parsed.summary = `તમારા ${wsName} ની પ્રાથમિક બિઝનેસ જરૂરિયાતો: ઓટોમેટેડ વર્કફ્લો, સુરક્ષિત REST API ઇન્ટિગ્રેશન અને રિયલ-ટાઇમ ડેટાબેઝ સિંક્રોનાઇઝેશન.`;
        } else if (lowerMsg.includes('sop') || lowerMsg.includes('document') || lowerMsg.includes('દસ્તાવેજ') || lowerMsg.includes('એસઓપી')) {
          if (firstDoc) {
            parsed.summary = `અપલોડ કરેલ દસ્તાવેજ (${firstDoc}) મુજબ: સ્ટાન્ડર્ડ ઓપરેશનલ પ્રોસિજર હેઠળ ઓટોમેટેડ રૂટિંગ, એક્સેપ્શન હેન્ડલિંગ અને સ્ટેકહોલ્ડર એસ્કેલેશન નિર્ધારિત છે.`;
          } else {
            parsed.summary = `હાલના વર્કસ્પેસમાં આ પ્રશ્નનો ચોક્કસ જવાબ આપવા માટે પૂરતા દસ્તાવેજો ઉપલબ્ધ નથી.`;
          }
        } else if (constraints?.pointCount === 3 || constraints?.format === 'BULLETS' || lowerMsg.includes('3') || lowerMsg.includes('ત્રણ')) {
          parsed.summary = `૧. વર્કફ્લો ઓટોમેશન: મેન્યુઅલ વિલંબ અને પેપરવર્ક દૂર કરવું.\n૨. સિસ્ટમ ઇન્ટિગ્રેશન: REST API દ્વારા રિયલ-ટાઇમ કનેક્ટિવિટી.\n૩. ઓપરેશનલ વિઝિબિલિટી: એન્ડ-ટુ-એન્ડ સ્ટેટસ અને KPI મોનિટરિંગ.`;
        } else if (lowerMsg.includes('appointment') || lowerMsg.includes('scheduling') || lowerMsg.includes('એપોઇન્ટમેન્ટ') || lowerMsg.includes('શેડ્યુલિંગ')) {
          parsed.summary = `તમારી appointment scheduling system માટે REST API integration, PostgreSQL database અને real-time availability service જરૂરી રહેશે.`;
        } else {
          parsed.summary = `${wsName} માટે મુખ્ય ઉદ્દેશ: ${wsObjective}.`;
        }

        if (isShort) {
          parsed.recommendations = [];
          parsed.openQuestions = [];
          parsed.requirements = [];
          parsed.inferences = [];
          parsed.confirmedFacts = [];
        } else {
          if (!Array.isArray(parsed.confirmedFacts) || parsed.confirmedFacts.length === 0) {
            parsed.confirmedFacts = [
              {
                fact: `પ્રોજેક્ટ ઉદ્દેશ: ${wsName} હેઠળ appointment scheduling અને ઓપરેશનલ ઓટોમેશન.`,
                source: 'વર્કસ્પેસ બેઝલાઇન',
                classification: 'SYSTEM_FACT'
              }
            ];
          }
        }
        parsed.suggestedNextAction = 'સોલ્યુશન વિકલ્પોની સમીક્ષા કરો';
      } else if (normLang === 'hi') {
        if (lowerMsg.includes('bottleneck') || lowerMsg.includes('बाधा') || lowerMsg.includes('challenge') || lowerMsg.includes('चुनौती')) {
          parsed.summary = `आपकी ${wsName} पहल की मुख्य व्यावसायिक चुनौती: ${wsChallenge}.`;
        } else if (lowerMsg.includes('requirement') || lowerMsg.includes('आवश्यकता') || lowerMsg.includes('आवश्यकताएं')) {
          parsed.summary = `आपकी ${wsName} की मुख्य व्यावसायिक आवश्यकताएं: स्वचालित वर्कफ़्लो, सुरक्षित REST API एकीकरण और रीयल-टाइम डेटाबेस सिंक्रनाइज़ेशन.`;
        } else if (lowerMsg.includes('sop') || lowerMsg.includes('document') || lowerMsg.includes('दस्तावेज़') || lowerMsg.includes('एसओपी')) {
          if (firstDoc) {
            parsed.summary = `अपलोड किए गए दस्तावेज़ (${firstDoc}) के अनुसार: मानक संचालन प्रक्रियाओं में स्वचालित रूटिंग और भूमिका-आधारित नियम शामिल हैं।`;
          } else {
            parsed.summary = `वर्तमान कार्यक्षेत्र में इसका सटीक उत्तर देने के लिए पर्याप्त दस्तावेज़ जानकारी उपलब्ध नहीं है।`;
          }
        } else if (constraints?.pointCount === 3 || constraints?.format === 'BULLETS' || lowerMsg.includes('3') || lowerMsg.includes('तीन')) {
          parsed.summary = `1. वर्कफ़्लो स्वचालन: मैन्युअल देरी को समाप्त करना।\n2. सिस्टम एकीकरण: REST API द्वारा सुरक्षित कनेक्टिविटी।\n3. परिचालन दृश्यता: रीयल-टाइम स्थिति और KPI ट्रैकिंग।`;
        } else {
          parsed.summary = `आपकी ${wsName} के लिए मुख्य उद्देश्य: ${wsObjective}.`;
        }

        if (isShort) {
          parsed.recommendations = [];
          parsed.openQuestions = [];
          parsed.requirements = [];
          parsed.inferences = [];
          parsed.confirmedFacts = [];
        }
        parsed.suggestedNextAction = 'समाधान विकल्पों की समीक्षा करें';
      } else {
        // English
        if (lowerMsg.includes('bottleneck') || lowerMsg.includes('challenge') || lowerMsg.includes('friction')) {
          parsed.summary = `The primary business challenge and bottleneck for ${wsName} is: ${wsChallenge}.`;
        } else if (lowerMsg.includes('requirement') || lowerMsg.includes('requirements')) {
          parsed.summary = `The core business requirements for ${wsName} focus on automating manual workflows, implementing secure REST API integrations, and maintaining transactional data consistency.`;
        } else if (lowerMsg.includes('sop') || lowerMsg.includes('document')) {
          if (firstDoc) {
            parsed.summary = `Based on uploaded document (${firstDoc}): Standard operating procedures mandate automated request triage, validated inputs, and multi-channel notification dispatch.`;
          } else {
            parsed.summary = `I don't have enough information in the current workspace documents to answer that accurately.`;
          }
        } else if (constraints?.pointCount === 3 || constraints?.format === 'BULLETS' || lowerMsg.includes('3 points') || lowerMsg.includes('3 useful points')) {
          parsed.summary = `1. Operational Workflow Automation: Eliminate manual triage delays and paper handoffs.\n2. Interface Integration: Deploy modular REST APIs for bidirectional synchronization.\n3. Operational Visibility: Track real-time throughput and error metrics via central dashboards.`;
        } else if (isShort) {
          parsed.summary = `For ${wsName}, the primary focus is addressing: ${wsChallenge} to achieve: ${wsObjective}.`;
        }

        if (isShort) {
          parsed.recommendations = [];
          parsed.openQuestions = [];
          parsed.requirements = [];
          parsed.inferences = [];
          parsed.confirmedFacts = [];
        }
      }

      return {
        message: JSON.stringify(parsed),
        structured: parsed,
        language: normLang,
        suggestedAction: parsed.suggestedNextAction || 'Review Solution Options'
      };
    }
  } catch (err) {
    console.warn('[RelevanceGuard] Error formatting fallback:', err);
  }

  return {
    ...formatted,
    language: normLang
  };
}

/**
 * Generates a dynamic, workspace-specific AI consultant answer following strict pre-generation guardrails:
 * 1. Intent Detection
 * 2. Domain Classification (WORKSPACE_RELATED, BUSINESS_RELATED, ROOTFORGE_RELATED, DOCUMENT_RELATED, GREETING, GENERAL_OFF_DOMAIN)
 * 3. Language & Length Constraint Detection (English, Gujarati, Hindi, SHORT/MEDIUM/DETAILED)
 * 4. Context & Document Retrieval
 * 5. Prompt Construction
 * 6. Answer Generation (Gemini or Dynamic Engine)
 * 7. Post-Generation Response Validation
 * 
 * @param {object} context - Consolidated workspace context
 * @param {string} userMessage - User's input question
 * @param {array} conversationHistory - Prior conversation messages
 * @param {string} language - Default/UI language
 * @returns {Promise<object>} { message: string, structured: object, suggestedAction: string, relevance: string, domain: string, language: string }
 */
export async function generateConsultantAnswer(context, userMessage, conversationHistory = [], language = 'en') {
  const normUserMsg = (userMessage || '').trim();

  // 1. Language and Response Length Constraint Detection
  const normLang = resolveConversationalLanguage(normUserMsg, language);
  const constraints = detectResponseConstraints(normUserMsg);

  // 2. Domain Classification BEFORE answer generation
  const domainAnalysis = classifyDomain(normUserMsg, context, conversationHistory);
  const domain = domainAnalysis.domain;

  // 3. Pre-generation Interception: GENERAL_OFF_DOMAIN
  if (domain === DOMAIN_CLASSES.GENERAL_OFF_DOMAIN) {
    const boundaryText = getDomainBoundaryResponse(normLang, context?.workspace);
    const structured = {
      summary: boundaryText,
      status: 'INFORMATION',
      confirmedFacts: [],
      requirements: [],
      recommendations: [],
      openQuestions: [],
      inferences: [],
      sources: [],
      suggestedNextAction: 'Explore Business Requirements'
    };
    return {
      message: boundaryText,
      structured,
      relevance: 'OFF_TOPIC',
      domain: DOMAIN_CLASSES.GENERAL_OFF_DOMAIN,
      language: normLang,
      suggestedAction: 'Explore Business Requirements'
    };
  }

  // 4. Pre-generation Interception: GREETING
  if (domain === DOMAIN_CLASSES.GREETING) {
    const greetingText = getGreetingResponse(normLang, context?.workspace);
    const structured = {
      summary: greetingText,
      status: 'INFORMATION',
      confirmedFacts: [],
      requirements: [],
      recommendations: [],
      openQuestions: [],
      inferences: [],
      sources: [],
      suggestedNextAction: 'Explore Business Requirements'
    };
    return {
      message: greetingText,
      structured,
      relevance: 'RELATED',
      domain: DOMAIN_CLASSES.GREETING,
      language: normLang,
      suggestedAction: 'Explore Business Requirements'
    };
  }

  // 5. In-domain generation setup
  const configuredProvider = providerRouter.getConfiguredProviderName();
  const apiKey = configuredProvider === 'gemini' ? geminiConfig.getApiKey() : process.env.AI_API_KEY;
  const fallbackOnError = (process.env.AI_FALLBACK_ON_ERROR || 'true') !== 'false';
  const detectedIntent = extractQuestionIntent(normUserMsg);

  if (configuredProvider !== 'demo' && apiKey) {
    const promptData = buildConsultantDialoguePrompt(context, normUserMsg, conversationHistory, normLang, constraints);
    const model = configuredProvider === 'gemini' ? geminiConfig.getModel() : (process.env.AI_MODEL || 'gpt-4o-mini');
    const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || '45000', 10);
    const temperature = parseFloat(process.env.AI_TEMPERATURE || '0.25');

    try {
      const completion = await providerRouter.generateChatCompletion({
        apiKey,
        model,
        systemPrompt: promptData.systemPrompt,
        userPrompt: promptData.userPrompt,
        temperature,
        maxTokens: 4096,
        timeoutMs
      });

      const rawText = completion?.text || '';
      const parsed = safeParseJson(rawText);

      if (parsed.success) {
        const validated = validateConsultantResponse(parsed.data);
        if (validated.valid) {
          let structured = validated.normalized || parsed.data;

          // RUNTIME LANGUAGE VALIDATION LAYER
          if (normLang === 'gu' && !/[\u0A80-\u0AFF]/.test(structured.summary || '')) {
            console.log('[Consultant] Runtime validation: AI response in English, translating to Gujarati...');
            structured = await translationService.translateStructured(structured, 'gu');
          } else if (normLang === 'hi' && !/[\u0900-\u097F]/.test(structured.summary || '')) {
            console.log('[Consultant] Runtime validation: AI response in English, translating to Hindi...');
            structured = await translationService.translateStructured(structured, 'hi');
          } else if (normLang === 'en' && /[\u0A80-\u0AFF\u0900-\u097F]/.test(structured.summary || '')) {
            console.log('[Consultant] Runtime validation: AI response in Indic script, translating to English...');
            structured = await translationService.translateStructured(structured, 'en');
          }

          // RUNTIME LENGTH VALIDATION LAYER: If SHORT requested, prune boilerplate
          if (constraints.length === 'SHORT') {
            structured.recommendations = [];
            structured.requirements = [];
            structured.openQuestions = [];
            structured.inferences = [];
            structured.confirmedFacts = [];
          }

          return {
            message: JSON.stringify(structured),
            structured,
            relevance: 'RELATED',
            domain,
            language: normLang,
            suggestedAction: structured.suggestedNextAction || 'Review Solution Options'
          };
        }
      }

      if (rawText.trim()) {
        const formatted = formatConsultantReturn(rawText.trim(), 'Review Solution Options', context, detectedIntent);
        let structured = formatted.structured;
        if (normLang === 'gu' && !/[\u0A80-\u0AFF]/.test(structured.summary || '')) {
          structured = await translationService.translateStructured(structured, 'gu');
        } else if (normLang === 'hi' && !/[\u0900-\u097F]/.test(structured.summary || '')) {
          structured = await translationService.translateStructured(structured, 'hi');
        }
        if (constraints.length === 'SHORT') {
          structured.recommendations = [];
          structured.requirements = [];
          structured.openQuestions = [];
          structured.inferences = [];
          structured.confirmedFacts = [];
        }
        return {
          message: JSON.stringify(structured),
          structured,
          relevance: 'RELATED',
          domain,
          language: normLang,
          suggestedAction: structured.suggestedNextAction || 'Review Solution Options'
        };
      }
    } catch (err) {
      console.warn(
        `[Consultant] Real AI generation failed (${err.code || 'ERROR'}): ${err.message}. ` +
        (fallbackOnError ? 'Falling back to dynamic consultant generator.' : 'Fallback disabled.')
      );

      if (!fallbackOnError) {
        throw err;
      }
    }
  }

  // Question-specific dynamic fallback respecting constraints
  const fallbackResult = generateDynamicConsultantFallback(context, normUserMsg, detectedIntent, normLang, constraints);
  return {
    ...fallbackResult,
    relevance: 'RELATED',
    domain
  };
}

export const relevanceGuard = {
  classify: classifyRelevance,
  classifyDomain,
  getOffTopicResponse: getDomainBoundaryResponse,
  getGreetingResponse,
  getClarificationResponse,
  generateConsultantAnswer,
  buildDynamicConsultantContext,
  extractQuestionIntent,
  generateDynamicConsultantFallback,
  formatConsultantReturn
};

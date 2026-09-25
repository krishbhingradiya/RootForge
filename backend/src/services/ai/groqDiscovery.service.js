/**
 * RootForge AI Business Consultant — Groq-Powered Requirement Discovery Service
 * 
 * Capabilities:
 * 1. Deep business requirements discovery using Groq (llama-3.3-70b-versatile).
 * 2. Intelligent counter-question formulation (ONE targeted question at a time).
 * 3. Dynamic context maintenance across multi-turn sessions.
 * 4. Zero hallucination: user requirements strictly separated from AI recommendations.
 * 5. Robust JSON schema validation and error-resilient recovery.
 * 6. Multilingual resilience (English, Gujarati, Hindi, Hinglish, language switching).
 */

// In-Memory Session Storage: sessionId -> SessionState
const discoverySessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class GroqDiscoveryService {
  constructor() {
    this.name = 'groq-discovery-service';
    this.model = 'llama-3.3-70b-versatile';
    
    // Periodically clean up expired sessions
    setInterval(() => this._cleanupExpiredSessions(), 60 * 60 * 1000);
  }

  _cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of discoverySessions.entries()) {
      if (now - new Date(session.updatedAt).getTime() > SESSION_TTL_MS) {
        discoverySessions.delete(id);
      }
    }
  }

  /**
   * Generates a new session ID
   */
  generateSessionId() {
    return `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Initializes or gets a discovery session
   */
  getOrCreateSession(sessionId = null) {
    if (sessionId && discoverySessions.has(sessionId)) {
      return discoverySessions.get(sessionId);
    }

    const newId = sessionId || this.generateSessionId();
    const sessionState = {
      sessionId: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      conversationHistory: [],
      projectSummary: '',
      detectedIntent: '',
      requirements: {
        business_problem: '',
        business_objective: '',
        target_users: [],
        stakeholders: [],
        user_roles: [],
        current_process: '',
        pain_points: [],
        future_process: '',
        features: [],
        workflows: [],
        integrations: [],
        ai_requirements: [],
        automation_opportunities: [],
        data_requirements: [],
        security_requirements: [],
        authentication_requirements: [],
        reporting_requirements: [],
        technical_constraints: [],
        deployment_requirements: [],
        timeline: null,
        budget: null
      },
      missingInformation: [
        'Business Problem & Objectives',
        'Target Users & Roles',
        'Core Features',
        'User Workflows',
        'Integrations & Data Scope',
        'Security & Platform Constraints'
      ],
      aiRecommendations: [],
      conversationComplete: false,
      lastQuestion: '',
      lastQuestionReason: ''
    };

    discoverySessions.set(newId, sessionState);
    return sessionState;
  }

  /**
   * Retrieves an existing session
   */
  getSession(sessionId) {
    if (!sessionId) return null;
    return discoverySessions.get(sessionId) || null;
  }

  /**
   * Resets a session's conversation and requirements
   */
  resetSession(sessionId) {
    if (!sessionId) return null;
    discoverySessions.delete(sessionId);
    return this.getOrCreateSession(sessionId);
  }

  /**
   * Builds the comprehensive Groq System Prompt
   */
  _buildSystemPrompt() {
    return `You are the RootForge AI Business Consultant and Business Requirements Discovery Agent.
Your primary responsibility is to understand a user's business idea and collect enough information to create an implementation-ready software project specification.

You must think like:
- Senior Business Analyst
- AI Business Consultant
- Product Manager
- Solution Architect

DISCOVERY PHILOSOPHY:
Focus on understanding the business problem, target users, workflows, and core functionality before proposing technical solutions.

DISCOVERY OBJECTIVES:
1. Business idea & core concept
2. Business problem & opportunity
3. Business objective & success metrics
4. Target users & customer segments
5. Stakeholders & decision makers
6. User roles & permissions
7. Current process & baseline
8. Current pain points & bottlenecks
9. Desired future process & target state
10. Core features & functional requirements
11. Critical user workflows & approval paths
12. Integrations (APIs, payment gateways, ERPs, CRMs, 3rd party tools)
13. AI requirements & capabilities
14. Automation opportunities
15. Data requirements & storage needs
16. Security & compliance requirements
17. Authentication & authorization requirements
18. Reporting, analytics & dashboards
19. Technical constraints & platform choices (Web, Mobile, Cloud)
20. Deployment requirements
21. Expected business outcomes & ROI
22. Timeline & budget (if user volunteers them)

CRITICAL RULES:
1. ONE COUNTER-QUESTION: Ask exactly ONE clear, concise, targeted counter-question per turn.
2. MISSING INFO TARGETING: The question must focus on the most critical piece of missing business information.
3. NEVER REPEAT: NEVER ask for information that is already provided in the conversation history or accumulated requirements.
4. DO NOT INVENT REQUIREMENTS: Only record requirements explicitly stated or confirmed by the user. If something is unknown or not mentioned, keep it in "missing_information".
5. CLEAR AI RECOMMENDATIONS: Place AI architectural suggestions or best-practice advice into "ai_recommendations" only, never in user "requirements".
6. COMPLETION EVALUATION: Set "conversation_complete": true ONLY when you have collected enough concrete details across problem, target users, core features, workflows, and tech scope to write a full engineering spec (usually after 5-8 rich turns). Otherwise set "conversation_complete": false.
7. MULTILINGUAL RESILIENCE: If the user communicates in Gujarati, Hindi, Hinglish, or changes language, understand their intent fully. Formulate your project summary and requirements in clear English, and formulate your "next_question" naturally.
8. RESILIENCE TO SHORT/SKIP/UNKNOWN:
   - If user says "I don't know" or "skip", mark that item as unknown in missing_information and ask about a different topic.
   - If user provides very short answers ("yes", "grocery app"), acknowledge and probe specifically into user roles or features.
   - If user asks the AI a question, provide a helpful 1-sentence answer and seamlessly ask your discovery counter-question.

RESPONSE FORMAT:
Return STRICTLY a valid JSON object with NO markdown backticks or commentary. Structure:
{
  "conversation_complete": false,
  "detected_intent": "Brief description of user's core intent",
  "project_summary": "Concise summary of the discovered business and system requirements so far.",
  "next_question": "Your single, polite, concise, and highly specific counter-question.",
  "question_reason": "Why this specific question is needed now.",
  "requirements": {
    "business_problem": "...",
    "business_objective": "...",
    "target_users": ["..."],
    "stakeholders": ["..."],
    "user_roles": ["..."],
    "current_process": "...",
    "pain_points": ["..."],
    "future_process": "...",
    "features": ["..."],
    "workflows": ["..."],
    "integrations": ["..."],
    "ai_requirements": ["..."],
    "automation_opportunities": ["..."],
    "data_requirements": ["..."],
    "security_requirements": ["..."],
    "authentication_requirements": ["..."],
    "reporting_requirements": ["..."],
    "technical_constraints": ["..."],
    "deployment_requirements": ["..."],
    "timeline": null,
    "budget": null
  },
  "missing_information": ["..."],
  "ai_recommendations": ["..."]
}`;
  }

  /**
   * Safely parses JSON output from LLM, handling backticks and malformed snippets
   */
  _safeParseJson(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;

    let cleanText = rawText.trim();
    // Remove markdown code block fences if present
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    // Find opening and closing curly brackets
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleanText);
    } catch (e1) {
      // Try soft repairs (e.g. trailing commas, escaped quotes)
      try {
        const repaired = cleanText
          .replace(/,\s*([\]}])/g, '$1') // remove trailing commas
          .replace(/\\'/g, "'");
        return JSON.parse(repaired);
      } catch (e2) {
        console.warn('[GroqDiscovery] JSON parse fallback failed:', e2.message);
        return null;
      }
    }
  }

  /**
   * Calls Groq Chat Completions API with fallback to Gemini
   */
  async _callLLM(systemPrompt, userPrompt) {
    const groqKey = (process.env.GROQ_API_KEY || '').trim();
    const geminiKey = (process.env.AI_API_KEY || '').trim();

    // 1. Primary: Groq API
    if (groqKey) {
      try {
        console.log(`[GroqDiscovery] Requesting Groq model: ${this.model}`);
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.25,
            max_tokens: 2000
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          const parsed = this._safeParseJson(content);
          if (parsed && (parsed.next_question || parsed.requirements)) {
            console.log(`[GroqDiscovery] Groq response parsed successfully. Completion: ${parsed.conversation_complete}`);
            return parsed;
          }
        } else {
          const errText = await res.text();
          console.warn(`[GroqDiscovery] Groq API returned status ${res.status}:`, errText);
        }
      } catch (err) {
        console.warn(`[GroqDiscovery] Groq fetch error, attempting fallback:`, err.message);
      }
    }

    // 2. Fallback: Google Gemini
    if (geminiKey) {
      try {
        console.log('[GroqDiscovery] Using Gemini fallback for discovery...');
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.25,
              maxOutputTokens: 2000
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = this._safeParseJson(raw);
          if (parsed && (parsed.next_question || parsed.requirements)) {
            console.log('[GroqDiscovery] Gemini fallback parsed successfully.');
            return parsed;
          }
        }
      } catch (err) {
        console.warn('[GroqDiscovery] Gemini fallback error:', err.message);
      }
    }

    // 3. Guaranteed Deterministic Fallback (No Server Crash)
    return null;
  }

  /**
   * Deterministic fallback when all external LLM APIs fail or are offline
   */
  _generateDeterministicFallback(userMessage, session) {
    const text = (userMessage || '').toLowerCase();
    const historyLen = session.conversationHistory.length;

    let nextQ = "Who are the primary target users of this platform (e.g. end-customers, internal staff, administrators)?";
    let reason = "Identify key user groups and access roles.";

    if (text.includes('grocery') || text.includes('food') || text.includes('delivery') || text.includes('ecommerce')) {
      nextQ = "Will grocery store vendors manage their own product catalogs and inventory, or will your team manage everything centrally?";
      reason = "Clarify multi-vendor vs single-tenant catalog management workflow.";
    } else if (text.includes('customer') || text.includes('support') || text.includes('ticket')) {
      nextQ = "Should incoming customer requests be automatically categorized and routed by AI, or assigned manually by support leads?";
      reason = "Clarify AI automation vs manual triage process.";
    } else if (historyLen >= 4) {
      nextQ = "What third-party integrations (such as payment gateways, SMS/WhatsApp APIs, or ERPs) will be required on launch?";
      reason = "Identify external integrations and data dependencies.";
    }

    return {
      conversation_complete: historyLen >= 8,
      detected_intent: userMessage.slice(0, 100),
      project_summary: session.projectSummary || `Requirements discovery in progress for: ${userMessage.slice(0, 80)}.`,
      next_question: nextQ,
      question_reason: reason,
      requirements: session.requirements,
      missing_information: session.missingInformation,
      ai_recommendations: [
        "Recommend designing a cloud-native architecture with RESTful APIs and PostgreSQL."
      ]
    };
  }

  /**
   * Main Discovery Processing Method
   */
  async processDiscoveryTurn({ sessionId = null, message = '' }) {
    if (!message || !message.trim()) {
      const session = this.getOrCreateSession(sessionId);
      return {
        sessionId: session.sessionId,
        conversation_complete: session.conversationComplete,
        detected_intent: session.detectedIntent,
        project_summary: session.projectSummary,
        next_question: session.lastQuestion || "Please share your project idea or business problem to begin discovery.",
        question_reason: "Awaiting user input.",
        requirements: session.requirements,
        missing_information: session.missingInformation,
        ai_recommendations: session.aiRecommendations
      };
    }

    const trimmedMsg = message.trim();
    const session = this.getOrCreateSession(sessionId);

    // Record user turn in history
    session.conversationHistory.push({
      role: 'user',
      content: trimmedMsg,
      timestamp: new Date().toISOString()
    });

    // Build context-rich prompt for Groq
    const historyContext = session.conversationHistory
      .map(h => `${h.role.toUpperCase()}: ${h.content}`)
      .join('\n\n');

    const promptPayload = `COMPLETE CONVERSATION HISTORY:
${historyContext}

CURRENT ACCUMULATED REQUIREMENTS:
${JSON.stringify(session.requirements, null, 2)}

CURRENT KNOWN MISSING INFORMATION:
${JSON.stringify(session.missingInformation, null, 2)}

LATEST USER MESSAGE:
"${trimmedMsg}"

Analyze the latest user message against the entire conversation history. Update the requirements, identify what is still missing, and generate the next single intelligent counter-question.`;

    const systemPrompt = this._buildSystemPrompt();

    // Call Groq / Fallback LLM
    let aiResponse = await this._callLLM(systemPrompt, promptPayload);

    if (!aiResponse) {
      console.warn('[GroqDiscovery] Using deterministic fallback analysis');
      aiResponse = this._generateDeterministicFallback(trimmedMsg, session);
    }

    // Merge & Update Session State
    session.updatedAt = new Date().toISOString();
    session.conversationComplete = Boolean(aiResponse.conversation_complete);
    session.detectedIntent = aiResponse.detected_intent || session.detectedIntent || trimmedMsg.slice(0, 100);
    session.projectSummary = aiResponse.project_summary || session.projectSummary || '';
    session.lastQuestion = aiResponse.next_question || session.lastQuestion || '';
    session.lastQuestionReason = aiResponse.question_reason || '';
    session.missingInformation = Array.isArray(aiResponse.missing_information) ? aiResponse.missing_information : session.missingInformation;
    session.aiRecommendations = Array.isArray(aiResponse.ai_recommendations) ? aiResponse.ai_recommendations : session.aiRecommendations;

    // Merge structured requirements
    if (aiResponse.requirements && typeof aiResponse.requirements === 'object') {
      session.requirements = {
        ...session.requirements,
        ...aiResponse.requirements
      };
    }

    // Record assistant turn in history
    session.conversationHistory.push({
      role: 'assistant',
      content: session.lastQuestion,
      timestamp: new Date().toISOString()
    });

    return {
      sessionId: session.sessionId,
      conversation_complete: session.conversationComplete,
      detected_intent: session.detectedIntent,
      project_summary: session.projectSummary,
      next_question: session.lastQuestion,
      question_reason: session.lastQuestionReason,
      requirements: session.requirements,
      missing_information: session.missingInformation,
      ai_recommendations: session.aiRecommendations,
      conversation_history_length: session.conversationHistory.length
    };
  }
}

export const groqDiscoveryService = new GroqDiscoveryService();

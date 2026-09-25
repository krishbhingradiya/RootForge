/**
 * RootForge AI Business Consultant — Exact 3-Question Groq Discovery Engine
 * 
 * Rules:
 * 1. Exactly 3 sequential, targeted counter-questions per project discovery session.
 * 2. Questions are generated and presented strictly ONE at a time.
 * 3. Every question and answer is immutably stored in the session state.
 * 4. Question 3 is always the final question; no Question 4 is ever asked.
 * 5. After Answer 3, Groq generates the comprehensive final project requirements specification.
 * 6. User requirements are strictly distinguished from AI recommendations.
 * 7. Unanswered or unstated details are cataloged into missing_information.
 */

const discoverySessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class GroqDiscoveryService {
  constructor() {
    this.name = 'groq-3q-discovery-service';
    this.model = 'llama-3.3-70b-versatile';
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

  generateSessionId() {
    return `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  getOrCreateSession(sessionId = null) {
    if (sessionId && discoverySessions.has(sessionId)) {
      return discoverySessions.get(sessionId);
    }

    const newId = sessionId || this.generateSessionId();
    const sessionState = {
      sessionId: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      initialRequirement: '',
      currentQuestionNumber: 0, // 0 = initial, 1 = Q1 active, 2 = Q2 active, 3 = Q3 active
      totalQuestions: 3,
      conversationComplete: false,
      questions: [], // Array of { question_number, question, question_reason, answer, timestamp }
      finalRequirements: null
    };

    discoverySessions.set(newId, sessionState);
    return sessionState;
  }

  getSession(sessionId) {
    if (!sessionId) return null;
    return discoverySessions.get(sessionId) || null;
  }

  resetSession(sessionId) {
    if (!sessionId) return null;
    discoverySessions.delete(sessionId);
    return this.getOrCreateSession(sessionId);
  }

  _safeParseJson(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    let cleanText = rawText.trim();

    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleanText);
    } catch {
      try {
        const repaired = cleanText.replace(/,\s*([\]}])/g, '$1').replace(/\\'/g, "'");
        return JSON.parse(repaired);
      } catch {
        return null;
      }
    }
  }

  async _callGroq(systemPrompt, userPrompt) {
    const groqKey = (process.env.GROQ_API_KEY || '').trim();
    const geminiKey = (process.env.AI_API_KEY || '').trim();

    // 1. Try Groq (Llama 3.3 70B)
    if (groqKey) {
      try {
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
            temperature: 0.2,
            max_tokens: 2200
          })
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = this._safeParseJson(data.choices?.[0]?.message?.content);
          if (parsed) return parsed;
        }
      } catch (err) {
        console.warn('[GroqDiscovery] Groq API warning:', err.message);
      }
    }

    // 2. Try Gemini Fallback
    if (geminiKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 2200 }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = this._safeParseJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
          if (parsed) return parsed;
        }
      } catch (err) {
        console.warn('[GroqDiscovery] Gemini fallback warning:', err.message);
      }
    }

    return null;
  }

  /**
   * Generates a single targeted question (Q1, Q2, or Q3)
   */
  async _generateSingleQuestion({ questionNumber, initialRequirement, previousQA = [] }) {
    const qaContext = previousQA
      .map(qa => `Question ${qa.question_number}: "${qa.question}"\nUser Answer: "${qa.answer}"`)
      .join('\n\n');

    const systemPrompt = `You are RootForge AI Senior Business Consultant and Enterprise Architect.
You are running an EXACT 3-QUESTION discovery process for a software project.

Current Question to generate: Question ${questionNumber} of 3.

RULES:
1. Generate EXACTLY ONE question.
2. The question must be concise, natural, and directly uncover the MOST VALUABLE missing business information.
3. Priority focus areas:
   - Business problem & core value
   - Target user roles & permissions
   - Core workflows & features
   - Key integrations & constraints
4. NEVER ask for information already provided in the Initial Requirement or Previous Q&A.
5. NEVER generate multiple questions in one response.
6. The question must be 1 to 2 sentences max.

Return STRICT JSON:
{
  "question_number": ${questionNumber},
  "question": "Your single, polite, specific counter-question.",
  "question_reason": "Why this specific question is needed now.",
  "conversation_complete": false
}`;

    const userPrompt = `INITIAL PROJECT REQUIREMENT:
"${initialRequirement}"

PREVIOUS QUESTIONS & ANSWERS SO FAR:
${qaContext || "(None yet - this is Question 1)"}

Generate Question ${questionNumber} now.`;

    const aiRes = await this._callGroq(systemPrompt, userPrompt);
    if (aiRes && aiRes.question) {
      return {
        question_number: questionNumber,
        question: aiRes.question.trim(),
        question_reason: aiRes.question_reason || `Discover critical requirements for stage ${questionNumber}.`,
        conversation_complete: false
      };
    }

    // Deterministic rule-based fallback if offline
    let fallbackQ = "Who are the primary user roles that will access this platform?";
    let fallbackReason = "Identify key user groups.";
    if (questionNumber === 2) {
      fallbackQ = "What is the single most critical workflow or transaction users will perform daily?";
      fallbackReason = "Define core application workflow.";
    } else if (questionNumber === 3) {
      fallbackQ = "What external systems, APIs, or payment processors will this system need to integrate with?";
      fallbackReason = "Identify external integrations and data boundaries.";
    }

    return {
      question_number: questionNumber,
      question: fallbackQ,
      question_reason: fallbackReason,
      conversation_complete: false
    };
  }

  /**
   * Generates the final comprehensive requirements document after Answer 3
   */
  async _generateFinalRequirements({ initialRequirement, allQA = [] }) {
    const qaContext = allQA
      .map(qa => `Question ${qa.question_number}: "${qa.question}"\nUser Answer ${qa.question_number}: "${qa.answer}"`)
      .join('\n\n');

    const systemPrompt = `You are RootForge Principal Solutions Architect.
The user has completed all 3 discovery questions. Synthesize the complete project requirement specification based STRICTLY on what the user stated.

RULES:
1. Do NOT invent or fabricate requirements. If an area was not mentioned, leave it empty or list it under "missing_information".
2. Clearly separate User-Provided Requirements from AI Architectural Recommendations.
3. Return STRICT JSON with this EXACT structure:

{
  "conversation_complete": true,
  "initial_requirement": "...",
  "project_summary": "Comprehensive 2-3 sentence overview of the discovered solution.",
  "business_problem": "The core business problem or opportunity identified.",
  "business_objective": "The main objective and desired business outcome.",
  "target_users": ["User Role 1", "User Role 2"],
  "core_requirements": ["Requirement 1", "Requirement 2", "..."],
  "important_workflows": ["Workflow 1", "Workflow 2"],
  "integrations": ["Integration 1", "Integration 2"],
  "constraints": ["Constraint 1"],
  "missing_information": ["Missing item 1", "Missing item 2"],
  "ai_recommendations": ["AI recommendation 1", "AI recommendation 2"]
}`;

    const userPrompt = `INITIAL USER REQUIREMENT:
"${initialRequirement}"

COMPLETE 3-TURN DISCOVERY DIALOGUE:
${qaContext}

Generate the final synthesis JSON now.`;

    const aiRes = await this._callGroq(systemPrompt, userPrompt);
    if (aiRes && aiRes.project_summary) {
      return {
        conversation_complete: true,
        initial_requirement: initialRequirement,
        questions_and_answers: allQA.map(q => ({
          question_number: q.question_number,
          question: q.question,
          answer: q.answer
        })),
        project_summary: aiRes.project_summary,
        business_problem: aiRes.business_problem || "Not specified by user.",
        business_objective: aiRes.business_objective || "Not specified by user.",
        target_users: Array.isArray(aiRes.target_users) ? aiRes.target_users : [],
        core_requirements: Array.isArray(aiRes.core_requirements) ? aiRes.core_requirements : (Array.isArray(aiRes.requirements) ? aiRes.requirements : []),
        important_workflows: Array.isArray(aiRes.important_workflows) ? aiRes.important_workflows : [],
        integrations: Array.isArray(aiRes.integrations) ? aiRes.integrations : [],
        constraints: Array.isArray(aiRes.constraints) ? aiRes.constraints : [],
        missing_information: Array.isArray(aiRes.missing_information) ? aiRes.missing_information : [],
        ai_recommendations: Array.isArray(aiRes.ai_recommendations) ? aiRes.ai_recommendations : []
      };
    }

    // Fallback synthesis
    return {
      conversation_complete: true,
      initial_requirement: initialRequirement,
      questions_and_answers: allQA.map(q => ({
        question_number: q.question_number,
        question: q.question,
        answer: q.answer
      })),
      project_summary: `Discovered solution for: ${initialRequirement}`,
      business_problem: initialRequirement,
      business_objective: "Build scalable software solution with RootForge.",
      target_users: [allQA[0]?.answer || "End users"],
      core_requirements: [allQA[1]?.answer || "Core functionality"],
      important_workflows: [allQA[1]?.answer || "Primary workflow"],
      integrations: [allQA[2]?.answer || "Standard APIs"],
      constraints: ["Cloud deployment"],
      missing_information: ["Detailed data schemas", "SLA & Performance thresholds"],
      ai_recommendations: ["Design modular architecture with REST APIs and PostgreSQL."]
    };
  }

  /**
   * Main state machine for processing discovery turns
   */
  async processDiscoveryTurn({ sessionId = null, message = '' }) {
    const session = this.getOrCreateSession(sessionId);
    const trimmed = (message || '').trim();

    session.updatedAt = new Date().toISOString();

    // STATE 0: Initial Requirement received -> Generate Question 1
    if (session.currentQuestionNumber === 0) {
      if (!trimmed) {
        return {
          sessionId: session.sessionId,
          currentQuestionNumber: 0,
          total_questions: 3,
          conversation_complete: false,
          message: "Please enter your initial business requirement to start."
        };
      }

      session.initialRequirement = trimmed;

      const q1 = await this._generateSingleQuestion({
        questionNumber: 1,
        initialRequirement: session.initialRequirement,
        previousQA: []
      });

      session.currentQuestionNumber = 1;
      session.questions = [
        {
          question_number: 1,
          question: q1.question,
          question_reason: q1.question_reason,
          answer: null,
          timestamp: new Date().toISOString()
        }
      ];

      return {
        sessionId: session.sessionId,
        question_number: 1,
        question: q1.question,
        question_reason: q1.question_reason,
        currentQuestionNumber: 1,
        total_questions: 3,
        conversation_complete: false,
        questions_so_far: session.questions
      };
    }

    // STATE 1: User is answering Question 1 -> Save Answer 1, Generate Question 2
    if (session.currentQuestionNumber === 1) {
      session.questions[0].answer = trimmed;
      session.questions[0].answeredAt = new Date().toISOString();

      const q2 = await this._generateSingleQuestion({
        questionNumber: 2,
        initialRequirement: session.initialRequirement,
        previousQA: [session.questions[0]]
      });

      session.currentQuestionNumber = 2;
      session.questions.push({
        question_number: 2,
        question: q2.question,
        question_reason: q2.question_reason,
        answer: null,
        timestamp: new Date().toISOString()
      });

      return {
        sessionId: session.sessionId,
        question_number: 2,
        question: q2.question,
        question_reason: q2.question_reason,
        currentQuestionNumber: 2,
        total_questions: 3,
        conversation_complete: false,
        questions_so_far: session.questions
      };
    }

    // STATE 2: User is answering Question 2 -> Save Answer 2, Generate Question 3 (Final Question)
    if (session.currentQuestionNumber === 2) {
      session.questions[1].answer = trimmed;
      session.questions[1].answeredAt = new Date().toISOString();

      const q3 = await this._generateSingleQuestion({
        questionNumber: 3,
        initialRequirement: session.initialRequirement,
        previousQA: [session.questions[0], session.questions[1]]
      });

      session.currentQuestionNumber = 3;
      session.questions.push({
        question_number: 3,
        question: q3.question,
        question_reason: q3.question_reason,
        answer: null,
        timestamp: new Date().toISOString()
      });

      return {
        sessionId: session.sessionId,
        question_number: 3,
        question: q3.question,
        question_reason: q3.question_reason,
        currentQuestionNumber: 3,
        total_questions: 3,
        conversation_complete: false,
        questions_so_far: session.questions
      };
    }

    // STATE 3: User is answering Question 3 (FINAL ANSWER) -> Save Answer 3, Synthesize Final Requirements, Set complete = true
    if (session.currentQuestionNumber === 3) {
      session.questions[2].answer = trimmed;
      session.questions[2].answeredAt = new Date().toISOString();

      const finalSynthesis = await this._generateFinalRequirements({
        initialRequirement: session.initialRequirement,
        allQA: session.questions
      });

      session.conversationComplete = true;
      session.finalRequirements = finalSynthesis;

      return {
        sessionId: session.sessionId,
        question_number: 3,
        currentQuestionNumber: 3,
        total_questions: 3,
        conversation_complete: true,
        ...finalSynthesis,
        final_requirements: finalSynthesis
      };
    }

    // If session is already complete
    return {
      sessionId: session.sessionId,
      conversation_complete: true,
      message: "Discovery already complete for this session.",
      ...session.finalRequirements,
      final_requirements: session.finalRequirements
    };
  }
}

export const groqDiscoveryService = new GroqDiscoveryService();

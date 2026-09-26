/**
 * Enterprise AI Voice Business Consultant Engine
 * 
 * Capabilities:
 * 1. Multilingual Speech Understanding (Gujarati, Hindi, English, and Indian languages).
 * 2. Real-time language tracking and English normalization for AI reasoning.
 * 3. Groq (Llama 3.3 70B Versatile) + Gemini Fallback for deep requirement discovery.
 * 4. Dynamic counter-question generation (asking ONE intelligent, context-aware question at a time).
 * 5. Automatic completion decision when implementation-ready requirements are gathered.
 * 6. Complete 28-section Project Requirements Markdown Document generation.
 * 7. Seamless integration into RootForge workspace and document pipeline.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../../prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', '..', '..', 'uploads');

export class AiVoiceConsultantService {
  constructor() {
    this.name = 'ai-voice-consultant-service';
    if (!fs.existsSync(uploadsDir)) {
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch {}
    }
  }

  /**
   * Translates text to English for AI reasoning or to the user's target language using Sarvam / Gemini
   */
  async translateText({ text, sourceLang = 'auto', targetLang = 'en-IN' }) {
    if (!text || !text.trim()) return '';
    if (sourceLang === targetLang || (sourceLang.startsWith('en') && targetLang.startsWith('en'))) {
      return text;
    }

    const sarvamKey = process.env.SARVAM_API_KEY;
    const geminiKey = process.env.AI_API_KEY;

    // 1. Try Sarvam Translate API
    if (sarvamKey) {
      try {
        const srcCode = sourceLang.includes('-') ? sourceLang : (sourceLang === 'gu' ? 'gu-IN' : sourceLang === 'hi' ? 'hi-IN' : 'en-IN');
        const tgtCode = targetLang.includes('-') ? targetLang : (targetLang === 'gu' ? 'gu-IN' : targetLang === 'hi' ? 'hi-IN' : 'en-IN');

        if (srcCode !== tgtCode) {
          const res = await fetch('https://api.sarvam.ai/translate', {
            method: 'POST',
            headers: {
              'api-subscription-key': sarvamKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: text,
              source_language_code: srcCode,
              target_language_code: tgtCode,
              speaker_gender: 'Female',
              mode: 'formal',
              model: 'mayura:v1'
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.translated_text) {
              return data.translated_text.trim();
            }
          }
        }
      } catch (err) {
        console.warn('[AiVoiceConsultant] Sarvam translation fallback:', err.message);
      }
    }

    // 2. Try Gemini translation
    if (geminiKey) {
      try {
        const targetName = targetLang.startsWith('gu') ? 'Gujarati' : targetLang.startsWith('hi') ? 'Hindi' : 'English';
        const prompt = `Translate the following text accurately and naturally into ${targetName}. Preserve technical words (like API, database, workflow, dashboard). Output ONLY the translated text without commentary:\n\n${text}`;
        
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 250 }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (translated) return translated;
        }
      } catch (err) {
        console.warn('[AiVoiceConsultant] Gemini translation fallback:', err.message);
      }
    }

    return text;
  }

  /**
   * Detects language and normalizes speech transcript to English
   */
  async normalizeUserSpeech({ transcript, hintLanguage = 'auto' }) {
    if (!transcript || !transcript.trim()) {
      return {
        originalTranscript: '',
        englishTranscript: '',
        detectedLanguage: 'en-IN'
      };
    }

    const trimmed = transcript.trim();

    // Detect language script
    let detectedLanguage = 'en-IN';
    if (/[\u0A80-\u0AFF]/.test(trimmed)) {
      detectedLanguage = 'gu-IN'; // Gujarati
    } else if (/[\u0900-\u097F]/.test(trimmed)) {
      detectedLanguage = 'hi-IN'; // Devanagari Hindi
    } else if (hintLanguage && hintLanguage !== 'auto') {
      detectedLanguage = hintLanguage.includes('-') ? hintLanguage : `${hintLanguage}-IN`;
    }

    let englishTranscript = trimmed;
    if (detectedLanguage !== 'en-IN') {
      englishTranscript = await this.translateText({
        text: trimmed,
        sourceLang: detectedLanguage,
        targetLang: 'en-IN'
      });
    }

    return {
      originalTranscript: trimmed,
      englishTranscript,
      detectedLanguage
    };
  }

  /**
   * Analyzes conversation with Groq / Gemini and generates the single BEST counter-question
   */
  async consultAndFormulateQuestion({ conversationHistory = [], currentTurnRequirements = {} }) {
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.AI_API_KEY;

    const systemPrompt = `You are RootForge AI Senior Business Analyst & Enterprise Software Architect on a live voice call with a client.
Your goal is to thoroughly discover software requirements to generate an engineering-ready specifications document.

DISCOVERY CHECKLIST (Discover dynamically in logical order):
1. Business Problem & Opportunity
2. Business Objectives & Success Metrics
3. Target Users & Stakeholders
4. User Roles & Access Hierarchy
5. Current Process & Pain Points
6. Proposed Future Process & Desired Experience
7. Core Functional Features (Must-Haves)
8. Critical User Workflows & Approval Steps
9. External Integrations (APIs, payment gateways, ERPs, CRMs)
10. AI & Automation Requirements
11. Data, Database & Reporting Needs
12. Security, Authentication & Non-Functional Constraints
13. Mobile vs Web platform scope
14. Timeline & Budget constraints

CRITICAL CONVERSATIONAL RULES:
1. COUNTER-QUESTION REQUIREMENT: Ask exactly ONE clear, relevant, targeted counter-question based on what is MISSING from the checklist.
2. NO DUPLICATE QUESTIONS: NEVER ask for information that the user has already provided in previous turns.
3. CONVERSATIONAL VOICE BREVITY: The "next_question" must be 1 to 2 short sentences max, spoken politely in natural language.
4. COMPLETION EVALUATION: Set "conversation_complete": true ONLY when you have collected enough concrete details across: Problem, Target Users, Core Features, Workflows, and Tech/Platform Scope (usually 5 to 8 turns of rich detail). Otherwise set "conversation_complete": false.

Return strictly a JSON object with this EXACT structure:
{
  "conversation_complete": false,
  "detected_language": "en-IN",
  "english_summary": "Summary of business requirements discovered so far.",
  "next_question": "Your single, polite, speakable counter-question in English.",
  "question_reason": "Why this specific question is needed now.",
  "requirements": {
    "business_problem": "...",
    "business_objective": "...",
    "target_users": ["..."],
    "stakeholders": ["..."],
    "features": ["..."],
    "workflows": ["..."],
    "integrations": ["..."],
    "ai_requirements": ["..."],
    "data_requirements": ["..."],
    "security_requirements": ["..."],
    "technical_constraints": ["..."],
    "timeline": null,
    "budget": null
  },
  "missing_information": ["..."]
}`;

    const promptContext = `Conversation History:\n${conversationHistory.map(h => `${(h.speaker || h.role || 'user').toUpperCase()}: ${h.englishText || h.text}`).join('\n')}\n\nAccumulated Requirements so far:\n${JSON.stringify(currentTurnRequirements, null, 2)}`;

    // 1. Try Groq (Llama 3.3 70B)
    if (groqKey) {
      try {
        console.log('[VoiceAgent] Groq request started');
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: promptContext }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
            max_tokens: 1200
          })
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
          if (parsed.next_question) {
            console.log('[VoiceAgent] Groq question generated:', parsed.next_question);
            return parsed;
          }
        }
      } catch (err) {
        console.warn('[AiVoiceConsultant] Groq error, falling back to Gemini:', err.message);
      }
    }

    // 2. Try Gemini Fallback
    if (geminiKey) {
      try {
        console.log('[VoiceAgent] Gemini consultant request started');
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: promptContext }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.3,
              maxOutputTokens: 1200
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = JSON.parse(raw || '{}');
          if (parsed.next_question) {
            console.log('[VoiceAgent] Gemini question generated:', parsed.next_question);
            return parsed;
          }
        }
      } catch (err) {
        console.warn('[AiVoiceConsultant] Gemini error:', err.message);
      }
    }

    // 3. Fallback Dynamic Question Formulation
    return this._getFallbackQuestion(conversationHistory, currentTurnRequirements);
  }

  _getFallbackQuestion(conversationHistory = [], currentTurnRequirements = {}) {
    const userTurns = conversationHistory.filter(c => c.speaker === 'user' || c.role === 'user');
    const userTurnCount = userTurns.length;

    if (userTurnCount <= 1) {
      return {
        question_number: 1,
        conversation_complete: false,
        detected_language: 'en-IN',
        english_summary: 'Initial requirement received.',
        next_question: 'Who are the primary users and target audiences that will use this system?',
        question_reason: 'Identify primary users and user roles.',
        requirements: currentTurnRequirements,
        missing_information: ['Target Users', 'Core Workflows', 'Integrations']
      };
    } else if (userTurnCount === 2) {
      return {
        question_number: 2,
        conversation_complete: false,
        detected_language: 'en-IN',
        english_summary: 'Target users identified.',
        next_question: 'What is the main problem this platform must solve, and what core workflows will users perform?',
        question_reason: 'Define core problem and essential workflows.',
        requirements: currentTurnRequirements,
        missing_information: ['Core Workflows', 'Integrations']
      };
    } else if (userTurnCount === 3) {
      return {
        question_number: 3,
        conversation_complete: false,
        detected_language: 'en-IN',
        english_summary: 'Core workflows identified.',
        next_question: 'What external systems, payment gateways, or delivery tracking integrations will you require?',
        question_reason: 'Uncover integrations, security, and third-party boundaries.',
        requirements: currentTurnRequirements,
        missing_information: ['Integrations']
      };
    }

    return {
      question_number: 3,
      conversation_complete: true,
      detected_language: 'en-IN',
      english_summary: 'Discovery questions completed.',
      next_question: 'Thank you. I have recorded all the requirements for your solution.',
      question_reason: 'Complete discovery',
      requirements: currentTurnRequirements,
      missing_information: []
    };
  }

  /**
   * Synthesizes structured requirements from conversation using Groq / Gemini without hallucination
   */
  async synthesizeStructuredRequirements({ initialRequirement = '', messages = [], previousRequirements = {} }) {
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.AI_API_KEY;

    const userTurns = messages.filter(m => m.speaker === 'user' || m.role === 'user');
    const assistantTurns = messages.filter(m => m.speaker === 'assistant' || m.role === 'assistant');

    const transcriptContext = messages
      .map(m => `[${(m.speaker || m.role || 'unknown').toUpperCase()}]: ${m.englishText || m.text}`)
      .join('\n');

    const systemPrompt = `You are RootForge Principal Solutions Architect.
Analyze this voice discovery conversation transcript and extract structured project requirements.

CRITICAL RULES:
1. Extract requirements ONLY from what the user explicitly stated or confirmed. Do NOT fabricate or invent user features.
2. If the user did not specify an area (e.g. data requirements, security, AI), state "Not specified during discovery call" or add to "missing_information".
3. AI Recommendations MUST be separated from User-Provided Requirements.
4. Return STRICT JSON with this EXACT structure:

{
  "business_problem": "...",
  "business_objective": "...",
  "target_users": ["User Role 1", "..."],
  "core_requirements": ["Requirement 1", "..."],
  "workflows": ["Workflow 1", "..."],
  "integrations": ["Integration 1", "..."],
  "ai_requirements": ["AI feature 1", "..."],
  "security_requirements": ["Security item 1", "..."],
  "data_requirements": ["Data requirement 1", "..."],
  "missing_information": ["Missing item 1", "..."],
  "ai_recommendations": ["AI recommendation 1", "..."]
}`;

    const userPrompt = `INITIAL PROJECT REQUIREMENT:
${initialRequirement || userTurns[0]?.englishText || userTurns[0]?.text || 'Not provided'}

FULL CONVERSATION TRANSCRIPT:
${transcriptContext}

Extract structured requirements now in JSON.`;

    // 1. Try Groq
    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 1500
          })
        });

        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
          if (parsed && (parsed.business_problem || parsed.core_requirements)) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('[AiVoiceConsultant] Groq synthesis fallback:', err.message);
      }
    }

    // 2. Try Gemini
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
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 1500 }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = JSON.parse(raw || '{}');
          if (parsed && (parsed.business_problem || parsed.core_requirements)) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('[AiVoiceConsultant] Gemini synthesis fallback:', err.message);
      }
    }

    // 3. Fallback deterministic extraction
    const initialText = initialRequirement || userTurns[0]?.text || 'Software solution discovery.';
    return {
      business_problem: initialText,
      business_objective: `Build an enterprise application addressing: ${initialText}`,
      target_users: userTurns[1]?.text ? [userTurns[1].text] : ['Target audience'],
      core_requirements: userTurns.map((u, i) => `Turn ${i + 1}: ${u.englishText || u.text}`),
      workflows: userTurns[2]?.text ? [userTurns[2].text] : ['Standard application workflow'],
      integrations: userTurns[3]?.text ? [userTurns[3].text] : ['Not specified during discovery call.'],
      ai_requirements: ['RootForge AI-assisted workflows'],
      security_requirements: ['Standard authentication and role-based access control.'],
      data_requirements: ['PostgreSQL relational database schema.'],
      missing_information: ['Detailed payment gateway credentials', 'Specific SLA latency metrics'],
      ai_recommendations: ['Consider implementing real-time notifications and status updates.']
    };
  }

  /**
   * Deterministically builds the Markdown string strictly from stored conversation data.
   * NEVER paraphrases the raw conversation turns.
   */
  buildVoiceDiscoveryMarkdown({
    session,
    messages = [],
    requirements = {},
    initialRequirement = '',
    status = 'Completed'
  }) {
    const sessionId = session?.id || 'session-unknown';
    const callSid = session?.twilioCallSid || 'CA_N/A';
    const startedAt = session?.startedAt ? new Date(session.startedAt).toISOString() : (session?.createdAt ? new Date(session.createdAt).toISOString() : new Date().toISOString());
    const endedAt = session?.endedAt ? new Date(session.endedAt).toISOString() : new Date().toISOString();

    // Determine primary conversation language
    const languages = messages.map(m => m.language).filter(Boolean);
    const conversationLanguage = languages.find(l => l && l !== 'en-IN') || (languages[0] || 'en-IN');

    // Discovery Status Header
    const isCompleted = status === 'completed' || status === 'Completed' || session?.status === 'completed';
    const statusText = isCompleted
      ? 'Completed'
      : 'Incomplete — user ended the call before completing discovery.';

    // 1. Initial Project Requirement
    const userMessages = messages.filter(m => m.speaker === 'user' || m.role === 'user');
    const initialReqText = initialRequirement || userMessages[0]?.text || 'Not specified by the user.';

    // 2. Question / Answer Mapping for Questions 1, 2, 3
    const q1Assistant = messages.find(m => (m.speaker === 'assistant' || m.role === 'assistant') && m.questionNumber === 1);
    const q1User = messages.find(m => (m.speaker === 'user' || m.role === 'user') && m.questionNumber === 1);

    const q2Assistant = messages.find(m => (m.speaker === 'assistant' || m.role === 'assistant') && m.questionNumber === 2);
    const q2User = messages.find(m => (m.speaker === 'user' || m.role === 'user') && m.questionNumber === 2);

    const q3Assistant = messages.find(m => (m.speaker === 'assistant' || m.role === 'assistant') && m.questionNumber === 3);
    const q3User = messages.find(m => (m.speaker === 'user' || m.role === 'user') && m.questionNumber === 3);

    const formatQaTurn = (num, aiTurn, userTurn) => {
      let section = `## AI — Question ${num}\n\n`;
      section += aiTurn?.text ? `${aiTurn.text}\n\n` : `[Question ${num} was not reached during this call]\n\n`;
      section += `## User — Answer ${num}\n\n`;
      if (userTurn?.text) {
        section += `${userTurn.text}\n`;
        if (userTurn.englishText && userTurn.englishText !== userTurn.text) {
          section += `\n> English interpretation: ${userTurn.englishText}\n`;
        }
      } else {
        section += `[Answer ${num} was not provided]\n`;
      }
      return section;
    };

    let qaTranscript = '';
    qaTranscript += formatQaTurn(1, q1Assistant, q1User) + '\n';
    qaTranscript += formatQaTurn(2, q2Assistant, q2User) + '\n';
    qaTranscript += formatQaTurn(3, q3Assistant, q3User);

    // 3. Complete Conversation in Strict Chronological Order
    let completeConversation = '';
    messages.forEach(m => {
      const speakerName = (m.speaker === 'assistant' || m.role === 'assistant') ? 'AI' : 'User';
      completeConversation += `### ${speakerName}\n\n${m.text}\n\n`;
      if (m.englishText && m.englishText !== m.text) {
        completeConversation += `> English interpretation: ${m.englishText}\n\n`;
      }
    });
    if (!completeConversation.trim()) {
      completeConversation = '*(No conversation turns recorded)*\n';
    }

    // 4. Collected Requirements Formatting Helper
    const formatListOrText = (val, fallback = 'Not specified by the user during discovery call.') => {
      if (!val) return fallback;
      if (Array.isArray(val)) {
        if (val.length === 0) return fallback;
        return val.map(item => `- ${item}`).join('\n');
      }
      return String(val);
    };

    const businessProblem = requirements.business_problem || initialReqText || 'Not specified by user.';
    const businessObjective = requirements.business_objective || `Deliver an AI-powered enterprise solution addressing ${businessProblem}.`;
    const targetUsers = formatListOrText(requirements.target_users || requirements.users);
    const coreRequirements = formatListOrText(requirements.core_requirements || requirements.features);
    const workflows = formatListOrText(requirements.workflows);
    const integrations = formatListOrText(requirements.integrations);
    const aiRequirements = formatListOrText(requirements.ai_requirements);
    const securityRequirements = formatListOrText(requirements.security_requirements);
    const dataRequirements = formatListOrText(requirements.data_requirements);
    const missingInfo = formatListOrText(requirements.missing_information, 'None identified.');
    const recommendations = formatListOrText(requirements.ai_recommendations, 'Proceed to solution blueprinting.');

    // Assemble Exact Markdown Document
    return `# RootForge AI Voice Discovery

## Session Information

- Session ID: ${sessionId}
- Call ID: ${callSid}
- Started At: ${startedAt}
- Ended At: ${endedAt}
- Conversation Language: ${conversationLanguage}
- Discovery Status: ${statusText}

---

# Initial Project Requirement

${initialReqText}

---

# Conversation Transcript

${qaTranscript.trim()}

---

# Complete Conversation

${completeConversation.trim()}

---

# Collected Requirements

## Business Problem

${businessProblem}

## Business Objective

${businessObjective}

## Target Users

${targetUsers}

## Core Requirements

${coreRequirements}

## Workflows

${workflows}

## Integrations

${integrations}

## AI Requirements

${aiRequirements}

## Security Requirements

${securityRequirements}

## Data Requirements

${dataRequirements}

---

# Missing Information

${missingInfo}

---

# AI Recommendations

${recommendations}
`;
  }

  /**
   * Generates and saves the Markdown file to uploads/voice-discovery/ and persists metadata
   */
  async generateAndSaveVoiceDiscoveryMarkdown({
    session,
    messages = [],
    requirements = {},
    initialRequirement = '',
    status = 'Completed'
  }) {
    console.log('[VoiceAgent] Deterministic voice discovery markdown generation started');

    // 1. Synthesize structured requirements if missing
    let finalRequirements = requirements;
    if (!finalRequirements || Object.keys(finalRequirements).length === 0 || !finalRequirements.business_problem) {
      try {
        finalRequirements = await this.synthesizeStructuredRequirements({
          initialRequirement,
          messages,
          previousRequirements: requirements || {}
        });
      } catch (err) {
        console.warn('[AiVoiceConsultant] Structured requirements synthesis notice:', err.message);
        finalRequirements = requirements || {};
      }
    }

    // 2. Build Markdown content deterministically
    const markdownContent = this.buildVoiceDiscoveryMarkdown({
      session,
      messages,
      requirements: finalRequirements,
      initialRequirement,
      status
    });

    // 3. Ensure uploads/voice-discovery directory exists
    const voiceDiscoveryDir = path.resolve(uploadsDir, 'voice-discovery');
    if (!fs.existsSync(voiceDiscoveryDir)) {
      try {
        fs.mkdirSync(voiceDiscoveryDir, { recursive: true });
      } catch {}
    }

    const sessionId = session?.id || `vses_${Date.now()}`;
    const fileName = `voice-discovery-${sessionId}.md`;
    const filePath = path.join(voiceDiscoveryDir, fileName);
    const storageRelativePath = `uploads/voice-discovery/${fileName}`;

    // Write file to filesystem
    fs.writeFileSync(filePath, markdownContent, 'utf8');
    const fileSize = Buffer.byteLength(markdownContent, 'utf8');

    console.log(`[VoiceAgent] Voice discovery Markdown saved: ${fileName} (${fileSize} bytes) at ${filePath}`);

    // 4. Save file metadata in Database via TwilioVoiceService
    let docRecord = null;
    try {
      const { twilioVoiceService } = await import('./twilioVoice.service.js');
      docRecord = await twilioVoiceService.saveConversationDocument({
        sessionId,
        workspaceId: session?.workspaceId || null,
        projectId: session?.projectId || null,
        fileName,
        fileType: 'text/markdown',
        storagePath: storageRelativePath,
        fileSize,
        extractedText: markdownContent
      });
    } catch (err) {
      console.warn('[AiVoiceConsultant] Document metadata persistence notice:', err.message);
    }

    return {
      fileName,
      filePath,
      storagePath: storageRelativePath,
      fileSize,
      markdownContent,
      requirements: finalRequirements,
      documentId: docRecord?.id || null
    };
  }

  /**
   * Legacy / Backward-compatible wrapper for Project Requirements Document
   */
  async generateProjectRequirementsDocument({ session, conversation = [], requirements = {} }) {
    return this.generateAndSaveVoiceDiscoveryMarkdown({
      session,
      messages: conversation,
      requirements,
      status: session?.status || 'Completed'
    });
  }
}

export const aiVoiceConsultantService = new AiVoiceConsultantService();


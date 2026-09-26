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

    const promptContext = `Conversation History:\n${conversationHistory.map(h => `${h.role.toUpperCase()}: ${h.englishText || h.text}`).join('\n')}\n\nAccumulated Requirements so far:\n${JSON.stringify(currentTurnRequirements, null, 2)}`;

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
    const lastUserTurn = conversationHistory.filter(c => c.role === 'user').slice(-1)[0]?.text || '';
    return {
      conversation_complete: conversationHistory.filter(c => c.role === 'user').length >= 6,
      detected_language: 'en-IN',
      english_summary: 'User requirements gathered in progress.',
      next_question: `Understood regarding ${lastUserTurn.slice(0, 30)}. What are the top three core features your users will interact with daily?`,
      question_reason: 'Discover core functional features',
      requirements: currentTurnRequirements,
      missing_information: ['Core Features', 'Integrations']
    };
  }

  /**
   * Builds formatted Verbatim Conversation Transcript Markdown section
   */
  buildConversationTranscriptMarkdown({ session, conversation = [], detectedLanguage = 'en-IN' }) {
    if (!conversation || conversation.length === 0) {
      return `## 💬 Voice Discovery Call Conversation Transcript\n\n*No conversation turns were recorded for this voice session.*`;
    }

    const startTime = session?.startedAt || session?.createdAt || new Date();
    const dateFormatted = new Date(startTime).toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    let md = `## 💬 Complete Call Conversation Transcript (Verbatim Dialogue)\n\n`;
    md += `> **Discovery Call Session Telemetry:**\n`;
    md += `> - **Session ID:** \`${session?.id || 'N/A'}\`\n`;
    md += `> - **Call Date & Time:** ${dateFormatted} (IST)\n`;
    md += `> - **Primary Detected Language:** \`${detectedLanguage}\`\n`;
    md += `> - **Total Dialogue Turns:** ${conversation.length}\n`;
    md += `> - **Channel:** Twilio Outbound Voice AI Gateway\n\n`;

    md += `### 📊 Dialogue Turn Summary Table\n\n`;
    md += `| Turn | Timestamp | Speaker | Native Spoken Speech | English Interpretation / Meaning |\n`;
    md += `|:---:|:---|:---|:---|:---|\n`;

    conversation.forEach((turn, idx) => {
      const turnNum = idx + 1;
      const roleLabel = turn.role === 'assistant' ? '🤖 RootForge AI Consultant' : '👤 Client / User';
      const timeStr = turn.timestamp
        ? new Date(turn.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })
        : `+${idx * 12}s`;
      const originalText = (turn.text || '').replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim();
      const englishText = (turn.englishText || turn.text || '').replace(/\n+/g, ' ').replace(/\|/g, '\\|').trim();
      md += `| **${turnNum}** | ${timeStr} | **${roleLabel}** | ${originalText} | ${englishText} |\n`;
    });

    md += `\n### 🎙️ Detailed Verbatim Turn-by-Turn Dialogue Log\n\n`;

    conversation.forEach((turn, idx) => {
      const turnNum = idx + 1;
      const isAI = turn.role === 'assistant';
      const speakerBadge = isAI ? '🤖 RootForge AI Consultant' : '👤 Client / User';
      const timeStr = turn.timestamp
        ? new Date(turn.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })
        : `+${idx * 12}s`;

      md += `#### Turn ${turnNum} — ${speakerBadge}\n`;
      md += `*Timestamp: ${timeStr}*\n\n`;

      if (isAI) {
        md += `> **Consultant Spoken Audio:**\n`;
        md += `> "${turn.text || turn.englishText || ''}"\n\n`;
      } else {
        md += `> **User Spoken Transcript (Native):**\n`;
        md += `> "${turn.text || ''}"\n>\n`;
        if (turn.englishText && turn.englishText !== turn.text) {
          md += `> **Normalized English Translation:**\n`;
          md += `> "${turn.englishText}"\n>\n`;
        }
        if (turn.language) {
          md += `> *Language Detected: \`${turn.language}\`*\n\n`;
        } else {
          md += `\n`;
        }
      }
    });

    return md;
  }

  /**
   * Generates complete Project Requirements Markdown Document containing:
   * 1. Discovery Call Telemetry & Metadata
   * 2. Complete Verbatim Conversation Transcript
   * 3. 28-Section Architecture Blueprint & Requirements Specification
   */
  async generateProjectRequirementsDocument({ session, conversation = [], requirements = {} }) {
    console.log('[VoiceAgent] Markdown generation started');
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.AI_API_KEY;

    let effectiveConversation = [...conversation];
    if (effectiveConversation.length <= 1 && session?.id && prisma?.voiceSession) {
      try {
        const dbSession = await prisma.voiceSession.findUnique({
          where: { id: session.id },
          select: { conversationJson: true, requirementsJson: true }
        });
        if (dbSession?.conversationJson) {
          const parsed = JSON.parse(dbSession.conversationJson);
          if (Array.isArray(parsed) && parsed.length > effectiveConversation.length) {
            effectiveConversation = parsed;
          }
        }
        if (dbSession?.requirementsJson && Object.keys(requirements).length === 0) {
          try {
            requirements = JSON.parse(dbSession.requirementsJson);
          } catch {}
        }
      } catch {}
    }

    const detectedLang = effectiveConversation.find(c => c.language)?.language || 'en-IN';
    const transcriptText = effectiveConversation.map(c => `[${c.role.toUpperCase()} - ${c.timestamp || ''}]: ${c.englishText || c.text}`).join('\n');

    const prompt = `You are the Principal Solutions Architect at RootForge.
Generate a comprehensive, production-grade 28-Section "Project Requirements Document" in pure Markdown format based on this Discovery Voice Call transcript and gathered requirements.

RULES:
- Do NOT invent or hallucinate information. If the user did not specify something, state: "Not specified by the user during discovery call."
- Clearly distinguish between user-confirmed requirements, AI-derived architectural recommendations, and open assumptions.
- Use clean GitHub-flavored Markdown with tables and bullet points.

MUST CONTAIN ALL 28 SECTIONS IN THIS EXACT ORDER:
## 1. Project Overview
## 2. Business Problem
## 3. Business Objectives & Success Metrics
## 4. Target Users & Personas
## 5. Stakeholders
## 6. User Roles & Permissions
## 7. Current Process & Baseline
## 8. Current Pain Points
## 9. Proposed Future Process (Target State)
## 10. Functional Requirements
## 11. Core Features & Capabilities
## 12. User Workflows & Journey Maps
## 13. AI & Intelligent Automation Requirements
## 14. Automation Opportunities
## 15. Integration Requirements (APIs, ERP, CRM, Payment, Third-Party)
## 16. Data Requirements & Entities
## 17. Database & Storage Architecture
## 18. Authentication & Authorization (RBAC / SSO)
## 19. Security, Privacy & Compliance Requirements
## 20. Non-Functional Requirements (Performance, Latency, Scalability)
## 21. UI/UX Requirements & Interaction Design
## 22. Reporting, Dashboards & Analytics
## 23. Technical Constraints & Platform Choices
## 24. Deployment & Infrastructure Requirements
## 25. Expected Business Outcomes & ROI
## 26. Open Questions & Items Requiring Clarification
## 27. Assumptions
## 28. Implementation Recommendations & Next Steps

TRANSCRIPT & DISCOVERED DATA:
${transcriptText}

STRUCTURED DATA:
${JSON.stringify(requirements, null, 2)}`;

    let synthesizedSections = '';

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
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 4000
          })
        });

        if (res.ok) {
          const data = await res.json();
          synthesizedSections = data.choices?.[0]?.message?.content?.trim() || '';
        }
      } catch (err) {
        console.warn('[AiVoiceConsultant] Groq doc generation fallback:', err.message);
      }
    }

    // 2. Try Gemini Fallback
    if (!synthesizedSections && geminiKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4000 }
          })
        });

        if (res.ok) {
          const data = await res.json();
          synthesizedSections = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        }
      } catch (err) {
        console.warn('[AiVoiceConsultant] Gemini doc generation fallback:', err.message);
      }
    }

    if (!synthesizedSections) {
      synthesizedSections = `## 1. Project Overview\nBased on discovery call session ${session?.id || ''}.\n\n## 2. Business Problem\n${requirements.business_problem || 'Discovered during voice call consultation.'}\n\n## 3. Core Features\n${Array.isArray(requirements.features) ? requirements.features.map(f => `- ${f}`).join('\n') : '- Core functionality specified during voice discovery.'}\n\n## 4. Technical Constraints\n${Array.isArray(requirements.technical_constraints) ? requirements.technical_constraints.map(c => `- ${c}`).join('\n') : '- Standard cloud architecture.'}`;
    }

    // 3. Build Transcript Markdown Section
    const transcriptSection = this.buildConversationTranscriptMarkdown({
      session,
      conversation: effectiveConversation,
      detectedLanguage: detectedLang
    });

    const nowFormatted = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    // 4. Combine into complete Markdown document
    const fullMarkdownContent = `# 🎙️ RootForge Discovery Call Specification & Requirements Document
**Project Objective:** ${requirements.business_objective || requirements.business_problem || 'Enterprise AI Solution Discovery'}  
**Workspace ID:** \`${session?.workspaceId || 'default-workspace'}\`  
**Session ID:** \`${session?.id || 'vses-live'}\`  
**Generated On:** ${nowFormatted} (IST)  
**Status:** ✅ Discovery Completed & Document Saved to Workspace  

---

${transcriptSection}

---

## 🏛️ Synthesized Business Architecture & 28-Section Requirements Blueprint

${synthesizedSections}
`;

    // 5. Save Markdown file to uploads directory
    const workspacePrefix = session?.workspaceId || 'workspace';
    const fileName = `${workspacePrefix}-${session?.id || Date.now()}-project-requirements.md`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, fullMarkdownContent, 'utf8');
    const fileSize = Buffer.byteLength(fullMarkdownContent, 'utf8');

    console.log(`[VoiceAgent] Markdown generated and saved: ${fileName} (${fileSize} bytes)`);

    // 6. Register Document in Prisma PostgreSQL Database for the Workspace
    let documentRecord = null;
    try {
      if (prisma?.document) {
        // Validate or resolve workspace ID in PostgreSQL
        let targetWorkspaceId = session?.workspaceId;
        if (targetWorkspaceId) {
          try {
            const wsExists = await prisma.workspace.findUnique({
              where: { id: targetWorkspaceId },
              select: { id: true, name: true }
            });
            if (!wsExists) targetWorkspaceId = null;
          } catch {
            targetWorkspaceId = null;
          }
        }

        // If no explicit workspace, find first existing workspace in DB
        if (!targetWorkspaceId) {
          try {
            const firstWs = await prisma.workspace.findFirst({
              select: { id: true }
            });
            if (firstWs) targetWorkspaceId = firstWs.id;
          } catch {}
        }

        if (targetWorkspaceId) {
          // Check if document already exists for this filename
          const existingDoc = await prisma.document.findFirst({
            where: {
              workspaceId: targetWorkspaceId,
              filename: fileName
            }
          });

          if (existingDoc) {
            documentRecord = await prisma.document.update({
              where: { id: existingDoc.id },
              data: {
                fileSize,
                status: 'ANALYZED',
                extractedText: fullMarkdownContent,
                updatedAt: new Date()
              }
            });
            console.log(`[VoiceAgent] Updated existing Document in Workspace ${targetWorkspaceId}: ${documentRecord.id}`);
          } else {
            documentRecord = await prisma.document.create({
              data: {
                workspaceId: targetWorkspaceId,
                filename: fileName,
                originalName: `Voice-Discovery-Requirements-${(session?.id || 'live').slice(-6)}.md`,
                fileType: 'text/markdown',
                fileSize,
                status: 'ANALYZED',
                extractedText: fullMarkdownContent
              }
            });
            console.log(`[VoiceAgent] Created new Document in Workspace ${targetWorkspaceId}: ${documentRecord.id}`);
          }

          // Optional: Record Activity Log for the Workspace
          try {
            if (prisma?.activityLog) {
              await prisma.activityLog.create({
                data: {
                  workspaceId: targetWorkspaceId,
                  action: 'VOICE_DISCOVERY_DOCUMENT_CREATED',
                  entityType: 'DOCUMENT',
                  entityId: documentRecord.id,
                  description: `Voice Discovery Requirements Document created with full call transcript (${conversation.length} dialogue turns).`
                }
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[AiVoiceConsultant] Document registration notice:', err.message);
    }

    return {
      fileName,
      filePath,
      fileSize,
      markdownContent: fullMarkdownContent,
      documentId: documentRecord?.id || null
    };
  }
}

export const aiVoiceConsultantService = new AiVoiceConsultantService();

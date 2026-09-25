/**
 * Enterprise Conversational Voice Webhook & TwiML Generator
 * 
 * Flow:
 * 1. User answers -> Returns <Gather input="speech"> with AI greeting.
 * 2. User speaks -> POST /api/voice/process-speech receives SpeechResult.
 * 3. AI Consultant analyzes speech -> Returns next follow-up question inside <Gather>.
 * 4. Call stays connected until user says goodbye or hangs up.
 */

import twilio from 'twilio';
import { twilioVoiceService } from './twilioVoice.service.js';

// In-Memory conversation turns cache: sessionIdOrCallSid -> Array of { role, text, timestamp }
const sessionConversations = new Map();

export class VoiceWebhookService {
  constructor() {
    this.name = 'voice-webhook-service';
  }

  /**
   * Helper to get base public URL
   */
  getBaseUrl() {
    const rawBaseUrl = process.env.PUBLIC_BASE_URL ||
      process.env.TWILIO_WEBHOOK_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'https://rootforge.onrender.com';
    return rawBaseUrl.replace(/\/+$/, '');
  }

  /**
   * Reusable helper to generate Conversational TwiML that waits for user speech.
   * NEVER hangs up after speaking.
   */
  buildListeningTwiML(message, options = {}) {
    const baseUrl = this.getBaseUrl();
    const actionUrl = options.actionUrl || `${baseUrl}/api/voice/process-speech`;
    const redirectUrl = options.redirectUrl || `${baseUrl}/api/voice/incoming`;
    const timeout = options.timeout || 8;
    const speechTimeout = options.speechTimeout || 'auto';

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    const gather = response.gather({
      input: 'speech',
      action: actionUrl,
      method: 'POST',
      speechTimeout: speechTimeout,
      timeout: timeout
    });

    gather.say(
      {
        voice: 'Polly.Aditi',
        language: 'en-IN'
      },
      message
    );

    // Fallback if user stays silent during Gather timeout
    response.say(
      {
        voice: 'Polly.Aditi',
        language: 'en-IN'
      },
      "I didn't hear your response. Please tell me about your requirement."
    );

    response.redirect(
      {
        method: 'POST'
      },
      redirectUrl
    );

    return response.toString();
  }

  /**
   * Generates the initial conversational greeting with <Gather input="speech">
   */
  async generateIncomingTwiML({ callSid = null, sessionId = null, toPhone = null }) {
    const initialGreeting = 'Hello! Welcome to RootForge AI Business Consultant. I will help you understand your business requirements. Please tell me about your business idea or the main problem you want to solve.';

    // Initialize conversation history
    const sessionKey = sessionId || callSid || toPhone || 'default';
    sessionConversations.set(sessionKey, [
      {
        role: 'assistant',
        text: initialGreeting,
        timestamp: new Date().toISOString()
      }
    ]);

    // Update DB status asynchronously
    (async () => {
      try {
        let session = null;
        if (sessionId) session = await twilioVoiceService.getSession(sessionId);
        if (!session && callSid) session = await twilioVoiceService.getSession(callSid);
        if (!session && toPhone) session = await twilioVoiceService.getSession(toPhone);

        if (session) {
          await twilioVoiceService.updateSession(session.id, {
            twilioCallSid: callSid || session.twilioCallSid,
            status: 'active',
            connectedAt: new Date()
          });
        }
      } catch (err) {
        console.warn('[VoiceWebhook] Non-blocking session update notice:', err.message);
      }
    })();

    return this.buildListeningTwiML(initialGreeting);
  }

  /**
   * Generates a conversational AI response using Groq, Gemini, or Contextual Consultant
   */
  async generateAiConsultantReply(userTranscript, history = []) {
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.AI_API_KEY;

    const systemPrompt = `You are RootForge AI Business Consultant speaking on a live phone call with a client.
Your goal is to gather software and business requirements to build their technical architecture.
RULES FOR VOICE:
1. Speak in natural, polite English.
2. Keep responses EXTREMELY CONCISE (1 to 2 short sentences maximum).
3. Acknowledge what they said, then ask one focused follow-up question (e.g. about users, key features, mobile vs web, database, or scale).
4. NEVER use markdown, bullet points, asterisks, or formatting. Only plain speakable text.`;

    // 1. Try Groq (Ultra-fast LLM response)
    if (groqKey) {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-4).map(h => ({ role: h.role, content: h.text })),
          { role: 'user', content: userTranscript }
        ];

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.4,
            max_tokens: 120
          })
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) return reply.replace(/[\*\#\_]/g, '');
        }
      } catch (err) {
        console.warn('[VoiceWebhook] Groq request fallback:', err.message);
      }
    }

    // 2. Try Google Gemini
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
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [
              ...history.slice(-4).map(h => ({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.text }]
              })),
              {
                role: 'user',
                parts: [{ text: userTranscript }]
              }
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 120
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (reply) return reply.replace(/[\*\#\_]/g, '');
        }
      } catch (err) {
        console.warn('[VoiceWebhook] Gemini request fallback:', err.message);
      }
    }

    // 3. Fallback Dynamic Consultant
    const lower = userTranscript.toLowerCase();
    if (lower.includes('grocery') || lower.includes('delivery') || lower.includes('food') || lower.includes('ecommerce') || lower.includes('shop')) {
      return "That sounds like an impactful platform. Who are your primary target users, and do you need a customer mobile app or a vendor web dashboard first?";
    } else if (lower.includes('app') || lower.includes('mobile') || lower.includes('website') || lower.includes('platform')) {
      return "Understood. What are the top two or three core features your users will need on day one?";
    } else if (lower.includes('ai') || lower.includes('bot') || lower.includes('automate')) {
      return "Excellent. What existing tools or data sources will this AI system need to integrate with?";
    }

    return `I heard your idea about ${userTranscript.slice(0, 40)}. What is the most critical workflow you want RootForge to design first?`;
  }

  /**
   * Handles user speech received from Twilio <Gather>
   */
  async processSpeech({ callSid, speechResult, confidence = 1, from = null, to = null, sessionId = null }) {
    console.log('[TwilioVoiceService] Speech received');
    console.log(`[TwilioVoiceService] CallSid: ${callSid || 'UNKNOWN'}`);
    console.log(`[TwilioVoiceService] Transcript: ${speechResult || '(silence)'}`);

    const VoiceResponse = twilio.twiml.VoiceResponse;

    // Handle silence / no speech detected
    if (!speechResult || !speechResult.trim()) {
      return this.buildListeningTwiML("I didn't hear your response. Please tell me about your business requirement.");
    }

    const trimmedSpeech = speechResult.trim();
    const lowerSpeech = trimmedSpeech.toLowerCase();

    // Check for conversational exit / goodbye
    const isGoodbye = /\b(bye|goodbye|exit|end call|stop call|hang up|that's all|that is all|thank you bye)\b/i.test(lowerSpeech);

    if (isGoodbye) {
      console.log('[TwilioVoiceWebhook] User requested call completion. Ending session gracefully.');
      const response = new VoiceResponse();
      response.say(
        {
          voice: 'Polly.Aditi',
          language: 'en-IN'
        },
        'Thank you for speaking with RootForge AI Business Consultant. Your conversation has been saved. Goodbye!'
      );
      response.hangup();

      // Mark session as completed
      (async () => {
        try {
          const session = await twilioVoiceService.getSession(sessionId || callSid || from);
          if (session) {
            await twilioVoiceService.updateSession(session.id, {
              status: 'completed',
              endedAt: new Date()
            });
          }
        } catch {}
      })();

      return response.toString();
    }

    // Retrieve conversation history
    const sessionKey = sessionId || callSid || from || 'default';
    const history = sessionConversations.get(sessionKey) || [];

    // Append user message to history
    history.push({
      role: 'user',
      text: trimmedSpeech,
      timestamp: new Date().toISOString()
    });

    // Generate next response
    const replyText = await this.generateAiConsultantReply(trimmedSpeech, history);

    // Append assistant response to history
    history.push({
      role: 'assistant',
      text: replyText,
      timestamp: new Date().toISOString()
    });
    sessionConversations.set(sessionKey, history);

    console.log(`[TwilioVoiceService] Next AI Response: "${replyText}"`);

    // Return TwiML that speaks response and waits for user's next answer
    return this.buildListeningTwiML(replyText);
  }

  /**
   * Handles Twilio Status Callback events
   */
  async handleStatusCallback({ callSid, callStatus, duration = 0, error = null, sessionId = null }) {
    console.log(`[VoiceWebhook] Twilio status callback: Call ${callSid?.slice(0, 8) || 'N/A'}... -> status: ${callStatus} (Duration: ${duration}s)`);

    try {
      let session = null;
      if (sessionId) session = await twilioVoiceService.getSession(sessionId);
      if (!session && callSid) session = await twilioVoiceService.getSession(callSid);

      if (!session) return;

      let mappedStatus = session.status;
      let updates = {};

      switch (callStatus?.toLowerCase()) {
        case 'in-progress':
        case 'answered':
          mappedStatus = 'active';
          if (!session.connectedAt) updates.connectedAt = new Date();
          break;
        case 'completed':
          mappedStatus = 'completed';
          updates.endedAt = new Date();
          break;
        case 'busy':
        case 'failed':
        case 'no-answer':
          mappedStatus = 'failed';
          updates.errorMessage = error || `Call ended with status: ${callStatus}`;
          updates.endedAt = new Date();
          break;
        case 'canceled':
          mappedStatus = 'cancelled';
          updates.endedAt = new Date();
          break;
        default:
          break;
      }

      updates.status = mappedStatus;
      await twilioVoiceService.updateSession(session.id, updates);
    } catch (err) {
      console.warn('[VoiceWebhook] Status callback update error:', err.message);
    }
  }
}

export const voiceWebhookService = new VoiceWebhookService();

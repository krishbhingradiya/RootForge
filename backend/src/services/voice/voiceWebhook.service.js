import twilio from 'twilio';
import { twilioVoiceService } from './twilioVoice.service.js';
import { aiVoiceConsultantService } from './aiVoiceConsultant.service.js';

// In-Memory conversation state cache: sessionKey -> { initialRequirement: '', requirements: {}, lastDetectedLanguage: 'en-IN', generatedDoc: null }
const sessionStates = new Map();

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
   * Helper to get or initialize session state
   */
  getSessionState(sessionKey) {
    if (!sessionStates.has(sessionKey)) {
      sessionStates.set(sessionKey, {
        initialRequirement: '',
        requirements: {},
        lastDetectedLanguage: 'en-IN',
        generatedDoc: null
      });
    }
    return sessionStates.get(sessionKey);
  }

  /**
   * Reusable helper to generate Conversational TwiML that waits for user speech.
   * NEVER hangs up after speaking unless explicitly completed.
   */
  buildListeningTwiML(message, options = {}) {
    const baseUrl = this.getBaseUrl();
    const actionUrl = options.actionUrl || `${baseUrl}/api/voice/speech`;
    const redirectUrl = options.redirectUrl || `${baseUrl}/api/voice/twiml`;
    const timeout = options.timeout || 8;
    const speechTimeout = options.speechTimeout || 'auto';
    const language = options.language || 'en-IN';
    const voice = options.voice || 'Polly.Aditi';

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    const gather = response.gather({
      input: 'speech',
      action: actionUrl,
      method: 'POST',
      speechTimeout: speechTimeout,
      timeout: timeout,
      language: language
    });

    gather.say(
      {
        voice: voice,
        language: language
      },
      message
    );

    // Fallback if user stays silent during Gather timeout
    const silencePrompt = language.startsWith('gu')
      ? 'મને તમારો અવાજ સંભળાયો નથી. કૃપા કરીને ફરીથી જણાવો.'
      : language.startsWith('hi')
      ? 'मुझे आपकी आवाज सुनाई नहीं दी। कृपया फिर से बताएं।'
      : "I didn't hear your response. Could you please repeat that?";

    response.say(
      {
        voice: voice,
        language: language
      },
      silencePrompt
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
    console.log('[VoiceAgent] Call started');
    const initialGreeting = 'Hello! Welcome to RootForge AI Business Consultant. I am here to understand your project requirements and design your system. Please tell me about your business idea or the main problem you want to solve.';

    const sessionKey = sessionId || callSid || toPhone || 'default';
    const state = this.getSessionState(sessionKey);

    // Find and update session in DB
    let session = null;
    try {
      if (sessionId) session = await twilioVoiceService.getSession(sessionId);
      if (!session && callSid) session = await twilioVoiceService.getSession(callSid);
      if (!session && toPhone) session = await twilioVoiceService.getSession(toPhone);

      if (session) {
        await twilioVoiceService.updateSession(session.id, {
          twilioCallSid: callSid || session.twilioCallSid,
          status: 'active',
          connectedAt: new Date()
        });

        // 1. Save Greeting Assistant Message turn with sequence 1
        await twilioVoiceService.saveConversationMessage({
          sessionId: session.id,
          speaker: 'assistant',
          text: initialGreeting,
          englishText: initialGreeting,
          language: 'en-IN',
          questionNumber: 0,
          turnId: `assistant_${session.id}_greeting`,
          sequence: 1
        });
      }
    } catch (err) {
      console.warn('[VoiceWebhook] Initial greeting save notice:', err.message);
    }

    return this.buildListeningTwiML(initialGreeting, { language: 'en-IN', voice: 'Polly.Aditi' });
  }

  /**
   * Handles user speech received from Twilio <Gather>
   */
  async processSpeech({ callSid, speechResult, confidence = 1, from = null, to = null, sessionId = null }) {
    console.log('[VoiceAgent] Speech detected');
    console.log(`[VoiceAgent] Twilio stream CallSid: ${callSid || 'UNKNOWN'}`);

    const sessionKey = sessionId || callSid || from || 'default';
    const state = this.getSessionState(sessionKey);

    // Retrieve active session record from DB/memory
    let session = null;
    try {
      if (sessionId) session = await twilioVoiceService.getSession(sessionId);
      if (!session && callSid) session = await twilioVoiceService.getSession(callSid);
      if (!session && from) session = await twilioVoiceService.getSession(from);
    } catch {}

    const currentSessionId = session?.id || sessionKey;

    // Handle silence / no speech detected
    if (!speechResult || !speechResult.trim()) {
      console.log('[VoiceAgent] Silence detected. Prompting user to repeat.');
      const silenceMsg = state.lastDetectedLanguage.startsWith('gu')
        ? 'મને તમારો અવાજ સંભળાયો નથી. કૃપા કરીને તમારી જરૂરિયાત જણાવો.'
        : state.lastDetectedLanguage.startsWith('hi')
        ? 'मुझे आपकी आवाज सुनाई नहीं दी। कृपया अपनी आवश्यकता बताएं।'
        : "Sorry, I didn't hear you clearly. Could you please repeat that?";

      return this.buildListeningTwiML(silenceMsg, {
        language: state.lastDetectedLanguage.startsWith('gu') || state.lastDetectedLanguage.startsWith('hi') ? 'hi-IN' : 'en-IN',
        voice: 'Polly.Aditi'
      });
    }

    const trimmedSpeech = speechResult.trim();
    console.log(`[VoiceAgent] Final transcript received: "${trimmedSpeech}"`);

    // 1. Language Detection & English Normalization
    const normalized = await aiVoiceConsultantService.normalizeUserSpeech({
      transcript: trimmedSpeech,
      hintLanguage: state.lastDetectedLanguage
    });

    state.lastDetectedLanguage = normalized.detectedLanguage || 'en-IN';
    console.log(`[VoiceAgent] Language detected: ${state.lastDetectedLanguage}`);
    console.log(`[VoiceAgent] English normalization completed: "${normalized.englishTranscript}"`);

    // Retrieve previous messages to determine current question stage
    const previousMessages = await twilioVoiceService.getConversationMessages(currentSessionId);
    const existingUserMessages = previousMessages.filter(m => m.speaker === 'user');
    const userTurnCount = existingUserMessages.length + 1; // 1 = Initial requirement, 2 = Answer 1, 3 = Answer 2, 4 = Answer 3

    let questionNumberForUserTurn = 0;
    if (userTurnCount === 1) {
      questionNumberForUserTurn = 0; // Initial Project Requirement
      state.initialRequirement = normalized.englishTranscript || normalized.originalTranscript;
    } else if (userTurnCount === 2) {
      questionNumberForUserTurn = 1; // Answer 1
    } else if (userTurnCount === 3) {
      questionNumberForUserTurn = 2; // Answer 2
    } else if (userTurnCount >= 4) {
      questionNumberForUserTurn = 3; // Answer 3
    }

    // 2. Save USER Message Turn
    const userTurnId = `user_${currentSessionId}_${userTurnCount}`;
    await twilioVoiceService.saveConversationMessage({
      sessionId: currentSessionId,
      speaker: 'user',
      text: normalized.originalTranscript,
      englishText: normalized.englishTranscript,
      language: state.lastDetectedLanguage,
      questionNumber: questionNumberForUserTurn,
      turnId: userTurnId
    });

    // Check for explicit goodbye / call end request
    const lowerEnglish = normalized.englishTranscript.toLowerCase();
    const isGoodbye = /\b(bye|goodbye|exit|end call|stop call|hang up|that's all|that is all|thank you bye|finish call)\b/i.test(lowerEnglish);

    // 3. COMPLETE DISCOVERY if user said goodbye OR if user answered Question 3 (userTurnCount >= 4)
    if (isGoodbye || userTurnCount >= 4) {
      console.log('[VoiceAgent] Discovery complete after all questions or user wrapup.');
      console.log('[VoiceAgent] Conversation completed');

      // Fetch all messages up to this point
      const allMessages = await twilioVoiceService.getConversationMessages(currentSessionId);

      // Synthesize requirements & generate complete deterministic Markdown document
      let docResult = null;
      try {
        docResult = await aiVoiceConsultantService.generateAndSaveVoiceDiscoveryMarkdown({
          session,
          messages: allMessages,
          requirements: state.requirements,
          initialRequirement: state.initialRequirement || allMessages.find(m => m.speaker === 'user')?.text || '',
          status: 'Completed'
        });
        state.generatedDoc = docResult;
      } catch (err) {
        console.warn('[VoiceAgent] Markdown generation notice:', err.message);
      }

      // Final farewell in user's language
      let farewellText = 'Thank you for discussing your project with RootForge AI. Your complete voice discovery conversation and project requirements document have been recorded and saved. Goodbye!';
      if (state.lastDetectedLanguage.startsWith('gu')) {
        farewellText = 'રૂટફોર્જ એઆઈ સાથે વાત કરવા બદલ આભાર. તમારી સંપૂર્ણ વાતચીત અને રિક્વાયરમેન્ટ ફાઇલ સેવ થઈ ગઈ છે. આવજો!';
      } else if (state.lastDetectedLanguage.startsWith('hi')) {
        farewellText = 'रूटफोर्ज एआई से बात करने के लिए धन्यवाद। आपकी बातचीत और आवश्यकताएं सुरक्षित कर ली गई हैं। धन्यवाद और अलविदा!';
      }

      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say(
        {
          voice: 'Polly.Aditi',
          language: state.lastDetectedLanguage.startsWith('gu') || state.lastDetectedLanguage.startsWith('hi') ? 'hi-IN' : 'en-IN'
        },
        farewellText
      );
      response.hangup();

      if (session) {
        (async () => {
          try {
            await twilioVoiceService.updateSession(session.id, {
              status: 'completed',
              endedAt: new Date()
            });
          } catch {}
        })();
      }

      return response.toString();
    }

    // 4. Formulate the EXACT Next Question (Q1, Q2, or Q3)
    const nextQuestionNumber = userTurnCount; // If user just gave initial requirement (userTurnCount=1), next is Q1; if answered Q1 (userTurnCount=2), next is Q2; if answered Q2 (userTurnCount=3), next is Q3.
    console.log(`[VoiceAgent] Formulating Question ${nextQuestionNumber} of 3`);

    const updatedMessages = await twilioVoiceService.getConversationMessages(currentSessionId);
    let consultResult = null;
    try {
      consultResult = await aiVoiceConsultantService.consultAndFormulateQuestion({
        conversationHistory: updatedMessages,
        currentTurnRequirements: state.requirements
      });
    } catch (err) {
      console.warn('[VoiceAgent] Consultant reasoning fallback:', err.message);
      consultResult = aiVoiceConsultantService._getFallbackQuestion(updatedMessages, state.requirements);
    }

    if (consultResult.requirements) {
      state.requirements = {
        ...state.requirements,
        ...consultResult.requirements
      };
    }

    const englishQuestion = consultResult.next_question || (
      nextQuestionNumber === 1 ? 'Who are the primary users and target audience for this platform?' :
      nextQuestionNumber === 2 ? 'What is the main problem this platform must solve for them?' :
      'What external systems, payment processors, or delivery integrations will you need?'
    );

    let localizedQuestion = englishQuestion;
    if (state.lastDetectedLanguage.startsWith('gu') || state.lastDetectedLanguage.startsWith('hi')) {
      try {
        localizedQuestion = await aiVoiceConsultantService.translateText({
          text: englishQuestion,
          sourceLang: 'en-IN',
          targetLang: state.lastDetectedLanguage
        });
      } catch (err) {
        console.warn('[VoiceAgent] Question localization notice:', err.message);
        localizedQuestion = englishQuestion;
      }
    }

    // 5. IMPORTANT (Requirement 2): SAVE THE EXACT SPOKEN AI TEXT BEFORE SENDING TO TTS
    const assistantTurnId = `assistant_${currentSessionId}_q${nextQuestionNumber}`;
    await twilioVoiceService.saveConversationMessage({
      sessionId: currentSessionId,
      speaker: 'assistant',
      text: localizedQuestion,
      englishText: englishQuestion,
      language: state.lastDetectedLanguage,
      questionNumber: nextQuestionNumber,
      turnId: assistantTurnId
    });

    console.log('[VoiceAgent] TTS started');
    console.log(`[VoiceAgent] Spoken AI question saved and audio sent to Twilio: "${localizedQuestion}" (Question #${nextQuestionNumber})`);
    console.log('[VoiceAgent] Conversation turn completed');

    const twilioLang = state.lastDetectedLanguage.startsWith('gu') || state.lastDetectedLanguage.startsWith('hi') ? 'hi-IN' : 'en-IN';
    return this.buildListeningTwiML(localizedQuestion, {
      language: twilioLang,
      voice: 'Polly.Aditi'
    });
  }

  /**
   * Retrieves conversation & requirements for a session
   */
  async getSessionDetails(sessionIdOrCallSid) {
    if (!sessionIdOrCallSid) return null;

    const state = sessionStates.get(sessionIdOrCallSid) || null;
    const session = await twilioVoiceService.getSession(sessionIdOrCallSid);
    const messages = session?.id ? await twilioVoiceService.getConversationMessages(session.id) : (state?.conversation || []);
    const document = session?.id ? await twilioVoiceService.getConversationDocument(session.id) : (state?.generatedDoc || null);

    return {
      session,
      conversation: messages,
      requirements: state?.requirements || {},
      generatedDoc: document,
      lastDetectedLanguage: state?.lastDetectedLanguage || 'en-IN'
    };
  }

  /**
   * Handles Twilio Status Callback events and unexpected call termination
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

      // If call ended and Markdown document was not yet generated, generate incomplete/completed markdown
      const isTerminal = ['completed', 'failed', 'cancelled'].includes(mappedStatus);
      if (isTerminal) {
        const existingDoc = await twilioVoiceService.getConversationDocument(session.id);
        const messages = await twilioVoiceService.getConversationMessages(session.id);

        if (!existingDoc && messages && messages.length > 0) {
          const state = this.getSessionState(session.id);
          const docStatus = (mappedStatus === 'completed' && messages.filter(m => m.speaker === 'user').length >= 4)
            ? 'Completed'
            : 'Incomplete';

          console.log(`[VoiceWebhook] Generating ${docStatus} Markdown document on call termination for session ${session.id}`);

          await aiVoiceConsultantService.generateAndSaveVoiceDiscoveryMarkdown({
            session,
            messages,
            requirements: state?.requirements || {},
            initialRequirement: state?.initialRequirement || messages.find(m => m.speaker === 'user')?.text || '',
            status: docStatus
          });
        }
      }
    } catch (err) {
      console.warn('[VoiceWebhook] Status callback update error:', err.message);
    }
  }
}

export const voiceWebhookService = new VoiceWebhookService();



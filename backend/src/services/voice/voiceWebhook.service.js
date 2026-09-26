import twilio from 'twilio';
import { twilioVoiceService } from './twilioVoice.service.js';
import { aiVoiceConsultantService } from './aiVoiceConsultant.service.js';
import { sarvamSttService } from './sarvamStt.service.js';
import { prisma } from '../../prisma.js';

// In-Memory conversation state cache: sessionKey -> { conversation: [], requirements: {}, lastDetectedLanguage: 'en-IN', generatedDoc: null }
const sessionStates = new Map();

// In-flight recording processing set for idempotency
const inFlightRecordings = new Set();

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
   * Helper to get or initialize shared session state across all aliases (sessionId, callSid, toPhone, fromPhone)
   */
  resolveSessionState({ sessionId = null, callSid = null, toPhone = null, fromPhone = null }) {
    const keys = [sessionId, callSid, toPhone, fromPhone].filter(Boolean);
    let state = null;
    for (const k of keys) {
      if (sessionStates.has(k)) {
        state = sessionStates.get(k);
        break;
      }
    }

    if (!state) {
      state = {
        conversation: [],
        requirements: {},
        lastDetectedLanguage: 'en-IN',
        generatedDoc: null
      };
    }

    // Alias ALL active keys to the same state reference
    for (const k of keys) {
      sessionStates.set(k, state);
    }

    return state;
  }

  getSessionState(sessionKey) {
    if (!sessionKey) return this.resolveSessionState({});
    return this.resolveSessionState({ sessionId: sessionKey });
  }

  /**
   * Reusable helper to generate Conversational TwiML that waits for user speech.
   * NEVER hangs up after speaking unless explicitly completed.
   */
  buildListeningTwiML(message, options = {}) {
    const baseUrl = this.getBaseUrl();
    const sessionIdParam = options.sessionId ? `?sessionId=${encodeURIComponent(options.sessionId)}` : '';
    const actionUrl = options.actionUrl || `${baseUrl}/api/voice/process-speech${sessionIdParam}`;
    const redirectUrl = options.redirectUrl || `${baseUrl}/api/voice/incoming${sessionIdParam}`;
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

    let session = null;
    try {
      if (sessionId) session = await twilioVoiceService.getSession(sessionId);
      if (!session && callSid) session = await twilioVoiceService.getSession(callSid);
      if (!session && toPhone) session = await twilioVoiceService.getSession(toPhone);
    } catch {}

    const effectiveSessionId = session?.id || sessionId;
    const state = this.resolveSessionState({
      sessionId: effectiveSessionId,
      callSid,
      toPhone
    });

    if (!state.conversation || state.conversation.length === 0) {
      state.conversation = [
        {
          role: 'assistant',
          text: initialGreeting,
          englishText: initialGreeting,
          language: 'en-IN',
          timestamp: new Date().toISOString()
        }
      ];
    }

    // Update DB status and persist conversation asynchronously
    (async () => {
      try {
        if (session) {
          await twilioVoiceService.updateSession(session.id, {
            twilioCallSid: callSid || session.twilioCallSid,
            status: 'active',
            connectedAt: new Date()
          });

          if (prisma?.voiceSession) {
            await prisma.voiceSession.update({
              where: { id: session.id },
              data: {
                conversationJson: JSON.stringify(state.conversation)
              }
            });
          }
        }
      } catch (err) {
        console.warn('[VoiceWebhook] Non-blocking session update notice:', err.message);
      }
    })();

    return this.buildListeningTwiML(initialGreeting, {
      language: 'en-IN',
      voice: 'Polly.Aditi',
      sessionId: effectiveSessionId
    });
  }

  /**
   * Handles user speech received from Twilio <Gather>
   */
  async processSpeech({ callSid, speechResult, confidence = 1, from = null, to = null, sessionId = null }) {
    console.log('[VoiceAgent] Speech detected');
    console.log(`[VoiceAgent] Twilio stream CallSid: ${callSid || 'UNKNOWN'}`);

    let session = null;
    try {
      if (sessionId) session = await twilioVoiceService.getSession(sessionId);
      if (!session && callSid) session = await twilioVoiceService.getSession(callSid);
      if (!session && to) session = await twilioVoiceService.getSession(to);
      if (!session && from) session = await twilioVoiceService.getSession(from);
    } catch {}

    const effectiveSessionId = session?.id || sessionId;
    const state = this.resolveSessionState({
      sessionId: effectiveSessionId,
      callSid,
      toPhone: to,
      fromPhone: from
    });

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
        voice: 'Polly.Aditi',
        sessionId: effectiveSessionId
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

    // Append user turn to conversation history
    state.conversation.push({
      role: 'user',
      text: normalized.originalTranscript,
      englishText: normalized.englishTranscript,
      language: state.lastDetectedLanguage,
      confidence: confidence,
      timestamp: new Date().toISOString()
    });

    // Persist user turn to PostgreSQL
    if (session?.id && prisma?.voiceSession) {
      try {
        await prisma.voiceSession.update({
          where: { id: session.id },
          data: {
            conversationJson: JSON.stringify(state.conversation),
            requirementsJson: JSON.stringify(state.requirements || {}),
            detectedLanguage: state.lastDetectedLanguage
          }
        });
      } catch (e) {
        console.warn('[VoiceWebhook] DB persist turn notice:', e.message);
      }
    }

    // Check for explicit goodbye / call end request
    const lowerEnglish = normalized.englishTranscript.toLowerCase();
    const isGoodbye = /\b(bye|goodbye|exit|end call|stop call|hang up|that's all|that is all|thank you bye|finish call)\b/i.test(lowerEnglish);

    if (isGoodbye) {
      console.log('[VoiceAgent] User requested call completion. Wrapping up requirements.');
      console.log('[VoiceAgent] Conversation completed');

      let docResult = null;
      try {
        docResult = await aiVoiceConsultantService.generateProjectRequirementsDocument({
          session,
          conversation: state.conversation,
          requirements: state.requirements
        });
        state.generatedDoc = docResult;
      } catch (err) {
        console.warn('[VoiceAgent] Final markdown generation error:', err.message);
      }

      let farewellText = 'Thank you for discussing your project with RootForge AI. Your complete project requirements document has been generated and saved to your workspace. Goodbye!';
      if (state.lastDetectedLanguage.startsWith('gu')) {
        farewellText = 'રૂટફોર્જ એઆઈ સાથે વાત કરવા બદલ આભાર. તમારી સંપૂર્ણ રિક્વાયરમેન્ટ ફાઇલ સેવ થઈ ગઈ છે. આવજો!';
      } else if (state.lastDetectedLanguage.startsWith('hi')) {
        farewellText = 'रूटफोर्ज एआई से बात करने के लिए धन्यवाद। आपकी पूरी आवश्यकताएं सेव कर ली गई हैं। धन्यवाद और अलविदा!';
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
              endedAt: new Date(),
              conversationJson: JSON.stringify(state.conversation),
              requirementsJson: JSON.stringify(state.requirements || {}),
              processingStatus: 'COMPLETED'
            });
          } catch {}
        })();
      }

      return response.toString();
    }

    // 2. Groq AI Business Consultant Reasoner
    console.log('[VoiceAgent] Groq request started');
    let consultResult = null;
    try {
      consultResult = await aiVoiceConsultantService.consultAndFormulateQuestion({
        conversationHistory: state.conversation,
        currentTurnRequirements: state.requirements
      });
    } catch (err) {
      console.warn('[VoiceAgent] Consultant reasoning error:', err.message);
      consultResult = {
        conversation_complete: false,
        detected_language: state.lastDetectedLanguage,
        next_question: 'Could you share more details about your core users and primary features?',
        requirements: state.requirements,
        missing_information: []
      };
    }

    // Update accumulated requirements in state
    if (consultResult.requirements) {
      state.requirements = {
        ...state.requirements,
        ...consultResult.requirements
      };
    }

    // 3. Check if Groq evaluated conversation as complete
    if (consultResult.conversation_complete === true) {
      console.log('[VoiceAgent] Groq determined discovery is complete. Generating final specifications.');
      console.log('[VoiceAgent] Conversation completed');

      let docResult = null;
      try {
        docResult = await aiVoiceConsultantService.generateProjectRequirementsDocument({
          session,
          conversation: state.conversation,
          requirements: state.requirements
        });
        state.generatedDoc = docResult;
      } catch (err) {
        console.warn('[VoiceAgent] Markdown generation notice:', err.message);
      }

      let completionMessage = 'I have gathered sufficient requirements to generate your architecture and solution specifications. Your requirements document is now ready in RootForge. Thank you and goodbye!';
      if (state.lastDetectedLanguage.startsWith('gu')) {
        completionMessage = 'મેં તમારી બધી મુખ્ય જરૂરિયાતો નોંધી લીધી છે અને તમારું રિક્વાયરમેન્ટ ડોક્યુમેન્ટ તૈયાર થઈ ગયું છે. રૂટફોર્જ વાપરવા બદલ આભાર, આવજો!';
      } else if (state.lastDetectedLanguage.startsWith('hi')) {
        completionMessage = 'मैंने आपकी सभी मुख्य आवश्यकताएं समझ ली हैं और आपका दस्तावेज़ तैयार हो गया है। रूटफोर्ज का उपयोग करने के लिए धन्यवाद, अलविदा!';
      }

      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say(
        {
          voice: 'Polly.Aditi',
          language: state.lastDetectedLanguage.startsWith('gu') || state.lastDetectedLanguage.startsWith('hi') ? 'hi-IN' : 'en-IN'
        },
        completionMessage
      );
      response.hangup();

      if (session) {
        (async () => {
          try {
            await twilioVoiceService.updateSession(session.id, {
              status: 'completed',
              endedAt: new Date(),
              conversationJson: JSON.stringify(state.conversation),
              requirementsJson: JSON.stringify(state.requirements || {}),
              processingStatus: 'COMPLETED'
            });
          } catch {}
        })();
      }

      return response.toString();
    }

    // 4. Localize Next Question into User's Language
    const englishQuestion = consultResult.next_question || 'What is the most critical feature your users need?';
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

    // Append assistant counter-question to history
    state.conversation.push({
      role: 'assistant',
      text: localizedQuestion,
      englishText: englishQuestion,
      language: state.lastDetectedLanguage,
      timestamp: new Date().toISOString()
    });

    // Persist assistant turn to PostgreSQL
    if (session?.id && prisma?.voiceSession) {
      try {
        await prisma.voiceSession.update({
          where: { id: session.id },
          data: {
            conversationJson: JSON.stringify(state.conversation),
            requirementsJson: JSON.stringify(state.requirements || {})
          }
        });
      } catch (e) {
        console.warn('[VoiceWebhook] DB persist turn notice:', e.message);
      }
    }

    console.log('[VoiceAgent] TTS started');
    console.log(`[VoiceAgent] Audio sent to Twilio: "${localizedQuestion}"`);
    console.log('[VoiceAgent] Conversation turn completed');

    const twilioLang = state.lastDetectedLanguage.startsWith('gu') || state.lastDetectedLanguage.startsWith('hi') ? 'hi-IN' : 'en-IN';
    return this.buildListeningTwiML(localizedQuestion, {
      language: twilioLang,
      voice: 'Polly.Aditi',
      sessionId: effectiveSessionId
    });
  }

  /**
   * Retrieves conversation & requirements for a session (with DB fallback)
   */
  async getSessionDetails(sessionIdOrCallSid) {
    if (!sessionIdOrCallSid) return null;
    let state = sessionStates.get(sessionIdOrCallSid) || null;

    if ((!state || !state.conversation || state.conversation.length <= 1) && prisma?.voiceSession) {
      try {
        const dbRecord = await prisma.voiceSession.findFirst({
          where: {
            OR: [
              { id: sessionIdOrCallSid },
              { twilioCallSid: sessionIdOrCallSid }
            ]
          },
          select: {
            conversationJson: true,
            requirementsJson: true,
            rawTranscript: true,
            detectedLanguage: true,
            processingStatus: true,
            transcriptStatus: true,
            analysisStatus: true,
            recordingUrl: true,
            recordingSid: true,
            recordingDuration: true,
            lastError: true,
            retryCount: true
          }
        });

        if (dbRecord) {
          if (!state) {
            state = this.resolveSessionState({ sessionId: sessionIdOrCallSid });
          }

          if (dbRecord.conversationJson) {
            try {
              const parsed = JSON.parse(dbRecord.conversationJson);
              if (Array.isArray(parsed) && parsed.length > (state.conversation?.length || 0)) {
                state.conversation = parsed;
              }
            } catch {}
          }

          if (dbRecord.requirementsJson) {
            try {
              state.requirements = { ...state.requirements, ...JSON.parse(dbRecord.requirementsJson) };
            } catch {}
          }

          if (dbRecord.detectedLanguage) {
            state.lastDetectedLanguage = dbRecord.detectedLanguage;
          }

          state.rawTranscript = dbRecord.rawTranscript;
          state.processingStatus = dbRecord.processingStatus;
          state.transcriptStatus = dbRecord.transcriptStatus;
          state.analysisStatus = dbRecord.analysisStatus;
          state.recordingUrl = dbRecord.recordingUrl;
          state.recordingSid = dbRecord.recordingSid;
          state.recordingDuration = dbRecord.recordingDuration;
          state.lastError = dbRecord.lastError;
          state.retryCount = dbRecord.retryCount;
        }
      } catch {}
    }

    return state;
  }

  /**
   * Complete End-to-End Recording Processing Pipeline
   * Triggered from Twilio Recording Webhook or Manual Retry
   */
  async processRecordingPipeline({ callSid, recordingSid, recordingUrl, recordingDuration = 0, sessionId = null }) {
    const idempotencyKey = recordingSid || callSid || sessionId;
    if (inFlightRecordings.has(idempotencyKey)) {
      console.log(`[VoicePipeline] Pipeline already in-flight for ${idempotencyKey}. Skipping duplicate.`);
      return;
    }

    inFlightRecordings.add(idempotencyKey);
    console.log(`[VoicePipeline] Starting AI Voice Call Intelligence Pipeline for ${idempotencyKey}...`);

    let session = null;
    try {
      if (sessionId) session = await twilioVoiceService.getSession(sessionId);
      if (!session && callSid) session = await twilioVoiceService.getSession(callSid);

      // Step 1: Persist initial recording metadata
      if (session && prisma?.voiceSession) {
        await prisma.voiceSession.update({
          where: { id: session.id },
          data: {
            recordingSid: recordingSid || session.recordingSid,
            recordingUrl: recordingUrl || session.recordingUrl,
            recordingDuration: recordingDuration || session.recordingDuration,
            processingStatus: 'RECORDING_AVAILABLE',
            transcriptStatus: 'TRANSCRIBING',
            lastError: null
          }
        });
      }

      // Step 2: Sarvam STT Transcription
      console.log(`[VoicePipeline] Invoking Sarvam STT for audio: ${recordingUrl}`);
      let sttResult = null;
      try {
        sttResult = await sarvamSttService.processTwilioRecording({
          recordingUrl,
          recordingSid,
          sessionId: session?.id || sessionId
        });

        console.log(`[VoicePipeline] Sarvam STT generated transcript: ${sttResult.transcript.length} chars (Lang: ${sttResult.detectedLanguage})`);

        if (session && prisma?.voiceSession) {
          await prisma.voiceSession.update({
            where: { id: session.id },
            data: {
              rawTranscript: sttResult.transcript,
              detectedLanguage: sttResult.detectedLanguage || 'en-IN',
              transcriptStatus: 'COMPLETED',
              analysisStatus: 'ANALYZING',
              processingStatus: 'ANALYZING'
            }
          });
        }
      } catch (sttErr) {
        console.error(`[VoicePipeline] Sarvam STT transcription failed: ${sttErr.message}`);
        if (session && prisma?.voiceSession) {
          await prisma.voiceSession.update({
            where: { id: session.id },
            data: {
              transcriptStatus: 'FAILED',
              processingStatus: 'FAILED',
              lastError: `Transcription failed: ${sttErr.message}`,
              retryCount: { increment: 1 }
            }
          });
        }
        throw sttErr;
      }

      // Step 3: Groq Deep Structured Analysis (22 fields)
      console.log(`[VoicePipeline] Invoking Groq Deep Structured Analysis on complete transcript...`);
      const state = this.resolveSessionState({ sessionId: session?.id || sessionId, callSid });
      let structuredAnalysis = null;
      try {
        structuredAnalysis = await aiVoiceConsultantService.extractDeepStructuredAnalysis({
          transcript: sttResult.transcript,
          conversation: state.conversation,
          session
        });

        console.log(`[VoicePipeline] Groq deep analysis succeeded with ${Object.keys(structuredAnalysis).length} fields.`);

        if (session && prisma?.voiceSession) {
          await prisma.voiceSession.update({
            where: { id: session.id },
            data: {
              requirementsJson: JSON.stringify(structuredAnalysis),
              analysisStatus: 'COMPLETED',
              processingStatus: 'DOCUMENT_GENERATING'
            }
          });
        }
      } catch (analysisErr) {
        console.error(`[VoicePipeline] Groq analysis failed: ${analysisErr.message}`);
        if (session && prisma?.voiceSession) {
          await prisma.voiceSession.update({
            where: { id: session.id },
            data: {
              analysisStatus: 'FAILED',
              processingStatus: 'FAILED',
              lastError: `AI analysis failed: ${analysisErr.message}`,
              retryCount: { increment: 1 }
            }
          });
        }
        throw analysisErr;
      }

      // Step 4: Generate Full 28-Section Project Requirements Document & Register in Workspace
      console.log(`[VoicePipeline] Synthesizing comprehensive 28-section discovery document...`);
      let docResult = null;
      try {
        docResult = await aiVoiceConsultantService.generateProjectRequirementsDocument({
          session,
          conversation: state.conversation,
          requirements: structuredAnalysis,
          rawTranscript: sttResult.transcript
        });

        state.generatedDoc = docResult;

        if (session && prisma?.voiceSession) {
          await prisma.voiceSession.update({
            where: { id: session.id },
            data: {
              generatedDocJson: JSON.stringify({
                fileName: docResult.fileName,
                filePath: docResult.filePath,
                fileSize: docResult.fileSize,
                documentId: docResult.documentId
              }),
              processingStatus: 'COMPLETED',
              status: 'completed',
              endedAt: session.endedAt || new Date()
            }
          });
        }

        console.log(`[VoicePipeline] AI Voice Call Pipeline COMPLETED successfully for ${session?.id || sessionId}!`);
      } catch (docErr) {
        console.error(`[VoicePipeline] Document generation failed: ${docErr.message}`);
        if (session && prisma?.voiceSession) {
          await prisma.voiceSession.update({
            where: { id: session.id },
            data: {
              processingStatus: 'FAILED',
              lastError: `Document generation failed: ${docErr.message}`,
              retryCount: { increment: 1 }
            }
          });
        }
        throw docErr;
      }
    } catch (err) {
      console.error(`[VoicePipeline] Pipeline error for ${idempotencyKey}:`, err.message);
    } finally {
      inFlightRecordings.delete(idempotencyKey);
    }
  }

  /**
   * Handles Twilio Recording Status Callback
   * Fast HTTP 200 response with non-blocking async execution
   */
  async handleRecordingCallback({ callSid, recordingSid, recordingUrl, recordingStatus, recordingDuration = 0, sessionId = null }) {
    console.log(`[VoiceWebhook] Twilio recording callback: Call ${callSid?.slice(0, 8) || 'N/A'}, Recording ${recordingSid} (${recordingStatus}, ${recordingDuration}s)`);

    if (recordingStatus?.toLowerCase() !== 'completed') {
      console.log(`[VoiceWebhook] Recording status is '${recordingStatus}', skipping pipeline.`);
      return;
    }

    // Launch background asynchronous pipeline immediately without blocking webhook response
    setImmediate(() => {
      this.processRecordingPipeline({
        callSid,
        recordingSid,
        recordingUrl,
        recordingDuration,
        sessionId
      }).catch(err => {
        console.error('[VoiceWebhook] Unhandled background pipeline error:', err.message);
      });
    });
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
          if (!session.recordingSid) {
            updates.processingStatus = 'RECORDING_PENDING';
          }

          // Generate transcript & requirements document upon call completion if dialogue turns exist
          try {
            const state = this.getSessionState(session.id) || (session.twilioCallSid ? this.getSessionState(session.twilioCallSid) : null);
            if (state && state.conversation && state.conversation.length > 0 && !state.generatedDoc) {
              const docResult = await aiVoiceConsultantService.generateProjectRequirementsDocument({
                session,
                conversation: state.conversation,
                requirements: state.requirements || {}
              });
              state.generatedDoc = docResult;
            }
          } catch (docErr) {
            console.warn('[VoiceWebhook] Document generation on status callback notice:', docErr.message);
          }
          break;
        case 'busy':
        case 'failed':
        case 'no-answer':
          mappedStatus = 'failed';
          updates.errorMessage = error || `Call ended with status: ${callStatus}`;
          updates.endedAt = new Date();
          updates.processingStatus = 'FAILED';
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



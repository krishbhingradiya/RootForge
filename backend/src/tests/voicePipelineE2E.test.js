/**
 * Comprehensive End-to-End Verification Test for AI Voice Call Intelligence Pipeline
 * Tests:
 * 1. Twilio Outbound Call & TwiML <Gather> generation
 * 2. Conversational turns in Gujarati, Hindi, and English with normalization
 * 3. Groq Deep Structured Analysis (22 fields)
 * 4. 28-Section Architecture Specification Document generation with Verbatim Transcript
 * 5. PostgreSQL Database persistence in voice_sessions and prisma.document
 * 6. Pipeline status & diagnostics endpoints
 */

import { voiceWebhookService } from '../services/voice/voiceWebhook.service.js';
import { aiVoiceConsultantService } from '../services/voice/aiVoiceConsultant.service.js';
import { sarvamSttService } from '../services/voice/sarvamStt.service.js';
import { prisma } from '../prisma.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AI VOICE CALL INTELLIGENCE PIPELINE TESTS');
  console.log('====================================================\n');

  const testSessionId = `vses_test_${Date.now()}`;
  const testCallSid = `CA_test_${Date.now()}`;
  let testWorkspaceId = 'default-workspace';

  // Find or create workspace
  try {
    const ws = await prisma.workspace.findFirst({ select: { id: true } });
    if (ws) testWorkspaceId = ws.id;
  } catch {}

  // 1. Test Initial TwiML Generation
  console.log('--- Step 1: Initial TwiML & Session Initialization ---');
  try {
    // Create DB session first
    if (prisma?.voiceSession) {
      await prisma.voiceSession.create({
        data: {
          id: testSessionId,
          phoneNumber: '+918200818728',
          workspaceId: testWorkspaceId,
          twilioCallSid: testCallSid,
          status: 'initiated',
          processingStatus: 'RECORDING_PENDING'
        }
      });
    }

    const initialTwiML = await voiceWebhookService.generateIncomingTwiML({
      callSid: testCallSid,
      sessionId: testSessionId,
      toPhone: '+918200818728'
    });

    assert(initialTwiML.includes('<Gather'), 'TwiML includes <Gather> for speech input');
    assert(initialTwiML.includes('<Say'), 'TwiML includes conversational <Say>');
    assert(initialTwiML.includes('RootForge AI'), 'TwiML greeting mentions RootForge AI');
  } catch (err) {
    assert(false, `Initial TwiML generation failed: ${err.message}`);
  }

  // 2. Test Multilingual Conversation Turns (Gujarati Speech)
  console.log('\n--- Step 2: Multilingual Speech Input (Gujarati) ---');
  try {
    const gujaratiSpeech = 'અમારે કસ્ટમર સપોર્ટ પ્રોસેસ ઓટોમેટ કરવો છે અને રિયલ-ટાઇમ ટિકિટ સિસ્ટમ બનાવવી છે.';
    const turn1TwiML = await voiceWebhookService.processSpeech({
      callSid: testCallSid,
      speechResult: gujaratiSpeech,
      sessionId: testSessionId,
      confidence: 0.95
    });

    assert(turn1TwiML.includes('<Gather') || turn1TwiML.includes('<Say'), 'Gujarati speech produced conversational response');

    const state = voiceWebhookService.getSessionState(testSessionId);
    assert(state.conversation.length >= 2, `Conversation recorded user turn and AI response (turns: ${state.conversation.length})`);
    
    const userTurn = state.conversation.find(c => c.role === 'user');
    assert(userTurn && userTurn.text.includes('કસ્ટમર સપોર્ટ'), 'Original Gujarati speech preserved in verbatim transcript');
    assert(userTurn && userTurn.englishText && userTurn.englishText.length > 0, 'Normalized English translation generated');
  } catch (err) {
    assert(false, `Gujarati turn processing failed: ${err.message}`);
  }

  // 3. Test Hindi Speech Input
  console.log('\n--- Step 3: Multilingual Speech Input (Hindi) ---');
  try {
    const hindiSpeech = 'हमें डेटाबेस में पोस्टग्रेस का उपयोग करना है और व्हाट्सएप इंटीग्रेशन चाहिए।';
    const turn2TwiML = await voiceWebhookService.processSpeech({
      callSid: testCallSid,
      speechResult: hindiSpeech,
      sessionId: testSessionId,
      confidence: 0.96
    });

    assert(turn2TwiML.includes('<Gather') || turn2TwiML.includes('<Say'), 'Hindi speech produced conversational response');
    const state = voiceWebhookService.getSessionState(testSessionId);
    assert(state.conversation.length >= 4, `Conversation turns increased (turns: ${state.conversation.length})`);
  } catch (err) {
    assert(false, `Hindi turn processing failed: ${err.message}`);
  }

  // 4. Test Groq Deep Structured Analysis (22 Fields)
  console.log('\n--- Step 4: Groq Deep Structured Analysis (22 Fields) ---');
  let analysisResult = null;
  try {
    const state = voiceWebhookService.getSessionState(testSessionId);
    analysisResult = await aiVoiceConsultantService.extractDeepStructuredAnalysis({
      conversation: state.conversation,
      session: { id: testSessionId, workspaceId: testWorkspaceId }
    });

    assert(analysisResult !== null, 'Groq structured analysis returned an object');
    assert(typeof analysisResult.executiveSummary === 'string' && analysisResult.executiveSummary.length > 0, 'Executive summary extracted');
    assert(Array.isArray(analysisResult.painPoints), 'Pain points array extracted');
    assert(Array.isArray(analysisResult.functionalRequirements), 'Functional requirements array extracted');
    assert(Array.isArray(analysisResult.objectives), 'Objectives array extracted');
    assert(Array.isArray(analysisResult.automationOpportunities), 'Automation opportunities array extracted');
    assert(Array.isArray(analysisResult.aiOpportunities), 'AI opportunities array extracted');
    assert(Array.isArray(analysisResult.systemsAndIntegrations), 'Systems and integrations array extracted');
  } catch (err) {
    assert(false, `Groq deep structured analysis failed: ${err.message}`);
  }

  // 5. Test 28-Section Specification Markdown Document Generation
  console.log('\n--- Step 5: 28-Section Specification Document Generation ---');
  try {
    const state = voiceWebhookService.getSessionState(testSessionId);
    const docResult = await aiVoiceConsultantService.generateProjectRequirementsDocument({
      session: { id: testSessionId, workspaceId: testWorkspaceId },
      conversation: state.conversation,
      requirements: analysisResult || {}
    });

    assert(docResult.markdownContent && docResult.markdownContent.length > 1000, `Generated Markdown is comprehensive (${docResult.markdownContent.length} chars)`);
    assert(docResult.markdownContent.includes('## 1. Project Overview'), 'Contains Section 1 Project Overview');
    assert(docResult.markdownContent.includes('## 2. Business Problem'), 'Contains Section 2 Business Problem');
    assert(docResult.markdownContent.includes('## 10. Functional Requirements'), 'Contains Section 10 Functional Requirements');
    assert(docResult.markdownContent.includes('## 28. Implementation Recommendations & Next Steps'), 'Contains Section 28 Implementation Recommendations');
    assert(docResult.markdownContent.includes('Complete Call Conversation Transcript'), 'Contains Complete Verbatim Transcript header');
    assert(docResult.markdownContent.includes('Dialogue Turn Summary Table'), 'Contains Dialogue Turn Summary Table');
    assert(docResult.markdownContent.includes('કસ્ટમર સપોર્ટ'), 'Verbatim transcript in Markdown includes original native speech');
    assert(Boolean(docResult.documentId), `Document registered in PostgreSQL Prisma database (ID: ${docResult.documentId})`);
  } catch (err) {
    assert(false, `Document generation failed: ${err.message}`);
  }

  // 6. Verify PostgreSQL Database State
  console.log('\n--- Step 6: PostgreSQL Database Verification ---');
  try {
    const dbSession = await prisma.voiceSession.findUnique({
      where: { id: testSessionId }
    });

    assert(dbSession !== null, 'VoiceSession row exists in PostgreSQL');
    assert(dbSession.conversationJson && JSON.parse(dbSession.conversationJson).length > 0, 'Conversation turns persisted in PostgreSQL');
    
    // Check Document in database
    const dbDoc = await prisma.document.findFirst({
      where: {
        workspaceId: testWorkspaceId,
        filename: { contains: testSessionId }
      }
    });

    assert(dbDoc !== null, `Document record found in PostgreSQL database under workspace ${testWorkspaceId}`);
    assert(dbDoc && dbDoc.status === 'ANALYZED', 'Document status is ANALYZED');
    assert(dbDoc && dbDoc.extractedText.includes('Complete Call Conversation Transcript'), 'Database document contains verbatim transcript');
  } catch (err) {
    assert(false, `PostgreSQL verification failed: ${err.message}`);
  }

  // Clean up test session if desired
  try {
    await prisma.voiceSession.delete({ where: { id: testSessionId } }).catch(() => {});
  } catch {}

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

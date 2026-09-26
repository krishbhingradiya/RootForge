/**
 * Automated Verification Test for "Continue with Solution Builder" & Solution Workspace Creation
 */

import { solutionWorkspaceCreatorService } from '../services/voice/solutionWorkspaceCreator.service.js';
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

async function runTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING SOLUTION WORKSPACE CREATOR TEST');
  console.log('====================================================\n');

  const testSessionId = `vses_spawn_${Date.now()}`;
  const sampleMarkdown = `# 🎙️ RootForge Discovery Call Specification & Requirements Document
**Project Objective:** AI-Powered Customer Support Automation & Real-Time Ticketing  
**Session ID:** \`${testSessionId}\`  

---

## 💬 Complete Call Conversation Transcript (Verbatim Dialogue)

### 📊 Dialogue Turn Summary Table
| Turn | Timestamp | Speaker | Native Spoken Speech | English Interpretation |
|:---:|:---|:---|:---|:---|
| **1** | 10:00:00 AM | **👤 Client** | અમારે કસ્ટમર સપોર્ટ ઓટોમેશન કરવું છે. | We want to automate customer support. |
| **2** | 10:00:15 AM | **👤 Client** | हमें डेटाबेस में पोस्टग्रेस चाहिए। | We need Postgres in the database. |

---

## 🏛️ Synthesized Business Architecture & 28-Section Requirements Blueprint

## 1. Project Overview
AI-powered customer support ticketing and workflow automation system.

## 2. Business Problem
Manual ticket sorting and delayed resolution causing customer churn.

## 10. Functional Requirements
- Automated ticket categorization and sentiment analysis
- Real-time WhatsApp and Webhook notification dispatch
- SLA escalation engine

## 17. Database & Storage Architecture
- Primary Database: PostgreSQL with Prisma ORM
`;

  let createdWorkspaceId = null;

  try {
    // 1. Create a dummy voice session in DB
    const session = await prisma.voiceSession.create({
      data: {
        id: testSessionId,
        phoneNumber: '+918200818728',
        twilioCallSid: `CA_spawn_${Date.now()}`,
        status: 'completed',
        rawTranscript: 'Client discussed automating customer support and using PostgreSQL.',
        requirementsJson: JSON.stringify({
          business_objective: 'AI-Powered Customer Support Automation',
          business_problem: 'Manual ticket sorting causing delays',
          features: ['Automated Ticketing', 'WhatsApp Gateway', 'SLA Escalation'],
          painPoints: ['Manual delays', 'Lack of visibility']
        }),
        conversationJson: JSON.stringify([
          { role: 'user', text: 'અમારે કસ્ટમર સપોર્ટ ઓટોમેશન કરવું છે.', englishText: 'We want to automate customer support.' },
          { role: 'assistant', text: 'સમજાયું. ડેટાબેઝ વિશે શું વિચાર છે?', englishText: 'Understood. What are your database requirements?' }
        ])
      }
    });

    assert(Boolean(session), 'Created test VoiceSession in DB');

    // 2. Call solutionWorkspaceCreatorService
    console.log('\n--- Spawning Solution Workspace from Voice Session ---');
    const result = await solutionWorkspaceCreatorService.createWorkspaceFromVoiceSession({
      sessionId: testSessionId,
      customName: 'Customer Support AI — Solution Workspace'
    });

    assert(result.success === true, 'createWorkspaceFromVoiceSession returned success');
    assert(Boolean(result.workspace && result.workspace.id), `New Workspace created (ID: ${result.workspace?.id})`);
    assert(result.redirectUrl.includes(result.workspace.id), `Redirect URL points to new workspace (/app/workspaces/${result.workspace.id})`);

    createdWorkspaceId = result.workspace.id;

    // 3. Verify Database Entities in New Workspace
    console.log('\n--- Verifying Workspace Context & Pre-Populated Entities ---');
    
    // A. Check Workspace Record
    const ws = await prisma.workspace.findUnique({
      where: { id: createdWorkspaceId }
    });
    assert(ws.name.includes('Customer Support'), `Workspace has correct title: "${ws.name}"`);
    assert(ws.objective && ws.objective.length > 5, `Workspace objective set: "${ws.objective.slice(0, 40)}..."`);
    assert(ws.challenge && ws.challenge.length > 5, `Workspace challenge set: "${ws.challenge.slice(0, 40)}..."`);

    // B. Check Document attachment
    const doc = await prisma.document.findFirst({
      where: { workspaceId: createdWorkspaceId }
    });
    assert(doc !== null, 'Specification Document attached to new workspace');
    assert(doc && doc.extractedText.includes('Complete Call Conversation Transcript'), 'Document contains full verbatim transcript and 28 sections');

    // C. Check Business Analysis
    const ba = await prisma.businessAnalysis.findFirst({
      where: { workspaceId: createdWorkspaceId }
    });
    assert(ba !== null, 'BusinessAnalysis pre-populated for new workspace');
    assert(ba && ba.status === 'APPROVED', 'BusinessAnalysis status is APPROVED');
    assert(ba && ba.painPoints && ba.painPoints.length > 2, 'BusinessAnalysis contains structured pain points');

    // D. Check Solution
    const sol = await prisma.solution.findFirst({
      where: { workspaceId: createdWorkspaceId }
    });
    assert(sol !== null, 'Solution Architecture pre-populated for new workspace');
    assert(sol && sol.techStack && sol.techStack.includes('PostgreSQL'), 'Solution tech stack includes PostgreSQL');

    // E. Check Discovery Conversation & Kickoff Message
    const conv = await prisma.conversation.findFirst({
      where: { workspaceId: createdWorkspaceId, stage: 'discovery' },
      include: { messages: true }
    });
    assert(conv !== null, 'Discovery Conversation created for new workspace');
    assert(conv && conv.messages.length > 0, `Kickoff message created in chat (message count: ${conv?.messages?.length})`);
    assert(conv && conv.messages[0].content.includes('Welcome to your new'), 'Kickoff message welcomes user with loaded project context');

    // F. Check Activity Log
    const act = await prisma.activityLog.findFirst({
      where: { workspaceId: createdWorkspaceId, action: 'WORKSPACE_CREATED' }
    });
    assert(act !== null, 'Activity log recorded workspace lineage');

  } catch (err) {
    assert(false, `Test execution failed: ${err.message}`);
  } finally {
    // Cleanup test data
    if (createdWorkspaceId) {
      await prisma.workspace.delete({ where: { id: createdWorkspaceId } }).catch(() => {});
    }
    await prisma.voiceSession.delete({ where: { id: testSessionId } }).catch(() => {});
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

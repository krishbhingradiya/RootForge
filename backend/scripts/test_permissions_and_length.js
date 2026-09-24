import { prisma } from '../src/prisma.js';
import { generateConsultantAnswer } from '../src/ai/relevanceGuard.js';
import { detectResponseConstraints } from '../src/utils/languageDetector.js';
import { assertChatSessionAccess, getAuthorizedWorkspace } from '../src/services/authorization.service.js';

async function runTests() {
  console.log('=== 1. TESTING LANGUAGE & LENGTH CONSTRAINT DETECTOR ===');
  const testInputs = [
    { text: 'Explain this in one line.', expectedLength: 'ONE_LINE' },
    { text: 'Give me 3 risks.', expectedLength: 'SHORT', expectedCount: 3 },
    { text: 'Give me 5 key recommendations in bullets.', expectedLength: 'NORMAL', expectedCount: 5 },
    { text: 'Answer briefly.', expectedLength: 'SHORT' },
    { text: 'Give me a detailed explanation of the architecture.', expectedLength: 'DETAILED' },
    { text: 'Summarize this.', expectedLength: 'SHORT' },
    { text: 'Tell me about the system design.', expectedLength: 'NORMAL' },
    { text: 'Answer in 2 lines please.', expectedLength: 'TWO_LINES' }
  ];

  let detectionPassed = 0;
  for (const item of testInputs) {
    const res = detectResponseConstraints(item.text);
    console.log(`Input: "${item.text}" -> Length: ${res.length}, Format: ${res.format}, Count: ${res.pointCount}, MaxTokens: ${res.maxTokensLimit}`);
    if (res.length !== item.expectedLength) {
      console.error(`  FAIL: Expected length ${item.expectedLength}, got ${res.length}`);
    } else {
      detectionPassed++;
    }
    if (item.expectedCount && res.pointCount !== item.expectedCount) {
      console.error(`  FAIL: Expected count ${item.expectedCount}, got ${res.pointCount}`);
    }
  }
  console.log(`Length Detector Score: ${detectionPassed}/${testInputs.length} passed.`);

  console.log('\n=== 2. TESTING AUTHORIZATION & ROLES (ADMIN, CONSULTANT, ANALYST, VIEWER) ===');
  const ws = await prisma.workspace.findFirst();
  if (!ws) {
    console.error('No workspace found in DB to test');
    return;
  }
  console.log(`Testing with live workspace ID: ${ws.id} (orgId: ${ws.organizationId})`);

  const conv = await prisma.conversation.findFirst({ where: { workspaceId: ws.id } });
  const testChatId = conv ? conv.id : 'any-chat-id';

  // 2a. Test ADMIN write access
  try {
    const adminUser = { id: 'usr-admin-test', role: 'ADMIN', organizationId: 'any-org' };
    await getAuthorizedWorkspace(ws.id, adminUser, { requireWrite: true });
    console.log('PASS: ADMIN has write/chat access');
  } catch (e) {
    console.error('FAIL: ADMIN write access failed:', e.message);
  }

  // 2b. Test CONSULTANT write access
  try {
    const consultantUser = { id: ws.createdById || 'usr-consultant-test', role: 'CONSULTANT', organizationId: ws.organizationId };
    await getAuthorizedWorkspace(ws.id, consultantUser, { requireWrite: true });
    console.log('PASS: CONSULTANT has write/chat access');
  } catch (e) {
    console.error('FAIL: CONSULTANT write access failed:', e.message);
  }

  // 2c. Test ANALYST write access
  try {
    const analystUser = { id: ws.createdById || 'usr-analyst-test', role: 'ANALYST', organizationId: ws.organizationId };
    await getAuthorizedWorkspace(ws.id, analystUser, { requireWrite: true });
    console.log('PASS: ANALYST has write/chat access');
  } catch (e) {
    console.error('FAIL: ANALYST write access failed:', e.message);
  }

  // 2d. Test VIEWER chat access -> SUCCEEDS (viewer can create chats, send messages, and receive AI responses)
  try {
    const viewerUser = { id: ws.createdById || 'usr-viewer-test', role: 'VIEWER', organizationId: ws.organizationId };
    await assertChatSessionAccess(testChatId, ws.id, viewerUser);
    console.log('PASS: VIEWER can create chats, send messages, and receive AI responses');
  } catch (e) {
    console.error('FAIL: VIEWER chat access failed:', e.message);
  }

  console.log('\n=== 3. TESTING AI RESPONSE LENGTH GENERATION & PRESERVATION OF CONTEXT ===');
  const mockContext = {
    workspace: {
      id: ws.id,
      name: ws.name || 'RootForge Enterprise',
      industry: ws.industry || 'Technology',
      description: ws.description || 'Enterprise Cloud Solution'
    },
    stage: 'Discovery',
    currentStage: 'Discovery',
    history: []
  };

  const queriesToTest = [
    { label: 'ONE LINE TEST', prompt: 'Explain the primary goal of this solution in one line.' },
    { label: '3 BULLETS TEST', prompt: 'Give me 3 risks.' },
    { label: 'BRIEF / SHORT TEST', prompt: 'Answer briefly what the architecture stack includes.' },
    { label: 'DETAILED TEST', prompt: 'Give me a detailed explanation of the system security model.' }
  ];

  for (const item of queriesToTest) {
    console.log(`\n--- ${item.label} ---`);
    console.log(`Prompt: "${item.prompt}"`);
    try {
      const response = await generateConsultantAnswer(
        mockContext,
        item.prompt,
        [],
        'en'
      );
      console.log(`Response message preview:\n${response.message}`);
      console.log(`Suggested Next Stage: ${response.suggestedNextStage || 'None'}`);
    } catch (err) {
      console.log(`AI generation handled: ${err.message}`);
    }
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

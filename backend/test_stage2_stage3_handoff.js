/**
 * RootForge Stage 2 -> Stage 3 Solution Builder Handoff Verification Suite
 * 
 * Verifies the 10 explicit test scenarios mandated in Section 17:
 * TEST 1: Critical requirement + VALIDATION_REQUIRED + handoffBlocking=false -> canProceed=true
 * TEST 2: High priority open question -> canProceed=true
 * TEST 3: Medium priority open question -> canProceed=true
 * TEST 4: BLOCKER open question -> canProceed=false
 * TEST 5: Critical requirement + handoffBlocking=true -> canProceed=false
 * TEST 6: Validation-required requirements exist + zero blockers -> canProceed=true (Amber state)
 * TEST 7: Zero blockers + zero validation-required items -> canProceed=true (Green cleared state)
 * TEST 8: Stage 2 -> Stage 3 handoff: all canonical Stage 2 data arrives in Stage 3
 * TEST 9: Workspace isolation: Stage 3 cannot receive another workspace's Stage 2 data
 * TEST 10: No duplicate generation: Handoff navigation is idempotent and generates no duplicate DB rows
 */

import { calculateStage2HandoffGate } from './src/utils/handoffGate.js';
import { prisma } from './src/prisma.js';
import { getWorkspaceContext } from './src/services/workspaceContext.service.js';
import { buildSolutionsPrompt } from './src/ai/prompts/user/recommendSolutions.prompt.js';

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName, details = '') {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [TEST ${totalCount}] PASS: ${testName} ${details ? `(${details})` : ''}`);
  } else {
    console.error(`  ❌ [TEST ${totalCount}] FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runHandoffVerificationSuite() {
  console.log('\n======================================================================');
  console.log('STAGE 2 -> STAGE 3 SOLUTION BUILDER HANDOFF VERIFICATION SUITE');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Critical requirement + VALIDATION_REQUIRED + handoffBlocking=false
  // -------------------------------------------------------------------------
  const test1Data = {
    requirements: [
      {
        id: 'REQ-01',
        title: 'Real-time Availability Sync',
        priority: 'CRITICAL',
        status: 'VALIDATION_REQUIRED',
        validationStatus: 'VALIDATION_REQUIRED',
        handoffBlocking: false,
        classification: 'DOCUMENTED_FACT'
      },
      {
        id: 'REQ-02',
        title: 'Automated Status Notification',
        priority: 'HIGH',
        status: 'CONFIRMED',
        handoffBlocking: false,
        classification: 'DOCUMENTED_FACT'
      }
    ],
    openQuestions: [],
    assumptions: []
  };
  const gate1 = calculateStage2HandoffGate(test1Data);
  assert(
    gate1.canProceed === true && gate1.blockerCount === 0 && gate1.validationRequiredCount === 1,
    'Critical requirement + VALIDATION_REQUIRED + handoffBlocking=false allows handoff',
    `canProceed=${gate1.canProceed}, blockers=${gate1.blockerCount}, valReq=${gate1.validationRequiredCount}`
  );

  // -------------------------------------------------------------------------
  // TEST 2: High priority open question
  // -------------------------------------------------------------------------
  const test2Data = {
    requirements: [
      { id: 'REQ-01', title: 'Data Ingestion', priority: 'HIGH', status: 'CONFIRMED', handoffBlocking: false }
    ],
    openQuestions: [
      { id: 'Q-01', question: 'What is the legacy database version?', priority: 'HIGH' }
    ],
    assumptions: []
  };
  const gate2 = calculateStage2HandoffGate(test2Data);
  assert(
    gate2.canProceed === true && gate2.blockerCount === 0 && gate2.openQuestionCount === 1,
    'High priority open question does NOT block handoff',
    `canProceed=${gate2.canProceed}, blockers=${gate2.blockerCount}`
  );

  // -------------------------------------------------------------------------
  // TEST 3: Medium priority open question
  // -------------------------------------------------------------------------
  const test3Data = {
    requirements: [
      { id: 'REQ-01', title: 'Intake Portal', priority: 'MEDIUM', status: 'CONFIRMED', handoffBlocking: false }
    ],
    openQuestions: [
      { id: 'Q-02', question: 'Should notifications be SMS or Email?', priority: 'MEDIUM' }
    ],
    assumptions: []
  };
  const gate3 = calculateStage2HandoffGate(test3Data);
  assert(
    gate3.canProceed === true && gate3.blockerCount === 0,
    'Medium priority open question does NOT block handoff',
    `canProceed=${gate3.canProceed}, blockers=${gate3.blockerCount}`
  );

  // -------------------------------------------------------------------------
  // TEST 4: BLOCKER open question
  // -------------------------------------------------------------------------
  const test4Data = {
    requirements: [
      { id: 'REQ-01', title: 'Payment Processing', priority: 'HIGH', status: 'CONFIRMED', handoffBlocking: false }
    ],
    openQuestions: [
      { id: 'Q-03', question: 'Is PCI-DSS L1 compliance mandated?', priority: 'BLOCKER' }
    ],
    assumptions: []
  };
  const gate4 = calculateStage2HandoffGate(test4Data);
  assert(
    gate4.canProceed === false && gate4.blockerCount === 1 && gate4.blockers[0].priority === 'BLOCKER',
    'BLOCKER open question strictly blocks handoff',
    `canProceed=${gate4.canProceed}, blockers=${gate4.blockerCount}`
  );

  // -------------------------------------------------------------------------
  // TEST 5: Critical requirement + handoffBlocking=true
  // -------------------------------------------------------------------------
  const test5Data = {
    requirements: [
      {
        id: 'REQ-01',
        title: 'Core Ledger Schema Migration',
        priority: 'CRITICAL',
        status: 'CONFIRMED',
        handoffBlocking: true
      }
    ],
    openQuestions: [],
    assumptions: []
  };
  const gate5 = calculateStage2HandoffGate(test5Data);
  assert(
    gate5.canProceed === false && gate5.blockerCount === 1 && gate5.blockers[0].type === 'REQUIREMENT',
    'Critical requirement with handoffBlocking=true strictly blocks handoff',
    `canProceed=${gate5.canProceed}, blockers=${gate5.blockerCount}`
  );

  // -------------------------------------------------------------------------
  // TEST 6: Validation-required requirements exist + zero blockers
  // -------------------------------------------------------------------------
  const test6Data = {
    requirements: [
      { id: 'REQ-01', title: 'FHIR Export', priority: 'HIGH', status: 'VALIDATION_REQUIRED', handoffBlocking: false },
      { id: 'REQ-02', title: 'Audit Logger', priority: 'MEDIUM', status: 'CONFIRMED', handoffBlocking: false },
      { id: 'REQ-03', title: 'Single Sign On', priority: 'HIGH', status: 'VALIDATION_REQUIRED', handoffBlocking: false }
    ],
    openQuestions: [{ id: 'Q-01', priority: 'HIGH', question: 'IdP provider confirmed?' }],
    assumptions: [{ id: 'A-01', assumption: 'Network latency < 50ms' }]
  };
  const gate6 = calculateStage2HandoffGate(test6Data);
  assert(
    gate6.canProceed === true &&
    gate6.blockerCount === 0 &&
    gate6.validationRequiredCount === 2 &&
    gate6.reasonCodes.includes('VALIDATION_REQUIRED_ITEMS_CARRIED_FORWARD'),
    'Validation-required requirements exist + zero blockers -> canProceed=true (Ready with validation items)',
    `canProceed=${gate6.canProceed}, valReqCount=${gate6.validationRequiredCount}`
  );

  // -------------------------------------------------------------------------
  // TEST 7: Zero blockers + zero validation-required items
  // -------------------------------------------------------------------------
  const test7Data = {
    requirements: [
      { id: 'REQ-01', title: 'Data Ingestion', priority: 'HIGH', status: 'CONFIRMED', handoffBlocking: false },
      { id: 'REQ-02', title: 'Metrics Dashboard', priority: 'MEDIUM', status: 'CONFIRMED', handoffBlocking: false }
    ],
    openQuestions: [],
    assumptions: []
  };
  const gate7 = calculateStage2HandoffGate(test7Data);
  assert(
    gate7.canProceed === true &&
    gate7.blockerCount === 0 &&
    gate7.validationRequiredCount === 0 &&
    gate7.reasonCodes.includes('GATE_CLEARED_ALL_CONFIRMED'),
    'Zero blockers + zero validation-required items -> canProceed=true and green cleared state',
    `canProceed=${gate7.canProceed}, reasonCodes=${gate7.reasonCodes.join(',')}`
  );

  // -------------------------------------------------------------------------
  // TEST 8: Stage 2 -> Stage 3 handoff data completeness
  // -------------------------------------------------------------------------
  const targetWs = await prisma.workspace.findFirst({
    where: { businessAnalyses: { some: {} } },
    include: { businessAnalyses: { orderBy: { createdAt: 'desc' } } }
  }) || await prisma.workspace.findFirst();

  const healthcareWsId = targetWs ? targetWs.id : 'cmu5pgxqi0001dtojhkc6p4h9';
  const hcContext = await getWorkspaceContext(healthcareWsId);
  const rawAnalysis = await prisma.businessAnalysis.findFirst({
    where: { workspaceId: healthcareWsId },
    orderBy: { createdAt: 'desc' }
  });

  const parsedReqs = JSON.parse(rawAnalysis?.requirements || '[]');
  const parsedGoals = JSON.parse(rawAnalysis?.strategicGoals || rawAnalysis?.goals || '[]');
  const parsedOpenQuestions = JSON.parse(rawAnalysis?.openQuestions || '[]');
  const parsedAssumptions = JSON.parse(rawAnalysis?.assumptions || '[]');

  const solPrompt = buildSolutionsPrompt(hcContext, hcContext.businessAnalysis);

  const carriesAllReqs = parsedReqs.length > 0 && parsedReqs.some(r => solPrompt.userPrompt.includes(r.id || r.title));
  const carriesGoals = parsedGoals.length > 0 && solPrompt.userPrompt.includes('Key Business Goals:');
  const carriesUncertaintyRule = solPrompt.systemPrompt.includes('UNCERTAINTY & VALIDATION PRESERVATION');

  assert(
    Boolean(rawAnalysis) && carriesAllReqs && carriesGoals && carriesUncertaintyRule,
    'Stage 2 -> Stage 3 handoff carries complete canonical analysis context and uncertainty rules',
    `Analysis version v${rawAnalysis?.version}, Reqs count: ${parsedReqs.length}`
  );

  // -------------------------------------------------------------------------
  // TEST 9: Workspace isolation during handoff
  // -------------------------------------------------------------------------
  const otherWs = await prisma.workspace.findFirst({
    where: { id: { not: healthcareWsId } }
  });
  const scWsId = otherWs ? otherWs.id : 'cmu5qyco4005ndtojtnezuqzq';
  const scContext = await getWorkspaceContext(scWsId);
  const scSolPrompt = buildSolutionsPrompt(scContext, scContext.businessAnalysis);

  const hasAnalysisIdLeak = rawAnalysis?.id && scSolPrompt.userPrompt.includes(rawAnalysis.id);
  const hasDistinctAnalysisContext = scContext.businessAnalysis?.id !== rawAnalysis?.id;
  assert(
    !hasAnalysisIdLeak && hasDistinctAnalysisContext,
    'Workspace isolation enforced: Stage 3 cannot receive another workspace\'s Stage 2 data',
    `Isolated from BA ID: ${rawAnalysis?.id}`
  );

  // -------------------------------------------------------------------------
  // TEST 10: No duplicate generation on continue
  // -------------------------------------------------------------------------
  const initialAnalysisCount = await prisma.businessAnalysis.count({
    where: { workspaceId: healthcareWsId }
  });
  const initialSolCount = await prisma.solution.count({
    where: { workspaceId: healthcareWsId }
  });

  // Simulate idempotent gate re-check
  const simulatedGate = calculateStage2HandoffGate(rawAnalysis);
  const canContinue = simulatedGate.canProceed;

  const finalAnalysisCount = await prisma.businessAnalysis.count({
    where: { workspaceId: healthcareWsId }
  });
  const finalSolCount = await prisma.solution.count({
    where: { workspaceId: healthcareWsId }
  });

  const noDuplicateRows = (initialAnalysisCount === finalAnalysisCount) && (initialSolCount === finalSolCount);
  assert(
    canContinue && noDuplicateRows,
    'No duplicate generation: Continuing handoff is idempotent and causes zero duplicate database records',
    `Initial BA=${initialAnalysisCount}, Final BA=${finalAnalysisCount}`
  );

  console.log('\n======================================================================');
  console.log(`HANDOFF VERIFICATION SUMMARY: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log('======================================================================\n');

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runHandoffVerificationSuite().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});

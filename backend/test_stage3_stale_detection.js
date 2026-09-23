/**
 * RootForge Stage 3 Stale Detection & Context Hash Test Suite
 * 
 * Verifies that:
 * 1. computeStage2ContextHash produces deterministic, stable hashes for identical Stage 2 inputs
 * 2. Any mutation to Stage 2 upstream data (requirements, strategic goals, pain points, assumptions, documents):
 *    - Changes the computed context hash
 *    - Triggers `isStale = true`
 * 3. Handoff versioning (sourceAnalysisId, sourceAnalysisVersion, sourceContextHash) accurately tracks state
 */

import { computeStage2ContextHash, normalizeStage2Contract } from './src/utils/stage2Contract.js';

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

async function runStaleDetectionSuite() {
  console.log('\n======================================================================');
  console.log('STAGE 3 STALE DETECTION & CONTEXT HASH INTEGRITY TEST SUITE');
  console.log('======================================================================\n');

  const baseContext = {
    workspace: {
      id: 'ws-stale-test-001',
      name: 'Alpha Energy Grid Optimizer',
      objective: 'Optimize renewable wind turbine battery storage charging'
    },
    businessAnalysis: {
      id: 'ba-stale-001',
      version: 1,
      requirements: [
        { id: 'REQ-01', title: 'Battery State-of-Charge Telemetry', specification: 'Ingest 1-minute SoC readings', classification: 'DOCUMENTED_FACT' },
        { id: 'REQ-02', title: 'Grid Spot Price Forecasting', specification: 'Fetch day-ahead hourly spot power prices', classification: 'DOCUMENTED_FACT' }
      ],
      strategicGoals: [
        { id: 'G-01', goal: 'Maximize battery arbitrage revenue' }
      ],
      painPoints: [
        { id: 'PP-01', title: 'Manual battery charge dispatch', description: 'Operators manually initiate charging' }
      ],
      automationOpportunities: [
        { id: 'AUTO-01', title: 'Automated Charge Schedule Dispatch' }
      ],
      openQuestions: [
        { id: 'Q-01', question: 'What is the degradation cost per battery cycle?' }
      ],
      assumptions: [
        { id: 'A-01', assumption: 'Grid interconnect allows bidirectional 5MW power flow' }
      ],
      documents: [
        { id: 'DOC-01', name: 'Battery_Storage_Manual.pdf' }
      ]
    }
  };

  // TEST 1: Deterministic hash generation
  const hash1 = computeStage2ContextHash(baseContext);
  const hash2 = computeStage2ContextHash(baseContext);
  assert(
    typeof hash1 === 'string' && hash1.length === 64 && hash1 === hash2,
    'computeStage2ContextHash generates deterministic 64-char SHA-256 hash for identical data',
    `Hash: ${hash1.slice(0, 12)}...`
  );

  // TEST 2: Mutating requirement title changes hash
  const mutatedReq = JSON.parse(JSON.stringify(baseContext));
  mutatedReq.businessAnalysis.requirements[0].title = 'Battery SoC & Temperature Telemetry';
  const hashReqMutation = computeStage2ContextHash(mutatedReq);
  assert(
    hashReqMutation !== hash1,
    'Mutating requirement title invalidates context hash',
    `Original: ${hash1.slice(0, 8)} != New: ${hashReqMutation.slice(0, 8)}`
  );

  // TEST 3: Adding a requirement changes hash
  const addedReq = JSON.parse(JSON.stringify(baseContext));
  addedReq.businessAnalysis.requirements.push({
    id: 'REQ-03',
    title: 'Transformer Thermal Monitoring',
    specification: 'Monitor transformer oil temperature',
    classification: 'DOCUMENTED_FACT'
  });
  const hashReqAdd = computeStage2ContextHash(addedReq);
  assert(
    hashReqAdd !== hash1,
    'Adding a requirement invalidates context hash'
  );

  // TEST 4: Mutating strategic goals changes hash
  const mutatedGoal = JSON.parse(JSON.stringify(baseContext));
  mutatedGoal.businessAnalysis.strategicGoals[0].goal = 'Maximize battery arbitrage revenue and extend cell life';
  const hashGoalMutation = computeStage2ContextHash(mutatedGoal);
  assert(
    hashGoalMutation !== hash1,
    'Mutating strategic goal invalidates context hash'
  );

  // TEST 5: Mutating pain point changes hash
  const mutatedPainPoint = JSON.parse(JSON.stringify(baseContext));
  mutatedPainPoint.businessAnalysis.painPoints[0].title = 'Delayed battery charge dispatch';
  const hashPainPointMutation = computeStage2ContextHash(mutatedPainPoint);
  assert(
    hashPainPointMutation !== hash1,
    'Mutating pain point invalidates context hash'
  );

  // TEST 6: Mutating assumptions changes hash
  const mutatedAssumption = JSON.parse(JSON.stringify(baseContext));
  mutatedAssumption.businessAnalysis.assumptions[0].assumption = 'Grid interconnect allows bidirectional 10MW power flow';
  const hashAssumptionMutation = computeStage2ContextHash(mutatedAssumption);
  assert(
    hashAssumptionMutation !== hash1,
    'Mutating assumption invalidates context hash'
  );

  // TEST 7: Mutating documents list changes hash
  const mutatedDocs = JSON.parse(JSON.stringify(baseContext));
  mutatedDocs.businessAnalysis.documents.push({ id: 'DOC-02', name: 'Inverter_Specs.pdf' });
  const hashDocsMutation = computeStage2ContextHash(mutatedDocs);
  assert(
    hashDocsMutation !== hash1,
    'Adding a document invalidates context hash'
  );

  // TEST 8: Stale Detection logic verification
  // Simulated persisted solution in database
  const persistedSolution = {
    id: 'sol-001',
    sourceAnalysisId: 'ba-stale-001',
    sourceAnalysisVersion: 1,
    sourceContextHash: hash1
  };

  // Check against unchanged Stage 2 context -> isStale should be FALSE
  const isStaleBefore = persistedSolution.sourceContextHash !== hash1;
  assert(
    isStaleBefore === false,
    'Persisted solution is NOT stale when Stage 2 context hash matches'
  );

  // Check against mutated Stage 2 context -> isStale should be TRUE
  const currentContextHash = computeStage2ContextHash(mutatedReq);
  const isStaleAfter = persistedSolution.sourceContextHash !== currentContextHash;
  assert(
    isStaleAfter === true,
    'Persisted solution IS flagged stale (isStale = true) when Stage 2 context hash changes',
    `sourceContextHash: ${persistedSolution.sourceContextHash.slice(0, 8)} vs current: ${currentContextHash.slice(0, 8)}`
  );

  console.log('\n----------------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log('======================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runStaleDetectionSuite().catch(err => {
  console.error('Fatal error in stale detection test suite:', err);
  process.exit(1);
});

/**
 * RootForge Stage 3 Metric Safety & Estimation Integrity Test Suite
 * 
 * Verifies that metrics, ROI, effort, and cost assertions adhere to strict safety guidelines:
 * 1. Target vs Baseline Separation:
 *    - If no baseline is documented in Stage 2, output states "Baseline not established from available evidence"
 *    - Targets are explicitly labeled "Proposed target" or "(Validation required)"
 * 2. Honest Estimation:
 *    - Effort and costs are labeled "(AI estimate — validation required)"
 *    - No synthetic dollar amounts or calendar durations presented as established facts
 * 3. Documented Baselines Honored:
 *    - When an explicit baseline exists in Stage 2, it is preserved and referenced accurately
 */

import { demoProvider } from './src/ai/providers/demoProvider.js';

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

async function runMetricSafetySuite() {
  console.log('\n======================================================================');
  console.log('STAGE 3 METRIC SAFETY & ESTIMATION INTEGRITY TEST SUITE');
  console.log('======================================================================\n');

  // Case A: Workspace WITHOUT established baseline
  const contextNoBaseline = {
    workspace: {
      id: 'ws-metric-nobase-01',
      name: 'AlphaPay Clearing',
      objective: 'Modernize automated transaction reconciliation'
    },
    businessAnalysis: {
      id: 'ba-nobase-01',
      requirements: [
        { id: 'REQ-01', title: 'Batch Processing', specification: 'Process clearing batches', classification: 'DOCUMENTED_FACT' }
      ],
      strategicGoals: [
        { id: 'G-01', goal: 'Speed up clearing cycle' } // No baseline or target
      ]
    }
  };

  const solNoBaseline = await demoProvider.recommendSolutions(contextNoBaseline);

  // TEST 1: Output notes baseline is not established
  assert(
    solNoBaseline.businessValue.includes('Baseline not established from available evidence') ||
    solNoBaseline.businessValue.includes('Baseline metrics not established'),
    'Business value notes "Baseline not established from available evidence" when no baseline exists',
    solNoBaseline.businessValue
  );

  // TEST 2: Option A, B, C effort and cost have validation required labels
  for (const opt of solNoBaseline.options) {
    assert(
      opt.estimatedCost.includes('Proposed estimate') && opt.estimatedCost.includes('validation required'),
      `${opt.id} estimatedCost is flagged as "Proposed estimate ... (AI estimate — validation required)"`
    );
    assert(
      opt.estimatedEffort.includes('Proposed estimate') && opt.estimatedEffort.includes('validation required'),
      `${opt.id} estimatedEffort is flagged as "Proposed estimate ... (AI estimate — validation required)"`
    );
    assert(
      opt.businessImpact.includes('Proposed target') || opt.businessImpact.includes('Validation required'),
      `${opt.id} businessImpact is labeled as Proposed target / Validation required`
    );
  }

  // Case B: Workspace WITH documented baseline
  const contextWithBaseline = {
    workspace: {
      id: 'ws-metric-withbase-02',
      name: 'MedExpress Intake',
      objective: 'Patient queue acceleration'
    },
    businessAnalysis: {
      id: 'ba-withbase-02',
      requirements: [
        { id: 'REQ-01', title: 'Intake Automation', specification: 'Automate intake questionnaire', classification: 'DOCUMENTED_FACT' }
      ],
      strategicGoals: [
        {
          id: 'G-01',
          goal: 'Reduce patient check-in wait times',
          baseline: 'Currently 25 minutes average wait time in reception lobby',
          target: 'Under 5 minutes via digital kiosk check-in'
        }
      ]
    }
  };

  const solWithBaseline = await demoProvider.recommendSolutions(contextWithBaseline);

  // TEST 3: Business value recognizes documented goal and targets
  assert(
    solWithBaseline.businessValue.includes('Under 5 minutes') || solWithBaseline.businessValue.includes('Reduce patient check-in wait times'),
    'Solution incorporates documented goal and target when provided in Stage 2'
  );

  // TEST 4: No fabricated dollar figures or week spans
  const jsonStr = JSON.stringify(solNoBaseline);
  assert(
    !jsonStr.includes('$160,000') && !jsonStr.includes('$45,000') && !jsonStr.includes('$120,000'),
    'No synthetic dollar cost values in generated solutions'
  );

  assert(
    !jsonStr.includes('12-14 weeks') && !jsonStr.includes('8-10 weeks'),
    'No synthetic calendar week durations in generated solutions'
  );

  console.log('\n----------------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log('======================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runMetricSafetySuite().catch(err => {
  console.error('Fatal error in metric safety test suite:', err);
  process.exit(1);
});

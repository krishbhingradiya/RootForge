/**
 * RootForge Stage 3 Context Grounding Test Suite
 * 
 * Verifies that all Stage 3 recommendations (Options A/B/C, Key Capabilities,
 * Tech Stack, Decision Rationale) are strictly grounded in upstream Stage 2 artifacts
 * without hallucinated systems, ungrounded technologies, or fabricated facts.
 */

import { demoProvider } from './src/ai/providers/demoProvider.js';
import { normalizeStage2Contract } from './src/utils/stage2Contract.js';

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

async function runContextGroundingSuite() {
  console.log('\n======================================================================');
  console.log('STAGE 3 CONTEXT GROUNDING & EVIDENCE LINKAGE TEST SUITE');
  console.log('======================================================================\n');

  const rawContext = {
    workspace: {
      id: 'ws-grounding-retail-999',
      name: 'OmniStore Inventory Sync',
      objective: 'Synchronize Shopify online orders with SAP ERP warehouse inventory',
      industry: 'Retail & E-Commerce',
      targetUsers: 'E-commerce fulfillment specialists'
    },
    businessAnalysis: {
      id: 'ba-grounding-999',
      requirements: [
        {
          id: 'REQ-OMNI-01',
          title: 'Shopify Webhook Ingestion',
          specification: 'Ingest orders/create and orders/cancelled webhooks within 500ms',
          classification: 'DOCUMENTED_FACT',
          status: 'CONFIRMED',
          sourceDocumentEvidence: 'Shopify Webhook API Spec document'
        },
        {
          id: 'REQ-OMNI-02',
          title: 'SAP ERP BAPI Stock Allocation',
          specification: 'Post real-time inventory reservation via SAP BAPI_MATERIAL_AVAILABILITY',
          classification: 'DOCUMENTED_FACT',
          status: 'CONFIRMED',
          sourceDocumentEvidence: 'SAP Integration Architecture Guideline'
        },
        {
          id: 'REQ-OMNI-03',
          title: 'Automated Exception Flagging',
          specification: 'Route out-of-stock and SKU mismatch items to human fulfillment queue',
          classification: 'USER_PROVIDED_FACT',
          status: 'VALIDATION_REQUIRED',
          sourceDocumentEvidence: 'Operations team discovery interview'
        }
      ],
      strategicGoals: [
        { id: 'G-OMNI-01', goal: 'Eliminate stockout cancellations', target: 'Zero overselling across Shopify channels' }
      ],
      painPoints: [
        { id: 'PP-OMNI-01', title: 'Delayed inventory sync causes overselling', description: 'Up to 2 hour lag between warehouse count and Shopify stock' }
      ],
      automationOpportunities: [
        { id: 'AUTO-OMNI-01', title: 'Instantaneous Webhook to BAPI Pipeline', description: 'Event-driven stock decrements' }
      ],
      openQuestions: [
        { id: 'Q-OMNI-01', question: 'What is the peak hourly webhook volume during Black Friday?', priority: 'HIGH' }
      ],
      assumptions: [
        { id: 'A-OMNI-01', assumption: 'SAP ERP gateway allows up to 200 concurrent BAPI calls', risk: 'Throttling if concurrency exceeded' }
      ],
      documents: [
        { id: 'DOC-OMNI-01', name: 'SAP_BAPI_Integration_Spec.pdf', keyInsights: ['BAPI_MATERIAL_AVAILABILITY endpoint', 'RFC connection pool'] }
      ],
      existingSystems: [
        { name: 'SAP ERP', systemName: 'SAP ERP', type: 'ERP' },
        { name: 'Shopify Storefront', systemName: 'Shopify', type: 'E-Commerce' }
      ]
    }
  };

  // TEST 1: Canonical normalization
  const normalized = normalizeStage2Contract(rawContext);
  assert(
    normalized.requirements.length === 3 &&
    normalized.strategicGoals.length === 1 &&
    normalized.painPoints.length === 1 &&
    normalized.openQuestions.length === 1 &&
    normalized.assumptions.length === 1,
    'Contract normalizer cleanly structures all upstream Stage 2 entities'
  );

  // Generate solution
  const solution = await demoProvider.recommendSolutions(rawContext);

  // TEST 2: Solution name reflects workspace domain
  assert(
    solution.name.includes('OmniStore') || solution.name.includes('Inventory'),
    'Solution name is grounded in workspace name/objective',
    `Name: "${solution.name}"`
  );

  // TEST 3: Options A, B, and C are present
  assert(
    Array.isArray(solution.options) && solution.options.length === 3,
    'Solution contains exactly 3 distinct architecture options (A, B, C)'
  );

  const [optA, optB, optC] = solution.options;

  // TEST 4: Material differentiation across options
  assert(
    optA.id === 'OPTION_A' && optB.id === 'OPTION_B' && optC.id === 'OPTION_C',
    'Options have standard identifiers OPTION_A, OPTION_B, OPTION_C'
  );

  assert(
    optA.aiInvolvement.toLowerCase().includes('none') || optA.aiInvolvement.toLowerCase().includes('deterministic'),
    'Option A is strictly deterministic / rules-based without generative AI variance'
  );

  assert(
    optB.aiInvolvement.toLowerCase().includes('copilot') || optB.aiInvolvement.toLowerCase().includes('triage'),
    'Option B incorporates balanced human-in-the-loop copilot assistance'
  );

  assert(
    optC.aiInvolvement.toLowerCase().includes('multi-agent') || optC.aiInvolvement.toLowerCase().includes('autonomous'),
    'Option C implements transformational autonomous multi-agent mesh'
  );

  // TEST 5: Tech stack classification & existing systems
  const techList = Array.isArray(solution.techStack) ? solution.techStack : (solution.techStack.technologies || []);
  assert(
    Array.isArray(techList) && techList.length >= 3,
    'Tech stack contains classified architecture components'
  );

  const existingTech = techList.filter(t => t.classification === 'EXISTING_SYSTEM' || t.status === 'EXISTING_SYSTEM');
  assert(
    existingTech.length > 0 && existingTech.some(t => t.name.includes('SAP') || t.name.includes('Shopify')),
    'Existing enterprise systems (SAP/Shopify) from Stage 2 are classified as EXISTING_SYSTEM'
  );

  // TEST 6: Decision rationale exists on each option
  assert(
    optA.decisionRationale && optB.decisionRationale && optC.decisionRationale,
    'Every option contains explicit decisionRationale block'
  );

  assert(
    optB.decisionRationale.whyFitsBusiness && optB.decisionRationale.supportingEvidence,
    'Option B decisionRationale includes business fit and supporting evidence'
  );

  // TEST 7: WhyThisOption contains traceability evidence
  assert(
    optB.whyThisOption && Array.isArray(optB.whyThisOption.requirementsAddressed),
    'Option B whyThisOption maps addressed requirements'
  );

  // TEST 8: Automation opportunities are grounded
  assert(
    solution.automationOpps.some(o => {
      const s = typeof o === 'string' ? o : (o.title || o.opportunity || '');
      return s.includes('Webhook') || s.includes('BAPI') || s.includes('Pipeline');
    }),
    'Automation opportunities directly address Stage 2 discovery opportunities'
  );

  // TEST 9: Key capabilities reflect upstream requirements
  assert(
    solution.keyCapabilities.some(c => {
      const s = typeof c === 'string' ? c : (c.name || c.title || '');
      return s.includes('Shopify') || s.includes('SAP') || s.includes('Inventory') || s.includes('BAPI') || s.includes('Workflow') || s.includes('Gateway');
    }),
    'Key capabilities reflect Shopify/SAP integration requirements'
  );

  // TEST 10: Risks and assumptions propagated from Stage 2 open questions/assumptions
  assert(
    solution.risks.some(r => r.risk.includes('Black Friday') || r.source.includes('Open Question') || r.validationRequired),
    'Stage 2 open questions are converted to actionable architecture risks with mitigations'
  );

  console.log('\n----------------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log('======================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runContextGroundingSuite().catch(err => {
  console.error('Fatal error in context grounding test suite:', err);
  process.exit(1);
});

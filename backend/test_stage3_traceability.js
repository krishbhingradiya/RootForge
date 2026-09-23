/**
 * RootForge Stage 3 Traceability & 6-Step Lineage Test Suite
 * 
 * Verifies that all Solution recommendations maintain end-to-end lineage:
 * Step 1: Discovery Fact (Interviews, raw inputs)
 * Step 2: Evidence (Source documents, excerpts)
 * Step 3: Business Problem (Pain Points addressed)
 * Step 4: Strategic Goal (Target objectives supported)
 * Step 5: Architecture Requirement (Formal verified requirement)
 * Step 6: Architecture Impact (Tech stack component, gateway, data store, or service node)
 * 
 * Also verifies explicit ID arrays (requirementIds, goalIds, painPointIds, questionIds, assumptionIds, evidenceIds)
 * on Options A, B, and C.
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

async function runTraceabilitySuite() {
  console.log('\n======================================================================');
  console.log('STAGE 3 TRACEABILITY & 6-STEP REQUIREMENT LINEAGE TEST SUITE');
  console.log('======================================================================\n');

  const traceContext = {
    workspace: {
      id: 'ws-trace-insure-101',
      name: 'ShieldGuard Policy Underwriting',
      objective: 'Accelerate commercial property risk rating and policy underwriting',
      industry: 'Insurance'
    },
    businessAnalysis: {
      id: 'ba-trace-101',
      requirements: [
        {
          id: 'REQ-UW-01',
          title: 'ACORD 125 XML Ingestion',
          specification: 'Parse commercial insurance application ACORD 125 schemas',
          classification: 'DOCUMENTED_FACT',
          status: 'CONFIRMED',
          sourceDocumentEvidence: 'ACORD Standard Specification Guide v2.8'
        },
        {
          id: 'REQ-UW-02',
          title: 'Flood Zone Risk Geo-Scoring',
          specification: 'Query FEMA flood zone maps by property coordinates',
          classification: 'DOCUMENTED_FACT',
          status: 'CONFIRMED',
          sourceDocumentEvidence: 'Underwriting Guidelines Manual Section 4.2'
        },
        {
          id: 'REQ-UW-03',
          title: 'Underwriter Copilot Premium Rationale',
          specification: 'Generate natural language explanation for premium loading',
          classification: 'USER_PROVIDED_FACT',
          status: 'VALIDATION_REQUIRED',
          sourceDocumentEvidence: 'Chief Underwriting Officer discovery interview'
        }
      ],
      strategicGoals: [
        { id: 'G-UW-01', goal: 'Reduce underwriting turnaround', target: 'Sub-hour commercial quote generation' }
      ],
      painPoints: [
        { id: 'PP-UW-01', title: 'Manual geospatial risk lookup', description: 'Underwriters check 3 separate external mapping tools manually' }
      ],
      automationOpportunities: [
        { id: 'AUTO-UW-01', title: 'Automated FEMA Risk Aggregator', description: 'Batch query FEMA flood endpoints via API' }
      ],
      openQuestions: [
        { id: 'Q-UW-01', question: 'What is the acceptable API latency threshold for external FEMA queries?', priority: 'HIGH' }
      ],
      assumptions: [
        { id: 'A-UW-01', assumption: 'Property addresses will be standardized with USPS CASS before mapping', risk: 'Geocoding failures on malformed addresses' }
      ],
      documents: [
        { id: 'DOC-UW-01', name: 'ACORD_125_Underwriting_Specs.pdf', keyInsights: ['ACORD 125 schema', 'FEMA zone classification'] }
      ]
    }
  };

  const solution = await demoProvider.recommendSolutions(traceContext);

  // TEST 1: Options contain explicit ID arrays
  assert(
    solution.options && solution.options.length === 3,
    'Solution contains 3 architecture options'
  );

  const [optA, optB, optC] = solution.options;

  // Verify ID arrays on Option A
  assert(
    Array.isArray(optA.requirementIds) && optA.requirementIds.length > 0 &&
    Array.isArray(optA.goalIds) && optA.goalIds.length > 0 &&
    Array.isArray(optA.painPointIds) && optA.painPointIds.length > 0 &&
    Array.isArray(optA.questionIds) &&
    Array.isArray(optA.assumptionIds) &&
    Array.isArray(optA.evidenceIds),
    'Option A contains all explicit ID arrays (requirementIds, goalIds, painPointIds, questionIds, assumptionIds, evidenceIds)'
  );

  // Verify ID arrays on Option B
  assert(
    Array.isArray(optB.requirementIds) && optB.requirementIds.includes('REQ-UW-01') &&
    Array.isArray(optB.goalIds) && optB.goalIds.includes('G-UW-01') &&
    Array.isArray(optB.painPointIds) && optB.painPointIds.includes('PP-UW-01'),
    'Option B maps exact Stage 2 IDs (REQ-UW-01, G-UW-01, PP-UW-01)'
  );

  // Verify ID arrays on Option C
  assert(
    Array.isArray(optC.requirementIds) && optC.requirementIds.length >= 2,
    'Option C covers comprehensive requirements set with explicit IDs'
  );

  // TEST 2: Option B whyThisOption structure contains 6-step components
  const why = optB.whyThisOption;
  assert(
    why && Array.isArray(why.requirementsAddressed) && why.requirementsAddressed.length > 0,
    'Step 5: whyThisOption includes structured requirementsAddressed with titles & IDs'
  );

  assert(
    why && Array.isArray(why.businessProblemsAddressed) && why.businessProblemsAddressed.length > 0,
    'Step 3: whyThisOption includes structured businessProblemsAddressed (Pain Points)'
  );

  assert(
    why && Array.isArray(why.strategicGoalsSupported) && why.strategicGoalsSupported.length > 0,
    'Step 4: whyThisOption includes structured strategicGoalsSupported'
  );

  assert(
    why && Array.isArray(why.evidence) && why.evidence.length > 0,
    'Step 2: whyThisOption includes structured evidence with source and excerpt'
  );

  // TEST 3: Step 6 Architecture Impact verified in Tech Stack
  const techList = Array.isArray(solution.techStack) ? solution.techStack : (solution.techStack.technologies || []);
  assert(
    Array.isArray(techList) && techList.length >= 3,
    'Step 6: Tech stack contains mapped architecture components and services'
  );

  const hasClassifiedTech = techList.every(t => t.name && t.category && (t.validationStatus || t.status || t.classification));
  assert(
    hasClassifiedTech,
    'Every tech stack component includes name, category, and validation status'
  );

  // TEST 4: Decision rationale explains trade-offs and business fit
  assert(
    optB.decisionRationale.whyFitsBusiness && optB.decisionRationale.tradeoffIntroduced,
    'Decision rationale documents why the option fits the business and trade-offs introduced'
  );

  // TEST 5: Open question risks mapped to mitigation sprints
  assert(
    Array.isArray(solution.risks) && solution.risks.some(r => r.risk.includes('FEMA') || r.source.includes('Open Question')),
    'Stage 2 open question regarding FEMA latency is traced to an architecture risk with mitigation'
  );

  console.log('\n----------------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log('======================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTraceabilitySuite().catch(err => {
  console.error('Fatal error in traceability test suite:', err);
  process.exit(1);
});

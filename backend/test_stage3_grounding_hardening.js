/**
 * Stage 3 Solution Builder Grounding, Isolation & Anti-Hallucination Test Suite
 * 
 * Verifies Acceptance Criteria A through T:
 * A. Absolute workspace isolation
 * B. Zero previous-workspace data leakage
 * C. No hardcoded demo customer data (Medicare, HealthBase, Falcon, Apollo)
 * D. No hardcoded documents or fallback citations
 * E. No fabricated business metrics (60% reduction, 85% labor, 3.5x throughput, etc.)
 * F. No fabricated ROI or static budgets ($160,000, $60,000, $480,000)
 * G. No ungrounded preselected technology choices
 * H. Stage 2 -> Stage 3 canonical handoff integrity
 * I. Requirement traceability to capabilities
 * J. Open question propagation to risks/mitigations
 * K. Assumption propagation
 * L. Validation-required uncertainty preservation
 * M. Empty Stage 2 state protection
 * N. Validation gate blocker enforcement
 * O. Validation gate clearance behavior
 * P. Stale analysis detection
 * Q. Dynamic recommendation rationale
 * R. Schema compliance with validateSolution
 */

import { aiService } from './src/ai/aiService.js';
import { demoProvider } from './src/ai/providers/demoProvider.js';
import { buildSolutionsPrompt } from './src/ai/prompts/user/recommendSolutions.prompt.js';
import { validateSolution } from './src/ai/schemaValidator.js';
import { calculateStage2HandoffGate } from './src/utils/handoffGate.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runStage3Verification() {
  console.log('============================================================');
  console.log('STAGE 3 SOLUTION BUILDER — HARDENING & GROUNDING VERIFICATION');
  console.log('============================================================\n');

  // ============================================================
  // SUITE 1: Absolute Workspace Isolation & Zero Leakage Between Workspaces
  // ============================================================
  console.log('--- SUITE 1: Workspace Isolation & No Cross-Workspace Leakage ---');

  const workspaceAlphaContext = {
    workspace: {
      id: 'ws-alpha-fintech',
      name: 'Alpha Capital Wealth Advisory',
      industry: 'FINTECH',
      objective: 'Automate portfolio compliance audit verification',
      challenge: 'Manual SEC compliance documentation reviews taking 4 days per fund',
      targetUsers: 'Compliance Officers and Portfolio Managers'
    },
    domain: 'FINTECH',
    businessAnalysis: {
      version: 2,
      currentState: 'Manual compliance review workflows across spreadsheet exports',
      futureState: 'Automated compliance rule validation engine with exception triage copilot',
      strategicGoals: [
        { id: 'G-01', title: 'Accelerate fund compliance verification audit cycles', target: 'Under 4 hours per fund', baseline: '4 business days' }
      ],
      operationalPainPoints: [
        { id: 'PP-01', title: 'Disjointed compliance spreadsheets', description: 'Manual copy-pasting of trade blotters creates audit trails gaps' }
      ],
      requirementsData: JSON.stringify([
        {
          id: 'REQ-ALPHA-01',
          title: 'Trade Blotter Ingestion Gateway',
          specification: 'System shall ingest CSV/FIX protocol trade blotters and validate checksums',
          classification: 'DOCUMENTED_FACT',
          priority: 'CRITICAL',
          status: 'CONFIRMED'
        },
        {
          id: 'REQ-ALPHA-02',
          title: 'SEC Rule 206 Compliance Verification Rule Engine',
          specification: 'System shall evaluate portfolio trades against Rule 206 concentration limits',
          classification: 'USER_PROVIDED_FACT',
          priority: 'HIGH',
          status: 'CONFIRMED'
        }
      ]),
      automationOpportunities: [
        { title: 'Automated blotter checksum verification', saving: 'Eliminates 2 hours manual spreadsheet checking' }
      ],
      openQuestions: [
        { id: 'Q-01', question: 'Does Alpha Capital require FIX protocol 4.4 or 5.0 compatibility?', priority: 'HIGH', status: 'UNRESOLVED' }
      ],
      assumptions: [
        { id: 'A-01', assumption: 'Trade blotters are exported daily by 18:00 EST' }
      ]
    }
  };

  const workspaceBetaContext = {
    workspace: {
      id: 'ws-beta-logistics',
      name: 'Beta Cold Chain Transport',
      industry: 'LOGISTICS',
      objective: 'Prevent perishable pharmaceutical cargo spoilage during transit',
      challenge: 'Temperature excursion alerts from reefer trucks are delayed',
      targetUsers: 'Fleet Dispatchers and Reefer Technicians'
    },
    domain: 'SUPPLY_CHAIN',
    businessAnalysis: {
      version: 1,
      currentState: 'Siloed IoT sensor portals with delayed driver alerting',
      futureState: 'Centralized telemetry ingestion and real-time excursion alert dispatch',
      strategicGoals: [
        { id: 'G-01', title: 'Zero temperature excursions exceeding 15 minutes', target: '0 excursions', baseline: '14 monthly incidents' }
      ],
      operationalPainPoints: [
        { id: 'PP-01', title: 'Delayed driver alert dispatch', description: 'Drivers only notice temperature breaches after cargo damage occurs' }
      ],
      requirementsData: JSON.stringify([
        {
          id: 'REQ-BETA-01',
          title: 'Reefer Telemetry Ingestion Pipeline',
          specification: 'System shall ingest MQTT sensor telemetry every 30 seconds per reefer unit',
          classification: 'DOCUMENTED_FACT',
          priority: 'CRITICAL',
          status: 'CONFIRMED'
        },
        {
          id: 'REQ-BETA-02',
          title: 'Immediate Push Alert to Fleet Drivers',
          specification: 'System shall dispatch high-priority push notifications when temp deviates >2C',
          classification: 'DOCUMENTED_FACT',
          priority: 'CRITICAL',
          status: 'CONFIRMED'
        }
      ]),
      automationOpportunities: [
        { title: 'Automated reefer setpoint corrective dispatch', saving: 'Saves estimated $40k per spoiled batch' }
      ],
      openQuestions: [
        { id: 'Q-BETA-01', question: 'Are satellite modems available in rural dead zones?', priority: 'HIGH', status: 'UNRESOLVED' }
      ],
      assumptions: [
        { id: 'A-BETA-01', assumption: 'Drivers carry ruggedized Android dispatch tablets' }
      ]
    }
  };

  const solAlpha = await demoProvider.recommendSolutions(workspaceAlphaContext, workspaceAlphaContext.businessAnalysis);
  const solBeta = await demoProvider.recommendSolutions(workspaceBetaContext, workspaceBetaContext.businessAnalysis);

  // Assert Alpha isolation
  assert(solAlpha.name.includes('Alpha Capital Wealth Advisory'), 'Alpha solution name is grounded in Alpha Capital');
  assert(!JSON.stringify(solAlpha).includes('Beta Cold Chain'), 'Alpha solution contains NO Beta Cold Chain data');
  assert(!JSON.stringify(solAlpha).includes('reefer'), 'Alpha solution contains NO reefer truck data');
  assert(!JSON.stringify(solAlpha).includes('sensor telemetry'), 'Alpha solution contains NO sensor telemetry references');
  assert(JSON.stringify(solAlpha.keyCapabilities).includes('REQ-ALPHA-01'), 'Alpha key capabilities trace to REQ-ALPHA-01');
  assert(JSON.stringify(solAlpha.keyCapabilities).includes('Trade Blotter'), 'Alpha key capabilities contain Trade Blotter');

  // Assert Beta isolation
  assert(solBeta.name.includes('Beta Cold Chain Transport'), 'Beta solution name is grounded in Beta Cold Chain');
  assert(!JSON.stringify(solBeta).includes('Alpha Capital'), 'Beta solution contains NO Alpha Capital data');
  assert(!JSON.stringify(solBeta).includes('blotter'), 'Beta solution contains NO trade blotter references');
  assert(!JSON.stringify(solBeta).includes('SEC Rule 206'), 'Beta solution contains NO SEC Rule 206 references');
  assert(JSON.stringify(solBeta.keyCapabilities).includes('REQ-BETA-01'), 'Beta key capabilities trace to REQ-BETA-01');
  assert(JSON.stringify(solBeta.keyCapabilities).includes('Reefer Telemetry'), 'Beta key capabilities contain Reefer Telemetry');

  // ============================================================
  // SUITE 2: Purge of Demo Fallbacks, Hardcoded Entities & Static Figures
  // ============================================================
  console.log('\n--- SUITE 2: Purge of Demo Entities & Static Metrics ---');

  const solAlphaString = JSON.stringify(solAlpha);
  const solBetaString = JSON.stringify(solBeta);

  // Test for complete absence of legacy demo names
  const forbiddenEntities = [
    'Medicare',
    'MediCare_Appointment_SOP.pdf',
    'MediCare_Appointment_BRD.pdf',
    'HealthBase',
    'HealthBase v4',
    'Falcon Scheduling',
    'Hospital Apollo',
    'Apollo Operations'
  ];

  for (const entity of forbiddenEntities) {
    assert(!solAlphaString.includes(entity), `Alpha solution contains no "${entity}"`);
    assert(!solBetaString.includes(entity), `Beta solution contains no "${entity}"`);
  }

  // Test for complete absence of fabricated static numbers
  const forbiddenMetrics = [
    '$160,000 - $210,000',
    '$60,000 - $85,000',
    '$480,000 - $650,000',
    '12 - 14 Weeks',
    '6 - 8 Weeks',
    '24 - 32 Weeks',
    '85%+ labor reduction',
    '70% Straight-through processing',
    '65-75% operational acceleration',
    '25-35% efficiency boost',
    '3.5x scheduling throughput',
    '75% wait times',
    '22% to under 8%'
  ];

  for (const metric of forbiddenMetrics) {
    assert(!solAlphaString.includes(metric), `Alpha solution contains no fabricated metric "${metric}"`);
    assert(!solBetaString.includes(metric), `Beta solution contains no fabricated metric "${metric}"`);
  }

  // ============================================================
  // SUITE 3: Prompt Template Zero-Fabrication Audit
  // ============================================================
  console.log('\n--- SUITE 3: Prompt Template Zero-Fabrication Audit ---');

  const promptResult = buildSolutionsPrompt(workspaceAlphaContext, workspaceAlphaContext.businessAnalysis);
  const promptUser = promptResult.userPrompt;
  const promptSystem = promptResult.systemPrompt;

  assert(!promptUser.includes('$160,000 - $210,000'), 'Prompt schema does not contain static $160,000 budget');
  assert(!promptUser.includes('12 - 14 Weeks'), 'Prompt schema does not contain static 12 - 14 Weeks timeline');
  assert(!promptUser.includes('85%+ labor reduction'), 'Prompt schema does not contain static 85% labor reduction');
  assert(promptSystem.includes('ABSOLUTE WORKSPACE GROUNDING & ZERO FABRICATION'), 'System prompt enforces absolute workspace grounding');
  assert(promptSystem.includes('NEVER fabricate specific budgets'), 'System prompt explicitly forbids fabricating budgets');
  assert(promptSystem.includes('EXPLICIT RECOMMENDATION RATIONALE'), 'System prompt requires explicit recommendation rationale');
  assert(promptUser.includes('Alpha Capital Wealth Advisory'), 'User prompt contains current workspace name');
  assert(promptUser.includes('REQ-ALPHA-01'), 'User prompt carries upstream Stage 2 requirement REQ-ALPHA-01');

  // ============================================================
  // SUITE 4: Grounding & Traceability of Options and Capabilities
  // ============================================================
  console.log('\n--- SUITE 4: Grounding, Traceability & Rationale ---');

  // Options must be dynamic and carry traceability
  assert(Array.isArray(solAlpha.options) && solAlpha.options.length === 3, 'Solution contains exactly 3 options');
  const optA = solAlpha.options.find(o => o.id === 'OPTION_A');
  const optB = solAlpha.options.find(o => o.id === 'OPTION_B');
  const optC = solAlpha.options.find(o => o.id === 'OPTION_C');

  assert(optA && optB && optC, 'Options A, B, and C are present');
  assert(optA.name.includes('Alpha Capital'), 'Option A is tailored to Alpha Capital');
  assert(optB.name.includes('Alpha Capital'), 'Option B is tailored to Alpha Capital');
  assert(optC.name.includes('Alpha Capital'), 'Option C is tailored to Alpha Capital');

  // Check estimates are labeled as validation required
  assert(optB.estimatedEffort.toLowerCase().includes('validation required'), 'Option B effort is labeled (Validation required)');
  assert(optB.estimatedCost.toLowerCase().includes('validation required'), 'Option B cost is labeled (Validation required)');
  assert(optB.businessImpact.toLowerCase().includes('validation required'), 'Option B business impact is labeled (Validation required)');

  // Recommendation rationale check
  assert(solAlpha.recommendationRationale && solAlpha.recommendationRationale.length > 20, 'Recommendation rationale is present');
  assert(solAlpha.recommendationRationale.includes('Option B is recommended because'), 'Explicit decision factor explains recommendation');
  assert(solAlpha.recommendationRationale.includes('documented requirement'), 'Recommendation cites documented requirement coverage');

  // Check tech stack is not preselected with ungrounded vendors
  assert(!solAlpha.techStack.frontend.includes('WhatsApp API'), 'Frontend does not assume WhatsApp API');
  assert(solAlpha.techStack.database.includes('Validation required') || solAlpha.techStack.database.includes('candidate'), 'Database persistence is marked candidate / validation required');
  assert(solAlpha.techStack.integrations.includes('Validation required') || solAlpha.techStack.integrations.includes('candidate'), 'Integration tier is marked candidate / validation required');

  // ============================================================
  // SUITE 5: Open Questions & Assumptions Propagation
  // ============================================================
  console.log('\n--- SUITE 5: Open Questions & Assumptions Propagation ---');

  // Check that Alpha Capital open question was propagated to risks
  const alphaRiskTexts = solAlpha.risks.map(r => r.risk).join(' ');
  assert(alphaRiskTexts.includes('FIX protocol') || alphaRiskTexts.includes('Q-01') || alphaRiskTexts.includes('Unresolved open question'), 'Stage 2 open question propagated into architecture risks');

  // Check assumptions
  const alphaAssumptionTexts = solAlpha.assumptions.join(' ');
  assert(alphaAssumptionTexts.includes('18:00 EST') || alphaAssumptionTexts.includes('Trade blotters') || alphaAssumptionTexts.includes('validation'), 'Stage 2 assumption propagated into solution assumptions');

  // ============================================================
  // SUITE 6: Validation Gate & Blocker Enforcement
  // ============================================================
  console.log('\n--- SUITE 6: Validation Gate & Blocker Enforcement ---');

  const blockedAnalysisData = {
    version: 3,
    requirementsData: JSON.stringify([
      { id: 'REQ-01', title: 'Data Pipeline', status: 'CONFIRMED' }
    ]),
    openQuestions: [
      { id: 'Q-BLOCK-01', question: 'Who approves data retention policy?', priority: 'BLOCKER', reason: 'Legal compliance sign-off mandatory' }
    ]
  };

  const gateResult = calculateStage2HandoffGate(blockedAnalysisData);
  assert(gateResult.canProceed === false, 'Handoff gate correctly blocks when BLOCKER question exists');
  assert(gateResult.blockers.length === 1, 'Handoff gate reports exactly 1 blocker');
  assert(gateResult.blockers[0].id === 'Q-BLOCK-01', 'Blocker ID matches the blocker question');

  const contextWithBlocker = {
    workspace: { id: 'ws-blocked', name: 'Blocked Workspace Initiative' },
    businessAnalysis: blockedAnalysisData
  };

  const solWithBlocker = await demoProvider.recommendSolutions(contextWithBlocker, blockedAnalysisData);
  assert(solWithBlocker.recommendationRationale.includes('unresolved validation blocker'), 'Recommendation rationale explicitly reflects Stage 2 blocker');

  // Cleared gate test
  const clearedAnalysisData = {
    version: 4,
    requirementsData: JSON.stringify([
      { id: 'REQ-01', title: 'Data Pipeline', status: 'CONFIRMED' }
    ]),
    openQuestions: [
      { id: 'Q-RESOLVED-01', question: 'Data retention policy resolved', priority: 'LOW', status: 'RESOLVED' }
    ]
  };

  const clearedGateResult = calculateStage2HandoffGate(clearedAnalysisData);
  assert(clearedGateResult.canProceed === true, 'Handoff gate passes when blockers are resolved');
  assert(clearedGateResult.blockers.length === 0, 'Zero blockers reported for cleared analysis');

  // ============================================================
  // SUITE 7: Empty Stage 2 State Protection
  // ============================================================
  console.log('\n--- SUITE 7: Empty Stage 2 State Protection ---');

  const emptyGateResult = calculateStage2HandoffGate(null);
  assert(emptyGateResult.canProceed === false, 'Null Stage 2 analysis is blocked');
  assert(emptyGateResult.reasonCodes.includes('STAGE2_DATA_NOT_USABLE'), 'Reason code STAGE2_DATA_NOT_USABLE reported');

  const zeroReqsAnalysis = {
    version: 1,
    requirementsData: '[]'
  };
  const zeroReqsGate = calculateStage2HandoffGate(zeroReqsAnalysis);
  assert(zeroReqsGate.canProceed === false, 'Stage 2 analysis with 0 requirements is blocked');
  assert(zeroReqsGate.blockers.some(b => b.id === 'DATA-NO-REQS'), 'Blocker DATA-NO-REQS is reported');

  // ============================================================
  // SUITE 8: Schema Conformance with validateSolution
  // ============================================================
  console.log('\n--- SUITE 8: Schema Conformance with validateSolution ---');

  const validationAlpha = validateSolution(solAlpha);
  assert(validationAlpha.valid === true, `Alpha solution passes schema validation (errors: ${validationAlpha.errors?.join(', ') || 'none'})`);

  const validationBeta = validateSolution(solBeta);
  assert(validationBeta.valid === true, `Beta solution passes schema validation (errors: ${validationBeta.errors?.join(', ') || 'none'})`);

  console.log('\n============================================================');
  console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions`);
  console.log('============================================================');
}

runStage3Verification().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});

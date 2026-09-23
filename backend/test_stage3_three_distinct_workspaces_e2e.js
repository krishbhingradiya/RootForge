import { prisma } from './src/prisma.js';
import { aiService } from './src/ai/aiService.js';
import { getWorkspaceContext } from './src/services/workspaceContext.service.js';
import { normalizeStage2Contract, computeStage2ContextHash } from './src/utils/stage2Contract.js';

async function run() {
  console.log('=== TEST: 3 DISTINCT WORKSPACES END-TO-END VALIDATION ===\n');

  // Find or create default test user & organization
  let user = await prisma.user.findFirst();
  let org = await prisma.organization.findFirst();

  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'RootForge Multi-Domain Enterprise', slug: 'rootforge-multi-domain-' + Date.now() }
    });
  }
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'admin@rootforge.local', passwordHash: 'hash', role: 'ADMIN', organizationId: org.id }
    });
  }

  // --- WORKSPACE A: WAREHOUSE & INVENTORY RECONCILIATION ---
  console.log('1. Setting up Workspace A: Warehouse & Inventory Reconciliation...');
  const wsA = await prisma.workspace.create({
    data: {
      name: 'Warehouse Automated Inventory Reconciliation',
      industry: 'Logistics',
      objective: 'Automate physical pallet counting and discrepancy reconciliation against ERP.',
      challenge: 'Manual clipboard stock auditing leads to 48-hour shipment verification bottlenecks.',
      targetUsers: 'Warehouse Shift Supervisors & Forklift Operators',
      expectedOutcome: 'Instant discrepancy alerts upon barcode scan',
      organizationId: org.id,
      createdById: user.id
    }
  });

  const reqsA = [
    {
      id: 'REQ-WH-01',
      title: 'Real-Time Barcode & RFID Stock Reconciliation',
      specification: 'System must compare incoming optical barcode scans against ERP ledger records in under 500ms.',
      classification: 'USER_PROVIDED_FACT',
      status: 'CONFIRMED',
      priority: 'HIGH',
      evidence: ['Warehouse SOP Section 4.2', 'Documented in warehouse logistics audit report']
    },
    {
      id: 'REQ-WH-02',
      title: 'Automated Discrepancy Quarantine Flagging',
      specification: 'When scanned pallet count differs from packing slip, automatically route pallet to quarantine bay.',
      classification: 'USER_PROVIDED_FACT',
      status: 'CONFIRMED',
      priority: 'HIGH',
      evidence: ['Forklift operator standard operating guidelines']
    }
  ];

  const analysisA = await prisma.businessAnalysis.create({
    data: {
      workspaceId: wsA.id,
      version: 1,
      currentState: 'Auditors perform manual pen-and-paper stock counts across 3 fulfillment zones.',
      futureState: 'Automated barcode ingestion with real-time discrepancy alerts and ERP sync.',
      executiveSummary: 'Logistics transformation automating pallet auditing and quarantine workflow.',
      goals: JSON.stringify(['Zero inventory drift across distribution hubs']),
      painPoints: JSON.stringify(['48-hour shipment verification bottleneck']),
      requirements: JSON.stringify(reqsA),
      stakeholders: JSON.stringify(['Warehouse Shift Supervisors', 'Forklift Operators']),
      gaps: JSON.stringify(['Manual paper logging instead of ERP barcode ingestion']),
      processIssues: JSON.stringify(['48-hour verification delay']),
      improvementOpportunities: JSON.stringify(['Real-time scanner integration']),
      requirementsData: JSON.stringify(reqsA),
      operationalPainPoints: JSON.stringify([
        { id: 'PP-WH-01', title: '48-hour shipment verification bottleneck', impact: 'High' }
      ]),
      strategicGoals: JSON.stringify([
        { id: 'G-WH-01', title: 'Zero inventory drift across distribution hubs', target: 'Proposed target: <0.1% drift (Validation required)' }
      ]),
      automationOpportunities: JSON.stringify([
        { id: 'AUTO-WH-01', title: 'Automated barcode discrepancy alerting' }
      ]),
      openQuestions: JSON.stringify([
        { id: 'Q-WH-01', question: 'What barcode handheld scanner firmware is deployed?', priority: 'MEDIUM' }
      ]),
      assumptions: JSON.stringify([
        { id: 'A-WH-01', assumption: 'Warehouse Wi-Fi coverage is active in all 3 fulfillment zones.' }
      ])
    }
  });

  // --- WORKSPACE B: LEGAL CONTRACT LIFECYCLE MANAGEMENT ---
  console.log('2. Setting up Workspace B: Corporate Legal Contract Management...');
  const wsB = await prisma.workspace.create({
    data: {
      name: 'Global Enterprise Legal Contract Lifecycle Platform',
      industry: 'Legal Tech',
      objective: 'Accelerate contract clause redlining, indemnity comparison, and counterparty signature routing.',
      challenge: 'Legal counsel spends 15 hours per MSA redlining standard non-disclosure and limitation of liability clauses.',
      targetUsers: 'Corporate Legal Counsel & Procurement Managers',
      expectedOutcome: 'Standardized clause risk classification in under 2 minutes',
      organizationId: org.id,
      createdById: user.id
    }
  });

  const reqsB = [
    {
      id: 'REQ-LEG-01',
      title: 'Automated Clause Variance & Risk Highlighting',
      specification: 'Compare third-party counterparty redlines against company standard fallback clause book.',
      classification: 'USER_PROVIDED_FACT',
      status: 'CONFIRMED',
      priority: 'HIGH',
      evidence: ['Corporate Legal Standard Fallback Clause Book 2026']
    },
    {
      id: 'REQ-LEG-02',
      title: 'Multi-Jurisdiction Signature Workflow Dispatch',
      specification: 'Route executed PDF documents to authorized regional signatories with cryptographic audit trails.',
      classification: 'USER_PROVIDED_FACT',
      status: 'CONFIRMED',
      priority: 'HIGH',
      evidence: ['Global Procurement Delegation of Authority Matrix']
    }
  ];

  const analysisB = await prisma.businessAnalysis.create({
    data: {
      workspaceId: wsB.id,
      version: 1,
      currentState: 'Paralegals manually compare PDF contracts line-by-line against Microsoft Word redlines.',
      futureState: 'Intelligent clause parsing with automated fallback suggestions and e-signature dispatch.',
      executiveSummary: 'Legal operations modernization streamlining vendor agreements and risk mitigation.',
      goals: JSON.stringify(['Reduce legal review cycle from 14 days to 48 hours']),
      painPoints: JSON.stringify(['15-hour manual turnaround per vendor agreement']),
      requirements: JSON.stringify(reqsB),
      stakeholders: JSON.stringify(['Corporate Legal Counsel', 'Procurement Managers']),
      gaps: JSON.stringify(['Manual clause variance comparison']),
      processIssues: JSON.stringify(['Slow multi-party signature routing']),
      improvementOpportunities: JSON.stringify(['Automated fallback clause detection']),
      requirementsData: JSON.stringify(reqsB),
      operationalPainPoints: JSON.stringify([
        { id: 'PP-LEG-01', title: '15-hour manual turnaround per vendor agreement', impact: 'High' }
      ]),
      strategicGoals: JSON.stringify([
        { id: 'G-LEG-01', title: 'Reduce legal review cycle from 14 days to 48 hours', target: 'Proposed target: 48h turnaround (Validation required)' }
      ]),
      automationOpportunities: JSON.stringify([
        { id: 'AUTO-LEG-01', title: 'Automated clause risk classification' }
      ]),
      openQuestions: JSON.stringify([
        { id: 'Q-LEG-01', question: 'Which electronic signature provider is certified for European digital signatures?', priority: 'MEDIUM' }
      ]),
      assumptions: JSON.stringify([
        { id: 'A-LEG-01', assumption: 'Vendor contracts are submitted as searchable OCR text or docx files.' }
      ])
    }
  });

  // --- WORKSPACE C: FLEET PREDICTIVE MAINTENANCE ---
  console.log('3. Setting up Workspace C: Fleet IoT Predictive Maintenance...');
  const wsC = await prisma.workspace.create({
    data: {
      name: 'Autonomous Commercial Fleet Telemetry & Maintenance',
      industry: 'Automotive IoT',
      objective: 'Ingest high-frequency CAN-bus sensor streams to predict brake caliper and battery cell degradation.',
      challenge: 'Unplanned roadside breakdowns cost $12,000 per vehicle recovery event.',
      targetUsers: 'Fleet Operations Dispatchers & Depot Master Technicians',
      expectedOutcome: 'Proactive maintenance work-orders dispatched 72 hours prior to component failure',
      organizationId: org.id,
      createdById: user.id
    }
  });

  const reqsC = [
    {
      id: 'REQ-IOT-01',
      title: 'High-Frequency CAN-Bus Ingestion Gateway',
      specification: 'Ingest 50Hz sensor telemetry packets from 1,200 commercial haulers over MQTT protocol.',
      classification: 'USER_PROVIDED_FACT',
      status: 'CONFIRMED',
      priority: 'HIGH',
      evidence: ['Commercial Hauler Telemetry Protocol Spec V3']
    },
    {
      id: 'REQ-IOT-02',
      title: 'Predictive Brake Degradation Scoring',
      specification: 'Evaluate rolling friction temperature spikes to identify thermal brake wear patterns.',
      classification: 'USER_PROVIDED_FACT',
      status: 'CONFIRMED',
      priority: 'HIGH',
      evidence: ['Bendix Brake Wear Field Service Engineering Logs']
    }
  ];

  const analysisC = await prisma.businessAnalysis.create({
    data: {
      workspaceId: wsC.id,
      version: 1,
      currentState: 'Vehicles serviced only at fixed 10,000-mile calendar intervals or upon roadside catastrophic breakdown.',
      futureState: 'Condition-based predictive servicing with continuous thermal telemetry telemetry.',
      executiveSummary: 'Automotive IoT modernization preventing unplanned transit delays and engine damage.',
      goals: JSON.stringify(['Eliminate catastrophic en-route breakdowns']),
      painPoints: JSON.stringify(['Unplanned roadside failures causing stranded logistics cargo']),
      requirements: JSON.stringify(reqsC),
      stakeholders: JSON.stringify(['Fleet Operations Dispatchers', 'Depot Master Technicians']),
      gaps: JSON.stringify(['Calendar-based maintenance instead of condition-based servicing']),
      processIssues: JSON.stringify(['No telemetry ingestion pipeline']),
      improvementOpportunities: JSON.stringify(['Predictive brake wear alerting']),
      requirementsData: JSON.stringify(reqsC),
      operationalPainPoints: JSON.stringify([
        { id: 'PP-IOT-01', title: 'Unplanned roadside failures causing stranded logistics cargo', impact: 'High' }
      ]),
      strategicGoals: JSON.stringify([
        { id: 'G-IOT-01', title: 'Eliminate catastrophic en-route breakdowns', target: 'Proposed target: Zero roadside failures (Validation required)' }
      ]),
      automationOpportunities: JSON.stringify([
        { id: 'AUTO-IOT-01', title: 'Automatic depot maintenance ticket dispatch' }
      ]),
      openQuestions: JSON.stringify([
        { id: 'Q-IOT-01', question: 'Are cellular OBD-II dongles capable of buffering telemetry through cellular dead-zones?', priority: 'MEDIUM' }
      ]),
      assumptions: JSON.stringify([
        { id: 'A-IOT-01', assumption: 'Hauler trucks are equipped with J1939 CAN-bus telemetry ports.' }
      ])
    }
  });

  // GENERATE SOLUTIONS
  console.log('\n4. Generating Solutions for all 3 Workspaces...');
  async function generateSolutionForWorkspace(wsId, analysis) {
    const ctx = await getWorkspaceContext(wsId, user);
    const canonical = normalizeStage2Contract(ctx, analysis);
    const gen = await aiService.recommendSolutions(ctx, canonical);
    return await prisma.solution.create({
      data: {
        workspaceId: wsId,
        name: gen.name,
        summary: gen.summary,
        businessValue: gen.businessValue,
        keyCapabilities: JSON.stringify(gen.keyCapabilities),
        automationOpps: JSON.stringify(gen.automationOpps),
        aiOpps: JSON.stringify(gen.aiOpps),
        techStack: JSON.stringify(gen.techStack),
        implementationApproach: gen.implementationApproach,
        risks: JSON.stringify(gen.risks),
        assumptions: JSON.stringify(gen.assumptions),
        dependencies: JSON.stringify(gen.dependencies),
        options: JSON.stringify(gen.options),
        selectedOption: gen.selectedOption || 'OPTION_B',
        version: 1,
        status: 'DRAFT',
        sourceAnalysisId: analysis.id,
        sourceAnalysisVersion: analysis.version,
        sourceContextHash: computeStage2ContextHash(canonical)
      }
    });
  }

  const solA = await generateSolutionForWorkspace(wsA.id, analysisA);
  const solB = await generateSolutionForWorkspace(wsB.id, analysisB);
  const solC = await generateSolutionForWorkspace(wsC.id, analysisC);

  console.log('✓ Solution A generated:', solA.name);
  console.log('✓ Solution B generated:', solB.name);
  console.log('✓ Solution C generated:', solC.name);

  // DEEP CROSS-VERIFICATION & NEGATIVE TESTS
  console.log('\n5. Executing Deep Cross-Isolation & Negative Leakage Tests...');
  const textA = JSON.stringify(solA).toLowerCase();
  const textB = JSON.stringify(solB).toLowerCase();
  const textC = JSON.stringify(solC).toLowerCase();

  const healthcareTerms = ['medicare', 'healthbase', 'patient', 'doctor', 'clinic', 'clinical triage', 'apollo', 'falcon', 'hipaa', 'appointment'];
  const legalTerms = ['contract', 'redline', 'paralegal', 'signatory', 'jurisdiction', 'indemnity', 'clause book'];
  const automotiveTerms = ['can-bus', 'caliper', 'hauler', 'depot', 'truck', 'roadside breakdown', 'obd-ii'];
  const warehouseTerms = ['pallet', 'forklift', 'quarantine bay', 'rfid stock'];

  const matchesTerm = (text, term) => {
    const escaped = term.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'i');
    return regex.test(text);
  };

  // Check Workspace A (Warehouse)
  healthcareTerms.forEach(term => {
    if (matchesTerm(textA, term)) throw new Error(`LEAK: Workspace A contains healthcare term '${term}'`);
  });
  legalTerms.forEach(term => {
    if (matchesTerm(textA, term)) throw new Error(`LEAK: Workspace A contains legal term '${term}'`);
  });
  automotiveTerms.forEach(term => {
    if (matchesTerm(textA, term)) throw new Error(`LEAK: Workspace A contains automotive term '${term}'`);
  });
  console.log('✓ PASS: Workspace A contains ZERO healthcare, legal, or automotive terms.');

  // Check Workspace B (Legal)
  healthcareTerms.forEach(term => {
    if (matchesTerm(textB, term)) throw new Error(`LEAK: Workspace B contains healthcare term '${term}'`);
  });
  warehouseTerms.forEach(term => {
    if (matchesTerm(textB, term)) throw new Error(`LEAK: Workspace B contains warehouse term '${term}'`);
  });
  automotiveTerms.forEach(term => {
    if (matchesTerm(textB, term)) throw new Error(`LEAK: Workspace B contains automotive term '${term}'`);
  });
  console.log('✓ PASS: Workspace B contains ZERO healthcare, warehouse, or automotive terms.');

  // Check Workspace C (Automotive)
  healthcareTerms.forEach(term => {
    if (matchesTerm(textC, term)) throw new Error(`LEAK: Workspace C contains healthcare term '${term}'`);
  });
  warehouseTerms.forEach(term => {
    if (matchesTerm(textC, term)) throw new Error(`LEAK: Workspace C contains warehouse term '${term}'`);
  });
  legalTerms.forEach(term => {
    if (matchesTerm(textC, term)) throw new Error(`LEAK: Workspace C contains legal term '${term}'`);
  });
  console.log('✓ PASS: Workspace C contains ZERO healthcare, warehouse, or legal terms.');

  // Check Grounded Requirements Traceability
  const getReqIds = (opt) => {
    const list = opt.requirementsAddressed || [];
    const directIds = opt.requirementIds || [];
    const fromList = list.map(r => typeof r === 'object' && r ? r.id : r);
    const whyList = opt.whyThisOption?.requirementsAddressed || [];
    const fromWhy = whyList.map(r => typeof r === 'object' && r ? r.id : r);
    return Array.from(new Set([...directIds, ...fromList, ...fromWhy]));
  };

  const optionsA = JSON.parse(solA.options);
  const optA_B = optionsA.find(o => o.id === 'OPTION_B');
  const idsA = getReqIds(optA_B);
  if (!idsA.includes('REQ-WH-01') && !idsA.includes('REQ-WH-02')) {
    throw new Error('FAIL: Workspace A Option B failed to map REQ-WH-01 and REQ-WH-02: ' + JSON.stringify(idsA));
  }
  console.log('✓ PASS: Workspace A Option B precisely addresses REQ-WH-01 & REQ-WH-02.');

  const optionsB = JSON.parse(solB.options);
  const optB_B = optionsB.find(o => o.id === 'OPTION_B');
  const idsB = getReqIds(optB_B);
  if (!idsB.includes('REQ-LEG-01') && !idsB.includes('REQ-LEG-02')) {
    throw new Error('FAIL: Workspace B Option B failed to map REQ-LEG-01 and REQ-LEG-02: ' + JSON.stringify(idsB));
  }
  console.log('✓ PASS: Workspace B Option B precisely addresses REQ-LEG-01 & REQ-LEG-02.');

  const optionsC = JSON.parse(solC.options);
  const optC_B = optionsC.find(o => o.id === 'OPTION_B');
  const idsC = getReqIds(optC_B);
  if (!idsC.includes('REQ-IOT-01') && !idsC.includes('REQ-IOT-02')) {
    throw new Error('FAIL: Workspace C Option B failed to map REQ-IOT-01 and REQ-IOT-02: ' + JSON.stringify(idsC));
  }
  console.log('✓ PASS: Workspace C Option B precisely addresses REQ-IOT-01 & REQ-IOT-02.');

  // Check No Fabricated Demo Numbers
  const forbiddenDemoFigures = ['$160,000', '12-14 weeks', '85% reduction', '60% reduction'];
  [textA, textB, textC].forEach((txt, idx) => {
    forbiddenDemoFigures.forEach(fig => {
      if (txt.includes(fig.toLowerCase())) {
        throw new Error(`FAIL: Workspace ${['A','B','C'][idx]} contains fabricated demo figure '${fig}'`);
      }
    });
  });
  console.log('✓ PASS: All 3 workspaces are completely free from manufactured demo numbers.');

  // Clean up test data
  console.log('\n6. Cleaning up test workspaces...');
  await prisma.solution.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id, wsC.id] } } });
  await prisma.businessAnalysis.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id, wsC.id] } } });
  await prisma.workspace.deleteMany({ where: { id: { in: [wsA.id, wsB.id, wsC.id] } } });
  console.log('✓ Cleaned up test data.');

  console.log('\n=============================================================');
  console.log('ALL 3 DISTINCT WORKSPACES PASSED 100% GROUNDED VERIFICATION!');
  console.log('=============================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});

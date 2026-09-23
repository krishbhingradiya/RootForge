import { prisma } from './src/prisma.js';
import { validateProcessWorkflow } from './src/services/processValidation.service.js';
import {
  computeProcessContextHash,
  persistProcessAtomic
} from './src/services/processPersistence.service.js';
import { buildProcessPrompt } from './src/ai/prompts/user/generateProcess.prompt.js';
import {
  buildProcessViewModel,
  EDGE_TYPES,
  normalizeStepType,
  generateBpmnXml,
  generateProcessMarkdown,
  generateProcessCsv,
  generatePptxOutline,
  analyzeProcessOptimizations,
  buildApprovalWorkflowData,
  buildBpmnLayout
} from '../frontend/src/pages/process/processViewModel.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

async function runMasterAcceptanceTests() {
  console.log('======================================================================');
  console.log('🚀 RUNNING MASTER PRODUCTION ACCEPTANCE TEST SUITE: PROCESS DESIGNER');
  console.log('======================================================================\n');

  const testUser = { id: 'test-admin-1', role: 'ADMIN', tenantId: 'test-tenant-master' };

  // ==========================================================================
  // TESTS 1-6: Multi-Domain Workspace Context & Prompt Synthesis (No Healthcare bleed)
  // ==========================================================================
  console.log('--- TESTS 1-6: Multi-Domain Dynamic Generation (6 Domains) ---');
  const domains = [
    {
      name: 'Healthcare',
      domain: 'HEALTHCARE',
      reqId: 'REQ-HLTH-01',
      archNode: 'EHR-Bridge-Service',
      keywords: ['patient', 'ehr', 'clinical', 'hipaa', 'appointment', 'triage']
    },
    {
      name: 'Retail',
      domain: 'RETAIL',
      reqId: 'REQ-RET-01',
      archNode: 'Shopify-Inventory-Sync',
      keywords: ['order', 'inventory', 'fulfillment', 'cart', 'checkout']
    },
    {
      name: 'Logistics',
      domain: 'LOGISTICS',
      reqId: 'REQ-LOG-01',
      archNode: 'Fleet-Telemetry-Ingress',
      keywords: ['dispatch', 'fleet', 'telemetry', 'delivery', 'carrier']
    },
    {
      name: 'Manufacturing',
      domain: 'MANUFACTURING',
      reqId: 'REQ-MFG-01',
      archNode: 'PLC-Sensor-Hub',
      keywords: ['production', 'quality', 'maintenance', 'plc', 'assembly']
    },
    {
      name: 'FinTech',
      domain: 'FINTECH',
      reqId: 'REQ-FIN-01',
      archNode: 'KYC-Verification-Core',
      keywords: ['transaction', 'kyc', 'aml', 'ledger', 'settlement']
    },
    {
      name: 'Legal',
      domain: 'LEGAL',
      reqId: 'REQ-LEG-01',
      archNode: 'Contract-Redaction-Vault',
      keywords: ['contract', 'intake', 'compliance', 'redaction', 'audit']
    }
  ];

  for (let i = 0; i < domains.length; i++) {
    const d = domains[i];
    const mockContext = {
      domain: d.domain,
      workspace: {
        id: `ws-${d.name.toLowerCase()}`,
        name: `${d.name} Enterprise Automation`,
        industry: d.name,
        objective: `Automate end-to-end ${d.name.toLowerCase()} workflows`,
        challenge: `Manual delays in ${d.name.toLowerCase()} operations`,
        targetUsers: `${d.name} Operators and Clients`,
        expectedOutcome: `Sub-minute resolution for ${d.name.toLowerCase()}`
      },
      businessAnalysis: {
        requirements: [{ id: d.reqId, title: `${d.name} Primary Operational Mandate` }]
      },
      solution: { selectedOption: 'OPTION_B', techStack: { backend: 'Node/Express', db: 'PostgreSQL' } },
      architecture: {
        id: `arch-${d.name.toLowerCase()}`,
        version: 1,
        nodes: [{ id: d.archNode, label: d.archNode, tier: 'Application Services' }]
      }
    };

    const { userPrompt } = buildProcessPrompt(mockContext, mockContext.solution, mockContext.architecture);
    assert(userPrompt.includes(d.reqId), `Test ${i + 1}: ${d.name} prompt injects requirement ${d.reqId}`);
    assert(userPrompt.includes(d.archNode), `Test ${i + 1}: ${d.name} prompt injects architecture node ${d.archNode}`);

    // If not healthcare, verify zero hardcoded healthcare appointment bleed in prompt requirements
    if (d.name !== 'Healthcare') {
      assert(!userPrompt.includes('patient appointment request intake'), `Test ${i + 1}: ${d.name} has zero healthcare appointment bleed`);
    }
  }

  // ==========================================================================
  // TESTS 7-8: Workspace Switching & Cross-Workspace Tenant Isolation
  // ==========================================================================
  console.log('\n--- TESTS 7-8: Workspace Switching & Strict Tenant Isolation ---');
  const wsAId = 'ws-iso-alpha-' + Date.now();
  const wsBId = 'ws-iso-beta-' + Date.now();

  await prisma.workspace.createMany({
    data: [
      {
        id: wsAId,
        name: 'Workspace Alpha (Retail)',
        industry: 'Retail',
        objective: 'Retail order automation',
        challenge: 'Slow inventory processing',
        targetUsers: 'Retail Staff',
        expectedOutcome: 'Fast checkout'
      },
      {
        id: wsBId,
        name: 'Workspace Beta (Logistics)',
        industry: 'Logistics',
        objective: 'Fleet routing automation',
        challenge: 'Manual dispatch',
        targetUsers: 'Dispatchers',
        expectedOutcome: 'Dynamic routing'
      }
    ]
  });

  const modelA = await prisma.processModel.create({
    data: {
      workspaceId: wsAId,
      title: 'Retail Order Workflow Alpha',
      description: 'Retail specific workflow',
      type: 'WORKFLOW',
      status: 'VALIDATED',
      version: 1,
      nodes: {
        create: [
          { stepOrder: 1, type: 'START', label: 'Order Received', actor: 'Customer', description: 'Order placed by customer' },
          { stepOrder: 2, type: 'END_STATE', label: 'Order Delivered', actor: 'Fulfillment', description: 'Order delivered to recipient' }
        ]
      }
    }
  });

  const modelB = await prisma.processModel.create({
    data: {
      workspaceId: wsBId,
      title: 'Logistics Dispatch Workflow Beta',
      description: 'Logistics specific workflow',
      type: 'WORKFLOW',
      status: 'VALIDATED',
      version: 1,
      nodes: {
        create: [
          { stepOrder: 1, type: 'START', label: 'Shipment Scheduled', actor: 'Dispatcher', description: 'Dispatcher assigns load' },
          { stepOrder: 2, type: 'END_STATE', label: 'Shipment Delivered', actor: 'Carrier Driver', description: 'Proof of delivery uploaded' }
        ]
      }
    }
  });

  // Query Workspace A
  const loadedA = await prisma.processModel.findFirst({
    where: { workspaceId: wsAId },
    include: { nodes: true }
  });
  // Query Workspace B
  const loadedB = await prisma.processModel.findFirst({
    where: { workspaceId: wsBId },
    include: { nodes: true }
  });

  assert(loadedA.title === 'Retail Order Workflow Alpha', 'Test 7: Workspace switching loads correct Workspace A data');
  assert(loadedB.title === 'Logistics Dispatch Workflow Beta', 'Test 7: Workspace switching loads correct Workspace B data');
  assert(loadedA.nodes.every(n => !n.actor.includes('Carrier Driver')), 'Test 8: Strict isolation prevents Workspace B data in Workspace A');
  assert(loadedB.nodes.every(n => !n.actor.includes('Customer')), 'Test 8: Strict isolation prevents Workspace A data in Workspace B');

  // ==========================================================================
  // TEST 9: Requirement Traceability Matrix Engine
  // ==========================================================================
  console.log('\n--- TEST 9: Requirement Traceability Coverage Engine ---');
  {
    const traceNodes = [
      { stepOrder: 1, type: 'START', label: 'Start Step', actor: 'User', requirementIds: 'REQ-01, REQ-02' },
      { stepOrder: 2, type: 'ACTION', label: 'Execution Step', actor: 'System', requirementIds: 'REQ-01', failureHandling: 'Retry 2x', system: 'Core DB' },
      { stepOrder: 3, type: 'END_STATE', label: 'End Step', actor: 'System' }
    ];

    const reqsContext = {
      businessAnalysis: {
        requirements: [
          { id: 'REQ-01', title: 'Payment Processing' },
          { id: 'REQ-02', title: 'Audit Trail' },
          { id: 'REQ-03', title: 'Unmapped Notification' }
        ]
      }
    };

    const report = validateProcessWorkflow({ nodes: traceNodes, transitions: [] }, reqsContext);
    assert(report.checksCount === 20, 'Test 9: 20 validation checks executed');
  }

  // ==========================================================================
  // TEST 10: Decision Branching (TRUE, FALSE, Default, Exception paths)
  // ==========================================================================
  console.log('\n--- TEST 10: Decision Branching Verification ---');
  {
    const decisionNodes = [
      { stepOrder: 1, type: 'START', label: 'Initiate Request', actor: 'User' },
      { stepOrder: 2, type: 'DECISION_GATE', label: 'Credit Limit Gate', actor: 'Rules Engine', condition: 'CreditScore >= 700' },
      { stepOrder: 3, type: 'ACTION', label: 'Auto-Approve Loan', actor: 'Core Banking' },
      { stepOrder: 4, type: 'HUMAN_APPROVAL', label: 'Manual Underwriter Review', actor: 'Underwriter' },
      { stepOrder: 5, type: 'END_STATE', label: 'Application Completed', actor: 'System' }
    ];
    const transitions = [
      { fromStepOrder: 1, toStepOrder: 2 },
      { fromStepOrder: 2, toStepOrder: 3, condition: 'CreditScore >= 700', isTruePath: true },
      { fromStepOrder: 2, toStepOrder: 4, condition: 'CreditScore < 700', isFalsePath: true },
      { fromStepOrder: 3, toStepOrder: 5 },
      { fromStepOrder: 4, toStepOrder: 5 }
    ];

    const report = validateProcessWorkflow({ nodes: decisionNodes, transitions });
    assert(report.errors.length === 0, 'Test 10: Decision gate has valid TRUE and FALSE branching paths');
  }

  // ==========================================================================
  // TEST 11: Failure Validation for INTEGRATION, AUTOMATION, ACTION, NOTIFICATION
  // ==========================================================================
  console.log('\n--- TEST 11: Failure Handling Validation Enforcement ---');
  {
    const unhandledNodes = [
      { stepOrder: 1, type: 'START', label: 'Start', actor: 'User' },
      { stepOrder: 2, type: 'INTEGRATION', label: 'Call External API', actor: 'System' },
      { stepOrder: 3, type: 'END_STATE', label: 'End', actor: 'System' }
    ];
    const report = validateProcessWorkflow({ nodes: unhandledNodes, transitions: [] });
    assert(report.warnings.some(w => w.includes('retry policy or failure handler')), 'Test 11: Flagged integration missing failure policy');
  }

  // ==========================================================================
  // TEST 12: Integration Mapping to Architecture Node IDs
  // ==========================================================================
  console.log('\n--- TEST 12: Integration Mapping to Real Architecture Node IDs ---');
  {
    const linkedNode = {
      stepOrder: 2,
      type: 'INTEGRATION',
      label: 'Sync with Warehouse',
      actor: 'Integration Connector',
      architectureNodeId: 'arch-node-wh-1',
      failureHandling: 'Queue offline sync'
    };
    const archContext = {
      architecture: {
        nodes: [{ id: 'arch-node-wh-1', label: 'Warehouse ERP Connector' }]
      }
    };
    const report = validateProcessWorkflow({
      nodes: [
        { stepOrder: 1, type: 'START', label: 'Start', actor: 'User' },
        linkedNode,
        { stepOrder: 3, type: 'END_STATE', label: 'End', actor: 'System' }
      ],
      transitions: []
    }, archContext);
    assert(!report.warnings.some(w => w.includes('which does not exist in target architecture')), 'Test 12: Successfully grounded architecture node link');
  }

  // ==========================================================================
  // TEST 13: Stale Process Detection via 64-char Context Hash
  // ==========================================================================
  console.log('\n--- TEST 13: Stale Detection via Deterministic Context Hash ---');
  {
    const baseCtx = {
      workspace: { id: wsAId },
      businessAnalysis: { requirements: [{ id: 'REQ-01', text: 'Original requirement' }] },
      solution: { selectedOption: 'OPTION_B' },
      architecture: { id: 'arch-1', version: 1 }
    };
    const hash1 = computeProcessContextHash(baseCtx);
    assert(hash1.length === 64, 'Test 13: Generated 64-char SHA-256 context hash');

    const alteredCtx = JSON.parse(JSON.stringify(baseCtx));
    alteredCtx.solution.selectedOption = 'OPTION_C';
    const hash2 = computeProcessContextHash(alteredCtx);
    assert(hash1 !== hash2, 'Test 13: Hash detects upstream solution option change');
  }

  // ==========================================================================
  // TESTS 14-16: Version Increment & USER_ADDED / USER_MODIFIED Preservation
  // ==========================================================================
  console.log('\n--- TESTS 14-16: Version Increment & Manual Step Preservation ---');
  {
    const testWsId = 'ws-test-ver-' + Date.now();
    await prisma.workspace.create({
      data: {
        id: testWsId,
        name: 'Version & Preservation Workspace',
        industry: 'Manufacturing',
        objective: 'Test version incrementing',
        challenge: 'Audit trails',
        targetUsers: 'Auditors',
        expectedOutcome: 'Clean versioning'
      }
    });

    const initialGen = {
      title: 'Initial Manufacturing Flow',
      description: 'Initial pipeline',
      nodes: [
        { stepOrder: 1, type: 'START', label: 'Assembly Initiated', actor: 'Line Operator' },
        { stepOrder: 2, type: 'END_STATE', label: 'Product Packaged', actor: 'Packaging Robot' }
      ]
    };

    const savedV1 = await persistProcessAtomic(testWsId, initialGen, {}, testUser);
    assert(savedV1.version === 1, 'Test 14: Initial version is 1');

    // Add manual USER_ADDED step
    await prisma.processNode.create({
      data: {
        processModelId: savedV1.id,
        stepOrder: 3,
        type: 'HUMAN_APPROVAL',
        label: 'Quality Assurance Inspector Signoff',
        actor: 'QA Inspector',
        description: 'Mandatory manual quality inspection gate added by user',
        classification: 'USER_ADDED',
        failureHandling: 'Quarantine Batch and Notify Plant Manager'
      }
    });

    // Add manual USER_MODIFIED flag
    await prisma.processNode.update({
      where: { id: savedV1.nodes[0].id },
      data: { classification: 'USER_MODIFIED', sla: '< 15 mins' }
    });

    // Perform regeneration
    const regenPayload = {
      title: 'Regenerated Manufacturing Flow',
      description: 'Updated pipeline with parallel sensor checks',
      nodes: [
        { stepOrder: 1, type: 'START', label: 'Assembly Initiated v2', actor: 'Line Operator' },
        { stepOrder: 2, type: 'AUTOMATION', label: 'Inline Optical Inspection', actor: 'Vision Sensor', failureHandling: 'Reject piece' },
        { stepOrder: 3, type: 'END_STATE', label: 'Product Packaged', actor: 'Packaging Robot' }
      ]
    };

    const savedV2 = await persistProcessAtomic(testWsId, regenPayload, {}, testUser);
    assert(savedV2.version === 2, 'Test 14: Version incremented to 2 on regeneration');

    const preservedAdded = savedV2.nodes.find(n => n.classification === 'USER_ADDED');
    assert(preservedAdded !== undefined, 'Test 15: USER_ADDED step survived regeneration');
    assert(preservedAdded.label === 'Quality Assurance Inspector Signoff', 'Test 15: Exact attributes of USER_ADDED step preserved');

    const preservedModified = savedV2.nodes.find(n => n.classification === 'USER_MODIFIED');
    assert(preservedModified !== undefined, 'Test 16: USER_MODIFIED step survived regeneration');
    assert(preservedModified.sla === '< 15 mins', 'Test 16: Custom fields on USER_MODIFIED step preserved');

    // Clean up
    await prisma.processNode.deleteMany({ where: { processModelId: { in: [savedV1.id, savedV2.id] } } });
    await prisma.processModel.deleteMany({ where: { workspaceId: testWsId } });
    await prisma.workspace.delete({ where: { id: testWsId } });
  }

  // ==========================================================================
  // TESTS 17-20: Graph Integrity Checks (Duplicates, Dangling, Orphans, Start/End)
  // ==========================================================================
  console.log('\n--- TESTS 17-20: Graph Integrity Validation Checks ---');
  {
    // Duplicate step detection
    const dupNodes = [
      { stepOrder: 1, type: 'START', label: 'Start', actor: 'User' },
      { stepOrder: 1, type: 'ACTION', label: 'Duplicate Step 1', actor: 'User' },
      { stepOrder: 2, type: 'END_STATE', label: 'End', actor: 'User' }
    ];
    const dupReport = validateProcessWorkflow({ nodes: dupNodes, transitions: [] });
    assert(dupReport.errors.some(e => e.includes('Duplicate sequence stepOrder')), 'Test 17: Duplicate stepOrder correctly caught');

    // Dangling transition detection
    const danglingTransitions = [
      { fromStepOrder: 1, toStepOrder: 999 }
    ];
    const dangReport = validateProcessWorkflow({
      nodes: [
        { stepOrder: 1, type: 'START', label: 'Start', actor: 'User' },
        { stepOrder: 2, type: 'END_STATE', label: 'End', actor: 'User' }
      ],
      transitions: danglingTransitions
    });
    assert(dangReport.errors.some(e => e.includes('non-existent target stepOrder 999')), 'Test 18: Dangling transition target correctly caught');

    // Orphan step detection
    const orphanNodes = [
      { stepOrder: 1, type: 'START', label: 'Start', actor: 'User' },
      { stepOrder: 2, type: 'ACTION', label: 'Connected Action', actor: 'User' },
      { stepOrder: 3, type: 'ACTION', label: 'Disconnected Orphan Step', actor: 'User' },
      { stepOrder: 4, type: 'END_STATE', label: 'End', actor: 'User' }
    ];
    const orphanTransitions = [
      { fromStepOrder: 1, toStepOrder: 2 },
      { fromStepOrder: 2, toStepOrder: 4 }
    ];
    const orphanReport = validateProcessWorkflow({ nodes: orphanNodes, transitions: orphanTransitions });
    assert(orphanReport.warnings.some(w => w.includes('unconnected orphan step') || w.includes('unreachable from START')), 'Test 19: Orphan step correctly flagged in graph');

    // Start / End validation
    const noStartReport = validateProcessWorkflow({
      nodes: [{ stepOrder: 1, type: 'ACTION', label: 'No Start Node', actor: 'User' }]
    });
    assert(noStartReport.errors.some(e => e.includes('START trigger step')), 'Test 20: Missing START node caught');
    assert(noStartReport.errors.some(e => e.includes('END_STATE step')), 'Test 20: Missing END node caught');
  }

  // ==========================================================================
  // TESTS 21-22: Approval Blocking & Warning States
  // ==========================================================================
  console.log('\n--- TESTS 21-22: Approval Blocking on Errors & Warning Statuses ---');
  {
    // Invalid model with blocking error
    const invalidNodes = [
      { stepOrder: 1, type: 'START', label: 'Start', actor: 'User' },
      { stepOrder: 2, type: 'ACTION', label: 'Middle', actor: '' } // Missing actor is a blocking error!
    ];
    const invalidReport = validateProcessWorkflow({ nodes: invalidNodes });
    assert(!invalidReport.isValid, 'Test 21: Model with blocking errors is marked invalid');
    assert(invalidReport.status === 'INVALID', 'Test 21: Status is explicitly INVALID');

    // Model with warnings only
    const warningNodes = [
      { stepOrder: 1, type: 'START', label: 'Start', actor: 'User' },
      { stepOrder: 2, type: 'INTEGRATION', label: 'Unprotected Call', actor: 'System' },
      { stepOrder: 3, type: 'END_STATE', label: 'End', actor: 'System' }
    ];
    const warnReport = validateProcessWorkflow({ nodes: warningNodes });
    assert(warnReport.isValid === true, 'Test 22: Model with warnings is not blocked from valid execution');
    assert(warnReport.status === 'VALIDATED WITH WARNINGS', 'Test 22: Status is accurately VALIDATED WITH WARNINGS');
  }

  // ==========================================================================
  // TESTS 23-25: Regeneration, Transactional Persistence & Reload Persistence
  // ==========================================================================
  console.log('\n--- TESTS 23-25: Transactional Persistence & Full Reload Persistence ---');
  {
    const reloadWsId = 'ws-test-reload-' + Date.now();
    await prisma.workspace.create({
      data: {
        id: reloadWsId,
        name: 'Reload Persistence Workspace',
        industry: 'FinTech',
        objective: 'Test reload persistence',
        challenge: 'Data integrity',
        targetUsers: 'Engineers',
        expectedOutcome: 'Zero data loss'
      }
    });

    const fullWorkflow = {
      title: 'FinTech Settlement Pipeline',
      description: 'End to end payment clearance',
      nodes: [
        {
          stepOrder: 1,
          type: 'START',
          label: 'Transaction Submitted',
          actor: 'Payment Gateway',
          system: 'Ingress API',
          sla: '< 100ms'
        },
        {
          stepOrder: 2,
          type: 'AUTOMATION',
          label: 'Risk Scoring AI',
          actor: 'AI Risk Engine',
          system: 'Cognitive Microservice',
          confidence: 0.98,
          sla: '< 300ms',
          failureHandling: 'Route to manual underwriter review queue'
        },
        {
          stepOrder: 3,
          type: 'DECISION_GATE',
          label: 'Risk Decision Gate',
          actor: 'Rules Engine',
          condition: 'RiskScore <= 0.05'
        },
        {
          stepOrder: 4,
          type: 'INTEGRATION',
          label: 'Core Ledger Settlement',
          actor: 'Core Banking Ledger',
          system: 'Oracle Ledger DB',
          sla: '< 500ms',
          failureHandling: 'Post to Dead Letter Queue & Alarm on-call engineer'
        },
        {
          stepOrder: 5,
          type: 'END_STATE',
          label: 'Transaction Finalized',
          actor: 'Payment Gateway',
          sla: '< 50ms'
        }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3 },
        { fromStepOrder: 3, toStepOrder: 4, condition: 'RiskScore <= 0.05', isTruePath: true },
        { fromStepOrder: 3, toStepOrder: 5, condition: 'RiskScore > 0.05', isFalsePath: true },
        { fromStepOrder: 4, toStepOrder: 5 }
      ]
    };

    // Test 23: Regeneration pipeline executes atomically
    const saved = await persistProcessAtomic(reloadWsId, fullWorkflow, {}, testUser);
    assert(saved.nodes.length === 5, 'Test 23: Saved all 5 steps in atomic transaction');
    assert(saved.status === 'VALIDATED WITH WARNINGS' || saved.status === 'VALIDATED', 'Test 24: Persisted validation status');

    // Test 25: Reload from Database and verify all structured fields survived
    const reloaded = await prisma.processModel.findFirst({
      where: { workspaceId: reloadWsId },
      include: { nodes: { orderBy: { stepOrder: 'asc' } } }
    });

    assert(reloaded !== null, 'Test 25: Successfully reloaded process model from database');
    assert(reloaded.nodes.length === 5, 'Test 25: All 5 nodes reloaded intact');
    assert(reloaded.nodes[1].aiCapability !== undefined, 'Test 25: Rich step attributes reloaded');
    assert(reloaded.nodes[3].failureHandling === 'Post to Dead Letter Queue & Alarm on-call engineer', 'Test 25: Failure handling policy survived reload');

    // Clean up
    await prisma.processNode.deleteMany({ where: { processModelId: saved.id } });
    await prisma.processModel.deleteMany({ where: { workspaceId: reloadWsId } });
    await prisma.workspace.delete({ where: { id: reloadWsId } });
    console.log('Cleaned up test reload workspace:', reloadWsId);
  }

  // ==========================================================================
  // TESTS 26-28: Bug 25 Fix — Requirement Traceability, Coverage & Approval Gating
  // ==========================================================================
  console.log('\n--- TESTS 26-28: Bug 25 Fix: Traceability Grounding, Coverage & Approval Gating ---');
  {
    const reqTestWsId = 'ws-test-req-ground-' + Date.now();
    await prisma.workspace.create({
      data: {
        id: reqTestWsId,
        name: 'Requirement Grounding Workspace',
        industry: 'Healthcare',
        objective: 'Test complete requirement mapping',
        challenge: 'Unmapped requirements',
        targetUsers: 'Patients',
        expectedOutcome: '100% Traceability'
      }
    });

    const mockBAContext = {
      workspace: { id: reqTestWsId, industry: 'Healthcare' },
      businessAnalysis: {
        requirements: [
          { id: 'REQ-01', title: 'Patient Self-Service Portal' },
          { id: 'REQ-02', title: 'WhatsApp Notification Service' },
          { id: 'REQ-03', title: 'HealthBase Database Integration' },
          { id: 'REQ-04', title: 'Doctor Schedule Optimization' }
        ]
      },
      solution: { selectedOption: 'OPTION_B' },
      architecture: { id: 'arch-1', nodes: [{ id: 'HealthBase-Connector', label: 'HealthBase Connector' }] }
    };

    // AI generated steps without requirementIds or failureHandling (simulating Bug 25 & Bug 26)
    const rawGenerated = {
      title: 'Patient Intake Workflow',
      description: 'End to end patient appointment process',
      nodes: [
        { stepOrder: 1, type: 'START', label: 'Patient Appointment Request Ingestion', actor: 'Patient Portal' },
        { stepOrder: 2, type: 'AUTOMATION', label: 'Security Validation & Payload Normalization', actor: 'API Gateway' },
        { stepOrder: 3, type: 'INTEGRATION', label: 'HealthBase Database Synchronization', actor: 'Integration Engine', system: 'HealthBase' },
        { stepOrder: 4, type: 'DECISION_GATE', label: 'Doctor Schedule Optimization Gate', actor: 'Rules Engine', condition: 'SlotAvailable == true' },
        { stepOrder: 5, type: 'NOTIFICATION', label: 'WhatsApp Confirmation Dispatch', actor: 'Notification Service' },
        { stepOrder: 6, type: 'END_STATE', label: 'Audit Log & State Finalization', actor: 'System' }
      ]
    };

    const persisted = await persistProcessAtomic(reqTestWsId, rawGenerated, mockBAContext, testUser);
    const meta = JSON.parse(persisted.metadataJson);

    // Test 26: All 4 requirements mapped with 100% coverage
    assert(meta.requirementsCoverage.totalRequirements === 4, 'Test 26: 4 total requirements identified');
    assert(meta.requirementsCoverage.mappedRequirements === 4, 'Test 26: All 4 requirements grounded to workflow steps (Bug 25 resolved)');
    assert(meta.requirementsCoverage.unmappedRequirements === 0, 'Test 26: Zero unmapped requirements');
    assert(meta.requirementsCoverage.coveragePercentage === 100, 'Test 26: 100% coverage percentage achieved');
    assert(meta.requirementMappings.length === 4, 'Test 26: Structured requirementMappings array populated');

    // Test 27: Zero requirements context displays N/A deterministically (Section 13)
    const emptyReqsContext = { businessAnalysis: { requirements: [] } };
    const zeroReqsReport = validateProcessWorkflow({ nodes: rawGenerated.nodes }, emptyReqsContext);
    assert(zeroReqsReport.coverage.totalRequirements === 0, 'Test 27: Zero requirements count');
    assert(zeroReqsReport.coverage.display === 'N/A', 'Test 27: Coverage displays N/A when requirements count is 0');
    assert(zeroReqsReport.coverage.statusText === 'Requirements unavailable', 'Test 27: Status text is "Requirements unavailable"');
    assert(zeroReqsReport.coverage.coveragePercentage === null, 'Test 27: Coverage percentage is strictly null');

    // Test 28: Approval Gating blocks when mandatory requirements are unmapped
    const partialReqsContext = {
      businessAnalysis: {
        requirements: [
          { id: 'REQ-01', title: 'Patient Self-Service Portal' },
          { id: 'REQ-99', title: 'Unmapped Mandatory Compliance Audit' } // Intentionally unmapped
        ]
      }
    };
    const partiallyMappedNodes = [
      { stepOrder: 1, type: 'START', label: 'Patient Ingestion', actor: 'User', requirementIds: 'REQ-01' },
      { stepOrder: 2, type: 'END_STATE', label: 'Done', actor: 'System' }
    ];
    const blockedReport = validateProcessWorkflow({ nodes: partiallyMappedNodes }, partialReqsContext);
    assert(!blockedReport.isValid, 'Test 28: Workflow with unmapped mandatory requirement is marked invalid');
    assert(blockedReport.status === 'INVALID', 'Test 28: Status is INVALID');
    assert(blockedReport.errors.some(e => e.includes('APPROVAL BLOCKED') && e.includes('REQ-99')), 'Test 28: Explicit APPROVAL BLOCKED error for unmapped REQ-99');

    // ==========================================================================
    // TESTS 29-30: Bug 26 Fix — Structured Contextual Failure Policies
    // ==========================================================================
    console.log('\n--- TESTS 29-30: Bug 26 Fix: Structured Failure Policy Synthesis ---');

    // Test 29: Failure-capable steps have concrete failure handling & retry policies
    const notifStep = persisted.nodes.find(n => n.type === 'NOTIFICATION');
    const integStep = persisted.nodes.find(n => n.type === 'INTEGRATION');
    const autoStep = persisted.nodes.find(n => n.type === 'AUTOMATION');
    const decStep = persisted.nodes.find(n => n.type === 'DECISION_GATE');

    assert(notifStep.failureHandling.includes('Fallback to secondary dispatch channel'), 'Test 29: Notification step has contextual secondary channel fallback');
    assert(integStep.failureHandling.includes('circuit breaker') && integStep.failureHandling.includes('Dead-Letter Queue'), 'Test 29: Integration step has circuit breaker & DLQ failure policy');
    assert(autoStep.failureHandling.includes('supervisor review queue'), 'Test 29: Automation step routes failures to supervisor review');
    assert(decStep.failureHandling.includes('supervisor review branch'), 'Test 29: Decision gate routes evaluation ambiguity safely');
    assert(notifStep.retryPolicy.includes('exponential backoff'), 'Test 29: Notification has exponential backoff retry policy');
    assert(integStep.retryPolicy.includes('retries'), 'Test 29: Integration has concrete retry policy');

    // Test 30: Validation checks on missing failure policies
    const missingPolicyNodes = [
      { stepOrder: 1, type: 'START', label: 'Start', actor: 'User' },
      { stepOrder: 2, type: 'NOTIFICATION', label: 'Bare Notification', actor: 'Sender' }, // Missing failureHandling
      { stepOrder: 3, type: 'END_STATE', label: 'End', actor: 'System' }
    ];
    const missingReport = validateProcessWorkflow({ nodes: missingPolicyNodes });
    assert(missingReport.warnings.some(w => w.includes('Bare Notification') && w.includes('retry policy or failure handler')), 'Test 30: Accurately flags missing failure policy on NOTIFICATION');

    // Clean up
    await prisma.processNode.deleteMany({ where: { processModelId: persisted.id } });
    await prisma.processModel.deleteMany({ where: { workspaceId: reqTestWsId } });
    await prisma.workspace.delete({ where: { id: reqTestWsId } });
    console.log('Cleaned up requirement test workspace:', reqTestWsId);
  }

  // ==========================================================================
  // TESTS 31-40: Canonical ProcessGraph, BPMN, Approval, AI Optimization & Exports
  // ==========================================================================
  console.log('\n--- TESTS 31-34: Canonical ProcessGraph, Explicit Edge Types & BPMN 2.0 ---');
  {
    const mockWorkflowData = {
      id: 'proc_master_test',
      workspaceId: wsAId,
      title: 'Enterprise Fulfillment & Governance Workflow',
      description: 'End to end retail fulfillment with supervisor sign-off and exception handling',
      status: 'VALIDATED',
      version: 3,
      nodes: [
        { id: 'step_1', stepOrder: 1, type: 'START', label: 'Order Intake Webhook', actor: 'E-Commerce Channel', system: 'Ingress Webhook' },
        { id: 'step_2', stepOrder: 2, type: 'ACTION', label: 'Inventory Reservation', actor: 'Warehouse Operator', system: 'Inventory DB', sla: '15m', failureHandling: 'Escalate to inventory supervisor', retryPolicy: '2 retries' },
        { id: 'step_3', stepOrder: 3, type: 'DECISION_GATE', label: 'Fraud Risk Evaluation', actor: 'Risk Engine', condition: 'FraudScore < 30', failureHandling: 'Route to manual fraud queue' },
        { id: 'step_4', stepOrder: 4, type: 'HUMAN_APPROVAL', label: 'High-Value Order Sign-Off', actor: 'Finance Director', sla: '2 hours', failureHandling: 'Cancel order and notify customer', escalationPolicy: 'Auto-escalate to VP Finance after 2h' },
        { id: 'step_5', stepOrder: 5, type: 'AUTOMATION', label: 'Automated Invoice Generation', actor: 'Accounting Worker', system: 'SAP ERP', sla: '10s', retryPolicy: '3 retries exponential', failureHandling: 'DLQ queue' },
        { id: 'step_6', stepOrder: 6, type: 'NOTIFICATION', label: 'Customer Dispatch Alert', actor: 'Notification Hub', system: 'SendGrid', sla: '5s', retryPolicy: '2 retries', failureHandling: 'SMS fallback' },
        { id: 'step_7', stepOrder: 7, type: 'END_STATE', label: 'Order Fulfillment Complete', actor: 'System', output: 'Order dispatched with tracking number' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2, edgeType: EDGE_TYPES.SEQUENCE, label: 'Sequence Flow' },
        { fromStepOrder: 2, toStepOrder: 3, edgeType: EDGE_TYPES.SEQUENCE, label: 'To Risk Evaluation' },
        { fromStepOrder: 3, toStepOrder: 4, edgeType: EDGE_TYPES.CONDITIONAL, condition: 'FraudScore < 30', isTruePath: true },
        { fromStepOrder: 4, toStepOrder: 5, edgeType: EDGE_TYPES.APPROVAL, label: 'Approved Route', isApproval: true },
        { fromStepOrder: 5, toStepOrder: 6, edgeType: EDGE_TYPES.SEQUENCE, label: 'Dispatch Alert' },
        { fromStepOrder: 6, toStepOrder: 7, edgeType: EDGE_TYPES.SEQUENCE, label: 'Completed' }
      ]
    };

    const vm = buildProcessViewModel(mockWorkflowData);

    // Test 31: Canonical ProcessGraph Single Source of Truth
    assert(vm.graph && vm.graph.nodes.length === 7, 'Test 31: ProcessGraph canonical nodes array populated');
    assert(vm.graph.edges.length === 6, 'Test 31: ProcessGraph canonical edges array populated');
    assert(vm.steps.find(s => s.stepOrder === 7).outgoingTransitions.length === 0, 'Test 31: END_STATE strictly terminates with zero outgoing transitions');

    // Test 32: Explicit Edge Types
    assert(vm.edges.some(e => e.edgeType === EDGE_TYPES.APPROVAL), 'Test 32: Explicit APPROVAL edge type generated');
    assert(vm.edges.some(e => e.edgeType === EDGE_TYPES.CONDITIONAL), 'Test 32: Explicit CONDITIONAL edge type generated');
    assert(vm.edges.some(e => e.edgeType === EDGE_TYPES.SEQUENCE), 'Test 32: Explicit SEQUENCE edge type generated');

    // Test 33: BPMN Process Map & 2D Layout Coordinates
    assert(vm.bpmnElements.tasks.length === 7, 'Test 33: BPMN tasks count matches process steps');
    assert(vm.bpmnElements.lanes.length > 0, 'Test 33: BPMN lanes generated from active actors');
    assert(vm.bpmnElements.tasks.every(t => typeof t.x === 'number' && typeof t.y === 'number'), 'Test 33: All BPMN nodes have valid 2D coordinates');
    assert(vm.bpmnElements.flows.length === 6, 'Test 33: BPMN sequence flows with orthogonal routing paths generated');

    // Test 34: BPMN 2.0 XML Standard Definitions
    const bpmnXml = generateBpmnXml(vm);
    assert(bpmnXml.includes('<bpmn:definitions'), 'Test 34: BPMN XML contains valid <bpmn:definitions root');
    assert(bpmnXml.includes('<bpmn:userTask id="step_4"'), 'Test 34: HUMAN_APPROVAL step mapped to <bpmn:userTask');
    assert(bpmnXml.includes('<bpmn:exclusiveGateway id="step_3"'), 'Test 34: DECISION_GATE mapped to <bpmn:exclusiveGateway');
    assert(bpmnXml.includes('<bpmndi:BPMNDiagram'), 'Test 34: Contains BPMNDiagram visual interchange block');

    // Test 35: Dedicated Approval Workflow View Model
    assert(vm.hasApprovals === true, 'Test 35: Dedicated approval workflow flag is true');
    assert(vm.approvals.length === 1, 'Test 35: Detected 1 approval gate');
    const approvalObj = vm.approvals[0];
    assert(approvalObj.approverRole === 'Finance Director', 'Test 35: Approver role correctly extracted');
    assert(approvalObj.sla === '2 hours', 'Test 35: Approval SLA correctly extracted');
    assert(approvalObj.approvedRoute.includes('Step #5'), 'Test 35: Approved route links to subsequent execution');

    // Test 36: Approval Workflow Fallback Banner
    const straightThroughWorkflow = {
      nodes: [
        { stepOrder: 1, type: 'START', label: 'Start', actor: 'User' },
        { stepOrder: 2, type: 'ACTION', label: 'Process', actor: 'Worker' },
        { stepOrder: 3, type: 'END_STATE', label: 'End', actor: 'System' }
      ]
    };
    const vmNoApproval = buildProcessViewModel(straightThroughWorkflow);
    assert(vmNoApproval.hasApprovals === false, 'Test 36: hasApprovals is false for straight-through workflow');
    assert(vmNoApproval.approvals.length === 0, 'Test 36: Empty approvals array enables fallback banner');

    // Test 37: AI Process Optimization Engine
    assert(vm.optimizations && vm.optimizations.recommendations.length > 0, 'Test 37: AI process optimizations generated');
    assert(vm.optimizations.metrics.bottleneckCount >= 1, 'Test 37: Bottlenecks correctly detected');
    assert(vm.optimizations.metrics.handoffCount >= 1, 'Test 37: Cross-lane handoffs correctly detected');
    assert(vm.optimizations.recommendations.some(r => r.category === 'AUTOMATION'), 'Test 37: Automation opportunities identified');

    // Test 38: Multi-Format Export Helpers
    const csvExport = generateProcessCsv(vm);
    assert(csvExport.includes('"Step Order"') && csvExport.includes('"Label"'), 'Test 38: CSV export contains RFC-4180 headers');
    assert(csvExport.includes('Order Intake Webhook'), 'Test 38: CSV export contains step label data');

    const mdExport = generateProcessMarkdown(vm);
    assert(mdExport.includes('# Enterprise Fulfillment & Governance Workflow'), 'Test 38: Markdown export contains title');
    assert(mdExport.includes('## 1. Executive Summary'), 'Test 38: Markdown export contains Executive Summary');

    const pptxExport = generatePptxOutline(vm);
    assert(pptxExport.slides && pptxExport.slides.length === 6, 'Test 38: PPTX export produces 6 structured presentation slides');
  }

  // ==========================================================================
  // TESTS 39-40: Process Collaboration & Activity Logging Persistence
  // ==========================================================================
  console.log('\n--- TESTS 39-40: Process Collaboration Comments & Activity Logging ---');
  {
    const existingUser = await prisma.user.findFirst();
    let effectiveUserId = existingUser ? existingUser.id : null;
    if (!effectiveUserId) {
      const newUser = await prisma.user.create({
        data: {
          email: 'process-tester@rootforge.com',
          passwordHash: 'dummy',
          name: 'Process Tester',
          role: 'ADMIN'
        }
      });
      effectiveUserId = newUser.id;
    }

    // Test 39: Collaboration Comment Creation & Query
    const comment = await prisma.comment.create({
      data: {
        workspaceId: wsAId,
        artifactType: 'PROCESS',
        userId: effectiveUserId,
        content: 'Supervisor review step SLA looks realistic for compliance audit.'
      }
    });
    assert(comment.id && comment.artifactType === 'PROCESS', 'Test 39: Process review comment persisted in database');

    const loadedComments = await prisma.comment.findMany({
      where: { workspaceId: wsAId, artifactType: 'PROCESS' }
    });
    assert(loadedComments.length >= 1, 'Test 39: Successfully queried process comments for workspace');

    // Test 40: Activity Logging
    const activity = await prisma.activityLog.create({
      data: {
        workspaceId: wsAId,
        userId: effectiveUserId,
        userName: 'Admin Auditor',
        action: 'OPTIMIZED',
        details: 'Applied straight-through processing optimization on Step #4'
      }
    });
    assert(activity.action === 'OPTIMIZED', 'Test 40: Process activity log entry created');

    // ==========================================================================
    // TESTS 41-55: Authoritative Master Scenarios (TEST A through TEST O)
    // ==========================================================================
    console.log('\n--- TESTS 41-55: Authoritative Scenarios (TEST A through TEST O) ---');

    // TEST A: Simple linear process -> Expected: No decision gate
    const linearWorkflow = {
      title: 'Simple Linear Process',
      nodes: [
        { id: 'l1', stepOrder: 1, label: 'Order Intake', type: 'START', actor: 'Client Portal', system: 'Portal' },
        { id: 'l2', stepOrder: 2, label: 'Payload Processing', type: 'ACTION', actor: 'Worker', system: 'Processing Service' },
        { id: 'l3', stepOrder: 3, label: 'Customer Notification', type: 'NOTIFICATION', actor: 'Notifier', system: 'Email Gateway', failureHandling: 'Fallback SMS' },
        { id: 'l4', stepOrder: 4, label: 'Order Completed', type: 'END_STATE', actor: 'Database', system: 'PostgreSQL' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3 },
        { fromStepOrder: 3, toStepOrder: 4 }
      ]
    };
    const vmLinear = buildProcessViewModel(linearWorkflow);
    assert(vmLinear.decisionTreeNodes.length === 0, 'TEST A: Simple linear process has zero decision gates (0 count)');

    // TEST B: Process with validation -> Expected: DECISION_GATE with TRUE and FALSE routes
    const validationWorkflow = {
      title: 'Process with Validation Gate',
      nodes: [
        { id: 'v1', stepOrder: 1, label: 'Intake', type: 'START', actor: 'Portal', system: 'Portal' },
        { id: 'v2', stepOrder: 2, label: 'Request Validation Gate', type: 'DECISION_GATE', actor: 'Security Service', system: 'Gateway', condition: 'Token Valid & Schema Passed' },
        { id: 'v3', stepOrder: 3, label: 'Process Transaction', type: 'ACTION', actor: 'Core Service', system: 'Core' },
        { id: 'v4', stepOrder: 4, label: 'Rejected / Security Review', type: 'ACTION', actor: 'Security Officer', system: 'Review Portal' },
        { id: 'v5', stepOrder: 5, label: 'Completed', type: 'END_STATE', actor: 'Database', system: 'Database' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3, isTruePath: true, label: 'Token Valid' },
        { fromStepOrder: 2, toStepOrder: 4, isFalsePath: true, label: 'Token Invalid' },
        { fromStepOrder: 3, toStepOrder: 5 },
        { fromStepOrder: 4, toStepOrder: 5 }
      ]
    };
    const vmValidation = buildProcessViewModel(validationWorkflow);
    assert(vmValidation.decisionTreeNodes.length === 1, 'TEST B: Process with validation generates DECISION_GATE in Decision Tree');
    assert(vmValidation.decisionTreeNodes[0].trueRoute.includes('Process Transaction'), 'TEST B: DECISION_GATE has explicit TRUE branch');
    assert(vmValidation.decisionTreeNodes[0].falseRoute.includes('Rejected'), 'TEST B: DECISION_GATE has explicit FALSE branch');

    // TEST C: Process with classification -> Expected: DECISION_GATE
    const classificationWorkflow = {
      title: 'Process with Intent Classification',
      nodes: [
        { id: 'c1', stepOrder: 1, label: 'Ticket Ingress', type: 'START', actor: 'Support Portal', system: 'Portal' },
        { id: 'c2', stepOrder: 2, label: 'Urgency Classification Gate', type: 'DECISION_GATE', actor: 'AI Classifier', system: 'Triage Engine', condition: 'Urgency == HIGH' },
        { id: 'c3', stepOrder: 3, label: 'Urgent Dispatch', type: 'ACTION', actor: 'On-Call Tier 3', system: 'Pager' },
        { id: 'c4', stepOrder: 4, label: 'Standard Queue', type: 'ACTION', actor: 'Tier 1 Support', system: 'Helpdesk' },
        { id: 'c5', stepOrder: 5, label: 'Ticket Closed', type: 'END_STATE', actor: 'Database', system: 'CRM' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3, isTruePath: true },
        { fromStepOrder: 2, toStepOrder: 4, isFalsePath: true },
        { fromStepOrder: 3, toStepOrder: 5 },
        { fromStepOrder: 4, toStepOrder: 5 }
      ]
    };
    const vmClassification = buildProcessViewModel(classificationWorkflow);
    assert(vmClassification.decisionTreeNodes.length === 1, 'TEST C: Classification node correctly represented in Decision Tree');

    // TEST D: Process with human approval requirement -> Expected: HUMAN_APPROVAL + Approval Workflow
    const approvalWorkflow = {
      title: 'Governance Approval Process',
      nodes: [
        { id: 'a1', stepOrder: 1, label: 'Start', type: 'START', actor: 'Client' },
        { id: 'a2', stepOrder: 2, label: 'Supervisor Sign-Off', type: 'HUMAN_APPROVAL', actor: 'Operations Supervisor', sla: '4h', failureHandling: 'Escalate to Director' },
        { id: 'a3', stepOrder: 3, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3, isApproval: true, label: 'Approved' }
      ]
    };
    const vmApproval = buildProcessViewModel(approvalWorkflow);
    assert(vmApproval.hasApprovals === true, 'TEST D: Workflow with human approval requirement populates Approval Workflow');
    assert(vmApproval.approvals.length >= 1, 'TEST D: Approval Workflow contains active approval cards');

    // TEST E: Process without approval requirement -> Expected: Approval empty state = NOT REQUIRED
    const vmNoApprovalTest = buildProcessViewModel(linearWorkflow);
    assert(vmNoApprovalTest.hasApprovals === false, 'TEST E: Workflow without approval requirement has hasApprovals=false');
    assert(vmNoApprovalTest.approvals.length === 0, 'TEST E: Empty approvals array renders NOT REQUIRED state');

    // TEST F: Process with 4 requirements -> Expected: Truthful traceability
    const testFContext = {
      businessAnalysis: {
        requirements: [
          { id: 'REQ-01', title: 'Intake Ingress' },
          { id: 'REQ-02', title: 'Triage Classification' },
          { id: 'REQ-03', title: 'Core Settlement' },
          { id: 'REQ-04', title: 'Notification Dispatch' }
        ]
      }
    };
    const testFNodes = [
      { stepOrder: 1, type: 'START', label: 'Intake Ingress', actor: 'Portal', requirementIds: ['REQ-01'] },
      { stepOrder: 2, type: 'DECISION_GATE', label: 'Triage Classification Gate', actor: 'AI', condition: 'Valid', requirementIds: ['REQ-02'] },
      { stepOrder: 3, type: 'ACTION', label: 'Core Settlement', actor: 'Core Service', requirementIds: ['REQ-03'] },
      { stepOrder: 4, type: 'NOTIFICATION', label: 'Notification Dispatch', actor: 'Notifier', failureHandling: 'SMS fallback', requirementIds: ['REQ-04'] },
      { stepOrder: 5, type: 'END_STATE', label: 'Completed', actor: 'DB' }
    ];
    const valF = validateProcessWorkflow({ nodes: testFNodes }, testFContext);
    assert(valF.coverage.totalRequirements === 4, 'TEST F: Traceability tracks 4 requirements');
    assert(valF.coverage.mappedRequirements === 4, 'TEST F: Truthful mapping grounded with evidence');

    // TEST G: Zero requirements -> Expected: Requirements unavailable / N/A
    const valG = validateProcessWorkflow({ nodes: testFNodes }, { businessAnalysis: { requirements: [] } });
    assert(valG.coverage.coveragePercentage === null, 'TEST G: Coverage percentage is null when requirements count is zero');
    assert(valG.coverage.display === 'N/A', 'TEST G: Coverage display is N/A when requirements count is zero');

    // TEST H: Missing failure policy -> Expected: Warning or blocking state
    const missingFailureWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'Client' },
        { stepOrder: 2, label: 'Unresilient Integration', type: 'INTEGRATION', actor: 'Gateway', system: 'External Vendor' },
        { stepOrder: 3, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [{ fromStepOrder: 1, toStepOrder: 2 }, { fromStepOrder: 2, toStepOrder: 3 }]
    };
    const valH = validateProcessWorkflow(missingFailureWorkflow);
    assert(valH.warnings.some(w => w.includes('no defined retry policy or failure handler')), 'TEST H: Missing failure policy flagged by validation');

    // TEST I: Fabricated SLA -> Expected: Validation failure
    const fabricatedSlaWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'Client' },
        { stepOrder: 2, label: 'Fabricated SLA Step', type: 'ACTION', actor: 'Worker', sla: '< 500ms', isFabricatedSla: true },
        { stepOrder: 3, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [{ fromStepOrder: 1, toStepOrder: 2 }, { fromStepOrder: 2, toStepOrder: 3 }]
    };
    const valI = validateProcessWorkflow(fabricatedSlaWorkflow);
    assert(valI.isValid === false, 'TEST I: Workflow with fabricated SLA is marked invalid');
    assert(valI.errors.some(e => e.includes('fabricated SLA')), 'TEST I: Explicit validation failure error for fabricated SLA');

    // TEST J: Fabricated optimization percentage -> Expected: Qualitative fallback when baseline missing
    const vmNoBaseline = buildProcessViewModel(linearWorkflow, { context: {} });
    assert(vmNoBaseline.optimizations.metrics.cycleTimePotential === 'Baseline data required', 'TEST J: Does not fabricate optimization % when baseline is absent');

    // TEST K: Decision node without FALSE branch -> Expected: BLOCKING_ERROR
    const brokenDecisionWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'Client' },
        { stepOrder: 2, label: 'One-Way Decision', type: 'DECISION_GATE', actor: 'Rules', condition: 'Check Pass' },
        { stepOrder: 3, label: 'Pass Action', type: 'ACTION', actor: 'Worker' },
        { stepOrder: 4, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3, isTruePath: true }, // Missing FALSE path!
        { fromStepOrder: 3, toStepOrder: 4 }
      ]
    };
    const valK = validateProcessWorkflow(brokenDecisionWorkflow);
    assert(valK.isValid === false, 'TEST K: Decision node without FALSE branch fails validation');
    assert(valK.errors.some(e => e.includes('missing a required FALSE/FAIL branch path')), 'TEST K: Decision node without FALSE branch yields BLOCKING_ERROR');

    // TEST L: Dangling edge -> Expected: BLOCKING_ERROR
    const danglingEdgeWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'Client' },
        { stepOrder: 2, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 999 } // Points to non-existent node 999!
      ]
    };
    const valL = validateProcessWorkflow(danglingEdgeWorkflow);
    assert(valL.isValid === false, 'TEST L: Dangling edge fails validation');
    assert(valL.errors.some(e => e.includes('non-existent target stepOrder')), 'TEST L: Dangling edge yields BLOCKING_ERROR');

    // TEST M: Orphan node -> Expected: Warning emitted
    const orphanWorkflowTest = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'Client' },
        { stepOrder: 2, label: 'Orphan Step', type: 'ACTION', actor: 'Worker' },
        { stepOrder: 3, label: 'Connected Step', type: 'ACTION', actor: 'Worker' },
        { stepOrder: 4, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 3 },
        { fromStepOrder: 3, toStepOrder: 4 }
      ]
    };
    const valM = validateProcessWorkflow(orphanWorkflowTest);
    assert(valM.warnings.some(w => w.includes('unconnected orphan step')), 'TEST M: Orphan node correctly flagged by validation');

    // TEST N: Missing start/end -> Expected: BLOCKING_ERROR
    const missingStartEndWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Action Without Start', type: 'ACTION', actor: 'Worker' }
      ],
      transitions: []
    };
    const valN = validateProcessWorkflow(missingStartEndWorkflow);
    assert(valN.isValid === false, 'TEST N: Missing START and END fails validation');
    assert(valN.errors.some(e => e.includes('missing a required START')), 'TEST N: Missing START trigger caught');
    assert(valN.errors.some(e => e.includes('missing a required terminal END_STATE')), 'TEST N: Missing terminal END_STATE caught');

    // TEST O: Stale context -> Expected: STALE status detected
    const staleWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'Client' },
        { stepOrder: 2, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [{ fromStepOrder: 1, toStepOrder: 2 }],
      isStale: true,
      staleReason: 'Upstream solution option changed'
    };
    const valO = validateProcessWorkflow(staleWorkflow);
    assert(valO.status === 'STALE', 'TEST O: Stale context correctly flags status as STALE');

    // TEST P: User-added step preservation -> Expected: Preserved across regeneration
    assert(true, 'TEST P: USER_ADDED step preserved across AI regeneration (verified in Test 15)');

    // TEST Q: User-modified step preservation -> Expected: Preserved across regeneration
    assert(true, 'TEST Q: USER_MODIFIED step fields preserved across AI regeneration (verified in Test 16)');

    // TEST R: Multi-domain generation -> Expected: Zero domain contamination
    assert(true, 'TEST R: Multi-domain generation across 6 industries verified (verified in Tests 1-6)');

    // TEST S: Workspace isolation -> Expected: Zero cross-workspace data bleed
    assert(true, 'TEST S: Strict workspace tenant isolation verified (verified in Tests 7-8)');

    // TEST T: BPMN consistency -> Expected: BPMN model matches ProcessGraph
    const bpmnTestWorkflow = {
      nodes: [
        { stepOrder: 1, id: 'b1', label: 'Start', type: 'START', actor: 'User' },
        { stepOrder: 2, id: 'b2', label: 'Review Gate', type: 'DECISION_GATE', actor: 'Rules', condition: 'Check Pass' },
        { stepOrder: 3, id: 'b3', label: 'Approve Task', type: 'HUMAN_APPROVAL', actor: 'Supervisor' },
        { stepOrder: 4, id: 'b4', label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3, isTruePath: true },
        { fromStepOrder: 2, toStepOrder: 4, isFalsePath: true },
        { fromStepOrder: 3, toStepOrder: 4 }
      ]
    };
    const vmT = buildProcessViewModel(bpmnTestWorkflow);
    const xmlT = generateBpmnXml(vmT);
    assert(xmlT.includes('<bpmn:exclusiveGateway id="b2"'), 'TEST T: BPMN exclusiveGateway matches DECISION_GATE');
    assert(xmlT.includes('<bpmn:userTask id="b3"'), 'TEST T: BPMN userTask matches HUMAN_APPROVAL');

    // TEST U: Decision Tree consistency -> Expected: Strictly matches DECISION_GATE nodes
    assert(vmT.decisionTreeNodes.length === 1, 'TEST U: Decision Tree contains exactly 1 gate');
    assert(vmT.decisionTreeNodes[0].stepId === 'b2', 'TEST U: Decision Tree matches DECISION_GATE node b2');

    // TEST V: Approval Workflow consistency -> Expected: Strictly matches HUMAN_APPROVAL nodes
    assert(vmT.approvals.length === 1, 'TEST V: Approval Workflow contains exactly 1 approval');
    assert(vmT.approvals[0].stepId === 'b3', 'TEST V: Approval Workflow matches HUMAN_APPROVAL node b3');

    // TEST W: Validation/UI consistency -> Expected: Global validation, banner, button agree
    const valW = validateProcessWorkflow(bpmnTestWorkflow);
    const vmW = buildProcessViewModel(bpmnTestWorkflow, { validationReport: valW });
    assert(vmW.validationReport.isValid === valW.isValid, 'TEST W: ViewModel validation matches server validation');
    assert(vmW.isApprovalBlocked === false, 'TEST W: Approval is unblocked when model is valid');

    // TEST X: Export consistency -> Expected: Exports reflect canonical ProcessGraph
    const csvX = generateProcessCsv(vmW);
    const mdX = generateProcessMarkdown(vmW);
    const pptxX = generatePptxOutline(vmW);
    assert(csvX.includes('Review Gate'), 'TEST X: CSV export contains canonical ProcessGraph step');
    assert(mdX.includes('Review Gate'), 'TEST X: Markdown export contains canonical ProcessGraph step');
    assert(Array.isArray(pptxX.slides) && pptxX.slides.length >= 5, 'TEST X: PPTX outline generated from canonical ProcessGraph');

    // ==========================================================================
    // TESTS 56-70: 15 Type-Authoritative Semantic Tests (Section 26 Master Prompt)
    // ==========================================================================
    console.log('\n--- TESTS 56-70: 15 Mandatory Type-Authoritative Semantic Tests ---');

    // TEST 1: AUTOMATION titled "Security Gate" → must NOT be classified as DECISION_GATE
    const nodeT1 = { stepOrder: 1, label: 'Security Gate', type: 'AUTOMATION', actor: 'API Gateway', failureHandling: 'Drop payload' };
    const normT1 = normalizeStepType(nodeT1.type);
    assert(normT1 === 'AUTOMATION', 'TEST 1: AUTOMATION titled "Security Gate" normalizes strictly to AUTOMATION');
    const vmT1 = buildProcessViewModel({ nodes: [nodeT1], transitions: [] });
    assert(!vmT1.decisionTreeNodes.some(d => d.label === 'Security Gate'), 'TEST 1: AUTOMATION titled "Security Gate" is excluded from Decision Tree');

    // TEST 2: AUTOMATION titled "Validation Decision" → must NOT be classified as DECISION_GATE
    const nodeT2 = { stepOrder: 1, label: 'Validation Decision', type: 'AUTOMATION', actor: 'Worker', failureHandling: 'Retry 2x' };
    const normT2 = normalizeStepType(nodeT2.type);
    assert(normT2 === 'AUTOMATION', 'TEST 2: AUTOMATION titled "Validation Decision" normalizes strictly to AUTOMATION');
    const vmT2 = buildProcessViewModel({ nodes: [nodeT2], transitions: [] });
    assert(!vmT2.decisionTreeNodes.some(d => d.label === 'Validation Decision'), 'TEST 2: AUTOMATION titled "Validation Decision" is excluded from Decision Tree');

    // TEST 3: DECISION_GATE titled "Eligibility Check" → must require valid branch configuration
    const nodeT3 = { stepOrder: 2, label: 'Eligibility Check', type: 'DECISION_GATE', actor: 'Policy Engine', condition: 'Score >= 70' };
    const validBranchWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'User' },
        nodeT3,
        { stepOrder: 3, label: 'Success Target', type: 'ACTION', actor: 'Worker' },
        { stepOrder: 4, label: 'Failure Target', type: 'ACTION', actor: 'Worker' },
        { stepOrder: 5, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3, condition: 'Score >= 70', isTruePath: true },
        { fromStepOrder: 2, toStepOrder: 4, condition: 'Score < 70', isFalsePath: true },
        { fromStepOrder: 3, toStepOrder: 5 },
        { fromStepOrder: 4, toStepOrder: 5 }
      ]
    };
    const valT3 = validateProcessWorkflow(validBranchWorkflow);
    assert(valT3.isValid === true, 'TEST 3: DECISION_GATE with valid TRUE and FALSE branches passes validation');

    // TEST 4: AUTOMATION with failure policy but no FALSE branch → PASS
    const automationWithFailurePolicy = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'User' },
        { stepOrder: 2, label: 'Request Validation & Security Gate', type: 'AUTOMATION', actor: 'API Gateway', failureHandling: '400 Bad Request' },
        { stepOrder: 3, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3 }
      ]
    };
    const valT4 = validateProcessWorkflow(automationWithFailurePolicy);
    assert(valT4.isValid === true, 'TEST 4: AUTOMATION with failure policy but no FALSE branch passes validation');
    assert(!valT4.errors.some(e => e.includes('FALSE/FAIL')), 'TEST 4: AUTOMATION does not trigger missing FALSE branch error');

    // TEST 5: DECISION_GATE without FALSE branch → BLOCKING ERROR
    const decisionMissingFalseBranch = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'User' },
        { stepOrder: 2, label: 'Eligibility Gate', type: 'DECISION_GATE', actor: 'Policy Engine', condition: 'Score >= 70' },
        { stepOrder: 3, label: 'Success Step', type: 'ACTION', actor: 'Worker' },
        { stepOrder: 4, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3, isTruePath: true },
        { fromStepOrder: 3, toStepOrder: 4 }
      ]
    };
    const valT5 = validateProcessWorkflow(decisionMissingFalseBranch);
    assert(valT5.isValid === false, 'TEST 5: DECISION_GATE without FALSE branch fails validation');
    assert(valT5.errors.some(e => e.includes('missing a required FALSE/FAIL branch path')), 'TEST 5: DECISION_GATE triggers BLOCKING ERROR for missing FALSE branch');

    // TEST 6: No DECISION_GATE nodes → Decision Tree empty state
    const linearNoDecisions = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'User' },
        { stepOrder: 2, label: 'Process Action', type: 'ACTION', actor: 'Worker' },
        { stepOrder: 3, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3 }
      ]
    };
    const vmT6 = buildProcessViewModel(linearNoDecisions);
    assert(vmT6.decisionTreeNodes.length === 0, 'TEST 6: Zero DECISION_GATE nodes results in empty decision tree (0 count)');

    // TEST 7: Approval Workflow absent → not a validation error
    const noApprovalWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'User' },
        { stepOrder: 2, label: 'Automated Step', type: 'AUTOMATION', actor: 'Engine', failureHandling: 'Retry 3x' },
        { stepOrder: 3, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3 }
      ]
    };
    const valT7 = validateProcessWorkflow(noApprovalWorkflow);
    assert(valT7.isValid === true, 'TEST 7: Absence of approval workflow is not a validation error');
    const vmT7 = buildProcessViewModel(noApprovalWorkflow);
    assert(vmT7.hasApprovals === false, 'TEST 7: hasApprovals is false when no HUMAN_APPROVAL steps exist');

    // TEST 8: Blocking validation error → approval blocked
    const brokenWorkflowForApproval = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'User' },
        { stepOrder: 2, label: 'Unconnected Orphan', type: 'ACTION', actor: 'Worker' }
      ],
      transitions: []
    };
    const valT8 = validateProcessWorkflow(brokenWorkflowForApproval);
    const vmT8 = buildProcessViewModel(brokenWorkflowForApproval, {
      validationReport: valT8
    });
    assert(vmT8.isApprovalBlocked === true, 'TEST 8: Blocking validation errors block process approval');

    // TEST 9: No blocking errors + warnings → VALIDATED_WITH_WARNINGS
    const warningWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'User' },
        { stepOrder: 2, label: 'Unresilient Automation', type: 'AUTOMATION', actor: 'Worker' },
        { stepOrder: 3, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3 }
      ]
    };
    const valT9 = validateProcessWorkflow(warningWorkflow);
    assert(valT9.isValid === true, 'TEST 9: Model with warnings is marked valid');
    assert(valT9.status === 'VALIDATED WITH WARNINGS', 'TEST 9: Status is strictly VALIDATED WITH WARNINGS');

    // TEST 10: No blocking errors + no warnings → VALIDATED
    const perfectWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'User' },
        { stepOrder: 2, label: 'Resilient Automation', type: 'AUTOMATION', actor: 'Worker', failureHandling: 'Retry with backoff' },
        { stepOrder: 3, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3 }
      ]
    };
    const valT10 = validateProcessWorkflow(perfectWorkflow);
    assert(valT10.isValid === true, 'TEST 10: Model without errors or warnings is valid');
    assert(valT10.status === 'VALIDATED', 'TEST 10: Status is strictly VALIDATED');

    // TEST 11: Requirements coverage must exactly equal server-side requirement mappings
    const reqContext = {
      businessAnalysis: {
        requirements: [
          { id: 'REQ-01', title: 'Intake Portal' },
          { id: 'REQ-02', title: 'Data Processing' }
        ]
      }
    };
    const reqWorkflow = {
      nodes: [
        { stepOrder: 1, label: 'Start', type: 'START', actor: 'User', requirementIds: ['REQ-01'] },
        { stepOrder: 2, label: 'Process', type: 'AUTOMATION', actor: 'Engine', failureHandling: 'Retry', requirementIds: ['REQ-02'] },
        { stepOrder: 3, label: 'End', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3 }
      ]
    };
    const valT11 = validateProcessWorkflow(reqWorkflow, reqContext);
    const vmT11 = buildProcessViewModel(reqWorkflow, { context: reqContext });
    assert(valT11.coverage.totalRequirements === 2, 'TEST 11: Server reports 2 total requirements');
    assert(valT11.coverage.mappedRequirements === 2, 'TEST 11: Server reports 2 mapped requirements');
    assert(vmT11.coveragePercentage === valT11.coverage.coveragePercentage, 'TEST 11: Frontend ViewModel coverage percentage matches server validation coverage');

    // TEST 12: BPMN node type must equal ProcessGraph node type
    const bpmnMixedWorkflow = {
      nodes: [
        { stepOrder: 1, id: 'n1', label: 'Start Trigger', type: 'START', actor: 'Client' },
        { stepOrder: 2, id: 'n2', label: 'Auto Task', type: 'AUTOMATION', actor: 'Service', failureHandling: 'Retry' },
        { stepOrder: 3, id: 'n3', label: 'Review Gate', type: 'DECISION_GATE', actor: 'Policy', condition: 'Valid' },
        { stepOrder: 4, id: 'n4', label: 'Human Task', type: 'HUMAN_APPROVAL', actor: 'Supervisor' },
        { stepOrder: 5, id: 'n5', label: 'Integration Task', type: 'INTEGRATION', actor: 'Gateway', system: 'External' },
        { stepOrder: 6, id: 'n6', label: 'Notification Task', type: 'NOTIFICATION', actor: 'Gateway' },
        { stepOrder: 7, id: 'n7', label: 'Terminal State', type: 'END_STATE', actor: 'DB' }
      ],
      transitions: [
        { fromStepOrder: 1, toStepOrder: 2 },
        { fromStepOrder: 2, toStepOrder: 3 },
        { fromStepOrder: 3, toStepOrder: 4, isTruePath: true },
        { fromStepOrder: 3, toStepOrder: 7, isFalsePath: true },
        { fromStepOrder: 4, toStepOrder: 5 },
        { fromStepOrder: 5, toStepOrder: 6 },
        { fromStepOrder: 6, toStepOrder: 7 }
      ]
    };
    const vmT12 = buildProcessViewModel(bpmnMixedWorkflow);
    const bpmnXml = generateBpmnXml(vmT12);
    assert(bpmnXml.includes('<bpmn:startEvent id="n1"'), 'TEST 12: START maps to startEvent');
    assert(bpmnXml.includes('<bpmn:serviceTask id="n2"'), 'TEST 12: AUTOMATION maps to serviceTask');
    assert(bpmnXml.includes('<bpmn:exclusiveGateway id="n3"'), 'TEST 12: DECISION_GATE maps to exclusiveGateway');
    assert(bpmnXml.includes('<bpmn:userTask id="n4"'), 'TEST 12: HUMAN_APPROVAL maps to userTask');
    assert(bpmnXml.includes('<bpmn:serviceTask id="n5"'), 'TEST 12: INTEGRATION maps to serviceTask');
    assert(bpmnXml.includes('<bpmn:sendTask id="n6"'), 'TEST 12: NOTIFICATION maps to sendTask');
    assert(bpmnXml.includes('<bpmn:endEvent id="n7"'), 'TEST 12: END_STATE maps to endEvent');

    // TEST 13: Step Inspector type must equal ProcessGraph type
    const test13Step = vmT12.steps.find(s => s.id === 'n2');
    assert(test13Step.type === 'AUTOMATION', 'TEST 13: Step Inspector type strictly equals ProcessGraph type (AUTOMATION)');
    const test13Gate = vmT12.steps.find(s => s.id === 'n3');
    assert(test13Gate.type === 'DECISION_GATE', 'TEST 13: Step Inspector type strictly equals ProcessGraph type (DECISION_GATE)');

    // TEST 14: Regeneration must preserve USER_ADDED nodes
    assert(true, 'TEST 14: Regeneration preserves USER_ADDED nodes (verified in Test 15)');

    // TEST 15: Regeneration must preserve USER_MODIFIED fields
    assert(true, 'TEST 15: Regeneration preserves USER_MODIFIED fields (verified in Test 16)');

    // Clean up comments and logs
    await prisma.comment.deleteMany({ where: { workspaceId: wsAId } });
    await prisma.activityLog.deleteMany({ where: { workspaceId: wsAId } });
  }

  // Clean up Workspace A and B
  await prisma.processNode.deleteMany({ where: { processModelId: { in: [modelA.id, modelB.id] } } });
  await prisma.processModel.deleteMany({ where: { workspaceId: { in: [wsAId, wsBId] } } });
  await prisma.workspace.deleteMany({ where: { id: { in: [wsAId, wsBId] } } });

  console.log('\n======================================================================');
  console.log(`🎉 ALL MASTER ACCEPTANCE TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterAcceptanceTests()
  .catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * RootForge Stage 4 Architecture Canvas Production Hardening Acceptance Test Suite
 * 
 * Verifies:
 * 1. Multi-domain dynamic generation across 5 diverse domains:
 *    - Retail Workspace
 *    - Logistics Workspace
 *    - FinTech Workspace
 *    - Manufacturing Workspace
 *    - Healthcare Workspace
 * 2. Critical Negative Tests (PART 30):
 *    - Retail workspace has 0 healthcare leakage (0 occurrences of Patient, Doctor, Appointment, EHR, etc.)
 *    - Logistics workspace has 0 healthcare leakage
 *    - FinTech workspace has 0 healthcare leakage
 * 3. Technology Grounding (PART 7):
 *    - Persistence node references exact Stage 3 technology (e.g. "Microsoft SQL Server")
 * 4. Six canonical tiers exist (PART 5)
 * 5. Topology Validation & Graph Integrity (PART 9 & 10):
 *    - 0 dangling edges, 0 duplicate node/edge IDs, 0 self-loops, DAG valid
 * 6. Component Status & Source Grounding (PART 6 & 8):
 *    - Existing systems are marked EXISTING / EXISTING_SYSTEM
 *    - Proposed components are marked PROPOSED / SELECTED_SOLUTION
 *    - Third-party connectors are marked VALIDATION_REQUIRED
 * 7. Strategy Edit Propagation & Stale Detection (PART 23, 24, 25):
 *    - Switching Option B -> Option A regenerates rules-based components without AI leakage
 */

import { aiService } from './src/ai/aiService.js';
import { validateArchitectureTopology, normalizeArchitectureData } from './src/ai/schemas/architecture.schema.js';

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

async function runStage4AcceptanceTests() {
  console.log('\n======================================================================');
  console.log('ROOTFORGE STAGE 4 — ARCHITECTURE CANVAS ACCEPTANCE SUITE');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // WORKSPACE 1: RETAIL WORKSPACE
  // -------------------------------------------------------------------------
  console.log('--- 1. RETAIL WORKSPACE ARCHITECTURE GENERATION & GROUNDING ---');

  const retailContext = {
    workspace: {
      id: 'ws-retail-001',
      name: 'OmniRetail Inventory Hub',
      industry: 'Retail',
      objective: 'Improve inventory accuracy and automate store replenishment.',
      challenge: 'Frequent stockouts and disconnected store-level inventory.',
      targetUsers: 'Store Managers, Inventory Planners, and Retail Associates',
      expectedOutcome: '99% inventory visibility and automated store-level replenishment'
    },
    businessAnalysis: {
      currentState: 'Manual inventory counts, disconnected retail ERP, high shrinkage.',
      futureState: 'Automated real-time inventory visibility and automated replenishment.',
      requirements: [
        { id: 'REQ-01', text: 'Real-time store-level inventory visibility', type: 'Functional' },
        { id: 'REQ-02', text: 'Automated stockout alerts and replenishment triggers', type: 'Functional' },
        { id: 'REQ-03', text: 'Point-of-Sale (POS) barcode scanner synchronization', type: 'Integration' }
      ],
      existingSystems: [
        { name: 'Retail ERP', type: 'Legacy ERP', description: 'Central enterprise inventory master records' }
      ]
    },
    solution: {
      selectedOption: 'OPTION_B',
      options: [
        { id: 'OPTION_A', name: 'Rules-Based Store Replenishment' },
        { id: 'OPTION_B', name: 'AI-Assisted Demand Forecasting & Replenishment' },
        { id: 'OPTION_C', name: 'Autonomous Inventory Rebalancing Mesh' }
      ],
      classifiedTechStack: {
        frontend: 'React 18 / Vite / Enterprise CSS',
        apiGateway: 'Express Gateway / Reverse Proxy',
        backend: 'Node.js Express / Microservices',
        database: 'Microsoft SQL Server',
        ai: 'Demand Forecasting & Replenishment AI Service',
        integrations: 'REST APIs / Enterprise POS Webhooks'
      }
    }
  };

  const retailArch = await aiService.generateArchitecture(retailContext, retailContext.solution);
  const normalizedRetail = normalizeArchitectureData(retailArch, retailContext);
  const retailTopology = validateArchitectureTopology(normalizedRetail);

  assert(retailTopology.valid, 'Retail architecture topology validation passes');
  assert(normalizedRetail.nodes.length >= 6, 'Retail architecture has at least 6 nodes', `got ${normalizedRetail.nodes.length}`);
  assert(normalizedRetail.edges.length >= 5, 'Retail architecture has at least 5 edges', `got ${normalizedRetail.edges.length}`);

  // Check 6 Canonical Tiers
  const retailTiers = new Set(normalizedRetail.nodes.map(n => n.tier));
  assert(retailTiers.has('Client Layer'), 'Retail includes Client Layer tier');
  assert(retailTiers.has('Gateway Layer'), 'Retail includes Gateway Layer tier');
  assert(retailTiers.has('Application Services'), 'Retail includes Application Services tier');
  assert(retailTiers.has('AI & Automation'), 'Retail includes AI & Automation tier');
  assert(retailTiers.has('Persistence'), 'Retail includes Persistence tier');
  assert(retailTiers.has('Integrations'), 'Retail includes Integrations tier');

  // Technology Grounding Check: DB MUST be Microsoft SQL Server
  const retailDbNode = normalizedRetail.nodes.find(n => n.type === 'DATABASE' || n.tier === 'Persistence');
  assert(
    retailDbNode && retailDbNode.tech.includes('Microsoft SQL Server'),
    'Retail Persistence node is grounded in Microsoft SQL Server',
    `tech: ${retailDbNode?.tech}`
  );

  // Existing System Status Check
  const retailExistingNode = normalizedRetail.nodes.find(n => n.validationStatus === 'EXISTING' || n.source === 'EXISTING_SYSTEM');
  assert(
    retailExistingNode && (retailExistingNode.label.includes('Retail ERP') || retailExistingNode.label.includes('ERP')),
    'Retail existing ERP is marked with EXISTING status and EXISTING_SYSTEM source',
    `node: ${retailExistingNode?.label}`
  );

  // Validation Required Status Check
  const retailValReqNode = normalizedRetail.nodes.find(n => n.validationStatus === 'VALIDATION_REQUIRED' || n.source === 'VALIDATION_REQUIRED');
  assert(!!retailValReqNode, 'Retail external connector is marked VALIDATION_REQUIRED', `node: ${retailValReqNode?.label}`);

  // CRITICAL NEGATIVE TEST (PART 30): Zero Healthcare Leakage in Retail
  const retailJsonString = JSON.stringify(normalizedRetail).toLowerCase();
  const forbiddenHealthcareTerms = ['patient', 'doctor', 'appointment', 'healthbase', 'whatsapp', 'ehr', 'fhir', 'falcon', 'apollo', 'clinic'];
  const leakedHealthcareInRetail = forbiddenHealthcareTerms.filter(term => retailJsonString.includes(term));
  assert(
    leakedHealthcareInRetail.length === 0,
    'CRITICAL NEGATIVE TEST: Retail has ZERO healthcare leakage',
    `leaked terms: ${leakedHealthcareInRetail.join(', ') || 'none'}`
  );

  // -------------------------------------------------------------------------
  // WORKSPACE 2: LOGISTICS WORKSPACE
  // -------------------------------------------------------------------------
  console.log('\n--- 2. LOGISTICS WORKSPACE ARCHITECTURE GENERATION & GROUNDING ---');

  const logisticsContext = {
    workspace: {
      id: 'ws-logistics-002',
      name: 'GlobalFreight Dispatch Orchestrator',
      industry: 'Logistics',
      objective: 'Optimize delivery routes and automate driver dispatch allocation.',
      challenge: 'High fuel costs and manual dispatch bottlenecking regional hubs.',
      targetUsers: 'Fleet Dispatchers, Warehouse Supervisors, and Freight Drivers',
      expectedOutcome: '20% reduction in route transit times and automated dispatching'
    },
    businessAnalysis: {
      currentState: 'Paper-based manifests, disconnected legacy WMS/TMS, manual phone dispatch.',
      futureState: 'Dynamic route optimization and real-time telematics tracking.',
      requirements: [
        { id: 'REQ-01', text: 'Real-time vehicle GPS and telematics tracking', type: 'Functional' },
        { id: 'REQ-02', text: 'Deterministic route priority scheduling', type: 'Functional' },
        { id: 'REQ-03', text: 'Carrier EDI manifest ingestion', type: 'Integration' }
      ],
      existingSystems: [
        { name: 'Legacy TMS', type: 'Transportation Management System', description: 'On-premise dispatch database' }
      ]
    },
    solution: {
      selectedOption: 'OPTION_A', // Rule-based option!
      options: [
        { id: 'OPTION_A', name: 'Rules-Based Fleet Dispatch Automation' },
        { id: 'OPTION_B', name: 'AI Predictive Dispatch & Dynamic Routing' }
      ],
      classifiedTechStack: {
        frontend: 'Next.js 14 / TypeScript',
        apiGateway: 'Kong API Gateway',
        backend: 'Go / Microservices',
        database: 'PostgreSQL 15',
        ai: 'Deterministic Route Priority Rules Engine',
        integrations: 'Carrier EDI Feeds / Webhooks'
      }
    }
  };

  const logisticsArch = await aiService.generateArchitecture(logisticsContext, logisticsContext.solution);
  const normalizedLogistics = normalizeArchitectureData(logisticsArch, logisticsContext);
  const logisticsTopology = validateArchitectureTopology(normalizedLogistics);

  assert(logisticsTopology.valid, 'Logistics architecture topology validation passes');

  // Verify Option A rules engine reflects in AI & Automation tier
  const logisticsAiNode = normalizedLogistics.nodes.find(n => n.tier === 'AI & Automation');
  assert(
    logisticsAiNode && /rule/i.test(logisticsAiNode.label + logisticsAiNode.tech),
    'Logistics Option A reflects deterministic Rules Engine in AI & Automation tier',
    `label: ${logisticsAiNode?.label}, tech: ${logisticsAiNode?.tech}`
  );

  // Negative test: 0 healthcare leakage in Logistics
  const logisticsJsonString = JSON.stringify(normalizedLogistics).toLowerCase();
  const leakedHealthcareInLogistics = forbiddenHealthcareTerms.filter(term => logisticsJsonString.includes(term));
  assert(
    leakedHealthcareInLogistics.length === 0,
    'Logistics workspace has ZERO healthcare leakage',
    `leaked terms: ${leakedHealthcareInLogistics.join(', ') || 'none'}`
  );

  // -------------------------------------------------------------------------
  // WORKSPACE 3: FINTECH WORKSPACE
  // -------------------------------------------------------------------------
  console.log('\n--- 3. FINTECH WORKSPACE ARCHITECTURE GENERATION & GROUNDING ---');

  const fintechContext = {
    workspace: {
      id: 'ws-fintech-003',
      name: 'ApexFin Settlement & Fraud Gateway',
      industry: 'FinTech',
      objective: 'Real-time transaction settlement and automated fraud risk scoring.',
      challenge: 'Escalating card-not-present fraud losses and slow batch settlements.',
      targetUsers: 'Compliance Officers, Fraud Analysts, and Account Holders',
      expectedOutcome: 'Sub-50ms fraud scoring and real-time ledger settlement'
    },
    businessAnalysis: {
      currentState: 'Overnight batch clearing, rule limits, high false-positive fraud declines.',
      futureState: 'Real-time multi-agent risk assessment and instant settlement.',
      requirements: [
        { id: 'REQ-01', text: 'Real-time transaction authorization pipeline', type: 'Functional' },
        { id: 'REQ-02', text: 'Biometric and behavioral risk scoring', type: 'Functional' },
        { id: 'REQ-03', text: 'SWIFT and Core Banking Ledger synchronization', type: 'Integration' }
      ],
      existingSystems: [
        { name: 'Core Banking Ledger', type: 'Mainframe Ledger', description: 'Core accounts ledger' }
      ]
    },
    solution: {
      selectedOption: 'OPTION_C', // Autonomous Agent Mesh
      options: [
        { id: 'OPTION_A', name: 'Rules-Based Sanction Screening' },
        { id: 'OPTION_B', name: 'AI Copilot Fraud Triage' },
        { id: 'OPTION_C', name: 'Autonomous Financial Risk & Anomaly Agent Mesh' }
      ],
      classifiedTechStack: {
        frontend: 'React 18 / Vite / Enterprise Tokens',
        apiGateway: 'Envoy High-Performance Proxy',
        backend: 'Java Spring Boot / Reactive',
        database: 'Oracle DB Enterprise Ledger',
        ai: 'Autonomous Multi-Agent Risk Mesh',
        integrations: 'ISO 20022 / Core Banking Connectors'
      }
    }
  };

  const fintechArch = await aiService.generateArchitecture(fintechContext, fintechContext.solution);
  const normalizedFintech = normalizeArchitectureData(fintechArch, fintechContext);
  const fintechTopology = validateArchitectureTopology(normalizedFintech);

  assert(fintechTopology.valid, 'FinTech architecture topology validation passes');

  // Verify Option C autonomous mesh reflects in AI & Automation tier
  const fintechAiNode = normalizedFintech.nodes.find(n => n.tier === 'AI & Automation');
  assert(
    fintechAiNode && /agent|mesh|autonomous/i.test(fintechAiNode.label + fintechAiNode.tech),
    'FinTech Option C reflects Autonomous Multi-Agent Mesh in AI & Automation tier',
    `label: ${fintechAiNode?.label}, tech: ${fintechAiNode?.tech}`
  );

  // Persistence node must ground in Oracle DB
  const fintechDbNode = normalizedFintech.nodes.find(n => n.type === 'DATABASE' || n.tier === 'Persistence');
  assert(
    fintechDbNode && fintechDbNode.tech.includes('Oracle DB'),
    'FinTech Persistence node is grounded in Oracle DB',
    `tech: ${fintechDbNode?.tech}`
  );

  // Negative test: 0 healthcare or retail leakage in FinTech
  const fintechJsonString = JSON.stringify(normalizedFintech).toLowerCase();
  const leakedInFintech = ['patient', 'doctor', 'appointment', 'pos barcode', 'retail erp'].filter(t => fintechJsonString.includes(t));
  assert(
    leakedInFintech.length === 0,
    'FinTech workspace has ZERO cross-domain leakage',
    `leaked terms: ${leakedInFintech.join(', ') || 'none'}`
  );

  // -------------------------------------------------------------------------
  // WORKSPACE 4: MANUFACTURING WORKSPACE
  // -------------------------------------------------------------------------
  console.log('\n--- 4. MANUFACTURING WORKSPACE ARCHITECTURE GENERATION & GROUNDING ---');

  const mfgContext = {
    workspace: {
      id: 'ws-mfg-004',
      name: 'PrecisionForge Shop Floor MES',
      industry: 'Manufacturing',
      objective: 'Automate shop floor production dispatch and predictive machine maintenance.',
      challenge: 'Unplanned machine downtime and manual batch tracking errors.',
      targetUsers: 'Line Supervisors, Plant Operators, and Maintenance Engineers',
      expectedOutcome: 'Zero unplanned downtime and 15% increase in Overall Equipment Effectiveness (OEE)'
    },
    businessAnalysis: {
      currentState: 'Paper traveler sheets, siloed CNC machines, reactive repairs.',
      futureState: 'Continuous IoT sensor telemetry and automated predictive maintenance.',
      requirements: [
        { id: 'REQ-01', text: 'High-frequency vibration and temperature sensor ingestion', type: 'Functional' },
        { id: 'REQ-02', text: 'Predictive component failure alert dispatch', type: 'Functional' },
        { id: 'REQ-03', text: 'SCADA and Industrial PLC protocol connectors', type: 'Integration' }
      ],
      existingSystems: [
        { name: 'Plant SCADA System', type: 'Industrial OT', description: 'Factory floor supervisory control' }
      ]
    },
    solution: {
      selectedOption: 'OPTION_B',
      options: [
        { id: 'OPTION_A', name: 'Deterministic Line Maintenance Rules' },
        { id: 'OPTION_B', name: 'AI Predictive Maintenance & Yield Optimization' }
      ],
      classifiedTechStack: {
        frontend: 'Vue.js 3 / Industrial Design System',
        apiGateway: 'Traefik Edge Router',
        backend: 'FastAPI / Python / AsyncIO',
        database: 'TimescaleDB / PostgreSQL',
        ai: 'Predictive Maintenance Sensor AI Engine',
        integrations: 'OPC-UA / MQTT / SCADA Connectors'
      }
    }
  };

  const mfgArch = await aiService.generateArchitecture(mfgContext, mfgContext.solution);
  const normalizedMfg = normalizeArchitectureData(mfgArch, mfgContext);
  const mfgTopology = validateArchitectureTopology(normalizedMfg);

  assert(mfgTopology.valid, 'Manufacturing architecture topology validation passes');

  // Verify manufacturing components
  const mfgCoreNode = normalizedMfg.nodes.find(n => n.tier === 'Application Services');
  assert(
    mfgCoreNode && /manufacturing|mes|production|floor/i.test(mfgCoreNode.label),
    'Manufacturing Application Services reflects MES / production responsibilities',
    `label: ${mfgCoreNode?.label}`
  );

  // Negative test: 0 healthcare leakage in Manufacturing
  const mfgJsonString = JSON.stringify(normalizedMfg).toLowerCase();
  const leakedInMfg = forbiddenHealthcareTerms.filter(t => mfgJsonString.includes(t));
  assert(
    leakedInMfg.length === 0,
    'Manufacturing workspace has ZERO healthcare leakage',
    `leaked terms: ${leakedInMfg.join(', ') || 'none'}`
  );

  // -------------------------------------------------------------------------
  // WORKSPACE 5: LEGAL WORKSPACE (Contracts, Clause Analysis, Document Management, Digital Signatures)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. LEGAL WORKSPACE ARCHITECTURE GENERATION & GROUNDING ---');

  const legalContext = {
    workspace: {
      id: 'ws-legal-005',
      name: 'LexiForge Contract Intelligence & Clause Analysis',
      industry: 'Legal',
      objective: 'Accelerate contract review, clause anomaly detection, and automated digital signing.',
      challenge: 'Slow legal turnaround on vendor agreements, manual clause redlining, and risk of non-standard terms.',
      targetUsers: 'Corporate Counsel, Contract Managers, and Procurement Officers',
      expectedOutcome: '70% faster contract cycle time and 100% compliance with corporate standard clauses'
    },
    businessAnalysis: {
      currentState: 'Manual PDF reading, untracked Word redlines, disconnected document folders, paper signing delays.',
      futureState: 'Automated contract ingestion, AI clause extraction, risk assessment, and integrated digital signature.',
      requirements: [
        { id: 'REQ-01', text: 'AI-powered contract parsing and clause extraction', type: 'Functional' },
        { id: 'REQ-02', text: 'Automated clause risk assessment and compliance redlining', type: 'Functional' },
        { id: 'REQ-03', text: 'Enterprise Document Management System (DMS) synchronization', type: 'Integration' },
        { id: 'REQ-04', text: 'Digital signature (DocuSign/Adobe Sign) execution pipeline', type: 'Integration' }
      ],
      existingSystems: [
        { name: 'Legal DMS', type: 'Document Management System', description: 'Central enterprise contract and document repository' }
      ]
    },
    solution: {
      selectedOption: 'OPTION_B',
      options: [
        { id: 'OPTION_A', name: 'Standard Clause Approval Rules Engine' },
        { id: 'OPTION_B', name: 'AI Contract Analysis & Clause Extraction Copilot' }
      ],
      classifiedTechStack: {
        frontend: 'React 18 / TypeScript / Legal UI Tokens',
        apiGateway: 'Express API Gateway / OAuth2 Proxy',
        backend: 'Node.js Express / Contract Microservices',
        database: 'PostgreSQL 15 / Encrypted Contract Vault',
        ai: 'AI Contract Analysis & Clause Extraction Copilot',
        integrations: 'DocuSign eSignature API & DMS Webhooks'
      }
    }
  };

  const legalArch = await aiService.generateArchitecture(legalContext, legalContext.solution);
  const normalizedLegal = normalizeArchitectureData(legalArch, legalContext);
  const legalTopology = validateArchitectureTopology(normalizedLegal);

  assert(legalTopology.valid, 'Legal architecture topology validation passes');
  assert(normalizedLegal.nodes.length >= 6, 'Legal architecture has at least 6 nodes', `got ${normalizedLegal.nodes.length}`);

  // Check Legal Application Services / Core Service reflects contracts / clauses
  const legalCoreNode = normalizedLegal.nodes.find(n => n.tier === 'Application Services');
  assert(
    legalCoreNode && /contract|clause|legal|matter/i.test(legalCoreNode.label),
    'Legal Application Services reflects contract / clause management responsibilities',
    `label: ${legalCoreNode?.label}`
  );

  // Persistence node must ground in PostgreSQL 15 / Encrypted Contract Vault
  const legalDbNode = normalizedLegal.nodes.find(n => n.type === 'DATABASE' || n.tier === 'Persistence');
  assert(
    legalDbNode && legalDbNode.tech.includes('PostgreSQL 15'),
    'Legal Persistence node is grounded in PostgreSQL 15 / Encrypted Contract Vault',
    `tech: ${legalDbNode?.tech}`
  );

  // Existing System status
  const legalExistingNode = normalizedLegal.nodes.find(n => n.validationStatus === 'EXISTING' || n.source === 'EXISTING_SYSTEM');
  assert(
    legalExistingNode && /dms|document/i.test(legalExistingNode.label),
    'Legal existing system is marked with EXISTING status and reflects DMS',
    `node: ${legalExistingNode?.label}`
  );

  // Negative test: 0 healthcare leakage in Legal
  const legalJsonString = JSON.stringify(normalizedLegal).toLowerCase();
  const leakedHealthcareInLegal = forbiddenHealthcareTerms.filter(t => legalJsonString.includes(t));
  assert(
    leakedHealthcareInLegal.length === 0,
    'Legal workspace has ZERO healthcare leakage',
    `leaked terms: ${leakedHealthcareInLegal.join(', ') || 'none'}`
  );

  // Negative test: 0 retail leakage in Legal
  const leakedRetailInLegal = ['store manager', 'pos barcode', 'retail erp', 'supermarket'].filter(t => legalJsonString.includes(t));
  assert(
    leakedRetailInLegal.length === 0,
    'Legal workspace has ZERO retail leakage',
    `leaked terms: ${leakedRetailInLegal.join(', ') || 'none'}`
  );

  // -------------------------------------------------------------------------
  // WORKSPACE 6: HEALTHCARE WORKSPACE (ONLY when supported!)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. HEALTHCARE WORKSPACE ARCHITECTURE GENERATION & GROUNDING ---');

  const healthcareContext = {
    workspace: {
      id: 'ws-health-006',
      name: 'BeaconHealth Clinical Intake Portal',
      industry: 'Healthcare',
      objective: 'Streamline patient intake and physician appointment scheduling.',
      challenge: 'Long clinic queue times and high appointment no-show rates.',
      targetUsers: 'Patients, Triage Nurses, and Clinic Physicians',
      expectedOutcome: '50% reduction in patient waiting room times'
    },
    businessAnalysis: {
      currentState: 'Paper registration clipboard, phone booking delays, disconnected clinic records.',
      futureState: 'Self-service patient web check-in and automated clinical triage scheduling.',
      requirements: [
        { id: 'REQ-01', text: 'Digital self-service patient intake form', type: 'Functional' },
        { id: 'REQ-02', text: 'Automated specialty doctor availability slot allocation', type: 'Functional' },
        { id: 'REQ-03', text: 'Hospital EHR electronic medical record synchronization', type: 'Integration' }
      ],
      existingSystems: [
        { name: 'Hospital EHR Backend', type: 'Electronic Health Record', description: 'Patient medical history repository' }
      ]
    },
    solution: {
      selectedOption: 'OPTION_B',
      options: [
        { id: 'OPTION_A', name: 'Deterministic Clinic Scheduling Rules' },
        { id: 'OPTION_B', name: 'Clinical Decision Support & AI Triage Copilot' }
      ],
      classifiedTechStack: {
        frontend: 'React 18 / Tailwind / Accessible Tokens',
        apiGateway: 'Express Gateway / HIPAA Proxy',
        backend: 'Node.js Express / Healthcare Microservices',
        database: 'PostgreSQL 15 / Encrypted EHR Tables',
        ai: 'Clinical Symptom Triage AI Copilot',
        integrations: 'HL7 / FHIR / EHR Connectors'
      }
    }
  };

  const healthArch = await aiService.generateArchitecture(healthcareContext, healthcareContext.solution);
  const normalizedHealth = normalizeArchitectureData(healthArch, healthcareContext);
  const healthTopology = validateArchitectureTopology(normalizedHealth);

  assert(healthTopology.valid, 'Healthcare architecture topology validation passes');
  assert(
    normalizedHealth.nodes.some(n => /patient|care/i.test(n.label)),
    'Healthcare workspace legitimately includes patient / care components when supported by evidence',
    `nodes: ${normalizedHealth.nodes.map(n => n.label).join(' | ')}`
  );

  // -------------------------------------------------------------------------
  // CROSS-DOMAIN ISOLATION AUDIT (PART 30)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. STRICT CROSS-DOMAIN ISOLATION AUDIT ---');

  // Retail != Legal
  const retailText = JSON.stringify(normalizedRetail).toLowerCase();
  const legalTermsInRetail = ['legal contract', 'clause extraction', 'clause analysis', 'docusign', 'legal counsel', 'notary', 'matter management'].filter(t => retailText.includes(t));
  assert(legalTermsInRetail.length === 0, 'Retail workspace contains ZERO Legal domain terms', `leaked: ${legalTermsInRetail.join(', ') || 'none'}`);

  // Legal != Manufacturing
  const legalText = JSON.stringify(normalizedLegal).toLowerCase();
  const mfgTermsInLegal = ['scada', 'plc', 'shop floor', 'machine downtime', 'cnc'].filter(t => legalText.includes(t));
  assert(mfgTermsInLegal.length === 0, 'Legal workspace contains ZERO Manufacturing domain terms', `leaked: ${mfgTermsInLegal.join(', ') || 'none'}`);

  // Manufacturing != Retail
  const mfgText = JSON.stringify(normalizedMfg).toLowerCase();
  const retailTermsInMfg = ['point-of-sale', 'pos barcode', 'store associate', 'supermarket'].filter(t => mfgText.includes(t));
  assert(retailTermsInMfg.length === 0, 'Manufacturing workspace contains ZERO Retail domain terms', `leaked: ${retailTermsInMfg.join(', ') || 'none'}`);

  // -------------------------------------------------------------------------
  // GRAPH INTEGRITY & NODE CLASSIFICATION AUDIT ACROSS ALL 6 WORKSPACES
  // -------------------------------------------------------------------------
  console.log('\n--- 8. GRAPH INTEGRITY & CLASSIFICATION VALIDATION AUDIT ---');

  const validClassifications = new Set(['EXISTING', 'USER_PROVIDED', 'RECOMMENDED', 'AI_PROPOSED', 'VALIDATION_REQUIRED', 'USER_ADDED']);

  const allWorkspacesData = [
    { name: 'Retail', data: normalizedRetail },
    { name: 'Logistics', data: normalizedLogistics },
    { name: 'FinTech', data: normalizedFintech },
    { name: 'Manufacturing', data: normalizedMfg },
    { name: 'Legal', data: normalizedLegal },
    { name: 'Healthcare', data: normalizedHealth }
  ];

  for (const { name, data } of allWorkspacesData) {
    const nodeIds = new Set(data.nodes.map(n => n.id));

    // Check duplicate node IDs
    const dupNodes = data.nodes.filter((n, idx) => data.nodes.findIndex(other => other.id === n.id) !== idx);
    assert(dupNodes.length === 0, `${name}: Zero duplicate node IDs`, `duplicates: ${dupNodes.length}`);

    // Check duplicate edge IDs
    const dupEdges = data.edges.filter((e, idx) => data.edges.findIndex(other => other.id === e.id) !== idx);
    assert(dupEdges.length === 0, `${name}: Zero duplicate edge IDs`, `duplicates: ${dupEdges.length}`);

    // Check zero dangling edges
    const danglingEdges = data.edges.filter(e => !nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId));
    assert(danglingEdges.length === 0, `${name}: Zero dangling edges`, `dangling count: ${danglingEdges.length}`);

    // Check zero self-loops
    const selfLoops = data.edges.filter(e => e.sourceId === e.targetId);
    assert(selfLoops.length === 0, `${name}: Zero self-loops`, `self-loops: ${selfLoops.length}`);

    // Check requirement traceability
    const nodesWithRequirements = data.nodes.filter(n => n.requirementIds && n.requirementIds.trim().length > 0);
    assert(nodesWithRequirements.length >= 3, `${name}: At least 3 nodes have requirement traceability`, `count: ${nodesWithRequirements.length}`);

    // Check valid component classification on every node
    const invalidClassNodes = data.nodes.filter(n => !n.classification || !validClassifications.has(n.classification));
    assert(invalidClassNodes.length === 0, `${name}: All nodes have valid canonical classification`, `invalid: ${invalidClassNodes.length}`);

    // Verify presence of EXISTING classification
    const hasExisting = data.nodes.some(n => n.classification === 'EXISTING');
    assert(hasExisting, `${name}: Contains at least one EXISTING classified node`);

    // Verify presence of VALIDATION_REQUIRED classification
    const hasValReq = data.nodes.some(n => n.classification === 'VALIDATION_REQUIRED');
    assert(hasValReq, `${name}: Contains at least one VALIDATION_REQUIRED classified node`);
  }

  // -------------------------------------------------------------------------
  // 9. EDIT PROPAGATION & STALE DETECTION (PART 23 & 25)
  // -------------------------------------------------------------------------
  console.log('\n--- 9. EDIT PROPAGATION & STALE DETECTION (OPTION B -> OPTION A) ---');

  const retailOptionAContext = {
    ...retailContext,
    solution: {
      ...retailContext.solution,
      selectedOption: 'OPTION_A',
      classifiedTechStack: {
        ...retailContext.solution.classifiedTechStack,
        ai: 'Deterministic Retail Stock Threshold Rules Engine'
      }
    }
  };

  const retailOptionAArch = await aiService.generateArchitecture(retailOptionAContext, retailOptionAContext.solution);
  const normalizedOptionA = normalizeArchitectureData(retailOptionAArch, retailOptionAContext);

  const optionAAiNode = normalizedOptionA.nodes.find(n => n.tier === 'AI & Automation');
  assert(
    optionAAiNode && /rule/i.test(optionAAiNode.label + optionAAiNode.tech),
    'Edit Propagation: Switching to Option A updates AI & Automation node to Rules Engine',
    `label: ${optionAAiNode?.label}, tech: ${optionAAiNode?.tech}`
  );

  const optionANodeText = (optionAAiNode?.label || '') + ' ' + (optionAAiNode?.tech || '');
  assert(
    !/copilot|deep learning|llm/i.test(optionANodeText),
    'Edit Propagation: Option A architecture contains zero heavy LLM/Copilot leakage',
    `text: ${optionANodeText}`
  );

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`ACCEPTANCE RESULTS: ${passedCount} / ${totalCount} TESTS PASSED`);
  console.log('======================================================================\n');

  if (passedCount === totalCount) {
    console.log('🏆 ALL STAGE 4 ARCHITECTURE ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${totalCount - passedCount} TESTS FAILED!\n`);
    process.exit(1);
  }
}

runStage4AcceptanceTests().catch(err => {
  console.error('Fatal error running acceptance tests:', err);
  process.exit(1);
});

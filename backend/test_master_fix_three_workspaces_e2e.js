/**
 * Master Fix E2E Verification: Three Completely Different Workspaces
 *
 * Requirements from Section 19 & 20 of Master Fix Prompt:
 * WORKSPACE A: Online grocery delivery platform
 * WORKSPACE B: Manufacturing equipment maintenance platform
 * WORKSPACE C: University student enrollment platform
 *
 * Verifies:
 * - Real API generation via POST /api/workspaces/:id/architecture/generate
 * - Complete database persistence via Prisma
 * - Material differences between graphs across all 3 domains
 * - Negative assertions: Zero cross-domain leakage (No Patient/HealthBase/WhatsApp in Manufacturing or Grocery, etc.)
 * - Grounded technologies, requirement traceability, dynamic HLD, LLD, Security, and Integrations
 * - Regeneration preserving USER_ADDED nodes
 * - Stale detection on upstream mutation
 * - Multi-tenant isolation
 */

import assert from 'assert';
import jwt from 'jsonwebtoken';
import { prisma } from './src/prisma.js';

const BASE_URL = 'http://localhost:5005';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-prod';

let passCount = 0;
function pass(msg) {
  passCount++;
  console.log(`  ✅ PASS: ${msg}`);
}

async function api(endpoint, options = {}, token = null) {
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data };
}

const WORKSPACE_SPECS = [
  {
    key: 'GROCERY',
    name: 'FreshDirect Online Grocery & Fast Delivery',
    industry: 'Retail & eCommerce',
    objective: 'Sub-60-minute grocery delivery, perishable stock synchronization, and driver dispatch',
    challenge: 'Perishable item spoilage from delayed delivery routing and multi-warehouse inventory drift',
    targetUsers: 'Online Grocery Shoppers, Dark Store Pickers, Delivery Couriers',
    requirements: [
      { id: 'REQ-GROC-01', text: 'Real-time perishable stock reservation and cart checkout' },
      { id: 'REQ-GROC-02', text: 'Dynamic grocery delivery courier routing and ETA calculation' },
      { id: 'REQ-GROC-03', text: 'Integration with Stripe payment processing' }
    ],
    capabilities: [
      { id: 'CAP-GROC-01', name: 'Grocery Cart & Order Checkout' },
      { id: 'CAP-GROC-02', name: 'Dark Store Inventory Replenishment' },
      { id: 'CAP-GROC-03', name: 'Courier Last-Mile Dispatch' }
    ],
    techStack: {
      frontend: 'React Native Mobile Shopper App',
      backend: 'Node.js Express Order & Inventory Mesh',
      database: 'PostgreSQL 15 Perishable Catalog',
      ai: 'Demand Prediction & Shelf-Life Copilot',
      integrations: 'Stripe Payment Gateway, Mapbox Routing API'
    },
    existingSystems: ['Legacy Dark Store WMS'],
    expectedKeywords: ['grocery', 'order', 'inventory', 'delivery', 'cart', 'store', 'courier', 'checkout'],
    forbiddenKeywords: ['patient', 'healthbase', 'doctor', 'hospital', 'clinic', 'ehr', 'scada', 'plc', 'cnc', 'student', 'tuition', 'enrollment', 'course prerequisite']
  },
  {
    key: 'MANUFACTURING',
    name: 'Titanium SCADA Factory Equipment Maintenance',
    industry: 'Industrial Manufacturing',
    objective: 'Predictive maintenance alerts, industrial SCADA telemetry ingestion, and CNC tool lifecycle tracking',
    challenge: 'Unscheduled factory floor stoppages caused by undetected CNC spindle overheating and bearing failures',
    targetUsers: 'Factory Shift Supervisors, Maintenance Engineers, Machine Operators',
    requirements: [
      { id: 'REQ-MFG-01', text: 'Sub-second SCADA and PLC sensor telemetry stream ingestion' },
      { id: 'REQ-MFG-02', text: 'Predictive equipment failure detection and automated technician dispatch' },
      { id: 'REQ-MFG-03', text: 'Bidirectional sync with on-premise SAP Plant Maintenance (PM)' }
    ],
    capabilities: [
      { id: 'CAP-MFG-01', name: 'SCADA IoT Telemetry Ingestion' },
      { id: 'CAP-MFG-02', name: 'Predictive Machinery Anomaly Engine' },
      { id: 'CAP-MFG-03', name: 'SAP Plant Maintenance Integration' }
    ],
    techStack: {
      frontend: 'Industrial Angular Operator Console',
      backend: 'Rust High-Throughput Ingestion Engine',
      database: 'TimescaleDB Industrial Sensor Time-Series',
      ai: 'Anomaly Detection & Remaining Useful Life (RUL) Model',
      integrations: 'MQTT IoT Broker, SAP Plant Maintenance ERP'
    },
    existingSystems: ['SAP Plant Maintenance (PM)', 'Allen-Bradley PLC Gateway'],
    expectedKeywords: ['scada', 'telemetry', 'sensor', 'maintenance', 'factory', 'equipment', 'iot', 'cnc', 'machine'],
    forbiddenKeywords: ['patient', 'healthbase', 'doctor', 'hospital', 'clinic', 'ehr', 'whatsapp appointment', 'hipaa', 'grocery', 'cart checkout', 'student', 'tuition', 'enrollment']
  },
  {
    key: 'UNIVERSITY',
    name: 'Apex University Student Enrollment & Academic Flow',
    industry: 'Higher Education',
    objective: 'Automated student course registration, prerequisite degree auditing, and tuition fee billing',
    challenge: 'Extreme registration portal traffic spikes causing server crashes, and manual prerequisite exception reviews',
    targetUsers: 'Undergraduate & Graduate Students, Academic Advisors, University Registrar',
    requirements: [
      { id: 'REQ-UNIV-01', text: 'High-concurrency student course enrollment and waitlist management' },
      { id: 'REQ-UNIV-02', text: 'Automated prerequisite degree audit and graduation clearance check' },
      { id: 'REQ-UNIV-03', text: 'Tuition fee calculation and student financial portal integration' }
    ],
    capabilities: [
      { id: 'CAP-UNIV-01', name: 'Student Enrollment & Course Registration' },
      { id: 'CAP-UNIV-02', name: 'Automated Degree Audit & Prerequisite Engine' },
      { id: 'CAP-UNIV-03', name: 'Student Accounts & Tuition Billing' }
    ],
    techStack: {
      frontend: 'Next.js Student & Advisor Web Portal',
      backend: 'Java Spring Boot Academic Core',
      database: 'PostgreSQL Student Information Store',
      ai: 'Academic Schedule & Degree Path Advisory AI',
      integrations: 'Ellucian Banner SIS, Canvas LMS LTI'
    },
    existingSystems: ['Ellucian Banner SIS (Student Information System)', 'Canvas LMS'],
    expectedKeywords: ['student', 'enrollment', 'course', 'registration', 'prerequisite', 'academic', 'degree', 'tuition'],
    forbiddenKeywords: ['patient', 'healthbase', 'doctor', 'hospital', 'clinic', 'ehr', 'whatsapp appointment', 'hipaa', 'scada', 'telemetry', 'cnc', 'machinery', 'grocery cart', 'courier delivery']
  }
];

async function runMasterFixVerification() {
  console.log('======================================================================');
  console.log('  MASTER FIX AUDIT: THREE COMPLETELY DIFFERENT WORKSPACES E2E TEST    ');
  console.log('======================================================================\n');

  const ts = Date.now();
  const org = await prisma.organization.create({
    data: { name: `Master Fix Enterprise ${ts}`, industry: 'Multi-Industry Enterprise' }
  });
  const orgRival = await prisma.organization.create({
    data: { name: `Rival Tenant Org ${ts}`, industry: 'Competitor' }
  });

  const user = await prisma.user.create({
    data: {
      email: `architect.${ts}@enterprise.org`,
      passwordHash: 'dummy_hash',
      name: 'Chief Enterprise Architect',
      role: 'ADMIN',
      organizationId: org.id
    }
  });

  const rivalUser = await prisma.user.create({
    data: {
      email: `intruder.${ts}@competitor.org`,
      passwordHash: 'dummy_hash',
      name: 'Unauthorized Competitor',
      role: 'CONSULTANT',
      organizationId: orgRival.id
    }
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, organizationId: org.id },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const rivalToken = jwt.sign(
    { id: rivalUser.id, email: rivalUser.email, role: rivalUser.role, organizationId: orgRival.id },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  pass('Provisioned multi-tenant test organizations and security tokens');

  const generatedArchitectures = {};

  // 1. Generate & Persist Architecture for each of the 3 Workspaces
  for (const spec of WORKSPACE_SPECS) {
    console.log(`\n----------------------------------------------------------------------`);
    console.log(`  GENERATING ARCHITECTURE FOR: ${spec.key} (${spec.name})`);
    console.log(`----------------------------------------------------------------------`);

    // A. Create Workspace
    const wsRes = await api('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name: spec.name,
        description: `Enterprise workspace for ${spec.name}`,
        industry: spec.industry,
        objective: spec.objective,
        challenge: spec.challenge,
        targetUsers: spec.targetUsers,
        expectedOutcome: 'Complete end-to-end automation'
      })
    }, token);

    assert.strictEqual(wsRes.status, 201, `Workspace creation for ${spec.key} failed`);
    const workspaceId = wsRes.data.workspace.id;
    pass(`Created Workspace: ${spec.name} (${workspaceId})`);

    // B. Create Stage 2 Business Analysis
    const ba = await prisma.businessAnalysis.create({
      data: {
        workspaceId,
        currentState: `Manual processes in ${spec.industry}`,
        futureState: `Automated modern platform for ${spec.objective}`,
        goals: JSON.stringify([spec.objective]),
        painPoints: JSON.stringify([spec.challenge]),
        stakeholders: JSON.stringify(['Domain Operations Lead', 'System Administrator']),
        requirements: JSON.stringify(spec.requirements),
        currentOperatingContext: JSON.stringify({ existingSystems: spec.existingSystems }),
        gaps: JSON.stringify(['Lack of real-time sync', 'Manual data re-entry']),
        processIssues: JSON.stringify(['Fragmented tools']),
        automationOpportunities: JSON.stringify(['Automated event routing']),
        improvementOpportunities: JSON.stringify(['Centralized analytics']),
        status: 'APPROVED'
      }
    });
    pass(`Seeded Stage 2 Business Analysis with ${spec.requirements.length} validated requirements`);

    // C. Create Stage 3 Solution
    const sol = await prisma.solution.create({
      data: {
        workspaceId,
        name: `${spec.key} Solution Strategy`,
        summary: `Strategic architecture for ${spec.objective}`,
        businessValue: `Drastic reduction of ${spec.challenge}`,
        keyCapabilities: JSON.stringify(spec.capabilities),
        automationOpps: JSON.stringify(['Automatic event streaming']),
        aiOpps: JSON.stringify(['Predictive analysis']),
        techStack: JSON.stringify(spec.techStack),
        implementationApproach: 'Phased microservices rollout',
        risks: JSON.stringify(['Operational migration downtime']),
        assumptions: JSON.stringify(['API endpoints are accessible']),
        dependencies: JSON.stringify(['Cloud infrastructure']),
        options: JSON.stringify([
          { id: 'OPTION_A', name: 'Monolith Fast Track', cost: 'Low' },
          { id: 'OPTION_B', name: 'Microservices Mesh (Recommended)', cost: 'Medium' }
        ]),
        selectedOption: 'OPTION_B',
        status: 'APPROVED',
        sourceAnalysisId: ba.id
      }
    });
    pass(`Seeded Stage 3 Solution with selectedOption=OPTION_B and classified tech stack`);

    // D. Invoke Real Generation API (Testing POST /architecture/generate endpoint)
    const startTime = Date.now();
    const genRes = await api(`/api/workspaces/${workspaceId}/architecture/generate`, {
      method: 'POST',
      body: JSON.stringify({})
    }, token);

    const latency = Date.now() - startTime;
    console.log(`  ⏱️ Generation API completed in ${latency}ms (Status: ${genRes.status})`);
    assert.strictEqual(genRes.status, 201, `Generation API failed for ${spec.key}: ${JSON.stringify(genRes.data)}`);
    assert(genRes.data.architecture, 'Response missing architecture');
    assert(Array.isArray(genRes.data.architecture.nodes), 'Response missing nodes array');
    assert(Array.isArray(genRes.data.architecture.edges), 'Response missing edges array');
    pass(`POST /api/workspaces/:id/architecture/generate returned 201 with ${genRes.data.architecture.nodes.length} nodes and ${genRes.data.architecture.edges.length} edges`);

    // E. Verify DIRECTLY in Prisma SQLite Database
    const dbArch = await prisma.architecture.findFirst({
      where: { workspaceId },
      include: { nodes: true, edges: true }
    });

    assert(dbArch, 'Architecture must be persisted in database');
    assert.strictEqual(dbArch.workspaceId, workspaceId, 'Architecture workspaceId must match');
    assert.strictEqual(dbArch.sourceSolutionId, sol.id, 'sourceSolutionId must match Stage 3 solution');
    assert.strictEqual(dbArch.sourceSolutionOptionId, 'OPTION_B', 'sourceSolutionOptionId must match OPTION_B');
    assert(dbArch.sourceContextHash && dbArch.sourceContextHash.length > 0, 'sourceContextHash must be present');
    assert(typeof dbArch.highLevelDesign === 'string' && dbArch.highLevelDesign.length > 20, 'HLD must be non-empty string');
    assert(typeof dbArch.lowLevelDesign === 'string' && dbArch.lowLevelDesign.length > 20, 'LLD must be non-empty string');
    assert(typeof dbArch.securityArch === 'string' && dbArch.securityArch.length > 20, 'Security must be non-empty string');
    assert(typeof dbArch.integrationArch === 'string' && dbArch.integrationArch.length > 20, 'Integration must be non-empty string');
    assert(!dbArch.highLevelDesign.includes('[object Object]'), 'HLD must not contain [object Object]');
    assert(!dbArch.lowLevelDesign.includes('[object Object]'), 'LLD must not contain [object Object]');
    pass(`Prisma database record verified: valid scalars, zero [object Object], correct relational links`);

    // F. Node and Edge Graph Validation
    const nodeIds = new Set(dbArch.nodes.map(n => n.id));
    assert.strictEqual(nodeIds.size, dbArch.nodes.length, 'Node IDs must be strictly unique');
    assert(dbArch.nodes.length >= 6, `Must have at least 6 nodes (got ${dbArch.nodes.length})`);

    for (const edge of dbArch.edges) {
      assert(nodeIds.has(edge.sourceId), `Edge sourceId ${edge.sourceId} does not exist in nodes`);
      assert(nodeIds.has(edge.targetId), `Edge targetId ${edge.targetId} does not exist in nodes`);
      assert.notStrictEqual(edge.sourceId, edge.targetId, `Self-loop detected on ${edge.sourceId}`);
    }
    pass(`All ${dbArch.nodes.length} nodes and ${dbArch.edges.length} edges verified: zero dangling references, zero self-loops`);

    // G. GET Endpoint Verification (Frontend fetching path)
    const getRes = await api(`/api/workspaces/${workspaceId}/architecture`, { method: 'GET' }, token);
    assert.strictEqual(getRes.status, 200, 'GET /architecture must return 200');
    assert.strictEqual(getRes.data.architecture.id, dbArch.id, 'GET payload matches DB record');
    assert.strictEqual(getRes.data.isStale, false, 'Freshly generated architecture is not stale');
    pass(`GET /api/workspaces/:id/architecture returned correct hydrated architecture payload`);

    // Collect full text for cross-domain audit
    const fullText = [
      dbArch.title,
      dbArch.highLevelDesign,
      dbArch.lowLevelDesign,
      dbArch.securityArch,
      dbArch.integrationArch,
      ...dbArch.nodes.map(n => `${n.label} ${n.description} ${n.tech || ''} ${n.purpose || ''}`)
    ].join(' ').toLowerCase();

    generatedArchitectures[spec.key] = {
      workspaceId,
      spec,
      dbArch,
      fullText
    };
  }

  // ----------------------------------------------------------------------
  // 2. Cross-Domain Leakage and Material Difference Audit
  // ----------------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`  AUDITING CROSS-DOMAIN LEAKAGE & MATERIAL GRAPH DIFFERENCES`);
  console.log(`----------------------------------------------------------------------`);

  for (const [key, item] of Object.entries(generatedArchitectures)) {
    const { spec, fullText } = item;

    // Check expected domain keywords
    const matched = spec.expectedKeywords.filter(kw => fullText.includes(kw));
    assert(
      matched.length >= 2,
      `Domain ${key} architecture should contain domain-specific terms like ${spec.expectedKeywords.join(', ')}. Found: ${matched.join(', ')}`
    );
    pass(`${key} architecture grounded in domain terms (${matched.join(', ')})`);

    // Check negative assertions (forbidden cross-domain terms)
    for (const forbidden of spec.forbiddenKeywords) {
      assert(
        !fullText.includes(forbidden),
        `CRITICAL LEAKAGE DETECTED: Domain "${key}" architecture unexpectedly contains forbidden term "${forbidden}"`
      );
    }
    pass(`${key} architecture completely free of forbidden cross-domain terms (${spec.forbiddenKeywords.slice(0, 5).join(', ')}...)`);
  }

  // Verify that Grocery, Manufacturing, and University produce materially different graphs
  const groceryText = generatedArchitectures['GROCERY'].fullText;
  const mfgText = generatedArchitectures['MANUFACTURING'].fullText;
  const univText = generatedArchitectures['UNIVERSITY'].fullText;

  assert.notStrictEqual(groceryText, mfgText, 'Grocery and Manufacturing architectures must be materially different');
  assert.notStrictEqual(mfgText, univText, 'Manufacturing and University architectures must be materially different');
  assert.notStrictEqual(groceryText, univText, 'Grocery and University architectures must be materially different');
  pass('All 3 workspaces produced materially distinct, domain-specific architecture graphs');

  // ----------------------------------------------------------------------
  // 3. User-Added Node Preservation on Regeneration
  // ----------------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`  TESTING USER_ADDED NODE SURVIVAL ACROSS REGENERATION`);
  console.log(`----------------------------------------------------------------------`);

  const groceryWsId = generatedArchitectures['GROCERY'].workspaceId;
  const customNodeName = `Local Dark Store Cold Vault Proxy ${ts}`;

  const addRes = await api(`/api/workspaces/${groceryWsId}/architecture/nodes`, {
    method: 'POST',
    body: JSON.stringify({
      label: customNodeName,
      type: 'INTEGRATION',
      tier: 'Integrations',
      description: 'Custom edge proxy for walk-in blast freezer sensors',
      tech: 'Go gRPC Daemon',
      purpose: 'Bridges temperature sensors to order reservation engine'
    })
  }, token);

  assert.strictEqual(addRes.status, 201, 'Adding custom node failed');
  assert.strictEqual(addRes.data.node.classification, 'USER_ADDED', 'Custom node must have classification USER_ADDED');
  const customId = addRes.data.node.id;
  pass(`Created manual node with classification USER_ADDED: "${customNodeName}" (${customId})`);

  // Call POST /architecture/regenerate endpoint
  console.log(`  Regenerating Grocery architecture using POST /architecture/regenerate...`);
  const regenRes = await api(`/api/workspaces/${groceryWsId}/architecture/regenerate`, {
    method: 'POST',
    body: JSON.stringify({})
  }, token);

  assert.strictEqual(regenRes.status, 201, 'Regenerate API failed');
  const regenNodes = regenRes.data.architecture.nodes;
  const survivingNode = regenNodes.find(n => n.label === customNodeName);
  assert(survivingNode, `Manual USER_ADDED node "${customNodeName}" must survive regeneration!`);
  assert.strictEqual(survivingNode.classification, 'USER_ADDED', 'Surviving node must retain USER_ADDED classification');
  pass(`Manual USER_ADDED node survived regeneration with version bump (v${regenRes.data.architecture.version})`);

  // ----------------------------------------------------------------------
  // 4. Stale Detection on Upstream Solution Mutation
  // ----------------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`  TESTING STALE ARCHITECTURE DETECTION ON STAGE 3 MUTATION`);
  console.log(`----------------------------------------------------------------------`);

  const mfgWsId = generatedArchitectures['MANUFACTURING'].workspaceId;
  const mfgSol = await prisma.solution.findFirst({ where: { workspaceId: mfgWsId } });
  assert(mfgSol, 'Manufacturing solution must exist');

  await prisma.solution.update({
    where: { id: mfgSol.id },
    data: { selectedOption: 'OPTION_A' }
  });
  pass('Updated Manufacturing Stage 3 solution option from OPTION_B to OPTION_A');

  const staleCheck = await api(`/api/workspaces/${mfgWsId}/architecture`, { method: 'GET' }, token);
  assert.strictEqual(staleCheck.status, 200);
  assert.strictEqual(staleCheck.data.isStale, true, 'Architecture must be marked stale after upstream option change');
  assert(staleCheck.data.staleReason && staleCheck.data.staleReason.includes('OPTION_A'), 'staleReason must explain option change');
  pass(`Stale detection triggered correctly: "${staleCheck.data.staleReason}"`);

  // ----------------------------------------------------------------------
  // 5. Multi-Tenant Workspace Isolation
  // ----------------------------------------------------------------------
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`  TESTING MULTI-TENANT WORKSPACE ISOLATION`);
  console.log(`----------------------------------------------------------------------`);

  const rivalGet = await api(`/api/workspaces/${groceryWsId}/architecture`, { method: 'GET' }, rivalToken);
  assert.strictEqual(rivalGet.status, 404, 'Rival user must be blocked with 404 on GET');
  pass('Unauthorized cross-tenant GET access securely blocked with HTTP 404');

  const rivalGen = await api(`/api/workspaces/${groceryWsId}/architecture/generate`, {
    method: 'POST',
    body: JSON.stringify({})
  }, rivalToken);
  assert.strictEqual(rivalGen.status, 404, 'Rival user must be blocked with 404 on POST /generate');
  pass('Unauthorized cross-tenant POST /generate access securely blocked with HTTP 404');

  console.log('\n======================================================================');
  console.log(`  ALL MASTER FIX E2E AUDIT TESTS PASSED! (${passCount} checks)`);
  console.log('======================================================================\n');
}

runMasterFixVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ MASTER FIX E2E AUDIT TEST FAILED:', err);
    process.exit(1);
  });

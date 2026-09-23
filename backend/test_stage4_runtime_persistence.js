/**
 * Stage 4 E2E Integration Test: Real Runtime Architecture Generation & Persistence
 *
 * Tests:
 * 1. Tenant & User Provisioning with JWT
 * 2. 6-Domain End-to-End Generation through real HTTP endpoint POST /api/workspaces/:id/architecture
 *    - Retail, Healthcare, Logistics, Legal, FinTech, Manufacturing
 * 3. Strict Prisma Persistence Verification directly via database:
 *    - prisma.architecture record created with valid scalars
 *    - prisma.architectureNode records created with valid tiers, types, and classification enums
 *    - prisma.architectureEdge records created without dangling IDs or self-loops
 *    - No raw "[object Object]" strings in any text columns
 * 4. Cross-Domain Vocabulary Grounding & Leakage Prevention across all 6 domains
 * 5. Manual USER_ADDED node preservation across architecture regeneration
 * 6. Workspace isolation & multi-tenant security
 * 7. Stale detection on upstream Stage 3 solution mutation
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

const CANONICAL_TIERS = [
  'Client Layer',
  'Gateway Layer',
  'Application Services',
  'AI & Automation',
  'Persistence',
  'Integrations'
];

const CANONICAL_TYPES = ['CLIENT', 'GATEWAY', 'SERVICE', 'AI', 'DATABASE', 'INTEGRATION'];

const DOMAIN_SPECS = [
  {
    domain: 'Retail',
    name: 'Nordic Retail Omnichannel Sync',
    industry: 'Retail',
    objective: 'Real-time multi-store inventory synchronization and checkout processing',
    challenge: 'Stockout discrepancies between physical stores and eCommerce channels',
    expectedDomainKeywords: ['inventory', 'store', 'checkout', 'pos', 'cart', 'order', 'catalog'],
    forbiddenKeywords: ['patient', 'hospital', 'clinic', 'ehr', 'physician', 'prescription', 'litigation', 'scada']
  },
  {
    domain: 'Healthcare',
    name: 'Apex Clinic Patient Intake & EHR Flow',
    industry: 'Healthcare',
    objective: 'Streamline patient clinic check-in and doctor EHR scheduling',
    challenge: 'High appointment no-shows and fragmented patient medical records',
    expectedDomainKeywords: ['patient', 'clinic', 'doctor', 'appointment', 'ehr', 'medical', 'schedule'],
    forbiddenKeywords: ['freight', 'telematics', 'litigation', 'deposition', 'scada', 'pos checkout']
  },
  {
    domain: 'Logistics',
    name: 'Velocity Freight Telematics & Dispatch',
    industry: 'Logistics',
    objective: 'Automated fleet dispatch, GPS cargo tracking, and route optimization',
    challenge: 'Unpredictable delivery delays and idle carrier transit times',
    expectedDomainKeywords: ['fleet', 'freight', 'dispatch', 'route', 'shipment', 'carrier', 'cargo', 'truck'],
    forbiddenKeywords: ['patient', 'hospital', 'clinic', 'litigation', 'court', 'deposition', 'scada']
  },
  {
    domain: 'Legal',
    name: 'Lexis Legal Litigation & Contract Discovery',
    industry: 'Legal',
    objective: 'Automated legal case file analysis, clause extraction, and deposition search',
    challenge: 'Thousands of discovery documents take weeks for associate attorneys to review',
    expectedDomainKeywords: ['legal', 'case', 'contract', 'clause', 'litigation', 'discovery', 'deposition', 'attorney'],
    forbiddenKeywords: ['patient', 'hospital', 'clinic', 'ehr', 'scada', 'freight dispatch']
  },
  {
    domain: 'FinTech',
    name: 'Meridian Fraud Detection & Settlement Ledger',
    industry: 'FinTech',
    objective: 'Sub-second card transaction fraud screening and AML audit ledger',
    challenge: 'Surging fraudulent card transactions and delayed cross-border clearing',
    expectedDomainKeywords: ['fraud', 'payment', 'transaction', 'ledger', 'settlement', 'aml', 'card', 'clearing'],
    forbiddenKeywords: ['patient', 'hospital', 'clinic', 'scada', 'deposition']
  },
  {
    domain: 'Manufacturing',
    name: 'Titanium SCADA IoT Predictive Maintenance',
    industry: 'Manufacturing',
    objective: 'Industrial CNC telemetry ingestion and predictive failure alerts for factory floor',
    challenge: 'Unexpected machinery breakdowns causing assembly line halts',
    expectedDomainKeywords: ['scada', 'iot', 'telemetry', 'cnc', 'sensor', 'maintenance', 'factory', 'equipment'],
    forbiddenKeywords: ['patient', 'hospital', 'clinic', 'litigation', 'deposition']
  }
];

async function runStage4Tests() {
  console.log('===============================================================');
  console.log('  STAGE 4: RUNTIME ARCHITECTURE PERSISTENCE & CONTRACT TEST    ');
  console.log('===============================================================\n');

  // 1. Setup Organizations and Users
  const ts = Date.now();
  const orgPrimary = await prisma.organization.create({
    data: { name: `Primary Enterprise Org ${ts}`, industry: 'Technology' }
  });
  const orgRival = await prisma.organization.create({
    data: { name: `Rival Tenant Org ${ts}`, industry: 'Technology' }
  });

  const userPrimary = await prisma.user.create({
    data: {
      email: `architect.${ts}@enterprise.com`,
      passwordHash: 'dummy_hash',
      name: 'Lead Enterprise Architect',
      role: 'ADMIN',
      organizationId: orgPrimary.id
    }
  });

  const userRival = await prisma.user.create({
    data: {
      email: `intruder.${ts}@rival.com`,
      passwordHash: 'dummy_hash',
      name: 'Rival Intruder',
      role: 'CONSULTANT',
      organizationId: orgRival.id
    }
  });

  const tokenPrimary = jwt.sign(
    { id: userPrimary.id, email: userPrimary.email, role: userPrimary.role, organizationId: orgPrimary.id },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const tokenRival = jwt.sign(
    { id: userRival.id, email: userRival.email, role: userRival.role, organizationId: orgRival.id },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  pass('Provisioned multi-tenant test organizations and authenticated JWT tokens');

  const generatedDomainArchitectures = {};

  // 2. Loop through all 6 Domains and Test Runtime Path
  for (const spec of DOMAIN_SPECS) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`  TESTING DOMAIN: ${spec.domain.toUpperCase()}`);
    console.log(`---------------------------------------------------------------`);

    // A. Create Workspace
    const wsRes = await api('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name: spec.name,
        description: `Enterprise solution for ${spec.domain}`,
        industry: spec.industry,
        objective: spec.objective,
        challenge: spec.challenge,
        targetUsers: `${spec.domain} Operations Team`,
        expectedOutcome: `3x efficiency improvement in ${spec.domain}`
      })
    }, tokenPrimary);

    assert.strictEqual(wsRes.status, 201, `Workspace creation for ${spec.domain} must succeed`);
    const workspaceId = wsRes.data.workspace.id;
    pass(`Workspace created: ${spec.name} (${workspaceId})`);

    // B. Seed Stage 2 Business Analysis
    const ba = await prisma.businessAnalysis.create({
      data: {
        workspaceId,
        currentState: `Legacy manual processes in ${spec.domain}`,
        futureState: `Modern cloud-native automated solution for ${spec.domain}`,
        goals: JSON.stringify([spec.objective]),
        painPoints: JSON.stringify([spec.challenge]),
        stakeholders: JSON.stringify([`${spec.domain} Manager`, 'System Admin']),
        requirements: JSON.stringify([
          { id: `REQ-${spec.domain}-01`, text: `High-availability core engine for ${spec.domain}` },
          { id: `REQ-${spec.domain}-02`, text: `Real-time analytics and event streaming for ${spec.domain}` }
        ]),
        gaps: JSON.stringify(['No unified API gateway', 'Siloed relational storage']),
        processIssues: JSON.stringify(['Manual re-entry', 'Lack of auditing']),
        automationOpportunities: JSON.stringify(['AI classification', 'Workflow trigger']),
        improvementOpportunities: JSON.stringify(['Automated routing']),
        status: 'APPROVED'
      }
    });
    pass(`Seeded Stage 2 BusinessAnalysis for ${spec.domain}`);

    // C. Seed Stage 3 Solution
    const sol = await prisma.solution.create({
      data: {
        workspaceId,
        name: `${spec.domain} Enterprise Platform Solution`,
        summary: `End-to-end architecture tailored for ${spec.objective}`,
        businessValue: `Drastic reduction of ${spec.challenge}`,
        keyCapabilities: JSON.stringify([
          { id: `CAP-${spec.domain}-01`, name: `${spec.domain} Processing Core` },
          { id: `CAP-${spec.domain}-02`, name: `${spec.domain} Event Ingestion` }
        ]),
        automationOpps: JSON.stringify(['Automated alerts']),
        aiOpps: JSON.stringify(['Predictive anomaly detection']),
        techStack: JSON.stringify({
          frontend: 'React, TailwindCSS',
          backend: 'Node.js, Express, GraphQL',
          ai: 'Google Gemini 3.1 Flash Lite',
          database: 'PostgreSQL, Redis',
          integrations: 'Kafka, Webhooks'
        }),
        implementationApproach: 'Phased microservices migration',
        risks: JSON.stringify(['Legacy migration downtime']),
        assumptions: JSON.stringify(['API access is available']),
        dependencies: JSON.stringify(['Cloud infrastructure provisioning']),
        options: JSON.stringify([
          { id: 'OPTION_A', name: 'Monolith Fast Track', cost: 'Low' },
          { id: 'OPTION_B', name: 'Microservices Mesh (Recommended)', cost: 'Medium' }
        ]),
        selectedOption: 'OPTION_B',
        status: 'APPROVED',
        sourceAnalysisId: ba.id
      }
    });
    pass(`Seeded Stage 3 Solution (selectedOption: OPTION_B) for ${spec.domain}`);

    // D. Invoke Real Architecture Generation via HTTP API
    const startTime = Date.now();
    const genRes = await api(`/api/workspaces/${workspaceId}/architecture`, {
      method: 'POST',
      body: JSON.stringify({})
    }, tokenPrimary);

    const elapsed = Date.now() - startTime;
    console.log(`  ⏱️ Generation call completed in ${elapsed}ms (status: ${genRes.status})`);

    // Verify response HTTP status and basic structure
    assert.strictEqual(genRes.status, 201, `Architecture generation for ${spec.domain} must succeed with 201 Created. Got: ${JSON.stringify(genRes.data)}`);
    assert(genRes.data.architecture, 'Response must contain architecture object');
    assert(Array.isArray(genRes.data.architecture.nodes), 'Response architecture must contain nodes array');
    assert(Array.isArray(genRes.data.architecture.edges), 'Response architecture must contain edges array');
    assert.strictEqual(genRes.data.isStale, false, 'Newly generated architecture must not be stale');
    pass(`HTTP POST /api/workspaces/:id/architecture returned 201 with ${genRes.data.architecture.nodes.length} nodes and ${genRes.data.architecture.edges.length} edges`);

    // E. Verify DIRECTLY in Prisma Database
    const dbArch = await prisma.architecture.findFirst({
      where: { workspaceId },
      include: { nodes: true, edges: true }
    });

    assert(dbArch, `Database record for architecture must exist in workspace ${workspaceId}`);
    assert.strictEqual(dbArch.workspaceId, workspaceId, 'Architecture record workspaceId must match');
    assert.strictEqual(dbArch.sourceSolutionId, sol.id, 'sourceSolutionId must match Stage 3 solution ID');
    assert.strictEqual(dbArch.sourceSolutionOptionId, 'OPTION_B', 'sourceSolutionOptionId must match OPTION_B');
    assert(dbArch.sourceContextHash && dbArch.sourceContextHash.length > 0, 'sourceContextHash must be populated');
    assert(dbArch.title && typeof dbArch.title === 'string', 'Architecture title must be a valid non-empty string');
    assert(typeof dbArch.highLevelDesign === 'string' && dbArch.highLevelDesign.length > 20, 'highLevelDesign must be a valid string');
    assert(!dbArch.highLevelDesign.includes('[object Object]'), 'highLevelDesign must NEVER contain [object Object]');
    assert(!dbArch.securityArch.includes('[object Object]'), 'securityArch must NEVER contain [object Object]');
    assert(!dbArch.integrationArch.includes('[object Object]'), 'integrationArch must NEVER contain [object Object]');
    pass(`Prisma architecture record verified with clean strings and valid references`);

    // F. Verify Nodes in Prisma Database
    assert(dbArch.nodes.length >= 6, `Architecture must have at least 6 nodes (got ${dbArch.nodes.length})`);
    const nodeIds = new Set(dbArch.nodes.map(n => n.id));
    assert.strictEqual(nodeIds.size, dbArch.nodes.length, 'There must be NO duplicate node IDs in the database');

    const foundTiers = new Set();
    for (const node of dbArch.nodes) {
      assert(CANONICAL_TIERS.includes(node.tier), `Node "${node.label}" has invalid tier: "${node.tier}"`);
      assert(CANONICAL_TYPES.includes(node.type), `Node "${node.label}" has invalid type: "${node.type}"`);
      assert(node.classification, `Node "${node.label}" must have classification`);
      assert(!node.label.includes('[object Object]'), 'Node label must not contain [object Object]');
      assert(!node.description.includes('[object Object]'), 'Node description must not contain [object Object]');
      foundTiers.add(node.tier);
    }
    assert(foundTiers.size >= 4, `Architecture nodes should span multiple tiers (got ${foundTiers.size} tiers)`);
    pass(`All ${dbArch.nodes.length} nodes verified: canonical tiers, valid types, valid classifications, zero [object Object]`);

    // G. Verify Edges in Prisma Database
    assert(dbArch.edges.length >= 4, `Architecture must have at least 4 edges (got ${dbArch.edges.length})`);
    for (const edge of dbArch.edges) {
      assert(nodeIds.has(edge.sourceId), `Edge sourceId "${edge.sourceId}" must exist in node IDs`);
      assert(nodeIds.has(edge.targetId), `Edge targetId "${edge.targetId}" must exist in node IDs`);
      assert.notStrictEqual(edge.sourceId, edge.targetId, `Edge must NOT be a self-loop (source == target: ${edge.sourceId})`);
    }
    pass(`All ${dbArch.edges.length} edges verified: zero dangling references, zero self-loops`);

    // H. Fetch via GET Endpoint to verify Canvas payload rendering
    const getRes = await api(`/api/workspaces/${workspaceId}/architecture`, { method: 'GET' }, tokenPrimary);
    assert.strictEqual(getRes.status, 200, 'GET /architecture must return 200');
    assert(getRes.data.architecture, 'GET /architecture must return architecture payload');
    assert.strictEqual(getRes.data.architecture.id, dbArch.id, 'GET payload matches DB record ID');
    assert.strictEqual(getRes.data.isStale, false, 'Fetched architecture is not stale');
    pass(`GET /api/workspaces/:id/architecture verified successfully`);

    // Collect domain content for cross-domain comparison
    const allText = [
      dbArch.title,
      dbArch.highLevelDesign,
      dbArch.securityArch,
      dbArch.integrationArch,
      ...dbArch.nodes.map(n => `${n.label} ${n.description} ${n.tech || ''} ${n.purpose || ''}`)
    ].join(' ').toLowerCase();

    generatedDomainArchitectures[spec.domain] = {
      workspaceId,
      archId: dbArch.id,
      allText,
      spec
    };
  }

  // -------------------------------------------------------------
  // 3. CROSS-DOMAIN VOCABULARY GROUNDING & LEAKAGE CHECKS
  // -------------------------------------------------------------
  console.log(`\n---------------------------------------------------------------`);
  console.log(`  TESTING CROSS-DOMAIN VOCABULARY GROUNDING & LEAKAGE`);
  console.log(`---------------------------------------------------------------`);

  for (const [domain, entry] of Object.entries(generatedDomainArchitectures)) {
    const { spec, allText } = entry;

    // Check expected domain keywords
    const matchedExpected = spec.expectedDomainKeywords.filter(kw => allText.includes(kw));
    assert(
      matchedExpected.length >= 2,
      `Domain ${domain} architecture should contain domain-specific terms like ${spec.expectedDomainKeywords.join(', ')}. Found: ${matchedExpected.join(', ')}`
    );
    pass(`${domain} architecture grounded in domain terms (${matchedExpected.join(', ')})`);

    // Check forbidden keywords (no cross-domain leakage)
    for (const forbidden of spec.forbiddenKeywords) {
      assert(
        !allText.includes(forbidden),
        `Cross-domain leakage detected: Domain "${domain}" architecture unexpectedly contains forbidden term "${forbidden}"`
      );
    }
    pass(`${domain} architecture free of cross-domain leaked terms`);
  }

  // -------------------------------------------------------------
  // 4. TEST MANUAL USER_ADDED NODE PRESERVATION ON REGENERATION
  // -------------------------------------------------------------
  console.log(`\n---------------------------------------------------------------`);
  console.log(`  TESTING MANUAL USER_ADDED NODE PRESERVATION`);
  console.log(`---------------------------------------------------------------`);

  const retailWsId = generatedDomainArchitectures['Retail'].workspaceId;
  const customNodeLabel = `Custom Warehouse Sync Agent ${ts}`;

  const addNodeRes = await api(`/api/workspaces/${retailWsId}/architecture/nodes`, {
    method: 'POST',
    body: JSON.stringify({
      label: customNodeLabel,
      type: 'INTEGRATION',
      tier: 'Integrations',
      description: 'Hand-crafted integration adapter for custom ERP',
      tech: 'Custom Rust Daemon',
      purpose: 'Bridges legacy inventory with cloud mesh',
      source: 'USER_PROVIDED',
      validationStatus: 'PROPOSED'
    })
  }, tokenPrimary);

  assert.strictEqual(addNodeRes.status, 201, 'Adding custom node should return 201');
  assert(addNodeRes.data.node, 'Should return created node');
  assert.strictEqual(addNodeRes.data.node.classification, 'USER_ADDED', 'Custom node must have USER_ADDED classification');
  const customNodeId = addNodeRes.data.node.id;
  pass(`Created manual node with classification 'USER_ADDED': "${customNodeLabel}" (${customNodeId})`);

  // Regenerate Retail Architecture
  console.log(`  Regenerating Retail architecture to test node preservation...`);
  const regenRes = await api(`/api/workspaces/${retailWsId}/architecture`, {
    method: 'POST',
    body: JSON.stringify({})
  }, tokenPrimary);

  assert.strictEqual(regenRes.status, 201, 'Regeneration should return 201');
  const regenNodes = regenRes.data.architecture.nodes;
  const preservedNode = regenNodes.find(n => n.label === customNodeLabel || n.id === customNodeId);
  assert(preservedNode, `Manual USER_ADDED node "${customNodeLabel}" must survive architecture regeneration!`);
  pass(`Manual USER_ADDED node survived regeneration successfully in v${regenRes.data.architecture.version}`);

  // -------------------------------------------------------------
  // 5. TEST STALE DETECTION ON UPSTREAM STAGE 3 MUTATION
  // -------------------------------------------------------------
  console.log(`\n---------------------------------------------------------------`);
  console.log(`  TESTING STALE DETECTION ON STAGE 3 MUTATION`);
  console.log(`---------------------------------------------------------------`);

  // Switch selectedOption on Retail Solution from OPTION_B to OPTION_A
  const retailSolution = await prisma.solution.findFirst({
    where: { workspaceId: retailWsId }
  });
  assert(retailSolution, 'Retail solution must exist');

  await prisma.solution.update({
    where: { id: retailSolution.id },
    data: { selectedOption: 'OPTION_A' }
  });
  pass(`Updated Stage 3 solution selectedOption from OPTION_B to OPTION_A`);

  const staleCheckRes = await api(`/api/workspaces/${retailWsId}/architecture`, { method: 'GET' }, tokenPrimary);
  assert.strictEqual(staleCheckRes.status, 200, 'GET architecture should succeed');
  assert.strictEqual(staleCheckRes.data.isStale, true, 'Architecture MUST be marked stale after Stage 3 option change');
  assert(staleCheckRes.data.staleReason && staleCheckRes.data.staleReason.includes('OPTION_A'), 'staleReason must explain option change');
  pass(`Stale detection triggered correctly: "${staleCheckRes.data.staleReason}"`);

  // -------------------------------------------------------------
  // 6. TEST WORKSPACE ISOLATION & TENANT SECURITY
  // -------------------------------------------------------------
  console.log(`\n---------------------------------------------------------------`);
  console.log(`  TESTING WORKSPACE ISOLATION & MULTI-TENANT ACCESS CONTROL`);
  console.log(`---------------------------------------------------------------`);

  // Rival user tries to GET Retail workspace architecture
  const rivalGetRes = await api(`/api/workspaces/${retailWsId}/architecture`, { method: 'GET' }, tokenRival);
  assert(
    rivalGetRes.status === 404 || rivalGetRes.status === 403,
    `Cross-tenant GET access must be rejected with 403 or 404 (got ${rivalGetRes.status})`
  );
  pass(`Cross-tenant GET request securely blocked with status ${rivalGetRes.status}`);

  // Rival user tries to regenerate Retail workspace architecture
  const rivalPostRes = await api(`/api/workspaces/${retailWsId}/architecture`, {
    method: 'POST',
    body: JSON.stringify({})
  }, tokenRival);
  assert(
    rivalPostRes.status === 404 || rivalPostRes.status === 403,
    `Cross-tenant POST access must be rejected with 403 or 404 (got ${rivalPostRes.status})`
  );
  pass(`Cross-tenant generation request securely blocked with status ${rivalPostRes.status}`);

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`  ALL STAGE 4 RUNTIME PERSISTENCE TESTS PASSED! (${passCount} checks)`);
  console.log('===============================================================\n');
}

runStage4Tests()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ STAGE 4 RUNTIME PERSISTENCE TEST FAILED:', err);
    process.exit(1);
  });

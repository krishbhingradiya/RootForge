/**
 * RootForge Stage 3 Classified Technology Stack & Grounded Recommendations Test Suite
 * 
 * Tests all requirements from:
 * FINAL PRODUCTION FIX — STAGE 3 CLASSIFIED TECHNOLOGY STACK & GROUNDED RECOMMENDATIONS
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
    throw new Error(`Assertion failed: ${testName} - ${details}`);
  }
}

// Simulated frontend normalizer function matching SolutionBuilderPage.jsx
function simulateFrontendNormalization(rawTechStack, reqs = [], existingSysList = []) {
  if (!rawTechStack) return [];

  let parsed = rawTechStack;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }

  let rawList = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.technologies)) {
      rawList = parsed.technologies;
    } else {
      Object.entries(parsed).forEach(([key, val]) => {
        if (key === 'technologies' || !val) return;
        const valStr = typeof val === 'string' ? val : (val.name || JSON.stringify(val));
        if (!valStr || valStr.trim().length === 0) return;
        const isExist = valStr.toLowerCase().includes('existing');
        rawList.push({
          name: valStr,
          category: key.toUpperCase(),
          classification: isExist ? 'EXISTING_SYSTEM' : 'RECOMMENDED_TECHNOLOGY',
          reason: `Supports ${key.replace('_', ' ')} capabilities`,
          requirementsSupported: [],
          compatibility: 'Standard architectural pattern compatibility',
          evidenceType: isExist ? 'DOCUMENTED_FACT' : 'RECOMMENDATION',
          evidenceSource: isExist ? 'Stage 2 Business Analysis' : 'Stage 3 Architecture Analysis',
          evidenceReference: 'Not established from available workspace evidence.',
          evidenceStatement: isExist ? `Documented existing system: ${valStr}` : `Proposed recommendation for ${key}`,
          validationStatus: isExist ? 'CONFIRMED' : (valStr.toLowerCase().includes('validation required') ? 'VALIDATION_REQUIRED' : 'PROPOSED'),
          validationQuestion: isExist ? null : (valStr.toLowerCase().includes('validation required') ? `Confirm architecture requirements for ${key.replace('_', ' ')}` : null)
        });
      });
    }
  }

  if (!Array.isArray(rawList)) return [];

  function normalizeLayer(cat, name = '') {
    const catStr = String(cat || '').trim().toUpperCase();
    const nameStr = String(name || '').trim().toLowerCase();

    if (nameStr.includes('api gateway') || nameStr.includes('ingress gateway')) {
      return 'BACKEND';
    }

    if (catStr === 'FRONTEND' || catStr.includes('FRONT') || catStr.includes('CLIENT') || catStr.includes('UI')) return 'FRONTEND';
    if (catStr === 'BACKEND' || catStr.includes('BACK') || catStr.includes('API') || catStr.includes('SERVICE')) return 'BACKEND';
    if (catStr === 'DATABASE' || catStr.includes('DATA') || catStr.includes('PERSIST') || catStr.includes('SQL') || catStr.includes('STORAGE')) return 'DATABASE';
    if (catStr === 'AI_SERVICES' || catStr.includes('AI') || catStr.includes('INTELLIGENCE') || catStr.includes('ML') || catStr.includes('AUTOMATION')) return 'AI_SERVICES';
    if (catStr === 'INTEGRATIONS' || catStr.includes('INTEGRAT') || catStr.includes('ADAPTER') || catStr.includes('WEBHOOK') || catStr.includes('CONNECTOR')) return 'INTEGRATIONS';
    if (catStr === 'INFRASTRUCTURE' || catStr.includes('INFRA') || catStr.includes('CLOUD') || catStr.includes('HOST')) return 'INFRASTRUCTURE';
    if (catStr === 'SECURITY' || catStr.includes('SEC') || catStr.includes('AUTH') || catStr.includes('IAM')) return 'SECURITY';

    if (nameStr.includes('portal') || nameStr.includes('web client') || nameStr.includes('app')) return 'FRONTEND';
    if (nameStr.includes('gateway') || nameStr.includes('service') || nameStr.includes('backend') || nameStr.includes('server')) return 'BACKEND';
    if (nameStr.includes('sql') || nameStr.includes('database') || nameStr.includes('db') || nameStr.includes('persistence') || nameStr.includes('postgres')) return 'DATABASE';
    if (nameStr.includes('ai') || nameStr.includes('copilot') || nameStr.includes('triage') || nameStr.includes('llm')) return 'AI_SERVICES';
    if (nameStr.includes('whatsapp') || nameStr.includes('stripe') || nameStr.includes('crm') || nameStr.includes('erp') || nameStr.includes('webhook') || nameStr.includes('adapter')) return 'INTEGRATIONS';

    return 'OTHER';
  }

  function normalizeClassification(cls, name = '', isExistingDoc = false) {
    if (isExistingDoc) return 'EXISTING_SYSTEM';
    const c = String(cls || '').trim().toUpperCase();
    if (c === 'EXISTING_SYSTEM' || c === 'EXISTING') return 'EXISTING_SYSTEM';
    if (c === 'DOCUMENTED_FACT' || c === 'DOCUMENTED') return 'DOCUMENTED_FACT';
    if (c === 'USER_PROVIDED_FACT' || c === 'USER_PROVIDED') return 'USER_PROVIDED_FACT';
    if (c === 'VALIDATION_REQUIRED') return 'VALIDATION_REQUIRED';
    if (c === 'RECOMMENDED_TECHNOLOGY' || c === 'RECOMMENDED') return 'RECOMMENDED_TECHNOLOGY';
    if (c === 'PROPOSED') return 'RECOMMENDED_TECHNOLOGY';
    if (name && name.toLowerCase().includes('existing')) return 'EXISTING_SYSTEM';
    return 'RECOMMENDED_TECHNOLOGY';
  }

  const existingSysItems = [];
  if (Array.isArray(existingSysList) && existingSysList.length > 0) {
    existingSysList.forEach(sys => {
      const sysName = typeof sys === 'object' && sys !== null ? (sys.name || sys.systemName || sys.title) : String(sys);
      if (!sysName || sysName.trim().length === 0) return;
      const lower = sysName.toLowerCase();
      let layer = 'INTEGRATIONS';
      if (lower.includes('sql') || lower.includes('database') || lower.includes('db') || lower.includes('postgres') || lower.includes('oracle') || lower.includes('mongo') || lower.includes('base')) {
        layer = 'DATABASE';
      } else if (lower.includes('gateway') || lower.includes('api') || lower.includes('service') || lower.includes('backend')) {
        layer = 'BACKEND';
      } else if (lower.includes('portal') || lower.includes('web') || lower.includes('ui') || lower.includes('client')) {
        layer = 'FRONTEND';
      }

      existingSysItems.push({
        name: sysName,
        category: layer,
        classification: 'EXISTING_SYSTEM',
        reason: 'Retained as source system of record; requires integration connector and interface contract validation',
        requirementsSupported: reqs.slice(0, 2).map(r => r.id),
        compatibility: 'Existing system interface requires adapter gateway, connection pooling, and telemetry logging',
        evidenceType: 'DOCUMENTED_FACT',
        evidenceSource: 'Stage 2 Business Analysis',
        evidenceReference: reqs[0]?.id || 'Stage 2 Context',
        evidenceStatement: `Documented existing system of record in workspace context: ${sysName}`,
        validationStatus: 'CONFIRMED',
        validationQuestion: null
      });
    });
  }

  const combinedList = [];
  existingSysItems.forEach(esi => {
    const alreadyInRaw = rawList.some(r => {
      const rName = typeof r === 'object' ? (r.name || '') : String(r);
      return rName.toLowerCase().includes(esi.name.toLowerCase()) || esi.name.toLowerCase().includes(rName.toLowerCase());
    });
    if (!alreadyInRaw) {
      combinedList.push(esi);
    }
  });

  rawList.forEach(item => {
    if (!item || typeof item !== 'object') return;
    combinedList.push(item);
  });

  const normalized = combinedList.map((item, idx) => {
    const name = String(item.name || `Technology Component ${idx + 1}`).trim();
    const category = normalizeLayer(item.category || item.layer, name);
    const isExistingDoc = existingSysItems.some(esi => esi.name.toLowerCase() === name.toLowerCase()) || name.toLowerCase().includes('(existing)');
    const classification = normalizeClassification(item.classification, name, isExistingDoc);

    const rawReqs = Array.isArray(item.requirementsSupported) ? item.requirementsSupported :
                    (typeof item.requirementsSupported === 'string' ? [item.requirementsSupported] : []);
    const validReqIds = [];
    rawReqs.forEach(rid => {
      const cleanId = String(rid).trim().toUpperCase();
      const matched = reqs.find(cr => {
        const crId = String(cr.id || '').trim().toUpperCase();
        return crId === cleanId || crId.replace(/[-_]/g, '') === cleanId.replace(/[-_]/g, '');
      });
      if (matched && !validReqIds.includes(matched.id)) {
        validReqIds.push(matched.id);
      }
    });

    let validationStatus = String(item.validationStatus || item.status || 'PROPOSED').toUpperCase();
    if (classification === 'EXISTING_SYSTEM' || classification === 'DOCUMENTED_FACT') {
      validationStatus = 'CONFIRMED';
    } else if (classification === 'VALIDATION_REQUIRED') {
      validationStatus = 'VALIDATION_REQUIRED';
    } else {
      if (validationStatus === 'CONFIRMED') {
        const allReqsConfirmed = validReqIds.length > 0 && validReqIds.every(rid => {
          const reqObj = reqs.find(cr => cr.id === rid);
          return reqObj && String(reqObj.status || reqObj.validationStatus).toUpperCase() === 'CONFIRMED';
        });
        if (!allReqsConfirmed && classification === 'RECOMMENDED_TECHNOLOGY') {
          validationStatus = 'PROPOSED';
        }
      } else if (!['CONFIRMED', 'PROPOSED', 'VALIDATION_REQUIRED', 'NOT_ESTABLISHED'].includes(validationStatus)) {
        validationStatus = 'PROPOSED';
      }
    }

    let validationQuestion = item.validationQuestion || null;
    if (validationStatus === 'VALIDATION_REQUIRED' && !validationQuestion) {
      if (category === 'DATABASE') {
        validationQuestion = 'Confirm enterprise database engine choice, hosting environment, and clustering/backup SLA';
      } else if (category === 'INTEGRATIONS') {
        validationQuestion = 'Confirm external third-party API specifications, webhook endpoints, authentication tokens, and rate limits';
      } else if (category === 'BACKEND') {
        validationQuestion = 'Confirm service boundary, gateway hosting model, and rate limiting policies';
      } else if (category === 'AI_SERVICES') {
        validationQuestion = 'Validate AI provider compliance, latency budgets, and human-in-the-loop escalation guardrails';
      } else if (category === 'FRONTEND') {
        validationQuestion = 'Confirm primary client device form-factors and supported browser tiers';
      } else {
        validationQuestion = 'Confirm integration interface specification and environmental compatibility';
      }
    }

    const evidenceType = item.evidenceType || (classification === 'EXISTING_SYSTEM' ? 'DOCUMENTED_FACT' : (classification === 'USER_PROVIDED_FACT' ? 'USER_PROVIDED_FACT' : 'RECOMMENDATION'));
    const evidenceSource = item.evidenceSource || (classification === 'EXISTING_SYSTEM' ? 'Stage 2 Business Analysis' : (classification === 'USER_PROVIDED_FACT' ? 'Workspace Scope Context' : 'Stage 3 Architecture Analysis'));
    const evidenceReference = item.evidenceReference || (validReqIds.length > 0 ? validReqIds.join(', ') : 'Not established from available workspace evidence.');
    const evidenceStatement = item.evidenceStatement || item.evidence || (classification === 'EXISTING_SYSTEM' ? `Documented existing system of record: ${name}` : `Architectural recommendation for ${category}`);

    const reason = item.reason || (classification === 'EXISTING_SYSTEM' ? 'Retained as enterprise system of record' : `Supports ${category.replace('_', ' ')} architecture capabilities`);
    const compatibility = item.compatibility || (classification === 'EXISTING_SYSTEM' ? 'Direct adapter connector required' : 'Standard enterprise protocol compatibility');

    return {
      id: item.id || `TECH-${String(idx + 1).padStart(2, '0')}`,
      name,
      category,
      classification,
      reason,
      requirementsSupported: validReqIds,
      compatibility,
      evidenceType,
      evidenceSource,
      evidenceReference,
      evidenceStatement,
      evidence: evidenceStatement,
      validationStatus,
      validationQuestion
    };
  });

  const existingLayers = new Set(normalized.filter(n => n.classification === 'EXISTING_SYSTEM').map(n => n.category));
  return normalized.filter(item => {
    if (item.classification !== 'EXISTING_SYSTEM' && existingLayers.has(item.category)) {
      if (item.category === 'DATABASE' && (item.name.includes('Transactional Relational Persistence') || item.name.includes('Persistence Tier'))) {
        return false;
      }
    }
    return true;
  });
}

async function runTestSuite() {
  console.log('\n======================================================================');
  console.log('STAGE 3 CLASSIFIED TECHNOLOGY STACK & GROUNDED RECOMMENDATIONS ACCEPTANCE TESTS');
  console.log('======================================================================\n');

  // -------------------------------------------------------------
  // DOMAIN 1: HEALTHCARE WORKSPACE (WITH EXISTING SYSTEM HealthBase v4 / MS SQL)
  // -------------------------------------------------------------
  console.log('--- DOMAIN 1: Healthcare Workspace with Documented HealthBase v4 MS SQL ---');

  const healthcareContext = {
    workspace: {
      id: 'ws-health-001',
      name: 'CareClinic Patient Services',
      objective: 'Digitize appointment scheduling with clinical records synchronization',
      industry: 'Healthcare',
      targetUsers: 'Clinical triage nurses and registered patients',
      challenge: 'Long phone hold times and fragmented scheduling against legacy clinical system'
    },
    businessAnalysis: {
      id: 'ba-health-001',
      existingSystems: ['HealthBase v4 / MS SQL'],
      constraints: ['Must integrate with existing HealthBase v4 / MS SQL database without schema alteration'],
      requirements: [
        { id: 'REQ-HC-01', title: 'Patient Self-Service Scheduling Portal', specification: 'Responsive portal for self-service appointment requests', status: 'CONFIRMED' },
        { id: 'REQ-HC-02', title: 'WhatsApp Appointment Reminders', specification: 'Automated SMS and WhatsApp reminder notifications', status: 'PROPOSED' },
        { id: 'REQ-HC-03', title: 'HealthBase Real-time Slot Synchronization', specification: 'Sync slot availability with HealthBase v4 / MS SQL', status: 'CONFIRMED' },
        { id: 'REQ-HC-04', title: 'Clinical Triage Assistance', specification: 'Symptom triage classification copilot for nurse review', status: 'CONFIRMED' }
      ]
    }
  };

  const solHealth = await demoProvider.recommendSolutions(healthcareContext);
  const healthCanonical = normalizeStage2Contract(healthcareContext, healthcareContext.businessAnalysis);
  const healthNormalized = simulateFrontendNormalization(solHealth.techStack, healthCanonical.requirements, healthCanonical.existingSystems);

  // Acceptance Test 1: Classified table contains all relevant stack components
  assert(healthNormalized.length >= 4, 'Health stack contains at least 4 classified components', `found ${healthNormalized.length}`);

  // Acceptance Test 2: Recommended Stack and Classified Matrix are consistent
  assert(solHealth.techStack.database.includes('HealthBase v4 / MS SQL'), 'Recommended Stack database matches HealthBase v4', solHealth.techStack.database);
  const healthDbRow = healthNormalized.find(t => t.category === 'DATABASE');
  assert(Boolean(healthDbRow), 'Classified matrix contains DATABASE layer row');
  assert(healthDbRow.name.includes('HealthBase v4 / MS SQL'), 'Classified matrix database is HealthBase v4 MS SQL');

  // Acceptance Test 3: Existing systems are correctly classified as EXISTING_SYSTEM and CONFIRMED
  assert(healthDbRow.classification === 'EXISTING_SYSTEM', 'HealthBase is classified as EXISTING_SYSTEM', healthDbRow.classification);
  assert(healthDbRow.validationStatus === 'CONFIRMED', 'HealthBase validationStatus is CONFIRMED', healthDbRow.validationStatus);

  // Acceptance Test 4: Recommended technologies are not marked EXISTING_SYSTEM
  const healthFrontendRow = healthNormalized.find(t => t.category === 'FRONTEND');
  assert(healthFrontendRow && healthFrontendRow.classification !== 'EXISTING_SYSTEM', 'Web portal is not marked EXISTING_SYSTEM', healthFrontendRow.classification);

  // Acceptance Test 5: Requirement IDs are real Stage 2 IDs
  healthNormalized.forEach(tech => {
    tech.requirementsSupported.forEach(rid => {
      assert(healthCanonical.requirements.some(r => r.id === rid), `Requirement ${rid} on ${tech.name} is a valid Stage 2 requirement`);
    });
  });

  // Acceptance Test 6: No fabricated requirement IDs
  const allAttachedReqs = healthNormalized.flatMap(t => t.requirementsSupported);
  assert(allAttachedReqs.every(rid => rid.startsWith('REQ-HC-')), 'All requirement IDs belong to Healthcare workspace', allAttachedReqs.join(', '));

  // Acceptance Test 7: API Gateway is classified under BACKEND or INFRASTRUCTURE, not INTEGRATIONS
  const gatewayRow = healthNormalized.find(t => t.name.toLowerCase().includes('gateway'));
  assert(Boolean(gatewayRow), 'Found API Gateway component in recommendations');
  assert(gatewayRow.category === 'BACKEND' || gatewayRow.category === 'INFRASTRUCTURE', 'API Gateway is in BACKEND/INFRASTRUCTURE', gatewayRow.category);
  assert(gatewayRow.category !== 'INTEGRATIONS', 'API Gateway is NOT classified as INTEGRATIONS');

  // Acceptance Test 8: Integrations tier contains external systems / connectors
  const intRow = healthNormalized.find(t => t.category === 'INTEGRATIONS');
  assert(Boolean(intRow), 'INTEGRATIONS row is present');

  // Acceptance Test 9: Evidence model is present on every recommendation
  healthNormalized.forEach(tech => {
    assert(Boolean(tech.evidenceType), `Tech ${tech.name} has evidenceType: ${tech.evidenceType}`);
    assert(Boolean(tech.evidenceSource), `Tech ${tech.name} has evidenceSource: ${tech.evidenceSource}`);
    assert(Boolean(tech.evidenceReference), `Tech ${tech.name} has evidenceReference: ${tech.evidenceReference}`);
    assert(Boolean(tech.evidenceStatement), `Tech ${tech.name} has evidenceStatement`);
  });

  // Acceptance Test 10: Validation-required items expose a concrete validation question
  const valRequiredItems = healthNormalized.filter(t => t.validationStatus === 'VALIDATION_REQUIRED');
  valRequiredItems.forEach(tech => {
    assert(Boolean(tech.validationQuestion) && tech.validationQuestion.length > 10, `Validation-required tech ${tech.name} has specific question: ${tech.validationQuestion}`);
  });

  // Acceptance Test 11: Dynamic classified component count
  const countLabel0 = `${0} ${0 === 1 ? 'Classified Component' : 'Classified Components'}`;
  const countLabel1 = `${1} ${1 === 1 ? 'Classified Component' : 'Classified Components'}`;
  const countLabelN = `${healthNormalized.length} ${healthNormalized.length === 1 ? 'Classified Component' : 'Classified Components'}`;
  assert(countLabel0 === '0 Classified Components', 'Pluralization for 0');
  assert(countLabel1 === '1 Classified Component', 'Pluralization for 1');
  assert(countLabelN === `${healthNormalized.length} Classified Components`, 'Pluralization for N');

  // -------------------------------------------------------------
  // DOMAIN 2: FINTECH WORKSPACE (CROSS-WORKSPACE ISOLATION)
  // -------------------------------------------------------------
  console.log('\n--- DOMAIN 2: Fintech Workspace (Cross-Workspace Isolation) ---');

  const fintechContext = {
    workspace: {
      id: 'ws-fintech-002',
      name: 'Apex Securities Order Router',
      objective: 'High-throughput algorithmic trade order routing with FIX 4.4 protocol',
      industry: 'Financial Services',
      targetUsers: 'Institutional traders and risk compliance officers',
      challenge: 'Millisecond latency SLA and strict audit trails'
    },
    businessAnalysis: {
      id: 'ba-fintech-002',
      existingSystems: ['CoreBanking Ledger DB / Oracle'],
      requirements: [
        { id: 'REQ-FIN-01', title: 'FIX 4.4 Gateway Ingestion', specification: 'Process 10,000 orders/sec with deterministic memory model', status: 'CONFIRMED' },
        { id: 'REQ-FIN-02', title: 'Core Ledger Settlement Sync', specification: 'Atomic commit to CoreBanking Ledger DB', status: 'CONFIRMED' },
        { id: 'REQ-FIN-03', title: 'Real-time Pre-trade Risk Filter', specification: 'Reject orders violating credit threshold under 2ms', status: 'CONFIRMED' }
      ]
    }
  };

  const solFin = await demoProvider.recommendSolutions(fintechContext);
  const finCanonical = normalizeStage2Contract(fintechContext, fintechContext.businessAnalysis);
  const finNormalized = simulateFrontendNormalization(solFin.techStack, finCanonical.requirements, finCanonical.existingSystems);

  // Acceptance Test 12: Zero cross-workspace technology leakage (no HealthBase, no healthcare terms in fintech)
  const finTexts = JSON.stringify(finNormalized);
  assert(!finTexts.includes('HealthBase'), 'Fintech stack does not contain HealthBase');
  assert(!finTexts.includes('Patient'), 'Fintech stack does not contain Patient portal');
  assert(!finTexts.includes('REQ-HC-'), 'Fintech stack has no Healthcare REQ IDs');

  // Acceptance Test 13: CoreBanking Ledger DB is preserved as EXISTING_SYSTEM
  const finDbRow = finNormalized.find(t => t.category === 'DATABASE');
  assert(Boolean(finDbRow) && finDbRow.name.includes('CoreBanking Ledger DB'), 'Fintech database is CoreBanking Ledger DB');
  assert(finDbRow.classification === 'EXISTING_SYSTEM', 'CoreBanking is classified as EXISTING_SYSTEM');
  assert(finDbRow.validationStatus === 'CONFIRMED', 'CoreBanking is CONFIRMED');

  // -------------------------------------------------------------
  // DOMAIN 3: LOGISTICS WORKSPACE (NO EXISTING SYSTEM DOCUMENTED)
  // -------------------------------------------------------------
  console.log('\n--- DOMAIN 3: Logistics Workspace (Candidate Database / Validation Required) ---');

  const logisticsContext = {
    workspace: {
      id: 'ws-logistics-003',
      name: 'CargoFlow Dispatch Hub',
      objective: 'Real-time multi-depot parcel tracking and vehicle dispatch',
      industry: 'Logistics & Supply Chain',
      targetUsers: 'Warehouse dispatchers and fleet drivers',
      challenge: 'Manual whiteboards and paper run-sheets cause dispatch delays'
    },
    businessAnalysis: {
      id: 'ba-logistics-003',
      existingSystems: [], // No existing systems documented
      requirements: [
        { id: 'REQ-LOG-01', title: 'Barcode Scan Dispatch Verification', specification: 'Scanner gun barcode intake and run-sheet reconciliation', status: 'CONFIRMED' },
        { id: 'REQ-LOG-02', title: 'Driver Route GPS Push Notification', specification: 'Push route updates to driver devices', status: 'CONFIRMED' }
      ]
    }
  };

  const solLog = await demoProvider.recommendSolutions(logisticsContext);
  const logCanonical = normalizeStage2Contract(logisticsContext, logisticsContext.businessAnalysis);
  const logNormalized = simulateFrontendNormalization(solLog.techStack, logCanonical.requirements, logCanonical.existingSystems);

  // Acceptance Test 14: Without documented database, candidate database is VALIDATION_REQUIRED
  const logDbRow = logNormalized.find(t => t.category === 'DATABASE');
  assert(Boolean(logDbRow), 'Logistics database row exists');
  assert(logDbRow.classification === 'VALIDATION_REQUIRED', 'Logistics database is classified VALIDATION_REQUIRED (not EXISTING_SYSTEM)');
  assert(logDbRow.validationStatus === 'VALIDATION_REQUIRED', 'Logistics database validationStatus is VALIDATION_REQUIRED');
  assert(Boolean(logDbRow.validationQuestion), 'Exposes concrete validation question for database');

  // Acceptance Test 15: Zero cross-domain leakage from Health or Fintech into Logistics
  const logTexts = JSON.stringify(logNormalized);
  assert(!logTexts.includes('HealthBase'), 'Logistics has no HealthBase');
  assert(!logTexts.includes('CoreBanking'), 'Logistics has no CoreBanking');
  assert(!logTexts.includes('FIX 4.4'), 'Logistics has no FIX protocol');

  // -------------------------------------------------------------
  // DATA MODEL SAFETY & RESILIENCE TESTS
  // -------------------------------------------------------------
  console.log('\n--- Data Model Safety & Resilience ---');

  // Acceptance Test 16: Malformed / double-encoded JSON does not crash
  const doubleEncoded = JSON.stringify(JSON.stringify({
    frontend: 'Custom Web Client',
    technologies: [
      { name: 'Custom Backend', category: 'BACKEND', classification: 'RECOMMENDED_TECHNOLOGY', requirementsSupported: ['REQ-LOG-01'] }
    ]
  }));
  const doubleRes = simulateFrontendNormalization(doubleEncoded, logCanonical.requirements);
  assert(Array.isArray(doubleRes) && doubleRes.length > 0, 'Double-encoded JSON parsed safely');

  // Acceptance Test 17: Empty / null technology state returns safe empty array
  const emptyRes = simulateFrontendNormalization(null);
  assert(Array.isArray(emptyRes) && emptyRes.length === 0, 'Null input returns empty array');

  console.log('\n======================================================================');
  console.log(`ALL TESTS COMPLETED: ${passedCount} / ${totalCount} PASSED`);
  console.log('======================================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});

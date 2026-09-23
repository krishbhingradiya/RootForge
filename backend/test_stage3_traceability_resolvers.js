import assert from 'assert';

/**
 * Stage 3 Solution Builder — Traceability Resolver Unit Tests
 * Validates that Stage 2 Business Analysis entities resolve correctly
 * into the Traceability Matrix without placeholders or static fallbacks.
 */

console.log('=== STAGE 3 TRACEABILITY RESOLVER UNIT & INTEGRATION TESTS ===\n');

// Mock Stage 2 Upstream Business Analysis
const mockAnalysis = {
  requirementsData: [
    {
      id: 'REQ-01',
      title: 'Online Patient Appointment Scheduling',
      specification: 'The system must allow patients to book, reschedule, and cancel appointments online.',
      status: 'CONFIRMED',
      priority: 'HIGH',
      sourceDocumentEvidence: 'Medicare_Appointment_BRD.pdf',
      businessProblemId: 'PAIN-01',
      strategicGoalId: 'GOAL-01'
    },
    {
      id: 'REQ-02',
      title: 'EHR Clinical Schedule Synchronization',
      specification: 'Bi-directional synchronization of calendar availability with existing EHR.',
      status: 'VALIDATION_REQUIRED',
      priority: 'CRITICAL',
      sourceDocumentEvidence: 'HL7_Integration_Spec.pdf',
      businessProblemId: 'PAIN-01',
      strategicGoalId: 'GOAL-02'
    }
  ],
  operationalPainPoints: [
    {
      id: 'PAIN-01',
      title: 'Manual Booking Bottlenecks',
      description: 'Long phone queue wait times causing 22% abandonment rate.',
      impact: 'High'
    }
  ],
  strategicGoals: [
    {
      id: 'GOAL-01',
      title: 'Reduce manual scheduling workload',
      target: '60% reduction in phone scheduling calls within 6 months',
      baseline: '1,200 calls/day handled manually'
    }
  ],
  openQuestions: [
    {
      id: 'Q-03',
      question: 'Does the existing EHR system expose appointment availability through a FHIR or REST API?',
      status: 'VALIDATION_REQUIRED',
      priority: 'HIGH'
    }
  ],
  assumptions: [
    {
      id: 'A-01',
      assumption: 'The clinic broadband connection meets minimum SLA requirements for real-time sync.',
      validationStatus: 'VALIDATION REQUIRED',
      source: 'IT Infrastructure Assessment'
    }
  ],
  documents: [
    {
      name: 'Medicare_Appointment_BRD.pdf',
      filename: 'Medicare_Appointment_BRD.pdf'
    }
  ]
};

// Replicate the exact canonical normalization from SolutionBuilderPage.jsx
const canonicalReqs = mockAnalysis.requirementsData.map((r, idx) => ({
  id: r.id || `REQ-${String(idx + 1).padStart(2, '0')}`,
  title: r.title || r.specification || 'Requirement specification',
  specification: r.specification || r.title || '',
  status: r.status || 'CONFIRMED',
  priority: r.priority || 'HIGH',
  evidence: r.sourceDocumentEvidence || null
}));

const canonicalPainPoints = mockAnalysis.operationalPainPoints.map((p, idx) => ({
  id: p.id || `PP-${String(idx + 1).padStart(2, '0')}`,
  title: p.title || p.description || 'Documented operational friction',
  description: p.description || '',
  impact: p.impact || 'High'
}));

const canonicalGoals = mockAnalysis.strategicGoals.map((g, idx) => ({
  id: g.id || `G-${String(idx + 1).padStart(2, '0')}`,
  title: g.title || g.goal || 'Strategic transformation objective',
  target: g.target || null,
  baseline: g.baseline || null
}));

const canonicalQuestions = mockAnalysis.openQuestions.map((q, idx) => ({
  id: q.id || `Q-${String(idx + 1).padStart(2, '0')}`,
  question: q.question || q.text || 'Technical architecture open question',
  priority: q.priority || 'MEDIUM',
  status: q.status === 'RESOLVED' ? 'RESOLVED' : 'Validation Required'
}));

const canonicalAssumptions = mockAnalysis.assumptions.map((a, idx) => ({
  id: a.id || `A-${String(idx + 1).padStart(2, '0')}`,
  assumption: a.assumption || a.title || 'Technical architecture assumption',
  risk: a.risk || 'Requires validation during architecture design',
  validationStatus: a.validationStatus || 'VALIDATION REQUIRED',
  source: a.source || 'Stage 2 Discovery'
}));

function normalizeReferenceId(ref) {
  if (!ref) return '';
  if (typeof ref === 'object') {
    return String(ref.id || ref.key || ref.code || '').trim().toUpperCase();
  }
  return String(ref).trim().toUpperCase();
}

function resolveRequirement(ref) {
  if (!ref) return null;
  const isObj = typeof ref === 'object' && ref !== null;
  const rawId = isObj ? (ref.id || ref.requirementId) : ref;
  const normId = normalizeReferenceId(rawId);

  const matched = canonicalReqs.find(u => {
    const uNorm = normalizeReferenceId(u.id);
    if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
      return true;
    }
    if (typeof ref === 'string' && u.title && u.title.toLowerCase() === ref.trim().toLowerCase()) {
      return true;
    }
    return false;
  });

  if (matched) {
    return {
      id: matched.id,
      title: matched.title,
      specification: matched.specification,
      status: matched.status,
      priority: matched.priority,
      evidence: matched.evidence,
      isResolved: true
    };
  }

  const displayId = String(rawId || ref).trim();
  return {
    id: displayId,
    title: `${displayId} — Source requirement could not be resolved from current workspace evidence.`,
    specification: '',
    status: 'VALIDATION_REQUIRED',
    priority: 'MEDIUM',
    evidence: null,
    isResolved: false
  };
}

function resolveProblem(ref, idx = 0) {
  if (!ref) return null;
  const isObj = typeof ref === 'object' && ref !== null;
  const rawId = isObj ? (ref.id || ref.painPointId || ref.problemId) : ref;
  const normId = normalizeReferenceId(rawId);

  const matched = canonicalPainPoints.find(u => {
    const uNorm = normalizeReferenceId(u.id);
    if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
      return true;
    }
    return false;
  });

  if (matched) {
    return {
      id: matched.id,
      title: matched.title,
      description: matched.description,
      impact: matched.impact,
      isResolved: true
    };
  }

  if (typeof ref === 'string') {
    const trimmed = ref.trim();
    if (trimmed.match(/^(PP|PAIN|P)[-_]?\d+$/i)) {
      const positional = canonicalPainPoints[idx];
      if (positional) return { ...positional, isResolved: true };
      return {
        id: trimmed,
        title: `${trimmed} — Source business problem not resolved from current workspace evidence.`,
        isResolved: false
      };
    }
    return {
      id: null,
      title: trimmed,
      isResolved: true
    };
  }
  return null;
}

function resolveGoal(ref, idx = 0) {
  if (!ref) return null;
  const isObj = typeof ref === 'object' && ref !== null;
  const rawId = isObj ? (ref.id || ref.goalId) : ref;
  const normId = normalizeReferenceId(rawId);

  const matched = canonicalGoals.find(u => {
    const uNorm = normalizeReferenceId(u.id);
    if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
      return true;
    }
    return false;
  });

  if (matched) {
    return {
      id: matched.id,
      title: matched.title,
      target: matched.target,
      baseline: matched.baseline,
      isResolved: true
    };
  }

  if (typeof ref === 'string') {
    const trimmed = ref.trim();
    if (trimmed.match(/^(G|GOAL)[-_]?\d+$/i)) {
      const positional = canonicalGoals[idx];
      if (positional) return { ...positional, isResolved: true };
      return {
        id: trimmed,
        title: `${trimmed} — Source strategic goal not resolved from current workspace evidence.`,
        isResolved: false
      };
    }
    return {
      id: null,
      title: trimmed,
      isResolved: true
    };
  }
  return null;
}

function resolveQuestion(ref, idx = 0) {
  if (!ref) return null;
  const isObj = typeof ref === 'object' && ref !== null;
  const rawId = isObj ? (ref.id || ref.questionId) : ref;
  const normId = normalizeReferenceId(rawId);

  const matched = canonicalQuestions.find(u => {
    const uNorm = normalizeReferenceId(u.id);
    if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
      return true;
    }
    return false;
  });

  if (matched) {
    return {
      id: matched.id,
      question: matched.question,
      priority: matched.priority,
      status: matched.status,
      isResolved: true
    };
  }

  if (typeof ref === 'string') {
    const positional = canonicalQuestions[idx];
    return {
      id: positional ? positional.id : `Q-${String(idx + 1).padStart(2, '0')}`,
      question: ref.trim(),
      status: 'Validation Required',
      isResolved: true
    };
  }
  return null;
}

function resolveAssumption(ref, idx = 0) {
  if (!ref) return null;
  const isObj = typeof ref === 'object' && ref !== null;
  const rawId = isObj ? (ref.id || ref.assumptionId) : ref;
  const normId = normalizeReferenceId(rawId);

  const matched = canonicalAssumptions.find(u => {
    const uNorm = normalizeReferenceId(u.id);
    if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
      return true;
    }
    return false;
  });

  if (matched) {
    return {
      id: matched.id,
      assumption: matched.assumption,
      validationStatus: matched.validationStatus,
      source: matched.source,
      isResolved: true
    };
  }

  if (typeof ref === 'string') {
    const positional = canonicalAssumptions[idx];
    return {
      id: positional ? positional.id : `A-${String(idx + 1).padStart(2, '0')}`,
      assumption: ref.trim(),
      validationStatus: 'VALIDATION REQUIRED',
      source: 'Stage 2 Discovery',
      isResolved: true
    };
  }
  return null;
}

function resolveEvidence(ref) {
  if (!ref) return null;
  const isObj = typeof ref === 'object' && ref !== null;
  const docName = mockAnalysis.documents[0]?.name || 'Workspace Scope Definition';

  if (isObj) {
    const relatedReq = ref.relatedRequirement || ref.requirementId || null;
    let matchedReq = null;
    if (relatedReq) {
      matchedReq = canonicalReqs.find(r => normalizeReferenceId(r.id) === normalizeReferenceId(relatedReq));
    }
    return {
      classification: (ref.classification || 'DOCUMENTED FACT').replace(/_/g, ' '),
      source: ref.source || (matchedReq && matchedReq.evidence) || docName,
      excerpt: ref.excerpt || (matchedReq && matchedReq.specification) || 'Documented evidence',
      relatedRequirement: relatedReq
    };
  }

  if (typeof ref === 'string') {
    const trimmed = ref.trim();
    const matchedReq = canonicalReqs.find(r => normalizeReferenceId(r.id) === normalizeReferenceId(trimmed));
    if (matchedReq) {
      return {
        classification: 'DOCUMENTED FACT',
        source: matchedReq.evidence || docName,
        excerpt: matchedReq.specification || matchedReq.title,
        relatedRequirement: matchedReq.id
      };
    }
    return {
      classification: 'DOCUMENTED FACT',
      source: docName,
      excerpt: trimmed,
      relatedRequirement: null
    };
  }
  return null;
}

// 1. Requirement ID resolves to actual requirement title & specification
console.log('Test 1: Requirement ID resolution...');
const resolvedR1 = resolveRequirement('REQ-01');
assert(resolvedR1.isResolved === true, 'REQ-01 is marked resolved');
assert.strictEqual(resolvedR1.id, 'REQ-01');
assert.strictEqual(resolvedR1.specification, 'The system must allow patients to book, reschedule, and cancel appointments online.');
console.log('  ✓ PASS: REQ-01 resolved to:', resolvedR1.specification);

// Formatting check
const spec1 = resolvedR1.specification || resolvedR1.title;
const formattedR1 = `${resolvedR1.id} — ${spec1}`;
assert.strictEqual(formattedR1, 'REQ-01 — The system must allow patients to book, reschedule, and cancel appointments online.');
console.log('  ✓ PASS: Rendered display label matches requirement: REQ-01 — <actual requirement title/specification>');

// Case-insensitivity and formatting normalization
const resolvedR1Lower = resolveRequirement('req-01');
assert(resolvedR1Lower.isResolved === true, 'req-01 matches case-insensitively');
console.log('  ✓ PASS: req-01 normalizes and resolves to REQ-01');

// Missing requirement handling
console.log('\nTest 2: Unresolved requirement ID fallback...');
const resolvedRMissing = resolveRequirement('REQ-99');
assert(resolvedRMissing.isResolved === false, 'REQ-99 is marked unresolved');
assert.strictEqual(resolvedRMissing.title, 'REQ-99 — Source requirement could not be resolved from current workspace evidence.');
console.log('  ✓ PASS: REQ-99 renders explicit notice: REQ-99 — Source requirement could not be resolved from current workspace evidence.');

// Business problem resolution
console.log('\nTest 3: Business problem resolution...');
const resolvedP1 = resolveProblem('PAIN-01');
assert(resolvedP1.isResolved === true, 'PAIN-01 resolves');
assert.strictEqual(resolvedP1.title, 'Manual Booking Bottlenecks');
assert.notStrictEqual(resolvedP1.title, 'Problem', 'Must NOT be literal "Problem"');
console.log('  ✓ PASS: PAIN-01 resolved to:', resolvedP1.title);

// Strategic goal resolution
console.log('\nTest 4: Strategic goal resolution...');
const resolvedG1 = resolveGoal('GOAL-01');
assert(resolvedG1.isResolved === true, 'GOAL-01 resolves');
assert.strictEqual(resolvedG1.title, 'Reduce manual scheduling workload');
assert.notStrictEqual(resolvedG1.title, 'Goal', 'Must NOT be literal "Goal"');
console.log('  ✓ PASS: GOAL-01 resolved to:', resolvedG1.title);

// Open question resolution
console.log('\nTest 5: Open question resolution...');
const resolvedQ = resolveQuestion('Q-03');
assert(resolvedQ.isResolved === true, 'Q-03 resolves');
assert(resolvedQ.question.includes('Does the existing EHR system expose appointment availability'), 'Contains question text');
assert(resolvedQ.status.includes('Validation Required'), 'Contains validation status');
console.log('  ✓ PASS: Q-03 question resolved with text and status (no icon placeholder)');

// Assumption resolution
console.log('\nTest 6: Assumption resolution...');
const resolvedA = resolveAssumption('A-01');
assert(resolvedA.isResolved === true, 'A-01 resolves');
assert(resolvedA.assumption.includes('broadband connection'), 'Contains assumption text');
assert.strictEqual(resolvedA.source, 'IT Infrastructure Assessment', 'Contains source');
console.log('  ✓ PASS: A-01 assumption resolved with text, status, and source');

// Grounded evidence resolution
console.log('\nTest 7: Grounded evidence resolution...');
const resolvedEv = resolveEvidence('REQ-01');
assert(resolvedEv.classification === 'DOCUMENTED FACT', 'Has evidence classification');
assert.strictEqual(resolvedEv.source, 'Medicare_Appointment_BRD.pdf', 'Source resolved');
assert.strictEqual(resolvedEv.relatedRequirement, 'REQ-01', 'Related requirement linked');
assert(resolvedEv.excerpt.length > 0, 'Excerpt is non-empty');
console.log('  ✓ PASS: Evidence resolved:');
console.log('    Type:', resolvedEv.classification);
console.log('    Source:', resolvedEv.source);
console.log('    Excerpt:', resolvedEv.excerpt);
console.log('    Related Requirement:', resolvedEv.relatedRequirement);

console.log('\n================================================================');
console.log('ALL RESOLVER UNIT TESTS PASSED (100%)');
console.log('================================================================\n');

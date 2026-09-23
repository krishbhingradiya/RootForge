/**
 * Canonical Stage 2 -> Stage 3 Handoff Gate Engine (Frontend)
 * 
 * Defines the strict, singular source of truth for whether Business Analysis (Stage 2)
 * is eligible to hand off to Solution Architecture (Stage 3).
 * 
 * Gate Policy:
 * ONLY the following conditions may BLOCK Stage 2 -> Stage 3:
 * A. An explicit open question with priority === "BLOCKER"
 * B. An explicit requirement with handoffBlocking === true
 * C. A genuine system/data-integrity failure that makes Stage 2 output unusable
 * 
 * Specifically:
 * - VALIDATION_REQUIRED does NOT block handoff (informational warning carried into Stage 3)
 * - CRITICAL priority does NOT block handoff
 * - CRITICAL + VALIDATION_REQUIRED does NOT block handoff
 * - HIGH / MEDIUM / LOW open questions do NOT block handoff
 * - ASSUMPTIONS, INFERENCES, and PROPOSED_TARGETs do NOT block handoff
 */

function safeParse(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Calculates the canonical handoff gate state for Stage 2 Business Analysis data.
 * 
 * @param {object} stage2Data Stage 2 Business Analysis data (from form state or API)
 * @returns {{
 *   canProceed: boolean,
 *   blockers: Array<object>,
 *   blockerCount: number,
 *   openQuestions: Array<object>,
 *   openQuestionCount: number,
 *   validationRequired: Array<object>,
 *   validationRequiredCount: number,
 *   assumptions: Array<object>,
 *   assumptionCount: number,
 *   evidenceBackedCount: number,
 *   totalRequirements: number,
 *   reasonCodes: Array<string>
 * }}
 */
export function calculateStage2HandoffGate(stage2Data) {
  // 1. System/Data-Integrity Check
  if (!stage2Data || typeof stage2Data !== 'object') {
    return {
      canProceed: false,
      blockers: [{
        type: 'SYSTEM_ERROR',
        id: 'SYS-EMPTY',
        title: 'Stage 2 Analysis Data Missing',
        priority: 'BLOCKER',
        reason: 'Business Analysis payload is empty or invalid'
      }],
      blockerCount: 1,
      openQuestions: [],
      openQuestionCount: 0,
      validationRequired: [],
      validationRequiredCount: 0,
      assumptions: [],
      assumptionCount: 0,
      evidenceBackedCount: 0,
      totalRequirements: 0,
      reasonCodes: ['STAGE2_DATA_NOT_USABLE']
    };
  }

  // 2. Resolve requirements array
  const rawReqs = stage2Data.requirementsData || stage2Data.requirements || [];
  const parsedReqs = safeParse(rawReqs, []);
  const requirements = Array.isArray(parsedReqs) ? parsedReqs : [];

  const stage2DataIsUsable = requirements.length > 0;

  // 3. Resolve open questions array
  const rawQuestions = stage2Data.openQuestions || [];
  const parsedQuestions = safeParse(rawQuestions, []);
  const openQuestions = Array.isArray(parsedQuestions) ? parsedQuestions : [];

  // 4. Resolve assumptions array
  const rawAssumptions = stage2Data.assumptions || [];
  const parsedAssumptions = safeParse(rawAssumptions, []);
  const assumptions = Array.isArray(parsedAssumptions) ? parsedAssumptions : [];

  // 5. EXACT BLOCKER ALGORITHM:
  // ONLY openQuestions with priority === "BLOCKER"
  const blockingQuestions = openQuestions.filter(q => {
    if (!q || typeof q !== 'object') return false;
    const priority = String(q.priority || '').trim().toUpperCase();
    return priority === 'BLOCKER';
  });

  // ONLY requirements with explicit handoffBlocking === true
  const blockingRequirements = requirements.filter(r => {
    if (!r || typeof r !== 'object') return false;
    return r.handoffBlocking === true || String(r.handoffBlocking).toLowerCase() === 'true';
  });

  const blockers = [
    ...blockingQuestions.map(q => ({
      type: 'QUESTION',
      id: q.id || 'Q-BLOCKER',
      title: q.question || q.text || q.title || 'Unresolved Blocker Question',
      priority: 'BLOCKER',
      reason: q.reason || q.impact || 'Explicit blocker question requires stakeholder resolution prior to architecture finalization'
    })),
    ...blockingRequirements.map(r => ({
      type: 'REQUIREMENT',
      id: r.id || 'REQ-BLOCKER',
      title: r.title || r.specification || r.text || 'Blocking Architecture Requirement',
      priority: r.priority || 'CRITICAL',
      reason: r.rationale || 'Explicitly flagged with handoffBlocking=true'
    }))
  ];

  if (!stage2DataIsUsable) {
    blockers.unshift({
      type: 'DATA_INTEGRITY',
      id: 'DATA-NO-REQS',
      title: 'No Business Requirements Generated',
      priority: 'BLOCKER',
      reason: 'Stage 2 output contains zero requirements; analysis must be generated before architecture handoff'
    });
  }

  // 6. Validation Required Items:
  const validationRequired = requirements.filter(r => {
    if (!r || typeof r !== 'object') return false;
    const status = String(r.status || '').toUpperCase();
    const valStatus = String(r.validationStatus || '').toUpperCase();
    const classification = String(r.classification || '').toUpperCase();
    return status === 'VALIDATION_REQUIRED' ||
           valStatus === 'VALIDATION_REQUIRED' ||
           classification === 'VALIDATION_REQUIRED' ||
           classification === 'PROPOSED_TARGET' ||
           classification === 'ASSUMPTION';
  });

  // 7. Evidence-Backed Items:
  const evidenceBacked = requirements.filter(r => {
    if (!r || typeof r !== 'object') return false;
    const c = String(r.classification || r.type || '').toUpperCase();
    const hasEvidence = Boolean(
      r.evidence ||
      r.provenance ||
      (Array.isArray(r.evidenceCitations) && r.evidenceCitations.length > 0) ||
      (Array.isArray(r.sourceCitations) && r.sourceCitations.length > 0) ||
      r.sourceDocumentEvidence
    );
    return ['CONFIRMED_FACT', 'DOCUMENT_FACT', 'DOCUMENTED_FACT', 'USER_PROVIDED_FACT', 'WORKSPACE_OBJECTIVE'].includes(c) || hasEvidence;
  });

  // 8. Gate Determination
  const canProceed = blockers.length === 0 && stage2DataIsUsable === true;

  const reasonCodes = [];
  if (!stage2DataIsUsable) reasonCodes.push('STAGE2_DATA_NOT_USABLE');
  if (blockingQuestions.length > 0) reasonCodes.push('BLOCKING_OPEN_QUESTIONS');
  if (blockingRequirements.length > 0) reasonCodes.push('BLOCKING_REQUIREMENTS');
  if (canProceed && validationRequired.length > 0) reasonCodes.push('VALIDATION_REQUIRED_ITEMS_CARRIED_FORWARD');
  if (canProceed && validationRequired.length === 0) reasonCodes.push('GATE_CLEARED_ALL_CONFIRMED');

  return {
    canProceed,
    blockers,
    blockerCount: blockers.length,
    openQuestions,
    openQuestionCount: openQuestions.length,
    validationRequired,
    validationRequiredCount: validationRequired.length,
    assumptions,
    assumptionCount: assumptions.length,
    evidenceBackedCount: evidenceBacked.length,
    totalRequirements: requirements.length,
    reasonCodes
  };
}

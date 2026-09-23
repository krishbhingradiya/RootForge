import crypto from 'crypto';

/**
 * Stage 2 -> Stage 3 Canonical Data Contract Normalizer
 * 
 * Enforces one single, immutable data contract between Stage 2 (Business Analysis)
 * and Stage 3 (Solution Builder). Eliminates fragmentation between legacy flat fields
 * and rich structured fields, guarantees deterministic hashing, and enables reliable
 * stale analysis detection.
 */

function safeParseArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [val];
    } catch {
      return val.trim().length > 0 ? [val] : [];
    }
  }
  return [];
}

function resolveFirstNonEmptyArray(...arrays) {
  for (const arr of arrays) {
    const parsed = safeParseArray(arr);
    if (parsed.length > 0) return parsed;
  }
  return [];
}

/**
 * Normalizes all Stage 2 analysis fields into a single canonical contract object.
 * 
 * @param {object} context Unified workspace context
 * @param {object} businessAnalysis Upstream Stage 2 analysis record
 * @returns {object} Canonical Stage 2 data contract
 */
export function normalizeStage2Contract(context = {}, businessAnalysis = null) {
  const ws = context.workspace || {};
  const analysis = (businessAnalysis && typeof businessAnalysis === 'object' && Object.keys(businessAnalysis).length > 0)
    ? businessAnalysis
    : (context.businessAnalysis || {});
  const discovery = context.discovery || {};
  const docContext = context.documentContext || {};

  const workspaceId = ws.id || analysis.workspaceId || 'unknown';
  const workspaceName = ws.name || 'Enterprise Workspace';
  const workspaceObjective = ws.objective || analysis.workspaceObjective || '';
  const businessContext = ws.challenge || '';
  const industry = ws.industry || context.domain || 'GENERAL_ENTERPRISE';

  // 1. Requirements: normalize requirementsData vs requirements
  const rawReqs = resolveFirstNonEmptyArray(analysis.requirementsData, analysis.requirements);
  const requirements = rawReqs.map((r, idx) => {
    if (typeof r === 'object' && r !== null) {
      return {
        id: r.id || `REQ-0${idx + 1}`,
        title: r.title || r.specification || r.text || `Requirement ${idx + 1}`,
        specification: r.specification || r.text || r.title || `Specification ${idx + 1}`,
        priority: r.priority || 'HIGH',
        classification: r.classification || 'SPEC',
        validationStatus: r.status || r.validationStatus || 'CONFIRMED',
        sourceFinding: r.sourceFinding || r.evidenceFact || null,
        evidenceQuote: r.evidenceQuote || r.sourceDocumentEvidence || null,
        businessProblem: r.businessProblem || r.painPoint || null,
        strategicGoal: r.strategicGoal || r.targetOutcome || null,
        downstreamArchitectureImpact: r.downstreamArchitectureImpact || null,
        rationale: r.rationale || null
      };
    }
    return {
      id: `REQ-0${idx + 1}`,
      title: String(r),
      specification: String(r),
      priority: 'HIGH',
      classification: 'SPEC',
      validationStatus: 'CONFIRMED',
      sourceFinding: null,
      evidenceQuote: null,
      businessProblem: null,
      strategicGoal: null,
      downstreamArchitectureImpact: null,
      rationale: null
    };
  });

  // 2. Strategic Goals: normalize strategicGoals vs goals
  const rawGoals = resolveFirstNonEmptyArray(analysis.strategicGoals, analysis.goals);
  const strategicGoals = rawGoals.map((g, idx) => {
    if (typeof g === 'object' && g !== null) {
      return {
        id: g.id || `GOAL-0${idx + 1}`,
        goal: g.goal || g.title || g.text || `Goal ${idx + 1}`,
        title: g.title || g.goal || g.text || `Goal ${idx + 1}`,
        target: g.target || null,
        baseline: g.baseline || 'Baseline not established from available evidence',
        classification: g.classification || 'WORKSPACE_OBJECTIVE'
      };
    }
    return {
      id: `GOAL-0${idx + 1}`,
      goal: String(g),
      title: String(g),
      target: null,
      baseline: 'Baseline not established from available evidence',
      classification: 'WORKSPACE_OBJECTIVE'
    };
  });

  // 3. Operational Pain Points: normalize operationalPainPoints vs painPoints
  const rawPainPoints = resolveFirstNonEmptyArray(analysis.operationalPainPoints, analysis.painPoints);
  const businessProblems = rawPainPoints.map((p, idx) => {
    if (typeof p === 'object' && p !== null) {
      return {
        id: p.id || `PP-0${idx + 1}`,
        title: p.title || p.description || p.text || `Pain Point ${idx + 1}`,
        description: p.description || p.title || p.text || '',
        impact: p.impact || 'High'
      };
    }
    return {
      id: `PP-0${idx + 1}`,
      title: String(p),
      description: String(p),
      impact: 'High'
    };
  });

  // 4. Automation Opportunities
  const rawAuto = resolveFirstNonEmptyArray(analysis.automationOpportunities);
  const automationOpportunities = rawAuto.map((a, idx) => {
    if (typeof a === 'object' && a !== null) {
      return {
        id: a.id || `AUTO-0${idx + 1}`,
        title: a.title || a.opportunity || `Automation ${idx + 1}`,
        opportunity: a.opportunity || a.title || `Automation ${idx + 1}`,
        impact: a.impact || 'High',
        saving: a.saving || 'Proposed target — validation required'
      };
    }
    return {
      id: `AUTO-0${idx + 1}`,
      title: String(a),
      opportunity: String(a),
      impact: 'High',
      saving: 'Proposed target — validation required'
    };
  });

  // 5. Constraints
  const constraints = resolveFirstNonEmptyArray(discovery.discoveredConstraints, analysis.constraints);

  // 6. Stakeholders
  const stakeholders = resolveFirstNonEmptyArray(analysis.stakeholders);

  // 7. Open Questions
  const rawQuestions = resolveFirstNonEmptyArray(analysis.openQuestions, discovery.openQuestions);
  const openQuestions = rawQuestions.map((q, idx) => {
    if (typeof q === 'object' && q !== null) {
      return {
        id: q.id || `Q-0${idx + 1}`,
        question: q.question || q.text || `Question ${idx + 1}`,
        priority: q.priority || 'MEDIUM',
        status: q.status || 'UNRESOLVED'
      };
    }
    return {
      id: `Q-0${idx + 1}`,
      question: String(q),
      priority: 'MEDIUM',
      status: 'UNRESOLVED'
    };
  });

  // 8. Assumptions
  const rawAssumptions = resolveFirstNonEmptyArray(analysis.assumptions);
  const assumptions = rawAssumptions.map((a, idx) => {
    if (typeof a === 'object' && a !== null) {
      return {
        id: a.id || `ASM-0${idx + 1}`,
        assumption: a.assumption || a.title || a.text || `Assumption ${idx + 1}`,
        risk: a.risk || 'Requires validation during implementation'
      };
    }
    return {
      id: `ASM-0${idx + 1}`,
      assumption: String(a),
      risk: 'Requires validation during implementation'
    };
  });

  // 9. Evidence & Source Documents
  const evidence = resolveFirstNonEmptyArray(analysis.evidenceReferences, analysis.evidence);
  const rawDocs = resolveFirstNonEmptyArray(docContext.sourceReferences, context.documents, analysis.documents);
  const sourceDocuments = rawDocs.map(d => ({
    filename: typeof d === 'object' && d !== null ? (d.filename || d.name || d.title || 'Document') : String(d),
    analyzed: true
  }));

  // 10. Existing Systems (extracted from context if present)
  const existingSystems = resolveFirstNonEmptyArray(analysis.existingSystems, context.existingSystems);

  return {
    workspaceId,
    workspaceName,
    workspaceObjective,
    businessContext,
    industry,
    businessProblems,
    painPoints: businessProblems,
    strategicGoals,
    requirements,
    automationOpportunities,
    constraints,
    stakeholders,
    currentState: analysis.currentState || '',
    futureState: analysis.futureState || '',
    openQuestions,
    assumptions,
    evidence,
    sourceDocuments,
    existingSystems,
    analysisId: analysis.id || null,
    analysisVersion: analysis.version || 1,
    analysisUpdatedAt: analysis.updatedAt ? new Date(analysis.updatedAt).toISOString() : null
  };
}

/**
 * Computes a deterministic SHA-256 hash of the canonical Stage 2 context.
 * Used for precise, tamper-proof stale analysis detection.
 * 
 * @param {object} canonical Normalized Stage 2 contract object
 * @returns {string} SHA-256 hex string
 */
export function computeStage2ContextHash(contextOrCanonical) {
  if (!contextOrCanonical || typeof contextOrCanonical !== 'object') {
    return 'empty-context-hash';
  }

  // If raw context or missing canonical fields, normalize first
  const isAlreadyCanonical = Boolean(
    contextOrCanonical.workspaceObjective !== undefined &&
    Array.isArray(contextOrCanonical.requirements) &&
    Array.isArray(contextOrCanonical.businessProblems)
  );

  const canonical = isAlreadyCanonical
    ? contextOrCanonical
    : normalizeStage2Contract(contextOrCanonical);

  const parts = [
    canonical.workspaceObjective || '',
    (canonical.requirements || []).map(r => `${r.id || ''}:${r.title || ''}:${r.specification || ''}:${r.validationStatus || r.status || ''}`).sort().join('|'),
    (canonical.strategicGoals || []).map(g => `${g.id || ''}:${g.goal || g.title || ''}:${g.target || ''}:${g.baseline || ''}`).sort().join('|'),
    (canonical.businessProblems || []).map(p => `${p.id || ''}:${p.title || p.description || ''}`).sort().join('|'),
    (canonical.automationOpportunities || []).map(a => `${a.id || ''}:${a.title || a.opportunity || ''}`).sort().join('|'),
    (canonical.constraints || []).map(c => String(c)).sort().join('|'),
    (canonical.openQuestions || []).map(q => `${q.id || ''}:${q.question || q.text || ''}:${q.priority || ''}`).sort().join('|'),
    (canonical.assumptions || []).map(a => `${a.id || ''}:${a.assumption || a.title || ''}`).sort().join('|'),
    (canonical.sourceDocuments || []).map(d => (d.filename || d.name || '')).sort().join('|')
  ];

  return crypto.createHash('sha256').update(parts.join(':::')).digest('hex');
}

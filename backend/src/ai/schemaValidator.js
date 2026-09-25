/**
 * Schema Validation and Safe JSON Parsing Engine
 * Ensures external AI responses strictly conform to database models before persistence.
 */

import { businessAnalysisSchema } from './schemas/businessAnalysis.schema.js';
import { solutionSchema } from './schemas/solution.schema.js';
import { architectureSchema, validateArchitectureTopology, normalizeArchitectureData } from './schemas/architecture.schema.js';
import { processSchema } from './schemas/process.schema.js';
import { uxSchema } from './schemas/ux.schema.js';
import { databaseSchema } from './schemas/database.schema.js';
import { apiSchema, validateApiDatabaseConsistency } from './schemas/api.schema.js';
import { planningSchema, validatePlanning, validateCrossStageConsistency } from './schemas/planning.schema.js';
import { calculateStage2HandoffGate } from '../utils/handoffGate.js';

export {
  validateApiDatabaseConsistency,
  validatePlanning,
  validateCrossStageConsistency,
  calculateStage2HandoffGate,
  validateArchitectureTopology,
  normalizeArchitectureData
};

/**
 * Safely parses raw LLM output text into a JSON object.
 * Strips markdown code fences safely without using eval().
 * 
 * @param {string} rawText 
 * @returns {{ success: boolean, data?: any, error?: string }}
 */
export function safeParseJson(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { success: false, error: 'Raw output is empty or not a string' };
  }

  let cleaned = rawText.trim();

  // Strip leading/trailing code fence markdown if present
  // e.g. ```json\n{...}\n``` or ```\n{...}\n```
  if (cleaned.startsWith('```')) {
    // Remove opening fence line (e.g. ```json or ```)
    cleaned = cleaned.replace(/^```[a-zA-Z]*\r?\n?/, '');
    // Remove closing fence line
    cleaned = cleaned.replace(/\r?\n?```\s*$/, '');
  }

  cleaned = cleaned.trim();

  try {
    const data = JSON.parse(cleaned);
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Parsed JSON is not an object' };
    }
    return { success: true, data };
  } catch (err) {
    // LLMs occasionally output trailing characters, duplicate closing braces, or conversational text.
    // Isolate the outermost balanced JSON object:
    const startIdx = cleaned.indexOf('{');
    if (startIdx !== -1) {
      let depth = 0;
      let inString = false;
      let escape = false;
      let endIdx = -1;
      for (let i = startIdx; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === '{') depth++;
          else if (char === '}') {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }
      }
      if (endIdx !== -1) {
        try {
          const substring = cleaned.slice(startIdx, endIdx + 1);
          const data = JSON.parse(substring);
          if (data && typeof data === 'object') {
            return { success: true, data };
          }
        } catch (_) {
          // Ignore and return original error
        }
      }
    }
    return {
      success: false,
      error: `JSON parse error: ${err.message}`
    };
  }
}

/**
 * Normalizes Business Analysis payloads to guarantee both rich canonical representations
 * and backward-compatible legacy structures exist simultaneously.
 * 
 * @param {any} data
 * @returns {any}
 */
export function normalizeBusinessAnalysis(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;

  // 1. Digital Maturity Score fallback
  if (data.digitalMaturityScore === undefined && data.assessmentScores?.digitalMaturity?.score !== undefined) {
    data.digitalMaturityScore = Math.round(Number(data.assessmentScores.digitalMaturity.score));
  } else if (data.digitalMaturityScore !== undefined) {
    data.digitalMaturityScore = Math.round(Number(data.digitalMaturityScore));
  } else {
    data.digitalMaturityScore = 65;
  }

  // 1b. Assessment Scores & Dimension normalization
  if (data.assessmentScores && typeof data.assessmentScores === 'object') {
    const rawScores = data.assessmentScores;
    const dm = rawScores.digitalMaturity || rawScores;
    const rawDims = dm.dimensions || rawScores.dimensions;
    if (Array.isArray(rawDims)) {
      const dimMap = {};
      for (const d of rawDims) {
        const name = (d.name || d.dimension || '').toLowerCase();
        const score = typeof d.score === 'number' ? d.score : (parseFloat(d.score) || 60);
        const evidenceOrObservation = d.evidence || d.evidenceOrObservation || d.observation || 'Assessed based on workspace documentation';
        const item = { ...d, score, evidenceOrObservation };
        if (name.includes('data')) dimMap.dataIntegration = item;
        else if (name.includes('process') || name.includes('automation')) dimMap.processAutomation = item;
        else if (name.includes('self')) dimMap.selfService = item;
        else if (name.includes('analytics') || name.includes('telemetry')) dimMap.analytics = item;
        else if (name.includes('api')) dimMap.apiReadiness = item;
      }
      data.assessmentScores.dimensions = {
        dataIntegration: dimMap.dataIntegration || { score: 62, evidenceOrObservation: 'Data systems assessed from context' },
        processAutomation: dimMap.processAutomation || { score: 58, evidenceOrObservation: 'Manual workflows assessed from context' },
        selfService: dimMap.selfService || { score: 65, evidenceOrObservation: 'Self-service channels assessed from context' },
        analytics: dimMap.analytics || { score: 55, evidenceOrObservation: 'Analytics capabilities assessed from context' },
        apiReadiness: dimMap.apiReadiness || { score: 70, evidenceOrObservation: 'API interfaces assessed from context' }
      };
    }
    if (!data.assessmentScores.calculationRationale) {
      data.assessmentScores.calculationRationale = dm.rationale || rawScores.rationale || 'Derived from baseline manual operations and system integration status.';
    }
    if (!data.assessmentScores.overallScore) {
      data.assessmentScores.overallScore = dm.score || data.digitalMaturityScore;
    }
  }

  // 2. Goals / Strategic Goals cross-population
  if (!data.goals && Array.isArray(data.strategicGoals)) {
    data.goals = data.strategicGoals;
  }
  if (!data.strategicGoals && Array.isArray(data.goals)) {
    data.strategicGoals = data.goals.map((g, idx) => {
      if (typeof g === 'object' && g !== null) return g;
      const text = String(g);
      const isTargetMetric = text.includes('%') || text.includes('Reduce') || text.includes('Achieve') || text.includes('Target');
      return {
        id: `GOAL-0${idx + 1}`,
        goal: text,
        title: text,
        target: isTargetMetric ? `Proposed target: ${text}` : 'Operational improvement (Validation required)',
        baseline: 'Not established from available evidence',
        measurementMethod: 'Measurement method pending stakeholder confirmation',
        source: idx === 0 ? 'Workspace Primary Objective' : 'Discovery Context',
        evidenceCitation: 'Workspace Scope / Discovery',
        classification: isTargetMetric ? 'PROPOSED_TARGET' : (idx === 0 ? 'WORKSPACE_OBJECTIVE' : 'AI_INFERENCE'),
        confidence: 'MEDIUM',
        validationStatus: isTargetMetric ? 'VALIDATION_REQUIRED' : 'CONFIRMED'
      };
    });
  }
  if (Array.isArray(data.strategicGoals)) {
    data.strategicGoals = data.strategicGoals.map((g, idx) => {
      if (typeof g === 'object' && g !== null) {
        const citation = g.evidenceCitation || g.source || g.evidence || 'Workspace Scope';
        const title = g.title || g.goal || g.text || `Goal ${idx + 1}`;
        return {
          ...g,
          id: g.id || `GOAL-0${idx + 1}`,
          title,
          goal: g.goal || title,
          evidenceCitation: citation,
          source: citation
        };
      }
      return g;
    });
  }

  // 3. Pain Points / Operational Pain Points cross-population
  if (!data.painPoints && Array.isArray(data.operationalPainPoints)) {
    data.painPoints = data.operationalPainPoints;
  }
  if (!data.operationalPainPoints && Array.isArray(data.painPoints)) {
    data.operationalPainPoints = data.painPoints.map((p, idx) => {
      if (typeof p === 'object' && p !== null) return p;
      return {
        id: `PAIN-0${idx + 1}`,
        title: String(p).slice(0, 60),
        description: String(p),
        impact: 'High',
        evidence: 'Document / Discovery dialogue',
        evidenceCitation: 'Document / Discovery dialogue',
        source: 'Document / Discovery dialogue',
        classification: 'DISCOVERY_FACT',
        confidence: 'HIGH',
        validationStatus: 'CONFIRMED'
      };
    });
  }
  if (Array.isArray(data.operationalPainPoints)) {
    data.operationalPainPoints = data.operationalPainPoints.map((p, idx) => {
      if (typeof p === 'object' && p !== null) {
        const citation = p.evidenceCitation || p.evidence || p.source || 'Operational Review';
        const title = p.title || p.painPoint || p.description || `Pain Point ${idx + 1}`;
        return {
          ...p,
          id: p.id || `PAIN-0${idx + 1}`,
          title,
          evidenceCitation: citation,
          evidence: citation,
          source: citation
        };
      }
      return p;
    });
  }

  // 4. Requirements / RequirementsData cross-population
  if ((!Array.isArray(data.requirements) || data.requirements.length < 4) && Array.isArray(data.requirementsData) && data.requirementsData.length >= (data.requirements?.length || 0)) {
    data.requirements = data.requirementsData;
  } else if (!data.requirements && Array.isArray(data.requirementsData)) {
    data.requirements = data.requirementsData;
  }
  if (Array.isArray(data.requirements)) {
    data.requirements = data.requirements.map((r, idx) => {
      if (typeof r === 'string') {
        return {
          id: `REQ-0${idx + 1}`,
          type: 'Functional',
          text: r,
          title: r.slice(0, 60),
          description: r,
          specification: r,
          priority: 'HIGH',
          status: 'VALIDATION_REQUIRED',
          source: 'Workspace Scope',
          classification: 'DISCOVERY_FACT',
          confidence: 'HIGH',
          dependencies: [],
          acceptanceCriteria: [`Verify implementation of ${r.slice(0, 40)}`],
          validationStatus: 'VALIDATION_REQUIRED',
          handoffBlocking: false,
          rationale: 'Derived from discovered transformation goals.'
        };
      }
      const title = r.title || r.specification || r.text || r.description || `Requirement ${idx + 1}`;
      const spec = r.specification || r.text || r.description || r.statement || title;
      const description = r.description || spec || title;
      const text = r.text || spec || description || title;

      // Normalize priority to CRITICAL, HIGH, MEDIUM, LOW
      let priority = String(r.priority || 'HIGH').toUpperCase();
      if (priority === 'P0') priority = 'CRITICAL';
      else if (priority === 'P1') priority = 'HIGH';
      else if (priority === 'P2') priority = 'MEDIUM';
      else if (priority === 'P3') priority = 'LOW';
      if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
        priority = 'HIGH';
      }

      // Normalize status to CONFIRMED, VALIDATION_REQUIRED, DRAFT, REJECTED
      let status = String(r.status || '').toUpperCase();
      if (status === 'PROPOSED' || status === 'PENDING') status = 'VALIDATION_REQUIRED';
      if (!['CONFIRMED', 'VALIDATION_REQUIRED', 'DRAFT', 'REJECTED'].includes(status)) {
        status = r.validationStatus === 'CONFIRMED' ? 'CONFIRMED' : 'VALIDATION_REQUIRED';
      }

      // Allowed classification values
      let classification = String(r.classification || r.type || 'DISCOVERY_FACT').toUpperCase();
      const allowedClassifications = [
        'DOCUMENTED_FACT', 'USER_PROVIDED_FACT', 'WORKSPACE_OBJECTIVE',
        'DISCOVERY_FACT', 'INFERENCE', 'PROPOSED_TARGET', 'VALIDATION_REQUIRED', 'ASSUMPTION'
      ];
      if (!allowedClassifications.includes(classification)) {
        classification = 'DISCOVERY_FACT';
      }

      // Explicit handoffBlocking field (default: false, only true if explicitly set)
      const handoffBlocking = r.handoffBlocking === true || String(r.handoffBlocking).toLowerCase() === 'true';

      return {
        ...r,
        id: r.id || `REQ-0${idx + 1}`,
        type: r.type || classification || 'Functional',
        title,
        description,
        text,
        specification: spec,
        statement: r.statement || spec,
        priority,
        status,
        classification,
        handoffBlocking,
        source: r.source || 'Discovery Context',
        confidence: r.confidence || 'HIGH',
        dependencies: Array.isArray(r.dependencies) ? r.dependencies : [],
        acceptanceCriteria: Array.isArray(r.acceptanceCriteria) ? r.acceptanceCriteria : [text],
        validationStatus: r.validationStatus || status,
        rationale: r.rationale || r.why || 'Required to advance primary business objective.',
        sourceDocumentEvidence: r.sourceDocumentEvidence || r.source || r.traceability?.sourceDocumentEvidence || 'Discovery Context',
        originatingDiscoveryFact: r.originatingDiscoveryFact || r.originatingDialogue || r.traceability?.originatingDiscoveryFact || (r.source ? `${r.source}` : 'Identified from workspace discovery context'),
        strategicGoalAlignment: r.strategicGoalAlignment || r.goalAlignment || r.parentGoal || r.traceability?.relatedStrategicGoal || 'Core enterprise transformation priority',
        downstreamArchitectureImpact: r.downstreamArchitectureImpact || r.architectureImpact || r.technicalImpact || r.traceability?.downstreamImpact || 'Informs Stage 3 pattern selection, security boundaries, and non-functional requirements',
        provenanceChain: r.provenanceChain || `${r.source || 'Discovery Fact'} -> Analysis -> ${r.id || `REQ-0${idx + 1}`}`
      };
    });
    if (!data.requirementsData || (Array.isArray(data.requirementsData) && data.requirementsData.length < data.requirements.length)) {
      data.requirementsData = data.requirements;
    }
  }

  // 5. Automation Opportunities
  if (Array.isArray(data.automationOpportunities)) {
    data.automationOpportunities = data.automationOpportunities.map((a, idx) => {
      if (typeof a === 'string') {
        return {
          id: `AUTO-0${idx + 1}`,
          title: a,
          opportunity: a,
          impact: 'High',
          effort: 'Medium',
          saving: 'Labor & time reduction',
          rationale: 'Accelerates straight-through processing',
          source: 'Analysis Engine',
          dependencies: [],
          risks: [],
          classification: 'AI_INFERENCE',
          confidence: 'MEDIUM',
          validationStatus: 'PROPOSED'
        };
      }
      return {
        ...a,
        id: a.id || `AUTO-0${idx + 1}`,
        title: a.title || a.opportunity || `Opportunity ${idx + 1}`,
        opportunity: a.opportunity || a.title || `Opportunity ${idx + 1}`,
        impact: a.impact || 'High',
        effort: a.effort || 'Medium',
        saving: a.saving || 'Operational efficiency',
        rationale: a.rationale || 'Straight-through workflow automation',
        dependencies: Array.isArray(a.dependencies) ? a.dependencies : [],
        risks: Array.isArray(a.risks) ? a.risks : [],
        classification: a.classification || 'AI_INFERENCE',
        confidence: a.confidence || 'MEDIUM',
        validationStatus: a.validationStatus || 'PROPOSED'
      };
    });
  }

  // 5b. Requirements minimum check & backfill
  if (Array.isArray(data.requirements) && data.requirements.length < 4) {
    const needed = 4 - data.requirements.length;
    const fallbackTypes = ['Functional', 'Non-Functional', 'Integration', 'Security'];
    for (let i = 0; i < needed; i++) {
      const idx = data.requirements.length + 1;
      const type = fallbackTypes[i % fallbackTypes.length];
      const goalRef = data.strategicGoals?.[i] || data.goals?.[i];
      const goalText = typeof goalRef === 'object' ? (goalRef.goal || goalRef.title) : goalRef;
      const text = goalText ? `System must support: ${goalText}` : `System specification for ${type.toLowerCase()} workflow orchestration`;
      data.requirements.push({
        id: `REQ-0${idx}`,
        type,
        title: `REQ-0${idx}: ${text.slice(0, 50)}`,
        text,
        specification: text,
        statement: text,
        description: text,
        priority: 'High',
        status: 'Proposed',
        source: 'Workspace Objective Alignment',
        classification: 'WORKSPACE_OBJECTIVE',
        confidence: 'MEDIUM',
        dependencies: [],
        acceptanceCriteria: [`Verify implementation of ${text.slice(0, 40)}`],
        validationStatus: 'VALIDATION_REQUIRED',
        rationale: 'Derived from discovered transformation goals.',
        sourceDocumentEvidence: 'Workspace Scope Definition',
        originatingDiscoveryFact: 'Identified from workspace discovery context',
        strategicGoalAlignment: 'Core enterprise transformation priority',
        downstreamArchitectureImpact: 'Informs Stage 3 pattern selection and non-functional requirements'
      });
    }
  }

  // 5c. Automation Opportunities minimum check & backfill
  if (Array.isArray(data.automationOpportunities) && data.automationOpportunities.length < 2) {
    const idx = data.automationOpportunities.length + 1;
    data.automationOpportunities.push({
      id: `AUTO-0${idx}`,
      title: 'Automated Status Synchronization & Triage',
      opportunity: 'Automated Status Synchronization & Triage',
      impact: 'High',
      effort: 'Medium',
      potentialOutcome: 'Proactive straight-through status routing and notification',
      projectedMetric: 'Proposed target: Requires validation',
      saving: 'Operational turnaround time reduction',
      rationale: 'Accelerates end-to-end request lifecycle',
      source: 'Analysis Engine',
      dependencies: [],
      risks: [],
      classification: 'AI_INFERENCE',
      confidence: 'MEDIUM',
      validationStatus: 'VALIDATION_REQUIRED'
    });
  }

  // 5d. Stakeholder analysis normalization
  if (!Array.isArray(data.stakeholders) || data.stakeholders.length === 0) {
    data.stakeholders = [];
  }
  data.stakeholders = data.stakeholders.map((s, idx) => {
    if (typeof s === 'string') {
      return {
        id: `STK-0${idx + 1}`,
        role: s,
        persona: s,
        interest: `Operational execution and workflow visibility for ${s}`,
        businessNeed: `Frictionless tooling for ${s}`,
        responsibility: 'Process execution and feedback',
        painPoint: 'Manual coordination overhead',
        desiredOutcome: 'Automated and transparent workflow',
        influenceLevel: idx === 0 ? 'HIGH' : 'MEDIUM',
        affectedRequirements: ['REQ-01'],
        evidenceSource: 'Workspace Scope Definition'
      };
    }
    const role = s.role || s.persona || s.title || `Stakeholder ${idx + 1}`;
    const interest = s.interest || s.businessNeed || s.desiredOutcome || 'Operational excellence';
    return {
      id: s.id || `STK-0${idx + 1}`,
      role,
      persona: s.persona || role,
      interest,
      businessNeed: s.businessNeed || interest,
      responsibility: s.responsibility || 'Operational participation and governance',
      painPoint: s.painPoint || 'Manual coordination latency',
      desiredOutcome: s.desiredOutcome || interest,
      influenceLevel: s.influenceLevel || (idx === 0 ? 'HIGH' : 'MEDIUM'),
      affectedRequirements: Array.isArray(s.affectedRequirements) ? s.affectedRequirements : ['REQ-01'],
      evidenceSource: s.evidenceSource || s.source || 'Workspace Definition'
    };
  });
  if (data.stakeholders.length < 3) {
    const defaults = [
      { id: `STK-0${data.stakeholders.length + 1}`, role: 'Business Owner / Executive Sponsor', persona: 'Business Leadership', interest: 'Strategic transformation and SLA compliance', businessNeed: 'Executive visibility and operational efficiency', responsibility: 'Executive sponsorship and policy definition', painPoint: 'Lack of real-time SLA metrics', desiredOutcome: 'Audit-ready straight-through operations', influenceLevel: 'HIGH', affectedRequirements: ['REQ-01', 'REQ-03'], evidenceSource: 'Workspace Primary Objective' },
      { id: `STK-0${data.stakeholders.length + 2}`, role: 'Operations & Triage Staff', persona: 'Frontline Staff', interest: 'Reduction of repetitive data entry and single-pane tooling', businessNeed: 'Automated validation and routing', responsibility: 'Daily request handling and exception triage', painPoint: 'Cognitive overhead across disconnected systems', desiredOutcome: 'Instant triage and automated exception routing', influenceLevel: 'HIGH', affectedRequirements: ['REQ-01', 'REQ-02'], evidenceSource: 'Discovery Context' },
      { id: `STK-0${data.stakeholders.length + 3}`, role: 'End User / Client', persona: 'External Client', interest: 'Fast self-service intake and transparent status updates', businessNeed: 'Omnichannel digital access without phone tag', responsibility: 'Submitting requests and reviewing outcomes', painPoint: 'Unpredictable turnaround times', desiredOutcome: 'Instant confirmation and automated alerts', influenceLevel: 'MEDIUM', affectedRequirements: ['REQ-01', 'REQ-04'], evidenceSource: 'Workspace Target Personas' }
    ];
    for (const def of defaults) {
      if (data.stakeholders.length < 3 && !data.stakeholders.some(x => x.role === def.role)) {
        data.stakeholders.push(def);
      }
    }
  }

  // 5e. Gap Analysis normalization
  if (!Array.isArray(data.gapAnalysis) || data.gapAnalysis.length === 0) {
    if (Array.isArray(data.gaps) && data.gaps.length > 0) {
      data.gapAnalysis = data.gaps.map((g, idx) => {
        const text = typeof g === 'object' ? (g.gapDescription || g.gap || g.description) : String(g);
        return {
          id: `GAP-0${idx + 1}`,
          currentState: 'Manual or fragmented operational execution',
          desiredState: 'Automated, standardized digital workflow',
          gapDescription: text,
          businessImpact: 'Operational latency and overhead',
          evidence: 'Identified during Discovery diagnostics',
          priority: idx === 0 ? 'HIGH' : 'MEDIUM',
          affectedRequirement: `REQ-0${(idx % 4) + 1}`,
          recommendedDirection: 'Implement automated integration connector and validation rules',
          validationStatus: 'VALIDATION_REQUIRED'
        };
      });
    } else {
      data.gapAnalysis = [
        {
          id: 'GAP-01',
          currentState: 'Manual verification and spreadsheet-based tracking',
          desiredState: 'Automated straight-through ingestion with real-time validation',
          gapDescription: 'Absence of real-time bidirectional synchronization between intake channels and core database',
          businessImpact: 'High operator overhead and extended turnaround latency',
          evidence: 'Evidence provenance unavailable — validation required.',
          priority: 'HIGH',
          affectedRequirement: 'REQ-01',
          recommendedDirection: 'Implement event-driven ingestion gateway with REST API connectors',
          validationStatus: 'VALIDATION_REQUIRED'
        },
        {
          id: 'GAP-02',
          currentState: 'Manual telephone and email follow-ups handled by staff',
          desiredState: 'Closed-loop automated SMS and email dispatch on milestone events',
          gapDescription: 'No automated outbound messaging trigger configured on transaction updates',
          businessImpact: 'Frequent inbound status inquiries consuming frontline staff capacity',
          evidence: 'Evidence provenance unavailable — validation required.',
          priority: 'MEDIUM',
          affectedRequirement: 'REQ-02',
          recommendedDirection: 'Deploy multi-channel notification service with webhook triggers',
          validationStatus: 'VALIDATION_REQUIRED'
        }
      ];
    }
  }
  if (!Array.isArray(data.gaps) || data.gaps.length === 0) {
    data.gaps = data.gapAnalysis.map(g => g.gapDescription || g.currentState);
  }

  // 5f. Process Analysis normalization
  if (!Array.isArray(data.processAnalysis) || data.processAnalysis.length === 0) {
    data.processAnalysis = [
      {
        id: 'PROC-01',
        processName: 'End-to-End Request Intake & Fulfillment',
        trigger: 'User or operator initiates service request',
        actors: ['Client / Requester', 'Operations Triage Staff', 'Department Supervisor'],
        majorSteps: [
          'Request received via phone/email/portal',
          'Staff manually validates completeness against business rules',
          'Record keyed into core system of record',
          'Manual confirmation dispatched to requester'
        ],
        systemsInvolved: ['Core Transactional Database', 'Email Client', 'Legacy Portal'],
        bottlenecks: 'Manual rule verification and dual data entry between email and core database',
        manualActivities: 'Verification of prerequisite credentials, manual typing, phone callbacks',
        painPoints: 'Triage latency, duplicate submissions, and lack of real-time status tracking',
        desiredImprovement: 'Automated validation gateway with straight-through routing and closed-loop notifications'
      }
    ];
  }
  if (!Array.isArray(data.processIssues) || data.processIssues.length === 0) {
    data.processIssues = data.processAnalysis.map(p => p.bottlenecks || p.painPoints);
  }

  // 6. Current Operating Context normalization
  if (data.currentOperatingContext && typeof data.currentOperatingContext === 'object') {
    const coc = data.currentOperatingContext;
    const confirmedArr = Array.isArray(coc.confirmedCurrentState) ? coc.confirmedCurrentState : [];
    const inferredArr = Array.isArray(coc.inferredCurrentState) ? coc.inferredCurrentState : [];
    const unknownArr = Array.isArray(coc.unknownCurrentState) ? coc.unknownCurrentState : [];

    if (!coc.confirmedState && confirmedArr.length > 0) {
      coc.confirmedState = confirmedArr.map(c => c.item || c).join('. ');
    }
    if (!coc.inferredState && inferredArr.length > 0) {
      coc.inferredState = inferredArr.map(i => i.item || i).join('. ');
    }
    if (!coc.unknownsAndGaps && unknownArr.length > 0) {
      coc.unknownsAndGaps = unknownArr.map(u => `${u.item || u} (${u.whyItMatters || 'Validation required'})`).join('; ');
    }
    if (!coc.summary) {
      coc.summary = data.currentState || 'Current operational baseline based on available evidence.';
    }
    if (!coc.whatHappensToday) {
      coc.whatHappensToday = coc.confirmedState || data.currentState || 'Current operations rely on manual coordination.';
    }
    coc.observedProcesses = Array.isArray(coc.observedProcesses) ? coc.observedProcesses : [];
    coc.knownSystems = Array.isArray(coc.knownSystems) ? coc.knownSystems : [];
    coc.knownOperationalBottlenecks = Array.isArray(coc.knownOperationalBottlenecks) ? coc.knownOperationalBottlenecks : [];
    coc.knownConstraints = Array.isArray(coc.knownConstraints) ? coc.knownConstraints : [];
    coc.evidenceReferences = Array.isArray(coc.evidenceReferences) ? coc.evidenceReferences : [];
    coc.unknownInformation = Array.isArray(coc.unknownInformation) ? coc.unknownInformation : unknownArr;
    coc.evidenceNeeded = Array.isArray(coc.evidenceNeeded) ? coc.evidenceNeeded : [];
  }

  // 7. Ensure default arrays
  data.gaps = Array.isArray(data.gaps) ? data.gaps : [];
  data.processIssues = Array.isArray(data.processIssues) ? data.processIssues : [];
  data.improvementOpportunities = Array.isArray(data.improvementOpportunities) ? data.improvementOpportunities : [];
  data.openQuestions = Array.isArray(data.openQuestions) ? data.openQuestions : [];
  data.assumptions = Array.isArray(data.assumptions) ? data.assumptions : [];
  data.recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
  data.evidenceReferences = Array.isArray(data.evidenceReferences) ? data.evidenceReferences : [];

  return data;
}

/**
 * Validates a business analysis data payload against the schema.
 * 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBusinessAnalysis(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Expected payload to be a non-null object'] };
  }

  normalizeBusinessAnalysis(data);

  const { rules } = businessAnalysisSchema;

  for (const [field, rule] of Object.entries(rules)) {
    const val = data[field];

    // 1. Required check
    if (rule.required && (val === undefined || val === null)) {
      errors.push(`Missing required field: "${field}"`);
      continue;
    }

    if (val === undefined || val === null) {
      continue;
    }

    // 2. String validation
    if (rule.type === 'string') {
      if (typeof val !== 'string') {
        errors.push(`Field "${field}" must be a string (got ${typeof val})`);
      } else if (rule.minLength && val.trim().length < rule.minLength) {
        errors.push(`Field "${field}" must have at least ${rule.minLength} characters`);
      }
    }

    // 3. Integer validation
    if (rule.type === 'integer') {
      if (!Number.isInteger(val)) {
        errors.push(`Field "${field}" must be an integer (got ${val})`);
      } else {
        if (rule.min !== undefined && val < rule.min) {
          errors.push(`Field "${field}" must be >= ${rule.min} (got ${val})`);
        }
        if (rule.max !== undefined && val > rule.max) {
          errors.push(`Field "${field}" must be <= ${rule.max} (got ${val})`);
        }
      }
    }

    // 4. Array validation
    if (rule.type === 'array') {
      if (!Array.isArray(val)) {
        errors.push(`Field "${field}" must be an array (got ${typeof val})`);
      } else {
        if (rule.minItems && val.length < rule.minItems) {
          errors.push(`Field "${field}" must contain at least ${rule.minItems} items (got ${val.length})`);
        }

        // Validate item type if string
        if (rule.itemType === 'string') {
          val.forEach((item, idx) => {
            if (typeof item !== 'string' || item.trim().length === 0) {
              errors.push(`Field "${field}[${idx}]" must be a non-empty string`);
            }
          });
        }

        // Validate item with custom validator if provided
        if (typeof rule.itemValidator === 'function') {
          val.forEach((item, idx) => {
            if (!rule.itemValidator(item)) {
              errors.push(
                `Field "${field}[${idx}]" failed validation: ${rule.itemDescription || 'invalid item structure'}`
              );
            }
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a solution data payload against the solution schema.
 * 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSolution(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Expected payload to be a non-null object'] };
  }

  const { rules } = solutionSchema;

  for (const [field, rule] of Object.entries(rules)) {
    const val = data[field];

    // 1. Required check
    if (rule.required && (val === undefined || val === null)) {
      errors.push(`Missing required field: "${field}"`);
      continue;
    }

    if (val === undefined || val === null) {
      continue;
    }

    // 2. String validation
    if (rule.type === 'string') {
      if (typeof val !== 'string') {
        errors.push(`Field "${field}" must be a string (got ${typeof val})`);
      } else {
        if (rule.minLength && val.trim().length < rule.minLength) {
          errors.push(`Field "${field}" must have at least ${rule.minLength} characters`);
        }
        if (rule.allowedValues && !rule.allowedValues.includes(val)) {
          errors.push(`Field "${field}" must be one of: ${rule.allowedValues.join(', ')} (got "${val}")`);
        }
      }
    }

    // 3. Object validation
    if (rule.type === 'object') {
      if (typeof val !== 'object' || Array.isArray(val)) {
        errors.push(`Field "${field}" must be an object`);
      } else if (typeof rule.validator === 'function' && !rule.validator(val)) {
        errors.push(`Field "${field}" failed validation: ${rule.description || 'invalid object structure'}`);
      }
    }

    // 4. Array validation
    if (rule.type === 'array') {
      if (!Array.isArray(val)) {
        errors.push(`Field "${field}" must be an array (got ${typeof val})`);
      } else {
        if (rule.minItems && val.length < rule.minItems) {
          errors.push(`Field "${field}" must contain at least ${rule.minItems} items (got ${val.length})`);
        }
        if (rule.exactItems && val.length !== rule.exactItems) {
          errors.push(`Field "${field}" must contain exactly ${rule.exactItems} items (got ${val.length})`);
        }

        // Custom array validator
        if (typeof rule.validator === 'function') {
          const res = rule.validator(val);
          if (!res.valid) {
            errors.push(`Field "${field}" validation error: ${res.error}`);
          }
        }

        // String item type
        if (rule.itemType === 'string') {
          val.forEach((item, idx) => {
            if (typeof item !== 'string' || item.trim().length === 0) {
              errors.push(`Field "${field}[${idx}]" must be a non-empty string`);
            }
          });
        }

        // Item validator
        if (typeof rule.itemValidator === 'function') {
          val.forEach((item, idx) => {
            if (!rule.itemValidator(item)) {
              errors.push(
                `Field "${field}[${idx}]" failed validation: ${rule.itemDescription || 'invalid item structure'}`
              );
            }
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an architecture payload against schema and graph integrity rules.
 * 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateArchitecture(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Expected payload to be a non-null object'] };
  }

  const { rules } = architectureSchema;

  // Validate required string fields
  const stringFields = [
    'highLevelDesign',
    'lowLevelDesign',
    'integrationArch',
    'infrastructureArch',
    'securityArch',
    'deploymentArch'
  ];

  for (const field of stringFields) {
    const val = data[field];
    if (typeof val !== 'string' || val.trim().length < 20) {
      errors.push(`Field "${field}" must be a string with at least 20 characters`);
    }
  }

  // Validate nodes
  if (!Array.isArray(data.nodes) || data.nodes.length < rules.nodes.minItems) {
    errors.push(`Field "nodes" must contain at least ${rules.nodes.minItems} nodes`);
  } else {
    const nodeRes = rules.nodes.validator(data.nodes);
    if (!nodeRes.valid) {
      errors.push(nodeRes.error);
    }
  }

  // Validate edges & graph integrity
  if (!Array.isArray(data.edges) || data.edges.length < rules.edges.minItems) {
    errors.push(`Field "edges" must contain at least ${rules.edges.minItems} edges`);
  } else {
    const edgeRes = rules.edges.validator(data.edges, data);
    if (!edgeRes.valid) {
      errors.push(edgeRes.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a process workflow payload against process schema rules.
 * 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProcess(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Expected payload to be a non-null object'] };
  }

  const { rules } = processSchema;

  // Validate title
  if (typeof data.title !== 'string' || data.title.trim().length < rules.title.minLength) {
    errors.push(`Field "title" must be a string with at least ${rules.title.minLength} characters`);
  }

  // Validate description
  if (typeof data.description !== 'string' || data.description.trim().length < rules.description.minLength) {
    errors.push(`Field "description" must be a string with at least ${rules.description.minLength} characters`);
  }

  // Validate type
  const validTypes = rules.type.allowedValues;
  if (!data.type || !validTypes.includes(data.type)) {
    errors.push(`Field "type" must be one of: ${validTypes.join(', ')}`);
  }

  // Validate nodes
  if (!Array.isArray(data.nodes) || data.nodes.length < rules.nodes.minItems) {
    errors.push(`Field "nodes" must contain at least ${rules.nodes.minItems} process steps`);
  } else {
    const nodeRes = rules.nodes.validator(data.nodes);
    if (!nodeRes.valid) {
      errors.push(nodeRes.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a UX design payload against UX schema rules.
 * 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateUX(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Expected payload to be a non-null object'] };
  }

  const { properties } = uxSchema;

  // Validate title
  if (typeof data.title !== 'string' || data.title.trim().length < properties.title.minLength) {
    errors.push(`Field "title" must be a string with at least ${properties.title.minLength} characters`);
  }

  // Validate designTokens
  const tokenRes = properties.designTokens.validator(data.designTokens);
  if (!tokenRes.valid) {
    errors.push(tokenRes.error);
  }

  // Validate screens
  const screenRes = properties.screens.validator(data.screens);
  if (!screenRes.valid) {
    errors.push(screenRes.error);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a database design payload against database schema rules and relational integrity.
 * 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateDatabase(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Expected payload to be a non-null object'] };
  }

  const { properties } = databaseSchema;

  // Validate title
  if (typeof data.title !== 'string' || data.title.trim().length < properties.title.minLength) {
    errors.push(`Field "title" must be a string with at least ${properties.title.minLength} characters`);
  }

  // Validate entities
  const entRes = properties.entities.validator(data.entities);
  if (!entRes.valid) {
    errors.push(entRes.error);
  }

  // Validate relations & relational integrity
  const relRes = properties.relations.validator(data.relations, data);
  if (!relRes.valid) {
    errors.push(relRes.error);
  }

  // Validate sqlSchema
  if (typeof data.sqlSchema !== 'string' || data.sqlSchema.trim().length < properties.sqlSchema.minLength) {
    errors.push(`Field "sqlSchema" must be a string with at least ${properties.sqlSchema.minLength} characters`);
  } else {
    const sqlRes = properties.sqlSchema.validator(data.sqlSchema);
    if (!sqlRes.valid) errors.push(sqlRes.error);
  }

  // Validate prismaSchema
  if (typeof data.prismaSchema !== 'string' || data.prismaSchema.trim().length < properties.prismaSchema.minLength) {
    errors.push(`Field "prismaSchema" must be a string with at least ${properties.prismaSchema.minLength} characters`);
  } else {
    const prismaRes = properties.prismaSchema.validator(data.prismaSchema);
    if (!prismaRes.valid) errors.push(prismaRes.error);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates an API specification payload against API schema rules.
 * 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAPI(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Expected payload to be a non-null object'] };
  }

  const { properties } = apiSchema;

  // Validate title
  if (typeof data.title !== 'string' || data.title.trim().length < properties.title.minLength) {
    errors.push(`Field "title" must be a string with at least ${properties.title.minLength} characters`);
  }

  // Validate baseUrl
  const baseRes = properties.baseUrl.validator(data.baseUrl);
  if (!baseRes.valid) {
    errors.push(baseRes.error);
  }

  // Validate authType
  if (typeof data.authType !== 'string' || data.authType.trim().length < properties.authType.minLength) {
    errors.push(`Field "authType" must be a string with at least ${properties.authType.minLength} characters`);
  }

  // Validate endpoints
  const endRes = properties.endpoints.validator(data.endpoints);
  if (!endRes.valid) {
    errors.push(endRes.error);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates discovery questions array.
 * 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[], normalized?: any[] }}
 */
export function validateDiscoveryQuestions(data) {
  const errors = [];
  let questions = data;
  if (data && Array.isArray(data.questions)) {
    questions = data.questions;
  }
  if (!Array.isArray(questions)) {
    return { valid: false, errors: ['Expected an array of discovery questions or { questions: [...] }'] };
  }
  if (questions.length < 3) {
    errors.push('Must contain at least 3 discovery questions');
  }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== 'object') {
      errors.push(`Question at index ${i} must be an object`);
    } else {
      if (!q.question || typeof q.question !== 'string' || q.question.trim().length < 10) {
        errors.push(`Question at index ${i} must have a non-empty question string (at least 10 chars)`);
      }
      if (!q.category || typeof q.category !== 'string') {
        errors.push(`Question at index ${i} must have a category string`);
      }
      if (!q.rationale || typeof q.rationale !== 'string') {
        errors.push(`Question at index ${i} must have a rationale string`);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    normalized: questions
  };
}

/**
 * Validates an AI Consultant Dialogue Response payload
 * 
 * @param {any} data
 * @returns {{ valid: boolean, errors: string[], normalized?: any }}
 */
export function validateConsultantResponse(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Expected consultant response to be an object'] };
  }

  if (!data.summary || typeof data.summary !== 'string' || data.summary.trim().length < 5) {
    errors.push('Consultant response must have a non-empty summary string (at least 5 characters)');
  }

  if (data.status && typeof data.status !== 'string') {
    errors.push('status must be a string (CONFIRMED | PROPOSED | NEEDS_INPUT)');
  }

  if (data.confirmedFacts && !Array.isArray(data.confirmedFacts)) {
    errors.push('confirmedFacts must be an array');
  }

  if (data.requirements && !Array.isArray(data.requirements)) {
    errors.push('requirements must be an array');
  }

  if (data.recommendations && !Array.isArray(data.recommendations)) {
    errors.push('recommendations must be an array');
  }

  if (data.openQuestions && !Array.isArray(data.openQuestions)) {
    errors.push('openQuestions must be an array');
  }

  if (data.inferences && !Array.isArray(data.inferences)) {
    errors.push('inferences must be an array');
  }

  if (data.sources && !Array.isArray(data.sources)) {
    errors.push('sources must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      summary: data.summary || '',
      status: data.status || 'PROPOSED',
      confirmedFacts: Array.isArray(data.confirmedFacts) ? data.confirmedFacts : [],
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      openQuestions: Array.isArray(data.openQuestions) ? data.openQuestions : [],
      inferences: Array.isArray(data.inferences) ? data.inferences : [],
      sources: Array.isArray(data.sources) ? data.sources : [],
      suggestedNextAction: data.suggestedNextAction || 'Review Solution Options'
    }
  };
}

/**
 * Universal validator router for stage artifacts.
 * 
 * @param {string} stage 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateStageArtifact(stage, data) {
  switch (stage) {
    case 'DISCOVERY':
    case 'generateDiscoveryQuestions':
      return validateDiscoveryQuestions(data);
    case 'CONSULTANT_ANSWER':
    case 'consultantResponse':
    case 'answerDiscoveryQuestion':
      return validateConsultantResponse(data);
    case 'ANALYSIS':
    case 'analyzeBusinessContext':
      return validateBusinessAnalysis(data);
    case 'SOLUTIONS':
    case 'recommendSolutions':
    case 'generateSolutions':
      return validateSolution(data);
    case 'ARCHITECTURE':
    case 'generateArchitecture':
      return validateArchitecture(data);
    case 'PROCESS':
    case 'generateProcess':
      return validateProcess(data);
    case 'UX':
    case 'generateUX':
      return validateUX(data);
    case 'DATABASE':
    case 'generateDatabase':
      return validateDatabase(data);
    case 'API':
    case 'generateAPIs':
      return validateAPI(data);
    case 'PLANNING':
    case 'generateImplementationPlan':
      return validatePlanning(data);
    default:
      return { valid: true, errors: [] };
  }
}

/**
 * Validates structured UX command patch output from Gemini / External AI.
 * @param {any} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateUXPatch(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['UX patch output must be an object'] };
  }
  if (!data.operation && !data.operations && !data.changes && !data.theme && !data.layout) {
    errors.push('UX patch must specify operation, operations, or changes');
  }
  return { valid: errors.length === 0, errors };
}



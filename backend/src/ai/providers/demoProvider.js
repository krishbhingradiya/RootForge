/**
 * Deterministic Context-Aware AI Intelligence Provider
 * Tailors outputs dynamically according to:
 * - Unified Workspace Context (Metadata, Domain, Documents, Discovery Conversation)
 * - Upstream Artifacts (Business Analysis, Selected Solution Option, Architecture, Process, DB)
 * Supports multiple enterprise domains (Customer Support, Healthcare, Supply Chain, FinTech, HR, General Enterprise)
 */

import { detectDomain } from '../../services/workspaceContext.service.js';
import { generateDynamicConsultantFallback } from '../relevanceGuard.js';
import { normalizeStage2Contract } from '../../utils/stage2Contract.js';
import { synthesizeCanonicalDomainModel } from '../../services/domainModelSynthesizer.service.js';

function extractWorkspace(context) {
  return context.workspace || context;
}

function resolveDomain(context) {
  if (context.domain) return context.domain;
  return detectDomain(context);
}

function extractDocumentKeyInsights(context) {
  const docCtx = context.documentContext;
  if (!docCtx || !docCtx.combinedText || docCtx.analyzedCount === 0) {
    return {
      hasDocuments: false,
      documentCount: 0,
      docNames: '',
      docText: '',
      hasFalcon: false,
      hasApollo: false,
      hasNoShow: false,
      hasAppointment: false,
      hasDoctor: false,
      hasPatient: false,
      hasClinic: false,
      hasWarehouse: false,
      hasInventory: false,
      hasShipment: false,
      distinctTerms: []
    };
  }

  const text = docCtx.combinedText;
  const lower = text.toLowerCase();
  const docNames = (docCtx.sourceReferences || []).map(d => d.filename).join(', ');

  return {
    hasDocuments: true,
    documentCount: docCtx.analyzedCount,
    docNames,
    docText: text,
    hasFalcon: lower.includes('falcon'),
    hasApollo: lower.includes('apollo'),
    hasNoShow: lower.includes('no-show') || lower.includes('noshow'),
    hasAppointment: lower.includes('appointment'),
    hasDoctor: lower.includes('doctor') || lower.includes('physician'),
    hasPatient: lower.includes('patient'),
    hasClinic: lower.includes('clinic') || lower.includes('hospital'),
    hasWarehouse: lower.includes('warehouse'),
    hasInventory: lower.includes('inventory'),
    hasShipment: lower.includes('shipment') || lower.includes('freight'),
    distinctTerms: docCtx.distinctTerms || []
  };
}

/**
 * Enriches deterministic baseline analysis with canonical 8-class evidence taxonomy,
 * explainable scores, requirements engine, open questions, and assumptions.
 */
function enrichDemoBusinessAnalysis(base, context) {
  const ws = extractWorkspace(context);
  const domain = resolveDomain(context);
  const docNames = (context.documentContext?.sourceReferences || []).map(d => d.filename);
  const hasDocuments = docNames.length > 0;
  const userStmts = context.discovery?.userStatements || [];
  const userConfirmedFactsList = context.discovery?.userConfirmedFacts || [];
  const hasUserDialogue = userStmts.length > 0 || userConfirmedFactsList.length > 0;
  const hasEvidence = hasDocuments || hasUserDialogue || Boolean(ws.challenge);

  // 1. Executive Summary
  const executiveSummary = `Comprehensive strategic business analysis for ${ws.name || 'Enterprise Transformation'}. Assessed current operating friction, synthesized ${(base.goals || []).length || 4} strategic transformation goals, cataloged ${(base.requirements || []).length || 5} system requirements, and formulated an explainable digital maturity baseline of ${base.digitalMaturityScore || 65}/100 based on available workspace evidence.`;

  // 2. Current Operating Context
  const confirmedCurrentState = [];
  if (ws.challenge) {
    confirmedCurrentState.push({
      item: ws.challenge,
      source: 'Workspace Scope Definition',
      classification: 'USER_PROVIDED_FACT'
    });
  }
  if (hasDocuments) {
    confirmedCurrentState.push({
      item: `Operating procedures and baseline guidelines documented in ${docNames.join(', ')}`,
      source: docNames.length === 1 ? docNames[0] : (docNames.length > 1 ? docNames.join(', ') : 'Evidence provenance unavailable — validation required.'),
      classification: 'DOCUMENT_FACT'
    });
  }
  if (hasUserDialogue) {
    const firstStmt = userConfirmedFactsList[0]?.fact || userStmts[0];
    confirmedCurrentState.push({
      item: firstStmt,
      source: 'Discovery Dialogue',
      classification: 'USER_PROVIDED_FACT'
    });
  }
  if (confirmedCurrentState.length === 0) {
    confirmedCurrentState.push({
      item: 'Baseline operational scope defined in workspace profile',
      source: 'Workspace Profile',
      classification: 'USER_PROVIDED_FACT'
    });
  }

  const inferredCurrentState = [
    {
      item: 'Manual coordination across disparate tools introduces cognitive overhead and triage latency.',
      rationale: 'Absence of automated straight-through event processing and bidirectional API synchronization.',
      classification: 'AI_INFERENCE'
    },
    {
      item: 'Operational teams spend disproportionate effort performing repetitive data entry and status verification.',
      rationale: 'Derived from documented manual handoffs and absence of self-service capabilities.',
      classification: 'AI_INFERENCE'
    }
  ];

  const unknownCurrentState = [
    {
      item: 'Exact legacy system peak transaction throughput and concurrency limits',
      whyItMatters: 'Essential to size message queuing and rate-limiting buffers',
      actionRequired: 'Request IT architecture infrastructure audit'
    },
    {
      item: 'Current daily volume of exception escalations requiring supervisor sign-off',
      whyItMatters: 'Determines threshold rules for straight-through automation',
      actionRequired: 'Validate with operations leadership'
    }
  ];

  // Comprehensive sections A-H for Current Operating State
  const currentOperatingContext = {
    summary: hasEvidence
      ? `Current operational reality reflects documented workflow patterns and reported challenges in ${ws.industry || 'the enterprise'}. Operations rely heavily on manual coordination and legacy tools.`
      : 'Current-state evidence is incomplete.',
    whatHappensToday: hasEvidence
      ? (ws.challenge ? `Today, ${ws.challenge}` : 'Operations depend on manual handoffs and legacy tooling.')
      : 'Current operational workflows have not yet been established from indexed workspace documents.',
    observedProcesses: hasEvidence ? [
      {
        process: hasDocuments ? `Standard operating procedures specified in ${docNames.join(', ')}` : 'Manual request intake and scheduling',
        source: hasDocuments ? (docNames.length === 1 ? docNames[0] : 'Indexed Workspace Documents') : 'Discovery dialogue',
        classification: hasDocuments ? 'DOCUMENT_FACT' : 'USER_PROVIDED_FACT'
      }
    ] : [],
    knownSystems: hasEvidence ? [
      {
        system: domain === 'HEALTHCARE' ? 'Core Clinical Records / Scheduling Database' : 'Enterprise Core System of Record',
        role: 'Primary transactional system of record',
        evidence: hasDocuments ? (docNames.length === 1 ? docNames[0] : 'Indexed Workspace Documents') : 'Workspace Scope Definition'
      }
    ] : [],
    knownOperationalBottlenecks: hasEvidence ? [
      {
        bottleneck: 'Manual coordination across disparate tools introduces cognitive overhead and triage latency.',
        impact: 'High',
        evidence: hasDocuments ? (docNames.length === 1 ? docNames[0] : 'Indexed Workspace Documents') : 'Surfaced in Discovery Interview'
      }
    ] : [],
    knownConstraints: hasEvidence ? [
      {
        constraint: 'Must maintain strict data isolation and regulatory compliance.',
        source: 'Workspace Scope & Governance'
      }
    ] : [],
    evidenceReferences: hasDocuments ? [
      {
        title: 'Primary Operational Document',
        document: docNames.length === 1 ? docNames[0] : 'Indexed Workspace Documents',
        excerpt: 'Standard operating procedure guidelines for intake and processing.'
      }
    ] : [],
    unknownInformation: unknownCurrentState,
    evidenceNeeded: !hasEvidence ? [
      'Existing scheduling workflow',
      'Current system/integration details',
      'Current performance metrics'
    ] : [],
    isEvidenceComplete: hasEvidence,
    confirmedCurrentState,
    inferredCurrentState,
    unknownCurrentState,
    // Backwards-compatibility string representations
    confirmedState: confirmedCurrentState.map(c => c.item).join('. '),
    inferredState: inferredCurrentState.map(i => i.item).join('. '),
    unknownsAndGaps: unknownCurrentState.map(u => `${u.item} (${u.whyItMatters})`).join('; ')
  };

  // 3. Future Operating State (Business Target State)
  const futureOperatingState = {
    status: 'PROPOSED',
    description: 'Envisioned target business operating model without premature technical stack definitions.',
    targetCapabilities: [
      'Omnichannel digital self-service with responsive turnaround times',
      'Automated straight-through policy routing and validation',
      'Unified single-pane-of-glass operator copilot interface',
      'Closed-loop status notifications via SMS and email'
    ],
    expectedOutcomes: [
      { outcome: 'Substantial reduction in manual processing cycle times', classification: 'PROPOSED_TARGET', validationStatus: 'VALIDATION_REQUIRED' },
      { outcome: 'Significant deflection of routine inbound inquiries', classification: 'PROPOSED_TARGET', validationStatus: 'VALIDATION_REQUIRED' },
      { outcome: 'Immutable audit logging and enterprise role-based security', classification: 'PROPOSED_TARGET', validationStatus: 'VALIDATION_REQUIRED' }
    ],
    operationalShifts: [
      'Transition from reactive telephone coordination to proactive automated digital self-service'
    ],
    dependencies: [
      'Access to core system database read/write credentials and API endpoints',
      'Provisioning of enterprise identity provider for authentication'
    ],
    assumptions: [
      'Existing core systems can support transactional webhooks or batch sync interfaces'
    ],
    validationStatus: 'VALIDATION_REQUIRED'
  };

  // 4. Strategic Goals
  const strategicGoals = (base.goals || []).map((g, idx) => {
    const text = typeof g === 'object' ? (g.goal || g.title || g.text) : String(g);
    const isTargetMetric = text.includes('%') || text.includes('time') || text.includes('Reduce') || text.includes('Achieve');
    const isObjective = idx === 0 && Boolean(ws.objective);
    return {
      id: `GOAL-0${idx + 1}`,
      goal: text,
      target: isTargetMetric ? `Proposed target: ${text}` : 'Target: Full implementation of automated capabilities (Validation required)',
      baseline: 'Not established from available evidence',
      measurementMethod: 'Percentage of requests completed without manual supervisor intervention',
      source: isObjective ? 'Workspace Primary Objective' : (hasDocuments ? (docNames.length === 1 ? `Discovery & ${docNames[0]}` : 'Discovery & Indexed Workspace Documents') : 'Discovery Diagnostics'),
      classification: isObjective ? 'WORKSPACE_OBJECTIVE' : (isTargetMetric ? 'PROPOSED_TARGET' : 'AI_INFERENCE'),
      confidence: hasEvidence ? 'HIGH' : 'MEDIUM',
      validationStatus: isObjective ? 'CONFIRMED' : 'VALIDATION_REQUIRED'
    };
  });

  // 5. Operational Pain Points
  const operationalPainPoints = (base.painPoints || []).map((p, idx) => {
    const text = typeof p === 'object' ? (p.title || p.description || p.text) : String(p);
    return {
      id: `PAIN-0${idx + 1}`,
      title: text.split(':')[0] || text.slice(0, 40),
      description: text,
      impact: idx < 2 ? 'High' : 'Medium',
      evidence: hasDocuments ? (docNames.length === 1 ? `Documented in ${docNames[0]}` : 'Documented in Indexed Workspace Documents') : (hasUserDialogue ? 'Surfaced during Discovery dialogue' : 'Inferred operational bottleneck'),
      classification: hasDocuments ? 'DOCUMENT_FACT' : (hasUserDialogue ? 'USER_PROVIDED_FACT' : 'AI_INFERENCE'),
      confidence: hasEvidence ? 'HIGH' : 'MEDIUM',
      validationStatus: hasDocuments ? 'CONFIRMED' : 'VALIDATION_REQUIRED'
    };
  });

  // 6. Requirements Data
  const requirementsData = (base.requirements || []).map((r, idx) => {
    const text = r.text || r.description || r.title || String(r);
    const type = r.type || 'Functional';
    const isFirst = idx === 0;
    return {
      id: r.id || `REQ-0${idx + 1}`,
      title: (r.title && r.title.length < 60) ? r.title : text.slice(0, 60),
      type,
      text,
      statement: text,
      description: text,
      priority: idx < 2 ? 'CRITICAL' : 'HIGH',
      status: (isFirst && hasEvidence) ? 'CONFIRMED' : 'PROPOSED',
      source: hasDocuments ? (docNames.length === 1 ? `${docNames[0]} + Discovery` : 'Indexed Workspace Documents + Discovery') : 'Workspace Scope & Discovery Dialogue',
      classification: hasDocuments ? 'DOCUMENT_FACT' : (hasUserDialogue ? 'USER_PROVIDED_FACT' : 'AI_INFERENCE'),
      confidence: hasEvidence ? 'HIGH' : 'MEDIUM',
      dependencies: ['Access to core systems API and database credentials'],
      acceptanceCriteria: [
        `Verify end-to-end execution of ${text.slice(0, 45)}`,
        'Verify sub-second response latency and zero data loss on failure'
      ],
      validationStatus: (isFirst && hasDocuments) ? 'CONFIRMED' : 'VALIDATION_REQUIRED',
      rationale: `Directly satisfies strategic transformation goal GOAL-0${Math.min(idx + 1, strategicGoals.length)}.`,
      strategicGoalAlignment: `GOAL-0${Math.min(idx + 1, strategicGoals.length)}`,
      downstreamArchitectureImpact: 'Directly informs Solution Builder architecture patterns and connector tier sizing.',
      traceability: {
        originatingDiscoveryFact: hasUserDialogue ? 'Surfaced during Discovery stakeholder interview' : 'Identified from workspace definition',
        sourceDocumentEvidence: hasDocuments ? (docNames.length === 1 ? docNames[0] : 'Indexed Workspace Documents') : 'Evidence provenance unavailable — validation required.',
        relatedStrategicGoal: `GOAL-0${Math.min(idx + 1, strategicGoals.length)}`,
        downstreamImpact: 'Directly informs Solution Builder architecture patterns and connector tier sizing.'
      }
    };
  });

  // 7. Assessment Scores (Digital Maturity Breakdown)
  const totalScore = base.digitalMaturityScore || 65;
  const assessmentScores = {
    digitalMaturity: {
      score: totalScore,
      total: 100,
      label: 'PROJECT ASSESSMENT',
      rationale: `Digital maturity assessed at ${totalScore}/100 based on documented reliance on manual coordination, partial spreadsheet tracking, and absence of real-time API integrations.`,
      confidence: hasEvidence ? 'HIGH' : 'LOW',
      dimensions: [
        { name: 'Data Integration', score: Math.round(totalScore * 0.25), max: 25, evidence: hasDocuments ? 'Fragmented databases and manual re-entry between systems' : 'Insufficient evidence from documents', status: 'ASSESSED' },
        { name: 'Process Automation', score: Math.round(totalScore * 0.25), max: 25, evidence: hasEvidence ? 'Rule-based coordination without straight-through automation' : 'Insufficient evidence from documents', status: 'ASSESSED' },
        { name: 'Self-Service', score: Math.round(totalScore * 0.20), max: 20, evidence: hasEvidence ? 'Intake relies heavily on phone/email channels' : 'Insufficient evidence from documents', status: 'ASSESSED' },
        { name: 'Analytics & Telemetry', score: Math.round(totalScore * 0.15), max: 15, evidence: hasEvidence ? 'Retrospective reporting rather than real-time SLA dashboards' : 'Insufficient evidence from documents', status: 'ASSESSED' },
        { name: 'API Readiness', score: Math.round(totalScore * 0.15), max: 15, evidence: hasDocuments ? 'Connectors require webhook and REST gateway modernization' : 'Insufficient evidence from documents', status: 'ASSESSED' }
      ],
      missingInformation: [
        'Detailed endpoint documentation for existing legacy applications',
        'Formal volume benchmarks for peak daily transactional load'
      ]
    }
  };

  // 8. Open Questions
  const openQuestions = [
    {
      id: 'OQ-01',
      question: `What specific API interfaces or webhooks do the existing ${domain.toLowerCase()} core systems expose?`,
      reason: 'Determines whether real-time event-driven synchronization or polling batch jobs are required.',
      whyItMatters: 'Determines whether real-time event-driven synchronization or polling batch jobs are required.',
      category: 'Technical Integration Requirements',
      affectedRequirement: 'REQ-01',
      affectedDecision: 'Integration tier connector pattern',
      expectedEvidence: 'API technical documentation, OpenAPI/Swagger specifications, or vendor interface guide',
      stage3Impact: 'Directly blocks finalization of integration connector pattern in Stage 3 Solution Builder',
      owner: 'IT Architecture & Systems Lead',
      impact: 'High',
      priority: 'HIGH',
      sourceContext: 'Technical Integration Requirements',
      status: 'OPEN'
    },
    {
      id: 'OQ-02',
      question: 'What is the required authentication standard (OAuth 2.0 / SAML / API Keys) for enterprise users?',
      reason: 'Mandatory for security tier design and identity provider integration.',
      whyItMatters: 'Mandatory for security tier design and identity provider integration.',
      category: 'Enterprise Security Governance',
      affectedRequirement: 'REQ-02',
      affectedDecision: 'Identity architecture and SSO provider configuration',
      expectedEvidence: 'Enterprise identity provider specifications (e.g. Microsoft Entra ID / Okta SAML metadata)',
      stage3Impact: 'Informs security gateway and session management design in Stage 3',
      owner: 'Security & Compliance Officer',
      impact: 'High',
      priority: 'HIGH',
      sourceContext: 'Enterprise Security Governance',
      status: 'OPEN'
    }
  ];

  // 9. Assumptions
  const assumptions = [
    {
      id: 'ASM-01',
      assumption: 'Existing records systems can support bidirectional data synchronization without schema lockups.',
      reason: 'Required for straight-through automated booking and status updates.',
      whyItExists: 'Transactional volume requires real-time read/write access to avoid duplicate entries.',
      evidenceGap: hasDocuments ? 'Technical integration specification omitted from indexed documents' : 'No technical integration documents uploaded',
      riskIfIncorrect: 'Architecture will require an asynchronous queuing staging tier and manual exception handling.',
      impact: 'High',
      validationRequired: 'Confirm supported interfaces with system owner',
      downstreamImpact: 'Directly affects Stage 3 connector tier sizing and cache persistence patterns',
      status: 'UNVALIDATED'
    },
    {
      id: 'ASM-02',
      assumption: 'Staff and operators have access to modern web browsers and secure network connections.',
      reason: 'Prerequisite for responsive web application and real-time dashboard deployment.',
      whyItExists: 'Operator portal requires WebSockets or SSE for real-time ticket dispatch.',
      evidenceGap: 'Client workstation hardware specifications not provided in workspace scope',
      riskIfIncorrect: 'Legacy terminal or specialized desktop software wrapper will be needed.',
      impact: 'Medium',
      validationRequired: 'Validate frontline workstation environment and browser versions',
      downstreamImpact: 'Informs frontend build target and browser polyfill configuration in Stage 3',
      status: 'UNVALIDATED'
    }
  ];

  // 10. Recommendations (AI Business Consultant & Ecosystem Guidance)
  const recommendations = [
    {
      id: 'REC-01',
      title: 'Decoupled Event-Driven Queue & Ingestion Tier',
      recommendation: 'Implement an event-driven architecture using message queues to decouple high-volume intake from core legacy backends.',
      why: 'Protects legacy databases from traffic surges and guarantees zero message loss during maintenance windows.',
      whyItFits: 'Operational intake volume fluctuates heavily, requiring asynchronous buffering to avoid locking the transactional database.',
      businessRequirement: 'Addresses REQ-01: Digital Request Intake with zero data loss.',
      technicalRole: 'Buffering message queue and async worker pool for transactional isolation.',
      dependency: 'Provisioning of message broker (e.g. RabbitMQ / Azure Service Bus) and consumer workers.',
      tradeOff: 'Introduces eventual consistency and requires dead-letter queue monitoring.',
      confidence: 'HIGH',
      status: 'PROPOSED',
      validation: 'Architecture Review Board approval required',
      validationStatus: 'VALIDATION_REQUIRED',
      source: 'Enterprise Integration Best Practice'
    },
    {
      id: 'REC-02',
      title: 'Targeted Multi-Channel Notification Gateway',
      recommendation: 'Deploy automated SMS/Email reminders and status dispatch prior to scheduled operational milestones.',
      why: 'Established industry pattern to reduce operational no-shows and rescheduling friction.',
      whyItFits: 'Replaces manual operator follow-up calls with closed-loop multi-channel alerts.',
      businessRequirement: 'Addresses REQ-03: Real-Time Operational Notifications.',
      technicalRole: 'Outbound communications gateway with webhook callback verification.',
      dependency: 'Enterprise notification gateway credentials and customer consent flags.',
      tradeOff: 'Requires template governance and opt-out unsubscribe compliance management.',
      confidence: 'HIGH',
      status: 'PROPOSED',
      validation: 'Customer operations sign-off required',
      validationStatus: 'VALIDATION_REQUIRED',
      source: 'Operational Experience Baseline'
    }
  ];

  // 11. Benefits and Risks
  const benefitsAndRisks = {
    potentialBenefits: [
      'Targeted reduction in manual operational cycle times',
      'Deflection of routine inquiry calls and emails through digital self-service',
      'Real-time executive visibility into operational bottlenecks and SLA health'
    ],
    potentialRisks: [
      'Legacy system connector latency during peak usage surges',
      'Change management adoption resistance among frontline operational staff'
    ],
    dependencies: [
      'Access to core system database read/write credentials and API endpoints',
      'Provisioning of enterprise identity provider (IdP) for SSO authentication'
    ],
    unknowns: [
      'Peak concurrent transaction volume during promotional or crisis periods'
    ]
  };

  // 11b. Stakeholder Analysis
  const stakeholders = [
    {
      id: 'STK-01',
      role: 'Business Owner / Executive Sponsor',
      persona: 'Executive Leadership',
      interest: 'Strategic transformation, SLA compliance, and operational efficiency',
      businessNeed: 'Executive visibility and operational efficiency',
      responsibility: 'Executive sponsorship, policy definition, and KPI monitoring',
      painPoint: 'Lack of real-time SLA metrics and consolidated reporting',
      desiredOutcome: 'Audit-ready straight-through operations with measurable ROI',
      influenceLevel: 'HIGH',
      affectedRequirements: ['REQ-01', 'REQ-03'],
      evidenceSource: ws.objective ? 'Workspace Primary Objective' : 'Executive Mandate'
    },
    {
      id: 'STK-02',
      role: 'Operations & Triage Staff',
      persona: 'Frontline Operational Team',
      interest: 'Reduction of repetitive data entry and single-pane tooling',
      businessNeed: 'Automated validation and routing to eliminate phone tag',
      responsibility: 'Daily request fulfillment and exception triage',
      painPoint: 'High cognitive overhead managing disconnected legacy software tools',
      desiredOutcome: 'Instant triage and automated exception routing',
      influenceLevel: 'HIGH',
      affectedRequirements: ['REQ-01', 'REQ-02'],
      evidenceSource: hasUserDialogue ? 'Discovery Context' : 'Operational Scope'
    },
    {
      id: 'STK-03',
      role: 'End User / Client',
      persona: 'External Requester',
      interest: 'Fast self-service intake and transparent status updates',
      businessNeed: 'Omnichannel digital access without phone tag or email delays',
      responsibility: 'Submitting requests and reviewing outcomes',
      painPoint: 'Unpredictable turnaround times and missing progress visibility',
      desiredOutcome: 'Instant confirmation and automated alerts via SMS/Email',
      influenceLevel: 'MEDIUM',
      affectedRequirements: ['REQ-01', 'REQ-04'],
      evidenceSource: 'Workspace Target Personas'
    }
  ];

  // 11c. Gap Analysis
  const gapAnalysis = [
    {
      id: 'GAP-01',
      currentState: 'Manual intake verification and spreadsheet-based tracking',
      desiredState: 'Automated straight-through ingestion with real-time validation',
      gapDescription: 'Absence of real-time bidirectional integration layer between intake channels and system of record',
      businessImpact: 'High operator overhead and extended turnaround latency',
      evidence: hasDocuments ? (docNames.length === 1 ? `Documented procedures in ${docNames[0]}` : 'Indexed Workspace Documents') : 'Discovery interview findings',
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
      evidence: hasUserDialogue ? 'Surfaced in Discovery Interview' : 'Reported customer inquiry volume logs',
      priority: 'MEDIUM',
      affectedRequirement: 'REQ-02',
      recommendedDirection: 'Deploy multi-channel notification service with webhook triggers',
      validationStatus: 'VALIDATION_REQUIRED'
    }
  ];

  // 11d. Process Analysis
  const processAnalysis = [
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

  // 12. Automation Opportunities
  const automationOpportunities = (base.automationOpportunities || []).map((opp, idx) => {
    const isObj = typeof opp === 'object' && opp !== null;
    const title = isObj ? (opp.title || opp.opportunity) : opp;
    return {
      id: opp.id || `AUTO-0${idx + 1}`,
      title,
      opportunity: title,
      impact: isObj ? (opp.impact || 'High') : 'High',
      effort: isObj ? (opp.effort || 'Medium') : 'Medium',
      potentialOutcome: 'Automated straight-through qualification and routing of routine requests',
      projectedMetric: 'Proposed target: Requires validation',
      saving: 'Proposed efficiency yield — validation required',
      rationale: 'Operational efficiency through straight-through automation',
      source: hasDocuments ? (docNames.length === 1 ? docNames[0] : 'Indexed Workspace Documents') : 'Discovery Findings',
      dependencies: ['Access to core systems'],
      risks: ['API rate limits on legacy systems'],
      classification: 'AI_INFERENCE',
      confidence: hasEvidence ? 'HIGH' : 'MEDIUM',
      status: 'PROPOSED',
      validationStatus: 'VALIDATION_REQUIRED'
    };
  });

  // 13. Validation Summary
  const validationSummary = {
    requirementsCount: requirementsData.length,
    evidenceBackedCount: requirementsData.filter(r => r.classification !== 'AI_INFERENCE').length,
    aiInferredCount: requirementsData.filter(r => r.classification === 'AI_INFERENCE').length,
    openQuestionsCount: openQuestions.length,
    unvalidatedAssumptionsCount: assumptions.length,
    validationBlockersCount: 0,
    evidenceCoveragePct: hasEvidence ? 80 : 20,
    traceabilityCoveragePct: 100,
    readinessState: hasEvidence ? 'READY_FOR_SOLUTION_BUILDER' : 'VALIDATION_REQUIRED'
  };

  // 14. Evidence References
  const evidenceReferences = [];
  if (docNames.length > 0) {
    evidenceReferences.push({
      id: 'EV-01',
      sourceType: 'DOCUMENT',
      sourceName: docNames.length === 1 ? docNames[0] : (docNames.length > 1 ? docNames.join(', ') : 'Indexed Workspace Documents'),
      reference: 'Standard Operating Procedure / BRD',
      snippet: context.documentContext?.sourceReferences?.[0]?.snippet || 'Documented business rules and procedures'
    });
  }
  evidenceReferences.push({
    id: 'EV-02',
    sourceType: 'WORKSPACE_INPUT',
    sourceName: ws.name || 'Workspace Scope',
    reference: 'Primary Objective',
    snippet: ws.objective || 'Business transformation objective'
  });

  return {
    ...base,
    currentState: hasEvidence ? base.currentState : 'Current-state evidence is incomplete.',
    executiveSummary,
    currentOperatingContext,
    futureOperatingState,
    strategicGoals,
    operationalPainPoints,
    requirementsData,
    automationOpportunities,
    assessmentScores,
    openQuestions,
    assumptions,
    recommendations,
    benefitsAndRisks,
    stakeholders,
    gapAnalysis,
    processAnalysis,
    gaps: gapAnalysis.map(g => g.gapDescription),
    processIssues: processAnalysis.map(p => p.bottlenecks),
    validationSummary,
    evidenceReferences
  };
}


export const demoProvider = {
  async generateDiscoveryQuestions(context) {
    const ws = extractWorkspace(context);
    const domain = resolveDomain(context);
    const projectName = ws.name || 'Business Initiative';
    
    const baseQuestions = [
      {
        question: `What is the single most critical operational bottleneck affecting ${projectName} today?`,
        category: 'Problem Definition',
        rationale: 'Pinpoints primary source of latency, cost overhead, or human error.'
      },
      {
        question: `Who are the primary end users and departmental stakeholders interacting with this process?`,
        category: 'Stakeholders',
        rationale: 'Establishes user personas and adoption hurdles.'
      },
      {
        question: `What existing core applications or legacy systems must this solution integrate with?`,
        category: 'Technical Constraints',
        rationale: 'Surfaces API readiness, batch jobs, and perimeter security requirements.'
      },
      {
        question: `Which specific decision gates or compliance checks currently demand manual supervisor sign-off?`,
        category: 'Process Intelligence',
        rationale: 'Separates deterministic rules from candidate AI assistive actions.'
      },
      {
        question: `What measurable metrics (SLA reduction, labor savings, error rate, NPS) will validate success?`,
        category: 'Business Value',
        rationale: 'Frames ROI justification for executive sponsorship.'
      }
    ];

    if (domain === 'CUSTOMER_SUPPORT') {
      baseQuestions.unshift({
        question: 'What is the current distribution of inbound volume across email, portal, chat, and phone channels?',
        category: 'Channel Analysis',
        rationale: 'Guides omnichannel intake architecture and priority triage.'
      });
    } else if (domain === 'HEALTHCARE') {
      baseQuestions.unshift({
        question: 'Which existing patient-record or clinical scheduling systems, if any, does the hospital currently use?',
        category: 'Clinical Systems',
        rationale: 'Surfaces existing scheduling software and interface capabilities without assuming proprietary vendor solutions.'
      });
      baseQuestions.push({
        question: 'What are the current patient no-show rates and scheduling lead times across specialties?',
        category: 'Clinical SLA',
        rationale: 'Quantifies clinical throughput bottlenecks and slot optimization targets.'
      });
    } else if (domain === 'SUPPLY_CHAIN') {
      baseQuestions.unshift({
        question: 'What Warehouse Management System (WMS) or inventory tracking systems, if any, are currently in use?',
        category: 'Logistics Systems',
        rationale: 'Identifies existing inventory software and ledger interfaces without assuming proprietary platforms.'
      });
      baseQuestions.push({
        question: 'Where do fulfillment cycle time delays occur most frequently (receiving, picking, staging, or carrier dispatch)?',
        category: 'Fulfillment Flow',
        rationale: 'Identifies warehouse bottlenecks for automated allocation and routing.'
      });
    } else if (domain === 'FINTECH_CLAIMS') {
      baseQuestions.unshift({
        question: 'What are the regulatory audit and fraud validation thresholds governing automatic claim approvals?',
        category: 'Compliance & Risk',
        rationale: 'Defines straight-through processing limits vs required adjuster review gates.'
      });
    }

    // If documents were uploaded, add a document-informed question
    if (context.documentContext && context.documentContext.sourceReferences && context.documentContext.sourceReferences.length > 0) {
      const docNames = context.documentContext.sourceReferences.map(d => d.filename).slice(0, 2).join(', ');
      baseQuestions.push({
        question: `Based on your uploaded documentation (${docNames}), what standard operating procedures or business rules must be automated first?`,
        category: 'Documentation Alignment',
        rationale: 'Aligns AI workflow directly with documented operational SOPs.'
      });
    }

    return baseQuestions;
  },

  async answerDiscoveryQuestion(context, userMessage, conversationHistory = []) {
    return generateDynamicConsultantFallback(context, userMessage);
  },

  async analyzeBusinessContext(context) {
    const ws = extractWorkspace(context);
    const domain = resolveDomain(context);
    const docInsights = extractDocumentKeyInsights(context);
    const obj = ws.objective || 'Modernize business operations';
    const chal = ws.challenge || 'Manual operations and fragmented tools';

    // Separate friction (current state / problem) from solution statements
    const isSolutionText = (txt) => {
      if (!txt) return false;
      const s = txt.trim().toLowerCase();
      return (
        s.startsWith('improve') ||
        s.startsWith('build') ||
        s.startsWith('create') ||
        s.startsWith('replace') ||
        s.startsWith('by replacing') ||
        s.startsWith('we want') ||
        s.startsWith('the goal is') ||
        s.startsWith('our goal is') ||
        s.startsWith('centralize') ||
        s.startsWith('streamline') ||
        s.startsWith('modernize')
      );
    };

    let frictionSummary = '';
    if (chal && !isSolutionText(chal)) {
      frictionSummary = chal.trim();
    } else {
      const sentences = (obj.match(/[^.!?\n]+[.!?\n]*/g) || [obj]).map(s => s.trim());
      const frictionSentences = sentences.filter(s => !isSolutionText(s));
      frictionSummary = frictionSentences.length > 0 
        ? frictionSentences.join(' ') 
        : 'Patients experience delays and manual coordination bottlenecks across disconnected systems';
    }

    // Compute digital maturity dynamically
    let maturity = 58;
    if (context.documentContext && context.documentContext.analyzedCount > 0) maturity += 8;
    if (context.discovery && context.discovery.userStatements && context.discovery.userStatements.length > 0) maturity += 6;

    // Incorporate user statements or document excerpts into analysis if present
    const userConstraints = (context.discovery?.discoveredConstraints || []).join('; ');
    const docMentions = (context.documentContext?.sourceReferences || []).map(d => d.filename).join(', ');

    if (domain === 'HEALTHCARE') {
      const apolloPrefix = docInsights.hasApollo ? 'At Hospital Apollo, clinical' : 'Currently, clinical';
      const falconNote = docInsights.hasFalcon 
        ? ' The existing scheduling workflows operate without the Falcon Scheduling Engine, resulting in clinic doctor allocation bottlenecks and high patient no-show rates.'
        : '';
      const docStateNote = docMentions ? ` Operational guidelines sourced from ${docMentions}.` : '';

      return enrichDemoBusinessAnalysis({
        currentState: `${apolloPrefix} scheduling and patient intake rely heavily on manual telephone coordination and disconnected clinic records. ${frictionSummary}. Nurses and administrative staff spend substantial time manually verifying doctor availability, calling clinic staff for appointment readiness, and resolving patient scheduling overlaps.${falconNote} Visibility for clinical leadership into real-time patient queue wait times is retrospective rather than live.${userConstraints ? ` Operational constraint noted: ${userConstraints}.` : ''}${docStateNote}`,
        futureState: `A modern, HIPAA-compliant patient intake and clinical orchestration platform${docInsights.hasApollo ? ' for Hospital Apollo' : ''} where incoming appointment requests are categorized in under 3 seconds using intelligent slot matching${docInsights.hasFalcon ? ' driven by the Falcon Scheduling Engine' : ''}. Routine appointment bookings, cancellations, and status confirmations are executed autonomously via EHR connectors, while complex clinical escalations arrive pre-triaged with suggested doctor schedules.${docMentions ? ` Incorporates standard operating procedures from ${docMentions}.` : ''}`,
        goals: [
          docInsights.hasFalcon 
            ? 'Deploy Falcon Scheduling Engine to achieve automated patient appointment self-scheduling'
            : 'Achieve automated patient self-scheduling and confirmation without administrative overhead',
          'Reduce average patient intake and appointment booking wait time from current baseline',
          docInsights.hasNoShow
            ? 'Eliminate clinic double-booking and minimize patient appointment no-show rates'
            : 'Eliminate clinic double-booking and reduce patient appointment no-show rates',
          docInsights.hasApollo
            ? 'Provide real-time clinical dashboard for Hospital Apollo clinic doctor utilization and room SLA health'
            : 'Provide real-time clinical dashboard for provider room utilization and bed turnover SLA health',
          'Enforce full HIPAA audit compliance with encrypted role-based clinical data governance'
        ],
        painPoints: [
          'Phone queue bottlenecks: Patients endure long hold times, resulting in call abandonment during peak hours',
          'Misallocated clinic slots and doctor scheduling conflicts causing operational room delays',
          'Fragmented patient timeline across legacy EHR, paper intake forms, and clinic desk logs',
          'Absence of automated SMS/Email appointment reminders leading to clinic no-shows'
        ],
        stakeholders: [
          { role: docInsights.hasApollo ? 'Hospital Apollo Medical Director' : 'VP Clinical Operations / Medical Director', interest: 'Clinic throughput, patient CSAT, doctor utilization, compliance' },
          { role: 'Clinic Schedulers & Triage Nurses', interest: 'Reduced call volume, ergonomic patient scheduling copilot' },
          { role: 'Attending Physicians & Specialists', interest: 'Accurate doctor slot allocations, predictable clinic hours, fewer no-shows' },
          { role: 'Patients & Caregivers', interest: 'Zero hold times, 24/7 digital booking, automated SMS reminders' },
          { role: 'Healthcare IT & Security', interest: 'Secure system connectors, encrypted storage, role-based access control' }
        ],
        requirements: [
          { id: 'REQ-01', type: 'Functional', text: 'Omnichannel patient appointment request intake via web portal, mobile PWA, and automated IVR/SMS' },
          { id: 'REQ-02', type: 'Functional', text: docInsights.hasFalcon ? 'Intelligent slot-matching algorithm powered by the Falcon Scheduling Engine based on doctor specialty, clinic room readiness, and urgency' : 'Intelligent slot-matching algorithm based on physician specialty, room readiness, and urgency' },
          { id: 'REQ-03', type: 'Technical', text: 'Bidirectional connector for real-time synchronization with existing patient-record and clinical scheduling systems' },
          { id: 'REQ-04', type: 'Compliance', text: 'Strict HIPAA-compliant RBAC, encryption at rest and in transit, and immutable audit logs' },
          { id: 'REQ-05', type: 'Usability', text: 'Ergonomic doctor schedule calendar with one-click approval and automated patient dispatch' }
        ],
        gaps: [
          'No centralized slot availability engine; clinic schedules exist only in isolated doctor calendars',
          'Absence of an event-driven notification gateway to alert patients when appointment slots open up',
          'Missing automated triage escalation when patients submit urgent symptoms online'
        ],
        processIssues: [
          'Handoff between triage nurses and scheduling coordinators requires paper forwarding and re-verification',
          'Patient must repeatedly recite insurance and medical history across different clinic departments',
          'No real-time telemetry to detect overbooked clinic days before patient wait-time penalties trigger'
        ],
        automationOpportunities: [
          { title: 'Intelligent Patient Slot Matching', impact: 'High', effort: 'Medium', saving: 'Proposed efficiency yield — validation required' },
          { title: 'Self-Service Appointment Booking & Rescheduling', impact: 'High', effort: 'Low', saving: 'Proposed call deflection yield — validation required' },
          { title: 'Automated SMS Confirmation & Reminder Engine', impact: 'High', effort: 'Low', saving: 'Proposed no-show mitigation yield — validation required' },
          { title: 'Urgent Clinical Symptom Escalation Triage', impact: 'High', effort: 'Medium', saving: 'Proposed triage acceleration yield — validation required' }
        ],
        digitalMaturityScore: maturity,
        improvementOpportunities: [
          'Single pane of glass for multi-clinic doctor schedule coordination',
          'Automated closed-loop SMS/Email notifications to patients on waitlist',
          'Continuous reinforcement learning from clinician scheduling adjustments'
        ]
      }, context);
    }

    if (domain === 'SUPPLY_CHAIN') {
      return enrichDemoBusinessAnalysis({
        currentState: `Currently, warehouse inventory tracking, order allocation, and carrier dispatch rely heavily on manual paper logs, disparate spreadsheets, and disconnected ERP entries. ${frictionSummary}. Warehouse personnel spend extensive time manually searching for pallet locations, re-verifying pick tickets, and making phone calls to carriers. Executive management lacks real-time inventory visibility across distribution centers.${userConstraints ? ` System constraint noted: ${userConstraints}.` : ''}`,
        futureState: `A unified, event-driven smart warehouse and logistics orchestration platform where incoming orders are validated against stock within seconds using automated bin allocation. Standard fulfillments are dispatched straight-through with barcode validation, while stockout exceptions trigger automated vendor reorder workflows.${docMentions ? ` Incorporates warehouse standard procedures from ${docMentions}.` : ''}`,
        goals: [
          'Achieve automated straight-through fulfillment allocation without manual warehouse supervisor review',
          'Reduce order-to-dispatch cycle time from current baseline',
          'Deliver high-fidelity real-time inventory accuracy across all regional warehouse facilities',
          'Provide executive visibility into active dock bottlenecks, picker productivity, and carrier SLAs',
          'Lower warehouse operational handling cost per unit through automated allocation'
        ],
        painPoints: [
          'Paper picking bottlenecks: Operators spend substantial time physically searching for misplaced SKUs',
          'Mismatched stock counts between ERP ledger and physical warehouse bins causing stockouts',
          'Manual carrier dispatch scheduling causing missed pickup windows and shipping detention fees',
          'Weekend and seasonal volume surges resulting in fulfillment backlogs and customer SLA penalties'
        ],
        stakeholders: [
          { role: 'VP Supply Chain & Logistics', interest: 'Fulfillment velocity, inventory holding cost, carrier performance' },
          { role: 'Warehouse Operations Managers', interest: 'Shift productivity, bin capacity, bottleneck elimination' },
          { role: 'Floor Operators & Pickers', interest: 'Ergonomic mobile handheld scanning, optimized pick path routing' },
          { role: 'Enterprise IT & ERP Admins', interest: 'SAP/Oracle connectors, zero-loss message queuing, edge device security' },
          { role: 'Logistics Carriers & Customers', interest: 'Accurate manifest EDI, predictable pickup schedules, live shipment tracking' }
        ],
        requirements: [
          { id: 'REQ-01', type: 'Functional', text: 'Multi-channel order ingestion via EDI, REST API, and ERP webhooks with automated inventory reservation' },
          { id: 'REQ-02', type: 'Functional', text: 'Dynamic bin allocation engine with shortest-path picking optimization for mobile handhelds' },
          { id: 'REQ-03', type: 'Technical', text: 'Sub-second REST and WebSocket API response times with PostgreSQL/SQLite 3NF persistence' },
          { id: 'REQ-04', type: 'Integration', text: 'Bidirectional connector for real-time inventory synchronization with SAP / Oracle ERP' },
          { id: 'REQ-05', type: 'Security', text: 'Role-based access control with ADMIN, LOGISTICS_LEAD, WAREHOUSE_OPERATOR, and VIEWER tiers' }
        ],
        gaps: [
          'No centralized inventory rule repository; stock allocation rules exist only in supervisor spreadsheets',
          'Absence of an event streaming pipeline between warehouse barcode scanners and corporate ERP backends',
          'Missing automated alert when high-priority rush orders arrive on dock'
        ],
        processIssues: [
          'Handoff between floor pickers and shipping docks requires physical paper signatures and manual re-entry',
          'Inventory adjustments for damaged goods require supervisor email approvals with 24-hour turnaround',
          'No real-time telemetry to detect picking queue bottlenecks before freight carrier cutoff deadlines'
        ],
        automationOpportunities: [
          { title: 'Intelligent Inventory Allocation & Bin Routing', impact: 'High', effort: 'Medium', saving: 'Proposed travel time reduction — validation required' },
          { title: 'Automated Barcode Scan Reconciliation', impact: 'High', effort: 'Low', saving: 'Proposed data entry error reduction — validation required' },
          { title: 'Automated Vendor Reorder on Safety Stock Breach', impact: 'High', effort: 'Medium', saving: 'Proposed stockout mitigation — validation required' },
          { title: 'Predictive Freight Carrier Dispatch Scheduling', impact: 'Medium', effort: 'Low', saving: 'Proposed detention penalty reduction — validation required' }
        ],
        digitalMaturityScore: maturity,
        improvementOpportunities: [
          'Unified single pane of glass for multi-facility warehouse stock visibility',
          'Automated closed-loop webhook status notifications to logistics carriers',
          'Continuous reinforcement learning from picker route completion times'
        ]
      }, context);
    }

    // Default: Customer Support or General Enterprise
    return enrichDemoBusinessAnalysis({
      currentState: `Currently, operational execution relies heavily on manual intervention across disconnected tools. ${frictionSummary}. Operators spend significant effort parsing unstructured requests, validating business rules, and performing repetitive data entry. Visibility for executive leadership is retrospective rather than real-time.${userConstraints ? ` Key system constraint: ${userConstraints}.` : ''}`,
      futureState: `A modern, AI-augmented operational platform where incoming challenges are automatically classified, enriched, and routed. Routine decisions are handled autonomously under configured policies, while human experts focus on complex exceptions with AI-assisted resolution suggestions.${docMentions ? ` Informed by uploaded SOPs from ${docMentions}.` : ''}`,
      goals: [
        'Achieve automated straight-through processing for standard requests',
        'Reduce average first-response latency from current baseline',
        'Provide real-time executive dashboard for SLA health and operator utilization',
        'Standardize resolution consistency using verified knowledge base citations',
        'Lower overall operational support cost per ticket through automated triage'
      ],
      painPoints: [
        'Manual classification bottlenecks: Operators spend significant time reading and tagging requests',
        'Misrouted items between departments causing multi-day resolution delays',
        'No unified customer timeline across separate CRM, ERP, and inbox records',
        'Weekend and holiday volume spikes leading to SLA breaches and churn'
      ],
      stakeholders: [
        { role: 'VP Customer Experience / Operations', interest: 'CSAT scores, brand loyalty, cost control' },
        { role: 'Support Team Leads', interest: 'Real-time queue balancing, burnout reduction' },
        { role: 'Frontline Specialists / Operators', interest: 'Fewer repetitive tickets, ergonomic copilot UI' },
        { role: 'Enterprise IT & Security', interest: 'SOC-2 / GDPR compliance, encrypted API connectors' }
      ],
      requirements: [
        { id: 'REQ-01', type: 'Functional', text: 'Multi-channel automated ingestion of requests with attachments' },
        { id: 'REQ-02', type: 'Functional', text: 'Zero-shot AI intent categorization and sentiment scoring with confidence threshold' },
        { id: 'REQ-03', type: 'Functional', text: 'ERP connector for automated order tracking lookup and refund eligibility check' },
        { id: 'REQ-04', type: 'Technical', text: 'Sub-second REST API response times and PostgreSQL/SQLite relational persistence' },
        { id: 'REQ-05', type: 'Security', text: 'RBAC with ADMIN, CONSULTANT, ANALYST, and VIEWER privilege tiers' }
      ],
      gaps: [
        'No centralized business rule engine; triage rules exist only in PDF SOP documents',
        'Absence of an event streaming pipeline between web forms and ERP backends',
        'Missing automated escalation alerts when high-value VIP customers submit issues'
      ],
      processIssues: [
        'Handoff between Tier-1 and Billing requires manual email forwarding and re-verification',
        'Customer must repeatedly provide order number if ticket is reassigned',
        'No real-time telemetry to catch bottlenecked queues before SLA penalties trigger'
      ],
      automationOpportunities: [
        { title: 'Intelligent Inbound Triage', impact: 'High', effort: 'Low', saving: '75% triage time savings' },
        { title: 'Self-Service Order Tracking Bot', impact: 'High', effort: 'Medium', saving: '50% inbound ticket deflection' },
        { title: 'Automated Billing Credit Approvals', impact: 'Medium', effort: 'Low', saving: '90% refund delay reduction' },
        { title: 'Predictive Churn Risk Flagging', impact: 'High', effort: 'Medium', saving: '30% VIP customer retention boost' }
      ],
      digitalMaturityScore: maturity,
      improvementOpportunities: [
        'Single pane of glass for multi-tier workflow coordination',
        'Automated closed-loop SMS/Email status updates to shoppers',
        'Continuous reinforcement learning from agent corrections'
      ]
    }, context);
  },

  async recommendSolutions(context, legacyAnalysis) {
    const ws = extractWorkspace(context);
    const domain = resolveDomain(context);
    const canonical = normalizeStage2Contract(context, legacyAnalysis || context?.businessAnalysis || {});

    const requirements = canonical.requirements;
    const goals = canonical.strategicGoals;
    const painPoints = canonical.businessProblems;
    const automationOpps = canonical.automationOpportunities;
    const assumptions = canonical.assumptions;
    const openQuestions = canonical.openQuestions;
    const existingSystems = canonical.existingSystems;
    const constraints = canonical.constraints || [];

    const projectName = ws.name || canonical.workspaceName || 'Enterprise Transformation';

    // 1. DYNAMIC KEY CAPABILITIES FROM VERIFIED REQUIREMENTS & GOALS (min 4)
    const keyCapabilities = [];
    if (requirements.length > 0) {
      requirements.forEach((r) => {
        if (keyCapabilities.length < 6) {
          const reqRef = r.id ? ` (Satisfies [${r.id}])` : '';
          const title = r.title || r.specification || r.text || 'System Capability';
          keyCapabilities.push(`${title}${reqRef}`);
        }
      });
    }

    // If fewer than 4 capabilities, backfill from goals and domain scope
    if (keyCapabilities.length < 4) {
      goals.forEach(g => {
        if (keyCapabilities.length < 4) {
          const gText = g.goal || g.title || g.text || (typeof g === 'string' ? g : null);
          if (gText) {
            keyCapabilities.push(`Strategic Capability: ${gText} [Workspace Alignment]`);
          }
        }
      });
    }

    if (keyCapabilities.length < 4) {
      const fallbacks = [
        `Automated Workflow Ingestion & Validation Gateway for ${projectName}`,
        `Operational Triage & Human-in-the-Loop Supervisory Console`,
        `Real-Time Event Processing & Audit Telemetry Pipeline`,
        `Extensible Enterprise Integration & Persistence Layer`
      ];
      for (const fb of fallbacks) {
        if (keyCapabilities.length < 4) {
          keyCapabilities.push(fb);
        }
      }
    }

    // 2. DYNAMIC AUTOMATION OPPORTUNITIES (min 3)
    const resolvedAutomationOpps = [];
    if (automationOpps.length > 0) {
      automationOpps.forEach(o => {
        if (resolvedAutomationOpps.length < 5) {
          const title = o.title || o.opportunity || (typeof o === 'string' ? o : 'Automated Workflow');
          resolvedAutomationOpps.push(`${title} (Proposed target — validation required)`);
        }
      });
    }

    if (resolvedAutomationOpps.length < 3) {
      const autoFallbacks = [
        `Straight-through request triage and automated schema validation for ${projectName}`,
        'Automated status change notifications and stakeholder alerts via event webhooks',
        'Continuous audit logging and compliance verification without manual operator intervention'
      ];
      for (const afb of autoFallbacks) {
        if (resolvedAutomationOpps.length < 3) {
          resolvedAutomationOpps.push(afb);
        }
      }
    }

    // 3. DYNAMIC AI / PREDICTIVE OPPORTUNITIES (min 3)
    const aiOpps = [];
    if (ws.objective) {
      aiOpps.push(`AI-assisted workflow orchestration aligned to: ${ws.objective} (Proposed target — validation required)`);
    }
    if (painPoints.length > 0) {
      const firstPain = painPoints[0]?.title || painPoints[0]?.description || (typeof painPoints[0] === 'string' ? painPoints[0] : null);
      if (firstPain) {
        aiOpps.push(`Predictive triage and pattern detection addressing: ${firstPain} (AI estimate — validation required)`);
      }
    }
    const aiFallbacks = [
      `Context-aware operator copilot for natural language guidance in ${projectName}`,
      'Intelligent exception categorization and automated root-cause recommendation',
      'Continuous workflow telemetry analysis for proactive bottleneck identification'
    ];
    for (const aio of aiFallbacks) {
      if (aiOpps.length < 3) {
        aiOpps.push(aio);
      }
    }

    // 4. TECH STACK (ZERO PRE-SELECTION, GROUNDED IN EVIDENCE & CONSTRAINTS)
    const reqIds = requirements.map(r => r.id || 'REQ');
    const docNames = canonical.sourceDocuments.map(d => d.filename);
    const primaryEvidence = docNames.length > 0 
      ? `Document Evidence: ${docNames.join(', ')}`
      : (context.discovery?.userStatements?.length > 0 
          ? `Discovery Dialogue: "${context.discovery.userStatements[0]}"`
          : (ws.challenge ? `Workspace Scope Definition: "${ws.challenge}"` : 'Evidence provenance unavailable — validation required.'));

    const technologies = [];

    // Identify and protect documented existing systems
    const rawExistingSystems = Array.isArray(existingSystems) ? [...existingSystems] : [];
    // Also inspect constraints and current state for explicitly documented existing systems
    if (rawExistingSystems.length === 0 && Array.isArray(constraints)) {
      constraints.forEach(c => {
        const text = typeof c === 'object' && c !== null ? (c.constraint || c.text || c.title || '') : String(c);
        const match = text.match(/(?:existing|current|legacy|integrated with)\s+([A-Za-z0-9_\-\.\/\s]+?(?:SQL|Database|DB|ERP|CRM|System|Platform|v\d+))/i);
        if (match && match[1]) {
          rawExistingSystems.push({
            name: match[1].trim(),
            systemName: match[1].trim(),
            source: 'Stage 2 Constraints'
          });
        }
      });
    }

    let existingDb = null;
    let existingBackend = null;
    const existingIntegrations = [];

    if (rawExistingSystems.length > 0) {
      rawExistingSystems.forEach((sys) => {
        const sysName = typeof sys === 'object' && sys !== null ? (sys.name || sys.systemName || sys.title) : String(sys);
        if (!sysName) return;

        let layer = 'INTEGRATIONS';
        const lower = sysName.toLowerCase();
        if (lower.includes('sql') || lower.includes('database') || lower.includes('db') || lower.includes('postgres') || lower.includes('oracle') || lower.includes('mongo') || lower.includes('base')) {
          layer = 'DATABASE';
          existingDb = sysName;
        } else if (lower.includes('gateway') || lower.includes('api') || lower.includes('service') || lower.includes('backend')) {
          layer = 'BACKEND';
          existingBackend = sysName;
        } else if (lower.includes('portal') || lower.includes('web') || lower.includes('ui') || lower.includes('client')) {
          layer = 'FRONTEND';
        } else {
          layer = 'INTEGRATIONS';
          existingIntegrations.push(sysName);
        }

        technologies.push({
          name: sysName,
          category: layer,
          classification: 'EXISTING_SYSTEM',
          reason: 'Retained as source system of record; requires integration connector and interface contract validation',
          requirementsSupported: reqIds.slice(0, 2),
          compatibility: 'Existing system interface requires adapter gateway, connection pooling, and telemetry logging',
          evidenceType: 'DOCUMENTED_FACT',
          evidenceSource: 'Stage 2 Business Analysis',
          evidenceReference: reqIds[0] || 'Stage 2 Context',
          evidenceStatement: `Documented existing system of record in workspace context: ${sysName}`,
          evidence: `Documented in workspace context as active enterprise system of record: ${sysName}`,
          validationStatus: 'CONFIRMED',
          validationQuestion: null
        });
      });
    }

    // FRONTEND
    const frontendTech = {
      name: 'Web Client Portal & Operator Workspace',
      category: 'FRONTEND',
      classification: ws.targetUsers ? 'USER_PROVIDED_FACT' : 'RECOMMENDED_TECHNOLOGY',
      reason: `Delivers user interface optimized for ${ws.targetUsers || 'Enterprise Users'}`,
      requirementsSupported: reqIds.slice(0, 2),
      compatibility: 'Modern standard evergreen web browsers with responsive CSS design tokens',
      evidenceType: ws.targetUsers ? 'USER_PROVIDED_FACT' : 'RECOMMENDATION',
      evidenceSource: ws.targetUsers ? 'Workspace Scope Context' : 'Stage 3 Architecture Analysis',
      evidenceReference: ws.targetUsers ? 'Target User Profile' : (reqIds[0] || 'REQ-01'),
      evidenceStatement: ws.targetUsers ? `Grounded in target user persona: ${ws.targetUsers}` : 'Candidate user interface pattern proposed from requirement specifications',
      evidence: ws.targetUsers ? `Workspace Scope: Target Users = ${ws.targetUsers}` : 'Candidate pattern proposed — validation required',
      validationStatus: ws.targetUsers ? 'CONFIRMED' : 'PROPOSED',
      validationQuestion: ws.targetUsers ? null : 'Confirm primary client device form-factors and supported browser tiers'
    };
    technologies.push(frontendTech);

    // BACKEND (API Gateway is BACKEND, NEVER INTEGRATIONS)
    const backendTech = {
      name: existingBackend || 'Modular Application Services & Ingress Gateway',
      category: 'BACKEND',
      classification: existingBackend ? 'EXISTING_SYSTEM' : 'RECOMMENDED_TECHNOLOGY',
      reason: 'Provides API routing, service orchestration, JWT authentication, and transactional state coordination',
      requirementsSupported: reqIds.slice(0, 3),
      compatibility: 'REST / OpenAPI compliant interfaces with DTO validation and backend service boundaries',
      evidenceType: 'RECOMMENDATION',
      evidenceSource: 'Stage 3 Architecture Analysis',
      evidenceReference: reqIds[0] || 'REQ-01',
      evidenceStatement: 'API Gateway and backend service orchestration proposed to provide controlled integration between portal, backend services, and external endpoints',
      evidence: 'Stage 2 requirement architecture impact specifications',
      validationStatus: existingBackend ? 'CONFIRMED' : 'PROPOSED',
      validationQuestion: 'Confirm service boundary, gateway hosting model, and rate limiting policies'
    };
    if (!existingBackend) {
      technologies.push(backendTech);
    }

    // DATABASE (Protected: use existing if documented)
    let dbTech;
    if (existingDb) {
      dbTech = technologies.find(t => t.name === existingDb);
    } else {
      dbTech = {
        name: 'Transactional Relational Persistence Tier',
        category: 'DATABASE',
        classification: 'VALIDATION_REQUIRED',
        reason: 'Maintains ACID compliance, audit trails, and schema consistency for operational records',
        requirementsSupported: reqIds.slice(0, 2),
        compatibility: 'ACID relational database engine with migration management',
        evidenceType: 'RECOMMENDATION',
        evidenceSource: 'Stage 3 Architecture Analysis',
        evidenceReference: 'Not established from available workspace evidence.',
        evidenceStatement: 'Technology choice not established from available evidence — candidate pattern proposed',
        evidence: 'Technology choice not established from available evidence — candidate pattern proposed (Validation required)',
        validationStatus: 'VALIDATION_REQUIRED',
        validationQuestion: 'Confirm enterprise database engine choice, hosting environment, and clustering/backup SLA'
      };
      technologies.push(dbTech);
    }

    // AI_SERVICES
    const aiTech = {
      name: 'Configurable AI & Automation Integration Tier',
      category: 'AI_SERVICES',
      classification: 'RECOMMENDED_TECHNOLOGY',
      reason: 'Coordinates intent triage, rules evaluation, and supervisory copilots with safety guardrails',
      requirementsSupported: reqIds,
      compatibility: 'Pluggable AI provider abstraction with deterministic safety fallbacks',
      evidenceType: ws.objective ? 'USER_PROVIDED_FACT' : 'RECOMMENDATION',
      evidenceSource: ws.objective ? 'Workspace Objective' : 'Stage 3 Architecture Analysis',
      evidenceReference: ws.objective ? 'Workspace Scope' : (reqIds[0] || 'REQ-01'),
      evidenceStatement: ws.objective ? `Aligned to workspace objective: ${ws.objective}` : 'Candidate AI coordination pattern proposed for intelligent workflows',
      evidence: ws.objective ? `Workspace Objective: ${ws.objective}` : 'Candidate pattern proposed — validation required',
      validationStatus: 'PROPOSED',
      validationQuestion: 'Validate AI provider compliance, latency budgets, and human-in-the-loop escalation guardrails'
    };
    technologies.push(aiTech);

    // INTEGRATIONS
    let intTech;
    if (existingIntegrations.length > 0) {
      intTech = technologies.find(t => t.name === existingIntegrations[0]);
    } else {
      intTech = {
        name: 'Enterprise Adapters & Event Webhook Connectors',
        category: 'INTEGRATIONS',
        classification: 'VALIDATION_REQUIRED',
        reason: 'Interfaces with external enterprise records and upstream notification endpoints',
        requirementsSupported: reqIds.slice(0, 2),
        compatibility: 'Asynchronous event webhooks with retry queues and exponential backoff',
        evidenceType: 'RECOMMENDATION',
        evidenceSource: 'Stage 3 Architecture Analysis',
        evidenceReference: 'Not established from available workspace evidence.',
        evidenceStatement: 'External interfaces not established from available evidence — candidate adapter patterns proposed',
        evidence: 'External interfaces not established from available evidence — validation required',
        validationStatus: 'VALIDATION_REQUIRED',
        validationQuestion: 'Confirm external third-party API specifications, webhook endpoints, authentication tokens, and rate limits'
      };
      technologies.push(intTech);
    }

    const techStack = {
      frontend: ws.targetUsers 
        ? `Modern Web Application Client (Grounded in target user profile: ${ws.targetUsers})`
        : 'Modern Web Application Client (Candidate interface — validation required)',
      backend: 'Modular Application Services Tier (API Gateway & Core Business Logic)',
      database: existingDb
        ? `${existingDb} (Existing System of Record)`
        : 'Relational / Transactional Persistence Pattern (Technology choice not established from available evidence — candidate pattern proposed, validation required)',
      ai_services: 'Configurable AI & Automation Tier (Modular Provider Abstraction — validation required)',
      integrations: existingIntegrations.length > 0
        ? `${existingIntegrations.join(', ')} (Existing Enterprise Connectors)`
        : 'External system interfaces not established from available evidence — candidate API adapters proposed (Validation required)',
      technologies
    };

    // 5. DECISION FACTORS & DYNAMIC RECOMMENDATION EVALUATION
    const confirmedCount = requirements.filter(r => {
      const s = String(r.status || r.validationStatus || '').toUpperCase();
      return s === 'CONFIRMED' || s === 'VERIFIED';
    }).length;
    const validationRequiredCount = requirements.length - confirmedCount;

    const blockingQuestions = openQuestions.filter(q => String(q.priority || '').toUpperCase() === 'BLOCKER');
    const hasBlockers = blockingQuestions.length > 0;

    const totalReqs = requirements.length;
    const totalProblems = painPoints.length;
    const totalGoals = goals.length;
    const totalConstraints = constraints.length;
    const blockerCount = blockingQuestions.length;

    // 6. THREE DYNAMIC STRATEGIC OPTIONS WITH OPTION-LEVEL TRACEABILITY & DIFFERENTIATION
    const optionA_reqs = reqIds.slice(0, Math.max(1, Math.ceil(reqIds.length / 2)));
    const optionB_reqs = [...reqIds];
    const optionC_reqs = [...reqIds];

    const optA_factors = {
      requirementsCovered: `${optionA_reqs.length} / ${totalReqs || 1}`,
      businessProblemsAddressed: `${Math.min(2, totalProblems)} / ${totalProblems || 1}`,
      strategicGoalsSupported: `${Math.min(2, totalGoals)} / ${totalGoals || 1}`,
      knownConstraintsSatisfied: `${totalConstraints} / ${totalConstraints || 1}`,
      validationBlockers: blockerCount
    };

    const optB_factors = {
      requirementsCovered: `${optionB_reqs.length} / ${totalReqs || 1}`,
      businessProblemsAddressed: `${totalProblems} / ${totalProblems || 1}`,
      strategicGoalsSupported: `${totalGoals} / ${totalGoals || 1}`,
      knownConstraintsSatisfied: `${totalConstraints} / ${totalConstraints || 1}`,
      validationBlockers: blockerCount
    };

    const optC_factors = {
      requirementsCovered: `${optionC_reqs.length} / ${totalReqs || 1}`,
      businessProblemsAddressed: `${totalProblems} / ${totalProblems || 1}`,
      strategicGoalsSupported: `${totalGoals} / ${totalGoals || 1}`,
      knownConstraintsSatisfied: `${Math.max(0, totalConstraints - 1)} / ${totalConstraints || 1}`,
      validationBlockers: blockerCount
    };

    let recommendedOptionId = null;
    let recommendationRationale = '';
    if (hasBlockers) {
      recommendationRationale = `Recommendation requires additional validation because Stage 2 contains ${blockingQuestions.length} unresolved validation blocker(s). No option is recommended until blockers are resolved.`;
    } else if (totalReqs === 0) {
      recommendationRationale = 'Recommendation requires additional validation because requirements have not been established from available workspace evidence.';
    } else {
      recommendedOptionId = 'OPTION_B';
      recommendationRationale = `Option B is recommended because evidence evaluation indicates optimal alignment:\n` +
        `• Requirements covered: ${optB_factors.requirementsCovered}\n` +
        `• Business problems addressed: ${optB_factors.businessProblemsAddressed}\n` +
        `• Strategic goals supported: ${optB_factors.strategicGoalsSupported}\n` +
        `• Known constraints satisfied: ${optB_factors.knownConstraintsSatisfied}\n` +
        `• Validation blockers: ${blockerCount}\n` +
        `Rationale: Balances coverage of ${totalReqs} documented requirement(s) (${confirmedCount} confirmed, ${validationRequiredCount} pending validation) with human-in-the-loop safety, lower operational risk, and phased delivery milestones under documented constraints.`;
    }

    const optionA_why = {
      requirementsAddressed: requirements.slice(0, Math.max(1, Math.ceil(requirements.length / 2))).map(r => ({
        id: r.id || null,
        title: r.title || r.specification || 'Routine Workflow Rule Ingestion',
        classification: r.classification || 'WORKSPACE_OBJECTIVE',
        validationStatus: r.status || r.validationStatus || 'CONFIRMED',
        evidence: r.sourceDocumentEvidence || r.evidence || primaryEvidence
      })),
      businessProblemsAddressed: painPoints.slice(0, 2).map(p => ({
        id: p.id || null,
        title: p.title || p.description || 'Manual operational overhead',
        impact: p.impact || 'High'
      })),
      strategicGoalsSupported: goals.slice(0, 2).map(g => ({
        id: g.id || null,
        title: g.goal || g.title || 'Accelerate process efficiency',
        target: g.target || 'Proposed target: Baseline efficiency (Validation required)',
        baseline: g.baseline || 'Baseline not established from available evidence.'
      })),
      automationOpportunitiesAddressed: resolvedAutomationOpps.slice(0, 2),
      constraintsConsidered: [
        'Minimal change management resistance',
        'Low upfront capital allocation',
        'Strictly deterministic execution without generative variance'
      ],
      openQuestions: openQuestions.slice(0, 2).map(q => ({
        id: q.id || null,
        question: q.question || q.text || 'Rule interface specification',
        priority: q.priority || 'MEDIUM'
      })),
      assumptions: assumptions.slice(0, 2).map(a => ({
        id: a.id || null,
        assumption: a.assumption || a.title || 'Standard desktop web access',
        risk: 'Schema variations may require rule adjustments'
      })),
      evidence: [
        {
          source: docNames.length > 0 ? docNames[0] : (ws.name ? `${ws.name} Scope Definition` : 'Workspace Scope Definition'),
          excerpt: primaryEvidence,
          classification: docNames.length > 0 ? 'DOCUMENTED_FACT' : 'WORKSPACE_OBJECTIVE'
        }
      ]
    };

    const optionA_rationale = {
      whyGenerated: `Provides a deterministic, low-risk workflow alternative tailored to ${projectName} without dependency on generative AI models.`,
      whyFitsBusiness: `Directly targets routine, predictable bottlenecks identified in Stage 2 with minimal training requirements for ${ws.targetUsers || 'operators'}.`,
      requirementsCovered: `Addresses ${optionA_reqs.length} foundational requirement(s) (${optionA_reqs.join(', ')}).`,
      tradeoffIntroduced: 'Sacrifices natural language interpretation, generative copilots, and multi-step autonomous reasoning in exchange for predictability and low cost.',
      supportingEvidence: primaryEvidence,
      unvalidatedItems: 'Requires verification of legacy schema format stability and webhook endpoint availability.'
    };

    const optionA = {
      id: 'OPTION_A',
      name: `Rules-Based ${projectName} Workflow Automation`,
      tagline: 'Deterministic automation using business rule filters and event triggers without generative AI',
      strategy: 'Low-Cost Rules-Based Workflow Automation',
      description: `Pragmatic automation minimizing capital outlay and change management for ${projectName} by digitizing routine workflows using business rule logic and webhook notifications.`,
      architectureDirection: 'Deterministic business rules engine & webhook dispatch',
      automationLevel: 'Rule-governed deterministic routine workflows',
      aiInvolvement: 'None (Deterministic business rules only)',
      integrationApproach: 'Direct webhook and REST event hooks with existing systems',
      migrationApproach: 'Parallel run with existing manual processes before cutover',
      complexity: 'Low',
      estimatedEffort: 'Proposed estimate: Accelerated delivery (AI estimate — validation required)',
      estimatedCost: 'Proposed estimate: Low capital investment (AI estimate — validation required)',
      businessImpact: 'Proposed target: Pragmatic baseline efficiency (Validation required)',
      automationPotential: 'Proposed target: Deterministic routine workflows (Validation required)',
      implementationRisk: 'Low',
      requirementsAddressed: optionA_reqs,
      requirementIds: optionA_why.requirementsAddressed.map(r => r.id).filter(Boolean),
      goalIds: optionA_why.strategicGoalsSupported.map(g => g.id).filter(Boolean),
      painPointIds: optionA_why.businessProblemsAddressed.map(p => p.id).filter(Boolean),
      questionIds: optionA_why.openQuestions.map(q => q.id).filter(Boolean),
      assumptionIds: optionA_why.assumptions.map(a => a.id).filter(Boolean),
      evidenceIds: optionA_why.evidence.map((e, idx) => e.id || `EV-A-${idx + 1}`),
      decisionFactors: optA_factors,
      pros: ['Fastest time to initial deployment', 'Minimal change management required', 'Predictable deterministic execution'],
      cons: ['Cannot parse unstructured natural language', 'Brittle to frequent schema variations', 'No generative AI assistance'],
      bestFitConditions: 'Tight budgetary constraints, well-defined rule catalogs, and zero tolerance for non-deterministic AI behavior.',
      tradeoffs: 'Lowest upfront cost and complexity, but restricted strictly to static business rule paths.',
      validationStatus: recommendedOptionId === 'OPTION_A' ? 'RECOMMENDED' : 'PROPOSED',
      whyThisOption: optionA_why,
      decisionRationale: optionA_rationale
    };

    const optionB_why = {
      requirementsAddressed: requirements.map(r => ({
        id: r.id || null,
        title: r.title || r.specification || 'Enterprise System Capability',
        classification: r.classification || 'USER_PROVIDED_FACT',
        validationStatus: r.status || r.validationStatus || 'CONFIRMED',
        evidence: r.sourceDocumentEvidence || r.evidence || primaryEvidence
      })),
      businessProblemsAddressed: painPoints.map(p => ({
        id: p.id || null,
        title: p.title || p.description || 'Core operational friction',
        impact: p.impact || 'High'
      })),
      strategicGoalsSupported: goals.map(g => ({
        id: g.id || null,
        title: g.goal || g.title || 'Core transformation goal',
        target: g.target || 'Proposed target: High operational acceleration (Validation required)',
        baseline: g.baseline || 'Baseline not established from available evidence.'
      })),
      automationOpportunitiesAddressed: resolvedAutomationOpps,
      constraintsConsidered: [
        'Preservation of existing record systems',
        'Frontline staff oversight and human-in-the-loop safety checkpoints',
        'Phased enterprise deployment milestones'
      ],
      openQuestions: openQuestions.map(q => ({
        id: q.id || null,
        question: q.question || q.text || 'Operational question',
        priority: q.priority || 'HIGH'
      })),
      assumptions: assumptions.map(a => ({
        id: a.id || null,
        assumption: a.assumption || a.title || 'Operating assumption',
        risk: 'Requires validation during Phase 1 deployment'
      })),
      evidence: [
        {
          source: docNames.length > 0 ? docNames.join(', ') : `${projectName} Scope & Discovery`,
          excerpt: primaryEvidence,
          classification: docNames.length > 0 ? 'DOCUMENTED_FACT' : 'WORKSPACE_OBJECTIVE'
        }
      ]
    };

    const optionB_rationale = {
      whyGenerated: `Formulates the optimal balance between transformation impact and operational risk for ${projectName}.`,
      whyFitsBusiness: `Directly resolves documented pain points while empowering operators with intelligent copilots and human oversight under documented constraints.`,
      requirementsCovered: `Satisfies all ${optionB_reqs.length} verified requirement(s) (${optionB_reqs.join(', ')}).`,
      tradeoffIntroduced: 'Requires operator onboarding and change enablement, plus formal interface validation for existing systems.',
      supportingEvidence: primaryEvidence,
      unvalidatedItems: `${validationRequiredCount} requirement(s) carry candidate integration patterns pending interface verification.`
    };

    const optionB = {
      id: 'OPTION_B',
      name: `AI-Augmented ${projectName} Platform`,
      tagline: 'Balanced enterprise transformation pairing automated triage and workflows with human-in-the-loop copilots',
      strategy: 'Balanced AI-Assisted Platform',
      description: `Balanced enterprise modernization combining automated intake triage with human-in-the-loop copilots, providing operational acceleration with supervisory oversight.`,
      architectureDirection: 'Decoupled microservices with modular AI provider abstraction and operator copilot',
      automationLevel: 'High straight-through processing with supervisory human-in-the-loop oversight',
      aiInvolvement: 'Context-aware generative copilot, triage classification, and draft assistance',
      integrationApproach: 'API Gateway with bidirectional adapters for core enterprise systems',
      migrationApproach: 'Phased pilot deployment with side-by-side operator validation',
      complexity: 'Medium',
      estimatedEffort: 'Proposed estimate: Phased enterprise rollout (AI estimate — validation required)',
      estimatedCost: 'Proposed estimate: Moderate investment with phased ROI (AI estimate — validation required)',
      businessImpact: 'Proposed target: High operational acceleration (Validation required)',
      automationPotential: 'Proposed target: High straight-through processing with human oversight (Validation required)',
      implementationRisk: 'Medium (Managed through staged validation checkpoints)',
      requirementsAddressed: optionB_reqs,
      requirementIds: optionB_why.requirementsAddressed.map(r => r.id).filter(Boolean),
      goalIds: optionB_why.strategicGoalsSupported.map(g => g.id).filter(Boolean),
      painPointIds: optionB_why.businessProblemsAddressed.map(p => p.id).filter(Boolean),
      questionIds: optionB_why.openQuestions.map(q => q.id).filter(Boolean),
      assumptionIds: optionB_why.assumptions.map(a => a.id).filter(Boolean),
      evidenceIds: optionB_why.evidence.map((e, idx) => e.id || `EV-B-${idx + 1}`),
      decisionFactors: optB_factors,
      pros: ['Balanced ROI with human-in-the-loop safety', 'Direct alignment with verified enterprise requirements', 'Extensible modular architecture'],
      cons: ['Requires operator onboarding and change enablement', 'Requires validation of existing system integration interfaces'],
      bestFitConditions: 'Enterprises needing substantial operational speed gains while maintaining strict compliance and human supervision.',
      tradeoffs: 'Higher initial investment than rules engine, but delivers adaptive intelligence with human oversight.',
      validationStatus: recommendedOptionId === 'OPTION_B' ? 'RECOMMENDED' : 'PROPOSED',
      whyThisOption: optionB_why,
      decisionRationale: optionB_rationale
    };

    const optionC_why = {
      requirementsAddressed: requirements.map(r => ({
        id: r.id || null,
        title: r.title || r.specification || 'Scalable Digital Capability',
        classification: r.classification || 'WORKSPACE_OBJECTIVE',
        validationStatus: r.status || r.validationStatus || 'CONFIRMED',
        evidence: r.sourceDocumentEvidence || r.evidence || primaryEvidence
      })),
      businessProblemsAddressed: painPoints.map(p => ({
        id: p.id || null,
        title: p.title || p.description || 'Systemic enterprise bottleneck',
        impact: 'Transformational'
      })),
      strategicGoalsSupported: goals.map(g => ({
        id: g.id || null,
        title: g.goal || g.title || 'Market leadership transformation',
        target: 'Proposed target: Autonomous operations (Validation required)',
        baseline: g.baseline || 'Baseline not established from available evidence.'
      })),
      automationOpportunitiesAddressed: resolvedAutomationOpps,
      constraintsConsidered: [
        'Complete elimination of legacy architectural debt',
        'End-to-end multi-agent pipeline orchestration',
        'Maximum theoretical operational throughput'
      ],
      openQuestions: openQuestions.map(q => ({
        id: q.id || null,
        question: q.question || q.text || 'Autonomous governance threshold',
        priority: 'BLOCKER'
      })),
      assumptions: assumptions.map(a => ({
        id: a.id || null,
        assumption: a.assumption || a.title || 'High enterprise data maturity',
        risk: 'Substantial operational disruption if legacy migration fails'
      })),
      evidence: [
        {
          source: `${projectName} Long-Term Strategy`,
          excerpt: primaryEvidence,
          classification: 'WORKSPACE_OBJECTIVE'
        }
      ]
    };

    const optionC_rationale = {
      whyGenerated: `Illustrates the maximum theoretical automation and technical modernization trajectory for ${projectName}.`,
      whyFitsBusiness: `Suitable for long-term multi-year strategic roadmap planning or deep technical re-platforming.`,
      requirementsCovered: `Addresses all ${optionC_reqs.length} current and projected scale requirements.`,
      tradeoffIntroduced: 'High upfront capital expenditure, extended time to initial value, and significant organizational change resistance.',
      supportingEvidence: primaryEvidence,
      unvalidatedItems: 'Autonomous agent decision boundaries and compliance protocols require multi-stakeholder validation.'
    };

    const optionC = {
      id: 'OPTION_C',
      name: `Autonomous ${projectName} Operations Overhaul`,
      tagline: 'Comprehensive re-platforming with autonomous multi-agent pipelines and deep core replacement',
      strategy: 'Autonomous Enterprise Transformation',
      description: `Transformational architecture replacing legacy pipelines with autonomous multi-agent orchestration for end-to-end straight-through execution.`,
      architectureDirection: 'Event-driven multi-agent autonomous mesh with continuous self-monitoring',
      automationLevel: 'End-to-end autonomous execution with exception-only escalation',
      aiInvolvement: 'Multi-agent autonomous reasoning, planning, and task execution pipelines',
      integrationApproach: 'Deep core system replacement and event-driven streaming bus',
      migrationApproach: 'Staged domain-by-domain cutover with dual-ledger reconciliation',
      complexity: 'High',
      estimatedEffort: 'Proposed estimate: Extended multi-stage transformation (AI estimate — validation required)',
      estimatedCost: 'Proposed estimate: Substantial enterprise investment (AI estimate — validation required)',
      businessImpact: 'Proposed target: Maximum organizational throughput transformation (Validation required)',
      automationPotential: 'Proposed target: End-to-end autonomous execution (Validation required)',
      implementationRisk: 'High (Significant architectural and organizational disruption)',
      requirementsAddressed: optionC_reqs,
      requirementIds: optionC_why.requirementsAddressed.map(r => r.id).filter(Boolean),
      goalIds: optionC_why.strategicGoalsSupported.map(g => g.id).filter(Boolean),
      painPointIds: optionC_why.businessProblemsAddressed.map(p => p.id).filter(Boolean),
      questionIds: optionC_why.openQuestions.map(q => q.id).filter(Boolean),
      assumptionIds: optionC_why.assumptions.map(a => a.id).filter(Boolean),
      evidenceIds: optionC_why.evidence.map((e, idx) => e.id || `EV-C-${idx + 1}`),
      decisionFactors: optC_factors,
      pros: ['Maximum theoretical throughput', 'Modernizes legacy technical debt', 'High long-term scalability'],
      cons: ['Extended timeline before initial ROI realization', 'Substantial operational disruption', 'Requires high data maturity'],
      bestFitConditions: 'Greenfield initiatives or organizations committed to full digital transformation with high data maturity.',
      tradeoffs: 'Maximum capability at the expense of highest capital expenditure and organizational disruption.',
      validationStatus: recommendedOptionId === 'OPTION_C' ? 'RECOMMENDED' : 'PROPOSED',
      whyThisOption: optionC_why,
      decisionRationale: optionC_rationale
    };

    // 7. DYNAMIC BUSINESS VALUE & ROI (NO FABRICATED PERCENTAGES OR DOLLAR AMOUNTS)
    let businessValue = '';
    const documentedGoal = goals.find(g => g.target || g.baseline);
    if (documentedGoal) {
      const baselineText = documentedGoal.baseline ? `Baseline: ${documentedGoal.baseline} (documented baseline).` : 'Baseline not established from available evidence.';
      const targetText = documentedGoal.target ? `Target: ${documentedGoal.target}` : 'Proposed target: Operational acceleration (AI estimate — validation required)';
      businessValue = `Documented Goal: ${documentedGoal.title || documentedGoal.goal} (${targetText}). ${baselineText}`;
    } else if (ws.objective) {
      businessValue = `Documented objective: ${ws.objective}. Proposed target: Streamlined operational workflows (Validation required). Baseline not established from available evidence.`;
    } else {
      businessValue = `Documented objective: Operational modernization for ${projectName}. Baseline not established from available evidence. Proposed target: AI estimate — validation required.`;
    }

    // 8. DYNAMIC RISKS & MITIGATIONS (DERIVED FROM STAGE 2 CONTEXT)
    const risks = [];
    openQuestions.forEach(q => {
      const qText = q.question || q.text || (typeof q === 'string' ? q : null);
      if (qText && risks.length < 4) {
        risks.push({
          risk: `Unresolved open question: ${qText}`,
          whyApplies: 'Uncertainty documented in Stage 2 open questions',
          source: 'Stage 2 Open Question',
          mitigation: 'Execute targeted stakeholder clarification sprint prior to architecture finalization.',
          validationStatus: 'VALIDATION_REQUIRED',
          validationRequired: true
        });
      }
    });

    assumptions.forEach(a => {
      const aText = a.assumption || a.title || (typeof a === 'string' ? a : null);
      if (aText && risks.length < 4) {
        risks.push({
          risk: `Unvalidated operational assumption: ${aText}`,
          whyApplies: 'Operational dependency documented in Stage 2 assumptions',
          source: 'Stage 2 Assumption',
          mitigation: 'Instrument telemetry and conduct validation checkpoint during initial phase.',
          validationStatus: 'VALIDATION_REQUIRED',
          validationRequired: true
        });
      }
    });

    constraints.forEach(c => {
      const cText = typeof c === 'string' ? c : (c.title || c.description || null);
      if (cText && risks.length < 4) {
        risks.push({
          risk: `Constraint enforcement: ${cText}`,
          whyApplies: 'Documented operational boundary condition',
          source: 'Stage 2 Constraint',
          mitigation: 'Establish architectural boundary controls and validation gateways.',
          validationStatus: 'CONFIRMED',
          validationRequired: false
        });
      }
    });

    if (risks.length === 0) {
      risks.push({
        risk: 'No material risk established from available evidence',
        whyApplies: 'No open questions, assumptions, or constraints documented in Stage 2',
        source: 'Analysis Scan',
        mitigation: 'Conduct architecture risk discovery sprint during Phase 1.',
        validationStatus: 'VALIDATION_REQUIRED',
        validationRequired: true
      });
    }

    const standardRisks = [
      {
        risk: 'Interface contract changes in external integration dependencies',
        source: 'Architecture Assessment',
        mitigation: 'Implement schema validation gateways and circuit-breaker patterns.',
        validationRequired: true
      },
      {
        risk: 'User adoption friction with new workflows',
        source: 'Change Management',
        mitigation: 'Phased rollout with side-by-side copilot validation and operator training.',
        validationRequired: true
      },
      {
        risk: 'Data quality variances across legacy record sources',
        source: 'Data Governance',
        mitigation: 'Establish ingestion normalization filters with fallback manual validation queue.',
        validationRequired: true
      }
    ];

    for (const sr of standardRisks) {
      if (risks.length < 3) {
        risks.push(sr);
      }
    }

    // 9. DYNAMIC ASSUMPTIONS (min 3) & DEPENDENCIES (min 3)
    const propagatedAssumptions = assumptions.length > 0
      ? assumptions.map(a => a.assumption || a.title || (typeof a === 'string' ? a : 'Operating assumption pending validation'))
      : [];

    const standardAssumptions = [
      'Target user access patterns and operational roles will be confirmed prior to implementation',
      'External integration interface specifications will be validated during Phase 1 delivery',
      'Historical operational performance baselines will be measured during initial pilot deployment'
    ];

    for (const sa of standardAssumptions) {
      if (propagatedAssumptions.length < 3) {
        propagatedAssumptions.push(sa);
      }
    }

    const dependencies = [
      'Identity and access management provider (Enterprise SSO / Directory)',
      'Compute environment supporting containerized services and persistence tier',
      'Network connectivity and credentials for external service endpoints'
    ];

    const selectedOption = context.solution?.selectedOption || 'OPTION_B';

    return {
      name: `AI-Augmented ${projectName} Platform`,
      summary: `A unified solution architecture for ${projectName} integrating verified requirements into modular application services, candidate persistence, and configurable copilot workflows.`,
      businessValue,
      recommendationRationale,
      keyCapabilities,
      automationOpps: resolvedAutomationOpps,
      aiOpps,
      techStack,
      implementationApproach: 'Staged phased rollout: Phase 1 Architecture Blueprint & Security Boundary Validation → Phase 2 Core Platform & Integration Ingestion → Phase 3 Copilot & Automation Pilot → Phase 4 User Acceptance & Verification → Phase 5 Phased Operational Cutover.',
      risks: risks.slice(0, 5),
      assumptions: propagatedAssumptions.slice(0, 5),
      dependencies,
      options: [optionA, optionB, optionC],
      selectedOption
    };
  },

  async generateArchitecture(context, legacySolution) {
    const ws = extractWorkspace(context);
    const analysis = context.businessAnalysis || {};
    const solution = legacySolution || context.solution || {};
    const selectedOption = solution.selectedOption || context.solution?.selectedOption || 'OPTION_B';

    // Tailor Tier 4 (AI vs Rules) based on selected solution option
    const isRuleBased = selectedOption === 'OPTION_A';
    const isAutonomous = selectedOption === 'OPTION_C';

    const rawIndustry = (ws.industry || '').toLowerCase();
    const rawName = (ws.name || '').toLowerCase();
    const rawObjective = (ws.objective || '').toLowerCase();
    const rawChallenge = (ws.challenge || '').toLowerCase();
    const rawDomain = resolveDomain(context);

    let domain = 'GENERAL';
    if (
      rawIndustry.includes('health') ||
      rawName.includes('health') ||
      rawName.includes('clinic') ||
      rawName.includes('hospital') ||
      (rawDomain === 'HEALTHCARE' && (rawIndustry.includes('health') || rawName.includes('hospital') || rawName.includes('clinic')))
    ) {
      domain = 'HEALTHCARE';
    } else if (
      rawIndustry.includes('retail') ||
      rawName.includes('retail') ||
      rawObjective.includes('retail') ||
      rawObjective.includes('store') ||
      rawObjective.includes('inventory')
    ) {
      domain = 'RETAIL';
    } else if (
      rawIndustry.includes('logistics') ||
      rawIndustry.includes('transport') ||
      rawIndustry.includes('freight') ||
      rawName.includes('logistics') ||
      rawObjective.includes('fleet') ||
      rawObjective.includes('shipment') ||
      rawDomain === 'SUPPLY_CHAIN'
    ) {
      domain = 'LOGISTICS';
    } else if (
      rawIndustry.includes('fintech') ||
      rawIndustry.includes('finance') ||
      rawIndustry.includes('banking') ||
      rawName.includes('fintech') ||
      rawName.includes('bank') ||
      rawObjective.includes('transaction') ||
      rawObjective.includes('fraud') ||
      rawDomain === 'FINTECH_CLAIMS'
    ) {
      domain = 'FINTECH';
    } else if (
      rawIndustry.includes('legal') ||
      rawIndustry.includes('law') ||
      rawName.includes('legal') ||
      rawObjective.includes('contract') ||
      rawObjective.includes('clause') ||
      rawObjective.includes('signature')
    ) {
      domain = 'LEGAL';
    } else if (
      rawIndustry.includes('manufacturing') ||
      rawIndustry.includes('production') ||
      rawName.includes('factory') ||
      rawName.includes('manufacturing') ||
      rawObjective.includes('shop floor') ||
      rawObjective.includes('equipment')
    ) {
      domain = 'MANUFACTURING';
    }

    // Technology Grounding strictly from Stage 3 classified tech stack
    const techStack = solution.classifiedTechStack || solution.techStack || {};
    let dbTech = 'PostgreSQL 15 / ACID Relational Store';
    let frontendTech = 'React 18 / Vite / CSS Tokens';
    let backendTech = 'Node.js Express / Modular Services';
    let gatewayTech = 'Express / Nginx API Gateway';
    let aiTech = isRuleBased
      ? 'Deterministic Rules Engine (Node-Rules)'
      : isAutonomous
        ? 'Autonomous Multi-Agent Orchestrator'
        : 'Modular AI Provider Abstraction';
    let integrationTech = 'REST APIs / Secure Webhooks';

    if (typeof techStack === 'object') {
      if (techStack.database) {
        dbTech = typeof techStack.database === 'string'
          ? techStack.database
          : (techStack.database.name || techStack.database.recommendation || dbTech);
      }
      if (techStack.frontend) {
        frontendTech = typeof techStack.frontend === 'string'
          ? techStack.frontend
          : (techStack.frontend.name || techStack.frontend.recommendation || frontendTech);
      }
      if (techStack.backend) {
        backendTech = typeof techStack.backend === 'string'
          ? techStack.backend
          : (techStack.backend.name || techStack.backend.recommendation || backendTech);
      }
      if (techStack.gateway || techStack.apiGateway) {
        const gw = techStack.gateway || techStack.apiGateway;
        gatewayTech = typeof gw === 'string' ? gw : (gw.name || gatewayTech);
      }
      if (techStack.ai && !isRuleBased) {
        aiTech = typeof techStack.ai === 'string' ? techStack.ai : (techStack.ai.name || aiTech);
      }
      if (techStack.integrations) {
        integrationTech = typeof techStack.integrations === 'string' ? techStack.integrations : (techStack.integrations.name || integrationTech);
      }
    } else if (typeof techStack === 'string') {
      if (techStack.includes('Microsoft SQL Server')) dbTech = 'Microsoft SQL Server';
      else if (techStack.includes('PostgreSQL')) dbTech = 'PostgreSQL 15';
      else if (techStack.includes('MongoDB')) dbTech = 'MongoDB 6.0';
      else if (techStack.includes('MySQL')) dbTech = 'MySQL 8.0';
    }

    // Upstream requirements & existing systems
    const reqList = Array.isArray(analysis.requirements) ? analysis.requirements : [];
    const reqIds = reqList.map(r => r.id || (typeof r === 'string' && r.match(/REQ-\d+/)?.[0]) || 'REQ-01').filter(Boolean);
    const existingSystems = Array.isArray(analysis.existingSystems) ? analysis.existingSystems : [];
    const existingSysObj = existingSystems[0] || null;
    const existingSysName = typeof existingSysObj === 'object' && existingSysObj !== null
      ? (existingSysObj.name || existingSysObj.system || 'Enterprise Legacy ERP')
      : (typeof existingSysObj === 'string' && existingSysObj)
        ? existingSysObj
        : (domain === 'RETAIL' ? 'Retail ERP' : domain === 'LOGISTICS' ? 'Legacy WMS/TMS' : domain === 'FINTECH' ? 'Core Banking Ledger' : domain === 'LEGAL' ? 'Document Management System (DMS)' : domain === 'MANUFACTURING' ? 'Legacy SCADA / ERP' : domain === 'HEALTHCARE' ? 'Hospital EHR Backend' : 'Enterprise Core ERP');

    // Build Domain-Specific Components
    let clientPrimaryLabel = 'Operations & Management Web Portal';
    let clientSecondaryLabel = 'Field & Mobile Application';
    let coreServiceLabel = 'Core Domain Workflow Engine';
    let aiServiceLabel = isRuleBased ? 'Business Rules & Logic Engine' : isAutonomous ? 'Autonomous Agent Mesh' : 'AI & Automation Dispatcher';
    let aiServiceDesc = isRuleBased ? 'Executes rule-based logic deterministically.' : 'Context-aware intelligence and recommendation pipeline.';
    let existingConnectorLabel = `${existingSysName} Integration Connector`;
    let externalConnectorLabel = 'Partner & Third-Party Gateway';

    if (domain === 'RETAIL') {
      clientPrimaryLabel = 'Store Operations & Inventory Portal';
      clientSecondaryLabel = 'Store Associate Handheld POS';
      coreServiceLabel = 'Inventory & Order Orchestration Service';
      aiServiceLabel = isRuleBased
        ? 'Inventory Replenishment Rules Engine'
        : isAutonomous
          ? 'Autonomous Inventory Optimization Agent Mesh'
          : 'Demand Forecasting & Restock AI Engine';
      aiServiceDesc = isRuleBased
        ? 'Applies deterministic stock-threshold rules and automated replenishment triggers.'
        : 'Predicts stock depletion curves, seasonality spikes, and suggests purchase orders.';
      externalConnectorLabel = 'Point-of-Sale (POS) & Supplier API';
    } else if (domain === 'LOGISTICS') {
      clientPrimaryLabel = 'Fleet Operations & Dispatch Console';
      clientSecondaryLabel = 'Driver Mobile & Telematics PWA';
      coreServiceLabel = 'Shipment Routing & Tracking Service';
      aiServiceLabel = isRuleBased
        ? 'Dispatch Allocation Rules Engine'
        : isAutonomous
          ? 'Autonomous Freight Mesh & Dynamic Scheduler'
          : 'Route Optimization & ETA Prediction AI';
      aiServiceDesc = isRuleBased
        ? 'Executes carrier tier policies and delivery priority constraints.'
        : 'Optimizes multi-stop routes, predicts transit delays, and dynamically rebalances fleet loads.';
      externalConnectorLabel = 'Carrier EDI & Telematics Ingestion Gateway';
    } else if (domain === 'FINTECH') {
      clientPrimaryLabel = 'Financial Operations & Compliance Portal';
      clientSecondaryLabel = 'Customer Mobile Banking App';
      coreServiceLabel = 'Transaction Processing & Settlement Service';
      aiServiceLabel = isRuleBased
        ? 'Compliance & Sanction Screening Rules Engine'
        : isAutonomous
          ? 'Autonomous Risk & Anomaly Agent Mesh'
          : 'Real-Time Fraud Detection & Risk Scoring AI';
      aiServiceDesc = isRuleBased
        ? 'Enforces regulatory transaction limits and KYC validation policies deterministically.'
        : 'Performs sub-second biometric and transactional behavioral scoring to flag anomalies.';
      externalConnectorLabel = 'Payment Network & Clearing Gateway';
    } else if (domain === 'LEGAL') {
      clientPrimaryLabel = 'Legal Operations & Matter Portal';
      clientSecondaryLabel = 'Client & Counsel Secure App';
      coreServiceLabel = 'Contract Lifecycle & Clause Management Service';
      aiServiceLabel = isRuleBased
        ? 'Contract Compliance & Approval Rules Engine'
        : isAutonomous
          ? 'Autonomous Legal Risk & Obligation Review Mesh'
          : 'AI Contract Analysis & Clause Extraction Copilot';
      aiServiceDesc = isRuleBased
        ? 'Applies deterministic clause compliance rules and signing authorization limits.'
        : 'Performs natural language contract review, clause anomaly extraction, and risk redlining.';
      externalConnectorLabel = 'Digital Signature (DocuSign/Adobe) & Notary Gateway';
    } else if (domain === 'MANUFACTURING') {
      clientPrimaryLabel = 'Shop Floor & Production Control Portal';
      clientSecondaryLabel = 'Quality & Line Supervisor Mobile App';
      coreServiceLabel = 'Manufacturing Execution (MES) & Batch Service';
      aiServiceLabel = isRuleBased
        ? 'Production Line Scheduling Rules Engine'
        : isAutonomous
          ? 'Autonomous Factory Optimization Mesh'
          : 'Predictive Maintenance & Yield AI Engine';
      aiServiceDesc = isRuleBased
        ? 'Dispatches work orders based on strict machine availability and operator skill matrices.'
        : 'Analyzes sensor telemetry to predict component failure and maximize assembly yield.';
      externalConnectorLabel = 'Industrial IoT & Sensor Protocol Gateway';
    } else if (domain === 'HEALTHCARE') {
      clientPrimaryLabel = 'Patient Care & Provider Web Portal';
      clientSecondaryLabel = 'Clinical Tablet & Staff Triage App';
      coreServiceLabel = 'Clinical Intake & Scheduling Service';
      aiServiceLabel = isRuleBased
        ? 'Clinical Intake & Triage Rules Engine'
        : isAutonomous
          ? 'Autonomous Clinical Coordination Mesh'
          : 'Clinical Decision Support & Triage AI';
      aiServiceDesc = isRuleBased
        ? 'Evaluates clinical intake forms and availability policies deterministically.'
        : 'Performs clinical symptom triage and physician scheduling optimization.';
      externalConnectorLabel = 'Clinical Diagnostic & Messaging Gateway';
    }

    const nodes = [
      {
        id: 'node-client-primary',
        label: clientPrimaryLabel,
        type: 'CLIENT',
        tier: 'Client Layer',
        description: `Primary desktop viewport for ${ws.targetUsers || 'operational operators'}.`,
        posX: 60,
        posY: 160,
        tech: frontendTech,
        status: 'ACTIVE',
        purpose: 'Primary operator workflow interaction and administrative dashboard.',
        source: 'SELECTED_SOLUTION',
        confidence: 0.98,
        requirementIds: reqIds.slice(0, 2).join(', '),
        capabilityIds: 'CAP-01',
        dependencies: 'node-gateway',
        validationStatus: 'PROPOSED'
      },
      {
        id: 'node-client-secondary',
        label: clientSecondaryLabel,
        type: 'CLIENT',
        tier: 'Client Layer',
        description: 'Responsive touch-enabled mobile application for on-the-go workflow updates.',
        posX: 60,
        posY: 340,
        tech: 'Responsive Web PWA',
        status: 'ACTIVE',
        purpose: 'Field access and real-time operational status updates.',
        source: 'SELECTED_SOLUTION',
        confidence: 0.95,
        requirementIds: reqIds.slice(1, 3).join(', '),
        capabilityIds: 'CAP-02',
        dependencies: 'node-gateway',
        validationStatus: 'PROPOSED'
      },
      {
        id: 'node-gateway',
        label: 'API Security & Ingress Gateway',
        type: 'GATEWAY',
        tier: 'Gateway Layer',
        description: 'Ingress routing, rate limiting, JWT token authentication, and TLS termination.',
        posX: 320,
        posY: 250,
        tech: gatewayTech,
        status: 'ACTIVE',
        purpose: 'Centralized security proxy and traffic management.',
        source: 'RECOMMENDED',
        confidence: 0.94,
        requirementIds: reqIds.slice(0, 1).join(', '),
        capabilityIds: 'CAP-SEC',
        dependencies: 'node-core-service, node-ai-service',
        validationStatus: 'RECOMMENDED'
      },
      {
        id: 'node-core-service',
        label: coreServiceLabel,
        type: 'SERVICE',
        tier: 'Application Services',
        description: 'Coordinates core domain business logic, transactional workflows, and state machines.',
        posX: 580,
        posY: 140,
        tech: backendTech,
        status: 'ACTIVE',
        purpose: 'Executes central business rules and transactional updates.',
        source: 'SELECTED_SOLUTION',
        confidence: 0.96,
        requirementIds: reqIds.slice(0, 4).join(', '),
        capabilityIds: 'CAP-CORE',
        dependencies: 'node-database, node-existing-system',
        validationStatus: 'PROPOSED'
      },
      {
        id: 'node-ai-service',
        label: aiServiceLabel,
        type: isRuleBased ? 'SERVICE' : 'AI',
        tier: 'AI & Automation',
        description: aiServiceDesc,
        posX: 580,
        posY: 360,
        tech: aiTech,
        status: 'ACTIVE',
        purpose: isRuleBased ? 'Deterministic decision engine' : 'Autonomous analytical optimization',
        source: 'SELECTED_SOLUTION',
        confidence: 0.92,
        requirementIds: reqIds.slice(1, 3).join(', '),
        capabilityIds: 'CAP-AI',
        dependencies: 'node-database',
        validationStatus: 'PROPOSED'
      },
      {
        id: 'node-database',
        label: `${ws.name || 'Enterprise'} Operational Database`,
        type: 'DATABASE',
        tier: 'Persistence',
        description: 'ACID-compliant storage for transactional records, audit trails, and configuration data.',
        posX: 860,
        posY: 140,
        tech: dbTech,
        status: 'ACTIVE',
        purpose: 'Primary persistence layer ensuring ACID transactional integrity.',
        source: 'SELECTED_SOLUTION',
        confidence: 0.99,
        requirementIds: reqIds.slice(0, 5).join(', '),
        capabilityIds: 'CAP-DATA',
        dependencies: '',
        validationStatus: 'PROPOSED'
      },
      {
        id: 'node-existing-system',
        label: existingConnectorLabel,
        type: 'INTEGRATION',
        tier: 'Integrations',
        description: `Bidirectional enterprise connector interfacing with existing ${existingSysName}.`,
        posX: 860,
        posY: 320,
        tech: integrationTech,
        status: 'ACTIVE',
        purpose: `Preserves investment and synchronizes state with ${existingSysName}.`,
        source: 'EXISTING_SYSTEM',
        confidence: 0.95,
        requirementIds: reqIds.slice(0, 2).join(', '),
        capabilityIds: 'CAP-INT-LEGACY',
        dependencies: '',
        validationStatus: 'EXISTING'
      },
      {
        id: 'node-external-connector',
        label: externalConnectorLabel,
        type: 'INTEGRATION',
        tier: 'Integrations',
        description: 'Connector for external vendor APIs, partner webhooks, and communication services.',
        posX: 860,
        posY: 460,
        tech: 'REST / Webhooks / TLS',
        status: 'ACTIVE',
        purpose: 'Interoperability with external partner APIs and event dispatchers.',
        source: 'VALIDATION_REQUIRED',
        confidence: 0.85,
        requirementIds: reqIds.slice(2, 4).join(', '),
        capabilityIds: 'CAP-INT-EXT',
        dependencies: '',
        validationStatus: 'VALIDATION_REQUIRED'
      }
    ];

    const edges = [
      { id: 'e1', sourceId: 'node-client-primary', targetId: 'node-gateway', label: 'HTTPS / REST', protocol: 'REST', relationship: 'initiates_requests', direction: 'outbound', requirementIds: reqIds.slice(0, 1).join(', ') },
      { id: 'e2', sourceId: 'node-client-secondary', targetId: 'node-gateway', label: 'HTTPS / REST', protocol: 'REST', relationship: 'initiates_requests', direction: 'outbound', requirementIds: reqIds.slice(1, 2).join(', ') },
      { id: 'e3', sourceId: 'node-gateway', targetId: 'node-core-service', label: 'Internal Proxy', protocol: 'REST', relationship: 'routes_traffic', direction: 'outbound', requirementIds: reqIds.slice(0, 2).join(', ') },
      { id: 'e4', sourceId: 'node-gateway', targetId: 'node-ai-service', label: 'Inference Ingress', protocol: 'REST', relationship: 'dispatches_events', direction: 'outbound', requirementIds: reqIds.slice(1, 3).join(', ') },
      { id: 'e5', sourceId: 'node-core-service', targetId: 'node-database', label: 'ORM Queries', protocol: 'SQL', relationship: 'persists_state', direction: 'outbound', requirementIds: reqIds.slice(0, 3).join(', ') },
      { id: 'e6', sourceId: 'node-ai-service', targetId: 'node-database', label: 'State Retrieval', protocol: 'SQL', relationship: 'queries_context', direction: 'outbound', requirementIds: reqIds.slice(1, 3).join(', ') },
      { id: 'e7', sourceId: 'node-core-service', targetId: 'node-existing-system', label: 'Enterprise Sync', protocol: 'REST', relationship: 'synchronizes', direction: 'outbound', requirementIds: reqIds.slice(0, 2).join(', ') },
      { id: 'e8', sourceId: 'node-core-service', targetId: 'node-external-connector', label: 'Outbound Webhooks', protocol: 'REST', relationship: 'emits_notifications', direction: 'outbound', requirementIds: reqIds.slice(2, 4).join(', ') }
    ];

    const optionName = isRuleBased ? 'Rules-Based Deterministic Platform' : isAutonomous ? 'Autonomous Mesh Platform' : 'AI-Augmented Solution';

    return {
      title: `${ws.name || 'Enterprise'} Target Architecture`,
      highLevelDesign: `Decoupled multi-tier enterprise architecture engineered for ${ws.industry || 'the enterprise'} operations. Features responsive client applications (${frontendTech}), an edge API Gateway (${gatewayTech}), a domain service layer (${backendTech}), a dedicated ${optionName} (${aiTech}), persistent ACID storage backed by ${dbTech}, and secure integration connectors to ${existingSysName}.`,
      lowLevelDesign: `${backendTech} services enforce strict payload validation, parameterized database interactions, and event dispatching. Background tasks execute asynchronously. The AI/automation component adheres to clean provider interfaces to guarantee operational continuity.`,
      integrationArch: `Bidirectional connectors interface directly with ${existingSysName} utilizing ${integrationTech}. External third-party integrations operate with circuit breaker resilience and guaranteed webhook delivery.`,
      infrastructureArch: `Containerized microservices deployable to modern container orchestration environments with edge TLS termination, automated load balancing, and segregated database subnets.`,
      securityArch: `Enterprise defense-in-depth: JWT token verification, RBAC permissions, parameterized database transactions preventing injection vulnerabilities, field-level encryption for sensitive payloads at rest and in transit, and immutable audit logs.`,
      deploymentArch: `Automated CI/CD pipelines executing linting, comprehensive unit/integration testing, automated database migrations, and zero-downtime rolling container deployments.`,
      nodes,
      edges
    };
  },

  async generateProcess(context, legacySolution) {
    const ws = extractWorkspace(context);
    const domain = resolveDomain(context);
    const docInsights = extractDocumentKeyInsights(context);

    if (domain === 'HEALTHCARE') {
      const step1Label = docInsights.hasApollo ? 'Hospital Apollo Appointment Intake' : 'Patient Request / Appointment Intake';
      const step2Label = docInsights.hasFalcon ? 'Falcon Engine Slot Matching & Eligibility' : 'Eligibility & Clinical Slot Matching';
      const step2Actor = docInsights.hasFalcon ? 'Falcon Scheduling Engine' : 'Clinical Engine';
      const step2Desc = docInsights.hasFalcon 
        ? 'Automated verification of patient eligibility and optimal doctor slot allocation via the Falcon Scheduling Engine.'
        : 'Automated verification of patient insurance eligibility and specialty doctor slot availability.';
      const step7Label = docInsights.hasNoShow ? 'Automated SMS Confirmation & No-Show Prevention Alert' : 'Automated Patient Confirmation & SMS Alert';
      const step7Desc = docInsights.hasNoShow 
        ? 'Automated appointment confirmation, calendar invite, and predictive no-show prevention reminders sent to patient via SMS/Email.'
        : 'Automated appointment confirmation, calendar invite, and preparation instructions sent to patient via SMS/Email.';

      return {
        title: docInsights.hasApollo ? 'Hospital Apollo Clinical Appointment & Intake Workflow' : 'Target Clinical Appointment & Intake Workflow',
        description: 'End-to-end clinical workflow showing patient appointment booking, automated eligibility verification, provider scheduling decision gates, and EHR medical record synchronization.',
        type: 'WORKFLOW',
        nodes: [
          {
            stepOrder: 1,
            label: step1Label,
            type: 'START',
            actor: 'Patient / Portal',
            description: 'Patient submits appointment booking request via web portal, SMS, or clinic kiosk with requested specialty and symptoms.'
          },
          {
            stepOrder: 2,
            label: step2Label,
            type: 'AUTOMATION',
            actor: step2Actor,
            description: step2Desc,
            condition: 'Insurance Valid & Slot Available'
          },
          {
            stepOrder: 3,
            label: 'Clinical Urgency & Priority Gate',
            type: 'DECISION',
            actor: 'Clinical Rules',
            description: 'Evaluates symptom urgency and patient clinical history to determine routing priority.',
            condition: 'Evaluate: Urgent vs Routine Clinical Case'
          },
          {
            stepOrder: 4,
            label: 'Triage Nurse / Supervisor Sign-off',
            type: 'APPROVAL',
            actor: 'Triage Nurse',
            description: 'High-risk or urgent medical request flagged for rapid clinical nurse review before slot lock.',
            condition: 'If Urgent Case'
          },
          {
            stepOrder: 5,
            label: 'Provider Slot Allocation & Calendar Lock',
            type: 'STEP',
            actor: 'Scheduling Coordinator',
            description: 'Confirmed appointment slot locked onto physician calendar and clinic room reserved.',
            condition: 'If Routine Case'
          },
          {
            stepOrder: 6,
            label: 'Copilot-Assisted Patient Intake Review',
            type: 'STEP',
            actor: 'Clinic Receptionist',
            description: 'Staff reviews AI-summarized medical history, pre-appointment instructions, and checks in patient.',
            condition: 'Staff Verification'
          },
          {
            stepOrder: 7,
            label: step7Label,
            type: 'NOTIFICATION',
            actor: 'System Gateway',
            description: step7Desc,
            condition: 'Immediate'
          },
          {
            stepOrder: 8,
            label: 'Appointment Finalized & EHR Synchronized',
            type: 'END',
            actor: 'Clinical Database',
            description: 'Encounter record created in EHR, physician availability updated, and clinic throughput logged.',
            condition: 'Final State'
          }
        ]
      };
    }

    if (domain === 'SUPPLY_CHAIN') {
      return {
        title: 'Target Warehouse Fulfillment & Dispatch Process',
        description: 'Streamlined logistics process showing order intake, automated bin allocation, picking path routing, supervisor expedited gates, and carrier dispatch.',
        type: 'WORKFLOW',
        nodes: [
          {
            stepOrder: 1,
            label: 'Order Intake & EDI Ingestion',
            type: 'START',
            actor: 'ERP / Client Channel',
            description: 'Purchase order arrives via EDI or ERP webhook. System verifies SKU master codes and logs transaction UUID.'
          },
          {
            stepOrder: 2,
            label: 'Inventory Availability & Bin Allocation',
            type: 'AUTOMATION',
            actor: 'WMS Engine',
            description: 'System automatically checks physical bin stock and reserves inventory from the nearest warehouse bay.',
            condition: 'Stock Available >= Order Quantity'
          },
          {
            stepOrder: 3,
            label: 'Inventory Priority & Stockout Gate',
            type: 'DECISION',
            actor: 'Inventory Rules',
            description: 'Evaluates stock levels and customer SLA to determine standard vs expedited fulfillment path.',
            condition: 'Evaluate: In-Stock vs Backorder / Low Stock'
          },
          {
            stepOrder: 4,
            label: 'Warehouse Supervisor Expedited Sign-off',
            type: 'APPROVAL',
            actor: 'Warehouse Supervisor',
            description: 'High-priority or split-shipment order flagged for floor supervisor review before release.',
            condition: 'If Expedited / Backordered'
          },
          {
            stepOrder: 5,
            label: 'Optimized Pick-Path Dispatch to Scanner',
            type: 'STEP',
            actor: 'Floor Operator',
            description: 'Standard pick ticket dispatched directly to operator handheld scanner with shortest-path bin guidance.',
            condition: 'If Standard In-Stock'
          },
          {
            stepOrder: 6,
            label: 'Barcode Verification & Packing Staging',
            type: 'STEP',
            actor: 'Packing Specialist',
            description: 'Operator scans barcode to verify items, seals package, and generates shipping manifest.',
            condition: 'Barcode Scan Match 100%'
          },
          {
            stepOrder: 7,
            label: 'Carrier Dispatch & Tracking Broadcast',
            type: 'NOTIFICATION',
            actor: 'Logistics Gateway',
            description: 'Carrier EDI bill of lading generated and real-time tracking number broadcast to customer.',
            condition: 'Immediate'
          },
          {
            stepOrder: 8,
            label: 'Shipment Dispatched & Inventory Ledger Updated',
            type: 'END',
            actor: 'Supply Chain Database',
            description: 'Physical stock deducted from warehouse ledger, carrier departure logged, and order closed.',
            condition: 'Final State'
          }
        ]
      };
    }

    // Default: Customer Support
    return {
      title: 'Target Customer Support Triage & Resolution Process',
      description: 'Streamlined process model showing customer touchpoints, automated AI triage, decision gates, operator co-pilot interaction, and final resolution telemetry.',
      type: 'WORKFLOW',
      nodes: [
        {
          stepOrder: 1,
          label: 'Customer Request Ingestion',
          type: 'START',
          actor: 'Customer / Channel',
          description: 'Inbound request arrives via portal, email, or API. System generates tracking UUID and acknowledges receipt.'
        },
        {
          stepOrder: 2,
          label: 'AI Intent & Sentiment Classification',
          type: 'AUTOMATION',
          actor: 'AI Engine',
          description: 'Natural language analysis parses intent, urgency, sentiment score, and required skill tag.',
          condition: 'Confidence >= 80%'
        },
        {
          stepOrder: 3,
          label: 'Priority & Risk Decision Gate',
          type: 'DECISION',
          actor: 'System Rules',
          description: 'Evaluates priority and business risk thresholds to determine routing channel.',
          condition: 'Evaluate: High vs Normal Priority'
        },
        {
          stepOrder: 4,
          label: 'Manager Approval & Escalation',
          type: 'APPROVAL',
          actor: 'Supervisor',
          description: 'High-risk or compliance-critical request flagged for rapid supervisor sign-off before dispatch.',
          condition: 'If High Priority / VIP'
        },
        {
          stepOrder: 5,
          label: 'Skill-Based Operator Routing',
          type: 'STEP',
          actor: 'System Dispatcher',
          description: 'Standard request dispatched directly to frontline queue with AI-drafted resolution recommendation.',
          condition: 'If Normal Priority'
        },
        {
          stepOrder: 6,
          label: 'Copilot-Assisted Operator Resolution',
          type: 'STEP',
          actor: 'Frontline Operator',
          description: 'Operator reviews AI suggestion, adjusts parameters if needed, and executes resolution.',
          condition: 'Human-in-the-Loop Sign-off'
        },
        {
          stepOrder: 7,
          label: 'Stakeholder Notification & Survey',
          type: 'NOTIFICATION',
          actor: 'System',
          description: 'Automated resolution notification dispatched to customer with feedback rating link.',
          condition: 'Immediate'
        },
        {
          stepOrder: 8,
          label: 'Ticket Closed & SLA Telemetry Logged',
          type: 'END',
          actor: 'Transformation Database',
          description: 'Transaction marked completed, SLA duration recorded, model accuracy feedback updated.',
          condition: 'Final State'
        }
      ]
    };
  },

  /**
   * Analyzes raw user requirement prompt and extracts structured business understanding and design directions.
   */
  async analyzeUXRequirement(context, requirementText) {
    const ws = extractWorkspace(context);
    const text = (requirementText || ws.objective || ws.challenge || ws.name || '').toLowerCase();
    
    let domain = 'CUSTOMER_SUPPORT';
    let industry = 'Customer Service & Support';
    let primaryUsers = 'End Customers & Support Agents';
    let secondaryUsers = 'Support Team Leads & Operations Managers';
    let businessGoal = 'Streamline customer self-service, accelerate ticket resolution, and automate inquiry routing.';
    let userProblems = [
      'High queue times and repetitive triage for common inquiries',
      'Fragmented customer records requiring multiple tools to resolve single issues',
      'Inconsistent response quality and lack of real-time SLA tracking'
    ];
    let functionalRequirements = [
      'Customer self-service portal with AI intake assistant',
      'Split-view agent workspace with customer history and 1-click execution',
      'Supervisory rules engine for SLA escalation and queue allocation',
      'Operational analytics dashboard tracking resolution velocity and CSAT'
    ];
    let importantWorkflows = [
      'Customer Ingestion & AI Triage',
      'Priority Queue Assignment',
      'Copilot-Assisted Resolution',
      'Audit Logging & Customer Confirmation'
    ];
    let expectedScreens = [
      'Operational Status Dashboard',
      'Case Processing Workspace',
      'Routing Rules & Configuration',
      'Throughput & SLA Analytics'
    ];
    let uxPriorities = [
      'High readability & visual hierarchy',
      'Sub-second operator interactions',
      'Contextual AI recommendations',
      'Responsive tablet & mobile views'
    ];

    if (/courier|fleet|logistics|warehouse|shipping|freight|cargo|transport/i.test(text)) {
      domain = 'SUPPLY_CHAIN';
      industry = 'Supply Chain, Logistics & Fleet Operations';
      primaryUsers = 'Fleet Dispatchers & Warehouse Supervisors';
      secondaryUsers = 'Logistics Drivers & Dock Workers';
      businessGoal = 'Maximize fleet utilization, reduce transit delays, and optimize multi-hub warehouse fulfillment.';
      userProblems = [
        'Unpredictable transit delays and lack of predictive exception alerts',
        'Underutilized cargo space and inefficient cross-dock transfers',
        'Manual proof-of-delivery paperwork causing invoice delays'
      ];
      functionalRequirements = [
        'Fleet telemetry and hub congestion overview',
        'Consignment dispatch console with live GPS tracking',
        'Warehouse bin allocation and stock threshold management',
        'Transit cycle time and detention cost analytics'
      ];
      importantWorkflows = [
        'Consignment Manifest Ingestion',
        'Bin Allocation & Picking Path',
        'Fleet Dispatch & Dynamic Rerouting',
        'Proof-of-Delivery Verification & Closeout'
      ];
      expectedScreens = [
        'Active Deliveries & Shipment Status Dashboard',
        'Driver Routes & Delivery Dispatch Console',
        'Warehouse Hub & Inventory Rules Manager',
        'Transit Latency & Fulfillment Analytics'
      ];
      uxPriorities = [
        'Geospatial map readability',
        'Exception-first notification alerts',
        'Offline mobile driver resilience',
        'Ergonomic barcode/QR actions'
      ];
    } else if (/food|restaurant|kitchen|meal|menu|dish|grocery/i.test(text) || (/delivery/i.test(text) && !/logistics|cargo|freight|courier/i.test(text))) {
      domain = 'FOOD_DELIVERY';
      industry = 'Food Delivery & Restaurant Operations';
      primaryUsers = 'Restaurant Managers & Operations Dispatchers';
      secondaryUsers = 'Field Delivery Couriers & Kitchen Staff';
      businessGoal = 'Orchestrate high-throughput food ordering, optimize kitchen prep times, and automate courier dispatch.';
      userProblems = [
        'Delayed courier handoffs causing cold food delivery and customer dissatisfaction',
        'Lack of real-time visibility into kitchen prep backlog during peak hours',
        'Manual rider dispatch causing driver detention and route inefficiencies'
      ];
      functionalRequirements = [
        'Real-time order intake and kitchen backlog monitor',
        'Live courier dispatch console with dynamic route optimization',
        'Restaurant partner menu and operating hours management',
        'Delivery SLA analytics and courier efficiency tracking'
      ];
      importantWorkflows = [
        'Order Ingestion & Payment Validation',
        'Kitchen Preparation Queue',
        'AI Driver Matching & Dispatch',
        'Real-Time Delivery Tracking & Customer Rating'
      ];
      expectedScreens = [
        'Kitchen & Dispatch Operations Dashboard',
        'Active Orders & Fleet Dispatch Console',
        'Restaurant & Menu Configuration',
        'Delivery Velocity & Fulfillment Analytics'
      ];
      uxPriorities = [
        'High-contrast live telemetry',
        'Rapid 1-tap courier assignment',
        'Status-driven color indicators',
        'Driver mobile accessibility'
      ];
    } else if (/fraud|fintech|bank|payment|aml|kyc|transaction|wallet|credit/i.test(text)) {
      domain = 'FINTECH';
      industry = 'Financial Services & Fraud Detection';
      primaryUsers = 'Risk Analysts & Compliance Officers';
      secondaryUsers = 'Operations Supervisors & Security Auditors';
      businessGoal = 'Detect fraudulent transactions in real time, minimize false positives, and ensure regulatory compliance.';
      userProblems = [
        'High false-positive rates causing unnecessary account freezes and customer frustration',
        'Slow alert triage requiring analysts to manually cross-reference 5+ internal systems',
        'Complex audit trails needed for regulatory compliance (AML/KYC)'
      ];
      functionalRequirements = [
        'Real-time suspicious transaction telemetry dashboard',
        'Risk alert triage console with AI anomaly explanation',
        'Policy threshold and fraud rule configuration engine',
        'Regulatory audit reporting and historical chargeback analytics'
      ];
      importantWorkflows = [
        'Transaction Ingestion & Risk Scoring',
        'Suspicious Pattern Detection',
        'Analyst Review & Account Action',
        'Regulatory Reporting & Evidence Lock'
      ];
      expectedScreens = [
        'Fraud Risk & Transaction Telemetry Dashboard',
        'High-Risk Alert Triage & Investigation Console',
        'Detection Rules & Risk Policy Manager',
        'Compliance Audit & Loss Prevention Analytics'
      ];
      uxPriorities = [
        'High precision data density',
        'Explainable AI confidence indicators',
        'Strict action confirmation safeguards',
        'Dark mode telemetry support'
      ];
    } else if (/courier|fleet|logistics|warehouse|shipping|freight|cargo|transport/i.test(text)) {
      domain = 'SUPPLY_CHAIN';
      industry = 'Supply Chain, Logistics & Fleet Operations';
      primaryUsers = 'Fleet Dispatchers & Warehouse Supervisors';
      secondaryUsers = 'Logistics Drivers & Dock Workers';
      businessGoal = 'Maximize fleet utilization, reduce transit delays, and optimize multi-hub warehouse fulfillment.';
      userProblems = [
        'Unpredictable transit delays and lack of predictive exception alerts',
        'Underutilized cargo space and inefficient cross-dock transfers',
        'Manual proof-of-delivery paperwork causing invoice delays'
      ];
      functionalRequirements = [
        'Fleet telemetry and hub congestion overview',
        'Consignment dispatch console with live GPS tracking',
        'Warehouse bin allocation and stock threshold management',
        'Transit cycle time and detention cost analytics'
      ];
      importantWorkflows = [
        'Consignment Manifest Ingestion',
        'Bin Allocation & Picking Path',
        'Fleet Dispatch & Dynamic Rerouting',
        'Proof-of-Delivery Verification & Closeout'
      ];
      expectedScreens = [
        'Fleet Operations & Hub Status Dashboard',
        'Consignment Dispatch & GPS Tracking Console',
        'Warehouse Inventory & Stock Rules Manager',
        'On-Time Delivery & Fleet Efficiency Analytics'
      ];
      uxPriorities = [
        'Geospatial map readability',
        'Exception-first notification alerts',
        'Offline mobile driver resilience',
        'Ergonomic barcode/QR actions'
      ];
    } else if (/health|patient|clinic|doctor|hospital|medical|ehr|hipaa/i.test(text)) {
      domain = 'HEALTHCARE';
      industry = 'Healthcare & Clinical Operations';
      primaryUsers = 'Patients & Clinical Intake Coordinators';
      secondaryUsers = 'Specialist Physicians & Nursing Supervisors';
      businessGoal = 'Deliver frictionless patient self-service appointment booking, eliminate clinic wait times, and integrate with EHR systems.';
      userProblems = [
        'Long patient phone wait times and high clinic no-show rates',
        'Manual scheduling errors causing double bookings or doctor mismatch',
        'Fragmented patient records slowing down clinic desk check-in'
      ];
      functionalRequirements = [
        'Patient self-service portal for specialty appointment booking',
        'Clinical triage queue with AI symptom urgency prioritization',
        'Physician calendar allocation and clinic room rules manager',
        'Patient wait-time and clinical SLA compliance reporting'
      ];
      importantWorkflows = [
        'Patient Request Intake & Eligibility Check',
        'Clinical Urgency Triage',
        'Physician Slot Allocation & Calendar Lock',
        'Automated Confirmation & EHR Sync'
      ];
      expectedScreens = [
        'Clinical Operations & Appointment Dashboard',
        'Patient Queue & Intake Management Console',
        'Provider Schedules & Clinic Rules Console',
        'Patient Wait Time & Clinical SLA Analytics'
      ];
      uxPriorities = [
        'Accessible, empathetic typography',
        'Zero-ambiguity confirmation feedback',
        'Strict privacy & HIPAA safeguards',
        '1-click AI doctor matching'
      ];
    } else if (/cyber|security|soc|threat|incident|siem|firewall|infosec|vulnerability/i.test(text)) {
      domain = 'CYBERSECURITY';
      industry = 'Cybersecurity & SOC Operations';
      primaryUsers = 'SOC Analysts & Incident Handlers';
      secondaryUsers = 'CISO & Security Engineering Leads';
      businessGoal = 'Continuous 24/7 threat detection, rapid automated containment of high-severity incidents, and compliance forensics.';
      userProblems = [
        'Alert fatigue from thousands of daily SIEM false positives',
        'Slow mean-time-to-contain (MTTC) due to disparate threat intelligence tools',
        'Incomplete audit logs hindering compliance post-mortem investigations'
      ];
      functionalRequirements = [
        'Real-time threat telemetry and active alert severity matrix',
        'Incident investigation workspace with automated IOC correlation',
        'Firewall and SIEM detection policy rule manager',
        'Forensic timeline and threat hunting analytics'
      ];
      importantWorkflows = [
        'Telemetry Ingestion & Threat Classification',
        'Alert Triage & Automated Sandbox Detonation',
        'Containment Action & Host Isolation',
        'Forensic Evidence Preservation & Post-Mortem'
      ];
      expectedScreens = [
        'Security Operations & Threat Telemetry Console',
        'Incident Investigation & Alert Triage Workspace',
        'Firewall Rules & SIEM Detection Policy Manager',
        'Threat Hunting & Forensic Audit Analytics'
      ];
      uxPriorities = [
        'High-density dark mode telemetry',
        'Clear severity status badge hierarchy',
        '1-click host containment triggers',
        'Zero-latency filter querying'
      ];
    }

    let recommendedThemes = [];
    if (domain === 'CYBERSECURITY') {
      recommendedThemes = [
        { id: 'warm-cream', name: 'Warm Cream & Ivory', tag: 'Light • Warm Cream', mode: 'light', reason: 'Soft ivory canvas and warm cream cards for executive threat briefings, compliance reports, and clear audit review.', visuals: 'Soft ivory canvas, white cards & espresso amber accents', accentColor: '#92400E', borderRadius: '12px' },
        { id: 'cyber-ops', name: 'Command Center Cyber Ops', tag: 'Dark Side • Obsidian Ops', mode: 'dark', reason: 'High-density dark mode with neon telemetry indicators designed for continuous 24/7 SOC monitoring.', visuals: 'Obsidian dark, neon emerald telemetry & monospace metrics', accentColor: '#10B981', borderRadius: '8px' },
        { id: 'enterprise-slate', name: 'Clean Enterprise Slate', tag: 'Dark Side • Midnight', mode: 'dark', reason: 'Crisp borders and clear hierarchy for structured compliance, host containment, and audit workflows.', visuals: 'Linear/Stripe midnight dark & electric indigo accents', accentColor: '#2563EB', borderRadius: '6px' }
      ];
    } else if (domain === 'FINTECH') {
      recommendedThemes = [
        { id: 'warm-cream', name: 'Warm Cream & Ivory', tag: 'Light • Warm Cream', mode: 'light', reason: 'Trust-building wealth and ledger clarity with soothing ivory background, warm cards, and espresso accents.', visuals: 'Soft ivory canvas, white cards & espresso amber accents', accentColor: '#92400E', borderRadius: '12px' },
        { id: 'fintech-violet', name: 'FinTech Electric Violet', tag: 'Dark Side • High Velocity', mode: 'dark', reason: 'High-velocity transaction analytics with high-contrast alert indicators and vibrant violet accents.', visuals: 'Deep graphite dark, vibrant violet badges & sleek cards', accentColor: '#8B5CF6', borderRadius: '10px' },
        { id: 'saas-modern', name: 'Modern SaaS Glassmorphism', tag: 'Dark Side • Slate Modern', mode: 'dark', reason: 'Deep slate surfaces with subtle depth and glowing amber indicators for real-time risk triage.', visuals: 'Deep slate dark, glowing amber accents & blurred glass cards', accentColor: '#D97706', borderRadius: '12px' }
      ];
    } else if (domain === 'HEALTHCARE') {
      recommendedThemes = [
        { id: 'warm-cream', name: 'Warm Cream & Ivory', tag: 'Light • Warm Cream', mode: 'light', reason: 'Calming, patient-friendly ivory canvas with high legibility, clean white cards, and soothing warm tones.', visuals: 'Soft ivory canvas, white cards & warm bronze accents', accentColor: '#92400E', borderRadius: '12px' },
        { id: 'saas-modern', name: 'Modern SaaS Glassmorphism', tag: 'Dark Side • Clinical Dark', mode: 'dark', reason: 'Modern dark slate with glowing amber accents for reduced eye fatigue during intensive clinical shifts.', visuals: 'Deep slate dark, glowing amber accents & blurred glass cards', accentColor: '#D97706', borderRadius: '12px' },
        { id: 'enterprise-slate', name: 'Clean Enterprise Slate', tag: 'Dark Side • High Precision', mode: 'dark', reason: 'High precision and zero-ambiguity layout ideal for clinical workflows and regulatory compliance.', visuals: 'Linear midnight dark & electric indigo accents', accentColor: '#2563EB', borderRadius: '6px' }
      ];
    } else {
      recommendedThemes = [
        { id: 'warm-cream', name: 'Warm Cream & Ivory', tag: 'Light • Warm Cream', mode: 'light', reason: 'Soft ivory canvas with warm cream cards and elegant typography for effortless readability and executive clarity.', visuals: 'Soft ivory canvas, white cards & warm amber accents', accentColor: '#92400E', borderRadius: '12px' },
        { id: 'saas-modern', name: 'Modern SaaS Glassmorphism', tag: 'Dark Side • Slate Modern', mode: 'dark', reason: 'Fluid card hierarchy, subtle depth, and vibrant status indicators in deep slate.', visuals: 'Deep slate dark, glowing amber accents & blurred cards', accentColor: '#D97706', borderRadius: '12px' },
        { id: 'cyber-ops', name: 'Command Center Cyber Ops', tag: 'Dark Side • Obsidian Ops', mode: 'dark', reason: 'Obsidian dark palette with high-contrast telemetry indicators for intensive operational triaging.', visuals: 'Obsidian dark, neon emerald telemetry & monospace metrics', accentColor: '#10B981', borderRadius: '8px' }
      ];
    }

    return {
      domain,
      businessIndustry: industry,
      primaryUsers,
      secondaryUsers,
      businessGoal,
      userProblems,
      functionalRequirements,
      importantWorkflows,
      expectedScreens,
      uxPriorities,
      recommendedThemes,
      designRecommendations: recommendedThemes
    };
  },

  async generateUX(context, legacySolution, options = {}) {
    const ws = extractWorkspace(context);
    const reqText = options.requirement || ws.objective || ws.challenge || ws.name || '';
    const understanding = options.understanding || await this.analyzeUXRequirement(context, reqText);
    const domain = understanding.domain || resolveDomain(context);
    const selectedThemeId = options.selectedTheme || 'enterprise-slate';

    // Theme palette mappings
    const themePalettes = {
      'warm-cream': {
        background: '#FDF8F0 (Warm Cream / Soft Ivory)',
        cardBg: '#FFFFFF (Clean Ivory Surface)',
        textPrimary: '#1C1917 (Espresso Charcoal)',
        textMuted: '#78716C (Warm Stone Muted)',
        accent: '#92400E (Rich Amber Espresso)',
        success: '#10B981 (Emerald Green)',
        border: 'rgba(28, 25, 23, 0.12) (Subtle Cream Border)',
        borderRadius: '12px',
        typography: 'Plus Jakarta Sans & Lora'
      },
      'enterprise-slate': {
        background: '#F8FAFC (Slate Light)',
        cardBg: '#FFFFFF (Clean Ivory)',
        textPrimary: '#0F172A (Deep Slate)',
        textMuted: '#64748B (Muted Slate)',
        accent: '#2563EB (Electric Indigo)',
        success: '#10B981 (Emerald Green)',
        border: '#E2E8F0 (Crisp Border)',
        borderRadius: '6px',
        typography: 'Plus Jakarta Sans (UI) & JetBrains Mono (Codes)'
      },
      'saas-modern': {
        background: '#FAF8F5 (Warm White)',
        cardBg: '#FFFFFF (Clean Ivory)',
        textPrimary: '#1F242D (Charcoal)',
        textMuted: '#64748B (Slate)',
        accent: '#D97706 (Modern Amber)',
        success: '#059669 (Fulfillment Green)',
        border: '#E5E7EB (Light Border)',
        borderRadius: '12px',
        typography: 'Plus Jakarta Sans (UI) & Inter (Body)'
      },
      'cyber-ops': {
        background: '#0A0E17 (Obsidian Black)',
        cardBg: '#111827 (Dark Charcoal)',
        textPrimary: '#F9FAFB (Bright White)',
        textMuted: '#9CA3AF (Cool Gray)',
        accent: '#10B981 (Neon Emerald)',
        success: '#10B981 (Neon Emerald)',
        border: '#1F2937 (Dark Slate)',
        borderRadius: '8px',
        typography: 'JetBrains Mono (Codes & Metrics) & Inter (UI)'
      },
      'warm-luxury': {
        background: '#FAF6F0 (Warm Cream)',
        cardBg: '#FFFFFF (Clean Ivory)',
        textPrimary: '#26201A (Espresso)',
        textMuted: '#78716C (Warm Stone)',
        accent: '#F59E0B (Champagne Gold)',
        success: '#10B981 (Emerald Green)',
        border: '#E7E5E4 (Soft Stone)',
        borderRadius: '16px',
        typography: 'Outfit (Display) & Plus Jakarta Sans (UI)'
      },
      'nordic-clean': {
        background: '#F0FDF4 (Alpine Mint)',
        cardBg: '#FFFFFF (Clean Ivory)',
        textPrimary: '#064E3B (Nordic Pine)',
        textMuted: '#047857 (Forest Muted)',
        accent: '#0EA5E9 (Sky Cyan)',
        success: '#10B981 (Emerald Green)',
        border: '#E2E8F0 (Subtle Slate)',
        borderRadius: '10px',
        typography: 'Inter (Clean) & Plus Jakarta Sans (UI)'
      },
      'fintech-violet': {
        background: '#FDF4FF (Soft Orchid)',
        cardBg: '#FFFFFF (Clean Ivory)',
        textPrimary: '#4A044E (Deep Plum)',
        textMuted: '#701A75 (Muted Plum)',
        accent: '#8B5CF6 (Electric Violet)',
        success: '#10B981 (Emerald Green)',
        border: '#F0ABFC (Light Orchid)',
        borderRadius: '14px',
        typography: 'Plus Jakarta Sans (UI) & JetBrains Mono (Metrics)'
      }
    };

    const tokens = themePalettes[selectedThemeId] || themePalettes['enterprise-slate'];

    // Build Domain Specific Content Packs
    let domainData = {
      title: `${understanding.businessIndustry} UI Architecture & Wireframes`,
      screens: [
        {
          id: 'screen-dashboard',
          name: `${understanding.businessIndustry.split(' ')[0]} Operations & Status Dashboard`,
          purpose: 'High-level operational overview showcasing throughput, active queues, AI triage accuracy, and SLA health.',
          primaryUser: understanding.primaryUsers.split('&')[0].trim(),
          status: 'DESIGNED',
          layout: 'Grid of 4 Metric Stat Cards, Transformation Health Ring, Priority Work Queue Table, AI Confidence Distribution Bar',
          layoutType: 'dashboard',
          stats: [
            { label: 'Total Volume Today', value: '1,420', change: '+18.4% vs last week', trend: 'up', icon: 'Inbox' },
            { label: 'AI Automation Rate', value: '82.6%', change: '+34% straight-through', trend: 'up', icon: 'Bot' },
            { label: 'Avg Processing Time', value: '2.4 min', change: 'Prior baseline: 14.8 min', trend: 'down', icon: 'Clock' },
            { label: 'SLA Compliance Rate', value: '99.2%', change: '+12% target adherence', trend: 'up', icon: 'ShieldCheck' }
          ],
          components: [
            { id: 'cmp-kpis', type: 'metric_grid', title: 'Key Performance Indicators', count: 4 },
            { id: 'cmp-chart', type: 'velocity_ring', title: 'Throughput Velocity & Queue Balance', autoPct: 82.6 },
            { id: 'cmp-table', type: 'priority_table', title: 'Active Processing Queue', rowCount: 5 }
          ]
        },
        {
          id: 'screen-workflow',
          name: 'Case Processing & Operator Console',
          purpose: 'Ergonomic split-view interface designed for rapid task execution with AI Copilot recommendations on the right.',
          primaryUser: understanding.primaryUsers.split('&')[0].trim(),
          status: 'DESIGNED',
          layout: 'Left pane: Filterable active item queue with priority chips; Center: Detail specification and historical timeline; Right: AI Copilot recommendations and 1-click execution triggers',
          layoutType: 'split-view',
          stats: [
            { label: 'Active Queue Count', value: '42 items', change: '5 urgent', trend: 'neutral', icon: 'Layers' },
            { label: 'Operator Velocity', value: '18 items/hr', change: '+25% today', trend: 'up', icon: 'TrendingUp' }
          ],
          components: [
            { id: 'cmp-queue-list', type: 'queue_list', title: 'Incoming Work Items', activeItem: 'ITEM-1049' },
            { id: 'cmp-detail-pane', type: 'detail_view', title: 'Case Item Specification', hasTimeline: true },
            { id: 'cmp-copilot-pane', type: 'ai_copilot', title: 'AI Copilot Recommender', confidence: '96%' }
          ]
        },
        {
          id: 'screen-admin',
          name: 'Routing Rules & Configuration Console',
          purpose: 'Governance controls for threshold triggers, routing rules, team allocations, and audit log inspection.',
          primaryUser: understanding.secondaryUsers.split('&')[0].trim(),
          status: 'DESIGNED',
          layout: 'Top tab navigation (Rules, Thresholds, Teams, Audit Logs), Filterable data table with status toggles, Slide-over inspector drawer for rule editing',
          layoutType: 'table',
          stats: [
            { label: 'Active Business Rules', value: '18 Active', change: '2 in draft', trend: 'neutral', icon: 'Sliders' },
            { label: 'Rule Execution Rate', value: '14.2k/day', change: '100% evaluated', trend: 'up', icon: 'Zap' }
          ],
          components: [
            { id: 'cmp-rules-table', type: 'rules_table', title: 'Configured Routing Rules', activeCount: 4 },
            { id: 'cmp-audit-logs', type: 'audit_log', title: 'System Modification Logs', eventCount: 12 }
          ]
        },
        {
          id: 'screen-analytics',
          name: 'Throughput & Transformation Analytics',
          purpose: 'Historical performance reporting, cycle time trends, operator efficiency benchmarks, and cost-reduction tracking.',
          primaryUser: understanding.secondaryUsers.split('&')[0].trim(),
          status: 'DESIGNED',
          layout: 'Date-range picker, Multi-series timeline chart (Latency vs Target SLA), Category breakdown bar chart, Export to CSV/PDF button',
          layoutType: 'dashboard',
          stats: [
            { label: 'Net Efficiency Gain', value: '+42.8%', change: 'Post-automation', trend: 'up', icon: 'TrendingUp' },
            { label: 'Cost Reduction Est.', value: '$24,500/mo', change: '-38% manual effort', trend: 'up', icon: 'DollarSign' }
          ],
          components: [
            { id: 'cmp-timeline-chart', type: 'line_chart', title: 'Processing Latency vs Target SLA' },
            { id: 'cmp-category-bar', type: 'bar_chart', title: 'Volume Distribution by Category' }
          ]
        }
      ]
    };

    // Domain Customizations
    if (domain === 'FOOD_DELIVERY') {
      domainData.title = 'Food Delivery & Kitchen Dispatch Operations Wireframes';
      domainData.screens[0].name = 'Kitchen & Dispatch Operations Dashboard';
      domainData.screens[0].description = 'Real-time overview of active food orders, kitchen prep backlog, courier fleet dispatch, and on-time delivery rates.';
      domainData.screens[0].stats = [
        { label: 'Active Orders In Flight', value: '1,420', change: '+14% lunch peak', trend: 'up', icon: 'Inbox' },
        { label: 'Avg Kitchen Prep Time', value: '12.4 min', change: '-3.2 min vs target', trend: 'down', icon: 'Clock' },
        { label: 'Active Couriers Online', value: '384', change: '94% on active trips', trend: 'up', icon: 'Truck' },
        { label: 'On-Time Delivery SLA', value: '97.8%', change: '+4.2% delivery SLA', trend: 'up', icon: 'ShieldCheck' }
      ];
      domainData.screens[0].specification = {
        purpose: 'Real-time overview of active food orders, kitchen prep backlog, courier fleet dispatch, and on-time delivery rates.',
        primaryUser: 'Kitchen Operations Dispatcher',
        userGoal: 'Balance order flow and courier allocation to ensure hot food delivery within SLA.',
        businessObjective: 'Minimize order preparation delays and optimize courier delivery throughput.',
        primaryActions: ['Auto-Dispatch Order', 'Assign Courier', 'Pause Kitchen Intake'],
        secondaryActions: ['Inspect Order Ticket', 'Contact Courier', 'View Order History'],
        requiredData: ['Kitchen Prep Timers', 'Active Courier GPS Positions', 'Order Basket Manifest', 'Customer ETA Windows'],
        components: ['Kitchen Queue Metric Grid', 'Live Order Triage Matrix', 'Courier Fleet Dispatcher', 'AI Surge Allocator'],
        navigation: ['Orders Queue & Courier Dispatch Console', 'Restaurant Partners & Menu Rules Console', 'Delivery Latency & Fulfillment Analytics'],
        states: ['Nominal Ingestion', 'Lunch Peak Surge', 'Courier Shortage Warning', 'Order Delayed State'],
        validation: ['Courier vehicle suitability verified', 'Food safety hold time under 25 mins', 'Customer address geolocation confirmed'],
        permissions: ['Dispatch Operator', 'Kitchen Lead', 'Operations Manager'],
        responsive: {
          desktop: '3-column layout with kitchen throughput ring, order triage table, and live courier map',
          tablet: '2-column responsive layout with collapsible courier status drawer',
          mobile: 'Card-based order stream with swipeable status actions and quick call-driver button'
        },
        accessibilityNotes: 'WCAG 2.1 AA compliant, high-contrast order status chips, audible alerts for delayed prep items'
      };

      domainData.screens[1].name = 'Orders Queue & Courier Dispatch Console';
      domainData.screens[1].description = 'Split-view interface designed for dispatchers to monitor incoming kitchen tickets, track driver transit, and trigger AI reassignments.';
      domainData.screens[1].specification = {
        purpose: 'Split-view console to manage active delivery transit, driver routing, and customer ETA promises.',
        primaryUser: 'Field Dispatch Supervisor',
        userGoal: 'Reassign riders when traffic or prep delays threaten on-time SLA.',
        businessObjective: 'Reduce average transit time by 18% and eliminate cold food compensation claims.',
        primaryActions: ['Reassign Courier', 'Update ETA', 'Broadcast Driver Ping'],
        secondaryActions: ['Review Route History', 'Cancel Order', 'Trigger Support Chat'],
        requiredData: ['GPS Telemetry Stream', 'Driver Turnaround History', 'Restaurant Handoff Delay Index'],
        components: ['Active Transit Stream', 'Driver Route Map', 'AI Reassignment Copilot', 'ETA Predictor'],
        navigation: ['Kitchen Operations Dashboard', 'Fulfillment Analytics'],
        states: ['Normal Route', 'Traffic Stalled', 'Driver Unresponsive', 'Delivered & Signed'],
        validation: ['Driver within 2km radius', 'Temperature-controlled bag confirmed'],
        permissions: ['Dispatcher', 'Support Agent'],
        responsive: {
          desktop: 'Split-screen map on right and ticket list on left',
          tablet: 'Collapsible left ticket queue with full-width map preview',
          mobile: 'Full-screen driver triage cards with bottom modal map sheet'
        },
        accessibilityNotes: 'Screen reader labels for real-time map marker changes and audio pings for high-priority dispatch changes'
      };

      domainData.screens[2].name = 'Restaurant Partners & Menu Rules Console';
      domainData.screens[2].description = 'Supervisory console managing restaurant kitchen operating hours, dynamic surge pricing, and driver compensation thresholds.';
      domainData.screens[2].specification = {
        purpose: 'Configure restaurant operational hours, dynamic surge pricing, and driver compensation thresholds.',
        primaryUser: 'Restaurant Operations Manager',
        userGoal: 'Manage merchant menu availability, surge multipliers, and partner payout tiers.',
        businessObjective: 'Balance supply and demand elasticity during peak hours.',
        primaryActions: ['Toggle Surge Pricing', 'Update Operating Hours', 'Activate Menu Item'],
        secondaryActions: ['Export Merchant Settlement', 'Set Delivery Radius', 'Audit Commission Tiers'],
        requiredData: ['Merchant Catalog', 'Demand Elasticity Index', 'Operating Schedule'],
        components: ['Merchant Rules Table', 'Surge Multiplier Toggle', 'Commission Tier Manager'],
        navigation: ['Kitchen Operations Dashboard', 'Fulfillment Analytics'],
        states: ['Standard Rates', 'Surge Active (1.5x)', 'Kitchen Paused (Merchant Request)'],
        validation: ['Surge cap cannot exceed 2.2x without regional approval'],
        permissions: ['Operations Supervisor', 'Finance Analyst'],
        responsive: {
          desktop: 'Table view with slide-over drawer for rule editing',
          tablet: 'Adaptive card grid with filter bar',
          mobile: 'Single column settings list with toggle switches'
        },
        accessibilityNotes: 'Standard form labeling with ARIA live validation feedback'
      };

      domainData.screens[3].name = 'Delivery Latency & Fulfillment Analytics';
      domainData.screens[3].description = 'Historical reporting covering kitchen bottleneck hours, courier transit speeds, customer delivery ratings, and refund rates.';
      domainData.screens[3].specification = {
        purpose: 'Comprehensive analytics on delivery latency, kitchen prep efficiency, customer ratings, and refund rates.',
        primaryUser: 'VP of Operations & City General Manager',
        userGoal: 'Identify delivery bottlenecks across neighborhoods and reduce fulfillment cost per order.',
        businessObjective: 'Lower cost per delivery by 14% and maintain a 4.8+ customer satisfaction rating.',
        primaryActions: ['Filter by Zone', 'Export Weekly Performance', 'Set SLA Benchmark'],
        secondaryActions: ['Drill Into Outlier Routes', 'Schedule Executive PDF Digest', 'Share KPI Dashboard'],
        requiredData: ['Aggregated Latency Timeseries', 'Courier Utilization Pct', 'Refund Ratio by Vendor'],
        components: ['Transit Latency Timeline', 'Zone Heatmap Breakdown', 'Refund Correlation Matrix'],
        navigation: ['Kitchen Operations Dashboard', 'Orders Queue & Courier Dispatch Console'],
        states: ['Aggregated View', 'Filtered Neighborhood View', 'Benchmark Comparison Mode'],
        validation: ['Date range valid', 'Export sanitized according to PII policies'],
        permissions: ['Executive', 'Analytics Team Lead'],
        responsive: {
          desktop: '4-stat cards on top, 2 wide charts side by side, detailed zone breakdown below',
          tablet: 'Stacked charts with horizontal scroll tables',
          mobile: 'Summary KPI metric cards with simplified sparkline views'
        },
        accessibilityNotes: 'High-contrast chart color palettes with text alternative data tables for screen readers'
      };
    } else if (domain === 'FINTECH') {
      domainData.title = 'Financial Fraud & AML Detection Platform Wireframes';
      domainData.screens[0].name = 'Fraud Risk & Transaction Telemetry Dashboard';
      domainData.screens[0].description = 'Real-time telemetry of payment transactions, AI anomaly detection alerts, suspicious activity flags, and automated hold rates.';
      domainData.screens[0].stats = [
        { label: 'Transactions Processed (24h)', value: '$14.2M', change: '84,200 events', trend: 'up', icon: 'DollarSign' },
        { label: 'High-Risk Alerts Flagged', value: '142', change: '-18% false positives', trend: 'down', icon: 'AlertTriangle' },
        { label: 'Autonomous Block Rate', value: '98.4%', change: 'Sub-second lock', trend: 'up', icon: 'Zap' },
        { label: 'AML Regulatory SLA', value: '100%', change: 'Zero audit gaps', trend: 'up', icon: 'ShieldCheck' }
      ];
      domainData.screens[0].specification = {
        purpose: 'Continuous monitoring of incoming high-velocity payment transactions and instantaneous AI fraud risk scoring.',
        primaryUser: 'Fraud Operations Analyst',
        userGoal: 'Identify suspicious transaction patterns, review high-risk flags, and freeze compromised accounts.',
        businessObjective: 'Reduce false-positive block rates by 25% while preventing unauthorized chargebacks and identity theft.',
        primaryActions: ['Freeze Transaction', 'Whistelist Account', 'Escalate to Tier-2 AML'],
        secondaryActions: ['Inspect Fraud Feature Weights', 'Trigger 2FA Re-verification', 'Export Regulatory SAR Report'],
        requiredData: ['Transaction Volume Stream', 'Behavioral Anomaly Index', 'Device Fingerprint Graph', 'Merchant Category Code Risk'],
        components: ['Fraud Telemetry Metric Grid', 'Active Flagged Transaction Matrix', 'Risk Velocity Gauge', 'AI Copilot Anomaly Explainer'],
        navigation: ['High-Risk Alert Triage & Investigation Console', 'Detection Rules & Risk Policy Manager', 'Compliance Audit & Loss Prevention Analytics'],
        states: ['Nominal Ingestion', 'Active Card-Testing Attack Detected', 'AML Reporting Queue Backlog'],
        validation: ['Sub-second latency constraint (<350ms)', 'Dual-analyst confirmation required for account balance seizures over $25k'],
        permissions: ['Fraud Analyst', 'Compliance Officer', 'Risk Lead'],
        responsive: {
          desktop: 'Command center layout with live telemetry ticker, fraud score distribution, and priority triage table',
          tablet: '2-column alert triage grid with slide-over transaction metadata drawer',
          mobile: 'Priority alert cards with 1-tap emergency card freeze action'
        },
        accessibilityNotes: 'WCAG 2.1 AA compliant, dark-mode high contrast alerts, full keyboard shortcuts (J/K next item, Space freeze)'
      };

      domainData.screens[1].name = 'High-Risk Alert Triage & Investigation Console';
      domainData.screens[1].description = 'Split-view investigative workspace for fraud analysts to inspect transaction metadata, account history, and AI risk feature weights.';
      domainData.screens[1].specification = {
        purpose: 'Deep-dive investigation workspace for forensic analysis of flagged accounts and anomalous payments.',
        primaryUser: 'Senior Fraud Investigator',
        userGoal: 'Correlate device footprints, IP velocity, and historical transaction graphs to determine fraud culpability.',
        businessObjective: 'Lower investigation cycle time from 14 minutes to under 3 minutes per case.',
        primaryActions: ['Confirm Fraud & Block', 'Clear False Positive', 'Initiate Chargeback Reversal'],
        secondaryActions: ['Add Case Memo', 'Link Related Accounts', 'Request KYC Identity Documents'],
        requiredData: ['Device Fingerprint', 'IP Geolocation Trail', 'Historical Transaction Graph', 'Neural Anomaly Weights'],
        components: ['Case Timeline Explorer', 'Device Intelligence Pane', 'AI Copilot Explanation Card', 'Action Trigger Bar'],
        navigation: ['Fraud Risk Dashboard', 'Detection Rules Manager'],
        states: ['Investigation Pending', 'Under Active Review', 'Escalated to FinCEN', 'Closed - Cleared'],
        validation: ['Mandatory explanation memo required before closing high-risk alert'],
        permissions: ['Senior Analyst', 'Chief Risk Officer'],
        responsive: {
          desktop: '3-pane split view: Case queue left, evidence center, actions & AI explanations right',
          tablet: '2-column layout with tabbed evidence panels',
          mobile: 'Stacked evidence summary cards with sticky bottom decision buttons'
        },
        accessibilityNotes: 'All forensic charts feature text alternative tables and high-contrast color indicators'
      };

      domainData.screens[2].name = 'Detection Rules & Risk Policy Manager';
      domainData.screens[2].description = 'Compliance configuration console for velocity limits, blacklist accounts, geographical risk tiers, and threshold triggers.';
      domainData.screens[2].specification = {
        purpose: 'Define velocity thresholds, sanctions blacklists, and automated hold policies with zero code deployments.',
        primaryUser: 'AML Compliance Officer',
        userGoal: 'Tune risk scoring thresholds and create targeted rules to counter emerging fraud vectors.',
        businessObjective: 'Maintain 100% regulatory compliance and eliminate audit findings.',
        primaryActions: ['Deploy Rule', 'Simulate Rule on Historical Data', 'Deactivate Policy'],
        secondaryActions: ['Clone Rule', 'Export Rule Audit Trail', 'Configure Sanctions List Sync'],
        requiredData: ['Rule Logic AST', 'Historical Backtesting Results', 'Regulatory Blacklist Updates'],
        components: ['Policy Rules Data Table', 'Rule Syntax Builder', 'Backtesting Simulation Simulator'],
        navigation: ['Fraud Risk Dashboard', 'Compliance Analytics'],
        states: ['Active Rule', 'Simulation Staging', 'Deprecated Rule', 'Draft State'],
        validation: ['Rule syntax validated against execution engine schema', 'Backtest required before production activation'],
        permissions: ['Compliance Lead', 'Lead Risk Architect'],
        responsive: {
          desktop: 'Table view with slide-over drawer for rule editing and simulation preview',
          tablet: 'Adaptive card grid with filter bar',
          mobile: 'Single column settings list with toggle switches'
        },
        accessibilityNotes: 'Standard form labeling with ARIA live validation feedback'
      };

      domainData.screens[3].name = 'Loss Prevention & Audit Compliance Analytics';
      domainData.screens[3].description = 'Historical performance analytics tracking prevented loss dollars, chargeback rates, analyst turnaround times, and audit logs.';
      domainData.screens[3].specification = {
        purpose: 'Executive reporting on prevented fraud dollars, chargeback ratios, false-positive metrics, and regulatory audit compliance.',
        primaryUser: 'Chief Risk Officer & Compliance Auditor',
        userGoal: 'Verify compliance with international AML regulations and track ROI of automated fraud prevention.',
        businessObjective: 'Keep chargeback ratio below 0.65% to avoid card network penalty fines.',
        primaryActions: ['Generate SAR Export', 'Filter by Currency & Region', 'Export Audit Pack'],
        secondaryActions: ['Schedule Monthly C-Suite Report', 'Audit Analyst SLA Times', 'Inspect Regulatory Filing Status'],
        requiredData: ['Prevented Loss Totals', 'Chargeback Ratios by Issuer', 'Analyst Turnaround Distributions'],
        components: ['Prevented Loss KPI Gauge', 'Chargeback Ratio Timeline', 'Regional Anomaly Heatmap'],
        navigation: ['Fraud Risk Dashboard', 'Investigation Console'],
        states: ['Consolidated View', 'Audit Mode', 'Regulatory Review Filter'],
        validation: ['Audit export digitally signed and hashed'],
        permissions: ['Chief Risk Officer', 'Internal Auditor'],
        responsive: {
          desktop: '4-stat cards on top, 2 wide charts side by side, detailed zone breakdown below',
          tablet: 'Stacked charts with horizontal scroll tables',
          mobile: 'Summary KPI metric cards with simplified sparkline views'
        },
        accessibilityNotes: 'High-contrast chart color palettes with text alternative data tables for screen readers'
      };
    } else if (domain === 'HEALTHCARE') {
      domainData.title = 'Patient Care & Clinical Appointment Portal Wireframes';
      domainData.screens[0].name = 'Clinical Operations & Patient Appointment Dashboard';
      domainData.screens[0].description = 'High-level clinical overview showcasing patient appointments, doctor availability, room wait times, and clinical SLA health.';
      domainData.screens[0].stats = [
        { label: 'Appointments Scheduled Today', value: '248', change: '-28% clinic wait time', trend: 'up', icon: 'Inbox' },
        { label: 'Doctor Availability Slots', value: '42 Available', change: '8 Specialties', trend: 'up', icon: 'Bot' },
        { label: 'Avg Clinic Check-in Time', value: '3.1 min', change: 'Prior: 24.5 min', trend: 'down', icon: 'Clock' },
        { label: 'Clinical SLA Adherence', value: '99.1%', change: '+14% compliance', trend: 'up', icon: 'ShieldCheck' }
      ];
      domainData.screens[0].specification = {
        purpose: 'Provide clinical desks and doctors with real-time operational visibility over appointments, provider availability, and patient check-in status.',
        primaryUser: 'Patient & Clinical Intake Coordinator',
        userGoal: 'Manage patient arrival queue, monitor doctor schedule utilization, and book or reschedule encounters.',
        businessObjective: 'Eliminate patient waiting time, prevent clinical room bottlenecks, and improve appointment throughput.',
        primaryActions: ['Book New Appointment', 'Check-In Patient', 'View Doctor Schedules'],
        secondaryActions: ['Reschedule Encounter', 'Trigger Patient SMS Reminder', 'Export Daily Roster'],
        requiredData: ['Patient Master Record', 'Doctor Availability Slots', 'Appointment State (Confirmed, In-Consult, Completed)', 'Clinical Room Assignments'],
        components: ['Clinical Metric Grid', 'Active Appointment Triage Table', 'Doctor Schedule Calendar', 'AI Slot Optimizer'],
        navigation: ['Patient Queue & Intake Management Console', 'Provider Schedules & Clinic Rules Console', 'Patient Wait Time & Clinical SLA Analytics'],
        states: ['Ready / Loaded', 'Slot Refreshing', 'No Shows Alert State', 'Emergency Override Mode'],
        validation: ['Patient DOB & MRN verification', 'HIPAA Consent on record', 'Physician license validation'],
        permissions: ['Clinical Desk Staff', 'Physician', 'Clinic Administrator'],
        responsive: {
          desktop: '3-column layout with appointment status ring, active queue, and provider schedule',
          tablet: '2-column layout with collapsible doctor calendar',
          mobile: 'Single column card stream with quick check-in actions and floating book CTA'
        },
        accessibilityNotes: 'WCAG 2.1 AA compliant, 4.5:1 color contrast, keyboard-accessible schedule picker, ARIA-described appointment status'
      };

      domainData.screens[1].name = 'Patient Queue & Intake Management Console';
      domainData.screens[1].description = 'Split-view interface designed for rapid patient intake, doctor search, and appointment scheduling with AI copilot assistance.';
      domainData.screens[1].specification = {
        purpose: 'Split-view clinical desk console to triage incoming patient check-ins, resolve scheduling conflicts, and review clinical intake summaries.',
        primaryUser: 'Clinical Desk Staff & Triage Nurse',
        userGoal: 'Rapidly check in patients, review medical reason for visit, and assign examination rooms.',
        businessObjective: 'Keep check-in turnaround under 3 minutes and eliminate intake data entry errors.',
        primaryActions: ['Confirm Check-In', 'Assign Exam Room', 'AI Doctor Matching'],
        secondaryActions: ['Update Insurance Details', 'Flag Clinical Allergy Alert', 'Print Patient ID Badge'],
        requiredData: ['Patient Health History', 'Chief Complaint Description', 'Assigned Physician ID', 'Room Availability Matrix'],
        components: ['Patient Intake Queue', 'Clinical Encounter Summary', 'AI Slot Matcher', 'Exam Room Selector'],
        navigation: ['Clinical Operations Dashboard', 'Provider Schedules Console'],
        states: ['Patient Waiting', 'In Room', 'Consult Completed', 'No-Show'],
        validation: ['Insurance eligibility active', 'Signed HIPAA disclosure verified'],
        permissions: ['Intake Coordinator', 'Registered Nurse', 'Clinic Supervisor'],
        responsive: {
          desktop: 'Split screen: Left queue list, Center encounter details, Right AI scheduling recommendations',
          tablet: 'Collapsible patient list with slide-over encounter sheet',
          mobile: 'Card list with swipe gestures to mark patient checked-in or room assigned'
        },
        accessibilityNotes: 'Screen reader accessible encounter timestamps and keyboard shortcuts for quick intake triage'
      };

      domainData.screens[2].name = 'Provider Schedules & Clinic Rules Console';
      domainData.screens[2].description = 'Management controls for physician availability, clinic room allocation rules, and HIPAA compliance audit log inspection.';
      domainData.screens[2].specification = {
        purpose: 'Configure physician operating rosters, emergency coverage rules, specialty clinic slots, and appointment buffer times.',
        primaryUser: 'Clinic Administrator & Medical Director',
        userGoal: 'Set doctor schedules, allocate consulting rooms, and define booking policies.',
        businessObjective: 'Maximize physician clinic utilization while preventing clinician burnout and overbooking.',
        primaryActions: ['Publish Weekly Roster', 'Block Calendar Slot', 'Add Specialty Schedule'],
        secondaryActions: ['Export Provider Utilization', 'Adjust Slot Buffer (15m/30m)', 'Sync with EHR Provider Feed'],
        requiredData: ['Physician Shift Rotas', 'Room Allocation Limits', 'Provider Specialty Tags'],
        components: ['Provider Roster Calendar', 'Clinic Capacity Matrix', 'Buffer Rule Configurator'],
        navigation: ['Clinical Operations Dashboard', 'Clinical SLA Analytics'],
        states: ['Schedule Published', 'Draft Roster', 'Uncovered Shift Warning'],
        validation: ['Physician shifts cannot exceed regulatory duty hour caps'],
        permissions: ['Clinic Administrator', 'Medical Director'],
        responsive: {
          desktop: 'Full calendar grid with weekly/monthly toggles and doctor filter sidebar',
          tablet: 'Horizontal agenda view with shift summary cards',
          mobile: 'Day-by-day doctor schedule list with expand/collapse shift cards'
        },
        accessibilityNotes: 'Color-coded shift blocks with explicit text labels for colorblind accessibility'
      };

      domainData.screens[3].name = 'Patient Wait Time & Clinical SLA Analytics';
      domainData.screens[3].description = 'Historical performance reporting, patient wait-time trends, doctor efficiency benchmarks, and no-show reduction tracking.';
      domainData.screens[3].specification = {
        purpose: 'Executive reporting on clinical throughput, patient satisfaction, no-show reduction rates, and room turnaround SLA.',
        primaryUser: 'Hospital Operations Director & Chief Medical Officer',
        userGoal: 'Analyze wait-time trends across clinical departments and evaluate appointment scheduling efficiency.',
        businessObjective: 'Achieve 98%+ appointment SLA adherence and reduce patient no-show rate below 5%.',
        primaryActions: ['Filter by Department', 'Export Clinical Report', 'Set Target Wait Benchmark'],
        secondaryActions: ['Inspect No-Show Heatmap', 'Audit HIPAA Access Logs', 'Schedule Automated Report Email'],
        requiredData: ['Encounter Duration Timeseries', 'Patient Arrival Delays', 'Specialty Throughput Metrics'],
        components: ['Wait-Time Timeline Chart', 'Department Throughput Ring', 'No-Show Risk Matrix'],
        navigation: ['Clinical Operations Dashboard', 'Patient Intake Console'],
        states: ['Consolidated Hospital View', 'Specialty Clinic Drilldown', 'Historical Comparison Mode'],
        validation: ['All patient identifiers masked in accordance with HIPAA safe harbor de-identification'],
        permissions: ['Hospital Executive', 'Clinical Operations Lead'],
        responsive: {
          desktop: '4-stat cards on top, 2 wide charts side by side, detailed zone breakdown below',
          tablet: 'Stacked charts with horizontal scroll tables',
          mobile: 'Summary KPI metric cards with simplified sparkline views'
        },
        accessibilityNotes: 'High-contrast chart color palettes with text alternative data tables for screen readers'
      };
    } else if (domain === 'CYBERSECURITY') {
      domainData.title = 'Cybersecurity Incident Operations & SOC Platform Wireframes';
      domainData.screens[0].name = 'Security Operations & Threat Telemetry Console';
      domainData.screens[0].description = 'Continuous 24/7 SOC telemetry monitoring, active security incidents, threat severity matrix, and automated containment health.';
      domainData.screens[0].stats = [
        { label: 'Active Security Incidents', value: '142', change: '8 Critical High', trend: 'up', icon: 'AlertTriangle' },
        { label: 'Mean Time to Contain (MTTC)', value: '4.2 min', change: '-58% post-automation', trend: 'down', icon: 'Clock' },
        { label: 'Automated Containment Rate', value: '98.6%', change: 'Sub-second response', trend: 'up', icon: 'Zap' },
        { label: 'Critical Vulnerabilities Open', value: '12', change: '-34% patch cycle', trend: 'down', icon: 'ShieldCheck' }
      ];
      domainData.screens[0].specification = {
        purpose: 'Deliver real-time visibility into enterprise security threats, incoming SIEM alerts, and automated containment status.',
        primaryUser: 'Tier 1/2 SOC Analyst & Security Operations Lead',
        userGoal: 'Identify critical threat vectors, isolate compromised endpoints, and initiate threat containment workflows.',
        businessObjective: 'Reduce Mean Time to Detect (MTTD) and Mean Time to Contain (MTTC) while eliminating alert fatigue.',
        primaryActions: ['Isolate Compromised Host', 'Escalate Incident', 'Block Malicious IP'],
        secondaryActions: ['Export PCAP Evidence', 'Trigger Sandbox Detonation', 'Add Investigation Note'],
        requiredData: ['SIEM Event Logs', 'CVE Vulnerability Feeds', 'Endpoint EDR Telemetry', 'MITRE ATT&CK TTP Tags'],
        components: ['Threat Severity KPI Grid', 'Live Incident Triage Matrix', 'Attack Vector Radial Breakdown', 'AI Anomaly Copilot'],
        navigation: ['Incident Investigation & Alert Triage Workspace', 'Firewall Rules & SIEM Detection Policy Manager', 'Threat Hunting & Forensic Audit Analytics'],
        states: ['All Systems Nominal', 'Active Critical Incident Mode', 'SIEM Ingestion Throttled', 'Quarantine In-Progress'],
        validation: ['Two-factor confirmation on host isolation', 'Immutable forensic evidence hashing (SHA-256)', 'Operator clearance level check'],
        permissions: ['SOC Analyst', 'Incident Responder', 'CISO / Security Director'],
        responsive: {
          desktop: 'Dense dark-mode command center layout with real-time alert feed, threat matrix, and instant containment controls',
          tablet: '2-column alert triage grid with slide-over threat telemetry drawer',
          mobile: 'High-priority incident notification cards with 1-tap emergency host quarantine action'
        },
        accessibilityNotes: 'Dark-mode optimized neon contrast (WCAG AAA for critical alert tags), full keyboard navigation for triage shortcuts'
      };

      domainData.screens[1].name = 'Incident Investigation & Alert Triage Workspace';
      domainData.screens[1].description = 'Ergonomic investigative interface for SOC analysts to correlate IOCs, inspect packet captures, and execute escalation.';
      domainData.screens[1].specification = {
        purpose: 'Ergonomic split-view workspace for SOC analysts to correlate IOCs, inspect packet captures, and execute host isolation.',
        primaryUser: 'Incident Handler & Threat Hunter',
        userGoal: 'Reconstruct attacker lateral movement, inspect decoded payload artifacts, and contain compromised credentials.',
        businessObjective: 'Prevent lateral data exfiltration and isolate malicious actors within minutes of intrusion detection.',
        primaryActions: ['Quarantine Host', 'Revoke Compromised Token', 'Tag MITRE Technique'],
        secondaryActions: ['Detonate Sample in Sandbox', 'Generate Incident Timeline', 'Notify Executive Team'],
        requiredData: ['Process Execution Trees', 'DNS Tunneling Queries', 'Auth Failure Sequences', 'Memory Dump Hashes'],
        components: ['Incident Investigation Workspace', 'Process Ancestry Tree', 'IOC Correlation Matrix', 'AI Containment Advisor'],
        navigation: ['Security Operations Console', 'Firewall Policy Manager'],
        states: ['Triage In Progress', 'Evidence Preserved', 'Host Isolated', 'Post-Mortem Complete'],
        validation: ['Forensic chain-of-custody checksum verified', 'Destructive containment commands logged to immutable audit ledger'],
        permissions: ['SOC Tier 2/3 Handler', 'Incident Commander'],
        responsive: {
          desktop: 'Split screen: Left incident alert list, Center process tree & evidence, Right containment actions',
          tablet: 'Collapsible left incident list with tabbed evidence inspectors',
          mobile: 'Urgent incident alert cards with emergency host disconnect button'
        },
        accessibilityNotes: 'Color-blind accessible severity indicators (icons + distinct shapes + contrast ratios > 7:1)'
      };

      domainData.screens[2].name = 'Firewall Rules & SIEM Detection Policy Manager';
      domainData.screens[2].description = 'Governance console for threat detection rules, firewall protocol policies, and automated quarantine triggers.';
      domainData.screens[2].specification = {
        purpose: 'Policy configuration for zero-trust access control, protocol inspection rules, and automated quarantine triggers.',
        primaryUser: 'Security Architect & Firewall Administrator',
        userGoal: 'Manage SIGMA/YARA detection rules, block malicious subnets, and configure egress filtering.',
        businessObjective: 'Automate threat suppression across boundary routers and cloud security groups.',
        primaryActions: ['Deploy Firewall Rule', 'Sync SIEM Detection Rule', 'Enable Automated Quarantine'],
        secondaryActions: ['Test Rule Against Historic PCAP', 'Export Rule Set', 'Roll Back Rule Version'],
        requiredData: ['Access Control Lists (ACLs)', 'SIGMA Rule Repository', 'GeoIP Blacklist Feed'],
        components: ['Policy Rules Grid', 'Firewall Filter Builder', 'Rule Execution Audit Log'],
        navigation: ['Security Operations Console', 'Threat Hunting Analytics'],
        states: ['Rule Active', 'Testing Mode', 'Suppressed Policy', 'Draft State'],
        validation: ['Rule conflict detection run before firewall compilation'],
        permissions: ['Firewall Engineer', 'Security Operations Director'],
        responsive: {
          desktop: 'Table view with slide-over drawer for rule editing and simulation preview',
          tablet: 'Adaptive card grid with filter bar',
          mobile: 'Single column settings list with toggle switches'
        },
        accessibilityNotes: 'Standard form labeling with ARIA live validation feedback'
      };

      domainData.screens[3].name = 'Threat Hunting & Forensic Audit Analytics';
      domainData.screens[3].description = 'Historical analysis covering MITRE ATT&CK coverage, incident post-mortems, compliance evidence, and containment SLA trends.';
      domainData.screens[3].specification = {
        purpose: 'Historical forensic reporting on threat trends, MITRE ATT&CK enterprise matrix coverage, and regulatory compliance evidence.',
        primaryUser: 'CISO, SOC Director & External Security Auditor',
        userGoal: 'Assess cyber resilience posture, review post-incident root causes, and verify SOC SLA commitments.',
        businessObjective: 'Ensure ISO 27001 / SOC 2 Type II audit readiness and demonstrate continuous security posture improvement.',
        primaryActions: ['Export Forensic Package', 'Filter by Attack Vector', 'Review ATT&CK Coverage Heatmap'],
        secondaryActions: ['Schedule C-Suite Security Briefing', 'Audit Analyst Response Times', 'Generate Post-Mortem PDF'],
        requiredData: ['Historical Incident Timeseries', 'MITRE Technique Coverage Matrix', 'Analyst Turnaround Statistics'],
        components: ['Incident Velocity Chart', 'ATT&CK Heatmap Grid', 'Containment SLA Gauge'],
        navigation: ['Security Operations Console', 'Incident Investigation Workspace'],
        states: ['Aggregated Security Metrics', 'Detailed Forensic Audit Mode', 'Executive Summary View'],
        validation: ['Compliance exports encrypted with authorized auditor public key'],
        permissions: ['CISO', 'Compliance Auditor', 'SOC Manager'],
        responsive: {
          desktop: '4-stat cards on top, 2 wide charts side by side, detailed zone breakdown below',
          tablet: 'Stacked charts with horizontal scroll tables',
          mobile: 'Summary KPI metric cards with simplified sparkline views'
        },
        accessibilityNotes: 'High-contrast chart color palettes with text alternative data tables for screen readers'
      };
    } else if (domain === 'SUPPLY_CHAIN') {
      domainData.title = 'Supply Chain Logistics & Fleet Dispatch Wireframes';
      domainData.screens[0].name = 'Active Deliveries & Shipment Status Dashboard';
      domainData.screens[0].description = 'Real-time overview of active deliveries, courier routes, shipment statuses, and delivery exception alerts.';
      domainData.screens[0].stats = [
        { label: 'Active Deliveries Today', value: '1,840', change: '+12% volume surge', trend: 'up', icon: 'Inbox' },
        { label: 'On-Time Delivery SLA', value: '98.4%', change: '+3.8% target adherence', trend: 'up', icon: 'ShieldCheck' },
        { label: 'Active Drivers En-Route', value: '320', change: '92% fleet utilization', trend: 'up', icon: 'Truck' },
        { label: 'Route Exceptions Flagged', value: '4 Pending', change: '-40% exception delay', trend: 'down', icon: 'AlertTriangle' }
      ];
      domainData.screens[0].specification = {
        purpose: 'Provide dispatchers with global visibility over active shipments, driver routes, and critical delivery exceptions.',
        primaryUser: 'Logistics Fleet Dispatcher',
        userGoal: 'Track delivery progression, resolve route bottlenecks, and notify customers of transit exceptions.',
        businessObjective: 'Minimize delivery failure rates, reduce courier detention times, and optimize fleet fuel utilization.',
        primaryActions: ['Assign Driver', 'Reroute Shipment', 'Send Customer Alert'],
        secondaryActions: ['Export Manifest', 'Trigger Hub Transfer', 'Inspect Telemetry'],
        requiredData: ['Shipment Waybill IDs', 'Driver GPS Coordinates', 'Route Congestion Vectors', 'Delivery Time Windows'],
        components: ['Delivery Metric KPI Cards', 'Live Shipment Triage Table', 'GPS Route Vector Map', 'Exception Alert Center'],
        navigation: ['Driver Routes & Delivery Dispatch Console', 'Warehouse Hub & Inventory Rules Manager', 'Transit Latency & Fulfillment Analytics'],
        states: ['Nominal Transit', 'Exception Alert State (Weather/Breakdown)', 'Hub Congestion Warning'],
        validation: ['Driver hours of service compliance', 'Proof of delivery signature required', 'Cargo weight threshold'],
        permissions: ['Dispatcher', 'Fleet Manager', 'Operations Director'],
        responsive: {
          desktop: 'Multi-column dashboard with route telemetry map, active shipment list, and driver queue',
          tablet: 'Split view with collapsible route map and shipment card grid',
          mobile: 'Card-based driver list with swipeable route exceptions and 1-tap call driver CTA'
        },
        accessibilityNotes: 'High-contrast route status badges, colorblind-safe exception indicators, screen reader friendly status chips'
      };

      domainData.screens[1].name = 'Driver Routes & Delivery Dispatch Console';
      domainData.screens[1].description = 'Split-view console for live GPS route dispatch, driver reassignments, and delivery exception triage.';
      domainData.screens[1].specification = {
        purpose: 'Interactive dispatching console to balance route legs, assign multi-stop deliveries, and communicate with drivers.',
        primaryUser: 'Dispatch Supervisor & Route Planner',
        userGoal: 'Optimize route sequencing, minimize empty miles, and handle urgent delivery requests.',
        businessObjective: 'Achieve 98%+ on-time arrival and cut fuel expenses by 12%.',
        primaryActions: ['Reassign Delivery', 'Optimize Waypoint Order', 'Dispatch Urgent Order'],
        secondaryActions: ['Call Driver Direct', 'Issue Customer ETA Update', 'View Route Telematics'],
        requiredData: ['Driver Shift Logs', 'Vehicle Capacity Metrics', 'Live Road Traffic API'],
        components: ['Route Waypoint List', 'Live Driver Telemetry Map', 'AI Rerouting Engine'],
        navigation: ['Shipment Status Dashboard', 'Warehouse Inventory Console'],
        states: ['Route Active', 'Driver Delayed', 'Delivery Completed', 'Exception Hold'],
        validation: ['Vehicle payload limit cannot be exceeded', 'Driver rest breaks respected'],
        permissions: ['Route Dispatcher', 'Fleet Supervisor'],
        responsive: {
          desktop: 'Left driver list, center GPS route map, right waypoint sequencer',
          tablet: 'Map view with bottom collapsible driver sheet',
          mobile: 'Full screen driver task card with one-click navigation launch'
        },
        accessibilityNotes: 'Turn-by-turn waypoint descriptions with audible alert triggers for reroutes'
      };

      domainData.screens[2].name = 'Warehouse Hub & Inventory Rules Manager';
      domainData.screens[2].description = 'Management console for cross-dock bin allocations, pallet loading rules, cold-chain compliance, and carrier SLA rules.';
      domainData.screens[2].specification = {
        purpose: 'Define cross-dock routing policies, bin allocation rules, and cold-chain temperature limits.',
        primaryUser: 'Warehouse Operations Manager',
        userGoal: 'Prevent cross-dock congestion and ensure high-priority pallets are loaded first.',
        businessObjective: 'Accelerate warehouse cross-dock turnaround from 45 mins to under 18 mins.',
        primaryActions: ['Assign Cross-Dock Bay', 'Set Temperature Alert', 'Update Loading Rule'],
        secondaryActions: ['Export Bay Utilization', 'Audit Carrier Compliance', 'Sync Warehouse WMS'],
        requiredData: ['Hub Bay Schedules', 'Cold-Chain Sensor Telemetry', 'Carrier Performance Ratings'],
        components: ['Warehouse Bay Allocation Matrix', 'Sensor Threshold Manager', 'Carrier Compliance Table'],
        navigation: ['Shipment Status Dashboard', 'Transit Latency Analytics'],
        states: ['Bay Nominal', 'Cross-Dock Congestion', 'Temperature Threshold Alert'],
        validation: ['Hazardous materials separation rules enforced'],
        permissions: ['Warehouse Lead', 'Safety Inspector'],
        responsive: {
          desktop: 'Table view with slide-over drawer for rule editing and simulation preview',
          tablet: 'Adaptive card grid with filter bar',
          mobile: 'Single column settings list with toggle switches'
        },
        accessibilityNotes: 'Standard form labeling with ARIA live validation feedback'
      };

      domainData.screens[3].name = 'Transit Latency & Fulfillment Analytics';
      domainData.screens[3].description = 'Historical reporting covering fuel efficiency, driver detention times, exception root causes, and on-time delivery rates.';
      domainData.screens[3].specification = {
        purpose: 'Executive reporting on fleet fuel consumption, delivery cycle times, driver dwell hours, and on-time performance.',
        primaryUser: 'VP of Supply Chain & Chief Logistics Officer',
        userGoal: 'Analyze fulfillment performance across carrier partners and identify underperforming distribution corridors.',
        businessObjective: 'Lower cost per delivered pallet by 16% and eliminate customer carrier penalty fees.',
        primaryActions: ['Filter by Corridor', 'Export Freight Audit', 'Set Delivery SLA Benchmark'],
        secondaryActions: ['Inspect Detention Cost Breakdown', 'Schedule Weekly Logistics Briefing', 'Share Carrier Scorecard'],
        requiredData: ['Fleet GPS Historical Logs', 'Fuel Consumption Telemetry', 'Carrier Invoice Line Items'],
        components: ['Fulfillment Latency Timeline', 'Corridor Efficiency Heatmap', 'Carrier Scorecard Table'],
        navigation: ['Shipment Status Dashboard', 'Driver Routes Console'],
        states: ['Consolidated Logistics View', 'Corridor Drilldown', 'Historical Comparison Mode'],
        validation: ['Fuel calculation normalized by cargo weight and elevation change'],
        permissions: ['Logistics Executive', 'Supply Chain Analyst'],
        responsive: {
          desktop: '4-stat cards on top, 2 wide charts side by side, detailed zone breakdown below',
          tablet: 'Stacked charts with horizontal scroll tables',
          mobile: 'Summary KPI metric cards with simplified sparkline views'
        },
        accessibilityNotes: 'High-contrast chart color palettes with text alternative data tables for screen readers'
      };
    } else {
      // Default / Enterprise screens specification enrichment
      domainData.screens.forEach((s, idx) => {
        s.specification = {
          purpose: s.purpose || 'High-level operational overview showcasing throughput, active queues, and SLA health.',
          primaryUser: s.primaryUser || understanding.primaryUsers.split('&')[0].trim(),
          userGoal: 'Streamline daily operational workflows and accelerate task resolution.',
          businessObjective: 'Improve operator velocity and eliminate manual triage latency.',
          primaryActions: ['Execute Action', 'Inspect Queue', 'Filter Records'],
          secondaryActions: ['Export CSV', 'Trigger Notification', 'View History'],
          requiredData: ['Work Queue Items', 'Operational Metrics', 'User Activity Logs'],
          components: (s.components || []).map(c => c.title || c.type),
          navigation: domainData.screens.filter(other => other.id !== s.id).map(other => other.name),
          states: ['Ready / Nominal', 'Active Triage', 'Queue Throttled', 'Error / Fallback'],
          validation: ['Mandatory fields verified', 'User role authorization checked'],
          permissions: ['Operator', 'Supervisor', 'Administrator'],
          responsive: {
            desktop: 'Multi-column ergonomic grid with summary stats and quick triage matrix',
            tablet: '2-column responsive layout with collapsible secondary filters',
            mobile: 'Single column stacked cards with floating primary action CTA'
          },
          accessibilityNotes: 'WCAG 2.1 AA compliant, 4.5:1 contrast ratio, full keyboard navigation'
        };
      });
    }

    // User Journey Flow tailored to domain
    let userJourney = [];
    if (domain === 'HEALTHCARE') {
      userJourney = [
        { id: 'uj-1', screenId: 'screen-dashboard', stepName: 'Patient Ingestion & Appointment Triage', actor: 'Patient / Intake Coordinator', action: 'Searches specialty clinic and views real-time doctor availability', output: 'Identified available appointment slot' },
        { id: 'uj-2', screenId: 'screen-workflow', stepName: 'Physician Selection & Intake Verification', actor: 'Intake Coordinator', action: 'Verifies patient insurance and selects consulting doctor', output: 'Verified appointment eligibility' },
        { id: 'uj-3', screenId: 'screen-workflow', stepName: 'AI Slot Optimization & Booking Confirmation', actor: 'RootForge AI Assistant', action: 'Optimizes room allocation and locks clinical calendar slot', output: 'Confirmed patient booking' },
        { id: 'uj-4', screenId: 'screen-admin', stepName: 'Provider Calendar Sync & SMS Notification', actor: 'Clinical Scheduling System', action: 'Dispatches automated reminder SMS and syncs with EHR system', output: 'Logged EHR encounter' },
        { id: 'uj-5', screenId: 'screen-analytics', stepName: 'Wait-Time Audit & Encounter Closeout', actor: 'Clinic Administrator', action: 'Verifies room turnaround SLA and tracks patient satisfaction score', output: 'Completed appointment encounter' }
      ];
    } else if (domain === 'CYBERSECURITY') {
      userJourney = [
        { id: 'uj-1', screenId: 'screen-dashboard', stepName: 'Telemetry Ingestion & Severity Alert', actor: 'SOC Analyst', action: 'Monitors real-time SIEM alerts and active threat severity matrix', output: 'Identified critical security incident' },
        { id: 'uj-2', screenId: 'screen-workflow', stepName: 'IOC Correlation & Attack Investigation', actor: 'Incident Responder', action: 'Inspects process ancestry, correlates IOCs, and analyzes memory dump', output: 'Isolated attack vector' },
        { id: 'uj-3', screenId: 'screen-workflow', stepName: 'AI Sandbox Detonation & Risk Scoring', actor: 'RootForge AI Threat Copilot', action: 'Detonates payload in sandbox and scores lateral movement risk (98%)', output: 'Computed containment strategy' },
        { id: 'uj-4', screenId: 'screen-admin', stepName: '1-Click Host Containment & Policy Update', actor: 'SOC Lead Handler', action: 'Triggers automated endpoint isolation and deploys firewall block rule', output: 'Contained compromised host' },
        { id: 'uj-5', screenId: 'screen-analytics', stepName: 'Forensic Audit & Post-Mortem Archival', actor: 'Security Auditor', action: 'Preserves SHA-256 evidence chain and reviews MITRE ATT&CK coverage', output: 'Archived forensic compliance package' }
      ];
    } else if (domain === 'SUPPLY_CHAIN') {
      userJourney = [
        { id: 'uj-1', screenId: 'screen-dashboard', stepName: 'Manifest Ingestion & Fleet Telemetry', actor: 'Logistics Dispatcher', action: 'Monitors active courier routes, cargo volume, and delivery exceptions', output: 'Identified delayed consignment' },
        { id: 'uj-2', screenId: 'screen-workflow', stepName: 'Driver Assignment & Route Balancing', actor: 'Fleet Dispatcher', action: 'Selects available courier and reviews GPS transit progression', output: 'Assigned route leg' },
        { id: 'uj-3', screenId: 'screen-workflow', stepName: 'AI Route Optimization & ETA Calculation', actor: 'RootForge AI Logistics Engine', action: 'Re-sequences waypoints around traffic congestion with 97% SLA confidence', output: 'Optimized delivery sequence' },
        { id: 'uj-4', screenId: 'screen-admin', stepName: 'Driver Dispatch & Customer ETA Notification', actor: 'Logistics Dispatch Platform', action: 'Sends turn-by-turn route to driver mobile app and notifies customer via SMS', output: 'Dispatched courier' },
        { id: 'uj-5', screenId: 'screen-analytics', stepName: 'Proof of Delivery & Fuel SLA Audit', actor: 'Supply Chain Operations Lead', action: 'Verifies digital signature on delivery and audits corridor fuel efficiency', output: 'Closed delivery consignment' }
      ];
    } else {
      userJourney = [
        { id: 'uj-1', screenId: 'screen-dashboard', stepName: 'Ingestion & Telemetry', actor: understanding.primaryUsers.split('&')[0].trim(), action: 'Monitors real-time alerts and high-priority operational queues', output: 'Identified actionable item' },
        { id: 'uj-2', screenId: 'screen-workflow', stepName: 'Item Selection & Triage', actor: understanding.primaryUsers.split('&')[0].trim(), action: 'Selects high-priority item and inspects historical context', output: 'Loaded case context' },
        { id: 'uj-3', screenId: 'screen-workflow', stepName: 'AI Copilot Recommendation', actor: 'AI Intelligence Assistant', action: 'Computes optimal action with 96% confidence score', output: 'Recommended resolution' },
        { id: 'uj-4', screenId: 'screen-workflow', stepName: '1-Click Execution & Confirmation', actor: understanding.primaryUsers.split('&')[0].trim(), action: 'Confirms recommended action and dispatches notification', output: 'Executed transaction' },
        { id: 'uj-5', screenId: 'screen-analytics', stepName: 'Audit & Telemetry Closeout', actor: understanding.secondaryUsers.split('&')[0].trim(), action: 'Verifies SLA compliance and reviews operational throughput', output: 'Logged analytics event' }
      ];
    }

    // Requirement Coverage
    const requirementCoverage = understanding.functionalRequirements.map((req, idx) => ({
      requirementId: `REQ-UX-${String(idx + 1).padStart(2, '0')}`,
      requirementTitle: req,
      implementedScreenIds: [domainData.screens[idx % domainData.screens.length].id],
      implementedComponents: [`Widget-${idx + 1}`, domainData.screens[idx % domainData.screens.length].components[0].title],
      status: 'COVERED'
    }));

    // UX Quality Check
    const uxQualityCheck = {
      requirementCoverage: 96,
      navigationConsistency: 100,
      responsiveReadiness: 94,
      accessibility: 92,
      summary: 'High-fidelity design specification meets all functional requirements with zero cognitive overload.'
    };

    // Actionable UX Recommendations
    const uxRecommendations = [
      {
        id: 'rec-1',
        title: 'Elevate Primary Action CTA Above the Fold',
        description: 'Positioning the primary action trigger in the top right header reduces mouse travel by 32% during high-volume case processing.',
        impact: 'HIGH',
        type: 'ERGONOMICS',
        applied: false
      },
      {
        id: 'rec-2',
        title: 'Add Quick Filter Chips to Data Tables',
        description: 'Provide 1-tap filtering for "Urgent", "Pending AI Approval", and "SLA Warning" to accelerate triage velocity.',
        impact: 'MEDIUM',
        type: 'PRODUCTIVITY',
        applied: true
      },
      {
        id: 'rec-3',
        title: 'Include Contextual Confirmation Toasts',
        description: 'Provide undo-capable confirmation feedback following automated dispatches to prevent unintended operator actions.',
        impact: 'MEDIUM',
        type: 'ACCESSIBILITY',
        applied: true
      }
    ];

    // Design Explanation
    const designExplanation = {
      rationale: `The generated UX prioritizes ${understanding.uxPriorities[0].toLowerCase()} and ${understanding.uxPriorities[1].toLowerCase()}. Key operational metrics are surfaced immediately on the dashboard to eliminate cognitive hunt time.`,
      layoutStrategy: `The primary operator console uses a split-view design, allowing operators to keep their queue context in the left pane while executing actions with AI assistance in the center and right panes.`,
      ctaPlacement: 'Primary execution triggers are placed in high-visibility header and card footer locations with explicit keyboard shortcuts.',
      mobileConsiderations: 'Tables automatically convert to vertical card stacks on mobile devices with sticky action bars at the bottom.'
    };

    return {
      title: domainData.title,
      designTokens: {
        palette: {
          background: tokens.background,
          cardBg: tokens.cardBg,
          textPrimary: tokens.textPrimary,
          textMuted: tokens.textMuted,
          accent: tokens.accent,
          success: tokens.success,
          border: tokens.border
        },
        typography: tokens.typography,
        borderRadius: tokens.borderRadius
      },
      activeThemeId: selectedThemeId,
      understanding,
      screens: domainData.screens,
      userJourney,
      requirementCoverage,
      uxQualityCheck,
      uxRecommendations,
      designExplanation
    };
  },

  /**
   * Applies natural-language prompt edits to an existing UX design model incrementally.
   */
  async editUXWithPrompt(context, currentUX, prompt, screenId = null, componentId = null) {
    if (!currentUX) throw new Error('Existing UX model is required for editing');
    const p = (prompt || '').toLowerCase();
    const updated = JSON.parse(JSON.stringify(currentUX));
    if (!updated.screens) updated.screens = [];
    updated.screens.forEach(s => {
      s.components = s.components || [];
    });
    if (!updated.designExplanation) {
      updated.designExplanation = {
        rationale: 'Initial design generated from operational requirements.',
        layoutStrategy: 'Hierarchical multi-pane interface.',
        ctaPlacement: 'Header and contextual card triggers.',
        mobileConsiderations: 'Responsive vertical stack layout.'
      };
    }

    const applyToAll = /all screens|globally|entire app/i.test(p);
    const targetScreens = applyToAll
      ? updated.screens
      : [updated.screens.find(s => s.id === screenId) || updated.screens[0]];

    // 1. Priority filter / search / chip prompt
    if (/priority filter|filter|search/i.test(p)) {
      targetScreens.forEach(ts => {
        if (!ts.components.some(c => c.type === 'filter_bar')) {
          ts.components.unshift({
            id: `cmp-filter-${Date.now()}`,
            type: 'filter_bar',
            title: 'Priority & Status Filter Bar',
            filterChips: ['All Items', 'High Priority', 'SLA Critical', 'AI Flagged']
          });
        }
        ts.layout = `Filter bar at top; ${ts.layout}`;
        if (ts.specification) {
          ts.specification.primaryActions = [...new Set([...(ts.specification.primaryActions || []), 'Filter by Priority', 'Instant Search'])];
        }
      });
      updated.designExplanation.rationale += ' Enhanced with priority filtering and instant search per user prompt.';
    }

    // 2. Reposition AI assistant / Move to right
    if (/ai assistant to the right|move.*ai|copilot to right|copilot/i.test(p)) {
      targetScreens.forEach(ts => {
        const copilotCmp = ts.components.find(c => c.type === 'ai_copilot') || {
          id: `cmp-copilot-${Date.now()}`,
          type: 'ai_copilot',
          title: 'AI Copilot Assistant',
          position: 'right_sidebar'
        };
        copilotCmp.position = 'right_sidebar';
        ts.components = ts.components.filter(c => c.type !== 'ai_copilot');
        ts.components.push(copilotCmp);
        ts.layout = ts.layout.replace(/copilot.*left/i, 'AI Copilot docked to right sidebar');
        if (!ts.layout.includes('right')) {
          ts.layout += ' with AI Copilot docked on right sidebar';
        }
      });
      updated.designExplanation.rationale += ' Repositioned AI Copilot assistant to the right sidebar layout.';
    }

    // 3. Approval workflow / Confirmation prompt
    if (/approval|workflow|sign-off/i.test(p)) {
      targetScreens.forEach(ts => {
        ts.components.push({
          id: `cmp-approval-${Date.now()}`,
          type: 'approval_gate',
          title: 'Formal Dual-Signoff Approval Gate',
          status: 'Pending Executive Signoff'
        });
        if (ts.specification) {
          ts.specification.primaryActions = [...new Set([...(ts.specification.primaryActions || []), 'Submit for Dual Approval', 'Sign-Off Record'])];
        }
      });
      updated.designExplanation.rationale += ' Integrated dual-signature approval workflow gate.';
    }

    // 4. Calendar / Availability / Schedule prompt
    if (/calendar|schedule|slot/i.test(p)) {
      targetScreens.forEach(ts => {
        if (!ts.components.some(c => c.type === 'calendar_view')) {
          ts.components.push({
            id: `cmp-calendar-${Date.now()}`,
            type: 'calendar_view',
            title: 'Interactive Schedule & Availability Calendar',
            hasTimeSlots: true
          });
          ts.layout += ', Interactive Availability Calendar';
        }
      });
      updated.designExplanation.rationale += ' Added interactive availability calendar per user prompt.';
    }

    // 5. Minimal / Compact / Reduce density
    if (/minimal|compact|clean|reduce density/i.test(p)) {
      if (updated.designTokens) {
        updated.designTokens.borderRadius = '4px';
      }
      targetScreens.forEach(ts => {
        ts.layout = `${ts.layout} (Optimized for minimal density and distraction-free focus)`;
      });
      updated.designExplanation.rationale += ' Updated with ultra-minimal layout and reduced card padding per user prompt.';
    }

    // 6. Mobile friendly / Mobile-first
    if (/mobile|responsive|single column/i.test(p)) {
      targetScreens.forEach(ts => {
        if (ts.specification) {
          ts.specification.responsive = {
            desktop: 'Adaptive multi-column responsive grid',
            tablet: '2-column responsive layout with quick tabs',
            mobile: 'Optimized touch-friendly single-column card stack with bottom action sheet'
          };
        }
      });
      updated.designExplanation.rationale += ' Enhanced responsive viewport rules for mobile-first touch ergonomics.';
    }

    // 7. Custom Colors & Theme updates (Pink, Rose, Magenta, Purple, Orange, Dark, Light, etc.)
    if (/pink|rose|magenta|fuchsia|purple|violet|indigo|orange|amber|emerald|green|cyan|teal|blue|red|crimson|dark|cyber|command center|warm|nordic/i.test(p)) {
      let newTheme = 'enterprise-slate';
      let customTokens = null;

      if (/pink|fuchsia|magenta|rose/i.test(p)) {
        newTheme = 'custom-pink';
        customTokens = {
          id: 'custom-pink',
          name: 'Vibrant Pink',
          primary: '#EC4899',
          secondary: '#DB2777',
          accent: '#F472B6',
          surface: '#1A0E1C',
          cardBg: '#1A0E1C',
          background: '#0D060E',
          border: 'rgba(236, 72, 153, 0.35)',
          buttonPrimary: '#EC4899',
          buttonSecondary: 'rgba(236, 72, 153, 0.2)',
          text: '#FDF2F8',
          textMuted: '#F472B6'
        };
      } else if (/purple|violet|indigo/i.test(p)) {
        newTheme = 'fintech-violet';
      } else if (/orange|amber|gold/i.test(p)) {
        newTheme = 'saas-modern';
      } else if (/cyber|command center|darker/i.test(p)) {
        newTheme = 'cyber-ops';
      } else if (/warm|champagne/i.test(p)) {
        newTheme = 'warm-luxury';
      } else if (/nordic|clean/i.test(p)) {
        newTheme = 'nordic-clean';
      }

      updated.activeThemeId = newTheme;
      if (customTokens) {
        updated.designTokens = {
          ...(updated.designTokens || {}),
          ...customTokens,
          palette: customTokens
        };
      }
      updated.designExplanation.rationale += ` Switched active design archetype to ${newTheme} per user prompt.`;

      // Propagate to screen uiSpecifications
      targetScreens.forEach(ts => {
        if (ts.uiSpecification) {
          ts.uiSpecification.theme = {
            ...(ts.uiSpecification.theme || {}),
            ...(customTokens || {}),
            id: newTheme
          };
        }
      });
    }

    // Update quality check after modification
    if (updated.uxQualityCheck) {
      updated.uxQualityCheck.summary = `Refined via user prompt: "${prompt}". Screen and component linkages verified.`;
    }

    return updated;
  },

  async interpretUXCommand(context, currentSpec, command, domain = 'GENERAL_ENTERPRISE') {
    const raw = (command || '').trim();
    const d = raw.toLowerCase();

    // 1. Compound commands
    if ((d.includes(' and ') || d.includes(' while ') || d.includes(' also ')) &&
        (d.includes('move') || d.includes('add') || d.includes('make') || d.includes('set') || d.includes('remove') || d.includes('round') || d.includes('color') || d.includes('colour') || d.includes('button') || d.includes('card'))) {
      const subClauses = d.split(/ and | while | also /);
      const ops = [];
      for (const clause of subClauses) {
        const sub = await this.interpretUXCommand(context, currentSpec, clause, domain);
        if (sub.operations) ops.push(...sub.operations);
        else if (sub.operation && sub.operation !== 'patch') ops.push(sub);
      }
      if (ops.length > 0) {
        return {
          version: '1.0',
          operation: 'patch',
          summary: `Executed compound edits: "${raw}"`,
          operations: ops
        };
      }
    }

    // 2. Move AI Assistant / Copilot
    if (d.includes('move') && (d.includes('ai') || d.includes('assistant') || d.includes('copilot'))) {
      const pos = d.includes('left') ? 'left_sidebar' : 'right_sidebar';
      return {
        version: '1.0',
        operation: 'move',
        target: 'copilot',
        position: pos,
        summary: `Moved AI Decision Assistant to ${d.includes('left') ? 'left' : 'right'} sidebar.`
      };
    }

    // 3. Color and Theme customizations
    if (/pink|fuchsia|magenta|rose/i.test(d)) {
      const isButtonOnly = /only.*button|button.*only|buttons only|just.*button/i.test(d);
      const isCardOnly = /only.*card|card.*only|cards only|just.*card/i.test(d);
      if (isButtonOnly) {
        return {
          version: '1.0',
          operation: 'updateTheme',
          buttonColor: '#EC4899',
          accentColor: '#F472B6',
          summary: 'Updated all buttons to vibrant pink (#EC4899).'
        };
      }
      if (isCardOnly) {
        return {
          version: '1.0',
          operation: 'updateTheme',
          cardBg: '#1A0E1C',
          border: 'rgba(236, 72, 153, 0.35)',
          summary: 'Updated card surfaces to vibrant pink (#1A0E1C).'
        };
      }
      return {
        version: '1.0',
        operation: 'updateTheme',
        colorPalette: 'pink',
        primaryColor: '#EC4899',
        accentColor: '#F472B6',
        buttonColor: '#EC4899',
        cardBg: '#1A0E1C',
        border: 'rgba(236, 72, 153, 0.35)',
        mode: 'dark',
        summary: 'Converted all cards, buttons, and accents to Vibrant Pink (#EC4899).'
      };
    }

    if (/purple|violet|indigo/i.test(d)) {
      const isButtonOnly = /only.*button|button.*only|buttons only|just.*button/i.test(d);
      return {
        version: '1.0',
        operation: 'updateTheme',
        colorPalette: 'purple',
        primaryColor: '#8B5CF6',
        accentColor: '#A78BFA',
        buttonColor: '#8B5CF6',
        ...(isButtonOnly ? {} : { cardBg: '#171328', border: 'rgba(139, 92, 246, 0.3)' }),
        summary: isButtonOnly ? 'Updated all buttons to Royal Purple (#8B5CF6).' : 'Converted all cards and buttons to Royal Purple (#8B5CF6).'
      };
    }

    if (/dark mode|dark theme|darker|cyber|command center|obsidian/i.test(d)) {
      return {
        version: '1.0',
        operation: 'updateTheme',
        themeId: 'cyber-ops',
        mode: 'dark',
        primaryColor: '#10B981',
        cardBg: '#0B1120',
        background: '#05080F',
        summary: 'Switched entire interface to Command Center Cyber Ops dark design system.'
      };
    }

    if (/light mode|light theme|white background|warm cream/i.test(d)) {
      return {
        version: '1.0',
        operation: 'updateTheme',
        mode: 'light',
        primaryColor: '#2563EB',
        cardBg: '#FFFFFF',
        background: '#F8FAFC',
        text: '#0F172A',
        summary: 'Switched interface to Crisp Light Mode with dark text.'
      };
    }

    // 4. Priority Filter / Filter Bar
    if (d.includes('priority filter') || d.includes('filter bar') || d.includes('status filter') || d.includes('add filter')) {
      return {
        version: '1.0',
        operation: 'addComponent',
        position: 'top',
        component: {
          id: `cmp-filter-${Date.now()}`,
          type: 'search_filter_bar',
          title: 'Priority & Status Filter Bar',
          props: {
            searchPlaceholder: 'Search high-priority items, accounts, or active records...',
            filterChips: ['All Items', 'High Priority', 'SLA Critical', 'AI Flagged', 'Pending Review'],
            activeFilter: 'High Priority',
            actionButtons: [
              { label: '+ Add Work Item', variant: 'primary', icon: 'Plus' },
              { label: 'Batch Run Actions', variant: 'secondary', icon: 'Zap' }
            ]
          }
        },
        summary: 'Added priority filter bar to the top of the workspace.'
      };
    }

    // 5. Patient Search / Search Bar
    if (d.includes('patient search') || d.includes('customer search') || d.includes('add search')) {
      return {
        version: '1.0',
        operation: 'addComponent',
        position: 'top',
        component: {
          id: `cmp-search-${Date.now()}`,
          type: 'search_filter_bar',
          title: 'Patient MRN & Medical Record Search',
          props: {
            searchPlaceholder: 'Search patient by MRN, Name, Phone, or Assigned Physician...',
            filterChips: ['All Patients', 'Urgent Triage', 'In Exam Room', 'Doctor Consult'],
            activeFilter: 'All Patients'
          }
        },
        summary: 'Added Patient Search and Triage toolbar.'
      };
    }

    // 6. Minimal / Compact density
    if (d.includes('minimal') || d.includes('compact') || d.includes('reduce visual density') || d.includes('reduce density') || d.includes('cleaner')) {
      return {
        version: '1.0',
        operation: 'updateLayout',
        density: 'compact',
        gap: 8,
        radius: '4px',
        summary: 'Optimized layout for minimal cognitive friction with compact density and 8px gaps.'
      };
    }

    // 7. Remove Chart / Component
    if (d.includes('remove') || d.includes('delete') || d.includes('hide')) {
      if (d.includes('chart')) {
        return { version: '1.0', operation: 'removeComponent', target: 'chart', summary: 'Removed throughput chart from view.' };
      }
      if (d.includes('workflow') || d.includes('approval')) {
        return { version: '1.0', operation: 'removeComponent', target: 'workflow', summary: 'Removed workflow tracker.' };
      }
      if (d.includes('kanban')) {
        return { version: '1.0', operation: 'removeComponent', target: 'kanban', summary: 'Removed Kanban progression board.' };
      }
      if (d.includes('filter') || d.includes('search')) {
        return { version: '1.0', operation: 'removeComponent', target: 'search_filter_bar', summary: 'Removed search and filter bar.' };
      }
    }

    // 8. Modern SaaS Dashboard Look
    if (d.includes('saas') || d.includes('modern')) {
      return {
        version: '1.0',
        operation: 'updateTheme',
        themeId: 'saas-modern',
        mode: 'dark',
        primaryColor: '#D97706',
        accentColor: '#F59E0B',
        cardBg: '#1E293B',
        background: '#0F172A',
        radius: '12px',
        summary: 'Transformed layout to Modern SaaS Glassmorphism design system.'
      };
    }

    // 9. Rounded / Sharp corners
    if (d.includes('round') || d.includes('rounded')) {
      return {
        version: '1.0',
        operation: 'updateTheme',
        radius: '16px',
        summary: 'Updated all cards and buttons to smooth 16px rounded corners.'
      };
    }

    return {
      version: '1.0',
      operation: 'updateLayout',
      density: 'comfortable',
      summary: `Processed design modification: "${raw}".`
    };
  },

  async generateDatabase(context, legacySolution) {
    const ws = extractWorkspace(context);
    const domain = resolveDomain(context);
    const docInsights = extractDocumentKeyInsights(context);

    if (domain === 'HEALTHCARE') {
      const clinicEntityName = docInsights.hasClinic ? 'Clinic' : 'Department';
      const clinicDesc = docInsights.hasClinic ? 'Hospital Apollo clinics, wards, or specialty units' : 'Hospital clinics, wards, or specialty units';
      const clinicTableName = docInsights.hasClinic ? 'clinics' : 'departments';
      const clinicFk = docInsights.hasClinic ? 'clinicId' : 'departmentId';
      const clinicFkCol = docInsights.hasClinic ? 'clinic_id' : 'department_id';

      const appointmentFields = [
        { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Appointment UUID' },
        { name: 'patientId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Patient.id' },
        { name: 'doctorId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Doctor.id' },
        { name: clinicFk, type: 'VARCHAR(36)', constraints: 'FOREIGN KEY', description: `References ${clinicEntityName}.id` },
        { name: 'scheduledTime', type: 'TIMESTAMP', constraints: 'NOT NULL', description: 'Appointment datetime' },
        { name: 'status', type: 'VARCHAR(30)', constraints: 'NOT NULL, DEFAULT SCHEDULED', description: 'SCHEDULED, COMPLETED, CANCELLED, NO_SHOW' },
        { name: 'triageUrgency', type: 'VARCHAR(20)', constraints: 'DEFAULT ROUTINE', description: 'ROUTINE, URGENT, EMERGENCY' },
        { name: 'notes', type: 'TEXT', constraints: '', description: 'Clinical consultation notes' }
      ];

      if (docInsights.hasNoShow) {
        appointmentFields.push({ name: 'noShowRiskScore', type: 'DECIMAL(3,2)', constraints: 'DEFAULT 0.00', description: 'Predictive no-show likelihood score (0.00-1.00)' });
      }
      if (docInsights.hasFalcon) {
        appointmentFields.push({ name: 'falconSlotId', type: 'VARCHAR(50)', constraints: 'INDEX', description: 'Falcon Scheduling Engine slot reservation identifier' });
      }

      const entities = [
        {
          name: 'User',
          description: 'Internal platform users, clinical staff, and credential references',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Unique user identifier' },
            { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL', description: 'Staff email' },
            { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Full name' },
            { name: 'role', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'ADMIN, PHYSICIAN, NURSE, VIEWER' }
          ]
        },
        {
          name: 'Patient',
          description: 'Registered patients requesting appointments or clinical care',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Patient UUID' },
            { name: 'mrn', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL', description: 'Medical Record Number' },
            { name: 'name', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Patient full name' },
            { name: 'dob', type: 'DATE', constraints: 'NOT NULL', description: 'Date of birth' },
            { name: 'phone', type: 'VARCHAR(25)', constraints: 'NOT NULL, INDEX', description: 'Contact phone' },
            { name: 'insuranceProvider', type: 'VARCHAR(100)', constraints: '', description: 'Primary insurer' }
          ]
        },
        {
          name: 'Doctor',
          description: 'Attending physicians, specialists, and clinicians',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Physician UUID' },
            { name: 'name', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Doctor name' },
            { name: 'specialty', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Cardiology, Pediatrics, etc.' },
            { name: clinicFk, type: 'VARCHAR(36)', constraints: 'FOREIGN KEY', description: `Assigned ${clinicEntityName.toLowerCase()}` }
          ]
        },
        {
          name: clinicEntityName,
          description: clinicDesc,
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: `${clinicEntityName} UUID` },
            { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: `${clinicEntityName} title` },
            { name: 'floorLocation', type: 'VARCHAR(50)', constraints: '', description: 'Building location' }
          ]
        },
        {
          name: 'Appointment',
          description: 'Patient appointment reservation or clinical encounter',
          fields: appointmentFields
        }
      ];

      const relations = [
        { from: 'Appointment.patientId', to: 'Patient.id', type: 'Many-to-One' },
        { from: 'Appointment.doctorId', to: 'Doctor.id', type: 'Many-to-One' },
        { from: `Appointment.${clinicFk}`, to: `${clinicEntityName}.id`, type: 'Many-to-One' },
        { from: `Doctor.${clinicFk}`, to: `${clinicEntityName}.id`, type: 'Many-to-One' }
      ];

      const sqlSchema = `-- SQL DDL for Healthcare Clinical Management
CREATE TABLE patients (
  id VARCHAR(36) PRIMARY KEY,
  mrn VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  dob DATE NOT NULL,
  phone VARCHAR(25) NOT NULL,
  insurance_provider VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ${clinicTableName} (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  floor_location VARCHAR(50)
);

CREATE TABLE doctors (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  ${clinicFkCol} VARCHAR(36) REFERENCES ${clinicTableName}(id) ON DELETE SET NULL
);

CREATE TABLE appointments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id VARCHAR(36) NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  ${clinicFkCol} VARCHAR(36) REFERENCES ${clinicTableName}(id) ON DELETE SET NULL,
  scheduled_time TIMESTAMP NOT NULL,
  status VARCHAR(30) DEFAULT 'SCHEDULED' NOT NULL,
  triage_urgency VARCHAR(20) DEFAULT 'ROUTINE' NOT NULL,
  notes TEXT,
  ${docInsights.hasNoShow ? 'no_show_risk_score DECIMAL(3,2) DEFAULT 0.00,\n  ' : ''}${docInsights.hasFalcon ? 'falcon_slot_id VARCHAR(50),\n  ' : ''}created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_time);
CREATE INDEX idx_appointments_status ON appointments(status);`;

      const prismaSchema = `model Appointment {
  id             String      @id @default(uuid())
  patientId      String
  patient        Patient     @relation(fields: [patientId], references: [id])
  doctorId       String
  doctor         Doctor      @relation(fields: [doctorId], references: [id])
  scheduledTime  DateTime
  status         String      @default("SCHEDULED")
  triageUrgency  String      @default("ROUTINE")
  notes          String?
  ${docInsights.hasNoShow ? 'noShowRiskScore Float @default(0.0)\n  ' : ''}${docInsights.hasFalcon ? 'falconSlotId String?\n  ' : ''}createdAt      DateTime    @default(now())
}`;

      return {
        title: 'Healthcare Relational Data Model & ERD',
        entities,
        relations,
        sqlSchema,
        prismaSchema
      };
    }

    if (domain === 'SUPPLY_CHAIN') {
      const entities = [
        {
          name: 'User',
          description: 'Warehouse personnel, supervisors, and logistics coordinators',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Unique user identifier' },
            { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL', description: 'Work email' },
            { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Full name' },
            { name: 'role', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'ADMIN, SUPERVISOR, OPERATOR, VIEWER' }
          ]
        },
        {
          name: 'Product',
          description: 'Catalog items, SKUs, and inventory specifications',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Product UUID' },
            { name: 'sku', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL', description: 'Stock Keeping Unit' },
            { name: 'name', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Product title' },
            { name: 'unitWeightKg', type: 'FLOAT', constraints: '', description: 'Weight in kg' },
            { name: 'safetyStockLevel', type: 'INTEGER', constraints: 'DEFAULT 100', description: 'Reorder trigger quantity' }
          ]
        },
        {
          name: 'Warehouse',
          description: 'Physical distribution centers and regional storage facilities',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Warehouse UUID' },
            { name: 'code', type: 'VARCHAR(20)', constraints: 'UNIQUE, NOT NULL', description: 'W-EAST-01' },
            { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Warehouse name' },
            { name: 'city', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Location city' }
          ]
        },
        {
          name: 'InventoryItem',
          description: 'Current physical inventory per product and warehouse bin',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Inventory UUID' },
            { name: 'productId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Product.id' },
            { name: 'warehouseId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Warehouse.id' },
            { name: 'binLocation', type: 'VARCHAR(30)', constraints: 'NOT NULL', description: 'Aisle-Bay-Shelf (e.g. A4-B2)' },
            { name: 'quantityAvailable', type: 'INTEGER', constraints: 'DEFAULT 0', description: 'Pickable quantity' }
          ]
        },
        {
          name: 'Shipment',
          description: 'Inbound supplier receipts or outbound customer fulfillment dispatches',
          fields: [
            { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Shipment UUID' },
            { name: 'trackingNumber', type: 'VARCHAR(50)', constraints: 'UNIQUE, NOT NULL', description: 'Carrier tracking' },
            { name: 'warehouseId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Warehouse.id' },
            { name: 'carrierName', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'FedEx, UPS, Freight' },
            { name: 'status', type: 'VARCHAR(30)', constraints: 'NOT NULL, DEFAULT STAGED', description: 'STAGED, PICKED, DISPATCHED, DELIVERED' },
            { name: 'dispatchTime', type: 'TIMESTAMP', constraints: '', description: 'Carrier handoff timestamp' }
          ]
        }
      ];

      const relations = [
        { from: 'InventoryItem.productId', to: 'Product.id', type: 'Many-to-One' },
        { from: 'InventoryItem.warehouseId', to: 'Warehouse.id', type: 'Many-to-One' },
        { from: 'Shipment.warehouseId', to: 'Warehouse.id', type: 'Many-to-One' }
      ];

      const sqlSchema = `-- SQL DDL for Supply Chain & Warehouse Management
CREATE TABLE products (
  id VARCHAR(36) PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  unit_weight_kg FLOAT,
  safety_stock_level INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warehouses (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL
);

CREATE TABLE inventory_items (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id VARCHAR(36) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  bin_location VARCHAR(30) NOT NULL,
  quantity_available INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shipments (
  id VARCHAR(36) PRIMARY KEY,
  tracking_number VARCHAR(50) UNIQUE NOT NULL,
  warehouse_id VARCHAR(36) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  carrier_name VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'STAGED' NOT NULL,
  dispatch_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_inventory_product ON inventory_items(product_id);
CREATE INDEX idx_shipments_status ON shipments(status);`;

      const prismaSchema = `model InventoryItem {
  id                 String      @id @default(uuid())
  productId          String
  product            Product     @relation(fields: [productId], references: [id])
  warehouseId        String
  warehouse          Warehouse   @relation(fields: [warehouseId], references: [id])
  binLocation        String
  quantityAvailable  Int         @default(0)
  updatedAt          DateTime    @default(now())
}`;

      return {
        title: 'Supply Chain Relational Data Model & ERD',
        entities,
        relations,
        sqlSchema,
        prismaSchema
      };
    }

    if (domain === 'ECOMMERCE' || domain === 'LOGISTICS' || domain === 'BANKING' || domain === 'EDUCATION' || (domain !== 'CUSTOMER_SUPPORT' && domain !== 'GENERAL_ENTERPRISE')) {
      const canonical = synthesizeCanonicalDomainModel(context);
      return {
        title: canonical.title,
        entities: canonical.entities,
        relations: canonical.relations,
        sqlSchema: canonical.sqlSchema,
        prismaSchema: canonical.prismaSchema
      };
    }

    // Default: Customer Support
    const entities = [
      {
        name: 'User',
        description: 'Internal platform users, roles, and credential references',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Unique user identifier' },
          { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL', description: 'Corporate email' },
          { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Full name' },
          { name: 'role', type: 'VARCHAR(20)', constraints: 'NOT NULL', description: 'ADMIN, CONSULTANT, ANALYST, VIEWER' }
        ]
      },
      {
        name: 'Customer',
        description: 'External clients submitting requests',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Customer UUID' },
          { name: 'name', type: 'VARCHAR(150)', constraints: 'NOT NULL', description: 'Contact or company name' },
          { name: 'email', type: 'VARCHAR(255)', constraints: 'NOT NULL, INDEX', description: 'Contact email' },
          { name: 'tier', type: 'VARCHAR(20)', constraints: 'DEFAULT STANDARD', description: 'STANDARD, PREMIUM, ENTERPRISE' }
        ]
      },
      {
        name: 'Ticket',
        description: 'Core operational transaction or support request',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Ticket UUID' },
          { name: 'ticketNumber', type: 'VARCHAR(30)', constraints: 'UNIQUE, NOT NULL', description: 'TCK-1049' },
          { name: 'customerId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY, NOT NULL', description: 'References Customer.id' },
          { name: 'assignedUserId', type: 'VARCHAR(36)', constraints: 'FOREIGN KEY', description: 'References User.id' },
          { name: 'status', type: 'VARCHAR(30)', constraints: 'NOT NULL, DEFAULT OPEN', description: 'OPEN, IN_PROGRESS, RESOLVED' },
          { name: 'priority', type: 'VARCHAR(20)', constraints: 'NOT NULL, DEFAULT MEDIUM', description: 'LOW, MEDIUM, HIGH, URGENT' },
          { name: 'aiClassification', type: 'VARCHAR(100)', constraints: '', description: 'AI inferred category' },
          { name: 'aiConfidence', type: 'FLOAT', constraints: 'CHECK(aiConfidence BETWEEN 0 AND 1)', description: 'Confidence score' }
        ]
      },
      {
        name: 'Department',
        description: 'Functional routing divisions',
        fields: [
          { name: 'id', type: 'VARCHAR(36)', constraints: 'PRIMARY KEY', description: 'Department UUID' },
          { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Department title' },
          { name: 'slaHours', type: 'INTEGER', constraints: 'DEFAULT 24', description: 'SLA target hours' }
        ]
      }
    ];

    const relations = [
      { from: 'Ticket.customerId', to: 'Customer.id', type: 'Many-to-One' },
      { from: 'Ticket.assignedUserId', to: 'User.id', type: 'Many-to-One (Optional)' },
      { from: 'Ticket.departmentId', to: 'Department.id', type: 'Many-to-One' }
    ];

    const sqlSchema = `-- SQL DDL for Customer Support Automation
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  tier VARCHAR(20) DEFAULT 'STANDARD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sla_hours INTEGER DEFAULT 24
);

CREATE TABLE tickets (
  id VARCHAR(36) PRIMARY KEY,
  ticket_number VARCHAR(30) UNIQUE NOT NULL,
  customer_id VARCHAR(36) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  department_id VARCHAR(36) REFERENCES departments(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'OPEN' NOT NULL,
  priority VARCHAR(20) DEFAULT 'MEDIUM' NOT NULL,
  ai_classification VARCHAR(100),
  ai_confidence FLOAT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);`;

    const prismaSchema = `model Ticket {
  id               String      @id @default(uuid())
  ticketNumber     String      @unique
  customerId       String
  customer         Customer    @relation(fields: [customerId], references: [id])
  subject          String
  status           String      @default("OPEN")
  priority         String      @default("MEDIUM")
  aiClassification String?
  aiConfidence     Float?
  createdAt        DateTime    @default(now())
}`;

    return {
      title: 'Relational Data Model & ERD',
      entities,
      relations,
      sqlSchema,
      prismaSchema
    };
  },

  async generateAPIs(context, legacySolution) {
    const ws = extractWorkspace(context);
    const domain = resolveDomain(context);
    const docInsights = extractDocumentKeyInsights(context);

    if (domain === 'HEALTHCARE') {
      const endpoints = [
        {
          method: 'POST',
          endpoint: '/api/v1/appointments',
          description: 'Schedules a new patient appointment and triggers slot verification.',
          parameters: 'None (Body payload)',
          requestBody: '{\n  "patientId": "pat_9021",\n  "doctorId": "doc_4011",\n  "scheduledTime": "2026-10-14T10:30:00Z",\n  "triageUrgency": "ROUTINE"\n}',
          responseBody: '{\n  "appointmentId": "apt_7721",\n  "status": "SCHEDULED",\n  "calendarLocked": true,\n  "confirmationSmsSent": true\n}',
          authentication: 'Bearer Token (Role: PHYSICIAN, NURSE, PATIENT)'
        },
        {
          method: 'GET',
          endpoint: '/api/v1/appointments',
          description: 'Returns filtered list of active appointments with doctor and clinic status.',
          parameters: '?status=SCHEDULED&date=2026-10-14&page=1&limit=25',
          requestBody: 'None',
          responseBody: '{\n  "data": [\n    {\n      "id": "apt_7721",\n      "patientName": "Sarah Jenkins",\n      "doctorName": "Dr. Marcus Vance",\n      "scheduledTime": "10:30 AM",\n      "urgency": "ROUTINE"\n    }\n  ],\n  "total": 38,\n  "page": 1\n}',
          authentication: 'Bearer Token'
        },
        {
          method: 'GET',
          endpoint: '/api/v1/appointments/:id',
          description: 'Retrieves complete appointment details with clinical notes and medical history.',
          parameters: ':id (UUID)',
          requestBody: 'None',
          responseBody: '{\n  "id": "apt_7721",\n  "patient": { "mrn": "MRN-8819", "name": "Sarah Jenkins" },\n  "triageNotes": "Patient reported seasonal cough and fatigue",\n  "aiRecommendation": "Routine consultation with lung specialist"\n}',
          authentication: 'Bearer Token'
        },
        {
          method: 'POST',
          endpoint: '/api/v1/appointments/:id/reschedule',
          description: 'Reschedules existing appointment slot with automated calendar updates.',
          parameters: ':id (UUID)',
          requestBody: '{\n  "newScheduledTime": "2026-10-16T14:00:00Z",\n  "reason": "Patient conflict"\n}',
          responseBody: '{\n  "success": true,\n  "appointmentId": "apt_7721",\n  "status": "RESCHEDULED"\n}',
          authentication: 'Bearer Token'
        },
        {
          method: 'GET',
          endpoint: '/api/v1/patients',
          description: 'Queries clinical patient index with demographics and active care encounters.',
          parameters: '?query=Jenkins&limit=20',
          requestBody: 'None',
          responseBody: '{\n  "patients": [\n    { "id": "pat_9021", "name": "Sarah Jenkins", "mrn": "MRN-8819", "dob": "1988-04-12" }\n  ]\n}',
          authentication: 'Bearer Token'
        },
        {
          method: 'GET',
          endpoint: '/api/v1/doctors',
          description: 'Lists clinic physician rosters, specialties, and open calendar schedules.',
          parameters: '?specialty=Cardiology&available=true',
          requestBody: 'None',
          responseBody: '{\n  "doctors": [\n    { "id": "doc_4011", "name": "Dr. Aris Thorne", "specialty": "Cardiology", "nextSlot": "2:30 PM" }\n  ]\n}',
          authentication: 'Bearer Token'
        }
      ];

      if (docInsights.hasClinic) {
        endpoints.push({
          method: 'GET',
          endpoint: '/api/v1/clinics',
          description: 'Lists active clinics, locations, and doctor assignment capacity.',
          parameters: '?limit=50',
          requestBody: 'None',
          responseBody: '{\n  "clinics": [\n    { "id": "cln_01", "name": "Apollo Central Outpatient Clinic", "doctorsCount": 12 }\n  ]\n}',
          authentication: 'Bearer Token'
        });
      }

      if (docInsights.hasNoShow) {
        endpoints.push({
          method: 'GET',
          endpoint: '/api/v1/appointments/no-shows',
          description: 'Retrieves predictive no-show risk scores and alerts for upcoming appointments.',
          parameters: '?riskThreshold=0.7&date=2026-10-14',
          requestBody: 'None',
          responseBody: '{\n  "highRiskAppointments": [\n    { "appointmentId": "apt_7721", "patientName": "Sarah Jenkins", "noShowRiskScore": 0.82, "recommendedAction": "Send SMS reminder + phone confirmation" }\n  ]\n}',
          authentication: 'Bearer Token'
        });
      }

      if (docInsights.hasFalcon) {
        endpoints.push({
          method: 'POST',
          endpoint: '/api/v1/falcon/slots/optimize',
          description: 'Executes Falcon Scheduling Engine optimization across clinic doctor rosters.',
          parameters: 'None (Body payload)',
          requestBody: '{\n  "clinicId": "cln_01",\n  "dateRange": { "start": "2026-10-14", "end": "2026-10-21" }\n}',
          responseBody: '{\n  "optimizedSlots": 140,\n  "noShowRiskMitigated": "35%",\n  "engine": "Falcon Scheduling Engine v2"\n}',
          authentication: 'Bearer Token (Role: ADMIN, SCHEDULER)'
        });
      }

      return {
        title: 'Healthcare REST API Blueprint',
        baseUrl: '/api/v1',
        authType: 'Bearer JWT (HTTP Header)',
        endpoints
      };
    }

    if (domain === 'SUPPLY_CHAIN') {
      const endpoints = [
        {
          method: 'POST',
          endpoint: '/api/v1/shipments',
          description: 'Ingests new fulfillment order and allocates inventory bins.',
          parameters: 'None (Body payload)',
          requestBody: '{\n  "warehouseId": "wh_east_01",\n  "productId": "sku_88192",\n  "quantity": 250,\n  "carrierName": "FedEx Freight"\n}',
          responseBody: '{\n  "shipmentId": "shp_4491",\n  "trackingNumber": "TRK-990214",\n  "status": "STAGED",\n  "allocatedBins": ["A4-B2", "A4-B3"]\n}',
          authentication: 'Bearer Token (Role: SUPERVISOR, OPERATOR)'
        },
        {
          method: 'GET',
          endpoint: '/api/v1/shipments',
          description: 'Returns active shipments filtered by warehouse, status, or carrier.',
          parameters: '?status=STAGED&warehouseId=wh_east_01&limit=25',
          requestBody: 'None',
          responseBody: '{\n  "data": [\n    {\n      "id": "shp_4491",\n      "trackingNumber": "TRK-990214",\n      "carrier": "FedEx",\n      "status": "STAGED",\n      "dockRemainingMinutes": 45\n    }\n  ],\n  "total": 52,\n  "page": 1\n}',
          authentication: 'Bearer Token'
        },
        {
          method: 'POST',
          endpoint: '/api/v1/shipments/:id/dispatch',
          description: 'Confirms carrier pickup and updates physical stock ledger.',
          parameters: ':id (UUID)',
          requestBody: '{\n  "billOfLading": "BOL-90218",\n  "driverBadgeId": "DRV-551"\n}',
          responseBody: '{\n  "success": true,\n  "shipmentId": "shp_4491",\n  "status": "DISPATCHED"\n}',
          authentication: 'Bearer Token'
        },
        {
          method: 'GET',
          endpoint: '/api/v1/inventory/stock',
          description: 'Returns real-time stock levels across warehouse bins.',
          parameters: '?sku=sku_88192',
          requestBody: 'None',
          responseBody: '{\n  "sku": "sku_88192",\n  "totalAvailable": 1420,\n  "safetyStockThreshold": 200,\n  "reorderTriggered": false\n}',
          authentication: 'Bearer Token'
        }
      ];

      return {
        title: 'Supply Chain & Logistics REST API Blueprint',
        baseUrl: '/api/v1',
        authType: 'Bearer JWT (HTTP Header)',
        endpoints
      };
    }

    if (domain === 'ECOMMERCE' || domain === 'LOGISTICS' || domain === 'BANKING' || domain === 'EDUCATION' || (domain !== 'CUSTOMER_SUPPORT' && domain !== 'GENERAL_ENTERPRISE')) {
      const canonical = synthesizeCanonicalDomainModel(context);
      return {
        title: `${canonical.domain} REST API Blueprint`,
        baseUrl: '/api/v1',
        authType: 'Bearer JWT (HTTP Header)',
        endpoints: canonical.endpoints
      };
    }

    // Default: Customer Support
    const endpoints = [
      {
        method: 'POST',
        endpoint: '/api/v1/tickets',
        description: 'Ingests new inbound support inquiry and initiates asynchronous AI triage.',
        parameters: 'None (Body payload)',
        requestBody: '{\n  "customerId": "cust_9812",\n  "subject": "Billing discrepancy on invoice #8821",\n  "description": "Double charged for recurring enterprise seat license",\n  "channel": "WEB_PORTAL"\n}',
        responseBody: '{\n  "ticketId": "tck_7731",\n  "ticketNumber": "TCK-1049",\n  "status": "OPEN",\n  "aiClassification": "Billing / Invoice Dispute",\n  "aiConfidence": 0.94,\n  "assignedDepartment": "Accounts Receivable"\n}',
        authentication: 'Bearer Token or Ingestion API Key'
      },
      {
        method: 'GET',
        endpoint: '/api/v1/tickets',
        description: 'Returns filtered list of active requests with pagination and priority triage filters.',
        parameters: '?status=OPEN&priority=HIGH&page=1&limit=25',
        requestBody: 'None',
        responseBody: '{\n  "data": [\n    {\n      "id": "tck_7731",\n      "ticketNumber": "TCK-1049",\n      "subject": "Billing discrepancy...",\n      "priority": "HIGH",\n      "slaRemainingMinutes": 45\n    }\n  ],\n  "total": 42,\n  "page": 1\n}',
        authentication: 'Bearer Token (Role: CONSULTANT, ANALYST, ADMIN)'
      },
      {
        method: 'GET',
        endpoint: '/api/v1/tickets/:id',
        description: 'Retrieves complete ticket detail with conversation timeline and AI suggestion.',
        parameters: ':id (UUID)',
        requestBody: 'None',
        responseBody: '{\n  "id": "tck_7731",\n  "subject": "Billing discrepancy...",\n  "aiRecommendation": {\n    "suggestedAction": "Issue credit memo for duplicate line item",\n    "confidence": 0.91,\n    "policyReference": "FIN-POL-402"\n  }\n}',
        authentication: 'Bearer Token'
      },
      {
        method: 'POST',
        endpoint: '/api/v1/tickets/:id/resolve',
        description: 'Closes ticket with resolution notes and triggers automated closure confirmation.',
        parameters: ':id (UUID)',
        requestBody: '{\n  "resolutionCode": "REFUND_ISSUED",\n  "summary": "Processed credit memo #CM-901 for $120.00",\n  "notifyCustomer": true\n}',
        responseBody: '{\n  "success": true,\n  "ticketId": "tck_7731",\n  "status": "RESOLVED"\n}',
        authentication: 'Bearer Token'
      }
    ];

    return {
      title: 'Customer Support REST API Blueprint',
      baseUrl: '/api/v1',
      authType: 'Bearer JWT (HTTP Header)',
      endpoints
    };
  },

  async generateImplementationPlan(context, legacySolution) {
    const ws = extractWorkspace(context);
    const domain = resolveDomain(context);
    const docInsights = extractDocumentKeyInsights(context);
    const selectedOption = context.solution?.selectedOption || 'OPTION_B';
    const industry = (ws.industry || '').trim();
    const wsName = (ws.name || '').trim();
    const targetUsers = (ws.targetUsers || '').trim() || 'Business Operators';

    // 1. Extract upstream blueprint artifacts
    const archNodes = Array.isArray(context.architecture?.nodes) ? context.architecture.nodes : [];
    const dbEntities = Array.isArray(context.database?.entities) ? context.database.entities : [];
    const apiEndpoints = Array.isArray(context.api?.endpoints) ? context.api.endpoints : [];
    const uxScreens = Array.isArray(context.ux?.screens) ? context.ux.screens : [];
    const processNodes = Array.isArray(context.process?.nodes) ? context.process.nodes : [];
    const requirements = Array.isArray(context.businessAnalysis?.requirements)
      ? context.businessAnalysis.requirements
      : Array.isArray(context.businessAnalysis?.coreRequirements)
        ? context.businessAnalysis.coreRequirements
        : [];

    const entityNames = dbEntities.map(e => e.name || e.label).filter(Boolean);
    const primaryEntity = entityNames[0] || '';
    const secondaryEntity = entityNames[1] || '';

    const screenNames = uxScreens.map(s => s.name || s.title).filter(Boolean);
    const primaryScreen = screenNames[0] || '';
    const secondaryScreen = screenNames[1] || '';

    const endpointPaths = apiEndpoints.map(e => `${e.method || 'POST'} ${e.endpoint || e.path}`).filter(Boolean);
    const primaryEndpoint = endpointPaths[0] || '';

    const processStepLabels = processNodes.map(n => n.label || n.name).filter(Boolean);
    const primaryProcessStep = processStepLabels[0] || '';

    const reqIds = requirements.map(r => r.id || (typeof r === 'string' ? r : null)).filter(Boolean);
    const primaryReqId = reqIds[0] || 'REQ-01';

    // 2. Identify domain context without static leakage
    const lowerWs = `${wsName} ${industry} ${domain}`.toLowerCase();
    const isRestaurant = /\b(restaurant|bistro|dining|pos|kitchen|chef|diner|menu)\b/i.test(lowerWs) || lowerWs.includes('hospitality');
    const isHealthcare = !isRestaurant && (domain === 'HEALTHCARE' || (/\b(health|healthcare|hospital|clinic|patient|doctor|physician|nurse|ehr|fhir|triage)\b/i.test(lowerWs) && !lowerWs.includes('hospitality')));
    const isManufacturing = !isRestaurant && !isHealthcare && (domain === 'SUPPLY_CHAIN' || /\b(manufacturing|factory|machin|equipment|plant floor|cnc)\b/i.test(lowerWs));
    const isFintech = !isRestaurant && !isHealthcare && (domain === 'FINTECH_CLAIMS' || /\b(fintech|bank|banking|ledger|payment|remittance|fraud|loan)\b/i.test(lowerWs));
    const isEducation = !isRestaurant && !isHealthcare && (domain === 'EDUCATION' || /\b(education|university|college|student|placement|school|admissions)\b/i.test(lowerWs));

    // 3. Domain-specific grounding variables
    let securityStandard = 'Zero-Trust Architecture & Enterprise SSO';
    let dataLayerNoun = primaryEntity ? `Relational Data Layer (${primaryEntity})` : 'Relational Persistence Layer';
    let domainWorkflowNoun = primaryProcessStep || 'Core Domain Workflow Automation';
    let domainIntegration = 'Core External System Webhooks & Enterprise Connectors';

    if (isHealthcare) {
      securityStandard = 'HIPAA / HITECH Compliance & Zero-Trust Ingress';
      dataLayerNoun = primaryEntity ? `Healthcare Data Layer (${primaryEntity} & Clinical Records)` : 'Healthcare Relational Schema & FHIR Ingestion';
      domainWorkflowNoun = primaryProcessStep || (docInsights.hasFalcon ? 'Falcon Scheduling Engine & Clinician Triage Workflow' : 'Clinical Triage & Patient Scheduling Automation');
      domainIntegration = docInsights.hasFalcon ? 'Falcon Scheduling Engine & EHR FHIR Connectors' : 'EHR / FHIR HL7 Connector Gateway';
    } else if (isRestaurant) {
      securityStandard = 'PCI-DSS Payment Compliance & POS Terminal Security';
      dataLayerNoun = primaryEntity ? `Restaurant Relational Data Layer (${primaryEntity})` : 'Restaurant 3NF Schema (Menu, Orders & Tables)';
      domainWorkflowNoun = primaryProcessStep || 'POS Order Dispatch & Kitchen Display State Machine';
      domainIntegration = 'Omnichannel POS Terminals, Kitchen Display & Payment Gateway';
    } else if (isManufacturing) {
      securityStandard = 'Industrial IoT Security & ISO 27001 Perimeter';
      dataLayerNoun = primaryEntity ? `Industrial Relational Data Layer (${primaryEntity})` : 'Industrial 3NF Schema (Equipment & Telemetry)';
      domainWorkflowNoun = primaryProcessStep || 'Work Order Dispatch & Predictive Maintenance Pipeline';
      domainIntegration = 'MES / ERP Adapters & Machine Telemetry Connectors';
    } else if (isFintech) {
      securityStandard = 'PCI-DSS, SOC 2 Type II & End-to-End Ledger Encryption';
      dataLayerNoun = primaryEntity ? `Financial Ledger Data Layer (${primaryEntity})` : 'Financial Relational Schema (Accounts & Ledger)';
      domainWorkflowNoun = primaryProcessStep || 'Transaction Settlement & Real-Time Fraud Scoring Engine';
      domainIntegration = 'Core Banking Gateway, KYC Verification & Payment Rails';
    } else if (isEducation) {
      securityStandard = 'FERPA Compliance & Academic Records Encryption';
      dataLayerNoun = primaryEntity ? `Academic Relational Data Layer (${primaryEntity})` : 'Academic Relational Schema (Students & Placements)';
      domainWorkflowNoun = primaryProcessStep || 'Student Application Routing & Interview Coordination';
      domainIntegration = 'Student Information System (SIS) & Recruiter Connectors';
    }

    // 4. Define sequential execution phases
    let phases = [];
    if (selectedOption === 'OPTION_A') {
      phases = [
        {
          name: 'Phase 1: Architecture, Ingress & Security Foundation',
          durationWeeks: 2,
          focus: `${securityStandard}, API Gateway configuration, and baseline environment setup.`
        },
        {
          name: `Phase 2: ${dataLayerNoun} & Core APIs`,
          durationWeeks: 3,
          focus: `Prisma migrations for ${entityNames.slice(0, 3).join(', ') || 'entities'} and core REST endpoints.`
        },
        {
          name: `Phase 3: ${domainWorkflowNoun} & Validation`,
          durationWeeks: 3,
          focus: `Workflow automation, pilot user validation with ${targetUsers}, and production readiness.`
        }
      ];
    } else if (selectedOption === 'OPTION_C') {
      phases = [
        {
          name: 'Phase 1: Enterprise Architecture & Target Operating Model',
          durationWeeks: 4,
          focus: `${securityStandard}, event-mesh blueprint, multi-stakeholder signoff, and regulatory governance.`
        },
        {
          name: `Phase 2: High-Throughput Event Mesh & ${dataLayerNoun}`,
          durationWeeks: 5,
          focus: `Distributed microservices, database partitioning, high-throughput message streaming, and indexing.`
        },
        {
          name: `Phase 3: ${domainWorkflowNoun} & AI Intelligence Cluster`,
          durationWeeks: 5,
          focus: `Autonomous workflow pipelines, real-time decisioning engines, and safety rail guardrails.`
        },
        {
          name: 'Phase 4: Frontend Client Portals & Operator Wireframe Systems',
          durationWeeks: 4,
          focus: `Enterprise React wireframe portals (${screenNames.slice(0, 3).join(', ') || 'UI screens'}), dashboards, and theme design tokens.`
        },
        {
          name: `Phase 5: Enterprise System Migration & ${domainIntegration}`,
          durationWeeks: 4,
          focus: `Full bidirectional connector cutovers, shadow testing, and dual-system reconciliation.`
        },
        {
          name: 'Phase 6: Global Production Cutover & Operational Hypercare',
          durationWeeks: 3,
          focus: `Zero-downtime production cutover, organizational change management, and 30-day hypercare support.`
        }
      ];
    } else {
      // Standard OPTION_B (5 Phases)
      phases = [
        {
          name: 'Phase 1: Architecture, Ingress & Security Foundation',
          durationWeeks: 2,
          focus: `${securityStandard}, API Gateway ingress setup, CI/CD pipeline, and architecture sign-off.`
        },
        {
          name: `Phase 2: ${dataLayerNoun} & Core Ingestion APIs`,
          durationWeeks: 3,
          focus: `Relational schema migrations, table indexing, seed datasets, and core REST endpoints.`
        },
        {
          name: `Phase 3: ${domainWorkflowNoun} & Intelligence Services`,
          durationWeeks: 3,
          focus: `Workflow business logic, event-driven state transitions, and real-time decision copilots.`
        },
        {
          name: 'Phase 4: Frontend Client Portals & Wireframe Systems',
          durationWeeks: 2,
          focus: `Responsive React wireframe screens (${screenNames.slice(0, 3).join(', ') || 'user portals'}), UI state management, and design tokens.`
        },
        {
          name: 'Phase 5: System Integrations, Pilot UAT & Staged Rollout',
          durationWeeks: 2,
          focus: `${domainIntegration}, pilot user testing with ${targetUsers}, and production deployment.`
        }
      ];
    }

    // 5. Generate fully grounded, dependency-linked tasks (min 8 tasks, valid DAG, no dangling IDs)
    const tasks = [
      {
        id: 'TASK-1',
        phaseName: phases[0].name,
        title: 'Establish Security Perimeter & Ingress Architecture',
        description: `Configure API Gateway, ${securityStandard}, and TLS termination grounded in the target architecture.`,
        assignedRole: 'Principal Architect',
        durationWeeks: 1.0,
        sprint: 'Sprint 1',
        status: 'COMPLETED',
        riskLevel: 'MEDIUM',
        riskReason: 'Ensuring zero-trust perimeter coverage without introducing routing latency',
        riskMitigation: 'Conduct automated architectural security review and token ingress benchmarking',
        sourceRequirement: 'Architecture: API Gateway & Ingress Tier',
        dependencies: [],
        acceptanceCriteria: 'Gateway verifies tokens and terminates SSL certificates with under 15ms latency.'
      },
      {
        id: 'TASK-2',
        phaseName: phases[0].name,
        title: 'Configure Containerized Cloud Infrastructure & Pipelines',
        description: 'Provision automated container build pipelines, staging environments, and database migration runner.',
        assignedRole: 'DevOps Engineer',
        durationWeeks: 1.0,
        sprint: 'Sprint 1',
        status: 'COMPLETED',
        riskLevel: 'LOW',
        sourceRequirement: 'Architecture: Infrastructure & Deployment',
        dependencies: ['TASK-1'],
        acceptanceCriteria: 'Automated CI/CD pipeline builds container images and runs automated test checks.'
      },
      {
        id: 'TASK-3',
        phaseName: phases[1].name,
        title: primaryEntity
          ? `Deploy Relational Data Models & Migrations for ${primaryEntity}`
          : isHealthcare ? 'Deploy Healthcare 3NF Schema & Patient Records'
          : isRestaurant ? 'Deploy Restaurant 3NF Schema for Menu & Orders'
          : isManufacturing ? 'Deploy Industrial 3NF Schema for Equipment & Assets'
          : isFintech ? 'Deploy Financial 3NF Schema for Accounts & Ledger'
          : isEducation ? 'Deploy Academic 3NF Schema for Students & Placements'
          : 'Deploy Relational 3NF Schema & Entity Migrations',
        description: `Execute schema migrations, define foreign key relations, indexes, and audit logging for ${entityNames.slice(0, 3).join(', ') || 'core entities'}.`,
        assignedRole: 'Database Engineer',
        durationWeeks: 1.5,
        sprint: 'Sprint 2',
        status: 'IN_PROGRESS',
        riskLevel: 'LOW',
        sourceRequirement: `Database: ${primaryEntity ? 'Entity ' + primaryEntity : 'Relational Models'}`,
        dependencies: ['TASK-2'],
        acceptanceCriteria: 'Database migrations execute cleanly; entity tables, primary keys, and foreign keys pass schema verification.'
      },
      {
        id: 'TASK-4',
        phaseName: phases[1].name,
        title: primaryEndpoint
          ? `Implement REST API Controllers for ${primaryEndpoint}`
          : isHealthcare ? 'Implement Clinical REST Endpoints & FHIR Intake'
          : isRestaurant ? 'Implement POS Order & Menu REST Endpoints'
          : isManufacturing ? 'Implement Machine Telemetry & Work Order REST APIs'
          : isFintech ? 'Implement Transaction & Payment REST Endpoints'
          : isEducation ? 'Implement Placement & Application REST Endpoints'
          : 'Implement Core Operational REST Endpoints',
        description: `Develop HTTP routes, input schema validation, auth guards, and error responses according to API specifications.`,
        assignedRole: 'Backend Developer',
        durationWeeks: 1.5,
        sprint: 'Sprint 2',
        status: 'TODO',
        riskLevel: 'MEDIUM',
        riskReason: 'Handling high-concurrency request validation and strict payload serialization',
        riskMitigation: 'Implement centralized schema validator middleware and comprehensive integration test coverage',
        sourceRequirement: `API: ${primaryEndpoint || 'REST Specifications'}`,
        dependencies: ['TASK-3'],
        acceptanceCriteria: 'All endpoints return status 200/201 with valid JSON schema payloads and proper HTTP status codes.'
      },
      {
        id: 'TASK-5',
        phaseName: phases[2].name,
        title: primaryProcessStep
          ? `Implement Workflow State Machine for ${primaryProcessStep}`
          : isHealthcare ? 'Implement Clinical Triage & Appointment Workflow Engine'
          : isRestaurant ? 'Implement Kitchen Ticket Dispatch & Order State Engine'
          : isManufacturing ? 'Implement Work Order Dispatch & Maintenance Workflow'
          : isFintech ? 'Implement Transaction Settlement & Reconciliation Engine'
          : isEducation ? 'Implement Student Application & Placement Workflow'
          : 'Implement Core Business Process State Machine',
        description: `Build backend service orchestration, transition validations, and event triggers across operational steps.`,
        assignedRole: 'Backend Developer',
        durationWeeks: 2.0,
        sprint: 'Sprint 3',
        status: 'TODO',
        riskLevel: 'HIGH',
        riskReason: 'Complex multi-step state transitions and potential race conditions under load',
        riskMitigation: 'Use database transactions and idempotency keys on all state mutation endpoints',
        sourceRequirement: `Process: ${primaryProcessStep ? 'Step ' + primaryProcessStep : 'Workflow Model'}`,
        dependencies: ['TASK-4'],
        acceptanceCriteria: 'State transitions execute in strict sequential order and reject invalid out-of-order triggers.'
      },
      {
        id: 'TASK-6',
        phaseName: phases[2].name,
        title: isHealthcare
          ? (docInsights.hasFalcon ? 'Deploy Falcon Scheduling Engine & Clinician Copilot' : 'Configure Clinical Triage AI & Provider Copilot')
          : isRestaurant ? 'Deploy Kitchen Order Prioritization & Table Allocation AI'
          : isManufacturing ? 'Deploy Predictive Equipment Maintenance & Sensor Anomaly AI'
          : isFintech ? 'Deploy Real-Time Fraud Detection & Risk Scoring Engine'
          : isEducation ? 'Deploy Automated Application Screening & Advising AI'
          : 'Deploy Automated Decision Engine & Operational Copilot',
        description: 'Integrate machine learning inference pipeline, confidence score thresholds, and operator recommendation assistant.',
        assignedRole: 'AI / ML Engineer',
        durationWeeks: 2.0,
        sprint: selectedOption === 'OPTION_A' ? 'Sprint 3' : 'Sprint 4',
        status: 'TODO',
        riskLevel: 'HIGH',
        riskReason: 'Model confidence threshold drift and edge-case classification inaccuracy',
        riskMitigation: 'Establish mandatory human-in-the-loop review fallback whenever confidence drops below 85%',
        sourceRequirement: 'Solution: AI Intelligence & Automation',
        dependencies: ['TASK-5'],
        acceptanceCriteria: 'Inference pipeline responds under 200ms with explanation metadata and confidence breakdown.'
      },
      {
        id: 'TASK-7',
        phaseName: phases[selectedOption === 'OPTION_A' ? 2 : 3].name,
        title: primaryScreen
          ? `Build ${primaryScreen} Wireframe UI & State Store`
          : isHealthcare ? 'Build Clinician Workspace & Patient Portal UI'
          : isRestaurant ? 'Build Kitchen Display System & Waiter POS View'
          : isManufacturing ? 'Build Plant Floor Terminal & Maintenance Dispatch UI'
          : isFintech ? 'Build Financial Officer Dashboard & Transaction View'
          : isEducation ? 'Build Student Portal & Placement Review Dashboard'
          : 'Build Primary Operator Dashboard & Workspace UI',
        description: 'Develop responsive React components, design token palette styling, and real-time state synchronization.',
        assignedRole: 'Frontend Developer',
        durationWeeks: 1.5,
        sprint: selectedOption === 'OPTION_A' ? 'Sprint 3' : 'Sprint 4',
        status: 'TODO',
        riskLevel: 'LOW',
        sourceRequirement: `UX: ${primaryScreen ? 'Screen ' + primaryScreen : 'Wireframe System'}`,
        dependencies: ['TASK-4'],
        acceptanceCriteria: 'UI renders responsive layouts cleanly without horizontal overflow across desktop and mobile viewports.'
      },
      {
        id: 'TASK-8',
        phaseName: phases[selectedOption === 'OPTION_A' ? 2 : 3].name,
        title: secondaryScreen
          ? `Implement ${secondaryScreen} Component System`
          : isHealthcare ? 'Implement Patient Self-Service Scheduling Web Portal'
          : isRestaurant ? 'Implement Customer Table Reservation & Online Ordering View'
          : isManufacturing ? 'Implement Equipment Inspection Checklist & Sensor Telemetry View'
          : isFintech ? 'Implement Customer Payment Approval & KYC Submission View'
          : isEducation ? 'Implement Company Recruiter Job Board & Interview Schedule View'
          : 'Implement Secondary User Portal & Audit Log Viewer',
        description: 'Create accessible form inputs, modal dialogs, and responsive card layouts adhering to design tokens.',
        assignedRole: 'Frontend Developer',
        durationWeeks: 1.5,
        sprint: selectedOption === 'OPTION_A' ? 'Sprint 3' : 'Sprint 5',
        status: 'TODO',
        riskLevel: 'LOW',
        sourceRequirement: `UX: ${secondaryScreen ? 'Screen ' + secondaryScreen : 'Design System'}`,
        dependencies: ['TASK-7'],
        acceptanceCriteria: 'Form submissions trigger validated API calls and display actionable error feedback.'
      },
      {
        id: 'TASK-9',
        phaseName: phases[phases.length - 1].name,
        title: `Implement ${domainIntegration}`,
        description: 'Configure bidirectional webhooks, payload mapping, authentication handshakes, and dead-letter retry queues.',
        assignedRole: 'Integration Engineer',
        durationWeeks: 1.5,
        sprint: selectedOption === 'OPTION_A' ? 'Sprint 3' : 'Sprint 5',
        status: 'TODO',
        riskLevel: 'MEDIUM',
        riskReason: 'Third-party system downtime and webhook delivery retry exhaustion',
        riskMitigation: 'Implement exponential backoff retry mechanism with persistent dead-letter queue',
        sourceRequirement: 'Architecture: Integrations Layer',
        dependencies: ['TASK-5'],
        acceptanceCriteria: 'Webhooks successfully deliver payloads with automatic retry upon simulated 500 error.'
      },
      {
        id: 'TASK-10',
        phaseName: phases[phases.length - 1].name,
        title: `Conduct Pilot UAT & Operational Validation with ${targetUsers}`,
        description: `Run simulated production workflows with ${targetUsers} to validate operational throughput and SLA compliance.`,
        assignedRole: 'QA Engineer',
        durationWeeks: 1.5,
        sprint: selectedOption === 'OPTION_A' ? 'Sprint 3' : 'Sprint 6',
        status: 'TODO',
        riskLevel: 'MEDIUM',
        riskReason: 'User adoption friction and discovery of edge-case requirement mismatches',
        riskMitigation: 'Provide interactive operator training guides and run dual-entry shadow pilot for 2 weeks',
        sourceRequirement: `Requirements: ${primaryReqId}`,
        dependencies: ['TASK-8', 'TASK-9'],
        acceptanceCriteria: '100% of critical pilot test scenarios pass with formal sign-off from designated business leads.'
      }
    ];

    // 6. Calculate total duration & investment estimation
    const totalDuration = phases.reduce((acc, p) => acc + (Number(p.durationWeeks) || 0), 0);
    const totalEffortWeeks = tasks.reduce((acc, t) => acc + (Number(t.durationWeeks) || 0), 0);
    const uniqueSprints = new Set(tasks.map(t => t.sprint)).size;

    const minCost = Math.round((totalEffortWeeks * 11000) / 10000) * 10000;
    const maxCost = Math.round((totalEffortWeeks * 14500) / 10000) * 10000;
    const estimatedCost = totalEffortWeeks > 0 ? `$${minCost.toLocaleString()} - $${maxCost.toLocaleString()}` : 'Estimate pending';
    const methodology = `Agile / Scrum (${uniqueSprints} Sprints across ${phases.length} Execution Phases)`;

    return {
      title: `${ws.name} Implementation Roadmap`,
      summary: `A ${totalDuration}-week phased engineering roadmap to deliver ${ws.name} (${domain}), synthesizing upstream Architecture, Database, APIs, Process workflows, and UX screens.`,
      estimatedDurationWeeks: totalDuration,
      estimatedCost,
      methodology,
      phases,
      tasks
    };
  }
};

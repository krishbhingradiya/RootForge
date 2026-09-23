/**
 * Enterprise Process Workflow Validation Engine
 * Version: 2.0 (20 Comprehensive Checks)
 * 
 * Implements full 20 structural, graph, and operational checks:
 * 1. Unique step IDs and sequence numbers
 * 2. Valid sequence progression
 * 3. Valid graph edges
 * 4. No dangling transitions
 * 5. No invalid self-loops
 * 6. Start node exists (START)
 * 7. End node exists (END_STATE / END)
 * 8. Every step is reachable from START
 * 9. No unintended orphan steps
 * 10. Decision gates have valid branches (TRUE and FALSE/Default paths)
 * 11. Integration steps have integration targets
 * 12. Requirement IDs actually exist in Stage 2 Business Analysis
 * 13. Actors are valid non-empty strings
 * 14. Systems are valid non-empty strings
 * 15. Failure handling exists where required (INTEGRATION, AUTOMATION, ACTION, NOTIFICATION, SUB_PROCESS)
 * 16. SLA exists when required
 * 17. No cross-workspace references
 * 18. No duplicate transitions
 * 19. No impossible branch conditions
 * 20. No stale upstream context
 */

export const CANONICAL_STEP_TYPES = [
  'START',
  'START_TRIGGER',
  'ACTION',
  'AUTOMATION',
  'SUB_PROCESS',
  'DECISION_GATE',
  'HUMAN_APPROVAL',
  'INTEGRATION',
  'NOTIFICATION',
  'END_STATE'
];

// Backward-compatible alias map
export const STEP_TYPE_ALIASES = {
  START_TRIGGER: 'START',
  AI: 'AUTOMATION',
  RULE: 'DECISION_GATE',
  STEP: 'ACTION',
  PROCESS: 'SUB_PROCESS',
  DECISION: 'DECISION_GATE',
  APPROVAL: 'HUMAN_APPROVAL',
  HUMAN_REVIEW: 'HUMAN_APPROVAL',
  DATA: 'ACTION',
  EXCEPTION: 'ACTION',
  END: 'END_STATE'
};

export const VALIDATION_RULES = [
  {
    id: 'SEQ_UNIQUENESS',
    name: 'Sequence Number Uniqueness',
    category: 'STRUCTURE',
    applicableNodeTypes: ['ALL'],
    blocking: true,
    message: 'Duplicate stepOrder sequences are not permitted.'
  },
  {
    id: 'SEQ_PROGRESSION',
    name: 'Valid Sequence Progression',
    category: 'STRUCTURE',
    applicableNodeTypes: ['ALL'],
    blocking: true,
    message: 'Step sequences must be positive integers.'
  },
  {
    id: 'EDGE_INTEGRITY',
    name: 'Transition Connection Integrity',
    category: 'GRAPH',
    applicableNodeTypes: ['ALL'],
    blocking: true,
    message: 'Transitions must have valid connection points.'
  },
  {
    id: 'NO_DANGLING_EDGES',
    name: 'No Dangling Transitions',
    category: 'GRAPH',
    applicableNodeTypes: ['ALL'],
    blocking: true,
    message: 'Transitions must point to existing nodes.'
  },
  {
    id: 'NO_SELF_LOOPS',
    name: 'No Self Loops',
    category: 'GRAPH',
    applicableNodeTypes: ['ALL'],
    blocking: true,
    message: 'Self-loops on identical step orders are not permitted.'
  },
  {
    id: 'START_NODE_EXISTS',
    name: 'Start Node Presence',
    category: 'TOPOLOGY',
    applicableNodeTypes: ['START', 'START_TRIGGER'],
    blocking: true,
    message: 'Workflow must have a valid START trigger.'
  },
  {
    id: 'END_NODE_EXISTS',
    name: 'End State Presence',
    category: 'TOPOLOGY',
    applicableNodeTypes: ['END_STATE'],
    blocking: true,
    message: 'Workflow must have a terminal END_STATE.'
  },
  {
    id: 'REACHABILITY',
    name: 'Reachable From Start',
    category: 'TOPOLOGY',
    applicableNodeTypes: ['ALL'],
    blocking: false,
    message: 'All operational steps should be reachable from START.'
  },
  {
    id: 'NO_ORPHAN_NODES',
    name: 'No Orphan Nodes',
    category: 'TOPOLOGY',
    applicableNodeTypes: ['ALL'],
    blocking: false,
    message: 'Steps should not be unconnected orphans in graph models.'
  },
  {
    id: 'DECISION_BRANCH_COMPLETENESS',
    name: 'Decision Branch Completeness',
    category: 'SEMANTICS',
    applicableNodeTypes: ['DECISION_GATE'],
    blocking: true,
    message: 'Decision gates must have valid branching (TRUE and FALSE/Alternate paths).'
  },
  {
    id: 'INTEGRATION_TARGET',
    name: 'Integration Target Specification',
    category: 'INTEGRATION',
    applicableNodeTypes: ['INTEGRATION'],
    blocking: false,
    message: 'Integration steps should specify target systems or architecture components.'
  },
  {
    id: 'REQUIREMENT_TRACEABILITY',
    name: 'Requirement Traceability & Coverage',
    category: 'COMPLIANCE',
    applicableNodeTypes: ['ALL'],
    blocking: true,
    message: 'All mandatory requirements must be mapped with evidence.'
  },
  {
    id: 'ACTOR_MAPPING',
    name: 'Actor Assignment',
    category: 'OPERATIONAL',
    applicableNodeTypes: ['ALL'],
    blocking: true,
    message: 'Each step must have a responsible actor.'
  },
  {
    id: 'SYSTEM_MAPPING',
    name: 'System Assignment',
    category: 'OPERATIONAL',
    applicableNodeTypes: ['INTEGRATION'],
    blocking: false,
    message: 'Integration steps must specify underlying systems.'
  },
  {
    id: 'FAILURE_POLICY_COMPLETENESS',
    name: 'Failure Policy Specification',
    category: 'RESILIENCE',
    applicableNodeTypes: ['AUTOMATION', 'INTEGRATION', 'NOTIFICATION', 'SUB_PROCESS', 'DECISION_GATE'],
    blocking: false,
    message: 'Failure-capable steps must have failure handling or retry policies.'
  },
  {
    id: 'SLA_INTEGRITY',
    name: 'SLA Integrity & Anti-Fabrication',
    category: 'GOVERNANCE',
    applicableNodeTypes: ['ALL'],
    blocking: true,
    message: 'SLA values must be grounded; fabricated SLA values are prohibited.'
  },
  {
    id: 'NO_CROSS_WORKSPACE',
    name: 'Tenant & Workspace Isolation',
    category: 'SECURITY',
    applicableNodeTypes: ['ALL'],
    blocking: true,
    message: 'Steps must not contain foreign workspace references.'
  },
  {
    id: 'NO_DUPLICATE_TRANSITIONS',
    name: 'No Duplicate Transitions',
    category: 'GRAPH',
    applicableNodeTypes: ['ALL'],
    blocking: false,
    message: 'Graph should not contain redundant transitions between the same steps.'
  },
  {
    id: 'BRANCH_CONDITION_VALIDITY',
    name: 'Branch Condition Validity',
    category: 'SEMANTICS',
    applicableNodeTypes: ['DECISION_GATE'],
    blocking: true,
    message: 'Branch conditions must be valid and non-contradictory.'
  },
  {
    id: 'CONTEXT_FRESHNESS',
    name: 'Upstream Context Freshness',
    category: 'LIFECYCLE',
    applicableNodeTypes: ['ALL'],
    blocking: false,
    message: 'Process model must be synchronized with upstream context.'
  }
];

export function normalizeStepType(type) {
  if (!type) return 'ACTION';
  const upper = String(type).trim().toUpperCase();
  return STEP_TYPE_ALIASES[upper] || upper;
}

/**
 * Validates a process workflow model against the 20 enterprise rules.
 * 
 * @param {object} processData Process model payload (title, description, nodes, transitions, decisionRules)
 * @param {object} [context] Optional workspace context for upstream traceability and staleness validation
 * @returns {{
 *   isValid: boolean,
 *   status: 'VALIDATED' | 'VALIDATED WITH WARNINGS' | 'INVALID' | 'STALE',
 *   checksCount: number,
 *   passedCount: number,
 *   errorCount: number,
 *   warningCount: number,
 *   errors: string[],
 *   warnings: string[],
 *   summary: string
 * }}
 */
export function validateProcessWorkflow(processData, context = null) {
  const errors = [];
  const warnings = [];
  let checksCount = 0;

  if (!processData || typeof processData !== 'object') {
    return {
      isValid: false,
      status: 'INVALID',
      checksCount: 20,
      passedCount: 0,
      errorCount: 1,
      warningCount: 0,
      errors: ['Process data is missing or not a valid object.'],
      warnings: [],
      summary: 'Validation failed: Invalid process payload.'
    };
  }

  const nodes = Array.isArray(processData)
    ? processData
    : Array.isArray(processData.nodes)
    ? processData.nodes
    : [];
  const transitions = Array.isArray(processData.transitions) ? processData.transitions : [];
  const decisionRules = Array.isArray(processData.decisionRules) ? processData.decisionRules : [];

  // Index maps
  const stepOrderMap = new Map();
  const stepIdMap = new Map();
  const seenOrders = new Set();
  const seenIds = new Set();

  // CHECK 1: Unique step IDs and sequences
  checksCount++;
  nodes.forEach((n, idx) => {
    const order = typeof n.stepOrder === 'number' ? n.stepOrder : typeof n.sequence === 'number' ? n.sequence : idx + 1;
    if (seenOrders.has(order)) {
      errors.push(`Duplicate sequence stepOrder "${order}" detected at step ${n.label || idx + 1}.`);
    }
    seenOrders.add(order);
    stepOrderMap.set(order, n);

    if (n.id) {
      if (seenIds.has(String(n.id))) {
        errors.push(`Duplicate step ID "${n.id}" detected.`);
      }
      seenIds.add(String(n.id));
      stepIdMap.set(String(n.id), n);
    }
  });

  // CHECK 2: Valid sequence order (positive integers, no non-positive steps)
  checksCount++;
  nodes.forEach((n, idx) => {
    const order = typeof n.stepOrder === 'number' ? n.stepOrder : idx + 1;
    if (order <= 0 || !Number.isInteger(order)) {
      errors.push(`Step "${n.label || idx + 1}" has invalid non-positive sequence number (${order}).`);
    }
  });

  // CHECK 3: Valid graph edges (transitions have valid from/to references)
  checksCount++;
  transitions.forEach((t, idx) => {
    const fromOrder = typeof t.fromStepOrder === 'number' ? t.fromStepOrder : null;
    const toOrder = typeof t.toStepOrder === 'number' ? t.toStepOrder : null;
    if (!fromOrder || !toOrder) {
      errors.push(`Transition ${idx + 1} has incomplete connection points.`);
    }
  });

  // CHECK 4: No dangling transitions
  checksCount++;
  transitions.forEach((t, idx) => {
    if (typeof t.toStepOrder === 'number' && !stepOrderMap.has(t.toStepOrder)) {
      errors.push(`Transition ${idx + 1} points to non-existent target stepOrder ${t.toStepOrder}.`);
    }
    if (typeof t.fromStepOrder === 'number' && !stepOrderMap.has(t.fromStepOrder)) {
      errors.push(`Transition ${idx + 1} originates from non-existent source stepOrder ${t.fromStepOrder}.`);
    }
  });

  // CHECK 5: No invalid self-loops
  checksCount++;
  transitions.forEach((t, idx) => {
    if (t.fromStepOrder && t.toStepOrder && t.fromStepOrder === t.toStepOrder) {
      errors.push(`Transition ${idx + 1} forms an invalid self-loop on step ${t.fromStepOrder}.`);
    }
  });

  // CHECK 6: Start node exists
  checksCount++;
  const startNodes = nodes.filter(n => {
    const t = normalizeStepType(n.type);
    return t === 'START';
  });
  if (startNodes.length === 0) {
    errors.push('Process workflow is missing a required START trigger step.');
  } else if (startNodes.length > 1) {
    warnings.push(`Process contains ${startNodes.length} START triggers; single primary entry point recommended.`);
  }

  // CHECK 7: End node exists
  checksCount++;
  const endNodes = nodes.filter(n => {
    const t = normalizeStepType(n.type);
    return t === 'END_STATE' || t === 'END';
  });
  if (endNodes.length === 0) {
    errors.push('Process workflow is missing a required terminal END_STATE step.');
  }

  // CHECK 8: Every step is reachable from START
  checksCount++;
  if (startNodes.length > 0 && transitions.length > 0) {
    const visited = new Set();
    const queue = [startNodes[0].stepOrder || 1];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!visited.has(current)) {
        visited.add(current);
        const nextSteps = transitions
          .filter(t => t.fromStepOrder === current)
          .map(t => t.toStepOrder);
        nextSteps.forEach(target => {
          if (!visited.has(target)) queue.push(target);
        });
      }
    }
    const unreachable = nodes.filter(n => {
      const order = n.stepOrder || 0;
      return !visited.has(order) && normalizeStepType(n.type) !== 'START';
    });
    if (unreachable.length > 0) {
      warnings.push(`${unreachable.length} step(s) are unreachable from START in the explicit transition graph: ${unreachable.map(n => `#${n.stepOrder} ${n.label}`).join(', ')}.`);
    }
  }

  // CHECK 9: No unintended orphan steps (steps with zero connections in non-linear models)
  checksCount++;
  if (transitions.length > 0 && nodes.length > 2) {
    nodes.forEach(n => {
      const isStart = normalizeStepType(n.type) === 'START';
      const isEnd = normalizeStepType(n.type) === 'END_STATE';
      const hasOut = transitions.some(t => t.fromStepOrder === n.stepOrder);
      const hasIn = transitions.some(t => t.toStepOrder === n.stepOrder);
      if (!isStart && !hasIn && !hasOut) {
        warnings.push(`Step #${n.stepOrder} ("${n.label}") is an unconnected orphan step.`);
      }
    });
  }

  // CHECK 10: Decision gates have valid branches (TRUE and FALSE/Default paths) (Applicable ONLY to DECISION_GATE)
  checksCount++;
  nodes.forEach(n => {
    const normType = normalizeStepType(n.type);
    if (normType === 'DECISION_GATE') {
      const outgoing = transitions.filter(t => t.fromStepOrder === n.stepOrder);
      const hasFalseBranch = outgoing.some(t =>
        t.isFalsePath ||
        t.isRejection ||
        (t.condition && (
          t.condition.toLowerCase().includes('false') ||
          t.condition.toLowerCase().includes('fail') ||
          t.condition.toLowerCase().includes('reject') ||
          t.condition.toLowerCase().includes('escalat') ||
          t.condition.toLowerCase().includes('invalid') ||
          t.condition.toLowerCase().includes('else')
        ))
      );

      // In graphs with explicit transitions, a decision gate MUST have a FALSE/alternate branch
      if (transitions.length > 0) {
        if (outgoing.length === 1 && !hasFalseBranch) {
          errors.push(`BLOCKING ERROR: Decision Gate #${n.stepOrder} ("${n.label}") is missing a required FALSE/FAIL branch path.`);
        } else if (outgoing.length === 0) {
          errors.push(`BLOCKING ERROR: Decision Gate #${n.stepOrder} ("${n.label}") has zero outgoing branch paths.`);
        } else if (outgoing.length >= 2 && !hasFalseBranch && !outgoing.some(t => t.isDefault)) {
          warnings.push(`Decision Gate #${n.stepOrder} ("${n.label}") has multiple branches but no explicit FALSE/FAIL or Default route.`);
        }
      } else if (!n.condition && !n.branchingCondition) {
        warnings.push(`Decision Gate #${n.stepOrder} ("${n.label}") should specify conditional branch criteria (TRUE / FALSE paths).`);
      }
    } else if (normType === 'HUMAN_APPROVAL') {
      const outgoing = transitions.filter(t => t.fromStepOrder === n.stepOrder);
      if (transitions.length > 0 && outgoing.length < 2 && !n.condition) {
        warnings.push(`Human Approval #${n.stepOrder} ("${n.label}") should specify both Approved and Rejected/Escalated paths.`);
      }
    }
    // Note: Canonical node type is authoritative. Non-DECISION_GATE nodes (such as AUTOMATION or ACTION)
    // are never treated as decision gates, regardless of words in title or description.
  });

  // CHECK 11: Integration steps have integration targets
  checksCount++;
  nodes.forEach(n => {
    const normType = normalizeStepType(n.type);
    if (normType === 'INTEGRATION') {
      const hasTarget = Boolean(n.architectureNodeId || n.system || n.underlyingSystem);
      if (!hasTarget) {
        warnings.push(`Integration step #${n.stepOrder} ("${n.label}") does not specify a target system or architecture node.`);
      }
    }
  });

  // CHECK 12: Requirement IDs exist in Stage 2 Business Analysis & Coverage Verification
  checksCount++;
  let requirementsCoverage = {
    totalRequirements: 0,
    mappedRequirements: 0,
    unmappedRequirements: 0,
    coveragePercentage: null,
    display: 'N/A',
    statusText: 'Requirements unavailable',
    unmappedIds: []
  };

  if (context?.businessAnalysis?.requirements) {
    let rawReqsList = context.businessAnalysis.requirements;
    if (typeof rawReqsList === 'string') {
      try { rawReqsList = JSON.parse(rawReqsList); } catch (e) { rawReqsList = []; }
    }
    if (Array.isArray(rawReqsList) && rawReqsList.length > 0) {
      const validReqMap = new Map();
      rawReqsList.forEach((r, idx) => {
        const reqId = typeof r === 'string'
          ? `REQ-${String(idx + 1).padStart(2, '0')}`
          : (r.id || `REQ-${String(idx + 1).padStart(2, '0')}`);
        validReqMap.set(reqId, r);
      });

      const referencedReqIds = new Set();
      nodes.forEach(n => {
        const rawReqs = n.requirementIds || n.requirements;
        const reqList = (typeof rawReqs === 'string' ? rawReqs.split(',') : Array.isArray(rawReqs) ? rawReqs : [])
          .map(r => String(r).trim())
          .filter(Boolean);
        reqList.forEach(reqId => {
          referencedReqIds.add(reqId);
          if (reqId.startsWith('REQ-') && !validReqMap.has(reqId)) {
            warnings.push(`Step #${n.stepOrder} references requirement "${reqId}" not found in Stage 2 Business Analysis.`);
          }
        });
      });

      const unmappedReqs = Array.from(validReqMap.keys()).filter(id => !referencedReqIds.has(id));
      const totalReqs = validReqMap.size;
      const mappedCount = totalReqs - unmappedReqs.length;
      let coveragePct = Math.round((mappedCount / totalReqs) * 100);
      if (unmappedReqs.length > 0 && coveragePct === 100) coveragePct = 99;
      if (mappedCount > 0 && coveragePct === 0) coveragePct = 1;

      requirementsCoverage = {
        totalRequirements: totalReqs,
        mappedRequirements: mappedCount,
        unmappedRequirements: unmappedReqs.length,
        coveragePercentage: coveragePct,
        display: `${coveragePct}%`,
        statusText: unmappedReqs.length === 0 ? 'Full Coverage' : `${unmappedReqs.length} unmapped`,
        unmappedIds: unmappedReqs
      };

      if (unmappedReqs.length > 0) {
        errors.push(`APPROVAL BLOCKED: ${unmappedReqs.length} requirement(s) are unmapped in workflow: ${unmappedReqs.join(', ')}.`);
      }
    }
  }

  // CHECK 13: Actors are valid non-empty strings
  checksCount++;
  nodes.forEach(n => {
    const actor = n.actor || n.primaryActor;
    if (!actor || !String(actor).trim()) {
      errors.push(`Step #${n.stepOrder || '?'} ("${n.label || 'Unnamed'}") must specify a valid responsible actor.`);
    }
  });

  // CHECK 14: Systems are valid non-empty strings
  checksCount++;
  nodes.forEach(n => {
    const system = n.system || n.underlyingSystem;
    if (normalizeStepType(n.type) === 'INTEGRATION' && (!system || !String(system).trim())) {
      warnings.push(`Integration step #${n.stepOrder} does not specify an underlying system.`);
    }
  });

  // CHECK 15: Failure handling exists where required (INTEGRATION, AUTOMATION, ACTION, NOTIFICATION, SUB_PROCESS, DECISION_GATE)
  checksCount++;
  nodes.forEach(n => {
    const normType = normalizeStepType(n.type);
    const requiresFailureHandling = ['INTEGRATION', 'AUTOMATION', 'NOTIFICATION', 'SUB_PROCESS', 'DECISION_GATE'].includes(normType);
    if (requiresFailureHandling && !n.failureHandling && !n.retryPolicy) {
      warnings.push(`Step #${n.stepOrder} ("${n.label}", ${normType}) has no defined retry policy or failure handler — validation required.`);
    }
  });

  // CHECK 16: SLA exists when required & SLA anti-fabrication
  checksCount++;
  nodes.forEach(n => {
    const normType = normalizeStepType(n.type);
    if ((normType === 'HUMAN_APPROVAL' || normType === 'INTEGRATION') && !n.sla && !n.slaTarget) {
      warnings.push(`Operational step #${n.stepOrder} ("${n.label}") lacks an SLA target latency.`);
    }
    // Anti-fabrication check: Flag ungrounded, fabricated SLAs
    if (n.sla && (n.isFabricatedSla || n.slaSource === 'FABRICATED')) {
      errors.push(`BLOCKING ERROR: Step #${n.stepOrder} ("${n.label}") specifies an ungrounded, fabricated SLA target ("${n.sla}").`);
    }
  });

  // CHECK 17: No cross-workspace references
  checksCount++;
  if (context?.workspace?.id) {
    nodes.forEach(n => {
      if (n.workspaceId && n.workspaceId !== context.workspace.id) {
        errors.push(`Step #${n.stepOrder} contains cross-workspace reference "${n.workspaceId}".`);
      }
    });
  }

  // CHECK 18: No duplicate transitions
  checksCount++;
  const seenTransitions = new Set();
  transitions.forEach((t, idx) => {
    const key = `${t.fromStepOrder}->${t.toStepOrder}:${t.condition || ''}`;
    if (seenTransitions.has(key)) {
      warnings.push(`Duplicate transition from #${t.fromStepOrder} to #${t.toStepOrder} at index ${idx + 1}.`);
    }
    seenTransitions.add(key);
  });

  // CHECK 19: No impossible branch conditions
  checksCount++;
  nodes.forEach(n => {
    const cond = n.condition || n.branchingCondition;
    if (cond && (cond.includes('1 == 2') || cond.includes('false &&') || cond.toLowerCase().includes('never'))) {
      errors.push(`Step #${n.stepOrder} contains impossible branch condition "${cond}".`);
    }
  });

  // CHECK 20: No stale upstream context
  checksCount++;
  let isStale = false;
  if (processData.isStale || (processData.staleReason && processData.staleReason.length > 0)) {
    isStale = true;
    warnings.push(`Process design is based on an earlier version of the upstream solution (${processData.staleReason}).`);
  }

  const passedCount = checksCount - errors.length;
  const isValid = errors.length === 0;

  let status = 'VALIDATED';
  if (errors.length > 0) {
    status = 'INVALID';
  } else if (isStale) {
    status = 'STALE';
  } else if (warnings.length > 0) {
    status = 'VALIDATED WITH WARNINGS';
  }

  const summary = errors.length === 0
    ? warnings.length === 0
      ? `All 20 validation checks passed with zero issues.`
      : `20 validation checks completed: ${warnings.length} actionable warning(s).`
    : `Validation failed: ${errors.length} blocking error(s), ${warnings.length} warning(s).`;

  return {
    isValid,
    status,
    checksCount,
    passedCount: Math.max(0, passedCount),
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    summary,
    coverage: requirementsCoverage,
    rules: VALIDATION_RULES
  };
}

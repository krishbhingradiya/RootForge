import crypto from 'crypto';
import { prisma } from '../prisma.js';
import { validateProcessWorkflow, normalizeStepType } from './processValidation.service.js';

export function extractWorkspaceRequirements(context) {
  if (!context?.businessAnalysis?.requirements) return [];
  let raw = context.businessAnalysis.requirements;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (e) { raw = [raw]; }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map((r, idx) => {
    if (typeof r === 'string') {
      return {
        id: `REQ-${String(idx + 1).padStart(2, '0')}`,
        title: r,
        text: r,
        priority: 'HIGH'
      };
    }
    return {
      id: r.id || `REQ-${String(idx + 1).padStart(2, '0')}`,
      title: r.title || r.name || r.text || `Requirement ${idx + 1}`,
      text: r.text || r.description || r.title || '',
      priority: r.priority || 'HIGH'
    };
  });
}

/**
 * Grounds workflow nodes against workspace requirements and upstream architecture,
 * and hardens failure policies for failure-capable steps (Bugs 25 & 26).
 */
export function groundRequirementsAndFailures(allNodes, context) {
  const workspaceReqs = extractWorkspaceRequirements(context);
  const archNodes = context?.architecture?.nodes || [];

  const stopWords = new Set(['the', 'and', 'for', 'with', 'a', 'an', 'in', 'to', 'of', 'at', 'by', 'from', 'on', 'is', 'are', 'system', 'management', 'service']);
  const tokenize = (str) => {
    if (!str) return [];
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  };

  // Keep track of which requirement IDs are mapped
  const mappedReqIds = new Set();

  allNodes.forEach(node => {
    let existingIds = [];
    if (Array.isArray(node.requirementIds)) {
      existingIds = node.requirementIds.map(r => String(r).trim()).filter(Boolean);
    } else if (typeof node.requirementIds === 'string') {
      existingIds = node.requirementIds.split(',').map(r => r.trim()).filter(Boolean);
    }

    if (workspaceReqs.length > 0) {
      const validWsIds = new Set(workspaceReqs.map(r => r.id));
      existingIds = existingIds.filter(id => validWsIds.has(id));
    }

    node.requirementIds = existingIds;
    existingIds.forEach(id => mappedReqIds.add(id));
  });

  // Bug 25: Semantically ground any unmapped workspace requirements across the workflow steps
  if (workspaceReqs.length > 0) {
    workspaceReqs.forEach(req => {
      if (!mappedReqIds.has(req.id)) {
        const reqTokens = tokenize(`${req.id} ${req.title} ${req.text}`);
        let bestScore = -1;
        let bestNode = null;

        allNodes.forEach(node => {
          const nodeTokens = tokenize(`${node.label} ${node.description} ${node.action} ${node.system} ${node.actor}`);
          let score = 0;
          reqTokens.forEach(token => {
            if (nodeTokens.includes(token)) score += 2;
          });

          const normType = normalizeStepType(node.type);
          const reqLower = `${req.title} ${req.text}`.toLowerCase();
          if ((reqLower.includes('notif') || reqLower.includes('message') || reqLower.includes('alert') || reqLower.includes('broadcast') || reqLower.includes('email') || reqLower.includes('sms')) && normType === 'NOTIFICATION') {
            score += 5;
          }
          if ((reqLower.includes('intake') || reqLower.includes('ingress') || reqLower.includes('portal') || reqLower.includes('submit') || reqLower.includes('request') || reqLower.includes('trigger')) && (normType === 'START' || node.stepOrder === 1)) {
            score += 4;
          }
          if ((reqLower.includes('integrat') || reqLower.includes('connector') || reqLower.includes('external') || reqLower.includes('database') || reqLower.includes('sync')) && (normType === 'INTEGRATION' || Boolean(node.system))) {
            score += 4;
          }
          if ((reqLower.includes('approv') || reqLower.includes('gate') || reqLower.includes('decision') || reqLower.includes('review') || reqLower.includes('sign-off') || reqLower.includes('supervisor')) && (normType === 'DECISION_GATE' || normType === 'HUMAN_APPROVAL')) {
            score += 4;
          }
          if ((reqLower.includes('ai') || reqLower.includes('automat') || reqLower.includes('triage') || reqLower.includes('rules') || reqLower.includes('inference')) && normType === 'AUTOMATION') {
            score += 4;
          }

          if (score > bestScore) {
            bestScore = score;
            bestNode = node;
          }
        });

        // Truthful traceability: Only map requirement if genuine evidence/tokens/alignment exist (bestScore > 0)
        if (bestNode && bestScore > 0) {
          if (!bestNode.requirementIds.includes(req.id)) {
            bestNode.requirementIds.push(req.id);
          }
          mappedReqIds.add(req.id);
        }
      }
    });
  }

  // Bug 26: Harden failure handling, retries, timeouts, and SLAs on failure-capable steps
  allNodes.forEach(node => {
    const normType = normalizeStepType(node.type);
    const isFailureCapable = ['INTEGRATION', 'AUTOMATION', 'SUB_PROCESS', 'NOTIFICATION', 'DECISION_GATE', 'DECISION'].includes(normType);

    if (isFailureCapable) {
      const isMissingFailure = !node.failureHandling || String(node.failureHandling).trim() === '' || node.failureHandling.toLowerCase().includes('not specified') || node.failureHandling.toLowerCase().includes('validation required');
      if (isMissingFailure) {
        if (normType === 'NOTIFICATION') {
          node.failureHandling = `Fallback to secondary dispatch channel (SMS/Email) upon gateway delivery rejection; queue error telemetry and alert dispatch operator.`;
          node.retryPolicy = node.retryPolicy || '3 retries with exponential backoff (1s, 5s, 15s)';
          node.timeoutPolicy = node.timeoutPolicy || '10s gateway timeout';
          node.escalationPolicy = node.escalationPolicy || 'Route undelivered dispatch to Operations Review Queue if delivery fails after 3 retries.';
        } else if (normType === 'INTEGRATION') {
          const sysName = node.system || 'Target Integration Service';
          node.failureHandling = `Execute circuit breaker: isolate connection to ${sysName}, queue transaction into Dead-Letter Queue (DLQ), and emit system alert.`;
          node.retryPolicy = node.retryPolicy || '5 retries with exponential backoff (2s, 10s, 30s, 60s, 120s)';
          node.timeoutPolicy = node.timeoutPolicy || '15s socket timeout';
          node.escalationPolicy = node.escalationPolicy || 'Page on-call integrations engineer if DLQ depth exceeds 5 messages.';
        } else if (normType === 'AUTOMATION') {
          node.failureHandling = `Catch execution exception, preserve transactional boundary, log telemetry, and route payload to manual supervisor review queue.`;
          node.retryPolicy = node.retryPolicy || '3 retries with linear backoff (3s interval)';
          node.timeoutPolicy = node.timeoutPolicy || '30s execution budget';
          node.escalationPolicy = node.escalationPolicy || 'Escalate to Tier 2 Operations supervisor if automated recovery fails.';
        } else if (normType === 'DECISION_GATE' || normType === 'DECISION') {
          node.failureHandling = `On evaluation ambiguity or missing input attributes, route to human supervisor review branch to prevent erroneous execution.`;
          node.retryPolicy = node.retryPolicy || '1 re-evaluation retry after state refresh';
          node.timeoutPolicy = node.timeoutPolicy || '5s evaluation budget';
          node.escalationPolicy = node.escalationPolicy || 'Flag for supervisor sign-off if condition evaluation remains indeterminate.';
        } else if (normType === 'SUB_PROCESS') {
          node.failureHandling = `Isolate subprocess failure, roll back staging data changes via transaction boundary, and alert parent workflow controller.`;
          node.retryPolicy = node.retryPolicy || '2 retries for transient subprocess errors';
          node.timeoutPolicy = node.timeoutPolicy || '120s total subprocess budget';
          node.escalationPolicy = node.escalationPolicy || 'Route parent workflow into PAUSED_ERROR state with diagnostic trace.';
        } else if (normType === 'HUMAN_APPROVAL') {
          node.failureHandling = `Escalate to Operations / Department Supervisor if approval request remains pending past SLA threshold.`;
          node.retryPolicy = node.retryPolicy || '1 reminder alert dispatched at 2-hour mark';
          node.timeoutPolicy = node.timeoutPolicy || '4h review budget';
          node.escalationPolicy = node.escalationPolicy || 'Escalate to Department Lead if unassigned after 4 hours.';
        }
      }

      if (!node.retryPolicy) node.retryPolicy = '3 retries with exponential backoff';
      if (!node.timeoutPolicy) node.timeoutPolicy = '30s timeout';
      if (!node.escalationPolicy) node.escalationPolicy = 'Alert operator on persistent failure';
    }

    if ((normType === 'HUMAN_APPROVAL' || normType === 'INTEGRATION') && !node.sla) {
      node.sla = normType === 'HUMAN_APPROVAL' ? '< 4 hours' : '< 500ms';
    }

    // Architecture Node ID Linkage
    if (archNodes.length > 0 && !node.architectureNodeId) {
      const matchedArch = archNodes.find(an => {
        const anText = `${an.id} ${an.label} ${an.tier || ''}`.toLowerCase();
        const sysText = String(node.system || '').toLowerCase();
        const labelText = String(node.label || '').toLowerCase();
        return (sysText && anText.includes(sysText)) || anText.includes(labelText) || (sysText && sysText.includes(an.id.toLowerCase()));
      });
      if (matchedArch) {
        node.architectureNodeId = matchedArch.id;
      }
    }

    // Update validation status
    if (node.failureHandling && (node.architectureNodeId || node.system || normType === 'START' || normType === 'END_STATE')) {
      node.validationStatus = 'VALIDATED';
    }
  });

  // Build Structured Requirement Mappings
  const requirementMappings = workspaceReqs.map(req => {
    const matchedSteps = allNodes.filter(n => {
      const ids = Array.isArray(n.requirementIds) ? n.requirementIds : String(n.requirementIds || '').split(',').map(s => s.trim());
      return ids.includes(req.id);
    });
    return {
      requirementId: req.id,
      requirementTitle: req.title,
      stepOrders: matchedSteps.map(s => s.stepOrder),
      stepLabels: matchedSteps.map(s => s.label),
      coverageType: matchedSteps.length > 0 ? 'FULL' : 'UNMAPPED',
      coverageReason: matchedSteps.length > 0
        ? `Covered across ${matchedSteps.length} workflow step(s): ${matchedSteps.map(s => `#${s.stepOrder} ${s.label}`).join(', ')}`
        : 'Unmapped requirement',
      confidence: matchedSteps.length > 0 ? 0.95 : 0
    };
  });

  const totalRequirements = workspaceReqs.length;
  const mappedRequirements = requirementMappings.filter(m => m.stepOrders.length > 0).length;
  const unmappedRequirements = requirementMappings.filter(m => m.stepOrders.length === 0).length;
  const coveragePercentage = totalRequirements > 0
    ? Math.round((mappedRequirements / totalRequirements) * 100)
    : null;

  return {
    nodes: allNodes,
    requirementMappings,
    requirementsCoverage: {
      totalRequirements,
      mappedRequirements,
      unmappedRequirements,
      coveragePercentage,
      isCoverageComplete: totalRequirements > 0 && unmappedRequirements === 0
    }
  };
}

/**
 * Computes deterministic context hash of all upstream inputs affecting process workflow.
 * When requirements, solution option, or architecture changes, this hash mutates.
 */
export function computeProcessContextHash(context) {
  if (!context) return 'empty_context';

  const reqs = (context.businessAnalysis?.requirements || [])
    .map(r => r.id || r.text || r)
    .sort()
    .join('|');

  const selectedOpt = context.solution?.selectedOption || 'OPTION_B';
  const techStack = JSON.stringify(context.solution?.techStack || {});

  const archId = context.architecture?.id || 'no_arch';
  const archVer = context.architecture?.version || 1;
  const archNodes = (context.architecture?.nodes || [])
    .map(n => `${n.id}:${n.label}:${n.tier}`)
    .sort()
    .join('|');

  const rawString = `REQ:${reqs}::OPT:${selectedOpt}::TECH:${techStack}::ARCH:${archId}:v${archVer}::NODES:${archNodes}`;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}

/**
 * Ensures that all DECISION_GATE nodes have both TRUE and FALSE branch paths.
 * If rawTransitions is empty, builds default sequence and decision branching.
 * If a DECISION_GATE is missing an explicit FALSE branch, synthesizes the rejection/terminal path.
 */
export function ensureDecisionGateTransitions(nodes = [], rawTransitions = []) {
  let transitions = Array.isArray(rawTransitions) ? rawTransitions.map(t => ({ ...t })) : [];

  // If no transitions at all and multiple nodes exist, generate default flow
  if (transitions.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i];
      const to = nodes[i + 1];
      const normFromType = normalizeStepType(from.type);
      transitions.push({
        id: `t_${from.stepOrder}_${to.stepOrder}`,
        fromStepOrder: from.stepOrder,
        toStepOrder: to.stepOrder,
        condition: from.condition || null,
        label: normFromType === 'DECISION_GATE' ? 'Pass / True Route' : 'Next Step',
        isDefault: normFromType !== 'DECISION_GATE',
        isTruePath: normFromType === 'DECISION_GATE'
      });
    }
  }

  // Ensure every DECISION_GATE has both TRUE and FALSE branches
  nodes.forEach(node => {
    const normType = normalizeStepType(node.type);
    if (normType === 'DECISION_GATE') {
      const outgoing = transitions.filter(t => t.fromStepOrder === node.stepOrder);
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

      // 1. Mark forward/default path as TRUE path if not already marked
      const forwardTransition = outgoing.find(t => t.toStepOrder === node.stepOrder + 1) || outgoing[0];
      if (forwardTransition) {
        forwardTransition.isTruePath = true;
        forwardTransition.isDefault = false;
        if (!forwardTransition.label || forwardTransition.label === 'Default Path' || forwardTransition.label === 'Next Step') {
          forwardTransition.label = 'Pass / True Route';
        }
        if (!forwardTransition.condition) {
          forwardTransition.condition = node.condition || 'Evaluation Passed / Authorized';
        }
      }

      // 2. If FALSE path is missing, synthesize route to rejection/audit or terminal END_STATE
      if (!hasFalseBranch) {
        const terminalNode = nodes.find(n => normalizeStepType(n.type) === 'END_STATE') || nodes[nodes.length - 1];
        const failureTarget = nodes.find(n =>
          n.stepOrder > node.stepOrder &&
          /reject|fail|error|audit|security|remediat|cancel/i.test(n.label || '')
        ) || terminalNode;

        if (failureTarget && failureTarget.stepOrder !== node.stepOrder) {
          transitions.push({
            id: `t_${node.stepOrder}_${failureTarget.stepOrder}_false`,
            fromStepOrder: node.stepOrder,
            toStepOrder: failureTarget.stepOrder,
            condition: 'Validation Failed OR Unauthorized',
            label: 'Fail / Reject Route',
            isFalsePath: true
          });
        }
      }
    }
  });

  return transitions;
}

/**
 * Persists a generated or updated Process Workflow Model atomically inside a transaction.
 * Automatically preserves any existing USER_ADDED steps and manual customizations during regeneration.
 * 
 * @param {string} workspaceId Workspace ID
 * @param {object} generated Process data from AI or builder
 * @param {object} context Workspace context
 * @param {object} user Authenticated user
 * @param {number} [forcedVersion] Optional forced version number
 * @returns {Promise<object>} Created process model with nodes
 */
export async function persistProcessAtomic(workspaceId, generated, context, user, forcedVersion = null) {
  if (!workspaceId) throw new Error('workspaceId is required for process persistence');
  if (!generated || !Array.isArray(generated.nodes)) {
    throw new Error('Valid process workflow nodes array is required for persistence');
  }

  // 1. Check for existing process to manage versioning and user-added steps
  const existingProcess = await prisma.processModel.findFirst({
    where: { workspaceId },
    orderBy: { version: 'desc' },
    include: { nodes: { orderBy: { stepOrder: 'asc' } } }
  });

  const nextVersion = forcedVersion || (existingProcess ? existingProcess.version + 1 : 1);

  // 2. Preserve manual USER_ADDED steps from the existing process
  const manualUserNodes = [];
  if (existingProcess?.nodes) {
    existingProcess.nodes.forEach(oldNode => {
      if (oldNode.classification === 'USER_ADDED' || oldNode.classification === 'USER_MODIFIED') {
        manualUserNodes.push({
          stepOrder: oldNode.stepOrder,
          label: oldNode.label,
          type: oldNode.type,
          actor: oldNode.actor,
          description: oldNode.description,
          condition: oldNode.condition,
          system: oldNode.system,
          input: oldNode.input,
          action: oldNode.action,
          output: oldNode.output,
          aiCapability: oldNode.aiCapability,
          confidence: oldNode.confidence,
          sla: oldNode.sla,
          retryPolicy: oldNode.retryPolicy,
          failureHandling: oldNode.failureHandling,
          timeoutPolicy: oldNode.timeoutPolicy,
          escalationPolicy: oldNode.escalationPolicy,
          preconditions: oldNode.preconditions,
          postconditions: oldNode.postconditions,
          requirementIds: oldNode.requirementIds,
          architectureNodeId: oldNode.architectureNodeId,
          classification: oldNode.classification,
          validationStatus: oldNode.validationStatus || 'PROPOSED',
          sourceContext: oldNode.sourceContext || (oldNode.classification === 'USER_ADDED' ? 'USER_ADDED' : 'USER_MODIFIED')
        });
      }
    });
  }

  // 3. Merge generated nodes with manual user nodes
  let allNodes = [...generated.nodes];
  if (manualUserNodes.length > 0) {
    manualUserNodes.forEach(mNode => {
      const existingIdx = allNodes.findIndex(gn => gn.stepOrder === mNode.stepOrder || (gn.label && gn.label.toLowerCase() === mNode.label.toLowerCase()));
      if (existingIdx !== -1) {
        allNodes[existingIdx] = { ...allNodes[existingIdx], ...mNode };
      } else {
        allNodes.push(mNode);
      }
    });
  }

  // Renumber stepOrders sequentially 1..N
  allNodes.sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0));
  allNodes = allNodes.map((n, idx) => ({
    ...n,
    stepOrder: idx + 1
  }));

  // 4. Ground Requirements & Harden Failure Policies
  const grounded = groundRequirementsAndFailures(allNodes, context);
  allNodes = grounded.nodes;
  const requirementMappings = grounded.requirementMappings;
  const requirementsCoverage = grounded.requirementsCoverage;

  // 5. Derive Transitions if not explicitly provided and ensure decision gate completeness
  let transitions = ensureDecisionGateTransitions(allNodes, generated.transitions);

  // 6. Derive Decision Rules if not explicitly provided
  let decisionRules = Array.isArray(generated.decisionRules) ? generated.decisionRules : [];
  if (decisionRules.length === 0) {
    allNodes.filter(n => n.type === 'DECISION_GATE' || n.type === 'DECISION' || n.type === 'APPROVAL' || n.type === 'HUMAN_APPROVAL' || Boolean(n.condition)).forEach(dn => {
      decisionRules.push({
        id: `rule_step_${dn.stepOrder}`,
        name: `${dn.label} Policy`,
        condition: dn.condition || 'Operational evaluation gate',
        action: `Route execution according to ${dn.label} criteria`,
        sourceRequirementId: (dn.requirementIds ? (Array.isArray(dn.requirementIds) ? dn.requirementIds[0] : String(dn.requirementIds).split(',')[0].trim()) : null) || 'REQ-GATE',
        affectedStepOrder: dn.stepOrder
      });
    });
  }

  // 7. Run validation engine
  const validationReport = validateProcessWorkflow({
    title: generated.title,
    description: generated.description,
    nodes: allNodes,
    transitions,
    decisionRules
  }, context);

  // 8. Compute Context Hash & Architecture Tracking
  const sourceContextHash = computeProcessContextHash(context);
  const sourceArchitectureId = context?.architecture?.id || null;
  const sourceArchitectureVersion = context?.architecture?.version || null;
  const sourceSolutionOptionId = context?.solution?.selectedOption || 'OPTION_B';

  const metadata = {
    actors: [...new Set(allNodes.map(n => n.actor || n.primaryActor).filter(Boolean))],
    systems: [...new Set(allNodes.map(n => n.system || n.underlyingSystem).filter(Boolean))],
    aiCapabilities: [...new Set(allNodes.map(n => n.aiCapability).filter(Boolean))],
    requirementsAddressed: [...new Set(allNodes.flatMap(n => (Array.isArray(n.requirementIds) ? n.requirementIds : (n.requirementIds ? String(n.requirementIds).split(',') : [])).map(r => r.trim()).filter(Boolean)))],
    requirementMappings,
    requirementsCoverage,
    validationSummary: validationReport.summary
  };

  // 9. Write atomically inside a transaction
  return await prisma.$transaction(async (tx) => {
    const processModel = await tx.processModel.create({
      data: {
        workspaceId,
        title: generated.title || 'Target Process Workflow',
        description: generated.description || '',
        type: generated.type || 'WORKFLOW',
        status: validationReport.status,
        version: nextVersion,
        sourceArchitectureId,
        sourceArchitectureVersion,
        sourceSolutionOptionId,
        sourceContextHash,
        transitionsJson: JSON.stringify(transitions),
        decisionRulesJson: JSON.stringify(decisionRules),
        validationStateJson: JSON.stringify(validationReport),
        metadataJson: JSON.stringify(metadata),
        nodes: {
          create: allNodes.map(n => ({
            stepOrder: n.stepOrder,
            label: n.label || 'Step',
            type: n.type || 'ACTION',
            actor: n.actor || n.primaryActor || 'System',
            description: n.description || '',
            condition: n.condition || n.branchingCondition || null,
            nextStepId: n.nextStepId || null,
            system: n.system || n.underlyingSystem || null,
            input: n.input || (Array.isArray(n.inputData) ? n.inputData.join(', ') : n.inputData) || null,
            action: n.action || n.executionDescription || null,
            output: n.output || (Array.isArray(n.outputData) ? n.outputData.join(', ') : n.outputData) || null,
            aiCapability: n.aiCapability || null,
            confidence: typeof n.confidence === 'number' ? n.confidence : null,
            sla: n.sla || n.slaTarget || null,
            retryPolicy: n.retryPolicy || null,
            failureHandling: n.failureHandling || null,
            timeoutPolicy: n.timeoutPolicy || null,
            escalationPolicy: n.escalationPolicy || null,
            preconditions: Array.isArray(n.preconditions) ? n.preconditions.join(', ') : (n.preconditions || null),
            postconditions: Array.isArray(n.postconditions) ? n.postconditions.join(', ') : (n.postconditions || null),
            requirementIds: Array.isArray(n.requirementIds) ? n.requirementIds.join(', ') : (n.requirementIds || null),
            architectureNodeId: n.architectureNodeId || null,
            classification: n.classification || 'AI_PROPOSED',
            validationStatus: n.validationStatus || (n.architectureNodeId ? 'PROPOSED' : 'VALIDATION_REQUIRED'),
            sourceContext: n.sourceContext || 'AI_GENERATOR'
          }))
        }
      },
      include: {
        nodes: { orderBy: { stepOrder: 'asc' } }
      }
    });


    // Update workspace status to PROCESS
    await tx.workspace.update({
      where: { id: workspaceId },
      data: { status: 'PROCESS' }
    });

    // Verify user exists in database before linking foreign key
    let validUserId = null;
    if (user?.id) {
      const userExists = await tx.user.findUnique({ where: { id: user.id } });
      if (userExists) validUserId = user.id;
    }

    // Create immutable version snapshot
    await tx.artifactVersion.create({
      data: {
        workspaceId,
        artifactType: 'PROCESS',
        versionNumber: nextVersion,
        snapshotData: JSON.stringify(processModel),
        notes: `Generated Process Intelligence Workflow v${nextVersion}`,
        createdById: validUserId
      }
    });

    // Create activity log
    await tx.activityLog.create({
      data: {
        workspaceId,
        userId: validUserId,
        userName: user?.name || 'System AI',
        action: 'GENERATED',
        details: `Generated Process Intelligence Workflow v${nextVersion}`
      }
    });

    return processModel;
  });
}

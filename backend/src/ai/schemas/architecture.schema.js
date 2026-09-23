/**
 * Architecture JSON Schema & Graph Integrity Rules
 * Aligns strictly with the Prisma Architecture, ArchitectureNode, and ArchitectureEdge models,
 * the Cloud Architecture Canvas UI, and downstream processes.
 */

export const CANONICAL_TIERS = [
  'Client Layer',
  'Gateway Layer',
  'Application Services',
  'AI & Automation',
  'Persistence',
  'Integrations'
];

export const VALID_SOURCES = [
  'DOCUMENTED',
  'USER_PROVIDED',
  'EXISTING_SYSTEM',
  'SELECTED_SOLUTION',
  'RECOMMENDED',
  'VALIDATION_REQUIRED'
];

export const VALID_STATUSES = [
  'EXISTING',
  'PROPOSED',
  'RECOMMENDED',
  'VALIDATION_REQUIRED'
];

export const architectureSchema = {
  name: 'Architecture',
  version: '2.0',
  rules: {
    highLevelDesign: {
      type: 'string',
      required: true,
      minLength: 20
    },
    lowLevelDesign: {
      type: 'string',
      required: true,
      minLength: 20
    },
    integrationArch: {
      type: 'string',
      required: true,
      minLength: 20
    },
    infrastructureArch: {
      type: 'string',
      required: true,
      minLength: 20
    },
    securityArch: {
      type: 'string',
      required: true,
      minLength: 20
    },
    deploymentArch: {
      type: 'string',
      required: true,
      minLength: 20
    },
    nodes: {
      type: 'array',
      required: true,
      minItems: 6,
      validator: (nodes) => {
        if (!Array.isArray(nodes) || nodes.length < 6) {
          return { valid: false, error: 'Must contain at least 6 architecture nodes' };
        }

        const validTypes = ['CLIENT', 'GATEWAY', 'SERVICE', 'AI', 'DATABASE', 'INTEGRATION'];
        const seenIds = new Set();

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (!n || typeof n !== 'object') {
            return { valid: false, error: `Node at index ${i} is not a valid object` };
          }

          const rawId = n.id ? String(n.id).trim() : '';
          if (!rawId) {
            return { valid: false, error: `Node at index ${i} missing valid "id"` };
          }

          if (seenIds.has(rawId)) {
            return { valid: false, error: `Duplicate node ID detected: "${rawId}"` };
          }
          seenIds.add(rawId);

          const label = (n.label || n.name || '').trim();
          if (!label) {
            return { valid: false, error: `Node "${rawId}" missing valid "label" or "name"` };
          }

          const upperType = (n.type || '').toUpperCase();
          if (!validTypes.includes(upperType)) {
            return {
              valid: false,
              error: `Node "${rawId}" has invalid type "${n.type}". Must be one of: ${validTypes.join(', ')}`
            };
          }

          if (typeof n.tier !== 'string' || !n.tier.trim()) {
            return { valid: false, error: `Node "${rawId}" missing valid "tier"` };
          }

          if (typeof n.description !== 'string' || !n.description.trim()) {
            return { valid: false, error: `Node "${rawId}" missing valid "description"` };
          }
        }

        return { valid: true };
      }
    },
    edges: {
      type: 'array',
      required: true,
      minItems: 5,
      validator: (edges, allData) => {
        if (!Array.isArray(edges) || edges.length < 5) {
          return { valid: false, error: 'Must contain at least 5 architecture edges' };
        }

        const nodes = allData?.nodes || [];
        const nodeIds = new Set(nodes.map(n => n?.id ? String(n.id).trim() : '').filter(Boolean));
        const seenEdgeIds = new Set();

        for (let i = 0; i < edges.length; i++) {
          const e = edges[i];
          if (!e || typeof e !== 'object') {
            return { valid: false, error: `Edge at index ${i} is not a valid object` };
          }

          const edgeId = e.id ? String(e.id).trim() : `e_${i}`;
          if (seenEdgeIds.has(edgeId)) {
            return { valid: false, error: `Duplicate edge ID detected: "${edgeId}"` };
          }
          seenEdgeIds.add(edgeId);

          const sourceId = (e.sourceId || e.source || '').trim();
          const targetId = (e.targetId || e.target || '').trim();

          if (!sourceId) {
            return { valid: false, error: `Edge at index ${i} missing "sourceId"` };
          }
          if (!targetId) {
            return { valid: false, error: `Edge at index ${i} missing "targetId"` };
          }

          if (sourceId === targetId) {
            return { valid: false, error: `Invalid self-loop connection on node "${sourceId}" at edge ${i}` };
          }

          // Graph Integrity Verification: Source and Target must exist
          if (!nodeIds.has(sourceId)) {
            return {
              valid: false,
              error: `Dangling edge at index ${i}: sourceId "${sourceId}" does not exist in nodes`
            };
          }

          if (!nodeIds.has(targetId)) {
            return {
              valid: false,
              error: `Dangling edge at index ${i}: targetId "${targetId}" does not exist in nodes`
            };
          }
        }

        return { valid: true };
      }
    }
  }
};

/**
 * Validates complete architecture topology (DAG structure, zero dangling edges, valid tiers)
 * @param {object} data Architecture payload
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateArchitectureTopology(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Architecture data is missing or not an object'], warnings: [] };
  }

  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];

  if (nodes.length < 5) {
    errors.push(`Topology requires at least 5 nodes, received ${nodes.length}`);
  }

  const nodeMap = new Map();
  const nodeIds = new Set();
  const tiersPresent = new Set();

  nodes.forEach((n, idx) => {
    const id = n.id ? String(n.id).trim() : `node_${idx}`;
    if (nodeIds.has(id)) {
      errors.push(`Duplicate node id: "${id}"`);
    }
    nodeIds.add(id);
    nodeMap.set(id, n);

    if (n.tier) {
      tiersPresent.add(n.tier);
    } else {
      errors.push(`Node "${id}" has no architectural tier specified`);
    }

    if (!n.label && !n.name) {
      errors.push(`Node "${id}" is missing a label or name`);
    }
  });

  // Verify edges
  const seenEdgeIds = new Set();
  const adjacency = new Map();
  nodeIds.forEach(id => adjacency.set(id, []));

  edges.forEach((e, idx) => {
    const eid = e.id ? String(e.id).trim() : `edge_${idx}`;
    if (seenEdgeIds.has(eid)) {
      errors.push(`Duplicate edge id: "${eid}"`);
    }
    seenEdgeIds.add(eid);

    const src = (e.sourceId || e.source || '').trim();
    const tgt = (e.targetId || e.target || '').trim();

    if (!src || !nodeIds.has(src)) {
      errors.push(`Dangling edge "${eid}": source "${src}" not found in nodes`);
    }
    if (!tgt || !nodeIds.has(tgt)) {
      errors.push(`Dangling edge "${eid}": target "${tgt}" not found in nodes`);
    }

    if (src && tgt && src === tgt) {
      errors.push(`Edge "${eid}" has invalid self-reference loop on "${src}"`);
    }

    if (src && tgt && adjacency.has(src)) {
      adjacency.get(src).push(tgt);
    }
  });

  // Check for graph cycles if required (DFS cycle check)
  const visited = new Set();
  const recStack = new Set();

  function hasCycle(nodeId) {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      if (hasCycle(nodeId)) {
        warnings.push('Architecture topology contains a directed cycle (bidirectional data flow). Ensure this matches intended system communication.');
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Normalizes architecture data ensuring consistent tiers, labels, tech, source, and validation status
 * @param {object} data 
 * @param {object} [context] 
 * @returns {object}
 */
export function normalizeArchitectureData(data, context = {}) {
  if (!data || typeof data !== 'object') return data;

  const sol = context?.solution || {};
  const techStack = sol.classifiedTechStack || sol.techStack || {};
  let dbTech = null;
  let frontendTech = null;
  let backendTech = null;
  let gatewayTech = null;
  let aiTech = null;

  if (typeof techStack === 'object' && techStack !== null) {
    if (techStack.database) {
      dbTech = typeof techStack.database === 'string'
        ? techStack.database
        : (techStack.database.name || techStack.database.recommendation || null);
    }
    if (techStack.frontend) {
      frontendTech = typeof techStack.frontend === 'string'
        ? techStack.frontend
        : (techStack.frontend.name || techStack.frontend.recommendation || null);
    }
    if (techStack.backend) {
      backendTech = typeof techStack.backend === 'string'
        ? techStack.backend
        : (techStack.backend.name || techStack.backend.recommendation || null);
    }
    if (techStack.gateway || techStack.apiGateway) {
      const gw = techStack.gateway || techStack.apiGateway;
      gatewayTech = typeof gw === 'string' ? gw : (gw.name || null);
    }
    if (techStack.ai) {
      aiTech = typeof techStack.ai === 'string' ? techStack.ai : (techStack.ai.name || null);
    }
  } else if (typeof techStack === 'string') {
    if (techStack.includes('Microsoft SQL Server')) dbTech = 'Microsoft SQL Server';
    else if (techStack.includes('Oracle')) dbTech = 'Oracle DB Enterprise';
    else if (techStack.includes('PostgreSQL')) dbTech = 'PostgreSQL 15';
    else if (techStack.includes('MongoDB')) dbTech = 'MongoDB 6.0';
    else if (techStack.includes('MySQL')) dbTech = 'MySQL 8.0';
  }

  const isOptionA = sol.selectedOption === 'OPTION_A';
  const isOptionC = sol.selectedOption === 'OPTION_C';

  const tierMap = {
    'client': 'Client Layer',
    'client layer': 'Client Layer',
    'clients': 'Client Layer',
    'frontend': 'Client Layer',
    'gateway': 'Gateway Layer',
    'gateway layer': 'Gateway Layer',
    'api gateway': 'Gateway Layer',
    'service': 'Application Services',
    'services': 'Application Services',
    'application': 'Application Services',
    'application services': 'Application Services',
    'ai': 'AI & Automation',
    'ai & automation': 'AI & Automation',
    'ai / automation': 'AI & Automation',
    'rules': 'AI & Automation',
    'rules & automation': 'AI & Automation',
    'autonomous': 'AI & Automation',
    'persistence': 'Persistence',
    'database': 'Persistence',
    'persistence layer': 'Persistence',
    'storage': 'Persistence',
    'integration': 'Integrations',
    'integrations': 'Integrations',
    'integration layer': 'Integrations',
    'connectors': 'Integrations'
  };

  const normalizedNodes = (data.nodes || []).map((n, idx) => {
    const rawTier = (n.tier || '').toLowerCase().trim();
    const canonicalTier = tierMap[rawTier] || n.tier || 'Application Services';
    const upperType = (n.type || 'SERVICE').toUpperCase();

    let validationStatus = n.validationStatus || 'PROPOSED';
    let source = n.source || 'SELECTED_SOLUTION';
    let classification = n.classification || 'AI_PROPOSED';
    const labelLower = (n.label || n.name || '').toLowerCase();

    if (n.source === 'EXISTING_SYSTEM' || n.status === 'EXISTING' || /existing|legacy/i.test(labelLower)) {
      validationStatus = 'EXISTING';
      source = 'EXISTING_SYSTEM';
      classification = 'EXISTING';
    } else if (n.source === 'USER_PROVIDED' || n.status === 'USER_ADDED' || n.classification === 'USER_ADDED') {
      validationStatus = 'PROPOSED';
      source = 'USER_PROVIDED';
      classification = 'USER_ADDED';
    } else if (n.source === 'VALIDATION_REQUIRED' || n.status === 'VALIDATION_REQUIRED' || /validation|third-party|external|partner/i.test(labelLower)) {
      validationStatus = 'VALIDATION_REQUIRED';
      source = 'VALIDATION_REQUIRED';
      classification = 'VALIDATION_REQUIRED';
    } else if (n.source === 'RECOMMENDED' || n.status === 'RECOMMENDED' || canonicalTier === 'Gateway Layer') {
      validationStatus = 'RECOMMENDED';
      source = 'RECOMMENDED';
      classification = 'RECOMMENDED';
    } else {
      classification = 'AI_PROPOSED';
    }

    // Technology Grounding
    let nodeTech = n.tech || n.technology || 'Standard Enterprise Stack';
    if (canonicalTier === 'Persistence' || upperType === 'DATABASE') {
      if (dbTech) {
        nodeTech = dbTech;
      }
    } else if (canonicalTier === 'Client Layer' || upperType === 'CLIENT') {
      if (frontendTech && (!n.tech || n.tech.includes('Standard'))) {
        nodeTech = frontendTech;
      }
    } else if (canonicalTier === 'Gateway Layer' || upperType === 'GATEWAY') {
      if (gatewayTech && (!n.tech || n.tech.includes('Standard'))) {
        nodeTech = gatewayTech;
      }
    } else if (canonicalTier === 'Application Services' || upperType === 'SERVICE') {
      if (backendTech && (!n.tech || n.tech.includes('Standard'))) {
        nodeTech = backendTech;
      }
    } else if (canonicalTier === 'AI & Automation' || upperType === 'AI') {
      if (isOptionA) {
        nodeTech = 'Deterministic Rules Engine (Node-Rules)';
        validationStatus = 'PROPOSED';
        source = 'SELECTED_SOLUTION';
        classification = 'AI_PROPOSED';
      } else if (isOptionC && !nodeTech.toLowerCase().includes('agent')) {
        nodeTech = 'Autonomous Multi-Agent Orchestrator';
      } else if (aiTech && (!n.tech || n.tech.includes('Standard'))) {
        nodeTech = aiTech;
      }
    }

    let nodeLabel = n.label || n.name || `Component ${idx + 1}`;
    if (canonicalTier === 'Application Services' && (nodeLabel === 'Core Domain Workflow Service' || nodeLabel === 'Core Workflow Service' || nodeLabel === 'Application Service')) {
      const ws = context?.workspace || {};
      const ind = (ws.industry || '').toLowerCase();
      const obj = (ws.objective || '').toLowerCase();
      if (ind.includes('manufacturing') || obj.includes('maintenance') || obj.includes('production') || obj.includes('shop floor')) {
        nodeLabel = 'Manufacturing Execution (MES) & Production Service';
      } else if (ind.includes('retail') || obj.includes('inventory') || obj.includes('store')) {
        nodeLabel = 'Inventory & Order Orchestration Service';
      } else if (ind.includes('logistics') || obj.includes('fleet') || obj.includes('dispatch') || obj.includes('route')) {
        nodeLabel = 'Shipment Routing & Tracking Service';
      } else if (ind.includes('fintech') || ind.includes('finance') || obj.includes('transaction') || obj.includes('fraud')) {
        nodeLabel = 'Transaction Processing & Settlement Service';
      } else if (ind.includes('legal') || obj.includes('contract') || obj.includes('clause') || obj.includes('signature')) {
        nodeLabel = 'Contract Lifecycle & Clause Management Service';
      } else if (ind.includes('health') || obj.includes('clinical') || obj.includes('patient')) {
        nodeLabel = 'Clinical Intake & Scheduling Service';
      }
    }

    if (canonicalTier === 'AI & Automation' && isOptionA && /ai|copilot|llm/i.test(nodeLabel)) {
      nodeLabel = nodeLabel.replace(/AI|Copilot|LLM/gi, 'Rules Engine');
    }

    return {
      id: n.id ? String(n.id) : `node_${idx + 1}`,
      label: nodeLabel,
      type: (canonicalTier === 'AI & Automation' && isOptionA) ? 'SERVICE' : upperType,
      tier: canonicalTier,
      description: n.description || 'System architectural component.',
      posX: typeof n.posX === 'number' ? n.posX : 100 + (idx % 3) * 260,
      posY: typeof n.posY === 'number' ? n.posY : 140 + Math.floor(idx / 3) * 160,
      tech: nodeTech,
      status: n.status || 'ACTIVE',
      purpose: n.purpose || n.description || 'Executes domain responsibilities.',
      source: source,
      confidence: typeof n.confidence === 'number' ? n.confidence : 0.95,
      requirementIds: Array.isArray(n.requirementIds) ? n.requirementIds.join(', ') : (n.requirementIds || ''),
      capabilityIds: Array.isArray(n.capabilityIds) ? n.capabilityIds.join(', ') : (n.capabilityIds || ''),
      dependencies: Array.isArray(n.dependencies) ? n.dependencies.join(', ') : (n.dependencies || ''),
      validationStatus: validationStatus,
      classification: classification
    };
  });

  const normalizedEdges = (data.edges || []).map((e, idx) => ({
    id: e.id ? String(e.id) : `e_${idx + 1}`,
    sourceId: e.sourceId || e.source || '',
    targetId: e.targetId || e.target || '',
    label: e.label || (e.protocol ? `${e.protocol} Connection` : 'Secure Channel'),
    protocol: e.protocol || 'REST',
    relationship: e.relationship || 'connects_to',
    direction: e.direction || 'outbound',
    description: e.description || '',
    requirementIds: Array.isArray(e.requirementIds) ? e.requirementIds.join(', ') : (e.requirementIds || '')
  }));

  // Ensure at least one VALIDATION_REQUIRED integration component is present for unconfirmed partner/third-party connectivity
  const hasValReq = normalizedNodes.some(n => n.validationStatus === 'VALIDATION_REQUIRED');
  if (!hasValReq) {
    // If an integration node is already present and not existing system, designate it
    const candidateInt = normalizedNodes.find(n => n.tier === 'Integrations' && n.source !== 'EXISTING_SYSTEM');
    if (candidateInt) {
      candidateInt.validationStatus = 'VALIDATION_REQUIRED';
      candidateInt.source = 'VALIDATION_REQUIRED';
      candidateInt.classification = 'VALIDATION_REQUIRED';
    } else {
      const extId = `node_ext_${Date.now()}`;
      normalizedNodes.push({
        id: extId,
        label: 'External Partner & Supplier Gateway',
        type: 'INTEGRATION',
        tier: 'Integrations',
        description: 'Candidate integration connector for third-party supplier feeds and external APIs.',
        posX: 860,
        posY: 460,
        tech: 'REST / Webhooks / TLS',
        status: 'ACTIVE',
        purpose: 'Candidate integration pattern — validation required.',
        source: 'VALIDATION_REQUIRED',
        confidence: 0.85,
        requirementIds: '',
        capabilityIds: 'CAP-INT-EXT',
        dependencies: '',
        validationStatus: 'VALIDATION_REQUIRED',
        classification: 'VALIDATION_REQUIRED'
      });

      const coreService = normalizedNodes.find(n => n.tier === 'Application Services') || normalizedNodes[0];
      if (coreService) {
        normalizedEdges.push({
          id: `e_ext_${Date.now()}`,
          sourceId: coreService.id,
          targetId: extId,
          label: 'Partner Sync',
          protocol: 'REST',
          relationship: 'syncs_partner',
          direction: 'outbound',
          description: 'Candidate external connector integration',
          requirementIds: ''
        });
      }
    }
  }

  return {
    ...data,
    nodes: normalizedNodes,
    edges: normalizedEdges
  };
}

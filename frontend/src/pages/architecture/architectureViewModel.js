/**
 * Canonical Architecture View Model & Topology Graph Resolver
 * 
 * Single source of truth for:
 * - Interactive Canvas
 * - High-Level Design (HLD)
 * - Low-Level Design (LLD)
 * - Security & Compliance
 * - System Integrations
 * - Node Inspector
 * 
 * Strict invariants:
 * 1. Zero hardcoded architecture examples or assumptions.
 * 2. 100% data-driven from architecture, nodes, edges, and metadata.
 * 3. Never invents technologies, protocols, compliance frameworks, or relationships.
 * 4. Graceful handling of missing values ("Not specified", "Validation required", "—").
 * 5. Complete graph consistency validation (no dangling edges, no self-loops).
 */

export const CANONICAL_TIERS = [
  'Client Layer',
  'Gateway Layer',
  'Application Services',
  'AI & Automation',
  'Persistence',
  'Integrations'
];

/**
 * Normalizes a single architecture node ensuring valid classification, tier, and fallbacks.
 */
export function normalizeNode(node) {
  if (!node || typeof node !== 'object') return null;

  const id = String(node.id || '').trim();
  if (!id) return null;

  const label = String(node.label || node.name || 'Unnamed Component').trim();
  const type = String(node.type || 'SERVICE').toUpperCase();
  const tier = String(node.tier || 'Application Services').trim();
  const description = String(node.description || node.purpose || '').trim();
  const purpose = String(node.purpose || node.description || '').trim();
  const tech = node.tech ? String(node.tech).trim() : '';

  // Classifications: EXISTING, USER_ADDED, RECOMMENDED, AI_PROPOSED, VALIDATION_REQUIRED
  let classification = String(node.classification || node.validationStatus || 'AI_PROPOSED').toUpperCase();
  const source = String(node.source || '').toUpperCase();

  if (source === 'EXISTING_SYSTEM' || classification === 'EXISTING_SYSTEM') {
    classification = 'EXISTING';
  } else if (classification === 'USER_ADDED' || source === 'USER_PROVIDED') {
    classification = 'USER_ADDED';
  } else if (classification === 'VALIDATION REQUIRED' || classification === 'VALIDATION_REQUIRED' || source === 'VALIDATION_REQUIRED') {
    classification = 'VALIDATION_REQUIRED';
  } else if (classification === 'RECOMMENDED' || source === 'RECOMMENDED') {
    classification = 'RECOMMENDED';
  } else if (classification !== 'EXISTING' && classification !== 'USER_ADDED' && classification !== 'RECOMMENDED' && classification !== 'VALIDATION_REQUIRED') {
    classification = 'AI_PROPOSED';
  }

  // Parse requirement IDs into clean array
  const rawReqs = node.requirementIds;
  const requirementIds = (typeof rawReqs === 'string' ? rawReqs.split(',') : Array.isArray(rawReqs) ? rawReqs : [])
    .map(r => String(r).trim())
    .filter(Boolean);

  const capabilityIds = (typeof node.capabilityIds === 'string' ? node.capabilityIds.split(',') : Array.isArray(node.capabilityIds) ? node.capabilityIds : [])
    .map(c => String(c).trim())
    .filter(Boolean);

  return {
    id,
    label,
    type,
    tier,
    description,
    purpose,
    tech,
    posX: typeof node.posX === 'number' && !isNaN(node.posX) ? node.posX : 100,
    posY: typeof node.posY === 'number' && !isNaN(node.posY) ? node.posY : 100,
    status: node.status || 'ACTIVE',
    source: node.source || null,
    confidence: typeof node.confidence === 'number' && !isNaN(node.confidence) ? node.confidence : null,
    requirementIds,
    capabilityIds,
    dependencies: node.dependencies ? String(node.dependencies).trim() : null,
    validationStatus: node.validationStatus || classification,
    classification
  };
}

/**
 * Normalizes an architecture edge and verifies source and target exist.
 */
export function normalizeEdge(edge, nodeMap) {
  if (!edge || typeof edge !== 'object') return null;

  const id = String(edge.id || '').trim();
  const sourceId = String(edge.sourceId || edge.source || '').trim();
  const targetId = String(edge.targetId || edge.target || '').trim();

  if (!id || !sourceId || !targetId) return null;
  if (sourceId === targetId) return null; // No self loops
  if (!nodeMap.has(sourceId) || !nodeMap.has(targetId)) return null; // No dangling edges

  return {
    id,
    sourceId,
    targetId,
    label: edge.label ? String(edge.label).trim() : '',
    protocol: edge.protocol ? String(edge.protocol).trim() : '',
    relationship: edge.relationship ? String(edge.relationship).trim() : '',
    direction: edge.direction ? String(edge.direction).trim() : 'outbound',
    description: edge.description ? String(edge.description).trim() : '',
    requirementIds: (typeof edge.requirementIds === 'string' ? edge.requirementIds.split(',') : Array.isArray(edge.requirementIds) ? edge.requirementIds : [])
      .map(r => String(r).trim())
      .filter(Boolean)
  };
}

/**
 * Validates consistency of raw architecture data before building view model.
 */
export function validateArchitectureConsistency(architecture) {
  const issues = [];
  if (!architecture || typeof architecture !== 'object') {
    return { isValid: false, issues: ['Architecture payload is missing or empty.'] };
  }

  const rawNodes = Array.isArray(architecture.nodes) ? architecture.nodes : [];
  const rawEdges = Array.isArray(architecture.edges) ? architecture.edges : [];

  const seenNodeIds = new Set();
  const nodeMap = new Map();

  rawNodes.forEach((n, idx) => {
    if (!n.id) {
      issues.push(`Node at index ${idx} is missing an id.`);
      return;
    }
    if (seenNodeIds.has(n.id)) {
      issues.push(`Duplicate node id "${n.id}" detected.`);
    }
    seenNodeIds.add(n.id);
    nodeMap.set(n.id, n);
  });

  const seenEdgeIds = new Set();
  rawEdges.forEach((e, idx) => {
    const edgeId = e.id || `e_${idx}`;
    if (seenEdgeIds.has(edgeId)) {
      issues.push(`Duplicate edge id "${edgeId}" detected.`);
    }
    seenEdgeIds.add(edgeId);

    const s = e.sourceId || e.source;
    const t = e.targetId || e.target;
    if (s && t && s === t) {
      issues.push(`Edge "${edgeId}" contains a self-loop on node "${s}".`);
    }
    if (s && !seenNodeIds.has(s)) {
      issues.push(`Edge "${edgeId}" references non-existent source node "${s}".`);
    }
    if (t && !seenNodeIds.has(t)) {
      issues.push(`Edge "${edgeId}" references non-existent target node "${t}".`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Primary View Model Builder — Single source of truth.
 */
export function buildArchitectureViewModel(architecture, options = {}) {
  if (!architecture) return null;

  const rawNodes = Array.isArray(architecture.nodes) ? architecture.nodes : [];
  const rawEdges = Array.isArray(architecture.edges) ? architecture.edges : [];

  // 1. Normalize nodes
  const nodes = [];
  const nodeMap = new Map();

  rawNodes.forEach((rawNode) => {
    const normalized = normalizeNode(rawNode);
    if (normalized && !nodeMap.has(normalized.id)) {
      nodes.push(normalized);
      nodeMap.set(normalized.id, normalized);
    }
  });

  // 2. Normalize edges (enforcing zero dangling edges and zero self-loops)
  const edges = [];
  const edgeMap = new Map();

  rawEdges.forEach((rawEdge) => {
    const normalized = normalizeEdge(rawEdge, nodeMap);
    if (normalized && !edgeMap.has(normalized.id)) {
      edges.push(normalized);
      edgeMap.set(normalized.id, normalized);
    }
  });

  // 3. Helper functions for edge-derived graph relationships
  const getIncomingEdges = (nodeId) => edges.filter(e => e.targetId === nodeId);
  const getOutgoingEdges = (nodeId) => edges.filter(e => e.sourceId === nodeId);
  const getUpstreamNodes = (nodeId) => getIncomingEdges(nodeId).map(e => nodeMap.get(e.sourceId)).filter(Boolean);
  const getDownstreamNodes = (nodeId) => getOutgoingEdges(nodeId).map(e => nodeMap.get(e.targetId)).filter(Boolean);
  const getConnectedNodes = (nodeId) => [
    ...getUpstreamNodes(nodeId),
    ...getDownstreamNodes(nodeId)
  ];

  // 4. Tier breakdown
  const tierGroups = {};
  nodes.forEach((n) => {
    const tier = n.tier || 'Application Services';
    if (!tierGroups[tier]) tierGroups[tier] = [];
    tierGroups[tier].push(n);
  });

  const tiers = Object.keys(tierGroups).map(tierName => ({
    name: tierName,
    count: tierGroups[tierName].length,
    components: tierGroups[tierName]
  }));

  // 5. Unique technologies actually specified
  const technologies = [...new Set(nodes.map(n => n.tech).filter(Boolean))];

  // 6. Classification counts
  const classificationCounts = {
    EXISTING: nodes.filter(n => n.classification === 'EXISTING').length,
    USER_ADDED: nodes.filter(n => n.classification === 'USER_ADDED').length,
    RECOMMENDED: nodes.filter(n => n.classification === 'RECOMMENDED').length,
    VALIDATION_REQUIRED: nodes.filter(n => n.classification === 'VALIDATION_REQUIRED').length,
    AI_PROPOSED: nodes.filter(n => n.classification === 'AI_PROPOSED').length
  };

  // 7. Requirements Coverage Map
  // Calculates real requirement IDs linked to components and edges
  const reqMap = new Map();

  nodes.forEach((node) => {
    node.requirementIds.forEach((reqId) => {
      if (!reqMap.has(reqId)) {
        reqMap.set(reqId, {
          id: reqId,
          components: [],
          edges: []
        });
      }
      reqMap.get(reqId).components.push(node);
    });
  });

  edges.forEach((edge) => {
    edge.requirementIds.forEach((reqId) => {
      if (!reqMap.has(reqId)) {
        reqMap.set(reqId, {
          id: reqId,
          components: [],
          edges: []
        });
      }
      reqMap.get(reqId).edges.push(edge);
    });
  });

  const requirementsCoverage = Array.from(reqMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  // 8. Low-Level Design (LLD) groupings
  const runtimeServices = nodes.filter(
    n => n.tier === 'Application Services' || n.type === 'SERVICE' || n.tier === 'AI & Automation'
  ).map(service => {
    const incoming = getIncomingEdges(service.id);
    const outgoing = getOutgoingEdges(service.id);
    const upstreamNodes = incoming.map(e => ({
      edge: e,
      node: nodeMap.get(e.sourceId)
    })).filter(item => item.node);

    const downstreamNodes = outgoing.map(e => ({
      edge: e,
      node: nodeMap.get(e.targetId)
    })).filter(item => item.node);

    const protocols = [...new Set([...incoming, ...outgoing].map(e => e.protocol).filter(Boolean))];

    return {
      ...service,
      incomingEdges: incoming,
      outgoingEdges: outgoing,
      upstreamNodes,
      downstreamNodes,
      protocols
    };
  });

  const persistenceNodes = nodes.filter(
    n => n.tier === 'Persistence' || n.type === 'DATABASE'
  ).map(db => {
    const consumerEdges = getIncomingEdges(db.id);
    const consumers = consumerEdges.map(e => nodeMap.get(e.sourceId)).filter(Boolean);
    return {
      ...db,
      consumerEdges,
      consumers
    };
  });

  const gatewayNodes = nodes.filter(
    n => n.tier === 'Gateway Layer' || n.type === 'GATEWAY'
  );

  const clientNodes = nodes.filter(
    n => n.tier === 'Client Layer' || n.type === 'CLIENT'
  );

  // 9. System Integrations groupings
  const allIntegrationNodes = nodes.filter(
    n => n.tier === 'Integrations' || n.type === 'INTEGRATION' || n.classification === 'EXISTING' || n.source === 'EXISTING_SYSTEM'
  ).map(intNode => {
    const incoming = getIncomingEdges(intNode.id);
    const outgoing = getOutgoingEdges(intNode.id);
    const hasInbound = outgoing.length > 0; // outbound from intNode means inbound to internal system
    const hasOutbound = incoming.length > 0; // inbound to intNode means outbound from internal system

    let direction = 'Unconnected';
    if (hasInbound && hasOutbound) direction = 'Bidirectional';
    else if (hasInbound) direction = 'Inbound';
    else if (hasOutbound) direction = 'Outbound';

    const connectedEdges = [...incoming, ...outgoing];
    const connectedNodeLabels = connectedEdges.map(e => {
      const otherId = e.sourceId === intNode.id ? e.targetId : e.sourceId;
      const other = nodeMap.get(otherId);
      return other ? `${other.label}${e.protocol ? ` (${e.protocol})` : ''}` : null;
    }).filter(Boolean);

    return {
      ...intNode,
      direction,
      connectedEdges,
      connectedNodeLabels,
      protocol: intNode.tech || connectedEdges.find(e => e.protocol)?.protocol || 'Not specified'
    };
  });

  const existingSystems = allIntegrationNodes.filter(n => n.classification === 'EXISTING');
  const proposedIntegrations = allIntegrationNodes.filter(n => n.classification === 'AI_PROPOSED' || n.classification === 'RECOMMENDED' || n.classification === 'USER_ADDED');
  const validationRequiredIntegrations = allIntegrationNodes.filter(n => n.classification === 'VALIDATION_REQUIRED');

  // 10. Security Analysis derived strictly from topology
  const hasGateway = gatewayNodes.length > 0;
  const hasPersistence = persistenceNodes.length > 0;
  const securityRelevantComponents = [...gatewayNodes, ...persistenceNodes];

  const edgeProtocols = [...new Set(edges.map(e => e.protocol).filter(Boolean))];

  // Derive factual architectural style
  let architectureStyle = 'Multi-Tier Distributed Service Architecture';
  if (hasGateway && runtimeServices.length > 0 && hasPersistence) {
    architectureStyle = 'Gateway-Mediated Multi-Tier Service Architecture';
  } else if (edgeProtocols.includes('Event') || edgeProtocols.includes('WebSocket')) {
    architectureStyle = 'Event-Driven / Reactive Service Topology';
  }

  return {
    id: architecture.id,
    workspaceId: architecture.workspaceId,
    title: architecture.title || 'Target Solution Architecture',
    status: architecture.status || 'DRAFT',
    version: architecture.version || 1,
    optionId: architecture.sourceSolutionOptionId || null,
    sourceContextHash: architecture.sourceContextHash || null,
    architectureStyle,
    isStale: !!options.isStale,
    staleReason: options.staleReason || null,

    // Collections
    nodes,
    edges,
    nodeMap,
    edgeMap,
    tiers,
    technologies,
    edgeProtocols,
    classificationCounts,
    requirementsCoverage,

    // Sub-view models
    runtimeServices,
    persistenceNodes,
    gatewayNodes,
    clientNodes,
    integrations: {
      all: allIntegrationNodes,
      existingSystems,
      proposedIntegrations,
      validationRequired: validationRequiredIntegrations
    },
    security: {
      hasGateway,
      gatewayNodes,
      persistenceNodes,
      securityRelevantComponents,
      hasExplicitControls: hasGateway || hasPersistence || edgeProtocols.length > 0
    },

    // Graph helper functions
    getIncomingEdges,
    getOutgoingEdges,
    getUpstreamNodes,
    getDownstreamNodes,
    getConnectedNodes
  };
}

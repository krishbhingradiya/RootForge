import crypto from 'crypto';

/**
 * Reusable JSON serialization helper.
 * Handles objects, arrays, already-stringified JSON, null, undefined.
 * Prevents double-stringification and never returns "[object Object]".
 */
export function serializeJsonField(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '[object Object]' || trimmed === '') {
      return fallback;
    }
    // Verify if it is already valid JSON
    try {
      JSON.parse(trimmed);
      return trimmed; // Already valid JSON, do not double-encode
    } catch {
      // It's a plain string, encode it as JSON string
      return JSON.stringify(trimmed);
    }
  }
  try {
    return JSON.stringify(value);
  } catch (err) {
    console.error('[architecturePersistence] Failed to serialize JSON field:', err.message);
    return fallback;
  }
}

/**
 * Reusable JSON parsing helper.
 */
export function parseJsonField(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Safely converts any value (string, object, array) to a trimmed String.
 * Never returns "[object Object]".
 */
export function ensureString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '[object Object]' || trimmed === '') {
      return fallback;
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    const joined = value
      .map(item => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object' && item !== null) {
          return item.text || item.description || item.summary || item.title || item.name || JSON.stringify(item);
        }
        return String(item);
      })
      .filter(Boolean)
      .join('\n');
    return joined || fallback;
  }
  if (typeof value === 'object') {
    const candidate = value.text || value.description || value.summary || value.overview || value.content;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return fallback;
    }
  }
  return String(value) || fallback;
}

/**
 * Formats arrays or strings of IDs/dependencies into a comma-delimited string.
 */
export function formatIdList(val) {
  if (!val) return '';
  if (Array.isArray(val)) {
    return val
      .map(item => (typeof item === 'object' && item !== null ? item.id || item.name || '' : String(item)))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof val === 'string') {
    if (val.trim() === '[object Object]') return '';
    return val.trim();
  }
  return String(val);
}

// Canonical Enum Allow-lists and Sanitizers
export const ALLOWED_TIERS = [
  'Client Layer',
  'Gateway Layer',
  'Application Services',
  'AI & Automation',
  'Persistence',
  'Integrations'
];

export const ALLOWED_TYPES = ['CLIENT', 'GATEWAY', 'SERVICE', 'AI', 'DATABASE', 'INTEGRATION'];

export const ALLOWED_CLASSIFICATIONS = [
  'EXISTING',
  'USER_PROVIDED',
  'RECOMMENDED',
  'AI_PROPOSED',
  'VALIDATION_REQUIRED',
  'USER_ADDED'
];

export const ALLOWED_VALIDATION_STATUSES = [
  'EXISTING',
  'PROPOSED',
  'RECOMMENDED',
  'VALIDATION_REQUIRED'
];

export const ALLOWED_SOURCES = [
  'DOCUMENTED',
  'USER_PROVIDED',
  'EXISTING_SYSTEM',
  'SELECTED_SOLUTION',
  'RECOMMENDED',
  'VALIDATION_REQUIRED'
];

export const ALLOWED_RELATIONSHIPS = [
  'connects_to',
  'routes_traffic',
  'persists_data',
  'reads_state',
  'syncs_external',
  'sends_requests',
  'notifies',
  'streams_to'
];

export const ALLOWED_DIRECTIONS = ['outbound', 'inbound', 'bidirectional'];

export function sanitizeTier(rawTier) {
  if (!rawTier) return 'Application Services';
  const clean = rawTier.trim().toLowerCase();
  const tierMap = {
    'client': 'Client Layer',
    'client layer': 'Client Layer',
    'clients': 'Client Layer',
    'frontend': 'Client Layer',
    'ui': 'Client Layer',
    'presentation': 'Client Layer',
    'gateway': 'Gateway Layer',
    'gateway layer': 'Gateway Layer',
    'api gateway': 'Gateway Layer',
    'ingress': 'Gateway Layer',
    'service': 'Application Services',
    'services': 'Application Services',
    'application': 'Application Services',
    'application services': 'Application Services',
    'business logic': 'Application Services',
    'ai': 'AI & Automation',
    'ai & automation': 'AI & Automation',
    'ai / automation': 'AI & Automation',
    'rules': 'AI & Automation',
    'automation': 'AI & Automation',
    'ml': 'AI & Automation',
    'persistence': 'Persistence',
    'database': 'Persistence',
    'persistence layer': 'Persistence',
    'data': 'Persistence',
    'storage': 'Persistence',
    'integration': 'Integrations',
    'integrations': 'Integrations',
    'integration layer': 'Integrations',
    'connectors': 'Integrations',
    'external': 'Integrations'
  };
  return tierMap[clean] || (ALLOWED_TIERS.includes(rawTier) ? rawTier : 'Application Services');
}

export function sanitizeNodeType(rawType) {
  if (!rawType) return 'SERVICE';
  const upper = String(rawType).trim().toUpperCase();
  if (ALLOWED_TYPES.includes(upper)) return upper;
  if (upper.includes('CLIENT') || upper.includes('UI') || upper.includes('FRONTEND')) return 'CLIENT';
  if (upper.includes('GATEWAY') || upper.includes('PROXY')) return 'GATEWAY';
  if (upper.includes('AI') || upper.includes('ML') || upper.includes('BOT') || upper.includes('RULE')) return 'AI';
  if (upper.includes('DATA') || upper.includes('DB') || upper.includes('STORE')) return 'DATABASE';
  if (upper.includes('INT') || upper.includes('EXT') || upper.includes('API')) return 'INTEGRATION';
  return 'SERVICE';
}

export function sanitizeClassification(raw) {
  if (!raw) return 'AI_PROPOSED';
  const upper = String(raw).trim().toUpperCase();
  if (ALLOWED_CLASSIFICATIONS.includes(upper)) return upper;
  if (upper.includes('EXIST')) return 'EXISTING';
  if (upper.includes('USER') && upper.includes('ADD')) return 'USER_ADDED';
  if (upper.includes('USER')) return 'USER_PROVIDED';
  if (upper.includes('VALIDAT')) return 'VALIDATION_REQUIRED';
  if (upper.includes('RECOM')) return 'RECOMMENDED';
  return 'AI_PROPOSED';
}

export function sanitizeValidationStatus(raw) {
  if (!raw) return 'PROPOSED';
  const upper = String(raw).trim().toUpperCase();
  if (ALLOWED_VALIDATION_STATUSES.includes(upper)) return upper;
  if (upper.includes('EXIST')) return 'EXISTING';
  if (upper.includes('VALIDAT')) return 'VALIDATION_REQUIRED';
  if (upper.includes('RECOM')) return 'RECOMMENDED';
  return 'PROPOSED';
}

export function sanitizeSource(raw) {
  if (!raw) return 'SELECTED_SOLUTION';
  const upper = String(raw).trim().toUpperCase();
  if (ALLOWED_SOURCES.includes(upper)) return upper;
  if (upper.includes('EXIST')) return 'EXISTING_SYSTEM';
  if (upper.includes('USER')) return 'USER_PROVIDED';
  if (upper.includes('DOC')) return 'DOCUMENTED';
  if (upper.includes('RECOM')) return 'RECOMMENDED';
  if (upper.includes('VALIDAT')) return 'VALIDATION_REQUIRED';
  return 'SELECTED_SOLUTION';
}

export function sanitizeRelationship(raw) {
  if (!raw) return 'connects_to';
  const clean = String(raw).trim().toLowerCase();
  if (ALLOWED_RELATIONSHIPS.includes(clean)) return clean;
  if (clean.includes('route')) return 'routes_traffic';
  if (clean.includes('persist') || clean.includes('save') || clean.includes('write')) return 'persists_data';
  if (clean.includes('read') || clean.includes('get')) return 'reads_state';
  if (clean.includes('sync') || clean.includes('external')) return 'syncs_external';
  if (clean.includes('send') || clean.includes('request')) return 'sends_requests';
  if (clean.includes('notify') || clean.includes('alert')) return 'notifies';
  if (clean.includes('stream') || clean.includes('event')) return 'streams_to';
  return 'connects_to';
}

export function sanitizeDirection(raw) {
  if (!raw) return 'outbound';
  const clean = String(raw).trim().toLowerCase();
  if (ALLOWED_DIRECTIONS.includes(clean)) return clean;
  return 'outbound';
}

/**
 * Builds the exact Prisma-compatible Architecture data object.
 * Strictly excludes relation fields (nodes, edges) and unknown properties.
 */
export function mapArchitectureToPrisma(data, workspaceId, sourceSolutionId, sourceSolutionOptionId, sourceContextHash, version = 1) {
  const titleFallback = 'Target Solution Architecture';
  const hld = ensureString(data.highLevelDesign || data.hld || data.overview, 'Multi-tier modular solution architecture.');
  const lld = ensureString(data.lowLevelDesign || data.lld || data.technicalDesign, 'Standard microservices communicating via secure protocols.');
  const intArch = ensureString(data.integrationArch || data.integrationArchitecture, 'RESTful and event-driven API integration patterns.');
  const infArch = ensureString(data.infrastructureArch || data.infrastructureArchitecture, 'Resilient containerized cloud infrastructure.');
  const secArch = ensureString(data.securityArch || data.securityArchitecture, 'Role-based access control, TLS encryption, and secure audit logging.');
  const depArch = ensureString(data.deploymentArch || data.deploymentArchitecture, 'Continuous integration and zero-downtime deployment pipelines.');

  // Traceability summary
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const traceability = nodes.map((n, i) => ({
    nodeIndex: i + 1,
    id: n.id,
    label: n.label || n.name,
    tier: n.tier,
    type: n.type,
    tech: n.tech || n.technology,
    purpose: n.purpose || n.description,
    source: n.source,
    classification: n.classification,
    validationStatus: n.validationStatus,
    requirementIds: formatIdList(n.requirementIds),
    capabilityIds: formatIdList(n.capabilityIds)
  }));

  return {
    workspaceId: String(workspaceId),
    title: ensureString(data.title, titleFallback),
    highLevelDesign: hld,
    lowLevelDesign: lld,
    integrationArch: intArch,
    infrastructureArch: infArch,
    securityArch: secArch,
    deploymentArch: depArch,
    status: 'DRAFT',
    version: Number.isInteger(version) ? version : 1,
    sourceSolutionId: sourceSolutionId ? String(sourceSolutionId) : null,
    sourceSolutionOptionId: sourceSolutionOptionId ? String(sourceSolutionOptionId) : null,
    sourceContextHash: sourceContextHash ? String(sourceContextHash) : null,
    traceabilityJson: JSON.stringify(traceability)
  };
}

/**
 * Maps raw/normalized node objects to the exact Prisma ArchitectureNode schema.
 */
export function mapNodesToPrisma(nodes, architectureId, nodeIdMap = {}) {
  if (!Array.isArray(nodes)) return [];

  return nodes.map((n, idx) => {
    const assignedId = nodeIdMap[n.id] || n.id;
    return {
      id: assignedId,
      architectureId: String(architectureId),
      label: ensureString(n.label || n.name, `Component ${idx + 1}`),
      type: sanitizeNodeType(n.type),
      description: ensureString(n.description, 'System architectural component.'),
      tier: sanitizeTier(n.tier),
      posX: typeof n.posX === 'number' && !isNaN(n.posX) ? n.posX : 100 + (idx % 3) * 260,
      posY: typeof n.posY === 'number' && !isNaN(n.posY) ? n.posY : 140 + Math.floor(idx / 3) * 160,
      tech: ensureString(n.tech || n.technology, 'Standard Enterprise Stack'),
      status: n.status && ['ACTIVE', 'INACTIVE', 'DRAFT'].includes(n.status) ? n.status : 'ACTIVE',
      purpose: ensureString(n.purpose || n.description, 'Handles domain responsibilities.'),
      source: sanitizeSource(n.source),
      confidence: typeof n.confidence === 'number' && !isNaN(n.confidence) ? Math.min(Math.max(n.confidence, 0), 1) : 0.95,
      requirementIds: formatIdList(n.requirementIds),
      capabilityIds: formatIdList(n.capabilityIds),
      dependencies: formatIdList(n.dependencies),
      validationStatus: sanitizeValidationStatus(n.validationStatus),
      classification: sanitizeClassification(n.classification)
    };
  });
}

/**
 * Maps raw/normalized edge objects to the exact Prisma ArchitectureEdge schema.
 */
export function mapEdgesToPrisma(edges, architectureId, nodeIdMap = {}, validNodeIds = new Set()) {
  if (!Array.isArray(edges)) return [];

  const seenKeys = new Set();
  const validEdges = [];

  for (const e of edges) {
    const rawSource = e.sourceId || e.source || '';
    const rawTarget = e.targetId || e.target || '';

    const sourceId = nodeIdMap[rawSource] || rawSource;
    const targetId = nodeIdMap[rawTarget] || rawTarget;

    // Validate edge references
    if (!sourceId || !targetId || sourceId === targetId) continue;
    if (validNodeIds.size > 0 && (!validNodeIds.has(sourceId) || !validNodeIds.has(targetId))) continue;

    const edgeKey = `${sourceId}->${targetId}`;
    if (seenKeys.has(edgeKey)) continue;
    seenKeys.add(edgeKey);

    validEdges.push({
      architectureId: String(architectureId),
      sourceId,
      targetId,
      label: ensureString(e.label, 'Connection'),
      protocol: ensureString(e.protocol, 'REST'),
      relationship: sanitizeRelationship(e.relationship),
      direction: sanitizeDirection(e.direction),
      description: ensureString(e.description, ''),
      requirementIds: formatIdList(e.requirementIds)
    });
  }

  return validEdges;
}

/**
 * Validates architecture and its nodes/edges before database write.
 */
export function validateArchitectureForPersistence({
  workspaceId,
  architectureData,
  nodesData,
  edgesData,
  sourceSolutionId,
  sourceSolutionOptionId
}) {
  const errors = [];

  // 1. Workspace validation
  if (!workspaceId || typeof workspaceId !== 'string' || !workspaceId.trim()) {
    errors.push('Missing or invalid workspaceId.');
  }

  // 2. Architecture fields validation
  if (!architectureData || typeof architectureData !== 'object') {
    errors.push('Architecture data object is required.');
    return { valid: false, errors };
  }

  if (!architectureData.title || typeof architectureData.title !== 'string' || !architectureData.title.trim()) {
    errors.push('Architecture title is required.');
  }

  const requiredStringSpecs = [
    'highLevelDesign',
    'lowLevelDesign',
    'integrationArch',
    'infrastructureArch',
    'securityArch',
    'deploymentArch'
  ];

  for (const field of requiredStringSpecs) {
    const val = architectureData[field];
    if (typeof val !== 'string' || val.trim().length === 0) {
      errors.push(`Architecture field "${field}" must be a non-empty string.`);
    }
  }

  // 3. Source solution checks
  if (sourceSolutionId && typeof sourceSolutionId !== 'string') {
    errors.push('sourceSolutionId must be a string if provided.');
  }
  if (sourceSolutionOptionId && typeof sourceSolutionOptionId !== 'string') {
    errors.push('sourceSolutionOptionId must be a string if provided.');
  }

  // 4. Nodes validation
  if (!Array.isArray(nodesData) || nodesData.length === 0) {
    errors.push('At least one architecture node must be provided.');
  } else {
    const nodeIds = new Set();
    const tiers = new Set();

    nodesData.forEach((node, idx) => {
      if (!node.id || typeof node.id !== 'string') {
        errors.push(`Node at index ${idx} is missing a valid string ID.`);
      } else {
        if (nodeIds.has(node.id)) {
          errors.push(`Duplicate node ID "${node.id}" detected in persistence payload.`);
        }
        nodeIds.add(node.id);
      }

      if (!node.label || typeof node.label !== 'string' || !node.label.trim()) {
        errors.push(`Node "${node.id || idx}" is missing a valid label.`);
      }

      if (!ALLOWED_TIERS.includes(node.tier)) {
        errors.push(`Node "${node.id || idx}" has invalid tier "${node.tier}".`);
      } else {
        tiers.add(node.tier);
      }

      if (!ALLOWED_TYPES.includes(node.type)) {
        errors.push(`Node "${node.id || idx}" has invalid type "${node.type}".`);
      }

      if (node.classification && !ALLOWED_CLASSIFICATIONS.includes(node.classification)) {
        errors.push(`Node "${node.id || idx}" has invalid classification "${node.classification}".`);
      }
    });

    // 5. Edges validation
    if (Array.isArray(edgesData)) {
      edgesData.forEach((edge, idx) => {
        if (!edge.sourceId || !nodeIds.has(edge.sourceId)) {
          errors.push(`Edge at index ${idx} references missing sourceId "${edge.sourceId}".`);
        }
        if (!edge.targetId || !nodeIds.has(edge.targetId)) {
          errors.push(`Edge at index ${idx} references missing targetId "${edge.targetId}".`);
        }
        if (edge.sourceId && edge.targetId && edge.sourceId === edge.targetId) {
          errors.push(`Edge at index ${idx} contains invalid self-loop on "${edge.sourceId}".`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Atomically saves an Architecture and its child Nodes & Edges in a transaction.
 */
export async function persistArchitectureAtomic(prisma, {
  architectureData,
  nodesData,
  edgesData,
  manualNodes = [],
  manualEdges = []
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create base architecture record (ONLY scalar fields!)
    const createdArch = await tx.architecture.create({
      data: architectureData
    });

    const archId = createdArch.id;

    // 2. Prepare nodes including preserved manual nodes
    const finalNodes = [...nodesData];
    const existingNodeIds = new Set(finalNodes.map(n => n.id));
    const manualNodeIdMap = {};

    // Carry over manual nodes from previous version if any (re-key with fresh unique IDs to prevent PK collision)
    for (const mNode of manualNodes) {
      const newManualId = `user_${Date.now()}_${mNode.id.slice(-8)}`;
      manualNodeIdMap[mNode.id] = newManualId;
      finalNodes.push({
        ...mNode,
        id: newManualId,
        architectureId: archId,
        classification: 'USER_ADDED',
        source: 'USER_PROVIDED'
      });
      existingNodeIds.add(newManualId);
    }

    const dbNodesData = finalNodes.map(n => ({
      id: n.id,
      architectureId: archId,
      label: n.label,
      type: n.type,
      description: n.description,
      tier: n.tier,
      posX: n.posX,
      posY: n.posY,
      tech: n.tech,
      status: n.status,
      purpose: n.purpose,
      source: n.source,
      confidence: n.confidence,
      requirementIds: n.requirementIds,
      capabilityIds: n.capabilityIds,
      dependencies: n.dependencies,
      validationStatus: n.validationStatus,
      classification: n.classification
    }));

    if (dbNodesData.length > 0) {
      await tx.architectureNode.createMany({
        data: dbNodesData
      });
    }

    // 3. Prepare edges
    const finalEdges = [...edgesData];
    const seenEdges = new Set(finalEdges.map(e => `${e.sourceId}->${e.targetId}`));

    for (const mEdge of manualEdges) {
      const sourceId = manualNodeIdMap[mEdge.sourceId] || mEdge.sourceId;
      const targetId = manualNodeIdMap[mEdge.targetId] || mEdge.targetId;
      const key = `${sourceId}->${targetId}`;
      if (
        !seenEdges.has(key) &&
        existingNodeIds.has(sourceId) &&
        existingNodeIds.has(targetId) &&
        sourceId !== targetId
      ) {
        finalEdges.push({
          ...mEdge,
          sourceId,
          targetId,
          architectureId: archId
        });
        seenEdges.add(key);
      }
    }

    const dbEdgesData = finalEdges.map(e => ({
      architectureId: archId,
      sourceId: e.sourceId,
      targetId: e.targetId,
      label: e.label,
      protocol: e.protocol,
      relationship: e.relationship,
      direction: e.direction,
      description: e.description,
      requirementIds: e.requirementIds
    }));

    if (dbEdgesData.length > 0) {
      await tx.architectureEdge.createMany({
        data: dbEdgesData
      });
    }

    // 4. Return complete saved graph
    return await tx.architecture.findUnique({
      where: { id: archId },
      include: {
        nodes: true,
        edges: true
      }
    });
  });
}

/**
 * Implementation Planning Schema & Dependency Integrity Engine
 * Validates Implementation Plan artifacts against RootForge database models,
 * enforcing unique task IDs, dependency graphs (no dangling or circular dependencies),
 * phase referential integrity, and cross-stage blueprint consistency.
 */

export const planningSchema = {
  type: 'object',
  required: [
    'title',
    'estimatedDurationWeeks',
    'estimatedCost',
    'methodology',
    'phases',
    'tasks'
  ],
  properties: {
    title: {
      type: 'string',
      minLength: 5
    },
    summary: {
      type: 'string',
      minLength: 10
    },
    estimatedDurationWeeks: {
      type: 'integer',
      minimum: 1
    },
    estimatedCost: {
      type: 'string',
      minLength: 5
    },
    methodology: {
      type: 'string',
      minLength: 5
    },
    phases: {
      type: 'array',
      minItems: 3,
      validator: (phases) => {
        if (!Array.isArray(phases) || phases.length < 3) {
          return { valid: false, error: 'Must contain at least 3 rollout phases' };
        }

        const names = new Set();
        for (let i = 0; i < phases.length; i++) {
          const p = phases[i];
          if (!p || typeof p !== 'object') {
            return { valid: false, error: `Phase at index ${i} must be an object` };
          }
          if (typeof p.name !== 'string' || p.name.trim().length < 3) {
            return { valid: false, error: `Phase at index ${i} must have a valid "name" (min 3 chars)` };
          }
          if (typeof p.durationWeeks !== 'number' || p.durationWeeks <= 0) {
            return { valid: false, error: `Phase "${p.name}" must have a positive "durationWeeks" number` };
          }
          if (typeof p.focus !== 'string' || p.focus.trim().length < 5) {
            return { valid: false, error: `Phase "${p.name}" must specify a "focus" description (min 5 chars)` };
          }

          if (names.has(p.name.trim())) {
            return { valid: false, error: `Duplicate phase name: "${p.name}"` };
          }
          names.add(p.name.trim());
        }

        return { valid: true };
      }
    },
    tasks: {
      type: 'array',
      minItems: 6,
      validator: (tasks, data) => {
        if (!Array.isArray(tasks) || tasks.length < 6) {
          return { valid: false, error: 'Must contain at least 6 actionable implementation tasks' };
        }

        const validPhases = new Set(
          (data?.phases || []).map(p => (p && typeof p.name === 'string' ? p.name.trim() : ''))
        );

        const taskIds = new Set();
        const validStatuses = new Set(['TODO', 'IN_PROGRESS', 'COMPLETED']);
        const validRisks = new Set(['LOW', 'MEDIUM', 'HIGH']);

        // 1. Pass 1: Task structure, unique IDs, phase existence, and field validation
        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i];
          if (!t || typeof t !== 'object') {
            return { valid: false, error: `Task at index ${i} must be an object` };
          }

          const taskId = t.id ? String(t.id).trim() : `TASK-${i + 1}`;
          if (taskIds.has(taskId)) {
            return { valid: false, error: `Duplicate task ID: "${taskId}" detected` };
          }
          taskIds.add(taskId);

          if (typeof t.title !== 'string' || t.title.trim().length < 5) {
            return { valid: false, error: `Task [${taskId}] must have a valid "title" (min 5 chars)` };
          }

          if (typeof t.description !== 'string' || t.description.trim().length < 10) {
            return { valid: false, error: `Task [${taskId}] must have a descriptive "description" (min 10 chars)` };
          }

          if (typeof t.phaseName !== 'string' || !t.phaseName.trim()) {
            return { valid: false, error: `Task [${taskId}] missing "phaseName"` };
          }

          // Phase referential integrity
          const cleanPhase = t.phaseName.trim();
          const matchesPhase = Array.from(validPhases).some(p => p === cleanPhase || cleanPhase.includes(p) || p.includes(cleanPhase));
          if (!matchesPhase && validPhases.size > 0) {
            return { valid: false, error: `Task [${taskId}] references unknown phase "${t.phaseName}". Declared phases: ${Array.from(validPhases).join(', ')}` };
          }

          if (typeof t.assignedRole !== 'string' || t.assignedRole.trim().length < 3) {
            return { valid: false, error: `Task [${taskId}] must specify an "assignedRole" (min 3 chars)` };
          }

          if (typeof t.durationWeeks !== 'number' || t.durationWeeks <= 0) {
            return { valid: false, error: `Task [${taskId}] must have a positive "durationWeeks" number` };
          }

          if (typeof t.sprint !== 'string' || !t.sprint.trim()) {
            return { valid: false, error: `Task [${taskId}] must specify a "sprint"` };
          }

          if (t.riskLevel && !validRisks.has(String(t.riskLevel).toUpperCase())) {
            return { valid: false, error: `Task [${taskId}] riskLevel must be LOW, MEDIUM, or HIGH (got "${t.riskLevel}")` };
          }

          if (t.status && !validStatuses.has(String(t.status).toUpperCase())) {
            return { valid: false, error: `Task [${taskId}] status must be TODO, IN_PROGRESS, or COMPLETED` };
          }
        }

        // 2. Pass 2: Dependency Integrity (No dangling dependencies, no self-dependencies, no circular cycles)
        const adjList = new Map();
        for (const t of tasks) {
          const taskId = t.id ? String(t.id).trim() : null;
          adjList.set(taskId, []);
        }

        for (const t of tasks) {
          const taskId = t.id ? String(t.id).trim() : null;
          let deps = t.dependencies;
          if (typeof deps === 'string') {
            try { deps = JSON.parse(deps); } catch { deps = [deps]; }
          }
          if (!Array.isArray(deps)) continue;

          for (const dep of deps) {
            if (!dep) continue;
            const cleanDep = String(dep).trim();

            // Self-dependency check
            if (taskId && cleanDep === taskId) {
              return { valid: false, error: `Task [${taskId}] cannot depend on itself` };
            }

            // Dangling dependency check
            if (!taskIds.has(cleanDep)) {
              // Also check if dependency matches a task title exactly
              const matchesTitle = tasks.some(other => other.title.trim().toLowerCase() === cleanDep.toLowerCase());
              if (!matchesTitle) {
                return { valid: false, error: `Task [${taskId || t.title}] references dangling dependency "${cleanDep}" which does not exist in declared tasks` };
              }
            } else if (taskId) {
              adjList.get(taskId).push(cleanDep);
            }
          }
        }

        // 3. Pass 3: Cycle Detection (DFS)
        const visited = new Map(); // 0 = unvisited, 1 = visiting, 2 = visited
        for (const taskId of taskIds) {
          visited.set(taskId, 0);
        }

        function hasCycle(node) {
          visited.set(node, 1);
          const neighbors = adjList.get(node) || [];
          for (const neighbor of neighbors) {
            if (visited.get(neighbor) === 1) {
              return true; // Cycle found
            }
            if (visited.get(neighbor) === 0 && hasCycle(neighbor)) {
              return true;
            }
          }
          visited.set(node, 2);
          return false;
        }

        for (const taskId of taskIds) {
          if (visited.get(taskId) === 0) {
            if (hasCycle(taskId)) {
              return { valid: false, error: `Circular dependency detected involving task [${taskId}]` };
            }
          }
        }

        return { valid: true };
      }
    }
  }
};

/**
 * Validates an Implementation Plan payload against the schema and dependency rules.
 * 
 * @param {any} data 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePlanning(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Expected payload to be a non-null object'] };
  }

  const { properties } = planningSchema;

  // Title
  if (typeof data.title !== 'string' || data.title.trim().length < properties.title.minLength) {
    errors.push(`Field "title" must be a string with at least ${properties.title.minLength} characters`);
  }

  // Estimated Duration Weeks
  if (typeof data.estimatedDurationWeeks !== 'number' || data.estimatedDurationWeeks < properties.estimatedDurationWeeks.minimum) {
    errors.push('Field "estimatedDurationWeeks" must be a positive integer');
  }

  // Estimated Cost
  if (typeof data.estimatedCost !== 'string' || data.estimatedCost.trim().length < properties.estimatedCost.minLength) {
    errors.push(`Field "estimatedCost" must be a string with at least ${properties.estimatedCost.minLength} characters`);
  }

  // Methodology
  if (typeof data.methodology !== 'string' || data.methodology.trim().length < properties.methodology.minLength) {
    errors.push(`Field "methodology" must be a string with at least ${properties.methodology.minLength} characters`);
  }

  // Phases
  const phaseRes = properties.phases.validator(data.phases);
  if (!phaseRes.valid) {
    errors.push(phaseRes.error);
  }

  // Tasks
  const taskRes = properties.tasks.validator(data.tasks, data);
  if (!taskRes.valid) {
    errors.push(taskRes.error);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates cross-stage blueprint consistency.
 * Verifies that the implementation plan synthesizes and references concepts
 * from upstream Architecture, Database, API, UX, and Process artifacts.
 * 
 * @param {object} plan Generated implementation plan
 * @param {object} context Unified workspace context containing upstream artifacts
 * @returns {{ valid: boolean, errors: string[], coverage: object }}
 */
export function validateCrossStageConsistency(plan, context = {}) {
  const errors = [];
  const coverage = {
    architectureReferenced: false,
    databaseReferenced: false,
    apiReferenced: false,
    uxReferenced: false,
    processReferenced: false
  };

  if (!plan || !Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    return { valid: true, errors: [], coverage };
  }

  // Aggregate all task text (titles, descriptions, phase names)
  const taskCorpus = plan.tasks
    .map(t => `${t.title || ''} ${t.description || ''} ${t.phaseName || ''} ${(t.acceptanceCriteria || []).join?.(' ') || ''}`)
    .join(' ')
    .toLowerCase();

  // 1. Architecture Alignment
  const archNodes = context.architecture?.nodes || [];
  if (archNodes.length > 0) {
    const archTerms = archNodes.map(n => (n.label || '').toLowerCase()).filter(Boolean);
    const genericArchTerms = ['architecture', 'gateway', 'service', 'database', 'persistence', 'ingress', 'microservice', 'cluster', 'api gateway'];
    const matchedArch = archTerms.some(term => taskCorpus.includes(term)) ||
                        genericArchTerms.some(term => taskCorpus.includes(term));
    coverage.architectureReferenced = matchedArch;
    if (!matchedArch) {
      errors.push('Implementation plan does not reference any architecture components or service tiers');
    }
  } else {
    coverage.architectureReferenced = true;
  }

  // 2. Database Alignment
  const dbEntities = context.database?.entities || [];
  if (dbEntities.length > 0) {
    const entityTerms = dbEntities.map(e => (e.name || '').toLowerCase()).filter(Boolean);
    const genericDbTerms = ['database', 'schema', 'entity', 'entities', 'relational', 'prisma', 'tables', 'model', '3nf', 'migration'];
    const matchedEntity = entityTerms.some(term => taskCorpus.includes(term)) ||
                          genericDbTerms.some(term => taskCorpus.includes(term));
    coverage.databaseReferenced = matchedEntity;
    if (!matchedEntity) {
      errors.push('Implementation plan does not reference any database entities or data persistence models');
    }
  } else {
    coverage.databaseReferenced = true;
  }

  // 3. API Alignment
  const apiEndpoints = context.api?.endpoints || [];
  if (apiEndpoints.length > 0) {
    const genericApiTerms = ['api', 'endpoint', 'endpoints', 'rest', 'route', 'routes', 'payload', 'controller', 'http'];
    const matchedApi = genericApiTerms.some(term => taskCorpus.includes(term));
    coverage.apiReferenced = matchedApi;
    if (!matchedApi) {
      errors.push('Implementation plan does not reference any API endpoints or backend specifications');
    }
  } else {
    coverage.apiReferenced = true;
  }

  // 4. UX Alignment
  const uxScreens = context.ux?.screens || [];
  if (uxScreens.length > 0) {
    const genericUxTerms = ['ux', 'ui', 'screen', 'screens', 'wireframe', 'frontend', 'dashboard', 'portal', 'view', 'component'];
    const matchedUx = genericUxTerms.some(term => taskCorpus.includes(term));
    coverage.uxReferenced = matchedUx;
    if (!matchedUx) {
      errors.push('Implementation plan does not reference any frontend UI screens or wireframe portals');
    }
  } else {
    coverage.uxReferenced = true;
  }

  // 5. Process Alignment
  const processNodes = context.process?.nodes || [];
  if (processNodes.length > 0) {
    const genericProcTerms = ['workflow', 'process', 'step', 'triage', 'approval', 'automation', 'lifecycle'];
    const matchedProc = genericProcTerms.some(term => taskCorpus.includes(term));
    coverage.processReferenced = matchedProc;
    if (!matchedProc) {
      errors.push('Implementation plan does not reference any business process operations or workflows');
    }
  } else {
    coverage.processReferenced = true;
  }

  // 6. Anti-Leakage Check for non-support domains
  const domain = context.domain || '';
  const industry = (context.workspace?.industry || '').toLowerCase();
  const isCustomerSupport = domain === 'CUSTOMER_SUPPORT' || industry.includes('support') || industry.includes('helpdesk');

  if (!isCustomerSupport) {
    const forbiddenSupportTerms = ['support ticket', 'ticket queue', 'zendesk', 'call center agent', 'customer support rep'];
    for (const term of forbiddenSupportTerms) {
      if (taskCorpus.includes(term)) {
        errors.push(`Accidental legacy template leakage: Plan for non-support domain (${domain || industry}) contains forbidden support term "${term}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    coverage
  };
}

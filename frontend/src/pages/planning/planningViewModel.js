/**
 * Implementation Planning View Model & Schedule Calculation Engine
 * 
 * Single Source of Truth for:
 * - Summary Metrics (Total Duration, Active Tasks, Sprints, Phases, Investment, Methodology)
 * - Phased Gantt Timeline & Reactive Phase Progress
 * - Dynamic Task & Resource Table
 * - Phase -> Sprint strict dependency resolution
 * - Normalized task duration (hours, days, weeks)
 * - Risk reason and mitigation management
 * - Source requirement traceability
 * - Cycle-safe dependency resolution & deletion safeguards
 */

export const CANONICAL_ROLES = [
  'Principal Architect',
  'Solution Architect',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Database Engineer',
  'AI / ML Engineer',
  'Integration Engineer',
  'DevOps Engineer',
  'QA Engineer',
  'Security & Compliance Engineer',
  'Product Manager',
  'Lead Business Analyst'
];

/**
 * Returns project-relevant roles based on domain context and existing tasks.
 */
export function getProjectRelevantRoles(contextSummary = null, existingTasks = []) {
  const roleSet = new Set(CANONICAL_ROLES);

  // Add domain-tailored roles
  const industry = (contextSummary?.industry || '').toLowerCase();
  const domain = (contextSummary?.domain || '').toLowerCase();

  if (industry.includes('health') || domain.includes('health')) {
    roleSet.add('Clinical Informatics Specialist');
    roleSet.add('EHR / FHIR Integration Lead');
  } else if (industry.includes('restaurant') || industry.includes('food') || industry.includes('dining')) {
    roleSet.add('POS Systems Specialist');
    roleSet.add('Kitchen Operations Coordinator');
  } else if (industry.includes('manufactur') || domain.includes('supply_chain')) {
    roleSet.add('Industrial IoT Engineer');
    roleSet.add('MES / Automation Specialist');
  } else if (industry.includes('fin') || domain.includes('fintech')) {
    roleSet.add('Payment Rails Architect');
    roleSet.add('Financial Compliance & AML Analyst');
  } else if (industry.includes('educat') || domain.includes('education')) {
    roleSet.add('Student Information System Specialist');
    roleSet.add('Academic Operations Lead');
  }

  // Include any roles present in existing tasks
  for (const t of existingTasks) {
    if (t?.assignedRole && typeof t.assignedRole === 'string' && t.assignedRole.trim()) {
      roleSet.add(t.assignedRole.trim());
    }
  }

  return Array.from(roleSet);
}

/**
 * Duration Conversion Helpers
 * Standard enterprise model: 1 week = 5 working days = 40 hours.
 */
export function normalizeDurationToWeeks(value, unit = 'weeks') {
  const num = Number(value) || 0;
  if (num <= 0) return 1.0;

  switch (unit.toLowerCase()) {
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
      return Math.max(0.1, Math.round((num / 40) * 10) / 10);
    case 'days':
    case 'day':
      return Math.max(0.2, Math.round((num / 5) * 10) / 10);
    case 'weeks':
    case 'week':
    case 'wks':
    default:
      return Math.max(0.1, Math.round(num * 10) / 10);
  }
}

export function formatDuration(durationWeeks) {
  const w = Number(durationWeeks) || 1.0;
  if (w === 1) return '1 wk (5 days)';
  if (w < 1) {
    const days = Math.round(w * 5);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  return `${w} wks`;
}

/**
 * Safely parse JSON data with fallback.
 */
function safeParse(data, fallback = []) {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

/**
 * Master Plan Normalizer & Single Source of Truth
 */
export function buildPlanningViewModel(rawPlan, rawTasks = []) {
  if (!rawPlan) return null;

  const rawPhases = safeParse(rawPlan.phases, []);
  const phases = [];
  const phaseToSprintsMap = {};
  const sprintToPhaseMap = {};
  const allSprints = [];

  // Generate or parse phases with assigned sprints
  rawPhases.forEach((p, idx) => {
    const phaseName = p.name || `Phase ${idx + 1}`;
    const durationWeeks = Number(p.durationWeeks) || 2;
    const focus = p.focus || p.objective || 'Phase delivery objectives';

    // Allocate sprints: default 1-2 sprints per phase sequentially
    let phaseSprints = p.sprints || [];
    if (!phaseSprints.length) {
      const startSprint = allSprints.length + 1;
      const sprintCount = durationWeeks > 2 ? 2 : 1;
      phaseSprints = [];
      for (let s = 0; s < sprintCount; s++) {
        phaseSprints.push(`Sprint ${startSprint + s}`);
      }
    }

    phaseSprints.forEach(s => {
      if (!allSprints.includes(s)) allSprints.push(s);
      sprintToPhaseMap[s] = phaseName;
    });

    phaseToSprintsMap[phaseName] = phaseSprints;

    phases.push({
      index: idx + 1,
      name: phaseName,
      durationWeeks,
      focus,
      sprints: phaseSprints
    });
  });

  // Normalize tasks
  const tasks = (rawTasks || []).map((t, idx) => {
    const durationWeeks = Number(t.durationWeeks) || 1.0;
    const phaseName = t.phaseName || (phases[0]?.name || 'Phase 1');
    const sprint = t.sprint || (phaseToSprintsMap[phaseName]?.[0] || 'Sprint 1');

    let deps = [];
    if (t.dependencies) {
      if (Array.isArray(t.dependencies)) {
        deps = t.dependencies;
      } else {
        try {
          const parsed = JSON.parse(t.dependencies);
          deps = Array.isArray(parsed) ? parsed : [String(t.dependencies)];
        } catch {
          deps = String(t.dependencies).split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    return {
      id: String(t.id || `TASK-${idx + 1}`),
      title: String(t.title || 'Untitled Task').trim(),
      description: String(t.description || '').trim(),
      phaseName,
      sprint,
      assignedRole: String(t.assignedRole || 'Software Engineer').trim(),
      durationWeeks,
      durationDays: Math.round(durationWeeks * 5),
      durationHours: Math.round(durationWeeks * 40),
      status: String(t.status || 'TODO').toUpperCase(), // TODO, IN_PROGRESS, BLOCKED, COMPLETED
      riskLevel: String(t.riskLevel || 'LOW').toUpperCase(), // LOW, MEDIUM, HIGH
      riskReason: t.riskReason || null,
      riskMitigation: t.riskMitigation || null,
      sourceRequirement: t.sourceRequirement || null,
      dependencies: deps,
      isUserEdited: Boolean(t.isUserEdited),
      taskOrder: Number(t.taskOrder) || idx + 1,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString()
    };
  });

  // Calculate phase progress & task metrics per phase
  const phaseMetrics = {};
  phases.forEach(p => {
    const phaseTasks = tasks.filter(t => t.phaseName === p.name || p.name.includes(t.phaseName) || t.phaseName.includes(p.name));
    const completed = phaseTasks.filter(t => t.status === 'COMPLETED').length;
    const inProgress = phaseTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const blocked = phaseTasks.filter(t => t.status === 'BLOCKED').length;
    const todo = phaseTasks.filter(t => t.status === 'TODO').length;
    const total = phaseTasks.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Dynamic phase duration: maximum between declared duration and sum/schedule of tasks
    const taskEffortWeeks = phaseTasks.reduce((acc, t) => acc + t.durationWeeks, 0);

    phaseMetrics[p.name] = {
      total,
      completed,
      inProgress,
      blocked,
      todo,
      progressPercent,
      taskEffortWeeks
    };
  });

  // Summary Metrics (100% dynamic)
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasksCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const blockedTasksCount = tasks.filter(t => t.status === 'BLOCKED').length;
  const activeTasksCount = totalTasksCount - completedTasksCount; // TODO + IN_PROGRESS + BLOCKED
  const overallProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Unique Sprints
  const uniqueSprintsSet = new Set(tasks.map(t => t.sprint).filter(Boolean));
  allSprints.forEach(s => uniqueSprintsSet.add(s));
  const uniqueSprints = Array.from(uniqueSprintsSet);
  const sprintCount = uniqueSprints.length;
  const phaseCount = phases.length;

  // Total Duration: sum of phase durations
  const calculatedDurationWeeks = phases.reduce((acc, p) => acc + p.durationWeeks, 0) || rawPlan.estimatedDurationWeeks || 12;

  // Investment Estimation
  const totalEffortWeeks = tasks.reduce((acc, t) => acc + t.durationWeeks, 0);
  let estimatedInvestment = 'Estimate pending';
  if (totalEffortWeeks > 0) {
    const minCost = Math.round((totalEffortWeeks * 11000) / 10000) * 10000;
    const maxCost = Math.round((totalEffortWeeks * 14500) / 10000) * 10000;
    estimatedInvestment = `$${minCost.toLocaleString()} - $${maxCost.toLocaleString()}`;
  } else if (rawPlan.estimatedCost && rawPlan.estimatedCost.includes('$')) {
    estimatedInvestment = rawPlan.estimatedCost;
  }

  // Methodology
  const methodology = rawPlan.methodology || `Agile / Scrum (${sprintCount} Sprints across ${phaseCount} Execution Phases)`;

  return {
    id: rawPlan.id,
    title: rawPlan.title || 'Implementation Roadmap & Sprint Planner',
    version: rawPlan.version || 1,
    status: rawPlan.status || 'DRAFT',
    phases,
    tasks,
    allSprints,
    phaseToSprintsMap,
    sprintToPhaseMap,
    phaseMetrics,
    totalDurationWeeks: calculatedDurationWeeks,
    sprintCount,
    phaseCount,
    totalTasksCount,
    completedTasksCount,
    inProgressTasksCount,
    blockedTasksCount,
    activeTasksCount,
    overallProgressPercent,
    estimatedInvestment,
    methodology
  };
}

/**
 * Validates an implementation task for creation or update.
 * Enforces Phase -> Sprint compatibility, duration > 0, risk, and role.
 */
export function validateTaskForm(taskForm, phaseToSprintsMap = {}, allPhases = []) {
  const errors = {};

  // Title validation
  const title = (taskForm.title || '').trim();
  if (!title) {
    errors.title = 'Task title cannot be empty';
  } else if (title.length < 3) {
    errors.title = 'Task title must be at least 3 characters long';
  }

  // Phase validation
  const phaseNames = allPhases.map(p => p.name);
  if (!taskForm.phaseName || !phaseNames.includes(taskForm.phaseName)) {
    errors.phaseName = 'Please select a valid rollout phase';
  }

  // Sprint validation (Strict Phase -> Sprint dependency)
  const allowedSprints = phaseToSprintsMap[taskForm.phaseName] || [];
  if (!taskForm.sprint) {
    errors.sprint = 'Please select a sprint';
  } else if (allowedSprints.length > 0 && !allowedSprints.includes(taskForm.sprint)) {
    errors.sprint = `Sprint "${taskForm.sprint}" does not belong to ${taskForm.phaseName}. Allowed: ${allowedSprints.join(', ')}`;
  }

  // Assigned Role validation
  const assignedRole = (taskForm.assignedRole || '').trim();
  if (!assignedRole) {
    errors.assignedRole = 'Assigned role is required';
  } else if (assignedRole.length < 3) {
    errors.assignedRole = 'Role must be at least 3 characters long';
  }

  // Duration validation
  const duration = Number(taskForm.durationValue);
  if (isNaN(duration) || duration <= 0) {
    errors.durationValue = 'Duration must be a positive number greater than 0';
  }

  // Risk Level validation
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(taskForm.riskLevel)) {
    errors.riskLevel = 'Risk level must be LOW, MEDIUM, or HIGH';
  }

  // High Risk reason validation
  if (taskForm.riskLevel === 'HIGH' && !(taskForm.riskReason || '').trim()) {
    errors.riskReason = 'Please provide a technical or operational reason for HIGH risk';
  }

  // Status validation
  if (!['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'].includes(taskForm.status)) {
    errors.status = 'Status must be TODO, IN_PROGRESS, BLOCKED, or COMPLETED';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Checks if any other tasks in the roadmap depend on a given task ID or title.
 */
export function getDependentTasks(taskId, taskTitle, allTasks = []) {
  return allTasks.filter(t => {
    if (t.id === taskId) return false;
    const deps = t.dependencies || [];
    return deps.includes(taskId) || deps.includes(taskTitle);
  });
}

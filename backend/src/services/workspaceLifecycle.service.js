/**
 * RootForge Canonical Workspace Lifecycle & State Aggregation Service
 *
 * Single Source of Truth for:
 * 1. Normalized stage progression for all 10 lifecycle modules:
 *    - Discovery
 *    - Business Analysis
 *    - Solution Builder
 *    - Architecture
 *    - Process Designer
 *    - UX Designer
 *    - Database & APIs
 *    - Planning
 *    - Collaboration
 *    - Exports
 * 2. Dynamic readiness assessment scores (Digital Maturity, AI Readiness, Solution Readiness,
 *    Architecture Readiness, Implementation Readiness).
 * 3. Dynamic sequential next-action resolution.
 */

function safeParseJson(data, fallback = null) {
  if (!data) return fallback;
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
}

/**
 * Calculates normalized lifecycle statuses for all 10 modules
 * 
 * Standard status tokens:
 * - NOT_STARTED
 * - IN_PROGRESS
 * - COMPLETED
 * - BLOCKED
 * - NEEDS_REVIEW
 * - APPROVED
 */
export function getLifecycleStageStatus(workspace) {
  if (!workspace) return {};

  const approvals = workspace.approvals || [];
  const conversations = workspace.conversations || [];
  const latestAnalysis = workspace.businessAnalyses?.[0] || null;
  const latestSolution = workspace.solutions?.[0] || null;
  const latestArch = workspace.architectures?.[0] || null;
  const latestProcess = workspace.processes?.[0] || null;
  const latestUx = workspace.uxDesigns?.[0] || null;
  const latestDb = workspace.databaseDesigns?.[0] || null;
  const latestApi = workspace.apiDesigns?.[0] || null;
  const latestPlan = workspace.implementationPlans?.[0] || null;
  const exportJobs = workspace.exportJobs || [];
  const comments = workspace.comments || [];
  const versions = workspace.versions || [];

  // Helper to check stage approval
  const isStageApproved = (artifactType, entityStatus) => {
    if (entityStatus === 'APPROVED') return true;
    return approvals.some(a => a.artifactType === artifactType && a.status === 'APPROVED');
  };

  const isStageNeedsReview = (artifactType, entityStatus) => {
    if (entityStatus === 'REVIEW' || entityStatus === 'IN_REVIEW') return true;
    return approvals.some(a => a.artifactType === artifactType && (a.status === 'IN_REVIEW' || a.status === 'CHANGES_REQUESTED'));
  };

  const isStageBlocked = (artifactType) => {
    return approvals.some(a => a.artifactType === artifactType && a.status === 'REJECTED');
  };

  // 1. DISCOVERY
  const discoveryApproved = isStageApproved('DISCOVERY');
  const userMessages = conversations.flatMap(c => c.messages || []).filter(m => m.role === 'user');
  const analyzedDocs = (workspace.documents || []).filter(d => d.status === 'ANALYZED');
  const hasDiscoveryData = userMessages.length > 0 || analyzedDocs.length > 0 || (workspace.objective && workspace.challenge);

  let discoveryStatus = 'NOT_STARTED';
  let discoveryProgress = 0;

  if (discoveryApproved) {
    discoveryStatus = 'APPROVED';
    discoveryProgress = 100;
  } else if (isStageNeedsReview('DISCOVERY')) {
    discoveryStatus = 'NEEDS_REVIEW';
    discoveryProgress = 85;
  } else if (userMessages.length >= 2 || (userMessages.length >= 1 && (workspace.objective || workspace.challenge)) || workspace.status !== 'DISCOVERY') {
    discoveryStatus = 'COMPLETED';
    discoveryProgress = 100;
  } else if (hasDiscoveryData) {
    discoveryStatus = 'IN_PROGRESS';
    discoveryProgress = 50;
  }

  // 2. BUSINESS ANALYSIS
  const analysisApproved = isStageApproved('ANALYSIS', latestAnalysis?.status);
  const analysisNeedsReview = isStageNeedsReview('ANALYSIS', latestAnalysis?.status);
  const analysisBlocked = isStageBlocked('ANALYSIS');
  let analysisStatus = 'NOT_STARTED';
  let analysisProgress = 0;

  if (!latestAnalysis) {
    analysisStatus = 'NOT_STARTED';
    analysisProgress = 0;
  } else if (analysisApproved) {
    analysisStatus = 'APPROVED';
    analysisProgress = 100;
  } else if (analysisBlocked) {
    analysisStatus = 'BLOCKED';
    analysisProgress = 50;
  } else if (analysisNeedsReview) {
    analysisStatus = 'NEEDS_REVIEW';
    analysisProgress = 85;
  } else if (latestAnalysis.currentState || latestAnalysis.goals) {
    analysisStatus = 'COMPLETED';
    analysisProgress = 100;
  } else {
    analysisStatus = 'IN_PROGRESS';
    analysisProgress = 50;
  }

  // 3. SOLUTION BUILDER
  const solutionApproved = isStageApproved('SOLUTION', latestSolution?.status);
  const solutionNeedsReview = isStageNeedsReview('SOLUTION', latestSolution?.status);
  const solutionBlocked = isStageBlocked('SOLUTION');
  let solutionStatus = 'NOT_STARTED';
  let solutionProgress = 0;

  if (!latestSolution) {
    solutionStatus = 'NOT_STARTED';
    solutionProgress = 0;
  } else if (solutionApproved) {
    solutionStatus = 'APPROVED';
    solutionProgress = 100;
  } else if (solutionBlocked) {
    solutionStatus = 'BLOCKED';
    solutionProgress = 50;
  } else if (solutionNeedsReview) {
    solutionStatus = 'NEEDS_REVIEW';
    solutionProgress = 85;
  } else if (latestSolution.summary || latestSolution.selectedOption) {
    solutionStatus = 'COMPLETED';
    solutionProgress = 100;
  } else {
    solutionStatus = 'IN_PROGRESS';
    solutionProgress = 50;
  }

  // 4. ARCHITECTURE
  const archApproved = isStageApproved('ARCHITECTURE', latestArch?.status);
  const archNeedsReview = isStageNeedsReview('ARCHITECTURE', latestArch?.status);
  const archBlocked = isStageBlocked('ARCHITECTURE');
  let archStatus = 'NOT_STARTED';
  let archProgress = 0;

  if (!latestArch) {
    archStatus = 'NOT_STARTED';
    archProgress = 0;
  } else if (archApproved) {
    archStatus = 'APPROVED';
    archProgress = 100;
  } else if (archBlocked) {
    archStatus = 'BLOCKED';
    archProgress = 50;
  } else if (archNeedsReview) {
    archStatus = 'NEEDS_REVIEW';
    archProgress = 85;
  } else if ((latestArch.nodes && latestArch.nodes.length > 0) || latestArch.highLevelDesign) {
    archStatus = 'COMPLETED';
    archProgress = 100;
  } else {
    archStatus = 'IN_PROGRESS';
    archProgress = 50;
  }

  // 5. PROCESS DESIGNER
  const processApproved = isStageApproved('PROCESS', latestProcess?.status);
  const processNeedsReview = isStageNeedsReview('PROCESS', latestProcess?.status);
  const processBlocked = isStageBlocked('PROCESS');
  let processStatus = 'NOT_STARTED';
  let processProgress = 0;

  if (!latestProcess) {
    processStatus = 'NOT_STARTED';
    processProgress = 0;
  } else if (processApproved) {
    processStatus = 'APPROVED';
    processProgress = 100;
  } else if (processBlocked) {
    processStatus = 'BLOCKED';
    processProgress = 50;
  } else if (processNeedsReview) {
    processStatus = 'NEEDS_REVIEW';
    processProgress = 85;
  } else if ((latestProcess.nodes && latestProcess.nodes.length > 0) || latestProcess.description) {
    processStatus = 'COMPLETED';
    processProgress = 100;
  } else {
    processStatus = 'IN_PROGRESS';
    processProgress = 50;
  }

  // 6. UX DESIGNER
  const uxApproved = isStageApproved('UX', latestUx?.status);
  const uxNeedsReview = isStageNeedsReview('UX', latestUx?.status);
  const uxBlocked = isStageBlocked('UX');
  let uxStatus = 'NOT_STARTED';
  let uxProgress = 0;

  if (!latestUx) {
    uxStatus = 'NOT_STARTED';
    uxProgress = 0;
  } else if (uxApproved) {
    uxStatus = 'APPROVED';
    uxProgress = 100;
  } else if (uxBlocked) {
    uxStatus = 'BLOCKED';
    uxProgress = 50;
  } else if (uxNeedsReview) {
    uxStatus = 'NEEDS_REVIEW';
    uxProgress = 85;
  } else {
    const screens = safeParseJson(latestUx.screens, []);
    if (Array.isArray(screens) && screens.length > 0) {
      uxStatus = 'COMPLETED';
      uxProgress = 100;
    } else if (latestUx.title) {
      uxStatus = 'COMPLETED';
      uxProgress = 100;
    } else {
      uxStatus = 'IN_PROGRESS';
      uxProgress = 50;
    }
  }

  // 7. DATABASE & APIs
  const dbApproved = isStageApproved('DATABASE', latestDb?.status) || isStageApproved('API', latestApi?.status);
  const dbNeedsReview = isStageNeedsReview('DATABASE', latestDb?.status) || isStageNeedsReview('API', latestApi?.status);
  const dbBlocked = isStageBlocked('DATABASE') || isStageBlocked('API');
  const hasDB = !!latestDb;
  const hasAPI = !!latestApi;
  let dbStatus = 'NOT_STARTED';
  let dbProgress = 0;

  if (!hasDB && !hasAPI) {
    dbStatus = 'NOT_STARTED';
    dbProgress = 0;
  } else if (dbApproved) {
    dbStatus = 'APPROVED';
    dbProgress = 100;
  } else if (dbBlocked) {
    dbStatus = 'BLOCKED';
    dbProgress = 50;
  } else if (dbNeedsReview) {
    dbStatus = 'NEEDS_REVIEW';
    dbProgress = 85;
  } else if (hasDB && hasAPI) {
    dbStatus = 'COMPLETED';
    dbProgress = 100;
  } else {
    dbStatus = 'IN_PROGRESS';
    dbProgress = 50;
  }

  // 8. PLANNING
  const planApproved = isStageApproved('PLANNING', latestPlan?.status);
  const planNeedsReview = isStageNeedsReview('PLANNING', latestPlan?.status);
  const planBlocked = isStageBlocked('PLANNING');
  let planStatus = 'NOT_STARTED';
  let planProgress = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let blockedTasks = 0;

  if (!latestPlan) {
    planStatus = 'NOT_STARTED';
    planProgress = 0;
  } else {
    const tasks = latestPlan.tasks || [];
    totalTasks = tasks.length;
    completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length;

    if (totalTasks === 0) {
      planStatus = 'IN_PROGRESS';
      planProgress = 30;
    } else {
      const taskPercentage = Math.round((completedTasks / totalTasks) * 100);
      planProgress = taskPercentage;

      if (completedTasks === totalTasks) {
        if (planApproved) {
          planStatus = 'APPROVED';
        } else if (planNeedsReview) {
          planStatus = 'NEEDS_REVIEW';
        } else {
          planStatus = 'COMPLETED';
        }
      } else {
        if (blockedTasks > 0 && completedTasks === 0 && inProgressTasks === 0) {
          planStatus = 'BLOCKED';
        } else if (planBlocked) {
          planStatus = 'BLOCKED';
        } else if (planNeedsReview) {
          planStatus = 'NEEDS_REVIEW';
        } else {
          planStatus = 'IN_PROGRESS';
        }
      }
    }
  }

  // 9. COLLABORATION
  const approvedSignOffsCount = approvals.filter(a => a.status === 'APPROVED').length;
  const changesRequestedCount = approvals.filter(a => a.status === 'CHANGES_REQUESTED' || a.status === 'REJECTED').length;
  const hasCollabActivity = approvals.length > 0 || comments.length > 0 || versions.length > 0;
  let collabStatus = 'NOT_STARTED';
  let collabProgress = 0;

  if (!hasCollabActivity) {
    collabStatus = 'NOT_STARTED';
    collabProgress = 0;
  } else if (changesRequestedCount > 0) {
    collabStatus = 'NEEDS_REVIEW';
    collabProgress = Math.min(85, Math.max(30, approvedSignOffsCount * 15 + 20));
  } else if (approvedSignOffsCount >= 4) {
    collabStatus = 'COMPLETED';
    collabProgress = 100;
  } else {
    collabStatus = 'IN_PROGRESS';
    collabProgress = Math.min(90, Math.max(25, approvedSignOffsCount * 20 + comments.length * 5));
  }

  // 10. EXPORTS
  const completedExports = exportJobs.filter(j => j.status === 'COMPLETED');
  const pendingExports = exportJobs.filter(j => j.status === 'PENDING' || j.status === 'PROCESSING');
  let exportStatus = 'NOT_STARTED';
  let exportProgress = 0;

  if (completedExports.length > 0) {
    exportStatus = 'COMPLETED';
    exportProgress = 100;
  } else if (pendingExports.length > 0) {
    exportStatus = 'IN_PROGRESS';
    exportProgress = 50;
  } else {
    exportStatus = 'NOT_STARTED';
    exportProgress = 0;
  }

  return {
    discovery: {
      stageId: 'discovery',
      stageName: 'Discovery',
      status: discoveryStatus,
      progress: discoveryProgress,
      completionPercent: discoveryProgress,
      hasData: hasDiscoveryData,
      needsReview: discoveryStatus === 'NEEDS_REVIEW',
      isApproved: discoveryStatus === 'APPROVED',
      lastUpdated: workspace.updatedAt || null,
      source: 'conversations'
    },
    analysis: {
      stageId: 'analysis',
      stageName: 'Business Analysis',
      status: analysisStatus,
      progress: analysisProgress,
      completionPercent: analysisProgress,
      hasData: !!latestAnalysis,
      needsReview: analysisStatus === 'NEEDS_REVIEW',
      isApproved: analysisStatus === 'APPROVED',
      lastUpdated: latestAnalysis?.updatedAt || null,
      source: 'businessAnalyses'
    },
    solution: {
      stageId: 'solution',
      stageName: 'Solution Builder',
      status: solutionStatus,
      progress: solutionProgress,
      completionPercent: solutionProgress,
      hasData: !!latestSolution,
      needsReview: solutionStatus === 'NEEDS_REVIEW',
      isApproved: solutionStatus === 'APPROVED',
      lastUpdated: latestSolution?.updatedAt || null,
      source: 'solutions'
    },
    architecture: {
      stageId: 'architecture',
      stageName: 'Architecture',
      status: archStatus,
      progress: archProgress,
      completionPercent: archProgress,
      hasData: !!latestArch,
      needsReview: archStatus === 'NEEDS_REVIEW',
      isApproved: archStatus === 'APPROVED',
      lastUpdated: latestArch?.updatedAt || null,
      source: 'architectures'
    },
    process: {
      stageId: 'process',
      stageName: 'Process Designer',
      status: processStatus,
      progress: processProgress,
      completionPercent: processProgress,
      hasData: !!latestProcess,
      needsReview: processStatus === 'NEEDS_REVIEW',
      isApproved: processStatus === 'APPROVED',
      lastUpdated: latestProcess?.updatedAt || null,
      source: 'processes'
    },
    ux: {
      stageId: 'ux',
      stageName: 'UX Designer',
      status: uxStatus,
      progress: uxProgress,
      completionPercent: uxProgress,
      hasData: !!latestUx,
      needsReview: uxStatus === 'NEEDS_REVIEW',
      isApproved: uxStatus === 'APPROVED',
      lastUpdated: latestUx?.updatedAt || null,
      source: 'uxDesigns'
    },
    database: {
      stageId: 'database',
      stageName: 'Database & APIs',
      status: dbStatus,
      progress: dbProgress,
      completionPercent: dbProgress,
      hasData: hasDB || hasAPI,
      needsReview: dbStatus === 'NEEDS_REVIEW',
      isApproved: dbStatus === 'APPROVED',
      lastUpdated: latestDb?.updatedAt || latestApi?.updatedAt || null,
      source: 'databaseDesigns/apiDesigns'
    },
    planning: {
      stageId: 'planning',
      stageName: 'Planning',
      status: planStatus,
      progress: planProgress,
      completionPercent: planProgress,
      hasData: !!latestPlan,
      needsReview: planStatus === 'NEEDS_REVIEW',
      isApproved: planStatus === 'APPROVED',
      lastUpdated: latestPlan?.updatedAt || null,
      source: 'implementationPlans',
      details: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        estimatedCost: latestPlan?.estimatedCost || null,
        durationWeeks: latestPlan?.estimatedDurationWeeks || null
      }
    },
    collaboration: {
      stageId: 'collaboration',
      stageName: 'Collaboration',
      status: collabStatus,
      progress: collabProgress,
      completionPercent: collabProgress,
      hasData: hasCollabActivity,
      needsReview: collabStatus === 'NEEDS_REVIEW',
      isApproved: approvedSignOffsCount >= 4,
      lastUpdated: approvals[0]?.updatedAt || comments[0]?.updatedAt || null,
      source: 'approvals/comments',
      details: {
        approvedSignOffsCount,
        changesRequestedCount,
        commentsCount: comments.length,
        versionsCount: versions.length
      }
    },
    exports: {
      stageId: 'exports',
      stageName: 'Exports',
      status: exportStatus,
      progress: exportProgress,
      completionPercent: exportProgress,
      hasData: exportJobs.length > 0,
      needsReview: false,
      isApproved: completedExports.length > 0,
      lastUpdated: exportJobs[0]?.createdAt || null,
      source: 'exportJobs',
      details: {
        completedCount: completedExports.length,
        totalJobs: exportJobs.length
      }
    }
  };
}

/**
 * Calculates dynamic assessment and readiness scores strictly derived from domain data.
 * Returns 'Not assessed' with score: null ONLY when data is genuinely missing.
 */
export function getWorkspaceReadiness(workspace, stages) {
  const analysis = workspace.businessAnalyses?.[0] || null;
  const solution = workspace.solutions?.[0] || null;
  const arch = workspace.architectures?.[0] || null;
  const processModel = workspace.processes?.[0] || null;
  const plan = workspace.implementationPlans?.[0] || null;

  // 1. Digital Maturity
  let digitalMaturityScore = null;
  if (analysis) {
    if (analysis.digitalMaturityScore !== null && analysis.digitalMaturityScore !== undefined) {
      digitalMaturityScore = analysis.digitalMaturityScore;
    } else {
      const opps = safeParseJson(analysis.automationOpportunities, []);
      digitalMaturityScore = Math.min(92, Math.max(50, 60 + opps.length * 5));
    }
  }

  const digitalMaturity = digitalMaturityScore !== null
    ? { score: digitalMaturityScore, label: 'Assessment Score: Digital Maturity', max: 100 }
    : { score: null, status: 'Not assessed', label: 'Assessment Score: Digital Maturity', max: 100 };

  // 2. AI Readiness
  let aiReadinessScore = null;
  const hasAiOpps = solution ? safeParseJson(solution.aiOpps, []).length > 0 : false;
  const hasAutoOpps = analysis ? safeParseJson(analysis.automationOpportunities, []).length > 0 : false;
  const hasAiProcessNodes = processModel?.nodes?.some(n => n.type === 'AI') || false;
  const hasAiArchNodes = arch?.nodes?.some(n => n.type === 'AI' || n.tier?.toLowerCase().includes('ai')) || false;
  const techStackString = solution?.techStack ? (typeof solution.techStack === 'string' ? solution.techStack : JSON.stringify(solution.techStack)).toLowerCase() : '';
  const hasAiTech = techStackString.includes('ai') || techStackString.includes('llm') || techStackString.includes('openai') || techStackString.includes('gemini');

  if (hasAiOpps || hasAiProcessNodes || hasAiArchNodes || hasAiTech || (hasAutoOpps && solution)) {
    let base = 68;
    if (hasAiOpps) base += 8;
    if (hasAiProcessNodes) base += 8;
    if (hasAiArchNodes) base += 8;
    if (stages?.solution?.isApproved || stages?.process?.isApproved) base += 6;
    aiReadinessScore = Math.min(95, base);
  } else if (workspace.isDemo && solution) {
    aiReadinessScore = 84;
  }

  const aiReadiness = aiReadinessScore !== null
    ? { score: aiReadinessScore, label: 'Assessment Score: AI Readiness', max: 100 }
    : { score: null, status: 'Not assessed', label: 'Assessment Score: AI Readiness', max: 100 };

  // 3. Solution Readiness
  let solutionReadinessScore = null;
  if (solution) {
    let base = 70;
    if (solution.selectedOption) base += 10;
    const caps = safeParseJson(solution.keyCapabilities, []);
    if (caps.length > 0) base += Math.min(8, caps.length * 2);
    const risks = safeParseJson(solution.risks, []);
    if (risks.length > 0) base += 5;
    if (stages?.solution?.isApproved) base += 5;
    solutionReadinessScore = Math.min(98, base);
  } else if (workspace.isDemo) {
    solutionReadinessScore = 88;
  }

  const solutionReadiness = solutionReadinessScore !== null
    ? { score: solutionReadinessScore, label: 'Assessment Score: Solution Readiness', max: 100 }
    : { score: null, status: 'Not assessed', label: 'Assessment Score: Solution Readiness', max: 100 };

  // 4. Architecture Readiness
  let architectureReadinessScore = null;
  if (arch) {
    let base = 70;
    const nodesCount = arch.nodes?.length || 0;
    const edgesCount = arch.edges?.length || 0;
    if (nodesCount >= 3) base += 8;
    if (nodesCount >= 6) base += 6;
    if (edgesCount >= 2) base += 6;
    if (stages?.architecture?.isApproved) base += 6;
    architectureReadinessScore = Math.min(96, base);
  } else if (workspace.isDemo) {
    architectureReadinessScore = 92;
  }

  const architectureReadiness = architectureReadinessScore !== null
    ? { score: architectureReadinessScore, label: 'Assessment Score: Architecture Readiness', max: 100 }
    : { score: null, status: 'Not assessed', label: 'Assessment Score: Architecture Readiness', max: 100 };

  // 5. Implementation Readiness
  let implementationReadinessScore = null;
  if (plan) {
    const tasks = plan.tasks || [];
    let base = 65;
    if (tasks.length >= 4) base += 10;
    if (tasks.length >= 8) base += 5;
    if (tasks.some(t => t.riskMitigation)) base += 5;
    if (tasks.some(t => t.assignedRole)) base += 5;
    if (stages?.planning?.isApproved) base += 5;
    if (stages?.planning?.progress > 0) base += 5;
    implementationReadinessScore = Math.min(95, base);
  } else if (workspace.isDemo) {
    implementationReadinessScore = 85;
  }

  const implementationReadiness = implementationReadinessScore !== null
    ? { score: implementationReadinessScore, label: 'Assessment Score: Implementation Readiness', max: 100 }
    : { score: null, status: 'Not assessed', label: 'Assessment Score: Implementation Readiness', max: 100 };

  return {
    digitalMaturity,
    aiReadiness,
    solutionReadiness,
    architectureReadiness,
    implementationReadiness
  };
}

/**
 * Dynamically resolves the next recommended action based on sequential lifecycle progression.
 */
export function getNextRecommendedAction(workspace, stages) {
  if (!stages) return 'Complete Discovery';

  // 1. Discovery
  if (stages.discovery?.status !== 'COMPLETED' && stages.discovery?.status !== 'APPROVED') {
    return 'Complete Discovery';
  }

  // 2. Business Analysis
  if (stages.analysis?.status === 'NOT_STARTED') {
    return 'Generate Business Analysis';
  }
  if (stages.analysis?.status === 'NEEDS_REVIEW') {
    return 'Review Business Analysis';
  }
  if (stages.analysis?.status !== 'COMPLETED' && stages.analysis?.status !== 'APPROVED') {
    return 'Complete Business Analysis';
  }

  // 3. Solution Builder
  if (stages.solution?.status === 'NOT_STARTED') {
    return 'Generate Solution Options';
  }
  if (stages.solution?.status === 'NEEDS_REVIEW') {
    return 'Review Solution Options';
  }
  if (stages.solution?.status !== 'COMPLETED' && stages.solution?.status !== 'APPROVED') {
    return 'Finalize Solution Selection';
  }

  // 4. Architecture
  if (stages.architecture?.status === 'NOT_STARTED') {
    return 'Generate Architecture';
  }
  if (stages.architecture?.status === 'NEEDS_REVIEW') {
    return 'Review Architecture';
  }
  if (stages.architecture?.status !== 'COMPLETED' && stages.architecture?.status !== 'APPROVED') {
    return 'Complete System Architecture';
  }

  // 5. Process Designer
  if (stages.process?.status === 'NOT_STARTED') {
    return 'Design Process Workflows';
  }
  if (stages.process?.status === 'NEEDS_REVIEW') {
    return 'Review Process Workflows';
  }
  if (stages.process?.status !== 'COMPLETED' && stages.process?.status !== 'APPROVED') {
    return 'Finalize Process Model';
  }

  // 6. UX Designer
  if (stages.ux?.status === 'NOT_STARTED') {
    return 'Generate UX Wireframes';
  }
  if (stages.ux?.status === 'NEEDS_REVIEW') {
    return 'Review UX Wireframes';
  }
  if (stages.ux?.status !== 'COMPLETED' && stages.ux?.status !== 'APPROVED') {
    return 'Finalize UX Deliverables';
  }

  // 7. Database & APIs
  if (stages.database?.status === 'NOT_STARTED') {
    return 'Design Database & APIs';
  }
  if (stages.database?.status === 'NEEDS_REVIEW') {
    return 'Review Database & APIs';
  }
  if (stages.database?.status !== 'COMPLETED' && stages.database?.status !== 'APPROVED') {
    return 'Complete Database & API Specifications';
  }

  // 8. Planning
  if (stages.planning?.status === 'NOT_STARTED') {
    return 'Generate Implementation Plan';
  }
  if (stages.planning?.status === 'IN_PROGRESS') {
    return 'Continue Implementation Planning';
  }
  if (stages.planning?.status === 'NEEDS_REVIEW') {
    return 'Review Implementation Plan';
  }
  if (stages.planning?.status === 'COMPLETED' && !stages.planning?.isApproved) {
    return 'Obtain Planning Sign-off';
  }

  // 9. Collaboration
  if (stages.collaboration?.status === 'NEEDS_REVIEW') {
    return 'Review Governance & Sign-offs';
  }
  if (stages.collaboration?.status === 'NOT_STARTED' || stages.collaboration?.status === 'IN_PROGRESS') {
    return 'Finalize Governance Sign-offs';
  }

  // 10. Exports
  if (stages.exports?.status !== 'COMPLETED') {
    return 'Generate Executive Deliverables';
  }

  return 'Review Transformation Deliverables';
}

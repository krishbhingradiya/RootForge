import assert from 'node:assert';
import {
  getLifecycleStageStatus,
  getWorkspaceReadiness,
  getNextRecommendedAction
} from './src/services/workspaceLifecycle.service.js';
import { prisma } from './src/prisma.js';

console.log('🧪 Starting RootForge Canonical Lifecycle State Engine Tests...\n');

// ─── TEST 1: Planning partial tasks scenario (2/10 tasks completed) ────────────
console.log('Test 1: Dynamic Planning Progress with 2/10 tasks completed...');
const mockWorkspacePartialPlanning = {
  id: 'ws-test-partial-planning',
  name: 'Patient Appointment Transformation',
  objective: 'Streamline patient intake',
  challenge: 'Manual phone coordination',
  status: 'PLANNING',
  isDemo: false,
  conversations: [{ messages: [{ role: 'user', content: 'We need digital booking' }] }],
  businessAnalyses: [{
    id: 'ba-1',
    status: 'APPROVED',
    currentState: 'Current manual intake',
    goals: JSON.stringify(['Reduce wait time by 50%']),
    digitalMaturityScore: 78,
    automationOpportunities: JSON.stringify(['Automated triage', 'SMS confirmation'])
  }],
  solutions: [{
    id: 'sol-1',
    status: 'APPROVED',
    name: 'Omnichannel Intake',
    summary: 'Cloud-native triage and scheduling',
    selectedOption: 'OPTION_B',
    keyCapabilities: JSON.stringify(['Self-serve portal', 'EHR sync']),
    aiOpps: JSON.stringify(['Natural language symptom check']),
    techStack: JSON.stringify({ ai: 'Gemini 1.5 Flash', backend: 'Node.js' })
  }],
  architectures: [{
    id: 'arch-1',
    status: 'APPROVED',
    title: 'Enterprise Architecture',
    nodes: [
      { id: 'n1', label: 'Web App', type: 'CLIENT', tier: 'Client' },
      { id: 'n2', label: 'API Gateway', type: 'GATEWAY', tier: 'Gateway' },
      { id: 'n3', label: 'Booking Svc', type: 'SERVICE', tier: 'Service' },
      { id: 'n4', label: 'AI Triage', type: 'AI', tier: 'AI' }
    ],
    edges: [
      { id: 'e1', sourceId: 'n1', targetId: 'n2' },
      { id: 'e2', sourceId: 'n2', targetId: 'n3' },
      { id: 'e3', sourceId: 'n3', targetId: 'n4' }
    ]
  }],
  processes: [{
    id: 'proc-1',
    status: 'APPROVED',
    title: 'Patient Intake Process',
    nodes: [
      { id: 'pn1', label: 'Patient Request', type: 'START' },
      { id: 'pn2', label: 'AI Intake Form', type: 'AI' },
      { id: 'pn3', label: 'Appointment Confirmed', type: 'END' }
    ]
  }],
  uxDesigns: [{
    id: 'ux-1',
    status: 'APPROVED',
    title: 'Patient Portal Wireframes',
    screens: JSON.stringify([{ id: 's1', name: 'Intake Dashboard' }])
  }],
  databaseDesigns: [{
    id: 'db-1',
    status: 'APPROVED',
    title: 'Relational Data Model'
  }],
  apiDesigns: [{
    id: 'api-1',
    status: 'APPROVED',
    title: 'Booking REST API'
  }],
  implementationPlans: [{
    id: 'plan-1',
    status: 'DRAFT',
    title: 'Implementation Roadmap',
    tasks: [
      { id: 't1', title: 'Task 1', status: 'COMPLETED', assignedRole: 'Lead Arch', riskMitigation: 'Review' },
      { id: 't2', title: 'Task 2', status: 'COMPLETED', assignedRole: 'Senior Eng', riskMitigation: 'CI/CD' },
      { id: 't3', title: 'Task 3', status: 'IN_PROGRESS', assignedRole: 'Senior Eng' },
      { id: 't4', title: 'Task 4', status: 'TODO', assignedRole: 'FE Dev' },
      { id: 't5', title: 'Task 5', status: 'TODO', assignedRole: 'BE Dev' },
      { id: 't6', title: 'Task 6', status: 'TODO', assignedRole: 'QA' },
      { id: 't7', title: 'Task 7', status: 'TODO', assignedRole: 'DevOps' },
      { id: 't8', title: 'Task 8', status: 'TODO', assignedRole: 'Security' },
      { id: 't9', title: 'Task 9', status: 'TODO', assignedRole: 'PM' },
      { id: 't10', title: 'Task 10', status: 'TODO', assignedRole: 'Release' }
    ]
  }],
  approvals: [
    { artifactType: 'ANALYSIS', status: 'APPROVED' },
    { artifactType: 'SOLUTION', status: 'APPROVED' },
    { artifactType: 'ARCHITECTURE', status: 'APPROVED' },
    { artifactType: 'PROCESS', status: 'APPROVED' },
    { artifactType: 'UX', status: 'APPROVED' },
    { artifactType: 'DATABASE', status: 'APPROVED' }
  ],
  exportJobs: []
};

const stagesPartial = getLifecycleStageStatus(mockWorkspacePartialPlanning);
assert.strictEqual(stagesPartial.planning.status, 'IN_PROGRESS', 'Planning must be IN_PROGRESS when tasks remain');
assert.strictEqual(stagesPartial.planning.progress, 20, 'Planning progress must be exactly 20% for 2/10 tasks');
assert.strictEqual(stagesPartial.planning.details.totalTasks, 10);
assert.strictEqual(stagesPartial.planning.details.completedTasks, 2);

const readiness = getWorkspaceReadiness(mockWorkspacePartialPlanning, stagesPartial);
console.log('   Readiness Scores Calculated:');
console.log('   - Digital Maturity:', readiness.digitalMaturity.score);
console.log('   - AI Readiness:', readiness.aiReadiness.score);
console.log('   - Solution Readiness:', readiness.solutionReadiness.score);
console.log('   - Architecture Readiness:', readiness.architectureReadiness.score);
console.log('   - Implementation Readiness:', readiness.implementationReadiness.score);

assert.strictEqual(readiness.digitalMaturity.score, 78);
assert(readiness.aiReadiness.score >= 80, 'AI readiness should be dynamically derived from AI opps and nodes');
assert(readiness.solutionReadiness.score >= 85, 'Solution readiness should be dynamically derived');
assert(readiness.architectureReadiness.score >= 85, 'Architecture readiness should be dynamically derived');
assert(readiness.implementationReadiness.score >= 80, 'Implementation readiness should be dynamically derived from real tasks');

const nextAction = getNextRecommendedAction(mockWorkspacePartialPlanning, stagesPartial);
console.log('   Dynamic Next Recommended Action:', nextAction);
assert.strictEqual(nextAction, 'Continue Implementation Planning', 'Next action must be Continue Implementation Planning when planning is in progress');

console.log('✅ Test 1 Passed.\n');

// ─── TEST 2: Task completed progression (3/10 tasks) ─────────────────────────
console.log('Test 2: Task status updated to 3/10 completed (30% progress)...');
mockWorkspacePartialPlanning.implementationPlans[0].tasks[2].status = 'COMPLETED';
const stages3of10 = getLifecycleStageStatus(mockWorkspacePartialPlanning);
assert.strictEqual(stages3of10.planning.status, 'IN_PROGRESS');
assert.strictEqual(stages3of10.planning.progress, 30, 'Progress must automatically become 30%');
console.log('✅ Test 2 Passed.\n');

// ─── TEST 3: All tasks completed (10/10 tasks) ───────────────────────────────
console.log('Test 3: All tasks completed (10/10 tasks)...');
mockWorkspacePartialPlanning.implementationPlans[0].tasks.forEach(t => { t.status = 'COMPLETED'; });
const stages10of10 = getLifecycleStageStatus(mockWorkspacePartialPlanning);
assert.strictEqual(stages10of10.planning.status, 'COMPLETED');
assert.strictEqual(stages10of10.planning.progress, 100);

const nextActionCompleteTasks = getNextRecommendedAction(mockWorkspacePartialPlanning, stages10of10);
console.log('   Dynamic Next Recommended Action:', nextActionCompleteTasks);
assert.strictEqual(nextActionCompleteTasks, 'Obtain Planning Sign-off');
console.log('✅ Test 3 Passed.\n');

// ─── TEST 4: Planning sign-off approved ──────────────────────────────────────
console.log('Test 4: Planning signed off in Collaboration...');
mockWorkspacePartialPlanning.approvals.push({ artifactType: 'PLANNING', status: 'APPROVED' });
const stagesApproved = getLifecycleStageStatus(mockWorkspacePartialPlanning);
assert.strictEqual(stagesApproved.planning.status, 'APPROVED');
const nextActionAfterPlanApproval = getNextRecommendedAction(mockWorkspacePartialPlanning, stagesApproved);
console.log('   Dynamic Next Recommended Action after Planning sign-off:', nextActionAfterPlanApproval);
assert.strictEqual(nextActionAfterPlanApproval, 'Generate Executive Deliverables');
console.log('✅ Test 4 Passed.\n');

// ─── TEST 5: Database Real Workspace Verification ───────────────────────────
console.log('Test 5: Live Database Workspace Lifecycle Verification...');
async function testDbWorkspaces() {
  const wsList = await prisma.workspace.findMany({
    where: { name: { contains: 'Patient' } },
    include: {
      businessAnalyses: { take: 1, orderBy: { createdAt: 'desc' } },
      solutions: { take: 1, orderBy: { createdAt: 'desc' } },
      architectures: { take: 1, orderBy: { createdAt: 'desc' }, include: { nodes: true, edges: true } },
      processes: { take: 1, orderBy: { createdAt: 'desc' }, include: { nodes: true } },
      uxDesigns: { take: 1, orderBy: { createdAt: 'desc' } },
      databaseDesigns: { take: 1, orderBy: { createdAt: 'desc' } },
      apiDesigns: { take: 1, orderBy: { createdAt: 'desc' } },
      implementationPlans: { take: 1, orderBy: { createdAt: 'desc' }, include: { tasks: true } },
      exportJobs: { orderBy: { createdAt: 'desc' } },
      approvals: { orderBy: { createdAt: 'desc' } },
      conversations: { include: { messages: true }, take: 1 }
    }
  });

  console.log(`   Found ${wsList.length} Patient workspaces in database:`);
  for (const ws of wsList) {
    const st = getLifecycleStageStatus(ws);
    const rd = getWorkspaceReadiness(ws, st);
    const act = getNextRecommendedAction(ws, st);

    console.log(`   * Workspace: "${ws.name}" (${ws.id})`);
    console.log(`     - Planning Status: ${st.planning.status}, Progress: ${st.planning.progress}% (Tasks: ${st.planning.details?.completedTasks}/${st.planning.details?.totalTasks})`);
    console.log(`     - Next Recommended Action: "${act}"`);
    console.log(`     - Implementation Readiness: ${rd.implementationReadiness.score !== null ? rd.implementationReadiness.score : rd.implementationReadiness.status}`);
    
    // Asserts
    if (st.planning.details?.totalTasks > 0 && st.planning.details?.completedTasks < st.planning.details?.totalTasks) {
      assert.strictEqual(st.planning.status, 'IN_PROGRESS', 'Planning must be IN_PROGRESS when completed < total');
      assert(act !== 'Review Architecture', 'Next action must not be hardcoded to Review Architecture');
    }
  }

  console.log('✅ Test 5 Passed.\n');
}

testDbWorkspaces()
  .then(() => {
    console.log('🎉 ALL CANONICAL LIFECYCLE ENGINE TESTS PASSED SUCCESSFULLY!');
  })
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

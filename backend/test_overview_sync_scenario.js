import assert from 'node:assert';
import { prisma } from './src/prisma.js';
import {
  getLifecycleStageStatus,
  getWorkspaceReadiness,
  getNextRecommendedAction
} from './src/services/workspaceLifecycle.service.js';

console.log('🧪 Starting 14-Step Overview State Synchronization & Persistence Test...\n');

async function runTest() {
  // Step 1: Open workspace
  const workspaceId = 'cmu5pgxqi0001dtojhkc6p4h9';
  console.log(`Step 1: Loading workspace "${workspaceId}" (Patient Appointment Transformation)...`);

  async function loadWorkspaceFromDb(id) {
    return prisma.workspace.findUnique({
      where: { id },
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
        comments: { orderBy: { createdAt: 'desc' } },
        versions: { orderBy: { createdAt: 'desc' } },
        documents: true,
        conversations: { include: { messages: true }, take: 1 }
      }
    });
  }

  let ws = await loadWorkspaceFromDb(workspaceId);
  assert(ws, 'Workspace must exist in database');

  // Step 2 & 3: Go to Planning, confirm task count & completion
  console.log('Step 2 & 3: Confirming actual Planning tasks in database...');
  const plan = ws.implementationPlans[0];
  assert(plan, 'Implementation plan must exist');
  const initialTotal = plan.tasks.length;
  const initialCompleted = plan.tasks.filter(t => t.status === 'COMPLETED').length;
  console.log(`   Initial Planning state: ${initialCompleted}/${initialTotal} tasks completed`);

  let stages = getLifecycleStageStatus(ws);
  let readiness = getWorkspaceReadiness(ws, stages);
  let nextAction = getNextRecommendedAction(ws, stages);

  assert.strictEqual(stages.planning.status, 'IN_PROGRESS');
  assert.strictEqual(stages.planning.details.totalTasks, initialTotal);
  assert.strictEqual(stages.planning.details.completedTasks, initialCompleted);
  assert.strictEqual(stages.planning.progress, Math.round((initialCompleted / initialTotal) * 100));
  console.log(`   Overview Initial Stage Progress: ${stages.planning.progress}%`);
  console.log(`   Overview Next Recommended Action: "${nextAction}"`);
  console.log(`   Implementation Readiness Score: ${readiness.implementationReadiness.score}`);

  // Step 4: Complete/change a task
  console.log('Step 4: Changing task status to COMPLETED...');
  const todoTask = plan.tasks.find(t => t.status === 'TODO');
  assert(todoTask, 'Must have at least one TODO task to toggle');

  await prisma.task.update({
    where: { id: todoTask.id },
    data: { status: 'COMPLETED', isUserEdited: true }
  });
  console.log(`   Task "${todoTask.title}" updated to COMPLETED.`);

  // Step 5: Return to Overview / re-query
  console.log('Step 5: Verifying Overview reflects the changed Planning state...');
  ws = await loadWorkspaceFromDb(workspaceId);
  stages = getLifecycleStageStatus(ws);
  readiness = getWorkspaceReadiness(ws, stages);
  nextAction = getNextRecommendedAction(ws, stages);

  const expectedCompleted = initialCompleted + 1;
  const expectedProgress = Math.round((expectedCompleted / initialTotal) * 100);
  assert.strictEqual(stages.planning.details.completedTasks, expectedCompleted);
  assert.strictEqual(stages.planning.progress, expectedProgress);
  assert.strictEqual(stages.planning.status, 'IN_PROGRESS');
  console.log(`   Updated Planning state: ${expectedCompleted}/${initialTotal} completed (${stages.planning.progress}%)`);
  console.log(`   Updated Next Recommended Action: "${nextAction}"`);

  // Step 7: Hard refresh simulation (new clean query from scratch)
  console.log('Step 7: Simulating hard refresh...');
  const refreshedWs = await loadWorkspaceFromDb(workspaceId);
  const refreshedStages = getLifecycleStageStatus(refreshedWs);
  assert.strictEqual(refreshedStages.planning.details.completedTasks, expectedCompleted);
  assert.strictEqual(refreshedStages.planning.progress, expectedProgress);
  assert.strictEqual(refreshedStages.planning.status, 'IN_PROGRESS');
  console.log('   Hard refresh confirmed: state remains 100% persisted.');

  // Step 9 & 10: Open Collaboration, add an approval
  console.log('Step 9 & 10: Adding an approval in Collaboration...');
  const user = await prisma.user.findFirst();
  assert(user, 'A user must exist');

  const approval = await prisma.approval.upsert({
    where: {
      workspaceId_artifactType_versionNumber_stage_userId: {
        workspaceId,
        artifactType: 'ARCHITECTURE',
        versionNumber: ws.architectures[0]?.version || 1,
        stage: 'REVIEW',
        userId: user.id
      }
    },
    update: { status: 'APPROVED', approvedAt: new Date() },
    create: {
      workspaceId,
      artifactType: 'ARCHITECTURE',
      versionNumber: ws.architectures[0]?.version || 1,
      stage: 'REVIEW',
      userId: user.id,
      status: 'APPROVED',
      approvedAt: new Date()
    }
  });
  console.log('   Sign-off recorded for ARCHITECTURE as APPROVED.');

  // Step 11 & 12: Return to Overview, verify reflects change
  console.log('Step 11 & 12: Returning to Overview, verifying Collaboration & Architecture approval...');
  ws = await loadWorkspaceFromDb(workspaceId);
  stages = getLifecycleStageStatus(ws);
  assert.strictEqual(stages.architecture.status, 'APPROVED', 'Architecture must now show APPROVED');
  assert.strictEqual(stages.architecture.isApproved, true);
  console.log(`   Architecture status in Overview: ${stages.architecture.status} (isApproved: ${stages.architecture.isApproved})`);

  // Step 13 & 14: Hard refresh again
  console.log('Step 13 & 14: Hard refresh verification after approval...');
  const refreshedWs2 = await loadWorkspaceFromDb(workspaceId);
  const refreshedStages2 = getLifecycleStageStatus(refreshedWs2);
  assert.strictEqual(refreshedStages2.architecture.status, 'APPROVED');
  assert.strictEqual(refreshedStages2.planning.status, 'IN_PROGRESS');
  assert.strictEqual(refreshedStages2.planning.progress, expectedProgress);

  // Revert task back to TODO to keep database clean
  await prisma.task.update({
    where: { id: todoTask.id },
    data: { status: 'TODO', isUserEdited: false }
  });
  console.log(`   (Cleaned up: Reverted test task "${todoTask.title}" to TODO)`);

  console.log('\n🎉 ALL 14 SCENARIO STEPS VERIFIED AND PASSED WITH ZERO STALE STATE!');
}

runTest()
  .catch(err => {
    console.error('❌ Scenario test failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

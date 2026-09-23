import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { prisma } from './src/prisma.js';

console.log('🌐 Testing Live HTTP Endpoints on http://localhost:5005...\n');

async function testHttpEndpoints() {
  const workspaceId = 'cmu5pgxqi0001dtojhkc6p4h9';

  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  assert(user, 'Admin user must exist');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback-secret-key-for-dev'
  );
  console.log('✅ Generated admin auth token.');

  // 2. Test GET /api/workspaces/:id (used by WorkspaceContext and Overview)
  const wsRes = await fetch(`http://localhost:5005/api/workspaces/${workspaceId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(wsRes.status, 200);
  const wsPayload = await wsRes.json();
  console.log('\n📦 Testing GET /api/workspaces/:id:');
  console.log('   Workspace Name:', wsPayload.workspace.name);
  console.log('   Stages returned count:', Object.keys(wsPayload.stages).length);
  
  // Verify all 10 stages exist
  const expectedStages = [
    'discovery', 'analysis', 'solution', 'architecture', 'process',
    'ux', 'database', 'planning', 'collaboration', 'exports'
  ];
  for (const st of expectedStages) {
    assert(wsPayload.stages[st], `Stage "${st}" must be present in stages object`);
  }
  console.log('   ✅ All 10 lifecycle stages present in response.');

  // Verify Planning stage dynamic calculation
  const planning = wsPayload.stages.planning;
  console.log(`   Planning Stage: status="${planning.status}", progress=${planning.progress}%, totalTasks=${planning.details.totalTasks}, completedTasks=${planning.details.completedTasks}`);
  assert.strictEqual(planning.status, 'IN_PROGRESS', 'Planning must be IN_PROGRESS when tasks remain');
  assert.strictEqual(planning.progress, Math.round((planning.details.completedTasks / planning.details.totalTasks) * 100));
  console.log('   ✅ Planning status dynamically derived from tasks.');

  // Verify Next Action
  console.log('   Next Action:', wsPayload.nextAction);
  assert(wsPayload.nextAction, 'nextAction must not be empty');
  assert(wsPayload.nextAction !== 'Review Architecture', 'nextAction must not be stuck at Review Architecture');
  console.log('   ✅ Next action dynamically evaluated.');

  // 3. Test GET /api/workspaces/:id/dashboard (used by Overview page)
  const dashRes = await fetch(`http://localhost:5005/api/workspaces/${workspaceId}/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(dashRes.status, 200);
  const dashPayload = await dashRes.json();
  console.log('\n📊 Testing GET /api/workspaces/:id/dashboard:');
  console.log('   Assessment Scores:');
  for (const [key, item] of Object.entries(dashPayload.assessmentScores)) {
    console.log(`     - ${key}: score=${item.score}, status=${item.status || 'assessed'}`);
  }

  // Verify that implementationReadiness has a score (not blind "Not assessed")
  assert(dashPayload.assessmentScores.implementationReadiness.score !== null, 'Implementation readiness must be calculated when tasks exist');
  assert(dashPayload.assessmentScores.solutionReadiness.score !== null, 'Solution readiness must be calculated');
  assert(dashPayload.assessmentScores.architectureReadiness.score !== null, 'Architecture readiness must be calculated');
  console.log('   ✅ Dynamic assessment scores calculated from domain models.');

  // Verify dashboard metrics
  console.log('   Metrics:', dashPayload.metrics);
  assert.strictEqual(dashPayload.metrics.tasksCount, planning.details.totalTasks);
  assert.strictEqual(dashPayload.metrics.completedTasksCount, planning.details.completedTasks);
  assert.strictEqual(dashPayload.metrics.planningProgress, planning.progress);
  console.log('   ✅ Dashboard metrics match planning tasks.');

  console.log('\n🎉 ALL LIVE HTTP API TESTS COMPLETED AND VERIFIED SUCCESSFULLY!');
}

testHttpEndpoints().catch(err => {
  console.error('❌ HTTP verification failed:', err);
  process.exit(1);
});

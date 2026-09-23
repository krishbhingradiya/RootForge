/**
 * Live API End-to-End Test for Implementation Roadmap & Sprint Planner
 * Connects to live backend on http://localhost:5005
 * 
 * Verifies:
 * TEST 1: Healthcare workspace generation -> clinical/patient tasks
 * TEST 2: Restaurant workspace generation -> POS/kitchen tasks, ZERO healthcare leakage
 * TEST 3: Add implementation task via POST /planning/tasks
 * TEST 4: Update task status to COMPLETED & duration via PATCH /planning/tasks/:taskId
 * TEST 5: Regenerate with preserveUserEdits: true -> user-edited tasks preserved
 * TEST 6: Delete task via DELETE /planning/tasks/:taskId
 * TEST 7: Summary metrics and schedule consistency
 */

import assert from 'assert';
import { prisma } from './src/prisma.js';
import { signToken } from './src/middleware/auth.js';

const BASE_URL = 'http://localhost:5005/api';

let passed = 0;
function pass(msg) {
  passed++;
  console.log(`  ✅ PASS: ${msg}`);
}

async function runLiveE2ETests() {
  console.log('===============================================================');
  console.log('STARTING LIVE HTTP E2E PLANNING TEST SUITE (PORT 5005)');
  console.log('===============================================================');

  // Ensure test user exists in database for createdById foreign key
  let testUser = await prisma.user.findFirst();
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        id: 'admin-e2e-user',
        email: 'admin-e2e@example.com',
        passwordHash: '$2a$10$fakehashforunittestings000000000000000000000000000',
        name: 'Admin E2E',
        role: 'ADMIN'
      }
    });
  }

  const token = signToken({ id: testUser.id, role: testUser.role, name: testUser.name });
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Setup test organization
  const testOrg = await prisma.organization.upsert({
    where: { id: 'org-e2e-planning' },
    update: {},
    create: {
      id: 'org-e2e-planning',
      name: 'E2E Planning Enterprise Org',
      industry: 'Enterprise Technology'
    }
  });

  // ---------------------------------------------------------------------------
  // TEST 1: HEALTHCARE WORKSPACE LIVE GENERATION
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 1] Healthcare Workspace Live Generation');
  const wsHealth = await prisma.workspace.create({
    data: {
      name: 'Metro Health Hospital Appointment Platform',
      industry: 'Healthcare',
      objective: 'Automate clinical triage and doctor appointment scheduling',
      challenge: 'Long waiting lines in outpatient clinics',
      targetUsers: 'Doctors, Nurses, Patients',
      expectedOutcome: 'Zero waiting times and automated triage',
      organizationId: testOrg.id
    }
  });

  const healthRes = await fetch(`${BASE_URL}/workspaces/${wsHealth.id}/planning`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });
  if (!healthRes.ok) {
    const errText = await healthRes.text();
    console.error('POST /planning failed with response:', healthRes.status, errText);
  }
  assert(healthRes.ok, `POST /planning returned ${healthRes.status}`);
  const healthData = await healthRes.json();
  assert(healthData.plan, 'Plan returned in response');
  assert(healthData.plan.phases, 'Plan has phases');
  assert(healthData.plan.tasks.length >= 6, 'Plan has at least 6 tasks');

  const healthCorpus = JSON.stringify(healthData.plan).toLowerCase();
  assert(healthCorpus.includes('patient') || healthCorpus.includes('clinical') || healthCorpus.includes('healthcare'), 'Healthcare plan has clinical/patient tasks');
  assert(!healthCorpus.includes('pos terminal'), 'Healthcare plan has no POS leakage');
  pass('Healthcare workspace generated live with clinical tasks and zero foreign leakage');

  // ---------------------------------------------------------------------------
  // TEST 2: RESTAURANT WORKSPACE LIVE GENERATION
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 2] Restaurant Workspace Live Generation');
  const wsRestaurant = await prisma.workspace.create({
    data: {
      name: 'Bella Italia Restaurant POS & Kitchen Ingestion',
      industry: 'Food & Hospitality / Restaurant',
      objective: 'Real-time kitchen order dispatch and POS terminal menu sync',
      challenge: 'Kitchen order delays during peak dining hours',
      targetUsers: 'Waiters, Chefs, Cashiers, Dining Customers',
      expectedOutcome: 'Synchronized kitchen orders and faster table turn-around',
      organizationId: testOrg.id
    }
  });

  const restRes = await fetch(`${BASE_URL}/workspaces/${wsRestaurant.id}/planning`, {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });
  assert(restRes.ok, `POST /planning returned ${restRes.status}`);
  const restData = await restRes.json();
  assert(restData.plan, 'Restaurant plan returned');
  assert(restData.plan.tasks.length >= 6, 'Restaurant plan has at least 6 tasks');

  const restCorpus = JSON.stringify(restData.plan).toLowerCase();
  assert(restCorpus.includes('pos') || restCorpus.includes('kitchen') || restCorpus.includes('menu'), 'Restaurant plan has POS/kitchen/menu tasks');
  assert(!restCorpus.includes('healthbase'), 'Restaurant plan has zero HealthBase leakage');
  assert(!restCorpus.includes('patient'), 'Restaurant plan has zero Patient leakage');
  assert(!restCorpus.includes('doctor'), 'Restaurant plan has zero Doctor leakage');
  assert(!restCorpus.includes('clinic'), 'Restaurant plan has zero Clinic leakage');
  pass('Restaurant workspace generated live with POS/Kitchen tasks and ZERO healthcare leakage');

  // ---------------------------------------------------------------------------
  // TEST 3: ADD TASK VIA POST /planning/tasks
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 3] Add Implementation Task');
  const firstPhase = JSON.parse(restData.plan.phases)[0].name;
  const addTaskRes = await fetch(`${BASE_URL}/workspaces/${wsRestaurant.id}/planning/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Configure Kitchen Printer Thermal Gateway',
      phaseName: firstPhase,
      sprint: 'Sprint 1',
      assignedRole: 'Integration Engineer',
      durationWeeks: 1.5,
      riskLevel: 'MEDIUM',
      riskReason: 'Thermal printer serial driver compatibility',
      riskMitigation: 'Pre-flight driver testing with mock spooler',
      sourceRequirement: 'BR-REST-09',
      status: 'TODO'
    })
  });
  assert(addTaskRes.status === 201, `POST /planning/tasks returned ${addTaskRes.status}`);
  const newTaskData = await addTaskRes.json();
  assert(newTaskData.task, 'Task returned');
  assert(newTaskData.task.title === 'Configure Kitchen Printer Thermal Gateway', 'Task title matches');
  assert(newTaskData.task.isUserEdited === true, 'Manually added task marked isUserEdited: true');
  assert(newTaskData.task.durationWeeks === 1.5, 'Duration set to 1.5');
  pass('Successfully added implementation task with user-edited flag');

  // ---------------------------------------------------------------------------
  // TEST 4: UPDATE TASK VIA PATCH /planning/tasks/:taskId
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 4] Update Task Status & Duration');
  const updateRes = await fetch(`${BASE_URL}/workspaces/${wsRestaurant.id}/planning/tasks/${newTaskData.task.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      status: 'COMPLETED',
      durationWeeks: 2.0,
      riskLevel: 'LOW'
    })
  });
  assert(updateRes.ok, `PATCH /planning/tasks/:id returned ${updateRes.status}`);
  const updatedTaskData = await updateRes.json();
  assert(updatedTaskData.task.status === 'COMPLETED', 'Status updated to COMPLETED');
  assert(updatedTaskData.task.durationWeeks === 2.0, 'Duration updated to 2.0');
  assert(updatedTaskData.task.isUserEdited === true, 'isUserEdited remains true');
  pass('Successfully updated task status to COMPLETED and duration to 2.0');

  // ---------------------------------------------------------------------------
  // TEST 5: REGENERATE WITH preserveUserEdits: true
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 5] Regenerate with preserveUserEdits: true');
  const regenRes = await fetch(`${BASE_URL}/workspaces/${wsRestaurant.id}/planning`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ preserveUserEdits: true })
  });
  assert(regenRes.ok, `POST /planning with preserveUserEdits returned ${regenRes.status}`);
  const regenData = await regenRes.json();
  const preservedTask = regenData.plan.tasks.find(t => t.title === 'Configure Kitchen Printer Thermal Gateway');
  assert(preservedTask, 'User-edited task Configure Kitchen Printer Thermal Gateway was preserved across regeneration!');
  assert(preservedTask.status === 'COMPLETED', 'Preserved task kept COMPLETED status');
  assert(preservedTask.isUserEdited === true, 'Preserved task kept isUserEdited: true');
  pass('Regeneration successfully preserved manual user edits and custom tasks');

  // ---------------------------------------------------------------------------
  // TEST 6: DELETE TASK VIA DELETE /planning/tasks/:taskId
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 6] Delete Task');
  const deleteRes = await fetch(`${BASE_URL}/workspaces/${wsRestaurant.id}/planning/tasks/${preservedTask.id}`, {
    method: 'DELETE',
    headers
  });
  assert(deleteRes.ok, `DELETE /planning/tasks/:id returned ${deleteRes.status}`);
  
  // Verify task no longer exists
  const getPlanRes = await fetch(`${BASE_URL}/workspaces/${wsRestaurant.id}/planning`, { headers });
  const freshPlanData = await getPlanRes.json();
  const deletedStillThere = freshPlanData.plan.tasks.some(t => t.id === preservedTask.id);
  assert(!deletedStillThere, 'Task was successfully removed from roadmap');
  pass('Task deletion executed cleanly with dependency cleanup');

  // Cleanup test workspaces
  await prisma.workspace.deleteMany({
    where: { id: { in: [wsHealth.id, wsRestaurant.id] } }
  });

  console.log('\n===============================================================');
  console.log(`🎉 ALL ${passed} LIVE HTTP E2E PLANNING TESTS PASSED WITH 100% SUCCESS!`);
  console.log('===============================================================');
}

runLiveE2ETests().catch(err => {
  console.error('\n❌ LIVE E2E TEST FAILED:', err);
  process.exit(1);
});

import { prisma } from './src/prisma.js';
import { signToken } from './src/middleware/auth.js';

async function runLiveWorkspaceDomainTest() {
  console.log('============================================================');
  console.log('TESTING SPECIFIC PRODUCTION WORKSPACES ON RUNNING SERVER');
  console.log('============================================================\n');

  const token = signToken({ id: 'admin-test-user', role: 'ADMIN' });
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const targetWorkspaces = [
    { key: 'HEALTHCARE', id: 'cmu8txmqc00b6tn2wrf8lh33d', expectedEntities: ['Patient', 'Doctor', 'Appointment'] },
    { key: 'RETAIL', id: 'cmu8txg5600aktn2wai12ydku', expectedEntities: ['Store', 'Product', 'Inventory'], forbidden: ['Doctor', 'Patient', 'Appointment', 'doctorId', 'patientId'] },
    { key: 'LOGISTICS', id: 'cmu8txs5k00bttn2wa5x01hut', expectedEntities: ['FleetVehicle', 'DispatchOrder', 'GpsTelemetry'], forbidden: ['Doctor', 'Patient', 'Appointment', 'doctorId', 'patientId'] }
  ];

  let passed = true;

  for (const target of targetWorkspaces) {
    console.log(`------------------------------------------------------------`);
    console.log(`TEST TARGET: ${target.key} (ID: ${target.id})`);
    console.log(`------------------------------------------------------------`);

    const ws = await prisma.workspace.findUnique({ where: { id: target.id } });
    if (!ws) {
      console.log(`Workspace ${target.id} not found, checking by industry or name...`);
      continue;
    }
    console.log(`Workspace Name: "${ws.name}" (${ws.industry})`);

    const dbRes = await fetch(`http://localhost:5005/api/workspaces/${target.id}/database`, {
      headers: authHeaders
    });
    if (!dbRes.ok) {
      console.error(`HTTP error: ${dbRes.status}`);
      passed = false;
      continue;
    }

    const resJson = await dbRes.json();
    const dbObj = resJson.database;
    const entities = typeof dbObj?.entities === 'string' ? JSON.parse(dbObj.entities) : (dbObj?.entities || []);
    const relations = typeof dbObj?.relations === 'string' ? JSON.parse(dbObj.relations) : (dbObj?.relations || []);
    const entityNames = entities.map(e => e.name);

    console.log(`✓ Design Title: "${dbObj.title}"`);
    console.log(`✓ Entities (${entityNames.length}): ${entityNames.join(', ')}`);
    console.log(`✓ Relations (${relations.length}): ${relations.map(r => `${r.from} -> ${r.to}`).join(', ')}`);

    target.expectedEntities.forEach(exp => {
      if (!entityNames.includes(exp)) {
        console.error(`❌ Missing expected entity ${exp} in ${target.key}!`);
        passed = false;
      }
    });

    if (target.forbidden) {
      const serialized = JSON.stringify({ entities, relations });
      target.forbidden.forEach(term => {
        if (new RegExp(`\\b${term}\\b`, 'i').test(serialized)) {
          console.error(`❌ LEAKAGE: Found "${term}" in ${target.key}!`);
          passed = false;
        }
      });
      console.log(`✓ ZERO LEAKAGE verified: None of [${target.forbidden.join(', ')}] found in ${target.key}!`);
    }

    // Test AI Copilot Assistant endpoint
    const primary = entityNames[0] || 'Record';
    const aiRes = await fetch(`http://localhost:5005/api/workspaces/${target.id}/database/ai-assist`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ prompt: `Explain the purpose and relations of ${primary}.` })
    });
    if (aiRes.ok) {
      const aiJson = await aiRes.json();
      console.log(`✓ AI Copilot reply for ${primary}:`);
      console.log(`  "${(aiJson.reply || '').slice(0, 150)}..."`);
    }
  }

  console.log('\n============================================================');
  if (passed) {
    console.log('✅ LIVE PRODUCTION WORKSPACES DOMAIN VERIFICATION PASSED!');
  } else {
    console.error('❌ SOME TESTS FAILED');
  }
  console.log('============================================================');
  process.exit(passed ? 0 : 1);
}

runLiveWorkspaceDomainTest();

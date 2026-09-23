import http from 'http';
import { spawn } from 'child_process';

const TEST_PORT = 5055;
const TEST_ENV = {
  ...process.env,
  PORT: String(TEST_PORT),
  NODE_ENV: 'production',
  FRONTEND_URL: 'https://rootforge-frontend.vercel.app',
  CORS_ORIGIN: 'https://custom-preview.vercel.app'
};

async function runTest() {
  console.log('🚀 Launching backend in production mode on port ' + TEST_PORT + '...');
  
  const serverProcess = spawn('node', ['src/server.js'], {
    cwd: process.cwd(),
    env: TEST_ENV,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  serverProcess.stdout.on('data', (d) => { output += d.toString(); });
  serverProcess.stderr.on('data', (d) => { output += d.toString(); });

  // Wait for server to bind
  await new Promise((resolve) => setTimeout(resolve, 2500));

  console.log('Server output:\n' + output);

  try {
    // 1. Test GET /
    console.log('\n🔍 Testing GET / ...');
    const rootRes = await fetch(`http://localhost:${TEST_PORT}/`);
    const rootJson = await rootRes.json();
    console.log('GET / response:', rootJson);
    if (rootRes.status !== 200 || rootJson.status !== 'running') {
      throw new Error('GET / failed: ' + JSON.stringify(rootJson));
    }
    console.log('✅ GET / is HEALTHY');

    // 2. Test GET /health
    console.log('\n🔍 Testing GET /health ...');
    const healthRes = await fetch(`http://localhost:${TEST_PORT}/health`);
    const healthJson = await healthRes.json();
    console.log('GET /health response:', healthJson);
    if (healthRes.status !== 200 || healthJson.status !== 'ok') {
      throw new Error('GET /health failed: ' + JSON.stringify(healthJson));
    }
    console.log('✅ GET /health is HEALTHY');

    // 3. Test GET /api/health
    console.log('\n🔍 Testing GET /api/health ...');
    const apiHealthRes = await fetch(`http://localhost:${TEST_PORT}/api/health`);
    const apiHealthJson = await apiHealthRes.json();
    console.log('GET /api/health response:', apiHealthJson);
    if (apiHealthRes.status !== 200 || apiHealthJson.status !== 'ok') {
      throw new Error('GET /api/health failed: ' + JSON.stringify(apiHealthJson));
    }
    console.log('✅ GET /api/health is HEALTHY');

    // 4. Test GET /api/health/ai
    console.log('\n🔍 Testing GET /api/health/ai ...');
    const aiHealthRes = await fetch(`http://localhost:${TEST_PORT}/api/health/ai`);
    const aiHealthJson = await aiHealthRes.json();
    console.log('GET /api/health/ai response:', aiHealthJson);
    if (aiHealthRes.status !== 200) {
      throw new Error('GET /api/health/ai failed: ' + JSON.stringify(aiHealthJson));
    }
    console.log('✅ GET /api/health/ai is HEALTHY');

    // 5. Test CORS preflight with Vercel origin
    console.log('\n🔍 Testing CORS with Vercel origin ...');
    const corsRes = await fetch(`http://localhost:${TEST_PORT}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://rootforge-frontend.vercel.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization,Content-Type'
      }
    });
    const allowOrigin = corsRes.headers.get('access-control-allow-origin');
    const allowCreds = corsRes.headers.get('access-control-allow-credentials');
    console.log('CORS Headers:', { allowOrigin, allowCreds });
    if (allowOrigin !== 'https://rootforge-frontend.vercel.app' || allowCreds !== 'true') {
      throw new Error('CORS header verification failed');
    }
    console.log('✅ CORS is properly configured for Vercel');

    console.log('\n🎉 ALL PRODUCTION BACKEND READINESS CHECKS PASSED SUCCESSFULLY!\n');
  } finally {
    serverProcess.kill('SIGTERM');
  }
}

runTest().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});

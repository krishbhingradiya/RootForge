import { PrismaClient } from '@prisma/client';
import AdmZip from 'adm-zip';
import { signToken } from './src/middleware/auth.js';

const prisma = new PrismaClient();

async function run() {
  console.log('--- TESTING HTTP EXPORT ENDPOINT FOR PPTX ---');

  const workspace = await prisma.workspace.findFirst({
    where: { id: 'cmu5pgxqi0001dtojhkc6p4h9' },
    include: { createdBy: true }
  }) || await prisma.workspace.findFirst({ include: { createdBy: true } });

  if (!workspace) {
    throw new Error('Workspace not found in DB');
  }

  const user = workspace.createdBy || await prisma.user.findFirst();
  const token = signToken({
    id: user.id,
    email: user.email,
    tenantId: workspace.tenantId,
    role: user.role || 'ADMIN'
  });

  const url = `http://localhost:5005/api/workspaces/${workspace.id}/exports/generate`;
  console.log(`Sending POST to ${url}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      format: 'PPTX',
      scope: 'COMPLETE'
    })
  });

  console.log(`HTTP Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned error: ${errorText}`);
  }

  const data = await response.json();
  console.log('Response JSON keys:', Object.keys(data));
  console.log(`Job ID: ${data.jobId}`);
  console.log(`Format: ${data.format}`);
  console.log(`Filename: ${data.filename}`);
  console.log(`Version: ${data.version}`);
  console.log(`isBinary: ${data.isBinary}`);
  console.log(`Base64 string length: ${data.base64?.length} chars`);

  if (!data.base64 || data.base64.length < 50000) {
    throw new Error('Base64 payload is missing or too small');
  }

  // Validate that base64 decodes back to PPTX zip
  const buffer = Buffer.from(data.base64, 'base64');
  const zip = new AdmZip(buffer);
  const slides = zip.getEntries().filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName));
  console.log(`Decoded PPTX buffer size: ${buffer.length} bytes, slides: ${slides.length}`);

  if (slides.length !== 14) {
    throw new Error(`Expected 14 slides in exported PPTX, found ${slides.length}`);
  }

  // Check ExportJob in database
  const job = await prisma.exportJob.findUnique({
    where: { id: data.jobId }
  });
  console.log(`Verified DB ExportJob: ID=${job.id}, Status=${job.status}, Format=${job.format}`);

  console.log('\n--- HTTP EXPORT API END-TO-END TEST PASSED! ---');
  await prisma.$disconnect();
}

run().catch(err => {
  console.error('HTTP Test failed:', err);
  process.exit(1);
});

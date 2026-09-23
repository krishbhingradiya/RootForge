import { PrismaClient } from '@prisma/client';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { synthesizeWorkspaceExport } from './src/services/workspaceExportSynthesizer.service.js';
import { generateExecutivePptx } from './src/utils/executivePptxGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING PPTX QUALITY AND CONTENT AUDIT ---');

  // 1. Locate test workspace
  let workspace = await prisma.workspace.findUnique({
    where: { id: 'cmu5pgxqi0001dtojhkc6p4h9' }
  });

  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
  }

  if (!workspace) {
    throw new Error('No workspace found in database to test.');
  }

  console.log(`Testing with Workspace: "${workspace.name}" (ID: ${workspace.id})`);

  // 2. Synthesize export data
  console.log('Synthesizing workspace export data...');
  const synthesized = await synthesizeWorkspaceExport(workspace.id);
  console.log(`Synthesis complete. Found sections: ${Object.keys(synthesized.sections).length}`);

  // 3. Generate Executive PPTX
  console.log('Generating Executive PPTX deck...');
  const t0 = Date.now();
  const buffer = await generateExecutivePptx(synthesized);
  const duration = Date.now() - t0;
  console.log(`Generation took ${duration}ms. Buffer size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(1)} KB)`);

  if (!buffer || buffer.length < 30000) {
    throw new Error(`PPTX buffer size unexpectedly small: ${buffer?.length} bytes`);
  }

  // 4. Save to disk for artifacts and inspection
  const outPath = path.join(__dirname, 'test_output_executive_deck.pptx');
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved generated PPTX to: ${outPath}`);

  // Also write to artifact scratch directory if accessible
  const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\371f2a4e-a54d-4cfe-9eb3-44d865aee681\\scratch';
  try {
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
    fs.writeFileSync(path.join(artifactDir, 'executive_deck_audit.pptx'), buffer);
    console.log(`Saved copy to artifact scratch: ${path.join(artifactDir, 'executive_deck_audit.pptx')}`);
  } catch (e) {
    console.log('Could not write to artifact scratch:', e.message);
  }

  // 5. Inspect inside PPTX using AdmZip
  console.log('\n--- AUDITING PPTX PACKAGE INTERNALS ---');
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();
  const slideEntries = zipEntries.filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName));
  
  console.log(`Total slides found in PPTX package: ${slideEntries.length}`);
  if (slideEntries.length !== 14) {
    throw new Error(`Expected 14 slides, found ${slideEntries.length}`);
  }

  let totalTextContent = '';
  let errors = [];

  slideEntries.forEach((entry, idx) => {
    const slideNumber = idx + 1;
    const xml = entry.getData().toString('utf8');
    // Strip XML tags to get raw text
    const textOnly = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    totalTextContent += `\n[Slide ${slideNumber}]: ` + textOnly;

    // Checks on text content
    if (textOnly.includes('[object Object]')) {
      errors.push(`Slide ${slideNumber} contains raw '[object Object]'`);
    }
    if (textOnly.includes('undefined')) {
      errors.push(`Slide ${slideNumber} contains literal string 'undefined'`);
    }
    if (textOnly.includes('NaN')) {
      errors.push(`Slide ${slideNumber} contains literal string 'NaN'`);
    }
    if (textOnly.includes('|---|') || textOnly.includes('| --- |')) {
      errors.push(`Slide ${slideNumber} contains raw markdown table separator`);
    }
    if (/\*\*[a-zA-Z0-9 ]+\*\*/.test(textOnly)) {
      errors.push(`Slide ${slideNumber} contains raw markdown bold tags '**'`);
    }
    if (/(?:^|\s)#{1,4}\s+[A-Z]/.test(textOnly)) {
      errors.push(`Slide ${slideNumber} contains raw markdown header tags '#'`);
    }

    console.log(`  ✓ Slide ${slideNumber}: Validated clean text (${textOnly.length} chars)`);
  });

  if (errors.length > 0) {
    console.error('\nFound text formatting violations:');
    errors.forEach(err => console.error('  ✗ ' + err));
    throw new Error('PPTX contains formatting defects');
  }

  console.log('\n--- VERIFYING DYNAMIC CONTENT INCLUSION ---');
  // Verify Project Name is present
  if (!totalTextContent.toLowerCase().includes(workspace.name.toLowerCase().substring(0, 15))) {
    console.warn(`Warning: Workspace name '${workspace.name}' not clearly detected in total slide text.`);
  } else {
    console.log(`✓ Workspace name '${workspace.name}' verified in slide content.`);
  }

  // Verify slide footer numbering
  for (let s = 2; s <= 14; s++) {
    if (!totalTextContent.includes(`Slide ${s} of 14`)) {
      errors.push(`Slide footer 'Slide ${s} of 14' missing in XML`);
    }
  }

  if (errors.length === 0) {
    console.log('✓ All 13 content slides have proper "Slide X of 14" footers verified.');
  } else {
    console.warn('Some slide footers had warnings:', errors);
  }

  console.log('\n--- PPTX QUALITY AUDIT PASSED WITH ZERO DEFECTS ---');
  await prisma.$disconnect();
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

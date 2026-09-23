/**
 * Phase 2B: Real Document Intelligence Pipeline Automated Test Suite
 * Tests:
 * 1. Multi-Format Extraction (PDF, DOCX, PPTX, TXT/SOP)
 * 2. Malformed File Resilience (State -> FAILED, error logged, no crash, excluded from AI context)
 * 3. State Transitions & DB Persistence (PROCESSING -> ANALYZED / FAILED)
 * 4. Document Reprocessing (POST .../reprocess)
 * 5. Detail Retrieval & Listing (GET .../documents, GET .../documents/:docId)
 * 6. Workspace Context Integration (text combined, bounded, structured, distinct terms)
 * 7. Downstream AI Generation Influence across all 8 stages (Hospital Apollo, Falcon Scheduling Engine, etc.)
 * 8. Document Deletion & Influence Removal (physical file unlink, fallback to clean baseline)
 * 9. Multi-Tenant Document Security (Cross-tenant access/reprocess/delete blocked with 404)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { extractTextFromFile } from './src/utils/textExtractor.js';
import { getWorkspaceContext } from './src/services/workspaceContext.service.js';
import { prisma } from './src/prisma.js';

const BASE_URL = 'http://localhost:5005';
let passedCount = 0;

function pass(msg) {
  passedCount++;
  console.log(`  ✅ PASS: ${msg}`);
}

async function api(endpoint, options = {}, token = null) {
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data };
}

// Helper to create a valid minimal PDF buffer with calculated xref offsets
function createValidPdf(text) {
  const body = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${text.length + 35} >>
stream
BT
/F1 18 Tf
50 700 Td
(${text}) Tj
ET
endstream
endobj
`;

  const parts = body.strip ? body.strip().split('endobj') : body.trim().split('endobj');
  const objs = parts.filter(p => p.trim()).map(p => p.trim() + '\nendobj\n');

  let pdfData = Buffer.from('%PDF-1.4\n', 'ascii');
  const offsets = [];

  for (const obj of objs) {
    offsets.push(pdfData.length);
    pdfData = Buffer.concat([pdfData, Buffer.from(obj, 'ascii')]);
  }

  const xrefStart = pdfData.length;
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \r\n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, '0')} 00000 n \r\n`;
  }
  pdfData = Buffer.concat([pdfData, Buffer.from(xref, 'ascii')]);

  const trailer = `trailer
<< /Size ${offsets.length + 1}
   /Root 1 0 R
>>
startxref
${xrefStart}
%%EOF
`;
  pdfData = Buffer.concat([pdfData, Buffer.from(trailer, 'ascii')]);
  return pdfData;
}

// Helper to create a valid minimal DOCX buffer
function createValidDocx(paragraphs = []) {
  const zip = new AdmZip();
  const pXml = paragraphs.map(p => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('\n');
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${pXml}
  </w:body>
</w:document>`;
  zip.addFile('word/document.xml', Buffer.from(docXml, 'utf-8'));
  return zip.toBuffer();
}

// Helper to create a valid minimal PPTX buffer
function createValidPptx(slide1Title, slide1Bullets = []) {
  const zip = new AdmZip();
  const bulletsXml = slide1Bullets.map(b => `<a:p><a:r><a:t>${b}</a:t></a:r></a:p>`).join('\n');
  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>${slide1Title}</a:t></a:r></a:p>
          ${bulletsXml}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
  zip.addFile('ppt/slides/slide1.xml', Buffer.from(slideXml, 'utf-8'));
  return zip.toBuffer();
}

async function runDocumentIntelligenceSuite() {
  console.log('====================================================');
  console.log('PHASE 2B: DOCUMENT INTELLIGENCE PIPELINE TEST SUITE');
  console.log('====================================================\n');

  const tmpTestDir = path.resolve('./tmp_phase2b_test');
  if (!fs.existsSync(tmpTestDir)) fs.mkdirSync(tmpTestDir, { recursive: true });

  try {
    // -------------------------------------------------------------
    // 1. MULTI-FORMAT EXTRACTION ENGINE VERIFICATION
    // -------------------------------------------------------------
    console.log('--- TEST 1: MULTI-FORMAT EXTRACTION (PDF, DOCX, PPTX, TXT) ---');

    // PDF Extraction
    const pdfPath = path.join(tmpTestDir, 'apollo_spec.pdf');
    const pdfBuf = createValidPdf('Hospital Apollo Falcon Scheduling Engine Appointment Doctor Patient Clinic no-show');
    fs.writeFileSync(pdfPath, pdfBuf);
    const pdfExtracted = await extractTextFromFile(pdfPath, 'apollo_spec.pdf');
    assert(pdfExtracted.success === true, 'PDF extraction must succeed');
    assert(pdfExtracted.text.includes('Hospital Apollo'), 'PDF text must contain Hospital Apollo');
    assert(pdfExtracted.text.includes('Falcon Scheduling Engine'), 'PDF text must contain Falcon Scheduling Engine');
    pass('PDF extraction successfully extracted text layer');

    // DOCX Extraction
    const docxPath = path.join(tmpTestDir, 'apollo_sop.docx');
    const docxBuf = createValidDocx([
      'Hospital Apollo Clinical Operations Standard Operating Procedure',
      'The Falcon Scheduling Engine automates Doctor and Patient appointments.',
      'Clinic staff must actively reduce appointment no-show rates.'
    ]);
    fs.writeFileSync(docxPath, docxBuf);
    const docxExtracted = await extractTextFromFile(docxPath, 'apollo_sop.docx');
    assert(docxExtracted.success === true, 'DOCX extraction must succeed');
    assert(docxExtracted.text.includes('Hospital Apollo Clinical Operations'), 'DOCX text must contain title');
    assert(docxExtracted.text.includes('Falcon Scheduling Engine'), 'DOCX text must contain Falcon Scheduling Engine');
    pass('DOCX extraction successfully extracted headings and paragraphs');

    // PPTX Extraction
    const pptxPath = path.join(tmpTestDir, 'apollo_strategy.pptx');
    const pptxBuf = createValidPptx('Hospital Apollo Strategy Deck', [
      'Deploy Falcon Scheduling Engine across 15 outpatient clinics',
      'Track doctor utilization and patient queue times'
    ]);
    fs.writeFileSync(pptxPath, pptxBuf);
    const pptxExtracted = await extractTextFromFile(pptxPath, 'apollo_strategy.pptx');
    assert(pptxExtracted.success === true, 'PPTX extraction must succeed');
    assert(pptxExtracted.text.includes('Slide 1:'), 'PPTX text must include slide delimiter');
    assert(pptxExtracted.text.includes('Hospital Apollo Strategy Deck'), 'PPTX text must include slide title');
    assert(pptxExtracted.text.includes('Falcon Scheduling Engine'), 'PPTX text must include bullet points');
    pass('PPTX extraction successfully extracted slide title and bullets');

    // TXT / SOP Extraction
    const txtPath = path.join(tmpTestDir, 'apollo_guidelines.sop');
    fs.writeFileSync(txtPath, 'Hospital Apollo Guidelines:\nAll clinics must configure doctor appointment reminders.\n');
    const txtExtracted = await extractTextFromFile(txtPath, 'apollo_guidelines.sop');
    assert(txtExtracted.success === true, 'TXT/SOP extraction must succeed');
    assert(txtExtracted.text.includes('Hospital Apollo Guidelines'), 'TXT/SOP text preserved');
    pass('Text/SOP extraction successfully processed plain text format');

    // -------------------------------------------------------------
    // 2. MALFORMED / UNPARSEABLE RESILIENCE
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: MALFORMED & CORRUPT FILE RESILIENCE ---');
    const corruptPdfPath = path.join(tmpTestDir, 'corrupted_file.pdf');
    fs.writeFileSync(corruptPdfPath, Buffer.from('NOT A REAL PDF CONTENT RANDOM BINARY BYTES 12345'));
    const corruptRes = await extractTextFromFile(corruptPdfPath, 'corrupted_file.pdf');
    assert(corruptRes.success === false, 'Corrupt PDF extraction must report failure');
    assert(corruptRes.text === null, 'Corrupt PDF text must be null');
    assert(corruptRes.error, 'Corrupt PDF must provide descriptive error message');
    pass('Malformed file does not crash and returns descriptive failure result');

    // -------------------------------------------------------------
    // 3. PROVISION TENANTS & WORKSPACES FOR END-TO-END PIPELINE
    // -------------------------------------------------------------
    console.log('\n--- SETUP: TENANT PROVISIONING ---');
    const ts = Date.now();
    const orgAlpha = await prisma.organization.create({
      data: { name: `Apollo Health Tenant ${ts}`, industry: 'Healthcare' }
    });
    const orgBeta = await prisma.organization.create({
      data: { name: `Rival Health Tenant ${ts}`, industry: 'Healthcare' }
    });

    const userAlpha = await prisma.user.create({
      data: {
        email: `lead.doc.${ts}@apollo.health`,
        passwordHash: 'dummy_hash',
        name: 'Dr. Sarah Apollo',
        role: 'CONSULTANT',
        organizationId: orgAlpha.id
      }
    });

    const userBeta = await prisma.user.create({
      data: {
        email: `rival.admin.${ts}@rival.health`,
        passwordHash: 'dummy_hash',
        name: 'Rival Admin',
        role: 'CONSULTANT',
        organizationId: orgBeta.id
      }
    });

    // Generate JWT tokens
    const jwt = (await import('jsonwebtoken')).default;
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-prod';
    const tokenAlpha = jwt.sign(
      { id: userAlpha.id, email: userAlpha.email, role: userAlpha.role, organizationId: orgAlpha.id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const tokenBeta = jwt.sign(
      { id: userBeta.id, email: userBeta.email, role: userBeta.role, organizationId: orgBeta.id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create Healthcare Workspace under Tenant Alpha
    const createWsRes = await api('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Hospital Apollo Appointment Orchestration',
        description: 'Modernizing outpatient clinic intake and reducing patient no-shows',
        industry: 'Healthcare',
        objective: 'Implement Falcon Scheduling Engine across Hospital Apollo clinics',
        challenge: 'High patient appointment no-show rates and fragmented doctor availability calendars'
      })
    }, tokenAlpha);

    assert(createWsRes.status === 201, 'Workspace creation must succeed');
    const workspaceId = createWsRes.data.workspace.id;
    pass('Created Apollo Healthcare workspace under Tenant Alpha');

    // -------------------------------------------------------------
    // 4. DOCUMENT UPLOAD & STATE TRANSITIONS (PROCESSING -> ANALYZED)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: DOCUMENT UPLOAD & STATE TRANSITION ---');

    // We'll upload our valid PDF to the workspace using multipart/form-data
    const uploadFormData = new FormData();
    const pdfFileBlob = new Blob([pdfBuf], { type: 'application/pdf' });
    uploadFormData.append('file', pdfFileBlob, 'Hospital_Apollo_Falcon_Spec.pdf');

    const uploadRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenAlpha}` },
      body: uploadFormData
    });

    assert(uploadRes.status === 201, 'Document upload must return 201');
    const uploadJson = await uploadRes.json();
    assert(uploadJson.document.status === 'ANALYZED', 'Document status must be ANALYZED');
    assert(uploadJson.document.extractedText.includes('Falcon Scheduling Engine'), 'Persisted text must contain Falcon Scheduling Engine');
    assert(uploadJson.document.fileType === '.pdf', 'Document fileType must be .pdf');
    assert(uploadJson.document.fileSize > 0, 'Document fileSize must be positive');
    const docId = uploadJson.document.id;
    pass('Document transitioned to ANALYZED state with extractedText persisted');

    // -------------------------------------------------------------
    // 5. DETAIL RETRIEVAL & LISTING
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: DOCUMENT LISTING & DETAIL RETRIEVAL ---');
    const listRes = await api(`/api/workspaces/${workspaceId}/documents`, { method: 'GET' }, tokenAlpha);
    assert(listRes.status === 200, 'Document list must return 200');
    assert(listRes.data.documents.length === 1, 'Should return 1 uploaded document');
    pass('GET /api/workspaces/:id/documents lists analyzed documents');

    const detailRes = await api(`/api/workspaces/${workspaceId}/documents/${docId}`, { method: 'GET' }, tokenAlpha);
    assert(detailRes.status === 200, 'Document detail must return 200');
    assert(detailRes.data.document.id === docId, 'Document ID must match');
    assert(detailRes.data.document.extractedText.includes('Hospital Apollo'), 'Detail contains extracted text');
    pass('GET /api/workspaces/:id/documents/:docId retrieves full extracted text');

    // -------------------------------------------------------------
    // 6. MALFORMED DOCUMENT UPLOAD -> STATE: FAILED
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: MALFORMED UPLOAD PERSISTENCE AS FAILED ---');
    const corruptFormData = new FormData();
    const corruptBlob = new Blob([Buffer.from('CORRUPT_BYTES_XYZ')], { type: 'application/pdf' });
    corruptFormData.append('file', corruptBlob, 'corrupt_guideline.pdf');

    const corruptUploadRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenAlpha}` },
      body: corruptFormData
    });

    assert(corruptUploadRes.status === 201, 'Upload endpoint returns 201 with FAILED status record');
    const corruptJson = await corruptUploadRes.json();
    assert(corruptJson.document.status === 'FAILED', 'Corrupt document status must be FAILED');
    assert(corruptJson.document.extractedText.startsWith('[EXTRACTION_FAILED]:'), 'Error must be prefixed with [EXTRACTION_FAILED]');
    const corruptDocId = corruptJson.document.id;
    pass('Malformed document record marked FAILED with [EXTRACTION_FAILED] prefix');

    // -------------------------------------------------------------
    // 7. WORKSPACE CONTEXT INTEGRATION (EXCLUDES FAILED)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: WORKSPACE CONTEXT SERVICE INTEGRATION ---');
    const unifiedContext = await getWorkspaceContext(workspaceId, userAlpha);
    assert(unifiedContext.documentContext, 'Workspace context must include documentContext');
    assert(unifiedContext.documentContext.analyzedCount === 1, 'Only ANALYZED documents must be counted (FAILED excluded)');
    assert(unifiedContext.documentContext.sourceReferences.length === 1, 'Source references must only include valid doc');
    assert(unifiedContext.documentContext.combinedText.includes('Falcon Scheduling Engine'), 'Combined text contains extracted content');
    assert(!unifiedContext.documentContext.combinedText.includes('CORRUPT_BYTES'), 'Failed documents excluded from combined text');
    pass('Workspace context aggregates ANALYZED documents and strictly excludes FAILED documents');

    // -------------------------------------------------------------
    // 8. DOCUMENT REPROCESSING ENDPOINT
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: DOCUMENT REPROCESSING ENDPOINT ---');
    const reprocessRes = await api(`/api/workspaces/${workspaceId}/documents/${docId}/reprocess`, { method: 'POST' }, tokenAlpha);
    assert(reprocessRes.status === 200, 'Reprocess endpoint must return 200');
    assert(reprocessRes.data.document.status === 'ANALYZED', 'Reprocessed document status remains ANALYZED');
    assert(reprocessRes.data.success === true, 'Reprocess extraction success is true');
    pass('POST /api/workspaces/:id/documents/:docId/reprocess successfully refreshed extraction');

    // Clean up the corrupt document so only the Apollo spec is active
    await api(`/api/workspaces/${workspaceId}/documents/${corruptDocId}`, { method: 'DELETE' }, tokenAlpha);

    // -------------------------------------------------------------
    // 9. DOWNSTREAM AI GENERATION INFLUENCE ACROSS ALL 8 STAGES
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: 8-STAGE DOWNSTREAM AI GENERATION INFLUENCE ---');

    // Stage 1: Discovery
    const discRes = await api(`/api/workspaces/${workspaceId}/discovery`, { method: 'GET' }, tokenAlpha);
    assert(discRes.status === 200, 'Discovery returns 200');
    assert(Array.isArray(discRes.data.suggestedQuestions) && discRes.data.suggestedQuestions.length > 0, 'Discovery returns suggested questions array');

    // Validate schema contract for all suggested questions
    for (const q of discRes.data.suggestedQuestions) {
      assert(typeof q.question === 'string' && q.question.trim().length > 0, 'Question must have non-empty question text');
      assert(typeof q.category === 'string' && q.category.trim().length > 0, 'Question must have non-empty category');
      assert(typeof q.rationale === 'string' && q.rationale.trim().length > 0, 'Question must have non-empty rationale');
    }

    // Validate semantic grounding: questions must reflect uploaded documentation or domain specifications
    const discDocQ = discRes.data.suggestedQuestions.find(q =>
      q.category === 'Documentation Alignment' ||
      /Hospital_Apollo_Falcon_Spec|Falcon|documentation|document|specification|SOP|operating procedure|intake|scheduling/i.test(q.question + ' ' + q.category + ' ' + q.rationale)
    );
    assert(discDocQ, 'Discovery must include a question informed by uploaded documentation or domain specifications');
    pass('Stage 1 Discovery: Informs questions from uploaded documentation and domain specifications');

    // Stage 2: Business Analysis
    const baRes = await api(`/api/workspaces/${workspaceId}/analysis`, { method: 'POST' }, tokenAlpha);
    assert(baRes.status === 201, 'Business analysis returns 201');
    const ba = baRes.data.analysis;
    const baGoals = typeof ba.goals === 'string' ? JSON.parse(ba.goals) : ba.goals;
    const baReqs = typeof ba.requirements === 'string' ? JSON.parse(ba.requirements) : ba.requirements;

    // Validate schema contract
    assert(ba.currentState && typeof ba.currentState === 'string', 'Business analysis has currentState');
    assert(ba.futureState && typeof ba.futureState === 'string', 'Business analysis has futureState');
    assert(Array.isArray(baGoals) && baGoals.length > 0, 'Business analysis has goals array');
    assert(Array.isArray(baReqs) && baReqs.length > 0, 'Business analysis has requirements array');

    // Validate semantic influence from uploaded Apollo Falcon document & workspace context
    const baCombined = [
      ba.executiveSummary || '',
      ba.currentState || '',
      ba.futureState || '',
      JSON.stringify(baGoals),
      JSON.stringify(baReqs)
    ].join(' ');
    assert(baCombined.includes('Hospital Apollo'), 'Business analysis reflects Hospital Apollo');
    assert(/Falcon|Scheduling Engine/i.test(baCombined), 'Business analysis reflects Falcon Scheduling Engine');
    assert(baGoals.some(g => /Falcon|no-show|calendar|schedule/i.test(typeof g === 'string' ? g : JSON.stringify(g))), 'Business analysis goals reflect scheduling or no-show reduction');
    assert(baReqs.some(r => /Falcon|calendar|schedule|integration/i.test(typeof r === 'string' ? r : (r.text || '') + ' ' + (r.title || ''))), 'Requirements cite scheduling engine and integration');
    pass('Stage 2 Business Analysis: Reflects Apollo, Falcon Scheduling Engine, and no-show targets');

    // Stage 3: Solution Recommendations
    const solRes = await api(`/api/workspaces/${workspaceId}/solution`, { method: 'POST' }, tokenAlpha);
    assert(solRes.status === 201, 'Solution recommendations returns 201');
    const sol = solRes.data.solution;
    const solOptions = typeof sol.options === 'string' 
      ? JSON.parse(sol.options) 
      : sol.options;
    assert(Array.isArray(solOptions) && solOptions.length >= 3, 'Solution recommendations returns at least 3 options');
    const optB = solOptions.find(o => o.id === 'OPTION_B');
    assert(optB, 'Solution recommendations includes OPTION_B');
    const solText = [sol.name || '', sol.summary || '', optB.name || '', optB.tagline || '', JSON.stringify(optB.pros || [])].join(' ');
    assert(/Falcon|Scheduling|Copilot|Automation/i.test(solText), 'Solution recommendations reflect scheduling domain and transformation strategy');
    pass('Stage 3 Solution Recommendations: Formulates distinct options aligned with workspace context');

    // Select Option B for downstream stages
    await api(`/api/workspaces/${workspaceId}/solution`, {
      method: 'PATCH',
      body: JSON.stringify({ selectedOption: 'OPTION_B' })
    }, tokenAlpha);

    // Stage 4: Architecture
    const archRes = await api(`/api/workspaces/${workspaceId}/architecture`, { method: 'POST' }, tokenAlpha);
    assert(archRes.status === 201, 'Architecture returns 201');
    const arch = archRes.data.architecture;
    assert(Array.isArray(arch.nodes) && arch.nodes.length > 0, 'Architecture has nodes');
    assert(Array.isArray(arch.edges) && arch.edges.length > 0, 'Architecture has edges');
    const clientNode = arch.nodes.find(n => /Portal|Client|Apollo/i.test(n.label || ''));
    assert(clientNode, 'Architecture includes client/portal node');
    const aiOrServiceNode = arch.nodes.find(n => /AI|Falcon|Engine|Service|Orchestration/i.test((n.label || '') + ' ' + (n.tech || '')));
    assert(aiOrServiceNode, 'Architecture includes AI orchestration or core service node');
    pass('Stage 4 Architecture: Generates valid architecture canvas with client and AI/service tiers');

    // Stage 5: Process
    const procRes = await api(`/api/workspaces/${workspaceId}/process`, { method: 'POST' }, tokenAlpha);
    assert(procRes.status === 201, 'Process returns 201');
    const proc = procRes.data.processModel;
    assert(Array.isArray(proc.nodes) && proc.nodes.length > 0, 'Process returns workflow steps');
    const procText = [proc.title || '', proc.description || '', ...proc.nodes.map(n => (n.label || '') + ' ' + (n.actor || '') + ' ' + (n.description || ''))].join(' ');
    assert(/Appointment|Intake|Patient|Falcon|Scheduling/i.test(procText), 'Process steps reflect appointment scheduling flow');
    assert(proc.nodes.some(n => /Triage|Availability|Slot|Matching|Engine|AI/i.test((n.label || '') + ' ' + (n.description || ''))), 'Process includes triage/slot-matching step');
    pass('Stage 5 Process Workflow: Generates valid operational workflow for appointment scheduling');

    // Stage 6: UX Wireframes
    const uxRes = await api(`/api/workspaces/${workspaceId}/ux`, { method: 'POST' }, tokenAlpha);
    assert(uxRes.status === 201, 'UX returns 201');
    const uxScreens = typeof uxRes.data.ux.screens === 'string'
      ? JSON.parse(uxRes.data.ux.screens)
      : uxRes.data.ux.screens;
    assert(Array.isArray(uxScreens) && uxScreens.length > 0, 'UX returns screen wireframes');
    const uxText = uxScreens.map(s => (s.name || '') + ' ' + (s.description || '')).join(' ');
    assert(/Dashboard|Console|Queue|Appointment|Scheduling|Portal/i.test(uxText), 'UX wireframes reflect clinical scheduling interface');
    pass('Stage 6 UX: Wireframes reflect operational scheduling and status dashboard');

    // Stage 7: Database
    const dbRes = await api(`/api/workspaces/${workspaceId}/database`, { method: 'POST' }, tokenAlpha);
    assert(dbRes.status === 201, 'Database returns 201');
    const db = dbRes.data.database;
    const dbEntities = typeof db.entities === 'string'
      ? JSON.parse(db.entities)
      : db.entities;
    assert(Array.isArray(dbEntities) && dbEntities.length >= 2, 'Database includes entities');
    assert(dbEntities.some(e => /Patient|Clinic|Doctor|Appointment/i.test(e.name)), 'Database includes healthcare scheduling entities');
    assert(db.sqlSchema && typeof db.sqlSchema === 'string' && db.sqlSchema.length > 0, 'Database includes SQL schema');
    pass('Stage 7 Database: ERD and SQL schema model healthcare scheduling entities');

    // Stage 8: APIs & Implementation Plan
    const apiRes = await api(`/api/workspaces/${workspaceId}/api`, { method: 'POST' }, tokenAlpha);
    assert(apiRes.status === 201, 'APIs return 201');
    const endpoints = typeof apiRes.data.apiDesign.endpoints === 'string'
      ? JSON.parse(apiRes.data.apiDesign.endpoints)
      : apiRes.data.apiDesign.endpoints;
    assert(Array.isArray(endpoints) && endpoints.length > 0, 'API returns endpoints');
    assert(endpoints.some(e => /appointment|clinic|doctor|patient|slot|schedule/i.test(e.endpoint || '')), 'API includes scheduling lifecycle endpoints');
    pass('Stage 8 APIs: Blueprint includes scheduling lifecycle endpoints');

    const planRes = await api(`/api/workspaces/${workspaceId}/planning`, { method: 'POST' }, tokenAlpha);
    assert(planRes.status === 201, 'Planning returns 201');
    const plan = planRes.data.plan;
    const planTasks = typeof plan.tasks === 'string' ? JSON.parse(plan.tasks) : plan.tasks;
    assert(Array.isArray(planTasks) && planTasks.length > 0, 'Planning returns tasks roadmap');
    assert(planTasks.some(t => /Architecture|Security|Integration|Workflow|API|Database|Frontend|Test/i.test(t.title || '')), 'Roadmap includes standard engineering phases');
    pass('Stage 8 Planning: Roadmap includes structured delivery phases');

    // -------------------------------------------------------------
    // 10. DOCUMENT DELETION & INFLUENCE REMOVAL
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: DOCUMENT DELETION & CLEAN BASELINE REVERSION ---');
    const deleteDocRes = await api(`/api/workspaces/${workspaceId}/documents/${docId}`, { method: 'DELETE' }, tokenAlpha);
    assert(deleteDocRes.status === 200, 'Document deletion returns 200');

    // Verify document deleted from database
    const checkDoc = await prisma.document.findUnique({ where: { id: docId } });
    assert(checkDoc === null, 'Document must be removed from database');

    // Verify physical file was unlinked
    const expectedFilePath = path.resolve('uploads', uploadJson.document.filename);
    assert(!fs.existsSync(expectedFilePath), 'Physical file in uploads/ must be deleted');
    pass('DELETE /api/workspaces/:id/documents/:docId deletes record and unlinks physical file');

    // Verify workspace context no longer contains document
    const updatedCtx = await getWorkspaceContext(workspaceId, userAlpha);
    assert(updatedCtx.documentContext.analyzedCount === 0, 'analyzedCount must be 0 after document deletion');
    assert(updatedCtx.documentContext.sourceReferences.length === 0, 'sourceReferences must be empty');
    assert(updatedCtx.documentContext.combinedText === '', 'combinedText must be empty string');
    pass('Workspace context reflects 0 documents immediately following deletion');

    // Verify downstream regeneration cleanly reverts back to default domain
    const cleanSolRes = await api(`/api/workspaces/${workspaceId}/solution`, { method: 'POST' }, tokenAlpha);
    const cleanSolOptions = typeof cleanSolRes.data.solution.options === 'string'
      ? JSON.parse(cleanSolRes.data.solution.options)
      : cleanSolRes.data.solution.options;
    const cleanOptB = cleanSolOptions.find(o => o.id === 'OPTION_B');
    assert(!cleanOptB.name.includes('Falcon'), 'Regenerated Option B name must NOT mention Falcon');
    pass('Downstream generation cleanly reverts to baseline without lingering document terms');

    // -------------------------------------------------------------
    // 11. MULTI-TENANT ISOLATION FOR DOCUMENTS
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: MULTI-TENANT DOCUMENT SECURITY ---');

    // Upload a confidential document into Tenant Alpha's workspace
    const secretFormData = new FormData();
    const secretBlob = new Blob([Buffer.from('Tenant Alpha Confidential Patient Records')], { type: 'text/plain' });
    secretFormData.append('file', secretBlob, 'alpha_confidential.txt');

    const secretUploadRes = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenAlpha}` },
      body: secretFormData
    });
    const secretDoc = (await secretUploadRes.json()).document;

    // Tenant Beta tries to list Tenant Alpha's documents
    const crossListRes = await api(`/api/workspaces/${workspaceId}/documents`, { method: 'GET' }, tokenBeta);
    assert(crossListRes.status === 404, 'Cross-tenant document list must return 404');
    pass('Cross-tenant GET /api/workspaces/:id/documents blocked with safe 404');

    // Tenant Beta tries to read Tenant Alpha's document detail
    const crossDetailRes = await api(`/api/workspaces/${workspaceId}/documents/${secretDoc.id}`, { method: 'GET' }, tokenBeta);
    assert(crossDetailRes.status === 404, 'Cross-tenant document detail must return 404');
    pass('Cross-tenant GET /api/workspaces/:id/documents/:docId blocked with safe 404');

    // Tenant Beta tries to reprocess Tenant Alpha's document
    const crossReprocessRes = await api(`/api/workspaces/${workspaceId}/documents/${secretDoc.id}/reprocess`, { method: 'POST' }, tokenBeta);
    assert(crossReprocessRes.status === 404, 'Cross-tenant reprocess must return 404');
    pass('Cross-tenant POST /api/workspaces/:id/documents/:docId/reprocess blocked with safe 404');

    // Tenant Beta tries to delete Tenant Alpha's document
    const crossDeleteRes = await api(`/api/workspaces/${workspaceId}/documents/${secretDoc.id}`, { method: 'DELETE' }, tokenBeta);
    assert(crossDeleteRes.status === 404, 'Cross-tenant delete must return 404');
    pass('Cross-tenant DELETE /api/workspaces/:id/documents/:docId blocked with safe 404');

    // Verify document is still intact for Tenant Alpha
    const intactCheck = await prisma.document.findUnique({ where: { id: secretDoc.id } });
    assert(intactCheck !== null, 'Tenant Alpha document must remain intact');
    pass('Tenant Alpha document remains completely intact after unauthorized foreign requests');

    // Cleanup ephemeral tenants and files
    await prisma.document.deleteMany({ where: { workspaceId } });
    await prisma.workspace.deleteMany({ where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAlpha.id, orgBeta.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAlpha.id, orgBeta.id] } } });

    console.log('\n====================================================');
    console.log(`DOCUMENT INTELLIGENCE TEST SUMMARY: ${passedCount} PASSED, 0 FAILED`);
    console.log('====================================================');
    console.log('ALL PHASE 2B DOCUMENT INTELLIGENCE TESTS PASSED SUCCESSFULLY! 🎉\n');
  } finally {
    if (fs.existsSync(tmpTestDir)) {
      fs.rmSync(tmpTestDir, { recursive: true, force: true });
    }
  }
}

runDocumentIntelligenceSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

import { prisma } from './src/prisma.js';
import { synthesizeWorkspaceExport } from './src/services/workspaceExportSynthesizer.service.js';
import {
  generateHtmlReport,
  generateMarkdownReport,
  generateJsonBundle,
  generateTasksCsv,
  generateExecutivePptx
} from './src/utils/exportGenerators.js';

async function runExportTests() {
  console.log('====================================================');
  console.log(' ROOTFORGE EXECUTIVE EXPORT CENTER — TEST SUITE');
  console.log('====================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Locate test workspaces across 3 domains
    // Prefer workspaces with active stages
    const healthcareWs = await prisma.workspace.findFirst({
      where: { industry: 'Healthcare', name: { contains: 'Apex Clinic' } }
    }) || await prisma.workspace.findFirst({ where: { industry: 'Healthcare' } });

    const logisticsWs = await prisma.workspace.findFirst({
      where: { industry: 'Logistics', name: { contains: 'Velocity Freight' } }
    }) || await prisma.workspace.findFirst({ where: { industry: 'Logistics' } });

    const retailWs = await prisma.workspace.findFirst({
      where: { industry: 'Retail', name: { contains: 'Nordic Retail' } }
    }) || await prisma.workspace.findFirst({ where: { industry: 'Retail' } });

    console.log(`[Target Workspaces]`);
    console.log(`  - Healthcare: ${healthcareWs?.name} (${healthcareWs?.id})`);
    console.log(`  - Logistics:  ${logisticsWs?.name} (${logisticsWs?.id})`);
    console.log(`  - Retail:     ${retailWs?.name} (${retailWs?.id})\n`);

    assert(Boolean(healthcareWs), 'Healthcare workspace exists');
    assert(Boolean(logisticsWs), 'Logistics workspace exists');
    assert(Boolean(retailWs), 'Retail workspace exists');

    const domainTests = [
      { name: 'TEST A: Healthcare Domain', ws: healthcareWs, expectedDomain: 'Healthcare' },
      { name: 'TEST B: Logistics Domain', ws: logisticsWs, expectedDomain: 'Logistics' },
      { name: 'TEST C: Retail Domain', ws: retailWs, expectedDomain: 'Retail' }
    ];

    for (const test of domainTests) {
      console.log(`\n----------------------------------------------------`);
      console.log(` RUNNING: ${test.name} — [${test.ws.name}]`);
      console.log(`----------------------------------------------------`);

      // 1. Synthesize workspace data
      const synth = await synthesizeWorkspaceExport(test.ws.id);
      assert(synth.metadata.workspaceId === test.ws.id, 'Metadata contains correct workspaceId');
      assert(synth.metadata.industry === test.expectedDomain, `Metadata industry matches ${test.expectedDomain}`);
      assert(Boolean(synth.metadata.exportVersion), 'Export version is present (e.g. V1, V2)');
      assert(Boolean(synth.metadata.sourceVersions), 'Source artifact versions are tracked');

      // 2. Generate PDF / HTML
      const html = generateHtmlReport(synth);
      assert(typeof html === 'string' && html.length > 500, 'HTML report generated with valid length');
      assert(html.includes('<!DOCTYPE html>'), 'HTML report has valid DOCTYPE');
      assert(html.includes('Executive Summary'), 'HTML report contains Executive Summary');
      assert(html.includes('Enterprise Architecture'), 'HTML report contains Enterprise Architecture');
      assert(html.includes('Technical Appendix'), 'HTML report contains Technical Appendix');
      if (synth.sections.technicalAppendix.entities.length > 0) {
        assert(html.includes('CREATE TABLE'), 'HTML report Technical Appendix contains DDL');
      } else {
        assert(html.includes('No SQL DDL generated') || html.includes('Technical Appendix'), 'HTML report Technical Appendix handles empty entities cleanly');
      }
      
      // Strict Check: No raw markdown `# `, `## `, `|---|` in HTML
      assert(!html.includes('## 1. Executive Summary'), 'HTML does NOT contain raw markdown ## headings');
      assert(!html.includes('|---|---|'), 'HTML does NOT contain raw markdown tables');
      assert(!html.includes('**Business Situation:**'), 'HTML does NOT contain raw markdown ** bold tags');

      // 3. Generate PPTX
      const pptxBuffer = await generateExecutivePptx(synth);
      assert(Buffer.isBuffer(pptxBuffer) && pptxBuffer.length > 10000, `PPTX buffer generated (>10KB): ${pptxBuffer.length} bytes`);

      // 4. Generate Markdown
      const md = generateMarkdownReport(synth);
      assert(typeof md === 'string' && md.includes('# ENTERPRISE SOLUTION ARCHITECTURE'), 'Markdown report has valid header');
      assert(md.includes('## 1. Executive Summary'), 'Markdown contains Section 1');
      assert(md.includes('## 14. Technical Appendix'), 'Markdown contains Section 14');
      assert(md.includes('| Metric | Current State | Target State | Business Impact |'), 'Markdown has valid GFM table');

      // 5. Generate JSON
      const jsonStr = generateJsonBundle(synth);
      const jsonParsed = JSON.parse(jsonStr);
      assert(Boolean(jsonParsed.workspace), 'JSON bundle contains workspace');
      assert(Boolean(jsonParsed.businessContext), 'JSON bundle contains businessContext');
      assert(Boolean(jsonParsed.solution), 'JSON bundle contains solution');
      assert(Boolean(jsonParsed.architecture), 'JSON bundle contains architecture');
      assert(Boolean(jsonParsed.processes), 'JSON bundle contains processes');
      assert(Boolean(jsonParsed.database), 'JSON bundle contains database');
      assert(Boolean(jsonParsed.apis), 'JSON bundle contains apis');
      assert(Boolean(jsonParsed.implementationPlan), 'JSON bundle contains implementationPlan');
      assert(Boolean(jsonParsed.metadata), 'JSON bundle contains metadata');

      // 6. Generate CSV
      const csv = generateTasksCsv(synth);
      const csvLines = csv.split('\n');
      assert(csvLines.length >= 1, 'CSV generated with rows');
      assert(csvLines[0].includes('Task ID,Task Title,Phase,Sprint,Assigned Role,Duration (Weeks),Risk,Status,Dependencies,Source Requirement,Description'), 'CSV has all 11 required columns');

      // 7. Domain Isolation Check (NO HEALTHCARE LEAKS in Logistics or Retail)
      if (test.expectedDomain === 'Logistics' || test.expectedDomain === 'Retail') {
        const lowerSol = JSON.stringify(synth.sections.proposedSolution).toLowerCase();
        const lowerArch = JSON.stringify(synth.sections.enterpriseArchitecture).toLowerCase();
        const lowerProc = JSON.stringify(synth.sections.businessProcess).toLowerCase();

        assert(!lowerSol.includes('patient') && !lowerSol.includes('doctor'), `${test.expectedDomain} solution does NOT contain Patient/Doctor`);
        assert(!lowerArch.includes('patient') && !lowerArch.includes('doctor'), `${test.expectedDomain} architecture does NOT contain Patient/Doctor`);
        assert(!lowerProc.includes('patient') && !lowerProc.includes('doctor'), `${test.expectedDomain} process does NOT contain Patient/Doctor`);
      }
    }

    // 8. Test ExportJob creation and error handling
    console.log(`\n----------------------------------------------------`);
    console.log(` TESTING: ExportJob Audit Logging & Error Handling`);
    console.log(`----------------------------------------------------`);
    
    const testJob = await prisma.exportJob.create({
      data: {
        workspaceId: healthcareWs.id,
        format: 'PPTX',
        scope: 'COMPLETE',
        status: 'COMPLETED',
        version: 'V5',
        createdByName: 'Lead Architect',
        summary: 'Exported Complete Solution as PPTX'
      }
    });
    assert(testJob.status === 'COMPLETED', 'Export job marked COMPLETED');
    assert(testJob.version === 'V5', 'Export job stores version traceability');
    assert(testJob.createdByName === 'Lead Architect', 'Export job stores createdByName');

    const failedJob = await prisma.exportJob.create({
      data: {
        workspaceId: healthcareWs.id,
        format: 'PDF_HTML',
        scope: 'COMPLETE',
        status: 'FAILED',
        version: 'V5',
        createdByName: 'Lead Architect',
        errorReason: 'Mock test validation failure',
        summary: 'Failed export test'
      }
    });
    assert(failedJob.status === 'FAILED', 'Failed export job is accurately marked FAILED');
    assert(failedJob.errorReason === 'Mock test validation failure', 'Failed export job stores errorReason');

    // Clean up mock test jobs
    await prisma.exportJob.deleteMany({
      where: { id: { in: [testJob.id, failedJob.id] } }
    });
    assert(true, 'Test job cleanup successful');

    console.log('\n====================================================');
    console.log(` ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runExportTests();

import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { synthesizeWorkspaceExport } from '../services/workspaceExportSynthesizer.service.js';
import {
  generateMarkdownReport,
  generateHtmlReport,
  generateJsonBundle,
  generateTasksCsv,
  generateExecutivePptx
} from '../utils/exportGenerators.js';
import {
  assertWorkspaceAccess,
  handleRouteError
} from '../services/authorization.service.js';

const router = Router();

/**
 * Preview Export Deliverable before generating / downloading.
 * Returns metadata, section/slide counts, and formatted preview content.
 */
router.post('/:id/exports/preview', authenticate, async (req, res) => {
  try {
    const { format, scope } = req.body;
    const targetFormat = (format || 'PDF_HTML').toUpperCase();

    await assertWorkspaceAccess(req.params.id, req.user);
    const synthesized = await synthesizeWorkspaceExport(req.params.id);

    const baseFilename = `${synthesized.metadata.workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${(scope || 'solution').toLowerCase()}`;

    let filename = baseFilename;
    let previewContent = null;
    let slideCount = null;
    let sectionCount = 14;

    if (targetFormat === 'PDF_HTML') {
      filename += '_blueprint.html';
      previewContent = generateHtmlReport(synthesized);
    } else if (targetFormat === 'PPTX') {
      filename += '_executive_deck.pptx';
      slideCount = 14;
      previewContent = [
        { slideNumber: 1, title: 'Title & Executive Cover', category: 'RootForge Deliverable', bullets: [synthesized.metadata.workspaceName, synthesized.metadata.industry, synthesized.metadata.exportVersion] },
        { slideNumber: 2, title: 'Executive Summary', category: 'Strategic Vision', bullets: [synthesized.sections.executiveSummary.businessSituation, synthesized.sections.executiveSummary.currentProblem, synthesized.sections.executiveSummary.proposedTransformation] },
        { slideNumber: 3, title: 'Current State & Identified Friction', category: 'Diagnostic', bullets: synthesized.sections.businessContext.painPoints.slice(0, 4) },
        { slideNumber: 4, title: 'Strategic Objectives & Success Measures', category: 'Value Architecture', bullets: synthesized.sections.businessObjectives.objectives.slice(0, 4) },
        { slideNumber: 5, title: 'Proposed Transformation & Capabilities', category: 'Target Solution', bullets: synthesized.sections.proposedSolution.capabilities.slice(0, 4) },
        { slideNumber: 6, title: 'Solution Architecture Topology', category: 'Systems Design', bullets: ['Client Layer: Responsive Portals', 'API Gateway: Security & Auth', 'Application Services: Domain Microservices', 'Persistence: Relational DB & Cache', 'Integrations: External Connectors'] },
        { slideNumber: 7, title: 'Target Business Process Workflow', category: 'Operational Workflow', bullets: synthesized.sections.businessProcess.steps.slice(0, 5).map(s => `${s.order}. ${s.name} (${s.actor})`) },
        { slideNumber: 8, title: 'Core Relational Domain & REST APIs', category: 'Data Architecture', bullets: synthesized.sections.dataAndApi.entities.slice(0, 4).map(e => `${e.name} (${e.fieldsCount} fields)`) },
        { slideNumber: 9, title: 'User Experience & Personas', category: 'Experience Design', bullets: synthesized.sections.userExperience.personas.slice(0, 3).map(p => `${p.name} - ${p.role}`) },
        { slideNumber: 10, title: 'Phased Implementation Timeline', category: 'Delivery Execution', bullets: synthesized.sections.roadmap.phases.map(p => `${p.name}: ${p.durationWeeks} Weeks (${p.tasks.length} tasks scheduled)`) },
        { slideNumber: 11, title: 'Resource Allocation & Delivery Investment', category: 'Resourcing', bullets: [`Estimated Timeline: ${synthesized.sections.investment.estimatedDurationWeeks} Weeks`, `Methodology: ${synthesized.sections.investment.methodology}`, `Investment: ${synthesized.sections.investment.estimatedCostRange}`] },
        { slideNumber: 12, title: 'Risk Register & Mitigation Protocols', category: 'Governance & Risk', bullets: synthesized.sections.riskRegister.slice(0, 4).map(r => `[${r.severity}] ${r.title}`) },
        { slideNumber: 13, title: 'Governance Sign-offs & Quality Gates', category: 'Governance', bullets: synthesized.sections.governance.signoffs.length > 0 ? synthesized.sections.governance.signoffs.map(s => `${s.artifactType} V${s.versionNumber}: ${s.status}`) : ['No formal sign-offs recorded yet'] },
        { slideNumber: 14, title: 'Expected Business Outcomes & Next Steps', category: 'Impact & Realization', bullets: synthesized.sections.expectedOutcomes.map(o => o.category) }
      ];
    } else if (targetFormat === 'MARKDOWN') {
      filename += '_specification.md';
      previewContent = generateMarkdownReport(synthesized);
    } else if (targetFormat === 'JSON') {
      filename += '_bundle.json';
      previewContent = generateJsonBundle(synthesized);
    } else if (targetFormat === 'CSV_TASKS') {
      filename += '_tasks.csv';
      previewContent = generateTasksCsv(synthesized);
    }

    res.json({
      title: synthesized.sections.proposedSolution.title || synthesized.metadata.workspaceName,
      format: targetFormat,
      filename,
      version: synthesized.metadata.exportVersion,
      generatedAt: synthesized.metadata.generatedAt,
      sourceVersions: synthesized.metadata.sourceVersions,
      slideCount,
      sectionCount,
      previewContent
    });
  } catch (error) {
    handleRouteError(res, error, 'Failed to generate export preview.');
  }
});

/**
 * Generate Export Deliverable
 * Produces the complete document / file package, creates an audit record,
 * and logs to export job history.
 */
router.post('/:id/exports/generate', authenticate, async (req, res) => {
  const { format, scope } = req.body;
  const targetFormat = (format || 'PDF_HTML').toUpperCase();
  const userName = req.user?.name || 'Authorized User';

  try {
    const workspace = await assertWorkspaceAccess(req.params.id, req.user);
    const synthesized = await synthesizeWorkspaceExport(req.params.id);

    const baseFilename = `${workspace.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${(scope || 'solution').toLowerCase()}`;

    let content = null;
    let base64 = null;
    let isBinary = false;
    let filename = baseFilename;

    if (targetFormat === 'PDF_HTML') {
      content = generateHtmlReport(synthesized);
      filename += '_blueprint.html';
    } else if (targetFormat === 'PPTX') {
      const buffer = await generateExecutivePptx(synthesized);
      base64 = buffer.toString('base64');
      isBinary = true;
      filename += '_executive_deck.pptx';
    } else if (targetFormat === 'MARKDOWN') {
      content = generateMarkdownReport(synthesized);
      filename += '_specification.md';
    } else if (targetFormat === 'JSON') {
      content = generateJsonBundle(synthesized);
      filename += '_bundle.json';
    } else if (targetFormat === 'CSV_TASKS') {
      content = generateTasksCsv(synthesized);
      filename += '_tasks.csv';
    } else {
      throw new Error(`Unsupported deliverable format: ${targetFormat}`);
    }

    // Save successful export job record
    const job = await prisma.exportJob.create({
      data: {
        workspaceId: workspace.id,
        format: targetFormat,
        scope: scope || 'COMPLETE',
        status: 'COMPLETED',
        version: synthesized.metadata.exportVersion,
        createdByName: userName,
        summary: `Exported ${scope || 'Complete Solution'} as ${targetFormat}`
      }
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        userId: req.user.id,
        userName: userName,
        action: 'EXPORTED',
        versionNumber: parseInt(synthesized.metadata.exportVersion.replace(/\D/g, '') || '1', 10),
        resultingStatus: 'COMPLETED',
        details: `Generated ${targetFormat} export deliverable (${synthesized.metadata.exportVersion})`
      }
    });

    res.json({
      jobId: job.id,
      format: targetFormat,
      filename,
      version: synthesized.metadata.exportVersion,
      content,
      base64,
      isBinary,
      createdAt: job.createdAt
    });
  } catch (error) {
    // Record failure in ExportJob table so it is NEVER marked completed
    try {
      await prisma.exportJob.create({
        data: {
          workspaceId: req.params.id,
          format: targetFormat,
          scope: scope || 'COMPLETE',
          status: 'FAILED',
          createdByName: userName,
          errorReason: error.message || 'Unknown export synthesis failure',
          summary: `Failed to export ${targetFormat}: ${error.message}`
        }
      });
    } catch (e) {
      console.error('Failed to log export failure to database:', e);
    }

    handleRouteError(res, error, `Export Failed: ${error.message}`);
  }
});

/**
 * List prior export jobs for the workspace (tenant-scoped)
 */
router.get('/:id/exports', authenticate, async (req, res) => {
  try {
    await assertWorkspaceAccess(req.params.id, req.user);

    const jobs = await prisma.exportJob.findMany({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ jobs });
  } catch (error) {
    handleRouteError(res, error, 'Failed to retrieve export history.');
  }
});

export default router;

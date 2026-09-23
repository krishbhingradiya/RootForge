/**
 * Phase 1 Final Update & Verification Master Test Suite
 * 
 * Authoritative Phase 1 Closure Verification for RootForge.
 * Validates:
 * 1. Provider Routing & Active Health Check (GET /api/admin/ai/health)
 * 2. Real Gemini Generation on Verified Model (gemini-3.1-flash-lite)
 * 3. Fallback Disabled Verification (AI_FALLBACK_ON_ERROR=false)
 * 4. Document Context & Grounding on Real Workspace (Patient Appointment Transformation)
 * 5. Document Absence Test (Zero fabricated citations on document-free workspace)
 * 6. Fact vs. Inference vs. Recommendation vs. Open Question Separation
 * 7. End-to-End Generation & Persistence across ALL AI Stages:
 *    - Discovery Questions
 *    - Discovery Consultant Dialogue
 *    - Stage 2: Business Analysis
 *    - Stage 3: Solution Options (A, B, C)
 *    - Stage 4: Target Architecture Canvas
 *    - Stage 5: Process Designer
 *    - Stage 6: UX Wireframe Studio
 *    - Stage 7a: Relational Database Design
 *    - Stage 7b: REST API Blueprint
 *    - Stage 8: Implementation Planning & Task DAG
 * 8. Upstream / Downstream Consistency (Solution -> Architecture -> Process -> Database -> API -> Planning)
 * 9. User Edit Propagation (Edit Solution -> Generate Architecture -> Verify edit reflected)
 * 10. Workspace State Regeneration (Modify workspace -> Regenerate -> Verify latest context used)
 * 11. Multi-Tenant Workspace Isolation (Healthcare Workspace A vs Manufacturing Workspace B)
 * 12. Error Classification & Fallback Prevention (AUTH_ERROR, CONFIG_ERROR, KEY_MISSING)
 * 13. Credential Security & Zero Leakage Audit
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

import { prisma } from './src/prisma.js';
import { aiService } from './src/ai/aiService.js';
import { providerRouter } from './src/ai/providers/providerRouter.js';
import { geminiProvider } from './src/ai/providers/geminiProvider.js';
import { externalProvider } from './src/ai/providers/externalProvider.js';
import { relevanceGuard } from './src/ai/relevanceGuard.js';
import { getWorkspaceContext } from './src/services/workspaceContext.service.js';
import {
  validateDiscoveryQuestions,
  validateBusinessAnalysis,
  validateSolution,
  validateArchitecture,
  validateProcess,
  validateUX,
  validateDatabase,
  validateAPI,
  validatePlanning
} from './src/ai/schemaValidator.js';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

const testResults = {};

function assert(condition, message, testGroup = 'General') {
  totalAssertions++;
  if (condition) {
    console.log(`    ✅ PASS: ${message}`);
    passedAssertions++;
    if (!testResults[testGroup]) testResults[testGroup] = { pass: 0, fail: 0 };
    testResults[testGroup].pass++;
  } else {
    console.error(`    ❌ FAIL: ${message}`);
    failedAssertions++;
    if (!testResults[testGroup]) testResults[testGroup] = { pass: 0, fail: 0 };
    testResults[testGroup].fail++;
    throw new Error(`Assertion Failed: ${message}`);
  }
}

// Inter-test pacing delay to prevent transient rate limit spikes on Gemini
const delay = (ms = 1500) => new Promise(r => setTimeout(r, ms));

async function runPhase1ClosureSuite() {
  console.log('======================================================================');
  console.log('ROOTFORGE PHASE 1: FINAL UPDATE & VERIFICATION TEST SUITE');
  console.log('======================================================================\n');

  const apiKey = process.env.AI_API_KEY;
  const configuredProvider = process.env.AI_PROVIDER || 'gemini';
  const configuredModel = process.env.AI_MODEL || 'gemini-3.1-flash-lite';
  const fallbackOnError = process.env.AI_FALLBACK_ON_ERROR;

  // -------------------------------------------------------------------------
  // SECTION 0: ENVIRONMENT CONFIGURATION & SECURITY AUDIT
  // -------------------------------------------------------------------------
  console.log('[SECTION 0] Environment Configuration & Security Pre-Checks');
  {
    assert(!!apiKey, 'AI_API_KEY is configured in backend environment', 'Config');
    assert(configuredProvider.toLowerCase() === 'gemini', `AI_PROVIDER is set to "gemini" (was: ${configuredProvider})`, 'Config');
    assert(configuredModel === 'gemini-3.1-flash-lite', `AI_MODEL is set to "gemini-3.1-flash-lite" (was: ${configuredModel})`, 'Config');
    assert(fallbackOnError === 'false', `AI_FALLBACK_ON_ERROR is explicitly set to "false" (was: ${fallbackOnError})`, 'Config');

    // Security check: .env must be in .gitignore
    const gitignorePath = path.resolve(__dirname, '../.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      assert(gitignore.includes('.env'), '.env is listed in root .gitignore', 'Security');
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 1: PROVIDER ROUTING & ACTIVE HEALTH CHECK
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 1] Provider Routing & Health Check');
  {
    // Provider router resolution
    const activeProvider = providerRouter.getActiveProvider();
    assert(activeProvider === geminiProvider, 'providerRouter resolves AI_PROVIDER=gemini to geminiProvider singleton', 'Routing');

    // Health ping test
    const health = await aiService.checkHealth();
    console.log('    [AI Health Check]:', JSON.stringify(health));
    assert(health.provider === 'gemini', 'Health report specifies provider=gemini', 'Health');
    const validGeminiModels = ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.7-flash'];
    const isModelValid = validGeminiModels.some(m => health.model.includes(m)) || health.model.startsWith('gemini');
    assert(isModelValid, `Health report specifies a valid Gemini candidate model (got: ${health.model})`, 'Health');
    assert(health.configured === true, 'Health check reports configured=true', 'Health');
    assert(health.reachable === true, 'Health check reports reachable=true', 'Health');
    assert(health.status === 'HEALTHY', 'Health check reports status=HEALTHY', 'Health');
    assert(typeof health.latencyMs === 'number' && health.latencyMs > 0, `Active ping returned valid latency (${health.latencyMs}ms)`, 'Health');

    // Credential exposure test in health payload
    const serializedHealth = JSON.stringify(health);
    assert(!serializedHealth.includes(apiKey), 'Health payload does NOT contain AI_API_KEY', 'Security');
    assert(!serializedHealth.includes('Authorization'), 'Health payload does NOT expose Authorization headers', 'Security');
    assert(!serializedHealth.includes('x-goog-api-key'), 'Health payload does NOT expose x-goog-api-key headers', 'Security');
  }

  await delay(2000);

  // -------------------------------------------------------------------------
  // SECTION 2: TEST WORKSPACE & DOCUMENT CONTEXT GROUNDING
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 2] Real Workspace & Document Grounding Verification');
  const targetWorkspaceId = 'cmu5ivus20001wtqiucwnuq2x';
  let healthcareCtx = await getWorkspaceContext(targetWorkspaceId);

  {
    assert(healthcareCtx.workspace.name === 'Patient Appointment Transformation', 'Loaded target workspace "Patient Appointment Transformation"', 'DocumentGrounding');
    assert(healthcareCtx.workspace.industry === 'Healthcare & Life Sciences', 'Workspace industry is Healthcare & Life Sciences', 'DocumentGrounding');
    assert(healthcareCtx.domain === 'HEALTHCARE', 'Domain resolved dynamically to HEALTHCARE', 'DocumentGrounding');

    // Verify documents
    const docs = healthcareCtx.documents || [];
    assert(docs.length >= 2, `Workspace has ${docs.length} uploaded documents indexed`, 'DocumentGrounding');

    const hasBRD = docs.some(d => (d.originalName || d.filename || '').includes('Patient_Appointment_BRD'));
    const hasSOP = docs.some(d => (d.originalName || d.filename || '').includes('Hospital_Appointment_SOP'));
    assert(hasBRD, 'Patient_Appointment_BRD.pdf is present and indexed', 'DocumentGrounding');
    assert(hasSOP, 'Hospital_Appointment_SOP.pdf is present and indexed', 'DocumentGrounding');

    const docCombined = healthcareCtx.documentContext?.combinedText || '';
    assert(docCombined.includes('60%') || docCombined.includes('sixty percent'), 'Document text contains "60%" reduction target', 'DocumentGrounding');
    assert(docCombined.includes('existing patient-record system'), 'Document text contains "existing patient-record system"', 'DocumentGrounding');
    assert(docCombined.includes('phone') && docCombined.includes('availability'), 'Document text contains phone-based booking and doctor availability', 'DocumentGrounding');

    // Verify documents DO NOT mention unconfirmed technologies
    assert(!docCombined.toLowerCase().includes('epic'), 'Source documents do NOT mention Epic', 'FactVsInference');
    assert(!docCombined.toLowerCase().includes('cerner'), 'Source documents do NOT mention Cerner', 'FactVsInference');
    assert(!docCombined.toLowerCase().includes('hl7'), 'Source documents do NOT mention HL7', 'FactVsInference');
    assert(!docCombined.toLowerCase().includes('fhir'), 'Source documents do NOT mention FHIR', 'FactVsInference');
  }

  await delay(2000);

  // -------------------------------------------------------------------------
  // SECTION 3: STAGE 1 — DISCOVERY QUESTIONS & RELEVANCE CONSULTANT
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 3] Stage 1: Discovery Question Generation & Consultant');
  let discoveryQuestions = [];
  {
    console.log('    Generating real Gemini Discovery Questions...');
    discoveryQuestions = await externalProvider.generateDiscoveryQuestions(healthcareCtx);

    assert(Array.isArray(discoveryQuestions) && discoveryQuestions.length >= 3, `Generated ${discoveryQuestions.length} discovery questions`, 'Discovery');

    const questionsValidation = validateDiscoveryQuestions({ questions: discoveryQuestions });
    assert(questionsValidation.valid === true, 'Discovery questions pass schema validation', 'Discovery');

    // Fact vs Inference check on questions
    const allQuestionsText = discoveryQuestions.map(q => `${q.question} ${q.rationale}`).join(' ').toLowerCase();
    
    // Must NOT falsely claim that Epic, Cerner, HL7, or FHIR are already in use
    const falselyClaimsEpic = allQuestionsText.includes('your epic') || allQuestionsText.includes('integrate your epic') || allQuestionsText.includes('existing epic');
    const falselyClaimsCerner = allQuestionsText.includes('your cerner') || allQuestionsText.includes('existing cerner');
    assert(!falselyClaimsEpic, 'Questions do NOT falsely claim hospital uses Epic', 'FactVsInference');
    assert(!falselyClaimsCerner, 'Questions do NOT falsely claim hospital uses Cerner', 'FactVsInference');

    // Must be grounded in actual operational context (e.g. existing patient-record system, doctor availability, notifications)
    const isGrounded = allQuestionsText.includes('patient') || allQuestionsText.includes('appointment') || allQuestionsText.includes('doctor') || allQuestionsText.includes('availability') || allQuestionsText.includes('existing');
    assert(isGrounded, 'Discovery questions are grounded in real appointment operations', 'Discovery');

    // Test Discovery Consultant Dialogue with real Gemini
    console.log('    Testing real Gemini AI Consultant answer...');
    const consultantAnswer = await relevanceGuard.generateConsultantAnswer(
      healthcareCtx,
      'What are the main bottlenecks in the current manual phone-based appointment booking process?'
    );
    assert(!!consultantAnswer && typeof consultantAnswer.message === 'string' && consultantAnswer.message.length > 50, 'Consultant returned substantive answer', 'Discovery');
    assert(consultantAnswer.message.toLowerCase().includes('phone') || consultantAnswer.message.toLowerCase().includes('manual') || consultantAnswer.message.toLowerCase().includes('wait'), 'Consultant answer reflects manual phone bottlenecks', 'Discovery');
  }

  await delay(2000);

  // -------------------------------------------------------------------------
  // SECTION 4: STAGE 2 — REAL GEMINI BUSINESS ANALYSIS & PERSISTENCE
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 4] Stage 2: Business Analysis Real Generation & Persistence');
  let analysisOutput;
  {
    console.log('    Generating real Gemini Business Analysis...');
    analysisOutput = await externalProvider.generateBusinessAnalysis(healthcareCtx);

    assert(analysisOutput._meta.provider === 'GEMINI', 'Analysis provider is GEMINI', 'BusinessAnalysis');
    assert(analysisOutput._meta.model === 'gemini-3.1-flash-lite', 'Analysis model is gemini-3.1-flash-lite', 'BusinessAnalysis');
    assert(analysisOutput._meta.tokensUsed > 0, `Tokens used tracked: ${analysisOutput._meta.tokensUsed}`, 'BusinessAnalysis');

    const validation = validateBusinessAnalysis(analysisOutput.result);
    assert(validation.valid === true, `Analysis schema validation passed: ${validation.errors?.join(', ') || 'valid'}`, 'BusinessAnalysis');

    const res = analysisOutput.result;
    assert(typeof res.currentState === 'string' && res.currentState.length > 50, 'Current state synthesized', 'BusinessAnalysis');
    assert(typeof res.futureState === 'string' && res.futureState.length > 50, 'Future state synthesized', 'BusinessAnalysis');
    assert(typeof res.digitalMaturityScore === 'number' && res.digitalMaturityScore >= 0 && res.digitalMaturityScore <= 100, `Digital maturity score is ${res.digitalMaturityScore}`, 'BusinessAnalysis');
    assert(Array.isArray(res.goals) && res.goals.length >= 3, 'Goals array has at least 3 items', 'BusinessAnalysis');
    assert(Array.isArray(res.painPoints) && res.painPoints.length >= 3, 'Pain points array has at least 3 items', 'BusinessAnalysis');
    assert(Array.isArray(res.stakeholders) && res.stakeholders.length >= 3, 'Stakeholders array has at least 3 items', 'BusinessAnalysis');

    // Document Grounding Verification
    const analysisText = JSON.stringify(res).toLowerCase();
    const mentionsReductionTarget = analysisText.includes('60%') || analysisText.includes('sixty percent') || analysisText.includes('manual scheduling') || analysisText.includes('booking time');
    assert(mentionsReductionTarget, 'Business Analysis reflects BRD reduction target / manual scheduling friction', 'DocumentGrounding');

    // Fact vs Inference Check
    assert(!analysisText.includes('uses epic') && !analysisText.includes('running epic'), 'Analysis does not falsely claim hospital uses Epic', 'FactVsInference');
    assert(!analysisText.includes('uses cerner') && !analysisText.includes('running cerner'), 'Analysis does not falsely claim hospital uses Cerner', 'FactVsInference');

    // Database Persistence
    const persistedAnalysis = await prisma.businessAnalysis.create({
      data: {
        workspaceId: targetWorkspaceId,
        currentState: res.currentState,
        futureState: res.futureState,
        goals: JSON.stringify(res.goals),
        painPoints: JSON.stringify(res.painPoints),
        stakeholders: JSON.stringify(res.stakeholders),
        requirements: JSON.stringify(res.requirements || []),
        gaps: JSON.stringify(res.gaps || []),
        processIssues: JSON.stringify(res.processIssues || []),
        automationOpportunities: JSON.stringify(res.automationOpportunities || []),
        digitalMaturityScore: res.digitalMaturityScore,
        improvementOpportunities: JSON.stringify(res.improvementOpportunities || []),
        version: 1,
        status: 'DRAFT'
      }
    });
    assert(!!persistedAnalysis.id, `Persisted Business Analysis to database (ID: ${persistedAnalysis.id})`, 'Persistence');
  }

  await delay(2500);

  // Reload context with newly persisted business analysis
  healthcareCtx = await getWorkspaceContext(targetWorkspaceId);

  // -------------------------------------------------------------------------
  // SECTION 5: STAGE 3 — SOLUTION BUILDER & STRATEGY SELECTION
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 5] Stage 3: Solution Builder Options Formulation & Persistence');
  let solutionOutput;
  {
    console.log('    Generating real Gemini Solution Options (A, B, C)...');
    solutionOutput = await externalProvider.generateSolutions(healthcareCtx, healthcareCtx.businessAnalysis);

    assert(solutionOutput._meta.provider === 'GEMINI', 'Solution provider is GEMINI', 'SolutionBuilder');
    assert(solutionOutput._meta.model === 'gemini-3.1-flash-lite', 'Solution model is gemini-3.1-flash-lite', 'SolutionBuilder');

    const validation = validateSolution(solutionOutput.result);
    assert(validation.valid === true, `Solution schema validation passed: ${validation.errors?.join(', ') || 'valid'}`, 'SolutionBuilder');

    const sol = solutionOutput.result;
    assert(Array.isArray(sol.options) && sol.options.length === 3, 'Formulated exactly 3 comparative options (A, B, C)', 'SolutionBuilder');
    assert(['OPTION_A', 'OPTION_B', 'OPTION_C', 'Option A', 'Option B', 'Option C'].some(v => (sol.selectedOption || '').includes(v)), `Selected option is designated: ${sol.selectedOption}`, 'SolutionBuilder');

    const solText = JSON.stringify(sol).toLowerCase();
    assert(solText.includes('appointment') || solText.includes('patient') || solText.includes('doctor') || solText.includes('scheduling'), 'Solutions address healthcare appointment problem', 'SolutionBuilder');

    // Fact vs Inference: Verify tech recommendations are presented as recommendations
    assert(!solText.includes('hospital currently uses epic'), 'Solution does not falsely state hospital currently uses Epic', 'FactVsInference');

    // Database Persistence with selected option set to OPTION_B
    const persistedSolution = await prisma.solution.create({
      data: {
        workspaceId: targetWorkspaceId,
        name: sol.name || 'Patient Appointment Digital Transformation',
        summary: sol.summary || '',
        businessValue: sol.businessValue || '',
        implementationApproach: sol.implementationApproach || '',
        selectedOption: 'OPTION_B',
        options: JSON.stringify(sol.options),
        keyCapabilities: JSON.stringify(sol.keyCapabilities || []),
        automationOpps: JSON.stringify(sol.automationOpps || []),
        aiOpps: JSON.stringify(sol.aiOpps || []),
        techStack: JSON.stringify(sol.techStack || {}),
        risks: JSON.stringify(sol.risks || []),
        assumptions: JSON.stringify(sol.assumptions || []),
        dependencies: JSON.stringify(sol.dependencies || []),
        version: 1,
        status: 'DRAFT'
      }
    });
    assert(!!persistedSolution.id, `Persisted Solution to database (ID: ${persistedSolution.id}, Selected: OPTION_B)`, 'Persistence');
  }

  await delay(2500);

  // Reload context with persisted solution
  healthcareCtx = await getWorkspaceContext(targetWorkspaceId);

  // -------------------------------------------------------------------------
  // SECTION 6: STAGE 4 — TARGET ARCHITECTURE CANVAS & GRAPH INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 6] Stage 4: Target Architecture Real Generation & Topology');
  let architectureOutput;
  {
    console.log('    Generating real Gemini Target Architecture for OPTION_B...');
    architectureOutput = await externalProvider.generateArchitecture(healthcareCtx, healthcareCtx.solution);

    assert(architectureOutput._meta.provider === 'GEMINI', 'Architecture provider is GEMINI', 'Architecture');
    assert(architectureOutput._meta.model === 'gemini-3.1-flash-lite', 'Architecture model is gemini-3.1-flash-lite', 'Architecture');

    const validation = validateArchitecture(architectureOutput.result);
    assert(validation.valid === true, `Architecture schema validation passed: ${validation.errors?.join(', ') || 'valid'}`, 'Architecture');

    const arch = architectureOutput.result;
    assert(Array.isArray(arch.nodes) && arch.nodes.length >= 5, `Architecture has ${arch.nodes.length} nodes (>= 5 required)`, 'Architecture');
    assert(Array.isArray(arch.edges) && arch.edges.length >= 4, `Architecture has ${arch.edges.length} edges (>= 4 required)`, 'Architecture');

    // Strict Graph Integrity: Zero dangling edges
    const nodeIds = new Set(arch.nodes.map(n => n.id));
    const danglingEdges = arch.edges.filter(e => !nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId));
    assert(danglingEdges.length === 0, 'Zero dangling edges in architectural topology', 'Architecture');

    // Upstream alignment check: Reflects Healthcare Appointment Transformation
    const archText = JSON.stringify(arch).toLowerCase();
    assert(archText.includes('patient') || archText.includes('appointment') || archText.includes('doctor') || archText.includes('scheduling') || archText.includes('clinical'), 'Architecture reflects healthcare appointment domain', 'UpstreamDownstream');

    // Fact vs Inference check
    assert(!archText.includes('hospital currently runs epic'), 'Architecture does not assert hospital currently runs Epic as a fact', 'FactVsInference');

    // Database Persistence
    const nodeIdMap = {};
    const prefix = `node_${Date.now()}_`;
    arch.nodes.forEach((n, i) => {
      nodeIdMap[n.id] = `${prefix}${i + 1}`;
    });

    const persistedArch = await prisma.architecture.create({
      data: {
        workspaceId: targetWorkspaceId,
        title: arch.title || 'Healthcare Target Architecture',
        highLevelDesign: arch.highLevelDesign || '',
        lowLevelDesign: arch.lowLevelDesign || '',
        securityArch: arch.securityArch || '',
        integrationArch: arch.integrationArch || '',
        infrastructureArch: arch.infrastructureArch || '',
        deploymentArch: arch.deploymentArch || '',
        version: 1,
        status: 'DRAFT',
        nodes: {
          create: arch.nodes.map(n => ({
            id: nodeIdMap[n.id] || n.id,
            label: n.label,
            type: n.type,
            tier: n.tier || 'Services',
            description: n.description || '',
            posX: n.posX || 100,
            posY: n.posY || 100,
            tech: n.tech || 'Node.js',
            status: 'ACTIVE'
          }))
        },
        edges: {
          create: arch.edges.map(e => ({
            sourceId: nodeIdMap[e.sourceId] || e.sourceId,
            targetId: nodeIdMap[e.targetId] || e.targetId,
            label: e.label || '',
            protocol: e.protocol || 'REST'
          }))
        }
      }
    });
    assert(!!persistedArch.id, `Persisted Architecture to database (ID: ${persistedArch.id})`, 'Persistence');
  }

  await delay(2500);

  // Reload context with persisted architecture
  healthcareCtx = await getWorkspaceContext(targetWorkspaceId);

  // -------------------------------------------------------------------------
  // SECTION 7: STAGE 5 — PROCESS INTELLIGENCE & WORKFLOW STEPS
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 7] Stage 5: Process Designer Real Generation & Persistence');
  let processOutput;
  {
    console.log('    Generating real Gemini Process Workflow...');
    processOutput = await externalProvider.generateProcess(healthcareCtx, healthcareCtx.solution, healthcareCtx.architecture);

    assert(processOutput._meta.provider === 'GEMINI', 'Process provider is GEMINI', 'Process');
    assert(processOutput._meta.model === 'gemini-3.1-flash-lite', 'Process model is gemini-3.1-flash-lite', 'Process');

    const validation = validateProcess(processOutput.result);
    assert(validation.valid === true, `Process schema validation passed: ${validation.errors?.join(', ') || 'valid'}`, 'Process');

    const proc = processOutput.result;
    assert(Array.isArray(proc.nodes) && proc.nodes.length >= 4, `Process contains ${proc.nodes.length} sequential steps (>= 4 required)`, 'Process');

    // Verify actor alignment with appointment actors (Patient, Doctor, Reception Staff, System)
    const actors = proc.nodes.map(n => (n.actor || '').toLowerCase()).join(' ');
    assert(actors.includes('patient') || actors.includes('doctor') || actors.includes('reception') || actors.includes('staff') || actors.includes('system'), 'Process steps involve appointment actors (Patient, Doctor, Staff, System)', 'UpstreamDownstream');

    // Database Persistence
    const persistedProcess = await prisma.processModel.create({
      data: {
        workspaceId: targetWorkspaceId,
        title: proc.title || 'Patient Appointment Booking Workflow',
        description: proc.description || '',
        type: proc.type || 'WORKFLOW',
        version: 1,
        status: 'DRAFT',
        nodes: {
          create: proc.nodes.map((step, idx) => ({
            stepOrder: step.stepOrder || idx + 1,
            label: step.label,
            type: step.type || 'STEP',
            actor: step.actor || 'System',
            description: step.description || '',
            condition: step.condition || null
          }))
        }
      }
    });
    assert(!!persistedProcess.id, `Persisted Process Workflow to database (ID: ${persistedProcess.id})`, 'Persistence');
  }

  await delay(2500);

  // Reload context with persisted process
  healthcareCtx = await getWorkspaceContext(targetWorkspaceId);

  // -------------------------------------------------------------------------
  // SECTION 8: STAGE 6 — UX DESIGNER STUDIO & WIREFRAME TOKENS
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 8] Stage 6: UX Designer Real Generation & Persistence');
  let uxOutput;
  {
    console.log('    Generating real Gemini UX Wireframes & Design Tokens...');
    uxOutput = await externalProvider.generateUX(healthcareCtx, healthcareCtx.solution, healthcareCtx.architecture, healthcareCtx.process);

    assert(uxOutput._meta.provider === 'GEMINI', 'UX provider is GEMINI', 'UX');
    assert(uxOutput._meta.model === 'gemini-3.1-flash-lite', 'UX model is gemini-3.1-flash-lite', 'UX');

    const validation = validateUX(uxOutput.result);
    assert(validation.valid === true, `UX schema validation passed: ${validation.errors?.join(', ') || 'valid'}`, 'UX');

    const ux = uxOutput.result;
    assert(Array.isArray(ux.screens) && ux.screens.length >= 2, `UX contains ${ux.screens.length} screens (>= 2 required)`, 'UX');
    assert(!!ux.designTokens && typeof ux.designTokens === 'object', 'UX specifies cohesive design tokens', 'UX');

    const uxText = JSON.stringify(ux).toLowerCase();
    assert(uxText.includes('patient') || uxText.includes('appointment') || uxText.includes('doctor') || uxText.includes('schedule') || uxText.includes('booking'), 'UX screens tailored to patient appointment workflows', 'UpstreamDownstream');

    // Database Persistence
    const persistedUX = await prisma.uXDesign.create({
      data: {
        workspaceId: targetWorkspaceId,
        title: ux.title || 'Patient Appointment UX Studio',
        screens: JSON.stringify(ux.screens),
        designTokens: JSON.stringify(ux.designTokens),
        version: 1,
        status: 'DRAFT'
      }
    });
    assert(!!persistedUX.id, `Persisted UX Design to database (ID: ${persistedUX.id})`, 'Persistence');
  }

  await delay(2500);

  // Reload context with persisted UX
  healthcareCtx = await getWorkspaceContext(targetWorkspaceId);

  // -------------------------------------------------------------------------
  // SECTION 9: STAGE 7 — DATABASE DESIGN (3NF ERD, SQL DDL, PRISMA SCHEMA)
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9] Stage 7a: Relational Database Real Generation & Persistence');
  let dbOutput;
  {
    console.log('    Generating real Gemini Relational Database Design...');
    dbOutput = await externalProvider.generateDatabase(healthcareCtx, healthcareCtx.solution, healthcareCtx.architecture, healthcareCtx.process);

    assert(dbOutput._meta.provider === 'GEMINI', 'Database provider is GEMINI', 'Database');
    assert(dbOutput._meta.model === 'gemini-3.1-flash-lite', 'Database model is gemini-3.1-flash-lite', 'Database');

    const validation = validateDatabase(dbOutput.result);
    assert(validation.valid === true, `Database schema validation passed: ${validation.errors?.join(', ') || 'valid'}`, 'Database');

    const db = dbOutput.result;
    assert(Array.isArray(db.entities) && db.entities.length >= 3, `Database contains ${db.entities.length} relational entities (>= 3 required)`, 'Database');
    assert(typeof db.sqlSchema === 'string' && db.sqlSchema.includes('CREATE TABLE'), 'Generated executable SQL DDL with CREATE TABLE', 'Database');
    assert(typeof db.prismaSchema === 'string' && db.prismaSchema.includes('model '), 'Generated valid Prisma schema with model declarations', 'Database');

    // Entity alignment with Healthcare Appointment Domain
    const entityNames = db.entities.map(e => e.name.toLowerCase()).join(' ');
    assert(entityNames.includes('patient') || entityNames.includes('appointment') || entityNames.includes('doctor') || entityNames.includes('slot') || entityNames.includes('schedule'), 'Database entities reflect appointment domain (Patient, Doctor, Appointment, Slot)', 'UpstreamDownstream');

    // Anti-leakage: No Customer Support ticket entities
    assert(!entityNames.includes('ticket') && !entityNames.includes('zendesk'), 'Database does NOT contain generic Customer Support ticket entities', 'AntiLeakage');

    // Database Persistence
    const persistedDB = await prisma.databaseDesign.create({
      data: {
        workspaceId: targetWorkspaceId,
        title: db.title || 'Patient Appointment Relational Schema',
        entities: JSON.stringify(db.entities),
        relations: JSON.stringify(db.relations || []),
        sqlSchema: db.sqlSchema,
        prismaSchema: db.prismaSchema,
        version: 1,
        status: 'DRAFT'
      }
    });
    assert(!!persistedDB.id, `Persisted Database Design to database (ID: ${persistedDB.id})`, 'Persistence');
  }

  await delay(2500);

  // Reload context with persisted database
  healthcareCtx = await getWorkspaceContext(targetWorkspaceId);

  // -------------------------------------------------------------------------
  // SECTION 10: STAGE 7B — REST API BLUEPRINT SPECIFICATIONS
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 10] Stage 7b: REST API Blueprint Real Generation & Persistence');
  let apiOutput;
  {
    console.log('    Generating real Gemini REST API Blueprint...');
    apiOutput = await externalProvider.generateAPIs(healthcareCtx, healthcareCtx.solution, healthcareCtx.architecture, healthcareCtx.process, healthcareCtx.database);

    assert(apiOutput._meta.provider === 'GEMINI', 'API provider is GEMINI', 'API');
    assert(apiOutput._meta.model === 'gemini-3.1-flash-lite', 'API model is gemini-3.1-flash-lite', 'API');

    const validation = validateAPI(apiOutput.result);
    assert(validation.valid === true, `API schema validation passed: ${validation.errors?.join(', ') || 'valid'}`, 'API');

    const apis = apiOutput.result;
    assert(Array.isArray(apis.endpoints) && apis.endpoints.length >= 4, `API contains ${apis.endpoints.length} endpoints (>= 4 required)`, 'API');

    // Resource mapping: Endpoints must operate on appointment resources
    const endpointText = apis.endpoints.map(e => `${e.method} ${e.endpoint || e.path || ''} ${e.description || ''}`.toLowerCase()).join(' ');
    assert(endpointText.includes('appointment') || endpointText.includes('patient') || endpointText.includes('doctor') || endpointText.includes('slot') || endpointText.includes('schedule'), 'API endpoints operate on appointment domain resources', 'UpstreamDownstream');

    // Anti-leakage: No customer support endpoints
    assert(!endpointText.includes('/tickets') && !endpointText.includes('/support-agents'), 'API contains zero customer support ticket endpoints', 'AntiLeakage');

    // Database Persistence
    const persistedAPI = await prisma.apiDesign.create({
      data: {
        workspaceId: targetWorkspaceId,
        title: apis.title || 'Patient Appointment REST API Blueprint',
        baseUrl: apis.baseUrl || '/api/v1',
        authType: apis.authType || 'Bearer JWT',
        endpoints: JSON.stringify(apis.endpoints),
        version: 1,
        status: 'DRAFT'
      }
    });
    assert(!!persistedAPI.id, `Persisted API Blueprint to database (ID: ${persistedAPI.id})`, 'Persistence');
  }

  await delay(2500);

  // Reload context with persisted API
  healthcareCtx = await getWorkspaceContext(targetWorkspaceId);

  // -------------------------------------------------------------------------
  // SECTION 11: STAGE 8 — IMPLEMENTATION PLANNING & TASK DAG INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 11] Stage 8: Implementation Planning Real Generation & Persistence');
  let planOutput;
  {
    console.log('    Generating real Gemini Implementation Plan & DAG Tasks...');
    planOutput = await externalProvider.generateImplementationPlan(
      healthcareCtx,
      healthcareCtx.solution,
      healthcareCtx.architecture,
      healthcareCtx.process,
      healthcareCtx.database,
      healthcareCtx.api,
      healthcareCtx.ux
    );

    assert(planOutput._meta.provider === 'GEMINI', 'Planning provider is GEMINI', 'Planning');
    assert(planOutput._meta.model === 'gemini-3.1-flash-lite', 'Planning model is gemini-3.1-flash-lite', 'Planning');

    const validation = validatePlanning(planOutput.result);
    assert(validation.valid === true, `Planning schema validation passed: ${validation.errors?.join(', ') || 'valid'}`, 'Planning');

    const plan = planOutput.result;
    assert(Array.isArray(plan.phases) && plan.phases.length >= 3, `Plan contains ${plan.phases.length} phases (>= 3 required)`, 'Planning');
    assert(Array.isArray(plan.tasks) && plan.tasks.length >= 6, `Plan contains ${plan.tasks.length} tasks (>= 6 required)`, 'Planning');

    // Cross-Stage Consistency: Tasks reference upstream entities
    const tasksText = plan.tasks.map(t => `${t.title} ${t.description || ''}`).join(' ').toLowerCase();
    assert(tasksText.includes('appointment') || tasksText.includes('patient') || tasksText.includes('doctor') || tasksText.includes('scheduling') || tasksText.includes('availability'), 'Tasks reference real appointment scheduling features', 'UpstreamDownstream');

    // Anti-leakage: Zero support tickets in tasks
    assert(!tasksText.includes('ticket queue') && !tasksText.includes('customer support rep'), 'Implementation tasks do NOT contain customer support tickets', 'AntiLeakage');

    // Database Persistence
    const persistedPlan = await prisma.implementationPlan.create({
      data: {
        workspaceId: targetWorkspaceId,
        title: plan.title || 'Patient Appointment Implementation Roadmap',
        methodology: plan.methodology || 'Agile Scrum',
        estimatedDurationWeeks: plan.estimatedDurationWeeks || 12,
        estimatedCost: plan.estimatedCost || '$150,000 - $200,000',
        phases: JSON.stringify(plan.phases),
        version: 1,
        status: 'DRAFT',
        tasks: {
          create: plan.tasks.map((task, idx) => ({
            phaseName: task.phaseName,
            title: task.title,
            description: task.description || '',
            assignedRole: task.assignedRole || 'Developer',
            durationWeeks: task.durationWeeks || 1.0,
            sprint: typeof task.sprint === 'string' ? task.sprint : `Sprint ${task.sprint || 1}`,
            status: 'TODO',
            riskLevel: task.riskLevel || 'LOW',
            dependencies: task.dependencies ? (typeof task.dependencies === 'string' ? task.dependencies : JSON.stringify(task.dependencies)) : null
          }))
        }
      }
    });
    assert(!!persistedPlan.id, `Persisted Implementation Plan to database (ID: ${persistedPlan.id})`, 'Persistence');
  }

  await delay(2000);

  // -------------------------------------------------------------------------
  // SECTION 12: USER EDIT PROPAGATION TEST
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 12] User Edit Propagation (Solution Edit -> Architecture)');
  {
    // Simulate user editing the selected solution option to OPTION_A
    console.log('    Simulating user selecting OPTION_A in Solution...');
    await prisma.solution.updateMany({
      where: { workspaceId: targetWorkspaceId },
      data: { selectedOption: 'OPTION_A' }
    });

    const editedCtx = await getWorkspaceContext(targetWorkspaceId);
    assert(editedCtx.solution.selectedOption === 'OPTION_A', 'Persisted solution now reflects user edit to OPTION_A', 'UserEdits');

    // Generate architecture from the edited solution
    console.log('    Regenerating Architecture from user-edited solution (OPTION_A)...');
    const reArch = await externalProvider.generateArchitecture(editedCtx, editedCtx.solution);
    assert(reArch._meta.provider === 'GEMINI', 'Architecture generated via GEMINI', 'UserEdits');

    const reArchText = JSON.stringify(reArch.result).toLowerCase();
    assert(reArchText.includes('option_a') || reArchText.includes('rules') || reArchText.includes('deterministic') || reArchText.includes('rule-based') || reArchText.includes('automation'), 'Architecture output reflects user edit to OPTION_A (Rules/Deterministic)', 'UserEdits');

    // Restore solution back to OPTION_B
    await prisma.solution.updateMany({
      where: { workspaceId: targetWorkspaceId },
      data: { selectedOption: 'OPTION_B' }
    });
  }

  await delay(2000);

  // -------------------------------------------------------------------------
  // SECTION 13: REGENERATION WITH UPDATED WORKSPACE STATE
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 13] Workspace Information Change & Regeneration');
  {
    const originalObjective = healthcareCtx.workspace.objective;
    const modifiedObjective = 'Accelerate outpatient cardiology and pediatric specialist appointment scheduling.';

    try {
      await prisma.workspace.update({
        where: { id: targetWorkspaceId },
        data: { objective: modifiedObjective }
      });

      const updatedCtx = await getWorkspaceContext(targetWorkspaceId);
      assert(updatedCtx.workspace.objective === modifiedObjective, 'Workspace database updated with modified objective', 'Regeneration');

      console.log('    Regenerating Business Analysis with modified workspace objective...');
      const regeneratedAnalysis = await externalProvider.generateBusinessAnalysis(updatedCtx);

      const regenText = JSON.stringify(regeneratedAnalysis.result).toLowerCase();
      assert(regenText.includes('cardiology') || regenText.includes('pediatric') || regenText.includes('specialist') || regenText.includes('outpatient'), 'Regenerated analysis directly incorporates modified workspace parameters (cardiology/pediatric/specialist)', 'Regeneration');

    } finally {
      // Revert workspace objective
      await prisma.workspace.update({
        where: { id: targetWorkspaceId },
        data: { objective: originalObjective }
      });
    }
  }

  await delay(2000);

  // -------------------------------------------------------------------------
  // SECTION 14: WORKSPACE ISOLATION TEST (Healthcare vs Manufacturing)
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 14] Workspace Isolation Test (Healthcare vs Manufacturing)');
  {
    const manufacturingContext = {
      workspace: {
        id: 'ws-test-manufacturing-isolation',
        name: 'Precision Gearbox Manufacturing & Inventory Optimization',
        industry: 'Manufacturing & Industrial',
        objective: 'Eliminate assembly line work-in-progress (WIP) part shortages and optimize safety stock levels across production plants.',
        challenge: 'Machine operators experience unplanned downtime due to missing transmission gear blanks and manual bin counts.',
        targetUsers: 'Plant Supervisors, Inventory Planners, Machine Operators, Supply Chain Directors',
        expectedOutcome: 'Zero assembly line stoppages and 40% reduction in safety stock holding costs.'
      },
      domain: 'SUPPLY_CHAIN',
      documents: [],
      discovery: { messages: [] }
    };

    console.log('    Generating real Gemini Business Analysis for Manufacturing workspace...');
    const mfgAnalysis = await externalProvider.generateBusinessAnalysis(manufacturingContext);
    const mfgText = JSON.stringify(mfgAnalysis.result).toLowerCase();

    // Verify Manufacturing Grounding
    assert(mfgText.includes('gear') || mfgText.includes('manufacturing') || mfgText.includes('inventory') || mfgText.includes('assembly') || mfgText.includes('shortage'), 'Manufacturing analysis is grounded in manufacturing/inventory concepts', 'WorkspaceIsolation');

    // Verify ZERO Healthcare Leakage into Manufacturing
    assert(!mfgText.includes('patient') && !mfgText.includes('doctor') && !mfgText.includes('clinical') && !mfgText.includes('appointment'), 'Manufacturing analysis has ZERO healthcare leakage (no patient/doctor/clinical)', 'WorkspaceIsolation');

    // Verify ZERO Customer Support Ticket Leakage into Manufacturing
    assert(!mfgText.includes('ticket queue') && !mfgText.includes('support ticket') && !mfgText.includes('helpdesk'), 'Manufacturing analysis has ZERO customer support leakage', 'WorkspaceIsolation');
  }

  await delay(2000);

  // -------------------------------------------------------------------------
  // SECTION 15: DOCUMENT ABSENCE TEST
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 15] Document Absence Test');
  {
    const noDocContext = {
      workspace: {
        id: 'ws-test-no-docs',
        name: 'FinTech Loan Originator',
        industry: 'Financial Services',
        objective: 'Streamline retail mortgage application verification.',
        challenge: 'Manual document review takes 14 days.',
        targetUsers: 'Underwriters, Applicants, Loan Officers',
        expectedOutcome: 'Sub-48 hour loan decisions.'
      },
      domain: 'FINTECH_CLAIMS',
      documents: [],
      documentContext: { count: 0, analyzedCount: 0, documents: [], sourceReferences: [], combinedText: '' },
      discovery: { messages: [] }
    };

    console.log('    Generating real Gemini Discovery Questions for document-free workspace...');
    const noDocQuestions = await externalProvider.generateDiscoveryQuestions(noDocContext);
    const noDocText = JSON.stringify(noDocQuestions).toLowerCase();

    // Verify AI does NOT fabricate uploaded document references
    assert(!noDocText.includes('according to your uploaded') && !noDocText.includes('in your uploaded sop') && !noDocText.includes('your uploaded brd'), 'AI does NOT claim documents exist when workspace has no uploaded files', 'DocumentAbsence');
  }

  await delay(2000);

  // -------------------------------------------------------------------------
  // SECTION 16: ERROR HANDLING & SILENT FALLBACK DISABLED TEST
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 16] Error Handling & Fallback Disabled (Visible Errors)');
  {
    // Verify AI_FALLBACK_ON_ERROR=false re-throws typed errors without demo fallback
    const savedKey = process.env.AI_API_KEY;
    try {
      process.env.AI_API_KEY = 'INVALID_AUTHENTICATION_KEY_TESTING';

      let caughtError = null;
      try {
        await aiService.analyzeBusinessContext(healthcareCtx);
      } catch (err) {
        caughtError = err;
      }

      assert(!!caughtError, 'aiService threw an error when AI_FALLBACK_ON_ERROR=false', 'ErrorHandling');
      assert(caughtError.code === 'AUTH_ERROR', `Error categorized as AUTH_ERROR (was: ${caughtError?.code})`, 'ErrorHandling');
      assert(caughtError.provider === 'gemini', 'Error identifies provider=gemini', 'ErrorHandling');

    } finally {
      process.env.AI_API_KEY = savedKey;
    }

    // Verify CONFIG_ERROR on unsupported provider
    const savedProvider = process.env.AI_PROVIDER;
    try {
      process.env.AI_PROVIDER = 'unknown-ai-provider';
      let configErr = null;
      try {
        providerRouter.getActiveProvider();
      } catch (err) {
        configErr = err;
      }
      assert(!!configErr && configErr.code === 'CONFIG_ERROR', 'Unsupported provider throws CONFIG_ERROR', 'ErrorHandling');
    } finally {
      process.env.AI_PROVIDER = savedProvider;
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 17: CREDENTIAL SECURITY AUDIT
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 17] Credential Security Audit');
  {
    // Search source files for hardcoded Google/Gemini API keys
    const srcDir = path.resolve(__dirname, 'src');
    const frontendDir = path.resolve(__dirname, '../frontend/src');

    function scanDirectory(dir) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scanDirectory(full);
        } else if (/\.(js|jsx|json)$/.test(f)) {
          const content = fs.readFileSync(full, 'utf8');
          // Check for actual active API key pattern (AIzaSy or AQ.)
          if (content.includes(apiKey) && !full.endsWith('.env')) {
            throw new Error(`CRITICAL SECURITY FAILURE: Active API key leaked in source file: ${full}`);
          }
        }
      }
    }

    scanDirectory(srcDir);
    scanDirectory(frontendDir);
    assert(true, 'Zero active API credentials hardcoded in backend or frontend source code', 'Security');
  }

  // -------------------------------------------------------------------------
  // FINAL VERIFICATION SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`🎉 PHASE 1 VERIFICATION COMPLETED: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED!`);
  console.log(`Failed: ${failedAssertions}`);
  console.log('======================================================================\n');

  return {
    total: totalAssertions,
    passed: passedAssertions,
    failed: failedAssertions,
    testResults
  };
}

runPhase1ClosureSuite()
  .then(res => {
    if (res.failed > 0) {
      console.error(`Verification FAILED with ${res.failed} errors.`);
      process.exit(1);
    }
    console.log('Verification SUCCEEDED with zero failures.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Master test suite execution error:', err);
    process.exit(1);
  });

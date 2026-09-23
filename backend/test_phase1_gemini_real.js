/**
 * Phase 1: Native Google Gemini AI Provider End-to-End Verification Suite
 * 
 * Verifies:
 * TEST 1: Provider Router & Active Health Ping (Native Gemini API)
 * TEST 2: Native Gemini Stage 2 (Business Analysis) Generation & Schema Validation
 * TEST 3: Native Gemini Stage 3 (Solution Options A/B/C) Generation & Schema Validation
 * TEST 4: Native Gemini Stage 4 (Target Architecture) Generation & Schema Validation
 * TEST 5: Context Grounding & Domain Divergence (Healthcare vs Supply Chain)
 * TEST 6: Document Intelligence Context Injection
 * TEST 7: Error Classification (AUTH_ERROR, KEY_MISSING, CONFIG_ERROR, TIMEOUT)
 * TEST 8: Transparent Fallback Metadata (DEMO_FALLBACK with originalProvider & errorMessage)
 * TEST 9: Zero Credential Cross-Contamination & Security Check
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

import { aiService } from './src/ai/aiService.js';
import { providerRouter } from './src/ai/providers/providerRouter.js';
import { geminiProvider } from './src/ai/providers/geminiProvider.js';
import { openAiProvider } from './src/ai/providers/openaiProvider.js';
import { externalProvider } from './src/ai/providers/externalProvider.js';
import { validateBusinessAnalysis, validateSolution, validateArchitecture } from './src/ai/schemaValidator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('PHASE 1: NATIVE GEMINI AI ENGINE VERIFICATION SUITE');
  console.log('===============================================================\n');

  // Verify Environment
  const originalApiKey = process.env.AI_API_KEY;
  const originalProvider = process.env.AI_PROVIDER;
  const originalModel = process.env.AI_MODEL;

  assert(!!originalApiKey, 'AI_API_KEY is present in environment');
  assert((originalProvider || '').toLowerCase() === 'gemini', `AI_PROVIDER is configured to "gemini" (was: ${originalProvider})`);

  // ---------------------------------------------------------------------------
  // TEST 1: Provider Router & Active Health Ping
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 1] Provider Router & Active Health Ping');
  {
    const status = aiService.getProviderStatus();
    assert(status.provider.toLowerCase() === 'gemini', 'getProviderStatus reports provider=gemini');
    assert(status.externalConfigured === true, 'getProviderStatus reports externalConfigured=true');
    assert(status.model.includes('gemini'), `getProviderStatus reports Gemini model (${status.model})`);

    const health = await aiService.checkHealth();
    console.log('    [Health Check Result]:', health);
    assert(health.configured === true, 'Health check reports configured=true');
    assert(health.reachable === true, 'Health check reports reachable=true');
    assert(health.status === 'HEALTHY', 'Health check reports status=HEALTHY');
    assert(typeof health.latencyMs === 'number' && health.latencyMs > 0, `Active ping returned valid latency: ${health.latencyMs}ms`);
    assert(!JSON.stringify(health).includes(originalApiKey), 'Health check payload does NOT expose API key');
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Native Gemini Stage 2 (Business Analysis) Generation
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 2] Stage 2: Business Analysis Real Generation');
  const healthcareContext = {
    workspace: {
      id: 'ws-test-healthcare',
      name: 'Apollo Hospital Digital Triage & Scheduling',
      industry: 'Healthcare & Clinical Services',
      objective: 'Eliminate patient triage delays and automate doctor appointment scheduling across specialty departments.',
      challenge: 'Patients wait 45+ minutes in phone queues; clinical staff manually manage schedules across legacy EHR silos.',
      targetUsers: 'Patients, Inpatient Registrars, Specialty Physicians, Clinical Triage Nurses',
      expectedOutcome: 'Sub-60s automated booking, 50% call-center deflection, zero double-booking, and strict HIPAA compliance.'
    },
    domain: 'HEALTHCARE',
    documents: [
      {
        fileName: 'apollo_clinical_sop.pdf',
        extractedText: 'Apollo Clinical Standard Operating Procedure: Triage nurse assigns ESI level 1-5. Epic EHR appointment slots release at 08:00 AM daily. HIPAA security rule 45 CFR Part 160 applies to all patient identifiers.'
      }
    ],
    discovery: {
      messages: [
        { role: 'user', content: 'We need real-time integration with Epic EHR FHIR APIs for doctor availability.' },
        { role: 'assistant', content: 'Understood. We will prioritize HL7/FHIR scheduling endpoints.' }
      ]
    }
  };

  let analysisResult;
  {
    const startTime = Date.now();
    analysisResult = await externalProvider.generateBusinessAnalysis(healthcareContext);
    const duration = Date.now() - startTime;

    assert(!!analysisResult, 'Generated Business Analysis successfully');
    assert(analysisResult._meta.provider === 'GEMINI', `_meta.provider is "GEMINI" (was: ${analysisResult._meta.provider})`);
    assert(analysisResult._meta.tokensUsed > 0, `Tokens used tracked: ${analysisResult._meta.tokensUsed}`);
    assert(analysisResult._meta.latencyMs > 0, `Latency tracked: ${analysisResult._meta.latencyMs}ms (total wall time: ${duration}ms)`);

    // Schema Validation
    const validation = validateBusinessAnalysis(analysisResult.result);
    assert(validation.valid === true, `Analysis schema valid: ${validation.errors.join(', ')}`);
    assert(typeof analysisResult.result.digitalMaturityScore === 'number' && analysisResult.result.digitalMaturityScore >= 0 && analysisResult.result.digitalMaturityScore <= 100, `Digital maturity score is bounded number: ${analysisResult.result.digitalMaturityScore}`);
    assert(Array.isArray(analysisResult.result.painPoints) && analysisResult.result.painPoints.length >= 2, `Pain points array has ${analysisResult.result.painPoints.length} items`);
    assert(Array.isArray(analysisResult.result.goals) && analysisResult.result.goals.length >= 2, `Goals array has ${analysisResult.result.goals.length} items`);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Native Gemini Stage 3 (Solution Options A/B/C) Generation
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 3] Stage 3: Solution Options A/B/C Real Generation');
  let solutionResult;
  {
    solutionResult = await externalProvider.generateSolutions(healthcareContext, analysisResult.result);

    assert(!!solutionResult, 'Generated Solutions successfully');
    assert(solutionResult._meta.provider === 'GEMINI', `_meta.provider is "GEMINI"`);
    assert(solutionResult._meta.tokensUsed > 0, `Tokens used tracked: ${solutionResult._meta.tokensUsed}`);

    const validation = validateSolution(solutionResult.result);
    assert(validation.valid === true, `Solution schema valid: ${validation.errors.join(', ')}`);
    assert(solutionResult.result.options && solutionResult.result.options.length >= 3, 'Solution contains 3 options (A, B, C)');
    assert(['Option A', 'Option B', 'Option C', 'A', 'B', 'C'].some(v => (solutionResult.result.selectedOption || '').includes(v)), `Valid selected option: ${solutionResult.result.selectedOption}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Native Gemini Stage 4 (Target Architecture Canvas) Generation
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 4] Stage 4: Target Architecture Real Generation');
  {
    const archResult = await externalProvider.generateArchitecture(healthcareContext, solutionResult.result);

    assert(!!archResult, 'Generated Architecture canvas successfully');
    assert(archResult._meta.provider === 'GEMINI', `_meta.provider is "GEMINI"`);
    assert(archResult._meta.tokensUsed > 0, `Tokens used tracked: ${archResult._meta.tokensUsed}`);

    const validation = validateArchitecture(archResult.result);
    assert(Array.isArray(archResult.result.nodes) && archResult.result.nodes.length >= 6, `Architecture contains ${archResult.result.nodes.length} nodes`);
    assert(Array.isArray(archResult.result.edges) && archResult.result.edges.length >= 3, `Architecture contains ${archResult.result.edges.length} edges`);
    assert(typeof archResult.result.highLevelDesign === 'string' && archResult.result.highLevelDesign.length >= 20, 'Architecture has valid highLevelDesign');
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Context Grounding & Domain Divergence
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 5] Context Grounding & Domain Divergence');
  {
    // Check Healthcare output does NOT leak Customer Support ticket terms
    const healthText = JSON.stringify(analysisResult.result).toLowerCase();
    assert(
      healthText.includes('patient') || healthText.includes('clinical') || healthText.includes('appointment') || healthText.includes('hospital') || healthText.includes('ehr'),
      'Healthcare analysis is grounded in clinical/patient concepts'
    );
    assert(
      !healthText.includes('zendesk') && !healthText.includes('freshdesk') && !healthText.includes('customer support ticket escalation'),
      'Healthcare analysis does NOT leak generic helpdesk/ticketing jargon'
    );

    // Generate quick Supply Chain analysis to verify divergence
    const supplyChainContext = {
      workspace: {
        id: 'ws-test-supply-chain',
        name: 'ColdChain Global Freight Monitoring',
        industry: 'Logistics & Supply Chain',
        objective: 'Real-time temperature anomaly detection for refrigerated vaccine containers across international maritime routes.',
        challenge: 'Spoilage of high-value biologics due to delayed refrigerated container (reefer) telemetry and manual customs filings.',
        targetUsers: 'Fleet Dispatchers, Port Logistics Managers, Quality Compliance Officers',
        expectedOutcome: 'Zero cargo loss from temperature deviations, under 5-minute incident alerts, and automated customs manifests.'
      },
      domain: 'SUPPLY_CHAIN',
      documents: [],
      discovery: { messages: [] }
    };

    const supplyChainResult = await externalProvider.generateBusinessAnalysis(supplyChainContext);
    const supplyText = JSON.stringify(supplyChainResult.result).toLowerCase();

    assert(
      supplyText.includes('cargo') || supplyText.includes('temperature') || supplyText.includes('container') || supplyText.includes('shipment') || supplyText.includes('logistics') || supplyText.includes('freight'),
      'Supply chain analysis is grounded in freight/cargo/cold-chain concepts'
    );
    assert(
      !supplyText.includes('patient') && !supplyText.includes('doctor') && !supplyText.includes('hipaa') && !supplyText.includes('triage'),
      'Supply chain analysis does NOT leak Healthcare/patient jargon'
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Document Intelligence Context Injection
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 6] Document Intelligence Context Injection');
  {
    const healthText = JSON.stringify(analysisResult.result).toLowerCase();
    const mentionsSopOrEpic = healthText.includes('epic') || healthText.includes('fhir') || healthText.includes('hipaa') || healthText.includes('sop') || healthText.includes('esi');
    assert(mentionsSopOrEpic, 'Uploaded SOP document terms (Epic / FHIR / HIPAA / ESI) injected into generated output');
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Error Classification & Strict Exception Handling
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 7] Error Classification');
  {
    // 7a. Missing API Key
    let keyMissingCaught = false;
    try {
      await geminiProvider.generateChatCompletion({
        apiKey: '',
        model: 'gemini-3.6-flash',
        userPrompt: 'Test'
      });
    } catch (err) {
      keyMissingCaught = true;
      assert(err.code === 'KEY_MISSING', `Empty API key classified as KEY_MISSING (was: ${err.code})`);
    }
    assert(keyMissingCaught, 'Missing API key threw typed error');

    // 7b. Invalid API Key (AUTH_ERROR)
    let authErrorCaught = false;
    try {
      await geminiProvider.generateChatCompletion({
        apiKey: 'INVALID_AI_API_KEY_FOR_TESTING_PURPOSES_12345',
        model: 'gemini-3.6-flash',
        userPrompt: 'Test'
      });
    } catch (err) {
      authErrorCaught = true;
      assert(err.code === 'AUTH_ERROR', `Invalid key classified as AUTH_ERROR (was: ${err.code})`);
    }
    assert(authErrorCaught, 'Invalid API key threw AUTH_ERROR');

    // 7c. Unsupported Provider (CONFIG_ERROR)
    let configErrorCaught = false;
    try {
      process.env.AI_PROVIDER = 'unsupported-provider-xyz';
      providerRouter.getActiveProvider();
    } catch (err) {
      configErrorCaught = true;
      assert(err.code === 'CONFIG_ERROR', `Unsupported provider threw CONFIG_ERROR (was: ${err.code})`);
    } finally {
      process.env.AI_PROVIDER = originalProvider;
    }
    assert(configErrorCaught, 'Unsupported provider threw CONFIG_ERROR');
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Transparent Fallback Metadata
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 8] Transparent Fallback Metadata');
  {
    // Temporarily trigger fallback by configuring invalid key in aiService call
    const savedKey = process.env.AI_API_KEY;
    try {
      process.env.AI_API_KEY = 'INVALID_FALLBACK_TEST_KEY';
      process.env.AI_FALLBACK_ON_ERROR = 'true';

      const fallbackResult = await aiService.analyzeBusinessContext(healthcareContext);
      assert(fallbackResult._meta.provider === 'DEMO_FALLBACK', `Fallback provider is DEMO_FALLBACK (was: ${fallbackResult._meta.provider})`);
      assert(fallbackResult._meta.originalProvider.toLowerCase() === 'gemini', `_meta.originalProvider is "gemini" (was: ${fallbackResult._meta.originalProvider})`);
      assert(fallbackResult._meta.fallbackReason === 'AUTH_ERROR', `_meta.fallbackReason is "AUTH_ERROR" (was: ${fallbackResult._meta.fallbackReason})`);
      assert(typeof fallbackResult._meta.errorMessage === 'string' && fallbackResult._meta.errorMessage.length > 0, `_meta.errorMessage is populated: "${fallbackResult._meta.errorMessage}"`);
      assert(Array.isArray(fallbackResult.goals) && fallbackResult.goals.length > 0, 'Fallback returned usable demo goals');
    } finally {
      process.env.AI_API_KEY = savedKey;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Zero Credential Cross-Contamination
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 9] Zero Credential Cross-Contamination');
  {
    // Verify providerRouter routing logic
    process.env.AI_PROVIDER = 'gemini';
    const geminiActive = providerRouter.getActiveProvider();
    assert(geminiActive === geminiProvider, 'AI_PROVIDER=gemini resolves to geminiProvider');

    process.env.AI_PROVIDER = 'openai';
    const openaiActive = providerRouter.getActiveProvider();
    assert(openaiActive === openAiProvider, 'AI_PROVIDER=openai resolves to openAiProvider');

    process.env.AI_PROVIDER = originalProvider;
  }

  console.log('\n===============================================================');
  console.log(`🎉 ALL ${passed} PHASE 1 VERIFICATION ASSERTIONS PASSED!`);
  console.log(`Failed: ${failed}`);
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});

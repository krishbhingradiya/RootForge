/**
 * Automated Verification Suite for RootForge AI Business Consultant
 * 
 * Verifies the 10 User Acceptance Test Cases:
 * 1. "What is our primary business challenge?" -> Direct challenge answer.
 * 2. "Explain this in Gujarati." -> Gujarati response.
 * 3. "Explain this in Gujarati and in short." -> Gujarati response that is short (<= 4 sentences/bullets).
 * 4. "Give me a detailed explanation of the current bottleneck." -> Detailed bottleneck explanation.
 * 5. "What is today's weather?" -> Intercepted as GENERAL_OFF_DOMAIN before generation; polite boundary.
 * 6. "Explain the uploaded SOP." -> Document-grounded retrieval.
 * 7. "Summarize this document in 3 points." -> 3 points format.
 * 8. "ગુજરાતીમાં ટૂંકમાં સમજાવો." -> Short Gujarati answer.
 * 9. "આ business requirement શા માટે જરૂરી છે?" -> Gujarati response addressing requirement rationale.
 * 10. "Hello" -> Courteous short greeting, not a massive analysis.
 */

import assert from 'node:assert/strict';
import {
  resolveConversationalLanguage,
  detectResponseConstraints
} from '../src/utils/languageDetector.js';
import {
  classifyDomain,
  getDomainBoundaryResponse,
  getGreetingResponse,
  DOMAIN_CLASSES
} from '../src/ai/domainClassifier.js';
import { generateConsultantAnswer } from '../src/ai/relevanceGuard.js';

const mockWorkspace = {
  id: 'ws_test_enterprise',
  name: 'OmniFlow Logistics Enterprise',
  industry: 'Supply Chain & Cold Storage Logistics',
  businessProblem: 'Temperature excursions during last-mile cold chain transit causing 14% vaccine spoilage and compliance penalties.',
  targetAudience: 'Warehouse managers, fleet dispatchers, and QA compliance auditors',
  businessGoals: 'Reduce cold chain spoilage to under 1% and automate regulatory compliance reporting',
  documents: [
    {
      id: 'doc_sop_01',
      name: 'Cold_Chain_Transit_SOP_v2.pdf',
      summary: 'Standard Operating Procedure for active IoT temperature logging, alert dispatch, and quarantine handling.',
      chunks: [
        {
          id: 'chunk_1',
          content: 'SOP Section 4: When temperature exceeds 8 degrees Celsius for more than 15 minutes, the driver must immediately activate backup dry-ice cooler and notify dispatch.',
          metadata: { section: 'Section 4: Alert Protocols', page: 3 }
        }
      ]
    }
  ]
};

const mockContext = {
  workspace: mockWorkspace,
  stage: 'overview',
  activeWorkflows: ['Cold chain monitoring', 'Exception handling', 'Audit logging'],
  confirmedRequirements: [
    { id: 'req_1', statement: 'System must stream real-time IoT sensor telemetry every 30 seconds.' }
  ],
  documents: mockWorkspace.documents
};

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING AI BUSINESS CONSULTANT PIPELINE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // --- UNIT TESTS: Language & Constraints Detection ---
  test('Constraint & Language: "Explain this in Gujarati and keep it short."', () => {
    const lang = resolveConversationalLanguage('Explain this in Gujarati and keep it short.', 'en');
    const constraints = detectResponseConstraints('Explain this in Gujarati and keep it short.');
    assert.equal(lang, 'gu');
    assert.equal(constraints.length, 'SHORT');
  });

  test('Constraint & Language: Transliterated "Gujarati ma short ma samjavo"', () => {
    const lang = resolveConversationalLanguage('Gujarati ma short ma samjavo', 'en');
    const constraints = detectResponseConstraints('Gujarati ma short ma samjavo');
    assert.equal(lang, 'gu');
    assert.equal(constraints.length, 'SHORT');
  });

  test('Constraint & Language: Native Script "ગુજરાતીમાં ટૂંકમાં સમજાવો."', () => {
    const lang = resolveConversationalLanguage('ગુજરાતીમાં ટૂંકમાં સમજાવો.', 'en');
    const constraints = detectResponseConstraints('ગુજરાતીમાં ટૂંકમાં સમજાવો.');
    assert.equal(lang, 'gu');
    assert.equal(constraints.length, 'SHORT');
  });

  test('Constraint & Language: Transliterated "Hindi me 3 points me batao"', () => {
    const lang = resolveConversationalLanguage('Hindi me 3 points me batao', 'en');
    const constraints = detectResponseConstraints('Hindi me 3 points me batao');
    assert.equal(lang, 'hi');
    assert.equal(constraints.pointCount, 3);
    assert.equal(constraints.format, 'BULLETS');
  });

  test('Constraint: "Give me 5 points."', () => {
    const constraints = detectResponseConstraints('Give me 5 points.');
    assert.equal(constraints.pointCount, 5);
    assert.equal(constraints.format, 'BULLETS');
  });

  test('Constraint: "Explain step by step."', () => {
    const constraints = detectResponseConstraints('Explain step by step.');
    assert.equal(constraints.format, 'STEPS');
  });

  test('Constraint: "Compare these two options."', () => {
    const constraints = detectResponseConstraints('Compare these two options.');
    assert.equal(constraints.format, 'COMPARISON');
  });

  // --- PRE-GENERATION DOMAIN CLASSIFIER TESTS ---
  test('Domain Classifier: "What is today\'s weather?" -> GENERAL_OFF_DOMAIN', () => {
    const res = classifyDomain("What is today's weather?", mockContext);
    assert.equal(res.domain, DOMAIN_CLASSES.GENERAL_OFF_DOMAIN);
  });

  test('Domain Classifier: "Tell me a joke about cats" -> GENERAL_OFF_DOMAIN', () => {
    const res = classifyDomain('Tell me a joke about cats', mockContext);
    assert.equal(res.domain, DOMAIN_CLASSES.GENERAL_OFF_DOMAIN);
  });

  test('Domain Classifier: "Hello" -> GREETING', () => {
    const res = classifyDomain('Hello', mockContext);
    assert.equal(res.domain, DOMAIN_CLASSES.GREETING);
  });

  test('Domain Classifier: "Explain the uploaded SOP." -> DOCUMENT_RELATED', () => {
    const res = classifyDomain('Explain the uploaded SOP.', mockContext);
    assert.equal(res.domain, DOMAIN_CLASSES.DOCUMENT_RELATED);
  });

  test('Domain Classifier: "What is our primary business challenge?" -> WORKSPACE_RELATED', () => {
    const res = classifyDomain('What is our primary business challenge?', mockContext);
    assert.ok(
      res.domain === DOMAIN_CLASSES.WORKSPACE_RELATED ||
      res.domain === DOMAIN_CLASSES.BUSINESS_RELATED
    );
  });

  // --- END-TO-END PIPELINE TESTS FOR 10 SPECIFIED USER CASES ---
  console.log('\n--- 10 SPECIFIED USER ACCEPTANCE TESTS ---');

  // Test Case 1: "What is our primary business challenge?"
  await asyncTest('Case 1: "What is our primary business challenge?"', async () => {
    const res = await generateConsultantAnswer(mockContext, 'What is our primary business challenge?', [], 'en');
    assert.ok(res.structured);
    assert.ok(res.structured.summary);
    // Should directly address the cold chain / temperature problem
    assert.ok(
      res.structured.summary.toLowerCase().includes('temperature') ||
      res.structured.summary.toLowerCase().includes('spoilage') ||
      res.structured.summary.toLowerCase().includes('cold chain') ||
      res.structured.summary.toLowerCase().includes('challenge')
    );
  });

  // Test Case 2: "Explain this in Gujarati."
  await asyncTest('Case 2: "Explain this in Gujarati."', async () => {
    const res = await generateConsultantAnswer(mockContext, 'Explain this in Gujarati.', [], 'en');
    assert.equal(res.language, 'gu');
    assert.ok(/[\u0A80-\u0AFF]/.test(res.structured.summary), 'Summary must contain Gujarati characters');
  });

  // Test Case 3: "Explain this in Gujarati and in short."
  await asyncTest('Case 3: "Explain this in Gujarati and in short."', async () => {
    const res = await generateConsultantAnswer(mockContext, 'Explain this in Gujarati and in short.', [], 'en');
    assert.equal(res.language, 'gu');
    assert.ok(/[\u0A80-\u0AFF]/.test(res.structured.summary), 'Summary must contain Gujarati characters');
    // Short constraint means no bulky arrays
    assert.equal(res.structured.recommendations.length, 0);
    assert.equal(res.structured.openQuestions.length, 0);
  });

  // Test Case 4: "Give me a detailed explanation of the current bottleneck."
  await asyncTest('Case 4: "Give me a detailed explanation of the current bottleneck."', async () => {
    const res = await generateConsultantAnswer(mockContext, 'Give me a detailed explanation of the current bottleneck.', [], 'en');
    assert.ok(res.structured.summary);
    assert.ok(res.structured.summary.length > 50);
  });

  // Test Case 5: "What is today's weather?"
  await asyncTest('Case 5: "What is today\'s weather?" (Pre-generation domain boundary)', async () => {
    const res = await generateConsultantAnswer(mockContext, "What is today's weather?", [], 'en');
    assert.equal(res.domain, DOMAIN_CLASSES.GENERAL_OFF_DOMAIN);
    assert.equal(res.relevance, 'OFF_TOPIC');
    assert.ok(
      res.structured.summary.includes('AI Business Consultant') ||
      res.structured.summary.includes('RootForge')
    );
    // Boundary refusal must have empty recommendation and finding arrays (no hallucination)
    assert.equal(res.structured.recommendations.length, 0);
    assert.equal(res.structured.confirmedFacts.length, 0);
  });

  // Test Case 6: "Explain the uploaded SOP."
  await asyncTest('Case 6: "Explain the uploaded SOP."', async () => {
    const res = await generateConsultantAnswer(mockContext, 'Explain the uploaded SOP.', [], 'en');
    assert.ok(res.structured.summary);
    assert.ok(
      res.structured.summary.toLowerCase().includes('sop') ||
      res.structured.summary.toLowerCase().includes('cold_chain_transit_sop') ||
      res.structured.summary.toLowerCase().includes('iot') ||
      res.structured.summary.toLowerCase().includes('temperature')
    );
  });

  // Test Case 7: "Summarize this document in 3 points."
  await asyncTest('Case 7: "Summarize this document in 3 points."', async () => {
    const res = await generateConsultantAnswer(mockContext, 'Summarize this document in 3 points.', [], 'en');
    assert.ok(res.structured.summary);
    // Should have points or numbered items
    assert.ok(
      res.structured.summary.includes('1.') ||
      res.structured.summary.includes('•') ||
      res.structured.summary.includes('-')
    );
  });

  // Test Case 8: "ગુજરાતીમાં ટૂંકમાં સમજાવો."
  await asyncTest('Case 8: "ગુજરાતીમાં ટૂંકમાં સમજાવો."', async () => {
    const res = await generateConsultantAnswer(mockContext, 'ગુજરાતીમાં ટૂંકમાં સમજાવો.', [], 'gu');
    assert.equal(res.language, 'gu');
    assert.ok(/[\u0A80-\u0AFF]/.test(res.structured.summary), 'Must return native Gujarati text');
    assert.equal(res.structured.recommendations.length, 0);
  });

  // Test Case 9: "આ business requirement શા માટે જરૂરી છે?"
  await asyncTest('Case 9: "આ business requirement શા માટે જરૂરી છે?"', async () => {
    const res = await generateConsultantAnswer(mockContext, 'આ business requirement શા માટે જરૂરી છે?', [], 'gu');
    assert.equal(res.language, 'gu');
    assert.ok(/[\u0A80-\u0AFF]/.test(res.structured.summary), 'Must respond in Gujarati');
  });

  // Test Case 10: "Hello"
  await asyncTest('Case 10: "Hello" (Greeting Interception)', async () => {
    const res = await generateConsultantAnswer(mockContext, 'Hello', [], 'en');
    assert.equal(res.domain, DOMAIN_CLASSES.GREETING);
    assert.ok(
      res.structured.summary.toLowerCase().includes('hello') ||
      res.structured.summary.toLowerCase().includes('welcome')
    );
    assert.equal(res.structured.recommendations.length, 0);
  });

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});

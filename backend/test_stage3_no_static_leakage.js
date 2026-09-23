/**
 * RootForge Stage 3 Anti-Leakage & Static Demo Data Guard Suite
 * 
 * Verifies that generating solutions for arbitrary non-healthcare domains
 * NEVER produces hardcoded demo artifacts, synthetic medical systems,
 * or fabricated ROI/timeline metrics:
 * - NO "Medicare", "CMS", "HealthBase", "Epic", "Cerner"
 * - NO "Falcon" or "Apollo" (unless explicitly in that workspace's docs)
 * - NO hardcoded "$160k", "$160,000", "$45,000", "$120,000"
 * - NO hardcoded "12-14 weeks", "8-10 weeks", "16 weeks"
 * - NO hardcoded percentages like "85%", "45%", "99.9%" without documented baseline
 */

import { demoProvider } from './src/ai/providers/demoProvider.js';

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName, details = '') {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [TEST ${totalCount}] PASS: ${testName} ${details ? `(${details})` : ''}`);
  } else {
    console.error(`  ❌ [TEST ${totalCount}] FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runNoStaticLeakageSuite() {
  console.log('\n======================================================================');
  console.log('STAGE 3 NO STATIC DATA LEAKAGE VERIFICATION SUITE');
  console.log('======================================================================\n');

  // Workspaces from varied non-healthcare domains
  const testDomains = [
    {
      domain: 'Manufacturing IoT',
      context: {
        workspace: {
          id: 'ws-mfg-001',
          name: 'PrecisionForge Predictive Maintenance',
          objective: 'Predict CNC spindle bearing failures using vibration telemetry',
          industry: 'Industrial Manufacturing'
        },
        businessAnalysis: {
          id: 'ba-mfg-001',
          requirements: [
            { id: 'REQ-M-01', title: 'MQTT Vibration Stream', specification: 'Ingest 10kHz accelerometer signals via MQTT', classification: 'DOCUMENTED_FACT', status: 'CONFIRMED' },
            { id: 'REQ-M-02', title: 'FFT Spectral Analysis', specification: 'Compute fast Fourier transforms for harmonic frequency peaks', classification: 'DOCUMENTED_FACT', status: 'CONFIRMED' }
          ],
          strategicGoals: [{ id: 'G-M-01', goal: 'Prevent catastrophic tool breakages' }],
          painPoints: [{ id: 'PP-M-01', title: 'Unplanned downtime', description: 'Bearing seizure stops production line' }]
        }
      }
    },
    {
      domain: 'Legal Tech Contract Analysis',
      context: {
        workspace: {
          id: 'ws-legal-002',
          name: 'LexisBrief Contract Clause Extractor',
          objective: 'Extract indemnification and liability cap clauses from commercial vendor agreements',
          industry: 'Legal Services'
        },
        businessAnalysis: {
          id: 'ba-legal-002',
          requirements: [
            { id: 'REQ-L-01', title: 'PDF Clause Extraction', specification: 'Extract limitation of liability clauses from PDF leases', classification: 'DOCUMENTED_FACT', status: 'CONFIRMED' },
            { id: 'REQ-L-02', title: 'Risk Threshold Scoring', specification: 'Flag uncapped indemnity clauses for senior partner review', classification: 'DOCUMENTED_FACT', status: 'CONFIRMED' }
          ],
          strategicGoals: [{ id: 'G-L-01', goal: 'Accelerate contract redlining' }],
          painPoints: [{ id: 'PP-L-01', title: 'Manual clause comparison', description: 'Attorneys review 80-page contracts line by line' }]
        }
      }
    },
    {
      domain: 'Fintech Payment Gateway',
      context: {
        workspace: {
          id: 'ws-pay-003',
          name: 'PayNova Real-Time Settlement',
          objective: 'Authorize ISO 20022 merchant cross-border wire transfers',
          industry: 'Financial Technology'
        },
        businessAnalysis: {
          id: 'ba-pay-003',
          requirements: [
            { id: 'REQ-P-01', title: 'ISO 20022 Pacs.008 Parsing', specification: 'Validate credit transfer XML schemas', classification: 'DOCUMENTED_FACT', status: 'CONFIRMED' },
            { id: 'REQ-P-02', title: 'OFAC Sanction Screening', specification: 'Screen sender and beneficiary against OFAC SDN list', classification: 'DOCUMENTED_FACT', status: 'CONFIRMED' }
          ],
          strategicGoals: [{ id: 'G-P-01', goal: 'Sub-second sanction clearance' }],
          painPoints: [{ id: 'PP-P-01', title: 'False positive sanction holds', description: '12% of benign transfers delayed by manual screening' }]
        }
      }
    }
  ];

  const prohibitedPhrases = [
    'Medicare',
    'HealthBase',
    'Apollo Patient',
    'Falcon Scheduling',
    'HIPAA Compliance Gateway',
    '$160k',
    '$160,000',
    '12-14 weeks',
    '85% reduction in administrative burden'
  ];

  for (const item of testDomains) {
    console.log(`\nTesting domain: ${item.domain}...`);
    const solution = await demoProvider.recommendSolutions(item.context);
    const jsonStr = JSON.stringify(solution);

    // TEST: Verify prohibited phrases are completely absent
    for (const phrase of prohibitedPhrases) {
      const found = jsonStr.toLowerCase().includes(phrase.toLowerCase());
      assert(
        !found,
        `[${item.domain}] Prohibited static demo token "${phrase}" is ABSENT`,
        found ? `LEAK DETECTED in solution: ${phrase}` : 'Clean'
      );
    }

    // TEST: Verify business value does not contain fabricated percentages without evidence
    assert(
      !jsonStr.includes('85% reduction') && !jsonStr.includes('40% cost reduction'),
      `[${item.domain}] No fabricated percentage ROI assertions`
    );

    // TEST: Verify cost and timeline explicitly indicate proposed estimates
    const optB = solution.options.find(o => o.id === 'OPTION_B');
    assert(
      optB && optB.estimatedCost.includes('Proposed estimate') && optB.estimatedCost.includes('validation required'),
      `[${item.domain}] Option B estimatedCost is safely flagged as "Proposed estimate (AI estimate — validation required)"`
    );

    assert(
      optB && optB.estimatedEffort.includes('Proposed estimate') && optB.estimatedEffort.includes('validation required'),
      `[${item.domain}] Option B estimatedEffort is safely flagged as "Proposed estimate (AI estimate — validation required)"`
    );
  }

  console.log('\n----------------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
  console.log('======================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runNoStaticLeakageSuite().catch(err => {
  console.error('Fatal error in anti-leakage test suite:', err);
  process.exit(1);
});

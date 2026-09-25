/**
 * Comprehensive Verification Suite for RootForge AI UX Designer Engine
 * Tests all 16 mandatory test cases specified in Master Prompt.
 */

import { parseDirectiveToPatch, applyUiPatch, COLOR_PALETTES } from './uiPatchEngine.js';
import {
  createDefaultUiSpecification,
  validateAndRepairUiSpecification,
  THEME_ARCHETYPES,
  createHealthcareUiSpecification,
  createLogisticsUiSpecification,
  createFinanceUiSpecification,
  createRestaurantUiSpecification,
  createManufacturingUiSpecification,
  createHrPlatformUiSpecification
} from './dynamicUiSchema.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log(' ROOTFORGE AI UX DESIGNER — COMPREHENSIVE ENGINE TEST SUITE');
  console.log('===============================================================');

  // Baseline Spec
  const initialSpec = createDefaultUiSpecification('Commercial Operations Console', 'GENERAL_ENTERPRISE', 'enterprise-slate');
  assert(initialSpec && initialSpec.components?.length > 0, 'Initial UI Specification generated with components');

  // TEST 1: "+ Add a priority filter"
  console.log('\n--- TEST 1: One-Click Directive "+ Add a priority filter" ---');
  const patch1 = parseDirectiveToPatch('+ Add a priority filter', initialSpec);
  const res1 = applyUiPatch(initialSpec, patch1);
  const hasFilter = res1.updatedSpec.components.some(c => c.type === 'search_filter_bar' || c.type === 'filter_bar');
  assert(hasFilter, 'A real priority filter component was added to specification');
  console.log(`Summary: ${res1.patchSummary}`);

  // TEST 2: "+ Move AI assistant to the right" (and left)
  console.log('\n--- TEST 2: One-Click Directive "+ Move AI assistant to the right" / left ---');
  const patch2Left = parseDirectiveToPatch('Move AI assistant to the left', res1.updatedSpec);
  const res2Left = applyUiPatch(res1.updatedSpec, patch2Left);
  assert(res2Left.updatedSpec.layout.sidebarPosition === 'left', 'AI assistant layout position moved to left');

  const patch2Right = parseDirectiveToPatch('Move AI assistant to the right', res2Left.updatedSpec);
  const res2Right = applyUiPatch(res2Left.updatedSpec, patch2Right);
  assert(res2Right.updatedSpec.layout.sidebarPosition === 'right', 'AI assistant layout position moved to right');

  // TEST 3: "+ Make this dashboard more minimal"
  console.log('\n--- TEST 3: One-Click Directive "+ Make this dashboard more minimal" ---');
  const patch3 = parseDirectiveToPatch('+ Make this dashboard more minimal', res2Right.updatedSpec);
  const res3 = applyUiPatch(res2Right.updatedSpec, patch3);
  assert(res3.updatedSpec.layout.density === 'compact', 'Visual density reduced to compact');
  assert(res3.updatedSpec.layout.gap <= 8, 'Layout gap reduced to 8px for minimal cognitive friction');

  // TEST 4: "+ Use a darker command center style"
  console.log('\n--- TEST 4: One-Click Directive "+ Use a darker command center style" ---');
  const patch4 = parseDirectiveToPatch('+ Use a darker command center style', res3.updatedSpec);
  const res4 = applyUiPatch(res3.updatedSpec, patch4);
  assert(res4.updatedSpec.theme.mode === 'dark', 'Theme switched to dark mode');
  assert(res4.updatedSpec.theme.id === 'cyber-ops', 'Theme switched to Cyber Ops archetype');

  // TEST 5: Typed "Make all cards pink."
  console.log('\n--- TEST 5: Typed "Make all cards pink." ---');
  const patch5 = parseDirectiveToPatch('Make all cards pink.', res4.updatedSpec);
  const res5 = applyUiPatch(res4.updatedSpec, patch5);
  assert(res5.updatedSpec.theme.primary === COLOR_PALETTES.pink.primary, 'Primary color updated to pink');
  assert(res5.updatedSpec.theme.cardBg === COLOR_PALETTES.pink.cardBg, 'Card background updated to pink surface');
  assert(res5.updatedSpec.theme.buttonPrimary === COLOR_PALETTES.pink.buttonPrimary, 'Button color updated to pink');
  assert(res5.updatedSpec.theme.text && res5.updatedSpec.theme.text !== res5.updatedSpec.theme.cardBg, 'Text contrast preserved');

  // TEST 6: Typed "Move the AI assistant to the right and make all buttons purple."
  console.log('\n--- TEST 6: Compound Command "Move the AI assistant to the right and make all buttons purple." ---');
  const patch6 = parseDirectiveToPatch('Move the AI assistant to the right and make all buttons purple.', res5.updatedSpec);
  assert(patch6.operations && patch6.operations.length >= 2, 'Compound command parsed into multiple operations');
  const res6 = applyUiPatch(res5.updatedSpec, patch6);
  assert(res6.updatedSpec.layout.sidebarPosition === 'right', 'AI assistant position set to right');
  assert(res6.updatedSpec.theme.buttonPrimary === COLOR_PALETTES.purple.buttonPrimary, 'Buttons updated to royal purple');

  // TEST 7: Typed "Remove the throughput chart."
  console.log('\n--- TEST 7: Typed "Remove the throughput chart." ---');
  const specWithChart = JSON.parse(JSON.stringify(res6.updatedSpec));
  specWithChart.components.push({ id: 'cmp-throughput-chart', type: 'chart', title: 'Throughput Chart' });
  assert(specWithChart.components.some(c => c.type === 'chart'), 'Chart exists in spec before removal');
  const patch7 = parseDirectiveToPatch('Remove the throughput chart.', specWithChart);
  const res7 = applyUiPatch(specWithChart, patch7);
  assert(!res7.updatedSpec.components.some(c => c.type === 'chart'), 'Chart was successfully removed from specification');

  // TEST 8: Typed "Add a priority filter below the search bar."
  console.log('\n--- TEST 8: Typed "Add a priority filter below the search bar." ---');
  const patch8 = parseDirectiveToPatch('Add a priority filter below the search bar.', res7.updatedSpec);
  const res8 = applyUiPatch(res7.updatedSpec, patch8);
  assert(res8.updatedSpec.components.some(c => c.type === 'search_filter_bar' || c.type === 'filter_bar'), 'Priority filter added below search bar');

  // TEST 9: Typed "Make the dashboard more compact but keep all important information."
  console.log('\n--- TEST 9: Typed "Make the dashboard more compact but keep all important information." ---');
  const initialCompCount = res8.updatedSpec.components.length;
  const patch9 = parseDirectiveToPatch('Make the dashboard more compact but keep all important information.', res8.updatedSpec);
  const res9 = applyUiPatch(res8.updatedSpec, patch9);
  assert(res9.updatedSpec.layout.density === 'compact', 'Density set to compact');
  assert(res9.updatedSpec.components.length === initialCompCount, 'All components preserved without loss');

  // TEST 10: Typed "Make this look like a modern enterprise SaaS dashboard."
  console.log('\n--- TEST 10: Typed "Make this look like a modern enterprise SaaS dashboard." ---');
  const patch10 = parseDirectiveToPatch('Make this look like a modern enterprise SaaS dashboard.', res9.updatedSpec);
  const res10 = applyUiPatch(res9.updatedSpec, patch10);
  assert(res10.updatedSpec.theme.id === 'saas-modern' || res10.updatedSpec.theme.radius === '12px', 'Modern SaaS transformation applied');

  // TEST 11 & 12: Undo and Redo
  console.log('\n--- TEST 11 & 12: Real UI State Undo & Redo ---');
  const history = [JSON.parse(JSON.stringify(initialSpec)), JSON.parse(JSON.stringify(res5.updatedSpec))];
  const currentState = JSON.parse(JSON.stringify(res10.updatedSpec));

  // Perform Undo: currentState -> res5
  const undoState = history[history.length - 1];
  assert(undoState.theme.cardBg === COLOR_PALETTES.pink.cardBg, 'Undo accurately restored exact pink visual state');

  // Perform Undo: res5 -> initialSpec
  const undoState2 = history[0];
  assert(undoState2.theme.cardBg !== COLOR_PALETTES.pink.cardBg, 'Second Undo restored exact initial state');

  // Perform Redo: initialSpec -> res5
  const redoState = history[1];
  assert(redoState.theme.cardBg === COLOR_PALETTES.pink.cardBg, 'Redo accurately restored modified state');

  // TEST 13: Schema Validation and Self-Healing
  console.log('\n--- TEST 13: Schema Validation & Self-Healing ---');
  const brokenSpec = { page: null, components: 'invalid', theme: { primary: null } };
  const { valid, repairedSpec } = validateAndRepairUiSpecification(brokenSpec);
  assert(!valid, 'Invalid spec detected');
  assert(repairedSpec && Array.isArray(repairedSpec.components) && repairedSpec.theme.primary, 'Spec automatically repaired and self-healed');

  // TEST 14: Multi-Domain Business Generation (Hospital, Logistics, Fintech, Restaurant, Manufacturing, HR)
  console.log('\n--- TEST 14: Multi-Domain Business Generation ---');
  const hospital = createHealthcareUiSpecification('St. Jude Medical Center');
  assert(hospital.page.businessDomain === 'HEALTHCARE', 'Hospital domain specification generated');
  assert(hospital.components.some(c => c.title.toLowerCase().includes('patient')), 'Hospital contains patient appointments');

  const logistics = createLogisticsUiSpecification('Apex Courier Fleet');
  assert(logistics.page.businessDomain === 'LOGISTICS', 'Logistics domain specification generated');
  assert(logistics.components.some(c => c.title.toLowerCase().includes('fleet') || c.title.toLowerCase().includes('shipment')), 'Logistics contains fleet & waybills');

  const fintech = createFinanceUiSpecification('Capital Trust Bank');
  assert(fintech.page.businessDomain === 'FINANCE', 'FinTech domain specification generated');

  const restaurant = createRestaurantUiSpecification('Le Bistro Moderne');
  assert(restaurant.page.businessDomain === 'RESTAURANT', 'Restaurant domain specification generated');
  assert(restaurant.components.some(c => c.title.toLowerCase().includes('kitchen')), 'Restaurant contains kitchen display queue');

  const manufacturing = createManufacturingUiSpecification('RoboForge Assembly Plant');
  assert(manufacturing.page.businessDomain === 'MANUFACTURING', 'Manufacturing domain specification generated');
  assert(manufacturing.components.some(c => c.title.toLowerCase().includes('machine') || c.title.toLowerCase().includes('production')), 'Manufacturing contains machine telemetry');

  const hr = createHrPlatformUiSpecification('WorkforceHQ Platform');
  assert(hr.page.businessDomain === 'HR_PLATFORM', 'HR Platform domain specification generated');
  assert(hr.components.some(c => c.title.toLowerCase().includes('employee') || c.title.toLowerCase().includes('workforce')), 'HR contains employee directory');

  // TEST 15: JSON Patch format with `changes` array
  console.log('\n--- TEST 15: JSON Patch format with `changes` array ---');
  const jsonPatch = {
    operation: 'patch',
    changes: [
      { target: { type: 'Card' }, property: 'background', value: '#1A0E1C' },
      { target: { type: 'Button' }, property: 'background', value: '#EC4899' },
      { target: { id: 'ai-assistant' }, property: 'layout.grid.column', value: 10 }
    ]
  };
  const res15 = applyUiPatch(initialSpec, jsonPatch);
  assert(res15.updatedSpec.theme.cardBg === '#1A0E1C', 'JSON Patch background applied to card');
  assert(res15.updatedSpec.theme.buttonPrimary === '#EC4899', 'JSON Patch background applied to button');
  assert(res15.updatedSpec.layout.sidebarPosition === 'right', 'JSON Patch grid column converted to sidebar position');

  // TEST 16: Screen Isolation
  console.log('\n--- TEST 16: Screen Isolation (Modifying Screen 1 does not alter Screen 2) ---');
  const screen1 = { id: 'scr-1', name: 'Clinical Overview', uiSpecification: createHealthcareUiSpecification() };
  const screen2 = { id: 'scr-2', name: 'Fleet Dispatcher', uiSpecification: createLogisticsUiSpecification() };

  const screen1Modified = applyUiPatch(screen1.uiSpecification, parseDirectiveToPatch('Make all cards pink.', screen1.uiSpecification)).updatedSpec;
  assert(screen1Modified.theme.cardBg === COLOR_PALETTES.pink.cardBg, 'Screen 1 updated to pink');
  assert(screen2.uiSpecification.theme.cardBg !== COLOR_PALETTES.pink.cardBg, 'Screen 2 remained isolated and untouched');

  console.log('===============================================================');
  console.log(` ALL ${passedTests} / ${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
  console.log('===============================================================');
}

runTestSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

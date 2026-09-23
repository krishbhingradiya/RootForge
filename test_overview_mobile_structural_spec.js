import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== VERIFYING OVERVIEW MOBILE STRUCTURAL SEPARATION SPEC ===\n');

// 1. Verify WorkspaceOverviewPage.jsx structure
const pagePath = path.resolve('frontend/src/pages/workspaces/WorkspaceOverviewPage.jsx');
const pageContent = fs.readFileSync(pagePath, 'utf-8');

// Ensure overview-next-action-card is NOT nested inside overview-header-card
const headerCardStart = pageContent.indexOf('className="overview-header-card"');
assert(headerCardStart !== -1, 'overview-header-card must exist');
const nextActionStart = pageContent.indexOf('className="overview-next-action-card"');
assert(nextActionStart !== -1, 'overview-next-action-card must exist');
const pipelineStart = pageContent.indexOf('className="card overview-pipeline-container"');
assert(pipelineStart !== -1, 'overview-pipeline-container must exist');

// Verify order: header -> nextAction -> pipeline
assert(headerCardStart < nextActionStart, 'Header card must come before Next Action card');
assert(nextActionStart < pipelineStart, 'Next Action card must come before Pipeline container');

// Ensure overview-header-card closes before overview-next-action-card
const headerSlice = pageContent.slice(headerCardStart, nextActionStart);
assert(headerSlice.includes('</div>\n      </div>'), 'overview-header-card must close before overview-next-action-card');

console.log('✓ [PASS] Clean DOM separation: Header card, Next Action card, and Pipeline container are independent siblings');

// 2. Verify index.css rules
const cssPath = path.resolve('frontend/src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// Ensure mobile breakpoint <= 767px covers all overview components
assert(cssContent.includes('@media (max-width: 767px)'), 'Mobile breakpoint 767px must exist');
assert(cssContent.includes('.overview-next-action-card {\n    flex-direction: column;'), 'Next action card must be column on mobile');
assert(cssContent.includes('.overview-pipeline-grid {\n    grid-template-columns: 1fr !important;'), 'Pipeline grid must be 1fr on mobile');
assert(cssContent.includes('[data-theme=\'light\'] .overview-next-action-title'), 'Light theme parity for next action title must exist');

console.log('✓ [PASS] index.css enforces unified 767px mobile breakpoint and light theme parity');
console.log('\n=== ALL STRUCTURAL SEPARATION CHECKS PASSED ===\n');

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== VERIFYING OVERVIEW & TRANSFORMATION PIPELINE RESPONSIVE SPECIFICATION ===\n');

// 1. Verify WorkspaceOverviewPage.jsx
const overviewPagePath = path.resolve('frontend/src/pages/workspaces/WorkspaceOverviewPage.jsx');
assert(fs.existsSync(overviewPagePath), 'WorkspaceOverviewPage.jsx must exist');
const overviewContent = fs.readFileSync(overviewPagePath, 'utf-8');

assert(overviewContent.includes('className="overview-page-container"'), 'overview-page-container must be applied');
assert(overviewContent.includes('className="overview-header-card"'), 'overview-header-card must be applied');
assert(overviewContent.includes('className="overview-header-content"'), 'overview-header-content must be applied');
assert(overviewContent.includes('className="overview-header-title"'), 'overview-header-title must be applied');
assert(overviewContent.includes('className="overview-header-desc"'), 'overview-header-desc must be applied');
assert(overviewContent.includes('className="overview-header-actions"'), 'overview-header-actions must be applied');
assert(overviewContent.includes('className="overview-next-action-card"'), 'overview-next-action-card must be applied');
assert(overviewContent.includes('className="overview-pipeline-grid"'), 'overview-pipeline-grid must be applied');
assert(overviewContent.includes('className="overview-pipeline-card"'), 'overview-pipeline-card must be applied');
assert(overviewContent.includes('className="overview-scores-grid"'), 'overview-scores-grid must be applied');

// Ensure minWidth: 260 is NOT hardcoded in executive header
assert(!overviewContent.includes('minWidth: 260'), 'Hardcoded minWidth: 260 must be removed to prevent mobile overflow');

// Ensure inline repeat(auto-fit, minmax(min(100%, 125px), 1fr)) is NOT hardcoded in pipeline
assert(!overviewContent.includes('125px'), 'Hardcoded 125px 2-column pipeline must be replaced by responsive CSS grid');

console.log('✓ [PASS] WorkspaceOverviewPage.jsx uses responsive CSS classes and eliminated rigid inline dimensions');

// 2. Verify index.css Responsive System
const cssPath = path.resolve('frontend/src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// Check Mobile Breakpoint rule: Single column pipeline
assert(cssContent.includes('.overview-pipeline-grid {\n    grid-template-columns: 1fr !important;'), 'Pipeline must be STRICT single column on mobile');

// Check Tablet Breakpoint rule: Two column pipeline
assert(cssContent.includes('.overview-pipeline-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;'), 'Pipeline must be 2 columns on tablet');

// Check Desktop rule: Multi-column pipeline
assert(cssContent.includes('.overview-pipeline-grid {\n  display: grid;\n  grid-template-columns: repeat(5, minmax(0, 1fr));'), 'Pipeline must be 5-column grid on desktop');

// Check Decorative Line Protection
assert(cssContent.includes('.overview-pipeline-connector,\n.pipeline-connection-line {\n  display: none !important;\n  pointer-events: none;\n}'), 'Decorative lines must be disabled from crossing content');

// Check Text wrapping
assert(cssContent.includes('overflow-wrap: break-word;\n  word-break: break-word;'), 'Titles and text must have overflow-wrap: break-word and word-break: break-word');

// Check Content body padding on mobile
assert(cssContent.includes('.content-body {\n    padding: 16px 16px 48px 16px !important;'), 'content-body must have 16px padding on mobile');
assert(cssContent.includes('padding: 12px 10px 40px 10px !important;'), 'content-body must have 10px padding on micro screens <= 360px');

// Check 44px touch targets on buttons
assert(cssContent.includes('min-height: 44px;'), 'Buttons must enforce minimum 44px height for mobile accessibility');

console.log('✓ [PASS] index.css implements complete responsive system (1-col mobile, 2-col tablet, 5-col desktop)');
console.log('\n=== ALL OVERVIEW RESPONSIVE SPECIFICATION CHECKS PASSED ===');

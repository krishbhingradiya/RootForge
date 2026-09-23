import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== VERIFYING MOBILE HEADER + NAVIGATION REDESIGN SPECIFICATION ===\n');

// 1. Verify MobileNav.jsx
const mobileNavPath = path.resolve('frontend/src/components/layout/MobileNav.jsx');
assert(fs.existsSync(mobileNavPath), 'MobileNav.jsx must exist');
const mobileNavContent = fs.readFileSync(mobileNavPath, 'utf-8');

// Line 1: RootForge + Hamburger
assert(mobileNavContent.includes('mobile-header-row-1'), 'Line 1 row must exist');
assert(mobileNavContent.includes('mobile-logo-btn'), 'RootForge logo button must exist in Line 1');
assert(mobileNavContent.includes('mobile-hamburger-btn'), 'Hamburger button must exist in Line 1');
assert(mobileNavContent.includes('aria-label="Open navigation menu"'), 'Hamburger button must have accessible label');
assert(mobileNavContent.includes('<Menu size={22} />') || mobileNavContent.includes('<Menu size='), 'Hamburger must render Menu icon');

// Line 2: Workspace Selector + Language + Theme
assert(mobileNavContent.includes('mobile-header-row-2'), 'Line 2 row must exist');
assert(mobileNavContent.includes('mobile-ws-selector-btn'), 'Workspace selector button must exist in Line 2');
assert(mobileNavContent.includes('mobile-ws-name'), 'Workspace name span must exist in Line 2');
assert(mobileNavContent.includes('mobile-lang-select'), 'Language selector must exist in Line 2');
assert(mobileNavContent.includes('mobile-theme-btn'), 'Theme toggle button must exist in Line 2');

// Line 3: Current Section / Page
assert(mobileNavContent.includes('mobile-header-row-3'), 'Line 3 row must exist');
assert(mobileNavContent.includes('mobile-current-section'), 'Current section container must exist in Line 3');
assert(mobileNavContent.includes('mobile-section-label'), 'Current section label must exist in Line 3');
assert(mobileNavContent.includes('mobile-section-badge'), 'Current section stage badge must exist in Line 3');

// Navigation Drawer
assert(mobileNavContent.includes('mobile-nav-backdrop'), 'Drawer backdrop must exist');
assert(mobileNavContent.includes('mobile-nav-drawer'), 'Drawer panel must exist');
assert(mobileNavContent.includes('mobile-nav-drawer-close'), 'Close button must exist in drawer');
assert(mobileNavContent.includes('mobile-nav-ws-card'), 'Active workspace card must exist in drawer');

// Verify ALL 11 stages exist in stageItems
const expectedStages = [
  'overview',
  'discovery',
  'analysis',
  'solution',
  'architecture',
  'process',
  'ux',
  'database',
  'planning',
  'collaboration',
  'exports'
];

for (const stage of expectedStages) {
  assert(
    mobileNavContent.includes(`key: '${stage}'`),
    `Stage "${stage}" must be present in MobileNav stageItems`
  );
}

// Verify Platform services exist in drawer
assert(mobileNavContent.includes('AI Business Consultant') || mobileNavContent.includes('t.nav?.aiConsultant'), 'AI Consultant trigger must be in drawer');
assert(mobileNavContent.includes('Document Library'), 'Document Library trigger must be in drawer');
assert(mobileNavContent.includes('Settings'), 'Settings route must be in drawer');

// Verify Back button and popstate listeners
assert(mobileNavContent.includes('rootforge:close-modal'), 'Drawer must listen to rootforge:close-modal for Android back button');
assert(mobileNavContent.includes('popstate'), 'Drawer must handle popstate for browser back navigation');
assert(mobileNavContent.includes('Escape'), 'Drawer must close on Escape key');

console.log('✓ [PASS] MobileNav.jsx correctly implements 3-line header and full hamburger navigation drawer');

// 2. Verify RootForgeLogo.jsx
const logoContent = fs.readFileSync('frontend/src/components/common/RootForgeLogo.jsx', 'utf-8');
assert(logoContent.includes('xs: { iconSize: 24, fontSize: \'0.95rem\''), 'RootForgeLogo must support xs size for compact mobile layout');
console.log('✓ [PASS] RootForgeLogo.jsx supports xs size');

// 3. Verify index.css
const cssContent = fs.readFileSync('frontend/src/index.css', 'utf-8');

// Check desktop hidden state
assert(cssContent.includes('.mobile-nav-backdrop,\n.mobile-nav-drawer'), 'Mobile drawer elements must be hidden on desktop');

// Check mobile header styles
assert(cssContent.includes('.mobile-header {'), 'mobile-header must have styles in index.css');
assert(cssContent.includes('.mobile-header-row-1 {'), 'mobile-header-row-1 must have styles in index.css');
assert(cssContent.includes('.mobile-header-row-2 {'), 'mobile-header-row-2 must have styles in index.css');
assert(cssContent.includes('.mobile-header-row-3 {'), 'mobile-header-row-3 must have styles in index.css');

// Check minimum 44px touch targets
assert(cssContent.includes('.mobile-hamburger-btn {'), 'mobile-hamburger-btn must have dedicated styling');
assert(cssContent.includes('width: 44px;\n    height: 44px;'), 'mobile-hamburger-btn must have 44px x 44px touch target');
assert(cssContent.includes('.mobile-nav-drawer-close {'), 'drawer close button must have dedicated styling');

// Check text truncation on workspace selector
assert(cssContent.includes('.mobile-ws-name {'), 'mobile-ws-name must be styled');
assert(cssContent.includes('text-overflow: ellipsis;\n    white-space: nowrap;\n    flex: 1;'), 'mobile-ws-name must truncate with ellipsis');

// Check drawer animations
assert(cssContent.includes('slideDrawerRight'), 'Drawer must animate smoothly with slideDrawerRight');

// Check micro-viewport rules
assert(cssContent.includes('@media (max-width: 360px) {'), 'Micro phone breakpoint rules (<=360px) must be defined');

console.log('✓ [PASS] index.css implements all mobile header, drawer, and responsive rules');
console.log('\n=== ALL SPECIFICATION CHECKS PASSED ===');

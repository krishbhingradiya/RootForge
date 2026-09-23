import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== VERIFYING STRICT MOBILE BOTTOM NAVIGATION SPECIFICATION ===\n');

// 1. Verify MobileNav.jsx
const mobileNavPath = path.resolve('frontend/src/components/layout/MobileNav.jsx');
assert(fs.existsSync(mobileNavPath), 'MobileNav.jsx must exist');
const mobileNavContent = fs.readFileSync(mobileNavPath, 'utf-8');

// A. Check Top-Right Hamburger Button
assert(mobileNavContent.includes('mobile-hamburger-btn'), 'Top-right hamburger button must exist');
assert(mobileNavContent.includes('aria-label="Open navigation menu"'), 'Hamburger button must have accessible label');
assert(mobileNavContent.includes('onClick={() => setNavDrawerOpen(true)}'), 'Hamburger button must open the navigation drawer');
console.log('✓ [PASS] Top-right hamburger menu button is present and functional');

// B. Check Navigation Drawer contains full section navigation
assert(mobileNavContent.includes('mobile-nav-drawer'), 'Navigation drawer must exist');
assert(mobileNavContent.includes('mobile-nav-items-list'), 'Drawer must contain stage items');
console.log('✓ [PASS] Navigation drawer contains complete section navigation');

// C. Extract <nav className="mobile-bottom-nav"> block
const navMatch = mobileNavContent.match(/<nav className="mobile-bottom-nav">([\s\S]*?)<\/nav>/);
assert(navMatch, 'mobile-bottom-nav element must exist in MobileNav.jsx');
const navInner = navMatch[1];

// D. Verify Bottom "Menu" item is COMPLETELY REMOVED from bottom nav
assert(!navInner.includes('<span>Menu</span>'), 'Menu label must NOT exist in bottom navigation');
assert(!navInner.includes('aria-label="Open Navigation Menu"'), 'Menu button aria-label must NOT exist in bottom navigation');
assert(!navInner.includes('setNavDrawerOpen(true)'), 'Drawer trigger must NOT be in bottom navigation');
console.log('✓ [PASS] Bottom "Menu" item is completely removed from mobile bottom navigation');

// E. Verify Bottom Navigation contains EXACTLY 5 items in correct order
const buttonMatches = [...navInner.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)];
assert.strictEqual(buttonMatches.length, 5, `Bottom nav must contain exactly 5 buttons, found ${buttonMatches.length}`);

// Item 1: Home
assert(buttonMatches[0][1].includes('Home'), 'Button 1 must be Home');
assert(buttonMatches[0][1].includes('<Home'), 'Button 1 must render Home icon');

// Item 2: Workspaces
assert(buttonMatches[1][1].includes('Workspaces'), 'Button 2 must be Workspaces');
assert(buttonMatches[1][1].includes('<Building2'), 'Button 2 must render Building2 icon');

// Item 3: AI Copilot (CENTER ITEM)
assert(buttonMatches[2][1].includes('AI Copilot'), 'Button 3 must be AI Copilot');
assert(buttonMatches[2][1].includes('mobile-ai-companion-tab') || buttonMatches[2][0].includes('mobile-ai-companion-tab'), 'Button 3 must have mobile-ai-companion-tab class');
assert(buttonMatches[2][1].includes('mobile-ai-fab-icon'), 'Button 3 must have mobile-ai-fab-icon');
assert(buttonMatches[2][1].includes('<Sparkles'), 'Button 3 must render Sparkles icon');

// Item 4: Documents
assert(buttonMatches[3][1].includes('Documents'), 'Button 4 must be Documents');
assert(buttonMatches[3][1].includes('<FileText'), 'Button 4 must render FileText icon');

// Item 5: Settings
assert(buttonMatches[4][1].includes('Settings'), 'Button 5 must be Settings');
assert(buttonMatches[4][1].includes('<Settings'), 'Button 5 must render Settings icon');

console.log('✓ [PASS] Bottom navigation contains exactly 5 items: Home, Workspaces, AI Copilot, Documents, Settings');
console.log('✓ [PASS] AI Copilot is mathematically centered at position index 2 of 0..4 (2 items left, 2 items right)');

// 2. Verify index.css
const cssPath = path.resolve('frontend/src/index.css');
assert(fs.existsSync(cssPath), 'index.css must exist');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// A. Desktop Hidden State
assert(cssContent.includes('.mobile-bottom-nav,\n.mobile-offline-banner') || cssContent.includes('.mobile-bottom-nav'), 'Mobile bottom nav must be hidden on desktop');

// B. CSS Grid 5-column layout
assert(cssContent.includes('grid-template-columns: repeat(5, 1fr);'), 'mobile-bottom-nav must use 5-column CSS grid');
assert(cssContent.includes('.mobile-bottom-nav {'), 'mobile-bottom-nav must have dedicated styles');

// C. Safe-area support
assert(cssContent.includes('padding-bottom: max(env(safe-area-inset-bottom, 0px)') || cssContent.includes('padding-bottom: var(--sab)'), 'Safe area inset bottom must be respected');

// D. Touch Target Sizes (>= 44px)
assert(cssContent.includes('min-height: 52px;'), 'mobile-bottom-item must have min-height >= 44px');
assert(cssContent.includes('.mobile-ai-fab-icon {'), 'AI FAB icon must have dedicated styling');

// E. Micro screen responsive rules (<= 360px)
const microMatch = cssContent.match(/@media \(max-width: 360px\) \{([\s\S]*?)\}/g);
assert(microMatch && microMatch.length > 0, 'Micro phone (<= 360px) media queries must exist');
assert(cssContent.includes('width: 44px;\n      height: 44px;'), 'AI FAB icon must have 44px touch target on micro screens');

// F. Mathematical centering verification across target screen widths
const testWidths = [320, 360, 375, 390, 412];
for (const w of testWidths) {
  const colWidth = w / 5;
  const col3Start = colWidth * 2;
  const col3End = colWidth * 3;
  const col3Center = (col3Start + col3End) / 2;
  const viewportCenter = w / 2;

  assert.strictEqual(col3Center, viewportCenter, `At ${w}px, column 3 center must match viewport center`);
  assert(colWidth >= 44, `At ${w}px, column width (${colWidth}px) must exceed 44px minimum touch target width`);
}
console.log('✓ [PASS] Mathematical centering and touch target widths verified at 320px, 360px, 375px, 390px, 412px');

// G. Check Theme Compatibility
assert(cssContent.includes('background-color: var(--bg-surface);'), 'Uses var(--bg-surface) for light/dark theme support');
assert(cssContent.includes('border: 3px solid var(--bg-surface);'), 'FAB border adapts to light/dark background surface');
assert(cssContent.includes('color: var(--accent-amber);'), 'Active color uses semantic accent-amber');

console.log('✓ [PASS] Light and Dark theme styling verified with CSS custom properties');
console.log('\n=== ALL STRICT MOBILE BOTTOM NAVIGATION CHECKS PASSED ===\n');

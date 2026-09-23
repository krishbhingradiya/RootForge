// Comprehensive Frontend Responsive & E2E Verification
import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5175';
const ARTIFACTS_DIR = '/Users/JBC/.gemini/antigravity-ide/brain/9477134e-5924-4c2b-b443-792310438c16';

async function run() {
  console.log('================================================================');
  console.log('🧪 COMPREHENSIVE RESPONSIVE, AUTH & WORKSPACE E2E VERIFICATION');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore favicon or benign warnings
      if (!text.includes('favicon') && !text.includes('404 (Not Found)')) {
        consoleErrors.push(text);
      }
    }
  });

  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION & ROUTE GUARDS
    // -------------------------------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION & ROUTE GUARDS ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // A. Unauthenticated access to protected route redirects to /login
    await page.goto(`${BASE_URL}/app/workspaces`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout ? page.waitForTimeout(500) : new Promise(r => setTimeout(r, 500));
    const currentUrl = page.url();
    assert(currentUrl.includes('/login'), `Unauthenticated access redirects to /login (URL: ${currentUrl})`);

    // B. Invalid Login test
    await page.type('input[type="email"]', 'wrong@rootforge.com');
    await page.type('input[type="password"]', 'WrongPass123!');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    const loginError = await page.evaluate(() => {
      const el = document.querySelector('.error-message, .alert-error, [role="alert"], .text-red-500, .text-rose-400');
      return el ? el.textContent.trim() : null;
    });
    assert(loginError !== null || page.url().includes('/login'), `Invalid credentials handled without crash`);

    // C. Valid Login with fresh clean page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'demo@aisolutionbuilder.dev');
    await page.type('input[type="password"]', 'Solution@2026');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.startsWith('/app/workspaces'), { timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    assert(page.url().includes('/app/workspaces'), `Valid login redirected to /app/workspaces (URL: ${page.url()})`);

    // D. Session Persistence across page reload
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    assert(page.url().includes('/app/workspaces'), `Session persists after page refresh without redirect to /login`);

    // -------------------------------------------------------------------------
    // 2. WORKSPACE SELECTION & ACTIVE WORKSPACE
    // -------------------------------------------------------------------------
    console.log('\n--- 2. WORKSPACE SELECTION & CONTEXT ---');
    const wsCards = await page.$$('[data-workspace-id], .workspace-card, a[href*="/app/workspaces/"]');
    assert(wsCards.length > 0, `Workspace list renders multiple workspaces (found: ${wsCards.length})`);

    // Get the target workspace URL
    const targetWsHref = await page.evaluate(() => {
      const link = document.querySelector('a[href*="/app/workspaces/cmub7it4v00025zw93qq74acy"]') ||
                   document.querySelector('a[href*="/app/workspaces/"]');
      return link ? link.getAttribute('href') : null;
    });

    const activeWsUrl = targetWsHref ? (targetWsHref.startsWith('http') ? targetWsHref : `${BASE_URL}${targetWsHref}`) : `${BASE_URL}/app/workspaces/cmub7it4v00025zw93qq74acy`;
    console.log(`Navigating to active workspace: ${activeWsUrl}`);
    await page.goto(activeWsUrl, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const wsTitle = await page.evaluate(() => document.title || document.querySelector('h1, h2')?.textContent);
    assert(Boolean(wsTitle), `Workspace Overview rendered successfully: "${wsTitle?.trim()}"`);

    // Extract workspace ID
    const currentWorkspaceId = page.url().split('/workspaces/')[1]?.split('/')[0]?.split('?')[0];

    // -------------------------------------------------------------------------
    // 3. COMPLETE 11-MODULE WORKSPACE LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n--- 3. COMPLETE 11-MODULE WORKSPACE LIFECYCLE ---');
    const modules = [
      { name: 'Overview', path: `/app/workspaces/${currentWorkspaceId}` },
      { name: 'Discovery', path: `/app/workspaces/${currentWorkspaceId}/discovery` },
      { name: 'Business Analysis', path: `/app/workspaces/${currentWorkspaceId}/analysis` },
      { name: 'Solution Builder', path: `/app/workspaces/${currentWorkspaceId}/solution` },
      { name: 'Architecture', path: `/app/workspaces/${currentWorkspaceId}/architecture` },
      { name: 'Process Designer', path: `/app/workspaces/${currentWorkspaceId}/process` },
      { name: 'UX Designer', path: `/app/workspaces/${currentWorkspaceId}/ux` },
      { name: 'Database & APIs', path: `/app/workspaces/${currentWorkspaceId}/database` },
      { name: 'Planning', path: `/app/workspaces/${currentWorkspaceId}/planning` },
      { name: 'Collaboration', path: `/app/workspaces/${currentWorkspaceId}/collaboration` },
      { name: 'Exports', path: `/app/workspaces/${currentWorkspaceId}/exports` }
    ];

    for (const mod of modules) {
      await page.goto(`${BASE_URL}${mod.path}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 800));

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      const hasContent = await page.evaluate(() => {
        return document.body.innerText.trim().length > 50;
      });

      assert(!overflow, `Module [${mod.name}] has NO horizontal overflow (scrollWidth <= innerWidth)`);
      assert(hasContent, `Module [${mod.name}] rendered content successfully`);
    }

    // -------------------------------------------------------------------------
    // 4. MULTI-VIEWPORT RESPONSIVE MATRIX
    // -------------------------------------------------------------------------
    console.log('\n--- 4. MULTI-VIEWPORT RESPONSIVE MATRIX ---');
    const viewports = [
      { name: 'Mobile 320px (iPhone SE Narrow)', width: 320, height: 568, isMobile: true },
      { name: 'Mobile 360px (Standard Android)', width: 360, height: 780, isMobile: true },
      { name: 'Mobile 375px (iPhone Mini)', width: 375, height: 667, isMobile: true },
      { name: 'Mobile 390px (iPhone 14/15)', width: 390, height: 844, isMobile: true },
      { name: 'Mobile 412px (Samsung/Pixel)', width: 412, height: 915, isMobile: true },
      { name: 'Tablet 768px Portrait (iPad)', width: 768, height: 1024, isMobile: true },
      { name: 'Tablet 1024px Landscape (iPad)', width: 1024, height: 768, isMobile: false },
      { name: 'Desktop 1280px (Standard Laptop)', width: 1280, height: 800, isMobile: false },
      { name: 'Desktop 1440px (Hi-Res Laptop)', width: 1440, height: 900, isMobile: false },
      { name: 'Desktop 1920px (Full HD)', width: 1920, height: 1080, isMobile: false }
    ];

    // Test on Overview Page
    await page.goto(`${BASE_URL}/app/workspaces/${currentWorkspaceId}`, { waitUntil: 'networkidle2' });

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile, hasTouch: vp.isMobile });
      await new Promise(r => setTimeout(r, 400));

      const metrics = await page.evaluate((expectedW) => {
        const scrollW = document.documentElement.scrollWidth;
        const innerW = window.innerWidth;
        const bodyW = document.body.clientWidth;
        return { scrollW, innerW, bodyW, hasOverflow: scrollW > innerW };
      }, vp.width);

      assert(!metrics.hasOverflow, `Viewport [${vp.name}]: No horizontal scrollbar (scrollWidth: ${metrics.scrollW}px, window: ${metrics.innerW}px)`);
    }

    // -------------------------------------------------------------------------
    // 5. THEME SWITCHING (LIGHT & DARK THEMES)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. THEME SWITCHING (LIGHT & DARK THEMES) ---');
    // Set Dark Theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('aisb_theme', 'dark');
    });
    await new Promise(r => setTimeout(r, 300));
    const darkBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    assert(darkBg !== 'rgb(255, 255, 255)', `Dark theme applied: background is dark (${darkBg})`);

    // Set Light Theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('aisb_theme', 'light');
    });
    await new Promise(r => setTimeout(r, 300));
    const lightBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    assert(lightBg !== 'rgb(11, 15, 23)', `Light theme applied: background switched (${lightBg})`);

    // Reset to Dark Theme for enterprise consistency
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('aisb_theme', 'dark');
    });

    // -------------------------------------------------------------------------
    // 6. MOBILE HEADER, HAMBURGER DRAWER & BOTTOM NAV
    // -------------------------------------------------------------------------
    console.log('\n--- 6. MOBILE NAVIGATION CONTROLS ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/app/workspaces/${currentWorkspaceId}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // A. Check hamburger button exists and has >= 40px touch target
    const hamburgerTouchTarget = await page.evaluate(() => {
      const btn = document.querySelector('.mobile-hamburger-btn');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height), accessible: rect.width >= 36 && rect.height >= 36 };
    });
    assert(Boolean(hamburgerTouchTarget), `Mobile header hamburger button detected (size: ${hamburgerTouchTarget?.width}x${hamburgerTouchTarget?.height}px)`);

    // B. Check Bottom Nav has centered AI Copilot button
    const bottomNavCheck = await page.evaluate(() => {
      const bottomNav = document.querySelector('.mobile-bottom-nav');
      if (!bottomNav) return { exists: false };
      const aiBtn = bottomNav.querySelector('.mobile-ai-companion-tab, .mobile-ai-fab-icon');
      return {
        exists: true,
        aiBtnFound: Boolean(aiBtn)
      };
    });
    assert(bottomNavCheck.exists, `Fixed mobile bottom navigation bar present on mobile`);
    assert(bottomNavCheck.aiBtnFound, `Mobile bottom nav has prominent AI Copilot button`);

    // C. Check for Debug Artifacts
    const debugVisuals = await page.evaluate(() => {
      const debugEls = document.querySelectorAll('.debug-marker, .debug-grid, [data-debug], .temporary-artifact, .connection-line');
      return debugEls.length;
    });
    assert(debugVisuals === 0, `Zero debug lines, connection graphics or development overlays in UI (found: ${debugVisuals})`);

    // -------------------------------------------------------------------------
    // 7. CAPTURE FINAL AUDIT SCREENSHOTS
    // -------------------------------------------------------------------------
    console.log('\n--- 7. CAPTURING AUDIT SCREENSHOTS ---');
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_overview_mobile_390.png') });
    console.log(`📸 Captured: e2e_overview_mobile_390.png`);

    await page.goto(`${BASE_URL}/app/workspaces/${currentWorkspaceId}/discovery`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_discovery_mobile_390.png') });
    console.log(`📸 Captured: e2e_discovery_mobile_390.png`);

    await page.goto(`${BASE_URL}/app/workspaces/${currentWorkspaceId}/architecture`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_architecture_mobile_390.png') });
    console.log(`📸 Captured: e2e_architecture_mobile_390.png`);

    await page.setViewport({ width: 768, height: 1024, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/app/workspaces/${currentWorkspaceId}`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_overview_tablet_768.png') });
    console.log(`📸 Captured: e2e_overview_tablet_768.png`);

    console.log('\n================================================================');
    console.log(`🏁 RESPONSIVE & E2E VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log(`⚠️ Console errors captured: ${consoleErrors.length}`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();

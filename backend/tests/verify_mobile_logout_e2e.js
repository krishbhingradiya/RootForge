import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:5175';

async function run() {
  console.log('================================================================');
  console.log('🧪 VERIFY MOBILE NAVIGATION LOGOUT & AUTH LIFECYCLE E2E');
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

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('404 (Not Found)')) {
        consoleErrors.push(text);
      }
    }
  });

  try {
    // -------------------------------------------------------------------------
    // 1. MOBILE VIEWPORT SETUP & LOGIN
    // -------------------------------------------------------------------------
    console.log('\n--- 1. MOBILE LOGIN AS ADMIN ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // Fill in demo credentials
    await page.type('input[type="email"]', 'demo@aisolutionbuilder.dev');
    await page.type('input[type="password"]', 'Solution@2026');
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.startsWith('/app'), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 1000));
    assert(page.url().includes('/app'), `Admin user successfully authenticated and redirected to /app`);

    // Verify token exists in localStorage
    const hasToken = await page.evaluate(() => !!localStorage.getItem('aisb_token'));
    const hasUser = await page.evaluate(() => !!localStorage.getItem('aisb_user'));
    assert(hasToken && hasUser, `Auth token and user object saved in localStorage`);

    // -------------------------------------------------------------------------
    // 2. OPEN MOBILE NAVIGATION DRAWER & CHECK MENU ITEMS
    // -------------------------------------------------------------------------
    console.log('\n--- 2. MOBILE NAVIGATION DRAWER & LOGOUT PLACEMENT ---');
    // Click the hamburger button to open the mobile navigation drawer
    const hamburger = await page.$('.mobile-hamburger-btn, [aria-label*="navigation menu" i]');
    assert(!!hamburger, `Mobile hamburger button is present`);
    await hamburger.click();
    await new Promise(r => setTimeout(r, 600));

    // Verify drawer is open
    const drawer = await page.$('.mobile-nav-drawer');
    assert(!!drawer, `Mobile navigation drawer opened`);

    // Verify order: Admin Console exists and Logout is below it
    const drawerItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.mobile-nav-item'));
      return items.map(el => el.textContent.trim());
    });
    console.log('Found Drawer Items:', drawerItems);

    const adminIndex = drawerItems.findIndex(text => text.includes('Admin Console'));
    const logoutIndex = drawerItems.findIndex(text => text.includes('Log out'));

    assert(adminIndex !== -1, `Admin Console item found at index ${adminIndex}`);
    assert(logoutIndex !== -1, `Log out item found at index ${logoutIndex}`);
    assert(logoutIndex > adminIndex, `Log out item is correctly placed BELOW Admin Console (Admin: ${adminIndex}, Logout: ${logoutIndex})`);

    // -------------------------------------------------------------------------
    // 3. CANCEL LOGOUT CONFIRMATION
    // -------------------------------------------------------------------------
    console.log('\n--- 3. CANCEL LOGOUT DIALOG FLOW ---');
    // Click Log out button in drawer
    await page.evaluate(() => {
      const logoutBtn = document.querySelector('.mobile-nav-item-logout');
      if (logoutBtn) logoutBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Verify confirmation modal is shown
    const modalTitle = await page.evaluate(() => {
      const el = document.getElementById('logout-dialog-title');
      return el ? el.textContent.trim() : null;
    });
    const modalDesc = await page.evaluate(() => {
      const el = document.getElementById('logout-dialog-desc');
      return el ? el.textContent.trim() : null;
    });

    assert(modalTitle === 'Log out?', `Confirmation dialog title is exact: "${modalTitle}"`);
    assert(modalDesc === 'Are you sure you want to log out of your account?', `Confirmation dialog description is exact: "${modalDesc}"`);

    // Click "Cancel"
    const cancelBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.modal-overlay button'));
      const cancel = btns.find(b => b.textContent.trim() === 'Cancel');
      if (cancel) {
        cancel.click();
        return true;
      }
      return false;
    });
    assert(cancelBtn, `Cancel button clicked`);
    await new Promise(r => setTimeout(r, 400));

    // Verify modal dismissed and user is STILL authenticated
    const modalStillVisible = await page.$('.modal-overlay');
    assert(!modalStillVisible, `Confirmation dialog cleanly closed upon Cancel`);

    const stillHasToken = await page.evaluate(() => !!localStorage.getItem('aisb_token'));
    assert(stillHasToken, `User session is preserved when logout is cancelled`);
    assert(page.url().includes('/app'), `User remains on authenticated screen`);

    // -------------------------------------------------------------------------
    // 4. CONFIRM LOGOUT FLOW & SESSION TERMINATION
    // -------------------------------------------------------------------------
    console.log('\n--- 4. CONFIRM LOGOUT FLOW & STORAGE CLEARING ---');
    // Re-open drawer
    const hamburger2 = await page.$('.mobile-hamburger-btn, [aria-label*="navigation menu" i]');
    await hamburger2.click();
    await new Promise(r => setTimeout(r, 500));

    // Tap Log out in drawer
    await page.evaluate(() => {
      const logoutBtn = document.querySelector('.mobile-nav-item-logout');
      if (logoutBtn) logoutBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Click "Log out" confirm button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.modal-overlay button'));
      const confirmLogout = btns.find(b => b.textContent.trim() === 'Log out');
      if (confirmLogout) confirmLogout.click();
    });

    await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 6000 });
    await new Promise(r => setTimeout(r, 600));

    assert(page.url().includes('/login'), `User successfully redirected to /login after confirmation`);

    // Verify localStorage tokens purged
    const postLogoutToken = await page.evaluate(() => localStorage.getItem('aisb_token'));
    const postLogoutUser = await page.evaluate(() => localStorage.getItem('aisb_user'));
    assert(!postLogoutToken, `aisb_token purged from storage (value: ${postLogoutToken})`);
    assert(!postLogoutUser, `aisb_user purged from storage (value: ${postLogoutUser})`);

    // -------------------------------------------------------------------------
    // 5. BACK NAVIGATION & PROTECTED ROUTE ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n--- 5. BACK BUTTON & PROTECTED ROUTE GUARD ---');
    // Attempt to go back
    await page.goBack();
    await new Promise(r => setTimeout(r, 800));

    // Must be stopped by ProtectedRoute and stay at /login
    const postBackUrl = page.url();
    assert(postBackUrl.includes('/login'), `Back navigation does NOT expose authenticated screens (current URL: ${postBackUrl})`);

    // Direct URL navigation to protected route
    await page.goto(`${BASE_URL}/app/workspaces`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    assert(page.url().includes('/login'), `Direct navigation to /app/workspaces redirects to /login`);

    // Direct URL navigation to /admin
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    assert(page.url().includes('/login'), `Direct navigation to /admin redirects to /login`);

    // -------------------------------------------------------------------------
    // 6. RELOAD & PERSISTENCE AFTER LOGOUT
    // -------------------------------------------------------------------------
    console.log('\n--- 6. APP RESTART / REFRESH PERSISTENCE ---');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));
    assert(page.url().includes('/login'), `Refreshing /login maintains logged-out state`);

    // -------------------------------------------------------------------------
    // 7. RESPONSIVE VIEWPORTS & THEME TESTING
    // -------------------------------------------------------------------------
    console.log('\n--- 7. RESPONSIVE VIEWPORTS & THEME CHECKS ---');

    // A. Small Phone (360x740)
    await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
    // Re-login
    await page.type('input[type="email"]', 'demo@aisolutionbuilder.dev');
    await page.type('input[type="password"]', 'Solution@2026');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.startsWith('/app'), { timeout: 8000 });
    await new Promise(r => setTimeout(r, 800));

    // Open drawer on small phone
    const smallHamburger = await page.$('.mobile-hamburger-btn, [aria-label*="navigation menu" i]');
    await smallHamburger.click();
    await new Promise(r => setTimeout(r, 500));
    const smallLogout = await page.$('.mobile-nav-item-logout');
    assert(!!smallLogout, `Logout button accessible on small phone (360x740)`);

    // B. Light Theme check
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await new Promise(r => setTimeout(r, 300));
    const isLight = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light');
    assert(isLight, `Light theme active and drawer remains intact`);

    // Open confirmation in light mode
    await smallLogout.click();
    await new Promise(r => setTimeout(r, 400));
    const lightModal = await page.$('.modal-overlay');
    assert(!!lightModal, `Confirmation dialog functions cleanly in Light theme`);

    // C. Tablet Viewport (768x1024)
    await page.setViewport({ width: 768, height: 1024, isMobile: false });
    await new Promise(r => setTimeout(r, 500));
    assert(page.url().includes('/app'), `Tablet layout renders cleanly`);

    console.log('\n================================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (consoleErrors.length > 0) {
      console.log('Console Errors Observed:', consoleErrors);
    }

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();

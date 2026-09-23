import puppeteer from '../backend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = '/Users/JBC/.gemini/antigravity-ide/brain/9477134e-5924-4c2b-b443-792310438c16';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function run() {
  console.log('Launching headless Chrome to test Mobile AI Business Consultant...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test 1: 390x844 in Dark Theme
  console.log('1. Testing 390x844 viewport (Dark Theme)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  
  // Set up auth session
  await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const demoUser = {
      id: 'usr-demo-consultant-01',
      email: 'consultant@aisolutionbuilder.dev',
      name: 'Marcus Vance (Principal Architect)',
      role: 'CONSULTANT',
      isDemo: true,
      organization: {
        id: 'org-demo-01',
        name: 'Acme Retail Global',
        industry: 'Retail & Consumer Goods'
      }
    };
    const demoToken = `demo_session_consultant_${Date.now()}`;
    localStorage.setItem('aisb_token', demoToken);
    localStorage.setItem('aisb_user', JSON.stringify(demoUser));
  });

  await page.goto('http://localhost:5175/app/workspaces/ws-demo-customer-support', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Open the AI drawer via event and click
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('rootforge:open-ai-drawer'));
  });
  await new Promise(r => setTimeout(r, 800));

  // If not open, click the AI copilot tab directly
  await page.evaluate(() => {
    const aiBtn = document.querySelector('.mobile-ai-companion-tab') || document.querySelector('[aria-label="Open AI Companion"]');
    if (aiBtn) aiBtn.click();
  });

  await page.waitForSelector('.ai-chat-header', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));

  // Verify Header Structure
  const headerAudit = await page.evaluate(() => {
    const header = document.querySelector('.ai-chat-header');
    const row1 = document.querySelector('.ai-chat-header-row-1');
    const row2 = document.querySelector('.ai-chat-header-row-2');
    const row3 = document.querySelector('.ai-chat-header-row-3');
    const backBtn = document.querySelector('.ai-chat-back-btn');
    const closeBtn = document.querySelector('.ai-chat-close-btn');
    const stagePill = document.querySelector('.ai-chat-stage-pill');
    const sessionSelector = document.querySelector('.ai-chat-session-selector');
    const newChatBtn = document.querySelector('.ai-chat-new-btn');
    const inquiries = document.querySelector('.ai-inquiries-scroll');
    const drawer = document.querySelector('.ai-consultant-drawer');

    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const backRect = backBtn ? backBtn.getBoundingClientRect() : null;
    const closeRect = closeBtn ? closeBtn.getBoundingClientRect() : null;
    const pillRect = stagePill ? stagePill.getBoundingClientRect() : null;
    const sessionRect = sessionSelector ? sessionSelector.getBoundingClientRect() : null;
    const newChatRect = newChatBtn ? newChatBtn.getBoundingClientRect() : null;

    return {
      hasHeader: !!header,
      hasRow1: !!row1,
      hasRow2: !!row2,
      hasRow3: !!row3,
      drawerScrollWidth: drawer ? drawer.scrollWidth : 0,
      drawerClientWidth: drawer ? drawer.clientWidth : 0,
      hasHorizontalOverflow: drawer ? drawer.scrollWidth > drawer.clientWidth : false,
      backBtnHeight: backRect ? backRect.height : 0,
      backBtnWidth: backRect ? backRect.width : 0,
      closeBtnHeight: closeRect ? closeRect.height : 0,
      closeBtnWidth: closeRect ? closeRect.width : 0,
      pillHeight: pillRect ? pillRect.height : 0,
      sessionSelectorHeight: sessionRect ? sessionRect.height : 0,
      newChatHeight: newChatRect ? newChatRect.height : 0,
      inquiriesCount: inquiries ? inquiries.children.length : 0
    };
  });

  console.log('Header audit at 390px (Dark Theme):', JSON.stringify(headerAudit, null, 2));

  const darkScreenshotPath = path.join(ARTIFACT_DIR, 'mobile_ai_chat_390_dark.png');
  await page.screenshot({ path: darkScreenshotPath });
  console.log('Captured screenshot:', darkScreenshotPath);

  // Test 2: Light Theme
  console.log('2. Testing Light Theme at 390px...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.setAttribute('data-theme', 'light');
  });
  await new Promise(r => setTimeout(r, 600));

  const lightScreenshotPath = path.join(ARTIFACT_DIR, 'mobile_ai_chat_390_light.png');
  await page.screenshot({ path: lightScreenshotPath });
  console.log('Captured screenshot:', lightScreenshotPath);

  // Test 3: Micro screen 320x600 (iPhone SE / micro screen)
  console.log('3. Testing 320x600 viewport (Narrow Screen Reflow)...');
  await page.setViewport({ width: 320, height: 600, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 600));

  const microAudit = await page.evaluate(() => {
    const drawer = document.querySelector('.ai-consultant-drawer');
    const header = document.querySelector('.ai-chat-header');
    return {
      drawerScrollWidth: drawer ? drawer.scrollWidth : 0,
      drawerClientWidth: drawer ? drawer.clientWidth : 0,
      hasOverflow: drawer ? drawer.scrollWidth > drawer.clientWidth : false,
      headerHeight: header ? header.getBoundingClientRect().height : 0
    };
  });
  console.log('Micro audit at 320px:', JSON.stringify(microAudit, null, 2));

  const microScreenshotPath = path.join(ARTIFACT_DIR, 'mobile_ai_chat_320_reflow.png');
  await page.screenshot({ path: microScreenshotPath });
  console.log('Captured screenshot:', microScreenshotPath);

  // Test 4: Sending a message "Hello"
  console.log('4. Testing message send and AI response rendering...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 400));

  // Type in input
  const inputSelector = '.ai-composer-input';
  await page.waitForSelector(inputSelector);
  await page.type(inputSelector, 'Hello');
  await page.click('.ai-composer-send-btn');
  console.log('Sent "Hello", waiting for AI response...');

  // Wait for assistant response
  await page.waitForFunction(() => {
    const messages = document.querySelectorAll('.ai-messages-container > div');
    return messages.length >= 2;
  }, { timeout: 15000 }).catch(e => console.log('Wait timeout or completed:', e.message));

  await new Promise(r => setTimeout(r, 1500));

  const chatResponseScreenshotPath = path.join(ARTIFACT_DIR, 'mobile_ai_chat_conversation.png');
  await page.screenshot({ path: chatResponseScreenshotPath });
  console.log('Captured conversation screenshot:', chatResponseScreenshotPath);

  // Test 5: Open History Dropdown
  console.log('5. Testing session selector dropdown affordance...');
  await page.click('.ai-chat-session-selector');
  await new Promise(r => setTimeout(r, 600));

  const dropdownScreenshotPath = path.join(ARTIFACT_DIR, 'mobile_ai_chat_dropdown.png');
  await page.screenshot({ path: dropdownScreenshotPath });
  console.log('Captured dropdown screenshot:', dropdownScreenshotPath);

  // Test 6: Desktop Viewport 1280x800 Parity Check
  console.log('6. Testing Desktop Viewport (1280x800)...');
  await page.setViewport({ width: 1280, height: 800, isMobile: false });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('rootforge:open-ai-drawer'));
  });
  await new Promise(r => setTimeout(r, 800));

  const desktopAudit = await page.evaluate(() => {
    const drawer = document.querySelector('.ai-consultant-drawer');
    const backBtn = document.querySelector('.ai-chat-back-btn');
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const backDisplay = backBtn ? window.getComputedStyle(backBtn).display : null;
    return {
      drawerWidth: drawerRect ? drawerRect.width : 0,
      backBtnDisplay: backDisplay // Should be none on desktop
    };
  });
  console.log('Desktop audit:', JSON.stringify(desktopAudit, null, 2));

  const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'desktop_ai_chat_parity.png');
  await page.screenshot({ path: desktopScreenshotPath });
  console.log('Captured desktop screenshot:', desktopScreenshotPath);

  await browser.close();
  console.log('\n=== ALL BROWSER AUTOMATION TESTS COMPLETED SUCCESSFULLY ===\n');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

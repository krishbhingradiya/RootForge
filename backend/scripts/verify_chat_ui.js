import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = '/Users/JBC/.gemini/antigravity-ide/brain/9477134e-5924-4c2b-b443-792310438c16';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  console.log('🚀 Starting Puppeteer browser visual verification...');

  // 1. Authenticate via backend API to obtain valid token
  const authRes = await fetch('http://localhost:5005/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@aisolutionbuilder.dev', password: 'Solution@2026' })
  });
  const authData = await authRes.json();
  const token = authData.token;
  const user = authData.user;
  console.log(`🔑 Authenticated as: ${user.name}`);

  // 2. Fetch active workspaces
  const wsRes = await fetch('http://localhost:5005/api/workspaces', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const wsData = await wsRes.json();
  const targetWs = Array.isArray(wsData) ? wsData[0] : (wsData.workspaces && wsData.workspaces[0]);
  console.log(`🏢 Active workspace: ${targetWs.name} (${targetWs.id})`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();

    // Emulate iPhone 14 / modern mobile viewport (390 x 844)
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

    // Pre-populate authentication in localStorage
    await page.goto('http://localhost:5175/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate((t, u, wsId) => {
      localStorage.setItem('aisb_token', t);
      localStorage.setItem('aisb_user', JSON.stringify(u));
      localStorage.setItem('aisb_active_workspace', wsId);
    }, token, user, targetWs.id);

    // Navigate to workspace overview
    const overviewUrl = `http://localhost:5175/app/workspaces/${targetWs.id}`;
    console.log(`🧭 Navigating to: ${overviewUrl}`);
    await page.goto(overviewUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Open AI Consultant Drawer
    console.log('💬 Opening AI Business Consultant drawer...');
    await page.waitForSelector('.mobile-header-ai-btn, .mobile-ai-companion-tab, .nav-ai-btn, button[aria-label*="AI"]', { timeout: 10000 });
    await page.evaluate(() => {
      const btn = document.querySelector('.mobile-header-ai-btn') ||
                  document.querySelector('.mobile-ai-companion-tab') ||
                  document.querySelector('.nav-ai-btn') ||
                  document.querySelector('button[aria-label*="AI"]') ||
                  document.querySelector('.ai-copilot-trigger');
      if (btn) {
        btn.click();
      }
    });

    await page.waitForSelector('.ai-consultant-drawer', { timeout: 12000 });
    console.log('✅ AI Consultant drawer opened successfully.');

    // Wait for drawer to settle
    await new Promise(r => setTimeout(r, 1200));

    // Click "+ New Chat" to start with a fresh clean session
    console.log('✨ Starting a new chat session for clean testing...');
    await page.click('.ai-chat-new-btn');
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 1: Drawer Header & Initial State (Mobile 390px)
    const shotHeaderPath = path.join(ARTIFACTS_DIR, 'mobile_ai_chat_header_390.png');
    await page.screenshot({ path: shotHeaderPath });
    console.log(`📸 Captured header: ${shotHeaderPath}`);

    // Helper to send query
    const sendQuery = async (queryText) => {
      await page.evaluate((val) => {
        const inp = document.querySelector('.ai-composer-input');
        if (inp) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(inp, val);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, queryText);
      await new Promise(r => setTimeout(r, 200));
      await page.click('.ai-composer-send-btn');
    };

    // Send Test Message 1: "What is our primary business challenge?"
    console.log('✉️ Sending Message 1: "What is our primary business challenge?"');
    await sendQuery('What is our primary business challenge?');

    // Wait briefly and capture thinking state screenshot
    await new Promise(r => setTimeout(r, 350));
    const shotThinkingPath = path.join(ARTIFACTS_DIR, 'mobile_ai_chat_thinking.png');
    await page.screenshot({ path: shotThinkingPath });
    console.log(`📸 Captured thinking indicator: ${shotThinkingPath}`);

    // Wait for assistant response 1 to complete (thinking disappears)
    await page.waitForFunction(() => {
      const msgs = document.querySelectorAll('.ai-message-row-assistant');
      const isThinking = document.querySelector('.ai-thinking-indicator') !== null;
      return msgs.length >= 1 && !isThinking;
    }, { timeout: 35000 });

    await new Promise(r => setTimeout(r, 1200));

    // Screenshot 2: User Bubble vs AI Message Card
    const shotMsg1Path = path.join(ARTIFACTS_DIR, 'mobile_ai_chat_user_vs_ai_bubble.png');
    await page.screenshot({ path: shotMsg1Path });
    console.log(`📸 Captured User bubble vs AI card: ${shotMsg1Path}`);

    // Send Test Message 2: "Explain this in Gujarati and keep it short."
    console.log('✉️ Sending Message 2: "Explain this in Gujarati and keep it short."');
    await sendQuery('Explain this in Gujarati and keep it short.');

    await page.waitForFunction(() => {
      const msgs = document.querySelectorAll('.ai-message-row-assistant');
      const isThinking = document.querySelector('.ai-thinking-indicator') !== null;
      return msgs.length >= 2 && !isThinking;
    }, { timeout: 35000 });

    await new Promise(r => setTimeout(r, 1200));

    // Screenshot 3: Gujarati Short Response
    const shotGujaratiPath = path.join(ARTIFACTS_DIR, 'mobile_ai_chat_gujarati_short.png');
    await page.screenshot({ path: shotGujaratiPath });
    console.log(`📸 Captured Gujarati response: ${shotGujaratiPath}`);

    // Send Test Message 3: "What is today's weather?" (Off-domain boundary refusal)
    console.log('✉️ Sending Message 3: "What is today\'s weather?"');
    await sendQuery("What is today's weather?");

    await page.waitForFunction(() => {
      const msgs = document.querySelectorAll('.ai-message-row-assistant');
      const isThinking = document.querySelector('.ai-thinking-indicator') !== null;
      return msgs.length >= 3 && !isThinking;
    }, { timeout: 25000 });

    await new Promise(r => setTimeout(r, 1200));

    // Screenshot 4: Off-Domain Boundary Interception
    const shotOffDomainPath = path.join(ARTIFACTS_DIR, 'mobile_ai_chat_off_domain_boundary.png');
    await page.screenshot({ path: shotOffDomainPath });
    console.log(`📸 Captured Off-Domain Boundary refusal: ${shotOffDomainPath}`);

    // Test Small Mobile Viewport (320px width - iPhone SE / compact)
    console.log('📱 Testing small mobile viewport (320px)...');
    await page.setViewport({ width: 320, height: 600, deviceScaleFactor: 2, isMobile: true });
    await new Promise(r => setTimeout(r, 800));

    const shot320Path = path.join(ARTIFACTS_DIR, 'mobile_ai_chat_320_compact.png');
    await page.screenshot({ path: shot320Path });
    console.log(`📸 Captured 320px compact layout: ${shot320Path}`);

    // Test Desktop Parity (1280px width)
    console.log('💻 Testing desktop viewport parity (1280px)...');
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await new Promise(r => setTimeout(r, 800));

    const shotDesktopPath = path.join(ARTIFACTS_DIR, 'desktop_ai_chat_full_parity.png');
    await page.screenshot({ path: shotDesktopPath });
    console.log(`📸 Captured Desktop layout parity: ${shotDesktopPath}`);

    console.log('\n🎉 ALL BROWSER VISUAL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});

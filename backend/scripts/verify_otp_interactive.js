import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = '/Users/JBC/.gemini/antigravity-ide/brain/9477134e-5924-4c2b-b443-792310438c16';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function verifyInteractive() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  
  await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle0' });

  // Navigate to verify email with state via history.pushState in app
  await page.evaluate(() => {
    window.history.pushState({ email: 'elena.rostova@enterprise.com', cooldownRemaining: 24 }, '', '/verify-email');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  await new Promise(r => setTimeout(r, 600));

  // Focus first input and type 6 digits
  const firstInput = await page.$('#otp-digit-0');
  if (firstInput) {
    await firstInput.click();
    await page.keyboard.type('8');
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.type('4');
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.type('9');
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.type('2');
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.type('1');
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.type('0');
  }

  await new Promise(r => setTimeout(r, 400));
  const shot = path.join(ARTIFACT_DIR, 'otp_verify_interactive_filled.png');
  await page.screenshot({ path: shot });
  console.log(`📸 Captured interactive: ${shot}`);

  await browser.close();
}

verifyInteractive().catch(console.error);

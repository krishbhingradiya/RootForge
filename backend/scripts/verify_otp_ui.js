import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = '/Users/JBC/.gemini/antigravity-ide/brain/9477134e-5924-4c2b-b443-792310438c16';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function verifyOtpUI() {
  console.log('Launching Chrome to capture VerifyEmailPage responsive screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();

  // Test cases: [name, width, height, theme, state]
  const tests = [
    { name: 'otp_verify_390_dark', width: 390, height: 844, theme: 'dark' },
    { name: 'otp_verify_390_light', width: 390, height: 844, theme: 'light' },
    { name: 'otp_verify_320_compact', width: 320, height: 600, theme: 'dark' },
    { name: 'otp_verify_768_tablet', width: 768, height: 1024, theme: 'dark' },
    { name: 'otp_verify_1280_desktop', width: 1280, height: 800, theme: 'dark' },
  ];

  for (const t of tests) {
    await page.setViewport({ width: t.width, height: t.height, deviceScaleFactor: 2 });
    
    // Navigate to frontend verify-email page
    await page.goto('http://localhost:5175/verify-email', { waitUntil: 'networkidle0' });
    
    // Set theme and test state in localStorage
    await page.evaluate((themeMode) => {
      document.documentElement.setAttribute('data-theme', themeMode);
      localStorage.setItem('aisb_theme', themeMode);
    }, t.theme);

    await new Promise(r => setTimeout(r, 600));

    const shotPath = path.join(ARTIFACT_DIR, `${t.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`📸 Captured: ${shotPath}`);
  }

  // Also capture filled state
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5175/verify-email', { waitUntil: 'networkidle0' });
  
  // Fill the 6 inputs with sample digits
  for (let i = 0; i < 6; i++) {
    const input = await page.$(`#otp-digit-${i}`);
    if (input) {
      await input.type(String(i + 1));
      await new Promise(r => setTimeout(r, 80));
    }
  }

  await new Promise(r => setTimeout(r, 400));
  const filledShotPath = path.join(ARTIFACT_DIR, 'otp_verify_390_filled.png');
  await page.screenshot({ path: filledShotPath });
  console.log(`📸 Captured filled: ${filledShotPath}`);

  await browser.close();
  console.log('✅ UI verification capture complete!');
}

verifyOtpUI().catch(err => {
  console.error('Puppeteer verification error:', err);
  process.exit(1);
});

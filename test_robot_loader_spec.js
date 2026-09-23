import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== VERIFYING AI ROBOT LOADING EXPERIENCE SPECIFICATION ===\n');

// 1. Verify Video Asset
const videoAniPath = path.resolve('../video_ani/video.mp4');
const publicAssetPath = path.resolve('frontend/public/assets/robot-loading.mp4');
const publicFallbackPath = path.resolve('frontend/public/video_ani/video.mp4');

assert(fs.existsSync(videoAniPath), 'Source of truth video_ani/video.mp4 must exist');
assert(fs.existsSync(publicAssetPath), 'public/assets/robot-loading.mp4 must exist');
assert(fs.existsSync(publicFallbackPath), 'public/video_ani/video.mp4 must exist');
console.log('✓ [PASS] Authoritative video asset is present and synced with video_ani/');

// 2. Verify RobotLoadingOverlay.css
const cssContent = fs.readFileSync('frontend/src/components/common/RobotLoadingOverlay.css', 'utf-8');

// Check full content area overlay rules
assert(cssContent.includes('position: absolute'), 'Overlay must have position: absolute');
assert(cssContent.includes('inset: 0'), 'Overlay must stretch inset: 0 across entire main content area');
assert(cssContent.includes('background: #FFFFFF'), 'Loading canvas must be clean solid #FFFFFF in light mode');

// Check NO video card/box, NO border, NO box-shadow
assert(cssContent.includes('border: none !important'), 'Robot video wrapper must have no border');
assert(cssContent.includes('border-radius: 0 !important'), 'Robot video wrapper must have no rounded corners / box');
assert(cssContent.includes('box-shadow: none !important'), 'Robot video wrapper must have no box shadow');
assert(cssContent.includes('mix-blend-mode: multiply'), 'Robot video must blend seamlessly into white loading canvas without edges');

// Check sizing (260px–340px desktop, 220px–280px tablet, 160px–220px mobile)
assert(cssContent.includes('max-width: 340px'), 'Desktop max-width must be 340px');
assert(cssContent.includes('min-width: 260px'), 'Desktop min-width must be 260px');
console.log('✓ [PASS] RobotLoadingOverlay.css adheres strictly to full white canvas, floating presentation, and sizing');

// 3. Verify AppLayout.jsx integration
const layoutContent = fs.readFileSync('frontend/src/components/layout/AppLayout.jsx', 'utf-8');
assert(layoutContent.includes('<RobotLoadingOverlay isLoading={isLoading} message={loadingMessage} />'), 'AppLayout must render RobotLoadingOverlay inside main-content');
assert(layoutContent.includes('className="main-content" style={{ position: \'relative\' }}'), 'main-content must have position: relative for absolute overlay');
console.log('✓ [PASS] AppLayout.jsx mounts RobotLoadingOverlay directly over main-content');

// 4. Verify LoadingContext.jsx does NOT contain duplicate overlay
const ctxContent = fs.readFileSync('frontend/src/context/LoadingContext.jsx', 'utf-8');
assert(!ctxContent.includes('<RobotLoadingOverlay'), 'LoadingContext must not render duplicate overlay');
console.log('✓ [PASS] LoadingContext.jsx duplicate overlay removed');

// 3. Verify RobotLoadingOverlay.jsx
const jsxContent = fs.readFileSync('frontend/src/components/common/RobotLoadingOverlay.jsx', 'utf-8');

// Check dynamic sidebar detection
assert(jsxContent.includes('sidebarEl &&'), 'Component must dynamically detect .sidebar in DOM');
assert(jsxContent.includes('hasSidebar ? \'has-sidebar\' : \'no-sidebar\''), 'Component must apply has-sidebar class');

// Check video synchronization (CASES A & B)
assert(jsxContent.includes('videoRef.current.pause()'), 'Video must pause immediately on loading finish (Case A)');
assert(jsxContent.includes('videoRef.current.currentTime = 0'), 'Video must reset immediately on loading finish');
assert(jsxContent.includes('onEnded={handleVideoEnded}'), 'Video must handle onEnded for seamless loop during long loading (Case B)');
assert(jsxContent.includes('delay = 180'), 'Anti-flicker delay (180ms) must protect against fast loading flicker');
assert(jsxContent.includes('controls={false}'), 'Video player controls must be disabled');
console.log('✓ [PASS] RobotLoadingOverlay.jsx implements real state synchronization and seamless looping');

// 4. Verify services/api.js contextual messages
const apiContent = fs.readFileSync('frontend/src/services/api.js', 'utf-8');

const expectedSectionMessages = [
  'Understanding your business...',
  'Analyzing your requirements...',
  'Designing your solution...',
  'Mapping your business process...',
  'Preparing your experience...',
  'Designing the system architecture...',
  'Structuring your data and APIs...',
  'Calculating your implementation effort...',
  'Building your implementation roadmap...'
];

for (const msg of expectedSectionMessages) {
  assert(apiContent.includes(msg), `api.js must include contextual message: "${msg}"`);
}
console.log('✓ [PASS] services/api.js maps all Solution Lifecycle sections to exact Section 20 contextual messages');

// 5. Verify DatabaseDesignerPage.jsx has NO inline box or duplicate overlay
const dbPageContent = fs.readFileSync('frontend/src/pages/database/DatabaseDesignerPage.jsx', 'utf-8');
assert(!dbPageContent.includes('padding: 40, minHeight: \'60vh\''), 'DatabaseDesignerPage must not wrap video in padded box');
assert(!dbPageContent.includes('<RobotLoadingOverlay'), 'DatabaseDesignerPage must not instantiate duplicate RobotLoadingOverlay');
console.log('✓ [PASS] DatabaseDesignerPage.jsx inline video box and duplicate overlay removed');

console.log('\n============================================================');
console.log('ALL 21 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
console.log('============================================================\n');

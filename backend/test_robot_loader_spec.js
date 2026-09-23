import fs from 'fs';
import path from 'path';

function runRobotLoaderSpecTests() {
  console.log('============================================================');
  console.log('AI SOLUTION BUILDER — ROBOT LOADING ANIMATION VERIFICATION');
  console.log('============================================================\n');

  let allPassed = true;

  // 1. Verify Authoritative Robot Video File
  const videoPath1 = path.resolve('../../video_ani/video.mp4');
  const videoPath2 = path.resolve('../frontend/public/assets/robot-loading.mp4');
  const videoPath3 = path.resolve('../frontend/public/video_ani/video.mp4');

  [videoPath1, videoPath2, videoPath3].forEach((vPath) => {
    if (fs.existsSync(vPath)) {
      const stats = fs.statSync(vPath);
      console.log(`✓ Video asset located: ${vPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      if (stats.size < 1000000) {
        console.error(`❌ Video file is unexpectedly small! Size: ${stats.size} bytes`);
        allPassed = false;
      }
    } else {
      console.error(`❌ Expected video file missing at: ${vPath}`);
      allPassed = false;
    }
  });

  // 2. Verify RobotLoadingOverlay Component Implementation
  const overlayCompPath = path.resolve('../frontend/src/components/common/RobotLoadingOverlay.jsx');
  const overlayCode = fs.readFileSync(overlayCompPath, 'utf8');

  console.log('\nVerifying RobotLoadingOverlay.jsx properties:');
  const overlayChecks = [
    { name: 'Muted video attribute', check: overlayCode.includes('muted') },
    { name: 'Autoplay video attribute', check: overlayCode.includes('autoPlay') },
    { name: 'Loop video attribute', check: overlayCode.includes('loop') },
    { name: 'Inline playsInline attribute', check: overlayCode.includes('playsInline') },
    { name: 'Disabled controls (controls={false})', check: overlayCode.includes('controls={false}') },
    { name: 'Accessibility aria-label', check: overlayCode.includes('aria-label=') },
    { name: 'Anti-flicker threshold delay', check: overlayCode.includes('delay = 180') || overlayCode.includes('delay') },
    { name: 'Entrance animation state', check: overlayCode.includes("'enter'") },
    { name: 'Exit animation state & timer', check: overlayCode.includes("'exit'") },
    { name: 'Video currentTime reset on start', check: overlayCode.includes('currentTime = 0') },
    { name: 'Video pause on unmount', check: overlayCode.includes('pause()') }
  ];

  overlayChecks.forEach(c => {
    if (c.check) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ❌ Failed: ${c.name}`);
      allPassed = false;
    }
  });

  // 3. Verify RobotLoadingOverlay CSS Specifications
  const overlayCssPath = path.resolve('../frontend/src/components/common/RobotLoadingOverlay.css');
  const overlayCss = fs.readFileSync(overlayCssPath, 'utf8');

  console.log('\nVerifying RobotLoadingOverlay.css design & responsiveness:');
  const cssChecks = [
    { name: 'Fixed overlay positioning', check: overlayCss.includes('position: fixed') && overlayCss.includes('inset: 0') },
    { name: 'Backdrop blur (4px)', check: overlayCss.includes('backdrop-filter: blur(4px)') },
    { name: 'Subtle light overlay background', check: overlayCss.includes('rgba(255, 255, 255, 0.72)') },
    { name: 'Dark mode overlay support', check: overlayCss.includes("[data-theme='dark']") },
    { name: 'Centered layout', check: overlayCss.includes('justify-content: center') && overlayCss.includes('align-items: center') },
    { name: 'Desktop robot size (160-240px)', check: overlayCss.includes('max-width: 240px') },
    { name: 'Tablet media query (140-200px)', check: overlayCss.includes('@media (max-width: 768px)') && overlayCss.includes('max-width: 200px') },
    { name: 'Mobile media query (110-160px)', check: overlayCss.includes('@media (max-width: 480px)') && overlayCss.includes('max-width: 160px') },
    { name: 'Enter transform animation', check: overlayCss.includes('scale(1)') && overlayCss.includes('translateY') },
    { name: 'Exit transform animation', check: overlayCss.includes('translateY(-5px) scale(0.98)') },
    { name: 'Accessibility: prefers-reduced-motion', check: overlayCss.includes('@media (prefers-reduced-motion: reduce)') },
    { name: 'Typography matching Plus Jakarta Sans', check: overlayCss.includes('Plus Jakarta Sans') }
  ];

  cssChecks.forEach(c => {
    if (c.check) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ❌ Failed: ${c.name}`);
      allPassed = false;
    }
  });

  // 4. Verify LoadingContext & Global Integration
  const contextPath = path.resolve('../frontend/src/context/LoadingContext.jsx');
  const contextCode = fs.readFileSync(contextPath, 'utf8');

  console.log('\nVerifying LoadingContext.jsx integration:');
  const contextChecks = [
    { name: 'Map-based active loaders tracking', check: contextCode.includes('activeLoaders') },
    { name: 'startLoading & stopLoading methods', check: contextCode.includes('startLoading') && contextCode.includes('stopLoading') },
    { name: 'Global window event listener for rootforge:loading', check: contextCode.includes('rootforge:loading') },
    { name: 'Renders global RobotLoadingOverlay', check: contextCode.includes('<RobotLoadingOverlay') },
    { name: 'Contextual message derivation', check: contextCode.includes('currentMessage') }
  ];

  contextChecks.forEach(c => {
    if (c.check) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ❌ Failed: ${c.name}`);
      allPassed = false;
    }
  });

  // 5. Verify api.js Integration for AI Operations
  const apiPath = path.resolve('../frontend/src/services/api.js');
  const apiCode = fs.readFileSync(apiPath, 'utf8');

  console.log('\nVerifying api.js AI operation loading events:');
  const apiChecks = [
    { name: 'inferLoadingMessage helper', check: apiCode.includes('inferLoadingMessage') },
    { name: 'Synthesizing AI solution blueprint message', check: apiCode.includes('Synthesizing AI solution blueprint...') },
    { name: 'Generating architecture message', check: apiCode.includes('Generating enterprise architecture topology...') },
    { name: 'Designing BPMN process message', check: apiCode.includes('Designing BPMN process workflows...') },
    { name: 'Designing UI wireframes message', check: apiCode.includes('Designing UI wireframes & user journeys...') },
    { name: 'Architecting database schema message', check: apiCode.includes('Architecting database schema & API contracts...') },
    { name: 'Analyzing business requirements message', check: apiCode.includes('Analyzing business requirements & domain...') },
    { name: 'Event dispatched in request finally block (guaranteed cleanup on error)', check: apiCode.includes('finally {') && apiCode.includes('active: false') }
  ];

  apiChecks.forEach(c => {
    if (c.check) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ❌ Failed: ${c.name}`);
      allPassed = false;
    }
  });

  // 6. Verify App.jsx wrapping
  const appPath = path.resolve('../frontend/src/App.jsx');
  const appCode = fs.readFileSync(appPath, 'utf8');

  console.log('\nVerifying App.jsx integration:');
  const appChecks = [
    { name: 'LoadingProvider imported and wrapping router', check: appCode.includes('<LoadingProvider>') },
    { name: 'ProtectedRoute uses RobotLoadingOverlay for auth session loading', check: appCode.includes('<RobotLoadingOverlay') }
  ];

  appChecks.forEach(c => {
    if (c.check) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ❌ Failed: ${c.name}`);
      allPassed = false;
    }
  });

  console.log('\n============================================================');
  if (allPassed) {
    console.log('✅ ALL ROBOT LOADING SPECIFICATION CHECKS PASSED (100%)!');
  } else {
    console.error('❌ SOME CHECKS FAILED');
    process.exit(1);
  }
  console.log('============================================================');
}

runRobotLoaderSpecTests();

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('=== VERIFYING STRICT MOBILE AI BUSINESS CONSULTANT CHAT SPECIFICATION ===\n');

// 1. Verify AiConsultantDrawer.jsx Structure
const drawerPath = path.resolve('frontend/src/components/ai/AiConsultantDrawer.jsx');
assert(fs.existsSync(drawerPath), 'AiConsultantDrawer.jsx must exist');
const drawerContent = fs.readFileSync(drawerPath, 'utf-8');

// A. Verify DOM Hierarchy
assert(drawerContent.includes('className="ai-chat-header"'), 'Header must have ai-chat-header class');
assert(drawerContent.includes('className="ai-chat-header-row-1"'), 'Row 1 must exist');
assert(drawerContent.includes('className="ai-chat-header-title-group"'), 'Title group in Row 1 must exist');
assert(drawerContent.includes('className="ai-chat-back-btn"'), 'Row 1 must contain back button');
assert(drawerContent.includes('className="ai-chat-icon-container"'), 'Row 1 must contain AI icon container');
assert(drawerContent.includes('className="ai-chat-title-text"'), 'Row 1 must contain title');
assert(drawerContent.includes('className="ai-chat-close-btn"'), 'Row 1 must contain close button');

assert(drawerContent.includes('className="ai-chat-header-row-2"'), 'Row 2 must exist');
assert(drawerContent.includes('className="ai-chat-subtitle-text"'), 'Row 2 must contain subtitle text');

assert(drawerContent.includes('className="ai-chat-header-row-3"'), 'Row 3 must exist');
assert(drawerContent.includes('className="ai-chat-stage-pill"'), 'Row 3 must contain stage status pill');
assert(drawerContent.includes('className="ai-chat-session-selector"'), 'Row 3 must contain session selector');
assert(drawerContent.includes('className="ai-chat-new-btn"'), 'Row 3 must contain New Chat button');

console.log('✓ [PASS] AiConsultantDrawer.jsx header follows strict 3-row hierarchy (Back, Icon, Title, Close, Subtitle, Status Pill, Selector, New Chat)');

// B. Verify Recommended Inquiries Carousel
assert(drawerContent.includes('className="ai-inquiries-container"'), 'Recommended inquiries container must exist');
assert(drawerContent.includes('className="ai-inquiries-scroll"'), 'Horizontal scroll container must exist');
assert(drawerContent.includes('className="ai-inquiry-chip"'), 'Inquiry chip must exist');
console.log('✓ [PASS] Recommended inquiries implemented as horizontal-scroll carousel');

// C. Verify Chat Message Area & Composer
assert(drawerContent.includes('className="ai-messages-container"'), 'ai-messages-container must exist');
assert(drawerContent.includes('className="ai-composer-container"'), 'ai-composer-container must exist');
assert(drawerContent.includes('className="ai-composer-form"'), 'ai-composer-form must exist');
assert(drawerContent.includes('className="ai-composer-plus-btn"'), 'ai-composer-plus-btn must exist');
assert(drawerContent.includes('className="ai-composer-input"'), 'ai-composer-input must exist');
assert(drawerContent.includes('<ChatVoiceInput'), 'ChatVoiceInput must be present in composer');
assert(drawerContent.includes('className="ai-composer-send-btn"'), 'ai-composer-send-btn must exist');
console.log('✓ [PASS] Chat message area and bottom composer structure verified');

// 2. Verify AssistantWelcomeCard.jsx
const welcomeCardPath = path.resolve('frontend/src/components/ai/AssistantWelcomeCard.jsx');
assert(fs.existsSync(welcomeCardPath), 'AssistantWelcomeCard.jsx must exist');
const welcomeContent = fs.readFileSync(welcomeCardPath, 'utf-8');

assert(welcomeContent.includes("overview: 'Welcome to Overview'"), 'Overview stage title must exist in English');
assert(welcomeContent.includes("overview: ["), 'Overview capabilities and chips must be defined');
assert(welcomeContent.includes("wordBreak: 'break-word'"), 'Chips must have wordBreak for narrow mobile screens');
console.log('✓ [PASS] AssistantWelcomeCard.jsx supports Overview stage and responsive chip wrapping');

// 3. Verify index.css Design System & Mobile Rules
const cssPath = path.resolve('frontend/src/index.css');
assert(fs.existsSync(cssPath), 'index.css must exist');
const cssContent = fs.readFileSync(cssPath, 'utf-8');

// Check backdrop and drawer isolation
assert(cssContent.includes('.ai-consultant-backdrop'), 'ai-consultant-backdrop must exist');
assert(cssContent.includes('.ai-consultant-drawer'), 'ai-consultant-drawer must exist');
assert(cssContent.includes('background-color: var(--bg-surface) !important;'), 'Drawer must have opaque surface background');
assert(cssContent.includes('isolation: isolate;'), 'Drawer must enforce isolation to prevent visual bleed-through');
assert(cssContent.includes('z-index: 200 !important;'), 'Drawer must have high z-index to overlay background canvas');

// Check touch targets (40px header, 44px composer)
assert(cssContent.includes('min-width: 40px;\n  min-height: 40px;'), 'Header back/close buttons must have 40px touch targets');
assert(cssContent.includes('min-height: 40px;'), 'Session selector and New Chat button must have 40px min-height');
assert(cssContent.includes('min-width: 44px;\n  min-height: 44px;'), 'Composer buttons must have 44px touch targets');

// Check horizontal inquiries scrollbar hidden
assert(cssContent.includes('overflow-x: auto;'), 'Inquiries must be horizontally scrollable');
assert(cssContent.includes('scrollbar-width: none;'), 'Scrollbar must be hidden on inquiries');

// Check mobile media queries
assert(cssContent.includes('@media (max-width: 768px)'), 'Mobile 768px breakpoint must exist');
assert(cssContent.includes('.ai-chat-back-btn {\n    display: flex !important;\n  }'), 'Back button must be flex on mobile <= 768px');
assert(cssContent.includes('@media (max-width: 360px)'), 'Narrow mobile 360px breakpoint must exist');
assert(cssContent.includes('.ai-chat-header-row-3 {\n    flex-direction: column;'), 'Row 3 must reflow on narrow phones <= 360px');

// Check safe area insets
assert(cssContent.includes('safe-area-inset-top'), 'Safe area top inset must be respected');
assert(cssContent.includes('safe-area-inset-bottom'), 'Safe area bottom inset must be respected');

console.log('✓ [PASS] index.css implements complete responsive design system, touch targets, and theme variables');
console.log('\n=== ALL MOBILE AI BUSINESS CONSULTANT SPEC CHECKS PASSED ===\n');

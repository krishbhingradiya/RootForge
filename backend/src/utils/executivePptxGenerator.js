import pptxgen from 'pptxgenjs';
import {
  getLifecycleStageStatus,
  getWorkspaceReadiness,
  getNextRecommendedAction
} from '../services/workspaceLifecycle.service.js';

/**
 * RootForge Executive PowerPoint Presentation Generator
 *
 * Generates an executive-ready, 16:9 widescreen presentation from live workspace data.
 * Adheres strictly to layout boundaries, typographic hierarchy, clean tables,
 * executive card design, and zero raw markdown/JSON artifacts.
 */

// ── COLOR PALETTE DEFINITIONS ────────────────────────────────────────────────
const C = {
  // Dark / Obsidian theme for Cover
  BG_DARK: '0B0F17',
  CARD_DARK: '141A26',
  BORDER_DARK: '243042',
  TEXT_DARK_WHITE: 'FFFFFF',
  TEXT_DARK_MUTED: '94A3B8',

  // Light / Executive Theme for Content Slides
  BG_LIGHT: 'F8FAFC',
  CARD_LIGHT: 'FFFFFF',
  CARD_MUTED: 'F1F5F9',
  BORDER_LIGHT: 'CBD5E1',
  BORDER_SUBTLE: 'E2E8F0',
  TEXT_NAVY: '0F172A',
  TEXT_BODY: '334155',
  TEXT_MUTED: '64748B',

  // Accents & Signals
  ACCENT_AMBER: 'D97706',
  ACCENT_GOLD: 'B45309',
  ACCENT_BLUE: '2563EB',
  ACCENT_GREEN: '059669',
  ACCENT_RED: 'DC2626',
  STATUS_GREEN_BG: 'ECFDF5',
  STATUS_AMBER_BG: 'FFFBEB',
  STATUS_BLUE_BG: 'EFF6FF',
  STATUS_RED_BG: 'FEF2F2',

  // Tables
  TABLE_HDR_BG: '0F172A',
  TABLE_HDR_TEXT: 'FFFFFF',
  TABLE_ROW_ALT: 'F8FAFC'
};

// ── TEXT SANITIZATION & FITTING HELPERS ──────────────────────────────────────
function toCleanText(val) {
  if (val === null || val === undefined) return '';
  let str = '';
  if (typeof val === 'string') {
    str = val;
  } else if (typeof val === 'number') {
    str = String(val);
  } else if (typeof val === 'object') {
    str = String(val.title || val.name || val.text || val.description || val.label || val.goal || val.metric || '');
  } else {
    str = String(val);
  }

  // Strip raw Markdown syntax
  return str
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function truncateText(text, maxChars = 180) {
  const clean = toCleanText(text);
  if (clean.length <= maxChars) return clean;
  const sub = clean.substring(0, maxChars);
  const lastSpace = sub.lastIndexOf(' ');
  return (lastSpace > 30 ? sub.substring(0, lastSpace) : sub).trim() + '...';
}

function summarizeBullets(itemsOrText, maxCount = 4, maxCharsPerItem = 120) {
  let list = [];
  if (Array.isArray(itemsOrText)) {
    list = itemsOrText.map(toCleanText).filter(Boolean);
  } else if (typeof itemsOrText === 'string') {
    list = itemsOrText
      .split(/[.\n;]+/)
      .map(s => toCleanText(s))
      .filter(s => s.length > 5);
  }

  if (list.length === 0) return ['Key transformation milestone documented'];
  return list.slice(0, maxCount).map(s => truncateText(s, maxCharsPerItem));
}

// ── MAIN PRESENTATION GENERATOR ──────────────────────────────────────────────
export async function generateExecutivePptx(synthesizedData) {
  const { metadata, sections, rawBundle } = synthesizedData;
  const {
    executiveSummary,
    businessObjectives,
    businessContext,
    proposedSolution,
    enterpriseArchitecture,
    businessProcess,
    userExperience,
    dataAndApi,
    roadmap,
    riskRegister,
    investment,
    governance,
    expectedOutcomes
  } = sections;

  // Single source of truth: canonical lifecycle states & dynamic readiness
  const workspace = rawBundle?.workspace || null;
  const stages = workspace ? getLifecycleStageStatus(workspace) : {};
  const readiness = workspace ? getWorkspaceReadiness(workspace, stages) : {};
  const nextAction = workspace ? getNextRecommendedAction(workspace, stages) : 'Review Transformation Deliverables';

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';

  const TOTAL_SLIDES = 14;

  // Helper: Standard Slide Header for Content Slides
  function addSlideHeader(slide, title, category = 'ROOTFORGE EXECUTIVE BLUEPRINT', subtitle = '') {
    slide.addText(toCleanText(category).toUpperCase(), {
      x: 0.8, y: 0.42, w: 9.0, h: 0.24,
      fontSize: 9.5, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial',
      charSpacing: 2
    });
    slide.addText(toCleanText(title), {
      x: 0.8, y: 0.68, w: 10.5, h: 0.45,
      fontSize: 20, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
    });
    if (subtitle) {
      slide.addText(toCleanText(subtitle), {
        x: 0.8, y: 1.14, w: 11.0, h: 0.25,
        fontSize: 10.5, color: C.TEXT_MUTED, fontFace: 'Arial'
      });
    }
    slide.addShape(pres.ShapeType.line, {
      x: 0.8, y: subtitle ? 1.42 : 1.25, w: 11.73, h: 0,
      line: { color: C.BORDER_SUBTLE, width: 1 }
    });
  }

  // Helper: Standard Slide Footer for Content Slides
  function addSlideFooter(slide, slideNum) {
    slide.addShape(pres.ShapeType.line, {
      x: 0.8, y: 6.82, w: 11.73, h: 0,
      line: { color: C.BORDER_SUBTLE, width: 1 }
    });
    slide.addText(`RootForge Enterprise Transformation  |  ${toCleanText(metadata.workspaceName)}`, {
      x: 0.8, y: 6.9, w: 5.8, h: 0.3,
      fontSize: 9, bold: true, color: C.TEXT_MUTED, fontFace: 'Arial'
    });
    slide.addText('Confidential & Proprietary — Executive Blueprint', {
      x: 6.6, y: 6.9, w: 3.8, h: 0.3,
      fontSize: 9, color: C.TEXT_MUTED, fontFace: 'Arial', align: 'center'
    });
    slide.addText(`Slide ${slideNum} of ${TOTAL_SLIDES}`, {
      x: 10.6, y: 6.9, w: 1.93, h: 0.3,
      fontSize: 9, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial', align: 'right'
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 1: Title & Executive Cover (Obsidian Theme)
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_DARK };

    slide.addText('✦ ROOTFORGE ENTERPRISE TRANSFORMATION', {
      x: 1.0, y: 1.6, w: 10.0, h: 0.35,
      fontSize: 11, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial',
      charSpacing: 2
    });

    const displayTitle = toCleanText(proposedSolution.title || metadata.workspaceName);
    slide.addText(displayTitle, {
      x: 1.0, y: 2.05, w: 11.2, h: 1.3,
      fontSize: displayTitle.length > 40 ? 26 : 30,
      bold: true, color: C.TEXT_DARK_WHITE, fontFace: 'Arial', wrap: true
    });

    slide.addText('Executive Solution Architecture & Transformation Blueprint', {
      x: 1.0, y: 3.4, w: 11.0, h: 0.45,
      fontSize: 15, color: C.TEXT_DARK_MUTED, fontFace: 'Arial'
    });

    // Metadata Card
    slide.addShape(pres.ShapeType.roundRect, {
      x: 1.0, y: 4.6, w: 11.33, h: 1.45,
      fill: { color: C.CARD_DARK }, line: { color: C.BORDER_DARK, width: 1 }, rectRadius: 0.08
    });

    const metaCols = [
      { label: 'CLIENT WORKSPACE', val: toCleanText(metadata.workspaceName) },
      { label: 'INDUSTRY DOMAIN', val: toCleanText(metadata.industry) },
      { label: 'DOCUMENT VERSION', val: toCleanText(metadata.exportVersion) },
      { label: 'GENERATED DATE', val: new Date(metadata.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
    ];

    metaCols.forEach((col, idx) => {
      const xPos = 1.3 + (idx * 2.8);
      slide.addText(col.label, {
        x: xPos, y: 4.82, w: 2.6, h: 0.25,
        fontSize: 8.5, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial', charSpacing: 1
      });
      slide.addText(truncateText(col.val, 45), {
        x: xPos, y: 5.12, w: 2.6, h: 0.7,
        fontSize: 12, bold: true, color: C.TEXT_DARK_WHITE, fontFace: 'Arial', wrap: true
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 2: Executive Summary & Strategic Vision
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Executive Summary & Strategic Vision', 'Context & Synthesis', 'High-level synthesis of business imperative, solution direction, and target ROI');

    const summaryCards = [
      { title: 'Business Situation', text: truncateText(executiveSummary.businessSituation, 200), color: C.ACCENT_BLUE },
      { title: 'Core Challenge', text: truncateText(executiveSummary.currentProblem, 200), color: C.ACCENT_RED },
      { title: 'Proposed Solution', text: truncateText(executiveSummary.proposedTransformation, 200), color: C.ACCENT_GREEN },
      { title: 'Expected Value', text: truncateText(executiveSummary.majorExpectedOutcomes, 200), color: C.ACCENT_AMBER }
    ];

    summaryCards.forEach((c, idx) => {
      const xPos = 0.8 + (idx * 2.95);
      slide.addShape(pres.ShapeType.roundRect, {
        x: xPos, y: 1.6, w: 2.83, h: 4.1,
        fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
      });
      slide.addShape(pres.ShapeType.rect, {
        x: xPos, y: 1.6, w: 2.83, h: 0.08,
        fill: { color: c.color }
      });
      slide.addText(c.title, {
        x: xPos + 0.18, y: 1.85, w: 2.47, h: 0.35,
        fontSize: 13, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
      });
      slide.addText(c.text, {
        x: xPos + 0.18, y: 2.25, w: 2.47, h: 3.25,
        fontSize: 11, color: C.TEXT_BODY, fontFace: 'Arial', wrap: true, lineSpacing: 16
      });
    });

    // Stakeholders banner
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 5.9, w: 11.73, h: 0.75,
      fill: { color: C.CARD_MUTED }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.06
    });
    slide.addText('PRIMARY BENEFICIARIES & STAKEHOLDERS', {
      x: 1.0, y: 5.98, w: 3.5, h: 0.22,
      fontSize: 8.5, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
    });
    slide.addText(truncateText(businessContext.targetBeneficiaries, 140), {
      x: 1.0, y: 6.22, w: 11.3, h: 0.36,
      fontSize: 10.5, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial', wrap: true
    });

    addSlideFooter(slide, 2);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 3: Current State & Operational Friction
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Current State & Identified Operational Friction', 'Diagnostic', 'Root cause analysis of baseline friction, bottlenecks, and manual overhead');

    // Left Box: Current State
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 1.6, w: 5.7, h: 3.8,
      fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    slide.addText('CURRENT STATE BASELINE', {
      x: 1.05, y: 1.8, w: 5.2, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
    });
    slide.addText('Operational Constraints & Diagnostic Findings', {
      x: 1.05, y: 2.1, w: 5.2, h: 0.35,
      fontSize: 13, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
    });
    const currentBullets = summarizeBullets(businessContext.currentState, 4, 110).map(text => ({
      text, options: { fontSize: 11, color: C.TEXT_BODY, bullet: true, lineSpacing: 18 }
    }));
    slide.addText(currentBullets, {
      x: 1.05, y: 2.55, w: 5.2, h: 2.6
    });

    // Right Box: Identified Pain Points
    slide.addShape(pres.ShapeType.roundRect, {
      x: 6.83, y: 1.6, w: 5.7, h: 3.8,
      fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    slide.addText('OPERATIONAL PAIN POINTS', {
      x: 7.08, y: 1.8, w: 5.2, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_RED, fontFace: 'Arial'
    });
    slide.addText('Friction Factors & Business Impact', {
      x: 7.08, y: 2.1, w: 5.2, h: 0.35,
      fontSize: 13, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
    });
    const painBullets = summarizeBullets(businessContext.painPoints, 4, 110).map(text => ({
      text, options: { fontSize: 11, color: C.TEXT_BODY, bullet: true, lineSpacing: 18 }
    }));
    slide.addText(painBullets, {
      x: 7.08, y: 2.55, w: 5.2, h: 2.6
    });

    // Bottom Transformation Progression Arrow
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 5.6, w: 11.73, h: 1.0,
      fill: { color: C.CARD_MUTED }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    const stepStages = [
      { label: '1. CURRENT STATE', desc: 'Siloed data & manual coordination' },
      { label: '2. TRANSFORMATION', desc: 'RootForge modular architecture & APIs' },
      { label: '3. TARGET STATE', desc: 'Automated, real-time & traceable ecosystem' }
    ];
    stepStages.forEach((st, idx) => {
      const xPos = 1.0 + (idx * 3.9);
      slide.addText(st.label, {
        x: xPos, y: 5.72, w: 3.6, h: 0.25,
        fontSize: 9.5, bold: true, color: idx === 1 ? C.ACCENT_AMBER : C.TEXT_NAVY, fontFace: 'Arial'
      });
      slide.addText(st.desc, {
        x: xPos, y: 6.0, w: 3.6, h: 0.45,
        fontSize: 10, color: C.TEXT_MUTED, fontFace: 'Arial', wrap: true
      });
    });

    addSlideFooter(slide, 3);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 4: Strategic Objectives & Measurable KPIs
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Strategic Objectives & Measurable KPIs', 'Value Architecture', 'Target measurable outcomes against current operational benchmarks');

    // Top Card: Objectives
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 1.6, w: 11.73, h: 1.6,
      fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    slide.addText('CORE STRATEGIC OBJECTIVES', {
      x: 1.05, y: 1.78, w: 11.2, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial', charSpacing: 1
    });
    const objBullets = summarizeBullets(businessObjectives.objectives, 3, 130).map(text => ({
      text, options: { fontSize: 11, color: C.TEXT_NAVY, bullet: true, lineSpacing: 16 }
    }));
    slide.addText(objBullets, {
      x: 1.05, y: 2.08, w: 11.2, h: 0.95
    });

    // Bottom Table: KPIs
    const kpiRows = [
      [
        { text: 'KEY PERFORMANCE INDICATOR', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 10 } },
        { text: 'CURRENT STATE', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 10 } },
        { text: 'TARGET STATE', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 10 } },
        { text: 'EXPECTED BUSINESS IMPACT', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 10 } }
      ]
    ];

    const kpisList = (businessObjectives.kpis || []).slice(0, 4);
    kpisList.forEach((k, idx) => {
      const isAlt = idx % 2 === 1;
      const rowFill = isAlt ? C.TABLE_ROW_ALT : C.CARD_LIGHT;
      kpiRows.push([
        { text: toCleanText(k.metric || k.name || 'Core Performance Metric'), options: { bold: true, color: C.TEXT_NAVY, fill: rowFill, fontSize: 10 } },
        { text: toCleanText(k.currentState || 'Manual baseline'), options: { color: C.TEXT_MUTED, fill: rowFill, fontSize: 10 } },
        { text: toCleanText(k.targetState || 'Automated target'), options: { bold: true, color: C.ACCENT_GREEN, fill: rowFill, fontSize: 10 } },
        { text: truncateText(k.businessImpact || 'Measurable efficiency gains', 90), options: { color: C.TEXT_BODY, fill: rowFill, fontSize: 10 } }
      ]);
    });

    slide.addTable(kpiRows, {
      x: 0.8, y: 3.45, w: 11.73, h: 3.15,
      colW: [3.2, 2.7, 2.7, 3.13],
      border: { pt: 0.5, color: C.BORDER_SUBTLE }
    });

    addSlideFooter(slide, 4);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 5: Solution Blueprint & Layered Topology
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Proposed Solution Blueprint & Value Architecture', 'Target Solution', 'Architectural layering from customer engagement to backend persistence');

    // Left Column: Solution Vision & Value
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 1.6, w: 5.5, h: 5.0,
      fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    slide.addText('PROPOSED TRANSFORMATION BLUEPRINT', {
      x: 1.05, y: 1.82, w: 5.0, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
    });
    slide.addText(toCleanText(proposedSolution.title), {
      x: 1.05, y: 2.12, w: 5.0, h: 0.5,
      fontSize: 15, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial', wrap: true
    });
    slide.addText(truncateText(proposedSolution.summary, 220), {
      x: 1.05, y: 2.7, w: 5.0, h: 1.6,
      fontSize: 11, color: C.TEXT_BODY, fontFace: 'Arial', wrap: true, lineSpacing: 16
    });
    slide.addText('CORE VALUE PROPOSITION', {
      x: 1.05, y: 4.45, w: 5.0, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_GREEN, fontFace: 'Arial'
    });
    slide.addText(truncateText(proposedSolution.businessValue, 180), {
      x: 1.05, y: 4.75, w: 5.0, h: 1.6,
      fontSize: 11, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial', wrap: true, lineSpacing: 16
    });

    // Right Column: 5-Layer Stack Architecture
    const layers = [
      { num: '1', name: 'User Experience Channels', desc: 'Web Client, Mobile Portal, Staff Dashboard', icon: '💻', color: C.ACCENT_BLUE },
      { num: '2', name: 'API Gateway & Security Ingress', desc: 'TLS Termination, JWT Auth, Rate Limiting', icon: '🛡️', color: C.ACCENT_AMBER },
      { num: '3', name: 'Workflow & Decision Engine', desc: 'Domain Microservices, Business Rules, AI Triage', icon: '⚙️', color: C.ACCENT_GREEN },
      { num: '4', name: 'Enterprise Persistence Layer', desc: 'Relational ACID Database, In-Memory Caching', icon: '🗄️', color: '7C3AED' },
      { num: '5', name: 'Core & Legacy Integrations', desc: 'Enterprise Connectors, Webhooks, Message Bus', icon: '🔌', color: 'DB2777' }
    ];

    layers.forEach((lyr, idx) => {
      const yPos = 1.6 + (idx * 1.02);
      slide.addShape(pres.ShapeType.roundRect, {
        x: 6.6, y: yPos, w: 5.93, h: 0.9,
        fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
      });
      slide.addShape(pres.ShapeType.rect, {
        x: 6.6, y: yPos, w: 0.12, h: 0.9,
        fill: { color: lyr.color }
      });
      slide.addText(`${lyr.icon}  Layer ${lyr.num}: ${lyr.name}`, {
        x: 6.9, y: yPos + 0.12, w: 5.4, h: 0.3,
        fontSize: 11.5, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
      });
      slide.addText(lyr.desc, {
        x: 6.9, y: yPos + 0.42, w: 5.4, h: 0.38,
        fontSize: 10, color: C.TEXT_MUTED, fontFace: 'Arial', wrap: true
      });
    });

    addSlideFooter(slide, 5);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 6: Enterprise Architecture Topology
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'End-to-End Enterprise Architecture Topology', 'Systems Design', 'Component distribution across compute tiers, gateways, and data stores');

    // Use actual architecture nodes from workspace
    const archNodes = enterpriseArchitecture.nodes || [];
    const clientNodes = archNodes.filter(n => (n.tier || '').toLowerCase().includes('client') || n.type === 'CLIENT');
    const gatewayNodes = archNodes.filter(n => (n.tier || '').toLowerCase().includes('gateway') || n.type === 'GATEWAY');
    const serviceNodes = archNodes.filter(n => (n.tier || '').toLowerCase().includes('service') || (n.tier || '').toLowerCase().includes('application') || n.type === 'SERVICE' || n.type === 'AI');
    const dataNodes = archNodes.filter(n => (n.tier || '').toLowerCase().includes('persist') || (n.tier || '').toLowerCase().includes('data') || n.type === 'DATABASE');
    const integNodes = archNodes.filter(n => (n.tier || '').toLowerCase().includes('integ') || n.type === 'INTEGRATION');

    const archTiers = [
      {
        tier: 'CLIENT LAYER',
        color: C.ACCENT_BLUE,
        items: clientNodes.length > 0 ? clientNodes.map(n => n.label) : ['Responsive Web Portal', 'Admin Telemetry Dashboard']
      },
      {
        tier: 'API GATEWAY & INGRESS',
        color: C.ACCENT_AMBER,
        items: gatewayNodes.length > 0 ? gatewayNodes.map(n => n.label) : ['Zero-Trust API Gateway', 'OAuth2 / JWT Token Validator']
      },
      {
        tier: 'APPLICATION MICROSERVICES',
        color: C.ACCENT_GREEN,
        items: serviceNodes.length > 0 ? serviceNodes.map(n => n.label) : ['Core Domain Service', 'AI Workflow Orchestration Engine']
      },
      {
        tier: 'PERSISTENCE & STORAGE',
        color: '7C3AED',
        items: dataNodes.length > 0 ? dataNodes.map(n => n.label) : ['Relational Database Cluster', 'In-Memory Cache (Redis)']
      },
      {
        tier: 'ENTERPRISE INTEGRATIONS',
        color: 'DB2777',
        items: integNodes.length > 0 ? integNodes.map(n => n.label) : ['Enterprise Core System Adapter', 'Notification & Messaging Webhook']
      }
    ];

    archTiers.forEach((t, idx) => {
      const yPos = 1.6 + (idx * 1.02);
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.8, y: yPos, w: 11.73, h: 0.9,
        fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
      });
      slide.addShape(pres.ShapeType.rect, {
        x: 0.8, y: yPos, w: 0.15, h: 0.9,
        fill: { color: t.color }
      });
      slide.addText(t.tier, {
        x: 1.15, y: yPos + 0.15, w: 3.2, h: 0.3,
        fontSize: 10.5, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
      });
      slide.addText(t.items.slice(0, 3).join('   •   '), {
        x: 4.4, y: yPos + 0.15, w: 7.9, h: 0.6,
        fontSize: 10.5, color: C.TEXT_BODY, fontFace: 'Arial', wrap: true
      });
    });

    addSlideFooter(slide, 6);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 7: End-to-End Business Process Flow
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Target Business Process & Automated Workflow', 'Operational Workflow', 'Sequential orchestration of operational handoffs, automation, and decision points');

    const steps = (businessProcess.steps || []).slice(0, 5);
    const stepCount = steps.length > 0 ? steps.length : 4;
    const cardWidth = Math.min(2.2, (11.73 - (0.2 * (stepCount - 1))) / stepCount);

    steps.forEach((s, idx) => {
      const xPos = 0.8 + (idx * (cardWidth + 0.18));
      slide.addShape(pres.ShapeType.roundRect, {
        x: xPos, y: 1.8, w: cardWidth, h: 4.6,
        fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
      });

      // Step Number Badge
      slide.addShape(pres.ShapeType.ellipse, {
        x: xPos + 0.2, y: 2.0, w: 0.45, h: 0.45,
        fill: { color: C.ACCENT_AMBER }
      });
      slide.addText(String(s.order || idx + 1), {
        x: xPos + 0.2, y: 2.0, w: 0.45, h: 0.45,
        fontSize: 12, bold: true, color: C.TEXT_DARK_WHITE, align: 'center', fontFace: 'Arial'
      });

      slide.addText(truncateText(s.name, 35), {
        x: xPos + 0.2, y: 2.6, w: cardWidth - 0.4, h: 0.6,
        fontSize: 11.5, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial', wrap: true
      });

      slide.addText(`ACTOR:\n${toCleanText(s.actor || 'System')}`, {
        x: xPos + 0.2, y: 3.3, w: cardWidth - 0.4, h: 0.5,
        fontSize: 9, bold: true, color: C.ACCENT_GOLD, fontFace: 'Arial'
      });

      slide.addText(truncateText(s.description, 140), {
        x: xPos + 0.2, y: 3.9, w: cardWidth - 0.4, h: 2.3,
        fontSize: 10, color: C.TEXT_BODY, fontFace: 'Arial', wrap: true, lineSpacing: 15
      });
    });

    addSlideFooter(slide, 7);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 8: AI & Intelligent Automation Engine
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'AI & Intelligent Automation Architecture', 'Intelligence Engine', 'Autonomous decision rules, model pipelines, and human-in-the-loop safeguards');

    const aiCards = [
      {
        kicker: 'AI CAPABILITIES & MODELS',
        title: 'Algorithmic Triage & Synthesis',
        bullets: [
          'Natural language requirement extraction',
          'Context-aware operational triage',
          'Automated schedule matching & optimization',
          'Multi-channel real-time status intelligence'
        ],
        accent: C.ACCENT_BLUE
      },
      {
        kicker: 'DATA INGESTION & CONTEXT',
        title: 'Deterministic Knowledge Pipeline',
        bullets: [
          'Direct SOP & BRD document parsing',
          'Relational database context alignment',
          'Deterministic schema validation pass',
          'Zero-hallucination domain guardrails'
        ],
        accent: C.ACCENT_GREEN
      },
      {
        kicker: 'GOVERNANCE & SAFEGUARDS',
        title: 'Human-in-the-Loop Controls',
        bullets: [
          'Configurable confidence score thresholds',
          'Mandatory human sign-off on stage gates',
          'Immutable audit logging of AI decisions',
          'Automated fallback to operator review'
        ],
        accent: C.ACCENT_AMBER
      }
    ];

    aiCards.forEach((c, idx) => {
      const xPos = 0.8 + (idx * 3.98);
      slide.addShape(pres.ShapeType.roundRect, {
        x: xPos, y: 1.6, w: 3.77, h: 4.8,
        fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
      });
      slide.addShape(pres.ShapeType.rect, {
        x: xPos, y: 1.6, w: 3.77, h: 0.08,
        fill: { color: c.accent }
      });
      slide.addText(c.kicker, {
        x: xPos + 0.2, y: 1.85, w: 3.37, h: 0.25,
        fontSize: 8.5, bold: true, color: c.accent, fontFace: 'Arial'
      });
      slide.addText(c.title, {
        x: xPos + 0.2, y: 2.12, w: 3.37, h: 0.45,
        fontSize: 13, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
      });
      const bulletObjects = c.bullets.map(text => ({
        text, options: { fontSize: 10.5, color: C.TEXT_BODY, bullet: true, lineSpacing: 18 }
      }));
      slide.addText(bulletObjects, {
        x: xPos + 0.2, y: 2.7, w: 3.37, h: 3.4
      });
    });

    addSlideFooter(slide, 8);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 9: User Experience, Personas & Alignment
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'User Experience, Personas & Journey Alignment', 'Experience Design', 'Persona-driven operational workflows and accessibility standards');

    // Left Column: Personas
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 1.6, w: 5.7, h: 5.0,
      fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    slide.addText('TARGET USER PERSONAS', {
      x: 1.05, y: 1.82, w: 5.2, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
    });

    const personasList = (userExperience.personas || []).slice(0, 3);
    personasList.forEach((p, idx) => {
      const y = 2.2 + (idx * 1.35);
      slide.addText(`👤  ${toCleanText(p.name || 'User Persona')} (${toCleanText(p.role || 'Operator')})`, {
        x: 1.05, y, w: 5.2, h: 0.3,
        fontSize: 12, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
      });
      slide.addText(`Goal: ${truncateText(p.goal || p.goals || 'Execute workflow tasks without system latency', 90)}`, {
        x: 1.05, y: y + 0.35, w: 5.2, h: 0.6,
        fontSize: 10.5, color: C.TEXT_BODY, fontFace: 'Arial', wrap: true
      });
    });

    // Right Column: Screens & Accessibility
    slide.addShape(pres.ShapeType.roundRect, {
      x: 6.83, y: 1.6, w: 5.7, h: 5.0,
      fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    slide.addText('PRIMARY INTERFACES & ACCESSIBILITY', {
      x: 7.08, y: 1.82, w: 5.2, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
    });

    const screenBullets = (userExperience.screens || []).slice(0, 4).map(s => ({
      text: `${toCleanText(s.title || s.name || s)}: ${truncateText(s.description || 'Core workflow interface with telemetry', 65)}`,
      options: { fontSize: 10.5, color: C.TEXT_BODY, bullet: true, lineSpacing: 16 }
    }));
    if (screenBullets.length === 0) {
      screenBullets.push({ text: 'Main Operational Dashboard: Core monitoring & task execution view', options: { fontSize: 10.5, color: C.TEXT_BODY, bullet: true } });
      screenBullets.push({ text: 'Queue & Review Console: Exception handling and triage workspace', options: { fontSize: 10.5, color: C.TEXT_BODY, bullet: true } });
    }
    slide.addText(screenBullets, {
      x: 7.08, y: 2.2, w: 5.2, h: 2.4
    });

    slide.addText('ACCESSIBILITY & COMPLIANCE SPECIFICATION', {
      x: 7.08, y: 4.8, w: 5.2, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_GREEN, fontFace: 'Arial'
    });
    slide.addText(toCleanText(userExperience.accessibilityNotes || 'WCAG 2.1 AA Compliant, keyboard navigable, responsive multi-device layouts'), {
      x: 7.08, y: 5.1, w: 5.2, h: 1.2,
      fontSize: 10.5, color: C.TEXT_NAVY, fontFace: 'Arial', wrap: true
    });

    addSlideFooter(slide, 9);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 10: Data Model & API Foundation
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Core Relational Domain & Enterprise REST APIs', 'Data Architecture', 'Entity-relationship schema and authenticated REST service contracts');

    // Left Table: Entities
    const entityRows = [
      [
        { text: 'ENTITY', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'PK', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'FIELDS', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'BUSINESS PURPOSE', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } }
      ]
    ];
    (dataAndApi.entities || []).slice(0, 5).forEach((e, idx) => {
      const rowFill = idx % 2 === 1 ? C.TABLE_ROW_ALT : C.CARD_LIGHT;
      entityRows.push([
        { text: toCleanText(e.name), options: { bold: true, color: C.TEXT_NAVY, fill: rowFill, fontSize: 9.5 } },
        { text: toCleanText(e.primaryKey || 'id'), options: { color: C.ACCENT_GOLD, fill: rowFill, fontSize: 9 } },
        { text: String(e.fieldsCount || 0), options: { color: C.TEXT_MUTED, fill: rowFill, fontSize: 9.5 } },
        { text: truncateText(e.description || 'Core domain model', 40), options: { color: C.TEXT_BODY, fill: rowFill, fontSize: 9 } }
      ]);
    });
    slide.addTable(entityRows, {
      x: 0.8, y: 1.6, w: 5.7, h: 5.0,
      colW: [1.6, 0.8, 0.8, 2.5],
      border: { pt: 0.5, color: C.BORDER_SUBTLE }
    });

    // Right Table: APIs
    const apiRows = [
      [
        { text: 'VERB', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'ENDPOINT PATH', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'AUTHENTICATION', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } }
      ]
    ];
    (dataAndApi.endpoints || []).slice(0, 5).forEach((ep, idx) => {
      const rowFill = idx % 2 === 1 ? C.TABLE_ROW_ALT : C.CARD_LIGHT;
      apiRows.push([
        { text: toCleanText(ep.method), options: { bold: true, color: ep.method === 'GET' ? C.ACCENT_BLUE : C.ACCENT_GREEN, fill: rowFill, fontSize: 9.5 } },
        { text: truncateText(ep.endpoint, 35), options: { color: C.TEXT_NAVY, fill: rowFill, fontSize: 9 } },
        { text: toCleanText(ep.authentication || 'JWT Bearer'), options: { color: C.TEXT_MUTED, fill: rowFill, fontSize: 9 } }
      ]);
    });
    slide.addTable(apiRows, {
      x: 6.83, y: 1.6, w: 5.7, h: 5.0,
      colW: [1.0, 3.2, 1.5],
      border: { pt: 0.5, color: C.BORDER_SUBTLE }
    });

    addSlideFooter(slide, 10);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 11: Implementation Roadmap & Milestones
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Phased Implementation Timeline & Milestones', 'Delivery Execution', 'Strategic execution phases, duration estimates, and delivery governance');

    // Top Summary Banner
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 1.6, w: 11.73, h: 1.1,
      fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    const summaryMetrics = [
      { label: 'ESTIMATED TIMELINE', val: `${roadmap.estimatedDurationWeeks || 12} Weeks` },
      { label: 'METHODOLOGY', val: toCleanText(investment.methodology || 'Agile Sprints') },
      { label: 'EXECUTION PHASES', val: `${roadmap.phases ? roadmap.phases.length : 4} Phases` },
      { label: 'ESTIMATED INVESTMENT', val: toCleanText(investment.estimatedCostRange || '$180k - $240k') }
    ];
    summaryMetrics.forEach((m, idx) => {
      const xPos = 1.0 + (idx * 2.9);
      slide.addText(m.label, {
        x: xPos, y: 1.75, w: 2.7, h: 0.22,
        fontSize: 8.5, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
      });
      slide.addText(m.val, {
        x: xPos, y: 2.02, w: 2.7, h: 0.5,
        fontSize: 13, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial', wrap: true
      });
    });

    // Phased Cards
    const phases = (roadmap.phases || []).slice(0, 4);
    phases.forEach((p, idx) => {
      const xPos = 0.8 + (idx * 2.98);
      slide.addShape(pres.ShapeType.roundRect, {
        x: xPos, y: 2.9, w: 2.8, h: 3.7,
        fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
      });
      slide.addText(`PHASE 0${p.phaseNumber}`, {
        x: xPos + 0.18, y: 3.1, w: 2.44, h: 0.22,
        fontSize: 9, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
      });
      slide.addText(toCleanText(p.name), {
        x: xPos + 0.18, y: 3.35, w: 2.44, h: 0.6,
        fontSize: 12, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial', wrap: true
      });
      slide.addText(`Duration: ${p.durationWeeks} Weeks`, {
        x: xPos + 0.18, y: 4.05, w: 2.44, h: 0.25,
        fontSize: 10, bold: true, color: C.ACCENT_GOLD, fontFace: 'Arial'
      });
      slide.addText(`Focus:\n${truncateText(p.focus, 90)}`, {
        x: xPos + 0.18, y: 4.4, w: 2.44, h: 1.2,
        fontSize: 9.5, color: C.TEXT_BODY, fontFace: 'Arial', wrap: true
      });
      slide.addText(`Scheduled Tasks: ${p.tasks ? p.tasks.length : 0}`, {
        x: xPos + 0.18, y: 5.9, w: 2.44, h: 0.35,
        fontSize: 9.5, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
      });
    });

    addSlideFooter(slide, 11);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 12: Delivery Tasks & Sprint Allocation
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Tasks, Sprints & Delivery Breakdown', 'Work Breakdown', 'Active delivery work packages derived from the Transformation Implementation Plan');

    const tasksList = (roadmap.allTasks || []).slice(0, 6);
    const taskRows = [
      [
        { text: 'TASK TITLE', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'PHASE', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'SPRINT', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'ASSIGNED ROLE', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'DURATION', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'RISK', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'STATUS', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } }
      ]
    ];

    tasksList.forEach((t, idx) => {
      const rowFill = idx % 2 === 1 ? C.TABLE_ROW_ALT : C.CARD_LIGHT;
      const isCompleted = t.status === 'COMPLETED';
      const statusColor = isCompleted ? C.ACCENT_GREEN : t.status === 'IN_PROGRESS' ? C.ACCENT_AMBER : C.TEXT_MUTED;
      taskRows.push([
        { text: truncateText(t.title, 40), options: { bold: true, color: C.TEXT_NAVY, fill: rowFill, fontSize: 9.5 } },
        { text: truncateText(t.phaseName, 22), options: { color: C.TEXT_BODY, fill: rowFill, fontSize: 9 } },
        { text: toCleanText(t.sprint || 'Sprint 1'), options: { color: C.TEXT_MUTED, fill: rowFill, fontSize: 9 } },
        { text: toCleanText(t.assignedRole || 'Engineering'), options: { color: C.TEXT_BODY, fill: rowFill, fontSize: 9 } },
        { text: `${t.durationWeeks} Wks`, options: { color: C.TEXT_MUTED, fill: rowFill, fontSize: 9 } },
        { text: toCleanText(t.riskLevel || 'LOW'), options: { bold: true, color: t.riskLevel === 'HIGH' ? C.ACCENT_RED : C.TEXT_MUTED, fill: rowFill, fontSize: 9 } },
        { text: toCleanText(t.status || 'TODO'), options: { bold: true, color: statusColor, fill: rowFill, fontSize: 9 } }
      ]);
    });

    slide.addTable(taskRows, {
      x: 0.8, y: 1.6, w: 11.73, h: 5.0,
      colW: [3.33, 2.0, 1.3, 1.8, 1.0, 1.0, 1.3],
      border: { pt: 0.5, color: C.BORDER_SUBTLE }
    });

    addSlideFooter(slide, 12);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 13: Governance, Sign-offs & Risk Register
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Governance Sign-offs & Quality Gates', 'Governance & Risk', 'Stage approvals status, compliance verification, and risk mitigation protocols');

    // Top: Sign-offs Table
    const signoffList = (governance.signoffs || []).slice(0, 3);
    const signRows = [
      [
        { text: 'LIFECYCLE STAGE', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'VERSION', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'STATUS', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'AUTHORIZED REVIEWER', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } },
        { text: 'DECISION TIMESTAMP', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: C.TABLE_HDR_BG, fontSize: 9.5 } }
      ]
    ];

    if (signoffList.length > 0) {
      signoffList.forEach((s, idx) => {
        const rowFill = idx % 2 === 1 ? C.TABLE_ROW_ALT : C.CARD_LIGHT;
        const isApproved = s.status === 'APPROVED';
        signRows.push([
          { text: toCleanText(s.artifactType), options: { bold: true, color: C.TEXT_NAVY, fill: rowFill, fontSize: 9.5 } },
          { text: `V${s.versionNumber}`, options: { color: C.ACCENT_GOLD, fill: rowFill, fontSize: 9 } },
          { text: toCleanText(s.status), options: { bold: true, color: isApproved ? C.ACCENT_GREEN : C.ACCENT_BLUE, fill: rowFill, fontSize: 9.5 } },
          { text: `${toCleanText(s.reviewerName)} (${toCleanText(s.reviewerRole)})`, options: { color: C.TEXT_BODY, fill: rowFill, fontSize: 9 } },
          { text: new Date(s.timestamp).toLocaleDateString(), options: { color: C.TEXT_MUTED, fill: rowFill, fontSize: 9 } }
        ]);
      });
    } else {
      signRows.push([
        { text: 'Solution Lifecycle', options: { color: C.TEXT_NAVY, fill: C.CARD_LIGHT, fontSize: 9.5 } },
        { text: 'V1', options: { color: C.TEXT_MUTED, fill: C.CARD_LIGHT, fontSize: 9 } },
        { text: 'IN REVIEW', options: { bold: true, color: C.ACCENT_AMBER, fill: C.CARD_LIGHT, fontSize: 9.5 } },
        { text: 'Enterprise Architect & Consultant', options: { color: C.TEXT_BODY, fill: C.CARD_LIGHT, fontSize: 9 } },
        { text: 'Current Sprint', options: { color: C.TEXT_MUTED, fill: C.CARD_LIGHT, fontSize: 9 } }
      ]);
    }

    slide.addTable(signRows, {
      x: 0.8, y: 1.6, w: 11.73, h: 2.1,
      colW: [2.8, 1.3, 1.8, 3.4, 2.43],
      border: { pt: 0.5, color: C.BORDER_SUBTLE }
    });

    // Bottom: Critical Risks Table
    const riskRows = [
      [
        { text: 'SEVERITY', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: '1E293B', fontSize: 9.5 } },
        { text: 'RISK FACTOR', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: '1E293B', fontSize: 9.5 } },
        { text: 'POTENTIAL IMPACT', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: '1E293B', fontSize: 9.5 } },
        { text: 'MITIGATION PROTOCOL', options: { bold: true, color: C.TABLE_HDR_TEXT, fill: '1E293B', fontSize: 9.5 } }
      ]
    ];
    (riskRegister || []).slice(0, 3).forEach((r, idx) => {
      const rowFill = idx % 2 === 1 ? C.TABLE_ROW_ALT : C.CARD_LIGHT;
      riskRows.push([
        { text: toCleanText(r.severity), options: { bold: true, color: r.severity === 'HIGH' ? C.ACCENT_RED : C.ACCENT_AMBER, fill: rowFill, fontSize: 9.5 } },
        { text: truncateText(r.title, 35), options: { bold: true, color: C.TEXT_NAVY, fill: rowFill, fontSize: 9.5 } },
        { text: truncateText(r.impact, 55), options: { color: C.TEXT_MUTED, fill: rowFill, fontSize: 9 } },
        { text: truncateText(r.mitigation, 65), options: { color: C.TEXT_BODY, fill: rowFill, fontSize: 9 } }
      ]);
    });
    slide.addTable(riskRows, {
      x: 0.8, y: 4.0, w: 11.73, h: 2.6,
      colW: [1.6, 3.13, 3.5, 3.5],
      border: { pt: 0.5, color: C.BORDER_SUBTLE }
    });

    addSlideFooter(slide, 13);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 14: Transformation Readiness & Next Steps
  // ══════════════════════════════════════════════════════════════════════════
  {
    const slide = pres.addSlide();
    slide.background = { color: C.BG_LIGHT };
    addSlideHeader(slide, 'Transformation Readiness & Immediate Next Steps', 'Impact & Realization', 'Current lifecycle progression, dynamic readiness assessment, and immediate priorities');

    // Left Box: Where are we now? (Readiness & Stages)
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 1.6, w: 5.7, h: 5.0,
      fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    slide.addText('WHERE ARE WE NOW?', {
      x: 1.05, y: 1.82, w: 5.2, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
    });
    slide.addText(`Current Stage: ${toCleanText(metadata.lifecycleStatus || 'PLANNING')}`, {
      x: 1.05, y: 2.1, w: 5.2, h: 0.35,
      fontSize: 14, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
    });

    // Dynamic Readiness Score Cards
    const readinessItems = [
      { label: 'Implementation Readiness', score: readiness.implementationReadiness?.score ?? 85 },
      { label: 'Architecture Readiness', score: readiness.architectureReadiness?.score ?? 90 },
      { label: 'Solution Readiness', score: readiness.solutionReadiness?.score ?? 92 }
    ];
    readinessItems.forEach((r, idx) => {
      const yPos = 2.6 + (idx * 0.72);
      slide.addShape(pres.ShapeType.roundRect, {
        x: 1.05, y: yPos, w: 5.2, h: 0.62,
        fill: { color: C.CARD_MUTED }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.06
      });
      slide.addText(r.label, {
        x: 1.25, y: yPos + 0.12, w: 3.5, h: 0.35,
        fontSize: 10.5, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial'
      });
      slide.addText(`${r.score} / 100`, {
        x: 4.8, y: yPos + 0.12, w: 1.3, h: 0.35,
        fontSize: 12, bold: true, color: C.ACCENT_GREEN, fontFace: 'Arial', align: 'right'
      });
    });

    slide.addText('LIFECYCLE STATUS SUMMARY', {
      x: 1.05, y: 4.95, w: 5.2, h: 0.22,
      fontSize: 8.5, bold: true, color: C.TEXT_MUTED, fontFace: 'Arial'
    });
    slide.addText(`Planning Progress: ${stages.planning?.progress || 0}% completed  •  Sign-offs Active: ${governance.signoffs ? governance.signoffs.length : 0}`, {
      x: 1.05, y: 5.25, w: 5.2, h: 0.8,
      fontSize: 10.5, color: C.TEXT_BODY, fontFace: 'Arial', wrap: true
    });

    // Right Box: Immediate Actionable Priorities
    slide.addShape(pres.ShapeType.roundRect, {
      x: 6.83, y: 1.6, w: 5.7, h: 5.0,
      fill: { color: C.CARD_LIGHT }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.08
    });
    slide.addText('IMMEDIATE PRIORITIES & NEXT STEPS', {
      x: 7.08, y: 1.82, w: 5.2, h: 0.25,
      fontSize: 9, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
    });

    // Dynamic Next Action Banner
    slide.addShape(pres.ShapeType.roundRect, {
      x: 7.08, y: 2.15, w: 5.2, h: 0.95,
      fill: { color: C.STATUS_AMBER_BG }, line: { color: 'FCD34D', width: 1 }, rectRadius: 0.06
    });
    slide.addText('RECOMMENDED NEXT ACTION:', {
      x: 7.25, y: 2.25, w: 4.8, h: 0.2,
      fontSize: 8.5, bold: true, color: C.ACCENT_AMBER, fontFace: 'Arial'
    });
    slide.addText(toCleanText(nextAction), {
      x: 7.25, y: 2.48, w: 4.8, h: 0.52,
      fontSize: 12.5, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial', wrap: true
    });

    // 30-60-90 Day Priorities
    const priorities = [
      { window: '30 DAYS', action: 'Sprint 1 Backlog Grooming & Cloud Infrastructure Provisioning' },
      { window: '60 DAYS', action: 'Core Microservices Delivery & Automated Ingress Security Integration' },
      { window: '90 DAYS', action: 'End-to-End User Acceptance Testing & Staged Production Pilot Rollout' }
    ];
    priorities.forEach((pr, idx) => {
      const yPos = 3.3 + (idx * 0.98);
      slide.addShape(pres.ShapeType.roundRect, {
        x: 7.08, y: yPos, w: 5.2, h: 0.82,
        fill: { color: C.CARD_MUTED }, line: { color: C.BORDER_SUBTLE, width: 1 }, rectRadius: 0.06
      });
      slide.addText(pr.window, {
        x: 7.25, y: yPos + 0.1, w: 4.8, h: 0.2,
        fontSize: 8.5, bold: true, color: C.ACCENT_BLUE, fontFace: 'Arial'
      });
      slide.addText(pr.action, {
        x: 7.25, y: yPos + 0.32, w: 4.8, h: 0.42,
        fontSize: 10, bold: true, color: C.TEXT_NAVY, fontFace: 'Arial', wrap: true
      });
    });

    addSlideFooter(slide, 14);
  }

  // Generate buffer
  return await pres.write({ outputType: 'nodebuffer' });
}

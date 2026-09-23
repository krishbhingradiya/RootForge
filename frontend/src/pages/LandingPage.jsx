import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RootForgeLogo } from '../components/common/RootForgeLogo';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Layers,
  Cpu,
  Database,
  GitFork,
  LayoutTemplate,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  Users,
  Search,
  Code2,
  Lock,
  Compass,
  FileCode2,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Terminal,
  Server,
  Play,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { VoxelWorldHeroBackground } from '../components/landing/VoxelWorldHeroBackground';

export const LandingPage = () => {
  const { loginAsDemo } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Navigation scroll state for dynamic sticky navbar
  const [scrolled, setScrolled] = useState(false);

  // Hero progressive transformation animation state (4-6s cycle)
  const [heroStep, setHeroStep] = useState(1);

  // Interactive Solution Canvas state
  const [challengeInput, setChallengeInput] = useState(
    'Our customer support team spends too much time manually classifying and routing requests across multiple channels.'
  );
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStageLabel, setBuildStageLabel] = useState('');
  const [canvasReady, setCanvasReady] = useState(true);
  const [activePreviewTab, setActivePreviewTab] = useState('summary');

  // Product Showcase active screen
  const [activeShowcase, setActiveShowcase] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hero progressive transformation cycle on page load
  useEffect(() => {
    const timers = [
      setTimeout(() => setHeroStep(2), 1100), // Analyzing...
      setTimeout(() => setHeroStep(3), 2200), // Business Analysis
      setTimeout(() => setHeroStep(4), 3300), // Solution Recommendation
      setTimeout(() => setHeroStep(5), 4400), // Architecture & Process
      setTimeout(() => setHeroStep(6), 5500)  // Solution Ready
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Silky smooth animated scroll with requestAnimationFrame and cubic easing (no hash jump, no blinking)
  const smoothScrollTo = (e, sectionId) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const targetEl = document.getElementById(sectionId);
    if (!targetEl) return;

    const navOffset = 76;
    const startY = window.pageYOffset || document.documentElement.scrollTop;
    const targetY = targetEl.getBoundingClientRect().top + startY - navOffset;
    const distance = targetY - startY;

    // Responsive duration based on scroll distance (600ms - 950ms)
    const duration = Math.min(Math.max(Math.abs(distance) * 0.45, 600), 950);
    let startTime = null;

    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * ease);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  };

  const handleLaunchDemo = async () => {
    try {
      await loginAsDemo('ADMIN');
      navigate('/app/workspaces/ws-demo-customer-support');
    } catch (err) {
      console.error('Demo login error:', err);
      navigate('/login');
    }
  };

  const handleRunInteractiveBuilder = () => {
    if (isBuilding) return;
    setIsBuilding(true);
    setCanvasReady(false);
    setBuildProgress(10);
    setBuildStageLabel('Understanding business context & channels...');

    const stages = [
      { progress: 28, label: 'Analyzing operating friction & SLA metrics...' },
      { progress: 48, label: 'Identifying straight-through automation opportunities...' },
      { progress: 68, label: 'Formulating N-tier architecture & gateway topology...' },
      { progress: 88, label: 'Synthesizing 3NF schema, REST APIs & roadmap...' },
      { progress: 100, label: '✓ Solution Blueprint Ready' }
    ];

    stages.forEach((stage, idx) => {
      setTimeout(() => {
        setBuildProgress(stage.progress);
        setBuildStageLabel(stage.label);
        if (stage.progress === 100) {
          setTimeout(() => {
            setIsBuilding(false);
            setCanvasReady(true);
          }, 600);
        }
      }, (idx + 1) * 800);
    });
  };

  const sampleScenarios = [
    'Customer Support Manual Triage',
    'Procurement Invoice 3-Way Matching',
    'Fintech Loan Origination Triage',
    'Healthcare Claims Prior Authorization'
  ];

  const showcaseScreens = [
    {
      id: 'discovery',
      title: 'Discovery Workspace',
      badge: 'STAGE 01',
      desc: 'Interactive enterprise discovery interview, requirement synthesis, and constraint cataloging.',
      tagline: 'Contextual interview with persistent memory',
      preview: (
        <div style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 14 }}>
            <div>
              <span className="font-mono-tech" style={{ fontSize: '0.72rem', color: '#C96B3B', fontWeight: 600 }}>SESSION #DISC-8812</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Customer Support Transformation</div>
            </div>
            <span style={{ fontSize: '0.72rem', backgroundColor: 'var(--accent-amber-light)', color: 'var(--accent-amber-text)', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>2 DOCS INDEXED</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: 12, borderRadius: 6, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              <strong style={{ color: '#C96B3B' }}>AI Consultant:</strong> What is the current distribution of inbound volume across email, portal, chat, and phone channels?
            </div>
            <div style={{ backgroundColor: 'var(--accent-amber)', color: '#FFFFFF', padding: 12, borderRadius: 6, fontSize: '0.82rem', alignSelf: 'flex-end', maxWidth: '90%' }}>
              Around 54% are order tracking and return inquiries, 26% billing disputes, and 20% warranty disputes.
            </div>
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: 12, borderRadius: 6, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              <strong style={{ color: '#10B981' }}>Insight:</strong> 54% represents routine high-volume requests suitable for straight-through automation via Shopify/ERP connectors.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analysis',
      title: 'Business Analysis Engine',
      badge: 'STAGE 02',
      desc: 'Current vs future state diagnostics, digital operations maturity score, and automation ranking.',
      tagline: 'Objective diagnostics from raw documents',
      preview: (
        <div style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Digital Maturity & Gaps</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score:</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#C96B3B' }}>68 / 100</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-red-text)' }}>CURRENT STATE</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>Turnaround averages 18.2h due to manual triage and fragmented legacy inboxes.</div>
            </div>
            <div style={{ padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-green-text)' }}>TARGET FUTURE STATE</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>Sub-3-minute straight-through response with AI classification and human-in-the-loop fallback.</div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>PRIORITIZED AUTOMATION OPPORTUNITIES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 4, color: 'var(--text-primary)' }}>
              <span>Intelligent Inbound Triage</span>
              <strong style={{ color: 'var(--accent-green-text)' }}>75% time saving</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 4, color: 'var(--text-primary)' }}>
              <span>Self-Service Order Tracking Bot</span>
              <strong style={{ color: 'var(--accent-green-text)' }}>50% deflection</strong>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'solution',
      title: 'Solution Builder',
      badge: 'STAGE 03',
      desc: 'Comparative scorecard across Targeted Automation, AI Platform, and Enterprise Overhaul.',
      tagline: 'Tradeoff analysis with cost and risk',
      preview: (
        <div style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Strategy Options Scorecard</div>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-green-text)', fontWeight: 700, backgroundColor: 'var(--accent-green-light)', padding: '2px 8px', borderRadius: 4 }}>OPTION B SELECTED</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { id: 'Option A', name: 'Workflow Automation', effort: '6-8 wks', cost: '$75k', impact: 'Moderate', selected: false },
              { id: 'Option B', name: 'AI Platform (Rec)', effort: '12-14 wks', cost: '$180k', impact: 'High (70% Auto)', selected: true },
              { id: 'Option C', name: 'Full ERP Overhaul', effort: '24-32 wks', cost: '$550k', impact: 'Transformational', selected: false }
            ].map((opt) => (
              <div
                key={opt.id}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  border: opt.selected ? '2px solid #C96B3B' : '1px solid var(--border-subtle)',
                  backgroundColor: opt.selected ? 'var(--accent-amber-light)' : 'var(--bg-subtle)'
                }}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: opt.selected ? '#C96B3B' : 'var(--text-muted)' }}>{opt.id}</div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginTop: 2, color: 'var(--text-primary)' }}>{opt.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 6 }}>Effort: <strong>{opt.effort}</strong></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Investment: <strong>{opt.cost}</strong></div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'architecture',
      title: 'Architecture Canvas',
      badge: 'STAGE 04',
      desc: 'Interactive N-tier component canvas with draggable nodes, protocols, and security boundaries.',
      tagline: 'Visual editable system topology',
      preview: (
        <div style={{ padding: 20, backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', borderRadius: 8, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            <span className="font-mono-tech" style={{ fontSize: '0.75rem', color: '#D6A85F' }}>TOPOLOGY // N-TIER ISOLATION</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HTTPS REST / gRPC</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
            <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>CLIENT</div>
              <strong>React SPA</strong>
            </div>
            <span style={{ color: '#D6A85F' }}>→</span>
            <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>GATEWAY</div>
              <strong>API Proxy</strong>
            </div>
            <span style={{ color: '#D6A85F' }}>→</span>
            <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--bg-subtle)', border: '1px solid #C96B3B', fontSize: '0.75rem', textAlign: 'center' }}>
              <div style={{ color: '#C96B3B', fontSize: '0.65rem' }}>AI CORE</div>
              <strong>Inference Engine</strong>
            </div>
            <span style={{ color: '#D6A85F' }}>→</span>
            <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>DB</div>
              <strong>PostgreSQL 3NF</strong>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
            Security: OWASP Top 10 · Bcrypt JWT · Parameterized Prisma ORM · TLS 1.3
          </div>
        </div>
      )
    },
    {
      id: 'process',
      title: 'Process Designer',
      badge: 'STAGE 05',
      desc: 'Sequential decision workflows, actor swimlanes, and conditional human-in-the-loop gates.',
      tagline: 'Clear operational handoffs & gates',
      preview: (
        <div style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, height: '100%' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, color: 'var(--text-primary)' }}>Target Process Decision Tree</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
            <div style={{ padding: 10, backgroundColor: 'var(--bg-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
              <span>1. Customer Request Ingestion (Email/Web)</span>
              <span className="badge badge-gray">INGRESS</span>
            </div>
            <div style={{ padding: 10, backgroundColor: 'var(--accent-amber-light)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-amber-text)' }}>
              <span>2. AI Intent & Sentiment Classification (&gt;80% Conf)</span>
              <span className="badge badge-amber">AUTOMATION</span>
            </div>
            <div style={{ padding: 10, backgroundColor: 'var(--bg-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
              <span>3. Decision Gate: High Priority / VIP Escalation?</span>
              <span className="badge badge-gray">DECISION</span>
            </div>
            <div style={{ padding: 10, backgroundColor: 'var(--accent-green-light)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--accent-green-text)' }}>
              <span>4. Operator Copilot Sign-Off & Closed Loop Resolution</span>
              <span className="badge badge-green">COMPLETED</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'planning',
      title: 'Implementation Planner',
      badge: 'STAGE 06',
      desc: 'Phased rollout roadmap, sprint allocation, cost estimations, and risk management.',
      tagline: '12-week execution schedule with sprints',
      preview: (
        <div style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>12-Week Agile Transformation</div>
            <span className="font-mono-tech" style={{ fontSize: '0.75rem', color: '#C96B3B', fontWeight: 600 }}>$160k - $210k</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { phase: 'Phase 1', name: 'Discovery & Security Alignment', wks: '2 wks', pct: 100 },
              { phase: 'Phase 2', name: 'Core Ingestion & 3NF Schemas', wks: '3 wks', pct: 85 },
              { phase: 'Phase 3', name: 'AI Classifier & Operator Copilot', wks: '3 wks', pct: 40 },
              { phase: 'Phase 4', name: 'ERP Connector & Pilot UAT', wks: '2 wks', pct: 0 },
              { phase: 'Phase 5', name: 'Production Cutover & Telemetry', wks: '2 wks', pct: 0 }
            ].map((p, i) => (
              <div key={i} style={{ fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.phase}: {p.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{p.wks}</span>
                </div>
                <div style={{ height: 6, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.pct}%`, backgroundColor: '#C96B3B', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <div
      className="font-editorial"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden'
      }}
    >
      {/* ==================================================
          1. ANNOUNCEMENT TICKER (Thin continuous marquee) - Light Mode Only
          ================================================== */}
      {theme !== 'dark' && (
        <div
          style={{
            height: 'calc(34px + max(env(safe-area-inset-top, 0px), 0px))',
            paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
            backgroundColor: '#171717',
            color: '#E8E6E1',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 600,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            boxSizing: 'border-box'
          }}
        >
          <div className="lp-ticker-track">
            {[1, 2, 3].map((loop) => (
              <span key={loop} style={{ display: 'inline-flex', alignItems: 'center', gap: 28, paddingRight: 28 }}>
                <span style={{ color: '#D6A85F', fontWeight: 800 }}>ROOTFORGE SOLUTION BUILDER</span>
                <span>• Business Discovery</span>
                <span>• Solution Design</span>
                <span>• Architecture</span>
                <span>• Process Intelligence</span>
                <span>• UX Wireframes</span>
                <span>• Database & APIs</span>
                <span>• Implementation Planning</span>
                <span>• Advisory Human-in-the-Loop</span>
                <span>• Executive Blueprinting</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================
          2. PREMIUM STICKY NAVIGATION
          ================================================== */}
      <nav
        className="lp-nav"
        style={{
          transition: 'all 0.25s ease',
          backgroundColor: theme === 'dark' ? 'rgba(9, 14, 24, 0.88)' : (scrolled ? 'rgba(247, 246, 242, 0.94)' : 'transparent'),
          backdropFilter: theme === 'dark' ? 'blur(14px)' : (scrolled ? 'blur(12px)' : 'none'),
          borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : (scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent')
        }}
      >
        {/* Brand Wordmark */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none'
          }}
        >
          <RootForgeLogo size="md" variant={theme === 'dark' ? 'light' : 'dark'} subtitle="ENTERPRISE TRANSFORMATION" />
        </Link>

        {/* Center Editorial Links */}
        <div className="lp-nav-center-links" style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: '0.84rem', fontWeight: 600, color: theme === 'dark' ? '#F1F5F9' : 'var(--text-secondary)' }}>
          <button
            type="button"
            onClick={(e) => smoothScrollTo(e, 'transformation')}
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', transition: 'color 0.15s', cursor: 'pointer' }}
          >
            {t.landing.product}
          </button>
          <button
            type="button"
            onClick={(e) => smoothScrollTo(e, 'how-it-works')}
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', transition: 'color 0.15s', cursor: 'pointer' }}
          >
            {t.landing.howItWorks}
          </button>
          <button
            type="button"
            onClick={(e) => smoothScrollTo(e, 'interactive-canvas')}
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', transition: 'color 0.15s', cursor: 'pointer' }}
          >
            {t.landing.interactiveDemo}
          </button>
          <button
            type="button"
            onClick={(e) => smoothScrollTo(e, 'showcase')}
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', transition: 'color 0.15s', cursor: 'pointer' }}
          >
            {t.landing.workspaces}
          </button>
        </div>

        {/* Right CTA Group */}
        <div className="lp-nav-right-cta" style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {/* Language Selector Dropdown */}
          <div
            className="lp-lang-selector"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: theme === 'dark' ? '#FFFFFF' : (scrolled ? 'rgba(23, 23, 23, 0.05)' : 'rgba(255, 255, 255, 0.8)'),
              borderRadius: 6,
              border: theme === 'dark' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
              minHeight: 44,
              boxSizing: 'border-box'
            }}
          >
            <Globe size={15} style={{ color: theme === 'dark' ? '#475569' : 'var(--text-muted)' }} />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label="Language Selector"
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: theme === 'dark' ? '#1E242D' : 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
            </select>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              backgroundColor: theme === 'dark' ? 'rgba(18, 25, 39, 0.95)' : (scrolled ? 'rgba(23, 23, 23, 0.05)' : 'rgba(255, 255, 255, 0.8)'),
              borderRadius: 6,
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid var(--border-subtle)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              minHeight: 44,
              boxSizing: 'border-box'
            }}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} color="#F59E0B" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F1F5F9' }}>{lang === 'hi' ? 'लाइट' : lang === 'gu' ? 'લાઇટ' : 'Light'}</span>
              </>
            ) : (
              <>
                <Moon size={14} color="#4A5568" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lang === 'hi' ? 'डार्क' : lang === 'gu' ? 'ડાર્ક' : 'Dark'}</span>
              </>
            )}
          </button>

          <Link
            to="/login"
            style={{
              fontSize: '0.84rem',
              fontWeight: 600,
              color: theme === 'dark' ? '#F1F5F9' : 'var(--text-primary)',
              textDecoration: 'none',
              padding: '6px 14px'
            }}
          >
            {t.landing.signIn}
          </Link>

          <button
            onClick={handleLaunchDemo}
            className="btn"
            style={{
              backgroundColor: theme === 'dark' ? '#F59E0B' : '#171717',
              color: theme === 'dark' ? '#0B0F17' : '#F7F6F2',
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '8px 18px',
              borderRadius: 6,
              border: theme === 'dark' ? '1px solid #F59E0B' : '1px solid #171717',
              letterSpacing: '0.02em',
              transition: 'all 0.15s ease'
            }}
          >
            {t.landing.startBuilding}
          </button>
        </div>
      </nav>

      {/* ==================================================
          3. HERO SECTION (Editorial headline + Solution Canvas)
          ================================================== */}
      <section
        style={{
          position: 'relative',
          padding: theme === 'dark' ? '225px 36px 70px' : '75px 36px 95px',
          maxWidth: theme === 'dark' ? '100%' : 1360,
          margin: '0 auto',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        {/* ==================================================
            HERO BACKGROUND (Voxel World in Dark Mode, Photography Cards in Light Mode)
            ================================================== */}
        {theme === 'dark' ? (
          <VoxelWorldHeroBackground />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            {/* Photo 1: Strategy & Discovery Meeting (Top-Left) */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              left: '-45px',
              width: 290,
              height: 180,
              borderRadius: 14,
              overflow: 'hidden',
              transform: 'rotate(-4deg)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
              border: '2px solid #FFFFFF',
              opacity: 0.55
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80"
              alt="Strategy & Discovery Meeting"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(3.5px)', transform: 'scale(1.1)' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(23, 23, 23, 0.35) 0%, rgba(23, 23, 23, 0.02) 60%)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 12,
                padding: '3px 8px',
                backgroundColor: 'rgba(23, 23, 23, 0.75)',
                borderRadius: 4,
                color: '#FAF8F5',
                fontSize: '0.6rem',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.06em'
              }}
            >
              {t.landing.photo1}
            </div>
          </div>

          {/* Photo 2: Systems Architecture & Blueprint (Top-Right) */}
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              right: '15px',
              width: 320,
              height: 195,
              borderRadius: 14,
              overflow: 'hidden',
              transform: 'rotate(2.5deg)',
              boxShadow: '0 18px 38px rgba(0,0,0,0.14)',
              border: '2px solid #FFFFFF',
              opacity: 0.82
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80"
              alt="Systems Architecture Diagram"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(3.5px)', transform: 'scale(1.08)' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(23, 23, 23, 0.82) 0%, rgba(23, 23, 23, 0.05) 55%)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                right: 12,
                padding: '4px 10px',
                backgroundColor: 'rgba(23, 23, 23, 0.9)',
                borderRadius: 4,
                color: '#FAF8F5',
                fontSize: '0.62rem',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.06em',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              {t.landing.photo2}
            </div>
          </div>

          {/* Photo 3: Modern Enterprise Workspace (Floating Right Edge) */}
          <div
            style={{
              position: 'absolute',
              top: '40%',
              right: '-25px',
              width: 265,
              height: 165,
              borderRadius: 14,
              overflow: 'hidden',
              transform: 'rotate(-2deg)',
              boxShadow: '0 16px 36px rgba(0,0,0,0.14)',
              border: '2px solid #FFFFFF',
              opacity: 0.72
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80"
              alt="Enterprise Tech Workspace"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(3.5px)', transform: 'scale(1.08)' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(23, 23, 23, 0.82) 0%, rgba(23, 23, 23, 0.05) 55%)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 12,
                padding: '4px 10px',
                backgroundColor: 'rgba(23, 23, 23, 0.9)',
                borderRadius: 4,
                color: '#FAF8F5',
                fontSize: '0.62rem',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.06em',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              {t.landing.photo3}
            </div>
          </div>

          {/* Photo 4: Business Telemetry & Analytics (Bottom-Left) */}
          <div
            style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-40px',
              width: 300,
              height: 185,
              borderRadius: 14,
              overflow: 'hidden',
              transform: 'rotate(2deg)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
              border: '2px solid #FFFFFF',
              opacity: 0.55
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80"
              alt="Operations Analytics"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(3.5px)', transform: 'scale(1.1)' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(23, 23, 23, 0.35) 0%, rgba(23, 23, 23, 0.02) 60%)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: 12,
                padding: '3px 8px',
                backgroundColor: 'rgba(23, 23, 23, 0.75)',
                borderRadius: 4,
                color: '#FAF8F5',
                fontSize: '0.6rem',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.06em'
              }}
            >
              {t.landing.photo4}
            </div>
          </div>

          {/* Photo 5: Agile Delivery Collaboration (Bottom-Right) */}
          <div
            style={{
              position: 'absolute',
              bottom: '-15px',
              right: '30px',
              width: 315,
              height: 185,
              borderRadius: 14,
              overflow: 'hidden',
              transform: 'rotate(-2.5deg)',
              boxShadow: '0 18px 38px rgba(0,0,0,0.14)',
              border: '2px solid #FFFFFF',
              opacity: 0.82
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
              alt="Agile Delivery Team"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'blur(3.5px)', transform: 'scale(1.08)' }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(23, 23, 23, 0.82) 0%, rgba(23, 23, 23, 0.05) 55%)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                right: 12,
                padding: '4px 10px',
                backgroundColor: 'rgba(23, 23, 23, 0.9)',
                borderRadius: 4,
                color: '#FAF8F5',
                fontSize: '0.62rem',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.06em',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              {t.landing.photo5}
            </div>
          </div>
        </div>
        )}

        {/* Foreground Content Grid */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'grid',
            gridTemplateColumns: theme === 'dark' ? 'minmax(0, 1.02fr) 515px' : '1.05fr 0.95fr',
            gap: theme === 'dark' ? 52 : 36,
            alignItems: theme === 'dark' ? 'start' : 'center',
            maxWidth: theme === 'dark' ? 1230 : 1320,
            margin: '0 auto',
            padding: theme === 'dark' ? '0 20px' : 0
          }}
        >
          {/* Left Hero Column - Rendered Freely Without an Enclosing Card Box */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '6px 0'
            }}
          >
            {/* Pill Badge */}
            {theme === 'dark' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 14px',
                  backgroundColor: 'rgba(38, 22, 12, 0.94)',
                  border: '2px solid #D97706',
                  clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                  boxShadow: '0 0 12px rgba(217, 119, 6, 0.4), inset 0 1px 0 rgba(254, 215, 170, 0.3)',
                  color: '#FCD34D',
                  fontFamily: "'MinecraftTen', 'Pixelify Sans', monospace",
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  marginBottom: 14
                }}
              >
                <span>+</span>
                <span>ROOTFORGE AI TRANSFORMATION PLATFORM</span>
                <span>+</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 100,
                  backgroundColor: 'rgba(201, 107, 59, 0.08)',
                  border: '1px solid rgba(201, 107, 59, 0.3)',
                  color: '#C96B3B',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 22,
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 2px 8px rgba(201, 107, 59, 0.08)'
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#C96B3B' }} />
                <span>{t.landing.heroPill}</span>
              </div>
            )}

            {/* Dark Mode Sub-Header Indicator */}
            {theme === 'dark' && (
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#38BDF8',
                  letterSpacing: '0.08em',
                  marginBottom: 14,
                  textShadow: '0 0 8px rgba(56, 189, 248, 0.6)'
                }}
              >
                // STRATEGY &amp; DISCOVERY
              </div>
            )}

            {/* Display Headline */}
            {theme === 'dark' ? (
              <h1
                className="hero-voxel-title-1"
                style={{
                  marginBottom: 18
                }}
              >
                FROM BUSINESS CHAOS<br />
                <span className="hero-voxel-title-2">
                  TO A BUILDABLE
                </span><br />
                <span className="hero-voxel-title-2">
                  SOLUTION.
                </span>
              </h1>
            ) : (
              <h1
                style={{
                  fontFamily: "'Outfit', 'Plus Jakarta Sans', -apple-system, sans-serif",
                  fontSize: '3.6rem',
                  lineHeight: 1.05,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.038em',
                  marginBottom: 24
                }}
              >
                {t.landing.heroTitle1}<br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #C96B3B 0%, #D97706 45%, #F59E0B 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 3px 12px rgba(201, 107, 59, 0.22))'
                  }}
                >
                  {t.landing.heroTitle2}
                </span>
              </h1>
            )}

            {/* Attractive Subtitle Typography */}
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '1.02rem',
                lineHeight: 1.62,
                color: theme === 'dark' ? '#CBD5E1' : 'var(--text-secondary)',
                maxWidth: 520,
                marginBottom: 32,
                fontWeight: 400,
                letterSpacing: '-0.01em',
                textShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.9)' : 'none'
              }}
            >
              {t.landing.heroSubtitle}
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button
                onClick={handleLaunchDemo}
                className={theme === 'dark' ? 'btn btn-voxel-primary' : 'btn'}
                style={
                  theme === 'dark'
                    ? {}
                    : {
                        background: 'linear-gradient(135deg, #C96B3B 0%, #B85B2D 100%)',
                        color: '#FFFFFF',
                        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                        padding: '14px 30px',
                        borderRadius: 8,
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        border: 'none',
                        boxShadow: '0 6px 20px rgba(201, 107, 59, 0.32)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }
                }
              >
                {theme === 'dark' ? 'START BUILDING →' : t.landing.heroCtaPrimary}
              </button>

              <button
                type="button"
                onClick={(e) => smoothScrollTo(e, 'how-it-works')}
                className={theme === 'dark' ? 'btn btn-voxel-secondary' : 'btn'}
                style={
                  theme === 'dark'
                    ? {}
                    : {
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        padding: '14px 24px',
                        borderRadius: 8,
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        border: '1px solid var(--border-medium)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8
                      }
                }
              >
                <span>{theme === 'dark' ? 'SEE HOW IT WORKS ↓' : t.landing.heroCtaSecondary}</span>
              </button>
            </div>

            {/* Attractive Trust Line with Badges */}
            <div
              style={{
                marginTop: 34,
                paddingTop: 18,
                borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-subtle)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.84rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontWeight: 600, color: theme === 'dark' ? '#E2E8F0' : 'var(--text-primary)' }}>{t.landing.builtFor}</span>
              {['BUSINESS ANALYSTS', 'CONSULTANTS', 'PRODUCT TEAMS', 'SOLUTION ARCHITECTS'].map((role) => (
                <span
                  key={role}
                  style={{
                    backgroundColor: theme === 'dark' ? '#0C1524' : 'var(--bg-subtle)',
                    color: theme === 'dark' ? '#94A3B8' : 'var(--text-secondary)',
                    border: theme === 'dark' ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid var(--border-subtle)',
                    fontSize: '0.68rem',
                    padding: '3px 8px',
                    fontWeight: 700,
                    borderRadius: 4,
                    letterSpacing: '0.04em'
                  }}
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Right Hero Column: Progressive "Solution Canvas" Visual */}
          <div style={{ position: 'relative' }}>
            <div
              className={theme === 'dark' ? 'voxel-solution-panel' : 'lp-shadow-heavy'}
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(10, 17, 31, 0.94)' : 'var(--bg-surface)',
                borderRadius: theme === 'dark' ? 8 : 14,
                border: theme === 'dark' ? '1.5px solid #1E2D4A' : '1px solid var(--border-subtle)',
                overflow: 'hidden',
                boxShadow: theme === 'dark' ? '0 0 0 1px rgba(56, 189, 248, 0.12), 0 20px 40px rgba(0, 0, 0, 0.85)' : '0 24px 50px rgba(0, 0, 0, 0.25)',
                width: '100%',
                maxWidth: theme === 'dark' ? 515 : undefined
              }}
            >
              {/* Canvas Header */}
              <div
                className={theme === 'dark' ? 'voxel-solution-header' : ''}
                style={{
                  padding: theme === 'dark' ? '10px 16px' : '13px 20px',
                  backgroundColor: theme === 'dark' ? '#080E1A' : '#171717',
                  color: '#F7F6F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: theme === 'dark' ? '1px solid rgba(30, 45, 74, 0.4)' : 'none',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flexShrink: 1 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#22C55E', boxShadow: theme === 'dark' ? '0 0 8px #22C55E' : 'none', flexShrink: 0 }} />
                  <span style={{ fontSize: theme === 'dark' ? '0.66rem' : '0.67rem', fontWeight: 700, letterSpacing: '0.04em', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                    {t.landing.demoWorkspaceTag}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: theme === 'dark' ? '0.62rem' : '0.62rem',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    backgroundColor: theme === 'dark' ? 'rgba(6, 44, 34, 0.95)' : undefined,
                    border: theme === 'dark' ? '1px solid #10B981' : undefined,
                    color: theme === 'dark' ? '#34D399' : undefined,
                    padding: theme === 'dark' ? '3px 8px' : undefined,
                    borderRadius: theme === 'dark' ? 4 : undefined,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  className={theme === 'dark' ? '' : 'badge badge-green'}
                >
                  {t.landing.demoSolutionReady}
                </span>
              </div>

              {/* Connected Panels Simulation */}
              <div style={{ padding: theme === 'dark' ? '11px 14px' : 20, display: 'flex', flexDirection: 'column', gap: theme === 'dark' ? 7 : 12 }}>
                {/* 1. Problem Input */}
                <div
                  className={theme === 'dark' ? 'voxel-step-card' : ''}
                  style={{
                    padding: theme === 'dark' ? '8px 13px 9px' : 12,
                    borderRadius: theme === 'dark' ? 6 : 8,
                    backgroundColor: theme === 'dark' ? 'rgba(13, 23, 42, 0.92)' : 'var(--bg-subtle)',
                    border: theme === 'dark' ? '1px solid rgba(30, 48, 76, 0.7)' : '1px solid var(--border-subtle)',
                    opacity: theme === 'dark' ? 1 : (heroStep >= 1 ? 1 : 0.4),
                    transition: 'all 0.4s ease'
                  }}
                >
                  <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {t.landing.demoChallengeTag}
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.76rem', color: theme === 'dark' ? '#E2E8F0' : 'var(--text-primary)', fontWeight: 500, marginTop: 3, lineHeight: 1.38 }}>
                    {t.landing.demoChallengeText}
                  </div>
                </div>

                {/* Arrow connector */}
                <div style={{ textAlign: 'center', color: '#F97316', fontSize: '0.72rem', lineHeight: 1, margin: theme === 'dark' ? '-1px 0' : 0, textShadow: theme === 'dark' ? '0 0 6px rgba(249, 115, 22, 0.6)' : 'none' }}>↓</div>

                {/* 2. Business Analysis */}
                <div
                  className={theme === 'dark' ? 'voxel-step-card' : ''}
                  style={{
                    padding: theme === 'dark' ? '8px 13px 9px' : 12,
                    borderRadius: theme === 'dark' ? 6 : 8,
                    backgroundColor: theme === 'dark' ? 'rgba(13, 23, 42, 0.92)' : 'var(--bg-subtle)',
                    border: theme === 'dark' ? '1px solid rgba(30, 58, 95, 0.7)' : (heroStep >= 3 ? '1px solid #C96B3B' : '1px solid var(--border-subtle)'),
                    opacity: theme === 'dark' ? 1 : (heroStep >= 3 ? 1 : 0.35),
                    transition: 'all 0.5s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {t.landing.demoAnalysisTag}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: '#10B981', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {t.landing.demoAnalysisScore}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.72rem', color: theme === 'dark' ? '#94A3B8' : 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>
                    {t.landing.demoAnalysisPoint1}<br />
                    {t.landing.demoAnalysisPoint2}
                  </div>
                </div>

                <div style={{ textAlign: 'center', color: '#F97316', fontSize: '0.72rem', lineHeight: 1, margin: theme === 'dark' ? '-1px 0' : 0, textShadow: theme === 'dark' ? '0 0 6px rgba(249, 115, 22, 0.6)' : 'none' }}>↓</div>

                {/* 3. Recommended Solution & Architecture */}
                <div
                  className={theme === 'dark' ? 'voxel-step-card' : ''}
                  style={{
                    padding: theme === 'dark' ? '8px 13px 9px' : 12,
                    borderRadius: theme === 'dark' ? 6 : 8,
                    backgroundColor: theme === 'dark' ? 'rgba(13, 23, 42, 0.92)' : (heroStep >= 4 ? '#FFFDF9' : '#FAF9F6'),
                    border: theme === 'dark' ? '1px solid rgba(60, 45, 25, 0.7)' : (heroStep >= 4 ? '1px solid #D6A85F' : '1px solid var(--border-subtle)'),
                    opacity: theme === 'dark' ? 1 : (heroStep >= 4 ? 1 : 0.35),
                    transition: 'all 0.5s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {t.landing.demoSolutionTag}
                    </span>
                    <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#10B981', fontFamily: "'IBM Plex Mono', monospace" }}>{t.landing.demoSolutionOption}</span>
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.78rem', fontWeight: 700, color: theme === 'dark' ? '#FFFFFF' : 'var(--text-primary)', marginTop: 2 }}>
                    {t.landing.demoSolutionTitle}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: theme === 'dark' ? '#94A3B8' : 'var(--text-muted)', marginTop: 3, whiteSpace: theme === 'dark' ? 'nowrap' : 'normal' }}>
                    {t.landing.demoSolutionTech}
                  </div>
                </div>

                {/* 4. Implementation Plan State */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: theme === 'dark' ? '7px 13px' : '10px 14px',
                    borderRadius: theme === 'dark' ? 6 : 8,
                    backgroundColor: theme === 'dark' ? 'rgba(6, 44, 34, 0.95)' : (heroStep >= 5 ? 'rgba(102, 131, 107, 0.12)' : 'var(--bg-subtle)'),
                    border: theme === 'dark' ? '1px solid #059669' : (heroStep >= 5 ? '1px solid #10B981' : '1px solid var(--border-subtle)'),
                    opacity: theme === 'dark' ? 1 : (heroStep >= 5 ? 1 : 0.35),
                    transition: 'all 0.5s ease'
                  }}
                >
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.72rem', fontWeight: 600, color: theme === 'dark' ? '#FFFFFF' : 'var(--text-primary)' }}>
                    {t.landing.demoRoadmap}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.67rem', color: '#34D399', fontWeight: 700 }}>
                    {t.landing.demoRoadmapStats}
                  </span>
                </div>
              </div>

              {/* Canvas Action Footer */}
              <div
                style={{
                  padding: theme === 'dark' ? '9px 16px' : '13px 20px',
                  backgroundColor: theme === 'dark' ? '#080E1A' : 'var(--bg-subtle)',
                  borderTop: theme === 'dark' ? '1px solid rgba(30, 45, 74, 0.4)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.70rem', color: theme === 'dark' ? '#64748B' : 'var(--text-muted)' }}>
                  {t.landing.demoLiveSynthesis}
                </span>
                <button
                  onClick={handleLaunchDemo}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#F59E0B',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {theme === 'dark' ? (
                    <span>Open in Workspace →</span>
                  ) : (
                    <>
                      {t.landing.demoOpenWorkspace} <ChevronRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          9.5 PHOTO STRIP: ENTERPRISE TRANSFORMATION LIFECYCLE
          ================================================== */}
      <section
        style={{
          padding: '40px 36px 70px',
          maxWidth: 1360,
          margin: '0 auto',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#C96B3B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t.landing.stripTag}
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: 4 }}>
              {t.landing.stripTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={(e) => smoothScrollTo(e, 'transformation')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.82rem', borderColor: 'var(--border-subtle)', cursor: 'pointer' }}
          >
            {t.landing.stripExploreBtn}
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20
          }}
        >
          {[
            {
              stage: t.landing.stripStage1Tag,
              title: t.landing.stripStage1Title,
              desc: t.landing.stripStage1Desc,
              img: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&q=80',
              target: 'how-it-works'
            },
            {
              stage: t.landing.stripStage2Tag,
              title: t.landing.stripStage2Title,
              desc: t.landing.stripStage2Desc,
              img: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=700&q=80',
              target: 'transformation'
            },
            {
              stage: t.landing.stripStage3Tag,
              title: t.landing.stripStage3Title,
              desc: t.landing.stripStage3Desc,
              img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=700&q=80',
              target: 'interactive-canvas'
            },
            {
              stage: t.landing.stripStage4Tag,
              title: t.landing.stripStage4Title,
              desc: t.landing.stripStage4Desc,
              img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=700&q=80',
              target: 'showcase'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={(e) => smoothScrollTo(e, item.target)}
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = '#C96B3B';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
                <img
                  src={item.img}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(23, 23, 23, 0.75) 0%, transparent 60%)'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 12,
                    fontSize: '0.62rem',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 700,
                    color: '#FAF8F5',
                    letterSpacing: '0.06em'
                  }}
                >
                  {item.stage}
                </div>
              </div>
              <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {item.desc}
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', fontWeight: 700, color: '#C96B3B' }}>
                  <span>{t.landing.viewBlueprint}</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================
          10. SECTION: THE INPUT ("Start with what you already have")
          ================================================== */}
      <section
        id="how-it-works"
        style={{
          padding: '100px 36px',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ maxWidth: 640, marginBottom: 50 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C96B3B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.landing.step01Tag}
            </div>
            <h2 style={{ fontSize: '2.3rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginTop: 8, marginBottom: 14 }}>
              {t.landing.step01Title}
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {t.landing.step01Desc}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 18
            }}
          >
            {[
              { type: 'Business Idea', label: 'Executive Memo / Initiative Brief', format: '.txt / .md', tag: 'Strategy' },
              { type: 'BRD', label: 'Business Requirements Document', format: '.docx / .pdf', tag: 'Requirements' },
              { type: 'SOP', label: 'Standard Operating Procedures', format: '.pdf / manual', tag: 'Operations' },
              { type: 'Process Flow', label: 'Legacy Swimlanes & Bottlenecks', format: '.pptx / doc', tag: 'Workflow' },
              { type: 'Architecture', label: 'Current Systems & Perimeter Specs', format: 'APIs / DDL', tag: 'Technology' },
              { type: 'Interviews', label: 'Stakeholder Discovery Transcripts', format: 'Meeting notes', tag: 'Discovery' }
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '20px 22px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="font-mono-tech" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.format}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#C96B3B', backgroundColor: 'rgba(201, 107, 59, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                    {item.tag}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {item.type}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Real Themed Photo Showcase Card for Ingestion & Artifact Analysis */}
          <div
            style={{
              marginTop: 32,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-subtle)',
              display: 'grid',
              gridTemplateColumns: '1.05fr 1fr',
              boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ position: 'relative', minHeight: 280 }}>
              <img
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80"
                alt="Enterprise Consultants Ingesting BRDs and Architecture Specs"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to right, transparent 65%, var(--bg-subtle) 100%)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  padding: '5px 12px',
                  backgroundColor: 'rgba(23, 23, 23, 0.88)',
                  borderRadius: 4,
                  color: '#FAF8F5',
                  fontSize: '0.65rem',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 700,
                  letterSpacing: '0.06em'
                }}
              >
                {t.landing.ingestPhotoBadge}
              </div>
            </div>
            <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="font-mono-tech" style={{ fontSize: '0.72rem', color: '#C96B3B', fontWeight: 700 }}>
                {t.landing.ingestCardTag}
              </span>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 6, marginBottom: 12 }}>
                {t.landing.ingestCardTitle}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                {t.landing.ingestCardDesc}
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-gray" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>{t.landing.ingestPoint1}</span>
                <span className="badge badge-gray" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>{t.landing.ingestPoint2}</span>
                <span className="badge badge-gray" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>{t.landing.ingestPoint3}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          11. SECTION: THE TRANSFORMATION (Step-by-Step Path)
          ================================================== */}
      <section
        id="transformation"
        style={{
          padding: '110px 36px',
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%'
        }}
      >
        <div style={{ maxWidth: 720, marginBottom: 50 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C96B3B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t.landing.engineTag}
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginTop: 8, marginBottom: 14 }}>
            {t.landing.engineTitle}
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t.landing.engineDesc}
          </p>
        </div>

        {/* Horizontal Transformation Pipeline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 14,
            position: 'relative'
          }}
        >
          {[
            { step: '01', stage: 'INPUT', name: 'Problem & Discovery', desc: 'Catalog raw challenges, documents, and interview stakeholder goals.' },
            { step: '02', stage: 'UNDERSTAND', name: 'Business Analysis', desc: 'Diagnose current vs target state, pain points, and digital maturity score.' },
            { step: '03', stage: 'DESIGN', name: 'Solution & Architecture', desc: 'Scorecard 3 options, design N-tier topology, and map process swimlanes.' },
            { step: '04', stage: 'SPECIFY', name: 'UX, Database & APIs', desc: 'Visual wireframes, 3NF relational data dictionary, and REST contracts.' },
            { step: '05', stage: 'PLAN', name: 'Roadmap & Exports', desc: '12-week Agile sprint tasks, stakeholder sign-offs, and PDF package.' }
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '22px 18px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="font-mono-tech" style={{ fontSize: '0.72rem', color: '#C96B3B', fontWeight: 700 }}>
                  STEP {item.step}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  {item.stage}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                {item.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================
          12. INTERACTIVE SOLUTION CANVAS (Public Problem Builder)
          ================================================== */}
      <section
        id="interactive-canvas"
        style={{
          padding: '100px 36px',
          backgroundColor: '#171717',
          color: '#F7F6F2',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ maxWidth: 680, marginBottom: 36 }}>
            <span className="font-mono-tech" style={{ fontSize: '0.75rem', color: '#D6A85F', fontWeight: 700 }}>
              {t.landing.interactiveTag}
            </span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.025em', marginTop: 8, marginBottom: 12 }}>
              {t.landing.interactiveTitle}
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: 1.5 }}>
              {t.landing.interactiveDesc}
            </p>
          </div>

          {/* Input Box */}
          <div
            style={{
              backgroundColor: '#242424',
              borderRadius: 10,
              padding: 20,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              marginBottom: 28
            }}
          >
            <div style={{ marginBottom: 12, fontSize: '0.82rem', color: '#94A3B8' }}>
              What business challenge are you trying to solve?
            </div>

            <textarea
              rows={3}
              value={challengeInput}
              onChange={(e) => setChallengeInput(e.target.value)}
              disabled={isBuilding}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 6,
                backgroundColor: '#171717',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '0.92rem',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'none',
                marginBottom: 14
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {sampleScenarios.map((scen, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setChallengeInput(scen + ' for enterprise operations.')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#CBD5E1',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    {scen}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRunInteractiveBuilder}
                disabled={isBuilding || !challengeInput.trim()}
                className="btn"
                style={{
                  backgroundColor: '#C96B3B',
                  color: '#FFFFFF',
                  padding: '10px 24px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: isBuilding ? 'not-allowed' : 'pointer'
                }}
              >
                {isBuilding ? 'Synthesizing...' : 'Build Solution →'}
              </button>
            </div>

            {/* Controlled Live Synthesis Progress Bar */}
            {isBuilding && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
                  <span style={{ color: '#D6A85F', fontWeight: 600 }}>{buildStageLabel}</span>
                  <span className="font-mono-tech" style={{ color: '#FFFFFF' }}>{buildProgress}%</span>
                </div>
                <div style={{ height: 6, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${buildProgress}%`,
                      backgroundColor: '#C96B3B',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 13. RESULT PREVIEW (Structured Solution Blueprint Tabs) */}
          {canvasReady && (
            <div
              style={{
                backgroundColor: '#242424',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                overflow: 'hidden'
              }}
            >
              {/* Preview Nav Header */}
              <div
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#1C1C1C',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-green">✓ SOLUTION BLUEPRINT READY</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Customer Support Automation Platform</span>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { key: 'summary', label: 'Executive Summary' },
                    { key: 'arch', label: 'Architecture Specs' },
                    { key: 'data', label: 'Relational 3NF & APIs' },
                    { key: 'plan', label: '12-Week Roadmap' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActivePreviewTab(tab.key)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: activePreviewTab === tab.key ? '#C96B3B' : 'transparent',
                        color: activePreviewTab === tab.key ? '#FFFFFF' : '#94A3B8',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Body */}
              <div style={{ padding: 24 }}>
                {activePreviewTab === 'summary' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#D6A85F', fontWeight: 700, textTransform: 'uppercase' }}>
                        SOLUTION SUMMARY & VALUE PROPOSITION
                      </div>
                      <p style={{ fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.6, marginTop: 8 }}>
                        Deploys a multi-channel intent classifier with zero-shot triage. Inbound tickets are routed within 3 seconds, order tracking inquiries resolved via ERP connectors, and high-value disputes surfaced to certified operators with AI copilot draft resolutions.
                      </p>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#D6A85F', fontWeight: 700, textTransform: 'uppercase' }}>
                        TARGET BUSINESS IMPACT
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
                          <span>Straight-Through Automation:</span>
                          <strong style={{ color: '#059669' }}>68% Volume Deflected</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
                          <span>First Contact Latency:</span>
                          <strong style={{ color: '#059669' }}>2.4 min (was 18.2h)</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'arch' && (
                  <div className="font-mono-tech" style={{ fontSize: '0.8rem', color: '#CBD5E1', lineHeight: 1.6 }}>
                    <div>[Client Tier] React 18 SPA + Supervisor Touch Web App</div>
                    <div style={{ color: '#D6A85F' }}>   ↓ HTTPS / TLS 1.3 (Rate-limited, CORS strict)</div>
                    <div>[API Gateway] Express Gateway Proxy + JWT Role Verification</div>
                    <div style={{ color: '#D6A85F' }}>   ↓ Asynchronous Event Pipeline</div>
                    <div>[AI Dispatcher] Zero-shot Intent Classifier + Confidence Scoring (&gt;80%)</div>
                    <div style={{ color: '#D6A85F' }}>   ↓ ACID Relational Transaction</div>
                    <div>[Persistence] PostgreSQL / SQLite 3NF Schema + Parameterized Prisma ORM</div>
                  </div>
                )}

                {activePreviewTab === 'data' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#D6A85F', fontWeight: 700, marginBottom: 6 }}>RELATIONAL ENTITIES (3NF)</div>
                      <div className="font-mono-tech" style={{ fontSize: '0.75rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                        • User (id, email, passwordHash, role, orgId)<br />
                        • Customer (id, name, email, tier, createdAt)<br />
                        • Ticket (id, ticketNumber, customerId, status, priority, aiConfidence)<br />
                        • Department (id, name, slaHours)<br />
                        • Conversation (id, ticketId, authorType, messageBody)
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#D6A85F', fontWeight: 700, marginBottom: 6 }}>REST API ENDPOINTS</div>
                      <div className="font-mono-tech" style={{ fontSize: '0.75rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                        POST /api/v1/tickets (Ingest & initiate AI triage)<br />
                        GET  /api/v1/tickets (Paginated filtered triage queue)<br />
                        GET  /api/v1/tickets/:id (Detail + AI copilot draft)<br />
                        POST /api/v1/tickets/:id/resolve (Formal resolution)<br />
                        GET  /api/v1/analytics/overview (Throughput telemetry)
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'plan' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
                      <span>Phase 1 (Wks 1-2): Discovery & Security Sign-off</span>
                      <strong style={{ color: '#D6A85F' }}>Sprint 1</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
                      <span>Phase 2 (Wks 3-5): 3NF Schemas & Ingestion Engine</span>
                      <strong style={{ color: '#D6A85F' }}>Sprint 2-3</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4 }}>
                      <span>Phase 3 (Wks 6-8): AI Classifier & Operator Copilot</span>
                      <strong style={{ color: '#D6A85F' }}>Sprint 3-4</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#1C1C1C',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Ready to edit, version, and export this solution?
                </span>
                <button
                  onClick={handleLaunchDemo}
                  className="btn"
                  style={{
                    backgroundColor: '#C96B3B',
                    color: '#FFFFFF',
                    padding: '8px 20px',
                    borderRadius: 6,
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Open in Solution Builder →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================
          14. REAL PRODUCT SCREEN SHOWCASE
          ================================================== */}
      <section
        id="showcase"
        style={{
          padding: '110px 36px',
          backgroundColor: 'var(--bg-subtle)',
          borderTop: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 48px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C96B3B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ENTERPRISE WORKSPACE MODULES
            </span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginTop: 8, marginBottom: 12 }}>
              Everything needed to move from idea to implementation.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.55 }}>
              A unified platform combining business analyst diagnostics, software architecture design, interactive process modeling, and execution roadmapping.
            </p>
          </div>

          {/* Module Selector Chips */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {showcaseScreens.map((scr, idx) => (
              <button
                key={scr.id}
                onClick={() => setActiveShowcase(idx)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: activeShowcase === idx ? '1px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                  backgroundColor: activeShowcase === idx ? 'var(--accent-amber)' : 'var(--bg-surface)',
                  color: activeShowcase === idx ? (theme === 'dark' ? '#0B0F17' : '#FFFFFF') : 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {scr.title}
              </button>
            ))}
          </div>

          {/* Active Screen Showcase Card with Depth */}
          <div
            className="lp-shadow-elevation"
            style={{
              maxWidth: 960,
              margin: '0 auto',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 12,
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '16px 24px',
                backgroundColor: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span className="font-mono-tech" style={{ fontSize: '0.72rem', color: '#C96B3B', fontWeight: 700 }}>
                  {showcaseScreens[activeShowcase].badge}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  {showcaseScreens[activeShowcase].title}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {showcaseScreens[activeShowcase].desc}
                </div>
              </div>

              <button
                onClick={handleLaunchDemo}
                className="btn btn-secondary btn-sm"
                style={{ borderColor: 'var(--border-subtle)', fontSize: '0.78rem' }}
              >
                Open Workspace <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ padding: 24, minHeight: 340 }}>
              {showcaseScreens[activeShowcase].preview}
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          16. SECTION: HUMAN + AI (Advisory & Governance)
          ================================================== */}
      <section
        style={{
          padding: '100px 36px',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C96B3B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t.landing.governanceTag}
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginTop: 8, marginBottom: 16 }}>
                {t.landing.governanceTitle}
              </h2>
              <p style={{ fontSize: '1.02rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                {t.landing.governanceDesc}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span>{t.landing.governanceCheck1}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span>{t.landing.governanceCheck2}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span>{t.landing.governanceCheck3}</span>
                </div>
              </div>
            </div>

            {/* Human + AI Visual Governance Pipeline */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 10,
                padding: 24,
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase' }}>
                HUMAN-IN-THE-LOOP ADVISORY PIPELINE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { actor: 'ENTERPRISE STAKEHOLDER', action: 'Inputs Business Challenge & Documents', status: 'INITIATE' },
                  { actor: 'AI ENGINE', action: 'Synthesizes Intent, Architecture & Schemas', status: 'ADVISORY' },
                  { actor: 'LEAD ARCHITECT', action: 'Reviews Topology, Adjusts Nodes, Saves Version', status: 'REFINE' },
                  { actor: 'TRANSFORMATION SPONSOR', action: 'Signs Off Formal Governance Approval', status: 'APPROVE' },
                  { actor: 'ENGINEERING TEAM', action: 'Executes Implementation Roadmap & REST APIs', status: 'BUILD' }
                ].map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 6,
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div className="font-mono-tech" style={{ fontSize: '0.65rem', color: '#C96B3B', fontWeight: 700 }}>
                        {step.actor}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{step.action}</div>
                    </div>
                    <span className={step.status === 'APPROVE' ? 'badge badge-green' : 'badge badge-gray'} style={{ fontSize: '0.62rem' }}>
                      {step.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Photo Banner: Enterprise Architects Sign-off */}
              <div
                style={{
                  marginTop: 16,
                  borderRadius: 8,
                  overflow: 'hidden',
                  position: 'relative',
                  height: 140,
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"
                  alt="Enterprise Governance Boardroom Review"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(23, 23, 23, 0.85) 0%, rgba(23, 23, 23, 0.2) 60%)'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 14,
                    color: '#FAF8F5',
                    fontSize: '0.72rem',
                    fontWeight: 600
                  }}
                >
                  <span className="font-mono-tech" style={{ color: '#D6A85F', marginRight: 6 }}>HUMAN REVIEW //</span>
                  Explicit sign-off required for architecture & roadmap deployment
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          18. SECTION: BEFORE / AFTER (Split-Screen)
          ================================================== */}
      <section
        style={{
          padding: '100px 36px',
          maxWidth: 1240,
          margin: '0 auto',
          width: '100%'
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#C96B3B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t.landing.contrastTag}
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.025em', marginTop: 8 }}>
            {t.landing.contrastTitle}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left: Before */}
          <div
            style={{
              padding: 28,
              borderRadius: 10,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderTop: '4px solid #DC2626'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', marginBottom: 14 }}>
              {t.landing.contrastBefore}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <div>❌ Scattered PDF, DOCX, and PPT files across disparate cloud inboxes</div>
              <div>❌ Weeks of repetitive meetings clarifying ambiguous business requirements</div>
              <div>❌ Architecture drafted in isolation without direct connection to business KPIs</div>
              <div>❌ Database schemas, UX wireframes, and APIs designed in disconnected silos</div>
              <div>❌ Disjointed project management spreadsheets out of sync with actual architecture</div>
            </div>
          </div>

          {/* Right: With AI Solution Builder */}
          <div
            style={{
              padding: 28,
              borderRadius: 10,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderTop: '4px solid #059669'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: 14 }}>
              {t.landing.contrastAfter}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              <div>✓ One unified workspace ingesting challenges and extracting document context</div>
              <div>✓ Structured discovery conversation with advisory AI business consultant</div>
              <div>✓ Connected 10-stage pipeline: Discovery → Analysis → Architecture → Roadmap</div>
              <div>✓ Real relational 3NF models, OpenAPI REST endpoints, and visual wireframes</div>
              <div>✓ Implementation-ready roadmap with sprint tasks, budget estimates, and export package</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          19. FINAL CINEMATIC CTA
          ================================================== */}
      <section
        style={{
          position: 'relative',
          padding: '100px 36px',
          backgroundColor: '#171717',
          color: '#F7F6F2',
          overflow: 'hidden',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Real consulting photography backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
            filter: 'grayscale(100%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', maxWidth: 840, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              borderRadius: 4,
              backgroundColor: 'rgba(214, 168, 95, 0.12)',
              border: '1px solid rgba(214, 168, 95, 0.25)',
              color: '#D6A85F',
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 20
            }}
          >
            <Sparkles size={13} color="#D6A85F" />
            <span>{t.landing.ctaPill}</span>
          </div>

          <h2
            style={{
              fontSize: '3.2rem',
              fontWeight: 700,
              lineHeight: 1.15,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              marginBottom: 16
            }}
          >
            {t.landing.ctaTitle}
          </h2>

          <p
            style={{
              fontSize: '1.15rem',
              color: '#94A3B8',
              maxWidth: 580,
              margin: '0 auto 36px',
              lineHeight: 1.6
            }}
          >
            {t.landing.ctaSubtitle}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={handleLaunchDemo}
              className="btn"
              style={{
                backgroundColor: '#C96B3B',
                color: '#FFFFFF',
                padding: '14px 32px',
                borderRadius: 6,
                fontSize: '1rem',
                fontWeight: 700,
                border: 'none',
                boxShadow: '0 4px 16px rgba(201, 107, 59, 0.3)'
              }}
            >
              {t.landing.startBuilding}
            </button>

            <Link
              to="/login"
              className="btn"
              style={{
                backgroundColor: '#242424',
                color: '#F7F6F2',
                padding: '14px 26px',
                borderRadius: 6,
                fontSize: '0.95rem',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              {t.landing.signIn}
            </Link>
          </div>
        </div>
      </section>

      {/* ==================================================
          20. EDITORIAL FOOTER
          ================================================== */}
      <footer
        style={{
          padding: '40px 36px',
          backgroundColor: '#111111',
          color: '#717171',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.82rem'
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20
          }}
        >
          <div>
            <RootForgeLogo size="sm" variant="light" subtitle="TRANSFORMATION PLATFORM" />
            <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 4 }}>
              {t.landing.footerTagline}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, fontSize: '0.8rem', color: '#94A3B8' }}>
            <button
              type="button"
              onClick={(e) => smoothScrollTo(e, 'transformation')}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
            >
              {t.landing.product}
            </button>
            <button
              type="button"
              onClick={(e) => smoothScrollTo(e, 'how-it-works')}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
            >
              {t.landing.howItWorks}
            </button>
            <button
              type="button"
              onClick={(e) => smoothScrollTo(e, 'interactive-canvas')}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
            >
              {t.landing.interactiveDemo}
            </button>
            <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>{t.landing.signIn}</Link>
            <span onClick={handleLaunchDemo} style={{ color: '#D6A85F', cursor: 'pointer', fontWeight: 600 }}>
              {t.landing.startBuilding}
            </span>
          </div>

          <div className="font-mono-tech" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {t.landing.footerCopyright}
          </div>
        </div>
      </footer>
    </div>
  );
};

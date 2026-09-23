import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  Bell,
  LayoutDashboard,
  ListFilter,
  SlidersHorizontal,
  BarChart3,
  Layers,
  Sparkles
} from 'lucide-react';
import { DESIGN_ARCHETYPES } from '../uxViewModel';

// Sub-renderers for Screen Uniqueness & Render Modes
import { DashboardScreenView } from './DashboardScreenView';
import { WorkspaceQueueScreenView } from './WorkspaceQueueScreenView';
import { ConfigRulesScreenView } from './ConfigRulesScreenView';
import { AnalyticsScreenView } from './AnalyticsScreenView';
import { CustomScreenView } from './CustomScreenView';
import { BlueprintRenderer } from './BlueprintRenderer';
import { WireframeRenderer } from './WireframeRenderer';

export const GeneratedExperiencePreview = ({
  screen,
  allScreens,
  activeThemeId,
  deviceView,
  renderMode,
  domain = 'ENTERPRISE',
  onScreenChange
}) => {
  const activeArchetype = DESIGN_ARCHETYPES.find((a) => a.id === activeThemeId) || DESIGN_ARCHETYPES[0];

  // Prototype Action Feedback State
  const [prototypeActionNotice, setPrototypeActionNotice] = useState(null);

  // Screen transition animation state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedScreen, setDisplayedScreen] = useState(screen);
  const prevScreenIdRef = useRef(screen?.id);

  const isMobile = deviceView === 'mobile';

  // Smooth crossfade when switching screens
  useEffect(() => {
    if (screen && screen.id !== prevScreenIdRef.current) {
      setIsTransitioning(true);
      const fadeOutTimer = setTimeout(() => {
        setDisplayedScreen(screen);
        prevScreenIdRef.current = screen.id;
        const fadeInTimer = setTimeout(() => setIsTransitioning(false), 30);
        return () => clearTimeout(fadeInTimer);
      }, 180);
      return () => clearTimeout(fadeOutTimer);
    } else if (screen) {
      setDisplayedScreen(screen);
    }
  }, [screen?.id]);

  // Also update displayed screen data when same screen's content changes (e.g. AI edit)
  useEffect(() => {
    if (screen && screen.id === prevScreenIdRef.current) {
      setDisplayedScreen(screen);
    }
  }, [screen]);

  const handleTriggerAction = (msg) => {
    setPrototypeActionNotice(msg);
    setTimeout(() => setPrototypeActionNotice(null), 3500);
  };

  if (!screen) {
    return (
      <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No screen selected.</p>
      </div>
    );
  }

  const currentScreen = displayedScreen || screen;

  // Determine Screen Sub-Renderer based on Layout & Identity
  const isDashboard = currentScreen.layoutType === 'dashboard' || /dashboard|overview|telemetry console|status/i.test(currentScreen.name);
  const isQueue = currentScreen.layoutType === 'split-view' || /queue|intake|workflow|dispatch|triage|investigation|console/i.test(currentScreen.name);
  const isRulesConfig = currentScreen.layoutType === 'table' || currentScreen.layoutType === 'rules_config' || /rules|config|admin|schedule|policy|manager/i.test(currentScreen.name);
  const isAnalytics = currentScreen.layoutType === 'analytics' || /analytics|reporting|throughput|latency|audit/i.test(currentScreen.name);

  // Dynamic Theme Custom Properties applied directly to frame
  const themeCssVariables = {
    '--theme-bg': activeArchetype.bgPrimary,
    '--theme-surface': activeArchetype.cardBg,
    '--theme-text': activeArchetype.textPrimary,
    '--theme-muted': activeArchetype.textMuted,
    '--theme-accent': activeArchetype.accentColor,
    '--theme-accent-glow': activeArchetype.accentGlow,
    '--theme-badge-bg': activeArchetype.badgeBg,
    '--theme-badge-text': activeArchetype.badgeText,
    '--theme-border': activeArchetype.border,
    '--theme-radius': activeArchetype.borderRadius,
    '--theme-font': activeArchetype.typography,
    fontFamily: activeArchetype.typography
  };

  const frameClass = isMobile
    ? 'ux-frame-mobile'
    : deviceView === 'tablet'
    ? 'ux-frame-tablet'
    : 'ux-frame-desktop';

  // Render Mode Content Selection
  const renderScreenContent = () => {
    // Mode 1: Blueprint (Genuine Architecture Tree)
    if (renderMode === 'blueprint') {
      return (
        <BlueprintRenderer
          screen={currentScreen}
          allScreens={allScreens}
          domain={domain}
          deviceView={deviceView}
        />
      );
    }

    // Mode 2: Wireframe (Structural low-fidelity blocks)
    if (renderMode === 'wireframe') {
      return (
        <WireframeRenderer
          screen={currentScreen}
          allScreens={allScreens}
          domain={domain}
          deviceView={deviceView}
        />
      );
    }

    // Mode 3 & 4: Live UI (hifi) & Interactive Prototype
    const isPrototype = renderMode === 'prototype';

    if (isDashboard && !currentScreen.id?.includes('custom')) {
      return (
        <DashboardScreenView
          screen={currentScreen}
          allScreens={allScreens}
          domain={domain}
          deviceView={deviceView}
          isPrototype={isPrototype}
          onScreenChange={onScreenChange}
          onTriggerAction={handleTriggerAction}
        />
      );
    }

    if (isQueue && !currentScreen.id?.includes('custom')) {
      return (
        <WorkspaceQueueScreenView
          screen={currentScreen}
          allScreens={allScreens}
          domain={domain}
          deviceView={deviceView}
          isPrototype={isPrototype}
          onScreenChange={onScreenChange}
          onTriggerAction={handleTriggerAction}
        />
      );
    }

    if (isRulesConfig && !currentScreen.id?.includes('custom')) {
      return (
        <ConfigRulesScreenView
          screen={currentScreen}
          allScreens={allScreens}
          domain={domain}
          deviceView={deviceView}
          isPrototype={isPrototype}
          onTriggerAction={handleTriggerAction}
        />
      );
    }

    if (isAnalytics && !currentScreen.id?.includes('custom')) {
      return (
        <AnalyticsScreenView
          screen={currentScreen}
          allScreens={allScreens}
          domain={domain}
          deviceView={deviceView}
          isPrototype={isPrototype}
          onTriggerAction={handleTriggerAction}
        />
      );
    }

    // Fallback or user-added custom screen
    return (
      <CustomScreenView
        screen={currentScreen}
        allScreens={allScreens}
        domain={domain}
        deviceView={deviceView}
        isPrototype={isPrototype}
        onTriggerAction={handleTriggerAction}
      />
    );
  };

  const isLight = activeArchetype.mode === 'light' || activeArchetype.id === 'warm-cream';
  const browserChromeBg = isLight ? '#F5EFE6' : (activeArchetype.cardBg || '#111827');

  return (
    <div className="ux-canvas-area">
      {/* Device Frame with Dynamic Theme Tokens Injected */}
      <div
        className={`${frameClass} ux-themed-frame`}
        style={{
          ...themeCssVariables,
          backgroundColor: activeArchetype.bgPrimary || '#0F172A',
          color: activeArchetype.textPrimary || '#F8FAFC',
          transition: 'background-color 0.4s ease, color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
          borderColor: isMobile ? '#1E232D' : (activeArchetype.border || (isLight ? 'rgba(28, 25, 23, 0.12)' : 'rgba(255,255,255,0.08)'))
        }}
      >
        {/* TOP BAR: True Smartphone Status Bar vs Desktop Browser Header */}
        {isMobile ? (
          <div>
            {/* 1. iOS / Modern Mobile Status Bar */}
            <div
              style={{
                backgroundColor: activeArchetype.bgPrimary,
                color: activeArchetype.textPrimary,
                padding: '8px 18px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderBottom: `1px solid ${activeArchetype.border || 'rgba(255,255,255,0.05)'}`,
                transition: 'background-color 0.4s ease, color 0.35s ease'
              }}
            >
              {/* Left: Time */}
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                9:41
              </span>

              {/* Center: Dynamic Island Pill */}
              <div
                style={{
                  width: 96,
                  height: 22,
                  borderRadius: 12,
                  backgroundColor: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#1E293B' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#10B981' }} />
                </div>
              </div>

              {/* Right: Signal, WiFi, Battery */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: activeArchetype.textPrimary }}>
                <Signal size={12} />
                <Wifi size={12} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Battery size={14} />
                </div>
              </div>
            </div>

            {/* 2. Mobile App Header */}
            <div
              style={{
                backgroundColor: activeArchetype.cardBg,
                borderBottom: `1px solid ${activeArchetype.border || 'rgba(255,255,255,0.08)'}`,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background-color 0.4s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: activeArchetype.badgeBg || 'rgba(217, 119, 6, 0.15)',
                    color: activeArchetype.accentColor || '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  ⚡
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: activeArchetype.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentScreen.name}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: activeArchetype.textMuted }}>
                    {domain} • Mobile Experience
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.625rem',
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: activeArchetype.badgeBg || 'rgba(217, 119, 6, 0.15)',
                  color: activeArchetype.accentColor || '#D97706',
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {renderMode.toUpperCase()}
              </span>
            </div>
          </div>
        ) : (
          /* Desktop & Tablet Browser Top Chrome */
          <div
            className="ux-browser-header"
            style={{
              backgroundColor: browserChromeBg,
              borderBottom: `1px solid ${activeArchetype.border || (isLight ? 'rgba(28, 25, 23, 0.1)' : 'rgba(255,255,255,0.08)')}`,
              transition: 'background-color 0.4s ease, border-color 0.35s ease'
            }}
          >
            <div className="ux-browser-dots">
              <span className="ux-dot red" />
              <span className="ux-dot yellow" />
              <span className="ux-dot green" />
            </div>

            <div
              className="ux-url-bar"
              style={{
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                color: isLight ? '#57534E' : '#CBD5E1',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid transparent',
                transition: 'all 0.3s ease'
              }}
            >
              https://app.rootforge.io/preview/{domain.toLowerCase()}/{currentScreen.id}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem' }}>
              <span style={{ fontWeight: 600, color: activeArchetype.textPrimary || '#F8FAFC', transition: 'color 0.3s ease' }}>
                {currentScreen.name}
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: 4,
                  backgroundColor: activeArchetype.badgeBg || 'rgba(217, 119, 6, 0.15)',
                  color: activeArchetype.accentColor || '#D97706',
                  fontWeight: 700,
                  transition: 'background-color 0.35s ease, color 0.35s ease'
                }}
              >
                {renderMode.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Prototype Action Banner */}
        {prototypeActionNotice && (
          <div
            style={{
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              padding: '8px 14px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <CheckCircle2 size={15} /> {prototypeActionNotice}
          </div>
        )}

        {/* Frame Content Body with crossfade transition */}
        <div
          className="ux-frame-content"
          style={{
            backgroundColor: activeArchetype.bgPrimary || '#0F172A',
            transition: 'background-color 0.4s ease',
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(6px)' : 'translateY(0)',
            transitionProperty: 'opacity, transform, background-color',
            transitionDuration: '0.22s, 0.22s, 0.4s',
            transitionTimingFunction: 'ease',
            padding: isMobile ? '12px' : '20px'
          }}
        >
          {renderScreenContent()}
        </div>

        {/* MOBILE BOTTOM NAVIGATION & HOME INDICATOR */}
        {isMobile && (
          <div
            style={{
              backgroundColor: activeArchetype.cardBg,
              borderTop: `1px solid ${activeArchetype.border || 'rgba(255,255,255,0.08)'}`,
              padding: '6px 8px 4px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              transition: 'background-color 0.4s ease'
            }}
          >
            {/* Screen Tab Navigation Bar */}
            {allScreens && allScreens.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  padding: '2px 0'
                }}
              >
                {allScreens.slice(0, 4).map((s, idx) => {
                  const isCurrent = s.id === currentScreen.id;
                  const IconComp = idx === 0 ? LayoutDashboard : idx === 1 ? ListFilter : idx === 2 ? SlidersHorizontal : BarChart3;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onScreenChange && onScreenChange(s.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        color: isCurrent ? (activeArchetype.accentColor || '#D97706') : activeArchetype.textMuted,
                        padding: '4px 8px',
                        borderRadius: 6,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <IconComp size={15} />
                      <span style={{ fontSize: '0.625rem', fontWeight: isCurrent ? 800 : 500, maxWidth: 65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* iOS Home Indicator Pill */}
            <div
              style={{
                width: 120,
                height: 4,
                borderRadius: 2,
                backgroundColor: activeArchetype.textPrimary,
                opacity: 0.35,
                margin: '4px auto 2px'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

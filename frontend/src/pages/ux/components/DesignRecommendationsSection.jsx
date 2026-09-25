import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check, Sun, Moon, Sparkles } from 'lucide-react';
import { DESIGN_ARCHETYPES } from '../uxViewModel';

export const DesignRecommendationsSection = ({
  recommendations,
  activeThemeId,
  onSelectTheme
}) => {
  // Pulse animation on selection
  const [pulseId, setPulseId] = useState(null);
  const prevThemeRef = useRef(activeThemeId);

  useEffect(() => {
    if (activeThemeId !== prevThemeRef.current) {
      setPulseId(activeThemeId);
      prevThemeRef.current = activeThemeId;
      const timer = setTimeout(() => setPulseId(null), 600);
      return () => clearTimeout(timer);
    }
  }, [activeThemeId]);

  // Construct curated themes: exactly 1 White/Cream theme + 2 Dark Side themes
  const displayThemes = (() => {
    // 1. White/Cream Theme Archetype
    const creamArch = DESIGN_ARCHETYPES.find((a) => a.id === 'warm-cream') || DESIGN_ARCHETYPES[0];
    const creamRec = recommendations?.find((r) => r.id === 'warm-cream');

    const themeCream = {
      ...creamArch,
      name: 'Warm Cream & Ivory',
      tagline: 'Warm ivory canvas, soft cream cards & rich espresso accents',
      tag: 'Light • Warm Cream',
      reason: creamRec?.reason || creamRec?.rationale || 'Clean ivory canvas with warm cream cards and espresso amber accents for executive clarity.',
      mode: 'light',
      bgPrimary: '#F6F1E8',
      cardBg: '#FFFDF8',
      surface: '#FFFDF8',
      surfaceSecondary: '#F1E9DD',
      accentColor: '#8B4513',
      accentGlow: 'rgba(139, 69, 19, 0.15)',
      badgeBg: 'rgba(139, 69, 19, 0.1)',
      badgeText: '#8B4513',
      textPrimary: '#29231F',
      textMuted: '#746B62',
      textSecondary: '#746B62',
      border: '#D8CCBC',
      success: '#2F7D5B',
      warning: '#B7791F',
      danger: '#B84A4A',
      borderRadius: '10px',
      typography: 'Plus Jakarta Sans & Inter',
      isRecommended: true
    };

    // 2. Dark Side Themes
    const darkRecs = (recommendations || []).filter((r) => r.id !== 'warm-cream');
    const darkArch1 = darkRecs[0]
      ? (DESIGN_ARCHETYPES.find((a) => a.id === darkRecs[0].id) || DESIGN_ARCHETYPES[1])
      : DESIGN_ARCHETYPES[1]; // saas-modern

    const themeDark1 = {
      ...darkArch1,
      name: darkRecs[0]?.name || darkArch1.name,
      tag: darkRecs[0]?.tag || darkArch1.tag || 'Dark Side • Slate Modern',
      reason: darkRecs[0]?.reason || darkRecs[0]?.rationale || darkArch1.tagline,
      accentColor: darkRecs[0]?.accentColor || darkArch1.accentColor,
      isRecommended: false,
      mode: 'dark'
    };

    const darkArch2 = darkRecs[1]
      ? (DESIGN_ARCHETYPES.find((a) => a.id === darkRecs[1].id) || DESIGN_ARCHETYPES[2])
      : DESIGN_ARCHETYPES[2]; // cyber-ops

    const themeDark2 = {
      ...darkArch2,
      name: darkRecs[1]?.name || darkArch2.name,
      tag: darkRecs[1]?.tag || darkArch2.tag || 'Dark Side • Obsidian Ops',
      reason: darkRecs[1]?.reason || darkRecs[1]?.rationale || darkArch2.tagline,
      accentColor: darkRecs[1]?.accentColor || darkArch2.accentColor,
      isRecommended: false,
      mode: 'dark'
    };

    return [themeCream, themeDark1, themeDark2];
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={18} color="var(--accent-amber)" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            AI Design Recommendations & Theme Direction
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#D97706', fontWeight: 600 }}>
            <Sun size={13} /> 1 White / Warm Cream
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#38BDF8', fontWeight: 600 }}>
            <Moon size={13} /> 2 Dark Side Themes
          </span>
        </div>
      </div>

      {/* 3 Themes Grid: 1 White Cream + 2 Dark Side */}
      <div className="ux-theme-grid">
        {displayThemes.map((theme) => {
          const isSelected = activeThemeId === theme.id;
          const isPulsing = pulseId === theme.id;
          const isLight = theme.mode === 'light';

          return (
            <div
              key={theme.id}
              onClick={() => onSelectTheme(theme.id)}
              className={`ux-theme-card ${isSelected ? 'active' : ''}`}
              style={{
                borderColor: isSelected ? (theme.accentColor || 'var(--accent-amber)') : undefined,
                boxShadow: isSelected ? `0 0 16px ${theme.accentGlow || 'rgba(217, 119, 6, 0.25)'}` : undefined,
                transform: isPulsing ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Header: Title + Mode Badge */}
                <div className="ux-theme-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {theme.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isLight ? (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#B45309',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Sun size={11} /> Light / Cream
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: '#38BDF8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Moon size={11} /> Dark Side
                      </span>
                    )}

                    {theme.isRecommended && (
                      <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                        Curated
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Stylized Mini Mockup Swatch Box */}
                <div
                  style={{
                    backgroundColor: theme.bgPrimary,
                    border: `1px solid ${theme.border}`,
                    borderRadius: theme.borderRadius,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: theme.textPrimary, fontFamily: theme.typography }}>
                      {isLight ? 'Ivory Canvas & Cream Surface' : 'Obsidian & Slate Surface'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.55rem',
                        padding: '1px 5px',
                        borderRadius: 3,
                        backgroundColor: theme.badgeBg || 'rgba(0,0,0,0.05)',
                        color: theme.badgeText || theme.accentColor,
                        fontWeight: 700
                      }}
                    >
                      LIVE UI
                    </div>
                  </div>

                  {/* Mock card inside canvas */}
                  <div
                    style={{
                      backgroundColor: theme.cardBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    <span style={{ fontSize: '0.65rem', color: theme.textMuted }}>
                      Sample Content
                    </span>
                    <div
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: theme.accentColor,
                        color: '#FFFFFF',
                        fontSize: '0.6rem',
                        fontWeight: 700
                      }}
                    >
                      Accent
                    </div>
                  </div>
                </div>

                {/* Color Swatches and Token Specs */}
                <div className="ux-theme-swatches" style={{ marginTop: 2 }}>
                  <div
                    className="ux-swatch"
                    style={{
                      backgroundColor: theme.accentColor,
                      boxShadow: isSelected ? `0 0 8px ${theme.accentColor}` : 'none',
                      transition: 'box-shadow 0.3s ease'
                    }}
                    title={`Primary Accent: ${theme.accentColor}`}
                  />
                  <div
                    className="ux-swatch"
                    style={{ backgroundColor: theme.cardBg }}
                    title={`Card Surface: ${theme.cardBg}`}
                  />
                  <div
                    className="ux-swatch"
                    style={{ backgroundColor: theme.bgPrimary }}
                    title={`Background Canvas: ${theme.bgPrimary}`}
                  />
                  <div
                    className="ux-swatch"
                    style={{ backgroundColor: theme.textPrimary }}
                    title={`Primary Text: ${theme.textPrimary}`}
                  />

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {theme.borderRadius}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      •
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {theme.typography.split('&')[0].trim()}
                    </span>
                  </div>
                </div>

                {/* Rationale description */}
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '2px 0 0', lineHeight: 1.4 }}>
                  {theme.reason}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTheme(theme.id);
                }}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginTop: 6,
                  backgroundColor: isSelected ? (theme.accentColor || undefined) : undefined,
                  borderColor: isSelected ? (theme.accentColor || undefined) : undefined,
                  transition: 'all 0.3s ease'
                }}
              >
                {isSelected ? <Check size={13} /> : null}
                {isSelected ? 'Active Direction' : 'Use This Direction'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

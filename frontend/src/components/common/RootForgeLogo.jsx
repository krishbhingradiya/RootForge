import React from 'react';

export const RootForgeLogo = ({
  size = 'md',
  variant = 'dark', // 'dark' = for light backgrounds (dark text), 'light' = for dark backgrounds (light text)
  showSubtitle = true,
  subtitle = 'SOLUTION BUILDER',
  style = {}
}) => {
  const sizeConfig = {
    xs: { iconSize: 24, fontSize: '0.95rem', subSize: '0.55rem', gap: 6 },
    sm: { iconSize: 28, fontSize: '1rem', subSize: '0.6rem', gap: 8 },
    md: { iconSize: 36, fontSize: '1.25rem', subSize: '0.65rem', gap: 10 },
    lg: { iconSize: 48, fontSize: '1.65rem', subSize: '0.75rem', gap: 12 }
  }[size] || { iconSize: 36, fontSize: '1.25rem', subSize: '0.65rem', gap: 10 };

  const rootTextColor = variant === 'light' ? '#FAF8F5' : (variant === 'dark' ? '#171717' : 'var(--text-primary)');
  const subTextColor = variant === 'light' ? '#94A3B8' : (variant === 'dark' ? '#71717A' : 'var(--text-muted)');

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: sizeConfig.gap, ...style }}>
      {/* Precision Geometric SVG Icon Mark */}
      <svg
        width={sizeConfig.iconSize}
        height={sizeConfig.iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 6px rgba(201, 107, 59, 0.2))' }}
      >
        <defs>
          <linearGradient id={`rf_bg_${size}_${variant}`} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E1E24" />
            <stop offset="100%" stopColor="#121214" />
          </linearGradient>
          <linearGradient id={`rf_brand_${size}_${variant}`} x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E88B52" />
            <stop offset="50%" stopColor="#C96B3B" />
            <stop offset="100%" stopColor="#A54F22" />
          </linearGradient>
          <linearGradient id={`rf_spark_${size}_${variant}`} x1="18" y1="14" x2="30" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Outer Shield/Container */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="9"
          fill={`url(#rf_bg_${size}_${variant})`}
          stroke={variant === 'light' ? 'rgba(255,255,255,0.15)' : '#2D2D35'}
          strokeWidth="1.5"
        />

        {/* Geometric R+F Connected Motif */}
        <path
          d="M15 13H27C30.866 13 34 16.134 34 20C34 23.866 30.866 27 27 27H21V35H15V13Z"
          fill={`url(#rf_brand_${size}_${variant})`}
          fillOpacity="0.28"
          stroke={`url(#rf_brand_${size}_${variant})`}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M23 27L33 35"
          stroke={`url(#rf_spark_${size}_${variant})`}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Synapse Connection Nodes */}
        <circle cx="21" cy="20" r="2.2" fill="#FAF8F5" />
        <circle cx="33" cy="35" r="2.2" fill={`url(#rf_spark_${size}_${variant})`} />
      </svg>

      {/* 2-Word Mix Brand Wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <div
          style={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            fontSize: sizeConfig.fontSize,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            display: 'flex',
            alignItems: 'baseline'
          }}
        >
          <span style={{ color: rootTextColor }}>Root</span>
          <span
            style={{
              background: 'linear-gradient(135deg, #C96B3B 0%, #D97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Forge
          </span>
        </div>

        {showSubtitle && (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: sizeConfig.subSize,
              fontWeight: 600,
              color: subTextColor,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 2
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default RootForgeLogo;

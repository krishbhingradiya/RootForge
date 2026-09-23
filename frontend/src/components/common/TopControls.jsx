import React from 'react';
import { Globe, Sun, Moon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

/**
 * Standardized Top-Right Controls Component
 * Provides responsive, accessible, >= 44px touch targets for:
 * 1. Language selector ("English" / "हिन्दी" / "ગુજરાતી")
 * 2. Theme selector ("Light / Dark" with Sun/Moon icon)
 */
export const TopControls = ({ className = '' }) => {
  const { lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`app-top-controls-group ${className}`} role="toolbar" aria-label="Quick Settings">
      {/* 1. Language Selector Dropdown */}
      <div
        className="app-top-control-item"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--bg-surface)',
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          minHeight: 44,
          minWidth: 44,
          boxSizing: 'border-box'
        }}
      >
        <Globe size={16} color="var(--text-muted, #64748B)" aria-hidden="true" />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Select Language"
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
          <option value="gu">ગુજરાતી</option>
        </select>
      </div>

      {/* 2. Theme Selector Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="app-top-control-btn"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '6px 12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          minHeight: 44,
          minWidth: 44,
          boxSizing: 'border-box'
        }}
        title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      >
        {theme === 'dark' ? (
          <>
            <Sun size={16} color="#F59E0B" aria-hidden="true" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {lang === 'hi' ? 'लाइट' : lang === 'gu' ? 'લાઇટ' : 'Light'}
            </span>
          </>
        ) : (
          <>
            <Moon size={16} color="var(--text-muted, #64748B)" aria-hidden="true" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {lang === 'hi' ? 'डार्क' : lang === 'gu' ? 'ડાર્ક' : 'Dark'}
            </span>
          </>
        )}
      </button>
    </div>
  );
};

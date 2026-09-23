import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ThemeTransitionOverlay } from '../components/common/ThemeTransitionOverlay';
import { updateNativeStatusBar } from '../services/nativeService';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const v2Theme = localStorage.getItem('rootforge_theme_v2');
      if (v2Theme === 'dark' || v2Theme === 'light') {
        return v2Theme;
      }
      // First run or upgrade: default strictly to 'dark' mode
      localStorage.setItem('rootforge_theme_v2', 'dark');
      localStorage.setItem('rootforge_theme', 'dark');
    } catch (e) {
      // LocalStorage access error fallback
    }
    return 'dark';
  });

  const [transitionState, setTransitionState] = useState(null);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('rootforge_theme_v2', theme);
      localStorage.setItem('rootforge_theme', theme);
    } catch (e) {}

    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    updateNativeStatusBar(theme === 'dark');
  }, [theme]);

  const handleTransitionEnd = useCallback(() => {
    setTransitionState(null);
    isTransitioningRef.current = false;
  }, []);

  const triggerThemeTransition = (targetTheme, eventOrCoords) => {
    if (targetTheme === theme) return;
    if (isTransitioningRef.current) return;

    // Check accessibility prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setThemeState(targetTheme);
      return;
    }

    // Extract origin coordinates
    let originX = window.innerWidth - 80;
    let originY = 36;

    if (eventOrCoords) {
      if (eventOrCoords.currentTarget && typeof eventOrCoords.currentTarget.getBoundingClientRect === 'function') {
        const rect = eventOrCoords.currentTarget.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
      } else if (typeof eventOrCoords.clientX === 'number' && typeof eventOrCoords.clientY === 'number') {
        originX = eventOrCoords.clientX;
        originY = eventOrCoords.clientY;
      } else if (typeof eventOrCoords.x === 'number' && typeof eventOrCoords.y === 'number') {
        originX = eventOrCoords.x;
        originY = eventOrCoords.y;
      }
    }

    const rootEl = document.getElementById('root');
    if (!rootEl) {
      setThemeState(targetTheme);
      return;
    }

    isTransitioningRef.current = true;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const snapshotNode = rootEl.cloneNode(true);

    // Mount fragmentation overlay with current page snapshot
    setTransitionState({
      originX,
      originY,
      scrollX,
      scrollY,
      snapshotNode,
      targetTheme,
      currentTheme: theme
    });

    // Switch active theme on underlying document
    setThemeState(targetTheme);
  };

  const setTheme = (newTheme, eventOrCoords) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      triggerThemeTransition(newTheme, eventOrCoords);
    }
  };

  const toggleTheme = (eventOrCoords) => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    triggerThemeTransition(nextTheme, eventOrCoords);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        isTransitioning: !!transitionState
      }}
    >
      {children}
      <ThemeTransitionOverlay
        transitionState={transitionState}
        onTransitionEnd={handleTransitionEnd}
      />
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

import React, { useState, useEffect, useRef } from 'react';
import './RobotLoadingOverlay.css';

/**
 * RobotLoadingOverlay
 * 
 * Authoritative temporary loading/processing indicator using the official robot video.
 * Features:
 * - Anti-flicker threshold (~180ms) to prevent visual flash on instant operations
 * - Smooth entrance (fade-in, scale-in, 280ms) and exit (fade-out, 240ms)
 * - Muted, inline autoplay, seamless loop for longer operations
 * - Complete unmount when loading finishes; video stopped immediately
 * - Respects prefers-reduced-motion
 */
export const RobotLoadingOverlay = ({
  isLoading = false,
  message = 'Thinking...',
  delay = 180,
  videoSrc = '/assets/robot-loading.mp4',
  fallbackSrc = '/video_ani/video.mp4'
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [animState, setAnimState] = useState('initial'); // 'initial' | 'enter' | 'exit'
  const [hasSidebar, setHasSidebar] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);

  // Dynamic detection of sidebar in DOM to ensure overlay only covers MAIN CONTENT AREA
  useEffect(() => {
    const updateSidebarPresence = () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      const sidebarEl = document.querySelector('.sidebar');
      const isVisible = Boolean(
        sidebarEl &&
        window.innerWidth > 900 &&
        window.getComputedStyle(sidebarEl).display !== 'none'
      );
      setHasSidebar(isVisible);
    };

    updateSidebarPresence();
    window.addEventListener('resize', updateSidebarPresence);

    let observer = null;
    if (typeof document !== 'undefined' && document.body) {
      observer = new MutationObserver(updateSidebarPresence);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', updateSidebarPresence);
      if (observer) observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // Clear any pending exit or entrance timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (isLoading) {
      // Mount overlay smoothly with short threshold
      timerRef.current = setTimeout(() => {
        setIsMounted(true);
        setAnimState('enter');
      }, delay);
    } else {
      // As soon as loading finishes: instantly pause video and unmount overlay
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        } catch {}
      }

      if (isMounted) {
        // Fast dismissal: unmount immediately so user never waits for video
        setIsMounted(false);
        setAnimState('initial');
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [isLoading, delay, isMounted]);

  // Video playback management: Start playing only while loading is active
  useEffect(() => {
    if (isMounted && isLoading && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => {
        console.debug('Robot video autoPlay prevented:', err?.message);
      });
    }
  }, [isMounted, isLoading]);

  // Seamless looping only while loading is still active
  const handleVideoEnded = () => {
    if (videoRef.current && isLoading) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  if (!isMounted) return null;

  return (
    <div
      className={`robot-loading-backdrop robot-loading-overlay robot-loading-${animState} ${hasSidebar ? 'has-sidebar' : 'no-sidebar'}`}
      role="status"
      aria-live="polite"
      aria-label="AI Solution Builder loading animation"
    >
      <div className="robot-loading-content">
        <div className="robot-video-wrapper">
          <video
            ref={videoRef}
            className="robot-video"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            onEnded={handleVideoEnded}
            aria-label="AI Solution Builder loading robot"
          >
            <source src={videoSrc} type="video/mp4" />
            <source src={fallbackSrc} type="video/mp4" />
          </video>
        </div>

        {message && (
          <div className="robot-loading-message">
            <span>{message}</span>
            <span className="robot-loading-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

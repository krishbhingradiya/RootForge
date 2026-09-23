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
    // Clear any pending exit timers when isLoading state changes
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (isLoading) {
      // 1. Anti-flicker protection (180ms threshold): Prevent flash on instant ops
      timerRef.current = setTimeout(() => {
        setIsMounted(true);
        setAnimState('initial');

        // Trigger entrance animation on next animation frame
        requestAnimationFrame(() => {
          setAnimState('enter');
        });
      }, delay);
    } else {
      // Fast load completed before threshold -> cancel mount (no flicker)
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // If already mounted, stop video immediately (CASE A) and fade out
      if (isMounted) {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }

        setAnimState('exit');
        exitTimerRef.current = setTimeout(() => {
          setIsMounted(false);
          setAnimState('initial');
        }, 240); // Matches CSS exit transition
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [isLoading, delay, isMounted]);

  // Video playback management: Start playing when entrance begins
  useEffect(() => {
    if (isMounted && animState === 'enter' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => {
        console.debug('Robot video autoPlay prevented:', err?.message);
      });
    }
  }, [isMounted, animState]);

  // Seamless looping when video ends while loading is still active (CASE B)
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

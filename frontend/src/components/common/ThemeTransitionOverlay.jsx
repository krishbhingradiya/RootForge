import React, { useEffect, useRef, useState } from 'react';

/**
 * ThemeTransitionOverlay
 * 
 * Implements a cinematic, origin-aware page break-into-chunks transition:
 * 1. Captures visible page state without layout shift.
 * 2. Generates a responsive grid of visual fragments (10x6 desktop, 6x4 tablet, 4x4 mobile).
 * 3. Propagates a cascading transformation wave outward from the click origin.
 * 4. Micro-animates fragments (scale 1 -> 0.97, subtle micro-rotation, smooth dissolve).
 * 5. Reveals the target theme underneath and cleanly cleans up DOM.
 */
export const ThemeTransitionOverlay = ({
  transitionState,
  onTransitionEnd
}) => {
  const containerRef = useRef(null);
  const [tiles, setTiles] = useState([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!transitionState) {
      setTiles([]);
      setIsReady(false);
      return;
    }

    const { originX, originY, scrollY, targetTheme } = transitionState;

    // Viewport dimensions
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Responsive grid resolution
    let cols = 10;
    let rows = 6;
    if (W < 640) {
      cols = 4;
      rows = 4;
    } else if (W < 1024) {
      cols = 6;
      rows = 4;
    }

    const tileW = W / cols;
    const tileH = H / rows;

    // Origin coordinate (default to top-right if not provided)
    const ox = typeof originX === 'number' ? originX : W - 80;
    const oy = typeof originY === 'number' ? originY : 36;

    // Max possible distance to screen edge
    const maxDist = Math.hypot(
      Math.max(ox, W - ox),
      Math.max(oy, H - oy)
    ) || 1;

    const generatedTiles = [];
    let maxTotalTime = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * tileW;
        const y = r * tileH;
        const centerX = x + tileW / 2;
        const centerY = y + tileH / 2;

        const dist = Math.hypot(centerX - ox, centerY - oy);
        const normDist = dist / maxDist;

        // Base wave delay: 0ms to 420ms
        const baseDelay = normDist * 420;
        // Deterministic organic AI jitter (±18ms)
        const jitter = Math.sin((c + 1) * 2.7 + (r + 1) * 4.1) * 18;
        const delay = Math.max(0, Math.round(baseDelay + jitter));

        // Alternating micro-rotation: between -0.4deg and +0.4deg
        const rotDir = (c + r) % 2 === 0 ? 1 : -1;
        const microRot = ((c * 7 + r * 11) % 5 + 2) * 0.08 * rotDir;

        const duration = 520;
        const totalTileTime = delay + duration;
        if (totalTileTime > maxTotalTime) {
          maxTotalTime = totalTileTime;
        }

        generatedTiles.push({
          id: `chunk-${r}-${c}`,
          c,
          r,
          x,
          y,
          width: tileW,
          height: tileH,
          delay,
          duration,
          microRot,
          contentLeft: -x,
          contentTop: -y - (scrollY || 0),
          originX: ox,
          originY: oy
        });
      }
    }

    setTiles(generatedTiles);

    // Give DOM 1 animation frame to mount tiles before triggering active animation
    const rafId = requestAnimationFrame(() => {
      setIsReady(true);
    });

    // Cleanup timer after the furthest tile finishes
    const cleanupTimer = setTimeout(() => {
      onTransitionEnd?.();
    }, maxTotalTime + 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(cleanupTimer);
    };
  }, [transitionState, onTransitionEnd]);

  if (!transitionState || tiles.length === 0) {
    return null;
  }

  const { snapshotNode, scrollY, targetTheme } = transitionState;

  return (
    <div
      ref={containerRef}
      className={`rf-theme-transition-overlay ${isReady ? 'rf-animating' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      {tiles.map((tile) => (
        <TileFragment
          key={tile.id}
          tile={tile}
          snapshotNode={snapshotNode}
          scrollY={scrollY}
          targetTheme={targetTheme}
          isReady={isReady}
        />
      ))}
    </div>
  );
};

const TileFragment = React.memo(({
  tile,
  snapshotNode,
  targetTheme,
  isReady
}) => {
  const tileContentRef = useRef(null);

  useEffect(() => {
    if (tileContentRef.current && snapshotNode) {
      // Clone snapshot DOM node into this fragment tile
      const clone = snapshotNode.cloneNode(true);
      clone.style.pointerEvents = 'none';
      clone.style.userSelect = 'none';
      clone.style.position = 'absolute';
      clone.style.top = `${tile.contentTop}px`;
      clone.style.left = `${tile.contentLeft}px`;
      clone.style.width = '100vw';
      clone.style.margin = '0';
      clone.setAttribute('aria-hidden', 'true');

      // Clear previous clone and append
      tileContentRef.current.innerHTML = '';
      tileContentRef.current.appendChild(clone);
    }
  }, [snapshotNode, tile.contentLeft, tile.contentTop]);

  const transformStyle = isReady
    ? `scale(0.97) rotate(${tile.microRot}deg)`
    : 'scale(1) rotate(0deg)';

  return (
    <div
      className="rf-transition-tile"
      style={{
        position: 'absolute',
        left: `${tile.x}px`,
        top: `${tile.y}px`,
        width: `${tile.width + 0.5}px`, // 0.5px subpixel bleed prevents seams
        height: `${tile.height + 0.5}px`,
        overflow: 'hidden',
        willChange: 'transform, opacity',
        transformOrigin: `${tile.originX < tile.x ? 'left' : 'right'} ${tile.originY < tile.y ? 'top' : 'bottom'}`,
        transition: isReady
          ? `transform ${tile.duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${tile.delay}ms, opacity ${tile.duration - 40}ms ease-in-out ${tile.delay}ms`
          : 'none',
        transform: transformStyle,
        opacity: isReady ? 0 : 1
      }}
    >
      {/* Visual content slice of the current page */}
      <div
        ref={tileContentRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden'
        }}
      />

      {/* Enterprise AI holographic boundary glow during conversion */}
      <div
        className="rf-tile-edge"
        style={{
          position: 'absolute',
          inset: 0,
          border: targetTheme === 'dark'
            ? '1px solid rgba(245, 158, 11, 0.22)'
            : '1px solid rgba(37, 99, 235, 0.20)',
          pointerEvents: 'none',
          opacity: isReady ? 0 : 0.8,
          transition: isReady ? `opacity ${tile.duration}ms ease ${tile.delay}ms` : 'none'
        }}
      />
    </div>
  );
});

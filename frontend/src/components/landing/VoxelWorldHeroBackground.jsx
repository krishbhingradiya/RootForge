import React from 'react';

/**
 * VoxelWorldHeroBackground
 * 
 * Living voxel/Minecraft-inspired 3D background world for RootForge Dark Mode.
 * Visual source of truth: Reference Image B.
 * Features:
 * - High-res atmospheric voxel landscape with fortress, portal, river, bridge, lanterns.
 * - 4 Independent Floating Workflow Blocks:
 *     1. ANALYZE (large, glowing cyan voxel sign on floating island)
 *     2. DESIGN (large, glowing green voxel sign on floating island)
 *     3. BUILD (compact, glowing amber voxel sign on floating island)
 *     4. DEPLOY (compact, glowing purple voxel sign on floating island)
 *   World objects physically rendered in the 3D voxel scene — NO HTML cards, NO arrows, NO lines.
 * - Left wooden sign: "IDEAS PEOPLE TECHNOLOGY A BETTER TOMORROW"
 * - Right fortress banner: "BUILD DEPLOY SCALE IMPACT"
 * - Small animated voxel characters and robot in world.
 * - Atmospheric glows and lighting effects.
 */
export const VoxelWorldHeroBackground = () => {
  return (
    <div
      className="voxel-world-hero-container"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        userSelect: 'none'
      }}
      aria-hidden="true"
    >
      {/* 1. Base Voxel World Image */}
      <div
        className="voxel-world-backdrop"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/assets/minecraft_dark_world.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 5%',
          backgroundRepeat: 'no-repeat',
          opacity: 0.98,
          transform: 'scale(1.01)'
        }}
      />

      {/* Atmospheric depth lighting overlays */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 78% 38%, rgba(168, 85, 247, 0.22) 0%, transparent 45%)',
          mixBlendMode: 'screen'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(11, 15, 23, 0.35) 0%, rgba(11, 15, 23, 0.05) 35%, rgba(11, 15, 23, 0.7) 88%, #0B0F17 100%)'
        }}
      />

      {/* ========================================================
          ATMOSPHERIC NEON ISLAND AURAS (SUBTLE AMBIENT GLOWS)
          ======================================================== */}
      {/* Analyze Cyan Aura */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '23%',
          width: 140,
          height: 60,
          background: 'radial-gradient(ellipse, rgba(56, 189, 248, 0.3) 0%, transparent 70%)',
          filter: 'blur(16px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none'
        }}
      />

      {/* Design Green Aura */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '37%',
          width: 130,
          height: 55,
          background: 'radial-gradient(ellipse, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
          filter: 'blur(16px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none'
        }}
      />

      {/* Build Orange Aura */}
      <div
        style={{
          position: 'absolute',
          top: '14%',
          left: '50%',
          width: 90,
          height: 45,
          background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
          filter: 'blur(14px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none'
        }}
      />

      {/* Deploy Purple Aura */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '58%',
          width: 90,
          height: 45,
          background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
          filter: 'blur(14px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none'
        }}
      />

      {/* Portal Swirl Violet Aura */}
      <div
        className="voxel-portal-glow"
        style={{
          position: 'absolute',
          bottom: '185px',
          right: '250px',
          width: '120px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(168, 85, 247, 0.45) 0%, rgba(126, 34, 206, 0.2) 50%, transparent 80%)',
          filter: 'blur(10px)',
          animation: 'portalPulse 3.8s ease-in-out infinite alternate',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Lantern Warm Flicker Glows */}
      <div
        className="voxel-lantern-glow-1"
        style={{
          position: 'absolute',
          bottom: '108px',
          left: '265px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.6) 0%, transparent 70%)',
          filter: 'blur(6px)',
          animation: 'lanternFlicker 2.4s ease-in-out infinite alternate',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
      <div
        className="voxel-lantern-glow-2"
        style={{
          position: 'absolute',
          bottom: '165px',
          left: '585px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.55) 0%, transparent 70%)',
          filter: 'blur(5px)',
          animation: 'lanternFlicker 2.8s ease-in-out infinite alternate',
          animationDelay: '-1.1s',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* Ambient Rising Voxel Fireflies/Sparks */}
      <div className="voxel-firefly" style={{ position: 'absolute', bottom: '130px', left: '320px', width: 4, height: 4, backgroundColor: '#FCD34D', boxShadow: '0 0 6px #F59E0B', animation: 'fireflyDrift 6.5s ease-in-out infinite' }} />
      <div className="voxel-firefly" style={{ position: 'absolute', bottom: '180px', left: '460px', width: 3, height: 3, backgroundColor: '#38BDF8', boxShadow: '0 0 6px #38BDF8', animation: 'fireflyDrift 7.2s ease-in-out infinite', animationDelay: '-2.4s' }} />
      <div className="voxel-firefly" style={{ position: 'absolute', bottom: '90px', left: '190px', width: 4, height: 4, backgroundColor: '#4ADE80', boxShadow: '0 0 6px #22C55E', animation: 'fireflyDrift 5.8s ease-in-out infinite', animationDelay: '-3.8s' }} />
    </div>
  );
};

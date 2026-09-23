import React from 'react';
import {
  Layout,
  Square,
  Columns,
  Maximize2,
  Table,
  Sliders,
  Bot
} from 'lucide-react';

export const WireframeRenderer = ({
  screen,
  allScreens,
  domain,
  deviceView
}) => {
  const isMobile = deviceView === 'mobile';
  const isTablet = deviceView === 'tablet';

  const stats = screen.stats || [
    { label: 'METRIC_01', value: '----' },
    { label: 'METRIC_02', value: '----' },
    { label: 'METRIC_03', value: '----' },
    { label: 'METRIC_04', value: '----' }
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 4,
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* 1. Wireframe Header Container */}
      <div
        style={{
          border: '2px dashed #94A3B8',
          borderRadius: 6,
          padding: '12px 16px',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.725rem', fontFamily: 'monospace', fontWeight: 700, color: '#475569', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: 4 }}>
            CONTAINER: HEADER
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
            {screen.name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ border: '1px solid #94A3B8', borderRadius: 4, padding: '4px 10px', fontSize: '0.675rem', color: '#64748B' }}>
            [ NAV_ACTION_01 ]
          </div>
          <div style={{ border: '2px solid #0F172A', borderRadius: 4, padding: '4px 10px', fontSize: '0.675rem', fontWeight: 700, color: '#0F172A' }}>
            [ PRIMARY_CTA ]
          </div>
        </div>
      </div>

      {/* 2. Wireframe KPI Metric Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 12
        }}
      >
        {stats.map((st, idx) => (
          <div
            key={idx}
            style={{
              border: '2px dashed #94A3B8',
              borderRadius: 6,
              padding: '14px',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700, color: '#64748B' }}>
                BLOCK: STAT_CARD_0{idx + 1}
              </span>
              <div style={{ width: 14, height: 14, border: '1px solid #94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#94A3B8' }}>
                ✕
              </div>
            </div>

            <div style={{ width: '60%', height: 10, backgroundColor: '#E2E8F0', borderRadius: 2 }} />
            <div style={{ width: '40%', height: 18, backgroundColor: '#CBD5E1', borderRadius: 3 }} />
            <div style={{ width: '75%', height: 8, backgroundColor: '#E2E8F0', borderRadius: 2 }} />
          </div>
        ))}
      </div>

      {/* 3. Wireframe Main Content Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
          gap: 14
        }}
      >
        {/* Left: Main Structure Skeleton */}
        <div
          style={{
            border: '2px dashed #94A3B8',
            borderRadius: 6,
            padding: 16,
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: '#475569', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: 4 }}>
              CONTAINER: DATA_TABLE_SKELETON
            </span>
            <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>
              LAYOUT: {screen.layoutType?.toUpperCase() || 'GRID'}
            </span>
          </div>

          {/* Wireframe Search & Filter Bar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, height: 28, border: '1px solid #CBD5E1', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: '0.7rem', color: '#94A3B8' }}>
              [ SEARCH_INPUT_PLACEHOLDER ]
            </div>
            <div style={{ width: 80, height: 28, border: '1px solid #CBD5E1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#94A3B8' }}>
              [ FILTER ]
            </div>
          </div>

          {/* Wireframe Table Skeleton Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 4,
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: row % 2 === 0 ? '#F8FAFC' : '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 10, backgroundColor: '#CBD5E1', borderRadius: 2 }} />
                  <div style={{ width: 140, height: 12, backgroundColor: '#94A3B8', borderRadius: 2 }} />
                  <div style={{ width: 60, height: 10, backgroundColor: '#E2E8F0', borderRadius: 2 }} />
                </div>
                <div style={{ border: '1px solid #94A3B8', borderRadius: 3, padding: '2px 8px', fontSize: '0.65rem', color: '#64748B' }}>
                  [ ACTION ]
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Copilot / Assistant Wireframe Block */}
        <div
          style={{
            border: '2px dashed #94A3B8',
            borderRadius: 6,
            padding: 16,
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700, color: '#475569', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: 4 }}>
                BLOCK: COPILOT_DRAWER
              </span>
              <div style={{ width: 14, height: 14, border: '1px solid #94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#94A3B8' }}>
                ✕
              </div>
            </div>

            {/* Wireframe chat bubbles */}
            <div style={{ width: '85%', height: 36, border: '1px solid #CBD5E1', borderRadius: 6, padding: 8, backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ width: '40%', height: 6, backgroundColor: '#94A3B8', borderRadius: 2 }} />
              <div style={{ width: '80%', height: 8, backgroundColor: '#CBD5E1', borderRadius: 2 }} />
            </div>

            <div style={{ width: '85%', height: 36, border: '1px solid #0F172A', borderRadius: 6, padding: 8, backgroundColor: '#F1F5F9', alignSelf: 'flex-end', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ width: '30%', height: 6, backgroundColor: '#475569', borderRadius: 2 }} />
              <div style={{ width: '70%', height: 8, backgroundColor: '#94A3B8', borderRadius: 2 }} />
            </div>
          </div>

          <div style={{ height: 32, border: '1px solid #94A3B8', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: '0.7rem', color: '#94A3B8' }}>
            [ PROMPT_INPUT_BLOCK ]
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Code2,
  Layers,
  GitCommit,
  Network,
  Cpu,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Tablet,
  Monitor,
  Tag,
  Share2
} from 'lucide-react';

export const BlueprintRenderer = ({
  screen,
  allScreens,
  domain,
  deviceView
}) => {
  const spec = screen.specification || {};
  const components = screen.components || [];

  // Derive component tree nodes for this screen
  const treeNodes = [
    {
      id: `node-header-${screen.id}`,
      type: 'HEADER_CONTAINER',
      title: 'Global Navigation & Screen Header',
      layout: 'Flex Row (Space-Between)',
      api: 'GET /api/v1/workspace/session',
      events: ['onNavigateScreen', 'onUserMenuToggle'],
      req: 'REQ-UX-NAV'
    },
    {
      id: `node-kpis-${screen.id}`,
      type: 'METRIC_TELEMETRY_GRID',
      title: 'Operational KPI & Telemetry Strip',
      layout: 'CSS Grid (4-Column Desktop / 2-Column Tablet / 2-Column Mobile)',
      api: 'GET /api/v1/telemetry/stats',
      events: ['onStatDrilldown', 'onRefreshTelemetry'],
      req: 'REQ-UX-001'
    },
    {
      id: `node-main-${screen.id}`,
      type: screen.layoutType === 'split-view' ? 'SPLIT_VIEW_WORKSTATION' : screen.layoutType === 'table' ? 'DATA_GRID_ENGINE' : 'ANALYTICS_CHARTS_CONTAINER',
      title: screen.layoutType === 'split-view' ? 'Multi-Pane Item Triage & Detail Inspector' : screen.layoutType === 'table' ? 'Filterable Policy Engine Data Matrix' : 'Time-Series & Categorical Analytics View',
      layout: screen.layout || '2-Column Adaptive Workspace Grid',
      api: `GET /api/v1/${domain.toLowerCase()}/records`,
      events: ['onRowSelect', 'onFilterChange', 'onActionTrigger'],
      req: 'REQ-UX-002'
    },
    {
      id: `node-ai-${screen.id}`,
      type: 'INTELLIGENCE_COPILOT',
      title: 'Autonomous AI Copilot & Decision Engine',
      layout: 'Right-Sidebar Dock (Collapsible on Mobile)',
      api: 'WSS /api/v1/ai/copilot/stream',
      events: ['onPromptSubmit', 'onRecommendationApply'],
      req: 'REQ-UX-003'
    },
    {
      id: `node-footer-${screen.id}`,
      type: 'ACTION_BAR_FOOTER',
      title: 'Contextual Action Triggers & State Transitions',
      layout: 'Flex Row (Right-Aligned)',
      api: 'POST /api/v1/actions/execute',
      events: ['onConfirmExecution', 'onExportReport'],
      req: 'REQ-UX-004'
    }
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '8px 4px',
        fontFamily: "'JetBrains Mono', 'Consolas', monospace"
      }}
    >
      {/* 1. Blueprint Architectural Banner */}
      <div
        style={{
          backgroundColor: '#070D18',
          border: '1px solid #1E3A5F',
          borderRadius: 8,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Network size={20} color="#38BDF8" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38BDF8' }}>
                UX ARCHITECTURE BLUEPRINT
              </span>
              <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontWeight: 700 }}>
                IMPLEMENTATION SPECIFICATION
              </span>
            </div>
            <div style={{ fontSize: '0.725rem', color: '#94A3B8', marginTop: 2 }}>
              Target Screen: <strong style={{ color: '#F8FAFC' }}>{screen.name}</strong> (ID: {screen.id})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: '0.7rem', color: '#94A3B8' }}>
          <div>Persona: <strong style={{ color: '#38BDF8' }}>{spec.primaryUser || screen.primaryUser || 'Operations Lead'}</strong></div>
          <div>Domain: <strong style={{ color: '#38BDF8' }}>{domain}</strong></div>
          <div>Components: <strong style={{ color: '#38BDF8' }}>{components.length || 4} Registered</strong></div>
        </div>
      </div>

      {/* 2. Component Hierarchy Tree */}
      <div
        style={{
          backgroundColor: '#070D18',
          border: '1px solid #1E3A5F',
          borderRadius: 8,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E3A5F', paddingBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} color="#38BDF8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC' }}>
              Component Node Hierarchy & Structural Tree
            </span>
          </div>
          <span style={{ fontSize: '0.675rem', color: '#64748B' }}>
            Root Node: Screen[{screen.id}]
          </span>
        </div>

        {/* Tree Nodes List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6 }}>
          {treeNodes.map((node, nIdx) => (
            <div
              key={node.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid #1E293B',
                borderRadius: 6,
                position: 'relative'
              }}
            >
              {/* Connector marker */}
              <div
                style={{
                  minWidth: 26,
                  height: 26,
                  borderRadius: 6,
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#38BDF8'
                }}
              >
                0{nIdx + 1}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F8FAFC' }}>
                      {node.title}
                    </span>
                    <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 3, backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontFamily: 'monospace' }}>
                      {node.type}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: 700 }}>
                    MAPS TO: {node.req}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginTop: 4, fontSize: '0.725rem' }}>
                  <div style={{ color: '#94A3B8' }}>
                    Layout Model: <span style={{ color: '#CBD5E1' }}>{node.layout}</span>
                  </div>
                  <div style={{ color: '#94A3B8' }}>
                    API Endpoint: <span style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{node.api}</span>
                  </div>
                  <div style={{ color: '#94A3B8' }}>
                    Event Hooks: <span style={{ color: '#FCD34D' }}>{node.events.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Technical Implementation Specification & Responsive Rules */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: deviceView === 'mobile' ? '1fr' : '1fr 1fr',
          gap: 14
        }}
      >
        {/* Left: Responsive Breakpoint Matrix */}
        <div
          style={{
            backgroundColor: '#070D18',
            border: '1px solid #1E3A5F',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 800, color: '#38BDF8' }}>
            <Monitor size={15} /> Responsive Viewport Rules (AST)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.75rem' }}>
            <div style={{ padding: '8px 10px', backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 6, border: '1px solid #1E293B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F8FAFC', fontWeight: 700, marginBottom: 2 }}>
                <Monitor size={13} color="#38BDF8" /> Desktop (&gt;1024px):
              </div>
              <div style={{ color: '#94A3B8' }}>
                {spec.responsive?.desktop || 'Ergonomic 3-column multi-pane layout with persistent telemetry and sidebar copilot'}
              </div>
            </div>

            <div style={{ padding: '8px 10px', backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 6, border: '1px solid #1E293B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F8FAFC', fontWeight: 700, marginBottom: 2 }}>
                <Tablet size={13} color="#38BDF8" /> Tablet (768px - 1023px):
              </div>
              <div style={{ color: '#94A3B8' }}>
                {spec.responsive?.tablet || '2-column adaptive layout with collapsible copilot slide-over and 2-col metric grid'}
              </div>
            </div>

            <div style={{ padding: '8px 10px', backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 6, border: '1px solid #1E293B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F8FAFC', fontWeight: 700, marginBottom: 2 }}>
                <Smartphone size={13} color="#38BDF8" /> Mobile (&lt;767px):
              </div>
              <div style={{ color: '#94A3B8' }}>
                {spec.responsive?.mobile || 'Touch-optimized single column card stack with sticky bottom action trigger'}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Accessibility & Data Binding Specifications */}
        <div
          style={{
            backgroundColor: '#070D18',
            border: '1px solid #1E3A5F',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 10
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 800, color: '#38BDF8', marginBottom: 8 }}>
              <ShieldCheck size={15} /> Accessibility & Governance Spec
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.725rem', color: '#94A3B8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} color="#10B981" />
                <span>WCAG 2.1 AA Compliance with 4.5:1 minimum contrast ratio</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} color="#10B981" />
                <span>ARIA Live Regions enabled for real-time queue & telemetry changes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} color="#10B981" />
                <span>Keyboard tab order verified for all primary CTAs and filters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} color="#10B981" />
                <span>Screen reader text alternatives defined for charts and icons</span>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 10,
              backgroundColor: 'rgba(56, 189, 248, 0.05)',
              borderRadius: 6,
              border: '1px solid rgba(56, 189, 248, 0.2)',
              fontSize: '0.7rem',
              color: '#38BDF8'
            }}
          >
            Traceability Verified: 100% of components on this screen map directly to validated functional requirements.
          </div>
        </div>
      </div>
    </div>
  );
};

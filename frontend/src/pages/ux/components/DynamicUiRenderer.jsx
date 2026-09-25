import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
  Truck,
  DollarSign,
  Package,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Plus,
  Send,
  Lock,
  Download,
  Bot,
  Activity,
  SlidersHorizontal,
  ExternalLink,
  Tag,
  Stethoscope,
  Building,
  HeartPulse,
  Navigation,
  FileText,
  BarChart2,
  PieChart
} from 'lucide-react';

const ICON_MAP = {
  Sparkles,
  Search,
  Filter,
  TrendingUp,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
  Truck,
  DollarSign,
  Package,
  Calendar,
  Layers,
  Bot,
  Activity,
  SlidersHorizontal,
  Plus,
  Send,
  Lock,
  Download,
  Stethoscope,
  Building,
  HeartPulse,
  Navigation,
  FileText,
  BarChart2,
  PieChart
};

// ---------------------------------------------------------------------------
// COLOR LUMINANCE & AUTOMATIC CONTRAST ENGINE
// ---------------------------------------------------------------------------
function parseHexOrRgb(color) {
  if (!color || typeof color !== 'string') return [15, 23, 42];
  const trimmed = color.trim().toLowerCase();
  if (trimmed === 'white' || trimmed === '#fff' || trimmed === '#ffffff') return [255, 255, 255];
  if (trimmed === 'black' || trimmed === '#000' || trimmed === '#000000') return [0, 0, 0];
  if (trimmed === 'transparent') return [15, 23, 42];

  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length >= 6) {
      const num = parseInt(hex.slice(0, 6), 16);
      if (!isNaN(num)) return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
  }
  const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  }
  return [15, 23, 42];
}

function getLuminance(color) {
  const [r, g, b] = parseHexOrRgb(color);
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function isDark(color) {
  return getLuminance(color) < 0.45;
}

export const DynamicUiRenderer = ({
  specification,
  deviceView = 'desktop',
  onTriggerAction,
  onNavigateScreen
}) => {
  if (!specification) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
        <p>No UI specification available for rendering.</p>
      </div>
    );
  }

  const { page = {}, layout = {}, theme = {}, navigation = [], components = [], actions = [] } = specification;

  // Local interaction states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterChip, setActiveFilterChip] = useState('All');
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [activeTabId, setActiveTabId] = useState(navigation[0]?.id || 'nav-1');
  const [copilotActionNotice, setCopilotActionNotice] = useState(null);
  const [isCopilotExecuting, setIsCopilotExecuting] = useState(false);

  const isMobile = deviceView === 'mobile';
  const isTablet = deviceView === 'tablet';

  const handleAction = (label) => {
    if (onTriggerAction) {
      onTriggerAction(label || 'Executed action');
    }
  };

  const handleExecuteCopilotAction = (actionItem) => {
    setIsCopilotExecuting(true);
    const label = typeof actionItem === 'string' ? actionItem : (actionItem.label || 'Copilot action');
    setTimeout(() => {
      setIsCopilotExecuting(false);
      setCopilotActionNotice(`Executed: ${label}`);
      if (onTriggerAction) {
        onTriggerAction(`AI Copilot executed: ${label}`);
      }
      setTimeout(() => setCopilotActionNotice(null), 3500);
    }, 450);
  };

  // ---------------------------------------------------------------------------
  // DYNAMIC DUAL-TIER CONTRAST SYSTEM (CANVAS vs CARD)
  // Guaranteed readable text colors based on exact background luminance
  // ---------------------------------------------------------------------------
  const canvasBg = theme.background || (theme.mode === 'light' ? '#FDF8F0' : '#0B0F19');
  const isCanvasDark = isDark(canvasBg);

  const cardBg = theme.cardBg || theme.surface || (isCanvasDark ? '#111827' : '#FFFFFF');
  const isCardDark = isDark(cardBg);

  const tokens = {
    isCanvasDark,
    isCardDark,
    canvasBg,
    canvasText: isCanvasDark ? '#FFFFFF' : '#0F172A',
    canvasTextMuted: isCanvasDark ? '#94A3B8' : '#475569',
    canvasBorder: isCanvasDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
    
    cardBg,
    cardText: isCardDark ? '#FFFFFF' : '#0F172A',
    cardTextMuted: isCardDark ? '#94A3B8' : '#64748B',
    cardBorder: isCardDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    cardSubtle: isCardDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    cardShadow: isCardDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    
    primary: theme.primary || (isCanvasDark ? '#3B82F6' : '#2563EB'),
    accent: theme.accent || theme.primary || (isCanvasDark ? '#60A5FA' : '#3B82F6'),
    buttonPrimary: theme.buttonPrimary || theme.primary || '#2563EB',
    
    btnSecondaryBg: isCanvasDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
    btnSecondaryBorder: isCanvasDark ? 'rgba(255, 255, 255, 0.18)' : '#CBD5E1',
    btnSecondaryText: isCanvasDark ? '#F1F5F9' : '#1E293B',

    cardBtnSecondaryBg: isCardDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
    cardBtnSecondaryBorder: isCardDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
    cardBtnSecondaryText: isCardDark ? '#F1F5F9' : '#1E293B',

    tableHeaderBg: isCardDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    tableHeaderText: isCardDark ? '#CBD5E1' : '#475569',

    radius: theme.radius || '8px'
  };

  // Component Categorization
  const categorized = useMemo(() => {
    const kpis = [];
    const toolbars = [];
    const tables = [];
    const copilots = [];
    const charts = [];
    const workflows = [];
    const kanbans = [];
    const activities = [];
    const others = [];

    components.forEach((cmp) => {
      const t = (cmp.type || '').toLowerCase();
      if (t === 'kpi_grid' || t === 'kpi_card' || t === 'metrics_bar') {
        kpis.push(cmp);
      } else if (t === 'search_filter_bar' || t === 'filter_bar' || t === 'action_toolbar') {
        toolbars.push(cmp);
      } else if (t === 'data_table' || t === 'table' || t === 'entity_table') {
        tables.push(cmp);
      } else if (t.includes('copilot') || t.includes('assistant')) {
        copilots.push(cmp);
      } else if (t.includes('chart') || t.includes('donut') || t.includes('analytics')) {
        charts.push(cmp);
      } else if (t.includes('workflow') || t.includes('timeline') || t.includes('stage')) {
        workflows.push(cmp);
      } else if (t.includes('kanban')) {
        kanbans.push(cmp);
      } else if (t.includes('activity') || t.includes('alert') || t.includes('log') || t.includes('feed')) {
        activities.push(cmp);
      } else {
        others.push(cmp);
      }
    });

    return { kpis, toolbars, tables, copilots, charts, workflows, kanbans, activities, others };
  }, [components]);

  const isLeftSidebar = layout.sidebarPosition === 'left';
  const gridGap = layout.density === 'compact' ? 8 : 10;

  // Ergonomic Zero-Scroll Desktop Container
  const containerStyle = {
    backgroundColor: tokens.canvasBg,
    color: tokens.canvasText,
    fontFamily: theme.fontFamily || 'Plus Jakarta Sans, Inter, sans-serif',
    borderRadius: isMobile ? 0 : tokens.radius,
    width: '100%',
    maxWidth: '100%',
    height: isMobile ? 'auto' : (isTablet ? 'auto' : '100%'),
    maxHeight: isMobile ? 'none' : (isTablet ? 'none' : '100%'),
    boxSizing: 'border-box',
    overflowX: 'hidden',
    overflowY: isMobile ? 'auto' : (isTablet ? 'auto' : 'hidden'),
    padding: isMobile ? '10px 8px 60px' : (isTablet ? '12px 14px 20px' : '10px 14px 12px'),
    display: 'flex',
    flexDirection: 'column',
    gap: gridGap
  };

  return (
    <div style={containerStyle} className="dynamic-ui-container">
      {/* 1. TOP HEADER & SCREEN IDENTITY (Compact ~40px) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 6,
          paddingBottom: 6,
          borderBottom: `1px solid ${tokens.canvasBorder}`,
          width: '100%',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: `${tokens.primary}25`,
              border: `1px solid ${tokens.primary}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.primary,
              flexShrink: 0
            }}
          >
            <Sparkles size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: isMobile ? '0.9rem' : '1.025rem',
                  fontWeight: 800,
                  color: tokens.canvasText,
                  letterSpacing: '-0.02em',
                  whiteSpace: isMobile ? 'normal' : 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {page.name || 'Enterprise Workspace'}
              </h2>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: `${tokens.primary}20`,
                  color: tokens.primary,
                  border: `1px solid ${tokens.primary}35`,
                  flexShrink: 0
                }}
              >
                {page.businessDomain || 'PRODUCTION'}
              </span>
            </div>
            <p
              style={{
                margin: '1px 0 0',
                fontSize: '0.675rem',
                color: tokens.canvasTextMuted,
                whiteSpace: isMobile ? 'normal' : 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 640
              }}
            >
              {page.purpose || 'Live operational command center orchestrating real-time workflows and intelligent telemetry.'}
            </p>
          </div>
        </div>

        {/* Global Action Triggers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: isMobile ? 'stretch' : 'auto', flexShrink: 0 }}>
          {actions.map((act, aIdx) => {
            const isPrimary = act.variant === 'primary' || aIdx === 0;
            const IconCmp = act.icon && ICON_MAP[act.icon] ? ICON_MAP[act.icon] : (isPrimary ? Zap : Download);
            return (
              <button
                key={act.id || aIdx}
                type="button"
                onClick={() => handleAction(act.label)}
                style={{
                  flex: isMobile ? 1 : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '5px 10px',
                  borderRadius: tokens.radius,
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isPrimary ? 'none' : `1px solid ${tokens.btnSecondaryBorder}`,
                  backgroundColor: isPrimary ? tokens.buttonPrimary : tokens.btnSecondaryBg,
                  color: isPrimary ? '#FFFFFF' : tokens.btnSecondaryText,
                  transition: 'all 0.15s ease',
                  boxShadow: isPrimary ? `0 2px 8px ${tokens.primary}35` : 'none'
                }}
              >
                <IconCmp size={12} />
                {act.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      {navigation.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            overflowX: 'auto',
            paddingBottom: 2,
            borderBottom: `1px solid ${tokens.canvasBorder}`,
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0
          }}
        >
          {navigation.map((nav) => {
            const isActive = activeTabId === nav.id;
            const IconCmp = nav.icon && ICON_MAP[nav.icon] ? ICON_MAP[nav.icon] : Layers;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => setActiveTabId(nav.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: tokens.radius,
                  border: 'none',
                  backgroundColor: isActive ? `${tokens.primary}20` : 'transparent',
                  color: isActive ? tokens.primary : tokens.canvasTextMuted,
                  fontSize: '0.725rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  borderBottom: isActive ? `2px solid ${tokens.primary}` : '2px solid transparent'
                }}
              >
                <IconCmp size={12} />
                {nav.label}
                {nav.badge && (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      padding: '1px 5px',
                      borderRadius: 10,
                      backgroundColor: isActive ? tokens.primary : (tokens.isCanvasDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'),
                      color: isActive ? '#FFFFFF' : tokens.canvasTextMuted,
                      fontWeight: 700
                    }}
                  >
                    {nav.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. TIER 1: KPI STATS STRIP (Compact ~54px) */}
      {categorized.kpis.map((cmp) => (
        <div key={cmp.id} style={{ width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
          <KpiGridComponent cmp={cmp} tokens={tokens} isMobile={isMobile} isTablet={isTablet} onAction={handleAction} />
        </div>
      ))}

      {/* 4. TIER 1: SEARCH & FILTER TOOLBAR (Compact ~36px) */}
      {categorized.toolbars.map((cmp) => (
        <div key={cmp.id} style={{ width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
          <SearchFilterBarComponent
            cmp={cmp}
            tokens={tokens}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeFilterChip={activeFilterChip}
            setActiveFilterChip={setActiveFilterChip}
            onAction={handleAction}
          />
        </div>
      ))}

      {/* 5. TIER 2: WORKSTATION SPLIT-GRID (Fits Desktop Viewport with Internal Scrolling) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr' : (categorized.copilots.length > 0 ? (isLeftSidebar ? '300px 1fr' : '1fr 310px') : '1fr')),
          gap: gridGap,
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflow: isMobile ? 'visible' : 'hidden'
        }}
      >
        {/* Left Copilot (if sidebar position is left) */}
        {!isMobile && !isTablet && isLeftSidebar && categorized.copilots.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: gridGap, minHeight: 0, height: '100%', overflowY: 'auto' }}>
            {categorized.copilots.map((cmp) => (
              <AiCopilotPanelComponent
                key={cmp.id}
                cmp={cmp}
                tokens={tokens}
                onExecute={handleExecuteCopilotAction}
                isExecuting={isCopilotExecuting}
                actionNotice={copilotActionNotice}
              />
            ))}
          </div>
        )}

        {/* Center Main Workstation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: gridGap, minHeight: 0, height: isMobile ? 'auto' : '100%', width: '100%', boxSizing: 'border-box', overflow: isMobile ? 'visible' : 'hidden' }}>
          {/* Primary Table (Flex 1 with internal scroll) */}
          {categorized.tables.map((cmp) => (
            <div key={cmp.id} style={{ flex: 1, minHeight: isMobile ? 'auto' : '170px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <DataTableComponent
                cmp={cmp}
                tokens={tokens}
                searchQuery={searchQuery}
                activeFilterChip={activeFilterChip}
                selectedRowId={selectedRowId}
                setSelectedRowId={setSelectedRowId}
                onAction={handleAction}
              />
            </div>
          ))}

          {/* Kanban */}
          {categorized.kanbans.map((cmp) => (
            <KanbanBoardComponent key={cmp.id} cmp={cmp} tokens={tokens} onAction={handleAction} />
          ))}

          {/* Lower 2-Column Analytics & Workflow Row */}
          {(categorized.charts.length > 0 || categorized.workflows.length > 0) && (
            <div
              style={{
                flexShrink: 0,
                height: isMobile ? 'auto' : '140px',
                minHeight: isMobile ? 'auto' : '140px',
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : (categorized.charts.length > 0 && categorized.workflows.length > 0 ? '1fr 1fr' : '1fr'),
                gap: gridGap,
                alignItems: 'stretch',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {categorized.charts.map((cmp) => (
                <ChartComponent key={cmp.id} cmp={cmp} tokens={tokens} onAction={handleAction} />
              ))}

              {categorized.workflows.map((cmp) => (
                <WorkflowTrackerComponent key={cmp.id} cmp={cmp} tokens={tokens} onAction={handleAction} />
              ))}
            </div>
          )}

          {/* Other Custom Widgets */}
          {categorized.others.map((cmp) => (
            <GenericCardComponent key={cmp.id} cmp={cmp} tokens={tokens} onAction={handleAction} />
          ))}
        </div>

        {/* Right Copilot Sidebar (Default Desktop View) */}
        {categorized.copilots.length > 0 && (!isLeftSidebar || isMobile || isTablet) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: gridGap, minHeight: 0, height: isMobile ? 'auto' : '100%', width: '100%', boxSizing: 'border-box', overflowY: isMobile ? 'visible' : 'auto' }}>
            {categorized.copilots.map((cmp) => (
              <AiCopilotPanelComponent
                key={cmp.id}
                cmp={cmp}
                tokens={tokens}
                onExecute={handleExecuteCopilotAction}
                isExecuting={isCopilotExecuting}
                actionNotice={copilotActionNotice}
              />
            ))}

            {categorized.activities.length > 0 && (
              categorized.activities.map((cmp) => (
                <ActivityFeedComponent key={cmp.id} cmp={cmp} tokens={tokens} onAction={handleAction} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 1. KPI GRID COMPONENT (High-Contrast Theme Tokens)
// ---------------------------------------------------------------------------
function KpiGridComponent({ cmp, tokens, isMobile, isTablet, onAction }) {
  const items = cmp.props?.items || [
    { label: 'Operational Throughput', value: '1,420/hr', change: '+12%', trend: 'up', icon: 'Zap' },
    { label: 'SLA Adherence', value: '99.4%', change: 'Optimal', trend: 'up', icon: 'ShieldCheck' },
    { label: 'Active Queue', value: '42 items', change: '-8%', trend: 'down', icon: 'Clock' },
    { label: 'Automated Accuracy', value: '98.8%', change: 'Audited', trend: 'up', icon: 'Bot' }
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'),
        gap: 6,
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {items.slice(0, 4).map((item, idx) => {
        const IconCmp = item.icon && ICON_MAP[item.icon] ? ICON_MAP[item.icon] : Zap;
        const isUp = item.trend === 'up' || (item.change && item.change.includes('+'));

        return (
          <div
            key={idx}
            onClick={() => onAction && onAction(`Inspect metric: ${item.label}`)}
            style={{
              backgroundColor: tokens.cardBg,
              border: `1px solid ${tokens.cardBorder}`,
              borderRadius: tokens.radius,
              padding: '6px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              minWidth: 0,
              boxSizing: 'border-box',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
              boxShadow: tokens.cardShadow
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tokens.primary;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = tokens.cardBorder;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, minWidth: 0 }}>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: tokens.cardTextMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.label}
              </span>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  backgroundColor: `${tokens.primary}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tokens.primary,
                  flexShrink: 0,
                  marginLeft: 4
                }}
              >
                <IconCmp size={10} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
              <span
                style={{
                  fontSize: isMobile ? '1rem' : '1.15rem',
                  fontWeight: 800,
                  color: tokens.cardText,
                  letterSpacing: '-0.03em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {item.value}
              </span>
              {item.change && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '1px 4px',
                    borderRadius: 3,
                    backgroundColor: isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: isUp ? '#10B981' : '#EF4444',
                    flexShrink: 0
                  }}
                >
                  {isUp ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                  {item.change}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. SEARCH & FILTER TOOLBAR
// ---------------------------------------------------------------------------
function SearchFilterBarComponent({ cmp, tokens, searchQuery, setSearchQuery, activeFilterChip, setActiveFilterChip, onAction }) {
  const { props = {} } = cmp;
  const filterChips = props.filterChips || ['All Items', 'High Priority', 'In-Progress', 'Completed'];
  const actionButtons = props.actionButtons || [];
  const placeholder = props.searchPlaceholder || 'Search records, items, or accounts...';

  return (
    <div
      style={{
        backgroundColor: tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: tokens.radius,
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 6,
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: tokens.cardShadow
      }}
    >
      {/* Search Input */}
      <div
        style={{
          flex: 1,
          minWidth: 180,
          maxWidth: 380,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: tokens.cardSubtle,
          border: `1px solid ${tokens.cardBorder}`,
          borderRadius: 4,
          padding: '3px 8px'
        }}
      >
        <Search size={12} color={tokens.cardTextMuted} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: tokens.cardText,
            fontSize: '0.725rem'
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{ background: 'none', border: 'none', color: tokens.cardTextMuted, cursor: 'pointer', fontSize: '0.65rem' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Chips */}
      {filterChips.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {filterChips.map((chip, cIdx) => {
            const isSelected = activeFilterChip === chip || (activeFilterChip === 'All' && cIdx === 0);
            return (
              <button
                key={cIdx}
                type="button"
                onClick={() => {
                  setActiveFilterChip(chip);
                  if (onAction) onAction(`Applied filter: ${chip}`);
                }}
                style={{
                  fontSize: '0.65rem',
                  fontWeight: isSelected ? 700 : 500,
                  padding: '2px 7px',
                  borderRadius: 12,
                  border: isSelected ? `1px solid ${tokens.primary}` : `1px solid ${tokens.cardBorder}`,
                  backgroundColor: isSelected ? `${tokens.primary}25` : tokens.cardSubtle,
                  color: isSelected ? tokens.primary : tokens.cardTextMuted,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {chip}
              </button>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      {actionButtons.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {actionButtons.map((btn, bIdx) => {
            const isPrimary = btn.variant === 'primary' || bIdx === 0;
            const IconCmp = btn.icon && ICON_MAP[btn.icon] ? ICON_MAP[btn.icon] : Plus;
            return (
              <button
                key={bIdx}
                type="button"
                onClick={() => onAction && onAction(btn.label)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isPrimary ? 'none' : `1px solid ${tokens.cardBtnSecondaryBorder}`,
                  backgroundColor: isPrimary ? tokens.buttonPrimary : tokens.cardBtnSecondaryBg,
                  color: isPrimary ? '#FFFFFF' : tokens.cardBtnSecondaryText
                }}
              >
                <IconCmp size={11} />
                {btn.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. DATA TABLE COMPONENT (High-Contrast & Constrained Viewport)
// ---------------------------------------------------------------------------
function DataTableComponent({ cmp, tokens, searchQuery, activeFilterChip, selectedRowId, setSelectedRowId, onAction }) {
  const { title, props = {} } = cmp;
  const columns = props.columns || ['ID', 'Title', 'Status', 'Priority', 'Actions'];
  const rawRows = props.rows || [
    { id: '1', title: 'Task Alpha', status: 'In-Progress', priority: 'High', actions: ['Inspect'] },
    { id: '2', title: 'Task Beta', status: 'Completed', priority: 'Medium', actions: ['Inspect'] }
  ];

  const filteredRows = useMemo(() => {
    return rawRows.filter((row) => {
      if (searchQuery) {
        const rowStr = Object.values(row).join(' ').toLowerCase();
        if (!rowStr.includes(searchQuery.toLowerCase())) return false;
      }
      if (activeFilterChip && activeFilterChip !== 'All' && !activeFilterChip.includes('All')) {
        const rowStr = Object.values(row).join(' ').toLowerCase();
        const chipWord = activeFilterChip.toLowerCase().replace(/items|patients|orders|records/g, '').trim();
        if (chipWord && !rowStr.includes(chipWord)) {
          return false;
        }
      }
      return true;
    });
  }, [rawRows, searchQuery, activeFilterChip]);

  return (
    <div
      style={{
        backgroundColor: tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: tokens.radius,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        boxShadow: tokens.cardShadow
      }}
    >
      {/* Header Strip */}
      <div
        style={{
          padding: '6px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${tokens.cardBorder}`,
          backgroundColor: tokens.cardSubtle
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: tokens.cardText }}>
            {title || 'Active Operational Queue'}
          </span>
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 6,
              backgroundColor: tokens.primary ? `${tokens.primary}20` : tokens.cardSubtle,
              color: tokens.primary
            }}
          >
            {filteredRows.length} items
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAction && onAction(`Refreshed ${title}`)}
          style={{
            background: 'none',
            border: 'none',
            color: tokens.cardTextMuted,
            fontSize: '0.65rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 3
          }}
        >
          <RefreshCw size={10} /> Sync
        </button>
      </div>

      {/* Table Body Viewport */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.7rem' }}>
          <thead>
            <tr
              style={{
                backgroundColor: tokens.cardSubtle,
                borderBottom: `1px solid ${tokens.cardBorder}`,
                position: 'sticky',
                top: 0,
                zIndex: 3
              }}
            >
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: '5px 8px',
                    fontWeight: 700,
                    color: tokens.cardTextMuted,
                    textTransform: 'uppercase',
                    fontSize: '0.6rem',
                    letterSpacing: '0.04em',
                    backgroundColor: tokens.cardSubtle,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '20px 10px', textAlign: 'center', color: tokens.cardTextMuted }}>
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, rIdx) => {
                const isSelected = selectedRowId === row.id || (selectedRowId === null && rIdx === 0);
                const values = Object.entries(row).filter(([k]) => k !== 'id' && k !== 'actions');
                const rowActions = row.actions || ['Inspect'];

                return (
                  <tr
                    key={row.id || rIdx}
                    onClick={() => setSelectedRowId(row.id)}
                    style={{
                      borderBottom: `1px solid ${tokens.cardBorder}`,
                      backgroundColor: isSelected ? `${tokens.primary}18` : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = tokens.cardSubtle;
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: tokens.primary, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {row.id || row.mrn || row.waybill || row.txHash || `REC-${rIdx + 1}`}
                    </td>

                    {values.slice(0, columns.length - 2).map(([k, val], cIdx) => {
                      const isStatus = /status|state|severity|sla|priority/i.test(k) || (typeof val === 'string' && /completed|delivered|settled|nominal|critical|high|isolated|active|warning/i.test(val));
                      const isCritical = typeof val === 'string' && /critical|urgent|warning|delayed|frozen|isolated/i.test(val);
                      const isSuccess = typeof val === 'string' && /completed|delivered|settled|nominal|on-time|passed/i.test(val);

                      if (isStatus) {
                        return (
                          <td key={cIdx} style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 10,
                                backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.15)' : (isSuccess ? 'rgba(16, 185, 129, 0.15)' : `${tokens.primary}18`),
                                color: isCritical ? '#EF4444' : (isSuccess ? '#10B981' : tokens.primary),
                                border: isCritical ? '1px solid rgba(239, 68, 68, 0.3)' : (isSuccess ? '1px solid rgba(16, 185, 129, 0.3)' : `1px solid ${tokens.primary}30`)
                              }}
                            >
                              {String(val)}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={cIdx} style={{ padding: '6px 8px', color: tokens.cardText, whiteSpace: 'nowrap' }}>
                          {String(val)}
                        </td>
                      );
                    })}

                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {rowActions.slice(0, 2).map((actLabel, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction && onAction(`${actLabel} on ${row.id || 'row'}`);
                            }}
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 600,
                              padding: '2px 5px',
                              borderRadius: 3,
                              border: aIdx === 0 ? `1px solid ${tokens.primary}60` : `1px solid ${tokens.cardBtnSecondaryBorder}`,
                              backgroundColor: aIdx === 0 ? `${tokens.primary}20` : tokens.cardBtnSecondaryBg,
                              color: aIdx === 0 ? tokens.primary : tokens.cardBtnSecondaryText,
                              cursor: 'pointer'
                            }}
                          >
                            {actLabel}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. AI COPILOT PANEL
// ---------------------------------------------------------------------------
function AiCopilotPanelComponent({ cmp, tokens, onExecute, isExecuting, actionNotice }) {
  const { title, props = {} } = cmp;
  const score = props.confidenceScore || 96;
  const recommendation = props.recommendation || 'Autonomous analysis verified optimal parameters. Ready for single-click execution.';
  const badges = props.contextBadges || ['Audited Model', 'Real-Time Sync'];
  const quickActions = props.quickActions || [
    { label: 'Accept & Apply Recommendation', action: 'APPLY' },
    { label: 'Inspect AI Decision Rationale', action: 'INSPECT' }
  ];

  return (
    <div
      style={{
        backgroundColor: tokens.cardBg,
        border: `1px solid ${tokens.primary}40`,
        borderRadius: tokens.radius,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxShadow: tokens.cardShadow,
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Bot size={14} color={tokens.primary} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: tokens.cardText }}>
            {title || 'AI Decision Copilot'}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 10,
            backgroundColor: `${tokens.primary}20`,
            color: tokens.primary,
            border: `1px solid ${tokens.primary}35`
          }}
        >
          {score}% Match
        </span>
      </div>

      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {badges.map((b, bIdx) => (
          <span
            key={bIdx}
            style={{
              fontSize: '0.575rem',
              fontWeight: 600,
              padding: '1px 4px',
              borderRadius: 3,
              backgroundColor: tokens.cardSubtle,
              color: tokens.cardTextMuted
            }}
          >
            {b}
          </span>
        ))}
      </div>

      <div
        style={{
          fontSize: '0.675rem',
          color: tokens.cardText,
          lineHeight: 1.35,
          backgroundColor: tokens.cardSubtle,
          padding: '6px 8px',
          borderRadius: 4,
          border: `1px solid ${tokens.cardBorder}`,
          maxHeight: '90px',
          overflowY: 'auto'
        }}
      >
        {recommendation}
      </div>

      {actionNotice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.625rem', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '4px 6px', borderRadius: 4 }}>
          <CheckCircle2 size={11} />
          <span>{actionNotice}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {quickActions.map((qa, qIdx) => {
          const isPrimary = qIdx === 0;
          const label = typeof qa === 'string' ? qa : (qa.label || 'Execute');

          return (
            <button
              key={qIdx}
              type="button"
              disabled={isExecuting}
              onClick={() => onExecute(qa)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '5px 8px',
                borderRadius: 4,
                fontSize: '0.675rem',
                fontWeight: 700,
                cursor: isExecuting ? 'not-allowed' : 'pointer',
                border: isPrimary ? 'none' : `1px solid ${tokens.cardBtnSecondaryBorder}`,
                backgroundColor: isPrimary ? tokens.buttonPrimary : tokens.cardBtnSecondaryBg,
                color: isPrimary ? '#FFFFFF' : tokens.cardBtnSecondaryText,
                transition: 'all 0.15s ease'
              }}
            >
              {isExecuting && isPrimary ? <RefreshCw size={10} className="spin" /> : <Zap size={10} />}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. CHART COMPONENT
// ---------------------------------------------------------------------------
function ChartComponent({ cmp, tokens, onAction }) {
  const { title, props = {} } = cmp;
  const chartType = props.chartType || 'line';
  const categories = props.categories || ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  const series = props.series || [
    { name: 'Primary Metric', data: [40, 65, 90, 120, 110, 85], color: tokens.primary }
  ];

  return (
    <div
      style={{
        backgroundColor: tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: tokens.radius,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        boxShadow: tokens.cardShadow
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.725rem', fontWeight: 800, color: tokens.cardText }}>
          {title || 'Telemetry Analytics'}
        </span>
        <span style={{ fontSize: '0.575rem', fontWeight: 600, color: tokens.primary, padding: '1px 4px', borderRadius: 3, backgroundColor: `${tokens.primary}18` }}>
          {chartType.toUpperCase()}
        </span>
      </div>

      {chartType === 'donut' ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '4px 0' }}>
          <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', background: `conic-gradient(${tokens.primary} 0% 55%, #10B981 55% 85%, #F59E0B 85% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: tokens.cardBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: tokens.cardText }}>100%</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.625rem' }}>
            {categories.slice(0, 3).map((cat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, color: tokens.cardTextMuted }}>
                <div style={{ width: 5, height: 5, borderRadius: 2, backgroundColor: idx === 0 ? tokens.primary : (idx === 1 ? '#10B981' : '#F59E0B') }} />
                <span>{cat}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 68, padding: '4px 2px 0', borderBottom: `1px solid ${tokens.cardBorder}`, gap: 4 }}>
          {categories.map((cat, cIdx) => {
            const val = series[0]?.data?.[cIdx] || 40;
            const maxVal = Math.max(...(series[0]?.data || [100]));
            const pct = Math.max(15, Math.min(100, (val / maxVal) * 100));

            return (
              <div key={cIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end', minWidth: 0 }}>
                <div
                  style={{
                    width: chartType === 'bar' ? '60%' : '20%',
                    height: `${pct}%`,
                    borderRadius: '2px 2px 0 0',
                    background: `linear-gradient(180deg, ${tokens.accent} 0%, ${tokens.primary} 100%)`,
                    boxShadow: `0 0 4px ${tokens.primary}30`
                  }}
                  title={`${cat}: ${val}`}
                />
                <span style={{ fontSize: '0.55rem', color: tokens.cardTextMuted, whiteSpace: 'nowrap' }}>{cat}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. WORKFLOW TRACKER COMPONENT
// ---------------------------------------------------------------------------
function WorkflowTrackerComponent({ cmp, tokens, onAction }) {
  const { title, props = {} } = cmp;
  const stages = props.stages || [
    { id: '1', title: '1. Ingestion', status: 'completed', time: '12 ms' },
    { id: '2', title: '2. Rule Eval', status: 'in-progress', time: 'Active' },
    { id: '3', title: '3. Signoff', status: 'pending', time: 'Queued' }
  ];

  return (
    <div
      style={{
        backgroundColor: tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: tokens.radius,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        boxShadow: tokens.cardShadow
      }}
    >
      <span style={{ fontSize: '0.725rem', fontWeight: 800, color: tokens.cardText }}>
        {title || 'Workflow Stage Verification'}
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: 4, alignItems: 'center' }}>
        {stages.map((stg, idx) => {
          const isDone = stg.status === 'completed';
          const isCurr = stg.status === 'in-progress';

          return (
            <div
              key={stg.id || idx}
              style={{
                backgroundColor: isCurr ? `${tokens.primary}18` : tokens.cardSubtle,
                border: isCurr ? `1px solid ${tokens.primary}` : `1px solid ${tokens.cardBorder}`,
                borderRadius: 4,
                padding: '4px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                minWidth: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    color: isCurr ? tokens.primary : tokens.cardText,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {stg.title}
                </span>
                {isDone ? <CheckCircle2 size={10} color="#10B981" /> : (isCurr ? <Zap size={10} color={tokens.primary} /> : <Clock size={10} color={tokens.cardTextMuted} />)}
              </div>
              <span style={{ fontSize: '0.55rem', color: tokens.cardTextMuted }}>
                {stg.time || stg.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. KANBAN BOARD COMPONENT
// ---------------------------------------------------------------------------
function KanbanBoardComponent({ cmp, tokens, onAction }) {
  const { title, props = {} } = cmp;
  const columns = props.columns || [
    { id: '1', title: 'Pending (12)', count: 12, items: ['Task Alpha', 'Task Beta'] },
    { id: '2', title: 'In Progress (4)', count: 4, items: ['Task Gamma'] },
    { id: '3', title: 'Completed (84)', count: 84, items: ['Task Delta'] }
  ];

  return (
    <div
      style={{
        backgroundColor: tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: tokens.radius,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: tokens.cardShadow
      }}
    >
      <span style={{ fontSize: '0.725rem', fontWeight: 800, color: tokens.cardText }}>
        {title || 'Kanban Progression'}
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 6 }}>
        {columns.map((col, idx) => (
          <div
            key={col.id || idx}
            style={{
              backgroundColor: tokens.cardSubtle,
              borderRadius: 4,
              padding: '5px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              border: `1px solid ${tokens.cardBorder}`,
              maxHeight: '180px',
              overflowY: 'auto'
            }}
          >
            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: tokens.cardTextMuted }}>
              {col.title}
            </span>
            {col.items.map((item, iIdx) => (
              <div
                key={iIdx}
                onClick={() => onAction && onAction(`Inspect kanban: ${item}`)}
                style={{
                  backgroundColor: tokens.cardBg,
                  border: `1px solid ${tokens.cardBorder}`,
                  borderRadius: 3,
                  padding: '4px 6px',
                  fontSize: '0.65rem',
                  color: tokens.cardText,
                  cursor: 'pointer'
                }}
              >
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. ACTIVITY FEED COMPONENT
// ---------------------------------------------------------------------------
function ActivityFeedComponent({ cmp, tokens, onAction }) {
  const { title, props = {} } = cmp;
  const activities = props.activities || [
    { id: '1', timestamp: '14:22 UTC', actor: 'Automated Agent', action: 'Executed rule verification', status: 'SUCCESS' },
    { id: '2', timestamp: '14:18 UTC', actor: 'Operator Sarah', action: 'Approved high-priority task', status: 'SUCCESS' }
  ];

  return (
    <div
      style={{
        backgroundColor: tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: tokens.radius,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: tokens.cardShadow
      }}
    >
      <span style={{ fontSize: '0.725rem', fontWeight: 800, color: tokens.cardText }}>
        {title || 'Activity & Audit Trail'}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '140px', overflowY: 'auto' }}>
        {activities.map((act) => (
          <div
            key={act.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 5,
              fontSize: '0.625rem',
              padding: '3px 0',
              borderBottom: `1px solid ${tokens.cardBorder}`
            }}
          >
            <Activity size={11} color={tokens.primary} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: tokens.cardTextMuted, fontSize: '0.575rem' }}>
                <span style={{ fontWeight: 700, color: tokens.cardText }}>{act.actor}</span>
                <span>{act.timestamp}</span>
              </div>
              <p style={{ margin: '1px 0 0', color: tokens.cardText }}>{act.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. GENERIC CARD COMPONENT
// ---------------------------------------------------------------------------
function GenericCardComponent({ cmp, tokens, onAction }) {
  const { title, props = {} } = cmp;
  return (
    <div
      style={{
        backgroundColor: tokens.cardBg,
        border: `1px solid ${tokens.cardBorder}`,
        borderRadius: tokens.radius,
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: tokens.cardShadow
      }}
    >
      <span style={{ fontSize: '0.725rem', fontWeight: 800, color: tokens.cardText }}>
        {title || 'Custom Component'}
      </span>
      <p style={{ margin: 0, fontSize: '0.65rem', color: tokens.cardTextMuted }}>
        {props.description || 'Dynamic operational block rendering verified design tokens.'}
      </p>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
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
  PieChart,
  X,
  Edit3,
  Trash2,
  Check,
  Play,
  Share2,
  Info
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
  PieChart,
  Play,
  Share2,
  Info
};

// ---------------------------------------------------------------------------
// COLOR LUMINANCE & AUTOMATIC CONTRAST ENGINE
// ---------------------------------------------------------------------------
function parseHexOrRgb(color) {
  if (!color || typeof color !== 'string') return [41, 35, 31];
  const trimmed = color.trim().toLowerCase();
  if (trimmed === 'white' || trimmed === '#fff' || trimmed === '#ffffff') return [255, 255, 255];
  if (trimmed === 'black' || trimmed === '#000' || trimmed === '#000000') return [0, 0, 0];
  if (trimmed === 'transparent') return [246, 241, 232];

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
  return [41, 35, 31];
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
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#746B62' }}>
        <p>No UI specification available for rendering.</p>
      </div>
    );
  }

  const { page = {}, layout = {}, theme = {}, navigation = [], components = [], actions = [] } = specification;

  // ---------------------------------------------------------------------------
  // INTERACTIVE APPLICATION DATA STORE
  // ---------------------------------------------------------------------------
  const initialTable = useMemo(() => {
    const tableCmp = components.find(c => (c.type || '').includes('table'));
    if (tableCmp?.props?.rows && Array.isArray(tableCmp.props.rows)) {
      return tableCmp.props.rows.map((r, i) => ({ ...r, internalId: r.id || `rec-${i + 1}` }));
    }
    return [
      { id: 'ITM-901', title: 'Automated Account Sync', category: 'Data Pipeline', priority: 'High', assignedActor: 'Sarah Jenkins', status: 'In Progress', actions: ['Open Details', 'Execute'] },
      { id: 'ITM-902', title: 'SLA Exception Ingestion', category: 'Compliance', priority: 'Critical', assignedActor: 'Automated Bot', status: 'Awaiting Signoff', actions: ['Approve', 'Escalate'] },
      { id: 'ITM-903', title: 'Daily Settlement Batch', category: 'Financial', priority: 'Medium', assignedActor: 'David Miller', status: 'Completed', actions: ['View Audit', 'Archive'] }
    ];
  }, [specification.page?.id]);

  const [itemsList, setItemsList] = useState(initialTable);
  useEffect(() => {
    setItemsList(initialTable);
  }, [initialTable]);

  const [kanbanItems, setKanbanItems] = useState([
    { id: 'kb-1', title: 'ITM-904: Cross-Border Geolocation Check', column: 'triage', priority: 'High' },
    { id: 'kb-2', title: 'ITM-901: Automated Account Sync', column: 'processing', priority: 'High' },
    { id: 'kb-3', title: 'ITM-903: Daily Settlement Batch', column: 'verified', priority: 'Medium' }
  ]);

  // Local interaction states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterChip, setActiveFilterChip] = useState('All');
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeTabId, setActiveTabId] = useState(navigation[0]?.id || 'nav-1');
  const [copilotActionNotice, setCopilotActionNotice] = useState(null);
  const [isCopilotExecuting, setIsCopilotExecuting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Just now');

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRationaleModal, setShowRationaleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // New Item Form State
  const [newItemForm, setNewItemForm] = useState({
    title: '',
    category: 'Operations',
    priority: 'High',
    assignedActor: 'Sarah Jenkins',
    status: 'In Progress'
  });

  const isMobile = deviceView === 'mobile';
  const isTablet = deviceView === 'tablet';

  const triggerToast = (msg) => {
    setToastMessage(msg);
    if (onTriggerAction) onTriggerAction(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // CRUD & ACTION DISPATCHERS
  // ---------------------------------------------------------------------------
  const handleCreateWorkItem = (e) => {
    e.preventDefault();
    if (!newItemForm.title.trim()) return;

    const newId = `ITM-${Math.floor(100 + Math.random() * 900)}`;
    const createdItem = {
      id: newId,
      title: newItemForm.title.trim(),
      category: newItemForm.category,
      priority: newItemForm.priority,
      assignedActor: newItemForm.assignedActor,
      status: newItemForm.status,
      actions: ['Open Details', 'Execute']
    };

    setItemsList((prev) => [createdItem, ...prev]);
    setKanbanItems((prev) => [
      { id: `kb-${Date.now()}`, title: `${newId}: ${createdItem.title}`, column: 'triage', priority: createdItem.priority },
      ...prev
    ]);
    setShowAddModal(false);
    setNewItemForm({ title: '', category: 'Operations', priority: 'High', assignedActor: 'Sarah Jenkins', status: 'In Progress' });
    triggerToast(`Created Work Item: ${newId}`);
  };

  const handleApprove = (rowId) => {
    setItemsList((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, status: 'Completed' } : item))
    );
    setKanbanItems((prev) =>
      prev.map((k) => (k.title.includes(rowId) ? { ...k, column: 'verified' } : k))
    );
    triggerToast(`Approved & Verified: ${rowId}`);
  };

  const handleEscalate = (rowId) => {
    setItemsList((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, priority: 'Critical', status: 'Escalated' } : item))
    );
    triggerToast(`Escalated to Tier 2 Lead: ${rowId}`);
  };

  const handleExecute = (rowId) => {
    setItemsList((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, status: 'In Progress' } : item))
    );
    setKanbanItems((prev) =>
      prev.map((k) => (k.title.includes(rowId) ? { ...k, column: 'processing' } : k))
    );
    triggerToast(`Executed Resolution on ${rowId}`);
  };

  const handleArchive = (rowId) => {
    setItemsList((prev) => prev.filter((item) => item.id !== rowId));
    setKanbanItems((prev) => prev.filter((k) => !k.title.includes(rowId)));
    triggerToast(`Archived Record: ${rowId}`);
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime('Just now');
      triggerToast('Synced telemetry and live queue');
    }, 600);
  };

  const handleBatchRun = () => {
    setItemsList((prev) =>
      prev.map((item) => ({ ...item, status: 'Completed' }))
    );
    setKanbanItems((prev) =>
      prev.map((k) => ({ ...k, column: 'verified' }))
    );
    triggerToast('Batch Run executed: all active items resolved');
  };

  const handleExecuteCopilotAction = (actionItem) => {
    setIsCopilotExecuting(true);
    const label = typeof actionItem === 'string' ? actionItem : (actionItem.label || 'Copilot action');
    setTimeout(() => {
      setIsCopilotExecuting(false);
      setCopilotActionNotice(`Executed: ${label}`);
      // Mark first pending item completed
      setItemsList((prev) => {
        if (prev.length > 0) {
          const updated = [...prev];
          updated[0] = { ...updated[0], status: 'Completed' };
          return updated;
        }
        return prev;
      });
      triggerToast(`AI Copilot executed: ${label}`);
      setTimeout(() => setCopilotActionNotice(null), 3500);
    }, 500);
  };

  const handleExportSpec = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(specification, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${(page.name || 'ui-specification').toLowerCase().replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast('Exported UI specification JSON');
  };

  const handleExportTelemetry = () => {
    const telemetryData = {
      screenId: page.id,
      timestamp: new Date().toISOString(),
      activeItems: itemsList.length,
      throughput: '1,420/hr',
      slaCompliance: '99.4%',
      records: itemsList
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(telemetryData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `telemetry-log-${page.id || 'export'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast('Downloaded telemetry audit log');
  };

  // ---------------------------------------------------------------------------
  // DYNAMIC DUAL-TIER CONTRAST SYSTEM (CANVAS vs CARD)
  // ---------------------------------------------------------------------------
  const isLightMode = Boolean(
    theme.mode === 'light' ||
    theme.id === 'warm-cream' ||
    (theme.background && !isDark(theme.background)) ||
    (theme.bgPrimary && !isDark(theme.bgPrimary))
  );

  const canvasBg = isLightMode
    ? (theme.background && !isDark(theme.background) ? theme.background : '#F6F1E8')
    : (theme.background || '#0B0F19');
  const isCanvasDark = isLightMode ? false : isDark(canvasBg);

  const rawCardBg = theme.cardBg || theme.surface;
  const cardBg = isLightMode
    ? (rawCardBg && !isDark(rawCardBg) ? rawCardBg : '#FFFDF8')
    : (rawCardBg && isDark(rawCardBg) ? rawCardBg : (isCanvasDark ? '#111827' : '#FFFDF8'));
  const isCardDark = isLightMode ? false : isDark(cardBg);

  const tokens = {
    isCanvasDark,
    isCardDark,
    canvasBg,
    canvasText: isLightMode ? '#29231F' : (isCanvasDark ? '#FFFFFF' : '#0F172A'),
    canvasTextMuted: isLightMode ? '#746B62' : (isCanvasDark ? '#94A3B8' : '#475569'),
    canvasBorder: isLightMode ? '#D8CCBC' : (isCanvasDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)'),

    cardBg,
    cardText: isLightMode ? '#29231F' : (isCardDark ? '#FFFFFF' : '#0F172A'),
    cardTextMuted: isLightMode ? '#746B62' : (isCardDark ? '#94A3B8' : '#64748B'),
    cardBorder: isLightMode ? '#D8CCBC' : (isCardDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
    cardSubtle: isLightMode ? '#F1E9DD' : (isCardDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
    cardShadow: isLightMode
      ? '0 1px 3px rgba(41, 35, 31, 0.06), 0 1px 2px rgba(41, 35, 31, 0.04)'
      : (isCardDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'),

    primary: isLightMode ? '#8B4513' : (theme.primary || (isCanvasDark ? '#3B82F6' : '#2563EB')),
    primaryHover: isLightMode ? '#6F350F' : '#1D4ED8',
    accent: isLightMode ? '#B66A24' : (theme.accent || theme.primary || (isCanvasDark ? '#60A5FA' : '#3B82F6')),
    buttonPrimary: isLightMode ? '#8B4513' : (theme.buttonPrimary || theme.primary || '#2563EB'),

    btnSecondaryBg: isLightMode ? '#FFFDF8' : (isCanvasDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF'),
    btnSecondaryBorder: isLightMode ? '#D8CCBC' : (isCanvasDark ? 'rgba(255, 255, 255, 0.18)' : '#CBD5E1'),
    btnSecondaryText: isLightMode ? '#29231F' : (isCanvasDark ? '#F1F5F9' : '#1E293B'),

    cardBtnSecondaryBg: isLightMode ? '#F1E9DD' : (isCardDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF'),
    cardBtnSecondaryBorder: isLightMode ? '#D8CCBC' : (isCardDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1'),
    cardBtnSecondaryText: isLightMode ? '#29231F' : (isCardDark ? '#F1F5F9' : '#1E293B'),

    tableHeaderBg: isLightMode ? '#F1E9DD' : (isCardDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
    tableHeaderText: isLightMode ? '#746B62' : (isCardDark ? '#CBD5E1' : '#475569'),

    success: isLightMode ? '#2F7D5B' : '#10B981',
    warning: isLightMode ? '#B7791F' : '#F59E0B',
    danger: isLightMode ? '#B84A4A' : '#EF4444',

    radius: theme.radius || (isLightMode ? '10px' : '8px')
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

  // Filtered Table Records
  const filteredRecords = useMemo(() => {
    return itemsList.filter((row) => {
      if (searchQuery) {
        const rowStr = Object.values(row).join(' ').toLowerCase();
        if (!rowStr.includes(searchQuery.toLowerCase())) return false;
      }
      if (activeFilterChip && activeFilterChip !== 'All' && !activeFilterChip.includes('All')) {
        const chipWord = activeFilterChip.toLowerCase().replace(/items|patients|orders|records|active/g, '').trim();
        const rowStr = Object.values(row).join(' ').toLowerCase();
        if (chipWord && !rowStr.includes(chipWord)) {
          return false;
        }
      }
      return true;
    });
  }, [itemsList, searchQuery, activeFilterChip]);

  return (
    <div
      style={{
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
        gap: gridGap,
        position: 'relative'
      }}
      className="dynamic-ui-container"
    >
      {/* 1. TOP HEADER & SCREEN IDENTITY */}
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
              backgroundColor: `${tokens.primary}20`,
              border: `1px solid ${tokens.primary}35`,
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
                  backgroundColor: `${tokens.primary}18`,
                  color: tokens.primary,
                  border: `1px solid ${tokens.primary}30`,
                  flexShrink: 0
                }}
              >
                {page.businessDomain || 'ENTERPRISE'}
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
          <button
            type="button"
            onClick={handleBatchRun}
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
              border: 'none',
              backgroundColor: tokens.buttonPrimary,
              color: '#FFFFFF',
              transition: 'all 0.15s ease',
              boxShadow: `0 2px 8px ${tokens.primary}30`
            }}
          >
            <Zap size={12} />
            Execute Resolution
          </button>
          <button
            type="button"
            onClick={handleExportSpec}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: tokens.radius,
              fontSize: '0.725rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: `1px solid ${tokens.btnSecondaryBorder}`,
              backgroundColor: tokens.btnSecondaryBg,
              color: tokens.btnSecondaryText,
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={12} />
            Export Spec
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      {navigation.length > 0 && (
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
                onClick={() => {
                  setActiveTabId(nav.id);
                  triggerToast(`Switched view: ${nav.label}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: tokens.radius,
                  border: 'none',
                  backgroundColor: isActive ? `${tokens.primary}18` : 'transparent',
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
                      backgroundColor: isActive ? tokens.primary : (tokens.isCanvasDark ? 'rgba(255,255,255,0.1)' : tokens.cardSubtle),
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

      {/* 3. KPI STATS STRIP */}
      {categorized.kpis.map((cmp) => (
        <div key={cmp.id} style={{ width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
          <KpiGridComponent
            cmp={cmp}
            tokens={tokens}
            isMobile={isMobile}
            isTablet={isTablet}
            itemsCount={itemsList.length}
            onAction={triggerToast}
          />
        </div>
      ))}

      {/* 4. SEARCH & FILTER TOOLBAR */}
      <div style={{ width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
        <SearchFilterBarComponent
          tokens={tokens}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilterChip={activeFilterChip}
          setActiveFilterChip={setActiveFilterChip}
          onOpenAddModal={() => setShowAddModal(true)}
          onBatchRun={handleBatchRun}
          totalCount={filteredRecords.length}
        />
      </div>

      {/* 5. WORKSTATION SPLIT-GRID */}
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
                onInspectRationale={() => setShowRationaleModal(true)}
                onExportTelemetry={handleExportTelemetry}
                isExecuting={isCopilotExecuting}
                actionNotice={copilotActionNotice}
              />
            ))}
          </div>
        )}

        {/* Center Main Workstation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: gridGap, minHeight: 0, height: isMobile ? 'auto' : '100%', width: '100%', boxSizing: 'border-box', overflow: isMobile ? 'visible' : 'hidden' }}>
          {/* Primary Table (Interactive CRUD) */}
          <div style={{ flex: 1, minHeight: isMobile ? 'auto' : '170px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <DataTableComponent
              title={categorized.tables[0]?.title || 'Active Operational Work Queue'}
              columns={categorized.tables[0]?.props?.columns || ['Item ID', 'Title / Description', 'Category', 'Priority', 'Assigned Actor', 'Status', 'Actions']}
              records={filteredRecords}
              tokens={tokens}
              searchQuery={searchQuery}
              onApprove={handleApprove}
              onEscalate={handleEscalate}
              onExecute={handleExecute}
              onArchive={handleArchive}
              onOpenDetails={(row) => {
                setSelectedRow(row);
                setShowDetailsModal(true);
              }}
              onSync={handleSync}
              isSyncing={isSyncing}
              lastSyncTime={lastSyncTime}
            />
          </div>

          {/* Kanban Board (Interactive State Movement) */}
          {categorized.kanbans.map((cmp) => (
            <KanbanBoardComponent
              key={cmp.id}
              cmp={cmp}
              tokens={tokens}
              kanbanItems={kanbanItems}
              onMoveItem={(itemId, newCol) => {
                setKanbanItems((prev) =>
                  prev.map((k) => (k.id === itemId ? { ...k, column: newCol } : k))
                );
                triggerToast(`Moved task to ${newCol.toUpperCase()}`);
              }}
            />
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
                <ChartComponent key={cmp.id} cmp={cmp} tokens={tokens} onAction={triggerToast} />
              ))}

              {categorized.workflows.map((cmp) => (
                <WorkflowTrackerComponent key={cmp.id} cmp={cmp} tokens={tokens} onAction={triggerToast} />
              ))}
            </div>
          )}

          {/* Other Custom Widgets */}
          {categorized.others.map((cmp) => (
            <GenericCardComponent key={cmp.id} cmp={cmp} tokens={tokens} onAction={triggerToast} />
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
                onInspectRationale={() => setShowRationaleModal(true)}
                onExportTelemetry={handleExportTelemetry}
                isExecuting={isCopilotExecuting}
                actionNotice={copilotActionNotice}
              />
            ))}

            {categorized.activities.length > 0 && (
              categorized.activities.map((cmp) => (
                <ActivityFeedComponent key={cmp.id} cmp={cmp} tokens={tokens} onAction={triggerToast} />
              ))
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 6. MODAL 1: ADD NEW WORK ITEM (Controlled Form) */}
      {/* ------------------------------------------------------------------- */}
      {showAddModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              backgroundColor: tokens.cardBg,
              border: `1px solid ${tokens.cardBorder}`,
              borderRadius: tokens.radius,
              padding: '16px 20px',
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: tokens.cardText }}>
                Create New Work Item
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.cardTextMuted }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkItem} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: tokens.cardTextMuted, marginBottom: 4 }}>
                  Title / Task Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ingestion Pipeline Reconciliation"
                  value={newItemForm.title}
                  onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: `1px solid ${tokens.cardBorder}`,
                    backgroundColor: tokens.cardSubtle,
                    color: tokens.cardText,
                    fontSize: '0.75rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: tokens.cardTextMuted, marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: 4,
                      border: `1px solid ${tokens.cardBorder}`,
                      backgroundColor: tokens.cardSubtle,
                      color: tokens.cardText,
                      fontSize: '0.725rem'
                    }}
                  >
                    <option value="Operations">Operations</option>
                    <option value="Data Pipeline">Data Pipeline</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Financial">Financial</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: tokens.cardTextMuted, marginBottom: 4 }}>
                    Priority
                  </label>
                  <select
                    value={newItemForm.priority}
                    onChange={(e) => setNewItemForm({ ...newItemForm, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: 4,
                      border: `1px solid ${tokens.cardBorder}`,
                      backgroundColor: tokens.cardSubtle,
                      color: tokens.cardText,
                      fontSize: '0.725rem'
                    }}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: tokens.cardTextMuted, marginBottom: 4 }}>
                  Assigned Actor
                </label>
                <input
                  type="text"
                  value={newItemForm.assignedActor}
                  onChange={(e) => setNewItemForm({ ...newItemForm, assignedActor: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: `1px solid ${tokens.cardBorder}`,
                    backgroundColor: tokens.cardSubtle,
                    color: tokens.cardText,
                    fontSize: '0.75rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: `1px solid ${tokens.cardBorder}`,
                    backgroundColor: tokens.cardSubtle,
                    color: tokens.cardText,
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 14px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: tokens.buttonPrimary,
                    color: '#FFFFFF',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Work Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 7. MODAL 2: INSPECT AI DECISION RATIONALE */}
      {/* ------------------------------------------------------------------- */}
      {showRationaleModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}
          onClick={() => setShowRationaleModal(false)}
        >
          <div
            style={{
              backgroundColor: tokens.cardBg,
              border: `1px solid ${tokens.cardBorder}`,
              borderRadius: tokens.radius,
              padding: '16px 20px',
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bot size={16} color={tokens.primary} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: tokens.cardText }}>
                  Model Decision Explainability
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRationaleModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.cardTextMuted }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.725rem' }}>
              <div style={{ backgroundColor: tokens.cardSubtle, padding: '8px 10px', borderRadius: 4, border: `1px solid ${tokens.cardBorder}` }}>
                <div style={{ fontWeight: 700, color: tokens.cardText, marginBottom: 2 }}>Confidence Score: 98.4%</div>
                <div style={{ color: tokens.cardTextMuted }}>Verified against 12 historical exception runs with zero regression.</div>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: tokens.cardTextMuted, fontSize: '0.65rem', textTransform: 'uppercase' }}>Key Decision Drivers:</span>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: tokens.cardText, lineHeight: 1.5 }}>
                  <li>SLA deadline remaining &lt; 4.0 minutes (Weight: 0.42)</li>
                  <li>Alternative route available without fee penalty (Weight: 0.38)</li>
                  <li>Automated bot trust tier certified (Weight: 0.20)</li>
                </ul>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowRationaleModal(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: tokens.buttonPrimary,
                    color: '#FFFFFF',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Close Rationale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 8. MODAL 3: ROW DETAILS INSPECTOR */}
      {/* ------------------------------------------------------------------- */}
      {showDetailsModal && selectedRow && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16
          }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            style={{
              backgroundColor: tokens.cardBg,
              border: `1px solid ${tokens.cardBorder}`,
              borderRadius: tokens.radius,
              padding: '16px 20px',
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} color={tokens.primary} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: tokens.cardText }}>
                  Record: {selectedRow.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.cardTextMuted }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.725rem' }}>
              {Object.entries(selectedRow)
                .filter(([k]) => k !== 'internalId' && k !== 'actions')
                .map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${tokens.cardBorder}` }}>
                    <span style={{ fontWeight: 700, color: tokens.cardTextMuted, textTransform: 'capitalize' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: tokens.cardText }}>{String(v)}</span>
                  </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  handleApprove(selectedRow.id);
                  setShowDetailsModal(false);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: tokens.success,
                  color: '#FFFFFF',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 4,
                  border: `1px solid ${tokens.cardBorder}`,
                  backgroundColor: tokens.cardSubtle,
                  color: tokens.cardText,
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 9. PROTOTYPE ACTION TOAST NOTIFICATION */}
      {/* ------------------------------------------------------------------- */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 14,
            backgroundColor: tokens.buttonPrimary,
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: '0.725rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            zIndex: 110,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <CheckCircle2 size={13} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 1. KPI GRID COMPONENT
// ---------------------------------------------------------------------------
function KpiGridComponent({ cmp, tokens, isMobile, isTablet, itemsCount, onAction }) {
  const defaultItems = [
    { label: 'Operational Throughput', value: '1,420/hr', change: '+14%', trend: 'up', icon: 'Zap' },
    { label: 'Mean SLA Resolution', value: '1.8 min', change: 'Target < 3m', trend: 'down', icon: 'Clock' },
    { label: 'Work Queue Backlog', value: `${itemsCount} items`, change: '-28%', trend: 'down', icon: 'Inbox' },
    { label: 'Automated Copilot Accuracy', value: '98.4%', change: 'Audited', trend: 'up', icon: 'Bot' }
  ];

  const items = cmp.props?.items || defaultItems;

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
                  backgroundColor: `${tokens.primary}18`,
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
                {idx === 2 ? `${itemsCount} items` : item.value}
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
                    backgroundColor: isUp ? 'rgba(47, 125, 91, 0.12)' : 'rgba(184, 74, 74, 0.12)',
                    color: isUp ? tokens.success : tokens.danger,
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
function SearchFilterBarComponent({
  tokens,
  searchQuery,
  setSearchQuery,
  activeFilterChip,
  setActiveFilterChip,
  onOpenAddModal,
  onBatchRun,
  totalCount
}) {
  const filterChips = ['All', 'High Priority', 'SLA Critical', 'In Progress', 'Completed'];

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
          maxWidth: 340,
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
          placeholder="Search items by ID, title, actor..."
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {filterChips.map((chip, cIdx) => {
          const isSelected = activeFilterChip === chip || (activeFilterChip === 'All' && cIdx === 0);
          return (
            <button
              key={cIdx}
              type="button"
              onClick={() => setActiveFilterChip(chip)}
              style={{
                fontSize: '0.65rem',
                fontWeight: isSelected ? 700 : 500,
                padding: '2px 7px',
                borderRadius: 12,
                border: isSelected ? `1px solid ${tokens.primary}` : `1px solid ${tokens.cardBorder}`,
                backgroundColor: isSelected ? `${tokens.primary}20` : tokens.cardSubtle,
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

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <button
          type="button"
          onClick={onOpenAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: '0.675rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: tokens.buttonPrimary,
            color: '#FFFFFF'
          }}
        >
          <Plus size={11} />
          + Add Work Item
        </button>

        <button
          type="button"
          onClick={onBatchRun}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: '0.675rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: `1px solid ${tokens.cardBtnSecondaryBorder}`,
            backgroundColor: tokens.cardBtnSecondaryBg,
            color: tokens.cardBtnSecondaryText
          }}
        >
          <Play size={11} />
          Batch Actions
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. DATA TABLE COMPONENT
// ---------------------------------------------------------------------------
function DataTableComponent({
  title,
  columns,
  records,
  tokens,
  searchQuery,
  onApprove,
  onEscalate,
  onExecute,
  onArchive,
  onOpenDetails,
  onSync,
  isSyncing,
  lastSyncTime
}) {
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
              backgroundColor: `${tokens.primary}18`,
              color: tokens.primary
            }}
          >
            {records.length} items
          </span>
        </div>

        <button
          type="button"
          onClick={onSync}
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
          <RefreshCw size={10} className={isSyncing ? 'spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync'}
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
            {records.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '20px 10px', textAlign: 'center', color: tokens.cardTextMuted }}>
                  No matching records found for "{searchQuery}".
                </td>
              </tr>
            ) : (
              records.map((row, rIdx) => {
                const isCritical = /critical|urgent|warning|escalated/i.test(row.priority || row.status);
                const isCompleted = /completed|verified|delivered|settled/i.test(row.status);

                return (
                  <tr
                    key={row.id || rIdx}
                    onClick={() => onOpenDetails(row)}
                    style={{
                      borderBottom: `1px solid ${tokens.cardBorder}`,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = tokens.cardSubtle;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: tokens.primary, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {row.id}
                    </td>

                    <td style={{ padding: '6px 8px', color: tokens.cardText, whiteSpace: 'nowrap' }}>
                      {row.title || row.customer || row.description}
                    </td>

                    <td style={{ padding: '6px 8px', color: tokens.cardTextMuted, whiteSpace: 'nowrap' }}>
                      {row.category || row.bookingRef || 'General'}
                    </td>

                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 8,
                          backgroundColor: isCritical ? 'rgba(184, 74, 74, 0.12)' : `${tokens.primary}18`,
                          color: isCritical ? tokens.danger : tokens.primary,
                          border: isCritical ? `1px solid ${tokens.danger}35` : `1px solid ${tokens.primary}30`
                        }}
                      >
                        {row.priority || 'Normal'}
                      </span>
                    </td>

                    <td style={{ padding: '6px 8px', color: tokens.cardText, whiteSpace: 'nowrap' }}>
                      {row.assignedActor || row.agent || row.actor || 'Sarah Jenkins'}
                    </td>

                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: 8,
                          backgroundColor: isCompleted ? 'rgba(47, 125, 91, 0.12)' : `${tokens.primary}15`,
                          color: isCompleted ? tokens.success : tokens.primary,
                          border: isCompleted ? `1px solid ${tokens.success}35` : `1px solid ${tokens.primary}30`
                        }}
                      >
                        {row.status || 'Active'}
                      </span>
                    </td>

                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApprove(row.id);
                          }}
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '2px 5px',
                            borderRadius: 3,
                            border: `1px solid ${tokens.success}40`,
                            backgroundColor: 'rgba(47, 125, 91, 0.12)',
                            color: tokens.success,
                            cursor: 'pointer'
                          }}
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEscalate(row.id);
                          }}
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            padding: '2px 5px',
                            borderRadius: 3,
                            border: `1px solid ${tokens.cardBtnSecondaryBorder}`,
                            backgroundColor: tokens.cardBtnSecondaryBg,
                            color: tokens.cardBtnSecondaryText,
                            cursor: 'pointer'
                          }}
                        >
                          Escalate
                        </button>
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
function AiCopilotPanelComponent({
  cmp,
  tokens,
  onExecute,
  onInspectRationale,
  onExportTelemetry,
  isExecuting,
  actionNotice
}) {
  const { title, props = {} } = cmp;
  const score = props.confidenceScore || 97;
  const recommendation = props.recommendation || 'Autonomous analysis verified optimal parameters. Ready for single-click execution.';
  const badges = props.contextBadges || ['Audited Model', 'Real-Time Sync'];

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
        boxShadow: tokens.cardShadow,
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Bot size={14} color={tokens.primary} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: tokens.cardText }}>
            {title || 'AI Decision Assistant'}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 10,
            backgroundColor: `${tokens.primary}18`,
            color: tokens.primary,
            border: `1px solid ${tokens.primary}30`
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
          maxHeight: '85px',
          overflowY: 'auto'
        }}
      >
        {recommendation}
      </div>

      {actionNotice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.625rem', color: tokens.success, backgroundColor: 'rgba(47, 125, 91, 0.12)', padding: '4px 6px', borderRadius: 4 }}>
          <CheckCircle2 size={11} />
          <span>{actionNotice}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          type="button"
          disabled={isExecuting}
          onClick={() => onExecute('Accept & Execute Plan')}
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
            border: 'none',
            backgroundColor: tokens.buttonPrimary,
            color: '#FFFFFF',
            transition: 'all 0.15s ease'
          }}
        >
          {isExecuting ? <RefreshCw size={10} className="spin" /> : <Zap size={10} />}
          Accept & Execute Plan
        </button>

        <button
          type="button"
          onClick={onInspectRationale}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: '0.65rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: `1px solid ${tokens.cardBtnSecondaryBorder}`,
            backgroundColor: tokens.cardBtnSecondaryBg,
            color: tokens.cardBtnSecondaryText
          }}
        >
          <Info size={10} />
          Inspect Model Rationale
        </button>

        <button
          type="button"
          onClick={onExportTelemetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: '0.65rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: `1px solid ${tokens.cardBtnSecondaryBorder}`,
            backgroundColor: tokens.cardBtnSecondaryBg,
            color: tokens.cardBtnSecondaryText
          }}
        >
          <Download size={10} />
          Export Telemetry Log
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. CHART COMPONENT
// ---------------------------------------------------------------------------
function ChartComponent({ cmp, tokens, onAction }) {
  const { title, props = {} } = cmp;
  const chartType = props.chartType || 'bar';
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
          {title || 'Telemetry Velocity Analytics'}
        </span>
        <span style={{ fontSize: '0.575rem', fontWeight: 600, color: tokens.primary, padding: '1px 4px', borderRadius: 3, backgroundColor: `${tokens.primary}18` }}>
          {chartType.toUpperCase()}
        </span>
      </div>

      {chartType === 'donut' ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '4px 0' }}>
          <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', background: `conic-gradient(${tokens.primary} 0% 55%, ${tokens.success} 55% 85%, ${tokens.warning} 85% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: tokens.cardBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: tokens.cardText }}>100%</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.625rem' }}>
            {categories.slice(0, 3).map((cat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, color: tokens.cardTextMuted }}>
                <div style={{ width: 5, height: 5, borderRadius: 2, backgroundColor: idx === 0 ? tokens.primary : (idx === 1 ? tokens.success : tokens.warning) }} />
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
        {title || 'Core Process Execution Lifecycle'}
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
                {isDone ? <CheckCircle2 size={10} color={tokens.success} /> : (isCurr ? <Zap size={10} color={tokens.primary} /> : <Clock size={10} color={tokens.cardTextMuted} />)}
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
// 7. KANBAN BOARD COMPONENT (Interactive State Progression)
// ---------------------------------------------------------------------------
function KanbanBoardComponent({ cmp, tokens, kanbanItems, onMoveItem }) {
  const { title } = cmp;
  const columns = [
    { id: 'triage', title: 'Triage Queue', nextCol: 'processing' },
    { id: 'processing', title: 'Processing', nextCol: 'verified' },
    { id: 'verified', title: 'Verified', nextCol: 'triage' }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.725rem', fontWeight: 800, color: tokens.cardText }}>
          {title || 'Workforce & Task Kanban Progression'}
        </span>
        <span style={{ fontSize: '0.6rem', color: tokens.cardTextMuted }}>
          Click card to advance column
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 6 }}>
        {columns.map((col) => {
          const colItems = kanbanItems.filter((k) => k.column === col.id);

          return (
            <div
              key={col.id}
              style={{
                backgroundColor: tokens.cardSubtle,
                borderRadius: 4,
                padding: '5px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                border: `1px solid ${tokens.cardBorder}`,
                maxHeight: '160px',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: tokens.cardTextMuted }}>
                  {col.title}
                </span>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: tokens.primary }}>
                  {colItems.length}
                </span>
              </div>

              {colItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onMoveItem(item.id, col.nextCol)}
                  title={`Click to move to ${col.nextCol.toUpperCase()}`}
                  style={{
                    backgroundColor: tokens.cardBg,
                    border: `1px solid ${tokens.cardBorder}`,
                    borderRadius: 3,
                    padding: '4px 6px',
                    fontSize: '0.65rem',
                    color: tokens.cardText,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = tokens.primary)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = tokens.cardBorder)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                  <ChevronRight size={10} color={tokens.primary} style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          );
        })}
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

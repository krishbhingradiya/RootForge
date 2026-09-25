/**
 * Dynamic UI Specification Schema, Validator & Domain Builders
 * 
 * Defines the strict structured JSON schema for RootForge Dynamic UI Generation,
 * self-healing validator, design token definitions, and domain-specific UI synthesizers.
 */

export const THEME_ARCHETYPES = {
  'enterprise-slate': {
    id: 'enterprise-slate',
    name: 'Clean Enterprise Slate',
    mode: 'dark',
    primary: '#2563EB',
    secondary: '#1D4ED8',
    accent: '#3B82F6',
    surface: '#111827',
    background: '#0B0F19',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
    border: 'rgba(255, 255, 255, 0.1)',
    radius: '8px',
    density: 'comfortable',
    fontFamily: 'Plus Jakarta Sans, Inter, sans-serif'
  },
  'cyber-ops': {
    id: 'cyber-ops',
    name: 'Command Center Cyber Ops',
    mode: 'dark',
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    surface: '#0B1120',
    background: '#05080F',
    text: '#ECFDF5',
    textMuted: '#6EE7B7',
    border: 'rgba(16, 185, 129, 0.25)',
    radius: '6px',
    density: 'compact',
    fontFamily: 'JetBrains Mono, monospace, sans-serif'
  },
  'saas-modern': {
    id: 'saas-modern',
    name: 'Modern SaaS Glassmorphism',
    mode: 'dark',
    primary: '#D97706',
    secondary: '#B45309',
    accent: '#F59E0B',
    surface: '#1E293B',
    background: '#0F172A',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    border: 'rgba(255, 255, 255, 0.08)',
    radius: '12px',
    density: 'comfortable',
    fontFamily: 'Plus Jakarta Sans, Inter, sans-serif'
  },
  'warm-cream': {
    id: 'warm-cream',
    name: 'Warm Cream & Ivory',
    mode: 'light',
    primary: '#92400E',
    secondary: '#78350F',
    accent: '#B45309',
    surface: '#FFFFFF',
    background: '#FDF8F0',
    text: '#1C1917',
    textMuted: '#78716C',
    border: 'rgba(28, 25, 23, 0.12)',
    radius: '10px',
    density: 'comfortable',
    fontFamily: 'Plus Jakarta Sans, sans-serif'
  },
  'warm-luxury': {
    id: 'warm-luxury',
    name: 'Editorial Warm Luxury',
    mode: 'dark',
    primary: '#F59E0B',
    secondary: '#D97706',
    accent: '#FBBF24',
    surface: '#1C1917',
    background: '#14120E',
    text: '#FEF3C7',
    textMuted: '#D6D3D1',
    border: 'rgba(245, 158, 11, 0.18)',
    radius: '14px',
    density: 'spacious',
    fontFamily: 'Plus Jakarta Sans, Georgia, serif'
  },
  'nordic-clean': {
    id: 'nordic-clean',
    name: 'Nordic Clean Monochrome',
    mode: 'dark',
    primary: '#38BDF8',
    secondary: '#0284C7',
    accent: '#7DD3FC',
    surface: '#13151A',
    background: '#090A0C',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    border: 'rgba(255, 255, 255, 0.12)',
    radius: '8px',
    density: 'compact',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  'fintech-violet': {
    id: 'fintech-violet',
    name: 'FinTech Electric Violet',
    mode: 'dark',
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    accent: '#A78BFA',
    surface: '#171328',
    background: '#0D0B18',
    text: '#F5F3FF',
    textMuted: '#C4B5FD',
    border: 'rgba(139, 92, 246, 0.22)',
    radius: '10px',
    density: 'comfortable',
    fontFamily: 'Plus Jakarta Sans, sans-serif'
  }
};

/**
 * Validates a UI specification against the schema and auto-repairs common issues.
 * @param {object} spec
 * @returns {{ valid: boolean, errors: string[], repairedSpec: object }}
 */
export function validateAndRepairUiSpecification(spec, fallbackThemeId = 'enterprise-slate') {
  const errors = [];
  if (!spec || typeof spec !== 'object') {
    errors.push('UI specification must be an object');
    return {
      valid: false,
      errors,
      repairedSpec: createDefaultUiSpecification('Custom Operations', 'GENERAL_ENTERPRISE', fallbackThemeId)
    };
  }

  const repaired = JSON.parse(JSON.stringify(spec));

  // 1. Validate / Repair Page
  if (!repaired.page || typeof repaired.page !== 'object') {
    repaired.page = {
      id: `page-${Date.now()}`,
      name: 'Operations Dashboard',
      purpose: 'Primary operational workspace',
      businessDomain: 'ENTERPRISE'
    };
    errors.push('Repaired missing page metadata');
  } else {
    if (!repaired.page.id) repaired.page.id = `page-${Date.now()}`;
    if (!repaired.page.name) repaired.page.name = 'Operations Dashboard';
    if (!repaired.page.businessDomain) repaired.page.businessDomain = 'ENTERPRISE';
  }

  // 2. Validate / Repair Layout
  if (!repaired.layout || typeof repaired.layout !== 'object') {
    repaired.layout = {
      type: 'sidebar-grid',
      columns: 3,
      gap: 16,
      density: 'comfortable',
      sidebarPosition: 'left',
      sidebarCollapsible: true
    };
    errors.push('Repaired missing layout configuration');
  } else {
    repaired.layout.type = repaired.layout.type || 'sidebar-grid';
    repaired.layout.columns = repaired.layout.columns || 3;
    repaired.layout.density = repaired.layout.density || 'comfortable';
    repaired.layout.sidebarPosition = repaired.layout.sidebarPosition || 'left';
  }

  // 3. Validate / Repair Theme
  const activeTheme = THEME_ARCHETYPES[repaired.theme?.id || fallbackThemeId] || THEME_ARCHETYPES['enterprise-slate'];
  const baseTheme = repaired.theme || {};
  repaired.theme = {
    ...activeTheme,
    ...baseTheme,
    primary: baseTheme.primary || activeTheme.primary,
    secondary: baseTheme.secondary || activeTheme.secondary,
    accent: baseTheme.accent || activeTheme.accent,
    surface: baseTheme.surface || activeTheme.surface,
    cardBg: baseTheme.cardBg || baseTheme.surface || activeTheme.surface,
    background: baseTheme.background || activeTheme.background,
    text: baseTheme.text || activeTheme.text,
    textMuted: baseTheme.textMuted || activeTheme.textMuted,
    border: baseTheme.border || activeTheme.border,
    buttonPrimary: baseTheme.buttonPrimary || baseTheme.primary || activeTheme.primary,
    buttonSecondary: baseTheme.buttonSecondary || baseTheme.secondary || activeTheme.secondary,
    radius: baseTheme.radius || activeTheme.radius || '8px',
    density: baseTheme.density || repaired.layout?.density || activeTheme.density || 'comfortable',
    fontFamily: baseTheme.fontFamily || activeTheme.fontFamily || 'Plus Jakarta Sans, Inter, sans-serif'
  };

  // 4. Validate / Repair Navigation
  if (!Array.isArray(repaired.navigation) || repaired.navigation.length === 0) {
    repaired.navigation = [
      { id: 'nav-1', label: 'Overview', icon: 'LayoutDashboard', active: true },
      { id: 'nav-2', label: 'Workflows', icon: 'Layers', active: false },
      { id: 'nav-3', label: 'Analytics', icon: 'BarChart3', active: false },
      { id: 'nav-4', label: 'Settings', icon: 'SlidersHorizontal', active: false }
    ];
  }

  // 5. Validate / Repair Sections & Components
  if (!Array.isArray(repaired.sections) || repaired.sections.length === 0) {
    repaired.sections = [
      { id: 'sec-metrics', title: 'Key Performance Indicators', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-kpi-grid'] },
      { id: 'sec-main', title: 'Active Operations & Workflows', columnSpan: 8, rowOrder: 2, componentIds: ['cmp-data-table'] },
      { id: 'sec-sidebar', title: 'AI Copilot & Insights', columnSpan: 4, rowOrder: 3, componentIds: ['cmp-copilot'] }
    ];
  }

  if (!Array.isArray(repaired.components) || repaired.components.length === 0) {
    repaired.components = [
      {
        id: 'cmp-kpi-grid',
        type: 'kpi_grid',
        sectionId: 'sec-metrics',
        title: 'Operational Telemetry',
        props: {
          items: [
            { label: 'Throughput', value: '1,420/hr', change: '+12%', trend: 'up', icon: 'Zap' },
            { label: 'SLA Adherence', value: '99.4%', change: 'Optimal', trend: 'up', icon: 'ShieldCheck' },
            { label: 'Active Queue', value: '42 items', change: '-8%', trend: 'down', icon: 'Clock' },
            { label: 'Automation Confidence', value: '96.8%', change: 'High', trend: 'up', icon: 'Bot' }
          ]
        }
      },
      {
        id: 'cmp-data-table',
        type: 'data_table',
        sectionId: 'sec-main',
        title: 'Active Work Queue',
        props: {
          searchable: true,
          quickFilters: ['All', 'Critical', 'In-Progress', 'Completed'],
          columns: ['ID', 'Subject', 'Status', 'Priority', 'Assigned To', 'Actions'],
          rows: [
            { id: 'REQ-01', subject: 'Priority Request Alpha', status: 'In-Progress', priority: 'High', assignedTo: 'Agent Sarah', actions: ['Review', 'Approve'] },
            { id: 'REQ-02', subject: 'System Ingestion Task', status: 'Pending', priority: 'Medium', assignedTo: 'Automated Bot', actions: ['Run', 'Dismiss'] }
          ]
        }
      },
      {
        id: 'cmp-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-sidebar',
        title: 'AI Decision Assistant',
        props: {
          confidenceScore: 96,
          recommendation: 'Autonomous rule validation detected high confidence match. Ready for single-click execution.',
          quickActions: ['Accept Recommendation', 'Trigger Re-routing', 'Export Audit Pack']
        }
      }
    ];
  }

  // Deduplicate component IDs and ensure required props
  const seenIds = new Set();
  repaired.components = repaired.components.map((c, idx) => {
    let id = c.id || `cmp-${idx + 1}`;
    if (seenIds.has(id)) {
      id = `${id}-${idx + 1}`;
    }
    seenIds.add(id);
    return {
      ...c,
      id,
      type: c.type || 'card',
      title: c.title || 'Component',
      props: c.props || {},
      data: c.data || {}
    };
  });

  return {
    valid: errors.length === 0,
    errors,
    repairedSpec: repaired
  };
}

/**
 * Creates a domain-tailored default UI specification based on business context.
 */
export function createDefaultUiSpecification(screenName = 'Enterprise System', domain = 'GENERAL_ENTERPRISE', themeId = 'enterprise-slate', screenType = null) {
  const normName = (screenName || '').toLowerCase();
  const theme = THEME_ARCHETYPES[themeId] || THEME_ARCHETYPES['enterprise-slate'];

  // 1. Dedicated Screen-Type Routing
  if (screenType === 'workflow' || screenType === 'queue' || /queue|ticket|booking|issue|workflow|triage|console|resolution/i.test(normName)) {
    return createWorkflowQueueUiSpecification(screenName, domain, theme);
  }
  if (screenType === 'rules' || screenType === 'policy' || /rule|policy|config|admin|governance|manager|setting/i.test(normName)) {
    return createRulesPolicyUiSpecification(screenName, domain, theme);
  }
  if (screenType === 'analytics' || /analytic|report|metric|telemetry|throughput/i.test(normName)) {
    return createAnalyticsUiSpecification(screenName, domain, theme);
  }

  // 2. Domain-Specific Overview Dashboards
  const normDomain = (domain || '').toUpperCase();
  if (normDomain.includes('HEALTH') || normDomain.includes('CLINIC') || normDomain.includes('PATIENT') || normDomain.includes('HOSPITAL')) {
    return createHealthcareUiSpecification(screenName, theme);
  } else if (normDomain.includes('LOGISTIC') || normDomain.includes('SUPPLY') || normDomain.includes('DELIVERY') || normDomain.includes('FLEET') || normDomain.includes('COURIER')) {
    return createLogisticsUiSpecification(screenName, theme);
  } else if (normDomain.includes('FIN') || normDomain.includes('FRAUD') || normDomain.includes('PAYMENT') || normDomain.includes('BANK')) {
    return createFinanceUiSpecification(screenName, theme);
  } else if (normDomain.includes('CYBER') || normDomain.includes('SECURITY') || normDomain.includes('SOC') || normDomain.includes('THREAT')) {
    return createCybersecurityUiSpecification(screenName, theme);
  } else if (normDomain.includes('RETAIL') || normDomain.includes('ECOMMERCE') || normDomain.includes('STORE')) {
    return createRetailUiSpecification(screenName, theme);
  } else if (normDomain.includes('SAAS') || normDomain.includes('SUBSCRIPTION') || normDomain.includes('CLOUD')) {
    return createSaaSManagementUiSpecification(screenName, theme);
  } else if (normDomain.includes('RESTAURANT') || normDomain.includes('FOOD') || normDomain.includes('DINING') || normDomain.includes('KITCHEN')) {
    return createRestaurantUiSpecification(screenName, theme);
  } else if (normDomain.includes('MANUFACTUR') || normDomain.includes('FACTORY') || normDomain.includes('INDUSTRIAL') || normDomain.includes('PLANT')) {
    return createManufacturingUiSpecification(screenName, theme);
  } else if (normDomain.includes('HR') || normDomain.includes('HUMAN') || normDomain.includes('EMPLOYEE') || normDomain.includes('PEOPLE') || normDomain.includes('TALENT')) {
    return createHrPlatformUiSpecification(screenName, theme);
  }

  // Default General Enterprise Dashboard
  return createGeneralEnterpriseUiSpecification(screenName, theme);
}

// ---------------------------------------------------------------------------
// DOMAIN-SPECIFIC SPECIFICATION GENERATORS
// ---------------------------------------------------------------------------

export function createHealthcareUiSpecification(businessName = 'CareFlow Clinical Hub', theme = THEME_ARCHETYPES['enterprise-slate']) {
  return {
    page: {
      id: 'screen-healthcare-dashboard',
      name: `${businessName} — Patient Care & Clinical Appointment Console`,
      purpose: 'Coordinate patient triage, real-time doctor availability, exam room check-ins, and clinical SLA tracking.',
      businessDomain: 'HEALTHCARE'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 16,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-intake', label: 'Patient Queue', icon: 'Users', badge: '14 Active', active: true },
      { id: 'nav-schedule', label: 'Doctor Availability', icon: 'Calendar', active: false },
      { id: 'nav-triage', label: 'Clinical Triage', icon: 'HeartPulse', badge: '3 Urgent', active: false },
      { id: 'nav-analytics', label: 'Wait-Time Analytics', icon: 'BarChart3', active: false },
      { id: 'nav-compliance', label: 'HIPAA & Compliance', icon: 'ShieldCheck', active: false }
    ],
    sections: [
      { id: 'sec-health-kpis', title: 'Clinical Operations Overview', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-health-kpis'] },
      { id: 'sec-health-toolbar', title: 'Triage & Patient Search', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-health-filter-bar'] },
      { id: 'sec-health-queue', title: 'Active Patient Appointments & Check-In Roster', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-health-table', 'cmp-health-doctor-slots'] },
      { id: 'sec-health-copilot', title: 'AI Clinical Assistant & Intake Copilot', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-health-copilot', 'cmp-health-chart'] }
    ],
    components: [
      {
        id: 'cmp-health-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-health-kpis',
        title: 'Clinical Department Telemetry',
        props: {
          items: [
            { label: 'Patients Checked In Today', value: '248', change: '-28% wait time', trend: 'up', icon: 'Users', badge: 'Live Tally' },
            { label: 'Doctor Availability Slots', value: '42 Open', change: '8 Specialties', trend: 'up', icon: 'Stethoscope', badge: 'Nominal' },
            { label: 'Avg Triage-to-Room Time', value: '3.4 min', change: 'Target < 5m', trend: 'down', icon: 'Clock', badge: 'Optimized' },
            { label: 'HIPAA & Protocol Compliance', value: '99.8%', change: 'Audited', trend: 'up', icon: 'ShieldCheck', badge: 'Certified' }
          ]
        }
      },
      {
        id: 'cmp-health-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-health-toolbar',
        title: 'Patient Queue Search & Specialty Filters',
        props: {
          searchPlaceholder: 'Search patient by MRN, Name, Phone, or Assigned Physician...',
          filterChips: ['All Patients', 'Awaiting Triage', 'In Exam Room', 'Doctor Consult', 'Priority / Urgent'],
          activeFilter: 'All Patients',
          actionButtons: [
            { label: '+ Book New Appointment', variant: 'primary', icon: 'CalendarPlus' },
            { label: 'Emergency Override', variant: 'outline', icon: 'AlertCircle' }
          ]
        }
      },
      {
        id: 'cmp-health-table',
        type: 'data_table',
        sectionId: 'sec-health-queue',
        title: 'Active Patient Appointments & Room Allocation',
        props: {
          searchable: false,
          columns: ['MRN', 'Patient Name', 'Specialty / Reason', 'Assigned Doctor', 'Room', 'Status', 'Wait Time', 'Actions'],
          rows: [
            { id: 'MRN-4891', mrn: 'MRN-4891', patientName: 'Eleanor Vance', specialty: 'Cardiology Follow-up', assignedDoctor: 'Dr. Marcus Webb', room: 'Room 302', status: 'In Exam Room', waitTime: '4m', actions: ['Open Chart', 'Complete Consult'] },
            { id: 'MRN-4892', mrn: 'MRN-4892', patientName: 'David Chen', specialty: 'Orthopedic Knee Exam', assignedDoctor: 'Dr. Sophia Reyes', room: 'Triage B', status: 'Awaiting Triage', waitTime: '8m', actions: ['Triage Patient', 'Reassign'] },
            { id: 'MRN-4893', mrn: 'MRN-4893', patientName: 'Maria Santos', specialty: 'Pediatric Acute Fever', assignedDoctor: 'Dr. Liam Johnson', room: 'Room 108', status: 'Doctor Consult', waitTime: '2m', actions: ['Review Vitals', 'Prescribe'] },
            { id: 'MRN-4894', mrn: 'MRN-4894', patientName: 'James Wilson', specialty: 'Neurology Consultation', assignedDoctor: 'Dr. Sarah Al-Mansoor', room: 'Waiting Bay', status: 'Checked-In', waitTime: '11m', actions: ['Call Next', 'Reschedule'] },
            { id: 'MRN-4895', mrn: 'MRN-4895', patientName: 'Amina Patel', specialty: 'General Intake Checkup', assignedDoctor: 'Dr. Marcus Webb', room: 'Room 304', status: 'In Exam Room', waitTime: '6m', actions: ['Open Chart', 'Complete Consult'] }
          ]
        }
      },
      {
        id: 'cmp-health-doctor-slots',
        type: 'workflow_tracker',
        sectionId: 'sec-health-queue',
        title: 'Clinical Encounter Progression Workflow',
        props: {
          stages: [
            { id: 'stg-1', title: '1. Self Check-in & ID', status: 'completed', time: '0.8 min' },
            { id: 'stg-2', title: '2. Triage & Vitals Capture', status: 'in-progress', time: '2.4 min' },
            { id: 'stg-3', title: '3. Physician Encounter', status: 'pending', time: 'Est. 15 min' },
            { id: 'stg-4', title: '4. Rx & Discharge Summary', status: 'pending', time: 'Est. 2 min' }
          ]
        }
      },
      {
        id: 'cmp-health-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-health-copilot',
        title: 'Clinical AI Decision Copilot',
        props: {
          confidenceScore: 97,
          recommendation: 'Dr. Marcus Webb will complete Room 302 consult in 3 minutes. Suggest prep Room 304 for James Wilson to maintain 0m delay SLA.',
          contextBadges: ['HIPAA Enforced', 'Real-Time Telemetry'],
          quickActions: [
            { label: 'Auto-Assign James to Room 304', action: 'ASSIGN_ROOM' },
            { label: 'Send SMS Notification to Patient', action: 'SEND_SMS' },
            { label: 'Audit Doctor Schedule Utilization', action: 'AUDIT_SCHEDULE' }
          ]
        }
      },
      {
        id: 'cmp-health-chart',
        type: 'chart',
        sectionId: 'sec-health-copilot',
        title: 'Department Hourly Patient Flow vs Wait SLA',
        props: {
          chartType: 'bar',
          categories: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'],
          series: [
            { name: 'Patient Volume', data: [22, 48, 56, 62, 44, 16], color: '#3B82F6' },
            { name: 'Avg Wait (min)', data: [2.8, 4.2, 5.8, 3.4, 2.9, 1.8], color: '#10B981' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-book', label: 'Book Appointment', variant: 'primary', icon: 'Plus' },
      { id: 'act-export', label: 'Export Daily Clinical Roster', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createLogisticsUiSpecification(businessName = 'FleetRoute Global Logistics', theme = THEME_ARCHETYPES['enterprise-slate']) {
  return {
    page: {
      id: 'screen-logistics-dashboard',
      name: `${businessName} — Active Deliveries & Fleet Dispatch Control Plane`,
      purpose: 'Manage real-time courier tracking, route optimization, warehouse hub inventory, and delivery exception triage.',
      businessDomain: 'LOGISTICS'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 16,
      density: 'compact',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-deliveries', label: 'Active Shipments', icon: 'Truck', badge: '1,840 En-Route', active: true },
      { id: 'nav-dispatch', label: 'Route Dispatcher', icon: 'Navigation', active: false },
      { id: 'nav-exceptions', label: 'Exceptions & SLA', icon: 'AlertTriangle', badge: '4 Pending', active: false },
      { id: 'nav-warehouse', label: 'Hub Inventory', icon: 'Package', active: false },
      { id: 'nav-analytics', label: 'Transit Analytics', icon: 'BarChart3', active: false }
    ],
    sections: [
      { id: 'sec-log-kpis', title: 'Global Fleet Telemetry', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-log-kpis'] },
      { id: 'sec-log-filter', title: 'Shipment Search & Route Filters', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-log-filter-bar'] },
      { id: 'sec-log-shipments', title: 'Live Courier Shipments & Route Telemetry', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-log-table', 'cmp-log-kanban'] },
      { id: 'sec-log-copilot', title: 'AI Route Dispatch Optimizer & Telemetry', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-log-copilot', 'cmp-log-chart'] }
    ],
    components: [
      {
        id: 'cmp-log-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-log-kpis',
        title: 'Logistics Fleet Telemetry',
        props: {
          items: [
            { label: 'Active Deliveries In-Transit', value: '1,840', change: '+14% volume surge', trend: 'up', icon: 'Truck', badge: 'Fleet Active' },
            { label: 'On-Time SLA Adherence', value: '98.6%', change: '+2.4% target', trend: 'up', icon: 'ShieldCheck', badge: 'Target 97%' },
            { label: 'Active Drivers Dispatched', value: '320', change: '94% capacity', trend: 'up', icon: 'Users', badge: 'Optimal' },
            { label: 'Transit Exceptions Flagged', value: '4 Critical', change: '-48% turnaround', trend: 'down', icon: 'AlertTriangle', badge: 'Action Req' }
          ]
        }
      },
      {
        id: 'cmp-log-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-log-filter',
        title: 'Waybill & Route Search',
        props: {
          searchPlaceholder: 'Search tracking number, driver name, destination hub, or vehicle ID...',
          filterChips: ['All Deliveries', 'Out for Delivery', 'Transit Exceptions', 'Hub Transfer', 'Delivered Today'],
          activeFilter: 'All Deliveries',
          actionButtons: [
            { label: '+ Dispatch New Route', variant: 'primary', icon: 'Send' },
            { label: 'Re-optimize Multi-Stop', variant: 'outline', icon: 'RefreshCw' }
          ]
        }
      },
      {
        id: 'cmp-log-table',
        type: 'data_table',
        sectionId: 'sec-log-shipments',
        title: 'Active Shipment Waybill Telemetry',
        props: {
          searchable: false,
          columns: ['Waybill #', 'Destination Hub', 'Driver & Vehicle', 'ETA Window', 'Cargo Type', 'Status', 'SLA Health', 'Actions'],
          rows: [
            { id: 'WB-9081', waybill: 'WB-9081-US', hub: 'Chicago Hub (ORD-01)', driver: 'Carlos Gomez (#304)', eta: '14:20 CST (18 min)', cargo: 'Cold Chain / Pharma', status: 'Out for Delivery', sla: 'Nominal', actions: ['Track Live GPS', 'Reroute'] },
            { id: 'WB-9082', waybill: 'WB-9082-US', hub: 'Dallas Terminal (DFW-04)', driver: 'Marcus Vance (#112)', eta: '15:45 CST (Delayed)', cargo: 'Electronics Batch', status: 'Traffic Exception', sla: 'Warning', actions: ['Reassign Driver', 'Contact'] },
            { id: 'WB-9083', waybill: 'WB-9083-US', hub: 'Atlanta Distribution (ATL-02)', driver: 'Rachel Adams (#089)', eta: '13:50 EST (Delivered)', cargo: 'Express Parcel', status: 'Completed', sla: 'On-Time', actions: ['Proof of Delivery', 'Archive'] },
            { id: 'WB-9084', waybill: 'WB-9084-US', hub: 'Seattle Transit (SEA-03)', driver: 'Tyler Ross (#219)', eta: '16:10 PST (On-Route)', cargo: 'Standard Freight', status: 'Out for Delivery', sla: 'Nominal', actions: ['Track Live GPS', 'Reroute'] }
          ]
        }
      },
      {
        id: 'cmp-log-kanban',
        type: 'kanban_board',
        sectionId: 'sec-log-shipments',
        title: 'Route Execution Progression Stages',
        props: {
          columns: [
            { id: 'stg-manifest', title: 'Manifest Loaded (48)', count: 48, items: ['Truck #104 ORD', 'Van #89 ATL', 'Sprinter #42 DFW'] },
            { id: 'stg-transit', title: 'In Transit / En-Route (320)', count: 320, items: ['Van #304 Chicago Loop', 'Truck #112 I-90 West'] },
            { id: 'stg-exception', title: 'Exceptions / Delays (4)', count: 4, items: ['WB-9082 Traffic Jam (I-35)', 'WB-8711 Address Mismatch'] },
            { id: 'stg-delivered', title: 'Proof Verified (1,468)', count: 1468, items: ['Batch #441 Delivered', 'ORD Express Completed'] }
          ]
        }
      },
      {
        id: 'cmp-log-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-log-copilot',
        title: 'AI Dynamic Route Optimizer',
        props: {
          confidenceScore: 98,
          recommendation: 'Severe congestion detected on I-35 North near Dallas. Rerouting 6 couriers via Loop 12 saves 34 minutes per vehicle and prevents 4 SLA breaches.',
          contextBadges: ['Predictive GPS Telemetry', 'Fuel Optimization'],
          quickActions: [
            { label: 'Apply Automated Reroute Plan', action: 'APPLY_REROUTE' },
            { label: 'Broadcast Traffic Alert to Drivers', action: 'ALERT_DRIVERS' },
            { label: 'Notify Affected Customers of ETA Update', action: 'NOTIFY_CUSTOMERS' }
          ]
        }
      },
      {
        id: 'cmp-log-chart',
        type: 'chart',
        sectionId: 'sec-log-copilot',
        title: 'Fleet On-Time Delivery Velocity (24h)',
        props: {
          chartType: 'line',
          categories: ['04:00', '08:00', '12:00', '16:00', '20:00', '00:00'],
          series: [
            { name: 'Delivered Packages', data: [120, 480, 890, 1420, 1780, 1840], color: '#10B981' },
            { name: 'Target SLA Curve', data: [100, 420, 800, 1300, 1700, 1800], color: '#3B82F6' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-dispatch', label: 'Instant Dispatch', variant: 'primary', icon: 'Zap' },
      { id: 'act-export', label: 'Export Telemetry Manifest', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createFinanceUiSpecification(businessName = 'FinEdge Core Banking', theme = THEME_ARCHETYPES['enterprise-slate']) {
  return {
    page: {
      id: 'screen-finance-dashboard',
      name: `${businessName} — Real-Time Transaction Risk & Fraud Operations`,
      purpose: 'Monitor multi-currency transaction volumes, intercept high-risk anomalies, enforce dual-approval compliance, and track automated recovery.',
      businessDomain: 'FINANCE'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 16,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-tx', label: 'Live Transactions', icon: 'CreditCard', badge: '$42.8M Today', active: true },
      { id: 'nav-fraud', label: 'Risk & Fraud Triage', icon: 'ShieldAlert', badge: '12 Flagged', active: false },
      { id: 'nav-approvals', label: 'Dual-Signoff Queue', icon: 'CheckSquare', badge: '5 Pending', active: false },
      { id: 'nav-audit', label: 'AML & Audit Trail', icon: 'FileText', active: false },
      { id: 'nav-analytics', label: 'Liquidity Analytics', icon: 'TrendingUp', active: false }
    ],
    sections: [
      { id: 'sec-fin-kpis', title: 'Institutional Liquidity & Risk Telemetry', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-fin-kpis'] },
      { id: 'sec-fin-filter', title: 'Transaction Risk Screening', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-fin-filter-bar'] },
      { id: 'sec-fin-table', title: 'High-Velocity Transaction Stream & Risk Scores', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-fin-table', 'cmp-fin-timeline'] },
      { id: 'sec-fin-copilot', title: 'AI Fraud Scoring Engine & Compliance', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-fin-copilot', 'cmp-fin-chart'] }
    ],
    components: [
      {
        id: 'cmp-fin-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-fin-kpis',
        title: 'Institutional Financial Metrics',
        props: {
          items: [
            { label: 'Settlement Volume (24h)', value: '$42,890,400', change: '+18.2% throughput', trend: 'up', icon: 'DollarSign', badge: 'Settled' },
            { label: 'Prevented Fraud Exposure', value: '$1,240,000', change: '100% Intercepted', trend: 'up', icon: 'ShieldCheck', badge: 'Protected' },
            { label: 'Mean Anomaly Detection', value: '42 ms', change: 'Sub-second ML', trend: 'down', icon: 'Zap', badge: 'Optimal' },
            { label: 'Chargeback Ratio', value: '0.04%', change: 'Regulatory Limit < 0.65%', trend: 'down', icon: 'CheckCircle', badge: 'Compliant' }
          ]
        }
      },
      {
        id: 'cmp-fin-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-fin-filter',
        title: 'Transaction & Entity Filter',
        props: {
          searchPlaceholder: 'Search transaction hash, account number, entity name, or risk score...',
          filterChips: ['All Transactions', 'Risk > 80 (Critical)', 'Pending Dual Sign-Off', 'Cross-Border Wires', 'Auto-Approved'],
          activeFilter: 'All Transactions',
          actionButtons: [
            { label: 'Freeze Account', variant: 'outline', icon: 'Lock' },
            { label: '+ Create Wire Transfer', variant: 'primary', icon: 'Plus' }
          ]
        }
      },
      {
        id: 'cmp-fin-table',
        type: 'data_table',
        sectionId: 'sec-fin-table',
        title: 'Institutional Transaction Ledger & Risk Telemetry',
        props: {
          searchable: false,
          columns: ['TX Hash', 'Originating Entity', 'Counterparty', 'Amount (USD)', 'Risk Score', 'Compliance State', 'Actions'],
          rows: [
            { id: 'TX-8921', txHash: '0x8f2c...49a1', entity: 'Apex Global Fund LLC', counterparty: 'Zurich Private Bank', amount: '$4,250,000.00', riskScore: '12 (Low)', state: 'Settled', actions: ['View Audit', 'SWIFT Copy'] },
            { id: 'TX-8922', txHash: '0x3e1a...92b4', entity: 'Veloce Logistics SA', counterparty: 'Unknown Offshore Corp', amount: '$890,000.00', riskScore: '94 (CRITICAL)', state: 'Frozen (AML Alert)', actions: ['Investigate', 'File SAR'] },
            { id: 'TX-8923', txHash: '0x9d4b...11c8', entity: 'Nordic Retail Group', counterparty: 'Citibank N.A.', amount: '$124,500.00', riskScore: '08 (Low)', state: 'Settled', actions: ['View Audit', 'SWIFT Copy'] },
            { id: 'TX-8924', txHash: '0x1c8e...77d3', entity: 'Horizon Ventures Pte', counterparty: 'Standard Chartered SG', amount: '$1,200,000.00', riskScore: '68 (Medium)', state: 'Pending Dual Signoff', actions: ['Authorize', 'Escalate'] }
          ]
        }
      },
      {
        id: 'cmp-fin-timeline',
        type: 'workflow_tracker',
        sectionId: 'sec-fin-table',
        title: 'High-Value Settlement & Dual Signoff Progression',
        props: {
          stages: [
            { id: 'stg-1', title: '1. Ingestion & OFAC Screen', status: 'completed', time: '12 ms' },
            { id: 'stg-2', title: '2. ML Risk Scoring Model', status: 'completed', time: '30 ms' },
            { id: 'stg-3', title: '3. Senior Trader Approval', status: 'in-progress', time: 'Awaiting Signoff' },
            { id: 'stg-4', title: '4. Fedwire / SWIFT Broadcast', status: 'pending', time: 'Queued' }
          ]
        }
      },
      {
        id: 'cmp-fin-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-fin-copilot',
        title: 'AI AML & Risk Copilot',
        props: {
          confidenceScore: 99,
          recommendation: 'Transaction TX-8922 exhibits velocity anomalies matching structured structuring patterns across 4 accounts. Immediate freeze recommended prior to Fedwire release.',
          contextBadges: ['OFAC Checked', 'Zero-Trust Protocol'],
          quickActions: [
            { label: 'Enforce Immediate Account Quarantine', action: 'FREEZE_ACCOUNT' },
            { label: 'Auto-Generate FinCEN SAR Filing Package', action: 'GENERATE_SAR' },
            { label: 'Request Enhanced Due Diligence (EDD)', action: 'REQUEST_EDD' }
          ]
        }
      },
      {
        id: 'cmp-fin-chart',
        type: 'chart',
        sectionId: 'sec-fin-copilot',
        title: 'Hourly Settlement Inflow vs Risk Interceptions',
        props: {
          chartType: 'donut',
          categories: ['Low Risk (Clean)', 'Medium Risk (Reviewed)', 'High Risk (Blocked)'],
          series: [
            { name: 'Settlement Share', data: [88, 9, 3], color: '#10B981' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-audit', label: 'Export Regulatory SAR Audit Pack', variant: 'primary', icon: 'FileText' },
      { id: 'act-policy', label: 'Configure Risk Thresholds', variant: 'secondary', icon: 'Sliders' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createCybersecurityUiSpecification(businessName = 'SOC Defender Telemetry', theme = THEME_ARCHETYPES['cyber-ops']) {
  return {
    page: {
      id: 'screen-cyber-dashboard',
      name: `${businessName} — Security Operations Center & Threat Telemetry Console`,
      purpose: 'Continuous 24/7 SOC telemetry monitoring, active incident triage, automated host containment, and MITRE ATT&CK coverage.',
      businessDomain: 'CYBERSECURITY'
    },
    layout: {
      type: 'command-center',
      columns: 12,
      gap: 12,
      density: 'compact',
      sidebarPosition: 'right',
      sidebarCollapsible: false
    },
    theme,
    navigation: [
      { id: 'nav-threats', label: 'Threat Telemetry', icon: 'ShieldAlert', badge: '14 Active', active: true },
      { id: 'nav-investigate', label: 'Incident Triage', icon: 'Crosshair', badge: '3 Critical', active: false },
      { id: 'nav-firewall', label: 'Zero-Trust Policies', icon: 'Lock', active: false },
      { id: 'nav-hunting', label: 'MITRE ATT&CK Matrix', icon: 'Terminal', active: false },
      { id: 'nav-audit', label: 'Forensic Audit Logs', icon: 'FileCode', active: false }
    ],
    sections: [
      { id: 'sec-soc-kpis', title: 'SOC Operational Telemetry', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-soc-kpis'] },
      { id: 'sec-soc-filter', title: 'SIEM Alert Filter & Severity Triage', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-soc-filter-bar'] },
      { id: 'sec-soc-matrix', title: 'Active Incident Queue & Endpoint Quarantine', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-soc-table', 'cmp-soc-activity'] },
      { id: 'sec-soc-copilot', title: 'Autonomous Threat Containment & AI Copilot', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-soc-copilot', 'cmp-soc-chart'] }
    ],
    components: [
      {
        id: 'cmp-soc-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-soc-kpis',
        title: 'SOC Telemetry Stats',
        props: {
          items: [
            { label: 'Active Security Incidents', value: '14', change: '3 Critical Severity', trend: 'up', icon: 'AlertOctagon', badge: 'CRITICAL' },
            { label: 'Mean Time to Contain (MTTC)', value: '3.8 min', change: '-64% automated', trend: 'down', icon: 'Zap', badge: 'Sub-5m' },
            { label: 'Zero-Trust EDR Containment', value: '99.4%', change: 'Sub-second kill', trend: 'up', icon: 'ShieldCheck', badge: 'Active' },
            { label: 'MITRE ATT&CK Coverage', value: '94.2%', change: 'Enterprise Grid', trend: 'up', icon: 'Terminal', badge: 'Audited' }
          ]
        }
      },
      {
        id: 'cmp-soc-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-soc-filter',
        title: 'Threat Vector Search',
        props: {
          searchPlaceholder: 'Search SIEM telemetry, IOC hash, source IP, compromised hostname, or CVE...',
          filterChips: ['All Alerts', 'Critical (Severity 5)', 'Lateral Movement', 'Ransomware Vector', 'Quarantined Hosts'],
          activeFilter: 'All Alerts',
          actionButtons: [
            { label: 'Emergency Host Quarantine', variant: 'primary', icon: 'Zap' },
            { label: 'Detonate Sample in Sandbox', variant: 'outline', icon: 'PlayCircle' }
          ]
        }
      },
      {
        id: 'cmp-soc-table',
        type: 'data_table',
        sectionId: 'sec-soc-matrix',
        title: 'Active Security Incidents & Host Isolation Matrix',
        props: {
          searchable: false,
          columns: ['Incident ID', 'Threat Classification', 'Target Host / IP', 'MITRE Technique', 'Severity', 'Status', 'Actions'],
          rows: [
            { id: 'INC-7041', threat: 'Cobalt Strike Beacon Execution', target: 'srv-db-prod-02 (10.0.4.12)', mitre: 'T1059.001 PowerShell', severity: 'CRITICAL', status: 'Host Isolated', actions: ['Inspect PCAP', 'Revoke Token'] },
            { id: 'INC-7042', threat: 'Kerberoasting Ticket Harvesting', target: 'dc-primary-auth (10.0.1.1)', mitre: 'T1558.003 Kerberos', severity: 'HIGH', status: 'Active Triage', actions: ['Force Reset', 'Quarantine'] },
            { id: 'INC-7043', threat: 'DNS Data Exfiltration Tunnel', target: 'workstation-dev-88 (10.0.8.44)', mitre: 'T1071.004 DNS', severity: 'HIGH', status: 'Egress Blocked', actions: ['Block Domain', 'Kill Proc'] },
            { id: 'INC-7044', threat: 'Brute Force SSH Auth Burst', target: 'gw-ingress-edge (192.168.1.1)', mitre: 'T1110 Password Guess', severity: 'MEDIUM', status: 'IP Banned (24h)', actions: ['View GeoIP', 'Dismiss'] }
          ]
        }
      },
      {
        id: 'cmp-soc-activity',
        type: 'activity_feed',
        sectionId: 'sec-soc-matrix',
        title: 'Live SOC Immutable Audit Trail',
        props: {
          activities: [
            { id: 'act-1', timestamp: '14:22:04 UTC', actor: 'Automated EDR Agent', action: 'Executed process termination on PID 4892 (powershell.exe) on srv-db-prod-02', status: 'SUCCESS' },
            { id: 'act-2', timestamp: '14:21:50 UTC', actor: 'SOC Analyst Sarah M.', action: 'Initiated host network isolation for srv-db-prod-02 (SHA-256 evidence preserved)', status: 'SUCCESS' },
            { id: 'act-3', timestamp: '14:20:12 UTC', actor: 'SIEM Correlation Rule #882', action: 'Flagged lateral movement attempt between 10.0.4.12 and 10.0.1.1', status: 'ALERT' }
          ]
        }
      },
      {
        id: 'cmp-soc-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-soc-copilot',
        title: 'Autonomous SOC Containment Advisor',
        props: {
          confidenceScore: 99,
          recommendation: 'Beacon IOC detected matching threat group APT29. Suggest immediate token revocation across domain controller dc-primary-auth and automated firewall rule deployment.',
          contextBadges: ['Zero-Trust Active', 'Forensic Immutability'],
          quickActions: [
            { label: 'Execute Immediate Domain Token Revocation', action: 'REVOKE_TOKENS' },
            { label: 'Compile & Push Boundary Firewall Drop Rule', action: 'PUSH_FIREWALL' },
            { label: 'Generate Post-Mortem Forensic Archive', action: 'GENERATE_POSTMORTEM' }
          ]
        }
      },
      {
        id: 'cmp-soc-chart',
        type: 'chart',
        sectionId: 'sec-soc-copilot',
        title: 'Threat Severity Breakdown by Attack Vector',
        props: {
          chartType: 'donut',
          categories: ['Privilege Escalation', 'Credential Access', 'Command & Control', 'Defense Evasion'],
          series: [
            { name: 'Threat Share', data: [42, 28, 20, 10], color: '#10B981' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-isolate', label: 'Emergency Global Lockdown', variant: 'primary', icon: 'Lock' },
      { id: 'act-export', label: 'Export Incident PCAP Pack', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createRetailUiSpecification(businessName = 'OmniStore Retail Hub', theme = THEME_ARCHETYPES['enterprise-slate']) {
  return {
    page: {
      id: 'screen-retail-dashboard',
      name: `${businessName} — Real-Time Orders, Inventory & Omnichannel Fulfillment`,
      purpose: 'Track omnichannel customer orders, store pickup queues, inventory velocity, and promotions.',
      businessDomain: 'RETAIL'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 16,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-orders', label: 'Live Orders', icon: 'ShoppingBag', badge: '348 Today', active: true },
      { id: 'nav-inventory', label: 'Inventory & Stock', icon: 'Box', active: false },
      { id: 'nav-pickup', label: 'Store Pickup Triage', icon: 'MapPin', badge: '12 Ready', active: false },
      { id: 'nav-customers', label: 'Customer Loyalty', icon: 'Users', active: false },
      { id: 'nav-analytics', label: 'Sales & Revenue', icon: 'TrendingUp', active: false }
    ],
    sections: [
      { id: 'sec-ret-kpis', title: 'Omnichannel Sales & Fulfillment Telemetry', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-ret-kpis'] },
      { id: 'sec-ret-filter', title: 'Order & Customer Search', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-ret-filter-bar'] },
      { id: 'sec-ret-table', title: 'Active Omnichannel Order Triage', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-ret-table'] },
      { id: 'sec-ret-copilot', title: 'AI Merchandising & Inventory Copilot', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-ret-copilot', 'cmp-ret-chart'] }
    ],
    components: [
      {
        id: 'cmp-ret-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-ret-kpis',
        title: 'Retail Store Telemetry',
        props: {
          items: [
            { label: 'Gross Sales Today', value: '$84,290', change: '+24% vs yesterday', trend: 'up', icon: 'DollarSign', badge: 'Strong' },
            { label: 'Orders Processed', value: '1,420', change: '99.2% fulfillment SLA', trend: 'up', icon: 'ShoppingBag', badge: 'Optimal' },
            { label: 'Curbside Pickup Turnaround', value: '4.2 min', change: 'Prior: 12m', trend: 'down', icon: 'Clock', badge: 'Fast' },
            { label: 'Out-of-Stock Stockouts', value: '2 SKUs', change: '-80% stockout rate', trend: 'down', icon: 'Box', badge: 'Protected' }
          ]
        }
      },
      {
        id: 'cmp-ret-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-ret-filter',
        title: 'Customer & Order Search',
        props: {
          searchPlaceholder: 'Search order #, customer name, SKU code, or pickup locker ID...',
          filterChips: ['All Orders', 'Curbside Pickup', 'Same-Day Delivery', 'Expedited Shipping', 'Payment Review'],
          activeFilter: 'All Orders',
          actionButtons: [
            { label: '+ Create Manual Order', variant: 'primary', icon: 'Plus' },
            { label: 'Sync POS Terminals', variant: 'outline', icon: 'RefreshCw' }
          ]
        }
      },
      {
        id: 'cmp-ret-table',
        type: 'data_table',
        sectionId: 'sec-ret-table',
        title: 'Live Omnichannel Order Queue',
        props: {
          searchable: false,
          columns: ['Order #', 'Customer', 'Channel', 'Items', 'Total', 'Fulfillment Status', 'Actions'],
          rows: [
            { id: 'ORD-4091', order: 'ORD-4091', customer: 'Victoria Sterling', channel: 'Mobile App (Curbside)', items: '3 Items (SKU-102, 404)', total: '$249.50', status: 'Ready for Pickup', actions: ['Notify Customer', 'Mark Collected'] },
            { id: 'ORD-4092', order: 'ORD-4092', customer: 'Brandon Cole', channel: 'Online Store (Express)', items: '1 Item (SKU-891)', total: '$580.00', status: 'Packing & Staging', actions: ['Print Label', 'Dispatch'] },
            { id: 'ORD-4093', order: 'ORD-4093', customer: 'Emma Watson', channel: 'In-Store POS (Register 4)', items: '4 Items', total: '$89.00', status: 'Completed', actions: ['View Receipt', 'Email Copy'] }
          ]
        }
      },
      {
        id: 'cmp-ret-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-ret-copilot',
        title: 'AI Merchandising Copilot',
        props: {
          confidenceScore: 96,
          recommendation: 'SKU-404 inventory is depleting at 18 units/hr. Automated transfer of 80 units from Central Warehouse #2 recommended to prevent evening stockout.',
          contextBadges: ['POS Synced', 'Inventory Predictive'],
          quickActions: [
            { label: 'Approve Warehouse Stock Transfer', action: 'TRANSFER_STOCK' },
            { label: 'Adjust Dynamic Price Promotion', action: 'ADJUST_PRICE' },
            { label: 'Send Loyalty VIP Early-Access SMS', action: 'SEND_VIP' }
          ]
        }
      },
      {
        id: 'cmp-ret-chart',
        type: 'chart',
        sectionId: 'sec-ret-copilot',
        title: 'Sales Volume by Channel (Online vs Store vs Pickup)',
        props: {
          chartType: 'donut',
          categories: ['Mobile App Curbside', 'Online Web Shipping', 'In-Store POS'],
          series: [
            { name: 'Channel Share', data: [45, 35, 20], color: '#3B82F6' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-export', label: 'Export Daily Sales Ledger', variant: 'primary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createSaaSManagementUiSpecification(businessName = 'CloudScale SaaS Operations', theme = THEME_ARCHETYPES['saas-modern']) {
  return {
    page: {
      id: 'screen-saas-dashboard',
      name: `${businessName} — Enterprise Subscriptions, API Metering & Tenant Health`,
      purpose: 'Monitor tenant usage metrics, API latency quotas, billing tier changes, and customer support health.',
      businessDomain: 'SAAS'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 16,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-tenants', label: 'Active Tenants', icon: 'Building', badge: '1,420 Paid', active: true },
      { id: 'nav-api', label: 'API Metering & Quotas', icon: 'Cpu', active: false },
      { id: 'nav-billing', label: 'Invoices & MRR', icon: 'CreditCard', badge: '$320k MRR', active: false },
      { id: 'nav-feature-flags', label: 'Feature Flags', icon: 'ToggleRight', active: false },
      { id: 'nav-incidents', label: 'System SLA Telemetry', icon: 'Activity', active: false }
    ],
    sections: [
      { id: 'sec-saas-kpis', title: 'SaaS Business & Infrastructure Telemetry', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-saas-kpis'] },
      { id: 'sec-saas-filter', title: 'Tenant Search & Tier Filters', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-saas-filter-bar'] },
      { id: 'sec-saas-table', title: 'Active Tenant Quotas & Provisioned Seats', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-saas-table'] },
      { id: 'sec-saas-copilot', title: 'AI Churn Prevention & Quota Optimizer', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-saas-copilot', 'cmp-saas-chart'] }
    ],
    components: [
      {
        id: 'cmp-saas-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-saas-kpis',
        title: 'SaaS Platform Metrics',
        props: {
          items: [
            { label: 'Monthly Recurring Revenue', value: '$348,200', change: '+14.8% MoM', trend: 'up', icon: 'DollarSign', badge: 'Growing' },
            { label: 'Active Enterprise Tenants', value: '1,420', change: '+42 new this month', trend: 'up', icon: 'Building', badge: 'Healthy' },
            { label: 'API P99 Latency', value: '48 ms', change: 'SLA < 100ms', trend: 'down', icon: 'Zap', badge: 'Optimal' },
            { label: 'Net Revenue Retention (NRR)', value: '118%', change: 'Low Churn < 0.8%', trend: 'up', icon: 'TrendingUp', badge: 'Elite' }
          ]
        }
      },
      {
        id: 'cmp-saas-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-saas-filter',
        title: 'Tenant Search & Tier Filters',
        props: {
          searchPlaceholder: 'Search tenant domain, org name, billing email, or API key ID...',
          filterChips: ['All Tenants', 'Enterprise Tier', 'Quota > 80%', 'Annual Renewal Due', 'Trial Accounts'],
          activeFilter: 'All Tenants',
          actionButtons: [
            { label: '+ Provision New Tenant', variant: 'primary', icon: 'Plus' },
            { label: 'Re-meter API Usage', variant: 'outline', icon: 'RefreshCw' }
          ]
        }
      },
      {
        id: 'cmp-saas-table',
        type: 'data_table',
        sectionId: 'sec-saas-table',
        title: 'Enterprise Tenant Usage & Quota Ledger',
        props: {
          searchable: false,
          columns: ['Tenant Name', 'Plan Tier', 'Active Seats', 'Monthly API Calls', 'Quota Health', 'MRR', 'Actions'],
          rows: [
            { id: 'TNT-101', name: 'Acme Global Corp', tier: 'Enterprise Plus', seats: '450 / 500', apiCalls: '4.2M / 5.0M', quota: '84% (High)', mrr: '$12,500/mo', actions: ['Manage Seats', 'Upgrade Quota'] },
            { id: 'TNT-102', name: 'Starlight Tech Inc', tier: 'Scale Dedicated', seats: '120 / 150', apiCalls: '1.8M / 2.0M', quota: '90% (Warning)', mrr: '$4,200/mo', actions: ['Manage Seats', 'Upgrade Quota'] },
            { id: 'TNT-103', name: 'Nexus Media Lab', tier: 'Growth Pro', seats: '40 / 50', apiCalls: '420k / 1.0M', quota: '42% (Normal)', mrr: '$1,800/mo', actions: ['Manage Seats', 'Inspect API'] }
          ]
        }
      },
      {
        id: 'cmp-saas-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-saas-copilot',
        title: 'AI Revenue & Churn Predictor',
        props: {
          confidenceScore: 98,
          recommendation: 'Starlight Tech Inc has hit 90% API quota 5 days before monthly reset. Automated expansion trigger recommended to unlock dedicated rate tier and prevent rate-limiting.',
          contextBadges: ['Stripe Synced', 'Auto-Upsell Ready'],
          quickActions: [
            { label: 'Send 1-Click Tier Upgrade Proposal', action: 'SEND_UPGRADE' },
            { label: 'Grant 500k Temporary Grace Quota', action: 'GRANT_GRACE' },
            { label: 'Schedule Account Manager Review', action: 'SCHEDULE_CALL' }
          ]
        }
      },
      {
        id: 'cmp-saas-chart',
        type: 'chart',
        sectionId: 'sec-saas-copilot',
        title: 'API Throughput & Latency Trend (7 Days)',
        props: {
          chartType: 'line',
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          series: [
            { name: 'API Requests (Millions)', data: [12.4, 14.8, 16.2, 18.9, 17.4, 8.2, 7.8], color: '#F59E0B' },
            { name: 'P99 Latency (ms)', data: [42, 45, 48, 52, 46, 38, 36], color: '#3B82F6' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-billing', label: 'Sync Stripe Invoices', variant: 'primary', icon: 'RefreshCw' },
      { id: 'act-export', label: 'Export MRR Breakdown', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createGeneralEnterpriseUiSpecification(businessName = 'Operations Workspace', theme = THEME_ARCHETYPES['enterprise-slate']) {
  return {
    page: {
      id: 'screen-general-dashboard',
      name: `${businessName} — Operational Command Center`,
      purpose: 'Manage real-time workflow queues, team throughput, exceptions, and AI automated decisions.',
      businessDomain: 'ENTERPRISE'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 16,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-dash', label: 'Operations Dashboard', icon: 'LayoutDashboard', active: true },
      { id: 'nav-queue', label: 'Work Queue', icon: 'ListFilter', badge: '18 Active', active: false },
      { id: 'nav-analytics', label: 'Throughput & SLA', icon: 'BarChart3', active: false },
      { id: 'nav-admin', label: 'Governance & Rules', icon: 'SlidersHorizontal', active: false }
    ],
    sections: [
      { id: 'sec-gen-kpis', title: 'System Performance Telemetry', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-gen-kpis'] },
      { id: 'sec-gen-filter', title: 'Work Item Search & Status Filters', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-gen-filter-bar'] },
      { id: 'sec-gen-table', title: 'Active Work Queue & Automated Triage', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-gen-table', 'cmp-gen-workflow'] },
      { id: 'sec-gen-copilot', title: 'AI Operational Decision Copilot', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-gen-copilot', 'cmp-gen-chart'] }
    ],
    components: [
      {
        id: 'cmp-gen-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-gen-kpis',
        title: 'Operational Metrics',
        props: {
          items: [
            { label: 'Active Process Throughput', value: '1,420/hr', change: '+14% efficiency', trend: 'up', icon: 'Zap', badge: 'Nominal' },
            { label: 'Mean SLA Resolution', value: '1.8 min', change: 'Target < 3m', trend: 'down', icon: 'Clock', badge: 'Optimal' },
            { label: 'Work Queue Backlog', value: '42 items', change: '-28% turnaround', trend: 'down', icon: 'Inbox', badge: 'Low' },
            { label: 'Automated Copilot Accuracy', value: '98.4%', change: 'Audited', trend: 'up', icon: 'Bot', badge: 'Certified' }
          ]
        }
      },
      {
        id: 'cmp-gen-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-gen-filter',
        title: 'Queue Search',
        props: {
          searchPlaceholder: 'Search items by ID, title, assigned operator, or priority...',
          filterChips: ['All Work Items', 'High Priority', 'SLA Critical', 'Assigned to Me', 'Completed'],
          activeFilter: 'All Work Items',
          actionButtons: [
            { label: '+ Add Work Item', variant: 'primary', icon: 'Plus' },
            { label: 'Batch Run Actions', variant: 'outline', icon: 'Play' }
          ]
        }
      },
      {
        id: 'cmp-gen-table',
        type: 'data_table',
        sectionId: 'sec-gen-table',
        title: 'Active Work Queue & Operational Triage',
        props: {
          searchable: false,
          columns: ['Item ID', 'Title / Description', 'Category', 'Priority', 'Assigned Actor', 'Status', 'Actions'],
          rows: [
            { id: 'ITM-901', title: 'Automated Account Sync', category: 'Data Pipeline', priority: 'High', actor: 'Sarah Jenkins', status: 'In Progress', actions: ['Open Details', 'Execute'] },
            { id: 'ITM-902', title: 'SLA Exception Ingestion', category: 'Compliance', priority: 'Critical', actor: 'Automated Bot', status: 'Awaiting Signoff', actions: ['Approve', 'Escalate'] },
            { id: 'ITM-903', title: 'Daily Settlement Batch', category: 'Financial', priority: 'Medium', actor: 'David Miller', status: 'Completed', actions: ['View Audit', 'Archive'] }
          ]
        }
      },
      {
        id: 'cmp-gen-workflow',
        type: 'workflow_tracker',
        sectionId: 'sec-gen-table',
        title: 'Core Process Execution Lifecycle',
        props: {
          stages: [
            { id: 'stg-1', title: '1. Ingestion & Validation', status: 'completed', time: '14 ms' },
            { id: 'stg-2', title: '2. Rule Evaluation', status: 'completed', time: '40 ms' },
            { id: 'stg-3', title: '3. Operator Execution', status: 'in-progress', time: 'Active' },
            { id: 'stg-4', title: '4. Audit Ledger Verification', status: 'pending', time: 'Queued' }
          ]
        }
      },
      {
        id: 'cmp-gen-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-gen-copilot',
        title: 'AI Decision Assistant',
        props: {
          confidenceScore: 97,
          recommendation: 'Autonomous rule validation detected high confidence pattern for item ITM-902. Suggest 1-click batch execution to maintain 0m latency SLA.',
          contextBadges: ['Audited Model', 'Real-Time Sync'],
          quickActions: [
            { label: 'Accept & Execute Plan', action: 'EXECUTE_PLAN' },
            { label: 'Inspect Model Rationale', action: 'INSPECT_MODEL' },
            { label: 'Export Telemetry Log', action: 'EXPORT_LOG' }
          ]
        }
      },
      {
        id: 'cmp-gen-chart',
        type: 'chart',
        sectionId: 'sec-gen-copilot',
        title: 'Throughput Velocity vs SLA Target (24h)',
        props: {
          chartType: 'line',
          categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
          series: [
            { name: 'Throughput (ops/hr)', data: [420, 380, 1120, 1420, 1380, 890], color: '#3B82F6' },
            { name: 'SLA Baseline', data: [500, 500, 1000, 1200, 1200, 800], color: '#10B981' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-run', label: 'Execute Resolution', variant: 'primary', icon: 'Zap' },
      { id: 'act-export', label: 'Export Specification', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createWorkflowQueueUiSpecification(screenName = 'Commercial Ticket Booking & Issue Resolution Console', domain = 'ENTERPRISE', theme = THEME_ARCHETYPES['enterprise-slate']) {
  return {
    page: {
      id: 'screen-ticket-workflow',
      name: screenName,
      purpose: 'Live multi-channel ticket booking triage, exception investigation, SLA countdown, and automated resolution dispatch.',
      businessDomain: domain || 'ENTERPRISE'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 12,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-inbox', label: 'Ticket Queue (18)', icon: 'Inbox', active: true },
      { id: 'nav-sla', label: 'Urgent SLA (3)', icon: 'Clock', badge: 'Critical', active: false },
      { id: 'nav-assigned', label: 'My Cases (7)', icon: 'Users', active: false },
      { id: 'nav-history', label: 'Resolution Archive', icon: 'CheckCircle2', active: false }
    ],
    sections: [
      { id: 'sec-queue-kpis', title: 'Ticket & SLA Telemetry', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-queue-kpis'] },
      { id: 'sec-queue-filter', title: 'Ticket Search & Status Filters', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-queue-filter-bar'] },
      { id: 'sec-queue-table', title: 'Commercial Booking Triage & Issue Intake Matrix', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-queue-table', 'cmp-queue-lifecycle'] },
      { id: 'sec-queue-sidebar', title: 'AI Resolution Copilot & Customer Telemetry', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-queue-copilot', 'cmp-queue-feed'] }
    ],
    components: [
      {
        id: 'cmp-queue-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-queue-kpis',
        title: 'Queue Telemetry',
        props: {
          items: [
            { label: 'Unresolved Tickets & Bookings', value: '18 Active', change: '-24% backlog', trend: 'down', icon: 'Inbox', badge: 'Triage' },
            { label: 'Mean First Response', value: '1.2 min', change: 'Target < 3m', trend: 'down', icon: 'Clock', badge: 'Optimal' },
            { label: 'SLA Compliance Rate', value: '99.4%', change: 'Audit Certified', trend: 'up', icon: 'ShieldCheck', badge: 'Compliant' },
            { label: 'Auto-Resolved by AI Copilot', value: '78.2%', change: '+14% straight-through', trend: 'up', icon: 'Bot', badge: 'Automated' }
          ]
        }
      },
      {
        id: 'cmp-queue-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-queue-filter',
        title: 'Ticket Filter & Search Bar',
        props: {
          searchPlaceholder: 'Search booking by PNR, Ticket #, Customer Name, or Flight/Order ID...',
          filterChips: ['All Tickets', 'SLA Critical (<15m)', 'Booking Modifications', 'Cancellation / Refund', 'Payment Discrepancy', 'Assigned to Me'],
          activeFilter: 'All Tickets',
          actionButtons: [
            { label: '+ Create Ticket / Booking', variant: 'primary', icon: 'Plus' },
            { label: 'Batch Reassign', variant: 'outline', icon: 'Users' }
          ]
        }
      },
      {
        id: 'cmp-queue-table',
        type: 'data_table',
        sectionId: 'sec-queue-table',
        title: 'Commercial Booking Triage & Issue Intake Matrix',
        props: {
          searchable: false,
          columns: ['Ticket ID', 'Customer / Account', 'Booking Ref', 'Issue Category', 'Priority', 'Assigned Agent', 'SLA Remaining', 'Actions'],
          rows: [
            { id: 'TKT-8091', customer: 'Global Logistics Corp', bookingRef: 'PNR-9042A', issue: 'Flight Schedule Conflict', priority: 'Critical', agent: 'Sarah Jenkins', sla: '4 min', actions: ['Auto-Rebook', 'Escalate'] },
            { id: 'TKT-8092', customer: 'Apex Retail Group', bookingRef: 'ORD-7721X', issue: 'Payment Authorization Hold', priority: 'High', agent: 'David Miller', sla: '12 min', actions: ['Release Hold', 'Inspect'] },
            { id: 'TKT-8093', customer: 'Meridian FinTech', bookingRef: 'TXN-5509B', issue: 'Invoice VAT Discrepancy', priority: 'Medium', agent: 'Elena Vance', sla: '28 min', actions: ['Update Invoice', 'Approve'] },
            { id: 'TKT-8094', customer: 'Summit Health Systems', bookingRef: 'BK-1094M', issue: 'Seat Upgrade Request', priority: 'Low', agent: 'Automated Bot', sla: '45 min', actions: ['Confirm Upgrade', 'Close'] },
            { id: 'TKT-8095', customer: 'Vanguard Aerospace', bookingRef: 'PNR-3312Z', issue: 'Multi-City Route Modification', priority: 'High', agent: 'Sarah Jenkins', sla: '18 min', actions: ['Re-route', 'Escalate'] }
          ]
        }
      },
      {
        id: 'cmp-queue-lifecycle',
        type: 'workflow_tracker',
        sectionId: 'sec-queue-table',
        title: 'Ticket Resolution Lifecycle & SLA Countdown',
        props: {
          stages: [
            { id: 'stg-1', title: '1. Ticket Ingestion', status: 'completed', time: '0.2 min' },
            { id: 'stg-2', title: '2. AI Classification', status: 'completed', time: '0.4 min' },
            { id: 'stg-3', title: '3. Agent Resolution', status: 'in-progress', time: 'Active' },
            { id: 'stg-4', title: '4. Customer Confirmation', status: 'pending', time: 'Queued' }
          ]
        }
      },
      {
        id: 'cmp-queue-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-queue-sidebar',
        title: 'AI Ticket Resolution & Rebooking Copilot',
        props: {
          confidenceScore: 98,
          recommendation: 'Ticket TKT-8091 (Global Logistics) has alternative routing available on Flight AA-492 departing at 14:30. 1-click execution rebooks seat and notifies traveler via WhatsApp/Email without fee penalty.',
          contextBadges: ['SLA Guard Active', 'Real-Time Inventory'],
          quickActions: [
            { label: 'Execute 1-Click Rebooking', action: 'AUTO_REBOOK' },
            { label: 'Draft Customer Response', action: 'DRAFT_REPLY' },
            { label: 'Escalate to Tier 2 Lead', action: 'ESCALATE' }
          ]
        }
      },
      {
        id: 'cmp-queue-feed',
        type: 'activity_feed',
        sectionId: 'sec-queue-sidebar',
        title: 'Live Ticket Activity Stream',
        props: {
          activities: [
            { id: 'act-1', actor: 'Sarah Jenkins', action: 'Started investigation on TKT-8091', timestamp: '1m ago', type: 'info' },
            { id: 'act-2', actor: 'AI Copilot', action: 'Auto-released payment hold for ORD-7721X', timestamp: '3m ago', type: 'success' },
            { id: 'act-3', actor: 'Elena Vance', action: 'Updated VAT tax rate on TXN-5509B', timestamp: '7m ago', type: 'warning' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-rebook', label: 'Batch Re-route Bookings', variant: 'primary', icon: 'Zap' },
      { id: 'act-export', label: 'Export SLA Logs', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createRulesPolicyUiSpecification(screenName = 'Booking Rules & Policy Manager', domain = 'ENTERPRISE', theme = THEME_ARCHETYPES['enterprise-slate']) {
  return {
    page: {
      id: 'screen-rules-manager',
      name: screenName,
      purpose: 'Configure autonomous booking constraints, fraud velocity thresholds, dynamic cancellation policies, and KYC compliance guardrails.',
      businessDomain: domain || 'ENTERPRISE'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 12,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-active-rules', label: 'Active Policies (24)', icon: 'ShieldCheck', active: true },
      { id: 'nav-fraud', label: 'Fraud & Velocity (8)', icon: 'ShieldAlert', active: false },
      { id: 'nav-refund', label: 'Refund Policies (6)', icon: 'DollarSign', active: false },
      { id: 'nav-audit', label: 'Audit Trail', icon: 'Clock', active: false }
    ],
    sections: [
      { id: 'sec-rules-kpis', title: 'Governance & Rule Telemetry', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-rules-kpis'] },
      { id: 'sec-rules-filter', title: 'Rule Search & Category Filters', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-rules-filter-bar'] },
      { id: 'sec-rules-table', title: 'Operational Policy Matrix & Automated Logic Rules', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-rules-table', 'cmp-rules-lifecycle'] },
      { id: 'sec-rules-sidebar', title: 'AI Policy Guard & Simulation Sandbox', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-rules-copilot', 'cmp-rules-feed'] }
    ],
    components: [
      {
        id: 'cmp-rules-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-rules-kpis',
        title: 'Governance Telemetry',
        props: {
          items: [
            { label: 'Active Governance Rules', value: '24 Live', change: '+2 new this week', trend: 'up', icon: 'ShieldCheck', badge: 'Active' },
            { label: 'Rule Evaluation Latency', value: '3.2 ms', change: 'Nominal < 5ms', trend: 'down', icon: 'Zap', badge: 'Sub-ms' },
            { label: 'Auto-Enforced Approvals', value: '99.8%', change: 'Zero False Positives', trend: 'up', icon: 'Bot', badge: 'Certified' },
            { label: 'Flagged Policy Exceptions', value: '0 Critical', change: 'Audit Compliant', trend: 'down', icon: 'ShieldAlert', badge: 'Optimal' }
          ]
        }
      },
      {
        id: 'cmp-rules-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-rules-filter',
        title: 'Rule Filter & Search Bar',
        props: {
          searchPlaceholder: 'Search rule by ID, policy name, trigger condition, or risk level...',
          filterChips: ['All Rules', 'Booking Limits', 'Fraud & Risk', 'Refund / Cancellation', 'VIP Overrides', 'Disabled'],
          activeFilter: 'All Rules',
          actionButtons: [
            { label: '+ Add New Policy Rule', variant: 'primary', icon: 'Plus' },
            { label: 'Simulate Rule Changes', variant: 'outline', icon: 'Play' }
          ]
        }
      },
      {
        id: 'cmp-rules-table',
        type: 'data_table',
        sectionId: 'sec-rules-table',
        title: 'Operational Policy Matrix & Automated Logic Rules',
        props: {
          searchable: false,
          columns: ['Rule ID', 'Policy Name', 'Trigger Condition', 'Evaluation Threshold', 'Enforcement Action', 'Risk Level', 'Status', 'Actions'],
          rows: [
            { id: 'RUL-101', name: 'High-Value Booking Gate', condition: 'Booking Total > $5,000', threshold: 'Unverified Customer ID', action: 'Trigger 2FA & Supervisor Signoff', risk: 'High', status: 'Enforced', actions: ['Edit Rule', 'Simulate'] },
            { id: 'RUL-102', name: 'Velocity Velocity Shield', condition: '> 3 Bookings / 10 mins', threshold: 'Same Card / Device IP', action: 'Temp Hold & Risk Scoring', risk: 'Critical', status: 'Enforced', actions: ['Edit Rule', 'Simulate'] },
            { id: 'RUL-103', name: 'Auto-Refund Grace Period', condition: 'Cancellation < 24 hrs', threshold: 'Fare Class: Flexible / Business', action: 'Instant Full Refund Credit', risk: 'Low', status: 'Enforced', actions: ['Edit Rule', 'Simulate'] },
            { id: 'RUL-104', name: 'Overbooking Buffer Allocation', condition: 'Capacity Utilization > 95%', threshold: 'VIP / Corporate Tier', action: 'Reserve 2 Standby Seats', risk: 'Medium', status: 'Active', actions: ['Edit Rule', 'Simulate'] },
            { id: 'RUL-105', name: 'Dynamic Surge Pricing Guard', condition: 'Demand Spike > 180%', threshold: 'Standard Inventory', action: 'Cap Max Surge Multiplier at 1.4x', risk: 'Low', status: 'Enforced', actions: ['Edit Rule', 'Simulate'] }
          ]
        }
      },
      {
        id: 'cmp-rules-lifecycle',
        type: 'workflow_tracker',
        sectionId: 'sec-rules-table',
        title: 'Policy Evaluation & Enforcement Pipeline',
        props: {
          stages: [
            { id: 'stg-1', title: '1. Rule Trigger Matching', status: 'completed', time: '1.2 ms' },
            { id: 'stg-2', title: '2. Threshold Evaluation', status: 'completed', time: '2.0 ms' },
            { id: 'stg-3', title: '3. Action Dispatch', status: 'in-progress', time: 'Active' },
            { id: 'stg-4', title: '4. Immutable Audit Log', status: 'pending', time: 'Queued' }
          ]
        }
      },
      {
        id: 'cmp-rules-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-rules-sidebar',
        title: 'AI Governance & Policy Simulator',
        props: {
          confidenceScore: 99,
          recommendation: 'Simulating Rule RUL-101 against past 30 days traffic: 99.4% precision with 0 false rejections. Suggest increasing threshold to $6,500 for Platinum accounts.',
          contextBadges: ['Audit Safe', 'Zero-Downtime Hot Reload'],
          quickActions: [
            { label: 'Apply Optimized Threshold', action: 'APPLY_OPTIMIZED' },
            { label: 'Run Full Regression Test', action: 'RUN_TEST' },
            { label: 'Export Policy JSON Schema', action: 'EXPORT_POLICY' }
          ]
        }
      },
      {
        id: 'cmp-rules-feed',
        type: 'activity_feed',
        sectionId: 'sec-rules-sidebar',
        title: 'Policy Change History & Audit Log',
        props: {
          activities: [
            { id: 'act-1', actor: 'Compliance Lead', action: 'Updated threshold on RUL-102 (Velocity Shield)', timestamp: '12m ago', type: 'info' },
            { id: 'act-2', actor: 'AI Policy Guard', action: 'Auto-tested RUL-104 overbooking rules against 10k simulations', timestamp: '1h ago', type: 'success' },
            { id: 'act-3', actor: 'Admin Sarah', action: 'Activated RUL-105 dynamic surge pricing cap', timestamp: '3h ago', type: 'warning' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-publish', label: 'Publish Policy Updates', variant: 'primary', icon: 'ShieldCheck' },
      { id: 'act-export', label: 'Export Policy JSON', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createAnalyticsUiSpecification(screenName = 'Throughput & Performance Analytics Console', domain = 'ENTERPRISE', theme = THEME_ARCHETYPES['enterprise-slate']) {
  return {
    page: {
      id: 'screen-analytics-console',
      name: screenName,
      purpose: 'End-to-end operational performance analysis, SLA trend forecasting, and workload distribution metrics.',
      businessDomain: domain || 'ENTERPRISE'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 12,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-throughput', label: 'Throughput & Volume', icon: 'BarChart3', active: true },
      { id: 'nav-sla-trends', label: 'SLA Trends', icon: 'Clock', active: false },
      { id: 'nav-error-rates', label: 'Error & Exception Analysis', icon: 'AlertTriangle', active: false },
      { id: 'nav-export', label: 'Reports & Exports', icon: 'Download', active: false }
    ],
    sections: [
      { id: 'sec-ana-kpis', title: 'Analytics KPIs', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-ana-kpis'] },
      { id: 'sec-ana-charts', title: 'Throughput Velocity & Category Breakdown', columnSpan: 8, rowOrder: 2, componentIds: ['cmp-ana-chart-1', 'cmp-ana-chart-2'] },
      { id: 'sec-ana-sidebar', title: 'AI Forecasting & Anomaly Detection', columnSpan: 4, rowOrder: 3, componentIds: ['cmp-ana-copilot', 'cmp-ana-table'] }
    ],
    components: [
      {
        id: 'cmp-ana-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-ana-kpis',
        title: 'System Telemetry KPIs',
        props: {
          items: [
            { label: 'Total Transaction Volume', value: '142.8k', change: '+18.2% vs last month', trend: 'up', icon: 'Zap', badge: 'High Volume' },
            { label: 'Peak Hourly Throughput', value: '4,800/min', change: 'Capacity headroom: 62%', trend: 'up', icon: 'TrendingUp', badge: 'Nominal' },
            { label: '99th Percentile SLA', value: '2.1 min', change: 'Target < 3.0 min', trend: 'down', icon: 'Clock', badge: 'Optimal' },
            { label: 'System Service Uptime', value: '99.99%', change: 'Zero Unscheduled Outages', trend: 'up', icon: 'ShieldCheck', badge: 'Certified' }
          ]
        }
      },
      {
        id: 'cmp-ana-chart-1',
        type: 'chart',
        sectionId: 'sec-ana-charts',
        title: 'Hourly Transaction Processing Throughput vs Target (24h)',
        props: {
          chartType: 'bar',
          categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
          series: [
            { name: 'Completed Transactions', data: [1200, 950, 3800, 4800, 4200, 2400], color: '#3B82F6' },
            { name: 'Target Baseline', data: [1000, 800, 3200, 4000, 3800, 2000], color: '#10B981' }
          ]
        }
      },
      {
        id: 'cmp-ana-chart-2',
        type: 'chart',
        sectionId: 'sec-ana-charts',
        title: 'Workload & Category Distribution Breakdown',
        props: {
          chartType: 'line',
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          series: [
            { name: 'Direct Bookings', data: [420, 560, 680, 790, 840, 920, 880], color: '#8B5CF6' },
            { name: 'AI Auto-Resolutions', data: [310, 450, 560, 620, 710, 780, 750], color: '#10B981' }
          ]
        }
      },
      {
        id: 'cmp-ana-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-ana-sidebar',
        title: 'AI Predictive Capacity Copilot',
        props: {
          confidenceScore: 96,
          recommendation: 'Predictive model forecasts 35% booking volume surge tomorrow between 14:00 and 17:00. Recommend pre-scaling worker pool by 4 instances.',
          contextBadges: ['Machine Learning Model', 'Live Telemetry'],
          quickActions: [
            { label: 'Auto-Scale Worker Pool', action: 'SCALE_WORKERS' },
            { label: 'Generate Executive PDF Report', action: 'EXPORT_PDF' }
          ]
        }
      },
      {
        id: 'cmp-ana-table',
        type: 'data_table',
        sectionId: 'sec-ana-sidebar',
        title: 'Department Performance Summary',
        props: {
          searchable: false,
          columns: ['Department', 'Volume', 'SLA Adherence', 'Status'],
          rows: [
            { id: 'DEP-1', name: 'Commercial Booking', volume: '68,200', sla: '99.6%', status: 'Optimal' },
            { id: 'DEP-2', name: 'Customer Support', volume: '44,100', sla: '99.2%', status: 'Optimal' },
            { id: 'DEP-3', name: 'Payment Settlement', volume: '30,500', sla: '99.8%', status: 'Optimal' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-export-pdf', label: 'Export Executive PDF', variant: 'primary', icon: 'Download' },
      { id: 'act-refresh', label: 'Refresh Analytics', variant: 'secondary', icon: 'RefreshCw' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createRestaurantUiSpecification(businessName = 'Gourmet Kitchen & Dining', theme = THEME_ARCHETYPES['enterprise-slate']) {
  return {
    page: {
      id: 'screen-restaurant-dashboard',
      name: `${businessName} — Kitchen Display & Table Order Control Plane`,
      purpose: 'Manage real-time kitchen tickets, table reservations, delivery orders, and ingredient inventory levels.',
      businessDomain: 'RESTAURANT'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 12,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme,
    navigation: [
      { id: 'nav-orders', label: 'Live Orders', icon: 'Package', badge: '18 Active', active: true },
      { id: 'nav-tables', label: 'Table Floor Plan', icon: 'Layers', active: false },
      { id: 'nav-inventory', label: 'Pantry Inventory', icon: 'Tag', active: false },
      { id: 'nav-staff', label: 'Shift Roster', icon: 'Users', active: false }
    ],
    sections: [
      { id: 'sec-rest-kpis', title: 'Dining Operations', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-rest-kpis'] },
      { id: 'sec-rest-toolbar', title: 'Order Triage', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-rest-filter-bar'] },
      { id: 'sec-rest-main', title: 'Active Kitchen Order Tickets', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-rest-table', 'cmp-rest-kanban'] },
      { id: 'sec-rest-sidebar', title: 'AI Kitchen Dispatch Assistant', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-rest-copilot', 'cmp-rest-chart'] }
    ],
    components: [
      {
        id: 'cmp-rest-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-rest-kpis',
        title: 'Kitchen & Floor Telemetry',
        props: {
          items: [
            { label: 'Active Kitchen Tickets', value: '18 Orders', change: '8 min avg prep', trend: 'up', icon: 'Clock', badge: 'Busy' },
            { label: 'Table Occupancy', value: '84%', change: '22 / 26 Tables', trend: 'up', icon: 'Users', badge: 'High' },
            { label: 'Daily Revenue', value: '$8,420', change: '+18% vs yesterday', trend: 'up', icon: 'DollarSign', badge: 'Surge' },
            { label: 'Delivery On-Time SLA', value: '96.4%', change: 'Target > 95%', trend: 'up', icon: 'Truck', badge: 'Optimal' }
          ]
        }
      },
      {
        id: 'cmp-rest-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-rest-toolbar',
        title: 'Order Search & Station Filters',
        props: {
          searchPlaceholder: 'Search order ID, table number, customer name, or special request...',
          filterChips: ['All Orders', 'Dine-In', 'Delivery Pickup', 'Prep Station', 'Ready to Serve'],
          activeFilter: 'All Orders',
          actionButtons: [
            { label: '+ New Order', variant: 'primary', icon: 'Plus' },
            { label: 'Fire Expedite Batch', variant: 'secondary', icon: 'Zap' }
          ]
        }
      },
      {
        id: 'cmp-rest-table',
        type: 'data_table',
        sectionId: 'sec-rest-main',
        title: 'Live Kitchen Expediter Queue',
        props: {
          columns: ['Order #', 'Type / Table', 'Items Ordered', 'Server / Cook', 'Timer', 'Status', 'Actions'],
          rows: [
            { id: 'ORD-101', type: 'Table 14 (4 Top)', items: '2x Ribeye, 1x Truffle Risotto', server: 'Marco V.', timer: '6 min', status: 'Cooking', actions: ['Mark Ready', 'Expedite'] },
            { id: 'ORD-102', type: 'DoorDash Pickup #402', items: '3x Wagyu Burgers, 2x Fries', server: 'Kitchen Line 2', timer: '11 min', status: 'Plating', actions: ['Hand off', 'Delay'] },
            { id: 'ORD-103', type: 'Table 8 (2 Top)', items: '1x Salmon Fillet, 1x Caesar', server: 'Elena R.', timer: '2 min', status: 'Fired', actions: ['Hold', 'Expedite'] },
            { id: 'ORD-104', type: 'Table 22 (Bar)', items: '2x Old Fashioned, Calamari', server: 'Sam T.', timer: '1 min', status: 'Ready to Serve', actions: ['Serve', 'Clear'] }
          ]
        }
      },
      {
        id: 'cmp-rest-kanban',
        type: 'kanban_board',
        sectionId: 'sec-rest-main',
        title: 'Kitchen Line Station Progression',
        props: {
          columns: [
            { id: 'c-prep', title: 'Prep Station (6)', count: 6, items: ['Order #103 Truffle', 'Order #105 Salad'] },
            { id: 'c-grill', title: 'Grill & Saute (8)', count: 8, items: ['Order #101 Ribeye', 'Order #102 Wagyu'] },
            { id: 'c-expedite', title: 'Expedite & Pass (4)', count: 4, items: ['Order #104 Bar Platter'] }
          ]
        }
      },
      {
        id: 'cmp-rest-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-rest-sidebar',
        title: 'AI Kitchen Pacing Assistant',
        props: {
          confidenceScore: 98,
          recommendation: 'Grill line is operating at 92% capacity. Suggest holding non-urgent appetizers by 3 minutes to align steak finish times with Table 14.',
          contextBadges: ['Kitchen Intelligence', 'Real-Time Sync'],
          quickActions: [
            { label: 'Auto-Sync Grill & Pass Timing', action: 'SYNC_STATIONS' },
            { label: 'Alert Hostess of 15m Table Wait', action: 'ALERT_HOSTESS' }
          ]
        }
      },
      {
        id: 'cmp-rest-chart',
        type: 'chart',
        sectionId: 'sec-rest-sidebar',
        title: 'Hourly Kitchen Order Velocity',
        props: {
          chartType: 'bar',
          categories: ['11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM'],
          series: [
            { name: 'Covers Plated', data: [24, 68, 30, 85, 120, 94], color: '#F59E0B' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-new-order', label: 'Create Order', variant: 'primary', icon: 'Plus' },
      { id: 'act-export', label: 'Export Daily Service Log', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createManufacturingUiSpecification(businessName = 'ForgeIndustrial Plant Operations', theme = THEME_ARCHETYPES['cyber-ops']) {
  return {
    page: {
      id: 'screen-manufacturing-dashboard',
      name: `${businessName} — Industrial Plant Telemetry & Machine Operations`,
      purpose: 'Monitor automated assembly lines, predictive maintenance sensors, cycle time efficiency, and quality inspection alerts.',
      businessDomain: 'MANUFACTURING'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 10,
      density: 'compact',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme: {
      ...THEME_ARCHETYPES['cyber-ops'],
      ...(theme || {})
    },
    navigation: [
      { id: 'nav-lines', label: 'Assembly Lines', icon: 'Activity', badge: 'Line 3 Warning', active: true },
      { id: 'nav-maintenance', label: 'Predictive Maintenance', icon: 'ShieldAlert', active: false },
      { id: 'nav-quality', label: 'Quality Telemetry', icon: 'CheckCircle2', active: false },
      { id: 'nav-shifts', label: 'Plant Shift Roster', icon: 'Users', active: false }
    ],
    sections: [
      { id: 'sec-mfg-kpis', title: 'Plant Production Telemetry', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-mfg-kpis'] },
      { id: 'sec-mfg-toolbar', title: 'Machine Line Filter & Telemetry Controls', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-mfg-filter-bar'] },
      { id: 'sec-mfg-main', title: 'Active Machine Sensor Matrix', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-mfg-table', 'cmp-mfg-workflow'] },
      { id: 'sec-mfg-sidebar', title: 'Predictive Maintenance AI Engine', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-mfg-copilot', 'cmp-mfg-chart'] }
    ],
    components: [
      {
        id: 'cmp-mfg-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-mfg-kpis',
        title: 'Plant Productivity KPIs',
        props: {
          items: [
            { label: 'Overall Equipment Effectiveness', value: '88.4%', change: '+3.2% vs target', trend: 'up', icon: 'Activity', badge: 'OEE High' },
            { label: 'Cycle Time / Unit', value: '14.2 sec', change: '-1.8s optimal', trend: 'down', icon: 'Clock', badge: 'Nominal' },
            { label: 'First-Pass Yield Quality', value: '99.2%', change: 'Audited ISO-9001', trend: 'up', icon: 'ShieldCheck', badge: 'Passed' },
            { label: 'Vibration & Thermal Warnings', value: '2 Sensors', change: 'Line 3 Hydraulic', trend: 'down', icon: 'AlertTriangle', badge: 'Review' }
          ]
        }
      },
      {
        id: 'cmp-mfg-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-mfg-toolbar',
        title: 'Machine Telemetry Search',
        props: {
          searchPlaceholder: 'Search machine ID, assembly line, sensor tag, or maintenance operator...',
          filterChips: ['All Equipment', 'Assembly Line A', 'Robotic Welding Cell', 'CNC Mill Cluster', 'Anomalies Only'],
          activeFilter: 'All Equipment',
          actionButtons: [
            { label: '+ Log Work Order', variant: 'primary', icon: 'Plus' },
            { label: 'Diagnostic Sweep', variant: 'secondary', icon: 'RefreshCw' }
          ]
        }
      },
      {
        id: 'cmp-mfg-table',
        type: 'data_table',
        sectionId: 'sec-mfg-main',
        title: 'Live Industrial Asset Telemetry Feed',
        props: {
          columns: ['Asset ID', 'Equipment Name', 'Cell Location', 'Temperature', 'RPM / Load', 'Health Score', 'Status', 'Actions'],
          rows: [
            { id: 'CNC-01', asset: 'Hermle 5-Axis CNC Mill', cell: 'Cell 4B', temp: '54°C (Normal)', load: '12,400 RPM (78%)', health: '98%', status: 'Running', actions: ['Inspect Telemetry', 'Calibrate'] },
            { id: 'ROB-03', asset: 'Fanuc 6-Axis Robotic Welder', cell: 'Cell 2A', temp: '72°C (Warning)', load: 'Cycle #14,802', health: '82%', status: 'Thermal Alert', actions: ['Trigger Coolant', 'Override'] },
            { id: 'HYD-09', asset: 'Rexroth Hydraulic Press 50T', cell: 'Cell 1C', temp: '48°C (Normal)', load: '42.8 bar (92%)', health: '94%', status: 'Running', actions: ['Check Pressure', 'Service'] },
            { id: 'CONV-02', asset: 'Intralox Sorting Conveyor', cell: 'Line 3', temp: '38°C (Cool)', load: '1.2 m/s', health: '99%', status: 'Running', actions: ['Inspect Belt', 'Logs'] }
          ]
        }
      },
      {
        id: 'cmp-mfg-workflow',
        type: 'workflow_tracker',
        sectionId: 'sec-mfg-main',
        title: 'Automated Batch Quality Verification Lifecycle',
        props: {
          stages: [
            { id: 'stg-m1', title: '1. Ingot Ingestion', status: 'completed', time: '12 sec' },
            { id: 'stg-m2', title: '2. CNC Precision Milling', status: 'completed', time: '48 sec' },
            { id: 'stg-m3', title: '3. Laser Micro-Metrology', status: 'in-progress', time: 'Active' },
            { id: 'stg-m4', title: '4. Packaging & Barcode', status: 'pending', time: 'Queued' }
          ]
        }
      },
      {
        id: 'cmp-mfg-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-mfg-sidebar',
        title: 'Predictive Industrial AI Assistant',
        props: {
          confidenceScore: 97,
          recommendation: 'Bearing acoustic harmonic analysis indicates micro-wear on Robotic Welder ROB-03 joint 4. Recommend preventive lubrication at 18:00 shift change.',
          contextBadges: ['IIoT Telemetry', 'ISO Predictive Model'],
          quickActions: [
            { label: 'Schedule Lubrication Ticket', action: 'SCHEDULE_MAINTENANCE' },
            { label: 'Derate Robot Speed by 10%', action: 'DERATE_SPEED' }
          ]
        }
      },
      {
        id: 'cmp-mfg-chart',
        type: 'chart',
        sectionId: 'sec-mfg-sidebar',
        title: '24-Hour Production Throughput Units',
        props: {
          chartType: 'bar',
          categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
          series: [
            { name: 'Finished Units', data: [340, 420, 680, 890, 820, 710], color: '#10B981' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-work-order', label: 'Create Work Order', variant: 'primary', icon: 'Plus' },
      { id: 'act-export', label: 'Export OEE Audit Report', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

export function createHrPlatformUiSpecification(businessName = 'PeopleFirst HR Management', theme = THEME_ARCHETYPES['saas-modern']) {
  return {
    page: {
      id: 'screen-hr-dashboard',
      name: `${businessName} — Workforce Directory & People Operations`,
      purpose: 'Orchestrate employee onboarding, time-off approvals, payroll compliance, and department performance reviews.',
      businessDomain: 'HR_PLATFORM'
    },
    layout: {
      type: 'sidebar-grid',
      columns: 12,
      gap: 14,
      density: 'comfortable',
      sidebarPosition: 'right',
      sidebarCollapsible: true
    },
    theme: {
      ...THEME_ARCHETYPES['saas-modern'],
      ...(theme || {})
    },
    navigation: [
      { id: 'nav-employees', label: 'Team Directory', icon: 'Users', badge: '142 Staff', active: true },
      { id: 'nav-onboarding', label: 'Onboarding Pipeline', icon: 'Layers', badge: '6 New', active: false },
      { id: 'nav-timeoff', label: 'Time-Off & Leave', icon: 'Calendar', active: false },
      { id: 'nav-payroll', label: 'Payroll Approvals', icon: 'DollarSign', active: false }
    ],
    sections: [
      { id: 'sec-hr-kpis', title: 'Workforce Overview', columnSpan: 12, rowOrder: 1, componentIds: ['cmp-hr-kpis'] },
      { id: 'sec-hr-toolbar', title: 'People Search & Department Filter', columnSpan: 12, rowOrder: 2, componentIds: ['cmp-hr-filter-bar'] },
      { id: 'sec-hr-main', title: 'Employee Directory & Approval Queue', columnSpan: 8, rowOrder: 3, componentIds: ['cmp-hr-table', 'cmp-hr-kanban'] },
      { id: 'sec-hr-sidebar', title: 'AI People Operations Copilot', columnSpan: 4, rowOrder: 4, componentIds: ['cmp-hr-copilot', 'cmp-hr-chart'] }
    ],
    components: [
      {
        id: 'cmp-hr-kpis',
        type: 'kpi_grid',
        sectionId: 'sec-hr-kpis',
        title: 'Workforce Metrics',
        props: {
          items: [
            { label: 'Total Active Headcount', value: '142 Team', change: '+8 this quarter', trend: 'up', icon: 'Users', badge: 'Growing' },
            { label: 'Pending Leave Approvals', value: '4 Requests', change: '24h avg turnaround', trend: 'down', icon: 'Clock', badge: 'Action' },
            { label: 'Onboarding Velocity', value: '98.2%', change: 'Avg 4.2 days', trend: 'up', icon: 'CheckCircle2', badge: 'Fast' },
            { label: 'Employee Pulse Score', value: '9.4 / 10', change: '+0.3 eNPS', trend: 'up', icon: 'ShieldCheck', badge: 'Strong' }
          ]
        }
      },
      {
        id: 'cmp-hr-filter-bar',
        type: 'search_filter_bar',
        sectionId: 'sec-hr-toolbar',
        title: 'Employee Search',
        props: {
          searchPlaceholder: 'Search employee name, role, department, manager, or skills...',
          filterChips: ['All Employees', 'Engineering', 'Product & Design', 'Sales & Marketing', 'Pending Review'],
          activeFilter: 'All Employees',
          actionButtons: [
            { label: '+ Add New Hire', variant: 'primary', icon: 'Plus' },
            { label: 'Batch Payroll Run', variant: 'secondary', icon: 'Zap' }
          ]
        }
      },
      {
        id: 'cmp-hr-table',
        type: 'data_table',
        sectionId: 'sec-hr-main',
        title: 'Active Team Directory & Leave Requests',
        props: {
          columns: ['Employee', 'Role', 'Department', 'Location', 'Status', 'Actions'],
          rows: [
            { id: 'EMP-01', name: 'Sophia Chen', role: 'Staff Systems Architect', dept: 'Engineering', loc: 'San Francisco, CA', status: 'Active', actions: ['Profile', 'Review'] },
            { id: 'EMP-02', name: 'Liam Rodriguez', role: 'Senior Product Designer', dept: 'Design', loc: 'Austin, TX', status: 'On PTO (Return Mon)', actions: ['Profile', 'Coverage'] },
            { id: 'EMP-03', name: 'Aaliyah Khan', role: 'Enterprise Account Executive', dept: 'Sales', loc: 'New York, NY', status: 'Active', actions: ['Profile', 'Commission'] },
            { id: 'EMP-04', name: 'Ethan Miller', role: 'Junior DevOps Engineer', dept: 'Engineering', loc: 'London, UK', status: 'Onboarding (Day 3)', actions: ['Checklist', 'Buddy'] }
          ]
        }
      },
      {
        id: 'cmp-hr-kanban',
        type: 'kanban_board',
        sectionId: 'sec-hr-main',
        title: 'New Hire Onboarding Progression',
        props: {
          columns: [
            { id: 'c-docs', title: 'Offer & I-9 Verification (2)', count: 2, items: ['Marcus Lee (Eng)', 'Zoe Vance (Product)'] },
            { id: 'c-equip', title: 'Hardware Provisioning (3)', count: 3, items: ['MacBook Pro M3 (Ethan M.)'] },
            { id: 'c-ready', title: 'First Week Scheduled (4)', count: 4, items: ['Orientation Deck Ready'] }
          ]
        }
      },
      {
        id: 'cmp-hr-copilot',
        type: 'ai_copilot_panel',
        sectionId: 'sec-hr-sidebar',
        title: 'AI People Operations Assistant',
        props: {
          confidenceScore: 96,
          recommendation: 'Ethan Miller completed security compliance training 2 days early. Automated badge access for London office is ready for manager approval.',
          contextBadges: ['Automated Workflow', 'SOC2 Compliant'],
          quickActions: [
            { label: 'Grant Office Badge Access', action: 'APPROVE_ACCESS' },
            { label: 'Schedule 30-Day Check-in', action: 'SCHEDULE_1ON1' }
          ]
        }
      },
      {
        id: 'cmp-hr-chart',
        type: 'chart',
        sectionId: 'sec-hr-sidebar',
        title: 'Department Headcount Growth',
        props: {
          chartType: 'bar',
          categories: ['Eng', 'Product', 'Sales', 'Ops', 'HR', 'Finance'],
          series: [
            { name: 'Headcount', data: [62, 24, 32, 12, 6, 6], color: '#6366F1' }
          ]
        }
      }
    ],
    actions: [
      { id: 'act-new-hire', label: 'Start Onboarding', variant: 'primary', icon: 'Plus' },
      { id: 'act-export', label: 'Export Workforce Census', variant: 'secondary', icon: 'Download' }
    ],
    responsiveRules: [
      { breakpoint: 'mobile', rules: { columns: 1, hideSidebar: false, stackCards: true } }
    ]
  };
}

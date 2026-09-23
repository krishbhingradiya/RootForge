import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { RootForgeLogo } from '../common/RootForgeLogo';
import { api } from '../../services/api';
import { showToast } from '../common/Toast';
import {
  Home,
  Building2,
  Sparkles,
  FileText,
  BarChart3,
  Settings,
  ChevronDown,
  Plus,
  Compass,
  MessagesSquare,
  FileSearch,
  Cpu,
  Network,
  GitFork,
  LayoutTemplate,
  Database,
  CalendarDays,
  Users,
  Share2,
  Shield,
  Sun,
  Moon,
  Upload,
  RefreshCw,
  Trash2,
  X,
  Menu,
  Check,
  WifiOff,
  Globe,
  LogOut
} from 'lucide-react';

export const MobileNav = ({ onOpenAiDrawer }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { workspaces, currentWorkspace, selectWorkspace, refreshWorkspace } = useWorkspace();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [wsSheetOpen, setWsSheetOpen] = useState(false);
  const [docsSheetOpen, setDocsSheetOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const activeWsId = currentWorkspace?.id || id || (workspaces?.[0]?.id ?? '');

  // Online / offline tracking
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleCapNetwork = (e) => {
      if (e.detail) setIsOffline(!e.detail.connected);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('rootforge:network-status', handleCapNetwork);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('rootforge:network-status', handleCapNetwork);
    };
  }, []);

  // Body scroll locking when mobile drawer or bottom sheets are open
  useEffect(() => {
    if (navDrawerOpen || wsSheetOpen || docsSheetOpen || showLogoutModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [navDrawerOpen, wsSheetOpen, docsSheetOpen, showLogoutModal]);

  // Listen to close-modal event from back button and escape key
  useEffect(() => {
    const handleClose = () => {
      setNavDrawerOpen(false);
      setWsSheetOpen(false);
      setDocsSheetOpen(false);
      setShowLogoutModal(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('rootforge:close-modal', handleClose);
    window.addEventListener('rootforge:close-drawer', handleClose);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('rootforge:close-modal', handleClose);
      window.removeEventListener('rootforge:close-drawer', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Popstate listener to allow Android hardware back button to close drawer
  useEffect(() => {
    if (navDrawerOpen) {
      window.history.pushState({ mobileNavOpen: true }, '');
      const handlePopState = () => {
        setNavDrawerOpen(false);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [navDrawerOpen]);

  // Load documents when docs sheet opens
  useEffect(() => {
    if (docsSheetOpen && activeWsId) {
      api.getDocuments(activeWsId)
        .then((res) => setDocs(res.documents || []))
        .catch(() => setDocs([]));
    }
  }, [docsSheetOpen, activeWsId]);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    setNavDrawerOpen(false);
    logout();
    navigate('/login', { replace: true });
    showToast(t.auth?.logoutSuccess || 'Logged out successfully', 'info');
  };

  const handleNativeFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeWsId) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await api.uploadDocument(activeWsId, formData);
      showToast(`Uploaded "${file.name}" - ${res.statusLabel || 'Processing'}`);
      const updated = await api.getDocuments(activeWsId);
      setDocs(updated.documents || []);
      if (refreshWorkspace) refreshWorkspace(activeWsId);
    } catch (err) {
      showToast(err.message || 'File upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ALL existing workspace sections from the application
  const stageItems = [
    { key: 'overview', path: `/app/workspaces/${activeWsId}`, label: t.nav?.overview || 'Overview', icon: Compass, stageNumber: 'Overview' },
    { key: 'discovery', path: `/app/workspaces/${activeWsId}/discovery`, label: t.nav?.discovery || 'Discovery', icon: MessagesSquare, stageNumber: 'Stage 1' },
    { key: 'analysis', path: `/app/workspaces/${activeWsId}/analysis`, label: t.nav?.analysis || 'Business Analysis', icon: FileSearch, stageNumber: 'Stage 2' },
    { key: 'solution', path: `/app/workspaces/${activeWsId}/solution`, label: t.nav?.solution || 'Solution Builder', icon: Cpu, stageNumber: 'Stage 3' },
    { key: 'architecture', path: `/app/workspaces/${activeWsId}/architecture`, label: t.nav?.architecture || 'Architecture', icon: Network, stageNumber: 'Stage 4' },
    { key: 'process', path: `/app/workspaces/${activeWsId}/process`, label: t.nav?.process || 'Process Designer', icon: GitFork, stageNumber: 'Stage 5' },
    { key: 'ux', path: `/app/workspaces/${activeWsId}/ux`, label: t.nav?.ux || 'UX Designer', icon: LayoutTemplate, stageNumber: 'Stage 6' },
    { key: 'database', path: `/app/workspaces/${activeWsId}/database`, label: t.nav?.database || 'Database & APIs', icon: Database, stageNumber: 'Stage 7' },
    { key: 'planning', path: `/app/workspaces/${activeWsId}/planning`, label: t.nav?.planning || 'Planning', icon: CalendarDays, stageNumber: 'Stage 8' },
    { key: 'collaboration', path: `/app/workspaces/${activeWsId}/collaboration`, label: t.nav?.collaboration || 'Collaboration', icon: Users, stageNumber: 'Team' },
    { key: 'exports', path: `/app/workspaces/${activeWsId}/exports`, label: t.nav?.exports || 'Reports & Exports', icon: Share2, stageNumber: 'Reports' }
  ];

  const isWorkspaceRoute = location.pathname.includes('/app/workspaces');

  // Determine current active section for Line 3 and drawer
  const getCurrentSectionInfo = () => {
    if (location.pathname === '/app/workspaces') {
      return { label: t.common?.workspaces || 'Workspaces Directory', icon: Building2, badge: 'All Workspaces' };
    }
    if (location.pathname.includes('/settings')) {
      return { label: t.nav?.settings || 'Settings', icon: Settings, badge: 'Preferences' };
    }
    if (location.pathname.startsWith('/admin')) {
      return { label: t.nav?.admin || 'Admin Console', icon: Shield, badge: 'Admin' };
    }
    if (location.pathname.endsWith('/discovery')) {
      return { label: t.nav?.discovery || 'Discovery', icon: MessagesSquare, badge: 'Stage 1' };
    }
    if (location.pathname.endsWith('/analysis')) {
      return { label: t.nav?.analysis || 'Business Analysis', icon: FileSearch, badge: 'Stage 2' };
    }
    if (location.pathname.endsWith('/solution')) {
      return { label: t.nav?.solution || 'Solution Builder', icon: Cpu, badge: 'Stage 3' };
    }
    if (location.pathname.endsWith('/architecture')) {
      return { label: t.nav?.architecture || 'Architecture', icon: Network, badge: 'Stage 4' };
    }
    if (location.pathname.endsWith('/process')) {
      return { label: t.nav?.process || 'Process Designer', icon: GitFork, badge: 'Stage 5' };
    }
    if (location.pathname.endsWith('/ux')) {
      return { label: t.nav?.ux || 'UX Designer', icon: LayoutTemplate, badge: 'Stage 6' };
    }
    if (location.pathname.endsWith('/database')) {
      return { label: t.nav?.database || 'Database & APIs', icon: Database, badge: 'Stage 7' };
    }
    if (location.pathname.endsWith('/planning')) {
      return { label: t.nav?.planning || 'Planning', icon: CalendarDays, badge: 'Stage 8' };
    }
    if (location.pathname.endsWith('/collaboration')) {
      return { label: t.nav?.collaboration || 'Collaboration', icon: Users, badge: 'Team' };
    }
    if (location.pathname.endsWith('/exports')) {
      return { label: t.nav?.exports || 'Reports & Exports', icon: Share2, badge: 'Reports' };
    }
    if (isWorkspaceRoute) {
      return { label: t.nav?.overview || 'Overview', icon: Compass, badge: 'Overview' };
    }
    return { label: 'RootForge', icon: Compass, badge: 'Platform' };
  };

  const currentSection = getCurrentSectionInfo();
  const SectionIcon = currentSection.icon;

  const currentWsDisplayName = currentWorkspace
    ? (currentWorkspace.isDemo && lang === 'hi'
        ? 'ग्राहक सहायता रूपांतरण'
        : currentWorkspace.isDemo && lang === 'gu'
        ? 'ગ્રાહક સહાયતા રૂપાંતરણ'
        : currentWorkspace.name)
    : (t.nav?.selectWorkspace || 'Select Workspace');

  return (
    <>
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="mobile-offline-banner">
          <WifiOff size={15} />
          <span>You are currently offline. Showing cached workspace state.</span>
          <button
            type="button"
            className="mobile-offline-retry"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Structured 3-Line Mobile Header */}
      <header className="mobile-header">
        {/* LINE 1: RootForge Brand + Hamburger Menu Button */}
        <div className="mobile-header-row mobile-header-row-1">
          <button
            type="button"
            className="mobile-logo-btn"
            onClick={() => navigate('/app/workspaces')}
            aria-label="RootForge Home"
          >
            <RootForgeLogo
              size="xs"
              variant={theme === 'dark' ? 'light' : 'dark'}
              showSubtitle={false}
            />
          </button>

          <div className="mobile-header-row-1-right">
            {/* Quick AI Consultant trigger */}
            <button
              type="button"
              className="mobile-header-ai-btn"
              onClick={onOpenAiDrawer}
              title="Open AI Consultant"
              aria-label="Open AI Consultant"
            >
              <Sparkles size={16} />
              <span className="mobile-ai-pulse-dot" />
            </button>

            {/* Hamburger Button (Minimum 44px × 44px target) */}
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setNavDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={navDrawerOpen}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* LINE 2: Workspace Selector + Language + Theme Controls */}
        <div className="mobile-header-row mobile-header-row-2">
          {/* Select Workspace Button */}
          <button
            type="button"
            className="mobile-ws-selector-btn"
            onClick={() => setWsSheetOpen(true)}
            aria-label="Select workspace"
          >
            <Building2 size={14} className="mobile-ws-icon" />
            <span className="mobile-ws-name" title={currentWsDisplayName}>
              {currentWsDisplayName}
            </span>
            {currentWorkspace?.isDemo && (
              <span className="badge badge-amber mobile-ws-demo-badge">DEMO</span>
            )}
            <ChevronDown size={13} className="mobile-ws-chevron" />
          </button>

          {/* Right Controls: Language & Theme */}
          <div className="mobile-header-controls-group">
            {/* Language Selector */}
            <div className="mobile-lang-select-wrapper">
              <Globe size={13} aria-hidden="true" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label="Select language"
                className="mobile-lang-select"
              >
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="gu">GU</option>
              </select>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              className="mobile-theme-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* LINE 3: Current Section / Page Bar */}
        <div className="mobile-header-row mobile-header-row-3">
          <div className="mobile-current-section">
            <SectionIcon size={14} className="mobile-section-icon" />
            <span className="mobile-section-label">{currentSection.label}</span>
          </div>
          <div className="mobile-section-meta">
            <span className="mobile-section-badge">{currentSection.badge}</span>
          </div>
        </div>
      </header>

      {/* Hamburger Navigation Drawer Modal */}
      {navDrawerOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setNavDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          <aside
            className="mobile-nav-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="mobile-nav-drawer-header">
              <div className="mobile-nav-drawer-brand">
                <RootForgeLogo
                  size="xs"
                  variant={theme === 'dark' ? 'light' : 'dark'}
                  showSubtitle={false}
                />
                <span className="mobile-nav-drawer-title">Navigation</span>
              </div>
              <button
                type="button"
                className="mobile-nav-drawer-close"
                onClick={() => setNavDrawerOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body with Vertical Scroll */}
            <div className="mobile-nav-drawer-body">
              {/* Workspace Card inside Drawer */}
              <div className="mobile-nav-ws-card">
                <div className="mobile-nav-ws-header">
                  <span className="mobile-nav-ws-label">{t.nav?.activeWorkspace || 'ACTIVE WORKSPACE'}</span>
                  <button
                    type="button"
                    className="mobile-nav-ws-switch-link"
                    onClick={() => {
                      setNavDrawerOpen(false);
                      setWsSheetOpen(true);
                    }}
                  >
                    Switch Workspace ▼
                  </button>
                </div>
                <div className="mobile-nav-ws-info">
                  <Building2 size={16} color="var(--accent-amber)" />
                  <div className="mobile-nav-ws-details">
                    <div className="mobile-nav-ws-title">
                      {currentWsDisplayName}
                    </div>
                    <div className="mobile-nav-ws-sub">
                      {currentWorkspace?.industry || 'Enterprise'} • {currentWorkspace?.status || 'ACTIVE'}
                    </div>
                  </div>
                  {currentWorkspace?.isDemo && (
                    <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>DEMO</span>
                  )}
                </div>
              </div>

              {/* Complete Workspace Navigation Options */}
              <div className="mobile-nav-section-title">
                {t.nav?.solutionLifecycle || 'SOLUTION LIFECYCLE'}
              </div>
              <div className="mobile-nav-items-list" role="menu">
                {stageItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.key === 'overview'
                      ? location.pathname === `/app/workspaces/${activeWsId}`
                      : location.pathname.startsWith(item.path);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="menuitem"
                      className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setNavDrawerOpen(false);
                        navigate(item.path);
                      }}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className="mobile-nav-item-left">
                        <Icon size={18} className="mobile-nav-item-icon" />
                        <span className="mobile-nav-item-label">{item.label}</span>
                      </div>
                      <div className="mobile-nav-item-right">
                        {isActive ? (
                          <span className="mobile-nav-active-pill">
                            <Check size={13} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="mobile-nav-stage-number">{item.stageNumber}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Platform & System Links */}
              <div className="mobile-nav-section-title">
                PLATFORM & SERVICES
              </div>
              <div className="mobile-nav-items-list" role="menu">
                {/* AI Business Consultant Drawer Trigger */}
                <button
                  type="button"
                  role="menuitem"
                  className="mobile-nav-item mobile-nav-item-ai"
                  onClick={() => {
                    setNavDrawerOpen(false);
                    onOpenAiDrawer();
                  }}
                >
                  <div className="mobile-nav-item-left">
                    <Sparkles size={18} color="#D97706" />
                    <span className="mobile-nav-item-label">{t.nav?.aiConsultant || 'AI Business Consultant'}</span>
                  </div>
                  <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>AI COPILOT</span>
                </button>

                {/* Document Library Trigger */}
                <button
                  type="button"
                  role="menuitem"
                  className="mobile-nav-item"
                  onClick={() => {
                    setNavDrawerOpen(false);
                    setDocsSheetOpen(true);
                  }}
                >
                  <div className="mobile-nav-item-left">
                    <FileText size={18} />
                    <span className="mobile-nav-item-label">Document Library</span>
                  </div>
                  <span className="mobile-nav-stage-number">{docs.length || ''}</span>
                </button>

                {/* Workspace Directory */}
                <button
                  type="button"
                  role="menuitem"
                  className={`mobile-nav-item ${location.pathname === '/app/workspaces' ? 'active' : ''}`}
                  onClick={() => {
                    setNavDrawerOpen(false);
                    navigate('/app/workspaces');
                  }}
                >
                  <div className="mobile-nav-item-left">
                    <Building2 size={18} />
                    <span className="mobile-nav-item-label">All Workspaces</span>
                  </div>
                  {location.pathname === '/app/workspaces' && (
                    <span className="mobile-nav-active-pill">
                      <Check size={13} />
                    </span>
                  )}
                </button>

                {/* Settings */}
                <button
                  type="button"
                  role="menuitem"
                  className={`mobile-nav-item ${location.pathname.includes('/settings') ? 'active' : ''}`}
                  onClick={() => {
                    setNavDrawerOpen(false);
                    navigate('/app/settings');
                  }}
                >
                  <div className="mobile-nav-item-left">
                    <Settings size={18} />
                    <span className="mobile-nav-item-label">{t.nav?.settings || 'Settings'}</span>
                  </div>
                  {location.pathname.includes('/settings') && (
                    <span className="mobile-nav-active-pill">
                      <Check size={13} />
                    </span>
                  )}
                </button>

                {/* Dedicated Admin Console (Admins only) */}
                {user?.role === 'ADMIN' && (
                  <button
                    type="button"
                    role="menuitem"
                    className={`mobile-nav-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                    onClick={() => {
                      setNavDrawerOpen(false);
                      navigate('/admin');
                    }}
                  >
                    <div className="mobile-nav-item-left">
                      <Shield size={18} color="var(--accent-amber)" />
                      <span className="mobile-nav-item-label">{t.nav?.admin || 'Admin Console'}</span>
                    </div>
                    {location.pathname.startsWith('/admin') && (
                      <span className="mobile-nav-active-pill">
                        <Check size={13} />
                      </span>
                    )}
                  </button>
                )}

                {/* Log Out Option */}
                <div className="mobile-nav-divider" />
                <button
                  type="button"
                  role="menuitem"
                  className="mobile-nav-item mobile-nav-item-logout"
                  onClick={() => {
                    setNavDrawerOpen(false);
                    setShowLogoutModal(true);
                  }}
                >
                  <div className="mobile-nav-item-left">
                    <LogOut size={18} className="mobile-nav-item-icon" />
                    <span className="mobile-nav-item-label">{t.nav?.logout || 'Log out'}</span>
                  </div>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Primary Bottom Navigation Bar (5 destinations - AI Copilot centered) */}
      <nav className="mobile-bottom-nav">
        {/* 1. Home / Current Workspace */}
        <button
          type="button"
          className={`mobile-bottom-item ${location.pathname === '/app/workspaces' || location.pathname === `/app/workspaces/${activeWsId}` ? 'active' : ''}`}
          onClick={() => navigate(activeWsId ? `/app/workspaces/${activeWsId}` : '/app/workspaces')}
          aria-label="Home"
        >
          <Home size={18} />
          <span>Home</span>
        </button>

        {/* 2. Workspaces */}
        <button
          type="button"
          className={`mobile-bottom-item ${location.pathname === '/app/workspaces' ? 'active' : ''}`}
          onClick={() => setWsSheetOpen(true)}
          aria-label="Workspaces"
        >
          <Building2 size={18} />
          <span>Workspaces</span>
        </button>

        {/* 3. AI Companion (Special Prominent Button - Exactly Centered) */}
        <button
          type="button"
          className="mobile-bottom-item mobile-ai-companion-tab"
          onClick={onOpenAiDrawer}
          aria-label="Open AI Companion"
        >
          <div className="mobile-ai-fab-icon">
            <Sparkles size={18} />
          </div>
          <span className="mobile-ai-text">AI Copilot</span>
        </button>

        {/* 4. Documents */}
        <button
          type="button"
          className={`mobile-bottom-item ${docsSheetOpen ? 'active' : ''}`}
          onClick={() => setDocsSheetOpen(true)}
          aria-label="Documents"
        >
          <FileText size={18} />
          <span>Documents</span>
        </button>

        {/* 5. Settings */}
        <button
          type="button"
          className={`mobile-bottom-item ${location.pathname.includes('/settings') ? 'active' : ''}`}
          onClick={() => navigate('/app/settings')}
          aria-label="Settings"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Workspace Switcher Bottom Sheet */}
      {wsSheetOpen && (
        <div className="mobile-sheet-backdrop" onClick={() => setWsSheetOpen(false)}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-header">
              <div>
                <h3 className="mobile-sheet-title">Workspaces</h3>
                <p className="mobile-sheet-desc">Switch or create an initiative workspace</p>
              </div>
              <button
                type="button"
                className="mobile-sheet-close"
                onClick={() => setWsSheetOpen(false)}
                aria-label="Close workspace switcher"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-sheet-list">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  className={`mobile-ws-item ${currentWorkspace?.id === ws.id ? 'active' : ''}`}
                  onClick={() => {
                    selectWorkspace(ws.id);
                    setWsSheetOpen(false);
                    navigate(`/app/workspaces/${ws.id}`);
                  }}
                >
                  <div className="mobile-ws-item-info">
                    <span className="mobile-ws-item-title">
                      {ws.isDemo && lang === 'hi'
                        ? 'ग्राहक सहायता रूपांतरण'
                        : ws.isDemo && lang === 'gu'
                        ? 'ગ્રાહક સહાયતા રૂપાંતરણ'
                        : ws.name}
                    </span>
                    <span className="mobile-ws-item-sub">
                      {ws.organizationName || 'Enterprise'} • {ws.industry}
                    </span>
                  </div>
                  {ws.isDemo && (
                    <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                      DEMO
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mobile-sheet-footer">
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
                onClick={() => {
                  setWsSheetOpen(false);
                  navigate('/app/workspaces');
                  window.dispatchEvent(new CustomEvent('rootforge:open-create-ws-modal'));
                }}
              >
                <Plus size={16} /> Create Transformation Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Documents Sheet */}
      {docsSheetOpen && (
        <div className="mobile-sheet-backdrop" onClick={() => setDocsSheetOpen(false)}>
          <div className="mobile-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-header">
              <div>
                <h3 className="mobile-sheet-title">Document Library</h3>
                <p className="mobile-sheet-desc">
                  {currentWorkspace?.name || 'Workspace Documents'}
                </p>
              </div>
              <button
                type="button"
                className="mobile-sheet-close"
                onClick={() => setDocsSheetOpen(false)}
                aria-label="Close document library"
              >
                <X size={18} />
              </button>
            </div>

            {/* Native Document Upload Trigger */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <label
                className="btn btn-primary btn-sm"
                style={{
                  width: '100%',
                  cursor: uploading ? 'wait' : 'pointer',
                  justifyContent: 'center',
                  padding: '10px 14px',
                  minHeight: 44
                }}
              >
                <Upload size={16} />
                <span>{uploading ? 'Processing File...' : 'Upload Document (PDF, DOCX, PPTX)'}</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
                  style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={handleNativeFileUpload}
                />
              </label>
            </div>

            <div className="mobile-sheet-list">
              {docs.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.85rem' }}>No documents uploaded yet.</p>
                  <p style={{ fontSize: '0.75rem', marginTop: 4 }}>
                    Upload business specs, process maps, or RFP documents to fuel AI discovery.
                  </p>
                </div>
              ) : (
                docs.map((doc) => (
                  <div key={doc.id} className="mobile-doc-item">
                    <div className="mobile-doc-info">
                      <FileText size={16} color="var(--accent-amber)" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="mobile-doc-name">{doc.originalName || doc.filename}</div>
                        <div className="mobile-doc-meta">
                          <span>{(doc.fileSize / 1024).toFixed(1)} KB</span> •{' '}
                          <span
                            style={{
                              color:
                                doc.status === 'ANALYZED'
                                  ? 'var(--accent-green)'
                                  : doc.status === 'FAILED'
                                  ? 'var(--accent-red)'
                                  : 'var(--accent-amber)'
                            }}
                          >
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 200 }}
          onClick={() => setShowLogoutModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          aria-describedby="logout-dialog-desc"
        >
          <div
            className="modal-card"
            style={{
              maxWidth: 380,
              width: '90%',
              padding: '24px 20px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg, 12px)',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'var(--accent-red-light, rgba(239, 68, 68, 0.14))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <LogOut size={22} color="var(--accent-red, #EF4444)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <h4
                  id="logout-dialog-title"
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  {t.auth?.logoutConfirmTitle || 'Log out?'}
                </h4>
                <p
                  id="logout-dialog-desc"
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.4
                  }}
                >
                  {t.auth?.logoutConfirmDesc || 'Are you sure you want to log out of your account?'}
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 20
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowLogoutModal(false)}
              >
                {t.common?.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                style={{ fontWeight: 700 }}
                onClick={handleConfirmLogout}
              >
                {t.nav?.logout || 'Log out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

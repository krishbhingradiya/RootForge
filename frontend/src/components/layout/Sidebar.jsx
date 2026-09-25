import React from 'react';
import { NavLink, useParams, Link, useLocation } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { RootForgeLogo } from '../common/RootForgeLogo';
import {
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
  Settings,
  Shield,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const SECTION_MESSAGES = {
  overview: 'Loading workspace overview...',
  discovery: 'Understanding your business...',
  analysis: 'Analyzing your requirements...',
  solution: 'Designing your solution...',
  architecture: 'Designing the system architecture...',
  process: 'Mapping your business process...',
  ux: 'Preparing your experience...',
  database: 'Structuring your data and APIs...',
  planning: 'Calculating your implementation effort...',
  collaboration: 'Connecting your team...',
  exports: 'Preparing your deliverables...'
};

export const Sidebar = () => {
  const { workspaces, currentWorkspace, stages } = useWorkspace();
  const { t, lang } = useLanguage();
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const wsId = currentWorkspace?.id || workspaces?.[0]?.id || 'ws-demo-customer-support';

  const handleNavClick = (key, path) => {
    // Only trigger animation when navigating to a different top-level module (excluding discovery, architecture, process)
    if (location.pathname !== path && key !== 'discovery' && key !== 'architecture' && key !== 'process') {
      const msg = SECTION_MESSAGES[key] || `Loading ${key}...`;
      window.dispatchEvent(new CustomEvent('rootforge:loading', {
        detail: { active: true, message: msg, key: 'module_transition' }
      }));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('rootforge:loading', {
          detail: { active: false, key: 'module_transition' }
        }));
      }, 450);
    }
  };

  const navItems = [
    { key: 'overview', path: `/app/workspaces/${wsId}`, label: t.nav.overview, icon: Compass, exact: true },
    { key: 'discovery', path: `/app/workspaces/${wsId}/discovery`, label: t.nav.discovery, icon: MessagesSquare },
    { key: 'analysis', path: `/app/workspaces/${wsId}/analysis`, label: t.nav.analysis, icon: FileSearch },
    { key: 'solution', path: `/app/workspaces/${wsId}/solution`, label: t.nav.solution, icon: Cpu },
    { key: 'architecture', path: `/app/workspaces/${wsId}/architecture`, label: t.nav.architecture, icon: Network },
    { key: 'process', path: `/app/workspaces/${wsId}/process`, label: t.nav.process, icon: GitFork },
    { key: 'ux', path: `/app/workspaces/${wsId}/ux`, label: t.nav.ux, icon: LayoutTemplate },
    { key: 'database', path: `/app/workspaces/${wsId}/database`, label: t.nav.database, icon: Database },
    { key: 'planning', path: `/app/workspaces/${wsId}/planning`, label: t.nav.planning, icon: CalendarDays },
    { key: 'collaboration', path: `/app/workspaces/${wsId}/collaboration`, label: t.nav.collaboration, icon: Users },
    { key: 'exports', path: `/app/workspaces/${wsId}/exports`, label: t.nav.exports, icon: Share2 }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <RootForgeLogo size="sm" variant="light" subtitle="ENTERPRISE PLATFORM" />
        </Link>
      </div>

      {/* Current Workspace Pill */}
      {currentWorkspace && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            {t.nav.activeWorkspace || 'Active Workspace'}
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#FAF8F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentWorkspace.isDemo && lang === 'hi' ? 'ग्राहक सहायता रूपांतरण' : currentWorkspace.isDemo && lang === 'gu' ? 'ગ્રાહક સહાયતા રૂપાંતરણ' : currentWorkspace.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>
              {currentWorkspace.status || 'ACTIVE'}
            </span>
            {currentWorkspace.isDemo && (
              <span className="badge badge-amber" style={{ fontSize: '0.6rem' }}>{t.common.demo}</span>
            )}
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 12px' }}>
          {t.nav.solutionLifecycle || 'Solution Lifecycle'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const stageStatus = stages ? stages[item.key]?.status : null;
          const isDone = stageStatus === 'COMPLETED' || stageStatus === 'APPROVED';

          return (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.exact}
              onClick={() => handleNavClick(item.key, item.path)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#FAF8F5' : '#94A3B8',
                backgroundColor: isActive ? 'rgba(217, 119, 6, 0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #D97706' : '3px solid transparent',
                marginBottom: 2,
                transition: 'all 0.15s ease'
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} color="#CBD5E1" />
                <span>{item.label}</span>
              </div>
              {isDone ? (
                <CheckCircle2 size={14} color="#10B981" />
              ) : (
                <ChevronRight size={13} color="rgba(255,255,255,0.2)" />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Footer Section */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isAdmin && (
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: '0.85rem',
              color: isActive ? '#FAF8F5' : '#94A3B8',
              backgroundColor: isActive ? 'rgba(217, 119, 6, 0.15)' : 'transparent'
            })}
          >
            <Shield size={16} color="#D97706" />
            <span>{t.nav.admin}</span>
          </NavLink>
        )}

        <NavLink
          to="/app/settings"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: '0.85rem',
            color: isActive ? '#FAF8F5' : '#94A3B8',
            backgroundColor: isActive ? 'rgba(217, 119, 6, 0.15)' : 'transparent'
          })}
        >
          <Settings size={16} color="#94A3B8" />
          <span>{t.nav.settings}</span>
        </NavLink>
      </div>
    </aside>
  );
};

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Sparkles,
  ChevronDown,
  Plus,
  Globe,
  LogOut,
  Building2,
  Shield,
  Layers,
  Search,
  Sun,
  Moon
} from 'lucide-react';

export const Navbar = ({ onOpenAiDrawer }) => {
  const { user, logout, isAdmin } = useAuth();
  const { workspaces, currentWorkspace } = useWorkspace();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Workspace Switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}
          >
            <Building2 size={16} color="var(--accent-amber)" />
            <span style={{ fontWeight: 700, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentWorkspace ? (currentWorkspace.isDemo && lang === 'hi' ? 'ग्राहक सहायता रूपांतरण' : currentWorkspace.isDemo && lang === 'gu' ? 'ગ્રાહક સહાયતા રૂપાંતરણ' : currentWorkspace.name) : t.nav.selectWorkspace}
            </span>
            {currentWorkspace?.isDemo && (
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>{t.common.demo}</span>
            )}
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {wsDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                width: 280,
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-xl)',
                padding: 6,
                zIndex: 50
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {t.common.workspaces.toUpperCase()} ({workspaces.length})
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setWsDropdownOpen(false);
                      navigate(`/app/workspaces/${ws.id}`);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      backgroundColor: currentWorkspace?.id === ws.id ? 'var(--bg-subtle)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ws.isDemo && lang === 'hi' ? 'ग्राहक सहायता रूपांतरण' : ws.isDemo && lang === 'gu' ? 'ગ્રાહક સહાયતા રૂપાંતરણ' : ws.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ws.industry}</div>
                    </div>
                    {ws.isDemo && <span className="badge badge-amber" style={{ fontSize: '0.6rem' }}>{t.common.demo}</span>}
                  </button>
                ))}
              </div>
              <div style={{ padding: 6, borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => {
                    setWsDropdownOpen(false);
                    navigate('/app/workspaces?action=create');
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Plus size={14} />
                  {t.common.createWorkspace}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* AI Business Consultant quick launcher button */}
        <button
          onClick={onOpenAiDrawer}
          className="btn btn-dark btn-sm"
          style={{
            backgroundColor: '#1E232D',
            border: '1px solid #D97706',
            color: '#FAF8F5'
          }}
          title="Open AI Business Consultant Drawer"
        >
          <Sparkles size={15} color="#D97706" />
          <span>{t.nav.aiConsultant}</span>
        </button>

        {/* Language selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', minHeight: 36, boxSizing: 'border-box' }}>
          <Globe size={14} color="var(--text-muted)" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language Selector"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="gu">ગુજરાતી</option>
          </select>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={(e) => toggleTheme(e)}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 'var(--radius-md)',
            minHeight: 36,
            boxSizing: 'border-box'
          }}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} color="#F59E0B" />
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{lang === 'hi' ? 'लाइट' : lang === 'gu' ? 'લાઇટ' : 'Light'}</span>
            </>
          ) : (
            <>
              <Moon size={15} color="#64748B" />
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{lang === 'hi' ? 'डार्क' : lang === 'gu' ? 'ડાર્ક' : 'Dark'}</span>
            </>
          )}
        </button>

        {/* User profile dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-amber)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.name?.split(' ')[0] || 'User'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber-text)', fontWeight: 700 }}>
                {isAdmin ? 'ADMIN' : (user?.role === 'ADMIN' ? 'CONSULTANT' : (user?.role || 'CONSULTANT'))}
              </span>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {userMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: 220,
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-xl)',
                padding: 6,
                zIndex: 50
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setUserMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <Shield size={15} color="var(--accent-amber)" />
                  {t.nav.admin}
                </Link>
              )}

              <Link
                to="/app/settings"
                onClick={() => setUserMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <Layers size={15} color="var(--text-muted)" />
                {t.nav.settings}
              </Link>

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  color: 'var(--accent-red)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <LogOut size={15} color="var(--accent-red)" />
                {t.common.signOut}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

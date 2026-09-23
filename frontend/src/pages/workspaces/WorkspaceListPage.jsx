import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import {
  Building2,
  Plus,
  Sparkles,
  ArrowRight,
  FolderKanban,
  FileText,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  X
} from 'lucide-react';

export const WorkspaceListPage = () => {
  const { workspaces, fetchWorkspaces } = useWorkspace();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    organizationName: '',
    name: '',
    industry: 'Retail & Commerce',
    objective: '',
    challenge: '',
    targetUsers: '',
    expectedOutcome: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      setModalOpen(true);
    }

    const handleOpen = () => setModalOpen(true);
    const handleClose = () => setModalOpen(false);
    window.addEventListener('rootforge:open-create-ws-modal', handleOpen);
    window.addEventListener('rootforge:close-modal', handleClose);
    return () => {
      window.removeEventListener('rootforge:open-create-ws-modal', handleOpen);
      window.removeEventListener('rootforge:close-modal', handleClose);
    };
  }, [location]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await api.createWorkspace(formData);
      showToast('Workspace created successfully!');
      await fetchWorkspaces();
      setModalOpen(false);
      navigate(`/app/workspaces/${res.workspace.id}`);
    } catch (err) {
      showToast(err.message || 'Failed to create workspace', 'error');
    } finally {
      setCreating(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.industry.toLowerCase().includes(search.toLowerCase()) ||
      w.objective.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16191F' }}>
            {t.workspaceList?.title || 'Transformation Workspaces'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: 4 }}>
            {t.workspaceList?.desc || 'Manage strategic initiative pipelines, documents, architectures, and implementation designs.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/app/workspaces/ws-demo-customer-support')}
            className="btn btn-secondary"
            style={{ backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#F59E0B' }}
          >
            <Sparkles size={16} color="#D97706" />
            {t.workspaceList?.openDemo || 'Open Demo Workspace'}
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            {t.workspaceList?.createWorkspace || 'Create Workspace'}
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 24,
          backgroundColor: '#FFFFFF',
          padding: '10px 16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder={t.workspaceList?.searchPlaceholder || "Filter workspaces by project name, industry, or objective..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: '0.9rem',
            color: 'var(--text-primary)'
          }}
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {filteredWorkspaces.length} {t.workspaceList?.workspacesCount || 'WORKSPACES'}
        </span>
      </div>

      {/* Workspaces Grid */}
      <div className="grid-cards-auto" style={{ gap: 20 }}>
        {filteredWorkspaces.map((ws) => {
          const isDemoWs = ws.isDemo || ws.id === 'ws-demo-customer-support';
          const displayWsName = isDemoWs && (lang === 'hi' || lang === 'gu') ? (t.overview?.customerSupportTitle || ws.name) : ws.name;
          const displayWsDesc = isDemoWs && (lang === 'hi' || lang === 'gu') ? (t.overview?.customerSupportDesc || ws.objective) : ws.objective;

          return (
            <div
              key={ws.id}
              onClick={() => navigate(`/app/workspaces/${ws.id}`)}
              className="card"
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                    {isDemoWs && (lang === 'hi' || lang === 'gu') ? t.overview?.industry : ws.industry}
                  </span>
                  {isDemoWs && (
                    <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                      {t.workspaceList?.demoBadge || 'DEMO WORKSPACE'}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {displayWsName}
                </h3>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building2 size={13} />
                  <span>{ws.organization?.name || 'Enterprise'}</span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 16 }}>
                  {displayWsDesc}
                </p>
              </div>

            <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span title="Documents Attached">📄 {ws._count?.documents || 0} {t.workspaceList?.docsCount || 'Docs'}</span>
                <span title="Stage Status">⚡ {ws.status === 'ACTIVE' || ws.status === 'DISCOVERY' ? (t.common[ws.status.toLowerCase()] || ws.status) : ws.status}</span>
              </div>

              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                {t.workspaceList?.openWorkspace || 'Open Workspace'} <ArrowRight size={14} />
              </span>
            </div>
          </div>
        );
      })}
      </div>

      {/* Create Workspace Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 'clamp(1.05rem, 3.5vw, 1.25rem)', fontWeight: 800 }}>{t.workspaceList?.createModalTitle || 'Create Transformation Workspace'}</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {t.workspaceList?.createModalSubtitle || 'Set up a new initiative context for the RootForge Solution Builder pipeline.'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: 'clamp(14px, 3.5vw, 24px)', overflowY: 'auto', flex: 1 }}>
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">{t.workspaceList?.orgNameLabel || 'Organization Name'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Retail Global"
                    className="form-input"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    style={{ minHeight: 44, fontSize: '0.92rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t.workspaceList?.industryLabel || 'Industry Sector'}</label>
                  <select
                    className="form-select"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    style={{ minHeight: 44, fontSize: '0.92rem' }}
                  >
                    <option value="Retail & Commerce">{t.workspaceList?.sectors?.retail || 'Retail & Commerce'}</option>
                    <option value="Financial Services & Banking">{t.workspaceList?.sectors?.finance || 'Financial Services & Banking'}</option>
                    <option value="Supply Chain & Logistics">{t.workspaceList?.sectors?.supply || 'Supply Chain & Logistics'}</option>
                    <option value="Healthcare & Life Sciences">{t.workspaceList?.sectors?.healthcare || 'Healthcare & Life Sciences'}</option>
                    <option value="Manufacturing & Industrial">{t.workspaceList?.sectors?.manufacturing || 'Manufacturing & Industrial'}</option>
                    <option value="Technology & SaaS">{t.workspaceList?.sectors?.tech || 'Technology & SaaS'}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t.workspaceList?.wsNameLabel || 'Project / Initiative Name'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer Support Operations Transformation"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ minHeight: 44, fontSize: '0.92rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.workspaceList?.objectiveLabel || 'Business Objective'}</label>
                <textarea
                  required
                  rows={2}
                  placeholder="What is the strategic goal? (e.g. Reduce manual ticket triage time and improve first-touch resolution by 60%)"
                  className="form-textarea"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  style={{ fontSize: '0.92rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t.workspaceList?.challengeLabel || 'Business Challenge & Bottlenecks'}</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the operational friction: (e.g. Customer requests arrive through multiple channels and agents manually classify, assign and resolve requests. Management has limited real-time visibility.)"
                  className="form-textarea"
                  value={formData.challenge}
                  onChange={(e) => setFormData({ ...formData, challenge: e.target.value })}
                  style={{ fontSize: '0.92rem' }}
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">{t.workspaceList?.targetUsersLabel || 'Target Users'}</label>
                  <input
                    type="text"
                    placeholder="e.g. Frontline Agents, Supervisors, Shoppers"
                    className="form-input"
                    value={formData.targetUsers}
                    onChange={(e) => setFormData({ ...formData, targetUsers: e.target.value })}
                    style={{ minHeight: 44, fontSize: '0.92rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t.workspaceList?.outcomeLabel || 'Expected Business Outcome'}</label>
                  <input
                    type="text"
                    placeholder="e.g. 65% straight-through processing, sub-hour SLA"
                    className="form-input"
                    value={formData.expectedOutcome}
                    onChange={(e) => setFormData({ ...formData, expectedOutcome: e.target.value })}
                    style={{ minHeight: 44, fontSize: '0.92rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ minHeight: 44, padding: '8px 18px' }}
                >
                  {t.workspaceList?.cancelBtn || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn btn-primary"
                  style={{ minHeight: 44, padding: '8px 20px', fontWeight: 700 }}
                >
                  {creating ? (t.workspaceList?.creatingBtn || 'Creating Workspace...') : (t.workspaceList?.createBtn || 'Create & Begin Discovery')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

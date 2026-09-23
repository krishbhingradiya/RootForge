import React from 'react';
import {
  Sparkles,
  Clock,
  Save,
  Download,
  CheckCircle2,
  ArrowRight,
  Eye,
  Layers,
  Code2,
  Terminal,
  Monitor,
  Tablet,
  Smartphone
} from 'lucide-react';

export const UxPageHeader = ({
  ux,
  deviceView,
  setDeviceView,
  renderMode,
  setRenderMode,
  onSaveVersion,
  onOpenVersions,
  onOpenExport,
  onOpenApproval,
  onProceedToDatabase,
  saving,
  approving
}) => {
  const versionNum = ux?.version || 1;
  const status = ux?.status || 'DRAFT';
  const isApproved = status === 'APPROVED';

  return (
    <div className="ux-header-card">
      {/* Top Section: Title & Actions */}
      <div className="ux-header-top">
        <div className="ux-header-titles">
          <div className="ux-stage-badge-row">
            <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={12} /> Stage 6 · UX & Design System
            </span>
            <span className="badge badge-gray">Version {versionNum}</span>
            <span className={`badge ${isApproved ? 'badge-green' : 'badge-amber'}`}>
              {status}
            </span>
          </div>

          <h1 className="ux-page-title">
            UX Architecture & Wireframe Prototypes
          </h1>
          <p className="ux-page-subtitle">
            AI-generated multi-screen UX design, interactive prototypes, user journey mapping and requirement traceability.
          </p>
        </div>

        <div className="ux-header-actions">
          <button
            type="button"
            onClick={onOpenVersions}
            className="btn btn-secondary btn-sm"
            title="View Snapshot History"
          >
            <Clock size={14} /> History (v{versionNum})
          </button>

          <button
            type="button"
            onClick={onSaveVersion}
            disabled={saving}
            className="btn btn-secondary btn-sm"
            title="Save Snapshot"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save Snapshot'}
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="btn btn-secondary btn-sm"
            title="Export UX Specifications"
          >
            <Download size={14} /> Export
          </button>

          <button
            type="button"
            onClick={onOpenApproval}
            disabled={approving || isApproved}
            className={`btn btn-sm ${isApproved ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontWeight: 700 }}
          >
            <CheckCircle2 size={14} />
            {isApproved ? 'Approved' : approving ? 'Approving...' : 'Approve UX'}
          </button>

          <button
            type="button"
            onClick={onProceedToDatabase}
            className="btn btn-dark btn-sm"
            style={{ fontWeight: 700 }}
          >
            Next: Database <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Toolbar: Preview Mode & Viewport Segmented Controls */}
      <div className="ux-header-toolbar">
        {/* Render Modes Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Render Mode:
          </span>
          <div className="ux-segmented-control">
            <button
              type="button"
              onClick={() => setRenderMode('hifi')}
              className={`ux-seg-btn ${renderMode === 'hifi' ? 'active primary-accent' : ''}`}
            >
              <Eye size={13} /> Live UI
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('wireframe')}
              className={`ux-seg-btn ${renderMode === 'wireframe' ? 'active' : ''}`}
            >
              <Layers size={13} /> Wireframe
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('blueprint')}
              className={`ux-seg-btn ${renderMode === 'blueprint' ? 'active' : ''}`}
            >
              <Code2 size={13} /> Blueprint
            </button>
            <button
              type="button"
              onClick={() => setRenderMode('prototype')}
              className={`ux-seg-btn ${renderMode === 'prototype' ? 'active primary-accent' : ''}`}
            >
              <Terminal size={13} /> Interactive Prototype
            </button>
          </div>
        </div>

        {/* Viewport Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Viewport:
          </span>
          <div className="ux-segmented-control">
            <button
              type="button"
              onClick={() => setDeviceView('desktop')}
              className={`ux-seg-btn ${deviceView === 'desktop' ? 'active' : ''}`}
              title="Desktop View (1200px)"
            >
              <Monitor size={14} /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setDeviceView('tablet')}
              className={`ux-seg-btn ${deviceView === 'tablet' ? 'active' : ''}`}
              title="Tablet View (768px)"
            >
              <Tablet size={14} /> Tablet
            </button>
            <button
              type="button"
              onClick={() => setDeviceView('mobile')}
              className={`ux-seg-btn ${deviceView === 'mobile' ? 'active' : ''}`}
              title="Mobile View (390px)"
            >
              <Smartphone size={14} /> Mobile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

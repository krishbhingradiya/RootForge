import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Edit2,
  Download,
  RefreshCw,
  Server,
  Database,
  User,
  Radio,
  Plus
} from 'lucide-react';

export const DataFlowDiagramView = ({
  dataFlows = [],
  onEditStep,
  onAddStep,
  onRegenerate,
  onExportFlow
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.15, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  const handleExport = () => {
    const jsonStr = JSON.stringify(dataFlows, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_flow_sequence_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          backgroundColor: 'var(--db-surface)',
          border: '1px solid var(--db-border)',
          borderRadius: 8,
          boxShadow: 'var(--db-card-shadow)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} color="var(--accent-amber, #D97706)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              End-to-End Transactional Data Flow Sequence
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--db-text-muted)' }}>
            Chronological transactional lifecycle detailing actor dispatch, API ingress, service mediation, database persistence, and external event webhooks.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', padding: 2, borderRadius: 6 }}>
            <button
              type="button"
              onClick={handleZoomIn}
              className="btn btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', padding: '0 4px', color: 'var(--db-text-muted)' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="btn btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="btn btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--db-text-secondary)' }}
              title="Fit to Screen"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRegenerate?.('dataflow')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} /> Regenerate
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}
          >
            <Download size={13} /> Export Flow
          </button>

          <button
            type="button"
            onClick={onAddStep}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700 }}
          >
            <Plus size={13} /> Add Flow Step
          </button>
        </div>
      </div>

      {/* Visual Data Flow Diagram Canvas */}
      <div
        style={{
          backgroundColor: 'var(--db-canvas-bg)',
          backgroundImage: 'radial-gradient(var(--db-canvas-grid-dot) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          border: '1px solid var(--db-border)',
          borderRadius: 8,
          padding: 24,
          overflowX: 'auto',
          minHeight: 380,
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          transition: 'transform 0.15s ease'
        }}
      >
        {/* Horizontal Pipeline Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 'fit-content', paddingBottom: 16 }}>
          {dataFlows.map((step, idx) => {
            const isActive = activeStepIndex === idx;

            return (
              <React.Fragment key={idx}>
                <div
                  onClick={() => setActiveStepIndex(idx)}
                  style={{
                    width: 270,
                    backgroundColor: isActive ? 'var(--db-surface-elevated)' : 'var(--db-surface)',
                    border: `1px solid ${isActive ? 'var(--accent-amber, #D97706)' : 'var(--db-border)'}`,
                    borderRadius: 8,
                    padding: 16,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 4px 18px rgba(217, 119, 6, 0.25)' : 'var(--db-card-shadow)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  {/* Step Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="dataflow-step-num">
                        {step.step || idx + 1}
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
                        {step.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditStep(idx, step);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer', padding: 2 }}
                      title="Edit step"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>

                  {/* Actor & Direction */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={13} color="var(--accent-amber, #D97706)" />
                    <strong>{step.actor}</strong> &bull; <span style={{ color: 'var(--db-text-muted)' }}>{step.direction}</span>
                  </div>

                  {/* Protocol / Payload */}
                  <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#2563EB', backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', padding: '5px 8px', borderRadius: 4, marginBottom: 8 }}>
                    {step.protocol}: {step.payload}
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: '0.76rem', color: 'var(--db-text-secondary)', lineHeight: 1.4 }}>
                    {step.description}
                  </div>
                </div>

                {idx < dataFlows.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <ArrowRight size={22} color="var(--accent-amber, #D97706)" />
                    <span style={{ fontSize: '0.65rem', color: 'var(--db-text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>sync</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Detail Card */}
      {dataFlows[activeStepIndex] && (
        <div className="card" style={{ padding: 18, backgroundColor: 'var(--db-surface)', border: '1px solid var(--db-border)', boxShadow: 'var(--db-card-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              Step {activeStepIndex + 1}: {dataFlows[activeStepIndex].name}
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber, #D97706)', fontWeight: 800, backgroundColor: 'rgba(217,119,6,0.1)', padding: '2px 8px', borderRadius: 4 }}>
              Protocol: {dataFlows[activeStepIndex].protocol}
            </span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: 'var(--db-text-secondary)', lineHeight: 1.5 }}>
            {dataFlows[activeStepIndex].description}
          </p>
        </div>
      )}
    </div>
  );
};

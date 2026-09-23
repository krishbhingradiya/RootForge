import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Search,
  Bot,
  RefreshCw,
  Tag,
  Upload,
  FileText,
  FileCode,
  File,
  X,
  CheckCircle2,
  Layers,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { REQUIREMENT_TEMPLATES, DESIGN_ARCHETYPES } from '../uxViewModel';

export const RequirementInputSection = ({
  requirementText,
  setRequirementText,
  selectedTheme,
  setSelectedTheme,
  onAnalyze,
  onGenerate,
  analyzing,
  generating
}) => {
  const [layoutDensity, setLayoutDensity] = useState('balanced');
  const [targetPersona, setTargetPersona] = useState('Operations Specialist');
  const [businessObjective, setBusinessObjective] = useState('');
  const [primaryWorkflow, setPrimaryWorkflow] = useState('');
  const [uxConstraints, setUxConstraints] = useState('Sub-second interactions, zero cognitive load');
  const [accessibilityReq, setAccessibilityReq] = useState('WCAG 2.1 AA Compliant, keyboard navigable');
  const [platform, setPlatform] = useState('web'); // web | mobile | tablet
  const [responsiveReq, setResponsiveReq] = useState('Adaptive multi-column desktop to mobile card stack');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Context Sources & Uploaded document chips
  const [contextSources, setContextSources] = useState([
    { id: 'ctx-1', name: 'Hospital BRD.pdf', type: 'BRD' },
    { id: 'ctx-2', name: 'Appointment SOP.docx', type: 'SOP' },
    { id: 'ctx-3', name: 'Existing Portal Specs', type: 'APP' },
    { id: 'ctx-4', name: '14 Core Requirements', type: 'REQS' }
  ]);

  const handleAddSource = (typeName, defaultName) => {
    const newId = `ctx-${Date.now()}`;
    setContextSources(prev => [...prev, { id: newId, name: defaultName, type: typeName }]);
  };

  const handleRemoveSource = (id) => {
    setContextSources(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="ux-requirement-panel">
      <div className="ux-panel-header">
        <div className="ux-panel-title-group">
          <Bot size={20} color="var(--accent-amber)" />
          <div>
            <h2 className="ux-panel-title">
              AI Requirement Input & Design Brief
            </h2>
            <p className="ux-panel-desc">
              Provide business requirements, context, documents and domain information to guide AI UX generation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
        >
          <Sliders size={13} /> {showAdvanced ? 'Hide Advanced' : 'Advanced Controls'}
        </button>
      </div>

      {/* Styled Domain Preset Chips */}
      <div className="ux-preset-row">
        <span className="ux-preset-label">Domain Presets:</span>
        {REQUIREMENT_TEMPLATES.map((tmpl, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setRequirementText(tmpl.text)}
            className={`ux-chip ${requirementText === tmpl.text ? 'active' : ''}`}
          >
            <Tag size={11} /> {tmpl.label.split(':')[0]}
          </button>
        ))}
      </div>

      {/* Requirement Textarea */}
      <div>
        <textarea
          rows={3}
          value={requirementText}
          onChange={(e) => setRequirementText(e.target.value)}
          placeholder="Describe what you want to build (e.g. 'Build a hospital appointment platform where patients can book appointments, doctors can manage availability, and staff can monitor appointment operations')..."
          className="ux-textarea"
        />
      </div>

      {/* Context Sources Section */}
      <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} color="var(--accent-amber)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Context Sources & Attached Knowledge
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <button
              type="button"
              onClick={() => handleAddSource('BRD', 'Hospital BRD v2.pdf')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              + Upload BRD
            </button>
            <button
              type="button"
              onClick={() => handleAddSource('SOP', 'Operations SOP.docx')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              + Upload SOP
            </button>
            <button
              type="button"
              onClick={() => handleAddSource('PDF', 'Architecture Spec.pdf')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              + Upload PDF
            </button>
            <button
              type="button"
              onClick={() => handleAddSource('PPT', 'Executive Review.pptx')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              + Upload PPT
            </button>
            <button
              type="button"
              onClick={() => handleAddSource('WORD', 'Requirements Draft.docx')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              + Upload Word
            </button>
            <button
              type="button"
              onClick={() => handleAddSource('PROCESS', 'Process Model Map')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              + Add Process
            </button>
            <button
              type="button"
              onClick={() => handleAddSource('EXISTING', 'Legacy Portal')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              + Existing App
            </button>
            <button
              type="button"
              onClick={() => handleAddSource('CHAT', 'AI Conversation Log')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              + AI Conversation
            </button>
          </div>
        </div>

        {/* Loaded Context Removable Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Context loaded:</span>
          {contextSources.map(ctx => (
            <span
              key={ctx.id}
              className="badge badge-green"
              style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px' }}
            >
              <CheckCircle2 size={11} /> {ctx.name}
              <button
                type="button"
                onClick={() => handleRemoveSource(ctx.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 2, color: 'inherit', display: 'flex', alignItems: 'center' }}
                title="Remove source"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Advanced Generation Options */}
      {showAdvanced && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            padding: 14,
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Target User / Persona
            </label>
            <input
              type="text"
              value={targetPersona}
              onChange={(e) => setTargetPersona(e.target.value)}
              placeholder="e.g. Clinical Intake Coordinator / Patient"
              className="ux-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Business Objective
            </label>
            <input
              type="text"
              value={businessObjective}
              onChange={(e) => setBusinessObjective(e.target.value)}
              placeholder="e.g. Reduce check-in latency under 3 mins"
              className="ux-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Primary Workflow
            </label>
            <input
              type="text"
              value={primaryWorkflow}
              onChange={(e) => setPrimaryWorkflow(e.target.value)}
              placeholder="e.g. Search doctor -> select slot -> confirm"
              className="ux-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Platform Target
            </label>
            <div className="ux-segmented-control" style={{ width: '100%', justifyContent: 'space-between' }}>
              {[
                { id: 'web', label: 'Web', icon: Monitor },
                { id: 'tablet', label: 'Tablet', icon: Tablet },
                { id: 'mobile', label: 'Mobile', icon: Smartphone }
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`ux-seg-btn ${platform === p.id ? 'active' : ''}`}
                    style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}
                  >
                    <Icon size={12} /> {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              UX Constraints
            </label>
            <input
              type="text"
              value={uxConstraints}
              onChange={(e) => setUxConstraints(e.target.value)}
              className="ux-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Accessibility Requirements
            </label>
            <input
              type="text"
              value={accessibilityReq}
              onChange={(e) => setAccessibilityReq(e.target.value)}
              className="ux-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Responsive Requirement
            </label>
            <input
              type="text"
              value={responsiveReq}
              onChange={(e) => setResponsiveReq(e.target.value)}
              className="ux-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Visual Archetype
            </label>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="ux-input"
              style={{ width: '100%', cursor: 'pointer' }}
            >
              {DESIGN_ARCHETYPES.map((arch) => (
                <option key={arch.id} value={arch.id}>
                  {arch.name} ({arch.tag})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={analyzing || !requirementText.trim()}
          className="btn btn-secondary btn-sm"
          style={{ fontWeight: 600 }}
        >
          <Search size={14} color="var(--accent-amber)" />
          {analyzing ? 'Analyzing Requirement...' : '✦ Analyze Requirement'}
        </button>

        <button
          type="button"
          onClick={() => onGenerate({
            requirement: requirementText,
            selectedTheme,
            density: layoutDensity,
            persona: targetPersona,
            objective: businessObjective,
            workflow: primaryWorkflow,
            platform,
            constraints: uxConstraints,
            accessibility: accessibilityReq,
            responsive: responsiveReq
          })}
          disabled={generating}
          className="btn btn-primary btn-sm"
          style={{ fontWeight: 700 }}
        >
          {generating ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
          {generating ? 'Generating UX Architecture...' : 'Generate UX from Requirement'}
        </button>
      </div>
    </div>
  );
};

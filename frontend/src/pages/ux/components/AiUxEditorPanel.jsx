import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Undo2,
  Redo2,
  Code2,
  FileEdit,
  RotateCcw,
  Save,
  CheckCircle2
} from 'lucide-react';

export const AiUxEditorPanel = ({
  selectedScreen,
  onApplyPromptEdit,
  editing,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) => {
  const [editorMode, setEditorMode] = useState('prompt'); // 'prompt' | 'spec'
  const [promptText, setPromptText] = useState('');

  // Generate initial editable specification prompt text from selectedScreen
  const defaultSpec = selectedScreen ? [
    `Screen Title: ${selectedScreen.name}`,
    `Business Purpose: ${selectedScreen.purpose || selectedScreen.description || ''}`,
    `Primary Persona: ${selectedScreen.primaryUser || 'Operations Specialist'}`,
    `Layout Architecture: ${selectedScreen.layout || 'Ergonomic multi-column workstation with KPI grid'}`,
    `Component Inventory: ${(selectedScreen.components || []).map(c => c.title || c.type).join(', ')}`,
    `Design Guidelines: Minimal cognitive friction, high-visibility status tags, WCAG 2.1 AA contrast.`
  ].join('\n') : '';

  const [specPromptText, setSpecPromptText] = useState(defaultSpec);

  // Sync default spec when screen switches
  useEffect(() => {
    if (selectedScreen) {
      setSpecPromptText([
        `Screen Title: ${selectedScreen.name}`,
        `Business Purpose: ${selectedScreen.purpose || selectedScreen.description || ''}`,
        `Primary Persona: ${selectedScreen.primaryUser || 'Operations Specialist'}`,
        `Layout Architecture: ${selectedScreen.layout || 'Ergonomic multi-column workstation with KPI grid'}`,
        `Component Inventory: ${(selectedScreen.components || []).map(c => c.title || c.type).join(', ')}`,
        `Design Guidelines: Minimal cognitive friction, high-visibility status tags, WCAG 2.1 AA contrast.`
      ].join('\n'));
    }
  }, [selectedScreen?.id]);

  const QUICK_PROMPTS = [
    'Add a priority filter and move the AI assistant to the right',
    'Move the AI assistant to the right',
    'Add patient search',
    'Make this dashboard more minimal',
    'Use a darker command center style',
    'Make this mobile-friendly',
    'Reduce visual density',
    'Add an approval workflow'
  ];

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!promptText.trim()) return;
    onApplyPromptEdit(promptText.trim(), selectedScreen?.id);
    setPromptText('');
  };

  const handleRegenerateFromSpec = () => {
    if (!specPromptText.trim()) return;
    onApplyPromptEdit(specPromptText.trim(), selectedScreen?.id);
  };

  const handleResetSpec = () => {
    setSpecPromptText(defaultSpec);
  };

  return (
    <div className="ux-editor-strip">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--accent-amber)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            AI Screen Studio & Specification Editor
          </span>
          <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
            TARGET: {selectedScreen?.name || 'Current Screen'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-subtle)', padding: 2, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setEditorMode('prompt')}
              style={{
                fontSize: '0.725rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: editorMode === 'prompt' ? 'var(--accent-amber)' : 'transparent',
                color: editorMode === 'prompt' ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Quick Prompt
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('spec')}
              style={{
                fontSize: '0.725rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: editorMode === 'spec' ? 'var(--accent-amber)' : 'transparent',
                color: editorMode === 'spec' ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              AI Design Prompt & Spec
            </button>
          </div>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || editing}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '3px 8px', opacity: canUndo ? 1 : 0.5 }}
            title="Undo last AI edit"
          >
            <Undo2 size={12} /> Undo
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo || editing}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '3px 8px', opacity: canRedo ? 1 : 0.5 }}
            title="Redo AI edit"
          >
            <Redo2 size={12} /> Redo
          </button>
        </div>
      </div>

      {/* MODE 1: Quick Prompt Mode */}
      {editorMode === 'prompt' && (
        <>
          {/* Suggested Quick Prompt Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              One-Click Directives:
            </span>
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onApplyPromptEdit(qp, selectedScreen?.id)}
                disabled={editing}
                className="ux-chip"
                style={{ fontSize: '0.725rem', padding: '3px 10px' }}
              >
                + {qp}
              </button>
            ))}
          </div>

          {/* Edit Prompt Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Tell AI what to modify on this screen (e.g. 'Add a priority filter and move the AI assistant to the right')..."
              className="ux-input"
              style={{ flex: 1, fontSize: '0.825rem', padding: '8px 14px' }}
            />
            <button
              type="submit"
              disabled={editing || !promptText.trim()}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700, padding: '8px 18px' }}
            >
              {editing ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
              {editing ? 'Regenerating Screen...' : 'Apply Change'}
            </button>
          </form>
        </>
      )}

      {/* MODE 2: Full Editable AI Design Prompt & Specification Area */}
      {editorMode === 'spec' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Edit the underlying generative AI specification prompt for <strong>{selectedScreen?.name}</strong>. Clicking [Regenerate Screen] will execute AI re-synthesis exclusively on this screen model.
            </span>
            <button
              type="button"
              onClick={handleResetSpec}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.725rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <RotateCcw size={11} /> Reset Prompt
            </button>
          </div>

          <textarea
            rows={5}
            value={specPromptText}
            onChange={(e) => setSpecPromptText(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontFamily: "'JetBrains Mono', 'Consolas', monospace",
              fontSize: '0.775rem',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              lineHeight: 1.45,
              resize: 'vertical'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={handleRegenerateFromSpec}
              disabled={editing}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {editing ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
              {editing ? 'Regenerating Screen...' : 'Regenerate Screen with Edited Prompt'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

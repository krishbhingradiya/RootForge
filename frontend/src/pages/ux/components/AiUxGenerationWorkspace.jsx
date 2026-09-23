import React, { useState } from 'react';
import { Layers, Plus, Sparkles, X, Trash2, Sliders } from 'lucide-react';

export const AiUxGenerationWorkspace = ({
  screens,
  selectedScreenId,
  onSelectScreen,
  onAddCustomScreen,
  onDeleteScreen,
  activeTheme
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');
  const [newScreenPurpose, setNewScreenPurpose] = useState('');
  const [newScreenUser, setNewScreenUser] = useState('');
  const [newScreenWorkflow, setNewScreenWorkflow] = useState('');
  const [newScreenComponents, setNewScreenComponents] = useState('');
  const [newScreenLayout, setNewScreenLayout] = useState('');

  const handleCreateScreen = (e) => {
    e.preventDefault();
    if (!newScreenName.trim()) return;
    onAddCustomScreen({
      name: newScreenName.trim(),
      purpose: newScreenPurpose.trim() || `Operational workflow for ${newScreenName.trim()}`,
      primaryUser: newScreenUser.trim() || 'Operations Specialist',
      workflow: newScreenWorkflow.trim() || 'Standard enterprise operational workflow',
      requiredComponents: newScreenComponents.trim()
        ? newScreenComponents.split(',').map(s => s.trim())
        : ['Telemetry Metric Grid', 'Action Triage Table', 'AI Assistant Copilot'],
      layoutDescription: newScreenLayout.trim() || 'Multi-column grid with operational queue and live triage table'
    });
    setNewScreenName('');
    setNewScreenPurpose('');
    setNewScreenUser('');
    setNewScreenWorkflow('');
    setNewScreenComponents('');
    setNewScreenLayout('');
    setShowAddModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={16} color="var(--accent-amber)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Generated Screens ({screens?.length || 0})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {screens?.length > 1 && onDeleteScreen && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete the currently active screen from this UX architecture?')) {
                  onDeleteScreen(selectedScreenId);
                }
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '3px 10px', color: '#EF4444' }}
              title="Delete Active Screen"
            >
              <Trash2 size={13} /> Delete Screen
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '3px 10px' }}
          >
            <Plus size={13} color="var(--accent-amber)" /> Add Screen
          </button>
        </div>
      </div>

      {/* Screen Tabs Navigator */}
      <div className="ux-screen-nav-row">
        {(screens || []).map((screen, idx) => {
          const isSelected = selectedScreenId === screen.id;
          return (
            <button
              key={screen.id || idx}
              type="button"
              onClick={() => onSelectScreen(screen.id)}
              className={`ux-screen-tab ${isSelected ? 'active' : ''}`}
            >
              <span style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
                backgroundColor: isSelected ? 'var(--accent-amber)' : 'var(--bg-subtle)',
                color: isSelected ? '#FFFFFF' : 'var(--text-muted)'
              }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span>{screen.name}</span>
            </button>
          );
        })}
      </div>

      {/* Add Screen Modal */}
      {showAddModal && (
        <div className="ux-modal-backdrop">
          <div className="ux-modal-dialog" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="var(--accent-amber)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Add Custom Screen
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateScreen} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Screen Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newScreenName}
                    onChange={(e) => setNewScreenName(e.target.value)}
                    placeholder="e.g. Appointment Rescheduling Desk"
                    className="ux-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Primary User *
                  </label>
                  <input
                    type="text"
                    required
                    value={newScreenUser}
                    onChange={(e) => setNewScreenUser(e.target.value)}
                    placeholder="e.g. Clinical Desk Coordinator"
                    className="ux-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Screen Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={newScreenPurpose}
                  onChange={(e) => setNewScreenPurpose(e.target.value)}
                  placeholder="e.g. Enable rapid doctor calendar slot shifting and patient notification"
                  className="ux-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Primary Workflow
                </label>
                <input
                  type="text"
                  value={newScreenWorkflow}
                  onChange={(e) => setNewScreenWorkflow(e.target.value)}
                  placeholder="e.g. Select appointment -> Find doctor slot -> Confirm & Notify"
                  className="ux-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Required Components (comma separated)
                </label>
                <input
                  type="text"
                  value={newScreenComponents}
                  onChange={(e) => setNewScreenComponents(e.target.value)}
                  placeholder="e.g. Calendar Grid, Doctor Card, Reschedule Confirmation Modal"
                  className="ux-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Layout Description
                </label>
                <textarea
                  rows={2}
                  value={newScreenLayout}
                  onChange={(e) => setNewScreenLayout(e.target.value)}
                  placeholder="Describe the visual layout (e.g. 2-column split view with calendar on left and slot chips on right)..."
                  className="ux-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  <Sparkles size={13} /> Generate Screen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

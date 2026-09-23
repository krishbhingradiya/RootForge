import React, { useState } from 'react';
import { X, Table } from 'lucide-react';

export const EntityEditModal = ({
  isOpen,
  onClose,
  initialEntity = null,
  onSave
}) => {
  const [name, setName] = useState(initialEntity?.name || '');
  const [description, setDescription] = useState(initialEntity?.description || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim()
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--db-surface)',
          border: '1px solid var(--db-border)',
          borderRadius: 8,
          width: '460px',
          maxWidth: '96vw',
          padding: 20,
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Table size={18} color="var(--accent-amber, #D97706)" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              {initialEntity ? 'Edit Database Entity' : 'Add New Database Entity'}
            </h4>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 4 }}>
              Entity / Table Name (PascalCase) *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Practitioner, InventoryItem, Invoice"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.82rem',
                backgroundColor: 'var(--db-surface-muted)',
                border: '1px solid var(--db-border)',
                borderRadius: 6,
                color: 'var(--db-text-primary)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 4 }}>
              Business Description & Scope
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe entity lifecycle and domain purpose..."
              style={{
                width: '100%',
                height: 75,
                padding: '8px 12px',
                fontSize: '0.8rem',
                backgroundColor: 'var(--db-surface-muted)',
                border: '1px solid var(--db-border)',
                borderRadius: 6,
                color: 'var(--db-text-primary)',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
              {initialEntity ? 'Save Changes' : 'Create Entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Link } from 'lucide-react';

export const RelationshipEditModal = ({
  isOpen,
  onClose,
  entities = [],
  initialRelation = null,
  relationIndex = null,
  onSave
}) => {
  const [fromTable, setFromTable] = useState(initialRelation?.from?.split('.')[0] || entities[0]?.name || '');
  const [fromCol, setFromCol] = useState(initialRelation?.from?.split('.')[1] || '');
  const [toTable, setToTable] = useState(initialRelation?.to?.split('.')[0] || entities[1]?.name || entities[0]?.name || '');
  const [toCol, setToCol] = useState(initialRelation?.to?.split('.')[1] || 'id');
  const [type, setType] = useState(initialRelation?.type || 'Many-to-One');
  const [onDelete, setOnDelete] = useState(initialRelation?.onDelete || 'RESTRICT');
  const [onUpdate, setOnUpdate] = useState(initialRelation?.onUpdate || 'CASCADE');

  if (!isOpen) return null;

  const fromEntityObj = entities.find(e => e.name === fromTable);
  const toEntityObj = entities.find(e => e.name === toTable);

  const fromFields = fromEntityObj?.fields || [];
  const toFields = toEntityObj?.fields || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fromTable || !fromCol || !toTable || !toCol) return;

    onSave(relationIndex, {
      from: `${fromTable}.${fromCol}`,
      to: `${toTable}.${toCol}`,
      type,
      onDelete,
      onUpdate
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
          width: '540px',
          maxWidth: '96vw',
          padding: 20,
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link size={18} color="var(--accent-amber, #D97706)" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              {initialRelation ? 'Edit Foreign Key Relationship' : 'Add Foreign Key Relationship'}
            </h4>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Source Column (Foreign Key) */}
          <div style={{ padding: 12, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--accent-amber, #D97706)', textTransform: 'uppercase' }}>
              Source Entity & Foreign Key Column (Child)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>Source Table</label>
                <select
                  value={fromTable}
                  onChange={(e) => {
                    setFromTable(e.target.value);
                    const ent = entities.find(item => item.name === e.target.value);
                    if (ent?.fields?.length) setFromCol(ent.fields[0].name);
                  }}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    backgroundColor: 'var(--db-surface)',
                    border: '1px solid var(--db-border)',
                    borderRadius: 6,
                    color: 'var(--db-text-primary)'
                  }}
                >
                  {entities.map(e => (
                    <option key={e.name} value={e.name}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>FK Column</label>
                <select
                  value={fromCol}
                  onChange={(e) => setFromCol(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    backgroundColor: 'var(--db-surface)',
                    border: '1px solid var(--db-border)',
                    borderRadius: 6,
                    color: 'var(--db-text-primary)'
                  }}
                >
                  <option value="">Select column...</option>
                  {fromFields.map(f => (
                    <option key={f.name} value={f.name}>{f.name} ({f.type})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Target Column (Referenced Primary Key) */}
          <div style={{ padding: 12, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
              Target Entity & Referenced Column (Parent)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>Target Table</label>
                <select
                  value={toTable}
                  onChange={(e) => {
                    setToTable(e.target.value);
                    const ent = entities.find(item => item.name === e.target.value);
                    if (ent?.fields?.length) setToCol('id');
                  }}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    backgroundColor: 'var(--db-surface)',
                    border: '1px solid var(--db-border)',
                    borderRadius: 6,
                    color: 'var(--db-text-primary)'
                  }}
                >
                  {entities.map(e => (
                    <option key={e.name} value={e.name}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>Target Column (Usually PK)</label>
                <select
                  value={toCol}
                  onChange={(e) => setToCol(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    backgroundColor: 'var(--db-surface)',
                    border: '1px solid var(--db-border)',
                    borderRadius: 6,
                    color: 'var(--db-text-primary)'
                  }}
                >
                  <option value="">Select column...</option>
                  {toFields.map(f => (
                    <option key={f.name} value={f.name}>{f.name} {f.isPrimaryKey ? '[PK]' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cardinality & Referencing Action */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>Cardinality</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  fontSize: '0.78rem',
                  backgroundColor: 'var(--db-surface)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-text-primary)'
                }}
              >
                <option value="Many-to-One">Many-to-One (N:1)</option>
                <option value="One-to-Many">One-to-Many (1:N)</option>
                <option value="One-to-One">One-to-One (1:1)</option>
                <option value="Many-to-Many">Many-to-Many (N:M)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>ON DELETE</label>
              <select
                value={onDelete}
                onChange={(e) => setOnDelete(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  fontSize: '0.78rem',
                  backgroundColor: 'var(--db-surface)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-text-primary)'
                }}
              >
                <option value="RESTRICT">RESTRICT</option>
                <option value="CASCADE">CASCADE</option>
                <option value="SET NULL">SET NULL</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>ON UPDATE</label>
              <select
                value={onUpdate}
                onChange={(e) => setOnUpdate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  fontSize: '0.78rem',
                  backgroundColor: 'var(--db-surface)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-text-primary)'
                }}
              >
                <option value="CASCADE">CASCADE</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
              {initialRelation ? 'Update Relationship' : 'Declare Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Key } from 'lucide-react';

export const FieldEditModal = ({
  isOpen,
  onClose,
  entityName,
  initialField = null,
  fieldIndex = null,
  onSave
}) => {
  const [name, setName] = useState(initialField?.name || '');
  const [type, setType] = useState(initialField?.type || 'VARCHAR(100)');
  const [isPrimaryKey, setIsPrimaryKey] = useState(initialField?.isPrimaryKey || false);
  const [isForeignKey, setIsForeignKey] = useState(initialField?.isForeignKey || false);
  const [isUnique, setIsUnique] = useState(initialField?.isUnique || false);
  const [isNullable, setIsNullable] = useState(initialField?.isNullable ?? false);
  const [defaultValue, setDefaultValue] = useState(initialField?.defaultValue || '');
  const [description, setDescription] = useState(initialField?.description || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Synthesize constraint string
    const constraintsArr = [];
    if (isPrimaryKey) constraintsArr.push('PRIMARY KEY');
    if (isForeignKey) constraintsArr.push('FOREIGN KEY');
    if (isUnique && !isPrimaryKey) constraintsArr.push('UNIQUE');
    if (!isNullable && !isPrimaryKey) constraintsArr.push('NOT NULL');
    if (defaultValue) constraintsArr.push(`DEFAULT ${defaultValue}`);

    onSave(entityName, fieldIndex, {
      name: name.trim(),
      type: type.trim(),
      constraints: constraintsArr.join(', '),
      description: description.trim(),
      isPrimaryKey,
      isForeignKey,
      isUnique: isUnique || isPrimaryKey,
      isNullable: !isPrimaryKey && isNullable,
      defaultValue: defaultValue || null
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
          width: '520px',
          maxWidth: '96vw',
          padding: 20,
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={18} color="var(--accent-amber, #D97706)" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              {initialField ? `Edit Column in ${entityName}` : `Add Column to ${entityName}`}
            </h4>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Column Name & Data Type Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 4 }}>
                Column Name (camelCase) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. externalId, status, amount"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.8rem',
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
                Data Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--db-surface-muted)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-text-primary)',
                  outline: 'none'
                }}
              >
                <option value="VARCHAR(36)">VARCHAR(36) [UUID]</option>
                <option value="VARCHAR(50)">VARCHAR(50)</option>
                <option value="VARCHAR(100)">VARCHAR(100)</option>
                <option value="VARCHAR(255)">VARCHAR(255)</option>
                <option value="TEXT">TEXT</option>
                <option value="INTEGER">INTEGER</option>
                <option value="BIGINT">BIGINT</option>
                <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                <option value="FLOAT">FLOAT</option>
                <option value="BOOLEAN">BOOLEAN</option>
                <option value="TIMESTAMP">TIMESTAMP</option>
                <option value="DATE">DATE</option>
                <option value="JSONB">JSONB</option>
              </select>
            </div>
          </div>

          {/* Constraint Checkboxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: 10, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--db-text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPrimaryKey}
                onChange={(e) => setIsPrimaryKey(e.target.checked)}
              />
              <strong>Primary Key (PK)</strong>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--db-text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isForeignKey}
                onChange={(e) => setIsForeignKey(e.target.checked)}
              />
              Foreign Key (FK)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--db-text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isUnique}
                onChange={(e) => setIsUnique(e.target.checked)}
              />
              Unique (UQ)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--db-text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!isNullable}
                onChange={(e) => setIsNullable(!e.target.checked)}
              />
              NOT NULL (Required)
            </label>
          </div>

          {/* Default Value */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 4 }}>
              Default Value Expression (Optional)
            </label>
            <input
              type="text"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="e.g. CURRENT_TIMESTAMP, 'ACTIVE', uuid_generate_v4()"
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '0.78rem',
                backgroundColor: 'var(--db-surface-muted)',
                border: '1px solid var(--db-border)',
                borderRadius: 6,
                color: 'var(--db-text-primary)',
                outline: 'none'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 4 }}>
              Field Purpose / Note
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of stored attribute..."
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '0.78rem',
                backgroundColor: 'var(--db-surface-muted)',
                border: '1px solid var(--db-border)',
                borderRadius: 6,
                color: 'var(--db-text-primary)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
              {initialField ? 'Update Column' : 'Add Column'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

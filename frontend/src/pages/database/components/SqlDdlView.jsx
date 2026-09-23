import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Download,
  Check,
  RefreshCw,
  Edit3,
  Server,
  Terminal
} from 'lucide-react';
import { generateSqlDdl } from '../databaseViewModel';

export const SqlDdlView = ({
  entities = [],
  relations = [],
  onRegenerate,
  onExportFile,
  onEditDdl
}) => {
  const [dialect, setDialect] = useState('postgres'); // 'postgres' | 'sqlite'
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customSql, setCustomSql] = useState('');

  // Dynamically compile SQL DDL from the exact normalized entities and relations
  const compiledSql = React.useMemo(() => {
    return generateSqlDdl(entities, relations, dialect);
  }, [entities, relations, dialect]);

  const activeSql = customSql || compiledSql;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const filename = `schema_${dialect}_${new Date().toISOString().slice(0, 10)}.sql`;
    onExportFile(activeSql, filename);
  };

  const handleStartEdit = () => {
    setCustomSql(compiledSql);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    onEditDdl?.(customSql);
  };

  const handleReset = () => {
    setCustomSql('');
    setIsEditing(false);
  };

  return (
    <div className="db-code-card">
      {/* Code Header Bar with Dialect Switcher and Actions */}
      <div className="db-code-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={18} color="var(--accent-amber, #D97706)" />
            <span style={{ color: 'var(--db-text-primary)', fontWeight: 800, fontSize: '0.9rem' }}>
              Relational DDL Data Definition Language
            </span>
          </div>

          {/* Dialect Switcher */}
          <div style={{ display: 'flex', backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', padding: 2, borderRadius: 6 }}>
            <button
              type="button"
              onClick={() => setDialect('postgres')}
              style={{
                fontSize: '0.725rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: dialect === 'postgres' ? 'var(--accent-amber, #D97706)' : 'transparent',
                color: dialect === 'postgres' ? '#FFFFFF' : 'var(--db-text-secondary)',
                cursor: 'pointer'
              }}
            >
              PostgreSQL 16
            </button>
            <button
              type="button"
              onClick={() => setDialect('sqlite')}
              style={{
                fontSize: '0.725rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: dialect === 'sqlite' ? 'var(--accent-amber, #D97706)' : 'transparent',
                color: dialect === 'sqlite' ? '#FFFFFF' : 'var(--db-text-secondary)',
                cursor: 'pointer'
              }}
            >
              SQLite 3
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.75rem', fontWeight: 700 }}
              >
                Save Edits
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStartEdit}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}
              >
                <Edit3 size={13} /> Edit SQL
              </button>
              <button
                type="button"
                onClick={() => onRegenerate?.('sql')}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}
              >
                <RefreshCw size={13} /> Regenerate
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}
              >
                {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy Schema'}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700 }}
              >
                <Download size={13} /> Export .SQL
              </button>
            </>
          )}
        </div>
      </div>

      {/* Code Editor / Preview */}
      {isEditing ? (
        <textarea
          value={customSql}
          onChange={(e) => setCustomSql(e.target.value)}
          style={{
            width: '100%',
            height: '480px',
            backgroundColor: 'var(--db-code-bg)',
            color: 'var(--db-code-text)',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: '0.82rem',
            padding: '16px',
            border: 'none',
            outline: 'none',
            lineHeight: 1.5,
            resize: 'vertical'
          }}
        />
      ) : (
        <pre className="db-code-pre">
          {activeSql}
        </pre>
      )}

      {/* SQL Information Footer */}
      <div style={{ padding: '8px 16px', backgroundColor: 'var(--db-surface-header)', borderTop: '1px solid var(--db-border)', fontSize: '0.725rem', color: 'var(--db-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Dialect: <strong>{dialect.toUpperCase()}</strong> &bull; Syntax: 3NF Relational Standards</span>
        <span>Includes: Tables, Foreign Keys, B-Tree Indexes, Check Constraints</span>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  FileCode2,
  Copy,
  Download,
  Check,
  RefreshCw,
  Edit3,
  Layers
} from 'lucide-react';
import { generatePrismaSchema } from '../databaseViewModel';

export const PrismaSchemaView = ({
  entities = [],
  relations = [],
  onRegenerate,
  onExportFile,
  onEditPrisma
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customPrisma, setCustomPrisma] = useState('');

  // Dynamically compile Prisma Schema from normalized model
  const compiledPrisma = React.useMemo(() => {
    return generatePrismaSchema(entities, relations);
  }, [entities, relations]);

  const activePrisma = customPrisma || compiledPrisma;

  const handleCopy = () => {
    navigator.clipboard.writeText(activePrisma);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const filename = `schema_${new Date().toISOString().slice(0, 10)}.prisma`;
    onExportFile(activePrisma, filename);
  };

  const handleStartEdit = () => {
    setCustomPrisma(compiledPrisma);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    onEditPrisma?.(customPrisma);
  };

  const handleReset = () => {
    setCustomPrisma('');
    setIsEditing(false);
  };

  return (
    <div className="db-code-card">
      {/* Code Header Bar */}
      <div className="db-code-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileCode2 size={18} color="var(--accent-amber, #D97706)" />
          <span style={{ color: 'var(--db-text-primary)', fontWeight: 800, fontSize: '0.9rem' }}>
            Prisma ORM Schema Data Model
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', backgroundColor: 'var(--db-chip-bg)', border: '1px solid var(--db-border)', padding: '2px 8px', borderRadius: 4 }}>
            Prisma v5.x+
          </span>
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
                <Edit3 size={13} /> Edit Prisma
              </button>
              <button
                type="button"
                onClick={() => onRegenerate?.('prisma')}
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
                {copied ? 'Copied' : 'Copy Prisma Schema'}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700 }}
              >
                <Download size={13} /> Export .Prisma
              </button>
            </>
          )}
        </div>
      </div>

      {/* Code Editor / Preview */}
      {isEditing ? (
        <textarea
          value={customPrisma}
          onChange={(e) => setCustomPrisma(e.target.value)}
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
          {activePrisma}
        </pre>
      )}

      {/* Footer Info */}
      <div style={{ padding: '8px 16px', backgroundColor: 'var(--db-surface-header)', borderTop: '1px solid var(--db-border)', fontSize: '0.725rem', color: 'var(--db-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>ORM: Prisma Schema Client &bull; Engine: PostgreSQL / Aurora Compatible</span>
        <span>Includes: Bidirectional Relations, Defaults, Unique Attributes</span>
      </div>
    </div>
  );
};

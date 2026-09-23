import React, { useState } from 'react';
import {
  Download,
  X,
  FileCode2,
  Code2,
  Webhook,
  Network,
  Activity,
  Check,
  FileText
} from 'lucide-react';
import { showToast } from '../../../components/common/Toast';
import { generateSqlDdl, generatePrismaSchema, generateOpenApiJson } from '../databaseViewModel';

export const DatabaseExportModal = ({
  isOpen,
  onClose,
  model
}) => {
  const [exportingFormat, setExportingFormat] = useState(null);

  if (!isOpen) return null;

  const downloadFile = (content, filename, mimeType = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}`);
  };

  const handleExportSql = (dialect = 'postgres') => {
    const sql = generateSqlDdl(model.entities, model.relations, dialect);
    const filename = `database_schema_${dialect}_${new Date().toISOString().slice(0, 10)}.sql`;
    downloadFile(sql, filename);
  };

  const handleExportPrisma = () => {
    const prisma = generatePrismaSchema(model.entities, model.relations);
    const filename = `schema_${new Date().toISOString().slice(0, 10)}.prisma`;
    downloadFile(prisma, filename);
  };

  const handleExportOpenApi = () => {
    const openApiStr = generateOpenApiJson(model);
    const filename = `openapi_contract_${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(openApiStr, filename, 'application/json');
  };

  const handleExportArchitecture = () => {
    const jsonStr = JSON.stringify({
      domain: model.domain,
      integrations: model.integrations,
      timestamp: new Date().toISOString()
    }, null, 2);
    downloadFile(jsonStr, `integration_architecture_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const handleExportDataFlow = () => {
    const jsonStr = JSON.stringify({
      domain: model.domain,
      dataFlows: model.dataFlows,
      timestamp: new Date().toISOString()
    }, null, 2);
    downloadFile(jsonStr, `data_flow_sequence_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const handleExportMarkdownSpec = () => {
    const lines = [
      `# ${model.title || 'Database Schema & API Contract Specification'}`,
      `**Domain:** ${model.domain} | **Version:** v${model.version || 1} | **Status:** ${model.status}`,
      `Generated: ${new Date().toLocaleString()}`,
      `\n## 1. Relational Entities (${model.entities.length})`,
      ...model.entities.map(e => `### Table: ${e.name}\n${e.description || ''}\n\n| Column | Type | Constraints |\n| --- | --- | --- |\n` +
        (e.fields || []).map(f => `| ${f.name} | ${f.type} | ${f.constraints || '-'} |`).join('\n')
      ),
      `\n## 2. Foreign Key Relationships (${model.relations.length})`,
      ...model.relations.map(r => `- \`${r.from}\` → \`${r.to}\` (${r.type})`),
      `\n## 3. REST API Contract (${model.endpoints.length})`,
      ...model.endpoints.map(ep => `### ${ep.method} ${ep.endpoint}\n${ep.purpose}\n- **Auth:** ${ep.authentication}\n- **Params:** ${ep.parameters}\n`)
    ];

    downloadFile(lines.join('\n\n'), `database_api_specification_${new Date().toISOString().slice(0, 10)}.md`, 'text/markdown');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
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
          borderRadius: 10,
          width: '680px',
          maxWidth: '96vw',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--db-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--db-surface-header)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={18} color="var(--accent-amber, #D97706)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              Export Database & API Artifacts
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Options */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: 'var(--db-surface)' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--db-text-muted)' }}>
            Choose an enterprise artifact format to download. All exports are generated directly from your active 3NF normalized schema model.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 6 }}>
            {/* PostgreSQL DDL */}
            <div style={{ padding: 14, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--db-text-primary)' }}>PostgreSQL 16 SQL DDL</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>Tables, Foreign Keys, Indexes (.sql)</div>
              </div>
              <button
                type="button"
                onClick={() => handleExportSql('postgres')}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.725rem' }}
              >
                <Download size={12} /> .SQL
              </button>
            </div>

            {/* SQLite DDL */}
            <div style={{ padding: 14, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--db-text-primary)' }}>SQLite 3 DDL Script</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>Embedded SQLite syntax (.sql)</div>
              </div>
              <button
                type="button"
                onClick={() => handleExportSql('sqlite')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem' }}
              >
                <Download size={12} /> .SQL
              </button>
            </div>

            {/* Prisma Schema */}
            <div style={{ padding: 14, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--db-text-primary)' }}>Prisma ORM Schema</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>Models & relations (.prisma)</div>
              </div>
              <button
                type="button"
                onClick={handleExportPrisma}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.725rem' }}
              >
                <Download size={12} /> .Prisma
              </button>
            </div>

            {/* OpenAPI 3.0 Contract */}
            <div style={{ padding: 14, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--db-text-primary)' }}>OpenAPI 3.0 JSON</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>REST endpoints specification (.json)</div>
              </div>
              <button
                type="button"
                onClick={handleExportOpenApi}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem' }}
              >
                <Download size={12} /> .JSON
              </button>
            </div>

            {/* Integration Architecture */}
            <div style={{ padding: 14, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--db-text-primary)' }}>Integration Architecture</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>Topology and components (.json)</div>
              </div>
              <button
                type="button"
                onClick={handleExportArchitecture}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem' }}
              >
                <Download size={12} /> .JSON
              </button>
            </div>

            {/* Markdown Report */}
            <div style={{ padding: 14, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--db-text-primary)' }}>Full Technical Markdown</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--db-text-muted)' }}>Complete specification (.md)</div>
              </div>
              <button
                type="button"
                onClick={handleExportMarkdownSpec}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.725rem' }}
              >
                <Download size={12} /> .MD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

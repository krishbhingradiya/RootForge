import React, { useState } from 'react';
import {
  Webhook,
  Plus,
  Copy,
  Check,
  Edit2,
  CopyPlus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Download,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ApiTraceabilitySection } from './ApiTraceabilitySection';

export const RestApiView = ({
  endpoints = [],
  entities = [],
  relations = [],
  onAddEndpoint,
  onEditEndpoint,
  onDuplicateEndpoint,
  onDeleteEndpoint,
  onRegenerate,
  onExportOpenApi
}) => {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const filteredEndpoints = endpoints.filter(ep => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return ep.endpoint.toLowerCase().includes(q) ||
      ep.method.toLowerCase().includes(q) ||
      (ep.purpose || '').toLowerCase().includes(q) ||
      (ep.primaryEntity || '').toLowerCase().includes(q);
  });

  const handleCopyEndpoint = (ep, idx, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${ep.method} ${ep.endpoint}`);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportJson = () => {
    const openApiDoc = {
      openapi: '3.0.3',
      info: {
        title: 'RootForge Solution REST API Contract',
        version: '1.0.0',
        description: 'Auto-synchronized REST API Blueprint derived from 3NF database entities.'
      },
      servers: [{ url: '/api/v1', description: 'Production Gateway' }],
      paths: {}
    };

    endpoints.forEach(ep => {
      if (!openApiDoc.paths[ep.endpoint]) {
        openApiDoc.paths[ep.endpoint] = {};
      }
      openApiDoc.paths[ep.endpoint][ep.method.toLowerCase()] = {
        summary: ep.purpose,
        description: ep.description,
        parameters: ep.parameters !== 'None' ? [{ name: 'params', in: 'query', description: ep.parameters }] : [],
        responses: {
          '200': { description: 'Successful response' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' }
        }
      };
    });

    const blob = new Blob([JSON.stringify(openApiDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openapi_contract_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Controls Strip */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Webhook size={18} color="var(--accent-amber, #D97706)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              Enterprise REST API Blueprint ({endpoints.length} Endpoints)
            </h3>
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--db-text-muted)' }}>
            Base URL: <code style={{ color: 'var(--accent-amber, #D97706)', fontWeight: 700 }}>/api/v1</code> &bull; Auth: <code style={{ color: 'var(--db-text-secondary)' }}>Bearer JWT</code>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: 8, color: 'var(--db-text-muted)' }} />
            <input
              type="text"
              placeholder="Filter endpoints..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                padding: '4px 10px 4px 28px',
                fontSize: '0.75rem',
                borderRadius: 4,
                backgroundColor: 'var(--db-surface-muted)',
                border: '1px solid var(--db-border)',
                color: 'var(--db-text-primary)',
                outline: 'none',
                width: 170
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => onRegenerate?.('apis')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} /> Regenerate
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}
            title="Export as OpenAPI 3.0 Specification JSON"
          >
            <Download size={13} /> OpenAPI JSON
          </button>

          <button
            type="button"
            onClick={onAddEndpoint}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700 }}
          >
            <Plus size={13} /> Add Endpoint
          </button>
        </div>
      </div>

      {/* Expandable Endpoint Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filteredEndpoints.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--db-text-muted)', backgroundColor: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 8 }}>
            No endpoints matched your search filter.
          </div>
        ) : (
          filteredEndpoints.map((ep, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <div key={ep.endpoint + ep.method + idx} className="api-endpoint-card">
                {/* Summary Header */}
                <div
                  className="api-endpoint-summary"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <span className={`api-method-badge api-method-${ep.method}`}>
                      {ep.method}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.86rem', color: 'var(--db-text-primary)' }}>
                      {ep.endpoint}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--db-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>
                      {ep.purpose}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Related Entity Badge */}
                    {ep.primaryEntity && (
                      <span style={{ fontSize: '0.7rem', color: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.25)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        {ep.primaryEntity}
                      </span>
                    )}

                    {/* Quick Actions */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyEndpoint(ep, idx, e)}
                      style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer', padding: 4 }}
                      title="Copy endpoint path"
                    >
                      {copiedIndex === idx ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateEndpoint(idx, ep);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer', padding: 4 }}
                      title="Duplicate endpoint"
                    >
                      <CopyPlus size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEndpoint(idx, ep);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer', padding: 4 }}
                      title="Edit endpoint specification"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEndpoint(idx);
                      }}
                      style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}
                      title="Delete endpoint"
                    >
                      <Trash2 size={13} />
                    </button>

                    {isExpanded ? <ChevronDown size={16} color="var(--db-text-muted)" /> : <ChevronRight size={16} color="var(--db-text-muted)" />}
                  </div>
                </div>

                {/* Expanded Documentation Details — Full 100% Opacity, Crisp Themed Surface */}
                {isExpanded && (
                  <div className="api-details-body">
                    {/* Description & Functionality */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--db-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                        Purpose & Functionality
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--db-text-primary)', lineHeight: 1.5 }}>
                        {ep.description || ep.purpose}
                      </div>
                    </div>

                    {/* Metadata Strip: Auth, Roles, Related Entities */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, padding: 12, backgroundColor: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 6 }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', display: 'block', fontWeight: 600 }}>Authentication Tier</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-amber, #D97706)' }}>
                          <Shield size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {ep.authentication || 'Bearer JWT'}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', display: 'block', fontWeight: 600 }}>Authorization Scope</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--db-text-primary)' }}>
                          {ep.authorization || 'Role: System Authenticated'}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', display: 'block', fontWeight: 600 }}>Primary Database Entity</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2563EB' }}>
                          {ep.primaryEntity || 'Not mapped'}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--db-text-muted)', display: 'block', fontWeight: 600 }}>Related Entities</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--db-text-primary)' }}>
                          {ep.relatedEntities && ep.relatedEntities.length > 0 ? ep.relatedEntities.join(', ') : 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Query & Path Parameters */}
                    {ep.parameters && ep.parameters !== 'None' && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--db-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                          Parameters
                        </div>
                        <code style={{ fontSize: '0.78rem', padding: '4px 8px', backgroundColor: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 4, display: 'inline-block', color: 'var(--db-text-primary)' }}>
                          {ep.parameters}
                        </code>
                      </div>
                    )}

                    {/* Payload Examples Grid: Request, Response, Error Response */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                      {/* Example Request Body */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563EB', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Example Request Payload</span>
                          <span>application/json</span>
                        </div>
                        <pre style={{ margin: 0, padding: 12, backgroundColor: 'var(--db-code-bg)', color: 'var(--db-code-text)', border: '1px solid var(--db-code-border)', fontSize: '0.76rem', fontFamily: "'JetBrains Mono', monospace", borderRadius: 6, maxHeight: 180, overflowY: 'auto' }}>
                          {ep.requestBody || 'None (No request payload required)'}
                        </pre>
                      </div>

                      {/* Example Success Response */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Example 200/201 Response</span>
                          <span>application/json</span>
                        </div>
                        <pre style={{ margin: 0, padding: 12, backgroundColor: 'var(--db-code-bg)', color: 'var(--db-code-text)', border: '1px solid var(--db-code-border)', fontSize: '0.76rem', fontFamily: "'JetBrains Mono', monospace", borderRadius: 6, maxHeight: 180, overflowY: 'auto' }}>
                          {ep.responseBody || '{\n  "status": "OK"\n}'}
                        </pre>
                      </div>

                      {/* Example Error Response */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#DC2626', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Example Error Response (4xx / 5xx)</span>
                          <span>application/json</span>
                        </div>
                        <pre style={{ margin: 0, padding: 12, backgroundColor: 'var(--db-code-bg)', color: 'var(--db-code-text)', border: '1px solid var(--db-code-border)', fontSize: '0.76rem', fontFamily: "'JetBrains Mono', monospace", borderRadius: 6, maxHeight: 180, overflowY: 'auto' }}>
                          {ep.errorResponse || '{\n  "error": "Bad Request",\n  "code": "ERR_INVALID_PARAM"\n}'}
                        </pre>
                      </div>
                    </div>

                    {/* Status Codes Table */}
                    {ep.statusCodes && ep.statusCodes.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--db-text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Declared HTTP Status Codes
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {ep.statusCodes.map((sc, sIdx) => {
                            const isSuccess = sc.code >= 200 && sc.code < 300;
                            const isError = sc.code >= 400;

                            return (
                              <div
                                key={sIdx}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '5px 12px',
                                  backgroundColor: 'var(--db-surface)',
                                  border: `1px solid ${isSuccess ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
                                  borderRadius: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6
                                }}
                              >
                                <span style={{ fontWeight: 900, color: isSuccess ? '#059669' : '#DC2626' }}>
                                  {sc.code}
                                </span>
                                <span style={{ color: 'var(--db-text-primary)', fontWeight: 600 }}>{sc.description}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Section 8: API ↔ Database Traceability Matrix */}
      <ApiTraceabilitySection
        endpoints={endpoints}
        entities={entities}
        relations={relations}
      />
    </div>
  );
};

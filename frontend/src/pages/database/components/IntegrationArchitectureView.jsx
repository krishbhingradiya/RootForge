import React, { useState } from 'react';
import {
  Network,
  Server,
  Database,
  Globe,
  Shield,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';

export const IntegrationArchitectureView = ({
  integrations = [],
  onAddIntegration,
  onEditIntegration,
  onDeleteIntegration,
  onExportDiagram
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState(integrations[0]?.id || null);

  const selectedNode = integrations.find(n => n.id === selectedNodeId) || integrations[0];

  // Group components by layer
  const layers = ['Client', 'Gateway', 'Service', 'Persistence', 'External'];

  const getLayerNodes = (layerName) => {
    return integrations.filter(item => (item.layer || '').toLowerCase() === layerName.toLowerCase());
  };

  const getLayerIcon = (layer) => {
    switch (layer) {
      case 'Client': return <Globe size={14} color="#60A5FA" />;
      case 'Gateway': return <Shield size={14} color="#F59E0B" />;
      case 'Service': return <Server size={14} color="#10B981" />;
      case 'Persistence': return <Database size={14} color="#D97706" />;
      default: return <Network size={14} color="#A78BFA" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Architecture Controls */}
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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Network size={18} color="var(--accent-amber, #D97706)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              Solution Integration Architecture Topology
            </h3>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--db-text-muted)' }}>
            Interactive multi-tier system topology linking Client Frontends, API Gateways, Microservices, Databases, and External Third-Party APIs.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onAddIntegration}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700 }}
          >
            <Plus size={13} /> Add Component
          </button>
        </div>
      </div>

      {/* Main Multi-Tier Grid & Node Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 16 }}>
        {/* Left: Tiered Architectural Map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {layers.map((layer) => {
            const nodes = getLayerNodes(layer);
            if (nodes.length === 0) return null;

            return (
              <div
                key={layer}
                style={{
                  backgroundColor: 'var(--db-surface)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 8,
                  padding: '14px 18px',
                  boxShadow: 'var(--db-card-shadow)'
                }}
              >
                {/* Layer Heading */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  {getLayerIcon(layer)}
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--db-text-primary)' }}>
                    {layer} Tier ({nodes.length})
                  </span>
                </div>

                {/* Nodes inside this layer */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {nodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;

                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`arch-node-card ${isSelected ? 'selected' : ''}`}
                        style={{
                          borderColor: isSelected ? 'var(--accent-amber, #D97706)' : 'var(--db-border)',
                          backgroundColor: isSelected ? 'rgba(217, 119, 6, 0.12)' : 'var(--db-surface-muted)',
                          padding: '12px 14px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          borderWidth: 1,
                          borderStyle: 'solid',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--db-text-primary)' }}>
                            {node.name}
                          </span>
                          <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--db-text-muted)' }}>
                            {node.layer}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--db-text-secondary)', marginBottom: 6, lineHeight: 1.3 }}>
                          {node.technology}
                        </div>

                        <div style={{ fontSize: '0.68rem', color: 'var(--db-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{node.connectedApis?.length || 0} APIs</span>
                          <span>{node.connectedEntities?.length || 0} Tables</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Component Inspector Panel */}
        {selectedNode ? (
          <div
            style={{
              backgroundColor: 'var(--db-surface)',
              border: '1px solid var(--db-border)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: 'var(--db-card-shadow)',
              position: 'sticky',
              top: 20,
              alignSelf: 'flex-start'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-amber, #D97706)' }}>
                  {selectedNode.layer} Component
                </span>
                <h4 style={{ margin: '4px 0 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
                  {selectedNode.name}
                </h4>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => onEditIntegration(selectedNode)}
                  className="btn btn-sm"
                  style={{ padding: '4px 8px', backgroundColor: 'var(--db-chip-bg)', color: 'var(--db-text-primary)', border: '1px solid var(--db-border)' }}
                  title="Edit component"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteIntegration(selectedNode.id)}
                  className="btn btn-sm"
                  style={{ padding: '4px 8px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
                  title="Delete component"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Responsibility */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Core Responsibility
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--db-text-secondary)', lineHeight: 1.4 }}>
                {selectedNode.responsibility}
              </div>
            </div>

            {/* Technology */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Technology & Framework
              </div>
              <code style={{ fontSize: '0.78rem', color: 'var(--accent-amber, #D97706)', backgroundColor: 'var(--db-code-bg)', border: '1px solid var(--db-border)', padding: '4px 8px', borderRadius: 4, display: 'block' }}>
                {selectedNode.technology}
              </code>
            </div>

            {/* Interfaces */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Supported Protocols & Interfaces
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(selectedNode.interfaces || []).map((iface, iIdx) => (
                  <span key={iIdx} style={{ fontSize: '0.72rem', padding: '2px 8px', backgroundColor: 'var(--db-chip-bg)', border: '1px solid var(--db-border)', borderRadius: 4, color: 'var(--db-text-primary)' }}>
                    {iface}
                  </span>
                ))}
              </div>
            </div>

            {/* Connected APIs */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Connected REST APIs ({(selectedNode.connectedApis || []).length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(selectedNode.connectedApis || []).map((apiStr, aIdx) => (
                  <div key={aIdx} style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#2563EB', backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', padding: '4px 8px', borderRadius: 4 }}>
                    {apiStr}
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Entities */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Connected Relational Tables
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(selectedNode.connectedEntities || []).map((ent, eIdx) => (
                  <span key={eIdx} style={{ fontSize: '0.72rem', padding: '2px 8px', backgroundColor: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, fontWeight: 700 }}>
                    {ent}
                  </span>
                ))}
              </div>
            </div>

            {/* Upstream Dependencies */}
            {selectedNode.dependencies && selectedNode.dependencies.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Downstream Service Dependencies
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedNode.dependencies.map((dep, dIdx) => (
                    <span key={dIdx} style={{ fontSize: '0.72rem', padding: '2px 8px', backgroundColor: 'var(--db-chip-bg)', color: 'var(--db-text-secondary)', border: '1px solid var(--db-border)', borderRadius: 4 }}>
                      &rarr; {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--db-text-muted)', backgroundColor: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 8 }}>
            Select an architectural component to inspect details.
          </div>
        )}
      </div>
    </div>
  );
};

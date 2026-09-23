import React, { useState, useRef } from 'react';
import {
  Table,
  Key,
  Plus,
  Edit2,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Share2,
  CheckCircle2,
  Info,
  Link,
  ChevronRight
} from 'lucide-react';

export const ErdVisualizerView = ({
  entities = [],
  relations = [],
  onAddEntity,
  onEditEntity,
  onDeleteEntity,
  onAddField,
  onEditField,
  onDeleteField,
  onAddRelation,
  onEditRelation,
  onDeleteRelation
}) => {
  const [selectedEntity, setSelectedEntity] = useState(entities[0]?.name || null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Compute related entities for the highlighted entity
  const relatedEntities = React.useMemo(() => {
    if (!selectedEntity) return [];
    const rels = relations.filter(r => {
      const [fromT] = (r.from || '').split('.');
      const [toT] = (r.to || '').split('.');
      return fromT === selectedEntity || toT === selectedEntity;
    });
    const names = rels.map(r => {
      const [fromT] = (r.from || '').split('.');
      const [toT] = (r.to || '').split('.');
      return fromT === selectedEntity ? toT : fromT;
    });
    return [...new Set(names)];
  }, [selectedEntity, relations]);

  // Zoom / Pan handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.15, 0.6));
  const handleFitScreen = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.erd-entity-card') || e.target.closest('button')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Top ERD Action & Controls Strip */}
      <div className="erd-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Table size={16} color="var(--accent-amber, #D97706)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)' }}>
              Interactive Entity-Relationship Graph ({entities.length} Entities)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted, #94A3B8)' }}>
            <span>Active Focus:</span>
            <span style={{ color: 'var(--accent-amber, #D97706)', fontWeight: 700 }}>
              {selectedEntity || 'None (Click entity card)'}
            </span>
            {relatedEntities.length > 0 && (
              <span style={{ color: '#60A5FA', fontSize: '0.7rem' }}>
                &bull; Linked: {relatedEntities.join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Zoom / Pan toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', padding: 2, borderRadius: 6 }}>
            <button
              type="button"
              onClick={handleZoomIn}
              className="btn btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--db-text-secondary)', background: 'none', border: 'none' }}
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', padding: '0 4px', color: 'var(--db-text-muted)' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="btn btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--db-text-secondary)', background: 'none', border: 'none' }}
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleFitScreen}
              className="btn btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--db-text-secondary)', background: 'none', border: 'none' }}
              title="Fit to Canvas"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Add Relationship Button */}
          <button
            type="button"
            onClick={onAddRelation}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem' }}
          >
            <Link size={13} /> Add Relationship
          </button>

          {/* Add Entity Button */}
          <button
            type="button"
            onClick={onAddEntity}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 700 }}
          >
            <Plus size={13} /> Add Entity
          </button>
        </div>
      </div>

      {/* Main ERD Visual Graph Canvas */}
      <div
        className="erd-canvas-wrap"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'top left',
            transition: isPanning ? 'none' : 'transform 0.15s ease',
            width: '100%',
            height: '100%'
          }}
        >
          {/* Visual Entities Grid */}
          <div className="erd-entities-grid">
            {entities.map((entity, idx) => {
              const isSelected = selectedEntity === entity.name;
              const isRelated = relatedEntities.includes(entity.name);

              return (
                <div
                  key={entity.name || idx}
                  className={`erd-entity-card ${isSelected ? 'highlighted' : ''}`}
                  onClick={() => setSelectedEntity(entity.name)}
                  style={{
                    opacity: selectedEntity && !isSelected && !isRelated ? 0.75 : 1,
                    borderColor: isSelected
                      ? 'var(--accent-amber, #D97706)'
                      : isRelated
                      ? '#2563EB'
                      : 'var(--db-border)',
                    boxShadow: isSelected
                      ? '0 0 0 2px rgba(217, 119, 6, 0.4), var(--db-card-shadow)'
                      : isRelated
                      ? '0 0 0 2px rgba(37, 99, 235, 0.3), var(--db-card-shadow)'
                      : 'var(--db-card-shadow)'
                  }}
                >
                  {/* Entity Header */}
                  <div className="erd-entity-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Table size={15} color={isSelected ? 'var(--accent-amber, #D97706)' : 'var(--db-text-muted)'} />
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--db-text-primary)' }}>
                        {entity.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddField(entity.name);
                        }}
                        className="btn btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.68rem', backgroundColor: 'var(--db-chip-bg)', color: 'var(--db-text-primary)', border: '1px solid var(--db-border)' }}
                        title="Add column to this entity"
                      >
                        <Plus size={11} /> Field
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEntity(entity);
                        }}
                        className="btn btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.68rem', backgroundColor: 'var(--db-chip-bg)', color: 'var(--db-text-primary)', border: '1px solid var(--db-border)' }}
                        title="Edit entity definition"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEntity(entity.name);
                        }}
                        className="btn btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.68rem', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
                        title="Delete entity"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Description Strip */}
                  <div style={{ padding: '6px 12px', fontSize: '0.72rem', color: 'var(--db-text-muted)', backgroundColor: 'var(--db-surface-muted)', borderBottom: '1px solid var(--db-border)' }}>
                    {entity.description || 'Database entity representation'}
                  </div>

                  {/* Table Column Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {(entity.fields || []).map((f, fIdx) => (
                      <div key={f.name || fIdx} className="erd-field-row">
                        {/* Column Name & Key Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                          {f.isPrimaryKey && (
                            <span className="erd-badge-pk" title="Primary Key">
                              <Key size={10} /> PK
                            </span>
                          )}
                          {f.isForeignKey && (
                            <span className="erd-badge-fk" title={f.foreignTarget ? `References ${f.foreignTarget}` : 'Foreign Key'}>
                              FK
                            </span>
                          )}
                          {f.isUnique && !f.isPrimaryKey && (
                            <span className="erd-badge-unique" title="Unique Constraint">
                              UQ
                            </span>
                          )}
                          <span style={{ fontWeight: f.isPrimaryKey ? 800 : 600, color: f.isPrimaryKey ? 'var(--accent-amber, #D97706)' : 'var(--db-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </span>
                        </div>

                        {/* Column Data Type */}
                        <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--db-text-secondary)', marginLeft: 8, marginRight: 8 }}>
                          {f.type}
                          {!f.isNullable && <span style={{ color: '#EF4444', marginLeft: 2 }} title="Required / NOT NULL">*</span>}
                        </div>

                        {/* Row Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditField(entity.name, fIdx, f);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer', padding: 2 }}
                            title="Edit field constraints & types"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteField(entity.name, fIdx);
                            }}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}
                            title="Delete field"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Entity Footer Stats */}
                  <div style={{ padding: '6px 12px', fontSize: '0.68rem', color: 'var(--db-text-muted)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--db-surface-muted)', borderTop: '1px solid var(--db-border)' }}>
                    <span>{(entity.fields || []).length} columns</span>
                    <span>
                      {(entity.fields || []).filter(f => f.isPrimaryKey).length} PK &bull; {(entity.fields || []).filter(f => f.isForeignKey).length} FK
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Relationships Matrix & Cardinality Visualizer */}
      <div style={{ padding: 18, backgroundColor: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 8, boxShadow: 'var(--db-card-shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Share2 size={16} color="var(--accent-amber, #D97706)" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              Foreign Key Relationships ({relations.length})
            </h4>
          </div>
          <button
            type="button"
            onClick={onAddRelation}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.725rem' }}
          >
            <Plus size={12} /> Add Foreign Key
          </button>
        </div>

        {relations.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--db-text-muted)', padding: 12, backgroundColor: 'var(--db-surface-muted)', border: '1px solid var(--db-border)', borderRadius: 6 }}>
            No foreign key relationships declared yet. Click "Add Foreign Key" to link tables.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
            {relations.map((rel, rIdx) => {
              const [fromT, fromC] = (rel.from || '').split('.');
              const [toT, toC] = (rel.to || '').split('.');

              return (
                <div
                  key={rIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 6,
                    backgroundColor: 'var(--db-surface-muted)',
                    border: '1px solid var(--db-border)',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 700, color: 'var(--db-text-primary)' }}>
                      <code>{fromT}.{fromC}</code>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        backgroundColor: 'rgba(217, 119, 6, 0.15)',
                        color: 'var(--accent-amber, #D97706)',
                        border: '1px solid rgba(217, 119, 6, 0.3)',
                        padding: '1px 6px',
                        borderRadius: 4
                      }}
                    >
                      {rel.type || 'Many-to-One'}
                    </span>
                    <ChevronRight size={14} color="var(--db-text-muted)" />
                    <div style={{ fontWeight: 700, color: '#2563EB' }}>
                      <code>{toT}.{toC}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => onEditRelation(rIdx, rel)}
                      style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer', padding: 4 }}
                      title="Edit relationship"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRelation(rIdx)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                      title="Delete relationship"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

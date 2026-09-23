import React from 'react';
import {
  Layers,
  ArrowRight,
  Database,
  Webhook,
  Server,
  Key,
  CheckCircle2
} from 'lucide-react';
import { generateTraceabilityMatrix } from '../databaseViewModel';

export const ApiTraceabilitySection = ({
  endpoints = [],
  entities = [],
  relations = []
}) => {
  const traceability = React.useMemo(() => {
    return generateTraceabilityMatrix(endpoints, entities, relations);
  }, [endpoints, entities, relations]);

  return (
    <div style={{ padding: 20, backgroundColor: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 8, boxShadow: 'var(--db-card-shadow)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="var(--accent-amber, #D97706)" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              API ↔ Database Traceability Matrix
            </h4>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--db-text-muted)' }}>
            Dynamic end-to-end dependency pipeline mapping REST routes to transactional services, primary entities, joins, and active fields.
          </p>
        </div>

        <span style={{ fontSize: '0.72rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
          <CheckCircle2 size={13} /> {traceability.length} Traced Pipelines
        </span>
      </div>

      {/* Traceability Flow Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {traceability.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--db-surface-muted)',
              border: '1px solid var(--db-border)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            {/* Visual Pipeline Strip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                fontSize: '0.78rem'
              }}
            >
              {/* Step 1: API Endpoint */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(37,99,235,0.12)', padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(37,99,235,0.3)' }}>
                <Webhook size={12} color="#2563EB" />
                <span style={{ fontWeight: 800, color: '#2563EB' }}>{item.method}</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--db-text-primary)', fontWeight: 600 }}>{item.endpoint}</span>
              </div>

              <ArrowRight size={14} color="var(--db-text-muted)" />

              {/* Step 2: Service / Operation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(217,119,6,0.12)', padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(217,119,6,0.3)' }}>
                <Server size={12} color="var(--accent-amber, #D97706)" />
                <span style={{ fontWeight: 700, color: 'var(--accent-amber, #D97706)' }}>{item.service}</span>
              </div>

              <ArrowRight size={14} color="var(--db-text-muted)" />

              {/* Step 3: Primary Database Entity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.12)', padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(16,185,129,0.3)' }}>
                <Database size={12} color="#059669" />
                <span style={{ fontWeight: 800, color: '#059669' }}>{item.primaryEntity}</span>
              </div>

              {/* Step 4: Related Joined Entities (if any) */}
              {item.relatedEntities && item.relatedEntities.length > 0 && (
                <>
                  <span style={{ color: 'var(--db-text-muted)', fontWeight: 700 }}>+</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'var(--db-chip-bg)', border: '1px solid var(--db-border)', padding: '4px 8px', borderRadius: 4 }}>
                    <span style={{ color: 'var(--db-text-primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {item.relatedEntities.join(', ')}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Step 5: Fields Used */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--db-text-muted)', paddingLeft: 4 }}>
              <span style={{ fontWeight: 600 }}>Fields Utilized:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(item.fieldsUsed || []).map((fieldName, fIdx) => (
                  <span
                    key={fIdx}
                    style={{
                      fontFamily: 'monospace',
                      padding: '1px 6px',
                      backgroundColor: 'var(--db-surface)',
                      borderRadius: 3,
                      color: 'var(--db-text-secondary)',
                      border: '1px solid var(--db-border)'
                    }}
                  >
                    {fieldName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

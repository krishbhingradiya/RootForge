import React, { useState } from 'react';
import { X, Webhook } from 'lucide-react';

export const ApiEditModal = ({
  isOpen,
  onClose,
  entities = [],
  endpoints = [],
  initialEndpoint = null,
  endpointIndex = null,
  onSave
}) => {
  const [method, setMethod] = useState(initialEndpoint?.method || 'POST');
  const [endpoint, setEndpoint] = useState(initialEndpoint?.endpoint || '/api/v1/');
  const [purpose, setPurpose] = useState(initialEndpoint?.purpose || '');
  const [description, setDescription] = useState(initialEndpoint?.description || '');
  const [primaryEntity, setPrimaryEntity] = useState(initialEndpoint?.primaryEntity || entities[0]?.name || '');
  const [parameters, setParameters] = useState(initialEndpoint?.parameters || 'None');
  const [requestBody, setRequestBody] = useState(initialEndpoint?.requestBody || '{\n  \n}');
  const [responseBody, setResponseBody] = useState(initialEndpoint?.responseBody || '{\n  "status": "OK"\n}');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Helper to generate schema-accurate payloads from actual entity fields
  const handleGeneratePayloadFromEntity = () => {
    const targetEntity = entities.find(e => e.name.toLowerCase() === (primaryEntity || '').toLowerCase()) || entities[0];
    if (!targetEntity) return;

    const reqObj = {};
    const resObj = { id: 'uuid-sample-123' };

    (targetEntity.fields || []).forEach(f => {
      let sampleVal = 'value';
      const typeLower = (f.type || '').toLowerCase();
      if (typeLower.includes('int') || typeLower.includes('serial')) sampleVal = 100;
      else if (typeLower.includes('bool')) sampleVal = true;
      else if (typeLower.includes('date') || typeLower.includes('timestamp')) sampleVal = new Date().toISOString();
      else if (typeLower.includes('decimal') || typeLower.includes('float') || typeLower.includes('double')) sampleVal = 99.95;
      else if (f.name.toLowerCase().includes('email')) sampleVal = 'user@example.com';
      else if (f.name.toLowerCase().includes('status')) sampleVal = 'ACTIVE';
      else sampleVal = `${f.name}_sample`;

      if (!f.isPrimaryKey) {
        reqObj[f.name] = sampleVal;
      }
      resObj[f.name] = sampleVal;
    });

    resObj.createdAt = new Date().toISOString();

    setRequestBody(JSON.stringify(reqObj, null, 2));
    setResponseBody(JSON.stringify(resObj, null, 2));
    if (!purpose) {
      setPurpose(method === 'GET' ? `Fetch ${targetEntity.name} details` : `Create or update ${targetEntity.name} record`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmedPath = endpoint.trim();

    if (!trimmedPath) {
      setErrorMsg('Route path is required');
      return;
    }
    if (!trimmedPath.startsWith('/')) {
      setErrorMsg('Route path must start with a leading slash (e.g. /api/v1/...)');
      return;
    }
    if (/\s/.test(trimmedPath)) {
      setErrorMsg('Route path cannot contain whitespace');
      return;
    }

    // Check duplicate routes (excluding current editing endpoint)
    const isDuplicate = endpoints.some((ep, idx) => {
      if (endpointIndex !== null && endpointIndex !== undefined && idx === endpointIndex) return false;
      return (ep.method || '').toUpperCase() === method.toUpperCase() && (ep.endpoint || '').trim() === trimmedPath;
    });

    if (isDuplicate) {
      setErrorMsg(`Endpoint [${method} ${trimmedPath}] already exists. Please choose a unique route path.`);
      return;
    }

    onSave(endpointIndex, {
      method,
      endpoint: trimmedPath,
      purpose: purpose.trim() || `Operations for ${primaryEntity}`,
      description: description.trim() || purpose.trim(),
      primaryEntity: primaryEntity || entities[0]?.name || 'System',
      parameters: parameters.trim() || 'None',
      requestBody: requestBody.trim(),
      responseBody: responseBody.trim(),
      authentication: initialEndpoint?.authentication || 'Bearer JWT',
      statusCodes: initialEndpoint?.statusCodes || [
        { code: method === 'POST' ? 201 : 200, description: 'Success' },
        { code: 400, description: 'Bad Request' },
        { code: 401, description: 'Unauthorized' }
      ]
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
          width: '600px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--db-border)', backgroundColor: 'var(--db-surface-header)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Webhook size={18} color="var(--accent-amber, #D97706)" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--db-text-primary)' }}>
              {initialEndpoint ? 'Edit REST API Endpoint' : 'Declare REST API Endpoint'}
            </h4>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--db-text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: 'var(--db-surface)' }}>
          {errorMsg && (
            <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', fontSize: '0.78rem', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {/* Method & Path */}
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--db-surface-muted)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-text-primary)',
                  fontWeight: 700
                }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>Route Path *</label>
              <input
                type="text"
                required
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={`/api/v1/${primaryEntity ? primaryEntity.toLowerCase() + 's' : 'records'}`}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--db-surface-muted)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-text-primary)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Primary Entity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)' }}>Primary Operating Entity</label>
              <button
                type="button"
                onClick={handleGeneratePayloadFromEntity}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-amber, #D97706)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ⚡ Auto-fill Payloads from Entity Schema
              </button>
            </div>
            <select
              value={primaryEntity}
              onChange={(e) => setPrimaryEntity(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '0.8rem',
                backgroundColor: 'var(--db-surface-muted)',
                border: '1px solid var(--db-border)',
                borderRadius: 6,
                color: 'var(--db-text-primary)'
              }}
            >
              {entities.map(e => (
                <option key={e.name} value={e.name}>{e.name} ({e.fields?.length || 0} fields)</option>
              ))}
            </select>
          </div>

          {/* Purpose & Parameters */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>Purpose & Scope</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Create or manage transactional records"
              style={{
                width: '100%',
                padding: '7px 10px',
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
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>Parameters (Query / Path)</label>
            <input
              type="text"
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              placeholder="e.g. ?page=1&status=ACTIVE or :id (UUID)"
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '0.8rem',
                backgroundColor: 'var(--db-surface-muted)',
                border: '1px solid var(--db-border)',
                borderRadius: 6,
                color: 'var(--db-text-primary)',
                outline: 'none'
              }}
            />
          </div>

          {/* Request / Response JSON */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>Example Request Payload (JSON)</label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                style={{
                  width: '100%',
                  height: 110,
                  padding: 8,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--db-code-bg)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-code-text)',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--db-text-muted)', display: 'block', marginBottom: 3 }}>Example Response Payload (JSON)</label>
              <textarea
                value={responseBody}
                onChange={(e) => setResponseBody(e.target.value)}
                style={{
                  width: '100%',
                  height: 110,
                  padding: 8,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--db-code-bg)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 6,
                  color: 'var(--db-code-text)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
              {initialEndpoint ? 'Save Endpoint' : 'Create Endpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

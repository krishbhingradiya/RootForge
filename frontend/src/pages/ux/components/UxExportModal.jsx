import React, { useState } from 'react';
import { Download, X, FileText, CheckCircle2, FileCode, Layers, BookOpen } from 'lucide-react';
import {
  generateUxJsonBlob,
  generateUxPdfBlob,
  generateUxDocxBlob,
  generateUxPptxBlob
} from '../services/uxExportGenerators';
import { showToast } from '../../../components/common/Toast';

export const UxExportModal = ({
  ux,
  onClose
}) => {
  const [format, setFormat] = useState('json');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);

      let blob;
      let ext = format;

      if (format === 'json') {
        blob = generateUxJsonBlob(ux);
        ext = 'json';
      } else if (format === 'pdf') {
        blob = generateUxPdfBlob(ux);
        ext = 'pdf';
      } else if (format === 'docx') {
        blob = await generateUxDocxBlob(ux);
        ext = 'docx';
      } else if (format === 'pptx') {
        blob = await generateUxPptxBlob(ux);
        ext = 'pptx';
      }

      if (!blob) {
        throw new Error('Failed to generate file blob.');
      }

      const safeTitle = (ux?.title || 'ux-design').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filename = `${safeTitle}-v${ux?.version || 1}.${ext}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${format.toUpperCase()} (${filename})`);
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed. Please check file format.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const FORMATS = [
    {
      id: 'json',
      label: 'Raw JSON Specification',
      ext: '.json',
      badge: 'SCHEMA',
      desc: 'Complete schema-compliant tokens, screens, widgets, and quality metrics in raw JSON format',
      color: '#10B981'
    },
    {
      id: 'pdf',
      label: 'PDF Specification Document',
      ext: '.pdf',
      badge: 'PRINT READY',
      desc: 'Multi-page vector PDF document with executive domain context, design tokens, screen architecture & user flows',
      color: '#EF4444'
    },
    {
      id: 'docx',
      label: 'Microsoft Word Document',
      ext: '.docx',
      badge: 'WORD DOC',
      desc: 'Native Microsoft Word OpenXML document with formatted headings, tables, and requirements traceability',
      color: '#2563EB'
    },
    {
      id: 'pptx',
      label: 'PowerPoint Slide Deck',
      ext: '.pptx',
      badge: 'SLIDES',
      desc: 'Native Microsoft PowerPoint presentation (.pptx) with dedicated executive overview, design system, and screen slides',
      color: '#F59E0B'
    }
  ];

  return (
    <div className="ux-modal-backdrop">
      <div className="ux-modal-dialog" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={19} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Export UX Specifications & Architecture
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Format Selection List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FORMATS.map((f) => {
            const isSelected = format === f.id;
            return (
              <div
                key={f.id}
                onClick={() => setFormat(f.id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      backgroundColor: `${f.color}15`,
                      border: `1px solid ${f.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: f.color,
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      flexShrink: 0
                    }}
                  >
                    {f.ext}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {f.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: `${f.color}18`,
                          color: f.color
                        }}
                      >
                        {f.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.35 }}>
                      {f.desc}
                    </p>
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  {isSelected ? (
                    <CheckCircle2 size={18} color="var(--accent-amber)" />
                  ) : (
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '1px solid var(--border-medium)'
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 4 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Domain: <strong style={{ color: 'var(--text-primary)' }}>{ux?.understanding?.domain || 'Enterprise Operational'}</strong> • v{ux?.version || 1}
          </span>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={downloading}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700, minWidth: 140, justifyContent: 'center' }}
            >
              <Download size={14} /> {downloading ? 'Generating...' : `Export ${format.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

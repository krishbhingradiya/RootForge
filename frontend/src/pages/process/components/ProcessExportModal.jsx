import React, { useState } from 'react';
import {
  X,
  Download,
  FileText,
  Printer,
  Table,
  Sliders,
  Code2,
  Check,
  Sparkles
} from 'lucide-react';
import {
  generateBpmnXml,
  generateProcessMarkdown,
  generateProcessCsv,
  generatePptxOutline
} from '../processViewModel';

export const ProcessExportModal = ({ isOpen, onClose, vm }) => {
  const [copiedFormat, setCopiedFormat] = useState(null);

  if (!isOpen || !vm) return null;

  const sanitizeFilename = (name) => {
    return (name || 'process_workflow').toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  const downloadBlob = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format) => {
    const baseName = `${sanitizeFilename(vm.title)}_v${vm.version}`;

    switch (format) {
      case 'PDF': {
        window.print();
        break;
      }
      case 'WORD': {
        const md = generateProcessMarkdown(vm);
        downloadBlob(md, `${baseName}.doc`, 'application/msword');
        break;
      }
      case 'CSV': {
        const csv = generateProcessCsv(vm);
        downloadBlob(csv, `${baseName}.csv`, 'text/csv;charset=utf-8;');
        break;
      }
      case 'PPTX': {
        const pptx = generatePptxOutline(vm);
        downloadBlob(JSON.stringify(pptx, null, 2), `${baseName}_presentation_outline.json`, 'application/json');
        break;
      }
      case 'JSON': {
        const json = JSON.stringify(vm.graph || vm, null, 2);
        downloadBlob(json, `${baseName}_processgraph.json`, 'application/json');
        break;
      }
      case 'BPMN': {
        const xml = generateBpmnXml(vm);
        downloadBlob(xml, `${baseName}.bpmn`, 'application/xml');
        break;
      }
      default:
        break;
    }

    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  const EXPORT_OPTIONS = [
    {
      id: 'BPMN',
      title: 'BPMN 2.0 XML Diagram',
      description: 'Standard BPMN 2.0 XML executable format compatible with Camunda, Signavio, and draw.io.',
      ext: '.bpmn',
      icon: <Sliders size={20} color="var(--accent-amber)" />
    },
    {
      id: 'PDF',
      title: 'Printable PDF Specification',
      description: 'Executive formatted report ready for printing or saving as PDF via browser print.',
      ext: '.pdf',
      icon: <Printer size={20} color="#EF4444" />
    },
    {
      id: 'WORD',
      title: 'Word / DOCX Technical Spec',
      description: 'Comprehensive technical specification document with matrices and governance chains.',
      ext: '.doc',
      icon: <FileText size={20} color="#2563EB" />
    },
    {
      id: 'CSV',
      title: 'Excel / CSV Step Matrix',
      description: 'Full tabular matrix containing execution semantics, SLAs, retry policies, and requirements.',
      ext: '.csv',
      icon: <Table size={20} color="#10B981" />
    },
    {
      id: 'JSON',
      title: 'Canonical ProcessGraph JSON',
      description: 'Complete serialized single-source-of-truth ProcessGraph with typed nodes and edges.',
      ext: '.json',
      icon: <Code2 size={20} color="#8B5CF6" />
    },
    {
      id: 'PPTX',
      title: 'PowerPoint Presentation Outline',
      description: 'Executive presentation slide outline summarizing business context, swimlanes, and AI optimizations.',
      ext: '.json',
      icon: <Sparkles size={20} color="var(--accent-amber)" />
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={18} color="var(--accent-amber)" />
            <h4 style={{ fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Export Process Workflow Architecture
            </h4>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Formats Grid */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
            Select an enterprise export format. All exports are generated dynamically from the canonical single-source-of-truth <strong>ProcessGraph (v{vm.version})</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {EXPORT_OPTIONS.map((opt) => {
              const isDownloaded = copiedFormat === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleExport(opt.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-amber)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ marginTop: 2 }}>{opt.icon}</div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {opt.title}
                      </span>
                      <span className="badge badge-gray" style={{ fontSize: '0.62rem' }}>
                        {opt.ext}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                      {opt.description}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      {isDownloaded ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-green-text)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} /> Downloaded!
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-amber-text)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Download size={11} /> Download {opt.id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

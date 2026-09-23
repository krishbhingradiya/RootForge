import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import {
  Share2,
  Download,
  FileText,
  Printer,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Eye,
  X,
  Presentation,
  AlertCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

const FORMAT_LABELS = {
  PDF_HTML: { label: 'Executive PDF', badgeClass: 'badge-green', icon: Printer },
  PPTX: { label: 'PowerPoint Deck (PPTX)', badgeClass: 'badge-amber', icon: Presentation },
  MARKDOWN: { label: 'Markdown Specification', badgeClass: 'badge-blue', icon: FileText },
  JSON: { label: 'Structured JSON Bundle', badgeClass: 'badge-blue', icon: FileCode },
  CSV_TASKS: { label: 'Tasks & Sprints CSV', badgeClass: 'badge-gray', icon: FileSpreadsheet }
};

export const ExportCenterPage = () => {
  const { id } = useParams();
  const { t } = useLanguage();

  const [exportJobs, setExportJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const loadExports = async () => {
    try {
      setLoading(true);
      const res = await api.getExports(id);
      setExportJobs(res.jobs || []);
    } catch (err) {
      console.error('Failed to load export jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExports();
  }, [id]);

  /**
   * Triggers export download or browser printing for all 5 formats
   */
  const handleExport = async (format, scope = 'COMPLETE') => {
    try {
      setGenerating(true);
      const res = await api.generateExport(id, format, scope);
      showToast(`Deliverable generated: ${res.filename}`);
      loadExports();

      if (format === 'PDF_HTML') {
        // Open printable executive report in new tab
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(res.content);
          win.document.close();
        } else {
          // If popup blocked, fallback to blob URL
          const blob = new Blob([res.content], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      } else if (format === 'PPTX' && res.base64) {
        // Convert base64 to PPTX binary blob and download
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = res.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Text-based downloads (Markdown, JSON, CSV)
        const mimeType = format === 'JSON'
          ? 'application/json'
          : format === 'CSV_TASKS'
            ? 'text/csv'
            : 'text/markdown';

        const blob = new Blob([res.content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = res.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      showToast(err.message || 'Export generation failed', 'error');
      loadExports();
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Fetches preview content without triggering download
   */
  const handlePreview = async (format) => {
    try {
      setPreviewLoading(true);
      setActiveSlideIndex(0);
      const res = await api.previewExport(id, format, 'COMPLETE');
      setPreviewData(res);
    } catch (err) {
      showToast(err.message || 'Preview generation failed', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t.exports.title}</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {t.exports.subtitle}
        </p>
      </div>

      {/* Hero Banner: Complete Solution Export */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1E293B 100%)',
          color: '#FAF8F5',
          padding: '28px 32px',
          borderRadius: 14,
          border: '1px solid #334155'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                {t.exports.primaryDeliverable}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{t.exports.stageSynthesis}</span>
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', marginBottom: 6 }}>
              {t.exports.blueprintTitle}
            </h2>

            <p style={{ color: '#CBD5E1', maxWidth: 640, fontSize: '0.88rem', lineHeight: 1.55 }}>
              {t.exports.blueprintDesc}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleExport('PDF_HTML')}
              disabled={generating}
              className="btn btn-primary btn-lg"
              style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Printer size={18} />
              {t.exports.printReport}
            </button>

            <button
              onClick={() => handleExport('PPTX')}
              disabled={generating}
              className="btn btn-secondary btn-lg"
              style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber-text)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
            >
              <Presentation size={18} />
              {t.exports.pptxReport}
            </button>

            <button
              onClick={() => handleExport('MARKDOWN')}
              disabled={generating}
              className="btn btn-secondary btn-lg"
              style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FileText size={18} />
              {t.exports.markdownReport}
            </button>
          </div>
        </div>
      </div>

      {/* Specialized Deliverable Formats Grid (5 cards) */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14 }}>
          {t.exports.specializedFormats}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
          
          {/* 1. PDF / HTML Executive Document */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Printer size={20} color="var(--accent-green)" />
                <h4 style={{ fontWeight: 700 }}>{t.exports.pdfDocTitle}</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                {t.exports.pdfDocDesc}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleExport('PDF_HTML')}
                disabled={generating}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                <Download size={14} /> {t.exports.generatePrint}
              </button>
              <button
                onClick={() => handlePreview('PDF_HTML')}
                disabled={previewLoading}
                className="btn btn-outline btn-sm"
                title="Preview deliverable"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>

          {/* 2. PowerPoint (PPTX) Deck */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Presentation size={20} color="var(--accent-amber)" />
                <h4 style={{ fontWeight: 700 }}>{t.exports.pptxDocTitle}</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                {t.exports.pptxDocDesc}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleExport('PPTX')}
                disabled={generating}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}
              >
                <Download size={14} /> {t.exports.downloadPptx}
              </button>
              <button
                onClick={() => handlePreview('PPTX')}
                disabled={previewLoading}
                className="btn btn-outline btn-sm"
                title="Preview slides"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>

          {/* 3. Markdown Specification */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileText size={20} color="var(--accent-blue)" />
                <h4 style={{ fontWeight: 700 }}>{t.exports.mdDocTitle}</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                {t.exports.mdDocDesc}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleExport('MARKDOWN')}
                disabled={generating}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                <Download size={14} /> {t.exports.downloadMd}
              </button>
              <button
                onClick={() => handlePreview('MARKDOWN')}
                disabled={previewLoading}
                className="btn btn-outline btn-sm"
                title="Preview Markdown"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>

          {/* 4. Structured JSON Bundle */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileCode size={20} color="#059669" />
                <h4 style={{ fontWeight: 700 }}>{t.exports.jsonDocTitle}</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                {t.exports.jsonDocDesc}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleExport('JSON')}
                disabled={generating}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                <Download size={14} /> {t.exports.downloadJson}
              </button>
              <button
                onClick={() => handlePreview('JSON')}
                disabled={previewLoading}
                className="btn btn-outline btn-sm"
                title="Preview JSON"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>

          {/* 5. Tasks & Sprints CSV */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <FileSpreadsheet size={20} color="var(--accent-amber)" />
                <h4 style={{ fontWeight: 700 }}>{t.exports.csvDocTitle}</h4>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                {t.exports.csvDocDesc}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleExport('CSV_TASKS')}
                disabled={generating}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                <Download size={14} /> {t.exports.downloadCsv}
              </button>
              <button
                onClick={() => handlePreview('CSV_TASKS')}
                disabled={previewLoading}
                className="btn btn-outline btn-sm"
                title="Preview CSV"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Recent Export Records Table */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{t.exports.recentRecords}</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exportJobs.length} records logged</span>
        </div>

        {exportJobs.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t.exports.noRecords}</div>
        ) : (
          <div className="table-responsive">
            <table className="enterprise-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>{t.exports.tableScope}</th>
                  <th>{t.exports.tableFormat}</th>
                  <th>{t.exports.tableVersion || 'Version'}</th>
                  <th>{t.exports.tableStatus}</th>
                  <th>{t.exports.tableGeneratedBy || 'Generated By'}</th>
                  <th>{t.exports.tableTimestamp}</th>
                </tr>
              </thead>
              <tbody>
                {exportJobs.map((job) => {
                  const isCompleted = job.status === 'COMPLETED';
                  const isFailed = job.status === 'FAILED';
                  return (
                    <tr key={job.id}>
                      <td style={{ fontWeight: 600 }}>{job.scope}</td>
                      <td>
                        <span className="badge badge-gray">{job.format}</span>
                      </td>
                      <td>v{job.versionNumber || '1.0'}</td>
                      <td>
                        <span
                          className={`badge ${
                            isCompleted ? 'badge-green' : isFailed ? 'badge-red' : 'badge-amber'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {job.generatedBy?.name || 'System / Elena'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════ Interactive Deliverable Preview Modal ═══════════════════════ */}
      {previewData && (
        <div className="modal-overlay" onClick={() => setPreviewData(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 960, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h4 style={{ fontWeight: 800, margin: 0, fontSize: '1.05rem' }}>
                    {t.exports.previewTitle}: {previewData.filename}
                  </h4>
                  <span className="badge badge-amber">{previewData.version}</span>
                  <span className="badge badge-blue">{previewData.format}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Generated: {new Date(previewData.generatedAt).toLocaleString()}
                  {previewData.slideCount ? ` · ${previewData.slideCount} Slides` : ''}
                  {previewData.sectionCount ? ` · ${previewData.sectionCount} Canonical Sections` : ''}
                </div>
              </div>
              <button
                onClick={() => setPreviewData(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Custom Preview Renderer */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, backgroundColor: 'var(--bg-subtle)' }}>
              
              {/* 1. PDF / HTML Preview: Live Rendered View */}
              {previewData.format === 'PDF_HTML' && (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <iframe
                    title="Deliverable HTML Preview"
                    srcDoc={previewData.previewContent}
                    style={{ width: '100%', height: '560px', border: 'none' }}
                  />
                </div>
              )}

              {/* 2. PPTX Preview: Slide Deck Carousel */}
              {previewData.format === 'PPTX' && Array.isArray(previewData.previewContent) && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      Slide {activeSlideIndex + 1} of {previewData.previewContent.length}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={activeSlideIndex === 0}
                        onClick={() => setActiveSlideIndex(prev => Math.max(0, prev - 1))}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={activeSlideIndex === previewData.previewContent.length - 1}
                        onClick={() => setActiveSlideIndex(prev => Math.min(previewData.previewContent.length - 1, prev + 1))}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Active Slide Card */}
                  {(() => {
                    const slide = previewData.previewContent[activeSlideIndex];
                    return (
                      <div style={{
                        backgroundColor: '#0B0F17',
                        color: '#FFFFFF',
                        borderRadius: 10,
                        padding: 32,
                        minHeight: 380,
                        border: '1px solid #232B3E',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-amber)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                            {slide.category}
                          </div>
                          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 20px 0', color: '#FFFFFF' }}>
                            {slide.title}
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {slide.bullets.map((b, i) => (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                backgroundColor: '#141A26', padding: '10px 14px', borderRadius: 6,
                                border: '1px solid #232B3E', fontSize: '0.88rem', color: '#CBD5E1'
                              }}>
                                <span style={{ color: 'var(--accent-amber)', fontWeight: 800 }}>•</span>
                                <span style={{ flex: 1 }}>{b}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 14, borderTop: '1px solid #232B3E', fontSize: '0.72rem', color: '#64748B' }}>
                          <span>RootForge Executive Slide Deck</span>
                          <span>Slide {slide.slideNumber} of {previewData.previewContent.length}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 3. Markdown Preview */}
              {previewData.format === 'MARKDOWN' && (
                <pre style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  padding: 16,
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)'
                }}>
                  {previewData.previewContent}
                </pre>
              )}

              {/* 4. JSON Preview */}
              {previewData.format === 'JSON' && (
                <pre style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.45,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  padding: 16,
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)'
                }}>
                  {previewData.previewContent}
                </pre>
              )}

              {/* 5. CSV Preview */}
              {previewData.format === 'CSV_TASKS' && (
                <div className="table-responsive" style={{ backgroundColor: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  <table className="enterprise-table" style={{ margin: 0, fontSize: '0.75rem', minWidth: 500 }}>
                    <tbody>
                      {previewData.previewContent.split('\n').filter(Boolean).map((row, rIdx) => {
                        const cols = row.split(',').map(c => c.replace(/^"|"$/g, ''));
                        return (
                          <tr key={rIdx} style={rIdx === 0 ? { backgroundColor: 'var(--bg-subtle)', fontWeight: 700 } : {}}>
                            {cols.map((cell, cIdx) => (
                              <td key={cIdx} style={{ padding: '6px 10px' }}>{cell}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Modal Footer: Direct Download Action */}
            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              backgroundColor: 'var(--bg-surface)'
            }}>
              <button
                className="btn btn-outline"
                onClick={() => setPreviewData(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const fmt = previewData.format;
                  setPreviewData(null);
                  handleExport(fmt);
                }}
              >
                <Download size={14} /> Download This Deliverable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

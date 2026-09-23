import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  FileText,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ChatMessageSpeaker } from './ChatVoiceControl';
import { renderFormattedText } from './chatTextFormatter';

/**
 * Enterprise Structured AI Consultant Card.
 * 
 * Accurately demarcates:
 * - Direct Answer (Summary)
 * - Evidence & Document Facts (DOCUMENT_FACT, USER_PROVIDED_FACT, SYSTEM_FACT)
 * - Inferences (deductions from evidence)
 * - Architectural Recommendations (proposed options, never conflated with facts)
 * - Requirements Elicited
 * - Open Questions (missing data to validate)
 * - Verified Sources (document, section, page)
 */
export const StructuredConsultantCard = ({
  messageId = null,
  data,
  onAdvance = null,
  lang = 'en',
  compact = false
}) => {
  const { t } = useLanguage();
  const [showFacts, setShowFacts] = useState(true);
  const [showInferences, setShowInferences] = useState(true);
  const [showRecs, setShowRecs] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);
  const [showSources, setShowSources] = useState(false);

  if (!data) return null;

  // Determine card language based on content script and props (Section 19)
  const fullContentStr = (typeof data.summary === 'string' ? data.summary : '') + JSON.stringify(data);
  const isGujaratiContent = /[\u0A80-\u0AFF]/.test(fullContentStr);
  const isHindiContent = /[\u0900-\u097F]/.test(fullContentStr);
  const cardLang = isGujaratiContent ? 'gu' : isHindiContent ? 'hi' : (lang || 'en');

  // Localized section headings strictly adhering to Section 19
  const labels = {
    aiConsultant: cardLang === 'gu' ? 'AI કન્સલ્ટન્ટ વિશ્લેષણ' : cardLang === 'hi' ? 'एआई सलाहकार विश्लेषण' : (t('chat.aiConsultant') || 'AI Consultant Synthesis'),
    summary: cardLang === 'gu' ? 'સારાંશ' : cardLang === 'hi' ? 'सारांश' : 'Summary',
    confirmedFacts: cardLang === 'gu' ? 'પુષ્ટિ થયેલા તથ્યો' : cardLang === 'hi' ? 'पुष्ट तथ्य' : (t('chat.confirmedFacts') || 'Evidence & Baseline Facts'),
    inferences: cardLang === 'gu' ? 'તારણો' : cardLang === 'hi' ? 'निष्कर्ष' : (t('chat.inferences') || 'Inferences & Logical Deductions'),
    requirements: cardLang === 'gu' ? 'ઓળખાયેલી આવશ્યકતાઓ' : cardLang === 'hi' ? 'आवश्यकताएं' : (t('chat.requirements') || 'Requirements Elicited'),
    recommendations: cardLang === 'gu' ? 'ભલામણો' : cardLang === 'hi' ? 'सिफारिशें' : (t('chat.recommendations') || 'Proposed Recommendations'),
    nextSteps: cardLang === 'gu' ? 'આગળના પગલાં' : cardLang === 'hi' ? 'अगले कदम' : (t('chat.nextSteps') || 'Next Steps'),
    openQuestions: cardLang === 'gu' ? 'ખુલ્લા પ્રશ્નો' : cardLang === 'hi' ? 'खुले प्रश्न' : (t('chat.openQuestions') || 'Open Questions & Missing Information'),
    sources: cardLang === 'gu' ? 'સ્ત્રોતો' : cardLang === 'hi' ? 'स्रोत' : (t('chat.documentCitations') || 'Document Citations & Traceability'),
    basis: cardLang === 'gu' ? 'આધાર:' : cardLang === 'hi' ? 'आधार:' : (t('chat.basis') || 'Basis:'),
    rationale: cardLang === 'gu' ? 'તાર્કિક કારણ:' : cardLang === 'hi' ? 'तर्क:' : (t('chat.rationale') || 'Rationale:'),
    impact: cardLang === 'gu' ? 'અસર:' : cardLang === 'hi' ? 'प्रभाव:' : (t('chat.impact') || 'Impact:'),
    source: cardLang === 'gu' ? 'સ્ત્રોત:' : cardLang === 'hi' ? 'स्रोत:' : (t('chat.source') || 'Source:'),
    section: cardLang === 'gu' ? 'વિભાગ:' : cardLang === 'hi' ? 'अनुभाग:' : (t('chat.section') || 'Section:'),
    page: cardLang === 'gu' ? 'પૃષ્ઠ:' : cardLang === 'hi' ? 'पृष्ठ:' : (t('chat.page') || 'Page:')
  };

  const status = data.status || 'PROPOSED';
  const statusColor = status === 'CONFIRMED' ? '#059669' : status === 'NEEDS_INPUT' ? '#2563EB' : status === 'UNKNOWN' ? '#DC2626' : '#D97706';
  const statusBg = status === 'CONFIRMED' ? '#ECFDF5' : status === 'NEEDS_INPUT' ? '#EFF6FF' : status === 'UNKNOWN' ? '#FEF2F2' : '#FEF3C7';

  // Support both canonical and legacy keys
  const confirmedFacts = Array.isArray(data.confirmedFacts) ? data.confirmedFacts : [];
  const inferences = Array.isArray(data.inferences) ? data.inferences : [];
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
  const requirements = Array.isArray(data.requirements) ? data.requirements : [];
  const openQuestions = Array.isArray(data.openQuestions) ? data.openQuestions : [];
  const sources = Array.isArray(data.sources) ? data.sources : [];

  const speakerId = messageId || (data.id ? `card_${data.id}` : `card_${(data.summary || '').slice(0, 30)}`);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: compact ? '12px 14px' : '16px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 10 : 12,
        width: '100%'
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 8,
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            backgroundColor: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0
          }}>
            <Sparkles size={13} />
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 700 }}>
            {labels.aiConsultant}
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: statusColor,
              backgroundColor: statusBg,
              padding: '2px 6px',
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            {status}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChatMessageSpeaker messageId={speakerId} text={data.summary || ''} data={data} lang={cardLang} />
          {(data.suggestedNextAction || data.suggestedAction) && onAdvance && (
            <button
              onClick={onAdvance}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.72rem',
                padding: '4px 10px',
                borderColor: 'var(--accent-amber)',
                color: 'var(--accent-amber-text)'
              }}
            >
              <Sparkles size={12} color="var(--accent-amber)" />
              {data.suggestedNextAction || data.suggestedAction} <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Answer / Summary */}
      {data.summary && (
        <div
          style={{
            fontSize: compact ? '0.84rem' : '0.9rem',
            color: 'var(--text-primary)',
            lineHeight: 1.55,
            fontWeight: 500
          }}
        >
          {renderFormattedText(data.summary)}
        </div>
      )}

      {/* Confirmed Facts / Evidence Section */}
      {confirmedFacts.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 8, padding: '10px 14px' }}>
          <div
            onClick={() => setShowFacts(!showFacts)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <CheckCircle2 size={14} color="#059669" />
              <span>{labels.confirmedFacts} ({confirmedFacts.length})</span>
            </div>
            {showFacts ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
          </div>

          {showFacts && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {confirmedFacts.map((factItem, idx) => {
                const factText = typeof factItem === 'string' ? factItem : factItem.fact;
                const source = typeof factItem === 'object' ? factItem.source : null;
                const classification = typeof factItem === 'object' ? (factItem.classification || 'DOCUMENT_FACT') : 'DOCUMENT_FACT';
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#059669', fontWeight: 700 }}>•</span>
                    <div style={{ flex: 1 }}>
                      <span>{factText}</span>
                      <div style={{ display: 'inline-flex', gap: 4, marginLeft: 6, verticalAlign: 'middle' }}>
                        {classification && (
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: 4,
                            backgroundColor: '#ECFDF5',
                            color: '#065F46',
                            fontWeight: 700,
                            letterSpacing: '0.02em'
                          }}>
                            {classification}
                          </span>
                        )}
                        {source && (
                          <span style={{
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: '#E0F2FE',
                            color: '#0369A1',
                            fontWeight: 600
                          }}>
                            {source}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Inferences Section */}
      {inferences.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 8, padding: '10px 14px' }}>
          <div
            onClick={() => setShowInferences(!showInferences)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Compass size={14} color="#6366F1" />
              <span>{labels.inferences} ({inferences.length})</span>
            </div>
            {showInferences ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
          </div>

          {showInferences && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {inferences.map((inf, idx) => {
                const infText = typeof inf === 'string' ? inf : inf.inference;
                const basis = typeof inf === 'object' ? inf.basis : null;
                return (
                  <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: '#6366F1', fontWeight: 700 }}>→</span>
                      <div>
                        <span>{infText}</span>
                        {basis && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                            {labels.basis} {basis}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Requirements Section */}
      {requirements.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            {labels.requirements} ({requirements.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {requirements.map((req, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>{t('chat.reqPrefix') || 'REQ:'}</span>
                <div>
                  <span>{typeof req === 'string' ? req : req.statement}</span>
                  {typeof req === 'object' && req.source && (
                    <span style={{ marginLeft: 6, fontSize: '0.68rem', color: 'var(--text-muted)' }}>({req.source})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Section (Visually distinct from facts) */}
      {recommendations.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--accent-amber)' }}>
          <div
            onClick={() => setShowRecs(!showRecs)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Lightbulb size={14} color="var(--accent-amber)" />
              <span>{labels.recommendations} ({recommendations.length})</span>
            </div>
            {showRecs ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
          </div>

          {showRecs && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {recommendations.map((rec, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {typeof rec === 'string' ? rec : rec.title}
                    </span>
                    {typeof rec === 'object' && rec.category && (
                      <span style={{
                        fontSize: '0.62rem',
                        padding: '1px 5px',
                        borderRadius: 4,
                        backgroundColor: 'rgba(217, 119, 6, 0.1)',
                        color: 'var(--accent-amber-text)',
                        fontWeight: 700
                      }}>
                        {rec.category}
                      </span>
                    )}
                  </div>
                  {typeof rec === 'object' && rec.details && (
                    <div style={{ fontSize: '0.78rem', marginTop: 2, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {rec.details}
                    </div>
                  )}
                  {typeof rec === 'object' && rec.rationale && (
                    <div style={{ fontSize: '0.72rem', marginTop: 2, color: 'var(--accent-amber-text)', fontStyle: 'italic' }}>
                      {labels.rationale} {rec.rationale}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Open Questions Section */}
      {openQuestions.length > 0 && (
        <div style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: '10px 14px', border: '1px solid #FDE68A' }}>
          <div
            onClick={() => setShowQuestions(!showQuestions)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <HelpCircle size={14} color="var(--accent-amber)" />
              <span>{labels.openQuestions} ({openQuestions.length})</span>
            </div>
            {showQuestions ? <ChevronUp size={14} color="#92400E" /> : <ChevronDown size={14} color="#92400E" />}
          </div>

          {showQuestions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {openQuestions.map((q, idx) => {
                const qText = typeof q === 'string' ? q : q.question;
                const why = typeof q === 'object' ? q.whyItMatters : null;
                const area = typeof q === 'object' ? q.businessArea : null;
                return (
                  <div key={idx} style={{ fontSize: '0.8rem', color: '#78350F' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      {area && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, backgroundColor: '#FDE68A', color: '#78350F' }}>
                          {area}
                        </span>
                      )}
                      <span style={{ fontWeight: 600 }}>{qText}</span>
                    </div>
                    {why && <div style={{ fontSize: '0.72rem', color: '#92400E', marginTop: 2, fontStyle: 'italic' }}>{labels.impact} {why}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Verified Document Sources (Section 4 Enterprise format) */}
      {sources.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 8, padding: '8px 12px', border: '1px dashed var(--border-subtle)' }}>
          <div
            onClick={() => setShowSources(!showSources)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <FileText size={13} color="var(--text-muted)" />
              <span>{labels.sources} ({sources.length})</span>
            </div>
            {showSources ? <ChevronUp size={12} color="var(--text-muted)" /> : <ChevronDown size={12} color="var(--text-muted)" />}
          </div>

          {showSources && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {sources.map((s, idx) => (
                <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '4px 6px', backgroundColor: 'var(--bg-surface)', borderRadius: 4 }}>
                  <div><strong>{labels.source}</strong> {s.filename || 'Document'}</div>
                  {s.section && <div><strong>{labels.section}</strong> {s.section}</div>}
                  <div><strong>{labels.page}</strong> {s.page || (cardLang === 'gu' ? 'ઉપલબ્ધ નથી' : cardLang === 'hi' ? 'उपलब्ध नहीं' : 'Not available')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

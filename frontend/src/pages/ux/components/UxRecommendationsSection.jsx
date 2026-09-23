import React, { useState } from 'react';
import { Lightbulb, Check, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const UxRecommendationsSection = ({
  recommendations,
  designExplanation,
  onToggleRecommendation
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lightbulb size={18} color="var(--accent-amber)" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Actionable UX Recommendations & Design Rationale
          </h2>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          1-click ergonomic optimizations
        </span>
      </div>

      {/* Recommendations Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {(recommendations || []).map((rec) => (
          <div
            key={rec.id}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: rec.applied ? '1px solid var(--accent-green)' : '1px solid var(--border-subtle)',
              backgroundColor: rec.applied ? 'var(--accent-green-light)' : 'var(--bg-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className={`badge ${rec.impact === 'HIGH' ? 'badge-amber' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                  {rec.impact} Impact
                </span>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {rec.type}
                </span>
              </div>

              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                {rec.title}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                {rec.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleRecommendation(rec.id)}
              className={`btn btn-sm ${rec.applied ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px', justifyContent: 'center' }}
            >
              <Check size={12} />
              {rec.applied ? 'Applied to UI' : 'Apply Recommendation'}
            </button>
          </div>
        ))}
      </div>

      {/* "Why AI Designed It This Way" Accordion */}
      {designExplanation && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'space-between', border: '1px solid var(--border-subtle)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.775rem' }}>
              <HelpCircle size={14} color="var(--accent-amber)" />
              Why AI Designed It This Way (Design Rationale & Strategy)
            </div>
            {showExplanation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showExplanation && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 10, padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                  Design Rationale
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {designExplanation.rationale}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                  Layout Strategy
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {designExplanation.layoutStrategy}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                  Primary CTA Placement
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {designExplanation.ctaPlacement}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                  Mobile Adaptation
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {designExplanation.mobileConsiderations}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

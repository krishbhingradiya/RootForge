import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import { calculateStage2HandoffGate } from '../../utils/handoffGate';
import {
  FileSearch,
  Sparkles,
  Edit3,
  Save,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Target,
  AlertOctagon,
  Users,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  HelpCircle,
  BookOpen,
  FileText,
  Clock,
  X,
  Link as LinkIcon,
  AlertTriangle,
  ExternalLink,
  Activity,
  CheckSquare,
  Building2,
  Database
} from 'lucide-react';

const TAXONOMY_CONFIG = {
  CONFIRMED_FACT: {
    bg: '#ECFDF5',
    text: '#065F46',
    border: '#A7F3D0',
    icon: CheckCircle2,
    defaultLabel: 'Confirmed Fact'
  },
  USER_PROVIDED_FACT: {
    bg: '#ECFDF5',
    text: '#065F46',
    border: '#A7F3D0',
    icon: CheckCircle2,
    defaultLabel: 'User Provided Fact'
  },
  DOCUMENT_FACT: {
    bg: '#EFF6FF',
    text: '#1E40AF',
    border: '#BFDBFE',
    icon: FileText,
    defaultLabel: 'Document Fact'
  },
  WORKSPACE_OBJECTIVE: {
    bg: '#F0FDF4',
    text: '#15803D',
    border: '#BBF7D0',
    icon: Target,
    defaultLabel: 'Workspace Objective'
  },
  DISCOVERY_FACT: {
    bg: '#EEF2FF',
    text: '#3730A3',
    border: '#C7D2FE',
    icon: Users,
    defaultLabel: 'Discovery Fact'
  },
  AI_INFERENCE: {
    bg: '#FAF5FF',
    text: '#6B21A8',
    border: '#E9D5FF',
    icon: Sparkles,
    defaultLabel: 'AI Inference'
  },
  PROPOSED_TARGET: {
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
    icon: Target,
    defaultLabel: 'Proposed Target'
  },
  PROJECTED_IMPACT: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#FCD34D',
    icon: TrendingUp,
    defaultLabel: 'Projected Impact'
  },
  PROPOSED: {
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
    icon: Target,
    defaultLabel: 'Proposed'
  },
  RECOMMENDATION: {
    bg: '#F0F9FF',
    text: '#0369A1',
    border: '#BAE6FD',
    icon: TrendingUp,
    defaultLabel: 'Recommendation'
  },
  ASSUMPTION: {
    bg: '#FFFBEB',
    text: '#92400E',
    border: '#FDE68A',
    icon: AlertTriangle,
    defaultLabel: 'Assumption'
  },
  OPEN_QUESTION: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    icon: HelpCircle,
    defaultLabel: 'Open Question'
  },
  UNKNOWN: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    icon: HelpCircle,
    defaultLabel: 'Unknown'
  },
  VALIDATION_REQUIRED: {
    bg: '#FFF1F2',
    text: '#9F1239',
    border: '#FECDD3',
    icon: AlertOctagon,
    defaultLabel: 'Validation Required'
  }
};

export const BusinessAnalysisPage = () => {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedDimension, setSelectedDimension] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const scrollToBlockers = () => {
    const el = document.getElementById('open-questions-section') || document.getElementById('requirements-matrix-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Editable Form Data
  const [formData, setFormData] = useState({
    currentState: '',
    futureState: '',
    digitalMaturityScore: 65,
    goals: [],
    painPoints: [],
    requirements: [],
    automationOpportunities: [],
    executiveSummary: '',
    assessmentScores: null,
    strategicGoals: [],
    operationalPainPoints: [],
    requirementsData: [],
    openQuestions: [],
    assumptions: [],
    recommendations: [],
    evidenceReferences: [],
    currentOperatingContext: null,
    futureOperatingState: null,
    validationSummary: null
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const [wsRes, docRes, anRes] = await Promise.allSettled([
        api.getWorkspace(id),
        api.getDocuments(id),
        api.getAnalysis(id)
      ]);

      if (wsRes.status === 'fulfilled' && wsRes.value?.workspace) {
        setWorkspace(wsRes.value.workspace);
      }
      if (docRes.status === 'fulfilled' && docRes.value?.documents) {
        setDocuments(docRes.value.documents);
      }
      if (anRes.status === 'fulfilled' && anRes.value?.analysis) {
        setAnalysis(anRes.value.analysis);
        hydrateFormData(anRes.value.analysis);
      } else {
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Failed to load business analysis data:', err);
      setLoadError(err.message || 'Failed to retrieve analysis.');
    } finally {
      setLoading(false);
    }
  };

  const hydrateFormData = (data) => {
    setFormData({
      currentState: data.currentState || '',
      futureState: data.futureState || '',
      digitalMaturityScore: data.digitalMaturityScore || 65,
      goals: safeParse(data.goals, []),
      painPoints: safeParse(data.painPoints, []),
      requirements: safeParse(data.requirements, []),
      automationOpportunities: safeParse(data.automationOpportunities, []),
      executiveSummary: data.executiveSummary || '',
      assessmentScores: safeParse(data.assessmentScores, null),
      strategicGoals: safeParse(data.strategicGoals, []),
      operationalPainPoints: safeParse(data.operationalPainPoints, []),
      requirementsData: safeParse(data.requirementsData, []),
      openQuestions: safeParse(data.openQuestions, []),
      assumptions: safeParse(data.assumptions, []),
      recommendations: safeParse(data.recommendations, []),
      evidenceReferences: safeParse(data.evidenceReferences, []),
      currentOperatingContext: safeParse(data.currentOperatingContext, null),
      futureOperatingState: safeParse(data.futureOperatingState, null),
      validationSummary: safeParse(data.validationSummary, null)
    });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenerationStep(1);

      // Progressive generation steps for UX feedback
      const timer1 = setTimeout(() => setGenerationStep(2), 2500);
      const timer2 = setTimeout(() => setGenerationStep(3), 5500);

      const res = await api.generateAnalysis(id);
      clearTimeout(timer1);
      clearTimeout(timer2);

      setAnalysis(res.analysis);
      hydrateFormData(res.analysis);
      showToast('Business Analysis synthesized successfully!');
    } catch (err) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
      setGenerationStep(0);
    }
  };

  const handleSaveEdits = async () => {
    try {
      setSaving(true);
      const res = await api.updateAnalysis(id, {
        currentState: formData.currentState,
        futureState: formData.futureState,
        digitalMaturityScore: formData.digitalMaturityScore,
        goals: formData.goals,
        painPoints: formData.painPoints,
        requirements: formData.requirements,
        automationOpportunities: formData.automationOpportunities,
        executiveSummary: formData.executiveSummary,
        assessmentScores: formData.assessmentScores,
        strategicGoals: formData.strategicGoals,
        operationalPainPoints: formData.operationalPainPoints,
        requirementsData: formData.requirementsData,
        openQuestions: formData.openQuestions,
        assumptions: formData.assumptions,
        recommendations: formData.recommendations,
        evidenceReferences: formData.evidenceReferences,
        currentOperatingContext: formData.currentOperatingContext,
        futureOperatingState: formData.futureOperatingState,
        validationSummary: formData.validationSummary
      });
      setAnalysis(res.analysis);
      hydrateFormData(res.analysis);
      setIsEditing(false);
      showToast('Edits saved to database!');
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    const gate = calculateStage2HandoffGate({
      ...formData,
      requirements: (formData.requirementsData && formData.requirementsData.length > 0)
        ? formData.requirementsData
        : (Array.isArray(formData.requirements) ? formData.requirements : [])
    });

    if (!gate.canProceed) {
      showToast('Architecture handoff is blocked by unresolved blocker items.', 'error');
      scrollToBlockers();
      return;
    }

    try {
      if (analysis?.status !== 'APPROVED') {
        const res = await api.approveAnalysis(id, 'Business requirements validated and approved.');
        if (res.analysis) setAnalysis(res.analysis);
      }
      showToast('Validation Gate passed! Moving to Solution Builder...');
      navigate(`/app/workspaces/${id}/solution`);
    } catch (err) {
      showToast(err.message || 'Failed to approve analysis', 'error');
    }
  };

  const handleOpenAiConsultant = () => {
    window.dispatchEvent(new CustomEvent('rootforge:open-ai-drawer'));
  };

  function safeParse(data, fallback) {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  }

  // Taxonomy Badge Component with Readable Enterprise Typography
  const renderTaxonomyBadge = (classification, customLabel = null) => {
    const key = classification || 'CONFIRMED_FACT';
    const conf = TAXONOMY_CONFIG[key] || TAXONOMY_CONFIG.CONFIRMED_FACT;
    const IconComponent = conf.icon;
    const label = customLabel || (t.analysis?.taxonomy?.[key] || conf.defaultLabel);

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 6,
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '0.01em',
          backgroundColor: conf.bg,
          color: conf.text,
          border: `1px solid ${conf.border}`,
          whiteSpace: 'nowrap',
          lineHeight: 1.3
        }}
      >
        <IconComponent size={12} />
        {label}
      </span>
    );
  };

  // ---------------------------------------------------------------------------
  // LOADING SKELETON STATE
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ height: 28, width: 340, backgroundColor: 'var(--bg-subtle)', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 16, width: 560, backgroundColor: 'var(--bg-subtle)', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ height: 40, width: 120, backgroundColor: 'var(--bg-subtle)', borderRadius: 6 }} />
            <div style={{ height: 40, width: 160, backgroundColor: 'var(--bg-subtle)', borderRadius: 6 }} />
          </div>
        </div>
        <div style={{ height: 160, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
        <div className="grid-responsive-2col" style={{ gap: 20 }}>
          <div style={{ height: 220, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
          <div style={{ height: 220, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
        </div>
        <div style={{ height: 280, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ERROR STATE
  // ---------------------------------------------------------------------------
  if (loadError) {
    return (
      <div style={{ maxWidth: 900, margin: '60px auto', padding: 24 }}>
        <div className="card" style={{ borderLeft: '4px solid #EF4444', padding: '32px 28px', textAlign: 'center' }}>
          <AlertOctagon size={44} color="#EF4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
            Business Analysis Could Not Be Loaded
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 20, maxWidth: 600, margin: '0 auto 24px' }}>
            {loadError}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={loadData} className="btn btn-secondary">
              <RefreshCw size={16} /> Retry
            </button>
            <button onClick={() => navigate(`/app/workspaces/${id}/discovery`)} className="btn btn-primary">
              Return to Discovery
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // EMPTY STATE (NOT YET GENERATED)
  // ---------------------------------------------------------------------------
  if (!analysis) {
    return (
      <div style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
        <div className="card" style={{ padding: '64px 40px', textAlign: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: 'var(--accent-amber-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}
          >
            <FileSearch size={36} color="var(--accent-amber)" />
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {t.analysis.engineTitle}
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 680, margin: '0 auto 28px' }}>
            {t.analysis.engineDesc}
          </p>

          {/* Evidence Grounding Context Summary */}
          <div
            style={{
              maxWidth: 620,
              margin: '0 auto 32px',
              padding: '16px 20px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} color="var(--accent-green)" />
              Grounding Context Ready for Synthesis:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <strong>Workspace Domain:</strong> {workspace?.industry || 'Enterprise Transformation'}
              </li>
              <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <strong>Indexed Documents:</strong> {documents.length > 0 ? `${documents.length} verified PDF files attached` : 'Using workspace objectives and interview context'}
              </li>
              <li style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <strong>Discovery Context:</strong> Stakeholder requirements, user overrides, and constraints
              </li>
            </ul>
          </div>

          {generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <button disabled className="btn btn-primary btn-lg" style={{ minWidth: 260 }}>
                <RefreshCw size={18} className="animate-spin" />
                {t.analysis.generatingBtn}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                <Sparkles size={16} />
                {generationStep === 1 && 'Ingesting discovery context and indexed enterprise documents...'}
                {generationStep === 2 && 'Applying 8-class epistemic taxonomy and anti-hallucination rules...'}
                {generationStep === 3 && 'Evaluating 5-dimension digital maturity and structuring requirements...'}
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              className="btn btn-primary btn-lg"
              style={{ minWidth: 260, fontSize: '1rem', padding: '12px 28px' }}
            >
              <Sparkles size={18} />
              {t.analysis.generateBtn}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active data representation fallback
  const activeStrategicGoals = (formData.strategicGoals && formData.strategicGoals.length > 0)
    ? formData.strategicGoals
    : (Array.isArray(formData.goals) ? formData.goals : []);

  const activePainPoints = (formData.operationalPainPoints && formData.operationalPainPoints.length > 0)
    ? formData.operationalPainPoints
    : (Array.isArray(formData.painPoints) ? formData.painPoints : []);

  const activeRequirements = (formData.requirementsData && formData.requirementsData.length > 0)
    ? formData.requirementsData
    : (Array.isArray(formData.requirements) ? formData.requirements : []);

  const activeStakeholders = Array.isArray(formData.stakeholders) ? formData.stakeholders : [];
  const activeProcesses = Array.isArray(formData.processAnalysis) ? formData.processAnalysis : [];
  const activeGaps = Array.isArray(formData.gapAnalysis) ? formData.gapAnalysis : [];

  const scores = formData.assessmentScores || null;
  const currContext = formData.currentOperatingContext || null;
  const valSummary = formData.validationSummary || null;

  // Canonical Stage 2 -> Stage 3 Handoff Gate
  const handoffGate = calculateStage2HandoffGate({
    ...formData,
    requirements: activeRequirements
  });
  const totalReqsCount = handoffGate.totalRequirements;
  const evidenceBackedReqsCount = handoffGate.evidenceBackedCount;
  const validationRequiredReqsCount = handoffGate.validationRequiredCount;
  const openQuestionsCount = handoffGate.openQuestionCount;
  const assumptionsCount = handoffGate.assumptionCount;
  const totalBlockersCount = handoffGate.blockerCount;
  const blockerQuestionsCount = handoffGate.blockers.filter(b => b.type === 'QUESTION').length;
  const blockerReqsCount = handoffGate.blockers.filter(b => b.type === 'REQUIREMENT').length;

  // Executive Summary data resolution
  const execObj = (typeof formData.executiveSummary === 'object' && formData.executiveSummary !== null) ? formData.executiveSummary : null;
  const currentSituationText = execObj?.currentSituation || currContext?.whatHappensToday || currContext?.summary || currContext?.confirmedState || (typeof formData.currentState === 'string' ? formData.currentState : '') || 'Baseline operational workflow is undergoing discovery analysis.';
  const primaryProblemsList = execObj?.primaryProblems || execObj?.problems || activePainPoints.slice(0, 4).map(p => (typeof p === 'object' ? (p.title || p.painPoint || p.text) : p));
  const transformationDirectionText = execObj?.transformationDirection || formData.futureOperatingState?.description || formData.futureOperatingState?.targetState || (typeof formData.futureState === 'string' ? formData.futureState : '') || 'Establish streamlined, traceable, and automated business workflows.';
  const keyConstraintsList = execObj?.keyConstraints || execObj?.constraints || ((currContext?.knownConstraints && currContext.knownConstraints.length > 0) ? currContext.knownConstraints : (formData?.constraints || [])).slice(0, 3).map(c => (typeof c === 'object' ? (c.constraint || c.item || c.text) : c));
  const analysisConfidence = execObj?.analysisConfidence || scores?.digitalMaturity?.confidence || (documents.length > 0 ? 'High' : (currContext?.isEvidenceComplete !== false ? 'Medium' : 'Low'));
  const confidenceReasonText = execObj?.confidenceReason || (documents.length > 0 ? `Analysis grounded directly in ${documents.length} verified workspace document(s) and structured discovery dialogue.` : 'Analysis grounded in discovery dialogue and workspace objectives; formal technical document verification required.');

  // Extract document names for header evidence bar
  const docNamesString = documents.length > 0
    ? documents.map(d => d.originalName || d.filename).filter(Boolean).join(', ')
    : 'Workspace Discovery Context';

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ------------------------------------------------------------------ */}
      {/* 1. TOP HEADER & METADATA BAR                                       */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          <Link to={`/app/workspaces/${id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            {workspace?.name || 'Workspace'}
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Stage 2: Business Analysis & Diagnostics
          </span>
        </div>

        {/* Title, Subtitle and Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ maxWidth: 880 }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
              {t.analysis.title}
            </h1>
            <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Translate discovery findings into measurable business requirements, operational risks, automation opportunities, and transformation priorities.
            </p>
          </div>

          {/* Action Button Bar (Height 38px-40px, High Contrast) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenAiConsultant}
              className="btn btn-secondary"
              style={{ height: 38, borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}
              title="Open stage-scoped AI Business Consultant"
            >
              <Sparkles size={16} />
              <span>AI Consultant</span>
            </button>

            {isEditing ? (
              <button
                onClick={handleSaveEdits}
                disabled={saving}
                className="btn btn-primary"
                style={{ height: 38 }}
              >
                <Save size={16} />
                {saving ? 'Saving...' : t.analysis.saveEdits}
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary"
                style={{ height: 38 }}
              >
                <Edit3 size={16} />
                {t.analysis.editAnalysis}
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn btn-secondary"
              style={{ height: 38 }}
              title="Re-run analysis against latest workspace context"
            >
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              {generating ? t.analysis.generatingBtn : t.analysis.regenerate}
            </button>

            <button
              onClick={handleApprove}
              disabled={!handoffGate.canProceed}
              className="btn btn-primary"
              style={{
                height: 38,
                padding: '0 18px',
                fontWeight: 700,
                opacity: !handoffGate.canProceed ? 0.6 : 1,
                cursor: !handoffGate.canProceed ? 'not-allowed' : 'pointer'
              }}
              title={!handoffGate.canProceed ? `${handoffGate.blockerCount} unresolved blocker(s) must be resolved before Stage 3 handoff` : 'Continue to Solution Builder'}
            >
              <span>{t.analysis.approveBtn || 'Continue to Solution Builder'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Evidence & Grounding Metadata Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '10px 16px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            fontSize: '0.84rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* Status & Version Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                className={analysis.status === 'STALE' ? 'badge badge-amber' : (analysis.status === 'APPROVED' ? 'badge badge-green' : 'badge badge-blue')}
                style={{ fontSize: '0.74rem', padding: '3px 9px', fontWeight: 700 }}
              >
                {analysis.status || 'DRAFT'}
              </span>
              <span className="badge badge-gray" style={{ fontSize: '0.74rem', padding: '3px 9px' }}>
                v{analysis.version || 1}
              </span>
            </div>

            {/* Document Grounding Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
              <FileText size={15} color="#3B82F6" />
              <span>
                <strong>Document Grounding:</strong> {documents.length > 0 ? `${documents.length} verified documents indexed` : 'Discovery Interview Context'}
              </span>
            </div>

            {/* Domain & Model Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
              <Building2 size={14} />
              <span>{workspace?.industry || 'Enterprise Transformation'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            <Cpu size={14} color="var(--accent-amber)" />
            <span>AI Model: {analysis.model || 'gemini-3.1-flash-lite'}</span>
          </div>
        </div>

        {/* Stale Analysis Alert Banner */}
        {analysis.status === 'STALE' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 8,
              color: '#92400E',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '0.92rem' }}>Analysis Evidence is Stale:</strong>
                <span style={{ fontSize: '0.88rem', marginLeft: 6 }}>
                  Workspace documents or discovery context have been modified since this analysis was generated. Regenerate analysis to incorporate latest evidence into Stage 2 findings.
                </span>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#D97706', borderColor: '#D97706', color: '#FFFFFF', fontWeight: 700 }}
            >
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
              <span>{generating ? 'Regenerating...' : 'Regenerate Analysis'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* A. EXECUTIVE BUSINESS SUMMARY (SECTION 5 GROUNDED DIAGNOSIS)        */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderLeft: '4px solid #3B82F6',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="#3B82F6" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Executive Business Summary
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                Synthesized business diagnosis answering current operational reality, transformation direction, and critical boundaries.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Analysis Confidence:
            </span>
            <span
              className={
                (analysisConfidence === 'High' || analysisConfidence === 'HIGH')
                  ? 'badge badge-green'
                  : (analysisConfidence === 'Medium' || analysisConfidence === 'MEDIUM')
                  ? 'badge badge-amber'
                  : 'badge badge-gray'
              }
              style={{ fontSize: '0.78rem', padding: '3px 10px', fontWeight: 800 }}
            >
              {analysisConfidence}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {/* CURRENT SITUATION */}
          <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CURRENT SITUATION
            </span>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
              {currentSituationText}
            </p>
          </div>

          {/* PRIMARY BUSINESS PROBLEMS */}
          <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              PRIMARY BUSINESS PROBLEMS
            </span>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.86rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {primaryProblemsList.length > 0 ? (
                primaryProblemsList.map((p, pIdx) => <li key={pIdx} style={{ color: 'var(--text-primary)' }}>{p}</li>)
              ) : (
                <li style={{ color: 'var(--text-muted)' }}>No critical operational problems confirmed from available evidence.</li>
              )}
            </ul>
          </div>

          {/* TRANSFORMATION DIRECTION */}
          <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TRANSFORMATION DIRECTION
            </span>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
              {transformationDirectionText}
            </p>
          </div>

          {/* KEY CONSTRAINTS */}
          <div style={{ padding: '14px 16px', backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              KEY CONSTRAINTS & BOUNDARIES
            </span>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.86rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {keyConstraintsList.length > 0 ? (
                keyConstraintsList.map((c, cIdx) => <li key={cIdx} style={{ color: 'var(--text-primary)' }}>{c}</li>)
              ) : (
                <li style={{ color: 'var(--text-muted)' }}>General enterprise compliance and operational stability boundaries apply.</li>
              )}
            </ul>
          </div>
        </div>

        {/* CONFIDENCE REASON */}
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, borderLeft: '3px solid #3B82F6', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Confidence Rationale: </strong>
          {confidenceReasonText}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* B. DIGITAL MATURITY ASSESSMENT (EXPLAINABLE & INSPECTABLE)          */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ padding: '24px 28px', borderLeft: '4px solid var(--accent-amber)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          {/* Left: Overall Score Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 280 }}>
            <div
              style={{
                width: 82,
                height: 82,
                borderRadius: '50%',
                border: '4px solid var(--accent-amber)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-subtle)'
              }}
            >
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {scores?.overallScore ?? analysis.digitalMaturityScore ?? 25}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t.analysis.projectAssessment || 'PROJECT ASSESSMENT'}
                </span>
                <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                  {scores?.overallLevel || 'Needs Improvement'}
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                {t.analysis.digitalMaturity}
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 440, lineHeight: 1.4 }}>
                Readiness score evaluated across 5 core enterprise dimensions based on verified workspace documents and discovery findings. Click any dimension to inspect.
              </p>
            </div>
          </div>

          {/* Right: Dimension Quick-Bars Summary */}
          {(() => {
            const dims = scores?.dimensions || scores?.digitalMaturity?.dimensions || null;
            if (!dims) return null;
            const normalizedDims = Array.isArray(dims)
              ? dims.map(d => ({
                  key: (d.name || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
                  label: d.name || 'Dimension',
                  score: d.score ?? 0,
                  max: d.max ?? 25,
                  evidence: d.evidence || d.evidenceOrObservation || (documents.length > 0 ? `Assessed from workspace documents (${documents.map(x => x.filename || x.originalName).filter(Boolean).slice(0, 2).join(', ')})` : 'Score cannot be confidently established from available evidence.'),
                  rationale: d.rationale || d.description || 'Assessed against verified operational evidence and current process maturity.',
                  gap: d.gap || d.missingInformation || (scores?.digitalMaturity?.missingInformation && scores.digitalMaturity.missingInformation[0]) || 'Baseline automated telemetry and API specifications not yet established.',
                  confidence: d.confidence || scores?.digitalMaturity?.confidence || (documents.length > 0 ? 'Medium' : 'Low'),
                  validation: d.validation || (d.score < 20 ? 'Required' : 'Confirmed')
                }))
              : Object.entries(dims).map(([key, dim]) => ({
                  key,
                  label: {
                    dataIntegration: t.analysis?.dimDataIntegration || 'Data Integration',
                    processAutomation: t.analysis?.dimProcessAutomation || 'Process Automation',
                    selfService: t.analysis?.dimSelfService || 'Self-Service',
                    analytics: t.analysis?.dimAnalytics || 'Analytics & Intelligence',
                    apiReadiness: t.analysis?.dimApiReadiness || 'API Readiness'
                  }[key] || key,
                  score: typeof dim === 'object' ? (dim.score ?? 0) : Number(dim),
                  max: 25,
                  evidence: (typeof dim === 'object' && (dim.evidence || dim.evidenceOrObservation || dim.rationale))
                    ? (dim.evidence || dim.evidenceOrObservation || dim.rationale)
                    : (documents.length > 0 ? `Assessed from workspace documents (${documents.map(x => x.filename || x.originalName).filter(Boolean).slice(0, 2).join(', ')})` : 'Score cannot be confidently established from available evidence.'),
                  rationale: typeof dim === 'object' ? (dim.rationale || dim.description || 'Assessed against verified operational evidence.') : 'Assessed against operational evidence.',
                  gap: typeof dim === 'object' ? (dim.gap || 'Baseline telemetry or API specifications pending validation.') : 'Baseline specifications pending validation.',
                  confidence: typeof dim === 'object' ? (dim.confidence || (documents.length > 0 ? 'Medium' : 'Low')) : (documents.length > 0 ? 'Medium' : 'Low'),
                  validation: typeof dim === 'object' ? (dim.validation || (Number(dim.score || dim) < 20 ? 'Required' : 'Confirmed')) : 'Required'
                }));

            if (normalizedDims.length === 0) return null;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 320, maxWidth: 540 }}>
                {normalizedDims.map((dim) => {
                  const pct = Math.min(100, Math.max(0, (dim.score / dim.max) * 100));
                  return (
                    <div
                      key={dim.key}
                      onClick={() => setSelectedDimension(dim)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 6,
                        transition: 'background-color 0.15s ease'
                      }}
                      className="hover-bg-subtle"
                      title="Click to inspect calculation rationale, evidence, and known gaps"
                    >
                      <span style={{ width: 140, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {dim.label}
                      </span>
                      <div style={{ flex: 1, height: 7, backgroundColor: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: pct > 65 ? '#10B981' : pct > 35 ? '#F59E0B' : '#EF4444',
                            borderRadius: 4
                          }}
                        />
                      </div>
                      <span style={{ width: 44, textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {dim.score}/{dim.max}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Drilldown Accordion Button */}
        {scores && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.84rem' }}
            >
              {showScoreBreakdown ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              <span>{showScoreBreakdown ? 'Hide Maturity Breakdown & Evidence' : 'Inspect 5-Dimension Calculation Rationale & Evidence'}</span>
            </button>

            {/* Detailed 5-Dimension Explainability Panel */}
            {showScoreBreakdown && (
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 14 }}>
                {(() => {
                  const dims = scores?.dimensions || scores?.digitalMaturity?.dimensions || null;
                  const normalized = Array.isArray(dims)
                    ? dims.map(d => ({
                        key: (d.name || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
                        label: d.name || 'Dimension',
                        score: d.score ?? 0,
                        max: d.max ?? 25,
                        evidence: d.evidence || d.evidenceOrObservation || (documents.length > 0 ? `Assessed from workspace documents (${documents.map(x => x.filename || x.originalName).filter(Boolean).slice(0, 2).join(', ')})` : 'Score cannot be confidently established from available evidence.'),
                        rationale: d.rationale || d.description || 'Assessed against verified operational evidence and current process maturity.',
                        gap: d.gap || d.missingInformation || (scores?.digitalMaturity?.missingInformation && scores.digitalMaturity.missingInformation[0]) || 'Baseline automated telemetry and API specifications not yet established.',
                        confidence: d.confidence || scores?.digitalMaturity?.confidence || (documents.length > 0 ? 'Medium' : 'Low'),
                        validation: d.validation || (d.score < 20 ? 'Required' : 'Confirmed')
                      }))
                    : dims ? Object.entries(dims).map(([key, dim]) => ({
                        key,
                        label: {
                          dataIntegration: 'Data Integration',
                          processAutomation: 'Process Automation',
                          selfService: 'Self-Service Enablement',
                          analytics: 'Analytics & Intelligence',
                          apiReadiness: 'API Readiness'
                        }[key] || key,
                        score: typeof dim === 'object' ? (dim.score ?? 0) : Number(dim),
                        max: 25,
                        evidence: (typeof dim === 'object' && (dim.evidence || dim.evidenceOrObservation || dim.rationale))
                          ? (dim.evidence || dim.evidenceOrObservation || dim.rationale)
                          : (documents.length > 0 ? `Assessed from workspace documents (${documents.map(x => x.filename || x.originalName).filter(Boolean).slice(0, 2).join(', ')})` : 'Score cannot be confidently established from available evidence.'),
                        rationale: typeof dim === 'object' ? (dim.rationale || dim.description || 'Assessed against operational evidence.') : 'Assessed against operational evidence.',
                        gap: typeof dim === 'object' ? (dim.gap || 'Baseline telemetry or API specifications pending validation.') : 'Baseline specifications pending validation.',
                        confidence: typeof dim === 'object' ? (dim.confidence || (documents.length > 0 ? 'Medium' : 'Low')) : (documents.length > 0 ? 'Medium' : 'Low'),
                        validation: typeof dim === 'object' ? (dim.validation || (Number(dim.score || dim) < 20 ? 'Required' : 'Confirmed')) : 'Required'
                      })) : [];

                  return normalized.map((dim) => (
                    <div
                      key={dim.key}
                      onClick={() => setSelectedDimension(dim)}
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        padding: 14,
                        borderRadius: 6,
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        cursor: 'pointer'
                      }}
                      title="Click to inspect this maturity dimension"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {dim.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace', fontSize: '0.88rem' }}>
                            {dim.score}/{dim.max}
                          </span>
                          <ExternalLink size={12} color="var(--text-muted)" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                        {dim.evidence}
                      </p>
                    </div>
                  ));
                })()}

                {(scores.calculationRationale || scores.digitalMaturity?.rationale) && (
                  <div style={{ gridColumn: '1 / -1', padding: '12px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: 6, borderLeft: '3px solid #3B82F6' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>
                      Calculation Rationale:
                    </span>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                      {scores.calculationRationale || scores.digitalMaturity?.rationale}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. CURRENT OPERATING CONTEXT VS FUTURE OPERATING STATE             */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 24 }}>
        {/* Current Operating Context Card */}
        <div className="card" style={{ borderTop: '4px solid #64748B', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="#64748B" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {t.analysis.currentState}
              </h3>
            </div>
            {renderTaxonomyBadge(
              (currContext?.isEvidenceComplete === false || (!documents.length && !currContext?.confirmedCurrentState?.length && !currContext?.observedProcesses?.length))
                ? 'VALIDATION_REQUIRED'
                : (documents.length > 0 ? 'DOCUMENT_FACT' : 'USER_PROVIDED_FACT'),
              (currContext?.isEvidenceComplete === false || (!documents.length && !currContext?.confirmedCurrentState?.length && !currContext?.observedProcesses?.length))
                ? 'Evidence Incomplete'
                : (documents.length > 0 ? 'Document Grounded' : 'Workspace Grounded')
            )}
          </div>

          {isEditing ? (
            <textarea
              rows={6}
              className="form-textarea"
              style={{ fontSize: '0.9rem', lineHeight: 1.5 }}
              value={formData.currentState}
              onChange={(e) => setFormData({ ...formData, currentState: e.target.value })}
            />
          ) : (currContext?.isEvidenceComplete === false || (!documents.length && !currContext?.confirmedCurrentState?.length && !currContext?.observedProcesses?.length && !formData.currentState)) ? (
            <div style={{ padding: '16px 18px', backgroundColor: 'rgba(239, 68, 68, 0.06)', borderRadius: 8, borderLeft: '4px solid #EF4444', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', fontWeight: 700, fontSize: '0.92rem' }}>
                <AlertTriangle size={17} />
                <span>Current-state evidence is incomplete.</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Insufficient evidence available from the indexed workspace documents to establish an authentic operational baseline.
              </p>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Evidence Needed:
                </span>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: 20, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(currContext?.evidenceNeeded && currContext.evidenceNeeded.length > 0)
                    ? currContext.evidenceNeeded.map((en, enIdx) => <li key={enIdx}>{en}</li>)
                    : (
                      <>
                        <li>Existing scheduling workflow & standard operating procedures</li>
                        <li>Current system / software integration details</li>
                        <li>Current operational volumes and performance metrics</li>
                      </>
                    )}
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* GROUP 1: KNOWN FROM EVIDENCE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <CheckCircle2 size={14} color="#10B981" />
                  <span>KNOWN FROM EVIDENCE</span>
                </div>

                {/* Daily Operating Reality */}
                <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, borderLeft: '3px solid #10B981' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      What Happens Today (Operational Reality)
                    </span>
                    {renderTaxonomyBadge(documents.length > 0 ? 'DOCUMENT_FACT' : 'USER_PROVIDED_FACT')}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                    {currContext?.whatHappensToday || currContext?.summary || currContext?.confirmedState || (typeof formData.currentState === 'string' ? formData.currentState : '') || 'Grounded operational baseline derived from workspace discovery.'}
                  </p>
                </div>

                {/* Observed Processes */}
                {((currContext?.observedProcesses && currContext.observedProcesses.length > 0) || (currContext?.confirmedCurrentState && currContext.confirmedCurrentState.length > 0)) && (
                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, borderLeft: '3px solid #3B82F6' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Observed Operating Workflows:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(currContext?.observedProcesses || currContext?.confirmedCurrentState || []).map((proc, pIdx) => {
                        const text = typeof proc === 'object' ? (proc.process || proc.item) : proc;
                        const source = typeof proc === 'object' ? proc.source : null;
                        const classification = typeof proc === 'object' ? (proc.classification || 'DOCUMENT_FACT') : 'DOCUMENT_FACT';
                        return (
                          <div key={pIdx} style={{ fontSize: '0.86rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <span style={{ color: '#3B82F6', fontWeight: 700 }}>•</span>
                              <span>{text}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              {source && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>[{source}]</span>}
                              {renderTaxonomyBadge(classification)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Known Systems */}
                {currContext?.knownSystems && currContext.knownSystems.length > 0 && (
                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, borderLeft: '3px solid #6366F1' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Known Existing Systems & Tools:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {currContext.knownSystems.map((sys, sIdx) => {
                        const name = typeof sys === 'object' ? sys.system : sys;
                        const role = typeof sys === 'object' ? sys.role : null;
                        return (
                          <span key={sIdx} className="badge badge-gray" style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Database size={13} color="#6366F1" />
                            <strong>{name}</strong>
                            {role && <span style={{ color: 'var(--text-muted)' }}>({role})</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cited Evidence Sources (Section F) */}
                {((currContext?.evidenceReferences && currContext.evidenceReferences.length > 0) || (formData?.evidenceReferences && formData.evidenceReferences.length > 0)) && (
                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, borderLeft: '3px solid #0284C7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Cited Evidence Sources & Artifacts:
                      </span>
                      {renderTaxonomyBadge('DOCUMENT_FACT', 'Document Evidence')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(currContext?.evidenceReferences || formData?.evidenceReferences || []).map((ref, rIdx) => {
                        const title = typeof ref === 'object' ? (ref.title || ref.document) : ref;
                        const doc = typeof ref === 'object' ? ref.document : null;
                        const excerpt = typeof ref === 'object' ? (ref.excerpt || ref.snippet) : null;
                        return (
                          <div key={rIdx} style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                              <FileText size={13} color="#0284C7" />
                              <span>{title}</span>
                              {doc && doc !== title && <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>({doc})</span>}
                            </div>
                            {excerpt && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', backgroundColor: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4, marginTop: 3, borderLeft: '2px solid #0284C7' }}>
                                "{excerpt}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* GROUP 2: EVIDENCE STILL REQUIRED */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <HelpCircle size={14} color="#EF4444" />
                  <span>EVIDENCE STILL REQUIRED</span>
                </div>

                {/* Information Gaps & Unknowns */}
                {((currContext?.unknownInformation && currContext.unknownInformation.length > 0) || (currContext?.unknownCurrentState && currContext.unknownCurrentState.length > 0)) && (
                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, borderLeft: '3px solid #EF4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Information Gaps & Unknowns (Action Required):
                      </span>
                      {renderTaxonomyBadge('VALIDATION_REQUIRED')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(currContext?.unknownInformation || currContext?.unknownCurrentState || []).map((u, uIdx) => {
                        const item = typeof u === 'object' ? u.item : u;
                        const action = typeof u === 'object' ? u.actionRequired : null;
                        return (
                          <div key={uIdx} style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: '#EF4444', fontWeight: 700, marginRight: 6 }}>•</span>
                            <span style={{ color: 'var(--text-primary)' }}>{item}</span>
                            {action && <span style={{ fontSize: '0.76rem', color: '#EF4444', fontWeight: 600, marginLeft: 8 }}>[{action}]</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Missing Information Checklist */}
                {currContext?.evidenceNeeded && currContext.evidenceNeeded.length > 0 && (
                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, borderLeft: '3px solid #F59E0B' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Missing Evidence Checklist:
                    </span>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {currContext.evidenceNeeded.map((en, enIdx) => <li key={enIdx}>{en}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* GROUP 3: ANALYSIS IMPACT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <Sparkles size={14} color="#8B5CF6" />
                  <span>ANALYSIS IMPACT & BOTTLENECKS</span>
                </div>

                {/* Known Operational Bottlenecks */}
                {((currContext?.knownOperationalBottlenecks && currContext.knownOperationalBottlenecks.length > 0) || (currContext?.inferredCurrentState && currContext.inferredCurrentState.length > 0)) && (
                  <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, borderLeft: '3px solid #8B5CF6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Identified Operational Bottlenecks:
                      </span>
                      {renderTaxonomyBadge('AI_INFERENCE')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(currContext?.knownOperationalBottlenecks || currContext?.inferredCurrentState || []).map((b, bIdx) => {
                        const text = typeof b === 'object' ? (b.bottleneck || b.item) : b;
                        const rationale = typeof b === 'object' ? (b.evidence || b.rationale) : null;
                        return (
                          <div key={bIdx} style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: '#8B5CF6', fontWeight: 700, marginRight: 6 }}>•</span>
                            <span style={{ color: 'var(--text-primary)' }}>{text}</span>
                            {rationale && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: 14 }}>Basis: {rationale}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Constraints & Regulatory Boundaries */}
                {((currContext?.knownConstraints && currContext.knownConstraints.length > 0) || (formData?.constraints && formData.constraints.length > 0)) && (
                  <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, borderLeft: '3px solid #F59E0B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Constraints & Regulatory Boundaries:
                      </span>
                      {renderTaxonomyBadge('WORKSPACE_OBJECTIVE', 'Boundary / Constraint')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(currContext?.knownConstraints || formData?.constraints || []).map((c, cIdx) => {
                        const text = typeof c === 'object' ? (c.constraint || c.item || c.text) : c;
                        const source = typeof c === 'object' ? c.source : null;
                        return (
                          <div key={cIdx} style={{ fontSize: '0.86rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <span style={{ color: '#F59E0B', fontWeight: 700 }}>•</span>
                              <span>{text}</span>
                            </div>
                            {source && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>[{source}]</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Future Operating State Card (Business Target State) */}
        <div className="card" style={{ borderTop: '4px solid #10B981', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="#10B981" />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {t.analysis.futureState}
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Status: PROPOSED FUTURE STATE • Business Operating Model
                </span>
              </div>
            </div>
            {renderTaxonomyBadge('PROPOSED_TARGET', 'Proposed Future State')}
          </div>

          {isEditing ? (
            <textarea
              rows={6}
              className="form-textarea"
              style={{ fontSize: '0.9rem', lineHeight: 1.5 }}
              value={formData.futureState}
              onChange={(e) => setFormData({ ...formData, futureState: e.target.value })}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                {formData.futureOperatingState?.description || formData.futureOperatingState?.targetState || (typeof formData.futureState === 'string' ? formData.futureState : '') || 'Envisioned future state focusing on digital workflow automation.'}
              </p>

              {/* Target Capabilities */}
              {formData.futureOperatingState?.targetCapabilities && formData.futureOperatingState.targetCapabilities.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Envisioned Business Capabilities:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {formData.futureOperatingState.targetCapabilities.map((cap, cIdx) => (
                      <div key={cIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={16} color="#10B981" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Outcomes */}
              {formData.futureOperatingState?.expectedOutcomes && formData.futureOperatingState.expectedOutcomes.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Proposed Target Outcomes:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {formData.futureOperatingState.expectedOutcomes.map((out, oIdx) => {
                      const text = typeof out === 'object' ? out.outcome : out;
                      return (
                        <div key={oIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Target size={14} color="var(--accent-amber)" />
                            <span>{text}</span>
                          </div>
                          {renderTaxonomyBadge('PROPOSED_TARGET', 'Proposed Target')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Operational Shifts */}
              {formData.futureOperatingState?.operationalShifts && formData.futureOperatingState.operationalShifts.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Operational Transformation Shifts:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {formData.futureOperatingState.operationalShifts.map((shift, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        <ArrowRight size={14} color="var(--accent-amber)" style={{ marginTop: 3, flexShrink: 0 }} />
                        <span>{shift}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3B. PROCESS ANALYSIS & STAKEHOLDER ANALYSIS                        */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Process Analysis Flow */}
        {activeProcesses.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={20} color="#3B82F6" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    Process Analysis & Workflow Transitions
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    End-to-end mapping from current operational execution to target business capabilities.
                  </p>
                </div>
              </div>
              <span className="badge badge-gray" style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
                {activeProcesses.length} Analyzed Workflow{activeProcesses.length === 1 ? '' : 's'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeProcesses.map((proc, pIdx) => {
                const isObj = typeof proc === 'object' && proc !== null;
                const pId = isObj ? (proc.id || `PROC-0${pIdx + 1}`) : `PROC-0${pIdx + 1}`;
                const name = isObj ? (proc.processName || proc.name || proc.title) : proc;
                const trigger = isObj ? proc.trigger : null;
                const actors = isObj && Array.isArray(proc.actors) ? proc.actors : [];
                const steps = isObj && Array.isArray(proc.majorSteps) ? proc.majorSteps : [];
                const systems = isObj && Array.isArray(proc.systemsInvolved) ? proc.systemsInvolved : [];
                const bottlenecks = isObj ? (proc.bottlenecks || proc.bottleneck) : null;
                const painPoints = isObj ? (proc.painPoints || proc.painPoint) : null;
                const desired = isObj ? (proc.desiredImprovement || proc.desiredFutureProcess || proc.futureState) : null;

                return (
                  <div
                    key={pIdx}
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.84rem', color: '#3B82F6' }}>
                          {pId}
                        </span>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {name}
                        </h4>
                      </div>
                      {trigger && (
                        <span className="badge badge-gray" style={{ fontSize: '0.74rem' }}>
                          Trigger: {trigger}
                        </span>
                      )}
                    </div>

                    {/* Sequential Process Flow: Current Process -> Problem/Gap -> Business Impact -> Desired Future Process */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                      <div style={{ backgroundColor: 'var(--bg-surface)', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                          1. Current Process
                        </div>
                        <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {steps.length > 0 ? (
                            <ol style={{ margin: 0, paddingLeft: 16 }}>
                              {steps.map((s, sIdx) => <li key={sIdx}>{s}</li>)}
                            </ol>
                          ) : 'Manual execution across disconnected tools.'}
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FFFBEB', padding: 12, borderRadius: 6, border: '1px solid #FDE68A' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', marginBottom: 4 }}>
                          2. Problem / Bottleneck
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#92400E', lineHeight: 1.4 }}>
                          {bottlenecks || painPoints || 'Manual coordination latency and double data entry.'}
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 6, border: '1px solid #FECACA' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', marginBottom: 4 }}>
                          3. Business Impact
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#991B1B', lineHeight: 1.4 }}>
                          {painPoints || 'Turnaround delays, human error risk, and lack of real-time visibility.'}
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 6, border: '1px solid #A7F3D0' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', marginBottom: 4 }}>
                          4. Desired Future Process
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#065F46', lineHeight: 1.4 }}>
                          {desired || 'Automated straight-through ingestion with real-time status notifications.'}
                        </div>
                      </div>
                    </div>

                    {/* Metadata tags: Actors & Systems */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: 10 }}>
                      {actors.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={13} color="var(--text-muted)" />
                          <span style={{ color: 'var(--text-muted)' }}>Actors:</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{actors.join(', ')}</span>
                        </div>
                      )}
                      {systems.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Database size={13} color="var(--text-muted)" />
                          <span style={{ color: 'var(--text-muted)' }}>Systems:</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{systems.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stakeholder Analysis Matrix */}
        {activeStakeholders.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={20} color="var(--accent-amber)" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    Stakeholder & Persona Analysis
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Identified operational roles, responsibilities, business needs, and transformation influence.
                  </p>
                </div>
              </div>
              <span className="badge badge-gray" style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
                {activeStakeholders.length} Stakeholders
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
              {activeStakeholders.map((stk, sIdx) => {
                const isObj = typeof stk === 'object' && stk !== null;
                const sId = isObj ? (stk.id || `STK-0${sIdx + 1}`) : `STK-0${sIdx + 1}`;
                const role = isObj ? (stk.role || stk.persona || stk.title) : stk;
                const persona = isObj ? (stk.persona || role) : role;
                const need = isObj ? (stk.businessNeed || stk.interest) : null;
                const responsibility = isObj ? stk.responsibility : null;
                const painPoint = isObj ? stk.painPoint : null;
                const desired = isObj ? stk.desiredOutcome : null;
                const influence = isObj ? (stk.influenceLevel || 'MEDIUM') : 'MEDIUM';
                const evidence = isObj ? stk.evidenceSource : null;

                return (
                  <div
                    key={sIdx}
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.82rem', color: 'var(--accent-amber)' }}>
                          {sId}
                        </span>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                          {role}
                        </h4>
                        {persona !== role && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Persona: {persona}
                          </div>
                        )}
                      </div>
                      <span className={influence === 'HIGH' ? 'badge badge-red' : 'badge badge-gray'} style={{ fontSize: '0.7rem' }}>
                        Influence: {influence}
                      </span>
                    </div>

                    {responsibility && (
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Responsibility:</strong> {responsibility}
                      </div>
                    )}

                    {need && (
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Business Need:</strong> {need}
                      </div>
                    )}

                    {painPoint && (
                      <div style={{ fontSize: '0.82rem', color: '#991B1B', backgroundColor: '#FEF2F2', padding: '6px 10px', borderRadius: 4 }}>
                        <strong>Pain Point:</strong> {painPoint}
                      </div>
                    )}

                    {desired && (
                      <div style={{ fontSize: '0.82rem', color: '#065F46', backgroundColor: '#ECFDF5', padding: '6px 10px', borderRadius: 4 }}>
                        <strong>Desired Outcome:</strong> {desired}
                      </div>
                    )}

                    {evidence && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-subtle)', paddingTop: 6 }}>
                        Source: {evidence}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. STRATEGIC GOALS & OPERATIONAL PAIN POINTS                       */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 24 }}>
        {/* Strategic Transformation Goals Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {t.analysis.strategicGoals}
              </h3>
            </div>
            <span className="badge badge-gray" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
              {activeStrategicGoals.length} Goals
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeStrategicGoals.map((goal, idx) => {
              const isObj = typeof goal === 'object' && goal !== null;
              const goalTitle = isObj ? (goal.title || goal.goal || goal.text) : goal;
              const targetVal = isObj ? goal.target : null;
              const baselineVal = isObj ? goal.baseline : null;
              const businessReason = isObj ? (goal.businessReason || goal.reason || goal.rationale || 'Reduce administrative coordination effort.') : null;
              const measurementMethod = isObj ? (goal.measurementMethod || goal.metric || 'Observable completion of objective') : null;
              const timeframe = isObj ? goal.timeframe : null;
              const classification = isObj ? (goal.classification || 'CONFIRMED_FACT') : 'CONFIRMED_FACT';
              const confidence = isObj ? (goal.confidence || 'HIGH') : 'HIGH';
              const validationStatus = isObj ? (goal.validationStatus || 'VALIDATION_REQUIRED') : 'VALIDATION_REQUIRED';
              const evidence = isObj ? (goal.evidenceCitation || goal.source) : null;

              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '14px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {goalTitle}
                    </span>
                    {renderTaxonomyBadge(classification)}
                  </div>

                  {businessReason && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Business Reason:</strong> {businessReason}
                    </div>
                  )}

                  {/* Target vs Baseline Metrics Chips */}
                  {(targetVal || baselineVal || timeframe) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {targetVal && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: (classification === 'PROPOSED_TARGET' || targetVal.includes('Proposed') || targetVal.includes('target')) ? '#FFFBEB' : '#ECFDF5',
                            color: (classification === 'PROPOSED_TARGET' || targetVal.includes('Proposed') || targetVal.includes('target')) ? '#B45309' : '#065F46',
                            border: `1px solid ${(classification === 'PROPOSED_TARGET' || targetVal.includes('Proposed') || targetVal.includes('target')) ? '#FDE68A' : '#A7F3D0'}`
                          }}
                        >
                          <strong>Target:</strong> {targetVal}
                        </span>
                      )}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: baselineVal ? '#F1F5F9' : '#FEF3C7',
                          color: baselineVal ? '#1E293B' : '#92400E',
                          border: `1px solid ${baselineVal ? '#CBD5E1' : '#FDE68A'}`
                        }}
                      >
                        <strong>Baseline:</strong> {baselineVal || 'Not established from available evidence.'}
                      </span>
                      {timeframe && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          <Clock size={12} /> {timeframe}
                        </span>
                      )}
                    </div>
                  )}

                  {measurementMethod && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong>Measurement:</strong> {measurementMethod}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {evidence ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <LinkIcon size={12} color="var(--accent-amber)" />
                        <span>Evidence: {evidence}</span>
                      </div>
                    ) : <span />}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Confidence: {confidence}</span>
                      <span className={validationStatus === 'CONFIRMED' ? 'badge badge-green' : 'badge badge-amber'} style={{ fontSize: '0.7rem' }}>Status: {validationStatus}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Critical Operational Pain Points Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertOctagon size={18} color="#EF4444" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {t.analysis.painPoints}
              </h3>
            </div>
            <span className="badge badge-gray" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
              {activePainPoints.length} Identified
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activePainPoints.map((pain, idx) => {
              const isObj = typeof pain === 'object' && pain !== null;
              const title = isObj ? (pain.title || pain.painPoint || pain.text) : pain;
              const description = isObj ? (pain.description || pain.details) : null;
              const severity = isObj ? pain.severity : 'High';
              const impact = isObj ? (pain.impactMetric || pain.impact) : null;
              const classification = isObj ? (pain.classification || 'DOCUMENT_FACT') : 'DOCUMENT_FACT';
              const confidence = isObj ? (pain.confidence || 'HIGH') : 'HIGH';
              const evidence = isObj ? (pain.evidenceCitation || pain.evidence) : null;

              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '14px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className={severity === 'Critical' ? 'badge badge-red' : (severity === 'High' ? 'badge badge-amber' : 'badge badge-gray')}
                        style={{ fontSize: '0.74rem' }}
                      >
                        {severity}
                      </span>
                      <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {title}
                      </span>
                    </div>
                    {renderTaxonomyBadge(classification)}
                  </div>

                  {description && (
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {description}
                    </div>
                  )}

                  {impact && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      <strong>Operational Impact:</strong> {impact}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                    {evidence ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FileText size={12} color="#3B82F6" />
                        <span>Source: {evidence}</span>
                      </div>
                    ) : <span />}
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Confidence: {confidence}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4B. GAP ANALYSIS MATRIX                                            */}
      {/* ------------------------------------------------------------------ */}
      {activeGaps.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Target size={20} color="#EF4444" />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  Strategic Gap Analysis
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Systemic, data, and capability gaps between current operating friction and desired business state.
                </p>
              </div>
            </div>
            <span className="badge badge-gray" style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
              {activeGaps.length} Gaps Identified
            </span>
          </div>

          <div className="table-responsive">
            <table className="enterprise-table" style={{ width: '100%', minWidth: 840 }}>
              <thead>
                <tr>
                  <th style={{ width: 90, fontSize: '0.78rem', padding: '12px 14px' }}>Gap ID</th>
                  <th style={{ width: 180, fontSize: '0.78rem', padding: '12px 14px' }}>Current State</th>
                  <th style={{ width: 180, fontSize: '0.78rem', padding: '12px 14px' }}>Desired State</th>
                  <th style={{ fontSize: '0.78rem', padding: '12px 14px' }}>Gap Description & Impact</th>
                  <th style={{ width: 160, fontSize: '0.78rem', padding: '12px 14px' }}>Recommended Direction</th>
                  <th style={{ width: 90, fontSize: '0.78rem', padding: '12px 14px' }}>Priority</th>
                  <th style={{ width: 110, fontSize: '0.78rem', padding: '12px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeGaps.map((gap, gIdx) => {
                  const isObj = typeof gap === 'object' && gap !== null;
                  const gId = isObj ? (gap.id || `GAP-0${gIdx + 1}`) : `GAP-0${gIdx + 1}`;
                  const curr = isObj ? (gap.currentState || 'Manual execution') : 'Manual operations';
                  const desired = isObj ? (gap.desiredState || 'Automated capability') : 'Automated capability';
                  const desc = isObj ? (gap.gapDescription || gap.description || gap.gap) : gap;
                  const impact = isObj ? (gap.businessImpact || gap.impact) : null;
                  const rec = isObj ? (gap.recommendedDirection || gap.recommendation) : 'Automate workflow';
                  const prio = isObj ? (gap.priority || 'HIGH') : 'HIGH';
                  const valStatus = isObj ? (gap.validationStatus || 'VALIDATION_REQUIRED') : 'VALIDATION_REQUIRED';

                  return (
                    <tr key={gIdx} style={{ height: 54 }}>
                      <td style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.84rem', color: '#EF4444', padding: '12px 14px' }}>
                        {gId}
                      </td>
                      <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', padding: '12px 14px', lineHeight: 1.4 }}>
                        {curr}
                      </td>
                      <td style={{ fontSize: '0.84rem', color: '#065F46', fontWeight: 600, padding: '12px 14px', lineHeight: 1.4 }}>
                        {desired}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {desc}
                        </div>
                        {impact && (
                          <div style={{ fontSize: '0.78rem', color: '#991B1B', marginTop: 2 }}>
                            <strong>Impact:</strong> {impact}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '12px 14px', lineHeight: 1.4 }}>
                        {rec}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={prio === 'HIGH' ? 'badge badge-red' : 'badge badge-gray'} style={{ fontSize: '0.72rem' }}>
                          {prio}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={valStatus === 'CONFIRMED' ? 'badge badge-green' : 'badge badge-amber'} style={{ fontSize: '0.72rem' }}>
                          {valStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. HIGH-IMPACT AUTOMATION OPPORTUNITIES TABLE                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={18} color="var(--accent-amber)" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {t.analysis.automationOpps}
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
                Prioritized digitization candidates with projected efficiency yields and integration dependencies.
              </p>
            </div>
          </div>
          <span className="badge badge-gray" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
            {(formData.automationOpportunities || []).length} Candidates
          </span>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table" style={{ width: '100%', minWidth: 780 }}>
            <thead>
              <tr>
                <th style={{ width: '28%', fontSize: '0.78rem', padding: '12px 14px' }}>Initiative Candidate</th>
                <th style={{ width: '12%', fontSize: '0.78rem', padding: '12px 14px' }}>Business Impact</th>
                <th style={{ width: '12%', fontSize: '0.78rem', padding: '12px 14px' }}>Implementation Effort</th>
                <th style={{ width: '24%', fontSize: '0.78rem', padding: '12px 14px' }}>Projected Impact</th>
                <th style={{ width: '12%', fontSize: '0.78rem', padding: '12px 14px' }}>Evidence</th>
                <th style={{ width: '12%', fontSize: '0.78rem', padding: '12px 14px' }}>Classification</th>
              </tr>
            </thead>
            <tbody>
              {(formData.automationOpportunities || []).map((opp, idx) => {
                const isObj = typeof opp === 'object' && opp !== null;
                const title = isObj ? (opp.title || opp.opportunity) : opp;
                const impact = isObj ? opp.impact : 'High';
                const effort = isObj ? opp.effort : 'Medium';
                const projected = isObj ? (opp.projectedMetric || opp.saving || 'Proposed target: Requires validation') : 'Proposed efficiency yield';
                const evidence = isObj ? (opp.source || opp.evidenceCitation || opp.evidence || 'Operational discovery analysis') : 'Discovery Context';
                const classification = isObj ? (opp.classification || 'AI_INFERENCE') : 'AI_INFERENCE';

                return (
                  <tr key={idx} style={{ height: 56 }}>
                    <td style={{ padding: '12px 14px', maxWidth: 300 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {title}
                      </div>
                      {(opp.problem || opp.problemAddressed || opp.rationale) && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.3 }}>
                          <strong>Problem:</strong> {opp.problem || opp.problemAddressed || opp.rationale}
                        </div>
                      )}
                      {(opp.potentialOutcome || opp.outcome) && (
                        <div style={{ fontSize: '0.78rem', color: '#065F46', marginTop: 2 }}>
                          <strong>Outcome:</strong> {opp.potentialOutcome || opp.outcome}
                        </div>
                      )}
                      {opp.dependencies && opp.dependencies.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {opp.dependencies.map((dep, dIdx) => (
                            <span key={dIdx} className="badge badge-gray" style={{ fontSize: '0.68rem', padding: '1px 6px', fontFamily: 'monospace' }}>
                              {dep}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={impact === 'High' ? 'badge badge-green' : 'badge badge-amber'} style={{ fontSize: '0.74rem' }}>
                        {impact}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-gray" style={{ fontSize: '0.74rem' }}>
                        {effort}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontSize: '0.88rem', padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{projected}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 600 }}>
                          Basis: AI estimate
                        </span>
                        <span className="badge badge-amber" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          {opp.validationStatus || 'VALIDATION_REQUIRED'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FileText size={12} color="#3B82F6" />
                        <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {evidence}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {renderTaxonomyBadge(classification)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5B. AI BUSINESS CONSULTANT — ARCHITECTURE & ECOSYSTEM RECOMMENDATIONS */}
      {/* ------------------------------------------------------------------ */}
      {formData.recommendations && formData.recommendations.length > 0 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={20} color="#6366F1" />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  AI Business Consultant — Architecture & Ecosystem Recommendations
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Strategic guidance and candidate technology patterns derived from evidence, business goals, and operational constraints.
                </p>
              </div>
            </div>
            <span className="badge badge-gray" style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
              {formData.recommendations.length} Recommendations
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
            {formData.recommendations.map((rec, rIdx) => {
              const isObj = typeof rec === 'object' && rec !== null;
              const recId = isObj ? (rec.id || `REC-0${rIdx + 1}`) : `REC-0${rIdx + 1}`;
              const title = isObj ? (rec.recommendation || rec.title || rec.name) : rec;
              const why = isObj ? (rec.why || rec.whyItFits || rec.rationale || rec.reason) : null;
              const linkedReq = isObj ? (rec.businessRequirement || rec.requirementId || rec.reqId) : null;
              const techRole = isObj ? (rec.technicalRole || rec.category || rec.role) : null;
              const dependency = isObj ? (rec.dependency || rec.dependencies) : null;
              const tradeOff = isObj ? (rec.tradeOff || rec.tradeoffs) : null;
              const valStatus = isObj ? (rec.validationStatus || 'VALIDATION_REQUIRED') : 'VALIDATION_REQUIRED';

              return (
                <div
                  key={rIdx}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.84rem', color: '#6366F1' }}>
                        {recId}
                      </span>
                      {techRole && (
                        <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                          {techRole}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {renderTaxonomyBadge('INFERENCE')}
                      <span className={valStatus === 'CONFIRMED' ? 'badge badge-green' : 'badge badge-amber'} style={{ fontSize: '0.7rem' }}>
                        {valStatus}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {title}
                  </div>

                  {why && (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Why it fits:</strong> {why}
                    </div>
                  )}

                  {linkedReq && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Addresses Requirement:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-amber)' }}>
                        {linkedReq}
                      </span>
                    </div>
                  )}

                  {(dependency || tradeOff) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 6, borderTop: '1px dashed var(--border-subtle)', fontSize: '0.8rem' }}>
                      {dependency && (
                        <div style={{ color: 'var(--text-muted)' }}>
                          <strong style={{ color: 'var(--text-secondary)' }}>Dependency:</strong> {Array.isArray(dependency) ? dependency.join(', ') : dependency}
                        </div>
                      )}
                      {tradeOff && (
                        <div style={{ color: 'var(--text-muted)' }}>
                          <strong style={{ color: 'var(--text-secondary)' }}>Trade-off:</strong> {tradeOff}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. SYSTEM REQUIREMENTS MATRIX (WITH DETAIL DRAWER TRIGGER)         */}
      {/* ------------------------------------------------------------------ */}
      <div id="requirements-matrix-section" className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={20} color="var(--accent-amber)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                {t.analysis.requirements}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Click any requirement to inspect full "Why" traceability, acceptance criteria, dependencies, and source citations.
              </p>
            </div>
          </div>
          <span className="badge badge-gray" style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
            {activeRequirements.length} Requirements
          </span>
        </div>

        <div className="table-responsive">
          <table className="enterprise-table" style={{ width: '100%', minWidth: 840 }}>
            <thead>
              <tr>
                <th style={{ width: 100, fontSize: '0.78rem', padding: '12px 14px' }}>Req ID</th>
                <th style={{ width: 150, fontSize: '0.78rem', padding: '12px 14px' }}>Classification</th>
                <th style={{ fontSize: '0.78rem', padding: '12px 14px' }}>Specification</th>
                <th style={{ width: 90, fontSize: '0.78rem', padding: '12px 14px' }}>Priority</th>
                <th style={{ width: 120, fontSize: '0.78rem', padding: '12px 14px' }}>Status</th>
                <th style={{ width: 110, fontSize: '0.78rem', textAlign: 'center', padding: '12px 14px' }}>Traceability</th>
              </tr>
            </thead>
            <tbody>
              {activeRequirements.map((req, idx) => {
                const isObj = typeof req === 'object' && req !== null;
                const reqId = isObj ? (req.id || `REQ-0${idx + 1}`) : `REQ-0${idx + 1}`;
                const classification = isObj ? (req.classification || req.type || 'CONFIRMED_FACT') : 'CONFIRMED_FACT';
                const title = isObj ? (req.title || reqId) : reqId;
                const specText = isObj ? (req.specification || req.text || req.statement || req.description) : req;
                const priority = isObj ? (req.priority || 'P1') : 'P1';
                const valStatus = isObj ? (req.validationStatus || 'CONFIRMED') : 'CONFIRMED';

                return (
                  <tr
                    key={idx}
                    id={`req-row-${reqId}`}
                    style={{ height: 54, cursor: 'pointer' }}
                    onClick={() => setSelectedReq(isObj ? req : { id: reqId, title, specification: specText })}
                  >
                    <td style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.88rem', color: 'var(--text-primary)', padding: '12px 14px' }}>
                      {reqId}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {renderTaxonomyBadge(classification)}
                    </td>
                    <td style={{ padding: '12px 14px', maxWidth: 460, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem', marginBottom: 2 }}>
                        {title}
                      </div>
                      <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        {specText}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={priority === 'P0' ? 'badge badge-red' : (priority === 'P1' ? 'badge badge-amber' : 'badge badge-gray')} style={{ fontSize: '0.74rem' }}>
                        {priority}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={valStatus === 'CONFIRMED' ? 'badge badge-green' : 'badge badge-amber'} style={{ fontSize: '0.74rem' }}>
                        {valStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReq(isObj ? req : { id: reqId, title, specification: specText });
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 7. DEDICATED CARDS: OPEN QUESTIONS & ASSUMPTIONS                   */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 24 }}>
        {/* Open Questions Card */}
        <div id="open-questions-section" className="card" style={{ borderLeft: '4px solid #EF4444', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={18} color="#EF4444" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                {t.analysis.openQuestionsTitle || 'Open Business & Technical Questions'}
              </h3>
            </div>
            <span className={openQuestionsCount > 0 ? 'badge badge-red' : 'badge badge-gray'} style={{ fontSize: '0.74rem' }}>
              {openQuestionsCount} Open {openQuestionsCount === 1 ? 'Item' : 'Items'}
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
            {t.analysis.openQuestionsDesc || 'Unresolved questions requiring stakeholder confirmation before architecture finalization.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {formData.openQuestions && formData.openQuestions.length > 0 ? (
              formData.openQuestions.map((q, qIdx) => {
                const isObj = typeof q === 'object' && q !== null;
                const qId = isObj ? (q.id || `OQ-0${qIdx + 1}`) : `OQ-0${qIdx + 1}`;
                const qText = isObj ? (q.question || q.text) : q;
                const qCat = isObj ? q.category : null;
                const qPriority = isObj ? (q.priority || 'HIGH') : 'HIGH';
                const qReason = isObj ? (q.reasonItMatters || q.whyItMatters || q.impact) : null;
                const qAffectedReq = isObj ? (q.affectedRequirement || q.requirementId) : null;
                const qAffectedArch = isObj ? (q.affectedArchitectureDecision || q.architectureImpact) : null;
                const qAction = isObj ? (q.actionRequired || q.resolution) : null;
                const qExpectedEvidence = isObj ? (q.expectedEvidence || q.evidenceNeeded || q.sourceNeeded) : null;
                const qOwner = isObj ? (q.owner || q.assignedTo || q.stakeholder) : null;
                const qStatus = isObj ? (q.status || (qPriority === 'BLOCKER' ? 'BLOCKER' : 'OPEN')) : 'OPEN';

                const prioBadgeClass = qPriority === 'BLOCKER' ? 'badge badge-red' : (qPriority === 'HIGH' ? 'badge badge-amber' : 'badge badge-gray');

                return (
                  <div key={qIdx} style={{ backgroundColor: 'var(--bg-subtle)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.82rem', color: '#EF4444' }}>
                          {qId}
                        </span>
                        {qCat && <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{qCat}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {qOwner && (
                          <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                            {qOwner}
                          </span>
                        )}
                        <span className={prioBadgeClass} style={{ fontSize: '0.7rem' }}>
                          {qPriority}
                        </span>
                        <span className={qStatus === 'BLOCKER' ? 'badge badge-red' : (qStatus === 'RESOLVED' ? 'badge badge-green' : 'badge badge-gray')} style={{ fontSize: '0.7rem' }}>
                          {qStatus}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {qText}
                    </div>

                    {qReason && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Why it matters:</strong> {qReason}
                      </div>
                    )}

                    {qExpectedEvidence && (
                      <div style={{ fontSize: '0.8rem', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '6px 10px', borderRadius: 4, borderLeft: '3px solid #3B82F6' }}>
                        <strong>Expected Evidence:</strong> {qExpectedEvidence}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.78rem' }}>
                      {qAffectedReq && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Affected Req:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-amber)' }}>{qAffectedReq}</span>
                        </div>
                      )}
                      {qAffectedArch && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Stage 3 Impact:</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{qAffectedArch}</span>
                        </div>
                      )}
                    </div>

                    {qAction && (
                      <div style={{ fontSize: '0.8rem', color: '#EF4444', fontWeight: 600, borderTop: '1px dashed var(--border-subtle)', paddingTop: 6, marginTop: 2 }}>
                        Action Required: {qAction}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                No blocking open questions recorded.
              </div>
            )}
          </div>
        </div>

        {/* Assumptions Card */}
        <div className="card" style={{ borderLeft: '4px solid var(--accent-amber)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                {t.analysis.assumptionsTitle || 'Documented Assumptions'}
              </h3>
            </div>
            <span className="badge badge-amber" style={{ fontSize: '0.74rem' }}>
              {assumptionsCount} {assumptionsCount === 1 ? 'Assumption' : 'Assumptions'}
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
            {t.analysis.assumptionsDesc || 'Analysis assumptions requiring enterprise verification during Stage 3 architecture.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {formData.assumptions && formData.assumptions.length > 0 ? (
              formData.assumptions.map((a, aIdx) => {
                const isObj = typeof a === 'object' && a !== null;
                const aId = isObj ? (a.id || `ASM-0${aIdx + 1}`) : `ASM-0${aIdx + 1}`;
                const aText = isObj ? (a.assumption || a.text) : a;
                const aWhy = isObj ? (a.whyItExists || a.rationale) : null;
                const aGap = isObj ? (a.evidenceGap || a.gap) : null;
                const aRisk = isObj ? (a.riskIfIncorrect || a.risk) : null;
                const aVal = isObj ? (a.validationRequired || a.validationStep) : null;
                const aDownstream = isObj ? (a.downstreamImpact || a.architectureImpact || a.downstreamArchitectureImpact) : null;
                const aStatus = isObj ? (a.status || a.validationStatus || 'PENDING_VALIDATION') : 'PENDING_VALIDATION';

                return (
                  <div key={aIdx} style={{ backgroundColor: 'var(--bg-subtle)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.82rem', color: 'var(--accent-amber)' }}>
                        {aId}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {renderTaxonomyBadge('ASSUMPTION')}
                        <span className={aStatus === 'VALIDATED' ? 'badge badge-green' : 'badge badge-amber'} style={{ fontSize: '0.7rem' }}>
                          {aStatus}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {aText}
                    </div>

                    {aWhy && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Why it exists:</strong> {aWhy}
                      </div>
                    )}

                    {aGap && (
                      <div style={{ fontSize: '0.82rem', color: '#B45309' }}>
                        <strong>Evidence gap:</strong> {aGap}
                      </div>
                    )}

                    {aRisk && (
                      <div style={{ fontSize: '0.82rem', color: '#991B1B' }}>
                        <strong>Risk if incorrect:</strong> {aRisk}
                      </div>
                    )}

                    {aDownstream && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Stage 3 Impact:</strong> {aDownstream}
                      </div>
                    )}

                    {aVal && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', fontWeight: 600, borderTop: '1px dashed var(--border-subtle)', paddingTop: 6, marginTop: 2 }}>
                        Validation Required: {aVal}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                No active operational assumptions recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 8. VALIDATION SUMMARY & NEXT RECOMMENDED ACTION CARD                */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          borderLeft: totalBlockersCount > 0 ? '5px solid #DC2626' : (validationRequiredReqsCount > 0 ? '5px solid var(--accent-amber)' : '5px solid #10B981'),
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 880 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckSquare size={20} color={totalBlockersCount > 0 ? '#DC2626' : (validationRequiredReqsCount > 0 ? 'var(--accent-amber)' : '#10B981')} />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: totalBlockersCount > 0 ? '#DC2626' : (validationRequiredReqsCount > 0 ? 'var(--accent-amber)' : '#10B981'), textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                BUSINESS ANALYSIS VALIDATION GATE
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="badge badge-gray" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                <strong>{totalReqsCount}</strong> Requirements Total
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                ✓ <strong>{evidenceBackedReqsCount}</strong> Evidence-Backed
              </span>
              {validationRequiredReqsCount > 0 && (
                <span className="badge badge-amber" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                  ⚡ <strong>{validationRequiredReqsCount}</strong> Validation Required
                </span>
              )}
              {totalBlockersCount > 0 ? (
                <span className="badge badge-red" style={{ fontSize: '0.78rem', padding: '4px 10px', fontWeight: 800 }}>
                  ⛔ <strong>{totalBlockersCount}</strong> {totalBlockersCount === 1 ? 'Blocker' : 'Blockers'}
                </span>
              ) : (
                <span className="badge badge-green" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                  ✓ <strong>0</strong> Blockers
                </span>
              )}
              <span className={openQuestionsCount > 0 ? 'badge badge-amber' : 'badge badge-gray'} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                {openQuestionsCount > 0 ? `⚠ ${openQuestionsCount} Open Question${openQuestionsCount === 1 ? '' : 's'}` : '0 Open Questions'}
              </span>
              <span className="badge badge-amber" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                <strong>{assumptionsCount}</strong> Assumptions Tracked
              </span>
              <span className="badge badge-gray" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                {valSummary?.evidenceGroundingRating || (documents.length > 0 ? 'High Evidence Grounding' : 'Dialogue-Grounded')}
              </span>
            </div>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Business requirements, transformation priorities, and operational constraints have been structured and verified against workspace context. Proceed to Stage 3: Solution Builder to evaluate candidate architecture patterns and technical trade-offs.
            </p>

            {/* THREE CLEAR STATES: A (Blocked), B (Ready with Validation Items), C (Fully Cleared) */}
            {totalBlockersCount > 0 ? (
              /* STATE A — BLOCKED */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', backgroundColor: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', fontWeight: 800, fontSize: '0.92rem' }}>
                  <AlertOctagon size={18} color="#DC2626" style={{ flexShrink: 0 }} />
                  <span>ARCHITECTURE HANDOFF BLOCKED</span>
                </div>
                <div style={{ fontSize: '0.86rem', color: '#991B1B', lineHeight: 1.4 }}>
                  Architecture handoff blocked because {totalBlockersCount} unresolved blocker item{totalBlockersCount === 1 ? '' : 's'} require confirmation before proceeding to Solution Builder ({blockerQuestionsCount} blocker question{blockerQuestionsCount === 1 ? '' : 's'}, {blockerReqsCount} blocking requirement{blockerReqsCount === 1 ? '' : 's'}).
                </div>
                {handoffGate.blockers.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    {handoffGate.blockers.map((b, bIdx) => (
                      <div key={bIdx} style={{ fontSize: '0.82rem', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>•</span>
                        <strong>[{b.type}] {b.id}:</strong>
                        <span>{b.title} — {b.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={scrollToBlockers}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderColor: '#F87171', color: '#DC2626', fontWeight: 700 }}
                  >
                    <AlertTriangle size={14} color="#DC2626" />
                    <span>Review Blockers ({totalBlockersCount})</span>
                  </button>
                </div>
              </div>
            ) : validationRequiredReqsCount > 0 ? (
              /* STATE B — READY WITH VALIDATION ITEMS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 16px', backgroundColor: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A', color: '#92400E' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem' }}>
                  <AlertTriangle size={17} color="#D97706" style={{ flexShrink: 0 }} />
                  <span>Architecture Handoff Ready — Validation Gate Passed</span>
                </div>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                  Validation Gate Passed — no blocking issues prevent architecture handoff.
                </div>
                <div style={{ fontSize: '0.83rem', color: '#B45309', fontWeight: 600 }}>
                  {validationRequiredReqsCount} item{validationRequiredReqsCount === 1 ? '' : 's'} remain marked <code>VALIDATION_REQUIRED</code> and will be carried into Stage 3 for confirmation.
                </div>
              </div>
            ) : (
              /* STATE C — FULLY CLEARED */
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', backgroundColor: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.86rem' }}>
                <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Validation Gate Cleared:</strong> All critical requirements and open items are grounded with verified evidence. Ready for Stage 3 Solution Architecture handoff.
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, alignSelf: 'center' }}>
            <button
              onClick={handleApprove}
              disabled={!handoffGate.canProceed}
              className="btn btn-primary btn-lg"
              style={{
                height: 46,
                padding: '0 24px',
                fontSize: '1rem',
                fontWeight: 700,
                opacity: !handoffGate.canProceed ? 0.5 : 1,
                cursor: !handoffGate.canProceed ? 'not-allowed' : 'pointer'
              }}
              title={!handoffGate.canProceed ? 'Resolve or validate all blockers before proceeding to Stage 3' : 'Continue to Solution Builder'}
            >
              <span>Continue to Solution Builder</span>
              <ArrowRight size={18} />
            </button>
            {!handoffGate.canProceed && (
              <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                Handoff blocked by {totalBlockersCount} unresolved item{totalBlockersCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 9. INTERACTIVE REQUIREMENT DETAIL DRAWER (SLIDE-OVER INSPECTOR)    */}
      {/* ------------------------------------------------------------------ */}
      {selectedReq && (
        <div className="modal-overlay" onClick={() => setSelectedReq(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 760, width: '100%', maxHeight: '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-amber)' }}>
                  {selectedReq.id || 'REQ-01'}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {selectedReq.title || 'Requirement Details'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: 6 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body with Traceability */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Classification & Metadata Badges */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {renderTaxonomyBadge(selectedReq.classification || selectedReq.type)}
                <span className="badge badge-amber" style={{ fontSize: '0.78rem' }}>
                  Priority: {selectedReq.priority || 'P1'}
                </span>
                <span className={selectedReq.validationStatus === 'CONFIRMED' ? 'badge badge-green' : 'badge badge-amber'} style={{ fontSize: '0.78rem' }}>
                  Status: {selectedReq.validationStatus || 'CONFIRMED'}
                </span>
              </div>

              {/* Full Specification */}
              <div>
                <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Requirement Specification
                </h4>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, padding: 14, backgroundColor: 'var(--bg-subtle)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  {selectedReq.statement && (
                    <div style={{ fontWeight: 600, marginBottom: selectedReq.specification ? 6 : 0 }}>
                      {selectedReq.statement}
                    </div>
                  )}
                  <div style={{ wordBreak: 'break-word' }}>
                    {selectedReq.specification || selectedReq.text || selectedReq.statement || 'No specification text provided.'}
                  </div>
                </div>
              </div>

              {/* Complete 5-Step "Why" Traceability Chain */}
              <div style={{ padding: 18, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} />
                  Complete "Why" Traceability & Grounding Chain
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Step 1: Originating Discovery Fact or User Input */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#EEF2FF', color: '#3730A3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2 }}>
                      1
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Originating Discovery Fact / Dialogue
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: 2 }}>
                        {selectedReq.originatingDiscoveryFact || selectedReq.originatingDialogue || selectedReq.traceability?.originatingDiscoveryFact || 'Evidence provenance unavailable — validation required.'}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Document Evidence Citation & Snippet */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2 }}>
                      2
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Source Document Citation & Evidence Snippet
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#1E40AF', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={14} />
                        <span>
                          {selectedReq.sourceDocumentEvidence || selectedReq.source || selectedReq.traceability?.sourceDocumentEvidence || 'Evidence provenance unavailable — validation required.'}
                        </span>
                      </div>
                      {(selectedReq.evidenceSnippet || selectedReq.sourceQuote || selectedReq.traceability?.evidenceSnippet) && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', backgroundColor: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: 4, marginTop: 4, borderLeft: '3px solid #3B82F6' }}>
                          "{selectedReq.evidenceSnippet || selectedReq.sourceQuote || selectedReq.traceability?.evidenceSnippet}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Business Problem Addressed */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2 }}>
                      3
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Business Problem Addressed
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: 2 }}>
                        {selectedReq.businessProblem || selectedReq.problemAddressed || selectedReq.rationale || 'Problem context pending validation'}
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Strategic Goal Alignment */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2 }}>
                      4
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Strategic Goal Alignment
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: 2 }}>
                        {selectedReq.strategicGoalAlignment || selectedReq.goalAlignment || selectedReq.parentGoal || selectedReq.traceability?.relatedStrategicGoal || 'Strategic alignment pending validation'}
                      </div>
                    </div>
                  </div>

                  {/* Step 5: Downstream Impact on Architecture */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#FAF5FF', color: '#6B21A8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2 }}>
                      5
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        Downstream Impact on Architecture (Stage 3)
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: 2 }}>
                        {selectedReq.downstreamArchitectureImpact || selectedReq.architectureImpact || selectedReq.technicalImpact || selectedReq.traceability?.downstreamImpact || 'Informs Stage 3 pattern selection, security boundaries, and non-functional requirements'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acceptance Criteria */}
              {selectedReq.acceptanceCriteria && selectedReq.acceptanceCriteria.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Acceptance Criteria
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedReq.acceptanceCriteria.map((crit, cIdx) => (
                      <div key={cIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <Check size={14} color="#10B981" style={{ marginTop: 3, flexShrink: 0 }} />
                        <span>{crit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              {selectedReq.dependencies && selectedReq.dependencies.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    System Dependencies
                  </h4>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedReq.dependencies.map((dep, dIdx) => (
                      <span key={dIdx} className="badge badge-gray" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedReq(null)} className="btn btn-secondary">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 10. DIGITAL MATURITY DIMENSION DETAIL INSPECTOR MODAL              */}
      {/* ------------------------------------------------------------------ */}
      {selectedDimension && (
        <div className="modal-overlay" onClick={() => setSelectedDimension(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 640, width: '100%', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={20} color="var(--accent-amber)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {selectedDimension.name || selectedDimension.key} Maturity Deep Dive
                </h3>
              </div>
              <button
                onClick={() => setSelectedDimension(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: 6 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Score and Stage */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Current Maturity Score
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: 2 }}>
                    Level {selectedDimension.score !== undefined && selectedDimension.score !== null ? selectedDimension.score : 1} / 5
                  </div>
                </div>
                <span className="badge badge-amber" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                  {selectedDimension.stage || (selectedDimension.score >= 4 ? 'Advanced' : (selectedDimension.score >= 3 ? 'Operational' : (selectedDimension.score >= 2 ? 'Emerging' : 'Initial / Manual')))}
                </span>
              </div>

              {/* Stage Description */}
              <div>
                <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Maturity Description
                </h4>
                <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5, padding: 12, backgroundColor: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                  {selectedDimension.description || selectedDimension.criteria || 'Maturity criteria evaluated across operational workflows and tooling.'}
                </div>
              </div>

              {/* Observable Evidence */}
              <div>
                <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} color="#3B82F6" />
                  Observable Evidence
                </h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 6, border: '1px solid #BFDBFE' }}>
                  {selectedDimension.observableEvidence || selectedDimension.evidence || 'No direct documentary proof observed. Score established from dialogue assertions.'}
                </div>
              </div>

              {/* Evidence Gap */}
              {selectedDimension.evidenceGap && (
                <div>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={15} color="#D97706" />
                    Evidence Gap & Missing Grounding
                  </h4>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, padding: 12, backgroundColor: '#FFFBEB', borderRadius: 6, border: '1px solid #FDE68A' }}>
                    {selectedDimension.evidenceGap}
                  </div>
                </div>
              )}

              {/* Recommended Next Step */}
              {selectedDimension.recommendedNextStep && (
                <div>
                  <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowRight size={15} color="#10B981" />
                    Recommended Next Step to Advance
                  </h4>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5, padding: 12, backgroundColor: '#ECFDF5', borderRadius: 6, border: '1px solid #A7F3D0' }}>
                    {selectedDimension.recommendedNextStep}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedDimension(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

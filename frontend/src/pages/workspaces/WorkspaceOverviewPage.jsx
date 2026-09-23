import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  UploadCloud,
  FileText,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';

function safeParseJson(data, fallback = null) {
  if (!data) return fallback;
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
}

export const WorkspaceOverviewPage = () => {
  const { id } = useParams();
  const { currentWorkspace, stages, nextAction, selectWorkspace, refreshWorkspace, setCurrentWorkspace } = useWorkspace();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (id) {
        try {
          const [wsRes, dash, docs] = await Promise.all([
            refreshWorkspace ? refreshWorkspace(id) : api.getWorkspace(id),
            api.getDashboardMetrics(id),
            api.getDocuments(id)
          ]);
          if (!isMounted) return;
          if (wsRes?.workspace) {
            setCurrentWorkspace(wsRes.workspace);
          }
          setDashboardData(dash);
          setDocuments(docs.documents || []);
        } catch (err) {
          console.error('Failed to load overview metrics:', err);
        }
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [id, refreshWorkspace, setCurrentWorkspace]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await api.uploadDocument(id, formData);
      showToast(`Uploaded "${file.name}" - ${res.statusLabel}`);
      const updatedDocs = await api.getDocuments(id);
      setDocuments(updatedDocs.documents || []);
      if (refreshWorkspace) {
        await refreshWorkspace(id);
      } else {
        await selectWorkspace(id);
      }
    } catch (err) {
      showToast(err.message || 'File upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await api.deleteDocument(id, docId);
      showToast('Document removed.');
      setDocuments(documents.filter((d) => d.id !== docId));
      if (refreshWorkspace) refreshWorkspace(id);
    } catch (err) {
      showToast('Failed to delete document', 'error');
    }
  };

  const handleReprocessDoc = async (docId) => {
    try {
      showToast('Reprocessing document extraction...');
      const updated = await api.reprocessDocument(id, docId);
      if (updated && updated.document) {
        setDocuments(documents.map((d) => (d.id === docId ? updated.document : d)));
        showToast(
          updated.document.status === 'ANALYZED' ? 'Extraction completed.' : 'Extraction failed.',
          updated.document.status === 'ANALYZED' ? 'success' : 'error'
        );
        if (refreshWorkspace) refreshWorkspace(id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to reprocess document', 'error');
    }
  };

  const ws = currentWorkspace;
  if (!ws) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading workspace context...</div>;

  const stageList = [
    { key: 'discovery', label: t.stages.discovery, path: `/app/workspaces/${id}/discovery` },
    { key: 'analysis', label: t.stages.analysis, path: `/app/workspaces/${id}/analysis` },
    { key: 'solution', label: t.stages.solution, path: `/app/workspaces/${id}/solution` },
    { key: 'architecture', label: t.stages.architecture, path: `/app/workspaces/${id}/architecture` },
    { key: 'process', label: t.stages.process, path: `/app/workspaces/${id}/process` },
    { key: 'ux', label: t.stages.ux, path: `/app/workspaces/${id}/ux` },
    { key: 'database', label: t.stages.database, path: `/app/workspaces/${id}/database` },
    { key: 'planning', label: t.stages.planning, path: `/app/workspaces/${id}/planning` },
    { key: 'collaboration', label: t.stages.collaboration || t.nav?.collaboration || 'Collaboration', path: `/app/workspaces/${id}/collaboration` },
    { key: 'exports', label: t.stages.exports || t.nav?.exports || 'Exports', path: `/app/workspaces/${id}/exports` }
  ];

  const isDemoWs = ws.isDemo || ws.id === 'ws-demo-customer-support';

  // Dynamic Header Information
  const localizedIndustry = ws.industry || 'Technology & Business Services';
  const localizedTitle = (isDemoWs && ws.name?.toLowerCase().includes('customer support') && (lang === 'hi' || lang === 'gu'))
    ? t.overview.customerSupportTitle
    : (ws.name ? ws.name.toUpperCase() : 'WORKSPACE OVERVIEW');
  const localizedDesc = (isDemoWs && ws.name?.toLowerCase().includes('customer support') && (lang === 'hi' || lang === 'gu'))
    ? t.overview.customerSupportDesc
    : ws.objective;

  // Organization Resolution: Never leak Acme Retail Global into non-demo workspaces
  let rawOrgName = ws.organization?.name || ws.organizationName;
  if (!isDemoWs && rawOrgName && rawOrgName.toLowerCase().includes('acme retail global')) {
    rawOrgName = null;
  }
  const organizationName = (rawOrgName && rawOrgName.trim())
    ? rawOrgName.trim()
    : (t.overview.orgNotSpecified || 'Organization not specified');

  // Dynamic Next Step Routing (evaluating stages in sequence)
  const getNextStepPath = () => {
    const currentStages = stages || dashboardData?.stages;
    if (!currentStages) return `/app/workspaces/${id}/discovery`;

    const sequence = [
      { key: 'discovery', path: `/app/workspaces/${id}/discovery` },
      { key: 'analysis', path: `/app/workspaces/${id}/analysis` },
      { key: 'solution', path: `/app/workspaces/${id}/solution` },
      { key: 'architecture', path: `/app/workspaces/${id}/architecture` },
      { key: 'process', path: `/app/workspaces/${id}/process` },
      { key: 'ux', path: `/app/workspaces/${id}/ux` },
      { key: 'database', path: `/app/workspaces/${id}/database` },
      { key: 'planning', path: `/app/workspaces/${id}/planning` },
      { key: 'collaboration', path: `/app/workspaces/${id}/collaboration` },
      { key: 'exports', path: `/app/workspaces/${id}/exports` }
    ];

    for (const item of sequence) {
      const st = currentStages[item.key];
      if (!st || (st.status !== 'COMPLETED' && st.status !== 'APPROVED')) {
        return item.path;
      }
    }
    return `/app/workspaces/${id}/exports`;
  };

  // Helper functions for semantic extraction
  const isBareNumericScore = (val) => {
    if (val === null || val === undefined) return false;
    const str = String(val).trim();
    return /^\d+(\.\d+)?%?$/.test(str) || /^\d+\s*\/\s*\d+$/.test(str);
  };

  const isSolutionSentence = (sentence) => {
    if (!sentence) return false;
    const s = sentence.trim().toLowerCase();
    return (
      s.startsWith('improve') ||
      s.startsWith('we want to build') ||
      s.startsWith('we want to create') ||
      s.startsWith('we want a') ||
      s.startsWith('build ') ||
      s.startsWith('create ') ||
      s.startsWith('replace ') ||
      s.startsWith('by replacing') ||
      s.startsWith('the goal is') ||
      s.startsWith('our goal is') ||
      s.startsWith('centralize') ||
      s.startsWith('streamline') ||
      s.startsWith('modernize') ||
      s.startsWith('enable') ||
      s.startsWith('deliver') ||
      s.startsWith('achieve')
    );
  };

  const isFrictionSentence = (sentence) => {
    if (!sentence) return false;
    const s = sentence.trim().toLowerCase();
    return (
      s.includes('currently') ||
      s.includes('manage') ||
      s.includes('struggle') ||
      s.includes('manual') ||
      s.includes('spreadsheet') ||
      s.includes('phone call') ||
      s.includes('waiting time') ||
      s.includes('conflict') ||
      s.includes('difficulty') ||
      s.includes('delay') ||
      s.includes('bottleneck') ||
      s.includes('siloed') ||
      s.includes('lack') ||
      s.includes('visibility') ||
      s.includes('fragmented') ||
      s.includes('track')
    );
  };

  const extractSentences = (text) => {
    if (!text) return [];
    const matches = text.match(/[^.!?\n]+[.!?\n]*/g);
    return matches ? matches.map(s => s.trim()).filter(Boolean) : [text.trim()];
  };

  // Dynamic Business Problem Diagnostic Extraction
  const latestAnalysis = ws.businessAnalyses?.[0] || null;
  const hasAnalysis = !!latestAnalysis;

  // 1. Target Users & Personas: Analysis stakeholders -> Workspace targetUsers -> Empty state
  let derivedTargetUsers = '';
  if (latestAnalysis?.stakeholders) {
    const parsedStakeholders = safeParseJson(latestAnalysis.stakeholders, []);
    if (Array.isArray(parsedStakeholders) && parsedStakeholders.length > 0) {
      derivedTargetUsers = parsedStakeholders
        .map(s => (typeof s === 'string' ? s : s?.role))
        .filter(Boolean)
        .join(', ');
    }
  }
  if (!derivedTargetUsers && ws.targetUsers && ws.targetUsers.trim()) {
    derivedTargetUsers = ws.targetUsers.trim();
  }
  if (!derivedTargetUsers) {
    derivedTargetUsers = t.overview.targetUsersPending || 'Not identified yet';
  }

  // 2. Current Operating Friction: Analysis currentState -> Workspace challenge/objective -> Empty state
  // CRITICAL RULE: Must describe what is wrong today, NEVER a solution/outcome!
  let derivedFriction = '';
  if (latestAnalysis?.currentState && latestAnalysis.currentState.trim()) {
    const sentences = extractSentences(latestAnalysis.currentState);
    const frictionOnly = sentences.filter(s => !isSolutionSentence(s));
    derivedFriction = (frictionOnly.length > 0 ? frictionOnly.join(' ') : latestAnalysis.currentState).trim();
  } else if (latestAnalysis?.painPoints) {
    const parsedPainPoints = safeParseJson(latestAnalysis.painPoints, []);
    if (Array.isArray(parsedPainPoints) && parsedPainPoints.length > 0) {
      derivedFriction = parsedPainPoints.filter(Boolean).join('; ');
    }
  }

  if (!derivedFriction) {
    // Check if ws.challenge is a friction statement (does not start with a solution verb)
    if (ws.challenge && ws.challenge.trim() && !isSolutionSentence(ws.challenge)) {
      derivedFriction = ws.challenge.trim();
    } else {
      // Look for friction sentences in ws.objective (which often contains user's full requirement)
      const objSentences = extractSentences(ws.objective);
      const frictionSentences = objSentences.filter(s => isFrictionSentence(s) && !isSolutionSentence(s));
      if (frictionSentences.length > 0) {
        derivedFriction = frictionSentences.join(' ');
      } else if (ws.challenge && ws.challenge.trim()) {
        derivedFriction = ws.challenge.trim();
      }
    }
  }

  if (!derivedFriction) {
    derivedFriction = t.overview.frictionPending || 'Business analysis not available yet';
  }

  // 3. Target Outcome: Analysis goals/futureState -> Workspace expectedOutcome/objective -> Empty state
  // CRITICAL RULE: Must describe desired business result. NEVER a bare numeric score like "70"!
  let derivedOutcome = '';
  if (latestAnalysis?.goals) {
    const parsedGoals = safeParseJson(latestAnalysis.goals, []);
    if (Array.isArray(parsedGoals) && parsedGoals.length > 0) {
      const validGoals = parsedGoals.filter(g => typeof g === 'string' && !isBareNumericScore(g) && g.trim().length > 3);
      if (validGoals.length > 0) {
        derivedOutcome = validGoals.join('; ');
      }
    }
  }
  if (!derivedOutcome && latestAnalysis?.futureState && latestAnalysis.futureState.trim()) {
    derivedOutcome = latestAnalysis.futureState.trim();
  }

  // Check expectedOutcome, but REJECT if it is a bare numeric score like "70" or number
  if (!derivedOutcome && ws.expectedOutcome && ws.expectedOutcome.trim()) {
    const trimmed = ws.expectedOutcome.trim();
    if (!isBareNumericScore(trimmed)) {
      derivedOutcome = trimmed;
    }
  }

  // Derive from solution sentences in ws.objective or ws.challenge
  if (!derivedOutcome) {
    const objSentences = extractSentences(ws.objective);
    const solutionSentences = objSentences.filter(s => isSolutionSentence(s));
    if (solutionSentences.length > 0) {
      derivedOutcome = solutionSentences.join(' ');
    } else if (ws.challenge && ws.challenge.trim() && isSolutionSentence(ws.challenge)) {
      derivedOutcome = ws.challenge.trim();
    } else if (ws.objective && ws.objective.trim() && !isBareNumericScore(ws.objective)) {
      derivedOutcome = ws.objective.trim();
    }
  }

  if (!derivedOutcome) {
    derivedOutcome = t.overview.outcomePending || 'Business outcome not defined yet';
  }

  return (
    <div className="overview-page-container">
      {/* Executive Header Banner */}
      <div className="overview-header-card">
        <div className="overview-header-content">
          <div className="overview-header-main">
            <div className="overview-header-meta">
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                {localizedIndustry}
              </span>
              {ws.isDemo && (
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                  {t.overview.demoBadge}
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                {t.common.status} <strong>{t.stages[ws.status?.toLowerCase()] || ws.status}</strong>
              </span>
            </div>

            <h1 className="overview-header-title">
              {localizedTitle}
            </h1>

            <p className="overview-header-desc">
              {localizedDesc}
            </p>
          </div>

          <div className="overview-header-actions">
            <Link
              to={`/app/workspaces/${id}/discovery`}
              className="btn btn-primary"
            >
              {t.overview.openDiscovery} <ArrowRight size={16} />
            </Link>
            <div className="overview-org-tag">
              {t.overview.orgPrefix || 'Org:'} {organizationName}
            </div>
          </div>
        </div>
      </div>

      {/* Next Recommended Action callout as distinct card */}
      <div className="overview-next-action-card">
        <div className="overview-next-action-content">
          <Sparkles size={18} color="#D97706" className="overview-next-action-icon" />
          <div className="overview-next-action-details">
            <span className="overview-next-action-tag">
              {t.overview.nextActionTag}
            </span>
            <div className="overview-next-action-title">
              {nextAction || t.overview.nextActionText}
            </div>
          </div>
        </div>
        <Link
          to={getNextStepPath()}
          className="btn btn-secondary btn-sm overview-next-action-btn"
        >
          {t.overview.executeNextStep} <ChevronRight size={14} />
        </Link>
      </div>

      {/* Lifecycle Stage Completion Progress */}
      <div className="card overview-pipeline-container" style={{ padding: '16px 20px' }}>
        <div className="overview-pipeline-header">
          <h3 className="overview-pipeline-title">
            <Layers size={18} color="var(--accent-amber)" />
            {t.overview.pipelineProgression}
          </h3>
        </div>

        <div className="overview-pipeline-grid">
          {stageList.map((st) => {
            const currentStages = stages || dashboardData?.stages;
            const stageData = currentStages?.[st.key];
            const status = stageData?.status || 'NOT_STARTED';
            const progress = stageData?.progress || 0;
            const isApproved = status === 'APPROVED';
            const isDone = status === 'COMPLETED';
            const isNeedsReview = status === 'NEEDS_REVIEW';
            const isBlocked = status === 'BLOCKED';
            const isInProgress = status === 'IN_PROGRESS' || (!isDone && !isApproved && !isNeedsReview && !isBlocked && progress > 0);

            let bgColor = 'var(--bg-subtle)';
            let borderColor = '1px solid var(--border-subtle)';
            let textColor = 'var(--text-muted)';
            let statusText = t.stages.pending || 'NOT STARTED';
            let IconComponent = <Clock size={14} color="var(--text-muted)" />;

            if (isApproved) {
              bgColor = 'var(--accent-green-light)';
              borderColor = '1px solid rgba(5,150,105,0.3)';
              textColor = 'var(--accent-green-text)';
              statusText = t.stages.approved || 'APPROVED';
              IconComponent = <CheckCircle2 size={15} color="#059669" />;
            } else if (isDone) {
              bgColor = 'var(--accent-green-light)';
              borderColor = '1px solid rgba(5,150,105,0.3)';
              textColor = 'var(--accent-green-text)';
              statusText = t.stages.ready || 'COMPLETED';
              IconComponent = <CheckCircle2 size={15} color="#059669" />;
            } else if (isBlocked) {
              bgColor = 'rgba(239, 68, 68, 0.1)';
              borderColor = '1px solid rgba(239, 68, 68, 0.3)';
              textColor = '#DC2626';
              statusText = 'BLOCKED';
              IconComponent = <AlertTriangle size={14} color="#DC2626" />;
            } else if (isNeedsReview) {
              bgColor = 'var(--accent-amber-light)';
              borderColor = '1px solid rgba(217,119,6,0.35)';
              textColor = 'var(--accent-amber-text)';
              statusText = 'NEEDS REVIEW';
              IconComponent = <AlertTriangle size={14} color="#D97706" />;
            } else if (isInProgress) {
              bgColor = 'var(--accent-amber-light)';
              borderColor = '1px solid rgba(217,119,6,0.3)';
              textColor = 'var(--accent-amber-text)';
              statusText = `${progress}%`;
              IconComponent = <Clock size={14} color="#D97706" />;
            }

            return (
              <div
                key={st.key}
                onClick={() => navigate(st.path)}
                className="overview-pipeline-card"
                style={{
                  backgroundColor: bgColor,
                  border: borderColor
                }}
              >
                <div className="overview-pipeline-card-top">
                  <span className="overview-pipeline-card-status" style={{ color: textColor }}>
                    {statusText}
                  </span>
                  {IconComponent}
                </div>
                <div className="overview-pipeline-card-name">
                  {st.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transformation Dashboard Assessment Scores */}
      {dashboardData && (
        <div className="overview-scores-grid">
          {Object.entries(dashboardData.assessmentScores || {}).map(([k, item]) => {
            const translatedLabel = 
              k === 'digitalMaturity' ? t.overview.scoreDigitalMaturity :
              k === 'aiReadiness' ? t.overview.scoreAiReadiness :
              k === 'solutionReadiness' ? t.overview.scoreSolutionReadiness :
              k === 'architectureReadiness' ? t.overview.scoreArchReadiness :
              k === 'implementationReadiness' ? (t.overview.scoreImplementationReadiness || 'ASSESSMENT SCORE: IMPLEMENTATION READINESS') :
              item.label;

            const isAssessed = item.score !== null && item.score !== undefined;

            return (
              <div key={k} className="card overview-score-card">
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {translatedLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0' }}>
                  <span style={{ fontSize: isAssessed ? '1.85rem' : '1.15rem', fontWeight: 800, color: isAssessed ? 'var(--accent-amber-hover)' : 'var(--text-muted)' }}>
                    {isAssessed ? item.score : (item.status || t.overview.notAssessed || 'Not assessed')}
                  </span>
                  {isAssessed && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {item.max}</span>}
                </div>
                <div style={{ height: 6, backgroundColor: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: isAssessed ? `${(item.score / item.max) * 100}%` : '0%',
                      backgroundColor: item.score > 75 ? 'var(--accent-green)' : 'var(--accent-amber)',
                      borderRadius: 3
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Two Column Grid: Context & Document Library */}
      <div className="grid-overview-2col" style={{ gap: 20 }}>
        {/* Business Context Diagnostic */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {t.overview.problemDiagnostic}
            </h3>
            <span
              className={hasAnalysis ? 'badge badge-green' : 'badge badge-amber'}
              style={{ fontSize: '0.68rem', fontWeight: 600 }}
            >
              {hasAnalysis
                ? `${t.overview.diagnosticFromAnalysis || 'Sourced from Business Analysis'} (v${latestAnalysis.version || 1})`
                : (t.overview.diagnosticFromInitial || 'Sourced from Initial Requirements')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t.overview.targetUsers}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.45 }}>
                {derivedTargetUsers}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t.overview.operatingFriction}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.45 }}>
                {derivedFriction}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t.overview.targetOutcome}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--accent-green-text)', fontWeight: 600, marginTop: 2, lineHeight: 1.45 }}>
                {derivedOutcome}
              </div>
            </div>

            <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <Link
                to={`/app/workspaces/${id}/discovery`}
                className="btn btn-outline btn-sm"
                style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
              >
                {t.overview.openDiscoveryDialog} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Document Library (PDF, SOP, BRD, DOCX) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {t.overview.docLibraryTitle}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {t.overview.docLibrarySubtitle}
              </p>
            </div>

            {/* Upload Button */}
            <label
              className="btn btn-secondary btn-sm"
              style={{ cursor: uploading ? 'not-allowed' : 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
            >
              <UploadCloud size={15} color="var(--accent-amber)" />
              {uploading ? t.common.processing : t.overview.uploadDoc}
              <input
                type="file"
                disabled={uploading}
                onChange={handleFileUpload}
                accept=".pdf,.docx,.doc,.ppt,.pptx,.txt,.md,.json,.sop,.brd"
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {documents.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px dashed var(--border-medium)' }}>
              <FileText size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {t.overview.noDocsUploaded}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {t.overview.uploadSopHelp}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <FileText size={18} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.originalName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {(doc.fileSize / 1024).toFixed(1)} KB · {
                          doc.status === 'ANALYZED'
                            ? (lang === 'hi' ? 'विश्लेषित' : lang === 'gu' ? 'વિશ્લેષિત' : 'Analyzed')
                            : doc.status === 'FAILED'
                              ? 'Extraction Failed'
                              : 'Processing'
                        }
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span className={doc.status === 'ANALYZED' ? 'badge badge-green' : doc.status === 'FAILED' ? 'badge badge-red' : 'badge badge-gray'} style={{ fontSize: '0.65rem' }}>
                      {doc.status === 'ANALYZED' ? t.stages.ready : doc.status === 'FAILED' ? 'Failed' : t.stages.pending}
                    </span>
                    {doc.status === 'FAILED' && (
                      <button
                        onClick={() => handleReprocessDoc(doc.id)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '8px 10px', fontSize: '0.75rem', color: 'var(--accent-amber)', minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Retry Extraction"
                        aria-label="Retry extraction"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                    {doc.extractedText && (
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '8px 10px', fontSize: '0.75rem', minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title={t('View Extracted Text')}
                        aria-label="View extracted text"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8, minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      title={t('Delete Document')}
                      aria-label="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Extracted Document Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontWeight: 700 }}>{previewDoc.originalName}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-green-text)', fontWeight: 600 }}>{t.overview.extractedDiagnostic}</span>
              </div>
              <button onClick={() => setPreviewDoc(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 20, maxHeight: 400, overflowY: 'auto' }}>
              <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: 14, borderRadius: 8 }}>
                {previewDoc.extractedText}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

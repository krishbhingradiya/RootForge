import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import {
  GitFork,
  Sparkles,
  Plus,
  RefreshCw,
  Save,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Play,
  Check,
  AlertTriangle,
  UserCheck,
  Cpu,
  Layers,
  Activity,
  ShieldAlert,
  Info,
  Sliders,
  Clock,
  RotateCcw,
  Eye,
  FileCheck,
  Link2,
  Server,
  Zap,
  CheckSquare,
  Lock,
  CornerDownRight,
  HelpCircle,
  Download
} from 'lucide-react';
import {
  buildProcessViewModel,
  STEP_TYPE_META,
  normalizeStepType,
  parseActionableIssues
} from './processViewModel';
import { BpmnProcessMapView } from './components/BpmnProcessMapView';
import { ApprovalWorkflowView } from './components/ApprovalWorkflowView';
import { ProcessOptimizationView } from './components/ProcessOptimizationView';
import { ValidationView } from './components/ValidationView';
import { HistoryCollaborationView } from './components/HistoryCollaborationView';
import { ProcessExportModal } from './components/ProcessExportModal';

const GENERATION_STAGES = [
  '1. Loading workspace context',
  '2. Analyzing requirements',
  '3. Reading business analysis',
  '4. Reading solution strategy',
  '5. Reading architecture',
  '6. Generating workflow',
  '7. Building decision logic',
  '8. Building swimlanes',
  '9. Building traceability',
  '10. Validating workflow',
  '11. Persisting process design',
  '12. Complete'
];

const initialStepState = {
  label: '',
  type: 'ACTION',
  actor: '',
  system: '',
  action: '',
  description: '',
  condition: '',
  sla: '',
  retryPolicy: '',
  failureHandling: '',
  timeoutPolicy: '',
  escalationPolicy: '',
  preconditions: '',
  postconditions: '',
  input: '',
  output: '',
  requirementIds: '',
  architectureNodeId: ''
};

export const ProcessDesignerPage = () => {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [processModel, setProcessModel] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(1);
  const [generationError, setGenerationError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [staleReason, setStaleReason] = useState(null);

  // Upstream context reference (for requirements & architecture nodes)
  const [workspaceContext, setWorkspaceContext] = useState(null);

  // Active View Tab: LINEAR_WORKFLOW | SWIMLANE_MATRIX | DECISION_TREE | TRACEABILITY
  const [activeView, setActiveView] = useState('LINEAR_WORKFLOW');

  // Selected Step for Inspector Drawer
  const [selectedStepId, setSelectedStepId] = useState(null);

  // Validation details toggle
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Version History Modal
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Add Step Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newStep, setNewStep] = useState(initialStepState);

  // Edit Step Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState(null);

  // Multi-format Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Collaboration Comments & Activity Logs
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);

  const loadCollaboration = async () => {
    try {
      setLoadingComments(true);
      const res = await api.getCollaboration(id);
      if (res) {
        const procComments = (res.comments || []).filter(
          (c) => c.artifactType === 'PROCESS' || c.artifactType === 'GENERAL'
        );
        setComments(procComments);
        setActivityLogs(res.activityLogs || []);
      }
    } catch (err) {
      console.warn('Could not load collaboration:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (content) => {
    try {
      await api.createComment(id, { artifactType: 'PROCESS', content });
      showToast('Review comment posted', 'success');
      await loadCollaboration();
    } catch (err) {
      showToast('Failed to post comment', 'error');
    }
  };

  const loadProcess = async () => {
    try {
      setLoading(true);
      setGenerationError(null);

      // Load process model (tenant-scoped)
      const res = await api.getProcess(id);
      if (res.processModel && res.processModel.workspaceId === id) {
        setProcessModel(res.processModel);
        setNodes(res.processModel.nodes || []);
        setIsStale(Boolean(res.isStale));
        setStaleReason(res.staleReason || null);
      } else {
        setProcessModel(null);
        setNodes([]);
        setIsStale(false);
        setStaleReason(null);
      }

      // Load upstream workspace context for dynamic forms and traceability
      try {
        const [wsData, analysisData, archData] = await Promise.allSettled([
          api.getWorkspace(id),
          api.getAnalysis(id),
          api.getArchitecture(id)
        ]);

        let analysisObj = analysisData.status === 'fulfilled' ? (analysisData.value?.analysis || null) : null;
        if (analysisObj && typeof analysisObj.requirements === 'string') {
          try {
            analysisObj = { ...analysisObj, requirements: JSON.parse(analysisObj.requirements) };
          } catch (e) {
            // keep as is
          }
        }

        const ctx = {
          workspace: wsData.status === 'fulfilled' ? wsData.value?.workspace : null,
          businessAnalysis: analysisObj,
          architecture: archData.status === 'fulfilled' ? archData.value?.architecture : null
        };
        setWorkspaceContext(ctx);
      } catch (ctxErr) {
        console.warn('Could not load full upstream context for process designer:', ctxErr);
      }

      // Load versions and collaboration data
      api.getProcessVersions(id).then((vRes) => setVersions(vRes?.versions || [])).catch(() => {});
      loadCollaboration();
    } catch (err) {
      console.error('Failed to load process model:', err);
    } finally {
      setLoading(false);
    }
  };

  // Section 15: Mandatory immediate state clearance on workspace switch
  useEffect(() => {
    setProcessModel(null);
    setNodes([]);
    setSelectedStepId(null);
    setIsStale(false);
    setStaleReason(null);
    setGenerationError(null);
    setWorkspaceContext(null);
    setVersionHistoryOpen(false);
    loadProcess();
  }, [id]);

  // Canonical Single Source of Truth View Model
  const vm = useMemo(() => {
    if (!processModel) return null;
    return buildProcessViewModel(
      {
        ...processModel,
        nodes
      },
      {
        isStale,
        staleReason,
        context: workspaceContext
      }
    );
  }, [processModel, nodes, isStale, staleReason, workspaceContext]);

  // Selected step object for Inspector
  const selectedStep = useMemo(() => {
    if (!vm || !selectedStepId) return null;
    return vm.stepMap.get(selectedStepId) || null;
  }, [vm, selectedStepId]);

  const handleGenerate = async () => {
    let stepTimer = null;
    try {
      setGenerating(true);
      setGenerationError(null);
      setGenerationStep(1);

      stepTimer = setInterval(() => {
        setGenerationStep((prev) => (prev < 11 ? prev + 1 : prev));
      }, 600);

      const res = await api.generateProcess(id);
      clearInterval(stepTimer);
      setGenerationStep(12);

      setProcessModel(res.processModel);
      setNodes(res.processModel.nodes || []);
      setIsStale(false);
      setStaleReason(null);
      setSelectedStepId(null);
      showToast(
        lang === 'hi'
          ? 'प्रक्रिया मॉडल उत्पन्न हुआ!'
          : lang === 'gu'
          ? 'પ્રક્રિયા મોડેલ જનરેટ થયું!'
          : 'Process model generated!'
      );
    } catch (err) {
      if (stepTimer) clearInterval(stepTimer);
      const title = err.message || 'Process generation failed';
      setGenerationError({ title, details: err.details || '' });
      showToast(title, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    return handleGenerate();
  };

  const handleValidate = async () => {
    try {
      const res = await api.validateProcess(id);
      if (res.report) {
        setProcessModel((prev) => ({
          ...prev,
          validationStateJson: JSON.stringify(res.report),
          status: res.report.status
        }));
        if (res.report.isValid) {
          showToast(`Validation: ${res.report.status} (${res.report.warnings.length} warning(s))`);
        } else {
          showToast(`Validation failed: ${res.report.errors.length} blocking error(s).`, 'error');
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to validate process', 'error');
    }
  };

  const handleSaveVersion = async () => {
    try {
      const res = await api.saveProcessVersion(id, {
        notes: 'User updated process model nodes'
      });
      if (res.processModel) {
        setProcessModel(res.processModel);
        showToast(`Saved version snapshot v${res.processModel.version}`);
      }
    } catch (err) {
      showToast('Failed to save version', 'error');
    }
  };

  const handleOpenVersionHistory = async () => {
    try {
      setLoadingVersions(true);
      setVersionHistoryOpen(true);
      const res = await api.getProcessVersions(id);
      setVersions(res.versions || []);
    } catch (err) {
      showToast(err.message || 'Failed to load version history', 'error');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (versionNum) => {
    try {
      const res = await api.restoreProcessVersion(id, versionNum);
      if (res.processModel) {
        setProcessModel(res.processModel);
        setNodes(res.processModel.nodes || []);
        setVersionHistoryOpen(false);
        showToast(`Restored process design to snapshot v${versionNum}!`);
        await handleValidate();
      }
    } catch (err) {
      showToast(err.message || 'Failed to restore version', 'error');
    }
  };

  const handleApprove = async () => {
    try {
      const res = await api.approveProcess(id);
      if (res.processModel) {
        setProcessModel(res.processModel);
        showToast('Process Model approved! Navigating to UX Designer...');
        navigate(`/app/workspaces/${id}/ux`);
      }
    } catch (err) {
      showToast(err.message || 'Approval blocked by validation checks', 'error');
    }
  };

  const handleAddStep = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newStep,
        stepOrder: nodes.length + 1,
        classification: 'USER_ADDED',
        sourceContext: 'USER_ADDED'
      };
      const res = await api.addProcessNode(id, payload);
      setNodes([...nodes, res.node]);
      setAddModalOpen(false);
      setNewStep(initialStepState);
      setSelectedStepId(res.node.id);
      showToast(`Process step "${res.node.label}" added.`);
      await handleValidate();
    } catch (err) {
      showToast(err.message || 'Failed to add step', 'error');
    }
  };

  const handleOpenEdit = (node) => {
    setEditingStep({
      ...node,
      action: node.action || '',
      system: node.system || '',
      condition: node.condition || '',
      sla: node.sla || '',
      retryPolicy: node.retryPolicy || '',
      failureHandling: node.failureHandling || '',
      timeoutPolicy: node.timeoutPolicy || '',
      escalationPolicy: node.escalationPolicy || '',
      preconditions: node.preconditions || '',
      postconditions: node.postconditions || '',
      input: node.input || '',
      output: node.output || '',
      architectureNodeId: node.architectureNodeId || '',
      requirementIds: Array.isArray(node.requirementIds)
        ? node.requirementIds.join(', ')
        : (node.requirementIds || '')
    });
    setEditModalOpen(true);
  };

  const handleUpdateStep = async (e) => {
    e.preventDefault();
    if (!editingStep) return;
    try {
      const payload = {
        ...editingStep,
        classification: editingStep.classification === 'USER_ADDED' ? 'USER_ADDED' : 'USER_MODIFIED',
        sourceContext: 'USER_MODIFIED'
      };
      const res = await api.updateProcessNode(id, editingStep.id, payload);
      setNodes(nodes.map((n) => (n.id === editingStep.id ? res.node : n)));
      setEditModalOpen(false);
      setEditingStep(null);
      showToast('Step updated successfully.');
      await handleValidate();
    } catch (err) {
      showToast(err.message || 'Failed to update step', 'error');
    }
  };

  const handleMoveStep = async (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= nodes.length) return;

    const newNodes = [...nodes];
    const temp = newNodes[idx];
    newNodes[idx] = newNodes[targetIdx];
    newNodes[targetIdx] = temp;

    newNodes[idx].stepOrder = idx + 1;
    newNodes[targetIdx].stepOrder = targetIdx + 1;

    setNodes(newNodes);

    try {
      await Promise.all([
        api.updateProcessNode(id, newNodes[idx].id, { stepOrder: idx + 1 }),
        api.updateProcessNode(id, newNodes[targetIdx].id, { stepOrder: targetIdx + 1 })
      ]);
    } catch (err) {
      console.error('Failed to sync step order:', err);
    }
  };

  const handleDeleteStep = async (nodeId, e) => {
    e?.stopPropagation?.();
    try {
      await api.deleteProcessNode(id, nodeId);
      setNodes(nodes.filter((n) => n.id !== nodeId));
      if (selectedStepId === nodeId) setSelectedStepId(null);
      showToast('Step removed.');
      await handleValidate();
    } catch (err) {
      showToast('Failed to delete step', 'error');
    }
  };

  const getStepBadge = (type) => {
    const norm = normalizeStepType(type);
    const meta = STEP_TYPE_META[norm] || STEP_TYPE_META[type] || STEP_TYPE_META.ACTION;
    return (
      <span
        style={{
          fontSize: '0.66rem',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: 4,
          backgroundColor: meta.bg,
          color: meta.color,
          border: `1px solid ${meta.border}`,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        {norm === 'AUTOMATION' && <Cpu size={10} />}
        {norm === 'DECISION_GATE' && <Sliders size={10} />}
        {norm === 'HUMAN_APPROVAL' && <UserCheck size={10} />}
        {norm === 'INTEGRATION' && <Link2 size={10} />}
        {meta.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const s = String(status || 'DRAFT').toUpperCase();
    if (s === 'VALIDATED') {
      return <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>VALIDATED</span>;
    }
    if (s === 'VALIDATED WITH WARNINGS') {
      return <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>VALIDATED WITH WARNINGS</span>;
    }
    if (s === 'INVALID') {
      return <span className="badge" style={{ backgroundColor: 'var(--accent-red-light)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.7rem' }}>INVALID</span>;
    }
    if (s === 'STALE') {
      return <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>STALE</span>;
    }
    return <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{s}</span>;
  };

  const getCoverageBadge = (coverage) => {
    switch (coverage) {
      case 'FULL':
        return <span className="badge badge-green" style={{ fontSize: '0.7rem', fontWeight: 800 }}>FULL COVERAGE</span>;
      case 'PARTIAL':
        return <span className="badge badge-amber" style={{ fontSize: '0.7rem', fontWeight: 800 }}>PARTIAL</span>;
      case 'VALIDATION_REQUIRED':
        return <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: '1px solid rgba(168, 85, 247, 0.35)', fontSize: '0.7rem', fontWeight: 800 }}>VALIDATION REQ</span>;
      default:
        return <span className="badge" style={{ backgroundColor: 'var(--accent-red-light)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.4)', fontSize: '0.7rem', fontWeight: 800 }}>UNMAPPED</span>;
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>{t.common.loading}</div>;
  }

  // Section 23: 12-Stage Animated Generation Loading Screen
  if (generating) {
    return (
      <div className="card" style={{ padding: '40px 30px', maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
        <RefreshCw size={36} color="var(--accent-amber)" className="spin" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
          Generating Process Workflow Intelligence
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
          Synthesizing end-to-end execution path, dynamic decision trees, actor swimlanes, and requirement traceability.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, textAlign: 'left', maxWidth: 460, margin: '0 auto' }}>
          {GENERATION_STAGES.map((stepText, idx) => {
            const stepNum = idx + 1;
            const isDone = generationStep > stepNum;
            const isCurrent = generationStep === stepNum;
            return (
              <div
                key={stepNum}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: '0.84rem',
                  color: isDone ? 'var(--accent-green)' : isCurrent ? 'var(--accent-amber)' : 'var(--text-muted)',
                  fontWeight: isCurrent ? 700 : 500,
                  transition: 'all 0.2s ease'
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDone
                      ? 'var(--accent-green-light)'
                      : isCurrent
                      ? 'var(--accent-amber-light)'
                      : 'var(--bg-subtle)',
                    border: `1px solid ${
                      isDone ? 'var(--accent-green)' : isCurrent ? 'var(--accent-amber)' : 'var(--border-subtle)'
                    }`,
                    flexShrink: 0
                  }}
                >
                  {isDone ? (
                    <Check size={12} color="var(--accent-green)" />
                  ) : isCurrent ? (
                    <RefreshCw size={11} className="spin" color="var(--accent-amber)" />
                  ) : (
                    <span style={{ fontSize: '0.68rem' }}>{stepNum}</span>
                  )}
                </div>
                <span>{stepText}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Empty State: Section 30
  if (!processModel) {
    return (
      <div className="card" style={{ padding: '60px 40px', textAlign: 'center', maxWidth: 640, margin: '40px auto' }}>
        <GitFork size={48} color="var(--accent-amber)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
          {t.process.engineTitle}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
          No process design generated yet. Generate a workspace-aware, data-driven workflow model from upstream Discovery, Requirements, Solution Option, and Architecture topology.
        </p>

        {generationError && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--accent-red-light)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 8,
              color: 'var(--accent-red-text)',
              fontSize: '0.85rem',
              marginBottom: 20,
              textAlign: 'left'
            }}
          >
            <strong>Generation Error:</strong> {generationError.title}
          </div>
        )}

        <button onClick={handleGenerate} disabled={generating} className="btn btn-primary btn-lg" style={{ margin: '0 auto' }}>
          <Sparkles size={18} />
          {generating ? t.process.generatingBtn : 'Generate Process Design'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
      {/* Header & Main Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t.process.title}</h1>
            {getStatusBadge(vm?.validationReport?.status || processModel.status)}
            <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Version {processModel.version}</span>
            {isStale && (
              <span className="badge badge-amber" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={11} /> STALE CONTEXT
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {processModel.description || 'Workspace-specific business process workflow derived from upstream analysis and architecture topology.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setAddModalOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Step
          </button>
          <button onClick={() => setExportModalOpen(true)} className="btn btn-secondary btn-sm" title="Multi-Format Process Export">
            <Download size={14} /> Export
          </button>
          <button onClick={handleValidate} className="btn btn-secondary btn-sm" title="Run 20 validation checks">
            <CheckSquare size={14} /> Validate
          </button>
          <button onClick={() => setActiveView('HISTORY')} className="btn btn-secondary btn-sm" title="View Version Snapshots & History">
            <Clock size={14} /> History (v{processModel.version})
          </button>
          <button onClick={handleSaveVersion} className="btn btn-secondary btn-sm">
            <Save size={14} /> Save Snapshot
          </button>
          <button onClick={handleRegenerate} disabled={generating} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={generating ? 'spin' : ''} /> Regenerate
          </button>
          <button
            onClick={handleApprove}
            disabled={vm?.isApprovalBlocked}
            className={`btn btn-sm ${vm?.isApprovalBlocked ? 'btn-secondary' : 'btn-dark'}`}
            style={{
              fontWeight: 700,
              cursor: vm?.isApprovalBlocked ? 'not-allowed' : 'pointer',
              opacity: vm?.isApprovalBlocked ? 0.6 : 1
            }}
            title={vm?.isApprovalBlocked ? 'Approval blocked by validation checks' : 'Approve & Proceed to UX'}
          >
            {vm?.isApprovalBlocked ? <Lock size={13} style={{ marginRight: 4 }} /> : null}
            Approve & Next: UX Wireframes <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Section 16: Stale Context Alert Banner */}
      {isStale && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid var(--accent-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
            <AlertTriangle size={22} color="var(--accent-amber)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Process design is based on an earlier version of the upstream solution.
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {staleReason || 'Upstream requirements, solution options, or architecture nodes have mutated.'}
              </div>
            </div>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="btn btn-primary btn-sm"
            style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}
          >
            <Sparkles size={14} /> Regenerate Process
          </button>
        </div>
      )}

      {/* Section 21: Approval Blocking Alert Box */}
      {vm?.isApprovalBlocked && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontWeight: 800, fontSize: '0.88rem' }}>
            <ShieldAlert size={18} />
            Approval Blocked: Resolving the following issue(s) is required before proceeding to UX Designer:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 26 }}>
            {vm.blockingReasons.map((reason, idx) => (
              <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                • {reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9 Canonical View Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'LINEAR_WORKFLOW', label: 'Linear Workflow', count: vm?.totalSteps },
          { key: 'SWIMLANE_MATRIX', label: 'Swimlane Matrix', count: vm?.totalActors },
          { key: 'BPMN_PROCESS_MAP', label: 'BPMN Process Map', count: vm?.bpmnElements?.tasks?.length },
          { key: 'DECISION_TREE', label: 'Decision Tree', count: vm?.decisionTreeNodes?.length },
          { key: 'APPROVAL_WORKFLOW', label: 'Approval Workflow', count: vm?.approvals?.length },
          { key: 'TRACEABILITY', label: 'Requirements Traceability', count: vm?.totalRequirements },
          { key: 'OPTIMIZATION', label: 'Optimization', count: vm?.optimizations?.recommendations?.length },
          { key: 'VALIDATION', label: 'Validation', count: vm?.validationReport?.checksCount || 20 },
          { key: 'HISTORY', label: 'History', count: versions.length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className="btn btn-sm"
            style={{
              backgroundColor: activeView === tab.key ? 'var(--accent-amber)' : 'transparent',
              color: activeView === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
              borderColor: activeView === tab.key ? 'var(--accent-amber)' : 'var(--border-subtle)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: activeView === tab.key ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-subtle)',
                  color: activeView === tab.key ? '#FFFFFF' : 'var(--text-muted)'
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Workspace Canvas */}
      <div style={{ display: 'flex', gap: 20, position: 'relative', minHeight: 500 }}>
        {/* Active Tab View */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* TAB 1: Linear Workflow View */}
          {activeView === 'LINEAR_WORKFLOW' && vm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {vm.steps.map((node, idx) => {
                const isSelected = selectedStepId === node.id;
                const meta = STEP_TYPE_META[normalizeStepType(node.type)] || STEP_TYPE_META.ACTION;

                return (
                  <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      className="card"
                      onClick={() => setSelectedStepId(node.id)}
                      style={{
                        width: '100%',
                        maxWidth: 860,
                        padding: '16px 20px',
                        borderLeft: `5px solid ${meta.border}`,
                        border: isSelected ? '2px solid var(--accent-amber)' : undefined,
                        borderLeftColor: isSelected ? 'var(--accent-amber)' : meta.border,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        cursor: 'pointer',
                        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                        transition: 'box-shadow 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: isSelected ? 'var(--accent-amber-light)' : 'var(--bg-subtle)',
                            border: `1px solid ${isSelected ? 'var(--accent-amber)' : 'var(--border-medium)'}`,
                            color: isSelected ? 'var(--accent-amber-text)' : 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}
                        >
                          {node.stepOrder}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            {getStepBadge(node.type)}
                            {node.classification === 'USER_ADDED' && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
                                USER ADDED
                              </span>
                            )}
                            {node.classification === 'USER_MODIFIED' && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber-text)', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                                MODIFIED
                              </span>
                            )}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              Actor: <strong style={{ color: 'var(--text-primary)' }}>{node.actor || 'Not specified'}</strong>
                            </span>
                            {node.system && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                • System: <strong style={{ color: 'var(--text-secondary)' }}>{node.system}</strong>
                              </span>
                            )}
                            {node.sla && (
                              <span style={{ fontSize: '0.66rem', color: 'var(--accent-amber-text)', background: 'var(--accent-amber-light)', padding: '1px 6px', borderRadius: 4, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={10} /> SLA: {node.sla}
                              </span>
                            )}
                          </div>

                          <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                            {node.label}
                          </div>

                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.45 }}>
                            {node.description}
                          </div>

                          {node.condition && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--accent-amber-text)', marginTop: 4, fontWeight: 600 }}>
                              IF: {node.condition}
                            </div>
                          )}

                          {/* Execution semantics tags */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            {node.failureHandling ? (
                              <span style={{ fontSize: '0.66rem', color: 'var(--accent-red-text)', background: 'var(--accent-red-light)', padding: '2px 7px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <ShieldAlert size={10} /> Fail: {node.failureHandling}
                              </span>
                            ) : ['INTEGRATION', 'AUTOMATION', 'ACTION', 'NOTIFICATION', 'SUB_PROCESS', 'DECISION_GATE'].includes(normalizeStepType(node.type)) ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.65rem', color: '#EF4444', fontStyle: 'italic' }}>
                                  Failure policy not specified — validation required
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEdit(node);
                                  }}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: 4,
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    padding: '1px 6px',
                                    fontSize: '0.65rem',
                                    fontWeight: 700
                                  }}
                                >
                                  Fix Step
                                </button>
                              </span>
                            ) : null}

                            {node.requirementIds.map((reqId) => (
                              <span key={reqId} style={{ fontSize: '0.64rem', color: 'var(--accent-blue-text)', background: 'var(--accent-blue-light)', padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>
                                {reqId}
                              </span>
                            ))}

                            {node.architectureNodeId && (
                              <span style={{ fontSize: '0.64rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace' }}>
                                Arch: {node.architectureNodeId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStepId(node.id);
                          }}
                          style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                          title="Inspect Step"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveStep(idx, 'up');
                          }}
                          disabled={idx === 0}
                          style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4, color: idx === 0 ? 'var(--border-medium)' : 'var(--text-muted)', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                          title="Move Up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveStep(idx, 'down');
                          }}
                          disabled={idx === nodes.length - 1}
                          style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4, color: idx === nodes.length - 1 ? 'var(--border-medium)' : 'var(--text-muted)', cursor: idx === nodes.length - 1 ? 'not-allowed' : 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                          title="Move Down"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(node);
                          }}
                          style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                          title="Edit Step"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteStep(node.id, e)}
                          style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 4, color: '#EF4444', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
                          title="Remove Step"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Transition indicator */}
                    {idx < vm.steps.length - 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '3px 0', position: 'relative' }}>
                        {node.condition && (
                          <div style={{ fontSize: '0.64rem', color: 'var(--accent-amber-text)', background: 'var(--accent-amber-light)', padding: '1px 6px', borderRadius: 4, fontWeight: 700, marginBottom: 2 }}>
                            Default Route
                          </div>
                        )}
                        <div style={{ height: 24, width: 2, backgroundColor: 'var(--border-medium)', position: 'relative' }}>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: -4,
                              left: -3,
                              width: 8,
                              height: 8,
                              borderRight: '2px solid var(--border-medium)',
                              borderBottom: '2px solid var(--border-medium)',
                              transform: 'rotate(45deg)'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Swimlane Matrix View */}
          {activeView === 'SWIMLANE_MATRIX' && vm && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 16 }}>
              {vm.swimlanes.map((lane) => (
                <div key={lane.actorName} className="card" style={{ padding: 16, backgroundColor: 'var(--bg-subtle)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>👤 {lane.actorName}</span>
                    <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{lane.stepCount} steps</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {lane.steps.map((n) => {
                      const isSelected = selectedStepId === n.id;
                      return (
                        <div
                          key={n.id}
                          onClick={() => setSelectedStepId(n.id)}
                          style={{
                            backgroundColor: isSelected ? 'var(--bg-card)' : 'var(--bg-surface)',
                            padding: 12,
                            borderRadius: 8,
                            border: isSelected ? '2px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontWeight: 700 }}>
                              STEP {n.stepOrder}
                            </span>
                            {getStepBadge(n.type)}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            {n.label}
                          </div>
                          {n.description && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                              {n.description}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            {n.system && (
                              <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                                ⚙️ {n.system}
                              </span>
                            )}
                            {n.sla && (
                              <span style={{ fontSize: '0.66rem', color: 'var(--accent-amber-text)' }}>
                                ⏱ {n.sla}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: BPMN Process Map View */}
          {activeView === 'BPMN_PROCESS_MAP' && vm && (
            <BpmnProcessMapView
              vm={vm}
              selectedStepId={selectedStepId}
              onSelectStep={setSelectedStepId}
            />
          )}

          {/* TAB 4: Decision Tree View (Derived from graph) */}
          {activeView === 'DECISION_TREE' && vm && (
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Decision Gates & Branching Policies
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Data-driven evaluation gates governing conditional branching, operator handoffs, and exception recovery.
                </p>
              </div>

              {vm.decisionTreeNodes.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                    No validated decision gates are required by the current process.
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto', lineHeight: 1.5 }}>
                    Decision branching is not required by the current business process. Current process graph contains no conditional routing. All operational paths execute sequentially or via direct event triggers. Use "Add Step" or "Edit Step" to introduce conditional decision gates if business rules require multi-path routing.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {vm.decisionTreeNodes.map((dt) => (
                    <div
                      key={dt.id}
                      onClick={() => setSelectedStepId(dt.stepId)}
                      style={{
                        padding: 16,
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 8,
                        border: '1px solid var(--border-medium)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {getStepBadge(dt.type)}
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                            #{dt.sequence} {dt.label}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            [Actor: {dt.responsibleActor}]
                          </span>
                        </div>
                        {dt.affectedRequirements.length > 0 && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            {dt.affectedRequirements.map((r) => (
                              <span key={r} className="badge badge-blue" style={{ fontSize: '0.64rem' }}>
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                        <strong style={{ color: 'var(--accent-amber-text)' }}>CONDITION:</strong> {dt.condition}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 10 }}>
                        <div style={{ padding: 10, backgroundColor: 'rgba(16, 185, 129, 0.06)', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-green-text)', textTransform: 'uppercase' }}>
                            ✓ TRUE / PASS ROUTE
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 3 }}>
                            {dt.trueRoute}
                          </div>
                        </div>

                        <div style={{ padding: 10, backgroundColor: 'rgba(245, 158, 11, 0.06)', borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-amber-text)', textTransform: 'uppercase' }}>
                            ✗ FALSE / ELSE ROUTE
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 3 }}>
                            {dt.falseRoute}
                          </div>
                        </div>

                        <div style={{ padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.06)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-red-text)', textTransform: 'uppercase' }}>
                            ⚠️ EXCEPTION / FALLBACK
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 3 }}>
                            {dt.exceptionRoute}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Approval Workflow View */}
          {activeView === 'APPROVAL_WORKFLOW' && vm && (
            <ApprovalWorkflowView
              vm={vm}
              onSelectStep={setSelectedStepId}
              onAddApproval={() => {
                setNewStep({ ...initialStepState, type: 'HUMAN_APPROVAL', actor: 'Supervisor / Compliance Officer' });
                setAddModalOpen(true);
              }}
              onEditStep={handleOpenEdit}
            />
          )}

          {/* TAB 6: Requirements Traceability Matrix */}
          {activeView === 'TRACEABILITY' && vm && (
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Requirements Traceability Matrix
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    End-to-end traceability mapping Stage 2 Business Analysis requirements to operational process steps, actors, systems, decisions, and outcomes.
                  </p>
                </div>
              </div>

              {/* Coverage Summary Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 12 }}>
                <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Requirements</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{vm.totalRequirements}</div>
                </div>
                <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-green-text)', fontWeight: 700, textTransform: 'uppercase' }}>Mapped (Full)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-green-text)', marginTop: 2 }}>{vm.mappedRequirements}</div>
                </div>
                <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber-text)', fontWeight: 700, textTransform: 'uppercase' }}>Partially Covered</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-amber-text)', marginTop: 2 }}>{vm.partiallyCovered}</div>
                </div>
                <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase' }}>Unmapped</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#EF4444', marginTop: 2 }}>{vm.unmappedRequirements}</div>
                </div>
                <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue-text)', fontWeight: 700, textTransform: 'uppercase' }}>Coverage %</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-blue-text)', marginTop: 2 }}>
                    {vm.coveragePercentage !== null ? `${vm.coveragePercentage}%` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Matrix Table */}
              {vm.traceabilityMatrix.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: 20 }}>
                  No workspace requirements are currently available.
                </div>
              ) : (
                <div className="table-responsive">
                  <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-medium)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px 12px' }}>Requirement</th>
                        <th style={{ padding: '10px 12px' }}>Process Steps</th>
                        <th style={{ padding: '10px 12px' }}>Actors</th>
                        <th style={{ padding: '10px 12px' }}>Systems</th>
                        <th style={{ padding: '10px 12px' }}>Decisions</th>
                        <th style={{ padding: '10px 12px' }}>Outcome</th>
                        <th style={{ padding: '10px 12px' }}>Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vm.traceabilityMatrix.map((row) => (
                        <tr
                          key={row.requirementId}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: row.coverage === 'UNMAPPED' ? 'rgba(239, 68, 68, 0.04)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                            <span className="badge badge-blue" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                              {row.requirementId}
                            </span>
                            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>
                              {row.requirementTitle}
                            </div>
                          </td>
                          <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                            {row.steps.length === 0 ? (
                              <span style={{ color: '#EF4444', fontStyle: 'italic' }}>Requirement mapping unavailable</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {row.steps.map((s) => (
                                  <div
                                    key={s.id}
                                    onClick={() => setSelectedStepId(s.id)}
                                    style={{ cursor: 'pointer', color: 'var(--accent-amber-text)', fontWeight: 600 }}
                                  >
                                    #{s.stepOrder} {s.label}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                            {row.actors.length > 0 ? row.actors.join(', ') : '—'}
                          </td>
                          <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                            {row.systems.length > 0 ? row.systems.join(', ') : '—'}
                          </td>
                          <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                            {row.decisions.length > 0 ? row.decisions.join(', ') : 'None'}
                          </td>
                          <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                            {row.outcomes.join(', ')}
                          </td>
                          <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                            {getCoverageBadge(row.coverage)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: AI Process Optimization View */}
          {activeView === 'OPTIMIZATION' && vm && (
            <ProcessOptimizationView
              vm={vm}
              onSelectStep={setSelectedStepId}
              onEditStep={handleOpenEdit}
            />
          )}

          {/* TAB 8: Dedicated Validation Report View */}
          {activeView === 'VALIDATION' && vm && (
            <ValidationView
              vm={vm}
              onSelectStep={setSelectedStepId}
              onEditStep={handleOpenEdit}
              onValidate={handleValidate}
              validating={loading}
            />
          )}

          {/* TAB 9: History & Collaboration View */}
          {activeView === 'HISTORY' && vm && (
            <HistoryCollaborationView
              vm={vm}
              versions={versions}
              loadingVersions={loadingVersions}
              onRestoreVersion={handleRestoreVersion}
              onSaveVersion={handleSaveVersion}
              comments={comments}
              loadingComments={loadingComments}
              onAddComment={handleAddComment}
              activityLogs={activityLogs}
            />
          )}

          {/* Validation & Approve Bottom Bar (Persistent on workflow views) */}
          {vm && activeView !== 'VALIDATION' && activeView !== 'HISTORY' && (
            <div
              className="card"
              style={{
                maxWidth: 860,
                margin: '16px auto 0',
                width: '100%',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {vm.validationReport.isValid ? (
                  <CheckCircle2 size={24} color="var(--accent-green)" />
                ) : (
                  <AlertTriangle size={24} color="#EF4444" />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{vm.validationReport.summary}</span>
                    {getStatusBadge(vm.validationReport.status)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {vm.totalSteps} operational steps • {vm.totalActors} dynamic actor swimlanes • {vm.coveragePercentage !== null ? `${vm.coveragePercentage}%` : 'N/A'} requirement coverage.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setShowValidationDetails(!showValidationDetails)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  {showValidationDetails ? 'Hide Checks' : 'View Checks (20)'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={vm.isApprovalBlocked}
                  className={`btn btn-sm ${vm.isApprovalBlocked ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ padding: '8px 18px', fontWeight: 700, opacity: vm.isApprovalBlocked ? 0.6 : 1, cursor: vm.isApprovalBlocked ? 'not-allowed' : 'pointer' }}
                >
                  {t.process.approveBtn || 'Approve & Next: UX Wireframes'} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Validation Checks Accordion & Actionable Remediation Cards */}
          {showValidationDetails && vm && (
            <div className="card" style={{ maxWidth: 860, margin: '10px auto 0', width: '100%', padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckSquare size={18} color="var(--accent-amber)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>20-Point Workflow Validation Remediation</h4>
                </div>
                {getStatusBadge(vm.validationReport.status)}
              </div>

              {parseActionableIssues(vm.validationReport, vm.steps).length === 0 ? (
                <div style={{ padding: '14px 18px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--accent-green)', borderRadius: 8, color: 'var(--accent-green-text)', fontSize: '0.85rem' }}>
                  ✓ All 20 validation checks passed with zero errors or actionable warnings.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {parseActionableIssues(vm.validationReport, vm.steps).map((issue) => {
                    const isError = issue.severity === 'ERROR';
                    const targetStep = issue.stepId ? vm.stepMap.get(issue.stepId) : null;
                    return (
                      <div
                        key={issue.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 8,
                          backgroundColor: isError ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                          border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: isError ? 'var(--accent-red-light)' : 'var(--accent-amber-light)',
                                color: isError ? '#EF4444' : 'var(--accent-amber-text)',
                                fontWeight: 800,
                                fontSize: '0.68rem'
                              }}
                            >
                              {isError ? 'BLOCKING ERROR' : 'ACTIONABLE WARNING'}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {issue.rule}
                            </span>
                            {issue.stepOrder && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ({issue.stepLabel})
                              </span>
                            )}
                          </div>

                          {targetStep && (
                            <button
                              onClick={() => handleOpenEdit(targetStep)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.72rem', padding: '4px 10px', height: 'auto' }}
                            >
                              <Edit2 size={11} style={{ marginRight: 4 }} /> Fix Step #{targetStep.stepOrder}
                            </button>
                          )}
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Problem:</strong> {issue.problem}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.78rem' }}>
                          <div style={{ padding: '6px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Expected: </span>
                            <span style={{ color: 'var(--text-primary)' }}>{issue.expected}</span>
                          </div>
                          <div style={{ padding: '6px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Current: </span>
                            <span style={{ color: isError ? '#EF4444' : 'var(--accent-amber-text)' }}>{issue.current}</span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber-text)', backgroundColor: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6, border: '1px dashed var(--border-subtle)' }}>
                          <strong>Recommended Action:</strong> {issue.recommendedAction}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 20: Step Inspector Drawer */}
        {selectedStep && (
          <>
            <div
              className="hide-on-desktop"
              onClick={() => setSelectedStepId(null)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 199
              }}
            />
            <div
              className="node-inspector-drawer"
              style={{
                width: 400,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                flexShrink: 0,
                alignSelf: 'flex-start',
                position: 'sticky',
                top: 20,
                zIndex: 200
              }}
            >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={16} color="var(--accent-amber)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Step Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedStepId(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-amber)' }}>STEP #{selectedStep.stepOrder}</span>
                {getStepBadge(selectedStep.type)}
                {vm.validationReport?.isValid ? (
                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>VALIDATED</span>
                ) : (
                  <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{selectedStep.validationStatus}</span>
                )}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedStep.label}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Execution Description</label>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                {selectedStep.description || 'Not specified'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Primary Actor</label>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, marginTop: 2 }}>{selectedStep.actor || 'Not specified'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Underlying System</label>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, marginTop: 2 }}>{selectedStep.system || 'Not specified'}</div>
              </div>
            </div>

            {selectedStep.condition && (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Branching Condition</label>
                <div style={{ fontSize: '0.82rem', color: 'var(--accent-amber-text)', marginTop: 2, background: 'var(--accent-amber-light)', padding: '4px 8px', borderRadius: 4 }}>
                  {selectedStep.condition}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target SLA</label>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{selectedStep.sla || 'Not specified'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timeout Policy</label>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{selectedStep.timeoutPolicy || 'Not specified'}</div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failure Handling & Escalation</label>
              <div style={{ fontSize: '0.82rem', color: selectedStep.failureHandling ? 'var(--accent-red-text)' : 'var(--text-muted)', marginTop: 2 }}>
                {(() => {
                  const normType = normalizeStepType(selectedStep.type);
                  if (['START', 'END_STATE', 'END'].includes(normType)) {
                    return 'Not applicable';
                  }
                  return selectedStep.failureHandling || 'Not specified';
                })()}
              </div>
              {selectedStep.retryPolicy && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Retry: {selectedStep.retryPolicy}
                </div>
              )}
            </div>

            {selectedStep.requirementIds.length > 0 && (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Traceable Requirements</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {selectedStep.requirementIds.map((r) => (
                    <span key={r} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedStep.architectureNodeId && (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Architecture Component Link</label>
                <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedStep.architectureNodeId}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.76rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
              <div>Classification: <strong style={{ color: 'var(--text-secondary)' }}>{selectedStep.classification}</strong></div>
              <div>Source: <strong style={{ color: 'var(--text-secondary)' }}>{selectedStep.sourceContext}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => handleOpenEdit(selectedStep)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                <Edit2 size={13} /> Edit Step
              </button>
              <button onClick={(e) => handleDeleteStep(selectedStep.id, e)} className="btn btn-sm" style={{ backgroundColor: 'var(--accent-red-light)', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>

      {/* Helper function for rendering type-aware step fields */}
      {(() => {
        const renderStepFields = (stepState, setStepState) => {
          const normType = normalizeStepType(stepState.type);
          const archNodes = workspaceContext?.architecture?.nodes || [];
          const reqs = workspaceContext?.businessAnalysis?.requirements || [];

          const currentReqIds = (stepState.requirementIds || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

          const toggleReq = (reqId) => {
            const exists = currentReqIds.includes(reqId);
            const next = exists
              ? currentReqIds.filter((id) => id !== reqId)
              : [...currentReqIds, reqId];
            setStepState({ ...stepState, requirementIds: next.join(', ') });
          };

          return (
            <>
              <div className="form-group">
                <label className="form-label">Step Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ingest Order Payload"
                  className="form-input"
                  value={stepState.label}
                  onChange={(e) => setStepState({ ...stepState, label: e.target.value })}
                />
              </div>

              <div className="grid-responsive-2col" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Step Type</label>
                  <select
                    className="form-select"
                    value={stepState.type}
                    onChange={(e) => setStepState({ ...stepState, type: e.target.value })}
                  >
                    <option value="START">START (Start Trigger)</option>
                    <option value="ACTION">ACTION (Standard Operation)</option>
                    <option value="AUTOMATION">AUTOMATION (AI / Cognitive)</option>
                    <option value="SUB_PROCESS">SUB_PROCESS (Sub-workflow)</option>
                    <option value="DECISION_GATE">DECISION_GATE (Branch Gate)</option>
                    <option value="HUMAN_APPROVAL">HUMAN_APPROVAL (Supervisor Gate)</option>
                    <option value="INTEGRATION">INTEGRATION (Architecture Link)</option>
                    <option value="NOTIFICATION">NOTIFICATION (Alert Broadcast)</option>
                    <option value="END_STATE">END_STATE (Terminal State)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Actor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Warehouse Operator, Dispatcher"
                    className="form-input"
                    value={stepState.actor || ''}
                    onChange={(e) => setStepState({ ...stepState, actor: e.target.value })}
                  />
                </div>
              </div>

              {/* Dynamic Type-Aware Specialized Fields (Section 18) */}
              {normType === 'START' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Trigger Mechanism</label>
                    <select
                      className="form-select"
                      value={stepState.action || 'EVENT'}
                      onChange={(e) => setStepState({ ...stepState, action: e.target.value })}
                    >
                      <option value="WEBHOOK">Webhook (HTTP Ingress)</option>
                      <option value="SCHEDULE">Scheduled Cron / Timer</option>
                      <option value="EVENT">Event Stream (Kafka / RabbitMQ)</option>
                      <option value="USER_ACTION">User Interactive Action</option>
                      <option value="MANUAL_TRIGGER">Manual Operator Intake</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Payload Schema</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. { orderId, customerId, items }"
                      value={stepState.input || ''}
                      onChange={(e) => setStepState({ ...stepState, input: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {normType === 'ACTION' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Input Parameters</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. orderId, lineItems"
                        value={stepState.input || ''}
                        onChange={(e) => setStepState({ ...stepState, input: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Expected Output</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. orderStatus, confirmationId"
                        value={stepState.output || ''}
                        onChange={(e) => setStepState({ ...stepState, output: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Preconditions</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Customer authenticated, Cart valid"
                        value={stepState.preconditions || ''}
                        onChange={(e) => setStepState({ ...stepState, preconditions: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Postconditions</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Order record created in database"
                        value={stepState.postconditions || ''}
                        onChange={(e) => setStepState({ ...stepState, postconditions: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {normType === 'AUTOMATION' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Automation Engine / Script</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. RuleEngineWorker / AI Classifier"
                        value={stepState.action || ''}
                        onChange={(e) => setStepState({ ...stepState, action: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Underlying System</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. AI Service Hub"
                        value={stepState.system || ''}
                        onChange={(e) => setStepState({ ...stepState, system: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Timeout Policy</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 30s timeout"
                        value={stepState.timeoutPolicy || ''}
                        onChange={(e) => setStepState({ ...stepState, timeoutPolicy: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Retry Policy</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 3 retries with exponential backoff"
                        value={stepState.retryPolicy || ''}
                        onChange={(e) => setStepState({ ...stepState, retryPolicy: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Failure Handling Strategy</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Route to manual review queue on error"
                      value={stepState.failureHandling || ''}
                      onChange={(e) => setStepState({ ...stepState, failureHandling: e.target.value })}
                    />
                  </div>
                </>
              )}

              {normType === 'SUB_PROCESS' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Child Process Identifier</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. SUB-PROC-PAYMENT-SETTLEMENT"
                      value={stepState.system || ''}
                      onChange={(e) => setStepState({ ...stepState, system: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Execution Mode</label>
                    <select
                      className="form-select"
                      value={stepState.action || 'SYNC'}
                      onChange={(e) => setStepState({ ...stepState, action: e.target.value })}
                    >
                      <option value="SYNC">Synchronous (Block till complete)</option>
                      <option value="ASYNC">Asynchronous (Fire and forget)</option>
                    </select>
                  </div>
                </div>
              )}

              {normType === 'DECISION_GATE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Evaluation Expression</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. StockCount >= RequestedQty"
                      value={stepState.condition || ''}
                      onChange={(e) => setStepState({ ...stepState, condition: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Branch Routing Description</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. True -> Step #4, False -> Step #8"
                      value={stepState.action || ''}
                      onChange={(e) => setStepState({ ...stepState, action: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {normType === 'HUMAN_APPROVAL' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Approver Role</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Branch Supervisor / Compliance Officer"
                        value={stepState.actor || ''}
                        onChange={(e) => setStepState({ ...stepState, actor: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Escalation SLA</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 4 hours"
                        value={stepState.sla || ''}
                        onChange={(e) => setStepState({ ...stepState, sla: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Rejection Action / Route</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Return to customer with clarification request"
                        value={stepState.failureHandling || ''}
                        onChange={(e) => setStepState({ ...stepState, failureHandling: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Escalation Policy</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Auto-assign to Regional Director after 4h"
                        value={stepState.escalationPolicy || ''}
                        onChange={(e) => setStepState({ ...stepState, escalationPolicy: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {normType === 'INTEGRATION' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Architecture Component Link</label>
                      <select
                        className="form-select"
                        value={stepState.architectureNodeId || ''}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const targetNode = archNodes.find((n) => n.id === selectedId);
                          setStepState({
                            ...stepState,
                            architectureNodeId: selectedId,
                            system: targetNode?.label || stepState.system || selectedId
                          });
                        }}
                      >
                        <option value="">-- Select Stage 4 Architecture Node --</option>
                        {archNodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label} ({n.type || n.tier || 'Component'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Protocol / Transport</label>
                      <select
                        className="form-select"
                        value={stepState.action || 'REST'}
                        onChange={(e) => setStepState({ ...stepState, action: e.target.value })}
                      >
                        <option value="REST">REST API (JSON)</option>
                        <option value="GRAPHQL">GraphQL</option>
                        <option value="GRPC">gRPC</option>
                        <option value="KAFKA">Kafka Event Bus</option>
                        <option value="DATABASE">Direct Database Client</option>
                        <option value="WEBHOOK">Webhook</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Target System</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. ERP Ingress Service"
                        value={stepState.system || ''}
                        onChange={(e) => setStepState({ ...stepState, system: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Timeout Policy</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 5000ms"
                        value={stepState.timeoutPolicy || ''}
                        onChange={(e) => setStepState({ ...stepState, timeoutPolicy: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Failure Handling / Fallback Strategy</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Dead letter queue and alarm"
                      value={stepState.failureHandling || ''}
                      onChange={(e) => setStepState({ ...stepState, failureHandling: e.target.value })}
                    />
                  </div>
                </>
              )}

              {normType === 'NOTIFICATION' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Delivery Channel</label>
                    <select
                      className="form-select"
                      value={stepState.system || 'EMAIL'}
                      onChange={(e) => setStepState({ ...stepState, system: e.target.value })}
                    >
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS Gateway</option>
                      <option value="SLACK">Slack / Teams Webhook</option>
                      <option value="IN_APP">In-App Notification</option>
                      <option value="PUSH">Mobile Push Notification</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery SLA</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. < 5 seconds"
                      value={stepState.sla || ''}
                      onChange={(e) => setStepState({ ...stepState, sla: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {normType === 'END_STATE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Terminal Status</label>
                    <select
                      className="form-select"
                      value={stepState.action || 'SUCCESS'}
                      onChange={(e) => setStepState({ ...stepState, action: e.target.value })}
                    >
                      <option value="SUCCESS">SUCCESS (Completed normally)</option>
                      <option value="CANCELLED">CANCELLED (User/System aborted)</option>
                      <option value="REJECTED">REJECTED (Approval declined)</option>
                      <option value="TERMINATED">TERMINATED (Exception / Error)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Final Outcome / Output Summary</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Transaction completed with receipt"
                      value={stepState.output || ''}
                      onChange={(e) => setStepState({ ...stepState, output: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* General Description */}
              <div className="form-group">
                <label className="form-label">Execution Description</label>
                <textarea
                  rows={2}
                  className="form-textarea"
                  placeholder="Describe exact operational actions taken..."
                  value={stepState.description || ''}
                  onChange={(e) => setStepState({ ...stepState, description: e.target.value })}
                />
              </div>

              {/* Stage 4 Architecture Node Link (if not already rendered for INTEGRATION) */}
              {normType !== 'INTEGRATION' && archNodes.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Architecture Component Link (Optional Stage 4 Topology)</label>
                  <select
                    className="form-select"
                    value={stepState.architectureNodeId || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const targetNode = archNodes.find((n) => n.id === selectedId);
                      setStepState({
                        ...stepState,
                        architectureNodeId: selectedId,
                        system: stepState.system || targetNode?.label || ''
                      });
                    }}
                  >
                    <option value="">-- No direct architecture component link --</option>
                    {archNodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.type || n.tier || 'Component'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Stage 2 Traceable Requirements Checklist */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Traceable Requirements (Stage 2 Mandates)</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {currentReqIds.length} selected
                  </span>
                </label>
                {reqs.length > 0 ? (
                  <div
                    style={{
                      maxHeight: 140,
                      overflowY: 'auto',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    {reqs.map((r) => {
                      const reqId = r.id || r.requirementId || r.title;
                      const title = r.title || r.text || r.description || reqId;
                      const isChecked = currentReqIds.includes(reqId);
                      return (
                        <label
                          key={reqId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleReq(reqId)}
                          />
                          <span style={{ fontWeight: 700, color: 'var(--accent-blue-text)' }}>{reqId}</span>
                          <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. REQ-01, REQ-02"
                    value={stepState.requirementIds || ''}
                    onChange={(e) => setStepState({ ...stepState, requirementIds: e.target.value })}
                  />
                )}
              </div>
            </>
          );
        };

        return (
          <>
            {/* Add Step Modal (Section 18 & 19) */}
            {addModalOpen && (
              <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Add Process Workflow Step</h4>
                    <button onClick={() => setAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleAddStep} style={{ padding: 20 }}>
                    {renderStepFields(newStep, setNewStep)}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                      <button type="button" onClick={() => setAddModalOpen(false)} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Add Step
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Step Modal (Section 18 & 19) */}
            {editModalOpen && editingStep && (
              <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Edit Process Step #{editingStep.stepOrder}</h4>
                    <button onClick={() => setEditModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleUpdateStep} style={{ padding: 20 }}>
                    {renderStepFields(editingStep, setEditingStep)}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                      <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Section 26: Version History Modal */}
      {versionHistoryOpen && (
        <div className="modal-overlay" onClick={() => setVersionHistoryOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="var(--accent-amber)" />
                <h4 style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Process Workflow Version History</h4>
              </div>
              <button onClick={() => setVersionHistoryOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              {loadingVersions ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px' }} />
                  Loading version snapshots...
                </div>
              ) : versions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No historical version snapshots found. Current version is v{processModel?.version || 1}.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
                  {versions.map((v) => {
                    const isCurrent = v.version === processModel.version;
                    const dateStr = v.createdAt ? new Date(v.createdAt).toLocaleString() : 'Unknown date';
                    return (
                      <div
                        key={v.id || v.version}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 8,
                          backgroundColor: isCurrent ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-subtle)',
                          border: `1px solid ${isCurrent ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
                          gap: 16
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              Version {v.version}
                            </span>
                            {isCurrent && (
                              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                            )}
                            {getStatusBadge(v.status)}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Created: {dateStr} {v.createdByName ? `• by ${v.createdByName}` : ''}
                          </div>
                          {v.changeDescription && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                              {v.changeDescription}
                            </div>
                          )}
                        </div>

                        <div>
                          {isCurrent ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-green-text)', fontWeight: 700 }}>
                              Current Active
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRestoreVersion(v.version)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <RotateCcw size={12} /> Restore v{v.version}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button onClick={() => setVersionHistoryOpen(false)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Format Enterprise Export Modal */}
      <ProcessExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        vm={vm}
      />
    </div>
  );
};

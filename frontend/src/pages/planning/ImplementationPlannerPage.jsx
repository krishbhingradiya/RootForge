import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import {
  CalendarDays,
  Sparkles,
  Plus,
  RefreshCw,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  Check,
  X,
  ListTodo,
  Edit2,
  Trash2,
  Workflow,
  Search,
  Filter,
  ShieldAlert,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Bookmark,
  Layers,
  FileText
} from 'lucide-react';
import {
  buildPlanningViewModel,
  getProjectRelevantRoles,
  validateTaskForm,
  normalizeDurationToWeeks,
  formatDuration,
  getDependentTasks
} from './planningViewModel';

export const ImplementationPlannerPage = () => {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [rawPlan, setRawPlan] = useState(null);
  const [rawTasks, setRawTasks] = useState([]);
  const [contextSummary, setContextSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState('timeline'); // timeline | table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Add / Edit Task Modal State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null); // null = add, string = edit
  const [customRoleInputVisible, setCustomRoleInputVisible] = useState(false);
  const [customRoleText, setCustomRoleText] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const [taskForm, setTaskForm] = useState({
    title: '',
    phaseName: '',
    sprint: '',
    assignedRole: 'Software Engineer',
    durationValue: 1.0,
    durationUnit: 'weeks',
    riskLevel: 'LOW',
    riskReason: '',
    riskMitigation: '',
    status: 'TODO',
    description: '',
    sourceRequirement: '',
    dependencies: []
  });

  // Delete Task Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [dependentTasksWarning, setDependentTasksWarning] = useState([]);

  // Regenerate Confirmation Modal State
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [preserveUserEdits, setPreserveUserEdits] = useState(true);

  // Risk Popover State
  const [activeRiskPopoverTaskId, setActiveRiskPopoverTaskId] = useState(null);

  // Load implementation plan
  const loadPlan = async () => {
    try {
      setLoading(true);
      const res = await api.getPlan(id);
      if (res.plan) {
        setRawPlan(res.plan);
        setRawTasks(res.plan.tasks || []);
      } else {
        setRawPlan(null);
        setRawTasks([]);
      }
      if (res.contextSummary) {
        setContextSummary(res.contextSummary);
      }
    } catch (err) {
      console.error('Failed to load implementation plan:', err);
      showToast(err.message || 'Failed to load plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [id]);

  // Reactive View Model
  const viewModel = useMemo(() => {
    return buildPlanningViewModel(rawPlan, rawTasks);
  }, [rawPlan, rawTasks]);

  // Available Project Roles
  const availableRoles = useMemo(() => {
    return getProjectRelevantRoles(contextSummary, rawTasks);
  }, [contextSummary, rawTasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    if (!viewModel) return [];
    let list = viewModel.tasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.assignedRole.toLowerCase().includes(q) ||
          t.phaseName.toLowerCase().includes(q) ||
          t.sprint.toLowerCase().includes(q) ||
          (t.sourceRequirement && t.sourceRequirement.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      list = list.filter(t => t.status === statusFilter);
    }

    if (riskFilter !== 'ALL') {
      list = list.filter(t => t.riskLevel === riskFilter);
    }

    return list;
  }, [viewModel, searchQuery, statusFilter, riskFilter]);

  // Handle Regeneration with Protection
  const handleRegenerateClick = () => {
    const hasUserEdits = rawTasks.some(t => t.isUserEdited);
    if (hasUserEdits) {
      setRegenerateModalOpen(true);
    } else {
      executeGenerate(false);
    }
  };

  const executeGenerate = async (preserveEdits = false) => {
    try {
      setGenerating(true);
      setRegenerateModalOpen(false);
      const res = await api.generatePlan(id, { preserveUserEdits: preserveEdits });
      setRawPlan(res.plan);
      setRawTasks(res.plan.tasks || []);
      window.dispatchEvent(new CustomEvent('rootforge:workspace-updated', { detail: { workspaceId: id } }));
      showToast('Implementation Roadmap generated from project context!');
    } catch (err) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Open Add Task Modal
  const handleOpenAddTask = () => {
    setEditingTaskId(null);
    setCustomRoleInputVisible(false);
    setCustomRoleText('');
    setFormErrors({});

    const defaultPhase = viewModel?.phases[0]?.name || '';
    const defaultSprint = viewModel?.phaseToSprintsMap[defaultPhase]?.[0] || 'Sprint 1';

    setTaskForm({
      title: '',
      phaseName: defaultPhase,
      sprint: defaultSprint,
      assignedRole: availableRoles[0] || 'Software Engineer',
      durationValue: 1.0,
      durationUnit: 'weeks',
      riskLevel: 'LOW',
      riskReason: '',
      riskMitigation: '',
      status: 'TODO',
      description: '',
      sourceRequirement: contextSummary?.requirements[0]?.id || '',
      dependencies: []
    });

    setTaskModalOpen(true);
  };

  // Open Edit Task Modal
  const handleOpenEditTask = (task) => {
    setEditingTaskId(task.id);
    setFormErrors({});

    const isCustomRole = !availableRoles.includes(task.assignedRole);
    setCustomRoleInputVisible(isCustomRole);
    setCustomRoleText(isCustomRole ? task.assignedRole : '');

    setTaskForm({
      title: task.title,
      phaseName: task.phaseName,
      sprint: task.sprint,
      assignedRole: isCustomRole ? '__CUSTOM__' : task.assignedRole,
      durationValue: task.durationWeeks,
      durationUnit: 'weeks',
      riskLevel: task.riskLevel,
      riskReason: task.riskReason || '',
      riskMitigation: task.riskMitigation || '',
      status: task.status,
      description: task.description || '',
      sourceRequirement: task.sourceRequirement || '',
      dependencies: task.dependencies || []
    });

    setTaskModalOpen(true);
  };

  // Phase change in form updates sprint options
  const handlePhaseChange = (newPhaseName) => {
    const availableSprints = viewModel?.phaseToSprintsMap[newPhaseName] || [];
    const newSprint = availableSprints[0] || '';
    setTaskForm(prev => ({
      ...prev,
      phaseName: newPhaseName,
      sprint: newSprint
    }));
  };

  // Save Task (Add or Edit)
  const handleSaveTask = async (e) => {
    e.preventDefault();

    const finalRole = customRoleInputVisible && customRoleText.trim()
      ? customRoleText.trim()
      : taskForm.assignedRole === '__CUSTOM__'
        ? customRoleText.trim() || 'Software Engineer'
        : taskForm.assignedRole;

    const normalizedWeeks = normalizeDurationToWeeks(taskForm.durationValue, taskForm.durationUnit);

    const formToValidate = {
      ...taskForm,
      assignedRole: finalRole
    };

    const validation = validateTaskForm(
      formToValidate,
      viewModel?.phaseToSprintsMap || {},
      viewModel?.phases || []
    );

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});

    const payload = {
      title: taskForm.title.trim(),
      phaseName: taskForm.phaseName,
      sprint: taskForm.sprint,
      assignedRole: finalRole,
      durationWeeks: normalizedWeeks,
      riskLevel: taskForm.riskLevel,
      riskReason: taskForm.riskLevel !== 'LOW' ? taskForm.riskReason : null,
      riskMitigation: taskForm.riskLevel !== 'LOW' ? taskForm.riskMitigation : null,
      status: taskForm.status,
      description: taskForm.description.trim(),
      sourceRequirement: taskForm.sourceRequirement || null,
      dependencies: taskForm.dependencies,
      isUserEdited: true
    };

    try {
      if (editingTaskId) {
        // Update existing task
        const res = await api.updateTask(id, editingTaskId, payload);
        setRawTasks(rawTasks.map(t => (t.id === editingTaskId ? res.task : t)));
        window.dispatchEvent(new CustomEvent('rootforge:workspace-updated', { detail: { workspaceId: id } }));
        showToast(`Task "${res.task.title}" updated.`);
      } else {
        // Create new task
        const res = await api.addTask(id, payload);
        setRawTasks([...rawTasks, res.task]);
        window.dispatchEvent(new CustomEvent('rootforge:workspace-updated', { detail: { workspaceId: id } }));
        showToast(`Task "${res.task.title}" added to roadmap.`);
      }
      setTaskModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to save task', 'error');
    }
  };

  // Toggle Task Status
  const handleToggleTaskStatus = async (task) => {
    const statusCycle = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'COMPLETED',
      BLOCKED: 'TODO',
      COMPLETED: 'TODO'
    };
    const nextStatus = statusCycle[task.status] || 'TODO';

    try {
      const res = await api.updateTask(id, task.id, { status: nextStatus, isUserEdited: true });
      setRawTasks(rawTasks.map(t => (t.id === task.id ? res.task : t)));
      window.dispatchEvent(new CustomEvent('rootforge:workspace-updated', { detail: { workspaceId: id } }));
    } catch (err) {
      showToast('Failed to update task status', 'error');
    }
  };

  // Delete Task Trigger
  const handleDeleteTaskClick = (task) => {
    const dependents = getDependentTasks(task.id, task.title, rawTasks);
    setTaskToDelete(task);
    setDependentTasksWarning(dependents);
    setDeleteModalOpen(true);
  };

  // Confirm Delete Task
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.deleteTask(id, taskToDelete.id);
      setRawTasks(rawTasks.filter(t => t.id !== taskToDelete.id));
      window.dispatchEvent(new CustomEvent('rootforge:workspace-updated', { detail: { workspaceId: id } }));
      setDeleteModalOpen(false);
      setTaskToDelete(null);
      showToast('Task removed from roadmap.');
    } catch (err) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontWeight: 600 }}>Loading implementation roadmap & sprint schedules...</p>
      </div>
    );
  }

  if (!rawPlan) {
    return (
      <div
        className="card"
        style={{
          padding: '60px 40px',
          textAlign: 'center',
          maxWidth: 680,
          margin: '40px auto',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <CalendarDays size={48} color="var(--accent-amber)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
          {t?.planning?.engineTitle || 'Dynamic Implementation Planning Engine'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6, fontSize: '0.92rem' }}>
          {contextSummary?.industry
            ? `Synthesize the complete ${contextSummary.industry} solution blueprint (Architecture, Database entities, REST APIs, Wireframes, and Workflows) into an actionable, phased delivery plan.`
            : 'Formulate an end-to-end engineering roadmap dynamically synthesized from your upstream business requirements and solution blueprint.'}
        </p>
        <button
          onClick={() => executeGenerate(false)}
          disabled={generating}
          className="btn btn-primary btn-lg"
          style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Sparkles size={18} />
          {generating ? 'Generating Dynamic Roadmap...' : 'Generate Implementation Roadmap'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 60 }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Implementation Roadmap & Sprint Planner
            </h1>
            <span className="badge badge-green" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>
              {viewModel?.status}
            </span>
            <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
              v{viewModel?.version}
            </span>
            {contextSummary?.industry && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--accent-amber-text)',
                  backgroundColor: 'var(--accent-amber-light)',
                  padding: '2px 8px',
                  borderRadius: 6
                }}
              >
                {contextSummary.industry}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Data-driven delivery schedule synthesized from upstream Architecture, Database, APIs, UX wireframes, and Workflows.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenAddTask}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Plus size={15} /> Add Task
          </button>
          <button
            onClick={handleRegenerateClick}
            disabled={generating}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Regenerate roadmap from current workspace requirements"
          >
            <RefreshCw size={14} className={generating ? 'spin' : ''} />
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button
            onClick={() => navigate(`/app/workspaces/${id}/collaboration`)}
            className="btn btn-dark btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Collaboration <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 100% Dynamic Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 16 }}>
        {/* Metric 1: Total Duration */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL DURATION
            </span>
            <Clock size={16} color="var(--text-muted)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 6 }}>
            {viewModel?.totalDurationWeeks} Weeks
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {viewModel?.sprintCount} Sprints across {viewModel?.phaseCount} Execution Phases
          </div>
        </div>

        {/* Metric 2: Estimated Investment */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ESTIMATED INVESTMENT
            </span>
            <DollarSign size={16} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-amber-text)', marginTop: 6 }}>
            {viewModel?.estimatedInvestment}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {viewModel?.estimatedInvestment === 'Estimate pending'
              ? 'Pending rate & resource allocation data'
              : 'Engineering effort & resource allocation'}
          </div>
        </div>

        {/* Metric 3: Execution Methodology */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              EXECUTION METHODOLOGY
            </span>
            <Workflow size={16} color="var(--text-muted)" />
          </div>
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginTop: 8,
              lineHeight: 1.3
            }}
          >
            {viewModel?.methodology}
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            2-week iterative sprint release cycles
          </div>
        </div>

        {/* Metric 4: Active Tasks & Progress */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ACTIVE TASKS
            </span>
            <CheckCircle2 size={16} color="var(--accent-green)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-green-text)', marginTop: 6 }}>
            {viewModel?.completedTasksCount} / {viewModel?.totalTasksCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div style={{ flex: 1, height: 6, backgroundColor: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${viewModel?.overallProgressPercent || 0}%`,
                  backgroundColor: 'var(--accent-green)',
                  borderRadius: 3,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {viewModel?.overallProgressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: View Toggle & Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setViewMode('timeline')}
            className="btn btn-sm"
            style={{
              backgroundColor: viewMode === 'timeline' ? 'var(--bg-sidebar)' : 'transparent',
              color: viewMode === 'timeline' ? '#FFFFFF' : 'var(--text-secondary)',
              borderColor: viewMode === 'timeline' ? 'var(--bg-sidebar)' : 'var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <CalendarDays size={14} /> Timeline View (Gantt)
          </button>

          <button
            onClick={() => setViewMode('table')}
            className="btn btn-sm"
            style={{
              backgroundColor: viewMode === 'table' ? 'var(--bg-sidebar)' : 'transparent',
              color: viewMode === 'table' ? '#FFFFFF' : 'var(--text-secondary)',
              borderColor: viewMode === 'table' ? 'var(--bg-sidebar)' : 'var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ListTodo size={14} /> Task & Resource Table ({viewModel?.totalTasksCount})
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search tasks, roles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 28, fontSize: '0.8rem', height: 32, width: 190 }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ fontSize: '0.8rem', height: 32, width: 130 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="form-select"
            style={{ fontSize: '0.8rem', height: 32, width: 110 }}
          >
            <option value="ALL">All Risks</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TIMELINE GANTT VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {viewModel?.phases.map((phase) => {
            const phaseMetric = viewModel.phaseMetrics[phase.name] || {
              total: 0,
              completed: 0,
              progressPercent: 0
            };
            const phaseTasks = filteredTasks.filter(
              t => t.phaseName === phase.name || phase.name.includes(t.phaseName) || t.phaseName.includes(phase.name)
            );

            return (
              <div
                key={phase.index}
                className="card"
                style={{
                  padding: 20,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10
                }}
              >
                {/* Phase Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          color: 'var(--text-primary)'
                        }}
                      >
                        Phase {phase.index}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {phase.name}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        ({phase.durationWeeks} {phase.durationWeeks === 1 ? 'Week' : 'Weeks'})
                      </span>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                      {phase.focus}
                    </p>
                  </div>

                  {/* Sprints & Progress badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {phase.sprints.map(s => (
                      <span key={s} className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
                        {s}
                      </span>
                    ))}
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 12,
                        backgroundColor:
                          phaseMetric.progressPercent === 100
                            ? 'var(--accent-green-light)'
                            : phaseMetric.progressPercent > 0
                              ? 'var(--accent-amber-light)'
                              : 'var(--bg-subtle)',
                        color:
                          phaseMetric.progressPercent === 100
                            ? 'var(--accent-green-text)'
                            : phaseMetric.progressPercent > 0
                              ? 'var(--accent-amber-text)'
                              : 'var(--text-muted)'
                      }}
                    >
                      {phaseMetric.progressPercent}% ({phaseMetric.completed}/{phaseMetric.total} Tasks)
                    </span>
                  </div>
                </div>

                {/* Phased Progress Bar (Genuinely dynamic) */}
                <div
                  style={{
                    height: 8,
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    margin: '14px 0'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${phaseMetric.progressPercent}%`,
                      backgroundColor:
                        phaseMetric.progressPercent === 100
                          ? 'var(--accent-green)'
                          : 'var(--accent-amber)',
                      borderRadius: 4,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>

                {/* Phase Tasks Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {phaseTasks.length === 0 ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No tasks matching current filter in this phase.
                    </span>
                  ) : (
                    phaseTasks.map(t => (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 12px',
                          borderRadius: 8,
                          backgroundColor:
                            t.status === 'COMPLETED'
                              ? 'var(--accent-green-light)'
                              : t.status === 'IN_PROGRESS'
                                ? 'var(--accent-amber-light)'
                                : 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => handleToggleTaskStatus(t)}
                        title={`Click to cycle status. Current: ${t.status}`}
                      >
                        {t.status === 'COMPLETED' ? (
                          <Check size={13} color="var(--accent-green)" />
                        ) : t.status === 'IN_PROGRESS' ? (
                          <Clock size={13} color="var(--accent-amber)" />
                        ) : t.status === 'BLOCKED' ? (
                          <AlertCircle size={13} color="var(--accent-red)" />
                        ) : (
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              border: '1.5px solid var(--text-muted)'
                            }}
                          />
                        )}

                        <span
                          style={{
                            textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none',
                            color:
                              t.status === 'COMPLETED'
                                ? 'var(--accent-green-text)'
                                : 'var(--text-primary)'
                          }}
                        >
                          {t.title}
                        </span>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          • {formatDuration(t.durationWeeks)}
                        </span>

                        {t.riskLevel === 'HIGH' && (
                          <span className="badge badge-red" style={{ fontSize: '0.62rem', padding: '1px 4px' }}>
                            HIGH
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTask(t);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: 2,
                            marginLeft: 4
                          }}
                          title="Edit task"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TASK & RESOURCE TABLE VIEW */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'table' && (
        <div
          className="card"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            overflow: 'hidden'
          }}
        >
          <div className="table-responsive">
            <table className="enterprise-table" style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ width: 44, textAlign: 'center', padding: '12px 8px' }}></th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', minWidth: 260 }}>TASK TITLE & DETAILS</th>
                  <th style={{ width: 130, textAlign: 'left', padding: '12px 12px' }}>SPRINT</th>
                  <th style={{ width: 180, textAlign: 'left', padding: '12px 12px' }}>ASSIGNED ROLE</th>
                  <th style={{ width: 110, textAlign: 'left', padding: '12px 12px' }}>DURATION</th>
                  <th style={{ width: 120, textAlign: 'left', padding: '12px 12px' }}>RISK</th>
                  <th style={{ width: 130, textAlign: 'left', padding: '12px 12px' }}>STATUS</th>
                  <th style={{ width: 90, textAlign: 'center', padding: '12px 8px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No tasks found matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: task.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.03)' : 'transparent'
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                        <input
                          type="checkbox"
                          checked={task.status === 'COMPLETED'}
                          onChange={() => handleToggleTaskStatus(task)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                          title="Mark complete"
                        />
                      </td>

                      {/* Title & Metadata */}
                      <td style={{ padding: '12px 16px' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            color: task.status === 'COMPLETED' ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none'
                          }}
                        >
                          {task.title}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {task.phaseName}
                          </span>

                          {task.sourceRequirement && (
                            <span
                              style={{
                                fontSize: '0.67rem',
                                color: 'var(--accent-blue-text)',
                                backgroundColor: 'var(--accent-blue-light)',
                                padding: '1px 6px',
                                borderRadius: 4
                              }}
                            >
                              {task.sourceRequirement}
                            </span>
                          )}

                          {task.isUserEdited && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                color: 'var(--accent-amber-text)',
                                backgroundColor: 'var(--accent-amber-light)',
                                padding: '1px 5px',
                                borderRadius: 4
                              }}
                              title="Modified manually by user"
                            >
                              User-Edited
                            </span>
                          )}

                          {task.dependencies?.length > 0 && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              deps: {task.dependencies.join(', ')}
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              marginTop: 4,
                              maxWidth: 480,
                              lineHeight: 1.3
                            }}
                          >
                            {task.description}
                          </div>
                        )}
                      </td>

                      {/* Sprint */}
                      <td style={{ padding: '12px 12px' }}>
                        <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                          {task.sprint}
                        </span>
                      </td>

                      {/* Assigned Role */}
                      <td style={{ padding: '12px 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={14} color="var(--text-muted)" />
                          <span>{task.assignedRole}</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '12px 12px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {formatDuration(task.durationWeeks)}
                      </td>

                      {/* Risk */}
                      <td style={{ padding: '12px 12px', position: 'relative' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span
                            className={
                              task.riskLevel === 'HIGH'
                                ? 'badge badge-red'
                                : task.riskLevel === 'MEDIUM'
                                  ? 'badge badge-amber'
                                  : 'badge badge-green'
                            }
                            style={{ fontSize: '0.67rem', fontWeight: 700 }}
                          >
                            {task.riskLevel}
                          </span>

                          {(task.riskReason || task.riskMitigation) && (
                            <button
                              onClick={() =>
                                setActiveRiskPopoverTaskId(activeRiskPopoverTaskId === task.id ? null : task.id)
                              }
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 2,
                                color: task.riskLevel === 'HIGH' ? 'var(--accent-red)' : 'var(--accent-amber)'
                              }}
                              title="Click to view risk reason & mitigation"
                            >
                              <AlertTriangle size={13} />
                            </button>
                          )}
                        </div>

                        {/* Risk Popover */}
                        {activeRiskPopoverTaskId === task.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              zIndex: 20,
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              boxShadow: 'var(--shadow-lg)',
                              borderRadius: 8,
                              padding: 12,
                              width: 240,
                              fontSize: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Risk Assessment</span>
                              <button
                                onClick={() => setActiveRiskPopoverTaskId(null)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                            {task.riskReason && (
                              <div style={{ marginBottom: 6 }}>
                                <strong style={{ color: 'var(--text-muted)' }}>Reason:</strong> {task.riskReason}
                              </div>
                            )}
                            {task.riskMitigation && (
                              <div>
                                <strong style={{ color: 'var(--text-muted)' }}>Mitigation:</strong> {task.riskMitigation}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status Selector */}
                      <td style={{ padding: '12px 12px' }}>
                        <select
                          value={task.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            api.updateTask(id, task.id, { status: newStatus, isUserEdited: true }).then(res => {
                              setRawTasks(rawTasks.map(t => (t.id === task.id ? res.task : t)));
                              window.dispatchEvent(new CustomEvent('rootforge:workspace-updated', { detail: { workspaceId: id } }));
                            });
                          }}
                          className="form-select"
                          style={{
                            fontSize: '0.72rem',
                            height: 28,
                            padding: '2px 6px',
                            fontWeight: 700,
                            borderRadius: 6,
                            backgroundColor:
                              task.status === 'COMPLETED'
                                ? 'var(--accent-green-light)'
                                : task.status === 'IN_PROGRESS'
                                  ? 'var(--accent-amber-light)'
                                  : task.status === 'BLOCKED'
                                    ? 'var(--accent-red-light)'
                                    : 'var(--bg-subtle)',
                            color:
                              task.status === 'COMPLETED'
                                ? 'var(--accent-green-text)'
                                : task.status === 'IN_PROGRESS'
                                  ? 'var(--accent-amber-text)'
                                  : task.status === 'BLOCKED'
                                    ? 'var(--accent-red-text)'
                                    : 'var(--text-muted)',
                            borderColor: 'transparent'
                          }}
                        >
                          <option value="TODO">TODO</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="BLOCKED">BLOCKED</option>
                          <option value="COMPLETED">COMPLETED</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleOpenEditTask(task)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: 4
                            }}
                            title="Edit task"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTaskClick(task)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--accent-red)',
                              padding: 4
                            }}
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD / EDIT IMPLEMENTATION TASK MODAL */}
      {/* ------------------------------------------------------------- */}
      {taskModalOpen && (
        <div className="modal-overlay" onClick={() => setTaskModalOpen(false)}>
          <div
            className="modal-card"
            style={{
              maxWidth: 640,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-xl)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h4 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
                {editingTaskId ? 'Edit Implementation Task' : 'Add Implementation Task'}
              </h4>
              <button
                onClick={() => setTaskModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTask} style={{ padding: 20 }}>
              {/* Task Title */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Task Title <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Implement POS Menu Ingestion Endpoints"
                  className="form-input"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                />
                {formErrors.title && (
                  <span style={{ color: 'var(--accent-red)', fontSize: '0.73rem', marginTop: 3, display: 'block' }}>
                    {formErrors.title}
                  </span>
                )}
              </div>

              {/* Phase Allocation & Sprint (Strict Phase -> Sprint dependency) */}
              <div className="grid-responsive-2col" style={{ gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Phase Allocation <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={taskForm.phaseName}
                    onChange={e => handlePhaseChange(e.target.value)}
                  >
                    {viewModel?.phases.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.phaseName && (
                    <span style={{ color: 'var(--accent-red)', fontSize: '0.73rem', marginTop: 3, display: 'block' }}>
                      {formErrors.phaseName}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Sprint Allocation <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={taskForm.sprint}
                    onChange={e => setTaskForm({ ...taskForm, sprint: e.target.value })}
                  >
                    {(viewModel?.phaseToSprintsMap[taskForm.phaseName] || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {formErrors.sprint && (
                    <span style={{ color: 'var(--accent-red)', fontSize: '0.73rem', marginTop: 3, display: 'block' }}>
                      {formErrors.sprint}
                    </span>
                  )}
                </div>
              </div>

              {/* Assigned Role */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Assigned Role <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={customRoleInputVisible ? '__CUSTOM__' : taskForm.assignedRole}
                  onChange={e => {
                    if (e.target.value === '__CUSTOM__') {
                      setCustomRoleInputVisible(true);
                      setTaskForm({ ...taskForm, assignedRole: '__CUSTOM__' });
                    } else {
                      setCustomRoleInputVisible(false);
                      setTaskForm({ ...taskForm, assignedRole: e.target.value });
                    }
                  }}
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Add custom role...</option>
                </select>

                {customRoleInputVisible && (
                  <input
                    type="text"
                    placeholder="Enter custom role title (e.g. Lead POS Integrator)"
                    className="form-input"
                    value={customRoleText}
                    onChange={e => setCustomRoleText(e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                )}
                {formErrors.assignedRole && (
                  <span style={{ color: 'var(--accent-red)', fontSize: '0.73rem', marginTop: 3, display: 'block' }}>
                    {formErrors.assignedRole}
                  </span>
                )}
              </div>

              {/* Estimated Duration (Value + Unit) & Risk Level */}
              <div className="grid-responsive-2col" style={{ gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Estimated Duration <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      className="form-input"
                      value={taskForm.durationValue}
                      onChange={e => setTaskForm({ ...taskForm, durationValue: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <select
                      className="form-select"
                      value={taskForm.durationUnit}
                      onChange={e => setTaskForm({ ...taskForm, durationUnit: e.target.value })}
                      style={{ width: 100 }}
                    >
                      <option value="weeks">weeks</option>
                      <option value="days">days</option>
                      <option value="hours">hours</option>
                    </select>
                  </div>
                  {formErrors.durationValue && (
                    <span style={{ color: 'var(--accent-red)', fontSize: '0.73rem', marginTop: 3, display: 'block' }}>
                      {formErrors.durationValue}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                    Normalized: {formatDuration(normalizeDurationToWeeks(taskForm.durationValue, taskForm.durationUnit))}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Risk Level <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={taskForm.riskLevel}
                    onChange={e => setTaskForm({ ...taskForm, riskLevel: e.target.value })}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                  {formErrors.riskLevel && (
                    <span style={{ color: 'var(--accent-red)', fontSize: '0.73rem', marginTop: 3, display: 'block' }}>
                      {formErrors.riskLevel}
                    </span>
                  )}
                </div>
              </div>

              {/* HIGH or MEDIUM Risk Reason & Mitigation */}
              {taskForm.riskLevel !== 'LOW' && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 14,
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                      Risk Reason {taskForm.riskLevel === 'HIGH' && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Third-party POS API rate limits and webhook delivery reliability"
                      className="form-input"
                      value={taskForm.riskReason}
                      onChange={e => setTaskForm({ ...taskForm, riskReason: e.target.value })}
                      style={{ fontSize: '0.8rem' }}
                    />
                    {formErrors.riskReason && (
                      <span style={{ color: 'var(--accent-red)', fontSize: '0.72rem', marginTop: 3, display: 'block' }}>
                        {formErrors.riskReason}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                      Mitigation Strategy
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Implement exponential backoff retry with persistent dead-letter queue"
                      className="form-input"
                      value={taskForm.riskMitigation}
                      onChange={e => setTaskForm({ ...taskForm, riskMitigation: e.target.value })}
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              )}

              {/* Status & Source Traceability */}
              <div className="grid-responsive-2col" style={{ gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Status <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={taskForm.status}
                    onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="BLOCKED">BLOCKED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                    Source Requirement (Traceability)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BR-01 or Arch: API Gateway"
                    className="form-input"
                    value={taskForm.sourceRequirement}
                    onChange={e => setTaskForm({ ...taskForm, sourceRequirement: e.target.value })}
                  />
                </div>
              </div>

              {/* Technical Description & Acceptance Criteria */}
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                  Description & Acceptance Criteria
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe technical implementation scope, acceptance criteria, and deliverables."
                  className="form-textarea"
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  style={{ fontSize: '0.82rem' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  {editingTaskId ? 'Save Changes' : 'Add Task to Roadmap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELETE TASK CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {deleteModalOpen && taskToDelete && (
        <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div
            className="modal-card"
            style={{
              maxWidth: 480,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 24
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'var(--accent-red-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Trash2 size={20} color="var(--accent-red)" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  Delete Implementation Task
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {taskToDelete.title}
                </span>
              </div>
            </div>

            {dependentTasksWarning.length > 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--accent-red-light)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--accent-red-text)', fontSize: '0.82rem' }}>
                  <AlertTriangle size={14} /> Dependency Warning
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--accent-red-text)', marginTop: 4, lineHeight: 1.4 }}>
                  The following {dependentTasksWarning.length} task(s) depend on this task:
                </p>
                <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: '0.76rem', color: 'var(--accent-red-text)' }}>
                  {dependentTasksWarning.map(dt => (
                    <li key={dt.id}>{dt.title}</li>
                  ))}
                </ul>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-red-text)', marginTop: 6 }}>
                  Deleting this task will automatically unlink it from dependent tasks.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                Are you sure you want to delete this task from the implementation roadmap? All dependent sprint and schedule calculations will be recalculated.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteModalOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-danger btn-sm" style={{ fontWeight: 700 }}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REGENERATE CONFIRMATION & USER-EDIT PROTECTION MODAL */}
      {/* ------------------------------------------------------------- */}
      {regenerateModalOpen && (
        <div className="modal-overlay" onClick={() => setRegenerateModalOpen(false)}>
          <div
            className="modal-card"
            style={{
              maxWidth: 520,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: 24
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'var(--accent-amber-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <RefreshCw size={20} color="var(--accent-amber)" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  Regenerate Implementation Roadmap
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Project Context Synchronization
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
              You have manually edited or added tasks in this roadmap. Regenerating will rebuild the roadmap using the latest project context (Architecture, Database, APIs, UX wireframes, and Process workflows).
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                marginBottom: 20
              }}
            >
              <input
                type="checkbox"
                checked={preserveUserEdits}
                onChange={e => setPreserveUserEdits(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                  Preserve my manually edited and custom tasks (Recommended)
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Your custom tasks, roles, durations, and modifications will be retained and merged into the regenerated schedule.
                </div>
              </div>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setRegenerateModalOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={() => executeGenerate(preserveUserEdits)}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 700 }}
              >
                Proceed with Regeneration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImplementationPlannerPage;

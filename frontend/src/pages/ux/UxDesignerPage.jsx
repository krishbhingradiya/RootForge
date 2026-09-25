import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import { normalizeUxDesign, DESIGN_ARCHETYPES } from './uxViewModel';
import './uxDesigner.css';

// Modular Components
import { UxPageHeader } from './components/UxPageHeader';
import { RequirementInputSection } from './components/RequirementInputSection';
import { AiUnderstandingSection } from './components/AiUnderstandingSection';
import { DesignRecommendationsSection } from './components/DesignRecommendationsSection';
import { AiUxGenerationWorkspace } from './components/AiUxGenerationWorkspace';
import { GeneratedExperiencePreview } from './components/GeneratedExperiencePreview';
import { ScreenSpecificationPanel } from './components/ScreenSpecificationPanel';
import { UserJourneyFlowSection } from './components/UserJourneyFlowSection';
import { AiUxEditorPanel } from './components/AiUxEditorPanel';
import { RequirementCoverageSection } from './components/RequirementCoverageSection';
import { UxRecommendationsSection } from './components/UxRecommendationsSection';
import { UxActivityFeedbackSection } from './components/UxActivityFeedbackSection';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { UxExportModal } from './components/UxExportModal';
import { UxCollaborationPanel } from './components/UxCollaborationPanel';

import { parseDirectiveToPatch, applyUiPatch } from './services/uiPatchEngine';
import { THEME_ARCHETYPES, createDefaultUiSpecification } from './services/dynamicUiSchema';

export const UxDesignerPage = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Core Data States
  const [uxDesign, setUxDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  // Undo / Redo History Stack
  const [historyStack, setHistoryStack] = useState([]);
  const [futureStack, setFutureStack] = useState([]);

  // Viewport & Render Modes
  const [deviceView, setDeviceView] = useState('desktop'); // desktop | tablet | mobile
  const [renderMode, setRenderMode] = useState('hifi'); // hifi | wireframe | blueprint | prototype
  const [selectedScreenId, setSelectedScreenId] = useState(null);

  // Requirement & AI Understanding States
  const [requirementText, setRequirementText] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('enterprise-slate');
  const [understanding, setUnderstanding] = useState(null);

  // Modals
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Fetch initial UX state
  const loadUX = async () => {
    try {
      setLoading(true);
      const res = await api.getUX(id);
      if (res.ux) {
        const normalized = normalizeUxDesign(res.ux);
        setUxDesign(normalized);
        if (normalized.activeThemeId) {
          setSelectedTheme(normalized.activeThemeId);
        }
        if (normalized.understanding) {
          setUnderstanding(normalized.understanding);
        }
        if (normalized.screens && normalized.screens.length > 0) {
          setSelectedScreenId(normalized.screens[0].id);
        }
      } else {
        setUxDesign(null);
      }
    } catch (err) {
      console.error('Failed to load UX design:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUX();
  }, [id]);

  // Section B Handler: Analyze Requirement
  const handleAnalyzeRequirement = async () => {
    if (!requirementText.trim()) return;
    try {
      setAnalyzing(true);
      const res = await api.analyzeUXRequirement(id, requirementText.trim());
      if (res.understanding) {
        setUnderstanding(res.understanding);
        showToast(`AI analyzed requirement for ${res.understanding.domain || 'Operational'} domain!`);
      }
    } catch (err) {
      showToast(err.message || 'Analysis failed', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  // Section B/E Handler: Generate UX
  const handleGenerate = async (options = {}) => {
    try {
      setGenerating(true);
      const payload = {
        requirement: options.requirement || requirementText,
        selectedTheme: options.selectedTheme || selectedTheme,
        understanding,
        ...options
      };
      const res = await api.generateUX(id, payload);
      const normalized = normalizeUxDesign(res.ux);
      setUxDesign(normalized);
      if (normalized.screens && normalized.screens.length > 0) {
        setSelectedScreenId(normalized.screens[0].id);
      }
      if (normalized.understanding) {
        setUnderstanding(normalized.understanding);
      }
      // Reset undo stack on brand new generation
      setHistoryStack([]);
      setFutureStack([]);
      showToast(`Generated UX Architecture v${normalized.version || 1}!`);
    } catch (err) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Section D Handler: Select Theme Direction
  const handleSelectTheme = async (themeId) => {
    setSelectedTheme(themeId);
    if (!uxDesign) return;

    try {
      const updatedTokens = {
        ...(uxDesign.designTokens || {}),
        activeThemeId: themeId
      };
      await api.updateUX(id, {
        designTokens: JSON.stringify(updatedTokens)
      });
      setUxDesign((prev) => ({
        ...prev,
        activeThemeId: themeId,
        designTokens: updatedTokens
      }));
      const arch = DESIGN_ARCHETYPES.find((a) => a.id === themeId);
      showToast(`Switched design archetype to ${arch?.name || themeId}`);
    } catch (err) {
      console.error('Failed to update theme archetype:', err);
    }
  };

  // Section H Handler: Natural-Language Prompt Edit & Patch Engine
  const handleApplyPromptEdit = async (prompt, screenId) => {
    if (!prompt?.trim()) return;
    try {
      setEditing(true);
      const targetScreenId = screenId || selectedScreenId || uxDesign?.screens?.[0]?.id;

      // 1. Snapshot current state into history stack for instant Undo
      if (uxDesign) {
        setHistoryStack((prev) => [...prev, JSON.parse(JSON.stringify(uxDesign))]);
        setFutureStack([]);
      }

      // 2. Resolve current specification
      const targetScreen = (uxDesign?.screens || []).find((s) => s.id === targetScreenId) || uxDesign?.screens?.[0];
      const domain = understanding?.domain || uxDesign?.domain || 'GENERAL_ENTERPRISE';
      let currentSpec = targetScreen?.uiSpecification || targetScreen?.specification;

      if (!currentSpec || !currentSpec.components || currentSpec.components.length === 0) {
        currentSpec = createDefaultUiSpecification(targetScreen?.name || 'Operations', domain, selectedTheme);
        currentSpec.page.id = targetScreen?.id || targetScreenId;
        currentSpec.page.name = targetScreen?.name || 'Operations Screen';
      }

      // 3. Fast deterministic local patch check
      let patch = parseDirectiveToPatch(prompt, currentSpec);

      // If prompt is complex/custom and not fully matched by deterministic local rules, call backend Gemini AI
      const isRecognizedLocal = patch && (
        patch.operations?.length > 0 ||
        (patch.operation && patch.operation !== 'updateLayout' && patch.summary && !patch.summary.startsWith('Processed design modification:'))
      );

      if (!isRecognizedLocal) {
        try {
          const aiRes = await api.interpretUXCommand(id, {
            command: prompt.trim(),
            currentSpec,
            domain
          });
          if (aiRes?.patch && (aiRes.patch.operation || aiRes.patch.operations || aiRes.patch.changes)) {
            patch = aiRes.patch;
          }
        } catch (aiErr) {
          console.warn('Backend AI interpretation fallback to local engine:', aiErr);
        }
      }

      // 4. Apply UI Patch atomically
      const { updatedSpec, patchSummary } = applyUiPatch(currentSpec, patch);

      const isThemeOp = patch.operation === 'updateTheme' || (patch.operations && patch.operations.some(op => op.operation === 'updateTheme' || op.op === 'setTheme'));

      // Apply locally to screen models (isolate screen unless theme operation)
      const updatedScreens = (uxDesign?.screens || []).map((s) => {
        if (s.id === targetScreenId) {
          return {
            ...s,
            uiSpecification: updatedSpec,
            specification: updatedSpec,
            layout: updatedSpec.layout?.type || s.layout,
            components: updatedSpec.components || s.components
          };
        } else if (isThemeOp && updatedSpec.theme) {
          // If theme changed, propagate matching theme tokens across other screens too
          const otherSpec = s.uiSpecification || createDefaultUiSpecification(s.name, domain, selectedTheme);
          const mergedOtherSpec = {
            ...otherSpec,
            theme: {
              ...(otherSpec.theme || {}),
              ...updatedSpec.theme
            }
          };
          return {
            ...s,
            uiSpecification: mergedOtherSpec,
            specification: mergedOtherSpec
          };
        }
        return s;
      });

      const updatedTokens = {
        ...(uxDesign?.designTokens || {}),
        activeThemeId: updatedSpec.theme?.id || uxDesign?.activeThemeId || selectedTheme,
        palette: updatedSpec.theme
      };

      if (updatedSpec.theme?.id) {
        setSelectedTheme(updatedSpec.theme.id);
      }

      const optimisticUx = {
        ...uxDesign,
        screens: updatedScreens,
        designTokens: updatedTokens,
        activeThemeId: updatedSpec.theme?.id || uxDesign?.activeThemeId || selectedTheme
      };

      // Instantly trigger live preview re-render
      setUxDesign(optimisticUx);

      // 5. Persist Updated Screen Specification to DB
      try {
        await api.updateUX(id, {
          screens: JSON.stringify(updatedScreens),
          designTokens: JSON.stringify(updatedTokens)
        });
      } catch (saveErr) {
        console.warn('Background UX persistence notice:', saveErr);
      }

      showToast(patchSummary || `Applied UI modification successfully!`);
    } catch (err) {
      console.warn('AI prompt error (state preserved):', err);
      showToast(err.message || `Failed to apply UI modification`, 'error');
    } finally {
      setEditing(false);
    }
  };

  // Undo Handler
  const handleUndo = async () => {
    if (historyStack.length === 0 || !uxDesign) return;
    const previousState = historyStack[historyStack.length - 1];
    const newHistory = historyStack.slice(0, historyStack.length - 1);
    setFutureStack(prev => [JSON.parse(JSON.stringify(uxDesign)), ...prev]);
    setHistoryStack(newHistory);
    setUxDesign(previousState);
    try {
      await api.updateUX(id, {
        screens: JSON.stringify(previousState.screens),
        designTokens: JSON.stringify(previousState.designTokens)
      });
      showToast('Undid last AI change');
    } catch (e) {
      console.error('Failed to sync undo state:', e);
    }
  };

  // Redo Handler
  const handleRedo = async () => {
    if (futureStack.length === 0 || !uxDesign) return;
    const nextState = futureStack[0];
    const newFuture = futureStack.slice(1);
    setHistoryStack(prev => [...prev, JSON.parse(JSON.stringify(uxDesign))]);
    setFutureStack(newFuture);
    setUxDesign(nextState);
    try {
      await api.updateUX(id, {
        screens: JSON.stringify(nextState.screens),
        designTokens: JSON.stringify(nextState.designTokens)
      });
      showToast('Redid AI change');
    } catch (e) {
      console.error('Failed to sync redo state:', e);
    }
  };

  // Section J Handler: Actionable Recommendation Toggle
  const handleToggleRecommendation = async (recId) => {
    try {
      const res = await api.applyUXRecommendation(id, recId);
      const normalized = normalizeUxDesign(res.ux);
      setUxDesign(normalized);
      showToast(res.message || 'Recommendation updated');
    } catch (err) {
      showToast(err.message || 'Failed to toggle recommendation', 'error');
    }
  };

  // Section E Handler: Add Custom Screen (Section 13)
  const handleAddCustomScreen = async ({ name, purpose, primaryUser, workflow, requiredComponents, layoutDescription }) => {
    if (!uxDesign) return;
    const newId = `screen-custom-${Date.now()}`;
    const newScreen = {
      id: newId,
      name,
      description: purpose || `Custom operational screen for ${name}`,
      purpose: purpose || `Custom operational screen for ${name}`,
      primaryUser: primaryUser || 'Operations Specialist',
      layout: layoutDescription || 'Multi-column grid with 4 Metric Stat Cards, Operational Triage Grid, and AI Copilot Recommendations',
      stats: [
        { label: 'Screen Throughput', value: '420/hr', change: '+10% efficiency', trend: 'up' },
        { label: 'AI Optimization', value: '96.2%', change: 'High compliance', trend: 'up' },
        { label: 'SLA Health', value: '99.5%', change: 'Normal', trend: 'up' },
        { label: 'Quality Score', value: '100%', change: 'Audited', trend: 'up' }
      ],
      components: (requiredComponents || ['Telemetry Metric Grid', 'Action Triage Table', 'AI Assistant Copilot']).map((cmpName, cIdx) => ({
        id: `cmp-${newId}-${cIdx + 1}`,
        type: 'custom_widget',
        title: cmpName
      })),
      specification: {
        purpose: purpose || `Custom operational screen for ${name}`,
        primaryUser: primaryUser || 'Operations Specialist',
        userGoal: `Execute and monitor ${workflow || name}`,
        businessObjective: 'Accelerate straight-through processing with minimal cognitive load',
        primaryActions: ['Execute Action', 'Save Record', 'Trigger Update'],
        secondaryActions: ['Export Data', 'Filter Records', 'Inspect Audit Trail'],
        requiredData: ['Operational Telemetry', 'User Role Permissions', 'Item Metadata'],
        components: requiredComponents || ['Telemetry Metric Grid', 'Action Triage Table', 'AI Assistant Copilot'],
        navigation: (uxDesign.screens || []).map(s => s.name),
        states: ['Nominal / Loaded', 'Active Triage', 'Action Submitted', 'Error Fallback'],
        validation: ['Input parameters validated against domain schema'],
        permissions: ['Operations Operator', 'Supervisor', 'Administrator'],
        responsive: {
          desktop: 'Ergonomic 3-column layout with metrics bar and triage table',
          tablet: '2-column responsive layout with collapsible secondary filters',
          mobile: 'Single-column vertical card stack with floating CTA trigger'
        },
        accessibilityNotes: 'WCAG 2.1 AA compliant, full keyboard tab order, ARIA-described status badges'
      }
    };

    const updatedScreens = [...(uxDesign.screens || []), newScreen];
    const newStep = {
      id: `uj-${Date.now()}`,
      screenId: newId,
      stepName: `${name} Flow`,
      actor: primaryUser || 'Operator',
      action: `Performs ${workflow || name} execution and validation`,
      output: `Updated ${name} record`
    };
    const updatedJourney = [...(uxDesign.userJourney || []), newStep];

    const updatedTokens = {
      ...(uxDesign.designTokens || {}),
      userJourney: updatedJourney
    };

    try {
      await api.updateUX(id, {
        screens: JSON.stringify(updatedScreens),
        designTokens: JSON.stringify(updatedTokens)
      });
      setUxDesign((prev) => ({
        ...prev,
        screens: updatedScreens,
        userJourney: updatedJourney,
        designTokens: updatedTokens
      }));
      setSelectedScreenId(newId);
      showToast(`Added custom screen: ${name}`);
    } catch (err) {
      showToast('Failed to add custom screen', 'error');
    }
  };

  // Delete Screen Handler (Acceptance Test 9)
  const handleDeleteScreen = async (screenId) => {
    if (!uxDesign || (uxDesign.screens || []).length <= 1) {
      showToast('At least one screen must remain in the architecture', 'error');
      return;
    }
    const updatedScreens = (uxDesign.screens || []).filter(s => s.id !== screenId);
    const updatedJourney = (uxDesign.userJourney || []).filter(uj => uj.screenId !== screenId);
    const updatedCoverage = (uxDesign.requirementCoverage || []).map(rc => {
      const remainingIds = (rc.implementedScreenIds || []).filter(sid => sid !== screenId);
      return {
        ...rc,
        implementedScreenIds: remainingIds,
        status: remainingIds.length > 0 ? rc.status : 'MISSING'
      };
    });

    const updatedTokens = {
      ...(uxDesign.designTokens || {}),
      userJourney: updatedJourney,
      requirementCoverage: updatedCoverage
    };

    try {
      await api.updateUX(id, {
        screens: JSON.stringify(updatedScreens),
        designTokens: JSON.stringify(updatedTokens)
      });
      setUxDesign(prev => ({
        ...prev,
        screens: updatedScreens,
        userJourney: updatedJourney,
        requirementCoverage: updatedCoverage,
        designTokens: updatedTokens
      }));
      if (selectedScreenId === screenId) {
        setSelectedScreenId(updatedScreens[0]?.id);
      }
      showToast('Deleted screen from UX architecture');
    } catch (err) {
      showToast('Failed to delete screen', 'error');
    }
  };

  // Section A Handler: Save Version Snapshot
  const handleSaveVersion = async () => {
    try {
      setSaving(true);
      const res = await api.saveUXVersion(id, {
        notes: `Saved UX snapshot v${(uxDesign?.version || 1) + 1} (${deviceView} view, ${renderMode} mode)`
      });
      const normalized = normalizeUxDesign(res.ux);
      setUxDesign(normalized);
      showToast(`Saved version snapshot v${normalized.version}`);
    } catch (err) {
      showToast(err.message || 'Failed to save version', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Section L Handler: Approve UX
  const handleApprove = async (notes) => {
    try {
      setApproving(true);
      const res = await api.approveUX(id, notes);
      const normalized = normalizeUxDesign(res.ux);
      setUxDesign(normalized);
      showToast(`UX Design System approved!`);
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleProceedToDatabase = () => {
    navigate(`/app/workspaces/${id}/database`);
  };

  // Find currently active screen
  const activeScreen = useMemo(() => {
    if (!uxDesign?.screens?.length) return null;
    return uxDesign.screens.find((s) => s.id === selectedScreenId) || uxDesign.screens[0];
  }, [uxDesign, selectedScreenId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spin" style={{ width: 36, height: 36, border: '3px solid var(--accent-amber)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Loading UX Architecture & Design Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ux-workspace-container">
      {/* 1. Header & Global Viewport / Mode Switchers */}
      <UxPageHeader
        ux={uxDesign}
        deviceView={deviceView}
        setDeviceView={setDeviceView}
        renderMode={renderMode}
        setRenderMode={setRenderMode}
        onSaveVersion={handleSaveVersion}
        onOpenVersions={() => setShowVersionModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenApproval={() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }}
        onProceedToDatabase={handleProceedToDatabase}
        saving={saving}
        approving={approving}
      />

      {/* 2. Compact Requirement Input & Domain Presets */}
      <RequirementInputSection
        requirementText={requirementText}
        setRequirementText={setRequirementText}
        selectedTheme={selectedTheme}
        setSelectedTheme={setSelectedTheme}
        onAnalyze={handleAnalyzeRequirement}
        onGenerate={handleGenerate}
        analyzing={analyzing}
        generating={generating}
      />

      {/* 3. AI Understanding Context Strip (Section 4) */}
      {understanding && (
        <AiUnderstandingSection
          understanding={understanding}
          onGenerate={() => handleGenerate({ requirement: requirementText, selectedTheme })}
          onRegenerate={handleAnalyzeRequirement}
          onUpdateUnderstanding={setUnderstanding}
        />
      )}

      {/* 4. AI Design Theme Direction Selection */}
      <DesignRecommendationsSection
        recommendations={understanding?.recommendedThemes || understanding?.designRecommendations}
        activeThemeId={selectedTheme}
        onSelectTheme={handleSelectTheme}
      />

      {/* 5. HERO GENERATED EXPERIENCE WORKSPACE */}
      <div className="ux-hero-workspace">
        <div className="ux-workspace-topbar">
          {/* Screen Tabs Navigator with Add and Delete screen support */}
          <AiUxGenerationWorkspace
            screens={uxDesign?.screens || []}
            selectedScreenId={selectedScreenId || uxDesign?.screens?.[0]?.id}
            onSelectScreen={setSelectedScreenId}
            onAddCustomScreen={handleAddCustomScreen}
            onDeleteScreen={handleDeleteScreen}
            activeTheme={selectedTheme}
          />
        </div>

        {/* Real Component Browser Preview */}
        {activeScreen && (
          <GeneratedExperiencePreview
            screen={activeScreen}
            allScreens={uxDesign?.screens || []}
            activeThemeId={selectedTheme}
            deviceView={deviceView}
            renderMode={renderMode}
            domain={understanding?.domain || 'ENTERPRISE'}
            onScreenChange={setSelectedScreenId}
          />
        )}

        {/* AI UX Technical Specification Panel for Selected Screen */}
        {activeScreen && (
          <ScreenSpecificationPanel
            screen={activeScreen}
            allScreens={uxDesign?.screens || []}
            onNavigateScreen={setSelectedScreenId}
          />
        )}

        {/* AI Prompt Editor Toolbar with Undo / Redo */}
        {uxDesign && (
          <AiUxEditorPanel
            selectedScreen={activeScreen}
            onApplyPromptEdit={handleApplyPromptEdit}
            editing={editing}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyStack.length > 0}
            canRedo={futureStack.length > 0}
          />
        )}
      </div>

      {/* 6. End-to-End User Journey Flow */}
      {uxDesign?.userJourney && uxDesign.userJourney.length > 0 && (
        <UserJourneyFlowSection
          userJourney={uxDesign.userJourney}
          screens={uxDesign.screens}
          selectedScreenId={selectedScreenId}
          onSelectScreen={setSelectedScreenId}
        />
      )}

      {/* 7. Requirement Coverage & UX Quality Verification */}
      {uxDesign && (
        <RequirementCoverageSection
          requirementCoverage={uxDesign.requirementCoverage}
          uxQualityCheck={uxDesign.uxQualityCheck}
          screens={uxDesign.screens}
          onGenerateMissing={() => handleApplyPromptEdit('Generate missing edge-case flows and confirmation screens', selectedScreenId)}
        />
      )}

      {/* 8. Actionable Recommendations & Rationale */}
      {uxDesign && (
        <UxRecommendationsSection
          recommendations={uxDesign.uxRecommendations}
          designExplanation={uxDesign.designExplanation}
          onToggleRecommendation={handleToggleRecommendation}
        />
      )}

      {/* 9. UX Activity Log & Advisory Notice & AI Feedback Loop */}
      {uxDesign && (
        <UxActivityFeedbackSection
          ux={uxDesign}
        />
      )}

      {/* 10. Collaboration & Formal Approval Gate */}
      {uxDesign && (
        <UxCollaborationPanel
          ux={uxDesign}
          onApprove={handleApprove}
          approving={approving}
        />
      )}

      {/* Version History Modal */}
      {showVersionModal && (
        <VersionHistoryModal
          workspaceId={id}
          currentVersion={uxDesign?.version || 1}
          onClose={() => setShowVersionModal(false)}
          onVersionRestored={loadUX}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <UxExportModal
          ux={uxDesign}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default UxDesignerPage;

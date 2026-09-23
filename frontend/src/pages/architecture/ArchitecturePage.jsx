import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import {
  Network,
  Sparkles,
  Plus,
  RefreshCw,
  Save,
  ArrowRight,
  ShieldCheck,
  Server,
  Database,
  Smartphone,
  Globe,
  Trash2,
  X,
  Layers,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Code2,
  FileCheck,
  Link2,
  Lock,
  Radio,
  Workflow
} from 'lucide-react';
import {
  buildArchitectureViewModel,
  validateArchitectureConsistency,
  CANONICAL_TIERS
} from './architectureViewModel';

export const ArchitecturePage = () => {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [architecture, setArchitecture] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(1);
  const [generationError, setGenerationError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [staleReason, setStaleReason] = useState(null);
  const [isStage3Approved, setIsStage3Approved] = useState(true);
  const [hasStage3Solution, setHasStage3Solution] = useState(true);
  const [activeTab, setActiveTab] = useState('canvas'); // canvas | hld | lld | security | integrations

  // Selected Node Drawer
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newNode, setNewNode] = useState({
    label: '',
    type: 'SERVICE',
    tier: 'Application Services',
    description: '',
    tech: '',
    purpose: '',
    source: 'USER_PROVIDED',
    validationStatus: 'PROPOSED',
    classification: 'USER_ADDED',
    requirementIds: '',
    capabilityIds: '',
    posX: 450,
    posY: 200
  });

  // Integration tab filter
  const [integrationFilter, setIntegrationFilter] = useState('ALL'); // ALL | EXISTING | PROPOSED | VALIDATION_REQUIRED

  const loadArchitecture = async () => {
    try {
      setLoading(true);
      setGenerationError(null);
      const res = await api.getArchitecture(id);
      if (res.architecture && res.architecture.workspaceId === id) {
        setArchitecture(res.architecture);
        setNodes(res.architecture.nodes || []);
        setEdges(res.architecture.edges || []);
        setIsStale(!!res.isStale);
        setStaleReason(res.staleReason || null);
        setIsStage3Approved(res.isStage3Approved !== false);
        setHasStage3Solution(res.hasStage3Solution !== false);
      } else {
        setArchitecture(null);
        setNodes([]);
        setEdges([]);
        setIsStale(false);
        setStaleReason(null);
        setIsStage3Approved(res.isStage3Approved !== false);
        setHasStage3Solution(res.hasStage3Solution !== false);
      }
    } catch (err) {
      console.error('Failed to load architecture:', err);
    } finally {
      setLoading(false);
    }
  };

  // Immediate state clearance when route workspace ID changes (Strict Workspace Isolation)
  useEffect(() => {
    setArchitecture(null);
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setIsStale(false);
    setStaleReason(null);
    setGenerationError(null);
    loadArchitecture();
  }, [id]);

  // Single source of truth: Canonical Architecture View Model
  const vm = useMemo(() => {
    if (!architecture) return null;
    return buildArchitectureViewModel({
      ...architecture,
      nodes,
      edges
    }, { isStale, staleReason });
  }, [architecture, nodes, edges, isStale, staleReason]);

  // Graph consistency validation check
  const consistencyReport = useMemo(() => {
    if (!architecture) return { isValid: true, issues: [] };
    return validateArchitectureConsistency({ nodes, edges });
  }, [architecture, nodes, edges]);

  // Currently selected node object from view model
  const selectedNode = useMemo(() => {
    if (!vm || !selectedNodeId) return null;
    return vm.nodeMap.get(selectedNodeId) || null;
  }, [vm, selectedNodeId]);

  const handleGenerate = async () => {
    let stepTimer = null;
    try {
      setGenerating(true);
      setGenerationError(null);
      setGenerationStep(1);

      stepTimer = setInterval(() => {
        setGenerationStep((prev) => (prev < 9 ? prev + 1 : prev));
      }, 650);

      const res = await api.generateArchitecture(id);
      clearInterval(stepTimer);
      setGenerationStep(10);

      setArchitecture(res.architecture);
      setNodes(res.architecture.nodes || []);
      setEdges(res.architecture.edges || []);
      setIsStale(false);
      setStaleReason(null);
      setSelectedNodeId(null);
      showToast('Architecture Topology generated!');
    } catch (err) {
      if (stepTimer) clearInterval(stepTimer);
      let title = 'Architecture generation could not be saved.';
      let details = 'Generated architecture passed validation but could not be persisted.';

      const errMsg = err?.message || '';
      if (errMsg && !errMsg.toLowerCase().includes('prisma') && !errMsg.toLowerCase().includes('invocation')) {
        title = errMsg;
      }
      if (err?.details && typeof err.details === 'string' && !err.details.toLowerCase().includes('prisma')) {
        details = err.details;
      }

      setGenerationError({ title, details });
      showToast(title, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveVersion = async () => {
    try {
      const res = await api.saveArchitectureVersion(id, {
        notes: 'User saved architecture topology snapshot'
      });
      setArchitecture(res.architecture);
      showToast(`Saved version snapshot v${res.architecture.version}`);
    } catch (err) {
      showToast('Failed to save version', 'error');
    }
  };

  const handleAddNode = async (e) => {
    e.preventDefault();
    try {
      const res = await api.addNode(id, {
        ...newNode,
        tech: newNode.tech ? newNode.tech.trim() : null,
        classification: 'USER_ADDED',
        source: 'USER_PROVIDED'
      });
      setNodes((prev) => [...prev, res.node]);
      setAddModalOpen(false);
      setNewNode({
        label: '',
        type: 'SERVICE',
        tier: 'Application Services',
        description: '',
        tech: '',
        purpose: '',
        source: 'USER_PROVIDED',
        validationStatus: 'PROPOSED',
        classification: 'USER_ADDED',
        requirementIds: '',
        capabilityIds: '',
        posX: 450,
        posY: 200
      });
      setSelectedNodeId(res.node.id);
      showToast(`Component "${res.node.label}" added to topology.`);
    } catch (err) {
      showToast(err.message || 'Failed to add node', 'error');
    }
  };

  const handleDeleteNode = async (nodeId, e) => {
    e?.stopPropagation?.();
    try {
      await api.deleteNode(id, nodeId);
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((ed) => ed.sourceId !== nodeId && ed.targetId !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      showToast('Component removed.');
    } catch (err) {
      showToast('Failed to remove node', 'error');
    }
  };

  // Dragging support for interactive canvas
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e, node) => {
    e?.stopPropagation?.();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    dragOffsetRef.current = {
      x: e.clientX - node.posX,
      y: e.clientY - node.posY
    };
  };

  const handleMouseMove = (e) => {
    if (!draggingNodeId) return;
    const newX = Math.max(20, Math.min(940, e.clientX - dragOffsetRef.current.x));
    const newY = Math.max(20, Math.min(560, e.clientY - dragOffsetRef.current.y));

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, posX: newX, posY: newY } : n))
    );
  };

  const handleMouseUp = async () => {
    if (draggingNodeId) {
      const dragged = nodes.find((n) => n.id === draggingNodeId);
      if (dragged) {
        try {
          await api.updateNode(id, dragged.id, { posX: dragged.posX, posY: dragged.posY });
        } catch (e) {
          console.error('Failed to sync node position:', e);
        }
      }
      setDraggingNodeId(null);
    }
  };

  const getNodeIcon = (type) => {
    switch (type) {
      case 'CLIENT': return <Smartphone size={16} color="var(--accent-blue)" />;
      case 'GATEWAY': return <ShieldCheck size={16} color="var(--accent-amber)" />;
      case 'AI': return <Cpu size={16} color="#A855F7" />;
      case 'DATABASE': return <Database size={16} color="var(--accent-green)" />;
      case 'INTEGRATION': return <Globe size={16} color="var(--text-secondary)" />;
      default: return <Server size={16} color="var(--accent-amber)" />;
    }
  };

  // Theme-aware, high-contrast classification badge
  const getStatusBadge = (node) => {
    const classification = (node?.classification || node?.validationStatus || 'AI_PROPOSED').toUpperCase();
    if (classification === 'EXISTING' || classification === 'EXISTING_SYSTEM') {
      return (
        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }}>
          EXISTING
        </span>
      );
    }
    if (classification === 'USER_ADDED' || classification === 'USER_PROVIDED') {
      return (
        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
          USER ADDED
        </span>
      );
    }
    if (classification === 'VALIDATION_REQUIRED' || classification === 'VALIDATION REQUIRED') {
      return (
        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--accent-red-light)', color: 'var(--accent-red-text)', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
          VALIDATION REQ
        </span>
      );
    }
    if (classification === 'RECOMMENDED') {
      return (
        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--accent-amber-light)', color: 'var(--accent-amber-text)', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
          RECOMMENDED
        </span>
      );
    }
    return (
      <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'var(--accent-blue-light)', color: 'var(--accent-blue-text)', border: '1px solid rgba(59, 130, 246, 0.35)' }}>
        PROPOSED
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>{t.common.loading}</div>;
  }

  // Multi-step Generation Loading State
  if (generating) {
    return (
      <div className="card" style={{ padding: '40px 30px', maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
        <RefreshCw size={36} color="var(--accent-amber)" className="spin" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>Generating Architecture</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
          Synthesizing multi-tier target topology from workspace evidence and Stage 3 solution.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 460, margin: '0 auto' }}>
          {[
            '1. Loading business context',
            '2. Loading validated requirements',
            '3. Loading selected solution',
            '4. Loading technology stack',
            '5. Generating architecture',
            '6. Validating topology',
            '7. Building HLD / LLD',
            '8. Preparing security & integrations',
            '9. Saving architecture',
            '10. Rendering canvas'
          ].map((stepText, idx) => {
            const stepNum = idx + 1;
            const isDone = generationStep > stepNum;
            const isCurrent = generationStep === stepNum;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: isDone ? 'var(--accent-green)' : isCurrent ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {isDone ? (
                  <CheckCircle2 size={16} color="var(--accent-green)" />
                ) : isCurrent ? (
                  <div className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent-amber)', borderTopColor: 'transparent' }} />
                ) : (
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--border-medium)' }} />
                )}
                <span style={{ fontWeight: isCurrent ? 700 : 500 }}>{stepText}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Generation Failure State
  if (generationError && !architecture) {
    const errorTitle = typeof generationError === 'object' ? generationError.title : 'Architecture generation could not be saved.';
    const errorDetails = typeof generationError === 'object' ? generationError.details : generationError;
    return (
      <div className="card" style={{ padding: '40px', maxWidth: 600, margin: '40px auto', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.4)', backgroundColor: 'var(--accent-red-light)' }}>
        <AlertTriangle size={42} color="var(--accent-red)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-red-text)', marginBottom: 8 }}>{errorTitle}</h3>
        {errorDetails && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20, lineHeight: 1.5 }}>
            {errorDetails}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button onClick={handleGenerate} className="btn btn-primary btn-sm" style={{ backgroundColor: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>
            <RefreshCw size={14} /> Retry Generation
          </button>
          <button onClick={() => navigate(`/app/workspaces/${id}/solution`)} className="btn btn-secondary btn-sm">
            Return to Solution Builder <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Empty state when architecture is not yet generated
  if (!architecture) {
    return (
      <div className="card" style={{ padding: '60px 40px', textAlign: 'center', maxWidth: 680, margin: '40px auto' }}>
        <Network size={54} color="var(--accent-amber)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
          {t.architecture.engineTitle || 'Target Architecture Generator'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem', lineHeight: 1.6 }}>
          {!hasStage3Solution ? (
            'Architecture is unavailable until a Solution Builder strategy has been configured in Stage 3.'
          ) : !isStage3Approved ? (
            'Architecture is unavailable until a Solution Builder strategy has been selected and approved.'
          ) : (
            'Generate a multi-tier target solution topology derived strictly from your workspace context, Stage 2 analysis, and Stage 3 selected technology stack.'
          )}
        </p>

        {!hasStage3Solution || !isStage3Approved ? (
          <button
            onClick={() => navigate(`/app/workspaces/${id}/solution`)}
            className="btn btn-primary btn-lg"
            style={{ margin: '0 auto' }}
          >
            Go to Stage 3: Solution Builder <ArrowRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary btn-lg"
            style={{ margin: '0 auto' }}
          >
            <Sparkles size={18} />
            {generating ? t.architecture.generatingBtn : t.architecture.generateBtn}
          </button>
        )}
      </div>
    );
  }

  // Safety check: ensure architecture belongs to current workspace
  if (architecture.workspaceId !== id) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stale Architecture Warning Banner */}
      {isStale && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: 'var(--accent-amber-light)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-amber-text)',
            fontSize: '0.88rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={22} color="var(--accent-amber)" />
            <div>
              <strong>Architecture is based on an older Solution Builder version.</strong>
              <div style={{ fontSize: '0.82rem', marginTop: 2, opacity: 0.9 }}>
                {staleReason || 'The upstream strategy option or technology stack was updated after this architecture was generated.'}
              </div>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary btn-sm"
            style={{ whiteSpace: 'nowrap', backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}
          >
            <RefreshCw size={14} className={generating ? 'spin' : ''} /> Regenerate Architecture
          </button>
        </div>
      )}

      {/* Top Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t.architecture.title}</h1>
            <span className="badge badge-green">{t.stages[architecture.status?.toLowerCase()] || architecture.status}</span>
            <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>{t.common.version} {architecture.version}</span>
            {architecture.sourceSolutionOptionId && (
              <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                Option: {architecture.sourceSolutionOptionId}
              </span>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({vm.nodes.length} Components • {vm.edges.length} Connections)
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {architecture.title || t.architecture.engineDesc}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setAddModalOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> {t.architecture.addNode}
          </button>
          <button onClick={handleSaveVersion} className="btn btn-secondary btn-sm">
            <Save size={14} /> {t.common.save}
          </button>
          <button onClick={handleGenerate} disabled={generating} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={generating ? 'spin' : ''} /> {t.common.regenerate}
          </button>
          <button onClick={() => navigate(`/app/workspaces/${id}/process`)} className="btn btn-dark btn-sm">
            {t.nav.process} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, overflowX: 'auto' }}>
        {[
          { key: 'canvas', label: 'Interactive Canvas' },
          { key: 'hld', label: 'High-Level Design (HLD)' },
          { key: 'lld', label: 'Low-Level Design (LLD)' },
          { key: 'security', label: 'Security & Compliance' },
          { key: 'integrations', label: 'System Integrations' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="btn btn-sm"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--accent-amber)' : 'transparent',
              color: activeTab === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
              borderColor: activeTab === tab.key ? 'var(--accent-amber)' : 'var(--border-subtle)',
              fontWeight: activeTab === tab.key ? 700 : 500
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Interactive Canvas */}
      {activeTab === 'canvas' && (
        <div style={{ position: 'relative' }}>
          <div
            className="diagram-canvas-scroll"
            style={{
              position: 'relative',
              height: 640,
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'auto',
              boxShadow: 'var(--shadow-sm)',
              userSelect: 'none'
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <div style={{ position: 'relative', minWidth: 920, height: 640 }}>
            {/* Canvas Background Grid */}
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              <defs>
                <pattern id="arch-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#arch-grid)" />

              {/* Render Connection Edges */}
              {vm.edges.map((e) => {
                const src = vm.nodeMap.get(e.sourceId);
                const tgt = vm.nodeMap.get(e.targetId);
                if (!src || !tgt) return null;

                const x1 = src.posX + 115;
                const y1 = src.posY + 45;
                const x2 = tgt.posX;
                const y2 = tgt.posY + 45;

                return (
                  <g key={e.id}>
                    <path
                      d={`M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="var(--border-medium)"
                      strokeWidth="2"
                      strokeDasharray={e.protocol === 'REST' ? 'none' : '4 4'}
                    />
                    <circle cx={x2} cy={y2} r="4" fill="var(--accent-amber)" />
                  </g>
                );
              })}
            </svg>

            {/* Render Nodes */}
            {vm.nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isExisting = node.classification === 'EXISTING';
              const isUserAdded = node.classification === 'USER_ADDED';

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleMouseDown(e, node)}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{
                    position: 'absolute',
                    left: node.posX,
                    top: node.posY,
                    width: 230,
                    backgroundColor: isExisting
                      ? 'var(--bg-subtle)'
                      : isUserAdded
                        ? 'var(--bg-surface)'
                        : 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected
                      ? '2px solid var(--accent-amber)'
                      : isExisting
                        ? '1px dashed var(--border-medium)'
                        : isUserAdded
                          ? '1px solid rgba(168, 85, 247, 0.5)'
                          : '1px solid var(--border-subtle)',
                    boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                    cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
                    padding: '12px 14px',
                    zIndex: isSelected ? 20 : 10,
                    transition: draggingNodeId === node.id ? 'none' : 'box-shadow 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getNodeIcon(node.type)}
                      <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {node.tier}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getStatusBadge(node)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id, e);
                        }}
                        title="Delete component"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                    {node.label}
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.35, marginBottom: 8 }}>
                    {node.purpose || node.description}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                    {node.tech && (
                      <div style={{ fontSize: '0.66rem', fontFamily: 'monospace', color: 'var(--accent-amber-text)', background: 'var(--accent-amber-light)', padding: '2px 6px', borderRadius: 4 }}>
                        {node.tech}
                      </div>
                    )}
                    {node.requirementIds.length > 0 && (
                      <div style={{ fontSize: '0.62rem', color: 'var(--accent-blue-text)', background: 'var(--accent-blue-light)', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                        {node.requirementIds[0]}
                        {node.requirementIds.length > 1 && ` +${node.requirementIds.length - 1}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>

            {/* Bottom helper tip */}
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 16,
                backgroundColor: 'var(--bg-surface)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}
            >
              💡 <strong>Interactive Diagram:</strong> Click any node to open the Inspector. Drag nodes to customize topology positions.
            </div>
          </div>

          {/* Node Inspector Drawer */}
          {selectedNode && (
            <>
              <div
                className="hide-on-desktop"
                onClick={() => setSelectedNodeId(null)}
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
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 390,
                  height: 640,
                  backgroundColor: 'var(--bg-surface)',
                  borderLeft: '1px solid var(--border-medium)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '20px 24px',
                  overflowY: 'auto',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16
                }}
              >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getNodeIcon(selectedNode.type)}
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Node Inspector</h3>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Component Name</label>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: 2, color: 'var(--text-primary)' }}>
                  {selectedNode.label}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Architectural Tier</label>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{selectedNode.tier}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classification</label>
                  <div style={{ marginTop: 2 }}>{getStatusBadge(selectedNode)}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Technology Stack</label>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', background: 'var(--bg-subtle)', padding: '6px 10px', borderRadius: 6, marginTop: 2, border: '1px solid var(--border-subtle)', color: selectedNode.tech ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {selectedNode.tech || 'Not specified'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Purpose & Architectural Role</label>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>
                  {selectedNode.purpose || selectedNode.description || 'Not specified'}
                </div>
              </div>

              {/* Graph Connections from Edges */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Topology Connections</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {/* Incoming */}
                  {vm.getIncomingEdges(selectedNode.id).map(e => {
                    const src = vm.nodeMap.get(e.sourceId);
                    return (
                      <div key={e.id} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-blue)' }}>← Inbound:</span>
                        <span
                          onClick={() => setSelectedNodeId(e.sourceId)}
                          style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {src?.label || e.sourceId}
                        </span>
                        {e.protocol && <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent-amber)' }}>[{e.protocol}]</span>}
                      </div>
                    );
                  })}
                  {/* Outgoing */}
                  {vm.getOutgoingEdges(selectedNode.id).map(e => {
                    const tgt = vm.nodeMap.get(e.targetId);
                    return (
                      <div key={e.id} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-green)' }}>→ Outbound:</span>
                        <span
                          onClick={() => setSelectedNodeId(e.targetId)}
                          style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {tgt?.label || e.targetId}
                        </span>
                        {e.protocol && <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent-amber)' }}>[{e.protocol}]</span>}
                      </div>
                    );
                  })}
                  {vm.getIncomingEdges(selectedNode.id).length === 0 && vm.getOutgoingEdges(selectedNode.id).length === 0 && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active edges connected</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Requirements Addressed</label>
                <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {selectedNode.requirementIds.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedNode.requirementIds.map((req, idx) => (
                        <span key={idx} style={{ fontSize: '0.72rem', background: 'var(--accent-blue-light)', color: 'var(--accent-blue-text)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                          {req}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No requirements linked</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Business Capabilities</label>
                <div style={{ fontSize: '0.85rem', marginTop: 2, color: 'var(--text-secondary)' }}>
                  {selectedNode.capabilityIds.length > 0 ? selectedNode.capabilityIds.join(', ') : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not specified</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Source Origin</label>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>
                    {selectedNode.source || '—'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence</label>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>
                    {typeof selectedNode.confidence === 'number' ? `${Math.round(selectedNode.confidence * 100)}%` : '—'}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dependencies</label>
                <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', marginTop: 2, color: 'var(--text-secondary)' }}>
                  {selectedNode.dependencies || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not specified</span>}
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      )}

      {/* Tab 2: High Level Design (HLD) */}
      {activeTab === 'hld' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Architecture Overview */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>High-Level Architecture (HLD)</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', fontWeight: 600, marginTop: 2 }}>
                  {vm.architectureStyle}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-gray">Version {vm.version}</span>
                {vm.optionId && <span className="badge badge-gray">Option: {vm.optionId}</span>}
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              {architecture.title || 'Target Solution Architecture'} is composed of {vm.nodes.length} components
              distributed across {vm.tiers.length} architectural tiers and interconnected by {vm.edges.length} directed
              data-flow edges.
              {vm.edgeProtocols.length > 0 && ` Active protocols: ${vm.edgeProtocols.join(', ')}.`}
            </p>

            {/* Classification Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginTop: 16 }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{vm.nodes.length}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Nodes</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{vm.edges.length}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Data Flows</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{vm.classificationCounts.EXISTING}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Existing Systems</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{vm.classificationCounts.VALIDATION_REQUIRED}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-red-text)', textTransform: 'uppercase', fontWeight: 700 }}>Validation Req</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{vm.classificationCounts.USER_ADDED}</div>
                <div style={{ fontSize: '0.72rem', color: '#C084FC', textTransform: 'uppercase', fontWeight: 700 }}>User Added</div>
              </div>
            </div>
          </div>

          {/* Tier Breakdown */}
          <div className="card">
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>Architectural Tier Breakdown</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {vm.tiers.map((tier) => (
                <div key={tier.name} style={{
                  padding: '14px 16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{tier.name}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'var(--accent-blue-light)', color: 'var(--accent-blue-text)', fontWeight: 700 }}>
                      {tier.count} {tier.count === 1 ? 'component' : 'components'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tier.components.map(n => (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {getNodeIcon(n.type)}
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{n.label}</div>
                            <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: n.tech ? 'var(--accent-amber-text)' : 'var(--text-muted)' }}>
                              {n.tech || 'Not specified'}
                            </div>
                          </div>
                        </div>
                        <div>{getStatusBadge(n)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Communication / Data Flow */}
          <div className="card">
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 12 }}>Communication & Data Flow Topology</h4>
            {vm.edges.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 10 }}>
                {vm.edges.map((e) => {
                  const src = vm.nodeMap.get(e.sourceId);
                  const tgt = vm.nodeMap.get(e.targetId);
                  return (
                    <div key={e.id} style={{
                      padding: '10px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{src?.label || e.sourceId}</span>
                        <span style={{ color: 'var(--accent-amber)' }}>→</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tgt?.label || e.targetId}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent-amber)', background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                          {e.protocol || 'Unspecified'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No edges defined in the current topology.</p>
            )}
          </div>

          {/* Requirements Coverage Matrix */}
          <div className="card">
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 12 }}>Requirements Traceability Coverage</h4>
            {vm.requirementsCoverage.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {vm.requirementsCoverage.map((item) => (
                  <div key={item.id} style={{
                    padding: '10px 14px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.76rem', background: 'var(--accent-blue-light)', color: 'var(--accent-blue-text)', padding: '3px 8px', borderRadius: 4, fontWeight: 800 }}>
                        {item.id}
                      </span>
                      <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        Addressed by <strong>{item.components.length}</strong> {item.components.length === 1 ? 'component' : 'components'}:
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {item.components.map(comp => (
                        <span key={comp.id} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {comp.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No requirements linked to architecture nodes.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Low Level Design (LLD) */}
      {activeTab === 'lld' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 10 }}>Low-Level Design (LLD) & Runtime Contracts</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {vm.runtimeServices.length > 0
                ? `Topology specifies ${vm.runtimeServices.length} operational runtime service${vm.runtimeServices.length > 1 ? 's' : ''}. `
                : 'No dedicated service components defined. '
              }
              {vm.persistenceNodes.length > 0
                ? `Data persistence is managed across ${vm.persistenceNodes.length} storage component${vm.persistenceNodes.length > 1 ? 's' : ''}. `
                : 'No dedicated persistence components defined. '
              }
              {vm.gatewayNodes.length > 0
                ? `API ingress and boundary routing are mediated by ${vm.gatewayNodes.length} gateway component${vm.gatewayNodes.length > 1 ? 's' : ''}. `
                : ''
              }
              {vm.edges.length > 0
                ? `Communication is executed across ${vm.edges.length} directed inter-service contracts.`
                : ''
              }
            </p>
          </div>

          {/* Microservices & Service Runtime Contracts */}
          <div className="card">
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>Runtime Services & Component Contracts</h4>
            {vm.runtimeServices.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
                {vm.runtimeServices.map((svc) => (
                  <div
                    key={svc.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {getNodeIcon(svc.type)}
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{svc.label}</span>
                      </div>
                      {getStatusBadge(svc)}
                    </div>

                    <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: svc.tech ? 'var(--accent-amber)' : 'var(--text-muted)', background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                      Tech: {svc.tech || 'Not specified'}
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                      {svc.purpose || svc.description || 'Not specified'}
                    </p>

                    {/* Upstream & Downstream Dependencies */}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.75rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-muted)' }}>Upstream (Callers):</strong>{' '}
                        {svc.upstreamNodes.length > 0
                          ? svc.upstreamNodes.map(item => item.node.label).join(', ')
                          : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None (Ingress or root)</span>}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--text-muted)' }}>Downstream (Dependencies):</strong>{' '}
                        {svc.downstreamNodes.length > 0
                          ? svc.downstreamNodes.map(item => item.node.label).join(', ')
                          : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None (Terminal service)</span>}
                      </div>
                      {svc.requirementIds.length > 0 && (
                        <div>
                          <strong style={{ color: 'var(--text-muted)' }}>Requirements:</strong>{' '}
                          {svc.requirementIds.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No service-tier components identified in the current topology.
              </div>
            )}
          </div>

          {/* Persistence & Storage Layer */}
          <div className="card">
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>Persistence & Storage Architecture</h4>
            {vm.persistenceNodes.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
                {vm.persistenceNodes.map((db) => (
                  <div key={db.id} style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Database size={16} color="var(--accent-green)" />
                        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{db.label}</span>
                      </div>
                      {getStatusBadge(db)}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: db.tech ? 'var(--accent-amber)' : 'var(--text-muted)', marginBottom: 6 }}>
                      Storage Engine: {db.tech || 'Not specified'}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                      {db.purpose || db.description || 'Not specified'}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <strong>Consumer Services:</strong>{' '}
                      {db.consumers.length > 0
                        ? db.consumers.map(c => c.label).join(', ')
                        : 'No direct connected callers in topology'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No dedicated persistence components identified in the current architecture.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Security & Compliance */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ShieldCheck size={22} color="var(--accent-green)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Security Posture & Perimeter Controls</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              {vm.security.hasGateway
                ? `Perimeter ingress is enforced via ${vm.security.gatewayNodes.map(n => n.label).join(', ')}${vm.security.gatewayNodes.some(n => n.tech) ? ` using ${vm.security.gatewayNodes.map(n => n.tech).filter(Boolean).join(', ')}` : ''}. `
                : 'No dedicated ingress gateway is defined in this topology; services are directly addressable within network boundary. '
              }
              {vm.security.persistenceNodes.length > 0
                ? `Data storage layers (${vm.security.persistenceNodes.map(n => n.label).join(', ')}) constitute protected internal storage boundaries. `
                : ''
              }
              {vm.integrations.existingSystems.length > 0
                ? `External boundaries interface with ${vm.integrations.existingSystems.length} existing enterprise system${vm.integrations.existingSystems.length > 1 ? 's' : ''}.`
                : ''
              }
            </p>

            {/* Control Status Indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>API Gateway / Ingress</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: 4, color: vm.security.hasGateway ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {vm.security.hasGateway ? 'CONFIRMED' : 'NOT SPECIFIED'}
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Data at Rest Protection</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: 4, color: vm.security.persistenceNodes.length > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {vm.security.persistenceNodes.length > 0 ? 'CONFIRMED' : 'NOT SPECIFIED'}
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Perimeter Boundary</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: 4, color: vm.integrations.all.length > 0 ? 'CONFIRMED' : 'NOT SPECIFIED' }}>
                  {vm.integrations.all.length > 0 ? 'CONFIRMED' : 'NOT SPECIFIED'}
                </div>
              </div>
            </div>
          </div>

          {/* Security-Relevant Components */}
          <div className="card">
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>Security-Relevant Architecture Components</h4>
            {vm.security.securityRelevantComponents.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px' }}>Component</th>
                      <th style={{ padding: '10px 12px' }}>Tier</th>
                      <th style={{ padding: '10px 12px' }}>Technology</th>
                      <th style={{ padding: '10px 12px' }}>Security Role</th>
                      <th style={{ padding: '10px 12px' }}>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vm.security.securityRelevantComponents.map(n => (
                      <tr key={n.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>{n.label}</td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{n.tier}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace' }}>{n.tech || 'Not specified'}</td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{n.purpose || n.description || 'Not specified'}</td>
                        <td style={{ padding: '12px' }}>{getStatusBadge(n)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No explicit security controls are defined in the current architecture.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: System Integrations */}
      {activeTab === 'integrations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 10 }}>Enterprise System Integrations</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {vm.integrations.all.length > 0
                ? `Topology identifies ${vm.integrations.all.length} external or existing system integration point${vm.integrations.all.length > 1 ? 's' : ''}, including ${vm.integrations.existingSystems.length} verified existing enterprise system${vm.integrations.existingSystems.length > 1 ? 's' : ''}.`
                : 'No external or existing system integration points have been defined for this architecture.'
              }
            </p>

            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {[
                { key: 'ALL', label: `All (${vm.integrations.all.length})` },
                { key: 'EXISTING', label: `Existing Systems (${vm.integrations.existingSystems.length})` },
                { key: 'PROPOSED', label: `Proposed (${vm.integrations.proposedIntegrations.length})` },
                { key: 'VALIDATION_REQUIRED', label: `Validation Required (${vm.integrations.validationRequired.length})` }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setIntegrationFilter(f.key)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: integrationFilter === f.key ? 'var(--bg-sidebar)' : 'var(--bg-subtle)',
                    color: integrationFilter === f.key ? '#FFFFFF' : 'var(--text-secondary)',
                    borderColor: 'var(--border-subtle)',
                    fontSize: '0.75rem'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>Integration Connectors & Topology Flow</h4>
            {(() => {
              const displayNodes = integrationFilter === 'EXISTING'
                ? vm.integrations.existingSystems
                : integrationFilter === 'PROPOSED'
                  ? vm.integrations.proposedIntegrations
                  : integrationFilter === 'VALIDATION_REQUIRED'
                    ? vm.integrations.validationRequired
                    : vm.integrations.all;

              if (displayNodes.length === 0) {
                return (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
                    No integration components match the selected filter.
                  </div>
                );
              }

              return (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px 12px' }}>System Component</th>
                        <th style={{ padding: '10px 12px' }}>Direction</th>
                        <th style={{ padding: '10px 12px' }}>Purpose</th>
                        <th style={{ padding: '10px 12px' }}>Technology / Protocol</th>
                        <th style={{ padding: '10px 12px' }}>Classification</th>
                        <th style={{ padding: '10px 12px' }}>Connected Topology</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayNodes.map(intNode => (
                        <tr key={intNode.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px', fontWeight: 700 }}>{intNode.label}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: intNode.direction === 'Bidirectional'
                                ? 'var(--accent-green-light)'
                                : intNode.direction === 'Inbound'
                                  ? 'var(--accent-blue-light)'
                                  : 'var(--bg-subtle)',
                              color: intNode.direction === 'Bidirectional'
                                ? 'var(--accent-green-text)'
                                : intNode.direction === 'Inbound'
                                  ? 'var(--accent-blue-text)'
                                  : 'var(--text-secondary)'
                            }}>
                              {intNode.direction}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{intNode.purpose || intNode.description || 'Not specified'}</td>
                          <td style={{ padding: '12px', fontFamily: 'monospace' }}>{intNode.tech || 'Not specified'}</td>
                          <td style={{ padding: '12px' }}>{getStatusBadge(intNode)}</td>
                          <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                            {intNode.connectedNodeLabels.length > 0
                              ? intNode.connectedNodeLabels.join(', ')
                              : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unconnected</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add Node Modal */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontWeight: 800 }}>Add Topology Component Node</h4>
              <button onClick={() => setAddModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddNode} style={{ padding: 20 }}>
              <div className="form-group">
                <label className="form-label">Component Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Order Dispatch Coordinator"
                  className="form-input"
                  value={newNode.label}
                  onChange={(e) => setNewNode({ ...newNode, label: e.target.value })}
                />
              </div>

              <div className="grid-responsive-2col" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Architectural Tier</label>
                  <select
                    className="form-select"
                    value={newNode.tier}
                    onChange={(e) => setNewNode({ ...newNode, tier: e.target.value })}
                  >
                    {CANONICAL_TIERS.map(tier => (
                      <option key={tier} value={tier}>{tier}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Technology Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. Node.js Express"
                    className="form-input"
                    value={newNode.tech}
                    onChange={(e) => setNewNode({ ...newNode, tech: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-responsive-2col" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Classification</label>
                  <select
                    className="form-select"
                    value={newNode.classification}
                    onChange={(e) => setNewNode({ ...newNode, classification: e.target.value })}
                  >
                    <option value="USER_ADDED">USER ADDED</option>
                    <option value="EXISTING">EXISTING</option>
                    <option value="AI_PROPOSED">AI PROPOSED</option>
                    <option value="RECOMMENDED">RECOMMENDED</option>
                    <option value="VALIDATION_REQUIRED">VALIDATION REQUIRED</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Requirements Addressed</label>
                  <input
                    type="text"
                    placeholder="e.g. REQ-01, REQ-03"
                    className="form-input"
                    value={newNode.requirementIds}
                    onChange={(e) => setNewNode({ ...newNode, requirementIds: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Purpose & Architectural Role</label>
                <textarea
                  rows={2}
                  className="form-textarea"
                  placeholder="Describes why this node exists and what capabilities it provides."
                  value={newNode.purpose}
                  onChange={(e) => setNewNode({ ...newNode, purpose: e.target.value, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => setAddModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Place Node on Canvas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

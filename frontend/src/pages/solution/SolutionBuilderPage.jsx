import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { showToast } from '../../components/common/Toast';
import {
  Cpu,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Save,
  ArrowRight,
  ShieldAlert,
  Layers,
  Check,
  Zap,
  Server,
  Code2,
  GitPullRequest,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Target,
  FileText,
  HelpCircle,
  Info,
  Compass
} from 'lucide-react';

export const SolutionBuilderPage = () => {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [solution, setSolution] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [handoffGate, setHandoffGate] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [showHandoffTrace, setShowHandoffTrace] = useState(true);
  const [expandedOptionId, setExpandedOptionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [businessValue, setBusinessValue] = useState('');
  const [implementationApproach, setImplementationApproach] = useState('');

  const loadSolution = async () => {
    try {
      setLoading(true);
      const [solRes, anaRes] = await Promise.all([
        api.getSolution(id).catch(() => ({ solution: null })),
        api.getAnalysis(id).catch(() => ({ analysis: null }))
      ]);

      if (solRes?.solution) {
        // Enforce strict workspace isolation
        if (solRes.solution.workspaceId && solRes.solution.workspaceId !== id) {
          console.warn(`Blocked cross-workspace solution bleed: solution.workspaceId (${solRes.solution.workspaceId}) !== routeId (${id})`);
          setSolution(null);
        } else {
          setSolution(solRes.solution);
          setName(solRes.solution.name || '');
          setSummary(solRes.solution.summary || '');
          setBusinessValue(solRes.solution.businessValue || '');
          setImplementationApproach(solRes.solution.implementationApproach || '');
        }
      } else {
        setSolution(null);
      }

      setHandoffGate(solRes?.handoffGate || null);
      setIsStale(Boolean(solRes?.isStale));

      if (anaRes?.analysis) {
        setAnalysis(anaRes.analysis);
      }
    } catch (err) {
      console.error('Failed to load solution / analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Strict workspace isolation: Reset state immediately on workspace switch
    setSolution(null);
    setAnalysis(null);
    setName('');
    setSummary('');
    setBusinessValue('');
    setImplementationApproach('');
    setHandoffGate(null);
    setIsStale(false);
    setIsEditing(false);
    loadSolution();
  }, [id]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await api.generateSolution(id);
      setSolution(res.solution);
      setName(res.solution.name);
      setSummary(res.solution.summary);
      setBusinessValue(res.solution.businessValue);
      setImplementationApproach(res.solution.implementationApproach);
      setIsStale(false);
      await loadSolution();
      showToast('Solution Architecture formulated successfully!');
    } catch (err) {
      showToast(err.message || 'Formulation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = async (optionId) => {
    try {
      const res = await api.selectSolutionOption(id, optionId);
      setSolution(res.solution);
      setName(res.solution.name);
      setSummary(res.solution.summary);
      showToast(`Active strategy set to Option ${optionId}`);
    } catch (err) {
      showToast('Failed to select option', 'error');
    }
  };

  const handleSaveEdits = async () => {
    try {
      setSaving(true);
      const res = await api.updateSolution(id, {
        name,
        summary,
        businessValue,
        implementationApproach
      });
      setSolution(res.solution);
      setIsEditing(false);
      showToast('Solution edits saved.');
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await api.approveSolution(id, 'Recommended architecture validated and ready for cloud design.');
      setSolution(res.solution);
      showToast('Solution approved! Proceeding to Cloud Architecture Canvas...');
      setTimeout(() => {
        navigate(`/app/workspaces/${id}/architecture`);
      }, 1000);
    } catch (err) {
      showToast(err.message || 'Failed to approve solution', 'error');
    }
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

  function safeParseArray(data, fallback = []) {
    if (!data) return fallback;
    let res = data;
    if (typeof res === 'string') {
      try {
        res = JSON.parse(res);
      } catch {
        return fallback;
      }
    }
    if (typeof res === 'string') {
      try {
        res = JSON.parse(res);
      } catch {
        return fallback;
      }
    }
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
      for (const key of Object.keys(res)) {
        if (Array.isArray(res[key])) return res[key];
      }
    }
    return fallback;
  }

  function safeParseObject(data, fallback = {}) {
    if (!data) return fallback;
    let res = data;
    if (typeof res === 'string') {
      try {
        res = JSON.parse(res);
      } catch {
        return fallback;
      }
    }
    if (typeof res === 'string') {
      try {
        res = JSON.parse(res);
      } catch {
        return fallback;
      }
    }
    return (res && typeof res === 'object' && !Array.isArray(res)) ? res : fallback;
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--text-muted)' }}>{t.common.loading}</div>;
  }

  const upstreamReqs = safeParseArray(analysis?.requirementsData || analysis?.requirements, []);
  const upstreamValidationReqs = upstreamReqs.filter(r => {
    const status = String(r?.status || r?.validationStatus || '').toUpperCase();
    return status === 'VALIDATION_REQUIRED' || status === 'ASSUMPTION' || status === 'PROPOSED_TARGET';
  });

  const upstreamPainPoints = safeParseArray(analysis?.operationalPainPoints || analysis?.painPoints, []);
  const upstreamGoals = safeParseArray(analysis?.strategicGoals || analysis?.goals, []);
  const upstreamDocs = safeParseArray(analysis?.documents, []);
  const upstreamQuestions = safeParseArray(analysis?.openQuestions, []);
  const upstreamAssumptions = safeParseArray(analysis?.assumptions, []);
  const upstreamEvidenceRefs = safeParseArray(analysis?.evidenceReferences, []);
  const upstreamExistingSystems = safeParseArray(analysis?.existingSystems || analysis?.context?.existingSystems || analysis?.discovery?.existingSystems, []);
  const upstreamConstraints = safeParseArray(analysis?.constraints || analysis?.discovery?.discoveredConstraints, []);

  const documentedExistingSystems = [...upstreamExistingSystems];
  if (documentedExistingSystems.length === 0 && upstreamConstraints.length > 0) {
    upstreamConstraints.forEach(c => {
      const text = typeof c === 'object' && c !== null ? (c.constraint || c.text || c.title || '') : String(c);
      const match = text.match(/(?:existing|current|legacy|integrated with)\s+([A-Za-z0-9_\-\.\/\s]+?(?:SQL|Database|DB|ERP|CRM|System|Platform|v\d+))/i);
      if (match && match[1]) {
        documentedExistingSystems.push({
          name: match[1].trim(),
          systemName: match[1].trim(),
          source: 'Stage 2 Constraints'
        });
      }
    });
  }

  // Canonical normalized Stage 2 collections
  const canonicalReqs = upstreamReqs.map((r, idx) => {
    if (typeof r === 'object' && r !== null) {
      return {
        id: r.id || `REQ-${String(idx + 1).padStart(2, '0')}`,
        title: r.title || r.specification || r.text || 'Not established from available workspace evidence.',
        specification: r.specification || r.title || '',
        status: r.status || r.validationStatus || 'CONFIRMED',
        priority: r.priority || 'HIGH',
        evidence: r.sourceDocumentEvidence || r.evidenceQuote || r.evidence || null,
        businessProblemId: r.businessProblemId || r.painPointId || null,
        strategicGoalId: r.strategicGoalId || r.goalId || null
      };
    }
    return {
      id: `REQ-${String(idx + 1).padStart(2, '0')}`,
      title: String(r),
      specification: String(r),
      status: 'CONFIRMED',
      priority: 'HIGH',
      evidence: null,
      businessProblemId: null,
      strategicGoalId: null
    };
  });

  const canonicalPainPoints = upstreamPainPoints.map((p, idx) => {
    if (typeof p === 'object' && p !== null) {
      return {
        id: p.id || `PP-${String(idx + 1).padStart(2, '0')}`,
        title: p.title || p.description || 'Not established from available workspace evidence.',
        description: p.description || '',
        impact: p.impact || 'High',
        evidence: p.evidence || p.evidenceCitation || p.source || null
      };
    }
    return {
      id: `PP-${String(idx + 1).padStart(2, '0')}`,
      title: String(p),
      description: '',
      impact: 'High',
      evidence: null
    };
  });

  const canonicalGoals = upstreamGoals.map((g, idx) => {
    if (typeof g === 'object' && g !== null) {
      return {
        id: g.id || `G-${String(idx + 1).padStart(2, '0')}`,
        title: g.title || g.goal || 'Not established from available workspace evidence.',
        target: g.target || null,
        baseline: g.baseline || null,
        evidence: g.evidence || g.evidenceCitation || g.source || null
      };
    }
    return {
      id: `G-${String(idx + 1).padStart(2, '0')}`,
      title: String(g),
      target: null,
      baseline: null,
      evidence: null
    };
  });

  const canonicalQuestions = upstreamQuestions.map((q, idx) => {
    if (typeof q === 'object' && q !== null) {
      return {
        id: q.id || `Q-${String(idx + 1).padStart(2, '0')}`,
        question: q.question || q.text || 'Not established from available workspace evidence.',
        priority: q.priority || 'MEDIUM',
        status: q.status === 'RESOLVED' ? 'RESOLVED' : 'Validation Required'
      };
    }
    return {
      id: `Q-${String(idx + 1).padStart(2, '0')}`,
      question: String(q),
      priority: 'MEDIUM',
      status: 'Validation Required'
    };
  });

  const canonicalAssumptions = upstreamAssumptions.map((a, idx) => {
    if (typeof a === 'object' && a !== null) {
      return {
        id: a.id || `A-${String(idx + 1).padStart(2, '0')}`,
        assumption: a.assumption || a.title || 'Not established from available workspace evidence.',
        risk: a.riskIfIncorrect || a.risk || 'Requires validation during architecture design',
        validationStatus: a.validationStatus || 'VALIDATION REQUIRED',
        source: a.source || 'Stage 2 Discovery'
      };
    }
    return {
      id: `A-${String(idx + 1).padStart(2, '0')}`,
      assumption: String(a),
      risk: 'Requires validation during architecture design',
      validationStatus: 'VALIDATION REQUIRED',
      source: 'Stage 2 Discovery'
    };
  });

  function normalizeReferenceId(ref) {
    if (!ref) return '';
    if (typeof ref === 'object') {
      return String(ref.id || ref.key || ref.code || '').trim().toUpperCase();
    }
    return String(ref).trim().toUpperCase();
  }

  function resolveRequirement(ref) {
    if (!ref) return null;
    const isObj = typeof ref === 'object' && ref !== null;
    const rawId = isObj ? (ref.id || ref.requirementId) : ref;
    const normId = normalizeReferenceId(rawId);

    // 1. Match against canonicalReqs by ID (case-insensitive, normalized hyphen/underscore)
    const matched = canonicalReqs.find(u => {
      const uNorm = normalizeReferenceId(u.id);
      if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
        return true;
      }
      if (typeof ref === 'string' && u.title && u.title.toLowerCase() === ref.trim().toLowerCase()) {
        return true;
      }
      return false;
    });

    if (matched) {
      return {
        id: matched.id,
        title: matched.title,
        specification: matched.specification,
        status: matched.status,
        priority: matched.priority,
        evidence: matched.evidence,
        isResolved: true
      };
    }

    // 2. If ref is an object with title or specification
    if (isObj && (ref.title || ref.specification)) {
      return {
        id: ref.id || 'REQ',
        title: ref.title || ref.specification,
        specification: ref.specification || ref.title || '',
        status: ref.validationStatus || ref.status || 'CONFIRMED',
        priority: ref.priority || 'MEDIUM',
        evidence: ref.evidence || null,
        isResolved: true
      };
    }

    // 3. If ref is text that looks like a statement
    const displayId = String(rawId || ref).trim();
    if (displayId.length > 20 && !displayId.match(/^(REQ)[-_]?\d+$/i)) {
      return {
        id: null,
        title: displayId,
        specification: displayId,
        status: 'CONFIRMED',
        priority: 'MEDIUM',
        evidence: null,
        isResolved: true
      };
    }

    // 4. Fallback per specification
    return {
      id: displayId,
      title: `${displayId} — Source requirement could not be resolved from current workspace evidence.`,
      specification: '',
      status: 'VALIDATION_REQUIRED',
      priority: 'MEDIUM',
      evidence: null,
      isResolved: false
    };
  }

  function resolveProblem(ref, idx = 0) {
    if (!ref) return null;
    const isObj = typeof ref === 'object' && ref !== null;
    const rawId = isObj ? (ref.id || ref.painPointId || ref.problemId) : ref;
    const normId = normalizeReferenceId(rawId);

    const matched = canonicalPainPoints.find(u => {
      const uNorm = normalizeReferenceId(u.id);
      if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
        return true;
      }
      if (typeof ref === 'string' && (
        (u.title && u.title.toLowerCase() === ref.trim().toLowerCase()) ||
        (u.description && u.description.toLowerCase() === ref.trim().toLowerCase())
      )) {
        return true;
      }
      return false;
    });

    if (matched) {
      return {
        id: matched.id,
        title: matched.title,
        description: matched.description,
        impact: matched.impact,
        isResolved: true
      };
    }

    if (isObj && (ref.title || ref.description)) {
      return {
        id: ref.id || null,
        title: ref.title || ref.description,
        description: ref.description || '',
        impact: ref.impact || 'High',
        isResolved: true
      };
    }

    if (typeof ref === 'string') {
      const trimmed = ref.trim();
      if (trimmed.length > 5 && !trimmed.match(/^(PP|PAIN|P)[-_]?\d+$/i)) {
        return {
          id: null,
          title: trimmed,
          description: '',
          impact: 'High',
          isResolved: true
        };
      }
      const positional = canonicalPainPoints[idx];
      if (positional) {
        return {
          id: positional.id,
          title: positional.title,
          description: positional.description,
          impact: positional.impact,
          isResolved: true
        };
      }
      return {
        id: trimmed,
        title: `${trimmed} — Source business problem not resolved from current workspace evidence.`,
        description: '',
        impact: 'High',
        isResolved: false
      };
    }

    return null;
  }

  function resolveGoal(ref, idx = 0) {
    if (!ref) return null;
    const isObj = typeof ref === 'object' && ref !== null;
    const rawId = isObj ? (ref.id || ref.goalId || ref.strategicGoalId) : ref;
    const normId = normalizeReferenceId(rawId);

    const matched = canonicalGoals.find(u => {
      const uNorm = normalizeReferenceId(u.id);
      if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
        return true;
      }
      if (typeof ref === 'string' && (
        (u.title && u.title.toLowerCase() === ref.trim().toLowerCase())
      )) {
        return true;
      }
      return false;
    });

    if (matched) {
      return {
        id: matched.id,
        title: matched.title,
        target: matched.target,
        baseline: matched.baseline,
        isResolved: true
      };
    }

    if (isObj && (ref.title || ref.goal)) {
      return {
        id: ref.id || null,
        title: ref.title || ref.goal,
        target: ref.target || null,
        baseline: ref.baseline || null,
        isResolved: true
      };
    }

    if (typeof ref === 'string') {
      const trimmed = ref.trim();
      if (trimmed.length > 5 && !trimmed.match(/^(G|GOAL)[-_]?\d+$/i)) {
        return {
          id: null,
          title: trimmed,
          target: null,
          baseline: null,
          isResolved: true
        };
      }
      const positional = canonicalGoals[idx];
      if (positional) {
        return {
          id: positional.id,
          title: positional.title,
          target: positional.target,
          baseline: positional.baseline,
          isResolved: true
        };
      }
      return {
        id: trimmed,
        title: `${trimmed} — Source strategic goal not resolved from current workspace evidence.`,
        target: null,
        baseline: null,
        isResolved: false
      };
    }

    return null;
  }

  function resolveQuestion(ref, idx = 0) {
    if (!ref) return null;
    const isObj = typeof ref === 'object' && ref !== null;
    const rawId = isObj ? (ref.id || ref.questionId) : ref;
    const normId = normalizeReferenceId(rawId);

    const matched = canonicalQuestions.find(u => {
      const uNorm = normalizeReferenceId(u.id);
      if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
        return true;
      }
      if (typeof ref === 'string' && u.question && u.question.toLowerCase() === ref.trim().toLowerCase()) {
        return true;
      }
      return false;
    });

    if (matched) {
      return {
        id: matched.id,
        question: matched.question,
        priority: matched.priority,
        status: matched.status,
        isResolved: true
      };
    }

    if (isObj && (ref.question || ref.text)) {
      return {
        id: ref.id || 'Q',
        question: ref.question || ref.text,
        priority: ref.priority || 'MEDIUM',
        status: ref.status || 'Validation Required',
        isResolved: true
      };
    }

    if (typeof ref === 'string') {
      const trimmed = ref.trim();
      if (trimmed.length > 5 && !trimmed.match(/^(Q|OQ)[-_]?\d+$/i)) {
        return {
          id: null,
          question: trimmed,
          priority: 'MEDIUM',
          status: 'Validation Required',
          isResolved: true
        };
      }
      const positional = canonicalQuestions[idx];
      if (positional) {
        return {
          id: positional.id,
          question: positional.question,
          priority: positional.priority,
          status: positional.status,
          isResolved: true
        };
      }
      return {
        id: trimmed,
        question: `${trimmed} — Technical integration uncertainty pending architecture verification`,
        priority: 'HIGH',
        status: 'Validation Required',
        isResolved: false
      };
    }

    return null;
  }

  function resolveAssumption(ref, idx = 0) {
    if (!ref) return null;
    const isObj = typeof ref === 'object' && ref !== null;
    const rawId = isObj ? (ref.id || ref.assumptionId) : ref;
    const normId = normalizeReferenceId(rawId);

    const matched = canonicalAssumptions.find(u => {
      const uNorm = normalizeReferenceId(u.id);
      if (uNorm && normId && (uNorm === normId || uNorm.replace(/[-_]/g, '') === normId.replace(/[-_]/g, ''))) {
        return true;
      }
      if (typeof ref === 'string' && u.assumption && u.assumption.toLowerCase() === ref.trim().toLowerCase()) {
        return true;
      }
      return false;
    });

    if (matched) {
      return {
        id: matched.id,
        assumption: matched.assumption,
        risk: matched.risk,
        validationStatus: matched.validationStatus,
        source: matched.source,
        isResolved: true
      };
    }

    if (isObj && (ref.assumption || ref.title)) {
      return {
        id: ref.id || 'A',
        assumption: ref.assumption || ref.title,
        risk: ref.risk || 'Requires validation during architecture design',
        validationStatus: ref.validationStatus || 'VALIDATION REQUIRED',
        source: ref.source || 'Stage 2 Discovery',
        isResolved: true
      };
    }

    if (typeof ref === 'string') {
      const trimmed = ref.trim();
      if (trimmed.length > 5 && !trimmed.match(/^(A|ASM)[-_]?\d+$/i)) {
        return {
          id: null,
          assumption: trimmed,
          risk: 'Requires validation during architecture design',
          validationStatus: 'VALIDATION REQUIRED',
          source: 'Stage 2 Discovery',
          isResolved: true
        };
      }
      const positional = canonicalAssumptions[idx];
      if (positional) {
        return {
          id: positional.id,
          assumption: positional.assumption,
          risk: positional.risk,
          validationStatus: positional.validationStatus,
          source: positional.source,
          isResolved: true
        };
      }
      return {
        id: trimmed,
        assumption: `${trimmed} — Technical prerequisite assumption documented in Stage 2`,
        risk: 'Requires validation during architecture design',
        validationStatus: 'VALIDATION REQUIRED',
        source: 'Stage 2 Discovery',
        isResolved: false
      };
    }

    return null;
  }

  function resolveEvidence(ref) {
    if (!ref) return null;
    const isObj = typeof ref === 'object' && ref !== null;
    const docName = upstreamDocs[0] ? (upstreamDocs[0].name || upstreamDocs[0].filename) : null;

    if (isObj) {
      const relatedReq = ref.relatedRequirement || ref.requirementId || null;
      let matchedReq = null;
      if (relatedReq) {
        matchedReq = canonicalReqs.find(r => normalizeReferenceId(r.id) === normalizeReferenceId(relatedReq));
      }

      const rawSource = ref.source || ref.document || ref.documentName || (matchedReq && matchedReq.evidence) || docName;
      let rawExcerpt = ref.excerpt || ref.quote || ref.text || ref.finding || '';
      if (!rawExcerpt && matchedReq) {
        rawExcerpt = matchedReq.specification || matchedReq.title || '';
      }

      const finalSource = rawSource || (solution?.name ? `${solution.name} Scope` : 'Workspace Scope Definition');
      const finalExcerpt = rawExcerpt || `Documented operational evidence from ${finalSource}`;
      const finalClassification = (ref.classification || (docName ? 'DOCUMENTED FACT' : 'WORKSPACE OBJECTIVE')).replace(/_/g, ' ');

      return {
        classification: finalClassification,
        source: finalSource,
        excerpt: finalExcerpt,
        relatedRequirement: relatedReq
      };
    }

    if (typeof ref === 'string') {
      const trimmed = ref.trim();
      if (!trimmed) return null;

      // Check if matches a requirement ID
      const matchedReq = canonicalReqs.find(r => {
        const uNorm = normalizeReferenceId(r.id);
        const tNorm = normalizeReferenceId(trimmed);
        return uNorm && tNorm && uNorm === tNorm;
      });
      if (matchedReq) {
        return {
          classification: 'DOCUMENTED FACT',
          source: matchedReq.evidence || docName || 'Workspace Scope Definition',
          excerpt: matchedReq.specification || matchedReq.title,
          relatedRequirement: matchedReq.id
        };
      }

      const docMatch = upstreamDocs.find(d => 
        d && (d.name === trimmed || d.filename === trimmed || (d.name && trimmed.includes(d.name)))
      );
      if (docMatch) {
        return {
          classification: 'DOCUMENTED FACT',
          source: docMatch.name || docMatch.filename,
          excerpt: `Documented operating evidence from ${docMatch.name || docMatch.filename}`,
          relatedRequirement: null
        };
      }

      return {
        classification: docName ? 'DOCUMENTED FACT' : 'WORKSPACE OBJECTIVE',
        source: docName || (solution?.name ? `${solution.name} Scope` : 'Workspace Scope Definition'),
        excerpt: trimmed,
        relatedRequirement: null
      };
    }

    return null;
  }

  function normalizeCanonicalTechnologies(rawTechStack, reqs = [], existingSysList = []) {
    if (!rawTechStack) return [];

    let parsed = rawTechStack;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { return []; }
    }
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { return []; }
    }

    // 1. Gather raw list of candidate components
    let rawList = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.technologies)) {
        rawList = parsed.technologies;
      } else {
        // Synthesize components from layer keys if technologies array is missing
        Object.entries(parsed).forEach(([key, val]) => {
          if (key === 'technologies' || !val) return;
          const valStr = typeof val === 'string' ? val : (val.name || JSON.stringify(val));
          if (!valStr || valStr.trim().length === 0) return;
          const isExist = valStr.toLowerCase().includes('existing');
          rawList.push({
            name: valStr,
            category: key.toUpperCase(),
            classification: isExist ? 'EXISTING_SYSTEM' : 'RECOMMENDED_TECHNOLOGY',
            reason: `Supports ${key.replace('_', ' ')} capabilities`,
            requirementsSupported: [],
            compatibility: 'Standard architectural pattern compatibility',
            evidenceType: isExist ? 'DOCUMENTED_FACT' : 'RECOMMENDATION',
            evidenceSource: isExist ? 'Stage 2 Business Analysis' : 'Stage 3 Architecture Analysis',
            evidenceReference: 'Not established from available workspace evidence.',
            evidenceStatement: isExist ? `Documented existing system: ${valStr}` : `Proposed recommendation for ${key}`,
            validationStatus: isExist ? 'CONFIRMED' : (valStr.toLowerCase().includes('validation required') ? 'VALIDATION_REQUIRED' : 'PROPOSED'),
            validationQuestion: isExist ? null : (valStr.toLowerCase().includes('validation required') ? `Confirm architecture requirements for ${key.replace('_', ' ')}` : null)
          });
        });
      }
    }

    if (!Array.isArray(rawList)) return [];

    // Helper: normalize layer strictly
    function normalizeLayer(cat, name = '') {
      const catStr = String(cat || '').trim().toUpperCase();
      const nameStr = String(name || '').trim().toLowerCase();

      // Rule: API Gateway / Ingress Gateway must be BACKEND or INFRASTRUCTURE, NEVER INTEGRATIONS!
      if (nameStr.includes('api gateway') || nameStr.includes('ingress gateway')) {
        return 'BACKEND';
      }

      if (catStr === 'FRONTEND' || catStr.includes('FRONT') || catStr.includes('CLIENT') || catStr.includes('UI')) return 'FRONTEND';
      if (catStr === 'BACKEND' || catStr.includes('BACK') || catStr.includes('API') || catStr.includes('SERVICE')) return 'BACKEND';
      if (catStr === 'DATABASE' || catStr.includes('DATA') || catStr.includes('PERSIST') || catStr.includes('SQL') || catStr.includes('STORAGE')) return 'DATABASE';
      if (catStr === 'AI_SERVICES' || catStr.includes('AI') || catStr.includes('INTELLIGENCE') || catStr.includes('ML') || catStr.includes('AUTOMATION')) return 'AI_SERVICES';
      if (catStr === 'INTEGRATIONS' || catStr.includes('INTEGRAT') || catStr.includes('ADAPTER') || catStr.includes('WEBHOOK') || catStr.includes('CONNECTOR')) return 'INTEGRATIONS';
      if (catStr === 'INFRASTRUCTURE' || catStr.includes('INFRA') || catStr.includes('CLOUD') || catStr.includes('HOST')) return 'INFRASTRUCTURE';
      if (catStr === 'SECURITY' || catStr.includes('SEC') || catStr.includes('AUTH') || catStr.includes('IAM')) return 'SECURITY';

      if (nameStr.includes('portal') || nameStr.includes('web client') || nameStr.includes('app')) return 'FRONTEND';
      if (nameStr.includes('gateway') || nameStr.includes('service') || nameStr.includes('backend') || nameStr.includes('server')) return 'BACKEND';
      if (nameStr.includes('sql') || nameStr.includes('database') || nameStr.includes('db') || nameStr.includes('persistence') || nameStr.includes('postgres')) return 'DATABASE';
      if (nameStr.includes('ai') || nameStr.includes('copilot') || nameStr.includes('triage') || nameStr.includes('llm')) return 'AI_SERVICES';
      if (nameStr.includes('whatsapp') || nameStr.includes('stripe') || nameStr.includes('crm') || nameStr.includes('erp') || nameStr.includes('webhook') || nameStr.includes('adapter')) return 'INTEGRATIONS';

      return 'OTHER';
    }

    // Helper: normalize classification enum strictly
    function normalizeClassification(cls, name = '', isExistingDoc = false) {
      if (isExistingDoc) return 'EXISTING_SYSTEM';
      const c = String(cls || '').trim().toUpperCase();
      if (c === 'EXISTING_SYSTEM' || c === 'EXISTING') return 'EXISTING_SYSTEM';
      if (c === 'DOCUMENTED_FACT' || c === 'DOCUMENTED') return 'DOCUMENTED_FACT';
      if (c === 'USER_PROVIDED_FACT' || c === 'USER_PROVIDED') return 'USER_PROVIDED_FACT';
      if (c === 'VALIDATION_REQUIRED') return 'VALIDATION_REQUIRED';
      if (c === 'RECOMMENDED_TECHNOLOGY' || c === 'RECOMMENDED') return 'RECOMMENDED_TECHNOLOGY';
      if (c === 'PROPOSED') return 'RECOMMENDED_TECHNOLOGY'; // Status PROPOSED mapped to RECOMMENDED_TECHNOLOGY
      if (name && name.toLowerCase().includes('existing')) return 'EXISTING_SYSTEM';
      return 'RECOMMENDED_TECHNOLOGY';
    }

    // 2. Protect and incorporate documented existing systems
    const existingSysItems = [];
    if (Array.isArray(existingSysList) && existingSysList.length > 0) {
      existingSysList.forEach(sys => {
        const sysName = typeof sys === 'object' && sys !== null ? (sys.name || sys.systemName || sys.title) : String(sys);
        if (!sysName || sysName.trim().length === 0) return;
        const lower = sysName.toLowerCase();
        let layer = 'INTEGRATIONS';
        if (lower.includes('sql') || lower.includes('database') || lower.includes('db') || lower.includes('postgres') || lower.includes('oracle') || lower.includes('mongo') || lower.includes('base')) {
          layer = 'DATABASE';
        } else if (lower.includes('gateway') || lower.includes('api') || lower.includes('service') || lower.includes('backend')) {
          layer = 'BACKEND';
        } else if (lower.includes('portal') || lower.includes('web') || lower.includes('ui') || lower.includes('client')) {
          layer = 'FRONTEND';
        }

        existingSysItems.push({
          name: sysName,
          category: layer,
          classification: 'EXISTING_SYSTEM',
          reason: 'Retained as source system of record; requires integration connector and interface contract validation',
          requirementsSupported: reqs.slice(0, 2).map(r => r.id),
          compatibility: 'Existing system interface requires adapter gateway, connection pooling, and telemetry logging',
          evidenceType: 'DOCUMENTED_FACT',
          evidenceSource: 'Stage 2 Business Analysis',
          evidenceReference: reqs[0]?.id || 'Stage 2 Context',
          evidenceStatement: `Documented existing system of record in workspace context: ${sysName}`,
          validationStatus: 'CONFIRMED',
          validationQuestion: null
        });
      });
    }

    // Combine: ensure existing systems are included
    const combinedList = [];
    existingSysItems.forEach(esi => {
      const alreadyInRaw = rawList.some(r => {
        const rName = typeof r === 'object' ? (r.name || '') : String(r);
        return rName.toLowerCase().includes(esi.name.toLowerCase()) || esi.name.toLowerCase().includes(rName.toLowerCase());
      });
      if (!alreadyInRaw) {
        combinedList.push(esi);
      }
    });

    rawList.forEach(item => {
      if (!item || typeof item !== 'object') return;
      combinedList.push(item);
    });

    // 3. Normalize each item into canonical model
    const normalized = combinedList.map((item, idx) => {
      const name = String(item.name || `Technology Component ${idx + 1}`).trim();
      const category = normalizeLayer(item.category || item.layer, name);
      const isExistingDoc = existingSysItems.some(esi => esi.name.toLowerCase() === name.toLowerCase()) || name.toLowerCase().includes('(existing)');
      const classification = normalizeClassification(item.classification, name, isExistingDoc);

      // Validate & resolve requirement IDs strictly against canonical requirements
      const rawReqs = Array.isArray(item.requirementsSupported) ? item.requirementsSupported :
                      (typeof item.requirementsSupported === 'string' ? [item.requirementsSupported] : []);
      const validReqIds = [];
      rawReqs.forEach(rid => {
        const cleanId = String(rid).trim().toUpperCase();
        const matched = reqs.find(cr => {
          const crId = String(cr.id || '').trim().toUpperCase();
          return crId === cleanId || crId.replace(/[-_]/g, '') === cleanId.replace(/[-_]/g, '');
        });
        if (matched && !validReqIds.includes(matched.id)) {
          validReqIds.push(matched.id);
        }
      });

      // Requirement status awareness:
      let validationStatus = String(item.validationStatus || item.status || 'PROPOSED').toUpperCase();
      if (classification === 'EXISTING_SYSTEM' || classification === 'DOCUMENTED_FACT') {
        validationStatus = 'CONFIRMED';
      } else if (classification === 'VALIDATION_REQUIRED') {
        validationStatus = 'VALIDATION_REQUIRED';
      } else {
        if (validationStatus === 'CONFIRMED') {
          const allReqsConfirmed = validReqIds.length > 0 && validReqIds.every(rid => {
            const reqObj = reqs.find(cr => cr.id === rid);
            return reqObj && String(reqObj.status || reqObj.validationStatus).toUpperCase() === 'CONFIRMED';
          });
          if (!allReqsConfirmed && classification === 'RECOMMENDED_TECHNOLOGY') {
            validationStatus = 'PROPOSED';
          }
        } else if (!['CONFIRMED', 'PROPOSED', 'VALIDATION_REQUIRED', 'NOT_ESTABLISHED'].includes(validationStatus)) {
          validationStatus = 'PROPOSED';
        }
      }

      // Concrete validation questions
      let validationQuestion = item.validationQuestion || null;
      if (validationStatus === 'VALIDATION_REQUIRED' && !validationQuestion) {
        if (category === 'DATABASE') {
          validationQuestion = 'Confirm enterprise database engine choice, hosting environment, and clustering/backup SLA';
        } else if (category === 'INTEGRATIONS') {
          validationQuestion = 'Confirm external third-party API specifications, webhook endpoints, authentication tokens, and rate limits';
        } else if (category === 'BACKEND') {
          validationQuestion = 'Confirm service boundary, gateway hosting model, and rate limiting policies';
        } else if (category === 'AI_SERVICES') {
          validationQuestion = 'Validate AI provider compliance, latency budgets, and human-in-the-loop escalation guardrails';
        } else if (category === 'FRONTEND') {
          validationQuestion = 'Confirm primary client device form-factors and supported browser tiers';
        } else {
          validationQuestion = 'Confirm integration interface specification and environmental compatibility';
        }
      }

      const evidenceType = item.evidenceType || (classification === 'EXISTING_SYSTEM' ? 'DOCUMENTED_FACT' : (classification === 'USER_PROVIDED_FACT' ? 'USER_PROVIDED_FACT' : 'RECOMMENDATION'));
      const evidenceSource = item.evidenceSource || (classification === 'EXISTING_SYSTEM' ? 'Stage 2 Business Analysis' : (classification === 'USER_PROVIDED_FACT' ? 'Workspace Scope Context' : 'Stage 3 Architecture Analysis'));
      const evidenceReference = item.evidenceReference || (validReqIds.length > 0 ? validReqIds.join(', ') : 'Not established from available workspace evidence.');
      const evidenceStatement = item.evidenceStatement || item.evidence || (classification === 'EXISTING_SYSTEM' ? `Documented existing system of record: ${name}` : `Architectural recommendation for ${category}`);

      const reason = item.reason || (classification === 'EXISTING_SYSTEM' ? 'Retained as enterprise system of record' : `Supports ${category.replace('_', ' ')} architecture capabilities`);
      const compatibility = item.compatibility || (classification === 'EXISTING_SYSTEM' ? 'Direct adapter connector required' : 'Standard enterprise protocol compatibility');

      return {
        id: item.id || `TECH-${String(idx + 1).padStart(2, '0')}`,
        name,
        category,
        classification,
        reason,
        requirementsSupported: validReqIds,
        compatibility,
        evidenceType,
        evidenceSource,
        evidenceReference,
        evidenceStatement,
        evidence: evidenceStatement,
        validationStatus,
        validationQuestion
      };
    });

    // Deduplicate: If an existing system covers a layer (e.g. DATABASE), avoid rendering a duplicate generic recommendation
    const existingLayers = new Set(normalized.filter(n => n.classification === 'EXISTING_SYSTEM').map(n => n.category));
    const deduped = normalized.filter(item => {
      if (item.classification !== 'EXISTING_SYSTEM' && existingLayers.has(item.category)) {
        if (item.category === 'DATABASE' && (item.name.includes('Transactional Relational Persistence') || item.name.includes('Persistence Tier'))) {
          return false;
        }
      }
      return true;
    });

    return deduped;
  }

  const hasNoRequirements = !analysis || upstreamReqs.length === 0;

  if (!solution) {
    if (hasNoRequirements) {
      return (
        <div style={{ maxWidth: 740, margin: '24px auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: '40px 32px', textAlign: 'center', borderLeft: '4px solid #D97706' }}>
            <AlertTriangle size={44} color="#D97706" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
              Solution Builder is waiting for verified Business Analysis data.
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 20px', lineHeight: 1.5, fontSize: '0.9rem' }}>
              Architecture options and technology recommendations require verified Stage 2 business requirements. Please run Business Analysis & Diagnostics first.
            </p>
            <div style={{ maxWidth: 440, margin: '0 auto 24px', textAlign: 'left', backgroundColor: 'var(--bg-subtle)', padding: '14px 18px', borderRadius: 8, fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>Missing Prerequisites:</div>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Verified system requirements from discovery or documents</li>
                <li>Established baseline operational evidence</li>
                <li>Documented integration constraints</li>
                <li>Resolved validation blockers</li>
              </ul>
            </div>
            <button
              onClick={() => navigate(`/app/workspaces/${id}/analysis`)}
              className="btn btn-primary btn-lg"
              style={{ margin: '0 auto' }}
            >
              Proceed to Stage 2: Business Analysis <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 740, margin: '24px auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {analysis && (
          <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #10B981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={20} color="#10B981" />
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Stage 2 Business Analysis Handed Off (v{analysis.version || 1})
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {upstreamReqs.length} canonical requirements • {upstreamValidationReqs.length} requiring architecture confirmation
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-green">Handoff Received</span>
              {upstreamValidationReqs.length > 0 && <span className="badge badge-amber">{upstreamValidationReqs.length} Validation Items</span>}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <Cpu size={48} color="var(--accent-amber)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
            {t.solution.engineTitle}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            {t.solution.engineDesc}
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary btn-lg"
            style={{ margin: '0 auto' }}
          >
            <Sparkles size={18} />
            {generating ? t.solution.generatingBtn : t.solution.generateBtn}
          </button>
        </div>
      </div>
    );
  }

  // Workspace Route Matching Guard
  if (solution && solution.workspaceId && solution.workspaceId !== id) {
    return (
      <div style={{ maxWidth: 740, margin: '24px auto', padding: '40px 32px', textAlign: 'center' }} className="card">
        <AlertTriangle size={44} color="#DC2626" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
          Workspace Data Isolation Guard
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 20px', lineHeight: 1.5, fontSize: '0.9rem' }}>
          The loaded solution does not match current workspace route ID ({id}). Cross-workspace rendering has been blocked.
        </p>
        <button onClick={handleGenerate} className="btn btn-primary" style={{ margin: '0 auto' }}>
          <RefreshCw size={16} /> Generate Solution for Current Workspace
        </button>
      </div>
    );
  }

  const options = safeParseArray(solution.options, []);
  const keyCapabilities = safeParseArray(solution.keyCapabilities, []);
  const techStack = safeParseObject(solution.techStack, {});
  const canonicalTechnologies = normalizeCanonicalTechnologies(solution.techStack, canonicalReqs, documentedExistingSystems);
  const risks = safeParseArray(solution.risks, []);
  const isBlocked = Boolean(handoffGate && !handoffGate.canProceed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t.solution.title}</h1>
            {isBlocked ? (
              <span className="badge badge-red" style={{ fontWeight: 800 }}>
                CANDIDATE — PENDING VALIDATION
              </span>
            ) : (
              <span className={solution.status === 'APPROVED' ? 'badge badge-green' : 'badge badge-amber'}>
                {t.stages[solution.status?.toLowerCase()] || solution.status}
              </span>
            )}
            <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>
              {t.common.version} {solution.version}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {t.solution.engineDesc}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="btn btn-outline" disabled={saving}>
                {t.common.cancel}
              </button>
              <button onClick={handleSaveEdits} disabled={saving} className="btn btn-primary">
                <Save size={15} />
                {saving ? t.common.saving : t.solution.saveEdits}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="btn btn-secondary">
                <Edit3 size={15} /> {t.common.edit}
              </button>
              <button onClick={handleGenerate} disabled={generating} className="btn btn-secondary">
                <RefreshCw size={15} className={generating ? 'spin' : ''} /> {t.common.regenerate}
              </button>
              {solution.status !== 'APPROVED' && (
                <button
                  onClick={handleApprove}
                  disabled={isBlocked}
                  className="btn btn-primary"
                  style={{
                    backgroundColor: isBlocked ? 'var(--bg-subtle)' : 'var(--accent-green)',
                    borderColor: isBlocked ? 'var(--border-subtle)' : 'var(--accent-green)',
                    color: isBlocked ? 'var(--text-muted)' : '#ffffff',
                    cursor: isBlocked ? 'not-allowed' : 'pointer'
                  }}
                  title={isBlocked ? 'Approval blocked by unresolved validation blockers in Stage 2' : 'Approve recommended solution'}
                >
                  <CheckCircle2 size={16} /> {isBlocked ? 'Approval Blocked' : t.common.approve}
                </button>
              )}
              <button onClick={() => navigate(`/app/workspaces/${id}/architecture`)} className="btn btn-dark">
                {t.nav.architecture} <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Validation Gate Banners */}
      {isBlocked && (
        <div
          className="card"
          style={{
            padding: '16px 20px',
            borderLeft: '4px solid #DC2626',
            backgroundColor: '#FEF2F2',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldAlert size={22} color="#DC2626" />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#991B1B' }}>
                  Architecture handoff blocked by unresolved validation blockers.
                </div>
                <div style={{ fontSize: '0.82rem', color: '#B91C1C' }}>
                  Stage 2 contains {handoffGate.blockers?.length || 1} unresolved blocker(s). Architecture patterns below are candidate recommendations pending validation.
                </div>
              </div>
            </div>
            <span className="badge badge-red" style={{ fontWeight: 800 }}>PENDING VALIDATION</span>
          </div>
          {handoffGate.blockers && handoffGate.blockers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {handoffGate.blockers.map((b, idx) => (
                <div key={idx} style={{ fontSize: '0.82rem', color: '#7F1D1D', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 6 }}>
                  <strong>[{b.type}] {b.id}:</strong> {b.title} — {b.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isBlocked && handoffGate && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.85rem',
            color: '#065F46',
            fontWeight: 700
          }}
        >
          <CheckCircle2 size={16} color="#059669" />
          <span>Stage 2 validation gate passed. Requirements confirmed for architecture handoff.</span>
        </div>
      )}

      {/* Stale Analysis Warning Banner */}
      {isStale && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: '0.85rem',
            color: '#92400E'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#D97706" />
            <span>Business Analysis was updated after this solution was generated. Architecture recommendations may be based on earlier data.</span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: '#D97706', color: '#B45309' }}
          >
            <RefreshCw size={14} className={generating ? 'spin' : ''} /> Regenerate Recommendations
          </button>
        </div>
      )}

      {/* Guided Transformation Trace Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: 'var(--text-muted)'
        }}
      >
        <span style={{ color: 'var(--text-primary)' }}>{t('BUSINESS CHALLENGE')}</span>
        <span>→</span>
        <span style={{ color: 'var(--text-primary)' }}>{t.stages.analysis}</span>
        <span>→</span>
        <span style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={14} /> {t.solution.recommendedTitle}
        </span>
      </div>

      {/* Upstream Stage 2 Requirements & Architecture Validation Trace Card */}
      {analysis && upstreamReqs.length > 0 && (
        <div
          className="card"
          style={{
            padding: '18px 24px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowHandoffTrace(!showHandoffTrace)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <FileCheck size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0 }}>
                Stage 2 Handoff: Upstream Requirements & Architecture Trace
              </h3>
              <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
                v{analysis.version || 1}
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                {upstreamReqs.length} Requirements Handed Off
              </span>
              {upstreamValidationReqs.length > 0 ? (
                <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>
                  ⚡ {upstreamValidationReqs.length} Validation Required
                </span>
              ) : (
                <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                  ✓ All Confirmed
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              {showHandoffTrace ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{showHandoffTrace ? 'Hide Trace' : 'Show Trace'}</span>
            </button>
          </div>

          {showHandoffTrace && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Candidate architectures below consume the canonical Stage 2 business requirements. Items marked <code>VALIDATION REQUIRED</code> carry candidate integration patterns pending interface verification; no specific unverified protocols or APIs are assumed.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
                {upstreamReqs.map((req, idx) => {
                  const isValReq = String(req.status || req.validationStatus || '').toUpperCase() === 'VALIDATION_REQUIRED' ||
                                   String(req.classification || '').toUpperCase() === 'VALIDATION_REQUIRED' ||
                                   String(req.classification || '').toUpperCase() === 'PROPOSED_TARGET';
                  const statusLabel = isValReq ? 'VALIDATION REQUIRED' : (req.status || 'CONFIRMED');

                  const discoveryFact = req.sourceFinding || req.evidenceFact || 
                    (Array.isArray(req.evidence) && req.evidence[0]) || 
                    (typeof req.evidence === 'string' ? req.evidence : null) || 
                    (analysis?.currentState ? analysis.currentState.slice(0, 140) : null) || 
                    'Not established from available workspace evidence.';

                  const evidenceCitation = req.sourceDocumentEvidence || req.evidenceQuote || 
                    (Array.isArray(req.evidence) && req.evidence.length > 1 ? req.evidence[1] : null) || 
                    (typeof req.evidence === 'string' ? req.evidence : null) || 
                    (upstreamDocs.length > 0 && upstreamDocs[0] ? `Document: ${upstreamDocs[0].name || upstreamDocs[0].filename}` : null) || 
                    'Not established from available workspace evidence.';

                  const matchedProblem = upstreamPainPoints.find(p => p && (p.id === req.businessProblemId || p.id === req.painPointId)) ||
                    upstreamPainPoints[idx];
                  const businessProblem = req.businessProblem || (matchedProblem ? `${matchedProblem.title || matchedProblem.description || ''}` : null) || 
                    'Not established from available workspace evidence.';

                  const matchedGoal = upstreamGoals.find(g => g && (g.id === req.strategicGoalId || g.id === req.goalId)) ||
                    upstreamGoals[idx];
                  const strategicGoal = req.strategicGoal || (matchedGoal ? `${matchedGoal.title || matchedGoal.goal || ''}` : null) || 
                    'Not established from available workspace evidence.';

                  const requirementText = req.specification || req.title || req.text || 'Not established from available workspace evidence.';
                  const architectureImpact = req.downstreamArchitectureImpact || (isValReq
                    ? 'Candidate integration pattern requires confirmation of available external system APIs / protocols.'
                    : 'Informs Stage 3 pattern selection, security boundaries, and non-functional requirements.');

                  return (
                    <div
                      key={req.id || idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        backgroundColor: isValReq ? '#FFFBEB' : 'var(--bg-subtle)',
                        border: isValReq ? '1px solid #FDE68A' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {req.id ? (
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: isValReq ? '#B45309' : 'var(--accent-amber)' }}>
                              {req.id}
                            </span>
                          ) : (
                            <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{req.type || 'REQ'}</span>
                          )}
                          <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            {req.title || req.specification || req.text}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={req.priority === 'CRITICAL' ? 'badge badge-red' : 'badge badge-gray'} style={{ fontSize: '0.72rem' }}>
                            {req.priority || 'HIGH'}
                          </span>
                          <span className={isValReq ? 'badge badge-amber' : 'badge badge-green'} style={{ fontSize: '0.72rem' }}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      {/* 6-Step Requirement Lineage Inspection Flow */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                          gap: 8,
                          backgroundColor: 'var(--bg-surface)',
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.76rem'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>1. Discovery Fact</div>
                          <div style={{ color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.3 }}>{discoveryFact}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>2. Evidence Citation</div>
                          <div style={{ color: 'var(--text-secondary)', marginTop: 2, fontStyle: 'italic', lineHeight: 1.3 }}>"{evidenceCitation}"</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>3. Business Problem</div>
                          <div style={{ color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.3 }}>{businessProblem}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>4. Strategic Goal</div>
                          <div style={{ color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.3 }}>{strategicGoal}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>5. Requirement</div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2, lineHeight: 1.3 }}>
                            {req.id ? `[${req.id}] ` : ''}{requirementText}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: isValReq ? '#B45309' : '#2563EB', textTransform: 'uppercase' }}>6. Architecture Impact</div>
                          <div style={{ color: isValReq ? '#92400E' : 'var(--text-primary)', marginTop: 2, lineHeight: 1.3 }}>{architectureImpact}</div>
                        </div>
                      </div>

                      {isValReq && (
                        <div style={{ fontSize: '0.76rem', color: '#B45309', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} color="#D97706" />
                          <span>Technical uncertainty preserved: candidate pattern requires confirmation of external interfaces without assuming unverified protocols.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommended Solution Executive Summary Card */}
      <div
        className="card"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '5px solid var(--accent-amber)',
          padding: '24px 28px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.solution.recommendedTitle} ({solution.selectedOption})
            </div>

            {isEditing ? (
              <input
                type="text"
                className="form-input"
                style={{ fontSize: '1.4rem', fontWeight: 800, margin: '8px 0' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : (
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 10px' }}>
                {name}
              </h2>
            )}

            {isEditing ? (
              <textarea
                rows={3}
                className="form-textarea"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            ) : (
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {summary}
              </p>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              padding: '16px 20px',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              maxWidth: 380,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t.solution.businessValue}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {String(businessValue).toLowerCase().includes('baseline not established') ? (
                  <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>
                    Baseline Not Established
                  </span>
                ) : (
                  <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                    Baseline Sourced
                  </span>
                )}
                <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                  Target: Validation Required
                </span>
              </div>
            </div>
            {isEditing ? (
              <textarea
                rows={3}
                className="form-textarea"
                style={{ marginTop: 2 }}
                value={businessValue}
                onChange={(e) => setBusinessValue(e.target.value)}
              />
            ) : (
              <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 600 }}>
                {businessValue}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Solution Comparison Matrix (Option A, Option B, Option C) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="var(--accent-amber)" />
            {t.solution.scorecard}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {lang === 'hi' ? 'सक्रिय आर्किटेक्चरल ब्लूप्रिंट के रूप में सेट करने के लिए एक विकल्प चुनें' : lang === 'gu' ? 'સક્રિય આર્કિટેક્ચરલ બ્લુપ્રિન્ટ તરીકે સેટ કરવા માટે એક વિકલ્પ પસંદ કરો' : 'Select one option to set as the active architectural blueprint'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          {options.map((opt) => {
            const isSelected = solution.selectedOption === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className="card"
                style={{
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--accent-amber)' : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--accent-amber-light)' : 'var(--bg-surface)',
                  boxShadow: isSelected ? '0 4px 12px rgba(217, 119, 6, 0.12)' : 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className={isSelected ? 'badge badge-amber' : 'badge badge-gray'}>
                      {opt.id.replace('_', ' ')}
                    </span>
                    {isSelected && (
                      <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={12} /> {lang === 'hi' ? 'चयनित रणनीति' : lang === 'gu' ? 'પસંદ કરેલ વ્યૂહરચના' : 'SELECTED STRATEGY'}
                      </span>
                    )}
                  </div>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {opt.name}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    {opt.tagline}
                  </p>

                  {/* Comparative Metrics Table */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{lang === 'hi' ? 'जटिलता:' : lang === 'gu' ? 'જટિલતા:' : 'Complexity:'}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{opt.complexity}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{lang === 'hi' ? 'अनुमानित प्रयास:' : lang === 'gu' ? 'અંદાજિત પ્રયાસ:' : 'Estimated Effort:'}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{opt.estimatedEffort}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{lang === 'hi' ? 'अनुमानित बजट:' : lang === 'gu' ? 'અંદાજિત બજેટ:' : 'Estimated Budget:'}</span>
                      <strong style={{ color: 'var(--accent-amber-text)' }}>{opt.estimatedCost}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{lang === 'hi' ? 'व्यावसायिक प्रभाव:' : lang === 'gu' ? 'વ્યાપારિક પ્રભાવ:' : 'Business Impact:'}</span>
                      <strong style={{ color: 'var(--accent-green-text)' }}>{opt.businessImpact}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{lang === 'hi' ? 'कार्यान्वयन जोखिम:' : lang === 'gu' ? 'અમલીકરણ જોખમ:' : 'Implementation Risk:'}</span>
                      <strong>{opt.implementationRisk}</strong>
                    </div>
                  </div>

                  {/* Decision Factors Scorecard */}
                  {opt.decisionFactors && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.74rem', padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, marginBottom: 12 }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Reqs Covered:</span> <strong>{opt.decisionFactors.requirementsCovered}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Problems:</span> <strong>{opt.decisionFactors.businessProblemsAddressed}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Goals:</span> <strong>{opt.decisionFactors.strategicGoalsSupported}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Constraints:</span> <strong>{opt.decisionFactors.knownConstraintsSatisfied}</strong></div>
                    </div>
                  )}

                  {/* Recommendation Rationale (if selected or recommended) */}
                  {solution.recommendationRationale && (isSelected || opt.validationStatus === 'RECOMMENDED') && (
                    <div style={{ marginBottom: 12, padding: '8px 10px', borderRadius: 6, backgroundColor: 'rgba(217, 119, 6, 0.08)', border: '1px solid rgba(217, 119, 6, 0.2)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--accent-amber-text)' }}>Recommendation Evaluation:</strong>{' '}
                      <div style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{solution.recommendationRationale}</div>
                    </div>
                  )}

                  {/* Trade-offs & Validation Requirements */}
                  {opt.tradeoffs && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      <strong>Trade-off:</strong> {opt.tradeoffs}
                    </div>
                  )}
                  {opt.validationRequirements && (
                    <div style={{ fontSize: '0.76rem', color: '#B45309', marginBottom: 8 }}>
                      <strong>Validation:</strong> {opt.validationRequirements}
                    </div>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOption(opt.id);
                    }}
                    className={isSelected ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                  >
                    {isSelected
                      ? (lang === 'hi' ? 'सक्रिय चयन' : lang === 'gu' ? 'સક્રિય પસંદગી' : 'Active Selection')
                      : (lang === 'hi' ? 'इस रणनीति को चुनें' : lang === 'gu' ? 'આ વ્યૂહરચના પસંદ કરો' : 'Select This Strategy')}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedOptionId(expandedOptionId === opt.id ? null : opt.id);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 6, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {expandedOptionId === opt.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span>{expandedOptionId === opt.id ? 'Hide Traceability & Rationale' : 'Why this option? (Traceability & Rationale)'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Option Deep Dive: Traceability, Decision Rationale & Differentiation */}
        {(() => {
          const activeOpt = (Array.isArray(options) ? options : []).find(o => o && o.id === expandedOptionId) ||
                            (Array.isArray(options) ? options : []).find(o => o && o.id === solution.selectedOption) ||
                            (Array.isArray(options) && options.length > 0 ? options[0] : null);
          if (!activeOpt) return null;

          const why = activeOpt.whyThisOption || {};
          const rationale = activeOpt.decisionRationale || {};
          const reqsAddressed = Array.isArray(why.requirementsAddressed) ? why.requirementsAddressed : [];
          const problemsAddressed = Array.isArray(why.businessProblemsAddressed) ? why.businessProblemsAddressed : [];
          const goalsSupported = Array.isArray(why.strategicGoalsSupported) ? why.strategicGoalsSupported : [];
          const autoOpps = Array.isArray(why.automationOpportunitiesAddressed) ? why.automationOpportunitiesAddressed : [];
          const constraints = Array.isArray(why.constraintsConsidered) ? why.constraintsConsidered : [];
          const questions = Array.isArray(why.openQuestions) ? why.openQuestions : [];
          const optAssumptions = Array.isArray(why.assumptions) ? why.assumptions : [];
          const evidenceList = Array.isArray(why.evidence) ? why.evidence : [];

          // Authoritative resolution against CURRENT workspace canonical data
          const rawReqRefs = reqsAddressed.length > 0
            ? reqsAddressed
            : (Array.isArray(activeOpt.requirementsAddressed) && activeOpt.requirementsAddressed.length > 0
                ? activeOpt.requirementsAddressed
                : (Array.isArray(activeOpt.requirementIds) && activeOpt.requirementIds.length > 0
                    ? activeOpt.requirementIds
                    : canonicalReqs.map(r => r.id)));
          const resolvedReqs = rawReqRefs.map(r => resolveRequirement(r)).filter(Boolean);

          const rawProblemRefs = problemsAddressed.length > 0
            ? problemsAddressed
            : (Array.isArray(activeOpt.businessProblemsAddressed) && activeOpt.businessProblemsAddressed.length > 0
                ? activeOpt.businessProblemsAddressed
                : (Array.isArray(activeOpt.painPointIds) && activeOpt.painPointIds.length > 0
                    ? activeOpt.painPointIds
                    : canonicalPainPoints));
          const resolvedProblems = rawProblemRefs.map((p, idx) => resolveProblem(p, idx)).filter(Boolean);

          const rawGoalRefs = goalsSupported.length > 0
            ? goalsSupported
            : (Array.isArray(activeOpt.strategicGoalsSupported) && activeOpt.strategicGoalsSupported.length > 0
                ? activeOpt.strategicGoalsSupported
                : (Array.isArray(activeOpt.goalIds) && activeOpt.goalIds.length > 0
                    ? activeOpt.goalIds
                    : canonicalGoals));
          const resolvedGoals = rawGoalRefs.map((g, idx) => resolveGoal(g, idx)).filter(Boolean);

          const rawQuestionRefs = questions.length > 0
            ? questions
            : (Array.isArray(activeOpt.openQuestions) && activeOpt.openQuestions.length > 0
                ? activeOpt.openQuestions
                : (Array.isArray(activeOpt.questionIds) && activeOpt.questionIds.length > 0
                    ? activeOpt.questionIds
                    : canonicalQuestions));
          const resolvedQuestions = rawQuestionRefs.map((q, idx) => resolveQuestion(q, idx)).filter(Boolean);

          const rawAssumptionRefs = optAssumptions.length > 0
            ? optAssumptions
            : (Array.isArray(activeOpt.assumptions) && activeOpt.assumptions.length > 0
                ? activeOpt.assumptions
                : (Array.isArray(activeOpt.assumptionIds) && activeOpt.assumptionIds.length > 0
                    ? activeOpt.assumptionIds
                    : canonicalAssumptions));
          const resolvedAssumptions = rawAssumptionRefs.map((a, idx) => resolveAssumption(a, idx)).filter(Boolean);

          const rawEvidenceRefs = evidenceList.length > 0
            ? evidenceList
            : (Array.isArray(activeOpt.evidence) && activeOpt.evidence.length > 0
                ? activeOpt.evidence
                : (Array.isArray(activeOpt.evidenceIds) && activeOpt.evidenceIds.length > 0
                    ? activeOpt.evidenceIds
                    : canonicalReqs.filter(r => r.evidence).map(r => ({
                        source: r.evidence,
                        excerpt: r.specification || r.title,
                        relatedRequirement: r.id,
                        classification: 'DOCUMENTED FACT'
                      }))));
          const resolvedEvidence = rawEvidenceRefs.map(ev => resolveEvidence(ev)).filter(Boolean);
          let finalResolvedEvidence = resolvedEvidence;
          if (finalResolvedEvidence.length === 0 && upstreamDocs.length > 0) {
            finalResolvedEvidence = upstreamDocs.map(d => ({
              classification: 'DOCUMENTED FACT',
              source: d.name || d.filename || 'Workspace Document',
              excerpt: `Verified upstream source documentation for ${d.name || d.filename}`,
              relatedRequirement: null
            }));
          }

          return (
            <div
              className="card"
              style={{
                marginTop: 16,
                padding: '24px 28px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderLeft: '5px solid var(--accent-amber)',
                display: 'flex',
                flexDirection: 'column',
                gap: 18
              }}
            >
              {/* Deep Dive Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span className="badge badge-amber" style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                    {activeOpt.id.replace('_', ' ')} DEEP DIVE
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {activeOpt.name}
                  </h3>
                  <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
                    Strategy: {activeOpt.strategy || 'Not established'}
                  </span>
                  <span className={activeOpt.validationStatus === 'RECOMMENDED' ? 'badge badge-green' : 'badge badge-amber'} style={{ fontSize: '0.75rem' }}>
                    {activeOpt.validationStatus || 'PROPOSED'}
                  </span>
                </div>
                {expandedOptionId && (
                  <button
                    type="button"
                    onClick={() => setExpandedOptionId(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    Close Deep Dive
                  </button>
                )}
              </div>

              {/* Decision Rationale */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-amber-text)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Compass size={16} /> Dynamic Decision Rationale
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, fontSize: '0.84rem' }}>
                  {rationale.whyGenerated && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Why Generated:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{rationale.whyGenerated}</span>
                    </div>
                  )}
                  {rationale.whyFitsBusiness && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Why Fits Business:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{rationale.whyFitsBusiness}</span>
                    </div>
                  )}
                  {rationale.requirementsCovered && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Requirements Covered:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{rationale.requirementsCovered}</span>
                    </div>
                  )}
                  {rationale.tradeoffIntroduced && (
                    <div>
                      <strong style={{ color: '#DC2626' }}>Trade-off Introduced:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{rationale.tradeoffIntroduced}</span>
                    </div>
                  )}
                  {rationale.supportingEvidence && (
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Supporting Evidence:</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{rationale.supportingEvidence}</span>
                    </div>
                  )}
                  {rationale.unvalidatedItems && (
                    <div>
                      <strong style={{ color: '#D97706' }}>Unvalidated Items:</strong>{' '}
                      <span style={{ color: '#92400E' }}>{rationale.unvalidatedItems}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Strategic Differentiation & Architecture Details */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={16} color="var(--accent-amber)" /> Strategic & Architectural Differentiation
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, fontSize: '0.82rem' }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Architecture Direction</div>
                    <div style={{ fontWeight: 600, color: activeOpt.architectureDirection ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4, fontStyle: activeOpt.architectureDirection ? 'normal' : 'italic' }}>{activeOpt.architectureDirection || 'Not established from available workspace evidence.'}</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Automation Level</div>
                    <div style={{ fontWeight: 600, color: activeOpt.automationLevel ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4, fontStyle: activeOpt.automationLevel ? 'normal' : 'italic' }}>{activeOpt.automationLevel || 'Not established from available workspace evidence.'}</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Scope & Involvement</div>
                    <div style={{ fontWeight: 600, color: activeOpt.aiInvolvement ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4, fontStyle: activeOpt.aiInvolvement ? 'normal' : 'italic' }}>{activeOpt.aiInvolvement || 'Not established from available workspace evidence.'}</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Integration Approach</div>
                    <div style={{ fontWeight: 600, color: activeOpt.integrationApproach ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4, fontStyle: activeOpt.integrationApproach ? 'normal' : 'italic' }}>{activeOpt.integrationApproach || 'Not established from available workspace evidence.'}</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Migration Approach</div>
                    <div style={{ fontWeight: 600, color: activeOpt.migrationApproach ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4, fontStyle: activeOpt.migrationApproach ? 'normal' : 'italic' }}>{activeOpt.migrationApproach || 'Not established from available workspace evidence.'}</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Best-Fit Conditions</div>
                    <div style={{ fontWeight: 600, color: activeOpt.bestFitConditions ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4, fontStyle: activeOpt.bestFitConditions ? 'normal' : 'italic' }}>{activeOpt.bestFitConditions || 'Not established from available workspace evidence.'}</div>
                  </div>
                </div>
              </div>

              {/* Why This Option? Traceability Matrix */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileCheck size={16} color="var(--accent-amber)" /> Why this option? Traceability Matrix
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 14 }}>
                  {/* Requirements Addressed */}
                  <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Requirements Addressed ({resolvedReqs.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                      {resolvedReqs.map((r, i) => {
                        const spec = r.specification || r.title || '';
                        const displayLabel = r.isResolved
                          ? (r.id && spec && !spec.toUpperCase().startsWith(r.id.toUpperCase()) ? `${r.id} — ${spec}` : (spec || r.id))
                          : (r.title || `${r.id} — Source requirement could not be resolved from current workspace evidence.`);
                        return (
                          <div key={i} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 8px', backgroundColor: 'var(--bg-surface)', borderRadius: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, overflow: 'hidden' }}>
                              <span style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                {displayLabel}
                              </span>
                            </div>
                            {r.status && (
                              <span className={String(r.status).includes('VAL') ? 'badge badge-amber' : 'badge badge-green'} style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                                {r.status}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {resolvedReqs.length === 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 4px' }}>
                          No verified requirements are linked to this option.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Business Problems Solved */}
                  <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Business Problems Addressed ({resolvedProblems.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                      {resolvedProblems.map((p, i) => (
                        <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', padding: '6px 8px', backgroundColor: 'var(--bg-surface)', borderRadius: 4, lineHeight: 1.4 }}>
                          {p.id && <strong style={{ color: '#B45309', marginRight: 4 }}>[{p.id}]</strong>}
                          <span>{p.title || p.description}</span>
                        </div>
                      ))}
                      {resolvedProblems.length === 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 4px' }}>
                          No verified business problem linked to this option.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Strategic Goals Supported */}
                  <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Strategic Goals Supported ({resolvedGoals.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                      {resolvedGoals.map((g, i) => (
                        <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-primary)', padding: '6px 8px', backgroundColor: 'var(--bg-surface)', borderRadius: 4, lineHeight: 1.4 }}>
                          {g.id && <strong style={{ color: '#059669', marginRight: 4 }}>[{g.id}]</strong>}
                          <span>{g.title}</span>
                          {g.target && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>Target: {g.target}</div>}
                          {g.baseline && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 1 }}>Baseline: {g.baseline}</div>}
                        </div>
                      ))}
                      {resolvedGoals.length === 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 4px' }}>
                          No verified strategic goal linked to this option.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open Questions & Assumptions */}
                  <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Technical Uncertainty & Open Questions ({resolvedQuestions.length + resolvedAssumptions.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                      {resolvedQuestions.map((q, i) => (
                        <div key={`q-${i}`} style={{ fontSize: '0.76rem', color: '#92400E', padding: '6px 8px', backgroundColor: '#FFFBEB', borderRadius: 4, borderLeft: '3px solid #D97706' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700 }}>{q.id || `Q-${String(i + 1).padStart(2, '0')}`}</span>
                            <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                              Status: {q.status || 'Validation Required'}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{q.question}</div>
                        </div>
                      ))}
                      {resolvedAssumptions.map((a, i) => (
                        <div key={`a-${i}`} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', padding: '6px 8px', backgroundColor: 'var(--bg-surface)', borderRadius: 4, borderLeft: '3px solid var(--accent-amber)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.id || `A-${String(i + 1).padStart(2, '0')}`}</span>
                            <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>
                              {a.validationStatus || 'Validation Required'}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{a.assumption}</div>
                          {a.source && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              Source: {a.source}
                            </div>
                          )}
                        </div>
                      ))}
                      {resolvedQuestions.length === 0 && resolvedAssumptions.length === 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 4px' }}>
                          No open question or assumption linked to this option.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grounded Evidence Provenance */}
                <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 8, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Grounded Evidence Provenance ({finalResolvedEvidence.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {finalResolvedEvidence.map((ev, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '6px 8px', backgroundColor: 'var(--bg-surface)', borderRadius: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span className="badge badge-gray" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                            {ev.classification || 'GROUNDED FACT'}
                          </span>
                          {ev.source && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Source: <strong style={{ color: 'var(--text-primary)' }}>{ev.source}</strong>
                            </span>
                          )}
                          {ev.relatedRequirement && (
                            <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                              Related: {ev.relatedRequirement}
                            </span>
                          )}
                        </div>
                        {ev.excerpt ? (
                          <div style={{ color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                            "{ev.excerpt}"
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Evidence source not established from current workspace data.
                          </div>
                        )}
                      </div>
                    ))}
                    {finalResolvedEvidence.length === 0 && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                        Evidence source not established from current workspace data.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Classified Technology Stack */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Classified Technology Stack & Grounded Recommendations
            </h3>
          </div>
          <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>
            {canonicalTechnologies.length} {canonicalTechnologies.length === 1 ? 'Classified Component' : 'Classified Components'}
          </span>
        </div>

        {/* Informational Guidance */}
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, padding: '8px 12px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={15} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
          <span>Classification describes the evidence status of each technology. Recommendations are advisory and require validation before implementation.</span>
        </div>

        {canonicalTechnologies.length > 0 ? (
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Architecture Layer</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Technology / Component</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Classification</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Architectural Reason</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Requirements</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Compatibility & Evidence</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Validation / Open Question</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {canonicalTechnologies.map((tech, idx) => {
                  const classBadge = tech.classification === 'EXISTING_SYSTEM' ? 'badge badge-blue' :
                                     (tech.classification === 'DOCUMENTED_FACT' || tech.classification === 'USER_PROVIDED_FACT') ? 'badge badge-green' :
                                     tech.classification === 'RECOMMENDED_TECHNOLOGY' ? 'badge badge-amber' :
                                     tech.classification === 'VALIDATION_REQUIRED' ? 'badge badge-amber' : 'badge badge-gray';
                  const statusBadge = tech.validationStatus === 'CONFIRMED' ? 'badge badge-green' :
                                      tech.validationStatus === 'VALIDATION_REQUIRED' ? 'badge badge-amber' :
                                      tech.validationStatus === 'PROPOSED' ? 'badge badge-amber' : 'badge badge-gray';

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-amber-text, #B45309)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {tech.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '10px', verticalAlign: 'top', minWidth: 160 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {tech.name}
                        </div>
                      </td>
                      <td style={{ padding: '10px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span className={classBadge} style={{ fontSize: '0.7rem' }}>
                          {tech.classification}
                        </span>
                      </td>
                      <td style={{ padding: '10px', verticalAlign: 'top', color: 'var(--text-secondary)', maxWidth: 200 }}>
                        {tech.reason}
                      </td>
                      <td style={{ padding: '10px', verticalAlign: 'top', minWidth: 110 }}>
                        {tech.requirementsSupported && tech.requirementsSupported.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {tech.requirementsSupported.map((rid, ri) => (
                              <span key={ri} style={{ fontFamily: 'monospace', fontSize: '0.72rem', padding: '2px 4px', backgroundColor: 'var(--bg-subtle)', borderRadius: 4, fontWeight: 700 }}>
                                {rid}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Not established from available workspace evidence.
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', verticalAlign: 'top', fontSize: '0.78rem', maxWidth: 220 }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tech.compatibility}</div>
                        {tech.evidenceStatement && (
                          <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.74rem', lineHeight: 1.35 }}>
                            <strong>Evidence:</strong> {tech.evidenceStatement}
                          </div>
                        )}
                        {tech.evidenceReference && tech.evidenceReference !== 'Not established from available workspace evidence.' && (
                          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2, fontSize: '0.72rem' }}>
                            Ref: {tech.evidenceReference}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', verticalAlign: 'top', fontSize: '0.78rem', maxWidth: 190 }}>
                        {tech.validationStatus === 'VALIDATION_REQUIRED' ? (
                          <div style={{ color: '#B45309', fontSize: '0.76rem', lineHeight: 1.35 }}>
                            <strong>Required:</strong> {tech.validationQuestion || 'Confirm interface specification and compliance'}
                          </div>
                        ) : tech.validationStatus === 'CONFIRMED' ? (
                          <div style={{ color: '#059669', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={12} /> Confirmed by workspace evidence
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontStyle: 'italic' }}>
                            {tech.validationQuestion || 'Architecture pattern proposed for validation'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <span className={statusBadge} style={{ fontSize: '0.7rem' }}>
                          {tech.validationStatus || 'PROPOSED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 6px 0', fontStyle: 'italic' }}>
              No technology recommendation has been established from the available workspace evidence.
            </p>
            <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
              Additional architecture validation is required.
            </span>
          </div>
        )}
      </div>

      {/* Capabilities & Technology Stack Grid */}
      <div className="grid-responsive-2col" style={{ gap: 20 }}>
        {/* Core Capabilities */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{lang === 'hi' ? 'मुख्य क्षमताएं' : lang === 'gu' ? 'મુખ્ય ક્ષમતાઓ' : 'Key Capabilities'}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keyCapabilities.map((cap, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Check size={14} color="#059669" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Technology Stack */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Server size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{lang === 'hi' ? 'अनुशंसित तकनीकी स्टैक' : lang === 'gu' ? 'ભલામણ કરેલ ટેકનોલોજી સ્ટેક' : 'Recommended Technology Stack'}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
            {canonicalTechnologies.map((tech, idx) => {
              const cardStatusBadge = tech.classification === 'EXISTING_SYSTEM' ? 'badge badge-blue' :
                                      tech.validationStatus === 'CONFIRMED' ? 'badge badge-green' : 'badge badge-amber';
              const cardStatusLabel = tech.classification === 'EXISTING_SYSTEM' ? 'EXISTING SYSTEM' : tech.validationStatus;

              return (
                <div key={idx} style={{ padding: '10px 14px', borderRadius: 6, backgroundColor: 'var(--bg-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {tech.category.replace('_', ' ')}
                    </span>
                    <span className={cardStatusBadge} style={{ fontSize: '0.65rem' }}>
                      {cardStatusLabel}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {tech.name}
                  </div>
                  {tech.reason && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {tech.reason}
                    </div>
                  )}
                </div>
              );
            })}
            {canonicalTechnologies.length === 0 && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                No technology recommendation has been established from the available workspace evidence.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Implementation Approach & Risk Matrix */}
      <div className="grid-responsive-2col" style={{ gap: 20 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <GitPullRequest size={18} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.solution.approach}</h3>
          </div>
          {isEditing ? (
            <textarea
              rows={4}
              className="form-textarea"
              value={implementationApproach}
              onChange={(e) => setImplementationApproach(e.target.value)}
            />
          ) : (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {implementationApproach}
            </p>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldAlert size={18} color="#DC2626" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t.solution.risks}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {risks.map((r, idx) => (
              <div key={idx} style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--bg-subtle)', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, color: '#991B1B' }}>⚠️ {lang === 'hi' ? 'जोखिम:' : lang === 'gu' ? 'જોખમ:' : 'Risk:'} {r.risk}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                  <strong>{lang === 'hi' ? 'शमन:' : lang === 'gu' ? 'નિવારણ:' : 'Mitigation:'}</strong> {r.mitigation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

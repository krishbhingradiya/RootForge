import { prisma } from '../prisma.js';
import { HttpError } from './authorization.service.js';

/**
 * Safely parse JSON strings with a default fallback
 */
function safeJsonParse(data, fallback = null) {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
}

/**
 * Helper to classify the business purpose / role of a document from its filename
 */
export function inferDocPurpose(filename = '') {
  const f = (filename || '').toLowerCase();
  if (f.includes('sop') || f.includes('procedure') || f.includes('standard_operating')) {
    return 'STANDARD_OPERATING_PROCEDURE';
  }
  if (f.includes('brd') || f.includes('requirement') || f.includes('business_requirement')) {
    return 'BUSINESS_REQUIREMENTS';
  }
  if (f.includes('arch') || f.includes('brief') || f.includes('technical') || f.includes('spec')) {
    return 'ARCHITECTURE_BRIEF';
  }
  return 'SUPPORTING_SPECIFICATION';
}

/**
 * Splits document text into manageable semantic chunks (~1200 chars) with section/page tracking
 */
export function chunkDocument(doc, targetChunkSize = 1200, overlap = 150) {
  const rawText = (doc.extractedText || '').trim();
  if (!rawText) return [];

  const filename = doc.originalName || doc.filename || 'Document';
  const purpose = inferDocPurpose(filename);
  const chunks = [];

  // Look for section headers (e.g., # Header, Section 1: ..., Slide 1: ..., 1.1 Header)
  const lines = rawText.split('\n');
  let currentSection = 'General Overview';
  let buffer = '';
  let startOffset = 0;
  let charCounter = 0;

  const sectionRegex = /^(?:#+\s*|Section\s+[0-9A-Za-z]+[:\s]*|Slide\s+\d+[:\s]*|[0-9]+\.[0-9]*\s+[A-Z]|[A-Z\s]{4,}:|[IVXLCDM]+\.\s+)(.+)$/i;
  const pageRegex = /(?:Page\s+(\d+)|Slide\s+(\d+))/i;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    const trimmedLine = line.trim();

    // Check if line indicates a new section
    const secMatch = trimmedLine.match(sectionRegex);
    if (secMatch && trimmedLine.length < 90) {
      currentSection = secMatch[1].trim() || trimmedLine;
    }

    // Check page match
    const pageMatch = trimmedLine.match(pageRegex);
    let explicitPage = null;
    if (pageMatch) {
      explicitPage = parseInt(pageMatch[1] || pageMatch[2], 10);
    }

    buffer += line + '\n';
    charCounter += line.length + 1;

    if (buffer.length >= targetChunkSize || l === lines.length - 1) {
      if (buffer.trim()) {
        const estPage = explicitPage || Math.floor(startOffset / 2200) + 1;
        chunks.push({
          chunkId: `${doc.id || 'doc'}_chk_${chunks.length + 1}`,
          documentId: doc.id,
          workspaceId: doc.workspaceId || null,
          documentName: filename,
          filename,
          fileType: doc.fileType || 'UNKNOWN',
          sourceType: 'DOCUMENT',
          purpose,
          section: currentSection,
          pageNumber: explicitPage ? explicitPage : (chunks.length + 1),
          isPageEstimated: !explicitPage,
          text: buffer.trim(),
          length: buffer.trim().length
        });
      }
      // Keep overlap from end of buffer if not last line
      if (l < lines.length - 1 && overlap > 0) {
        buffer = buffer.slice(-overlap);
        startOffset = charCounter - buffer.length;
      } else {
        buffer = '';
        startOffset = charCounter;
      }
    }
  }

  return chunks;
}

/**
 * Ranks and selects the most relevant document chunks based on a query or focus topic
 */
export function retrieveRelevantChunks(allChunks = [], queryOrFocus = '', maxQuota = 15000) {
  if (!allChunks || allChunks.length === 0) return [];
  if (allChunks.length === 1) return allChunks;

  const normalizedQuery = (queryOrFocus || '').toLowerCase().trim();
  const queryTokens = normalizedQuery
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  // If no query, return balanced round-robin chunks across documents
  if (queryTokens.length === 0) {
    const docMap = new Map();
    for (const chk of allChunks) {
      if (!docMap.has(chk.documentId)) docMap.set(chk.documentId, []);
      docMap.get(chk.documentId).push(chk);
    }

    const selected = [];
    let currentLength = 0;
    let round = 0;
    let addedAny = true;

    while (addedAny && currentLength < maxQuota) {
      addedAny = false;
      for (const [docId, chunks] of docMap.entries()) {
        if (round < chunks.length) {
          const chk = chunks[round];
          if (currentLength + chk.text.length <= maxQuota + 500) {
            selected.push(chk);
            currentLength += chk.text.length;
            addedAny = true;
          }
        }
      }
      round++;
    }
    return selected.length > 0 ? selected : allChunks.slice(0, 5);
  }

  // Score each chunk
  const scoredChunks = allChunks.map(chunk => {
    let score = 0;
    const lowerText = chunk.text.toLowerCase();
    const lowerSec = (chunk.section || '').toLowerCase();
    const lowerFile = (chunk.filename || '').toLowerCase();

    // Exact phrase match
    if (lowerText.includes(normalizedQuery)) score += 20;
    if (lowerSec.includes(normalizedQuery)) score += 15;

    for (const token of queryTokens) {
      // Word match count in text
      const regex = new RegExp(`\\b${token}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        score += matches.length * 2;
      }
      // Section header bonus
      if (lowerSec.includes(token)) score += 6;
      // Filename bonus
      if (lowerFile.includes(token)) score += 4;
    }

    return { chunk, score };
  });

  // Sort by score descending
  scoredChunks.sort((a, b) => b.score - a.score);

  // Take top chunks up to maxQuota that actually matched the query (score > 0)
  const selected = [];
  let totalLen = 0;

  for (const item of scoredChunks) {
    // Only include chunks with positive relevance to the user's specific query
    if (item.score > 0 && totalLen + item.chunk.text.length <= maxQuota + 400) {
      selected.push({
        ...item.chunk,
        relevanceScore: item.score
      });
      totalLen += item.chunk.text.length;
    }
  }

  // If query had tokens but zero chunks matched, return empty so AI knows no evidence exists
  return selected;
}

/**
 * Extracts an intelligent, bounded document context summary without requiring external RAG
 */
export function extractDocumentContext(documents = [], options = {}) {
  const maxCombinedLength = options.maxCombinedLength || 16000;
  const query = options.query || options.focus || null;

  // Filter only successfully analyzed documents (ignore FAILED or PROCESSING)
  const validDocs = documents.filter(doc => 
    doc.status === 'ANALYZED' && 
    doc.extractedText && 
    doc.extractedText.trim().length > 0 &&
    !doc.extractedText.startsWith('[EXTRACTION_FAILED]')
  );
  
  // Create all chunks across valid documents
  const allDocChunks = [];
  const sourceReferences = validDocs.map(doc => {
    const filename = doc.originalName || doc.filename;
    const purpose = inferDocPurpose(filename);
    const docChunks = chunkDocument(doc);
    allDocChunks.push(...docChunks);

    const sectionsFound = Array.from(new Set(docChunks.map(c => c.section).filter(Boolean)));

    return {
      id: doc.id,
      documentId: doc.id,
      filename,
      originalName: doc.originalName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      status: doc.status,
      purpose,
      totalChunks: docChunks.length,
      sections: sectionsFound,
      snippet: (doc.extractedText || '').slice(0, 400)
    };
  });

  // Retrieve relevant chunks based on query or balanced distribution
  const relevantChunks = retrieveRelevantChunks(allDocChunks, query, maxCombinedLength);

  // Build combined context with section and page attribution
  const combinedChunks = [];
  for (const chunk of relevantChunks) {
    const pageDisplay = chunk.isPageEstimated ? 'Not available' : String(chunk.pageNumber);
    combinedChunks.push(
      `=== SOURCE DOCUMENT: ${chunk.filename} (Role: ${chunk.purpose}, Type: ${chunk.fileType}) | Section: ${chunk.section} | Page: ${pageDisplay} ===\n${chunk.text}\n=== END SOURCE CHUNK [${chunk.chunkId}] ===`
    );
  }

  const combinedText = combinedChunks.join('\n\n');

  // Extract key terms / proper nouns from document text for deterministic AI guidance
  const distinctTerms = [];
  const termMatches = combinedText.match(/\b[A-Z][a-zA-Z0-9_\-]{2,}(?:\s+[A-Z][a-zA-Z0-9_\-]+)*\b/g) || [];
  const commonIgnore = new Set(['Source', 'Document', 'Content', 'Slide', 'Title', 'The', 'This', 'And', 'For', 'With', 'From', 'Into', 'Notes', 'All', 'Section', 'Page', 'Role', 'Type']);
  for (const term of termMatches) {
    if (!commonIgnore.has(term) && !distinctTerms.includes(term) && distinctTerms.length < 25) {
      distinctTerms.push(term);
    }
  }

  return {
    count: documents.length,
    analyzedCount: validDocs.length,
    documents: validDocs.map(doc => ({
      id: doc.id,
      filename: doc.originalName || doc.filename,
      originalName: doc.originalName,
      type: doc.fileType,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      status: doc.status,
      purpose: inferDocPurpose(doc.originalName || doc.filename),
      text: doc.extractedText
    })),
    sourceReferences,
    chunks: relevantChunks,
    allChunksCount: allDocChunks.length,
    combinedText,
    distinctTerms
  };
}

/**
 * Extracts structured discovery dialogue, user statements, constraints, and requirements
 * Accepts either a single conversation or an array of active discovery conversations.
 */
export function extractDiscoveryContext(conversationOrList) {
  if (!conversationOrList) {
    return {
      messagesCount: 0,
      messages: [],
      userStatements: [],
      userAnswers: [],
      userCorrections: [],
      answers: [],
      discoveredGoals: [],
      discoveredPainPoints: [],
      discoveredConstraints: [],
      userConfirmedFacts: [],
      openQuestions: [],
      latestUserMessage: null
    };
  }

  const conversations = Array.isArray(conversationOrList) ? conversationOrList : [conversationOrList];
  const allMessages = [];
  for (const conv of conversations) {
    if (conv && conv.messages && Array.isArray(conv.messages)) {
      allMessages.push(...conv.messages);
    }
  }

  if (allMessages.length === 0) {
    return {
      messagesCount: 0,
      messages: [],
      userStatements: [],
      userAnswers: [],
      userCorrections: [],
      answers: [],
      discoveredGoals: [],
      discoveredPainPoints: [],
      discoveredConstraints: [],
      userConfirmedFacts: [],
      openQuestions: [],
      latestUserMessage: null
    };
  }

  // Sort chronologically
  allMessages.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

  const messages = allMessages.map(m => ({
    role: m.role,
    content: m.content,
    suggestedAction: m.suggestedAction,
    createdAt: m.createdAt
  }));

  const userMessages = allMessages.filter(m => m.role === 'user').map(m => m.content);
  const assistantMessages = allMessages.filter(m => m.role === 'assistant');

  const discoveredConstraints = [];
  const discoveredPainPoints = [];
  const discoveredGoals = [];
  const userCorrections = [];
  const userConfirmedFacts = [];
  const openQuestions = [];

  // Correction regex patterns to capture explicit user overrides of assumptions
  const correctionPattern = /\b(actually|correction|override|instead of|rather than|we do not|we don't|we do not use|do not use|we only allow|we only use|not true|no, |no\.)\b/i;
  const updatePattern = /\b(change (that|it) to|update (that|it) to)\b/i;

  const seenStatements = new Set();
  const uniqueUserMessages = [];

  for (const msg of userMessages) {
    const trimmed = (msg || '').trim();
    if (!trimmed) continue;
    if (!seenStatements.has(trimmed)) {
      seenStatements.add(trimmed);
      uniqueUserMessages.push(trimmed);
    }
    const lower = trimmed.toLowerCase();

    // Check for user corrections / overrides
    if (correctionPattern.test(lower) || updatePattern.test(lower)) {
      if (!userCorrections.some(c => c.statement === trimmed)) {
        userCorrections.push({
          statement: trimmed,
          type: 'USER_OVERRIDE',
          timestamp: new Date().toISOString()
        });
      }
    }

    // User statements as confirmed facts
    if (!userConfirmedFacts.some(f => f.fact === trimmed)) {
      userConfirmedFacts.push({
        fact: trimmed,
        source: 'USER_CONFIRMED',
        status: 'CONFIRMED'
      });
    }

    if (
      lower.includes('integrate') || 
      lower.includes('legacy') || 
      lower.includes('api') || 
      lower.includes('system') || 
      lower.includes('ehr') || 
      lower.includes('erp') || 
      lower.includes('sap') || 
      lower.includes('wms') ||
      lower.includes('database') ||
      lower.includes('security') ||
      lower.includes('compliance') ||
      lower.includes('hipaa') ||
      lower.includes('budget') ||
      lower.includes('timeline')
    ) {
      if (!discoveredConstraints.includes(trimmed)) {
        discoveredConstraints.push(trimmed);
      }
    }

    if (
      lower.includes('delay') || 
      lower.includes('manual') || 
      lower.includes('bottleneck') || 
      lower.includes('slow') || 
      lower.includes('error') || 
      lower.includes('waiting') || 
      lower.includes('call') || 
      lower.includes('phone') ||
      lower.includes('conflict') ||
      lower.includes('double-booking') ||
      lower.includes('overhead')
    ) {
      if (!discoveredPainPoints.includes(trimmed)) {
        discoveredPainPoints.push(trimmed);
      }
    }

    if (
      lower.includes('reduce') || 
      lower.includes('automate') || 
      lower.includes('improve') || 
      lower.includes('achieve') || 
      lower.includes('target') || 
      lower.includes('sync') ||
      lower.includes('portal') ||
      lower.includes('self-service') ||
      lower.includes('goal')
    ) {
      if (!discoveredGoals.includes(trimmed)) {
        discoveredGoals.push(trimmed);
      }
    }
  }

  // Parse structured assistant messages to aggregate known facts, requirements, and open questions
  for (const m of assistantMessages) {
    const parsed = safeJsonParse(m.structuredContent) || safeJsonParse(m.content);
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.openQuestions)) {
        for (const q of parsed.openQuestions) {
          const qText = typeof q === 'string' ? q : (q.question || q.text);
          if (qText && !openQuestions.some(existing => existing.question === qText)) {
            openQuestions.push(typeof q === 'object' ? q : { question: qText, businessArea: 'GENERAL' });
          }
        }
      }
      if (Array.isArray(parsed.confirmedFacts)) {
        for (const f of parsed.confirmedFacts) {
          const fText = typeof f === 'string' ? f : (f.fact || f.statement);
          if (fText && !userConfirmedFacts.some(existing => existing.fact === fText)) {
            userConfirmedFacts.push(typeof f === 'object' ? f : { fact: fText, source: 'DISCOVERY_ASSISTANT', status: 'CONFIRMED' });
          }
        }
      }
    }
  }

  return {
    messagesCount: allMessages.length,
    messages,
    userStatements: uniqueUserMessages,
    userAnswers: uniqueUserMessages,
    userCorrections,
    answers: uniqueUserMessages,
    discoveredGoals,
    discoveredPainPoints,
    discoveredConstraints,
    userConfirmedFacts,
    openQuestions,
    latestUserMessage: uniqueUserMessages[uniqueUserMessages.length - 1] || null
  };
}

/**
 * Determines the domain theme from all available context
 */
export function detectDomain(context) {
  const ws = context.workspace || context;
  const combined = [
    ws.name || '',
    ws.industry || '',
    ws.objective || '',
    ws.challenge || '',
    ws.targetUsers || '',
    ws.expectedOutcome || '',
    context.documentContext?.combinedText || '',
    (context.discovery?.userStatements || []).join(' ')
  ].join(' ').toLowerCase();

  if (
    combined.includes('patient') || 
    combined.includes('health') || 
    combined.includes('hospital') || 
    combined.includes('clinic') || 
    combined.includes('doctor') || 
    combined.includes('medical') || 
    combined.includes('appointment') || 
    combined.includes('ehr') || 
    combined.includes('clinical') ||
    combined.includes('bed') ||
    combined.includes('nurse')
  ) {
    return 'HEALTHCARE';
  }
  
  if (
    combined.includes('supply') || 
    combined.includes('inventory') || 
    combined.includes('warehouse') || 
    combined.includes('logistics') || 
    combined.includes('freight') || 
    combined.includes('shipment') || 
    combined.includes('wms') || 
    combined.includes('stock') || 
    combined.includes('pallet') || 
    combined.includes('picker') ||
    combined.includes('fulfillment')
  ) {
    return 'SUPPLY_CHAIN';
  }

  if (
    combined.includes('claim') || 
    combined.includes('insurance') || 
    combined.includes('payment') || 
    combined.includes('fraud') || 
    combined.includes('finance') || 
    combined.includes('underwriting') || 
    combined.includes('loan') ||
    combined.includes('fintech')
  ) {
    return 'FINTECH_CLAIMS';
  }

  if (
    combined.includes('employee') || 
    combined.includes('hr') || 
    combined.includes('recruit') || 
    combined.includes('candidate') || 
    combined.includes('talent') || 
    combined.includes('onboard') || 
    combined.includes('payroll') ||
    combined.includes('hiring')
  ) {
    return 'HR_OPERATIONS';
  }

  if (
    combined.includes('ticket') || 
    combined.includes('support') || 
    combined.includes('customer service') || 
    combined.includes('helpdesk') || 
    combined.includes('contact center') || 
    combined.includes('call center') ||
    combined.includes('triage')
  ) {
    return 'CUSTOMER_SUPPORT';
  }

  if (
    combined.includes('ecommerce') ||
    combined.includes('e-commerce') ||
    combined.includes('marketplace') ||
    combined.includes('retail') ||
    combined.includes('cart') ||
    combined.includes('storefront') ||
    (combined.includes('product') && combined.includes('order'))
  ) {
    return 'ECOMMERCE';
  }

  if (
    combined.includes('student') ||
    combined.includes('teacher') ||
    combined.includes('course') ||
    combined.includes('curriculum') ||
    combined.includes('school') ||
    combined.includes('university') ||
    combined.includes('enrollment')
  ) {
    return 'EDUCATION';
  }

  return 'GENERAL_ENTERPRISE';
}

/**
 * Centralized service function to collect the complete workspace context
 * Consolidates metadata, documents, discovery dialogue, and all upstream stage artifacts.
 */
export async function getWorkspaceContext(workspaceId, user = null, options = {}) {
  if (!workspaceId) {
    throw new Error('workspaceId is required to assemble workspace context');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      organization: true,
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      documents: { orderBy: { createdAt: 'desc' } },
      conversations: {
        where: { isArchived: false },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
        orderBy: { lastMessageAt: 'desc' },
        take: 50
      },
      businessAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      solutions: { orderBy: { createdAt: 'desc' }, take: 1 },
      architectures: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { nodes: true, edges: true }
      },
      processes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { nodes: { orderBy: { stepOrder: 'asc' } } }
      },
      uxDesigns: { orderBy: { createdAt: 'desc' }, take: 1 },
      databaseDesigns: { orderBy: { createdAt: 'desc' }, take: 1 },
      apiDesigns: { orderBy: { createdAt: 'desc' }, take: 1 },
      implementationPlans: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { tasks: { orderBy: { sprint: 'asc' } } }
      }
    }
  });

  if (!workspace) {
    throw new HttpError(404, 'Workspace not found.');
  }

  // Tenant Boundary Check: Non-admins must strictly match workspace.organizationId or be the workspace creator
  if (user && user.role !== 'ADMIN') {
    const isDemo = workspace.isDemo || workspace.id === 'ws-demo-customer-support';
    const isCreator = workspace.createdById === user.id;
    const isSameTenant = Boolean(user.organizationId && workspace.organizationId && workspace.organizationId === user.organizationId);
    if (!isDemo && !isCreator && !isSameTenant) {
      throw new HttpError(404, 'Workspace not found.');
    }
  }

  // 1. Core Workspace Metadata
  const wsMetadata = {
    id: workspace.id,
    name: workspace.name,
    industry: workspace.industry,
    objective: workspace.objective,
    challenge: workspace.challenge,
    targetUsers: workspace.targetUsers,
    expectedOutcome: workspace.expectedOutcome,
    status: workspace.status,
    isDemo: workspace.isDemo,
    organization: workspace.organization ? { id: workspace.organization.id, name: workspace.organization.name } : null
  };

  // 2. Documents & Extracted Document Context
  const docContext = extractDocumentContext(workspace.documents, options);

  // 3. Discovery Dialogue Context (Aggregate all active discovery sessions for this workspace)
  const discoveryConvs = (workspace.conversations || []).filter(c => c.stage === 'discovery');
  const discoveryContext = extractDiscoveryContext(
    discoveryConvs.length > 0 ? discoveryConvs : (workspace.conversations[0] || null)
  );

  // 4. Business Analysis Context
  const rawAnalysis = workspace.businessAnalyses[0] || null;
  const businessAnalysisContext = rawAnalysis ? {
    id: rawAnalysis.id,
    workspaceId: rawAnalysis.workspaceId || workspace.id,
    version: rawAnalysis.version,
    status: rawAnalysis.status,
    currentState: rawAnalysis.currentState,
    futureState: rawAnalysis.futureState,
    digitalMaturity: rawAnalysis.digitalMaturityScore,
    digitalMaturityScore: rawAnalysis.digitalMaturityScore,
    goals: safeJsonParse(rawAnalysis.goals, []),
    painPoints: safeJsonParse(rawAnalysis.painPoints, []),
    stakeholders: safeJsonParse(rawAnalysis.stakeholders, []),
    requirements: safeJsonParse(rawAnalysis.requirements, []),
    gaps: safeJsonParse(rawAnalysis.gaps, []),
    processIssues: safeJsonParse(rawAnalysis.processIssues, []),
    automationOpportunities: safeJsonParse(rawAnalysis.automationOpportunities, []),
    improvementOpportunities: safeJsonParse(rawAnalysis.improvementOpportunities, []),
    // Rich Canonical Properties
    executiveSummary: rawAnalysis.executiveSummary || null,
    assessmentScores: safeJsonParse(rawAnalysis.assessmentScores, null),
    strategicGoals: safeJsonParse(rawAnalysis.strategicGoals, []),
    operationalPainPoints: safeJsonParse(rawAnalysis.operationalPainPoints, []),
    requirementsData: safeJsonParse(rawAnalysis.requirementsData, []),
    openQuestions: safeJsonParse(rawAnalysis.openQuestions, []),
    assumptions: safeJsonParse(rawAnalysis.assumptions, []),
    recommendations: safeJsonParse(rawAnalysis.recommendations, []),
    evidenceReferences: safeJsonParse(rawAnalysis.evidenceReferences, []),
    currentOperatingContext: safeJsonParse(rawAnalysis.currentOperatingContext, null),
    futureOperatingState: safeJsonParse(rawAnalysis.futureOperatingState, null),
    validationSummary: safeJsonParse(rawAnalysis.validationSummary, null),
    model: rawAnalysis.model || null
  } : null;

  // 5. Solution Context (including active selectedOption and selectedOptionDetails)
  const rawSolution = workspace.solutions[0] || null;
  let solutionContext = null;
  if (rawSolution) {
    const parsedOptions = safeJsonParse(rawSolution.options, []);
    const selectedOptionId = rawSolution.selectedOption || 'OPTION_B';
    const selectedOptionDetails = parsedOptions.find(o => o.id === selectedOptionId) || parsedOptions[1] || null;

    solutionContext = {
      id: rawSolution.id,
      workspaceId: rawSolution.workspaceId || workspace.id,
      version: rawSolution.version,
      status: rawSolution.status,
      name: rawSolution.name,
      summary: rawSolution.summary,
      businessValue: rawSolution.businessValue,
      implementationApproach: rawSolution.implementationApproach,
      selectedOption: selectedOptionId,
      selectedOptionDetails,
      options: parsedOptions,
      keyCapabilities: safeJsonParse(rawSolution.keyCapabilities, []),
      automationOpps: safeJsonParse(rawSolution.automationOpps, []),
      aiOpps: safeJsonParse(rawSolution.aiOpps, []),
      techStack: safeJsonParse(rawSolution.techStack, {}),
      risks: safeJsonParse(rawSolution.risks, []),
      assumptions: safeJsonParse(rawSolution.assumptions, []),
      dependencies: safeJsonParse(rawSolution.dependencies, [])
    };
  }

  // 6. Architecture Context
  const rawArch = workspace.architectures[0] || null;
  const architectureContext = rawArch ? {
    id: rawArch.id,
    workspaceId: rawArch.workspaceId || workspace.id,
    version: rawArch.version,
    title: rawArch.title,
    hld: rawArch.highLevelDesign,
    highLevelDesign: rawArch.highLevelDesign,
    lld: rawArch.lowLevelDesign,
    lowLevelDesign: rawArch.lowLevelDesign,
    integrationArch: rawArch.integrationArch,
    infrastructureArch: rawArch.infrastructureArch,
    securityArch: rawArch.securityArch,
    deploymentArch: rawArch.deploymentArch,
    nodes: rawArch.nodes || [],
    edges: rawArch.edges || []
  } : null;

  // 7. Process Context (Workflow, Swimlanes, Decision Tree)
  const rawProcess = workspace.processes[0] || null;
  let processContext = null;
  if (rawProcess) {
    const nodes = rawProcess.nodes || [];
    const swimlanes = {};
    for (const n of nodes) {
      const actor = n.actor || 'System';
      if (!swimlanes[actor]) swimlanes[actor] = [];
      swimlanes[actor].push(n);
    }
    const decisionTree = nodes.filter(n => n.type === 'DECISION' || n.type === 'APPROVAL' || n.type === 'AUTOMATION');

    processContext = {
      id: rawProcess.id,
      version: rawProcess.version,
      title: rawProcess.title,
      description: rawProcess.description,
      type: rawProcess.type,
      nodes,
      workflow: nodes,
      swimlanes,
      decisionTree
    };
  }

  // 8. UX Context
  const rawUX = workspace.uxDesigns[0] || null;
  const uxContext = rawUX ? {
    id: rawUX.id,
    version: rawUX.version,
    title: rawUX.title,
    screens: safeJsonParse(rawUX.screens, []),
    designTokens: safeJsonParse(rawUX.designTokens, {})
  } : null;

  // 9. Database Context
  const rawDB = workspace.databaseDesigns[0] || null;
  const databaseContext = rawDB ? {
    id: rawDB.id,
    version: rawDB.version,
    title: rawDB.title,
    entities: safeJsonParse(rawDB.entities, []),
    relations: safeJsonParse(rawDB.relations, []),
    sqlSchema: rawDB.sqlSchema,
    prismaSchema: rawDB.prismaSchema
  } : null;

  // 10. API Context
  const rawAPI = workspace.apiDesigns[0] || null;
  const apiContext = rawAPI ? {
    id: rawAPI.id,
    version: rawAPI.version,
    title: rawAPI.title,
    baseUrl: rawAPI.baseUrl,
    authType: rawAPI.authType,
    endpoints: safeJsonParse(rawAPI.endpoints, [])
  } : null;

  // 11. Planning Context
  const rawPlan = workspace.implementationPlans[0] || null;
  const planningContext = rawPlan ? {
    id: rawPlan.id,
    version: rawPlan.version,
    title: rawPlan.title,
    methodology: rawPlan.methodology,
    estimatedDurationWeeks: rawPlan.estimatedDurationWeeks,
    estimatedCost: rawPlan.estimatedCost,
    phases: safeJsonParse(rawPlan.phases, []),
    tasks: rawPlan.tasks || []
  } : null;

  // Assembled unified context
  const context = {
    workspace: wsMetadata,
    documents: workspace.documents || [],
    documentContext: docContext,
    discovery: discoveryContext,
    businessAnalysis: businessAnalysisContext,
    solution: solutionContext,
    architecture: architectureContext,
    process: processContext,
    ux: uxContext,
    database: databaseContext,
    api: apiContext,
    planning: planningContext
  };

  // Add detected domain to context
  context.domain = detectDomain(context);

  return context;
}

/**
 * Service-level helper to retrieve document context for a workspace (RAG abstraction)
 */
export async function getDocumentContext(workspaceId, user = null, options = {}) {
  const context = await getWorkspaceContext(workspaceId, user, options);
  return context.documentContext;
}

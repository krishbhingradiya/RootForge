const DEFAULT_BACKEND_URL = 'https://rootforge.onrender.com';

export function getApiServerUrl() {
  // 1. User manual override from in-app Settings (clean up legacy stale Vercel backend overrides)
  const customUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('aisb_server_url') : null;
  if (customUrl && (customUrl.includes('root-forge.vercel.app') || customUrl.includes('localhost') || customUrl.includes('10.0.2.2'))) {
    localStorage.removeItem('aisb_server_url');
  } else if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // 2. Production / Build environment configuration via VITE_API_URL or VITE_API_BASE_URL
  const envUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (envUrl) {
    return envUrl;
  }

  // 3. Default to deployed production Render backend URL
  return DEFAULT_BACKEND_URL;
}

export function getApiBaseUrl() {
  const server = getApiServerUrl();
  if (!server) return '/api';
  return server.endsWith('/api') ? server : `${server}/api`;
}

export function setApiServerUrl(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('aisb_server_url');
  } else {
    localStorage.setItem('aisb_server_url', url.trim().replace(/\/+$/, ''));
  }
  window.dispatchEvent(new CustomEvent('rootforge:server-url-changed', { detail: { serverUrl: url } }));
}


function inferLoadingMessage(endpoint = '', options = {}) {
  // Only show full-screen robot loading overlay if explicitly requested via options.showRobotLoading
  // All internal requests, sub-tab switches, saves, filters, and background operations remain completely non-blocking
  if (!options.showRobotLoading) {
    return null;
  }
  return options.loadingMessage || 'Processing...';
}

// In-flight request cache for deduplication of concurrent GET requests
const inFlightRequests = new Map();

async function executeRequest(endpoint, options = {}) {
  const token = localStorage.getItem('aisb_token');
  const headers = {
    ...(options.headers || {})
  };

  // If body is not FormData, add application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const loadingMsg = inferLoadingMessage(endpoint, options);
  const reqKey = `req_${Math.random().toString(36).slice(2, 9)}`;

  if (loadingMsg && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rootforge:loading', {
      detail: { active: true, message: loadingMsg, key: reqKey }
    }));
  }

  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Prevent double /api/api if endpoint already contains leading /api
  const cleanEndpoint = normalizedEndpoint.startsWith('/api/')
    ? normalizedEndpoint.slice(4)
    : normalizedEndpoint;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  // Determine appropriate timeout (default: 15s; AI / exports: 75s)
  const isAiOrExport = cleanEndpoint.includes('/analysis') || cleanEndpoint.includes('/architecture') || cleanEndpoint.includes('/solution') || cleanEndpoint.includes('/process') || cleanEndpoint.includes('/ux') || cleanEndpoint.includes('/database') || cleanEndpoint.includes('/planning') || cleanEndpoint.includes('/exports') || cleanEndpoint.includes('/discovery/messages') || cleanEndpoint.includes('/messages');
  const timeoutMs = options.timeout || (isAiOrExport ? 75000 : 15000);

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  const reqStartTime = performance.now();
  const startTimeIso = new Date().toISOString();

  try {
    let response;
    try {
      response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: options.signal || controller.signal
      });
    } catch (networkErr) {
      if (networkErr?.name === 'AbortError') {
        const timeoutErr = new Error(`Request timed out after ${timeoutMs / 1000}s. Please check your network connection.`);
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }
      if (import.meta.env.DEV || (typeof window !== 'undefined' && window.__DEBUG_API__)) {
        console.warn('[API Network Error]', {
          url: fullUrl,
          method,
          authenticated: Boolean(token),
          networkError: networkErr?.message || 'Network request failed'
        });
      }
      const targetHint = baseUrl || 'https://rootforge.onrender.com/api';
      const err = new Error(`Cannot reach RootForge server at ${targetHint}. Please verify your internet connection or backend server status.`);
      err.isNetworkError = true;
      err.cause = networkErr;
      throw err;
    } finally {
      clearTimeout(timeoutTimer);
    }

    const durationMs = Math.round(performance.now() - reqStartTime);

    // Development performance telemetry logging (never logs sensitive payload data)
    if (import.meta.env.DEV) {
      const perfIcon = durationMs > 1000 ? '🐢' : durationMs > 300 ? '⚡' : '🚀';
      console.log(`${perfIcon} [API Perf] ${method} ${cleanEndpoint} -> HTTP ${response.status} (${durationMs}ms) [${startTimeIso}]`);
    }

    if (response.status === 401) {
      // If not on login or register, clear token
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && window.location.pathname !== '/') {
        localStorage.removeItem('aisb_token');
        localStorage.removeItem('aisb_user');
        window.location.href = '/login?expired=true';
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (import.meta.env.DEV || (typeof window !== 'undefined' && window.__DEBUG_API__)) {
        console.warn('[API Error Response]', {
          url: fullUrl,
          method,
          status: response.status,
          authenticated: Boolean(token),
          error: data.error || `HTTP Error ${response.status}`,
          code: data.code
        });
      }
      const errMessage = data.message || data.error || `HTTP Error ${response.status}`;
      const err = new Error(errMessage);
      err.status = response.status;
      err.details = data.details;
      err.code = data.code || data.errorCode;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    if (loadingMsg && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rootforge:loading', {
        detail: { active: false, key: reqKey }
      }));
    }
  }
}

async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  // Deduplicate concurrent identical GET requests
  if (method === 'GET' && !options.skipDeduplication) {
    const dedupeKey = `GET:${endpoint}`;
    if (inFlightRequests.has(dedupeKey)) {
      return inFlightRequests.get(dedupeKey);
    }

    const promise = executeRequest(endpoint, options).finally(() => {
      inFlightRequests.delete(dedupeKey);
    });

    inFlightRequests.set(dedupeKey, promise);
    return promise;
  }

  return executeRequest(endpoint, options);
}

export async function streamRequest(endpoint, options = {}) {
  const token = localStorage.getItem('aisb_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cleanEndpoint = normalizedEndpoint.startsWith('/api/')
    ? normalizedEndpoint.slice(4)
    : normalizedEndpoint;
  const fullUrl = `${baseUrl}${cleanEndpoint}?stream=true`;

  const response = await fetch(fullUrl, {
    method: 'POST',
    ...options,
    headers,
    signal: options.signal
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(errText || `Server error: HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalPayload = null;
  let accumulatedDelta = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const evt of events) {
      if (!evt.trim()) continue;
      const lines = evt.split('\n');
      let eventType = 'message';
      let dataStr = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataStr = line.slice(5).trim();
        }
      }

      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === 'start' && typeof options.onStart === 'function') {
            options.onStart(parsed);
          } else if (eventType === 'chunk') {
            accumulatedDelta = parsed.text || (accumulatedDelta + (parsed.delta || ''));
            if (typeof options.onChunk === 'function') {
              options.onChunk({ delta: parsed.delta, text: accumulatedDelta, structured: parsed.structured });
            }
          } else if (eventType === 'done') {
            finalPayload = parsed;
            if (typeof options.onDone === 'function') {
              options.onDone(parsed);
            }
          } else if (eventType === 'error') {
            throw new Error(parsed.message || parsed.error || 'Streaming error');
          }
        } catch (e) {
          if (e.message !== 'Unexpected end of JSON input') {
            console.warn('[Stream Parse Notice]', e.message);
          }
        }
      }
    }
  }

  return finalPayload || { message: accumulatedDelta };
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  verifyEmailOtp: (email, otp) => request('/auth/verify-email-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  resendVerificationOtp: (email) => request('/auth/resend-verification-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  sendVerificationOtp: (email) => request('/auth/send-verification-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),

  // Workspaces
  getWorkspaces: () => request('/workspaces'),
  createWorkspace: (payload) => request('/workspaces', { method: 'POST', body: JSON.stringify(payload) }),
  getWorkspace: (id) => request(`/workspaces/${id}`),
  updateWorkspace: (id, payload) => request(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteWorkspace: (id) => request(`/workspaces/${id}`, { method: 'DELETE' }),
  getDashboardMetrics: (id) => request(`/workspaces/${id}/dashboard`),

  // Documents
  getDocuments: (id) => request(`/workspaces/${id}/documents`),
  getDocument: (id, docId) => request(`/workspaces/${id}/documents/${docId}`),
  uploadDocument: (id, formData) => request(`/workspaces/${id}/documents`, { method: 'POST', body: formData }),
  reprocessDocument: (id, docId) => request(`/workspaces/${id}/documents/${docId}/reprocess`, { method: 'POST' }),
  deleteDocument: (id, docId) => request(`/workspaces/${id}/documents/${docId}`, { method: 'DELETE' }),

  // Discovery
  getDiscovery: (id, chatId = null, refreshQuestions = false) => {
    let url = `/workspaces/${id}/discovery`;
    const params = [];
    if (chatId) params.push(`chatId=${encodeURIComponent(chatId)}`);
    if (refreshQuestions) params.push(`refreshQuestions=true`);
    if (params.length) url += `?${params.join('&')}`;
    return request(url);
  },
  // Chat Sessions (Workspace & Stage Scoped)
  getChatSessions: (workspaceId, stage = 'discovery') => request(`/workspaces/${workspaceId}/chats?stage=${encodeURIComponent(stage)}`),
  createChatSession: (workspaceId, stage = 'discovery', title = null, initialMessage = null) => 
    request(`/workspaces/${workspaceId}/chats`, { method: 'POST', body: JSON.stringify({ stage, title, initialMessage }) }),
  getChatMessages: (workspaceId, chatId) => request(`/workspaces/${workspaceId}/chats/${chatId}`),
  sendChatMessage: (workspaceId, chatId, content, clientRequestId = null, language = 'en', uiLanguage = null, detectedLanguage = null, inputType = 'text', requestOptions = {}) => {
    if (requestOptions.onChunk) {
      return streamRequest(`/workspaces/${workspaceId}/chats/${chatId}/messages`, {
        body: JSON.stringify({ content, clientRequestId, language, uiLanguage: uiLanguage || language, detectedLanguage, inputType }),
        signal: requestOptions.signal,
        onChunk: requestOptions.onChunk,
        onStart: requestOptions.onStart,
        onDone: requestOptions.onDone
      });
    }
    return request(`/workspaces/${workspaceId}/chats/${chatId}/messages`, { 
      method: 'POST', 
      body: JSON.stringify({ content, clientRequestId, language, uiLanguage: uiLanguage || language, detectedLanguage, inputType }),
      signal: requestOptions.signal,
      timeout: requestOptions.timeout
    });
  },
  sendDiscoveryMessage: (workspaceId, content, chatId = null, clientRequestId = null, language = 'en', uiLanguage = null, detectedLanguage = null, inputType = 'text', requestOptions = {}) => {
    if (requestOptions.onChunk) {
      return streamRequest(`/workspaces/${workspaceId}/discovery/messages`, {
        body: JSON.stringify({ content, chatId, clientRequestId, language, uiLanguage: uiLanguage || language, detectedLanguage, inputType }),
        signal: requestOptions.signal,
        onChunk: requestOptions.onChunk,
        onStart: requestOptions.onStart,
        onDone: requestOptions.onDone
      });
    }
    return request(`/workspaces/${workspaceId}/discovery/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, chatId, clientRequestId, language, uiLanguage: uiLanguage || language, detectedLanguage, inputType }),
      signal: requestOptions.signal,
      timeout: requestOptions.timeout
    });
  },
  translateChatMessages: (workspaceId, payload) =>
    request(`/workspaces/${workspaceId}/chats/translate`, { method: 'POST', body: JSON.stringify(payload) }),
  transcribeAudio: (workspaceId, payload) =>
    request(`/workspaces/${workspaceId}/chats/transcribe-audio`, { method: 'POST', body: JSON.stringify(payload) }),
  synthesizeTts: (workspaceId, payload) =>
    request(`/workspaces/${workspaceId}/chats/tts`, { method: 'POST', body: JSON.stringify(payload) }),
  // Groq AI Requirement Discovery Test API
  startAiDiscovery: (initialMessage = '') =>
    request('/ai/discovery/start', { method: 'POST', body: JSON.stringify({ initialMessage }) }),
  sendAiDiscoveryMessage: (sessionId, message) =>
    request('/ai/discovery/message', { method: 'POST', body: JSON.stringify({ sessionId, message }) }),
  getAiDiscoverySession: (sessionId) =>
    request(`/ai/discovery/${sessionId}`),
  resetAiDiscoverySession: (sessionId) =>
    request('/ai/discovery/reset', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  getAiDiscoveryHealth: () =>
    request('/ai/discovery/health'),

  // Outbound Phone Call API (RootForge backend secure voice bridge)
  initiateVoiceCall: (payload) =>
    request('/voice/call', { method: 'POST', body: JSON.stringify(payload) }),
  getVoiceSessionStatus: (sessionId) =>
    request(`/voice/session/${sessionId}`),
  getVoicePipelineStatus: (sessionId) =>
    request(`/voice/session/${sessionId}/pipeline-status`),
  retryVoicePipeline: (sessionId) =>
    request(`/voice/session/${sessionId}/retry-pipeline`, { method: 'POST' }),
  retryVoiceAnalysis: (sessionId) =>
    request(`/voice/session/${sessionId}/retry-analysis`, { method: 'POST' }),
  getVoiceSessionRequirements: (sessionId) =>
    request(`/voice/session/${sessionId}/requirements`),
  getVoiceSessionMarkdownUrl: (sessionId) =>
    `${getApiBaseUrl()}/voice/session/${sessionId}/markdown?download=true`,
  cancelVoiceCall: (sessionId) =>
    request(`/voice/session/${sessionId}/cancel`, { method: 'POST' }),
  getVoiceConfig: () =>
    request('/voice/config'),

  // Analysis
  getAnalysis: (id) => request(`/workspaces/${id}/analysis`),
  getBusinessAnalysis: (id) => request(`/workspaces/${id}/analysis`),
  generateAnalysis: (id) => request(`/workspaces/${id}/analysis`, { method: 'POST' }),
  updateAnalysis: (id, payload) => request(`/workspaces/${id}/analysis`, { method: 'PATCH', body: JSON.stringify(payload) }),
  approveAnalysis: (id, comments) => request(`/workspaces/${id}/analysis/approve`, { method: 'POST', body: JSON.stringify({ comments }) }),

  // Solution
  getSolution: (id) => request(`/workspaces/${id}/solution`),
  generateSolution: (id) => request(`/workspaces/${id}/solution`, { method: 'POST' }),
  updateSolution: (id, payload) => request(`/workspaces/${id}/solution`, { method: 'PATCH', body: JSON.stringify(payload) }),
  selectSolutionOption: (id, optionId) => request(`/workspaces/${id}/solution`, { method: 'PATCH', body: JSON.stringify({ selectedOption: optionId }) }),
  approveSolution: (id, comments) => request(`/workspaces/${id}/solution/approve`, { method: 'POST', body: JSON.stringify({ comments }) }),

  // Architecture
  getArchitecture: (id) => request(`/workspaces/${id}/architecture`),
  generateArchitecture: (id) => request(`/workspaces/${id}/architecture`, { method: 'POST' }),
  updateArchitecture: (id, payload) => request(`/workspaces/${id}/architecture`, { method: 'PATCH', body: JSON.stringify(payload) }),
  saveArchitectureVersion: (id, payload) => request(`/workspaces/${id}/architecture/version`, { method: 'POST', body: JSON.stringify(payload) }),
  addNode: (id, payload) => request(`/workspaces/${id}/architecture/nodes`, { method: 'POST', body: JSON.stringify(payload) }),
  updateNode: (id, nodeId, payload) => request(`/workspaces/${id}/architecture/nodes/${nodeId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteNode: (id, nodeId) => request(`/workspaces/${id}/architecture/nodes/${nodeId}`, { method: 'DELETE' }),

  // Process
  getProcess: (id) => request(`/workspaces/${id}/process`),
  generateProcess: (id) => request(`/workspaces/${id}/process`, { method: 'POST' }),
  regenerateProcess: (id) => request(`/workspaces/${id}/process/regenerate`, { method: 'POST' }),
  getProcessStatus: (id) => request(`/workspaces/${id}/process/status`),
  validateProcess: (id) => request(`/workspaces/${id}/process/validate`, { method: 'POST' }),
  approveProcess: (id) => request(`/workspaces/${id}/process/approve`, { method: 'POST' }),
  getProcessVersions: (id) => request(`/workspaces/${id}/process/versions`),
  restoreProcessVersion: (id, versionNumber) => request(`/workspaces/${id}/process/versions/${versionNumber}/restore`, { method: 'POST' }),
  updateProcess: (id, payload) => request(`/workspaces/${id}/process`, { method: 'PATCH', body: JSON.stringify(payload) }),
  saveProcessVersion: (id, payload) => request(`/workspaces/${id}/process/version`, { method: 'POST', body: JSON.stringify(payload) }),
  addProcessNode: (id, payload) => request(`/workspaces/${id}/process/nodes`, { method: 'POST', body: JSON.stringify(payload) }),
  updateProcessNode: (id, nodeId, payload) => request(`/workspaces/${id}/process/nodes/${nodeId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProcessNode: (id, nodeId) => request(`/workspaces/${id}/process/nodes/${nodeId}`, { method: 'DELETE' }),

  // UX
  getUX: (id) => request(`/workspaces/${id}/ux`),
  generateUX: (id, payload) => request(`/workspaces/${id}/ux`, { method: 'POST', body: payload ? JSON.stringify(payload) : undefined }),
  analyzeUXRequirement: (id, requirementText) => request(`/workspaces/${id}/ux/analyze`, { method: 'POST', body: JSON.stringify({ requirementText }) }),
  interpretUXCommand: (id, payload) => request(`/workspaces/${id}/ux/interpret-command`, { method: 'POST', body: JSON.stringify(payload) }),
  editUXWithPrompt: (id, payload) => request(`/workspaces/${id}/ux/edit-prompt`, { method: 'POST', body: JSON.stringify(payload) }),
  patchUX: (id, payload) => request(`/workspaces/${id}/ux/patch`, { method: 'POST', body: JSON.stringify(payload) }),
  applyUXRecommendation: (id, recommendationId) => request(`/workspaces/${id}/ux/apply-recommendation`, { method: 'POST', body: JSON.stringify({ recommendationId }) }),
  approveUX: (id, notes) => request(`/workspaces/${id}/ux/approve`, { method: 'POST', body: JSON.stringify({ notes }) }),
  exportUX: (id, format) => request(`/workspaces/${id}/ux/export`, { method: 'POST', body: JSON.stringify({ format }) }),
  getUXVersions: (id) => request(`/workspaces/${id}/versions?artifactType=UX`),
  restoreUXVersion: (id, versionId) => request(`/workspaces/${id}/versions/${versionId}/restore`, { method: 'POST' }),
  updateUX: (id, payload) => request(`/workspaces/${id}/ux`, { method: 'PATCH', body: JSON.stringify(payload) }),
  saveUXVersion: (id, payload) => request(`/workspaces/${id}/ux/version`, { method: 'POST', body: JSON.stringify(payload) }),

  // Database
  getDatabase: (id) => request(`/workspaces/${id}/database`),
  generateDatabase: (id) => request(`/workspaces/${id}/database`, { method: 'POST' }),
  updateDatabase: (id, payload) => request(`/workspaces/${id}/database`, { method: 'PATCH', body: JSON.stringify(payload) }),
  askDatabaseAi: (id, payload) => request(`/workspaces/${id}/database/ai-assist`, { method: 'POST', body: JSON.stringify(payload) }),
  regenerateDatabaseComponent: (id, component) => request(`/workspaces/${id}/database/regenerate-component`, { method: 'POST', body: JSON.stringify({ component }) }),

  // API
  getAPI: (id) => request(`/workspaces/${id}/api`),
  generateAPI: (id) => request(`/workspaces/${id}/api`, { method: 'POST' }),
  updateAPI: (id, payload) => request(`/workspaces/${id}/api`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Planning
  getPlan: (id) => request(`/workspaces/${id}/planning`),
  generatePlan: (id, payload) => request(`/workspaces/${id}/planning`, { method: 'POST', body: payload ? JSON.stringify(payload) : undefined }),
  updatePlan: (id, payload) => request(`/workspaces/${id}/planning`, { method: 'PATCH', body: JSON.stringify(payload) }),
  addTask: (id, payload) => request(`/workspaces/${id}/planning/tasks`, { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id, taskId, payload) => request(`/workspaces/${id}/planning/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTask: (id, taskId) => request(`/workspaces/${id}/planning/tasks/${taskId}`, { method: 'DELETE' }),

  // Collaboration
  getCollaboration: (id) => request(`/workspaces/${id}/collaboration`),
  addComment: (id, payload) => request(`/workspaces/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  createComment: (id, payload) => request(`/workspaces/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  submitApproval: (id, payload) => request(`/workspaces/${id}/approvals`, { method: 'POST', body: JSON.stringify(payload) }),
  resolveComment: (id, commentId, status) => request(`/workspaces/${id}/comments/${commentId}/resolve`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Versions
  getVersions: (id, artifactType) => request(`/workspaces/${id}/versions${artifactType ? `?artifactType=${artifactType}` : ''}`),
  saveVersion: (id, payload) => request(`/workspaces/${id}/versions`, { method: 'POST', body: JSON.stringify(payload) }),
  restoreVersion: (id, versionId) => request(`/workspaces/${id}/versions/${versionId}/restore`, { method: 'POST' }),

  // Exports
  generateExport: (id, format, scope) => request(`/workspaces/${id}/exports/generate`, { method: 'POST', body: JSON.stringify({ format, scope }) }),
  previewExport: (id, format, scope) => request(`/workspaces/${id}/exports/preview`, { method: 'POST', body: JSON.stringify({ format, scope }) }),
  getExports: (id) => request(`/workspaces/${id}/exports`),

  // Admin Platform Suite
  getAdminMetrics: () => request('/admin/metrics'),
  getAdminUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  getAdminUserDetail: (userId) => request(`/admin/users/${userId}`),
  createAdminUser: (payload) => request('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdminUser: (userId, payload) => request(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAdminUser: (userId) => request(`/admin/users/${userId}`, { method: 'DELETE' }),
  
  // Organizations
  getAdminOrganizations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/organizations${qs ? `?${qs}` : ''}`);
  },
  createAdminOrganization: (payload) => request('/admin/organizations', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdminOrganization: (orgId, payload) => request(`/admin/organizations/${orgId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAdminOrganization: (orgId) => request(`/admin/organizations/${orgId}`, { method: 'DELETE' }),

  // Workspaces & Projects
  getAdminWorkspaces: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/workspaces${qs ? `?${qs}` : ''}`);
  },
  updateAdminWorkspace: (wsId, payload) => request(`/admin/workspaces/${wsId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAdminWorkspace: (wsId) => request(`/admin/workspaces/${wsId}`, { method: 'DELETE' }),

  // RBAC Roles
  getAdminRoles: () => request('/admin/roles'),

  // AI & Governance
  getAdminAiConfig: () => request('/admin/ai/config'),
  updateAdminAiConfig: (payload) => request('/admin/ai/config', { method: 'POST', body: JSON.stringify(payload) }),
  getAdminAiUsage: () => request('/admin/ai/usage'),
  getAdminAiHealth: () => request('/admin/ai/health'),

  // Audit Logs
  getAdminAuditLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },

  // Enterprise Integrations
  getAdminIntegrations: () => request('/admin/integrations'),
  toggleAdminIntegration: (id, isEnabled) => request(`/admin/integrations/${id}/toggle`, { method: 'POST', body: JSON.stringify({ isEnabled }) }),

  // Alerts
  getAdminAlerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/alerts${qs ? `?${qs}` : ''}`);
  },
  markAdminAlertRead: (id) => request(`/admin/alerts/${id}/read`, { method: 'PATCH' }),
  broadcastAdminAlert: (payload) => request('/admin/alerts/broadcast', { method: 'POST', body: JSON.stringify(payload) })
};

export default api;


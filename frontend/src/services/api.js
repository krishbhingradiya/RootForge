import { Capacitor } from '@capacitor/core';

export function getApiServerUrl() {
  // 1. User manual override from in-app Settings
  const customUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('aisb_server_url') : null;
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  // 2. Production / Build environment configuration via VITE_API_URL or VITE_API_BASE_URL
  const envUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (envUrl) {
    return envUrl;
  }

  // 3. Native Capacitor runtime:
  if (Capacitor.isNativePlatform()) {
    // Connect to backend server on host machine in Android emulator
    return 'http://10.0.2.2:5005';
  }

  // 4. Standard desktop browser (dev server proxies /api to backend):
  return '';
}

export function getApiBaseUrl() {
  const server = getApiServerUrl();
  return server ? `${server}/api` : '/api';
}

export function setApiServerUrl(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('aisb_server_url');
  } else {
    localStorage.setItem('aisb_server_url', url.trim().replace(/\/+$/, ''));
  }
  window.dispatchEvent(new CustomEvent('rootforge:server-url-changed', { detail: { serverUrl: url } }));
}


function inferLoadingMessage(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const ep = endpoint.toLowerCase();

  if (options.silentLoading) return null;

  // Skip lightweight telemetry, auth status checks, and inline speech/translation
  if (ep.includes('/health') || ep.includes('/auth') || ep.includes('/chat/translate') || ep.includes('/workspaces?')) {
    return null;
  }

  // Solution Lifecycle Section switching (GET requests)
  if (method === 'GET') {
    if (ep.includes('/discovery')) return 'Understanding your business...';
    if (ep.includes('/analysis')) return 'Analyzing your requirements...';
    if (ep.includes('/solution')) return 'Designing your solution...';
    if (ep.includes('/process')) return 'Mapping your business process...';
    if (ep.includes('/ux')) return 'Preparing your experience...';
    if (ep.includes('/architecture')) return 'Designing the system architecture...';
    if (ep.includes('/database') || ep.includes('/schema') || ep.includes('/apis')) return 'Structuring your data and APIs...';
    if (ep.includes('/planning')) return 'Calculating your implementation effort...';
    if (ep.includes('/collaboration')) return 'Connecting your team...';
    if (ep.includes('/exports')) return 'Preparing your deliverables...';
  }

  // AI & Generation endpoints (POST / PATCH)
  if (method === 'POST' || method === 'PATCH') {
    if (ep.includes('/discovery')) return 'Understanding your business...';
    if (ep.includes('/analysis')) return 'Analyzing your requirements...';
    if (ep.includes('/solution')) return 'Designing your solution...';
    if (ep.includes('/process')) return 'Mapping your business process...';
    if (ep.includes('/ux')) return 'Preparing your experience...';
    if (ep.includes('/architecture')) return 'Designing the system architecture...';
    if (ep.includes('/database')) return 'Structuring your data and APIs...';
    if (ep.includes('/planning')) return 'Building your implementation roadmap...';
    if (ep.includes('/documents')) return 'Analyzing your requirements...';
  }

  return null;
}

async function request(endpoint, options = {}) {
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

  try {
    const baseUrl = getApiBaseUrl();
    let response;
    try {
      response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers
      });
    } catch (networkErr) {
      const isMobile = Capacitor.isNativePlatform();
      const targetHint = baseUrl || (isMobile ? 'http://10.0.2.2:5005' : 'http://localhost:5005');
      const err = new Error(`Cannot reach RootForge server at ${targetHint}. Please make sure the backend server is running on port 5005.`);
      err.isNetworkError = true;
      err.cause = networkErr;
      throw err;
    }

    if (response.status === 401) {
      // If not on login or register, clear token
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && window.location.pathname !== '/') {
        localStorage.removeItem('aisb_token');
        localStorage.removeItem('aisb_user');
        window.location.href = '/login?expired=true';
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data.error || `HTTP Error ${response.status}`);
      err.details = data.details;
      err.code = data.code;
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
  sendDiscoveryMessage: (id, content, chatId = null, clientRequestId = null, language = 'en', uiLanguage = null) => 
    request(`/workspaces/${id}/discovery/messages`, { method: 'POST', body: JSON.stringify({ content, chatId, clientRequestId, language, uiLanguage: uiLanguage || language }) }),

  // Chat Sessions (Workspace & Stage Scoped)
  getChatSessions: (workspaceId, stage = 'discovery') => request(`/workspaces/${workspaceId}/chats?stage=${encodeURIComponent(stage)}`),
  createChatSession: (workspaceId, stage = 'discovery', title = null, initialMessage = null) => 
    request(`/workspaces/${workspaceId}/chats`, { method: 'POST', body: JSON.stringify({ stage, title, initialMessage }) }),
  getChatMessages: (workspaceId, chatId) => request(`/workspaces/${workspaceId}/chats/${chatId}`),
  sendChatMessage: (workspaceId, chatId, content, clientRequestId = null, language = 'en', uiLanguage = null) => 
    request(`/workspaces/${workspaceId}/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ content, clientRequestId, language, uiLanguage: uiLanguage || language }) }),
  translateChatMessages: (workspaceId, payload) =>
    request(`/workspaces/${workspaceId}/chats/translate`, { method: 'POST', body: JSON.stringify(payload) }),
  transcribeAudio: (workspaceId, payload) =>
    request(`/workspaces/${workspaceId}/chats/transcribe-audio`, { method: 'POST', body: JSON.stringify(payload) }),
  synthesizeTts: (workspaceId, payload) =>
    request(`/workspaces/${workspaceId}/chats/tts`, { method: 'POST', body: JSON.stringify(payload) }),
  archiveChatSession: (workspaceId, chatId) => request(`/workspaces/${workspaceId}/chats/${chatId}`, { method: 'DELETE' }),
  updateChatSession: (workspaceId, chatId, payload) => 
    request(`/workspaces/${workspaceId}/chats/${chatId}`, { method: 'PATCH', body: JSON.stringify(payload) }),

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
  editUXWithPrompt: (id, payload) => request(`/workspaces/${id}/ux/edit-prompt`, { method: 'POST', body: JSON.stringify(payload) }),
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

  // Admin
  getAdminMetrics: () => request('/admin/metrics'),
  getAdminUsers: () => request('/admin/users'),
  createAdminUser: (payload) => request('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUserRole: (userId, role) => request(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) })
};

export default api;


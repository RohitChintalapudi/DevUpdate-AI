import axios from 'axios'

const configuredApiUrl = (import.meta.env.VITE_API_URL || '/api').trim()

function isLocalApiUrl(value) {
  try {
    const { hostname, port } = new URL(value, window.location.origin)
    return ['localhost', '127.0.0.1'].includes(hostname) && ['5000', ''].includes(port)
  } catch {
    return false
  }
}

// In development, keep API calls on the same origin as the Vite app. The dev
// server proxies /api to the backend, which avoids CORS/SameSite cookie failures
// when the UI is opened via 127.0.0.1 or a LAN hostname instead of localhost.
const API_URL =
  import.meta.env.DEV && typeof window !== 'undefined' && isLocalApiUrl(configuredApiUrl)
    ? '/api'
    : configuredApiUrl.replace(/\/$/, '') || '/api'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

function readCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : null
}

export async function initializeCsrf() {
  await api.get('/auth/csrf')
}

// The server issues a non-HttpOnly double-submit cookie. Every state-changing
// request echoes it back in a header so cookie-authenticated actions are protected.
api.interceptors.request.use(async (config) => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
    let token = readCookie('csrfToken')
    if (!token && typeof window !== 'undefined') {
      try {
        await initializeCsrf()
        token = readCookie('csrfToken')
      } catch {
        // Continue if offline or during bootstrap
      }
    }
    if (token) config.headers['X-CSRF-Token'] = token
  }
  return config
})

// Automatically handle session expiration (24hr access token lifetime)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const url = error.config?.url || ''
      const isPublicAuthCheck =
        url.includes('/auth/session') ||
        url.includes('/auth/login') ||
        url.includes('/auth/signup') ||
        url.includes('/auth/csrf')

      if (
        !isPublicAuthCheck &&
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/dashboard')
      ) {
        window.location.href = '/login?expired=1'
      }
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    const endpoint = error?.config?.url || ''
    return endpoint
      ? `Cannot reach the API (${endpoint}). Check that the backend is running and reachable.`
      : 'Cannot reach the server. Make sure the backend is running.'
  }
  if (error?.response?.status) {
    return `The server returned ${error.response.status}. Please try again.`
  }
  if (error?.message && !error.message.startsWith('Request failed')) return error.message
  return fallback
}

export const authApi = {
  signup: (payload) => api.post('/auth/signup', payload).then((res) => res.data),
  login: (payload) => api.post('/auth/login', payload).then((res) => res.data),
  logout: () => api.post('/auth/logout').then((res) => res.data),
  session: () => api.get('/auth/session').then((res) => res.data),
  me: () => api.get('/auth/me').then((res) => res.data),
  updateProfile: (payload) => api.patch('/auth/me', payload).then((res) => res.data),
}

export const githubApi = {
  connect: (params) => api.get('/github/connect', { params }).then((res) => res.data),
  status: () => api.get('/github/status').then((res) => res.data),
  disconnect: () => api.delete('/github/disconnect').then((res) => res.data),
}

export const repositoriesApi = {
  list: (params) => api.get('/repositories', { params }).then((res) => res.data),
  get: (id) => api.get(`/repositories/${id}`).then((res) => res.data),
  sync: () => api.post('/repositories/sync').then((res) => res.data),
  analyze: (id, payload = {}) => api.post(`/repositories/${id}/analyze`, payload).then((res) => res.data),
  scanStatus: (id) => api.get(`/repositories/${id}/scan-status`).then((res) => res.data),
}

export const dependenciesApi = {
  list: (params) => api.get('/dependencies', { params }).then((res) => res.data),
  byRepository: (repositoryId, params) =>
    api.get(`/dependencies/${repositoryId}`, { params }).then((res) => res.data),
}

export const aiApi = {
  overview: () => api.get('/ai/overview').then((res) => res.data),
  status: () => api.get('/ai/status').then((res) => res.data),
  recommendations: (params) => api.get('/ai/recommendations', { params }).then((res) => res.data),
  analyzeRepository: (repositoryId) =>
    api.post(`/ai/analyze/repository/${repositoryId}`).then((res) => res.data),
  analyzeDependency: (repositoryId, dependencyId) =>
    api.post(`/ai/analyze/dependency/${repositoryId}/${dependencyId}`).then((res) => res.data),
  researchDependency: (repositoryId, dependencyId) =>
    api.post(`/ai/research/dependency/${repositoryId}/${dependencyId}`).then((res) => res.data),
  researchDocuments: (params) => api.get('/ai/research/documents', { params }).then((res) => res.data),
  job: (jobId) => api.get(`/ai/jobs/${jobId}`).then((res) => res.data),
  repositoryJob: (repositoryId) => api.get(`/ai/jobs/repository/${repositoryId}`).then((res) => res.data),
  cancelJob: (jobId) => api.post(`/ai/jobs/${jobId}/cancel`).then((res) => res.data),
  analysis: (analysisId) => api.get(`/ai/analysis/${analysisId}`).then((res) => res.data),
  conversations: (repositoryId) => api.get(`/ai/chat/${repositoryId}/conversations`).then((res) => res.data),
  conversation: (repositoryId, conversationId) =>
    api.get(`/ai/chat/${repositoryId}/conversations/${conversationId}`).then((res) => res.data),
  deleteConversation: (conversationId) => api.delete(`/ai/chat/conversations/${conversationId}`).then((res) => res.data),
  chat: (repositoryId, payload) => api.post(`/ai/chat/${repositoryId}`, payload).then((res) => res.data),
}

export const updatesApi = {
  overview: () => api.get('/updates/overview').then((res) => res.data),
  repositories: (params) => api.get('/updates/repositories', { params }).then((res) => res.data),
  list: (params) => api.get('/updates/list', { params }).then((res) => res.data),
  universal: () => api.get('/updates/universal').then((res) => res.data),
  repository: (repositoryId, params) =>
    api.get(`/updates/repository/${repositoryId}`, { params }).then((res) => res.data),
  dependency: (dependencyId) =>
    api.get(`/updates/dependency/${dependencyId}`).then((res) => res.data),
  history: (dependencyId, params) =>
    api.get(`/updates/history/${dependencyId}`, { params }).then((res) => res.data),
  vulnerabilities: (params) => api.get('/updates/vulnerabilities', { params }).then((res) => res.data),
  status: (repositoryId) => api.get(`/updates/status/${repositoryId}`).then((res) => res.data),
  checkRepository: (repositoryId) =>
    api.post(`/updates/repository/${repositoryId}/check`).then((res) => res.data),
  checkAll: () => api.post('/updates/check-all').then((res) => res.data),
  checkDependency: (dependencyId) =>
    api.post(`/updates/dependency/${dependencyId}/check`).then((res) => res.data),
  researchRepository: (repositoryId, payload = {}) =>
    api.post(`/updates/repository/${repositoryId}/research`, payload).then((res) => res.data),
  researchStatus: (repositoryId) =>
    api.get(`/updates/repository/${repositoryId}/research-status`).then((res) => res.data),
  dependencies: (repositoryId, params) =>
    api.get(`/updates/repository/${repositoryId}/dependencies`, { params }).then((res) => res.data),
  researchDependency: (dependencyId, payload = {}) =>
    api.post(`/updates/dependency/${dependencyId}/research`, payload).then((res) => res.data),
  getResearch: (dependencyId) =>
    api.get(`/updates/dependency/${dependencyId}/research`).then((res) => res.data),
  analyzeDependency: (dependencyId) =>
    api.post(`/updates/dependency/${dependencyId}/analyze`).then((res) => res.data),
  getAnalysis: (dependencyId) =>
    api.get(`/updates/dependency/${dependencyId}/analysis`).then((res) => res.data),
  exportRepositoryPdf: (repositoryId) =>
    api.get(`/updates/repository/${repositoryId}/export-pdf`, { responseType: 'blob' }).then((res) => {
      const disposition = res.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^";]+)"?/)
      return {
        blob: res.data,
        filename: match?.[1] || `repository-dependency-intelligence.pdf`,
      }
    }),
}

export const memoryApi = {
  status: () => api.get('/memory/status').then((res) => res.data),
  list: (repositoryId, params) =>
    api.get(`/memory/repositories/${repositoryId}`, { params }).then((res) => res.data),
  context: (repositoryId, params) =>
    api.get(`/memory/repositories/${repositoryId}/context`, { params }).then((res) => res.data),
  create: (repositoryId, payload) =>
    api.post(`/memory/repositories/${repositoryId}`, payload).then((res) => res.data),
  rebuild: (repositoryId) =>
    api.post(`/memory/repositories/${repositoryId}/rebuild`).then((res) => res.data),
  expire: () => api.post('/memory/expire').then((res) => res.data),
  update: (memoryId, payload) => api.patch(`/memory/items/${memoryId}`, payload).then((res) => res.data),
  delete: (memoryId) => api.delete(`/memory/items/${memoryId}`).then((res) => res.data),
}

export const feedbackApi = {
  options: () => api.get('/feedback/options').then((res) => res.data),
  list: (repositoryId, params) =>
    api.get(`/feedback/repositories/${repositoryId}`, { params }).then((res) => res.data),
  record: (analysisId, payload) =>
    api.post(`/feedback/analyses/${analysisId}`, payload).then((res) => res.data),
}

export const historyApi = {
  comparisons: (repositoryId, params) =>
    api.get(`/history/repositories/${repositoryId}`, { params }).then((res) => res.data),
  dependency: (dependencyId, params) =>
    api.get(`/history/dependencies/${dependencyId}`, { params }).then((res) => res.data),
  comparison: (dependencyId, params) =>
    api.get(`/history/dependencies/${dependencyId}/comparison`, { params }).then((res) => res.data),
  compare: (analysisId) => api.post(`/history/analyses/${analysisId}/compare`).then((res) => res.data),
}

export const reportsApi = {
  options: () => api.get('/reports/options').then((res) => res.data),
  generate: (payload) => api.post('/reports', payload).then((res) => res.data),
  list: (params) => api.get('/reports', { params }).then((res) => res.data),
  get: (reportId) => api.get(`/reports/${reportId}`).then((res) => res.data),
  download: (reportId, format) =>
    api.get(`/reports/${reportId}/export`, { params: { format }, responseType: 'blob' }).then((res) => {
      const header = res.headers?.['content-disposition'] || ''
      const match = /filename="?([^";]+)"?/i.exec(header)
      return { blob: res.data, filename: match?.[1] || `devupdate-report.${String(format).toLowerCase()}` }
    }),
  delete: (reportId) => api.delete(`/reports/${reportId}`).then((res) => res.data),
}

export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }).then((res) => res.data),
  recent: (params) => api.get('/notifications/recent', { params }).then((res) => res.data),
  unreadCount: (params) => api.get('/notifications/unread-count', { params }).then((res) => res.data),
  preferences: () => api.get('/notifications/preferences').then((res) => res.data),
  updatePreferences: (payload) => api.patch('/notifications/preferences', payload).then((res) => res.data),
  read: (notificationIds) => api.patch('/notifications/read', { notificationIds }).then((res) => res.data),
  readAll: (repositoryId) => api.patch('/notifications/read-all', { repositoryId }).then((res) => res.data),
  readOne: (notificationId) => api.patch(`/notifications/${notificationId}/read`).then((res) => res.data),
  delete: (notificationId) => api.delete(`/notifications/${notificationId}`).then((res) => res.data),
}

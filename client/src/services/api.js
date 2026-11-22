import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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
api.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
    const token = readCookie('csrfToken')
    if (token) config.headers['X-CSRF-Token'] = token
  }
  return config
})

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Make sure the backend is running.'
  }
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

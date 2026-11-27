export const APPEARANCE_STORAGE_KEY = 'devupdate:appearance'

export const ACCENTS = [
  { id: 'sky', label: 'Sky', swatch: '#0284c7' },
  { id: 'violet', label: 'Violet', swatch: '#7c3aed' },
  { id: 'emerald', label: 'Emerald', swatch: '#059669' },
  { id: 'rose', label: 'Rose', swatch: '#e11d48' },
]

export const THEMES = [
  { id: 'daylight', label: 'Daylight', description: 'Clean light surfaces with high-contrast text.' },
  { id: 'midnight', label: 'Midnight', description: 'Deep navy surfaces with luminous accents.' },
  { id: 'system', label: 'System', description: 'Follow your device light or dark preference.' },
]

const THEME_IDS = THEMES.map((theme) => theme.id)
const DEFAULT_APPEARANCE = { theme: 'daylight', accent: 'sky', reduceMotion: false }

export function normalizeAppearance(value = {}) {
  const theme = THEME_IDS.includes(value?.theme) ? value.theme : DEFAULT_APPEARANCE.theme
  const accent = ACCENTS.some((item) => item.id === value?.accent) ? value.accent : DEFAULT_APPEARANCE.accent
  return { theme, accent, reduceMotion: Boolean(value?.reduceMotion) }
}

export function resolveThemePreference(theme, prefersDark = false) {
  if (theme === 'system') return prefersDark ? 'midnight' : 'daylight'
  return theme === 'midnight' ? 'midnight' : 'daylight'
}

function systemPrefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

let systemMediaQuery = null
let systemThemeListener = null

function setDocumentTheme(theme, prefersDark) {
  if (typeof document === 'undefined') return
  const resolved = resolveThemePreference(theme, prefersDark)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.dataset.themePreference = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'midnight' ? '#080B14' : '#F8FAFC')
}

function stopWatchingSystemTheme() {
  if (!systemMediaQuery || !systemThemeListener) return
  if (typeof systemMediaQuery.removeEventListener === 'function') {
    systemMediaQuery.removeEventListener('change', systemThemeListener)
  } else {
    systemMediaQuery.removeListener(systemThemeListener)
  }
  systemMediaQuery = null
  systemThemeListener = null
}

function watchSystemTheme(theme) {
  stopWatchingSystemTheme()
  if (theme !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemThemeListener = (event) => setDocumentTheme(theme, event.matches)
  if (typeof systemMediaQuery.addEventListener === 'function') {
    systemMediaQuery.addEventListener('change', systemThemeListener)
  } else {
    systemMediaQuery.addListener(systemThemeListener)
  }
}

export function readAppearance() {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE
  try {
    const stored = JSON.parse(window.localStorage.getItem(APPEARANCE_STORAGE_KEY) || '{}')
    return normalizeAppearance(stored)
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function applyAppearance(value) {
  if (typeof document === 'undefined') return
  const next = normalizeAppearance(value)
  setDocumentTheme(next.theme, systemPrefersDark())
  document.documentElement.dataset.accent = next.accent
  document.documentElement.classList.toggle('reduce-motion', next.reduceMotion)
  watchSystemTheme(next.theme)
}

export function saveAppearance(value) {
  const next = normalizeAppearance(value)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage may be disabled; the in-memory and DOM state still apply.
    }
  }
  applyAppearance(next)
  return next
}

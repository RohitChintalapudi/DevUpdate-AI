export const APPEARANCE_STORAGE_KEY = 'devupdate:appearance'

export const ACCENTS = [
  { id: 'sky', label: 'Sky', swatch: '#0284c7' },
  { id: 'violet', label: 'Violet', swatch: '#7c3aed' },
  { id: 'emerald', label: 'Emerald', swatch: '#059669' },
  { id: 'rose', label: 'Rose', swatch: '#e11d48' },
]

const DEFAULT_APPEARANCE = { accent: 'sky', reduceMotion: false }

export function normalizeAppearance(value = {}) {
  const accent = ACCENTS.some((item) => item.id === value?.accent) ? value.accent : DEFAULT_APPEARANCE.accent
  return { accent, reduceMotion: Boolean(value?.reduceMotion) }
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
  const { accent, reduceMotion } = normalizeAppearance(value)
  document.documentElement.dataset.accent = accent
  document.documentElement.classList.toggle('reduce-motion', reduceMotion)
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

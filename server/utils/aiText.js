import crypto from 'node:crypto'

const BOILERPLATE_PATTERNS = [
  /^\s*(cookie\s*policy|privacy\s*policy|terms\s*of\s*service|all\s*rights\s*reserved)\s*$/i,
  /^\s*(sign\s*in|log\s*in|sign\s*up|subscribe|newsletter|search|menu|navigation)\s*$/i,
  /^\s*skip\s*to\s*(content|main)\s*$/i,
  /^\s*share\s*(this|on)\b/i,
]

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function contentHash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex')
}

/**
 * Removes obvious navigation/boilerplate without altering the meaning of
 * technical content. All content remains untrusted data.
 */
export function normalizeDocumentContent(value, maxLength = 200 * 1024) {
  const normalized = normalizeWhitespace(value)
  const lines = normalized.split('\n')
  const kept = []
  let previousBlank = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (!previousBlank && kept.length) kept.push('')
      previousBlank = true
      continue
    }
    previousBlank = false
    if (line.length < 120 && BOILERPLATE_PATTERNS.some((pattern) => pattern.test(line))) continue
    kept.push(line)
  }

  return normalizeWhitespace(kept.join('\n')).slice(0, maxLength)
}

function splitIntoParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean)
}

function splitLongParagraph(paragraph, maxChars) {
  const sentences = paragraph.match(/[^.!?。！？\n]+[.!?。！？\n]?/g) || [paragraph]
  const chunks = []
  let current = ''

  for (const sentence of sentences) {
    const value = sentence.trim()
    if (!value) continue
    if (current.length + value.length + 1 <= maxChars) {
      current = current ? `${current} ${value}` : value
      continue
    }
    if (current) chunks.push(current)
    if (value.length <= maxChars) {
      current = value
    } else {
      for (let index = 0; index < value.length; index += maxChars) {
        const piece = value.slice(index, index + maxChars).trim()
        if (piece) chunks.push(piece)
      }
      current = ''
    }
  }

  if (current) chunks.push(current)
  return chunks
}

/**
 * Deterministic, dependency-free chunking. Chunks overlap slightly so a
 * breaking-change sentence is not lost at a paragraph boundary.
 */
export function chunkText(value, { maxChars = 1800, overlapChars = 180 } = {}) {
  const text = normalizeWhitespace(value)
  if (!text) return []

  const safeMax = Math.max(300, Number(maxChars) || 1800)
  const safeOverlap = Math.max(0, Math.min(400, Number(overlapChars) || 180))
  const pieces = []

  for (const paragraph of splitIntoParagraphs(text)) {
    if (paragraph.length <= safeMax) pieces.push(paragraph)
    else pieces.push(...splitLongParagraph(paragraph, safeMax))
  }

  const chunks = []
  let current = ''
  for (const piece of pieces) {
    if (!current) {
      current = piece
      continue
    }
    if (current.length + piece.length + 2 <= safeMax) {
      current = `${current}\n\n${piece}`
      continue
    }
    chunks.push(current)
    const tail = safeOverlap ? current.slice(-safeOverlap) : ''
    current = tail && !piece.startsWith(tail) ? `${tail}\n\n${piece}` : piece
    if (current.length > safeMax) current = current.slice(-safeMax)
  }
  if (current) chunks.push(current)

  return chunks.map((chunkTextValue, index) => ({
    index,
    text: normalizeWhitespace(chunkTextValue),
    hash: contentHash(chunkTextValue),
  }))
}

export function truncate(value, maxLength = 500) {
  const text = String(value || '')
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export function redactSensitive(value) {
  return String(value || '')
    .replace(/(gh[pousr]_[A-Za-z0-9]{16,})/g, '[redacted-token]')
    .replace(/(sk-[A-Za-z0-9_-]{16,})/g, '[redacted-token]')
    .replace(/(pcsk_[A-Za-z0-9_-]{16,})/g, '[redacted-token]')
    .replace(/(gsk_[A-Za-z0-9]{16,})/g, '[redacted-token]')
    .replace(/(api[_-]?key\s*[:=]\s*['"]?)[^'\"\s,}]+/gi, '$1[redacted]')
    .replace(/(password\s*[:=]\s*['"]?)[^'\"\s,}]+/gi, '$1[redacted]')
}

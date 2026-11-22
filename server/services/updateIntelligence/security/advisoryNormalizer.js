import { sanitizeText } from '../../../utils/sanitize.js'

const SAFE_URL = /^https?:\/\//i

function safeUrl(value) {
  const text = sanitizeText(value, 500)
  return SAFE_URL.test(text) ? text : ''
}

function eventValue(event, key) {
  const value = event?.[key]
  return value ? sanitizeText(value, 80) : ''
}

function formatRange(range) {
  const parts = []
  for (const event of range?.events || []) {
    if (event.introduced) parts.push(event.introduced === '0' ? '>= 0' : `>= ${event.introduced}`)
    if (event.last_affected) parts.push(`<= ${event.last_affected}`)
    if (event.fixed) parts.push(`< ${event.fixed}`)
    if (event.limit) parts.push(`< ${event.limit}`)
  }
  return parts.join(', ') || 'Affected range unavailable'
}

export function extractFixedVersions(vuln) {
  const fixed = new Set()
  for (const affected of vuln?.affected || []) {
    for (const range of affected?.ranges || []) {
      for (const event of range?.events || []) {
        if (event.fixed) fixed.add(sanitizeText(event.fixed, 80))
      }
    }
  }
  return [...fixed].slice(0, 10)
}

export function extractSeverity(vuln) {
  const databaseSeverity = vuln?.database_specific?.severity
  if (typeof databaseSeverity === 'string') {
    return { level: databaseSeverity.toUpperCase(), score: null, vector: null }
  }

  for (const entry of vuln?.severity || []) {
    const value = String(entry?.score || '')
    const numeric = Number(value)
    if (Number.isFinite(numeric) && value.trim() !== '') {
      return {
        level: numeric >= 9 ? 'CRITICAL' : numeric >= 7 ? 'HIGH' : numeric >= 4 ? 'MEDIUM' : 'LOW',
        score: numeric,
        vector: null,
      }
    }
    if (value.startsWith('CVSS:')) {
      return { level: 'UNKNOWN', score: null, vector: sanitizeText(value, 120) }
    }
  }

  return { level: 'UNKNOWN', score: null, vector: null }
}

export function normalizeAdvisory(vuln) {
  if (!vuln?.id) return null
  const aliases = Array.isArray(vuln.aliases) ? vuln.aliases.map((alias) => sanitizeText(alias, 80)).filter(Boolean) : []
  const references = Array.isArray(vuln.references)
    ? vuln.references
        .map((reference) => ({ type: sanitizeText(reference.type, 30), url: safeUrl(reference.url) }))
        .filter((reference) => reference.url)
        .slice(0, 8)
    : []
  const affectedRanges = []
  for (const affected of vuln.affected || []) {
    for (const range of affected?.ranges || []) {
      affectedRanges.push({
        type: sanitizeText(range.type, 40),
        display: formatRange(range),
        introduced: eventValue(range?.events?.find((event) => event.introduced), 'introduced'),
        fixed: eventValue(range?.events?.find((event) => event.fixed), 'fixed'),
        lastAffected: eventValue(range?.events?.find((event) => event.last_affected), 'last_affected'),
        limit: eventValue(range?.events?.find((event) => event.limit), 'limit'),
      })
    }
  }

  return {
    id: sanitizeText(vuln.id, 80),
    aliases,
    cveIds: aliases.filter((alias) => /^CVE-/i.test(alias)),
    ghsaIds: [vuln.id, ...aliases].filter((alias) => /^GHSA-/i.test(alias)),
    severity: extractSeverity(vuln),
    summary: sanitizeText(vuln.summary || vuln.details || 'Security advisory', 500),
    affectedRanges: affectedRanges.slice(0, 8),
    fixedVersions: extractFixedVersions(vuln),
    references,
    publishedAt: vuln.published ? new Date(vuln.published).toISOString() : null,
    modifiedAt: vuln.modified ? new Date(vuln.modified).toISOString() : null,
  }
}

export function normalizeAdvisories(vulns) {
  if (!Array.isArray(vulns)) return []
  return vulns.map(normalizeAdvisory).filter(Boolean).slice(0, 50)
}

export function securityStatusFor(advisories, querySucceeded) {
  if (!querySucceeded) return 'SECURITY_DATA_UNAVAILABLE'
  return advisories.length ? 'VULNERABLE' : 'NO_KNOWN_VULNERABILITY'
}

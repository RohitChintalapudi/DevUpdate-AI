import crypto from 'node:crypto'
import { truncate } from '../../../utils/aiText.js'
import { isPrivateAddress } from '../security/urlSafety.js'

export function evidenceId(prefix, value) {
  const digest = crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 12)
  return `${prefix}-${digest}`
}

function safeUrl(url) {
  try {
    const parsed = new URL(String(url || ''))
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    if (isPrivateAddress(parsed.hostname) || parsed.username || parsed.password) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function statusForUrl(url, fallback = 'PARTIALLY_VERIFIED') {
  return safeUrl(url) ? 'VERIFIED' : fallback
}

export function collectSourceEvidence({ update = {}, documents = [], contextFiles = [], advisories = [] }) {
  const evidence = []
  const metadata = update.metadata || {}

  if (update.registryUrl || metadata.homepage || metadata.repositoryUrl) {
    const url = safeUrl(update.registryUrl || metadata.homepage || metadata.repositoryUrl)
    evidence.push({
      id: evidenceId('registry', update._id || update.packageName),
      title: `${update.packageName || 'Package'} registry metadata`,
      url,
      sourceType: 'REGISTRY_METADATA',
      excerpt: truncate(
        [
          `Installed version: ${update.installedVersion || 'unknown'}.`,
          `Latest stable version: ${update.latestStableVersion || update.latestVersion || 'unknown'}.`,
          metadata.description || '',
        ]
          .filter(Boolean)
          .join(' '),
        900,
      ),
      retrievedAt: update.lastCheckedAt || new Date().toISOString(),
      publishedAt: update.latestReleaseDate || null,
      verificationStatus: statusForUrl(update.registryUrl),
      confidence: url ? 0.9 : 0.5,
      source: 'Phase 3 registry lookup',
    })
  }

  for (const advisory of advisories.length ? advisories : update.vulnerabilities || []) {
    const url = safeUrl(advisory.references?.[0]?.url)
    evidence.push({
      id: evidenceId('osv', advisory.id || advisory.summary || 'advisory'),
      title: advisory.id || 'OSV advisory',
      url,
      sourceType: 'SECURITY_ADVISORY',
      excerpt: truncate(
        `${advisory.summary || 'No summary published.'} Fixed versions: ${(advisory.fixedVersions || []).join(', ') || 'unavailable'}.`,
        900,
      ),
      retrievedAt: update.lastCheckedAt || new Date().toISOString(),
      publishedAt: advisory.publishedAt || null,
      verificationStatus: statusForUrl(url, 'UNVERIFIED'),
      confidence: url ? 0.9 : 0.4,
      source: 'OSV',
    })
  }

  for (const document of documents) {
    const url = safeUrl(document.sourceUrl || document.url)
    evidence.push({
      id: String(document.id || document.evidenceId || evidenceId('doc', url || document.contentHash || document.text)),
      title: document.title || document.sourceType || 'Retrieved documentation',
      url,
      sourceType: document.sourceType || 'OFFICIAL_DOCS',
      excerpt: truncate(document.excerpt || document.text || document.chunkText || '', 1800),
      retrievedAt: document.retrievedAt || new Date().toISOString(),
      publishedAt: document.publishedAt || null,
      verificationStatus: document.official === false ? 'PARTIALLY_VERIFIED' : statusForUrl(url),
      confidence: Number(document.score ?? document.confidence ?? 0.7),
      source: document.source || 'Retrieved official documentation',
    })
  }

  for (const file of contextFiles) {
    evidence.push({
      id: evidenceId('code', file.path),
      title: `Repository file: ${file.path}`,
      url: '',
      sourceType: 'REPOSITORY_CODE',
      excerpt: truncate((file.snippets || []).join('\n\n'), 1200),
      retrievedAt: new Date().toISOString(),
      publishedAt: null,
      verificationStatus: 'VERIFIED',
      confidence: 1,
      repositoryPath: file.path,
      source: 'Project context analyzer',
    })
  }

  return evidence.filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 60)
}

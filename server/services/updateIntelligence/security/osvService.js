import { osvEcosystem } from '../../../constants/updateEcosystems.js'
import { sanitizeText, sanitizeError } from '../../../utils/sanitize.js'
import { cachedRegistryJson } from '../cache/registryCache.js'
import { normalizeAdvisories } from './advisoryNormalizer.js'

const TTL_MS = 30 * 60 * 1000

export async function queryAdvisories({ ecosystem, packageName, version }) {
  const osvEcosystemName = osvEcosystem(ecosystem)
  const name = sanitizeText(packageName, 214)
  const installedVersion = sanitizeText(version, 80)
  if (!osvEcosystemName || !name || !installedVersion) {
    throw new Error('OSV query requires an ecosystem, package name and installed version.')
  }

  const baseUrl = (process.env.OSV_API_BASE_URL || 'https://api.osv.dev').replace(/\/$/, '')
  const body = JSON.stringify({
    package: { ecosystem: osvEcosystemName, name },
    version: installedVersion,
  })

  const { data } = await cachedRegistryJson({
    key: `osv:${osvEcosystemName}:${name}:${installedVersion}`,
    url: `${baseUrl}/v1/query`,
    method: 'POST',
    body,
    ttlMs: TTL_MS,
    limiter: 'osv',
    label: `OSV lookup for ${name}@${installedVersion}`,
    headers: { 'Content-Type': 'application/json' },
    maxBytes: 8 * 1024 * 1024,
  })

  return normalizeAdvisories(data?.vulns)
}

export async function safelyQueryAdvisories(input) {
  try {
    return { ok: true, advisories: await queryAdvisories(input), error: '' }
  } catch (error) {
    return { ok: false, advisories: [], error: sanitizeError(error) }
  }
}

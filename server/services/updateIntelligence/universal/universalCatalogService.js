import { UNIVERSAL_DEPENDENCIES } from '../../../constants/universalDependencies.js'
import { mapLimit } from '../../../utils/sanitize.js'

function bounded(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

const BUDGET_MS = bounded(process.env.UNIVERSAL_CATALOG_BUDGET_MS, 8_000, 1_000, 20_000)
const REQUEST_TIMEOUT_MS = bounded(process.env.UNIVERSAL_CATALOG_TIMEOUT_MS, 2_500, 500, 6_000)
const CONCURRENCY = bounded(process.env.UNIVERSAL_CATALOG_CONCURRENCY, 12, 2, 24)
const CACHE_TTL_MS = bounded(process.env.UNIVERSAL_CATALOG_CACHE_TTL_MS, 60 * 60 * 1000, 60_000, 86_400_000)

const cache = new Map()

export function clearUniversalCatalogCache() {
  cache.clear()
}

function registrySpec(item) {
  const name = item.registryPackage || ''
  const encoded = encodeURIComponent(name)
  switch (item.registryType) {
    case 'npm':
      return {
        url: `https://registry.npmjs.org/${encoded}/latest`,
        read: (data) => data?.version,
        registryUrl: `https://www.npmjs.com/package/${name}`,
      }
    case 'pypi':
      return {
        url: `https://pypi.org/pypi/${encoded}/json`,
        read: (data) => data?.info?.version,
        registryUrl: `https://pypi.org/project/${name}/`,
      }
    case 'maven': {
      const [group, artifact] = name.split(':')
      const query = new URLSearchParams({ q: `g:"${group}" AND a:"${artifact}"`, rows: '1', wt: 'json' })
      return {
        url: `https://search.maven.org/solrsearch/select?${query.toString()}`,
        read: (data) => data?.response?.docs?.[0]?.latestVersion,
        registryUrl: `https://search.maven.org/artifact/${encodeURIComponent(group)}/${encodeURIComponent(artifact)}`,
      }
    }
    default:
      return null
  }
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { accept: 'application/json', 'user-agent': 'DevUpdate-AI universal catalog' },
    })
    if (!response.ok) return null
    const text = await response.text()
    if (!text || text.length > 6_000_000) return null
    return JSON.parse(text)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function versionFor(item, context) {
  const cached = cache.get(item.id)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value

  const spec = registrySpec(item)
  if (!spec || Date.now() >= context.deadline) {
    const value = {
      latestVersion: item.curatedVersion || 'Latest',
      versionSource: 'curated',
      registryUrl: item.url,
      checkedAt: null,
    }
    cache.set(item.id, { value, at: Date.now() })
    return value
  }

  return context
    .fetchJson(spec.url, context.timeoutMs)
    .then((data) => {
      const version = String(spec.read(data) || '').trim()
      const value = version
        ? { latestVersion: version, versionSource: 'live', registryUrl: spec.registryUrl, checkedAt: new Date() }
        : {
            latestVersion: item.curatedVersion || 'Latest',
            versionSource: 'curated',
            registryUrl: item.url,
            checkedAt: null,
          }
      cache.set(item.id, { value, at: Date.now() })
      return value
    })
    .catch(() => ({
      latestVersion: item.curatedVersion || 'Latest',
      versionSource: 'curated',
      registryUrl: item.url,
      checkedAt: null,
    }))
}

/** Returns the curated Universal catalog enriched with live latest versions. */
export async function getUniversalCatalog(options = {}) {
  const budgetMs = bounded(options.budgetMs, BUDGET_MS, 500, 30_000)
  const context = {
    deadline: Date.now() + budgetMs,
    timeoutMs: bounded(options.timeoutMs, REQUEST_TIMEOUT_MS, 250, 10_000),
    fetchJson: typeof options.fetchJson === 'function' ? options.fetchJson : fetchJson,
  }

  const versions = await mapLimit(
    UNIVERSAL_DEPENDENCIES,
    bounded(options.concurrency, CONCURRENCY, 1, 32),
    async (item) => {
      try {
        return await versionFor(item, context)
      } catch {
        return {
          latestVersion: item.curatedVersion || 'Latest',
          versionSource: 'curated',
          registryUrl: item.url,
          checkedAt: null,
        }
      }
    },
  )

  const items = UNIVERSAL_DEPENDENCIES.map((item, index) => ({
    ...item,
    ...(versions[index] || {}),
  }))

  return {
    items,
    stats: {
      total: items.length,
      live: items.filter((item) => item.versionSource === 'live').length,
      curated: items.filter((item) => item.versionSource === 'curated').length,
      elapsedMs: Math.max(0, budgetMs - Math.max(0, context.deadline - Date.now())),
    },
  }
}

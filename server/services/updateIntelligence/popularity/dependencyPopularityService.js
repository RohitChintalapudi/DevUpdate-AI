import { normalizeEcosystem } from '../../../constants/updateEcosystems.js'
import { mapLimit, sanitizeError, sanitizeText } from '../../../utils/sanitize.js'
import { dependencyKeyFor } from '../updateEngine/dependencyIdentity.js'
import { selectAiDependencyIndexes } from './aiDependencySelectionService.js'

function bounded(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

/** Keep the study set small enough for registry checks and Firecrawl research. */
export const POPULARITY_LIMIT = bounded(process.env.DEPENDENCY_POPULARITY_LIMIT, 25, 20, 30)
const POPULARITY_BUDGET_MS = bounded(process.env.DEPENDENCY_POPULARITY_BUDGET_MS, 10_000, 3_000, 20_000)
const REQUEST_TIMEOUT_MS = bounded(process.env.DEPENDENCY_POPULARITY_REQUEST_TIMEOUT_MS, 2_500, 500, 5_000)
const CONCURRENCY = bounded(process.env.DEPENDENCY_POPULARITY_CONCURRENCY, 12, 4, 24)
const CACHE_TTL_MS = bounded(process.env.DEPENDENCY_POPULARITY_CACHE_TTL_MS, 6 * 60 * 60 * 1000, 60_000, 86_400_000)

// Used as a tie-breaker where no public download API exists. It is deliberately
// small so real download counts always outrank a curated guess.
const KNOWN_POPULAR = {
  npm: new Set([
    'react', 'react-dom', 'react-router-dom', 'next', 'vue', 'angular', 'express', 'fastify',
    'koa', 'lodash', 'axios', 'typescript', 'vite', 'webpack', 'rollup', 'eslint', 'prettier',
    'jest', 'vitest', 'mocha', 'zod', 'yup', 'mongoose', 'sequelize', 'prisma', 'dotenv',
    'cors', 'helmet', 'bcryptjs', 'jsonwebtoken', 'dayjs', 'moment', 'classnames',
    'tailwindcss', 'postcss', 'autoprefixer', 'sass', 'redux', 'react-redux',
    'framer-motion', 'lucide-react', 'react-icons', 'socket.io', 'multer', 'sharp',
    'pg', 'mysql2', 'redis', 'stripe', 'nodemailer', 'swagger-ui-express', 'commander',
    'chalk', 'uuid', 'semver', 'es-errors',
  ]),
  pypi: new Set([
    'django', 'flask', 'fastapi', 'requests', 'numpy', 'pandas', 'scipy', 'scikit-learn',
    'torch', 'tensorflow', 'sqlalchemy', 'pydantic', 'uvicorn', 'gunicorn', 'celery',
    'redis', 'psycopg2', 'psycopg2-binary', 'pytest', 'black', 'ruff', 'boto3', 'pillow',
    'matplotlib', 'seaborn', 'beautifulsoup4', 'selenium', 'playwright', 'openpyxl',
    'pyyaml', 'python-dotenv', 'httpx', 'aiohttp', 'starlette', 'werkzeug', 'jinja2',
    'click', 'rich', 'typer',
  ]),
  maven: new Set([
    'spring-boot', 'spring-boot-starter-web', 'spring-core', 'spring-web',
    'spring-security-core', 'jackson-databind', 'jackson-core', 'junit-jupiter',
    'junit', 'mockito-core', 'slf4j-api', 'logback-classic', 'log4j-core',
    'commons-lang3', 'commons-io', 'guava', 'lombok', 'mysql-connector-j',
    'postgresql', 'hibernate-core', 'spring-data-jpa', 'maven-compiler-plugin',
  ]),
  crates: new Set([
    'serde', 'tokio', 'clap', 'reqwest', 'serde_json', 'anyhow', 'thiserror',
    'async-trait', 'tracing', 'rand', 'chrono', 'uuid', 'sqlx', 'diesel',
    'actix-web', 'axum',
  ]),
  go: new Set([
    'github.com/gin-gonic/gin', 'github.com/gorilla/mux', 'golang.org/x/crypto',
    'golang.org/x/net', 'github.com/joho/godotenv', 'github.com/lib/pq', 'gorm.io/gorm',
    'github.com/spf13/cobra', 'github.com/spf13/viper', 'github.com/rs/cors',
    'google.golang.org/grpc',
  ]),
  rubygems: new Set([
    'rails', 'sinatra', 'rake', 'bundler', 'rspec', 'puma', 'nokogiri',
    'activerecord', 'devise', 'sidekiq', 'redis', 'pg', 'jwt', 'bcrypt',
  ]),
  packagist: new Set([
    'laravel/framework', 'symfony/console', 'guzzlehttp/guzzle', 'composer/composer',
    'phpunit/phpunit', 'monolog/monolog', 'doctrine/orm', 'psr/log',
  ]),
  nuget: new Set([
    'newtonsoft.json', 'microsoft.extensions.dependencyinjection',
    'microsoft.entityframeworkcore', 'serilog', 'automapper', 'fluentvalidation',
    'xunit', 'nunit', 'moq', 'system.text.json',
  ]),
}

const popularityCache = new Map()

export function clearPopularityCache() {
  popularityCache.clear()
}

function cacheGet(key) {
  const entry = popularityCache.get(key)
  if (!entry) return undefined
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    popularityCache.delete(key)
    return undefined
  }
  return entry.value
}

function cacheSet(key, value) {
  if (popularityCache.size > 2000) {
    const oldest = popularityCache.keys().next().value
    if (oldest) popularityCache.delete(oldest)
  }
  popularityCache.set(key, { value, at: Date.now() })
}

function ecosystemKey(dependency) {
  const normalized = normalizeEcosystem(dependency?.ecosystem)
  if (normalized?.key) return normalized.key
  return String(dependency?.ecosystem || '').trim().toLowerCase()
}

function packageNameFor(dependency, key) {
  let name = sanitizeText(dependency?.packageName, 214).trim()
  if (key === 'maven' && (dependency?.artifactId || dependency?.groupId)) {
    name = sanitizeText(dependency.artifactId || dependency.groupId, 214).trim()
  }
  if (!name || name.startsWith('@')) return ''
  if (/[\s?#\\]/.test(name)) return ''
  if (key !== 'packagist' && key !== 'go' && name.includes('/')) return ''
  if (key === 'packagist' && name.split('/').length !== 2) return ''
  return name
}

function fallbackKey(dependency, key, name) {
  return `${key || 'unknown'}::${name || 'unknown'}`
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { accept: 'application/json', 'user-agent': 'DevUpdate-AI popularity check' },
    })
    if (!response.ok) return null
    const text = await response.text()
    if (!text || text.length > 1_000_000) return null
    return JSON.parse(text)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function sourceSpec(key, name) {
  const encoded = encodeURIComponent(name)
  switch (key) {
    case 'npm':
      return {
        url: `https://api.npmjs.org/downloads/point/last-week/${encoded}`,
        source: 'npm-weekly-downloads',
        read: (data) => data?.downloads,
      }
    case 'pypi':
      return {
        url: `https://pypistats.org/api/packages/${encoded}/recent`,
        source: 'pypi-monthly-downloads',
        read: (data) => data?.data?.last_month ?? data?.data?.last_week,
      }
    case 'crates':
      return {
        url: `https://crates.io/api/v1/crates/${encoded}`,
        source: 'crates-recent-downloads',
        read: (data) => data?.crate?.recent_downloads ?? data?.crate?.downloads,
      }
    case 'rubygems':
      return {
        url: `https://rubygems.org/api/v1/gems/${encoded}.json`,
        source: 'rubygems-downloads',
        read: (data) => data?.downloads,
      }
    case 'packagist': {
      const path = name.split('/').map((part) => encodeURIComponent(part)).join('/')
      return {
        url: `https://packagist.org/packages/${path}.json`,
        source: 'packagist-monthly-downloads',
        read: (data) => data?.package?.downloads?.monthly ?? data?.package?.downloads?.total,
      }
    }
    default:
      return null
  }
}

async function downloadsFor(dependency, context) {
  const key = ecosystemKey(dependency)
  const name = packageNameFor(dependency, key)
  if (!key || !name || Date.now() >= context.deadline) return null

  const cacheKey = `${key}::${name.toLowerCase()}`
  const cached = cacheGet(cacheKey)
  if (cached !== undefined) return cached

  const spec = sourceSpec(key, name)
  if (!spec) {
    cacheSet(cacheKey, null)
    return null
  }

  const data = await context.fetchJson(spec.url, context.timeoutMs)
  const raw = Number(spec.read(data))
  const downloads = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0
  const metric = downloads ? { downloads, source: spec.source } : null
  cacheSet(cacheKey, metric)
  return metric
}

function rootManifest(sourceManifest) {
  const value = sanitizeText(sourceManifest, 300).replace(/\\/g, '/')
  return Boolean(value) && !value.includes('/')
}

function downloadScore(downloads) {
  if (!downloads) return 0
  return Math.min(9, Math.log10(downloads + 1))
}

function reputationScore(dependency, key, name) {
  const type = String(dependency?.dependencyType || '').toLowerCase()
  let score = 0
  if (!dependency?.isDevelopmentDependency && type !== 'development' && type !== 'build') score += 2.5
  if (rootManifest(dependency?.sourceManifest)) score += 1.5
  if (dependency?.resolvedVersion) score += 0.5
  if (KNOWN_POPULAR[key]?.has(name.toLowerCase())) score += 4.5
  return score
}

function round(value) {
  return Math.round(value * 100) / 100
}

/**
 * Ranks extracted dependencies by worldwide usage signals. Download APIs are
 * used where available, then an AI layer sees every discovered package and
 * picks the popular study set. Deterministic scoring fills any gap so an
 * unreachable API or model never stalls or empties the queue.
 */
export async function rankDependencies(dependencies = [], options = {}) {
  const list = (Array.isArray(dependencies) ? dependencies : []).filter(
    (dependency) => dependency?.packageName && !String(dependency.packageName).startsWith('@'),
  )
  const limit = bounded(options.limit ?? POPULARITY_LIMIT, POPULARITY_LIMIT, 1, 100)
  const budgetMs = bounded(options.budgetMs, POPULARITY_BUDGET_MS, 500, 60_000)
  const context = {
    deadline: Date.now() + budgetMs,
    timeoutMs: bounded(options.timeoutMs, REQUEST_TIMEOUT_MS, 250, 10_000),
    fetchJson: typeof options.fetchJson === 'function' ? options.fetchJson : fetchJson,
  }

  const identityFor = (dependency) => {
    const key = ecosystemKey(dependency)
    const name = packageNameFor(dependency, key)
    return {
      key,
      name,
      stableKey: dependencyKeyFor(dependency) || fallbackKey(dependency, key, name),
    }
  }

  const fetchList = []
  const seenFetchKeys = new Set()
  for (const dependency of list) {
    const { key, name, stableKey } = identityFor(dependency)
    if (!key || !name || seenFetchKeys.has(stableKey)) continue
    seenFetchKeys.add(stableKey)
    fetchList.push({ dependency, key, name, stableKey })
  }

  const metrics = new Map()
  await mapLimit(fetchList, bounded(options.concurrency, CONCURRENCY, 1, 32), async (item) => {
    if (Date.now() >= context.deadline) return
    try {
      metrics.set(item.stableKey, await downloadsFor(item.dependency, context))
    } catch {
      metrics.set(item.stableKey, null)
    }
  })

  const evaluatedAt = new Date()
  const scored = list.map((dependency) => {
    const { key, name, stableKey } = identityFor(dependency)
    const metric = metrics.get(stableKey) || null
    const known = Boolean(KNOWN_POPULAR[key]?.has(name.toLowerCase()))
    const score = round(downloadScore(metric?.downloads) + reputationScore(dependency, key, name))
    return {
      ...dependency,
      dependencyKey: stableKey,
      popularityKey: stableKey,
      popularityDownloads: metric?.downloads || 0,
      popularitySource: metric?.source || (known ? 'curated' : 'heuristic'),
      popularityScore: score,
      popularityEvaluatedAt: evaluatedAt,
    }
  })

  // A package can appear in several manifests. Keep one representative per
  // stable package identity, preferring a resolved lockfile version.
  const bestByKey = new Map()
  const ordered = [...scored].sort(
    (a, b) => Number(Boolean(b.resolvedVersion)) - Number(Boolean(a.resolvedVersion)) || b.popularityScore - a.popularityScore,
  )
  for (const dependency of ordered) {
    if (!bestByKey.has(dependency.popularityKey)) bestByKey.set(dependency.popularityKey, dependency)
  }

  // Every unique discovered dependency is handed to the AI layer. It chooses
  // the most widely used subset; deterministic scoring fills any gap so a
  // timeout or a bad model answer never empties the study set.
  const candidates = [...bestByKey.values()].sort(
    (a, b) =>
      b.popularityScore - a.popularityScore ||
      String(a.packageName).localeCompare(String(b.packageName)),
  )

  const selectionStartedAt = Date.now()
  let selectionSource = 'deterministic'
  let aiSelected = 0
  let aiError = ''
  let chosen = []

  if (candidates.length > limit) {
    try {
      const selector =
        typeof options.selectAiDependencyIndexes === 'function'
          ? options.selectAiDependencyIndexes
          : selectAiDependencyIndexes
      const result = await selector({ candidates, limit, timeoutMs: options.aiTimeoutMs })
      const indexes = Array.isArray(result?.indexes)
        ? result.indexes
        : Array.isArray(result)
          ? result
          : []
      aiError = result?.error || ''

      const chosenKeys = new Set()
      for (const index of indexes) {
        const dependency = candidates[index]
        if (!dependency || chosenKeys.has(dependency.popularityKey)) continue
        chosen.push(dependency)
        chosenKeys.add(dependency.popularityKey)
        if (chosen.length >= limit) break
      }

      if (chosen.length) {
        const fillers = candidates.filter((dependency) => !chosenKeys.has(dependency.popularityKey))
        chosen = [...chosen, ...fillers].slice(0, limit)
        aiSelected = Math.min(indexes.length, chosen.length)
        selectionSource = 'ai'
      }
    } catch (error) {
      aiError = sanitizeError(error)
    }
  }

  if (!chosen.length) chosen = candidates.slice(0, limit)
  if (aiError && typeof options.selectAiDependencyIndexes !== 'function') {
    console.warn('[popularity] AI selection unavailable, using deterministic order:', aiError)
  }

  const selected = chosen.map((dependency, index) => ({
    ...dependency,
    popularityRank: index + 1,
    isPopular: true,
  }))

  const allMetrics = [...metrics.values()]
  return {
    selected,
    candidates,
    scored,
    stats: {
      discovered: bestByKey.size,
      rawDependencies: list.length,
      evaluated: metrics.size,
      withDownloads: allMetrics.filter(Boolean).length,
      kept: selected.length,
      limit,
      selectionSource,
      aiSelected,
      aiCandidates: candidates.length,
      aiError,
      selectionMs: Date.now() - selectionStartedAt,
      elapsedMs: budgetMs - Math.max(0, context.deadline - Date.now()),
    },
  }
}

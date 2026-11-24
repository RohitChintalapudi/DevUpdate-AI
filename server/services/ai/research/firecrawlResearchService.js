import { Firecrawl } from 'firecrawl'
import ResearchDocument from '../../../models/ResearchDocument.js'
import { AppError } from '../../../utils/errors.js'
import { sanitizeError, sanitizeText } from '../../../utils/sanitize.js'
import { AI_LIMITS } from '../../../constants/aiConstants.js'
import { contentHash, normalizeDocumentContent, truncate } from '../../../utils/aiText.js'
import { assertSafeExternalUrl } from '../security/urlSafety.js'
import { cachedAiResult } from '../cache/aiCache.js'
import { createAiRateLimiter } from '../cache/aiRateLimiter.js'
import { evidenceId } from '../evidence/sourceCollector.js'
import { langchainStructuredGenerate } from '../langchain/langchainService.js'
import { isGroqConfigured } from '../providers/groqProvider.js'
import { researchExtractionSchema, researchSourceSuggestionSchema } from '../schemas/aiSchemas.js'
import { buildResearchExtractionPrompt, buildResearchSourceSuggestionPrompt } from '../prompts/aiPrompts.js'

const acquireFirecrawl = createAiRateLimiter('firecrawl', {
  limit: Number(process.env.AI_FIRECRAWL_LIMIT_PER_MINUTE) || 20,
  windowMs: 60_000,
})

// Hard ceilings so a package without findable documentation can never hold a
// research worker open indefinitely. The whole Firecrawl phase is budgeted to
// ~9s; the AI knowledge fallback in the worker gets the remainder of ~15s.
function boundedMs(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

const PACKAGE_FIRECRAWL_BUDGET_MS = boundedMs(
  process.env.AI_FIRECRAWL_PACKAGE_TIMEOUT_MS || process.env.AI_RESEARCH_DEADLINE_MS,
  9_000,
  2_000,
  15_000,
)
const RESEARCH_DEADLINE_MS = PACKAGE_FIRECRAWL_BUDGET_MS
const SEARCH_TIMEOUT_MS = boundedMs(process.env.AI_RESEARCH_SEARCH_TIMEOUT_MS, 3_000, 500, PACKAGE_FIRECRAWL_BUDGET_MS)
const URL_CHECK_TIMEOUT_MS = boundedMs(process.env.AI_RESEARCH_URL_CHECK_TIMEOUT_MS, 1_500, 250, 3_000)
const SOURCE_SCRAPE_TIMEOUT_MS = boundedMs(
  process.env.AI_FIRECRAWL_TIMEOUT_MS,
  5_000,
  1_000,
  PACKAGE_FIRECRAWL_BUDGET_MS,
)
const AI_SUGGESTION_TIMEOUT_MS = boundedMs(process.env.AI_SOURCE_SUGGESTION_TIMEOUT_MS, 3_500, 500, 6_000)

// Hosts that can never count as an official source even if a model suggests them.
const NON_OFFICIAL_HOSTS = [
  'google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'brave.com', 'baidu.com', 'yandex.com',
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'example.com',
]

function withTimeout(promise, ms, fallback) {
  let timeoutId
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms)
  })
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timeoutId))
}

const SCRAPE_TIMEOUT = Object.freeze({ kind: 'TIMEOUT' })

/** 404s, empty pages and invalid hosts should end this package's crawl at once. */
function isMissingPageError(error) {
  const text = [
    error?.statusCode,
    error?.status,
    error?.code,
    error?.error,
    error?.message,
    typeof error === 'string' ? error : '',
  ]
    .filter((value) => value !== undefined && value !== null)
    .join(' ')
    .toLowerCase()

  return (
    /\b404\b/.test(text) ||
    /not\s+found|page\s+not\s+found|invalid\s+url|no\s+such|could\s+not\s+be\s+resolved|empty\s+(page|content)/.test(text)
  )
}

function packageTokens(update = {}) {
  const raw = String(update.packageName || '').trim()
  const lastPart = raw.replace(/^@/, '').split(/[\/:]/).pop() || ''
  return [...new Set([raw, lastPart, lastPart.replace(/[-_.]/g, '')].map((value) => value.toLowerCase()).filter((value) => value.length >= 3))].slice(0, 4)
}

function isPlausibleSourceUrl(value, update = {}) {
  let parsed
  try {
    parsed = new URL(String(value || '').trim())
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
  if (!hostname || NON_OFFICIAL_HOSTS.some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`))) return false

  const tokens = packageTokens(update)
  if (!tokens.length) return false
  const path = decodeURIComponent(parsed.pathname || '').toLowerCase()
  const ecosystem = String(update.ecosystem || '').toLowerCase()
  const registryDomains = REGISTRY_DOMAINS[ecosystem] || []

  if (registryDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) return true
  if (hostname === 'github.com') return tokens.some((token) => path.includes(token))
  if (tokens.some((token) => hostname.includes(token))) return true
  return tokens.some((token) => path.includes(token)) && /docs?|guide|wiki|manual|release|changelog|package|version/.test(`${hostname}${path}`)
}

const REGISTRY_DOMAINS = {
  npm: ['npmjs.com'],
  pypi: ['pypi.org'],
  maven: ['maven.org', 'mvnrepository.com'],
  crates: ['crates.io', 'docs.rs'],
  packagist: ['packagist.org'],
  rubygems: ['rubygems.org'],
  go: ['go.dev', 'pkg.go.dev', 'golang.org'],
  nuget: ['nuget.org'],
}

let client

export function isFirecrawlConfigured() {
  return Boolean(process.env.FIRECRAWL_API_KEY && process.env.FIRECRAWL_API_KEY.trim())
}

function getClient() {
  if (!isFirecrawlConfigured()) {
    throw new AppError('Firecrawl is not configured. Set FIRECRAWL_API_KEY on the server.', 503)
  }
  if (!client) client = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY })
  return client
}

function hostnameOf(value) {
  try {
    const url = new URL(String(value))
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function trustedDomains(update = {}) {
  const metadata = update.metadata || {}
  const extras = metadata.extras || {}
  const domains = new Set(['github.com', 'raw.githubusercontent.com'])
  for (const domain of REGISTRY_DOMAINS[String(update.ecosystem || '').toLowerCase()] || []) domains.add(domain)
  for (const value of [
    update.registryUrl,
    metadata.homepage,
    metadata.repositoryUrl,
    extras.homepage,
    extras.repositoryUrl,
    extras.documentationUrl,
  ]) {
    const domain = hostnameOf(value)
    if (domain) domains.add(domain)
  }
  return [...domains].slice(0, 20)
}

function addCandidate(list, value, domains) {
  if (!value) return
  const url = hostnameOf(value) ? String(value) : ''
  if (!url) return
  const domain = hostnameOf(url)
  if (domain && !domains.includes(domain) && !domains.some((allowed) => domain.endsWith(`.${allowed}`))) return
  if (!list.includes(url)) list.push(url)
}

function buildCandidates(update = {}) {
  const domains = trustedDomains(update)
  const metadata = update.metadata || {}
  const extras = metadata.extras || {}
  const name = String(update.packageName || '')
  const version = String(update.targetVersion || update.latestStableVersion || update.latestVersion || '')
  const encodedName = encodeURI(name)
  const candidates = []
  const ecosystem = String(update.ecosystem || '').toLowerCase()

  addCandidate(candidates, update.registryUrl, domains)
  addCandidate(candidates, metadata.homepage, domains)
  addCandidate(candidates, extras.documentationUrl, domains)

  const repoUrl = String(metadata.repositoryUrl || '').replace(/\/$/, '')
  if (repoUrl && hostnameOf(repoUrl).endsWith('github.com')) {
    if (version) addCandidate(candidates, `${repoUrl}/releases/tag/v${version}`, domains)
    if (version) addCandidate(candidates, `${repoUrl}/releases/tag/${version}`, domains)
    addCandidate(candidates, `${repoUrl}/releases`, domains)
    addCandidate(candidates, `${repoUrl}/blob/HEAD/CHANGELOG.md`, domains)
  }

  switch (ecosystem) {
    case 'npm':
      addCandidate(candidates, `https://www.npmjs.com/package/${encodedName}`, domains)
      break
    case 'pypi':
      addCandidate(candidates, `https://pypi.org/project/${encodedName}/`, domains)
      break
    case 'crates':
    case 'cargo':
      addCandidate(candidates, `https://crates.io/crates/${encodedName}`, domains)
      break
    case 'packagist':
    case 'composer':
      addCandidate(candidates, `https://packagist.org/packages/${encodedName}`, domains)
      break
    case 'rubygems':
    case 'ruby':
      addCandidate(candidates, `https://rubygems.org/gems/${encodedName}`, domains)
      break
    case 'go':
      addCandidate(candidates, `https://pkg.go.dev/${encodedName}`, domains)
      break
    case 'nuget':
      addCandidate(candidates, `https://www.nuget.org/packages/${encodedName}`, domains)
      break
    case 'maven':
    case 'gradle': {
      const coordinates = metadata.coordinates || {}
      const group = coordinates.groupId || metadata.groupId
      const artifact = coordinates.artifactId || metadata.artifactId || name
      if (group && artifact) {
        addCandidate(candidates, `https://central.sonatype.com/artifact/${group}/${artifact}`, domains)
      }
      break
    }
    default:
      break
  }

  return candidates.slice(0, boundedMs(process.env.AI_MAX_RESEARCH_SOURCES, 3, 1, 5))
}

function normalizeSearchResults(payload = {}) {
  const collections = [
    payload?.data?.web,
    payload?.data?.results,
    payload?.data,
    payload?.web,
    payload?.results,
  ]
  for (const collection of collections) {
    if (Array.isArray(collection)) return collection
  }
  return []
}

async function searchOfficialSources(update, domains) {
  try {
    const query = `"${update.packageName}" ${update.targetVersion || update.latestStableVersion || ''} release notes changelog migration guide`.trim()
    const payload = await cachedAiResult({
      key: `research:search:${update.ecosystem}:${update.packageName}:${update.targetVersion}`,
      ttlMs: Number(process.env.AI_RESEARCH_CACHE_TTL_MS) || 30 * 60 * 1000,
      task: async () => {
        await acquireFirecrawl()
        return getClient().search(query, {
          limit: 5,
          scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
        })
      },
    })

    const results = normalizeSearchResults(payload.data)
    const urls = []
    for (const result of results) {
      const url = String(result?.url || result?.metadata?.url || '')
      const domain = hostnameOf(url)
      if (!domain || !domains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))) continue
      addCandidate(urls, url, domains)
    }
    return urls
  } catch (error) {
    return []
  }
}

/**
 * Last-resort source discovery. The model only proposes likely official URLs;
 * each one must pass host heuristics and the SSRF guard before it is returned.
 */
async function suggestSourceUrls(update = {}) {
  const empty = { urls: [], domains: [], note: '', versionHint: '', used: false }
  if (!isGroqConfigured()) return empty

  let suggestion = null
  try {
    const result = await withTimeout(
      langchainStructuredGenerate({
        schema: researchSourceSuggestionSchema,
        name: 'research_source_suggestion',
        prompt: buildResearchSourceSuggestionPrompt({ update }),
        maxTokens: 900,
        retries: 0,
      }),
      AI_SUGGESTION_TIMEOUT_MS,
      null,
    )
    suggestion = result?.data || null
  } catch {
    return empty
  }

  if (!suggestion?.found || !Array.isArray(suggestion.sources)) {
    return { ...empty, note: suggestion?.note || '', versionHint: suggestion?.versionHint || '', used: true }
  }

  const urls = []
  const domains = new Set()
  for (const candidate of suggestion.sources.slice(0, 4)) {
    const rawUrl = String(candidate?.url || '')
    if (!isPlausibleSourceUrl(rawUrl, update)) continue
    try {
      const safeUrl = await assertSafeExternalUrl(rawUrl)
      const domain = hostnameOf(safeUrl)
      if (!domain || urls.includes(safeUrl)) continue
      urls.push(safeUrl)
      domains.add(domain)
    } catch {
      // An unsafe, unresolvable or off-domain suggestion is simply discarded.
    }
  }

  return {
    urls,
    domains: [...domains],
    note: suggestion.note || '',
    versionHint: suggestion.versionHint || '',
    used: true,
  }
}

function isInjectionError(error) {
  return /prompt.?injection|SCRAPE_PROMPT_INJECTION_DETECTED/i.test(String(error?.message || error))
}

function sourceTypeFromUrl(url, update = {}) {
  const lower = String(url).toLowerCase()
  if (lower.includes('migration')) return 'MIGRATION_GUIDE'
  if (lower.includes('release') || lower.includes('releases/tag')) return 'RELEASE_NOTES'
  if (lower.includes('changelog') || lower.includes('changes')) return 'CHANGELOG'
  if (lower.includes('docs.rs') || lower.includes('pkg.go.dev') || lower.includes('documentation')) return 'OFFICIAL_DOCS'
  if (update.ecosystem === 'npm' && lower.includes('npmjs.com')) return 'OFFICIAL_DOCS'
  return 'OFFICIAL_DOCS'
}

async function scrapeOne({ url, update, domains, origin = 'candidate', deadline = Date.now() + PACKAGE_FIRECRAWL_BUDGET_MS }) {
  const safeUrl = await withTimeout(
    assertSafeExternalUrl(url, { allowedDomains: domains }),
    URL_CHECK_TIMEOUT_MS,
    null,
  )
  if (!safeUrl) {
    return { url, status: 'INVALID_URL', origin, reason: 'The source URL could not be validated in time.' }
  }

  const acquired = await withTimeout(acquireFirecrawl().then(() => true), URL_CHECK_TIMEOUT_MS, false)
  if (!acquired) {
    return { url: safeUrl, status: 'RATE_LIMITED', origin, reason: 'Firecrawl rate limit reached; skipping.' }
  }

  const remaining = Math.max(250, Math.min(SOURCE_SCRAPE_TIMEOUT_MS, deadline - Date.now()))
  const payload = await withTimeout(
    getClient().scrape(safeUrl, {
      formats: ['markdown'],
      onlyMainContent: true,
      checkPromptInjection: true,
      timeout: remaining,
    }),
    remaining,
    SCRAPE_TIMEOUT,
  )

  if (payload === SCRAPE_TIMEOUT) {
    return { url: safeUrl, status: 'TIMEOUT', origin, reason: 'Firecrawl did not respond within the source timeout.' }
  }
  if (payload?.success === false || (Number(payload?.statusCode) >= 400)) {
    const code = Number(payload?.statusCode) || 400
    return {
      url: safeUrl,
      status: code === 404 ? 'MISSING' : 'ERROR',
      origin,
      reason: `Source returned HTTP ${code}.`,
    }
  }

  const content = normalizeDocumentContent(
    payload?.markdown || payload?.content || payload?.text || '',
    AI_LIMITS.maxScrapedContentBytes,
  )
  if (!content || content.length < 120) {
    return { url: safeUrl, status: 'NO_CONTENT', origin, reason: 'The page returned no usable text.' }
  }

  const title = sanitizeText(payload?.metadata?.title || payload?.title, 240)
  let summary = truncate(content, 500)
  let sourceType = sourceTypeFromUrl(safeUrl, update)
  let publishedAt = payload?.metadata?.publishedAt || null

  // Extraction improves the summary but must never extend the package budget.
  const extraction = await withTimeout(
    langchainStructuredGenerate({
      schema: researchExtractionSchema,
      name: 'research_extraction',
      prompt: buildResearchExtractionPrompt({
        update,
        document: { title, url: safeUrl, content },
      }),
      maxTokens: 900,
      retries: 0,
    }),
    Math.min(1_500, Math.max(250, deadline - Date.now())),
    null,
  ).catch(() => null)

  if (extraction?.data) {
    summary = extraction.data.summary || summary
    sourceType = extraction.data.sourceType || sourceType
    const parsedDate = extraction.data.releaseDate ? new Date(extraction.data.releaseDate) : null
    if (parsedDate && !Number.isNaN(parsedDate.getTime())) publishedAt = parsedDate.toISOString()
  }

  return { url: safeUrl, content, title, summary, sourceType, publishedAt, status: 'COMPLETED', origin }
}

async function persistDocument({ result, update, userId, repositoryId, dependencyId }) {
  const sourceUrl = result.url
  const contentHashValue = contentHash(result.content)
  const domain = hostnameOf(sourceUrl)
  const document = await ResearchDocument.findOneAndUpdate(
    { userId, contentHash: contentHashValue, sourceUrl },
    {
      $set: {
        userId,
        repositoryId,
        dependencyId,
        scope: 'PACKAGE',
        packageName: sanitizeText(update.packageName, 214),
        ecosystem: sanitizeText(update.ecosystem, 40),
        version: sanitizeText(update.targetVersion || update.latestStableVersion || '', 80),
        finalUrl: sourceUrl,
        sourceDomain: domain,
        sourceType: result.sourceType,
        title: result.title || `${update.packageName} documentation`,
        content: result.content,
        summary: result.summary,
        metadata: {
          source: result.origin === 'ai-suggested' ? 'Firecrawl + AI source discovery' : 'Firecrawl',
          discoveredBy: result.origin || 'candidate',
          targetVersion: update.targetVersion || '',
          registryUrl: update.registryUrl || '',
          registryMetadata: update.metadata || {},
        },
        // AI-proposed URLs are fetched and checked, but their authenticity is
        // inferred rather than supplied by the registry, so mark them partial.
        official: result.origin !== 'ai-suggested',
        retrievedAt: new Date(),
        publishedAt: result.publishedAt ? new Date(result.publishedAt) : null,
        retrievalStatus: 'COMPLETED',
        retrievalError: '',
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true },
  )
  return {
    ...document.toObject(),
    evidenceId: evidenceId('doc', `${document._id}:${sourceUrl}`),
  }
}

export async function researchPackageUpdate({
  userId,
  repositoryId,
  dependencyId,
  update = {},
  onProgress = () => {},
  isCancelled = () => false,
}) {
  const limitations = []
  if (!isFirecrawlConfigured()) {
    return {
      documents: [],
      status: 'UNAVAILABLE',
      skipped: true,
      limitations: ['Firecrawl is not configured; official documentation could not be retrieved.'],
    }
  }

  const deadline = Date.now() + RESEARCH_DEADLINE_MS
  const domains = trustedDomains(update)
  const scrapeDomains = [...domains]
  const candidates = buildCandidates(update)

  // Search only when metadata gave us nothing to work with. The search is time
  // bounded so an unavailable provider cannot hold up the research job.
  if (!candidates.length) {
    const searchUrls = await withTimeout(searchOfficialSources(update, domains), SEARCH_TIMEOUT_MS, [])
    for (const url of searchUrls) if (candidates.length < 8) addCandidate(candidates, url, domains)
  }

  // Ask AI for likely official website / release URLs and verify every answer
  // before treating it as a source.
  let aiSuggestion = { urls: [], domains: [], note: '', versionHint: '', used: false }
  if (!candidates.length) {
    aiSuggestion = await suggestSourceUrls(update)
    for (const domain of aiSuggestion.domains) if (!scrapeDomains.includes(domain)) scrapeDomains.push(domain)
    for (const url of aiSuggestion.urls) if (candidates.length < 8) addCandidate(candidates, url, scrapeDomains)
    if (aiSuggestion.note) limitations.push(`AI source discovery: ${aiSuggestion.note}`)
    if (aiSuggestion.versionHint) limitations.push(`AI suggested version ${aiSuggestion.versionHint} (unverified hint).`)
  }

  // No known URL and no verified AI suggestion: skip immediately rather than
  // leaving this dependency in RESEARCHING until the whole job times out.
  if (!candidates.length) {
    limitations.push(`No public web source could be found for ${update.packageName || 'this dependency'}; skipped.`)
    return {
      documents: [],
      status: 'NO_SOURCES',
      skipped: true,
      aiSuggestedSourceCount: 0,
      limitations: [...new Set(limitations)].slice(0, 20),
    }
  }

  const documents = []
  let blocked = 0
  let failed = 0
  let timedOut = 0
  let abortedReason = ''

  async function collect(url, origin, processed, total) {
    if (isCancelled() || Date.now() > deadline) {
      timedOut += 1
      abortedReason = 'The Firecrawl package budget was reached.'
      await onProgress({ stage: 'documentationResearch', processed, total })
      return
    }
    let result
    try {
      result = await scrapeOne({ url, update, domains: scrapeDomains, origin, deadline })
    } catch (error) {
      if (isInjectionError(error)) {
        blocked += 1
        abortedReason = `Prompt-injection protection blocked a retrieved page: ${safeUrlApprox(url)}`
      } else {
        failed += 1
        abortedReason = isMissingPageError(error)
          ? `Source is missing or unreachable: ${safeUrlApprox(url)}`
          : `Source failed: ${safeUrlApprox(url)}`
      }
      limitations.push(abortedReason)
      await onProgress({ stage: 'documentationResearch', processed, total })
      return
    }

    if (result.status !== 'COMPLETED') {
      if (result.status === 'TIMEOUT') timedOut += 1
      else failed += 1
      abortedReason = result.reason || `Source returned ${result.status}.`
      limitations.push(`${result.status}: ${abortedReason}`)
      await onProgress({ stage: 'documentationResearch', processed, total })
      return
    }

    // A late scrape is discarded so it cannot write after the worker moved on.
    if (isCancelled() || Date.now() > deadline) {
      timedOut += 1
      abortedReason = 'The Firecrawl package budget was reached.'
      await onProgress({ stage: 'documentationResearch', processed, total })
      return
    }

    try {
      documents.push(await persistDocument({ result, update, userId, repositoryId, dependencyId }))
    } catch (error) {
      // A database hiccup must not throw away content we already retrieved.
      limitations.push(`A retrieved source could not be cached: ${sanitizeError(error)}`)
      documents.push({
        finalUrl: result.url,
        sourceUrl: result.url,
        sourceType: result.sourceType,
        title: result.title,
        summary: result.summary,
        content: result.content,
        publishedAt: result.publishedAt,
        evidenceId: evidenceId('doc', `${result.url}:${contentHash(result.content)}`),
      })
    }

    await onProgress({ stage: 'documentationResearch', processed, total })
  }

  for (const [index, url] of candidates.entries()) {
    if (abortedReason || Date.now() >= deadline) break
    await collect(url, aiSuggestion.urls.includes(url) ? 'ai-suggested' : 'candidate', index + 1, candidates.length)
  }

  if (!documents.length) {
    limitations.push(
      abortedReason
        ? `Crawl stopped immediately (${abortedReason}); dependency handed to the AI fallback.`
        : 'No package-specific official documentation could be retrieved; dependency handed to the AI fallback.',
    )
  }
  if (failed) limitations.push(`${failed} candidate documentation source(s) were unusable.`)
  if (blocked) limitations.push(`${blocked} source(s) were rejected by prompt-injection protection.`)
  if (timedOut) limitations.push(`${timedOut} source(s) were skipped to keep research within its time budget.`)

  return {
    documents,
    status: documents.length ? 'AVAILABLE' : 'NO_SOURCES',
    skipped: !documents.length,
    aborted: Boolean(abortedReason),
    aiSuggestedSourceCount: aiSuggestion.urls.length,
    versionHint: aiSuggestion.versionHint || '',
    limitations: [...new Set(limitations)].slice(0, 20),
  }
}

function safeUrlApprox(url) {
  try {
    const parsed = new URL(String(url))
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.slice(0, 240)
  } catch {
    return 'an external source'
  }
}

export async function listResearchDocuments({ userId, repositoryId, packageName, limit = 30 }) {
  const query = { userId }
  if (repositoryId) query.repositoryId = repositoryId
  if (packageName) query.packageName = { $regex: sanitizeText(packageName, 214), $options: 'i' }
  return ResearchDocument.find(query)
    .sort({ retrievedAt: -1 })
    .limit(Math.max(1, Math.min(100, Number(limit) || 30)))
    .lean()
}

export async function getFirecrawlStatus() {
  return { configured: isFirecrawlConfigured(), provider: 'firecrawl' }
}

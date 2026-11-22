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
import { researchExtractionSchema } from '../schemas/aiSchemas.js'
import { buildResearchExtractionPrompt } from '../prompts/aiPrompts.js'

const acquireFirecrawl = createAiRateLimiter('firecrawl', {
  limit: Number(process.env.AI_FIRECRAWL_LIMIT_PER_MINUTE) || 20,
  windowMs: 60_000,
})

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

  return candidates.slice(0, Number(process.env.AI_MAX_RESEARCH_SOURCES) || 5)
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

async function scrapeOne({ url, update, domains }) {
  const safeUrl = await assertSafeExternalUrl(url, { allowedDomains: domains })
  await acquireFirecrawl()
  const payload = await getClient().scrape(safeUrl, {
    formats: ['markdown'],
    onlyMainContent: true,
    checkPromptInjection: true,
    timeout: Number(process.env.AI_FIRECRAWL_TIMEOUT_MS) || 30_000,
  })

  const content = normalizeDocumentContent(
    payload?.markdown || payload?.content || payload?.text || '',
    AI_LIMITS.maxScrapedContentBytes,
  )
  if (!content || content.length < 120) {
    return { url: safeUrl, status: 'NO_CONTENT', reason: 'The page returned no usable text.' }
  }

  const title = sanitizeText(payload?.metadata?.title || payload?.title, 240)
  let summary = truncate(content, 500)
  let sourceType = sourceTypeFromUrl(safeUrl, update)
  let publishedAt = payload?.metadata?.publishedAt || null

  try {
    const extraction = await langchainStructuredGenerate({
      schema: researchExtractionSchema,
      name: 'research_extraction',
      prompt: buildResearchExtractionPrompt({
        update,
        document: { title, url: safeUrl, content },
      }),
      maxTokens: 1600,
      retries: 1,
    })
    summary = extraction.data.summary || summary
    sourceType = extraction.data.sourceType || sourceType
    const parsedDate = extraction.data.releaseDate ? new Date(extraction.data.releaseDate) : null
    if (parsedDate && !Number.isNaN(parsedDate.getTime())) publishedAt = parsedDate.toISOString()
  } catch {
    // The scraped text is still valid evidence; extraction is an enhancement.
  }

  return { url: safeUrl, content, title, summary, sourceType, publishedAt, status: 'COMPLETED' }
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
          source: 'Firecrawl',
          targetVersion: update.targetVersion || '',
          registryUrl: update.registryUrl || '',
          registryMetadata: update.metadata || {},
        },
        official: true,
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
      limitations: ['Firecrawl is not configured; official documentation could not be retrieved.'],
    }
  }

  const domains = trustedDomains(update)
  const candidates = buildCandidates(update)
  const searchUrls = await searchOfficialSources(update, domains)
  for (const url of searchUrls) if (candidates.length < 8) addCandidate(candidates, url, domains)

  const documents = []
  let blocked = 0
  let failed = 0

  for (const [index, url] of candidates.entries()) {
    if (isCancelled()) throw new AppError('AI analysis cancelled.', 409)
    try {
      const result = await scrapeOne({ url, update, domains })
      if (result.status === 'COMPLETED') {
        documents.push(await persistDocument({ result, update, userId, repositoryId, dependencyId }))
      } else if (result.status === 'NO_CONTENT') {
        failed += 1
      }
    } catch (error) {
      if (isInjectionError(error)) {
        blocked += 1
        limitations.push(`Prompt-injection protection blocked a retrieved page: ${safeUrlApprox(url)}`)
      } else {
        failed += 1
      }
    }
    await onProgress({ stage: 'documentationResearch', processed: index + 1, total: candidates.length })
  }

  if (!documents.length) {
    limitations.push('No package-specific official documentation could be retrieved and verified.')
  }
  if (failed) limitations.push(`${failed} candidate documentation source(s) returned no usable content.`)
  if (blocked) limitations.push(`${blocked} source(s) were rejected by prompt-injection protection.`)

  return {
    documents,
    status: documents.length ? 'AVAILABLE' : 'INSUFFICIENT_EVIDENCE',
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

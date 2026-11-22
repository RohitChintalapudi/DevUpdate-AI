import { requestWithRetry } from '../../../utils/updateHttp.js'
import { createRateLimiter } from './registryRateLimiter.js'

const DEFAULT_TTL_MS = Number(process.env.UPDATE_REGISTRY_CACHE_TTL_MS) || 10 * 60 * 1000
const entries = new Map()
const inFlight = new Map()

function cacheKey(key, url, body) {
  return `${key || url}:${body ? JSON.stringify(body) : ''}`
}

/**
 * Process-local registry cache with ETag/Last-Modified revalidation and
 * in-flight deduplication. Job state remains durable in MongoDB; this cache is
 * intentionally ephemeral and safe to lose on restart.
 */
export async function cachedRegistryJson({
  key,
  url,
  ttlMs = DEFAULT_TTL_MS,
  limiter = 'registry',
  body,
  method = 'GET',
  headers = {},
  maxBytes,
  label = 'Package registry',
  parse = 'json',
}) {
  const id = cacheKey(key, url, body)
  const existing = entries.get(id)
  const now = Date.now()

  if (existing && existing.expiresAt > now && !inFlight.has(id)) {
    return { data: existing.data, cachedAt: existing.cachedAt, notModified: false }
  }

  if (inFlight.has(id)) return inFlight.get(id)

  const task = (async () => {
    const conditionalHeaders = { ...headers }
    if (existing?.etag) conditionalHeaders['If-None-Match'] = existing.etag
    if (existing?.lastModified) conditionalHeaders['If-Modified-Since'] = existing.lastModified

    await createRateLimiter(limiter)()
    const result = await requestWithRetry(url, {
      method,
      headers: conditionalHeaders,
      body,
      maxBytes,
      label,
      parse,
    })

    if (result.notModified && existing) {
      existing.expiresAt = Date.now() + ttlMs
      return { data: existing.data, cachedAt: existing.cachedAt, notModified: true }
    }

    const value = {
      data: parse === 'json' ? result.data : result.text,
      etag: result.response?.headers?.get?.('etag') || null,
      lastModified: result.response?.headers?.get?.('last-modified') || null,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    }
    entries.set(id, value)
    return { data: value.data, cachedAt: value.cachedAt, notModified: false }
  })().finally(() => {
    inFlight.delete(id)
  })

  inFlight.set(id, task)
  return task
}

export function clearRegistryCache() {
  entries.clear()
}

export function registryCacheStats() {
  return { entries: entries.size, inFlight: inFlight.size, ttlMs: DEFAULT_TTL_MS }
}

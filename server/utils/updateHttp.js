import { AppError } from './errors.js'
import { sanitizeError } from './sanitize.js'

const DEFAULT_TIMEOUT_MS = Number(process.env.UPDATE_HTTP_TIMEOUT_MS) || 12000
const DEFAULT_RETRIES = Number(process.env.UPDATE_HTTP_RETRIES) || 2
const DEFAULT_BACKOFF_MS = Number(process.env.UPDATE_HTTP_BACKOFF_MS) || 350
const DEFAULT_MAX_BYTES = 6 * 1024 * 1024

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryAfterMs(response) {
  const value = response?.headers?.get?.('retry-after')
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  if (Number.isFinite(date)) return Math.max(0, date - Date.now())
  return null
}

function isRetryable(error) {
  if (!(error instanceof AppError)) return true
  return [429, 500, 502, 503, 504].includes(error.statusCode)
}

function delayForAttempt(attempt, response) {
  const retryAfter = retryAfterMs(response)
  if (retryAfter !== null) return Math.min(retryAfter, 10000)
  return Math.min(DEFAULT_BACKOFF_MS * 2 ** attempt, 8000)
}

/**
 * Bounded HTTP helper for registry and advisory APIs. Retries only transient
 * failures, caps response size, and never returns an oversized payload.
 */
export async function requestWithRetry(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    parse = 'text',
    maxBytes = DEFAULT_MAX_BYTES,
    label = 'External request',
  } = options

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response

    try {
      response = await fetch(url, { method, headers, body, signal: controller.signal })

      if (response.status === 304) {
        return { response, text: '', data: null, notModified: true }
      }

      if (!response.ok) {
        const status = response.status
        if (status === 404) {
          throw new AppError(`${label}: resource not found.`, 404)
        }
        if (status === 429) {
          throw new AppError(`${label}: rate limit reached.`, 429)
        }
        if (status >= 500) {
          throw new AppError(`${label} is temporarily unavailable (${status}).`, 502)
        }
        throw new AppError(`${label} rejected the request (${status}).`, 502)
      }

      const text = await response.text()
      if (text.length > maxBytes) {
        throw new AppError(`${label} returned a response that is too large.`, 502)
      }

      let data = null
      if (parse === 'json') {
        if (!text) throw new AppError(`${label} returned an empty response.`, 502)
        try {
          data = JSON.parse(text)
        } catch {
          throw new AppError(`${label} returned malformed JSON.`, 502)
        }
      }

      return { response, text, data, notModified: false }
    } catch (error) {
      if (!isRetryable(error) || attempt >= retries) {
        if (error?.name === 'AbortError') {
          throw new AppError(`${label} timed out.`, 504)
        }
        if (error instanceof AppError) throw error
        throw new AppError(`${label} failed: ${sanitizeError(error)}`, 502)
      }

      await sleep(delayForAttempt(attempt, response))
    } finally {
      clearTimeout(timer)
    }
  }
}

export async function fetchJsonWithRetry(url, options = {}) {
  return requestWithRetry(url, { ...options, parse: 'json' })
}

export async function fetchTextWithRetry(url, options = {}) {
  return requestWithRetry(url, { ...options, parse: 'text' })
}

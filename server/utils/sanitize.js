import mongoose from 'mongoose'
import { AppError } from './errors.js'

export function sanitizeText(value, maxLength = 500) {
  if (value === null || value === undefined) return ''
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function sanitizePath(value) {
  if (typeof value !== 'string' || value.length > 2000) return ''
  const cleaned = value.replace(/\\/g, '/').replace(/\0/g, '')
  if (cleaned.includes('..') || cleaned.startsWith('/')) return ''
  return cleaned
}

export function isValidObjectId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)
}

export function requireObjectId(value, label = 'id') {
  if (!isValidObjectId(value)) throw new AppError(`Invalid ${label}.`, 400)
  return value
}

export function sanitizeError(error) {
  const message = sanitizeText(error?.message || 'Unknown error', 300)
  return message.replace(/ghp_[A-Za-z0-9]+|ghs_[A-Za-z0-9]+/g, '[redacted]')
}

export function mapLimit(items, limit, worker) {
  return new Promise((resolve, reject) => {
    const results = new Array(items.length)
    let next = 0
    let running = 0
    let settled = false

    const runNext = () => {
      if (settled) return
      if (next >= items.length) {
        if (running === 0) {
          settled = true
          resolve(results)
        }
        return
      }
      const index = next++
      running++
      Promise.resolve()
        .then(() => worker(items[index], index))
        .then((result) => {
          results[index] = result
        })
        .catch((error) => {
          settled = true
          reject(error)
        })
        .finally(() => {
          running--
          runNext()
        })
    }

    for (let i = 0; i < Math.min(limit, items.length); i += 1) runNext()
  })
}

export function withTimeout(promise, ms, message = 'Operation timed out') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new AppError(message, 504)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

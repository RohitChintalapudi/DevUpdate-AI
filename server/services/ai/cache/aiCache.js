const entries = new Map()
const inFlight = new Map()

export async function cachedAiResult({ key, ttlMs = 10 * 60 * 1000, task }) {
  const id = String(key || '')
  const existing = entries.get(id)
  const now = Date.now()
  if (existing && existing.expiresAt > now) return { data: existing.data, cached: true }
  if (inFlight.has(id)) return { data: await inFlight.get(id), cached: true }

  const pending = Promise.resolve()
    .then(task)
    .then((data) => {
      entries.set(id, { data, expiresAt: Date.now() + ttlMs })
      return data
    })
    .finally(() => inFlight.delete(id))

  inFlight.set(id, pending)
  return { data: await pending, cached: false }
}

export function clearAiCache() {
  entries.clear()
}

export function aiCacheStats() {
  return { entries: entries.size, inFlight: inFlight.size }
}

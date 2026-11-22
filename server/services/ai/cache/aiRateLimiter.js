const limiters = new Map()

/**
 * Small process-local token bucket. External providers still enforce their own
 * limits; this prevents a single analysis workflow from saturating them.
 */
export function createAiRateLimiter(name, { limit = 20, windowMs = 60_000 } = {}) {
  const key = String(name || 'default')
  if (!limiters.has(key)) limiters.set(key, { tokens: limit, updatedAt: Date.now(), waiters: [] })
  const state = limiters.get(key)

  const refill = () => {
    const now = Date.now()
    const elapsed = now - state.updatedAt
    if (elapsed <= 0) return
    state.tokens = Math.min(limit, state.tokens + Math.floor((elapsed * limit) / windowMs))
    state.updatedAt = now
  }

  return async function acquire() {
    for (;;) {
      refill()
      if (state.tokens > 0) {
        state.tokens -= 1
        return
      }
      await new Promise((resolve) => {
        state.waiters.push(resolve)
        setTimeout(resolve, Math.max(50, Math.ceil(windowMs / limit)))
      })
      state.waiters.splice(0, state.waiters.length)
    }
  }
}

export function resetAiRateLimiters() {
  limiters.clear()
}

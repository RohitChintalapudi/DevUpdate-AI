import { sleep } from '../../../utils/updateHttp.js'

const buckets = new Map()

class TokenBucket {
  constructor(capacity, refillPerSecond) {
    this.capacity = capacity
    this.refillPerSecond = refillPerSecond
    this.tokens = capacity
    this.updatedAt = Date.now()
  }

  refill() {
    const now = Date.now()
    const elapsed = Math.max(0, now - this.updatedAt) / 1000
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond)
    this.updatedAt = now
  }
}

export function createRateLimiter(name, capacity = 30, refillPerSecond = 8) {
  if (!buckets.has(name)) buckets.set(name, new TokenBucket(capacity, refillPerSecond))
  const bucket = buckets.get(name)

  return async function take() {
    while (true) {
      bucket.refill()
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1
        return
      }
      await sleep(Math.ceil(((1 - bucket.tokens) / bucket.refillPerSecond) * 1000))
    }
  }
}

export function resetRateLimiters() {
  buckets.clear()
}

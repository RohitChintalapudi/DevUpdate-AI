import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapLimit,
  sanitizeError,
  sanitizePath,
  sanitizeText,
  withTimeout,
} from '../utils/sanitize.js'

test('sanitizeText collapses whitespace, removes controls and truncates', () => {
  assert.equal(sanitizeText('  Hello\u0000\nworld\t!  '), 'Hello world !')
  assert.equal(sanitizeText(null), '')
  assert.equal(sanitizeText('abcdef', 3), 'abc')
})

test('sanitizePath normalizes separators and rejects unsafe paths', () => {
  assert.equal(sanitizePath('src\\app\\index.js'), 'src/app/index.js')
  assert.equal(sanitizePath('../secret.txt'), '')
  assert.equal(sanitizePath('/etc/passwd'), '')
  assert.equal(sanitizePath('a'.repeat(2001)), '')
})

test('sanitizeError redacts GitHub tokens', () => {
  assert.equal(sanitizeError(new Error('failed with ghp_abc123XYZ and ghs_def456')), 'failed with [redacted] and [redacted]')
})

test('mapLimit preserves input order and never exceeds the concurrency limit', async () => {
  let active = 0
  let peak = 0
  const results = await mapLimit([5, 1, 3, 2], 2, async (delay, index) => {
    active += 1
    peak = Math.max(peak, active)
    await new Promise((resolve) => setTimeout(resolve, delay))
    active -= 1
    return index * 10
  })

  assert.deepEqual(results, [0, 10, 20, 30])
  assert.equal(peak, 2)
})

test('mapLimit rejects as soon as a worker fails', async () => {
  await assert.rejects(
    mapLimit([1, 2, 3], 2, async (value) => {
      if (value === 2) throw new Error('worker failed')
      return value
    }),
    /worker failed/,
  )
})

test('withTimeout resolves fast work and rejects slow work with a 504', async () => {
  assert.equal(await withTimeout(Promise.resolve('done'), 100), 'done')
  const slow = new Promise((resolve) => setTimeout(() => resolve('late'), 100))
  await assert.rejects(
    withTimeout(slow, 10, 'too slow'),
    (error) => error.message === 'too slow' && error.statusCode === 504,
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'

process.env.JWT_SECRET ||= 'test-jwt-secret-that-is-long-enough'
process.env.CLIENT_URL ||= 'http://localhost:5173'
process.env.GITHUB_CLIENT_ID ||= 'test-client-id'
process.env.GITHUB_CLIENT_SECRET ||= 'test-client-secret'
process.env.GITHUB_CALLBACK_URL ||= 'http://localhost:5000/api/github/callback'

const { resolveConnectionState } = await import('../controllers/githubController.js')

test('a valid saved connection stays connected', () => {
  const state = resolveConnectionState({
    connection: { status: 'CONNECTED', accessToken: 'encrypted-token' },
    validation: { valid: true },
  })

  assert.equal(state.connected, true)
  assert.equal(state.status, 'CONNECTED')
  assert.equal(state.tokenValid, true)
  assert.equal(state.tokenIssue, '')
})

test('an expired token disconnects the GitHub connection', () => {
  const state = resolveConnectionState({
    connection: { status: 'CONNECTED', accessToken: 'encrypted-token' },
    validation: { valid: false, reason: 'EXPIRED' },
  })

  assert.equal(state.connected, false)
  assert.equal(state.status, 'EXPIRED')
  assert.equal(state.tokenValid, false)
  assert.equal(state.tokenIssue, 'EXPIRED')
  assert.match(state.message, /reconnect/i)
})

test('temporary GitHub outages never disconnect a saved connection', () => {
  const state = resolveConnectionState({
    connection: { status: 'CONNECTED', accessToken: 'encrypted-token' },
    validation: { valid: false, reason: 'UNAVAILABLE' },
  })

  assert.equal(state.connected, true)
  assert.equal(state.status, 'CONNECTED')
  assert.equal(state.tokenIssue, 'UNAVAILABLE')
})

test('an EXPIRED connection stays disconnected on later status checks', () => {
  const state = resolveConnectionState({
    connection: { status: 'EXPIRED', accessToken: 'encrypted-token' },
    validation: { valid: true },
  })

  assert.equal(state.connected, false)
  assert.equal(state.status, 'EXPIRED')
})

test('a connection with no stored token is treated as expired', () => {
  const state = resolveConnectionState({
    connection: { status: 'CONNECTED' },
    validation: { valid: true },
  })

  assert.equal(state.connected, false)
  assert.equal(state.status, 'EXPIRED')
  assert.equal(state.tokenIssue, 'EXPIRED')
})

test('an explicit disconnect is reported as disconnected', () => {
  const state = resolveConnectionState({ connection: { status: 'DISCONNECTED' } })

  assert.equal(state.connected, false)
  assert.equal(state.status, 'DISCONNECTED')
})

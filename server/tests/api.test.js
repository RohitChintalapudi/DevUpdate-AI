import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-jwt-secret-that-is-long-enough'
process.env.CLIENT_URL ||= 'http://localhost:5173'
process.env.GITHUB_CLIENT_ID ||= 'test-client-id'
process.env.GITHUB_CLIENT_SECRET ||= 'test-client-secret'
process.env.GITHUB_CALLBACK_URL ||= 'http://localhost:5000/api/github/callback'

const { default: app } = await import('../app.js')
const { getOAuthAuthorizeUrl } = await import('../services/githubService.js')
const { signToken, cookieOptions } = await import('../services/authService.js')
const jwt = (await import('jsonwebtoken')).default

test('OAuth authorize URL uses the configured client, callback and repository scopes', () => {
  const url = new URL(getOAuthAuthorizeUrl('test-state'))
  assert.equal(url.origin, 'https://github.com')
  assert.equal(url.pathname, '/login/oauth/authorize')
  assert.equal(url.searchParams.get('client_id'), 'test-client-id')
  assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:5000/api/github/callback')
  assert.match(url.searchParams.get('scope'), /repo/)
  assert.equal(url.searchParams.get('state'), 'test-state')
})

test('health endpoint is public', async () => {
  const response = await request(app).get('/api/health')
  assert.equal(response.status, 200)
  assert.equal(response.body.success, true)
})

test('GitHub, repository and dependency routes require authentication', async () => {
  const routes = [
    '/api/github/status',
    '/api/repositories',
    '/api/repositories/64b7f9f2c9e77c0012345678',
    '/api/dependencies',
    '/api/dependencies/64b7f9f2c9e77c0012345678',
  ]

  for (const route of routes) {
    const response = await request(app).get(route)
    assert.equal(response.status, 401, `${route} should require authentication`)
    assert.equal(response.body.success, false)
  }
})

test('state-changing repository routes still require authentication after CSRF', async () => {
  const response = await request(app)
    .post('/api/repositories/sync')
    .set('Cookie', ['csrfToken=test-csrf-token'])
    .set('X-CSRF-Token', 'test-csrf-token')

  assert.equal(response.status, 401)
  assert.match(response.body.message, /not signed in/i)
})

test('invalid state-changing requests are rejected by CSRF middleware', async () => {
  const response = await request(app).post('/api/repositories/sync')
  assert.equal(response.status, 403)
  assert.match(response.body.message, /CSRF/i)
})

test('GitHub callback rejects missing or mismatched state without creating a connection', async () => {
  const response = await request(app)
    .get('/api/github/callback?installation_id=123&state=invalid')
    .set('Cookie', ['githubState=different-state'])
    .redirects(0)

  assert.equal(response.status, 302)
  assert.match(response.headers.location, /github=error/)
})

test('unknown API routes return JSON 404', async () => {
  const response = await request(app).get('/api/does-not-exist')
  assert.equal(response.status, 404)
  assert.equal(response.body.success, false)
})

test('access tokens and auth cookies expire strictly within 24 hours', () => {
  const token = signToken('64b7f9f2c9e77c0012345678')
  const decoded = jwt.decode(token)
  assert.ok(decoded.exp)
  assert.ok(decoded.iat)
  // 24 hours = 86400 seconds
  const lifetimeSeconds = decoded.exp - decoded.iat
  assert.equal(lifetimeSeconds, 86400, 'JWT token lifetime must be exactly 24 hours')

  const cookie = cookieOptions(false)
  assert.equal(cookie.maxAge, 24 * 60 * 60 * 1000, 'Cookie maxAge must be 24 hours (86,400,000 ms)')
  const rememberCookie = cookieOptions(true)
  assert.equal(rememberCookie.maxAge, 24 * 60 * 60 * 1000, 'Remember cookie maxAge must also be strictly capped at 24 hours')
})

test('expired access tokens are rejected with 401 requiring re-login', async () => {
  // Sign a token that expired 1 hour ago
  const expiredToken = jwt.sign(
    { id: '64b7f9f2c9e77c0012345678', exp: Math.floor(Date.now() / 1000) - 3600 },
    process.env.JWT_SECRET,
  )

  const response = await request(app)
    .get('/api/repositories')
    .set('Cookie', [`token=${expiredToken}`])

  assert.equal(response.status, 401)
  assert.equal(response.body.success, false)
  assert.match(response.body.message, /expired/i)
})

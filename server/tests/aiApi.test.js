import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-jwt-secret-that-is-long-enough'
process.env.CLIENT_URL ||= 'http://localhost:5173'
process.env.GITHUB_CLIENT_ID ||= 'test-client-id'
process.env.GITHUB_CLIENT_SECRET ||= 'test-client-secret'
process.env.GITHUB_CALLBACK_URL ||= 'http://localhost:5000/api/github/callback'
process.env.AI_API_RATE_LIMIT ||= '300'

const { default: app } = await import('../app.js')

const repositoryId = '64b7f9f2c9e77c0012345678'
const dependencyId = '64b7f9f2c9e77c0012345679'
const jobId = '64b7f9f2c9e77c001234567a'
const analysisId = '64b7f9f2c9e77c001234567b'
const conversationId = '64b7f9f2c9e77c001234567c'
const csrf = { Cookie: ['csrfToken=test-csrf-token'], 'X-CSRF-Token': 'test-csrf-token' }

test('AI read endpoints require authentication', async () => {
  const routes = [
    '/api/ai/overview',
    '/api/ai/status',
    '/api/ai/recommendations',
    '/api/ai/research/documents',
    `/api/ai/jobs/repository/${repositoryId}`,
    `/api/ai/jobs/${jobId}`,
    `/api/ai/analysis/${analysisId}`,
    `/api/ai/chat/${repositoryId}/conversations`,
    `/api/ai/chat/${repositoryId}/conversations/${conversationId}`,
  ]

  for (const route of routes) {
    const response = await request(app).get(route)
    assert.equal(response.status, 401, `${route} should require authentication`)
    assert.equal(response.body.success, false)
  }
})

test('AI state-changing endpoints require authentication after CSRF', async () => {
  const cases = [
    { method: 'post', path: `/api/ai/analyze/repository/${repositoryId}` },
    { method: 'post', path: `/api/ai/analyze/dependency/${repositoryId}/${dependencyId}` },
    { method: 'post', path: `/api/ai/research/dependency/${repositoryId}/${dependencyId}` },
    { method: 'post', path: `/api/ai/jobs/${jobId}/cancel` },
    { method: 'post', path: `/api/ai/chat/${repositoryId}` },
    { method: 'delete', path: `/api/ai/chat/conversations/${conversationId}` },
  ]

  for (const item of cases) {
    const response = await request(app)[item.method](item.path).set(csrf)
    assert.equal(response.status, 401, `${item.path} should require authentication`)
    assert.equal(response.body.success, false)
  }
})

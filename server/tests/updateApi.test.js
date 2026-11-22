import assert from 'node:assert/strict'
import test from 'node:test'
import request from 'supertest'

process.env.JWT_SECRET ||= 'test-jwt-secret-that-is-long-enough'
process.env.CLIENT_URL ||= 'http://localhost:5173'
process.env.GITHUB_CLIENT_ID ||= 'test-client-id'
process.env.GITHUB_CLIENT_SECRET ||= 'test-client-secret'
process.env.GITHUB_CALLBACK_URL ||= 'http://localhost:5000/api/github/callback'

const { default: app } = await import('../app.js')
const Dependency = (await import('../models/Dependency.js')).default
const DependencyUpdate = (await import('../models/DependencyUpdate.js')).default
const Repository = (await import('../models/Repository.js')).default
const UpdateHistory = (await import('../models/UpdateHistory.js')).default
const UpdateJob = (await import('../models/UpdateJob.js')).default
const { queueRepositoryUpdate } = await import('../services/updateIntelligence/updateEngine/updateScheduler.js')
const { detectChanges, snapshotFrom } = await import('../services/updateIntelligence/updateEngine/historyService.js')

const repositoryId = '64b7f9f2c9e77c0012345678'
const dependencyId = '64b7f9f2c9e77c0012345679'
const userId = '64b7f9f2c9e77c0012345680'

test('all update intelligence endpoints require authentication', async () => {
  const routes = [
    '/api/updates/overview',
    '/api/updates/repositories',
    '/api/updates/list',
    '/api/updates/vulnerabilities',
    `/api/updates/repository/${repositoryId}`,
    `/api/updates/status/${repositoryId}`,
    `/api/updates/dependency/${dependencyId}`,
    `/api/updates/history/${dependencyId}`,
  ]

  for (const route of routes) {
    const response = await request(app).get(route)
    assert.equal(response.status, 401, `${route} should require authentication`)
    assert.equal(response.body.success, false)
  }
})

test('update triggering endpoints require authentication after CSRF', async () => {
  const routes = [
    '/api/updates/check-all',
    `/api/updates/repository/${repositoryId}/check`,
    `/api/updates/dependency/${dependencyId}/check`,
  ]

  for (const route of routes) {
    const response = await request(app)
      .post(route)
      .set('Cookie', ['csrfToken=test-csrf-token'])
      .set('X-CSRF-Token', 'test-csrf-token')
    assert.equal(response.status, 401, `${route} should require authentication`)
  }
})

test('a second update job for the same repository and user is rejected', async () => {
  const originalRepoFindOne = Repository.findOne
  const originalDependencyCount = Dependency.countDocuments
  const originalJobFindOne = UpdateJob.findOne

  Repository.findOne = async () => ({ _id: repositoryId, userId })
  Dependency.countDocuments = async () => 3
  UpdateJob.findOne = async () => ({ _id: '64b7f9f2c9e77c0012345690', status: 'SCANNING' })

  try {
    await assert.rejects(
      () => queueRepositoryUpdate({ userId, repositoryId }),
      (error) => error.statusCode === 409 && Boolean(error.updateJob),
    )
  } finally {
    Repository.findOne = originalRepoFindOne
    Dependency.countDocuments = originalDependencyCount
    UpdateJob.findOne = originalJobFindOne
  }
})

test('history snapshots record first sightings and meaningful changes', () => {
  const first = {
    updateStatus: 'UP_TO_DATE',
    updateType: 'NONE',
    latestStableVersion: '18.3.1',
    securityStatus: 'NO_KNOWN_VULNERABILITY',
    vulnerabilities: [],
    deprecated: false,
  }
  assert.deepEqual(detectChanges(null, first), ['First update intelligence snapshot'])

  const second = {
    ...first,
    updateStatus: 'OUTDATED',
    updateType: 'MAJOR',
    latestStableVersion: '19.1.0',
    securityStatus: 'VULNERABLE',
    vulnerabilities: [{ id: 'GHSA-test-0000-0000' }],
    deprecated: true,
  }
  const changes = detectChanges(first, second)
  assert.ok(changes.includes('updateStatus'))
  assert.ok(changes.includes('updateType'))
  assert.ok(changes.includes('latestStableVersion'))
  assert.ok(changes.includes('securityStatus'))
  assert.ok(changes.includes('vulnerabilities'))
  assert.ok(changes.includes('deprecated'))
  assert.deepEqual(snapshotFrom(second).advisoryIds, ['GHSA-test-0000-0000'])
})

test('dependency detail queries are scoped to the signed-in user', async () => {
  const { dependencyDetails } = await import('../controllers/updateController.js')
  const originalUpdateFindOne = DependencyUpdate.findOne
  const originalHistoryFind = UpdateHistory.find
  const originalRepoFindOne = Repository.findOne
  let updateQuery

  DependencyUpdate.findOne = (query) => {
    updateQuery = query
    return {
      lean: async () => ({
        _id: '64b7f9f2c9e77c0012345691',
        dependencyId,
        userId,
        repositoryId,
      }),
    }
  }
  UpdateHistory.find = () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) })
  Repository.findOne = () => ({ select: () => ({ lean: async () => null }) })

  let responseBody
  const res = {
    status() {
      return this
    },
    json(payload) {
      responseBody = payload
      return this
    },
  }

  try {
    await dependencyDetails({ user: { _id: userId }, params: { dependencyId } }, res, (error) => {
      throw error
    })
    assert.deepEqual(updateQuery, { _id: dependencyId, userId })
    assert.equal(responseBody.success, true)
  } finally {
    DependencyUpdate.findOne = originalUpdateFindOne
    UpdateHistory.find = originalHistoryFind
    Repository.findOne = originalRepoFindOne
  }
})

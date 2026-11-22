import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterUpdates,
  formatDate,
  paginate,
  securityStatusLabel,
  sortUpdates,
  updateStatusLabel,
} from './updateHelpers.js'

const updates = [
  {
    _id: '1',
    packageName: 'react',
    ecosystem: 'npm',
    repositoryId: 'repo-a',
    updateType: 'MAJOR',
    securityStatus: 'VULNERABLE',
    lastCheckedAt: '2026-01-03T00:00:00Z',
  },
  {
    _id: '2',
    packageName: 'django',
    ecosystem: 'PyPI',
    repositoryId: 'repo-b',
    updateType: 'PATCH',
    securityStatus: 'NO_KNOWN_VULNERABILITY',
    lastCheckedAt: '2026-01-01T00:00:00Z',
  },
  {
    _id: '3',
    packageName: 'serde',
    ecosystem: 'Cargo',
    repositoryId: 'repo-a',
    updateType: 'MINOR',
    securityStatus: 'SECURITY_DATA_UNAVAILABLE',
    lastCheckedAt: '2026-01-02T00:00:00Z',
  },
]

test('filters narrow by search, ecosystem, repository and security state', () => {
  assert.equal(filterUpdates(updates, { search: 'REA' }).length, 1)
  assert.equal(filterUpdates(updates, { ecosystem: 'Cargo' })[0].packageName, 'serde')
  assert.equal(filterUpdates(updates, { repositoryId: 'repo-a' }).length, 2)
  assert.equal(filterUpdates(updates, { securityStatus: 'VULNERABLE' }).length, 1)
  assert.equal(filterUpdates(updates, { updateType: 'PATCH' })[0].packageName, 'django')
})

test('sorting supports name order and newest checks first', () => {
  assert.deepEqual(sortUpdates(updates, 'name').map((item) => item.packageName), ['django', 'react', 'serde'])
  assert.deepEqual(sortUpdates(updates, 'checked').map((item) => item._id), ['1', '3', '2'])
})

test('pagination returns the requested slice and metadata', () => {
  const pageTwo = paginate(sortUpdates(updates, 'checked'), 2, 2)
  assert.deepEqual(pageTwo.items.map((item) => item._id), ['2'])
  assert.equal(pageTwo.pagination.page, 2)
  assert.equal(pageTwo.pagination.total, 3)
  assert.equal(pageTwo.pagination.pages, 2)
})

test('formatters degrade gracefully and labels are explicit', () => {
  assert.equal(formatDate(null), '—')
  assert.equal(formatDate('not-a-date'), '—')
  assert.equal(updateStatusLabel.OUTDATED, 'Outdated')
  assert.equal(securityStatusLabel.SECURITY_DATA_UNAVAILABLE, 'Security data unavailable')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  categoryForType,
  formatDayLabel,
  formatRelativeTime,
  getNotificationDestination,
  groupNotificationsByDay,
  matchesNotificationFilters,
} from './notificationHelpers.js'

const NOW = new Date(2026, 0, 15, 12, 0, 0).getTime()
const at = (minutesAgo) => new Date(NOW - minutesAgo * 60 * 1000).toISOString()

test('formatRelativeTime covers recent and older events', () => {
  assert.equal(formatRelativeTime(at(0), NOW), 'just now')
  assert.equal(formatRelativeTime(at(5), NOW), '5 min ago')
  assert.equal(formatRelativeTime(at(90), NOW), '2 hrs ago')
  assert.equal(formatRelativeTime(at(60 * 25), NOW), 'yesterday')
  assert.equal(formatRelativeTime(at(60 * 24 * 3), NOW), '3 days ago')
  assert.equal(formatRelativeTime(null, NOW), '—')
  assert.equal(formatRelativeTime('not-a-date', NOW), '—')
})

test('day labels and grouping keep chronological sections', () => {
  const items = [
    { _id: 'a', createdAt: at(5) },
    { _id: 'b', createdAt: at(30) },
    { _id: 'c', createdAt: at(60 * 24) },
    { _id: 'd', createdAt: at(60 * 24 * 4) },
  ]
  const groups = groupNotificationsByDay(items, NOW)

  assert.equal(groups[0].label, 'Today')
  assert.equal(groups[1].label, 'Yesterday')
  assert.match(groups[2].label, /11/)
  assert.deepEqual(groups.map((group) => group.items.length), [2, 1, 1])
  assert.equal(formatDayLabel(at(5), NOW), 'Today')
})

test('types map to stable UI categories', () => {
  assert.equal(categoryForType('SECURITY_VULNERABILITY'), 'security')
  assert.equal(categoryForType('MAJOR_UPDATE'), 'updates')
  assert.equal(categoryForType('AI_ANALYSIS_COMPLETED'), 'ai')
  assert.equal(categoryForType('SCAN_FAILED'), 'system')
  assert.equal(categoryForType('SOMETHING_NEW'), 'system')
})

test('notification destinations follow the most specific available target', () => {
  assert.deepEqual(
    getNotificationDestination({ analysisId: 'an1', repositoryId: 'r1' }),
    { path: '/dashboard/ai/analysis/an1', label: 'View analysis' },
  )
  assert.deepEqual(
    getNotificationDestination({ dependencyId: 'd1', type: 'SECURITY_VULNERABILITY' }),
    { path: '/dashboard/updates/d1', label: 'View update' },
  )
  assert.deepEqual(
    getNotificationDestination({ type: 'SECURITY_VULNERABILITY' }),
    { path: '/dashboard/vulnerabilities', label: 'View advisories' },
  )
  assert.deepEqual(
    getNotificationDestination({ repositoryId: 'r1' }),
    { path: '/dashboard/repositories/r1', label: 'View repository' },
  )
  assert.deepEqual(getNotificationDestination(null), { path: '/dashboard/notifications', label: 'Open inbox' })
})

test('filters combine search, unread, repository and category', () => {
  const item = {
    title: 'Security advisory',
    message: 'express has a high severity advisory',
    type: 'SECURITY_VULNERABILITY',
    repositoryId: 'repo-1',
    readAt: null,
    data: { packageName: 'express' },
  }

  assert.equal(matchesNotificationFilters(item, { search: 'EXPRESS' }, 'acme/api'), true)
  assert.equal(matchesNotificationFilters(item, { search: 'missing' }, 'acme/api'), false)
  assert.equal(matchesNotificationFilters(item, { unreadOnly: true }), true)
  assert.equal(matchesNotificationFilters({ ...item, readAt: at(1) }, { unreadOnly: true }), false)
  assert.equal(matchesNotificationFilters(item, { repositoryId: 'repo-2' }), false)
  assert.equal(matchesNotificationFilters(item, { category: 'security' }), true)
  assert.equal(matchesNotificationFilters(item, { category: 'ai' }), false)
  assert.equal(matchesNotificationFilters({ ...item, readAt: at(1) }, { category: 'unread' }), false)
})

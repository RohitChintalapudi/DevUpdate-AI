import assert from 'node:assert/strict'
import test from 'node:test'

import { UNIVERSAL_DEPENDENCIES } from '../constants/universalDependencies.js'
import {
  clearUniversalCatalogCache,
  getUniversalCatalog,
} from '../services/updateIntelligence/universal/universalCatalogService.js'

test('universal catalog holds 20-25 widely used technologies with stack notes', () => {
  assert.ok(UNIVERSAL_DEPENDENCIES.length >= 20)
  assert.ok(UNIVERSAL_DEPENDENCIES.length <= 25)

  const names = new Set(UNIVERSAL_DEPENDENCIES.map((item) => item.name))
  for (const expected of [
    'C++',
    'Java',
    'Python',
    'JavaScript',
    'React',
    'TypeScript',
    'Node.js',
    'Express.js',
    'MongoDB',
    'MySQL',
  ]) {
    assert.ok(names.has(expected), `missing ${expected}`)
  }
  for (const item of UNIVERSAL_DEPENDENCIES) {
    assert.ok(item.stackNote && item.updateNote, `${item.name} needs notes`)
  }
})

test('universal catalog uses live registry versions and falls back to curated versions', async () => {
  clearUniversalCatalogCache()
  const { items, stats } = await getUniversalCatalog({
    fetchJson: async (url) => (url.includes('registry.npmjs.org') ? { version: '19.2.0' } : null),
  })

  const react = items.find((item) => item.id === 'react')
  const python = items.find((item) => item.id === 'python')

  assert.equal(react.latestVersion, '19.2.0')
  assert.equal(react.versionSource, 'live')
  assert.equal(python.latestVersion, '3.13')
  assert.equal(python.versionSource, 'curated')
  assert.equal(stats.total, UNIVERSAL_DEPENDENCIES.length)
  assert.ok(stats.live >= 1)
  assert.ok(stats.curated >= 1)
})

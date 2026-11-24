import assert from 'node:assert/strict'
import test from 'node:test'

import { clearPopularityCache, rankDependencies } from '../services/updateIntelligence/popularity/dependencyPopularityService.js'

function npmPackage(packageName, overrides = {}) {
  return {
    ecosystem: 'npm',
    packageName,
    dependencyType: 'runtime',
    sourceManifest: 'package.json',
    resolvedVersion: '1.0.0',
    ...overrides,
  }
}

test('popularity ranking keeps the bounded top set by real download counts', async () => {
  clearPopularityCache()
  const downloads = {
    react: 12_000_000,
    lodash: 4_000_000,
    axios: 1_000_000,
    express: 800_000,
    vite: 400_000,
    tiny: 10,
  }
  const dependencies = Object.keys(downloads).map((name) => npmPackage(name))

  const { selected, stats } = await rankDependencies(dependencies, {
    limit: 5,
    fetchJson: async (url) => ({ downloads: downloads[decodeURIComponent(url.split('/').pop())] || 0 }),
  })

  assert.deepEqual(
    selected.map((dependency) => dependency.packageName),
    ['react', 'lodash', 'axios', 'express', 'vite'],
  )
  assert.equal(stats.discovered, 6)
  assert.equal(stats.kept, 5)
  assert.equal(selected[0].popularitySource, 'npm-weekly-downloads')
  assert.ok(selected[0].popularityScore > selected[1].popularityScore)
})

test('popularity ranking dedupes package identities and prefers resolved versions', async () => {
  clearPopularityCache()
  const dependencies = [
    npmPackage('react', { sourceManifest: 'package-lock.json', resolvedVersion: '18.0.0' }),
    npmPackage('react', { sourceManifest: 'package.json', resolvedVersion: '' }),
  ]

  const { selected, stats } = await rankDependencies(dependencies, {
    limit: 5,
    fetchJson: async () => ({ downloads: 1_000_000 }),
  })

  assert.equal(stats.discovered, 1)
  assert.equal(selected.length, 1)
  assert.equal(selected[0].resolvedVersion, '18.0.0')
})

test('popularity ranking falls back to reputation signals when download APIs fail', async () => {
  clearPopularityCache()
  const dependencies = [
    npmPackage('tiny-unknown', { sourceManifest: 'packages/app/package.json', dependencyType: 'development' }),
    npmPackage('react'),
  ]

  const { selected } = await rankDependencies(dependencies, {
    limit: 1,
    budgetMs: 1_000,
    fetchJson: async () => null,
  })

  assert.equal(selected[0].packageName, 'react')
  assert.equal(selected[0].popularityDownloads, 0)
  assert.ok(['curated', 'heuristic'].includes(selected[0].popularitySource))
})

function downloadMapFixture() {
  const downloads = {
    react: 12_000_000,
    lodash: 4_000_000,
    axios: 1_000_000,
    express: 800_000,
    vite: 400_000,
    tiny: 10,
  }
  return {
    downloads,
    dependencies: Object.keys(downloads).map((name) => npmPackage(name)),
    fetchJson: async (url) => ({
      downloads: downloads[decodeURIComponent(url.split('/').pop())] || 0,
    }),
  }
}

test('AI layer selects the popular subset from every discovered dependency', async () => {
  clearPopularityCache()
  const fixture = downloadMapFixture()
  let seen = null

  const { selected, candidates, stats } = await rankDependencies(fixture.dependencies, {
    limit: 3,
    fetchJson: fixture.fetchJson,
    selectAiDependencyIndexes: async (input) => {
      seen = { candidateCount: input.candidates.length, limit: input.limit }
      return { indexes: [5, 0, 2], error: '' }
    },
  })

  assert.equal(seen.candidateCount, 6)
  assert.equal(seen.limit, 3)
  assert.equal(candidates.length, 6)
  assert.deepEqual(
    selected.map((dependency) => dependency.packageName),
    ['tiny', 'react', 'axios'],
  )
  assert.deepEqual(selected.map((dependency) => dependency.popularityRank), [1, 2, 3])
  assert.equal(stats.selectionSource, 'ai')
  assert.equal(stats.aiSelected, 3)
  assert.equal(stats.aiCandidates, 6)
})

test('AI selection failure falls back to deterministic popularity order', async () => {
  clearPopularityCache()
  const fixture = downloadMapFixture()

  const { selected, stats } = await rankDependencies(fixture.dependencies, {
    limit: 3,
    fetchJson: fixture.fetchJson,
    selectAiDependencyIndexes: async () => {
      throw new Error('AI selector unavailable')
    },
  })

  assert.deepEqual(
    selected.map((dependency) => dependency.packageName),
    ['react', 'lodash', 'axios'],
  )
  assert.equal(stats.selectionSource, 'deterministic')
  assert.match(stats.aiError, /AI selector unavailable/)
})

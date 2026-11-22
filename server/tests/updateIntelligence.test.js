import assert from 'node:assert/strict'
import test from 'node:test'

// Keep external calls deterministic: no retries/backoff for unit tests.
process.env.UPDATE_HTTP_RETRIES ||= '0'
process.env.UPDATE_HTTP_BACKOFF_MS ||= '1'
process.env.OSV_API_BASE_URL = 'https://osv.test'

const { fetchNpmMetadata } = await import('../services/updateIntelligence/registries/npmRegistry.js')
const { fetchPyPIMetadata } = await import('../services/updateIntelligence/registries/pypiRegistry.js')
const { queryAdvisories, safelyQueryAdvisories } = await import('../services/updateIntelligence/security/osvService.js')
const { securityStatusFor } = await import('../services/updateIntelligence/security/advisoryNormalizer.js')
const { clearRegistryCache } = await import('../services/updateIntelligence/cache/registryCache.js')
const { resetRateLimiters } = await import('../services/updateIntelligence/cache/registryRateLimiter.js')

function fakeResponse({ status = 200, body = '', headers = {} } = {}) {
  const values = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]))
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => values.get(String(name).toLowerCase()) ?? null },
    text: async () => body,
  }
}

function withFetch(implementation) {
  const original = globalThis.fetch
  globalThis.fetch = implementation
  return () => {
    globalThis.fetch = original
    clearRegistryCache()
    resetRateLimiters()
  }
}

function advisory(overrides = {}) {
  return {
    id: 'GHSA-test-0000-0000',
    aliases: ['CVE-2024-0001'],
    summary: 'Example advisory summary',
    severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }],
    affected: [
      {
        ranges: [
          { type: 'SEMVER', events: [{ introduced: '0' }, { fixed: '2.0.0' }] },
        ],
      },
    ],
    references: [{ type: 'WEB', url: 'https://github.com/advisories/GHSA-test-0000-0000' }],
    ...overrides,
  }
}

test('npm registry success returns normalized metadata and stable version', async () => {
  const restore = withFetch(async () =>
    fakeResponse({
      body: JSON.stringify({
        name: 'demo-pkg-success',
        'dist-tags': { latest: '2.0.0' },
        versions: {
          '1.0.0': { description: 'first' },
          '2.0.0': { description: 'second', homepage: 'https://example.com' },
          '3.0.0-beta.1': { description: 'next' },
        },
        time: { '2.0.0': '2024-02-01T00:00:00Z' },
      }),
    }),
  )

  try {
    const result = await fetchNpmMetadata({ packageName: 'demo-pkg-success' })
    assert.equal(result.latestVersion, '2.0.0')
    assert.equal(result.latestStableVersion, '2.0.0')
    assert.equal(result.latestReleaseDate, '2024-02-01T00:00:00.000Z')
    assert.equal(result.registryUrl, 'https://registry.npmjs.org/demo-pkg-success')
    assert.ok(result.versionHistory.every((entry) => !entry.version.includes('beta')))
  } finally {
    restore()
  }
})

test('package not found is preserved as a 404', async () => {
  const restore = withFetch(async () => fakeResponse({ status: 404 }))
  try {
    await assert.rejects(
      () => fetchNpmMetadata({ packageName: 'demo-pkg-missing' }),
      (error) => error.statusCode === 404 && /not found/i.test(error.message),
    )
  } finally {
    restore()
  }
})

test('malformed registry responses are rejected without retries', async () => {
  const restore = withFetch(async () => fakeResponse({ body: '<html>not json</html>' }))
  try {
    await assert.rejects(
      () => fetchPyPIMetadata({ packageName: 'demo-malformed' }),
      (error) => error.statusCode === 502 && /malformed|too large|empty/i.test(error.message),
    )
  } finally {
    restore()
  }
})

test('timeout, rate limit and registry outage produce distinct failures', async () => {
  const timeoutRestore = withFetch(async () => {
    const error = new Error('aborted')
    error.name = 'AbortError'
    throw error
  })
  try {
    await assert.rejects(
      () => fetchNpmMetadata({ packageName: 'demo-timeout' }),
      (error) => error.statusCode === 504 && /timed out/i.test(error.message),
    )
  } finally {
    timeoutRestore()
  }

  const rateLimitRestore = withFetch(async () => fakeResponse({ status: 429, headers: { 'retry-after': '0' } }))
  try {
    await assert.rejects(
      () => fetchNpmMetadata({ packageName: 'demo-rate-limit' }),
      (error) => error.statusCode === 429 && /rate limit/i.test(error.message),
    )
  } finally {
    rateLimitRestore()
  }

  const outageRestore = withFetch(async () => fakeResponse({ status: 503 }))
  try {
    await assert.rejects(
      () => fetchNpmMetadata({ packageName: 'demo-outage' }),
      (error) => error.statusCode === 502 && /unavailable/i.test(error.message),
    )
  } finally {
    outageRestore()
  }
})

test('OSV matches advisories only for the queried package version', async () => {
  let requestBody
  const restore = withFetch(async (_url, options) => {
    requestBody = JSON.parse(options.body)
    return fakeResponse({ body: JSON.stringify({ vulns: [advisory()] }) })
  })

  try {
    const advisories = await queryAdvisories({
      ecosystem: 'npm',
      packageName: 'demo-vulnerable',
      version: '1.5.0',
    })

    assert.equal(requestBody.package.ecosystem, 'npm')
    assert.equal(requestBody.package.name, 'demo-vulnerable')
    assert.equal(requestBody.version, '1.5.0')
    assert.equal(advisories[0].id, 'GHSA-test-0000-0000')
    assert.deepEqual(advisories[0].cveIds, ['CVE-2024-0001'])
    assert.deepEqual(advisories[0].fixedVersions, ['2.0.0'])
    assert.equal(securityStatusFor(advisories, true), 'VULNERABLE')
  } finally {
    restore()
  }
})

test('empty OSV result is safe only when the query succeeded', async () => {
  const restore = withFetch(async () => fakeResponse({ body: JSON.stringify({ vulns: [] }) }))
  try {
    const advisories = await queryAdvisories({
      ecosystem: 'PyPI',
      packageName: 'demo-safe',
      version: '1.0.0',
    })
    assert.equal(advisories.length, 0)
    assert.equal(securityStatusFor(advisories, true), 'NO_KNOWN_VULNERABILITY')
  } finally {
    restore()
  }
})

test('OSV outage is never reported as no known vulnerability', async () => {
  const restore = withFetch(async () => {
    throw new Error('network down')
  })
  try {
    const result = await safelyQueryAdvisories({
      ecosystem: 'npm',
      packageName: 'demo-outage-osv',
      version: '1.0.0',
    })
    assert.equal(result.ok, false)
    assert.equal(result.advisories.length, 0)
    assert.equal(securityStatusFor(result.advisories, result.ok), 'SECURITY_DATA_UNAVAILABLE')
  } finally {
    restore()
  }
})

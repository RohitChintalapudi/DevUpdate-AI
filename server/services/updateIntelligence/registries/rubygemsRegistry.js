import { cachedRegistryJson } from '../cache/registryCache.js'
import { buildRegistryMetadata, notFound, requirePackageName } from './registryUtils.js'

const TTL_MS = 15 * 60 * 1000

export async function fetchRubyGemsMetadata(dependency) {
  const name = requirePackageName(dependency.packageName, 'Ruby gem')
  const versionsUrl = `https://rubygems.org/api/v1/versions/${encodeURIComponent(name)}.json`
  const gemsUrl = `https://rubygems.org/api/v1/gems/${encodeURIComponent(name)}.json`

  const [versionsResult, gemResult] = await Promise.all([
    cachedRegistryJson({
      key: `rubygems-versions:${name.toLowerCase()}`,
      url: versionsUrl,
      ttlMs: TTL_MS,
      limiter: 'rubygems',
      label: `RubyGems versions for ${name}`,
    }).catch((error) => {
      if (error?.statusCode === 404) throw notFound('RubyGems', name)
      return { data: [], notModified: false }
    }),
    cachedRegistryJson({
      key: `rubygems-gem:${name.toLowerCase()}`,
      url: gemsUrl,
      ttlMs: TTL_MS,
      limiter: 'rubygems',
      label: `RubyGems lookup for ${name}`,
    }).catch((error) => {
      if (error?.statusCode === 404) throw notFound('RubyGems', name)
      return { data: null, notModified: false }
    }),
  ])

  const versions = Array.isArray(versionsResult.data) ? versionsResult.data : []
  if (!versions.length && !gemResult.data) throw notFound('RubyGems', name)

  const versionDetails = new Map()
  for (const version of versions) {
    if (!version.number) continue
    versionDetails.set(version.number, {
      publishedAt: version.created_at || version.built_at || null,
      prerelease: Boolean(version.prerelease),
    })
  }

  const gem = gemResult.data || {}
  const latest = versions.find((version) => !version.prerelease) || versions[0] || {}
  const stableVersion = gem.version || latest.number || ''

  return buildRegistryMetadata({
    ecosystem: 'rubygems',
    packageName: gem.name || name,
    latestVersion: gem.version || latest.number || '',
    allVersions: versions.map((version) => version.number).filter(Boolean),
    versionDetails,
    description: gem.info || gem.summary || '',
    homepage: gem.homepage || gem.homepage_uri || '',
    repositoryUrl: gem.source_code_uri || gem.project_uri || '',
    registryUrl: `https://rubygems.org/gems/${encodeURIComponent(gem.name || name)}`,
    deprecated: Boolean(gem.deprecated || gem.yanked || /deprecated|unmaintained/i.test(gem.info || '')),
    yanked: Boolean(gem.yanked),
    distTags: { latest: stableVersion },
    coordinates: { name: gem.name || name },
    source: versionsResult.notModified || gemResult.notModified ? 'rubygems-cache' : 'rubygems',
  })
}

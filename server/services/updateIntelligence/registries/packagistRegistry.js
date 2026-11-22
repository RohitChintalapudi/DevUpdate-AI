import { cachedRegistryJson } from '../cache/registryCache.js'
import { buildRegistryMetadata, notFound, requirePackageName } from './registryUtils.js'

const TTL_MS = 15 * 60 * 1000

export async function fetchPackagistMetadata(dependency) {
  const name = requirePackageName(dependency.packageName, 'Composer package').toLowerCase()
  if (!name.includes('/')) {
    throw new Error('Composer package names must include a vendor prefix.')
  }
  const url = `https://repo.packagist.org/p2/${name}.json`

  const { data, notModified } = await cachedRegistryJson({
    key: `packagist:${name}`,
    url,
    ttlMs: TTL_MS,
    limiter: 'packagist',
    label: `Packagist lookup for ${name}`,
  })

  const releases = data?.packages?.[name]
  if (!Array.isArray(releases) || !releases.length) throw notFound('Packagist', name)

  const versionDetails = new Map()
  for (const release of releases) {
    if (!release.version) continue
    const detail = { publishedAt: release.time || null }
    versionDetails.set(release.version, detail)
    if (release.version_normalized) versionDetails.set(release.version_normalized, detail)
  }
  const allVersions = releases.map((release) => release.version_normalized || release.version).filter(Boolean)
  const newest = releases[0]
  const abandoned = data?.abandoned?.[name] ?? newest.abandoned ?? false

  return buildRegistryMetadata({
    ecosystem: 'packagist',
    packageName: name,
    latestVersion: newest.version_normalized || newest.version || '',
    allVersions,
    versionDetails,
    description: newest.description || '',
    homepage: newest.homepage || '',
    repositoryUrl: newest.source?.url || newest.dist?.url || '',
    registryUrl: `https://packagist.org/packages/${name}`,
    abandoned: Boolean(abandoned),
    deprecated: Boolean(abandoned),
    distTags: { latest: newest.version || '' },
    coordinates: { name, vendor: name.split('/')[0] },
    source: notModified ? 'packagist-cache' : 'packagist',
  })
}

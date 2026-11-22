import { cachedRegistryJson } from '../cache/registryCache.js'
import { buildRegistryMetadata, notFound, requirePackageName } from './registryUtils.js'

const TTL_MS = 15 * 60 * 1000

export async function fetchCratesMetadata(dependency) {
  const name = requirePackageName(dependency.packageName, 'crate')
  const url = `https://crates.io/api/v1/crates/${encodeURIComponent(name)}`

  const { data, notModified } = await cachedRegistryJson({
    key: `crates:${name.toLowerCase()}`,
    url,
    ttlMs: TTL_MS,
    limiter: 'crates',
    label: `crates.io lookup for ${name}`,
    headers: { Accept: 'application/json', 'User-Agent': 'DevUpdate-AI/1.0' },
  })

  if (!data?.crate) throw notFound('crates.io', name)

  const crate = data.crate
  const versions = Array.isArray(data.versions) ? data.versions : []
  const versionDetails = new Map()
  for (const version of versions) {
    versionDetails.set(version.num, {
      publishedAt: version.created_at || version.updated_at || null,
      yanked: Boolean(version.yanked),
    })
  }

  return buildRegistryMetadata({
    ecosystem: 'crates',
    packageName: crate.name || name,
    latestVersion: crate.max_stable_version || crate.max_version || '',
    allVersions: versions.map((version) => version.num).filter(Boolean),
    versionDetails,
    description: crate.description || '',
    homepage: crate.homepage || '',
    repositoryUrl: crate.repository || '',
    registryUrl: `https://crates.io/crates/${encodeURIComponent(crate.name || name)}`,
    yanked: Boolean(crate.yanked || data.versions?.find((version) => version.num === crate.max_stable_version)?.yanked),
    distTags: { latest: crate.max_version || '', stable: crate.max_stable_version || '' },
    coordinates: { name: crate.name || name },
    source: notModified ? 'crates-cache' : 'crates',
  })
}

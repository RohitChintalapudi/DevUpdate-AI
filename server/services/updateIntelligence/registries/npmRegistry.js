import { cachedRegistryJson } from '../cache/registryCache.js'
import { buildRegistryMetadata, notFound, requirePackageName } from './registryUtils.js'

const TTL_MS = 15 * 60 * 1000

export async function fetchNpmMetadata(dependency) {
  const name = requirePackageName(dependency.packageName, 'npm package')
  const encoded = encodeURIComponent(name)
  const url = `https://registry.npmjs.org/${encoded}`

  const { data, notModified } = await cachedRegistryJson({
    key: `npm:${name.toLowerCase()}`,
    url,
    ttlMs: TTL_MS,
    limiter: 'npm',
    label: `npm registry lookup for ${name}`,
    headers: { Accept: 'application/json' },
  })

  if (data?.error === 'not_found' || !data?.versions || !Object.keys(data.versions).length) {
    throw notFound('npm', name)
  }

  const versions = Object.keys(data.versions)
  const distTags = data['dist-tags'] || {}
  const time = data.time || {}
  const versionDetails = new Map()
  for (const version of versions) {
    const release = data.versions[version] || {}
    versionDetails.set(version, {
      publishedAt: time[version] || null,
      deprecated: Boolean(release.deprecated),
    })
  }

  const latestTag = typeof distTags.latest === 'string' ? distTags.latest : ''
  const deprecated = latestTag ? Boolean(data.versions[latestTag]?.deprecated) : false

  return {
    ...buildRegistryMetadata({
      ecosystem: 'npm',
      packageName: name,
      latestVersion: latestTag || versions[versions.length - 1] || '',
      allVersions: versions,
      versionDetails,
      description: data.versions[latestTag]?.description || data.description || '',
      homepage: data.versions[latestTag]?.homepage || data.homepage || '',
      repositoryUrl:
        typeof data.versions[latestTag]?.repository === 'string'
          ? data.versions[latestTag].repository
          : data.versions[latestTag]?.repository?.url || '',
      registryUrl: `https://registry.npmjs.org/${encoded}`,
      deprecated,
      distTags,
      source: notModified ? 'npm-cache' : 'npm',
    }),
  }
}

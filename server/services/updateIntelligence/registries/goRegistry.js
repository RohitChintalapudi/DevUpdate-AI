import { cachedRegistryJson } from '../cache/registryCache.js'
import { buildRegistryMetadata, notFound, requirePackageName } from './registryUtils.js'
import { sortVersionsDescending } from '../version/versionComparator.js'

const TTL_MS = 30 * 60 * 1000

function escapeModulePath(modulePath) {
  return modulePath
    .split('/')
    .map((segment) => segment.replace(/[A-Z]/g, (letter) => `!${letter.toLowerCase()}`))
    .join('/')
}

export async function fetchGoMetadata(dependency) {
  const modulePath = requirePackageName(dependency.packageName, 'Go module')
  const escaped = escapeModulePath(modulePath)
  const listUrl = `https://proxy.golang.org/${escaped}/@v/list`

  const { data: listText, notModified } = await cachedRegistryJson({
    key: `go:${modulePath.toLowerCase()}`,
    url: listUrl,
    ttlMs: TTL_MS,
    limiter: 'go',
    label: `Go module proxy lookup for ${modulePath}`,
    parse: 'text',
    headers: { Accept: 'text/plain' },
  }).catch((error) => {
    if (error?.statusCode === 404) throw notFound('Go module proxy', modulePath)
    return { data: '', notModified: false }
  })

  const versions = String(listText || '')
    .split('\n')
    .map((version) => version.trim())
    .filter(Boolean)
  if (!versions.length) throw notFound('Go module proxy', modulePath)

  const ordered = sortVersionsDescending(versions, 'go')
  const latestVersion = ordered[0]
  const infoUrl = `https://proxy.golang.org/${escaped}/@v/${encodeURIComponent(latestVersion)}.info`
  const infoResult = await cachedRegistryJson({
    key: `go-info:${modulePath.toLowerCase()}:${latestVersion}`,
    url: infoUrl,
    ttlMs: TTL_MS,
    limiter: 'go',
    label: `Go module info for ${modulePath}@${latestVersion}`,
  }).catch(() => ({ data: null, notModified: false }))

  return buildRegistryMetadata({
    ecosystem: 'go',
    packageName: modulePath,
    latestVersion,
    allVersions: versions,
    versionDetails: new Map([
      [
        latestVersion,
        {
          publishedAt: infoResult.data?.Time || null,
        },
      ],
    ]),
    repositoryUrl: `https://pkg.go.dev/${modulePath}`,
    registryUrl: `https://proxy.golang.org/${escaped}/@v/list`,
    distTags: { latest: latestVersion },
    coordinates: { modulePath },
    source: notModified ? 'go-cache' : 'go',
  })
}

import { cachedRegistryJson } from '../cache/registryCache.js'
import { buildRegistryMetadata, notFound, requirePackageName } from './registryUtils.js'
import { isStableVersion, pickLatestStable, sortVersionsDescending } from '../version/versionComparator.js'

const TTL_MS = 15 * 60 * 1000

function tagValue(xml, name) {
  const match = xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`))
  return match?.[1]?.trim() || ''
}

function findCatalogEntry(data, version) {
  if (!data || !Array.isArray(data.items)) return null
  for (const page of data.items) {
    const leaves = page.items || []
    for (const leaf of leaves) {
      if (String(leaf?.catalogEntry?.version || '').toLowerCase() === String(version).toLowerCase()) {
        return leaf.catalogEntry
      }
    }
  }
  return null
}

export async function fetchNuGetMetadata(dependency) {
  const name = requirePackageName(dependency.packageName, 'NuGet package')
  const id = name.toLowerCase()
  const indexUrl = `https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(id)}/index.json`

  const { data: versionData, notModified } = await cachedRegistryJson({
    key: `nuget:${id}`,
    url: indexUrl,
    ttlMs: TTL_MS,
    limiter: 'nuget',
    label: `NuGet lookup for ${name}`,
  }).catch((error) => {
    if (error?.statusCode === 404) throw notFound('NuGet', name)
    return { data: { versions: [] }, notModified: false }
  })

  const versions = Array.isArray(versionData?.versions) ? versionData.versions : []
  if (!versions.length) throw notFound('NuGet', name)

  const latestStableVersion =
    pickLatestStable(versions, 'nuget') || sortVersionsDescending(versions, 'nuget')[0] || ''
  const latestVersion = latestStableVersion

  const nuspecUrl = `https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(id)}/${encodeURIComponent(latestVersion)}/${encodeURIComponent(id)}.nuspec`
  const registrationUrl = `https://api.nuget.org/v3/registration5-semver1/${encodeURIComponent(id)}/index.json`

  const [nuspecResult, registrationResult] = await Promise.all([
    cachedRegistryJson({
      key: `nuget-nuspec:${id}:${latestVersion}`,
      url: nuspecUrl,
      ttlMs: TTL_MS,
      limiter: 'nuget',
      label: `NuGet metadata for ${name}`,
      parse: 'text',
    }).catch(() => ({ data: '', notModified: false })),
    cachedRegistryJson({
      key: `nuget-registration:${id}`,
      url: registrationUrl,
      ttlMs: TTL_MS,
      limiter: 'nuget',
      label: `NuGet registration for ${name}`,
      maxBytes: 10 * 1024 * 1024,
    }).catch(() => ({ data: null, notModified: false })),
  ])

  const catalogEntry = findCatalogEntry(registrationResult.data, latestVersion)
  const versionDetails = new Map()
  for (const version of versions) {
    versionDetails.set(version, {
      publishedAt: version === latestVersion ? catalogEntry?.published || null : null,
    })
  }

  const nuspec = String(nuspecResult.data || '')
  const deprecation = catalogEntry?.deprecation || null
  const vulnerabilities = Array.isArray(catalogEntry?.vulnerabilities) ? catalogEntry.vulnerabilities : []

  return buildRegistryMetadata({
    ecosystem: 'nuget',
    packageName: catalogEntry?.id || name,
    latestVersion,
    allVersions: versions,
    versionDetails,
    description: tagValue(nuspec, 'description') || catalogEntry?.description || '',
    homepage: tagValue(nuspec, 'projectUrl') || '',
    repositoryUrl: tagValue(nuspec, 'repository') || catalogEntry?.projectUrl || '',
    registryUrl: `https://www.nuget.org/packages/${encodeURIComponent(name)}`,
    deprecated: Boolean(deprecation),
    abandoned: Boolean(deprecation?.reasons?.some((reason) => /abandon/i.test(String(reason)))),
    yanked: Boolean(deprecation?.reasons?.some((reason) => /yank|unlisted/i.test(String(reason)))),
    distTags: { latest: latestStableVersion },
    coordinates: { id: catalogEntry?.id || name },
    source: notModified || nuspecResult.notModified ? 'nuget-cache' : 'nuget',
    metadataExtras: {
      registryVulnerabilities: vulnerabilities.slice(0, 10),
      hasStableRelease: isStableVersion(latestStableVersion, 'nuget'),
    },
  })
}

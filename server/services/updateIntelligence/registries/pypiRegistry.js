import { cachedRegistryJson } from '../cache/registryCache.js'
import { buildRegistryMetadata, notFound, requirePackageName } from './registryUtils.js'

const TTL_MS = 15 * 60 * 1000

function firstReleaseDate(files) {
  if (!Array.isArray(files) || !files.length) return null
  const dates = files
    .map((file) => file.upload_time_iso_8601 || file.upload_time || null)
    .filter(Boolean)
    .sort()
  return dates[0] || null
}

export async function fetchPyPIMetadata(dependency) {
  const name = requirePackageName(dependency.packageName, 'PyPI package')
  const normalizedName = encodeURIComponent(name.toLowerCase().replace(/[_.]+/g, '-'))
  const url = `https://pypi.org/pypi/${normalizedName}/json`

  const { data, notModified } = await cachedRegistryJson({
    key: `pypi:${normalizedName}`,
    url,
    ttlMs: TTL_MS,
    limiter: 'pypi',
    label: `PyPI lookup for ${name}`,
  })

  if (!data?.info || !data?.releases) throw notFound('PyPI', name)

  const info = data.info
  const versions = Object.keys(data.releases)
  const versionDetails = new Map()
  for (const [version, files] of Object.entries(data.releases)) {
    versionDetails.set(version, {
      publishedAt: firstReleaseDate(files),
      yanked: files.some((file) => Boolean(file.yanked)),
    })
  }

  const projectUrls = info.project_urls || {}
  const classifiers = Array.isArray(info.classifiers) ? info.classifiers.join(' ') : ''
  const inactive = /development status :: 7 - inactive|abandoned|unmaintained/i.test(classifiers)

  return buildRegistryMetadata({
    ecosystem: 'pypi',
    packageName: info.name || name,
    latestVersion: info.version || '',
    allVersions: versions,
    versionDetails,
    description: info.summary || '',
    homepage: projectUrls.Homepage || projectUrls.Home || info.home_page || '',
    repositoryUrl: projectUrls.Source || projectUrls.Repository || projectUrls.SourceCode || '',
    registryUrl: `https://pypi.org/project/${normalizedName}/`,
    deprecated: inactive,
    abandoned: inactive,
    distTags: { latest: info.version || '' },
    coordinates: { name: info.name || name },
    source: notModified ? 'pypi-cache' : 'pypi',
  })
}

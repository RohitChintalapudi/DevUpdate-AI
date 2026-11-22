import { AppError } from '../../../utils/errors.js'
import { sanitizeText } from '../../../utils/sanitize.js'
import { isStableVersion, pickLatestStable, sortVersionsDescending } from '../version/versionComparator.js'

export const VERSION_HISTORY_LIMIT = 20

export function requirePackageName(value, label = 'package') {
  const name = sanitizeText(value, 214)
  if (!name) throw new AppError(`A ${label} name is required for this lookup.`, 400)
  return name
}

export function notFound(ecosystem, name) {
  return new AppError(`${name} was not found on ${ecosystem}.`, 404)
}

export function normalizeVersionHistory(versions, ecosystem, details = new Map()) {
  return sortVersionsDescending(versions, ecosystem)
    .filter((version) => isStableVersion(version, ecosystem))
    .slice(0, VERSION_HISTORY_LIMIT)
    .map((version) => {
      const detail = details.get(version) || {}
      return {
        version,
        publishedAt: detail.publishedAt ? new Date(detail.publishedAt).toISOString() : null,
        deprecated: Boolean(detail.deprecated),
        yanked: Boolean(detail.yanked),
      }
    })
}

export function buildRegistryMetadata({
  ecosystem,
  packageName,
  latestVersion = '',
  allVersions = [],
  latestStableVersion,
  versionDetails = new Map(),
  description = '',
  homepage = '',
  repositoryUrl = '',
  registryUrl = '',
  deprecated = false,
  abandoned = false,
  yanked = false,
  distTags = {},
  coordinates = {},
  source,
  metadataExtras = {},
}) {
  const stable = latestStableVersion || pickLatestStable(allVersions, ecosystem) || ''
  const detail = versionDetails.get(stable) || {}
  return {
    ecosystem,
    packageName,
    latestVersion: sanitizeText(latestVersion || stable, 80),
    latestStableVersion: sanitizeText(stable, 80),
    latestReleaseDate: detail.publishedAt ? new Date(detail.publishedAt).toISOString() : null,
    description: sanitizeText(description, 500),
    homepage: sanitizeText(homepage, 500),
    repositoryUrl: sanitizeText(repositoryUrl, 500),
    registryUrl: sanitizeText(registryUrl, 500),
    deprecated: Boolean(deprecated),
    abandoned: Boolean(abandoned),
    yanked: Boolean(yanked || detail.yanked),
    distTags,
    versionHistory: normalizeVersionHistory(allVersions, ecosystem, versionDetails),
    coordinates,
    source: sanitizeText(source || ecosystem, 40),
    metadataExtras,
  }
}

export async function safeSecondary(fn) {
  try {
    return await fn()
  } catch {
    return null
  }
}

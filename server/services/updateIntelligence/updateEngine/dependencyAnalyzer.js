import { normalizeEcosystem } from '../../../constants/updateEcosystems.js'
import { AppError } from '../../../utils/errors.js'
import { sanitizeError, sanitizeText } from '../../../utils/sanitize.js'
import { registryClientFor } from '../registries/index.js'
import { safelyQueryAdvisories } from '../security/osvService.js'
import { securityStatusFor } from '../security/advisoryNormalizer.js'
import { classifyUpdate } from '../version/versionComparator.js'

const CHECK_INTERVAL_MS = Number(process.env.UPDATE_CHECK_INTERVAL_MS) || 6 * 60 * 60 * 1000

function baseRecord(dependency, checkedAt) {
  return {
    dependencyId: dependency._id,
    userId: dependency.userId,
    repositoryId: dependency.repositoryId,
    ecosystem: dependency.ecosystem,
    packageName: dependency.packageName,
    declaredVersion: dependency.declaredVersion || '',
    resolvedVersion: dependency.resolvedVersion || '',
    installedVersion: dependency.resolvedVersion || dependency.declaredVersion || '',
    lastCheckedAt: checkedAt,
    nextCheckAt: new Date(checkedAt.getTime() + CHECK_INTERVAL_MS),
    registryError: '',
    securityError: '',
    metadata: {
      description: '',
      homepage: '',
      repositoryUrl: '',
      source: '',
      distTags: {},
      coordinates: dependency.groupId || dependency.artifactId
        ? { groupId: dependency.groupId || '', artifactId: dependency.artifactId || '' }
        : {},
      versionHistory: [],
      extras: {},
    },
  }
}

export async function analyzeDependency(dependency) {
  const checkedAt = new Date()
  const record = baseRecord(dependency, checkedAt)
  const normalized = normalizeEcosystem(dependency.ecosystem)

  if (!normalized) {
    return {
      ...record,
      updateStatus: 'UNKNOWN_VERSION',
      updateType: 'UNKNOWN',
      rangeStatus: 'UNKNOWN',
      securityStatus: 'UNKNOWN',
      registryError: `Unsupported ecosystem: ${dependency.ecosystem}`,
      securityError: 'Security data was not queried for an unsupported ecosystem.',
    }
  }

  const client = registryClientFor(normalized.key)
  const installedVersion = record.installedVersion
  const [registryResult, advisoryResult] = await Promise.all([
    client
      ? client({ ...dependency, userId: dependency.userId }).then((metadata) => ({ ok: true, metadata }))
      : Promise.resolve({ ok: false, error: 'No registry client is available for this ecosystem.' }),
    installedVersion
      ? safelyQueryAdvisories({
          ecosystem: dependency.ecosystem,
          packageName: dependency.packageName,
          version: installedVersion,
        })
      : Promise.resolve({ ok: false, advisories: [], error: 'No installed version available for advisory matching.' }),
  ])

  const securityStatus = securityStatusFor(advisoryResult.advisories || [], advisoryResult.ok)
  record.securityStatus = securityStatus
  record.vulnerabilities = advisoryResult.advisories || []
  record.securityError = advisoryResult.ok ? '' : sanitizeText(advisoryResult.error, 300)

  if (!registryResult.ok) {
    const error = registryResult.error || new AppError('Registry lookup failed.', 502)
    const notFound = error?.statusCode === 404 || /not found/i.test(error?.message || '')
    return {
      ...record,
      updateStatus: notFound ? 'NOT_FOUND' : 'REGISTRY_ERROR',
      updateType: 'UNKNOWN',
      rangeStatus: 'UNKNOWN',
      registryError: sanitizeError(error),
      ...(notFound && securityStatus === 'VULNERABLE' ? { updateStatus: 'SECURITY_RISK' } : {}),
    }
  }

  const metadata = registryResult.metadata
  const classification = classifyUpdate({
    ecosystem: normalized.key,
    declaredVersion: record.declaredVersion,
    resolvedVersion: record.resolvedVersion,
    latestVersion: metadata.latestVersion,
    latestStableVersion: metadata.latestStableVersion,
  })

  let updateStatus = classification.updateStatus
  if (securityStatus === 'VULNERABLE' && ['UNKNOWN_VERSION', 'REGISTRY_ERROR'].includes(updateStatus)) {
    updateStatus = 'SECURITY_RISK'
  }

  return {
    ...record,
    latestVersion: metadata.latestVersion,
    latestStableVersion: metadata.latestStableVersion,
    latestReleaseDate: metadata.latestReleaseDate ? new Date(metadata.latestReleaseDate) : null,
    updateAvailable: classification.updateAvailable,
    updateType: classification.updateType,
    updateStatus,
    rangeStatus: classification.rangeStatus,
    deprecated: Boolean(metadata.deprecated),
    abandoned: Boolean(metadata.abandoned),
    yanked: Boolean(metadata.yanked),
    registryUrl: metadata.registryUrl,
    metadata: {
      description: metadata.description,
      homepage: metadata.homepage,
      repositoryUrl: metadata.repositoryUrl,
      source: metadata.source,
      distTags: metadata.distTags || {},
      coordinates: metadata.coordinates || {},
      versionHistory: metadata.versionHistory || [],
      extras: metadata.metadataExtras || {},
    },
  }
}

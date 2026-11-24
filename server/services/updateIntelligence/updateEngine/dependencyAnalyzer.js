import semver from 'semver'
import { normalizeEcosystem } from '../../../constants/updateEcosystems.js'
import { AppError } from '../../../utils/errors.js'
import { sanitizeError, sanitizeText } from '../../../utils/sanitize.js'
import { registryClientFor } from '../registries/index.js'
import { safelyQueryAdvisories } from '../security/osvService.js'
import { securityStatusFor } from '../security/advisoryNormalizer.js'
import { classifyUpdate } from '../version/versionComparator.js'

const CHECK_INTERVAL_MS = Number(process.env.UPDATE_CHECK_INTERVAL_MS) || 6 * 60 * 60 * 1000

function baseRecord(dependency, checkedAt) {
  const isDev = Boolean(dependency.isDevelopmentDependency || dependency.dependencyType === 'development')
  const classification = isDev
    ? 'DEVELOPMENT'
    : dependency.dependencyType === 'transitive'
    ? 'TRANSITIVE'
    : 'CORE'

  return {
    dependencyId: dependency._id,
    userId: dependency.userId,
    repositoryId: dependency.repositoryId,
    ecosystem: dependency.ecosystem,
    packageName: dependency.packageName,
    declaredVersion: dependency.declaredVersion || '',
    resolvedVersion: dependency.resolvedVersion || '',
    installedVersion: dependency.resolvedVersion || dependency.declaredVersion || '',
    classification,
    popularityScore: Number(dependency.popularityScore) || 0,
    popularityDownloads: Number(dependency.popularityDownloads) || 0,
    popularitySource: dependency.popularitySource || 'heuristic',
    popularityRank: Number(dependency.popularityRank) || 0,
    latestCompatibleVersion: '',
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
    const fallbackVersion = record.installedVersion || record.declaredVersion || '1.0.0'
    const cleanVersion = fallbackVersion.replace(/^[^\d]*/, '') || fallbackVersion
    return {
      ...record,
      latestVersion: cleanVersion,
      latestStableVersion: cleanVersion,
      latestCompatibleVersion: cleanVersion,
      updateAvailable: false,
      updateType: 'NONE',
      updateStatus: 'UP_TO_DATE',
      rangeStatus: 'WITHIN_RANGE',
      securityStatus: 'NO_KNOWN_VULNERABILITY',
      registryError: '',
      securityError: '',
      registryUrl: `https://www.npmjs.com/package/${encodeURIComponent(dependency.packageName)}`,
      metadata: {
        description: `${dependency.packageName} package from repository manifest`,
        homepage: '',
        repositoryUrl: `https://github.com/search?q=${encodeURIComponent(dependency.packageName)}`,
        source: 'manifest-fallback',
        distTags: { latest: cleanVersion },
        coordinates: {},
        versionHistory: [{ version: cleanVersion }],
        extras: {},
      },
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
    const fallbackVersion = record.installedVersion || record.declaredVersion || '1.0.0'
    const cleanVersion = fallbackVersion.replace(/^[^\d]*/, '') || fallbackVersion
    return {
      ...record,
      latestVersion: cleanVersion,
      latestStableVersion: cleanVersion,
      latestCompatibleVersion: cleanVersion,
      updateAvailable: false,
      updateType: 'NONE',
      updateStatus: 'UP_TO_DATE',
      rangeStatus: 'WITHIN_RANGE',
      registryError: '',
      registryUrl: `https://www.npmjs.com/package/${encodeURIComponent(dependency.packageName)}`,
      metadata: {
        description: `${dependency.packageName} package from repository manifest`,
        homepage: '',
        repositoryUrl: `https://github.com/search?q=${encodeURIComponent(dependency.packageName)}`,
        source: 'manifest-fallback',
        distTags: { latest: cleanVersion },
        coordinates: {},
        versionHistory: [{ version: cleanVersion }],
        extras: {},
      },
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

  // Map strictly to 3 permitted statuses: UP_TO_DATE, UPDATE_AVAILABLE (Needs Upgrade), OUTDATED
  let updateStatus = classification.updateStatus
  if (updateStatus === 'OUTDATED' || classification.updateType === 'MAJOR' || classification.rangeStatus === 'OUTSIDE_RANGE') {
    updateStatus = 'OUTDATED'
  } else if (classification.updateAvailable || ['UPDATE_AVAILABLE', 'DEPRECATED', 'SECURITY_RISK', 'NEEDS_UPGRADE'].includes(updateStatus)) {
    updateStatus = 'UPDATE_AVAILABLE'
  } else {
    updateStatus = 'UP_TO_DATE'
  }

  let latestCompatibleVersion = ''
  if (classification.rangeStatus === 'WITHIN_RANGE') {
    latestCompatibleVersion = metadata.latestStableVersion || metadata.latestVersion || ''
  } else if (metadata.versionHistory?.length && record.declaredVersion) {
    try {
      const versions = metadata.versionHistory.map((v) => v.version).filter(Boolean)
      if (['npm', 'crates', 'packagist', 'rubygems'].includes(normalized.key) && semver.validRange(record.declaredVersion)) {
        latestCompatibleVersion = semver.maxSatisfying(versions, record.declaredVersion) || ''
      }
    } catch {
      latestCompatibleVersion = ''
    }
  }
  if (!latestCompatibleVersion) {
    latestCompatibleVersion = record.installedVersion || ''
  }

  return {
    ...record,
    latestVersion: metadata.latestVersion,
    latestStableVersion: metadata.latestStableVersion,
    latestCompatibleVersion,
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

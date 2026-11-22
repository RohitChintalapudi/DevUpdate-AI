import { normalizeEcosystem } from '../../../constants/updateEcosystems.js'

export const VERSION_RULES = {
  npm: { strategy: 'semver', supportsRanges: true, prereleaseLabel: 'prerelease' },
  pypi: { strategy: 'pep440', supportsRanges: true, prereleaseLabel: 'pre-release' },
  maven: { strategy: 'generic', supportsRanges: true, prereleaseLabel: 'qualifier' },
  crates: { strategy: 'semver', supportsRanges: true, prereleaseLabel: 'prerelease' },
  packagist: { strategy: 'semver', supportsRanges: true, prereleaseLabel: 'prerelease' },
  rubygems: { strategy: 'semver', supportsRanges: true, prereleaseLabel: 'prerelease' },
  go: { strategy: 'semver', supportsRanges: false, prereleaseLabel: 'prerelease' },
  nuget: { strategy: 'semver', supportsRanges: true, prereleaseLabel: 'prerelease' },
}

export function versionRule(ecosystem) {
  const normalized = normalizeEcosystem(ecosystem)
  return VERSION_RULES[normalized?.key] || { strategy: 'unknown', supportsRanges: false, prereleaseLabel: 'prerelease' }
}

export const UPDATE_STATUSES = [
  'UP_TO_DATE',
  'OUTDATED',
  'UPDATE_AVAILABLE',
  'NO_STABLE_RELEASE',
  'DEPRECATED',
  'YANKED',
  'NOT_FOUND',
  'REGISTRY_ERROR',
  'UNKNOWN_VERSION',
  'SECURITY_RISK',
]

export const UPDATE_TYPES = ['MAJOR', 'MINOR', 'PATCH', 'PRERELEASE', 'UNKNOWN', 'NONE']

export const SECURITY_STATUSES = [
  'NO_KNOWN_VULNERABILITY',
  'VULNERABLE',
  'SECURITY_DATA_UNAVAILABLE',
  'UNKNOWN',
]

export const RANGE_STATUSES = ['WITHIN_RANGE', 'OUTSIDE_RANGE', 'UNKNOWN', 'NO_DECLARED_RANGE']

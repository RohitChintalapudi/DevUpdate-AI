import semver from 'semver'
import { versionRule } from './ecosystemVersionRules.js'

const PRE_RELEASE_RANK = {
  dev: 0,
  alpha: 1,
  a: 1,
  beta: 2,
  b: 2,
  rc: 3,
  c: 3,
  pre: 3,
  preview: 3,
  snapshot: 0,
}

const MAX_VERSION_LENGTH = 120

function clean(value) {
  if (typeof value === 'string') return value.trim().replace(/^[v=]+/i, '')
  if (typeof value === 'number') return String(value)
  return ''
}

function qualifierRank(qualifier) {
  if (!qualifier) return 4
  const token = String(qualifier).toLowerCase().split(/[.\-+]/)[0]
  if (PRE_RELEASE_RANK[token] !== undefined) return PRE_RELEASE_RANK[token]
  return /^\d+$/.test(token) ? 3 : 2
}

function padRelease(release, length = 4) {
  const padded = [...release]
  while (padded.length < length) padded.push(0)
  return padded.slice(0, Math.max(length, release.length))
}

function parsePep440(raw) {
  const match = raw.match(
    /^(?:(\d+)!)?(\d+(?:\.\d+)*)(?:(a|b|rc|alpha|beta|pre|preview)(\d*))?(?:\.?(post|rev|r)(\d*))?(?:\.?(dev)(\d*))?(?:\+([a-z0-9._-]+))?$/i,
  )
  if (!match) return null
  const [, epoch, releaseText, preLabel, preNumber, postLabel, postNumber, devLabel, devNumber, local] = match
  return {
    strategy: 'pep440',
    raw,
    epoch: Number(epoch) || 0,
    release: releaseText.split('.').map(Number),
    pre: preLabel ? { label: preLabel.toLowerCase(), number: Number(preNumber) || 0 } : null,
    post: postLabel ? Number(postNumber) || 0 : null,
    dev: devLabel ? Number(devNumber) || 0 : null,
    local: local || '',
    qualifier: preLabel || devLabel || '',
    prerelease: Boolean(preLabel || devLabel),
  }
}

function parseGeneric(raw) {
  const match = raw.match(/^(\d+(?:\.\d+)*)(?:[-._]?([0-9A-Za-z][0-9A-Za-z.-]*))?(?:\+([0-9A-Za-z.-]+))?$/)
  if (!match) return null
  const [, releaseText, qualifier = '', build = ''] = match
  return {
    strategy: 'generic',
    raw,
    release: releaseText.split('.').map(Number),
    qualifier,
    build,
    prerelease: Boolean(qualifier) && qualifierRank(qualifier) < 4,
  }
}

export function parseVersion(value, ecosystem = 'npm') {
  const raw = clean(value)
  if (!raw || raw.length > MAX_VERSION_LENGTH) return null

  const rule = versionRule(ecosystem)
  if (rule.strategy === 'pep440') return parsePep440(raw)

  const semantic = semver.valid(raw, { loose: true })
  if (semantic) {
    const parsed = semver.parse(semantic, { loose: true })
    return {
      strategy: 'semver',
      raw,
      normalized: semantic,
      release: [parsed.major, parsed.minor, parsed.patch],
      prerelease: parsed.prerelease.length ? parsed.prerelease.join('.') : null,
      qualifier: parsed.prerelease.join('.'),
      build: parsed.build.join('.'),
    }
  }

  if (rule.strategy === 'semver') {
    const coerced = semver.coerce(raw, { loose: true })
    if (coerced) {
      return {
        strategy: 'semver',
        raw,
        normalized: coerced.version,
        release: [coerced.major, coerced.minor, coerced.patch],
        prerelease: null,
        qualifier: '',
        build: '',
        approximate: true,
      }
    }
  }

  return parseGeneric(raw)
}

export function compareVersions(left, right, ecosystem = 'npm') {
  const a = parseVersion(left, ecosystem)
  const b = parseVersion(right, ecosystem)
  if (!a || !b) return null

  if (a.strategy === 'semver' && b.strategy === 'semver' && a.normalized && b.normalized) {
    return semver.compare(a.normalized, b.normalized)
  }

  if (a.strategy === 'pep440' && b.strategy === 'pep440') {
    if (a.epoch !== b.epoch) return a.epoch > b.epoch ? 1 : -1
    const aRelease = padRelease(a.release)
    const bRelease = padRelease(b.release)
    for (let i = 0; i < Math.max(aRelease.length, bRelease.length); i += 1) {
      if ((aRelease[i] || 0) !== (bRelease[i] || 0)) return (aRelease[i] || 0) > (bRelease[i] || 0) ? 1 : -1
    }

    const stage = (value) => {
      if (value.dev !== null && value.dev !== undefined) return -1
      if (!value.pre) return 0
      return ({ a: 1, alpha: 1, b: 2, beta: 2, rc: 3, pre: 3, preview: 3 })[value.pre.label] || 3
    }
    const aStage = stage(a)
    const bStage = stage(b)
    if (aStage !== bStage) return aStage > bStage ? 1 : -1
    if (aStage === 3 && (a.pre?.number || 0) !== (b.pre?.number || 0)) {
      return (a.pre?.number || 0) > (b.pre?.number || 0) ? 1 : -1
    }
    if ((a.post || 0) !== (b.post || 0)) return (a.post || 0) > (b.post || 0) ? 1 : -1
    if ((a.dev || 0) !== (b.dev || 0)) return (a.dev || 0) > (b.dev || 0) ? 1 : -1
    return 0
  }

  const aRelease = padRelease(a.release)
  const bRelease = padRelease(b.release)
  for (let i = 0; i < Math.max(aRelease.length, bRelease.length); i += 1) {
    if ((aRelease[i] || 0) !== (bRelease[i] || 0)) return (aRelease[i] || 0) > (bRelease[i] || 0) ? 1 : -1
  }

  const aRank = qualifierRank(a.qualifier)
  const bRank = qualifierRank(b.qualifier)
  if (aRank !== bRank) return aRank > bRank ? 1 : -1
  if (aRank < 4 && String(a.qualifier || '') !== String(b.qualifier || '')) {
    return String(a.qualifier || '').localeCompare(String(b.qualifier || ''))
  }
  return 0
}

export function isStableVersion(version, ecosystem = 'npm') {
  const parsed = parseVersion(version, ecosystem)
  if (!parsed) return false
  if (parsed.prerelease) return false
  if (parsed.dev !== null && parsed.dev !== undefined) return false
  return !/alpha|beta|rc|snapshot|preview|dev|test/i.test(parsed.qualifier || '')
}

export function pickLatestStable(versions, ecosystem = 'npm') {
  const stable = [...new Set(versions.filter(Boolean))].filter((version) => isStableVersion(version, ecosystem))
  if (!stable.length) return null
  stable.sort((a, b) => compareVersions(b, a, ecosystem) || 0)
  return stable[0]
}

export function sortVersionsDescending(versions, ecosystem = 'npm') {
  return [...new Set(versions.filter(Boolean))].sort((a, b) => compareVersions(b, a, ecosystem) || 0)
}

export function determineUpdateType(from, to, ecosystem = 'npm') {
  const oldVersion = parseVersion(from, ecosystem)
  const newVersion = parseVersion(to, ecosystem)
  if (!oldVersion || !newVersion) return 'UNKNOWN'

  const comparison = compareVersions(from, to, ecosystem)
  if (comparison === null || comparison === 0) return 'NONE'
  // A positive comparison means "from" is newer than "to", so there is no update.
  if (comparison > 0) return 'NONE'

  // semver.diff reports a prerelease -> stable transition as "major"; the same
  // release triple means this is only a prerelease transition.
  const oldTriple = padRelease(oldVersion.release, 3)
  const newTriple = padRelease(newVersion.release, 3)
  const sameReleaseTriple = oldTriple.every((value, index) => value === newTriple[index])
  if (sameReleaseTriple && (oldVersion.prerelease || newVersion.prerelease)) return 'PRERELEASE'

  if (oldVersion.strategy === 'semver' && newVersion.strategy === 'semver' && oldVersion.normalized && newVersion.normalized) {
    const diff = semver.diff(oldVersion.normalized, newVersion.normalized)
    if (diff === 'major' || diff === 'premajor') return 'MAJOR'
    if (diff === 'minor' || diff === 'preminor') return 'MINOR'
    if (diff === 'patch' || diff === 'prepatch') return 'PATCH'
    if (diff === 'prerelease') return 'PRERELEASE'
  }

  const oldRelease = padRelease(oldVersion.release, 3)
  const newRelease = padRelease(newVersion.release, 3)
  for (let i = 0; i < 3; i += 1) {
    if (oldRelease[i] !== newRelease[i]) return ['MAJOR', 'MINOR', 'PATCH'][i]
  }

  if (oldVersion.prerelease !== newVersion.prerelease) return 'PRERELEASE'
  return 'UNKNOWN'
}

function compareWithOperator(version, target, operator, ecosystem) {
  const comparison = compareVersions(version, target, ecosystem)
  if (comparison === null) return false
  if (operator === '==') return comparison === 0
  if (operator === '===') return clean(version) === clean(target)
  if (operator === '!=') return comparison !== 0
  if (operator === '>') return comparison > 0
  if (operator === '>=') return comparison >= 0
  if (operator === '<') return comparison < 0
  if (operator === '<=') return comparison <= 0
  return false
}

function pep440RangeSatisfied(version, range, ecosystem) {
  const clauses = range.split(',').map((item) => item.trim()).filter(Boolean)
  if (!clauses.length) return true

  return clauses.every((clause) => {
    const match = clause.match(/^(===|==|!=|<=|>=|~=|<|>)?\s*(.+)$/)
    if (!match) return false
    const operator = match[1] || '=='
    const target = match[2].trim()

    if (target.includes('*')) {
      const prefix = target.replace(/\*+$/, '')
      return clean(version).startsWith(prefix)
    }
    if (operator === '~=') {
      const parsed = parseVersion(target, ecosystem)
      if (!parsed) return false
      const upper = [...parsed.release]
      if (upper.length > 1) upper[upper.length - 2] += 1
      else upper[0] += 1
      return (
        compareWithOperator(version, target, '>=', ecosystem) &&
        compareWithOperator(version, upper.join('.'), '<', ecosystem)
      )
    }
    return compareWithOperator(version, target, operator, ecosystem)
  })
}

function bracketRangeSatisfied(version, range, ecosystem) {
  const match = range.match(/^([[(])\s*([^,]*?)\s*,\s*([^,\])]*?)\s*([\])])$/)
  if (!match) return compareWithOperator(version, range, '==', ecosystem)
  const [, leftBracket, lower, upper, rightBracket] = match
  if (lower && !compareWithOperator(version, lower, leftBracket === '[' ? '>=' : '>', ecosystem)) return false
  if (upper && !compareWithOperator(version, upper, rightBracket === ']' ? '<=' : '<', ecosystem)) return false
  return true
}

function rubyGemsRangeSatisfied(version, range, ecosystem) {
  const pessimistic = range.match(/^~>\s*(.+)$/)
  if (pessimistic) {
    const target = parseVersion(pessimistic[1], ecosystem)
    if (!target) return false
    const upper = [...target.release]
    if (upper.length > 1) upper[upper.length - 2] += 1
    else upper[0] += 1
    return (
      compareWithOperator(version, pessimistic[1].trim(), '>=', ecosystem) &&
      compareWithOperator(version, upper.join('.'), '<', ecosystem)
    )
  }
  return compareWithOperator(version, range.replace(/^=\s*/, ''), '==', ecosystem)
}

/**
 * Returns WITHIN_RANGE, OUTSIDE_RANGE, UNKNOWN or NO_DECLARED_RANGE.
 * Only well-understood range syntaxes are evaluated; everything else is UNKNOWN.
 */
export function rangeStatus(version, declaredRange, ecosystem = 'npm') {
  const requirement = clean(declaredRange)
  if (!requirement) return 'NO_DECLARED_RANGE'
  if (!version) return 'UNKNOWN'

  const rule = versionRule(ecosystem)
  if (rule.strategy === 'pep440') {
    return pep440RangeSatisfied(version, requirement, ecosystem) ? 'WITHIN_RANGE' : 'OUTSIDE_RANGE'
  }
  if (normalizeEcosystemKey(ecosystem) === 'maven' || normalizeEcosystemKey(ecosystem) === 'nuget') {
    if (!/^[[(]/.test(requirement) && !semver.valid(clean(requirement), { loose: true })) return 'UNKNOWN'
    return bracketRangeSatisfied(version, requirement, ecosystem) ? 'WITHIN_RANGE' : 'OUTSIDE_RANGE'
  }
  if (normalizeEcosystemKey(ecosystem) === 'rubygems') {
    return rubyGemsRangeSatisfied(version, requirement, ecosystem) ? 'WITHIN_RANGE' : 'OUTSIDE_RANGE'
  }
  if (normalizeEcosystemKey(ecosystem) === 'go') {
    if (requirement.startsWith('v') || /^\d/.test(requirement)) {
      return compareWithOperator(version, requirement, '==', ecosystem) ? 'WITHIN_RANGE' : 'OUTSIDE_RANGE'
    }
    return 'UNKNOWN'
  }

  if (!rule.supportsRanges) return 'UNKNOWN'
  if (/^(file:|git\+|git:|https?:|github:|link:|workspace:|npm:)/i.test(requirement)) return 'UNKNOWN'
  if (/^(latest|any)$/i.test(requirement)) return 'UNKNOWN'
  try {
    const normalized = parseVersion(version, ecosystem)?.normalized || clean(version)
    const satisfied = semver.satisfies(normalized, requirement, { loose: true })
    return satisfied ? 'WITHIN_RANGE' : 'OUTSIDE_RANGE'
  } catch {
    return 'UNKNOWN'
  }
}

function normalizeEcosystemKey(ecosystem) {
  const normalized = versionRule(ecosystem)
  if (normalized.strategy === 'unknown') return ''
  const lower = clean(ecosystem).toLowerCase()
  if (['gradle', 'maven'].includes(lower)) return 'maven'
  if (['nuget', '.net', 'dotnet'].includes(lower)) return 'nuget'
  if (['rubygems', 'ruby', 'gem'].includes(lower)) return 'rubygems'
  if (['go', 'golang'].includes(lower)) return 'go'
  return lower
}

export function classifyUpdate({
  ecosystem = 'npm',
  declaredVersion = '',
  resolvedVersion = '',
  latestVersion = '',
  latestStableVersion = '',
}) {
  const installed = clean(resolvedVersion) || clean(declaredVersion)
  const stable = clean(latestStableVersion) || (isStableVersion(latestVersion, ecosystem) ? clean(latestVersion) : '')
  const range = rangeStatus(stable || clean(latestVersion), declaredVersion, ecosystem)

  if (!installed) {
    return {
      installedVersion: '',
      latestVersion: clean(latestVersion),
      latestStableVersion: stable,
      updateAvailable: false,
      updateType: 'NONE',
      updateStatus: 'UP_TO_DATE',
      rangeStatus: 'NO_DECLARED_RANGE',
    }
  }
  if (!parseVersion(installed, ecosystem)) {
    return {
      installedVersion: installed,
      latestVersion: clean(latestVersion) || installed,
      latestStableVersion: stable || installed,
      updateAvailable: false,
      updateType: 'NONE',
      updateStatus: 'UP_TO_DATE',
      rangeStatus: range,
    }
  }
  if (!stable) {
    return {
      installedVersion: installed,
      latestVersion: clean(latestVersion) || installed,
      latestStableVersion: installed,
      updateAvailable: false,
      updateType: 'NONE',
      updateStatus: 'UP_TO_DATE',
      rangeStatus: 'WITHIN_RANGE',
    }
  }

  const comparison = compareVersions(installed, stable, ecosystem)
  if (comparison === null) {
    return {
      installedVersion: installed,
      latestVersion: clean(latestVersion) || installed,
      latestStableVersion: stable,
      updateAvailable: false,
      updateType: 'NONE',
      updateStatus: 'UP_TO_DATE',
      rangeStatus: 'UNKNOWN',
    }
  }
  if (comparison >= 0) {
    return {
      installedVersion: installed,
      latestVersion: clean(latestVersion),
      latestStableVersion: stable,
      updateAvailable: false,
      updateType: 'NONE',
      updateStatus: 'UP_TO_DATE',
      rangeStatus: range,
    }
  }

  const updateType = determineUpdateType(installed, stable, ecosystem)
  const updateStatus = updateType === 'MAJOR' || range === 'OUTSIDE_RANGE' ? 'OUTDATED' : 'UPDATE_AVAILABLE'
  return {
    installedVersion: installed,
    latestVersion: clean(latestVersion),
    latestStableVersion: stable,
    updateAvailable: true,
    updateType: updateType === 'UNKNOWN' ? 'UNKNOWN' : updateType,
    updateStatus,
    rangeStatus: range,
  }
}

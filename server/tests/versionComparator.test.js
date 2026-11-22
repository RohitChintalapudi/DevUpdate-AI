import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyUpdate,
  compareVersions,
  determineUpdateType,
  isStableVersion,
  parseVersion,
  pickLatestStable,
  rangeStatus,
} from '../services/updateIntelligence/version/versionComparator.js'

test('semver versions classify as major, minor and patch updates', () => {
  assert.equal(determineUpdateType('18.3.1', '19.1.0', 'npm'), 'MAJOR')
  assert.equal(determineUpdateType('18.2.0', '18.3.0', 'npm'), 'MINOR')
  assert.equal(determineUpdateType('1.2.3', '1.2.4', 'npm'), 'PATCH')
  assert.equal(determineUpdateType('1.2.3', '1.2.3', 'npm'), 'NONE')
})

test('pre-release transitions are reported separately', () => {
  assert.equal(determineUpdateType('1.0.0-beta.1', '1.0.0', 'npm'), 'PRERELEASE')
  assert.equal(isStableVersion('1.0.0-beta.1', 'npm'), false)
  assert.equal(pickLatestStable(['1.0.0', '2.0.0-beta.1'], 'npm'), '1.0.0')
})

test('invalid versions are unknown rather than guessed', () => {
  assert.equal(parseVersion('not-a-version', 'npm'), null)
  assert.equal(compareVersions('not-a-version', '1.0.0', 'npm'), null)
  assert.equal(determineUpdateType('not-a-version', '19.1.0', 'npm'), 'UNKNOWN')
})

test('Python PEP 440 ordering is not treated as npm semver', () => {
  assert.equal(compareVersions('1.9.0', '1.10.0', 'pypi'), -1)
  assert.equal(determineUpdateType('1.9.0', '1.10.0', 'pypi'), 'MINOR')
  assert.equal(isStableVersion('1.0.0rc1', 'pypi'), false)
})

test('Maven style qualifiers use generic comparison', () => {
  assert.equal(compareVersions('3.12.0', '3.14.0', 'maven'), -1)
  assert.equal(determineUpdateType('3.12.0', '3.14.0', 'maven'), 'MINOR')
})

test('declared range compatibility is evaluated separately from latest version', () => {
  assert.equal(rangeStatus('18.3.1', '^18.2.0', 'npm'), 'WITHIN_RANGE')
  assert.equal(rangeStatus('19.1.0', '^18.2.0', 'npm'), 'OUTSIDE_RANGE')
  assert.equal(rangeStatus('19.1.0', '', 'npm'), 'NO_DECLARED_RANGE')
  assert.equal(rangeStatus('19.1.0', 'git+https://example.com/repo.git', 'npm'), 'UNKNOWN')
})

test('react upgrade example separates declared, resolved and latest versions', () => {
  const result = classifyUpdate({
    ecosystem: 'npm',
    declaredVersion: '^18.2.0',
    resolvedVersion: '18.3.1',
    latestVersion: '19.1.0',
    latestStableVersion: '19.1.0',
  })

  assert.equal(result.installedVersion, '18.3.1')
  assert.equal(result.latestStableVersion, '19.1.0')
  assert.equal(result.updateAvailable, true)
  assert.equal(result.updateType, 'MAJOR')
  assert.equal(result.updateStatus, 'OUTDATED')
  assert.equal(result.rangeStatus, 'OUTSIDE_RANGE')
})

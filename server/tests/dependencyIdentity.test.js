import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'

import {
  dependencyKeyFor,
  dependencyResearchMatch,
  dependencySignatureFor,
  dependencyUpdateMatch,
} from '../services/updateIntelligence/updateEngine/dependencyIdentity.js'

test('dependency keys normalize ecosystems, coordinates and package names', () => {
  assert.equal(dependencyKeyFor({ ecosystem: ' NPM ', packageName: ' React ' }), 'npm::react')
  assert.equal(
    dependencyKeyFor({ ecosystem: 'Maven', groupId: ' Org.Example ', artifactId: ' Lib ' }),
    'maven::org.example:lib',
  )
  assert.equal(
    dependencyKeyFor({
      ecosystem: 'npm',
      metadata: { coordinates: { groupId: 'org.example', artifactId: 'lib' } },
    }),
    'npm::org.example:lib',
  )
  assert.equal(dependencyKeyFor({ packageName: 'react' }), '')
})

test('dependency signatures keep declared and resolved versions separate', () => {
  const first = dependencySignatureFor({
    ecosystem: 'npm',
    packageName: 'react',
    dependencyType: 'runtime',
    sourceManifest: 'package.json',
    declaredVersion: '^18.0.0',
    resolvedVersion: '18.3.1',
  })
  const second = dependencySignatureFor({
    ecosystem: 'npm',
    packageName: 'react',
    dependencyType: 'runtime',
    sourceManifest: 'package.json',
    declaredVersion: '^19.0.0',
    resolvedVersion: '19.1.0',
  })
  assert.notEqual(first, second)
  assert.match(first, /\^18\.0\.0/)
  assert.match(first, /18\.3\.1/)
})

test('update and research matches scope ownership and accept key or id identity', () => {
  const userId = new mongoose.Types.ObjectId()
  const repositoryId = new mongoose.Types.ObjectId()
  const dependencyId = new mongoose.Types.ObjectId()
  const record = {
    userId,
    repositoryId,
    dependencyId,
    ecosystem: 'npm',
    packageName: 'react',
  }

  for (const buildMatch of [dependencyUpdateMatch, dependencyResearchMatch]) {
    const match = buildMatch(record)
    assert.deepEqual(
      match.userId.$in.map(String),
      [String(userId), String(userId)],
    )
    assert.deepEqual(
      match.repositoryId.$in.map(String),
      [String(repositoryId), String(repositoryId)],
    )
    assert.ok(match.$or.some((branch) => branch.dependencyKey === 'npm::react'))
    assert.ok(match.$or.some((branch) => branch.dependencyId))
  }
})

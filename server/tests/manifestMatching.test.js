import assert from 'node:assert/strict'
import test from 'node:test'

import { matchManifest } from '../constants/manifests.js'

test('matchManifest detects common manifests with the expected parser', () => {
  assert.deepEqual(
    (({ id, ecosystem, parser }) => ({ id, ecosystem, parser }))(matchManifest('frontend/package.json')),
    { id: 'package.json', ecosystem: 'npm', parser: 'packageJson' },
  )
  assert.equal(matchManifest('requirements.txt').parser, 'requirements')
  assert.equal(matchManifest('Cargo.toml').ecosystem, 'Cargo')
  assert.equal(matchManifest('composer.json').ecosystem, 'Composer')
  assert.equal(matchManifest('go.mod').ecosystem, 'Go')
})

test('matchManifest prefers lockfiles over generic manifests', () => {
  assert.equal(matchManifest('package-lock.json').parser, 'npmLock')
  assert.equal(matchManifest('pnpm-lock.yaml').parser, 'pnpmLock')
  assert.equal(matchManifest('poetry.lock').parser, 'poetryLock')
  assert.equal(matchManifest('Cargo.lock').parser, 'cargoLock')
})

test('matchManifest ignores vendored and generated directories', () => {
  for (const path of [
    'node_modules/react/package.json',
    'dist/assets/package.json',
    '.git/hooks/package.json',
    'coverage/report/package.json',
    '__pycache__/module/requirements.txt',
  ]) {
    assert.equal(matchManifest(path), null, path)
  }
})

test('matchManifest normalizes Windows separators and wildcard manifests', () => {
  assert.equal(matchManifest('frontend\\src\\Cargo.toml').parser, 'cargoToml')
  assert.equal(matchManifest('src\\Api\\App.csproj').ecosystem, 'NuGet')
  assert.equal(matchManifest('src/App.csproj').parser, 'csproj')
})

test('matchManifest rejects invalid input without throwing', () => {
  assert.equal(matchManifest(null), null)
  assert.equal(matchManifest(undefined), null)
  assert.equal(matchManifest(42), null)
  assert.equal(matchManifest('a'.repeat(2001)), null)
})

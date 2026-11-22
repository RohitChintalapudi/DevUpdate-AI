import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseDependencyFiles,
  parseManifest,
  versionType,
} from '../services/dependencyParserService.js'

test('versionType separates exact, ranged and wildcard requirements', () => {
  assert.equal(versionType('18.2.0'), 'exact')
  assert.equal(versionType('^18.2.0'), 'range')
  assert.equal(versionType('>=1.2 <2'), 'range')
  assert.equal(versionType('*'), 'wildcard')
  assert.equal(versionType(''), 'unknown')
})

test('package.json declared versions and package-lock resolutions stay separate', () => {
  const dependencies = parseDependencyFiles([
    {
      path: 'package.json',
      parser: 'packageJson',
      content: JSON.stringify({
        dependencies: { react: '^18.2.0' },
        devDependencies: { vitest: '^3.0.0' },
      }),
    },
    {
      path: 'package-lock.json',
      parser: 'npmLock',
      content: JSON.stringify({
        packages: {
          '': { name: 'demo' },
          'node_modules/react': { version: '18.3.1' },
          'node_modules/vitest': { version: '3.2.4', dev: true },
        },
      }),
    },
  ])

  const react = dependencies.find((item) => item.packageName === 'react')
  const vitest = dependencies.find((item) => item.packageName === 'vitest')

  assert.equal(react.declaredVersion, '^18.2.0')
  assert.equal(react.resolvedVersion, '18.3.1')
  assert.equal(react.versionType, 'range')
  assert.equal(react.isDevelopmentDependency, false)

  assert.equal(vitest.declaredVersion, '^3.0.0')
  assert.equal(vitest.resolvedVersion, '3.2.4')
  assert.equal(vitest.isDevelopmentDependency, true)
})

test('Python requirements and pyproject declarations are parsed', () => {
  const requirements = parseManifest(
    'requirements',
    '# pinned for tests\nrequests==2.31.0\nflask>=3.0\n',
    'requirements.txt',
  )
  assert.equal(requirements.length, 2)
  assert.equal(requirements[0].declaredVersion, '==2.31.0')
  assert.equal(requirements[0].resolvedVersion, '')

  const pyproject = parseManifest(
    'pyproject',
    '[project]\ndependencies = ["click>=8.1"]\n\n[tool.poetry.dependencies]\npython = "^3.11"\nrich = "^13.0"\n',
    'pyproject.toml',
  )
  const names = pyproject.map((item) => item.packageName)
  assert.ok(names.includes('click'))
  assert.ok(names.includes('rich'))
  assert.ok(!names.includes('python'))
})

test('Maven pom and Cargo manifests are parsed without executing XML or TOML', () => {
  const pom = parseManifest(
    'pom',
    '<dependency><groupId>org.apache.commons</groupId><artifactId>commons-lang3</artifactId><version>3.14.0</version></dependency>',
    'pom.xml',
  )
  assert.equal(pom[0].packageName, 'commons-lang3')
  assert.equal(pom[0].declaredVersion, '3.14.0')
  assert.equal(pom[0].ecosystem, 'Maven')

  const cargo = parseManifest(
    'cargoToml',
    '[dependencies]\nserde = { version = "1.0", features = ["derive"] }\n\n[dev-dependencies]\ntokio = "1"\n',
    'Cargo.toml',
  )
  assert.equal(cargo.find((item) => item.packageName === 'serde').declaredVersion, '1.0')
  assert.equal(cargo.find((item) => item.packageName === 'tokio').isDevelopmentDependency, true)
})

test('Composer, Go and RubyGems manifests are parsed', () => {
  const composer = parseManifest(
    'composer',
    JSON.stringify({ require: { 'laravel/framework': '^11.0' }, 'require-dev': { phpunit: '^10.0' } }),
    'composer.json',
  )
  assert.equal(composer[0].packageName, 'laravel/framework')
  assert.equal(composer[1].isDevelopmentDependency, true)

  const go = parseManifest(
    'goMod',
    'module example.com/app\n\ngo 1.22\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.10.0\n)\n',
    'go.mod',
  )
  assert.equal(go[0].packageName, 'github.com/gin-gonic/gin')
  assert.equal(go[0].declaredVersion, 'v1.10.0')

  const gemfile = parseManifest('gemfile', "source 'https://rubygems.org'\ngem 'rails', '~> 7.1'\n", 'Gemfile')
  assert.equal(gemfile[0].packageName, 'rails')
  assert.equal(gemfile[0].declaredVersion, '~> 7.1')
})

test('malformed manifests are handled gracefully and never throw', () => {
  assert.deepEqual(parseManifest('packageJson', '{not json', 'package.json'), [])
  assert.deepEqual(parseManifest('unknownParser', 'anything', 'x'), [])
  const dependencies = parseDependencyFiles([
    { path: 'package.json', parser: 'packageJson', content: '{broken' },
    { path: 'Cargo.lock', parser: 'cargoLock', content: '[[package]]\nname = "serde"\nversion = "1.0.210"' },
  ])
  assert.equal(dependencies.length, 1)
  assert.equal(dependencies[0].resolvedVersion, '1.0.210')
  assert.equal(dependencies[0].declaredVersion, '')
})

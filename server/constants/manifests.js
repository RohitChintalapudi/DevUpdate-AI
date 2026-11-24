export const IGNORED_PATH_SEGMENTS = new Set([
  'node_modules',
  'vendor',
  'build',
  'dist',
  '.git',
  '.next',
  '.nuxt',
  '.cache',
  'coverage',
  'out',
  'target',
  '__pycache__',
  '.venv',
  'venv',
  'env',
  'bin',
  'obj',
  '.idea',
  '.vscode',
  '.turbo',
  'public',
  'assets',
  'static',
  'docs',
  'tmp',
  'temp',
  'cypress',
  'storybook-static',
])

export const MAX_MANIFESTS_PER_SCAN = 50
export const MAX_MANIFEST_BYTES = 1_000_000
export const MAX_TREE_ENTRIES = 20_000
export const MAX_TREE_DEPTH = 6
export const MAX_CONCURRENT_REQUESTS = 20
export const GITHUB_REQUEST_TIMEOUT_MS = 10_000
// GitHub GraphQL allows many aliased blob lookups in a single request.
export const GRAPHQL_BATCH_SIZE = 25

// Ordered so lockfiles can be matched before their generic counterparts.
export const MANIFEST_MATCHERS = [
  { id: 'package.json', test: (name) => name === 'package.json', ecosystem: 'npm', parser: 'packageJson' },
  { id: 'package-lock.json', test: (name) => name === 'package-lock.json', ecosystem: 'npm', parser: 'npmLock' },
  { id: 'npm-shrinkwrap.json', test: (name) => name === 'npm-shrinkwrap.json', ecosystem: 'npm', parser: 'npmLock' },
  { id: 'yarn.lock', test: (name) => name === 'yarn.lock', ecosystem: 'npm', parser: 'yarnLock' },
  { id: 'pnpm-lock.yaml', test: (name) => name === 'pnpm-lock.yaml', ecosystem: 'npm', parser: 'pnpmLock' },
  { id: 'requirements.txt', test: (name) => name === 'requirements.txt', ecosystem: 'PyPI', parser: 'requirements' },
  { id: 'pyproject.toml', test: (name) => name === 'pyproject.toml', ecosystem: 'PyPI', parser: 'pyproject' },
  { id: 'Pipfile', test: (name) => name === 'Pipfile', ecosystem: 'PyPI', parser: 'pipfile' },
  { id: 'poetry.lock', test: (name) => name === 'poetry.lock', ecosystem: 'PyPI', parser: 'poetryLock' },
  { id: 'pom.xml', test: (name) => name === 'pom.xml', ecosystem: 'Maven', parser: 'pom' },
  { id: 'build.gradle', test: (name) => name === 'build.gradle', ecosystem: 'Gradle', parser: 'gradle' },
  { id: 'build.gradle.kts', test: (name) => name === 'build.gradle.kts', ecosystem: 'Gradle', parser: 'gradle' },
  { id: 'Cargo.toml', test: (name) => name === 'Cargo.toml', ecosystem: 'Cargo', parser: 'cargoToml' },
  { id: 'Cargo.lock', test: (name) => name === 'Cargo.lock', ecosystem: 'Cargo', parser: 'cargoLock' },
  { id: 'composer.json', test: (name) => name === 'composer.json', ecosystem: 'Composer', parser: 'composer' },
  { id: 'composer.lock', test: (name) => name === 'composer.lock', ecosystem: 'Composer', parser: 'composerLock' },
  { id: 'Gemfile', test: (name) => name === 'Gemfile', ecosystem: 'RubyGems', parser: 'gemfile' },
  { id: 'Gemfile.lock', test: (name) => name === 'Gemfile.lock', ecosystem: 'RubyGems', parser: 'gemfileLock' },
  { id: 'go.mod', test: (name) => name === 'go.mod', ecosystem: 'Go', parser: 'goMod' },
  { id: 'go.sum', test: (name) => name === 'go.sum', ecosystem: 'Go', parser: 'goSum' },
  { id: 'packages.config', test: (name) => name === 'packages.config', ecosystem: 'NuGet', parser: 'packagesConfig' },
  { id: '*.csproj', test: (name) => name.endsWith('.csproj'), ecosystem: 'NuGet', parser: 'csproj' },
]

export function matchManifest(filePath) {
  if (typeof filePath !== 'string' || filePath.length > 2000) return null
  const normalized = filePath.replace(/\\/g, '/')
  const segments = normalized.split('/')
  if (segments.some((segment) => IGNORED_PATH_SEGMENTS.has(segment))) return null
  const name = segments[segments.length - 1]
  return MANIFEST_MATCHERS.find((matcher) => matcher.test(name)) || null
}

const definitions = [
  {
    key: 'npm',
    label: 'npm',
    aliases: ['npm', 'node', 'javascript', 'typescript'],
    osv: 'npm',
    registry: 'npm',
  },
  {
    key: 'pypi',
    label: 'PyPI',
    aliases: ['pypi', 'python', 'pip'],
    osv: 'PyPI',
    registry: 'pypi',
  },
  {
    key: 'maven',
    label: 'Maven',
    aliases: ['maven', 'gradle'],
    osv: 'Maven',
    registry: 'maven',
  },
  {
    key: 'crates',
    label: 'Cargo',
    aliases: ['cargo', 'crates', 'crates.io', 'rust'],
    osv: 'crates.io',
    registry: 'crates',
  },
  {
    key: 'packagist',
    label: 'Composer',
    aliases: ['composer', 'packagist', 'php'],
    osv: 'Packagist',
    registry: 'packagist',
  },
  {
    key: 'rubygems',
    label: 'RubyGems',
    aliases: ['rubygems', 'ruby', 'gem'],
    osv: 'RubyGems',
    registry: 'rubygems',
  },
  {
    key: 'go',
    label: 'Go',
    aliases: ['go', 'golang', 'go modules', 'gomod'],
    osv: 'Go',
    registry: 'go',
  },
  {
    key: 'nuget',
    label: 'NuGet',
    aliases: ['nuget', '.net', 'dotnet', 'csharp', 'c#'],
    osv: 'NuGet',
    registry: 'nuget',
  },
]

const aliasMap = new Map()
for (const definition of definitions) {
  for (const alias of definition.aliases) aliasMap.set(alias, definition)
}

export const UPDATE_ECOSYSTEMS = definitions

export function normalizeEcosystem(value) {
  if (typeof value !== 'string') return null
  const key = value.trim().toLowerCase()
  return aliasMap.get(key) || null
}

export function osvEcosystem(value) {
  return normalizeEcosystem(value)?.osv || null
}

export function updateEcosystemLabel(value) {
  return normalizeEcosystem(value)?.label || value || 'Unknown'
}

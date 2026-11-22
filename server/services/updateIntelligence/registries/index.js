import { normalizeEcosystem } from '../../../constants/updateEcosystems.js'
import { fetchNpmMetadata } from './npmRegistry.js'
import { fetchPyPIMetadata } from './pypiRegistry.js'
import { fetchMavenMetadata } from './mavenRegistry.js'
import { fetchCratesMetadata } from './cratesRegistry.js'
import { fetchPackagistMetadata } from './packagistRegistry.js'
import { fetchRubyGemsMetadata } from './rubygemsRegistry.js'
import { fetchGoMetadata } from './goRegistry.js'
import { fetchNuGetMetadata } from './nugetRegistry.js'

export const registryClients = {
  npm: fetchNpmMetadata,
  pypi: fetchPyPIMetadata,
  maven: fetchMavenMetadata,
  crates: fetchCratesMetadata,
  packagist: fetchPackagistMetadata,
  rubygems: fetchRubyGemsMetadata,
  go: fetchGoMetadata,
  nuget: fetchNuGetMetadata,
}

export function registryClientFor(ecosystem) {
  const normalized = normalizeEcosystem(ecosystem)
  return normalized ? registryClients[normalized.key] || null : null
}

export const supportedRegistries = Object.keys(registryClients)

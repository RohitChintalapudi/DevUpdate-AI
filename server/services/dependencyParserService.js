/**
 * Dependency manifest parsers.
 *
 * Repository files are untrusted text. Every parser is defensive, never
 * evaluates content and never parses more than the supplied string. Lockfiles
 * only provide resolved versions; they are merged with declared requirements
 * by parseDependencyFiles().
 */

const MAX_PACKAGE_NAME = 214
const MAX_VERSION = 80
const MAX_DEPENDENCIES = 2000

function clean(value, limit = MAX_PACKAGE_NAME) {
  if (value === null || value === undefined) return ''
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

export function versionType(value) {
  const version = clean(value, MAX_VERSION)
  if (!version) return 'unknown'
  if (/^(\*|x|x\.x|x\.x\.x|latest|any)$/i.test(version) || /^\d+\.\d+\.\*$/.test(version)) {
    return 'wildcard'
  }
  if (/^(file:|git\+|git:|https?:|github:|link:|workspace:|npm:)/i.test(version)) return 'unknown'
  if (/^[v=]?\d+(?:\.\d+){0,3}(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) return 'exact'
  return 'range'
}

function makeEntry({
  packageName,
  ecosystem,
  sourceManifest,
  declaredVersion = '',
  resolvedVersion = '',
  dependencyType = 'runtime',
  isDevelopmentDependency = false,
}) {
  const name = clean(packageName)
  if (!name) return null
  return {
    packageName: name,
    ecosystem,
    sourceManifest: clean(sourceManifest, 500),
    declaredVersion: clean(declaredVersion, MAX_VERSION),
    resolvedVersion: clean(resolvedVersion, MAX_VERSION),
    dependencyType,
    isDevelopmentDependency: Boolean(isDevelopmentDependency),
  }
}

function versionOf(value) {
  if (typeof value === 'string' || typeof value === 'number') return clean(value, MAX_VERSION)
  if (value && typeof value === 'object') return clean(value.version, MAX_VERSION)
  return ''
}

function parseJson(content) {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

function npmSelector(selector) {
  const raw = clean(selector, 300).replace(/^["']|["']$/g, '')
  if (!raw) return null
  const at = raw.lastIndexOf('@')
  if (at <= 0) return { packageName: raw, declaredVersion: '' }
  return { packageName: raw.slice(0, at), declaredVersion: raw.slice(at + 1) }
}

function parseDependenciesObject(object, ecosystem, source, dev = false, type = 'runtime') {
  const entries = []
  if (!object || typeof object !== 'object') return entries
  for (const [name, value] of Object.entries(object)) {
    const declared = versionOf(value)
    const entry = makeEntry({
      packageName: name,
      ecosystem,
      sourceManifest: source,
      declaredVersion: declared,
      dependencyType: type,
      isDevelopmentDependency: dev,
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parsePackageJson(content, source) {
  const json = parseJson(content)
  if (!json) return []
  return [
    ...parseDependenciesObject(json.dependencies, 'npm', source),
    ...parseDependenciesObject(json.devDependencies, 'npm', source, true),
    ...parseDependenciesObject(json.optionalDependencies, 'npm', source, false, 'runtime'),
  ]
}

function parseNpmLock(content, source) {
  const json = parseJson(content)
  if (!json) return []
  const entries = []
  if (json.packages && typeof json.packages === 'object') {
    for (const [path, value] of Object.entries(json.packages)) {
      const name = path.startsWith('node_modules/') ? path.slice('node_modules/'.length) : ''
      if (!name || name.includes('node_modules/')) continue
      const entry = makeEntry({
        packageName: name,
        ecosystem: 'npm',
        sourceManifest: source,
        resolvedVersion: value?.version || '',
        dependencyType: value?.dev ? 'development' : 'runtime',
        isDevelopmentDependency: Boolean(value?.dev),
      })
      if (entry) entries.push(entry)
    }
  }
  if (json.dependencies && typeof json.dependencies === 'object') {
    for (const [name, value] of Object.entries(json.dependencies)) {
      const entry = makeEntry({
        packageName: name,
        ecosystem: 'npm',
        sourceManifest: source,
        resolvedVersion: value?.version || '',
        dependencyType: value?.dev ? 'development' : 'runtime',
        isDevelopmentDependency: Boolean(value?.dev),
      })
      if (entry) entries.push(entry)
    }
  }
  return entries
}

function parseYarnLock(content, source) {
  const entries = []
  const lines = content.split(/\r?\n/)
  let pendingSelectors = []
  for (const line of lines) {
    const header = line.match(/^([^\s#][^:]*):\s*$/)
    if (header) {
      pendingSelectors = header[1].split(',').map((selector) => npmSelector(selector)).filter(Boolean)
      continue
    }
    const version = line.match(/^\s+version\s+["']?([^"'\s]+)["']?\s*$/)
    if (version && pendingSelectors.length) {
      for (const selector of pendingSelectors) {
        const entry = makeEntry({
          packageName: selector.packageName,
          ecosystem: 'npm',
          sourceManifest: source,
          declaredVersion: selector.declaredVersion,
          resolvedVersion: version[1],
        })
        if (entry) entries.push(entry)
      }
      pendingSelectors = []
    }
  }
  return entries
}

function parsePnpmLock(content, source) {
  const entries = []
  const lines = content.split(/\r?\n/)
  let current = null
  for (const line of lines) {
    const header = line.match(/^\s{0,2}\/?([^\s:#][^:]*):\s*$/)
    if (header && !line.trimStart().startsWith('version:')) {
      const parsed = npmSelector(header[1])
      if (parsed) current = parsed
      continue
    }
    const version = line.match(/^\s{2,4}version:\s*["']?([^"'\s]+)["']?\s*$/)
    if (version && current) {
      const entry = makeEntry({
        packageName: current.packageName,
        ecosystem: 'npm',
        sourceManifest: source,
        declaredVersion: current.declaredVersion,
        resolvedVersion: version[1],
      })
      if (entry) entries.push(entry)
      current = null
    }
  }
  return entries
}

function parseRequirements(content, source) {
  const entries = []
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue
    const match = trimmed.match(/^([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?\s*(.*)$/)
    if (!match) continue
    const entry = makeEntry({
      packageName: match[1],
      ecosystem: 'PyPI',
      sourceManifest: source,
      declaredVersion: match[2].split(';')[0].trim(),
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parseTomlStringList(content, marker) {
  const start = content.indexOf(marker)
  if (start === -1) return []
  const tail = content.slice(start + marker.length)
  const end = tail.indexOf(']')
  const block = end === -1 ? tail : tail.slice(0, end)
  return [...block.matchAll(/["']([^"']+)["']/g)].map((match) => match[1])
}

function parsePyproject(content, source) {
  const entries = []
  for (const value of parseTomlStringList(content, 'dependencies')) {
    const match = value.match(/^([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?\s*(.*)$/)
    if (!match) continue
    const entry = makeEntry({
      packageName: match[1],
      ecosystem: 'PyPI',
      sourceManifest: source,
      declaredVersion: match[2],
    })
    if (entry) entries.push(entry)
  }

  let section = ''
  let dev = false
  for (const line of content.split(/\r?\n/)) {
    const header = line.match(/^\s*\[([^\]]+)\]\s*$/)
    if (header) {
      section = header[1].trim()
      dev = /optional-dependencies|dev|test/i.test(section)
      continue
    }
    if (!/^(dependencies|\[tool\.poetry)/.test(section) && !section.startsWith('tool.poetry')) continue
    if (section === 'project' || section.startsWith('project.optional')) continue
    const assignment = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.+?)\s*$/)
    if (!assignment) continue
    const name = assignment[1]
    if (name === 'python') continue
    let value = assignment[2]
    const inline = value.match(/\{\s*version\s*=\s*["']([^"']+)["']/)
    if (inline) value = inline[1]
    else value = value.replace(/^["']|["']$/g, '')
    const entry = makeEntry({
      packageName: name,
      ecosystem: 'PyPI',
      sourceManifest: source,
      declaredVersion: value,
      dependencyType: dev || /dev|test/i.test(section) ? 'development' : 'runtime',
      isDevelopmentDependency: dev || /dev|test/i.test(section),
    })
    if (entry) entries.push(entry)
  }
  return dedupeEntries(entries)
}

function parsePipfile(content, source) {
  const entries = []
  let dev = false
  for (const line of content.split(/\r?\n/)) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/)
    if (section) {
      dev = section[1].trim() === 'dev-packages'
      continue
    }
    const assignment = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.+?)\s*$/)
    if (!assignment) continue
    let value = assignment[2]
    const inline = value.match(/version\s*=\s*["']([^"']+)["']/)
    if (inline) value = inline[1]
    else value = value.replace(/^["']|["']$/g, '')
    const entry = makeEntry({
      packageName: assignment[1],
      ecosystem: 'PyPI',
      sourceManifest: source,
      declaredVersion: value,
      dependencyType: dev ? 'development' : 'runtime',
      isDevelopmentDependency: dev,
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parsePoetryLock(content, source) {
  const entries = []
  for (const block of content.split(/\[\[package\]\]/).slice(1)) {
    const name = block.match(/^\s*name\s*=\s*["']([^"']+)["']/m)?.[1]
    const version = block.match(/^\s*version\s*=\s*["']([^"']+)["']/m)?.[1]
    const category = block.match(/^\s*category\s*=\s*["']([^"']+)["']/m)?.[1] || ''
    const entry = makeEntry({
      packageName: name,
      ecosystem: 'PyPI',
      sourceManifest: source,
      resolvedVersion: version,
      dependencyType: /dev|test/i.test(category) ? 'development' : 'runtime',
      isDevelopmentDependency: /dev|test/i.test(category),
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parsePom(content, source) {
  const entries = []
  const withoutComments = content.replace(/<!--[\s\S]*?-->/g, '')
  for (const block of withoutComments.matchAll(/<dependency\b[^>]*>([\s\S]*?)<\/dependency>/gi)) {
    const xml = block[1]
    const artifact = xml.match(/<artifactId\b[^>]*>([^<]+)<\/artifactId>/i)?.[1]
    const version = xml.match(/<version\b[^>]*>([^<]+)<\/version>/i)?.[1] || ''
    const scope = xml.match(/<scope\b[^>]*>([^<]+)<\/scope>/i)?.[1] || ''
    const dev = /test|provided/i.test(scope)
    const entry = makeEntry({
      packageName: artifact,
      ecosystem: 'Maven',
      sourceManifest: source,
      declaredVersion: version.startsWith('${') ? '' : version,
      dependencyType: dev ? 'development' : 'runtime',
      isDevelopmentDependency: dev,
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parseGradle(content, source) {
  const entries = []
  const pattern = /\b(implementation|api|compile|compileOnly|runtimeOnly|testImplementation|androidTestImplementation|annotationProcessor|kapt)\s*(?:\(\s*|\s+)?["']([^"']+)["']/gi
  for (const match of content.matchAll(pattern)) {
    const notation = match[2]
    const parts = notation.split(':')
    if (parts.length < 2) continue
    const [group, name, version = ''] = parts
    const dev = /test/i.test(match[1])
    const type = /annotationProcessor|kapt/i.test(match[1]) ? 'build' : dev ? 'development' : 'runtime'
    const entry = makeEntry({
      packageName: `${group}:${name}`,
      ecosystem: 'Gradle',
      sourceManifest: source,
      declaredVersion: version.startsWith('$') ? '' : version,
      dependencyType: type,
      isDevelopmentDependency: dev,
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parseCargoToml(content, source) {
  const entries = []
  let section = ''
  for (const line of content.split(/\r?\n/)) {
    const header = line.match(/^\s*\[([^\]]+)\]\s*$/)
    if (header) {
      section = header[1].trim()
      continue
    }
    if (!/dependencies/.test(section)) continue
    const assignment = line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/)
    if (!assignment) continue
    let value = assignment[2]
    const inline = value.match(/version\s*=\s*["']([^"']+)["']/)
    if (inline) value = inline[1]
    else value = value.replace(/^["']|["']$/g, '')
    const dev = /dev-dependencies/.test(section)
    const build = /build-dependencies/.test(section)
    const entry = makeEntry({
      packageName: assignment[1],
      ecosystem: 'Cargo',
      sourceManifest: source,
      declaredVersion: value,
      dependencyType: build ? 'build' : dev ? 'development' : 'runtime',
      isDevelopmentDependency: dev,
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parseCargoLock(content, source) {
  const entries = []
  for (const block of content.split(/\[\[package\]\]/).slice(1)) {
    const name = block.match(/^\s*name\s*=\s*["']([^"']+)["']/m)?.[1]
    const version = block.match(/^\s*version\s*=\s*["']([^"']+)["']/m)?.[1]
    const entry = makeEntry({
      packageName: name,
      ecosystem: 'Cargo',
      sourceManifest: source,
      resolvedVersion: version,
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parseComposer(content, source) {
  const json = parseJson(content)
  if (!json) return []
  return [
    ...parseDependenciesObject(json.require, 'Composer', source).filter((entry) => !/^(php$|ext-|lib-)/.test(entry.packageName)),
    ...parseDependenciesObject(json['require-dev'], 'Composer', source, true, 'development').filter(
      (entry) => !/^(php$|ext-|lib-)/.test(entry.packageName),
    ),
  ]
}

function parseComposerLock(content, source) {
  const json = parseJson(content)
  if (!json) return []
  const entries = []
  for (const [key, dev] of [['packages', false], ['packages-dev', true]]) {
    for (const item of json[key] || []) {
      const entry = makeEntry({
        packageName: item?.name,
        ecosystem: 'Composer',
        sourceManifest: source,
        resolvedVersion: item?.version || '',
        dependencyType: dev ? 'development' : 'runtime',
        isDevelopmentDependency: dev,
      })
      if (entry) entries.push(entry)
    }
  }
  return entries
}

function parseGemfile(content, source) {
  const entries = []
  let dev = false
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*group\s+.*:development|^\s*group\s+:test/i.test(line)) dev = true
    if (/^\s*end\s*$/.test(line)) dev = false
    const match = line.match(/^\s*gem\s+["']([^"']+)["']\s*,?\s*(?:(["'])(.*?)\2|([^\s#][^#]*))?$/)
    if (!match) continue
    const entry = makeEntry({
      packageName: match[1],
      ecosystem: 'RubyGems',
      sourceManifest: source,
      declaredVersion: (match[3] || match[4] || '').trim(),
      dependencyType: dev ? 'development' : 'runtime',
      isDevelopmentDependency: dev,
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parseGemfileLock(content, source) {
  const entries = []
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s{4}([A-Za-z0-9_.-]+)\s+\(([^)]+)\)\s*$/)
    if (!match) continue
    const entry = makeEntry({
      packageName: match[1],
      ecosystem: 'RubyGems',
      sourceManifest: source,
      resolvedVersion: match[2],
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parseGoMod(content, source) {
  const entries = []
  let inBlock = false
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (/^require\s*\($/.test(trimmed)) {
      inBlock = true
      continue
    }
    if (inBlock && trimmed === ')') {
      inBlock = false
      continue
    }
    const match = trimmed.match(/^(?:require\s+)?([^\s]+)\s+(v[^\s]+)/)
    if (!match || /^(\/\/|replace|exclude|module|go\s)/.test(trimmed)) continue
    const entry = makeEntry({
      packageName: match[1],
      ecosystem: 'Go',
      sourceManifest: source,
      declaredVersion: match[2],
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parseGoSum(content, source) {
  const entries = []
  for (const line of content.split(/\r?\n/)) {
    const match = line.trim().match(/^([^\s]+)\s+(v[^\s]+)\s+h1:/)
    if (!match) continue
    const entry = makeEntry({
      packageName: match[1],
      ecosystem: 'Go',
      sourceManifest: source,
      resolvedVersion: match[2],
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parseCsproj(content, source) {
  const entries = []
  const pattern = /<PackageReference\b([^>]*)\/?\s*>/gi
  for (const match of content.matchAll(pattern)) {
    const attributes = match[1]
    const name = attributes.match(/\bInclude\s*=\s*["']([^"']+)["']/i)?.[1]
    const version = attributes.match(/\bVersion\s*=\s*["']([^"']+)["']/i)?.[1] || ''
    const entry = makeEntry({
      packageName: name,
      ecosystem: 'NuGet',
      sourceManifest: source,
      declaredVersion: version.startsWith('$') ? '' : version,
      dependencyType: 'build',
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function parsePackagesConfig(content, source) {
  const entries = []
  for (const match of content.matchAll(/<package\b([^>]*)\/?\s*>/gi)) {
    const attributes = match[1]
    const name = attributes.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1]
    const version = attributes.match(/\bversion\s*=\s*["']([^"']+)["']/i)?.[1] || ''
    const entry = makeEntry({
      packageName: name,
      ecosystem: 'NuGet',
      sourceManifest: source,
      declaredVersion: version,
    })
    if (entry) entries.push(entry)
  }
  return entries
}

function dedupeEntries(entries) {
  const seen = new Set()
  return entries.filter((entry) => {
    const key = `${entry.ecosystem}:${entry.packageName.toLowerCase()}:${entry.declaredVersion}:${entry.resolvedVersion}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const parsers = {
  packageJson: parsePackageJson,
  npmLock: parseNpmLock,
  yarnLock: parseYarnLock,
  pnpmLock: parsePnpmLock,
  requirements: parseRequirements,
  pyproject: parsePyproject,
  pipfile: parsePipfile,
  poetryLock: parsePoetryLock,
  pom: parsePom,
  gradle: parseGradle,
  cargoToml: parseCargoToml,
  cargoLock: parseCargoLock,
  composer: parseComposer,
  composerLock: parseComposerLock,
  gemfile: parseGemfile,
  gemfileLock: parseGemfileLock,
  goMod: parseGoMod,
  goSum: parseGoSum,
  csproj: parseCsproj,
  packagesConfig: parsePackagesConfig,
}

export function parseManifest(parser, content, sourceManifest = '') {
  const fn = parsers[parser]
  if (typeof fn !== 'function' || typeof content !== 'string') return []
  try {
    return fn(content, sourceManifest).filter(Boolean).slice(0, MAX_DEPENDENCIES)
  } catch {
    return []
  }
}

/**
 * Parse all discovered files and merge declared requirements with lockfile
 * resolutions. Declared and resolved versions are never conflated.
 */
export function parseDependencyFiles(files) {
  const declared = new Map()
  const resolved = new Map()

  for (const file of files) {
    const source = clean(file?.path || 'manifest', 500)
    for (const entry of parseManifest(file?.parser, file?.content || '', source)) {
      const key = `${entry.ecosystem.toLowerCase()}:${entry.packageName.toLowerCase()}`
      if (entry.declaredVersion && !declared.has(key)) declared.set(key, entry)
      if (entry.resolvedVersion && !resolved.has(key)) {
        resolved.set(key, { ...entry, declaredVersion: '', sourceManifest: source })
      }
    }
  }

  const keys = new Set([...declared.keys(), ...resolved.keys()])
  const dependencies = []
  for (const key of keys) {
    if (dependencies.length >= MAX_DEPENDENCIES) break
    const requirement = declared.get(key)
    const resolution = resolved.get(key)
    const base = requirement || resolution
    if (!base) continue
    dependencies.push({
      packageName: base.packageName,
      ecosystem: base.ecosystem,
      declaredVersion: requirement?.declaredVersion || '',
      resolvedVersion: resolution?.resolvedVersion || '',
      dependencyType: base.dependencyType || 'runtime',
      sourceManifest: base.sourceManifest,
      isDevelopmentDependency: Boolean(base.isDevelopmentDependency),
      versionType: requirement?.declaredVersion ? versionType(requirement.declaredVersion) : 'unknown',
      extractedAt: new Date().toISOString(),
    })
  }

  return dependencies.sort((a, b) =>
    a.ecosystem.localeCompare(b.ecosystem) || a.packageName.localeCompare(b.packageName),
  )
}

export const supportedParsers = Object.keys(parsers)

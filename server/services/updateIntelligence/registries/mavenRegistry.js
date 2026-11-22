import { cachedRegistryJson } from '../cache/registryCache.js'
import { buildRegistryMetadata, notFound, requirePackageName } from './registryUtils.js'

const TTL_MS = 30 * 60 * 1000

function tagValue(xml, name) {
  const match = xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`))
  return match?.[1]?.trim() || ''
}

function xmlVersions(xml) {
  const block = xml.match(/<versions\b[^>]*>([\s\S]*?)<\/versions>/i)?.[1] || ''
  return [...block.matchAll(/<version\b[^>]*>([^<]+)<\/version>/gi)].map((match) => match[1].trim())
}

function parseMavenTimestamp(value) {
  const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)
  if (!match) return null
  const [, year, month, day, hour, minute, second] = match
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function coordinatesFor(dependency) {
  const packageName = requirePackageName(dependency.packageName, 'Maven artifact')
  if (dependency.groupId && dependency.artifactId) {
    return {
      groupId: String(dependency.groupId).trim(),
      artifactId: String(dependency.artifactId).trim(),
    }
  }
  if (packageName.includes(':')) {
    const [groupId, artifactId] = packageName.split(':').map((part) => part.trim())
    if (groupId && artifactId) return { groupId, artifactId }
  }
  return { groupId: '', artifactId: packageName }
}

async function findGroupId(artifactId) {
  const params = new URLSearchParams({ q: `a:"${artifactId}"`, rows: '5', wt: 'json' })
  const url = `https://search.maven.org/solrsearch/select?${params.toString()}`
  const { data } = await cachedRegistryJson({
    key: `maven-search:${artifactId.toLowerCase()}`,
    url,
    ttlMs: TTL_MS,
    limiter: 'maven',
    label: `Maven Central search for ${artifactId}`,
  })
  const docs = data?.response?.docs || []
  const exact = docs.find((doc) => doc.a === artifactId) || docs[0]
  return exact?.g || ''
}

export async function fetchMavenMetadata(dependency) {
  let { groupId, artifactId } = coordinatesFor(dependency)
  if (!groupId) groupId = await findGroupId(artifactId)
  if (!groupId || !artifactId) throw notFound('Maven Central', dependency.packageName || artifactId)

  const groupPath = groupId.replace(/\./g, '/')
  const url = `https://repo1.maven.org/maven2/${encodeURI(groupPath)}/${encodeURIComponent(artifactId)}/maven-metadata.xml`

  const { data: xml, notModified } = await cachedRegistryJson({
    key: `maven:${groupId}:${artifactId}`,
    url,
    ttlMs: TTL_MS,
    limiter: 'maven',
    label: `Maven Central lookup for ${groupId}:${artifactId}`,
    parse: 'text',
    headers: { Accept: 'application/xml' },
  })

  if (!xml || typeof xml !== 'string' || !xml.includes('<metadata')) {
    throw notFound('Maven Central', `${groupId}:${artifactId}`)
  }

  const versions = xmlVersions(xml)
  if (!versions.length) throw notFound('Maven Central', `${groupId}:${artifactId}`)

  const releaseVersion = tagValue(xml, 'release')
  const latestTag = tagValue(xml, 'latest')
  const latestVersion = releaseVersion || latestTag || versions[versions.length - 1]
  const publishedAt = parseMavenTimestamp(tagValue(xml, 'lastUpdated'))

  return buildRegistryMetadata({
    ecosystem: 'maven',
    packageName: `${groupId}:${artifactId}`,
    latestVersion,
    allVersions: versions,
    versionDetails: new Map([[latestVersion, { publishedAt }]]),
    repositoryUrl: `https://central.sonatype.com/artifact/${groupId}/${artifactId}`,
    registryUrl: `https://repo1.maven.org/maven2/${groupPath}/${artifactId}/`,
    distTags: { release: releaseVersion, latest: latestTag },
    coordinates: { groupId, artifactId },
    source: notModified ? 'maven-cache' : 'maven',
  })
}

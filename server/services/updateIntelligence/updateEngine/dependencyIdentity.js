import mongoose from 'mongoose'

/**
 * A dependency's Mongo _id changes whenever the repository is rescanned, so it
 * cannot be used as its long-term identity. This stable key is derived from the
 * package identity and survives rescans.
 */
/** Stable signature used by the scanner to dedupe manifest rows. */
export function dependencySignatureFor(record = {}) {
  return [
    record.ecosystem || '',
    record.packageName || '',
    record.dependencyType || '',
    record.sourceManifest || '',
    record.declaredVersion || '',
    record.resolvedVersion || '',
  ].join('::')
}

export function dependencyKeyFor(record = {}) {
  const ecosystem = String(record.ecosystem || '').trim().toLowerCase()
  const coordinates = record.metadata?.coordinates || {}
  const groupId = String(record.groupId || coordinates.groupId || '').trim().toLowerCase()
  const artifactId = String(record.artifactId || coordinates.artifactId || '').trim().toLowerCase()
  const packageName = String(record.packageName || '').trim().toLowerCase()

  if (!ecosystem) return ''
  const identity =
    groupId && artifactId ? `${groupId}:${artifactId}` : groupId || artifactId || packageName
  if (!identity) return ''

  return `${ecosystem}::${identity}`
}

function idMatch(value) {
  if (value === undefined || value === null || value === '') return null
  const text = String(value)
  const objectId =
    value instanceof mongoose.Types.ObjectId
      ? value
      : mongoose.Types.ObjectId.isValid(text)
        ? new mongoose.Types.ObjectId(text)
        : value
  return { $in: [objectId, text] }
}

export function dependencyUpdateMatch(record = {}) {
  const match = {}
  const userId = idMatch(record.userId)
  const repositoryId = idMatch(record.repositoryId)
  if (userId) match.userId = userId
  if (repositoryId) match.repositoryId = repositoryId

  const or = []
  const key = dependencyKeyFor(record)
  if (key) or.push({ dependencyKey: key })
  const dependencyId = idMatch(record.dependencyId || record._id)
  if (dependencyId) or.push({ dependencyId })
  if (or.length) match.$or = or
  return match
}

export function dependencyResearchMatch(record = {}) {
  const match = {}
  const userId = idMatch(record.userId)
  const repositoryId = idMatch(record.repositoryId)
  if (userId) match.userId = userId
  if (repositoryId) match.repositoryId = repositoryId

  const or = []
  const key = dependencyKeyFor(record)
  if (key) or.push({ dependencyKey: key })
  const dependencyId = idMatch(record.dependencyId || record._id)
  if (dependencyId) or.push({ dependencyId })
  if (or.length) match.$or = or
  return match
}

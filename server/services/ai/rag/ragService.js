import DocumentChunk from '../../../models/DocumentChunk.js'
import { evidenceId } from '../evidence/sourceCollector.js'
import { buildMetadataFilter, embedTexts, queryVectors } from '../vector/pineconeStore.js'
import { truncate } from '../../../utils/aiText.js'

function rowFromMatch(match) {
  const metadata = match.metadata || {}
  const id = String(metadata.evidenceId || evidenceId('doc', metadata.chunkHash || metadata.sourceUrl || match.id))
  return {
    id,
    title: metadata.title || 'Retrieved documentation',
    url: metadata.sourceUrl || '',
    sourceType: metadata.sourceType || 'OFFICIAL_DOCS',
    excerpt: truncate(metadata.text || '', 1600),
    score: Number(match.score) || 0,
    retrievedAt: metadata.retrievedAt || new Date().toISOString(),
    publishedAt: metadata.publishedAt || null,
    documentId: metadata.documentId || '',
    chunkIndex: Number(metadata.chunkIndex) || 0,
    source: 'Pinecone RAG retrieval',
    verificationStatus: metadata.sourceType === 'AI_INTERPRETATION' ? 'UNVERIFIED' : 'VERIFIED',
  }
}

async function hydrateRows(rows, userId) {
  const ids = rows.map((row) => row.documentId).filter(Boolean)
  if (!ids.length) return rows
  const chunks = await DocumentChunk.find({ _id: { $in: ids }, userId }).select('chunkText').lean()
  const byId = new Map(chunks.map((chunk) => [String(chunk._id), chunk.chunkText]))
  return rows.map((row) => ({
    ...row,
    excerpt: truncate(byId.get(String(row.documentId)) || row.excerpt, 1800),
  }))
}

/**
 * Retrieves only records that pass the supplied metadata filter. A broader
 * package-level retry is used when version-specific documentation is absent,
 * but it stays inside the same user and repository namespace.
 */
export async function retrieveEvidence({
  userId,
  repositoryId,
  packageName = '',
  ecosystem = '',
  version = '',
  query,
  topK = 8,
}) {
  const limitations = []
  try {
    const [queryVector] = await embedTexts([query || packageName || 'release notes'], 'query')
    if (!queryVector?.length) {
      return { rows: [], status: 'UNAVAILABLE', limitations: ['Embeddings are unavailable.'] }
    }

    const base = { userId, repositoryId, packageName, ecosystem }
    const strictFilter = buildMetadataFilter({ ...base, version })
    let matches = await queryVectors({ userId, vector: queryVector, filter: strictFilter, topK })

    if (matches.length < 3 && version) {
      const broadMatches = await queryVectors({
        userId,
        vector: queryVector,
        filter: buildMetadataFilter(base),
        topK,
      })
      const seen = new Set(matches.map((match) => match.id))
      const additions = broadMatches.filter((match) => !seen.has(match.id))
      matches = [...matches, ...additions].slice(0, topK)
      if (additions.length) limitations.push('Version-specific documents were unavailable; broader package documentation was used.')
    }

    const rows = await hydrateRows(matches.slice(0, topK).map(rowFromMatch), userId)
    return {
      rows,
      status: rows.length ? 'AVAILABLE' : 'NO_RESULTS',
      limitations: rows.length ? limitations : [...limitations, 'No indexed documentation matched this package and repository.'],
    }
  } catch (error) {
    return {
      rows: [],
      status: 'UNAVAILABLE',
      limitations: [`Vector retrieval failed: ${String(error?.message || error).slice(0, 180)}`],
    }
  }
}

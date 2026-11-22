import DocumentChunk from '../../../models/DocumentChunk.js'
import { chunkText, contentHash, normalizeDocumentContent, truncate } from '../../../utils/aiText.js'
import { sanitizeText } from '../../../utils/sanitize.js'
import { buildMetadataFilter, deleteVectors, embedTexts, upsertVectors, vectorConfig } from '../vector/pineconeStore.js'

function chunkMetadata({ userId, repositoryId, dependencyId, packageName, ecosystem, version, document, chunk }) {
  return {
    userId: String(userId),
    repositoryId: repositoryId ? String(repositoryId) : '',
    dependencyId: dependencyId ? String(dependencyId) : '',
    packageName: sanitizeText(packageName, 214).toLowerCase(),
    ecosystem: sanitizeText(ecosystem, 40).toLowerCase(),
    version: sanitizeText(version, 80),
    sourceUrl: sanitizeText(document.sourceUrl || document.url, 1000),
    sourceType: sanitizeText(document.sourceType || 'OFFICIAL_DOCS', 80),
    documentId: String(document._id || document.id),
    evidenceId: String(document.evidenceId || `doc-${contentHash(document.sourceUrl || document._id).slice(0, 12)}`),
    title: sanitizeText(document.title, 240),
    publishedAt: document.publishedAt ? new Date(document.publishedAt).toISOString() : '',
    retrievedAt: new Date().toISOString(),
    chunkIndex: chunk.index,
    chunkHash: chunk.hash,
    text: truncate(chunk.text, 1400),
  }
}

export async function ingestDocuments({
  userId,
  repositoryId = null,
  dependencyId = null,
  packageName = '',
  ecosystem = '',
  version = '',
  documents = [],
  onProgress = () => {},
}) {
  const usable = documents.filter((document) => normalizeDocumentContent(document.content || document.markdown || ''))
  if (!usable.length) {
    return { documents: 0, chunks: 0, indexed: 0, status: 'NO_CONTENT' }
  }

  await deleteVectors({
    userId,
    filter: buildMetadataFilter({
      userId,
      repositoryId,
      packageName,
      ecosystem,
      version,
    }),
  }).catch(() => {})

  await DocumentChunk.deleteMany({
    userId,
    ...(repositoryId ? { repositoryId } : {}),
    packageName: sanitizeText(packageName, 214).toLowerCase(),
    ...(version ? { version } : {}),
  })

  let chunkCount = 0
  let indexed = 0
  const { embeddingModel } = vectorConfig()

  for (const document of usable) {
    const sourceType = sanitizeText(document.sourceType || 'OFFICIAL_DOCS', 80)
    const text = normalizeDocumentContent(document.content || document.markdown)
    const chunks = chunkText(text, { maxChars: 1600, overlapChars: 160 })

    for (const chunk of chunks) {
      const metadata = chunkMetadata({
        userId,
        repositoryId,
        dependencyId,
        packageName,
        ecosystem,
        version,
        document,
        chunk,
      })
      const vectorId = `${metadata.documentId}-${chunk.index}-${chunk.hash.slice(0, 10)}`
      await DocumentChunk.updateOne(
        { documentId: document._id || document.id, chunkIndex: chunk.index },
        {
          $set: {
            userId,
            repositoryId,
            dependencyId,
            packageName: metadata.packageName,
            ecosystem: metadata.ecosystem,
            version: metadata.version,
            sourceUrl: metadata.sourceUrl,
            sourceType,
            publishedAt: document.publishedAt || null,
            retrievedAt: new Date(),
            contentHash: chunk.hash,
            chunkText: chunk.text,
            embeddingModel,
            vectorId,
            indexed: false,
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      )
      chunkCount += 1
    }
    await onProgress({ documents: 1, chunks: chunkCount })
  }

  const pending = await DocumentChunk.find({
    userId,
    ...(repositoryId ? { repositoryId } : {}),
    packageName: sanitizeText(packageName, 214).toLowerCase(),
    ...(version ? { version } : {}),
    indexed: false,
  }).sort({ createdAt: 1 })

  const batchSize = 48
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize)
    const vectors = await embedTexts(batch.map((chunk) => chunk.chunkText), 'passage')
    if (vectors.length !== batch.length) {
      throw new Error('Pinecone returned an unexpected number of embeddings.')
    }
    await upsertVectors({
      userId,
      records: batch.map((chunk, index) => ({
        id: chunk.vectorId || `${chunk._id}`,
        values: vectors[index],
        metadata: chunkMetadata({
          userId,
          repositoryId,
          dependencyId,
          packageName,
          ecosystem,
          version,
          document: {
            _id: chunk.documentId,
            sourceUrl: chunk.sourceUrl,
            sourceType: chunk.sourceType,
            title: chunk.title || '',
            publishedAt: chunk.publishedAt,
            evidenceId: undefined,
          },
          chunk: { index: chunk.chunkIndex, hash: chunk.contentHash, text: chunk.chunkText },
        }),
      })),
    })
    await DocumentChunk.updateMany(
      { _id: { $in: batch.map((chunk) => chunk._id) } },
      { $set: { indexed: true, embeddingModel } },
    )
    indexed += batch.length
  }

  return { documents: usable.length, chunks: chunkCount, indexed, status: 'INDEXED' }
}

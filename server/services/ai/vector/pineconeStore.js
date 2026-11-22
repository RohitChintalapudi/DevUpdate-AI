import { Pinecone } from '@pinecone-database/pinecone'
import { AppError } from '../../../utils/errors.js'
import { sanitizeText } from '../../../utils/sanitize.js'

let client
let indexPromise

export function isPineconeConfigured() {
  return Boolean(process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY.trim())
}

export function vectorConfig() {
  return {
    indexName: process.env.PINECONE_INDEX_NAME || 'devupdate-ai',
    embeddingModel: process.env.EMBEDDING_MODEL || 'multilingual-e5-large',
    dimensions: Number(process.env.EMBEDDING_DIMENSIONS) || 1024,
    prefix: process.env.PINECONE_NAMESPACE_PREFIX || 'devupdate',
  }
}

function getClient() {
  if (!isPineconeConfigured()) {
    throw new AppError(
      'Pinecone is not configured. Set PINECONE_API_KEY on the server.',
      503,
    )
  }
  if (!client) client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  return client
}

export function userNamespace(userId) {
  const safe = String(userId || '').replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safe) throw new AppError('A user is required for Vector search.', 400)
  const { prefix } = vectorConfig()
  return `${prefix}_${safe}`.slice(0, 100)
}

async function ensureIndex() {
  if (indexPromise) return indexPromise
  indexPromise = (async () => {
    const pinecone = getClient()
    const { indexName, dimensions } = vectorConfig()
    const listed = await pinecone.listIndexes()
    const indexes = Array.isArray(listed) ? listed : listed.indexes || []
    if (!indexes.some((item) => item.name === indexName)) {
      await pinecone.indexes.create(
        {
          name: indexName,
          schema: {
            fields: {
              _values: {
                type: 'dense_vector',
                dimension: dimensions,
                metric: 'cosine',
              },
            },
          },
          waitUntilReady: true,
          suppressConflicts: true,
        },
      )
    }
    return indexName
  })().catch((error) => {
    indexPromise = null
    throw error
  })
  return indexPromise
}

async function getIndex(userId) {
  const name = await ensureIndex()
  return getClient().index({ name, namespace: userNamespace(userId) })
}

export async function embedTexts(inputs, inputType = 'passage') {
  if (!Array.isArray(inputs) || !inputs.length) return []
  const pinecone = getClient()
  const { embeddingModel } = vectorConfig()
  const response = await pinecone.inference.embed({
    model: embeddingModel,
    inputs: inputs.map((input) => sanitizeText(input, 8000)),
    parameters: { inputType, truncate: 'END' },
  })

  const rows = response?.data || (Array.isArray(response) ? response : [])
  return rows.map((row) => row.values || []).filter((values) => values.length > 0)
}

export function buildMetadataFilter({
  userId,
  repositoryId,
  packageName,
  ecosystem,
  version,
  sourceType,
  documentId,
} = {}) {
  const filter = {}
  if (userId) filter.userId = { $eq: String(userId) }
  if (repositoryId) filter.repositoryId = { $eq: String(repositoryId) }
  if (packageName) filter.packageName = { $eq: sanitizeText(packageName, 214).toLowerCase() }
  if (ecosystem) filter.ecosystem = { $eq: sanitizeText(ecosystem, 40).toLowerCase() }
  if (version) filter.version = { $eq: sanitizeText(version, 80) }
  if (sourceType) filter.sourceType = { $eq: sanitizeText(sourceType, 80) }
  if (documentId) filter.documentId = { $eq: String(documentId) }
  return filter
}

export async function upsertVectors({ userId, records = [] }) {
  if (!records.length) return { upserted: 0 }
  const index = await getIndex(userId)
  await index.upsert({ records })
  return { upserted: records.length }
}

export async function queryVectors({ userId, vector, filter = {}, topK = 8 }) {
  if (!Array.isArray(vector) || !vector.length) return []
  const index = await getIndex(userId)
  const result = await index.query({
    vector,
    topK: Math.max(1, Math.min(30, Number(topK) || 8)),
    filter: Object.keys(filter).length ? filter : undefined,
    includeMetadata: true,
    includeValues: false,
  })
  return result.matches || []
}

export async function deleteVectors({ userId, filter }) {
  if (!filter || !Object.keys(filter).length) {
    throw new AppError('A metadata filter is required for vector deletion.', 400)
  }
  const index = await getIndex(userId)
  await index.deleteMany({ filter })
}

export async function getVectorStoreStatus() {
  const config = vectorConfig()
  if (!isPineconeConfigured()) {
    return { configured: false, index: config.indexName, embeddingModel: config.embeddingModel }
  }
  try {
    const indexName = await ensureIndex()
    return {
      configured: true,
      index: indexName,
      embeddingModel: config.embeddingModel,
      dimensions: config.dimensions,
      vectorStore: 'pinecone',
    }
  } catch (error) {
    return {
      configured: true,
      index: config.indexName,
      embeddingModel: config.embeddingModel,
      error: String(error?.message || error).slice(0, 200),
    }
  }
}

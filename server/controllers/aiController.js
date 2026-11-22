import { asyncHandler } from '../utils/errors.js'
import { optionalObjectId, requireObjectId } from '../utils/sanitize.js'
import {
  cancelAiJob,
  getAiAnalysis,
  getAiJob,
  getAiOverview,
  getJobStatusForRepository,
  listAiAnalyses,
  queueDependencyAnalysis,
  queueDocumentationResearch,
  queueRepositoryAnalysis,
} from '../services/ai/jobs/aiScheduler.js'
import { getFirecrawlStatus, listResearchDocuments } from '../services/ai/research/firecrawlResearchService.js'
import { getGroqStatus } from '../services/ai/providers/groqProvider.js'
import { getVectorStoreStatus } from '../services/ai/vector/pineconeStore.js'
import {
  deleteConversation,
  getConversation,
  listConversations,
  sendRepositoryMessage,
} from '../services/ai/chat/repositoryChatService.js'

function pageFrom(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit))
  return { page, limit }
}

export const overview = asyncHandler(async (req, res) => {
  const data = await getAiOverview(req.user._id)
  res.json({ success: true, ...data })
})

export const analyzeDependency = asyncHandler(async (req, res) => {
  const dependencyId = requireObjectId(req.params.dependencyId, 'dependency id')
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  const result = await queueDependencyAnalysis({
    userId: req.user._id,
    repositoryId,
    dependencyId,
  })
  res.status(202).json({ success: true, ...result })
})

export const analyzeRepository = asyncHandler(async (req, res) => {
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  const result = await queueRepositoryAnalysis({ userId: req.user._id, repositoryId })
  res.status(202).json({ success: true, ...result })
})

export const researchDependency = asyncHandler(async (req, res) => {
  const dependencyId = requireObjectId(req.params.dependencyId, 'dependency id')
  const repositoryId = requireObjectId(req.params.repositoryId, 'repository id')
  const result = await queueDocumentationResearch({
    userId: req.user._id,
    repositoryId,
    dependencyId,
  })
  res.status(202).json({ success: true, ...result })
})

export const jobStatus = asyncHandler(async (req, res) => {
  const job = await getAiJob({ userId: req.user._id, jobId: requireObjectId(req.params.jobId, 'job id') })
  res.json({ success: true, job })
})

export const repositoryJobStatus = asyncHandler(async (req, res) => {
  const job = await getJobStatusForRepository({
    userId: req.user._id,
    repositoryId: requireObjectId(req.params.repositoryId, 'repository id'),
  })
  res.json({ success: true, job: job || null })
})

export const analysisDetail = asyncHandler(async (req, res) => {
  const analysis = await getAiAnalysis({
    userId: req.user._id,
    analysisId: requireObjectId(req.params.analysisId, 'analysis id'),
  })
  res.json({ success: true, analysis })
})

export const recommendations = asyncHandler(async (req, res) => {
  const { page, limit } = pageFrom(req.query)
  const data = await listAiAnalyses({
    userId: req.user._id,
    repositoryId: optionalObjectId(req.query.repositoryId, 'repository id'),
    recommendation: req.query.recommendation,
    status: req.query.status,
    page,
    limit,
  })
  res.json({ success: true, ...data })
})

export const cancelJob = asyncHandler(async (req, res) => {
  const result = await cancelAiJob({
    userId: req.user._id,
    jobId: requireObjectId(req.params.jobId, 'job id'),
  })
  res.json({ success: true, ...result })
})

export const chat = asyncHandler(async (req, res) => {
  const result = await sendRepositoryMessage({
    userId: req.user._id,
    repositoryId: requireObjectId(req.params.repositoryId, 'repository id'),
    question: req.body?.question,
    conversationId: req.body?.conversationId || null,
  })
  res.json({ success: true, ...result })
})

export const conversations = asyncHandler(async (req, res) => {
  const items = await listConversations({
    userId: req.user._id,
    repositoryId: requireObjectId(req.params.repositoryId, 'repository id'),
  })
  res.json({ success: true, conversations: items })
})

export const conversationDetail = asyncHandler(async (req, res) => {
  const conversation = await getConversation({
    userId: req.user._id,
    repositoryId: requireObjectId(req.params.repositoryId, 'repository id'),
    conversationId: requireObjectId(req.params.conversationId, 'conversation id'),
  })
  res.json({ success: true, conversation })
})

export const removeConversation = asyncHandler(async (req, res) => {
  const result = await deleteConversation({
    userId: req.user._id,
    conversationId: requireObjectId(req.params.conversationId, 'conversation id'),
  })
  res.json({ success: true, ...result })
})

export const researchDocuments = asyncHandler(async (req, res) => {
  const { limit } = pageFrom(req.query, 30, 100)
  const documents = await listResearchDocuments({
    userId: req.user._id,
    repositoryId: optionalObjectId(req.query.repositoryId, 'repository id'),
    packageName: req.query.packageName,
    limit,
  })
  res.json({ success: true, documents })
})

export const serviceStatus = asyncHandler(async (req, res) => {
  const [groq, firecrawl, pinecone] = await Promise.all([
    Promise.resolve(getGroqStatus()),
    Promise.resolve(getFirecrawlStatus()),
    getVectorStoreStatus(),
  ])
  res.json({ success: true, groq, firecrawl, pinecone })
})

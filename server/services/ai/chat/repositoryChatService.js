import AIAnalysis from '../../../models/AIAnalysis.js'
import AIConversation from '../../../models/AIConversation.js'
import HistoricalComparison from '../../../models/HistoricalComparison.js'
import Repository from '../../../models/Repository.js'
import { AI_LIMITS } from '../../../constants/aiConstants.js'
import { AppError } from '../../../utils/errors.js'
import { sanitizeError, sanitizeText } from '../../../utils/sanitize.js'
import { truncate } from '../../../utils/aiText.js'
import { buildChatPrompt } from '../prompts/aiPrompts.js'
import { chatAnswerSchema } from '../schemas/aiSchemas.js'
import { generateStructured, groqModel } from '../providers/groqProvider.js'
import { retrieveEvidence } from '../rag/ragService.js'
import { getAiOverview } from '../jobs/aiScheduler.js'
import { retrieveMemoryContext, storeChatMemory } from '../../memory/memoryService.js'

/** Exported so isolation rules can be unit tested without a database. */
export function repositoryScope({ userId, repositoryId }) {
  return { _id: repositoryId, userId }
}

/** Exported so conversation reads can be unit tested for user/repository isolation. */
export function conversationScope({ userId, repositoryId, conversationId }) {
  return { _id: conversationId, userId, repositoryId }
}

export function conversationListScope({ userId, repositoryId }) {
  return { userId, repositoryId }
}

export function conversationDeleteScope({ userId, conversationId }) {
  return { _id: conversationId, userId }
}

/** Only an explicit "remember ..." request creates persistent chat memory. */
export function explicitMemoryRequest(question) {
  const match = /\b(?:please\s+)?remember\s+(?:that\s+)?(.+)/i.exec(String(question || ''))
  const captured = match?.[1]?.trim() || ''
  return captured.replace(/[.!?]+$/, '').slice(0, 2000)
}

function citationRows(evidence = [], ids = []) {
  const allowed = new Set(ids.map(String))
  return evidence
    .filter((item) => allowed.has(String(item.id)))
    .map((item) => ({
      id: String(item.id),
      title: String(item.title || 'Source').slice(0, 300),
      url: String(item.url || '').slice(0, 2000),
      sourceType: String(item.sourceType || 'OFFICIAL_DOCS').slice(0, 80),
      excerpt: truncate(item.excerpt || '', 900),
      verificationStatus: item.verificationStatus || 'UNVERIFIED',
    }))
    .slice(0, 20)
}

async function ownedRepository(userId, repositoryId) {
  const repository = await Repository.findOne(repositoryScope({ userId, repositoryId })).lean()
  if (!repository) throw new AppError('Repository not found.', 404)
  return repository
}

function findMentionedPackage(question, analyses = []) {
  const lower = String(question || '').toLowerCase()
  const match = analyses.find((analysis) => analysis.packageName && lower.includes(String(analysis.packageName).toLowerCase()))
  return match?.packageName || ''
}

/** Phase 5 is context-only here; its failure must never break repository chat. */
async function safeChatContext(label, work, fallback) {
  try {
    return await work()
  } catch (error) {
    return { ...fallback, phase5Error: sanitizeError(error) }
  }
}

export async function sendRepositoryMessage({ userId, repositoryId, question, conversationId = null }) {
  const repository = await ownedRepository(userId, repositoryId)
  const cleanQuestion = sanitizeText(question, AI_LIMITS.maxQuestionLength)
  if (!cleanQuestion) throw new AppError('A question is required.', 400)

  let conversation
  if (conversationId) {
    conversation = await AIConversation.findOne(conversationScope({ userId, repositoryId, conversationId }))
    if (!conversation) throw new AppError('Conversation not found.', 404)
  }

  const analyses = await AIAnalysis.find({ userId, repositoryId }).sort({ createdAt: -1 }).limit(10).lean()
  const packageName = findMentionedPackage(cleanQuestion, analyses)
  const dependencyId = analyses.find((analysis) => analysis.packageName === packageName)?.dependencyId || null
  const phase5Limitations = []

  const memoryResult = await safeChatContext(
    'memory',
    () => retrieveMemoryContext({
      userId,
      repositoryId,
      dependencyId,
      query: cleanQuestion,
      limit: 12,
    }),
    { status: 'UNAVAILABLE', mementoStatus: 'UNAVAILABLE', memories: [], limitations: [] },
  )
  const memory = {
    status: memoryResult.status,
    mementoStatus: memoryResult.mementoStatus,
    memories: memoryResult.memories || [],
    limitations: memoryResult.limitations || [],
  }
  phase5Limitations.push(...(memoryResult.limitations || []))
  if (memoryResult.phase5Error) {
    phase5Limitations.push(`Persistent memory was unavailable: ${memoryResult.phase5Error}`)
  }

  const historyRecord = await safeChatContext(
    'history',
    () => HistoricalComparison.findOne({
      userId,
      repositoryId,
      ...(dependencyId ? { dependencyId } : {}),
    }).sort({ createdAt: -1 }).lean(),
    null,
  )
  const historicalContext = historyRecord
    ? { comparison: historyRecord, previousAnalysisId: historyRecord.previousAnalysisId || null }
    : null
  if (historyRecord?.phase5Error) {
    phase5Limitations.push(`Historical comparison was unavailable: ${historyRecord.phase5Error}`)
  }

  const retrieval = await retrieveEvidence({
    userId,
    repositoryId,
    packageName,
    query: cleanQuestion,
    topK: 8,
  })

  const analysisEvidence = analyses
    .flatMap((analysis) => analysis.evidence || [])
    .filter((item) => !packageName || !item.packageName || item.packageName.toLowerCase() === packageName.toLowerCase())
  const evidence = [
    ...retrieval.rows,
    ...analysisEvidence.map((item) => ({ ...item, source: 'Stored AI analysis evidence' })),
  ]
    .filter((item, index, all) => all.findIndex((other) => String(other.id) === String(item.id)) === index)
    .slice(0, 24)

  const history = (conversation?.messages || []).slice(-8).map((message) => ({
    role: message.role,
    content: truncate(message.content, 1200),
  }))

  const prompt = buildChatPrompt({
    repository: repository.fullName,
    question: cleanQuestion,
    evidence,
    context: { status: 'EVIDENCE_ONLY', files: [], limitations: retrieval.limitations },
    analyses: analyses.map((analysis) => ({
      packageName: analysis.packageName,
      targetVersion: analysis.targetVersion,
      recommendation: analysis.recommendation,
      riskLevel: analysis.riskLevel,
      upgradeSummary: analysis.upgradeSummary,
      limitations: analysis.limitations,
    })),
    history,
    memory,
    historicalContext,
  })

  const generation = await generateStructured({
    schema: chatAnswerSchema,
    name: 'repository_chat_answer',
    prompt,
    maxTokens: AI_LIMITS.chatTokenBudget,
    retries: 2,
  })

  const knownIds = new Set(evidence.map((item) => String(item.id)))
  const usedIds = (generation.data.evidenceIds || []).map(String).filter((id) => knownIds.has(id))
  let insufficientEvidence = Boolean(generation.data.insufficientEvidence) || usedIds.length === 0
  let answer = String(generation.data.answer || '').slice(0, 6000)
  if (insufficientEvidence) {
    answer = `I don't have enough verified evidence in this repository to answer that reliably. ${answer}`.trim()
  }

  const citations = citationRows(evidence, usedIds)
  const rememberedContent = explicitMemoryRequest(cleanQuestion)
  const metadata = {
    provider: 'groq',
    model: groqModel(),
    repositoryId: String(repository._id),
    retrievalStatus: retrieval.status,
    retrievalCount: retrieval.rows.length,
    tokens: generation.usage || {},
    memoryStatus: memory.status,
    mementoStatus: memory.mementoStatus,
    memoryCount: memory.memories.length,
    historicalComparisonId: historyRecord?._id ? String(historyRecord._id) : null,
    limitations: phase5Limitations,
  }

  if (!conversation) {
    conversation = await AIConversation.create({
      userId,
      repositoryId,
      title: cleanQuestion.slice(0, 80),
      messages: [],
    })
  }

  if (conversation.messages.length >= AI_LIMITS.maxMessagesPerConversation) {
    throw new AppError('This conversation has reached its message limit. Start a new conversation.', 400)
  }

  if (rememberedContent) {
    const remembered = await safeChatContext(
      'remember',
      () => storeChatMemory({
        userId,
        repositoryId,
        conversationId: conversation._id,
        content: rememberedContent,
        dependencyId,
      }),
      null,
    )
    if (remembered?._id) {
      metadata.rememberedMemoryId = String(remembered._id)
    } else {
      metadata.limitations.push(
        `The explicit memory request could not be stored: ${remembered?.phase5Error || 'memory service unavailable'}`,
      )
    }
  }

  conversation.messages.push({
    role: 'user',
    content: cleanQuestion,
    evidence: [],
    insufficientEvidence: false,
  })
  conversation.messages.push({
    role: 'assistant',
    content: answer,
    evidence: citations,
    insufficientEvidence,
    modelMetadata: metadata,
  })
  await conversation.save()

  return {
    conversationId: String(conversation._id),
    answer,
    evidence: citations,
    insufficientEvidence,
    confidence: insufficientEvidence ? 0 : Number(generation.data.confidence) || 0,
    rememberedMemoryId: metadata.rememberedMemoryId || null,
    modelMetadata: metadata,
  }
}

export async function listConversations({ userId, repositoryId }) {
  await ownedRepository(userId, repositoryId)
  return AIConversation.find(conversationListScope({ userId, repositoryId }))
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean()
}

export async function getConversation({ userId, repositoryId, conversationId }) {
  const conversation = await AIConversation.findOne(conversationScope({ userId, repositoryId, conversationId })).lean()
  if (!conversation) throw new AppError('Conversation not found.', 404)
  return conversation
}

export async function deleteConversation({ userId, conversationId }) {
  const result = await AIConversation.deleteOne(conversationDeleteScope({ userId, conversationId }))
  if (!result.deletedCount) throw new AppError('Conversation not found.', 404)
  return { deleted: true }
}

export async function getChatStatus(userId) {
  const overview = await getAiOverview(userId)
  return {
    provider: 'groq',
    model: groqModel(),
    indexedEvidenceAnalyses: overview.totalAnalyses,
  }
}

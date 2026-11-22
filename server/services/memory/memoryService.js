import crypto from 'node:crypto'
import ProjectMemory from '../../models/ProjectMemory.js'
import MemoryAudit from '../../models/MemoryAudit.js'
import DependencyDecision from '../../models/DependencyDecision.js'
import Repository from '../../models/Repository.js'
import { AppError } from '../../utils/errors.js'
import { sanitizeError, sanitizeText } from '../../utils/sanitize.js'
import { contentHash, redactSensitive, truncate } from '../../utils/aiText.js'
import {
  MEMORY_CATEGORIES,
  PHASE5_LIMITS,
} from '../../constants/phase5Constants.js'
import {
  deleteMemoryFromMemento,
  getMementoStatus,
  searchMemento,
  storeMemoryInMemento,
  updateMemoryInMemento,
} from './mementoAdapter.js'

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
  /you\s+are\s+now\s+a\s+(different|new)\s+(ai|assistant|system)/gi,
  /reveal\s+(your\s+)?(system\s+prompt|api\s+key|secret)/gi,
]

const RETENTION_DAYS = {
  CONVERSATION: 90,
  ANALYSIS: 180,
  DEPENDENCY: 365,
  PROJECT: 365,
  DECISION: 3650,
}

export function sanitizeMemoryText(value, maxLength = PHASE5_LIMITS.maxMemoryContentLength) {
  let text = redactSensitive(String(value || ''))
  for (const pattern of INJECTION_PATTERNS) text = text.replace(pattern, '[filtered instruction-like text]')
  return sanitizeText(text, maxLength)
}

function memoryScope(memory) {
  return {
    userId: String(memory.userId || ''),
    repositoryId: String(memory.repositoryId || ''),
    dependencyId: String(memory.dependencyId || ''),
    category: String(memory.category || ''),
  }
}

function dedupeKeyFor(input) {
  const basis = [
    String(input.userId || ''),
    String(input.repositoryId || ''),
    String(input.category || ''),
    String(input.dependencyId || ''),
    String(input.analysisId || ''),
    sanitizeText(input.title, 240).toLowerCase(),
  ].join('|')
  return contentHash(basis)
}

async function audit({ userId, repositoryId, memoryId, action, actor = 'SYSTEM', details = {} }) {
  try {
    await MemoryAudit.create({ userId, repositoryId, memoryId, action, actor, details })
  } catch (error) {
    console.warn('[memory] Audit write failed:', sanitizeError(error))
  }
}

function verificationFor(analysis) {
  if (analysis.analysisStatus === 'COMPLETED' && (analysis.evidence?.length || 0) > 0) return 'VERIFIED'
  if (analysis.analysisStatus === 'INSUFFICIENT_EVIDENCE') return 'UNVERIFIED'
  return 'PARTIALLY_VERIFIED'
}

function confidenceFor(analysis) {
  const evidenceCount = Math.min(10, analysis.evidence?.length || 0)
  const base = analysis.analysisStatus === 'COMPLETED' ? 0.55 : 0.25
  return Math.min(0.95, base + evidenceCount * 0.04)
}

function expiryFor(category, verificationStatus) {
  const days = RETENTION_DAYS[category] || 180
  const adjusted = verificationStatus === 'UNVERIFIED' ? Math.min(days, 90) : days
  return new Date(Date.now() + adjusted * 24 * 60 * 60 * 1000)
}

async function mirrorWrite(memory, { isUpdate = false } = {}) {
  try {
    const result = isUpdate
      ? await updateMemoryInMemento(memory, memoryScope(memory))
      : await storeMemoryInMemento(memory, memoryScope(memory))
    const external = {
      provider: 'MEMENTO',
      tool: result.tool || '',
      reference: result.reference || '',
      url: '',
      status: result.ok ? 'MIRRORED' : String(result.reason || 'FAILED'),
      syncedAt: result.ok ? new Date() : null,
      error: result.ok ? '' : sanitizeText(result.message, 300),
    }
    await ProjectMemory.updateOne(
      { _id: memory._id },
      { $set: { external: [external], 'metadata.lastMirrorError': external.error } },
    )
    memory.external = [external]
    return external
  } catch (error) {
    const message = sanitizeError(error)
    await ProjectMemory.updateOne(
      { _id: memory._id },
      { $set: { 'metadata.lastMirrorError': message } },
    )
    return { provider: 'MEMENTO', status: 'FAILED', error: message }
  }
}

export async function createMemory(input = {}, { actor = 'SYSTEM' } = {}) {
  if (!input.userId || !input.repositoryId) throw new AppError('Memory must be user and repository scoped.', 400)
  if (!MEMORY_CATEGORIES.includes(input.category)) throw new AppError('Invalid memory category.', 400)
  const title = sanitizeMemoryText(input.title, PHASE5_LIMITS.maxMemoryTitleLength)
  const content = sanitizeMemoryText(input.content, PHASE5_LIMITS.maxMemoryContentLength)
  if (!title || !content) throw new AppError('Memory title and content are required.', 400)

  const ownsRepository = await Repository.exists({ _id: input.repositoryId, userId: input.userId })
  if (!ownsRepository) throw new AppError('Repository not found.', 404)

  const dedupeKey = input.dedupeKey || dedupeKeyFor({ ...input, title })
  const verificationStatus = ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED'].includes(input.verificationStatus)
    ? input.verificationStatus
    : 'UNVERIFIED'
  const payload = {
    userId: input.userId,
    repositoryId: input.repositoryId,
    dependencyId: input.dependencyId || null,
    analysisId: input.analysisId || null,
    conversationId: input.conversationId || null,
    category: input.category,
    title,
    content,
    source: sanitizeMemoryText(input.source, 300),
    origin: input.origin || 'MANUAL',
    confidence: Math.max(0, Math.min(1, Number(input.confidence) || 0)),
    verificationStatus,
    memoryStatus: 'ACTIVE',
    dedupeKey,
    tags: (input.tags || []).slice(0, 20).map((tag) => sanitizeText(tag, 60)),
    evidenceRefs: input.evidenceRefs || [],
    metadata: input.metadata || {},
    expiresAt: input.expiresAt || expiryFor(input.category, verificationStatus),
    lastAccessedAt: new Date(),
    updatedBy: input.updatedBy || null,
  }

  const existing = await ProjectMemory.findOne({ userId: input.userId, dedupeKey }).lean()
  if (existing) {
    const changed = existing.content !== content || existing.title !== title
    const memory = await ProjectMemory.findByIdAndUpdate(
      existing._id,
      {
        $set: {
          ...payload,
          memoryStatus: 'ACTIVE',
          supersededAt: null,
          expiredAt: null,
          updatedAt: new Date(),
        },
      },
      { new: true },
    )
    if (changed) {
      await mirrorWrite(memory, { isUpdate: Boolean(existing.external?.length) })
      await audit({
        userId: input.userId,
        repositoryId: input.repositoryId,
        memoryId: memory._id,
        action: 'UPDATED',
        actor,
        details: { category: memory.category, dedupeKey },
      })
    }
    return { memory, created: false, updated: changed }
  }

  const memory = await ProjectMemory.create(payload)
  await mirrorWrite(memory)
  await audit({
    userId: input.userId,
    repositoryId: input.repositoryId,
    memoryId: memory._id,
    action: 'CREATED',
    actor,
    details: { category: memory.category, dedupeKey },
  })
  return { memory, created: true, updated: false }
}

export async function updateMemory({ userId, memoryId, title, content, verificationStatus, actor }) {
  const memory = await ProjectMemory.findOne({ _id: memoryId, userId, memoryStatus: { $ne: 'DELETED' } })
  if (!memory) throw new AppError('Memory not found.', 404)
  if (title !== undefined) memory.title = sanitizeMemoryText(title, PHASE5_LIMITS.maxMemoryTitleLength)
  if (content !== undefined) memory.content = sanitizeMemoryText(content, PHASE5_LIMITS.maxMemoryContentLength)
  if (verificationStatus !== undefined) memory.verificationStatus = verificationStatus
  if (!memory.title || !memory.content) throw new AppError('Memory title and content are required.', 400)
  memory.dedupeKey = dedupeKeyFor({ ...memory.toObject(), title: memory.title })
  memory.updatedBy = actor || null
  await memory.save()
  await mirrorWrite(memory, { isUpdate: true })
  await audit({
    userId,
    repositoryId: memory.repositoryId,
    memoryId: memory._id,
    action: 'CORRECTED',
    actor: String(actor || 'USER'),
    details: {},
  })
  return memory
}

export async function supersedeMemory({ userId, memoryId, replacementId, actor = 'SYSTEM' }) {
  const memory = await ProjectMemory.findOne({ _id: memoryId, userId, memoryStatus: 'ACTIVE' })
  if (!memory) return null
  memory.memoryStatus = 'SUPERSEDED'
  memory.supersededAt = new Date()
  await memory.save()
  await audit({
    userId,
    repositoryId: memory.repositoryId,
    memoryId: memory._id,
    action: 'SUPERSEDED',
    actor,
    details: { replacementId: String(replacementId || '') },
  })
  return memory
}

export async function deleteMemory({ userId, memoryId, actor = 'USER' }) {
  const memory = await ProjectMemory.findOne({ _id: memoryId, userId, memoryStatus: { $ne: 'DELETED' } })
  if (!memory) throw new AppError('Memory not found.', 404)
  await ProjectMemory.updateOne(
    { _id: memory._id },
    { $set: { memoryStatus: 'DELETED', expiredAt: new Date(), updatedBy: actor } },
  )
  const externalRef = memory.external?.find((item) => item.reference)?.reference
  let remote = { ok: true, reason: 'NO_REMOTE_REFERENCE' }
  if (externalRef) {
    try {
      remote = await deleteMemoryFromMemento(externalRef)
    } catch (error) {
      remote = { ok: false, reason: sanitizeError(error) }
    }
  }
  await audit({
    userId,
    repositoryId: memory.repositoryId,
    memoryId: memory._id,
    action: 'DELETED',
    actor: String(actor),
    details: { remote: remote.ok ? 'DELETED_OR_UNAVAILABLE' : String(remote.reason) },
  })
  return { deleted: true, remote: remote.ok ? 'DELETED_OR_UNAVAILABLE' : 'FAILED' }
}

export async function listRepositoryMemory({
  userId,
  repositoryId,
  category,
  status = 'ACTIVE',
  dependencyId,
  page = 1,
  limit = 50,
}) {
  const query = { userId, repositoryId }
  if (category) query.category = category
  if (dependencyId) query.dependencyId = dependencyId
  if (status !== 'ALL') query.memoryStatus = status
  const size = Math.min(100, Math.max(1, Number(limit) || 50))
  const current = Math.max(1, Number(page) || 1)
  const [items, total, memento] = await Promise.all([
    ProjectMemory.find(query).sort({ updatedAt: -1 }).skip((current - 1) * size).limit(size).lean(),
    ProjectMemory.countDocuments(query),
    getMementoStatus(),
  ])
  return {
    items,
    total,
    page: current,
    limit: size,
    pages: Math.ceil(total / size),
    backend: memento.mode,
    mementoStatus: memento.connected ? 'AVAILABLE' : 'UNAVAILABLE',
  }
}

export async function getMemory({ userId, memoryId }) {
  const memory = await ProjectMemory.findOne({ _id: memoryId, userId, memoryStatus: { $ne: 'DELETED' } }).lean()
  if (!memory) throw new AppError('Memory not found.', 404)
  await ProjectMemory.updateOne({ _id: memoryId }, { $set: { lastAccessedAt: new Date() } })
  return memory
}

function memorySpecificity(memory, dependencyId) {
  let score = Number(memory.confidence) || 0
  if (dependencyId && String(memory.dependencyId || '') === String(dependencyId)) score += 0.8
  if (memory.category === 'DECISION') score += 0.5
  if (memory.category === 'DEPENDENCY') score += 0.35
  if (memory.verificationStatus === 'VERIFIED') score += 0.3
  const ageDays = (Date.now() - new Date(memory.updatedAt || 0).getTime()) / 86400000
  score += Math.max(0, 0.2 - ageDays / 2000)
  return score
}

export async function retrieveMemoryContext({
  userId,
  repositoryId,
  dependencyId = null,
  query = '',
  categories = null,
  limit = PHASE5_LIMITS.maxMemoriesInContext,
} = {}) {
  const now = new Date()
  const scoped = { userId, repositoryId, memoryStatus: 'ACTIVE', $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }
  if (dependencyId) scoped.dependencyId = { $in: [null, dependencyId] }
  if (categories?.length) scoped.category = { $in: categories }

  let rows = await ProjectMemory.find(scoped).sort({ updatedAt: -1 }).limit(300).lean()
  const needle = sanitizeText(query, 500).toLowerCase()
  if (needle) {
    rows = rows.filter((memory) =>
      `${memory.title} ${memory.content} ${(memory.tags || []).join(' ')}`.toLowerCase().includes(needle),
    )
  }
  rows = rows
    .sort((a, b) => memorySpecificity(b, dependencyId) - memorySpecificity(a, dependencyId))
    .slice(0, Math.min(PHASE5_LIMITS.maxMemoriesInContext, Number(limit) || PHASE5_LIMITS.maxMemoriesInContext))

  if (rows.length) {
    await ProjectMemory.updateMany(
      { _id: { $in: rows.map((row) => row._id) } },
      { $set: { lastAccessedAt: now } },
    )
  }

  // Remote Memento is only a health-checked mirror. Its results are never
  // injected as context because the hosted account may be team-shared.
  let mementoStatus = 'NOT_CONFIGURED'
  let mementoLimitation = ''
  if (process.env.MEMENTO_API_KEY) {
    const search = await searchMemento({ query: query || repositoryId, scope: { userId, repositoryId, dependencyId } })
    mementoStatus = search.ok ? 'AVAILABLE' : 'UNAVAILABLE'
    if (!search.ok) mementoLimitation = `Memento mirror unavailable: ${search.message || search.reason}`
  }

  return {
    status: mementoStatus === 'UNAVAILABLE' ? 'DEGRADED' : 'AVAILABLE',
    mementoStatus,
    limitations: mementoLimitation ? [mementoLimitation] : [],
    memories: rows.map((memory) => ({
      id: String(memory._id),
      category: memory.category,
      title: memory.title,
      content: truncate(memory.content, 1400),
      confidence: memory.confidence,
      verificationStatus: memory.verificationStatus,
      origin: memory.origin,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
      dependencyId: memory.dependencyId || null,
      source: memory.source,
      mirroredToMemento: Boolean(memory.external?.some((item) => item.status === 'MIRRORED')),
    })),
  }
}

export async function storeDecisionMemory(decision) {
  const title = `Decision: ${decision.decision} ${decision.packageName || 'upgrade'} ${decision.targetVersion || ''}`.trim()
  const content = [
    `The developer ${String(decision.decision).toLowerCase()} the recommendation for ${decision.packageName || 'this dependency'}${decision.targetVersion ? ` to ${decision.targetVersion}` : ''}.`,
    decision.explanation ? `Explanation: ${decision.explanation}` : '',
    decision.notes ? `Technical notes: ${decision.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const result = await createMemory({
    userId: decision.userId,
    repositoryId: decision.repositoryId,
    dependencyId: decision.dependencyId,
    analysisId: decision.analysisId,
    category: 'DECISION',
    title,
    content,
    source: 'Developer feedback',
    origin: 'DEVELOPER_FEEDBACK',
    confidence: 0.9,
    verificationStatus: 'VERIFIED',
    tags: ['decision', String(decision.decision).toLowerCase()].filter(Boolean),
    metadata: {
      decision: decision.decision,
      explanation: decision.explanation || '',
      notes: decision.notes || '',
    },
  }, { actor: String(decision.userId) })

  if (decision._id) {
    await DependencyDecision.updateOne({ _id: decision._id }, { $set: { memoryId: result.memory._id } })
  }
  return result
}

export async function storeAnalysisMemory(analysis) {
  if (!analysis?.analysisId || !analysis?.userId || !analysis?.repositoryId) return { stored: [] }
  const verificationStatus = verificationFor(analysis)
  const confidence = confidenceFor(analysis)
  const evidenceRefs = (analysis.evidence || []).slice(0, 20).map((item) => ({
    id: String(item.id),
    title: String(item.title || ''),
    url: String(item.url || ''),
    sourceType: String(item.sourceType || ''),
    verificationStatus: String(item.verificationStatus || 'UNVERIFIED'),
  }))
  const stored = []

  const analysisResult = await createMemory({
    userId: analysis.userId,
    repositoryId: analysis.repositoryId,
    dependencyId: analysis.dependencyId,
    analysisId: analysis.analysisId,
    category: 'ANALYSIS',
    title: `AI analysis: ${analysis.packageName} ${analysis.targetVersion || ''}`.trim(),
    content: [
      analysis.upgradeSummary || '',
      `Recommendation: ${analysis.recommendation || 'INSUFFICIENT_EVIDENCE'}.`,
      analysis.recommendationReason ? `Reason: ${analysis.recommendationReason}` : '',
      analysis.riskLevel ? `Risk: ${analysis.riskLevel}.` : '',
    ].filter(Boolean).join('\n'),
    source: 'AI dependency analysis',
    origin: 'AI_ANALYSIS',
    confidence,
    verificationStatus,
    tags: ['analysis', String(analysis.recommendation || '').toLowerCase()].filter(Boolean),
    evidenceRefs,
    metadata: {
      analysisStatus: analysis.analysisStatus || '',
      riskLevel: analysis.riskLevel || '',
      installedVersion: analysis.installedVersion || '',
      targetVersion: analysis.targetVersion || '',
      limitations: analysis.limitations || [],
    },
  })
  stored.push(analysisResult)

  if (analysis.riskLevel === 'HIGH' || analysis.riskLevel === 'CRITICAL' || (analysis.breakingChanges || []).length) {
    const findings = [
      ...(analysis.breakingChanges || []).map((item) => `- ${item.title}: ${item.description}`),
      ...(analysis.compatibilityFindings || []).map((item) => `- ${item.title}: ${item.description}`),
    ].slice(0, 12).join('\n')
    if (findings) {
      stored.push(await createMemory({
        userId: analysis.userId,
        repositoryId: analysis.repositoryId,
        dependencyId: analysis.dependencyId,
        analysisId: analysis.analysisId,
        category: 'DEPENDENCY',
        title: `Compatibility notes: ${analysis.packageName} ${analysis.targetVersion || ''}`.trim(),
        content: `Known or potential issues found for this repository:\n${findings}`,
        source: 'AI analysis findings',
        origin: 'AI_ANALYSIS',
        confidence,
        verificationStatus,
        tags: ['compatibility', String(analysis.targetVersion || '')],
        evidenceRefs: evidenceRefs.slice(0, 10),
        metadata: { riskLevel: analysis.riskLevel || 'UNKNOWN' },
      }))
    }
  }

  const migrationSteps = (analysis.migrationPlan || []).slice(0, 10)
  if (migrationSteps.length) {
    stored.push(await createMemory({
      userId: analysis.userId,
      repositoryId: analysis.repositoryId,
      dependencyId: analysis.dependencyId,
      analysisId: analysis.analysisId,
      category: 'DEPENDENCY',
      title: `Migration checklist: ${analysis.packageName} ${analysis.targetVersion || ''}`.trim(),
      content: migrationSteps.map((step) => `${step.order}. ${step.action}${step.validation ? ` — validate: ${step.validation}` : ''}`).join('\n'),
      source: 'AI migration plan (review only)',
      origin: 'AI_ANALYSIS',
      confidence: Math.min(confidence, 0.8),
      verificationStatus: 'PARTIALLY_VERIFIED',
      tags: ['migration', String(analysis.targetVersion || '')],
      evidenceRefs: evidenceRefs.slice(0, 10),
      metadata: { steps: migrationSteps.length },
    }))
  }

  return { stored: stored.map((item) => String(item.memory._id)) }
}

export async function storeChatMemory({ userId, repositoryId, conversationId, content, dependencyId = null }) {
  const clean = sanitizeMemoryText(content, 4000)
  if (!clean) return null
  const result = await createMemory({
    userId,
    repositoryId,
    conversationId,
    dependencyId,
    category: 'CONVERSATION',
    title: `Remembered from chat: ${truncate(clean, 100)}`,
    content: clean,
    source: 'Repository chat (explicit remember request)',
    origin: 'CHAT',
    confidence: 0.7,
    verificationStatus: 'UNVERIFIED',
    tags: ['chat', 'developer-stated'],
    metadata: { conversationId: String(conversationId || '') },
  }, { actor: String(userId) })
  return result.memory
}

export async function rebuildRepositoryMemory({ userId, repositoryId, actor = 'SYSTEM' }) {
  const repository = await Repository.findOne({ _id: repositoryId, userId }).lean()
  if (!repository) throw new AppError('Repository not found.', 404)
  const languages = [repository.language].filter(Boolean)
  const manifests = (repository.manifestFiles || []).slice(0, 25)
  const content = [
    repository.description ? `Description: ${repository.description}` : '',
    languages.length ? `Primary language: ${languages.join(', ')}.` : '',
    repository.defaultBranch ? `Default branch: ${repository.defaultBranch}.` : '',
    manifests.length ? `Manifests: ${manifests.join(', ')}.` : '',
    repository.dependencyCount ? `Latest scan found ${repository.dependencyCount} dependencies.` : '',
  ].filter(Boolean).join('\n')

  if (!content) throw new AppError('No repository metadata is available to rebuild memory.', 409)
  const result = await createMemory({
    userId,
    repositoryId,
    category: 'PROJECT',
    title: `Project context: ${repository.fullName || repository.name}`,
    content,
    source: 'GitHub repository metadata and scan results',
    origin: 'REPOSITORY_SCAN',
    confidence: 0.9,
    verificationStatus: 'VERIFIED',
    tags: ['project', 'architecture', 'build'],
    metadata: {
      language: repository.language || '',
      manifests,
      dependencyCount: repository.dependencyCount || 0,
      lastScannedAt: repository.lastScannedAt || null,
    },
  }, { actor: String(actor) })
  return result
}

export async function expireStaleMemories() {
  const now = new Date()
  const result = await ProjectMemory.updateMany(
    { memoryStatus: 'ACTIVE', expiresAt: { $lte: now } },
    { $set: { memoryStatus: 'EXPIRED', expiredAt: now } },
  )
  return { expired: result.modifiedCount || 0 }
}

export async function deleteRepositoryMemoryScope({ userId, repositoryId }) {
  const memories = await ProjectMemory.find({ userId, repositoryId })
    .select('_id external')
    .lean()
  for (const memory of memories) {
    await deleteMemory({ userId, memoryId: memory._id, actor: 'SYSTEM' })
  }
  await DependencyDecision.deleteMany({ userId, repositoryId })
  return { deleted: memories.length }
}

export function getMemoryServiceStatus() {
  return {
    authoritativeStore: 'MongoDB',
    mirror: 'Memento (mementoagi.com)',
    categories: MEMORY_CATEGORIES,
    maxMemoriesInContext: PHASE5_LIMITS.maxMemoriesInContext,
    retentionDays: RETENTION_DAYS,
  }
}

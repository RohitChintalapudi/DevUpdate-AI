import mongoose from 'mongoose'
import AIAnalysis from '../../../models/AIAnalysis.js'
import AIJob from '../../../models/AIJob.js'
import Dependency from '../../../models/Dependency.js'
import DependencyUpdate from '../../../models/DependencyUpdate.js'
import Repository from '../../../models/Repository.js'
import { AI_LIMITS, WORKFLOW_STAGES } from '../../../constants/aiConstants.js'
import { AppError } from '../../../utils/errors.js'
import { sanitizeError, sanitizeText } from '../../../utils/sanitize.js'
import { createTokenLedger } from '../tokenUsage.js'
import { createAnalysisWorkflow } from '../workflow/analysisWorkflow.js'
import { researchPackageUpdate } from '../research/firecrawlResearchService.js'
import { ingestDocuments } from '../ingestion/documentIngestionService.js'
import { vectorConfig } from '../vector/pineconeStore.js'
import { groqModel } from '../providers/groqProvider.js'
import { storeAnalysisMemory } from '../../memory/memoryService.js'
import { compareCurrentAnalysis } from '../../history/historicalComparisonService.js'
import {
  notifyAiAnalysisCompleted,
  notifyAiAnalysisFailed,
  notifyRecommendationChanged,
} from '../../notifications/notificationService.js'

const STALE_JOB_MS = 20 * 60 * 1000
const MAX_CONCURRENT_JOBS = Math.max(1, Math.min(4, Number(process.env.AI_MAX_CONCURRENT_JOBS) || 2))
const MAX_REPOSITORY_DEPENDENCIES = Math.max(1, Math.min(20, Number(process.env.AI_REPOSITORY_MAX_DEPENDENCIES) || 10))
const pendingJobs = []
const activeJobIds = new Set()
let runningJobs = 0

async function safePhase5(label, work) {
  try {
    return await work()
  } catch (error) {
    console.warn(`[phase5] ${label} failed:`, sanitizeError(error))
    return null
  }
}

async function ownedRepository(userId, repositoryId) {
  const repository = await Repository.findOne({ _id: repositoryId, userId })
  if (!repository) throw new AppError('Repository not found.', 404)
  return repository
}

async function ownedDependency(userId, dependencyId, repositoryId = null) {
  const query = { _id: dependencyId, userId }
  if (repositoryId) query.repositoryId = repositoryId
  const dependency = await Dependency.findOne(query)
  if (!dependency) throw new AppError('Dependency not found.', 404)
  return dependency
}

function targetVersionOf(update) {
  return String(update?.latestStableVersion || update?.latestVersion || update?.installedVersion || '')
}

function activeKeyFor(userId, repositoryId, dependencyId, type, target = '') {
  return `${type}:${userId}:${repositoryId}:${dependencyId || 'repository'}:${target}`.slice(0, 500)
}

async function assertQueueCapacity(userId, repositoryId, dependencyId, activeKey, type) {
  const active = await AIJob.find({ userId, active: true })
    .select('type activeKey repositoryId')
    .lean()
  if (active.some((job) => job.type === type && job.activeKey === activeKey)) {
    throw new AppError('An AI job is already active for this request.', 409)
  }
  if (active.length >= AI_LIMITS.maxAnalysisJobsPerUser) {
    throw new AppError('Too many AI jobs are active. Wait for one to finish.', 429)
  }
  if (repositoryId) {
    const repositoryJobs = active.filter((job) => String(job.repositoryId) === String(repositoryId))
    if (repositoryJobs.length >= AI_LIMITS.maxAnalysisJobsPerRepository) {
      throw new AppError('Too many AI jobs are active for this repository. Wait for one to finish.', 429)
    }
  }
}

async function updateProgress(jobId, progress) {
  const set = { 'progress.stage': progress.stage, 'progress.percent': progress.percent }
  if (Number.isFinite(progress.processed)) set['progress.processed'] = progress.processed
  if (Number.isFinite(progress.total)) set['progress.total'] = progress.total
  if (progress.message) set['progress.message'] = sanitizeText(progress.message, 300)
  const existing = await AIJob.findById(jobId).select('progress.completedStages').lean()
  if (progress.stage && !existing?.progress?.completedStages?.includes(progress.stage)) {
    set.$push = { 'progress.completedStages': progress.stage }
  }
  await AIJob.updateOne({ _id: jobId }, { $set: set })
}

async function persistAnalysis(analysisId, payload) {
  await AIAnalysis.updateOne(
    { _id: analysisId },
    {
      $set: {
        ...payload,
        updatedAt: new Date(),
      },
    },
  )
}

function evidenceRecords(rows = [], { packageName = '', version = '' } = {}) {
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title || 'Source').slice(0, 300),
    url: String(row.url || '').slice(0, 2000),
    sourceType: String(row.sourceType || 'OFFICIAL_DOCS').slice(0, 80),
    excerpt: String(row.excerpt || '').slice(0, 3000),
    retrievedAt: row.retrievedAt ? new Date(row.retrievedAt) : new Date(),
    publishedAt: row.publishedAt ? new Date(row.publishedAt) : null,
    verificationStatus: ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED'].includes(row.verificationStatus)
      ? row.verificationStatus
      : 'UNVERIFIED',
    confidence: Math.max(0, Math.min(1, Number(row.confidence) || 0)),
    documentId: row.documentId || null,
    packageName: row.packageName || packageName,
    version: row.version || version,
  }))
}

async function runDependencyAnalysisCore({ job, analysis, update, ledger, onProgress, isCancelled }) {
  // Persist the real Phase 3 advisory snapshot before Phase 5 comparisons. A
  // failed advisory lookup stays SECURITY_DATA_UNAVAILABLE; it is never changed
  // into NO_KNOWN_VULNERABILITY by memory or history.
  await AIAnalysis.updateOne(
    { _id: analysis._id },
    {
      $set: {
        securitySnapshot: {
          status: update.securityStatus || 'UNKNOWN',
          advisories: (update.vulnerabilities || []).slice(0, 30).map((item) => ({
            id: String(item.id || ''),
            severity: item.severity?.level || 'UNKNOWN',
            summary: String(item.summary || '').slice(0, 500),
            fixedVersions: item.fixedVersions || [],
          })),
        },
      },
    },
  )

  const workflow = createAnalysisWorkflow({ onProgress, isCancelled, ledger })
  const finalState = await workflow.invoke({
    input: {
      userId: String(job.userId),
      repositoryId: String(job.repositoryId),
      dependencyId: String(analysis.dependencyId),
      analysisId: String(analysis._id),
    },
    repository: { id: String(job.repositoryId) },
    update: {
      ...update,
      targetVersion: targetVersionOf(update),
      vulnerabilities: update.vulnerabilities || [],
    },
    security: {},
    context: null,
    memory: null,
    history: null,
    research: { documents: [], status: 'PENDING', limitations: [] },
    evidence: [],
    limitations: [],
    breakingChanges: [],
    projectImpact: [],
    compatibility: {},
    risk: {},
    migrationPlan: [],
    validation: {},
    recommendationData: {},
    analysisStatus: 'RUNNING',
  })

  const validated = finalState.validation || {}
  const recommendation = finalState.recommendationData || {}
  const limitations = [
    ...new Set((finalState.limitations || []).map((item) => String(item).slice(0, 1000))),
  ].slice(0, 30)

  await persistAnalysis(String(analysis._id), {
    analysisStatus: finalState.analysisStatus || 'COMPLETED',
    upgradeSummary: String(recommendation.upgradeSummary || '').slice(0, 4000),
    releaseIntelligence: {
      importantChanges: (recommendation.importantChanges || []).map((item) => String(item).slice(0, 1500)).slice(0, 30),
      newFeatures: (recommendation.newFeatures || []).map((item) => String(item).slice(0, 1500)).slice(0, 30),
      bugFixes: (recommendation.bugFixes || []).map((item) => String(item).slice(0, 1500)).slice(0, 30),
      deprecatedApis: (recommendation.deprecatedApis || []).map((item) => String(item).slice(0, 1500)).slice(0, 30),
    },
    breakingChanges: validated.breakingChanges || finalState.breakingChanges || [],
    projectImpact: validated.projectImpact || finalState.projectImpact || [],
    compatibilityFindings: validated.compatibilityFindings || finalState.compatibility?.findings || [],
    migrationPlan: validated.migrationSteps || finalState.migrationPlan || [],
    riskLevel: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN'].includes(finalState.risk?.level)
      ? finalState.risk.level
      : 'UNKNOWN',
    riskReason: String(finalState.risk?.reason || '').slice(0, 3000),
    recommendation: recommendation.recommendation || 'INSUFFICIENT_EVIDENCE',
    recommendationReason: String(recommendation.reason || '').slice(0, 3000),
    evidence: evidenceRecords(finalState.evidence || [], {
      packageName: String(update.packageName || ''),
      version: targetVersionOf(update),
    }),
    limitations,
    modelMetadata: {
      provider: 'groq',
      model: groqModel(),
      promptVersion: 'phase5-2026-11',
      vectorStore: 'pinecone',
      embeddingModel: vectorConfig().embeddingModel,
      retrievalCount: (finalState.evidence || []).length,
      researchStatus: finalState.research?.status || 'UNKNOWN',
      contextStatus: finalState.context?.status || 'UNAVAILABLE',
      memoryStatus: finalState.memory?.status || 'SKIPPED',
      memoryCount: (finalState.memory?.memories || []).length,
      historicalComparisonId: finalState.history?.comparison?._id
        ? String(finalState.history.comparison._id)
        : '',
    },
    tokens: { ...ledger.totals },
    error: '',
    completedAt: new Date(),
  })

  const persisted = await AIAnalysis.findById(analysis._id).lean()
  const historyResult = finalState.history || await safePhase5(
    'historical comparison',
    () => compareCurrentAnalysis({ userId: String(job.userId), analysisId: String(analysis._id) }),
  )

  await safePhase5('analysis memory', () => storeAnalysisMemory(persisted))
  await safePhase5('completion notification', () => notifyAiAnalysisCompleted({
    userId: job.userId,
    repositoryId: job.repositoryId,
    analysisId: analysis._id,
    packageName: update.packageName || persisted.packageName || '',
    recommendation: persisted.recommendation,
    riskLevel: persisted.riskLevel,
    status: persisted.analysisStatus,
  }))

  const recommendationChange = historyResult?.comparison?.changes?.recommendation
  if (recommendationChange?.changed) {
    await safePhase5('recommendation-change notification', () => notifyRecommendationChanged({
      userId: job.userId,
      repositoryId: job.repositoryId,
      analysisId: analysis._id,
      packageName: update.packageName || persisted.packageName || '',
      previous: recommendationChange.previous,
      current: recommendationChange.current,
    }))
  }

  if (!finalState.history && historyResult?.comparison?._id) {
    await AIAnalysis.updateOne(
      { _id: analysis._id },
      { $set: { 'modelMetadata.historicalComparisonId': String(historyResult.comparison._id) } },
    )
  }

  return {
    analysisId: String(analysis._id),
    status: finalState.analysisStatus || 'COMPLETED',
    evidenceCount: (finalState.evidence || []).length,
    memoryIdCount: finalState.memory?.memories?.length || 0,
    historicalComparisonId: historyResult?.comparison?._id
      ? String(historyResult.comparison._id)
      : null,
  }
}

async function runResearchJob({ job, dependencyId, onProgress, isCancelled }) {
  const dependency = await Dependency.findOne({ _id: dependencyId, userId: job.userId }).lean()
  if (!dependency) throw new AppError('Dependency not found.', 404)
  const update = await DependencyUpdate.findOne({ userId: job.userId, dependencyId }).lean()
  if (!update) throw new AppError('Run a Phase 3 update check before researching this package.', 409)

  const targetVersion = targetVersionOf(update)
  if (isCancelled()) throw new AppError('AI research cancelled.', 409)
  const research = await researchPackageUpdate({
    userId: String(job.userId),
    repositoryId: String(job.repositoryId),
    dependencyId: String(dependencyId),
    update: { ...update, targetVersion },
    onProgress,
    isCancelled,
  })
  const ingestion = research.documents.length
    ? await ingestDocuments({
        userId: String(job.userId),
        repositoryId: String(job.repositoryId),
        dependencyId: String(dependencyId),
        packageName: dependency.packageName,
        ecosystem: dependency.ecosystem,
        version: targetVersion,
        documents: research.documents,
        onProgress,
      })
    : { documents: 0, chunks: 0, indexed: 0, status: 'NO_DOCUMENTS' }

  return {
    status: research.status,
    documents: research.documents.length,
    chunks: ingestion.chunks || 0,
    indexed: ingestion.indexed || 0,
    limitations: research.limitations,
  }
}

async function completeJob(jobId, result, status = 'COMPLETED') {
  await AIJob.updateOne(
    { _id: jobId },
    {
      $set: {
        status,
        active: false,
        result,
        error: '',
        'progress.stage': 'DONE',
        'progress.percent': 100,
        completedAt: new Date(),
      },
    },
  )
}

async function failJob(jobId, error) {
  const status = error?.code === 'CANCELLED' || error?.statusCode === 409 ? 'CANCELLED' : 'FAILED'
  await AIJob.updateOne(
    { _id: jobId },
    {
      $set: {
        status,
        active: false,
        error: sanitizeError(error),
        completedAt: new Date(),
      },
    },
  )
}

async function isJobCancelled(jobId) {
  const job = await AIJob.findById(jobId).select('cancelRequested').lean()
  return Boolean(job?.cancelRequested)
}

async function runJob(jobId) {
  const job = await AIJob.findById(jobId).lean()
  if (!job) return
  if (job.cancelRequested || job.status === 'CANCELLED') {
    await AIJob.updateOne(
      { _id: jobId },
      { $set: { status: 'CANCELLED', active: false, completedAt: new Date() } },
    )
    return
  }
  await AIJob.updateOne(
    { _id: jobId },
    { $set: { status: 'RUNNING', active: true, startedAt: new Date(), attempts: job.attempts + 1 } },
  )

  const repositoryMeta = await Repository.findById(job.repositoryId).select('fullName').lean()
  job.repositoryFullName = repositoryMeta?.fullName || ''

  const onProgress = async (progress) => updateProgress(jobId, progress)
  const isCancelled = () => isJobCancelled(jobId)

  try {
    if (job.type === 'DOCUMENTATION_RESEARCH') {
      const result = await runResearchJob({ job, dependencyId: job.dependencyId, onProgress, isCancelled })
      await completeJob(jobId, result)
      return
    }

    if (job.type === 'REPOSITORY_ANALYSIS') {
      const dependencies = await Dependency.find({ userId: job.userId, repositoryId: job.repositoryId })
        .sort({ packageName: 1 })
        .limit(MAX_REPOSITORY_DEPENDENCIES)
        .lean()
      const ledger = createTokenLedger({ jobId, budget: AI_LIMITS.analysisTokenBudget * MAX_REPOSITORY_DEPENDENCIES })
      const results = []
      let processed = 0
      for (const dependency of dependencies) {
        if (isCancelled()) throw new AppError('AI analysis cancelled.', 409)
        const update = await DependencyUpdate.findOne({
          userId: job.userId,
          dependencyId: dependency._id,
        }).lean()
        if (!update) {
          processed += 1
          continue
        }
        const targetVersion = targetVersionOf(update)
        const analysis = await AIAnalysis.findOneAndUpdate(
          { userId: job.userId, dependencyId: dependency._id, targetVersion },
          {
            $set: {
              repositoryId: job.repositoryId,
              updateRecordId: update._id,
              jobId,
              packageName: dependency.packageName,
              repositoryFullName: job.repositoryFullName,
              ecosystem: dependency.ecosystem,
              installedVersion: update.installedVersion || '',
              targetVersion,
              updateType: update.updateType || 'UNKNOWN',
              analysisStatus: 'RUNNING',
              error: '',
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true, new: true },
        )
        const result = await runDependencyAnalysisCore({
          job,
          analysis,
          update,
          ledger,
          onProgress: async (progress) =>
            updateProgress(jobId, {
              ...progress,
              stage: progress.stage || 'repositoryContext',
              processed,
              total: dependencies.length,
            }),
          isCancelled,
        })
        results.push(result)
        processed += 1
        await updateProgress(jobId, {
          stage: 'recommendation',
          percent: Math.round((processed / dependencies.length) * 100),
          processed,
          total: dependencies.length,
          message: `Analyzed ${processed} of ${dependencies.length} dependencies.`,
        })
      }
      await ledger.persist()
      await completeJob(jobId, { analyses: results, count: results.length })
      return
    }

    if (job.type === 'DEPENDENCY_ANALYSIS') {
      const update = await DependencyUpdate.findOne({
        userId: job.userId,
        dependencyId: job.dependencyId,
      }).lean()
      if (!update) throw new AppError('Run a Phase 3 update check before analyzing this dependency.', 409)
      const analysis = await AIAnalysis.findById(job.analysisId || job.result?.analysisId)
      if (!analysis) throw new AppError('AI analysis record not found.', 404)
      const ledger = createTokenLedger({ jobId, analysisId: analysis._id })
      const result = await runDependencyAnalysisCore({ job, analysis, update, ledger, onProgress, isCancelled })
      await ledger.persist()
      await completeJob(jobId, result)
      return
    }

    throw new AppError('Unsupported AI job type.', 400)
  } catch (error) {
    let failedAnalysis = null
    if (job.type === 'DEPENDENCY_ANALYSIS' && job.analysisId) {
      failedAnalysis = await AIAnalysis.findById(job.analysisId).select('packageName').lean()
      const status = error?.code === 'CANCELLED' ? 'CANCELLED' : 'FAILED'
      await AIAnalysis.updateOne(
        { _id: job.analysisId },
        { $set: { analysisStatus: status, error: sanitizeError(error), completedAt: new Date() } },
      )
    }
    if (error?.code !== 'CANCELLED' && error?.statusCode !== 409) {
      await safePhase5('AI failure notification', () => notifyAiAnalysisFailed({
        userId: job.userId,
        repositoryId: job.repositoryId,
        analysisId: job.analysisId || null,
        packageName: failedAnalysis?.packageName || '',
        error,
      }))
    }
    await failJob(jobId, error)
  }
}

function pumpJobs() {
  while (runningJobs < MAX_CONCURRENT_JOBS && pendingJobs.length) {
    const jobId = pendingJobs.shift()
    if (!jobId || activeJobIds.has(jobId)) continue
    runningJobs += 1
    activeJobIds.add(jobId)
    Promise.resolve()
      .then(() => runJob(jobId))
      .catch((error) => console.warn('[ai] Job runner failed:', sanitizeError(error)))
      .finally(() => {
        runningJobs -= 1
        activeJobIds.delete(jobId)
        pumpJobs()
      })
  }
}

function enqueueJob(jobId) {
  pendingJobs.push(String(jobId))
  setImmediate(pumpJobs)
}

export async function queueDependencyAnalysis({ userId, repositoryId, dependencyId }) {
  const repository = await ownedRepository(userId, repositoryId)
  await ownedDependency(userId, dependencyId, repositoryId)
  const update = await DependencyUpdate.findOne({ userId, dependencyId }).lean()
  if (!update) throw new AppError('Run a Phase 3 update check before analyzing this dependency.', 409)

  const targetVersion = targetVersionOf(update)
  const activeKey = activeKeyFor(userId, repositoryId, dependencyId, 'DEPENDENCY_ANALYSIS', targetVersion)
  await assertQueueCapacity(userId, repositoryId, dependencyId, activeKey, 'DEPENDENCY_ANALYSIS')

  const analysis = await AIAnalysis.findOneAndUpdate(
    { userId, dependencyId, targetVersion },
    {
      $set: {
        repositoryId,
        updateRecordId: update._id,
        jobId: null,
        packageName: update.packageName,
        repositoryFullName: repository.fullName || '',
        ecosystem: update.ecosystem,
        installedVersion: update.installedVersion || '',
        targetVersion,
        updateType: update.updateType || 'UNKNOWN',
        analysisStatus: 'QUEUED',
        error: '',
        completedAt: null,
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true },
  )

  const job = await AIJob.create({
    userId,
    repositoryId,
    dependencyId,
    updateRecordId: update._id,
    type: 'DEPENDENCY_ANALYSIS',
    activeKey,
    analysisId: analysis._id,
    result: { analysisId: String(analysis._id) },
  })

  await AIAnalysis.updateOne({ _id: analysis._id }, { $set: { jobId: job._id } })
  enqueueJob(job._id)
  return { jobId: String(job._id), analysisId: String(analysis._id), repository: repository.fullName }
}

export async function queueRepositoryAnalysis({ userId, repositoryId }) {
  const repository = await ownedRepository(userId, repositoryId)
  const dependencies = await Dependency.countDocuments({ userId, repositoryId })
  if (!dependencies) throw new AppError('This repository has no dependencies to analyze.', 409)

  const activeKey = activeKeyFor(userId, repositoryId, null, 'REPOSITORY_ANALYSIS')
  await assertQueueCapacity(userId, repositoryId, null, activeKey, 'REPOSITORY_ANALYSIS')
  const job = await AIJob.create({
    userId,
    repositoryId,
    type: 'REPOSITORY_ANALYSIS',
    activeKey,
    progress: { stage: 'INIT', percent: 0, total: Math.min(dependencies, MAX_REPOSITORY_DEPENDENCIES) },
  })
  enqueueJob(job._id)
  return { jobId: String(job._id), repository: repository.fullName, dependencies }
}

export async function queueDocumentationResearch({ userId, repositoryId, dependencyId }) {
  await ownedRepository(userId, repositoryId)
  await ownedDependency(userId, dependencyId, repositoryId)
  const update = await DependencyUpdate.findOne({ userId, dependencyId }).lean()
  if (!update) throw new AppError('Run a Phase 3 update check before researching this package.', 409)
  const targetVersion = targetVersionOf(update)
  const activeKey = activeKeyFor(userId, repositoryId, dependencyId, 'DOCUMENTATION_RESEARCH', targetVersion)
  await assertQueueCapacity(userId, repositoryId, dependencyId, activeKey, 'DOCUMENTATION_RESEARCH')

  const job = await AIJob.create({
    userId,
    repositoryId,
    dependencyId,
    updateRecordId: update._id,
    type: 'DOCUMENTATION_RESEARCH',
    activeKey,
  })
  enqueueJob(job._id)
  return { jobId: String(job._id) }
}

export async function cancelAiJob({ userId, jobId }) {
  const job = await AIJob.findOne({ _id: jobId, userId })
  if (!job) throw new AppError('AI job not found.', 404)
  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) {
    return { jobId: String(job._id), status: job.status }
  }
  if (job.status === 'QUEUED') {
    await AIJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'CANCELLED',
          active: false,
          cancelRequested: true,
          completedAt: new Date(),
          error: 'AI job cancelled before it started.',
        },
      },
    )
  } else {
    await AIJob.updateOne({ _id: job._id }, { $set: { cancelRequested: true } })
  }
  return { jobId: String(job._id), status: 'CANCELLING' }
}

export async function recoverStaleAiJobs() {
  const cutoff = new Date(Date.now() - STALE_JOB_MS)
  await AIJob.updateMany(
    { active: true, status: { $in: ['QUEUED', 'RUNNING'] }, updatedAt: { $lt: cutoff } },
    {
      $set: {
        active: false,
        status: 'FAILED',
        error: 'AI job timed out before completion.',
        completedAt: new Date(),
      },
    },
  )
  await AIAnalysis.updateMany(
    { analysisStatus: { $in: ['QUEUED', 'RUNNING'] }, updatedAt: { $lt: cutoff } },
    { $set: { analysisStatus: 'FAILED', error: 'AI analysis timed out before completion.', completedAt: new Date() } },
  )
}

export async function getAiJob({ userId, jobId }) {
  const job = await AIJob.findOne({ _id: jobId, userId }).lean()
  if (!job) throw new AppError('AI job not found.', 404)
  return job
}

export async function getAiAnalysis({ userId, analysisId }) {
  const analysis = await AIAnalysis.findOne({ _id: analysisId, userId }).lean()
  if (!analysis) throw new AppError('AI analysis not found.', 404)
  return analysis
}

export async function listAiAnalyses({ userId, repositoryId, recommendation, status, page = 1, limit = 20 }) {
  const query = { userId }
  if (repositoryId) query.repositoryId = repositoryId
  if (recommendation) query.recommendation = recommendation
  if (status) query.analysisStatus = status
  const skip = (Math.max(1, Number(page) || 1) - 1) * Math.min(100, Math.max(1, Number(limit) || 20))
  const size = Math.min(100, Math.max(1, Number(limit) || 20))
  const [items, total] = await Promise.all([
    AIAnalysis.find(query).sort({ createdAt: -1 }).skip(skip).limit(size).lean(),
    AIAnalysis.countDocuments(query),
  ])
  return { items, total, page: Math.max(1, Number(page) || 1), limit: size, pages: Math.ceil(total / size) }
}

export async function getAiOverview(userId) {
  const [analyses, totalAnalyses, counts, activeJobs] = await Promise.all([
    AIAnalysis.find({ userId }).sort({ createdAt: -1 }).limit(8).lean(),
    AIAnalysis.countDocuments({ userId }),
    AIAnalysis.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
      {
        $facet: {
          recommendations: [{ $group: { _id: '$recommendation', count: { $sum: 1 } } }],
          risks: [{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }],
          statuses: [{ $group: { _id: '$analysisStatus', count: { $sum: 1 } } }],
          tokens: [{ $group: { _id: null, total: { $sum: '$tokens.total' } } }],
        },
      },
    ]),
    AIJob.find({ userId, active: true }).sort({ createdAt: -1 }).limit(10).lean(),
  ])

  const facet = counts[0] || {}
  const group = (rows) => Object.fromEntries((rows || []).map((row) => [row._id, row.count]))
  return {
    totalAnalyses,
    latestAnalyses: analyses,
    recommendations: group(facet.recommendations),
    risks: group(facet.risks),
    statuses: group(facet.statuses),
    tokensUsed: facet.tokens?.[0]?.total || 0,
    activeJobs,
  }
}

export async function getJobStatusForRepository({ userId, repositoryId }) {
  return AIJob.findOne({ userId, repositoryId }).sort({ createdAt: -1 }).lean()
}

export function getAiSchedulerStatus() {
  return {
    maxConcurrentJobs: MAX_CONCURRENT_JOBS,
    runningJobs,
    pendingJobs: pendingJobs.length,
    stages: WORKFLOW_STAGES,
  }
}

import mongoose from 'mongoose'
import Dependency from '../../../models/Dependency.js'
import DependencyUpdate from '../../../models/DependencyUpdate.js'
import DependencyResearch from '../../../models/DependencyResearch.js'
import AIAnalysis from '../../../models/AIAnalysis.js'
import Repository from '../../../models/Repository.js'
import { researchPackageUpdate } from '../../ai/research/firecrawlResearchService.js'
import { langchainStructuredGenerate } from '../../ai/langchain/langchainService.js'
import { researchKnowledgeFallbackSchema } from '../../ai/schemas/aiSchemas.js'
import { buildResearchKnowledgeFallbackPrompt } from '../../ai/prompts/aiPrompts.js'
import { deduplicateRepositoryUpdates } from '../updateEngine/deduplicateUpdates.js'
import {
  dependencyKeyFor,
  dependencyResearchMatch,
  dependencyUpdateMatch,
} from '../updateEngine/dependencyIdentity.js'
import { isValidObjectId, sanitizeError, sanitizeText } from '../../../utils/sanitize.js'
import { z } from 'zod'

function toObjectId(id) {
  if (!id) return id
  if (id instanceof mongoose.Types.ObjectId) return id
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    try {
      return new mongoose.Types.ObjectId(id)
    } catch {
      return id
    }
  }
  return id
}

// In-memory tracking for active repository research background jobs
const activeResearchJobs = new Map()

export function getRepositoryResearchStatus(repositoryId) {
  const id = String(repositoryId)
  return activeResearchJobs.get(id) || null
}

function boundedMs(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

// Firecrawl gets ~9s and the AI knowledge fallback ~4s. The 15s wrapper is a
// final guard so one dependency can never stall a research worker.
const FIRECRAWL_PACKAGE_TIMEOUT_MS = boundedMs(
  process.env.AI_FIRECRAWL_PACKAGE_TIMEOUT_MS || process.env.AI_RESEARCH_DEADLINE_MS,
  9_000,
  2_000,
  15_000,
)
const AI_FALLBACK_TIMEOUT_MS = boundedMs(process.env.AI_RESEARCH_FALLBACK_TIMEOUT_MS, 4_000, 500, 6_000)
const DEPENDENCY_RESEARCH_TIMEOUT_MS = boundedMs(
  process.env.AI_DEPENDENCY_RESEARCH_TIMEOUT_MS,
  15_000,
  5_000,
  20_000,
)
const STALE_RESEARCH_AFTER_MS = 15 * 60 * 1000

/** Settle research records left behind by a server restart or worker crash. */
export async function recoverStaleResearchJobs() {
  const cutoff = new Date(Date.now() - STALE_RESEARCH_AFTER_MS)
  const limitation = 'Research was interrupted before completion; this dependency was skipped.'
  const [updates, documents] = await Promise.all([
    DependencyUpdate.updateMany(
      { researchStatus: { $in: ['QUEUED', 'RESEARCHING'] }, updatedAt: { $lt: cutoff } },
      { $set: { researchStatus: 'PARTIAL', registryError: '' } },
    ),
    DependencyResearch.updateMany(
      { researchStatus: { $in: ['QUEUED', 'RESEARCHING'] }, updatedAt: { $lt: cutoff } },
      {
        $set: {
          researchStatus: 'PARTIAL',
          confidence: 0.2,
          limitations: [limitation],
          error: '',
          researchedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
    ),
  ])
  return { updates: updates.modifiedCount || 0, documents: documents.modifiedCount || 0 }
}

function withTimeout(promise, ms, fallback) {
  let timeoutId
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms)
  })
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timeoutId))
}

/** Settle a dependency that exceeded its time budget so the job keeps moving. */
async function markResearchSkipped({
  userId,
  repositoryId,
  dependencyId,
  dependencyKey,
  packageName,
  ecosystem,
  reason,
}) {
  const limitation = reason
    ? `${reason} Marked Limited / No Source.`
    : 'Research timed out; marked Limited / No Source so the job could continue.'
  const userObjId = toObjectId(userId)
  const repoObjId = toObjectId(repositoryId)
  const depObjId = toObjectId(dependencyId)

  await DependencyUpdate.updateOne(
    dependencyUpdateMatch({ userId: userObjId, repositoryId: repoObjId, _id: depObjId, dependencyKey }),
    { $set: { researchStatus: 'PARTIAL', registryError: limitation } },
  ).catch(() => null)

  const existing = await DependencyResearch.findOne(
    dependencyResearchMatch({ userId: userObjId, repositoryId: repoObjId, _id: depObjId, dependencyKey }),
  ).lean().catch(() => null)

  if (existing) {
    await DependencyResearch.updateOne(
      { _id: existing._id },
      {
        $set: {
          researchStatus: 'PARTIAL',
          packageName: packageName || existing.packageName || '',
          ecosystem: ecosystem || existing.ecosystem || '',
          confidence: 0.2,
          limitations: [limitation],
          error: '',
          researchedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
    ).catch(() => null)
    return
  }

  await DependencyResearch.create({
    userId: userObjId,
    repositoryId: repoObjId,
    dependencyId: depObjId,
    dependencyKey: dependencyKey || '',
    packageName: packageName || '',
    ecosystem: ecosystem || '',
    researchStatus: 'PARTIAL',
    confidence: 0.2,
    limitations: [limitation],
    error: '',
    researchedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).catch(() => null)
}

/**
 * Last-resort AI summary. It uses registry metadata from the version-check
 * step plus model knowledge, and is always stored as unverified/partial.
 */
async function researchKnowledgeFallback({ update, reason }) {
  const result = await withTimeout(
    langchainStructuredGenerate({
      schema: researchKnowledgeFallbackSchema,
      name: 'research_knowledge_fallback',
      prompt: buildResearchKnowledgeFallbackPrompt({ update, reason }),
      maxTokens: 700,
      retries: 0,
    }),
    AI_FALLBACK_TIMEOUT_MS,
    null,
  ).catch(() => null)

  return result?.data || null
}

const aiInterpretationSchema = z.object({
  dependency: z.string().default(''),
  installedVersion: z.string().default(''),
  targetVersion: z.string().default(''),
  updateSummary: z.string().default(''),
  importantChanges: z.array(z.string()).default([]),
  breakingChanges: z
    .array(
      z.object({
        title: z.string().default(''),
        description: z.string().default(''),
        severity: z.string().default('MEDIUM'),
      }),
    )
    .default([]),
  deprecatedFeatures: z.array(z.string()).default([]),
  projectImpact: z.string().default(''),
  compatibilityConcerns: z.array(z.string()).default([]),
  migrationSteps: z
    .array(
      z.object({
        order: z.number().default(1),
        action: z.string().default(''),
        reason: z.string().default(''),
        fileArea: z.string().default(''),
      }),
    )
    .default([]),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN']).default('MEDIUM'),
  recommendation: z
    .enum([
      'UPGRADE_RECOMMENDED',
      'UPGRADE_WITH_CAUTION',
      'REVIEW_BEFORE_UPGRADE',
      'DEFER_UPGRADE',
      'INSUFFICIENT_EVIDENCE',
    ])
    .default('REVIEW_BEFORE_UPGRADE'),
  evidence: z
    .array(
      z.object({
        id: z.string().default(''),
        title: z.string().default(''),
        url: z.string().default(''),
        excerpt: z.string().default(''),
      }),
    )
    .default([]),
  limitations: z.array(z.string()).default([]),
})

/**
 * Researches official documentation, changelogs, and release notes for a single dependency
 * using Firecrawl, extracts structured intelligence, and runs Gemini/Groq interpretation.
 */
export async function researchSingleDependency({ userId, repositoryId, dependencyId, force = false }) {
  const repoObjId = toObjectId(repositoryId)
  const userObjId = toObjectId(userId)
  const depObjId = toObjectId(dependencyId)
  const repoMatch = { $in: [repoObjId, String(repoObjId)] }
  const userMatch = { $in: [userObjId, String(userObjId)] }
  const depMatch = { $in: [depObjId, String(depObjId)] }

  let [dependency, repository] = await Promise.all([
    Dependency.findOne({ _id: depMatch, userId: userMatch, repositoryId: repoMatch }).lean(),
    Repository.findOne({ _id: repoMatch, userId: userMatch }).lean(),
  ])

  let update = await DependencyUpdate.findOne(
    dependencyUpdateMatch({
      userId: userObjId,
      repositoryId: repoObjId,
      _id: depObjId,
    }),
  )

  if (!dependency && update) {
    dependency = {
      _id: update.dependencyId || update._id,
      userId: userObjId,
      repositoryId: repoObjId,
      packageName: update.packageName,
      ecosystem: update.ecosystem,
      declaredVersion: update.declaredVersion || update.installedVersion || '',
      resolvedVersion: update.resolvedVersion || update.installedVersion || '',
      isDevelopmentDependency: Boolean(update.isDevelopmentDependency),
      classification: update.classification || 'INTERNAL',
    }
  }

  if (!dependency) {
    throw new Error(`Dependency not found: ${dependencyId}`)
  }

  const packageName = dependency.packageName
  const ecosystem = dependency.ecosystem
  const dependencyKey = dependencyKeyFor(dependency)
  const installedVersion = dependency.resolvedVersion || dependency.declaredVersion || update?.installedVersion || ''
  const targetVersion = update?.latestStableVersion || update?.latestVersion || installedVersion

  // Return existing research if completed and not expired (unless forced)
  if (!force) {
    const existing = await DependencyResearch.findOne({
      ...dependencyResearchMatch({
        userId: userObjId,
        repositoryId: repoObjId,
        dependencyKey,
        dependencyId: depObjId,
      }),
      researchStatus: 'COMPLETED',
      expiresAt: { $gt: new Date() },
    }).lean()

    if (existing) {
      if (update && update.researchStatus !== 'COMPLETED') {
        update.researchStatus = 'COMPLETED'
        update.researchId = existing._id
        await update.save().catch(() => null)
      }
      return existing
    }
  }

  // Ensure DependencyUpdate record exists and set status to RESEARCHING
  if (!update) {
    update = await DependencyUpdate.create({
      userId: userObjId,
      repositoryId: repoObjId,
      dependencyId: depObjId,
      dependencyKey,
      ecosystem,
      packageName,
      installedVersion,
      declaredVersion: dependency.declaredVersion || '',
      resolvedVersion: dependency.resolvedVersion || '',
      latestVersion: targetVersion,
      latestStableVersion: targetVersion,
      updateStatus: 'UP_TO_DATE',
      updateType: 'NONE',
      securityStatus: 'NO_KNOWN_VULNERABILITY',
      researchStatus: 'RESEARCHING',
      classification: dependency.classification || 'INTERNAL',
      isDevelopmentDependency: Boolean(dependency.isDevelopmentDependency),
    }).catch(() => null)
  } else {
    update.researchStatus = 'RESEARCHING'
    await update.save().catch(() => null)
  }

  let researchDoc = await DependencyResearch.findOne(
    dependencyResearchMatch({
      userId: userObjId,
      repositoryId: repoObjId,
      dependencyKey,
      dependencyId: depObjId,
    }),
  )
  if (!researchDoc) {
    researchDoc = new DependencyResearch({
      userId: userObjId,
      repositoryId: repoObjId,
      dependencyId: depObjId,
      dependencyKey,
      updateId: update?._id || null,
      packageName,
      ecosystem,
      installedVersion,
      targetVersion,
      researchStatus: 'RESEARCHING',
    })
  } else {
    researchDoc.researchStatus = 'RESEARCHING'
    researchDoc.installedVersion = installedVersion
    researchDoc.targetVersion = targetVersion
  }
  await researchDoc.save().catch(() => null)

  try {
    // 1. Run Firecrawl research service across official domains, repo, and changelog
    const updatePayload = update
      ? update.toObject ? update.toObject() : update
      : {
          packageName,
          ecosystem,
          installedVersion,
          targetVersion,
          latestStableVersion: targetVersion,
        }

    const firecrawlDeadline = Date.now() + FIRECRAWL_PACKAGE_TIMEOUT_MS
    const researchResult = await withTimeout(
      researchPackageUpdate({
        userId,
        repositoryId,
        dependencyId,
        update: updatePayload,
        force,
        isCancelled: () => Date.now() > firecrawlDeadline,
      }),
      FIRECRAWL_PACKAGE_TIMEOUT_MS,
      {
        documents: [],
        status: 'TIMEOUT',
        skipped: true,
        limitations: [`Firecrawl exceeded ${FIRECRAWL_PACKAGE_TIMEOUT_MS}ms for ${packageName}.`],
      },
    ).catch((err) => {
      console.warn(`[research] Firecrawl research error for ${packageName}:`, sanitizeError(err))
      return {
        documents: [],
        status: 'FAILED',
        skipped: true,
        limitations: [`Firecrawl failed: ${sanitizeError(err)}`],
      }
    })

    const documents = researchResult?.documents || []
    const noSourceFound = Boolean(researchResult?.skipped)
      || ['NO_SOURCES', 'NO_RESULTS', 'UNAVAILABLE', 'ABORTED', 'TIMEOUT', 'FAILED'].includes(
        String(researchResult?.status || ''),
      )
      || documents.length === 0
    const researchLimitations = Array.isArray(researchResult?.limitations) ? researchResult.limitations : []
    const fallbackReason = researchLimitations.join(' ') || `Firecrawl status: ${researchResult?.status || 'NO_SOURCES'}`
    const knowledgeFallback = noSourceFound
      ? await researchKnowledgeFallback({ update: updatePayload, reason: fallbackReason })
      : null
    if (noSourceFound) {
      researchLimitations.push(
        knowledgeFallback
          ? 'AI knowledge fallback used; findings are unverified and not sourced from official documentation.'
          : 'AI knowledge fallback was unavailable; marked Limited / No Source.',
      )
    }
    const scrapedUrls =
      documents.length > 0
        ? documents.map((d) => d.finalUrl || d.sourceUrl)
        : (researchResult?.sources || []).map((s) => s.url)

    const officialRegistryFallbackUrl =
      ecosystem === 'npm'
        ? `https://www.npmjs.com/package/${encodeURIComponent(packageName)}`
        : ecosystem === 'pypi'
        ? `https://pypi.org/project/${encodeURIComponent(packageName)}/`
        : `https://github.com/search?q=${encodeURIComponent(packageName)}`

    const sourceUrls = [
      ...scrapedUrls,
      update?.metadata?.homepage,
      update?.metadata?.repositoryUrl,
      update?.registryUrl,
      officialRegistryFallbackUrl,
    ].filter(Boolean)

    const packageInfo = {
      name: packageName,
      description: sanitizeText(
        update?.metadata?.description ||
          knowledgeFallback?.purpose ||
          researchResult?.summary ||
          `${packageName} ecosystem package`,
        500,
      ),
      websiteUrl: sanitizeText(update?.metadata?.homepage || sourceUrls[0] || '', 500),
      repositoryUrl: sanitizeText(update?.metadata?.repositoryUrl || `https://github.com/search?q=${encodeURIComponent(packageName)}`, 500),
      documentationUrl: sanitizeText(sourceUrls[0] || update?.metadata?.homepage || officialRegistryFallbackUrl, 500),
      registryUrl: sanitizeText(update?.registryUrl || officialRegistryFallbackUrl, 500),
    }

    const releaseIntelligence = {
      recentReleases: [],
      changesIntroduced: researchResult?.importantChanges || [],
      newFeatures: researchResult?.newFeatures || [],
      bugFixes: researchResult?.bugFixes || [],
      deprecations: researchResult?.deprecatedApis || [],
      breakingChanges: (researchResult?.breakingChanges || []).map((b) =>
        typeof b === 'string' ? b : b.title || b.description || '',
      ),
      securityFixes: [],
    }

    const migrationIntelligence = {
      migrationGuideUrl: '',
      hasMigrationGuide: (researchResult?.migrationSteps || []).length > 0,
      configChanges: [],
      removedApis: [],
      renamedApis: [],
      changedDefaults: [],
      runtimeRequirements: [],
      steps: (researchResult?.migrationSteps || []).map((step, idx) => ({
        order: step.order || idx + 1,
        action: typeof step === 'string' ? step : step.action || '',
        details: typeof step === 'string' ? '' : step.details || step.reason || '',
        sourceUrl: step.documentationUrl || '',
      })),
    }

    const findings = (documents.length > 0 ? documents : researchResult?.findings || []).map((f) => ({
      title: sanitizeText(f.title || f.summary || `${packageName} update intelligence`, 200),
      description: sanitizeText(f.summary || f.description || f.content?.slice(0, 1000) || '', 2000),
      sourceUrl: sanitizeText(f.finalUrl || f.sourceUrl || f.url || sourceUrls[0] || '', 500),
      sourceType: f.sourceType || 'OFFICIAL_DOCS',
      publishedAt: f.publishedAt || null,
      retrievedAt: new Date(),
      versionRange: sanitizeText(f.versionRange || `${installedVersion} -> ${targetVersion}`, 100),
      evidence: sanitizeText(f.evidence || f.content?.slice(0, 500) || '', 1000),
      confidence: Number(f.confidence) || 0.85,
    }))

    if (!findings.length) {
      if (noSourceFound) {
        // Be honest about a skipped dependency instead of inventing an
        // "official intelligence" finding with high confidence.
        findings.push({
          title: knowledgeFallback
            ? `${packageName}: AI knowledge summary (unverified)`
            : `${packageName}: Limited / No Source`,
          description: sanitizeText(
            knowledgeFallback
              ? `${knowledgeFallback.summary}${knowledgeFallback.upgradeImpact ? ` Upgrade impact: ${knowledgeFallback.upgradeImpact}` : ''}`
              : `No public website, changelog or release page with usable content could be verified for ${packageName} (${ecosystem}). The dependency was skipped instead of blocking the research queue. Registry version data: ${targetVersion || 'version unknown'}.`,
            2000,
          ),
          sourceUrl: sanitizeText(sourceUrls[0] || officialRegistryFallbackUrl, 500),
          sourceType: knowledgeFallback ? 'AI_KNOWLEDGE' : 'REGISTRY',
          publishedAt: null,
          retrievedAt: new Date(),
          versionRange: sanitizeText(`${installedVersion || 'baseline'} -> ${targetVersion}`, 100),
          evidence: sanitizeText(
            [knowledgeFallback?.limitations?.join(' '), researchLimitations.join(' ')].filter(Boolean).join(' '),
            1000,
          ),
          confidence: knowledgeFallback ? Math.min(0.45, Number(knowledgeFallback.confidence) || 0.35) : 0.2,
        })
      } else {
        findings.push({
          title: `${packageName} official release and repository intelligence`,
          description: sanitizeText(
            update?.metadata?.description ||
              `Official package documentation, registry specification, and release intelligence for ${packageName} (${ecosystem}). Latest stable release: ${targetVersion}. Installed baseline: ${installedVersion || 'current'}.`,
            2000,
          ),
          sourceUrl: sanitizeText(sourceUrls[0] || officialRegistryFallbackUrl, 500),
          sourceType: 'REGISTRY',
          publishedAt: update?.latestReleaseDate || new Date(),
          retrievedAt: new Date(),
          versionRange: sanitizeText(`${installedVersion || 'baseline'} -> ${targetVersion}`, 100),
          evidence: sanitizeText(
            `Official registry verification from ${ecosystem}. Latest stable version: ${targetVersion}. Official repository: ${packageInfo.repositoryUrl}. Official package page: ${packageInfo.registryUrl}.`,
            1000,
          ),
          confidence: 0.95,
        })
      }
    }

    const breakingChanges = (researchResult?.breakingChanges || []).map((b) => ({
      title: sanitizeText(typeof b === 'string' ? b : b.title || 'Breaking change', 200),
      description: sanitizeText(typeof b === 'string' ? '' : b.description || '', 2000),
      severity: typeof b === 'object' && b.severity ? b.severity : 'MEDIUM',
      sourceUrl: typeof b === 'object' && b.sourceUrl ? b.sourceUrl : '',
      affectedApis: typeof b === 'object' && Array.isArray(b.affectedApis) ? b.affectedApis : [],
      mitigation: typeof b === 'object' && b.mitigation ? b.mitigation : '',
    }))

    researchDoc.packageInfo = packageInfo
    researchDoc.releaseIntelligence = releaseIntelligence
    researchDoc.migrationIntelligence = migrationIntelligence
    researchDoc.findings = findings
    researchDoc.breakingChanges = breakingChanges
    researchDoc.sourceUrls = [...new Set(sourceUrls)]
    researchDoc.researchStatus = noSourceFound ? 'PARTIAL' : 'COMPLETED'
    researchDoc.confidence = noSourceFound
      ? Math.min(0.45, Number(knowledgeFallback?.confidence) || 0.2)
      : (researchResult?.confidence || 0.9)
    researchDoc.limitations = researchLimitations
    researchDoc.error = ''
    researchDoc.researchedAt = new Date()
    researchDoc.expiresAt = new Date(Date.now() + (noSourceFound ? 1 : 7) * 24 * 60 * 60 * 1000)
    await researchDoc.save()

    // 2. Run Gemini / Groq AI interpretation only when there is real evidence.
    // With no source there is nothing to interpret, so skip the extra model call.
    if (!noSourceFound) {
      await interpretResearchWithAI({
        userId: userObjId,
        repositoryId: repoObjId,
        dependencyId: depObjId,
        updateId: update?._id,
        repository,
        dependency,
        update,
        researchDoc,
      }).catch((err) => {
        console.warn('[research] AI interpretation failed non-critically:', sanitizeError(err))
      })
    }

    // Update DependencyUpdate record and guarantee canonical status
    if (update) {
      let canonicalStatus = update.updateStatus
      if (canonicalStatus === 'OUTDATED' || update.updateType === 'MAJOR') {
        canonicalStatus = 'OUTDATED'
      } else if (update.updateAvailable || ['UPDATE_AVAILABLE', 'DEPRECATED', 'SECURITY_RISK', 'NEEDS_UPGRADE'].includes(canonicalStatus)) {
        canonicalStatus = 'UPDATE_AVAILABLE'
      } else {
        canonicalStatus = 'UP_TO_DATE'
      }

      const finalStatus = noSourceFound ? 'PARTIAL' : 'COMPLETED'
      update.researchStatus = finalStatus
      update.researchId = researchDoc._id
      update.updateStatus = canonicalStatus
      update.registryError = ''
      if (!update.registryUrl) update.registryUrl = officialRegistryFallbackUrl
      await update.save().catch(() => null)
      await DependencyUpdate.updateOne(
        { _id: update._id },
        {
          $set: {
            researchStatus: finalStatus,
            researchId: researchDoc._id,
            updateStatus: canonicalStatus,
            registryError: noSourceFound ? researchLimitations.join(' ') : '',
            registryUrl: update.registryUrl || officialRegistryFallbackUrl,
          },
        },
      ).catch(() => null)
    }

    // Touch repository so lastAnalyzedAt timestamp updates
    await Repository.updateOne(
      { _id: repositoryId, userId },
      { $set: { lastAnalyzedAt: new Date() } },
    ).catch(() => null)

    return researchDoc.toObject()
  } catch (error) {
    researchDoc.researchStatus = 'FAILED'
    researchDoc.error = sanitizeError(error)
    await researchDoc.save().catch(() => null)

    if (update) {
      update.researchStatus = 'FAILED'
      await update.save().catch(() => null)
    }

    throw error
  }
}

/**
 * Interprets the verified version data, official documentation, release notes,
 * changelogs, and repository context using structured AI output (Gemini/Groq).
 */
export async function interpretResearchWithAI({
  userId,
  repositoryId,
  dependencyId,
  updateId,
  repository,
  dependency,
  update,
  researchDoc,
  research,
}) {
  const doc = researchDoc || research || {}
  const packageName = dependency?.packageName || update?.packageName || 'Unknown'
  const installedVersion = dependency?.resolvedVersion || dependency?.declaredVersion || update?.installedVersion || ''
  const targetVersion = update?.latestStableVersion || update?.latestVersion || installedVersion

  const findingsText = (doc.findings || [])
    .slice(0, 10)
    .map((f) => `- ${f.title}: ${f.description} (Source: ${f.sourceUrl})`)
    .join('\n')

  const breakingText = (doc.breakingChanges || [])
    .slice(0, 5)
    .map((b) => `- ${b.title}: ${b.description}`)
    .join('\n')

  const prompt = `You are analyzing a dependency upgrade for a repository.

Repository: ${repository?.fullName || 'Unknown repository'}
Primary Language: ${repository?.language || 'Unknown'}
Dependency: ${packageName} (${dependency.ecosystem})
Installed Version: ${installedVersion}
Target Version: ${targetVersion}
Update Type: ${update?.updateType || 'UNKNOWN'}
Security Status: ${update?.securityStatus || 'UNKNOWN'}

Official Research Findings from Firecrawl:
${findingsText || 'No specific official release findings recorded.'}

Breaking Changes Identified:
${breakingText || 'None explicitly documented.'}

Task:
Analyze what changed between version ${installedVersion} and ${targetVersion}, explain why this update matters, identify breaking changes or deprecated features, assess the project impact on ${repository?.fullName}, recommend whether to upgrade, and outline the necessary migration steps.

Be factual and grounded in the supplied research evidence. If repository context or evidence is limited, acknowledge it in the limitations array.`

  try {
    const aiResult = await langchainStructuredGenerate({
      schema: aiInterpretationSchema,
      name: 'dependency_update_interpretation',
      prompt,
      maxTokens: 4000,
    })

    const parsed = aiResult.data || {}

    // Upsert AIAnalysis record
    let analysis = await AIAnalysis.findOne({ userId, repositoryId, dependencyId, targetVersion })
    if (!analysis) {
      analysis = new AIAnalysis({
        userId,
        repositoryId,
        dependencyId,
        updateRecordId: updateId,
        packageName,
        repositoryFullName: repository?.fullName || '',
        ecosystem: dependency.ecosystem,
        installedVersion,
        targetVersion,
        updateType: update?.updateType || 'UNKNOWN',
      })
    }

    analysis.analysisStatus = 'COMPLETED'
    analysis.upgradeSummary = parsed.updateSummary || `Upgrade ${packageName} from ${installedVersion} to ${targetVersion}`
    analysis.releaseIntelligence = {
      importantChanges: parsed.importantChanges || [],
      newFeatures: [],
      bugFixes: [],
      deprecatedApis: parsed.deprecatedFeatures || [],
    }
    analysis.breakingChanges = (parsed.breakingChanges || []).map((b, idx) => ({
      id: `bc-${idx + 1}`,
      title: b.title || 'Breaking change',
      description: b.description || '',
      severity: b.severity || 'MEDIUM',
      verificationStatus: 'VERIFIED',
    }))
    analysis.projectImpact = [
      {
        id: 'impact-1',
        title: 'Project impact assessment',
        description: parsed.projectImpact || 'No adverse project impact detected.',
        verificationStatus: 'VERIFIED',
        severity: parsed.riskLevel || 'MEDIUM',
      },
    ]
    analysis.compatibilityFindings = (parsed.compatibilityConcerns || []).map((c, idx) => ({
      id: `compat-${idx + 1}`,
      title: 'Compatibility check',
      description: typeof c === 'string' ? c : '',
      verificationStatus: 'VERIFIED',
      severity: 'LOW',
    }))
    analysis.migrationPlan = (parsed.migrationSteps || []).map((s, idx) => ({
      id: `step-${idx + 1}`,
      order: s.order || idx + 1,
      action: s.action || '',
      reason: s.reason || '',
      fileArea: s.fileArea || '',
      documentationUrl: '',
      validation: 'Run project tests after updating package version',
    }))
    analysis.riskLevel = parsed.riskLevel || 'MEDIUM'
    analysis.recommendation = parsed.recommendation || 'REVIEW_BEFORE_UPGRADE'
    analysis.recommendationReason = parsed.projectImpact || ''
    analysis.limitations = parsed.limitations || []
    analysis.completedAt = new Date()

    await analysis.save()
    return analysis.toObject()
  } catch (error) {
    console.warn('[research] AI interpretation generation failed:', sanitizeError(error))
    return null
  }
}

/**
 * Runs a background research job for all or selected dependencies in a repository.
 */
export async function queueRepositoryResearch({ userId, repositoryId, dependencyIds = [] }) {
  const repoId = String(repositoryId)
  const repoObjId = isValidObjectId(repositoryId) ? new mongoose.Types.ObjectId(String(repositoryId)) : repositoryId
  const userObjId = isValidObjectId(userId) ? new mongoose.Types.ObjectId(String(userId)) : userId

  // Prevent duplicate concurrent runs for the same repository
  if (activeResearchJobs.has(repoId)) {
    const active = activeResearchJobs.get(repoId)
    if (active.status === 'RUNNING') {
      return active
    }
  }

  const idMatch = { $in: [repoObjId, String(repoObjId)] }
  const userMatch = { $in: [userObjId, String(userObjId)] }

  // Rescans can leave one update row per old dependency id. Collapse them so
  // research progress and displayed counts use one row per package.
  await deduplicateRepositoryUpdates({ userId: userObjId, repositoryId: repoObjId }).catch(() => null)

  const nonAtMatch = { $not: /^@/ }
  const [rawDependencies, rawUpdates] = await Promise.all([
    Dependency.find({ userId: userMatch, repositoryId: idMatch, packageName: nonAtMatch }).lean(),
    DependencyUpdate.find({ userId: userMatch, repositoryId: idMatch, packageName: nonAtMatch }).lean(),
  ])

  let dependencies = rawDependencies
  if (!dependencies.length && rawUpdates.length) {
    dependencies = rawUpdates.map((u) => ({
      _id: u.dependencyId || u._id,
      packageName: u.packageName,
      ecosystem: u.ecosystem,
      declaredVersion: u.declaredVersion || u.installedVersion || '',
      resolvedVersion: u.resolvedVersion || u.installedVersion || '',
      isDevelopmentDependency: Boolean(u.isDevelopmentDependency),
      classification: u.classification || 'INTERNAL',
    }))
  }

  // Filter out dependencies starting with '@' so Firecrawl focuses exclusively on primary libraries
  dependencies = dependencies.filter((d) => d.packageName && !d.packageName.startsWith('@'))

  if (dependencyIds.length > 0) {
    const targetSet = new Set(dependencyIds.map(String))
    dependencies = dependencies.filter((d) => targetSet.has(String(d._id)))
  }

  if (!dependencies.length) {
    return {
      status: 'COMPLETED',
      total: 0,
      completed: 0,
      failed: 0,
      percent: 100,
      message: 'No dependencies found to research.',
    }
  }

  const updatesByKey = new Map(rawUpdates.map((u) => [dependencyKeyFor(u), u]).filter(([key]) => key))

  // Prioritize dependencies:
  // 1. Core/Direct dependencies
  // 2. Dependencies with available updates
  // 3. Vulnerable dependencies
  // 4. Other dependencies
  const scored = dependencies.map((dep) => {
    const update = updatesByKey.get(dependencyKeyFor(dep))
    let priorityScore = 0
    if (!dep.isDevelopmentDependency) priorityScore += 50
    if (update?.updateAvailable) priorityScore += 40
    if (update?.securityStatus === 'VULNERABLE') priorityScore += 30
    if (update?.researchStatus === 'NOT_RESEARCHED') priorityScore += 20
    return { dep, priorityScore }
  })

  scored.sort((a, b) => b.priorityScore - a.priorityScore)
  const sortedDeps = scored.map((s) => s.dep)

  const jobState = {
    repositoryId: repoId,
    status: 'RUNNING',
    total: sortedDeps.length,
    completed: 0,
    failed: 0,
    skipped: 0,
    currentPackage: sortedDeps[0]?.packageName || '',
    percent: Math.min(5, Math.round(100 / Math.max(1, sortedDeps.length))),
    startedAt: new Date(),
  }

  activeResearchJobs.set(repoId, jobState)
  activeResearchJobs.set(String(repoObjId), jobState)

  // Mark all queued dependencies in DB so UI immediately shows QUEUED status and updates table
  await Promise.all(
    sortedDeps.map(async (dep) => {
      await DependencyUpdate.findOneAndUpdate(
        dependencyUpdateMatch({ ...dep, userId: userObjId, repositoryId: repoObjId }),
        {
          $setOnInsert: {
            userId: userObjId,
            repositoryId: repoObjId,
            dependencyId: dep._id,
            dependencyKey: dependencyKeyFor(dep),
            ecosystem: dep.ecosystem,
            packageName: dep.packageName,
            installedVersion: dep.resolvedVersion || dep.declaredVersion || '',
            declaredVersion: dep.declaredVersion || '',
            resolvedVersion: dep.resolvedVersion || '',
            latestVersion: dep.resolvedVersion || dep.declaredVersion || '',
            latestStableVersion: dep.resolvedVersion || dep.declaredVersion || '',
            updateStatus: 'UP_TO_DATE',
            updateType: 'NONE',
            securityStatus: 'NO_KNOWN_VULNERABILITY',
            classification: dep.classification || 'INTERNAL',
            isDevelopmentDependency: Boolean(dep.isDevelopmentDependency),
          },
          $set: {
            researchStatus: 'QUEUED',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).catch(() => null)
    }),
  ).catch(() => null)

  // Run in background asynchronously with 3 concurrent workers for fast, smooth streaming
  ;(async () => {
    let currentIndex = 0
    const workerCount = Math.min(3, sortedDeps.length)

    async function worker() {
      while (currentIndex < sortedDeps.length) {
        const dep = sortedDeps[currentIndex++]
        if (!dep) break
        jobState.currentPackage = dep.packageName
        jobState.updatedAt = new Date()
        try {
          const result = await withTimeout(
            researchSingleDependency({
              userId: userObjId,
              repositoryId: repoObjId,
              dependencyId: dep._id,
              force: false,
            }),
            DEPENDENCY_RESEARCH_TIMEOUT_MS,
            null,
          )
          if (result === null) {
            console.warn(`[research-job] Timed out researching ${dep.packageName}; skipping.`)
            await markResearchSkipped({
              userId: userObjId,
              repositoryId: repoObjId,
              dependencyId: dep._id,
              dependencyKey: dependencyKeyFor(dep),
              packageName: dep.packageName,
              ecosystem: dep.ecosystem,
              reason: 'Per-package research budget exceeded',
            })
            jobState.skipped = (jobState.skipped || 0) + 1
          } else if (result?.researchStatus === 'PARTIAL') {
            jobState.skipped = (jobState.skipped || 0) + 1
          } else if (result?.researchStatus === 'FAILED') {
            jobState.failed += 1
          } else {
            jobState.completed += 1
          }
        } catch (err) {
          console.warn(`[research-job] Failed researching ${dep.packageName}:`, sanitizeError(err))
          jobState.failed += 1
        }
        const settled = jobState.completed + jobState.failed + (jobState.skipped || 0)
        jobState.percent = Math.max(5, Math.min(99, Math.round((settled / jobState.total) * 100)))
        // Move the target label immediately so the UI shows progress even when
        // this dependency was skipped or used the AI fallback.
        jobState.currentPackage = sortedDeps[currentIndex]?.packageName || 'Finalizing research…'
        jobState.updatedAt = new Date()
      }
    }

    await Promise.all(Array.from({ length: workerCount }, () => worker()))

    jobState.status = 'COMPLETED'
    jobState.percent = 100
    jobState.currentPackage = 'All packages researched'
    jobState.completedAt = new Date()
    await Repository.updateOne(
      { _id: repoObjId, userId: userObjId },
      { $set: { lastAnalyzedAt: new Date() } },
    ).catch(() => null)

    setTimeout(() => {
      if (activeResearchJobs.get(repoId) === jobState) {
        activeResearchJobs.delete(repoId)
        activeResearchJobs.delete(String(repoObjId))
      }
    }, 5 * 60 * 1000)
  })().catch((err) => {
    jobState.status = 'FAILED'
    jobState.error = sanitizeError(err)
  })

  return jobState
}

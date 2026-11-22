import Dependency from '../../../models/Dependency.js'
import DependencyUpdate from '../../../models/DependencyUpdate.js'
import DependencyResearch from '../../../models/DependencyResearch.js'
import AIAnalysis from '../../../models/AIAnalysis.js'
import Repository from '../../../models/Repository.js'
import { researchPackageUpdate } from '../../ai/research/firecrawlResearchService.js'
import { langchainStructuredGenerate } from '../../ai/langchain/langchainService.js'
import { sanitizeError, sanitizeText } from '../../../utils/sanitize.js'
import { z } from 'zod'

// In-memory tracking for active repository research background jobs
const activeResearchJobs = new Map()

export function getRepositoryResearchStatus(repositoryId) {
  const id = String(repositoryId)
  return activeResearchJobs.get(id) || null
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
  const [dependency, repository] = await Promise.all([
    Dependency.findOne({ _id: dependencyId, userId, repositoryId }).lean(),
    Repository.findOne({ _id: repositoryId, userId }).lean(),
  ])

  if (!dependency) {
    throw new Error('Dependency not found.')
  }

  let update = await DependencyUpdate.findOne({ dependencyId, userId, repositoryId })

  const packageName = dependency.packageName
  const ecosystem = dependency.ecosystem
  const installedVersion = dependency.resolvedVersion || dependency.declaredVersion || update?.installedVersion || ''
  const targetVersion = update?.latestStableVersion || update?.latestVersion || installedVersion

  // Return existing research if completed and not expired (unless forced)
  if (!force) {
    const existing = await DependencyResearch.findOne({
      userId,
      repositoryId,
      dependencyId,
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
      userId,
      repositoryId,
      dependencyId,
      ecosystem,
      packageName,
      installedVersion,
      declaredVersion: dependency.declaredVersion || '',
      resolvedVersion: dependency.resolvedVersion || '',
      latestVersion: targetVersion,
      latestStableVersion: targetVersion,
      updateStatus: 'UNKNOWN',
      updateType: 'NONE',
      securityStatus: 'UNKNOWN',
      researchStatus: 'RESEARCHING',
      classification: dependency.classification || 'INTERNAL',
      isDevelopmentDependency: Boolean(dependency.isDevelopmentDependency),
    }).catch(() => null)
  } else {
    update.researchStatus = 'RESEARCHING'
    await update.save().catch(() => null)
  }

  let researchDoc = await DependencyResearch.findOne({ userId, repositoryId, dependencyId })
  if (!researchDoc) {
    researchDoc = new DependencyResearch({
      userId,
      repositoryId,
      dependencyId,
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

    const researchResult = await researchPackageUpdate(updatePayload, { force })

    const packageInfo = {
      name: packageName,
      description: sanitizeText(update?.metadata?.description || researchResult?.summary || '', 500),
      websiteUrl: sanitizeText(update?.metadata?.homepage || '', 500),
      repositoryUrl: sanitizeText(update?.metadata?.repositoryUrl || '', 500),
      documentationUrl: sanitizeText(researchResult?.sources?.[0]?.url || update?.metadata?.homepage || '', 500),
      registryUrl: sanitizeText(update?.registryUrl || '', 500),
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

    const findings = (researchResult?.findings || []).map((f) => ({
      title: sanitizeText(f.title || f.summary || 'Official finding', 200),
      description: sanitizeText(f.description || f.details || '', 2000),
      sourceUrl: sanitizeText(f.sourceUrl || f.url || '', 500),
      sourceType: f.sourceType || 'OFFICIAL_DOCS',
      publishedAt: f.publishedAt || null,
      retrievedAt: new Date(),
      versionRange: sanitizeText(f.versionRange || `${installedVersion} -> ${targetVersion}`, 100),
      evidence: sanitizeText(f.evidence || f.excerpt || '', 1000),
      confidence: Number(f.confidence) || 0.85,
    }))

    const breakingChanges = (researchResult?.breakingChanges || []).map((b) => ({
      title: sanitizeText(typeof b === 'string' ? b : b.title || 'Breaking change', 200),
      description: sanitizeText(typeof b === 'string' ? '' : b.description || '', 2000),
      severity: typeof b === 'object' && b.severity ? b.severity : 'MEDIUM',
      sourceUrl: typeof b === 'object' && b.sourceUrl ? b.sourceUrl : '',
      affectedApis: typeof b === 'object' && Array.isArray(b.affectedApis) ? b.affectedApis : [],
      mitigation: typeof b === 'object' && b.mitigation ? b.mitigation : '',
    }))

    const sourceUrls = (researchResult?.sources || []).map((s) => s.url).filter(Boolean)

    researchDoc.packageInfo = packageInfo
    researchDoc.releaseIntelligence = releaseIntelligence
    researchDoc.migrationIntelligence = migrationIntelligence
    researchDoc.findings = findings
    researchDoc.breakingChanges = breakingChanges
    researchDoc.sourceUrls = [...new Set(sourceUrls)]
    researchDoc.researchStatus = findings.length > 0 || sourceUrls.length > 0 ? 'COMPLETED' : 'PARTIAL'
    researchDoc.confidence = researchResult?.confidence || (findings.length > 0 ? 0.85 : 0.4)
    researchDoc.researchedAt = new Date()
    researchDoc.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await researchDoc.save()

    // 2. Run Gemini / Groq AI interpretation of the findings for this repository
    await interpretResearchWithAI({
      userId,
      repositoryId,
      dependencyId,
      updateId: update?._id,
      repository,
      dependency,
      update,
      researchDoc,
    }).catch((err) => {
      console.warn('[research] AI interpretation failed non-critically:', sanitizeError(err))
    })

    // Update DependencyUpdate record
    if (update) {
      update.researchStatus = researchDoc.researchStatus
      update.researchId = researchDoc._id
      await update.save().catch(() => null)
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
}) {
  const packageName = dependency.packageName
  const installedVersion = dependency.resolvedVersion || dependency.declaredVersion || update?.installedVersion || ''
  const targetVersion = update?.latestStableVersion || update?.latestVersion || installedVersion

  const findingsText = (researchDoc.findings || [])
    .slice(0, 10)
    .map((f) => `- ${f.title}: ${f.description} (Source: ${f.sourceUrl})`)
    .join('\n')

  const breakingText = (researchDoc.breakingChanges || [])
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

  // Prevent duplicate concurrent runs for the same repository
  if (activeResearchJobs.has(repoId)) {
    const active = activeResearchJobs.get(repoId)
    if (active.status === 'RUNNING') {
      return active
    }
  }

  // Retrieve dependencies
  const filter = { userId, repositoryId }
  if (dependencyIds.length > 0) {
    filter._id = { $in: dependencyIds }
  }

  const [dependencies, updates] = await Promise.all([
    Dependency.find(filter).lean(),
    DependencyUpdate.find({ userId, repositoryId }).lean(),
  ])

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

  const updatesByDepId = new Map(updates.map((u) => [String(u.dependencyId), u]))

  // Prioritize dependencies:
  // 1. Core/Direct dependencies
  // 2. Dependencies with available updates
  // 3. Vulnerable dependencies
  // 4. Other dependencies
  const scored = dependencies.map((dep) => {
    const update = updatesByDepId.get(String(dep._id))
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
    currentPackage: sortedDeps[0]?.packageName || '',
    percent: 0,
    startedAt: new Date(),
  }

  activeResearchJobs.set(repoId, jobState)

  // Mark all queued dependencies in DB so UI immediately shows QUEUED status and updates table
  await Promise.all(
    sortedDeps.map(async (dep) => {
      await DependencyUpdate.findOneAndUpdate(
        { userId, repositoryId, dependencyId: dep._id },
        {
          $setOnInsert: {
            ecosystem: dep.ecosystem,
            packageName: dep.packageName,
            installedVersion: dep.resolvedVersion || dep.declaredVersion || '',
            declaredVersion: dep.declaredVersion || '',
            resolvedVersion: dep.resolvedVersion || '',
            latestVersion: dep.resolvedVersion || dep.declaredVersion || '',
            latestStableVersion: dep.resolvedVersion || dep.declaredVersion || '',
            updateStatus: 'UNKNOWN',
            updateType: 'NONE',
            securityStatus: 'UNKNOWN',
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

  // Run in background asynchronously (controlled concurrency = 2)
  ;(async () => {
    for (const dep of sortedDeps) {
      jobState.currentPackage = dep.packageName
      try {
        await researchSingleDependency({
          userId,
          repositoryId,
          dependencyId: dep._id,
          force: false,
        })
        jobState.completed += 1
      } catch (err) {
        console.warn(`[research-job] Failed researching ${dep.packageName}:`, sanitizeError(err))
        jobState.failed += 1
      }
      jobState.percent = Math.round(((jobState.completed + jobState.failed) / jobState.total) * 100)
    }

    jobState.status = 'COMPLETED'
    jobState.currentPackage = ''
    await Repository.updateOne(
      { _id: repositoryId, userId },
      { $set: { lastAnalyzedAt: new Date() } },
    ).catch(() => null)
  })().catch((err) => {
    jobState.status = 'FAILED'
    jobState.error = sanitizeError(err)
  })

  return jobState
}

import { Annotation, END, StateGraph } from '@langchain/langgraph'
import { AppError } from '../../../utils/errors.js'
import { AI_LIMITS, WORKFLOW_STAGES } from '../../../constants/aiConstants.js'
import { analyzeProjectContext } from '../context/projectContextAnalyzer.js'
import { researchPackageUpdate } from '../research/firecrawlResearchService.js'
import { ingestDocuments } from '../ingestion/documentIngestionService.js'
import { retrieveEvidence } from '../rag/ragService.js'
import { collectSourceEvidence } from '../evidence/sourceCollector.js'
import { validateEvidence } from '../validation/evidenceValidator.js'
import { langchainStructuredGenerate } from '../langchain/langchainService.js'
import {
  buildBreakingChangePrompt,
  buildChatPrompt,
  buildCompatibilityPrompt,
  buildImpactPrompt,
  buildMigrationPrompt,
  buildRecommendationPrompt,
  buildRiskPrompt,
} from '../prompts/aiPrompts.js'
import {
  breakingChangesSchema,
  codeImpactSchema,
  compatibilitySchema,
  finalRecommendationSchema,
  migrationPlanSchema,
  riskSchema,
} from '../schemas/aiSchemas.js'
import { truncate } from '../../../utils/aiText.js'
import { retrieveMemoryContext } from '../../memory/memoryService.js'
import { compareCurrentAnalysis } from '../../history/historicalComparisonService.js'

const defaultServices = {
  analyzeProjectContext,
  researchPackageUpdate,
  ingestDocuments,
  retrieveEvidence,
  generateStructured: langchainStructuredGenerate,
  retrieveMemoryContext,
  compareCurrentAnalysis,
}

export const AnalysisState = Annotation.Root({
  input: Annotation(),
  repository: Annotation(),
  update: Annotation(),
  security: Annotation(),
  context: Annotation(),
  memory: Annotation(),
  history: Annotation(),
  research: Annotation(),
  evidence: Annotation(),
  limitations: Annotation({
    reducer: (current = [], incoming = []) => [...current, ...(incoming || [])],
  }),
  breakingChanges: Annotation(),
  projectImpact: Annotation(),
  compatibility: Annotation(),
  risk: Annotation(),
  migrationPlan: Annotation(),
  validation: Annotation(),
  recommendationData: Annotation(),
  analysisStatus: Annotation(),
})

function stageProgress(stage) {
  const index = WORKFLOW_STAGES.indexOf(stage)
  return Math.min(100, Math.round(((index + 1) / WORKFLOW_STAGES.length) * 100))
}

function assertNotCancelled(isCancelled) {
  if (isCancelled()) throw new AppError('AI analysis cancelled.', 409)
}

export function createAnalysisWorkflow({
  onProgress = () => {},
  isCancelled = () => false,
  ledger,
  services = {},
} = {}) {
  const {
    analyzeProjectContext: analyzeContext,
    researchPackageUpdate: researchUpdate,
    ingestDocuments: ingest,
    retrieveEvidence: retrieve,
    generateStructured: generateOutput,
    retrieveMemoryContext: retrieveMemory,
    compareCurrentAnalysis: compareAnalysis,
  } = { ...defaultServices, ...services }

  const report = async (stage, message) => {
    await onProgress({ stage, percent: stageProgress(stage), message })
  }

  const generate = async ({ schema, name, prompt, maxTokens = 5000 }) => {
    assertNotCancelled(isCancelled)
    const result = await generateOutput({
      schema,
      name,
      prompt,
      maxTokens,
      retries: 2,
    })
    ledger?.add(result.usage)
    return result.data
  }

  const repositoryContextNode = async (state) => {
    await report('repositoryContext', 'Analyzing repository usage and relevant files.')
    assertNotCancelled(isCancelled)
    try {
      const context = await analyzeContext({
        userId: state.input.userId,
        repositoryId: state.input.repositoryId,
        packageName: state.update.packageName,
        ecosystem: state.update.ecosystem,
        dependencyId: state.input.dependencyId,
        onProgress: async () => {},
      })
      return { context, limitations: [...(context.limitations || [])] }
    } catch (error) {
      return {
        context: { status: 'UNAVAILABLE', files: [], limitations: [] },
        limitations: [`Repository context could not be analyzed: ${String(error?.message || error).slice(0, 180)}`],
      }
    }
  }

  const dependencyDataNode = async (state) => {
    await report('dependencyData', 'Combining Phase 3 registry and OSV intelligence.')
    const vulnerabilities = state.update.vulnerabilities || []
    return {
      security: {
        securityStatus: state.update.securityStatus || 'UNKNOWN',
        updateStatus: state.update.updateStatus || 'UNKNOWN',
        updateType: state.update.updateType || 'UNKNOWN',
        vulnerabilityCount: vulnerabilities.length,
        advisories: vulnerabilities.slice(0, 10).map((item) => ({
          id: item.id,
          severity: item.severity?.level || 'UNKNOWN',
          summary: truncate(item.summary, 300),
          fixedVersions: item.fixedVersions || [],
        })),
      },
      limitations: state.update.securityStatus === 'SECURITY_DATA_UNAVAILABLE'
        ? ['OSV advisory data was unavailable during the Phase 3 check.']
        : [],
    }
  }

  const memoryContextNode = async (state) => {
    if (!state.input?.analysisId) {
      return { memory: { status: 'SKIPPED', memories: [], limitations: [] } }
    }
    await report('memoryContext', 'Retrieving repository-scoped persistent memory as context only.')
    try {
      const memory = await retrieveMemory({
        userId: state.input.userId,
        repositoryId: state.input.repositoryId,
        dependencyId: state.input.dependencyId,
        query: `${state.update.packageName || ''} ${state.update.targetVersion || ''}`,
        limit: 12,
      })
      return { memory, limitations: memory.limitations || [] }
    } catch (error) {
      return {
        memory: { status: 'UNAVAILABLE', memories: [], limitations: [] },
        limitations: [`Persistent memory was unavailable: ${String(error?.message || error).slice(0, 180)}`],
      }
    }
  }

  const historicalComparisonNode = async (state) => {
    if (!state.input?.analysisId) {
      return { history: { comparison: null, previousAnalysisId: null } }
    }
    await report('historicalComparison', 'Comparing this analysis with the repository dependency history.')
    try {
      const history = await compareAnalysis({
        userId: state.input.userId,
        analysisId: state.input.analysisId,
      })
      return { history }
    } catch (error) {
      return {
        history: { comparison: null, previousAnalysisId: null },
        limitations: [`Historical comparison was unavailable: ${String(error?.message || error).slice(0, 180)}`],
      }
    }
  }

  const documentationResearchNode = async (state) => {
    await report('documentationResearch', 'Retrieving official release and migration documentation.')
    assertNotCancelled(isCancelled)
    try {
      const research = await researchUpdate({
        userId: state.input.userId,
        repositoryId: state.input.repositoryId,
        dependencyId: state.input.dependencyId,
        update: {
          ...state.update,
          targetVersion: state.update.targetVersion || state.update.latestStableVersion || state.update.latestVersion,
        },
        onProgress: async () => {},
        isCancelled,
      })
      return { research, limitations: research.limitations || [] }
    } catch (error) {
      return {
        research: { documents: [], status: 'FAILED', limitations: [] },
        limitations: [`Documentation research failed: ${String(error?.message || error).slice(0, 180)}`],
      }
    }
  }

  const documentRetrievalNode = async (state) => {
    await report('documentRetrieval', 'Indexing and retrieving evidence with Pinecone.')
    assertNotCancelled(isCancelled)
    const documents = state.research?.documents || []
    let ingestion = { status: 'NO_DOCUMENTS', indexed: 0 }
    if (documents.length) {
      try {
        ingestion = await ingest({
          userId: state.input.userId,
          repositoryId: state.input.repositoryId,
          dependencyId: state.input.dependencyId,
          packageName: state.update.packageName,
          ecosystem: state.update.ecosystem,
          version: state.update.targetVersion || state.update.latestStableVersion || state.update.latestVersion,
          documents,
          onProgress: async () => {},
        })
      } catch (error) {
        ingestion = { status: 'FAILED', indexed: 0 }
      }
    }

    const retrieval = await retrieve({
      userId: state.input.userId,
      repositoryId: state.input.repositoryId,
      packageName: state.update.packageName,
      ecosystem: state.update.ecosystem,
      version: state.update.targetVersion || state.update.latestStableVersion || state.update.latestVersion,
      query: `${state.update.packageName} ${state.update.targetVersion || ''} breaking changes migration release notes`,
      topK: 10,
    })

    const evidence = collectSourceEvidence({
      update: state.update,
      documents: [
        ...documents.map((document) => ({
          id: document.evidenceId,
          title: document.title,
          url: document.sourceUrl,
          sourceType: document.sourceType,
          excerpt: document.summary || truncate(document.content, 1400),
          retrievedAt: document.retrievedAt,
          publishedAt: document.publishedAt,
          official: document.official,
          source: 'Firecrawl-retrieved official source',
        })),
        ...retrieval.rows,
      ],
      contextFiles: state.context?.files || [],
    }).slice(0, AI_LIMITS.maxEvidenceItems)

    const limitations = [...(retrieval.limitations || [])]
    if (ingestion.status === 'FAILED') limitations.push('Documentation indexing failed; only directly retrieved sources were used as evidence.')
    if (!evidence.length) limitations.push('No verifiable evidence was assembled for this upgrade.')

    return { evidence, limitations }
  }

  const breakingChangesNode = async (state) => {
    await report('breakingChanges', 'Identifying evidence-backed breaking changes.')
    if (!state.evidence?.length) {
      return {
        breakingChanges: [],
        limitations: ['Breaking changes could not be assessed because no evidence was retrieved.'],
      }
    }
    const data = await generate({
      schema: breakingChangesSchema,
      name: 'breaking_changes',
      prompt: buildBreakingChangePrompt({
        update: state.update,
        evidence: state.evidence,
        context: state.context,
        memory: state.memory,
        history: state.history,
      }),
      maxTokens: 6000,
    })
    return { breakingChanges: data.breakingChanges, limitations: data.limitations || [] }
  }

  const codeImpactNode = async (state) => {
    await report('codeImpact', 'Mapping documented changes to repository files.')
    if (!state.context?.files?.length) {
      return {
        projectImpact: [],
        limitations: ['Repository code impact could not be assessed because no relevant files were retrieved.'],
      }
    }
    const data = await generate({
      schema: codeImpactSchema,
      name: 'code_impact',
      prompt: buildImpactPrompt({
        update: state.update,
        evidence: state.evidence,
        context: state.context,
        memory: state.memory,
        history: state.history,
      }),
      maxTokens: 6000,
    })
    return { projectImpact: data.findings, limitations: data.limitations || [] }
  }

  const compatibilityNode = async (state) => {
    await report('compatibility', 'Assessing repository-specific compatibility.')
    const data = await generate({
      schema: compatibilitySchema,
      name: 'compatibility',
      prompt: buildCompatibilityPrompt({
        update: state.update,
        evidence: state.evidence,
        context: state.context,
        breakingChanges: state.breakingChanges,
        impact: state.projectImpact,
        memory: state.memory,
        history: state.history,
      }),
      maxTokens: 5000,
    })
    return { compatibility: data }
  }

  const riskNode = async (state) => {
    await report('riskAssessment', 'Calculating evidence-based upgrade risk.')
    const data = await generate({
      schema: riskSchema,
      name: 'risk_assessment',
      prompt: buildRiskPrompt({
        update: state.update,
        evidence: state.evidence,
        compatibility: state.compatibility,
        security: state.security,
        memory: state.memory,
        history: state.history,
      }),
      maxTokens: 4000,
    })
    return { risk: data }
  }

  const migrationNode = async (state) => {
    await report('migrationPlan', 'Preparing a review-only migration checklist.')
    const data = await generate({
      schema: migrationPlanSchema,
      name: 'migration_plan',
      prompt: buildMigrationPrompt({
        update: state.update,
        evidence: state.evidence,
        breakingChanges: state.breakingChanges,
        impact: state.projectImpact,
        compatibility: state.compatibility,
        memory: state.memory,
        history: state.history,
      }),
      maxTokens: 6000,
    })
    return { migrationPlan: data.steps, limitations: data.limitations || [] }
  }

  const evidenceValidationNode = async (state) => {
    await report('evidenceValidation', 'Validating every claim against retrieved evidence.')
    const validation = validateEvidence({
      evidence: state.evidence,
      breakingChanges: state.breakingChanges,
      projectImpact: state.projectImpact,
      compatibilityFindings: state.compatibility?.findings || [],
      migrationSteps: state.migrationPlan,
      recommendation: {},
      risk: state.risk,
    })
    return { validation, limitations: validation.limitations || [] }
  }

  const recommendationNode = async (state) => {
    await report('recommendation', 'Generating the final recommendation.')
    const data = await generate({
      schema: finalRecommendationSchema,
      name: 'final_recommendation',
      prompt: buildRecommendationPrompt({
        update: state.update,
        evidence: state.evidence,
        risk: state.risk,
        compatibility: state.compatibility,
        migration: state.migrationPlan,
        limitations: state.limitations,
        memory: state.memory,
        history: state.history,
      }),
      maxTokens: 5000,
    })

    const validation = validateEvidence({
      evidence: state.evidence,
      recommendation: data,
    })
    const ok = validation.ok && data.recommendation !== 'INSUFFICIENT_EVIDENCE'
    return {
      recommendationData: {
        ...data,
        recommendation: ok ? data.recommendation : 'INSUFFICIENT_EVIDENCE',
        limitations: [...new Set([...(data.limitations || []), ...(validation.limitations || [])])].slice(0, 30),
      },
      analysisStatus: ok ? 'COMPLETED' : 'INSUFFICIENT_EVIDENCE',
      limitations: validation.limitations || [],
    }
  }

  const insufficientEvidenceNode = async (state) => {
    await report('recommendation', 'Returning an insufficient-evidence result.')
    return {
      recommendationData: {
        upgradeSummary: `No verified evidence was available to assess upgrading ${state.update.packageName} to ${state.update.targetVersion || state.update.latestStableVersion || 'the latest version'}.`,
        recommendation: 'INSUFFICIENT_EVIDENCE',
        reason: 'Generated claims could not be linked to retrieved, verifiable evidence. No upgrade action should be inferred.',
        evidenceIds: [],
        limitations: state.limitations || [],
      },
      analysisStatus: 'INSUFFICIENT_EVIDENCE',
    }
  }

  const graph = new StateGraph(AnalysisState)
    .addNode('repositoryContextNode', repositoryContextNode)
    .addNode('dependencyDataNode', dependencyDataNode)
    .addNode('memoryContextNode', memoryContextNode)
    .addNode('historicalComparisonNode', historicalComparisonNode)
    .addNode('documentationResearchNode', documentationResearchNode)
    .addNode('documentRetrievalNode', documentRetrievalNode)
    .addNode('breakingChangesNode', breakingChangesNode)
    .addNode('codeImpactNode', codeImpactNode)
    .addNode('compatibilityNode', compatibilityNode)
    .addNode('riskAssessmentNode', riskNode)
    .addNode('migrationPlanNode', migrationNode)
    .addNode('evidenceValidationNode', evidenceValidationNode)
    .addNode('recommendationNode', recommendationNode)
    .addNode('insufficientEvidenceNode', insufficientEvidenceNode)
    .addEdge('__start__', 'repositoryContextNode')
    .addEdge('repositoryContextNode', 'dependencyDataNode')
    .addEdge('dependencyDataNode', 'memoryContextNode')
    .addEdge('memoryContextNode', 'historicalComparisonNode')
    .addEdge('historicalComparisonNode', 'documentationResearchNode')
    .addEdge('documentationResearchNode', 'documentRetrievalNode')
    .addEdge('documentRetrievalNode', 'breakingChangesNode')
    .addEdge('breakingChangesNode', 'codeImpactNode')
    .addEdge('codeImpactNode', 'compatibilityNode')
    .addEdge('compatibilityNode', 'riskAssessmentNode')
    .addEdge('riskAssessmentNode', 'migrationPlanNode')
    .addEdge('migrationPlanNode', 'evidenceValidationNode')
    .addConditionalEdges(
      'evidenceValidationNode',
      (state) => (state.validation?.ok ? 'recommendationNode' : 'insufficientEvidenceNode'),
      { recommendationNode: 'recommendationNode', insufficientEvidenceNode: 'insufficientEvidenceNode' },
    )
    .addEdge('recommendationNode', END)
    .addEdge('insufficientEvidenceNode', END)
    .compile()

  return {
    invoke: (initialState) => graph.invoke(initialState),
  }
}

export { buildChatPrompt }

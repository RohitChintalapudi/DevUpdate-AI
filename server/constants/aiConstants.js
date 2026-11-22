export const ANALYSIS_STATUSES = [
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'INSUFFICIENT_EVIDENCE',
]

export const AI_JOB_TYPES = [
  'REPOSITORY_ANALYSIS',
  'DEPENDENCY_ANALYSIS',
  'DOCUMENTATION_RESEARCH',
]

export const AI_JOB_STATUSES = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN']

export const RECOMMENDATIONS = [
  'UPGRADE_RECOMMENDED',
  'UPGRADE_WITH_CAUTION',
  'REVIEW_BEFORE_UPGRADE',
  'DEFER_UPGRADE',
  'INSUFFICIENT_EVIDENCE',
]

export const EVIDENCE_STATUSES = ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED']

export const SOURCE_TYPES = [
  'OFFICIAL_DOCS',
  'RELEASE_NOTES',
  'MIGRATION_GUIDE',
  'CHANGELOG',
  'GITHUB_RELEASE',
  'REGISTRY_METADATA',
  'SECURITY_ADVISORY',
  'REPOSITORY_CODE',
  'PROJECT_CONTEXT',
  'AI_INTERPRETATION',
]

export const WORKFLOW_STAGES = [
  'repositoryContext',
  'dependencyData',
  'memoryContext',
  'historicalComparison',
  'documentationResearch',
  'documentRetrieval',
  'breakingChanges',
  'codeImpact',
  'compatibility',
  'riskAssessment',
  'migrationPlan',
  'evidenceValidation',
  'recommendation',
]

export const AI_LIMITS = {
  maxAnalysisJobsPerUser: Number(process.env.AI_MAX_JOBS_PER_USER) || 5,
  maxAnalysisJobsPerRepository: Number(process.env.AI_MAX_JOBS_PER_REPOSITORY) || 2,
  maxMessagesPerConversation: 60,
  maxQuestionLength: 2000,
  maxScrapedContentBytes: 200 * 1024,
  maxContextFileBytes: 60 * 1024,
  maxContextFiles: 25,
  maxContextBytes: 180 * 1024,
  maxEvidenceItems: 40,
  maxMigrationSteps: 20,
  chatTokenBudget: 4000,
  analysisTokenBudget: 24000,
}

export const RECOVERABLE_AI_ERRORS = [
  'RATE_LIMITED',
  'TIMEOUT',
  'NETWORK',
  'PROVIDER_UNAVAILABLE',
  'INVALID_JSON',
]

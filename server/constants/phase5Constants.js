export const MEMORY_CATEGORIES = [
  'PROJECT',
  'DEPENDENCY',
  'DECISION',
  'ANALYSIS',
  'CONVERSATION',
]

export const MEMORY_STATUSES = ['ACTIVE', 'SUPERSEDED', 'EXPIRED', 'DELETED']

export const MEMORY_VERIFICATION_STATUSES = ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED']

export const MEMORY_ORIGINS = [
  'REPOSITORY_SCAN',
  'AI_ANALYSIS',
  'DEVELOPER_FEEDBACK',
  'CHAT',
  'MANUAL',
  'HISTORICAL_COMPARISON',
]

export const DECISION_TYPES = [
  'ACCEPTED',
  'REJECTED',
  'POSTPONED',
  'COMPLETED',
  'INCORRECT',
]

export const NOTIFICATION_TYPES = [
  'MAJOR_UPDATE',
  'SECURITY_VULNERABILITY',
  'DEPRECATED_PACKAGE',
  'AI_ANALYSIS_COMPLETED',
  'AI_ANALYSIS_FAILED',
  'SCAN_FAILED',
  'VULNERABILITY_FIXED',
  'RECOMMENDATION_CHANGED',
]

export const REPORT_TYPES = [
  'HEALTH',
  'DEPENDENCY_UPDATE',
  'SECURITY',
  'AI_RECOMMENDATION',
  'HISTORICAL_COMPARISON',
]

export const REPORT_FORMATS = ['JSON', 'CSV', 'PDF']

export const MEMENTO_CAPABILITIES = [
  'search',
  'store',
  'update',
  'delete',
  'retrieveById',
]

export const PHASE5_LIMITS = {
  maxMemoriesPerRepository: Number(process.env.MEMORY_MAX_PER_REPOSITORY) || 2000,
  maxMemoryContentLength: 12000,
  maxMemoryTitleLength: 240,
  maxDecisionExplanationLength: 4000,
  maxMemoriesInContext: 12,
  maxNotificationsPerPage: 100,
  maxReportRows: 5000,
  mementoTimeoutMs: Number(process.env.MEMENTO_TIMEOUT_MS) || 12000,
  mementoRetries: 2,
}

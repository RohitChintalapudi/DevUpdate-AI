import { EVIDENCE_STATUSES } from '../../../constants/aiConstants.js'

function evidenceMap(evidence = []) {
  return new Map(evidence.map((item) => [String(item.id), item]))
}

function validateFinding(finding, known) {
  const ids = Array.isArray(finding.evidenceIds) ? [...new Set(finding.evidenceIds.map(String))] : []
  const matched = ids.map((id) => known.get(id)).filter(Boolean)
  const unknown = ids.filter((id) => !known.has(id))
  const verified = matched.filter((item) => item.verificationStatus === 'VERIFIED')
  const partial = matched.filter((item) => item.verificationStatus === 'PARTIALLY_VERIFIED')

  let status = 'UNVERIFIED'
  if (verified.length) status = 'VERIFIED'
  else if (partial.length) status = 'PARTIALLY_VERIFIED'
  else if (matched.length) status = 'PARTIALLY_VERIFIED'

  return {
    ...finding,
    evidenceIds: matched.map((item) => String(item.id)),
    verificationStatus: status,
    _unknownEvidenceIds: unknown,
    _hasEvidence: matched.length > 0,
  }
}

function validateStep(step, known, evidenceUrls) {
  const validated = validateFinding({ ...step, verificationStatus: 'UNVERIFIED' }, known)
  let documentationUrl = String(step.documentationUrl || '').trim()
  if (documentationUrl && !evidenceUrls.has(documentationUrl)) {
    documentationUrl = ''
    validated.verificationStatus = 'UNVERIFIED'
  }
  return { ...validated, documentationUrl }
}

export function validateEvidence({
  evidence = [],
  breakingChanges = [],
  projectImpact = [],
  compatibilityFindings = [],
  migrationSteps = [],
  recommendation = {},
  risk = {},
}) {
  const known = evidenceMap(evidence)
  const evidenceUrls = new Set(evidence.map((item) => String(item.url || '')).filter(Boolean))
  const removedClaims = []

  const validateList = (items, label) =>
    (Array.isArray(items) ? items : []).map((item, index) => {
      const result = validateFinding(item, known)
      if (result._unknownEvidenceIds.length || !result._hasEvidence) {
        removedClaims.push({
          section: label,
          id: result.id || `${label}-${index + 1}`,
          reason: result._unknownEvidenceIds.length ? 'Unknown evidence IDs' : 'No supporting evidence',
        })
      }
      delete result._unknownEvidenceIds
      delete result._hasEvidence
      return result
    })

  const validatedBreakingChanges = validateList(breakingChanges, 'breakingChanges')
  const validatedProjectImpact = validateList(projectImpact, 'projectImpact')
  const validatedCompatibilityFindings = validateList(compatibilityFindings, 'compatibilityFindings')

  const validatedSteps = (Array.isArray(migrationSteps) ? migrationSteps : []).map((step, index) => {
    const result = validateStep(step, known, evidenceUrls)
    if (result._unknownEvidenceIds.length || !result._hasEvidence) {
      removedClaims.push({
        section: 'migrationPlan',
        id: result.id || `step-${index + 1}`,
        reason: result._unknownEvidenceIds.length ? 'Unknown evidence IDs' : 'No supporting evidence',
      })
    }
    delete result._unknownEvidenceIds
    delete result._hasEvidence
    return result
  })

  const recommendationResult = validateFinding(
    {
      id: 'final-recommendation',
      title: recommendation.recommendation || 'Recommendation',
      description: recommendation.reason || '',
      evidenceIds: recommendation.evidenceIds || [],
      verificationStatus: 'UNVERIFIED',
      severity: 'UNKNOWN',
    },
    known,
  )

  const enoughEvidence = [...validatedBreakingChanges, ...validatedProjectImpact, ...validatedCompatibilityFindings]
    .some((item) => item.verificationStatus !== 'UNVERIFIED') || recommendationResult.evidenceIds.length > 0

  const finalRecommendation = enoughEvidence
    ? recommendation.recommendation || 'REVIEW_BEFORE_UPGRADE'
    : 'INSUFFICIENT_EVIDENCE'

  const limitations = [...(Array.isArray(recommendation.limitations) ? recommendation.limitations : [])]
  if (!enoughEvidence) limitations.push('No generated claim could be linked to retrieved, verifiable evidence.')
  for (const claim of removedClaims.slice(0, 20)) {
    limitations.push(`${claim.section} claim ${claim.id} was marked unverified: ${claim.reason}.`)
  }

  return {
    ok: enoughEvidence,
    breakingChanges: validatedBreakingChanges,
    projectImpact: validatedProjectImpact,
    compatibilityFindings: validatedCompatibilityFindings,
    migrationSteps: validatedSteps,
    risk: {
      ...risk,
      evidenceIds: (risk.evidenceIds || []).filter((id) => known.has(String(id))).map(String),
    },
    recommendation: finalRecommendation,
    recommendationReason: recommendation.reason || '',
    upgradeSummary: recommendation.upgradeSummary || '',
    limitations: [...new Set(limitations)].slice(0, 30),
    removedClaims,
  }
}

export function assertValidEvidenceStatus(status) {
  if (!EVIDENCE_STATUSES.includes(status)) return 'UNVERIFIED'
  return status
}

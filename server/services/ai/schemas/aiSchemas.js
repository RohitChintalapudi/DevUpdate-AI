import { z } from 'zod'
import { EVIDENCE_STATUSES, RECOMMENDATIONS, RISK_LEVELS } from '../../../constants/aiConstants.js'

const boundedText = (max = 2000) => z.string().trim().min(1).max(max)
const evidenceId = boundedText(120)

export const evidenceRefSchema = z.object({
  id: evidenceId,
  title: boundedText(300).default('Source'),
  url: z.string().trim().max(2000).default(''),
  sourceType: z.string().trim().max(80).default('OFFICIAL_DOCS'),
  excerpt: boundedText(3000).default('Evidence excerpt unavailable.'),
  verificationStatus: z.enum(EVIDENCE_STATUSES).default('UNVERIFIED'),
  confidence: z.number().min(0).max(1).default(0),
})

export const findingSchema = z.object({
  id: evidenceId,
  title: boundedText(240),
  description: boundedText(3000),
  evidenceIds: z.array(evidenceId).max(30).default([]),
  verificationStatus: z.enum(EVIDENCE_STATUSES).default('UNVERIFIED'),
  severity: z.string().trim().max(30).default('UNKNOWN'),
})

export const releaseIntelligenceSchema = z.object({
  importantChanges: z
    .array(z.object({ text: boundedText(1500), evidenceIds: z.array(evidenceId).max(20).default([]) }))
    .max(30)
    .default([]),
  newFeatures: z
    .array(z.object({ text: boundedText(1500), evidenceIds: z.array(evidenceId).max(20).default([]) }))
    .max(30)
    .default([]),
  bugFixes: z
    .array(z.object({ text: boundedText(1500), evidenceIds: z.array(evidenceId).max(20).default([]) }))
    .max(30)
    .default([]),
  deprecatedApis: z
    .array(z.object({ text: boundedText(1500), evidenceIds: z.array(evidenceId).max(20).default([]) }))
    .max(30)
    .default([]),
})

export const breakingChangesSchema = z.object({
  breakingChanges: z
    .array(
      findingSchema.extend({
        affectedVersions: z.string().trim().max(120).default(''),
        migrationHint: boundedText(1500).default(''),
      }),
    )
    .max(30),
  limitations: z.array(boundedText(1000)).max(20).default([]),
})

export const codeImpactSchema = z.object({
  findings: z
    .array(
      findingSchema.extend({
        filePaths: z.array(boundedText(300)).max(50).default([]),
        codeEvidence: z
          .array(
            z.object({
              path: boundedText(300),
              snippet: boundedText(600),
              reason: boundedText(500),
            }),
          )
          .max(50)
          .default([]),
      }),
    )
    .max(30),
  limitations: z.array(boundedText(1000)).max(20).default([]),
})

export const compatibilitySchema = z.object({
  status: z.enum(['COMPATIBLE', 'POTENTIALLY_INCOMPATIBLE', 'INCOMPATIBLE', 'UNKNOWN']),
  reason: boundedText(3000),
  findings: z.array(findingSchema).max(30).default([]),
  evidenceIds: z.array(evidenceId).max(30).default([]),
})

export const riskSchema = z.object({
  level: z.enum(RISK_LEVELS),
  score: z.number().min(0).max(100),
  reason: boundedText(3000),
  evidenceIds: z.array(evidenceId).max(30).default([]),
  factors: z
    .array(
      z.object({
        factor: boundedText(500),
        impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN']),
        evidenceIds: z.array(evidenceId).max(20).default([]),
      }),
    )
    .max(20)
    .default([]),
})

export const migrationPlanSchema = z.object({
  steps: z
    .array(
      z.object({
        order: z.number().int().min(1),
        action: boundedText(1500),
        reason: boundedText(1500).default(''),
        fileArea: boundedText(300).default(''),
        documentationUrl: z.string().trim().max(2000).default(''),
        evidenceIds: z.array(evidenceId).max(20).default([]),
        validation: boundedText(1500).default(''),
      }),
    )
    .max(20),
  limitations: z.array(boundedText(1000)).max(20).default([]),
})

export const finalRecommendationSchema = z.object({
  upgradeSummary: boundedText(4000),
  recommendation: z.enum(RECOMMENDATIONS),
  reason: boundedText(3000),
  importantChanges: z.array(boundedText(1500)).max(30).default([]),
  newFeatures: z.array(boundedText(1500)).max(30).default([]),
  bugFixes: z.array(boundedText(1500)).max(30).default([]),
  deprecatedApis: z.array(boundedText(1500)).max(30).default([]),
  evidenceIds: z.array(evidenceId).max(40).default([]),
  limitations: z.array(boundedText(1200)).max(30).default([]),
})

export const chatAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(6000),
  evidenceIds: z.array(evidenceId).max(30).default([]),
  insufficientEvidence: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0),
})

export const researchExtractionSchema = z.object({
  summary: boundedText(3000),
  releaseDate: z.string().trim().max(80).default(''),
  sourceType: z.string().trim().max(80).default('OFFICIAL_DOCS'),
  importantPoints: z.array(boundedText(1500)).max(30).default([]),
  breakingChangeHints: z.array(boundedText(1500)).max(30).default([]),
})

function extractJsonObject(value) {
  const text = String(value || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

export function parseAiJson(value, schema) {
  const raw = extractJsonObject(value)
  if (!raw) {
    return { ok: false, error: 'The model did not return a JSON object.' }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'The model returned malformed JSON.' }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    return {
      ok: false,
      error: `The model output did not match the required schema: ${result.error.issues[0]?.message || 'invalid output'}`,
      issues: result.error.issues.slice(0, 10),
    }
  }
  return { ok: true, data: result.data }
}

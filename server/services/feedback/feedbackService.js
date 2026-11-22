import AIAnalysis from '../../models/AIAnalysis.js'
import DependencyDecision from '../../models/DependencyDecision.js'
import { AppError } from '../../utils/errors.js'
import { sanitizeText } from '../../utils/sanitize.js'
import { DECISION_TYPES, PHASE5_LIMITS } from '../../constants/phase5Constants.js'
import { storeDecisionMemory } from '../memory/memoryService.js'

function assertDecision(decision) {
  if (!DECISION_TYPES.includes(decision)) {
    throw new AppError('Invalid decision.', 400)
  }
}

export async function recordDecision({
  userId,
  analysisId,
  decision,
  explanation = '',
  notes = '',
  onDecisionRecorded = null,
}) {
  assertDecision(decision)
  const analysis = await AIAnalysis.findOne({ _id: analysisId, userId }).lean()
  if (!analysis) throw new AppError('AI analysis not found.', 404)

  const cleanExplanation = sanitizeText(explanation, PHASE5_LIMITS.maxDecisionExplanationLength)
  const cleanNotes = sanitizeText(notes, PHASE5_LIMITS.maxDecisionExplanationLength)

  const record = await DependencyDecision.findOneAndUpdate(
    { userId, analysisId },
    {
      $set: {
        repositoryId: analysis.repositoryId,
        dependencyId: analysis.dependencyId,
        decision,
        explanation: cleanExplanation,
        notes: cleanNotes,
        packageName: analysis.packageName || '',
        targetVersion: analysis.targetVersion || '',
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  const memory = await storeDecisionMemory(record)
  if (onDecisionRecorded) {
    await onDecisionRecorded(record, memory)
  }

  return { decision: record, memoryId: memory.memory?._id || null }
}

export async function listRepositoryDecisions({ userId, repositoryId, page = 1, limit = 50 }) {
  const size = Math.min(100, Math.max(1, Number(limit) || 50))
  const current = Math.max(1, Number(page) || 1)
  const query = { userId, repositoryId }
  const [items, total] = await Promise.all([
    DependencyDecision.find(query).sort({ createdAt: -1 }).skip((current - 1) * size).limit(size).lean(),
    DependencyDecision.countDocuments(query),
  ])
  return { items, total, page: current, limit: size, pages: Math.ceil(total / size) }
}

export async function getDecisionOptions() {
  return DECISION_TYPES
}

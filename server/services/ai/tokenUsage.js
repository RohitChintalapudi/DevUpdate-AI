import AIJob from '../../models/AIJob.js'
import AIAnalysis from '../../models/AIAnalysis.js'
import { AI_LIMITS } from '../../constants/aiConstants.js'
import { AppError } from '../../utils/errors.js'

export function normalizeUsage(usage = {}) {
  const prompt = Math.max(0, Number(usage.promptTokens ?? usage.inputTokens ?? usage.prompt) || 0)
  const completion = Math.max(0, Number(usage.completionTokens ?? usage.outputTokens ?? usage.completion) || 0)
  return { prompt, completion, total: prompt + completion }
}

export function createTokenLedger({ jobId = null, analysisId = null, budget = AI_LIMITS.analysisTokenBudget } = {}) {
  const totals = { prompt: 0, completion: 0, total: 0 }

  return {
    totals,
    add(usage) {
      const value = normalizeUsage(usage)
      totals.prompt += value.prompt
      totals.completion += value.completion
      totals.total += value.total
      if (totals.total > budget) {
        throw new AppError('AI token budget exceeded for this workflow.', 429)
      }
      return { ...totals }
    },
    async persist() {
      const update = {
        'tokens.prompt': totals.prompt,
        'tokens.completion': totals.completion,
        'tokens.total': totals.total,
      }
      const operations = []
      if (jobId) operations.push(AIJob.updateOne({ _id: jobId }, { $set: update }))
      if (analysisId) operations.push(AIAnalysis.updateOne({ _id: analysisId }, { $set: update }))
      if (operations.length) await Promise.all(operations)
      return { ...totals }
    },
  }
}

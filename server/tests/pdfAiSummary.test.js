import assert from 'node:assert/strict'
import test from 'node:test'

process.env.GROQ_API_KEY = ''

const { generateRepositoryPdfSummary } = await import('../services/reports/pdfAiSummaryService.js')

test('PDF summary reports no changes required when every dependency is current', async () => {
  const summary = await generateRepositoryPdfSummary({
    repository: { fullName: 'org/current' },
    updates: [
      { packageName: 'react', installedVersion: '19.0.0', latestStableVersion: '19.0.0', updateType: 'NONE', updateStatus: 'UP_TO_DATE' },
    ],
  })

  assert.equal(summary.status, 'ALL_UP_TO_DATE')
  assert.equal(summary.actions.length, 0)
  assert.match(summary.summary, /no upgrade action is needed/i)
  assert.equal(summary.source, 'deterministic')
})

test('PDF summary lists concrete actions when updates are available', async () => {
  const summary = await generateRepositoryPdfSummary({
    repository: { fullName: 'org/behind' },
    updates: [
      { packageName: 'react', installedVersion: '17.0.0', latestStableVersion: '19.0.0', updateType: 'MAJOR', updateStatus: 'OUTDATED' },
      { packageName: 'axios', installedVersion: '1.0.0', latestStableVersion: '1.2.0', updateType: 'MINOR', updateStatus: 'UPDATE_AVAILABLE' },
    ],
  })

  assert.equal(summary.status, 'CHANGES_NEEDED')
  assert.equal(summary.actions.length, 2)
  assert.match(summary.actions[0].action, /react/)
  assert.match(summary.summary, /major version shift/)
})

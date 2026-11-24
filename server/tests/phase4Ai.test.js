import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertSafeExternalUrl,
  isPrivateAddress,
  safeSourceDomainsFromMetadata,
} from '../services/ai/security/urlSafety.js'
import {
  chunkText,
  contentHash,
  normalizeDocumentContent,
  redactSensitive,
} from '../utils/aiText.js'
import { toGroqJsonSchema } from '../services/ai/providers/groqProvider.js'
import { chatAnswerSchema, parseAiJson, researchKnowledgeFallbackSchema } from '../services/ai/schemas/aiSchemas.js'
import { riskSchema } from '../services/ai/schemas/aiSchemas.js'
import { buildResearchKnowledgeFallbackPrompt } from '../services/ai/prompts/aiPrompts.js'
import { validateEvidence } from '../services/ai/validation/evidenceValidator.js'
import { buildMetadataFilter, userNamespace } from '../services/ai/vector/pineconeStore.js'
import { createAnalysisWorkflow } from '../services/ai/workflow/analysisWorkflow.js'
import {
  conversationDeleteScope,
  conversationListScope,
  conversationScope,
  repositoryScope,
} from '../services/ai/chat/repositoryChatService.js'

test('research URL safety blocks private, non-HTTP, credential and out-of-domain URLs', async () => {
  assert.equal(isPrivateAddress('10.1.2.3'), true)
  assert.equal(isPrivateAddress('169.254.169.254'), true)
  assert.equal(isPrivateAddress('8.8.8.8'), false)

  await assert.rejects(
    () => assertSafeExternalUrl('http://127.0.0.1/admin'),
    /Private and local research URLs are blocked/,
  )
  await assert.rejects(
    () => assertSafeExternalUrl('file:///etc/passwd'),
    /Only HTTP and HTTPS research URLs are allowed/,
  )
  await assert.rejects(
    () => assertSafeExternalUrl('https://user:pass@example.com/docs'),
    /must not contain credentials/,
  )
  await assert.rejects(
    () => assertSafeExternalUrl('https://8.8.8.8/docs', { allowedDomains: ['example.com'] }),
    /outside the allowed domains/,
  )

  const safe = await assertSafeExternalUrl('https://8.8.8.8/docs#ignored')
  assert.equal(safe, 'https://8.8.8.8/docs')
})

test('research metadata only trusts non-private package domains', () => {
  const domains = safeSourceDomainsFromMetadata({
    repositoryUrl: 'https://github.com/example/repo',
    homepage: 'https://www.npmjs.com/package/example',
    registryUrl: 'https://registry.npmjs.org/example',
    documentationUrl: 'http://localhost:3000/docs',
  })

  assert.deepEqual(domains, ['npmjs.com', 'registry.npmjs.org'])
})

test('document normalization removes boilerplate and chunking is deterministic', () => {
  const normalized = normalizeDocumentContent(
    'Cookie Policy\r\n\r\n# Release 2.0\r\n\r\nBreaking change: renamed oldApi to newApi.\r\n\r\nSign in\r\n',
  )

  assert.match(normalized, /# Release 2.0/)
  assert.match(normalized, /renamed oldApi to newApi/)
  assert.doesNotMatch(normalized, /Cookie Policy/)
  assert.doesNotMatch(normalized, /Sign in/)

  const source = Array.from(
    { length: 10 },
    (_, index) => `Breaking change ${index}: migrate oldApi to newApi before release.`,
  ).join('\n\n')
  const chunks = chunkText(source, { maxChars: 300, overlapChars: 40 })

  assert.ok(chunks.length > 1)
  assert.ok(chunks.every((chunk) => chunk.text.length <= 300))
  assert.equal(chunks[0].hash, contentHash(chunks[0].text))
  assert.equal(chunks[1].hash, contentHash(chunks[1].text))
  assert.notEqual(chunks[0].text, chunks[1].text)
})

test('sensitive values are redacted from model-visible text', () => {
  assert.match(redactSensitive('token gsk_abcdefghijklmnop'), /\[redacted-token\]/)
  assert.match(redactSensitive('api_key: super-secret-value'), /\[redacted\]/)
  assert.match(redactSensitive('password: hunter2'), /\[redacted\]/)
})

test('Groq JSON schema conversion is strict including nested objects', () => {
  const format = toGroqJsonSchema(chatAnswerSchema, 'chat answer')
  assert.equal(format.type, 'json_schema')
  assert.equal(format.json_schema.name, 'chat_answer')
  assert.equal(format.json_schema.strict, true)
  assert.equal(format.json_schema.schema.additionalProperties, false)
  assert.deepEqual(
    format.json_schema.schema.required,
    Object.keys(format.json_schema.schema.properties),
  )

  const risk = toGroqJsonSchema(riskSchema, 'risk').json_schema.schema
  assert.equal(risk.additionalProperties, false)
  assert.equal(risk.properties.factors.items.additionalProperties, false)
  assert.deepEqual(
    risk.properties.factors.items.required,
    Object.keys(risk.properties.factors.items.properties),
  )
  assert.ok(risk.properties.level.enum.includes('INSUFFICIENT_EVIDENCE') === false)
  assert.ok(risk.properties.level.enum.includes('UNKNOWN'))
})

test('AI knowledge fallback is explicit, bounded and unverified', () => {
  const parsed = parseAiJson(
    JSON.stringify({
      summary: 'Small utility package; no official page was reachable.',
      purpose: 'Provides shared error helpers.',
      status: 'ACTIVE',
      upgradeImpact: 'Likely low impact, but no release notes were verified.',
      riskLevel: 'UNKNOWN',
      recommendation: 'INSUFFICIENT_EVIDENCE',
      confidence: 0.35,
    }),
    researchKnowledgeFallbackSchema,
  )
  assert.equal(parsed.ok, true)
  assert.equal(parsed.data.status, 'ACTIVE')
  assert.deepEqual(parsed.data.limitations, [])

  const prompt = buildResearchKnowledgeFallbackPrompt({
    update: { packageName: 'es-errors', ecosystem: 'npm', targetVersion: '6.1.1' },
    reason: 'Firecrawl timed out',
  })
  assert.match(prompt, /UNVERIFIED fallback/)
  assert.match(prompt, /es-errors/)
  assert.match(prompt, /Firecrawl timed out/)
})

test('parseAiJson extracts JSON, applies defaults and rejects invalid output', () => {
  const valid = parseAiJson(
    '```json\n{"answer":"Use the documented migration.","evidenceIds":[]}\n```',
    chatAnswerSchema,
  )
  assert.equal(valid.ok, true)
  assert.equal(valid.data.answer, 'Use the documented migration.')
  assert.equal(valid.data.insufficientEvidence, false)
  assert.equal(valid.data.confidence, 0)

  assert.equal(parseAiJson('not json', chatAnswerSchema).ok, false)
  assert.equal(parseAiJson('{"answer":"x",', chatAnswerSchema).ok, false)
  assert.equal(parseAiJson('{"evidenceIds":[]}', chatAnswerSchema).ok, false)
})

test('evidence validation keeps verified claims and downgrades unsupported ones', () => {
  const evidence = [{
    id: 'ev-1',
    title: 'Official migration guide',
    url: 'https://example.com/docs/migration',
    verificationStatus: 'VERIFIED',
  }]

  const valid = validateEvidence({
    evidence,
    breakingChanges: [{
      id: 'bc-1',
      title: 'Renamed API',
      description: 'oldApi was renamed.',
      evidenceIds: ['ev-1'],
    }],
    recommendation: {
      recommendation: 'UPGRADE_WITH_CAUTION',
      reason: 'The migration is documented.',
      evidenceIds: ['ev-1'],
    },
  })

  assert.equal(valid.ok, true)
  assert.equal(valid.breakingChanges[0].verificationStatus, 'VERIFIED')
  assert.equal(valid.recommendation, 'UPGRADE_WITH_CAUTION')

  const unsupported = validateEvidence({
    evidence,
    recommendation: {
      recommendation: 'UPGRADE_RECOMMENDED',
      reason: 'Unsupported claim.',
      evidenceIds: ['does-not-exist'],
    },
  })

  assert.equal(unsupported.ok, false)
  assert.equal(unsupported.recommendation, 'INSUFFICIENT_EVIDENCE')
  assert.match(unsupported.limitations.join(' '), /No generated claim could be linked/)

  const migration = validateEvidence({
    evidence,
    migrationSteps: [{
      order: 1,
      action: 'Rename oldApi to newApi.',
      evidenceIds: ['ev-1'],
      documentationUrl: 'https://untrusted.example/steps',
    }],
  })
  assert.equal(migration.migrationSteps[0].documentationUrl, '')
  assert.equal(migration.migrationSteps[0].verificationStatus, 'UNVERIFIED')
})

test('vector filters and namespaces enforce user and repository isolation', () => {
  assert.deepEqual(
    buildMetadataFilter({
      userId: 'u-1',
      repositoryId: 'r-1',
      packageName: ' React ',
      ecosystem: 'NPM',
      version: '19.1.0',
    }),
    {
      userId: { $eq: 'u-1' },
      repositoryId: { $eq: 'r-1' },
      packageName: { $eq: 'react' },
      ecosystem: { $eq: 'npm' },
      version: { $eq: '19.1.0' },
    },
  )
  assert.deepEqual(buildMetadataFilter({}), {})
  assert.equal(userNamespace('user-a'), 'devupdate_user-a')
  assert.equal(userNamespace('user-b'), 'devupdate_user-b')
  assert.notEqual(userNamespace('user-a'), userNamespace('user-b'))
  assert.throws(() => userNamespace('***'), /user is required/i)
})

function initialWorkflowState() {
  return {
    input: {
      userId: 'user-1',
      repositoryId: 'repo-1',
      dependencyId: 'dependency-1',
    },
    repository: { id: 'repo-1' },
    update: {
      packageName: 'example-package',
      installedVersion: '1.0.0',
      targetVersion: '2.0.0',
      ecosystem: 'npm',
      updateType: 'MAJOR',
      securityStatus: 'NO_KNOWN_VULNERABILITY',
      vulnerabilities: [],
    },
    security: {},
    context: null,
    research: { documents: [], status: 'PENDING', limitations: [] },
    evidence: [],
    limitations: [],
    breakingChanges: [],
    projectImpact: [],
    compatibility: {},
    risk: {},
    migrationPlan: [],
    validation: {},
    recommendationData: {},
    analysisStatus: 'RUNNING',
  }
}

test('workflow returns INSUFFICIENT_EVIDENCE without final generation when no evidence is verifiable', async () => {
  const generatedNames = []
  const services = {
    analyzeProjectContext: async () => ({ status: 'AVAILABLE', files: [], limitations: [] }),
    researchPackageUpdate: async () => ({
      documents: [],
      status: 'NO_RESULTS',
      limitations: ['No official documents were retrieved.'],
    }),
    ingestDocuments: async () => {
      throw new Error('ingestDocuments should not be called without documents')
    },
    retrieveEvidence: async () => ({
      rows: [],
      status: 'NO_RESULTS',
      limitations: ['No indexed documentation matched this package and repository.'],
    }),
    generateStructured: async ({ name }) => {
      generatedNames.push(name)
      if (name === 'compatibility') {
        return {
          data: { status: 'UNKNOWN', reason: 'Unsupported.', findings: [], evidenceIds: [] },
          usage: { promptTokens: 10, completionTokens: 5 },
        }
      }
      if (name === 'risk_assessment') {
        return {
          data: { level: 'UNKNOWN', score: 0, reason: 'Unsupported.', evidenceIds: [], factors: [] },
          usage: { promptTokens: 10, completionTokens: 5 },
        }
      }
      return {
        data: { steps: [], limitations: [] },
        usage: { promptTokens: 10, completionTokens: 5 },
      }
    },
  }
  const stages = []
  const workflow = createAnalysisWorkflow({
    services,
    onProgress: async ({ stage }) => { stages.push(stage) },
  })

  const state = await workflow.invoke(initialWorkflowState())

  assert.equal(state.analysisStatus, 'INSUFFICIENT_EVIDENCE')
  assert.equal(state.recommendationData.recommendation, 'INSUFFICIENT_EVIDENCE')
  assert.deepEqual(state.recommendationData.evidenceIds, [])
  assert.match(state.recommendationData.upgradeSummary, /No verified evidence was available/)
  assert.ok(!generatedNames.includes('final_recommendation'))
  assert.ok(stages.includes('evidenceValidation'))
  assert.ok(stages.includes('recommendation'))
})

test('workflow stops with a cancellation error before provider calls', async () => {
  const workflow = createAnalysisWorkflow({
    isCancelled: () => true,
    services: {
      analyzeProjectContext: async () => {
        throw new Error('repository context should not run after cancellation')
      },
    },
  })

  await assert.rejects(() => workflow.invoke(initialWorkflowState()), /cancelled/i)
})

test('repository chat scopes always include the user and repository ownership fields', () => {
  assert.deepEqual(
    repositoryScope({ userId: 'u-1', repositoryId: 'r-1' }),
    { _id: 'r-1', userId: 'u-1' },
  )
  assert.deepEqual(
    conversationScope({ userId: 'u-1', repositoryId: 'r-1', conversationId: 'c-1' }),
    { _id: 'c-1', userId: 'u-1', repositoryId: 'r-1' },
  )
  assert.deepEqual(
    conversationListScope({ userId: 'u-1', repositoryId: 'r-1' }),
    { userId: 'u-1', repositoryId: 'r-1' },
  )
  assert.deepEqual(
    conversationDeleteScope({ userId: 'u-1', conversationId: 'c-1' }),
    { _id: 'c-1', userId: 'u-1' },
  )
})

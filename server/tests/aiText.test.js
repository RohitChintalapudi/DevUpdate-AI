import assert from 'node:assert/strict'
import test from 'node:test'

import {
  chunkText,
  contentHash,
  normalizeDocumentContent,
  redactSensitive,
  truncate,
} from '../utils/aiText.js'

test('contentHash is deterministic and changes with content', () => {
  assert.equal(contentHash('react'), contentHash('react'))
  assert.notEqual(contentHash('react'), contentHash('react-dom'))
  assert.match(contentHash('react'), /^[a-f0-9]{64}$/)
})

test('normalizeDocumentContent drops boilerplate but keeps technical lines', () => {
  const result = normalizeDocumentContent([
    'Cookie Policy',
    'React 19 removes the legacy root API.',
    '',
    '',
    'Sign in',
    'Migration requires createRoot from react-dom/client.',
  ].join('\n'))

  assert.doesNotMatch(result, /Cookie Policy/i)
  assert.doesNotMatch(result, /Sign in/i)
  assert.match(result, /React 19 removes the legacy root API/)
  assert.match(result, /Migration requires createRoot/)
  assert.doesNotMatch(result, /\n{3}/)
})

test('chunkText produces bounded, indexed chunks with stable hashes', () => {
  const paragraph = 'React 19 changes the root API. createRoot replaces ReactDOM.render. '.repeat(20)
  const chunks = chunkText(paragraph, { maxChars: 300, overlapChars: 40 })

  assert.ok(chunks.length > 1)
  assert.deepEqual(chunks.map((chunk) => chunk.index), chunks.map((_, index) => index))
  for (const chunk of chunks) {
    assert.ok(chunk.text.length <= 300)
    assert.equal(chunk.hash, contentHash(chunk.text))
  }
  assert.deepEqual(chunkText('   '), [])
})

test('truncate keeps short values and ellipsizes long ones', () => {
  assert.equal(truncate('short', 10), 'short')
  assert.equal(truncate('abcdefghij', 5), 'abcd…')
})

test('redactSensitive masks provider tokens and secret assignments', () => {
  const result = redactSensitive([
    'token ghp_abcdefghijklmnopqrstuvwxyz123456',
    'api_key=super-secret-value',
    'password: hunter2',
  ].join('\n'))

  assert.doesNotMatch(result, /ghp_abcdefghijklmnopqrstuvwxyz123456/)
  assert.doesNotMatch(result, /super-secret-value/)
  assert.doesNotMatch(result, /hunter2/)
  assert.match(result, /\[redacted-token\]/)
  assert.match(result, /api_key=\[redacted\]/)
})

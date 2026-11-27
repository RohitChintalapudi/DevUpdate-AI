import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAppearance } from './appearanceSettings.js'

test('appearance falls back to safe defaults for invalid values', () => {
  assert.deepEqual(normalizeAppearance(), { accent: 'sky', reduceMotion: false })
  assert.deepEqual(normalizeAppearance({ accent: 'unknown', reduceMotion: 'yes' }), {
    accent: 'sky',
    reduceMotion: true,
  })
})

test('appearance keeps supported accents and explicit reduce-motion choice', () => {
  assert.deepEqual(normalizeAppearance({ accent: 'violet', reduceMotion: true }), {
    accent: 'violet',
    reduceMotion: true,
  })
})

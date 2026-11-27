import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAppearance, resolveThemePreference } from './appearanceSettings.js'

test('appearance falls back to safe defaults for invalid values', () => {
  assert.deepEqual(normalizeAppearance(), { theme: 'daylight', accent: 'sky', reduceMotion: false })
  assert.deepEqual(normalizeAppearance({ theme: 'solarized', accent: 'unknown', reduceMotion: 'yes' }), {
    theme: 'daylight',
    accent: 'sky',
    reduceMotion: true,
  })
})

test('appearance keeps supported theme, accent and explicit reduce-motion choice', () => {
  assert.deepEqual(normalizeAppearance({ theme: 'midnight', accent: 'violet', reduceMotion: true }), {
    theme: 'midnight',
    accent: 'violet',
    reduceMotion: true,
  })
  assert.deepEqual(normalizeAppearance({ theme: 'system', accent: 'emerald' }), {
    theme: 'system',
    accent: 'emerald',
    reduceMotion: false,
  })
})

test('system preference resolves only for the system theme', () => {
  assert.equal(resolveThemePreference('system', true), 'midnight')
  assert.equal(resolveThemePreference('system', false), 'daylight')
  assert.equal(resolveThemePreference('midnight', false), 'midnight')
  assert.equal(resolveThemePreference('daylight', true), 'daylight')
  assert.equal(resolveThemePreference('unknown', true), 'daylight')
})

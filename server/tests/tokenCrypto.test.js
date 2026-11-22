import assert from 'node:assert/strict'
import test from 'node:test'

process.env.TOKEN_ENCRYPTION_KEY ||= 'a'.repeat(64)

const { decryptAccessToken, encryptAccessToken } = await import('../utils/tokenCrypto.js')

test('GitHub tokens are encrypted and can be decrypted with the same key', () => {
  const encrypted = encryptAccessToken('gho_testtoken123')
  assert.notEqual(encrypted.encrypted, 'gho_testtoken123')
  assert.equal(decryptAccessToken(encrypted), 'gho_testtoken123')
})

test('tampered token ciphertext is rejected', () => {
  const encrypted = encryptAccessToken('gho_testtoken123')
  encrypted.authTag = Buffer.from('tampered').toString('base64')
  assert.throws(() => decryptAccessToken(encrypted), /could not be decrypted|missing/i)
})

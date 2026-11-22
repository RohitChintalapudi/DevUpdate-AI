import crypto from 'node:crypto'
import { AppError } from './errors.js'

const ALGORITHM = 'aes-256-gcm'

function encryptionKey() {
  const configured = process.env.TOKEN_ENCRYPTION_KEY
  if (!configured) {
    throw new AppError('TOKEN_ENCRYPTION_KEY is not configured on the server.', 503)
  }
  const key = /^[a-f0-9]{64}$/i.test(configured)
    ? Buffer.from(configured, 'hex')
    : Buffer.from(configured, 'utf8')

  if (key.length !== 32) {
    throw new AppError('TOKEN_ENCRYPTION_KEY must be a 32-byte hex key.', 503)
  }
  return key
}

export function encryptAccessToken(token) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()])
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptAccessToken(accessToken) {
  if (!accessToken?.encrypted || !accessToken?.iv || !accessToken?.authTag) {
    throw new AppError('GitHub connection token is missing. Reconnect your account.', 401)
  }
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      Buffer.from(accessToken.iv, 'base64'),
    )
    decipher.setAuthTag(Buffer.from(accessToken.authTag, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(accessToken.encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new AppError('GitHub connection token could not be decrypted. Reconnect your account.', 401)
  }
}

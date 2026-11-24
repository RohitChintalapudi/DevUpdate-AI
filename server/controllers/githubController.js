import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import GitHubConnection from '../models/GitHubConnection.js'
import Repository from '../models/Repository.js'
import Dependency from '../models/Dependency.js'
import DependencyUpdate from '../models/DependencyUpdate.js'
import DependencyResearch from '../models/DependencyResearch.js'
import DiscoveredDependency from '../models/DiscoveredDependency.js'
import ScanJob from '../models/ScanJob.js'
import UpdateHistory from '../models/UpdateHistory.js'
import UpdateJob from '../models/UpdateJob.js'
import AIAnalysis from '../models/AIAnalysis.js'
import AIConversation from '../models/AIConversation.js'
import AIJob from '../models/AIJob.js'
import DependencyDecision from '../models/DependencyDecision.js'
import HistoricalComparison from '../models/HistoricalComparison.js'
import MemoryAudit from '../models/MemoryAudit.js'
import Notification from '../models/Notification.js'
import Report from '../models/Report.js'
import ResearchDocument from '../models/ResearchDocument.js'
import ProjectMemory from '../models/ProjectMemory.js'
import DocumentChunk from '../models/DocumentChunk.js'
import { asyncHandler } from '../utils/errors.js'
import { sanitizeText, sanitizeError, mapLimit } from '../utils/sanitize.js'
import { decryptAccessToken, encryptAccessToken } from '../utils/tokenCrypto.js'
import {
  assertGithubConfigured,
  exchangeCodeForToken,
  getAuthenticatedUser,
  getOAuthAuthorizeUrl,
  isGithubConfigured,
  validateGithubToken,
} from '../services/githubService.js'
import { syncRepositories } from '../services/repositoryService.js'
import { deleteRepositoryMemoryScope } from '../services/memory/memoryService.js'
import { deleteRepositoryNotifications } from '../services/notifications/notificationService.js'

const STATE_COOKIE = 'githubState'
const STATE_MAX_AGE = 10 * 60 * 1000

// A status check should never block on a full repository sync. We coalesce
// concurrent requests into one in-flight sync per user.
const syncingUsers = new Set()
const syncState = new Map()
const SYNC_RETRY_MS = 15_000

/**
 * A saved connection stays connected through temporary GitHub outages, but an
 * expired/revoked authorization is a real disconnect: the repository section
 * must show the user as disconnected and ask them to reconnect.
 */
export function resolveConnectionState({ connection, validation = { valid: true } } = {}) {
  const hasConnection = Boolean(connection) && connection.status !== 'DISCONNECTED'
  const expired =
    hasConnection &&
    (connection.status === 'EXPIRED' ||
      !connection.accessToken ||
      (validation.valid === false && validation.reason === 'EXPIRED'))
  const connected = hasConnection && !expired
  const status = expired ? 'EXPIRED' : connected ? 'CONNECTED' : connection?.status || 'NOT_CONNECTED'
  const tokenIssue = expired
    ? validation.reason === 'EXPIRED' || !connection.accessToken ? 'EXPIRED' : 'UNAVAILABLE'
    : connected && validation.valid === false
      ? validation.reason || 'UNAVAILABLE'
      : ''
  const tokenValid = connected && !tokenIssue

  let message = ''
  if (expired) {
    message = 'GitHub authorization expired. Reconnect to continue syncing repositories.'
  } else if (tokenIssue) {
    message = 'GitHub is temporarily unavailable. Your connection and repositories are saved.'
  }

  return { connected, status, message, tokenValid, tokenIssue }
}

function startBackgroundSync(userId) {
  const key = String(userId)
  if (syncingUsers.has(key)) return
  const state = syncState.get(key) || {}
  if (state.attemptedAt && Date.now() - state.attemptedAt < SYNC_RETRY_MS) return

  syncState.set(key, { ...state, attemptedAt: Date.now(), error: '' })
  syncingUsers.add(key)
  setImmediate(async () => {
    try {
      await syncRepositories(key)
      syncState.set(key, { error: '' })
    } catch (error) {
      const message = sanitizeError(error)
      syncState.set(key, { ...(syncState.get(key) || {}), error: message })
      console.warn('[github] Background repository sync failed:', message)
    } finally {
      syncingUsers.delete(key)
    }
  })
}

// Cleanup after disconnect is intentionally detached from the request. We keep
// the promise so a fast reconnect waits for the old data purge to finish.
const disconnectCleanups = new Map()

function trackCleanup(userId, task) {
  const key = String(userId)
  disconnectCleanups.set(key, task)
  const clear = () => {
    if (disconnectCleanups.get(key) === task) disconnectCleanups.delete(key)
  }
  task.then(clear, clear)
  return task
}

async function waitForCleanup(userId) {
  const task = disconnectCleanups.get(String(userId))
  if (task) await task.catch(() => null)
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: process.env.COOKIE_SAME_SITE === 'strict' ? 'strict' : 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: STATE_MAX_AGE,
  }
}

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

function resolveDefaultClientUrl() {
  return allowedOrigins[0] || 'http://localhost:5173'
}

function getSafeClientOrigin(candidate, req) {
  if (candidate && typeof candidate === 'string') {
    try {
      const parsed = new URL(candidate)
      const origin = parsed.origin
      if (allowedOrigins.includes(origin)) return origin
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return origin
      }
    } catch {
      // ignore
    }
  }

  const headerOrigin = req?.headers?.origin || req?.headers?.referer
  if (headerOrigin && typeof headerOrigin === 'string') {
    try {
      const parsed = new URL(headerOrigin)
      const origin = parsed.origin
      if (allowedOrigins.includes(origin)) return origin
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return origin
      }
    } catch {
      // ignore
    }
  }

  return resolveDefaultClientUrl()
}

function sanitizeReturnTo(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return '/dashboard/repositories'
  }
  return path
}

function redirectWith(status, message, clientOrigin, returnTo = '/dashboard/repositories') {
  const base = clientOrigin || resolveDefaultClientUrl()
  const targetPath = sanitizeReturnTo(returnTo)
  const url = new URL(targetPath, base)
  url.searchParams.set('github', status)
  url.searchParams.set('message', sanitizeText(message, 160))
  return url.toString()
}

export const connect = asyncHandler(async (req, res) => {
  assertGithubConfigured()
  const clientOrigin = getSafeClientOrigin(req.query.origin || req.body?.origin, req)
  const returnTo = sanitizeReturnTo(req.query.returnTo || req.body?.returnTo)

  const state = jwt.sign(
    {
      purpose: 'github-oauth',
      sub: req.user._id.toString(),
      origin: clientOrigin,
      returnTo,
      nonce: crypto.randomBytes(16).toString('hex'),
    },
    process.env.JWT_SECRET,
    { expiresIn: '10m' },
  )

  res.cookie(STATE_COOKIE, state, cookieOptions())
  res.json({
    success: true,
    url: getOAuthAuthorizeUrl(state),
    message: 'Redirecting to GitHub authorization.',
  })
})

export const callback = asyncHandler(async (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : ''
  const cookieState = typeof req.cookies?.[STATE_COOKIE] === 'string' ? req.cookies[STATE_COOKIE] : ''
  res.clearCookie(STATE_COOKIE, cookieOptions())

  let payload = null
  if (state) {
    try {
      payload = jwt.verify(state, process.env.JWT_SECRET)
    } catch {
      payload = null
    }
  }

  const clientOrigin = getSafeClientOrigin(payload?.origin, req)
  const returnTo = sanitizeReturnTo(payload?.returnTo)

  if (req.query.error) {
    return res.redirect(redirectWith('error', 'GitHub sign-in was cancelled or failed.', clientOrigin, returnTo))
  }

  // Validate state JWT payload
  if (
    !payload ||
    payload.purpose !== 'github-oauth' ||
    typeof payload.sub !== 'string' ||
    !payload.sub
  ) {
    return res.redirect(redirectWith('error', 'GitHub authorization state was invalid or expired.', clientOrigin, returnTo))
  }

  // Double-submit cookie verification when cookie is provided
  if (cookieState && state !== cookieState) {
    return res.redirect(redirectWith('error', 'GitHub authorization state was invalid or expired.', clientOrigin, returnTo))
  }

  const user = await User.findById(payload.sub)
  if (!user) {
    return res.redirect(redirectWith('error', 'Your DevUpdate AI session expired. Sign in again.', clientOrigin, returnTo))
  }

  try {
    const { accessToken, scope, tokenType } = await exchangeCodeForToken(req.query.code)
    const profile = await getAuthenticatedUser(accessToken)

    // If the user disconnected and immediately reconnected, let the old data
    // purge finish first so it cannot delete the fresh connection.
    await waitForCleanup(user._id)

    await GitHubConnection.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          githubUserId: profile.githubUserId,
          githubUsername: profile.githubUsername,
          avatarUrl: profile.avatarUrl,
          accessToken: encryptAccessToken(accessToken),
          scope,
          tokenType,
          connectedAt: new Date(),
          status: 'CONNECTED',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    await syncRepositories(user._id.toString())
    return res.redirect(redirectWith('connected', 'GitHub connected successfully.', clientOrigin, returnTo))
  } catch (error) {
    return res.redirect(redirectWith('error', error.message || 'Could not complete GitHub sign-in.', clientOrigin, returnTo))
  }
})

export const status = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const configured = isGithubConfigured()
  const connection = await GitHubConnection.findOne({ userId }).select(
    'githubUsername avatarUrl connectedAt status accessToken',
  )
  const repositoryCount = await Repository.countDocuments({ userId })

  let validation = { valid: true }
  if (connection && connection.status !== 'DISCONNECTED' && connection.accessToken) {
    try {
      validation = await validateGithubToken(decryptAccessToken(connection.accessToken))
    } catch (error) {
      // Local decrypt/validation problem must never disconnect the user. Log it
      // and treat it as a temporary GitHub availability issue.
      console.warn('[github] Could not validate stored token:', sanitizeError(error))
      validation = { valid: false, reason: 'UNAVAILABLE' }
    }
  }

  const state = resolveConnectionState({ connection, validation })

  // Persist the outcome. Expiry disconnects the user; other non-CONNECTED
  // statuses (for example FAILED) are restored so temporary errors do not.
  if (connection && state.status === 'EXPIRED' && connection.status !== 'EXPIRED') {
    await GitHubConnection.updateOne({ _id: connection._id }, { $set: { status: 'EXPIRED' } })
  } else if (connection && state.connected && connection.status !== 'CONNECTED') {
    await GitHubConnection.updateOne({ _id: connection._id }, { $set: { status: 'CONNECTED' } })
  }

  // Syncing is detached so this endpoint stays fast. The client keeps its
  // spinner up while `syncing` is true and polls again.
  if (state.connected && repositoryCount === 0) startBackgroundSync(userId)

  const syncInfo = syncState.get(String(userId)) || {}

  res.json({
    success: true,
    configured,
    connected: state.connected,
    status: state.status,
    message: state.message,
    tokenValid: state.tokenValid,
    tokenIssue: state.tokenIssue,
    syncing: syncingUsers.has(String(userId)),
    syncError: syncInfo.error || '',
    profile: connection
      ? {
          username: connection.githubUsername,
          avatarUrl: connection.avatarUrl,
          connectedAt: connection.connectedAt,
        }
      : null,
    repositoryCount: state.connected ? repositoryCount : 0,
  })
})

async function cleanupDisconnectedData(userId) {
  const repositories = await Repository.find({ userId }).select('_id').lean()
  const repositoryIds = repositories.map((repository) => repository._id)

  // Memento is a mirror, so local deletion is authoritative. Run the slow
  // per-repository scopes in parallel instead of one at a time.
  await mapLimit(repositoryIds, 6, async (repositoryId) => {
    try {
      await deleteRepositoryMemoryScope({ userId, repositoryId })
    } catch (error) {
      console.warn('[github] Memory cleanup failed for a repository:', sanitizeError(error))
    }
    try {
      await deleteRepositoryNotifications({ userId, repositoryId })
    } catch (error) {
      console.warn('[github] Notification cleanup failed for a repository:', sanitizeError(error))
    }
  })

  await Promise.all([
    ProjectMemory.deleteMany({ userId }),
    DocumentChunk.deleteMany({ userId }),
    GitHubConnection.deleteMany({ userId }),
    Dependency.deleteMany({ userId }),
    DependencyUpdate.deleteMany({ userId }),
    DependencyResearch.deleteMany({ userId }),
    DiscoveredDependency.deleteMany({ userId }),
    UpdateHistory.deleteMany({ userId }),
    ScanJob.deleteMany({ userId }),
    UpdateJob.deleteMany({ userId }),
    AIAnalysis.deleteMany({ userId }),
    AIJob.deleteMany({ userId }),
    AIConversation.deleteMany({ userId }),
    ResearchDocument.deleteMany({ userId }),
    DependencyDecision.deleteMany({ userId }),
    HistoricalComparison.deleteMany({ userId }),
    MemoryAudit.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    Report.deleteMany({ userId }),
    Repository.deleteMany({ userId }),
  ])
}

export const disconnect = asyncHandler(async (req, res) => {
  const userId = req.user._id

  // Cut off access immediately. Everything else happens after the response so
  // the user is not left waiting on dozens of collection deletes.
  await GitHubConnection.updateOne({ userId }, { $set: { status: 'DISCONNECTED' } })

  const cleanup = trackCleanup(userId, cleanupDisconnectedData(userId))
  setImmediate(() => {
    cleanup.catch((error) => {
      console.warn('[github] Background disconnect cleanup failed:', sanitizeError(error))
    })
  })

  res.status(202).json({
    success: true,
    message: 'GitHub disconnected. Local scan, AI, memory, report and notification data are being removed.',
  })
})

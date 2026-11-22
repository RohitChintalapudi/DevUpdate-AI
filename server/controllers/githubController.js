import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import GitHubConnection from '../models/GitHubConnection.js'
import Repository from '../models/Repository.js'
import Dependency from '../models/Dependency.js'
import DependencyUpdate from '../models/DependencyUpdate.js'
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
import { asyncHandler } from '../utils/errors.js'
import { sanitizeText } from '../utils/sanitize.js'
import { encryptAccessToken } from '../utils/tokenCrypto.js'
import {
  assertGithubConfigured,
  exchangeCodeForToken,
  getAuthenticatedUser,
  getOAuthAuthorizeUrl,
  isGithubConfigured,
} from '../services/githubService.js'
import { syncRepositories } from '../services/repositoryService.js'
import { deleteRepositoryMemoryScope } from '../services/memory/memoryService.js'
import { deleteRepositoryNotifications } from '../services/notifications/notificationService.js'
import { sanitizeError } from '../utils/sanitize.js'

const STATE_COOKIE = 'githubState'
const STATE_MAX_AGE = 10 * 60 * 1000

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
  let repositoryCount = await Repository.countDocuments({ userId })
  const isConnected = Boolean(connection && connection.status === 'CONNECTED')

  // Automatically ensure repositories are synced if connected and count is 0
  if (isConnected && repositoryCount === 0) {
    try {
      const syncResult = await syncRepositories(userId.toString())
      repositoryCount = syncResult.total || syncResult.synced || repositoryCount
    } catch (err) {
      console.warn('[github] Automatic sync during status check:', sanitizeError(err))
    }
  }

  res.json({
    success: true,
    configured,
    connected: isConnected,
    status: connection?.status || 'NOT_CONNECTED',
    profile: connection
      ? {
          username: connection.githubUsername,
          avatarUrl: connection.avatarUrl,
          connectedAt: connection.connectedAt,
        }
      : null,
    repositoryCount,
  })
})

export const disconnect = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const repositories = await Repository.find({ userId }).select('_id').lean()
  const repositoryIds = repositories.map((repository) => repository._id)

  // Memento is a mirror, so local deletion is authoritative even when the
  // remote endpoint is unavailable. Remote failures are logged, never surfaced
  // as a successful mirror deletion.
  for (const repositoryId of repositoryIds) {
    try {
      await deleteRepositoryMemoryScope({ userId, repositoryId })
      await deleteRepositoryNotifications({ userId, repositoryId })
    } catch (error) {
      console.warn('[github] Phase 5 cleanup failed for a repository:', sanitizeError(error))
    }
  }

  await Promise.all([
    GitHubConnection.deleteMany({ userId }),
    Dependency.deleteMany({ userId }),
    DependencyUpdate.deleteMany({ userId }),
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
  res.json({
    success: true,
    message: 'GitHub disconnected. Local scan, AI, memory, report and notification data were removed.',
  })
})

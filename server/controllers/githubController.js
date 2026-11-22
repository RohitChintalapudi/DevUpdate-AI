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
    path: '/api/github',
    maxAge: STATE_MAX_AGE,
  }
}

function redirectWith(status, message) {
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim()
  const url = new URL(base)
  url.searchParams.set('github', status)
  url.searchParams.set('message', sanitizeText(message, 160))
  return url.toString()
}

export const connect = asyncHandler(async (req, res) => {
  assertGithubConfigured()
  const state = jwt.sign(
    {
      purpose: 'github-oauth',
      sub: req.user._id.toString(),
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
  res.clearCookie(STATE_COOKIE, cookieOptions())
  if (req.query.error) {
    return res.redirect(redirectWith('error', 'GitHub sign-in was cancelled or failed.'))
  }

  const state = typeof req.query.state === 'string' ? req.query.state : ''
  const cookieState = typeof req.cookies?.[STATE_COOKIE] === 'string' ? req.cookies[STATE_COOKIE] : ''
  if (!state || !cookieState || state !== cookieState) {
    return res.redirect(redirectWith('error', 'GitHub authorization state was invalid or expired.'))
  }

  let payload
  try {
    payload = jwt.verify(state, process.env.JWT_SECRET)
  } catch {
    return res.redirect(redirectWith('error', 'GitHub authorization state was invalid or expired.'))
  }
  if (
    payload?.purpose !== 'github-oauth' ||
    typeof payload?.sub !== 'string' ||
    !payload.sub
  ) {
    return res.redirect(redirectWith('error', 'GitHub authorization state was invalid or expired.'))
  }

  const user = await User.findById(payload.sub)
  if (!user) {
    return res.redirect(redirectWith('error', 'Your DevUpdate AI session expired. Sign in again.'))
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
    return res.redirect(redirectWith('connected', 'GitHub connected successfully.'))
  } catch (error) {
    return res.redirect(redirectWith('error', error.message || 'Could not complete GitHub sign-in.'))
  }
})

export const status = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const configured = isGithubConfigured()
  const connection = await GitHubConnection.findOne({ userId }).select(
    'githubUsername avatarUrl connectedAt status',
  )
  const repositoryCount = await Repository.countDocuments({ userId })

  res.json({
    success: true,
    configured,
    connected: Boolean(connection && connection.status === 'CONNECTED'),
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

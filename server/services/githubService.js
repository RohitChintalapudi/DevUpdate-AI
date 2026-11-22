import { Octokit } from 'octokit'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/errors.js'
import { sanitizeText, mapLimit, withTimeout } from '../utils/sanitize.js'
import {
  IGNORED_PATH_SEGMENTS,
  MAX_CONCURRENT_REQUESTS,
  MAX_TREE_DEPTH,
  MAX_TREE_ENTRIES,
  GITHUB_REQUEST_TIMEOUT_MS,
} from '../constants/manifests.js'

const tokenCache = new Map()

function config() {
  return {
    appId: process.env.GITHUB_APP_ID,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    privateKey: process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    slug: process.env.GITHUB_APP_SLUG,
  }
}

export function isGithubConfigured() {
  const { appId, clientId, privateKey, slug } = config()
  return Boolean(appId && clientId && privateKey && slug)
}

export function assertGithubConfigured() {
  if (!isGithubConfigured()) {
    throw new AppError(
      'GitHub integration is not configured. Set GITHUB_APP_ID, GITHUB_CLIENT_ID, GITHUB_PRIVATE_KEY and GITHUB_APP_SLUG on the server.',
      503,
    )
  }
}

export function getInstallUrl(state) {
  assertGithubConfigured()
  const { slug } = config()
  return `https://github.com/apps/${encodeURIComponent(slug)}/installations/new?state=${encodeURIComponent(state)}`
}

function appJwt() {
  const { appId, privateKey } = config()
  if (!appId || !privateKey) throw new AppError('GitHub App credentials are missing.', 503)
  return jwt.sign({}, privateKey, {
    algorithm: 'RS256',
    issuer: appId,
    expiresIn: '9m',
  })
}

function appOctokit() {
  return new Octokit({
    auth: appJwt(),
    request: { timeout: GITHUB_REQUEST_TIMEOUT_MS },
  })
}

function translateGithubError(error) {
  const status = error?.status
  if (status === 403 || status === 429) {
    const remaining = error?.response?.headers?.['x-ratelimit-remaining']
    if (remaining === '0' || /rate limit/i.test(error?.message || '')) {
      throw new AppError('GitHub API rate limit reached. Please try again later.', 429)
    }
    throw new AppError('GitHub denied access. Check the App installation permissions.', 403)
  }
  if (status === 401) throw new AppError('GitHub authorization expired. Reconnect your account.', 401)
  if (status === 404) throw new AppError('GitHub resource not found or access was revoked.', 404)
  throw error
}

async function installationOctokit(installationId) {
  if (!Number.isInteger(Number(installationId))) throw new AppError('Invalid installation id.', 400)
  const cached = tokenCache.get(installationId)
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return new Octokit({ auth: cached.token, request: { timeout: GITHUB_REQUEST_TIMEOUT_MS } })
  }

  try {
    const octokit = appOctokit()
    const { data } = await withTimeout(
      octokit.apps.createInstallationAccessToken({ installation_id: Number(installationId) }),
      GITHUB_REQUEST_TIMEOUT_MS,
      'Timed out creating a GitHub installation token',
    )
    tokenCache.set(installationId, {
      token: data.token,
      expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : Date.now() + 50 * 60_000,
    })
    return new Octokit({ auth: data.token, request: { timeout: GITHUB_REQUEST_TIMEOUT_MS } })
  } catch (error) {
    translateGithubError(error)
    throw error
  }
}

export async function getInstallationDetails(installationId) {
  assertGithubConfigured()
  try {
    const octokit = appOctokit()
    const { data } = await withTimeout(
      octokit.apps.getInstallation({ installation_id: Number(installationId) }),
      GITHUB_REQUEST_TIMEOUT_MS,
      'Timed out reading GitHub installation',
    )
    return {
      installationId: data.id,
      githubUserId: data.account?.id || null,
      githubUsername: sanitizeText(data.account?.login || 'github-user', 100),
      avatarUrl: sanitizeText(data.account?.avatar_url || '', 500),
      accountType: data.account?.type || 'User',
    }
  } catch (error) {
    translateGithubError(error)
    throw error
  }
}

export async function listAccessibleRepositories(installationId) {
  const octokit = await installationOctokit(installationId)
  try {
    const repositories = await withTimeout(
      octokit.paginate(octokit.apps.listReposAccessibleToInstallation, { per_page: 100 }),
      GITHUB_REQUEST_TIMEOUT_MS * 2,
      'Timed out listing GitHub repositories',
    )
    return repositories.map((repo) => normalizeRepository(repo))
  } catch (error) {
    translateGithubError(error)
    throw error
  }
}

function normalizeRepository(repo) {
  return {
    githubRepositoryId: repo.id,
    owner: sanitizeText(repo.owner?.login || '', 150),
    name: sanitizeText(repo.name || '', 150),
    fullName: sanitizeText(repo.full_name || '', 300),
    description: sanitizeText(repo.description || '', 500),
    htmlUrl: sanitizeText(repo.html_url || '', 500),
    defaultBranch: sanitizeText(repo.default_branch || 'main', 150),
    language: sanitizeText(repo.language || '', 60),
    visibility: repo.private ? 'private' : 'public',
    stars: Number(repo.stargazers_count) || 0,
    lastUpdated: repo.updated_at ? new Date(repo.updated_at) : null,
  }
}

export async function getRepositoryMetadata(installationId, owner, repo) {
  const octokit = await installationOctokit(installationId)
  try {
    const { data } = await withTimeout(
      octokit.repos.get({ owner, repo }),
      GITHUB_REQUEST_TIMEOUT_MS,
      'Timed out reading repository metadata',
    )
    return normalizeRepository(data)
  } catch (error) {
    translateGithubError(error)
    throw error
  }
}

function isIgnoredPath(path) {
  return String(path || '')
    .split('/')
    .some((segment) => IGNORED_PATH_SEGMENTS.has(segment))
}

function relevantBlobs(entries) {
  return entries
    .filter((entry) => entry.type === 'blob' && entry.path && !isIgnoredPath(entry.path))
    .map((entry) => ({
      path: entry.path,
      sha: entry.sha,
      size: Number(entry.size) || 0,
    }))
}

async function fetchTreeWithoutTruncation(octokit, owner, repo, ref) {
  const collected = []
  const seen = new Set()
  let queue = [{ sha: ref, path: '', depth: 0 }]
  let directoryCount = 0

  while (queue.length && collected.length < MAX_TREE_ENTRIES) {
    const batch = queue
    queue = []
    const results = await mapLimit(batch, MAX_CONCURRENT_REQUESTS, async (node) => {
      if (node.depth > MAX_TREE_DEPTH) return []
      const { data } = await octokit.git.getTree({ owner, repo, tree_sha: node.sha })
      const blobs = relevantBlobs(data.tree).map((blob) => ({
        ...blob,
        path: node.path ? `${node.path}/${blob.path}` : blob.path,
      }))
      const directories = data.tree
        .filter((entry) => entry.type === 'tree' && entry.path && !isIgnoredPath(entry.path))
        .map((entry) => ({
          sha: entry.sha,
          path: node.path ? `${node.path}/${entry.path}` : entry.path,
          depth: node.depth + 1,
        }))
      return { blobs, directories }
    })

    for (const result of results) {
      for (const blob of result.blobs) {
        if (!seen.has(blob.path) && collected.length < MAX_TREE_ENTRIES) {
          seen.add(blob.path)
          collected.push(blob)
        }
      }
      for (const directory of result.directories) {
        if (directoryCount < 1500) {
          directoryCount += 1
          queue.push(directory)
        }
      }
    }
  }

  return collected
}

export async function getRepositoryTree(installationId, owner, repo, ref) {
  const octokit = await installationOctokit(installationId)
  try {
    const { data } = await withTimeout(
      octokit.git.getTree({ owner, repo, tree_sha: ref, recursive: '1' }),
      GITHUB_REQUEST_TIMEOUT_MS * 2,
      'Timed out reading repository tree',
    )

    if (!data.truncated) {
      return { files: relevantBlobs(data.tree), truncated: false, branch: ref }
    }

    // GitHub truncates very large recursive trees. Walk directories explicitly
    // instead of trusting partial results, while skipping generated folders.
    const files = await fetchTreeWithoutTruncation(octokit, owner, repo, ref)
    return { files, truncated: true, branch: ref }
  } catch (error) {
    translateGithubError(error)
    throw error
  }
}

export async function getFileContent(installationId, owner, repo, path, ref) {
  const octokit = await installationOctokit(installationId)
  try {
    const { data } = await withTimeout(
      octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
        mediaType: { format: 'raw' },
      }),
      GITHUB_REQUEST_TIMEOUT_MS,
      'Timed out reading manifest file',
    )
    if (typeof data === 'string') return data
    if (data?.content && typeof data.content === 'string') {
      return Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf8')
    }
    return ''
  } catch (error) {
    if (error?.status === 404) return null
    translateGithubError(error)
    throw error
  }
}

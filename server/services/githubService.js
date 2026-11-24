import crypto from 'node:crypto'
import { Octokit } from 'octokit'
import { AppError } from '../utils/errors.js'
import { sanitizeText, mapLimit, withTimeout } from '../utils/sanitize.js'
import {
  IGNORED_PATH_SEGMENTS,
  MAX_CONCURRENT_REQUESTS,
  MAX_TREE_DEPTH,
  MAX_TREE_ENTRIES,
  GITHUB_REQUEST_TIMEOUT_MS,
  GRAPHQL_BATCH_SIZE,
} from '../constants/manifests.js'

function config() {
  return {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/github/callback',
    scopes: process.env.GITHUB_OAUTH_SCOPES || 'repo read:user user:email read:org',
  }
}

export function isGithubConfigured() {
  const { clientId, clientSecret } = config()
  return Boolean(clientId && clientSecret)
}

export function assertGithubConfigured() {
  if (!isGithubConfigured()) {
    throw new AppError(
      'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and GITHUB_CALLBACK_URL on the server.',
      503,
    )
  }
}

export function getOAuthAuthorizeUrl(state) {
  assertGithubConfigured()
  const { clientId, callbackUrl, scopes } = config()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: scopes,
    state,
    allow_signup: 'true',
    // Force GitHub's authorization screen so every connect/reconnect issues a
    // fresh grant with the current scopes instead of silently reusing an old one.
    prompt: 'consent',
  })
  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

function translateGithubError(error) {
  const status = error?.status
  if (status === 403 || status === 429) {
    const remaining = error?.response?.headers?.['x-ratelimit-remaining']
    if (remaining === '0' || /rate limit/i.test(error?.message || '')) {
      throw new AppError('GitHub API rate limit reached. Please try again later.', 429)
    }
    throw new AppError('GitHub denied access. Check that your account granted the required repository access.', 403)
  }
  if (status === 401) {
    throw new AppError('GitHub authorization expired. Sign in with GitHub again.', 401)
  }
  if (status === 404) {
    throw new AppError('GitHub resource not found or access was revoked.', 404)
  }
  throw error
}

export async function exchangeCodeForToken(code) {
  assertGithubConfigured()
  if (typeof code !== 'string' || !code || code.length > 500) {
    throw new AppError('GitHub did not return a valid authorization code.', 400)
  }

  const { clientId, clientSecret, callbackUrl } = config()
  let response
  try {
    response = await withTimeout(
      fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callbackUrl,
        }),
      }),
      GITHUB_REQUEST_TIMEOUT_MS,
      'Timed out exchanging the GitHub authorization code',
    )
  } catch (error) {
    translateGithubError(error)
    throw error
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new AppError('GitHub returned an invalid token response.', 502)
  }

  if (!response.ok || payload?.error) {
    const reason = sanitizeText(
      payload?.error_description || payload?.error || 'GitHub rejected the authorization code.',
      200,
    )
    throw new AppError(`GitHub authorization failed: ${reason}`, 401)
  }
  if (!payload?.access_token) {
    throw new AppError('GitHub did not return an access token.', 502)
  }

  return {
    accessToken: payload.access_token,
    scope: sanitizeText(payload.scope || config().scopes, 300),
    tokenType: sanitizeText(payload.token_type || 'bearer', 30),
  }
}

function octokitFor(accessToken) {
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new AppError('GitHub is not connected.', 401)
  }
  const client = new Octokit({
    auth: accessToken,
    request: { timeout: GITHUB_REQUEST_TIMEOUT_MS },
  })
  if (client.rest) {
    client.users = client.rest.users
    client.repos = client.rest.repos
    client.git = client.rest.git
  }
  return client
}

export async function getAuthenticatedUser(accessToken) {
  const octokit = octokitFor(accessToken)
  const restUsers = octokit.rest?.users || octokit.users
  try {
    let data
    if (restUsers?.getAuthenticated) {
      const response = await withTimeout(
        restUsers.getAuthenticated(),
        GITHUB_REQUEST_TIMEOUT_MS,
        'Timed out reading the GitHub profile',
      )
      data = response.data
    } else if (typeof octokit.request === 'function') {
      const response = await withTimeout(
        octokit.request('GET /user'),
        GITHUB_REQUEST_TIMEOUT_MS,
        'Timed out reading the GitHub profile',
      )
      data = response.data
    } else {
      const res = await withTimeout(
        fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'DevUpdate-AI-App',
          },
        }),
        GITHUB_REQUEST_TIMEOUT_MS,
        'Timed out reading the GitHub profile',
      )
      if (!res.ok) {
        throw new AppError(`GitHub user profile request failed with status ${res.status}`, res.status)
      }
      data = await res.json()
    }
    return {
      githubUserId: data.id,
      githubUsername: sanitizeText(data.login || 'github-user', 100),
      avatarUrl: sanitizeText(data.avatar_url || '', 500),
    }
  } catch (error) {
    translateGithubError(error)
    throw error
  }
}

// Token validation is cached briefly so repeated status checks do not hammer
// GitHub. An expired/revoked token disconnects the user; temporary outages do not.
const tokenValidationCache = new Map()
const TOKEN_VALIDATION_TTL_MS = 60_000

export async function validateGithubToken(accessToken) {
  if (typeof accessToken !== 'string' || !accessToken) return { valid: false, reason: 'NO_TOKEN' }
  const key = crypto.createHash('sha256').update(accessToken).digest('hex')
  const cached = tokenValidationCache.get(key)
  if (cached && Date.now() - cached.at < TOKEN_VALIDATION_TTL_MS) return cached.result

  let result
  try {
    await getAuthenticatedUser(accessToken)
    result = { valid: true }
  } catch (error) {
    result = {
      valid: false,
      reason: error?.statusCode === 401 || error?.status === 401 ? 'EXPIRED' : 'UNAVAILABLE',
      message: sanitizeText(error?.message || 'GitHub token validation failed.', 200),
    }
  }

  if (tokenValidationCache.size > 500) tokenValidationCache.clear()
  tokenValidationCache.set(key, { result, at: Date.now() })
  return result
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

export async function listAccessibleRepositories(accessToken) {
  const octokit = octokitFor(accessToken)
  const listFn =
    octokit.rest?.repos?.listForAuthenticatedUser ||
    octokit.repos?.listForAuthenticatedUser ||
    'GET /user/repos'
  try {
    const repositories = await withTimeout(
      octokit.paginate(listFn, {
        visibility: 'all',
        affiliation: 'owner,collaborator,organization_member',
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      }),
      GITHUB_REQUEST_TIMEOUT_MS * 2,
      'Timed out listing GitHub repositories',
    )
    return repositories.map((repo) => normalizeRepository(repo))
  } catch (error) {
    translateGithubError(error)
    throw error
  }
}

export async function getRepositoryMetadata(accessToken, owner, repo) {
  const octokit = octokitFor(accessToken)
  const getFn = octokit.rest?.repos?.get || octokit.repos?.get
  try {
    const { data } = await withTimeout(
      getFn
        ? getFn({ owner, repo })
        : octokit.request('GET /repos/{owner}/{repo}', { owner, repo }),
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
  const rest = octokit.rest || octokit
  const collected = []
  const seen = new Set()
  let queue = [{ sha: ref, path: '', depth: 0 }]
  let directoryCount = 0

  while (queue.length && collected.length < MAX_TREE_ENTRIES && directoryCount < 200) {
    const batch = queue.splice(0, MAX_CONCURRENT_REQUESTS)
    const results = await mapLimit(batch, MAX_CONCURRENT_REQUESTS, async (node) => {
      if (node.depth > MAX_TREE_DEPTH) return { blobs: [], directories: [] }
      try {
        const { data } = await withTimeout(
          rest.git.getTree({ owner, repo, tree_sha: node.sha }),
          GITHUB_REQUEST_TIMEOUT_MS,
          'Directory tree fetch timeout',
        )
        const blobs = relevantBlobs(data.tree).map((blob) => ({
          ...blob,
          path: node.path ? `${node.path}/${blob.path}` : blob.path,
        }))
        const directories = data.tree
          .filter((entry) => entry.type === 'tree' && entry.path && !isIgnoredPath(entry.path) && node.depth < MAX_TREE_DEPTH)
          .map((entry) => ({
            sha: entry.sha,
            path: node.path ? `${node.path}/${entry.path}` : entry.path,
            depth: node.depth + 1,
          }))
        return { blobs, directories }
      } catch {
        return { blobs: [], directories: [] }
      }
    })

    for (const result of results) {
      for (const blob of result.blobs) {
        if (!seen.has(blob.path) && collected.length < MAX_TREE_ENTRIES) {
          seen.add(blob.path)
          collected.push(blob)
        }
      }
      for (const directory of result.directories) {
        if (directoryCount < 200) {
          directoryCount += 1
          queue.push(directory)
        }
      }
    }
  }

  return collected
}

export async function getRepositoryTree(accessToken, owner, repo, ref) {
  const octokit = octokitFor(accessToken)
  const gitApi = octokit.rest?.git || octokit.git
  try {
    const { data } = await withTimeout(
      gitApi?.getTree
        ? gitApi.getTree({ owner, repo, tree_sha: ref, recursive: '1' })
        : octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1', {
            owner,
            repo,
            tree_sha: ref,
          }),
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

export async function getFileContent(accessToken, owner, repo, path, ref) {
  const octokit = octokitFor(accessToken)
  const reposApi = octokit.rest?.repos || octokit.repos
  try {
    const { data } = await withTimeout(
      reposApi?.getContent
        ? reposApi.getContent({
            owner,
            repo,
            path,
            ref,
            mediaType: { format: 'raw' },
          })
        : octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path,
            ref,
            headers: { Accept: 'application/vnd.github.raw' },
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

/**
 * Fetch many manifest files in a handful of GraphQL requests instead of one
 * REST request per file. Each file is an aliased `object(expression: "<ref>:<path>")`
 * lookup. Files GitHub cannot return as text are simply omitted so the caller
 * can fall back to the REST content API for those paths.
 */
export async function fetchFilesContentGraphql(accessToken, owner, repo, files, ref) {
  const contents = new Map()
  if (!Array.isArray(files) || !files.length) return contents
  const safeRef = String(ref || 'HEAD').replace(/[\r\n]/g, '')

  for (let offset = 0; offset < files.length; offset += GRAPHQL_BATCH_SIZE) {
    const batch = files.slice(offset, offset + GRAPHQL_BATCH_SIZE)
    const fields = batch
      .map((file, index) => {
        const expression = JSON.stringify(`${safeRef}:${file.path}`)
        return `f${index}: object(expression: ${expression}) { ... on Blob { text } }`
      })
      .join('\n')
    const query = `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        ${fields}
      }
    }`

    let payload
    try {
      const response = await withTimeout(
        fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'DevUpdate-AI-App',
          },
          body: JSON.stringify({ query, variables: { owner, name: repo } }),
        }),
        GITHUB_REQUEST_TIMEOUT_MS,
        'Timed out batching manifest reads from GitHub',
      )
      payload = await response.json()
    } catch {
      // Return whatever was fetched so far; scanService falls back per file.
      return contents
    }

    const repository = payload?.data?.repository
    if (!repository) return contents
    batch.forEach((file, index) => {
      const text = repository[`f${index}`]?.text
      if (typeof text === 'string') contents.set(file.path, text)
    })
  }

  return contents
}

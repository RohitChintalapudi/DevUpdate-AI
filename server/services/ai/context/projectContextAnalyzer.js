import GitHubConnection from '../../../models/GitHubConnection.js'
import Repository from '../../../models/Repository.js'
import { AppError } from '../../../utils/errors.js'
import { mapLimit, sanitizeError, sanitizeText } from '../../../utils/sanitize.js'
import { AI_LIMITS } from '../../../constants/aiConstants.js'
import { getRepositoryTree, getFileContent } from '../../githubService.js'
import { decryptAccessToken } from '../../../utils/tokenCrypto.js'
import { matchManifest } from '../../../constants/manifests.js'
import { redactSensitive, truncate } from '../../../utils/aiText.js'

const SOURCE_EXTENSIONS = /\.(js|jsx|ts|tsx|mjs|cjs|py|java|kt|kts|rs|php|rb|go|cs|vue|svelte|html|json|ya?ml|toml|config|props)$/i
const CONFIG_NAMES = /(^|\/)(vite|webpack|rollup|babel|jest|vitest|next|nuxt|tsconfig|eslint|prettier|dockerfile|makefile|settings|application|appsettings|pyproject|setup|tox|pytest|karma|playwright|cypress)/i
const TEST_PATH = /(^|\/)(test|tests|spec|specs|__tests__|e2e)(\/|$)|(^|\/)[^/]+\.(test|spec)\./i
const ENTRY_PATH = /(^|\/)(src|app|server|lib|pages|components|hooks|routes|middleware|index|main)(\/|$)/i

function packageTokens(packageName) {
  return String(packageName || '')
    .replace(/^@/, '')
    .split(/[/@._-]+/)
    .filter((token) => token.length >= 3)
    .map((token) => token.toLowerCase())
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function importPatterns(packageName, ecosystem) {
  const name = String(packageName || '')
  const escaped = escapeRegExp(name)
  const base = packageTokens(packageName).pop() || name
  const escapedBase = escapeRegExp(base)
  const pythonName = escapedBase.replace(/-/g, '[_\\-]')

  switch (String(ecosystem || '').toLowerCase()) {
    case 'npm':
    case 'javascript':
    case 'typescript':
      return [new RegExp(`(import[\\s\\S]{0,160}from\\s+['"]${escaped}(?:\\/[^'"]*)?['"]|require\\(\\s*['"]${escaped}(?:\\/[^'"]*)?['"]|import\\(\\s*['"]${escaped}(?:\\/[^'"]*)?['"]|from\\s+['"]${escaped}(?:\\/[^'"]*)?['"])`, 'gi')]
    case 'pypi':
    case 'python':
      return [new RegExp(`(import\\s+${pythonName}\\b|from\\s+${pythonName}\\b|from\\s+[\\w.]+\\s+import\\s+${pythonName}\\b)`, 'gi')]
    case 'maven':
    case 'gradle':
      return [new RegExp(`import\\s+[^\\n;]*${escapedBase}[^\\n;]*;`, 'gi')]
    case 'crates':
    case 'cargo':
      return [new RegExp(`(use\\s+${escapedBase}\\b|extern\\s+crate\\s+${escapedBase}\\b)`, 'gi')]
    case 'go':
      return [new RegExp(`"[^"\\n]*${escaped}(?:\\/[^"\\n]*)?"`, 'gi')]
    case 'packagist':
    case 'composer':
      return [new RegExp(`(use\\s+[^\\n;]*${escapedBase}[^\\n;]*;|require(?:_once)?\\s*\\([^)]*${escaped}`, 'gi')]
    case 'rubygems':
    case 'ruby':
      return [new RegExp(`(require(?:_relative)?\\s+['"]${escapedBase}|gem\\s+['"]${escapedBase})`, 'gi')]
    case 'nuget':
    case '.net':
    case 'dotnet':
      return [new RegExp(`using\\s+[^\\n;]*${escapedBase}[^\\n;]*;`, 'gi')]
    default:
      return [new RegExp(`\\b${escapedBase}\\b`, 'gi')]
  }
}

function scoreFile(file, tokens, ecosystem) {
  const path = String(file.path || '')
  const lower = path.toLowerCase()
  let score = 0
  const manifest = matchManifest(path)
  if (manifest) score += 60
  if (CONFIG_NAMES.test(lower)) score += 35
  if (TEST_PATH.test(lower)) score += 18
  if (ENTRY_PATH.test(lower)) score += 14
  if (tokens.some((token) => lower.includes(token))) score += 30
  if (ecosystem === 'npm' && /package(-lock|lock)?\.json|yarn\.lock|pnpm-lock\.yaml/.test(lower)) score += 20
  if (SOURCE_EXTENSIONS.test(lower)) score += 8
  return score
}

function extractSnippets(content, patterns, maxSnippets = 3) {
  const snippets = []
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) && snippets.length < maxSnippets) {
      const start = Math.max(0, match.index - 160)
      const end = Math.min(content.length, match.index + Math.min(500, match[0].length + 260))
      const snippet = redactSensitive(truncate(content.slice(start, end).replace(/\s+/g, ' '), 500))
      if (snippet && !snippets.includes(snippet)) snippets.push(snippet)
    }
    pattern.lastIndex = 0
  }
  return snippets
}

async function ownedRepository(userId, repositoryId) {
  if (!repositoryId) throw new AppError('A repository is required for project context analysis.', 400)
  const repository = await Repository.findOne({ _id: repositoryId, userId })
  if (!repository) throw new AppError('Repository not found.', 404)
  return repository
}

export async function analyzeProjectContext({
  userId,
  repositoryId,
  packageName,
  ecosystem,
  dependencyId = null,
  onProgress = () => {},
}) {
  const repository = await ownedRepository(userId, repositoryId)
  const connection = await GitHubConnection.findOne({ userId, status: 'CONNECTED' })
  if (!connection) {
    return {
      status: 'UNAVAILABLE',
      repository: repository.fullName,
      branch: repository.branch || repository.defaultBranch,
      files: [],
      limitations: ['GitHub is not connected, so repository files could not be retrieved.'],
    }
  }

  const accessToken = decryptAccessToken(connection.accessToken)
  const branch = repository.branch || repository.defaultBranch
  const tree = await getRepositoryTree(accessToken, repository.owner, repository.name, branch)
  const tokens = packageTokens(packageName)
  const patterns = importPatterns(packageName, ecosystem)

  const candidates = tree.files
    .filter((file) => file.size <= AI_LIMITS.maxContextFileBytes && SOURCE_EXTENSIONS.test(file.path))
    .map((file) => ({ ...file, score: scoreFile(file, tokens, ecosystem) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, AI_LIMITS.maxContextFiles * 2)

  if (!candidates.length) {
    return {
      status: 'LIMITED',
      repository: repository.fullName,
      branch,
      files: [],
      limitations: ['No small, relevant source files were found in the repository tree.'],
    }
  }

  const limitations = []
  if (tree.truncated) limitations.push('GitHub returned a truncated tree; only a bounded relevant subset was analyzed.')
  const files = []
  let totalBytes = 0

  const fetched = await mapLimit(candidates, 5, async (file) => {
    try {
      const content = await getFileContent(accessToken, repository.owner, repository.name, file.path, branch)
      return { file, content: typeof content === 'string' ? content : '' }
    } catch (error) {
      return { file, content: '', error: sanitizeError(error) }
    }
  })

  for (const item of fetched) {
    if (files.length >= AI_LIMITS.maxContextFiles || totalBytes >= AI_LIMITS.maxContextBytes) break
    if (!item.content || item.content.length > AI_LIMITS.maxContextFileBytes) continue

    const manifest = matchManifest(item.file.path)
    const snippets = extractSnippets(item.content, patterns)
    let reason = ''
    if (manifest) reason = `Manifest/configuration for ${manifest.ecosystem}`
    else if (snippets.length) reason = `Retrieved code references ${packageName}`
    else if (CONFIG_NAMES.test(item.file.path)) reason = 'Potentially relevant build or framework configuration'
    else if (TEST_PATH.test(item.file.path)) reason = 'Potentially relevant test file'
    else if (ENTRY_PATH.test(item.file.path)) reason = 'Common application entry/source location'
    if (!reason) continue

    const safeSnippets = snippets.length
      ? snippets
      : [redactSensitive(truncate(item.content.replace(/\s+/g, ' '), 240))]
    const fileRecord = {
      path: item.file.path,
      reason,
      imports: snippets.length ? [packageName] : [],
      snippets: safeSnippets.slice(0, 3),
      dependencyId,
    }
    totalBytes += fileRecord.snippets.join('').length + item.file.path.length
    files.push(fileRecord)
    await onProgress({ analyzedFiles: files.length, totalFiles: candidates.length })
  }

  if (!files.length) limitations.push('No retrieved file contained a detectable usage, manifest or configuration reference.')
  if (totalBytes >= AI_LIMITS.maxContextBytes) limitations.push('Context size limit reached; additional files were not retrieved.')

  return {
    status: files.length ? 'AVAILABLE' : 'LIMITED',
    repository: repository.fullName,
    repositoryId: String(repository._id),
    branch,
    packageName: sanitizeText(packageName, 214),
    ecosystem: sanitizeText(ecosystem, 40),
    files,
    limitations,
  }
}

export function dependencyUsageSummary(context) {
  const files = context?.files || []
  return {
    files: files.length,
    importingFiles: files.filter((file) => (file.imports || []).length).length,
    paths: files.map((file) => file.path),
  }
}

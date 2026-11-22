import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { MEMENTO_CAPABILITIES, PHASE5_LIMITS } from '../../constants/phase5Constants.js'
import { sanitizeError, sanitizeText, withTimeout } from '../../utils/sanitize.js'

const DEFAULT_MEMENTO_URL = 'https://api.mementoagi.com/mcp'
const TOOL_DISCOVERY_TTL_MS = 5 * 60 * 1000

// These names are only used to classify tools returned by tools/list. No tool
// is called unless the remote server advertises it and its schema is satisfied.
const TOOL_NAME_HINTS = {
  search: ['full-search', 'search', 'search-memory', 'search_memory', 'recall', 'find-memories', 'query-memory'],
  store: ['remember', 'write-node', 'write_node', 'remember-node', 'create-node', 'create-memory', 'add-memory'],
  update: ['update-node', 'update_node', 'update-memory', 'edit-node', 'modify-memory'],
  delete: ['delete-node', 'delete_node', 'delete-memory', 'forget-memory', 'forget'],
  retrieveById: ['get-node', 'read-node', 'get-memory', 'read-memory'],
}

let discovery = {
  at: 0,
  tools: [],
  capabilities: {},
  error: '',
}

export function isMementoConfigured() {
  return Boolean(process.env.MEMENTO_API_KEY && process.env.MEMENTO_API_KEY.trim())
}

function endpoint() {
  return process.env.MEMENTO_MCP_URL || DEFAULT_MEMENTO_URL
}

function assertSafeEndpoint() {
  let url
  try {
    url = new URL(endpoint())
  } catch {
    throw new Error('MEMENTO_MCP_URL must be a valid URL.')
  }
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')) {
    throw new Error('MEMENTO_MCP_URL must use HTTPS outside local development.')
  }
  return url
}

function stableToolName(name) {
  return String(name || '').toLowerCase().replace(/[\s_]+/g, '-')
}

function classifyTool(tool) {
  const name = stableToolName(tool.name)
  for (const capability of MEMENTO_CAPABILITIES) {
    if (TOOL_NAME_HINTS[capability].some((hint) => name === hint || name.includes(hint))) return capability
  }
  return null
}

function candidateBag(candidates = {}) {
  const bag = {}
  const assign = (key, value) => {
    if (value !== undefined && value !== null && value !== '') bag[key] = value
  }
  for (const [key, value] of Object.entries(candidates)) assign(key, value)
  return bag
}

function buildArguments(tool, candidates) {
  const properties = tool?.inputSchema?.properties || {}
  const required = tool?.inputSchema?.required || []
  const bag = candidateBag(candidates)
  const args = {}

  for (const key of Object.keys(properties)) {
    if (Object.prototype.hasOwnProperty.call(bag, key)) args[key] = bag[key]
  }

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(args, key)) return null
  }
  return args
}

function extractText(result) {
  if (result?.structuredContent !== undefined) return result.structuredContent
  const parts = (result?.content || [])
    .map((item) => (item?.type === 'text' ? item.text : ''))
    .filter(Boolean)
  if (!parts.length) return null
  const joined = parts.join('\n')
  try {
    return JSON.parse(joined)
  } catch {
    return joined
  }
}

async function withClient(work) {
  const url = assertSafeEndpoint()
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${process.env.MEMENTO_API_KEY.trim()}`,
      },
    },
  })
  const client = new Client({ name: 'devupdate-ai', version: '5.0.0' })
  await client.connect(transport)
  try {
    return await work(client)
  } finally {
    try {
      await client.close()
    } catch {
      // Closing a failed transport must not mask the original result.
    }
  }
}

async function discoverTools({ force = false } = {}) {
  if (!isMementoConfigured()) {
    return { tools: [], capabilities: {}, error: 'MEMENTO_API_KEY is not configured.' }
  }
  if (!force && Date.now() - discovery.at < TOOL_DISCOVERY_TTL_MS && !discovery.error) {
    return discovery
  }

  try {
    const result = await withTimeout(
      withClient(async (client) => client.listTools()),
      PHASE5_LIMITS.mementoTimeoutMs,
      'Memento MCP discovery timed out.',
    )
    const tools = Array.isArray(result?.tools) ? result.tools : []
    const capabilities = {}
    for (const tool of tools) {
      const capability = classifyTool(tool)
      if (capability && !capabilities[capability]) capabilities[capability] = tool
    }
    discovery = { at: Date.now(), tools, capabilities, error: '' }
    return discovery
  } catch (error) {
    discovery = {
      at: Date.now(),
      tools: [],
      capabilities: {},
      error: sanitizeError(error),
    }
    return discovery
  }
}

async function callCapability(capability, candidates, { timeoutMs } = {}) {
  const info = await discoverTools()
  if (!isMementoConfigured()) {
    return { ok: false, reason: 'NOT_CONFIGURED', message: 'MEMENTO_API_KEY is not configured.' }
  }
  if (info.error) return { ok: false, reason: 'UNAVAILABLE', message: info.error }
  const tool = info.capabilities[capability]
  if (!tool) {
    return {
      ok: false,
      reason: 'CAPABILITY_NOT_ADVERTISED',
      message: `Memento did not advertise a supported ${capability} tool.`,
    }
  }
  const args = buildArguments(tool, candidates)
  if (!args) {
    return {
      ok: false,
      reason: 'UNSUPPORTED_TOOL_SCHEMA',
      message: `Memento ${tool.name} requires fields DevUpdate AI cannot supply safely.`,
    }
  }

  let lastError = ''
  for (let attempt = 0; attempt <= PHASE5_LIMITS.mementoRetries; attempt += 1) {
    try {
      const result = await withTimeout(
        withClient((client) =>
          client.callTool({ name: tool.name, arguments: args }),
        ),
        timeoutMs || PHASE5_LIMITS.mementoTimeoutMs,
        'Memento MCP call timed out.',
      )
      if (result?.isError) {
        lastError = sanitizeText(extractText(result) || 'Memento tool reported an error.', 300)
        continue
      }
      return {
        ok: true,
        tool: tool.name,
        data: extractText(result),
        raw: result,
      }
    } catch (error) {
      lastError = sanitizeError(error)
    }
  }

  return { ok: false, reason: 'CALL_FAILED', message: lastError || 'Memento tool call failed.' }
}

function scopeFor(scope) {
  const userId = sanitizeText(scope?.userId, 120)
  const repositoryId = sanitizeText(scope?.repositoryId, 120)
  const dependencyId = sanitizeText(scope?.dependencyId, 120)
  return ['devupdate-ai', userId || 'unknown-user', repositoryId || 'workspace', dependencyId]
    .filter(Boolean)
    .join(':')
}

function baseCandidates(memory, scope) {
  const title = sanitizeText(memory.title, 240)
  const content = sanitizeText(memory.content, 12000)
  const tags = Array.isArray(memory.tags) ? memory.tags.slice(0, 20).map((tag) => sanitizeText(tag, 60)) : []
  return {
    title,
    content,
    text: content,
    name: title,
    memory: content,
    note: content,
    summary: title,
    body: content,
    description: content,
    scope: scopeFor(scope),
    namespace: scopeFor(scope),
    path: `devupdate-ai/${scope?.category || memory.category || 'PROJECT'}/${scope?.repositoryId || 'workspace'}`,
    category: sanitizeText(scope?.category || memory.category, 60),
    kind: sanitizeText(scope?.category || memory.category, 60).toLowerCase(),
    tags,
    metadata: {
      devupdateUserId: String(scope?.userId || ''),
      devupdateRepositoryId: String(scope?.repositoryId || ''),
      devupdateDependencyId: String(scope?.dependencyId || ''),
      devupdateMemoryId: String(memory._id || ''),
      category: String(scope?.category || memory.category || ''),
      confidence: Number(memory.confidence) || 0,
      verificationStatus: String(memory.verificationStatus || 'UNVERIFIED'),
    },
    source: sanitizeText(memory.source || 'DevUpdate AI', 200),
    url: sanitizeText(memory.url, 500),
    rationale: content,
  }
}

function referenceFromResult(result) {
  if (!result?.ok || result.data === undefined || result.data === null) return ''
  if (typeof result.data === 'string') return sanitizeText(result.data, 500)
  if (typeof result.data === 'object') {
    return sanitizeText(
      result.data.id ||
        result.data.nodeId ||
        result.data.memoryId ||
        result.data.path ||
        result.data.url ||
        JSON.stringify(result.data),
      500,
    )
  }
  return ''
}

export async function storeMemoryInMemento(memory, scope = {}) {
  const result = await callCapability('store', baseCandidates(memory, scope))
  return {
    ...result,
    reference: referenceFromResult(result),
  }
}

export async function updateMemoryInMemento(memory, scope = {}) {
  const id = sanitizeText(memory.externalReference || scope.externalReference, 500)
  const result = await callCapability('update', {
    ...baseCandidates(memory, scope),
    id,
    memoryId: id,
    nodeId: id,
  })
  return { ...result, reference: referenceFromResult(result) || id }
}

export async function deleteMemoryFromMemento(reference) {
  const id = sanitizeText(reference, 500)
  return callCapability('delete', { id, memoryId: id, nodeId: id })
}

export async function searchMemento({ query, scope = {}, limit = 10 } = {}) {
  const text = sanitizeText(query, 2000)
  const result = await callCapability('search', {
    query: text,
    q: text,
    text,
    search: text,
    question: text,
    searchQuery: text,
    scope: scopeFor(scope),
    namespace: scopeFor(scope),
    limit,
    topK: limit,
  })
  return { ...result, matches: result.ok ? result.data : null }
}

export async function getMementoStatus({ force = false } = {}) {
  const configured = isMementoConfigured()
  const info = await discoverTools({ force })
  return {
    product: 'Memento (mementoagi.com)',
    endpoint: endpoint(),
    configured,
    connected: configured && !info.error,
    authoritative: false,
    mode: configured ? 'MEMENTO_MIRROR' : 'MONGODB_FALLBACK',
    capabilities: Object.keys(info.capabilities),
    advertisedTools: info.tools.map((tool) => tool.name).slice(0, 100),
    lastError: info.error,
    limitations: [
      'MongoDB remains authoritative for access control, metadata, retention and UI state.',
      'Memento is best-effort: unsupported or unavailable operations are recorded and never silently claimed as Memento storage.',
    ],
  }
}

export function resetMementoDiscovery() {
  discovery = { at: 0, tools: [], capabilities: {}, error: '' }
}

export const mementoAdapter = {
  isConfigured: isMementoConfigured,
  storeMemory: storeMemoryInMemento,
  updateMemory: updateMemoryInMemento,
  deleteMemory: deleteMemoryFromMemento,
  search: searchMemento,
  getStatus: getMementoStatus,
  resetDiscovery: resetMementoDiscovery,
}

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { MEMENTO_CAPABILITIES, PHASE5_LIMITS } from '../../constants/phase5Constants.js'
import { sanitizeError, sanitizeText, withTimeout } from '../../utils/sanitize.js'

const DEFAULT_MEMENTO_URL = 'https://api.mementoagi.com/mcp'
const TOOL_DISCOVERY_TTL_MS = 5 * 60 * 1000

// These names are only used to classify tools returned by tools/list. No tool
// is called unless the remote server advertises it and its schema is satisfied.
const TOOL_NAME_HINTS = {
  search: ['search_memory', 'search-memory', 'full-search', 'search', 'recall', 'find-memories', 'query-memory'],
  store: ['write_memory', 'write-memory', 'write_many_memories', 'remember', 'write-node', 'write_node', 'remember-node', 'create-node', 'create-memory', 'add-memory'],
  update: ['update_memory', 'update-memory', 'update-node', 'update_node', 'edit-node', 'modify-memory'],
  delete: ['forget_memory', 'forget-memory', 'delete-node', 'delete_node', 'delete-memory', 'forget'],
  retrieveById: ['read_memory', 'read-memory', 'get-node', 'read-node', 'get-memory'],
}

let discovery = {
  at: 0,
  tools: [],
  capabilities: {},
  error: '',
}

export function isLocalMemento() {
  return process.env.MEMENTO_MODE === 'local' || process.env.MEMENTO_MCP_URL === 'stdio'
}

export function isMementoConfigured() {
  if (isLocalMemento()) return true
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

  // Adapt scope for structured tools like @psraghuveer/memento
  if (properties.scope) {
    if (typeof bag.scope === 'object' && bag.scope?.type) {
      args.scope = bag.scope
    } else {
      args.scope = { type: 'global' }
    }
  }

  // Adapt kind for structured tools like @psraghuveer/memento
  if (properties.kind) {
    if (typeof bag.kind === 'object' && bag.kind?.type) {
      args.kind = bag.kind
    } else {
      const k = String(bag.kind || '').toLowerCase()
      if (k === 'decision') {
        args.kind = { type: 'decision', rationale: bag.rationale || bag.content || null }
      } else if (k === 'preference') {
        args.kind = { type: 'preference' }
      } else {
        args.kind = { type: 'fact' }
      }
    }
  }

  // Adapt tags array
  if (properties.tags) {
    const rawTags = Array.isArray(bag.tags) ? bag.tags : []
    const cleanTags = rawTags
      .map((t) => String(t).toLowerCase().replace(/[^a-z0-9:_-]/g, ''))
      .filter(Boolean)
    args.tags = cleanTags.length > 0 ? cleanTags : ['devupdate-ai']
  }

  // Adapt confirmation & reason for forget_memory
  if (properties.confirm) args.confirm = true
  if (properties.reason) args.reason = bag.reason || 'Removed from DevUpdate AI workspace'

  // Copy standard mapped properties
  for (const key of Object.keys(properties)) {
    if (args[key] !== undefined) continue
    if (Object.prototype.hasOwnProperty.call(bag, key)) args[key] = bag[key]
  }

  // Fallbacks for content and text
  if (properties.content && !args.content) {
    args.content = bag.content || bag.text || bag.body || bag.title || 'DevUpdate AI memory note'
  }
  if (properties.text && !args.text) {
    args.text = bag.text || bag.query || bag.q || bag.search || bag.content || ''
  }

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(args, key) || args[key] === undefined || args[key] === null) {
      return null
    }
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
  let transport
  if (isLocalMemento()) {
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@psraghuveer/memento', 'serve'],
      env: {
        ...process.env,
        MEMENTO_DB: process.env.MEMENTO_DB || 'C:\\Users\\rohit\\AppData\\Local\\memento\\memento.db',
      },
    })
  } else {
    const url = assertSafeEndpoint()
    transport = new StreamableHTTPClientTransport(url, {
      requestInit: {
        headers: {
          Authorization: `Bearer ${(process.env.MEMENTO_API_KEY || '').trim()}`,
        },
      },
    })
  }

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
  const local = isLocalMemento()
  const info = await discoverTools({ force })
  return {
    product: local ? 'Memento MCP (@psraghuveer/memento)' : 'Memento (mementoagi.com)',
    endpoint: local ? 'stdio (npx @psraghuveer/memento serve)' : endpoint(),
    configured,
    connected: configured && !info.error,
    authoritative: false,
    mode: local ? 'MEMENTO_LOCAL_MCP' : configured ? 'MEMENTO_MIRROR' : 'MONGODB_FALLBACK',
    capabilities: Object.keys(info.capabilities),
    advertisedTools: info.tools.map((tool) => tool.name).slice(0, 100),
    lastError: info.error,
    limitations: [
      'MongoDB remains authoritative for access control, metadata, retention and UI state.',
      local
        ? 'Memento MCP mirrors structured memories into your local SQLite store for cross-tool AI persistence.'
        : 'Memento is best-effort: remote operations are recorded and never silently claimed as Memento storage.',
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

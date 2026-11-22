import Groq from 'groq-sdk'
import { z } from 'zod'
import { AppError } from '../../../utils/errors.js'
import { parseAiJson } from '../schemas/aiSchemas.js'

let client

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim())
}

export function groqModel() {
  return process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
}

function getClient() {
  if (!isGroqConfigured()) {
    throw new AppError(
      'Groq is not configured. Set GROQ_API_KEY and optionally GROQ_MODEL on the server.',
      503,
    )
  }
  if (!client) {
    client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: Number(process.env.GROQ_TIMEOUT_MS) || 60_000,
      maxRetries: 0,
    })
  }
  return client
}

function normalizeJsonSchema(node, definitions = {}) {
  if (!node || typeof node !== 'object') return { type: 'string' }
  if (node.$ref && typeof node.$ref === 'string') {
    const name = node.$ref.split('/').pop()
    return normalizeJsonSchema(definitions[name] || {}, definitions)
  }

  const out = {}
  if (Array.isArray(node.enum)) {
    out.enum = node.enum
    if (node.type && ['string', 'number', 'integer'].includes(node.type)) out.type = node.type
    else if (typeof node.enum[0] === 'string') out.type = 'string'
    return out
  }
  if (Array.isArray(node.anyOf) || Array.isArray(node.oneOf)) {
    const options = node.anyOf || node.oneOf
    const nonNull = options.filter((option) => option?.type !== 'null')
    if (nonNull.length === 1) return normalizeJsonSchema(nonNull[0], definitions)
  }

  if (node.type === 'object' || node.properties) {
    out.type = 'object'
    out.properties = {}
    for (const [key, value] of Object.entries(node.properties || {})) {
      out.properties[key] = normalizeJsonSchema(value, definitions)
    }
    out.required = Object.keys(out.properties)
    out.additionalProperties = false
    return out
  }

  if (node.type === 'array' || node.items) {
    out.type = 'array'
    out.items = normalizeJsonSchema(node.items || {}, definitions)
    return out
  }

  if (['string', 'number', 'integer', 'boolean'].includes(node.type)) {
    out.type = node.type
    return out
  }

  return { type: 'string' }
}

/** Converts a Zod schema to the constrained subset Groq accepts for strict JSON Schema mode. */
export function toGroqJsonSchema(schema, name = 'structured_output') {
  const generated = z.toJSONSchema(schema)
  const definitions = generated.$defs || {}
  const normalized = normalizeJsonSchema(generated, definitions)
  return {
    type: 'json_schema',
    json_schema: {
      name: name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
      strict: true,
      schema: normalized,
    },
  }
}

function classifyProviderError(error) {
  const status = Number(error?.status || error?.statusCode || 0)
  const message = String(error?.message || error)
  if (status === 429) return 'RATE_LIMITED'
  if (/timeout|timed out|ETIMEDOUT/i.test(message)) return 'TIMEOUT'
  if (/network|ECONNRESET|fetch failed|ENOTFOUND/i.test(message)) return 'NETWORK'
  if (status >= 500) return 'PROVIDER_UNAVAILABLE'
  return 'PROVIDER_ERROR'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Calls Groq with native strict JSON Schema output, then validates the result
 * with Zod. A malformed response is retried with a correction message.
 */
export async function generateStructured({
  schema,
  name = 'structured_output',
  prompt,
  messages,
  maxTokens = 5000,
  temperature = 0.1,
  retries = 2,
  signal,
} = {}) {
  if (!schema) throw new AppError('A schema is required for structured generation.', 500)
  const clientInstance = getClient()
  const inputMessages = messages || [{ role: 'user', content: String(prompt || '') }]
  const responseFormat = toGroqJsonSchema(schema, name)
  let lastError = 'The model did not return a valid response.'

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const activeMessages =
        attempt === 0
          ? inputMessages
          : [
              ...inputMessages,
              {
                role: 'user',
                content: `Your previous response was invalid: ${lastError}\nReturn a corrected JSON object that matches the required schema exactly.`,
              },
            ]

      const completion = await clientInstance.chat.completions.create(
        {
          model: groqModel(),
          messages: activeMessages,
          temperature,
          max_completion_tokens: maxTokens,
          response_format: responseFormat,
        },
        signal ? { signal } : undefined,
      )

      const content = completion.choices?.[0]?.message?.content || ''
      const parsed = parseAiJson(content, schema)
      if (!parsed.ok) {
        lastError = parsed.error
        if (attempt === retries) {
          const error = new AppError(`Groq structured output validation failed: ${lastError}`, 502)
          error.code = 'INVALID_JSON'
          error.usage = completion.usage
          throw error
        }
        await sleep(250 * (attempt + 1))
        continue
      }

      return {
        data: parsed.data,
        usage: completion.usage || {},
        attempts: attempt + 1,
        model: completion.model || groqModel(),
        provider: 'groq',
      }
    } catch (error) {
      if (error instanceof AppError && error.code === 'INVALID_JSON' && attempt === retries) throw error
      lastError = String(error?.message || error)
      if (attempt === retries) {
        const wrapped = new AppError(`Groq request failed: ${lastError.slice(0, 240)}`, 502)
        wrapped.code = classifyProviderError(error)
        throw wrapped
      }
      if (error?.code === 'RATE_LIMITED' || error?.code === 'TIMEOUT') {
        await sleep(400 * (attempt + 1))
      }
    }
  }

  const error = new AppError(`Groq request failed: ${lastError.slice(0, 240)}`, 502)
  error.code = 'PROVIDER_ERROR'
  throw error
}

export async function getGroqStatus() {
  return {
    configured: isGroqConfigured(),
    model: groqModel(),
    provider: 'groq',
  }
}

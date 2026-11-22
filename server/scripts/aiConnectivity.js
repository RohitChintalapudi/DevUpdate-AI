import 'dotenv/config'
import Groq from 'groq-sdk'
import { Firecrawl } from 'firecrawl'
import { Pinecone } from '@pinecone-database/pinecone'

function present(name) {
  return Boolean(process.env[name] && process.env[name].trim())
}

async function checkGroq() {
  if (!present('GROQ_API_KEY')) throw new Error('GROQ_API_KEY is not set')
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 20_000, maxRetries: 1 })
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
    max_completion_tokens: 64,
    temperature: 0,
  })
  const reply = String(completion.choices?.[0]?.message?.content || '').trim()
  if (!reply) throw new Error('Groq returned an empty completion')
  return {
    model: completion.model || process.env.GROQ_MODEL,
    reply: reply.slice(0, 80),
    tokens: completion.usage?.total_tokens || 0,
  }
}

async function checkFirecrawl() {
  if (!present('FIRECRAWL_API_KEY')) throw new Error('FIRECRAWL_API_KEY is not set')
  const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY })
  const result = await firecrawl.scrape('https://example.com', {
    formats: ['markdown'],
    onlyMainContent: true,
    timeout: 20_000,
  })
  return {
    url: result?.metadata?.url || result?.metadata?.sourceURL || '',
    markdownChars: String(result?.markdown || '').length,
  }
}

async function checkPinecone() {
  if (!present('PINECONE_API_KEY')) throw new Error('PINECONE_API_KEY is not set')
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
  const indexes = await pinecone.listIndexes()
  const embedded = await pinecone.inference.embed({
    model: process.env.EMBEDDING_MODEL || 'multilingual-e5-large',
    inputs: ['Connectivity test for DevUpdate AI.'],
    parameters: { inputType: 'passage', truncate: 'END' },
  })
  const embedding = embedded?.data?.[0] || (Array.isArray(embedded) ? embedded[0] : null)
  return {
    indexes: (indexes.indexes || indexes || []).map((index) => index.name),
    embeddingType: embedding?.vectorType || embedded?.vectorType || 'unknown',
    embeddingDimensions: embedding?.values?.length || 0,
  }
}

const checks = [
  ['Groq', checkGroq],
  ['Firecrawl', checkFirecrawl],
  ['Pinecone', checkPinecone],
]

for (const [name, check] of checks) {
  try {
    const result = await check()
    console.log(`${name}: OK ${JSON.stringify(result)}`)
  } catch (error) {
    console.log(`${name}: FAILED ${String(error?.message || error).slice(0, 300)}`)
  }
}

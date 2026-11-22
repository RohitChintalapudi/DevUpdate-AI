import dns from 'node:dns/promises'
import net from 'node:net'
import { AppError } from '../../../utils/errors.js'
import { sanitizeText } from '../../../utils/sanitize.js'

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
])

function ipToNumber(value) {
  return value.split('.').reduce((total, part) => (total * 256) + Number(part), 0)
}

function isPrivateIpv4(address) {
  const value = net.isIPv4(address) ? address : ''
  if (!value) return false
  const octets = value.split('.').map(Number)
  if (octets.some((part) => part < 0 || part > 255)) return true
  const [a, b] = octets
  const numeric = ipToNumber(value)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    numeric >= 0xf0000000
  )
}

function isPrivateIpv6(address) {
  const normalized = String(address || '').toLowerCase().split('%')[0]
  if (!net.isIPv6(normalized)) return false
  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fe80:')) return true
  const match = normalized.match(/^fd[0-9a-f]{2}:/i)
  return Boolean(match)
}

export function isPrivateAddress(address) {
  return isPrivateIpv4(address) || isPrivateIpv6(address)
}

function hostnameMatches(hostname, domain) {
  const value = String(hostname || '').toLowerCase()
  const allowed = String(domain || '').toLowerCase().replace(/^\./, '')
  return value === allowed || value.endsWith(`.${allowed}`)
}

function isBlockedHostname(hostname) {
  const value = String(hostname || '').toLowerCase().replace(/\.$/, '')
  return (
    isPrivateAddress(value)
    || BLOCKED_HOSTS.has(value)
    || value.endsWith('.localhost')
    || value.endsWith('.local')
    || value.endsWith('.internal')
  )
}

/**
 * Validates a URL before any external request. DNS is resolved so rebinding to
 * a private address cannot bypass the hostname check.
 */
export async function assertSafeExternalUrl(input, { allowedDomains = [] } = {}) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new AppError('A valid research URL is required.', 400)
  }

  let url
  try {
    url = new URL(input.trim())
  } catch {
    throw new AppError('The research URL is malformed.', 400)
  }

  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new AppError('Only HTTP and HTTPS research URLs are allowed.', 400)
  }
  if (url.username || url.password) {
    throw new AppError('Research URLs must not contain credentials.', 400)
  }
  if (url.port && !['80', '443'].includes(url.port) && url.protocol === 'https:') {
    throw new AppError('Only standard HTTPS ports are allowed.', 400)
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!hostname || hostname.length > 253) {
    throw new AppError('The research URL hostname is invalid.', 400)
  }
  if (isBlockedHostname(hostname)) {
    throw new AppError('Private and local research URLs are blocked.', 400)
  }

  const domains = (Array.isArray(allowedDomains) ? allowedDomains : [])
    .map((domain) => sanitizeText(domain, 253).toLowerCase())
    .filter(Boolean)
  if (domains.length && !domains.some((domain) => hostnameMatches(hostname, domain))) {
    throw new AppError(`Research URL is outside the allowed domains: ${domains.join(', ')}`, 400)
  }

  if (!net.isIP(hostname)) {
    let addresses
    try {
      addresses = await dns.lookup(hostname, { all: true, verbatim: true })
    } catch {
      throw new AppError('The research URL hostname could not be resolved.', 400)
    }
    if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
      throw new AppError('The research URL resolves to a blocked address.', 400)
    }
  }

  url.hash = ''
  return url.toString()
}

export function safeSourceDomainsFromMetadata(metadata = {}) {
  const candidates = [
    metadata.repositoryUrl,
    metadata.homepage,
    metadata.registryUrl,
    metadata.documentationUrl,
  ]
  const domains = []
  for (const candidate of candidates) {
    try {
      const parsed = new URL(String(candidate))
      if (parsed.username || parsed.password || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) continue
      const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
      if (hostname && hostname !== 'github.com' && !isBlockedHostname(hostname)) domains.push(hostname)
    } catch {
      // Ignore malformed registry metadata rather than expanding trust.
    }
  }
  return [...new Set(domains)].slice(0, 5)
}

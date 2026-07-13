export const RESERVED_NAMES = new Set([
  'gns', 'genlayer', 'official', 'administrator', 'admin', 'support',
  'security', 'verify', 'verification', 'wallet', 'recovery',
])

export type NameValidation =
  | { valid: true; canonical: string; display: string }
  | { valid: false; canonical: string; display: string; reason: string; reserved?: boolean }

export function validateName(value: string): NameValidation {
  const raw = value.trim().toLowerCase()
  const suffixes = (raw.match(/\.gen/g) || []).length
  const canonical = raw.endsWith('.gen') ? raw.slice(0, -4) : raw
  const display = canonical ? `${canonical}.gen` : ''
  if (!canonical) return { valid: false, canonical, display, reason: 'Enter a name to continue.' }
  if (suffixes > 1 || canonical.includes('.')) return { valid: false, canonical, display, reason: 'Use one .gen suffix only.' }
  if (canonical.length < 3 || canonical.length > 32) return { valid: false, canonical, display, reason: 'Use 3–32 characters before .gen.' }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(canonical)) return { valid: false, canonical, display, reason: 'Use letters, numbers, and single internal hyphens.' }
  if (RESERVED_NAMES.has(canonical)) return { valid: false, canonical, display, reason: 'This name is reserved by registry policy.', reserved: true }
  return { valid: true, canonical, display }
}

export function normalizeName(value: string) { return validateName(value).canonical }
export function displayName(value: string) { const n = normalizeName(value); return n ? `${n}.gen` : '' }

export function isAddress(value: string) { return /^0x[a-fA-F0-9]{40}$/.test(value) && !/^0x0{40}$/i.test(value) }

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!url.hostname || url.username || url.password) return null
    return url.toString()
  } catch { return null }
}

export function normalizeProfile(profile: Record<string, string>) {
  return {
    avatar: profile.avatar.trim(), bio: profile.bio.trim(),
    twitter: profile.twitter.trim().replace(/^@/, ''), github: profile.github.trim().replace(/^@/, ''),
    website: profile.website.trim(),
  }
}

export const PROFILE_LIMITS = { avatar: 256, bio: 280, twitter: 64, github: 64, website: 256 } as const

export function pageOffset(page: number, limit = 12) { return Math.max(0, page - 1) * Math.min(50, Math.max(1, limit)) }

export function resolvedAddressChanged(previous: string, current: string) {
  return previous.toLowerCase() !== current.toLowerCase()
}

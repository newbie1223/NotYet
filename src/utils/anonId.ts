const ANON_ID_STORAGE_KEY = 'not-yet-anon-id'

function generateAnonId() {
  return crypto.randomUUID()
}

export function getOrCreateAnonId() {
  const existing = localStorage.getItem(ANON_ID_STORAGE_KEY)
  if (existing) return existing

  const next = generateAnonId()
  localStorage.setItem(ANON_ID_STORAGE_KEY, next)
  return next
}

export function getStoredAnonId() {
  return localStorage.getItem(ANON_ID_STORAGE_KEY)
}

export async function hashAnonId(value: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Made with Bob

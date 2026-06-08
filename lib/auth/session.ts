// SERVER-ONLY. Signs/verifies the demo-access session cookie with HMAC-SHA256,
// keyed by DEMO_PASSWORD. NO @anthropic-ai/sdk, NO env reads, NO clock here — the
// functions take `secret` and `now` explicitly so they are pure and unit-testable.
// The browser only ever holds the opaque signed token; the secret stays on the server.
// (Imported only by the server route handlers, never by a client component.)
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'gbdaq_session'
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7 // 7 days
const SCHEME = 'v1'
const CLOCK_SKEW_S = 60 // tolerate minor issuedAt drift; reject implausibly-future tokens

const mac = (secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest()

// Signed token shape: `v1.<issuedAtSeconds>.<base64url(hmac)>`.
export function signSession(secret: string, issuedAtS: number): string {
  const payload = `${SCHEME}.${issuedAtS}`
  return `${payload}.${mac(secret, payload).toString('base64url')}`
}

export function verifySession(secret: string, token: string | undefined, nowS: number): boolean {
  if (!secret || !token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [scheme, issuedAtStr, sig] = parts
  if (scheme !== SCHEME) return false
  const issuedAtS = Number(issuedAtStr)
  if (!Number.isInteger(issuedAtS)) return false
  if (nowS - issuedAtS > SESSION_MAX_AGE_S) return false // expired
  if (issuedAtS - nowS > CLOCK_SKEW_S) return false      // issued in the "future" → forged
  const expected = mac(secret, `${scheme}.${issuedAtS}`)
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length) return false
  return timingSafeEqual(given, expected)
}

// Constant-time password check. Hashing both sides to a fixed 32-byte digest first
// gives timingSafeEqual equal-length inputs and leaks no length information.
export function passwordMatches(input: unknown, secret: string): boolean {
  if (typeof input !== 'string' || !secret) return false
  const a = createHash('sha256').update(input).digest()
  const b = createHash('sha256').update(secret).digest()
  return timingSafeEqual(a, b)
}

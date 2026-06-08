import { describe, it, expect } from 'vitest'
import { signSession, verifySession, passwordMatches, SESSION_MAX_AGE_S } from '@/lib/auth/session'

const SECRET = 'unit-test-secret' // arbitrary fixture — NOT the real demo password (which lives only in env)
const NOW = 1_780_000_000 // fixed clock (seconds)

describe('auth/session', () => {
  it('verifies a freshly signed token (now and shortly after)', () => {
    const t = signSession(SECRET, NOW)
    expect(verifySession(SECRET, t, NOW)).toBe(true)
    expect(verifySession(SECRET, t, NOW + 100)).toBe(true)
    expect(verifySession(SECRET, t, NOW + SESSION_MAX_AGE_S)).toBe(true) // boundary still valid
  })

  it('rejects a token signed with a different secret (forgery)', () => {
    expect(verifySession(SECRET, signSession('wrong-secret', NOW), NOW)).toBe(false)
  })

  it('rejects tampered payload/signature and junk', () => {
    const t = signSession(SECRET, NOW)
    const [s, i, sig] = t.split('.')
    expect(verifySession(SECRET, t + 'x', NOW)).toBe(false)                  // mangled sig
    expect(verifySession(SECRET, `${s}.${Number(i) + 1}.${sig}`, NOW)).toBe(false) // payload changed, mac stale
    expect(verifySession(SECRET, 'garbage', NOW)).toBe(false)
    expect(verifySession(SECRET, '', NOW)).toBe(false)
    expect(verifySession(SECRET, undefined, NOW)).toBe(false)
  })

  it('rejects expired and implausibly-future tokens', () => {
    const t = signSession(SECRET, NOW)
    expect(verifySession(SECRET, t, NOW + SESSION_MAX_AGE_S + 1)).toBe(false) // expired
    expect(verifySession(SECRET, t, NOW - 3600)).toBe(false)                  // issued 1h in the future
  })

  it('an empty/missing secret never verifies', () => {
    expect(verifySession('', signSession(SECRET, NOW), NOW)).toBe(false)
  })

  it('passwordMatches is exact and type-safe', () => {
    expect(passwordMatches('unit-test-secret', SECRET)).toBe(true)
    expect(passwordMatches('unit-test-secrid', SECRET)).toBe(false) // differs by one char
    expect(passwordMatches('UNIT-TEST-SECRET', SECRET)).toBe(false) // case-sensitive
    expect(passwordMatches('', SECRET)).toBe(false)
    expect(passwordMatches(12345, SECRET)).toBe(false)
    expect(passwordMatches(null, SECRET)).toBe(false)
    expect(passwordMatches('x', '')).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import {
  take,
  bumpDaily,
  clientIp,
  MAP_MAX_KEYS,
  type Bucket,
  type DailyState,
} from '@/lib/rateLimit'

const NOW = 1_780_000_000_000 // fixed clock (ms); advanced explicitly per test

describe('rateLimit/take', () => {
  it('allows up to the limit then blocks, with exact remaining + retryAfterMs', () => {
    const store = new Map<string, Bucket>()
    expect(take(store, 'k', 3, 60_000, NOW)).toEqual({ ok: true, remaining: 2, retryAfterMs: 0 })
    expect(take(store, 'k', 3, 60_000, NOW)).toEqual({ ok: true, remaining: 1, retryAfterMs: 0 })
    expect(take(store, 'k', 3, 60_000, NOW)).toEqual({ ok: true, remaining: 0, retryAfterMs: 0 })
    // 4th call over the limit: blocked, retryAfterMs == resetAt - now == windowMs (set at first call)
    expect(take(store, 'k', 3, 60_000, NOW)).toEqual({ ok: false, remaining: 0, retryAfterMs: 60_000 })
  })

  it('resets the window once now reaches resetAt (boundary)', () => {
    const store = new Map<string, Bucket>()
    take(store, 'k', 2, 60_000, NOW)
    take(store, 'k', 2, 60_000, NOW)
    expect(take(store, 'k', 2, 60_000, NOW).ok).toBe(false) // exhausted within window
    // advance exactly windowMs → now === resetAt → fresh window, ok again with remaining limit-1
    expect(take(store, 'k', 2, 60_000, NOW + 60_000)).toEqual({ ok: true, remaining: 1, retryAfterMs: 0 })
  })

  it('keeps separate keys independent', () => {
    const store = new Map<string, Bucket>()
    take(store, 'a', 1, 60_000, NOW)
    expect(take(store, 'a', 1, 60_000, NOW).ok).toBe(false) // 'a' exhausted
    expect(take(store, 'b', 1, 60_000, NOW).ok).toBe(true) // 'b' unaffected
  })

  it('sweeps to keep store size at or below MAP_MAX_KEYS', () => {
    const store = new Map<string, Bucket>()
    const windowMs = 1_000
    // Insert more than MAP_MAX_KEYS distinct keys (all same window, now fixed). The sweep fires
    // when size > MAP_MAX_KEYS at the start of a take; with nothing yet expired it must fall back
    // to deleting the earliest-resetAt entries, pinning size at MAP_MAX_KEYS + 1 (not 5050).
    for (let i = 0; i < MAP_MAX_KEYS + 50; i++) take(store, `k${i}`, 1, windowMs, NOW)
    expect(store.size).toBe(MAP_MAX_KEYS + 1) // sorted-fallback sweep active; would be +50 without it
    // advance beyond every entry's resetAt → the expired-sweep clears them on the next take
    take(store, 'fresh', 1, windowMs, NOW + windowMs + 1)
    expect(store.size).toBeLessThanOrEqual(MAP_MAX_KEYS)
  })
})

describe('rateLimit/bumpDaily', () => {
  it('counts up to the limit, blocks, then resets on a new UTC day', () => {
    const state: DailyState = { day: 0, count: 0 }
    expect(bumpDaily(state, 2, NOW)).toEqual({ ok: true, used: 1 })
    expect(bumpDaily(state, 2, NOW)).toEqual({ ok: true, used: 2 })
    expect(bumpDaily(state, 2, NOW)).toEqual({ ok: false, used: 2 }) // budget exhausted
    // advance one full day → counter resets
    expect(bumpDaily(state, 2, NOW + 86_400_000)).toEqual({ ok: true, used: 1 })
  })
})

describe('rateLimit/clientIp', () => {
  it('takes the first x-forwarded-for entry (trimmed)', () => {
    const req = new Request('http://x/', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
    expect(clientIp(req)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    const req = new Request('http://x/', { headers: { 'x-real-ip': '9.9.9.9' } })
    expect(clientIp(req)).toBe('9.9.9.9')
  })

  it("returns 'unknown' when neither header is present", () => {
    const req = new Request('http://x/')
    expect(clientIp(req)).toBe('unknown')
  })
})

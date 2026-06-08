// SERVER-ONLY best-effort rate limiting — pure logic + module singletons. NO network,
// NO Next.js/anthropic imports, NO clock inside the pure functions: callers pass `now`
// (ms) explicitly so the logic stays unit-testable, like session.ts / lmsr.ts.
// In-memory Maps reset per serverless instance / cold start (see design doc); this raises
// the bar for a single low-traffic demo, not distributed correctness. The route layer
// (Phase 3) imports the singletons below; tests cover only the pure functions.

// ── 정책 상수 (한 곳) ───────────────────────────────────────────────
export const ANALYZE_SESSION = { limit: 10, windowMs: 60_000 } // /api/analyze 세션당
export const ANALYZE_IP = { limit: 30, windowMs: 60_000 } // /api/analyze IP당
export const ANALYZE_DAILY = 2000 // /api/analyze 전역 일일예산(인스턴스별, UTC day)
export const AUTH_IP = { limit: 10, windowMs: 300_000 } // /api/auth IP당 (브루트포스)
export const MAP_MAX_KEYS = 5000 // 키 회전 메모리 DoS 방지 스윕 임계

// ── 고정 윈도 카운터 ────────────────────────────────────────────────
export interface Bucket { count: number; resetAt: number }

export function take(
  store: Map<string, Bucket>,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): { ok: boolean; remaining: number; retryAfterMs: number } {
  if (store.size > MAP_MAX_KEYS) {
    // 1차: 만료 엔트리 제거.
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k)
    // 2차: 그래도 상한 초과면 가장 이른 resetAt부터 제거(insertion order에 의존하지 않음).
    if (store.size > MAP_MAX_KEYS) {
      const byReset = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
      for (const [k] of byReset) {
        if (store.size <= MAP_MAX_KEYS) break
        store.delete(k)
      }
    }
  }
  const e = store.get(key)
  if (!e || now >= e.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 }
  }
  if (e.count < limit) {
    e.count++
    return { ok: true, remaining: limit - e.count, retryAfterMs: 0 }
  }
  return { ok: false, remaining: 0, retryAfterMs: e.resetAt - now }
}

// ── 전역 일일예산 (UTC day 경계 리셋) ───────────────────────────────
export interface DailyState { day: number; count: number }

export function bumpDaily(state: DailyState, limit: number, now: number): { ok: boolean; used: number } {
  const day = Math.floor(now / 86_400_000)
  if (state.day !== day) {
    state.day = day
    state.count = 0
  }
  if (state.count < limit) {
    state.count++
    return { ok: true, used: state.count }
  }
  return { ok: false, used: state.count }
}

// x-forwarded-for 첫 엔트리(trim) → x-real-ip → 'unknown'. XFF는 일반적으로 스푸핑 가능하나
// Vercel 엣지가 클라 IP를 세팅함. IP 제한은 보조 방어선, 세션 제한이 1차.
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

// ── 라우트용 모듈 싱글톤 (Phase 3에서 import; 테스트 대상 아님) ──────
export const analyzeSessionStore = new Map<string, Bucket>()
export const analyzeIpStore = new Map<string, Bucket>()
export const authIpStore = new Map<string, Bucket>()
export const dailyState: DailyState = { day: 0, count: 0 }

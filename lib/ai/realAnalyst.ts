// Client-safe, pure helpers for the analyst path. The app now uses deterministic
// heuristics only: no network model, no SDK, and no API key.
import { priceYes } from '@/lib/lmsr'
import { analyze, type AIAnalysis } from '@/lib/ai/fakeAnalyst'
import { SEED_MARKETS, type DemoMarket } from '@/lib/demo/seed'

export const MAX_MARKETS = 20

// Raw item shape returned by /api/analyze (before clamping/validation).
export interface RawResult { id: string; probYes: number; confidence: number; rationale: string }
// Compact per-market payload sent over the wire to /api/analyze.
// recentPoints = the FULL price history at site-access time (oldest → newest).
export interface MarketPayload { id: string; question: string; price: number; recentPoints: number[]; volume: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function toPayload(m: DemoMarket): MarketPayload {
  return {
    id: m.id,
    question: m.question,
    price: Number(priceYes(m.qYes, m.qNo, m.b).toFixed(3)),
    // FULL chart at access time (oldest → newest) — the model reads past→present, not a tail.
    recentPoints: m.history.map(p => Number(p.toFixed(3))),
    volume: Math.round(m.volume),
  }
}

// Caps bound the per-request token cost so a crafted payload can't amplify the model
// bill. Legit payloads are tiny (short question, ≤120-point history from the store).
export const MAX_QUESTION_LEN = 500
export const MAX_POINTS = 300
export const MAX_ID_LEN = 64
// Key whitelist: a payload may carry ONLY these keys. Any extra key (e.g. a crafted
// `evil` field) makes the payload invalid, so unknown data can never reach the model.
const ALLOWED = new Set(['id', 'question', 'price', 'recentPoints', 'volume'])
export function validPayload(p: unknown): p is MarketPayload {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  return Object.keys(o).every(k => ALLOWED.has(k))
    && typeof o.id === 'string'
    && o.id.length <= MAX_ID_LEN
    && typeof o.question === 'string'
    && o.question.length <= MAX_QUESTION_LEN
    && Number.isFinite(o.price)
    && Array.isArray(o.recentPoints)
    && o.recentPoints.length <= MAX_POINTS
    && o.recentPoints.every(n => Number.isFinite(n))
    && Number.isFinite(o.volume)
}

// CAN-001: server-owned id → canonical question. The route binds caller payloads to these
// so caller-supplied free text never reaches the analysis engine.
const SEED_QUESTION = new Map(SEED_MARKETS.map(m => [m.id, m.question]))

// Bind caller payloads to server-owned seed markets: DROP unknown ids and REPLACE the
// caller's `question` with the canonical seed question. Numeric live fields
// (price/recentPoints/volume) stay caller-supplied — the server keeps no copy of the
// per-device live price/history, and numbers can't carry prompt-injection text.
export function canonicalizeMarkets(payloads: MarketPayload[]): MarketPayload[] {
  const out: MarketPayload[] = []
  for (const p of payloads) {
    const question = SEED_QUESTION.get(p.id)
    if (question === undefined) continue // unknown id → drop
    out.push({ id: p.id, question, price: p.price, recentPoints: p.recentPoints, volume: p.volume })
  }
  return out
}

export function heuristicResults(payloads: MarketPayload[]): RawResult[] {
  return payloads.slice(0, MAX_MARKETS).map(p => {
    const result = analyze({
      marketId: p.id,
      question: p.question,
      price: p.price,
      points: p.recentPoints,
      volume: p.volume,
    })
    return {
      id: p.id,
      probYes: result.probYes,
      confidence: result.confidence,
      rationale: result.rationale,
    }
  })
}

function validResult(r: unknown): r is RawResult {
  if (!r || typeof r !== 'object') return false
  const o = r as Record<string, unknown>
  return typeof o.id === 'string'
    && Number.isFinite(o.probYes)
    && Number.isFinite(o.confidence)
    && typeof o.rationale === 'string'
    && o.rationale.trim().length > 0
}

// Merge raw API results onto markets BY ID. Clamp to UI ranges (probYes 0.05–0.95,
// confidence 56–94). Any market whose id is missing/malformed in `raw` falls back to
// a local deterministic heuristic. `raw === null` (total API failure) → every market falls back.
export function mergeAnalyses(markets: DemoMarket[], raw: RawResult[] | null): Record<string, AIAnalysis> {
  const byId = new Map<string, RawResult>()
  if (raw) for (const r of raw) if (validResult(r) && !byId.has(r.id)) byId.set(r.id, r)

  const out: Record<string, AIAnalysis> = {}
  for (const m of markets) {
    const price = priceYes(m.qYes, m.qNo, m.b)
    const r = byId.get(m.id)
    if (r) {
      const probYes = Number(clamp(r.probYes, 0.05, 0.95).toFixed(4))
      out[m.id] = {
        probYes,
        confidence: Math.round(clamp(r.confidence, 56, 94)),
        lean: probYes >= 0.5 ? 'yes' : 'no',
        rationale: r.rationale.trim(),
        dataCount: 0,
        vsCrowd: Number((probYes - price).toFixed(4)),
        source: 'heuristic',
      }
    } else {
      out[m.id] = {
        ...analyze({ marketId: m.id, question: m.question, price, points: m.history, volume: m.volume }),
        source: 'fallback',
      }
    }
  }
  return out
}

// Re-anchor a fetched analysis onto the LIVE price so the displayed AI number tracks the
// chart every tick. We hold the AI's *edge* (vsCrowd = how much it disagreed with the crowd
// at read time) and let the *level* follow the live price. This keeps "AI 예측" and "시장가"
// sensibly related at any instant instead of drifting apart between (infrequent) real re-reads.
export interface LiveView { prob: number; lean: 'yes' | 'no'; vs: number; diffPct: number }
export function liveView(a: AIAnalysis, livePrice: number): LiveView {
  const prob = Number(clamp(livePrice + a.vsCrowd, 0.05, 0.95).toFixed(4))
  const vs = Number((prob - livePrice).toFixed(4))
  return { prob, lean: prob >= 0.5 ? 'yes' : 'no', vs, diffPct: Math.round(Math.abs(vs) * 100) }
}

// Client-safe, pure helpers for the real (Claude) AI analyst path.
// IMPORTANT: NO network and NO @anthropic-ai/sdk import here — the SDK lives ONLY
// in app/api/analyze/route.ts. This module (a) builds the request shape the route
// sends to Claude, and (b) merges Claude's raw output back onto markets by id,
// clamping to the UI's ranges and falling back to the deterministic heuristic
// (fakeAnalyst) per-market when an id is missing or malformed.
import { priceYes } from '@/lib/lmsr'
import { analyze, type AIAnalysis } from '@/lib/ai/fakeAnalyst'
import type { DemoMarket } from '@/lib/demo/seed'

export const MAX_MARKETS = 20

// Raw item shape the model returns (before clamping/validation).
export interface RawResult { id: string; probYes: number; confidence: number; rationale: string }
// Compact per-market payload sent over the wire to /api/analyze.
export interface MarketPayload { id: string; question: string; price: number; recentPoints: number[]; volume: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// JSON schema used as the forced-tool input_schema (guarantees the result shape).
export const ANALYZE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', description: '입력으로 받은 마켓 id 그대로' },
          probYes: { type: 'number', description: "'예'가 일어날 확률, 0~1 사이 소수" },
          confidence: { type: 'number', description: '신뢰도, 0~100' },
          rationale: { type: 'string', description: '딱 2문장, 능청스러운 한국어 근거' },
        },
        required: ['id', 'probYes', 'confidence', 'rationale'],
      },
    },
  },
  required: ['results'],
} as const

export const SYSTEM_PROMPT = `너는 '지비닥 AI 애널리스트'야. 경북소프트웨어마이스터고 교내 라이브 예측시장의 시세를 읽고, 능청스럽고 재치있는 한국어로 분석을 내놓는 캐릭터지.

각 마켓에 대해 현재 시장가(price = 군중이 매긴 '예' 확률, 0~1), 최근 시세 흐름(recentPoints), 거래량(volume)을 보고 만들어:
- probYes: 네가 보는 '예'가 일어날 확률(0~1 소수). 시장가에서 너무 멀어지진 말되, 흐름·모멘텀을 반영해 네 '관점'을 살짝 드러내.
- confidence: 신뢰도(0~100).
- rationale: 딱 2문장. 학교 드립(급식, 야자, 시험, 점호, 사감쌤 등)을 살짝 곁들인 가벼운 입담. 과장된 단정·투자 권유는 금지.

말투 예시(이 톤을 따라가되 그대로 베끼진 마):
- "차트가 대놓고 우상향입니다. 이건 뭐… 사감쌤도 '예' 매수 누를 각이에요."
- "완벽한 횡보. 급식 줄처럼 도통 안 줄어듭니다. 딱 균형점이에요."
- "매도 폭격 중입니다. 다들 손절하고 야자 째러 갔나 봐요."

반드시 submit_analyses 도구를 호출해서 결과를 제출하고, 입력으로 받은 모든 마켓의 id를 빠짐없이 포함해.`

export function toPayload(m: DemoMarket): MarketPayload {
  return {
    id: m.id,
    question: m.question,
    price: Number(priceYes(m.qYes, m.qNo, m.b).toFixed(3)),
    recentPoints: m.history.slice(-20).map(p => Number(p.toFixed(3))),
    volume: Math.round(m.volume),
  }
}

export function validPayload(p: unknown): p is MarketPayload {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  return typeof o.id === 'string'
    && typeof o.question === 'string'
    && Number.isFinite(o.price)
    && Array.isArray(o.recentPoints)
    && Number.isFinite(o.volume)
}

export function buildUserContent(payloads: MarketPayload[]): string {
  const markets = payloads.slice(0, MAX_MARKETS)
  return `다음 마켓들을 분석해서, 각 마켓 id에 대응하는 결과를 submit_analyses로 제출해줘.\n\n${JSON.stringify({ markets })}`
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

// Merge raw model results onto markets BY ID. Clamp to UI ranges (probYes 0.05–0.95,
// confidence 56–94). Any market whose id is missing/malformed in `raw` falls back to
// the deterministic heuristic. `raw === null` (total API failure) → every market falls back.
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
        source: 'ai',
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

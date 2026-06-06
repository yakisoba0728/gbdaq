// ─────────────────────────────────────────────────────────────────────────────
// HEURISTIC SIMULATION — NOT A REAL MODEL.
//
// `analyze()` does NOT call any LLM, API, or network. It is a pure, deterministic
// function that fabricates a believable "AI analyst" opinion purely from market
// data (current price, recent price points, volume) via simple heuristics +
// Korean templates. The user-facing persona is "지비닥 AI 애널리스트", but
// internally this is just math: given the same inputs it always returns the same
// output. Use the `seed` input to nudge the fabricated "view" so a re-analysis
// looks alive. There is no learning, no inference, no intelligence here.
// ─────────────────────────────────────────────────────────────────────────────

export interface AIAnalysis {
  probYes: number        // 0.05..0.95 — the AI's fabricated probability for "예"
  confidence: number     // 56..94 — fabricated confidence %
  lean: 'yes' | 'no'     // probYes >= 0.5 ? yes : no
  rationale: string      // 2-sentence Korean explanation
  dataCount: number      // stable-per-market "학습 데이터 N건" number
  vsCrowd: number        // probYes − price (how much the AI differs from the crowd)
}

// Tiny deterministic string hash (FNV-1a-ish). Stable across server/client.
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

// Deterministic pseudo-random in [0,1) from a numeric seed (mulberry32 step).
function rand01(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)
// Non-negative modulo over an unsigned-32 mix of a hash and seed. Plain `^` on
// large numbers yields a *signed* 32-bit int in JS, so `% n` could go negative
// (e.g. producing a nonsensical "0건"); `>>> 0` forces it non-negative first.
const mod = (n: number, seed: number, m: number) => (((n ^ Math.imul(seed, 2654435761)) >>> 0) % m)

// ── Rationale templates, keyed by trend (up/down/flat). Two sentences:
//    [0] = signal-flavored opener, [1] = fabricated "유사 패턴" stat with {k}/{pct}.
const OPENERS: Record<'up' | 'down' | 'flat', { low: string[]; high: string[] }> = {
  up: {
    low: [
      "완만하게 우상향 중. 급하진 않은데, 눈치 빠른 애들은 벌써 '예'에 줄 섰어요.",
      "조용히 오르는 중입니다. '예'가 슬금슬금 자신감을 챙기는 분위기네요.",
    ],
    high: [
      "차트가 대놓고 우상향입니다. 이건 뭐… 사감쌤도 '예' 매수 누를 각이에요.",
      "거래량 터지면서 쭉쭉 오릅니다. '예' 쪽 기세가 심상치 않아요.",
    ],
  },
  down: {
    low: [
      "스리슬쩍 흘러내리는 중. '아니오'가 조용히 가방 싸는 분위기입니다.",
      "완만한 하락세예요. 무게중심이 슬슬 '아니오' 쪽으로 기웁니다.",
    ],
    high: [
      "매도 폭격 중입니다. 다들 손절하고 야자 째러 갔나 봐요.",
      "낙폭이 큽니다. '예'는 지금 멘탈 가출 상태로 보입니다.",
    ],
  },
  flat: {
    low: [
      "완벽한 횡보. 급식 줄처럼 도통 안 줄어듭니다. 딱 균형점이에요.",
      "방향 없이 잔잔합니다. 양쪽 다 눈치만 보는 중이네요.",
    ],
    high: [
      "방향은 없는데 출렁임은 큽니다. 시험기간 멘탈 그래프랑 똑같네요.",
      "위아래로 요동치는 중. 작은 떡밥 하나에도 휘청할 분위기입니다.",
    ],
  },
}

const PATTERNS = [
  "과거 비슷한 떡밥 {k}건 중 약 {pct}%가 같은 결말로 갔습니다. 나머지는 묻지 마세요.",
  "비슷한 흐름 {k}건을 복기하니 약 {pct}%가 예상대로였어요. 통계는 거짓말 안 합니다, 아마도.",
  "동일 신호 {k}건 중 약 {pct}%가 방향을 유지했습니다. 이 정도면 거의 점쟁이 아닌가요?",
]

/**
 * Fabricate a deterministic "AI analyst" opinion for a market. Pure: no I/O,
 * no randomness beyond the explicit `seed`. NOT a real model — see file header.
 */
export function analyze(input: {
  marketId: string
  question?: string
  price: number
  points?: number[]
  volume?: number
  seed?: number
}): AIAnalysis {
  const price = clamp(Number(input.price) || 0.5, 0, 1)
  const pts = (input.points ?? []).filter(n => Number.isFinite(n))
  const volume = Math.max(0, Number(input.volume) || 0)
  const seed = Math.floor(Number(input.seed) || 0)
  const h = hashStr(input.marketId || 'market')

  // momentum = mean(last 5) − mean(prior 5); 0 when we don't have enough points.
  let momentum = 0
  if (pts.length >= 2) {
    const last5 = pts.slice(-5)
    const prior5 = pts.slice(-10, -5)
    momentum = mean(last5) - (prior5.length ? mean(prior5) : mean(last5))
  }

  // Per-market "personality": stable bias in ~±0.07 from the id hash.
  const bias = ((h % 1000) / 1000 - 0.5) * 0.14 // [-0.07, +0.07]

  // jitter: deterministic per (marketId, seed), in ±0.02.
  const jitter = (rand01(h ^ (seed * 2654435761)) - 0.5) * 0.04

  // probYes hugs the market price but expresses a "view".
  const probYes = Number(
    clamp(price + momentum * 1.5 + bias * 0.5 + jitter, 0.05, 0.95).toFixed(4),
  )
  const lean: 'yes' | 'no' = probYes >= 0.5 ? 'yes' : 'no'
  const vsCrowd = Number((probYes - price).toFixed(4))

  // confidence: more momentum + more volume → more "confident" (fabricated).
  const confJitter = (rand01((h >>> 3) ^ (seed * 40503)) - 0.5) * 6
  const confidence = Math.round(
    clamp(58 + Math.abs(momentum) * 220 + Math.min(volume, 800) / 40 + confJitter, 56, 94),
  )

  // dataCount: stable per market — the "이전 데이터 N건 학습" badge.
  const dataCount = 900 + (h % 1600)

  // ── Rationale: pick trend + volatility bucket, fill {k}/{pct} from seed/data.
  const trend: 'up' | 'down' | 'flat' =
    momentum > 0.004 ? 'up' : momentum < -0.004 ? 'down' : 'flat'

  // volatility from spread of recent points.
  let vol = 0
  if (pts.length >= 2) {
    const recent = pts.slice(-12)
    vol = Math.max(...recent) - Math.min(...recent)
  }
  const volBucket: 'low' | 'high' = vol >= 0.05 ? 'high' : 'low'

  const openerArr = OPENERS[trend][volBucket]
  const opener = openerArr[mod(h, seed, openerArr.length)]
  const patternTpl = PATTERNS[mod(h, seed * 7, PATTERNS.length)]

  // {k}: small sample count that shifts with seed; {pct}: convergence % aligned
  // with the lean (higher when the AI is more confident in its direction).
  const k = 7 + mod(h, seed * 31, 22) // 7..28
  const pctBase = trend === 'flat' ? 50 : 52 + Math.round((confidence - 56) / 3) // ~52..64
  const pct = clamp(pctBase + Math.round((rand01(h ^ (seed * 374761393)) - 0.5) * 8), 50, 72)
  const pattern = patternTpl.replace('{k}', String(k)).replace('{pct}', String(pct))

  const rationale = `${opener} ${pattern}`

  return { probYes, confidence, lean, rationale, dataCount, vsCrowd }
}

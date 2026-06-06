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
      "최근 거래 흐름이 완만한 상승세를 그리고 있고 변동성은 낮아, 단기적으로 '예' 쪽에 무게가 실립니다.",
      "가격이 꾸준히 위로 다져지는 모습이라, 군중 심리가 '예' 방향으로 천천히 수렴하는 단계로 판단됩니다.",
    ],
    high: [
      "최근 30분 거래 흐름이 뚜렷한 상승세이고 거래량이 평균을 웃돌아, 단기적으로 '예' 쪽 압력이 우세합니다.",
      "변동성이 큰 가운데에서도 추세의 방향은 위쪽이라, 모멘텀이 '예'에 유리하게 작용하고 있습니다.",
    ],
  },
  down: {
    low: [
      "최근 거래 흐름이 완만한 하락세를 보이고 변동성은 낮아, 단기적으로 '아니오' 쪽이 조금 더 유리해 보입니다.",
      "가격이 천천히 아래로 미끄러지는 흐름이라, 군중의 무게 중심이 '아니오'로 옮겨가는 중으로 봅니다.",
    ],
    high: [
      "최근 30분 거래 흐름이 뚜렷한 하락세이고 매도 압력이 두드러져, 단기적으로 '아니오' 쪽 압력이 우세합니다.",
      "변동성이 큰 와중에 추세선은 아래를 향하고 있어, 모멘텀이 '아니오'에 무게를 싣고 있습니다.",
    ],
  },
  flat: {
    low: [
      "최근 거래 흐름이 좁은 박스권에서 안정적으로 횡보 중이라, 시장가 부근이 균형점이라는 신호로 읽힙니다.",
      "뚜렷한 방향성 없이 거래가 차분하게 이어지고 있어, 현재 가격이 양측 베팅의 평형 구간으로 판단됩니다.",
    ],
    high: [
      "방향성은 뚜렷하지 않지만 호가가 출렁이며 변동성이 큰 편이라, 단기 반전 가능성을 함께 열어두고 봅니다.",
      "추세는 평탄하나 거래가 양방향으로 활발해, 작은 충격에도 가격이 흔들릴 수 있는 구간으로 봅니다.",
    ],
  },
}

const PATTERNS = [
  "과거 유사 패턴 {k}건 중 약 {pct}%가 같은 방향으로 수렴했습니다.",
  "비슷한 흐름이 나왔던 사례 {k}건을 대조하면 약 {pct}%가 같은 결과로 이어졌습니다.",
  "동일한 신호 조합 {k}건을 되짚어 보면 약 {pct}%에서 방향이 유지됐습니다.",
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

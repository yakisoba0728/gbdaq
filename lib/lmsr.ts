// LMSR (Logarithmic Market Scoring Rule) — 순수 가격/비용 함수.
// 데모의 체결(lib/demo/store)이 동일 공식으로 가격·지분·수령액을 계산한다.
import type { Side } from '@/lib/types'

const lse = (x: number, y: number) => { const m = Math.max(x, y); return m + Math.log(Math.exp(x - m) + Math.exp(y - m)) }
const C = (qy: number, qn: number, b: number) => b * lse(qy / b, qn / b)

export function priceYes(qy: number, qn: number, b: number): number {
  const m = Math.max(qy / b, qn / b)
  const ey = Math.exp(qy / b - m), en = Math.exp(qn / b - m)
  return ey / (ey + en)
}

// 특정 side로 n주 매수 비용(양수=지불)
export function costToBuyShares(qy: number, qn: number, b: number, side: Side, n: number): number {
  const after = side === 'yes' ? C(qy + n, qn, b) : C(qy, qn + n, b)
  return after - C(qy, qn, b)
}

// 금액(amount 상점)으로 살 수 있는 지분 수(closed-form 역산)
export function sharesForAmount(qy: number, qn: number, b: number, side: Side, amount: number): { shares: number; cost: number; priceAfter: number } {
  const a = Math.exp(qy / b), c = Math.exp(qn / b), e = Math.exp(amount / b)
  let shares: number
  if (side === 'yes') shares = b * Math.log(((a + c) * e - c) / a)
  else shares = b * Math.log(((a + c) * e - a) / c)
  const cost = costToBuyShares(qy, qn, b, side, shares)
  const priceAfter = side === 'yes' ? priceYes(qy + shares, qn, b) : 1 - priceYes(qy, qn + shares, b)
  return { shares, cost, priceAfter }
}

// 보유 side 지분 n주 매도 시 수령(양수=받는 상점)
export function proceedsForSell(qy: number, qn: number, b: number, side: Side, n: number): number {
  const after = side === 'yes' ? C(qy - n, qn, b) : C(qy, qn - n, b)
  return C(qy, qn, b) - after
}

// 매수 견적 — 금액(amount 상점)으로 체결되는 정수 지분 수(shares)와 그 지분의 비용(cost).
// cost는 올림(ceil), 매도 수령은 store에서 내림(floor) → 라운딩을 항상 하우스 쪽으로 몰아
// 매수→매도 왕복·반복 파밍으로 상점이 늘어나는 무위험 차익을 원천 차단한다.
export function quoteBuy(qy: number, qn: number, b: number, side: Side, amount: number): { shares: number; cost: number } {
  const { shares } = sharesForAmount(qy, qn, b, side, amount)
  const sh = Math.max(1, Math.round(shares)) // whole-unit shares (scarce integer economy)
  const cost = Math.max(1, Math.ceil(costToBuyShares(qy, qn, b, side, sh)))
  return { shares: sh, cost }
}

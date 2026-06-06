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

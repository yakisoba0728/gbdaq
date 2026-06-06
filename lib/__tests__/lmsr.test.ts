import { describe, it, expect } from 'vitest'
import { priceYes, costToBuyShares, sharesForAmount, proceedsForSell } from '@/lib/lmsr'

const b = 200
describe('LMSR', () => {
  it('starts at 50/50 when q_yes=q_no', () => {
    expect(priceYes(0, 0, b)).toBeCloseTo(0.5, 6)
    expect(priceYes(50, 50, b)).toBeCloseTo(0.5, 6)
  })
  it('buying YES raises YES price', () => {
    const before = priceYes(0, 0, b)
    const after = priceYes(100, 0, b)
    expect(after).toBeGreaterThan(before)
  })
  it('prices sum to 1', () => {
    expect(priceYes(120, 40, b) + priceYes(40, 120, b)).toBeCloseTo(1, 6) // symmetry check
    const p = priceYes(73, 11, b)
    expect(p).toBeGreaterThan(0); expect(p).toBeLessThan(1)
  })
  it('sharesForAmount inverts costToBuyShares', () => {
    const amount = 50
    const { shares } = sharesForAmount(0, 0, b, 'yes', amount)
    const cost = costToBuyShares(0, 0, b, 'yes', shares)
    expect(cost).toBeCloseTo(amount, 4)
  })
  it('buy then immediate sell returns ~same points (no fee)', () => {
    const { shares, cost } = sharesForAmount(0, 0, b, 'yes', 50)
    // after buying: q_yes = shares
    const proceeds = proceedsForSell(shares, 0, b, 'yes', shares)
    expect(proceeds).toBeCloseTo(cost, 4)
  })
})

import { describe, it, expect } from 'vitest'
import { analyze, type AIAnalysis } from '@/lib/ai/fakeAnalyst'

const base = {
  marketId: 'food-tangsu',
  question: '오늘 급식에 탕수육이 나올까?',
  price: 0.5,
  points: [0.48, 0.49, 0.5, 0.51, 0.52, 0.53, 0.55, 0.57, 0.6, 0.62],
  volume: 4200,
}

describe('fakeAnalyst.analyze (heuristic simulation)', () => {
  it('probYes is always within [0.05, 0.95]', () => {
    for (const price of [0, 0.001, 0.2, 0.5, 0.8, 0.999, 1]) {
      const a = analyze({ ...base, price })
      expect(a.probYes).toBeGreaterThanOrEqual(0.05)
      expect(a.probYes).toBeLessThanOrEqual(0.95)
    }
    // extreme momentum can't push it out of bounds either
    const up = analyze({ marketId: 'm', price: 0.9, points: [0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99] })
    expect(up.probYes).toBeLessThanOrEqual(0.95)
    const down = analyze({ marketId: 'm', price: 0.1, points: [0.99, 0.9, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1, 0.05] })
    expect(down.probYes).toBeGreaterThanOrEqual(0.05)
  })

  it('lean is consistent with probYes', () => {
    for (const mid of ['a', 'b', 'c', 'food-tangsu', 'sports-final']) {
      for (const price of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const a = analyze({ marketId: mid, price, points: base.points })
        expect(a.lean).toBe(a.probYes >= 0.5 ? 'yes' : 'no')
      }
    }
  })

  it('vsCrowd equals probYes minus price', () => {
    const a = analyze(base)
    expect(a.vsCrowd).toBeCloseTo(a.probYes - base.price, 4)
  })

  it('confidence is within [56, 94] and an integer', () => {
    for (const v of [0, 100, 800, 5000]) {
      const a = analyze({ ...base, volume: v })
      expect(a.confidence).toBeGreaterThanOrEqual(56)
      expect(a.confidence).toBeLessThanOrEqual(94)
      expect(Number.isInteger(a.confidence)).toBe(true)
    }
  })

  it('rationale is a non-empty two-sentence Korean string with no leftover placeholders', () => {
    const a = analyze(base)
    expect(a.rationale.length).toBeGreaterThan(10)
    expect(a.rationale).not.toContain('{k}')
    expect(a.rationale).not.toContain('{pct}')
    // contains the fabricated "유사 패턴" stat
    expect(a.rationale).toMatch(/\d+%/)
  })

  it('the fabricated sample count {k} is always >= 1 across seeds/markets (never "0건")', () => {
    // Regression: signed 32-bit XOR could make the count 0/negative.
    for (const mid of ['food-tangsu', 'm', 'sports-final', 'zzz', 'a']) {
      for (let seed = 0; seed < 60; seed++) {
        const r = analyze({ ...base, marketId: mid, seed }).rationale
        const m = r.match(/(\d+)\s*건/)
        expect(m).not.toBeNull()
        expect(Number(m![1])).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('dataCount is stable per market and in the documented range', () => {
    const a1 = analyze(base)
    const a2 = analyze({ ...base, seed: 999, price: 0.2, volume: 10 })
    expect(a1.dataCount).toBe(a2.dataCount) // independent of seed/price/volume
    expect(a1.dataCount).toBeGreaterThanOrEqual(900)
    expect(a1.dataCount).toBeLessThan(900 + 1600)
    // different markets generally get different counts
    const b = analyze({ ...base, marketId: 'completely-different-market' })
    expect(b.dataCount).not.toBe(a1.dataCount)
  })

  it('is deterministic for identical inputs', () => {
    const a = analyze(base)
    const b = analyze(base)
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('changes when only the seed changes', () => {
    // mid-range price so [0.05,0.95] clamping cannot mask seed-driven jitter
    const s0 = analyze({ ...base, price: 0.5, seed: 0 })
    const s1 = analyze({ ...base, price: 0.5, seed: 1 })
    const s2 = analyze({ ...base, price: 0.5, seed: 2 })
    // the object as a whole must differ across seeds
    expect(s0).not.toEqual(s1)
    expect(s1).not.toEqual(s2)
    // rationale (the {k}/{pct} numbers) shifts with seed
    const rationales = new Set([s0.rationale, s1.rationale, s2.rationale])
    expect(rationales.size).toBeGreaterThan(1)
  })

  it('reacts to momentum: rising series leans more bullish than a falling one', () => {
    const rising = analyze({ marketId: 'mom', price: 0.5, points: [0.4, 0.42, 0.44, 0.46, 0.48, 0.55, 0.6, 0.65, 0.7, 0.75] })
    const falling = analyze({ marketId: 'mom', price: 0.5, points: [0.75, 0.7, 0.65, 0.6, 0.55, 0.48, 0.46, 0.44, 0.42, 0.4] })
    expect(rising.probYes).toBeGreaterThan(falling.probYes)
  })

  it('handles missing/empty points without throwing (momentum = 0)', () => {
    const none = analyze({ marketId: 'x', price: 0.6 })
    const one = analyze({ marketId: 'x', price: 0.6, points: [0.6] })
    expect(none.rationale.length).toBeGreaterThan(0)
    expect(one.rationale.length).toBeGreaterThan(0)
    // matches the deterministic shape
    const probe: AIAnalysis = none
    expect(probe.lean).toBe(probe.probYes >= 0.5 ? 'yes' : 'no')
  })
})

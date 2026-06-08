import { describe, it, expect } from 'vitest'
import { mergeAnalyses, toPayload, validPayload, liveView, type RawResult } from '@/lib/ai/realAnalyst'
import type { DemoMarket } from '@/lib/demo/seed'
import type { AIAnalysis } from '@/lib/ai/fakeAnalyst'

// minimal market: qYes=0,qNo=0,b=15 → priceYes = 0.5 (so vsCrowd = probYes - 0.5)
const mk = (id: string, over: Partial<DemoMarket> = {}): DemoMarket => ({
  id, slug: id, category: '급식', icon: '🍱', question: `${id}?`, rules: '',
  b: 15, qYes: 0, qNo: 0, volume: 50, history: [0.5, 0.5, 0.5], target: 0.5, ...over,
})

describe('realAnalyst.mergeAnalyses', () => {
  it('maps valid results onto markets, clamps, and derives lean/vsCrowd', () => {
    const markets = [mk('m1'), mk('m2')]
    const raw: RawResult[] = [
      { id: 'm1', probYes: 0.8, confidence: 70, rationale: '오른다 어쩌고.' },
      { id: 'm2', probYes: 0.3, confidence: 65, rationale: '내린다 저쩌고.' },
    ]
    const out = mergeAnalyses(markets, raw)
    expect(out.m1.source).toBe('ai')
    expect(out.m1.probYes).toBeCloseTo(0.8, 4)
    expect(out.m1.lean).toBe('yes')
    expect(out.m1.vsCrowd).toBeCloseTo(0.3, 4) // 0.8 - 0.5
    expect(out.m2.lean).toBe('no')
  })

  it('clamps probYes to [0.05,0.95] and confidence to [56,94]', () => {
    const out = mergeAnalyses([mk('m1'), mk('m2')], [
      { id: 'm1', probYes: 0.999, confidence: 200, rationale: 'x.' },
      { id: 'm2', probYes: -1, confidence: 0, rationale: 'y.' },
    ])
    expect(out.m1.probYes).toBe(0.95)
    expect(out.m1.confidence).toBe(94)
    expect(out.m2.probYes).toBe(0.05)
    expect(out.m2.confidence).toBe(56)
  })

  it('falls back per-market for a missing id', () => {
    const out = mergeAnalyses([mk('m1'), mk('m2')], [
      { id: 'm1', probYes: 0.7, confidence: 70, rationale: 'ok.' },
    ])
    expect(out.m1.source).toBe('ai')
    expect(out.m2.source).toBe('fallback')
    expect(out.m2.rationale.length).toBeGreaterThan(0) // heuristic produced something
  })

  it('falls back per-market for malformed entries (bad number / empty rationale)', () => {
    const out = mergeAnalyses([mk('m1'), mk('m2')], [
      { id: 'm1', probYes: NaN, confidence: 70, rationale: 'ok.' } as RawResult,
      { id: 'm2', probYes: 0.6, confidence: 70, rationale: '   ' },
    ])
    expect(out.m1.source).toBe('fallback')
    expect(out.m2.source).toBe('fallback')
  })

  it('falls back for ALL markets when raw is null (total failure)', () => {
    const out = mergeAnalyses([mk('m1'), mk('m2')], null)
    expect(out.m1.source).toBe('fallback')
    expect(out.m2.source).toBe('fallback')
  })

  it('maps by id regardless of order and ignores unknown ids', () => {
    const out = mergeAnalyses([mk('m1')], [
      { id: 'zzz', probYes: 0.9, confidence: 80, rationale: 'noise.' },
      { id: 'm1', probYes: 0.6, confidence: 60, rationale: 'real.' },
    ])
    expect(out.m1.source).toBe('ai')
    expect(out.m1.rationale).toBe('real.')
    expect(out.zzz).toBeUndefined()
  })
})

describe('realAnalyst payload helpers', () => {
  it('toPayload rounds price/volume and sends the FULL history (oldest → newest)', () => {
    const long = Array.from({ length: 50 }, (_, i) => i / 100)
    const p = toPayload(mk('m1', { history: long, volume: 12.7 }))
    expect(p.id).toBe('m1')
    expect(p.recentPoints.length).toBe(50) // full chart, not a tail
    expect(p.recentPoints[0]).toBeCloseTo(0, 4) // oldest first
    expect(p.recentPoints[49]).toBeCloseTo(0.49, 4) // newest last
    expect(p.volume).toBe(13)
    expect(typeof p.price).toBe('number')
  })

  it('validPayload accepts a good payload and rejects junk', () => {
    expect(validPayload({ id: 'a', question: 'q', price: 0.5, recentPoints: [0.5], volume: 1 })).toBe(true)
    expect(validPayload({ id: 'a' })).toBe(false)
    expect(validPayload(null)).toBe(false)
    expect(validPayload({ id: 1, question: 'q', price: 0.5, recentPoints: [], volume: 1 })).toBe(false)
  })

  it('validPayload rejects oversized question / recentPoints (token-amplification caps)', () => {
    expect(validPayload({ id: 'a', question: 'x'.repeat(501), price: 0.5, recentPoints: [0.5], volume: 1 })).toBe(false)
    expect(validPayload({ id: 'a', question: 'q', price: 0.5, recentPoints: new Array(301).fill(0.5), volume: 1 })).toBe(false)
    // exactly at the caps is still accepted
    expect(validPayload({ id: 'a', question: 'x'.repeat(500), price: 0.5, recentPoints: new Array(300).fill(0.5), volume: 1 })).toBe(true)
  })
})

describe('realAnalyst.liveView (re-anchor to live price)', () => {
  const an = (vsCrowd: number): AIAnalysis =>
    ({ probYes: 0.5 + vsCrowd, confidence: 70, lean: vsCrowd >= 0 ? 'yes' : 'no', rationale: 'x', dataCount: 0, vsCrowd })

  it('holds the AI edge and tracks the live price', () => {
    const a = an(0.1) // edge +0.1
    expect(liveView(a, 0.6).prob).toBeCloseTo(0.7, 4) // 0.6 + 0.1
    expect(liveView(a, 0.4).prob).toBeCloseTo(0.5, 4) // tracks chart down
    expect(liveView(a, 0.4).vs).toBeCloseTo(0.1, 4)   // edge preserved
    expect(liveView(a, 0.4).diffPct).toBe(10)
  })

  it('lean follows the re-anchored prob across 0.5', () => {
    const a = an(0.05)
    expect(liveView(a, 0.5).lean).toBe('yes') // 0.55
    expect(liveView(a, 0.4).lean).toBe('no')  // 0.45
  })

  it('clamps prob to [0.05, 0.95]', () => {
    expect(liveView(an(0.1), 0.92).prob).toBe(0.95)
    expect(liveView(an(-0.1), 0.08).prob).toBe(0.05)
  })
})

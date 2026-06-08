'use client'
import { useEffect, useRef, useState } from 'react'
import type { DemoMarket } from '@/lib/demo/seed'
import type { AIAnalysis } from '@/lib/ai/fakeAnalyst'
import { toPayload, mergeAnalyses, type RawResult } from '@/lib/ai/realAnalyst'

export interface AiAnalysesState { byId: Record<string, AIAnalysis>; loading: boolean }

// Fires EXACTLY ONE POST /api/analyze on mount, using the markets captured at mount
// time (later prop changes — e.g. 4s price ticks, category-tab filtering — do NOT
// re-trigger it). A page refresh remounts → new call. No caching. On any failure,
// mergeAnalyses falls every market back to the deterministic heuristic.
export function useAiAnalyses(markets: DemoMarket[]): AiAnalysesState {
  const [state, setState] = useState<AiAnalysesState>({ byId: {}, loading: true })
  const snapshot = useRef(markets) // captured on first render; intentionally not updated

  useEffect(() => {
    let alive = true
    const ms = snapshot.current
    if (!ms.length) { setState({ byId: {}, loading: false }); return }
    ;(async () => {
      let raw: RawResult[] | null = null
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ markets: ms.map(toPayload) }),
        })
        if (res.ok) {
          const data = await res.json()
          raw = Array.isArray(data?.results) ? (data.results as RawResult[]) : null
        }
      } catch { /* network error → fall back below */ }
      if (alive) setState({ byId: mergeAnalyses(ms, raw), loading: false })
    })()
    return () => { alive = false }
  }, [])

  return state
}

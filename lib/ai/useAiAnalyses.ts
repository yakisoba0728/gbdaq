'use client'
import { useEffect, useRef, useState } from 'react'
import type { DemoMarket } from '@/lib/demo/seed'
import type { AIAnalysis } from '@/lib/ai/fakeAnalyst'
import { toPayload, mergeAnalyses, type RawResult } from '@/lib/ai/realAnalyst'

export interface AiAnalysesState { byId: Record<string, AIAnalysis>; loading: boolean }

// Fires ONE POST /api/analyze on mount, against the chart as it stands AT SITE-ACCESS TIME.
// That snapshot (full history, oldest → newest) is what the model reads — its words describe
// "the chart when you opened the page". Between mounts the UI re-anchors the AI number to the
// live price (see realAnalyst.liveView), so the displayed % keeps tracking the chart every tick
// WITHOUT re-calling the API; only the rationale is frozen to the access-time view (by design).
// On failure we fall back to the deterministic heuristic so the panel is never empty.
export function useAiAnalyses(markets: DemoMarket[]): AiAnalysesState {
  const [state, setState] = useState<AiAnalysesState>({ byId: {}, loading: true })
  const snapshot = useRef(markets) // frozen at mount = the access-time chart

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
      } catch { /* network error → heuristic fallback below */ }
      if (alive) setState({ byId: mergeAnalyses(ms, raw), loading: false })
    })()
    return () => { alive = false }
  }, [])

  return state
}

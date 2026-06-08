'use client'
import { useEffect, useRef, useState } from 'react'
import type { DemoMarket } from '@/lib/demo/seed'
import type { AIAnalysis } from '@/lib/ai/fakeAnalyst'
import { toPayload, mergeAnalyses, type RawResult } from '@/lib/ai/realAnalyst'

export interface AiAnalysesState { byId: Record<string, AIAnalysis>; loading: boolean }

// Real re-reads are infrequent on purpose: between reads the UI re-anchors the AI number
// to the live price (see realAnalyst.liveView), so the chart stays in sync WITHOUT hammering
// the API. A long interval only refreshes the rationale/edge. 90s × an 8-market home batch is
// gentle enough to not trip rate limits on demo day.
const REREAD_MS = 90_000

// Fires ONE POST /api/analyze on mount, then re-reads every REREAD_MS using the LIVE markets
// (read through a ref, so the 4s price ticks that re-render this hook do NOT re-trigger fetches).
// `loading` is true only until the first result; later re-reads update in place (no shimmer).
// On a re-read failure we KEEP the last good result instead of flipping to the heuristic, so the
// panel never flickers "Claude → 오프라인 추정". The very first load still falls back to the
// heuristic if it fails, so the panel is never empty.
export function useAiAnalyses(markets: DemoMarket[]): AiAnalysesState {
  const [state, setState] = useState<AiAnalysesState>({ byId: {}, loading: true })
  const marketsRef = useRef(markets)
  // Keep the ref pointed at the latest markets WITHOUT re-running the interval effect below.
  // (Updated in an effect, not during render, per react-hooks/refs.)
  useEffect(() => { marketsRef.current = markets })

  useEffect(() => {
    let alive = true
    let inFlight = false
    let gotFirst = false

    const run = async () => {
      const ms = marketsRef.current
      if (!ms.length) { if (alive) setState({ byId: {}, loading: false }); return }
      if (inFlight) return
      inFlight = true
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
      } catch { /* network error → handled below */ }
      inFlight = false
      if (!alive) return
      // Re-read failed after we already had a result → keep the last good one (no flicker).
      if (raw === null && gotFirst) return
      gotFirst = true
      // Merge against the CURRENT markets (price may have moved during the fetch); ids still map.
      setState({ byId: mergeAnalyses(marketsRef.current, raw), loading: false })
    }

    run()
    const id = setInterval(run, REREAD_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return state
}

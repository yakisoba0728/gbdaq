'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useDemo } from '@/lib/demo/store'
import { fmtPct } from '@/lib/format'
import type { DemoMarket } from '@/lib/demo/seed'

export function Ticker() {
  const { markets, priceOf } = useDemo()

  // Flash ▲/▼ briefly when a price moves (store re-renders every ~4s).
  const prev = useRef<Record<string, number>>({})
  const [flash, setFlash] = useState<Record<string, 'up' | 'down'>>({})
  useEffect(() => {
    const next: Record<string, 'up' | 'down'> = {}
    for (const m of markets) {
      const p = priceOf(m); const before = prev.current[m.id]
      if (before !== undefined && p !== before) next[m.id] = p > before ? 'up' : 'down'
      prev.current[m.id] = p
    }
    if (Object.keys(next).length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- flash reacts to the live price store and self-clears via the timer below; cannot be derived during render
      setFlash(next)
      const t = setTimeout(() => setFlash({}), 1200)
      return () => clearTimeout(t)
    }
  }, [markets, priceOf])

  if (!markets.length) return null

  // Fixed-width items keep the marquee track width CONSTANT, so price-text changes
  // never reflow the track (the old bug: track width shifted → the loop jumped).
  const item = (m: DemoMarket, copy: string) => {
    const p = priceOf(m); const f = flash[m.id]
    return (
      <Link key={`${copy}-${m.id}`} href={`/market/${m.slug}`}
        className="ty-caption flex w-[210px] shrink-0 items-center gap-2 px-5">
        <span className="shrink-0">{m.icon}</span>
        <span className="min-w-0 flex-1 truncate text-muted">{m.question}</span>
        <span className={`shrink-0 ty-caption-strong nums ${f === 'up' ? 'text-up' : f === 'down' ? 'text-down' : p >= 0.5 ? 'text-up' : 'text-down'}`}>
          {f === 'up' ? '▲' : f === 'down' ? '▼' : ''}{fmtPct(p)}
        </span>
      </Link>
    )
  }

  return (
    <div className="overflow-hidden border-b border-hairline bg-parchment/80 backdrop-blur">
      {/* two identical copies → seamless -50% loop; fixed-width items → no jump on update */}
      <div className="flex w-max animate-ticker py-2">
        {markets.map(m => item(m, 'a'))}
        {markets.map(m => item(m, 'b'))}
      </div>
    </div>
  )
}

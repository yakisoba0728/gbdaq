'use client'
import { useMemo, useState } from 'react'
import { useDemo } from '@/lib/demo/store'
import { Ticker } from '@/components/Ticker'
import { CategoryTabs } from '@/components/CategoryTabs'
import { LiveMarkets } from '@/components/market/LiveMarkets'

export default function Home() {
  const { markets } = useDemo()
  const [active, setActive] = useState<string | null>(null)

  // Tab list derives from the FULL, unfiltered market set so selecting a tab
  // never collapses the tab bar to a single entry.
  const categories = useMemo(
    () => Array.from(new Set(markets.map(m => m.category))),
    [markets],
  )

  const filtered = active ? markets.filter(m => m.category === active) : markets
  // Hero = highest-volume market within the current (filtered) view; fallback to first.
  const hero = filtered.length
    ? filtered.reduce((best, m) => (m.volume > best.volume ? m : best))
    : markets[0]

  return (
    <>
      <Ticker />
      <CategoryTabs categories={categories} active={active} onSelect={setActive} />
      <LiveMarkets markets={filtered} hero={hero} />
    </>
  )
}

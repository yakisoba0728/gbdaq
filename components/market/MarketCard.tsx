'use client'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { fmtPoints } from '@/lib/format'
import { useDemo } from '@/lib/demo/store'
import type { DemoMarket } from '@/lib/demo/seed'
import { AnimatedPercent } from '@/components/ui/AnimatedPercent'

const MotionLink = motion.create(Link)

export function MarketCard({ m }: { m: DemoMarket }) {
  const { priceOf } = useDemo()
  const p = priceOf(m)
  const pctColor = p >= 0.5 ? 'text-up' : 'text-down'
  const reduce = useReducedMotion()
  return (
    <MotionLink
      href={`/market/${m.slug}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="group flex min-h-[200px] flex-col gap-4 rounded-[18px] border border-hairline bg-canvas p-6 transition active:scale-95"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-parchment text-xl">{m.icon}</span>
        <span className="ty-body-strong text-ink">{m.question}</span>
      </div>
      <div className="flex items-baseline">
        <span className="ty-caption text-muted">예</span>
        <AnimatedPercent value={p} className={`ml-auto ty-display-md ${pctColor}`} />
      </div>
      {/* slim probability bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-parchment">
        <div className={`h-full rounded-full ${p >= 0.5 ? 'bg-up' : 'bg-down'}`} style={{ width: `${Math.round(p * 100)}%` }} />
      </div>
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="ty-caption text-faint">💰 <span className="nums">{fmtPoints(m.volume)}</span> 상점</span>
        <span className="ty-caption-strong rounded-full border border-blue px-3.5 py-1 text-blue transition group-hover:bg-blue group-hover:text-white">거래</span>
      </div>
    </MotionLink>
  )
}

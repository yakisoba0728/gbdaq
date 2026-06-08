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
  const reduce = useReducedMotion()
  return (
    <MotionLink
      href={`/market/${m.slug}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="group flex flex-col gap-3 rounded-[18px] border border-hairline bg-canvas p-4 transition active:scale-95 sm:p-5"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-parchment text-lg">{m.icon}</span>
        <span className="ty-body-strong text-ink">{m.question}</span>
      </div>
      {/* 예/아니오 — 색 박스로 또렷하게 구분 */}
      <div className="mt-auto grid grid-cols-2 gap-2">
        <div className="rounded-[12px] border border-up/20 bg-upbg px-2.5 py-1.5">
          <div className="ty-fine text-up">예</div>
          <AnimatedPercent value={p} className="ty-body-strong leading-none text-up" />
        </div>
        <div className="rounded-[12px] border border-down/20 bg-downbg px-2.5 py-1.5">
          <div className="ty-fine text-down">아니오</div>
          <AnimatedPercent value={1 - p} className="ty-body-strong leading-none text-down" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-0.5">
        <span className="ty-fine text-faint">💰 <span className="nums">{fmtPoints(m.volume)}</span></span>
        <span className="ty-caption-strong rounded-full border border-blue px-3 py-0.5 text-blue transition group-hover:bg-blue group-hover:text-white">거래</span>
      </div>
    </MotionLink>
  )
}

'use client'
import type { DemoMarket } from '@/lib/demo/seed'
import { useDemo } from '@/lib/demo/store'

export function PositionBox({ m }: { m: DemoMarket }) {
  const { positions } = useDemo()
  const y = positions[m.id]?.yes || 0
  const n = positions[m.id]?.no || 0
  if (y < 0.5 && n < 0.5) return null
  return (
    <div className="mt-4 rounded-[18px] border border-hairline bg-pearl p-6">
      <div className="mb-2 ty-caption-strong text-ink">내 포지션</div>
      {y >= 0.5 && <div className="flex justify-between py-0.5"><span className="ty-caption nums text-up">예 {Math.round(y)}주</span></div>}
      {n >= 0.5 && <div className="flex justify-between py-0.5"><span className="ty-caption nums text-down">아니오 {Math.round(n)}주</span></div>}
    </div>
  )
}

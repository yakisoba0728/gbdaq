'use client'
import Link from 'next/link'
import { fmtPct, fmtPoints } from '@/lib/format'
import { analyze } from '@/lib/ai/fakeAnalyst'
import { useDemo } from '@/lib/demo/store'
import type { DemoMarket } from '@/lib/demo/seed'

export function RightRail({ markets }: { markets: DemoMarket[] }) {
  const { priceOf } = useDemo()
  const breaking = [...markets].sort((a, b) => Math.abs(priceOf(b) - 0.5) - Math.abs(priceOf(a) - 0.5)).slice(0, 3)
  const trending = [...markets].sort((a, b) => b.volume - a.volume).slice(0, 4)

  // 🤖 AI 오늘의 픽 — 휴리스틱 시뮬레이션(lib/ai/fakeAnalyst)을 모든 마켓에 돌려
  // AI가 군중과 가장 크게 갈리는(|vsCrowd| 최대) 마켓을 고른다. LLM 호출 없음.
  const pick = markets.length
    ? markets
        .map(m => ({ m, a: analyze({ marketId: m.id, question: m.question, price: priceOf(m), points: m.history, volume: m.volume }) }))
        .reduce((best, cur) => (Math.abs(cur.a.vsCrowd) > Math.abs(best.a.vsCrowd) ? cur : best))
    : null

  return (
    <aside className="flex flex-col gap-5">
      <section className="rounded-[18px] border border-hairline bg-canvas p-6">
        <h3 className="ty-body-strong mb-2 text-ink">🔥 교내 속보</h3>
        {breaking.map(m => (
          <Link key={m.id} href={`/market/${m.slug}`} className="ty-caption flex items-start gap-2 border-b border-divider py-2.5 last:border-0 last:pb-0">
            <span className="flex-1 text-ink">{m.question}</span><span className="ty-caption-strong nums text-ink">{fmtPct(priceOf(m))}</span>
          </Link>
        ))}
      </section>

      <section className="rounded-[18px] border border-hairline bg-canvas p-6">
        <h3 className="ty-body-strong mb-2 text-ink">인기 마켓 ›</h3>
        {trending.map(m => (
          <Link key={m.id} href={`/market/${m.slug}`} className="ty-caption flex justify-between border-b border-divider py-2 last:border-0 last:pb-0">
            <span className="text-ink">{m.icon} {m.question.slice(0, 14)}…</span><span className="text-faint nums">{fmtPoints(m.volume)} 🔥</span>
          </Link>
        ))}
      </section>

      {pick && (
        <Link href={`/market/${pick.m.slug}`} className="block rounded-[18px] border border-hairline bg-pearl p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-parchment text-sm">🤖</span>
            <h3 className="ty-body-strong text-ink">AI 오늘의 픽</h3>
            <span className="ty-fine ml-auto inline-flex items-center gap-1 text-blue">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue" /> LIVE
            </span>
          </div>
          <p className="ty-caption-strong text-ink">{pick.m.icon} {pick.m.question}</p>
          <div className="ty-caption mt-2">
            <span className="text-muted">AI: </span>
            <span className={`ty-caption-strong nums ${pick.a.lean === 'yes' ? 'text-up' : 'text-down'}`}>
              &apos;{pick.a.lean === 'yes' ? '예' : '아니오'}&apos; {fmtPct(pick.a.probYes)}
            </span>
            <span className="text-muted nums"> (신뢰도 {pick.a.confidence}%)</span>
          </div>
          <div className="ty-fine nums mt-1 text-faint">시장가 {fmtPct(priceOf(pick.m))} 대비 {Math.round(Math.abs(pick.a.vsCrowd) * 100)}%p 차이</div>
        </Link>
      )}
    </aside>
  )
}

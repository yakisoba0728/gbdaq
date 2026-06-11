'use client'
import Link from 'next/link'
import { fmtPct } from '@/lib/format'
import { useDemo } from '@/lib/demo/store'
import { useAiAnalyses } from '@/lib/ai/useAiAnalyses'
import { liveView } from '@/lib/ai/realAnalyst'
import type { AIAnalysis } from '@/lib/ai/fakeAnalyst'
import type { DemoMarket } from '@/lib/demo/seed'

export function RightRail({ markets }: { markets: DemoMarket[] }) {
  const { priceOf } = useDemo()
  const breaking = [...markets].sort((a, b) => Math.abs(priceOf(b) - 0.5) - Math.abs(priceOf(a) - 0.5)).slice(0, 3)
  // 📊 최근 급변동 — 최근 시세가 가장 크게 움직인 마켓(현재가 vs 약 6틱 전). volume·50:50근접·AI괴리
  // 와 겹치지 않는 별개 컷. delta는 정렬·표시(▲/▼·%p) 양쪽에 쓰므로 map으로 한 번만 계산.
  const movers = [...markets]
    .map(m => ({ m, delta: priceOf(m) - (m.history.length > 6 ? m.history[m.history.length - 7] : m.history[0]) }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4)

  // 🤖 AI 오늘의 픽 — 화면의 마켓 전체를 /api/analyze로 휴리스틱 분석.
  // AI 관점을 현재가에 재앵커(liveView)해, 지금 차트 기준 AI가 군중과 가장 크게 갈리는 마켓을 고른다.
  const { byId, loading } = useAiAnalyses(markets)
  let pick: { m: DemoMarket; a: AIAnalysis; lv: ReturnType<typeof liveView> } | null = null
  for (const m of markets) {
    const a = byId[m.id]
    if (!a) continue
    const lv = liveView(a, priceOf(m))
    if (!pick || lv.diffPct > pick.lv.diffPct) pick = { m, a, lv }
  }

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
        <h3 className="ty-body-strong mb-2 text-ink">📊 최근 급변동</h3>
        {movers.map(({ m, delta }) => (
          <Link key={m.id} href={`/market/${m.slug}`} className="ty-caption flex justify-between border-b border-divider py-2 last:border-0 last:pb-0">
            <span className="text-ink">{m.icon} {m.question.slice(0, 14)}…</span><span className={`ty-caption-strong nums ${delta >= 0 ? 'text-up' : 'text-down'}`}>{delta >= 0 ? '▲' : '▼'} {Math.round(Math.abs(delta) * 100)}%p</span>
          </Link>
        ))}
      </section>

      <section className="rounded-[18px] border border-hairline bg-pearl p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-parchment text-sm">🤖</span>
          <h3 className="ty-body-strong text-ink">AI 오늘의 픽</h3>
          <span className="ty-fine ml-auto inline-flex items-center gap-1 text-blue">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue" /> {loading ? '분석 중' : 'LIVE'}
          </span>
        </div>
        {pick ? (
          <Link href={`/market/${pick.m.slug}`} className="block">
            <p className="ty-caption-strong text-ink">{pick.m.icon} {pick.m.question}</p>
            <div className="ty-caption mt-2">
              <span className="text-muted">AI: </span>
              <span className={`ty-caption-strong nums ${pick.lv.lean === 'yes' ? 'text-up' : 'text-down'}`}>
                &apos;{pick.lv.lean === 'yes' ? '예' : '아니오'}&apos; {fmtPct(pick.lv.prob)}
              </span>
              <span className="text-muted nums"> (신뢰도 {pick.a.confidence}%)</span>
            </div>
            <div className="ty-fine nums mt-1 text-faint">시장가 {fmtPct(priceOf(pick.m))} 대비 {pick.lv.diffPct}%p 차이</div>
          </Link>
        ) : (
          <p className="ty-caption text-muted">{loading ? 'AI가 오늘의 픽을 고르는 중… 🤖' : '표시할 픽이 없어요'}</p>
        )}
      </section>
    </aside>
  )
}

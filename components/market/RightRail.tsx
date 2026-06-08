'use client'
import Link from 'next/link'
import { fmtPct, fmtPoints } from '@/lib/format'
import { useDemo } from '@/lib/demo/store'
import { useAiAnalyses } from '@/lib/ai/useAiAnalyses'
import type { AIAnalysis } from '@/lib/ai/fakeAnalyst'
import type { DemoMarket } from '@/lib/demo/seed'

export function RightRail({ markets }: { markets: DemoMarket[] }) {
  const { priceOf } = useDemo()
  const breaking = [...markets].sort((a, b) => Math.abs(priceOf(b) - 0.5) - Math.abs(priceOf(a) - 0.5)).slice(0, 3)
  const trending = [...markets].sort((a, b) => b.volume - a.volume).slice(0, 4)

  // 🤖 AI 오늘의 픽 — 홈 진입(마운트) 시 화면의 마켓 전체를 한 번의 호출(/api/analyze)에
  // 묶어 실제 Claude로 분석한다. 탭 전환은 재호출하지 않고(useAiAnalyses가 마운트 스냅샷
  // 고정), 캐시된 분석에서 현재 보이는 마켓 중 AI가 군중과 가장 크게 갈리는 마켓을 고른다.
  const { byId, loading } = useAiAnalyses(markets)
  let pick: { m: DemoMarket; a: AIAnalysis } | null = null
  for (const m of markets) {
    const a = byId[m.id]
    if (!a) continue
    if (!pick || Math.abs(a.vsCrowd) > Math.abs(pick.a.vsCrowd)) pick = { m, a }
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
        <h3 className="ty-body-strong mb-2 text-ink">인기 마켓 ›</h3>
        {trending.map(m => (
          <Link key={m.id} href={`/market/${m.slug}`} className="ty-caption flex justify-between border-b border-divider py-2 last:border-0 last:pb-0">
            <span className="text-ink">{m.icon} {m.question.slice(0, 14)}…</span><span className="text-faint nums">{fmtPoints(m.volume)} 🔥</span>
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
              <span className={`ty-caption-strong nums ${pick.a.lean === 'yes' ? 'text-up' : 'text-down'}`}>
                &apos;{pick.a.lean === 'yes' ? '예' : '아니오'}&apos; {fmtPct(pick.a.probYes)}
              </span>
              <span className="text-muted nums"> (신뢰도 {pick.a.confidence}%)</span>
            </div>
            <div className="ty-fine nums mt-1 text-faint">시장가 {fmtPct(priceOf(pick.m))} 대비 {Math.round(Math.abs(pick.a.vsCrowd) * 100)}%p 차이</div>
          </Link>
        ) : (
          <p className="ty-caption text-muted">{loading ? 'AI가 오늘의 픽을 고르는 중… 🤖' : '표시할 픽이 없어요'}</p>
        )}
      </section>
    </aside>
  )
}

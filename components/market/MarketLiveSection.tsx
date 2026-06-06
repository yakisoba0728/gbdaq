'use client'
import { useDemo } from '@/lib/demo/store'
import type { DemoMarket } from '@/lib/demo/seed'
import { LiveChart } from './LiveChart'
import { AnimatedPercent } from '@/components/ui/AnimatedPercent'
import { fmtPoints } from '@/lib/format'

// 마켓 라이브 섹션 — 큰 YES% + 차트 + 최근 활동.
// 가격/차트/내역은 DemoProvider가 4초마다 random-walk하며 자동 re-render → 구독 불필요.
export function MarketLiveSection({ m }: { m: DemoMarket }) {
  const { priceOf, ledger } = useDemo()
  const price = priceOf(m)
  // 이 마켓의 거래만 — signup_grant는 marketId가 없어 자연히 제외된다(ledger는 최신순).
  const activity = ledger.filter(t => t.marketId === m.id).slice(0, 12)

  return (
    <>
      <div className="rounded-[18px] border border-hairline bg-canvas p-4 shadow-product">
        <div className="mb-3 flex items-baseline gap-3 px-2 pt-1">
          <AnimatedPercent value={price} className="ty-display text-ink" />
          <span className="ty-caption text-muted">예 확률 · 실시간</span>
          <span className="ml-auto inline-flex items-center gap-1.5 ty-caption text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" /> LIVE
          </span>
        </div>
        <LiveChart points={m.history} height={240} />
      </div>
      <div className="rounded-[18px] border border-hairline bg-canvas p-6">
        <h3 className="mb-3 ty-body-strong text-ink">최근 거래 <span className="ty-caption text-faint">· 실시간</span></h3>
        {activity.length === 0 && <p className="ty-caption text-muted">아직 거래가 없어요.</p>}
        {activity.map(t => (
          <div key={t.id} className="flex items-center justify-between border-b border-divider py-2 last:border-0">
            <span className={`ty-caption-strong ${t.type === 'trade_buy' ? 'text-up' : 'text-down'}`}>{t.type === 'trade_buy' ? '매수' : '매도'}</span>
            <span className={`ty-caption-strong nums ${t.amount >= 0 ? 'text-up' : 'text-down'}`}>{t.amount >= 0 ? '+' : ''}{fmtPoints(t.amount)} <span className="ty-caption text-faint">상점</span></span>
          </div>
        ))}
      </div>
    </>
  )
}

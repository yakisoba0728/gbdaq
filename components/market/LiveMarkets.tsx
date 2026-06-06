'use client'
import type { DemoMarket } from '@/lib/demo/seed'
import { HeroMarket } from './HeroMarket'
import { RightRail } from './RightRail'
import { MarketCard } from './MarketCard'

// 홈 히어로 + "모든 마켓" 그리드. 가격은 DemoProvider가 4초마다 random-walk하며
// 자동 re-render → 별도 구독 없이 store에서 읽기만 하면 라이브로 움직인다.
export function LiveMarkets({ markets, hero }: { markets: DemoMarket[]; hero?: DemoMarket }) {
  return (
    <>
      {/* HERO — featured market, generous air */}
      {hero && (
        <section className="bg-parchment">
          <div className="mx-auto max-w-[1120px] px-6 py-20">
            <HeroMarket m={hero} />
          </div>
        </section>
      )}

      {/* 모든 마켓 — utility-card grid + sidebar rail */}
      <section id="markets" className="bg-canvas">
        <div className="mx-auto max-w-[1120px] px-6 py-16">
          <h2 className="ty-display-md mb-8 text-ink">모든 마켓</h2>
          {markets.length === 0 ? (
            <p className="ty-body rounded-[18px] border border-hairline bg-canvas px-6 py-12 text-center text-muted">표시할 마켓이 없어요</p>
          ) : (
            <div className="grid grid-cols-[1fr_320px] gap-6 max-lg:grid-cols-1">
              <div className="grid grid-cols-3 gap-6 max-xl:grid-cols-2 max-sm:grid-cols-1">
                {markets.map(m => <MarketCard key={m.id} m={m} />)}
              </div>
              <RightRail markets={markets} />
            </div>
          )}
        </div>
      </section>
    </>
  )
}

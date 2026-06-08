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
      {/* 첫 진입 안내 — 항상 정적으로 렌더(상태/ localStorage 의존 금지, 하이드레이션 안전).
          bg-blue/5: parchment 히어로와 같은 색이 되지 않게 살짝 띄운 인포 배너(Nav 잔액칩과 동일 토큰). */}
      <div className="border-b border-hairline bg-blue/5">
        <p className="mx-auto max-w-[1120px] px-6 py-2 text-center ty-caption text-muted">💰 가입하면 30상점 지급 · 언제든 ↺ 버튼으로 처음부터 다시 시작</p>
      </div>

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
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 xl:gap-6">
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

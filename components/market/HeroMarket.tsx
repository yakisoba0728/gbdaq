'use client'
import Link from 'next/link'
import { fmtPoints } from '@/lib/format'
import { useDemo } from '@/lib/demo/store'
import type { DemoMarket } from '@/lib/demo/seed'
import { LiveChart } from './LiveChart'
import { AnimatedPercent } from '@/components/ui/AnimatedPercent'

export function HeroMarket({ m }: { m: DemoMarket }) {
  const { priceOf } = useDemo()
  // 가격/차트는 DemoProvider의 4초 random-walk로 자동 갱신(별도 구독 없음).
  const shown = priceOf(m)

  return (
    <section className="grid grid-cols-2 items-center gap-12 max-lg:grid-cols-1 max-lg:gap-8">
      <div>
        <div className="ty-caption-strong mb-4 flex items-center gap-2 text-muted">
          <span>{m.icon} 피처드 마켓</span>
          <span className="ty-fine inline-flex items-center gap-1 text-up">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" />LIVE
          </span>
        </div>
        <h1 className="ty-display text-ink">{m.question}</h1>
        {m.rules && <p className="ty-lead mt-3 text-muted">{m.rules}</p>}

        <div className="mt-7 grid max-w-md grid-cols-2 gap-3">
          <div className="rounded-[12px] border border-up/25 bg-upbg px-4 py-3">
            <div className="ty-caption-strong text-up">예</div>
            <AnimatedPercent value={shown} className="ty-display leading-none text-up" />
          </div>
          <div className="rounded-[12px] border border-down/25 bg-downbg px-4 py-3">
            <div className="ty-caption-strong text-down">아니오</div>
            <AnimatedPercent value={1 - shown} className="ty-display leading-none text-down" />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={`/market/${m.slug}`}
            className="ty-body rounded-full bg-blue px-[22px] py-[11px] text-white transition active:scale-95">거래하기</Link>
          <Link href="#markets"
            className="ty-body rounded-full border border-blue px-[22px] py-[11px] text-blue transition active:scale-95">둘러보기</Link>
          <span className="ty-caption text-faint">💰 <span className="nums">{fmtPoints(m.volume)}</span> 상점 거래량</span>
        </div>
      </div>

      <Link href={`/market/${m.slug}`} className="shadow-product block rounded-[18px] border border-hairline bg-canvas p-6">
        <LiveChart points={m.history} height={300} />
      </Link>
    </section>
  )
}

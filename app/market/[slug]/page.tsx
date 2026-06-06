'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useDemo } from '@/lib/demo/store'
import { MarketLiveSection } from '@/components/market/MarketLiveSection'
import { AIAnalyst } from '@/components/ai/AIAnalyst'
import { TradePanel } from '@/components/market/TradePanel'
import { PositionBox } from '@/components/market/PositionBox'
import { fmtPoints } from '@/lib/format'

export default function MarketPage() {
  const { slug } = useParams<{ slug: string }>()
  const m = useDemo().getMarket(slug)

  if (!m) {
    return (
      <div className="mx-auto flex max-w-[1120px] flex-col items-center px-6 py-32 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-parchment text-3xl">🔍</span>
        <h1 className="ty-display-md text-ink">마켓을 찾을 수 없어요</h1>
        <p className="mt-2 ty-body text-muted">주소가 바뀌었거나 사라진 마켓일 수 있어요.</p>
        <Link href="/" className="mt-6 rounded-full bg-blue px-5 py-2.5 ty-caption-strong text-white transition active:scale-95">홈으로 돌아가기</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-12">
      {/* 헤더 — 전체 폭, 그리드 위 */}
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-parchment text-lg">{m.icon}</span>
          <span className="ty-caption text-muted">{m.category}</span>
        </div>
        <h1 className="ty-display text-ink">{m.question}</h1>
        <div className="mt-3 ty-caption text-faint">💰 <span className="nums">{fmtPoints(m.volume)}</span> 상점 거래량</div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-6">
          <MarketLiveSection m={m} />
          <AIAnalyst m={m} />
          {m.rules && (
            <div className="rounded-[18px] border border-hairline bg-canvas p-6">
              <h3 className="mb-2 ty-body-strong text-ink">규칙 · 마켓 맥락</h3>
              <p className="ty-body text-muted">{m.rules}</p>
            </div>
          )}
        </div>
        <div className="lg:sticky lg:top-[68px] max-lg:order-first">
          <TradePanel m={m} />
          <PositionBox m={m} />
        </div>
      </div>
    </div>
  )
}

'use client'
import Link from 'next/link'
import { useDemo } from '@/lib/demo/store'
import { fmtPoints, fmtPct } from '@/lib/format'

const TX_LABEL: Record<string, string> = { signup_grant: '가입 지급', trade_buy: '매수', trade_sell: '매도' }

export default function Portfolio() {
  const { balance, positions, markets, ledger, priceOf } = useDemo()

  const posValue = markets.reduce((sum, m) => {
    const p = positions[m.id]
    if (!p) return sum
    return sum + p.yes * priceOf(m) + p.no * (1 - priceOf(m))
  }, 0)

  const held = markets.filter(m => {
    const p = positions[m.id]
    return p && (p.yes > 0.5 || p.no > 0.5)
  })

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-12">
      <h1 className="mb-8 ty-display text-ink">내 지갑</h1>
      <div className="mb-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[18px] border border-hairline bg-canvas p-6"><div className="ty-caption text-muted">상점 잔액</div><div className="mt-1 ty-display-md nums text-ink">{fmtPoints(balance)}</div></div>
        <div className="rounded-[18px] border border-hairline bg-canvas p-6"><div className="ty-caption text-muted">보유 포지션 평가액</div><div className="mt-1 ty-display-md nums text-ink">{fmtPoints(posValue)}</div></div>
      </div>

      <h2 className="mb-4 ty-body-strong text-ink">보유 포지션</h2>
      <div className="mb-12 rounded-[18px] border border-hairline bg-canvas">
        {held.length === 0 && <p className="px-6 py-10 text-center ty-caption text-muted">아직 보유한 포지션이 없어요. <Link href="/" className="text-blue">마켓 둘러보기 →</Link></p>}
        {held.map(m => {
          const p = positions[m.id]
          const py = priceOf(m)
          return (
            <Link key={m.id} href={`/market/${m.slug}`} className="flex items-center gap-3 border-b border-divider px-6 py-4 transition first:rounded-t-[18px] last:rounded-b-[18px] last:border-0 hover:bg-pearl">
              <span className="text-lg">{m.icon}</span>
              <span className="flex-1 truncate ty-body text-ink">{m.question}</span>
              {p.yes > 0.5 && <span className="rounded-full bg-upbg px-2.5 py-0.5 ty-caption-strong nums text-up">예 {Math.round(p.yes)}주</span>}
              {p.no > 0.5 && <span className="rounded-full bg-downbg px-2.5 py-0.5 ty-caption-strong nums text-down">아니오 {Math.round(p.no)}주</span>}
              <span className="w-16 text-right ty-caption nums text-muted">{fmtPct(py)}</span>
            </Link>
          )
        })}
      </div>

      <h2 className="mb-4 ty-body-strong text-ink">거래 내역</h2>
      <div className="rounded-[18px] border border-hairline bg-canvas">
        {ledger.map(t => (
          <div key={t.id} className="flex items-center justify-between border-b border-divider px-6 py-3 last:border-0">
            <span className="ty-caption text-muted">{TX_LABEL[t.type] ?? t.type}</span>
            <span className={`ty-caption-strong nums ${t.amount >= 0 ? 'text-up' : 'text-down'}`}>{t.amount >= 0 ? '+' : ''}{fmtPoints(t.amount)}</span>
            <span className="w-24 text-right ty-caption nums text-faint">{fmtPoints(t.balanceAfter)} 상점</span>
          </div>
        ))}
      </div>
    </div>
  )
}

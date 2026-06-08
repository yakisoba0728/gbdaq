'use client'
import { useState, useMemo } from 'react'
import type { Side } from '@/lib/types'
import type { DemoMarket } from '@/lib/demo/seed'
import { useDemo } from '@/lib/demo/store'
import { sharesForAmount, proceedsForSell } from '@/lib/lmsr'
import { fmtPct, fmtPoints } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'

export function TradePanel({ m }: { m: DemoMarket }) {
  const { buy, sell, priceOf, positions } = useDemo()
  const toast = useToast()
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [side, setSide] = useState<Side>('yes')
  const [amount, setAmount] = useState(5)    // 매수: 상점 금액 (희소 경제 — 1단위)
  const [shares, setShares] = useState(1)     // 매도: 지분 수
  const [msg, setMsg] = useState('')
  const held = side === 'yes' ? (positions[m.id]?.yes || 0) : (positions[m.id]?.no || 0)
  const pYes = priceOf(m)

  const preview = useMemo(() => {
    if (mode === 'buy') { if (amount <= 0) return null; return sharesForAmount(m.qYes, m.qNo, m.b, side, amount) }
    if (shares <= 0) return null
    const proceeds = proceedsForSell(m.qYes, m.qNo, m.b, side, shares)
    return { shares, cost: -proceeds, priceAfter: 0 }
  }, [m, mode, side, amount, shares])

  function submit() {
    setMsg('')
    const res = mode === 'buy' ? buy(m.slug, side, amount) : sell(m.slug, side, shares)
    if (res.error) {
      const friendly = res.error === 'insufficient balance' ? '상점이 부족해요 😭' : res.error === 'insufficient shares' ? '그만큼은 안 갖고 있어요' : res.error
      setMsg(friendly); toast(friendly, 'err'); return
    }
    setMsg(mode === 'buy' ? '탑승 완료 🚀' : '매도 완료 💸'); toast(mode === 'buy' ? '탑승 완료 🚀' : '매도 완료 💸', 'ok')
  }

  return (
    <div className="rounded-[18px] border border-hairline bg-canvas p-6">
      <div className="mb-4 flex gap-1 rounded-full bg-pearl p-1">
        <button onClick={() => setMode('buy')} className={`flex-1 rounded-full py-2 ty-caption-strong transition ${mode === 'buy' ? 'border border-hairline bg-canvas text-ink' : 'text-muted'}`}>매수</button>
        <button onClick={() => setMode('sell')} className={`flex-1 rounded-full py-2 ty-caption-strong transition ${mode === 'sell' ? 'border border-hairline bg-canvas text-ink' : 'text-muted'}`}>매도</button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <button onClick={() => setSide('yes')} className={`rounded-[11px] py-3 ty-body-strong nums transition active:scale-95 ${side === 'yes' ? 'bg-upbg text-up ring-2 ring-up' : 'bg-pearl text-muted'}`}>예 {fmtPct(pYes)}</button>
        <button onClick={() => setSide('no')} className={`rounded-[11px] py-3 ty-body-strong nums transition active:scale-95 ${side === 'no' ? 'bg-downbg text-down ring-2 ring-down' : 'bg-pearl text-muted'}`}>아니오 {fmtPct(1 - pYes)}</button>
      </div>

      {mode === 'buy' ? (
        <>
          <label htmlFor="trade-amount" className="ty-caption text-muted">금액 (상점)</label>
          <input id="trade-amount" type="number" min={1} step={1} value={amount} onChange={e => setAmount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="mb-3 mt-1.5 w-full rounded-[11px] border border-hairline bg-pearl px-4 py-3 ty-display-md nums text-ink focus-visible:outline-2 focus-visible:outline-bluefocus" />
          <div className="mb-4 flex gap-2">{[1, 5, 10].map(v => <button key={v} onClick={() => setAmount(a => a + v)} className="flex-1 rounded-full bg-pearl py-2.5 ty-caption nums text-muted transition active:scale-95">+{v}</button>)}</div>
        </>
      ) : (
        <>
          <label htmlFor="trade-shares" className="flex justify-between ty-caption text-muted">지분 수<span className="nums">보유 {Math.round(held)}주</span></label>
          <input id="trade-shares" type="number" min={1} step={1} max={Math.floor(held)} value={shares} onChange={e => setShares(Math.max(1, Math.min(Math.floor(held) || 1, Math.floor(Number(e.target.value) || 1))))} disabled={held < 1} className="mb-3 mt-1.5 w-full rounded-[11px] border border-hairline bg-pearl px-4 py-3 ty-display-md nums text-ink focus-visible:outline-2 focus-visible:outline-bluefocus" />
          <div className="mb-4 flex gap-2"><button onClick={() => setShares(Math.floor(held))} disabled={held < 1} className="flex-1 rounded-full bg-pearl py-2 ty-caption nums text-muted transition active:scale-95">전량 ({Math.round(held)}주)</button></div>
        </>
      )}

      {preview && (
        <div className="mb-4 rounded-[11px] bg-pearl p-3 ty-caption text-muted">
          {mode === 'buy'
            ? <>예상 지분 <b className="ty-caption-strong nums text-ink">{Math.round(preview.shares)}주</b> · 정산 시 최대 <b className="ty-caption-strong nums text-ink">{Math.round(preview.shares)} 상점</b></>
            : <>예상 수령 <b className="ty-caption-strong nums text-ink">{fmtPoints(Math.max(0, -preview.cost))} 상점</b></>}
        </div>
      )}
      <p className="mb-3 ty-fine text-faint">ℹ️ ‘한 주’는 정산 때 예측이 맞으면 1상점, 틀리면 0상점이 돼요.</p>
      <button onClick={submit} disabled={mode === 'sell' && held < 1} className="w-full rounded-full bg-blue py-[13px] ty-body text-white transition active:scale-95 disabled:opacity-50">
        거래
      </button>
      {msg && <p className="mt-2.5 text-center ty-caption text-muted">{msg}</p>}
    </div>
  )
}

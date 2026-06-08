'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { priceYes, sharesForAmount, proceedsForSell } from '@/lib/lmsr'
import type { Side } from '@/lib/types'
import { SEED_MARKETS, DEMO_USERS, START_BALANCE, type DemoMarket } from './seed'

const LS_KEY = 'gbdaq-demo-v2' // bumped: v1 had the old 10000/b=200 economy (incompatible q values)
const TICK_MS = 4000
const CAP = 120

export type Positions = Record<string, { yes: number; no: number }>
export type Tx = { id: string; type: 'signup_grant' | 'trade_buy' | 'trade_sell'; amount: number; balanceAfter: number; ts: number; marketId?: string }
type Store = { markets: DemoMarket[]; balance: number; positions: Positions; ledger: Tx[] }

interface DemoApi extends Store {
  buy: (slug: string, side: Side, amount: number) => { error?: string }
  sell: (slug: string, side: Side, shares: number) => { error?: string }
  getMarket: (slug: string) => DemoMarket | undefined
  priceOf: (m: DemoMarket) => number
  leaderboard: { name: string; balance: number; color: string; me?: boolean }[]
  reset: () => void
}
const Ctx = createContext<DemoApi | null>(null)
export const useDemo = () => { const c = useContext(Ctx); if (!c) throw new Error('useDemo must be used within DemoProvider'); return c }

const rid = () => Math.random().toString(36).slice(2, 10)
const freshSeed = (): Store => ({
  markets: SEED_MARKETS.map(m => ({ ...m, history: [...m.history] })),
  balance: START_BALANCE,
  positions: {},
  ledger: [{ id: rid(), type: 'signup_grant', amount: START_BALANCE, balanceAfter: START_BALANCE, ts: 0 }],
})

export function DemoProvider({ children }: { children: React.ReactNode }) {
  // SSR + first client render use the deterministic seed (no hydration mismatch);
  // localStorage is loaded right after mount.
  const [s, setS] = useState<Store>(freshSeed)
  const loaded = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const p = JSON.parse(raw) as { balance: number; positions: Positions; ledger: Tx[]; markets: { id: string; qYes: number; qNo: number; volume: number; history: number[] }[] }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from persisted localStorage on mount; SSR + first render use the deterministic seed (same pattern as ThemeProvider)
        setS({
          balance: p.balance ?? START_BALANCE,
          positions: p.positions ?? {},
          ledger: p.ledger?.length ? p.ledger : freshSeed().ledger,
          markets: SEED_MARKETS.map(sm => {
            const pm = p.markets?.find(x => x.id === sm.id)
            return pm ? { ...sm, qYes: pm.qYes, qNo: pm.qNo, volume: pm.volume, history: pm.history?.length ? pm.history.slice(-CAP) : [...sm.history] } : { ...sm, history: [...sm.history] }
          }),
        })
      }
    } catch { /* corrupt storage — keep seed */ }
    loaded.current = true
  }, [])

  // persist after every change (once loaded)
  useEffect(() => {
    if (!loaded.current) return
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        balance: s.balance, positions: s.positions, ledger: s.ledger,
        markets: s.markets.map(m => ({ id: m.id, qYes: m.qYes, qNo: m.qNo, volume: m.volume, history: m.history.slice(-CAP) })),
      }))
    } catch {}
  }, [s])

  // client price engine — random walk each market every tick (per-device, no server)
  useEffect(() => {
    const id = setInterval(() => {
      setS(prev => ({
        ...prev,
        markets: prev.markets.map(m => {
          const p = priceYes(m.qYes, m.qNo, m.b)
          // 실제 주식처럼 더 큰 변동성: 평소 ±~3.5%p, 가끔(20%) ±~8%p 점프.
          const shock = Math.random() < 0.2 ? (Math.random() - 0.5) * 0.16 : (Math.random() - 0.5) * 0.07
          // 약한 평균회귀 — 0.5가 아니라 각 마켓 고유 시드 수준(target)으로 당겨 극단 고착·전 마켓 50% 수렴 방지.
          const drift = (m.target - p) * 0.025
          const np = Math.min(0.97, Math.max(0.03, p + drift + shock))
          const qYes = m.qNo + m.b * Math.log(np / (1 - np))
          return { ...m, qYes, history: [...m.history, np].slice(-CAP), volume: m.volume + Math.random() * 2 }
        }),
      }))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  const buy = useCallback((slug: string, side: Side, amount: number) => {
    let error: string | undefined
    setS(prev => {
      const m = prev.markets.find(x => x.slug === slug)
      if (!m) { error = 'not found'; return prev }
      if (!(amount > 0)) { error = 'amount'; return prev }
      if (prev.balance < amount) { error = 'insufficient balance'; return prev }
      const { shares } = sharesForAmount(m.qYes, m.qNo, m.b, side, amount)
      const sh = Math.max(1, Math.round(shares)) // whole-unit shares (scarce integer economy)
      const qYes = side === 'yes' ? m.qYes + sh : m.qYes
      const qNo = side === 'no' ? m.qNo + sh : m.qNo
      const np = priceYes(qYes, qNo, m.b)
      const balance = prev.balance - amount
      return {
        markets: prev.markets.map(x => x.id === m.id ? { ...x, qYes, qNo, volume: x.volume + amount, history: [...x.history, np].slice(-CAP) } : x),
        balance,
        positions: { ...prev.positions, [m.id]: { yes: (prev.positions[m.id]?.yes || 0) + (side === 'yes' ? sh : 0), no: (prev.positions[m.id]?.no || 0) + (side === 'no' ? sh : 0) } },
        ledger: [{ id: rid(), type: 'trade_buy' as const, amount: -amount, balanceAfter: balance, ts: Date.now(), marketId: m.id }, ...prev.ledger].slice(0, 100),
      }
    })
    return error ? { error } : {}
  }, [])

  const sell = useCallback((slug: string, side: Side, shares: number) => {
    let error: string | undefined
    setS(prev => {
      const m = prev.markets.find(x => x.slug === slug)
      if (!m) { error = 'not found'; return prev }
      if (!(shares > 0)) { error = 'shares'; return prev }
      const held = side === 'yes' ? (prev.positions[m.id]?.yes || 0) : (prev.positions[m.id]?.no || 0)
      if (held < shares) { error = 'insufficient shares'; return prev }
      const proc = Math.round(proceedsForSell(m.qYes, m.qNo, m.b, side, shares)) // whole 상점
      const qYes = side === 'yes' ? m.qYes - shares : m.qYes
      const qNo = side === 'no' ? m.qNo - shares : m.qNo
      const np = priceYes(qYes, qNo, m.b)
      const balance = prev.balance + proc
      return {
        markets: prev.markets.map(x => x.id === m.id ? { ...x, qYes, qNo, volume: x.volume + Math.abs(proc), history: [...x.history, np].slice(-CAP) } : x),
        balance,
        positions: { ...prev.positions, [m.id]: { yes: (prev.positions[m.id]?.yes || 0) - (side === 'yes' ? shares : 0), no: (prev.positions[m.id]?.no || 0) - (side === 'no' ? shares : 0) } },
        ledger: [{ id: rid(), type: 'trade_sell' as const, amount: proc, balanceAfter: balance, ts: Date.now(), marketId: m.id }, ...prev.ledger].slice(0, 100),
      }
    })
    return error ? { error } : {}
  }, [])

  const getMarket = useCallback((slug: string) => s.markets.find(m => m.slug === slug), [s.markets])
  const priceOf = useCallback((m: DemoMarket) => priceYes(m.qYes, m.qNo, m.b), [])
  const reset = useCallback(() => { try { localStorage.removeItem(LS_KEY) } catch {}; setS(freshSeed()) }, [])

  const leaderboard = [
    ...DEMO_USERS.map(u => ({ ...u })),
    { name: '나 (게스트)', balance: s.balance, color: '#7c3aed', me: true },
  ].sort((a, b) => b.balance - a.balance)

  return <Ctx.Provider value={{ ...s, buy, sell, getMarket, priceOf, leaderboard, reset }}>{children}</Ctx.Provider>
}

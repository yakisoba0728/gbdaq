'use client'
import { useDemo } from '@/lib/demo/store'
import { fmtPoints } from '@/lib/format'

export default function Leaderboard() {
  const { leaderboard } = useDemo()
  return (
    <div className="mx-auto max-w-[1120px] px-6 py-12">
      <h1 className="mb-8 ty-display text-ink">🏆 랭킹</h1>
      <div className="rounded-[18px] border border-hairline bg-canvas">
        {leaderboard.map((p, i) => (
          <div key={p.name} className={`flex items-center gap-4 border-b border-divider px-6 py-4 first:rounded-t-[18px] last:rounded-b-[18px] last:border-0 ${p.me ? 'bg-pearl' : ''}`}>
            <span className={`w-8 text-center ty-body-strong nums ${i < 3 ? 'text-blue' : 'text-faint'}`}>{i + 1}</span>
            <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="flex-1 ty-body-strong text-ink">{p.name}</span>
            <span className="ty-body nums text-ink">{fmtPoints(p.balance)} <span className="ty-caption text-muted">상점</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

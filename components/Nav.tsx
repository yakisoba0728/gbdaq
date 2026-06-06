'use client'
import Link from 'next/link'
import { ThemeToggle } from './theme/ThemeToggle'
import { fmtPoints } from '@/lib/format'
import { useDemo } from '@/lib/demo/store'

export function Nav() {
  const { balance, reset } = useDemo()
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-[52px] max-w-[1120px] items-center gap-5 px-6">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="ty-tagline text-ink">GBDAQ</span>
          <span className="h-1.5 w-1.5 rounded-full bg-blue" aria-hidden />
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/leaderboard" className="ty-caption text-muted transition hover:text-ink">랭킹</Link>
          <Link href="/portfolio" className="ty-caption text-muted transition hover:text-ink">내 지갑</Link>
          <span className="ty-caption-strong nums rounded-[11px] border border-divider bg-pearl px-3 py-1.5 text-ink">
            💰 {fmtPoints(balance)} 상점
          </span>
          <button
            type="button"
            onClick={reset}
            title="데모 초기화"
            className="ty-caption text-faint transition hover:text-ink"
          >
            리셋
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

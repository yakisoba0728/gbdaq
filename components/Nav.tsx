'use client'
import Link from 'next/link'
import { ThemeToggle } from './theme/ThemeToggle'
import { fmtPoints } from '@/lib/format'
import { useDemo } from '@/lib/demo/store'

export function Nav() {
  const { balance, reset } = useDemo()
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-[52px] max-w-[1120px] items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <span className="ty-tagline text-ink">GBDAQ</span>
          <span className="h-1.5 w-1.5 rounded-full bg-blue" aria-hidden />
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-4">
          <Link href="/leaderboard" className="ty-caption shrink-0 whitespace-nowrap text-muted transition hover:text-ink">랭킹</Link>
          <Link href="/portfolio" className="ty-caption shrink-0 whitespace-nowrap text-muted transition hover:text-ink">내 지갑</Link>
          <span className="ty-caption-strong nums shrink-0 whitespace-nowrap rounded-full border border-blue/30 bg-blue/5 px-2.5 py-1.5 text-ink sm:px-3">
            💰 {fmtPoints(balance)}<span className="hidden sm:inline"> 상점</span>
          </span>
          <button
            type="button"
            onClick={() => { if (confirm('정말 처음부터 다시 시작할까요? 잔액·포지션·거래내역이 초기화돼요.')) reset() }}
            title="처음부터 (흑역사 리셋)"
            aria-label="데모 리셋"
            className="flex h-7 w-7 shrink-0 items-center justify-center gap-1 rounded-full text-[15px] text-faint transition hover:bg-pearl hover:text-ink sm:w-auto sm:px-2.5"
          >
            ↺<span className="hidden ty-caption sm:inline">리셋</span>
          </button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}

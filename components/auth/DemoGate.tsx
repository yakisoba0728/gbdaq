'use client'
// Demo-access wall. Checks session status on mount; shows a password form until the
// visitor authenticates, then renders the app. The REAL enforcement is server-side in
// /api/analyze (session cookie check) — this gate is the UX layer. Keeping children
// unmounted until authed also means no /api/analyze call fires before login.
import { useEffect, useState } from 'react'

export function DemoGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null) // null = checking
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/auth', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { authed: false }))
      .then(d => { if (alive) setAuthed(!!d.authed) })
      .catch(() => { if (alive) setAuthed(false) })
    return () => { alive = false }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setError(''); setBusy(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
        cache: 'no-store',
      })
      if (res.ok) { setAuthed(true); return }
      setError(res.status === 401 ? '비밀번호가 틀렸어요.' : res.status === 429 ? '너무 많이 시도했어요. 잠시 후 다시 시도해 주세요.' : '지금은 입장할 수 없어요. 잠시 후 다시 시도해 주세요.')
    } catch {
      setError('네트워크 오류예요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  // First paint (server + first client render) is always this neutral state → no
  // hydration mismatch; the effect then resolves to the app or the form.
  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <span className="ty-caption text-faint">불러오는 중…</span>
      </div>
    )
  }

  if (authed) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm rounded-[18px] border border-hairline bg-canvas p-8 shadow-product">
        <div className="mb-3 flex items-center gap-1.5">
          <span className="ty-tagline text-ink">GBDAQ</span>
          <span className="h-1.5 w-1.5 rounded-full bg-blue" aria-hidden />
        </div>
        <h1 className="ty-body-strong text-ink">데모 접속</h1>
        <p className="mt-1 ty-caption text-muted">초대된 분만 입장할 수 있어요. 비밀번호를 입력해 주세요.</p>
        <form onSubmit={submit} className="mt-5">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            aria-label="데모 비밀번호"
            className="w-full rounded-[11px] border border-hairline bg-pearl px-4 py-3 ty-body text-ink focus-visible:outline-2 focus-visible:outline-bluefocus"
          />
          {error && <p className="mt-2 ty-caption text-down">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="mt-3 w-full rounded-full bg-blue py-[13px] ty-body text-white transition active:scale-95 disabled:opacity-50"
          >
            {busy ? '확인 중…' : '입장'}
          </button>
        </form>
      </div>
    </div>
  )
}

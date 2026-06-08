// Demo-access auth. Holds DEMO_PASSWORD (server env) and issues a signed, HttpOnly
// session cookie on a correct password. The cookie is what authorizes the paid
// /api/analyze route — so an unauthenticated visitor can never trigger a model call.
import { cookies } from 'next/headers'
import { signSession, verifySession, passwordMatches, SESSION_COOKIE, SESSION_MAX_AGE_S } from '@/lib/auth/session'

export const runtime = 'nodejs' // node:crypto in the session lib needs the Node runtime

const nowS = () => Math.floor(Date.now() / 1000)

// Status — DemoGate calls this on mount to decide whether to show the wall.
export async function GET() {
  const secret = process.env.DEMO_PASSWORD ?? ''
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return Response.json({ authed: verifySession(secret, token, nowS()) })
}

// Login — correct password → set the signed session cookie.
export async function POST(request: Request) {
  const secret = process.env.DEMO_PASSWORD
  if (!secret) return Response.json({ error: 'auth not configured' }, { status: 500 })

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ ok: false }, { status: 400 }) }
  const password = (body as { password?: unknown } | null)?.password
  if (!passwordMatches(password, secret)) return Response.json({ ok: false }, { status: 401 })

  ;(await cookies()).set(SESSION_COOKIE, signSession(secret, nowS()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  })
  return Response.json({ ok: true })
}

// Logout — clear the cookie.
export async function DELETE() {
  ;(await cookies()).set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return Response.json({ ok: true })
}

// Server-only Route Handler. Holds the Anthropic API key (server env) and proxies
// a single batched analysis request to Claude Haiku via forced tool use. The browser
// never sees the key. Defense: require a valid demo session, validate body, cap markets at
// MAX_MARKETS, and bound per-market input length (lib/ai/realAnalyst). No caching.
import Anthropic from '@anthropic-ai/sdk'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/session'
import { ANALYZE_SCHEMA, SYSTEM_PROMPT, buildUserContent, validPayload, MAX_MARKETS, type MarketPayload, type RawResult } from '@/lib/ai/realAnalyst'
import { take, bumpDaily, clientIp, ANALYZE_SESSION, ANALYZE_IP, ANALYZE_DAILY, analyzeSessionStore, analyzeIpStore, dailyState } from '@/lib/rateLimit'

export const runtime = 'nodejs' // Anthropic SDK needs the Node runtime (not edge)

export async function POST(request: Request) {
  // Kill switch: hard-disable the paid path (model never called) → client falls back.
  if (process.env.ANALYZE_DISABLED === '1') return Response.json({ error: 'disabled' }, { status: 503 })

  // Demo-access gate: reject anyone without a valid session BEFORE any (paid) model call.
  const secret = process.env.DEMO_PASSWORD ?? ''
  const session = (await cookies()).get(SESSION_COOKIE)?.value
  if (!verifySession(secret, session, Math.floor(Date.now() / 1000))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  // Session is a validated opaque token past this point; narrow for the rate-limit key.
  const token = session ?? ''

  const now = Date.now()
  const ip = clientIp(request)
  // Per-session rate limit (1차 방어선) — key is the validated session token.
  const s = take(analyzeSessionStore, token, ANALYZE_SESSION.limit, ANALYZE_SESSION.windowMs, now)
  if (!s.ok) return Response.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(s.retryAfterMs / 1000)) } })
  // Per-IP rate limit (보조 방어선).
  const sIp = take(analyzeIpStore, ip, ANALYZE_IP.limit, ANALYZE_IP.windowMs, now)
  if (!sIp.ok) return Response.json({ error: 'rate' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(sIp.retryAfterMs / 1000)) } })

  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }

  const markets = (body as { markets?: unknown } | null)?.markets
  if (!Array.isArray(markets) || markets.length === 0 || markets.length > MAX_MARKETS || !markets.every(validPayload)) {
    return Response.json({ error: 'invalid markets' }, { status: 400 })
  }

  // Global daily budget — checked AFTER validation so invalid payloads never consume it.
  if (!bumpDaily(dailyState, ANALYZE_DAILY, now).ok) return Response.json({ error: 'budget' }, { status: 503 })

  try {
    const client = new Anthropic() // reads ANTHROPIC_API_KEY from the environment
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096, // 2-sentence rationales; lowered from 8192 to cap worst-case output cost
      system: SYSTEM_PROMPT,
      // `as unknown as` bridges our readonly JSON-schema literal into the SDK's input_schema type.
      tools: [{ name: 'submit_analyses', description: '각 마켓 분석 결과를 제출한다.', input_schema: ANALYZE_SCHEMA as unknown as Anthropic.Tool['input_schema'] }],
      tool_choice: { type: 'tool', name: 'submit_analyses' },
      messages: [{ role: 'user', content: buildUserContent(markets as MarketPayload[]) }],
    })
    const block = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const results = block ? ((block.input as { results?: RawResult[] }).results ?? []) : []
    return Response.json({ results })
  } catch {
    // Missing key, rate limit, network, etc. → client falls back to the heuristic.
    return Response.json({ error: 'upstream' }, { status: 502 })
  }
}

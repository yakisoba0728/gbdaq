// Server route for batched analyst output. This path is heuristic-only: no SDK,
// no external model, no API key, and no demo password/session requirement.
import { validPayload, canonicalizeMarkets, heuristicResults, MAX_MARKETS, type MarketPayload } from '@/lib/ai/realAnalyst'

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }

  const markets = (body as { markets?: unknown } | null)?.markets
  if (!Array.isArray(markets) || markets.length === 0 || markets.length > MAX_MARKETS || !markets.every(validPayload)) {
    return Response.json({ error: 'invalid markets' }, { status: 400 })
  }

  // CAN-001: bind to server-owned seed markets — drop unknown ids and replace the caller's
  // question with the canonical seed question, so caller free text never enters the prompt.
  const canon = canonicalizeMarkets(markets as MarketPayload[])
  if (canon.length === 0) return Response.json({ error: 'invalid markets' }, { status: 400 })

  return Response.json({ results: heuristicResults(canon) })
}

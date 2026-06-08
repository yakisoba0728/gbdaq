// Server-only Route Handler. Holds the Anthropic API key (server env) and proxies
// a single batched analysis request to Claude Haiku via forced tool use. The browser
// never sees the key. Defense: validate body + cap markets at MAX_MARKETS. No caching.
import Anthropic from '@anthropic-ai/sdk'
import { ANALYZE_SCHEMA, SYSTEM_PROMPT, buildUserContent, validPayload, MAX_MARKETS, type MarketPayload, type RawResult } from '@/lib/ai/realAnalyst'

export const runtime = 'nodejs' // Anthropic SDK needs the Node runtime (not edge)

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return Response.json({ error: 'bad json' }, { status: 400 }) }

  const markets = (body as { markets?: unknown } | null)?.markets
  if (!Array.isArray(markets) || markets.length === 0 || markets.length > MAX_MARKETS || !markets.every(validPayload)) {
    return Response.json({ error: 'invalid markets' }, { status: 400 })
  }

  try {
    const client = new Anthropic() // reads ANTHROPIC_API_KEY from the environment
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8192,
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

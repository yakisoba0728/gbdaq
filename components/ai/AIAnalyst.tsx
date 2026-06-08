'use client'
// 지비닥 AI 애널리스트 — 디테일 페이지 패널.
// 이제 실제 Claude(Haiku) 호출 결과를 보여준다. 페이지 진입(마운트) 시 /api/analyze를
// 딱 1회 호출하고, "분석 중…" 셔머가 실제 네트워크 지연을 덮는다. 새로고침=재호출.
// 실패하면 마켓별 휴리스틱(fakeAnalyst)으로 폴백한다(useAiAnalyses 내부).
// 시세(군중 확률)는 DemoProvider가 4초마다 갱신된다. AI '관점'(edge=군중과의 괴리)을 잡아
// 현재가에 다시 앵커(liveView)하므로 "AI 예측" 숫자는 매 틱 차트를 따라간다 → 시장가와
// 절대 멀어져 보이지 않음. 진짜 재분석(rationale/edge 갱신)은 useAiAnalyses가 길게(90s) 한다.
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { DemoMarket } from '@/lib/demo/seed'
import { useDemo } from '@/lib/demo/store'
import { useAiAnalyses } from '@/lib/ai/useAiAnalyses'
import { liveView } from '@/lib/ai/realAnalyst'
import { fmtPct } from '@/lib/format'

const ACCENT = 'var(--blue)'

function projectedOutcome(price: number) {
  const yes = Math.round(price * 100)
  const no = 100 - yes
  const winYes = yes >= no
  const margin = Math.abs(yes - no)
  const tag = margin >= 40 ? '사실상 게임 끝 분위기'
    : margin >= 20 ? '확실한 우세'
    : margin >= 8 ? '근소 우세'
    : '초접전, 동전 던지기 각'
  return { yes, no, winYes, margin, tag }
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map(i => (
        <motion.span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} />
      ))}
    </span>
  )
}

function Typewriter({ text, enabled }: { text: string; enabled: boolean }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!enabled) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset typewriter when text/enabled changes, before the interval types it out
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i += 2
      if (i >= text.length) { setN(text.length); clearInterval(id) }
      else setN(i)
    }, 18)
    return () => clearInterval(id)
  }, [text, enabled])
  return <>{enabled ? text.slice(0, n) : text}</>
}

export function AIAnalyst({ m }: { m: DemoMarket }) {
  const reduce = useReducedMotion()
  const { priceOf } = useDemo()
  const price = priceOf(m) // live (군중 확률) — 매 틱 갱신

  // 라이브 m을 넘긴다(useAiAnalyses가 ref로 읽어 4초 틱엔 재호출 안 함). m.id로 메모해
  // 다른 마켓으로 바뀔 때만 새 배열.
  const markets = useMemo(() => [m], [m.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const { byId, loading } = useAiAnalyses(markets)
  const result = byId[m.id]
  const showShimmer = loading || !result

  // AI 관점을 현재가에 재앵커 → 표시 확률/괴리가 매 틱 차트를 따라간다(고정값 아님).
  const lv = result ? liveView(result, price) : null
  const leanYes = lv?.lean === 'yes'
  const leanColor = leanYes ? 'text-up' : 'text-down'
  const vsCrowdColor = (lv?.vs ?? 0) > 0 ? 'text-up' : (lv?.vs ?? 0) < 0 ? 'text-down' : 'text-muted'
  const diffPct = lv?.diffPct ?? 0
  const badge = result?.source === 'fallback' ? '오프라인 추정 모드' : 'Claude Haiku · 실시간 분석'

  return (
    <div className="rounded-[18px] border border-hairline bg-canvas p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
          style={{ background: 'color-mix(in srgb, ' + ACCENT + ' 14%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, ' + ACCENT + ' 40%, transparent)' }}>
          🤖
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="ty-body-strong text-ink">지비닥 AI 애널리스트</h3>
            <AnimatePresence>
              {showShimmer && (
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1.5 ty-fine text-blue">
                  분석 중 <Dots />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="mt-0.5 inline-block ty-fine text-faint">{badge}</span>
        </div>
        <span className="inline-flex items-center gap-1 ty-fine text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-blue" />
          실시간 분석
        </span>
      </div>

      <AnimatePresence mode="wait">
        {showShimmer && !reduce ? (
          <motion.div key="shimmer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
            {[90, 60, 100, 75].map((w, i) => (
              <motion.div key={i} className="h-3 rounded-[8px]"
                style={{ width: `${w}%`, background: 'linear-gradient(90deg, var(--parchment), color-mix(in srgb, ' + ACCENT + ' 16%, var(--parchment)), var(--parchment))', backgroundSize: '200% 100%' }}
                animate={{ backgroundPosition: ['0% 0%', '-200% 0%'] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear', delay: i * 0.08 }} />
            ))}
          </motion.div>
        ) : result ? (
          <motion.div key="result" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {(() => {
              const o = projectedOutcome(price)
              return (
                <div className={`mb-4 rounded-[12px] border px-3.5 py-3 ${o.winYes ? 'border-up/30 bg-upbg' : 'border-down/30 bg-downbg'}`}>
                  <div className="flex items-center ty-fine">
                    <span className="text-muted">📊 이대로 가면</span>
                    <span className="ml-auto text-faint">{o.tag}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={`ty-body-strong ${o.winYes ? 'text-up' : 'text-down'}`}>&apos;{o.winYes ? '예' : '아니오'}&apos; 승리</span>
                    <span className="ty-caption nums text-muted">예 {o.yes}% vs 아니오 {o.no}%</span>
                    <span className={`ml-auto ty-caption-strong nums ${o.winYes ? 'text-up' : 'text-down'}`}>{o.margin}%p 차</span>
                  </div>
                </div>
              )
            })()}

            <div className="flex items-baseline gap-2">
              <span className="ty-caption text-muted">AI 예측</span>
              <span className={`ty-display nums leading-none ${leanColor}`}>예 {fmtPct(lv?.prob ?? result.probYes)}</span>
              <span className={`ty-caption-strong ${leanColor}`}>({leanYes ? "'예' 우세" : "'아니오' 우세"})</span>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex justify-between ty-fine text-muted">
                <span>신뢰도</span>
                <span className="ty-caption-strong nums text-blue">{result.confidence}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-divider">
                <motion.div className="h-full rounded-full bg-blue" initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${result.confidence}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
              </div>
            </div>

            <p className="mt-4 ty-body text-muted">
              <Typewriter text={result.rationale} enabled={!reduce} />
            </p>

            <div className="mt-4 rounded-[11px] border border-hairline bg-pearl px-3.5 py-2.5 ty-caption">
              {diffPct > 0 ? (
                <span className={`ty-caption-strong ${vsCrowdColor}`}>
                  🎯 AI는 군중보다 &apos;{leanYes ? '예' : '아니오'}&apos;에 <span className="nums">{diffPct}%p</span> 더 기울었어요
                </span>
              ) : (
                <span className="ty-caption-strong text-muted">🎯 AI는 군중과 거의 같은 시각이에요</span>
              )}
            </div>

            <p className="mt-3 ty-fine text-faint">
              ※ Claude Haiku 기반 자동 분석입니다. 투자(베팅) 판단의 참고용이며 결과를 보장하지 않습니다.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

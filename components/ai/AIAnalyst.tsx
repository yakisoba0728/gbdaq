'use client'
// 지비닥 AI 애널리스트 — 디테일 페이지 패널.
// 표시는 "AI"이지만 실제로는 lib/ai/fakeAnalyst.ts의 휴리스틱 시뮬레이션 결과를
// 보여주는 것뿐입니다(LLM/API 호출 없음). "분석 중…" 연출 → 결과 공개로 살아있는
// 느낌을 줍니다. 라이브 시세는 DemoProvider가 4초마다 random-walk → 자동 re-render로
// 반영합니다(구독 불필요).
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { DemoMarket } from '@/lib/demo/seed'
import { analyze, type AIAnalysis } from '@/lib/ai/fakeAnalyst'
import { useDemo } from '@/lib/demo/store'
import { fmtPct } from '@/lib/format'

const ACCENT = 'var(--blue)' // Action Blue — token-driven so dark mode (#2997ff) holds
const ANALYZING_MS = 1200 // length of the "분석 중…" illusion
const REANALYZE_MS = 15000 // re-analyze roughly every 15s
const MOVE_THRESHOLD = 0.015 // re-analyze early if live price moves notably

function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: ACCENT }}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

// 타입라이터(축약 모션이면 즉시 전체 표시).
function Typewriter({ text, enabled }: { text: string; enabled: boolean }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!enabled) return // 축약 모션: 타이핑 생략하고 렌더에서 전체 텍스트를 그대로 보여준다
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the typewriter to 0 when text/enabled changes, before the interval below types it out
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
  // 라이브 가격/포인트(재분석 입력) — store가 매 틱 re-render하므로 매 렌더 새로 읽는다.
  const price = priceOf(m)

  // 첫 분석은 동기 계산(seed=0) → SSR HTML == 첫 클라 렌더(시드 마켓에서 결정적).
  const [result, setResult] = useState<AIAnalysis>(() =>
    analyze({ marketId: m.id, question: m.question, price, points: m.history, volume: m.volume, seed: 0 }),
  )
  const [analyzing, setAnalyzing] = useState(false)
  const [seed, setSeed] = useState(0) // 결과 motion key용(재공개 시 재애니메이션)

  const lastSeenRef = useRef(price) // 마지막으로 분석한 가격

  // 재분석 사이클: "분석 중…" 1.2s 후 결과 공개. 한 번에 하나만 진행.
  // 매 렌더 재할당 → 콜백이 최신 m/price를 클로저로 잡는다.
  const runningRef = useRef(false)
  const seedRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runAnalysis = useRef(() => {})
  // eslint-disable-next-line react-hooks/refs -- latest-closure pattern: reassign each render so the interval/early-trigger callback always reads the current price & market
  runAnalysis.current = () => {
    if (runningRef.current) return // 한 사이클만 진행
    runningRef.current = true
    const nextSeed = (seedRef.current += 1)
    setSeed(nextSeed)
    lastSeenRef.current = price
    const finish = () => {
      setResult(
        analyze({ marketId: m.id, question: m.question, price, points: m.history, volume: m.volume, seed: nextSeed }),
      )
      setAnalyzing(false)
      runningRef.current = false
      timerRef.current = null
    }
    if (reduce) { finish(); return } // 축약 모션: 셔머 생략, 즉시 결과
    setAnalyzing(true)
    timerRef.current = setTimeout(finish, ANALYZING_MS)
  }

  // 마운트 시 1회 + ~15s 주기 재분석.
  useEffect(() => {
    const kick = setTimeout(() => runAnalysis.current(), 400) // 첫 "생각하는" 사이클
    const interval = setInterval(() => runAnalysis.current(), REANALYZE_MS)
    return () => {
      clearTimeout(kick)
      clearInterval(interval)
      if (timerRef.current) clearTimeout(timerRef.current)
      runningRef.current = false
    }
  }, [])

  // 라이브 가격이 크게 움직이면 조기 재분석 — 숫자 price에 의존(m은 매 틱 identity 변경).
  useEffect(() => {
    if (Math.abs(price - lastSeenRef.current) >= MOVE_THRESHOLD) runAnalysis.current()
  }, [price])

  const leanYes = result.lean === 'yes'
  const leanColor = leanYes ? 'text-up' : 'text-down'
  const bullish = result.vsCrowd > 0
  const vsCrowdColor = bullish ? 'text-up' : result.vsCrowd < 0 ? 'text-down' : 'text-muted'
  const diffPct = Math.round(Math.abs(result.vsCrowd) * 100)

  return (
    <div className="rounded-[18px] border border-hairline bg-canvas p-6">
      {/* 헤더 + 학습 배지 */}
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
          style={{ background: 'color-mix(in srgb, ' + ACCENT + ' 14%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, ' + ACCENT + ' 40%, transparent)' }}
        >
          🤖
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="ty-body-strong text-ink">지비닥 AI 애널리스트</h3>
            <AnimatePresence>
              {analyzing && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-1.5 ty-fine text-blue"
                >
                  분석 중 <Dots />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="mt-0.5 inline-block ty-fine text-faint">
            이전 데이터 {result.dataCount.toLocaleString('ko-KR')}건 학습
          </span>
        </div>
        <span className="inline-flex items-center gap-1 ty-fine text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-blue" />
          실시간 분석
        </span>
      </div>

      {/* 본문: 분석 중이면 셔머, 아니면 결과 */}
      <AnimatePresence mode="wait">
        {analyzing && !reduce ? (
          <motion.div
            key="shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5"
          >
            {[90, 60, 100, 75].map((w, i) => (
              <motion.div
                key={i}
                className="h-3 rounded-[8px]"
                style={{ width: `${w}%`, background: 'linear-gradient(90deg, var(--parchment), color-mix(in srgb, ' + ACCENT + ' 16%, var(--parchment)), var(--parchment))', backgroundSize: '200% 100%' }}
                animate={{ backgroundPosition: ['0% 0%', '-200% 0%'] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear', delay: i * 0.08 }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={'result-' + seed}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* 큰 예측 — 항상 '예' 확률축으로 표기(아래 'AI vs 군중' 라인과 동일 축).
                lean 방향은 색상 + vs군중 문구로 전달. */}
            <div className="flex items-baseline gap-2">
              <span className="ty-caption text-muted">AI 예측</span>
              <span className={`ty-display nums leading-none ${leanColor}`}>
                예 {fmtPct(result.probYes)}
              </span>
              <span className={`ty-caption-strong ${leanColor}`}>
                ({leanYes ? "'예' 우세" : "'아니오' 우세"})
              </span>
            </div>

            {/* 신뢰도 바 */}
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between ty-fine text-muted">
                <span>신뢰도</span>
                <span className="ty-caption-strong nums text-blue">{result.confidence}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-divider">
                <motion.div
                  className="h-full rounded-full bg-blue"
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${result.confidence}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* 근거 (타입라이터) */}
            <p className="mt-4 ty-body text-muted">
              <Typewriter text={result.rationale} enabled={!reduce} />
            </p>

            {/* AI vs 군중 */}
            <div className="mt-4 rounded-[11px] border border-hairline bg-pearl px-3.5 py-2.5 ty-caption">
              <span className="nums text-muted">시장가 {fmtPct(price)}</span>
              <span className="mx-1.5 text-faint">·</span>
              <span className="nums text-muted">AI {fmtPct(result.probYes)}</span>
              {diffPct > 0 ? (
                <>
                  <span className="mx-1.5 text-faint">→</span>
                  <span className={`ty-caption-strong ${vsCrowdColor}`}>
                    AI는 &apos;{leanYes ? '예' : '아니오'}&apos;에 <span className="nums">{diffPct}%p</span> 더 베팅
                  </span>
                </>
              ) : (
                <>
                  <span className="mx-1.5 text-faint">→</span>
                  <span className="ty-caption-strong text-muted">AI는 군중과 거의 같은 시각</span>
                </>
              )}
            </div>

            <p className="mt-3 ty-fine text-faint">
              ※ 시세 데이터 기반 자동 분석입니다. 투자(베팅) 판단의 참고용이며 결과를 보장하지 않습니다.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

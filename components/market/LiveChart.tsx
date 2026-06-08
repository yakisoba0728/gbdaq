'use client'
import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// 확률(0..1) 시계열 영역 차트. price_points에서 흘러오는 history로 살아 움직인다.
// Apple-clean: 얇은 2px 라인(상승=초록/하락=빨강), 부드러운 그라데이션, 50% 점선 기준선, 최신 점.
// 시그니처는 고정: { points: number[]; height?: number } (다른 화면에서 재사용).
export function LiveChart({ points, height = 240 }: { points: number[]; height?: number }) {
  const reduce = useReducedMotion()
  const uid = useId()
  const pts = points.length >= 2 ? points : [points[0] ?? 0.5, points[0] ?? 0.5]
  const W = 560, H = height, n = pts.length
  const x = (i: number) => (i / (n - 1)) * W
  const y = (p: number) => H - Math.min(1, Math.max(0, p)) * H
  const line = pts.map((p, i) => `${x(i).toFixed(2)},${y(p).toFixed(2)}`).join(' ')
  const last = pts[pts.length - 1]
  const up = last >= (pts[0] ?? 0.5)
  const stroke = up ? 'var(--up)' : 'var(--down)'
  const cx = x(n - 1), cy = y(last)

  return (
    <div className="relative" style={{ height: H }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`lc-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={stroke} stopOpacity=".28" />
            <stop offset="1" stopColor={stroke} stopOpacity=".02" />
          </linearGradient>
        </defs>
        {/* 50% baseline grid */}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--hairline)" strokeWidth="1"
          strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
        <polygon fill={`url(#lc-${uid})`} points={`${line} ${W},${H} 0,${H}`} />
        <polyline fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round"
          strokeLinecap="round" points={line} vectorEffect="non-scaling-stroke"
          style={{ filter: 'var(--chart-line-shadow)' }} />
      </svg>
      {/* 최신 시점 펄스 점 — viewBox가 non-uniform이라 % 좌표로 오버레이 */}
      <span className="pointer-events-none absolute"
        style={{ left: `${(cx / W) * 100}%`, top: `${(cy / H) * 100}%`, transform: 'translate(-50%,-50%)' }}>
        {!reduce && (
          <motion.span className="absolute inset-0 rounded-full"
            style={{ background: stroke }}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 3.2, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }} />
        )}
        <span className="block h-2 w-2 rounded-full ring-2 ring-canvas" style={{ background: stroke }} />
      </span>
      <div className="ty-fine nums pointer-events-none absolute right-0 top-0 flex h-full flex-col justify-between py-0.5 text-faint">
        <span>100%</span><span>50%</span><span>0%</span>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
export function AnimatedPercent({ value, className = '' }: { value: number; className?: string }) {
  const sp = useSpring(value, { stiffness: 90, damping: 18 })
  const text = useTransform(sp, v => `${Math.round(v * 100)}%`)
  const prev = useRef(value); const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  useEffect(() => {
    sp.set(value)
    if (value !== prev.current) {
      setFlash(value > prev.current ? 'up' : 'down'); prev.current = value
      const t = setTimeout(() => setFlash(null), 450); return () => clearTimeout(t)
    }
  }, [value, sp])
  return <motion.span className={`nums ${className} ${flash === 'up' ? 'text-up' : flash === 'down' ? 'text-down' : ''}`}>{text}</motion.span>
}

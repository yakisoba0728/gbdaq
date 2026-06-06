'use client'
import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
const Ctx = createContext<(msg: string, tone?: 'ok' | 'err') => void>(() => {})
export const useToast = () => useContext(Ctx)
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; tone: string }[]>([])
  const push = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    const id = performance.now(); setItems(s => [...s, { id, msg, tone }])
    setTimeout(() => setItems(s => s.filter(i => i.id !== id)), 2200)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {items.map(i => (
            <motion.div key={i.id} initial={{ opacity: 0, y: 20, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
              className={`rounded-full border border-hairline bg-canvas px-5 py-2.5 ty-caption-strong shadow-product ${i.tone === 'err' ? 'text-down' : 'text-up'}`}>{i.msg}</motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

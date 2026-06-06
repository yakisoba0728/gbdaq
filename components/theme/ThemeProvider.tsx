'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  useEffect(() => {
    // Sync React state to the persisted theme on mount. Server and first client
    // render both use 'light' (no hydration mismatch); the real theme is applied
    // pre-hydration by the inline <head> script, then reconciled here.
    const saved = (localStorage.getItem('gbdaq-theme') as Theme) || 'light'
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time mount sync from persisted preference
    setTheme(saved); document.documentElement.setAttribute('data-theme', saved)
  }, [])
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next); document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('gbdaq-theme', next)
  }
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}
export const useTheme = () => useContext(Ctx)

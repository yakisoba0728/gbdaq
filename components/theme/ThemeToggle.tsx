'use client'
import { useTheme } from './ThemeProvider'
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} aria-label="테마 전환"
      className="ty-caption rounded-full border border-hairline px-2.5 py-1.5 text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-bluefocus">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

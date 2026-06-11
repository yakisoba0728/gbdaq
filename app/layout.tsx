import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { DemoProvider } from '@/lib/demo/store'
import { Nav } from '@/components/Nav'

// SF Pro is Apple's system font (resolved via -apple-system / system-ui on Apple devices).
// Inter is the documented web fallback for non-Apple platforms.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata = { title: 'GBDAQ · 지비닥', description: '경북소마고 교내 라이브 예측시장' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="light" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html:
          `try{document.documentElement.setAttribute('data-theme',localStorage.getItem('gbdaq-theme')||'light')}catch(e){}` }} />
      </head>
      <body>
        <ThemeProvider>
          <DemoProvider>
            <Nav />
            <ToastProvider>
              <main>{children}</main>
            </ToastProvider>
          </DemoProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

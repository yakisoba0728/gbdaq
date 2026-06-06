import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx'] },
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
})

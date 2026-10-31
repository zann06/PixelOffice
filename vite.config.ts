import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages menyajikan repo di subpath — set PAGES_BASE=PixelOffice saat
// build deploy (lihat .github/workflows/deploy-pages.yml). Tanpa garis miring
// agar aman dari path-conversion shell Windows.
const pagesBase = process.env.PAGES_BASE?.replace(/^\/+|\/+$/g, '')
export default defineConfig(() => ({
  base: pagesBase ? `/${pagesBase}/` : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
    // Integration tests drive real user flows through the data layer; the
    // default 5s is too tight when several jsdom environments run in parallel.
    testTimeout: 20_000,
  },
}))

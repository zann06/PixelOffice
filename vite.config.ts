import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
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
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    clearMocks: true,
    css: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    restoreMocks: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    assetsInlineLimit: 2_048,
    // React/Router core is ~258 kB raw but 82 kB gzip; gzip budgets are enforced separately.
    chunkSizeWarningLimit: 300,
    cssCodeSplit: true,
    manifest: true,
    modulePreload: {
      polyfill: false,
    },
    sourcemap: false,
    target: 'es2022',
  },
})

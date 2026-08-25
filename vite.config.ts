import { readFileSync } from 'node:fs'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/.cache/**', '**/public/data/port-master/**'],
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
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

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@/lib': fileURLToPath(new URL('./lib', import.meta.url)),
      '@': fileURLToPath(new URL('./components', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
})

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@/reports': fileURLToPath(
        new URL('components/reports', import.meta.url),
      ),
      '@/lib': fileURLToPath(new URL('lib', import.meta.url)),
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
})

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/**/__tests__/**/*.test.ts',
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.ts',
        'electron/**/*.ts',
        'renderer/src/**/*.tsx'
      ],
      exclude: [
        'src/**/__tests__/**',
        'tests/**',
        '**/*.d.ts',
        '**/node_modules/**'
      ],
    },
  },
})

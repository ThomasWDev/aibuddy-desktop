import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'renderer/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'out', 'release'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.{ts,tsx}',
        'renderer/src/**/*.{ts,tsx}',
        'electron/**/*.ts'
      ],
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/index.ts',
        '**/main.tsx'
      ],
      thresholds: {
        statements: 15,
        branches: 50,
        functions: 40,
        lines: 15
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@renderer': resolve(__dirname, 'renderer/src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})


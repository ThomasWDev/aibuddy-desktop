import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const DESKTOP_ROOT = resolve(__dirname, '..', '..')
const RENDERER_SRC = resolve(DESKTOP_ROOT, 'renderer', 'src')
const EXT_ROOT = resolve(DESKTOP_ROOT, '..', 'extension')

function readSrc(base: string, relativePath: string): string {
  return readFileSync(resolve(base, relativePath), 'utf-8')
}

function fileExists(base: string, relativePath: string): boolean {
  return existsSync(resolve(base, relativePath))
}

describe('v1.5.97 Desktop Session Smoke — Modularization & Parity', () => {

  describe('KAN-301 Parity: Split Request Timeouts', () => {
    const appSrc = readSrc(RENDERER_SRC, 'App.tsx')

    it('FIRST_TOKEN_TIMEOUT_MS defined', () => {
      const match = appSrc.match(/FIRST_TOKEN_TIMEOUT_MS\s*=\s*(\d[\d_]*)/)
      expect(match).not.toBeNull()
      const value = Number(match![1].replace(/_/g, ''))
      expect(value).toBeGreaterThanOrEqual(30_000)
      expect(value).toBeLessThanOrEqual(120_000)
    })

    it('STREAM_INACTIVITY_TIMEOUT_MS defined', () => {
      const match = appSrc.match(/STREAM_INACTIVITY_TIMEOUT_MS\s*=\s*(\d[\d_]*)/)
      expect(match).not.toBeNull()
      expect(Number(match![1].replace(/_/g, ''))).toBeGreaterThanOrEqual(120_000)
    })

    it('no stale single TIMEOUT_MS = 300_000 for request', () => {
      expect(appSrc).not.toMatch(/const TIMEOUT_MS\s*=\s*300/)
    })

    it('stream extends timeout on first token', () => {
      expect(appSrc).toContain('firstTokenReceived')
    })

    it('watchdog still exists as last-resort safety net', () => {
      expect(appSrc).toContain('WATCHDOG_TIMEOUT_MS')
    })

    it('watchdog resets loading state', () => {
      expect(appSrc).toContain('setIsLoading(false)')
    })
  })

  describe('KAN-299 Parity: History Button Sizes', () => {
    it('HistorySidebar exists', () => {
      expect(fileExists(RENDERER_SRC, 'components/HistorySidebar.tsx')).toBe(true)
    })

    it('HistorySidebar uses w-4 h-4 for action icons', () => {
      const src = readSrc(RENDERER_SRC, 'components/HistorySidebar.tsx')
      expect(src).toContain('w-4 h-4')
    })

    it('HistorySidebar has hover feedback', () => {
      const src = readSrc(RENDERER_SRC, 'components/HistorySidebar.tsx')
      expect(src).toMatch(/hover:bg-/)
    })
  })

  describe('Modularization: Package Structure', () => {
    it('@aibuddy/prompts local copy exists', () => {
      expect(fileExists(DESKTOP_ROOT, 'packages/prompts/package.json')).toBe(true)
    })

    it('desktop package.json references @aibuddy/prompts', () => {
      const pkg = readSrc(DESKTOP_ROOT, 'package.json')
      expect(pkg).toContain('@aibuddy/prompts')
    })

    it('src/adapters/ directory exists for platform decoupling', () => {
      expect(fileExists(DESKTOP_ROOT, 'src/adapters')).toBe(true)
    })

    it('context-adapter exists', () => {
      expect(
        fileExists(DESKTOP_ROOT, 'src/adapters/context-adapter.ts') ||
        fileExists(DESKTOP_ROOT, 'src/adapters/index.ts')
      ).toBe(true)
    })
  })

  describe('Modularization: Module Boundaries', () => {
    it('module-boundary test file exists', () => {
      expect(fileExists(DESKTOP_ROOT, 'tests/electron/module-boundary.test.ts')).toBe(true)
    })

    it('release-pipeline-smoke test exists', () => {
      expect(fileExists(DESKTOP_ROOT, 'tests/electron/release-pipeline-smoke.test.ts')).toBe(true)
    })
  })

  describe('CI/CD: Desktop Test Gates', () => {
    const workflow = readFileSync(resolve(DESKTOP_ROOT, '..', '.github', 'workflows', 'release-on-master.yml'), 'utf-8')

    it('test-desktop job exists', () => {
      expect(workflow).toContain('test-desktop:')
    })

    it('desktop builds depend on test-desktop', () => {
      expect(workflow).toMatch(/build-desktop-mac[\s\S]*?needs:.*test-desktop/)
    })

    it('TypeScript check runs before tests', () => {
      expect(workflow).toContain('TypeScript check')
    })
  })

  describe('Extension-Desktop Version Parity', () => {
    it('versions match', () => {
      const extPkg = JSON.parse(readSrc(EXT_ROOT, 'package.json'))
      const deskPkg = JSON.parse(readSrc(DESKTOP_ROOT, 'package.json'))
      expect(extPkg.version).toBe(deskPkg.version)
    })
  })

  describe('TDD Test File Inventory — All Parity Tests Exist', () => {
    const requiredTestFiles = [
      'tests/electron/kan33-response-time-ux.test.ts',
      'tests/electron/kan133-desktop-stuck-request.test.ts',
      'tests/electron/module-boundary.test.ts',
      'tests/electron/release-pipeline-smoke.test.ts',
    ]

    for (const file of requiredTestFiles) {
      it(`${file} exists`, () => {
        expect(fileExists(DESKTOP_ROOT, file)).toBe(true)
      })
    }
  })
})

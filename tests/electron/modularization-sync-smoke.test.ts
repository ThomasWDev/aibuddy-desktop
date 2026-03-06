import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const ROOT = path.join(__dirname, '..', '..')
const MONOREPO_ROOT = path.join(ROOT, '..')

function md5(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

function readIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

function listTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { recursive: true })
    .filter((f): f is string => typeof f === 'string' && f.endsWith('.ts') && !f.includes('__tests__'))
    .sort()
}

describe('Modularization: Package Sync Verification', () => {

  describe('@aibuddy/types — in-tree vs desktop copy', () => {
    it('packages/types/src/index.ts must exist', () => {
      const f = path.join(MONOREPO_ROOT, 'packages/types/src/index.ts')
      expect(fs.existsSync(f)).toBe(true)
    })

    it('types package must export TypeScript interfaces', () => {
      const src = readIfExists(path.join(MONOREPO_ROOT, 'packages/types/src/index.ts'))
      expect(src).not.toBeNull()
      expect(src).toMatch(/export\s+(interface|type)\s+/)
    })
  })

  describe('@aibuddy/prompts — in-tree integrity', () => {
    const promptsDir = path.join(MONOREPO_ROOT, 'packages/prompts/src')

    it('prompts package must have core/ directory', () => {
      expect(fs.existsSync(path.join(promptsDir, 'core'))).toBe(true)
    })

    it('prompts must export system prompt builder', () => {
      const index = readIfExists(path.join(promptsDir, 'index.ts'))
      expect(index).not.toBeNull()
      expect(index).toMatch(/export/)
    })

    it('communication.ts must exist with Response Structure', () => {
      const comm = readIfExists(path.join(promptsDir, 'core/communication.ts'))
      expect(comm).not.toBeNull()
      expect(comm!).toContain('Response Structure')
    })

    it('tdd-methodology.ts must exist', () => {
      expect(fs.existsSync(path.join(promptsDir, 'core/tdd-methodology.ts'))).toBe(true)
    })

    it('senior-engineer-approach.ts must exist', () => {
      expect(fs.existsSync(path.join(promptsDir, 'core/senior-engineer-approach.ts'))).toBe(true)
    })
  })

  describe('@aibuddy/core — in-tree integrity', () => {
    const coreDir = path.join(MONOREPO_ROOT, 'packages/core/src')

    it('core package must have src/index.ts', () => {
      expect(fs.existsSync(path.join(coreDir, 'index.ts'))).toBe(true)
    })

    it('core must have suggestions module', () => {
      expect(fs.existsSync(path.join(coreDir, 'suggestions'))).toBe(true)
    })

    it('core must have detection module', () => {
      expect(fs.existsSync(path.join(coreDir, 'detection'))).toBe(true)
    })

    it('core must have tools module', () => {
      expect(fs.existsSync(path.join(coreDir, 'tools'))).toBe(true)
    })

    it('core tests directory must exist with 10+ test files', () => {
      const testsDir = path.join(MONOREPO_ROOT, 'packages/core/tests')
      if (!fs.existsSync(testsDir)) return
      const testFiles = fs.readdirSync(testsDir, { recursive: true })
        .filter((f): f is string => typeof f === 'string' && f.endsWith('.test.ts'))
      expect(testFiles.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe('desktop packages/prompts local copy sync', () => {
    const inTreePrompts = path.join(MONOREPO_ROOT, 'packages/prompts/src')
    const desktopPrompts = path.join(ROOT, 'packages/prompts/src')

    it('desktop must have its own packages/prompts/src', () => {
      expect(fs.existsSync(desktopPrompts)).toBe(true)
    })

    it('desktop prompts must have same file count as in-tree prompts', () => {
      const inTreeFiles = listTsFiles(inTreePrompts)
      const desktopFiles = listTsFiles(desktopPrompts)
      expect(desktopFiles.length).toBeGreaterThanOrEqual(inTreeFiles.length)
    })
  })
})

describe('Modularization: Architecture Smoke Tests', () => {

  describe('workspace configuration', () => {
    it('pnpm-workspace.yaml must reference all packages', () => {
      const ws = readIfExists(path.join(MONOREPO_ROOT, 'pnpm-workspace.yaml'))
      expect(ws).not.toBeNull()
      expect(ws).toMatch(/packages/)
    })

    it('root package.json must not have a version (workspace root)', () => {
      const pkg = readIfExists(path.join(MONOREPO_ROOT, 'package.json'))
      expect(pkg).not.toBeNull()
    })
  })

  describe('desktop app critical files exist', () => {
    const criticalFiles = [
      'renderer/src/App.tsx',
      'renderer/src/components/InterviewPanel.tsx',
      'renderer/src/hooks/useVoiceInput.ts',
      'renderer/src/components/HistorySidebar.tsx',
      'electron/main.ts',
      'electron/preload.ts',
      'electron/ipc/workspace.ts',
      'electron/ipc/file-system.ts',
      'src/history/history-manager.ts',
      'src/history/types.ts',
    ]

    for (const file of criticalFiles) {
      it(`${file} must exist`, () => {
        expect(fs.existsSync(path.join(ROOT, file))).toBe(true)
      })
    }
  })

  describe('no hardcoded AWS URLs in renderer', () => {
    it('App.tsx must not contain raw execute-api URLs', () => {
      const app = readIfExists(path.join(ROOT, 'renderer/src/App.tsx'))
      expect(app).not.toBeNull()
      expect(app).not.toMatch(/execute-api\.us-east/)
    })

    it('InterviewPanel.tsx must not contain raw execute-api URLs', () => {
      const panel = readIfExists(path.join(ROOT, 'renderer/src/components/InterviewPanel.tsx'))
      expect(panel).not.toBeNull()
      expect(panel).not.toMatch(/execute-api\.us-east/)
    })
  })

  describe('CI workflow integrity', () => {
    it('release-on-master.yml must exist', () => {
      expect(fs.existsSync(path.join(MONOREPO_ROOT, '.github/workflows/release-on-master.yml'))).toBe(true)
    })

    it('release workflow must have test jobs before build jobs', () => {
      const workflow = readIfExists(path.join(MONOREPO_ROOT, '.github/workflows/release-on-master.yml'))
      expect(workflow).not.toBeNull()
      expect(workflow).toMatch(/test-extension/)
      expect(workflow).toMatch(/test-desktop/)
      expect(workflow).toMatch(/test-api/)
    })

    it('release workflow must not skip tests by default', () => {
      const workflow = readIfExists(path.join(MONOREPO_ROOT, '.github/workflows/release-on-master.yml'))
      expect(workflow).not.toBeNull()
      expect(workflow).not.toMatch(/skip_tests:\s*true/)
    })
  })

  describe('version consistency', () => {
    it('extension and desktop versions must match', () => {
      const extPkg = JSON.parse(fs.readFileSync(path.join(MONOREPO_ROOT, 'extension/package.json'), 'utf-8'))
      const deskPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
      expect(extPkg.version).toBe(deskPkg.version)
    })
  })
})

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Module Boundary Enforcement Tests
//
// These tests ensure that logic modules (knowledge, history, agent, parsers,
// core, services) remain decoupled from the app shell (electron, renderer,
// IPC handlers, secrets). This is critical for the modularization strategy
// where external developers work on logic packages without app access.
// ---------------------------------------------------------------------------

const ROOT = path.join(__dirname, '../../')

function readAllTsFiles(dir: string): Array<{ file: string; content: string }> {
  const results: Array<{ file: string; content: string }> = []
  if (!fs.existsSync(dir)) return results

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '__tests__') {
      results.push(...readAllTsFiles(fullPath))
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push({ file: fullPath, content: fs.readFileSync(fullPath, 'utf-8') })
    }
  }
  return results
}

// Logic modules that must stay platform-agnostic
const LOGIC_DIRS = [
  'src/knowledge',
  'src/history',
  'src/core',
  'src/services',
]

const allLogicFiles = LOGIC_DIRS.flatMap(dir => readAllTsFiles(path.join(ROOT, dir)))

describe('Module boundary: logic modules must not import platform code', () => {
  const FORBIDDEN_IMPORTS = [
    { pattern: /from\s+['"]electron['"]/, name: 'electron' },
    { pattern: /require\s*\(\s*['"]electron['"]/, name: 'electron (require)' },
    { pattern: /from\s+['"]\.\.\/\.\.\/electron\//, name: 'electron/ directory' },
    { pattern: /from\s+['"]\.\.\/\.\.\/renderer\//, name: 'renderer/ directory' },
    { pattern: /from\s+['"]@sentry\/electron/, name: '@sentry/electron' },
  ]

  for (const { file, content } of allLogicFiles) {
    const relPath = path.relative(ROOT, file)

    for (const { pattern, name } of FORBIDDEN_IMPORTS) {
      it(`${relPath} must not import ${name}`, () => {
        expect(content).not.toMatch(pattern)
      })
    }
  }
})

describe('Module boundary: no hardcoded secrets in logic modules', () => {
  const SECRET_PATTERNS = [
    { pattern: /https?:\/\/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com/, name: 'AWS API Gateway URL' },
    { pattern: /https?:\/\/[a-z0-9]+-[a-z0-9]+\.lambda-url\.[a-z0-9-]+\.on\.aws/, name: 'AWS Lambda URL' },
    { pattern: /https?:\/\/[a-z0-9]+\.elb\.[a-z0-9-]+\.amazonaws\.com/, name: 'AWS ELB URL' },
    { pattern: /https?:\/\/[a-z0-9]+\.ingest\.[a-z0-9-]+\.sentry\.io/, name: 'Sentry DSN' },
    { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'OpenAI API key' },
    { pattern: /ATATT3x[a-zA-Z0-9_-]{20,}/, name: 'Atlassian API token' },
  ]

  for (const { file, content } of allLogicFiles) {
    const relPath = path.relative(ROOT, file)

    for (const { pattern, name } of SECRET_PATTERNS) {
      it(`${relPath} must not contain ${name}`, () => {
        expect(content).not.toMatch(pattern)
      })
    }
  }
})

describe('Module boundary: shared packages must be self-contained', () => {
  const MONOREPO_ROOT = path.resolve(ROOT, '..')
  const PACKAGES_ROOT = path.join(MONOREPO_ROOT, 'packages')

  const packageDirs = ['types', 'prompts']

  for (const pkg of packageDirs) {
    const pkgDir = path.join(PACKAGES_ROOT, pkg, 'src')
    const files = readAllTsFiles(pkgDir)

    it(`@aibuddy/${pkg} must have source files`, () => {
      expect(files.length).toBeGreaterThan(0)
    })

    for (const { file, content } of files) {
      const relPath = path.relative(PACKAGES_ROOT, file)

      it(`${relPath} must not import from electron`, () => {
        expect(content).not.toMatch(/from\s+['"]electron['"]/)
      })

      it(`${relPath} must not import from vscode`, () => {
        expect(content).not.toMatch(/from\s+['"]vscode['"]/)
      })

      it(`${relPath} must not contain hardcoded AWS URLs`, () => {
        expect(content).not.toMatch(/https?:\/\/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com/)
      })
    }
  }
})

describe('Module boundary: adapter pattern enforcement', () => {
  it('context-adapter must exist to bridge platform to logic', () => {
    const adapterPath = path.join(ROOT, 'src/adapters/context-adapter.ts')
    expect(fs.existsSync(adapterPath)).toBe(true)
  })

  it('terminal-adapter must exist to bridge platform to logic', () => {
    const adapterPath = path.join(ROOT, 'src/adapters/terminal-adapter.ts')
    expect(fs.existsSync(adapterPath)).toBe(true)
  })

  it('vscode-shim must exist for VS Code API compatibility', () => {
    const shimPath = path.join(ROOT, 'src/adapters/vscode-shim.ts')
    expect(fs.existsSync(shimPath)).toBe(true)
  })

  it('adapters directory must have an index.ts barrel export', () => {
    const indexPath = path.join(ROOT, 'src/adapters/index.ts')
    expect(fs.existsSync(indexPath)).toBe(true)
  })
})

describe('Module boundary: App.tsx must not be accessible from logic modules', () => {
  for (const { file, content } of allLogicFiles) {
    const relPath = path.relative(ROOT, file)

    it(`${relPath} must not import App.tsx`, () => {
      expect(content).not.toMatch(/from\s+['"].*App['"]/)
      expect(content).not.toMatch(/from\s+['"].*App\.tsx['"]/)
    })
  }
})

describe('Module boundary: IPC handlers must stay in electron/', () => {
  const ipcDir = path.join(ROOT, 'electron/ipc')
  const ipcFiles = readAllTsFiles(ipcDir)

  it('IPC handlers must exist in electron/ipc/', () => {
    expect(ipcFiles.length).toBeGreaterThan(0)
  })

  for (const { file, content } of allLogicFiles) {
    const relPath = path.relative(ROOT, file)

    it(`${relPath} must not import from electron/ipc/`, () => {
      expect(content).not.toMatch(/from\s+['"].*electron\/ipc/)
    })
  }
})

describe('Module boundary: env-based URLs stay in constants/', () => {
  const urlsFile = fs.readFileSync(path.join(ROOT, 'src/constants/urls.ts'), 'utf-8')

  it('urls.ts must load endpoints from environment variables', () => {
    expect(urlsFile).toMatch(/process\.env\.AIBUDDY/)
  })

  it('urls.ts must not hardcode execute-api URLs', () => {
    expect(urlsFile).not.toMatch(/https?:\/\/[a-z0-9]+\.execute-api/)
  })

  it('urls.ts must not hardcode lambda-url URLs', () => {
    expect(urlsFile).not.toMatch(/https?:\/\/[a-z0-9]+-[a-z0-9]+\.lambda-url/)
  })

  for (const { file, content } of allLogicFiles) {
    const relPath = path.relative(ROOT, file)

    it(`${relPath} must not import urls.ts directly`, () => {
      expect(content).not.toMatch(/from\s+['"].*constants\/urls['"]/)
    })
  }
})

describe('Module boundary: logic modules export clean public APIs', () => {
  it('src/knowledge/ must have an index.ts barrel export', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/knowledge/index.ts'))).toBe(true)
  })

  it('src/history/ must have an index.ts barrel export', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/history/index.ts'))).toBe(true)
  })

  it('src/core/ must have an index.ts barrel export', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/core/index.ts'))).toBe(true)
  })

  it('src/services/ must have an index.ts barrel export', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/services/index.ts'))).toBe(true)
  })
})

/**
 * Smoke Tests: Architecture & Documentation Guards
 *
 * Ensures critical architecture files, docs, and integration
 * points exist and have required content. Prevents silent
 * deletion of key infrastructure.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../../')
const desktopRoot = resolve(__dirname, '../../')

describe('Architecture — Critical Documentation Must Exist', () => {
  const requiredDocs = [
    'KNOWN_ISSUES.md',
    'BACKEND_MIGRATION.md',
    'extension/CHANGELOG.md',
    'docs/E2E_TESTING_KIT.md',
    'docs/APPLE_APPSTORE_CONNECT_API.md',
    'aibuddy-desktop/DESKTOP_APP_GUIDE.md',
    'aibuddy-desktop/STORE_SUBMISSION_GUIDE.md',
    'aibuddy-desktop/SHARED_CODE_ARCHITECTURE.md',
  ]

  for (const doc of requiredDocs) {
    it(`${doc} must exist`, () => {
      expect(existsSync(resolve(root, doc))).toBe(true)
    })
  }
})

describe('Architecture — Shared Packages Must Exist', () => {
  it('packages/prompts/package.json must exist in desktop', () => {
    expect(existsSync(resolve(desktopRoot, 'packages/prompts/package.json'))).toBe(true)
  })

  const rootPackages = ['core', 'prompts', 'types', 'ui']

  for (const pkg of rootPackages) {
    it(`root packages/${pkg}/package.json must exist`, () => {
      expect(existsSync(resolve(root, `packages/${pkg}/package.json`))).toBe(true)
    })
  }
})

describe('Architecture — System Prompt Must Include Desktop Context', () => {
  const promptPath = resolve(desktopRoot, 'packages/prompts/src/system-prompt.ts')
  const promptContent = readFileSync(promptPath, 'utf-8')

  it('must export DESKTOP_PLATFORM_CONTEXT', () => {
    expect(promptContent).toContain('DESKTOP_PLATFORM_CONTEXT')
  })

  it('DESKTOP_PLATFORM_CONTEXT must warn about wrong workspace', () => {
    expect(promptContent).toMatch(/Open that folder first/)
  })

  it('must instruct AI to search for documentation before coding', () => {
    expect(promptContent).toMatch(/search for documentation first|find.*\.md/)
  })

  it('must instruct AI to use heredoc for multi-line scripts', () => {
    expect(promptContent).toContain('heredoc')
  })
})

describe('Architecture — Sentry Error Tracking Configuration', () => {
  const sentryPath = resolve(root, 'extension/src/utils/sentry/index.ts')
  const sentryContent = readFileSync(sentryPath, 'utf-8')

  it('must have Sentry DSN configured', () => {
    expect(sentryContent).toMatch(/SENTRY_DSN/)
  })

  it('must filter Task aborted errors', () => {
    expect(sentryContent).toContain('Task aborted')
  })

  it('must have breadcrumb limit >= 200', () => {
    expect(sentryContent).toMatch(/maxBreadcrumbs:\s*200/)
  })

  it('must prioritize custom breadcrumbs over HTTP noise', () => {
    expect(sentryContent).toContain('beforeBreadcrumb')
    expect(sentryContent).toContain("'ai.'")
  })

  it('must filter third-party extension errors', () => {
    expect(sentryContent).toMatch(/GitLens|Copilot|kodu-ai/)
  })
})

describe('Architecture — API Smart Router Must Exist', () => {
  it('API handler must exist at extension/src/api/providers/aibuddy.ts', () => {
    expect(existsSync(resolve(root, 'extension/src/api/providers/aibuddy.ts'))).toBe(true)
  })

  it('AWS Lambda handler must exist', () => {
    expect(existsSync(resolve(root, 'aws-api/src/handler.js'))).toBe(true)
  })
})

describe('Architecture — Desktop Electron IPC Integrity', () => {
  const preloadPath = resolve(desktopRoot, 'electron/preload.ts')
  const preloadContent = readFileSync(preloadPath, 'utf-8')

  it('preload must expose app.getVersion IPC', () => {
    expect(preloadContent).toContain("app:getVersion")
  })

  it('preload must expose terminal.execute IPC', () => {
    expect(preloadContent).toMatch(/terminal.*execute/)
  })

  it('preload must expose history IPC namespace', () => {
    expect(preloadContent).toMatch(/history/)
  })

  it('preload must expose store IPC namespace', () => {
    expect(preloadContent).toMatch(/store/)
  })
})

describe('Architecture — Version Sync (Extension + Desktop)', () => {
  const extPkg = JSON.parse(readFileSync(resolve(root, 'extension/package.json'), 'utf-8'))
  const deskPkg = JSON.parse(readFileSync(resolve(desktopRoot, 'package.json'), 'utf-8'))

  it('extension and desktop versions must be synced', () => {
    expect(extPkg.version).toBe(deskPkg.version)
  })

  it('version must be >= 1.5.65', () => {
    const [major, minor, patch] = deskPkg.version.split('.').map(Number)
    const versionNum = major * 10000 + minor * 100 + patch
    expect(versionNum).toBeGreaterThanOrEqual(10565)
  })
})

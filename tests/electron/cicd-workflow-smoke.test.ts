/**
 * CI/CD Workflow Smoke Tests
 *
 * Validates that both ci.yml and release-on-master.yml are correctly
 * configured to prevent minute waste (paths-ignore), avoid duplicate
 * builds, and properly fail on test failures.
 *
 * RULE: Import real functions from source files — NO code duplication.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../..')
const RELEASE_WORKFLOW = resolve(ROOT, '../.github/workflows/release-on-master.yml')
const CI_WORKFLOW = resolve(ROOT, '../.github/workflows/ci.yml')
const DESKTOP_PKG = resolve(ROOT, 'package.json')
const EXT_PKG = resolve(ROOT, '../extension/package.json')

const releaseYml = existsSync(RELEASE_WORKFLOW) ? readFileSync(RELEASE_WORKFLOW, 'utf-8') : ''
const ciYml = existsSync(CI_WORKFLOW) ? readFileSync(CI_WORKFLOW, 'utf-8') : ''
const desktopPkg = JSON.parse(readFileSync(DESKTOP_PKG, 'utf-8'))
const extPkg = JSON.parse(readFileSync(EXT_PKG, 'utf-8'))

describe('Workflow — paths-ignore (prevents docs-only builds burning minutes)', () => {
  it('release workflow has paths-ignore on push', () => {
    expect(releaseYml).toContain('paths-ignore')
  })

  it('release workflow ignores markdown files', () => {
    expect(releaseYml).toContain('**.md')
  })

  it('release workflow ignores docs directory', () => {
    expect(releaseYml).toContain('docs/**')
  })

  it('CI workflow has paths-ignore on pull_request', () => {
    expect(ciYml).toContain('paths-ignore')
  })

  it('CI workflow ignores markdown files', () => {
    expect(ciYml).toContain('**.md')
  })

  it('CI workflow ignores docs directory', () => {
    expect(ciYml).toContain('docs/**')
  })
})

describe('CI Workflow — PR-Only Trigger (prevents double billing on push)', () => {
  it('CI workflow does NOT trigger on push to main', () => {
    expect(ciYml).not.toMatch(/on:\s*\n\s*push:/)
  })

  it('CI workflow triggers on pull_request only', () => {
    expect(ciYml).toContain('pull_request')
  })
})

describe('CI Workflow — No Error Swallowing', () => {
  it('CI TypeScript check does NOT use || true', () => {
    const tsLine = ciYml.split('\n').find(l => l.includes('tsc --noEmit'))
    expect(tsLine).toBeDefined()
    expect(tsLine).not.toContain('|| true')
  })

  it('CI desktop tests do NOT use || true', () => {
    const testLines = ciYml.split('\n').filter(l => l.includes('pnpm test'))
    for (const line of testLines) {
      expect(line).not.toContain('|| true')
    }
  })

  it('CI extension tests do NOT use || true', () => {
    const testLines = ciYml.split('\n').filter(l => l.includes('pnpm test:unit'))
    for (const line of testLines) {
      expect(line).not.toContain('|| true')
    }
  })
})

describe('CI Workflow — No Redundant macOS Builder', () => {
  it('CI workflow does NOT have a macos-latest runner', () => {
    expect(ciYml).not.toContain('macos-latest')
  })

  it('CI workflow does NOT build desktop packages', () => {
    expect(ciYml).not.toContain('package:mac')
    expect(ciYml).not.toContain('package:linux')
    expect(ciYml).not.toContain('package:win')
  })
})

describe('CI Workflow — Prompts Build Step', () => {
  it('CI extension job builds prompts package', () => {
    expect(ciYml).toContain('pnpm --filter @aibuddy/prompts build')
  })

  it('CI desktop job builds prompts package', () => {
    const desktopSection = ciYml.slice(
      ciYml.indexOf('Desktop — Lint'),
      ciYml.indexOf('API — Validate')
    )
    expect(desktopSection).toContain('pnpm --filter @aibuddy/prompts build')
  })
})

describe('CI Workflow — Submodules', () => {
  it('CI extension checkout includes submodules', () => {
    const extSection = ciYml.slice(
      ciYml.indexOf('Extension — Lint'),
      ciYml.indexOf('Desktop — Lint')
    )
    expect(extSection).toContain('submodules: true')
  })

  it('CI desktop checkout includes submodules', () => {
    const deskSection = ciYml.slice(
      ciYml.indexOf('Desktop — Lint'),
      ciYml.indexOf('API — Validate')
    )
    expect(deskSection).toContain('submodules: true')
  })
})

describe('Release Workflow — Concurrency', () => {
  it('release workflow has concurrency group', () => {
    expect(releaseYml).toContain('concurrency:')
    expect(releaseYml).toContain('cancel-in-progress: false')
  })

  it('CI workflow cancels in-progress runs', () => {
    expect(ciYml).toContain('cancel-in-progress: true')
  })
})

describe('Release Workflow — workflow_dispatch', () => {
  it('release workflow supports manual trigger', () => {
    expect(releaseYml).toContain('workflow_dispatch')
  })

  it('has skip_tests option for emergency releases', () => {
    expect(releaseYml).toContain('skip_tests')
  })

  it('has deploy_targets option', () => {
    expect(releaseYml).toContain('deploy_targets')
  })
})

describe('Release Workflow — MAS Validation (ITMS-90886 aware)', () => {
  it('does NOT hard-fail on missing helper profiles', () => {
    const validationBlock = releaseYml.slice(
      releaseYml.indexOf('Validate MAS build'),
      releaseYml.indexOf('List build artifacts')
    )
    expect(validationBlock).not.toContain('FAIL — $(basename "$helper") MISSING provisioning profile')
  })

  it('acknowledges ITMS-90886 in helper check', () => {
    expect(releaseYml).toContain('ITMS-90886')
  })
})

describe('Version Consistency', () => {
  it('desktop and extension versions match', () => {
    expect(desktopPkg.version).toBe(extPkg.version)
  })

  it('versions are semver format', () => {
    expect(desktopPkg.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(extPkg.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('CI Workflow — API Tests', () => {
  it('API tests use npm ci (not install)', () => {
    const apiSection = ciYml.slice(ciYml.indexOf('API — Validate'))
    expect(apiSection).toContain('npm ci')
  })

  it('API tests use jest --verbose --ci', () => {
    expect(ciYml).toContain('jest --verbose --ci')
  })
})

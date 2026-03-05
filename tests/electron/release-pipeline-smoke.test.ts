/**
 * Release Pipeline & Developer Workflow Smoke Tests
 *
 * Validates that the release pipeline, package structure, CI/CD workflows,
 * and documentation are correctly configured so any new developer can:
 * 1. Update shared packages
 * 2. Push to main repo
 * 3. Trust that GitHub Actions will release to all targets
 *
 * RULE: Import real functions from source files — NO code duplication.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../../../')
const DESKTOP_ROOT = resolve(__dirname, '../../')

describe('Package Structure — All packages have required files', () => {
  const packages = [
    { name: '@aibuddy/core', dir: 'packages/core' },
    { name: '@aibuddy/prompts', dir: 'packages/prompts' },
    { name: '@aibuddy/types', dir: 'packages/types' },
    { name: '@aibuddy/ui', dir: 'packages/ui' },
  ]

  for (const pkg of packages) {
    it(`${pkg.name} must have package.json`, () => {
      const pkgPath = resolve(ROOT, pkg.dir, 'package.json')
      expect(existsSync(pkgPath)).toBe(true)
    })

    it(`${pkg.name} must have src/ directory`, () => {
      expect(existsSync(resolve(ROOT, pkg.dir, 'src'))).toBe(true)
    })
  }

  it('@aibuddy/core must have build script (tsup)', () => {
    const pkgJson = JSON.parse(readFileSync(resolve(ROOT, 'packages/core/package.json'), 'utf-8'))
    expect(pkgJson.scripts?.build).toBeDefined()
  })

  it('@aibuddy/prompts must have build script', () => {
    const pkgJson = JSON.parse(readFileSync(resolve(ROOT, 'packages/prompts/package.json'), 'utf-8'))
    expect(pkgJson.scripts?.build).toBeDefined()
  })

  it('@aibuddy/types must have build script', () => {
    const pkgJson = JSON.parse(readFileSync(resolve(ROOT, 'packages/types/package.json'), 'utf-8'))
    expect(pkgJson.scripts?.build).toBeDefined()
  })
})

describe('Package Dependencies — workspace:* linking', () => {
  it('extension uses @aibuddy/prompts via workspace:*', () => {
    const pkgJson = JSON.parse(readFileSync(resolve(ROOT, 'extension/package.json'), 'utf-8'))
    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
    expect(deps['@aibuddy/prompts']).toMatch(/workspace:\*/)
  })

  it('desktop uses @aibuddy/prompts via workspace:*', () => {
    const pkgJson = JSON.parse(readFileSync(resolve(DESKTOP_ROOT, 'package.json'), 'utf-8'))
    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
    expect(deps['@aibuddy/prompts']).toMatch(/workspace:\*/)
  })
})

describe('pnpm Workspace — Configuration', () => {
  it('root pnpm-workspace.yaml must exist', () => {
    expect(existsSync(resolve(ROOT, 'pnpm-workspace.yaml'))).toBe(true)
  })

  it('root workspace includes packages/*', () => {
    const workspace = readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf-8')
    expect(workspace).toContain("packages/*")
  })

  it('root workspace includes extension', () => {
    const workspace = readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf-8')
    expect(workspace).toContain('extension')
  })

  it('root workspace includes aibuddy-desktop', () => {
    const workspace = readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf-8')
    expect(workspace).toContain('aibuddy-desktop')
  })
})

describe('GitHub Actions — Release Workflow Structure', () => {
  const releasePath = resolve(ROOT, '.github/workflows/release-on-master.yml')
  const releaseYml = existsSync(releasePath) ? readFileSync(releasePath, 'utf-8') : ''

  it('release workflow file must exist', () => {
    expect(existsSync(releasePath)).toBe(true)
  })

  it('must trigger on push to main or master', () => {
    expect(releaseYml).toMatch(/push:\s*\n\s*branches:\s*\[.*main.*\]/)
  })

  it('must have test-api job', () => {
    expect(releaseYml).toContain('test-api')
  })

  it('must have test-extension job', () => {
    expect(releaseYml).toContain('test-extension')
  })

  it('must have test-desktop job', () => {
    expect(releaseYml).toContain('test-desktop')
  })

  it('must have publish-extension job', () => {
    expect(releaseYml).toContain('publish-extension')
  })

  it('must have build-desktop-mac job', () => {
    expect(releaseYml).toContain('build-desktop-mac')
  })

  it('must have deploy-servers job', () => {
    expect(releaseYml).toContain('deploy-servers')
  })

  it('must have create-github-release job', () => {
    expect(releaseYml).toContain('create-github-release')
  })

  it('must have upload-app-store job', () => {
    expect(releaseYml).toContain('upload-app-store')
  })

  it('tests must gate publish (publish-extension needs test-extension)', () => {
    const publishSection = releaseYml.slice(releaseYml.indexOf('publish-extension'))
    expect(publishSection).toContain('test-extension')
  })

  it('tests must gate desktop build (build-desktop-mac needs test-desktop)', () => {
    const buildSection = releaseYml.slice(releaseYml.indexOf('build-desktop-mac'))
    expect(buildSection).toContain('test-desktop')
  })
})

describe('GitHub Actions — CI Workflow for PRs', () => {
  const ciPath = resolve(ROOT, '.github/workflows/ci.yml')
  const ciYml = existsSync(ciPath) ? readFileSync(ciPath, 'utf-8') : ''

  it('CI workflow file must exist', () => {
    expect(existsSync(ciPath)).toBe(true)
  })

  it('must trigger on pull_request', () => {
    expect(ciYml).toContain('pull_request')
  })

  it('must test extension (TypeScript check + unit tests)', () => {
    expect(ciYml).toContain('tsc --noEmit')
  })

  it('must test desktop', () => {
    expect(ciYml).toContain('pnpm test')
  })

  it('must test API', () => {
    expect(ciYml).toContain('jest')
  })
})

describe('GitHub Actions — Additional Workflows', () => {
  const workflowDir = resolve(ROOT, '.github/workflows')

  it('deploy-extension.yml must exist (manual VS Code publish)', () => {
    expect(existsSync(resolve(workflowDir, 'deploy-extension.yml'))).toBe(true)
  })

  it('deploy-desktop.yml must exist (tag-based desktop release)', () => {
    expect(existsSync(resolve(workflowDir, 'deploy-desktop.yml'))).toBe(true)
  })
})

describe('Release Target — VS Code Marketplace', () => {
  const extPkg = JSON.parse(readFileSync(resolve(ROOT, 'extension/package.json'), 'utf-8'))

  it('extension must have publisher AIBuddyStudio', () => {
    expect(extPkg.publisher).toBe('AIBuddyStudio')
  })

  it('extension must have displayName', () => {
    expect(extPkg.displayName).toBeDefined()
    expect(extPkg.displayName.length).toBeGreaterThan(0)
  })

  it('extension must have vsce package script', () => {
    const scripts = extPkg.scripts || {}
    const hasPackage = Object.values(scripts).some((s: unknown) =>
      typeof s === 'string' && (s.includes('vsce package') || s.includes('vsce publish'))
    )
    expect(hasPackage).toBe(true)
  })
})

describe('Release Target — macOS Desktop', () => {
  it('electron-builder config must exist', () => {
    const hasConfig = existsSync(resolve(DESKTOP_ROOT, 'electron-builder.yml')) ||
                      existsSync(resolve(DESKTOP_ROOT, 'electron-builder.json5'))
    const pkgJson = JSON.parse(readFileSync(resolve(DESKTOP_ROOT, 'package.json'), 'utf-8'))
    expect(hasConfig || pkgJson.build).toBeTruthy()
  })

  it('macOS entitlements must exist', () => {
    expect(existsSync(resolve(DESKTOP_ROOT, 'build/entitlements.mac.plist'))).toBe(true)
  })

  it('MAS entitlements must exist', () => {
    expect(existsSync(resolve(DESKTOP_ROOT, 'build/entitlements.mas.plist'))).toBe(true)
  })
})

describe('Developer Documentation — Required Guides', () => {
  const requiredDocs = [
    { path: 'docs/E2E_TESTING_KIT.md', desc: 'E2E Testing Kit' },
    { path: 'docs/CI_CD_SECRETS_REFERENCE.md', desc: 'CI/CD Secrets' },
    { path: 'aibuddy-desktop/docs/MODULARIZATION_GUIDE.md', desc: 'Modularization Guide' },
    { path: 'aibuddy-desktop/docs/LOCAL_DATABASE_ARCHITECTURE.md', desc: 'Local DB Architecture' },
    { path: 'aibuddy-desktop/DESKTOP_APP_GUIDE.md', desc: 'Desktop App Guide' },
    { path: 'aibuddy-desktop/STORE_SUBMISSION_GUIDE.md', desc: 'Store Submission Guide' },
    { path: 'aibuddy-desktop/SHARED_CODE_ARCHITECTURE.md', desc: 'Shared Code Architecture' },
    { path: 'KNOWN_ISSUES.md', desc: 'Known Issues' },
    { path: 'extension/CHANGELOG.md', desc: 'Extension Changelog' },
    { path: 'BACKEND_MIGRATION.md', desc: 'Backend Migration' },
  ]

  for (const doc of requiredDocs) {
    it(`${doc.desc} (${doc.path}) must exist`, () => {
      expect(existsSync(resolve(ROOT, doc.path))).toBe(true)
    })
  }
})

describe('Developer Onboarding — Modularization Guide Content', () => {
  const modGuidePath = resolve(ROOT, 'aibuddy-desktop/docs/MODULARIZATION_GUIDE.md')
  const content = readFileSync(modGuidePath, 'utf-8')

  it('must have New Developer Quick Start section', () => {
    expect(content).toContain('New Developer Quick Start')
  })

  it('must explain how to update a shared package', () => {
    expect(content).toContain('How to Update a Shared Package')
  })

  it('must explain how to update the main repo', () => {
    expect(content).toContain('How to Update the Main Repo with Latest Packages')
  })

  it('must document the automatic release pipeline', () => {
    expect(content).toContain('Automatic Release Pipeline')
  })

  it('must list all deployment targets', () => {
    expect(content).toContain('VS Code Marketplace')
    expect(content).toContain('GitHub Releases')
    expect(content).toContain('App Store Connect')
  })

  it('must list required GitHub secrets', () => {
    expect(content).toContain('MAC_CERTS_BASE64')
    expect(content).toContain('VSCE_PAT')
    expect(content).toContain('DENVER_SSH_KEY')
  })

  it('must document package build order', () => {
    expect(content).toContain('Package Build Order')
    expect(content).toContain('@aibuddy/types')
    expect(content).toContain('@aibuddy/prompts')
    expect(content).toContain('@aibuddy/core')
  })

  it('must have key docs index table', () => {
    expect(content).toContain('Key Docs Index')
  })

  it('must link to related documentation', () => {
    expect(content).toContain('Related Documentation')
  })
})

describe('Version Consistency — Extension + Desktop + Docs', () => {
  const extPkg = JSON.parse(readFileSync(resolve(ROOT, 'extension/package.json'), 'utf-8'))
  const deskPkg = JSON.parse(readFileSync(resolve(DESKTOP_ROOT, 'package.json'), 'utf-8'))

  it('extension and desktop versions MUST match', () => {
    expect(extPkg.version).toBe(deskPkg.version)
  })

  it('versions must be valid semver', () => {
    expect(extPkg.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(deskPkg.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('Package Test Scripts — All testable packages have test commands', () => {
  it('extension must have test:unit script', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'extension/package.json'), 'utf-8'))
    expect(pkg.scripts?.['test:unit']).toBeDefined()
  })

  it('desktop must have test script', () => {
    const pkg = JSON.parse(readFileSync(resolve(DESKTOP_ROOT, 'package.json'), 'utf-8'))
    expect(pkg.scripts?.test).toBeDefined()
  })

  it('@aibuddy/core must have test script', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'packages/core/package.json'), 'utf-8'))
    expect(pkg.scripts?.test).toBeDefined()
  })

  it('@aibuddy/prompts must have test script', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'packages/prompts/package.json'), 'utf-8'))
    expect(pkg.scripts?.test).toBeDefined()
  })
})

describe('Security — No Secrets in Package Source', () => {
  const checkNoSecrets = (dir: string, label: string) => {
    const pkgSrc = resolve(ROOT, dir, 'src')
    if (!existsSync(pkgSrc)) return

    const srcFiles: string[] = []
    const walk = (d: string) => {
      try {
        const { readdirSync, statSync } = require('fs')
        for (const f of readdirSync(d)) {
          const full = resolve(d, f)
          if (statSync(full).isDirectory()) walk(full)
          else if (f.endsWith('.ts') || f.endsWith('.js')) srcFiles.push(full)
        }
      } catch { /* skip */ }
    }
    walk(pkgSrc)

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8')
      it(`${label}/${file.replace(ROOT + '/', '')} must not contain AWS API Gateway URLs`, () => {
        expect(content).not.toMatch(/execute-api\.us-east-\d\.amazonaws\.com/)
      })
      it(`${label}/${file.replace(ROOT + '/', '')} must not contain Sentry DSNs`, () => {
        expect(content).not.toMatch(/https:\/\/\w+@\w+\.ingest\.sentry\.io/)
      })
    }
  }

  checkNoSecrets('packages/core', '@aibuddy/core')
  checkNoSecrets('packages/types', '@aibuddy/types')
  checkNoSecrets('packages/prompts', '@aibuddy/prompts')
})

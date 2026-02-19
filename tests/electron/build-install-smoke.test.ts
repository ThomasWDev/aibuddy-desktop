/**
 * Build & Install Smoke Tests — Regression Guards
 * Validates that the build configuration, output paths, and packaging
 * setup are correct for production releases.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../..')
const pkgPath = resolve(ROOT, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

describe('Package.json Build Configuration', () => {
  it('has valid semver version', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('version is at least 1.5.64', () => {
    const [major, minor, patch] = pkg.version.split('.').map(Number)
    expect(major * 10000 + minor * 100 + patch).toBeGreaterThanOrEqual(10564)
  })

  it('has build configuration', () => {
    expect(pkg.build).toBeDefined()
  })

  it('has correct appId', () => {
    expect(pkg.build.appId).toBe('com.aibuddy.desktop')
  })

  it('has mac target configuration', () => {
    expect(pkg.build.mac).toBeDefined()
  })

  it('build output goes to release/ directory', () => {
    const outputDir = pkg.build.directories?.output || 'release'
    expect(outputDir).toBe('release')
  })
})

describe('Entitlements Files', () => {
  it('entitlements.mac.plist exists', () => {
    expect(existsSync(resolve(ROOT, 'build/entitlements.mac.plist'))).toBe(true)
  })

  it('entitlements.mas.plist exists', () => {
    expect(existsSync(resolve(ROOT, 'build/entitlements.mas.plist'))).toBe(true)
  })
})

describe('Extension-Desktop Version Sync', () => {
  it('desktop version matches extension version', () => {
    const extPkgPath = resolve(ROOT, '../extension/package.json')
    if (existsSync(extPkgPath)) {
      const extPkg = JSON.parse(readFileSync(extPkgPath, 'utf-8'))
      expect(extPkg.version).toBe(pkg.version)
    }
  })
})

describe('Desktop App Guide Documentation', () => {
  it('DESKTOP_APP_GUIDE.md exists', () => {
    expect(existsSync(resolve(ROOT, 'DESKTOP_APP_GUIDE.md'))).toBe(true)
  })

  it('guide mentions ditto for installation', () => {
    const guide = readFileSync(resolve(ROOT, 'DESKTOP_APP_GUIDE.md'), 'utf-8')
    expect(guide).toContain('ditto')
  })

  it('guide mentions pkill before install', () => {
    const guide = readFileSync(resolve(ROOT, 'DESKTOP_APP_GUIDE.md'), 'utf-8')
    expect(guide).toContain('pkill')
  })

  it('guide mentions hdiutil for DMG management', () => {
    const guide = readFileSync(resolve(ROOT, 'DESKTOP_APP_GUIDE.md'), 'utf-8')
    expect(guide).toContain('hdiutil')
  })

  it('guide mentions release/ output directory', () => {
    const guide = readFileSync(resolve(ROOT, 'DESKTOP_APP_GUIDE.md'), 'utf-8')
    expect(guide).toContain('release/')
  })
})

describe('E2E Testing Kit Documentation', () => {
  it('E2E_TESTING_KIT.md exists', () => {
    expect(existsSync(resolve(ROOT, '../docs/E2E_TESTING_KIT.md'))).toBe(true)
  })

  it('testing kit mentions Visual Studio Code full path', () => {
    const doc = readFileSync(resolve(ROOT, '../docs/E2E_TESTING_KIT.md'), 'utf-8')
    expect(doc).toContain('/Applications/Visual Studio Code.app')
  })

  it('testing kit warns against using code CLI from Cursor', () => {
    const doc = readFileSync(resolve(ROOT, '../docs/E2E_TESTING_KIT.md'), 'utf-8')
    expect(doc.toLowerCase()).toContain('cursor')
  })
})

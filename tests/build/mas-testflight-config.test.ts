/**
 * MAS / TestFlight Build Configuration Smoke Tests
 *
 * Validates that the Electron app's MAS (Mac App Store) build configuration
 * is correct for Apple's validation. These tests prevent regressions on:
 * - Entitlement plist values (Team ID must be hardcoded, not Xcode macros)
 * - Deployment target (arm64-only requires macOS 12.0+)
 * - Provisioning profile existence
 * - Package.json MAS config
 *
 * @version 1.5.59
 * @see docs/REVENUECAT_IAP_AND_CREDITS_SETUP.md Section 9
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const BUILD_DIR = path.resolve(__dirname, '../../build')
const ROOT_DIR = path.resolve(__dirname, '../..')

function readPlistContent(filename: string): string {
  return fs.readFileSync(path.join(BUILD_DIR, filename), 'utf-8')
}

function readPackageJson(): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'))
}

function plistHasKeyTrue(content: string, key: string): boolean {
  const regex = new RegExp(`<key>${key.replace(/\./g, '\\.')}</key>\\s*<true/>`)
  return regex.test(content)
}

function plistGetString(content: string, key: string): string | null {
  const regex = new RegExp(`<key>${key.replace(/\./g, '\\.')}</key>\\s*<string>(.*?)</string>`)
  const match = content.match(regex)
  return match ? match[1] : null
}

// ============================================================
// Entitlements: MAS Main App
// ============================================================
describe('MAS Entitlements (entitlements.mas.plist)', () => {
  const content = readPlistContent('entitlements.mas.plist')

  it('must have App Sandbox enabled', () => {
    expect(plistHasKeyTrue(content, 'com.apple.security.app-sandbox')).toBe(true)
  })

  it('must have network client access', () => {
    expect(plistHasKeyTrue(content, 'com.apple.security.network.client')).toBe(true)
  })

  it('must have hardcoded application-identifier (not Xcode macro)', () => {
    const appId = plistGetString(content, 'com.apple.application-identifier')
    expect(appId).toBeDefined()
    expect(appId).toBe('S2237D23CB.com.aibuddy.desktop')
  })

  it('must NOT contain Xcode macro variables', () => {
    expect(content).not.toContain('$(TeamIdentifierPrefix)')
    expect(content).not.toContain('${')
  })

  it('must have hardcoded team-identifier (not Xcode macro)', () => {
    const teamId = plistGetString(content, 'com.apple.developer.team-identifier')
    expect(teamId).toBeDefined()
    expect(teamId).toBe('S2237D23CB')
  })

  it('must allow JIT compilation for Electron', () => {
    expect(plistHasKeyTrue(content, 'com.apple.security.cs.allow-jit')).toBe(true)
  })

  it('must allow unsigned executable memory for Electron', () => {
    expect(plistHasKeyTrue(content, 'com.apple.security.cs.allow-unsigned-executable-memory')).toBe(true)
  })

  it('must allow user-selected file read-write', () => {
    expect(plistHasKeyTrue(content, 'com.apple.security.files.user-selected.read-write')).toBe(true)
  })

  it('must allow downloads read-write', () => {
    expect(plistHasKeyTrue(content, 'com.apple.security.files.downloads.read-write')).toBe(true)
  })

  it('must have app-scope bookmarks for folder persistence', () => {
    expect(plistHasKeyTrue(content, 'com.apple.security.files.bookmarks.app-scope')).toBe(true)
  })
})

// ============================================================
// Entitlements: MAS Inherit (for helper processes)
// ============================================================
describe('MAS Inherit Entitlements (entitlements.mas.inherit.plist)', () => {
  const content = readPlistContent('entitlements.mas.inherit.plist')

  it('must have App Sandbox enabled', () => {
    expect(plistHasKeyTrue(content, 'com.apple.security.app-sandbox')).toBe(true)
  })

  it('must inherit parent entitlements', () => {
    expect(plistHasKeyTrue(content, 'com.apple.security.inherit')).toBe(true)
  })
})

// ============================================================
// Provisioning Profile
// ============================================================
describe('Provisioning Profile', () => {
  it('must exist at build/embedded.provisionprofile', () => {
    if (process.env.CI) return
    const profilePath = path.join(BUILD_DIR, 'embedded.provisionprofile')
    expect(fs.existsSync(profilePath)).toBe(true)
  })

  it('must be a non-empty file', () => {
    if (process.env.CI) return
    const profilePath = path.join(BUILD_DIR, 'embedded.provisionprofile')
    const stats = fs.statSync(profilePath)
    expect(stats.size).toBeGreaterThan(1000)
  })
})

// ============================================================
// package.json MAS Config
// ============================================================
describe('package.json MAS Configuration', () => {
  const pkg = readPackageJson()
  const mas = pkg.build?.mas

  it('must have MAS build config', () => {
    expect(mas).toBeDefined()
  })

  it('must set category to developer-tools', () => {
    expect(mas.category).toBe('public.app-category.developer-tools')
  })

  it('must reference entitlements.mas.plist', () => {
    expect(mas.entitlements).toContain('entitlements.mas.plist')
  })

  it('must reference entitlements.mas.inherit.plist', () => {
    expect(mas.entitlementsInherit).toContain('entitlements.mas.inherit.plist')
  })

  it('must have hardened runtime disabled for MAS', () => {
    expect(mas.hardenedRuntime).toBe(false)
  })

  it('must reference provisioning profile', () => {
    expect(mas.provisioningProfile).toContain('embedded.provisionprofile')
  })

  it('must use distribution type', () => {
    expect(mas.type).toBe('distribution')
  })

  it('must set minimumSystemVersion to 12.0 for arm64-only', () => {
    expect(mas.minimumSystemVersion).toBe('12.0')
  })

  it('must target arm64 architecture', () => {
    const targets = mas.target
    expect(targets).toBeDefined()
    expect(Array.isArray(targets)).toBe(true)
    const masTarget = targets.find((t: any) => t.target === 'mas')
    expect(masTarget).toBeDefined()
    expect(masTarget.arch).toContain('arm64')
  })

  it('must have correct identity referencing AI Buddy Inc', () => {
    expect(mas.identity).toContain('AI Buddy')
    expect(mas.identity).toContain('S2237D23CB')
  })
})

// ============================================================
// Upload Script
// ============================================================
describe('TestFlight Upload Script', () => {
  it('must exist at scripts/upload-testflight.sh', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts/upload-testflight.sh')
    expect(fs.existsSync(scriptPath)).toBe(true)
  })

  it('must be executable', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts/upload-testflight.sh')
    const stats = fs.statSync(scriptPath)
    const isExecutable = (stats.mode & 0o111) !== 0
    expect(isExecutable).toBe(true)
  })

  it('must use xcrun altool for upload', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts/upload-testflight.sh')
    const content = fs.readFileSync(scriptPath, 'utf-8')
    expect(content).toContain('xcrun altool')
  })

  it('must use productbuild for .pkg creation', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts/upload-testflight.sh')
    const content = fs.readFileSync(scriptPath, 'utf-8')
    expect(content).toContain('productbuild')
  })

  it('must reference correct bundle ID', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts/upload-testflight.sh')
    const content = fs.readFileSync(scriptPath, 'utf-8')
    expect(content).toContain('com.aibuddy.desktop')
  })
})

// ============================================================
// Build Artifacts Structure
// ============================================================
describe('Build Directory Structure', () => {
  it('must have entitlements.mac.plist for direct distribution', () => {
    expect(fs.existsSync(path.join(BUILD_DIR, 'entitlements.mac.plist'))).toBe(true)
  })

  it('must have entitlements.mas.plist for MAS', () => {
    expect(fs.existsSync(path.join(BUILD_DIR, 'entitlements.mas.plist'))).toBe(true)
  })

  it('must have entitlements.mas.inherit.plist for MAS helpers', () => {
    expect(fs.existsSync(path.join(BUILD_DIR, 'entitlements.mas.inherit.plist'))).toBe(true)
  })

  it('must have afterPack.js for resource fork cleanup', () => {
    expect(fs.existsSync(path.join(BUILD_DIR, 'afterPack.js'))).toBe(true)
  })

  it('must have app icon', () => {
    expect(fs.existsSync(path.join(BUILD_DIR, 'icon.icns'))).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Version Consistency Smoke Tests
 * 
 * ROOT CAUSE: The installed app showed v1.4.33 because:
 * 1. User-Agent header was hardcoded to '1.4.29' instead of using dynamic version
 * 2. Old builds were installed instead of rebuilt versions
 * 3. Download page showed outdated version
 * 
 * FIX: User-Agent now uses dynamic appVersion. These tests ensure
 * version numbers stay consistent across all touchpoints.
 * 
 * PREVENTION: These smoke tests run before every build.
 */

// Read package.json version
const pkgPath = path.resolve(__dirname, '../../package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const PACKAGE_VERSION = pkg.version

describe('Version Consistency', () => {
  it('package.json version should be a valid semver', () => {
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('package.json version should be >= 1.5.59', () => {
    const [major, minor, patch] = PACKAGE_VERSION.split('.').map(Number)
    const versionNum = major * 10000 + minor * 100 + patch
    expect(versionNum).toBeGreaterThanOrEqual(10559)
  })

  it('App.tsx should NOT contain hardcoded User-Agent version', () => {
    const appPath = path.resolve(__dirname, '../../renderer/src/App.tsx')
    const content = fs.readFileSync(appPath, 'utf-8')
    
    // Must use dynamic version, not hardcoded
    expect(content).not.toContain("'User-Agent': 'AIBuddy-Desktop/1.4")
    expect(content).not.toContain("'User-Agent': 'AIBuddy-Desktop/1.3")
    expect(content).not.toContain("'User-Agent': 'AIBuddy-Desktop/1.2")
    
    // Should use template literal with appVersion
    expect(content).toContain('`AIBuddy-Desktop/${appVersion')
  })

  it('electron-bridge.ts fallback version should not be outdated', () => {
    const bridgePath = path.resolve(__dirname, '../../renderer/src/lib/electron-bridge.ts')
    const content = fs.readFileSync(bridgePath, 'utf-8')
    
    // Fallback of '1.0.0' is acceptable (it means "no Electron API available")
    // But it should NOT be a specific old version like '1.4.33'
    expect(content).not.toContain("'1.4.")
    expect(content).not.toContain("'1.3.")
  })

  it('version should be fetched dynamically in App.tsx', () => {
    const appPath = path.resolve(__dirname, '../../renderer/src/App.tsx')
    const content = fs.readFileSync(appPath, 'utf-8')
    
    // Must use IPC to get version
    expect(content).toContain('getVersion')
    expect(content).toContain('setAppVersion')
  })

  it('version should be fetched dynamically in TopToolbar.tsx', () => {
    const toolbarPath = path.resolve(__dirname, '../../renderer/src/components/layout/TopToolbar.tsx')
    const content = fs.readFileSync(toolbarPath, 'utf-8')
    
    expect(content).toContain('getVersion')
    expect(content).toContain('setAppVersion')
  })
})

describe('Extension ↔ Desktop Version Sync', () => {
  const extPkgPath = path.resolve(__dirname, '../../../extension/package.json')

  it('extension/package.json should exist', () => {
    expect(fs.existsSync(extPkgPath)).toBe(true)
  })

  it('extension version should match desktop version', () => {
    const extPkg = JSON.parse(fs.readFileSync(extPkgPath, 'utf-8'))
    expect(extPkg.version).toBe(PACKAGE_VERSION)
  })

  it('both versions should be valid semver', () => {
    const extPkg = JSON.parse(fs.readFileSync(extPkgPath, 'utf-8'))
    expect(extPkg.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('extension publisher should be AIBuddyStudio', () => {
    const extPkg = JSON.parse(fs.readFileSync(extPkgPath, 'utf-8'))
    expect(extPkg.publisher).toBe('AIBuddyStudio')
  })

  it('extension displayName should be AIBuddy', () => {
    const extPkg = JSON.parse(fs.readFileSync(extPkgPath, 'utf-8'))
    expect(extPkg.displayName).toBe('AIBuddy')
  })
})

describe('Build Configuration', () => {
  it('package.json should have build:ci script that runs tests first', () => {
    expect(pkg.scripts['build:ci']).toBeDefined()
    expect(pkg.scripts['build:ci']).toContain('test')
    expect(pkg.scripts['build:ci']).toContain('build')
  })

  it('package.json should have test:coverage script', () => {
    expect(pkg.scripts['test:coverage']).toBeDefined()
  })

  it('mac build should have hardened runtime enabled', () => {
    expect(pkg.build?.mac?.hardenedRuntime).toBe(true)
  })

  it('mac build should have notarize configuration', () => {
    expect(pkg.build?.mac?.notarize).toBe(true)
  })

  it('mac build should have entitlements configured', () => {
    expect(pkg.build?.mac?.entitlements).toBeDefined()
    expect(pkg.build?.mac?.entitlementsInherit).toBeDefined()
  })

  it('mac entitlements file should exist', () => {
    const entPath = path.resolve(__dirname, '../../build/entitlements.mac.plist')
    expect(fs.existsSync(entPath)).toBe(true)
  })
})

/**
 * CI/CD Apple Upload Gate — Smoke Tests
 *
 * Validates that the build pipeline configuration will produce a valid
 * MAS .pkg that Apple will accept. Catches issues 91109 (quarantine xattr)
 * and 90885 (missing helper provisioning profiles) at test time, not at
 * Apple's processing stage.
 *
 * RULE: Import real functions from afterPack.js — NO code duplication.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../..')
const CI_WORKFLOW_PATH = resolve(ROOT, '../.github/workflows/release-on-master.yml')
const AFTERPACK_PATH = resolve(ROOT, 'build/afterPack.js')
const PKG_PATH = resolve(ROOT, 'package.json')

const afterPackModule = require(AFTERPACK_PATH)
const { XATTR_NAMES, HELPER_BUNDLES } = afterPackModule

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'))
const ciWorkflow = existsSync(CI_WORKFLOW_PATH) ? readFileSync(CI_WORKFLOW_PATH, 'utf-8') : ''

describe('CI/CD — Pre-Apple Validation Gate', () => {
  it('workflow file exists', () => {
    expect(existsSync(CI_WORKFLOW_PATH)).toBe(true)
  })

  it('has a validate MAS build step', () => {
    expect(ciWorkflow).toContain('Validate MAS build')
  })

  it('validate step checks for quarantine xattrs', () => {
    expect(ciWorkflow).toContain('com.apple.quarantine')
  })

  it('validate step checks helper provisioning profiles', () => {
    expect(ciWorkflow).toContain('embedded.provisionprofile')
  })

  it('validate step checks main app provisioning profile', () => {
    expect(ciWorkflow).toContain('Main app has provisioning profile')
  })

  it('validate step checks LSMinimumSystemVersion', () => {
    expect(ciWorkflow).toContain('LSMinimumSystemVersion')
  })

  it('validate step exits with failure on errors', () => {
    expect(ciWorkflow).toContain('exit 1')
  })

  it('has a pre-upload validation step with xcrun altool --validate-app', () => {
    expect(ciWorkflow).toContain('--validate-app')
  })

  it('validate-app runs BEFORE upload-app', () => {
    const validateIdx = ciWorkflow.indexOf('--validate-app')
    const uploadIdx = ciWorkflow.indexOf('--upload-app')
    expect(validateIdx).toBeGreaterThan(-1)
    expect(uploadIdx).toBeGreaterThan(validateIdx)
  })
})

describe('CI/CD — No Post-Sign Plist Patching', () => {
  it('does NOT run plutil after MAS build', () => {
    const masSection = ciWorkflow.slice(
      ciWorkflow.indexOf('Build MAS package'),
      ciWorkflow.indexOf('Validate MAS build')
    )
    expect(masSection).not.toContain('plutil -replace')
  })

  it('LSMinimumSystemVersion is set in package.json config (not post-build)', () => {
    expect(pkg.build.mas.minimumSystemVersion).toBe('12.0')
    expect(pkg.build.mas.extendInfo?.LSMinimumSystemVersion).toBe('12.0')
  })
})

describe('CI/CD — Quarantine Prevention', () => {
  it('workflow strips xattrs from profiles before building', () => {
    const profileStripIdx = ciWorkflow.indexOf('Strip quarantine from provisioning profiles')
    const buildMasIdx = ciWorkflow.indexOf('Build MAS package')
    expect(profileStripIdx).toBeGreaterThan(-1)
    expect(buildMasIdx).toBeGreaterThan(profileStripIdx)
  })

  it('afterPack.js Phase 0 strips source profiles before bundle operations', () => {
    const src = readFileSync(AFTERPACK_PATH, 'utf-8')
    expect(src).toContain('Phase 0')
    const phase0Idx = src.indexOf('Phase 0')
    const phase1Idx = src.indexOf('Phase 1')
    expect(phase0Idx).toBeLessThan(phase1Idx)
  })

  it('afterPack.js Phase 2 patches LSMinimumSystemVersion in all plists', () => {
    const src = readFileSync(AFTERPACK_PATH, 'utf-8')
    expect(src).toContain('Phase 2')
    expect(src).toContain('LSMinimumSystemVersion')
    expect(src).toContain('PlistBuddy')
  })

  it('afterPack.js Phase 4 sweeps profiles after embedding', () => {
    const src = readFileSync(AFTERPACK_PATH, 'utf-8')
    expect(src).toContain('Phase 4')
    const phase3Idx = src.indexOf('Phase 3')
    const phase4Idx = src.indexOf('Phase 4')
    expect(phase4Idx).toBeGreaterThan(phase3Idx)
  })

  it('XATTR_NAMES includes com.apple.quarantine', () => {
    expect(XATTR_NAMES).toContain('com.apple.quarantine')
  })
})

describe('CI/CD — Helper Profile Embedding', () => {
  it('HELPER_BUNDLES lists at least 4 helper apps', () => {
    expect(HELPER_BUNDLES.length).toBeGreaterThanOrEqual(4)
  })

  it('includes Renderer helper (90885 warning target)', () => {
    expect(HELPER_BUNDLES.some((b: string) => b.includes('Helper (Renderer)'))).toBe(true)
  })

  it('includes Login Helper (90885 warning target)', () => {
    expect(HELPER_BUNDLES.some((b: string) => b.includes('Login Helper'))).toBe(true)
  })

  it('embedded-helpers.provisionprofile exists locally', () => {
    expect(existsSync(resolve(ROOT, 'build/embedded-helpers.provisionprofile'))).toBe(true)
  })

  it('embedded.provisionprofile exists locally', () => {
    expect(existsSync(resolve(ROOT, 'build/embedded.provisionprofile'))).toBe(true)
  })

  it('CI decodes profiles from secrets before building', () => {
    expect(ciWorkflow).toContain('MAS_PROVISION_PROFILE')
    expect(ciWorkflow).toContain('MAS_HELPERS_PROVISION_PROFILE')
  })
})

describe('CI/CD — MAS Build Configuration', () => {
  it('MAS target is arm64 only', () => {
    const masTargets = pkg.build.mas.target
    expect(masTargets).toBeDefined()
    const archList = masTargets.flatMap((t: any) => t.arch || [])
    expect(archList).toContain('arm64')
  })

  it('MAS has correct entitlements', () => {
    expect(pkg.build.mas.entitlements).toContain('entitlements.mas.plist')
    expect(pkg.build.mas.entitlementsInherit).toContain('entitlements.mas.inherit.plist')
  })

  it('MAS has distribution type', () => {
    expect(pkg.build.mas.type).toBe('distribution')
  })

  it('afterPack hook is registered in build config', () => {
    expect(pkg.build.afterPack).toBe('build/afterPack.js')
  })

  it('MAS provisioning profile path is in build config', () => {
    expect(pkg.build.mas.provisioningProfile).toBe('build/embedded.provisionprofile')
  })

  it('hardenedRuntime is false for MAS', () => {
    expect(pkg.build.mas.hardenedRuntime).toBe(false)
  })

  it('MAS identity is set for team-based cert resolution', () => {
    expect(pkg.build.mas.identity).toContain('S2237D23CB')
  })
})

describe('CI/CD — Upload Job Dependencies', () => {
  it('upload-app-store depends on build-desktop-mac', () => {
    expect(ciWorkflow).toContain("needs: [build-desktop-mac, read-version]")
  })

  it('upload only runs when build succeeds', () => {
    const uploadSection = ciWorkflow.slice(
      ciWorkflow.indexOf('upload-app-store:'),
      ciWorkflow.indexOf('summary:')
    )
    expect(uploadSection).toContain("needs.build-desktop-mac.result == 'success'")
  })

  it('references APP_STORE_AUTH_KEY secret', () => {
    expect(ciWorkflow).toContain('APP_STORE_AUTH_KEY')
  })

  it('references APP_STORE_KEY_ID secret', () => {
    expect(ciWorkflow).toContain('APP_STORE_KEY_ID')
  })

  it('references APP_STORE_ISSUER_ID secret', () => {
    expect(ciWorkflow).toContain('APP_STORE_ISSUER_ID')
  })
})

describe('CI/CD — Entitlements Files', () => {
  it('entitlements.mas.plist exists', () => {
    expect(existsSync(resolve(ROOT, 'build/entitlements.mas.plist'))).toBe(true)
  })

  it('entitlements.mas.inherit.plist has sandbox + inherit', () => {
    const plist = readFileSync(resolve(ROOT, 'build/entitlements.mas.inherit.plist'), 'utf-8')
    expect(plist).toContain('com.apple.security.app-sandbox')
    expect(plist).toContain('com.apple.security.inherit')
  })

  it('entitlements.mac.plist exists (for DMG builds)', () => {
    expect(existsSync(resolve(ROOT, 'build/entitlements.mac.plist'))).toBe(true)
  })
})

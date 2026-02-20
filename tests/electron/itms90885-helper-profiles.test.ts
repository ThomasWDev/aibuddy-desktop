/**
 * ITMS-90885 Fix — Helper Provisioning Profile Smoke Tests
 *
 * Apple requires every nested .app bundle in a Mac App Store submission
 * to have its own embedded.provisionprofile. Electron apps have 5 helper
 * bundles that electron-builder does NOT provision automatically.
 *
 * This test suite validates that all the infrastructure is in place so
 * the ITMS-90885 error cannot regress.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = resolve(__dirname, '../..')
const BUILD_DIR = join(ROOT, 'build')

const afterPackPath = join(BUILD_DIR, 'afterPack.js')
const afterPackContent = existsSync(afterPackPath) ? readFileSync(afterPackPath, 'utf-8') : ''
const pkgJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))

const EXPECTED_HELPERS = [
  'AIBuddy Helper.app',
  'AIBuddy Helper (GPU).app',
  'AIBuddy Helper (Plugin).app',
  'AIBuddy Helper (Renderer).app',
  'AIBuddy Login Helper.app',
]

describe('ITMS-90885 — afterPack.js', () => {
  it('afterPack.js must exist', () => {
    expect(existsSync(afterPackPath)).toBe(true)
  })

  it('must reference all 5 helper bundles', () => {
    for (const helper of EXPECTED_HELPERS) {
      expect(afterPackContent).toContain(helper)
    }
  })

  it('must detect MAS builds via path, CLI args, or MAS_BUILD env var', () => {
    expect(afterPackContent).toContain('mas-')
    expect(afterPackContent).toContain('process.argv')
    expect(afterPackContent).toContain("MAS_BUILD")
  })

  it('must look for embedded-helpers.provisionprofile first', () => {
    expect(afterPackContent).toContain('embedded-helpers.provisionprofile')
  })

  it('must copy profile into each helper Contents/ directory', () => {
    expect(afterPackContent).toContain('embedded.provisionprofile')
    expect(afterPackContent).toContain('copyFileSync')
  })

  it('must skip non-MAS builds', () => {
    expect(afterPackContent).toContain('Not a MAS build')
  })

  it('must warn if no profile is found', () => {
    expect(afterPackContent).toContain('TestFlight will reject')
  })
})

describe('ITMS-90885 — electron-builder config (package.json)', () => {
  const buildConfig = pkgJson.build

  it('afterPack hook must be registered', () => {
    expect(buildConfig.afterPack).toBe('build/afterPack.js')
  })

  it('mas section must exist', () => {
    expect(buildConfig.mas).toBeDefined()
  })

  it('mas.provisioningProfile must point to build/embedded.provisionprofile', () => {
    expect(buildConfig.mas.provisioningProfile).toBe('build/embedded.provisionprofile')
  })

  it('mas.entitlements must point to MAS-specific plist', () => {
    expect(buildConfig.mas.entitlements).toBe('build/entitlements.mas.plist')
  })

  it('mas.entitlementsInherit must point to MAS inherit plist', () => {
    expect(buildConfig.mas.entitlementsInherit).toBe('build/entitlements.mas.inherit.plist')
  })

  it('mas.minimumSystemVersion must be >= 12.0', () => {
    const ver = parseFloat(buildConfig.mas.minimumSystemVersion)
    expect(ver).toBeGreaterThanOrEqual(12.0)
  })

  it('mas.extendInfo.LSMinimumSystemVersion must be >= 12.0', () => {
    const ver = parseFloat(buildConfig.mas.extendInfo?.LSMinimumSystemVersion)
    expect(ver).toBeGreaterThanOrEqual(12.0)
  })

  it('mas.type must be distribution', () => {
    expect(buildConfig.mas.type).toBe('distribution')
  })

  it('mas.hardenedRuntime must be false (MAS uses sandbox instead)', () => {
    expect(buildConfig.mas.hardenedRuntime).toBe(false)
  })

  it('package:mas script must exist', () => {
    expect(pkgJson.scripts['package:mas']).toBeDefined()
    expect(pkgJson.scripts['package:mas']).toContain('mas')
  })
})

describe('ITMS-90885 — MAS entitlements', () => {
  it('entitlements.mas.plist must exist', () => {
    expect(existsSync(join(BUILD_DIR, 'entitlements.mas.plist'))).toBe(true)
  })

  it('entitlements.mas.inherit.plist must exist', () => {
    expect(existsSync(join(BUILD_DIR, 'entitlements.mas.inherit.plist'))).toBe(true)
  })

  it('MAS entitlements must enable app-sandbox', () => {
    const plist = readFileSync(join(BUILD_DIR, 'entitlements.mas.plist'), 'utf-8')
    expect(plist).toContain('com.apple.security.app-sandbox')
  })

  it('MAS entitlements must have Team ID and app identifier', () => {
    const plist = readFileSync(join(BUILD_DIR, 'entitlements.mas.plist'), 'utf-8')
    expect(plist).toContain('S2237D23CB')
    expect(plist).toContain('com.aibuddy.desktop')
  })

  it('MAS inherit entitlements must enable sandbox inherit', () => {
    const plist = readFileSync(join(BUILD_DIR, 'entitlements.mas.inherit.plist'), 'utf-8')
    expect(plist).toContain('com.apple.security.inherit')
  })
})

describe('ITMS-90885 — Provisioning profiles (build assets)', () => {
  it('build/embedded.provisionprofile must exist (main app)', () => {
    if (process.env.CI) return
    expect(existsSync(join(BUILD_DIR, 'embedded.provisionprofile'))).toBe(true)
  })

  it('build/embedded-helpers.provisionprofile must exist (wildcard)', () => {
    if (process.env.CI) return
    expect(existsSync(join(BUILD_DIR, 'embedded-helpers.provisionprofile'))).toBe(true)
  })

  it('helper profile must be non-trivial (> 1KB)', () => {
    if (process.env.CI) return
    const stat = require('fs').statSync(join(BUILD_DIR, 'embedded-helpers.provisionprofile'))
    expect(stat.size).toBeGreaterThan(1024)
  })

  it('main profile must be non-trivial (> 1KB)', () => {
    if (process.env.CI) return
    const stat = require('fs').statSync(join(BUILD_DIR, 'embedded.provisionprofile'))
    expect(stat.size).toBeGreaterThan(1024)
  })
})

describe('ITMS-90885 — CI workflow integration', () => {
  const workflowPath = resolve(ROOT, '../.github/workflows/release-on-master.yml')
  const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf-8') : ''

  it('CI workflow must exist', () => {
    expect(workflow.length).toBeGreaterThan(0)
  })

  it('must decode MAS_PROVISION_PROFILE secret', () => {
    expect(workflow).toContain('MAS_PROVISION_PROFILE')
    expect(workflow).toContain('embedded.provisionprofile')
  })

  it('must decode MAS_HELPERS_PROVISION_PROFILE secret', () => {
    expect(workflow).toContain('MAS_HELPERS_PROVISION_PROFILE')
    expect(workflow).toContain('embedded-helpers.provisionprofile')
  })

  it('must set MAS_BUILD=true env var', () => {
    expect(workflow).toContain('MAS_BUILD')
  })

  it('must verify helper profiles after build', () => {
    expect(workflow).toContain('has provisioning profile')
    expect(workflow).toContain('MISSING provisioning profile')
  })

  it('MAS build must use --publish never', () => {
    expect(workflow).toContain('package:mas -- --publish never')
  })
})

describe('ITMS-90885 — Helper profile creation script', () => {
  const scriptPath = join(ROOT, 'scripts/create-helper-profile.sh')

  it('create-helper-profile.sh must exist', () => {
    expect(existsSync(scriptPath)).toBe(true)
  })

  it('must reference the correct wildcard App ID', () => {
    const script = readFileSync(scriptPath, 'utf-8')
    expect(script).toContain('com.aibuddy.desktop.*')
  })

  it('must use App Store Connect API', () => {
    const script = readFileSync(scriptPath, 'utf-8')
    expect(script).toContain('api.appstoreconnect.apple.com')
  })

  it('must output to build/embedded-helpers.provisionprofile', () => {
    const script = readFileSync(scriptPath, 'utf-8')
    expect(script).toContain('embedded-helpers.provisionprofile')
  })
})

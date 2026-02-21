/**
 * afterPack.js — TDD Tests for Apple Build Error 91109 & Warning 90885
 *
 * Root causes:
 *   91109: com.apple.quarantine xattr on embedded.provisionprofile
 *          because Phase 1 (xattr strip) ran BEFORE Phase 2 (profile copy)
 *   90885: Helper apps missing provisioning profiles
 *
 * Fix: Added Phase 0 (strip source profiles), Phase 3 (post-copy sweep),
 *      and exported helper functions for direct testing.
 *
 * RULE: All functions imported from source — NO code duplication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolve } from 'path'
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs'

const AFTERPACK_PATH = resolve(__dirname, '../../build/afterPack.js')

const afterPackModule = require(AFTERPACK_PATH)
const {
  XATTR_NAMES,
  HELPER_BUNDLES,
  walkSync,
  embedHelperProfiles,
  stripQuarantine,
  stripQuarantineRecursive,
} = afterPackModule

describe('afterPack.js — Exports & Constants', () => {
  it('exports all required functions', () => {
    expect(typeof afterPackModule.default).toBe('function')
    expect(typeof walkSync).toBe('function')
    expect(typeof embedHelperProfiles).toBe('function')
    expect(typeof stripQuarantine).toBe('function')
    expect(typeof stripQuarantineRecursive).toBe('function')
  })

  it('XATTR_NAMES includes com.apple.quarantine', () => {
    expect(XATTR_NAMES).toContain('com.apple.quarantine')
  })

  it('XATTR_NAMES includes all known problematic attributes', () => {
    expect(XATTR_NAMES).toContain('com.apple.FinderInfo')
    expect(XATTR_NAMES).toContain('com.apple.ResourceFork')
    expect(XATTR_NAMES).toContain('com.apple.provenance')
  })

  it('HELPER_BUNDLES covers all Electron helper apps', () => {
    expect(HELPER_BUNDLES.length).toBeGreaterThanOrEqual(4)
    const names = HELPER_BUNDLES.map((b: string) => b.split('/').pop())
    expect(names).toContain('AIBuddy Helper.app')
    expect(names).toContain('AIBuddy Helper (Renderer).app')
    expect(names).toContain('AIBuddy Login Helper.app')
  })
})

describe('walkSync — Directory Traversal', () => {
  const tmpDir = resolve(__dirname, '../../.test-tmp-walkSync')

  beforeEach(() => {
    mkdirSync(resolve(tmpDir, 'sub/deep'), { recursive: true })
    writeFileSync(resolve(tmpDir, 'a.txt'), 'a')
    writeFileSync(resolve(tmpDir, 'sub/b.txt'), 'b')
    writeFileSync(resolve(tmpDir, 'sub/deep/c.txt'), 'c')
    writeFileSync(resolve(tmpDir, '._dotunder'), 'junk')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns the root dir itself', () => {
    const results: string[] = walkSync(tmpDir)
    expect(results[0]).toBe(tmpDir)
  })

  it('finds all nested files and directories', () => {
    const results: string[] = walkSync(tmpDir)
    const basenames = results.map((p: string) => p.split('/').pop())
    expect(basenames).toContain('a.txt')
    expect(basenames).toContain('b.txt')
    expect(basenames).toContain('c.txt')
    expect(basenames).toContain('sub')
    expect(basenames).toContain('deep')
  })

  it('removes ._ (resource fork) files', () => {
    walkSync(tmpDir)
    expect(existsSync(resolve(tmpDir, '._dotunder'))).toBe(false)
  })

  it('handles non-existent directory gracefully', () => {
    const results: string[] = walkSync('/tmp/nonexistent-dir-test-12345')
    expect(results).toEqual(['/tmp/nonexistent-dir-test-12345'])
  })
})

describe('embedHelperProfiles — MAS Profile Embedding', () => {
  const tmpApp = resolve(__dirname, '../../.test-tmp-embed')
  const tmpBuild = resolve(__dirname, '../../.test-tmp-embed-build')
  const masAppPath = resolve(tmpApp, 'mas-arm64/AIBuddy.app')

  beforeEach(() => {
    rmSync(tmpApp, { recursive: true, force: true })
    rmSync(tmpBuild, { recursive: true, force: true })
    mkdirSync(masAppPath, { recursive: true })
    mkdirSync(tmpBuild, { recursive: true })

    for (const bundle of HELPER_BUNDLES) {
      mkdirSync(resolve(masAppPath, bundle, 'Contents'), { recursive: true })
    }

    writeFileSync(resolve(tmpBuild, 'embedded-helpers.provisionprofile'), 'test-profile-data')
    writeFileSync(resolve(tmpBuild, 'embedded.provisionprofile'), 'main-profile-data')
  })

  afterEach(() => {
    rmSync(tmpApp, { recursive: true, force: true })
    rmSync(tmpBuild, { recursive: true, force: true })
  })

  it('embeds profiles when path contains "mas-"', () => {
    embedHelperProfiles(masAppPath, tmpBuild)

    for (const bundle of HELPER_BUNDLES) {
      const profile = resolve(masAppPath, bundle, 'Contents', 'embedded.provisionprofile')
      expect(existsSync(profile)).toBe(true)
      expect(readFileSync(profile, 'utf-8')).toBe('test-profile-data')
    }
  })

  it('prefers embedded-helpers.provisionprofile over embedded.provisionprofile', () => {
    embedHelperProfiles(masAppPath, tmpBuild)
    const firstHelper = HELPER_BUNDLES[0]
    const profile = resolve(masAppPath, firstHelper, 'Contents', 'embedded.provisionprofile')
    expect(readFileSync(profile, 'utf-8')).toBe('test-profile-data')
  })

  it('falls back to embedded.provisionprofile when helpers profile missing', () => {
    rmSync(resolve(tmpBuild, 'embedded-helpers.provisionprofile'))
    embedHelperProfiles(masAppPath, tmpBuild)
    const firstHelper = HELPER_BUNDLES[0]
    const profile = resolve(masAppPath, firstHelper, 'Contents', 'embedded.provisionprofile')
    expect(readFileSync(profile, 'utf-8')).toBe('main-profile-data')
  })

  it('skips non-MAS builds', () => {
    const nonMasPath = resolve(tmpApp, 'mac-arm64/AIBuddy.app')
    mkdirSync(nonMasPath, { recursive: true })
    embedHelperProfiles(nonMasPath, tmpBuild)
    expect(existsSync(resolve(nonMasPath, HELPER_BUNDLES[0], 'Contents', 'embedded.provisionprofile'))).toBe(false)
  })

  it('skips helpers that do not exist', () => {
    const sparseApp = resolve(tmpApp, 'mas-sparse/AIBuddy.app')
    mkdirSync(sparseApp, { recursive: true })
    embedHelperProfiles(sparseApp, tmpBuild)
    // No crash — function handles missing helpers gracefully
  })
})

describe('afterPack Phase Order — 91109 Fix', () => {
  it('source afterPack.js has Phase 0 before Phase 1', () => {
    const src = readFileSync(AFTERPACK_PATH, 'utf-8')
    const phase0Idx = src.indexOf('Phase 0')
    const phase1Idx = src.indexOf('Phase 1')
    const phase2Idx = src.indexOf('Phase 2')
    const phase3Idx = src.indexOf('Phase 3')
    expect(phase0Idx).toBeGreaterThan(-1)
    expect(phase1Idx).toBeGreaterThan(phase0Idx)
    expect(phase2Idx).toBeGreaterThan(phase1Idx)
    expect(phase3Idx).toBeGreaterThan(phase2Idx)
  })

  it('Phase 0 strips source profiles BEFORE bundle xattr cleanup', () => {
    const src = readFileSync(AFTERPACK_PATH, 'utf-8')
    const stripSourceIdx = src.indexOf('stripQuarantine(p)')
    const walkSyncIdx = src.indexOf('walkSync(appPath)')
    expect(stripSourceIdx).toBeLessThan(walkSyncIdx)
  })

  it('Phase 3 runs AFTER embedHelperProfiles', () => {
    const src = readFileSync(AFTERPACK_PATH, 'utf-8')
    const embedIdx = src.indexOf('embedHelperProfiles(appPath, buildDir)')
    const phase3Idx = src.indexOf('Phase 3')
    expect(phase3Idx).toBeGreaterThan(embedIdx)
  })

  it('final stripQuarantineRecursive runs at the very end', () => {
    const src = readFileSync(AFTERPACK_PATH, 'utf-8')
    const lines = src.split('\n')
    const lastRecursiveIdx = src.lastIndexOf('stripQuarantineRecursive(appPath)')
    const readyIdx = src.indexOf('afterPack complete')
    expect(lastRecursiveIdx).toBeLessThan(readyIdx)
    expect(lastRecursiveIdx).toBeGreaterThan(0)
  })
})

describe('afterPack.js — Regression Guards', () => {
  it('source file exists at expected path', () => {
    expect(existsSync(AFTERPACK_PATH)).toBe(true)
  })

  it('package.json references afterPack.js in build config', () => {
    const pkgPath = resolve(__dirname, '../../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(pkg.build.afterPack).toBe('build/afterPack.js')
  })

  it('MAS config has provisioningProfile set', () => {
    const pkgPath = resolve(__dirname, '../../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(pkg.build.mas.provisioningProfile).toBe('build/embedded.provisionprofile')
  })

  it('MAS config has entitlements for sandbox', () => {
    const pkgPath = resolve(__dirname, '../../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(pkg.build.mas.entitlements).toContain('entitlements.mas.plist')
    expect(pkg.build.mas.entitlementsInherit).toContain('entitlements.mas.inherit.plist')
  })

  it('MAS has minimumSystemVersion 12.0', () => {
    const pkgPath = resolve(__dirname, '../../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(pkg.build.mas.minimumSystemVersion).toBe('12.0')
  })

  it('embedded.provisionprofile exists in build directory', () => {
    const profile = resolve(__dirname, '../../build/embedded.provisionprofile')
    expect(existsSync(profile)).toBe(true)
  })

  it('embedded-helpers.provisionprofile exists in build directory', () => {
    const profile = resolve(__dirname, '../../build/embedded-helpers.provisionprofile')
    expect(existsSync(profile)).toBe(true)
  })

  it('entitlements.mas.inherit.plist has sandbox + inherit flags', () => {
    const plist = readFileSync(
      resolve(__dirname, '../../build/entitlements.mas.inherit.plist'),
      'utf-8'
    )
    expect(plist).toContain('com.apple.security.app-sandbox')
    expect(plist).toContain('com.apple.security.inherit')
  })
})

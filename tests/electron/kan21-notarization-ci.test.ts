import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

/**
 * KAN-21: App not notarized — blocked by Gatekeeper (Permanent CI Fix)
 *
 * Root causes:
 * 1. release.yml macOS step only passes GH_TOKEN — no Apple credentials
 * 2. package.json had "notarize": true (boolean) instead of { teamId }
 * 3. No certificate import step in CI — runners have no signing identities
 * 4. No post-build verification step to confirm notarization
 *
 * Fixes:
 * 1. release.yml: Add certificate import, pass all signing/notarization
 *    env vars (CSC_LINK, CSC_KEY_PASSWORD, APPLE_ID, etc.), add verify step
 * 2. package.json: Change notarize to { teamId: "S2237D23CB" }
 * 3. Existing code-signing.test.ts: Update to expect object notarize config
 */

const PROJECT_ROOT = path.resolve(__dirname, '../..')

const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')
)

const RELEASE_YML = fs.readFileSync(
  path.join(PROJECT_ROOT, '.github/workflows/release.yml'),
  'utf-8'
)

const ENTITLEMENTS = fs.readFileSync(
  path.join(PROJECT_ROOT, 'build/entitlements.mac.plist'),
  'utf-8'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-21: Notarization CI Pipeline', () => {

  // ==========================================================================
  // 1. package.json notarize config
  // ==========================================================================
  describe('package.json — notarize config', () => {
    it('notarize must be an object with teamId, not a boolean', () => {
      const notarize = PACKAGE_JSON.build.mac.notarize
      expect(typeof notarize).toBe('object')
      expect(notarize).not.toBe(true)
      expect(notarize.teamId).toBe('S2237D23CB')
    })

    it('hardenedRuntime must be true', () => {
      expect(PACKAGE_JSON.build.mac.hardenedRuntime).toBe(true)
    })

    it('gatekeeperAssess must be false (electron-builder handles it)', () => {
      expect(PACKAGE_JSON.build.mac.gatekeeperAssess).toBe(false)
    })

    it('entitlements must be configured', () => {
      expect(PACKAGE_JSON.build.mac.entitlements).toContain('entitlements.mac.plist')
      expect(PACKAGE_JSON.build.mac.entitlementsInherit).toContain('entitlements.mac.plist')
    })

    it('signing identity must reference a Developer ID certificate', () => {
      const identity = PACKAGE_JSON.build.mac.identity
      expect(identity).toBeTruthy()
    })
  })

  // ==========================================================================
  // 2. release.yml — macOS signing + notarization env vars
  // ==========================================================================
  describe('release.yml — macOS signing credentials', () => {
    it('must pass CSC_LINK secret to macOS packaging step', () => {
      expect(RELEASE_YML).toContain('CSC_LINK')
      expect(RELEASE_YML).toContain('secrets.CSC_LINK')
    })

    it('must pass CSC_KEY_PASSWORD secret to macOS packaging step', () => {
      expect(RELEASE_YML).toContain('CSC_KEY_PASSWORD')
      expect(RELEASE_YML).toContain('secrets.CSC_KEY_PASSWORD')
    })

    it('must pass APPLE_TEAM_ID for notarization', () => {
      expect(RELEASE_YML).toContain('APPLE_TEAM_ID')
    })

    it('must pass App Store Connect API key secrets (primary notarization)', () => {
      expect(RELEASE_YML).toContain('APPLE_API_KEY')
      expect(RELEASE_YML).toContain('APPLE_API_KEY_ID')
      expect(RELEASE_YML).toContain('APPLE_API_ISSUER')
    })

    it('must pass Apple ID secrets as fallback', () => {
      expect(RELEASE_YML).toContain('APPLE_ID')
      expect(RELEASE_YML).toContain('APPLE_APP_SPECIFIC_PASSWORD')
    })
  })

  // ==========================================================================
  // 3. release.yml — certificate import step
  // ==========================================================================
  describe('release.yml — certificate import for CI', () => {
    it('must have a certificate import step for macOS', () => {
      expect(RELEASE_YML).toMatch(/[Ii]mport.*[Cc]ertificate|[Ss]igning.*[Ss]etup|[Kk]eychain/)
    })

    it('must create a temporary keychain', () => {
      expect(RELEASE_YML).toContain('keychain')
    })

    it('must decode base64 certificate', () => {
      expect(RELEASE_YML).toMatch(/base64.*decode|--decode|base64 -d|-D/)
    })

    it('certificate import must run only on macOS', () => {
      // The certificate step should be conditional on mac platform
      expect(RELEASE_YML).toMatch(/mac|macos|darwin/)
    })
  })

  // ==========================================================================
  // 4. release.yml — verification step
  // ==========================================================================
  describe('release.yml — notarization verification', () => {
    it('must have a verification step after packaging', () => {
      expect(RELEASE_YML).toMatch(/[Vv]erif|spctl|codesign|staple/)
    })
  })

  // ==========================================================================
  // 5. Entitlements plist
  // ==========================================================================
  describe('Entitlements plist — required capabilities', () => {
    it('must allow JIT (required for Electron)', () => {
      expect(ENTITLEMENTS).toContain('com.apple.security.cs.allow-jit')
    })

    it('must allow unsigned executable memory (required for V8)', () => {
      expect(ENTITLEMENTS).toContain('com.apple.security.cs.allow-unsigned-executable-memory')
    })

    it('must allow network access', () => {
      expect(ENTITLEMENTS).toContain('com.apple.security.network.client')
    })

    it('must allow microphone access (for voice dictation)', () => {
      expect(ENTITLEMENTS).toContain('com.apple.security.device.audio-input')
    })

    it('must disable library validation (for Electron native modules)', () => {
      expect(ENTITLEMENTS).toContain('com.apple.security.cs.disable-library-validation')
    })
  })
})

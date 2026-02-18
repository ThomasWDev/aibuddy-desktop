/**
 * Version Checker Tests for Desktop App
 * 
 * TDD tests for the update notification system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isNewerVersion,
  isVersionOutdated,
  getUpdateMessage,
  filterReleaseNotes,
  MINIMUM_SUPPORTED_VERSION,
  type VersionInfo
} from '../version-checker'

// Mock fetch
global.fetch = vi.fn()

describe('Desktop Version Checker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('isNewerVersion', () => {
    it('should detect newer major version', () => {
      expect(isNewerVersion('2.0.0', '1.0.0')).toBe(true)
      expect(isNewerVersion('10.0.0', '9.0.0')).toBe(true)
    })

    it('should detect newer minor version', () => {
      expect(isNewerVersion('1.5.0', '1.4.0')).toBe(true)
      expect(isNewerVersion('1.10.0', '1.9.0')).toBe(true)
    })

    it('should detect newer patch version', () => {
      expect(isNewerVersion('1.4.32', '1.4.31')).toBe(true)
      expect(isNewerVersion('1.4.100', '1.4.99')).toBe(true)
    })

    it('should return false for same version', () => {
      expect(isNewerVersion('1.4.31', '1.4.31')).toBe(false)
      expect(isNewerVersion('2.0.0', '2.0.0')).toBe(false)
    })

    it('should return false for older version', () => {
      expect(isNewerVersion('1.4.30', '1.4.31')).toBe(false)
      expect(isNewerVersion('1.3.0', '1.4.0')).toBe(false)
      expect(isNewerVersion('1.0.0', '2.0.0')).toBe(false)
    })

    it('should handle versions with different part counts', () => {
      expect(isNewerVersion('1.4.32', '1.4')).toBe(true)
      expect(isNewerVersion('1.5', '1.4.99')).toBe(true)
      expect(isNewerVersion('2', '1.99.99')).toBe(true)
    })
  })

  describe('isVersionOutdated', () => {
    it('should identify versions below minimum as outdated', () => {
      expect(isVersionOutdated('1.4.29')).toBe(true)
      expect(isVersionOutdated('1.4.0')).toBe(true)
      expect(isVersionOutdated('1.3.99')).toBe(true)
    })

    it('should not flag current or newer versions as outdated', () => {
      expect(isVersionOutdated('1.4.30')).toBe(false)
      expect(isVersionOutdated('1.4.31')).toBe(false)
      expect(isVersionOutdated('1.5.0')).toBe(false)
      expect(isVersionOutdated('2.0.0')).toBe(false)
    })

    it('should use correct minimum supported version', () => {
      expect(MINIMUM_SUPPORTED_VERSION).toBe('1.4.30')
    })
  })

  describe('getUpdateMessage', () => {
    it('should return warning for urgent updates', () => {
      const versionInfo: VersionInfo = {
        currentVersion: '1.4.29',
        latestVersion: '1.4.32',
        updateAvailable: true,
        isUrgent: true,
        releaseNotes: null,
        releaseUrl: null,
        downloadUrls: {}
      }

      const message = getUpdateMessage(versionInfo)
      
      expect(message.type).toBe('warning')
      expect(message.title).toBe('Critical Update Required')
      expect(message.message).toContain('compatibility issues')
    })

    it('should return info for regular updates', () => {
      const versionInfo: VersionInfo = {
        currentVersion: '1.4.31',
        latestVersion: '1.4.32',
        updateAvailable: true,
        isUrgent: false,
        releaseNotes: null,
        releaseUrl: null,
        downloadUrls: {}
      }

      const message = getUpdateMessage(versionInfo)
      
      expect(message.type).toBe('info')
      expect(message.title).toBe('Update Available')
      expect(message.message).toContain('latest features')
    })
  })

  describe('checkForUpdates', () => {
    it('should parse GitHub release correctly', async () => {
      const mockRelease = {
        tag_name: 'v1.4.33',
        body: 'New features:\n- Feature 1\n- Feature 2',
        html_url: 'https://github.com/test/releases/tag/v1.4.33',
        assets: [
          { name: 'AIBuddy-1.4.33-arm64.dmg', browser_download_url: 'https://dl.com/mac-arm64.dmg' },
          { name: 'AIBuddy-Setup-1.4.33.exe', browser_download_url: 'https://dl.com/win.exe' },
        ]
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRelease)
      })

      const { checkForUpdates } = await import('../version-checker')
      const result = await checkForUpdates('1.4.32')

      expect(result.latestVersion).toBe('1.4.33')
      expect(result.updateAvailable).toBe(true)
      expect(result.releaseNotes).toBe('New features:\n- Feature 1\n- Feature 2')
      expect(result.downloadUrls.macArm64).toBe('https://dl.com/mac-arm64.dmg')
      expect(result.downloadUrls.windows).toBe('https://dl.com/win.exe')
    })

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      })

      const { checkForUpdates } = await import('../version-checker')
      const result = await checkForUpdates('1.4.32')

      expect(result.updateAvailable).toBe(false)
      expect(result.latestVersion).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const { checkForUpdates } = await import('../version-checker')
      const result = await checkForUpdates('1.4.32')

      expect(result.updateAvailable).toBe(false)
      expect(result.latestVersion).toBeNull()
    })

    it('should strip v prefix from version tag', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tag_name: 'v1.4.33',
          body: '',
          html_url: '',
          assets: []
        })
      })

      const { checkForUpdates } = await import('../version-checker')
      const result = await checkForUpdates('1.4.32')

      expect(result.latestVersion).toBe('1.4.33')
    })

    it('should not report update when version is same', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tag_name: 'v1.4.32',
          body: '',
          html_url: '',
          assets: []
        })
      })

      const { checkForUpdates } = await import('../version-checker')
      const result = await checkForUpdates('1.4.32')

      expect(result.updateAvailable).toBe(false)
    })
  })

  describe('filterReleaseNotes', () => {
    it('should return null for null input', () => {
      expect(filterReleaseNotes(null)).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(filterReleaseNotes('')).toBeNull()
    })

    it('should keep testable bug fix items', () => {
      const notes = `## Bug Fixes
- KAN-34: Server error while processing request - Fixed
- KAN-35: Unable to stop a request - Fixed`
      const filtered = filterReleaseNotes(notes)
      expect(filtered).toContain('KAN-34')
      expect(filtered).toContain('KAN-35')
    })

    it('should strip code signing section (not testable by users)', () => {
      const notes = `## What's New

### Code-Signed macOS Builds
- macOS DMGs are now signed with Developer ID Application certificate
- Certificate hash: 68A3C88FAA75334D19C025AC00BA4F95A582040D

## Bug Fixes
- Fixed server error`
      const filtered = filterReleaseNotes(notes)
      expect(filtered).not.toContain('Developer ID Application')
      expect(filtered).not.toContain('Certificate hash')
      expect(filtered).toContain('Fixed server error')
    })

    it('should strip build system improvements (not testable)', () => {
      const notes = `### Build System Improvements
- electron-builder upgraded from ^24.9.0 to ^26.7.0
- Added afterPack build script for resource fork cleanup

## Security Fixes
- Workspace boundary enforcement`
      const filtered = filterReleaseNotes(notes)
      expect(filtered).not.toContain('electron-builder')
      expect(filtered).not.toContain('afterPack')
      expect(filtered).toContain('Workspace boundary enforcement')
    })

    it('should strip Sentry noise reduction section', () => {
      const notes = `## Bug Fixes
- Fixed login issue

## Sentry Noise Reduction
- Added beforeSend filters
- Excluded third-party extensions`
      const filtered = filterReleaseNotes(notes)
      expect(filtered).toContain('Fixed login issue')
      expect(filtered).not.toContain('beforeSend filters')
    })

    it('should strip deployment checklist items', () => {
      const notes = `## Bug Fixes
- Fixed crash

## Deployment Checklist (completed)
- [x] Version bumped in package.json
- [x] Smoke tests pass
- [x] Git tag created`
      const filtered = filterReleaseNotes(notes)
      expect(filtered).toContain('Fixed crash')
      expect(filtered).not.toContain('Version bumped')
      expect(filtered).not.toContain('Git tag')
    })

    it('should keep security fixes (testable)', () => {
      const notes = `## Security Fixes
### KAN-48: Workspace Boundary Enforcement
- Prevents file access outside the designated working directory
- New enforceWorkspaceBoundary() function`
      const filtered = filterReleaseNotes(notes)
      expect(filtered).toContain('KAN-48')
      expect(filtered).toContain('Workspace Boundary')
    })

    it('should not have triple or more blank lines', () => {
      const notes = `## Bug Fixes
- Fix 1



## Test Coverage
- 2095 tests`
      const filtered = filterReleaseNotes(notes)
      expect(filtered).not.toMatch(/\n{3,}/)
    })
  })

  describe('Download URL Extraction', () => {
    it('should extract all platform download URLs', async () => {
      const mockRelease = {
        tag_name: 'v1.4.33',
        body: '',
        html_url: '',
        assets: [
          { name: 'AIBuddy-1.4.33-arm64.dmg', browser_download_url: 'https://dl.com/arm64.dmg' },
          { name: 'AIBuddy-1.4.33.dmg', browser_download_url: 'https://dl.com/intel.dmg' },
          { name: 'AIBuddy-Setup-1.4.33.exe', browser_download_url: 'https://dl.com/win.exe' },
          { name: 'AIBuddy-1.4.33.AppImage', browser_download_url: 'https://dl.com/linux.AppImage' },
          { name: 'aibuddy-desktop_1.4.33_amd64.deb', browser_download_url: 'https://dl.com/linux.deb' },
        ]
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRelease)
      })

      const { checkForUpdates } = await import('../version-checker')
      const result = await checkForUpdates('1.4.32')

      expect(result.downloadUrls.macArm64).toBe('https://dl.com/arm64.dmg')
      expect(result.downloadUrls.mac).toBe('https://dl.com/intel.dmg')
      expect(result.downloadUrls.windows).toBe('https://dl.com/win.exe')
      // Linux should have a download URL (AppImage or deb)
      expect(result.downloadUrls.linux).toMatch(/dl\.com\/linux\.(AppImage|deb)/)
    })
  })
})

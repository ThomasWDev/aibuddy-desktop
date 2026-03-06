import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
const buildConfig = pkg.build

describe('Windows Build Configuration', () => {
  describe('package.json build.win', () => {
    it('win section must exist', () => {
      expect(buildConfig.win).toBeDefined()
    })

    it('win.icon must point to build/icon.ico', () => {
      expect(buildConfig.win.icon).toBe('build/icon.ico')
    })

    it('build/icon.ico must exist and be > 10KB (multi-resolution)', () => {
      const icoPath = path.join(ROOT, 'build/icon.ico')
      expect(fs.existsSync(icoPath)).toBe(true)
      const stats = fs.statSync(icoPath)
      expect(stats.size).toBeGreaterThan(10_000)
    })

    it('win.target must include nsis', () => {
      const targets = buildConfig.win.target
      const hasNsis = targets.some(
        (t: any) => (typeof t === 'string' ? t : t.target) === 'nsis'
      )
      expect(hasNsis).toBe(true)
    })

    it('nsis target must build x64', () => {
      const nsisTarget = buildConfig.win.target.find(
        (t: any) => (typeof t === 'string' ? t : t.target) === 'nsis'
      )
      expect(nsisTarget).toBeDefined()
      if (typeof nsisTarget === 'object') {
        expect(nsisTarget.arch).toContain('x64')
      }
    })

    it('win config must only use valid electron-builder properties', () => {
      const validWinProps = new Set([
        'appId', 'artifactName', 'asar', 'asarUnpack', 'azureSignOptions',
        'compression', 'cscKeyPassword', 'cscLink', 'defaultArch',
        'detectUpdateChannel', 'disableDefaultIgnoredFiles', 'electronLanguages',
        'electronUpdaterCompatibility', 'executableName', 'extraFiles',
        'extraResources', 'fileAssociations', 'files', 'forceCodeSigning',
        'generateUpdatesFilesForAllChannels', 'icon', 'legalTrademarks',
        'protocols', 'publish', 'releaseInfo', 'requestedExecutionLevel',
        'signAndEditExecutable', 'signExts', 'signtoolOptions', 'target',
        'verifyUpdateCodeSignature',
      ])
      for (const key of Object.keys(buildConfig.win)) {
        expect(validWinProps.has(key)).toBe(true)
      }
    })
  })

  describe('package.json build.nsis', () => {
    it('nsis section must exist', () => {
      expect(buildConfig.nsis).toBeDefined()
    })

    it('nsis.oneClick must be false (custom install path)', () => {
      expect(buildConfig.nsis.oneClick).toBe(false)
    })

    it('nsis must create desktop and start menu shortcuts', () => {
      expect(buildConfig.nsis.createDesktopShortcut).toBe(true)
      expect(buildConfig.nsis.createStartMenuShortcut).toBe(true)
    })
  })

  describe('package:win script', () => {
    it('package:win script must exist', () => {
      expect(pkg.scripts['package:win']).toBeDefined()
    })

    it('package:win script must use electron-builder --win', () => {
      expect(pkg.scripts['package:win']).toContain('electron-builder --win')
    })
  })

  describe('GitHub Actions workflow', () => {
    it('release-on-master.yml must have a Windows build job', () => {
      const workflowPath = path.join(ROOT, '../.github/workflows/release-on-master.yml')
      const content = fs.readFileSync(workflowPath, 'utf-8')
      expect(content).toContain('build-desktop-windows')
      expect(content).toContain('windows-latest')
    })

    it('Windows job must NOT use continue-on-error on package step', () => {
      const workflowPath = path.join(ROOT, '../.github/workflows/release-on-master.yml')
      const content = fs.readFileSync(workflowPath, 'utf-8')
      const winSection = content.split('build-desktop-windows:')[1]?.split(/\n  \w/)[0] || ''
      const packageLine = winSection.split('\n').findIndex(l => l.includes('Package Windows'))
      if (packageLine >= 0) {
        const nextLines = winSection.split('\n').slice(packageLine, packageLine + 5).join('\n')
        expect(nextLines).not.toContain('continue-on-error: true')
      }
    })

    it('Windows artifact paths must match NSIS output (*.exe)', () => {
      const workflowPath = path.join(ROOT, '../.github/workflows/release-on-master.yml')
      const content = fs.readFileSync(workflowPath, 'utf-8')
      expect(content).toContain('release/*.exe')
      expect(content).not.toContain('release/*.msi')
    })
  })
})

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Deployment & MAS Build Smoke Tests
 *
 * ROOT CAUSE: v1.5.58 MAS upload failed because LSMinimumSystemVersion
 * was 10.15 (from Electron default) instead of 12.0. Apple rejects
 * arm64-only builds with deployment target < 12.0.
 *
 * Also: Denver download page showed stale v1.5.59 because Blade template
 * edits were not committed/pushed, and ALB URL was stale in old builds.
 *
 * PREVENTION: These tests verify build configs before packaging.
 */

const ROOT = path.resolve(__dirname, '../..')
const pkgPath = path.join(ROOT, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const VERSION = pkg.version

describe('Build Configuration', () => {
  it('electron-builder config should exist in package.json', () => {
    expect(pkg.build).toBeDefined()
    expect(pkg.build.appId).toBe('com.aibuddy.desktop')
  })

  it('MAS config should exist', () => {
    expect(pkg.build.mas).toBeDefined()
  })

  it('MAS minimumSystemVersion should be >= 12.0', () => {
    const minVer = parseFloat(pkg.build.mas.minimumSystemVersion || '0')
    expect(minVer).toBeGreaterThanOrEqual(12.0)
  })

  it('MAS extendInfo should set LSMinimumSystemVersion >= 12.0', () => {
    expect(pkg.build.mas.extendInfo).toBeDefined()
    const lsMin = parseFloat(pkg.build.mas.extendInfo.LSMinimumSystemVersion || '0')
    expect(lsMin).toBeGreaterThanOrEqual(12.0)
  })

  it('MAS target should be arm64', () => {
    const targets = pkg.build.mas.target
    expect(targets).toBeDefined()
    const masTarget = targets.find((t: any) => t.target === 'mas')
    expect(masTarget).toBeDefined()
    expect(masTarget.arch).toContain('arm64')
  })

  it('MAS entitlements files should exist', () => {
    const entPath = path.join(ROOT, 'build/entitlements.mas.plist')
    const inheritPath = path.join(ROOT, 'build/entitlements.mas.inherit.plist')
    expect(fs.existsSync(entPath)).toBe(true)
    expect(fs.existsSync(inheritPath)).toBe(true)
  })

  it('provisioning profile should exist', () => {
    const profPath = path.join(ROOT, 'build/embedded.provisionprofile')
    expect(fs.existsSync(profPath)).toBe(true)
  })

  it('build icons should exist in all required sizes', () => {
    const iconsDir = path.join(ROOT, 'build/icons')
    const requiredSizes = [16, 32, 64, 128, 256, 512]
    for (const size of requiredSizes) {
      expect(fs.existsSync(path.join(iconsDir, `${size}x${size}.png`))).toBe(true)
    }
    expect(fs.existsSync(path.join(iconsDir, 'icon.png'))).toBe(true)
  })

  it('macOS iconset should have all required variants', () => {
    const iconsetDir = path.join(ROOT, 'build/icon.iconset')
    const required = [
      'icon_16x16.png', 'icon_16x16@2x.png',
      'icon_32x32.png', 'icon_32x32@2x.png',
      'icon_128x128.png', 'icon_128x128@2x.png',
      'icon_256x256.png', 'icon_256x256@2x.png',
      'icon_512x512.png', 'icon_512x512@2x.png',
    ]
    for (const file of required) {
      expect(fs.existsSync(path.join(iconsetDir, file))).toBe(true)
    }
  })

  it('macOS .icns should exist', () => {
    const icnsPath = path.join(ROOT, 'build/icon.icns')
    expect(fs.existsSync(icnsPath)).toBe(true)
    const stat = fs.statSync(icnsPath)
    expect(stat.size).toBeGreaterThan(10000)
  })
})

describe('API Configuration', () => {
  it('ALB URL should use the current DNS name (not stale)', () => {
    const urlsPath = path.join(ROOT, 'src/constants/urls.ts')
    const content = fs.readFileSync(urlsPath, 'utf-8')
    expect(content).toContain('aibuddy-api-alb-90164252')
    expect(content).not.toContain('aibuddy-api-alb-981452862')
  })

  it('API inference URL should use ALB (not API Gateway)', () => {
    const urlsPath = path.join(ROOT, 'src/constants/urls.ts')
    const content = fs.readFileSync(urlsPath, 'utf-8')
    expect(content).toContain('AIBUDDY_API_INFERENCE_URL = `${AIBUDDY_ALB_URL}/')
  })

  it('API Gateway URL should be kept as backup', () => {
    const urlsPath = path.join(ROOT, 'src/constants/urls.ts')
    const content = fs.readFileSync(urlsPath, 'utf-8')
    expect(content).toContain('AIBUDDY_API_GATEWAY_URL')
    expect(content).toContain('execute-api.us-east-2.amazonaws.com')
  })
})

describe('Deploy Script', () => {
  it('deploy-builds.sh should exist', () => {
    const scriptPath = path.join(ROOT, 'scripts/deploy-builds.sh')
    expect(fs.existsSync(scriptPath)).toBe(true)
  })

  it('upload-testflight.sh should exist', () => {
    const scriptPath = path.join(ROOT, 'scripts/upload-testflight.sh')
    expect(fs.existsSync(scriptPath)).toBe(true)
  })

  it('deploy script should reference correct Denver server', () => {
    const scriptPath = path.join(ROOT, 'scripts/deploy-builds.sh')
    const content = fs.readFileSync(scriptPath, 'utf-8')
    expect(content).toContain('ubuntu@3.132.25.123')
    expect(content).toContain('denver_veterans.pem')
  })

  it('deploy script should reference correct aibuddy.life server', () => {
    const scriptPath = path.join(ROOT, 'scripts/deploy-builds.sh')
    const content = fs.readFileSync(scriptPath, 'utf-8')
    expect(content).toContain('aibuddy.life')
    expect(content).toContain('18765')
  })
})

describe('Version Deployment Consistency', () => {
  it('extension and desktop versions should match', () => {
    const extPkgPath = path.resolve(ROOT, '../extension/package.json')
    if (fs.existsSync(extPkgPath)) {
      const extPkg = JSON.parse(fs.readFileSync(extPkgPath, 'utf-8'))
      expect(extPkg.version).toBe(VERSION)
    }
  })

  it('User-Agent fallback should match package.json version', () => {
    const appTsxPath = path.join(ROOT, 'renderer/src/App.tsx')
    const content = fs.readFileSync(appTsxPath, 'utf-8')
    expect(content).toContain(`'${VERSION}'`)
  })
})

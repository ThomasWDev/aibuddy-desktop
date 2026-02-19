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

  it('User-Agent should NOT have hardcoded version fallbacks', () => {
    const appTsxPath = path.join(ROOT, 'renderer/src/App.tsx')
    const content = fs.readFileSync(appTsxPath, 'utf-8')
    const userAgentMatch = content.match(/User-Agent.*\|\|\s*'([^']+)'/)
    if (userAgentMatch) {
      expect(userAgentMatch[1]).not.toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  it('appVersion fallbacks should not contain hardcoded versions', () => {
    const appTsxPath = path.join(ROOT, 'renderer/src/App.tsx')
    const content = fs.readFileSync(appTsxPath, 'utf-8')
    const versionFallbacks = content.match(/appVersion\s*\|\|\s*'(\d+\.\d+\.\d+)'/g)
    expect(versionFallbacks).toBeNull()
  })
})

describe('CI/CD Workflow', () => {
  const workflowDir = path.resolve(ROOT, '../.github/workflows')

  it('release-on-master.yml should exist', () => {
    const wfPath = path.join(workflowDir, 'release-on-master.yml')
    expect(fs.existsSync(wfPath)).toBe(true)
  })

  it('release workflow should trigger on master/main push', () => {
    const wfPath = path.join(workflowDir, 'release-on-master.yml')
    if (fs.existsSync(wfPath)) {
      const content = fs.readFileSync(wfPath, 'utf-8')
      expect(content).toContain('branches: [master, main]')
    }
  })

  it('release workflow should have all deployment phases', () => {
    const wfPath = path.join(workflowDir, 'release-on-master.yml')
    if (fs.existsSync(wfPath)) {
      const content = fs.readFileSync(wfPath, 'utf-8')
      expect(content).toContain('publish-extension')
      expect(content).toContain('deploy-servers')
      expect(content).toContain('create-github-release')
      expect(content).toContain('upload-app-store')
    }
  })

  it('release workflow should reference required secrets', () => {
    const wfPath = path.join(workflowDir, 'release-on-master.yml')
    if (fs.existsSync(wfPath)) {
      const content = fs.readFileSync(wfPath, 'utf-8')
      expect(content).toContain('VSCE_PAT')
      expect(content).toContain('MAC_CERTS_BASE64')
      expect(content).toContain('DENVER_SSH_KEY')
      expect(content).toContain('AIBUDDY_SSH_KEY')
      expect(content).toContain('APP_STORE_AUTH_KEY')
    }
  })

  it('ci.yml should exist for PR checks', () => {
    const ciPath = path.join(workflowDir, 'ci.yml')
    expect(fs.existsSync(ciPath)).toBe(true)
  })
})

describe('Server Configuration', () => {
  it('Denver server path should be consistent across deploy script and workflow', () => {
    const scriptPath = path.join(ROOT, 'scripts/deploy-builds.sh')
    const wfPath = path.resolve(ROOT, '../.github/workflows/release-on-master.yml')
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8')
    expect(scriptContent).toContain('/var/www/deploy/denvermobileappdeveloper/current/public/downloads/aibuddy-desktop')
    if (fs.existsSync(wfPath)) {
      const wfContent = fs.readFileSync(wfPath, 'utf-8')
      expect(wfContent).toContain('/var/www/deploy/denvermobileappdeveloper/current/public/downloads/aibuddy-desktop')
    }
  })

  it('aibuddy.life path should be consistent', () => {
    const scriptPath = path.join(ROOT, 'scripts/deploy-builds.sh')
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8')
    expect(scriptContent).toContain('aibuddy.life/public_html/downloads')
  })

  it('App Store key should be referenced via secrets (not hardcoded)', () => {
    const wfPath = path.resolve(ROOT, '../.github/workflows/release-on-master.yml')
    if (fs.existsSync(wfPath)) {
      const wfContent = fs.readFileSync(wfPath, 'utf-8')
      expect(wfContent).toContain('secrets.APP_STORE_KEY_ID')
      expect(wfContent).toContain('secrets.APP_STORE_ISSUER_ID')
      expect(wfContent).toContain('secrets.APP_STORE_AUTH_KEY')
    }
  })
})

describe('Release Documentation', () => {
  it('RELEASE_PROCESS.md should document CI/CD workflow', () => {
    const relPath = path.resolve(ROOT, '../docs/RELEASE_PROCESS.md')
    if (fs.existsSync(relPath)) {
      const content = fs.readFileSync(relPath, 'utf-8')
      expect(content).toContain('release-on-master.yml')
      expect(content).toContain('Required GitHub Secrets')
    }
  })

  it('KNOWN_ISSUES.md should reference current version', () => {
    const kiPath = path.resolve(ROOT, '../KNOWN_ISSUES.md')
    if (fs.existsSync(kiPath)) {
      const content = fs.readFileSync(kiPath, 'utf-8')
      expect(content).toContain(VERSION)
    }
  })

  it('APPLE_APPSTORE_CONNECT_API.md should have TestFlight status', () => {
    const asPath = path.resolve(ROOT, '../docs/APPLE_APPSTORE_CONNECT_API.md')
    if (fs.existsSync(asPath)) {
      const content = fs.readFileSync(asPath, 'utf-8')
      expect(content).toContain('TestFlight Status')
      expect(content).toContain('WL4HMQYALA')
    }
  })
})

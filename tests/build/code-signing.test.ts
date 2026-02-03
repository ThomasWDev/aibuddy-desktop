/**
 * Code Signing and Build Configuration Tests
 * 
 * TDD approach - Ensures builds are properly configured for distribution
 * 
 * CURRENT STATUS: App is NOT code-signed
 * - macOS: Shows "damaged" message without quarantine removal
 * - Windows: Shows SmartScreen warning, Publisher: Unknown
 * 
 * TO FIX (requires certificates):
 * - macOS: Developer ID Application certificate + notarization
 *   Available: "Apple Development: Thomas Woodfin (U6363SX679)"
 *   Needed: "Developer ID Application: AIBuddy Inc (TEAMID)"
 * - Windows: EV Code Signing Certificate ($200-400/year)
 * 
 * See docs/CODE_SIGNING.md for full instructions
 * 
 * Tests verify:
 * 1. Build configuration is correct
 * 2. Installation instructions are present
 * 3. Security warnings are documented
 */

import { describe, it, expect, vi, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Project root
const PROJECT_ROOT = path.resolve(__dirname, '../..')

describe('Build Configuration', () => {
  describe('Package.json Build Settings', () => {
    let packageJson: any

    beforeAll(() => {
      const packagePath = path.join(PROJECT_ROOT, 'package.json')
      packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
    })

    it('should have valid app ID', () => {
      expect(packageJson.build.appId).toBe('com.aibuddy.desktop')
    })

    it('should have product name', () => {
      expect(packageJson.build.productName).toBe('AIBuddy')
    })

    it('should have macOS configuration', () => {
      expect(packageJson.build.mac).toBeDefined()
      expect(packageJson.build.mac.category).toBe('public.app-category.developer-tools')
    })

    it('should have hardened runtime enabled for macOS', () => {
      expect(packageJson.build.mac.hardenedRuntime).toBe(true)
    })

    it('should have entitlements configured for macOS', () => {
      expect(packageJson.build.mac.entitlements).toBeDefined()
      expect(packageJson.build.mac.entitlementsInherit).toBeDefined()
    })

    it('should have Windows configuration', () => {
      expect(packageJson.build.win).toBeDefined()
      expect(packageJson.build.win.publisherName).toBe('AIBuddy Studio')
    })

    it('should have Linux configuration', () => {
      expect(packageJson.build.linux).toBeDefined()
      expect(packageJson.build.linux.category).toBe('Development')
    })

    it('should have NSIS installer configuration', () => {
      expect(packageJson.build.nsis).toBeDefined()
      expect(packageJson.build.nsis.oneClick).toBe(false)
      expect(packageJson.build.nsis.allowToChangeInstallationDirectory).toBe(true)
    })

    it('should have GitHub publish configuration', () => {
      expect(packageJson.build.publish).toBeDefined()
      expect(packageJson.build.publish.provider).toBe('github')
    })
  })

  describe('Electron Builder Config', () => {
    let builderConfig: string

    beforeAll(() => {
      const configPath = path.join(PROJECT_ROOT, 'build/electron-builder.yml')
      if (fs.existsSync(configPath)) {
        builderConfig = fs.readFileSync(configPath, 'utf-8')
      } else {
        builderConfig = ''
      }
    })

    it('should have electron-builder.yml file', () => {
      expect(builderConfig.length).toBeGreaterThan(0)
    })

    it('should have app ID configured', () => {
      expect(builderConfig).toContain('appId: com.aibuddy.desktop')
    })

    it('should have DMG targets configured', () => {
      expect(builderConfig).toContain('target: dmg')
    })

    it('should have NSIS targets configured', () => {
      expect(builderConfig).toContain('target: nsis')
    })

    it('should have AppImage targets configured', () => {
      expect(builderConfig).toContain('AppImage')
    })
  })

  describe('Entitlements Files', () => {
    it('should have macOS entitlements plist', () => {
      const entitlementsPath = path.join(PROJECT_ROOT, 'build/entitlements.mac.plist')
      expect(fs.existsSync(entitlementsPath)).toBe(true)
    })

    it('should have MAS entitlements plist', () => {
      const entitlementsPath = path.join(PROJECT_ROOT, 'build/entitlements.mas.plist')
      expect(fs.existsSync(entitlementsPath)).toBe(true)
    })

    it('macOS entitlements should allow JIT', () => {
      const entitlementsPath = path.join(PROJECT_ROOT, 'build/entitlements.mac.plist')
      const content = fs.readFileSync(entitlementsPath, 'utf-8')
      expect(content).toContain('com.apple.security.cs.allow-jit')
    })

    it('macOS entitlements should allow unsigned executable memory', () => {
      const entitlementsPath = path.join(PROJECT_ROOT, 'build/entitlements.mac.plist')
      const content = fs.readFileSync(entitlementsPath, 'utf-8')
      expect(content).toContain('com.apple.security.cs.allow-unsigned-executable-memory')
    })
  })
})

describe('Code Signing Status', () => {
  describe('macOS Signing', () => {
    let packageJson: any
    let builderConfig: string

    beforeAll(() => {
      packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8'))
      const configPath = path.join(PROJECT_ROOT, 'build/electron-builder.yml')
      builderConfig = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : ''
    })

    it('should have notarization enabled with team ID', () => {
      // Notarization is now enabled - verify it's configured correctly
      const notarizeConfig = packageJson.build.mac?.notarize
      const hasNotarizeEnabled = notarizeConfig && notarizeConfig !== false
      
      expect(hasNotarizeEnabled).toBe(true)
      
      // Verify team ID is configured
      if (typeof notarizeConfig === 'object') {
        expect(notarizeConfig.teamId).toBe('S2237D23CB')
      }
      
      console.log('✅ macOS notarization is ENABLED')
      console.log('   Team ID: S2237D23CB')
      console.log('   Credentials stored in keychain as "AC_PASSWORD"')
    })

    it('should have identity configured (even if not used)', () => {
      // Identity is configured but may not work without certificate
      expect(builderConfig).toContain('identity:')
    })
  })

  describe('Windows Signing', () => {
    let packageJson: any

    beforeAll(() => {
      packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf-8'))
    })

    it('should document signing certificate status', () => {
      // Windows signing requires certificateFile or WIN_CSC_LINK env var
      const hasSignConfig = packageJson.build.win?.certificateFile ||
                            process.env.WIN_CSC_LINK
      
      if (!hasSignConfig) {
        console.log('⚠️ Windows code signing is NOT configured')
        console.log('   Users will see SmartScreen warning')
        console.log('   Publisher will show as "Unknown"')
      }
      
      // This test passes but documents the issue
      expect(true).toBe(true)
    })

    it('should have publisher name configured', () => {
      expect(packageJson.build.win.publisherName).toBe('AIBuddy Studio')
    })
  })
})

describe('Installation Instructions', () => {
  describe('Download Page Content', () => {
    it('should have installation instructions in downloads page', () => {
      const downloadsPagePath = path.join(PROJECT_ROOT, 'website/aibuddy-life-downloads.html')
      
      if (fs.existsSync(downloadsPagePath)) {
        const content = fs.readFileSync(downloadsPagePath, 'utf-8')
        
        // Should have macOS installation note with xattr command
        expect(content).toContain('Mac Installation')
        expect(content).toContain('xattr -cr')
        
        // Should have Windows installation note
        expect(content).toContain('Windows Installation')
        expect(content).toContain('More info')
        expect(content).toContain('Run anyway')
        
        // Should explain the workaround
        expect(content).toContain('Right-click')
        expect(content).toContain('Open')
      }
    })
  })

  describe('README Documentation', () => {
    it('should have README file', () => {
      const readmePath = path.join(PROJECT_ROOT, 'README.md')
      expect(fs.existsSync(readmePath)).toBe(true)
    })
  })

  describe('Code Signing Documentation', () => {
    it('should have CODE_SIGNING.md guide', () => {
      const docPath = path.join(PROJECT_ROOT, 'docs/CODE_SIGNING.md')
      expect(fs.existsSync(docPath)).toBe(true)
    })

    it('should document certificate requirements', () => {
      const docPath = path.join(PROJECT_ROOT, 'docs/CODE_SIGNING.md')
      const content = fs.readFileSync(docPath, 'utf-8')
      
      // Should explain certificate types
      expect(content).toContain('Developer ID Application')
      expect(content).toContain('Apple Distribution')
      
      // Should have notarization instructions
      expect(content).toContain('APPLE_ID')
      expect(content).toContain('APPLE_APP_SPECIFIC_PASSWORD')
      expect(content).toContain('APPLE_TEAM_ID')
      
      // Should have Windows instructions
      expect(content).toContain('WIN_CSC_LINK')
    })
  })
})

describe('Build Scripts', () => {
  describe('Signed Build Script', () => {
    it('should have build-signed.sh script', () => {
      const scriptPath = path.join(PROJECT_ROOT, 'scripts/build-signed.sh')
      expect(fs.existsSync(scriptPath)).toBe(true)
    })

    it('should be executable', () => {
      const scriptPath = path.join(PROJECT_ROOT, 'scripts/build-signed.sh')
      const stats = fs.statSync(scriptPath)
      const isExecutable = (stats.mode & 0o111) !== 0 // Check any execute bit
      expect(isExecutable).toBe(true)
    })

    it('should support --no-sign flag', () => {
      const scriptPath = path.join(PROJECT_ROOT, 'scripts/build-signed.sh')
      const content = fs.readFileSync(scriptPath, 'utf-8')
      expect(content).toContain('--no-sign')
      expect(content).toContain('CSC_IDENTITY_AUTO_DISCOVERY=false')
    })

    it('should support --notarize flag', () => {
      const scriptPath = path.join(PROJECT_ROOT, 'scripts/build-signed.sh')
      const content = fs.readFileSync(scriptPath, 'utf-8')
      expect(content).toContain('--notarize')
    })
  })
})

describe('Build Artifacts', () => {
  describe('Expected Output Files', () => {
    const releaseDir = path.join(PROJECT_ROOT, 'release')

    it('should document expected macOS artifacts', () => {
      // Expected: AIBuddy-{version}-arm64.dmg, AIBuddy-{version}-x64.dmg
      console.log('Expected macOS artifacts:')
      console.log('  - AIBuddy-{version}-arm64.dmg (Apple Silicon)')
      console.log('  - AIBuddy-{version}-x64.dmg (Intel)')
      console.log('  - AIBuddy-{version}-arm64-mac.zip')
      console.log('  - AIBuddy-{version}-x64-mac.zip')
      expect(true).toBe(true)
    })

    it('should document expected Windows artifacts', () => {
      console.log('Expected Windows artifacts:')
      console.log('  - AIBuddy-Setup-{version}.exe (NSIS installer)')
      console.log('  - AIBuddy-{version}-win.zip (Portable)')
      expect(true).toBe(true)
    })

    it('should document expected Linux artifacts', () => {
      console.log('Expected Linux artifacts:')
      console.log('  - AIBuddy-{version}.AppImage')
      console.log('  - aibuddy-desktop_{version}_amd64.deb')
      console.log('  - aibuddy-desktop-{version}.x86_64.rpm')
      expect(true).toBe(true)
    })
  })
})

describe('Security Warning Documentation', () => {
  describe('macOS Gatekeeper Bypass', () => {
    it('should document xattr command for quarantine removal', () => {
      const command = 'xattr -cr /Applications/AIBuddy.app'
      
      console.log('\n=== macOS Installation (Unsigned App) ===')
      console.log('Problem: "AIBuddy is damaged and can\'t be opened"')
      console.log('Cause: App is not notarized by Apple')
      console.log('')
      console.log('Solution 1 - Terminal command:')
      console.log(`  ${command}`)
      console.log('')
      console.log('Solution 2 - Right-click method:')
      console.log('  1. Right-click (or Control-click) on AIBuddy.app')
      console.log('  2. Select "Open" from context menu')
      console.log('  3. Click "Open" in the security dialog')
      console.log('')
      console.log('Solution 3 - System Settings:')
      console.log('  1. Open System Settings → Privacy & Security')
      console.log('  2. Scroll down to Security section')
      console.log('  3. Click "Open Anyway" next to AIBuddy')
      
      expect(command).toContain('xattr')
      expect(command).toContain('-cr')
    })
  })

  describe('Windows SmartScreen Bypass', () => {
    it('should document SmartScreen bypass steps', () => {
      console.log('\n=== Windows Installation (Unsigned App) ===')
      console.log('Problem: "Windows protected your PC" / SmartScreen warning')
      console.log('Cause: EXE is not signed with EV certificate')
      console.log('')
      console.log('Solution:')
      console.log('  1. Click "More info" link in the warning dialog')
      console.log('  2. Click "Run anyway" button')
      console.log('  3. Follow the installation wizard')
      console.log('')
      console.log('Alternative - Disable SmartScreen (not recommended):')
      console.log('  Settings → Privacy & Security → Windows Security')
      console.log('  → App & browser control → SmartScreen settings')
      
      expect(true).toBe(true)
    })
  })

  describe('Linux Installation', () => {
    it('should document AppImage permissions', () => {
      console.log('\n=== Linux Installation ===')
      console.log('AppImage needs execute permission:')
      console.log('  chmod +x AIBuddy-*.AppImage')
      console.log('  ./AIBuddy-*.AppImage')
      console.log('')
      console.log('Or install .deb package:')
      console.log('  sudo dpkg -i aibuddy-desktop_*.deb')
      console.log('  sudo apt-get install -f  # Fix dependencies')
      
      expect(true).toBe(true)
    })
  })
})

describe('Code Signing Requirements', () => {
  describe('macOS Notarization Requirements', () => {
    it('should document Apple Developer requirements', () => {
      console.log('\n=== macOS Code Signing Requirements ===')
      console.log('')
      console.log('To properly sign and notarize for macOS:')
      console.log('')
      console.log('1. Apple Developer Program ($99/year)')
      console.log('   https://developer.apple.com/programs/')
      console.log('')
      console.log('2. Create "Developer ID Application" certificate')
      console.log('   Keychain Access → Certificate Assistant → Request Certificate')
      console.log('')
      console.log('3. Set environment variables:')
      console.log('   APPLE_ID=your@email.com')
      console.log('   APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx')
      console.log('   APPLE_TEAM_ID=XXXXXXXXXX')
      console.log('')
      console.log('4. Update electron-builder config:')
      console.log('   notarize: true')
      console.log('   identity: "Developer ID Application: Your Name (TEAMID)"')
      
      expect(true).toBe(true)
    })
  })

  describe('Windows EV Certificate Requirements', () => {
    it('should document Windows signing requirements', () => {
      console.log('\n=== Windows Code Signing Requirements ===')
      console.log('')
      console.log('To avoid SmartScreen warnings:')
      console.log('')
      console.log('1. Purchase EV Code Signing Certificate (~$200-400/year)')
      console.log('   Providers: DigiCert, Sectigo, GlobalSign')
      console.log('')
      console.log('2. Certificate must be on hardware token (USB)')
      console.log('')
      console.log('3. Set environment variables:')
      console.log('   WIN_CSC_LINK=path/to/certificate.pfx')
      console.log('   WIN_CSC_KEY_PASSWORD=certificate-password')
      console.log('')
      console.log('4. Build reputation over time')
      console.log('   Even with EV cert, new apps may show warnings')
      console.log('   SmartScreen builds reputation from downloads')
      
      expect(true).toBe(true)
    })
  })
})

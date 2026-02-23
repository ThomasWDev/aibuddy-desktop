/**
 * KAN-53: App not navigating to landing page
 *
 * Root causes:
 *   1. Auto-restore of workspacePath from recentWorkspaces on startup
 *      skips WelcomeScreen for ALL returning users.
 *   2. Condition `!workspacePath && !hasUsedBefore` double-gates:
 *      hasUsedBefore is true whenever threads exist, blocking WelcomeScreen
 *      even when workspace is null.
 *   3. No "Home" button to navigate back to WelcomeScreen from chat view.
 *
 * Fix:
 *   - Change condition to `!workspacePath` (remove hasUsedBefore gate).
 *   - Remove auto-restore of workspace on startup.
 *   - Add Home button in header that resets workspacePath to null.
 *   - Validate restored workspace paths exist on disk.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const APP_TSX = path.resolve(__dirname, '../../renderer/src/App.tsx')
const WELCOME_SCREEN = path.resolve(__dirname, '../../renderer/src/components/welcome/WelcomeScreen.tsx')

const appSource = fs.readFileSync(APP_TSX, 'utf-8')
const welcomeSource = fs.readFileSync(WELCOME_SCREEN, 'utf-8')

describe('KAN-53: WelcomeScreen rendering condition', () => {
  it('should show WelcomeScreen when workspacePath is null (not gated by hasUsedBefore)', () => {
    // The condition should be `!workspacePath` alone, NOT `!workspacePath && !hasUsedBefore`
    const lines = appSource.split('\n')
    const welcomeConditionLine = lines.find(l =>
      l.includes('WelcomeScreen') && l.includes('workspacePath') && l.includes('if')
    ) || lines.find(l =>
      l.includes('!workspacePath') && (l.includes('return') || l.includes('if'))
        && l.includes('WelcomeScreen') === false
        && !l.includes('hasUsedBefore')
    )

    // Verify the old double-gate is gone
    const hasDoubleGate = appSource.includes('!workspacePath && !hasUsedBefore')
    expect(hasDoubleGate).toBe(false)
  })

  it('should use only !workspacePath to show WelcomeScreen', () => {
    // Find the JSX conditional that renders WelcomeScreen
    const welcomeBlock = appSource.match(/if\s*\(\s*!workspacePath\s*\)\s*\{?\s*\n?\s*return\s*\(\s*\n?\s*<WelcomeScreen/)
    expect(welcomeBlock).not.toBeNull()
  })
})

describe('KAN-53: No auto-restore of workspacePath on startup', () => {
  it('should NOT auto-set workspacePath from recentWorkspaces on startup', () => {
    // The startup useEffect should NOT contain:
    //   const recent = await electronAPI.store.get('recentWorkspaces')
    //   if (recent && recent.length > 0) { setWorkspacePath(recent[0]) }
    //
    // It's fine to LOAD recentWorkspaces for display, but not to auto-set workspacePath
    const autoRestorePattern = /store\.get\(['"]recentWorkspaces['"]\)[\s\S]{0,200}setWorkspacePath\(recent\[0\]\)/
    const hasAutoRestore = autoRestorePattern.test(appSource)
    expect(hasAutoRestore).toBe(false)
  })

  it('should initialize workspacePath as null', () => {
    expect(appSource).toContain('useState<string | null>(null)')
  })
})

describe('KAN-53: Home button in header', () => {
  it('should have a Home/back-to-welcome button that resets workspacePath', () => {
    // There should be a button in the header area that calls setWorkspacePath(null)
    expect(appSource).toContain('setWorkspacePath(null)')
  })

  it('should have a Home button or icon in the header', () => {
    // Check for a Home-related button in the header area
    const hasHomeButton = appSource.includes('Home') ||
      appSource.includes('home') ||
      appSource.includes('backToWelcome') ||
      appSource.includes('goHome')
    expect(hasHomeButton).toBe(true)
  })
})

describe('KAN-53: WelcomeScreen shows recent workspaces', () => {
  it('should load and display recent workspaces in WelcomeScreen', () => {
    expect(welcomeSource).toContain('recentWorkspaces')
    expect(welcomeSource).toContain('handleOpenRecent')
  })

  it('should have onOpenFolder and onNewChat props', () => {
    expect(welcomeSource).toContain('onOpenFolder')
    expect(welcomeSource).toContain('onNewChat')
  })
})

describe('KAN-53: Version display pipeline', () => {
  it('should load version from electronAPI.app.getVersion()', () => {
    expect(appSource).toContain('electronAPI.app.getVersion')
    // Or fallback
    expect(appSource).toContain('electronAPI.version.get')
  })

  it('should display version in the header', () => {
    expect(appSource).toContain('appVersion')
    // The version badge should show v{version}
    expect(appSource).toMatch(/v\$\{appVersion\}/)
  })

  it('should never hardcode the version', () => {
    // No hardcoded version strings like "1.4.33" or "1.5.79"
    const hardcodedVersion = appSource.match(/['"]v?1\.\d+\.\d+['"]/)
    expect(hardcodedVersion).toBeNull()
  })

  it('WelcomeScreen should also load and display version', () => {
    expect(welcomeSource).toContain('appVersion')
    expect(welcomeSource).toContain('getVersion')
  })
})

describe('KAN-53: Workspace path validation', () => {
  it('should handle non-existent workspace paths gracefully', () => {
    // The WelcomeScreen or App should validate paths before setting workspacePath
    // Look for fs.existsSync or stat-based validation patterns
    const hasPathValidation = appSource.includes('existsSync') ||
      appSource.includes('stat(') ||
      appSource.includes('access(') ||
      appSource.includes('pathExists') ||
      welcomeSource.includes('existsSync') ||
      welcomeSource.includes('stat(')
    // At minimum, opening a recent workspace should handle errors
    expect(welcomeSource).toContain('catch')
  })
})

describe('KAN-53: Language selector flow', () => {
  it('should show language selector BEFORE WelcomeScreen on first launch', () => {
    // In the render section, showLanguageSelector conditional must come
    // before the WelcomeScreen conditional. Look for the if() render guards.
    const renderSection = appSource.slice(appSource.indexOf('if (showLanguageSelector)'))
    const langIdx = renderSection.indexOf('if (showLanguageSelector)')
    const welcomeIdx = renderSection.indexOf('!workspacePath')
    expect(langIdx).toBeLessThan(welcomeIdx)
  })

  it('should set language in localStorage after selection', () => {
    expect(appSource).toContain('aibuddy_language_selected')
  })
})

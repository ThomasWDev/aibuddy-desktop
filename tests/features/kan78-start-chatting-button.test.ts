/**
 * KAN-78: [Mac] "Start Chatting" Button Not Working
 *
 * Root cause:
 *   The onNewChat callback in App.tsx only sets `hasUsedBefore = true`,
 *   but the WelcomeScreen visibility gate is `if (!workspacePath)` — it does
 *   NOT check hasUsedBefore. Clicking "Start Chatting" has zero visible effect
 *   because workspacePath remains null and WelcomeScreen keeps rendering.
 *
 * Fix:
 *   - Add a `chatWithoutWorkspace` boolean state in App.tsx.
 *   - Change the WelcomeScreen gate to `if (!workspacePath && !chatWithoutWorkspace)`.
 *   - In onNewChat callback, set `chatWithoutWorkspace = true` to bypass WelcomeScreen.
 *   - Reset `chatWithoutWorkspace = false` in the Home button handler so user can return.
 *
 * This does NOT conflict with KAN-53 because:
 *   - Fresh app launch: workspacePath=null, chatWithoutWorkspace=false → WelcomeScreen shows
 *   - Click "Start Chatting": chatWithoutWorkspace=true → chat UI shows
 *   - Click "Home": both reset → WelcomeScreen shows again
 *   - Open a folder: workspacePath is set → chat UI shows regardless
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const APP_TSX = path.resolve(__dirname, '../../renderer/src/App.tsx')
const WELCOME_SCREEN = path.resolve(__dirname, '../../renderer/src/components/welcome/WelcomeScreen.tsx')

const appSource = fs.readFileSync(APP_TSX, 'utf-8')
const welcomeSource = fs.readFileSync(WELCOME_SCREEN, 'utf-8')

describe('KAN-78: chatWithoutWorkspace state', () => {
  it('should declare chatWithoutWorkspace state variable', () => {
    expect(appSource).toMatch(/const\s*\[\s*chatWithoutWorkspace\s*,\s*setChatWithoutWorkspace\s*\]\s*=\s*useState/)
  })

  it('should initialize chatWithoutWorkspace to false', () => {
    expect(appSource).toMatch(/useState\s*<?\s*boolean\s*>?\s*\(\s*false\s*\)/)
  })
})

describe('KAN-78: WelcomeScreen gate includes chatWithoutWorkspace', () => {
  it('should check both workspacePath and chatWithoutWorkspace before showing WelcomeScreen', () => {
    // The condition should be: if (!workspacePath && !chatWithoutWorkspace)
    expect(appSource).toMatch(/if\s*\(\s*!workspacePath\s*&&\s*!chatWithoutWorkspace\s*\)/)
  })

  it('should NOT use only !workspacePath as the sole WelcomeScreen gate', () => {
    // The old gate `if (!workspacePath) { return (<WelcomeScreen` should be gone
    const oldGate = appSource.match(/if\s*\(\s*!workspacePath\s*\)\s*\{?\s*\n?\s*return\s*\(\s*\n?\s*<WelcomeScreen/)
    expect(oldGate).toBeNull()
  })
})

describe('KAN-78: onNewChat sets chatWithoutWorkspace', () => {
  it('should call setChatWithoutWorkspace(true) in the onNewChat handler', () => {
    // The onNewChat prop handler should set chatWithoutWorkspace
    expect(appSource).toContain('setChatWithoutWorkspace(true)')
  })

  it('should still be wired to WelcomeScreen onNewChat prop', () => {
    // WelcomeScreen must receive onNewChat prop
    expect(appSource).toMatch(/onNewChat\s*=/)
  })
})

describe('KAN-78: Home button resets chatWithoutWorkspace', () => {
  it('should reset chatWithoutWorkspace to false when Home button is clicked', () => {
    expect(appSource).toContain('setChatWithoutWorkspace(false)')
  })

  it('should reset both workspacePath and chatWithoutWorkspace in the Home handler', () => {
    // Both resets should be close to each other (within the same click handler)
    const homeIdx = appSource.indexOf('setChatWithoutWorkspace(false)')
    const workspaceResetIdx = appSource.indexOf('setWorkspacePath(null)')
    expect(homeIdx).toBeGreaterThan(-1)
    expect(workspaceResetIdx).toBeGreaterThan(-1)
    // They should be within ~200 chars of each other (same handler)
    expect(Math.abs(homeIdx - workspaceResetIdx)).toBeLessThan(200)
  })
})

describe('KAN-78: WelcomeScreen handleNewChat calls onNewChat', () => {
  it('should call onNewChat when Start Chatting is clicked', () => {
    expect(welcomeSource).toContain('onNewChat()')
  })

  it('should have onNewChat as a prop', () => {
    expect(welcomeSource).toMatch(/onNewChat\s*\??\s*:\s*\(\)/)
  })
})

describe('KAN-78: Downstream workspacePath usage is safe without a workspace', () => {
  it('should guard terminal execution behind workspacePath check', () => {
    expect(appSource).toMatch(/!workspacePath/)
  })

  it('should use fallback for workspacePath in API requests', () => {
    expect(appSource).toContain("workspacePath || 'none'")
  })

  it('should guard handoff doc loading behind workspacePath check', () => {
    expect(appSource).toMatch(/workspacePath\s*&&\s*window\.electronAPI/)
  })
})

/**
 * KAN-53 TDD Tests: App does not navigate to landing page on launch
 *
 * Root cause:
 *   WelcomeScreen component exists but is never imported or rendered in App.tsx.
 *   After language selector, app always goes straight to main chat interface.
 *
 * Fix:
 *   1. Import WelcomeScreen in App.tsx
 *   2. Show WelcomeScreen when no workspace is loaded and user hasn't started chatting
 *   3. Pass handleOpenFolder callback so user can select a folder
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

// ─── 1. WELCOME SCREEN IMPORT ──────────────────────────────────────
describe('KAN-53 — WelcomeScreen integration', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('App.tsx must import WelcomeScreen', () => {
    expect(appTsx).toMatch(/import.*WelcomeScreen.*from/)
  })

  it('App.tsx must render WelcomeScreen conditionally', () => {
    expect(appTsx).toMatch(/<WelcomeScreen/)
  })

  it('WelcomeScreen must receive onOpenFolder prop', () => {
    expect(appTsx).toMatch(/WelcomeScreen[\s\S]*?onOpenFolder/)
  })
})

// ─── 2. CONDITIONAL RENDERING ───────────────────────────────────────
describe('KAN-53 — Conditional landing page rendering', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('must check workspacePath before rendering main chat', () => {
    const renderSection = appTsx.slice(
      appTsx.indexOf('showLanguageSelector'),
      appTsx.indexOf('showLanguageSelector') + 2000
    )
    expect(renderSection).toMatch(/workspacePath|!workspacePath/)
  })
})

// ─── 3. WELCOME SCREEN COMPONENT EXISTS ─────────────────────────────
describe('KAN-53 — WelcomeScreen component', () => {
  const welcome = read('renderer/src/components/welcome/WelcomeScreen.tsx')

  it('WelcomeScreen must accept onOpenFolder prop', () => {
    expect(welcome).toContain('onOpenFolder')
  })

  it('WelcomeScreen must have a folder open action', () => {
    expect(welcome).toMatch(/openFolder|handleOpenFolder|dialog/)
  })

  it('WelcomeScreen must display version', () => {
    expect(welcome).toMatch(/appVersion|version/i)
  })
})

// ─── 4. REGRESSION GUARDS ──────────────────────────────────────────
describe('KAN-53 — Regression guards', () => {
  const appTsx = read('renderer/src/App.tsx')

  it('language selector must still render first', () => {
    expect(appTsx).toContain('showLanguageSelector')
    expect(appTsx).toContain('LanguageSelector')
  })

  it('handleOpenFolder must still save to recentWorkspaces', () => {
    expect(appTsx).toMatch(/recentWorkspaces/)
  })

  it('main chat interface must still render when workspace is loaded', () => {
    expect(appTsx).toContain('messages.length === 0')
  })
})

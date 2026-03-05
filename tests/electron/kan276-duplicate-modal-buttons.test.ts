import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-276: [Mac][UX] Duplicate Access to Same Modal via "Settings" and
//          "API Key Set" Buttons on Landing Screen
//
// Root cause: Both the "API Key Status" badge and the "Settings" button in the
// header call handleOpenSettings, opening the exact same modal. This creates
// redundant UI controls and confuses users.
//
// Fix (Option 2 from Jira): Convert the API Key Status badge into a
// non-interactive status indicator. Only the Settings button should open the
// modal.
// ---------------------------------------------------------------------------

const WELCOME_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/components/welcome/WelcomeScreen.tsx'),
  'utf-8'
)

describe('KAN-276: only one entry point to API key modal from header', () => {

  // ==========================================================================
  // 1. API Key Status must be a non-interactive indicator
  // ==========================================================================
  describe('API Key Status badge must be a non-interactive indicator', () => {
    it('API Key Status area must NOT be rendered as a <button>', () => {
      // Find the API Key Status section in the header
      const apiKeyStatusSection = WELCOME_SOURCE.slice(
        WELCOME_SOURCE.indexOf('{/* API Key Status'),
        WELCOME_SOURCE.indexOf('{/* Settings Button')
      )
      expect(apiKeyStatusSection).toBeTruthy()
      // Must not contain onClick handler — it's an indicator, not a button
      expect(apiKeyStatusSection).not.toContain('onClick')
    })

    it('API Key Status must use a <span> or <div>, not a <button>', () => {
      const apiKeyStatusSection = WELCOME_SOURCE.slice(
        WELCOME_SOURCE.indexOf('{/* API Key Status'),
        WELCOME_SOURCE.indexOf('{/* Settings Button')
      )
      // Should not use <button> tag
      expect(apiKeyStatusSection).not.toMatch(/<button[\s>]/)
    })

    it('API Key Status must not have cursor: pointer', () => {
      const apiKeyStatusSection = WELCOME_SOURCE.slice(
        WELCOME_SOURCE.indexOf('{/* API Key Status'),
        WELCOME_SOURCE.indexOf('{/* Settings Button')
      )
      expect(apiKeyStatusSection).not.toContain("cursor: 'pointer'")
      expect(apiKeyStatusSection).not.toContain('cursor: pointer')
    })
  })

  // ==========================================================================
  // 2. Settings button must remain the single modal entry point
  // ==========================================================================
  describe('Settings button remains the single modal entry point', () => {
    it('Settings button must still call handleOpenSettings', () => {
      const settingsSection = WELCOME_SOURCE.slice(
        WELCOME_SOURCE.indexOf('{/* Settings Button'),
        WELCOME_SOURCE.indexOf('{/* Buy')
      )
      expect(settingsSection).toBeTruthy()
      expect(settingsSection).toContain('handleOpenSettings')
    })

    it('handleOpenSettings must still exist and open the modal', () => {
      expect(WELCOME_SOURCE).toContain('handleOpenSettings')
      expect(WELCOME_SOURCE).toContain('setShowApiKeyModal(true)')
    })
  })

  // ==========================================================================
  // 3. Only ONE onClick={handleOpenSettings} in the header
  // ==========================================================================
  describe('header must have exactly one modal trigger', () => {
    it('handleOpenSettings must appear exactly once in the header section', () => {
      const headerSection = WELCOME_SOURCE.slice(
        WELCOME_SOURCE.indexOf('{/* Header */}'),
        WELCOME_SOURCE.indexOf('{/* Main Content */}')
      )
      const matches = headerSection.match(/handleOpenSettings/g) || []
      expect(matches.length).toBe(1)
    })
  })

  // ==========================================================================
  // 4. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('API Key Status indicator must still show key state', () => {
      const apiKeyStatusSection = WELCOME_SOURCE.slice(
        WELCOME_SOURCE.indexOf('{/* API Key Status'),
        WELCOME_SOURCE.indexOf('{/* Settings Button')
      )
      expect(apiKeyStatusSection).toContain('hasApiKey')
    })

    it('Settings button must still render with Settings icon', () => {
      const settingsSection = WELCOME_SOURCE.slice(
        WELCOME_SOURCE.indexOf('{/* Settings Button'),
        WELCOME_SOURCE.indexOf('{/* Buy')
      )
      expect(settingsSection).toContain('<Settings')
    })

    it('API Key modal must still exist', () => {
      expect(WELCOME_SOURCE).toContain('{/* API Key Modal */}')
      expect(WELCOME_SOURCE).toContain('showApiKeyModal')
    })

    it('API key banner must still allow opening settings (separate from header)', () => {
      const bannerSection = WELCOME_SOURCE.slice(
        WELCOME_SOURCE.indexOf('{/* API Key Warning Banner'),
        WELCOME_SOURCE.indexOf('{/* Action Buttons')
      )
      expect(bannerSection).toContain('handleOpenSettings')
    })
  })
})

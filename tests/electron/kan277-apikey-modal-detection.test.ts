import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-277: [Mac][UX] Landing "Add Your API Key" Modal Does Not Detect
//          Existing Saved API Key
//
// Root causes:
// 1. Retry path (when electronAPI not ready on first check) calls only
//    loadAppData() — never checks the API key, so hasApiKey stays false
// 2. hasApiKey initializes to false with no "loading" state — the banner
//    flashes before the async check completes
// 3. Modal always shows "Add Your API Key" with no "Update" or status when
//    a key already exists
// ---------------------------------------------------------------------------

const WELCOME_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/components/welcome/WelcomeScreen.tsx'),
  'utf-8'
)

describe('KAN-277: API key modal must detect existing saved key', () => {

  // ==========================================================================
  // 1. Retry path must also check API key
  // ==========================================================================
  describe('retry path must check API key', () => {
    it('loadAppData function must call store.get(apiKey) for key detection', () => {
      const loadAppDataMatch = WELCOME_SOURCE.match(
        /const\s+loadAppData\s*=\s*\(api[^)]*\)\s*=>\s*\{([\s\S]*?)\n  \}/
      )
      expect(loadAppDataMatch).toBeTruthy()
      const loadAppDataBody = loadAppDataMatch![1]
      expect(loadAppDataBody).toContain("apiKey")
      expect(loadAppDataBody).toContain("setHasApiKey")
    })

    it('retry branch must NOT need a separate apiKey check (loadAppData handles it)', () => {
      const retryBlock = WELCOME_SOURCE.slice(
        WELCOME_SOURCE.indexOf('if (!isAvailable)'),
        WELCOME_SOURCE.indexOf('return () => clearInterval')
      )
      expect(retryBlock).toContain('loadAppData(api)')
    })
  })

  // ==========================================================================
  // 2. hasApiKey must have a null/loading state to prevent flash
  // ==========================================================================
  describe('hasApiKey must support loading state', () => {
    it('hasApiKey must initialize as null (not false) to indicate loading', () => {
      expect(WELCOME_SOURCE).toMatch(/useState\s*<\s*boolean\s*\|\s*null\s*>\s*\(\s*null\s*\)/)
    })

    it('API key banner must only show when hasApiKey === false (not null)', () => {
      expect(WELCOME_SOURCE).toContain('hasApiKey === false')
    })
  })

  // ==========================================================================
  // 3. Modal must show different UI when key already exists
  // ==========================================================================
  describe('modal must reflect existing key state', () => {
    it('modal title must change when key exists (Update vs Add)', () => {
      expect(WELCOME_SOURCE).toMatch(/hasApiKey.*Update|update.*API.*Key/i)
    })

    it('modal must show masked key status when key exists', () => {
      expect(WELCOME_SOURCE).toMatch(/•|masked|apiKey.*status|Connected/i)
    })
  })

  // ==========================================================================
  // 4. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('WelcomeScreen must still check electronAPI.store.get(apiKey)', () => {
      expect(WELCOME_SOURCE).toContain("store")
      expect(WELCOME_SOURCE).toContain("'apiKey'")
    })

    it('must still have setHasApiKey setter', () => {
      expect(WELCOME_SOURCE).toContain('setHasApiKey')
    })

    it('must still have handleSaveApiKey function', () => {
      expect(WELCOME_SOURCE).toContain('handleSaveApiKey')
    })

    it('API key modal must still be toggleable via showApiKeyModal', () => {
      expect(WELCOME_SOURCE).toContain('showApiKeyModal')
      expect(WELCOME_SOURCE).toContain('setShowApiKeyModal')
    })
  })
})

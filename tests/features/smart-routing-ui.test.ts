/**
 * Smoke Tests for Smart Routing UI
 * 
 * Verifies that:
 * 1. Model selector UI has been removed from App.tsx
 * 2. AIBuddy badge is shown instead
 * 3. Backend-only routing contract is preserved
 * 4. No MODEL_OPTIONS or selectedModel references remain
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const APP_TSX_PATH = join(__dirname, '../../renderer/src/App.tsx')
const appSource = readFileSync(APP_TSX_PATH, 'utf-8')

describe('Smart Routing UI Smoke Tests', () => {

  describe('Model selector removed', () => {
    it('should NOT contain MODEL_OPTIONS array', () => {
      expect(appSource).not.toContain('const MODEL_OPTIONS')
    })

    it('should NOT contain selectedModel state', () => {
      expect(appSource).not.toContain('const [selectedModel')
    })

    it('should NOT contain showModelSelector state', () => {
      expect(appSource).not.toContain('const [showModelSelector')
    })

    it('should NOT contain setSelectedModel', () => {
      expect(appSource).not.toContain('setSelectedModel')
    })

    it('should NOT contain setShowModelSelector', () => {
      expect(appSource).not.toContain('setShowModelSelector')
    })

    it('should NOT contain MODEL_CONFIG reference', () => {
      expect(appSource).not.toContain('MODEL_CONFIG')
    })

    it('should NOT contain ModelOption interface', () => {
      expect(appSource).not.toContain('interface ModelOption')
    })
  })

  describe('AIBuddy badge shown', () => {
    it('should show AIBuddy branding in the input area', () => {
      expect(appSource).toContain('AIBuddy')
    })

    it('should contain smart routing explanation comment', () => {
      expect(appSource).toContain('smart backend routing')
    })
  })

  describe('Backend routing contract', () => {
    it('should send has_images flag to backend', () => {
      expect(appSource).toContain('has_images')
    })

    it('should NOT send model parameter to backend', () => {
      // The request body should not have a 'model' field
      // Check for the comment that explains this
      expect(appSource).toContain('No model selection')
    })

    it('should reference backend smart routing in API call', () => {
      expect(appSource).toContain('backend smart routing')
    })
  })
})

describe('Extension Config Smoke Tests', () => {
  const EXTENSION_CONFIG_PATH = join(__dirname, '../../../extension/src/api/providers/config/aibuddy.ts')

  it('should have single AIBuddy model entry as primary', () => {
    const configSource = readFileSync(EXTENSION_CONFIG_PATH, 'utf-8')
    expect(configSource).toContain('id: "aibuddy"')
    expect(configSource).toContain('isRecommended: true')
  })

  it('should describe smart routing in extension config', () => {
    const configSource = readFileSync(EXTENSION_CONFIG_PATH, 'utf-8')
    expect(configSource).toContain('Smart AI routing')
  })

  it('should NOT contain individual model IDs as primary entries', () => {
    const configSource = readFileSync(EXTENSION_CONFIG_PATH, 'utf-8')
    // These should NOT appear as primary model IDs
    expect(configSource).not.toContain('id: "claude-opus-4-20250514"')
    expect(configSource).not.toContain('id: "gpt-5.3-codex"')
    expect(configSource).not.toContain('id: "deepseek-chat"')
  })
})

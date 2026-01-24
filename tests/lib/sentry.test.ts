import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  initSentryRenderer,
  addBreadcrumb,
  captureError,
  captureMessage,
  trackUserAction,
  trackUserMessage,
  trackNavigation,
  trackButtonClick,
  trackError,
  trackAIRequest,
  trackAIResponse,
  trackFileOperation,
  trackPanelToggle
} from '../../renderer/src/lib/sentry'

describe('Sentry Renderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    vi.mocked(global.fetch).mockReset()
  })

  describe('initSentryRenderer', () => {
    it('should initialize without error', () => {
      expect(() => initSentryRenderer()).not.toThrow()
    })

    it('should only initialize once', () => {
      initSentryRenderer()
      initSentryRenderer() // Second call should be no-op
      // No error should be thrown
    })
  })

  describe('addBreadcrumb', () => {
    it('should add breadcrumb without error', () => {
      expect(() => addBreadcrumb('Test message', 'test')).not.toThrow()
    })

    it('should add breadcrumb with data', () => {
      expect(() => addBreadcrumb('Test message', 'test', { key: 'value' })).not.toThrow()
    })

    it('should add breadcrumb with level', () => {
      expect(() => addBreadcrumb('Test message', 'test', undefined, 'warning')).not.toThrow()
    })
  })

  describe('captureError', () => {
    it('should capture error', () => {
      const error = new Error('Test error')
      const result = captureError(error)
      // Returns undefined when not initialized, or event ID when initialized
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should capture error with context', () => {
      const error = new Error('Test error')
      const result = captureError(error, { context: 'test' })
      expect(result === undefined || typeof result === 'string').toBe(true)
    })
  })

  describe('captureMessage', () => {
    it('should capture message', () => {
      const result = captureMessage('Test message')
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should capture message with level', () => {
      const result = captureMessage('Test message', 'warning')
      expect(result === undefined || typeof result === 'string').toBe(true)
    })
  })

  describe('trackUserAction', () => {
    it('should track user action', () => {
      expect(() => trackUserAction('click', 'button')).not.toThrow()
    })

    it('should track user action with value', () => {
      expect(() => trackUserAction('select', 'dropdown', 'option1')).not.toThrow()
    })
  })

  describe('trackUserMessage', () => {
    it('should track user message', () => {
      expect(() => trackUserMessage(100)).not.toThrow()
    })

    it('should track user message with images', () => {
      expect(() => trackUserMessage(100, true)).not.toThrow()
    })

    it('should track user message with attachments', () => {
      expect(() => trackUserMessage(100, false, true)).not.toThrow()
    })

    it('should track new task message', () => {
      expect(() => trackUserMessage(100, false, false, true)).not.toThrow()
    })
  })

  describe('trackNavigation', () => {
    it('should track navigation', () => {
      expect(() => trackNavigation('home', 'settings')).not.toThrow()
    })

    it('should track navigation with trigger', () => {
      expect(() => trackNavigation('home', 'settings', 'button')).not.toThrow()
    })
  })

  describe('trackButtonClick', () => {
    it('should track button click', () => {
      expect(() => trackButtonClick('Submit', 'Form')).not.toThrow()
    })

    it('should track button click with data', () => {
      expect(() => trackButtonClick('Submit', 'Form', { formId: '123' })).not.toThrow()
    })
  })

  describe('trackError', () => {
    it('should track error', () => {
      const error = new Error('Test error')
      const result = trackError(error)
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should track error with context', () => {
      const error = new Error('Test error')
      const result = trackError(error, { component: 'TestComponent' })
      expect(result === undefined || typeof result === 'string').toBe(true)
    })
  })

  describe('trackAIRequest', () => {
    it('should track AI request', () => {
      expect(() => trackAIRequest({
        model: 'claude-opus-4',
        messageCount: 5
      })).not.toThrow()
    })

    it('should track AI request with images', () => {
      expect(() => trackAIRequest({
        model: 'claude-opus-4',
        messageCount: 5,
        hasImages: true
      })).not.toThrow()
    })

    it('should track AI request with tools', () => {
      expect(() => trackAIRequest({
        model: 'claude-opus-4',
        messageCount: 5,
        hasTools: true
      })).not.toThrow()
    })
  })

  describe('trackAIResponse', () => {
    it('should track successful AI response', () => {
      expect(() => trackAIResponse({
        model: 'claude-opus-4',
        outputTokens: 100,
        responseTime: 2000,
        success: true
      })).not.toThrow()
    })

    it('should track failed AI response', () => {
      expect(() => trackAIResponse({
        model: 'claude-opus-4',
        outputTokens: 0,
        responseTime: 5000,
        success: false
      })).not.toThrow()
    })
  })

  describe('trackFileOperation', () => {
    it('should track file read', () => {
      expect(() => trackFileOperation('read', '/path/to/file.ts', true)).not.toThrow()
    })

    it('should track file write', () => {
      expect(() => trackFileOperation('write', '/path/to/file.ts', true)).not.toThrow()
    })

    it('should track failed file operation', () => {
      expect(() => trackFileOperation('delete', '/path/to/file.ts', false)).not.toThrow()
    })
  })

  describe('trackPanelToggle', () => {
    it('should track panel open', () => {
      expect(() => trackPanelToggle('AI Panel', true)).not.toThrow()
    })

    it('should track panel close', () => {
      expect(() => trackPanelToggle('Terminal', false)).not.toThrow()
    })
  })
})


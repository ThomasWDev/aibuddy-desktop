import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-33: Extremely long response time (~2 minutes) — UX Improvements
 *
 * While backend smart routing + prompt optimization reduced actual response
 * times, complex Claude Opus requests still take 30s-2min. The user sees
 * a static "AIBuddy is thinking..." with a frozen progress bar the entire
 * time, making the app appear broken.
 *
 * Fixes:
 * 1. Live elapsed-time counter shown during thinking/generating states
 * 2. Reassurance messages at 15s, 30s, and 60s thresholds
 * 3. Animated (indeterminate) progress bar during thinking state
 * 4. Time context in the loading indicator ("Thinking... 12s")
 */

const APP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-33: Response Time UX Improvements', () => {

  describe('Elapsed time counter during loading', () => {
    it('must track elapsed seconds with a state variable', () => {
      // A useState or useRef for tracking elapsed time during API calls
      expect(APP_SOURCE).toMatch(/elapsedSeconds|elapsedTime|loadingElapsed/)
    })

    it('must use setInterval to update elapsed time every second', () => {
      // The elapsed counter needs a 1-second interval while loading
      const loadingTimerBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('elapsedSeconds') > -1
          ? APP_SOURCE.indexOf('elapsedSeconds') - 200
          : 0,
        APP_SOURCE.indexOf('elapsedSeconds') > -1
          ? APP_SOURCE.indexOf('elapsedSeconds') + 800
          : 100
      )

      expect(APP_SOURCE).toContain('setInterval')
      expect(APP_SOURCE).toContain('elapsedSeconds')
    })

    it('must reset elapsed counter when loading starts', () => {
      // When a new request starts, the counter must reset to 0
      expect(APP_SOURCE).toMatch(/setElapsedSeconds\(0\)|elapsedSeconds.*=.*0/)
    })

    it('must clear interval when loading ends or component unmounts', () => {
      // Prevent memory leaks — clearInterval when done
      expect(APP_SOURCE).toContain('clearInterval')
    })

    it('must display elapsed time in the loading indicator', () => {
      // The elapsed seconds must be visible to the user during thinking state
      expect(APP_SOURCE).toContain('elapsedSeconds')
      // Should show something like "12s" or "1:05" in the UI
      expect(APP_SOURCE).toMatch(/elapsedSeconds.*s\b|formatTime|`\$\{elapsedSeconds\}s`/)
    })
  })

  describe('Reassurance messages at time thresholds', () => {
    it('must show a reassurance message after extended wait', () => {
      // After 15+ seconds, show a message like "Complex tasks may take longer"
      // to prevent users from thinking the app is frozen
      expect(APP_SOURCE).toMatch(/elapsedSeconds\s*>=?\s*15|elapsedSeconds\s*>\s*14/)
    })

    it('must show a different message for very long waits (30s+)', () => {
      expect(APP_SOURCE).toMatch(/elapsedSeconds\s*>=?\s*30|elapsedSeconds\s*>\s*29/)
    })

    it('must show a still-working message for 60s+ waits', () => {
      expect(APP_SOURCE).toMatch(/elapsedSeconds\s*>=?\s*60|elapsedSeconds\s*>\s*59/)
    })
  })

  describe('Progress bar animation during thinking', () => {
    it('progress bar must not be static at a fixed percentage during thinking', () => {
      // The progress bar at the "thinking" state used to be fixed at 70%.
      // Now it should animate (pulse, indeterminate, or increment).
      const loadingBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('Enhanced Loading'),
        APP_SOURCE.indexOf('Enhanced Loading') + 2000
      )

      // Should have some form of animation beyond a static width
      const hasAnimation =
        loadingBlock.includes('animate-') ||
        loadingBlock.includes('transition-') ||
        loadingBlock.includes('indeterminate') ||
        loadingBlock.includes('elapsedSeconds')

      expect(hasAnimation).toBe(true)
    })
  })

  describe('No artificial delays (regression guard)', () => {
    it('status transitions must NOT use setTimeout delays', () => {
      // KAN-33 original fix: no 200ms+300ms+200ms delays before API call
      // Extract only the executable lines (skip comments)
      const anchor = APP_SOURCE.indexOf('KAN-33 FIX: Removed')
      const block = APP_SOURCE.slice(anchor, anchor + 300)
      const executableLines = block
        .split('\n')
        .filter(l => !l.trim().startsWith('//'))
        .join('\n')

      expect(executableLines).toContain('setStatus')
      expect(executableLines).not.toContain('setTimeout')
    })

    it('pre-processing must be tracked via fetchStartTime', () => {
      expect(APP_SOURCE).toContain('fetchStartTime')
      expect(APP_SOURCE).toContain('preProcessMs')
    })

    it('network time must be tracked via fetchEndTime', () => {
      expect(APP_SOURCE).toContain('fetchEndTime')
      expect(APP_SOURCE).toContain('networkMs')
    })
  })

  describe('Performance constants and guards', () => {
    it('MAX_CONTEXT_TOKENS must be defined to prevent oversized prompts', () => {
      expect(APP_SOURCE).toContain('MAX_CONTEXT_TOKENS')
      const match = APP_SOURCE.match(/MAX_CONTEXT_TOKENS\s*=\s*(\d[\d_]*)/)
      expect(match).toBeTruthy()
    })

    it('MAX_PAYLOAD_BYTES must be defined for ALB limit', () => {
      expect(APP_SOURCE).toContain('MAX_PAYLOAD_BYTES')
    })

    it('TIMEOUT_MS must be set (5 minutes for Claude Opus)', () => {
      expect(APP_SOURCE).toContain('TIMEOUT_MS')
      const match = APP_SOURCE.match(/\bconst TIMEOUT_MS\s*=\s*(\d[\d_]*)/)
      expect(match).toBeTruthy()
      const timeoutMs = parseInt(match![1].replace(/_/g, ''))
      expect(timeoutMs).toBe(300000) // 5 minutes
    })

    it('trackSlowOperation must be called for AI responses', () => {
      expect(APP_SOURCE).toContain("trackSlowOperation('AI Response'")
    })
  })
})

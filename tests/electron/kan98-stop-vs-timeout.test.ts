import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-98: "Stopping a request shows Request timed out instead of Response stopped by user"
 *
 * Root cause: Both user-initiated cancel and timeout used the same AbortError path,
 * producing identical "Request timed out" messages for both cases.
 *
 * Fix: Added `userAbortedRef` to distinguish user-initiated stops (Escape / Stop button)
 * from actual timeout aborts. The ref is set to `true` only on explicit user action
 * and reset to `false` before each new request.
 */

const APP_TSX = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

describe('KAN-98: Stop vs Timeout — User-Initiated Cancel Detection', () => {
  describe('userAbortedRef lifecycle', () => {
    it('should define userAbortedRef with initial value false', () => {
      expect(APP_TSX).toContain('userAbortedRef = useRef(false)')
    })

    it('should reset userAbortedRef to false before each request', () => {
      const resetPattern = 'userAbortedRef.current = false'
      const resetIndex = APP_TSX.indexOf(resetPattern)
      expect(resetIndex).toBeGreaterThan(-1)

      const surroundingChunk = APP_TSX.substring(Math.max(0, resetIndex - 100), resetIndex + 100)
      expect(surroundingChunk).toContain('Sending to AI')
    })

    it('should set userAbortedRef to true on Stop button click before abort()', () => {
      const stopSection = APP_TSX.indexOf('Stop generating (Esc)')
      expect(stopSection).toBeGreaterThan(-1)

      const nextChunk = APP_TSX.substring(stopSection, stopSection + 600)
      const setTrueIdx = nextChunk.indexOf('userAbortedRef.current = true')
      const abortIdx = nextChunk.indexOf('.abort()')
      expect(setTrueIdx).toBeGreaterThan(-1)
      expect(abortIdx).toBeGreaterThan(-1)
      expect(setTrueIdx).toBeLessThan(abortIdx)
    })

    it('should set userAbortedRef to true on Escape key before abort()', () => {
      const escSection = APP_TSX.indexOf("e.key === 'Escape'")
      expect(escSection).toBeGreaterThan(-1)

      const nextChunk = APP_TSX.substring(escSection, escSection + 400)
      const setTrueIdx = nextChunk.indexOf('userAbortedRef.current = true')
      const abortIdx = nextChunk.indexOf('.abort()')
      expect(setTrueIdx).toBeGreaterThan(-1)
      expect(abortIdx).toBeGreaterThan(-1)
      expect(setTrueIdx).toBeLessThan(abortIdx)
    })
  })

  describe('Fetch catch block — message differentiation', () => {
    it('should check userAbortedRef.current in AbortError catch block', () => {
      const abortErrorSection = APP_TSX.indexOf("fetchError.name === 'AbortError'")
      expect(abortErrorSection).toBeGreaterThan(-1)

      const nextChunk = APP_TSX.substring(abortErrorSection, abortErrorSection + 500)
      expect(nextChunk).toContain('userAbortedRef.current')
    })

    it('should NOT show timeout toast when user initiated the cancel', () => {
      const abortErrorSection = APP_TSX.indexOf("fetchError.name === 'AbortError'")
      const nextChunk = APP_TSX.substring(abortErrorSection, abortErrorSection + 500)
      const userAbortIdx = nextChunk.indexOf('userAbortedRef.current')
      expect(userAbortIdx).toBeGreaterThan(-1)

      const afterUserAbort = nextChunk.substring(userAbortIdx, userAbortIdx + 200)
      expect(afterUserAbort).toContain('User stopped request')
    })

    it('should show timeout toast only when timeout triggers the abort', () => {
      const abortErrorSection = APP_TSX.indexOf("fetchError.name === 'AbortError'")
      const nextChunk = APP_TSX.substring(abortErrorSection, abortErrorSection + 500)
      expect(nextChunk).toContain('Request timed out')
    })
  })

  describe('Error handler — message differentiation', () => {
    it('should show "Response Stopped" for user-initiated abort in error handler', () => {
      expect(APP_TSX).toContain('Response stopped by user')
    })

    it('should show "Response Stopped" content block for user abort', () => {
      expect(APP_TSX).toContain('Response Stopped')
      expect(APP_TSX).toContain('You stopped the response')
    })

    it('should show "Request Timed Out" content block for timeout', () => {
      expect(APP_TSX).toContain('Request Timed Out')
      expect(APP_TSX).toContain('The AI is taking too long to respond')
    })
  })

  describe('Regression guards', () => {
    it('should reset userAbortedRef after handling in fetch catch', () => {
      const abortErrorSection = APP_TSX.indexOf("fetchError.name === 'AbortError'")
      const nextChunk = APP_TSX.substring(abortErrorSection, abortErrorSection + 600)
      const occurrences = nextChunk.split('userAbortedRef.current = false').length - 1
      expect(occurrences).toBeGreaterThanOrEqual(1)
    })

    it('should reset userAbortedRef after handling in error handler', () => {
      const stoppedSection = APP_TSX.indexOf('Response Stopped')
      expect(stoppedSection).toBeGreaterThan(-1)
      const nextChunk = APP_TSX.substring(stoppedSection, stoppedSection + 300)
      expect(nextChunk).toContain('userAbortedRef.current = false')
    })

    it('should show Stop button only when isLoading is true', () => {
      const stopBtnSection = APP_TSX.indexOf('Stop generating (Esc)')
      expect(stopBtnSection).toBeGreaterThan(-1)
      const precedingChunk = APP_TSX.substring(Math.max(0, stopBtnSection - 200), stopBtnSection)
      expect(precedingChunk).toContain('isLoading')
    })
  })
})

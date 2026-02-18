import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Response Body Parsing Timeout Guard
 * 
 * ROOT CAUSE (Feb 17, 2026): The desktop app could hang indefinitely when the
 * API server sent a response header (200 OK) but the body stream stalled.
 * The 5-minute AbortController timeout only covers the initial fetch(), not
 * response.json(). If the TCP connection stayed open with a partial body,
 * the app would show "AIBuddy is thinking..." forever.
 * 
 * FIX: Wrapped response.json() with Promise.race([response.json(), timeout])
 * using a 60-second timeout that rejects with a descriptive error.
 * 
 * PREVENTION: These tests ensure the timeout wrapper stays in place.
 */

const appTsxPath = path.resolve(__dirname, '../../renderer/src/App.tsx')
const appTsx = fs.readFileSync(appTsxPath, 'utf-8')

describe('response.json() Timeout Guard', () => {
  it('should have JSON_PARSE_TIMEOUT constant', () => {
    expect(appTsx).toContain('JSON_PARSE_TIMEOUT')
  })

  it('JSON_PARSE_TIMEOUT should be 60 seconds (60_000ms)', () => {
    expect(appTsx).toMatch(/JSON_PARSE_TIMEOUT\s*=\s*60[_,]?000/)
  })

  it('should wrap response.json() with Promise.race', () => {
    expect(appTsx).toContain('Promise.race')
    // Promise.race should contain response.json()
    const raceBlock = appTsx.substring(
      appTsx.indexOf('Promise.race'),
      appTsx.indexOf('Promise.race') + 300
    )
    expect(raceBlock).toContain('response.json()')
  })

  it('timeout promise should reject with descriptive error', () => {
    expect(appTsx).toContain('Response body parsing timed out')
  })

  it('should still have the 5-minute fetch AbortController timeout', () => {
    expect(appTsx).toMatch(/TIMEOUT_MS\s*=\s*300[_,]?000/)
  })

  it('AbortController should be stored for cancel button (KAN-35)', () => {
    expect(appTsx).toContain('abortControllerRef.current = controller')
  })

  it('fetch timeout should call controller.abort()', () => {
    expect(appTsx).toContain('controller.abort()')
  })

  it('should handle AbortError for user-facing timeout message', () => {
    expect(appTsx).toContain("fetchError.name === 'AbortError'")
  })

  it('should have finally block to reset isLoading', () => {
    expect(appTsx).toContain('finally')
    expect(appTsx).toContain('setIsLoading(false)')
  })
})

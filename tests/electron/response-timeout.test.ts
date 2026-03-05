import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Response Body Parsing Timeout Guard
 * 
 * ROOT CAUSE (Feb 17, 2026): The desktop app could hang indefinitely when the
 * API server sent a response header (200 OK) but the body stream stalled.
 * 
 * FIX: KAN-272 replaced raw response.json() with safeParseResponse() from
 * response-parser.ts, which includes a configurable timeout (default 60s)
 * via Promise.race. The old JSON_PARSE_TIMEOUT constant is no longer needed
 * because the timeout lives in the utility.
 * 
 * PREVENTION: These tests ensure the safe parser stays in place.
 */

const appTsxPath = path.resolve(__dirname, '../../renderer/src/App.tsx')
const appTsx = fs.readFileSync(appTsxPath, 'utf-8')

const parserPath = path.resolve(__dirname, '../../renderer/src/lib/response-parser.ts')
const parserSrc = fs.readFileSync(parserPath, 'utf-8')

describe('response body parsing timeout guard (KAN-272)', () => {
  it('should use safeParseResponse with 60s timeout', () => {
    expect(appTsx).toContain('safeParseResponse(response, 60_000)')
  })

  it('response-parser should have timeout via Promise.race', () => {
    expect(parserSrc).toContain('Promise.race')
  })

  it('response-parser timeout should reject with descriptive error', () => {
    expect(parserSrc).toContain('timed out')
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

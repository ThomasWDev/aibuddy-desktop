import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const APP_TSX = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

describe('KAN-98: Stop Request Shows Correct Message (User Stop vs Timeout)', () => {
  it('should have userAbortedRef for distinguishing user stops from timeouts', () => {
    expect(APP_TSX).toContain('userAbortedRef')
  })

  it('userAbortedRef should be initialized as false', () => {
    expect(APP_TSX).toContain('const userAbortedRef = useRef(false)')
  })

  it('should set userAbortedRef.current = true when user stops a request', () => {
    expect(APP_TSX).toContain('userAbortedRef.current = true')
  })

  it('should reset userAbortedRef.current = false for each new request', () => {
    expect(APP_TSX).toContain('userAbortedRef.current = false')
  })

  it('should show "Response stopped by user" message on user abort', () => {
    expect(APP_TSX).toContain('Response stopped by user')
  })

  it('should show "Response Stopped" in error content for user abort', () => {
    expect(APP_TSX).toContain('Response Stopped')
  })

  it('should show "Request Timed Out" only for non-user-initiated aborts', () => {
    expect(APP_TSX).toContain('Request Timed Out')
  })

  it('should check userAbortedRef before deciding abort message type', () => {
    const abortCheckIndex = APP_TSX.indexOf('if (userAbortedRef.current)')
    expect(abortCheckIndex).toBeGreaterThan(-1)
  })

  it('stop button should set userAbortedRef before aborting', () => {
    const lines = APP_TSX.split('\n')
    let found = false
    for (let i = 0; i < lines.length - 3; i++) {
      if (lines[i].includes('userAbortedRef.current = true') && 
          lines.slice(i, i + 5).some(l => l.includes('.abort()'))) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('Escape key handler should set userAbortedRef to true', () => {
    const escapeSection = APP_TSX.split("e.key === 'Escape'")[1]?.slice(0, 300)
    expect(escapeSection).toContain('userAbortedRef.current = true')
  })
})

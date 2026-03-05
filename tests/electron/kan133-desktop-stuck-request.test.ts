import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-133: Desktop App — Stuck Request Timeout Protection
 *
 * The extension already has 3 layers of protection (pre-stream timeout,
 * planning timeout, useMessageRunning watchdog). The desktop app is missing
 * equivalent safeguards — pre-fetch IPC work runs before the AbortController
 * is created, there is no watchdog, and the finally block doesn't reset status.
 *
 * These tests enforce that the desktop app has the same level of protection.
 */

const appTsxPath = path.resolve(__dirname, '../../renderer/src/App.tsx')
const appTsx = fs.readFileSync(appTsxPath, 'utf-8')

const interviewPanelPath = path.resolve(__dirname, '../../renderer/src/components/InterviewPanel.tsx')
const interviewPanel = fs.readFileSync(interviewPanelPath, 'utf-8')

// ── App.tsx: Pre-fetch timeout ──────────────────────────────────────────

describe('KAN-133 Desktop: Pre-fetch work must have a safety timeout', () => {
  it('App.tsx has a PRE_FETCH_TIMEOUT_MS constant', () => {
    expect(appTsx).toContain('PRE_FETCH_TIMEOUT_MS')
  })

  it('pre-fetch timeout is >= 60s and <= 300s', () => {
    const match = appTsx.match(/PRE_FETCH_TIMEOUT_MS\s*=\s*(\d[\d_]*)/)
    expect(match).not.toBeNull()
    const value = parseInt(match![1].replace(/_/g, ''), 10)
    expect(value).toBeGreaterThanOrEqual(60_000)
    expect(value).toBeLessThanOrEqual(300_000)
  })

  it('AbortController is created BEFORE history IPC calls', () => {
    const controllerIdx = appTsx.indexOf('PRE_FETCH_TIMEOUT_MS')
    const historyCreateIdx = appTsx.indexOf('history.createThread')
    expect(controllerIdx).toBeGreaterThan(-1)
    expect(historyCreateIdx).toBeGreaterThan(-1)
    expect(controllerIdx).toBeLessThan(historyCreateIdx)
  })

  it('pre-fetch timeout aborts the controller', () => {
    const timeoutIdx = appTsx.indexOf('PRE_FETCH_TIMEOUT_MS')
    const section = appTsx.substring(timeoutIdx, timeoutIdx + 600)
    expect(section).toContain('abort')
    expect(section).toContain('Pre-fetch')
  })

  it('pre-fetch timeout is cleared after fetch starts', () => {
    expect(appTsx).toContain('clearTimeout(preFetchTimer)')
  })
})

// ── App.tsx: Watchdog safety net ────────────────────────────────────────

describe('KAN-133 Desktop: Watchdog auto-resets stuck loading state', () => {
  it('App.tsx has a WATCHDOG_TIMEOUT_MS constant', () => {
    expect(appTsx).toContain('WATCHDOG_TIMEOUT_MS')
  })

  it('watchdog timeout is >= 120s and <= 600s', () => {
    const match = appTsx.match(/WATCHDOG_TIMEOUT_MS\s*=\s*(\d[\d_]*)/)
    expect(match).not.toBeNull()
    const value = parseInt(match![1].replace(/_/g, ''), 10)
    expect(value).toBeGreaterThanOrEqual(120_000)
    expect(value).toBeLessThanOrEqual(600_000)
  })

  it('watchdog resets isLoading to false', () => {
    const watchdogIdx = appTsx.indexOf('WATCHDOG_TIMEOUT_MS')
    expect(watchdogIdx).toBeGreaterThan(-1)
    const section = appTsx.substring(watchdogIdx, watchdogIdx + 1500)
    expect(section).toContain('setIsLoading(false)')
  })

  it('watchdog resets status to idle', () => {
    const watchdogIdx = appTsx.indexOf('WATCHDOG_TIMEOUT_MS')
    expect(watchdogIdx).toBeGreaterThan(-1)
    const section = appTsx.substring(watchdogIdx, watchdogIdx + 1500)
    expect(section).toContain("setStatus('idle')")
  })

  it('watchdog timer is cleaned up (cleared on completion)', () => {
    expect(appTsx).toContain('clearTimeout(watchdogTimer)')
  })
})

// ── App.tsx: Finally block resets status ─────────────────────────────────

describe('KAN-133 Desktop: Finally block resets both isLoading and status', () => {
  it('finally block sets isLoading to false', () => {
    const finallyIdx = appTsx.lastIndexOf('} finally {')
    expect(finallyIdx).toBeGreaterThan(-1)
    const finallySection = appTsx.substring(finallyIdx, finallyIdx + 300)
    expect(finallySection).toContain('setIsLoading(false)')
  })

  it('finally block resets status to idle', () => {
    const watchdogIdx = appTsx.indexOf('WATCHDOG_TIMEOUT_MS')
    expect(watchdogIdx).toBeGreaterThan(-1)
    const section = appTsx.substring(watchdogIdx)
    const finallyIdx = section.indexOf('} finally {')
    expect(finallyIdx).toBeGreaterThan(-1)
    const finallySection = section.substring(finallyIdx, finallyIdx + 300)
    expect(finallySection).toContain("setStatus('idle')")
  })

  it('finally block also aborts the controller as last-resort cleanup', () => {
    const watchdogIdx = appTsx.indexOf('WATCHDOG_TIMEOUT_MS')
    expect(watchdogIdx).toBeGreaterThan(-1)
    const section = appTsx.substring(watchdogIdx)
    const finallyIdx = section.indexOf('} finally {')
    expect(finallyIdx).toBeGreaterThan(-1)
    const finallySection = section.substring(finallyIdx, finallyIdx + 400)
    expect(finallySection).toContain('abortControllerRef.current = null')
  })
})

// ── InterviewPanel: Fetch timeout ───────────────────────────────────────

describe('KAN-133 Desktop: InterviewPanel must have a fetch timeout', () => {
  it('InterviewPanel has an INTERVIEW_TIMEOUT_MS constant', () => {
    expect(interviewPanel).toContain('INTERVIEW_TIMEOUT_MS')
  })

  it('interview timeout is >= 60s and <= 300s', () => {
    const match = interviewPanel.match(/INTERVIEW_TIMEOUT_MS\s*=\s*(\d[\d_]*)/)
    expect(match).not.toBeNull()
    const value = parseInt(match![1].replace(/_/g, ''), 10)
    expect(value).toBeGreaterThanOrEqual(60_000)
    expect(value).toBeLessThanOrEqual(300_000)
  })

  it('timeout calls abort on the controller', () => {
    const timeoutIdx = interviewPanel.indexOf('INTERVIEW_TIMEOUT_MS')
    expect(timeoutIdx).toBeGreaterThan(-1)
    const section = interviewPanel.substring(timeoutIdx, timeoutIdx + 500)
    expect(section).toContain('abort')
  })

  it('timeout is cleared after response received', () => {
    expect(interviewPanel).toContain('clearTimeout(interviewTimer)')
  })
})

// ── InterviewPanel: AbortError cleanup ──────────────────────────────────

describe('KAN-133 Desktop: InterviewPanel AbortError must reset response loading', () => {
  it('AbortError handler updates the response to not loading', () => {
    const abortIdx = interviewPanel.indexOf("'AbortError'")
    expect(abortIdx).toBeGreaterThan(-1)
    const section = interviewPanel.substring(abortIdx, abortIdx + 300)
    expect(section).toContain('isLoading: false')
  })
})

/**
 * KAN-185 TDD: Live Audio in Interview Mode not detecting voice input
 *
 * Root cause: Race condition in segment timer — stop() queues async events
 * (dataavailable, stop), but chunksRef is cleared and start() is called
 * synchronously before those events fire, causing audio data loss.
 *
 * Fix: Don't restart recording in the timer. Let onstop handle restart
 * after dataavailable has delivered the audio blob. Track listening state
 * via ref so onstop can decide whether to continue.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-185 — Live Audio segment timer race condition fix', () => {
  const panel = read('renderer/src/components/InterviewPanel.tsx')

  it('segment timer must NOT clear chunksRef (let onstop handle it)', () => {
    // Find the segment timer (the one near "Auto-segment" or "8000")
    const segmentTimerIdx = panel.indexOf('segmentTimerRef.current = setInterval')
    expect(segmentTimerIdx).toBeGreaterThan(-1)
    const timerBlock = panel.slice(segmentTimerIdx, segmentTimerIdx + 300)
    const stopIdx = timerBlock.indexOf('.stop()')
    expect(stopIdx).toBeGreaterThan(-1)
    expect(timerBlock).not.toContain('chunksRef.current = []')
  })

  it('segment timer must NOT call start() immediately after stop()', () => {
    const segmentTimerIdx = panel.indexOf('segmentTimerRef.current = setInterval')
    const timerBlock = panel.slice(segmentTimerIdx, segmentTimerIdx + 300)
    const afterStop = timerBlock.slice(timerBlock.indexOf('.stop()') + 7)
    expect(afterStop).not.toMatch(/\.start\(\)/)
  })

  it('onstop handler must restart recording when still listening', () => {
    const onstopStart = panel.indexOf('recorder.onstop')
    const onstopBlock = panel.slice(onstopStart, onstopStart + 900)
    expect(onstopBlock).toContain('isListeningRef.current')
    expect(onstopBlock).toMatch(/\.start\(\)/)
  })

  it('must have isListeningRef to avoid React closure stale state', () => {
    expect(panel).toMatch(/isListeningRef\s*=\s*useRef/)
  })

  it('isListeningRef must be updated when isListening changes', () => {
    expect(panel).toContain('isListeningRef.current')
  })

  it('transcribeSegment must show error feedback on API failure', () => {
    const fnStart = panel.indexOf('const transcribeSegment')
    const fnEnd = panel.indexOf('}, [apiKey, apiUrl])', fnStart)
    const fnBlock = panel.slice(fnStart, fnEnd + 20)
    expect(fnBlock).toContain('setError')
  })

  it('transcribeSegment must update currentInterim during transcription', () => {
    const fnStart = panel.indexOf('const transcribeSegment')
    const fnEnd = panel.indexOf('}, [apiKey, apiUrl])', fnStart)
    const fnBlock = panel.slice(fnStart, fnEnd + 20)
    expect(fnBlock).toContain('setCurrentInterim')
  })

  it('ondataavailable must push chunks to chunksRef', () => {
    expect(panel).toMatch(/ondataavailable[\s\S]*chunksRef/)
  })

  it('onstop must create blob from chunksRef and transcribe', () => {
    const onstopStart = panel.indexOf('recorder.onstop')
    const onstopBlock = panel.slice(onstopStart, onstopStart + 400)
    expect(onstopBlock).toContain('new Blob(chunksRef.current')
    expect(onstopBlock).toContain('transcribeSegment')
  })
})

/**
 * KAN-188 TDD: "Clear All" in Interview Mode must show confirmation
 *
 * Root cause: window.confirm() renders behind the full-screen overlay on macOS.
 * Fix: Use native Electron dialog.showMessage() with window.confirm() fallback.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-188 — Interview Mode clear confirmation', () => {
  const panel = read('renderer/src/components/InterviewPanel.tsx')

  it('clearAll must be async to support native Electron dialog', () => {
    expect(panel).toMatch(/const clearAll\s*=\s*async/)
  })

  it('clearAll must use electronAPI.dialog.showMessage for native macOS dialog', () => {
    const clearAllFn = panel.slice(
      panel.indexOf('const clearAll'),
      panel.indexOf('const clearAll') + 900
    )
    expect(clearAllFn).toContain('dialog.showMessage')
  })

  it('clearAll must have window.confirm fallback for non-Electron environments', () => {
    const clearAllFn = panel.slice(
      panel.indexOf('const clearAll'),
      panel.indexOf('const clearAll') + 900
    )
    expect(clearAllFn).toContain('window.confirm')
  })

  it('clearAll must not run stopListening/setTranscript without confirmation', () => {
    const clearAllFn = panel.slice(
      panel.indexOf('const clearAll'),
      panel.indexOf('const clearAll') + 900
    )
    const confirmIdx = clearAllFn.indexOf('confirmed')
    const stopIdx = clearAllFn.indexOf('stopListening()')
    expect(confirmIdx).toBeGreaterThan(-1)
    expect(stopIdx).toBeGreaterThan(confirmIdx)
  })

  it('clearAll must skip when no transcript or responses exist', () => {
    const clearAllFn = panel.slice(
      panel.indexOf('const clearAll'),
      panel.indexOf('const clearAll') + 300
    )
    expect(clearAllFn).toMatch(/transcript\.length\s*===\s*0/)
    expect(clearAllFn).toMatch(/responses\.length\s*===\s*0/)
  })

  it('Interview Mode must have two modes: realtime and manual', () => {
    expect(panel).toContain("'realtime'")
    expect(panel).toContain("'manual'")
  })

  it('Clear All button must exist with Trash2 icon', () => {
    expect(panel).toContain('Trash2')
    expect(panel).toContain('clearAll')
  })
})

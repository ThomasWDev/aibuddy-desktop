/**
 * KAN-186 TDD: "Copy" button not working in Interview Mode
 *
 * Root cause: navigator.clipboard.writeText() called without await, no try/catch,
 * no Electron clipboard fallback, and no user feedback. On macOS in Electron,
 * navigator.clipboard silently fails — must use electronAPI.clipboard.writeText.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8')

describe('KAN-186 — Interview Mode Copy button fix', () => {
  const panel = read('renderer/src/components/InterviewPanel.tsx')

  it('Copy handler must use try/catch for clipboard operations', () => {
    const copySection = panel.slice(
      panel.indexOf('Copy'),
      panel.indexOf('Copy') + 50
    )
    // There should be a handleCopy or copyAnswer function with try/catch
    expect(panel).toMatch(/const\s+(handleCopy|copyAnswer)/)
    const fnName = panel.match(/const\s+(handleCopy|copyAnswer)/)?.[1]
    const fnStart = panel.indexOf(`const ${fnName}`)
    const fnBlock = panel.slice(fnStart, fnStart + 600)
    expect(fnBlock).toContain('try')
    expect(fnBlock).toContain('catch')
  })

  it('Copy handler must use electronAPI.clipboard as fallback', () => {
    expect(panel).toMatch(/electronAPI.*clipboard.*writeText/)
  })

  it('Copy handler must await clipboard operations', () => {
    const fnName = panel.match(/const\s+(handleCopy|copyAnswer)/)?.[1]
    expect(fnName).toBeTruthy()
    const fnStart = panel.indexOf(`const ${fnName}`)
    const fnBlock = panel.slice(fnStart, fnStart + 600)
    expect(fnBlock).toMatch(/await.*clipboard/)
  })

  it('must track copied state for visual feedback', () => {
    expect(panel).toMatch(/copiedId|copiedResponseId|setCopiedId|setCopied/)
  })

  it('Copy button must show visual feedback when copied', () => {
    expect(panel).toMatch(/Copied!|✓ Copied|Check/)
  })

  it('Copy and Check icons must be imported from lucide-react', () => {
    const importBlock = panel.slice(0, panel.indexOf('from \'lucide-react\'') + 30)
    expect(importBlock).toContain('Copy')
    expect(importBlock).toContain('Check')
  })

  it('Copy button must call the dedicated handler, not inline clipboard', () => {
    // Should NOT have inline navigator.clipboard.writeText in onClick
    const buttonArea = panel.slice(
      panel.lastIndexOf('Copy'),
      panel.lastIndexOf('Copy') + 200
    )
    // The onClick should reference the handler function, not inline clipboard call
    const fnName = panel.match(/const\s+(handleCopy|copyAnswer)/)?.[1]
    expect(panel).toContain(`onClick={() => ${fnName}(`)
  })
})

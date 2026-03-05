import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-58: Request Status Row Misaligned — Desktop parity
 *
 * Ensure desktop loading/status indicators use compact spacing
 * consistent with the extension's KAN-58 fix.
 */

const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8',
)

const AI_PANEL = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/components/ai/AIPanel.tsx'),
  'utf-8',
)

const INTERVIEW = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/components/InterviewPanel.tsx'),
  'utf-8',
)

describe('KAN-58 Desktop: App.tsx loading indicator spacing', () => {
  const loadingSection = (() => {
    const start = APP_SOURCE.indexOf('{/* Loading */')
    const end = APP_SOURCE.indexOf('<div ref={messagesEndRef}', start)
    return APP_SOURCE.substring(start, end)
  })()

  it('outer gap should be gap-2 (not gap-3)', () => {
    expect(loadingSection).toContain('gap-2')
    expect(loadingSection).not.toMatch(/className="flex gap-3"/)
  })

  it('card should not use p-4 or p-3 (use compact px/py)', () => {
    expect(loadingSection).not.toMatch(/\bp-4\b/)
    expect(loadingSection).toContain('px-3')
    expect(loadingSection).toContain('py-2')
  })

  it('inner flex row should use gap-1.5 (not gap-3)', () => {
    expect(loadingSection).toContain('gap-1.5')
  })

  it('progress bar should use mt-2 (not mt-3)', () => {
    const progressBarArea = loadingSection.substring(
      loadingSection.indexOf('h-1.5 bg-slate-700'),
    )
    const line = loadingSection.split('\n').find(l => l.includes('bg-slate-700') && l.includes('mt-'))
    expect(line).toBeDefined()
    expect(line).toContain('mt-2')
    expect(line).not.toContain('mt-3')
  })

  it('status text uses text-sm', () => {
    expect(loadingSection).toContain('text-sm')
  })
})

describe('KAN-58 Desktop: AIPanel loading indicator spacing', () => {
  const loadingSection = (() => {
    const start = AI_PANEL.indexOf('{/* Loading indicator')
    const end = AI_PANEL.indexOf('<div ref={messagesEndRef}', start)
    return AI_PANEL.substring(start, end)
  })()

  it('outer gap should be gap-2 (not gap-2.5 or gap-3)', () => {
    expect(loadingSection).toContain('gap-2')
    expect(loadingSection).not.toMatch(/gap-2\.5/)
    expect(loadingSection).not.toMatch(/gap-3/)
  })

  it('card should use compact px-2.5 py-1.5 (not p-3)', () => {
    expect(loadingSection).not.toMatch(/\bp-3\b/)
    expect(loadingSection).toContain('px-2.5')
    expect(loadingSection).toContain('py-1.5')
  })

  it('inner flex row should use gap-1.5 (not gap-2)', () => {
    expect(loadingSection).toContain('gap-1.5')
  })
})

describe('KAN-58 Desktop: InterviewPanel loading row spacing', () => {
  it('interview loading row uses gap-1.5 (not gap-2)', () => {
    const loadingLine = INTERVIEW.split('\n').find(l =>
      l.includes('text-purple-400') && l.includes('gap-'),
    )
    expect(loadingLine).toBeDefined()
    expect(loadingLine).toContain('gap-1.5')
    expect(loadingLine).not.toContain('gap-2 ')
  })

  it('interview loading row uses py-2 (not py-4)', () => {
    const loadingLine = INTERVIEW.split('\n').find(l =>
      l.includes('text-purple-400') && l.includes('py-'),
    )
    expect(loadingLine).toBeDefined()
    expect(loadingLine).toContain('py-2')
    expect(loadingLine).not.toContain('py-4')
  })
})

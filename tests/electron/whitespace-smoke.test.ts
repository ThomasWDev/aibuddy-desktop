/**
 * Smoke Tests: User Message Whitespace Preservation
 * Prevents regression of the plain <p> tag bug that collapsed user newlines.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const appPath = resolve(__dirname, '../../renderer/src/App.tsx')
const appContent = readFileSync(appPath, 'utf-8')

describe('Whitespace Preservation Smoke Tests', () => {
  it('App.tsx must use whitespace-pre-wrap for user messages', () => {
    expect(appContent).toContain('whitespace-pre-wrap')
  })

  it('must NOT render user message content in plain <p> without whitespace style', () => {
    const plainPattern = /<p\s+className="text-sm">\{message\.content\}/
    expect(appContent).not.toMatch(plainPattern)
  })

  it('user message <p> tag should have whitespace-pre-wrap class', () => {
    expect(appContent).toMatch(/className="[^"]*whitespace-pre-wrap[^"]*">\{message\.content\}/)
  })
})

describe('Investigation Protocol Smoke Tests', () => {
  const agenticPath = resolve(__dirname, '../../packages/prompts/src/core/agentic-execution.ts')
  const agenticContent = readFileSync(agenticPath, 'utf-8')

  it('contains INVESTIGATION PROTOCOL section', () => {
    expect(agenticContent).toContain('INVESTIGATION PROTOCOL')
  })

  it('includes Senior Engineer mindset instruction', () => {
    expect(agenticContent).toContain('Senior Engineer')
  })

  it('includes test driven development', () => {
    expect(agenticContent.toLowerCase()).toContain('test driven development')
  })

  it('includes Sentry check', () => {
    expect(agenticContent).toContain('Sentry')
  })

  it('includes KNOWN_ISSUES check', () => {
    expect(agenticContent).toContain('KNOWN_ISSUES')
  })

  it('includes fix root causes', () => {
    expect(agenticContent.toLowerCase()).toContain('fix root causes')
  })

  it('includes test coverage before building', () => {
    expect(agenticContent.toLowerCase()).toMatch(/test coverage.*before.*build/)
  })

  it('includes prevent regressions', () => {
    expect(agenticContent.toLowerCase()).toMatch(/prevent.*regression/)
  })

  it('includes queued/background task check', () => {
    expect(agenticContent.toLowerCase()).toMatch(/queue|background.*task/)
  })
})

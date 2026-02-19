/**
 * User Message Whitespace Preservation Tests (TDD)
 *
 * Root cause: User messages rendered with <p className="text-sm">
 * which collapses all whitespace and newlines into single spaces.
 * Multi-paragraph user input displays as one continuous block.
 *
 * Fix: Add whitespace-pre-wrap to user message rendering so line
 * breaks typed/pasted by the user are preserved in the display.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const appPath = resolve(__dirname, '../../renderer/src/App.tsx')
const appContent = readFileSync(appPath, 'utf-8')

describe('User Message Whitespace Preservation', () => {
  it('user message text must use whitespace-pre-wrap', () => {
    expect(appContent).toMatch(/whitespace-pre-wrap.*message\.content|message\.content.*whitespace-pre-wrap/)
  })

  it('user message must NOT use plain <p> without whitespace preservation', () => {
    const plainPMatch = appContent.match(/<p\s+className="text-sm">\{message\.content\}<\/p>/)
    expect(plainPMatch).toBeNull()
  })

  it('user message rendering must preserve newlines from textarea input', () => {
    expect(appContent).toMatch(/pre-wrap|pre-line|whitespace/)
  })
})

describe('Investigation Protocol in System Prompt', () => {
  const agenticPath = resolve(__dirname, '../../packages/prompts/src/core/agentic-execution.ts')
  const agenticContent = readFileSync(agenticPath, 'utf-8')

  it('should include investigation-before-code instruction', () => {
    expect(agenticContent.toLowerCase()).toMatch(/investigation.*before.*writing|investigate.*before.*cod/)
  })

  it('should include TDD instruction', () => {
    expect(agenticContent.toLowerCase()).toContain('test driven development')
  })

  it('should include fix root causes instruction', () => {
    expect(agenticContent.toLowerCase()).toMatch(/fix root cause|root cause.*not.*workaround/)
  })

  it('should include Sentry check instruction', () => {
    expect(agenticContent.toLowerCase()).toContain('sentry')
  })

  it('should include test coverage before building', () => {
    expect(agenticContent.toLowerCase()).toMatch(/test coverage.*before.*build|coverage.*before.*build/)
  })

  it('should include regression prevention', () => {
    expect(agenticContent.toLowerCase()).toMatch(/prevent.*regression|fix.*regression/)
  })

  it('should include known issues check', () => {
    expect(agenticContent).toContain('KNOWN_ISSUES')
  })
})

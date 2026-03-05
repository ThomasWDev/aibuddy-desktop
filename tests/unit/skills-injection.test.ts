import { describe, it, expect } from 'vitest'
import { generateSystemPrompt } from '../../packages/prompts/src/system-prompt'

// ---------------------------------------------------------------------------
// KAN-283: Unit tests for skills injection via generateSystemPrompt.
// Imports the REAL function — never duplicates code.
// ---------------------------------------------------------------------------

describe('generateSystemPrompt — skills injection', () => {
  it('returns a prompt without skills section when no projectRules', () => {
    const result = generateSystemPrompt({ workspacePath: '/tmp/test' })
    expect(result).not.toContain('ACTIVE PROJECT SKILLS')
  })

  it('returns a prompt without skills section when projectRules is empty', () => {
    const result = generateSystemPrompt({ projectRules: [] })
    expect(result).not.toContain('ACTIVE PROJECT SKILLS')
  })

  it('injects alwaysApply rules into the prompt', () => {
    const result = generateSystemPrompt({
      projectRules: [
        { filename: 'test.md', description: 'Test Skill', alwaysApply: true, content: 'Always use vitest for tests.' },
      ]
    })
    expect(result).toContain('ACTIVE PROJECT SKILLS (1)')
    expect(result).toContain('[Skill] Test Skill')
    expect(result).toContain('Always use vitest for tests.')
  })

  it('does NOT inject rules where alwaysApply is false/undefined', () => {
    const result = generateSystemPrompt({
      projectRules: [
        { filename: 'optional.md', description: 'Optional Skill', alwaysApply: false, content: 'This should not be injected.' },
        { filename: 'no-flag.md', content: 'Also not injected.' },
      ]
    })
    expect(result).not.toContain('ACTIVE PROJECT SKILLS')
    expect(result).not.toContain('Optional Skill')
    expect(result).not.toContain('Also not injected.')
  })

  it('injects multiple active rules in order', () => {
    const result = generateSystemPrompt({
      projectRules: [
        { filename: 'a.md', description: 'Skill A', alwaysApply: true, content: 'Rule A content' },
        { filename: 'b.md', description: 'Skill B', alwaysApply: true, content: 'Rule B content' },
        { filename: 'c.md', description: 'Skill C', alwaysApply: false, content: 'Should not appear' },
      ]
    })
    expect(result).toContain('ACTIVE PROJECT SKILLS (2)')
    expect(result).toContain('[Skill] Skill A')
    expect(result).toContain('[Skill] Skill B')
    expect(result).not.toContain('Should not appear')

    const idxA = result.indexOf('Skill A')
    const idxB = result.indexOf('Skill B')
    expect(idxA).toBeLessThan(idxB)
  })

  it('falls back to filename when description is missing', () => {
    const result = generateSystemPrompt({
      projectRules: [
        { filename: 'my-rule.md', alwaysApply: true, content: 'Some content' },
      ]
    })
    expect(result).toContain('[Skill] my-rule.md')
  })

  it('still includes identity, TDD methodology, and other sections', () => {
    const result = generateSystemPrompt({
      projectRules: [
        { filename: 'test.md', alwaysApply: true, content: 'Test rule' },
      ]
    })
    expect(result).toContain('AIBuddy')
    expect(result).toContain('TDD')
  })
})

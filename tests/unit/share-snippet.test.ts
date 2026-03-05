import { describe, it, expect } from 'vitest'
import { formatAsShareSnippet, type ShareMessage } from '../../renderer/src/utils/share-formatting'

// ---------------------------------------------------------------------------
// KAN-279: Unit tests for formatAsShareSnippet utility
// Imports the REAL function — never duplicates code.
// ---------------------------------------------------------------------------

describe('formatAsShareSnippet', () => {
  it('returns empty string for no messages', () => {
    expect(formatAsShareSnippet([])).toBe('')
  })

  it('uses first user message as preview', () => {
    const msgs: ShareMessage[] = [
      { role: 'user', content: 'How do I write a fibonacci function?' },
      { role: 'assistant', content: 'Here is a fibonacci function...' },
    ]
    const result = formatAsShareSnippet(msgs)
    expect(result).toContain('fibonacci')
    expect(result).toContain('Shared via AIBuddy')
  })

  it('includes hashtags', () => {
    const msgs: ShareMessage[] = [
      { role: 'user', content: 'Hello' },
    ]
    const result = formatAsShareSnippet(msgs)
    expect(result).toContain('#AI')
    expect(result).toContain('#DeveloperTools')
  })

  it('truncates long messages to ~200 chars + ellipsis', () => {
    const longText = 'A'.repeat(300)
    const msgs: ShareMessage[] = [
      { role: 'user', content: longText },
    ]
    const result = formatAsShareSnippet(msgs)
    expect(result).toContain('...')
    expect(result.length).toBeLessThan(350)
  })

  it('falls back to threadTitle when no user message exists', () => {
    const msgs: ShareMessage[] = [
      { role: 'assistant', content: 'Welcome!' },
    ]
    const result = formatAsShareSnippet(msgs, 'My Cool Thread')
    expect(result).toContain('My Cool Thread')
  })

  it('wraps the preview in quotes', () => {
    const msgs: ShareMessage[] = [
      { role: 'user', content: 'test message' },
    ]
    const result = formatAsShareSnippet(msgs)
    expect(result).toContain('"test message"')
  })
})

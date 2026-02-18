import { describe, it, expect } from 'vitest'
import {
  formatAsText,
  formatAsMarkdown,
  sanitizeFilename,
  exportAsJSON,
  type ShareMessage
} from '../../renderer/src/utils/share-formatting'

/**
 * Share Link Regression & Export Tests — KAN-18 + KAN-49 prep
 * 
 * ROOT CAUSE: Previous ShareModal generated fake URLs (https://aibuddy.life/share/${randomId})
 * with no backend. Users got 404 errors on shared links.
 * 
 * FIX: Removed fake link generation. Kept copy/export which work locally.
 * Shareable link generation is tracked as KAN-49 (requires backend API).
 * 
 * RULE: All formatting functions are imported from utils/share-formatting.ts.
 *       Tests MUST use the real source functions — NEVER copy them.
 */

const mockMessages: ShareMessage[] = [
  { role: 'user', content: 'How do I sort an array in Python?' },
  { role: 'assistant', content: 'You can use `sorted()` or `.sort()` method.\n\n```python\nmy_list = [3, 1, 2]\nsorted_list = sorted(my_list)\n```' },
  { role: 'user', content: 'What about reverse sort?' },
  { role: 'assistant', content: 'Use `reverse=True` parameter:\n\n```python\nsorted(my_list, reverse=True)\n```' },
]

const threadTitle = 'Python Sorting Help'

describe('KAN-18 Regression: No Fake Share Link Generation', () => {
  it('should NOT produce URLs containing aibuddy.life/share/', () => {
    const textOutput = formatAsText(mockMessages, threadTitle)
    const mdOutput = formatAsMarkdown(mockMessages, threadTitle, mockMessages.length)
    
    expect(textOutput).not.toContain('aibuddy.life/share/')
    expect(mdOutput).not.toContain('aibuddy.life/share/')
  })

  it('should NOT contain any http/https URLs in exported text', () => {
    const textOutput = formatAsText(mockMessages, threadTitle)
    expect(textOutput).not.toMatch(/https?:\/\/aibuddy\.life\/share\//)
  })

  it('ShareModal.tsx should not contain fake link generation code', () => {
    const fs = require('fs')
    const path = require('path')
    const shareModalPath = path.resolve(__dirname, '../../renderer/src/components/ShareModal.tsx')
    const content = fs.readFileSync(shareModalPath, 'utf-8')
    
    // Strip comments before checking — the JSDoc mentions the old URL as context
    const codeOnly = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '')
    
    expect(codeOnly).not.toContain('createShareLink')
    expect(codeOnly).not.toContain('aibuddy.life/share/')
    expect(codeOnly).not.toContain('crypto.randomUUID')
  })
})

describe('KAN-18: Markdown Export Format Correctness', () => {
  it('should include thread title as H1 heading', () => {
    const md = formatAsMarkdown(mockMessages, threadTitle, mockMessages.length)
    expect(md).toMatch(/^# Python Sorting Help/)
  })

  it('should include export date in metadata', () => {
    const md = formatAsMarkdown(mockMessages, threadTitle, mockMessages.length)
    expect(md).toContain('Exported on')
    expect(md).toContain(`${mockMessages.length} messages`)
  })

  it('should use H3 for role labels', () => {
    const md = formatAsMarkdown(mockMessages, threadTitle, mockMessages.length)
    expect(md).toContain('### **You**')
    expect(md).toContain('### **AIBuddy**')
  })

  it('should preserve code blocks in messages', () => {
    const md = formatAsMarkdown(mockMessages, threadTitle, mockMessages.length)
    expect(md).toContain('```python')
    expect(md).toContain('sorted(my_list)')
  })

  it('should separate messages with horizontal rules', () => {
    const md = formatAsMarkdown(mockMessages, threadTitle, mockMessages.length)
    const hrCount = (md.match(/\n---\n/g) || []).length
    expect(hrCount).toBeGreaterThanOrEqual(3)
  })

  it('should handle empty messages without error', () => {
    const md = formatAsMarkdown([], 'Empty Chat', 0)
    expect(md).toBe('')
  })

  it('should use default title when none provided', () => {
    const md = formatAsMarkdown(mockMessages, '', mockMessages.length)
    expect(md).toContain('# ')
  })
})

describe('KAN-18: Plain Text Export Format', () => {
  it('should include title with separator line', () => {
    const text = formatAsText(mockMessages, threadTitle)
    expect(text).toContain('Python Sorting Help')
    expect(text).toContain('='.repeat(40))
  })

  it('should label user messages as "You"', () => {
    const text = formatAsText(mockMessages, threadTitle)
    expect(text).toContain('You:\nHow do I sort an array')
  })

  it('should label assistant messages as "AIBuddy"', () => {
    const text = formatAsText(mockMessages, threadTitle)
    expect(text).toContain('AIBuddy:\nYou can use')
  })

  it('should handle empty messages without error', () => {
    const text = formatAsText([], 'Empty')
    expect(text).toBe('')
  })
})

describe('KAN-18: Filename Sanitization (imported from source)', () => {
  it('should replace special characters with hyphens', () => {
    expect(sanitizeFilename('Hello World!')).toBe('hello-world-')
  })

  it('should lowercase the filename', () => {
    expect(sanitizeFilename('My PYTHON Chat')).toBe('my-python-chat')
  })

  it('should truncate to 50 characters', () => {
    const longTitle = 'A'.repeat(100)
    expect(sanitizeFilename(longTitle).length).toBeLessThanOrEqual(50)
  })

  it('should use fallback for empty title', () => {
    expect(sanitizeFilename('')).toBe('aibuddy-conversation')
  })

  it('should handle unicode characters', () => {
    const result = sanitizeFilename('Código Python 🐍')
    expect(result).toMatch(/^[a-z0-9-]+$/)
  })

  it('should handle path-like characters safely', () => {
    const result = sanitizeFilename('../../../etc/passwd')
    expect(result).not.toContain('/')
    expect(result).not.toContain('..')
  })
})

describe('KAN-49 Prep: JSON Export Structure (imported from source)', () => {
  it('should include version field', () => {
    const json = exportAsJSON(mockMessages, threadTitle)
    expect(json.version).toBe('1.0')
  })

  it('should include exportedAt ISO timestamp', () => {
    const json = exportAsJSON(mockMessages, threadTitle)
    expect(json.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('should include all messages with correct roles', () => {
    const json = exportAsJSON(mockMessages, threadTitle)
    expect(json.messages).toHaveLength(4)
    expect(json.messages[0].role).toBe('user')
    expect(json.messages[1].role).toBe('assistant')
  })

  it('should preserve message content including code blocks', () => {
    const json = exportAsJSON(mockMessages, threadTitle)
    expect(json.messages[1].content).toContain('```python')
  })

  it('should include messageCount matching array length', () => {
    const json = exportAsJSON(mockMessages, threadTitle)
    expect(json.messageCount).toBe(json.messages.length)
  })

  it('should handle empty messages', () => {
    const json = exportAsJSON([], 'Empty')
    expect(json.messages).toHaveLength(0)
    expect(json.messageCount).toBe(0)
  })
})

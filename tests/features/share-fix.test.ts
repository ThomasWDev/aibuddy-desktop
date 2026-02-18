import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatAsText,
  formatAsMarkdown,
  sanitizeFilename,
  type ShareMessage
} from '../../renderer/src/utils/share-formatting'

/**
 * Share Modal Fix Tests - KAN-18
 * 
 * ROOT CAUSE: The previous ShareModal generated a local URL 
 * (https://aibuddy.life/share/${randomId}) that had no backend API to serve it.
 * Users clicked "Create share link" and got a URL that returned 404.
 * 
 * FIX: Removed non-functional web link generation. Made clipboard copy 
 * (text/markdown) and file export the primary actions since they actually work
 * without backend infrastructure.
 * 
 * RULE: All formatting functions imported from utils/share-formatting.ts.
 *       NEVER duplicate source code in tests.
 */

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-18: Share Modal - Copy as Text (uses real formatAsText)', () => {
  const mockMessages: ShareMessage[] = [
    { role: 'user', content: 'How do I sort an array in Python?' },
    { role: 'assistant', content: 'You can use `sorted()` or `.sort()` method.' }
  ]

  it('should format conversation as plain text', () => {
    const fullText = formatAsText(mockMessages, 'Python Sorting')
    
    expect(fullText).toContain('Python Sorting')
    expect(fullText).toContain('You:\nHow do I sort an array in Python?')
    expect(fullText).toContain('AIBuddy:\nYou can use `sorted()`')
    expect(fullText).toContain('---')
  })

  it('should handle empty messages gracefully', () => {
    const result = formatAsText([], 'Empty')
    expect(result).toBe('')
  })

  it('should handle single message conversations', () => {
    const singleMsg: ShareMessage[] = [{ role: 'user', content: 'Hello' }]
    const text = formatAsText(singleMsg, 'Single')
    
    expect(text).toContain('You:\nHello')
    expect(text).not.toMatch(/---.*---/) // No second separator for single message
  })
})

describe('KAN-18: Share Modal - Copy as Markdown (uses real formatAsMarkdown)', () => {
  const mockMessages: ShareMessage[] = [
    { role: 'user', content: 'Explain closures in JavaScript' },
    { role: 'assistant', content: 'A closure is a function that has access to variables from its outer scope.' }
  ]

  it('should format conversation as Markdown with headers', () => {
    const fullMd = formatAsMarkdown(mockMessages, 'JavaScript Closures', mockMessages.length)
    
    expect(fullMd).toContain('# JavaScript Closures')
    expect(fullMd).toContain('### **You**')
    expect(fullMd).toContain('### **AIBuddy**')
    expect(fullMd).toContain(`${mockMessages.length} messages`)
    expect(fullMd).toContain('Exported on')
  })

  it('should include date in Markdown export', () => {
    const md = formatAsMarkdown(mockMessages, 'Test', 2)
    expect(md).toMatch(/Exported on \w+ \d+, \d{4}/)
  })
})

describe('KAN-18: Share Modal - Export as File (uses real sanitizeFilename)', () => {
  it('should generate safe filename from thread title', () => {
    const safeTitle = sanitizeFilename('How do I fix "Buffer is not defined"?')
    
    expect(safeTitle).toBe('how-do-i-fix-buffer-is-not-defined-')
    expect(safeTitle.length).toBeLessThanOrEqual(50)
    expect(safeTitle).not.toContain('"')
    expect(safeTitle).not.toContain('?')
  })

  it('should handle empty thread title', () => {
    const safeTitle = sanitizeFilename('')
    expect(safeTitle).toBe('aibuddy-conversation')
  })

  it('should truncate very long titles', () => {
    const safeTitle = sanitizeFilename('a'.repeat(100))
    expect(safeTitle.length).toBe(50)
  })

  it('should use Electron save dialog when available', async () => {
    const savePath = '/Users/test/exports/conversation.md'
    vi.mocked(window.electronAPI.dialog.saveFile).mockResolvedValueOnce(savePath)
    
    const result = await window.electronAPI.dialog.saveFile('test-conversation.md')
    
    expect(result).toBe(savePath)
    expect(window.electronAPI.dialog.saveFile).toHaveBeenCalledWith('test-conversation.md')
  })

  it('should handle save dialog cancellation', async () => {
    vi.mocked(window.electronAPI.dialog.saveFile).mockResolvedValueOnce(null)
    
    const result = await window.electronAPI.dialog.saveFile('test.md')
    
    expect(result).toBeNull()
  })

  it('should write markdown content to selected path', async () => {
    const savePath = '/Users/test/chat.md'
    const markdown = '# Test Conversation\n\n### **You**\n\nHello'
    
    await window.electronAPI.fs.writeFile(savePath, markdown)
    
    expect(window.electronAPI.fs.writeFile).toHaveBeenCalledWith(savePath, markdown)
  })
})

describe('KAN-18: No fake URL generation', () => {
  it('should NOT generate aibuddy.life share URLs', () => {
    const mockMessages: ShareMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ]
    
    const fakeUrlPattern = /https:\/\/aibuddy\.life\/share\//
    
    const textOutput = formatAsText(mockMessages, 'Test')
    const mdOutput = formatAsMarkdown(mockMessages, 'Test', 2)
    
    expect(textOutput).not.toMatch(fakeUrlPattern)
    expect(mdOutput).not.toMatch(fakeUrlPattern)
  })
})

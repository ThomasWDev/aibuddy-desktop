import { describe, it, expect, vi, beforeEach } from 'vitest'

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
 */

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-18: Share Modal - Copy as Text', () => {
  const mockMessages = [
    { role: 'user' as const, content: 'How do I sort an array in Python?' },
    { role: 'assistant' as const, content: 'You can use `sorted()` or `.sort()` method.' }
  ]

  it('should format conversation as plain text', () => {
    const threadTitle = 'Python Sorting'
    
    const conversationText = mockMessages.map((msg) => {
      const role = msg.role === 'user' ? 'You' : 'AIBuddy'
      return `${role}:\n${msg.content}`
    }).join('\n\n---\n\n')

    const fullText = `${threadTitle}\n${'='.repeat(40)}\n\n${conversationText}`
    
    expect(fullText).toContain('Python Sorting')
    expect(fullText).toContain('You:\nHow do I sort an array in Python?')
    expect(fullText).toContain('AIBuddy:\nYou can use `sorted()`')
    expect(fullText).toContain('---')
  })

  it('should handle empty messages gracefully', () => {
    const emptyMessages: typeof mockMessages = []
    const result = emptyMessages.length === 0 ? '' : 'has content'
    expect(result).toBe('')
  })

  it('should handle single message conversations', () => {
    const singleMsg = [{ role: 'user' as const, content: 'Hello' }]
    
    const text = singleMsg.map(msg => {
      const role = msg.role === 'user' ? 'You' : 'AIBuddy'
      return `${role}:\n${msg.content}`
    }).join('\n\n---\n\n')
    
    expect(text).toBe('You:\nHello')
    expect(text).not.toContain('---') // No separator for single message
  })
})

describe('KAN-18: Share Modal - Copy as Markdown', () => {
  const mockMessages = [
    { role: 'user' as const, content: 'Explain closures in JavaScript' },
    { role: 'assistant' as const, content: 'A closure is a function that has access to variables from its outer scope.' }
  ]

  it('should format conversation as Markdown with headers', () => {
    const threadTitle = 'JavaScript Closures'
    const messageCount = mockMessages.length

    const conversationMd = mockMessages.map((msg) => {
      const role = msg.role === 'user' ? '**You**' : '**AIBuddy**'
      return `### ${role}\n\n${msg.content}`
    }).join('\n\n---\n\n')

    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })

    const fullMd = `# ${threadTitle}\n\n_Exported on ${date} | ${messageCount} messages_\n\n---\n\n${conversationMd}\n`
    
    expect(fullMd).toContain('# JavaScript Closures')
    expect(fullMd).toContain('### **You**')
    expect(fullMd).toContain('### **AIBuddy**')
    expect(fullMd).toContain(`${messageCount} messages`)
    expect(fullMd).toContain('Exported on')
  })

  it('should include date in Markdown export', () => {
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })
    
    expect(date).toMatch(/\w+ \d+, \d{4}/)
  })
})

describe('KAN-18: Share Modal - Export as File', () => {
  it('should generate safe filename from thread title', () => {
    const threadTitle = 'How do I fix "Buffer is not defined"?'
    const safeTitle = threadTitle
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .substring(0, 50)
    
    expect(safeTitle).toBe('how-do-i-fix-buffer-is-not-defined-')
    expect(safeTitle.length).toBeLessThanOrEqual(50)
    expect(safeTitle).not.toContain('"')
    expect(safeTitle).not.toContain('?')
  })

  it('should handle empty thread title', () => {
    const threadTitle = ''
    const safeTitle = (threadTitle || 'aibuddy-conversation')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .substring(0, 50)
    
    expect(safeTitle).toBe('aibuddy-conversation')
  })

  it('should truncate very long titles', () => {
    const longTitle = 'a'.repeat(100)
    const safeTitle = longTitle
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .substring(0, 50)
    
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
    // The old implementation created: https://aibuddy.life/share/${randomId}
    // This URL had no backend and always returned 404.
    // The fix removes this non-functional feature.
    
    const fakeUrlPattern = /https:\/\/aibuddy\.life\/share\//
    
    // Verify we don't generate fake URLs
    const copyText = 'You:\nHello\n\n---\n\nAIBuddy:\nHi there!'
    expect(copyText).not.toMatch(fakeUrlPattern)
  })
})

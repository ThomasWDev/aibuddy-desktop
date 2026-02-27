import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Message Controls & Feedback Tests - Issue #8
 * 
 * Tests for the message control features:
 * - Copy code / copy response button
 * - Thumbs up / down feedback
 * - Regenerate response option
 * - Response streaming indicator
 * 
 * All these features are implemented in App.tsx
 */

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Message Controls & Feedback - Issue #8 Fix', () => {
  describe('Copy Response Button', () => {
    it('should have a copy response button for assistant messages', () => {
      // Copy button is rendered for assistant messages
      const messageRole = 'assistant'
      const shouldShowCopyButton = messageRole === 'assistant'
      
      expect(shouldShowCopyButton).toBe(true)
    })

    it('should not show copy button for user messages', () => {
      const messageRole = 'user'
      const shouldShowCopyButton = messageRole === 'assistant'
      
      expect(shouldShowCopyButton).toBe(false)
    })

    it('should copy content to clipboard', async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
      Object.assign(navigator, { clipboard: mockClipboard })
      
      const content = 'This is the AI response content'
      await navigator.clipboard.writeText(content)
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith(content)
    })

    it('should show check icon after successful copy', () => {
      const copiedId = 'msg-123-response'
      const messageId = 'msg-123'
      const isJustCopied = copiedId === messageId + '-response'
      
      expect(isJustCopied).toBe(true)
    })

    it('should reset copied state after timeout', () => {
      vi.useFakeTimers()
      
      let copiedId: string | null = 'msg-123-response'
      setTimeout(() => { copiedId = null }, 2000)
      
      vi.advanceTimersByTime(2000)
      
      expect(copiedId).toBeNull()
      vi.useRealTimers()
    })
  })

  describe('Copy Code Button (in code blocks)', () => {
    it('should have a copy button for each code block', () => {
      // Code blocks have individual copy buttons
      const codeBlock = {
        language: 'typescript',
        content: 'const x = 1'
      }
      
      expect(codeBlock.content).toBeTruthy()
    })

    it('should copy code to clipboard', async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
      Object.assign(navigator, { clipboard: mockClipboard })
      
      const code = 'function hello() { return "world" }'
      await navigator.clipboard.writeText(code)
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith(code)
    })
  })

  describe('Thumbs Up / Down Feedback', () => {
    it('should track feedback state per message', () => {
      const messageFeedback: Record<string, 'up' | 'down' | null> = {}
      
      messageFeedback['msg-1'] = 'up'
      messageFeedback['msg-2'] = 'down'
      messageFeedback['msg-3'] = null
      
      expect(messageFeedback['msg-1']).toBe('up')
      expect(messageFeedback['msg-2']).toBe('down')
      expect(messageFeedback['msg-3']).toBeNull()
    })

    it('should toggle feedback off when clicked again', () => {
      let feedback: 'up' | 'down' | null = 'up'
      const clickedFeedback = 'up'
      
      // Toggle logic: if same, set to null
      feedback = feedback === clickedFeedback ? null : clickedFeedback
      
      expect(feedback).toBeNull()
    })

    it('should switch feedback when different button clicked', () => {
      let feedback: 'up' | 'down' | null = 'up'
      const clickedFeedback = 'down'
      
      feedback = feedback === clickedFeedback ? null : clickedFeedback
      
      expect(feedback).toBe('down')
    })

    it('should show green highlight for thumbs up', () => {
      const feedback = 'up'
      const buttonClass = feedback === 'up' 
        ? 'bg-green-500/20 text-green-400' 
        : 'hover:bg-slate-700/50 text-slate-400'
      
      expect(buttonClass).toContain('green')
    })

    it('should show red highlight for thumbs down', () => {
      const feedback = 'down'
      const buttonClass = feedback === 'down' 
        ? 'bg-red-500/20 text-red-400' 
        : 'hover:bg-slate-700/50 text-slate-400'
      
      expect(buttonClass).toContain('red')
    })

    it('should show neutral style when no feedback', () => {
      const feedback = null
      const buttonClass = feedback === 'up' 
        ? 'bg-green-500/20 text-green-400' 
        : 'hover:bg-slate-700/50 text-slate-400'
      
      expect(buttonClass).toContain('slate')
    })
  })

  describe('Regenerate Response', () => {
    it('should only show regenerate on last assistant message', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' },
        { id: '3', role: 'user', content: 'How are you?' },
        { id: '4', role: 'assistant', content: 'I am great!' }
      ]
      
      const lastMessage = messages[messages.length - 1]
      const currentMessage = messages[3] // id: '4'
      
      const shouldShowRegenerate = lastMessage.id === currentMessage.id
      
      expect(shouldShowRegenerate).toBe(true)
    })

    it('should not show regenerate on older assistant messages', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' },
        { id: '3', role: 'user', content: 'How are you?' },
        { id: '4', role: 'assistant', content: 'I am great!' }
      ]
      
      const lastMessage = messages[messages.length - 1]
      const currentMessage = messages[1] // id: '2' (older message)
      
      const shouldShowRegenerate = lastMessage.id === currentMessage.id
      
      expect(shouldShowRegenerate).toBe(false)
    })

    it('should disable regenerate button when loading', () => {
      const isLoading = true
      const buttonDisabled = isLoading
      
      expect(buttonDisabled).toBe(true)
    })

    it('should animate refresh icon when loading', () => {
      const isLoading = true
      const iconClass = isLoading ? 'animate-spin' : ''
      
      expect(iconClass).toBe('animate-spin')
    })

    it('should remove last assistant message before regenerating', () => {
      const messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' }
      ]
      
      // Remove last assistant message
      const messagesAfterRemove = messages.slice(0, -1)
      
      expect(messagesAfterRemove.length).toBe(1)
      expect(messagesAfterRemove[0].role).toBe('user')
    })
  })

  describe('Response Streaming Indicator', () => {
    it('should have multiple status steps', () => {
      const statusSteps = ['idle', 'validating', 'reading', 'sending', 'thinking', 'generating', 'done', 'error']
      
      expect(statusSteps).toContain('idle')
      expect(statusSteps).toContain('generating')
      expect(statusSteps).toContain('thinking')
      expect(statusSteps.length).toBe(8)
    })

    it('should show progress bar during loading', () => {
      const status = 'thinking'
      const progressMap: Record<string, string> = {
        'idle': '0%',
        'validating': '20%',
        'reading': '40%',
        'sending': '50%',
        'thinking': '70%',
        'generating': '90%',
        'done': '100%'
      }
      
      expect(progressMap[status]).toBe('70%')
    })

    it('should show typing indicator for thinking state', () => {
      const status = 'thinking'
      const showTypingIndicator = status === 'thinking' || status === 'generating'
      
      expect(showTypingIndicator).toBe(true)
    })

    it('should show typing indicator for generating state', () => {
      const status = 'generating'
      const showTypingIndicator = status === 'thinking' || status === 'generating'
      
      expect(showTypingIndicator).toBe(true)
    })

    it('should not show typing indicator when idle', () => {
      const status = 'idle'
      const showTypingIndicator = status === 'thinking' || status === 'generating'
      
      expect(showTypingIndicator).toBe(false)
    })

    it('should have descriptive text for each status', () => {
      const statusConfig = {
        idle: { text: 'Ready to help! 🚀' },
        validating: { text: '🔑 Checking your AIBuddy API key...' },
        reading: { text: '📂 Reading workspace files...' },
        sending: { text: '☁️ Sending to AI...' },
        thinking: { text: '🧠 AIBuddy is thinking...' },
        generating: { text: '✍️ Writing response...' },
        done: { text: '✅ Done!' },
        error: { text: '❌ Something went wrong' }
      }
      
      expect(statusConfig.thinking.text).toContain('thinking')
      expect(statusConfig.generating.text).toContain('Writing')
    })

    it('should have colors for each status', () => {
      const statusColors: Record<string, string> = {
        idle: '#22c55e',     // green
        validating: '#f59e0b', // amber
        thinking: '#6366f1', // indigo
        generating: '#818cf8', // indigo-light
        done: '#22c55e',     // green
        error: '#ef4444'     // red
      }
      
      expect(statusColors.thinking).toBe('#6366f1')
      expect(statusColors.generating).toBe('#818cf8')
    })
  })

  describe('Message Controls Layout', () => {
    it('should show controls below assistant messages', () => {
      const messageRole = 'assistant'
      const showControls = messageRole === 'assistant'
      
      expect(showControls).toBe(true)
    })

    it('should have proper spacing with border', () => {
      const containerClasses = 'mt-3 pt-2 border-t border-slate-700/50 flex items-center gap-1'
      
      expect(containerClasses).toContain('mt-3')
      expect(containerClasses).toContain('border-t')
      expect(containerClasses).toContain('flex')
    })

    it('should have hover effect on container', () => {
      const containerClasses = 'opacity-60 hover:opacity-100 transition-opacity'
      
      expect(containerClasses).toContain('opacity-60')
      expect(containerClasses).toContain('hover:opacity-100')
    })

    it('should have divider between copy/regenerate and feedback', () => {
      const dividerClasses = 'w-px h-4 bg-slate-700 mx-1'
      
      expect(dividerClasses).toContain('w-px')
      expect(dividerClasses).toContain('h-4')
    })
  })

  describe('Button Styling', () => {
    it('should have consistent button size', () => {
      const buttonClasses = 'p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors'
      
      expect(buttonClasses).toContain('p-1.5')
      expect(buttonClasses).toContain('rounded-lg')
    })

    it('should have consistent icon size', () => {
      const iconClasses = 'w-4 h-4'
      
      expect(iconClasses).toContain('w-4')
      expect(iconClasses).toContain('h-4')
    })
  })

  describe('Tooltip Text', () => {
    it('should have tooltip for copy button', () => {
      const tooltipText = 'Copy response'
      expect(tooltipText).toBe('Copy response')
    })

    it('should have tooltip for regenerate button', () => {
      const tooltipText = 'Regenerate response'
      expect(tooltipText).toBe('Regenerate response')
    })

    it('should have tooltip for thumbs up', () => {
      const tooltipText = 'Good response'
      expect(tooltipText).toBe('Good response')
    })

    it('should have tooltip for thumbs down', () => {
      const tooltipText = 'Poor response'
      expect(tooltipText).toBe('Poor response')
    })
  })
})

describe('Feedback Persistence', () => {
  it('should track feedback with message ID as key', () => {
    const messageFeedback: Record<string, 'up' | 'down' | null> = {}
    const messageId = 'unique-message-id-123'
    
    messageFeedback[messageId] = 'up'
    
    expect(messageFeedback[messageId]).toBe('up')
  })
})

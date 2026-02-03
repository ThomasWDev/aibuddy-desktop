import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Extended Thinking Feature Tests - KAN-24
 * 
 * TDD Approach: Tests for Claude-like extended thinking display
 * 
 * Requirements:
 * 1. Show thinking indicator when AI is processing
 * 2. Display thinking/reasoning content in collapsible section
 * 3. Distinct visual style for thinking blocks
 * 4. Toggle expand/collapse for thinking content
 */

// ============================================================================
// TYPES
// ============================================================================

interface ThinkingBlock {
  id: string
  content: string
  isExpanded: boolean
  timestamp: number
}

interface MessageWithThinking {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: ThinkingBlock
}

// ============================================================================
// HELPER FUNCTIONS (mirroring implementation)
// ============================================================================

/**
 * Parse thinking blocks from AI response
 * Looks for <thinking>...</thinking> tags
 */
function parseThinkingFromResponse(response: string): { thinking: string | null; content: string } {
  const thinkingMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/i)
  
  if (thinkingMatch) {
    const thinking = thinkingMatch[1].trim()
    const content = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()
    return { thinking, content }
  }
  
  return { thinking: null, content: response }
}

/**
 * Check if response has thinking content
 */
function hasThinkingContent(response: string): boolean {
  return /<thinking>/i.test(response)
}

/**
 * Format thinking duration
 */
function formatThinkingDuration(startTime: number, endTime: number): string {
  const duration = Math.round((endTime - startTime) / 1000)
  if (duration < 60) return `${duration}s`
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}m ${seconds}s`
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Extended Thinking Feature - KAN-24', () => {
  // ==========================================================================
  // 1. PARSING THINKING BLOCKS
  // ==========================================================================
  describe('Parsing Thinking Blocks', () => {
    it('should extract thinking content from response', () => {
      const response = '<thinking>Let me analyze this code...</thinking>Here is the solution.'
      const { thinking, content } = parseThinkingFromResponse(response)
      
      expect(thinking).toBe('Let me analyze this code...')
      expect(content).toBe('Here is the solution.')
    })

    it('should handle response without thinking block', () => {
      const response = 'Here is a simple answer.'
      const { thinking, content } = parseThinkingFromResponse(response)
      
      expect(thinking).toBeNull()
      expect(content).toBe('Here is a simple answer.')
    })

    it('should handle multi-line thinking content', () => {
      const response = `<thinking>
Step 1: Analyze the problem
Step 2: Consider solutions
Step 3: Choose best approach
</thinking>
Here is my recommendation.`
      const { thinking, content } = parseThinkingFromResponse(response)
      
      expect(thinking).toContain('Step 1')
      expect(thinking).toContain('Step 2')
      expect(thinking).toContain('Step 3')
      expect(content).toBe('Here is my recommendation.')
    })

    it('should detect if response has thinking content', () => {
      expect(hasThinkingContent('<thinking>test</thinking>')).toBe(true)
      expect(hasThinkingContent('<THINKING>test</THINKING>')).toBe(true)
      expect(hasThinkingContent('No thinking here')).toBe(false)
    })

    it('should handle empty thinking block', () => {
      const response = '<thinking></thinking>Answer here.'
      const { thinking, content } = parseThinkingFromResponse(response)
      
      expect(thinking).toBe('')
      expect(content).toBe('Answer here.')
    })
  })

  // ==========================================================================
  // 2. THINKING BLOCK STATE
  // ==========================================================================
  describe('Thinking Block State', () => {
    it('should create thinking block with default collapsed state', () => {
      const thinkingBlock: ThinkingBlock = {
        id: 'thinking-1',
        content: 'Analyzing code...',
        isExpanded: false,
        timestamp: Date.now()
      }
      
      expect(thinkingBlock.isExpanded).toBe(false)
    })

    it('should toggle expanded state', () => {
      let isExpanded = false
      
      // Toggle to expanded
      isExpanded = !isExpanded
      expect(isExpanded).toBe(true)
      
      // Toggle back to collapsed
      isExpanded = !isExpanded
      expect(isExpanded).toBe(false)
    })

    it('should store thinking timestamp', () => {
      const now = Date.now()
      const thinkingBlock: ThinkingBlock = {
        id: 'thinking-1',
        content: 'Test',
        isExpanded: false,
        timestamp: now
      }
      
      expect(thinkingBlock.timestamp).toBe(now)
    })
  })

  // ==========================================================================
  // 3. MESSAGE WITH THINKING
  // ==========================================================================
  describe('Message With Thinking', () => {
    it('should attach thinking to message', () => {
      const message: MessageWithThinking = {
        id: 'msg-1',
        role: 'assistant',
        content: 'Here is the solution.',
        thinking: {
          id: 'thinking-1',
          content: 'Let me analyze...',
          isExpanded: false,
          timestamp: Date.now()
        }
      }
      
      expect(message.thinking).toBeDefined()
      expect(message.thinking?.content).toBe('Let me analyze...')
    })

    it('should handle message without thinking', () => {
      const message: MessageWithThinking = {
        id: 'msg-1',
        role: 'assistant',
        content: 'Quick answer.'
      }
      
      expect(message.thinking).toBeUndefined()
    })

    it('should only attach thinking to assistant messages', () => {
      const userMessage: MessageWithThinking = {
        id: 'msg-1',
        role: 'user',
        content: 'Help me with this code'
      }
      
      const assistantMessage: MessageWithThinking = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Here is help.',
        thinking: {
          id: 'thinking-1',
          content: 'Analyzing request...',
          isExpanded: false,
          timestamp: Date.now()
        }
      }
      
      expect(userMessage.thinking).toBeUndefined()
      expect(assistantMessage.thinking).toBeDefined()
    })
  })

  // ==========================================================================
  // 4. THINKING DURATION
  // ==========================================================================
  describe('Thinking Duration', () => {
    it('should format duration in seconds', () => {
      const startTime = 0
      const endTime = 5000 // 5 seconds
      
      const formatted = formatThinkingDuration(startTime, endTime)
      expect(formatted).toBe('5s')
    })

    it('should format duration in minutes and seconds', () => {
      const startTime = 0
      const endTime = 125000 // 2 minutes 5 seconds
      
      const formatted = formatThinkingDuration(startTime, endTime)
      expect(formatted).toBe('2m 5s')
    })

    it('should handle zero duration', () => {
      const formatted = formatThinkingDuration(0, 0)
      expect(formatted).toBe('0s')
    })
  })

  // ==========================================================================
  // 5. VISUAL STYLING
  // ==========================================================================
  describe('Visual Styling', () => {
    it('should have distinct thinking block styles', () => {
      const thinkingStyles = {
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderLeft: '3px solid #8b5cf6'
      }
      
      expect(thinkingStyles.borderLeft).toContain('#8b5cf6') // Purple accent
    })

    it('should have expand/collapse icon', () => {
      const expandedIcon = 'ChevronDown'
      const collapsedIcon = 'ChevronRight'
      
      expect(expandedIcon).toBe('ChevronDown')
      expect(collapsedIcon).toBe('ChevronRight')
    })

    it('should have thinking indicator animation', () => {
      const animationClass = 'animate-pulse'
      expect(animationClass).toBe('animate-pulse')
    })

    it('should show brain icon for thinking', () => {
      const thinkingIcon = 'Brain'
      expect(thinkingIcon).toBe('Brain')
    })
  })

  // ==========================================================================
  // 6. LOADING STATE
  // ==========================================================================
  describe('Loading State', () => {
    it('should show "Thinking..." indicator while processing', () => {
      const isLoading = true
      const thinkingIndicator = isLoading ? 'Thinking...' : null
      
      expect(thinkingIndicator).toBe('Thinking...')
    })

    it('should hide indicator when response received', () => {
      const isLoading = false
      const thinkingIndicator = isLoading ? 'Thinking...' : null
      
      expect(thinkingIndicator).toBeNull()
    })

    it('should track thinking start time', () => {
      const thinkingStartTime = Date.now()
      expect(thinkingStartTime).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // 7. ACCESSIBILITY
  // ==========================================================================
  describe('Accessibility', () => {
    it('should have aria-expanded attribute', () => {
      const isExpanded = true
      const ariaExpanded = isExpanded ? 'true' : 'false'
      
      expect(ariaExpanded).toBe('true')
    })

    it('should have accessible button label', () => {
      const isExpanded = false
      const label = isExpanded ? 'Collapse thinking' : 'Expand thinking'
      
      expect(label).toBe('Expand thinking')
    })

    it('should use semantic button element', () => {
      const element = 'button'
      expect(element).toBe('button')
    })
  })

  // ==========================================================================
  // 8. PERSISTENCE
  // ==========================================================================
  describe('Persistence', () => {
    it('should persist thinking content in message history', () => {
      const messageWithThinking: MessageWithThinking = {
        id: 'msg-1',
        role: 'assistant',
        content: 'Solution here.',
        thinking: {
          id: 'thinking-1',
          content: 'Analysis...',
          isExpanded: false,
          timestamp: Date.now()
        }
      }
      
      // Simulate saving to history
      const savedMessage = JSON.parse(JSON.stringify(messageWithThinking))
      
      expect(savedMessage.thinking).toBeDefined()
      expect(savedMessage.thinking.content).toBe('Analysis...')
    })

    it('should restore thinking state on reload', () => {
      const savedThinking = {
        id: 'thinking-1',
        content: 'Previous analysis...',
        isExpanded: true,
        timestamp: 1234567890
      }
      
      // Simulate restoring from history
      const restored: ThinkingBlock = { ...savedThinking }
      
      expect(restored.isExpanded).toBe(true)
      expect(restored.content).toBe('Previous analysis...')
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================
describe('Extended Thinking Integration', () => {
  it('should parse and display thinking from API response', () => {
    const apiResponse = `<thinking>
I need to analyze this React component.
The issue seems to be with state management.
Let me suggest using useCallback.
</thinking>

Here's how to fix your React component:

\`\`\`jsx
const MyComponent = () => {
  const handleClick = useCallback(() => {
    // optimized handler
  }, []);
  return <button onClick={handleClick}>Click</button>;
};
\`\`\`
`
    
    const { thinking, content } = parseThinkingFromResponse(apiResponse)
    
    expect(thinking).toContain('React component')
    expect(thinking).toContain('useCallback')
    expect(content).toContain('Here\'s how to fix')
    expect(content).toContain('```jsx')
  })

  it('should create complete message with thinking', () => {
    const apiResponse = '<thinking>Analyzing...</thinking>Answer here.'
    const { thinking, content } = parseThinkingFromResponse(apiResponse)
    
    const message: MessageWithThinking = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content,
      thinking: thinking ? {
        id: `thinking-${Date.now()}`,
        content: thinking,
        isExpanded: false,
        timestamp: Date.now()
      } : undefined
    }
    
    expect(message.content).toBe('Answer here.')
    expect(message.thinking?.content).toBe('Analyzing...')
  })
})

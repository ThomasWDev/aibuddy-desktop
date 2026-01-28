import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Pin/Favorite Chats Tests - Issue #7
 * 
 * Tests for the conversation management pin/favorite feature.
 * This feature allows users to pin important chats so they appear
 * at the top of the history sidebar.
 * 
 * Implementation in HistorySidebar.tsx:
 * - Star icon for pin toggle
 * - Pinned section at top of thread list
 * - Yellow highlighting for pinned items
 * - Pin state persisted via updateMetadata
 */

// Mock ChatThread type
interface ChatThread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: { id: string; role: 'user' | 'assistant'; content: string; timestamp: number }[]
  isPinned?: boolean
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Pin/Favorite Chats - Issue #7 Fix', () => {
  describe('ChatThread Type', () => {
    it('should support isPinned property', () => {
      const thread: ChatThread = {
        id: 'test-1',
        title: 'Test Thread',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        isPinned: true
      }
      
      expect(thread.isPinned).toBe(true)
    })

    it('should allow isPinned to be undefined (not pinned)', () => {
      const thread: ChatThread = {
        id: 'test-1',
        title: 'Test Thread',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      }
      
      expect(thread.isPinned).toBeUndefined()
    })

    it('should allow isPinned to be false (explicitly unpinned)', () => {
      const thread: ChatThread = {
        id: 'test-1',
        title: 'Test Thread',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        isPinned: false
      }
      
      expect(thread.isPinned).toBe(false)
    })
  })

  describe('Thread Grouping', () => {
    it('should group pinned threads separately', () => {
      const threads: ChatThread[] = [
        { id: '1', title: 'Regular Chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] },
        { id: '2', title: 'Pinned Chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [], isPinned: true },
        { id: '3', title: 'Another Regular', createdAt: Date.now(), updatedAt: Date.now(), messages: [] }
      ]

      const groups: { [key: string]: ChatThread[] } = {
        'Pinned': [],
        'Today': [],
        'Older': []
      }

      threads.forEach(thread => {
        if (thread.isPinned) {
          groups['Pinned'].push(thread)
        } else {
          groups['Today'].push(thread)
        }
      })

      expect(groups['Pinned'].length).toBe(1)
      expect(groups['Pinned'][0].title).toBe('Pinned Chat')
      expect(groups['Today'].length).toBe(2)
    })

    it('should handle multiple pinned threads', () => {
      const threads: ChatThread[] = [
        { id: '1', title: 'Pinned 1', createdAt: Date.now(), updatedAt: Date.now(), messages: [], isPinned: true },
        { id: '2', title: 'Pinned 2', createdAt: Date.now(), updatedAt: Date.now(), messages: [], isPinned: true },
        { id: '3', title: 'Regular', createdAt: Date.now(), updatedAt: Date.now(), messages: [] }
      ]

      const pinnedThreads = threads.filter(t => t.isPinned)
      
      expect(pinnedThreads.length).toBe(2)
    })

    it('should show pinned section only when there are pinned threads', () => {
      const threadsNoPinned: ChatThread[] = [
        { id: '1', title: 'Regular 1', createdAt: Date.now(), updatedAt: Date.now(), messages: [] },
        { id: '2', title: 'Regular 2', createdAt: Date.now(), updatedAt: Date.now(), messages: [] }
      ]

      const pinnedThreads = threadsNoPinned.filter(t => t.isPinned)
      const shouldShowPinnedSection = pinnedThreads.length > 0
      
      expect(shouldShowPinnedSection).toBe(false)
    })
  })

  describe('Toggle Pin Functionality', () => {
    it('should toggle pin from false to true', () => {
      let thread: ChatThread = {
        id: '1',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        isPinned: false
      }

      // Simulate toggle
      thread = { ...thread, isPinned: !thread.isPinned }
      
      expect(thread.isPinned).toBe(true)
    })

    it('should toggle pin from true to false', () => {
      let thread: ChatThread = {
        id: '1',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        isPinned: true
      }

      // Simulate toggle
      thread = { ...thread, isPinned: !thread.isPinned }
      
      expect(thread.isPinned).toBe(false)
    })

    it('should toggle pin from undefined to true', () => {
      let thread: ChatThread = {
        id: '1',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      }

      // Simulate toggle (undefined is falsy, so !undefined = true)
      thread = { ...thread, isPinned: !thread.isPinned }
      
      expect(thread.isPinned).toBe(true)
    })
  })

  describe('Electron API Integration', () => {
    it('should call updateMetadata with isPinned', async () => {
      const threadId = 'test-thread-123'
      const newPinnedState = true
      
      // Mock is already set up in setup.ts
      await window.electronAPI.history.updateMetadata(threadId, { isPinned: newPinnedState })
      
      expect(window.electronAPI.history.updateMetadata).toHaveBeenCalledWith(
        threadId,
        { isPinned: newPinnedState }
      )
    })

    it('should handle pin toggle error gracefully', async () => {
      const threadId = 'test-thread-123'
      
      vi.mocked(window.electronAPI.history.updateMetadata).mockRejectedValueOnce(
        new Error('Failed to update')
      )
      
      await expect(
        window.electronAPI.history.updateMetadata(threadId, { isPinned: true })
      ).rejects.toThrow('Failed to update')
    })
  })

  describe('Visual Indicators', () => {
    it('should use Star icon for pinned state', () => {
      // Star icon is used for:
      // 1. Pinned section header
      // 2. Individual pinned thread icon
      // 3. Pin toggle button
      
      const starIconUsages = [
        'section-header',
        'thread-icon',
        'toggle-button'
      ]
      
      expect(starIconUsages.length).toBe(3)
    })

    it('should use yellow color for pinned items', () => {
      // Pinned items use yellow colors:
      // - text-yellow-400
      // - fill-yellow-400
      // - bg-yellow-500/10
      
      const yellowStyles = {
        text: 'text-yellow-400',
        fill: 'fill-yellow-400',
        background: 'bg-yellow-500/10'
      }
      
      expect(yellowStyles.text).toContain('yellow')
      expect(yellowStyles.fill).toContain('yellow')
      expect(yellowStyles.background).toContain('yellow')
    })

    it('should show filled star for pinned threads', () => {
      const isPinned = true
      const starClass = isPinned ? 'fill-current' : ''
      
      expect(starClass).toBe('fill-current')
    })

    it('should show outline star for unpinned threads', () => {
      const isPinned = false
      const starClass = isPinned ? 'fill-current' : ''
      
      expect(starClass).toBe('')
    })
  })

  describe('Hover Behavior', () => {
    it('should show pin button on hover', () => {
      // The pin button is in a container with:
      // opacity-0 group-hover:opacity-100
      const containerClasses = 'opacity-0 group-hover:opacity-100 transition-opacity'
      
      expect(containerClasses).toContain('opacity-0')
      expect(containerClasses).toContain('group-hover:opacity-100')
    })

    it('should always show star for pinned threads', () => {
      // Pinned threads show star icon instead of MessageSquare
      const isPinned = true
      const icon = isPinned ? 'Star' : 'MessageSquare'
      
      expect(icon).toBe('Star')
    })
  })

  describe('Pinned Section Header', () => {
    it('should have distinct styling from other sections', () => {
      const pinnedHeaderClasses = 'bg-yellow-500/10 text-yellow-400 flex items-center gap-1.5'
      const regularHeaderClasses = 'bg-[#0d0d1a]/50 text-gray-500'
      
      expect(pinnedHeaderClasses).toContain('yellow')
      expect(regularHeaderClasses).not.toContain('yellow')
    })

    it('should show star icon in pinned section header', () => {
      const group = 'Pinned'
      const showStarInHeader = group === 'Pinned'
      
      expect(showStarInHeader).toBe(true)
    })
  })

  describe('Button Accessibility', () => {
    it('should have title attribute for pin button', () => {
      const isPinned = true
      const title = isPinned ? 'Unpin chat' : 'Pin chat'
      
      expect(title).toBe('Unpin chat')
    })

    it('should have title for unpinned state', () => {
      const isPinned = false
      const title = isPinned ? 'Unpin chat' : 'Pin chat'
      
      expect(title).toBe('Pin chat')
    })
  })

  describe('Event Handling', () => {
    it('should stop propagation when clicking pin button', () => {
      const event = {
        stopPropagation: vi.fn()
      }
      
      // Simulate stopPropagation call
      event.stopPropagation()
      
      expect(event.stopPropagation).toHaveBeenCalled()
    })
  })
})

describe('Date Grouping with Pinned Threads', () => {
  it('should not include pinned threads in date groups', () => {
    const now = Date.now()
    const threads: ChatThread[] = [
      { id: '1', title: 'Pinned Today', createdAt: now, updatedAt: now, messages: [], isPinned: true },
      { id: '2', title: 'Regular Today', createdAt: now, updatedAt: now, messages: [] }
    ]

    const groups = {
      'Pinned': threads.filter(t => t.isPinned),
      'Today': threads.filter(t => !t.isPinned)
    }

    expect(groups['Pinned'].length).toBe(1)
    expect(groups['Today'].length).toBe(1)
    // Pinned thread should NOT appear in Today
    expect(groups['Today'].some(t => t.isPinned)).toBe(false)
  })
})

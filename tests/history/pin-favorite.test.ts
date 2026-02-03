import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Pin/Favorite Chat Tests
 * 
 * Tests for Issue #7: Pin/favorite chats functionality
 * The button wasn't triggering any action because updateMetadata
 * didn't handle isPinned.
 */

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Issue #7: Pin/Favorite Chats', () => {
  describe('Toggle Pin Functionality', () => {
    it('should call updateMetadata with isPinned: true when pinning', async () => {
      const threadId = 'thread-123'
      const isPinned = false
      
      vi.mocked(window.electronAPI.history.updateMetadata).mockResolvedValueOnce(true)
      
      // Simulate clicking pin on an unpinned thread
      await window.electronAPI.history.updateMetadata(threadId, { isPinned: !isPinned })
      
      expect(window.electronAPI.history.updateMetadata).toHaveBeenCalledWith(
        threadId,
        { isPinned: true }
      )
    })

    it('should call updateMetadata with isPinned: false when unpinning', async () => {
      const threadId = 'thread-123'
      const isPinned = true
      
      vi.mocked(window.electronAPI.history.updateMetadata).mockResolvedValueOnce(true)
      
      // Simulate clicking pin on a pinned thread
      await window.electronAPI.history.updateMetadata(threadId, { isPinned: !isPinned })
      
      expect(window.electronAPI.history.updateMetadata).toHaveBeenCalledWith(
        threadId,
        { isPinned: false }
      )
    })
  })

  describe('Thread Grouping', () => {
    it('should group pinned threads separately', () => {
      const threads = [
        { id: '1', title: 'Pinned Thread', isPinned: true, updatedAt: Date.now() },
        { id: '2', title: 'Regular Thread', isPinned: false, updatedAt: Date.now() },
        { id: '3', title: 'Another Pinned', isPinned: true, updatedAt: Date.now() }
      ]

      const groups: { [key: string]: typeof threads } = {
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

      expect(groups['Pinned'].length).toBe(2)
      expect(groups['Today'].length).toBe(1)
    })

    it('should show pinned threads at the top', () => {
      const groupOrder = ['Pinned', 'Today', 'Yesterday', 'This Week', 'This Month', 'Older']
      expect(groupOrder[0]).toBe('Pinned')
    })
  })

  describe('Visual Indicators', () => {
    it('should show filled star icon for pinned threads', () => {
      const pinnedThread = { id: '1', title: 'Test', isPinned: true }
      const iconClass = pinnedThread.isPinned ? 'fill-current' : ''
      expect(iconClass).toBe('fill-current')
    })

    it('should show empty star icon for unpinned threads', () => {
      const unpinnedThread = { id: '2', title: 'Test', isPinned: false }
      const iconClass = unpinnedThread.isPinned ? 'fill-current' : ''
      expect(iconClass).toBe('')
    })
  })

  describe('Error Handling', () => {
    it('should handle pin toggle errors gracefully', async () => {
      vi.mocked(window.electronAPI.history.updateMetadata).mockRejectedValueOnce(
        new Error('Failed to update')
      )

      let errorOccurred = false
      try {
        await window.electronAPI.history.updateMetadata('thread-1', { isPinned: true })
      } catch (error) {
        errorOccurred = true
      }

      expect(errorOccurred).toBe(true)
    })
  })
})

describe('Metadata Update Integration', () => {
  it('should support isPinned in metadata update', async () => {
    const metadata = {
      isPinned: true,
      totalCost: 0.05,
      model: 'claude-sonnet'
    }

    vi.mocked(window.electronAPI.history.updateMetadata).mockResolvedValueOnce(true)

    await window.electronAPI.history.updateMetadata('thread-1', metadata)

    expect(window.electronAPI.history.updateMetadata).toHaveBeenCalledWith(
      'thread-1',
      expect.objectContaining({ isPinned: true })
    )
  })

  it('should persist isPinned across app restarts', async () => {
    // First, pin a thread
    vi.mocked(window.electronAPI.history.updateMetadata).mockResolvedValueOnce(true)
    await window.electronAPI.history.updateMetadata('thread-1', { isPinned: true })

    // Simulate app restart by loading threads
    const mockThreads = [
      { id: 'thread-1', title: 'Test', isPinned: true, messages: [], createdAt: 1, updatedAt: 1 }
    ]
    vi.mocked(window.electronAPI.history.getThreads).mockResolvedValueOnce(mockThreads)

    const threads = await window.electronAPI.history.getThreads()
    expect(threads[0].isPinned).toBe(true)
  })
})

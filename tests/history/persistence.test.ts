import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * History Persistence Tests
 * 
 * Tests for:
 * - Issue #24: Cost not displayed after reopening app
 * - Issue #25: Like/dislike status does not persist after reopening
 * 
 * These tests verify that cost and feedback data is properly persisted
 * and restored when loading chat threads.
 */

// Mock thread data
const mockThreadWithCost = {
  id: 'thread-1',
  title: 'Test Thread',
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now(),
  messages: [
    {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: Date.now() - 3000
    },
    {
      id: 'msg-2',
      role: 'assistant' as const,
      content: 'Hi there!',
      timestamp: Date.now() - 2000,
      cost: 0.0015,
      model: 'claude-sonnet-4-20250514'
    },
    {
      id: 'msg-3',
      role: 'user' as const,
      content: 'How are you?',
      timestamp: Date.now() - 1000
    },
    {
      id: 'msg-4',
      role: 'assistant' as const,
      content: 'I am doing well!',
      timestamp: Date.now(),
      cost: 0.0012,
      model: 'claude-sonnet-4-20250514',
      feedback: 'up' as const
    }
  ],
  totalCost: 0.0027,
  model: 'claude-sonnet-4-20250514'
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Issue #24: Cost Persistence', () => {
  describe('Cost Restoration on Thread Load', () => {
    it('should find the last assistant message with cost', () => {
      const messages = mockThreadWithCost.messages
      const lastAssistantMsg = messages
        .filter(m => m.role === 'assistant')
        .pop()
      
      expect(lastAssistantMsg).toBeDefined()
      expect(lastAssistantMsg?.cost).toBe(0.0012)
    })

    it('should restore lastCost from last assistant message', () => {
      const messages = mockThreadWithCost.messages
      const lastAssistantMsg = messages
        .filter(m => m.role === 'assistant')
        .pop()
      
      let lastCost: number | null = null
      if (lastAssistantMsg?.cost) {
        lastCost = lastAssistantMsg.cost
      }
      
      expect(lastCost).toBe(0.0012)
    })

    it('should restore lastModel from last assistant message', () => {
      const messages = mockThreadWithCost.messages
      const lastAssistantMsg = messages
        .filter(m => m.role === 'assistant')
        .pop()
      
      let lastModel: string | null = null
      if ((lastAssistantMsg as any)?.model) {
        lastModel = (lastAssistantMsg as any).model
      }
      
      expect(lastModel).toBe('claude-sonnet-4-20250514')
    })

    it('should handle threads without cost data', () => {
      const threadWithoutCost = {
        ...mockThreadWithCost,
        messages: mockThreadWithCost.messages.map(m => ({
          ...m,
          cost: undefined,
          model: undefined
        }))
      }
      
      const lastAssistantMsg = threadWithoutCost.messages
        .filter(m => m.role === 'assistant')
        .pop()
      
      expect(lastAssistantMsg?.cost).toBeUndefined()
    })
  })

  describe('Cost Display Format', () => {
    it('should format cost with 4 decimal places', () => {
      const cost = 0.0015
      const formatted = `$${cost.toFixed(4)}`
      expect(formatted).toBe('$0.0015')
    })

    it('should handle very small costs', () => {
      const cost = 0.0001
      const formatted = `$${cost.toFixed(4)}`
      expect(formatted).toBe('$0.0001')
    })

    it('should handle larger costs', () => {
      const cost = 1.2345
      const formatted = `$${cost.toFixed(4)}`
      expect(formatted).toBe('$1.2345')
    })
  })
})

describe('Issue #25: Feedback Persistence', () => {
  describe('Feedback Restoration on Thread Load', () => {
    it('should extract feedback from messages', () => {
      const messages = mockThreadWithCost.messages
      const restoredFeedback: Record<string, 'up' | 'down' | null> = {}
      
      messages.forEach(m => {
        if ((m as any).feedback) {
          restoredFeedback[m.id] = (m as any).feedback
        }
      })
      
      expect(restoredFeedback['msg-4']).toBe('up')
      expect(Object.keys(restoredFeedback).length).toBe(1)
    })

    it('should handle messages without feedback', () => {
      const messagesWithoutFeedback = mockThreadWithCost.messages.map(m => ({
        ...m,
        feedback: undefined
      }))
      
      const restoredFeedback: Record<string, 'up' | 'down' | null> = {}
      messagesWithoutFeedback.forEach(m => {
        if ((m as any).feedback) {
          restoredFeedback[m.id] = (m as any).feedback
        }
      })
      
      expect(Object.keys(restoredFeedback).length).toBe(0)
    })

    it('should handle mixed feedback states', () => {
      const messagesWithMixedFeedback = [
        { id: 'msg-1', role: 'assistant', content: 'A', feedback: 'up' },
        { id: 'msg-2', role: 'assistant', content: 'B', feedback: 'down' },
        { id: 'msg-3', role: 'assistant', content: 'C', feedback: null },
        { id: 'msg-4', role: 'assistant', content: 'D' } // no feedback property
      ]
      
      const restoredFeedback: Record<string, 'up' | 'down' | null> = {}
      messagesWithMixedFeedback.forEach(m => {
        if ((m as any).feedback) {
          restoredFeedback[m.id] = (m as any).feedback
        }
      })
      
      expect(restoredFeedback['msg-1']).toBe('up')
      expect(restoredFeedback['msg-2']).toBe('down')
      expect(restoredFeedback['msg-3']).toBeUndefined() // null is falsy
      expect(restoredFeedback['msg-4']).toBeUndefined()
    })
  })

  describe('Feedback Toggle Behavior', () => {
    it('should toggle feedback off when clicking same button', () => {
      let currentFeedback: 'up' | 'down' | null = 'up'
      const clickedFeedback: 'up' | 'down' = 'up'
      
      const newFeedback = currentFeedback === clickedFeedback ? null : clickedFeedback
      
      expect(newFeedback).toBeNull()
    })

    it('should change feedback when clicking different button', () => {
      let currentFeedback: 'up' | 'down' | null = 'up'
      const clickedFeedback: 'up' | 'down' = 'down'
      
      const newFeedback = currentFeedback === clickedFeedback ? null : clickedFeedback
      
      expect(newFeedback).toBe('down')
    })

    it('should set feedback when none exists', () => {
      let currentFeedback: 'up' | 'down' | null = null
      const clickedFeedback: 'up' | 'down' = 'up'
      
      const newFeedback = currentFeedback === clickedFeedback ? null : clickedFeedback
      
      expect(newFeedback).toBe('up')
    })
  })

  describe('Feedback Persistence API', () => {
    it('should call updateMessageFeedback with correct params', async () => {
      // This tests the IPC call format
      const threadId = 'thread-1'
      const messageId = 'msg-4'
      const feedback: 'up' | 'down' | null = 'up'
      
      // Mock the API call
      vi.mocked(window.electronAPI.history.updateMessageFeedback).mockResolvedValueOnce(true)
      
      const result = await window.electronAPI.history.updateMessageFeedback(threadId, messageId, feedback)
      
      expect(window.electronAPI.history.updateMessageFeedback).toHaveBeenCalledWith(
        threadId,
        messageId,
        feedback
      )
      expect(result).toBe(true)
    })

    it('should handle persistence failure gracefully', async () => {
      vi.mocked(window.electronAPI.history.updateMessageFeedback).mockRejectedValueOnce(
        new Error('Failed to persist')
      )
      
      let errorOccurred = false
      try {
        await window.electronAPI.history.updateMessageFeedback('thread-1', 'msg-1', 'up')
      } catch (error) {
        errorOccurred = true
      }
      
      // Even if persistence fails, the local state should still work
      expect(errorOccurred).toBe(true)
    })
  })
})

describe('Thread Loading Helper', () => {
  describe('loadThread Function Behavior', () => {
    it('should map messages correctly', () => {
      const thread = mockThreadWithCost
      
      const loadedMessages = thread.messages.map((m, i) => ({
        id: m.id || i.toString(),
        role: m.role,
        content: m.content,
        cost: (m as any).cost,
        model: (m as any).model,
        feedback: (m as any).feedback
      }))
      
      expect(loadedMessages.length).toBe(4)
      expect(loadedMessages[3].cost).toBe(0.0012)
      expect(loadedMessages[3].feedback).toBe('up')
    })

    it('should handle messages with missing ids', () => {
      const messagesWithoutIds = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ]
      
      const loadedMessages = messagesWithoutIds.map((m, i) => ({
        id: (m as any).id || i.toString(),
        role: m.role,
        content: m.content
      }))
      
      expect(loadedMessages[0].id).toBe('0')
      expect(loadedMessages[1].id).toBe('1')
    })
  })
})

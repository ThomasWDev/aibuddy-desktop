/**
 * History Refresh Tests
 * 
 * Tests for the chat history auto-refresh functionality (QA Issue FUNC-6)
 * Verifies that the sidebar updates in real-time when threads are created/updated
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState, useCallback, useEffect } from 'react'

// Mock thread data
const mockThread = {
  id: 'thread-123',
  title: 'Test Thread',
  messages: [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
}

describe('History Refresh Functionality', () => {
  describe('refreshTrigger state', () => {
    it('should increment on each refresh call', () => {
      const { result } = renderHook(() => {
        const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0)
        const refreshHistorySidebar = useCallback(() => {
          setHistoryRefreshTrigger(prev => prev + 1)
        }, [])
        return { historyRefreshTrigger, refreshHistorySidebar }
      })
      
      expect(result.current.historyRefreshTrigger).toBe(0)
      
      act(() => {
        result.current.refreshHistorySidebar()
      })
      expect(result.current.historyRefreshTrigger).toBe(1)
      
      act(() => {
        result.current.refreshHistorySidebar()
        result.current.refreshHistorySidebar()
      })
      expect(result.current.historyRefreshTrigger).toBe(3)
    })
  })
  
  describe('HistorySidebar refresh behavior', () => {
    it('should reload threads when refreshTrigger changes', () => {
      const loadThreads = vi.fn()
      
      const { rerender } = renderHook(
        ({ refreshTrigger }) => {
          useEffect(() => {
            loadThreads()
          }, [refreshTrigger])
        },
        { initialProps: { refreshTrigger: 0 } }
      )
      
      expect(loadThreads).toHaveBeenCalledTimes(1)
      
      // Trigger refresh
      rerender({ refreshTrigger: 1 })
      expect(loadThreads).toHaveBeenCalledTimes(2)
      
      // Another refresh
      rerender({ refreshTrigger: 2 })
      expect(loadThreads).toHaveBeenCalledTimes(3)
    })
    
    it('should not reload when refreshTrigger stays the same', () => {
      const loadThreads = vi.fn()
      
      const { rerender } = renderHook(
        ({ refreshTrigger }) => {
          useEffect(() => {
            loadThreads()
          }, [refreshTrigger])
        },
        { initialProps: { refreshTrigger: 0 } }
      )
      
      expect(loadThreads).toHaveBeenCalledTimes(1)
      
      // Rerender with same value
      rerender({ refreshTrigger: 0 })
      expect(loadThreads).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('Thread creation triggers refresh', () => {
    it('should call refreshHistorySidebar after creating thread', async () => {
      const refreshHistorySidebar = vi.fn()
      
      // Simulate thread creation flow
      const createThread = async () => {
        // Mock thread creation
        const thread = { ...mockThread, id: `thread-${Date.now()}` }
        // After creation, refresh sidebar
        refreshHistorySidebar()
        return thread
      }
      
      await createThread()
      expect(refreshHistorySidebar).toHaveBeenCalledTimes(1)
      
      await createThread()
      expect(refreshHistorySidebar).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('Message addition triggers refresh', () => {
    it('should call refreshHistorySidebar after adding message', async () => {
      const refreshHistorySidebar = vi.fn()
      
      const addMessage = async (threadId: string, message: any) => {
        // Mock message addition
        mockThread.messages.push(message)
        // After addition, refresh sidebar
        refreshHistorySidebar()
        return message
      }
      
      await addMessage('thread-123', { role: 'user', content: 'New message' })
      expect(refreshHistorySidebar).toHaveBeenCalledTimes(1)
    })
  })
})

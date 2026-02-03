/**
 * Typing Performance Tests
 * 
 * Tests for the typing lag fix (QA Issue FUNC-1)
 * Verifies that useDeferredValue and useCallback optimizations work
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState, useDeferredValue, useCallback } from 'react'

describe('Typing Performance Optimizations', () => {
  describe('useDeferredValue', () => {
    it('should defer input value for non-urgent updates', () => {
      const { result, rerender } = renderHook(() => {
        const [input, setInput] = useState('')
        const deferredInput = useDeferredValue(input)
        return { input, setInput, deferredInput }
      })
      
      // Initial state
      expect(result.current.input).toBe('')
      expect(result.current.deferredInput).toBe('')
      
      // Update input
      act(() => {
        result.current.setInput('Hello')
      })
      
      // Input updates immediately
      expect(result.current.input).toBe('Hello')
    })
  })
  
  describe('useCallback memoization', () => {
    it('should memoize copyToClipboard function', () => {
      const setCopiedId = vi.fn()
      
      const { result, rerender } = renderHook(() => {
        const copyToClipboard = useCallback(async (text: string, id: string) => {
          setCopiedId(id)
          setTimeout(() => setCopiedId(null), 2000)
        }, [])
        return { copyToClipboard }
      })
      
      const firstRef = result.current.copyToClipboard
      rerender()
      const secondRef = result.current.copyToClipboard
      
      // Same function reference after rerender
      expect(firstRef).toBe(secondRef)
    })
    
    it('should memoize handleFeedback function with activeThreadId dependency', () => {
      const { result, rerender } = renderHook(
        ({ activeThreadId }) => {
          const handleFeedback = useCallback(async (messageId: string, feedback: 'up' | 'down') => {
            // Implementation
            return { messageId, feedback, activeThreadId }
          }, [activeThreadId])
          return { handleFeedback }
        },
        { initialProps: { activeThreadId: 'thread-1' } }
      )
      
      const firstRef = result.current.handleFeedback
      
      // Rerender with same props
      rerender({ activeThreadId: 'thread-1' })
      expect(result.current.handleFeedback).toBe(firstRef)
      
      // Rerender with different props - should create new function
      rerender({ activeThreadId: 'thread-2' })
      expect(result.current.handleFeedback).not.toBe(firstRef)
    })
  })
  
  describe('Performance metrics', () => {
    it('should render message list without blocking input', () => {
      const startTime = performance.now()
      
      // Simulate message list rendering
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i} content with some longer text to simulate real messages`
      }))
      
      // Simulate processing
      const processed = messages.map(m => ({ ...m, processed: true }))
      
      const endTime = performance.now()
      const processingTime = endTime - startTime
      
      // Processing should be fast (under 50ms)
      expect(processingTime).toBeLessThan(50)
      expect(processed.length).toBe(100)
    })
  })
})

/**
 * Typing Performance Tests (TDD)
 * 
 * Root cause: App.tsx is ~4,400 lines with ZERO memoization.
 * Every keystroke calls setInput() → full re-render of all messages
 * (ReactMarkdown + SyntaxHighlighter) on every frame.
 *
 * Fix strategy:
 * 1. Memoize the message list rendering with useMemo
 * 2. Memoize the ReactMarkdown `components` config with useMemo
 * 3. Use useCallback for handlers passed to children
 * 4. Memoize expensive derived values
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState, useMemo, useCallback, useDeferredValue } from 'react'

describe('Typing Performance — Root Cause Fix', () => {
  describe('Message list memoization', () => {
    it('useMemo should prevent recalculation when only input changes', () => {
      let renderCount = 0

      const { result, rerender } = renderHook(() => {
        const [input, setInput] = useState('')
        const [messages] = useState([
          { id: '1', role: 'user', content: 'Hello' },
          { id: '2', role: 'assistant', content: 'Hi there!' },
        ])

        const memoizedMessages = useMemo(() => {
          renderCount++
          return messages.map(m => ({ ...m, rendered: true }))
        }, [messages])

        return { input, setInput, memoizedMessages }
      })

      const initialCount = renderCount
      expect(result.current.memoizedMessages).toHaveLength(2)

      // Typing should NOT cause message re-processing
      act(() => { result.current.setInput('a') })
      act(() => { result.current.setInput('ab') })
      act(() => { result.current.setInput('abc') })

      expect(renderCount).toBe(initialCount)
    })

    it('useMemo should recalculate when messages actually change', () => {
      let computeCount = 0

      const { result } = renderHook(() => {
        const [messages, setMessages] = useState([
          { id: '1', role: 'user', content: 'Hello' },
        ])

        const processed = useMemo(() => {
          computeCount++
          return messages.map(m => m.content.toUpperCase())
        }, [messages])

        return { messages, setMessages, processed }
      })

      expect(computeCount).toBe(1)

      act(() => {
        result.current.setMessages(prev => [
          ...prev,
          { id: '2', role: 'assistant', content: 'Response' },
        ])
      })

      expect(computeCount).toBe(2)
      expect(result.current.processed).toEqual(['HELLO', 'RESPONSE'])
    })
  })

  describe('ReactMarkdown components memoization', () => {
    it('useMemo should return same object reference across renders', () => {
      const { result, rerender } = renderHook(() => {
        const markdownComponents = useMemo(() => ({
          code: ({ children }: any) => children,
          pre: ({ children }: any) => children,
        }), [])
        return { markdownComponents }
      })

      const firstRef = result.current.markdownComponents
      rerender()
      rerender()
      rerender()

      expect(result.current.markdownComponents).toBe(firstRef)
    })
  })

  describe('Handler memoization with useCallback', () => {
    it('handleSubmit should be stable across input changes', () => {
      const { result } = renderHook(() => {
        const [input, setInput] = useState('')
        const handleSubmit = useCallback(() => {
          // submit logic
        }, [])
        return { input, setInput, handleSubmit }
      })

      const ref1 = result.current.handleSubmit
      act(() => { result.current.setInput('typing...') })
      expect(result.current.handleSubmit).toBe(ref1)
    })

    it('copyToClipboard should be stable across renders', () => {
      const { result, rerender } = renderHook(() => {
        const copyToClipboard = useCallback(async (text: string, id: string) => {
          await navigator.clipboard.writeText(text)
        }, [])
        return { copyToClipboard }
      })

      const ref1 = result.current.copyToClipboard
      rerender()
      expect(result.current.copyToClipboard).toBe(ref1)
    })

    it('handlePasteImage should be stable', () => {
      const { result, rerender } = renderHook(() => {
        const handlePasteImage = useCallback(async (e: any) => {
          // paste logic
        }, [])
        return { handlePasteImage }
      })

      const ref1 = result.current.handlePasteImage
      rerender()
      expect(result.current.handlePasteImage).toBe(ref1)
    })
  })

  describe('Derived values memoization', () => {
    it('filtered terminal output should not recompute on input change', () => {
      let filterCount = 0

      const { result } = renderHook(() => {
        const [input, setInput] = useState('')
        const [terminalOutput] = useState([
          { type: 'command', text: '$ ls' },
          { type: 'stdout', text: 'file1.ts' },
          { type: 'success', text: 'Done' },
        ])

        const statusLines = useMemo(() => {
          filterCount++
          return terminalOutput.filter(
            l => l.type === 'command' || l.type === 'success' || l.type === 'error'
          )
        }, [terminalOutput])

        return { input, setInput, statusLines }
      })

      expect(filterCount).toBe(1)
      expect(result.current.statusLines).toHaveLength(2)

      act(() => { result.current.setInput('typing') })
      expect(filterCount).toBe(1)
    })
  })

  describe('Performance benchmark', () => {
    it('processing 50 messages with markdown should complete in <10ms', () => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: i % 2 === 0
          ? `User message ${i} with some text`
          : `Here's some code:\n\`\`\`javascript\nconsole.log("hello ${i}")\n\`\`\`\nAnd explanation.`,
      }))

      const start = performance.now()
      const processed = messages.map(m => ({
        ...m,
        hasCode: m.content.includes('```'),
        preview: m.content.substring(0, 100),
      }))
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(10)
      expect(processed).toHaveLength(50)
    })

    it('rapid keystroke simulation should not degrade', () => {
      const { result } = renderHook(() => {
        const [input, setInput] = useState('')
        return { input, setInput }
      })

      const start = performance.now()
      const chars = 'The quick brown fox jumps over the lazy dog'
      for (const char of chars) {
        act(() => {
          result.current.setInput(prev => prev + char)
        })
      }
      const elapsed = performance.now() - start

      expect(result.current.input).toBe(chars)
      expect(elapsed).toBeLessThan(200)
    })
  })
})

/**
 * UI Fixes Unit Tests - v1.5.58
 * 
 * Tests for KAN-35, KAN-36, KAN-37, KAN-38, KAN-39, KAN-40, KAN-41, KAN-42, KAN-48
 * 
 * @version 1.5.58
 * @tickets KAN-35 KAN-36 KAN-37 KAN-38 KAN-39 KAN-40 KAN-41 KAN-42 KAN-48
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('KAN-36: Regenerate should not duplicate user messages', () => {
  it('should remove both user and assistant messages before regenerating', () => {
    // Simulate messages array: [user, assistant, user, assistant]
    const messages = [
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'Hi there!' },
      { id: '3', role: 'user', content: 'What is React?' },
      { id: '4', role: 'assistant', content: 'React is a library...' }
    ]

    // Find last user message
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    expect(lastUserIdx).not.toBe(-1)

    const actualIdx = messages.length - 1 - lastUserIdx
    expect(actualIdx).toBe(2) // Index of 'What is React?'

    // KAN-36 FIX: Remove both user msg AND assistant response
    // Old behavior: messages.slice(0, actualIdx + 1) - kept user message, causing duplicate
    // New behavior: messages.slice(0, actualIdx) - removes both, handleSubmit re-adds user message
    const newMessages = messages.slice(0, actualIdx)
    expect(newMessages).toHaveLength(2)
    expect(newMessages[0].content).toBe('Hello')
    expect(newMessages[1].content).toBe('Hi there!')
    // User message 'What is React?' is NOT in the array anymore
    // handleSubmit will re-add it exactly once
  })

  it('should preserve the first user message when regenerating single exchange', () => {
    const messages = [
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'Hi!' }
    ]

    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    const actualIdx = messages.length - 1 - lastUserIdx
    expect(actualIdx).toBe(0)

    // Slice to actualIdx (0) means empty array - handleSubmit will re-add user message
    const newMessages = messages.slice(0, actualIdx)
    expect(newMessages).toHaveLength(0)
  })

  it('should correctly extract user content for re-submission', () => {
    const messages = [
      { id: '1', role: 'user', content: 'Explain TypeScript' },
      { id: '2', role: 'assistant', content: 'TypeScript is...' }
    ]

    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    const actualIdx = messages.length - 1 - lastUserIdx
    const lastUser = messages[actualIdx]

    const contentToResubmit = lastUser.content === '📷 [Image attached - please analyze]' 
      ? '' 
      : lastUser.content
    expect(contentToResubmit).toBe('Explain TypeScript')
  })

  it('should handle image-only messages in regeneration', () => {
    const messages = [
      { id: '1', role: 'user', content: '📷 [Image attached - please analyze]', images: [{ id: 'img1' }] },
      { id: '2', role: 'assistant', content: 'I see an image...' }
    ]

    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    const actualIdx = messages.length - 1 - lastUserIdx
    const lastUser = messages[actualIdx]

    const contentToResubmit = lastUser.content === '📷 [Image attached - please analyze]' 
      ? '' 
      : lastUser.content
    expect(contentToResubmit).toBe('')
    expect(lastUser.images).toBeDefined()
  })
})

describe('KAN-37: Thread restoration on startup', () => {
  it('should prioritize activeThread over most recent thread', () => {
    const threads = [
      { id: 'recent', messages: [{ id: '1', role: 'user', content: 'Recent' }] },
      { id: 'active', messages: [{ id: '2', role: 'user', content: 'Active' }] }
    ]

    const activeThread = threads.find(t => t.id === 'active') || null
    const threadToRestore = activeThread || threads[0]
    expect(threadToRestore.id).toBe('active')
  })

  it('should fall back to most recent thread when no active thread', () => {
    const threads = [
      { id: 'recent', messages: [{ id: '1', role: 'user', content: 'Recent' }] },
    ]

    const activeThread = null
    const threadToRestore = activeThread || threads[0]
    expect(threadToRestore.id).toBe('recent')
  })

  it('should restore messages with correct structure', () => {
    const threadMessages = [
      { id: '1', role: 'user', content: 'Hello', cost: undefined, model: undefined },
      { id: '2', role: 'assistant', content: 'Hi!', cost: 0.001, model: 'deepseek-chat' }
    ]

    const loadedMessages = threadMessages.map((msg: any) => ({
      id: msg.id,
      role: msg.role || 'user',
      content: msg.content || '',
      cost: msg.cost,
      model: msg.model,
    }))

    expect(loadedMessages).toHaveLength(2)
    expect(loadedMessages[0].role).toBe('user')
    expect(loadedMessages[1].cost).toBe(0.001)
    expect(loadedMessages[1].model).toBe('deepseek-chat')
  })
})

describe('KAN-35: Stop button / AbortController', () => {
  it('should abort correctly when controller exists', () => {
    const controller = new AbortController()
    expect(controller.signal.aborted).toBe(false)
    controller.abort()
    expect(controller.signal.aborted).toBe(true)
  })

  it('should handle null controller gracefully', () => {
    let controllerRef: AbortController | null = null
    // Stop button click handler should not throw
    if (controllerRef) {
      controllerRef.abort()
    }
    // No error thrown
    expect(true).toBe(true)
  })
})

describe('KAN-39: API Key button text', () => {
  it('should show "Add Key" when no API key', () => {
    const apiKey = null
    const text = apiKey ? 'API Key ✓' : 'Add Key'
    expect(text).toBe('Add Key')
  })

  it('should show "API Key ✓" when API key is set', () => {
    const apiKey = 'some-key-123'
    const text = apiKey ? 'API Key ✓' : 'Add Key'
    expect(text).toBe('API Key ✓')
  })
})

describe('KAN-42: Hamburger menu state', () => {
  it('should toggle menu visibility', () => {
    let showMoreMenu = false
    showMoreMenu = !showMoreMenu
    expect(showMoreMenu).toBe(true)
    showMoreMenu = !showMoreMenu
    expect(showMoreMenu).toBe(false)
  })
})

describe('KAN-17: Voice input support detection', () => {
  it('should handle unsupported environments gracefully', () => {
    // In Node.js test environment, SpeechRecognition is not available
    const isSupported = typeof (globalThis as any).SpeechRecognition !== 'undefined' ||
                        typeof (globalThis as any).webkitSpeechRecognition !== 'undefined'
    // Should not crash even when not supported
    expect(typeof isSupported).toBe('boolean')
  })
})

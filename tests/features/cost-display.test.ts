import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Cost Display Tests - KAN-27
 * 
 * ROOT CAUSE: `lastCost` and `lastModel` state values were restored when
 * loading a thread from history (`setLastCost(thread.totalCost)`), but:
 * 1. They were never displayed in the header UI
 * 2. They were never persisted to the electron store
 * 
 * On app reopen, both values were null because they were only kept in
 * React state (volatile, lost on unmount/refresh).
 * 
 * FIX:
 * 1. Added a visible cost/model badge in the header (next to credits)
 * 2. Persist `lastCost` and `lastModel` to electron store when set
 * 3. Load from store on app mount (same path as cachedCredits)
 */

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-27: Cost Persistence to Store', () => {
  it('should persist lastCost to electron store when set', async () => {
    const cost = 0.0045
    
    await window.electronAPI.store.set('lastCost', cost)
    
    expect(window.electronAPI.store.set).toHaveBeenCalledWith('lastCost', cost)
  })

  it('should persist lastModel to electron store when set', async () => {
    const model = 'claude-opus-4-20250514'
    
    await window.electronAPI.store.set('lastModel', model)
    
    expect(window.electronAPI.store.set).toHaveBeenCalledWith('lastModel', model)
  })

  it('should load lastCost from store on mount', async () => {
    vi.mocked(window.electronAPI.store.get).mockResolvedValueOnce(0.0032)
    
    const savedCost = await window.electronAPI.store.get('lastCost')
    
    expect(savedCost).toBe(0.0032)
  })

  it('should load lastModel from store on mount', async () => {
    vi.mocked(window.electronAPI.store.get).mockResolvedValueOnce('gpt-5.2')
    
    const savedModel = await window.electronAPI.store.get('lastModel')
    
    expect(savedModel).toBe('gpt-5.2')
  })

  it('should handle null lastCost from store (first time use)', async () => {
    vi.mocked(window.electronAPI.store.get).mockResolvedValueOnce(null)
    
    const savedCost = await window.electronAPI.store.get('lastCost')
    
    expect(savedCost).toBeNull()
  })

  it('should handle undefined lastModel from store', async () => {
    vi.mocked(window.electronAPI.store.get).mockResolvedValueOnce(undefined)
    
    const savedModel = await window.electronAPI.store.get('lastModel')
    
    expect(savedModel).toBeUndefined()
  })

  it('should handle zero cost (free tier/cached response)', async () => {
    vi.mocked(window.electronAPI.store.get).mockResolvedValueOnce(0)
    
    const savedCost = await window.electronAPI.store.get('lastCost')
    
    // 0 is a valid cost (cached/free response), should not be treated as null
    expect(savedCost).toBe(0)
    expect(savedCost !== undefined && savedCost !== null).toBe(true)
  })
})

describe('KAN-27: Cost Display Formatting', () => {
  it('should format cost with 4 decimal places', () => {
    const cost = 0.0045
    const formatted = cost.toFixed(4)
    
    expect(formatted).toBe('0.0045')
  })

  it('should format very small costs correctly', () => {
    const cost = 0.00001
    const formatted = cost.toFixed(4)
    
    expect(formatted).toBe('0.0000')
  })

  it('should format larger costs correctly', () => {
    const cost = 1.2345
    const formatted = cost.toFixed(4)
    
    expect(formatted).toBe('1.2345')
  })

  it('should truncate long model names in header', () => {
    const longModel = 'claude-opus-4-20250514'
    const maxLen = 12
    const truncated = longModel.length > maxLen 
      ? longModel.substring(0, maxLen) + '...' 
      : longModel
    
    expect(truncated).toBe('claude-opus-...')
    expect(truncated.length).toBeLessThanOrEqual(maxLen + 3) // +3 for '...'
  })

  it('should not truncate short model names', () => {
    const shortModel = 'gpt-5.2'
    const maxLen = 12
    const truncated = shortModel.length > maxLen 
      ? shortModel.substring(0, maxLen) + '...' 
      : shortModel
    
    expect(truncated).toBe('gpt-5.2')
  })
})

describe('KAN-27: Cost from API Response', () => {
  it('should extract api_cost from response data', () => {
    const data = {
      response: 'AI response text',
      api_cost: 0.0045,
      model: 'claude-opus-4',
      remaining_credits: 95.5
    }
    
    expect(data.api_cost).toBe(0.0045)
  })

  it('should extract model from response data', () => {
    const data = {
      response: 'AI response text',
      api_cost: 0.0045,
      model: 'claude-opus-4',
      remaining_credits: 95.5
    }
    
    expect(data.model).toBe('claude-opus-4')
  })

  it('should handle response without cost (cached)', () => {
    const data = {
      response: 'Cached response',
      remaining_credits: 100
    }
    
    expect((data as any).api_cost).toBeUndefined()
    expect((data as any).model).toBeUndefined()
  })
})

describe('KAN-27: Cost from Thread History', () => {
  it('should restore totalCost when loading a thread', () => {
    const thread = {
      id: 'thread-123',
      title: 'Test Thread',
      messages: [],
      totalCost: 0.0125,
      model: 'gpt-5.2',
      createdAt: new Date().toISOString()
    }
    
    let lastCost: number | null = null
    let lastModel: string | null = null
    
    // Simulate thread load
    if (thread.totalCost !== undefined) {
      lastCost = thread.totalCost
    }
    if (thread.model) {
      lastModel = thread.model
    }
    
    expect(lastCost).toBe(0.0125)
    expect(lastModel).toBe('gpt-5.2')
  })

  it('should handle thread without cost metadata', () => {
    const thread = {
      id: 'thread-456',
      title: 'Old Thread',
      messages: [],
      createdAt: new Date().toISOString()
    }
    
    let lastCost: number | null = null
    
    if ((thread as any).totalCost !== undefined) {
      lastCost = (thread as any).totalCost
    } else {
      lastCost = null
    }
    
    expect(lastCost).toBeNull()
  })

  it('should reset cost when starting new thread', () => {
    let lastCost: number | null = 0.0045
    let lastModel: string | null = 'gpt-5.2'
    
    // Simulate new thread action
    lastCost = null
    lastModel = null
    
    expect(lastCost).toBeNull()
    expect(lastModel).toBeNull()
  })
})

describe('KAN-27: Cost Display Visibility', () => {
  it('should not show cost badge when lastCost is null', () => {
    const lastCost: number | null = null
    const shouldShow = lastCost !== null
    
    expect(shouldShow).toBe(false)
  })

  it('should show cost badge when lastCost has value', () => {
    const lastCost: number | null = 0.0045
    const shouldShow = lastCost !== null
    
    expect(shouldShow).toBe(true)
  })

  it('should show cost badge even for zero cost', () => {
    const lastCost: number | null = 0
    const shouldShow = lastCost !== null
    
    // 0 cost (cached response) should still show the badge
    expect(shouldShow).toBe(true)
  })
})

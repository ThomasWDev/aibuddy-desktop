import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIBuddyClient } from '../../src/api/aibuddy-client'

describe('AIBuddyClient', () => {
  let client: AIBuddyClient

  beforeEach(() => {
    client = new AIBuddyClient('https://test-api.example.com')
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create client with default URL', () => {
      const defaultClient = new AIBuddyClient()
      expect(defaultClient).toBeDefined()
    })

    it('should create client with custom URL', () => {
      const customClient = new AIBuddyClient('https://custom.api.com')
      expect(customClient).toBeDefined()
    })
  })

  describe('setApiKey', () => {
    it('should set the API key', () => {
      client.setApiKey('test-api-key')
      // API key is private, but we can test it works by checking getApiKey
    })
  })

  describe('getApiKey', () => {
    it('should return null when no API key is set', async () => {
      const key = await client.getApiKey()
      expect(key).toBeNull()
    })

    it('should return the API key when set', async () => {
      client.setApiKey('test-api-key')
      const key = await client.getApiKey()
      expect(key).toBe('test-api-key')
    })
  })

  describe('saveApiKey', () => {
    it('should save API key and make it retrievable', async () => {
      await client.saveApiKey('saved-api-key')
      const key = await client.getApiKey()
      expect(key).toBe('saved-api-key')
    })
  })

  describe('chat', () => {
    it('should throw error when no API key is set', async () => {
      await expect(client.chat({
        messages: [{ role: 'user', content: 'Hello' }]
      })).rejects.toThrow('API key not configured')
    })

    it('should make API request with correct headers', async () => {
      client.setApiKey('test-api-key')
      
      const mockResponse = {
        request_id: 'test-id',
        content: [{ type: 'text', text: 'Hello!' }],
        model: 'claude-opus-4-20250514',
        usage: { input_tokens: 10, output_tokens: 5 }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)

      const response = await client.chat({
        messages: [{ role: 'user', content: 'Hello' }]
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.example.com/v1/inference',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-AIBuddy-API-Key': 'test-api-key'
          })
        })
      )

      expect(response.content).toEqual(mockResponse.content)
    })

    it('should handle API errors', async () => {
      client.setApiKey('test-api-key')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      } as Response)

      await expect(client.chat({
        messages: [{ role: 'user', content: 'Hello' }]
      })).rejects.toThrow('API error: 500')
    })

    it('should include system prompt in messages', async () => {
      client.setApiKey('test-api-key')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          request_id: 'test-id',
          content: [{ type: 'text', text: 'Response' }],
          model: 'claude-opus-4-20250514'
        })
      } as Response)

      await client.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        system: 'You are a helpful assistant'
      })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      
      expect(body.messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant'
      })
    })

    it('should detect math task hints', async () => {
      client.setApiKey('test-api-key')

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          request_id: 'test-id',
          content: [{ type: 'text', text: 'Response' }],
          model: 'claude-opus-4-20250514'
        })
      } as Response)

      await client.chat({
        messages: [{ role: 'user', content: 'Calculate the equation 2+2' }]
      })

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      
      expect(body.task_hints).toContain('math')
    })
  })

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true
      } as Response)

      const isHealthy = await client.healthCheck()
      expect(isHealthy).toBe(true)
    })

    it('should return false when API is unhealthy', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false
      } as Response)

      const isHealthy = await client.healthCheck()
      expect(isHealthy).toBe(false)
    })

    it('should return false on network error', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      const isHealthy = await client.healthCheck()
      expect(isHealthy).toBe(false)
    })
  })
})


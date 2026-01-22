/**
 * AIBuddy API Client
 * 
 * Client for communicating with the AIBuddy API backend.
 */

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | MessageContent[]
}

export interface MessageContent {
  type: 'text' | 'image' | 'tool_use' | 'tool_result'
  text?: string
  source?: { type: string; media_type: string; data: string }
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: string
}

export interface ChatRequest {
  model?: string
  messages: ChatMessage[]
  system?: string
  max_tokens?: number
  temperature?: number
  tools?: Tool[]
  stream?: boolean
}

export interface Tool {
  name: string
  description: string
  input_schema: {
    type: string
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ChatResponse {
  id: string
  type: string
  role: string
  content: ContentBlock[]
  model: string
  stop_reason: string
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

export interface ContentBlock {
  type: 'text' | 'tool_use'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
}

export interface StreamEvent {
  type: string
  index?: number
  delta?: {
    type: string
    text?: string
    partial_json?: string
  }
  content_block?: ContentBlock
  message?: ChatResponse
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

export interface UserInfo {
  id: string
  email: string
  credits: number
  plan: string
}

export class AIBuddyClient {
  private baseUrl: string
  private apiKey: string | null = null

  constructor(baseUrl = 'https://api.aibuddy.life') {
    this.baseUrl = baseUrl
  }

  /**
   * Set the API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Get the API key from storage
   */
  async getApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey
    
    if (electronAPI) {
      const key = await electronAPI.store.get('apiKey')
      if (key) {
        this.apiKey = key as string
        return this.apiKey
      }
    }
    
    return null
  }

  /**
   * Save API key to storage
   */
  async saveApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey
    if (electronAPI) {
      await electronAPI.store.set('apiKey', apiKey)
    }
  }

  /**
   * Send a chat request
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('API key not configured')
    }

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: request.model || 'claude-opus-4-20250514',
        messages: request.messages,
        system: request.system,
        max_tokens: request.max_tokens || 8192,
        temperature: request.temperature || 0.7,
        tools: request.tools
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Send a streaming chat request
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamEvent> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('API key not configured')
    }

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ...request,
        stream: true
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            return
          }
          try {
            const event = JSON.parse(data) as StreamEvent
            yield event
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /**
   * Get user information
   */
  async getUser(): Promise<UserInfo> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('API key not configured')
    }

    const response = await fetch(`${this.baseUrl}/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Get user credits
   */
  async getCredits(): Promise<number> {
    const user = await this.getUser()
    return user.credits
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const aibuddyClient = new AIBuddyClient()

export default aibuddyClient


/**
 * AIBuddy API Client
 * 
 * Client for communicating with the AIBuddy API backend (AWS Lambda).
 * 
 * IMPORTANT: Extended Thinking Requirements
 * - When thinking is enabled, ALL assistant messages must include thinking blocks
 * - If previous assistant messages don't have thinking blocks, the API will error
 * - Solution: Only enable thinking on first turn OR when conversation has thinking blocks
 */

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | MessageContent[]
}

export interface MessageContent {
  type: 'text' | 'image' | 'tool_use' | 'tool_result' | 'thinking' | 'redacted_thinking'
  text?: string
  thinking?: string
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

// Triggers for extended thinking mode
const THINK_HARDER_TRIGGERS = [
  'think harder',
  'ultrathink',
  'think deeply',
  'deep analysis',
  'think step by step',
  'reason carefully',
  'extended thinking',
  'think more'
]

// Model mapping - AIBuddy routes to the best model automatically
const MODEL_MAP: Record<string, string> = {
  // Default models
  'auto': 'claude-opus-4-20250514',
  'aibuddy-default': 'claude-opus-4-20250514',
  'aibuddy-pro': 'claude-opus-4-20250514',
  'aibuddy-fast': 'claude-sonnet-4-20250514',
  // Legacy mappings (internal use only)
  'claude-opus-4.5': 'claude-opus-4-20250514',
  'claude-sonnet-4': 'claude-sonnet-4-20250514',
  'deepseek-r1': 'deepseek-reasoner',
  'deepseek-v3': 'deepseek-chat',
  'deepseek-reasoner': 'deepseek-reasoner',
  'deepseek-chat': 'deepseek-chat',
}

/**
 * Get the actual model name from model ID
 */
function getModelName(modelId: string): string {
  if (modelId.startsWith('claude-') || modelId.startsWith('deepseek-')) {
    return modelId
  }
  return MODEL_MAP[modelId] || 'claude-opus-4-20250514'
}

/**
 * Detect task hints for smart routing
 * AIBuddy automatically routes to the best model based on task type
 */
function detectTaskHints(content: string): string[] {
  const hints: string[] = []
  const lowerContent = content.toLowerCase()
  
  // Math/reasoning tasks -> route to reasoning model
  if (/\b(math|calcul|equation|proof|theorem|formula|algebra|geometry|statistics)\b/i.test(lowerContent)) {
    hints.push('math')
  }
  if (/\b(reason|logic|deduc|induc|analyz|think through|step by step)\b/i.test(lowerContent)) {
    hints.push('reasoning')
  }
  
  // Agentic/tool tasks -> route to coding model
  if (/\b(tool|execute|run|file|git|terminal|command|shell)\b/i.test(lowerContent)) {
    hints.push('agentic')
  }
  if (/\b(edit|create|modify|delete|write to|save|update file)\b/i.test(lowerContent)) {
    hints.push('tools')
  }
  
  return hints
}

export class AIBuddyClient {
  // Use AWS ALB endpoint (no timeout limit, same as VS Code extension)
  private baseUrl: string
  private apiKey: string | null = null

  // ALB endpoint - NO timeout limit, can wait for Lambda's full 5-minute timeout
  // API Gateway has 29-second limit which causes timeouts for complex requests
  constructor(baseUrl = 'http://3.136.220.194') {
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
   * Check if extended thinking should be enabled
   * Only enable if user requested it AND (first turn OR history has thinking blocks)
   */
  private shouldEnableThinking(messages: ChatMessage[]): boolean {
    // Check if user requested thinking
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    const userContent = typeof lastUserMessage?.content === 'string'
      ? lastUserMessage.content.toLowerCase()
      : ''
    
    const userRequestedThinking = THINK_HARDER_TRIGGERS.some(t => userContent.includes(t))
    if (!userRequestedThinking) return false
    
    // Check if this is a multi-turn conversation
    const hasAssistantMessages = messages.some(m => m.role === 'assistant')
    if (!hasAssistantMessages) return true // First turn, safe to enable
    
    // Check if history has thinking blocks
    const hasThinkingInHistory = messages.some(m => 
      m.role === 'assistant' &&
      Array.isArray(m.content) &&
      (m.content as MessageContent[]).some(c => 
        c.type === 'thinking' || c.type === 'redacted_thinking'
      )
    )
    
    return hasThinkingInHistory
  }

  /**
   * Send a chat request
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      throw new Error('API key not configured')
    }

    // Determine if extended thinking should be enabled
    const shouldThink = this.shouldEnableThinking(request.messages)
    
    // Build messages with system prompt as first message (AWS Lambda format)
    const messagesWithSystem = request.system
      ? [{ role: 'system' as const, content: request.system }, ...request.messages]
      : request.messages

    // Get the actual model name
    const modelName = getModelName(request.model || 'auto')
    
    // Detect task hints for smart routing
    const lastUserMessage = request.messages.filter(m => m.role === 'user').pop()
    const userContent = typeof lastUserMessage?.content === 'string'
      ? lastUserMessage.content
      : ''
    const taskHints = detectTaskHints(userContent)

    // ALB routes to Lambda at root path (no /v1/inference needed)
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIBuddy-API-Key': apiKey,
        'X-Requested-With': 'AIBuddy-Desktop'
      },
      body: JSON.stringify({
        api_key: apiKey,
        model: modelName,
        messages: messagesWithSystem,
        max_tokens: request.max_tokens || 8192,
        temperature: request.temperature || 0.7,
        thinking: shouldThink ? { type: 'enabled', budget_tokens: 10000 } : undefined,
        task_hints: taskHints.length > 0 ? taskHints : undefined,
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    
    // Transform AWS Lambda response to ChatResponse format
    return {
      id: data.request_id || 'unknown',
      type: 'message',
      role: 'assistant',
      content: data.content || [{ type: 'text', text: data.response }],
      model: data.model,
      stop_reason: data.stop_reason || 'end_turn',
      stop_sequence: null,
      usage: data.usage || { input_tokens: 0, output_tokens: 0 }
    }
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


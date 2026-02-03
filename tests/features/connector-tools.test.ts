import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Connector Tools Architecture Tests - KAN-23
 * 
 * TDD Approach: Tests for multiple AI provider support
 * 
 * Requirements:
 * 1. Support multiple AI providers (Claude, OpenAI, DeepSeek, Local)
 * 2. Provider-specific configuration (API keys, endpoints)
 * 3. Easy switching between providers
 * 4. Unified interface for sending requests
 */

// ============================================================================
// TYPES - AI Provider Architecture
// ============================================================================

type AIProviderType = 'anthropic' | 'openai' | 'deepseek' | 'local' | 'aibuddy'

interface AIProvider {
  id: AIProviderType
  name: string
  description: string
  icon: string
  requiresApiKey: boolean
  models: AIModel[]
  baseUrl?: string
  isEnabled: boolean
}

interface AIModel {
  id: string
  name: string
  provider: AIProviderType
  description: string
  speed: 'fast' | 'medium' | 'slow'
  cost: 'free' | 'low' | 'medium' | 'high'
  maxTokens: number
  supportsVision: boolean
  supportsStreaming: boolean
}

interface ProviderConfig {
  providerId: AIProviderType
  apiKey?: string
  baseUrl?: string
  isDefault: boolean
  customSettings?: Record<string, unknown>
}

interface ConnectorState {
  providers: AIProvider[]
  configs: ProviderConfig[]
  activeProvider: AIProviderType
  activeModel: string
}

// ============================================================================
// MOCK DATA
// ============================================================================

const PROVIDERS: AIProvider[] = [
  {
    id: 'aibuddy',
    name: 'AIBuddy Cloud',
    description: 'Use your AIBuddy credits (recommended)',
    icon: '🤖',
    requiresApiKey: true,
    isEnabled: true,
    models: [
      {
        id: 'auto',
        name: 'Auto (Smart Routing)',
        provider: 'aibuddy',
        description: 'Automatically selects best model',
        speed: 'fast',
        cost: 'low',
        maxTokens: 8192,
        supportsVision: true,
        supportsStreaming: true
      }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Direct Claude API access',
    icon: '🎭',
    requiresApiKey: true,
    isEnabled: true,
    models: [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        description: 'Balanced performance',
        speed: 'medium',
        cost: 'medium',
        maxTokens: 8192,
        supportsVision: true,
        supportsStreaming: true
      },
      {
        id: 'claude-opus-4-20250514',
        name: 'Claude Opus 4',
        provider: 'anthropic',
        description: 'Most capable',
        speed: 'slow',
        cost: 'high',
        maxTokens: 8192,
        supportsVision: true,
        supportsStreaming: true
      }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    description: 'GPT-4 and GPT-3.5',
    icon: '🧠',
    requiresApiKey: true,
    isEnabled: true,
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'Most capable GPT',
        speed: 'medium',
        cost: 'high',
        maxTokens: 8192,
        supportsVision: true,
        supportsStreaming: true
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast and affordable',
        speed: 'fast',
        cost: 'low',
        maxTokens: 8192,
        supportsVision: true,
        supportsStreaming: true
      }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Cost-effective alternative',
    icon: '🔍',
    requiresApiKey: true,
    isEnabled: true,
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek',
        description: 'Fast general chat',
        speed: 'fast',
        cost: 'low',
        maxTokens: 8192,
        supportsVision: false,
        supportsStreaming: true
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        provider: 'deepseek',
        description: 'Better reasoning',
        speed: 'medium',
        cost: 'low',
        maxTokens: 8192,
        supportsVision: false,
        supportsStreaming: true
      }
    ]
  },
  {
    id: 'local',
    name: 'Local (Ollama)',
    description: 'Run models locally',
    icon: '💻',
    requiresApiKey: false,
    baseUrl: 'http://localhost:11434',
    isEnabled: false,
    models: [
      {
        id: 'llama3',
        name: 'Llama 3',
        provider: 'local',
        description: 'Open source model',
        speed: 'medium',
        cost: 'free',
        maxTokens: 4096,
        supportsVision: false,
        supportsStreaming: true
      }
    ]
  }
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getProviderById(id: AIProviderType): AIProvider | undefined {
  return PROVIDERS.find(p => p.id === id)
}

function getModelById(modelId: string): AIModel | undefined {
  for (const provider of PROVIDERS) {
    const model = provider.models.find(m => m.id === modelId)
    if (model) return model
  }
  return undefined
}

function getProviderForModel(modelId: string): AIProvider | undefined {
  for (const provider of PROVIDERS) {
    if (provider.models.some(m => m.id === modelId)) {
      return provider
    }
  }
  return undefined
}

function getAllModels(): AIModel[] {
  return PROVIDERS.flatMap(p => p.models)
}

function getEnabledProviders(): AIProvider[] {
  return PROVIDERS.filter(p => p.isEnabled)
}

function validateApiKey(apiKey: string, provider: AIProviderType): boolean {
  if (!apiKey || apiKey.trim() === '') return false
  
  // Provider-specific validation patterns
  const patterns: Record<AIProviderType, RegExp> = {
    aibuddy: /^aibuddy_[a-f0-9]{64}$/,
    anthropic: /^sk-ant-[a-zA-Z0-9-_]+$/,
    openai: /^sk-[a-zA-Z0-9-_]+$/,
    deepseek: /^sk-[a-zA-Z0-9-_]+$/,
    local: /.*/ // No validation for local
  }
  
  return patterns[provider].test(apiKey)
}

function buildRequestHeaders(config: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (config.apiKey) {
    switch (config.providerId) {
      case 'anthropic':
        headers['x-api-key'] = config.apiKey
        headers['anthropic-version'] = '2023-06-01'
        break
      case 'openai':
        headers['Authorization'] = `Bearer ${config.apiKey}`
        break
      case 'deepseek':
        headers['Authorization'] = `Bearer ${config.apiKey}`
        break
      case 'aibuddy':
        headers['x-api-key'] = config.apiKey
        break
    }
  }
  
  return headers
}

function getEndpointUrl(provider: AIProviderType, config?: ProviderConfig): string {
  const endpoints: Record<AIProviderType, string> = {
    aibuddy: 'https://api-prod-lb-1594971612.us-east-2.elb.amazonaws.com/inference',
    anthropic: 'https://api.anthropic.com/v1/messages',
    openai: 'https://api.openai.com/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    local: config?.baseUrl || 'http://localhost:11434/api/chat'
  }
  
  return config?.baseUrl || endpoints[provider]
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// TESTS
// ============================================================================

describe('Connector Tools Architecture - KAN-23', () => {
  // ==========================================================================
  // 1. PROVIDER REGISTRY
  // ==========================================================================
  describe('Provider Registry', () => {
    it('should have all expected providers', () => {
      expect(PROVIDERS).toHaveLength(5)
      expect(PROVIDERS.map(p => p.id)).toContain('aibuddy')
      expect(PROVIDERS.map(p => p.id)).toContain('anthropic')
      expect(PROVIDERS.map(p => p.id)).toContain('openai')
      expect(PROVIDERS.map(p => p.id)).toContain('deepseek')
      expect(PROVIDERS.map(p => p.id)).toContain('local')
    })

    it('should get provider by id', () => {
      const anthropic = getProviderById('anthropic')
      expect(anthropic).toBeDefined()
      expect(anthropic?.name).toBe('Anthropic (Claude)')
    })

    it('should return undefined for unknown provider', () => {
      const unknown = getProviderById('unknown' as AIProviderType)
      expect(unknown).toBeUndefined()
    })

    it('should get enabled providers only', () => {
      const enabled = getEnabledProviders()
      expect(enabled.every(p => p.isEnabled)).toBe(true)
      expect(enabled.some(p => p.id === 'local')).toBe(false)
    })
  })

  // ==========================================================================
  // 2. MODEL MANAGEMENT
  // ==========================================================================
  describe('Model Management', () => {
    it('should get model by id', () => {
      const model = getModelById('claude-sonnet-4-20250514')
      expect(model).toBeDefined()
      expect(model?.name).toBe('Claude Sonnet 4')
      expect(model?.provider).toBe('anthropic')
    })

    it('should get provider for model', () => {
      const provider = getProviderForModel('gpt-4o')
      expect(provider).toBeDefined()
      expect(provider?.id).toBe('openai')
    })

    it('should get all models from all providers', () => {
      const allModels = getAllModels()
      expect(allModels.length).toBeGreaterThan(5)
      expect(allModels.some(m => m.provider === 'anthropic')).toBe(true)
      expect(allModels.some(m => m.provider === 'openai')).toBe(true)
    })

    it('should include model capabilities', () => {
      const model = getModelById('gpt-4o')
      expect(model?.supportsVision).toBe(true)
      expect(model?.supportsStreaming).toBe(true)
      expect(model?.maxTokens).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // 3. API KEY VALIDATION
  // ==========================================================================
  describe('API Key Validation', () => {
    it('should validate AIBuddy API key format', () => {
      const validKey = 'aibuddy_' + 'a'.repeat(64)
      expect(validateApiKey(validKey, 'aibuddy')).toBe(true)
      expect(validateApiKey('invalid', 'aibuddy')).toBe(false)
    })

    it('should validate Anthropic API key format', () => {
      expect(validateApiKey('sk-ant-abc123', 'anthropic')).toBe(true)
      expect(validateApiKey('wrong-format', 'anthropic')).toBe(false)
    })

    it('should validate OpenAI API key format', () => {
      expect(validateApiKey('sk-abc123xyz', 'openai')).toBe(true)
      expect(validateApiKey('wrong', 'openai')).toBe(false)
    })

    it('should reject empty API keys', () => {
      expect(validateApiKey('', 'anthropic')).toBe(false)
      expect(validateApiKey('   ', 'openai')).toBe(false)
    })

    it('should allow any key for local provider', () => {
      expect(validateApiKey('anything', 'local')).toBe(true)
      expect(validateApiKey('', 'local')).toBe(false) // Still needs non-empty
    })
  })

  // ==========================================================================
  // 4. REQUEST HEADERS
  // ==========================================================================
  describe('Request Headers', () => {
    it('should build Anthropic headers', () => {
      const config: ProviderConfig = {
        providerId: 'anthropic',
        apiKey: 'sk-ant-test123',
        isDefault: false
      }
      
      const headers = buildRequestHeaders(config)
      expect(headers['x-api-key']).toBe('sk-ant-test123')
      expect(headers['anthropic-version']).toBe('2023-06-01')
    })

    it('should build OpenAI headers', () => {
      const config: ProviderConfig = {
        providerId: 'openai',
        apiKey: 'sk-test123',
        isDefault: false
      }
      
      const headers = buildRequestHeaders(config)
      expect(headers['Authorization']).toBe('Bearer sk-test123')
    })

    it('should build AIBuddy headers', () => {
      const config: ProviderConfig = {
        providerId: 'aibuddy',
        apiKey: 'aibuddy_test',
        isDefault: true
      }
      
      const headers = buildRequestHeaders(config)
      expect(headers['x-api-key']).toBe('aibuddy_test')
    })

    it('should always include Content-Type', () => {
      const config: ProviderConfig = {
        providerId: 'local',
        isDefault: false
      }
      
      const headers = buildRequestHeaders(config)
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  // ==========================================================================
  // 5. ENDPOINT URLS
  // ==========================================================================
  describe('Endpoint URLs', () => {
    it('should return correct AIBuddy endpoint', () => {
      const url = getEndpointUrl('aibuddy')
      expect(url).toContain('amazonaws.com')
      expect(url).toContain('/inference')
    })

    it('should return correct Anthropic endpoint', () => {
      const url = getEndpointUrl('anthropic')
      expect(url).toBe('https://api.anthropic.com/v1/messages')
    })

    it('should return correct OpenAI endpoint', () => {
      const url = getEndpointUrl('openai')
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('should use custom base URL when provided', () => {
      const config: ProviderConfig = {
        providerId: 'local',
        baseUrl: 'http://192.168.1.100:11434',
        isDefault: false
      }
      
      const url = getEndpointUrl('local', config)
      expect(url).toBe('http://192.168.1.100:11434')
    })

    it('should use default localhost for local provider', () => {
      const url = getEndpointUrl('local')
      expect(url).toContain('localhost:11434')
    })
  })

  // ==========================================================================
  // 6. CONNECTOR STATE
  // ==========================================================================
  describe('Connector State', () => {
    it('should have valid initial state', () => {
      const state: ConnectorState = {
        providers: PROVIDERS,
        configs: [],
        activeProvider: 'aibuddy',
        activeModel: 'auto'
      }
      
      expect(state.providers.length).toBeGreaterThan(0)
      expect(state.activeProvider).toBe('aibuddy')
      expect(state.activeModel).toBe('auto')
    })

    it('should store multiple provider configs', () => {
      const configs: ProviderConfig[] = [
        { providerId: 'aibuddy', apiKey: 'aibuddy_key', isDefault: true },
        { providerId: 'anthropic', apiKey: 'sk-ant-key', isDefault: false },
        { providerId: 'openai', apiKey: 'sk-openai-key', isDefault: false }
      ]
      
      expect(configs).toHaveLength(3)
      expect(configs.filter(c => c.isDefault)).toHaveLength(1)
    })

    it('should switch active provider', () => {
      let state: ConnectorState = {
        providers: PROVIDERS,
        configs: [],
        activeProvider: 'aibuddy',
        activeModel: 'auto'
      }
      
      // Switch to OpenAI
      state = { ...state, activeProvider: 'openai', activeModel: 'gpt-4o' }
      
      expect(state.activeProvider).toBe('openai')
      expect(state.activeModel).toBe('gpt-4o')
    })
  })

  // ==========================================================================
  // 7. PROVIDER FEATURES
  // ==========================================================================
  describe('Provider Features', () => {
    it('should indicate if provider requires API key', () => {
      const anthropic = getProviderById('anthropic')
      const local = getProviderById('local')
      
      expect(anthropic?.requiresApiKey).toBe(true)
      expect(local?.requiresApiKey).toBe(false)
    })

    it('should have provider icons', () => {
      PROVIDERS.forEach(provider => {
        expect(provider.icon).toBeDefined()
        expect(provider.icon.length).toBeGreaterThan(0)
      })
    })

    it('should have provider descriptions', () => {
      PROVIDERS.forEach(provider => {
        expect(provider.description).toBeDefined()
        expect(provider.description.length).toBeGreaterThan(0)
      })
    })
  })

  // ==========================================================================
  // 8. MODEL CAPABILITIES
  // ==========================================================================
  describe('Model Capabilities', () => {
    it('should identify vision-capable models', () => {
      const visionModels = getAllModels().filter(m => m.supportsVision)
      expect(visionModels.length).toBeGreaterThan(0)
      expect(visionModels.some(m => m.provider === 'anthropic')).toBe(true)
      expect(visionModels.some(m => m.provider === 'openai')).toBe(true)
    })

    it('should identify streaming-capable models', () => {
      const streamingModels = getAllModels().filter(m => m.supportsStreaming)
      expect(streamingModels.length).toBeGreaterThan(0)
    })

    it('should have valid cost tiers', () => {
      const validCosts = ['free', 'low', 'medium', 'high']
      getAllModels().forEach(model => {
        expect(validCosts).toContain(model.cost)
      })
    })

    it('should have valid speed tiers', () => {
      const validSpeeds = ['fast', 'medium', 'slow']
      getAllModels().forEach(model => {
        expect(validSpeeds).toContain(model.speed)
      })
    })
  })

  // ==========================================================================
  // 9. PERSISTENCE
  // ==========================================================================
  describe('Persistence', () => {
    it('should serialize provider config to JSON', () => {
      const config: ProviderConfig = {
        providerId: 'anthropic',
        apiKey: 'sk-ant-test',
        isDefault: false,
        customSettings: { temperature: 0.7 }
      }
      
      const json = JSON.stringify(config)
      const parsed = JSON.parse(json)
      
      expect(parsed.providerId).toBe('anthropic')
      expect(parsed.customSettings?.temperature).toBe(0.7)
    })

    it('should restore configs from storage', () => {
      const savedConfigs = JSON.stringify([
        { providerId: 'aibuddy', apiKey: 'key1', isDefault: true },
        { providerId: 'openai', apiKey: 'key2', isDefault: false }
      ])
      
      const restored: ProviderConfig[] = JSON.parse(savedConfigs)
      expect(restored).toHaveLength(2)
      expect(restored[0].isDefault).toBe(true)
    })
  })

  // ==========================================================================
  // 10. UI HELPERS
  // ==========================================================================
  describe('UI Helpers', () => {
    it('should group models by provider', () => {
      const grouped = PROVIDERS.reduce((acc, provider) => {
        acc[provider.id] = provider.models
        return acc
      }, {} as Record<string, AIModel[]>)
      
      expect(Object.keys(grouped)).toHaveLength(5)
      expect(grouped['anthropic'].length).toBeGreaterThan(0)
    })

    it('should filter models by capability', () => {
      const visionModels = getAllModels().filter(m => m.supportsVision)
      const freeModels = getAllModels().filter(m => m.cost === 'free')
      const fastModels = getAllModels().filter(m => m.speed === 'fast')
      
      expect(visionModels.length).toBeGreaterThan(0)
      expect(freeModels.length).toBeGreaterThan(0) // Local models
      expect(fastModels.length).toBeGreaterThan(0)
    })

    it('should sort models by cost', () => {
      const costOrder = { free: 0, low: 1, medium: 2, high: 3 }
      const sorted = getAllModels().sort((a, b) => costOrder[a.cost] - costOrder[b.cost])
      
      expect(sorted[0].cost).toBe('free')
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================
describe('Connector Integration', () => {
  it('should build complete request for Anthropic', () => {
    const config: ProviderConfig = {
      providerId: 'anthropic',
      apiKey: 'sk-ant-test',
      isDefault: false
    }
    
    const headers = buildRequestHeaders(config)
    const url = getEndpointUrl('anthropic', config)
    
    expect(headers['x-api-key']).toBeDefined()
    expect(url).toContain('anthropic.com')
  })

  it('should build complete request for OpenAI', () => {
    const config: ProviderConfig = {
      providerId: 'openai',
      apiKey: 'sk-openai-test',
      isDefault: false
    }
    
    const headers = buildRequestHeaders(config)
    const url = getEndpointUrl('openai', config)
    
    expect(headers['Authorization']).toContain('Bearer')
    expect(url).toContain('openai.com')
  })

  it('should handle provider switching with model reset', () => {
    let activeProvider: AIProviderType = 'aibuddy'
    let activeModel = 'auto'
    
    // Switch to OpenAI
    activeProvider = 'openai'
    const openaiProvider = getProviderById('openai')
    activeModel = openaiProvider?.models[0]?.id || 'gpt-4o'
    
    expect(activeProvider).toBe('openai')
    expect(activeModel).toBe('gpt-4o')
    
    // Switch to Anthropic
    activeProvider = 'anthropic'
    const anthropicProvider = getProviderById('anthropic')
    activeModel = anthropicProvider?.models[0]?.id || 'claude-sonnet-4-20250514'
    
    expect(activeProvider).toBe('anthropic')
    expect(activeModel).toBe('claude-sonnet-4-20250514')
  })
})

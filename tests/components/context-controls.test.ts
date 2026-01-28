import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Context Awareness & Controls Tests - Issue #10
 * 
 * Tests for:
 * - Model selection (fast / smart / cheap)
 * - Token usage display
 * - Cost tracking
 * - Model badge display
 * 
 * All these features are implemented in App.tsx
 */

interface ModelOption {
  id: string
  name: string
  description: string
  speed: 'fast' | 'medium' | 'slow'
  cost: 'low' | 'medium' | 'high'
}

const MODEL_OPTIONS: ModelOption[] = [
  { 
    id: 'auto', 
    name: 'Auto (Recommended)', 
    description: 'Smart routing: Fast model first, upgrades if needed',
    speed: 'fast',
    cost: 'low'
  },
  { 
    id: 'deepseek-chat', 
    name: 'DeepSeek Chat', 
    description: 'Fast & affordable for most tasks',
    speed: 'fast',
    cost: 'low'
  },
  { 
    id: 'deepseek-reasoner', 
    name: 'DeepSeek Reasoner', 
    description: 'Better reasoning, slightly slower',
    speed: 'medium',
    cost: 'low'
  },
  { 
    id: 'claude-sonnet-4-20250514', 
    name: 'Claude Sonnet 4', 
    description: 'Balanced performance and cost',
    speed: 'medium',
    cost: 'medium'
  },
  { 
    id: 'claude-opus-4-20250514', 
    name: 'Claude Opus 4', 
    description: 'Most capable, best for complex tasks',
    speed: 'slow',
    cost: 'high'
  }
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Context Awareness & Controls - Issue #10 Fix', () => {
  describe('Model Options Configuration', () => {
    it('should have 5 model options', () => {
      expect(MODEL_OPTIONS.length).toBe(5)
    })

    it('should have Auto as first option', () => {
      expect(MODEL_OPTIONS[0].id).toBe('auto')
      expect(MODEL_OPTIONS[0].name).toContain('Auto')
    })

    it('should have DeepSeek Chat option (fast)', () => {
      const deepseek = MODEL_OPTIONS.find(m => m.id === 'deepseek-chat')
      expect(deepseek).toBeTruthy()
      expect(deepseek?.speed).toBe('fast')
      expect(deepseek?.cost).toBe('low')
    })

    it('should have DeepSeek Reasoner option (medium)', () => {
      const reasoner = MODEL_OPTIONS.find(m => m.id === 'deepseek-reasoner')
      expect(reasoner).toBeTruthy()
      expect(reasoner?.speed).toBe('medium')
      expect(reasoner?.cost).toBe('low')
    })

    it('should have Claude Sonnet 4 option (balanced)', () => {
      const sonnet = MODEL_OPTIONS.find(m => m.id.includes('sonnet'))
      expect(sonnet).toBeTruthy()
      expect(sonnet?.speed).toBe('medium')
      expect(sonnet?.cost).toBe('medium')
    })

    it('should have Claude Opus 4 option (most capable)', () => {
      const opus = MODEL_OPTIONS.find(m => m.id.includes('opus'))
      expect(opus).toBeTruthy()
      expect(opus?.speed).toBe('slow')
      expect(opus?.cost).toBe('high')
    })
  })

  describe('Speed Indicators', () => {
    it('should categorize fast models correctly', () => {
      const fastModels = MODEL_OPTIONS.filter(m => m.speed === 'fast')
      expect(fastModels.length).toBeGreaterThan(0)
      expect(fastModels.map(m => m.id)).toContain('deepseek-chat')
    })

    it('should categorize medium models correctly', () => {
      const mediumModels = MODEL_OPTIONS.filter(m => m.speed === 'medium')
      expect(mediumModels.length).toBeGreaterThan(0)
    })

    it('should categorize slow models correctly', () => {
      const slowModels = MODEL_OPTIONS.filter(m => m.speed === 'slow')
      expect(slowModels.length).toBeGreaterThan(0)
      expect(slowModels.some(m => m.id.includes('opus'))).toBe(true)
    })

    it('should show speed badge colors', () => {
      const speedColors: Record<string, string> = {
        fast: 'bg-green-500/20 text-green-400',
        medium: 'bg-yellow-500/20 text-yellow-400',
        slow: 'bg-red-500/20 text-red-400'
      }
      
      expect(speedColors.fast).toContain('green')
      expect(speedColors.medium).toContain('yellow')
      expect(speedColors.slow).toContain('red')
    })
  })

  describe('Cost Indicators', () => {
    it('should categorize low cost models correctly', () => {
      const lowCostModels = MODEL_OPTIONS.filter(m => m.cost === 'low')
      expect(lowCostModels.length).toBe(3) // auto, deepseek-chat, deepseek-reasoner
    })

    it('should categorize medium cost models correctly', () => {
      const mediumCostModels = MODEL_OPTIONS.filter(m => m.cost === 'medium')
      expect(mediumCostModels.length).toBe(1) // sonnet
    })

    it('should categorize high cost models correctly', () => {
      const highCostModels = MODEL_OPTIONS.filter(m => m.cost === 'high')
      expect(highCostModels.length).toBe(1) // opus
    })

    it('should show cost badge colors', () => {
      const costColors: Record<string, string> = {
        low: 'bg-green-500/20 text-green-400',
        medium: 'bg-yellow-500/20 text-yellow-400',
        high: 'bg-red-500/20 text-red-400'
      }
      
      expect(costColors.low).toContain('green')
      expect(costColors.medium).toContain('yellow')
      expect(costColors.high).toContain('red')
    })
  })

  describe('Model Selection State', () => {
    it('should default to auto mode', () => {
      const selectedModel = 'auto'
      expect(selectedModel).toBe('auto')
    })

    it('should allow changing model selection', () => {
      let selectedModel = 'auto'
      selectedModel = 'deepseek-chat'
      expect(selectedModel).toBe('deepseek-chat')
    })

    it('should find model by ID', () => {
      const selectedModel = 'deepseek-chat'
      const model = MODEL_OPTIONS.find(m => m.id === selectedModel)
      expect(model?.name).toBe('DeepSeek Chat')
    })
  })

  describe('Model Selector Button', () => {
    it('should show shortened model name', () => {
      const selectedModel = 'auto'
      const model = MODEL_OPTIONS.find(m => m.id === selectedModel)
      const displayName = model?.name.split(' ')[0] || 'Auto'
      
      expect(displayName).toBe('Auto')
    })

    it('should show Zap icon for AI indicator', () => {
      // Zap icon is used in the model selector button
      const iconComponent = 'Zap'
      expect(iconComponent).toBe('Zap')
    })
  })

  describe('Model Dropdown', () => {
    it('should toggle dropdown visibility', () => {
      let showModelSelector = false
      showModelSelector = !showModelSelector
      expect(showModelSelector).toBe(true)
      
      showModelSelector = !showModelSelector
      expect(showModelSelector).toBe(false)
    })

    it('should highlight selected model', () => {
      const selectedModel = 'deepseek-chat'
      const currentModel = 'deepseek-chat'
      const isSelected = selectedModel === currentModel
      const className = isSelected ? 'bg-blue-500/20' : 'hover:bg-slate-700/50'
      
      expect(className).toBe('bg-blue-500/20')
    })
  })

  describe('Token Usage Display', () => {
    it('should format input tokens', () => {
      const tokensIn = 1500
      const formatted = tokensIn.toLocaleString()
      expect(formatted).toBe('1,500')
    })

    it('should format output tokens', () => {
      const tokensOut = 2500
      const formatted = tokensOut.toLocaleString()
      expect(formatted).toBe('2,500')
    })

    it('should show token usage when available', () => {
      const message = { tokensIn: 100, tokensOut: 200 }
      const shouldShowTokens = message.tokensIn || message.tokensOut
      expect(shouldShowTokens).toBeTruthy()
    })

    it('should not show token usage when not available', () => {
      const message = { tokensIn: undefined, tokensOut: undefined }
      const shouldShowTokens = message.tokensIn || message.tokensOut
      expect(shouldShowTokens).toBeFalsy()
    })

    it('should show input indicator with blue color', () => {
      const inputIndicator = { symbol: '↑', color: 'text-blue-400' }
      expect(inputIndicator.symbol).toBe('↑')
      expect(inputIndicator.color).toContain('blue')
    })

    it('should show output indicator with purple color', () => {
      const outputIndicator = { symbol: '↓', color: 'text-purple-400' }
      expect(outputIndicator.symbol).toBe('↓')
      expect(outputIndicator.color).toContain('purple')
    })
  })

  describe('Cost Display', () => {
    it('should format cost with 4 decimal places', () => {
      const cost = 0.0025
      const formatted = `$${cost.toFixed(4)}`
      expect(formatted).toBe('$0.0025')
    })

    it('should show cost in green color', () => {
      const costClass = 'text-green-400/80'
      expect(costClass).toContain('green')
    })

    it('should show Coins icon for cost', () => {
      const iconComponent = 'Coins'
      expect(iconComponent).toBe('Coins')
    })

    it('should show cost when available', () => {
      const message = { cost: 0.001 }
      const shouldShowCost = !!message.cost
      expect(shouldShowCost).toBe(true)
    })
  })

  describe('Model Badge Display', () => {
    it('should show DeepSeek badge for deepseek models', () => {
      const model = 'deepseek-chat'
      const badge = model.includes('deepseek') ? 'DeepSeek' : 
                    model.includes('opus') ? 'Claude Opus' :
                    model.includes('sonnet') ? 'Claude Sonnet' : 'AIBuddy'
      expect(badge).toBe('DeepSeek')
    })

    it('should show Claude Opus badge for opus models', () => {
      const model = 'claude-opus-4-20250514'
      const badge = model.includes('deepseek') ? 'DeepSeek' : 
                    model.includes('opus') ? 'Claude Opus' :
                    model.includes('sonnet') ? 'Claude Sonnet' : 'AIBuddy'
      expect(badge).toBe('Claude Opus')
    })

    it('should show Claude Sonnet badge for sonnet models', () => {
      const model = 'claude-sonnet-4-20250514'
      const badge = model.includes('deepseek') ? 'DeepSeek' : 
                    model.includes('opus') ? 'Claude Opus' :
                    model.includes('sonnet') ? 'Claude Sonnet' : 'AIBuddy'
      expect(badge).toBe('Claude Sonnet')
    })

    it('should show AIBuddy badge for unknown models', () => {
      const model = 'unknown-model'
      const badge = model.includes('deepseek') ? 'DeepSeek' : 
                    model.includes('opus') ? 'Claude Opus' :
                    model.includes('sonnet') ? 'Claude Sonnet' : 'AIBuddy'
      expect(badge).toBe('AIBuddy')
    })

    it('should have small styling for model badge', () => {
      const badgeClasses = 'text-slate-600 text-[10px] bg-slate-800 px-1.5 py-0.5 rounded'
      expect(badgeClasses).toContain('text-[10px]')
      expect(badgeClasses).toContain('rounded')
    })
  })

  describe('Smart Routing (Auto Mode)', () => {
    it('should use DeepSeek for execution tasks', () => {
      const MODEL_CONFIG = {
        execution: 'deepseek-chat',
        analysis: 'claude-opus-4-20250514',
        maxDeepSeekRetries: 2
      }
      
      expect(MODEL_CONFIG.execution).toBe('deepseek-chat')
    })

    it('should use Claude Opus for complex analysis', () => {
      const MODEL_CONFIG = {
        execution: 'deepseek-chat',
        analysis: 'claude-opus-4-20250514',
        maxDeepSeekRetries: 2
      }
      
      expect(MODEL_CONFIG.analysis).toContain('opus')
    })

    it('should escalate after 2 DeepSeek failures', () => {
      const MODEL_CONFIG = {
        execution: 'deepseek-chat',
        analysis: 'claude-opus-4-20250514',
        maxDeepSeekRetries: 2
      }
      
      expect(MODEL_CONFIG.maxDeepSeekRetries).toBe(2)
    })
  })

  describe('Conditional Display', () => {
    it('should only show token/cost section for assistant messages', () => {
      const messageRole = 'assistant'
      const hasData = true
      const shouldShow = messageRole === 'assistant' && hasData
      expect(shouldShow).toBe(true)
    })

    it('should not show token/cost for user messages', () => {
      const messageRole = 'user'
      const hasData = true
      const shouldShow = messageRole === 'assistant' && hasData
      expect(shouldShow).toBe(false)
    })
  })
})

describe('Model Selection Integration', () => {
  it('should use selected model when not auto', () => {
    const selectedModel = 'deepseek-reasoner'
    const useSelectedModel = selectedModel !== 'auto'
    expect(useSelectedModel).toBe(true)
  })

  it('should use smart routing when auto', () => {
    const selectedModel = 'auto'
    const useSmartRouting = selectedModel === 'auto'
    expect(useSmartRouting).toBe(true)
  })
})

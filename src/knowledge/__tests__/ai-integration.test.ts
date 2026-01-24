/**
 * AI Integration Tests (TDD)
 * 
 * Tests for AI context injection, SSH connection capability,
 * and quick actions from the knowledge base.
 * 
 * Following TDD: Write tests FIRST, then implement to pass.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  AIContextGenerator, 
  SSHConnectionManager, 
  QuickActionManager,
  type AIContext,
  type SSHConnectionResult,
  type QuickAction,
} from '../ai-integration'

// =============================================================================
// AI Context Generator Tests
// =============================================================================

describe('AIContextGenerator', () => {
  let generator: AIContextGenerator

  beforeEach(() => {
    generator = new AIContextGenerator()
  })

  describe('generateContext', () => {
    it('should return empty context when no providers', () => {
      const context = generator.generateContext([])
      
      expect(context.hasContext).toBe(false)
      expect(context.systemPromptAddition).toBe('')
    })

    it('should generate context from providers', () => {
      const providers = [{
        id: 'p1',
        type: 'aws' as const,
        name: 'Production AWS',
        servers: [{
          id: 's1',
          name: 'Web Server',
          ip: '10.0.0.1',
          sshUser: 'ubuntu',
          sshPort: 22,
        }],
      }]
      
      const context = generator.generateContext(providers)
      
      expect(context.hasContext).toBe(true)
      expect(context.systemPromptAddition).toContain('Production AWS')
      expect(context.systemPromptAddition).toContain('Web Server')
      expect(context.systemPromptAddition).toContain('10.0.0.1')
    })

    it('should include SSH commands in context', () => {
      const providers = [{
        id: 'p1',
        type: 'aws' as const,
        name: 'AWS',
        servers: [{
          id: 's1',
          name: 'Server',
          ip: '10.0.0.1',
          sshUser: 'ubuntu',
          sshPort: 22,
          sshCommand: 'ssh ubuntu@10.0.0.1',
        }],
      }]
      
      const context = generator.generateContext(providers)
      
      expect(context.systemPromptAddition).toContain('ssh ubuntu@10.0.0.1')
    })

    it('should include domains in context', () => {
      const providers = [{
        id: 'p1',
        type: 'aws' as const,
        name: 'AWS',
        servers: [{
          id: 's1',
          name: 'Server',
          ip: '10.0.0.1',
          sshUser: 'ubuntu',
          sshPort: 22,
          domain: 'example.com',
        }],
      }]
      
      const context = generator.generateContext(providers)
      
      expect(context.systemPromptAddition).toContain('example.com')
    })

    it('should include account IDs in context', () => {
      const providers = [{
        id: 'p1',
        type: 'aws' as const,
        name: 'AWS',
        connection: {
          type: 'api' as const,
          accountId: '123456789012',
          region: 'us-east-1',
        },
        servers: [],
      }]
      
      const context = generator.generateContext(providers)
      
      expect(context.systemPromptAddition).toContain('123456789012')
      expect(context.systemPromptAddition).toContain('us-east-1')
    })

    it('should format context as markdown', () => {
      const providers = [{
        id: 'p1',
        type: 'aws' as const,
        name: 'AWS',
        servers: [{
          id: 's1',
          name: 'Server',
          ip: '10.0.0.1',
          sshUser: 'ubuntu',
          sshPort: 22,
        }],
      }]
      
      const context = generator.generateContext(providers)
      
      // Should have markdown headers
      expect(context.systemPromptAddition).toMatch(/^##/m)
    })

    it('should include provider emoji', () => {
      const providers = [{
        id: 'p1',
        type: 'aws' as const,
        name: 'AWS',
        emoji: '☁️',
        servers: [],
      }]
      
      const context = generator.generateContext(providers)
      
      expect(context.systemPromptAddition).toContain('☁️')
    })
  })

  describe('getRelevantContext', () => {
    const providers = [
      {
        id: 'p1',
        type: 'aws' as const,
        name: 'Production AWS',
        servers: [{
          id: 's1',
          name: 'Web Server',
          ip: '10.0.0.1',
          sshUser: 'ubuntu',
          sshPort: 22,
          domain: 'example.com',
        }],
      },
      {
        id: 'p2',
        type: 'digitalocean' as const,
        name: 'Staging DigitalOcean',
        servers: [{
          id: 's2',
          name: 'API Server',
          ip: '10.0.0.2',
          sshUser: 'root',
          sshPort: 22,
        }],
      },
    ]

    it('should return relevant context for AWS query', () => {
      const context = generator.getRelevantContext('Check AWS logs', providers)
      
      expect(context).toContain('Production AWS')
      expect(context).not.toContain('DigitalOcean')
    })

    it('should return relevant context for server name query', () => {
      const context = generator.getRelevantContext('Check the web server', providers)
      
      expect(context).toContain('Web Server')
    })

    it('should return relevant context for domain query', () => {
      const context = generator.getRelevantContext('Check example.com', providers)
      
      expect(context).toContain('example.com')
    })

    it('should return all context for infrastructure keywords', () => {
      const context = generator.getRelevantContext('Check server logs', providers)
      
      // Should include all servers when generic "server" is mentioned
      expect(context).toContain('Web Server')
      expect(context).toContain('API Server')
    })

    it('should return empty for unrelated queries', () => {
      const context = generator.getRelevantContext('What is the weather?', providers)
      
      expect(context).toBe('')
    })

    it('should be case insensitive', () => {
      const context = generator.getRelevantContext('check AWS LOGS', providers)
      
      expect(context).toContain('Production AWS')
    })
  })

  describe('buildSystemPrompt', () => {
    it('should append context to base prompt', () => {
      const basePrompt = 'You are AIBuddy, a coding assistant.'
      const providers = [{
        id: 'p1',
        type: 'aws' as const,
        name: 'AWS',
        servers: [{
          id: 's1',
          name: 'Server',
          ip: '10.0.0.1',
          sshUser: 'ubuntu',
          sshPort: 22,
        }],
      }]
      
      const fullPrompt = generator.buildSystemPrompt(basePrompt, providers)
      
      expect(fullPrompt).toContain(basePrompt)
      expect(fullPrompt).toContain('AWS')
      expect(fullPrompt).toContain('10.0.0.1')
    })

    it('should not modify base prompt when no context', () => {
      const basePrompt = 'You are AIBuddy, a coding assistant.'
      
      const fullPrompt = generator.buildSystemPrompt(basePrompt, [])
      
      expect(fullPrompt).toBe(basePrompt)
    })

    it('should include infrastructure section header', () => {
      const basePrompt = 'You are AIBuddy.'
      const providers = [{
        id: 'p1',
        type: 'aws' as const,
        name: 'AWS',
        servers: [],
      }]
      
      const fullPrompt = generator.buildSystemPrompt(basePrompt, providers)
      
      expect(fullPrompt).toContain('INFRASTRUCTURE')
    })
  })
})

// =============================================================================
// SSH Connection Manager Tests
// =============================================================================

describe('SSHConnectionManager', () => {
  let manager: SSHConnectionManager

  beforeEach(() => {
    manager = new SSHConnectionManager()
  })

  describe('generateSshCommand', () => {
    it('should generate basic SSH command', () => {
      const server = {
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 22,
      }
      
      const cmd = manager.generateSshCommand(server)
      
      expect(cmd).toBe('ssh ubuntu@10.0.0.1')
    })

    it('should include key path', () => {
      const server = {
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 22,
        sshKeyPath: '~/.ssh/key.pem',
      }
      
      const cmd = manager.generateSshCommand(server)
      
      expect(cmd).toBe('ssh -i "~/.ssh/key.pem" ubuntu@10.0.0.1')
    })

    it('should include non-default port', () => {
      const server = {
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 2222,
      }
      
      const cmd = manager.generateSshCommand(server)
      
      expect(cmd).toBe('ssh -p 2222 ubuntu@10.0.0.1')
    })

    it('should include both key and port', () => {
      const server = {
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 2222,
        sshKeyPath: '~/.ssh/key.pem',
      }
      
      const cmd = manager.generateSshCommand(server)
      
      expect(cmd).toBe('ssh -i "~/.ssh/key.pem" -p 2222 ubuntu@10.0.0.1')
    })

    it('should use stored sshCommand if available', () => {
      const server = {
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 22,
        sshCommand: 'ssh -o StrictHostKeyChecking=no ubuntu@10.0.0.1',
      }
      
      const cmd = manager.generateSshCommand(server)
      
      expect(cmd).toBe('ssh -o StrictHostKeyChecking=no ubuntu@10.0.0.1')
    })
  })

  describe('copyToClipboard', () => {
    it('should return success result', async () => {
      const result = await manager.copyToClipboard('ssh ubuntu@10.0.0.1')
      
      expect(result.success).toBe(true)
      expect(result.command).toBe('ssh ubuntu@10.0.0.1')
    })

    it('should include copied message', async () => {
      const result = await manager.copyToClipboard('ssh ubuntu@10.0.0.1')
      
      expect(result.message).toContain('copied')
    })
  })

  describe('getConnectionOptions', () => {
    it('should return terminal and clipboard options', () => {
      const options = manager.getConnectionOptions()
      
      expect(options).toContain('terminal')
      expect(options).toContain('clipboard')
    })
  })

  describe('formatServerInfo', () => {
    it('should format server info for display', () => {
      const server = {
        name: 'Production',
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 22,
        domain: 'example.com',
      }
      
      const info = manager.formatServerInfo(server)
      
      expect(info).toContain('Production')
      expect(info).toContain('10.0.0.1')
      expect(info).toContain('ubuntu')
      expect(info).toContain('example.com')
    })
  })
})

// =============================================================================
// Quick Action Manager Tests
// =============================================================================

describe('QuickActionManager', () => {
  let manager: QuickActionManager

  beforeEach(() => {
    manager = new QuickActionManager()
  })

  describe('getDefaultActions', () => {
    it('should return default actions for AWS', () => {
      const actions = manager.getDefaultActions('aws')
      
      expect(actions.length).toBeGreaterThan(0)
      expect(actions.some(a => a.id.includes('aws'))).toBe(true)
    })

    it('should return default actions for DigitalOcean', () => {
      const actions = manager.getDefaultActions('digitalocean')
      
      expect(actions.length).toBeGreaterThan(0)
    })

    it('should return default actions for Cloudflare', () => {
      const actions = manager.getDefaultActions('cloudflare')
      
      expect(actions.length).toBeGreaterThan(0)
    })

    it('should return empty array for unknown provider', () => {
      const actions = manager.getDefaultActions('unknown' as any)
      
      expect(actions).toEqual([])
    })
  })

  describe('getServerActions', () => {
    it('should return SSH action for server', () => {
      const server = {
        id: 's1',
        name: 'Production',
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 22,
      }
      
      const actions = manager.getServerActions(server)
      
      expect(actions.some(a => a.type === 'ssh')).toBe(true)
    })

    it('should return logs action', () => {
      const server = {
        id: 's1',
        name: 'Production',
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 22,
      }
      
      const actions = manager.getServerActions(server)
      
      expect(actions.some(a => a.id.includes('logs'))).toBe(true)
    })

    it('should return status action', () => {
      const server = {
        id: 's1',
        name: 'Production',
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 22,
      }
      
      const actions = manager.getServerActions(server)
      
      expect(actions.some(a => a.id.includes('status'))).toBe(true)
    })

    it('should include server name in action labels', () => {
      const server = {
        id: 's1',
        name: 'Production',
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 22,
      }
      
      const actions = manager.getServerActions(server)
      
      expect(actions.some(a => a.label.includes('Production'))).toBe(true)
    })
  })

  describe('executeAction', () => {
    it('should return command for SSH action', async () => {
      const action: QuickAction = {
        id: 'ssh-server',
        label: 'SSH to Server',
        type: 'ssh',
        command: 'ssh ubuntu@10.0.0.1',
        icon: '🔗',
      }
      
      const result = await manager.executeAction(action)
      
      expect(result.type).toBe('ssh')
      expect(result.command).toBe('ssh ubuntu@10.0.0.1')
    })

    it('should return prompt for AI action', async () => {
      const action: QuickAction = {
        id: 'check-logs',
        label: 'Check Logs',
        type: 'ai_prompt',
        prompt: 'Check the server logs for errors',
        icon: '📋',
      }
      
      const result = await manager.executeAction(action)
      
      expect(result.type).toBe('ai_prompt')
      expect(result.prompt).toBe('Check the server logs for errors')
    })

    it('should return URL for link action', async () => {
      const action: QuickAction = {
        id: 'open-console',
        label: 'Open Console',
        type: 'link',
        url: 'https://console.aws.amazon.com',
        icon: '🌐',
      }
      
      const result = await manager.executeAction(action)
      
      expect(result.type).toBe('link')
      expect(result.url).toBe('https://console.aws.amazon.com')
    })
  })

  describe('createCustomAction', () => {
    it('should create SSH action', () => {
      const action = manager.createCustomAction({
        label: 'Connect to DB',
        type: 'ssh',
        command: 'ssh db@10.0.0.5',
      })
      
      expect(action.id).toBeDefined()
      expect(action.label).toBe('Connect to DB')
      expect(action.type).toBe('ssh')
      expect(action.command).toBe('ssh db@10.0.0.5')
    })

    it('should create AI prompt action', () => {
      const action = manager.createCustomAction({
        label: 'Deploy App',
        type: 'ai_prompt',
        prompt: 'Deploy the application to production',
      })
      
      expect(action.type).toBe('ai_prompt')
      expect(action.prompt).toBe('Deploy the application to production')
    })

    it('should assign default icon based on type', () => {
      const sshAction = manager.createCustomAction({
        label: 'SSH',
        type: 'ssh',
        command: 'ssh user@host',
      })
      
      const aiAction = manager.createCustomAction({
        label: 'AI',
        type: 'ai_prompt',
        prompt: 'Do something',
      })
      
      expect(sshAction.icon).toBeDefined()
      expect(aiAction.icon).toBeDefined()
    })
  })

  describe('getActionsByCategory', () => {
    it('should group actions by category', () => {
      const actions: QuickAction[] = [
        { id: '1', label: 'SSH', type: 'ssh', command: 'ssh', icon: '🔗', category: 'connection' },
        { id: '2', label: 'Logs', type: 'ai_prompt', prompt: 'logs', icon: '📋', category: 'monitoring' },
        { id: '3', label: 'Deploy', type: 'ai_prompt', prompt: 'deploy', icon: '🚀', category: 'deployment' },
      ]
      
      const grouped = manager.getActionsByCategory(actions)
      
      expect(grouped['connection']).toHaveLength(1)
      expect(grouped['monitoring']).toHaveLength(1)
      expect(grouped['deployment']).toHaveLength(1)
    })

    it('should put uncategorized actions in "other"', () => {
      const actions: QuickAction[] = [
        { id: '1', label: 'Action', type: 'ssh', command: 'cmd', icon: '🔗' },
      ]
      
      const grouped = manager.getActionsByCategory(actions)
      
      expect(grouped['other']).toHaveLength(1)
    })
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('AI Integration - End to End', () => {
  it('should generate full context with all features', () => {
    const generator = new AIContextGenerator()
    const sshManager = new SSHConnectionManager()
    const actionManager = new QuickActionManager()
    
    const providers = [{
      id: 'p1',
      type: 'aws' as const,
      name: 'Production AWS',
      emoji: '☁️',
      connection: {
        type: 'api' as const,
        accountId: '123456789012',
        region: 'us-east-1',
      },
      servers: [{
        id: 's1',
        name: 'Web Server',
        ip: '10.0.0.1',
        sshUser: 'ubuntu',
        sshPort: 22,
        sshKeyPath: '~/.ssh/key.pem',
        domain: 'example.com',
      }],
    }]
    
    // Generate context
    const context = generator.generateContext(providers)
    expect(context.hasContext).toBe(true)
    
    // Generate SSH command
    const sshCmd = sshManager.generateSshCommand(providers[0].servers[0])
    expect(sshCmd).toContain('ssh')
    
    // Get quick actions
    const actions = actionManager.getDefaultActions('aws')
    expect(actions.length).toBeGreaterThan(0)
    
    // Build full system prompt
    const basePrompt = 'You are AIBuddy.'
    const fullPrompt = generator.buildSystemPrompt(basePrompt, providers)
    expect(fullPrompt).toContain('AIBuddy')
    expect(fullPrompt).toContain('Production AWS')
  })
})


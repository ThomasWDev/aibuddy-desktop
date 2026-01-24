/**
 * AI Integration Module
 * 
 * Provides AI context injection, SSH connection management,
 * and quick actions from the knowledge base.
 * 
 * @module knowledge/ai-integration
 */

import type { CloudProviderType } from './types'

// =============================================================================
// Types
// =============================================================================

/**
 * Minimal server info for AI integration
 */
export interface ServerInfo {
  id?: string
  name?: string
  ip: string
  sshUser: string
  sshPort: number
  sshKeyPath?: string
  sshCommand?: string
  domain?: string
  instanceId?: string
  instanceType?: string
}

/**
 * Minimal provider info for AI integration
 */
export interface ProviderInfo {
  id: string
  type: CloudProviderType
  name: string
  emoji?: string
  connection?: {
    type: 'api' | 'ssh' | 'oauth'
    accountId?: string
    region?: string
  }
  servers: ServerInfo[]
}

/**
 * AI context result
 */
export interface AIContext {
  /** Whether context is available */
  hasContext: boolean
  /** Text to add to system prompt */
  systemPromptAddition: string
  /** Provider summaries */
  providers: { name: string; serverCount: number }[]
}

/**
 * SSH connection result
 */
export interface SSHConnectionResult {
  success: boolean
  command: string
  message: string
}

/**
 * Quick action definition
 */
export interface QuickAction {
  id: string
  label: string
  type: 'ssh' | 'ai_prompt' | 'link' | 'command'
  icon: string
  command?: string
  prompt?: string
  url?: string
  category?: string
}

/**
 * Quick action execution result
 */
export interface QuickActionResult {
  type: 'ssh' | 'ai_prompt' | 'link' | 'command'
  command?: string
  prompt?: string
  url?: string
}

// =============================================================================
// AI Context Generator
// =============================================================================

/**
 * Generates AI context from knowledge base
 */
export class AIContextGenerator {
  /**
   * Generate full context from providers
   */
  generateContext(providers: ProviderInfo[]): AIContext {
    if (!providers || providers.length === 0) {
      return {
        hasContext: false,
        systemPromptAddition: '',
        providers: [],
      }
    }

    const sections: string[] = []
    const providerSummaries: { name: string; serverCount: number }[] = []

    for (const provider of providers) {
      const section = this.formatProviderSection(provider)
      if (section) {
        sections.push(section)
        providerSummaries.push({
          name: provider.name,
          serverCount: provider.servers?.length || 0,
        })
      }
    }

    if (sections.length === 0) {
      return {
        hasContext: false,
        systemPromptAddition: '',
        providers: [],
      }
    }

    const systemPromptAddition = `
## INFRASTRUCTURE KNOWLEDGE BASE

The user has the following infrastructure configured. Use this information when they ask about servers, deployments, or cloud resources.

${sections.join('\n\n')}
`.trim()

    return {
      hasContext: true,
      systemPromptAddition,
      providers: providerSummaries,
    }
  }

  /**
   * Format a provider section for the prompt
   */
  private formatProviderSection(provider: ProviderInfo): string {
    const lines: string[] = []
    
    // Header with emoji
    const emoji = provider.emoji || '☁️'
    lines.push(`### ${emoji} ${provider.name}`)
    
    // Connection info
    if (provider.connection) {
      if (provider.connection.accountId) {
        lines.push(`- Account ID: ${provider.connection.accountId}`)
      }
      if (provider.connection.region) {
        lines.push(`- Region: ${provider.connection.region}`)
      }
    }
    
    // Servers
    if (provider.servers && provider.servers.length > 0) {
      lines.push('')
      lines.push('**Servers:**')
      
      for (const server of provider.servers) {
        lines.push('')
        lines.push(`#### ${server.name || 'Server'}`)
        lines.push(`- IP: ${server.ip}`)
        lines.push(`- SSH User: ${server.sshUser}`)
        
        if (server.sshPort !== 22) {
          lines.push(`- SSH Port: ${server.sshPort}`)
        }
        
        if (server.domain) {
          lines.push(`- Domain: ${server.domain}`)
        }
        
        if (server.instanceId) {
          lines.push(`- Instance ID: ${server.instanceId}`)
        }
        
        if (server.instanceType) {
          lines.push(`- Instance Type: ${server.instanceType}`)
        }
        
        // SSH command
        const sshCmd = server.sshCommand || this.generateSshCommand(server)
        lines.push(`- SSH Command: \`${sshCmd}\``)
      }
    }
    
    return lines.join('\n')
  }

  /**
   * Generate SSH command from server info
   */
  private generateSshCommand(server: ServerInfo): string {
    let cmd = 'ssh'
    
    if (server.sshKeyPath) {
      cmd += ` -i "${server.sshKeyPath}"`
    }
    
    if (server.sshPort !== 22) {
      cmd += ` -p ${server.sshPort}`
    }
    
    cmd += ` ${server.sshUser}@${server.ip}`
    
    return cmd
  }

  /**
   * Get relevant context for a specific query
   */
  getRelevantContext(query: string, providers: ProviderInfo[]): string {
    if (!providers || providers.length === 0) {
      return ''
    }

    const queryLower = query.toLowerCase()
    
    // Check for infrastructure keywords (generic terms that should include all)
    const genericInfraKeywords = ['server', 'servers', 'infrastructure']
    const hasGenericKeyword = genericInfraKeywords.some(k => queryLower.includes(k))
    
    // Find matching providers
    const matchingProviders: ProviderInfo[] = []
    let hasSpecificMatch = false
    
    for (const provider of providers) {
      const providerLower = provider.name.toLowerCase()
      const typeLower = provider.type.toLowerCase()
      
      // Check if query mentions this provider specifically
      if (queryLower.includes(providerLower) || queryLower.includes(typeLower)) {
        matchingProviders.push(provider)
        hasSpecificMatch = true
        continue
      }
      
      // Check if query mentions any server by name/domain/IP
      for (const server of provider.servers || []) {
        const serverNameLower = (server.name || '').toLowerCase()
        const domainLower = (server.domain || '').toLowerCase()
        
        if (
          (serverNameLower && queryLower.includes(serverNameLower)) ||
          (domainLower && queryLower.includes(domainLower)) ||
          queryLower.includes(server.ip)
        ) {
          matchingProviders.push(provider)
          hasSpecificMatch = true
          break
        }
      }
    }
    
    // If no specific matches but has generic keyword, include all
    if (!hasSpecificMatch && hasGenericKeyword) {
      matchingProviders.push(...providers)
    }
    
    if (matchingProviders.length === 0) {
      return ''
    }
    
    const context = this.generateContext(matchingProviders)
    return context.systemPromptAddition
  }

  /**
   * Build full system prompt with context
   */
  buildSystemPrompt(basePrompt: string, providers: ProviderInfo[]): string {
    const context = this.generateContext(providers)
    
    if (!context.hasContext) {
      return basePrompt
    }
    
    return `${basePrompt}

${context.systemPromptAddition}`
  }
}

// =============================================================================
// SSH Connection Manager
// =============================================================================

/**
 * Manages SSH connections
 */
export class SSHConnectionManager {
  /**
   * Generate SSH command from server info
   */
  generateSshCommand(server: ServerInfo): string {
    // Use stored command if available
    if (server.sshCommand) {
      return server.sshCommand
    }
    
    let cmd = 'ssh'
    
    if (server.sshKeyPath) {
      cmd += ` -i "${server.sshKeyPath}"`
    }
    
    if (server.sshPort !== 22) {
      cmd += ` -p ${server.sshPort}`
    }
    
    cmd += ` ${server.sshUser}@${server.ip}`
    
    return cmd
  }

  /**
   * Copy SSH command to clipboard
   */
  async copyToClipboard(command: string): Promise<SSHConnectionResult> {
    // In Electron, this would use clipboard API
    // For now, return success (actual clipboard handled by renderer)
    return {
      success: true,
      command,
      message: `SSH command copied to clipboard: ${command}`,
    }
  }

  /**
   * Get available connection options
   */
  getConnectionOptions(): string[] {
    return ['terminal', 'clipboard']
  }

  /**
   * Format server info for display
   */
  formatServerInfo(server: ServerInfo): string {
    const lines: string[] = []
    
    if (server.name) {
      lines.push(`Name: ${server.name}`)
    }
    
    lines.push(`IP: ${server.ip}`)
    lines.push(`User: ${server.sshUser}`)
    
    if (server.sshPort !== 22) {
      lines.push(`Port: ${server.sshPort}`)
    }
    
    if (server.domain) {
      lines.push(`Domain: ${server.domain}`)
    }
    
    return lines.join('\n')
  }
}

// =============================================================================
// Quick Action Manager
// =============================================================================

/**
 * Default icons for action types
 */
const DEFAULT_ICONS: Record<string, string> = {
  ssh: '🔗',
  ai_prompt: '🤖',
  link: '🌐',
  command: '⚡',
}

/**
 * Default actions by provider type
 */
const PROVIDER_DEFAULT_ACTIONS: Record<string, QuickAction[]> = {
  aws: [
    { id: 'aws-console', label: 'Open AWS Console', type: 'link', url: 'https://console.aws.amazon.com', icon: '🌐', category: 'navigation' },
    { id: 'aws-ec2', label: 'EC2 Dashboard', type: 'link', url: 'https://console.aws.amazon.com/ec2', icon: '🖥️', category: 'navigation' },
    { id: 'aws-logs', label: 'Check CloudWatch Logs', type: 'ai_prompt', prompt: 'Check AWS CloudWatch logs for errors', icon: '📋', category: 'monitoring' },
    { id: 'aws-costs', label: 'Check AWS Costs', type: 'ai_prompt', prompt: 'What are my current AWS costs?', icon: '💰', category: 'billing' },
  ],
  digitalocean: [
    { id: 'do-console', label: 'Open DO Console', type: 'link', url: 'https://cloud.digitalocean.com', icon: '🌐', category: 'navigation' },
    { id: 'do-droplets', label: 'Droplets Dashboard', type: 'link', url: 'https://cloud.digitalocean.com/droplets', icon: '💧', category: 'navigation' },
    { id: 'do-logs', label: 'Check Droplet Logs', type: 'ai_prompt', prompt: 'Check DigitalOcean droplet logs', icon: '📋', category: 'monitoring' },
  ],
  cloudflare: [
    { id: 'cf-dashboard', label: 'Cloudflare Dashboard', type: 'link', url: 'https://dash.cloudflare.com', icon: '🌐', category: 'navigation' },
    { id: 'cf-dns', label: 'DNS Settings', type: 'ai_prompt', prompt: 'Show Cloudflare DNS settings', icon: '🔧', category: 'configuration' },
    { id: 'cf-analytics', label: 'Check Analytics', type: 'ai_prompt', prompt: 'Show Cloudflare analytics', icon: '📊', category: 'monitoring' },
  ],
  gcp: [
    { id: 'gcp-console', label: 'GCP Console', type: 'link', url: 'https://console.cloud.google.com', icon: '🌐', category: 'navigation' },
    { id: 'gcp-compute', label: 'Compute Engine', type: 'link', url: 'https://console.cloud.google.com/compute', icon: '🖥️', category: 'navigation' },
  ],
  azure: [
    { id: 'azure-portal', label: 'Azure Portal', type: 'link', url: 'https://portal.azure.com', icon: '🌐', category: 'navigation' },
  ],
  github: [
    { id: 'gh-repos', label: 'GitHub Repos', type: 'link', url: 'https://github.com', icon: '🐙', category: 'navigation' },
    { id: 'gh-actions', label: 'Check Actions', type: 'ai_prompt', prompt: 'Check GitHub Actions status', icon: '▶️', category: 'ci' },
  ],
  sentry: [
    { id: 'sentry-issues', label: 'Sentry Issues', type: 'link', url: 'https://sentry.io', icon: '🐛', category: 'monitoring' },
    { id: 'sentry-errors', label: 'Check Errors', type: 'ai_prompt', prompt: 'Check Sentry for recent errors', icon: '⚠️', category: 'monitoring' },
  ],
}

/**
 * Manages quick actions
 */
export class QuickActionManager {
  /**
   * Get default actions for a provider type
   */
  getDefaultActions(providerType: CloudProviderType): QuickAction[] {
    return PROVIDER_DEFAULT_ACTIONS[providerType] || []
  }

  /**
   * Get actions for a specific server
   */
  getServerActions(server: ServerInfo): QuickAction[] {
    const serverName = server.name || 'Server'
    const sshCmd = server.sshCommand || this.generateSshCommand(server)
    
    return [
      {
        id: `ssh-${server.id || server.ip}`,
        label: `SSH to ${serverName}`,
        type: 'ssh',
        command: sshCmd,
        icon: '🔗',
        category: 'connection',
      },
      {
        id: `logs-${server.id || server.ip}`,
        label: `Check ${serverName} Logs`,
        type: 'ai_prompt',
        prompt: `SSH to ${serverName} (${server.ip}) and check the logs for errors`,
        icon: '📋',
        category: 'monitoring',
      },
      {
        id: `status-${server.id || server.ip}`,
        label: `Check ${serverName} Status`,
        type: 'ai_prompt',
        prompt: `Check the status of ${serverName} (${server.ip}) - disk space, memory, CPU`,
        icon: '📊',
        category: 'monitoring',
      },
      {
        id: `restart-${server.id || server.ip}`,
        label: `Restart ${serverName} Services`,
        type: 'ai_prompt',
        prompt: `SSH to ${serverName} and restart the main services`,
        icon: '🔄',
        category: 'management',
      },
    ]
  }

  /**
   * Generate SSH command from server info
   */
  private generateSshCommand(server: ServerInfo): string {
    let cmd = 'ssh'
    
    if (server.sshKeyPath) {
      cmd += ` -i "${server.sshKeyPath}"`
    }
    
    if (server.sshPort !== 22) {
      cmd += ` -p ${server.sshPort}`
    }
    
    cmd += ` ${server.sshUser}@${server.ip}`
    
    return cmd
  }

  /**
   * Execute a quick action
   */
  async executeAction(action: QuickAction): Promise<QuickActionResult> {
    switch (action.type) {
      case 'ssh':
        return {
          type: 'ssh',
          command: action.command,
        }
      
      case 'ai_prompt':
        return {
          type: 'ai_prompt',
          prompt: action.prompt,
        }
      
      case 'link':
        return {
          type: 'link',
          url: action.url,
        }
      
      case 'command':
        return {
          type: 'command',
          command: action.command,
        }
      
      default:
        return {
          type: action.type,
        }
    }
  }

  /**
   * Create a custom action
   */
  createCustomAction(options: {
    label: string
    type: QuickAction['type']
    command?: string
    prompt?: string
    url?: string
    icon?: string
    category?: string
  }): QuickAction {
    return {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: options.label,
      type: options.type,
      command: options.command,
      prompt: options.prompt,
      url: options.url,
      icon: options.icon || DEFAULT_ICONS[options.type] || '⚡',
      category: options.category,
    }
  }

  /**
   * Group actions by category
   */
  getActionsByCategory(actions: QuickAction[]): Record<string, QuickAction[]> {
    const grouped: Record<string, QuickAction[]> = {}
    
    for (const action of actions) {
      const category = action.category || 'other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(action)
    }
    
    return grouped
  }
}

// =============================================================================
// Singleton Instances
// =============================================================================

/** Global AI context generator */
export const aiContextGenerator = new AIContextGenerator()

/** Global SSH connection manager */
export const sshConnectionManager = new SSHConnectionManager()

/** Global quick action manager */
export const quickActionManager = new QuickActionManager()


/**
 * Secure AI Integration Module
 * 
 * PRIVACY-FIRST DESIGN:
 * - NO sensitive data (API keys, SSH credentials, IPs) is EVER sent to AI APIs
 * - Only generic context is sent (e.g., "user has AWS servers configured")
 * - Sensitive data is used LOCALLY ONLY for terminal commands
 * - AI provides guidance, local app executes with real credentials
 * 
 * @module knowledge/ai-integration-secure
 */

import type { CloudProviderType } from './types'

// =============================================================================
// Types
// =============================================================================

/**
 * Server info for LOCAL use only - NEVER sent to AI
 */
export interface LocalServerInfo {
  id: string
  name: string
  ip: string
  sshUser: string
  sshPort: number
  sshKeyPath?: string
  domain?: string
  instanceId?: string
  instanceType?: string
}

/**
 * Provider info for LOCAL use only - NEVER sent to AI
 */
export interface LocalProviderInfo {
  id: string
  type: CloudProviderType
  name: string
  accountId?: string
  region?: string
  apiKey?: string  // NEVER sent to AI
  servers: LocalServerInfo[]
}

/**
 * SAFE context that CAN be sent to AI - NO sensitive data
 */
export interface SafeAIContext {
  /** Whether context is available */
  hasContext: boolean
  /** Safe text to add to system prompt - NO sensitive data */
  systemPromptAddition: string
  /** Provider summaries - names only, no credentials */
  providers: { name: string; serverCount: number; type: CloudProviderType }[]
}

/**
 * Local execution context - used ONLY locally, NEVER sent to AI
 */
export interface LocalExecutionContext {
  /** Server to connect to */
  server: LocalServerInfo
  /** Full SSH command with real credentials */
  sshCommand: string
  /** Provider info */
  provider: LocalProviderInfo
}

// =============================================================================
// Secure AI Context Generator
// =============================================================================

/**
 * Generates SAFE AI context - NO sensitive data included
 * 
 * SECURITY RULES:
 * 1. NEVER include IP addresses
 * 2. NEVER include SSH usernames or keys
 * 3. NEVER include API keys or tokens
 * 4. NEVER include account IDs
 * 5. ONLY include generic descriptions
 */
export class SecureAIContextGenerator {
  /**
   * Generate SAFE context from providers - NO sensitive data
   */
  generateSafeContext(providers: LocalProviderInfo[]): SafeAIContext {
    if (!providers || providers.length === 0) {
      return {
        hasContext: false,
        systemPromptAddition: '',
        providers: [],
      }
    }

    const providerSummaries: { name: string; serverCount: number; type: CloudProviderType }[] = []
    const safeDescriptions: string[] = []

    for (const provider of providers) {
      const serverCount = provider.servers?.length || 0
      providerSummaries.push({
        name: provider.name,
        serverCount,
        type: provider.type,
      })

      // Generate SAFE description - NO sensitive data
      safeDescriptions.push(this.generateSafeDescription(provider))
    }

    if (safeDescriptions.length === 0) {
      return {
        hasContext: false,
        systemPromptAddition: '',
        providers: [],
      }
    }

    // SAFE system prompt addition - NO credentials, IPs, or sensitive data
    const systemPromptAddition = `
## AVAILABLE INFRASTRUCTURE (Local Knowledge Base)

The user has configured the following cloud infrastructure locally. 
When they ask about servers or deployments, you can reference these by NAME.
The actual credentials and connection details are stored LOCALLY and will be 
used by the app to execute commands - you do NOT have access to them.

${safeDescriptions.join('\n\n')}

**IMPORTANT:** To connect to any server or run commands:
1. Tell the user which server you want to connect to BY NAME
2. The app will use locally-stored credentials to execute
3. You will receive the OUTPUT (logs, results) to analyze
4. You NEVER see the actual credentials, IPs, or SSH keys
`.trim()

    return {
      hasContext: true,
      systemPromptAddition,
      providers: providerSummaries,
    }
  }

  /**
   * Generate a SAFE description - NO sensitive data
   */
  private generateSafeDescription(provider: LocalProviderInfo): string {
    const lines: string[] = []
    
    // Provider name and type only
    lines.push(`### ${this.getProviderEmoji(provider.type)} ${provider.name}`)
    lines.push(`- Type: ${this.getProviderDisplayName(provider.type)}`)
    
    // Server count only - NO details
    const serverCount = provider.servers?.length || 0
    if (serverCount > 0) {
      lines.push(`- Servers: ${serverCount} configured`)
      
      // List server NAMES only - NO IPs, NO credentials
      lines.push('- Server names:')
      for (const server of provider.servers) {
        lines.push(`  - "${server.name}"`)
      }
    }
    
    // Region if available (not sensitive)
    if (provider.region) {
      lines.push(`- Region: ${provider.region}`)
    }
    
    return lines.join('\n')
  }

  private getProviderEmoji(type: CloudProviderType): string {
    const emojis: Record<CloudProviderType, string> = {
      aws: '🔶',
      digitalocean: '🌊',
      gcp: '🔵',
      azure: '☁️',
      cloudflare: '🟠',
      vercel: '▲',
      netlify: '💚',
      heroku: '💜',
      linode: '🟢',
      vultr: '🔷',
      siteground: '🟤',
      godaddy: '🟡',
      custom: '⚙️',
    }
    return emojis[type] || '☁️'
  }

  private getProviderDisplayName(type: CloudProviderType): string {
    const names: Record<CloudProviderType, string> = {
      aws: 'Amazon Web Services',
      digitalocean: 'DigitalOcean',
      gcp: 'Google Cloud Platform',
      azure: 'Microsoft Azure',
      cloudflare: 'Cloudflare',
      vercel: 'Vercel',
      netlify: 'Netlify',
      heroku: 'Heroku',
      linode: 'Linode',
      vultr: 'Vultr',
      siteground: 'SiteGround',
      godaddy: 'GoDaddy',
      custom: 'Custom Provider',
    }
    return names[type] || type
  }
}

// =============================================================================
// Local Command Executor
// =============================================================================

/**
 * Executes commands LOCALLY using stored credentials
 * 
 * This class handles the actual execution with real credentials.
 * The AI never sees these credentials - it only sees the results.
 */
export class LocalCommandExecutor {
  private providers: LocalProviderInfo[] = []

  /**
   * Set the providers (loaded from local encrypted storage)
   */
  setProviders(providers: LocalProviderInfo[]): void {
    this.providers = providers
  }

  /**
   * Find a server by name
   */
  findServerByName(serverName: string): LocalExecutionContext | null {
    for (const provider of this.providers) {
      for (const server of provider.servers) {
        if (server.name.toLowerCase() === serverName.toLowerCase()) {
          return {
            server,
            sshCommand: this.generateSshCommand(server),
            provider,
          }
        }
      }
    }
    return null
  }

  /**
   * Generate SSH command for LOCAL execution only
   */
  generateSshCommand(server: LocalServerInfo): string {
    const parts = ['ssh']
    
    if (server.sshKeyPath) {
      parts.push(`-i "${server.sshKeyPath}"`)
    }
    
    if (server.sshPort && server.sshPort !== 22) {
      parts.push(`-p ${server.sshPort}`)
    }
    
    parts.push(`${server.sshUser}@${server.ip}`)
    
    return parts.join(' ')
  }

  /**
   * Execute a command on a server and return the output
   * The AI sees the OUTPUT, not the credentials
   */
  async executeOnServer(
    serverName: string, 
    command: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    const context = this.findServerByName(serverName)
    
    if (!context) {
      return {
        success: false,
        output: '',
        error: `Server "${serverName}" not found in knowledge base`,
      }
    }

    // In a real implementation, this would use child_process to execute
    // For now, return the command that would be executed
    const fullCommand = `${context.sshCommand} "${command}"`
    
    return {
      success: true,
      output: `[Would execute on ${serverName}]: ${command}`,
      // The actual output would be returned here after execution
    }
  }

  /**
   * Copy SSH command to clipboard for manual execution
   */
  getSshCommandForClipboard(serverName: string): string | null {
    const context = this.findServerByName(serverName)
    return context?.sshCommand || null
  }
}

// =============================================================================
// Exports
// =============================================================================

export const secureAIContextGenerator = new SecureAIContextGenerator()
export const localCommandExecutor = new LocalCommandExecutor()


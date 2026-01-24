/**
 * Document Parser
 * 
 * Parses markdown/text files to extract infrastructure information:
 * - IP addresses
 * - SSH commands and connection details
 * - Domains
 * - API keys (names only, values not stored)
 * - Account IDs
 * - Server configurations
 * 
 * @module knowledge/document-parser
 */

import type { CloudProviderType } from './types'

// =============================================================================
// Types
// =============================================================================

/**
 * Detected SSH command
 */
export interface DetectedSshCommand {
  /** SSH username */
  user: string
  /** Host (IP or domain) */
  host: string
  /** SSH port (default: 22) */
  port: number
  /** Path to SSH key file */
  keyPath?: string
  /** Full SSH command string */
  fullCommand: string
}

/**
 * Detected API key
 */
export interface DetectedApiKey {
  /** Key name/label */
  name: string
  /** Service this key is for */
  service: string
  /** Whether the value is redacted/encrypted */
  isRedacted: boolean
  /** Line number where found */
  lineNumber?: number
}

/**
 * Detected account ID
 */
export interface DetectedAccountId {
  /** Account/Project ID */
  id: string
  /** Cloud provider */
  provider: string
}

/**
 * Detected server configuration
 */
export interface DetectedServer {
  /** Server name (from section header) */
  name: string
  /** IP address */
  ip: string
  /** SSH username */
  sshUser: string
  /** SSH port */
  sshPort: number
  /** SSH key path */
  sshKeyPath?: string
  /** Generated SSH command */
  sshCommand?: string
  /** Associated domain */
  domain?: string
  /** Cloud provider */
  provider?: CloudProviderType
  /** Instance ID (AWS, etc.) */
  instanceId?: string
  /** Instance type */
  instanceType?: string
}

/**
 * Parse result containing all extracted information
 */
export interface ParseResult {
  /** Detected IP addresses */
  ipAddresses: string[]
  /** Detected SSH commands */
  sshCommands: DetectedSshCommand[]
  /** Detected domains */
  domains: string[]
  /** Detected API keys (names only) */
  apiKeys: DetectedApiKey[]
  /** Detected account IDs */
  accountIds: DetectedAccountId[]
  /** Detected servers */
  servers: DetectedServer[]
  /** Key-value pairs */
  keyValuePairs: Record<string, string>
  /** Section headers */
  sections: string[]
}

// =============================================================================
// Regular Expressions
// =============================================================================

/** IPv4 address pattern */
const IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g

/** SSH command pattern */
const SSH_COMMAND_REGEX = /ssh\s+(?:-i\s+["']?([^"'\s]+)["']?\s+)?(?:-p\s+(\d+)\s+)?(?:-i\s+["']?([^"'\s]+)["']?\s+)?(\w+)@([\w.-]+)/g

/** Domain pattern (excludes IPs) */
const DOMAIN_REGEX = /\b(?!(?:\d{1,3}\.){3}\d{1,3}\b)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\b/gi

/** Markdown header pattern */
const HEADER_REGEX = /^#{1,6}\s+(.+)$/gm

/** Key-value pair pattern */
const KEY_VALUE_REGEX = /^[-*]?\s*([^:]+):\s*(.+)$/

/** AWS Account ID pattern (12 digits) */
const AWS_ACCOUNT_REGEX = /\b(\d{12})\b/g

/** AWS Instance ID pattern */
const AWS_INSTANCE_ID_REGEX = /\bi-[0-9a-f]{8,17}\b/gi

/** Azure Subscription ID pattern (UUID) */
const AZURE_SUBSCRIPTION_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

// =============================================================================
// API Key Patterns
// =============================================================================

interface ApiKeyPattern {
  pattern: RegExp
  service: string
}

const API_KEY_PATTERNS: ApiKeyPattern[] = [
  { pattern: /sk-ant-api\d*-/i, service: 'anthropic' },
  { pattern: /\bsk-[a-zA-Z0-9]+\b/i, service: 'openai' },
  { pattern: /ghp_[a-zA-Z0-9]+/i, service: 'github' },
  { pattern: /glpat-[a-zA-Z0-9-_]+/i, service: 'gitlab' },
  { pattern: /AKIA[0-9A-Z]{16}/i, service: 'aws' },
  { pattern: /SG\.[a-zA-Z0-9_-]+/i, service: 'sendgrid' },
  { pattern: /xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/i, service: 'slack' },
]

// =============================================================================
// Provider Detection
// =============================================================================

const PROVIDER_KEYWORDS: Record<string, CloudProviderType> = {
  'aws': 'aws',
  'amazon': 'aws',
  'ec2': 'aws',
  's3': 'aws',
  'lambda': 'aws',
  'gcp': 'gcp',
  'google cloud': 'gcp',
  'google': 'gcp',
  'azure': 'azure',
  'microsoft': 'azure',
  'digitalocean': 'digitalocean',
  'digital ocean': 'digitalocean',
  'droplet': 'digitalocean',
  'cloudflare': 'cloudflare',
  'firebase': 'firebase',
  'vercel': 'vercel',
  'sentry': 'sentry',
  'github': 'github',
  'bitbucket': 'bitbucket',
  'gitlab': 'gitlab',
}

// =============================================================================
// Document Parser Class
// =============================================================================

/**
 * Parses documents to extract infrastructure information
 */
export class DocumentParser {
  /**
   * Parse a document and extract infrastructure information
   */
  parse(content: string): ParseResult {
    const result: ParseResult = {
      ipAddresses: [],
      sshCommands: [],
      domains: [],
      apiKeys: [],
      accountIds: [],
      servers: [],
      keyValuePairs: {},
      sections: [],
    }

    if (!content || content.trim() === '') {
      return result
    }

    // Extract sections first (needed for context)
    result.sections = this.extractSections(content)

    // Extract IP addresses
    result.ipAddresses = this.extractIpAddresses(content)

    // Extract SSH commands
    result.sshCommands = this.extractSshCommands(content)

    // Extract domains
    result.domains = this.extractDomains(content)

    // Extract API keys
    result.apiKeys = this.extractApiKeys(content)

    // Extract account IDs
    result.accountIds = this.extractAccountIds(content)

    // Extract key-value pairs
    result.keyValuePairs = this.extractKeyValuePairs(content)

    // Extract servers (combines all information)
    result.servers = this.extractServers(content, result)

    return result
  }

  /**
   * Extract section headers from markdown
   */
  private extractSections(content: string): string[] {
    const sections: string[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      // Trim the line but preserve leading # characters
      const trimmedLine = line.trim()
      const match = trimmedLine.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        sections.push(match[2].trim())
      }
    }

    return sections
  }

  /**
   * Extract valid IPv4 addresses
   */
  private extractIpAddresses(content: string): string[] {
    const matches = content.match(IPV4_REGEX) || []
    
    // Filter out invalid IPs and deduplicate
    const validIps = matches.filter(ip => {
      const parts = ip.split('.').map(Number)
      return parts.every(part => part >= 0 && part <= 255)
    })

    return [...new Set(validIps)]
  }

  /**
   * Extract SSH commands
   */
  private extractSshCommands(content: string): DetectedSshCommand[] {
    const commands: DetectedSshCommand[] = []
    const lines = content.split('\n')
    
    for (const line of lines) {
      // Find 'ssh ' command in the line (case insensitive search)
      // We need to find 'ssh ' followed by arguments (not 'SSH Command:')
      const lowerLine = line.toLowerCase()
      
      // Find all occurrences of 'ssh ' and pick the one that's followed by command args
      let sshIndex = -1
      let searchStart = 0
      
      while (searchStart < lowerLine.length) {
        const idx = lowerLine.indexOf('ssh ', searchStart)
        if (idx === -1) break
        
        // Check what follows 'ssh '
        const afterSsh = line.substring(idx + 4).trim()
        
        // If it's followed by '-' (option) or 'user@' pattern, it's a command
        if (afterSsh.startsWith('-') || /^\w+@/.test(afterSsh)) {
          sshIndex = idx
          break
        }
        
        searchStart = idx + 1
      }
      
      if (sshIndex === -1) continue
      
      // Extract the SSH command starting from 'ssh'
      const cmdStr = line.substring(sshIndex).trim()
      
      // Make sure it looks like an SSH command (has user@host)
      if (!/@/.test(cmdStr)) continue
      
      const parsed = this.parseSshCommand(cmdStr)
      if (parsed) {
        commands.push(parsed)
      }
    }

    return commands
  }

  /**
   * Parse a single SSH command string
   */
  private parseSshCommand(cmd: string): DetectedSshCommand | null {
    // Extract key path (handles quoted paths with spaces)
    let keyPath: string | undefined
    const keyMatch = cmd.match(/-i\s+["']([^"']+)["']/) || cmd.match(/-i\s+(\S+)/)
    if (keyMatch) {
      keyPath = keyMatch[1]
    }

    // Extract port
    let port = 22
    const portMatch = cmd.match(/-p\s+(\d+)/)
    if (portMatch) {
      port = parseInt(portMatch[1], 10)
    }

    // Extract user@host
    const userHostMatch = cmd.match(/(\w+)@([\w.-]+)\s*$/)
    if (!userHostMatch) {
      return null
    }

    return {
      user: userHostMatch[1],
      host: userHostMatch[2],
      port,
      keyPath,
      fullCommand: cmd.trim(),
    }
  }

  /**
   * Extract domains (excluding IPs and localhost)
   */
  private extractDomains(content: string): string[] {
    const matches = content.match(DOMAIN_REGEX) || []
    
    // Filter out localhost and deduplicate
    const filtered = matches
      .map(d => d.toLowerCase())
      .filter(d => d !== 'localhost' && !d.match(/^\d/))

    return [...new Set(filtered)]
  }

  /**
   * Extract API keys (names only, not values)
   */
  private extractApiKeys(content: string): DetectedApiKey[] {
    const apiKeys: DetectedApiKey[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()
      
      // Check for key-value patterns with API/Key/Token in the name
      const kvMatch = trimmedLine.match(/^[-*]?\s*([^:]*(?:api|key|token|secret|dsn|password|credential)[^:]*)\s*:\s*(.+)$/i)
      if (kvMatch) {
        const name = kvMatch[1].trim()
        const value = kvMatch[2].trim()
        
        // Detect service from name or value
        const service = this.detectApiKeyService(name, value)
        
        // Check if value is redacted
        const isRedacted = /\[encrypted\]|\[redacted\]|\*{3,}|xxx/i.test(value)

        apiKeys.push({
          name,
          service,
          isRedacted,
          lineNumber: i + 1,
        })
        continue
      }

      // Check for known API key patterns in the line (standalone patterns without key: value format)
      for (const { pattern, service } of API_KEY_PATTERNS) {
        if (pattern.test(trimmedLine)) {
          // Don't add duplicate if already found via key-value
          if (!apiKeys.some(k => k.lineNumber === i + 1)) {
            apiKeys.push({
              name: `${service.charAt(0).toUpperCase() + service.slice(1)} Key`,
              service,
              isRedacted: false,
              lineNumber: i + 1,
            })
          }
        }
      }
    }

    return apiKeys
  }

  /**
   * Detect API key service from name or value
   */
  private detectApiKeyService(name: string, value: string): string {
    const combined = `${name} ${value}`.toLowerCase()

    // Check known patterns
    for (const { pattern, service } of API_KEY_PATTERNS) {
      if (pattern.test(value)) {
        return service
      }
    }

    // Check name for service hints
    const serviceHints: Record<string, string> = {
      'sentry': 'sentry',
      'sendgrid': 'sendgrid',
      'cloudflare': 'cloudflare',
      'aws': 'aws',
      'github': 'github',
      'gitlab': 'gitlab',
      'bitbucket': 'bitbucket',
      'openai': 'openai',
      'anthropic': 'anthropic',
      'stripe': 'stripe',
      'twilio': 'twilio',
      'slack': 'slack',
    }

    for (const [hint, service] of Object.entries(serviceHints)) {
      if (combined.includes(hint)) {
        return service
      }
    }

    return 'unknown'
  }

  /**
   * Extract account IDs
   */
  private extractAccountIds(content: string): DetectedAccountId[] {
    const accountIds: DetectedAccountId[] = []
    const lines = content.split('\n')
    let currentSection = ''

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Track current section
      const headerMatch = trimmedLine.match(/^#{1,6}\s+(.+)$/)
      if (headerMatch) {
        currentSection = headerMatch[1].toLowerCase()
        continue
      }

      // Check for account ID patterns
      const kvMatch = trimmedLine.match(/^[-*]?\s*([^:]*(?:account|project)[^:]*)\s*:\s*(.+)$/i)
      if (kvMatch) {
        const name = kvMatch[1].toLowerCase()
        const value = kvMatch[2].trim()

        // Detect provider
        let provider = 'unknown'
        if (name.includes('aws') || currentSection.includes('aws') || currentSection.includes('amazon')) {
          provider = 'aws'
        } else if (name.includes('gcp') || name.includes('project id') || currentSection.includes('gcp') || currentSection.includes('google')) {
          provider = 'gcp'
        } else if (name.includes('azure') || currentSection.includes('azure')) {
          provider = 'azure'
        } else if (currentSection.includes('digitalocean')) {
          provider = 'digitalocean'
        }

        accountIds.push({ id: value, provider })
        continue
      }

      // Check for AWS account ID pattern (12 digits) - only if in AWS context
      const awsMatch = trimmedLine.match(/\b(\d{12})\b/)
      if (awsMatch && !accountIds.some(a => a.id === awsMatch[1])) {
        const isAwsContext = currentSection.includes('aws') || 
                            currentSection.includes('amazon') || 
                            trimmedLine.toLowerCase().includes('aws') ||
                            trimmedLine.toLowerCase().includes('account')
        if (isAwsContext) {
          accountIds.push({ id: awsMatch[1], provider: 'aws' })
        }
      }

      // Check for Azure subscription ID (UUID)
      const azureMatch = trimmedLine.match(AZURE_SUBSCRIPTION_REGEX)
      if (azureMatch) {
        const isAzureContext = trimmedLine.toLowerCase().includes('azure') || 
                              trimmedLine.toLowerCase().includes('subscription') ||
                              currentSection.includes('azure')
        if (isAzureContext) {
          accountIds.push({ id: azureMatch[0], provider: 'azure' })
        }
      }
    }

    return accountIds
  }

  /**
   * Extract key-value pairs
   */
  private extractKeyValuePairs(content: string): Record<string, string> {
    const pairs: Record<string, string> = {}
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      // Skip headers and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue
      
      const match = trimmed.match(KEY_VALUE_REGEX)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        
        // Skip if key looks like a header or is empty
        if (key && !key.startsWith('#')) {
          // Don't store API key values
          const isApiKey = /api|key|token|secret|password|credential/i.test(key)
          if (!isApiKey) {
            pairs[key] = value
          }
        }
      }
    }

    return pairs
  }

  /**
   * Extract server configurations
   */
  private extractServers(content: string, parseResult: ParseResult): DetectedServer[] {
    const servers: DetectedServer[] = []
    const lines = content.split('\n')
    
    let currentSection = ''
    let currentServer: Partial<DetectedServer> = {}
    let hasServerData = false

    const saveCurrentServer = () => {
      if (currentServer.ip && hasServerData) {
        servers.push(this.finalizeServer(currentServer, currentSection))
      }
      currentServer = {}
      hasServerData = false
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // Track section headers
      const headerMatch = trimmedLine.match(/^#{1,6}\s+(.+)$/)
      if (headerMatch) {
        // Save previous server if it has an IP
        saveCurrentServer()

        currentSection = headerMatch[1]
        currentServer = { name: this.cleanServerName(currentSection) }
        
        // Detect provider from section name
        currentServer.provider = this.detectProvider(currentSection)
        continue
      }

      // Parse key-value pairs
      const kvMatch = trimmedLine.match(KEY_VALUE_REGEX)
      if (kvMatch) {
        const key = kvMatch[1].toLowerCase().trim()
        const value = kvMatch[2].trim()

        if (key.includes('ip') || key === 'server ip' || key === 'ip address') {
          currentServer.ip = value
          hasServerData = true
        } else if (key.includes('ssh user') || key === 'user') {
          currentServer.sshUser = value
          hasServerData = true
        } else if (key.includes('ssh key') || key.includes('key path')) {
          currentServer.sshKeyPath = value
          hasServerData = true
        } else if (key.includes('ssh port') || key === 'port') {
          currentServer.sshPort = parseInt(value, 10)
          hasServerData = true
        } else if (key === 'domain') {
          currentServer.domain = value
          hasServerData = true
        } else if (key.includes('instance id')) {
          currentServer.instanceId = value
          hasServerData = true
        } else if (key.includes('instance type')) {
          currentServer.instanceType = value
          hasServerData = true
        } else if (key.includes('ssh command')) {
          // Parse SSH command for additional details
          const sshParsed = this.parseSshCommand(value)
          if (sshParsed) {
            if (!currentServer.ip) currentServer.ip = sshParsed.host
            if (!currentServer.sshUser) currentServer.sshUser = sshParsed.user
            if (!currentServer.sshPort) currentServer.sshPort = sshParsed.port
            if (!currentServer.sshKeyPath && sshParsed.keyPath) currentServer.sshKeyPath = sshParsed.keyPath
            hasServerData = true
          }
        }
      }

      // Check for IP addresses in the line (only if we're in a section)
      if (currentSection) {
        const ipMatch = trimmedLine.match(IPV4_REGEX)
        if (ipMatch && !currentServer.ip) {
          currentServer.ip = ipMatch[0]
          hasServerData = true
        }

        // Check for instance IDs
        const instanceMatch = trimmedLine.match(AWS_INSTANCE_ID_REGEX)
        if (instanceMatch && !currentServer.instanceId) {
          currentServer.instanceId = instanceMatch[0]
          hasServerData = true
        }
      }
    }

    // Save last server
    saveCurrentServer()

    return servers
  }

  /**
   * Clean server name from section header
   */
  private cleanServerName(section: string): string {
    return section
      .replace(/\(.*\)/, '') // Remove parenthetical notes
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Detect cloud provider from text
   */
  private detectProvider(text: string): CloudProviderType | undefined {
    const lower = text.toLowerCase()
    
    for (const [keyword, provider] of Object.entries(PROVIDER_KEYWORDS)) {
      if (lower.includes(keyword)) {
        return provider
      }
    }

    return undefined
  }

  /**
   * Finalize server configuration with defaults and generated SSH command
   */
  private finalizeServer(server: Partial<DetectedServer>, section: string): DetectedServer {
    const finalized: DetectedServer = {
      name: server.name || this.cleanServerName(section) || 'Unknown Server',
      ip: server.ip || '',
      sshUser: server.sshUser || 'root',
      sshPort: server.sshPort || 22,
      sshKeyPath: server.sshKeyPath,
      domain: server.domain,
      provider: server.provider,
      instanceId: server.instanceId,
      instanceType: server.instanceType,
    }

    // Generate SSH command
    finalized.sshCommand = this.generateSshCommand(finalized)

    return finalized
  }

  /**
   * Generate SSH command from server config
   */
  private generateSshCommand(server: DetectedServer): string {
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
}

// =============================================================================
// Singleton Instance
// =============================================================================

/** Global document parser instance */
export const documentParser = new DocumentParser()


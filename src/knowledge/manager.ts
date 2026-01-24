/**
 * Knowledge Base Manager
 * 
 * Manages the local knowledge base for cloud provider documentation,
 * credentials, and infrastructure details.
 * 
 * @module knowledge/manager
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  KnowledgeBaseData,
  CloudProvider,
  ServerConfig,
  ImportedDocument,
  EncryptedCredential,
  CloudProviderType,
  KnowledgeBasePreferences,
  createEmptyKnowledgeBase,
  createCloudProvider,
  createServerConfig,
  generateId,
  PROVIDER_NAMES,
  PROVIDER_EMOJIS,
} from './types'
import { SecureStorage, secureStorage } from './encryption'
import { DocumentParser } from './document-parser'

// =============================================================================
// Constants
// =============================================================================

/** Base directory for AIBuddy data */
const AIBUDDY_DIR = path.join(os.homedir(), '.aibuddy')

/** Knowledge base directory */
const KNOWLEDGE_DIR = path.join(AIBUDDY_DIR, 'knowledge')

/** Providers directory */
const PROVIDERS_DIR = path.join(KNOWLEDGE_DIR, 'providers')

/** Servers directory */
const SERVERS_DIR = path.join(KNOWLEDGE_DIR, 'servers')

/** Docs directory */
const DOCS_DIR = path.join(KNOWLEDGE_DIR, 'docs')

/** Secrets directory */
const SECRETS_DIR = path.join(AIBUDDY_DIR, 'secrets')

/** Main index file */
const INDEX_FILE = path.join(KNOWLEDGE_DIR, 'index.json')

/** Config file */
const CONFIG_FILE = path.join(AIBUDDY_DIR, 'config.json')

/** Credentials file */
const CREDENTIALS_FILE = path.join(SECRETS_DIR, 'credentials.enc.json')

/** Salt file for encryption */
const SALT_FILE = path.join(SECRETS_DIR, 'salt.key')

// =============================================================================
// Knowledge Base Manager Class
// =============================================================================

/**
 * Manages the local knowledge base
 */
export class KnowledgeBaseManager {
  private data: KnowledgeBaseData
  private credentials: EncryptedCredential[] = []
  private storage: SecureStorage
  private initialized = false
  
  constructor() {
    this.data = createEmptyKnowledgeBase()
    this.storage = secureStorage
  }
  
  // ===========================================================================
  // Initialization
  // ===========================================================================
  
  /**
   * Initialize the knowledge base
   * Creates directories and loads existing data
   */
  async initialize(): Promise<void> {
    // Create directories
    await this.ensureDirectories()
    
    // Load existing data
    await this.loadData()
    
    this.initialized = true
  }
  
  /**
   * Ensure all required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const dirs = [
      AIBUDDY_DIR,
      KNOWLEDGE_DIR,
      PROVIDERS_DIR,
      SERVERS_DIR,
      DOCS_DIR,
      SECRETS_DIR,
    ]
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
  }
  
  /**
   * Load existing data from disk
   */
  private async loadData(): Promise<void> {
    // Load main index
    if (fs.existsSync(INDEX_FILE)) {
      try {
        const content = fs.readFileSync(INDEX_FILE, 'utf-8')
        const index = JSON.parse(content)
        this.data.index = index
      } catch (error) {
        console.error('[KnowledgeBase] Failed to load index:', error)
      }
    }
    
    // Load config
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const content = fs.readFileSync(CONFIG_FILE, 'utf-8')
        const config = JSON.parse(content)
        this.data.preferences = { ...this.data.preferences, ...config.preferences }
      } catch (error) {
        console.error('[KnowledgeBase] Failed to load config:', error)
      }
    }
    
    // Load providers
    if (fs.existsSync(PROVIDERS_DIR)) {
      const files = fs.readdirSync(PROVIDERS_DIR).filter(f => f.endsWith('.json'))
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(PROVIDERS_DIR, file), 'utf-8')
          const provider = JSON.parse(content) as CloudProvider
          // Convert date strings back to Date objects
          provider.createdAt = new Date(provider.createdAt)
          provider.updatedAt = new Date(provider.updatedAt)
          if (provider.lastUsedAt) {
            provider.lastUsedAt = new Date(provider.lastUsedAt)
          }
          this.data.providers.push(provider)
        } catch (error) {
          console.error(`[KnowledgeBase] Failed to load provider ${file}:`, error)
        }
      }
    }
    
    // Load credentials (encrypted)
    if (fs.existsSync(CREDENTIALS_FILE)) {
      try {
        const content = fs.readFileSync(CREDENTIALS_FILE, 'utf-8')
        this.credentials = JSON.parse(content)
      } catch (error) {
        console.error('[KnowledgeBase] Failed to load credentials:', error)
      }
    }
  }
  
  // ===========================================================================
  // Encryption Management
  // ===========================================================================
  
  /**
   * Unlock the knowledge base with a password
   */
  unlock(password: string): boolean {
    try {
      // Load existing salt if available
      let existingSalt: string | undefined
      if (fs.existsSync(SALT_FILE)) {
        existingSalt = fs.readFileSync(SALT_FILE, 'utf-8')
      }
      
      this.storage.initialize(password, existingSalt)
      
      // Save salt if new
      if (!existingSalt) {
        const salt = this.storage.getSalt()
        if (salt) {
          fs.writeFileSync(SALT_FILE, salt)
        }
      }
      
      return true
    } catch (error) {
      console.error('[KnowledgeBase] Failed to unlock:', error)
      return false
    }
  }
  
  /**
   * Lock the knowledge base
   */
  lock(): void {
    this.storage.lock()
  }
  
  /**
   * Check if knowledge base is unlocked
   */
  get isUnlocked(): boolean {
    return this.storage.unlocked
  }
  
  // ===========================================================================
  // Provider Management
  // ===========================================================================
  
  /**
   * Get all providers
   */
  getProviders(): CloudProvider[] {
    return [...this.data.providers]
  }
  
  /**
   * Get providers by type
   */
  getProvidersByType(type: CloudProviderType): CloudProvider[] {
    return this.data.providers.filter(p => p.type === type)
  }
  
  /**
   * Get a provider by ID
   */
  getProvider(id: string): CloudProvider | undefined {
    return this.data.providers.find(p => p.id === id)
  }
  
  /**
   * Add a new provider
   */
  async addProvider(type: CloudProviderType, name?: string): Promise<CloudProvider> {
    const provider = createCloudProvider(type, name)
    this.data.providers.push(provider)
    
    // Update index
    if (!this.data.index.providersByType[type]) {
      this.data.index.providersByType[type] = []
    }
    this.data.index.providersByType[type].push(provider.id)
    
    // Save
    await this.saveProvider(provider)
    await this.saveIndex()
    
    return provider
  }
  
  /**
   * Update a provider
   */
  async updateProvider(id: string, updates: Partial<CloudProvider>): Promise<CloudProvider | undefined> {
    const index = this.data.providers.findIndex(p => p.id === id)
    if (index === -1) return undefined
    
    const provider = this.data.providers[index]
    Object.assign(provider, updates, { updatedAt: new Date() })
    
    await this.saveProvider(provider)
    return provider
  }
  
  /**
   * Delete a provider
   */
  async deleteProvider(id: string): Promise<boolean> {
    const index = this.data.providers.findIndex(p => p.id === id)
    if (index === -1) return false
    
    const provider = this.data.providers[index]
    this.data.providers.splice(index, 1)
    
    // Update index
    const typeIndex = this.data.index.providersByType[provider.type]
    if (typeIndex) {
      const idx = typeIndex.indexOf(id)
      if (idx !== -1) typeIndex.splice(idx, 1)
    }
    
    // Delete file
    const filePath = path.join(PROVIDERS_DIR, `${id}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    
    await this.saveIndex()
    return true
  }
  
  /**
   * Save a provider to disk
   */
  private async saveProvider(provider: CloudProvider): Promise<void> {
    const filePath = path.join(PROVIDERS_DIR, `${provider.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(provider, null, 2))
  }
  
  // ===========================================================================
  // Server Management
  // ===========================================================================
  
  /**
   * Get all servers
   */
  getServers(): ServerConfig[] {
    return this.data.providers.flatMap(p => p.servers)
  }
  
  /**
   * Get servers for a provider
   */
  getServersByProvider(providerId: string): ServerConfig[] {
    const provider = this.getProvider(providerId)
    return provider?.servers || []
  }
  
  /**
   * Add a server to a provider
   */
  async addServer(
    providerId: string,
    name: string,
    ip: string,
    config?: Partial<ServerConfig>
  ): Promise<ServerConfig | undefined> {
    const provider = this.getProvider(providerId)
    if (!provider) return undefined
    
    const server = createServerConfig(name, ip, provider.type)
    Object.assign(server, config)
    
    // Generate SSH command
    server.sshCommand = this.generateSshCommand(server)
    
    provider.servers.push(server)
    provider.updatedAt = new Date()
    
    // Update index
    if (!this.data.index.serversByProvider[providerId]) {
      this.data.index.serversByProvider[providerId] = []
    }
    this.data.index.serversByProvider[providerId].push(server.id)
    
    await this.saveProvider(provider)
    await this.saveIndex()
    
    return server
  }
  
  /**
   * Update a server
   */
  async updateServer(
    providerId: string,
    serverId: string,
    updates: Partial<ServerConfig>
  ): Promise<ServerConfig | undefined> {
    const provider = this.getProvider(providerId)
    if (!provider) return undefined
    
    const server = provider.servers.find(s => s.id === serverId)
    if (!server) return undefined
    
    Object.assign(server, updates)
    
    // Regenerate SSH command if relevant fields changed
    if (updates.ip || updates.sshUser || updates.sshPort || updates.sshKeyPath) {
      server.sshCommand = this.generateSshCommand(server)
    }
    
    provider.updatedAt = new Date()
    await this.saveProvider(provider)
    
    return server
  }
  
  /**
   * Delete a server
   */
  async deleteServer(providerId: string, serverId: string): Promise<boolean> {
    const provider = this.getProvider(providerId)
    if (!provider) return false
    
    const index = provider.servers.findIndex(s => s.id === serverId)
    if (index === -1) return false
    
    provider.servers.splice(index, 1)
    provider.updatedAt = new Date()
    
    // Update index
    const serverIndex = this.data.index.serversByProvider[providerId]
    if (serverIndex) {
      const idx = serverIndex.indexOf(serverId)
      if (idx !== -1) serverIndex.splice(idx, 1)
    }
    
    await this.saveProvider(provider)
    await this.saveIndex()
    
    return true
  }
  
  /**
   * Generate SSH command for a server
   */
  private generateSshCommand(server: ServerConfig): string {
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
  
  // ===========================================================================
  // Credential Management
  // ===========================================================================
  
  /**
   * Add an encrypted credential
   */
  async addCredential(name: string, service: string, value: string): Promise<EncryptedCredential | undefined> {
    if (!this.storage.unlocked) {
      console.error('[KnowledgeBase] Storage is locked')
      return undefined
    }
    
    const credential = this.storage.encryptCredential(name, service, value)
    this.credentials.push(credential)
    
    // Update index
    if (!this.data.index.credentialsByService[service]) {
      this.data.index.credentialsByService[service] = []
    }
    this.data.index.credentialsByService[service].push(credential.id)
    
    await this.saveCredentials()
    await this.saveIndex()
    
    return credential
  }
  
  /**
   * Get a decrypted credential value
   */
  getCredentialValue(id: string): string | undefined {
    if (!this.storage.unlocked) {
      console.error('[KnowledgeBase] Storage is locked')
      return undefined
    }
    
    const credential = this.credentials.find(c => c.id === id)
    if (!credential) return undefined
    
    try {
      return this.storage.decryptCredential(credential)
    } catch (error) {
      console.error('[KnowledgeBase] Failed to decrypt credential:', error)
      return undefined
    }
  }
  
  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<boolean> {
    const index = this.credentials.findIndex(c => c.id === id)
    if (index === -1) return false
    
    const credential = this.credentials[index]
    this.credentials.splice(index, 1)
    
    // Update index
    const serviceIndex = this.data.index.credentialsByService[credential.service]
    if (serviceIndex) {
      const idx = serviceIndex.indexOf(id)
      if (idx !== -1) serviceIndex.splice(idx, 1)
    }
    
    await this.saveCredentials()
    await this.saveIndex()
    
    return true
  }
  
  /**
   * Save credentials to disk
   */
  private async saveCredentials(): Promise<void> {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(this.credentials, null, 2))
  }
  
  // ===========================================================================
  // Document Import
  // ===========================================================================
  
  /**
   * Import a document and parse it for infrastructure info
   */
  async importDocument(
    providerId: string,
    filename: string,
    content: string
  ): Promise<ImportedDocument> {
    const provider = this.getProvider(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }
    
    // Determine file type
    const ext = path.extname(filename).toLowerCase().slice(1) as 'md' | 'txt' | 'json' | 'yaml'
    
    // Create document
    const doc: ImportedDocument = {
      id: generateId('doc'),
      filename,
      fileType: ext || 'txt',
      importedAt: new Date(),
      content,
      extractedData: this.parseDocument(content),
    }
    
    // Add to provider
    provider.importedDocs.push(doc)
    provider.updatedAt = new Date()
    
    // Save document file
    const docPath = path.join(DOCS_DIR, `${doc.id}_${filename}`)
    fs.writeFileSync(docPath, content)
    
    // Auto-create servers from extracted data
    if (doc.extractedData?.servers) {
      for (const serverData of doc.extractedData.servers) {
        if (serverData.ip && serverData.name) {
          await this.addServer(providerId, serverData.name, serverData.ip, serverData)
        }
      }
    }
    
    await this.saveProvider(provider)
    
    return doc
  }
  
  /**
   * Parse a document for infrastructure information
   * Uses the DocumentParser for comprehensive extraction
   */
  private parseDocument(content: string): ImportedDocument['extractedData'] {
    // Use the DocumentParser for comprehensive parsing
    const parser = new DocumentParser()
    const parsed = parser.parse(content)
    
    // Convert to the expected format
    const result: ImportedDocument['extractedData'] = {
      servers: parsed.servers.map(s => ({
        name: s.name,
        ip: s.ip,
        sshUser: s.sshUser,
        sshPort: s.sshPort,
        sshKeyPath: s.sshKeyPath,
        sshCommand: s.sshCommand,
        domain: s.domain,
        provider: s.provider,
        instanceId: s.instanceId,
        instanceType: s.instanceType,
      })),
      apiKeys: parsed.apiKeys.map(k => ({
        name: k.name,
        service: k.service,
        isRedacted: k.isRedacted,
      })),
      domains: parsed.domains,
      accountIds: parsed.accountIds.map(a => ({
        provider: a.provider,
        id: a.id,
      })),
      keyValuePairs: parsed.keyValuePairs,
    }
    
    return result
  }
  
  // ===========================================================================
  // AI Context Generation - PRIVACY-FIRST
  // ===========================================================================
  
  /**
   * Generate SAFE context for AI prompts - NO SENSITIVE DATA
   * 
   * SECURITY: This method ONLY returns:
   * - Provider names and types
   * - Server names (NOT IPs, NOT credentials)
   * - Region (if configured)
   * 
   * NEVER includes:
   * - IP addresses
   * - SSH credentials (user, port, key path)
   * - API keys or tokens
   * - Account IDs
   * - Passwords
   */
  generateAIContext(): string {
    if (this.data.providers.length === 0) {
      return ''
    }
    
    let context = '## AVAILABLE INFRASTRUCTURE (Local Knowledge Base)\n\n'
    context += 'The user has configured the following cloud infrastructure locally.\n'
    context += 'When they ask about servers or deployments, reference these by NAME.\n'
    context += 'The actual credentials are stored LOCALLY and used by the app to execute commands.\n'
    context += 'You do NOT have access to IPs, SSH keys, or API credentials.\n\n'
    
    for (const provider of this.data.providers) {
      context += `### ${provider.emoji} ${provider.name}\n`
      context += `- Type: ${this.getProviderDisplayName(provider.type)}\n`
      
      // Region is safe to share (not sensitive)
      if (provider.connection.region) {
        context += `- Region: ${provider.connection.region}\n`
      }
      
      // Only share server NAMES - NOT IPs or credentials
      if (provider.servers.length > 0) {
        context += `- Servers configured: ${provider.servers.length}\n`
        context += `- Server names:\n`
        for (const server of provider.servers) {
          context += `  - "${server.name}"\n`
        }
      }
      
      context += '\n'
    }
    
    context += '**To connect to a server:**\n'
    context += '1. Tell the user which server you want to connect to BY NAME\n'
    context += '2. The app will use locally-stored credentials to execute\n'
    context += '3. You will receive the OUTPUT (logs, results) to analyze\n'
    context += '4. You NEVER see the actual credentials, IPs, or SSH keys\n'
    
    return context
  }
  
  /**
   * Get provider display name
   */
  private getProviderDisplayName(type: CloudProviderType): string {
    const names: Partial<Record<CloudProviderType, string>> = {
      aws: 'Amazon Web Services',
      digitalocean: 'DigitalOcean',
      gcp: 'Google Cloud Platform',
      azure: 'Microsoft Azure',
      cloudflare: 'Cloudflare',
      vercel: 'Vercel',
      firebase: 'Firebase',
      sentry: 'Sentry',
      github: 'GitHub',
      bitbucket: 'Bitbucket',
      gitlab: 'GitLab',
      sendgrid: 'SendGrid',
      datadog: 'Datadog',
      godaddy: 'GoDaddy',
      custom: 'Custom Provider',
    }
    return names[type] || type
  }
  
  /**
   * Get relevant SAFE context for a specific query - NO SENSITIVE DATA
   */
  getRelevantContext(query: string): string {
    const queryLower = query.toLowerCase()
    const relevantProviders: CloudProvider[] = []
    
    // Find relevant providers based on query (match by NAME only, not IP)
    for (const provider of this.data.providers) {
      const providerName = provider.name.toLowerCase()
      const providerType = provider.type.toLowerCase()
      
      if (
        queryLower.includes(providerName) ||
        queryLower.includes(providerType) ||
        provider.servers.some(s => 
          queryLower.includes(s.name.toLowerCase())
          // NOTE: Removed IP and domain matching for security
        )
      ) {
        relevantProviders.push(provider)
      }
    }
    
    // Check for general infrastructure keywords
    const infraKeywords = ['server', 'ssh', 'logs', 'deploy', 'cloud', 'aws', 'database', 'api']
    if (infraKeywords.some(kw => queryLower.includes(kw)) && relevantProviders.length === 0) {
      // Return all providers if query is about infrastructure but no specific match
      return this.generateAIContext()
    }
    
    if (relevantProviders.length === 0) {
      return ''
    }
    
    // Generate SAFE context for relevant providers only - NO sensitive data
    let context = '## Relevant Infrastructure\n\n'
    
    for (const provider of relevantProviders) {
      context += `### ${provider.emoji} ${provider.name}\n`
      context += `- Type: ${this.getProviderDisplayName(provider.type)}\n`
      
      // Region is safe
      if (provider.connection.region) {
        context += `- Region: ${provider.connection.region}\n`
      }
      
      // Only share server NAMES - NOT IPs, NOT SSH commands
      if (provider.servers.length > 0) {
        context += `- Servers: ${provider.servers.length} configured\n`
        for (const server of provider.servers) {
          context += `  - "${server.name}"\n`
        }
      }
      
      context += '\n'
    }
    
    context += '\n**Note:** Credentials are stored locally. Ask the user to connect to a server by NAME.\n'
    
    return context
  }
  
  // ===========================================================================
  // Persistence
  // ===========================================================================
  
  /**
   * Save the index to disk
   */
  private async saveIndex(): Promise<void> {
    this.data.index.lastUpdated = new Date()
    fs.writeFileSync(INDEX_FILE, JSON.stringify(this.data.index, null, 2))
  }
  
  /**
   * Save preferences to disk
   */
  async savePreferences(preferences: Partial<KnowledgeBasePreferences>): Promise<void> {
    Object.assign(this.data.preferences, preferences)
    
    const config = {
      preferences: this.data.preferences,
    }
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  }
  
  /**
   * Get current preferences
   */
  getPreferences(): KnowledgeBasePreferences {
    return { ...this.data.preferences }
  }
  
  // ===========================================================================
  // Statistics
  // ===========================================================================
  
  /**
   * Get knowledge base statistics
   */
  getStats(): {
    providerCount: number
    serverCount: number
    credentialCount: number
    documentCount: number
  } {
    return {
      providerCount: this.data.providers.length,
      serverCount: this.data.providers.reduce((sum, p) => sum + p.servers.length, 0),
      credentialCount: this.credentials.length,
      documentCount: this.data.providers.reduce((sum, p) => sum + p.importedDocs.length, 0),
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/** Global knowledge base manager instance */
export const knowledgeBase = new KnowledgeBaseManager()


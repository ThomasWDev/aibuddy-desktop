/**
 * Knowledge Base Types
 * 
 * Type definitions for the Cloud Knowledge Base feature.
 * Stores cloud provider documentation, credentials, and infrastructure details locally.
 * 
 * @module knowledge/types
 */

// =============================================================================
// Cloud Provider Types
// =============================================================================

/**
 * Supported cloud provider types
 */
export type CloudProviderType = 
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'cloudflare'
  | 'digitalocean'
  | 'firebase'
  | 'vercel'
  | 'sentry'
  | 'github'
  | 'bitbucket'
  | 'gitlab'
  | 'sendgrid'
  | 'datadog'
  | 'godaddy'
  | 'custom'

/**
 * Provider category for organization
 */
export type ProviderCategory = 
  | 'cloud'      // AWS, GCP, Azure, DigitalOcean
  | 'cdn'        // Cloudflare
  | 'hosting'    // Vercel, Firebase
  | 'monitoring' // Sentry, Datadog
  | 'vcs'        // GitHub, Bitbucket, GitLab
  | 'email'      // SendGrid
  | 'domain'     // GoDaddy
  | 'custom'

// =============================================================================
// Server Configuration
// =============================================================================

/**
 * SSH server configuration
 */
export interface ServerConfig {
  /** Unique identifier */
  id: string
  /** User-friendly name (e.g., "Denver Production") */
  name: string
  /** Server IP address */
  ip: string
  /** Cloud provider (aws, digitalocean, etc.) */
  provider: CloudProviderType
  /** Cloud instance ID (e.g., i-0030a379f872bdea3) */
  instanceId?: string
  /** Instance type (e.g., t3.medium) */
  instanceType?: string
  /** SSH username */
  sshUser: string
  /** Path to SSH key file */
  sshKeyPath?: string
  /** SSH port (default: 22) */
  sshPort: number
  /** Associated domain */
  domain?: string
  /** SSH command for quick copy */
  sshCommand?: string
  /** Additional notes */
  notes?: string
  /** Tags for organization */
  tags: string[]
  /** Last connection timestamp */
  lastConnectedAt?: Date
}

// =============================================================================
// Cloud Provider Configuration
// =============================================================================

/**
 * Cloud provider configuration
 */
export interface CloudProvider {
  /** Unique identifier */
  id: string
  /** Provider type */
  type: CloudProviderType
  /** User-friendly name */
  name: string
  /** Emoji icon */
  emoji: string
  /** Category for organization */
  category: ProviderCategory
  /** Whether this provider is connected/configured */
  isConnected: boolean
  
  // Connection details
  connection: {
    /** Connection type */
    type: 'api' | 'ssh' | 'cli'
    /** API base URL */
    baseUrl?: string
    /** Region (e.g., us-east-2) */
    region?: string
    /** Account identifier */
    accountId?: string
  }
  
  // Credential reference (stored encrypted separately)
  credentialId?: string
  
  // Infrastructure
  servers: ServerConfig[]
  
  // CLI configuration
  cli?: {
    /** CLI command name (e.g., aws, doctl) */
    name: string
    /** Install command */
    installCommand: string
    /** Configuration command */
    configCommand: string
    /** Test command */
    testCommand: string
  }
  
  // Quick actions available for this provider
  quickActions: string[]
  
  // Imported documentation
  importedDocs: ImportedDocument[]
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastUsedAt?: Date
  notes?: string
}

// =============================================================================
// Document Import
// =============================================================================

/**
 * Imported documentation
 */
export interface ImportedDocument {
  /** Unique identifier */
  id: string
  /** Original filename */
  filename: string
  /** File type */
  fileType: 'md' | 'txt' | 'json' | 'yaml'
  /** When imported */
  importedAt: Date
  /** Parsed content (searchable) */
  content: string
  /** Extracted data from parsing */
  extractedData?: ExtractedData
}

/**
 * Data extracted from imported documents
 */
export interface ExtractedData {
  /** Detected servers */
  servers: Partial<ServerConfig>[]
  /** Detected API keys (names only, values encrypted) */
  apiKeys: { name: string; service: string }[]
  /** Detected domains */
  domains: string[]
  /** Detected account IDs */
  accountIds: { provider: string; id: string }[]
  /** Raw key-value pairs */
  keyValuePairs: Record<string, string>
}

// =============================================================================
// Encrypted Credentials
// =============================================================================

/**
 * Encrypted credential entry
 */
export interface EncryptedCredential {
  /** Unique identifier */
  id: string
  /** Credential name */
  name: string
  /** Service this credential is for */
  service: CloudProviderType | string
  /** Encrypted value (AES-256-GCM) */
  encryptedValue: string
  /** Initialization vector for decryption */
  iv: string
  /** Auth tag for verification */
  authTag: string
  /** When created */
  createdAt: Date
  /** When last used */
  lastUsedAt?: Date
}

// =============================================================================
// Knowledge Base Index
// =============================================================================

/**
 * Quick lookup index for the knowledge base
 */
export interface KnowledgeBaseIndex {
  /** Version for migrations */
  version: number
  /** Last updated timestamp */
  lastUpdated: Date
  /** Provider IDs by type */
  providersByType: Record<CloudProviderType, string[]>
  /** Server IDs by provider */
  serversByProvider: Record<string, string[]>
  /** Credential IDs by service */
  credentialsByService: Record<string, string[]>
  /** Search keywords mapped to provider/server IDs */
  searchIndex: Record<string, string[]>
}

// =============================================================================
// User Preferences
// =============================================================================

/**
 * Knowledge base user preferences
 */
export interface KnowledgeBasePreferences {
  /** Auto-inject knowledge base context into AI prompts */
  autoInjectContext: boolean
  /** Show SSH connection suggestions */
  showSshSuggestions: boolean
  /** Default SSH terminal */
  defaultTerminal: 'integrated' | 'external'
  /** Require confirmation before SSH commands */
  confirmSshCommands: boolean
  /** Auto-discover local credentials (~/.ssh, ~/.aws) */
  autoDiscoverCredentials: boolean
  /** Encryption password hint */
  passwordHint?: string
}

// =============================================================================
// Full Knowledge Base Structure
// =============================================================================

/**
 * Complete knowledge base data structure
 */
export interface KnowledgeBaseData {
  /** Version for migrations */
  version: number
  /** User preferences */
  preferences: KnowledgeBasePreferences
  /** Cloud providers */
  providers: CloudProvider[]
  /** Index for quick lookups */
  index: KnowledgeBaseIndex
}

// =============================================================================
// Default Values
// =============================================================================

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES: KnowledgeBasePreferences = {
  autoInjectContext: true,
  showSshSuggestions: true,
  defaultTerminal: 'integrated',
  confirmSshCommands: true,
  autoDiscoverCredentials: false,
}

/**
 * Provider emoji defaults
 */
export const PROVIDER_EMOJIS: Record<CloudProviderType, string> = {
  aws: '☁️',
  gcp: '🌈',
  azure: '🔷',
  cloudflare: '🌩️',
  digitalocean: '🌊',
  firebase: '🔥',
  vercel: '▲',
  sentry: '🐛',
  github: '🐙',
  bitbucket: '🔵',
  gitlab: '🦊',
  sendgrid: '📧',
  datadog: '🐕',
  godaddy: '🌐',
  custom: '⚙️',
}

/**
 * Provider display names
 */
export const PROVIDER_NAMES: Record<CloudProviderType, string> = {
  aws: 'Amazon AWS',
  gcp: 'Google Cloud',
  azure: 'Microsoft Azure',
  cloudflare: 'Cloudflare',
  digitalocean: 'DigitalOcean',
  firebase: 'Firebase',
  vercel: 'Vercel',
  sentry: 'Sentry',
  github: 'GitHub',
  bitbucket: 'Bitbucket',
  gitlab: 'GitLab',
  sendgrid: 'SendGrid',
  datadog: 'Datadog',
  godaddy: 'GoDaddy',
  custom: 'Custom Service',
}

/**
 * Provider categories
 */
export const PROVIDER_CATEGORIES: Record<CloudProviderType, ProviderCategory> = {
  aws: 'cloud',
  gcp: 'cloud',
  azure: 'cloud',
  cloudflare: 'cdn',
  digitalocean: 'cloud',
  firebase: 'hosting',
  vercel: 'hosting',
  sentry: 'monitoring',
  github: 'vcs',
  bitbucket: 'vcs',
  gitlab: 'vcs',
  sendgrid: 'email',
  datadog: 'monitoring',
  godaddy: 'domain',
  custom: 'custom',
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'kb'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a new cloud provider
 */
export function createCloudProvider(
  type: CloudProviderType,
  name?: string
): CloudProvider {
  return {
    id: generateId('provider'),
    type,
    name: name || PROVIDER_NAMES[type],
    emoji: PROVIDER_EMOJIS[type],
    category: PROVIDER_CATEGORIES[type],
    isConnected: false,
    connection: {
      type: 'api',
    },
    servers: [],
    quickActions: [],
    importedDocs: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Create a new server config
 */
export function createServerConfig(
  name: string,
  ip: string,
  provider: CloudProviderType
): ServerConfig {
  return {
    id: generateId('server'),
    name,
    ip,
    provider,
    sshUser: 'root',
    sshPort: 22,
    tags: [],
  }
}

/**
 * Create empty knowledge base
 */
export function createEmptyKnowledgeBase(): KnowledgeBaseData {
  return {
    version: 1,
    preferences: { ...DEFAULT_PREFERENCES },
    providers: [],
    index: {
      version: 1,
      lastUpdated: new Date(),
      providersByType: {} as Record<CloudProviderType, string[]>,
      serversByProvider: {},
      credentialsByService: {},
      searchIndex: {},
    },
  }
}


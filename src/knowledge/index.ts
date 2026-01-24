/**
 * Knowledge Base Module
 * 
 * Exports all knowledge base functionality for the desktop app.
 * 
 * @module knowledge
 */

// Types
export * from './types'

// Encryption
export { 
  SecureStorage, 
  secureStorage,
  encrypt,
  decrypt,
  deriveKey,
  generateSalt,
  generateSecurePassword,
  hashValue,
  secureCompare,
} from './encryption'

// Manager
export { KnowledgeBaseManager, knowledgeBase } from './manager'

// Document Parser
export { DocumentParser, documentParser } from './document-parser'
export type { 
  ParseResult, 
  DetectedServer, 
  DetectedApiKey, 
  DetectedAccountId, 
  DetectedSshCommand 
} from './document-parser'

// Cloud Provider Prompts
export * from './cloud-provider-prompts'


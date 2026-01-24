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

// Cloud Provider Prompts
export * from './cloud-provider-prompts'


/**
 * Encryption Utilities for Knowledge Base
 * 
 * Provides AES-256-GCM encryption for sensitive credentials.
 * Uses Node.js crypto module for secure encryption.
 * 
 * @module knowledge/encryption
 */

import * as crypto from 'crypto'
import * as os from 'os'
import { EncryptedCredential, generateId } from './types'

// =============================================================================
// Constants
// =============================================================================

/** Encryption algorithm */
const ALGORITHM = 'aes-256-gcm'

/** Key length in bytes (256 bits) */
const KEY_LENGTH = 32

/** IV length in bytes */
const IV_LENGTH = 16

/** Auth tag length in bytes */
const AUTH_TAG_LENGTH = 16

/** Salt length for key derivation */
const SALT_LENGTH = 32

/** PBKDF2 iterations */
const PBKDF2_ITERATIONS = 100000

// =============================================================================
// Key Derivation
// =============================================================================

/**
 * Derive an encryption key from a password
 * Uses PBKDF2 with SHA-512 for secure key derivation
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  )
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH)
}

/**
 * Generate a machine-specific identifier for additional entropy
 * Combines hostname, username, and platform info
 */
export function getMachineId(): string {
  const parts = [
    os.hostname(),
    os.userInfo().username,
    os.platform(),
    os.arch(),
  ]
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex')
}

// =============================================================================
// Encryption Functions
// =============================================================================

/**
 * Encrypt a string value using AES-256-GCM
 * 
 * @param plaintext - The value to encrypt
 * @param key - The encryption key (32 bytes)
 * @returns Object containing encrypted data, IV, and auth tag
 */
export function encrypt(
  plaintext: string,
  key: Buffer
): { encrypted: string; iv: string; authTag: string } {
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH)
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  // Get auth tag
  const authTag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  }
}

/**
 * Decrypt a value encrypted with AES-256-GCM
 * 
 * @param encrypted - The encrypted value (base64)
 * @param key - The encryption key (32 bytes)
 * @param iv - The initialization vector (base64)
 * @param authTag - The authentication tag (base64)
 * @returns The decrypted plaintext
 */
export function decrypt(
  encrypted: string,
  key: Buffer,
  iv: string,
  authTag: string
): string {
  // Create decipher
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  )
  
  // Set auth tag
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  
  // Decrypt
  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// =============================================================================
// Credential Encryption
// =============================================================================

/**
 * Encrypt a credential value and create an EncryptedCredential object
 */
export function encryptCredential(
  name: string,
  service: string,
  value: string,
  key: Buffer
): EncryptedCredential {
  const { encrypted, iv, authTag } = encrypt(value, key)
  
  return {
    id: generateId('cred'),
    name,
    service,
    encryptedValue: encrypted,
    iv,
    authTag,
    createdAt: new Date(),
  }
}

/**
 * Decrypt an EncryptedCredential object
 */
export function decryptCredential(
  credential: EncryptedCredential,
  key: Buffer
): string {
  return decrypt(
    credential.encryptedValue,
    key,
    credential.iv,
    credential.authTag
  )
}

// =============================================================================
// Secure Storage Class
// =============================================================================

/**
 * Manages encrypted credential storage
 */
export class SecureStorage {
  private key: Buffer | null = null
  private salt: Buffer | null = null
  private isUnlocked = false
  
  /**
   * Initialize storage with a password
   * Creates a new salt if not provided
   */
  initialize(password: string, existingSalt?: string): void {
    this.salt = existingSalt 
      ? Buffer.from(existingSalt, 'base64')
      : generateSalt()
    
    // Combine password with machine ID for additional security
    const combinedPassword = `${password}:${getMachineId()}`
    this.key = deriveKey(combinedPassword, this.salt)
    this.isUnlocked = true
  }
  
  /**
   * Lock the storage (clear the key from memory)
   */
  lock(): void {
    if (this.key) {
      // Overwrite key with zeros before clearing
      this.key.fill(0)
    }
    this.key = null
    this.isUnlocked = false
  }
  
  /**
   * Check if storage is unlocked
   */
  get unlocked(): boolean {
    return this.isUnlocked
  }
  
  /**
   * Get the salt (for storage)
   */
  getSalt(): string | null {
    return this.salt?.toString('base64') || null
  }
  
  /**
   * Encrypt a value
   */
  encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
    if (!this.key) {
      throw new Error('Storage is locked. Call initialize() first.')
    }
    return encrypt(plaintext, this.key)
  }
  
  /**
   * Decrypt a value
   */
  decrypt(encrypted: string, iv: string, authTag: string): string {
    if (!this.key) {
      throw new Error('Storage is locked. Call initialize() first.')
    }
    return decrypt(encrypted, this.key, iv, authTag)
  }
  
  /**
   * Encrypt a credential
   */
  encryptCredential(name: string, service: string, value: string): EncryptedCredential {
    if (!this.key) {
      throw new Error('Storage is locked. Call initialize() first.')
    }
    return encryptCredential(name, service, value, this.key)
  }
  
  /**
   * Decrypt a credential
   */
  decryptCredential(credential: EncryptedCredential): string {
    if (!this.key) {
      throw new Error('Storage is locked. Call initialize() first.')
    }
    return decryptCredential(credential, this.key)
  }
  
  /**
   * Verify a password against the stored salt
   */
  verifyPassword(password: string, testValue: string, encrypted: string, iv: string, authTag: string): boolean {
    if (!this.salt) {
      return false
    }
    
    try {
      const combinedPassword = `${password}:${getMachineId()}`
      const testKey = deriveKey(combinedPassword, this.salt)
      const decrypted = decrypt(encrypted, testKey, iv, authTag)
      return decrypted === testValue
    } catch {
      return false
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/** Global secure storage instance */
export const secureStorage = new SecureStorage()

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const randomBytes = crypto.randomBytes(length)
  let password = ''
  
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length]
  }
  
  return password
}

/**
 * Hash a value (one-way, for verification)
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Compare two strings in constant time (prevents timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}


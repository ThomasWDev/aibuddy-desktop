/**
 * Unit Tests for Knowledge Base Encryption
 * 
 * Tests AES-256-GCM encryption, key derivation, and SecureStorage class.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  encrypt,
  decrypt,
  deriveKey,
  generateSalt,
  SecureStorage,
  generateSecurePassword,
  hashValue,
  secureCompare,
  encryptCredential,
  decryptCredential,
} from '../encryption'

describe('Encryption Module', () => {
  describe('generateSalt', () => {
    it('should generate 32-byte salt', () => {
      const salt = generateSalt()
      expect(salt.length).toBe(32)
    })

    it('should generate unique salts', () => {
      const salt1 = generateSalt()
      const salt2 = generateSalt()
      expect(salt1.equals(salt2)).toBe(false)
    })
  })

  describe('deriveKey', () => {
    it('should derive 32-byte key', () => {
      const salt = generateSalt()
      const key = deriveKey('password123', salt)
      expect(key.length).toBe(32)
    })

    it('should derive same key for same password and salt', () => {
      const salt = generateSalt()
      const key1 = deriveKey('password123', salt)
      const key2 = deriveKey('password123', salt)
      expect(key1.equals(key2)).toBe(true)
    })

    it('should derive different keys for different passwords', () => {
      const salt = generateSalt()
      const key1 = deriveKey('password123', salt)
      const key2 = deriveKey('password456', salt)
      expect(key1.equals(key2)).toBe(false)
    })

    it('should derive different keys for different salts', () => {
      const salt1 = generateSalt()
      const salt2 = generateSalt()
      const key1 = deriveKey('password123', salt1)
      const key2 = deriveKey('password123', salt2)
      expect(key1.equals(key2)).toBe(false)
    })
  })

  describe('encrypt/decrypt', () => {
    let key: Buffer

    beforeEach(() => {
      const salt = generateSalt()
      key = deriveKey('testpassword', salt)
    })

    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'Hello, World!'
      const { encrypted, iv, authTag } = encrypt(plaintext, key)
      const decrypted = decrypt(encrypted, key, iv, authTag)
      
      expect(decrypted).toBe(plaintext)
    })

    it('should encrypt to different ciphertext each time (random IV)', () => {
      const plaintext = 'Same message'
      const result1 = encrypt(plaintext, key)
      const result2 = encrypt(plaintext, key)
      
      expect(result1.encrypted).not.toBe(result2.encrypted)
      expect(result1.iv).not.toBe(result2.iv)
    })

    it('should handle empty string', () => {
      const plaintext = ''
      const { encrypted, iv, authTag } = encrypt(plaintext, key)
      const decrypted = decrypt(encrypted, key, iv, authTag)
      
      expect(decrypted).toBe(plaintext)
    })

    it('should handle long text', () => {
      const plaintext = 'A'.repeat(10000)
      const { encrypted, iv, authTag } = encrypt(plaintext, key)
      const decrypted = decrypt(encrypted, key, iv, authTag)
      
      expect(decrypted).toBe(plaintext)
    })

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\n\\t'
      const { encrypted, iv, authTag } = encrypt(plaintext, key)
      const decrypted = decrypt(encrypted, key, iv, authTag)
      
      expect(decrypted).toBe(plaintext)
    })

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا العالم'
      const { encrypted, iv, authTag } = encrypt(plaintext, key)
      const decrypted = decrypt(encrypted, key, iv, authTag)
      
      expect(decrypted).toBe(plaintext)
    })

    it('should fail with wrong key', () => {
      const plaintext = 'Secret message'
      const { encrypted, iv, authTag } = encrypt(plaintext, key)
      
      const wrongSalt = generateSalt()
      const wrongKey = deriveKey('wrongpassword', wrongSalt)
      
      expect(() => decrypt(encrypted, wrongKey, iv, authTag)).toThrow()
    })

    it('should fail with tampered ciphertext', () => {
      const plaintext = 'Secret message'
      const { encrypted, iv, authTag } = encrypt(plaintext, key)
      
      // Tamper with the ciphertext
      const tamperedEncrypted = encrypted.slice(0, -1) + 'X'
      
      expect(() => decrypt(tamperedEncrypted, key, iv, authTag)).toThrow()
    })

    it('should fail with tampered auth tag', () => {
      const plaintext = 'Secret message'
      const { encrypted, iv, authTag } = encrypt(plaintext, key)
      
      // Tamper with the auth tag by decoding, modifying, and re-encoding
      const authTagBuffer = Buffer.from(authTag, 'base64')
      authTagBuffer[0] = authTagBuffer[0] ^ 0xFF // Flip all bits in first byte
      const tamperedAuthTag = authTagBuffer.toString('base64')
      
      expect(() => decrypt(encrypted, key, iv, tamperedAuthTag)).toThrow()
    })
  })

  describe('encryptCredential/decryptCredential', () => {
    let key: Buffer

    beforeEach(() => {
      const salt = generateSalt()
      key = deriveKey('testpassword', salt)
    })

    it('should create encrypted credential object', () => {
      const credential = encryptCredential('AWS Key', 'aws', 'AKIAIOSFODNN7EXAMPLE', key)
      
      expect(credential.id).toBeDefined()
      expect(credential.id.startsWith('cred_')).toBe(true)
      expect(credential.name).toBe('AWS Key')
      expect(credential.service).toBe('aws')
      expect(credential.encryptedValue).toBeDefined()
      expect(credential.iv).toBeDefined()
      expect(credential.authTag).toBeDefined()
      expect(credential.createdAt).toBeInstanceOf(Date)
    })

    it('should decrypt credential correctly', () => {
      const originalValue = 'sk-ant-api03-secret-key'
      const credential = encryptCredential('Claude Key', 'anthropic', originalValue, key)
      const decrypted = decryptCredential(credential, key)
      
      expect(decrypted).toBe(originalValue)
    })

    it('should not expose original value in credential object', () => {
      const originalValue = 'super-secret-api-key'
      const credential = encryptCredential('API Key', 'custom', originalValue, key)
      
      expect(JSON.stringify(credential)).not.toContain(originalValue)
    })
  })

  describe('SecureStorage', () => {
    let storage: SecureStorage

    beforeEach(() => {
      storage = new SecureStorage()
    })

    afterEach(() => {
      storage.lock()
    })

    it('should initialize and unlock', () => {
      storage.initialize('password123')
      expect(storage.unlocked).toBe(true)
    })

    it('should lock storage', () => {
      storage.initialize('password123')
      storage.lock()
      expect(storage.unlocked).toBe(false)
    })

    it('should encrypt when unlocked', () => {
      storage.initialize('password123')
      const result = storage.encrypt('secret')
      
      expect(result.encrypted).toBeDefined()
      expect(result.iv).toBeDefined()
      expect(result.authTag).toBeDefined()
    })

    it('should throw when encrypting while locked', () => {
      expect(() => storage.encrypt('secret')).toThrow('Storage is locked')
    })

    it('should decrypt when unlocked', () => {
      storage.initialize('password123')
      const { encrypted, iv, authTag } = storage.encrypt('secret message')
      const decrypted = storage.decrypt(encrypted, iv, authTag)
      
      expect(decrypted).toBe('secret message')
    })

    it('should throw when decrypting while locked', () => {
      storage.initialize('password123')
      const { encrypted, iv, authTag } = storage.encrypt('secret')
      storage.lock()
      
      expect(() => storage.decrypt(encrypted, iv, authTag)).toThrow('Storage is locked')
    })

    it('should return salt after initialization', () => {
      storage.initialize('password123')
      const salt = storage.getSalt()
      
      expect(salt).toBeDefined()
      expect(typeof salt).toBe('string')
      expect(salt!.length).toBeGreaterThan(0)
    })

    it('should use existing salt when provided', () => {
      storage.initialize('password123')
      const salt = storage.getSalt()
      storage.lock()
      
      // Create new storage with same salt
      const storage2 = new SecureStorage()
      storage2.initialize('password123', salt!)
      
      // Both should decrypt the same way
      storage.initialize('password123', salt!)
      const { encrypted, iv, authTag } = storage.encrypt('test')
      const decrypted = storage2.decrypt(encrypted, iv, authTag)
      
      expect(decrypted).toBe('test')
    })

    it('should encrypt and decrypt credentials', () => {
      storage.initialize('password123')
      
      const credential = storage.encryptCredential('Test Key', 'test', 'secret-value')
      const decrypted = storage.decryptCredential(credential)
      
      expect(decrypted).toBe('secret-value')
    })
  })

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = generateSecurePassword(16)
      expect(password.length).toBe(16)
    })

    it('should default to 32 characters', () => {
      const password = generateSecurePassword()
      expect(password.length).toBe(32)
    })

    it('should generate unique passwords', () => {
      const password1 = generateSecurePassword()
      const password2 = generateSecurePassword()
      expect(password1).not.toBe(password2)
    })

    it('should contain valid characters', () => {
      const password = generateSecurePassword(100)
      const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
      
      for (const char of password) {
        expect(validChars).toContain(char)
      }
    })
  })

  describe('hashValue', () => {
    it('should hash value to hex string', () => {
      const hash = hashValue('test')
      expect(typeof hash).toBe('string')
      expect(hash.length).toBe(64) // SHA-256 produces 64 hex characters
    })

    it('should produce same hash for same input', () => {
      const hash1 = hashValue('test')
      const hash2 = hashValue('test')
      expect(hash1).toBe(hash2)
    })

    it('should produce different hash for different input', () => {
      const hash1 = hashValue('test1')
      const hash2 = hashValue('test2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      expect(secureCompare('abc', 'abc')).toBe(true)
    })

    it('should return false for different strings', () => {
      expect(secureCompare('abc', 'abd')).toBe(false)
    })

    it('should return false for different lengths', () => {
      expect(secureCompare('abc', 'abcd')).toBe(false)
    })

    it('should handle empty strings', () => {
      expect(secureCompare('', '')).toBe(true)
      expect(secureCompare('', 'a')).toBe(false)
    })
  })
})


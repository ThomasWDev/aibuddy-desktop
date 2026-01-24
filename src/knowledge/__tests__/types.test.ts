/**
 * Unit Tests for Knowledge Base Types
 * 
 * Tests type definitions, factory functions, and default values.
 */

import { describe, it, expect } from 'vitest'
import {
  generateId,
  createCloudProvider,
  createServerConfig,
  createEmptyKnowledgeBase,
  PROVIDER_NAMES,
  PROVIDER_EMOJIS,
  PROVIDER_CATEGORIES,
  DEFAULT_PREFERENCES,
  CloudProviderType,
} from '../types'

describe('Knowledge Base Types', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      
      expect(id1).not.toBe(id2)
    })

    it('should use provided prefix', () => {
      const id = generateId('test')
      expect(id.startsWith('test_')).toBe(true)
    })

    it('should use default prefix "kb"', () => {
      const id = generateId()
      expect(id.startsWith('kb_')).toBe(true)
    })

    it('should include timestamp', () => {
      const before = Date.now()
      const id = generateId()
      const after = Date.now()
      
      // Extract timestamp from ID (format: prefix_timestamp_random)
      const parts = id.split('_')
      const timestamp = parseInt(parts[1], 10)
      
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('createCloudProvider', () => {
    it('should create provider with correct type', () => {
      const provider = createCloudProvider('aws')
      
      expect(provider.type).toBe('aws')
      expect(provider.name).toBe('Amazon AWS')
      expect(provider.emoji).toBe('☁️')
      expect(provider.category).toBe('cloud')
    })

    it('should create provider with custom name', () => {
      const provider = createCloudProvider('aws', 'My AWS Account')
      
      expect(provider.name).toBe('My AWS Account')
    })

    it('should initialize with empty arrays', () => {
      const provider = createCloudProvider('digitalocean')
      
      expect(provider.servers).toEqual([])
      expect(provider.quickActions).toEqual([])
      expect(provider.importedDocs).toEqual([])
    })

    it('should set isConnected to false', () => {
      const provider = createCloudProvider('cloudflare')
      
      expect(provider.isConnected).toBe(false)
    })

    it('should set timestamps', () => {
      const before = new Date()
      const provider = createCloudProvider('sentry')
      const after = new Date()
      
      expect(provider.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(provider.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(provider.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('should create all provider types correctly', () => {
      const types: CloudProviderType[] = [
        'aws', 'gcp', 'azure', 'cloudflare', 'digitalocean',
        'firebase', 'vercel', 'sentry', 'github', 'bitbucket',
        'gitlab', 'sendgrid', 'datadog', 'godaddy', 'custom'
      ]
      
      for (const type of types) {
        const provider = createCloudProvider(type)
        expect(provider.type).toBe(type)
        expect(provider.name).toBe(PROVIDER_NAMES[type])
        expect(provider.emoji).toBe(PROVIDER_EMOJIS[type])
        expect(provider.category).toBe(PROVIDER_CATEGORIES[type])
      }
    })
  })

  describe('createServerConfig', () => {
    it('should create server with required fields', () => {
      const server = createServerConfig('Production', '192.168.1.1', 'aws')
      
      expect(server.name).toBe('Production')
      expect(server.ip).toBe('192.168.1.1')
      expect(server.provider).toBe('aws')
    })

    it('should set default SSH port to 22', () => {
      const server = createServerConfig('Test', '10.0.0.1', 'digitalocean')
      
      expect(server.sshPort).toBe(22)
    })

    it('should set default SSH user to root', () => {
      const server = createServerConfig('Test', '10.0.0.1', 'digitalocean')
      
      expect(server.sshUser).toBe('root')
    })

    it('should initialize tags as empty array', () => {
      const server = createServerConfig('Test', '10.0.0.1', 'gcp')
      
      expect(server.tags).toEqual([])
    })

    it('should generate unique ID', () => {
      const server1 = createServerConfig('Server1', '1.1.1.1', 'aws')
      const server2 = createServerConfig('Server2', '2.2.2.2', 'aws')
      
      expect(server1.id).not.toBe(server2.id)
      expect(server1.id.startsWith('server_')).toBe(true)
    })
  })

  describe('createEmptyKnowledgeBase', () => {
    it('should create with version 1', () => {
      const kb = createEmptyKnowledgeBase()
      
      expect(kb.version).toBe(1)
    })

    it('should have default preferences', () => {
      const kb = createEmptyKnowledgeBase()
      
      expect(kb.preferences).toEqual(DEFAULT_PREFERENCES)
    })

    it('should have empty providers array', () => {
      const kb = createEmptyKnowledgeBase()
      
      expect(kb.providers).toEqual([])
    })

    it('should have initialized index', () => {
      const kb = createEmptyKnowledgeBase()
      
      expect(kb.index.version).toBe(1)
      expect(kb.index.lastUpdated).toBeInstanceOf(Date)
      expect(kb.index.providersByType).toEqual({})
      expect(kb.index.serversByProvider).toEqual({})
      expect(kb.index.credentialsByService).toEqual({})
      expect(kb.index.searchIndex).toEqual({})
    })
  })

  describe('DEFAULT_PREFERENCES', () => {
    it('should have autoInjectContext enabled', () => {
      expect(DEFAULT_PREFERENCES.autoInjectContext).toBe(true)
    })

    it('should have showSshSuggestions enabled', () => {
      expect(DEFAULT_PREFERENCES.showSshSuggestions).toBe(true)
    })

    it('should have defaultTerminal as integrated', () => {
      expect(DEFAULT_PREFERENCES.defaultTerminal).toBe('integrated')
    })

    it('should have confirmSshCommands enabled', () => {
      expect(DEFAULT_PREFERENCES.confirmSshCommands).toBe(true)
    })

    it('should have autoDiscoverCredentials disabled', () => {
      expect(DEFAULT_PREFERENCES.autoDiscoverCredentials).toBe(false)
    })
  })

  describe('PROVIDER_NAMES', () => {
    it('should have names for all provider types', () => {
      const types: CloudProviderType[] = [
        'aws', 'gcp', 'azure', 'cloudflare', 'digitalocean',
        'firebase', 'vercel', 'sentry', 'github', 'bitbucket',
        'gitlab', 'sendgrid', 'datadog', 'godaddy', 'custom'
      ]
      
      for (const type of types) {
        expect(PROVIDER_NAMES[type]).toBeDefined()
        expect(typeof PROVIDER_NAMES[type]).toBe('string')
        expect(PROVIDER_NAMES[type].length).toBeGreaterThan(0)
      }
    })
  })

  describe('PROVIDER_EMOJIS', () => {
    it('should have emojis for all provider types', () => {
      const types: CloudProviderType[] = [
        'aws', 'gcp', 'azure', 'cloudflare', 'digitalocean',
        'firebase', 'vercel', 'sentry', 'github', 'bitbucket',
        'gitlab', 'sendgrid', 'datadog', 'godaddy', 'custom'
      ]
      
      for (const type of types) {
        expect(PROVIDER_EMOJIS[type]).toBeDefined()
        expect(typeof PROVIDER_EMOJIS[type]).toBe('string')
      }
    })
  })

  describe('PROVIDER_CATEGORIES', () => {
    it('should categorize cloud providers correctly', () => {
      expect(PROVIDER_CATEGORIES.aws).toBe('cloud')
      expect(PROVIDER_CATEGORIES.gcp).toBe('cloud')
      expect(PROVIDER_CATEGORIES.azure).toBe('cloud')
      expect(PROVIDER_CATEGORIES.digitalocean).toBe('cloud')
    })

    it('should categorize CDN providers correctly', () => {
      expect(PROVIDER_CATEGORIES.cloudflare).toBe('cdn')
    })

    it('should categorize hosting providers correctly', () => {
      expect(PROVIDER_CATEGORIES.firebase).toBe('hosting')
      expect(PROVIDER_CATEGORIES.vercel).toBe('hosting')
    })

    it('should categorize monitoring providers correctly', () => {
      expect(PROVIDER_CATEGORIES.sentry).toBe('monitoring')
      expect(PROVIDER_CATEGORIES.datadog).toBe('monitoring')
    })

    it('should categorize VCS providers correctly', () => {
      expect(PROVIDER_CATEGORIES.github).toBe('vcs')
      expect(PROVIDER_CATEGORIES.bitbucket).toBe('vcs')
      expect(PROVIDER_CATEGORIES.gitlab).toBe('vcs')
    })

    it('should categorize email providers correctly', () => {
      expect(PROVIDER_CATEGORIES.sendgrid).toBe('email')
    })

    it('should categorize domain providers correctly', () => {
      expect(PROVIDER_CATEGORIES.godaddy).toBe('domain')
    })
  })
})


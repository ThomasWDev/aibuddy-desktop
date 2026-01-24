/**
 * Unit Tests for Knowledge Base Manager
 * 
 * Tests KnowledgeBaseManager class operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { KnowledgeBaseManager } from '../manager'
import { CloudProvider, ServerConfig } from '../types'

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}))

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home'),
  hostname: vi.fn(() => 'test-host'),
  userInfo: vi.fn(() => ({ username: 'testuser' })),
  platform: vi.fn(() => 'darwin'),
  arch: vi.fn(() => 'x64'),
}))

describe('KnowledgeBaseManager', () => {
  let manager: KnowledgeBaseManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new KnowledgeBaseManager()
    
    // Default mock implementations
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.readdirSync).mockReturnValue([])
  })

  afterEach(() => {
    manager.lock()
  })

  describe('initialize', () => {
    it('should create directories if they do not exist', async () => {
      await manager.initialize()
      
      expect(fs.mkdirSync).toHaveBeenCalled()
    })

    it('should not create directories if they exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      
      await manager.initialize()
      
      // mkdirSync should not be called for existing directories
      expect(fs.mkdirSync).not.toHaveBeenCalled()
    })

    it('should load existing providers', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString()
        return pathStr.includes('providers') || pathStr.includes('.aibuddy')
      })
      
      vi.mocked(fs.readdirSync).mockReturnValue(['provider_123.json'] as any)
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
        id: 'provider_123',
        type: 'aws',
        name: 'Test AWS',
        emoji: '☁️',
        category: 'cloud',
        isConnected: false,
        connection: { type: 'api' },
        servers: [],
        quickActions: [],
        importedDocs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      
      await manager.initialize()
      
      const providers = manager.getProviders()
      expect(providers.length).toBe(1)
      expect(providers[0].name).toBe('Test AWS')
    })
  })

  describe('Provider Management', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    describe('addProvider', () => {
      it('should add a new provider', async () => {
        const provider = await manager.addProvider('aws')
        
        expect(provider.type).toBe('aws')
        expect(provider.name).toBe('Amazon AWS')
        expect(fs.writeFileSync).toHaveBeenCalled()
      })

      it('should add provider with custom name', async () => {
        const provider = await manager.addProvider('aws', 'My Production AWS')
        
        expect(provider.name).toBe('My Production AWS')
      })

      it('should update index after adding', async () => {
        await manager.addProvider('digitalocean')
        
        // writeFileSync should be called for both provider and index
        expect(fs.writeFileSync).toHaveBeenCalledTimes(2)
      })
    })

    describe('getProviders', () => {
      it('should return empty array initially', () => {
        const providers = manager.getProviders()
        expect(providers).toEqual([])
      })

      it('should return all providers', async () => {
        await manager.addProvider('aws')
        await manager.addProvider('gcp')
        
        const providers = manager.getProviders()
        expect(providers.length).toBe(2)
      })

      it('should return a copy of providers array', async () => {
        await manager.addProvider('aws')
        
        const providers1 = manager.getProviders()
        const providers2 = manager.getProviders()
        
        expect(providers1).not.toBe(providers2)
      })
    })

    describe('getProvidersByType', () => {
      it('should filter providers by type', async () => {
        await manager.addProvider('aws')
        await manager.addProvider('aws', 'Second AWS')
        await manager.addProvider('gcp')
        
        const awsProviders = manager.getProvidersByType('aws')
        expect(awsProviders.length).toBe(2)
        
        const gcpProviders = manager.getProvidersByType('gcp')
        expect(gcpProviders.length).toBe(1)
      })

      it('should return empty array for non-existent type', () => {
        const providers = manager.getProvidersByType('azure')
        expect(providers).toEqual([])
      })
    })

    describe('getProvider', () => {
      it('should return provider by ID', async () => {
        const added = await manager.addProvider('aws')
        const found = manager.getProvider(added.id)
        
        expect(found).toBeDefined()
        expect(found!.id).toBe(added.id)
      })

      it('should return undefined for non-existent ID', () => {
        const found = manager.getProvider('non-existent')
        expect(found).toBeUndefined()
      })
    })

    describe('updateProvider', () => {
      it('should update provider fields', async () => {
        const provider = await manager.addProvider('aws')
        
        const updated = await manager.updateProvider(provider.id, {
          name: 'Updated Name',
          isConnected: true,
        })
        
        expect(updated).toBeDefined()
        expect(updated!.name).toBe('Updated Name')
        expect(updated!.isConnected).toBe(true)
      })

      it('should update updatedAt timestamp', async () => {
        const provider = await manager.addProvider('aws')
        const originalUpdatedAt = provider.updatedAt
        
        // Wait a bit to ensure different timestamp
        await new Promise(r => setTimeout(r, 10))
        
        const updated = await manager.updateProvider(provider.id, { name: 'New Name' })
        
        expect(updated!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
      })

      it('should return undefined for non-existent provider', async () => {
        const updated = await manager.updateProvider('non-existent', { name: 'Test' })
        expect(updated).toBeUndefined()
      })
    })

    describe('deleteProvider', () => {
      it('should delete provider', async () => {
        const provider = await manager.addProvider('aws')
        
        const deleted = await manager.deleteProvider(provider.id)
        
        expect(deleted).toBe(true)
        expect(manager.getProvider(provider.id)).toBeUndefined()
      })

      it('should return false for non-existent provider', async () => {
        const deleted = await manager.deleteProvider('non-existent')
        expect(deleted).toBe(false)
      })

      it('should delete provider file', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true)
        
        const provider = await manager.addProvider('aws')
        await manager.deleteProvider(provider.id)
        
        expect(fs.unlinkSync).toHaveBeenCalled()
      })
    })
  })

  describe('Server Management', () => {
    let provider: CloudProvider

    beforeEach(async () => {
      await manager.initialize()
      provider = await manager.addProvider('aws')
    })

    describe('addServer', () => {
      it('should add server to provider', async () => {
        const server = await manager.addServer(provider.id, 'Production', '10.0.0.1')
        
        expect(server).toBeDefined()
        expect(server!.name).toBe('Production')
        expect(server!.ip).toBe('10.0.0.1')
      })

      it('should generate SSH command', async () => {
        const server = await manager.addServer(provider.id, 'Test', '192.168.1.1', {
          sshUser: 'ubuntu',
          sshKeyPath: '~/.ssh/key.pem',
        })
        
        expect(server!.sshCommand).toContain('ssh')
        expect(server!.sshCommand).toContain('ubuntu@192.168.1.1')
        expect(server!.sshCommand).toContain('-i "~/.ssh/key.pem"')
      })

      it('should include port in SSH command if not 22', async () => {
        const server = await manager.addServer(provider.id, 'Test', '192.168.1.1', {
          sshPort: 2222,
        })
        
        expect(server!.sshCommand).toContain('-p 2222')
      })

      it('should return undefined for non-existent provider', async () => {
        const server = await manager.addServer('non-existent', 'Test', '10.0.0.1')
        expect(server).toBeUndefined()
      })
    })

    describe('getServers', () => {
      it('should return all servers across providers', async () => {
        await manager.addServer(provider.id, 'Server1', '10.0.0.1')
        
        const provider2 = await manager.addProvider('gcp')
        await manager.addServer(provider2.id, 'Server2', '10.0.0.2')
        
        const servers = manager.getServers()
        expect(servers.length).toBe(2)
      })
    })

    describe('getServersByProvider', () => {
      it('should return servers for specific provider', async () => {
        await manager.addServer(provider.id, 'Server1', '10.0.0.1')
        await manager.addServer(provider.id, 'Server2', '10.0.0.2')
        
        const servers = manager.getServersByProvider(provider.id)
        expect(servers.length).toBe(2)
      })

      it('should return empty array for non-existent provider', () => {
        const servers = manager.getServersByProvider('non-existent')
        expect(servers).toEqual([])
      })
    })

    describe('updateServer', () => {
      it('should update server fields', async () => {
        const server = await manager.addServer(provider.id, 'Test', '10.0.0.1')
        
        const updated = await manager.updateServer(provider.id, server!.id, {
          name: 'Updated Server',
          sshUser: 'admin',
        })
        
        expect(updated).toBeDefined()
        expect(updated!.name).toBe('Updated Server')
        expect(updated!.sshUser).toBe('admin')
      })

      it('should regenerate SSH command when relevant fields change', async () => {
        const server = await manager.addServer(provider.id, 'Test', '10.0.0.1')
        const originalCommand = server!.sshCommand
        
        const updated = await manager.updateServer(provider.id, server!.id, {
          sshUser: 'newuser',
        })
        
        expect(updated!.sshCommand).not.toBe(originalCommand)
        expect(updated!.sshCommand).toContain('newuser')
      })
    })

    describe('deleteServer', () => {
      it('should delete server from provider', async () => {
        const server = await manager.addServer(provider.id, 'Test', '10.0.0.1')
        
        const deleted = await manager.deleteServer(provider.id, server!.id)
        
        expect(deleted).toBe(true)
        expect(manager.getServersByProvider(provider.id).length).toBe(0)
      })

      it('should return false for non-existent server', async () => {
        const deleted = await manager.deleteServer(provider.id, 'non-existent')
        expect(deleted).toBe(false)
      })
    })
  })

  describe('AI Context Generation', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    describe('generateAIContext', () => {
      it('should return empty string when no providers', () => {
        const context = manager.generateAIContext()
        expect(context).toBe('')
      })

      it('should include provider info (secure - no sensitive data)', async () => {
        const provider = await manager.addProvider('aws')
        await manager.updateProvider(provider.id, {
          connection: { type: 'api', accountId: '123456789', region: 'us-east-1' },
        })
        
        const context = manager.generateAIContext()
        
        // Should include provider name and region (non-sensitive)
        expect(context).toContain('Amazon AWS')
        expect(context).toContain('us-east-1')
        // Should NOT include sensitive account ID
        expect(context).not.toContain('123456789')
      })

      it('should include server info (secure - no IPs)', async () => {
        const provider = await manager.addProvider('aws')
        await manager.addServer(provider.id, 'Production', '10.0.0.1', {
          domain: 'example.com',
        })
        
        const context = manager.generateAIContext()
        
        // Should NOT include sensitive data like IPs or domains
        // The secure context only mentions that servers exist, not their details
        expect(context).toContain('Amazon AWS')
        expect(context).not.toContain('10.0.0.1')
        expect(context).not.toContain('example.com')
      })
    })

    describe('getRelevantContext', () => {
      it('should return context for matching provider name', async () => {
        await manager.addProvider('aws')
        
        const context = manager.getRelevantContext('Check my AWS account')
        
        expect(context).toContain('AWS')
      })

      it('should return context for matching server name', async () => {
        const provider = await manager.addProvider('aws')
        await manager.addServer(provider.id, 'Production Server', '10.0.0.1')
        
        const context = manager.getRelevantContext('Check the production server logs')
        
        expect(context).toContain('Production Server')
      })

      it('should return empty string for unrelated query', async () => {
        await manager.addProvider('aws')
        
        const context = manager.getRelevantContext('What is the weather today?')
        
        expect(context).toBe('')
      })

      it('should return all context for infrastructure keywords', async () => {
        await manager.addProvider('aws')
        
        const context = manager.getRelevantContext('Check the server logs')
        
        expect(context).toContain('AWS')
      })
    })
  })

  describe('Preferences', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    describe('getPreferences', () => {
      it('should return default preferences', () => {
        const prefs = manager.getPreferences()
        
        expect(prefs.autoInjectContext).toBe(true)
        expect(prefs.showSshSuggestions).toBe(true)
        expect(prefs.defaultTerminal).toBe('integrated')
      })

      it('should return a copy of preferences', () => {
        const prefs1 = manager.getPreferences()
        const prefs2 = manager.getPreferences()
        
        expect(prefs1).not.toBe(prefs2)
        expect(prefs1).toEqual(prefs2)
      })
    })

    describe('savePreferences', () => {
      it('should update preferences', async () => {
        await manager.savePreferences({
          autoInjectContext: false,
          defaultTerminal: 'external',
        })
        
        const prefs = manager.getPreferences()
        
        expect(prefs.autoInjectContext).toBe(false)
        expect(prefs.defaultTerminal).toBe('external')
      })

      it('should save to file', async () => {
        await manager.savePreferences({ autoInjectContext: false })
        
        expect(fs.writeFileSync).toHaveBeenCalled()
      })
    })
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    describe('getStats', () => {
      it('should return zero counts initially', () => {
        const stats = manager.getStats()
        
        expect(stats.providerCount).toBe(0)
        expect(stats.serverCount).toBe(0)
        expect(stats.credentialCount).toBe(0)
        expect(stats.documentCount).toBe(0)
      })

      it('should count providers correctly', async () => {
        await manager.addProvider('aws')
        await manager.addProvider('gcp')
        
        const stats = manager.getStats()
        expect(stats.providerCount).toBe(2)
      })

      it('should count servers across providers', async () => {
        const provider1 = await manager.addProvider('aws')
        await manager.addServer(provider1.id, 'Server1', '10.0.0.1')
        await manager.addServer(provider1.id, 'Server2', '10.0.0.2')
        
        const provider2 = await manager.addProvider('gcp')
        await manager.addServer(provider2.id, 'Server3', '10.0.0.3')
        
        const stats = manager.getStats()
        expect(stats.serverCount).toBe(3)
      })
    })
  })
})


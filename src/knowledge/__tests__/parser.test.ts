/**
 * Unit Tests for Document Parser
 * 
 * Tests the document parsing functionality in KnowledgeBaseManager.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'fs'
import { KnowledgeBaseManager } from '../manager'

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(() => []),
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

describe('Document Parser', () => {
  let manager: KnowledgeBaseManager

  beforeEach(async () => {
    vi.clearAllMocks()
    manager = new KnowledgeBaseManager()
    await manager.initialize()
  })

  describe('importDocument', () => {
    it('should import markdown document', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `# My Infrastructure
      
## AWS Production
- Server IP: 10.0.0.1
- SSH User: ubuntu
- SSH Key: ~/.ssh/key.pem
`
      
      const doc = await manager.importDocument(provider.id, 'infra.md', content)
      
      expect(doc.filename).toBe('infra.md')
      expect(doc.fileType).toBe('md')
      expect(doc.content).toBe(content)
    })

    it('should extract server IP addresses', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Server
- IP: 192.168.1.100
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.servers.length).toBeGreaterThan(0)
      expect(doc.extractedData?.servers[0].ip).toBe('192.168.1.100')
    })

    it('should extract SSH user', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Server
- Server IP: 10.0.0.1
- SSH User: admin
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.servers[0].sshUser).toBe('admin')
    })

    it('should extract SSH key path', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Server
- Server IP: 10.0.0.1
- SSH Key: ~/.ssh/my-key.pem
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.servers[0].sshKeyPath).toBe('~/.ssh/my-key.pem')
    })

    it('should extract domain', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Server
- Server IP: 10.0.0.1
- Domain: example.com
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.servers[0].domain).toBe('example.com')
      expect(doc.extractedData?.domains).toContain('example.com')
    })

    it('should extract instance ID', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## AWS Server
- Server IP: 10.0.0.1
- Instance ID: i-0123456789abcdef0
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.servers[0].instanceId).toBe('i-0123456789abcdef0')
    })

    it('should extract instance type', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## AWS Server
- Server IP: 10.0.0.1
- Instance Type: t3.medium
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.servers[0].instanceType).toBe('t3.medium')
    })

    it('should extract account IDs', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## AWS
- Account: 123456789012
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.accountIds.length).toBeGreaterThan(0)
      expect(doc.extractedData?.accountIds[0].id).toBe('123456789012')
    })

    it('should detect API keys without storing values', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Credentials
- API Key: sk-1234567890abcdef
- Sentry API Key: abc123
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.apiKeys.length).toBe(2)
      expect(doc.extractedData?.apiKeys[0].name).toBe('API Key')
      // Should not contain actual key value
      expect(JSON.stringify(doc.extractedData?.apiKeys)).not.toContain('sk-1234567890abcdef')
    })

    it('should parse SSH command for connection details', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Server
- SSH Command: ssh -i ~/.ssh/key.pem -p 2222 ubuntu@10.0.0.1
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      const server = doc.extractedData?.servers[0]
      expect(server?.sshKeyPath).toBe('~/.ssh/key.pem')
      expect(server?.sshPort).toBe(2222)
      expect(server?.sshUser).toBe('ubuntu')
      expect(server?.ip).toBe('10.0.0.1')
    })

    it('should detect provider type from section name', async () => {
      const provider = await manager.addProvider('custom')
      
      const content = `## AWS Production
- Server IP: 10.0.0.1

## DigitalOcean Staging
- Server IP: 10.0.0.2

## Google Cloud Dev
- Server IP: 10.0.0.3
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      const servers = doc.extractedData?.servers || []
      expect(servers.find(s => s.ip === '10.0.0.1')?.provider).toBe('aws')
      expect(servers.find(s => s.ip === '10.0.0.2')?.provider).toBe('digitalocean')
      expect(servers.find(s => s.ip === '10.0.0.3')?.provider).toBe('gcp')
    })

    it('should extract multiple servers from document', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Production
- Server IP: 10.0.0.1
- SSH User: ubuntu

## Staging
- Server IP: 10.0.0.2
- SSH User: admin

## Development
- Server IP: 10.0.0.3
- SSH User: dev
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.servers.length).toBe(3)
    })

    it('should deduplicate domains', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Server 1
- Domain: example.com

## Server 2
- Domain: example.com

## Server 3
- Domain: other.com
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.domains.filter(d => d === 'example.com').length).toBe(1)
    })

    it('should extract domains from text', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `The server is hosted at api.example.com and the frontend is at www.example.org.
Also check dashboard.myapp.io for monitoring.
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.domains).toContain('api.example.com')
      expect(doc.extractedData?.domains).toContain('www.example.org')
      expect(doc.extractedData?.domains).toContain('dashboard.myapp.io')
    })

    it('should not extract IP addresses as domains', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `Server at 192.168.1.1 and 10.0.0.1
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      // Domains should not contain IP addresses
      for (const domain of doc.extractedData?.domains || []) {
        expect(domain).not.toMatch(/^\d+\.\d+\.\d+\.\d+$/)
      }
    })

    it('should store key-value pairs', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Config
- Region: us-east-1
- Environment: production
- Custom Field: custom value
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.keyValuePairs['Region']).toBe('us-east-1')
      expect(doc.extractedData?.keyValuePairs['Environment']).toBe('production')
      expect(doc.extractedData?.keyValuePairs['Custom Field']).toBe('custom value')
    })

    it('should auto-create servers from extracted data', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## Production Server
- Server IP: 10.0.0.1
- SSH User: ubuntu
`
      
      await manager.importDocument(provider.id, 'test.md', content)
      
      const servers = manager.getServersByProvider(provider.id)
      expect(servers.length).toBe(1)
      expect(servers[0].ip).toBe('10.0.0.1')
    })

    it('should throw for non-existent provider', async () => {
      await expect(
        manager.importDocument('non-existent', 'test.md', 'content')
      ).rejects.toThrow('Provider non-existent not found')
    })

    it('should handle empty document', async () => {
      const provider = await manager.addProvider('aws')
      
      const doc = await manager.importDocument(provider.id, 'empty.md', '')
      
      expect(doc.extractedData?.servers).toEqual([])
      expect(doc.extractedData?.apiKeys).toEqual([])
      expect(doc.extractedData?.domains).toEqual([])
    })

    it('should handle document with no extractable data', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `# Just a Title

Some random text without any infrastructure information.

- Item 1
- Item 2
`
      
      const doc = await manager.importDocument(provider.id, 'random.md', content)
      
      expect(doc.extractedData?.servers.length).toBe(0)
    })

    it('should generate server name from section header', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `## My Production Server
- Server IP: 10.0.0.1
`
      
      const doc = await manager.importDocument(provider.id, 'test.md', content)
      
      expect(doc.extractedData?.servers[0].name).toBe('My Production Server')
    })

    it('should handle real-world infrastructure doc', async () => {
      const provider = await manager.addProvider('aws')
      
      const content = `# My Infrastructure

## AWS (Production)
- Account: 484260713849
- Region: us-east-2
- Instance ID: i-0030a379f872bdea3
- Instance Type: t3.medium
- SSH User: ubuntu
- SSH Key: ~/.ssh/denver_veterans.pem
- SSH Command: ssh -i ~/.ssh/denver_veterans.pem ubuntu@3.132.25.123
- Domain: denvermobileappdeveloper.com

## DigitalOcean (MoneyRobot)
- Server IP: 159.203.71.21
- SSH User: root
- SSH Key: ~/Desktop/SSH keys/do_aibuddy
- SSH Command: ssh -i "~/Desktop/SSH keys/do_aibuddy" root@159.203.71.21
- Domain: api.aibuddyseo.com

## Cloudflare
- Account Email: admin@example.com
- API Token: [ENCRYPTED]
- Zones: aibuddy.life, denvermobileappdeveloper.com

## Sentry
- DSN: https://xxx@sentry.io/xxx
- Projects: aibuddy-extension, aibuddy-desktop
`
      
      const doc = await manager.importDocument(provider.id, 'infra.md', content)
      
      // Should extract 2 servers (AWS and DigitalOcean)
      expect(doc.extractedData?.servers.length).toBe(2)
      
      // Should extract account IDs
      expect(doc.extractedData?.accountIds.length).toBeGreaterThan(0)
      
      // Should extract domains
      expect(doc.extractedData?.domains).toContain('denvermobileappdeveloper.com')
      expect(doc.extractedData?.domains).toContain('api.aibuddyseo.com')
      expect(doc.extractedData?.domains).toContain('aibuddy.life')
      
      // Should detect API keys
      expect(doc.extractedData?.apiKeys.length).toBeGreaterThan(0)
    })
  })
})


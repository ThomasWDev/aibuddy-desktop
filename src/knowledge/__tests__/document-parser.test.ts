/**
 * Document Parser Tests (TDD)
 * 
 * Tests for the DocumentParser class that extracts infrastructure
 * information from markdown/text files.
 * 
 * Following TDD: Write tests FIRST, then implement to pass.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DocumentParser, ParseResult, DetectedServer, DetectedApiKey } from '../document-parser'

describe('DocumentParser', () => {
  let parser: DocumentParser

  beforeEach(() => {
    parser = new DocumentParser()
  })

  // ===========================================================================
  // IP Address Detection
  // ===========================================================================
  describe('IP Address Detection', () => {
    it('should detect IPv4 addresses', () => {
      const content = 'Server IP: 192.168.1.100'
      const result = parser.parse(content)
      
      expect(result.ipAddresses).toContain('192.168.1.100')
    })

    it('should detect multiple IP addresses', () => {
      const content = `
        Production: 10.0.0.1
        Staging: 10.0.0.2
        Development: 10.0.0.3
      `
      const result = parser.parse(content)
      
      expect(result.ipAddresses).toContain('10.0.0.1')
      expect(result.ipAddresses).toContain('10.0.0.2')
      expect(result.ipAddresses).toContain('10.0.0.3')
    })

    it('should not detect invalid IP addresses', () => {
      const content = 'Invalid: 999.999.999.999 and 256.1.1.1'
      const result = parser.parse(content)
      
      expect(result.ipAddresses).not.toContain('999.999.999.999')
      expect(result.ipAddresses).not.toContain('256.1.1.1')
    })

    it('should detect IP addresses in SSH commands', () => {
      const content = 'ssh ubuntu@3.132.25.123'
      const result = parser.parse(content)
      
      expect(result.ipAddresses).toContain('3.132.25.123')
    })

    it('should deduplicate IP addresses', () => {
      const content = `
        Server 1: 10.0.0.1
        Server 2: 10.0.0.1
        Server 3: 10.0.0.1
      `
      const result = parser.parse(content)
      
      expect(result.ipAddresses.filter(ip => ip === '10.0.0.1').length).toBe(1)
    })

    it('should detect public IP addresses', () => {
      const content = 'Public IP: 54.123.45.67'
      const result = parser.parse(content)
      
      expect(result.ipAddresses).toContain('54.123.45.67')
    })

    it('should detect private IP addresses', () => {
      const content = `
        Private A: 10.0.0.1
        Private B: 172.16.0.1
        Private C: 192.168.0.1
      `
      const result = parser.parse(content)
      
      expect(result.ipAddresses).toContain('10.0.0.1')
      expect(result.ipAddresses).toContain('172.16.0.1')
      expect(result.ipAddresses).toContain('192.168.0.1')
    })
  })

  // ===========================================================================
  // SSH Command Parsing
  // ===========================================================================
  describe('SSH Command Parsing', () => {
    it('should parse basic SSH command', () => {
      const content = 'ssh ubuntu@10.0.0.1'
      const result = parser.parse(content)
      
      expect(result.sshCommands.length).toBe(1)
      expect(result.sshCommands[0].user).toBe('ubuntu')
      expect(result.sshCommands[0].host).toBe('10.0.0.1')
    })

    it('should parse SSH command with key file', () => {
      const content = 'ssh -i ~/.ssh/key.pem ubuntu@10.0.0.1'
      const result = parser.parse(content)
      
      expect(result.sshCommands[0].keyPath).toBe('~/.ssh/key.pem')
    })

    it('should parse SSH command with quoted key path', () => {
      const content = 'ssh -i "~/Desktop/SSH keys/my-key.pem" root@159.203.71.21'
      const result = parser.parse(content)
      
      expect(result.sshCommands[0].keyPath).toBe('~/Desktop/SSH keys/my-key.pem')
      expect(result.sshCommands[0].user).toBe('root')
      expect(result.sshCommands[0].host).toBe('159.203.71.21')
    })

    it('should parse SSH command with port', () => {
      const content = 'ssh -p 2222 ubuntu@10.0.0.1'
      const result = parser.parse(content)
      
      expect(result.sshCommands[0].port).toBe(2222)
    })

    it('should parse SSH command with port and key', () => {
      const content = 'ssh -i ~/.ssh/key.pem -p 18765 user@example.com'
      const result = parser.parse(content)
      
      expect(result.sshCommands[0].keyPath).toBe('~/.ssh/key.pem')
      expect(result.sshCommands[0].port).toBe(18765)
      expect(result.sshCommands[0].user).toBe('user')
      expect(result.sshCommands[0].host).toBe('example.com')
    })

    it('should parse multiple SSH commands', () => {
      const content = `
        Production: ssh ubuntu@10.0.0.1
        Staging: ssh admin@10.0.0.2
      `
      const result = parser.parse(content)
      
      expect(result.sshCommands.length).toBe(2)
    })

    it('should default port to 22 if not specified', () => {
      const content = 'ssh ubuntu@10.0.0.1'
      const result = parser.parse(content)
      
      expect(result.sshCommands[0].port).toBe(22)
    })

    it('should parse SSH command with hostname instead of IP', () => {
      const content = 'ssh deploy@api.example.com'
      const result = parser.parse(content)
      
      expect(result.sshCommands[0].host).toBe('api.example.com')
    })

    it('should extract full SSH command string', () => {
      const content = 'SSH Command: ssh -i ~/.ssh/key.pem ubuntu@10.0.0.1'
      const result = parser.parse(content)
      
      expect(result.sshCommands[0].fullCommand).toBe('ssh -i ~/.ssh/key.pem ubuntu@10.0.0.1')
    })
  })

  // ===========================================================================
  // Domain Extraction
  // ===========================================================================
  describe('Domain Extraction', () => {
    it('should extract simple domains', () => {
      const content = 'Website: example.com'
      const result = parser.parse(content)
      
      expect(result.domains).toContain('example.com')
    })

    it('should extract subdomains', () => {
      const content = 'API: api.example.com'
      const result = parser.parse(content)
      
      expect(result.domains).toContain('api.example.com')
    })

    it('should extract multiple domains', () => {
      const content = `
        Main: aibuddy.life
        API: api.aibuddyseo.com
        Docs: docs.example.org
      `
      const result = parser.parse(content)
      
      expect(result.domains).toContain('aibuddy.life')
      expect(result.domains).toContain('api.aibuddyseo.com')
      expect(result.domains).toContain('docs.example.org')
    })

    it('should not extract IP addresses as domains', () => {
      const content = 'Server: 192.168.1.1'
      const result = parser.parse(content)
      
      expect(result.domains).not.toContain('192.168.1.1')
    })

    it('should extract domains from URLs', () => {
      const content = 'URL: https://www.example.com/path/to/page'
      const result = parser.parse(content)
      
      expect(result.domains).toContain('www.example.com')
    })

    it('should deduplicate domains', () => {
      const content = `
        Site 1: example.com
        Site 2: example.com
      `
      const result = parser.parse(content)
      
      expect(result.domains.filter(d => d === 'example.com').length).toBe(1)
    })

    it('should extract domains with various TLDs', () => {
      const content = `
        .com: example.com
        .io: myapp.io
        .dev: project.dev
        .life: aibuddy.life
        .org: nonprofit.org
        .net: network.net
      `
      const result = parser.parse(content)
      
      expect(result.domains).toContain('example.com')
      expect(result.domains).toContain('myapp.io')
      expect(result.domains).toContain('project.dev')
      expect(result.domains).toContain('aibuddy.life')
      expect(result.domains).toContain('nonprofit.org')
      expect(result.domains).toContain('network.net')
    })

    it('should handle domains with hyphens', () => {
      const content = 'Site: denver-mobile-app-developer.com'
      const result = parser.parse(content)
      
      expect(result.domains).toContain('denver-mobile-app-developer.com')
    })

    it('should not extract localhost', () => {
      const content = 'Local: localhost:3000'
      const result = parser.parse(content)
      
      expect(result.domains).not.toContain('localhost')
    })
  })

  // ===========================================================================
  // API Key Detection
  // ===========================================================================
  describe('API Key Detection', () => {
    it('should detect API key labels', () => {
      const content = 'API Key: sk-1234567890abcdef'
      const result = parser.parse(content)
      
      expect(result.apiKeys.length).toBe(1)
      expect(result.apiKeys[0].name).toBe('API Key')
    })

    it('should detect various API key patterns', () => {
      const content = `
        - Sentry API Key: abc123
        - SendGrid API Key: SG.xxx
        - Cloudflare API Token: cf_xxx
        - AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
      `
      const result = parser.parse(content)
      
      expect(result.apiKeys.length).toBe(4)
    })

    it('should detect service from key name', () => {
      const content = 'Sentry DSN: https://xxx@sentry.io/xxx'
      const result = parser.parse(content)
      
      expect(result.apiKeys.some(k => k.service === 'sentry')).toBe(true)
    })

    it('should not store actual key values', () => {
      const content = 'Secret Key: super-secret-value-12345'
      const result = parser.parse(content)
      
      // The result should not contain the actual value
      expect(JSON.stringify(result)).not.toContain('super-secret-value-12345')
    })

    it('should detect encrypted/redacted keys', () => {
      const content = 'API Token: [ENCRYPTED]'
      const result = parser.parse(content)
      
      expect(result.apiKeys.some(k => k.isRedacted)).toBe(true)
    })

    it('should detect common API key prefixes', () => {
      const content = `
        sk-ant-api03-xxx (Anthropic)
        sk-xxx (OpenAI)
        ghp_xxx (GitHub)
        glpat-xxx (GitLab)
      `
      const result = parser.parse(content)
      
      expect(result.apiKeys.some(k => k.service === 'anthropic')).toBe(true)
      expect(result.apiKeys.some(k => k.service === 'openai')).toBe(true)
      expect(result.apiKeys.some(k => k.service === 'github')).toBe(true)
      expect(result.apiKeys.some(k => k.service === 'gitlab')).toBe(true)
    })

    it('should detect AWS credentials', () => {
      const content = `
        AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
        AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
      `
      const result = parser.parse(content)
      
      expect(result.apiKeys.some(k => k.service === 'aws')).toBe(true)
    })
  })

  // ===========================================================================
  // Account ID Extraction
  // ===========================================================================
  describe('Account ID Extraction', () => {
    it('should extract AWS account IDs', () => {
      const content = 'AWS Account: 484260713849'
      const result = parser.parse(content)
      
      expect(result.accountIds.some(a => a.id === '484260713849')).toBe(true)
      expect(result.accountIds.some(a => a.provider === 'aws')).toBe(true)
    })

    it('should extract account IDs from various formats', () => {
      const content = `
        - Account ID: 123456789012
        - Account: 987654321098
        - AWS Account ID: 111222333444
      `
      const result = parser.parse(content)
      
      expect(result.accountIds.length).toBeGreaterThanOrEqual(3)
    })

    it('should detect provider from context', () => {
      const content = `
        ## AWS
        Account: 123456789012
        
        ## GCP
        Project ID: my-project-123
      `
      const result = parser.parse(content)
      
      expect(result.accountIds.some(a => a.provider === 'aws')).toBe(true)
      expect(result.accountIds.some(a => a.provider === 'gcp')).toBe(true)
    })

    it('should extract GCP project IDs', () => {
      const content = 'GCP Project: my-gcp-project-123456'
      const result = parser.parse(content)
      
      expect(result.accountIds.some(a => a.id === 'my-gcp-project-123456')).toBe(true)
    })

    it('should extract Azure subscription IDs', () => {
      const content = 'Azure Subscription: a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const result = parser.parse(content)
      
      expect(result.accountIds.some(a => a.provider === 'azure')).toBe(true)
    })
  })

  // ===========================================================================
  // Server Detection
  // ===========================================================================
  describe('Server Detection', () => {
    it('should detect server from structured data', () => {
      const content = `
        ## Production Server
        - Server IP: 10.0.0.1
        - SSH User: ubuntu
        - SSH Key: ~/.ssh/key.pem
      `
      const result = parser.parse(content)
      
      expect(result.servers.length).toBe(1)
      expect(result.servers[0].name).toBe('Production Server')
      expect(result.servers[0].ip).toBe('10.0.0.1')
      expect(result.servers[0].sshUser).toBe('ubuntu')
      expect(result.servers[0].sshKeyPath).toBe('~/.ssh/key.pem')
    })

    it('should detect server from SSH command', () => {
      const content = `
        ## My Server
        SSH Command: ssh -i ~/.ssh/key.pem -p 2222 admin@192.168.1.100
      `
      const result = parser.parse(content)
      
      expect(result.servers[0].ip).toBe('192.168.1.100')
      expect(result.servers[0].sshUser).toBe('admin')
      expect(result.servers[0].sshPort).toBe(2222)
      expect(result.servers[0].sshKeyPath).toBe('~/.ssh/key.pem')
    })

    it('should detect multiple servers', () => {
      const content = `
        ## Production
        - IP: 10.0.0.1
        - User: ubuntu
        
        ## Staging
        - IP: 10.0.0.2
        - User: admin
        
        ## Development
        - IP: 10.0.0.3
        - User: dev
      `
      const result = parser.parse(content)
      
      expect(result.servers.length).toBe(3)
    })

    it('should detect instance ID', () => {
      const content = `
        ## AWS Server
        - IP: 10.0.0.1
        - Instance ID: i-0123456789abcdef0
      `
      const result = parser.parse(content)
      
      expect(result.servers[0].instanceId).toBe('i-0123456789abcdef0')
    })

    it('should detect instance type', () => {
      const content = `
        ## AWS Server
        - IP: 10.0.0.1
        - Instance Type: t3.medium
      `
      const result = parser.parse(content)
      
      expect(result.servers[0].instanceType).toBe('t3.medium')
    })

    it('should detect domain for server', () => {
      const content = `
        ## Web Server
        - IP: 10.0.0.1
        - Domain: example.com
      `
      const result = parser.parse(content)
      
      expect(result.servers[0].domain).toBe('example.com')
    })

    it('should detect provider from section name', () => {
      const content = `
        ## AWS Production
        - IP: 10.0.0.1
        
        ## DigitalOcean Staging
        - IP: 10.0.0.2
      `
      const result = parser.parse(content)
      
      expect(result.servers[0].provider).toBe('aws')
      expect(result.servers[1].provider).toBe('digitalocean')
    })

    it('should default SSH port to 22', () => {
      const content = `
        ## Server
        - IP: 10.0.0.1
        - SSH User: ubuntu
      `
      const result = parser.parse(content)
      
      expect(result.servers[0].sshPort).toBe(22)
    })

    it('should generate SSH command for server', () => {
      const content = `
        ## Server
        - IP: 10.0.0.1
        - SSH User: ubuntu
        - SSH Key: ~/.ssh/key.pem
      `
      const result = parser.parse(content)
      
      expect(result.servers[0].sshCommand).toBe('ssh -i "~/.ssh/key.pem" ubuntu@10.0.0.1')
    })
  })

  // ===========================================================================
  // Key-Value Pair Extraction
  // ===========================================================================
  describe('Key-Value Pair Extraction', () => {
    it('should extract key-value pairs with colon separator', () => {
      const content = `
        - Region: us-east-1
        - Environment: production
      `
      const result = parser.parse(content)
      
      expect(result.keyValuePairs['Region']).toBe('us-east-1')
      expect(result.keyValuePairs['Environment']).toBe('production')
    })

    it('should handle various formats', () => {
      const content = `
        Region: us-east-1
        - Environment: production
        * Status: active
      `
      const result = parser.parse(content)
      
      expect(result.keyValuePairs['Region']).toBe('us-east-1')
      expect(result.keyValuePairs['Environment']).toBe('production')
      expect(result.keyValuePairs['Status']).toBe('active')
    })

    it('should handle values with colons', () => {
      const content = 'URL: https://example.com:8080/path'
      const result = parser.parse(content)
      
      expect(result.keyValuePairs['URL']).toBe('https://example.com:8080/path')
    })
  })

  // ===========================================================================
  // Section Detection
  // ===========================================================================
  describe('Section Detection', () => {
    it('should detect markdown headers as sections', () => {
      const content = `
        # Main Title
        ## AWS
        Content here
        ## GCP
        More content
        ### Subsection
        Details
      `
      const result = parser.parse(content)
      
      expect(result.sections).toContain('Main Title')
      expect(result.sections).toContain('AWS')
      expect(result.sections).toContain('GCP')
      expect(result.sections).toContain('Subsection')
    })
  })

  // ===========================================================================
  // Real-World Document Tests
  // ===========================================================================
  describe('Real-World Documents', () => {
    it('should parse a complete infrastructure document', () => {
      const content = `
# My Infrastructure

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
      const result = parser.parse(content)
      
      // Should detect 2 servers
      expect(result.servers.length).toBe(2)
      
      // Should detect AWS server
      const awsServer = result.servers.find(s => s.provider === 'aws')
      expect(awsServer).toBeDefined()
      expect(awsServer?.ip).toBe('3.132.25.123')
      expect(awsServer?.sshUser).toBe('ubuntu')
      expect(awsServer?.instanceId).toBe('i-0030a379f872bdea3')
      
      // Should detect DigitalOcean server
      const doServer = result.servers.find(s => s.provider === 'digitalocean')
      expect(doServer).toBeDefined()
      expect(doServer?.ip).toBe('159.203.71.21')
      expect(doServer?.sshUser).toBe('root')
      
      // Should detect domains
      expect(result.domains).toContain('denvermobileappdeveloper.com')
      expect(result.domains).toContain('api.aibuddyseo.com')
      expect(result.domains).toContain('aibuddy.life')
      
      // Should detect account IDs
      expect(result.accountIds.some(a => a.id === '484260713849')).toBe(true)
      
      // Should detect API keys (redacted)
      expect(result.apiKeys.some(k => k.isRedacted)).toBe(true)
    })

    it('should handle empty document', () => {
      const result = parser.parse('')
      
      expect(result.servers).toEqual([])
      expect(result.domains).toEqual([])
      expect(result.ipAddresses).toEqual([])
      expect(result.sshCommands).toEqual([])
      expect(result.apiKeys).toEqual([])
      expect(result.accountIds).toEqual([])
    })

    it('should handle document with no infrastructure info', () => {
      const content = `
        # My Notes
        
        This is just some random text without any infrastructure information.
        
        - Item 1
        - Item 2
        - Item 3
      `
      const result = parser.parse(content)
      
      expect(result.servers.length).toBe(0)
    })
  })
})


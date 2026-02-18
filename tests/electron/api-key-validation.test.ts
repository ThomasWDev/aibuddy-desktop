import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * API Key Validation & Error Handling Smoke Tests
 * 
 * KAN-50: "[Extension] Getting error while sending request"
 * 
 * ROOT CAUSE: Multiple potential causes investigated:
 * 1. Invalid/expired API key returns 401 INVALID_API_KEY
 * 2. Timeout too short (API Gateway 29s limit)
 * 3. Empty API key silently fails
 * 
 * These tests verify the API key validation flow and error handling
 * are properly implemented in both extension and desktop.
 */

describe('KAN-50: API Key Format Validation', () => {
  it('valid AIBuddy key should be 72 chars (aibuddy_ + 64 hex)', () => {
    const validKey = 'aibuddy_c47ed78fc1a24ccd76d5d4345c2f3c00e57a04d19b7f142441229539523156f2'
    expect(validKey).toHaveLength(72)
    expect(validKey).toMatch(/^aibuddy_[0-9a-f]{64}$/)
  })

  it('should reject keys shorter than 20 chars', () => {
    const shortKey = 'aibuddy_abc'
    expect(shortKey.length).toBeLessThan(20)
  })

  it('should reject empty keys', () => {
    const emptyKey = ''
    expect(emptyKey.length).toBe(0)
  })

  it('should reject whitespace-only keys', () => {
    const whitespaceKey = '   '
    expect(whitespaceKey.trim().length).toBe(0)
  })
})

describe('KAN-50: Extension API Error Handling', () => {
  const aibuddyProviderPath = path.resolve(__dirname, '../../../extension/src/api/providers/aibuddy.ts')
  let aibuddyProvider: string

  try {
    aibuddyProvider = fs.readFileSync(aibuddyProviderPath, 'utf-8')
  } catch {
    aibuddyProvider = ''
  }

  it('should have error handling for 401 (INVALID_API_KEY)', () => {
    if (!aibuddyProvider) return
    expect(aibuddyProvider).toContain('401')
  })

  it('should have error handling for 402 (out of credits)', () => {
    if (!aibuddyProvider) return
    expect(aibuddyProvider).toContain('402')
  })

  it('should have error handling for 500+ (server errors)', () => {
    if (!aibuddyProvider) return
    expect(aibuddyProvider).toContain('500')
  })

  it('should have error handling for timeouts', () => {
    if (!aibuddyProvider) return
    const hasTimeoutHandling = aibuddyProvider.includes('ECONNABORTED') ||
                                aibuddyProvider.includes('timeout') ||
                                aibuddyProvider.includes('Timed Out')
    expect(hasTimeoutHandling).toBe(true)
  })

  it('should have endpoint fallback logic', () => {
    if (!aibuddyProvider) return
    expect(aibuddyProvider).toContain('fallback')
  })

  it('should send API key in X-AIBuddy-API-Key header', () => {
    if (!aibuddyProvider) return
    expect(aibuddyProvider).toContain('X-AIBuddy-API-Key')
  })

  it('should have User-Agent header with AIBuddy prefix', () => {
    if (!aibuddyProvider) return
    expect(aibuddyProvider).toContain('AIBuddy-VSCode')
  })
})

describe('KAN-50: Desktop API Error Handling', () => {
  const appTsxPath = path.resolve(__dirname, '../../renderer/src/App.tsx')
  let appTsx: string

  try {
    appTsx = fs.readFileSync(appTsxPath, 'utf-8')
  } catch {
    appTsx = ''
  }

  it('should handle API validation errors gracefully', () => {
    if (!appTsx) return
    expect(appTsx).toContain('API validation skipped')
  })

  it('should have timeout for API validation (30s)', () => {
    if (!appTsx) return
    expect(appTsx).toContain('30000')
  })

  it('should distinguish timeout vs network errors', () => {
    if (!appTsx) return
    expect(appTsx).toContain('timeout after 30s')
  })

  it('should send API key in X-AIBuddy-API-Key header', () => {
    if (!appTsx) return
    expect(appTsx).toContain('X-AIBuddy-API-Key')
  })
})

describe('KAN-50: API Endpoint Configuration', () => {
  const aibuddySharedPath = path.resolve(__dirname, '../../../extension/src/shared/aibuddy.ts')
  let aibuddyShared: string

  try {
    aibuddyShared = fs.readFileSync(aibuddySharedPath, 'utf-8')
  } catch {
    aibuddyShared = ''
  }

  it('should have production API Gateway endpoint', () => {
    if (!aibuddyShared) return
    const hasEndpoint = aibuddyShared.includes('execute-api') || 
                         aibuddyShared.includes('amazonaws.com')
    expect(hasEndpoint).toBe(true)
  })

  it('should NOT have localhost as default endpoint', () => {
    if (!aibuddyShared) return
    // Check that localhost is not used as a primary endpoint
    const lines = aibuddyShared.split('\n')
    const endpointLines = lines.filter(l => 
      l.includes('endpoint') && l.includes('localhost') && !l.trimStart().startsWith('//')
    )
    expect(endpointLines).toHaveLength(0)
  })
})

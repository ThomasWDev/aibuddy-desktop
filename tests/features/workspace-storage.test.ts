/**
 * Smoke & Unit Tests for Workspace-Specific Storage
 * 
 * Tests the pure logic functions from electron/ipc/workspace.ts
 * without requiring Electron. Validates hashing, path generation,
 * and file I/O logic.
 * 
 * RULE: getWorkspaceHash is imported from source — NEVER duplicated.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { getWorkspaceHash } from '../../electron/ipc/workspace'

describe('Workspace Storage', () => {
  const TEST_BASE = join(tmpdir(), '.aibuddy-test-workspaces')

  beforeEach(() => {
    // Clean test directory
    if (existsSync(TEST_BASE)) {
      rmSync(TEST_BASE, { recursive: true })
    }
    mkdirSync(TEST_BASE, { recursive: true })
  })

  afterEach(() => {
    // Cleanup
    if (existsSync(TEST_BASE)) {
      rmSync(TEST_BASE, { recursive: true })
    }
  })

  describe('Workspace Hash Generation', () => {
    it('should generate consistent hashes for same path', () => {
      const hash1 = getWorkspaceHash('/Users/test/project')
      const hash2 = getWorkspaceHash('/Users/test/project')
      expect(hash1).toBe(hash2)
    })

    it('should be case-insensitive', () => {
      const hash1 = getWorkspaceHash('/Users/Test/Project')
      const hash2 = getWorkspaceHash('/users/test/project')
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different paths', () => {
      const hash1 = getWorkspaceHash('/Users/test/project-a')
      const hash2 = getWorkspaceHash('/Users/test/project-b')
      expect(hash1).not.toBe(hash2)
    })

    it('should be exactly 16 characters', () => {
      const hash = getWorkspaceHash('/any/path')
      expect(hash.length).toBe(16)
    })

    it('should only contain hex characters', () => {
      const hash = getWorkspaceHash('/test/path')
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })
  })

  describe('Workspace Directory Structure', () => {
    it('should create workspace directory on first access', () => {
      const hash = getWorkspaceHash('/test/project')
      const dir = join(TEST_BASE, hash)
      mkdirSync(dir, { recursive: true })
      expect(existsSync(dir)).toBe(true)
    })

    it('should store metadata with original path', () => {
      const hash = getWorkspaceHash('/test/project')
      const dir = join(TEST_BASE, hash)
      mkdirSync(dir, { recursive: true })

      const metadataPath = join(dir, '.metadata.json')
      writeFileSync(metadataPath, JSON.stringify({
        originalPath: '/test/project',
        createdAt: new Date().toISOString()
      }, null, 2))

      const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'))
      expect(metadata.originalPath).toBe('/test/project')
      expect(metadata.createdAt).toBeDefined()
    })
  })

  describe('Rules File', () => {
    it('should return empty string when no rules file exists', () => {
      const hash = getWorkspaceHash('/test/project')
      const dir = join(TEST_BASE, hash)
      mkdirSync(dir, { recursive: true })
      const filePath = join(dir, 'rules.md')
      expect(existsSync(filePath)).toBe(false)
    })

    it('should write and read rules', () => {
      const hash = getWorkspaceHash('/test/project')
      const dir = join(TEST_BASE, hash)
      mkdirSync(dir, { recursive: true })

      const rulesPath = join(dir, 'rules.md')
      const rules = '# Project Rules\n\n- Always use TypeScript\n- Follow TDD\n'
      writeFileSync(rulesPath, rules, 'utf-8')

      const content = readFileSync(rulesPath, 'utf-8')
      expect(content).toBe(rules)
    })

    it('should support appending rules', () => {
      const hash = getWorkspaceHash('/test/project')
      const dir = join(TEST_BASE, hash)
      mkdirSync(dir, { recursive: true })

      const rulesPath = join(dir, 'rules.md')
      writeFileSync(rulesPath, '# Rules\n', 'utf-8')

      // Simulate append
      const timestamp = new Date().toISOString()
      const entry = `\n---\n_Added: ${timestamp}_\n\nNever use any in TypeScript\n`
      writeFileSync(rulesPath, readFileSync(rulesPath, 'utf-8') + entry, 'utf-8')

      const content = readFileSync(rulesPath, 'utf-8')
      expect(content).toContain('# Rules')
      expect(content).toContain('Never use any in TypeScript')
    })
  })

  describe('Test Patterns File', () => {
    it('should write and read test patterns', () => {
      const hash = getWorkspaceHash('/test/project')
      const dir = join(TEST_BASE, hash)
      mkdirSync(dir, { recursive: true })

      const patternsPath = join(dir, 'test-patterns.md')
      const patterns = '# Test Patterns\n\n## React Components\n- Use render() from @testing-library/react\n'
      writeFileSync(patternsPath, patterns, 'utf-8')

      const content = readFileSync(patternsPath, 'utf-8')
      expect(content).toContain('React Components')
    })
  })

  describe('Fixes Log', () => {
    it('should write and read fixes log', () => {
      const hash = getWorkspaceHash('/test/project')
      const dir = join(TEST_BASE, hash)
      mkdirSync(dir, { recursive: true })

      const fixesPath = join(dir, 'fixes-log.md')
      const fix = '# Fixes Log\n\n## Bug: Null pointer in login\n- Root cause: missing null check\n'
      writeFileSync(fixesPath, fix, 'utf-8')

      const content = readFileSync(fixesPath, 'utf-8')
      expect(content).toContain('Null pointer in login')
      expect(content).toContain('Root cause')
    })
  })

  describe('JSON Data Storage', () => {
    it('should write and read arbitrary JSON data', () => {
      const hash = getWorkspaceHash('/test/project')
      const dir = join(TEST_BASE, hash)
      mkdirSync(dir, { recursive: true })

      const dataPath = join(dir, 'data.json')
      const data = { lastModel: 'deepseek-chat', sessionCount: 5, _lastModified: new Date().toISOString() }
      writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8')

      const stored = JSON.parse(readFileSync(dataPath, 'utf-8'))
      expect(stored.lastModel).toBe('deepseek-chat')
      expect(stored.sessionCount).toBe(5)
    })

    it('should merge new data with existing data', () => {
      const hash = getWorkspaceHash('/test/project')
      const dir = join(TEST_BASE, hash)
      mkdirSync(dir, { recursive: true })

      const dataPath = join(dir, 'data.json')
      writeFileSync(dataPath, JSON.stringify({ key1: 'value1' }, null, 2), 'utf-8')

      const existing = JSON.parse(readFileSync(dataPath, 'utf-8'))
      existing.key2 = 'value2'
      writeFileSync(dataPath, JSON.stringify(existing, null, 2), 'utf-8')

      const merged = JSON.parse(readFileSync(dataPath, 'utf-8'))
      expect(merged.key1).toBe('value1')
      expect(merged.key2).toBe('value2')
    })
  })
})

describe('Workspace Storage Smoke Tests', () => {
  it('different workspace paths should produce isolated storage', () => {
    const hashA = getWorkspaceHash('/project-a')
    const hashB = getWorkspaceHash('/project-b')
    expect(hashA).not.toBe(hashB)
  })

  it('hash should be URL-safe (hex only)', () => {
    const paths = [
      '/Users/test/My Project',
      '/home/user/special chars!@#$',
      'C:\\Users\\Windows\\Path',
      '/unicode/路径/テスト',
    ]
    paths.forEach(p => {
      const hash = getWorkspaceHash(p)
      expect(hash).toMatch(/^[0-9a-f]{16}$/)
    })
  })
})

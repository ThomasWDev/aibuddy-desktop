/**
 * KAN-292: Skills API Client — Unit tests
 *
 * Tests actual runtime behavior of:
 * 1. validateSkillsApiUrl
 * 2. createSkillsApiClient factory
 * 3. SkillsApiClient construction
 * 4. SkillsApiError
 * 5. SkillsStorageManager API settings + merge methods
 * 6. deduplicateCatalog
 */

import { SkillsApiClient, SkillsApiError, validateSkillsApiUrl, createSkillsApiClient } from '../../src/skills/skills-api-client'
import { deduplicateCatalog } from '../../src/skills/skill-catalog'
import { SkillsStorageManager } from '../../src/skills/skills-manager'
import { SKILLS_VERSION } from '../../src/skills/types'
import type { CatalogSkill, Skill, SkillsApiSettings } from '../../src/skills/types'

describe('KAN-292: Skills API Client — Unit Tests', () => {
  // ─── validateSkillsApiUrl ───────────────────────────────────────────────

  describe('validateSkillsApiUrl', () => {
    it('rejects empty string', () => {
      const result = validateSkillsApiUrl('')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('empty')
    })

    it('rejects whitespace-only string', () => {
      const result = validateSkillsApiUrl('   ')
      expect(result.valid).toBe(false)
    })

    it('rejects invalid URL format', () => {
      const result = validateSkillsApiUrl('not-a-url')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Invalid')
    })

    it('rejects ftp protocol', () => {
      const result = validateSkillsApiUrl('ftp://example.com')
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('http')
    })

    it('accepts https URL', () => {
      const result = validateSkillsApiUrl('https://api.example.com/v1')
      expect(result.valid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('accepts http URL', () => {
      const result = validateSkillsApiUrl('http://localhost:3000')
      expect(result.valid).toBe(true)
    })

    it('accepts URL with trailing spaces (trimmed)', () => {
      const result = validateSkillsApiUrl('  https://api.example.com  ')
      expect(result.valid).toBe(true)
    })
  })

  // ─── createSkillsApiClient ──────────────────────────────────────────────

  describe('createSkillsApiClient', () => {
    it('returns null for undefined URL', () => {
      expect(createSkillsApiClient(undefined)).toBeNull()
    })

    it('returns null for empty URL', () => {
      expect(createSkillsApiClient('')).toBeNull()
    })

    it('returns null for invalid URL', () => {
      expect(createSkillsApiClient('not-valid')).toBeNull()
    })

    it('returns SkillsApiClient for valid URL', () => {
      const client = createSkillsApiClient('https://api.example.com')
      expect(client).toBeInstanceOf(SkillsApiClient)
    })

    it('passes apiKey to client', () => {
      const client = createSkillsApiClient('https://api.example.com', 'my-key')
      expect(client).toBeInstanceOf(SkillsApiClient)
    })

    it('trims URL whitespace', () => {
      const client = createSkillsApiClient('  https://api.example.com  ')
      expect(client).not.toBeNull()
      expect(client!.getBaseUrl()).toBe('https://api.example.com')
    })
  })

  // ─── SkillsApiClient ───────────────────────────────────────────────────

  describe('SkillsApiClient construction', () => {
    it('strips trailing slashes from baseUrl', () => {
      const client = new SkillsApiClient({ baseUrl: 'https://api.example.com///' })
      expect(client.getBaseUrl()).toBe('https://api.example.com')
    })

    it('preserves path in baseUrl', () => {
      const client = new SkillsApiClient({ baseUrl: 'https://api.example.com/v1' })
      expect(client.getBaseUrl()).toBe('https://api.example.com/v1')
    })
  })

  // ─── SkillsApiError ────────────────────────────────────────────────────

  describe('SkillsApiError', () => {
    it('extends Error', () => {
      const err = new SkillsApiError('test', 404, 'NOT_FOUND')
      expect(err).toBeInstanceOf(Error)
    })

    it('sets name to SkillsApiError', () => {
      const err = new SkillsApiError('test', 500)
      expect(err.name).toBe('SkillsApiError')
    })

    it('stores statusCode', () => {
      const err = new SkillsApiError('msg', 403, 'FORBIDDEN')
      expect(err.statusCode).toBe(403)
    })

    it('stores errorCode', () => {
      const err = new SkillsApiError('msg', 422, 'VALIDATION')
      expect(err.errorCode).toBe('VALIDATION')
    })

    it('stores message', () => {
      const err = new SkillsApiError('Something broke', 500)
      expect(err.message).toBe('Something broke')
    })
  })

  // ─── SkillsStorageManager API settings ──────────────────────────────────

  describe('SkillsStorageManager API settings', () => {
    let mgr: SkillsStorageManager

    beforeEach(() => {
      SkillsStorageManager['instance'] = undefined as any
      mgr = SkillsStorageManager.getInstance()
    })

    it('getApiSettings returns defaults when unconfigured', () => {
      const settings = mgr.getApiSettings()
      expect(settings.baseUrl).toBe('')
    })

    it('setApiSettings persists settings', () => {
      mgr.setApiSettings({ baseUrl: 'https://api.test.com', apiKey: 'key123' })
      const settings = mgr.getApiSettings()
      expect(settings.baseUrl).toBe('https://api.test.com')
      expect(settings.apiKey).toBe('key123')
    })

    it('updateLastSync sets timestamp', () => {
      const before = Date.now()
      mgr.updateLastSync()
      const settings = mgr.getApiSettings()
      expect(settings.lastSyncAt).toBeDefined()
      expect(settings.lastSyncAt!).toBeGreaterThanOrEqual(before)
    })

    it('updateLastSync initializes apiSettings if missing', () => {
      mgr.updateLastSync()
      expect(mgr.getApiSettings().lastSyncAt).toBeDefined()
    })
  })

  describe('SkillsStorageManager.mergeRemoteSkills', () => {
    let mgr: SkillsStorageManager

    beforeEach(() => {
      SkillsStorageManager['instance'] = undefined as any
      mgr = SkillsStorageManager.getInstance()
    })

    it('adds new skills from remote', () => {
      const remote: Skill[] = [{
        id: 'remote-1', name: 'Remote Skill', description: 'From API',
        prompt_template: 'test', enabled: true, scope: 'global',
        created_by: 'api', created_at: Date.now(), updated_at: Date.now(),
        source: 'api',
      }]
      const result = mgr.mergeRemoteSkills(remote)
      expect(result.added).toBe(1)
      expect(result.updated).toBe(0)
      const skills = mgr.getSkills()
      const found = skills.find(s => s.name === 'Remote Skill')
      expect(found).toBeTruthy()
      expect(found!.source).toBe('api')
    })

    it('updates existing api skills by id match', () => {
      mgr.mergeRemoteSkills([{
        id: 'remote-1', name: 'Original', description: 'v1',
        prompt_template: 'old', enabled: true, scope: 'global',
        created_by: 'api', created_at: Date.now(), updated_at: Date.now(),
        source: 'api',
      }])
      const result = mgr.mergeRemoteSkills([{
        id: 'remote-1', name: 'Updated', description: 'v2',
        prompt_template: 'new', enabled: false, scope: 'global',
        created_by: 'api', created_at: Date.now(), updated_at: Date.now(),
        source: 'api',
      }])
      expect(result.added).toBe(0)
      expect(result.updated).toBe(1)
    })

    it('preserves local enabled state on update', () => {
      mgr.mergeRemoteSkills([{
        id: 'remote-2', name: 'Skill X', description: 'v1',
        prompt_template: 'test', enabled: true, scope: 'global',
        created_by: 'api', created_at: Date.now(), updated_at: Date.now(),
        source: 'api',
      }])
      const skills = mgr.getSkills()
      const skill = skills.find(s => s.id === 'remote-2')
      if (skill) skill.enabled = false

      mgr.mergeRemoteSkills([{
        id: 'remote-2', name: 'Skill X', description: 'v2',
        prompt_template: 'updated', enabled: true, scope: 'global',
        created_by: 'api', created_at: Date.now(), updated_at: Date.now(),
        source: 'api',
      }])
      const updated = mgr.getSkills().find(s => s.id === 'remote-2')
      expect(updated!.enabled).toBe(false)
    })

    it('returns 0/0 when no remote skills provided', () => {
      const result = mgr.mergeRemoteSkills([])
      expect(result.added).toBe(0)
      expect(result.updated).toBe(0)
    })
  })

  // ─── SKILLS_VERSION ────────────────────────────────────────────────────

  describe('SKILLS_VERSION', () => {
    it('is at least version 4 for KAN-292', () => {
      expect(SKILLS_VERSION).toBeGreaterThanOrEqual(4)
    })
  })

  // ─── deduplicateCatalog ────────────────────────────────────────────────

  describe('deduplicateCatalog', () => {
    const base: CatalogSkill = {
      catalog_id: 'test-1', name: 'Test', description: 'A',
      prompt_template: 'p', author: 'AIBuddy', tags: [], category: 'Dev',
      icon: '🔧', scope: 'global', execution_mode: 'always',
    }

    it('removes duplicate catalog_ids', () => {
      const result = deduplicateCatalog([
        { ...base, catalog_id: 'dup', name: 'First' },
        { ...base, catalog_id: 'dup', name: 'Second' },
      ])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('First')
    })

    it('keeps unique skills', () => {
      const result = deduplicateCatalog([
        { ...base, catalog_id: 'a' },
        { ...base, catalog_id: 'b' },
        { ...base, catalog_id: 'c' },
      ])
      expect(result).toHaveLength(3)
    })

    it('returns empty for empty input', () => {
      expect(deduplicateCatalog([])).toEqual([])
    })

    it('preserves order (first occurrence wins)', () => {
      const result = deduplicateCatalog([
        { ...base, catalog_id: 'x', name: 'API Version' },
        { ...base, catalog_id: 'y', name: 'Unique' },
        { ...base, catalog_id: 'x', name: 'Static Version' },
      ])
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('API Version')
    })
  })

  // ─── Regression ────────────────────────────────────────────────────────

  describe('Regression: audit + execution logs unaffected', () => {
    let mgr: SkillsStorageManager

    beforeEach(() => {
      SkillsStorageManager['instance'] = undefined as any
      mgr = SkillsStorageManager.getInstance()
    })

    it('addAuditLogEntry still works', () => {
      mgr.addAuditLogEntry({
        timestamp: Date.now(), skillId: 'test', skillName: 'Test',
        tool: 'terminal', action: 'run', params: {}, decision: 'allow_once',
      })
      expect(mgr.getAuditLog().length).toBeGreaterThanOrEqual(1)
    })

    it('addExecutionRecord still works', () => {
      mgr.addExecutionRecord({
        id: 'e1', timestamp: Date.now(), totalEvaluated: 1, totalApplied: 1,
        processingTimeMs: 0.1, conflictCount: 0,
        entries: [{ skillId: 'a', skillName: 'A', execution_mode: 'always', applied: true, reason: 'auto' }],
      })
      expect(mgr.getExecutionHistory().length).toBeGreaterThanOrEqual(1)
    })
  })
})

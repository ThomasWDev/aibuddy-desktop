/**
 * KAN-290: Skill Permission System — Unit tests
 *
 * Tests actual runtime behavior of permission checks, stored preferences,
 * audit logging, and the describe action helper.
 */

import { checkStoredPermission, describeToolAction } from '../../src/skills/skill-tool-runner'
import { SkillsStorageManager } from '../../src/skills/skills-manager'
import type { PermissionLevel, ToolAuditLogEntry } from '../../src/skills/types'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('KAN-290: Skill Permission System — Unit Tests', () => {
  // ─── checkStoredPermission ─────────────────────────────────────────────

  describe('checkStoredPermission', () => {
    it('returns allow for always_allow', () => {
      const result = checkStoredPermission('always_allow')
      expect(result.action).toBe('allow')
    })

    it('returns deny for always_deny', () => {
      const result = checkStoredPermission('always_deny')
      expect(result.action).toBe('deny')
    })

    it('returns ask for ask', () => {
      const result = checkStoredPermission('ask')
      expect(result.action).toBe('ask')
    })

    it('returns reason string for always_allow', () => {
      expect(checkStoredPermission('always_allow').reason).toMatch(/auto.*approv/)
    })

    it('returns reason string for always_deny', () => {
      expect(checkStoredPermission('always_deny').reason).toMatch(/auto.*deni/)
    })

    it('returns reason string for ask', () => {
      expect(checkStoredPermission('ask').reason).toMatch(/user confirmation/)
    })

    it('defaults to ask for unknown values', () => {
      const result = checkStoredPermission('unknown' as PermissionLevel)
      expect(result.action).toBe('ask')
    })
  })

  // ─── describeToolAction ────────────────────────────────────────────────

  describe('describeToolAction', () => {
    it('describes filesystem read_file action', () => {
      const desc = describeToolAction('filesystem', 'read_file', { path: 'src/index.ts' })
      expect(desc).toMatch(/file.*src\/index\.ts/)
    })

    it('describes filesystem list_directory action', () => {
      const desc = describeToolAction('filesystem', 'list_directory', { path: 'src' })
      expect(desc).toMatch(/directory/)
    })

    it('describes terminal execute action', () => {
      const desc = describeToolAction('terminal', 'execute', { command: 'npm test' })
      expect(desc).toMatch(/npm test/)
    })

    it('describes git status action', () => {
      const desc = describeToolAction('git', 'status', {})
      expect(desc).toMatch(/Git status/)
    })

    it('describes git diff staged', () => {
      const desc = describeToolAction('git', 'diff', { staged: 'true' })
      expect(desc).toMatch(/staged/)
    })

    it('describes aws_cli action', () => {
      const desc = describeToolAction('aws_cli', 'execute', { command: 'aws s3 ls' })
      expect(desc).toMatch(/aws s3 ls/)
    })

    it('describes docker ps action', () => {
      const desc = describeToolAction('docker', 'ps', {})
      expect(desc).toMatch(/Docker ps/)
    })

    it('describes docker execute action', () => {
      const desc = describeToolAction('docker', 'execute', { command: 'docker build .' })
      expect(desc).toMatch(/docker build/)
    })

    it('handles unknown tool gracefully', () => {
      const desc = describeToolAction('unknown' as any, 'test', {})
      expect(desc).toMatch(/unknown.*test/)
    })
  })

  // ─── SkillsStorageManager — permissions ────────────────────────────────

  describe('SkillsStorageManager — permissions', () => {
    const tmpDir = path.join(os.tmpdir(), `skills-perm-test-${Date.now()}`)
    const skillsDir = path.join(tmpDir, '.aibuddy', 'skills')

    beforeAll(() => {
      fs.mkdirSync(skillsDir, { recursive: true })
      process.env.HOME = tmpDir
      SkillsStorageManager.resetInstance()
    })

    afterAll(() => {
      SkillsStorageManager.resetInstance()
      fs.rmSync(tmpDir, { recursive: true, force: true })
      delete process.env.HOME
    })

    it('getPermission returns ask by default', () => {
      const mgr = SkillsStorageManager.getInstance()
      expect(mgr.getPermission('nonexistent', 'terminal')).toBe('ask')
    })

    it('setPermission stores and retrieves always_allow', () => {
      const mgr = SkillsStorageManager.getInstance()
      mgr.setPermission('skill1', 'terminal', 'always_allow')
      expect(mgr.getPermission('skill1', 'terminal')).toBe('always_allow')
    })

    it('setPermission stores and retrieves always_deny', () => {
      const mgr = SkillsStorageManager.getInstance()
      mgr.setPermission('skill1', 'git', 'always_deny')
      expect(mgr.getPermission('skill1', 'git')).toBe('always_deny')
    })

    it('setPermission updates existing entry', () => {
      const mgr = SkillsStorageManager.getInstance()
      mgr.setPermission('skill1', 'terminal', 'always_deny')
      expect(mgr.getPermission('skill1', 'terminal')).toBe('always_deny')
    })

    it('getAllPermissions returns all stored entries', () => {
      const mgr = SkillsStorageManager.getInstance()
      const all = mgr.getAllPermissions()
      expect(all.length).toBeGreaterThanOrEqual(2)
    })

    it('resetPermission removes a specific entry', () => {
      const mgr = SkillsStorageManager.getInstance()
      mgr.resetPermission('skill1', 'terminal')
      expect(mgr.getPermission('skill1', 'terminal')).toBe('ask')
    })

    it('clearPermissionsForSkill removes all entries for a skill', () => {
      const mgr = SkillsStorageManager.getInstance()
      mgr.setPermission('skill2', 'filesystem', 'always_allow')
      mgr.setPermission('skill2', 'docker', 'always_deny')
      mgr.clearPermissionsForSkill('skill2')
      expect(mgr.getPermission('skill2', 'filesystem')).toBe('ask')
      expect(mgr.getPermission('skill2', 'docker')).toBe('ask')
    })
  })

  // ─── SkillsStorageManager — audit log ──────────────────────────────────

  describe('SkillsStorageManager — audit log', () => {
    const tmpDir = path.join(os.tmpdir(), `skills-audit-test-${Date.now()}`)
    const skillsDir = path.join(tmpDir, '.aibuddy', 'skills')

    beforeAll(() => {
      fs.mkdirSync(skillsDir, { recursive: true })
      process.env.HOME = tmpDir
      SkillsStorageManager.resetInstance()
    })

    afterAll(() => {
      SkillsStorageManager.resetInstance()
      fs.rmSync(tmpDir, { recursive: true, force: true })
      delete process.env.HOME
    })

    it('getAuditLog returns empty array initially', () => {
      const mgr = SkillsStorageManager.getInstance()
      expect(mgr.getAuditLog()).toEqual([])
    })

    it('addAuditLogEntry records an entry', () => {
      const mgr = SkillsStorageManager.getInstance()
      const entry: ToolAuditLogEntry = {
        timestamp: Date.now(),
        skillId: 'skill1',
        skillName: 'Test Skill',
        tool: 'terminal',
        action: 'execute',
        params: { command: 'echo hi' },
        decision: 'allow_once',
        success: true,
        durationMs: 10,
      }
      mgr.addAuditLogEntry(entry)
      expect(mgr.getAuditLog()).toHaveLength(1)
      expect(mgr.getAuditLog()[0].skillName).toBe('Test Skill')
    })

    it('getAuditLog with limit returns last N entries', () => {
      const mgr = SkillsStorageManager.getInstance()
      for (let i = 0; i < 5; i++) {
        mgr.addAuditLogEntry({
          timestamp: Date.now() + i,
          skillId: 'skill1',
          skillName: `Skill ${i}`,
          tool: 'terminal',
          action: 'execute',
          params: {},
          decision: 'allow_once',
        })
      }
      const limited = mgr.getAuditLog(3)
      expect(limited).toHaveLength(3)
    })

    it('getAuditLogForSkill filters by skillId', () => {
      const mgr = SkillsStorageManager.getInstance()
      mgr.addAuditLogEntry({
        timestamp: Date.now(),
        skillId: 'other_skill',
        skillName: 'Other',
        tool: 'git',
        action: 'status',
        params: {},
        decision: 'auto_allowed',
      })
      const forOther = mgr.getAuditLogForSkill('other_skill')
      expect(forOther).toHaveLength(1)
      expect(forOther[0].skillId).toBe('other_skill')
    })

    it('clearAuditLog empties the log', () => {
      const mgr = SkillsStorageManager.getInstance()
      mgr.clearAuditLog()
      expect(mgr.getAuditLog()).toEqual([])
    })
  })
})

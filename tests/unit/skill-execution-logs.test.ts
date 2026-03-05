/**
 * KAN-291: Skill Execution Logs — Unit tests
 *
 * Tests actual runtime behavior of:
 * 1. SkillsStorageManager execution history methods
 * 2. Type validation for SkillExecutionRecord / SkillExecutionEntry
 */

import { SkillsStorageManager } from '../../src/skills/skills-manager'
import type { SkillExecutionRecord, SkillExecutionEntry, SkillsState } from '../../src/skills/types'
import { SKILLS_VERSION } from '../../src/skills/types'

describe('KAN-291: Skill Execution Logs — Unit Tests', () => {
  let mgr: SkillsStorageManager

  beforeEach(() => {
    SkillsStorageManager['instance'] = undefined as any
    mgr = SkillsStorageManager.getInstance()
  })

  // ─── Type Validation ────────────────────────────────────────────────────

  describe('SkillExecutionEntry type structure', () => {
    it('conforms to expected shape', () => {
      const entry: SkillExecutionEntry = {
        skillId: 'test-skill',
        skillName: 'Test Skill',
        execution_mode: 'always',
        applied: true,
        reason: 'auto (always active)',
      }
      expect(entry.skillId).toBe('test-skill')
      expect(entry.skillName).toBe('Test Skill')
      expect(entry.execution_mode).toBe('always')
      expect(entry.applied).toBe(true)
      expect(entry.reason).toBe('auto (always active)')
    })

    it('supports all execution modes', () => {
      const modes = ['always', 'manual', 'on_demand'] as const
      for (const mode of modes) {
        const entry: SkillExecutionEntry = {
          skillId: 'x',
          skillName: 'X',
          execution_mode: mode,
          applied: mode === 'always',
          reason: `mode: ${mode}`,
        }
        expect(entry.execution_mode).toBe(mode)
      }
    })
  })

  describe('SkillExecutionRecord type structure', () => {
    it('conforms to expected shape with entries', () => {
      const record: SkillExecutionRecord = {
        id: 'exec_123',
        timestamp: Date.now(),
        totalEvaluated: 5,
        totalApplied: 3,
        processingTimeMs: 1.5,
        conflictCount: 0,
        entries: [
          { skillId: 'a', skillName: 'A', execution_mode: 'always', applied: true, reason: 'auto' },
          { skillId: 'b', skillName: 'B', execution_mode: 'manual', applied: false, reason: 'skipped (manual)' },
        ],
      }
      expect(record.id).toBe('exec_123')
      expect(record.totalEvaluated).toBe(5)
      expect(record.totalApplied).toBe(3)
      expect(record.conflictCount).toBe(0)
      expect(record.entries).toHaveLength(2)
      expect(record.entries[0].applied).toBe(true)
      expect(record.entries[1].applied).toBe(false)
    })
  })

  describe('SKILLS_VERSION', () => {
    it('is at least version 3 for KAN-291', () => {
      expect(SKILLS_VERSION).toBeGreaterThanOrEqual(3)
    })
  })

  // ─── SkillsStorageManager Execution History ─────────────────────────────

  describe('SkillsStorageManager.addExecutionRecord', () => {
    function makeRecord(id: string): SkillExecutionRecord {
      return {
        id,
        timestamp: Date.now(),
        totalEvaluated: 2,
        totalApplied: 1,
        processingTimeMs: 0.5,
        conflictCount: 0,
        entries: [
          { skillId: 's1', skillName: 'Skill 1', execution_mode: 'always', applied: true, reason: 'auto' },
          { skillId: 's2', skillName: 'Skill 2', execution_mode: 'manual', applied: false, reason: 'skipped' },
        ],
      }
    }

    it('adds a record to execution history', () => {
      mgr.addExecutionRecord(makeRecord('r1'))
      const history = mgr.getExecutionHistory()
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('r1')
    })

    it('accumulates multiple records', () => {
      mgr.addExecutionRecord(makeRecord('r1'))
      mgr.addExecutionRecord(makeRecord('r2'))
      mgr.addExecutionRecord(makeRecord('r3'))
      const history = mgr.getExecutionHistory()
      expect(history).toHaveLength(3)
    })

    it('caps at 100 entries, keeping most recent', () => {
      for (let i = 0; i < 105; i++) {
        mgr.addExecutionRecord(makeRecord(`r_${i}`))
      }
      const history = mgr.getExecutionHistory()
      expect(history.length).toBeLessThanOrEqual(100)
      expect(history[history.length - 1].id).toBe('r_104')
      expect(history[0].id).toBe('r_5')
    })

    it('preserves entry details in stored record', () => {
      mgr.addExecutionRecord(makeRecord('detail'))
      const history = mgr.getExecutionHistory()
      expect(history[0].entries).toHaveLength(2)
      expect(history[0].entries[0].skillName).toBe('Skill 1')
      expect(history[0].entries[0].applied).toBe(true)
      expect(history[0].entries[1].skillName).toBe('Skill 2')
      expect(history[0].entries[1].applied).toBe(false)
    })
  })

  describe('SkillsStorageManager.getExecutionHistory', () => {
    function makeRecord(id: string): SkillExecutionRecord {
      return {
        id,
        timestamp: Date.now(),
        totalEvaluated: 1,
        totalApplied: 1,
        processingTimeMs: 0.1,
        conflictCount: 0,
        entries: [{ skillId: 'a', skillName: 'A', execution_mode: 'always', applied: true, reason: 'auto' }],
      }
    }

    it('returns empty array when no records exist', () => {
      expect(mgr.getExecutionHistory()).toEqual([])
    })

    it('returns all records when no limit is specified', () => {
      mgr.addExecutionRecord(makeRecord('x1'))
      mgr.addExecutionRecord(makeRecord('x2'))
      mgr.addExecutionRecord(makeRecord('x3'))
      expect(mgr.getExecutionHistory()).toHaveLength(3)
    })

    it('returns limited records when limit is specified', () => {
      mgr.addExecutionRecord(makeRecord('x1'))
      mgr.addExecutionRecord(makeRecord('x2'))
      mgr.addExecutionRecord(makeRecord('x3'))
      const limited = mgr.getExecutionHistory(2)
      expect(limited).toHaveLength(2)
      expect(limited[0].id).toBe('x2')
      expect(limited[1].id).toBe('x3')
    })

    it('returns all if limit exceeds count', () => {
      mgr.addExecutionRecord(makeRecord('x1'))
      expect(mgr.getExecutionHistory(50)).toHaveLength(1)
    })
  })

  describe('SkillsStorageManager.clearExecutionHistory', () => {
    it('removes all execution records', () => {
      mgr.addExecutionRecord({
        id: 'clear-test',
        timestamp: Date.now(),
        totalEvaluated: 1,
        totalApplied: 1,
        processingTimeMs: 0.1,
        conflictCount: 0,
        entries: [{ skillId: 'a', skillName: 'A', execution_mode: 'always', applied: true, reason: 'auto' }],
      })
      expect(mgr.getExecutionHistory()).toHaveLength(1)
      mgr.clearExecutionHistory()
      expect(mgr.getExecutionHistory()).toEqual([])
    })

    it('allows adding records after clearing', () => {
      mgr.addExecutionRecord({
        id: 'post-clear',
        timestamp: Date.now(),
        totalEvaluated: 1,
        totalApplied: 1,
        processingTimeMs: 0.1,
        conflictCount: 0,
        entries: [{ skillId: 'a', skillName: 'A', execution_mode: 'always', applied: true, reason: 'auto' }],
      })
      mgr.clearExecutionHistory()
      mgr.addExecutionRecord({
        id: 'new-record',
        timestamp: Date.now(),
        totalEvaluated: 2,
        totalApplied: 2,
        processingTimeMs: 0.2,
        conflictCount: 0,
        entries: [{ skillId: 'b', skillName: 'B', execution_mode: 'always', applied: true, reason: 'auto' }],
      })
      const history = mgr.getExecutionHistory()
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('new-record')
    })
  })

  // ─── Regression: Audit log still works ──────────────────────────────────

  describe('Regression: audit log methods unaffected', () => {
    it('addAuditLogEntry still works', () => {
      mgr.addAuditLogEntry({
        timestamp: Date.now(),
        skillId: 'test',
        skillName: 'Test',
        tool: 'terminal',
        action: 'run',
        params: { command: 'echo test' },
        decision: 'allow_once',
      })
      const log = mgr.getAuditLog()
      expect(log.length).toBeGreaterThanOrEqual(1)
    })

    it('clearAuditLog still works', () => {
      mgr.addAuditLogEntry({
        timestamp: Date.now(),
        skillId: 'test',
        skillName: 'Test',
        tool: 'git',
        action: 'status',
        params: {},
        decision: 'auto_allowed',
      })
      mgr.clearAuditLog()
      expect(mgr.getAuditLog()).toEqual([])
    })
  })
})

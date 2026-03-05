/**
 * KAN-286: Skill Execution Pipeline — Unit tests
 *
 * Imports the real processSkills, toProjectRules, formatExecutionLog
 * from source. NEVER duplicates function code.
 */

import { processSkills, toProjectRules, formatExecutionLog } from '../../src/skills/skill-processor'
import type { Skill } from '../../src/skills/types'

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'test-1',
    name: 'Test Skill',
    description: 'A test skill',
    prompt_template: 'Do something useful',
    enabled: true,
    scope: 'global',
    created_by: 'user',
    created_at: Date.now(),
    updated_at: Date.now(),
    execution_mode: 'always',
    ...overrides,
  }
}

describe('processSkills', () => {
  test('returns empty result for empty skills array', () => {
    const result = processSkills([])
    expect(result.activeSkills).toEqual([])
    expect(result.executionLog).toEqual([])
    expect(result.totalEvaluated).toBe(0)
    expect(result.totalApplied).toBe(0)
  })

  test('applies enabled skill with execution_mode=always', () => {
    const result = processSkills([makeSkill()])
    expect(result.totalApplied).toBe(1)
    expect(result.activeSkills).toHaveLength(1)
    expect(result.activeSkills[0].name).toBe('Test Skill')
  })

  test('applies skill when execution_mode is undefined (defaults to always)', () => {
    const result = processSkills([makeSkill({ execution_mode: undefined })])
    expect(result.totalApplied).toBe(1)
  })

  test('skips disabled skills', () => {
    const result = processSkills([makeSkill({ enabled: false })])
    expect(result.totalApplied).toBe(0)
    expect(result.executionLog[0].reason).toBe('disabled')
  })

  test('skips manual skills when not triggered', () => {
    const result = processSkills([makeSkill({ execution_mode: 'manual' })])
    expect(result.totalApplied).toBe(0)
    expect(result.executionLog[0].reason).toContain('manual')
  })

  test('applies manual skill when ID is in manualTriggerIds', () => {
    const skill = makeSkill({ id: 'manual-1', execution_mode: 'manual' })
    const result = processSkills([skill], { manualTriggerIds: ['manual-1'] })
    expect(result.totalApplied).toBe(1)
    expect(result.executionLog[0].reason).toContain('manually triggered')
  })

  test('skips on_demand skills by default', () => {
    const result = processSkills([makeSkill({ execution_mode: 'on_demand' })])
    expect(result.totalApplied).toBe(0)
    expect(result.executionLog[0].reason).toContain('on_demand')
  })

  test('applies on_demand skills when includeOnDemand is true', () => {
    const result = processSkills(
      [makeSkill({ execution_mode: 'on_demand' })],
      { includeOnDemand: true }
    )
    expect(result.totalApplied).toBe(1)
  })

  test('sorts skills by order field', () => {
    const skills = [
      makeSkill({ id: 'b', name: 'B', order: 2 }),
      makeSkill({ id: 'a', name: 'A', order: 1 }),
      makeSkill({ id: 'c', name: 'C', order: 3 }),
    ]
    const result = processSkills(skills)
    expect(result.activeSkills.map(s => s.name)).toEqual(['A', 'B', 'C'])
  })

  test('skills without order get sorted to end (999)', () => {
    const skills = [
      makeSkill({ id: 'no-order', name: 'NoOrder' }),
      makeSkill({ id: 'ordered', name: 'Ordered', order: 1 }),
    ]
    const result = processSkills(skills)
    expect(result.activeSkills[0].name).toBe('Ordered')
    expect(result.activeSkills[1].name).toBe('NoOrder')
  })

  test('mixed execution_modes — only always skills applied by default', () => {
    const skills = [
      makeSkill({ id: '1', name: 'Always', execution_mode: 'always' }),
      makeSkill({ id: '2', name: 'Manual', execution_mode: 'manual' }),
      makeSkill({ id: '3', name: 'OnDemand', execution_mode: 'on_demand' }),
    ]
    const result = processSkills(skills)
    expect(result.totalApplied).toBe(1)
    expect(result.activeSkills[0].name).toBe('Always')
  })

  test('execution log has entry for every skill evaluated', () => {
    const skills = [
      makeSkill({ id: '1', enabled: true }),
      makeSkill({ id: '2', enabled: false }),
      makeSkill({ id: '3', execution_mode: 'manual' }),
    ]
    const result = processSkills(skills)
    expect(result.executionLog).toHaveLength(3)
    expect(result.totalEvaluated).toBe(3)
  })

  test('execution log entries have timestamps', () => {
    const result = processSkills([makeSkill()])
    expect(result.executionLog[0].timestamp).toBeGreaterThan(0)
  })

  test('processingTimeMs is non-negative', () => {
    const result = processSkills([makeSkill()])
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
  })
})

describe('toProjectRules', () => {
  test('converts ProcessedSkill to legacy format', () => {
    const result = processSkills([makeSkill()])
    const rules = toProjectRules(result.activeSkills)
    expect(rules).toHaveLength(1)
    expect(rules[0].filename).toBe('test-1')
    expect(rules[0].alwaysApply).toBe(true)
    expect(rules[0].content).toBe('Do something useful')
  })

  test('returns empty array for no skills', () => {
    expect(toProjectRules([])).toEqual([])
  })

  test('uses description or name as description', () => {
    const result = processSkills([makeSkill({ description: 'Custom desc' })])
    const rules = toProjectRules(result.activeSkills)
    expect(rules[0].description).toBe('Custom desc')
  })
})

describe('formatExecutionLog', () => {
  test('produces a non-empty string', () => {
    const result = processSkills([makeSkill()])
    const log = formatExecutionLog(result)
    expect(log.length).toBeGreaterThan(0)
  })

  test('contains SkillProcessor header', () => {
    const result = processSkills([makeSkill()])
    const log = formatExecutionLog(result)
    expect(log).toContain('[SkillProcessor]')
  })

  test('shows applied count', () => {
    const result = processSkills([makeSkill()])
    const log = formatExecutionLog(result)
    expect(log).toContain('1/1')
  })

  test('uses checkmark for applied skills', () => {
    const result = processSkills([makeSkill()])
    const log = formatExecutionLog(result)
    expect(log).toContain('✓')
  })

  test('uses dot for skipped skills', () => {
    const result = processSkills([makeSkill({ enabled: false })])
    const log = formatExecutionLog(result)
    expect(log).toContain('·')
  })
})

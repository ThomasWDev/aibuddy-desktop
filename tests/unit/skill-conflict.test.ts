/**
 * KAN-287: Skill Priority and Conflict Resolution — Unit tests
 *
 * Imports real detectConflicts, processSkills from source.
 * NEVER duplicates function code.
 */

import { processSkills, detectConflicts } from '../../src/skills/skill-processor'
import type { ProcessedSkill } from '../../src/skills/skill-processor'
import type { Skill } from '../../src/skills/types'
import { SkillsStorageManager, BUILTIN_SKILLS } from '../../src/skills/skills-manager'

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: `test-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Skill',
    description: 'A test skill',
    prompt_template: 'Do something',
    enabled: true,
    scope: 'global',
    created_by: 'user',
    created_at: Date.now(),
    updated_at: Date.now(),
    execution_mode: 'always',
    order: 0,
    ...overrides,
  }
}

function makeProcessed(overrides: Partial<ProcessedSkill> = {}): ProcessedSkill {
  return {
    id: `proc-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Processed',
    description: 'desc',
    prompt_template: 'template',
    execution_mode: 'always',
    order: 0,
    ...overrides,
  }
}

describe('detectConflicts', () => {
  test('returns empty for skills without tags', () => {
    const skills = [
      makeProcessed({ name: 'A' }),
      makeProcessed({ name: 'B' }),
    ]
    expect(detectConflicts(skills)).toEqual([])
  })

  test('returns empty for skills with non-overlapping tags', () => {
    const skills = [
      makeProcessed({ name: 'A', tags: ['security'] }),
      makeProcessed({ name: 'B', tags: ['testing'] }),
    ]
    expect(detectConflicts(skills)).toEqual([])
  })

  test('detects conflict when skills share a tag', () => {
    const skills = [
      makeProcessed({ id: 'a', name: 'A', tags: ['security', 'auth'], order: 0 }),
      makeProcessed({ id: 'b', name: 'B', tags: ['auth', 'logging'], order: 1 }),
    ]
    const conflicts = detectConflicts(skills)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].sharedTags).toEqual(['auth'])
  })

  test('resolution identifies lower-order skill as winner', () => {
    const skills = [
      makeProcessed({ id: 'a', name: 'High Priority', tags: ['style'], order: 1 }),
      makeProcessed({ id: 'b', name: 'Low Priority', tags: ['style'], order: 5 }),
    ]
    const conflicts = detectConflicts(skills)
    expect(conflicts[0].resolution).toContain('High Priority')
    expect(conflicts[0].resolution).toContain('precedence')
  })

  test('finds multiple shared tags', () => {
    const skills = [
      makeProcessed({ id: 'a', name: 'A', tags: ['security', 'auth', 'api'], order: 0 }),
      makeProcessed({ id: 'b', name: 'B', tags: ['auth', 'api', 'logging'], order: 1 }),
    ]
    const conflicts = detectConflicts(skills)
    expect(conflicts[0].sharedTags).toEqual(['auth', 'api'])
  })

  test('avoids duplicate pairs', () => {
    const skills = [
      makeProcessed({ id: 'a', name: 'A', tags: ['x'], order: 0 }),
      makeProcessed({ id: 'b', name: 'B', tags: ['x'], order: 1 }),
    ]
    const conflicts = detectConflicts(skills)
    expect(conflicts).toHaveLength(1)
  })

  test('handles multiple conflicting pairs', () => {
    const skills = [
      makeProcessed({ id: 'a', name: 'A', tags: ['security'], order: 0 }),
      makeProcessed({ id: 'b', name: 'B', tags: ['security'], order: 1 }),
      makeProcessed({ id: 'c', name: 'C', tags: ['security'], order: 2 }),
    ]
    const conflicts = detectConflicts(skills)
    expect(conflicts).toHaveLength(3) // A-B, A-C, B-C
  })
})

describe('processSkills with conflict detection', () => {
  test('result includes conflicts array', () => {
    const result = processSkills([])
    expect(result).toHaveProperty('conflicts')
    expect(Array.isArray(result.conflicts)).toBe(true)
  })

  test('no conflicts for skills without tags', () => {
    const result = processSkills([
      makeSkill({ name: 'A' }),
      makeSkill({ name: 'B' }),
    ])
    expect(result.conflicts).toHaveLength(0)
  })

  test('detects conflicts between applied skills', () => {
    const result = processSkills([
      makeSkill({ id: 'a', name: 'A', tags: ['coding'], order: 0 }),
      makeSkill({ id: 'b', name: 'B', tags: ['coding'], order: 1 }),
    ])
    expect(result.conflicts).toHaveLength(1)
  })

  test('does not detect conflicts for disabled skills', () => {
    const result = processSkills([
      makeSkill({ id: 'a', name: 'A', tags: ['coding'], enabled: true, order: 0 }),
      makeSkill({ id: 'b', name: 'B', tags: ['coding'], enabled: false, order: 1 }),
    ])
    expect(result.conflicts).toHaveLength(0)
  })

  test('active skills include order and tags', () => {
    const result = processSkills([makeSkill({ order: 5, tags: ['x'] })])
    expect(result.activeSkills[0].order).toBe(5)
    expect(result.activeSkills[0].tags).toEqual(['x'])
  })
})

describe('SkillsStorageManager.reorderSkills', () => {
  beforeEach(() => {
    SkillsStorageManager.resetInstance()
  })

  test('reorderSkills sets order based on array index', () => {
    const mgr = SkillsStorageManager.getInstance()
    const s1 = mgr.createSkill({ name: 'First', prompt_template: 'a', order: 10 })
    const s2 = mgr.createSkill({ name: 'Second', prompt_template: 'b', order: 20 })

    mgr.reorderSkills([s2.id, s1.id])

    const reloaded1 = mgr.getSkillById(s1.id)!
    const reloaded2 = mgr.getSkillById(s2.id)!
    expect(reloaded2.order).toBe(0)
    expect(reloaded1.order).toBe(1)
  })

  test('reorderSkills ignores unknown IDs gracefully', () => {
    const mgr = SkillsStorageManager.getInstance()
    const s1 = mgr.createSkill({ name: 'A', prompt_template: 'a' })
    expect(() => mgr.reorderSkills(['unknown', s1.id])).not.toThrow()
    expect(mgr.getSkillById(s1.id)!.order).toBe(1)
  })
})

describe('Built-in skills tags', () => {
  test('all built-in skills have tags arrays', () => {
    for (const skill of BUILTIN_SKILLS) {
      expect(skill.tags).toBeDefined()
      expect(Array.isArray(skill.tags)).toBe(true)
      expect(skill.tags!.length).toBeGreaterThan(0)
    }
  })

  test('built-in skills share at least one tag (engineering)', () => {
    const senior = BUILTIN_SKILLS.find(s => s.id === '_builtin_senior_engineering')!
    const quality = BUILTIN_SKILLS.find(s => s.id === '_builtin_code_quality')!
    const shared = senior.tags!.filter(t => quality.tags!.includes(t))
    expect(shared.length).toBeGreaterThan(0)
  })
})

describe('SkillsStorageManager tags in createSkill', () => {
  beforeEach(() => {
    SkillsStorageManager.resetInstance()
  })

  test('createSkill stores tags', () => {
    const mgr = SkillsStorageManager.getInstance()
    const skill = mgr.createSkill({
      name: 'Tagged',
      prompt_template: 't',
      tags: ['security', 'auth'],
    })
    expect(skill.tags).toEqual(['security', 'auth'])
  })

  test('updateSkill can modify tags', () => {
    const mgr = SkillsStorageManager.getInstance()
    const skill = mgr.createSkill({ name: 'X', prompt_template: 'x', tags: ['a'] })
    const updated = mgr.updateSkill(skill.id, { tags: ['b', 'c'] })
    expect(updated!.tags).toEqual(['b', 'c'])
  })
})

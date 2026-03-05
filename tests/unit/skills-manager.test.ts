import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SkillsStorageManager, BUILTIN_SKILLS, parseFrontmatter } from '../../src/skills/skills-manager'
import { Skill, SKILLS_VERSION } from '../../src/skills/types'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// ---------------------------------------------------------------------------
// KAN-282: Unit tests for SkillsStorageManager — imports REAL functions.
// ---------------------------------------------------------------------------

const SKILLS_FILE = path.join(os.homedir(), '.aibuddy', 'skills', 'skills.json')
let backupData: string | null = null

beforeEach(() => {
  // Backup existing skills file if present
  try {
    if (fs.existsSync(SKILLS_FILE)) {
      backupData = fs.readFileSync(SKILLS_FILE, 'utf-8')
    }
  } catch { /* no backup needed */ }
  SkillsStorageManager.resetInstance()
})

afterEach(() => {
  // Restore backup
  SkillsStorageManager.resetInstance()
  try {
    if (backupData !== null) {
      fs.writeFileSync(SKILLS_FILE, backupData, 'utf-8')
    }
  } catch { /* best effort */ }
  backupData = null
})

describe('SkillsStorageManager — CRUD', () => {
  it('getInstance returns a singleton', () => {
    const a = SkillsStorageManager.getInstance()
    const b = SkillsStorageManager.getInstance()
    expect(a).toBe(b)
  })

  it('getSkills includes built-in skills', () => {
    const mgr = SkillsStorageManager.getInstance()
    const skills = mgr.getSkills()
    const builtinIds = BUILTIN_SKILLS.map(s => s.id)
    for (const id of builtinIds) {
      expect(skills.some(s => s.id === id)).toBe(true)
    }
  })

  it('createSkill returns a new skill with all required fields', () => {
    const mgr = SkillsStorageManager.getInstance()
    const skill = mgr.createSkill({
      name: 'Test Skill',
      description: 'A test',
      prompt_template: 'Always test first.',
      scope: 'project',
    })

    expect(skill.id).toBeTruthy()
    expect(skill.name).toBe('Test Skill')
    expect(skill.description).toBe('A test')
    expect(skill.prompt_template).toBe('Always test first.')
    expect(skill.enabled).toBe(true)
    expect(skill.scope).toBe('project')
    expect(skill.created_by).toBe('user')
    expect(skill.created_at).toBeGreaterThan(0)
    expect(skill.updated_at).toBeGreaterThan(0)
  })

  it('getSkillById returns the correct skill', () => {
    const mgr = SkillsStorageManager.getInstance()
    const created = mgr.createSkill({ name: 'Find Me', prompt_template: 'abc' })
    const found = mgr.getSkillById(created.id)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Find Me')
  })

  it('getSkillById returns built-in skills', () => {
    const mgr = SkillsStorageManager.getInstance()
    const builtin = mgr.getSkillById('_builtin_code_quality')
    expect(builtin).toBeDefined()
    expect(builtin!.builtin).toBe(true)
  })

  it('updateSkill modifies the skill and updates timestamp', () => {
    const mgr = SkillsStorageManager.getInstance()
    const skill = mgr.createSkill({ name: 'Original', prompt_template: 'x' })
    const before = skill.updated_at

    // Small delay to ensure timestamp differs
    const updated = mgr.updateSkill(skill.id, { name: 'Renamed', enabled: false })
    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('Renamed')
    expect(updated!.enabled).toBe(false)
    expect(updated!.updated_at).toBeGreaterThanOrEqual(before)
  })

  it('updateSkill returns null for built-in skills', () => {
    const mgr = SkillsStorageManager.getInstance()
    const result = mgr.updateSkill('_builtin_senior_engineering', { name: 'Hacked' })
    expect(result).toBeNull()
  })

  it('toggleSkill flips enabled state', () => {
    const mgr = SkillsStorageManager.getInstance()
    const skill = mgr.createSkill({ name: 'Toggle Me', prompt_template: 'x', enabled: true })
    expect(skill.enabled).toBe(true)

    const toggled = mgr.toggleSkill(skill.id)
    expect(toggled).not.toBeNull()
    expect(toggled!.enabled).toBe(false)

    const toggled2 = mgr.toggleSkill(skill.id)
    expect(toggled2!.enabled).toBe(true)
  })

  it('deleteSkill removes a user skill', () => {
    const mgr = SkillsStorageManager.getInstance()
    const skill = mgr.createSkill({ name: 'Delete Me', prompt_template: 'x' })
    expect(mgr.getSkillById(skill.id)).toBeDefined()

    const ok = mgr.deleteSkill(skill.id)
    expect(ok).toBe(true)
    expect(mgr.getSkillById(skill.id)).toBeUndefined()
  })

  it('deleteSkill refuses to delete built-in skills', () => {
    const mgr = SkillsStorageManager.getInstance()
    const ok = mgr.deleteSkill('_builtin_tdd_and_documentation')
    expect(ok).toBe(false)
  })

  it('getActiveSkills returns only enabled skills', () => {
    const mgr = SkillsStorageManager.getInstance()
    mgr.createSkill({ name: 'Active', prompt_template: 'a', enabled: true })
    mgr.createSkill({ name: 'Inactive', prompt_template: 'b', enabled: false })

    const active = mgr.getActiveSkills()
    expect(active.some(s => s.name === 'Active')).toBe(true)
    expect(active.some(s => s.name === 'Inactive')).toBe(false)
  })

  it('persistence: flushSave writes to disk and reloads', () => {
    const mgr = SkillsStorageManager.getInstance()
    mgr.createSkill({ name: 'Persisted', prompt_template: 'persist' })
    mgr.flushSave()

    expect(fs.existsSync(SKILLS_FILE)).toBe(true)
    const data = JSON.parse(fs.readFileSync(SKILLS_FILE, 'utf-8'))
    expect(data.skills.some((s: Skill) => s.name === 'Persisted')).toBe(true)
    expect(data.version).toBe(SKILLS_VERSION)

    // Reset and reload — skill should still be there
    SkillsStorageManager.resetInstance()
    const mgr2 = SkillsStorageManager.getInstance()
    const found = mgr2.getSkills().find(s => s.name === 'Persisted')
    expect(found).toBeDefined()
  })
})

describe('parseFrontmatter — real import', () => {
  it('parses YAML frontmatter with description and alwaysApply', () => {
    const raw = `---\ndescription: "My Skill"\nalwaysApply: true\n---\nContent here`
    const result = parseFrontmatter(raw)
    expect(result.description).toBe('My Skill')
    expect(result.alwaysApply).toBe(true)
    expect(result.content).toBe('Content here')
  })

  it('returns raw content when no frontmatter', () => {
    const result = parseFrontmatter('Just plain content')
    expect(result.content).toBe('Just plain content')
    expect(result.description).toBeUndefined()
    expect(result.alwaysApply).toBeUndefined()
  })
})

describe('BUILTIN_SKILLS — real import', () => {
  it('contains exactly 3 built-in skills', () => {
    expect(BUILTIN_SKILLS).toHaveLength(3)
  })

  it('all have scope global and enabled true', () => {
    for (const s of BUILTIN_SKILLS) {
      expect(s.scope).toBe('global')
      expect(s.enabled).toBe(true)
      expect(s.builtin).toBe(true)
      expect(s.created_by).toBe('system')
    }
  })
})

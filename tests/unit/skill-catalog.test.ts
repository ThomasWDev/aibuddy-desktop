/**
 * KAN-288: Skill Marketplace — Unit tests
 *
 * Imports real getCatalog, getCatalogSkill, getCatalogCategories,
 * and SkillsStorageManager from source. NEVER duplicates function code.
 */

import { getCatalog, getCatalogSkill, getCatalogCategories, SKILL_CATALOG } from '../../src/skills/skill-catalog'
import { SkillsStorageManager } from '../../src/skills/skills-manager'

describe('getCatalog', () => {
  test('returns all catalog skills', () => {
    const catalog = getCatalog()
    expect(catalog.length).toBeGreaterThanOrEqual(5)
  })

  test('each skill has required fields', () => {
    for (const skill of getCatalog()) {
      expect(skill.catalog_id).toBeTruthy()
      expect(skill.name).toBeTruthy()
      expect(skill.description).toBeTruthy()
      expect(skill.prompt_template).toBeTruthy()
      expect(skill.author).toBeTruthy()
      expect(skill.category).toBeTruthy()
      expect(skill.icon).toBeTruthy()
      expect(Array.isArray(skill.tags)).toBe(true)
    }
  })

  test('all catalog_ids are unique', () => {
    const ids = getCatalog().map(s => s.catalog_id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('all catalog_ids start with marketplace_', () => {
    for (const skill of getCatalog()) {
      expect(skill.catalog_id).toMatch(/^marketplace_/)
    }
  })
})

describe('getCatalogSkill', () => {
  test('returns skill by catalog_id', () => {
    const skill = getCatalogSkill('marketplace_prompt_refiner')
    expect(skill).toBeDefined()
    expect(skill!.name).toBe('Developer Prompt Refiner')
  })

  test('returns undefined for unknown catalog_id', () => {
    expect(getCatalogSkill('nonexistent')).toBeUndefined()
  })
})

describe('getCatalogCategories', () => {
  test('returns sorted unique categories', () => {
    const categories = getCatalogCategories()
    expect(categories.length).toBeGreaterThanOrEqual(3)
    const sorted = [...categories].sort()
    expect(categories).toEqual(sorted)
  })

  test('includes expected categories', () => {
    const categories = getCatalogCategories()
    expect(categories).toContain('Security')
    expect(categories).toContain('Database')
  })
})

describe('SKILL_CATALOG constant', () => {
  test('contains the 4 ticket examples', () => {
    const names = SKILL_CATALOG.map(s => s.name)
    expect(names).toContain('Developer Prompt Refiner')
    expect(names).toContain('Architecture Assistant')
    expect(names).toContain('SQL Optimizer')
    expect(names).toContain('AWS Deployment Helper')
  })
})

describe('SkillsStorageManager.installFromCatalog', () => {
  beforeEach(() => {
    SkillsStorageManager.resetInstance()
  })

  test('installs a catalog skill', () => {
    const mgr = SkillsStorageManager.getInstance()
    const catalogSkill = getCatalogSkill('marketplace_prompt_refiner')!
    const installed = mgr.installFromCatalog(catalogSkill)
    expect(installed.name).toBe('Developer Prompt Refiner')
    expect(installed.source).toBe('marketplace')
    expect(installed.catalog_id).toBe('marketplace_prompt_refiner')
    expect(installed.enabled).toBe(true)
  })

  test('throws on duplicate install', () => {
    const mgr = SkillsStorageManager.getInstance()
    const catalogSkill = getCatalogSkill('marketplace_sql_optimizer')!
    mgr.installFromCatalog(catalogSkill)
    expect(() => mgr.installFromCatalog(catalogSkill)).toThrow(/already installed/i)
  })

  test('installed skill has correct tags', () => {
    const mgr = SkillsStorageManager.getInstance()
    const catalogSkill = getCatalogSkill('marketplace_security_reviewer')!
    const installed = mgr.installFromCatalog(catalogSkill)
    expect(installed.tags).toEqual(catalogSkill.tags)
  })

  test('installed skill has correct execution_mode', () => {
    const mgr = SkillsStorageManager.getInstance()
    const catalogSkill = getCatalogSkill('marketplace_architecture_assistant')!
    const installed = mgr.installFromCatalog(catalogSkill)
    expect(installed.execution_mode).toBe('manual')
  })
})

describe('SkillsStorageManager.isInstalled', () => {
  beforeEach(() => {
    SkillsStorageManager.resetInstance()
  })

  test('returns false for uninstalled skill', () => {
    const mgr = SkillsStorageManager.getInstance()
    expect(mgr.isInstalled('marketplace_prompt_refiner')).toBe(false)
  })

  test('returns true after installing', () => {
    const mgr = SkillsStorageManager.getInstance()
    const catalogSkill = getCatalogSkill('marketplace_prompt_refiner')!
    mgr.installFromCatalog(catalogSkill)
    expect(mgr.isInstalled('marketplace_prompt_refiner')).toBe(true)
  })
})

describe('SkillsStorageManager.getInstalledCatalogIds', () => {
  beforeEach(() => {
    SkillsStorageManager.resetInstance()
  })

  test('returns empty array when none installed', () => {
    const mgr = SkillsStorageManager.getInstance()
    expect(mgr.getInstalledCatalogIds()).toEqual([])
  })

  test('returns installed catalog IDs', () => {
    const mgr = SkillsStorageManager.getInstance()
    mgr.installFromCatalog(getCatalogSkill('marketplace_prompt_refiner')!)
    mgr.installFromCatalog(getCatalogSkill('marketplace_sql_optimizer')!)
    const ids = mgr.getInstalledCatalogIds()
    expect(ids).toContain('marketplace_prompt_refiner')
    expect(ids).toContain('marketplace_sql_optimizer')
    expect(ids).toHaveLength(2)
  })
})

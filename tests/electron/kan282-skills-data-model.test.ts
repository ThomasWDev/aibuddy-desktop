import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-282: Create Skills Data Model and Storage Layer
//
// Root cause: The skills system used a minimal ProjectRuleDTO (filename,
// description, alwaysApply, content, builtin) with no IDs, timestamps,
// scope, ordering, or proper storage manager. Acceptance criteria require:
// id, name, description, prompt_template, enabled, scope, created_by,
// created_at, updated_at — with CRUD and enable/disable support.
//
// Fix: Create src/skills/types.ts (Skill interface + SkillsState) and
// src/skills/skills-manager.ts (SkillsStorageManager singleton with CRUD,
// persistence, legacy migration).
// ---------------------------------------------------------------------------

const TYPES_PATH = path.join(__dirname, '../../src/skills/types.ts')
const MANAGER_PATH = path.join(__dirname, '../../src/skills/skills-manager.ts')

describe('KAN-282: Skills Data Model and Storage Layer', () => {

  // ==========================================================================
  // 1. Skill type must have all required fields
  // ==========================================================================
  describe('Skill interface (types.ts)', () => {
    const typesSource = fs.readFileSync(TYPES_PATH, 'utf-8')

    it('must export Skill interface', () => {
      expect(typesSource).toMatch(/export\s+interface\s+Skill/)
    })

    it('must have id field', () => {
      expect(typesSource).toMatch(/id:\s*string/)
    })

    it('must have name field', () => {
      expect(typesSource).toMatch(/name:\s*string/)
    })

    it('must have description field', () => {
      expect(typesSource).toMatch(/description:\s*string/)
    })

    it('must have prompt_template field', () => {
      expect(typesSource).toMatch(/prompt_template:\s*string/)
    })

    it('must have enabled field (boolean)', () => {
      expect(typesSource).toMatch(/enabled:\s*boolean/)
    })

    it('must have scope field (global/project)', () => {
      expect(typesSource).toMatch(/scope:\s*(SkillScope|'global'\s*\|\s*'project')/)
    })

    it('must have created_by field', () => {
      expect(typesSource).toMatch(/created_by:\s*string/)
    })

    it('must have created_at field (number/timestamp)', () => {
      expect(typesSource).toMatch(/created_at:\s*number/)
    })

    it('must have updated_at field (number/timestamp)', () => {
      expect(typesSource).toMatch(/updated_at:\s*number/)
    })

    it('must export SkillScope type', () => {
      expect(typesSource).toMatch(/export\s+type\s+SkillScope/)
    })

    it('must export SkillsState interface', () => {
      expect(typesSource).toMatch(/export\s+interface\s+SkillsState/)
    })

    it('must export SKILLS_VERSION', () => {
      expect(typesSource).toMatch(/export\s+const\s+SKILLS_VERSION/)
    })
  })

  // ==========================================================================
  // 2. SkillsStorageManager must exist with full CRUD
  // ==========================================================================
  describe('SkillsStorageManager (skills-manager.ts)', () => {
    const managerSource = fs.readFileSync(MANAGER_PATH, 'utf-8')

    it('must export SkillsStorageManager class', () => {
      expect(managerSource).toMatch(/export\s+class\s+SkillsStorageManager/)
    })

    it('must be a singleton (getInstance)', () => {
      expect(managerSource).toMatch(/static\s+getInstance/)
    })

    it('must have getSkills method', () => {
      expect(managerSource).toMatch(/getSkills\(/)
    })

    it('must have getActiveSkills method', () => {
      expect(managerSource).toMatch(/getActiveSkills\(/)
    })

    it('must have getSkillById method', () => {
      expect(managerSource).toMatch(/getSkillById\(/)
    })

    it('must have createSkill method', () => {
      expect(managerSource).toMatch(/createSkill\(/)
    })

    it('must have updateSkill method', () => {
      expect(managerSource).toMatch(/updateSkill\(/)
    })

    it('must have deleteSkill method', () => {
      expect(managerSource).toMatch(/deleteSkill\(/)
    })

    it('must have toggleSkill method', () => {
      expect(managerSource).toMatch(/toggleSkill\(/)
    })

    it('must prevent deletion of built-in skills', () => {
      expect(managerSource).toMatch(/builtin.*return\s+false|cannot\s+delete\s+built/i)
    })

    it('must prevent update of built-in skills', () => {
      expect(managerSource).toMatch(/builtin.*return\s+null|cannot\s+update\s+built/i)
    })

    it('must have debounced save like ChatHistoryManager', () => {
      expect(managerSource).toMatch(/scheduleSave|saveDebounce/)
    })

    it('must have flushSave for clean shutdown', () => {
      expect(managerSource).toMatch(/flushSave/)
    })

    it('must have migrateLegacyRules for .aibuddy/rules/ migration', () => {
      expect(managerSource).toMatch(/migrateLegacyRules/)
    })

    it('must export BUILTIN_SKILLS array', () => {
      expect(managerSource).toMatch(/export\s+const\s+BUILTIN_SKILLS/)
    })

    it('must have MAX_SKILLS limit', () => {
      expect(managerSource).toMatch(/MAX_SKILLS/)
    })

    it('must have MAX_FILE_SIZE limit', () => {
      expect(managerSource).toMatch(/MAX_FILE_SIZE/)
    })

    it('must export parseFrontmatter for legacy compatibility', () => {
      expect(managerSource).toMatch(/export\s+function\s+parseFrontmatter/)
    })
  })

  // ==========================================================================
  // 3. Built-in skills have proper fields
  // ==========================================================================
  describe('Built-in skills', () => {
    const managerSource = fs.readFileSync(MANAGER_PATH, 'utf-8')

    it('must include senior engineering builtin', () => {
      expect(managerSource).toContain('_builtin_senior_engineering')
    })

    it('must include TDD builtin', () => {
      expect(managerSource).toContain('_builtin_tdd_and_documentation')
    })

    it('must include code quality builtin', () => {
      expect(managerSource).toContain('_builtin_code_quality')
    })

    it('built-ins must have enabled: true', () => {
      const builtinBlocks = managerSource.match(/const BUILTIN_[\w]+:\s*Skill\s*=\s*\{[\s\S]*?\n\}/g) || []
      expect(builtinBlocks.length).toBeGreaterThanOrEqual(3)
      for (const block of builtinBlocks) {
        expect(block).toMatch(/enabled:\s*true/)
      }
    })

    it('built-ins must have scope: global', () => {
      const builtinBlocks = managerSource.match(/const BUILTIN_[\w]+:\s*Skill\s*=\s*\{[\s\S]*?\n\}/g) || []
      for (const block of builtinBlocks) {
        expect(block).toMatch(/scope:\s*'global'/)
      }
    })

    it('built-ins must have created_by: system', () => {
      const builtinBlocks = managerSource.match(/const BUILTIN_[\w]+:\s*Skill\s*=\s*\{[\s\S]*?\n\}/g) || []
      for (const block of builtinBlocks) {
        expect(block).toMatch(/created_by:\s*'system'/)
      }
    })
  })

  // ==========================================================================
  // 4. Storage follows ChatHistoryManager pattern
  // ==========================================================================
  describe('Storage pattern', () => {
    const managerSource = fs.readFileSync(MANAGER_PATH, 'utf-8')

    it('must store skills in ~/.aibuddy/skills/', () => {
      expect(managerSource).toMatch(/\.aibuddy.*skills/)
    })

    it('must use JSON format for persistence', () => {
      expect(managerSource).toMatch(/JSON\.stringify/)
      expect(managerSource).toMatch(/JSON\.parse/)
    })

    it('must have version-based migration support', () => {
      expect(managerSource).toMatch(/SKILLS_VERSION/)
      expect(managerSource).toMatch(/migrate\(/)
    })

    it('must have resetInstance for testing', () => {
      expect(managerSource).toMatch(/resetInstance/)
    })
  })

  // ==========================================================================
  // 5. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('types.ts must exist', () => {
      expect(fs.existsSync(TYPES_PATH)).toBe(true)
    })

    it('skills-manager.ts must exist', () => {
      expect(fs.existsSync(MANAGER_PATH)).toBe(true)
    })

    it('types must import into manager', () => {
      const managerSource = fs.readFileSync(MANAGER_PATH, 'utf-8')
      expect(managerSource).toMatch(/from\s+['"]\.\/types['"]/)
    })
  })
})

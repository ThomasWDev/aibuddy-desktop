/**
 * KAN-287: Implement Skill Priority and Conflict Resolution — Source-level TDD tests
 *
 * Validates:
 * 1. tags field added to Skill interface
 * 2. detectConflicts function exported from skill-processor
 * 3. ConflictPair interface shape
 * 4. processSkills returns conflicts array
 * 5. reorderSkills method in SkillsStorageManager
 * 6. skills:reorder IPC handler
 * 7. Preload exposes reorder method
 * 8. SkillsPanel has reorder controls (move up/down)
 * 9. SkillsPanel shows conflict warnings
 * 10. Built-in skills have tags
 * 11. Tags support in create/update
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

describe('KAN-287: Skill Priority and Conflict Resolution', () => {
  // ─── 1. Tags field in Skill type ─────────────────────────────────────────

  describe('Skill type (src/skills/types.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/types.ts') })

    test('Skill interface has tags field', () => {
      expect(src).toMatch(/tags\??\s*:\s*string\[\]/)
    })

    test('tags is optional', () => {
      expect(src).toMatch(/tags\?/)
    })
  })

  // ─── 2. detectConflicts function ─────────────────────────────────────────

  describe('detectConflicts (src/skills/skill-processor.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-processor.ts') })

    test('exports detectConflicts function', () => {
      expect(src).toMatch(/export\s+function\s+detectConflicts/)
    })

    test('accepts ProcessedSkill array', () => {
      expect(src).toMatch(/detectConflicts\(skills:\s*ProcessedSkill\[\]/)
    })

    test('returns ConflictPair array', () => {
      expect(src).toMatch(/detectConflicts.*:\s*ConflictPair\[\]/)
    })

    test('checks for shared tags between skills', () => {
      expect(src).toMatch(/tags.*filter|filter.*tags/)
    })

    test('determines winner by lower order', () => {
      expect(src).toMatch(/order.*<=|<=.*order/)
    })

    test('avoids duplicate pairs', () => {
      expect(src).toMatch(/seen/)
    })
  })

  // ─── 3. ConflictPair interface ───────────────────────────────────────────

  describe('ConflictPair interface', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-processor.ts') })

    test('exports ConflictPair interface', () => {
      expect(src).toMatch(/export\s+interface\s+ConflictPair/)
    })

    test('has skillA with id, name, order', () => {
      expect(src).toMatch(/skillA:\s*\{.*id.*name.*order/s)
    })

    test('has skillB with id, name, order', () => {
      expect(src).toMatch(/skillB:\s*\{.*id.*name.*order/s)
    })

    test('has sharedTags', () => {
      expect(src).toMatch(/sharedTags:\s*string\[\]/)
    })

    test('has resolution string', () => {
      expect(src).toMatch(/resolution:\s*string/)
    })
  })

  // ─── 4. processSkills includes conflicts ─────────────────────────────────

  describe('processSkills returns conflicts', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-processor.ts') })

    test('SkillProcessorResult has conflicts field', () => {
      expect(src).toMatch(/conflicts:\s*ConflictPair\[\]/)
    })

    test('processSkills calls detectConflicts', () => {
      expect(src).toMatch(/detectConflicts\(active\)/)
    })

    test('ProcessedSkill includes tags', () => {
      expect(src).toMatch(/tags\??\s*:\s*string\[\]/)
    })

    test('ProcessedSkill includes order', () => {
      expect(src).toMatch(/order:\s*number/)
    })
  })

  // ─── 5. formatExecutionLog shows conflicts ───────────────────────────────

  describe('formatExecutionLog conflict output', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-processor.ts') })

    test('shows conflict count when present', () => {
      expect(src).toMatch(/conflict.*detected/i)
    })

    test('shows conflict pair details', () => {
      expect(src).toMatch(/skillA\.name.*skillB\.name|sharedTags/)
    })

    test('uses warning indicator for conflicts', () => {
      expect(src).toMatch(/⚠/)
    })
  })

  // ─── 6. reorderSkills in SkillsStorageManager ───────────────────────────

  describe('SkillsStorageManager.reorderSkills (src/skills/skills-manager.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-manager.ts') })

    test('reorderSkills method exists', () => {
      expect(src).toMatch(/reorderSkills/)
    })

    test('accepts orderedIds array', () => {
      expect(src).toMatch(/reorderSkills\(orderedIds:\s*string\[\]/)
    })

    test('sets order from array index', () => {
      expect(src).toMatch(/order\s*=\s*i/)
    })

    test('triggers save', () => {
      expect(src).toMatch(/reorderSkills[\s\S]*?scheduleSave/)
    })

    test('updateSkill accepts tags field', () => {
      expect(src).toMatch(/tags.*updates|updates.*tags/)
    })

    test('createSkill accepts tags field', () => {
      const createBlock = src.match(/createSkill\(params:[\s\S]*?\): Skill {/)
      expect(createBlock).not.toBeNull()
      expect(createBlock![0]).toContain('tags')
    })
  })

  // ─── 7. Built-in skills have tags ────────────────────────────────────────

  describe('Built-in skills have tags', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-manager.ts') })

    test('Senior Engineering skill has tags', () => {
      const block = src.match(/BUILTIN_SENIOR_ENGINEERING[\s\S]*?order:\s*\d/)
      expect(block).not.toBeNull()
      expect(block![0]).toContain('tags')
    })

    test('TDD skill has tags', () => {
      const block = src.match(/BUILTIN_TDD[\s\S]*?order:\s*\d/)
      expect(block).not.toBeNull()
      expect(block![0]).toContain('tags')
    })

    test('Code Quality skill has tags', () => {
      const block = src.match(/BUILTIN_CODE_QUALITY[\s\S]*?order:\s*\d/)
      expect(block).not.toBeNull()
      expect(block![0]).toContain('tags')
    })
  })

  // ─── 8. IPC layer ───────────────────────────────────────────────────────

  describe('IPC layer (electron/ipc/skills.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/ipc/skills.ts') })

    test('registers skills:reorder handler', () => {
      expect(src).toMatch(/skills:reorder/)
    })

    test('handler calls reorderSkills', () => {
      expect(src).toMatch(/reorderSkills/)
    })

    test('reorder channel is in cleanup list', () => {
      expect(src).toMatch(/ALL_CHANNELS[\s\S]*?skills:reorder/)
    })

    test('create handler accepts tags', () => {
      expect(src).toMatch(/skills:create[\s\S]*?tags/)
    })

    test('update handler accepts tags', () => {
      expect(src).toMatch(/skills:update[\s\S]*?tags/)
    })
  })

  // ─── 9. Preload ─────────────────────────────────────────────────────────

  describe('Preload (electron/preload.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/preload.ts') })

    test('ElectronAPI interface includes reorder method', () => {
      expect(src).toMatch(/reorder/)
    })

    test('implementation invokes skills:reorder IPC', () => {
      expect(src).toMatch(/skills:reorder/)
    })

    test('skills type includes tags field', () => {
      expect(src).toMatch(/tags\??\s*:\s*string\[\]/)
    })
  })

  // ─── 10. SkillsPanel reorder controls ────────────────────────────────────

  describe('SkillsPanel reorder controls (renderer/src/components/SkillsPanel.tsx)', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/SkillsPanel.tsx') })

    test('has handleMoveUp callback', () => {
      expect(src).toMatch(/handleMoveUp/)
    })

    test('has handleMoveDown callback', () => {
      expect(src).toMatch(/handleMoveDown/)
    })

    test('calls skills.reorder via IPC', () => {
      expect(src).toMatch(/skills\??\.\s*reorder/)
    })

    test('renders up arrow button', () => {
      expect(src).toMatch(/▲/)
    })

    test('renders down arrow button', () => {
      expect(src).toMatch(/▼/)
    })

    test('up button calls handleMoveUp on click', () => {
      expect(src).toMatch(/handleMoveUp\(skill\)/)
    })

    test('down button calls handleMoveDown on click', () => {
      expect(src).toMatch(/handleMoveDown\(skill\)/)
    })

    test('shows priority order number on hover', () => {
      expect(src).toMatch(/order/)
    })
  })

  // ─── 11. SkillsPanel conflict warnings ───────────────────────────────────

  describe('SkillsPanel conflict warnings', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/SkillsPanel.tsx') })

    test('computes conflicts via useMemo', () => {
      expect(src).toMatch(/useMemo/)
      expect(src).toMatch(/conflicts/)
    })

    test('detects shared tags between enabled skills', () => {
      expect(src).toMatch(/sharedTags/)
    })

    test('shows conflict count in sidebar header', () => {
      expect(src).toMatch(/conflicts\.length/)
    })

    test('shows warning icon on conflicting skills in sidebar', () => {
      expect(src).toMatch(/⚠/)
    })

    test('shows conflict details panel when skill selected', () => {
      expect(src).toMatch(/Priority Conflicts/)
    })

    test('identifies conflicting skill by name', () => {
      expect(src).toMatch(/other\?\.name/)
    })

    test('mentions shared tags in conflict warning', () => {
      expect(src).toMatch(/sharedTags\.join/)
    })

    test('mentions precedence resolution', () => {
      expect(src).toMatch(/precedence/)
    })
  })

  // ─── 12. Tags in create/edit forms ───────────────────────────────────────

  describe('SkillsPanel tags in create/edit forms', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/SkillsPanel.tsx') })

    test('has newTags state', () => {
      expect(src).toMatch(/newTags/)
    })

    test('tags input in create form', () => {
      expect(src).toMatch(/conflict detection/)
    })

    test('tags passed to create call', () => {
      expect(src).toMatch(/tags:\s*tagsArray/)
    })

    test('tags input in edit form', () => {
      const editSections = src.match(/isEditing[\s\S]*?Tags/g)
      expect(editSections).not.toBeNull()
    })

    test('skill tags displayed as badges', () => {
      expect(src).toMatch(/tags\.map/)
    })
  })

  // ─── 13. App.tsx tags in state ───────────────────────────────────────────

  describe('App.tsx state type includes tags', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/App.tsx') })

    test('skills state type includes tags', () => {
      expect(src).toMatch(/tags\??\s*:\s*string\[\]/)
    })
  })

  // ─── Regression guards ──────────────────────────────────────────────────

  describe('Regression guards', () => {
    test('processSkills still exported', () => {
      const src = readFile('src/skills/skill-processor.ts')
      expect(src).toMatch(/export\s+function\s+processSkills/)
    })

    test('toProjectRules still exported', () => {
      const src = readFile('src/skills/skill-processor.ts')
      expect(src).toMatch(/export\s+function\s+toProjectRules/)
    })

    test('formatExecutionLog still exported', () => {
      const src = readFile('src/skills/skill-processor.ts')
      expect(src).toMatch(/export\s+function\s+formatExecutionLog/)
    })

    test('SkillsStorageManager still has getActiveSkills', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toMatch(/getActiveSkills/)
    })

    test('SkillsStorageManager still has getSkillsForPrompt', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toMatch(/getSkillsForPrompt/)
    })

    test('system-prompt.ts still injects ACTIVE PROJECT SKILLS', () => {
      const src = readFile('packages/prompts/src/system-prompt.ts')
      expect(src).toMatch(/ACTIVE PROJECT SKILLS/)
    })

    test('SkillsPanel still exports SkillsPanel component', () => {
      const src = readFile('renderer/src/components/SkillsPanel.tsx')
      expect(src).toMatch(/export\s+function\s+SkillsPanel/)
    })

    test('skills IPC still has core channels', () => {
      const src = readFile('electron/ipc/skills.ts')
      expect(src).toMatch(/skills:getAll/)
      expect(src).toMatch(/skills:create/)
      expect(src).toMatch(/skills:update/)
      expect(src).toMatch(/skills:delete/)
      expect(src).toMatch(/skills:toggle/)
      expect(src).toMatch(/skills:getForPrompt/)
    })
  })
})

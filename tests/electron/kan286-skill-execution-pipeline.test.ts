/**
 * KAN-286: Implement Skill Execution Pipeline — Source-level TDD tests
 *
 * Validates:
 * 1. SkillProcessor module exists and exports core functions
 * 2. processSkills filters by execution_mode (always/manual/on_demand)
 * 3. processSkills orders by skill.order
 * 4. Execution log captures all decisions
 * 5. toProjectRules converts processed skills to legacy format
 * 6. formatExecutionLog produces human-readable output
 * 7. getSkillsForPrompt in SkillsStorageManager
 * 8. IPC layer exposes skills:getForPrompt
 * 9. App.tsx uses execution_mode filtering in pipeline
 * 10. Preload exposes getForPrompt method
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

describe('KAN-286: Skill Execution Pipeline', () => {
  // ─── 1. SkillProcessor module ────────────────────────────────────────────

  describe('SkillProcessor module (src/skills/skill-processor.ts)', () => {
    let src: string

    beforeAll(() => {
      src = readFile('src/skills/skill-processor.ts')
    })

    test('file exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'src/skills/skill-processor.ts'))).toBe(true)
    })

    test('exports processSkills function', () => {
      expect(src).toMatch(/export\s+function\s+processSkills/)
    })

    test('exports toProjectRules function', () => {
      expect(src).toMatch(/export\s+function\s+toProjectRules/)
    })

    test('exports formatExecutionLog function', () => {
      expect(src).toMatch(/export\s+function\s+formatExecutionLog/)
    })

    test('exports SkillProcessorResult interface', () => {
      expect(src).toMatch(/export\s+interface\s+SkillProcessorResult/)
    })

    test('exports SkillExecutionLogEntry interface', () => {
      expect(src).toMatch(/export\s+interface\s+SkillExecutionLogEntry/)
    })

    test('exports ProcessedSkill interface', () => {
      expect(src).toMatch(/export\s+interface\s+ProcessedSkill/)
    })

    test('imports Skill type from types', () => {
      expect(src).toMatch(/import.*Skill.*from\s+['"]\.\/types['"]/)
    })

    test('imports SkillExecutionMode from types', () => {
      expect(src).toMatch(/SkillExecutionMode/)
    })
  })

  // ─── 2. processSkills filters by execution_mode ──────────────────────────

  describe('processSkills execution_mode filtering logic', () => {
    let src: string

    beforeAll(() => {
      src = readFile('src/skills/skill-processor.ts')
    })

    test('handles always mode — marks as applied', () => {
      expect(src).toMatch(/case\s+['"]always['"]/)
      expect(src).toMatch(/auto.*always\s*active/i)
    })

    test('handles manual mode — only applied when triggered', () => {
      expect(src).toMatch(/case\s+['"]manual['"]/)
      expect(src).toMatch(/manualIds\.has\(skill\.id\)/)
    })

    test('handles on_demand mode — only applied when requested', () => {
      expect(src).toMatch(/case\s+['"]on_demand['"]/)
      expect(src).toMatch(/includeOnDemand/)
    })

    test('skips disabled skills regardless of mode', () => {
      expect(src).toMatch(/!skill\.enabled/)
      expect(src).toMatch(/disabled/)
    })

    test('accepts manualTriggerIds option', () => {
      expect(src).toMatch(/manualTriggerIds/)
    })

    test('accepts includeOnDemand option', () => {
      expect(src).toMatch(/includeOnDemand/)
    })

    test('defaults missing execution_mode to always', () => {
      expect(src).toMatch(/execution_mode\s*\|\|\s*['"]always['"]/)
    })
  })

  // ─── 3. processSkills ordering ───────────────────────────────────────────

  describe('processSkills skill ordering', () => {
    let src: string

    beforeAll(() => {
      src = readFile('src/skills/skill-processor.ts')
    })

    test('sorts skills by order field', () => {
      expect(src).toMatch(/\.sort/)
      expect(src).toMatch(/order/)
    })

    test('uses fallback for missing order (999)', () => {
      expect(src).toMatch(/999/)
    })
  })

  // ─── 4. Execution log ───────────────────────────────────────────────────

  describe('Execution log capture', () => {
    let src: string

    beforeAll(() => {
      src = readFile('src/skills/skill-processor.ts')
    })

    test('SkillExecutionLogEntry has skillId', () => {
      expect(src).toMatch(/skillId:\s*string/)
    })

    test('SkillExecutionLogEntry has skillName', () => {
      expect(src).toMatch(/skillName:\s*string/)
    })

    test('SkillExecutionLogEntry has execution_mode', () => {
      expect(src).toMatch(/execution_mode:\s*SkillExecutionMode/)
    })

    test('SkillExecutionLogEntry has applied boolean', () => {
      expect(src).toMatch(/applied:\s*boolean/)
    })

    test('SkillExecutionLogEntry has reason', () => {
      expect(src).toMatch(/reason:\s*string/)
    })

    test('SkillExecutionLogEntry has timestamp', () => {
      expect(src).toMatch(/timestamp:\s*number/)
    })

    test('SkillProcessorResult includes totalEvaluated', () => {
      expect(src).toMatch(/totalEvaluated:\s*number/)
    })

    test('SkillProcessorResult includes totalApplied', () => {
      expect(src).toMatch(/totalApplied:\s*number/)
    })

    test('SkillProcessorResult includes processingTimeMs', () => {
      expect(src).toMatch(/processingTimeMs:\s*number/)
    })

    test('SkillProcessorResult includes executionLog array', () => {
      expect(src).toMatch(/executionLog:\s*SkillExecutionLogEntry\[\]/)
    })
  })

  // ─── 5. toProjectRules conversion ────────────────────────────────────────

  describe('toProjectRules conversion', () => {
    let src: string

    beforeAll(() => {
      src = readFile('src/skills/skill-processor.ts')
    })

    test('maps ProcessedSkill to legacy projectRules format', () => {
      expect(src).toMatch(/filename:\s*s\.id/)
    })

    test('sets alwaysApply to true for all processed skills', () => {
      expect(src).toMatch(/alwaysApply:\s*true/)
    })

    test('maps prompt_template to content', () => {
      expect(src).toMatch(/content:\s*s\.prompt_template/)
    })

    test('preserves builtin flag', () => {
      expect(src).toMatch(/builtin:\s*s\.builtin/)
    })
  })

  // ─── 6. formatExecutionLog ───────────────────────────────────────────────

  describe('formatExecutionLog output', () => {
    let src: string

    beforeAll(() => {
      src = readFile('src/skills/skill-processor.ts')
    })

    test('produces SkillProcessor header line', () => {
      expect(src).toMatch(/\[SkillProcessor\]/)
    })

    test('shows applied/total counts', () => {
      expect(src).toMatch(/totalApplied.*totalEvaluated|totalEvaluated.*totalApplied/)
    })

    test('shows processing time', () => {
      expect(src).toMatch(/processingTimeMs/)
    })

    test('uses checkmark for applied skills', () => {
      expect(src).toMatch(/✓/)
    })

    test('uses dot for skipped skills', () => {
      expect(src).toMatch(/·/)
    })
  })

  // ─── 7. getSkillsForPrompt in SkillsStorageManager ──────────────────────

  describe('SkillsStorageManager.getSkillsForPrompt', () => {
    let src: string

    beforeAll(() => {
      src = readFile('src/skills/skills-manager.ts')
    })

    test('method exists', () => {
      expect(src).toMatch(/getSkillsForPrompt/)
    })

    test('filters by enabled status', () => {
      expect(src).toMatch(/getActiveSkills/)
    })

    test('filters by execution_mode === always', () => {
      expect(src).toMatch(/execution_mode.*===.*['"]always['"]/)
    })

    test('treats missing execution_mode as always', () => {
      expect(src).toMatch(/!s\.execution_mode\s*\|\|/)
    })
  })

  // ─── 8. IPC layer ───────────────────────────────────────────────────────

  describe('IPC layer (electron/ipc/skills.ts)', () => {
    let src: string

    beforeAll(() => {
      src = readFile('electron/ipc/skills.ts')
    })

    test('registers skills:getForPrompt handler', () => {
      expect(src).toMatch(/skills:getForPrompt/)
    })

    test('handler calls getSkillsForPrompt', () => {
      expect(src).toMatch(/getSkillsForPrompt/)
    })

    test('channel is in cleanup list', () => {
      // KAN-287: channels moved to shared ALL_CHANNELS constant
      expect(src).toMatch(/ALL_CHANNELS[\s\S]*?skills:getForPrompt/)
    })
  })

  // ─── 9. App.tsx execution pipeline ───────────────────────────────────────

  describe('App.tsx execution pipeline', () => {
    let src: string

    beforeAll(() => {
      src = readFile('renderer/src/App.tsx')
    })

    test('skills state includes execution_mode field', () => {
      expect(src).toMatch(/execution_mode\??\s*:\s*string/)
    })

    test('filters skills by execution_mode before injection', () => {
      expect(src).toMatch(/execution_mode.*===.*['"]always['"]|execution_mode.*always/)
    })

    test('only injects enabled skills', () => {
      expect(src).toMatch(/s\.enabled/)
    })

    test('logs skill processor output', () => {
      expect(src).toMatch(/\[SkillProcessor\]/)
    })

    test('treats missing execution_mode as always (fallback)', () => {
      expect(src).toMatch(/execution_mode\s*\|\|\s*['"]always['"]/)
    })
  })

  // ─── 10. Preload exposes getForPrompt ────────────────────────────────────

  describe('Preload (electron/preload.ts)', () => {
    let src: string

    beforeAll(() => {
      src = readFile('electron/preload.ts')
    })

    test('ElectronAPI interface includes getForPrompt', () => {
      expect(src).toMatch(/getForPrompt/)
    })

    test('implementation invokes skills:getForPrompt IPC', () => {
      expect(src).toMatch(/skills:getForPrompt/)
    })
  })

  // ─── Regression guards ──────────────────────────────────────────────────

  describe('Regression guards', () => {
    test('SkillsStorageManager still has getActiveSkills', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toMatch(/getActiveSkills/)
    })

    test('system-prompt.ts still injects ACTIVE PROJECT SKILLS section', () => {
      const src = readFile('packages/prompts/src/system-prompt.ts')
      expect(src).toMatch(/ACTIVE PROJECT SKILLS/)
    })

    test('Skill type still has execution_mode field', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/execution_mode/)
    })

    test('SkillsPanel still exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'renderer/src/components/SkillsPanel.tsx'))).toBe(true)
    })

    test('skills IPC still has getAll, getActive, create, update, delete, toggle', () => {
      const src = readFile('electron/ipc/skills.ts')
      expect(src).toMatch(/skills:getAll/)
      expect(src).toMatch(/skills:getActive/)
      expect(src).toMatch(/skills:create/)
      expect(src).toMatch(/skills:update/)
      expect(src).toMatch(/skills:delete/)
      expect(src).toMatch(/skills:toggle/)
    })
  })
})

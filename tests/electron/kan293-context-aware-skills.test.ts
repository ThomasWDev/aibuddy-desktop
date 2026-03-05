/**
 * KAN-293: Implement Context-Aware Skills — Source-level TDD tests
 *
 * Validates:
 * 1. Types: SkillContextTrigger, SkillContext, Skill.context_triggers
 * 2. skill-processor.ts: evaluateContextTriggers, processSkills with context
 * 3. skill-catalog.ts: context_triggers on catalog skills
 * 4. App.tsx: context-aware skill filtering
 * 5. SkillsPanel: context trigger UI (display + edit)
 * 6. skills-manager: context_triggers in create/update/install
 * 7. Regression guards
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

describe('KAN-293: Context-Aware Skills', () => {
  // ─── 1. Types ────────────────────────────────────────────────────────────

  describe('types.ts — Context trigger types', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/types.ts') })

    it('declares SkillContextTrigger interface', () => {
      expect(src).toContain('export interface SkillContextTrigger')
    })

    it('SkillContextTrigger has optional project_types', () => {
      expect(src).toMatch(/SkillContextTrigger[\s\S]*?project_types\?:\s*string\[\]/)
    })

    it('SkillContextTrigger has optional file_patterns', () => {
      expect(src).toMatch(/SkillContextTrigger[\s\S]*?file_patterns\?:\s*string\[\]/)
    })

    it('SkillContextTrigger has optional keywords', () => {
      expect(src).toMatch(/SkillContextTrigger[\s\S]*?keywords\?:\s*string\[\]/)
    })

    it('declares SkillContext interface', () => {
      expect(src).toContain('export interface SkillContext')
    })

    it('SkillContext has optional projectType', () => {
      expect(src).toMatch(/SkillContext[\s\S]*?projectType\?:\s*string/)
    })

    it('SkillContext has optional workspacePath', () => {
      expect(src).toMatch(/SkillContext[\s\S]*?workspacePath\?:\s*string/)
    })

    it('SkillContext has optional workspaceFiles', () => {
      expect(src).toMatch(/SkillContext[\s\S]*?workspaceFiles\?:\s*string\[\]/)
    })

    it('SkillContext has optional userMessage', () => {
      expect(src).toMatch(/SkillContext[\s\S]*?userMessage\?:\s*string/)
    })

    it('Skill interface has optional context_triggers', () => {
      expect(src).toMatch(/context_triggers\?:\s*SkillContextTrigger/)
    })

    it('CatalogSkill interface has optional context_triggers', () => {
      const catalogBlock = src.slice(src.indexOf('export interface CatalogSkill'))
      expect(catalogBlock).toContain('context_triggers')
    })

    it('SKILLS_VERSION is bumped to 5', () => {
      expect(src).toMatch(/SKILLS_VERSION\s*=\s*5/)
    })

    it('KAN-293 referenced in header', () => {
      expect(src).toContain('KAN-293')
    })
  })

  // ─── 2. skill-processor.ts — Context evaluation ───────────────────────

  describe('skill-processor.ts — evaluateContextTriggers', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-processor.ts') })

    it('KAN-293 referenced in header', () => {
      expect(src).toContain('KAN-293')
    })

    it('imports SkillContextTrigger type', () => {
      expect(src).toContain('SkillContextTrigger')
    })

    it('imports SkillContext type', () => {
      expect(src).toContain('SkillContext')
    })

    it('exports evaluateContextTriggers function', () => {
      expect(src).toContain('export function evaluateContextTriggers')
    })

    it('evaluateContextTriggers accepts triggers and context params', () => {
      expect(src).toContain('evaluateContextTriggers(')
      expect(src).toContain('triggers:')
      expect(src).toContain('context:')
    })

    it('returns null when no triggers or no context', () => {
      expect(src).toMatch(/if\s*\(\s*!triggers\s*\|\|\s*!context\s*\)\s*return\s*null/)
    })

    it('matches project_types against projectType (case-insensitive)', () => {
      expect(src).toMatch(/project_types[\s\S]*?projectType[\s\S]*?toLowerCase/)
    })

    it('matches file_patterns against workspaceFiles', () => {
      expect(src).toMatch(/file_patterns[\s\S]*?workspaceFiles/)
    })

    it('matches keywords against userMessage (case-insensitive)', () => {
      expect(src).toMatch(/keywords[\s\S]*?userMessage[\s\S]*?toLowerCase/)
    })

    it('returns descriptive match reason', () => {
      expect(src).toMatch(/project type matches/)
      expect(src).toMatch(/workspace contains/)
      expect(src).toMatch(/message contains/)
    })
  })

  describe('skill-processor.ts — processSkills with context', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-processor.ts') })

    it('processSkills options include context parameter', () => {
      expect(src).toMatch(/context\?:\s*SkillContext/)
    })

    it('on_demand case calls evaluateContextTriggers', () => {
      const onDemandBlock = src.slice(src.indexOf("case 'on_demand'"))
      expect(onDemandBlock).toContain('evaluateContextTriggers')
    })

    it('on_demand skill applied when context trigger matches', () => {
      const onDemandBlock = src.slice(src.indexOf("case 'on_demand'"))
      expect(onDemandBlock).toMatch(/triggerMatch[\s\S]*?entry\.applied\s*=\s*true/)
    })

    it('on_demand skill reason includes context match info', () => {
      const onDemandBlock = src.slice(src.indexOf("case 'on_demand'"))
      expect(onDemandBlock).toContain('context:')
    })

    it('on_demand skill falls back to includeOnDemand flag', () => {
      const onDemandBlock = src.slice(src.indexOf("case 'on_demand'"))
      expect(onDemandBlock).toContain('includeOnDemand')
    })

    it('on_demand skip reason mentions no context match', () => {
      const onDemandBlock = src.slice(src.indexOf("case 'on_demand'"))
      expect(onDemandBlock).toContain('no context match')
    })
  })

  // ─── 3. skill-catalog.ts — Context triggers on catalog skills ─────────

  describe('skill-catalog.ts — Context triggers', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-catalog.ts') })

    it('KAN-293 referenced in header', () => {
      expect(src).toContain('KAN-293')
    })

    it('Architecture Assistant has context_triggers with keywords', () => {
      const block = src.slice(src.indexOf('marketplace_architecture_assistant'))
      const nextSkill = block.indexOf('catalog_id:', 10)
      const skillBlock = block.slice(0, nextSkill > 0 ? nextSkill : 500)
      expect(skillBlock).toContain('context_triggers')
      expect(skillBlock).toContain('keywords')
      expect(skillBlock).toContain('architecture')
    })

    it('Architecture Assistant uses on_demand execution mode', () => {
      const block = src.slice(src.indexOf('marketplace_architecture_assistant'))
      const nextSkill = block.indexOf('catalog_id:', 10)
      const skillBlock = block.slice(0, nextSkill > 0 ? nextSkill : 500)
      expect(skillBlock).toContain("'on_demand'")
    })

    it('SQL Optimizer has context_triggers', () => {
      const block = src.slice(src.indexOf('marketplace_sql_optimizer'))
      const nextSkill = block.indexOf('catalog_id:', 10)
      const skillBlock = block.slice(0, nextSkill > 0 ? nextSkill : 500)
      expect(skillBlock).toContain('context_triggers')
      expect(skillBlock).toContain('sql')
    })

    it('SQL Optimizer has file_patterns trigger', () => {
      const block = src.slice(src.indexOf('marketplace_sql_optimizer'))
      const nextSkill = block.indexOf('catalog_id:', 10)
      const skillBlock = block.slice(0, nextSkill > 0 ? nextSkill : 500)
      expect(skillBlock).toContain('file_patterns')
    })

    it('AWS Deployment Helper has context_triggers with file_patterns and project_types', () => {
      const block = src.slice(src.indexOf('marketplace_aws_deployment'))
      const nextSkill = block.indexOf('catalog_id:', 10)
      const skillBlock = block.slice(0, nextSkill > 0 ? nextSkill : 600)
      expect(skillBlock).toContain('context_triggers')
      expect(skillBlock).toContain('file_patterns')
      expect(skillBlock).toContain('Dockerfile')
      expect(skillBlock).toContain('project_types')
    })

    it('React Best Practices has context_triggers with project_types', () => {
      const block = src.slice(src.indexOf('marketplace_react_best_practices'))
      const nextSkill = block.indexOf('catalog_id:', 10)
      const skillBlock = block.slice(0, nextSkill > 0 ? nextSkill : 500)
      expect(skillBlock).toContain('context_triggers')
      expect(skillBlock).toContain('project_types')
      expect(skillBlock).toContain('react')
    })

    it('React Best Practices uses on_demand execution mode', () => {
      const block = src.slice(src.indexOf('marketplace_react_best_practices'))
      const nextSkill = block.indexOf('catalog_id:', 10)
      const skillBlock = block.slice(0, nextSkill > 0 ? nextSkill : 500)
      expect(skillBlock).toContain("'on_demand'")
    })
  })

  // ─── 4. App.tsx — Context-aware skill filtering ───────────────────────

  describe('App.tsx — Context-aware filtering', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/App.tsx') })

    it('references KAN-293 in comments', () => {
      expect(src).toContain('KAN-293')
    })

    it('skills state includes context_triggers type', () => {
      expect(src).toMatch(/context_triggers\?/)
    })

    it('evaluates on_demand skills with context_triggers', () => {
      expect(src).toMatch(/on_demand.*context_triggers|context_triggers.*on_demand/)
    })

    it('matches project types from detectProjectType', () => {
      expect(src).toMatch(/detectedType.*toLowerCase|project type matches/)
    })

    it('matches keywords against user message', () => {
      expect(src).toMatch(/triggers\.keywords.*userMessage/)
    })

    it('logs context match reason in execution entry', () => {
      expect(src).toContain('context:')
    })

    it('adds context-matched on_demand skills to autoSkills', () => {
      expect(src).toMatch(/matched[\s\S]*?autoSkills\.push/)
    })
  })

  // ─── 5. SkillsPanel — Context trigger UI ──────────────────────────────

  describe('SkillsPanel.tsx — Context trigger UI', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/SkillsPanel.tsx') })

    it('local Skill interface has context_triggers', () => {
      const skillBlock = src.slice(src.indexOf('interface Skill'), src.indexOf('interface CatalogSkill'))
      expect(skillBlock).toContain('context_triggers')
    })

    it('local CatalogSkill interface has context_triggers', () => {
      const catalogBlock = src.slice(src.indexOf('interface CatalogSkill'))
      expect(catalogBlock).toContain('context_triggers')
    })

    it('has context trigger state variables', () => {
      expect(src).toContain('newContextProjectTypes')
      expect(src).toContain('newContextFilePatterns')
      expect(src).toContain('newContextKeywords')
    })

    it('has buildContextTriggers helper function', () => {
      expect(src).toContain('buildContextTriggers')
    })

    it('startEdit populates context trigger state from skill', () => {
      const startEditBlock = src.slice(src.indexOf('const startEdit'))
      const body = startEditBlock.slice(0, 800)
      expect(body).toContain('context_triggers')
      expect(body).toContain('setNewContextProjectTypes')
    })

    it('startCreate resets context trigger state', () => {
      expect(src).toMatch(/setNewContextProjectTypes\(\s*['"]['"]/)
    })

    it('shows context trigger fields when execution_mode is on_demand', () => {
      expect(src).toContain("newExecutionMode === 'on_demand'")
    })

    it('renders Project Types input', () => {
      expect(src).toContain('Project Types')
    })

    it('renders File Patterns input', () => {
      expect(src).toContain('File Patterns')
    })

    it('renders Keywords input', () => {
      expect(src).toContain('Keywords')
    })

    it('displays Context Triggers section in skill detail', () => {
      expect(src).toContain('Context Triggers')
    })

    it('shows project type badges in detail view', () => {
      expect(src).toMatch(/context_triggers\.project_types\.map/)
    })

    it('shows file pattern badges in detail view', () => {
      expect(src).toMatch(/context_triggers\.file_patterns\.map/)
    })

    it('shows keyword badges in detail view', () => {
      expect(src).toMatch(/context_triggers\.keywords\.map/)
    })

    it('on_demand option label mentions context', () => {
      expect(src).toContain('Context-aware')
    })

    it('handleCreate passes context_triggers', () => {
      expect(src).toMatch(/context_triggers:\s*buildContextTriggers/)
    })

    it('handleUpdate passes context_triggers', () => {
      const updateBlock = src.slice(src.indexOf('handleUpdate'))
      expect(updateBlock).toContain('buildContextTriggers')
    })
  })

  // ─── 6. skills-manager.ts — context_triggers support ──────────────────

  describe('skills-manager.ts — context_triggers', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-manager.ts') })

    it('createSkill accepts context_triggers parameter', () => {
      const createBlock = src.slice(src.indexOf('createSkill('))
      const body = createBlock.slice(0, 800)
      expect(body).toContain('context_triggers')
    })

    it('createSkill stores context_triggers on skill', () => {
      expect(src).toMatch(/context_triggers:\s*params\.context_triggers/)
    })

    it('updateSkill signature includes context_triggers', () => {
      const updateBlock = src.slice(src.indexOf('updateSkill('))
      const body = updateBlock.slice(0, 300)
      expect(body).toContain('context_triggers')
    })

    it('updateSkill applies context_triggers changes', () => {
      expect(src).toContain('updates.context_triggers')
    })

    it('installFromCatalog copies context_triggers', () => {
      const installBlock = src.slice(src.indexOf('installFromCatalog'))
      const body = installBlock.slice(0, 1200)
      expect(body).toContain('context_triggers')
    })
  })

  // ─── 7. Regression Guards ─────────────────────────────────────────────

  describe('Regression guards', () => {
    it('types.ts still exports Skill interface', () => {
      expect(readFile('src/skills/types.ts')).toContain('export interface Skill')
    })

    it('types.ts still has SkillExecutionMode', () => {
      expect(readFile('src/skills/types.ts')).toContain('SkillExecutionMode')
    })

    it('types.ts still has SkillsApiSettings', () => {
      expect(readFile('src/skills/types.ts')).toContain('SkillsApiSettings')
    })

    it('processSkills still supports manualTriggerIds', () => {
      expect(readFile('src/skills/skill-processor.ts')).toContain('manualTriggerIds')
    })

    it('processSkills still supports includeOnDemand flag', () => {
      expect(readFile('src/skills/skill-processor.ts')).toContain('includeOnDemand')
    })

    it('processSkills still handles always mode', () => {
      expect(readFile('src/skills/skill-processor.ts')).toContain("case 'always'")
    })

    it('processSkills still handles manual mode', () => {
      expect(readFile('src/skills/skill-processor.ts')).toContain("case 'manual'")
    })

    it('detectConflicts still works', () => {
      expect(readFile('src/skills/skill-processor.ts')).toContain('export function detectConflicts')
    })

    it('formatExecutionLog still works', () => {
      expect(readFile('src/skills/skill-processor.ts')).toContain('export function formatExecutionLog')
    })

    it('SKILL_CATALOG still has 8 skills', () => {
      const src = readFile('src/skills/skill-catalog.ts')
      const matches = src.match(/catalog_id:/g)
      expect(matches!.length).toBe(8)
    })

    it('static getCatalog still works', () => {
      expect(readFile('src/skills/skill-catalog.ts')).toContain('export function getCatalog()')
    })

    it('IPC still registers core skills channels', () => {
      const src = readFile('electron/ipc/skills.ts')
      expect(src).toContain("'skills:getAll'")
      expect(src).toContain("'skills:create'")
    })

    it('SkillsPanel still has all tabs', () => {
      const src = readFile('renderer/src/components/SkillsPanel.tsx')
      expect(src).toContain("'skills'")
      expect(src).toContain("'marketplace'")
      expect(src).toContain("'activity'")
      expect(src).toContain("'audit'")
    })
  })
})

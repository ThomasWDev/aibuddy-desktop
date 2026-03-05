import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-285: Implement Skill Creation Interface
//
// Root cause: Skill type missing visibility (private/team) and execution_mode
// fields required by the ticket. Creation form doesn't expose these options.
//
// Fix: Add visibility + execution_mode to Skill type, SkillsStorageManager,
// IPC, preload, and SkillsPanel creation/edit forms.
// ---------------------------------------------------------------------------

const TYPES_PATH = path.join(__dirname, '../../src/skills/types.ts')
const MANAGER_PATH = path.join(__dirname, '../../src/skills/skills-manager.ts')
const IPC_PATH = path.join(__dirname, '../../electron/ipc/skills.ts')
const PRELOAD_PATH = path.join(__dirname, '../../electron/preload.ts')
const SKILLS_PANEL_PATH = path.join(__dirname, '../../renderer/src/components/SkillsPanel.tsx')

describe('KAN-285: Skill Creation Interface', () => {

  // ==========================================================================
  // 1. Skill type must include visibility and execution_mode
  // ==========================================================================
  describe('Skill type (types.ts)', () => {
    const typesSource = fs.readFileSync(TYPES_PATH, 'utf-8')

    it('must export SkillVisibility type', () => {
      expect(typesSource).toMatch(/export\s+type\s+SkillVisibility/)
    })

    it('SkillVisibility must include private and team', () => {
      expect(typesSource).toMatch(/private.*team|team.*private/)
    })

    it('must export SkillExecutionMode type', () => {
      expect(typesSource).toMatch(/export\s+type\s+SkillExecutionMode/)
    })

    it('Skill interface must have visibility field', () => {
      expect(typesSource).toMatch(/visibility\s*[\?:]/)
    })

    it('Skill interface must have execution_mode field', () => {
      expect(typesSource).toMatch(/execution_mode\s*[\?:]/)
    })
  })

  // ==========================================================================
  // 2. SkillsStorageManager handles new fields
  // ==========================================================================
  describe('SkillsStorageManager (skills-manager.ts)', () => {
    const managerSource = fs.readFileSync(MANAGER_PATH, 'utf-8')

    it('createSkill must accept visibility param', () => {
      expect(managerSource).toMatch(/visibility/)
    })

    it('createSkill must accept execution_mode param', () => {
      expect(managerSource).toMatch(/execution_mode/)
    })

    it('updateSkill must handle visibility in updates', () => {
      const updateBlock = managerSource.slice(
        managerSource.indexOf('updateSkill'),
        managerSource.indexOf('updateSkill') + 600
      )
      expect(updateBlock).toMatch(/visibility/)
    })

    it('updateSkill must handle execution_mode in updates', () => {
      const updateBlock = managerSource.slice(
        managerSource.indexOf('updateSkill'),
        managerSource.indexOf('updateSkill') + 600
      )
      expect(updateBlock).toMatch(/execution_mode/)
    })
  })

  // ==========================================================================
  // 3. IPC layer passes new fields
  // ==========================================================================
  describe('IPC layer (skills.ts)', () => {
    const ipcSource = fs.readFileSync(IPC_PATH, 'utf-8')

    it('skills:create handler must accept visibility', () => {
      expect(ipcSource).toMatch(/visibility/)
    })

    it('skills:create handler must accept execution_mode', () => {
      expect(ipcSource).toMatch(/execution_mode/)
    })
  })

  // ==========================================================================
  // 4. Preload exposes new fields
  // ==========================================================================
  describe('Preload (preload.ts)', () => {
    const preloadSource = fs.readFileSync(PRELOAD_PATH, 'utf-8')

    it('skills type must include visibility', () => {
      expect(preloadSource).toMatch(/visibility/)
    })

    it('skills type must include execution_mode', () => {
      expect(preloadSource).toMatch(/execution_mode/)
    })
  })

  // ==========================================================================
  // 5. SkillsPanel creation form has all required fields
  // ==========================================================================
  describe('SkillsPanel creation form', () => {
    let panelSource = ''
    try { panelSource = fs.readFileSync(SKILLS_PANEL_PATH, 'utf-8') } catch {}

    it('must have Skill Name input', () => {
      expect(panelSource).toMatch(/[Nn]ame/)
    })

    it('must have Description input', () => {
      expect(panelSource).toMatch(/[Dd]escription/)
    })

    it('must have Prompt Instructions / template editor', () => {
      expect(panelSource).toMatch(/prompt_template|[Pp]rompt.*[Ii]nstruction|[Pp]rompt.*[Tt]emplate/)
    })

    it('must have Visibility selector (private/team)', () => {
      expect(panelSource).toMatch(/visibility|[Vv]isibility/)
    })

    it('must have Execution Mode selector', () => {
      expect(panelSource).toMatch(/execution_mode|[Ee]xecution.*[Mm]ode|executionMode/)
    })

    it('must call skills.create on form submit', () => {
      expect(panelSource).toMatch(/skills\?\.create/)
    })

    it('creation form must pass visibility to create call', () => {
      const createBlock = panelSource.slice(
        panelSource.indexOf('skills?.create'),
        panelSource.indexOf('skills?.create') + 400
      )
      expect(createBlock).toMatch(/visibility/)
    })

    it('creation form must pass execution_mode to create call', () => {
      const createBlock = panelSource.slice(
        panelSource.indexOf('skills?.create'),
        panelSource.indexOf('skills?.create') + 400
      )
      expect(createBlock).toMatch(/execution_mode/)
    })
  })

  // ==========================================================================
  // 6. SkillsPanel details panel shows new fields
  // ==========================================================================
  describe('SkillsPanel details display', () => {
    let panelSource = ''
    try { panelSource = fs.readFileSync(SKILLS_PANEL_PATH, 'utf-8') } catch {}

    it('must display visibility in skill details', () => {
      expect(panelSource).toMatch(/selectedSkill.*visibility|visibility.*selectedSkill/)
    })

    it('must display execution_mode in skill details', () => {
      expect(panelSource).toMatch(/selectedSkill.*execution_mode|execution_mode.*selectedSkill|executionMode/)
    })
  })

  // ==========================================================================
  // 7. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    const typesSource = fs.readFileSync(TYPES_PATH, 'utf-8')
    const managerSource = fs.readFileSync(MANAGER_PATH, 'utf-8')

    it('Skill type must still have all original fields', () => {
      expect(typesSource).toMatch(/id:\s*string/)
      expect(typesSource).toMatch(/name:\s*string/)
      expect(typesSource).toMatch(/prompt_template:\s*string/)
      expect(typesSource).toMatch(/enabled:\s*boolean/)
      expect(typesSource).toMatch(/scope:\s*SkillScope/)
    })

    it('SkillsStorageManager must still have full CRUD', () => {
      expect(managerSource).toMatch(/createSkill/)
      expect(managerSource).toMatch(/updateSkill/)
      expect(managerSource).toMatch(/deleteSkill/)
      expect(managerSource).toMatch(/toggleSkill/)
    })
  })
})

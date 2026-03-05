import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-284: Create Skills Management Panel
//
// Root cause: SkillsPanel (KAN-281) used old ProjectRuleDTO and workspace
// IPC. SkillsStorageManager (KAN-282) had no IPC handlers. No bridge
// between new data model and UI. No skills sidebar, details panel, or
// proper enable/disable toggle.
//
// Fix: Create skills IPC layer (electron/ipc/skills.ts), register in
// main.ts, expose in preload.ts, rewrite SkillsPanel to use Skill type
// and new IPC, add sidebar + details panel layout.
// ---------------------------------------------------------------------------

const SKILLS_IPC_PATH = path.join(__dirname, '../../electron/ipc/skills.ts')
const MAIN_PATH = path.join(__dirname, '../../electron/main.ts')
const PRELOAD_PATH = path.join(__dirname, '../../electron/preload.ts')
const SKILLS_PANEL_PATH = path.join(__dirname, '../../renderer/src/components/SkillsPanel.tsx')
const APP_PATH = path.join(__dirname, '../../renderer/src/App.tsx')

describe('KAN-284: Skills Management Panel', () => {

  // ==========================================================================
  // 1. Skills IPC Layer (electron/ipc/skills.ts)
  // ==========================================================================
  describe('Skills IPC layer', () => {
    it('must exist', () => {
      expect(fs.existsSync(SKILLS_IPC_PATH)).toBe(true)
    })

    let ipcSource = ''
    try { ipcSource = fs.readFileSync(SKILLS_IPC_PATH, 'utf-8') } catch {}

    it('must export initSkillsHandlers', () => {
      expect(ipcSource).toMatch(/export\s+function\s+initSkillsHandlers/)
    })

    it('must import SkillsStorageManager', () => {
      expect(ipcSource).toMatch(/import.*SkillsStorageManager/)
    })

    it('must register skills:getAll handler', () => {
      expect(ipcSource).toContain('skills:getAll')
    })

    it('must register skills:getActive handler', () => {
      expect(ipcSource).toContain('skills:getActive')
    })

    it('must register skills:create handler', () => {
      expect(ipcSource).toContain('skills:create')
    })

    it('must register skills:update handler', () => {
      expect(ipcSource).toContain('skills:update')
    })

    it('must register skills:delete handler', () => {
      expect(ipcSource).toContain('skills:delete')
    })

    it('must register skills:toggle handler', () => {
      expect(ipcSource).toContain('skills:toggle')
    })

    it('must register skills:migrateLegacy handler', () => {
      expect(ipcSource).toContain('skills:migrateLegacy')
    })
  })

  // ==========================================================================
  // 2. main.ts registers skills handlers
  // ==========================================================================
  describe('main.ts integration', () => {
    const mainSource = fs.readFileSync(MAIN_PATH, 'utf-8')

    it('must import initSkillsHandlers', () => {
      expect(mainSource).toMatch(/import.*initSkillsHandlers/)
    })

    it('must call initSkillsHandlers', () => {
      expect(mainSource).toMatch(/initSkillsHandlers\(\)/)
    })
  })

  // ==========================================================================
  // 3. preload.ts exposes skills API
  // ==========================================================================
  describe('preload.ts skills API', () => {
    const preloadSource = fs.readFileSync(PRELOAD_PATH, 'utf-8')

    it('must have skills.getAll method', () => {
      expect(preloadSource).toMatch(/skills:getAll/)
    })

    it('must have skills.create method', () => {
      expect(preloadSource).toMatch(/skills:create/)
    })

    it('must have skills.update method', () => {
      expect(preloadSource).toMatch(/skills:update/)
    })

    it('must have skills.delete method', () => {
      expect(preloadSource).toMatch(/skills:delete/)
    })

    it('must have skills.toggle method', () => {
      expect(preloadSource).toMatch(/skills:toggle/)
    })
  })

  // ==========================================================================
  // 4. SkillsPanel uses new Skill type and IPC
  // ==========================================================================
  describe('SkillsPanel upgraded', () => {
    let panelSource = ''
    try { panelSource = fs.readFileSync(SKILLS_PANEL_PATH, 'utf-8') } catch {}

    it('must accept skills prop (not projectRules)', () => {
      expect(panelSource).toMatch(/skills:\s*Skill\[\]/)
    })

    it('must accept onSkillsChanged callback', () => {
      expect(panelSource).toMatch(/onSkillsChanged/)
    })

    it('must use electronAPI.skills.create for creating', () => {
      expect(panelSource).toMatch(/skills\?\.create/)
    })

    it('must use electronAPI.skills.update for editing', () => {
      expect(panelSource).toMatch(/skills\?\.update/)
    })

    it('must use electronAPI.skills.delete for deleting', () => {
      expect(panelSource).toMatch(/skills\?\.delete/)
    })

    it('must use electronAPI.skills.toggle for toggling', () => {
      expect(panelSource).toMatch(/skills\?\.toggle/)
    })

    it('must have a Skill Details Panel section', () => {
      expect(panelSource).toMatch(/[Dd]etails|selectedSkill/)
    })

    it('must have a Skills Sidebar/List section', () => {
      expect(panelSource).toMatch(/[Ss]idebar|[Ss]kills.*[Ll]ist|builtinSkills.*map|userSkills.*map/)
    })

    it('must display skill description', () => {
      expect(panelSource).toMatch(/description/)
    })

    it('must support scope selection (global/project)', () => {
      expect(panelSource).toMatch(/scope/)
    })

    it('must show prompt_template content', () => {
      expect(panelSource).toMatch(/prompt_template/)
    })

    it('must show metadata (created_at, updated_at)', () => {
      expect(panelSource).toMatch(/created_at|updated_at/)
    })
  })

  // ==========================================================================
  // 5. App.tsx uses new skills IPC
  // ==========================================================================
  describe('App.tsx integration', () => {
    const appSource = fs.readFileSync(APP_PATH, 'utf-8')

    it('must have skills state (not projectRules)', () => {
      expect(appSource).toMatch(/const \[skills, setSkills\]/)
    })

    it('must load skills via electronAPI.skills.getAll', () => {
      expect(appSource).toMatch(/skills\?\.getAll/)
    })

    it('must call migrateLegacy on workspace open', () => {
      expect(appSource).toMatch(/skills\?\.migrateLegacy/)
    })

    it('must pass skills prop to SkillsPanel', () => {
      expect(appSource).toMatch(/skills=\{skills\}/)
    })

    it('must pass onSkillsChanged to SkillsPanel', () => {
      expect(appSource).toMatch(/onSkillsChanged/)
    })

    it('must convert skills to projectRules format for generateSystemPrompt', () => {
      expect(appSource).toMatch(/skills\.map/)
    })
  })

  // ==========================================================================
  // 6. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    const appSource = fs.readFileSync(APP_PATH, 'utf-8')

    it('App.tsx must still have generateSystemPrompt', () => {
      expect(appSource).toContain('generateSystemPrompt')
    })

    it('App.tsx must still have showSkillsPanel state', () => {
      expect(appSource).toContain('showSkillsPanel')
    })

    it('App.tsx must still have settings modal', () => {
      expect(appSource).toContain('showSettings')
    })

    it('SkillsPanel must still have onClose', () => {
      const panelSource = fs.readFileSync(SKILLS_PANEL_PATH, 'utf-8')
      expect(panelSource).toContain('onClose')
    })
  })
})

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-281: [Mac] Implement Claude-Style "Skills" System for AIBuddy
//
// Root cause: .aibuddy/rules/ infrastructure + prompt injection (KAN-283)
// exist, but there is zero UI for users to create, view, edit, delete, or
// toggle skills. saveProjectRule and deleteProjectRule are exposed via IPC
// but never called from the renderer.
//
// Fix: Create SkillsPanel component with full CRUD + toggle, wire into
// App.tsx via "More Actions" menu and a showSkillsPanel state.
// ---------------------------------------------------------------------------

const SKILLS_PANEL_PATH = path.join(__dirname, '../../renderer/src/components/SkillsPanel.tsx')
const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

describe('KAN-281: Claude-Style Skills UI', () => {

  // ==========================================================================
  // 1. SkillsPanel component must exist
  // ==========================================================================
  describe('SkillsPanel component', () => {
    it('must exist as a file', () => {
      expect(fs.existsSync(SKILLS_PANEL_PATH)).toBe(true)
    })

    let panelSource = ''
    try { panelSource = fs.readFileSync(SKILLS_PANEL_PATH, 'utf-8') } catch {}

    it('must export SkillsPanel', () => {
      expect(panelSource).toMatch(/export\s+(function|const)\s+SkillsPanel/)
    })

    it('must accept projectRules as a prop', () => {
      expect(panelSource).toMatch(/projectRules/)
    })

    it('must accept workspacePath as a prop', () => {
      expect(panelSource).toMatch(/workspacePath/)
    })

    it('must accept onClose callback', () => {
      expect(panelSource).toMatch(/onClose/)
    })

    it('must accept onRulesChanged callback for re-loading rules', () => {
      expect(panelSource).toMatch(/onRulesChanged/)
    })
  })

  // ==========================================================================
  // 2. SkillsPanel must display rules
  // ==========================================================================
  describe('SkillsPanel displays rules', () => {
    let panelSource = ''
    try { panelSource = fs.readFileSync(SKILLS_PANEL_PATH, 'utf-8') } catch {}

    it('must render each rule filename or description', () => {
      expect(panelSource).toMatch(/description|filename/)
    })

    it('must visually distinguish built-in rules from user rules', () => {
      expect(panelSource).toMatch(/builtin/)
    })

    it('must show active/inactive status for each rule', () => {
      expect(panelSource).toMatch(/alwaysApply/)
    })
  })

  // ==========================================================================
  // 3. SkillsPanel must support CRUD operations
  // ==========================================================================
  describe('SkillsPanel CRUD', () => {
    let panelSource = ''
    try { panelSource = fs.readFileSync(SKILLS_PANEL_PATH, 'utf-8') } catch {}

    it('must have a "Create" / "New Skill" action', () => {
      expect(panelSource).toMatch(/[Cc]reate|[Nn]ew\s*[Ss]kill|[Aa]dd\s*[Ss]kill/)
    })

    it('must call saveProjectRule for saving skills', () => {
      expect(panelSource).toMatch(/saveProjectRule/)
    })

    it('must call deleteProjectRule for deleting skills', () => {
      expect(panelSource).toMatch(/deleteProjectRule/)
    })

    it('must have an edit mode or editor for rule content', () => {
      expect(panelSource).toMatch(/textarea|contentEditable|editor|editContent|editingRule/)
    })

    it('must prevent deletion of built-in rules', () => {
      expect(panelSource).toMatch(/builtin.*delete|delete.*builtin|!.*builtin/)
    })
  })

  // ==========================================================================
  // 4. SkillsPanel supports toggling alwaysApply
  // ==========================================================================
  describe('SkillsPanel toggle', () => {
    let panelSource = ''
    try { panelSource = fs.readFileSync(SKILLS_PANEL_PATH, 'utf-8') } catch {}

    it('must allow toggling alwaysApply for user rules', () => {
      expect(panelSource).toMatch(/alwaysApply/)
    })

    it('must save toggled state via saveProjectRule', () => {
      expect(panelSource).toMatch(/saveProjectRule/)
    })
  })

  // ==========================================================================
  // 5. App.tsx wires in SkillsPanel
  // ==========================================================================
  describe('App.tsx integration', () => {
    it('must import SkillsPanel', () => {
      expect(APP_SOURCE).toMatch(/import.*SkillsPanel/)
    })

    it('must have showSkillsPanel state', () => {
      expect(APP_SOURCE).toMatch(/showSkillsPanel/)
    })

    it('must render SkillsPanel conditionally', () => {
      expect(APP_SOURCE).toMatch(/showSkillsPanel.*&&.*<SkillsPanel|<SkillsPanel/)
    })

    it('must have a Skills button or menu item', () => {
      expect(APP_SOURCE).toMatch(/[Ss]kills/)
    })

    it('must pass projectRules and workspacePath to SkillsPanel', () => {
      expect(APP_SOURCE).toMatch(/projectRules=\{/)
    })
  })

  // ==========================================================================
  // 6. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('App.tsx must still have settings modal', () => {
      expect(APP_SOURCE).toContain('showSettings')
    })

    it('App.tsx must still generate system prompt', () => {
      expect(APP_SOURCE).toContain('generateSystemPrompt')
    })

    it('App.tsx must still pass projectRules to generateSystemPrompt', () => {
      expect(APP_SOURCE).toMatch(/projectRules.*generateSystemPrompt|generateSystemPrompt[\s\S]*projectRules/)
    })
  })
})

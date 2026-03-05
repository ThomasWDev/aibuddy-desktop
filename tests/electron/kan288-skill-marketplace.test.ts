/**
 * KAN-288: Implement Skill Marketplace — Source-level TDD tests
 *
 * Validates:
 * 1. CatalogSkill interface and SkillSource type in types.ts
 * 2. Skill catalog module with curated prebuilt skills
 * 3. installFromCatalog + isInstalled in SkillsStorageManager
 * 4. IPC handlers for getCatalog, install, getInstalledCatalogIds
 * 5. Preload exposes marketplace methods
 * 6. SkillsPanel marketplace tab with browse + install
 * 7. Skill type has source and catalog_id fields
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

describe('KAN-288: Skill Marketplace', () => {
  // ─── 1. Types ────────────────────────────────────────────────────────────

  describe('Skill types (src/skills/types.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/types.ts') })

    test('exports SkillSource type', () => {
      expect(src).toMatch(/export\s+type\s+SkillSource/)
    })

    test('SkillSource includes local, marketplace, builtin', () => {
      expect(src).toMatch(/['"]local['"]/)
      expect(src).toMatch(/['"]marketplace['"]/)
      expect(src).toMatch(/['"]builtin['"]/)
    })

    test('Skill interface has source field', () => {
      expect(src).toMatch(/source\??\s*:\s*SkillSource/)
    })

    test('Skill interface has catalog_id field', () => {
      expect(src).toMatch(/catalog_id\??\s*:\s*string/)
    })

    test('exports CatalogSkill interface', () => {
      expect(src).toMatch(/export\s+interface\s+CatalogSkill/)
    })

    test('CatalogSkill has catalog_id', () => {
      expect(src).toMatch(/CatalogSkill[\s\S]*?catalog_id:\s*string/m)
    })

    test('CatalogSkill has author', () => {
      expect(src).toMatch(/CatalogSkill[\s\S]*?author:\s*string/m)
    })

    test('CatalogSkill has category', () => {
      expect(src).toMatch(/CatalogSkill[\s\S]*?category:\s*string/m)
    })

    test('CatalogSkill has icon', () => {
      expect(src).toMatch(/CatalogSkill[\s\S]*?icon:\s*string/m)
    })
  })

  // ─── 2. Skill Catalog ───────────────────────────────────────────────────

  describe('Skill Catalog (src/skills/skill-catalog.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-catalog.ts') })

    test('file exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'src/skills/skill-catalog.ts'))).toBe(true)
    })

    test('exports SKILL_CATALOG array', () => {
      expect(src).toMatch(/export\s+const\s+SKILL_CATALOG/)
    })

    test('exports getCatalog function', () => {
      expect(src).toMatch(/export\s+function\s+getCatalog/)
    })

    test('exports getCatalogSkill function', () => {
      expect(src).toMatch(/export\s+function\s+getCatalogSkill/)
    })

    test('exports getCatalogCategories function', () => {
      expect(src).toMatch(/export\s+function\s+getCatalogCategories/)
    })

    test('contains Developer Prompt Refiner', () => {
      expect(src).toMatch(/Developer Prompt Refiner/)
    })

    test('contains Architecture Assistant', () => {
      expect(src).toMatch(/Architecture Assistant/)
    })

    test('contains SQL Optimizer', () => {
      expect(src).toMatch(/SQL Optimizer/)
    })

    test('contains AWS Deployment Helper', () => {
      expect(src).toMatch(/AWS Deployment Helper/)
    })

    test('each catalog skill has catalog_id', () => {
      expect(src).toMatch(/catalog_id:\s*['"]marketplace_/)
    })

    test('each catalog skill has author', () => {
      expect(src).toMatch(/author:\s*['"]AIBuddy Team['"]/)
    })

    test('each catalog skill has category', () => {
      expect(src).toMatch(/category:/)
    })

    test('each catalog skill has icon', () => {
      expect(src).toMatch(/icon:/)
    })

    test('catalog has at least 5 skills', () => {
      const matches = src.match(/catalog_id:/g)
      expect(matches).not.toBeNull()
      expect(matches!.length).toBeGreaterThanOrEqual(5)
    })
  })

  // ─── 3. SkillsStorageManager marketplace methods ─────────────────────────

  describe('SkillsStorageManager marketplace (src/skills/skills-manager.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-manager.ts') })

    test('has installFromCatalog method', () => {
      expect(src).toMatch(/installFromCatalog/)
    })

    test('installFromCatalog accepts CatalogSkill parameter', () => {
      expect(src).toMatch(/installFromCatalog\(catalogSkill:\s*CatalogSkill/)
    })

    test('installFromCatalog sets source to marketplace', () => {
      expect(src).toMatch(/source:\s*['"]marketplace['"]/)
    })

    test('installFromCatalog sets catalog_id', () => {
      expect(src).toMatch(/catalog_id:\s*catalogSkill\.catalog_id/)
    })

    test('installFromCatalog prevents duplicate installs', () => {
      expect(src).toMatch(/already installed/i)
    })

    test('has isInstalled method', () => {
      expect(src).toMatch(/isInstalled\(catalogId/)
    })

    test('has getInstalledCatalogIds method', () => {
      expect(src).toMatch(/getInstalledCatalogIds/)
    })

    test('imports CatalogSkill type', () => {
      expect(src).toMatch(/CatalogSkill/)
    })
  })

  // ─── 4. IPC layer ──────────────────────────────────────────────────────

  describe('IPC layer (electron/ipc/skills.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/ipc/skills.ts') })

    test('registers skills:getCatalog handler', () => {
      expect(src).toMatch(/skills:getCatalog/)
    })

    test('registers skills:install handler', () => {
      expect(src).toMatch(/skills:install/)
    })

    test('registers skills:getInstalledCatalogIds handler', () => {
      expect(src).toMatch(/skills:getInstalledCatalogIds/)
    })

    test('getCatalog handler calls getCatalog from catalog module', () => {
      expect(src).toMatch(/getCatalog\(\)/)
    })

    test('install handler calls installFromCatalog', () => {
      expect(src).toMatch(/installFromCatalog/)
    })

    test('install handler calls getCatalogSkill to resolve catalog_id', () => {
      expect(src).toMatch(/getCatalogSkill/)
    })

    test('imports getCatalog from skill-catalog', () => {
      expect(src).toMatch(/import.*getCatalog.*from.*skill-catalog/)
    })

    test('all marketplace channels in ALL_CHANNELS', () => {
      expect(src).toMatch(/ALL_CHANNELS[\s\S]*?skills:getCatalog/)
      expect(src).toMatch(/ALL_CHANNELS[\s\S]*?skills:install/)
      expect(src).toMatch(/ALL_CHANNELS[\s\S]*?skills:getInstalledCatalogIds/)
    })
  })

  // ─── 5. Preload ─────────────────────────────────────────────────────────

  describe('Preload (electron/preload.ts)', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/preload.ts') })

    test('exposes getCatalog method', () => {
      expect(src).toMatch(/getCatalog/)
    })

    test('exposes install method', () => {
      const skillsSection = src.match(/skills:\s*\{[\s\S]*?\n\s{2}\}/m)
      expect(skillsSection).not.toBeNull()
      expect(skillsSection![0]).toContain('install')
    })

    test('exposes getInstalledCatalogIds method', () => {
      expect(src).toMatch(/getInstalledCatalogIds/)
    })

    test('getCatalog invokes skills:getCatalog IPC', () => {
      expect(src).toMatch(/skills:getCatalog/)
    })

    test('install invokes skills:install IPC', () => {
      expect(src).toMatch(/skills:install/)
    })

    test('skill types include source field', () => {
      expect(src).toMatch(/source\??\s*:\s*string/)
    })

    test('skill types include catalog_id field', () => {
      expect(src).toMatch(/catalog_id\??\s*:\s*string/)
    })
  })

  // ─── 6. SkillsPanel marketplace tab ─────────────────────────────────────

  describe('SkillsPanel marketplace UI (renderer/src/components/SkillsPanel.tsx)', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/SkillsPanel.tsx') })

    test('has marketplace tab state', () => {
      expect(src).toMatch(/activeTab/)
      expect(src).toMatch(/marketplace/)
    })

    test('has My Skills tab', () => {
      expect(src).toMatch(/My Skills/)
    })

    test('has Marketplace tab button', () => {
      expect(src).toMatch(/Marketplace/)
    })

    test('loads catalog on marketplace tab', () => {
      expect(src).toMatch(/getCatalog/)
    })

    test('loads installed IDs on marketplace tab', () => {
      expect(src).toMatch(/getInstalledCatalogIds/)
    })

    test('has catalog state', () => {
      expect(src).toMatch(/setCatalog/)
    })

    test('has installedIds state', () => {
      expect(src).toMatch(/setInstalledIds/)
    })

    test('has category filter', () => {
      expect(src).toMatch(/catalogFilter/)
    })

    test('renders catalog skills with icons', () => {
      expect(src).toMatch(/cs\.icon/)
    })

    test('shows Installed badge for installed skills', () => {
      expect(src).toMatch(/Installed/)
    })

    test('has Install Skill button', () => {
      expect(src).toMatch(/Install Skill/)
    })

    test('calls handleInstall on click', () => {
      expect(src).toMatch(/handleInstall/)
    })

    test('shows installing state', () => {
      expect(src).toMatch(/Installing\.\.\./)
    })

    test('displays catalog skill details panel', () => {
      expect(src).toMatch(/selectedCatalogSkill/)
    })

    test('shows author in details', () => {
      expect(src).toMatch(/selectedCatalogSkill\.author/)
    })

    test('shows category in details', () => {
      expect(src).toMatch(/selectedCatalogSkill\.category/)
    })

    test('shows prompt template preview', () => {
      expect(src).toMatch(/Prompt Template.*Preview/i)
    })

    test('has CatalogSkill interface', () => {
      expect(src).toMatch(/interface CatalogSkill/)
    })

    test('marketplace empty state', () => {
      expect(src).toMatch(/Browse the Skill Marketplace/)
    })
  })

  // ─── Regression guards ──────────────────────────────────────────────────

  describe('Regression guards', () => {
    test('SkillsPanel still exports SkillsPanel component', () => {
      const src = readFile('renderer/src/components/SkillsPanel.tsx')
      expect(src).toMatch(/export\s+function\s+SkillsPanel/)
    })

    test('skills IPC still has core CRUD channels', () => {
      const src = readFile('electron/ipc/skills.ts')
      expect(src).toMatch(/skills:getAll/)
      expect(src).toMatch(/skills:create/)
      expect(src).toMatch(/skills:update/)
      expect(src).toMatch(/skills:delete/)
      expect(src).toMatch(/skills:toggle/)
      expect(src).toMatch(/skills:reorder/)
    })

    test('Skill type still has core fields', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/enabled:\s*boolean/)
      expect(src).toMatch(/execution_mode/)
      expect(src).toMatch(/tags\?/)
      expect(src).toMatch(/order\?/)
    })

    test('detectConflicts still exported from skill-processor', () => {
      const src = readFile('src/skills/skill-processor.ts')
      expect(src).toMatch(/export\s+function\s+detectConflicts/)
    })

    test('SkillsStorageManager still has createSkill', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toMatch(/createSkill/)
    })
  })
})

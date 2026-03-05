/**
 * KAN-291: Implement Skill Execution Logs — Source-level TDD tests
 *
 * Validates:
 * 1. Types: SkillExecutionEntry, SkillExecutionRecord, SkillsState.executionHistory
 * 2. SkillsStorageManager: addExecutionRecord, getExecutionHistory, clearExecutionHistory
 * 3. IPC handlers: skills:addExecutionRecord, skills:getExecutionHistory, skills:clearExecutionHistory
 * 4. Preload: exposes addExecutionRecord, getExecutionHistory, clearExecutionHistory
 * 5. App.tsx: records execution entries per prompt
 * 6. SkillsPanel: Activity tab with debug mode toggle
 * 7. Regression guards
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

describe('KAN-291: Skill Execution Logs', () => {
  // ─── 1. Types ────────────────────────────────────────────────────────────

  describe('types.ts — Execution Log types', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/types.ts') })

    it('declares SkillExecutionEntry interface', () => {
      expect(src).toContain('export interface SkillExecutionEntry')
    })

    it('SkillExecutionEntry has skillId field', () => {
      expect(src).toMatch(/SkillExecutionEntry[\s\S]*?skillId:\s*string/)
    })

    it('SkillExecutionEntry has skillName field', () => {
      expect(src).toMatch(/SkillExecutionEntry[\s\S]*?skillName:\s*string/)
    })

    it('SkillExecutionEntry has execution_mode field', () => {
      expect(src).toMatch(/SkillExecutionEntry[\s\S]*?execution_mode:\s*SkillExecutionMode/)
    })

    it('SkillExecutionEntry has applied boolean', () => {
      expect(src).toMatch(/SkillExecutionEntry[\s\S]*?applied:\s*boolean/)
    })

    it('SkillExecutionEntry has reason string', () => {
      expect(src).toMatch(/SkillExecutionEntry[\s\S]*?reason:\s*string/)
    })

    it('declares SkillExecutionRecord interface', () => {
      expect(src).toContain('export interface SkillExecutionRecord')
    })

    it('SkillExecutionRecord has id field', () => {
      expect(src).toMatch(/SkillExecutionRecord[\s\S]*?id:\s*string/)
    })

    it('SkillExecutionRecord has timestamp field', () => {
      expect(src).toMatch(/SkillExecutionRecord[\s\S]*?timestamp:\s*number/)
    })

    it('SkillExecutionRecord has totalEvaluated field', () => {
      expect(src).toMatch(/SkillExecutionRecord[\s\S]*?totalEvaluated:\s*number/)
    })

    it('SkillExecutionRecord has totalApplied field', () => {
      expect(src).toMatch(/SkillExecutionRecord[\s\S]*?totalApplied:\s*number/)
    })

    it('SkillExecutionRecord has processingTimeMs field', () => {
      expect(src).toMatch(/SkillExecutionRecord[\s\S]*?processingTimeMs:\s*number/)
    })

    it('SkillExecutionRecord has conflictCount field', () => {
      expect(src).toMatch(/SkillExecutionRecord[\s\S]*?conflictCount:\s*number/)
    })

    it('SkillExecutionRecord has entries array of SkillExecutionEntry', () => {
      expect(src).toMatch(/SkillExecutionRecord[\s\S]*?entries:\s*SkillExecutionEntry\[\]/)
    })

    it('SkillsState includes executionHistory array', () => {
      expect(src).toMatch(/executionHistory:\s*SkillExecutionRecord\[\]/)
    })

    it('SKILLS_VERSION is bumped to 3', () => {
      expect(src).toMatch(/export\s+const\s+SKILLS_VERSION\s*=\s*3/)
    })

    it('KAN-291 referenced in header', () => {
      expect(src).toContain('KAN-291')
    })
  })

  // ─── 2. SkillsStorageManager ────────────────────────────────────────────

  describe('skills-manager.ts — Execution history methods', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-manager.ts') })

    it('imports SkillExecutionRecord', () => {
      expect(src).toContain('SkillExecutionRecord')
    })

    it('defines MAX_EXECUTION_HISTORY constant', () => {
      expect(src).toMatch(/MAX_EXECUTION_HISTORY\s*=\s*100/)
    })

    it('has addExecutionRecord method', () => {
      expect(src).toContain('addExecutionRecord(record')
    })

    it('addExecutionRecord pushes to executionHistory', () => {
      expect(src).toMatch(/this\.state\.executionHistory\.push/)
    })

    it('addExecutionRecord caps at MAX_EXECUTION_HISTORY', () => {
      expect(src).toMatch(/executionHistory\.length\s*>\s*MAX_EXECUTION_HISTORY/)
    })

    it('addExecutionRecord calls scheduleSave', () => {
      const methodBody = src.slice(src.indexOf('addExecutionRecord('))
      const nextMethod = methodBody.indexOf('public ', 10)
      const body = methodBody.slice(0, nextMethod > 0 ? nextMethod : 300)
      expect(body).toContain('scheduleSave()')
    })

    it('has getExecutionHistory method', () => {
      expect(src).toContain('getExecutionHistory(limit')
    })

    it('getExecutionHistory returns executionHistory entries', () => {
      expect(src).toMatch(/getExecutionHistory[\s\S]*?executionHistory/)
    })

    it('getExecutionHistory supports limit parameter', () => {
      const methodBody = src.slice(src.indexOf('getExecutionHistory('))
      const nextMethod = methodBody.indexOf('public ', 10)
      const body = methodBody.slice(0, nextMethod > 0 ? nextMethod : 400)
      expect(body).toMatch(/limit/)
    })

    it('has clearExecutionHistory method', () => {
      expect(src).toContain('clearExecutionHistory()')
    })

    it('clearExecutionHistory resets array to empty', () => {
      const methodBody = src.slice(src.indexOf('clearExecutionHistory()'))
      const nextMethod = methodBody.indexOf('public ', 10)
      const body = methodBody.slice(0, nextMethod > 0 ? nextMethod : 300)
      expect(body).toContain('executionHistory = []')
    })

    it('clearExecutionHistory calls scheduleSave', () => {
      const methodBody = src.slice(src.indexOf('clearExecutionHistory()'))
      const nextMethod = methodBody.indexOf('public ', 10)
      const body = methodBody.slice(0, nextMethod > 0 ? nextMethod : 300)
      expect(body).toContain('scheduleSave()')
    })

    it('default state includes executionHistory array', () => {
      expect(src).toMatch(/skills:\s*\[\],\s*permissions:\s*\[\],\s*auditLog:\s*\[\],\s*executionHistory:\s*\[\]/)
    })

    it('migrate initializes executionHistory if missing', () => {
      const migrateBlock = src.slice(src.indexOf('private migrate('))
      const body = migrateBlock.slice(0, 500)
      expect(body).toContain('executionHistory: state.executionHistory || []')
    })

    it('load initializes executionHistory if missing', () => {
      const loadBlock = src.slice(src.indexOf('private load('))
      expect(loadBlock).toContain('executionHistory: state.executionHistory || []')
    })
  })

  // ─── 3. IPC Handlers ───────────────────────────────────────────────────

  describe('electron/ipc/skills.ts — Execution log IPC handlers', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/ipc/skills.ts') })

    it('imports SkillExecutionRecord type', () => {
      expect(src).toContain('SkillExecutionRecord')
    })

    it('registers skills:addExecutionRecord channel', () => {
      expect(src).toContain("'skills:addExecutionRecord'")
    })

    it('registers skills:getExecutionHistory channel', () => {
      expect(src).toContain("'skills:getExecutionHistory'")
    })

    it('registers skills:clearExecutionHistory channel', () => {
      expect(src).toContain("'skills:clearExecutionHistory'")
    })

    it('addExecutionRecord handler calls SkillsStorageManager.addExecutionRecord', () => {
      const handlerBlock = src.slice(src.indexOf("'skills:addExecutionRecord'"))
      expect(handlerBlock).toContain('addExecutionRecord')
    })

    it('getExecutionHistory handler calls SkillsStorageManager.getExecutionHistory', () => {
      const handlerBlock = src.slice(src.indexOf("'skills:getExecutionHistory'"))
      expect(handlerBlock).toContain('getExecutionHistory')
    })

    it('clearExecutionHistory handler calls SkillsStorageManager.clearExecutionHistory', () => {
      const handlerBlock = src.slice(src.indexOf("'skills:clearExecutionHistory'"))
      expect(handlerBlock).toContain('clearExecutionHistory')
    })

    it('ALL_CHANNELS includes execution history channels', () => {
      const channelBlock = src.slice(src.indexOf('ALL_CHANNELS'), src.indexOf('] as const'))
      expect(channelBlock).toContain("'skills:addExecutionRecord'")
      expect(channelBlock).toContain("'skills:getExecutionHistory'")
      expect(channelBlock).toContain("'skills:clearExecutionHistory'")
    })
  })

  // ─── 4. Preload ─────────────────────────────────────────────────────────

  describe('electron/preload.ts — Execution log preload exposure', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/preload.ts') })

    it('exposes addExecutionRecord method', () => {
      expect(src).toContain('addExecutionRecord')
    })

    it('addExecutionRecord invokes skills:addExecutionRecord IPC', () => {
      expect(src).toMatch(/addExecutionRecord.*invoke\(\s*['"]skills:addExecutionRecord['"]/)
    })

    it('exposes getExecutionHistory method', () => {
      expect(src).toContain('getExecutionHistory')
    })

    it('getExecutionHistory invokes skills:getExecutionHistory IPC', () => {
      expect(src).toMatch(/getExecutionHistory.*invoke\(\s*['"]skills:getExecutionHistory['"]/)
    })

    it('exposes clearExecutionHistory method', () => {
      expect(src).toContain('clearExecutionHistory')
    })

    it('clearExecutionHistory invokes skills:clearExecutionHistory IPC', () => {
      expect(src).toMatch(/clearExecutionHistory.*invoke\(\s*['"]skills:clearExecutionHistory['"]/)
    })

    it('addExecutionRecord accepts record parameter with expected fields', () => {
      const line = src.split('\n').find(l => l.includes('addExecutionRecord'))
      expect(line).toBeTruthy()
      if (line) {
        expect(line).toContain('id:')
        expect(line).toContain('timestamp:')
        expect(line).toContain('totalEvaluated:')
        expect(line).toContain('totalApplied:')
        expect(line).toContain('entries:')
      }
    })
  })

  // ─── 5. App.tsx — Execution recording ──────────────────────────────────

  describe('App.tsx — Execution record persistence', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/App.tsx') })

    it('references KAN-291 in comments', () => {
      expect(src).toContain('KAN-291')
    })

    it('builds execution entries array for each skill', () => {
      expect(src).toMatch(/entries.*skillId.*skillName.*execution_mode.*applied.*reason/)
    })

    it('records disabled skills as not applied', () => {
      expect(src).toMatch(/!s\.enabled[\s\S]*?applied:\s*false[\s\S]*?reason.*disabled/)
    })

    it('records always-active skills as applied', () => {
      expect(src).toMatch(/mode\s*===\s*['"]always['"][\s\S]*?applied:\s*true/)
    })

    it('records non-always skills as skipped', () => {
      expect(src).toMatch(/applied:\s*false[\s\S]*?reason.*skipped/)
    })

    it('calls addExecutionRecord with proper record shape', () => {
      expect(src).toContain('addExecutionRecord')
    })

    it('generates unique record id', () => {
      expect(src).toMatch(/id:\s*`exec_/)
    })

    it('measures processing time with performance.now()', () => {
      expect(src).toContain('performance.now()')
    })

    it('includes totalEvaluated and totalApplied in record', () => {
      expect(src).toMatch(/totalEvaluated:\s*skills\.length/)
      expect(src).toMatch(/totalApplied:\s*autoSkills\.length/)
    })
  })

  // ─── 6. SkillsPanel — Activity Tab UI ──────────────────────────────────

  describe('SkillsPanel.tsx — Activity tab', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/SkillsPanel.tsx') })

    it('has activity tab type in activeTab state', () => {
      expect(src).toMatch(/useState.*'skills'\s*\|\s*'marketplace'\s*\|\s*'audit'\s*\|\s*'activity'/)
    })

    it('has executionHistory state', () => {
      expect(src).toContain('executionHistory')
      expect(src).toContain('setExecutionHistory')
    })

    it('has debugMode state', () => {
      expect(src).toContain('debugMode')
      expect(src).toContain('setDebugMode')
    })

    it('loads execution history when activity tab is active', () => {
      expect(src).toMatch(/activeTab\s*===\s*['"]activity['"][\s\S]*?getExecutionHistory/)
    })

    it('renders Activity tab button', () => {
      expect(src).toMatch(/Activity/)
    })

    it('Activity tab button sets activeTab to activity', () => {
      expect(src).toMatch(/setActiveTab\(\s*['"]activity['"]/)
    })

    it('renders debug mode toggle checkbox', () => {
      expect(src).toMatch(/debugMode/)
      expect(src).toMatch(/type=.*checkbox/)
    })

    it('renders "Debug Mode" label text', () => {
      expect(src).toContain('Debug Mode')
    })

    it('renders Clear History button', () => {
      expect(src).toContain('Clear History')
    })

    it('Clear History calls clearExecutionHistory', () => {
      expect(src).toContain('clearExecutionHistory')
    })

    it('shows empty state when no records', () => {
      expect(src).toContain('No skill executions recorded yet')
    })

    it('shows suggestion to send message', () => {
      expect(src).toContain('Send a message to see which skills run')
    })

    it('renders execution session cards with timestamp', () => {
      expect(src).toMatch(/record\.timestamp/)
      expect(src).toContain('toLocaleString()')
    })

    it('shows applied/evaluated ratio', () => {
      expect(src).toMatch(/record\.totalApplied.*record\.totalEvaluated/)
    })

    it('shows processingTimeMs in debug mode', () => {
      expect(src).toMatch(/record\.processingTimeMs/)
    })

    it('shows conflicts in debug mode', () => {
      expect(src).toMatch(/record\.conflictCount/)
    })

    it('renders skill entries with applied status dot', () => {
      expect(src).toMatch(/entry\.applied\s*\?/)
      expect(src).toMatch(/bg-emerald-400/)
    })

    it('renders skill name per entry', () => {
      expect(src).toContain('entry.skillName')
    })

    it('shows execution_mode badge in debug mode', () => {
      expect(src).toContain('entry.execution_mode')
    })

    it('shows reason in debug mode', () => {
      expect(src).toContain('entry.reason')
    })

    it('shows skipped count when debug mode is off', () => {
      expect(src).toMatch(/skipped.*debug/)
    })

    it('filters entries by applied status when debug mode is off', () => {
      expect(src).toMatch(/filter.*debugMode\s*\|\|\s*e\.applied/)
    })

    it('shows execution session count in status bar', () => {
      expect(src).toMatch(/executionHistory\.length.*execution sessions/)
    })

    it('status bar shows debug mode indicator', () => {
      expect(src).toContain('Debug mode ON')
    })

    it('excludes activity tab from empty state guard', () => {
      expect(src).toContain("activeTab !== 'activity'")
    })
  })

  // ─── 7. Regression Guards ──────────────────────────────────────────────

  describe('Regression guards', () => {
    it('types.ts still exports Skill interface', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toContain('export interface Skill')
    })

    it('types.ts still exports ToolAuditLogEntry', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toContain('export interface ToolAuditLogEntry')
    })

    it('types.ts still exports PermissionEntry', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toContain('export interface PermissionEntry')
    })

    it('SkillsState still has skills array', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/SkillsState[\s\S]*?skills:\s*Skill\[\]/)
    })

    it('SkillsState still has permissions array', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/SkillsState[\s\S]*?permissions:\s*PermissionEntry\[\]/)
    })

    it('SkillsState still has auditLog array', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/SkillsState[\s\S]*?auditLog:\s*ToolAuditLogEntry\[\]/)
    })

    it('skills-manager still has addAuditLogEntry', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toContain('addAuditLogEntry')
    })

    it('skills-manager still has getAuditLog', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toContain('getAuditLog')
    })

    it('skills-manager still has clearAuditLog', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toContain('clearAuditLog()')
    })

    it('IPC still registers audit log channels', () => {
      const src = readFile('electron/ipc/skills.ts')
      expect(src).toContain("'skills:getAuditLog'")
      expect(src).toContain("'skills:clearAuditLog'")
    })

    it('preload still exposes audit methods', () => {
      const src = readFile('electron/preload.ts')
      expect(src).toContain('getAuditLog')
      expect(src).toContain('clearAuditLog')
    })

    it('SkillsPanel still has audit tab', () => {
      const src = readFile('renderer/src/components/SkillsPanel.tsx')
      expect(src).toContain("'audit'")
      expect(src).toContain('Audit')
    })

    it('SkillsPanel still has marketplace tab', () => {
      const src = readFile('renderer/src/components/SkillsPanel.tsx')
      expect(src).toContain("'marketplace'")
      expect(src).toContain('Marketplace')
    })

    it('SkillsPanel still has skills tab', () => {
      const src = readFile('renderer/src/components/SkillsPanel.tsx')
      expect(src).toContain("'skills'")
    })

    it('skill-processor.ts still exports SkillExecutionLogEntry', () => {
      const src = readFile('src/skills/skill-processor.ts')
      expect(src).toContain('export interface SkillExecutionLogEntry')
    })

    it('skill-processor.ts still exports formatExecutionLog', () => {
      const src = readFile('src/skills/skill-processor.ts')
      expect(src).toContain('export function formatExecutionLog')
    })
  })
})

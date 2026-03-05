/**
 * KAN-290: Implement Permission System for Skills — Source-level TDD tests
 *
 * Validates:
 * 1. Permission types (PermissionLevel, PermissionDecision, PermissionEntry, ToolAuditLogEntry)
 * 2. SkillsState includes permissions + auditLog arrays
 * 3. SkillsStorageManager permission + audit log methods
 * 4. Skill-tool-runner: checkStoredPermission + describeToolAction
 * 5. IPC handlers for permissions + audit log + requestToolExecution
 * 6. Preload exposes all permission + audit APIs
 * 7. ToolPermissionDialog component
 * 8. SkillsPanel audit tab + permission display
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

describe('KAN-290: Permission System for Skills', () => {
  // ─── 1. Types ────────────────────────────────────────────────────────────

  describe('types.ts — Permission types', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/types.ts') })

    it('exports PermissionLevel type', () => {
      expect(src).toMatch(/export type PermissionLevel/)
    })

    it('PermissionLevel includes always_allow', () => {
      expect(src).toMatch(/PermissionLevel.*=.*'always_allow'/)
    })

    it('PermissionLevel includes always_deny', () => {
      expect(src).toMatch(/'always_deny'/)
    })

    it('PermissionLevel includes ask', () => {
      expect(src).toMatch(/'ask'/)
    })

    it('exports PermissionEntry interface', () => {
      expect(src).toMatch(/export interface PermissionEntry/)
    })

    it('PermissionEntry has skillId field', () => {
      expect(src).toMatch(/PermissionEntry[\s\S]*?skillId:\s*string/)
    })

    it('PermissionEntry has tool field', () => {
      expect(src).toMatch(/PermissionEntry[\s\S]*?tool:\s*SkillToolPermission/)
    })

    it('PermissionEntry has level field', () => {
      expect(src).toMatch(/PermissionEntry[\s\S]*?level:\s*PermissionLevel/)
    })

    it('PermissionEntry has grantedAt field', () => {
      expect(src).toMatch(/PermissionEntry[\s\S]*?grantedAt:\s*number/)
    })

    it('exports PermissionDecision type', () => {
      expect(src).toMatch(/export type PermissionDecision/)
    })

    it('PermissionDecision includes allow_once', () => {
      expect(src).toMatch(/PermissionDecision.*'allow_once'/)
    })

    it('PermissionDecision includes always_allow', () => {
      expect(src).toMatch(/PermissionDecision.*'always_allow'/)
    })

    it('PermissionDecision includes deny', () => {
      expect(src).toMatch(/PermissionDecision.*'deny'/)
    })

    it('PermissionDecision includes always_deny', () => {
      expect(src).toMatch(/PermissionDecision.*'always_deny'/)
    })

    it('exports ToolAuditLogEntry interface', () => {
      expect(src).toMatch(/export interface ToolAuditLogEntry/)
    })

    it('ToolAuditLogEntry has timestamp field', () => {
      expect(src).toMatch(/ToolAuditLogEntry[\s\S]*?timestamp:\s*number/)
    })

    it('ToolAuditLogEntry has skillId field', () => {
      expect(src).toMatch(/ToolAuditLogEntry[\s\S]*?skillId:\s*string/)
    })

    it('ToolAuditLogEntry has skillName field', () => {
      expect(src).toMatch(/ToolAuditLogEntry[\s\S]*?skillName:\s*string/)
    })

    it('ToolAuditLogEntry has tool field', () => {
      expect(src).toMatch(/ToolAuditLogEntry[\s\S]*?tool:\s*SkillToolPermission/)
    })

    it('ToolAuditLogEntry has decision field', () => {
      expect(src).toMatch(/ToolAuditLogEntry[\s\S]*?decision:/)
    })

    it('ToolAuditLogEntry decision includes auto_allowed and auto_denied', () => {
      expect(src).toMatch(/auto_allowed/)
      expect(src).toMatch(/auto_denied/)
    })

    it('ToolAuditLogEntry has success field', () => {
      expect(src).toMatch(/ToolAuditLogEntry[\s\S]*?success\?:\s*boolean/)
    })

    it('ToolAuditLogEntry has durationMs field', () => {
      expect(src).toMatch(/ToolAuditLogEntry[\s\S]*?durationMs\?:\s*number/)
    })

    it('SkillsState includes permissions array', () => {
      const stateMatch = src.match(/export interface SkillsState[\s\S]*?\n\}/)
      expect(stateMatch).toBeTruthy()
      expect(stateMatch![0]).toMatch(/permissions:\s*PermissionEntry\[\]/)
    })

    it('SkillsState includes auditLog array', () => {
      const stateMatch = src.match(/export interface SkillsState[\s\S]*?\n\}/)
      expect(stateMatch).toBeTruthy()
      expect(stateMatch![0]).toMatch(/auditLog:\s*ToolAuditLogEntry\[\]/)
    })

    it('SKILLS_VERSION is at least 2', () => {
      expect(src).toMatch(/SKILLS_VERSION\s*=\s*[2-9]/)
    })
  })

  // ─── 2. SkillsStorageManager — permission methods ───────────────────────

  describe('skills-manager.ts — permission + audit methods', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-manager.ts') })

    it('imports PermissionLevel from types', () => {
      expect(src).toMatch(/import.*PermissionLevel.*from/)
    })

    it('imports PermissionEntry from types', () => {
      expect(src).toMatch(/import.*PermissionEntry.*from/)
    })

    it('imports ToolAuditLogEntry from types', () => {
      expect(src).toMatch(/import.*ToolAuditLogEntry.*from/)
    })

    it('imports PermissionDecision from types', () => {
      expect(src).toMatch(/import.*PermissionDecision.*from/)
    })

    it('defines MAX_AUDIT_LOG_ENTRIES constant', () => {
      expect(src).toMatch(/MAX_AUDIT_LOG_ENTRIES/)
    })

    it('has getPermission method', () => {
      expect(src).toMatch(/public getPermission\(skillId:\s*string,\s*tool:\s*SkillToolPermission\)/)
    })

    it('getPermission returns PermissionLevel', () => {
      expect(src).toMatch(/getPermission[\s\S]*?:\s*PermissionLevel/)
    })

    it('getPermission defaults to ask', () => {
      expect(src).toMatch(/getPermission[\s\S]*?'ask'/)
    })

    it('has setPermission method', () => {
      expect(src).toMatch(/public setPermission\(skillId:\s*string/)
    })

    it('has getAllPermissions method', () => {
      expect(src).toMatch(/public getAllPermissions\(\)/)
    })

    it('has clearPermissionsForSkill method', () => {
      expect(src).toMatch(/public clearPermissionsForSkill\(skillId:\s*string\)/)
    })

    it('has resetPermission method', () => {
      expect(src).toMatch(/public resetPermission\(skillId:\s*string/)
    })

    it('has addAuditLogEntry method', () => {
      expect(src).toMatch(/public addAuditLogEntry\(entry:\s*ToolAuditLogEntry\)/)
    })

    it('addAuditLogEntry caps at MAX_AUDIT_LOG_ENTRIES', () => {
      expect(src).toMatch(/addAuditLogEntry[\s\S]*?MAX_AUDIT_LOG_ENTRIES/)
    })

    it('has getAuditLog method', () => {
      expect(src).toMatch(/public getAuditLog\(limit\?/)
    })

    it('has getAuditLogForSkill method', () => {
      expect(src).toMatch(/public getAuditLogForSkill\(skillId:\s*string\)/)
    })

    it('has clearAuditLog method', () => {
      expect(src).toMatch(/public clearAuditLog\(\)/)
    })

    it('deleteSkill clears permissions for the skill', () => {
      expect(src).toMatch(/deleteSkill[\s\S]*?clearPermissionsForSkill/)
    })

    it('default state includes permissions array', () => {
      expect(src).toMatch(/permissions:\s*\[\]/)
    })

    it('default state includes auditLog array', () => {
      expect(src).toMatch(/auditLog:\s*\[\]/)
    })

    it('migrate adds permissions and auditLog', () => {
      expect(src).toMatch(/migrate[\s\S]*?permissions.*state\.permissions/)
      expect(src).toMatch(/migrate[\s\S]*?auditLog.*state\.auditLog/)
    })
  })

  // ─── 3. Skill Tool Runner — stored permission checks ────────────────────

  describe('skill-tool-runner.ts — permission-aware functions', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-tool-runner.ts') })

    it('imports PermissionLevel from types', () => {
      expect(src).toMatch(/import.*PermissionLevel.*from/)
    })

    it('exports checkStoredPermission function', () => {
      expect(src).toMatch(/export function checkStoredPermission/)
    })

    it('checkStoredPermission handles always_allow', () => {
      expect(src).toMatch(/checkStoredPermission[\s\S]*?always_allow[\s\S]*?allow/)
    })

    it('checkStoredPermission handles always_deny', () => {
      expect(src).toMatch(/checkStoredPermission[\s\S]*?always_deny[\s\S]*?deny/)
    })

    it('checkStoredPermission handles ask', () => {
      expect(src).toMatch(/checkStoredPermission[\s\S]*?case 'ask'/)
    })

    it('exports describeToolAction function', () => {
      expect(src).toMatch(/export function describeToolAction/)
    })

    it('describeToolAction handles filesystem', () => {
      expect(src).toMatch(/describeToolAction[\s\S]*?case 'filesystem'/)
    })

    it('describeToolAction handles terminal', () => {
      expect(src).toMatch(/describeToolAction[\s\S]*?case 'terminal'/)
    })

    it('describeToolAction handles git', () => {
      expect(src).toMatch(/describeToolAction[\s\S]*?case 'git'/)
    })

    it('describeToolAction handles aws_cli', () => {
      expect(src).toMatch(/describeToolAction[\s\S]*?case 'aws_cli'/)
    })

    it('describeToolAction handles docker', () => {
      expect(src).toMatch(/describeToolAction[\s\S]*?case 'docker'/)
    })
  })

  // ─── 4. IPC Handlers ────────────────────────────────────────────────────

  describe('electron/ipc/skills.ts — permission + audit IPC', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/ipc/skills.ts') })

    it('imports PermissionLevel from types', () => {
      expect(src).toMatch(/import.*PermissionLevel.*from/)
    })

    it('imports PermissionDecision from types', () => {
      expect(src).toMatch(/import.*PermissionDecision.*from/)
    })

    it('imports checkStoredPermission from skill-tool-runner', () => {
      expect(src).toMatch(/import.*checkStoredPermission.*from/)
    })

    it('ALL_CHANNELS includes skills:getPermission', () => {
      expect(src).toMatch(/skills:getPermission/)
    })

    it('ALL_CHANNELS includes skills:setPermission', () => {
      expect(src).toMatch(/skills:setPermission/)
    })

    it('ALL_CHANNELS includes skills:getAllPermissions', () => {
      expect(src).toMatch(/skills:getAllPermissions/)
    })

    it('ALL_CHANNELS includes skills:resetPermission', () => {
      expect(src).toMatch(/skills:resetPermission/)
    })

    it('ALL_CHANNELS includes skills:getAuditLog', () => {
      expect(src).toMatch(/skills:getAuditLog/)
    })

    it('ALL_CHANNELS includes skills:getAuditLogForSkill', () => {
      expect(src).toMatch(/skills:getAuditLogForSkill/)
    })

    it('ALL_CHANNELS includes skills:clearAuditLog', () => {
      expect(src).toMatch(/skills:clearAuditLog/)
    })

    it('ALL_CHANNELS includes skills:requestToolExecution', () => {
      expect(src).toMatch(/skills:requestToolExecution/)
    })

    it('registers skills:getPermission handler', () => {
      expect(src).toMatch(/ipcMain\.handle\('skills:getPermission'/)
    })

    it('registers skills:setPermission handler', () => {
      expect(src).toMatch(/ipcMain\.handle\('skills:setPermission'/)
    })

    it('registers skills:getAllPermissions handler', () => {
      expect(src).toMatch(/ipcMain\.handle\('skills:getAllPermissions'/)
    })

    it('registers skills:resetPermission handler', () => {
      expect(src).toMatch(/ipcMain\.handle\('skills:resetPermission'/)
    })

    it('registers skills:getAuditLog handler', () => {
      expect(src).toMatch(/ipcMain\.handle\('skills:getAuditLog'/)
    })

    it('registers skills:getAuditLogForSkill handler', () => {
      expect(src).toMatch(/ipcMain\.handle\('skills:getAuditLogForSkill'/)
    })

    it('registers skills:clearAuditLog handler', () => {
      expect(src).toMatch(/ipcMain\.handle\('skills:clearAuditLog'/)
    })

    it('registers skills:requestToolExecution handler', () => {
      expect(src).toMatch(/ipcMain\.handle\('skills:requestToolExecution'/)
    })

    it('requestToolExecution checks stored permission via checkStoredPermission', () => {
      expect(src).toMatch(/requestToolExecution[\s\S]*?checkStoredPermission/)
    })

    it('requestToolExecution returns needs_confirmation when ask', () => {
      expect(src).toMatch(/needs_confirmation/)
    })

    it('requestToolExecution records audit log for auto_allowed', () => {
      expect(src).toMatch(/auto_allowed/)
    })

    it('requestToolExecution records audit log for auto_denied', () => {
      expect(src).toMatch(/auto_denied/)
    })

    it('requestToolExecution saves always_allow preference', () => {
      expect(src).toMatch(/setPermission[\s\S]*?always_allow/)
    })

    it('requestToolExecution saves always_deny preference', () => {
      expect(src).toMatch(/setPermission[\s\S]*?always_deny/)
    })
  })

  // ─── 5. Preload ─────────────────────────────────────────────────────────

  describe('electron/preload.ts — permission + audit exposure', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/preload.ts') })

    it('exposes getPermission method', () => {
      expect(src).toMatch(/getPermission:.*invoke\('skills:getPermission'/)
    })

    it('exposes setPermission method', () => {
      expect(src).toMatch(/setPermission:.*invoke\('skills:setPermission'/)
    })

    it('exposes getAllPermissions method', () => {
      expect(src).toMatch(/getAllPermissions:.*invoke\('skills:getAllPermissions'/)
    })

    it('exposes resetPermission method', () => {
      expect(src).toMatch(/resetPermission:.*invoke\('skills:resetPermission'/)
    })

    it('exposes getAuditLog method', () => {
      expect(src).toMatch(/getAuditLog:.*invoke\('skills:getAuditLog'/)
    })

    it('exposes getAuditLogForSkill method', () => {
      expect(src).toMatch(/getAuditLogForSkill:.*invoke\('skills:getAuditLogForSkill'/)
    })

    it('exposes clearAuditLog method', () => {
      expect(src).toMatch(/clearAuditLog:.*invoke\('skills:clearAuditLog'/)
    })

    it('exposes requestToolExecution method', () => {
      expect(src).toMatch(/requestToolExecution:.*invoke\('skills:requestToolExecution'/)
    })

    it('requestToolExecution accepts decision parameter', () => {
      expect(src).toMatch(/requestToolExecution.*decision/)
    })
  })

  // ─── 6. ToolPermissionDialog component ──────────────────────────────────

  describe('ToolPermissionDialog.tsx — permission dialog UI', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/ToolPermissionDialog.tsx') })

    it('file exists and has content', () => {
      expect(src.length).toBeGreaterThan(100)
    })

    it('exports ToolPermissionDialog function component', () => {
      expect(src).toMatch(/export function ToolPermissionDialog/)
    })

    it('has role="dialog" attribute', () => {
      expect(src).toMatch(/role="dialog"/)
    })

    it('has aria-modal="true" attribute', () => {
      expect(src).toMatch(/aria-modal="true"/)
    })

    it('displays skill name', () => {
      expect(src).toMatch(/skillName/)
    })

    it('displays tool type', () => {
      expect(src).toMatch(/TOOL_LABELS/)
    })

    it('displays action description', () => {
      expect(src).toMatch(/description/)
    })

    it('has Allow Once button', () => {
      expect(src).toMatch(/Allow Once/)
    })

    it('has Always Allow button', () => {
      expect(src).toMatch(/Always Allow/)
    })

    it('has Deny button', () => {
      expect(src).toMatch(/Deny/)
    })

    it('has Always Deny button', () => {
      expect(src).toMatch(/Always Deny/)
    })

    it('calls onDecision with allow_once', () => {
      expect(src).toMatch(/onDecision\('allow_once'\)/)
    })

    it('calls onDecision with always_allow', () => {
      expect(src).toMatch(/onDecision\('always_allow'\)/)
    })

    it('calls onDecision with deny', () => {
      expect(src).toMatch(/onDecision\('deny'\)/)
    })

    it('calls onDecision with always_deny', () => {
      expect(src).toMatch(/onDecision\('always_deny'\)/)
    })

    it('has Permission Required heading', () => {
      expect(src).toMatch(/Permission Required/)
    })

    it('has TOOL_ICONS for all 5 tools', () => {
      expect(src).toMatch(/filesystem/)
      expect(src).toMatch(/terminal/)
      expect(src).toMatch(/git/)
      expect(src).toMatch(/aws_cli/)
      expect(src).toMatch(/docker/)
    })

    it('accepts ToolPermissionDialogProps interface', () => {
      expect(src).toMatch(/interface ToolPermissionDialogProps/)
    })
  })

  // ─── 7. SkillsPanel — audit tab + permissions display ───────────────────

  describe('SkillsPanel.tsx — audit tab + permission controls', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/SkillsPanel.tsx') })

    it('activeTab state includes audit option', () => {
      expect(src).toMatch(/activeTab.*'skills'.*'marketplace'.*'audit'/)
    })

    it('has auditLog state', () => {
      expect(src).toMatch(/auditLog.*useState/)
    })

    it('has permissions state', () => {
      expect(src).toMatch(/permissions.*useState/)
    })

    it('has Audit tab button', () => {
      expect(src).toMatch(/📋 Audit/)
    })

    it('setActiveTab to audit on click', () => {
      expect(src).toMatch(/setActiveTab\('audit'\)/)
    })

    it('loads audit log on audit tab', () => {
      expect(src).toMatch(/getAuditLog/)
    })

    it('loads permissions on audit tab', () => {
      expect(src).toMatch(/getAllPermissions/)
    })

    it('displays Stored Permissions heading', () => {
      expect(src).toMatch(/Stored Permissions/)
    })

    it('displays Audit Log heading', () => {
      expect(src).toMatch(/Audit Log/)
    })

    it('has Clear Log button', () => {
      expect(src).toMatch(/Clear Log/)
    })

    it('calls clearAuditLog on Clear Log click', () => {
      expect(src).toMatch(/clearAuditLog/)
    })

    it('has resetPermission button for each permission', () => {
      expect(src).toMatch(/resetPermission/)
    })

    it('shows Always Allow badge for permissions', () => {
      expect(src).toMatch(/Always Allow/)
    })

    it('shows Always Deny badge for permissions', () => {
      expect(src).toMatch(/Always Deny/)
    })

    it('renders audit log entries with timestamps', () => {
      expect(src).toMatch(/toLocaleTimeString/)
    })

    it('renders audit log decision badges', () => {
      expect(src).toMatch(/decision\.replace/)
    })

    it('audit tab status shows entry and permission counts', () => {
      expect(src).toMatch(/log entries.*stored permissions/)
    })

    it('empty state excluded when audit tab is active', () => {
      expect(src).toMatch(/activeTab !== 'audit'/)
    })
  })

  // ─── 8. Regression guards ──────────────────────────────────────────────

  describe('regression guards', () => {
    it('i18n language instruction preserved', () => {
      const src = readFile('packages/prompts/src/system-prompt.ts')
      expect(src).toMatch(/LANGUAGE INSTRUCTION/)
    })

    it('existing skill fields preserved', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/name: string/)
      expect(src).toMatch(/allowed_tools\?/)
      expect(src).toMatch(/tags\?/)
    })

    it('tool runner still works', () => {
      const src = readFile('src/skills/skill-tool-runner.ts')
      expect(src).toMatch(/export function executeToolRequest/)
      expect(src).toMatch(/export function checkToolPermission/)
    })

    it('marketplace catalog unchanged', () => {
      const src = readFile('src/skills/skill-catalog.ts')
      expect(src).toMatch(/marketplace_prompt_refiner/)
      expect(src).toMatch(/marketplace_git_workflow/)
    })

    it('conflict detection still works', () => {
      const src = readFile('src/skills/skill-processor.ts')
      expect(src).toMatch(/export function detectConflicts/)
    })

    it('My Skills and Marketplace tabs still present', () => {
      const src = readFile('renderer/src/components/SkillsPanel.tsx')
      expect(src).toMatch(/My Skills/)
      expect(src).toMatch(/🛒 Marketplace/)
    })
  })
})

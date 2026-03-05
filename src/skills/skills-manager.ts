/**
 * Skills Storage Manager — KAN-282
 *
 * Singleton that manages CRUD operations and persistence for AI skills.
 * Follows the ChatHistoryManager pattern (JSON file, debounced save, migration).
 *
 * Storage layout:
 *   ~/.aibuddy/skills/skills.json  — global + all project skills
 *
 * Migration:
 *   On first load for a workspace, if .aibuddy/rules/*.md files exist,
 *   they are imported as project-scoped skills and the legacy files kept
 *   (no destructive migration).
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { Skill, SkillsState, SkillScope, SkillVisibility, SkillExecutionMode, SKILLS_VERSION } from './types'
import type { CatalogSkill, SkillToolPermission, PermissionLevel, PermissionEntry, ToolAuditLogEntry, PermissionDecision, SkillExecutionRecord, SkillsApiSettings } from './types'

const generateId = (): string => crypto.randomBytes(12).toString('base64url')

const SKILLS_DIR = path.join(os.homedir(), '.aibuddy', 'skills')
const SKILLS_FILE = path.join(SKILLS_DIR, 'skills.json')
const MAX_SKILLS = 200
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB hard cap
const MAX_AUDIT_LOG_ENTRIES = 500
const MAX_EXECUTION_HISTORY = 100

// ─── Built-in skills (always present, cannot be deleted) ──────────────────────

const BUILTIN_SENIOR_ENGINEERING: Skill = {
  id: '_builtin_senior_engineering',
  name: 'Senior Engineering Standards',
  description: 'Full investigation before coding, TDD, fix root causes',
  tags: ['engineering', 'investigation', 'root-cause'],
  prompt_template: `# Senior Engineering Standards

Do a full investigation before writing code. Use the best approach as if you are
a Microsoft, Apple and Google Senior Engineer with over 20 years experience.

Follow test driven development like you are the best TDD Developer in the world.
Fix root causes not do any work arounds.

- Check Sentry admin API for breadcrumbs on client side apps and API
- Check SSH docs for server errors
- Check Firebase Admin SDK if any issues in Firebase data
- Check for any queue tasks before building
- Check all issues found before building
- Always run test coverage before building
- Check to fix and prevent regressions`,
  enabled: true,
  scope: 'global',
  created_by: 'system',
  created_at: 0,
  updated_at: 0,
  builtin: true,
  order: 0,
}

const BUILTIN_TDD: Skill = {
  id: '_builtin_tdd_and_documentation',
  name: 'TDD and Documentation',
  description: 'Red-Green-Refactor, smoke tests, no duplicated test code',
  tags: ['testing', 'documentation', 'tdd'],
  prompt_template: `# TDD and Documentation

## Document Everything
- Every fix gets a smoke test
- Every new feature gets tests written FIRST (Red-Green-Refactor)
- Update relevant docs (KNOWN_ISSUES.md, CHANGELOG, E2E_TESTING_KIT.md) after changes
- Add lessons learned for non-obvious fixes

## Testing Rules
- NEVER duplicate code in tests — ALWAYS import real functions from source files
- NEVER copy function code into test files — test the real implementation
- Each test must be fast (< 100ms), have no network calls, and no side effects
- Every fixed bug must get a regression test to prevent recurrence

## Before Every Build
1. Run full test suite — zero failures required
2. Run TypeScript compilation — zero errors required
3. Check Sentry for new unresolved errors
4. Verify no hardcoded secrets, versions, or environment-specific values`,
  enabled: true,
  scope: 'global',
  created_by: 'system',
  created_at: 0,
  updated_at: 0,
  builtin: true,
  order: 1,
}

const BUILTIN_CODE_QUALITY: Skill = {
  id: '_builtin_code_quality',
  name: 'Code Quality Standards',
  description: 'Read existing code first, fix linter errors, guard entry points',
  tags: ['code-quality', 'linting', 'engineering'],
  prompt_template: `# Code Quality Standards

- Read existing code and docs before writing new code
- Prefer editing existing files over creating new ones
- No comments that just narrate what the code does
- Fix linter errors you introduce
- Guard all entry points (check workspace state, null inputs, missing config)
- Resolve promises gracefully — never reject with errors for expected abort paths
- Use sentinel values instead of thrown errors for expected control flow`,
  enabled: true,
  scope: 'global',
  created_by: 'system',
  created_at: 0,
  updated_at: 0,
  builtin: true,
  order: 2,
}

export const BUILTIN_SKILLS: Skill[] = [
  BUILTIN_SENIOR_ENGINEERING,
  BUILTIN_TDD,
  BUILTIN_CODE_QUALITY,
]

// ─── Manager ──────────────────────────────────────────────────────────────────

export class SkillsStorageManager {
  private static instance: SkillsStorageManager | null = null
  private state: SkillsState
  private saveDebounceTimer: NodeJS.Timeout | null = null
  private readonly SAVE_DEBOUNCE_MS = 500
  private migratedWorkspaces = new Set<string>()

  private constructor() {
    this.state = this.load()
  }

  public static getInstance(): SkillsStorageManager {
    if (!SkillsStorageManager.instance) {
      SkillsStorageManager.instance = new SkillsStorageManager()
    }
    return SkillsStorageManager.instance
  }

  /** For testing — reset the singleton */
  public static resetInstance(): void {
    if (SkillsStorageManager.instance?.saveDebounceTimer) {
      clearTimeout(SkillsStorageManager.instance.saveDebounceTimer)
    }
    SkillsStorageManager.instance = null
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  /** Get all skills (optionally filtered by scope and/or workspace) */
  public getSkills(scope?: SkillScope, workspacePath?: string): Skill[] {
    const builtins = BUILTIN_SKILLS
    const stored = this.state.skills

    let all = [...builtins, ...stored]

    if (scope === 'global') {
      all = all.filter(s => s.scope === 'global')
    } else if (scope === 'project' && workspacePath) {
      all = all.filter(s => s.scope === 'project')
    }

    return all.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  }

  /** Get active (enabled) skills suitable for prompt injection */
  public getActiveSkills(workspacePath?: string): Skill[] {
    return this.getSkills(undefined, workspacePath).filter(s => s.enabled)
  }

  /** Get skills eligible for automatic prompt injection (enabled + execution_mode='always') */
  public getSkillsForPrompt(workspacePath?: string): Skill[] {
    return this.getActiveSkills(workspacePath).filter(
      s => !s.execution_mode || s.execution_mode === 'always'
    )
  }

  /** Get a single skill by ID */
  public getSkillById(id: string): Skill | undefined {
    const builtin = BUILTIN_SKILLS.find(s => s.id === id)
    if (builtin) return builtin
    return this.state.skills.find(s => s.id === id)
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  public createSkill(params: {
    name: string
    description?: string
    prompt_template: string
    enabled?: boolean
    scope?: SkillScope
    created_by?: string
    order?: number
    visibility?: SkillVisibility
    execution_mode?: SkillExecutionMode
    tags?: string[]
    allowed_tools?: SkillToolPermission[]
    context_triggers?: import('./types').SkillContextTrigger
  }): Skill {
    if (this.state.skills.length >= MAX_SKILLS) {
      throw new Error(`Maximum skill limit reached (${MAX_SKILLS})`)
    }

    const now = Date.now()
    const skill: Skill = {
      id: generateId(),
      name: params.name,
      description: params.description || '',
      prompt_template: params.prompt_template,
      enabled: params.enabled ?? true,
      scope: params.scope || 'project',
      created_by: params.created_by || 'user',
      created_at: now,
      updated_at: now,
      visibility: params.visibility || 'private',
      execution_mode: params.execution_mode || 'always',
      order: params.order,
      tags: params.tags,
      allowed_tools: params.allowed_tools,
      context_triggers: params.context_triggers,
    }

    this.state.skills.push(skill)
    this.scheduleSave()
    return skill
  }

  /** Install a skill from the marketplace catalog */
  public installFromCatalog(catalogSkill: CatalogSkill): Skill {
    if (this.state.skills.length >= MAX_SKILLS) {
      throw new Error(`Maximum skill limit reached (${MAX_SKILLS})`)
    }

    const existing = this.state.skills.find(s => s.catalog_id === catalogSkill.catalog_id)
    if (existing) {
      throw new Error(`Skill "${catalogSkill.name}" is already installed`)
    }

    const now = Date.now()
    const skill: Skill = {
      id: generateId(),
      name: catalogSkill.name,
      description: catalogSkill.description,
      prompt_template: catalogSkill.prompt_template,
      enabled: true,
      scope: catalogSkill.scope,
      created_by: catalogSkill.author,
      created_at: now,
      updated_at: now,
      tags: catalogSkill.tags,
      execution_mode: catalogSkill.execution_mode,
      source: 'marketplace',
      catalog_id: catalogSkill.catalog_id,
      allowed_tools: catalogSkill.allowed_tools,
      context_triggers: catalogSkill.context_triggers,
    }

    this.state.skills.push(skill)
    this.scheduleSave()
    return skill
  }

  /** Check if a catalog skill is already installed */
  public isInstalled(catalogId: string): boolean {
    return this.state.skills.some(s => s.catalog_id === catalogId)
  }

  /** Get all installed catalog IDs */
  public getInstalledCatalogIds(): string[] {
    return this.state.skills
      .filter(s => s.catalog_id)
      .map(s => s.catalog_id!)
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  /** Batch-reorder skills by setting order from the provided ID list */
  public reorderSkills(orderedIds: string[]): void {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i]
      const skill = this.state.skills.find(s => s.id === id)
      if (skill) {
        skill.order = i
        skill.updated_at = Date.now()
      }
    }
    this.scheduleSave()
  }

  public updateSkill(id: string, updates: Partial<Pick<Skill,
    'name' | 'description' | 'prompt_template' | 'enabled' | 'scope' | 'order' | 'visibility' | 'execution_mode' | 'tags' | 'allowed_tools' | 'context_triggers'
  >>): Skill | null {
    const builtin = BUILTIN_SKILLS.find(s => s.id === id)
    if (builtin) return null // cannot update built-ins

    const idx = this.state.skills.findIndex(s => s.id === id)
    if (idx === -1) return null

    const skill = this.state.skills[idx]
    if (updates.name !== undefined) skill.name = updates.name
    if (updates.description !== undefined) skill.description = updates.description
    if (updates.prompt_template !== undefined) skill.prompt_template = updates.prompt_template
    if (updates.enabled !== undefined) skill.enabled = updates.enabled
    if (updates.scope !== undefined) skill.scope = updates.scope
    if (updates.order !== undefined) skill.order = updates.order
    if (updates.visibility !== undefined) skill.visibility = updates.visibility
    if (updates.execution_mode !== undefined) skill.execution_mode = updates.execution_mode
    if (updates.tags !== undefined) skill.tags = updates.tags
    if (updates.allowed_tools !== undefined) skill.allowed_tools = updates.allowed_tools
    if (updates.context_triggers !== undefined) skill.context_triggers = updates.context_triggers
    skill.updated_at = Date.now()

    this.state.skills[idx] = skill
    this.scheduleSave()
    return skill
  }

  /** Toggle enabled/disabled */
  public toggleSkill(id: string): Skill | null {
    const skill = this.state.skills.find(s => s.id === id)
    if (!skill) return null
    skill.enabled = !skill.enabled
    skill.updated_at = Date.now()
    this.scheduleSave()
    return skill
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  public deleteSkill(id: string): boolean {
    const builtin = BUILTIN_SKILLS.find(s => s.id === id)
    if (builtin) return false // cannot delete built-ins

    const before = this.state.skills.length
    this.state.skills = this.state.skills.filter(s => s.id !== id)
    if (this.state.skills.length < before) {
      this.clearPermissionsForSkill(id)
      this.scheduleSave()
      return true
    }
    return false
  }

  // ─── Migration from legacy .aibuddy/rules/ ───────────────────────────────

  /** Import legacy .aibuddy/rules/*.md files as project-scoped skills */
  public migrateLegacyRules(workspacePath: string): number {
    if (this.migratedWorkspaces.has(workspacePath)) return 0

    const rulesDir = path.join(workspacePath, '.aibuddy', 'rules')
    if (!fs.existsSync(rulesDir)) {
      this.migratedWorkspaces.add(workspacePath)
      return 0
    }

    let files: string[]
    try {
      files = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md')).sort()
    } catch {
      this.migratedWorkspaces.add(workspacePath)
      return 0
    }

    let imported = 0
    for (const file of files) {
      const alreadyMigrated = this.state.skills.some(s => s.legacy_filename === file)
      if (alreadyMigrated) continue

      try {
        const raw = fs.readFileSync(path.join(rulesDir, file), 'utf-8')
        if (!raw.trim()) continue

        const { description, alwaysApply, content } = parseFrontmatter(raw)
        const now = Date.now()

        const skill: Skill = {
          id: generateId(),
          name: description || file.replace('.md', ''),
          description: description || '',
          prompt_template: content,
          enabled: alwaysApply ?? false,
          scope: 'project',
          created_by: 'user',
          created_at: now,
          updated_at: now,
          legacy_filename: file,
          order: 100 + imported,
        }

        this.state.skills.push(skill)
        imported++
      } catch { /* skip unreadable files */ }
    }

    this.migratedWorkspaces.add(workspacePath)
    if (imported > 0) this.scheduleSave()
    return imported
  }

  // ─── KAN-290: Permission System ──────────────────────────────────────────

  /** Get stored permission for a skill+tool pair */
  public getPermission(skillId: string, tool: SkillToolPermission): PermissionLevel {
    const entry = this.state.permissions.find(p => p.skillId === skillId && p.tool === tool)
    return entry?.level ?? 'ask'
  }

  /** Set permission preference for a skill+tool pair */
  public setPermission(skillId: string, tool: SkillToolPermission, level: PermissionLevel): void {
    const idx = this.state.permissions.findIndex(p => p.skillId === skillId && p.tool === tool)
    const entry: PermissionEntry = { skillId, tool, level, grantedAt: Date.now() }
    if (idx >= 0) {
      this.state.permissions[idx] = entry
    } else {
      this.state.permissions.push(entry)
    }
    this.scheduleSave()
  }

  /** Get all stored permissions */
  public getAllPermissions(): PermissionEntry[] {
    return [...this.state.permissions]
  }

  /** Remove all permissions for a skill (e.g. when skill is deleted) */
  public clearPermissionsForSkill(skillId: string): void {
    this.state.permissions = this.state.permissions.filter(p => p.skillId !== skillId)
    this.scheduleSave()
  }

  /** Reset a single permission back to 'ask' */
  public resetPermission(skillId: string, tool: SkillToolPermission): void {
    this.state.permissions = this.state.permissions.filter(
      p => !(p.skillId === skillId && p.tool === tool)
    )
    this.scheduleSave()
  }

  // ─── KAN-290: Audit Log ─────────────────────────────────────────────────

  /** Record a tool execution decision in the audit log */
  public addAuditLogEntry(entry: ToolAuditLogEntry): void {
    this.state.auditLog.push(entry)
    if (this.state.auditLog.length > MAX_AUDIT_LOG_ENTRIES) {
      this.state.auditLog = this.state.auditLog.slice(-MAX_AUDIT_LOG_ENTRIES)
    }
    this.scheduleSave()
  }

  /** Get recent audit log entries */
  public getAuditLog(limit?: number): ToolAuditLogEntry[] {
    const entries = [...this.state.auditLog]
    if (limit && limit > 0) {
      return entries.slice(-limit)
    }
    return entries
  }

  /** Get audit log entries for a specific skill */
  public getAuditLogForSkill(skillId: string): ToolAuditLogEntry[] {
    return this.state.auditLog.filter(e => e.skillId === skillId)
  }

  /** Clear the entire audit log */
  public clearAuditLog(): void {
    this.state.auditLog = []
    this.scheduleSave()
  }

  // ─── KAN-291: Skill Execution History ───────────────────────────────────

  /** Record a skill execution session (one per prompt) */
  public addExecutionRecord(record: SkillExecutionRecord): void {
    this.state.executionHistory.push(record)
    if (this.state.executionHistory.length > MAX_EXECUTION_HISTORY) {
      this.state.executionHistory = this.state.executionHistory.slice(-MAX_EXECUTION_HISTORY)
    }
    this.scheduleSave()
  }

  /** Get recent execution history */
  public getExecutionHistory(limit?: number): SkillExecutionRecord[] {
    const entries = [...this.state.executionHistory]
    if (limit && limit > 0) {
      return entries.slice(-limit)
    }
    return entries
  }

  /** Clear execution history */
  public clearExecutionHistory(): void {
    this.state.executionHistory = []
    this.scheduleSave()
  }

  // ─── KAN-292: API Settings ──────────────────────────────────────────────

  /** Get current API settings (returns defaults if not configured) */
  public getApiSettings(): SkillsApiSettings {
    return this.state.apiSettings || { baseUrl: '' }
  }

  /** Update API settings */
  public setApiSettings(settings: SkillsApiSettings): void {
    this.state.apiSettings = settings
    this.scheduleSave()
  }

  /** Mark the last successful sync timestamp */
  public updateLastSync(): void {
    if (!this.state.apiSettings) {
      this.state.apiSettings = { baseUrl: '' }
    }
    this.state.apiSettings.lastSyncAt = Date.now()
    this.scheduleSave()
  }

  /** Merge remote skills into local state (upsert by source=api + name match) */
  public mergeRemoteSkills(remoteSkills: Skill[]): { added: number; updated: number } {
    let added = 0
    let updated = 0
    for (const remote of remoteSkills) {
      const existing = this.state.skills.find(
        s => (s.source === 'api' && s.id === remote.id) ||
             (s.source === 'api' && s.name === remote.name),
      )
      if (existing) {
        Object.assign(existing, {
          ...remote,
          id: existing.id,
          enabled: existing.enabled,
        })
        existing.updated_at = Date.now()
        updated++
      } else {
        this.state.skills.push({
          ...remote,
          source: 'api',
          created_at: remote.created_at || Date.now(),
          updated_at: Date.now(),
        })
        added++
      }
    }
    if (added > 0 || updated > 0) {
      this.scheduleSave()
    }
    return { added, updated }
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private load(): SkillsState {
    try {
      if (!fs.existsSync(SKILLS_DIR)) {
        fs.mkdirSync(SKILLS_DIR, { recursive: true })
      }

      if (fs.existsSync(SKILLS_FILE)) {
        const stat = fs.statSync(SKILLS_FILE)
        if (stat.size > MAX_FILE_SIZE) {
          console.error('[SkillsStorageManager] Skills file exceeds size limit, resetting')
          return { skills: [], permissions: [], auditLog: [], executionHistory: [], version: SKILLS_VERSION }
        }

        const data = fs.readFileSync(SKILLS_FILE, 'utf-8')
        const state = JSON.parse(data) as SkillsState

        if (state.version !== SKILLS_VERSION) {
          return this.migrate(state)
        }

        return { ...state, permissions: state.permissions || [], auditLog: state.auditLog || [], executionHistory: state.executionHistory || [] }
      }
    } catch (error) {
      console.error('[SkillsStorageManager] Failed to load skills:', error)
    }

    return { skills: [], permissions: [], auditLog: [], executionHistory: [], version: SKILLS_VERSION }
  }

  private save(): void {
    try {
      if (!fs.existsSync(SKILLS_DIR)) {
        fs.mkdirSync(SKILLS_DIR, { recursive: true })
      }
      const data = JSON.stringify(this.state, null, 2)
      fs.writeFileSync(SKILLS_FILE, data, 'utf-8')
    } catch (error) {
      console.error('[SkillsStorageManager] Failed to save skills:', error)
    }
  }

  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }
    this.saveDebounceTimer = setTimeout(() => this.save(), this.SAVE_DEBOUNCE_MS)
  }

  /** Force an immediate save (for shutdown/cleanup) */
  public flushSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
      this.saveDebounceTimer = null
    }
    this.save()
  }

  private migrate(state: SkillsState): SkillsState {
    const migrated = {
      ...state,
      permissions: state.permissions || [],
      auditLog: state.auditLog || [],
      executionHistory: state.executionHistory || [],
      version: SKILLS_VERSION,
    }
    this.scheduleSave()
    return migrated
  }

  /** Expose state for testing */
  public getState(): SkillsState {
    return { ...this.state }
  }
}

// ─── Shared utility (also used by legacy workspace.ts) ────────────────────────

export function parseFrontmatter(raw: string): { description?: string; alwaysApply?: boolean; content: string } {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/
  const match = raw.match(fmRegex)
  if (!match) return { content: raw.trim() }

  const yaml = match[1]
  const content = match[2].trim()
  let description: string | undefined
  let alwaysApply: boolean | undefined

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('description:'))
      description = trimmed.slice('description:'.length).trim().replace(/^["']|["']$/g, '')
    if (trimmed.startsWith('alwaysApply:'))
      alwaysApply = trimmed.slice('alwaysApply:'.length).trim().toLowerCase() === 'true'
  }
  return { description, alwaysApply, content }
}

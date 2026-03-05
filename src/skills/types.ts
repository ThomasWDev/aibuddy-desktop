/**
 * Skills Data Model — KAN-282, KAN-287, KAN-288, KAN-289, KAN-290, KAN-291, KAN-292
 *
 * Defines the schema for AI skills (prompt modifiers) stored locally.
 * Follows the same pattern as ChatThread / ChatMessage in history/types.ts.
 */

export type SkillScope = 'global' | 'project'
export type SkillVisibility = 'private' | 'team'
export type SkillExecutionMode = 'always' | 'manual' | 'on_demand'
export type SkillSource = 'local' | 'marketplace' | 'builtin' | 'api'
export type SkillToolPermission = 'filesystem' | 'terminal' | 'git' | 'aws_cli' | 'docker'

export interface Skill {
  /** Unique identifier (base64url random, like thread IDs) */
  id: string
  /** Human-readable skill name */
  name: string
  /** Brief description of what this skill does */
  description: string
  /** The prompt template / instructions injected into system prompt */
  prompt_template: string
  /** Whether this skill is active and injected into prompts */
  enabled: boolean
  /** Scope: 'global' applies everywhere, 'project' applies to one workspace */
  scope: SkillScope
  /** Who created this skill ('system' for built-ins, 'user' for custom) */
  created_by: string
  /** Unix timestamp (ms) when this skill was created */
  created_at: number
  /** Unix timestamp (ms) when this skill was last updated */
  updated_at: number
  /** Whether this is a built-in skill that cannot be deleted */
  builtin?: boolean
  /** Visibility: 'private' = this user only, 'team' = shareable */
  visibility?: SkillVisibility
  /** Execution mode: 'always' = every prompt, 'manual' = user triggers, 'on_demand' = AI decides */
  execution_mode?: SkillExecutionMode
  /** Ordering weight for injection priority (lower = first, higher-priority skill wins conflicts) */
  order?: number
  /** Semantic tags for conflict detection — skills sharing tags are flagged as conflicting */
  tags?: string[]
  /** Where this skill came from: local (user-created), marketplace (installed), builtin */
  source?: SkillSource
  /** Catalog ID if installed from marketplace — used to check for updates */
  catalog_id?: string
  /** Tools this skill is authorized to use (requires user confirmation) */
  allowed_tools?: SkillToolPermission[]
  /** Original filename if migrated from .aibuddy/rules/ legacy format */
  legacy_filename?: string
}

/** A skill available in the marketplace catalog (not yet installed) */
export interface CatalogSkill {
  catalog_id: string
  name: string
  description: string
  prompt_template: string
  author: string
  tags: string[]
  category: string
  icon: string
  scope: SkillScope
  execution_mode: SkillExecutionMode
  allowed_tools?: SkillToolPermission[]
}

/** Request to execute a tool on behalf of a skill */
export interface ToolExecutionRequest {
  skillId: string
  tool: SkillToolPermission
  action: string
  params: Record<string, string>
}

/** Result from a tool execution */
export interface ToolExecutionResult {
  success: boolean
  output: string
  error?: string
  tool: SkillToolPermission
  action: string
  durationMs: number
}

// ─── KAN-290: Permission System ──────────────────────────────────────────────

/** User's stored preference for a skill+tool combination */
export type PermissionLevel = 'always_allow' | 'always_deny' | 'ask'

/** A persisted permission preference entry (skill + tool → level) */
export interface PermissionEntry {
  skillId: string
  tool: SkillToolPermission
  level: PermissionLevel
  /** When this preference was set */
  grantedAt: number
}

/** User's decision from the permission dialog */
export type PermissionDecision = 'allow_once' | 'always_allow' | 'deny' | 'always_deny'

/** Audit log entry for every tool execution decision */
export interface ToolAuditLogEntry {
  timestamp: number
  skillId: string
  skillName: string
  tool: SkillToolPermission
  action: string
  params: Record<string, string>
  decision: PermissionDecision | 'auto_allowed' | 'auto_denied'
  success?: boolean
  error?: string
  durationMs?: number
}

// ─── KAN-291: Skill Execution Logs ───────────────────────────────────────────

/** A single skill's evaluation outcome within a prompt processing session */
export interface SkillExecutionEntry {
  skillId: string
  skillName: string
  execution_mode: SkillExecutionMode
  applied: boolean
  reason: string
}

/** A complete record of one prompt's skill processing (which skills ran, which were skipped) */
export interface SkillExecutionRecord {
  id: string
  timestamp: number
  totalEvaluated: number
  totalApplied: number
  processingTimeMs: number
  conflictCount: number
  entries: SkillExecutionEntry[]
}

// ─── KAN-292: API Configuration ──────────────────────────────────────────────

/** Persisted API connection settings */
export interface SkillsApiSettings {
  /** Base URL for the skills REST API (empty = local-only mode) */
  baseUrl: string
  /** Optional bearer token for authenticated APIs */
  apiKey?: string
  /** Last successful sync timestamp (ms) */
  lastSyncAt?: number
  /** Whether auto-sync on app start is enabled */
  autoSync?: boolean
}

export interface SkillsState {
  /** All skills (both global and project-scoped) */
  skills: Skill[]
  /** Stored permission preferences for skill+tool pairs */
  permissions: PermissionEntry[]
  /** Audit log of tool execution decisions (capped) */
  auditLog: ToolAuditLogEntry[]
  /** Per-prompt skill execution history (capped) */
  executionHistory: SkillExecutionRecord[]
  /** Remote API connection settings */
  apiSettings?: SkillsApiSettings
  /** Schema version for future migrations */
  version: number
}

export const SKILLS_VERSION = 4

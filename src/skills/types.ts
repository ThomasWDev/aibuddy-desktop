/**
 * Skills Data Model — KAN-282, KAN-287, KAN-288
 *
 * Defines the schema for AI skills (prompt modifiers) stored locally.
 * Follows the same pattern as ChatThread / ChatMessage in history/types.ts.
 */

export type SkillScope = 'global' | 'project'
export type SkillVisibility = 'private' | 'team'
export type SkillExecutionMode = 'always' | 'manual' | 'on_demand'
export type SkillSource = 'local' | 'marketplace' | 'builtin'

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
}

export interface SkillsState {
  /** All skills (both global and project-scoped) */
  skills: Skill[]
  /** Schema version for future migrations */
  version: number
}

export const SKILLS_VERSION = 1

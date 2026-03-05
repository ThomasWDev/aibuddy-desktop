/**
 * Skills Data Model — KAN-282
 *
 * Defines the schema for AI skills (prompt modifiers) stored locally.
 * Follows the same pattern as ChatThread / ChatMessage in history/types.ts.
 */

export type SkillScope = 'global' | 'project'

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
  /** Ordering weight for injection priority (lower = first) */
  order?: number
  /** Original filename if migrated from .aibuddy/rules/ legacy format */
  legacy_filename?: string
}

export interface SkillsState {
  /** All skills (both global and project-scoped) */
  skills: Skill[]
  /** Schema version for future migrations */
  version: number
}

export const SKILLS_VERSION = 1

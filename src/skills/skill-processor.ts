/**
 * Skill Execution Pipeline — KAN-286, KAN-287, KAN-289
 *
 * Processes skills before prompt injection. Filters by execution_mode,
 * orders by priority, detects conflicts via shared tags, captures
 * execution logs, and tracks tool permissions for tool-enabled skills.
 *
 * Flow: User Prompt → SkillProcessor → Prompt Refinement → LLM → Response
 */

import type { Skill, SkillExecutionMode, SkillToolPermission } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkillExecutionLogEntry {
  skillId: string
  skillName: string
  execution_mode: SkillExecutionMode
  applied: boolean
  reason: string
  timestamp: number
}

export interface ConflictPair {
  skillA: { id: string; name: string; order: number }
  skillB: { id: string; name: string; order: number }
  sharedTags: string[]
  resolution: string
}

export interface SkillProcessorResult {
  /** Skills that should be injected into the system prompt */
  activeSkills: ProcessedSkill[]
  /** Execution log for debugging/auditing */
  executionLog: SkillExecutionLogEntry[]
  /** Detected conflicts between active skills */
  conflicts: ConflictPair[]
  /** Total skills evaluated */
  totalEvaluated: number
  /** Skills that were applied */
  totalApplied: number
  /** Processing time in ms */
  processingTimeMs: number
}

export interface ProcessedSkill {
  id: string
  name: string
  description: string
  prompt_template: string
  builtin?: boolean
  execution_mode: SkillExecutionMode
  order: number
  tags?: string[]
  allowed_tools?: SkillToolPermission[]
}

// ─── Conflict Detection ───────────────────────────────────────────────────────

/**
 * Detect conflicts between active skills by finding shared tags.
 * Higher-priority (lower order) skill wins the conflict.
 */
export function detectConflicts(skills: ProcessedSkill[]): ConflictPair[] {
  const conflicts: ConflictPair[] = []
  const seen = new Set<string>()

  for (let i = 0; i < skills.length; i++) {
    const a = skills[i]
    if (!a.tags || a.tags.length === 0) continue

    for (let j = i + 1; j < skills.length; j++) {
      const b = skills[j]
      if (!b.tags || b.tags.length === 0) continue

      const pairKey = [a.id, b.id].sort().join(':')
      if (seen.has(pairKey)) continue

      const shared = a.tags.filter(t => b.tags!.includes(t))
      if (shared.length === 0) continue

      seen.add(pairKey)

      const winner = a.order <= b.order ? a : b
      conflicts.push({
        skillA: { id: a.id, name: a.name, order: a.order },
        skillB: { id: b.id, name: b.name, order: b.order },
        sharedTags: shared,
        resolution: `"${winner.name}" takes precedence (order ${winner.order})`,
      })
    }
  }

  return conflicts
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

/**
 * Process skills through the execution pipeline.
 * Filters by enabled + execution_mode, orders by priority, detects conflicts, logs decisions.
 */
export function processSkills(
  skills: Skill[],
  options?: {
    /** Manually triggered skill IDs (for execution_mode='manual') */
    manualTriggerIds?: string[]
    /** Whether to include on_demand skills (AI-requested) */
    includeOnDemand?: boolean
  }
): SkillProcessorResult {
  const start = performance.now()
  const log: SkillExecutionLogEntry[] = []
  const active: ProcessedSkill[] = []
  const manualIds = new Set(options?.manualTriggerIds || [])

  const sorted = [...skills].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

  for (const skill of sorted) {
    const mode = skill.execution_mode || 'always'
    const entry: SkillExecutionLogEntry = {
      skillId: skill.id,
      skillName: skill.name,
      execution_mode: mode,
      applied: false,
      reason: '',
      timestamp: Date.now(),
    }

    if (!skill.enabled) {
      entry.reason = 'disabled'
      log.push(entry)
      continue
    }

    switch (mode) {
      case 'always':
        entry.applied = true
        entry.reason = 'auto (always active)'
        break

      case 'manual':
        if (manualIds.has(skill.id)) {
          entry.applied = true
          entry.reason = 'manually triggered'
        } else {
          entry.reason = 'skipped (manual, not triggered)'
        }
        break

      case 'on_demand':
        if (options?.includeOnDemand) {
          entry.applied = true
          entry.reason = 'included (on_demand requested)'
        } else {
          entry.reason = 'skipped (on_demand, not requested)'
        }
        break

      default:
        entry.reason = `unknown execution_mode: ${mode}`
    }

    log.push(entry)

    if (entry.applied) {
      active.push({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        prompt_template: skill.prompt_template,
        builtin: skill.builtin,
        execution_mode: mode,
        order: skill.order ?? 999,
        tags: skill.tags,
        allowed_tools: skill.allowed_tools,
      })
    }
  }

  const conflicts = detectConflicts(active)

  return {
    activeSkills: active,
    executionLog: log,
    conflicts,
    totalEvaluated: sorted.length,
    totalApplied: active.length,
    processingTimeMs: Math.round((performance.now() - start) * 100) / 100,
  }
}

// ─── Conversion ───────────────────────────────────────────────────────────────

/**
 * Convert processed skills to the projectRules format expected by generateSystemPrompt.
 */
export function toProjectRules(processed: ProcessedSkill[]): Array<{
  filename: string
  description: string
  alwaysApply: boolean
  content: string
  builtin?: boolean
  allowed_tools?: string[]
}> {
  return processed.map(s => ({
    filename: s.id,
    description: s.description || s.name,
    alwaysApply: true,
    content: s.prompt_template,
    builtin: s.builtin,
    allowed_tools: s.allowed_tools,
  }))
}

// ─── Tool Permission Aggregation ──────────────────────────────────────────────

/**
 * Collect all unique tool permissions from active skills.
 * Used to inform the system prompt about available tools.
 */
export function collectToolPermissions(skills: ProcessedSkill[]): SkillToolPermission[] {
  const all = new Set<SkillToolPermission>()
  for (const s of skills) {
    if (s.allowed_tools) {
      for (const t of s.allowed_tools) all.add(t)
    }
  }
  return Array.from(all)
}

/**
 * Get skills that have tool permissions (tool-enabled skills).
 */
export function getToolEnabledSkills(skills: ProcessedSkill[]): ProcessedSkill[] {
  return skills.filter(s => s.allowed_tools && s.allowed_tools.length > 0)
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format execution log as a human-readable summary (for console/debugging).
 */
export function formatExecutionLog(result: SkillProcessorResult): string {
  const lines = [
    `[SkillProcessor] ${result.totalApplied}/${result.totalEvaluated} skills applied (${result.processingTimeMs}ms)`,
  ]
  for (const entry of result.executionLog) {
    const icon = entry.applied ? '✓' : '·'
    lines.push(`  ${icon} ${entry.skillName} [${entry.execution_mode}] — ${entry.reason}`)
  }
  if (result.conflicts.length > 0) {
    lines.push(`  ⚠ ${result.conflicts.length} conflict(s) detected:`)
    for (const c of result.conflicts) {
      lines.push(`    "${c.skillA.name}" ↔ "${c.skillB.name}" [${c.sharedTags.join(', ')}] → ${c.resolution}`)
    }
  }
  return lines.join('\n')
}

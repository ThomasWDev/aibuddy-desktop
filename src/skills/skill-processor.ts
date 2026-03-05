/**
 * Skill Execution Pipeline — KAN-286
 *
 * Processes skills before prompt injection. Filters by execution_mode,
 * orders by priority, and captures execution logs.
 *
 * Flow: User Prompt → SkillProcessor → Prompt Refinement → LLM → Response
 */

import type { Skill, SkillExecutionMode } from './types'

export interface SkillExecutionLogEntry {
  skillId: string
  skillName: string
  execution_mode: SkillExecutionMode
  applied: boolean
  reason: string
  timestamp: number
}

export interface SkillProcessorResult {
  /** Skills that should be injected into the system prompt */
  activeSkills: ProcessedSkill[]
  /** Execution log for debugging/auditing */
  executionLog: SkillExecutionLogEntry[]
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
}

/**
 * Process skills through the execution pipeline.
 * Filters by enabled + execution_mode, orders by priority, logs decisions.
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
      })
    }
  }

  return {
    activeSkills: active,
    executionLog: log,
    totalEvaluated: sorted.length,
    totalApplied: active.length,
    processingTimeMs: Math.round((performance.now() - start) * 100) / 100,
  }
}

/**
 * Convert processed skills to the projectRules format expected by generateSystemPrompt.
 */
export function toProjectRules(processed: ProcessedSkill[]): Array<{
  filename: string
  description: string
  alwaysApply: boolean
  content: string
  builtin?: boolean
}> {
  return processed.map(s => ({
    filename: s.id,
    description: s.description || s.name,
    alwaysApply: true, // already filtered — all processed skills are active
    content: s.prompt_template,
    builtin: s.builtin,
  }))
}

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
  return lines.join('\n')
}

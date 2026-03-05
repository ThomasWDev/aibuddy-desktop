/**
 * KAN-293: Context-Aware Skills — Unit tests
 *
 * Tests runtime behavior of:
 * 1. evaluateContextTriggers
 * 2. processSkills with context parameter
 * 3. SkillsStorageManager create/update with context_triggers
 */

import { evaluateContextTriggers, processSkills } from '../../src/skills/skill-processor'
import { SkillsStorageManager } from '../../src/skills/skills-manager'
import type { Skill, SkillContextTrigger, SkillContext } from '../../src/skills/types'
import { SKILLS_VERSION } from '../../src/skills/types'

describe('KAN-293: Context-Aware Skills — Unit Tests', () => {
  // ─── evaluateContextTriggers ────────────────────────────────────────────

  describe('evaluateContextTriggers', () => {
    it('returns null when triggers are undefined', () => {
      expect(evaluateContextTriggers(undefined, { projectType: 'React' })).toBeNull()
    })

    it('returns null when context is undefined', () => {
      expect(evaluateContextTriggers({ keywords: ['test'] }, undefined)).toBeNull()
    })

    it('returns null when both are undefined', () => {
      expect(evaluateContextTriggers(undefined, undefined)).toBeNull()
    })

    it('matches project_types against projectType (case-insensitive)', () => {
      const result = evaluateContextTriggers(
        { project_types: ['react'] },
        { projectType: 'React/Next.js - Run: npm run dev' },
      )
      expect(result).toContain('project type matches')
      expect(result).toContain('react')
    })

    it('does not match project_types when projectType is missing', () => {
      const result = evaluateContextTriggers(
        { project_types: ['react'] },
        { userMessage: 'hello' },
      )
      expect(result).toBeNull()
    })

    it('matches file_patterns against workspaceFiles', () => {
      const result = evaluateContextTriggers(
        { file_patterns: ['Dockerfile'] },
        { workspaceFiles: ['package.json', 'Dockerfile', 'README.md'] },
      )
      expect(result).toContain('workspace contains')
      expect(result).toContain('Dockerfile')
    })

    it('matches file_patterns case-insensitively', () => {
      const result = evaluateContextTriggers(
        { file_patterns: ['dockerfile'] },
        { workspaceFiles: ['Dockerfile'] },
      )
      expect(result).toContain('workspace contains')
    })

    it('matches file_patterns with path prefix', () => {
      const result = evaluateContextTriggers(
        { file_patterns: ['pom.xml'] },
        { workspaceFiles: ['src/pom.xml'] },
      )
      expect(result).toContain('workspace contains')
    })

    it('does not match file_patterns when workspaceFiles is missing', () => {
      const result = evaluateContextTriggers(
        { file_patterns: ['Dockerfile'] },
        { projectType: 'Node.js' },
      )
      expect(result).toBeNull()
    })

    it('matches keywords against userMessage', () => {
      const result = evaluateContextTriggers(
        { keywords: ['deploy', 'docker'] },
        { userMessage: 'Help me deploy this app using Docker' },
      )
      expect(result).toContain('message contains')
      expect(result).toContain('deploy')
    })

    it('matches keywords case-insensitively', () => {
      const result = evaluateContextTriggers(
        { keywords: ['SQL'] },
        { userMessage: 'optimize this sql query' },
      )
      expect(result).toContain('message contains')
    })

    it('does not match keywords when userMessage is missing', () => {
      const result = evaluateContextTriggers(
        { keywords: ['deploy'] },
        { projectType: 'React' },
      )
      expect(result).toBeNull()
    })

    it('returns first match found (project_type > file_pattern > keyword)', () => {
      const result = evaluateContextTriggers(
        { project_types: ['react'], file_patterns: ['Dockerfile'], keywords: ['deploy'] },
        { projectType: 'React/Next.js', workspaceFiles: ['Dockerfile'], userMessage: 'deploy this' },
      )
      expect(result).toContain('project type matches')
    })

    it('falls through to file_patterns when project_types do not match', () => {
      const result = evaluateContextTriggers(
        { project_types: ['java'], file_patterns: ['Dockerfile'], keywords: ['deploy'] },
        { projectType: 'React/Next.js', workspaceFiles: ['Dockerfile'], userMessage: 'deploy this' },
      )
      expect(result).toContain('workspace contains')
    })

    it('falls through to keywords when neither project_types nor file_patterns match', () => {
      const result = evaluateContextTriggers(
        { project_types: ['java'], file_patterns: ['pom.xml'], keywords: ['deploy'] },
        { projectType: 'React/Next.js', workspaceFiles: ['package.json'], userMessage: 'deploy this' },
      )
      expect(result).toContain('message contains')
    })

    it('returns null when no triggers match', () => {
      const result = evaluateContextTriggers(
        { project_types: ['java'], file_patterns: ['pom.xml'], keywords: ['maven'] },
        { projectType: 'React/Next.js', workspaceFiles: ['package.json'], userMessage: 'fix this bug' },
      )
      expect(result).toBeNull()
    })

    it('handles empty trigger arrays', () => {
      const result = evaluateContextTriggers(
        { project_types: [], file_patterns: [], keywords: [] },
        { projectType: 'React', workspaceFiles: ['Dockerfile'], userMessage: 'deploy' },
      )
      expect(result).toBeNull()
    })
  })

  // ─── processSkills with context ─────────────────────────────────────────

  describe('processSkills with context', () => {
    function makeSkill(overrides: Partial<Skill> = {}): Skill {
      return {
        id: 'test', name: 'Test', description: 'test', prompt_template: 'test',
        enabled: true, scope: 'global', created_by: 'user', created_at: Date.now(),
        updated_at: Date.now(), execution_mode: 'on_demand',
        ...overrides,
      }
    }

    it('activates on_demand skill when context triggers match', () => {
      const skill = makeSkill({
        id: 'docker-skill', name: 'Docker Skill',
        context_triggers: { file_patterns: ['Dockerfile'] },
      })
      const result = processSkills([skill], {
        context: { workspaceFiles: ['Dockerfile', 'package.json'] },
      })
      expect(result.totalApplied).toBe(1)
      expect(result.executionLog[0].applied).toBe(true)
      expect(result.executionLog[0].reason).toContain('context')
    })

    it('skips on_demand skill when context triggers do not match', () => {
      const skill = makeSkill({
        id: 'docker-skill', name: 'Docker Skill',
        context_triggers: { file_patterns: ['Dockerfile'] },
      })
      const result = processSkills([skill], {
        context: { workspaceFiles: ['package.json'] },
      })
      expect(result.totalApplied).toBe(0)
      expect(result.executionLog[0].applied).toBe(false)
      expect(result.executionLog[0].reason).toContain('no context match')
    })

    it('activates on_demand skill via keyword in context', () => {
      const skill = makeSkill({
        id: 'sql-skill', name: 'SQL Optimizer',
        context_triggers: { keywords: ['sql', 'query'] },
      })
      const result = processSkills([skill], {
        context: { userMessage: 'optimize this SQL query for better performance' },
      })
      expect(result.totalApplied).toBe(1)
      expect(result.executionLog[0].reason).toContain('message contains')
    })

    it('activates on_demand skill via project type in context', () => {
      const skill = makeSkill({
        id: 'react-skill', name: 'React Best Practices',
        context_triggers: { project_types: ['react'] },
      })
      const result = processSkills([skill], {
        context: { projectType: 'React/Next.js - Run: npm run dev' },
      })
      expect(result.totalApplied).toBe(1)
      expect(result.executionLog[0].reason).toContain('project type matches')
    })

    it('still activates on_demand via includeOnDemand flag even without triggers', () => {
      const skill = makeSkill({ id: 'no-triggers' })
      const result = processSkills([skill], { includeOnDemand: true })
      expect(result.totalApplied).toBe(1)
      expect(result.executionLog[0].reason).toContain('on_demand requested')
    })

    it('context match takes priority over includeOnDemand flag', () => {
      const skill = makeSkill({
        context_triggers: { keywords: ['deploy'] },
      })
      const result = processSkills([skill], {
        includeOnDemand: true,
        context: { userMessage: 'deploy this' },
      })
      expect(result.executionLog[0].reason).toContain('context')
    })

    it('always skills unaffected by context', () => {
      const skill = makeSkill({ execution_mode: 'always' })
      const result = processSkills([skill], {
        context: { projectType: 'React' },
      })
      expect(result.totalApplied).toBe(1)
      expect(result.executionLog[0].reason).toContain('always active')
    })

    it('processes mixed execution modes with context', () => {
      const skills = [
        makeSkill({ id: '1', name: 'Always', execution_mode: 'always' }),
        makeSkill({ id: '2', name: 'Docker', execution_mode: 'on_demand', context_triggers: { file_patterns: ['Dockerfile'] } }),
        makeSkill({ id: '3', name: 'Java', execution_mode: 'on_demand', context_triggers: { project_types: ['java'] } }),
        makeSkill({ id: '4', name: 'Manual', execution_mode: 'manual' }),
      ]
      const result = processSkills(skills, {
        context: { workspaceFiles: ['Dockerfile'], projectType: 'Node.js' },
      })
      expect(result.totalApplied).toBe(2)
      const applied = result.executionLog.filter(e => e.applied)
      expect(applied.map(a => a.skillName)).toEqual(['Always', 'Docker'])
    })
  })

  // ─── SkillsStorageManager ───────────────────────────────────────────────

  describe('SkillsStorageManager context_triggers', () => {
    let mgr: SkillsStorageManager

    beforeEach(() => {
      SkillsStorageManager['instance'] = undefined as any
      mgr = SkillsStorageManager.getInstance()
    })

    it('createSkill stores context_triggers', () => {
      const skill = mgr.createSkill({
        name: 'Docker Helper', description: 'Helps with Docker',
        prompt_template: 'test', scope: 'project',
        execution_mode: 'on_demand',
        context_triggers: { file_patterns: ['Dockerfile'] },
      })
      expect(skill.context_triggers).toBeDefined()
      expect(skill.context_triggers!.file_patterns).toEqual(['Dockerfile'])
    })

    it('updateSkill updates context_triggers', () => {
      const skill = mgr.createSkill({
        name: 'Test', description: 'test', prompt_template: 'test', scope: 'global',
      })
      const updated = mgr.updateSkill(skill.id, {
        context_triggers: { keywords: ['deploy'] },
      })
      expect(updated).not.toBeNull()
      expect(updated!.context_triggers!.keywords).toEqual(['deploy'])
    })
  })

  // ─── SKILLS_VERSION ────────────────────────────────────────────────────

  describe('SKILLS_VERSION', () => {
    it('is version 5 for KAN-293', () => {
      expect(SKILLS_VERSION).toBe(5)
    })
  })
})

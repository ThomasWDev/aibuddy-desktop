/**
 * KAN-289: Skill Tool Runner — Unit tests
 *
 * Tests the actual runtime behavior of the tool runner functions
 * with real function imports (no code duplication).
 */

import {
  checkToolPermission,
  validateWorkspacePath,
  getSupportedActions,
  getAllToolTypes,
  getToolLabel,
  executeToolRequest,
} from '../../src/skills/skill-tool-runner'
import type { SkillToolPermission, ToolExecutionRequest } from '../../src/skills/types'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

describe('KAN-289: Skill Tool Runner — Unit Tests', () => {
  // ─── checkToolPermission ───────────────────────────────────────────────

  describe('checkToolPermission', () => {
    it('returns denied when allowedTools is undefined', () => {
      const result = checkToolPermission(undefined, 'terminal')
      expect(result.allowed).toBe(false)
      expect(result.reason).toMatch(/no tool permissions/)
    })

    it('returns denied when allowedTools is empty', () => {
      const result = checkToolPermission([], 'terminal')
      expect(result.allowed).toBe(false)
    })

    it('returns denied when tool is not in allowed list', () => {
      const result = checkToolPermission(['filesystem', 'git'], 'terminal')
      expect(result.allowed).toBe(false)
      expect(result.reason).toMatch(/not authorized/)
    })

    it('returns allowed when tool is in list', () => {
      const result = checkToolPermission(['terminal', 'git'], 'terminal')
      expect(result.allowed).toBe(true)
    })

    it('returns allowed for each tool type', () => {
      const tools: SkillToolPermission[] = ['filesystem', 'terminal', 'git', 'aws_cli', 'docker']
      for (const tool of tools) {
        expect(checkToolPermission([tool], tool).allowed).toBe(true)
      }
    })
  })

  // ─── validateWorkspacePath ─────────────────────────────────────────────

  describe('validateWorkspacePath', () => {
    const workspace = '/Users/test/project'

    it('allows paths within workspace', () => {
      expect(validateWorkspacePath(workspace, 'src/index.ts')).toBe(true)
    })

    it('allows nested paths within workspace', () => {
      expect(validateWorkspacePath(workspace, 'src/deep/nested/file.ts')).toBe(true)
    })

    it('allows current directory', () => {
      expect(validateWorkspacePath(workspace, '.')).toBe(true)
    })

    it('rejects parent directory traversal', () => {
      expect(validateWorkspacePath(workspace, '../../etc/passwd')).toBe(false)
    })

    it('rejects absolute paths outside workspace', () => {
      expect(validateWorkspacePath(workspace, '/etc/passwd')).toBe(false)
    })
  })

  // ─── getSupportedActions ───────────────────────────────────────────────

  describe('getSupportedActions', () => {
    it('returns filesystem actions', () => {
      const actions = getSupportedActions('filesystem')
      expect(actions).toContain('read_file')
      expect(actions).toContain('list_directory')
      expect(actions).toContain('file_exists')
      expect(actions).toContain('file_stats')
    })

    it('returns terminal actions', () => {
      const actions = getSupportedActions('terminal')
      expect(actions).toContain('execute')
    })

    it('returns git actions', () => {
      const actions = getSupportedActions('git')
      expect(actions).toContain('status')
      expect(actions).toContain('diff')
      expect(actions).toContain('log')
      expect(actions).toContain('branch')
    })

    it('returns aws_cli actions', () => {
      const actions = getSupportedActions('aws_cli')
      expect(actions).toContain('execute')
    })

    it('returns docker actions', () => {
      const actions = getSupportedActions('docker')
      expect(actions).toContain('ps')
      expect(actions).toContain('images')
      expect(actions).toContain('execute')
    })

    it('returns empty for unknown tool', () => {
      expect(getSupportedActions('unknown' as any)).toEqual([])
    })
  })

  // ─── getAllToolTypes ───────────────────────────────────────────────────

  describe('getAllToolTypes', () => {
    it('returns all 5 tool types', () => {
      const types = getAllToolTypes()
      expect(types).toHaveLength(5)
      expect(types).toContain('filesystem')
      expect(types).toContain('terminal')
      expect(types).toContain('git')
      expect(types).toContain('aws_cli')
      expect(types).toContain('docker')
    })
  })

  // ─── getToolLabel ─────────────────────────────────────────────────────

  describe('getToolLabel', () => {
    it('returns label for filesystem', () => {
      expect(getToolLabel('filesystem')).toMatch(/Filesystem/)
    })

    it('returns label for terminal', () => {
      expect(getToolLabel('terminal')).toMatch(/Terminal/)
    })

    it('returns label for git', () => {
      expect(getToolLabel('git')).toMatch(/Git/)
    })

    it('returns label for aws_cli', () => {
      expect(getToolLabel('aws_cli')).toMatch(/AWS/)
    })

    it('returns label for docker', () => {
      expect(getToolLabel('docker')).toMatch(/Docker/)
    })
  })

  // ─── executeToolRequest — permission failures ─────────────────────────

  describe('executeToolRequest — permission failures', () => {
    it('rejects when skill has no tool permissions', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'terminal', action: 'execute', params: { command: 'echo hi' } },
        undefined,
        '/tmp'
      )
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/no tool permissions/)
    })

    it('rejects when tool is not in allowed list', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'terminal', action: 'execute', params: { command: 'echo hi' } },
        ['filesystem'],
        '/tmp'
      )
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not authorized/)
    })

    it('rejects unsupported action', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'filesystem', action: 'delete_file', params: {} },
        ['filesystem'],
        '/tmp'
      )
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Unsupported action/)
    })

    it('returns durationMs in result', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'terminal', action: 'execute', params: { command: 'echo hi' } },
        undefined,
        '/tmp'
      )
      expect(typeof result.durationMs).toBe('number')
    })

    it('includes tool and action in result', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'terminal', action: 'execute', params: { command: 'echo hi' } },
        undefined,
        '/tmp'
      )
      expect(result.tool).toBe('terminal')
      expect(result.action).toBe('execute')
    })
  })

  // ─── executeToolRequest — filesystem tool ─────────────────────────────

  describe('executeToolRequest — filesystem tool', () => {
    const tmpDir = path.join(os.tmpdir(), `skill-tool-test-${Date.now()}`)
    const testFile = path.join(tmpDir, 'test.txt')

    beforeAll(() => {
      fs.mkdirSync(tmpDir, { recursive: true })
      fs.writeFileSync(testFile, 'hello world')
    })

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('reads a file within workspace', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'filesystem', action: 'read_file', params: { path: 'test.txt' } },
        ['filesystem'],
        tmpDir
      )
      expect(result.success).toBe(true)
      expect(result.output).toBe('hello world')
    })

    it('lists directory contents', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'filesystem', action: 'list_directory', params: { path: '.' } },
        ['filesystem'],
        tmpDir
      )
      expect(result.success).toBe(true)
      expect(result.output).toContain('test.txt')
    })

    it('checks file existence', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'filesystem', action: 'file_exists', params: { path: 'test.txt' } },
        ['filesystem'],
        tmpDir
      )
      expect(result.success).toBe(true)
      expect(result.output).toBe('true')
    })

    it('reports file_exists=false for missing file', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'filesystem', action: 'file_exists', params: { path: 'missing.txt' } },
        ['filesystem'],
        tmpDir
      )
      expect(result.success).toBe(true)
      expect(result.output).toBe('false')
    })

    it('returns file stats as JSON', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'filesystem', action: 'file_stats', params: { path: 'test.txt' } },
        ['filesystem'],
        tmpDir
      )
      expect(result.success).toBe(true)
      const stats = JSON.parse(result.output)
      expect(stats.size).toBe(11)
      expect(stats.isDirectory).toBe(false)
    })

    it('rejects path traversal', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'filesystem', action: 'read_file', params: { path: '../../etc/passwd' } },
        ['filesystem'],
        tmpDir
      )
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/traversal denied/)
    })
  })

  // ─── executeToolRequest — terminal tool ───────────────────────────────

  describe('executeToolRequest — terminal tool', () => {
    it('executes a simple command', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'terminal', action: 'execute', params: { command: 'echo hello' } },
        ['terminal'],
        '/tmp'
      )
      expect(result.success).toBe(true)
      expect(result.output.trim()).toBe('hello')
    })

    it('fails without command param', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'terminal', action: 'execute', params: {} },
        ['terminal'],
        '/tmp'
      )
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Missing.*command/)
    })
  })

  // ─── executeToolRequest — git tool ────────────────────────────────────

  describe('executeToolRequest — git tool (in this repo)', () => {
    const repoRoot = path.resolve(__dirname, '../../')

    it('runs git status', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'git', action: 'status', params: {} },
        ['git'],
        repoRoot
      )
      expect(result.success).toBe(true)
      expect(typeof result.output).toBe('string')
    })

    it('runs git log', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'git', action: 'log', params: { count: '3' } },
        ['git'],
        repoRoot
      )
      expect(result.success).toBe(true)
      expect(result.output.length).toBeGreaterThan(0)
    })

    it('runs git branch', () => {
      const result = executeToolRequest(
        { skillId: 'test', tool: 'git', action: 'branch', params: {} },
        ['git'],
        repoRoot
      )
      expect(result.success).toBe(true)
    })
  })

  // ─── collectToolPermissions + getToolEnabledSkills ────────────────────

  describe('collectToolPermissions + getToolEnabledSkills', () => {
    let collectToolPermissions: typeof import('../../src/skills/skill-processor').collectToolPermissions
    let getToolEnabledSkills: typeof import('../../src/skills/skill-processor').getToolEnabledSkills

    beforeAll(async () => {
      const mod = await import('../../src/skills/skill-processor')
      collectToolPermissions = mod.collectToolPermissions
      getToolEnabledSkills = mod.getToolEnabledSkills
    })

    it('collects unique tools from multiple skills', () => {
      const skills = [
        { id: '1', name: 'A', description: '', prompt_template: '', execution_mode: 'always' as const, order: 0, allowed_tools: ['filesystem' as const, 'git' as const] },
        { id: '2', name: 'B', description: '', prompt_template: '', execution_mode: 'always' as const, order: 1, allowed_tools: ['git' as const, 'terminal' as const] },
      ]
      const tools = collectToolPermissions(skills)
      expect(tools).toContain('filesystem')
      expect(tools).toContain('git')
      expect(tools).toContain('terminal')
      expect(new Set(tools).size).toBe(tools.length)
    })

    it('returns empty array when no skills have tools', () => {
      const skills = [
        { id: '1', name: 'A', description: '', prompt_template: '', execution_mode: 'always' as const, order: 0 },
      ]
      expect(collectToolPermissions(skills)).toEqual([])
    })

    it('filters to only tool-enabled skills', () => {
      const skills = [
        { id: '1', name: 'A', description: '', prompt_template: '', execution_mode: 'always' as const, order: 0, allowed_tools: ['filesystem' as const] },
        { id: '2', name: 'B', description: '', prompt_template: '', execution_mode: 'always' as const, order: 1 },
        { id: '3', name: 'C', description: '', prompt_template: '', execution_mode: 'always' as const, order: 2, allowed_tools: ['git' as const] },
      ]
      const toolEnabled = getToolEnabledSkills(skills)
      expect(toolEnabled).toHaveLength(2)
      expect(toolEnabled.map(s => s.id)).toEqual(['1', '3'])
    })
  })
})

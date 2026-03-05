/**
 * KAN-289: Implement Tool-Enabled Skills — Source-level TDD tests
 *
 * Validates:
 * 1. SkillToolPermission type + allowed_tools on Skill + CatalogSkill
 * 2. ToolExecutionRequest + ToolExecutionResult interfaces
 * 3. SkillToolRunner: permission checks, workspace path validation, tool execution
 * 4. Skill processor includes allowed_tools in ProcessedSkill
 * 5. IPC handler for skills:executeTool
 * 6. Preload exposes executeTool method
 * 7. System prompt advertises tool-enabled skills
 * 8. SkillsPanel tool permissions UI (create, edit, details, marketplace)
 * 9. Skill catalog has allowed_tools on relevant skills
 * 10. App.tsx passes allowed_tools through projectRules
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../../')

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8')
}

describe('KAN-289: Tool-Enabled Skills', () => {
  // ─── 1. Types ────────────────────────────────────────────────────────────

  describe('types.ts — SkillToolPermission + allowed_tools', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/types.ts') })

    it('exports SkillToolPermission type', () => {
      expect(src).toMatch(/export type SkillToolPermission/)
    })

    it('SkillToolPermission includes filesystem', () => {
      expect(src).toMatch(/SkillToolPermission.*=.*'filesystem'/)
    })

    it('SkillToolPermission includes terminal', () => {
      expect(src).toMatch(/'terminal'/)
    })

    it('SkillToolPermission includes git', () => {
      expect(src).toMatch(/'git'/)
    })

    it('SkillToolPermission includes aws_cli', () => {
      expect(src).toMatch(/'aws_cli'/)
    })

    it('SkillToolPermission includes docker', () => {
      expect(src).toMatch(/'docker'/)
    })

    it('Skill interface has allowed_tools field', () => {
      expect(src).toMatch(/allowed_tools\?:\s*SkillToolPermission\[\]/)
    })

    it('CatalogSkill interface has allowed_tools field', () => {
      const catalogMatch = src.match(/export interface CatalogSkill[\s\S]*?\n\}/)
      expect(catalogMatch).toBeTruthy()
      expect(catalogMatch![0]).toMatch(/allowed_tools\?:\s*SkillToolPermission\[\]/)
    })

    it('exports ToolExecutionRequest interface', () => {
      expect(src).toMatch(/export interface ToolExecutionRequest/)
    })

    it('ToolExecutionRequest has skillId field', () => {
      expect(src).toMatch(/ToolExecutionRequest[\s\S]*?skillId:\s*string/)
    })

    it('ToolExecutionRequest has tool field', () => {
      expect(src).toMatch(/ToolExecutionRequest[\s\S]*?tool:\s*SkillToolPermission/)
    })

    it('ToolExecutionRequest has action field', () => {
      expect(src).toMatch(/ToolExecutionRequest[\s\S]*?action:\s*string/)
    })

    it('ToolExecutionRequest has params field', () => {
      expect(src).toMatch(/ToolExecutionRequest[\s\S]*?params:\s*Record<string,\s*string>/)
    })

    it('exports ToolExecutionResult interface', () => {
      expect(src).toMatch(/export interface ToolExecutionResult/)
    })

    it('ToolExecutionResult has success field', () => {
      expect(src).toMatch(/ToolExecutionResult[\s\S]*?success:\s*boolean/)
    })

    it('ToolExecutionResult has output field', () => {
      expect(src).toMatch(/ToolExecutionResult[\s\S]*?output:\s*string/)
    })

    it('ToolExecutionResult has error field', () => {
      expect(src).toMatch(/ToolExecutionResult[\s\S]*?error\?:\s*string/)
    })

    it('ToolExecutionResult has durationMs field', () => {
      expect(src).toMatch(/ToolExecutionResult[\s\S]*?durationMs:\s*number/)
    })
  })

  // ─── 2. Skill Tool Runner ────────────────────────────────────────────────

  describe('skill-tool-runner.ts — module structure', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-tool-runner.ts') })

    it('file exists', () => {
      expect(src.length).toBeGreaterThan(100)
    })

    it('exports checkToolPermission function', () => {
      expect(src).toMatch(/export function checkToolPermission/)
    })

    it('exports validateWorkspacePath function', () => {
      expect(src).toMatch(/export function validateWorkspacePath/)
    })

    it('exports getSupportedActions function', () => {
      expect(src).toMatch(/export function getSupportedActions/)
    })

    it('exports getAllToolTypes function', () => {
      expect(src).toMatch(/export function getAllToolTypes/)
    })

    it('exports getToolLabel function', () => {
      expect(src).toMatch(/export function getToolLabel/)
    })

    it('exports executeToolRequest function', () => {
      expect(src).toMatch(/export function executeToolRequest/)
    })

    it('imports SkillToolPermission from types', () => {
      expect(src).toMatch(/import.*SkillToolPermission.*from/)
    })

    it('imports ToolExecutionRequest from types', () => {
      expect(src).toMatch(/import.*ToolExecutionRequest.*from/)
    })

    it('imports ToolExecutionResult from types', () => {
      expect(src).toMatch(/import.*ToolExecutionResult.*from/)
    })

    it('handles filesystem tool actions', () => {
      expect(src).toMatch(/read_file|list_directory|file_exists|file_stats/)
    })

    it('handles terminal tool actions', () => {
      expect(src).toMatch(/case 'terminal'/)
    })

    it('handles git tool actions', () => {
      expect(src).toMatch(/case 'git'/)
    })

    it('handles aws_cli tool actions', () => {
      expect(src).toMatch(/case 'aws_cli'/)
    })

    it('handles docker tool actions', () => {
      expect(src).toMatch(/case 'docker'/)
    })

    it('prevents path traversal with validateWorkspacePath', () => {
      expect(src).toMatch(/validateWorkspacePath/)
      expect(src).toMatch(/path\.resolve/)
    })

    it('has output length limit (MAX_OUTPUT_LENGTH)', () => {
      expect(src).toMatch(/MAX_OUTPUT_LENGTH/)
    })

    it('aws commands must start with "aws"', () => {
      expect(src).toMatch(/must start with.*aws/)
    })

    it('docker commands must start with "docker"', () => {
      expect(src).toMatch(/must start with.*docker/)
    })
  })

  // ─── 3. Skill Processor — allowed_tools in ProcessedSkill ────────────────

  describe('skill-processor.ts — tool-enabled skills', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-processor.ts') })

    it('ProcessedSkill interface has allowed_tools field', () => {
      const match = src.match(/export interface ProcessedSkill[\s\S]*?\n\}/)
      expect(match).toBeTruthy()
      expect(match![0]).toMatch(/allowed_tools\?/)
    })

    it('processSkills copies allowed_tools to active skills', () => {
      expect(src).toMatch(/allowed_tools:\s*skill\.allowed_tools/)
    })

    it('exports collectToolPermissions function', () => {
      expect(src).toMatch(/export function collectToolPermissions/)
    })

    it('exports getToolEnabledSkills function', () => {
      expect(src).toMatch(/export function getToolEnabledSkills/)
    })

    it('toProjectRules includes allowed_tools', () => {
      const toProjectRulesMatch = src.match(/export function toProjectRules[\s\S]*?\n\}/)
      expect(toProjectRulesMatch).toBeTruthy()
      expect(toProjectRulesMatch![0]).toMatch(/allowed_tools/)
    })

    it('imports SkillToolPermission from types', () => {
      expect(src).toMatch(/import.*SkillToolPermission.*from/)
    })
  })

  // ─── 4. Skills Manager — allowed_tools persistence ───────────────────────

  describe('skills-manager.ts — allowed_tools support', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skills-manager.ts') })

    it('imports SkillToolPermission from types', () => {
      expect(src).toMatch(/import.*SkillToolPermission.*from/)
    })

    it('createSkill accepts allowed_tools parameter', () => {
      const createMatch = src.match(/public createSkill\(params:[\s\S]*?\):\s*Skill/)
      expect(createMatch).toBeTruthy()
      expect(createMatch![0]).toMatch(/allowed_tools\?:\s*SkillToolPermission\[\]/)
    })

    it('createSkill persists allowed_tools', () => {
      expect(src).toMatch(/allowed_tools:\s*params\.allowed_tools/)
    })

    it('updateSkill accepts allowed_tools', () => {
      const updateMatch = src.match(/public updateSkill[\s\S]*?\):\s*Skill \| null/)
      expect(updateMatch).toBeTruthy()
      expect(updateMatch![0]).toMatch(/allowed_tools/)
    })

    it('updateSkill applies allowed_tools when provided', () => {
      expect(src).toMatch(/updates\.allowed_tools/)
    })

    it('installFromCatalog copies allowed_tools', () => {
      const installMatch = src.match(/public installFromCatalog[\s\S]*?this\.scheduleSave/)
      expect(installMatch).toBeTruthy()
      expect(installMatch![0]).toMatch(/allowed_tools:\s*catalogSkill\.allowed_tools/)
    })
  })

  // ─── 5. IPC Handler — skills:executeTool ─────────────────────────────────

  describe('electron/ipc/skills.ts — executeTool handler', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/ipc/skills.ts') })

    it('imports executeToolRequest from skill-tool-runner', () => {
      expect(src).toMatch(/import.*executeToolRequest.*from.*skill-tool-runner/)
    })

    it('imports SkillToolPermission from types', () => {
      expect(src).toMatch(/import.*SkillToolPermission.*from/)
    })

    it('ALL_CHANNELS includes skills:executeTool', () => {
      expect(src).toMatch(/skills:executeTool/)
    })

    it('registers skills:executeTool handler', () => {
      expect(src).toMatch(/ipcMain\.handle\('skills:executeTool'/)
    })

    it('executeTool handler validates skill existence', () => {
      expect(src).toMatch(/getSkillById\(request\.skillId\)/)
    })

    it('executeTool handler passes allowed_tools to runner', () => {
      expect(src).toMatch(/skill\.allowed_tools/)
    })

    it('skills:create accepts allowed_tools parameter', () => {
      const createHandlerMatch = src.match(/skills:create[\s\S]*?allowed_tools/)
      expect(createHandlerMatch).toBeTruthy()
    })

    it('skills:update accepts allowed_tools parameter', () => {
      const updateHandlerMatch = src.match(/skills:update[\s\S]*?allowed_tools/)
      expect(updateHandlerMatch).toBeTruthy()
    })

    it('channel is in cleanup list', () => {
      expect(src).toMatch(/ALL_CHANNELS[\s\S]*?skills:executeTool/)
    })
  })

  // ─── 6. Preload — executeTool exposure ───────────────────────────────────

  describe('electron/preload.ts — executeTool exposure', () => {
    let src: string
    beforeAll(() => { src = readFile('electron/preload.ts') })

    it('exposes executeTool method on skills API', () => {
      expect(src).toMatch(/executeTool:/)
    })

    it('executeTool invokes skills:executeTool channel', () => {
      expect(src).toMatch(/invoke\('skills:executeTool'/)
    })

    it('executeTool accepts request with skillId', () => {
      expect(src).toMatch(/executeTool.*skillId/)
    })

    it('executeTool accepts request with workspacePath', () => {
      expect(src).toMatch(/executeTool.*workspacePath/)
    })

    it('create method accepts allowed_tools', () => {
      expect(src).toMatch(/create.*allowed_tools/)
    })

    it('update method accepts allowed_tools', () => {
      expect(src).toMatch(/update.*allowed_tools/)
    })
  })

  // ─── 7. System Prompt — tool-enabled skills section ──────────────────────

  describe('system-prompt.ts — tool-enabled skills prompt', () => {
    let src: string
    beforeAll(() => { src = readFile('packages/prompts/src/system-prompt.ts') })

    it('projectRules type includes allowed_tools field', () => {
      expect(src).toMatch(/projectRules.*\{[\s\S]*?allowed_tools\?:\s*string\[\]/)
    })

    it('mentions tool-enabled skills in prompt', () => {
      expect(src).toMatch(/TOOL-ENABLED SKILLS/)
    })

    it('displays authorized tools per skill', () => {
      expect(src).toMatch(/Authorized tools/)
    })

    it('mentions user confirmation for tool execution', () => {
      expect(src).toMatch(/user will be prompted to confirm/)
    })

    it('collects all tool types from active skills', () => {
      expect(src).toMatch(/allTools/)
    })

    it('shows available tool categories in prompt', () => {
      expect(src).toMatch(/Available tool categories/)
    })
  })

  // ─── 8. Skill Catalog — allowed_tools on marketplace skills ──────────────

  describe('skill-catalog.ts — allowed_tools on catalog skills', () => {
    let src: string
    beforeAll(() => { src = readFile('src/skills/skill-catalog.ts') })

    it('SQL Optimizer has filesystem and terminal tools', () => {
      const sqlMatch = src.match(/marketplace_sql_optimizer[\s\S]*?execution_mode/)
      expect(sqlMatch).toBeTruthy()
      expect(src).toMatch(/marketplace_sql_optimizer[\s\S]*?allowed_tools.*filesystem/)
    })

    it('AWS Deployment Helper has terminal, aws_cli, and docker tools', () => {
      const awsMatch = src.match(/marketplace_aws_deployment[\s\S]*?allowed_tools:\s*\[([^\]]+)\]/)
      expect(awsMatch).toBeTruthy()
      expect(awsMatch![1]).toMatch(/terminal/)
      expect(awsMatch![1]).toMatch(/aws_cli/)
    })

    it('Security Reviewer has filesystem and git tools', () => {
      const secMatch = src.match(/marketplace_security_reviewer[\s\S]*?allowed_tools:\s*\[([^\]]+)\]/)
      expect(secMatch).toBeTruthy()
      expect(secMatch![1]).toMatch(/filesystem/)
      expect(secMatch![1]).toMatch(/git/)
    })

    it('Git Workflow Standards has git and terminal tools', () => {
      const gitMatch = src.match(/marketplace_git_workflow[\s\S]*?allowed_tools:\s*\[([^\]]+)\]/)
      expect(gitMatch).toBeTruthy()
      expect(gitMatch![1]).toMatch(/git/)
      expect(gitMatch![1]).toMatch(/terminal/)
    })

    it('skills without tools do not have allowed_tools', () => {
      const promptRefinerMatch = src.match(/marketplace_prompt_refiner[\s\S]*?execution_mode:\s*'always'/)
      expect(promptRefinerMatch).toBeTruthy()
      expect(promptRefinerMatch![0]).not.toMatch(/allowed_tools/)
    })
  })

  // ─── 9. SkillsPanel UI — tool permissions ───────────────────────────────

  describe('SkillsPanel.tsx — tool permissions UI', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/components/SkillsPanel.tsx') })

    it('Skill interface has allowed_tools field', () => {
      const skillInterface = src.match(/interface Skill \{[\s\S]*?\n\}/)
      expect(skillInterface).toBeTruthy()
      expect(skillInterface![0]).toMatch(/allowed_tools\?/)
    })

    it('CatalogSkill interface has allowed_tools field', () => {
      const catalogInterface = src.match(/interface CatalogSkill \{[\s\S]*?\n\}/)
      expect(catalogInterface).toBeTruthy()
      expect(catalogInterface![0]).toMatch(/allowed_tools\?/)
    })

    it('defines TOOL_OPTIONS constant', () => {
      expect(src).toMatch(/const TOOL_OPTIONS/)
    })

    it('TOOL_OPTIONS includes all 5 tool types', () => {
      expect(src).toMatch(/filesystem/)
      expect(src).toMatch(/terminal/)
      expect(src).toMatch(/'git'/)
      expect(src).toMatch(/aws_cli/)
      expect(src).toMatch(/docker/)
    })

    it('has newAllowedTools state', () => {
      expect(src).toMatch(/newAllowedTools.*useState/)
    })

    it('has toggleTool function', () => {
      expect(src).toMatch(/const toggleTool/)
    })

    it('handleCreate passes allowed_tools', () => {
      expect(src).toMatch(/handleCreate[\s\S]*?allowed_tools:\s*newAllowedTools/)
    })

    it('handleUpdate passes allowed_tools', () => {
      expect(src).toMatch(/handleUpdate[\s\S]*?allowed_tools:\s*newAllowedTools/)
    })

    it('startEdit loads allowed_tools from skill', () => {
      expect(src).toMatch(/startEdit[\s\S]*?setNewAllowedTools\(skill\.allowed_tools/)
    })

    it('startCreate resets allowed_tools', () => {
      expect(src).toMatch(/startCreate[\s\S]*?setNewAllowedTools\(\[\]\)/)
    })

    it('shows Tool Permissions label in create form', () => {
      expect(src).toMatch(/Tool Permissions.*user confirmation required/)
    })

    it('shows Tool Permissions label in edit form', () => {
      const editMatches = src.match(/Tool Permissions/g)
      expect(editMatches).toBeTruthy()
      expect(editMatches!.length).toBeGreaterThanOrEqual(2)
    })

    it('renders tool toggle buttons with TOOL_OPTIONS', () => {
      expect(src).toMatch(/TOOL_OPTIONS\.map/)
    })

    it('displays tool permissions for selected skill', () => {
      expect(src).toMatch(/selectedSkill\.allowed_tools/)
    })

    it('displays tool permissions for marketplace catalog skill', () => {
      expect(src).toMatch(/selectedCatalogSkill\.allowed_tools/)
    })

    it('shows tool-enabled badge in skill list', () => {
      expect(src).toMatch(/Tool-enabled/)
    })

    it('shows tool emoji badge for tool-enabled skills', () => {
      expect(src).toMatch(/🔧/)
    })

    it('shows marketplace Tool Permissions Required label', () => {
      expect(src).toMatch(/Tool Permissions Required/)
    })
  })

  // ─── 10. App.tsx — allowed_tools passthrough ─────────────────────────────

  describe('App.tsx — allowed_tools passthrough', () => {
    let src: string
    beforeAll(() => { src = readFile('renderer/src/App.tsx') })

    it('skills state type includes allowed_tools', () => {
      expect(src).toMatch(/allowed_tools\?:\s*string\[\]/)
    })

    it('projectRules maps allowed_tools from skills', () => {
      expect(src).toMatch(/allowed_tools:\s*s\.allowed_tools/)
    })

    it('logs tool-enabled skill count', () => {
      expect(src).toMatch(/tool-enabled/)
    })
  })

  // ─── 11. Integration: end-to-end validation ──────────────────────────────

  describe('integration — tool execution security model', () => {
    let runnerSrc: string
    let ipcSrc: string
    let preloadSrc: string
    let typeSrc: string

    beforeAll(() => {
      runnerSrc = readFile('src/skills/skill-tool-runner.ts')
      ipcSrc = readFile('electron/ipc/skills.ts')
      preloadSrc = readFile('electron/preload.ts')
      typeSrc = readFile('src/skills/types.ts')
    })

    it('permission check happens before execution', () => {
      const executeMatch = runnerSrc.match(/export function executeToolRequest[\s\S]*?return \{/)
      expect(executeMatch).toBeTruthy()
      const beforeReturn = executeMatch![0]
      expect(beforeReturn).toMatch(/checkToolPermission/)
    })

    it('IPC handler looks up skill before executing', () => {
      const handlerMatch = ipcSrc.match(/skills:executeTool[\s\S]*?executeToolRequest/)
      expect(handlerMatch).toBeTruthy()
      expect(handlerMatch![0]).toMatch(/getSkillById/)
    })

    it('all 5 tool types are defined consistently across types and runner', () => {
      const typeTools = ['filesystem', 'terminal', 'git', 'aws_cli', 'docker']
      for (const tool of typeTools) {
        expect(typeSrc).toContain(tool)
        expect(runnerSrc).toContain(tool)
      }
    })

    it('preload executeTool has all required parameters', () => {
      const execMatch = preloadSrc.match(/executeTool.*\{[\s\S]*?\}/)
      expect(execMatch).toBeTruthy()
      expect(execMatch![0]).toMatch(/skillId/)
      expect(execMatch![0]).toMatch(/tool/)
      expect(execMatch![0]).toMatch(/action/)
      expect(execMatch![0]).toMatch(/params/)
      expect(execMatch![0]).toMatch(/workspacePath/)
    })

    it('runner timeout for terminal execution (30s)', () => {
      expect(runnerSrc).toMatch(/timeout:\s*30[_0]*/)
    })

    it('runner timeout for git execution (15s)', () => {
      expect(runnerSrc).toMatch(/timeout:\s*15[_0]*/)
    })

    it('supported actions for filesystem tool include read_file', () => {
      expect(runnerSrc).toMatch(/case 'filesystem'[\s\S]*?read_file/)
    })

    it('supported actions for git tool include status', () => {
      expect(runnerSrc).toMatch(/case 'status':/)
      expect(runnerSrc).toMatch(/status --porcelain/)
    })
  })

  // ─── Regression guards ──────────────────────────────────────────────────

  describe('regression guards', () => {
    it('does not break i18n (language instruction in system prompt)', () => {
      const src = readFile('packages/prompts/src/system-prompt.ts')
      expect(src).toMatch(/LANGUAGE INSTRUCTION/)
    })

    it('existing skill fields preserved (name, description, prompt_template)', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/name: string/)
      expect(src).toMatch(/description: string/)
      expect(src).toMatch(/prompt_template: string/)
    })

    it('execution_mode and tags still present', () => {
      const src = readFile('src/skills/types.ts')
      expect(src).toMatch(/execution_mode\?/)
      expect(src).toMatch(/tags\?/)
    })

    it('marketplace catalog unchanged (all 8 skills present)', () => {
      const src = readFile('src/skills/skill-catalog.ts')
      expect(src).toMatch(/marketplace_prompt_refiner/)
      expect(src).toMatch(/marketplace_architecture_assistant/)
      expect(src).toMatch(/marketplace_sql_optimizer/)
      expect(src).toMatch(/marketplace_aws_deployment/)
      expect(src).toMatch(/marketplace_security_reviewer/)
      expect(src).toMatch(/marketplace_api_design/)
      expect(src).toMatch(/marketplace_react_best_practices/)
      expect(src).toMatch(/marketplace_git_workflow/)
    })

    it('conflict detection still works', () => {
      const src = readFile('src/skills/skill-processor.ts')
      expect(src).toMatch(/export function detectConflicts/)
    })

    it('reorder functionality still present', () => {
      const src = readFile('src/skills/skills-manager.ts')
      expect(src).toMatch(/public reorderSkills/)
    })
  })
})

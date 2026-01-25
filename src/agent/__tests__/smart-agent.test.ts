/**
 * Smart Agent Tests
 * 
 * TDD tests for Cursor-like intelligent agent capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  SmartAgent,
  getSmartAgent,
  resetSmartAgent
} from '../smart-agent'
import { resetAutoModeManager } from '../auto-mode-manager'

describe('SmartAgent', () => {
  let agent: SmartAgent

  beforeEach(() => {
    resetSmartAgent()
    resetAutoModeManager()
    agent = new SmartAgent()
  })

  afterEach(() => {
    resetSmartAgent()
    resetAutoModeManager()
  })

  describe('workspace management', () => {
    it('should set workspace path', () => {
      agent.setWorkspace('/path/to/project')
      expect(agent.getWorkspace()).toBe('/path/to/project')
    })

    it('should return null when no workspace set', () => {
      expect(agent.getWorkspace()).toBeNull()
    })
  })

  describe('code block parsing', () => {
    it('should parse single code block', () => {
      const text = '```bash\nnpm run build\n```'
      const blocks = agent.parseCodeBlocks(text)
      
      expect(blocks).toHaveLength(1)
      expect(blocks[0].language).toBe('bash')
      expect(blocks[0].code).toBe('npm run build')
    })

    it('should parse multiple code blocks', () => {
      const text = `
Here's how to build:
\`\`\`bash
npm install
\`\`\`

Then run:
\`\`\`bash
npm run build
\`\`\`
`
      const blocks = agent.parseCodeBlocks(text)
      
      expect(blocks).toHaveLength(2)
      expect(blocks[0].code).toBe('npm install')
      expect(blocks[1].code).toBe('npm run build')
    })

    it('should handle code blocks without language', () => {
      const text = '```\nsome code\n```'
      const blocks = agent.parseCodeBlocks(text)
      
      expect(blocks).toHaveLength(1)
      expect(blocks[0].language).toBe('text')
    })

    it('should handle different languages', () => {
      const text = `
\`\`\`javascript
console.log('hello')
\`\`\`

\`\`\`python
print('hello')
\`\`\`
`
      const blocks = agent.parseCodeBlocks(text)
      
      expect(blocks).toHaveLength(2)
      expect(blocks[0].language).toBe('javascript')
      expect(blocks[1].language).toBe('python')
    })
  })

  describe('command extraction', () => {
    it('should extract npm commands', () => {
      const code = `npm install
npm run build
npm test`
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(3)
      expect(commands).toContain('npm install')
      expect(commands).toContain('npm run build')
      expect(commands).toContain('npm test')
    })

    it('should extract yarn commands', () => {
      const code = 'yarn add lodash\nyarn build'
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(2)
      expect(commands).toContain('yarn add lodash')
    })

    it('should extract pnpm commands', () => {
      const code = 'pnpm install\npnpm build'
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(2)
    })

    it('should extract git commands', () => {
      const code = 'git status\ngit add .\ngit commit -m "test"'
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(3)
    })

    it('should extract gradle commands', () => {
      const code = './gradlew build\n./gradlew test'
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(2)
    })

    it('should extract flutter commands', () => {
      const code = 'flutter build apk\nflutter test'
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(2)
    })

    it('should extract dotnet commands', () => {
      const code = 'dotnet build\ndotnet test\ndotnet run'
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(3)
    })

    it('should skip comments', () => {
      const code = `# This is a comment
npm install
// Another comment
npm run build`
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(2)
    })

    it('should handle $ prefix', () => {
      const code = '$ npm install\n$ npm run build'
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(2)
      expect(commands[0]).toBe('npm install')
    })

    it('should handle > prefix', () => {
      const code = '> npm install\n> npm run build'
      const commands = agent.extractCommands(code)
      
      expect(commands).toHaveLength(2)
    })
  })

  describe('execution plan creation', () => {
    it('should create execution plan from response', () => {
      const response = `
Let me build your project:

\`\`\`bash
npm install
npm run build
npm test
\`\`\`
`
      const plan = agent.createExecutionPlan(response)
      
      expect(plan.steps).toHaveLength(3)
      expect(plan.steps[0].type).toBe('command')
      expect(plan.steps[0].command).toBe('npm install')
    })

    it('should mark safe commands as auto-approve', () => {
      const response = '```bash\nnpm run build\n```'
      const plan = agent.createExecutionPlan(response)
      
      expect(plan.steps[0].autoApprove).toBe(true)
    })

    it('should calculate risk level', () => {
      const safeResponse = '```bash\nnpm run build\n```'
      const safePlan = agent.createExecutionPlan(safeResponse)
      expect(safePlan.riskLevel).toBe('low')
    })

    it('should set initial status to pending', () => {
      const response = '```bash\nnpm run build\n```'
      const plan = agent.createExecutionPlan(response)
      
      expect(plan.steps[0].status).toBe('pending')
    })
  })

  describe('execution history', () => {
    it('should start with empty history', () => {
      expect(agent.getExecutionHistory()).toHaveLength(0)
    })

    it('should clear execution history', () => {
      // Simulate adding to history via executeStep
      agent.clearExecutionHistory()
      expect(agent.getExecutionHistory()).toHaveLength(0)
    })
  })

  describe('auto-mode stats', () => {
    it('should return auto-mode statistics', () => {
      const stats = agent.getAutoModeStats()
      
      expect(stats).toHaveProperty('executionCount')
      expect(stats).toHaveProperty('maxExecutions')
      expect(stats).toHaveProperty('level')
      expect(stats).toHaveProperty('enabled')
    })
  })

  describe('build/run/test commands', () => {
    it('should return null when no project analysis', () => {
      expect(agent.getBuildCommand()).toBeNull()
      expect(agent.getRunCommand()).toBeNull()
    })
  })

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getSmartAgent()
      const instance2 = getSmartAgent()
      expect(instance1).toBe(instance2)
    })

    it('should reset singleton', () => {
      const instance1 = getSmartAgent()
      resetSmartAgent()
      const instance2 = getSmartAgent()
      expect(instance1).not.toBe(instance2)
    })
  })
})

describe('SmartAgent with mock electronAPI', () => {
  let agent: SmartAgent
  let mockElectronAPI: any

  beforeEach(() => {
    resetSmartAgent()
    resetAutoModeManager()
    agent = new SmartAgent()
    agent.setWorkspace('/test/project')

    mockElectronAPI = {
      terminal: {
        execute: vi.fn()
      }
    }
  })

  afterEach(() => {
    resetSmartAgent()
    resetAutoModeManager()
    vi.clearAllMocks()
  })

  describe('step execution', () => {
    it('should execute command step', async () => {
      mockElectronAPI.terminal.execute.mockResolvedValue({
        stdout: 'Build successful',
        stderr: '',
        exitCode: 0
      })

      const step = {
        id: 'step-1',
        type: 'command' as const,
        description: 'Build project',
        command: 'npm run build',
        autoApprove: true,
        status: 'pending' as const
      }

      const result = await agent.executeStep(step, mockElectronAPI)

      expect(result.status).toBe('completed')
      expect(result.output).toContain('Build successful')
      expect(mockElectronAPI.terminal.execute).toHaveBeenCalledWith(
        'npm run build',
        '/test/project'
      )
    })

    it('should handle failed command', async () => {
      mockElectronAPI.terminal.execute.mockResolvedValue({
        stdout: '',
        stderr: 'Error: Build failed',
        exitCode: 1
      })

      const step = {
        id: 'step-1',
        type: 'command' as const,
        description: 'Build project',
        command: 'npm run build',
        autoApprove: true,
        status: 'pending' as const
      }

      const result = await agent.executeStep(step, mockElectronAPI)

      expect(result.status).toBe('failed')
      expect(result.error).toContain('Exit code: 1')
    })

    it('should fail without workspace', async () => {
      const noWorkspaceAgent = new SmartAgent()
      
      const step = {
        id: 'step-1',
        type: 'command' as const,
        description: 'Build project',
        command: 'npm run build',
        autoApprove: true,
        status: 'pending' as const
      }

      const result = await noWorkspaceAgent.executeStep(step, mockElectronAPI)

      expect(result.status).toBe('failed')
      expect(result.error).toBe('No workspace set')
    })

    it('should call progress callback', async () => {
      mockElectronAPI.terminal.execute.mockResolvedValue({
        stdout: 'Success',
        stderr: '',
        exitCode: 0
      })

      const step = {
        id: 'step-1',
        type: 'command' as const,
        description: 'Build project',
        command: 'npm run build',
        autoApprove: true,
        status: 'pending' as const
      }

      const onProgress = vi.fn()
      await agent.executeStep(step, mockElectronAPI, onProgress)

      expect(onProgress).toHaveBeenCalled()
    })
  })

  describe('auto-approved execution', () => {
    it('should execute only auto-approved steps', async () => {
      mockElectronAPI.terminal.execute.mockResolvedValue({
        stdout: 'Success',
        stderr: '',
        exitCode: 0
      })

      const plan = {
        steps: [
          {
            id: 'step-1',
            type: 'command' as const,
            description: 'Safe command',
            command: 'npm run build',
            autoApprove: true,
            status: 'pending' as const
          },
          {
            id: 'step-2',
            type: 'command' as const,
            description: 'Risky command',
            command: 'sudo rm -rf /',
            autoApprove: false,
            status: 'pending' as const
          }
        ],
        estimatedTime: 10,
        riskLevel: 'medium' as const
      }

      const results = await agent.executeAutoApprovedSteps(plan, mockElectronAPI)

      expect(results).toHaveLength(1)
      expect(mockElectronAPI.terminal.execute).toHaveBeenCalledTimes(1)
    })
  })

  describe('project analysis', () => {
    it('should detect Node.js project', async () => {
      mockElectronAPI.terminal.execute
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // git check
        .mockResolvedValueOnce({ 
          exitCode: 0, 
          stdout: JSON.stringify({
            name: 'test-project',
            dependencies: { react: '^18.0.0' },
            devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' }
          }),
          stderr: ''
        }) // package.json
        .mockResolvedValueOnce({ exitCode: 0, stdout: 'pnpm-lock.yaml', stderr: '' }) // lock file check
        .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' }) // gradle check
        .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' }) // pubspec check
        .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' }) // requirements check
        .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' }) // csproj check

      const analysis = await agent.analyzeProject(mockElectronAPI)

      expect(analysis.type).toBe('node')
      expect(analysis.language).toBe('typescript')
      expect(analysis.framework).toBe('react')
      expect(analysis.packageManager).toBe('pnpm')
      expect(analysis.testFramework).toBe('vitest')
      expect(analysis.hasGit).toBe(true)
    })

    it('should throw without workspace', async () => {
      const noWorkspaceAgent = new SmartAgent()
      
      await expect(noWorkspaceAgent.analyzeProject(mockElectronAPI))
        .rejects.toThrow('No workspace set')
    })
  })
})


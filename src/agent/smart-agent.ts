/**
 * Smart Agent for AIBuddy Desktop
 * 
 * Provides Cursor-like intelligent capabilities:
 * - Automatic code analysis
 * - Smart file operations
 * - Project understanding
 * - Intelligent command execution
 * 
 * Works on Mac, Windows, and Linux
 */

import { getAutoModeManager, AutoModeManager } from './auto-mode-manager'

export interface FileInfo {
  path: string
  name: string
  extension: string
  size: number
  isDirectory: boolean
  lastModified: Date
}

export interface ProjectAnalysis {
  type: string
  language: string
  framework?: string
  packageManager?: string
  buildTool?: string
  testFramework?: string
  hasGit: boolean
  mainFiles: string[]
  configFiles: string[]
  dependencies: string[]
}

export interface CodeBlock {
  language: string
  code: string
  startLine?: number
  endLine?: number
}

export interface ExecutionPlan {
  steps: ExecutionStep[]
  estimatedTime: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface ExecutionStep {
  id: string
  type: 'command' | 'file_read' | 'file_write' | 'analysis' | 'test'
  description: string
  command?: string
  filePath?: string
  content?: string
  autoApprove: boolean
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  output?: string
  error?: string
}

/**
 * Smart Agent - Cursor-like intelligent coding assistant
 */
export class SmartAgent {
  private autoModeManager: AutoModeManager
  private workspacePath: string | null = null
  private projectAnalysis: ProjectAnalysis | null = null
  private executionHistory: ExecutionStep[] = []

  constructor() {
    this.autoModeManager = getAutoModeManager()
  }

  /**
   * Set the workspace path
   */
  public setWorkspace(path: string): void {
    this.workspacePath = path
    this.projectAnalysis = null // Reset analysis for new workspace
  }

  /**
   * Get current workspace path
   */
  public getWorkspace(): string | null {
    return this.workspacePath
  }

  /**
   * Analyze the current project
   */
  public async analyzeProject(electronAPI: any): Promise<ProjectAnalysis> {
    if (!this.workspacePath) {
      throw new Error('No workspace set')
    }

    const analysis: ProjectAnalysis = {
      type: 'unknown',
      language: 'unknown',
      hasGit: false,
      mainFiles: [],
      configFiles: [],
      dependencies: []
    }

    try {
      // Check for common project files
      const checks = [
        { file: 'package.json', type: 'node', language: 'javascript' },
        { file: 'tsconfig.json', type: 'node', language: 'typescript' },
        { file: 'Cargo.toml', type: 'rust', language: 'rust' },
        { file: 'go.mod', type: 'go', language: 'go' },
        { file: 'pom.xml', type: 'java', language: 'java' },
        { file: 'build.gradle', type: 'android', language: 'kotlin' },
        { file: 'build.gradle.kts', type: 'android', language: 'kotlin' },
        { file: 'pubspec.yaml', type: 'flutter', language: 'dart' },
        { file: 'requirements.txt', type: 'python', language: 'python' },
        { file: 'setup.py', type: 'python', language: 'python' },
        { file: 'pyproject.toml', type: 'python', language: 'python' },
        { file: '*.csproj', type: 'dotnet', language: 'csharp' },
        { file: '*.sln', type: 'dotnet', language: 'csharp' },
        { file: 'Package.swift', type: 'swift', language: 'swift' },
        { file: '*.xcodeproj', type: 'ios', language: 'swift' },
        { file: 'Gemfile', type: 'ruby', language: 'ruby' },
        { file: 'composer.json', type: 'php', language: 'php' },
      ]

      // Use terminal to check for files
      if (electronAPI?.terminal?.execute) {
        // Check for git
        const gitResult = await electronAPI.terminal.execute('git rev-parse --git-dir', this.workspacePath)
        analysis.hasGit = gitResult.exitCode === 0

        // Check for package.json (Node.js)
        const packageResult = await electronAPI.terminal.execute('cat package.json 2>/dev/null || type package.json 2>nul', this.workspacePath)
        if (packageResult.exitCode === 0 && packageResult.stdout) {
          try {
            const pkg = JSON.parse(packageResult.stdout)
            analysis.type = 'node'
            analysis.language = pkg.devDependencies?.typescript ? 'typescript' : 'javascript'
            analysis.configFiles.push('package.json')
            
            // Detect framework
            const deps = { ...pkg.dependencies, ...pkg.devDependencies }
            if (deps.react) analysis.framework = 'react'
            else if (deps.vue) analysis.framework = 'vue'
            else if (deps.angular) analysis.framework = 'angular'
            else if (deps.next) analysis.framework = 'nextjs'
            else if (deps.express) analysis.framework = 'express'
            else if (deps.electron) analysis.framework = 'electron'
            
            // Detect package manager
            const lockFiles = await electronAPI.terminal.execute('ls -la 2>/dev/null || dir', this.workspacePath)
            if (lockFiles.stdout.includes('pnpm-lock')) analysis.packageManager = 'pnpm'
            else if (lockFiles.stdout.includes('yarn.lock')) analysis.packageManager = 'yarn'
            else if (lockFiles.stdout.includes('package-lock')) analysis.packageManager = 'npm'
            
            // Detect test framework
            if (deps.vitest) analysis.testFramework = 'vitest'
            else if (deps.jest) analysis.testFramework = 'jest'
            else if (deps.mocha) analysis.testFramework = 'mocha'
            
            // Get dependencies
            analysis.dependencies = Object.keys(deps).slice(0, 20)
          } catch {
            // Not valid JSON
          }
        }

        // Check for Android (build.gradle)
        const gradleResult = await electronAPI.terminal.execute('cat build.gradle 2>/dev/null || cat app/build.gradle 2>/dev/null', this.workspacePath)
        if (gradleResult.exitCode === 0 && gradleResult.stdout) {
          analysis.type = 'android'
          analysis.language = gradleResult.stdout.includes('kotlin') ? 'kotlin' : 'java'
          analysis.buildTool = 'gradle'
          analysis.configFiles.push('build.gradle')
        }

        // Check for Flutter
        const pubspecResult = await electronAPI.terminal.execute('cat pubspec.yaml 2>/dev/null', this.workspacePath)
        if (pubspecResult.exitCode === 0 && pubspecResult.stdout) {
          analysis.type = 'flutter'
          analysis.language = 'dart'
          analysis.configFiles.push('pubspec.yaml')
        }

        // Check for Python
        const requirementsResult = await electronAPI.terminal.execute('cat requirements.txt 2>/dev/null', this.workspacePath)
        if (requirementsResult.exitCode === 0) {
          analysis.type = 'python'
          analysis.language = 'python'
          analysis.configFiles.push('requirements.txt')
        }

        // Check for .NET
        const csprojResult = await electronAPI.terminal.execute('ls *.csproj 2>/dev/null || dir *.csproj 2>nul', this.workspacePath)
        if (csprojResult.exitCode === 0 && csprojResult.stdout.includes('.csproj')) {
          analysis.type = 'dotnet'
          analysis.language = 'csharp'
          analysis.buildTool = 'dotnet'
        }
      }
    } catch (error) {
      console.error('Project analysis failed:', error)
    }

    this.projectAnalysis = analysis
    return analysis
  }

  /**
   * Get the current project analysis
   */
  public getProjectAnalysis(): ProjectAnalysis | null {
    return this.projectAnalysis
  }

  /**
   * Parse code blocks from AI response
   */
  public parseCodeBlocks(text: string): CodeBlock[] {
    const blocks: CodeBlock[] = []
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    
    let match
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      })
    }
    
    return blocks
  }

  /**
   * Extract executable commands from code block
   */
  public extractCommands(code: string): string[] {
    const commands: string[] = []
    const lines = code.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
        continue
      }
      
      // Skip lines that look like output
      if (trimmed.startsWith('>') || trimmed.startsWith('$')) {
        const cmd = trimmed.replace(/^[>$]\s*/, '')
        if (cmd) commands.push(cmd)
        continue
      }
      
      // Check if it looks like a command
      const commandPatterns = [
        /^(npm|yarn|pnpm|npx)\s+/,
        /^(pip|python|python3)\s+/,
        /^(cargo|rustc)\s+/,
        /^(go|gofmt)\s+/,
        /^(gradle|\.\/gradlew|gradlew)\s+/,
        /^(mvn|maven)\s+/,
        /^(dotnet)\s+/,
        /^(flutter|dart)\s+/,
        /^(swift|xcodebuild)\s+/,
        /^(git)\s+/,
        /^(cd|ls|dir|cat|echo|mkdir|rm|cp|mv)\s+/,
        /^(chmod|chown)\s+/,
        /^(curl|wget)\s+/,
        /^(docker|docker-compose)\s+/,
        /^(kubectl|helm)\s+/,
        /^(aws|gcloud|az)\s+/,
      ]
      
      for (const pattern of commandPatterns) {
        if (pattern.test(trimmed)) {
          commands.push(trimmed)
          break
        }
      }
    }
    
    return commands
  }

  /**
   * Create an execution plan from AI response
   */
  public createExecutionPlan(response: string): ExecutionPlan {
    const codeBlocks = this.parseCodeBlocks(response)
    const steps: ExecutionStep[] = []
    let stepId = 0

    for (const block of codeBlocks) {
      // Check if it's a shell/bash block
      if (['bash', 'sh', 'shell', 'zsh', 'cmd', 'powershell', 'terminal', ''].includes(block.language.toLowerCase())) {
        const commands = this.extractCommands(block.code)
        
        for (const command of commands) {
          const safety = this.autoModeManager.analyzeCommandSafety(command)
          
          steps.push({
            id: `step-${++stepId}`,
            type: 'command',
            description: `Execute: ${command.substring(0, 50)}${command.length > 50 ? '...' : ''}`,
            command,
            autoApprove: this.autoModeManager.shouldAutoApprove(command),
            status: 'pending'
          })
        }
      }
    }

    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low'
    const highRiskSteps = steps.filter(s => !s.autoApprove).length
    if (highRiskSteps > steps.length / 2) riskLevel = 'high'
    else if (highRiskSteps > 0) riskLevel = 'medium'

    return {
      steps,
      estimatedTime: steps.length * 5, // 5 seconds per step estimate
      riskLevel
    }
  }

  /**
   * Execute a single step
   */
  public async executeStep(
    step: ExecutionStep,
    electronAPI: any,
    onProgress?: (step: ExecutionStep) => void
  ): Promise<ExecutionStep> {
    if (!this.workspacePath) {
      step.status = 'failed'
      step.error = 'No workspace set'
      return step
    }

    step.status = 'running'
    onProgress?.(step)

    try {
      switch (step.type) {
        case 'command':
          if (!step.command) {
            throw new Error('No command specified')
          }
          
          const result = await electronAPI.terminal.execute(step.command, this.workspacePath)
          step.output = result.stdout + (result.stderr ? `\n[stderr]: ${result.stderr}` : '')
          step.status = result.exitCode === 0 ? 'completed' : 'failed'
          if (result.exitCode !== 0) {
            step.error = `Exit code: ${result.exitCode}`
          }
          
          // Record execution for learning
          this.autoModeManager.recordExecution(step.command, result.exitCode === 0)
          break

        case 'file_read':
          // File read would be handled by electronAPI.fs.readFile
          step.status = 'completed'
          break

        case 'file_write':
          // File write would be handled by electronAPI.fs.writeFile
          step.status = 'completed'
          break

        case 'analysis':
          // Code analysis
          step.status = 'completed'
          break

        case 'test':
          // Run tests
          if (this.projectAnalysis?.testFramework) {
            const testCmd = this.getTestCommand()
            if (testCmd) {
              const testResult = await electronAPI.terminal.execute(testCmd, this.workspacePath)
              step.output = testResult.stdout
              step.status = testResult.exitCode === 0 ? 'completed' : 'failed'
            }
          }
          break
      }
    } catch (error) {
      step.status = 'failed'
      step.error = (error as Error).message
    }

    this.executionHistory.push(step)
    onProgress?.(step)
    return step
  }

  /**
   * Execute all auto-approved steps in a plan
   */
  public async executeAutoApprovedSteps(
    plan: ExecutionPlan,
    electronAPI: any,
    onProgress?: (step: ExecutionStep, index: number, total: number) => void
  ): Promise<ExecutionStep[]> {
    const results: ExecutionStep[] = []
    const autoSteps = plan.steps.filter(s => s.autoApprove)

    for (let i = 0; i < autoSteps.length; i++) {
      const step = autoSteps[i]
      onProgress?.(step, i, autoSteps.length)
      
      const result = await this.executeStep(step, electronAPI, (s) => {
        onProgress?.(s, i, autoSteps.length)
      })
      
      results.push(result)

      // Stop on failure if in conservative mode
      if (result.status === 'failed' && this.autoModeManager.getLevel() === 'conservative') {
        break
      }
    }

    return results
  }

  /**
   * Get the appropriate test command for the project
   */
  private getTestCommand(): string | null {
    if (!this.projectAnalysis) return null

    const { packageManager, testFramework, type } = this.projectAnalysis

    switch (type) {
      case 'node':
        const pm = packageManager || 'npm'
        return `${pm} test`
      
      case 'python':
        return 'pytest'
      
      case 'rust':
        return 'cargo test'
      
      case 'go':
        return 'go test ./...'
      
      case 'dotnet':
        return 'dotnet test'
      
      case 'android':
        return './gradlew test'
      
      case 'flutter':
        return 'flutter test'
      
      default:
        return null
    }
  }

  /**
   * Get the appropriate build command for the project
   */
  public getBuildCommand(): string | null {
    if (!this.projectAnalysis) return null

    const { packageManager, type } = this.projectAnalysis

    switch (type) {
      case 'node':
        const pm = packageManager || 'npm'
        return `${pm} run build`
      
      case 'python':
        return 'python setup.py build'
      
      case 'rust':
        return 'cargo build'
      
      case 'go':
        return 'go build'
      
      case 'dotnet':
        return 'dotnet build'
      
      case 'android':
        return './gradlew assembleDebug'
      
      case 'flutter':
        return 'flutter build'
      
      default:
        return null
    }
  }

  /**
   * Get the appropriate run command for the project
   */
  public getRunCommand(): string | null {
    if (!this.projectAnalysis) return null

    const { packageManager, type, framework } = this.projectAnalysis

    switch (type) {
      case 'node':
        const pm = packageManager || 'npm'
        if (framework === 'nextjs') return `${pm} run dev`
        if (framework === 'electron') return `${pm} run dev`
        return `${pm} start`
      
      case 'python':
        return 'python main.py'
      
      case 'rust':
        return 'cargo run'
      
      case 'go':
        return 'go run .'
      
      case 'dotnet':
        return 'dotnet run'
      
      case 'android':
        return './gradlew installDebug'
      
      case 'flutter':
        return 'flutter run'
      
      default:
        return null
    }
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(): ExecutionStep[] {
    return [...this.executionHistory]
  }

  /**
   * Clear execution history
   */
  public clearExecutionHistory(): void {
    this.executionHistory = []
    this.autoModeManager.resetExecutionCount()
  }

  /**
   * Get auto-mode statistics
   */
  public getAutoModeStats() {
    return this.autoModeManager.getStats()
  }
}

// Singleton instance
let smartAgentInstance: SmartAgent | null = null

/**
 * Get the global SmartAgent instance
 */
export function getSmartAgent(): SmartAgent {
  if (!smartAgentInstance) {
    smartAgentInstance = new SmartAgent()
  }
  return smartAgentInstance
}

/**
 * Reset the global SmartAgent instance
 */
export function resetSmartAgent(): void {
  smartAgentInstance = null
}


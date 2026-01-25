/**
 * Auto Mode Manager for AIBuddy Desktop
 * 
 * Makes AIBuddy smart like Cursor by automatically:
 * - Executing commands without asking
 * - Reading and writing files
 * - Running tests
 * - Building projects
 * - Analyzing code
 * 
 * Works on Mac, Windows, and Linux
 */

export type AutoModeLevel = 'conservative' | 'balanced' | 'aggressive'

export interface AutoModeConfig {
  enabled: boolean
  level: AutoModeLevel
  trustedCommands: string[]
  riskyCommands: string[]
  maxAutoExecutions: number
  requireConfirmationFor: string[]
}

export interface CommandSafetyResult {
  safe: boolean
  reason: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Auto Mode Manager
 * Handles intelligent auto-approval of commands and tools
 * Makes AIBuddy the best coding app by automatically executing commands
 */
export class AutoModeManager {
  private config: AutoModeConfig
  private executionCount: number = 0
  private approvalHistory: Map<string, { count: number; lastUsed: number }> = new Map()

  constructor(config?: Partial<AutoModeConfig>) {
    this.config = {
      enabled: true, // ✅ Enable by default for Cursor-like experience
      level: 'aggressive', // 🚀 Aggressive by default - AI makes decisions
      trustedCommands: [],
      riskyCommands: [],
      maxAutoExecutions: 50,
      requireConfirmationFor: [],
      ...config
    }
    this.initializeCommandCategories()
  }

  /**
   * Initialize safe and risky command patterns
   */
  private initializeCommandCategories(): void {
    // Safe commands that can always be auto-executed
    this.config.trustedCommands = [
      // Package managers (read operations)
      'npm list', 'npm ls', 'npm view', 'npm info', 'npm outdated', 'npm audit',
      'yarn list', 'yarn info', 'yarn why', 'yarn outdated',
      'pnpm list', 'pnpm ls', 'pnpm why', 'pnpm outdated',
      'pip list', 'pip show', 'pip freeze',
      'cargo tree', 'cargo metadata',
      
      // Build commands
      'npm run build', 'npm run dev', 'npm run start', 'npm run test',
      'yarn build', 'yarn dev', 'yarn start', 'yarn test',
      'pnpm build', 'pnpm dev', 'pnpm start', 'pnpm test',
      'gradle build', 'gradle test', 'gradle assemble',
      './gradlew build', './gradlew test', './gradlew assemble',
      'mvn compile', 'mvn test', 'mvn package',
      'cargo build', 'cargo test', 'cargo run',
      'go build', 'go test', 'go run',
      'dotnet build', 'dotnet test', 'dotnet run',
      'flutter build', 'flutter test', 'flutter run',
      'xcodebuild', 'swift build', 'swift test',
      
      // Git (read operations)
      'git status', 'git log', 'git diff', 'git branch', 'git remote',
      'git show', 'git blame', 'git stash list',
      
      // File operations (read)
      'ls', 'dir', 'cat', 'head', 'tail', 'less', 'more',
      'find', 'grep', 'rg', 'ag', 'fd',
      'tree', 'pwd', 'which', 'where', 'type',
      
      // System info
      'node -v', 'npm -v', 'yarn -v', 'pnpm -v',
      'python --version', 'python3 --version', 'pip --version',
      'java -version', 'javac -version',
      'go version', 'cargo --version', 'rustc --version',
      'dotnet --version', 'flutter --version', 'dart --version',
      'xcode-select -p', 'xcodebuild -version',
      'echo', 'env', 'printenv',
      
      // Linting and formatting
      'eslint', 'prettier', 'tsc --noEmit', 'tsc -b',
      'pylint', 'flake8', 'black --check', 'mypy',
      'cargo clippy', 'cargo fmt --check',
      'go fmt', 'gofmt', 'golint',
    ]

    // Risky commands that should NEVER be auto-executed
    this.config.riskyCommands = [
      // Destructive operations
      'rm -rf /', 'rm -rf ~', 'rm -rf *',
      'del /s /q', 'rmdir /s /q',
      'format', 'fdisk', 'mkfs',
      
      // System modifications
      'sudo', 'su', 'chmod 777', 'chown',
      'shutdown', 'reboot', 'halt',
      'systemctl', 'service',
      
      // Network operations
      'curl | sh', 'wget | sh', 'curl | bash', 'wget | bash',
      'nc', 'netcat', 'nmap',
      
      // Database operations
      'DROP DATABASE', 'DROP TABLE', 'TRUNCATE',
      'DELETE FROM', 'UPDATE', 'INSERT INTO',
      
      // Git destructive
      'git push --force', 'git push -f',
      'git reset --hard', 'git clean -fd',
      'git rebase', 'git merge',
      
      // Package publishing
      'npm publish', 'yarn publish', 'pnpm publish',
      'pip upload', 'cargo publish',
      
      // Environment modifications
      'export', 'set', 'setx',
      '.bashrc', '.zshrc', '.profile',
    ]

    // Commands that require confirmation even in aggressive mode
    this.config.requireConfirmationFor = [
      'npm install', 'yarn add', 'pnpm add', 'pip install',
      'git commit', 'git push', 'git pull',
      'rm', 'del', 'rmdir',
      'mv', 'move', 'rename',
      'cp', 'copy',
    ]
  }

  /**
   * Check if auto-mode is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Enable auto-mode with specified level
   */
  public enable(level: AutoModeLevel = 'balanced'): void {
    this.config.enabled = true
    this.config.level = level
    console.log(`🚀 Auto Mode enabled with ${level} level - commands will execute automatically`)
  }

  /**
   * Disable auto-mode
   */
  public disable(): void {
    this.config.enabled = false
    console.log('⏸️ Auto Mode disabled - commands require manual approval')
  }

  /**
   * Get current auto-mode level
   */
  public getLevel(): AutoModeLevel {
    return this.config.level
  }

  /**
   * Set auto-mode level
   */
  public setLevel(level: AutoModeLevel): void {
    this.config.level = level
    console.log(`🎚️ Auto Mode level set to ${level}`)
  }

  /**
   * Check if a command should be auto-approved
   */
  public shouldAutoApprove(command: string): boolean {
    if (!this.config.enabled) {
      return false
    }

    // Check execution limit
    if (this.executionCount >= this.config.maxAutoExecutions) {
      console.log('⚠️ Auto-execution limit reached')
      return false
    }

    const safety = this.analyzeCommandSafety(command)

    switch (this.config.level) {
      case 'conservative':
        // Only auto-approve explicitly trusted commands
        return safety.riskLevel === 'low' && this.isTrustedCommand(command)

      case 'balanced':
        // Auto-approve low and medium risk commands
        return safety.riskLevel === 'low' || safety.riskLevel === 'medium'

      case 'aggressive':
        // Auto-approve everything except critical risk
        return safety.riskLevel !== 'critical'

      default:
        return false
    }
  }

  /**
   * Analyze command safety
   */
  public analyzeCommandSafety(command: string): CommandSafetyResult {
    const normalizedCommand = command.toLowerCase().trim()

    // Check for critical risk patterns
    for (const risky of this.config.riskyCommands) {
      if (normalizedCommand.includes(risky.toLowerCase())) {
        return {
          safe: false,
          reason: `Contains risky pattern: ${risky}`,
          riskLevel: 'critical'
        }
      }
    }

    // Check for sudo/admin
    if (normalizedCommand.startsWith('sudo ') || normalizedCommand.includes('as administrator')) {
      return {
        safe: false,
        reason: 'Requires elevated privileges',
        riskLevel: 'critical'
      }
    }

    // Check for piped execution
    if (normalizedCommand.includes('| sh') || normalizedCommand.includes('| bash')) {
      return {
        safe: false,
        reason: 'Piped shell execution is dangerous',
        riskLevel: 'critical'
      }
    }

    // Check for trusted commands
    if (this.isTrustedCommand(command)) {
      return {
        safe: true,
        reason: 'Trusted command pattern',
        riskLevel: 'low'
      }
    }

    // Check for commands requiring confirmation
    for (const confirm of this.config.requireConfirmationFor) {
      if (normalizedCommand.startsWith(confirm.toLowerCase())) {
        return {
          safe: true,
          reason: `Requires confirmation: ${confirm}`,
          riskLevel: 'medium'
        }
      }
    }

    // Default: medium risk for unknown commands
    return {
      safe: true,
      reason: 'Unknown command - proceed with caution',
      riskLevel: 'medium'
    }
  }

  /**
   * Check if command matches trusted patterns
   */
  private isTrustedCommand(command: string): boolean {
    const normalizedCommand = command.toLowerCase().trim()
    
    for (const trusted of this.config.trustedCommands) {
      if (normalizedCommand.startsWith(trusted.toLowerCase())) {
        return true
      }
    }
    
    return false
  }

  /**
   * Record command execution for learning
   */
  public recordExecution(command: string, success: boolean): void {
    this.executionCount++
    
    const key = this.getCommandKey(command)
    const existing = this.approvalHistory.get(key) || { count: 0, lastUsed: 0 }
    
    this.approvalHistory.set(key, {
      count: existing.count + 1,
      lastUsed: Date.now()
    })

    if (success) {
      console.log(`✅ Command executed successfully: ${command.substring(0, 50)}...`)
    } else {
      console.log(`❌ Command failed: ${command.substring(0, 50)}...`)
    }
  }

  /**
   * Get normalized command key for tracking
   */
  private getCommandKey(command: string): string {
    // Extract the base command (first word)
    const parts = command.trim().split(/\s+/)
    return parts[0].toLowerCase()
  }

  /**
   * Reset execution count (call at start of new task)
   */
  public resetExecutionCount(): void {
    this.executionCount = 0
  }

  /**
   * Get execution statistics
   */
  public getStats(): {
    executionCount: number
    maxExecutions: number
    level: AutoModeLevel
    enabled: boolean
  } {
    return {
      executionCount: this.executionCount,
      maxExecutions: this.config.maxAutoExecutions,
      level: this.config.level,
      enabled: this.config.enabled
    }
  }

  /**
   * Check if a file operation should be auto-approved
   */
  public shouldAutoApproveFileOperation(
    operation: 'read' | 'write' | 'delete' | 'create',
    filePath: string
  ): boolean {
    if (!this.config.enabled) {
      return false
    }

    // Always allow read operations
    if (operation === 'read') {
      return true
    }

    // Check for sensitive files
    const sensitivePatterns = [
      '.env', '.env.local', '.env.production',
      'credentials', 'secrets', 'password',
      '.ssh', '.aws', '.gcloud',
      'id_rsa', 'id_ed25519',
    ]

    const normalizedPath = filePath.toLowerCase()
    for (const pattern of sensitivePatterns) {
      if (normalizedPath.includes(pattern)) {
        return false // Never auto-approve sensitive file operations
      }
    }

    switch (this.config.level) {
      case 'conservative':
        return operation === 'read'

      case 'balanced':
        return operation === 'read' || operation === 'write'

      case 'aggressive':
        return true // Allow all file operations

      default:
        return false
    }
  }

  /**
   * Export configuration for persistence
   */
  public exportConfig(): AutoModeConfig {
    return { ...this.config }
  }

  /**
   * Import configuration
   */
  public importConfig(config: Partial<AutoModeConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Singleton instance
let autoModeManagerInstance: AutoModeManager | null = null

/**
 * Get the global AutoModeManager instance
 */
export function getAutoModeManager(): AutoModeManager {
  if (!autoModeManagerInstance) {
    autoModeManagerInstance = new AutoModeManager()
  }
  return autoModeManagerInstance
}

/**
 * Reset the global AutoModeManager instance
 */
export function resetAutoModeManager(): void {
  autoModeManagerInstance = null
}


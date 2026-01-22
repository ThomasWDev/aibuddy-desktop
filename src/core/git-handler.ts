/**
 * Git Handler
 * 
 * Provides Git operations for the desktop app using simple-git.
 * This is adapted from the extension's GitHandler.
 */

import { EventEmitter } from 'events'

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null

export interface GitStatus {
  current: string | null
  tracking: string | null
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  deleted: string[]
  untracked: string[]
  conflicted: string[]
  isClean: boolean
}

export interface GitCommit {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}

export interface GitBranch {
  name: string
  current: boolean
  commit: string
}

export interface GitDiff {
  file: string
  additions: number
  deletions: number
  changes: string
}

export interface ConflictResolution {
  file: string
  strategy: 'ours' | 'theirs' | 'combine' | 'manual'
  content?: string
}

export class GitHandler extends EventEmitter {
  private cwd: string

  constructor(cwd: string) {
    super()
    this.cwd = cwd
  }

  /**
   * Set working directory
   */
  setCwd(cwd: string): void {
    this.cwd = cwd
  }

  /**
   * Check if directory is a git repository
   */
  async isGitRepo(): Promise<boolean> {
    if (!electronAPI) return false
    return electronAPI.git.isRepo(this.cwd)
  }

  /**
   * Get repository status
   */
  async getStatus(): Promise<GitStatus> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    const status = await electronAPI.git.status(this.cwd)
    
    return {
      current: status.current,
      tracking: status.tracking,
      ahead: status.ahead || 0,
      behind: status.behind || 0,
      staged: status.staged || [],
      modified: status.modified || [],
      deleted: status.deleted || [],
      untracked: status.not_added || [],
      conflicted: status.conflicted || [],
      isClean: status.isClean?.() ?? (
        (status.staged?.length || 0) === 0 &&
        (status.modified?.length || 0) === 0 &&
        (status.deleted?.length || 0) === 0 &&
        (status.not_added?.length || 0) === 0
      )
    }
  }

  /**
   * Get diff
   */
  async getDiff(options?: { staged?: boolean; file?: string }): Promise<string> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    return electronAPI.git.diff(this.cwd, options)
  }

  /**
   * Get commit log
   */
  async getLog(options?: { maxCount?: number; file?: string }): Promise<GitCommit[]> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    const log = await electronAPI.git.log(this.cwd, options)
    return log.all || []
  }

  /**
   * Get branches
   */
  async getBranches(): Promise<{ current: string; all: GitBranch[] }> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    const result = await electronAPI.git.branch(this.cwd)
    const branches: GitBranch[] = result.all.map((name: string) => ({
      name,
      current: name === result.current,
      commit: ''
    }))

    return {
      current: result.current,
      all: branches
    }
  }

  /**
   * Checkout branch
   */
  async checkout(branch: string, create = false): Promise<void> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    await electronAPI.git.checkout(this.cwd, branch, create)
    this.emit('branchChanged', branch)
  }

  /**
   * Create new branch
   */
  async createBranch(name: string): Promise<void> {
    await this.checkout(name, true)
  }

  /**
   * Stage files
   */
  async add(files: string[]): Promise<void> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    await electronAPI.git.add(this.cwd, files)
    this.emit('filesStaged', files)
  }

  /**
   * Stage all files
   */
  async addAll(): Promise<void> {
    await this.add(['.'])
  }

  /**
   * Commit changes
   */
  async commit(message: string): Promise<void> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    await electronAPI.git.commit(this.cwd, message)
    this.emit('committed', message)
  }

  /**
   * Push changes
   */
  async push(remote = 'origin', branch?: string): Promise<void> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    await electronAPI.git.push(this.cwd, remote, branch)
    this.emit('pushed')
  }

  /**
   * Pull changes
   */
  async pull(remote = 'origin', branch?: string): Promise<void> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    await electronAPI.git.pull(this.cwd, remote, branch)
    this.emit('pulled')
  }

  /**
   * Stash changes
   */
  async stash(action: 'push' | 'pop' | 'list' | 'drop' = 'push', message?: string): Promise<unknown> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    return electronAPI.git.stash(this.cwd, action, message)
  }

  /**
   * Reset changes
   */
  async reset(mode: 'soft' | 'mixed' | 'hard' = 'mixed', ref = 'HEAD'): Promise<void> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    await electronAPI.git.reset(this.cwd, mode, ref)
    this.emit('reset', { mode, ref })
  }

  /**
   * Get blame for a file
   */
  async blame(file: string): Promise<string> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    return electronAPI.git.blame(this.cwd, file)
  }

  /**
   * Initialize a new repository
   */
  async init(): Promise<void> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    await electronAPI.git.init(this.cwd)
    this.emit('initialized')
  }

  /**
   * Clone a repository
   */
  async clone(url: string, targetPath: string): Promise<void> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    await electronAPI.git.clone(url, targetPath)
    this.emit('cloned', { url, targetPath })
  }

  /**
   * Get remote URL
   */
  async getRemoteUrl(remote = 'origin'): Promise<string | null> {
    if (!electronAPI) {
      throw new Error('Git operations not available')
    }

    return electronAPI.git.getRemoteUrl(this.cwd, remote)
  }

  /**
   * Resolve merge conflicts
   */
  async resolveConflicts(resolutions: ConflictResolution[]): Promise<void> {
    for (const resolution of resolutions) {
      switch (resolution.strategy) {
        case 'ours':
          await this.checkoutFile(resolution.file, '--ours')
          break
        case 'theirs':
          await this.checkoutFile(resolution.file, '--theirs')
          break
        case 'manual':
          if (resolution.content) {
            if (electronAPI) {
              await electronAPI.fs.writeFile(`${this.cwd}/${resolution.file}`, resolution.content)
            }
          }
          break
        case 'combine':
          // For combine, we need to manually merge the content
          // This would require reading both versions and combining them
          break
      }
      
      // Stage the resolved file
      await this.add([resolution.file])
    }

    this.emit('conflictsResolved', resolutions)
  }

  /**
   * Checkout a specific file version
   */
  private async checkoutFile(file: string, option: string): Promise<void> {
    // This would need to be implemented via a raw git command
    // For now, we'll use the terminal
    if (electronAPI) {
      await electronAPI.terminal.execute?.(0, `git checkout ${option} -- "${file}"`)
    }
  }

  /**
   * Generate a conventional commit message
   */
  generateCommitMessage(type: string, scope: string | null, description: string, body?: string, breaking?: boolean): string {
    let message = type
    if (scope) {
      message += `(${scope})`
    }
    if (breaking) {
      message += '!'
    }
    message += `: ${description}`
    
    if (body) {
      message += `\n\n${body}`
    }
    
    return message
  }

  /**
   * Get suggested commit type based on changed files
   */
  async suggestCommitType(): Promise<string> {
    const status = await this.getStatus()
    const allFiles = [...status.staged, ...status.modified]
    
    // Analyze file patterns
    const hasTests = allFiles.some(f => f.includes('test') || f.includes('spec'))
    const hasDocs = allFiles.some(f => f.endsWith('.md') || f.includes('docs'))
    const hasConfig = allFiles.some(f => 
      f.includes('config') || 
      f.endsWith('.json') || 
      f.endsWith('.yml') || 
      f.endsWith('.yaml')
    )
    const hasStyles = allFiles.some(f => 
      f.endsWith('.css') || 
      f.endsWith('.scss') || 
      f.endsWith('.less')
    )

    if (hasTests) return 'test'
    if (hasDocs) return 'docs'
    if (hasConfig) return 'chore'
    if (hasStyles) return 'style'
    
    return 'feat' // Default to feature
  }
}

// Factory function
export function createGitHandler(cwd: string): GitHandler {
  return new GitHandler(cwd)
}


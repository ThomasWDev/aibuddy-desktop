import { ipcMain } from 'electron'
import { exec, execSync } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface GitStatus {
  current: string | null
  tracking: string | null
  staged: string[]
  modified: string[]
  not_added: string[]
  deleted: string[]
  conflicted: string[]
  isClean: boolean
}

interface GitLogEntry {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}

interface GitBranch {
  current: string
  all: string[]
  local: string[]
  remote: string[]
}

/**
 * Execute a git command and return the output
 */
async function gitExec(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execAsync(`git ${args.join(' ')}`, { cwd, maxBuffer: 10 * 1024 * 1024 })
  return stdout.trim()
}

/**
 * Check if git is available
 */
function isGitAvailable(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Initialize Git IPC handlers
 */
export function initGitHandlers(): void {
  // Check if git is available at startup
  const gitAvailable = isGitAvailable()
  if (!gitAvailable) {
    console.warn('[Git] Git is not available on this system')
  }

  // Get git status
  ipcMain.handle('git:status', async (_event, cwd: string): Promise<GitStatus> => {
    try {
      const statusOutput = await gitExec(cwd, ['status', '--porcelain', '-b'])
      const lines = statusOutput.split('\n').filter(Boolean)
      
      const status: GitStatus = {
        current: null,
        tracking: null,
        staged: [],
        modified: [],
        not_added: [],
        deleted: [],
        conflicted: [],
        isClean: true
      }

      for (const line of lines) {
        if (line.startsWith('##')) {
          // Branch info line
          const branchMatch = line.match(/^## (.+?)(?:\.\.\.(.+))?$/)
          if (branchMatch) {
            status.current = branchMatch[1]
            status.tracking = branchMatch[2] || null
          }
        } else {
          const xy = line.substring(0, 2)
          const file = line.substring(3)
          status.isClean = false

          if (xy[0] === 'A' || xy[0] === 'M' || xy[0] === 'D' || xy[0] === 'R') {
            status.staged.push(file)
          }
          if (xy[1] === 'M') {
            status.modified.push(file)
          }
          if (xy[1] === 'D') {
            status.deleted.push(file)
          }
          if (xy === '??') {
            status.not_added.push(file)
          }
          if (xy === 'UU' || xy === 'AA' || xy === 'DD') {
            status.conflicted.push(file)
          }
        }
      }

      return status
    } catch (error) {
      throw new Error(`Git status failed: ${(error as Error).message}`)
    }
  })

  // Get git diff
  ipcMain.handle('git:diff', async (_event, cwd: string, options?: { staged?: boolean; file?: string }): Promise<string> => {
    try {
      const args = ['diff']
      if (options?.staged) {
        args.push('--staged')
      }
      if (options?.file) {
        args.push('--', options.file)
      }
      return await gitExec(cwd, args)
    } catch (error) {
      throw new Error(`Git diff failed: ${(error as Error).message}`)
    }
  })

  // Get git log
  ipcMain.handle('git:log', async (_event, cwd: string, options?: { maxCount?: number; file?: string }): Promise<{ all: GitLogEntry[] }> => {
    try {
      const args = ['log', '--format=%H|%aI|%s|%an|%ae']
      if (options?.maxCount) {
        args.push(`-n${options.maxCount}`)
      }
      if (options?.file) {
        args.push('--', options.file)
      }
      
      const output = await gitExec(cwd, args)
      const entries: GitLogEntry[] = output.split('\n').filter(Boolean).map(line => {
        const [hash, date, message, author_name, author_email] = line.split('|')
        return { hash, date, message, author_name, author_email }
      })
      
      return { all: entries }
    } catch (error) {
      throw new Error(`Git log failed: ${(error as Error).message}`)
    }
  })

  // Get branches
  ipcMain.handle('git:branch', async (_event, cwd: string): Promise<GitBranch> => {
    try {
      const output = await gitExec(cwd, ['branch', '-a'])
      const lines = output.split('\n').filter(Boolean)
      
      const result: GitBranch = {
        current: '',
        all: [],
        local: [],
        remote: []
      }

      for (const line of lines) {
        const isCurrent = line.startsWith('*')
        const branchName = line.replace(/^\*?\s+/, '').trim()
        
        if (isCurrent) {
          result.current = branchName
        }
        
        result.all.push(branchName)
        
        if (branchName.startsWith('remotes/')) {
          result.remote.push(branchName)
        } else {
          result.local.push(branchName)
        }
      }

      return result
    } catch (error) {
      throw new Error(`Git branch failed: ${(error as Error).message}`)
    }
  })

  // Checkout branch
  ipcMain.handle('git:checkout', async (_event, cwd: string, branch: string, create = false): Promise<void> => {
    try {
      const args = ['checkout']
      if (create) {
        args.push('-b')
      }
      args.push(branch)
      await gitExec(cwd, args)
    } catch (error) {
      throw new Error(`Git checkout failed: ${(error as Error).message}`)
    }
  })

  // Commit changes
  ipcMain.handle('git:commit', async (_event, cwd: string, message: string): Promise<void> => {
    try {
      await gitExec(cwd, ['commit', '-m', `"${message.replace(/"/g, '\\"')}"`])
    } catch (error) {
      throw new Error(`Git commit failed: ${(error as Error).message}`)
    }
  })

  // Add files to staging
  ipcMain.handle('git:add', async (_event, cwd: string, files: string[]): Promise<void> => {
    try {
      await gitExec(cwd, ['add', ...files])
    } catch (error) {
      throw new Error(`Git add failed: ${(error as Error).message}`)
    }
  })

  // Push changes
  ipcMain.handle('git:push', async (_event, cwd: string, remote = 'origin', branch?: string): Promise<void> => {
    try {
      const args = ['push', remote]
      if (branch) {
        args.push(branch)
      }
      await gitExec(cwd, args)
    } catch (error) {
      throw new Error(`Git push failed: ${(error as Error).message}`)
    }
  })

  // Pull changes
  ipcMain.handle('git:pull', async (_event, cwd: string, remote = 'origin', branch?: string): Promise<void> => {
    try {
      const args = ['pull', remote]
      if (branch) {
        args.push(branch)
      }
      await gitExec(cwd, args)
    } catch (error) {
      throw new Error(`Git pull failed: ${(error as Error).message}`)
    }
  })

  // Stash changes
  ipcMain.handle('git:stash', async (_event, cwd: string, action: 'push' | 'pop' | 'list' | 'drop' = 'push', message?: string): Promise<string> => {
    try {
      let args: string[]
      switch (action) {
        case 'push':
          args = ['stash', 'push', '-m', `"${message || 'AIBuddy stash'}"`]
          break
        case 'pop':
          args = ['stash', 'pop']
          break
        case 'list':
          args = ['stash', 'list']
          break
        case 'drop':
          args = ['stash', 'drop']
          break
        default:
          throw new Error(`Unknown stash action: ${action}`)
      }
      return await gitExec(cwd, args)
    } catch (error) {
      throw new Error(`Git stash failed: ${(error as Error).message}`)
    }
  })

  // Reset changes
  ipcMain.handle('git:reset', async (_event, cwd: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed', ref = 'HEAD'): Promise<void> => {
    try {
      await gitExec(cwd, ['reset', `--${mode}`, ref])
    } catch (error) {
      throw new Error(`Git reset failed: ${(error as Error).message}`)
    }
  })

  // Get blame for a file
  ipcMain.handle('git:blame', async (_event, cwd: string, file: string): Promise<string> => {
    try {
      return await gitExec(cwd, ['blame', file])
    } catch (error) {
      throw new Error(`Git blame failed: ${(error as Error).message}`)
    }
  })

  // Check if directory is a git repository
  ipcMain.handle('git:isRepo', async (_event, cwd: string): Promise<boolean> => {
    try {
      await gitExec(cwd, ['rev-parse', '--is-inside-work-tree'])
      return true
    } catch {
      return false
    }
  })

  // Initialize a new repository
  ipcMain.handle('git:init', async (_event, cwd: string): Promise<void> => {
    try {
      await gitExec(cwd, ['init'])
    } catch (error) {
      throw new Error(`Git init failed: ${(error as Error).message}`)
    }
  })

  // Clone a repository
  ipcMain.handle('git:clone', async (_event, url: string, targetPath: string): Promise<void> => {
    try {
      await execAsync(`git clone "${url}" "${targetPath}"`, { maxBuffer: 50 * 1024 * 1024 })
    } catch (error) {
      throw new Error(`Git clone failed: ${(error as Error).message}`)
    }
  })

  // Get remote URL
  ipcMain.handle('git:getRemoteUrl', async (_event, cwd: string, remote = 'origin'): Promise<string | null> => {
    try {
      const url = await gitExec(cwd, ['remote', 'get-url', remote])
      return url || null
    } catch {
      return null
    }
  })
}

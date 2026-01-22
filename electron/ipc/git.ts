import { ipcMain } from 'electron'
import simpleGit, { SimpleGit, StatusResult, LogResult, BranchSummary } from 'simple-git'

/**
 * Initialize Git IPC handlers
 */
export function initGitHandlers(): void {
  // Get git status
  ipcMain.handle('git:status', async (_event, cwd: string): Promise<StatusResult> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      return await git.status()
    } catch (error) {
      throw new Error(`Git status failed: ${(error as Error).message}`)
    }
  })

  // Get git diff
  ipcMain.handle('git:diff', async (_event, cwd: string, options?: { staged?: boolean; file?: string }): Promise<string> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      const args: string[] = []
      
      if (options?.staged) {
        args.push('--staged')
      }
      if (options?.file) {
        args.push('--', options.file)
      }
      
      return await git.diff(args)
    } catch (error) {
      throw new Error(`Git diff failed: ${(error as Error).message}`)
    }
  })

  // Get git log
  ipcMain.handle('git:log', async (_event, cwd: string, options?: { maxCount?: number; file?: string }): Promise<LogResult> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      const logOptions: Record<string, unknown> = {}
      
      if (options?.maxCount) {
        logOptions.maxCount = options.maxCount
      }
      if (options?.file) {
        logOptions.file = options.file
      }
      
      return await git.log(logOptions)
    } catch (error) {
      throw new Error(`Git log failed: ${(error as Error).message}`)
    }
  })

  // Get branches
  ipcMain.handle('git:branch', async (_event, cwd: string): Promise<{ current: string; all: string[]; branches: BranchSummary }> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      const branches = await git.branch()
      return {
        current: branches.current,
        all: branches.all,
        branches
      }
    } catch (error) {
      throw new Error(`Git branch failed: ${(error as Error).message}`)
    }
  })

  // Checkout branch
  ipcMain.handle('git:checkout', async (_event, cwd: string, branch: string, create = false): Promise<void> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      if (create) {
        await git.checkoutLocalBranch(branch)
      } else {
        await git.checkout(branch)
      }
    } catch (error) {
      throw new Error(`Git checkout failed: ${(error as Error).message}`)
    }
  })

  // Commit changes
  ipcMain.handle('git:commit', async (_event, cwd: string, message: string): Promise<void> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      await git.commit(message)
    } catch (error) {
      throw new Error(`Git commit failed: ${(error as Error).message}`)
    }
  })

  // Add files to staging
  ipcMain.handle('git:add', async (_event, cwd: string, files: string[]): Promise<void> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      await git.add(files)
    } catch (error) {
      throw new Error(`Git add failed: ${(error as Error).message}`)
    }
  })

  // Push changes
  ipcMain.handle('git:push', async (_event, cwd: string, remote = 'origin', branch?: string): Promise<void> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      if (branch) {
        await git.push(remote, branch)
      } else {
        await git.push()
      }
    } catch (error) {
      throw new Error(`Git push failed: ${(error as Error).message}`)
    }
  })

  // Pull changes
  ipcMain.handle('git:pull', async (_event, cwd: string, remote = 'origin', branch?: string): Promise<void> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      if (branch) {
        await git.pull(remote, branch)
      } else {
        await git.pull()
      }
    } catch (error) {
      throw new Error(`Git pull failed: ${(error as Error).message}`)
    }
  })

  // Stash changes
  ipcMain.handle('git:stash', async (_event, cwd: string, action: 'push' | 'pop' | 'list' | 'drop' = 'push', message?: string): Promise<unknown> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      switch (action) {
        case 'push':
          return await git.stash(['push', '-m', message || 'AIBuddy stash'])
        case 'pop':
          return await git.stash(['pop'])
        case 'list':
          return await git.stashList()
        case 'drop':
          return await git.stash(['drop'])
        default:
          throw new Error(`Unknown stash action: ${action}`)
      }
    } catch (error) {
      throw new Error(`Git stash failed: ${(error as Error).message}`)
    }
  })

  // Reset changes
  ipcMain.handle('git:reset', async (_event, cwd: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed', ref = 'HEAD'): Promise<void> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      await git.reset([`--${mode}`, ref])
    } catch (error) {
      throw new Error(`Git reset failed: ${(error as Error).message}`)
    }
  })

  // Get blame for a file
  ipcMain.handle('git:blame', async (_event, cwd: string, file: string): Promise<string> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      return await git.raw(['blame', file])
    } catch (error) {
      throw new Error(`Git blame failed: ${(error as Error).message}`)
    }
  })

  // Check if directory is a git repository
  ipcMain.handle('git:isRepo', async (_event, cwd: string): Promise<boolean> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      return await git.checkIsRepo()
    } catch {
      return false
    }
  })

  // Initialize a new repository
  ipcMain.handle('git:init', async (_event, cwd: string): Promise<void> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      await git.init()
    } catch (error) {
      throw new Error(`Git init failed: ${(error as Error).message}`)
    }
  })

  // Clone a repository
  ipcMain.handle('git:clone', async (_event, url: string, targetPath: string): Promise<void> => {
    try {
      const git: SimpleGit = simpleGit()
      await git.clone(url, targetPath)
    } catch (error) {
      throw new Error(`Git clone failed: ${(error as Error).message}`)
    }
  })

  // Get remote URL
  ipcMain.handle('git:getRemoteUrl', async (_event, cwd: string, remote = 'origin'): Promise<string | null> => {
    try {
      const git: SimpleGit = simpleGit(cwd)
      const remotes = await git.getRemotes(true)
      const targetRemote = remotes.find(r => r.name === remote)
      return targetRemote?.refs.fetch || null
    } catch {
      return null
    }
  })
}


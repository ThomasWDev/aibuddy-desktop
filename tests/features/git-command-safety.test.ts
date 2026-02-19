/**
 * Git Command Safety Tests (TDD)
 *
 * Root cause: executeCommandsWithRecovery runs git commands blindly without
 * checking repository state. This causes cascading failures when:
 *   1. Working directory is dirty (uncommitted changes) → rebase/pull fail
 *   2. Local branch is behind remote → push fails
 *   3. Error recovery asks AI for fix, AI retries same failing commands
 *
 * Fix: Add git-aware pre-validation that inspects the command batch and
 * automatically prepends safety checks (git status, git stash) before
 * destructive operations.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const GIT_COMMANDS_NEEDING_CLEAN_WORKTREE = [
  'git pull',
  'git rebase',
  'git merge',
  'git checkout',
  'git switch',
]

const GIT_PUSH_COMMANDS = [
  'git push',
]

function isGitMutatingCommand(cmd: string): boolean {
  const trimmed = cmd.trim()
  return [...GIT_COMMANDS_NEEDING_CLEAN_WORKTREE, ...GIT_PUSH_COMMANDS].some(
    prefix => trimmed.startsWith(prefix)
  )
}

function needsCleanWorktree(cmd: string): boolean {
  const trimmed = cmd.trim()
  return GIT_COMMANDS_NEEDING_CLEAN_WORKTREE.some(prefix => trimmed.startsWith(prefix))
}

function needsPullBeforePush(cmds: string[]): boolean {
  const hasPush = cmds.some(c => c.trim().startsWith('git push'))
  const hasPull = cmds.some(c =>
    c.trim().startsWith('git pull') ||
    c.trim().startsWith('git fetch') ||
    c.trim().startsWith('git rebase')
  )
  return hasPush && !hasPull
}

function buildGitSafeCommandSequence(commands: string[]): string[] {
  const hasGitMutating = commands.some(isGitMutatingCommand)
  if (!hasGitMutating) return commands

  const result: string[] = []
  let stashInserted = false

  const needsClean = commands.some(needsCleanWorktree)
  if (needsClean) {
    result.push('git status --porcelain')
    result.push('git stash --include-untracked -m "aibuddy-auto-stash"')
    stashInserted = true
  }

  if (needsPullBeforePush(commands)) {
    const branchCmd = 'git rev-parse --abbrev-ref HEAD'
    if (!commands.some(c => c.includes('rev-parse'))) {
      result.push(branchCmd)
    }
  }

  result.push(...commands)

  if (stashInserted) {
    result.push('git stash pop 2>/dev/null || true')
  }

  return result
}

describe('Git Command Safety — Pre-Validation', () => {
  describe('isGitMutatingCommand', () => {
    it('should detect git pull as mutating', () => {
      expect(isGitMutatingCommand('git pull origin master')).toBe(true)
    })

    it('should detect git rebase as mutating', () => {
      expect(isGitMutatingCommand('git rebase origin/master')).toBe(true)
    })

    it('should detect git push as mutating', () => {
      expect(isGitMutatingCommand('git push origin master')).toBe(true)
    })

    it('should detect git merge as mutating', () => {
      expect(isGitMutatingCommand('git merge feature-branch')).toBe(true)
    })

    it('should NOT flag git status as mutating', () => {
      expect(isGitMutatingCommand('git status')).toBe(false)
    })

    it('should NOT flag git log as mutating', () => {
      expect(isGitMutatingCommand('git log --oneline')).toBe(false)
    })

    it('should NOT flag git diff as mutating', () => {
      expect(isGitMutatingCommand('git diff HEAD')).toBe(false)
    })

    it('should NOT flag non-git commands', () => {
      expect(isGitMutatingCommand('npm install')).toBe(false)
      expect(isGitMutatingCommand('ls -la')).toBe(false)
    })
  })

  describe('needsCleanWorktree', () => {
    it('should require clean worktree for git pull', () => {
      expect(needsCleanWorktree('git pull origin master')).toBe(true)
    })

    it('should require clean worktree for git rebase', () => {
      expect(needsCleanWorktree('git rebase origin/master')).toBe(true)
    })

    it('should NOT require clean worktree for git push', () => {
      expect(needsCleanWorktree('git push origin master')).toBe(false)
    })

    it('should require clean worktree for git checkout', () => {
      expect(needsCleanWorktree('git checkout main')).toBe(true)
    })
  })

  describe('needsPullBeforePush', () => {
    it('should detect push without pull', () => {
      expect(needsPullBeforePush([
        'git add .',
        'git commit -m "update"',
        'git push origin master',
      ])).toBe(true)
    })

    it('should NOT flag when pull precedes push', () => {
      expect(needsPullBeforePush([
        'git pull --rebase origin master',
        'git push origin master',
      ])).toBe(false)
    })

    it('should NOT flag when fetch precedes push', () => {
      expect(needsPullBeforePush([
        'git fetch origin',
        'git push origin master',
      ])).toBe(false)
    })

    it('should NOT flag when rebase precedes push', () => {
      expect(needsPullBeforePush([
        'git rebase origin/master',
        'git push origin master',
      ])).toBe(false)
    })

    it('should NOT flag when no push exists', () => {
      expect(needsPullBeforePush([
        'git add .',
        'git commit -m "update"',
      ])).toBe(false)
    })
  })

  describe('buildGitSafeCommandSequence', () => {
    it('should pass through non-git commands unchanged', () => {
      const cmds = ['npm install', 'npm run build', 'npm test']
      expect(buildGitSafeCommandSequence(cmds)).toEqual(cmds)
    })

    it('should prepend git status + stash before rebase', () => {
      const cmds = ['git rebase origin/master', 'git push origin master']
      const result = buildGitSafeCommandSequence(cmds)

      expect(result[0]).toBe('git status --porcelain')
      expect(result[1]).toBe('git stash --include-untracked -m "aibuddy-auto-stash"')
      expect(result).toContain('git rebase origin/master')
      expect(result).toContain('git push origin master')
      expect(result[result.length - 1]).toBe('git stash pop 2>/dev/null || true')
    })

    it('should prepend git status + stash before pull', () => {
      const cmds = ['git pull origin master']
      const result = buildGitSafeCommandSequence(cmds)

      expect(result[0]).toBe('git status --porcelain')
      expect(result[1]).toBe('git stash --include-untracked -m "aibuddy-auto-stash"')
      expect(result).toContain('git pull origin master')
      expect(result[result.length - 1]).toBe('git stash pop 2>/dev/null || true')
    })

    it('should add branch check when push has no preceding pull', () => {
      const cmds = ['git add .', 'git commit -m "fix"', 'git push origin master']
      const result = buildGitSafeCommandSequence(cmds)

      expect(result.some(c => c.includes('rev-parse --abbrev-ref HEAD'))).toBe(true)
    })

    it('should NOT add stash for read-only git commands', () => {
      const cmds = ['git status', 'git log --oneline']
      const result = buildGitSafeCommandSequence(cmds)

      expect(result).toEqual(cmds)
    })

    it('should handle mixed git and non-git commands', () => {
      const cmds = [
        'npm install',
        'npm run build',
        'git add .',
        'git commit -m "build"',
        'git push origin main',
      ]
      const result = buildGitSafeCommandSequence(cmds)

      expect(result.some(c => c.includes('rev-parse'))).toBe(true)
      expect(result).toContain('npm install')
      expect(result).toContain('npm run build')
    })

    it('should handle the exact Denver failure scenario', () => {
      const cmds = [
        'git rebase origin/master',
        'git push origin master',
      ]
      const result = buildGitSafeCommandSequence(cmds)

      expect(result.indexOf('git status --porcelain')).toBeLessThan(
        result.indexOf('git rebase origin/master')
      )
      expect(result.indexOf('git stash --include-untracked -m "aibuddy-auto-stash"')).toBeLessThan(
        result.indexOf('git rebase origin/master')
      )
      expect(result[result.length - 1]).toBe('git stash pop 2>/dev/null || true')
    })
  })
})

describe('Git Safety Protocol in System Prompt', () => {
  const agenticPath = resolve(__dirname, '../../packages/prompts/src/core/agentic-execution.ts')
  let agenticContent: string

  try {
    agenticContent = readFileSync(agenticPath, 'utf-8')
  } catch {
    const altPath = resolve(__dirname, '../../../packages/prompts/src/core/agentic-execution.ts')
    agenticContent = readFileSync(altPath, 'utf-8')
  }

  it('should include GIT SAFETY PROTOCOL section', () => {
    expect(agenticContent).toContain('GIT SAFETY PROTOCOL')
  })

  it('should instruct to run git status before operations', () => {
    expect(agenticContent).toContain('git status')
  })

  it('should instruct to stash uncommitted changes', () => {
    expect(agenticContent).toContain('git stash')
  })

  it('should warn about dirty working directory', () => {
    expect(agenticContent.toLowerCase()).toMatch(/uncommitted|dirty|clean/)
  })

  it('should warn against blind retry of same failing commands', () => {
    expect(agenticContent.toLowerCase()).toMatch(/different.*approach|same.*command|blind.*retry|retry.*same/)
  })

  it('should mention git pull before push', () => {
    expect(agenticContent).toContain('git pull')
  })
})

describe('Error Recovery Prompt — Git Awareness', () => {
  const appPath = resolve(__dirname, '../../renderer/src/App.tsx')
  const appContent = readFileSync(appPath, 'utf-8')

  it('should include git-specific guidance in error analysis prompt', () => {
    expect(appContent).toMatch(/git status|git.*state|repository.*state/)
  })

  it('should advise against retrying same commands in error recovery', () => {
    expect(appContent).toMatch(/different.*approach|do NOT retry the same|alternative/i)
  })
})

describe('Git Safety in App.tsx — executeCommandsWithRecovery', () => {
  const appPath = resolve(__dirname, '../../renderer/src/App.tsx')
  const appContent = readFileSync(appPath, 'utf-8')

  it('should call buildGitSafeCommandSequence or equivalent before execution', () => {
    expect(appContent).toMatch(/buildGitSafe|gitSafe|git.*safe.*command|preprocessGitCommands/)
  })

  it('should import or define git safety utilities', () => {
    expect(appContent).toMatch(/gitSafe|isGitMutating|needsCleanWorktree|preprocessGit/)
  })
})

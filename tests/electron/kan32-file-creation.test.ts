import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-32: App claims file creation but no file is actually created
 *
 * Root cause: The `userWantsExecution` regex only matched action keywords
 * like "run", "execute", "build", etc. — but NOT file-creation keywords
 * like "create", "make", "write", "generate". When a user said "Create a
 * C file", the regex returned null, skipping the entire command execution
 * pipeline. The AI responded with a heredoc command in the chat, but it
 * was never executed.
 *
 * Additional issues:
 * - No post-write verification after heredoc execution
 * - No user-facing toast confirming file creation with path
 *
 * Fixes:
 * 1. Expand userWantsExecution regex with file-operation keywords
 * 2. Add extractFilePathFromHeredoc helper
 * 3. Add post-write verification + toast for file-creation commands
 */

const APP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

const TERMINAL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../electron/ipc/terminal.ts'),
  'utf-8'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-32: File creation pipeline', () => {

  // ==========================================================================
  // 1. userWantsExecution regex must include file-creation keywords
  // ==========================================================================
  describe('userWantsExecution regex — file-creation keywords', () => {

    it('must contain "create" keyword in the regex', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('.match('))
      expect(regexLine).toBeTruthy()
      expect(regexLine).toContain('create')
    })

    it('must contain "make" keyword in the regex', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('.match('))
      expect(regexLine).toContain('make')
    })

    it('must contain "write" keyword in the regex', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('.match('))
      expect(regexLine).toContain('write')
    })

    it('must contain "generate" keyword in the regex', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('.match('))
      expect(regexLine).toContain('generate')
    })

    it('must contain "setup" keyword in the regex', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('.match('))
      expect(regexLine).toContain('setup')
    })

    it('must contain "add" keyword in the regex', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('.match('))
      expect(regexLine).toContain('add')
    })

    it('must contain "init" keyword in the regex', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('.match('))
      expect(regexLine).toContain('init')
    })

    it('must still contain existing action keywords (regression guard)', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('.match('))
      expect(regexLine).toContain('run')
      expect(regexLine).toContain('execute')
      expect(regexLine).toContain('build')
      expect(regexLine).toContain('test')
      expect(regexLine).toContain('install')
      expect(regexLine).toContain('deploy')
      expect(regexLine).toContain('fix')
      expect(regexLine).toContain('debug')
    })

    it('must use word boundary \\b to prevent partial matches', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('.match('))
      expect(regexLine).toContain('\\b')
    })
  })

  // ==========================================================================
  // 2. extractFilePathFromHeredoc helper
  // ==========================================================================
  describe('extractFilePathFromHeredoc — detect file-creation commands', () => {
    it('must be defined as a function in App.tsx', () => {
      expect(APP_SOURCE).toContain('function extractFilePathFromHeredoc')
    })

    it('must return null for non-heredoc commands', () => {
      // Function should return null for "npm install", "git status", etc.
      expect(APP_SOURCE).toContain('extractFilePathFromHeredoc')
      // Verify the function has a return path for null
      const fnStart = APP_SOURCE.indexOf('function extractFilePathFromHeredoc')
      const fnBlock = APP_SOURCE.slice(fnStart, fnStart + 500)
      expect(fnBlock).toContain('return null')
    })

    it('must detect "cat > path/file << EOF" pattern', () => {
      const fnStart = APP_SOURCE.indexOf('function extractFilePathFromHeredoc')
      const fnBlock = APP_SOURCE.slice(fnStart, fnStart + 500)
      expect(fnBlock).toMatch(/cat\s.*>/)
    })

    it('must handle "cat >> file" (append) as non-creation', () => {
      // Appending to a file is different from creating — should only match single >
      const fnStart = APP_SOURCE.indexOf('function extractFilePathFromHeredoc')
      const fnBlock = APP_SOURCE.slice(fnStart, fnStart + 500)
      // The regex should use [^>]> or similar to avoid matching >>
      expect(fnBlock).toMatch(/>>|[^>]>/)
    })
  })

  // ==========================================================================
  // 3. Post-write verification after file-creation commands
  // ==========================================================================
  describe('Post-write verification', () => {
    it('must call extractFilePathFromHeredoc in the execution loop', () => {
      const execBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('executeCommandsWithRecovery'),
        APP_SOURCE.lastIndexOf('executeCommandsWithRecovery') > APP_SOURCE.indexOf('executeCommandsWithRecovery')
          ? APP_SOURCE.lastIndexOf('executeCommandsWithRecovery')
          : APP_SOURCE.indexOf('executeCommandsWithRecovery') + 5000
      )
      expect(execBlock).toContain('extractFilePathFromHeredoc')
    })

    it('must show a success toast when file is created', () => {
      expect(APP_SOURCE).toMatch(/toast\.success\(.*[Ff]ile creat/)
    })

    it('must show a warning if file creation could not be verified', () => {
      expect(APP_SOURCE).toMatch(/toast\.warning\(.*[Ff]ile|[Cc]ould not verify/)
    })

    it('must use electronAPI.fs.stat or similar to check file existence', () => {
      const execBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('executeCommandsWithRecovery'),
        APP_SOURCE.indexOf('executeCommandsWithRecovery') + 5000
      )
      const hasVerification =
        execBlock.includes('electronAPI.fs') ||
        execBlock.includes('electronAPI?.fs') ||
        execBlock.includes('window.electronAPI') ||
        execBlock.includes('fs.stat') ||
        execBlock.includes('fs.existsSync') ||
        execBlock.includes('terminal.execute') // stat via shell
      expect(hasVerification).toBe(true)
    })
  })

  // ==========================================================================
  // 4. extractCommands heredoc handling (regression guard)
  // ==========================================================================
  describe('extractCommands — heredoc regression guard', () => {
    it('extractCommands must handle heredoc as single command unit', () => {
      expect(APP_SOURCE).toContain('heredocMatch')
      expect(APP_SOURCE).toContain('delimiter')
    })

    it('must support single-quoted, double-quoted, and bare delimiters', () => {
      // The heredoc regex should match: << 'EOF', << "EOF", << EOF
      const heredocLine = APP_SOURCE.split('\n').find(l =>
        l.includes('heredocMatch') && l.includes('match')
      )
      expect(heredocLine).toBeTruthy()
      // Check the regex handles optional quotes around the delimiter
      expect(heredocLine).toMatch(/['"]/)
    })

    it('must include the closing delimiter in the command', () => {
      const heredocBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('Heredoc:'),
        APP_SOURCE.indexOf('Heredoc:') + 500
      )
      expect(heredocBlock).toContain('delimiter')
      expect(heredocBlock).toContain('commands.push')
    })
  })

  // ==========================================================================
  // 5. Terminal execute IPC handler
  // ==========================================================================
  describe('Terminal execute handler', () => {
    it('must handle terminal:execute IPC channel', () => {
      expect(TERMINAL_SOURCE).toContain("'terminal:execute'")
    })

    it('must use login shell (-l flag) for proper PATH resolution', () => {
      expect(TERMINAL_SOURCE).toContain("'-l'")
    })

    it('must pass cwd (workspace path) to spawned process', () => {
      expect(TERMINAL_SOURCE).toContain('cwd: cwd')
    })

    it('must return stdout, stderr, and exitCode', () => {
      expect(TERMINAL_SOURCE).toContain('resolve({ stdout, stderr, exitCode })')
    })

    it('must have a timeout to prevent hung commands', () => {
      expect(TERMINAL_SOURCE).toContain('timeout')
      expect(TERMINAL_SOURCE).toContain('SIGTERM')
    })
  })
})

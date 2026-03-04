import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * KAN-32 (v2): File creation still fails when AI uses non-bash code blocks
 *
 * Previous fix expanded userWantsExecution regex and added post-write
 * verification, but parseCodeBlocks only captures bash|sh|shell|zsh
 * tagged blocks. When the AI puts a heredoc in an untagged or content-
 * tagged block (e.g. ```c or ```), the command is never extracted and
 * the file is never created — even though the correct heredoc was generated.
 *
 * Fix: Add fallback extraction that scans all code blocks for heredoc
 * patterns (cat > ... << or tee ... <<), regardless of language tag.
 * Also accept untagged code blocks that start with shell-like commands.
 */

const PROJECT_ROOT = path.resolve(__dirname, '../..')

const APP_SOURCE = fs.readFileSync(
  path.join(PROJECT_ROOT, 'renderer/src/App.tsx'),
  'utf-8'
)

describe('KAN-32 v2: Heredoc fallback extraction', () => {

  // ==========================================================================
  // 1. parseCodeBlocks must have fallback for heredoc-containing blocks
  // ==========================================================================
  describe('parseCodeBlocks — heredoc-aware extraction', () => {
    const getParseBlock = () => APP_SOURCE.slice(
      APP_SOURCE.indexOf('function parseCodeBlocks'),
      APP_SOURCE.indexOf('function extractCommands')
    )

    it('must capture bash-tagged blocks (existing behavior)', () => {
      expect(getParseBlock()).toMatch(/bash.*sh.*shell.*zsh/)
    })

    it('must have a looksLikeShellCommand fallback', () => {
      expect(getParseBlock()).toContain('looksLikeShellCommand')
    })

    it('looksLikeShellCommand must detect heredoc patterns (cat > ... <<)', () => {
      expect(getParseBlock()).toMatch(/cat\s.*<<|tee\s.*<</)
    })

    it('looksLikeShellCommand must detect common shell commands (mkdir, cat, chmod)', () => {
      expect(getParseBlock()).toMatch(/mkdir|cat\b|chmod/)
    })
  })

  // ==========================================================================
  // 2. System prompt must instruct AI to use bash tags for commands
  // ==========================================================================
  describe('System prompt — bash tag instruction', () => {
    let agenticSource: string

    it('agentic-execution prompt must require bash code blocks', () => {
      const agenticPath = path.join(
        PROJECT_ROOT, 'packages/prompts/src/core/agentic-execution.ts'
      )
      agenticSource = fs.readFileSync(agenticPath, 'utf-8')
      expect(agenticSource).toMatch(/MUST.*bash.*language.*tag|bash.*language.*tag.*MUST/)
    })

    it('must include heredoc file creation examples in bash blocks', () => {
      const agenticPath = path.join(
        PROJECT_ROOT, 'packages/prompts/src/core/agentic-execution.ts'
      )
      agenticSource = fs.readFileSync(agenticPath, 'utf-8')
      expect(agenticSource).toContain('cat >')
      expect(agenticSource).toContain('AIBUDDY_EOF')
    })
  })

  // ==========================================================================
  // 3. Execution gate must still work with file-creation keywords
  // ==========================================================================
  describe('userWantsExecution regex — file keywords', () => {
    it('must match "create" keyword', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('match'))
      expect(regexLine).toBeTruthy()
      expect(regexLine).toContain('create')
    })

    it('must match "write" keyword', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('match'))
      expect(regexLine).toContain('write')
    })

    it('must match "generate" keyword', () => {
      const regexLine = APP_SOURCE.split('\n').find(l => l.includes('userWantsExecution') && l.includes('match'))
      expect(regexLine).toContain('generate')
    })
  })

  // ==========================================================================
  // 4. extractFilePathFromHeredoc must handle common patterns
  // ==========================================================================
  describe('extractFilePathFromHeredoc — pattern coverage', () => {
    it('must exist as a function in App.tsx', () => {
      expect(APP_SOURCE).toContain('function extractFilePathFromHeredoc')
    })

    it('must handle cat > file << pattern', () => {
      const fnBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('function extractFilePathFromHeredoc'),
        APP_SOURCE.indexOf('function extractFilePathFromHeredoc') + 400
      )
      expect(fnBlock).toMatch(/cat\s/)
    })

    it('must handle tee file << pattern', () => {
      const fnBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('function extractFilePathFromHeredoc'),
        APP_SOURCE.indexOf('function extractFilePathFromHeredoc') + 400
      )
      expect(fnBlock).toMatch(/tee\s/)
    })
  })

  // ==========================================================================
  // 5. Post-write verification must still exist
  // ==========================================================================
  describe('Post-write verification', () => {
    it('must verify file existence after heredoc execution', () => {
      const verifyBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('Post-write verification'),
        APP_SOURCE.indexOf('Post-write verification') + 800
      )
      expect(verifyBlock).toContain('extractFilePathFromHeredoc')
      expect(verifyBlock).toContain('EXISTS')
    })

    it('must show success toast on verified file creation', () => {
      const verifyBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('Post-write verification'),
        APP_SOURCE.indexOf('Post-write verification') + 800
      )
      expect(verifyBlock).toContain('toast.success')
      expect(verifyBlock).toContain('File created')
    })
  })

  // ==========================================================================
  // 6. Regression: existing bash block extraction must still work
  // ==========================================================================
  describe('Regression — bash block extraction', () => {
    it('parseCodeBlocks must still use the triple-backtick regex', () => {
      const fnBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('function parseCodeBlocks'),
        APP_SOURCE.indexOf('function extractCommands')
      )
      expect(fnBlock).toContain('```')
    })

    it('extractCommands must still handle heredoc delimiter', () => {
      const fnBlock = APP_SOURCE.slice(
        APP_SOURCE.indexOf('function extractCommands'),
        APP_SOURCE.indexOf('function extractFilePathFromHeredoc')
      )
      expect(fnBlock).toContain('heredocMatch')
      expect(fnBlock).toContain('delimiter')
    })
  })
})

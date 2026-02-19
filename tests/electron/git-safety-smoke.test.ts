/**
 * Git Safety Smoke Tests — Regression Guard
 *
 * Validates that the git-aware pre-validation pipeline exists and the
 * system prompt includes the Git Safety Protocol. Prevents regression of
 * the Denver repo failure (blind git rebase + push without state check).
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const appPath = resolve(__dirname, '../../renderer/src/App.tsx')
const appContent = readFileSync(appPath, 'utf-8')

const agenticPath = resolve(__dirname, '../../packages/prompts/src/core/agentic-execution.ts')
const agenticContent = readFileSync(agenticPath, 'utf-8')

describe('Git Safety Smoke — Client-Side Pre-Validation', () => {
  it('App.tsx must define preprocessGitCommands function', () => {
    expect(appContent).toContain('function preprocessGitCommands')
  })

  it('App.tsx must define isGitMutatingCommand function', () => {
    expect(appContent).toContain('function isGitMutatingCommand')
  })

  it('App.tsx must call preprocessGitCommands before execution', () => {
    expect(appContent).toMatch(/preprocessGitCommands\(allCommands\)/)
  })

  it('App.tsx must call preprocessGitCommands on retry/fix commands too', () => {
    expect(appContent).toMatch(/preprocessGitCommands\(fixCommands\)/)
  })

  it('App.tsx error recovery prompt must mention git status', () => {
    expect(appContent).toContain('git status')
  })

  it('App.tsx error recovery prompt must advise against same commands', () => {
    expect(appContent).toMatch(/do NOT retry the same|different approach/i)
  })
})

describe('Git Safety Smoke — System Prompt', () => {
  it('agentic-execution.ts must include GIT SAFETY PROTOCOL', () => {
    expect(agenticContent).toContain('GIT SAFETY PROTOCOL')
  })

  it('agentic-execution.ts must instruct git stash before rebase/pull', () => {
    expect(agenticContent).toContain('git stash')
  })

  it('agentic-execution.ts must warn against blind retry', () => {
    expect(agenticContent.toLowerCase()).toMatch(/retry.*same|same.*command|blind/)
  })

  it('error recovery table must include git dirty index recovery', () => {
    expect(agenticContent).toContain('Git dirty index')
  })

  it('error recovery table must include git push rejected recovery', () => {
    expect(agenticContent).toContain('Git push rejected')
  })
})

describe('Git Safety Smoke — Architecture', () => {
  it('auto-mode-manager.ts must classify git rebase as risky', () => {
    const autoModePath = resolve(__dirname, '../../src/agent/auto-mode-manager.ts')
    if (existsSync(autoModePath)) {
      const content = readFileSync(autoModePath, 'utf-8')
      expect(content).toContain('git rebase')
    }
  })

  it('auto-mode-manager.ts must classify git status as trusted', () => {
    const autoModePath = resolve(__dirname, '../../src/agent/auto-mode-manager.ts')
    if (existsSync(autoModePath)) {
      const content = readFileSync(autoModePath, 'utf-8')
      expect(content).toContain("'git status'")
    }
  })
})

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// KAN-283: Implement Skills Engine for Prompt Injection
//
// Root cause: .aibuddy/rules/ infrastructure exists (getProjectRules,
// built-in rules, YAML frontmatter) but it's completely disconnected
// from the prompt pipeline. SystemPromptContext has no projectRules
// field. App.tsx never loads or injects rules. Rules are dead code.
//
// Fix: (1) Add projectRules field to SystemPromptContext. (2) In
// generateSystemPrompt, inject active rules (alwaysApply or explicitly
// enabled) into the system prompt. (3) In App.tsx, load project rules
// on workspace change and pass to generateSystemPrompt. (4) Support
// ordered multi-skill injection.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../packages/prompts/src/system-prompt.ts'),
  'utf-8'
)

const APP_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

const WORKSPACE_SOURCE = fs.readFileSync(
  path.join(__dirname, '../../electron/ipc/workspace.ts'),
  'utf-8'
)

describe('KAN-283: Skills Engine for Prompt Injection', () => {

  // ==========================================================================
  // 1. SystemPromptContext must accept projectRules
  // ==========================================================================
  describe('SystemPromptContext interface', () => {
    it('must have a projectRules field in SystemPromptContext', () => {
      expect(SYSTEM_PROMPT_SOURCE).toMatch(/projectRules\s*\??:\s*/)
    })
  })

  // ==========================================================================
  // 2. generateSystemPrompt must inject rules into the prompt
  // ==========================================================================
  describe('generateSystemPrompt injects rules', () => {
    it('must check for context.projectRules', () => {
      expect(SYSTEM_PROMPT_SOURCE).toMatch(/context\.projectRules/)
    })

    it('must iterate over rules array', () => {
      expect(SYSTEM_PROMPT_SOURCE).toMatch(/projectRules\.(forEach|map|filter|for|reduce)|\bfor\b.*projectRules|projectRules\[/)
    })

    it('must inject rule content into the prompt string', () => {
      const rulesBlock = SYSTEM_PROMPT_SOURCE.slice(
        SYSTEM_PROMPT_SOURCE.indexOf('projectRules'),
        SYSTEM_PROMPT_SOURCE.indexOf('projectRules') + 500
      )
      expect(rulesBlock).toMatch(/prompt\s*\+=|content/)
    })

    it('must filter to only active/alwaysApply rules', () => {
      expect(SYSTEM_PROMPT_SOURCE).toMatch(/alwaysApply/)
    })
  })

  // ==========================================================================
  // 3. App.tsx must load project rules
  // ==========================================================================
  describe('App.tsx loads and passes project rules', () => {
    it('must call getProjectRules or workspace.getProjectRules', () => {
      expect(APP_SOURCE).toMatch(/getProjectRules/)
    })

    it('must pass projectRules to generateSystemPrompt', () => {
      expect(APP_SOURCE).toMatch(/projectRules/)
    })
  })

  // ==========================================================================
  // 4. workspace.ts rules infrastructure is intact
  // ==========================================================================
  describe('workspace rules infrastructure', () => {
    it('must export ProjectRuleDTO interface', () => {
      expect(WORKSPACE_SOURCE).toMatch(/export\s+interface\s+ProjectRuleDTO/)
    })

    it('must have getProjectRules function', () => {
      expect(WORKSPACE_SOURCE).toMatch(/function\s+getProjectRules/)
    })

    it('must have built-in rules array', () => {
      expect(WORKSPACE_SOURCE).toMatch(/DESKTOP_BUILTIN_RULES/)
    })

    it('built-in rules must have alwaysApply: true', () => {
      expect(WORKSPACE_SOURCE).toMatch(/alwaysApply:\s*true/)
    })

    it('must support YAML frontmatter parsing', () => {
      expect(WORKSPACE_SOURCE).toMatch(/parseFrontmatter/)
    })
  })

  // ==========================================================================
  // 5. Regression guards
  // ==========================================================================
  describe('regression guards', () => {
    it('system prompt must still include identity', () => {
      expect(SYSTEM_PROMPT_SOURCE).toContain('AIBUDDY_IDENTITY')
    })

    it('system prompt must still support handoffDoc', () => {
      expect(SYSTEM_PROMPT_SOURCE).toContain('handoffDoc')
    })

    it('system prompt must still support platformContext', () => {
      expect(SYSTEM_PROMPT_SOURCE).toContain('platformContext')
    })

    it('system prompt must still support uiLanguage', () => {
      expect(SYSTEM_PROMPT_SOURCE).toContain('uiLanguage')
    })
  })
})

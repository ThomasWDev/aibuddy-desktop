import { describe, it, expect } from 'vitest'
import { 
  generateSystemPrompt, 
  DESKTOP_PLATFORM_CONTEXT,
  type SystemPromptContext 
} from '../../packages/prompts/src/system-prompt'
import { AGENTIC_EXECUTION } from '../../packages/prompts/src/core/agentic-execution'

/**
 * Desktop System Prompt Tests
 * 
 * ROOT CAUSE: The app got "stuck" when user asked to review a folder on desktop
 * because:
 * 1. The AI had no context about the workspace restriction
 * 2. Commands ran in the wrong directory (loaded folder vs target folder)
 * 3. Multi-line Python scripts were split into individual shell commands
 * 
 * FIX:
 * - DESKTOP_PLATFORM_CONTEXT tells AI that commands only run in opened folder
 * - handoffDoc injects COMPLETE_SYSTEM_HANDOFF.md for project understanding
 * - AI now instructs user to "Open Folder" before running commands
 * 
 * PREVENTION: These tests ensure the system prompt always includes critical rules.
 */

describe('DESKTOP_PLATFORM_CONTEXT', () => {
  it('should be a non-empty string', () => {
    expect(typeof DESKTOP_PLATFORM_CONTEXT).toBe('string')
    expect(DESKTOP_PLATFORM_CONTEXT.length).toBeGreaterThan(100)
  })

  it('should contain workspace-only command rule', () => {
    expect(DESKTOP_PLATFORM_CONTEXT).toContain('Commands run only in the currently opened folder')
  })

  it('should tell user to open folder first', () => {
    expect(DESKTOP_PLATFORM_CONTEXT).toContain('Open that folder first')
  })

  it('should mention heredoc pattern for multi-line scripts', () => {
    expect(DESKTOP_PLATFORM_CONTEXT).toContain('heredoc')
    expect(DESKTOP_PLATFORM_CONTEXT).toContain('cat > file')
  })

  it('should warn about wrong project execution', () => {
    expect(DESKTOP_PLATFORM_CONTEXT).toContain('wrong project')
  })
})

describe('generateSystemPrompt with desktop context', () => {
  it('should include platform context when provided', () => {
    const prompt = generateSystemPrompt({
      workspacePath: '/Users/test/Desktop/MyProject',
      platformContext: DESKTOP_PLATFORM_CONTEXT,
    })
    
    expect(prompt).toContain('Commands run only in the currently opened folder')
    expect(prompt).toContain('/Users/test/Desktop/MyProject')
  })

  it('should include handoff doc when provided', () => {
    const handoff = '# My Project\n\nThis is a test project.'
    const prompt = generateSystemPrompt({
      workspacePath: '/Users/test/Desktop/MyProject',
      handoffDoc: handoff,
    })
    
    expect(prompt).toContain('Project handoff / documentation')
    expect(prompt).toContain('This is a test project')
  })

  it('should include BOTH platform context and handoff doc', () => {
    const handoff = '# CourtEdge\n\nNCAA basketball prediction system.'
    const prompt = generateSystemPrompt({
      workspacePath: '/Users/test/Desktop/CourtEdge-NCAA-System',
      platformContext: DESKTOP_PLATFORM_CONTEXT,
      handoffDoc: handoff,
    })
    
    expect(prompt).toContain('Commands run only in the currently opened folder')
    expect(prompt).toContain('NCAA basketball prediction system')
    expect(prompt).toContain('CourtEdge-NCAA-System')
  })

  it('should work without any context', () => {
    const prompt = generateSystemPrompt()
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(100)
  })

  it('should work with empty context', () => {
    const prompt = generateSystemPrompt({})
    expect(typeof prompt).toBe('string')
  })
})

describe('Documentation Discovery in System Prompt (Feb 17, 2026)', () => {
  it('AGENTIC_EXECUTION should contain DOCUMENTATION DISCOVERY section', () => {
    expect(AGENTIC_EXECUTION).toContain('DOCUMENTATION DISCOVERY')
  })

  it('should instruct AI to search for .md files', () => {
    expect(AGENTIC_EXECUTION).toContain('*.md')
  })

  it('should mention key docs to check (README, KNOWN_ISSUES, CHANGELOG)', () => {
    expect(AGENTIC_EXECUTION).toContain('README')
    expect(AGENTIC_EXECUTION).toContain('KNOWN_ISSUES')
    expect(AGENTIC_EXECUTION).toContain('CHANGELOG')
  })

  it('should exclude node_modules from .md search', () => {
    expect(AGENTIC_EXECUTION).toContain('node_modules')
  })

  it('should tell AI to read docs BEFORE coding', () => {
    expect(AGENTIC_EXECUTION).toMatch(/[Rr]ead.*docs.*BEFORE.*coding|[Rr]ead relevant.*\.md.*BEFORE/)
  })

  it('DESKTOP_PLATFORM_CONTEXT should also mention .md discovery', () => {
    expect(DESKTOP_PLATFORM_CONTEXT).toContain('search for documentation')
    expect(DESKTOP_PLATFORM_CONTEXT).toContain('*.md')
  })

  it('DESKTOP_PLATFORM_CONTEXT should mention docs/ folders', () => {
    expect(DESKTOP_PLATFORM_CONTEXT).toContain('docs/')
  })
})

describe('SystemPromptContext interface', () => {
  it('should accept all expected fields', () => {
    const context: SystemPromptContext = {
      workspacePath: '/test',
      projectType: 'React/TypeScript',
      environmentSummary: 'Node 20, pnpm 9',
      knowledgeContext: 'AWS us-east-2',
      languagePrompt: 'React prompt',
      platformContext: DESKTOP_PLATFORM_CONTEXT,
      hasImages: false,
      handoffDoc: '# Handoff',
      userPreferences: {
        preferredLanguage: 'TypeScript',
        testFramework: 'vitest',
        styleGuide: 'airbnb',
      },
    }
    
    // All fields should be accepted without type errors
    const prompt = generateSystemPrompt(context)
    expect(prompt).toContain('/test')
    expect(prompt).toContain('React/TypeScript')
    expect(prompt).toContain('Node 20, pnpm 9')
    expect(prompt).toContain('Commands run only')
    expect(prompt).toContain('# Handoff')
  })
})

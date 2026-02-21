/**
 * AIBuddy World-Class System Prompt
 * 
 * This is the unified system prompt used across all AIBuddy platforms:
 * - VS Code Extension
 * - Desktop App (Electron)
 * - Web App (Future)
 * - CLI (Future)
 * 
 * Built with 20+ years of senior engineering experience from
 * Microsoft, Apple, and Google.
 * 
 * @version 2.0.0
 * @since 2026-01-24
 */

import { AIBUDDY_IDENTITY } from './core/identity'
import { TDD_METHODOLOGY, TDD_EXAMPLES } from './core/tdd-methodology'
import { SENIOR_ENGINEER_APPROACH } from './core/senior-engineer-approach'
import { CODE_QUALITY_STANDARDS } from './core/code-quality'
import { COMMUNICATION_PROTOCOL } from './core/communication'
import { AGENTIC_EXECUTION } from './core/agentic-execution'
import { IMAGE_ANALYSIS_PROMPT } from './core/image-analysis'

/**
 * Desktop app: rules so the AI and user avoid wrong-workspace mistakes.
 * - Commands run only in the currently opened folder.
 * - If the user asks to "review [folder] on desktop", they must open that folder first.
 */
export const DESKTOP_PLATFORM_CONTEXT = `### Desktop app – workspace and commands
- **Commands run only in the currently opened folder.** The working directory shown above is the only folder where terminal commands execute.
- If the user asks to review or work in a **different** folder (e.g. "CourtEdge-NCAA-System on desktop"), tell them: **Open that folder first** via **File → Open Folder on Desktop** (or **Open Folder** and choose it), then send their request again. Otherwise commands will run in the wrong project and fail or do the wrong thing.
- When creating multi-line scripts (e.g. Python), output a **single** bash block that writes the script with a heredoc (\`cat > file << 'EOF'\` ... \`EOF\`) and then runs it (e.g. \`python3 script.py\`). Do not send script lines as separate shell commands.
- **ALWAYS search for documentation first.** Before non-trivial tasks, run \`find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -30\` to discover README, KNOWN_ISSUES, CHANGELOG, docs/ folders, and project guides. Read relevant .md files BEFORE coding — they contain architecture decisions, API keys, deployment steps, known issues, and rules that prevent regressions.`

/**
 * The complete AIBuddy system prompt
 * 
 * Order matters - AGENTIC_EXECUTION comes first to establish the core behavior
 */
export const AIBUDDY_SYSTEM_PROMPT = `${AIBUDDY_IDENTITY}

${AGENTIC_EXECUTION}

${TDD_METHODOLOGY}

${SENIOR_ENGINEER_APPROACH}

${CODE_QUALITY_STANDARDS}

${COMMUNICATION_PROTOCOL}
`

/**
 * Context that can be injected into the system prompt
 */
export interface SystemPromptContext {
  /** Current working directory / workspace path */
  workspacePath?: string
  
  /** Detected project type (e.g., "React/TypeScript", "Android/Kotlin") */
  projectType?: string
  
  /** Development environment summary (installed tools, SDKs) */
  environmentSummary?: string
  
  /** Knowledge base context (MUST be sanitized - no sensitive data) */
  knowledgeContext?: string
  
  /** Language-specific prompt additions */
  languagePrompt?: string
  
  /** Platform-specific additions (VS Code, Desktop, Web) */
  platformContext?: string
  
  /** Whether the message includes images for analysis */
  hasImages?: boolean
  
  /** Project handoff doc (e.g. COMPLETE_SYSTEM_HANDOFF.md) - injected so the AI understands the project */
  handoffDoc?: string
  
  /** User's chosen UI language (ISO code, e.g. "es", "ja", "zh-Hans").
   *  When set, the AI MUST reply in this language. */
  uiLanguage?: string
  
  /** User preferences */
  userPreferences?: {
    preferredLanguage?: string
    testFramework?: string
    styleGuide?: string
  }
}

/**
 * Generates the complete system prompt with context
 * 
 * SECURITY NOTE:
 * - knowledgeContext should ONLY contain SAFE information (provider names, server names)
 * - NEVER include: IP addresses, SSH credentials, API keys, account IDs
 * - Sensitive data is stored locally and used for local command execution only
 * 
 * @param context - Optional context to inject into the prompt
 * @returns The complete system prompt
 */
export function generateSystemPrompt(context?: SystemPromptContext): string {
  let prompt = AIBUDDY_SYSTEM_PROMPT
  
  // Add context section if any context is provided
  if (context && Object.keys(context).length > 0) {
    prompt += `\n\n## 📍 CURRENT CONTEXT\n`
    
    if (context.workspacePath) {
      prompt += `\n**Working Directory:** \`${context.workspacePath}\``
    }
    
    if (context.projectType) {
      prompt += `\n**Project Type:** ${context.projectType}`
      
      // KAN-33 FIX: Inject language-specific TDD examples based on project type
      // Instead of including ALL language examples (~4000 extra tokens), only include relevant one
      const projectLower = context.projectType.toLowerCase()
      let tddLang: string | null = null
      if (projectLower.includes('python') || projectLower.includes('django') || projectLower.includes('flask')) {
        tddLang = 'python'
      } else if (projectLower.includes('flutter') || projectLower.includes('dart')) {
        tddLang = 'flutter'
      } else if (projectLower.includes('php') || projectLower.includes('laravel')) {
        tddLang = 'php'
      } else if (projectLower.includes('android') || projectLower.includes('kotlin')) {
        tddLang = 'android'
      }
      // JS/TS example is already in the base TDD_METHODOLOGY, no need to add it
      if (tddLang && TDD_EXAMPLES[tddLang]) {
        prompt += `\n${TDD_EXAMPLES[tddLang]}`
      }
    }
    
    if (context.environmentSummary) {
      prompt += `\n\n${context.environmentSummary}`
    }
    
    if (context.knowledgeContext) {
      prompt += `\n\n### Infrastructure Context\n${context.knowledgeContext}`
      prompt += `\n\n> ⚠️ Sensitive credentials are stored locally and NOT sent to the AI.`
    }
    
    if (context.languagePrompt) {
      prompt += `\n\n${context.languagePrompt}`
    }
    
    if (context.platformContext) {
      prompt += `\n\n${context.platformContext}`
    }
    
    if (context.handoffDoc) {
      prompt += `\n\n### Project handoff / documentation\n\nThe following project handoff document is in the user's workspace. Use it to understand the project and tasks.\n\n\`\`\`\n${context.handoffDoc}\n\`\`\``
    }
    
    if (context.userPreferences) {
      prompt += `\n\n### User Preferences`
      if (context.userPreferences.preferredLanguage) {
        prompt += `\n- Preferred Language: ${context.userPreferences.preferredLanguage}`
      }
      if (context.userPreferences.testFramework) {
        prompt += `\n- Test Framework: ${context.userPreferences.testFramework}`
      }
      if (context.userPreferences.styleGuide) {
        prompt += `\n- Style Guide: ${context.userPreferences.styleGuide}`
      }
    }
    
    // Add image analysis capabilities when images are present
    if (context.hasImages) {
      prompt += `\n\n${IMAGE_ANALYSIS_PROMPT}`
    }

    if (context.uiLanguage && context.uiLanguage !== 'en') {
      const langNames: Record<string, string> = {
        es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese', ko: 'Korean',
        'zh-Hans': 'Simplified Chinese', 'zh-Hant': 'Traditional Chinese',
        'pt-BR': 'Brazilian Portuguese', 'pt-PT': 'European Portuguese',
        it: 'Italian', nl: 'Dutch', ru: 'Russian', ar: 'Arabic', hi: 'Hindi',
        tr: 'Turkish', pl: 'Polish', sv: 'Swedish', th: 'Thai', da: 'Danish',
        fi: 'Finnish', no: 'Norwegian', cs: 'Czech', el: 'Greek', he: 'Hebrew',
        hu: 'Hungarian', id: 'Indonesian', ms: 'Malay', ro: 'Romanian',
        sk: 'Slovak', uk: 'Ukrainian', hr: 'Croatian', vi: 'Vietnamese', ca: 'Catalan',
      }
      const langName = langNames[context.uiLanguage] ?? context.uiLanguage
      prompt += `\n\n### 🌍 LANGUAGE INSTRUCTION\n**The user's UI language is ${langName} (\`${context.uiLanguage}\`).** You MUST reply in **${langName}** unless the user explicitly writes in English or asks you to use a different language. Keep code, terminal commands, file paths, and technical identifiers in English/ASCII, but all explanations, comments to the user, questions, and conversational text MUST be in ${langName}.`
    }
  }
  
  return prompt
}

/**
 * Get just the core identity (for lightweight contexts)
 */
export function getIdentityPrompt(): string {
  return AIBUDDY_IDENTITY
}

/**
 * Get just the TDD methodology (for test-focused tasks)
 */
export function getTDDPrompt(): string {
  return TDD_METHODOLOGY
}

/**
 * Get just the senior engineer approach (for planning tasks)
 */
export function getSeniorEngineerPrompt(): string {
  return SENIOR_ENGINEER_APPROACH
}

/**
 * Get just the code quality standards
 */
export function getCodeQualityPrompt(): string {
  return CODE_QUALITY_STANDARDS
}

/**
 * Get just the communication protocol
 */
export function getCommunicationPrompt(): string {
  return COMMUNICATION_PROTOCOL
}

/**
 * Get just the agentic execution protocol (for autonomous tasks)
 */
export function getAgenticPrompt(): string {
  return AGENTIC_EXECUTION
}

export default AIBUDDY_SYSTEM_PROMPT


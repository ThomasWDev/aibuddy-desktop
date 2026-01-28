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
import { TDD_METHODOLOGY } from './core/tdd-methodology'
import { SENIOR_ENGINEER_APPROACH } from './core/senior-engineer-approach'
import { CODE_QUALITY_STANDARDS } from './core/code-quality'
import { COMMUNICATION_PROTOCOL } from './core/communication'
import { AGENTIC_EXECUTION } from './core/agentic-execution'
import { IMAGE_ANALYSIS_PROMPT } from './core/image-analysis'

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
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 CURRENT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    
    if (context.workspacePath) {
      prompt += `\n**Working Directory:** \`${context.workspacePath}\``
    }
    
    if (context.projectType) {
      prompt += `\n**Project Type:** ${context.projectType}`
    }
    
    if (context.environmentSummary) {
      prompt += `\n\n${context.environmentSummary}`
    }
    
    if (context.knowledgeContext) {
      prompt += `\n\n### Infrastructure Context\n${context.knowledgeContext}`
      prompt += `\n\n> ⚠️ **Note:** Sensitive credentials are stored locally and NOT sent to the AI.`
    }
    
    if (context.languagePrompt) {
      prompt += `\n\n${context.languagePrompt}`
    }
    
    if (context.platformContext) {
      prompt += `\n\n${context.platformContext}`
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


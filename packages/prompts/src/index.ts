/**
 * @aibuddy/prompts
 * 
 * Shared system prompts for AIBuddy across all platforms:
 * - VS Code Extension
 * - Desktop App (Electron)
 * - Web App (Future)
 * - CLI (Future)
 * 
 * @example
 * ```typescript
 * import { generateSystemPrompt, getLanguagePrompt } from '@aibuddy/prompts'
 * 
 * const prompt = generateSystemPrompt({
 *   workspacePath: '/path/to/project',
 *   projectType: 'React/TypeScript',
 *   environmentSummary: '...',
 * })
 * ```
 */

// Core exports
export {
  AIBUDDY_SYSTEM_PROMPT,
  DESKTOP_PLATFORM_CONTEXT,
  generateSystemPrompt,
  getIdentityPrompt,
  getTDDPrompt,
  getSeniorEngineerPrompt,
  getCodeQualityPrompt,
  getCommunicationPrompt,
  getAgenticPrompt,
  type SystemPromptContext,
} from './system-prompt'

// Core components (for customization)
export { AIBUDDY_IDENTITY } from './core/identity'
export { TDD_METHODOLOGY, TDD_EXAMPLES } from './core/tdd-methodology'
export { SENIOR_ENGINEER_APPROACH } from './core/senior-engineer-approach'
export { CODE_QUALITY_STANDARDS } from './core/code-quality'
export { COMMUNICATION_PROTOCOL } from './core/communication'
export { AGENTIC_EXECUTION } from './core/agentic-execution'
export { IMAGE_ANALYSIS_PROMPT, getImageAnalysisPrompt } from './core/image-analysis'

// Language-specific prompts
export {
  NODEJS_PROMPT,
  REACT_PROMPT,
  FLUTTER_PROMPT,
  ANDROID_PROMPT,
  IOS_PROMPT,
  DOTNET_PROMPT,
  PYTHON_PROMPT,
  RUST_PROMPT,
  GO_PROMPT,
  SOLIDITY_PROMPT,
  getLanguagePrompt,
} from './languages'

// Default export
export { default } from './system-prompt'


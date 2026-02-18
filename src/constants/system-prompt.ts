/**
 * AIBuddy Desktop App - System Prompt
 * 
 * This file re-exports the shared system prompt from @aibuddy/prompts
 * and adds any desktop-specific context.
 * 
 * @author AIBuddy Engineering Team
 * @version 2.0.0
 */

// Re-export everything from the shared package
export {
  AIBUDDY_SYSTEM_PROMPT,
  DESKTOP_PLATFORM_CONTEXT,
  generateSystemPrompt,
  getIdentityPrompt,
  getTDDPrompt,
  getSeniorEngineerPrompt,
  getCodeQualityPrompt,
  getCommunicationPrompt,
  type SystemPromptContext,
} from '@aibuddy/prompts'

// Re-export language prompts
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
} from '@aibuddy/prompts'

// Default export
export { default } from '@aibuddy/prompts'

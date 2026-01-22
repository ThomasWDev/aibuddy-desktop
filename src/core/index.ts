/**
 * Core Module Index
 * 
 * Export all core functionality
 */

export { 
  AIAgent, 
  ToolExecutor, 
  createAgent,
  AVAILABLE_TOOLS,
  type AgentConfig,
  type AgentState,
  type AgentMessage,
  type ToolUse
} from './agent-adapter'

export {
  GitHandler,
  createGitHandler,
  type GitStatus,
  type GitCommit,
  type GitBranch,
  type GitDiff,
  type ConflictResolution
} from './git-handler'


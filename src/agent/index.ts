/**
 * AIBuddy Desktop Agent Module
 * 
 * Provides Cursor-like intelligent capabilities for all platforms:
 * - Mac (Intel & Apple Silicon)
 * - Windows (x64 & ARM)
 * - Linux (x64, ARM, AppImage, Snap, deb)
 */

export {
  AutoModeManager,
  getAutoModeManager,
  resetAutoModeManager
} from './auto-mode-manager'
export type {
  AutoModeLevel,
  AutoModeConfig,
  CommandSafetyResult,
} from './auto-mode-manager'

export {
  SmartAgent,
  getSmartAgent,
  resetSmartAgent
} from './smart-agent'
export type {
  FileInfo,
  ProjectAnalysis,
  CodeBlock,
  ExecutionPlan,
  ExecutionStep,
} from './smart-agent'


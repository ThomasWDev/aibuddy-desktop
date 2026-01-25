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
  AutoModeLevel,
  AutoModeConfig,
  CommandSafetyResult,
  getAutoModeManager,
  resetAutoModeManager
} from './auto-mode-manager'

export {
  SmartAgent,
  FileInfo,
  ProjectAnalysis,
  CodeBlock,
  ExecutionPlan,
  ExecutionStep,
  getSmartAgent,
  resetSmartAgent
} from './smart-agent'


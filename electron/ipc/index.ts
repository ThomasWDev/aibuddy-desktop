import { initFileSystemHandlers, cleanupFileSystemHandlers } from './file-system'
import { initTerminalHandlers, cleanupTerminalHandlers } from './terminal'
import { initGitHandlers } from './git'
import { initCommandHandlers } from './commands'
import { initKnowledgeBaseHandlers, cleanupKnowledgeBaseHandlers } from './knowledge-base'
import { initEnvironmentHandlers, cleanupEnvironmentHandlers } from './environment'
import { initWorkspaceHandlers, cleanupWorkspaceHandlers } from './workspace'

/**
 * Initialize all IPC handlers
 */
export function initAllIpcHandlers(): void {
  initFileSystemHandlers()
  initTerminalHandlers()
  initGitHandlers()
  initCommandHandlers()
  initKnowledgeBaseHandlers()
  initEnvironmentHandlers()
  initWorkspaceHandlers()
  
  console.log('[IPC] All handlers initialized')
}

/**
 * Cleanup all IPC handlers on app quit
 */
export function cleanupAllIpcHandlers(): void {
  cleanupFileSystemHandlers()
  cleanupTerminalHandlers()
  cleanupKnowledgeBaseHandlers()
  cleanupEnvironmentHandlers()
  cleanupWorkspaceHandlers()
  
  console.log('[IPC] All handlers cleaned up')
}

export { registerCommand, executeCommand, getRegisteredCommands } from './commands'
export { getKnowledgeBase } from './knowledge-base'


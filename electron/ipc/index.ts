import { initFileSystemHandlers, cleanupFileSystemHandlers } from './file-system'
import { initTerminalHandlers, cleanupTerminalHandlers } from './terminal'
import { initGitHandlers } from './git'
import { initCommandHandlers } from './commands'
import { initKnowledgeBaseHandlers, cleanupKnowledgeBaseHandlers } from './knowledge-base'

/**
 * Initialize all IPC handlers
 */
export function initAllIpcHandlers(): void {
  initFileSystemHandlers()
  initTerminalHandlers()
  initGitHandlers()
  initCommandHandlers()
  initKnowledgeBaseHandlers()
  
  console.log('[IPC] All handlers initialized')
}

/**
 * Cleanup all IPC handlers on app quit
 */
export function cleanupAllIpcHandlers(): void {
  cleanupFileSystemHandlers()
  cleanupTerminalHandlers()
  cleanupKnowledgeBaseHandlers()
  
  console.log('[IPC] All handlers cleaned up')
}

export { registerCommand, executeCommand, getRegisteredCommands } from './commands'
export { getKnowledgeBase } from './knowledge-base'


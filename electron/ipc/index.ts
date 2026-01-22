import { initFileSystemHandlers, cleanupFileSystemHandlers } from './file-system'
import { initTerminalHandlers, cleanupTerminalHandlers } from './terminal'
import { initGitHandlers } from './git'
import { initCommandHandlers } from './commands'

/**
 * Initialize all IPC handlers
 */
export function initAllIpcHandlers(): void {
  initFileSystemHandlers()
  initTerminalHandlers()
  initGitHandlers()
  initCommandHandlers()
  
  console.log('[IPC] All handlers initialized')
}

/**
 * Cleanup all IPC handlers on app quit
 */
export function cleanupAllIpcHandlers(): void {
  cleanupFileSystemHandlers()
  cleanupTerminalHandlers()
  
  console.log('[IPC] All handlers cleaned up')
}

export { registerCommand, executeCommand, getRegisteredCommands } from './commands'


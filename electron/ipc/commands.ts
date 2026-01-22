import { ipcMain, app } from 'electron'

// Command registry for application commands
type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>

const commandRegistry = new Map<string, CommandHandler>()

/**
 * Register a command handler
 */
export function registerCommand(id: string, handler: CommandHandler): void {
  commandRegistry.set(id, handler)
}

/**
 * Execute a registered command
 */
export async function executeCommand(id: string, ...args: unknown[]): Promise<unknown> {
  const handler = commandRegistry.get(id)
  if (!handler) {
    throw new Error(`Command '${id}' not found`)
  }
  return handler(...args)
}

/**
 * Initialize command IPC handlers
 */
export function initCommandHandlers(): void {
  // Execute a registered command
  ipcMain.handle('command:execute', async (_event, id: string, ...args: unknown[]) => {
    return executeCommand(id, ...args)
  })

  // List all registered commands
  ipcMain.handle('command:list', () => {
    return Array.from(commandRegistry.keys())
  })

  // Check if a command exists
  ipcMain.handle('command:exists', (_event, id: string) => {
    return commandRegistry.has(id)
  })

  // Get app version
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  // Get app path
  ipcMain.handle('app:getPath', (_event, name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents') => {
    return app.getPath(name)
  })

  // Register built-in commands
  registerBuiltInCommands()
}

/**
 * Register built-in application commands
 */
function registerBuiltInCommands(): void {
  // File commands
  registerCommand('file.new', () => {
    // Handled in renderer
    return { action: 'newFile' }
  })

  registerCommand('file.open', () => {
    // Handled in renderer via dialog
    return { action: 'openFile' }
  })

  registerCommand('file.save', () => {
    // Handled in renderer
    return { action: 'saveFile' }
  })

  registerCommand('file.saveAll', () => {
    // Handled in renderer
    return { action: 'saveAllFiles' }
  })

  // Editor commands
  registerCommand('editor.undo', () => {
    return { action: 'undo' }
  })

  registerCommand('editor.redo', () => {
    return { action: 'redo' }
  })

  registerCommand('editor.find', () => {
    return { action: 'find' }
  })

  registerCommand('editor.replace', () => {
    return { action: 'replace' }
  })

  registerCommand('editor.goToLine', () => {
    return { action: 'goToLine' }
  })

  // View commands
  registerCommand('view.toggleSidebar', () => {
    return { action: 'toggleSidebar' }
  })

  registerCommand('view.toggleTerminal', () => {
    return { action: 'toggleTerminal' }
  })

  registerCommand('view.toggleAIPanel', () => {
    return { action: 'toggleAIPanel' }
  })

  // AI commands
  registerCommand('ai.newChat', () => {
    return { action: 'newChat' }
  })

  registerCommand('ai.clearChat', () => {
    return { action: 'clearChat' }
  })

  registerCommand('ai.stopGeneration', () => {
    return { action: 'stopGeneration' }
  })

  // Terminal commands
  registerCommand('terminal.new', () => {
    return { action: 'newTerminal' }
  })

  registerCommand('terminal.clear', () => {
    return { action: 'clearTerminal' }
  })

  registerCommand('terminal.kill', () => {
    return { action: 'killTerminal' }
  })

  // Git commands
  registerCommand('git.commit', () => {
    return { action: 'gitCommit' }
  })

  registerCommand('git.push', () => {
    return { action: 'gitPush' }
  })

  registerCommand('git.pull', () => {
    return { action: 'gitPull' }
  })

  registerCommand('git.sync', () => {
    return { action: 'gitSync' }
  })
}

/**
 * Get all registered commands
 */
export function getRegisteredCommands(): string[] {
  return Array.from(commandRegistry.keys())
}


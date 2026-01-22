/**
 * Adapters Index
 * 
 * Export all adapter modules for easy importing
 */

export { vscode, Uri, type ExtensionContext, type Disposable } from './vscode-shim'
export { createExtensionContext, getExtensionContext, initializeContext } from './context-adapter'
export { TerminalManager, terminalManager, type TerminalInstance, type TerminalOptions, type ExecutionResult } from './terminal-adapter'


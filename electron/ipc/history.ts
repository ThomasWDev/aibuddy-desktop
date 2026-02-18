/**
 * History IPC Handlers
 * 
 * Handles IPC communication for chat history operations.
 */

import { ipcMain } from 'electron'
import { ChatHistoryManager } from '../../src/history/history-manager'

let historyManager: ChatHistoryManager | null = null

/**
 * Initialize history IPC handlers.
 * If history fails to load (e.g. corrupted file), app still opens with empty history.
 */
export function initHistoryHandlers(): void {
  try {
    historyManager = ChatHistoryManager.getInstance()
  } catch (err) {
    console.error('[History] Failed to initialize (app will open with no history):', err)
    historyManager = null
  }

  // Remove any previously registered handlers to prevent "second handler" errors on dev reload
  const channels = [
    'history:getThreads', 'history:getThread', 'history:getActiveThread',
    'history:createThread', 'history:setActiveThread', 'history:addMessage',
    'history:updateMetadata', 'history:renameThread', 'history:updateMessageFeedback',
    'history:deleteThread', 'history:clearAll', 'history:search', 'history:export',
  ] as const
  for (const ch of channels) { ipcMain.removeHandler(ch) }

  const safe = <T>(fn: () => T): T | [] => (historyManager ? fn() : [] as T)
  const safeThread = <T>(fn: () => T): T | null => (historyManager ? fn() : null)
  const safeBool = (fn: () => boolean): boolean => (historyManager ? fn() : false)
  const safeVoid = (fn: () => void): void => { if (historyManager) fn() }

  // Get all threads
  ipcMain.handle('history:getThreads', async () => {
    return safe(() => historyManager!.getThreads())
  })

  // Get a specific thread
  ipcMain.handle('history:getThread', async (_event, threadId: string) => {
    return safeThread(() => historyManager!.getThread(threadId))
  })

  // Get active thread
  ipcMain.handle('history:getActiveThread', async () => {
    return safeThread(() => historyManager!.getActiveThread())
  })

  // Create new thread
  ipcMain.handle('history:createThread', async (_event, firstMessage?: string, workspacePath?: string) => {
    if (!historyManager) return null
    return historyManager.createThread(firstMessage, workspacePath)
  })

  // Set active thread
  ipcMain.handle('history:setActiveThread', async (_event, threadId: string | null) => {
    return safeBool(() => (historyManager!.setActiveThread(threadId), true))
  })

  // Add message to thread
  ipcMain.handle('history:addMessage', async (_event, threadId: string, message: { role: 'user' | 'assistant', content: string, images?: any[] }) => {
    if (!historyManager) return null
    return historyManager.addMessage(threadId, message)
  })

  // Update thread metadata
  ipcMain.handle('history:updateMetadata', async (_event, threadId: string, metadata: any) => {
    return safeBool(() => (historyManager!.updateThreadMetadata(threadId, metadata), true))
  })

  // Rename thread
  ipcMain.handle('history:renameThread', async (_event, threadId: string, newTitle: string) => {
    return safeBool(() => (historyManager!.renameThread(threadId, newTitle), true))
  })

  // Update message feedback (thumbs up/down)
  ipcMain.handle('history:updateMessageFeedback', async (_event, threadId: string, messageId: string, feedback: 'up' | 'down' | null) => {
    return safeVoid(() => historyManager!.updateMessageFeedback(threadId, messageId, feedback))
  })

  // Delete thread
  ipcMain.handle('history:deleteThread', async (_event, threadId: string) => {
    return safeBool(() => (historyManager!.deleteThread(threadId), true))
  })

  // Clear all history
  ipcMain.handle('history:clearAll', async () => {
    return safeBool(() => (historyManager!.clearAll(), true))
  })

  // Search threads
  ipcMain.handle('history:search', async (_event, query: string) => {
    return safe(() => historyManager!.searchThreads(query))
  })

  // Export thread to markdown
  ipcMain.handle('history:export', async (_event, threadId: string) => {
    if (!historyManager) return ''
    return historyManager.exportThread(threadId)
  })

  console.log('[History] IPC handlers initialized')
}

/**
 * Cleanup history handlers
 */
export function cleanupHistoryHandlers(): void {
  ipcMain.removeHandler('history:getThreads')
  ipcMain.removeHandler('history:getThread')
  ipcMain.removeHandler('history:getActiveThread')
  ipcMain.removeHandler('history:createThread')
  ipcMain.removeHandler('history:setActiveThread')
  ipcMain.removeHandler('history:addMessage')
  ipcMain.removeHandler('history:updateMetadata')
  ipcMain.removeHandler('history:renameThread')
  ipcMain.removeHandler('history:updateMessageFeedback')
  ipcMain.removeHandler('history:deleteThread')
  ipcMain.removeHandler('history:clearAll')
  ipcMain.removeHandler('history:search')
  ipcMain.removeHandler('history:export')
}


/**
 * History IPC Handlers
 * 
 * Handles IPC communication for chat history operations.
 */

import { ipcMain } from 'electron'
import { ChatHistoryManager } from '../../src/history/history-manager'

let historyManager: ChatHistoryManager | null = null

/**
 * Initialize history IPC handlers
 */
export function initHistoryHandlers(): void {
  historyManager = ChatHistoryManager.getInstance()

  // Get all threads
  ipcMain.handle('history:getThreads', async () => {
    return historyManager!.getThreads()
  })

  // Get a specific thread
  ipcMain.handle('history:getThread', async (_event, threadId: string) => {
    return historyManager!.getThread(threadId)
  })

  // Get active thread
  ipcMain.handle('history:getActiveThread', async () => {
    return historyManager!.getActiveThread()
  })

  // Create new thread
  ipcMain.handle('history:createThread', async (_event, firstMessage?: string, workspacePath?: string) => {
    return historyManager!.createThread(firstMessage, workspacePath)
  })

  // Set active thread
  ipcMain.handle('history:setActiveThread', async (_event, threadId: string | null) => {
    historyManager!.setActiveThread(threadId)
    return true
  })

  // Add message to thread
  ipcMain.handle('history:addMessage', async (_event, threadId: string, message: { role: 'user' | 'assistant', content: string, images?: any[] }) => {
    return historyManager!.addMessage(threadId, message)
  })

  // Update thread metadata
  ipcMain.handle('history:updateMetadata', async (_event, threadId: string, metadata: any) => {
    historyManager!.updateThreadMetadata(threadId, metadata)
    return true
  })

  // Rename thread
  ipcMain.handle('history:renameThread', async (_event, threadId: string, newTitle: string) => {
    historyManager!.renameThread(threadId, newTitle)
    return true
  })

  // Delete thread
  ipcMain.handle('history:deleteThread', async (_event, threadId: string) => {
    historyManager!.deleteThread(threadId)
    return true
  })

  // Clear all history
  ipcMain.handle('history:clearAll', async () => {
    historyManager!.clearAll()
    return true
  })

  // Search threads
  ipcMain.handle('history:search', async (_event, query: string) => {
    return historyManager!.searchThreads(query)
  })

  // Export thread to markdown
  ipcMain.handle('history:export', async (_event, threadId: string) => {
    return historyManager!.exportThread(threadId)
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
  ipcMain.removeHandler('history:deleteThread')
  ipcMain.removeHandler('history:clearAll')
  ipcMain.removeHandler('history:search')
  ipcMain.removeHandler('history:export')
}


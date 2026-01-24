/**
 * Knowledge Base IPC Handlers
 * 
 * Handles communication between renderer and main process
 * for knowledge base operations.
 */

import { ipcMain, dialog, shell } from 'electron'
import { KnowledgeBaseManager } from '../../src/knowledge/manager'
import type { 
  CloudProvider, 
  ServerConfig, 
  CloudProviderType,
  KnowledgeBasePreferences 
} from '../../src/knowledge/types'

// Global knowledge base manager instance
let knowledgeBase: KnowledgeBaseManager | null = null

/**
 * Initialize knowledge base IPC handlers
 */
export function initKnowledgeBaseHandlers(): void {
  // Initialize the knowledge base manager
  knowledgeBase = new KnowledgeBaseManager()
  knowledgeBase.initialize().then(() => {
    console.log('[KnowledgeBase IPC] Manager initialized')
  }).catch(err => {
    console.error('[KnowledgeBase IPC] Failed to initialize:', err)
  })

  // =========================================================================
  // Provider Operations
  // =========================================================================

  ipcMain.handle('kb:getProviders', async () => {
    if (!knowledgeBase) return []
    return knowledgeBase.getProviders()
  })

  ipcMain.handle('kb:getProvider', async (_, id: string) => {
    if (!knowledgeBase) return null
    return knowledgeBase.getProvider(id)
  })

  ipcMain.handle('kb:getProvidersByType', async (_, type: CloudProviderType) => {
    if (!knowledgeBase) return []
    return knowledgeBase.getProvidersByType(type)
  })

  ipcMain.handle('kb:addProvider', async (_, type: CloudProviderType, name?: string) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.addProvider(type, name)
  })

  ipcMain.handle('kb:updateProvider', async (_, id: string, updates: Partial<CloudProvider>) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.updateProvider(id, updates)
  })

  ipcMain.handle('kb:deleteProvider', async (_, id: string) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.deleteProvider(id)
  })

  // =========================================================================
  // Server Operations
  // =========================================================================

  ipcMain.handle('kb:getServers', async () => {
    if (!knowledgeBase) return []
    return knowledgeBase.getServers()
  })

  ipcMain.handle('kb:getServersByProvider', async (_, providerId: string) => {
    if (!knowledgeBase) return []
    return knowledgeBase.getServersByProvider(providerId)
  })

  ipcMain.handle('kb:addServer', async (
    _, 
    providerId: string, 
    name: string, 
    ip: string, 
    config?: Partial<ServerConfig>
  ) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.addServer(providerId, name, ip, config)
  })

  ipcMain.handle('kb:updateServer', async (
    _, 
    providerId: string, 
    serverId: string, 
    updates: Partial<ServerConfig>
  ) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.updateServer(providerId, serverId, updates)
  })

  ipcMain.handle('kb:deleteServer', async (_, providerId: string, serverId: string) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.deleteServer(providerId, serverId)
  })

  // =========================================================================
  // Document Import
  // =========================================================================

  ipcMain.handle('kb:importDocument', async (_, providerId: string, filename: string, content: string) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.importDocument(providerId, filename, content)
  })

  ipcMain.handle('kb:openFileDialog', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Infrastructure Documentation',
      filters: [
        { name: 'Documentation', extensions: ['md', 'txt', 'json', 'yaml', 'yml'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const fs = require('fs')
    const path = require('path')
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const filename = path.basename(filePath)
      return { filename, content, filePath }
    } catch (err) {
      console.error('[KnowledgeBase IPC] Failed to read file:', err)
      throw new Error(`Failed to read file: ${(err as Error).message}`)
    }
  })

  // =========================================================================
  // Credential Operations
  // =========================================================================

  ipcMain.handle('kb:unlock', async (_, password: string) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.unlock(password)
  })

  ipcMain.handle('kb:lock', async () => {
    if (!knowledgeBase) return
    knowledgeBase.lock()
  })

  ipcMain.handle('kb:isUnlocked', async () => {
    if (!knowledgeBase) return false
    return knowledgeBase.isUnlocked
  })

  ipcMain.handle('kb:addCredential', async (_, name: string, service: string, value: string) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.addCredential(name, service, value)
  })

  ipcMain.handle('kb:getCredentialValue', async (_, id: string) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.getCredentialValue(id)
  })

  ipcMain.handle('kb:deleteCredential', async (_, id: string) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.deleteCredential(id)
  })

  // =========================================================================
  // AI Context
  // =========================================================================

  ipcMain.handle('kb:generateAIContext', async () => {
    if (!knowledgeBase) return ''
    return knowledgeBase.generateAIContext()
  })

  ipcMain.handle('kb:getRelevantContext', async (_, query: string) => {
    if (!knowledgeBase) return ''
    return knowledgeBase.getRelevantContext(query)
  })

  // =========================================================================
  // Preferences
  // =========================================================================

  ipcMain.handle('kb:getPreferences', async () => {
    if (!knowledgeBase) return null
    return knowledgeBase.getPreferences()
  })

  ipcMain.handle('kb:savePreferences', async (_, preferences: Partial<KnowledgeBasePreferences>) => {
    if (!knowledgeBase) throw new Error('Knowledge base not initialized')
    return knowledgeBase.savePreferences(preferences)
  })

  // =========================================================================
  // Statistics
  // =========================================================================

  ipcMain.handle('kb:getStats', async () => {
    if (!knowledgeBase) return { providerCount: 0, serverCount: 0, credentialCount: 0, documentCount: 0 }
    return knowledgeBase.getStats()
  })

  // =========================================================================
  // SSH Operations
  // =========================================================================

  ipcMain.handle('kb:openTerminalWithSsh', async (_, sshCommand: string) => {
    // Open SSH command in default terminal
    // This is platform-specific
    const platform = process.platform
    
    try {
      if (platform === 'darwin') {
        // macOS: Open Terminal.app with SSH command
        const { exec } = require('child_process')
        exec(`osascript -e 'tell application "Terminal" to do script "${sshCommand}"'`)
      } else if (platform === 'win32') {
        // Windows: Open cmd with SSH command
        const { exec } = require('child_process')
        exec(`start cmd /k "${sshCommand}"`)
      } else {
        // Linux: Try common terminals
        const { exec } = require('child_process')
        exec(`x-terminal-emulator -e "${sshCommand}" || gnome-terminal -- ${sshCommand} || xterm -e "${sshCommand}"`)
      }
      return true
    } catch (err) {
      console.error('[KnowledgeBase IPC] Failed to open terminal:', err)
      return false
    }
  })

  console.log('[KnowledgeBase IPC] Handlers registered')
}

/**
 * Cleanup knowledge base IPC handlers
 */
export function cleanupKnowledgeBaseHandlers(): void {
  if (knowledgeBase) {
    knowledgeBase.lock()
    knowledgeBase = null
  }
  
  // Remove all handlers
  const handlers = [
    'kb:getProviders', 'kb:getProvider', 'kb:getProvidersByType',
    'kb:addProvider', 'kb:updateProvider', 'kb:deleteProvider',
    'kb:getServers', 'kb:getServersByProvider', 'kb:addServer',
    'kb:updateServer', 'kb:deleteServer', 'kb:importDocument',
    'kb:openFileDialog', 'kb:unlock', 'kb:lock', 'kb:isUnlocked',
    'kb:addCredential', 'kb:getCredentialValue', 'kb:deleteCredential',
    'kb:generateAIContext', 'kb:getRelevantContext',
    'kb:getPreferences', 'kb:savePreferences', 'kb:getStats',
    'kb:openTerminalWithSsh'
  ]
  
  handlers.forEach(channel => {
    ipcMain.removeHandler(channel)
  })
  
  console.log('[KnowledgeBase IPC] Handlers cleaned up')
}

/**
 * Get the knowledge base manager instance
 */
export function getKnowledgeBase(): KnowledgeBaseManager | null {
  return knowledgeBase
}


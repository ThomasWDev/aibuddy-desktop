/**
 * Environment Detection IPC Handlers
 * 
 * Provides environment detection capabilities to the renderer process.
 */

import { ipcMain } from 'electron'
import { 
  detectEnvironment, 
  generateEnvironmentSummary,
  getRunCommand,
  getCachedEnvironment,
  clearEnvironmentCache,
  type DevelopmentEnvironment
} from '../../src/core/environment-detector'

let cachedEnv: DevelopmentEnvironment | null = null

/**
 * Initialize environment detection IPC handlers
 */
export function initEnvironmentHandlers(): void {
  // Remove any previously registered handlers to prevent "second handler" errors on dev reload
  const channels = [
    'env:detect', 'env:getCached', 'env:getSummary', 'env:getRunCommand',
    'env:isInstalled', 'env:getLanguageInfo', 'env:clearCache',
  ] as const
  for (const ch of channels) { ipcMain.removeHandler(ch) }

  console.log('[Environment IPC] Initializing handlers')

  // Detect full environment
  ipcMain.handle('env:detect', async () => {
    console.log('[Environment IPC] Detecting environment...')
    try {
      cachedEnv = detectEnvironment()
      console.log('[Environment IPC] Environment detected:', {
        languages: cachedEnv.languages.filter(l => l.installed).map(l => l.language),
        ides: cachedEnv.ides.map(i => i.name),
      })
      return cachedEnv
    } catch (err) {
      console.error('[Environment IPC] Detection failed:', err)
      throw err
    }
  })

  // Get cached environment (faster)
  ipcMain.handle('env:getCached', async () => {
    return getCachedEnvironment()
  })

  // Generate AI-safe summary
  ipcMain.handle('env:getSummary', async () => {
    const env = cachedEnv || getCachedEnvironment()
    return generateEnvironmentSummary(env)
  })

  // Get run command for a project
  ipcMain.handle('env:getRunCommand', async (_, projectPath: string) => {
    const env = cachedEnv || getCachedEnvironment()
    return getRunCommand(projectPath, env)
  })

  // Check if a specific language/tool is installed
  ipcMain.handle('env:isInstalled', async (_, languageName: string) => {
    const env = cachedEnv || getCachedEnvironment()
    const lang = env.languages.find(l => 
      l.language.toLowerCase().includes(languageName.toLowerCase())
    )
    return lang?.installed || false
  })

  // Get language-specific info
  ipcMain.handle('env:getLanguageInfo', async (_, languageName: string) => {
    const env = cachedEnv || getCachedEnvironment()
    return env.languages.find(l => 
      l.language.toLowerCase().includes(languageName.toLowerCase())
    ) || null
  })

  // Clear cache (force re-detection)
  ipcMain.handle('env:clearCache', async () => {
    clearEnvironmentCache()
    cachedEnv = null
    return true
  })

  console.log('[Environment IPC] Handlers initialized')
}

/**
 * Cleanup environment handlers
 */
export function cleanupEnvironmentHandlers(): void {
  ipcMain.removeHandler('env:detect')
  ipcMain.removeHandler('env:getCached')
  ipcMain.removeHandler('env:getSummary')
  ipcMain.removeHandler('env:getRunCommand')
  ipcMain.removeHandler('env:isInstalled')
  ipcMain.removeHandler('env:getLanguageInfo')
  ipcMain.removeHandler('env:clearCache')
  
  console.log('[Environment IPC] Handlers cleaned up')
}


import { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeImage, session, clipboard, systemPreferences } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import * as os from 'os'

// Get the app icon path for dialogs
function getAppIconPath(): string {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    return join(__dirname, '../../build/icons/icon.png')
  }
  // In production, icons are in extraResources
  return join(process.resourcesPath, 'icons', 'icon.png')
}

// Create native image for dialog icons
function getAppIcon(): Electron.NativeImage | undefined {
  try {
    const iconPath = getAppIconPath()
    if (existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath)
    }
  } catch (e) {
    console.warn('[Icon] Failed to load app icon:', e)
  }
  return undefined
}

// Simple JSON-based store (replaces electron-store to avoid 'conf' module issues)
interface StoreSchema {
  windowBounds: { width: number; height: number }
  recentWorkspaces: string[]
  theme: string
  apiKey: string
  aibuddyCredits: number
}

class SimpleStore<T extends Record<string, any>> {
  private data: T
  private filePath: string

  constructor(options: { name: string; defaults: T }) {
    const userDataPath = app.getPath('userData')
    
    // Ensure directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    
    this.filePath = join(userDataPath, `${options.name}.json`)
    
    // Load existing data or use defaults
    if (existsSync(this.filePath)) {
      try {
        const fileContent = readFileSync(this.filePath, 'utf-8')
        this.data = { ...options.defaults, ...JSON.parse(fileContent) }
      } catch (e) {
        console.error('Failed to load store, using defaults:', e)
        this.data = options.defaults
      }
    } else {
      this.data = options.defaults
      this.save()
    }
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.data[key]
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.data[key] = value
    this.save()
  }

  delete<K extends keyof T>(key: K): void {
    delete this.data[key]
    this.save()
  }

  private save(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (e) {
      console.error('Failed to save store:', e)
    }
  }
}

import { initAllIpcHandlers, cleanupAllIpcHandlers } from './ipc'
import { 
  initSentryMain, 
  flushSentry, 
  trackWindowEvent, 
  trackMenuAction, 
  trackSessionStart,
  trackSessionMetrics,
  setUserContext,
  trackVersionCheck,
  trackVersionNotificationResponse,
  trackAppLifecycle
} from '../src/shared/sentry'
import {
  checkForUpdates,
  getUpdateMessage,
  isVersionOutdated,
  DOWNLOAD_PAGE_URL,
  type VersionInfo
} from '../src/services/version-checker'

// Check if running in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Get app version dynamically from package.json (Electron reads it automatically)
// Never hardcode version - app.getVersion() returns package.json "version" field
const appVersion = app.getVersion()

// Crash protection: log and show user-visible error so app doesn't fail silently
function showStartupError(title: string, message: string, detail?: string): void {
  console.error(`[AIBuddy] ${title}:`, message, detail ?? '')
  setImmediate(() => {
    if (app.isReady()) {
      dialog.showMessageBox({
        type: 'error',
        title: title,
        message,
        detail: detail ?? undefined,
        noLink: true
      }).catch(() => {})
    }
  })
}

process.on('uncaughtException', (err: Error) => {
  showStartupError('AIBuddy failed to start', err.message, err.stack ?? undefined)
})

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  const detail = reason instanceof Error ? reason.stack : undefined
  showStartupError('AIBuddy startup error', message, detail)
})

// Initialize Sentry early (before any errors can occur)
initSentryMain(appVersion)

// Initialize simple JSON store for persistent settings
// (Replaces electron-store to avoid 'conf' module asar packaging issues)
const store = new SimpleStore<StoreSchema>({
  name: 'aibuddy-settings',
  defaults: {
    windowBounds: { width: 1400, height: 900 },
    recentWorkspaces: [],
    theme: 'dark',
    apiKey: '',
    aibuddyCredits: 0
  }
})

let mainWindow: BrowserWindow | null = null

// Session tracking
const sessionId = `desktop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const sessionStartTime = Date.now()
let sessionMetrics = {
  tasksCompleted: 0,
  tasksFailed: 0,
  totalTokensUsed: 0,
  errorsEncountered: 0,
  toolsExecuted: 0,
  filesEdited: 0,
  terminalCommands: 0,
  responseTimesMs: [] as number[],
}

function createWindow(): void {
  const { width, height } = store.get('windowBounds') as { width: number; height: number }

  trackWindowEvent('created', { width, height })

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 10 },
    backgroundColor: '#1e1e1e',
    icon: join(__dirname, '../../build/icons/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // Disable web security in dev mode to allow direct API calls without CORS issues
      // This is safe because it's only for development - production builds don't have this
      webSecurity: !isDev
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    trackWindowEvent('focused')
  })

  // Log renderer console messages to main process stdout for diagnostics
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      const levelStr = ['verbose', 'info', 'warn', 'error'][level] || 'info'
      console.log(`[Renderer:${levelStr}] ${message} (${sourceId}:${line})`)
    }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[CRITICAL] Renderer process gone:', details.reason, details.exitCode)
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[CRITICAL] Failed to load:', errorCode, errorDescription)
  })

  mainWindow.on('focus', () => trackWindowEvent('focused'))
  mainWindow.on('blur', () => trackWindowEvent('blurred'))
  mainWindow.on('minimize', () => trackWindowEvent('minimized'))
  mainWindow.on('maximize', () => trackWindowEvent('maximized'))
  mainWindow.on('restore', () => trackWindowEvent('restored'))

  // Save window bounds on resize
  mainWindow.on('resize', () => {
    if (mainWindow) {
      const [width, height] = mainWindow.getSize()
      store.set('windowBounds', { width, height })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // KAN-62: Request macOS system-level microphone permission on launch.
  // Without this, the OS silently blocks mic access even if entitlements are present.
  if (process.platform === 'darwin') {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    console.log(`[Permissions] macOS microphone status: ${micStatus}`)
    if (micStatus !== 'granted') {
      systemPreferences.askForMediaAccess('microphone').then((granted) => {
        console.log(`[Permissions] macOS microphone ${granted ? 'granted' : 'denied'}`)
      }).catch((err) => {
        console.error('[Permissions] Failed to request microphone:', err)
      })
    }
  }

  // Grant microphone/audio permissions for Interview Mode
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'audio-capture']
    if (allowedPermissions.includes(permission)) {
      console.log(`[Permissions] Granted: ${permission}`)
      callback(true)
    } else {
      console.log(`[Permissions] Denied: ${permission}`)
      callback(false)
    }
  })

  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    const allowedPermissions = ['media', 'microphone', 'audio-capture']
    return allowedPermissions.includes(permission)
  })

  // Set CSP headers to allow API calls
  // IMPORTANT: We allow HTTP to the ALB DNS name because:
  // - ALB has NO timeout limit (can wait for Lambda's full 5-minute timeout)
  // - API Gateway has 29-second hard limit (not enough for Claude Opus 4.5)
  // - ALB IPs can change, so we use wildcard for *.elb.amazonaws.com
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data: https://fonts.gstatic.com; " +
          "connect-src 'self' https: wss: http://*.us-east-2.elb.amazonaws.com http://*.elb.amazonaws.com;"
        ]
      }
    })
  })

  // Load the renderer (catch load failures so user sees error instead of blank window)
  const loadRenderer = () => {
    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow!.loadURL(process.env['ELECTRON_RENDERER_URL']).catch((err: Error) => {
        showStartupError('Failed to load app', err.message, err.stack ?? undefined)
      })
    } else {
      const rendererPath = join(__dirname, '../renderer/index.html')
      if (!existsSync(rendererPath)) {
        showStartupError('App files missing', `Renderer not found at: ${rendererPath}`, 'Try rebuilding the app (pnpm run build).')
      } else {
        mainWindow!.loadFile(rendererPath).catch((err: Error) => {
          showStartupError('Failed to load app', err.message, err.stack ?? undefined)
        })
      }
    }
  }
  loadRenderer()
}

// Create application menu
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    // KAN-59: macOS requires an explicit app menu as the first entry.
    // Without this, the File menu becomes the app menu and Edit menu
    // keyboard shortcuts (Cmd+C/V/X) don't register properly.
    ...(process.platform === 'darwin' ? [{
      role: 'appMenu' as const
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Folder...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            trackMenuAction('Open Folder', 'CmdOrCtrl+O')
            const result = await dialog.showOpenDialog({
              properties: ['openDirectory']
            })
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow?.webContents.send('folder-opened', result.filePaths[0])
            }
          }
        },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: async () => {
            const result = await dialog.showOpenDialog({
              properties: ['openFile']
            })
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow?.webContents.send('file-opened', result.filePaths[0])
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('save-file')
          }
        },
        {
          label: 'Save All',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow?.webContents.send('save-all-files')
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Terminal',
      submenu: [
        {
          label: 'New Terminal',
          accelerator: 'CmdOrCtrl+`',
          click: () => {
            mainWindow?.webContents.send('new-terminal')
          }
        },
        {
          label: 'Clear Terminal',
          click: () => {
            mainWindow?.webContents.send('clear-terminal')
          }
        }
      ]
    },
    {
      label: 'AI',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            trackMenuAction('New Chat', 'CmdOrCtrl+N')
            mainWindow?.webContents.send('new-chat')
          }
        },
        {
          label: 'Toggle AI Panel',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            mainWindow?.webContents.send('toggle-ai-panel')
          }
        },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            trackMenuAction('Settings', 'CmdOrCtrl+,')
            mainWindow?.webContents.send('open-settings')
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: async () => {
            await checkAndNotifyUpdates(true)
          }
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://aibuddy.life/docs')
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/ThomasWDev/aibuddy-desktop/issues')
          }
        },
        { type: 'separator' },
        {
          label: 'About AIBuddy',
          click: () => {
            const icon = getAppIcon()
            dialog.showMessageBox({
              type: 'info',
              title: 'About AIBuddy',
              message: 'AIBuddy Desktop IDE',
              detail: `Version: ${app.getVersion()}\nYour intelligent coding partner powered by AIBuddy.`,
              icon
            })
          }
        }
      ]
    }
  ]

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Version checker state
let lastVersionInfo: VersionInfo | null = null
let dismissedVersion: string | null = null

// Check for updates and notify
async function checkAndNotifyUpdates(force: boolean = false): Promise<void> {
  try {
    trackAppLifecycle('update_check', { version: appVersion })
    
    const versionInfo = await checkForUpdates(appVersion)
    lastVersionInfo = versionInfo
    
    // Track the version check result
    trackVersionCheck(
      appVersion,
      versionInfo.latestVersion,
      versionInfo.updateAvailable,
      versionInfo.isUrgent
    )
    
    if (!versionInfo.updateAvailable) {
      if (force) {
        const icon = getAppIcon()
        dialog.showMessageBox({
          type: 'info',
          title: 'AIBuddy is Up to Date',
          message: `You're running the latest version (${appVersion}).`,
          icon
        })
      }
      return
    }
    
    // Don't show notification if user dismissed this version
    if (!force && dismissedVersion === versionInfo.latestVersion) {
      return
    }
    
    // Send update info to renderer
    mainWindow?.webContents.send('update-available', versionInfo)
    
    // Show native dialog for updates
    const { title, message, type } = getUpdateMessage(versionInfo)
    const icon = getAppIcon()
    
    const buttons = ['Download Update', 'View Release Notes', 'Remind Later']
    if (!versionInfo.isUrgent) {
      buttons.push("Don't Show for This Version")
    }
    
    const result = await dialog.showMessageBox({
      type: type === 'warning' ? 'warning' : 'info',
      title,
      message,
      detail: versionInfo.releaseNotes?.slice(0, 500) || 'New features and improvements available.',
      buttons,
      defaultId: 0,
      icon
    })
    
    // Track user response
    const responses = ['Download Update', 'View Release Notes', 'Remind Later', "Don't Show for This Version"]
    trackVersionNotificationResponse(
      responses[result.response] || 'dismissed',
      appVersion,
      versionInfo.latestVersion,
      versionInfo.isUrgent
    )
    
    switch (result.response) {
      case 0: // Download Update
        // Open download page or direct download URL based on platform
        let downloadUrl = DOWNLOAD_PAGE_URL
        if (process.platform === 'darwin') {
          downloadUrl = versionInfo.downloadUrls.macArm64 || versionInfo.downloadUrls.mac || downloadUrl
        } else if (process.platform === 'win32') {
          downloadUrl = versionInfo.downloadUrls.windows || downloadUrl
        } else {
          downloadUrl = versionInfo.downloadUrls.linux || downloadUrl
        }
        shell.openExternal(downloadUrl)
        break
        
      case 1: // View Release Notes
        if (versionInfo.releaseUrl) {
          shell.openExternal(versionInfo.releaseUrl)
        }
        break
        
      case 3: // Don't Show for This Version
        dismissedVersion = versionInfo.latestVersion
        store.set('dismissedVersion' as any, dismissedVersion)
        break
        
      case 2: // Remind Later
      default:
        // Do nothing, will check again later
        break
    }
  } catch (error) {
    console.error('[VersionChecker] Error:', error)
  }
}

// App lifecycle
app.whenReady().then(() => {
  try {
    // Set app user model id for windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.aibuddy.desktop')
    }

    // Track session start
    trackSessionStart(sessionId)

    // Initialize all IPC handlers (can throw if history/fs init fails)
    initAllIpcHandlers()

    createMenu()
    createWindow()

    // Load dismissed version from store
    dismissedVersion = store.get('dismissedVersion' as any) || null

    // Check for updates after window is ready (5 second delay)
    setTimeout(() => checkAndNotifyUpdates(), 5000)

    // Check for updates periodically (every 24 hours)
    setInterval(() => checkAndNotifyUpdates(), 24 * 60 * 60 * 1000)

    // Show urgent update warning if version is too old
    if (isVersionOutdated(appVersion)) {
      setTimeout(() => {
        const icon = getAppIcon()
        dialog.showMessageBox({
          type: 'warning',
          title: 'Update Required',
          message: 'Your version of AIBuddy is outdated',
          detail: `Version ${appVersion} may have compatibility issues. Please update to the latest version for the best experience.`,
          buttons: ['Download Update', 'Later'],
          icon
        }).then((result) => {
          if (result.response === 0) {
            shell.openExternal(DOWNLOAD_PAGE_URL)
          }
        })
      }, 2000)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    showStartupError('AIBuddy failed to start', error.message, error.stack ?? undefined)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  // Track session end metrics
  const avgResponseTime = sessionMetrics.responseTimesMs.length > 0
    ? Math.round(sessionMetrics.responseTimesMs.reduce((a, b) => a + b, 0) / sessionMetrics.responseTimesMs.length)
    : 0

  trackSessionMetrics({
    sessionDurationMs: Date.now() - sessionStartTime,
    tasksCompleted: sessionMetrics.tasksCompleted,
    tasksFailed: sessionMetrics.tasksFailed,
    totalTokensUsed: sessionMetrics.totalTokensUsed,
    averageResponseTime: avgResponseTime,
    errorsEncountered: sessionMetrics.errorsEncountered,
    toolsExecuted: sessionMetrics.toolsExecuted,
    filesEdited: sessionMetrics.filesEdited,
    terminalCommands: sessionMetrics.terminalCommands,
  })

  trackWindowEvent('closed')
  
  // Flush Sentry before quitting
  await flushSentry()
  
  cleanupAllIpcHandlers()
})

// IPC Handlers - Main process handlers (store, dialog, shell, metrics, version)
// Wrapped in a function with removeHandler guards to prevent duplicate-handler crashes on dev reload
function initMainProcessHandlers(): void {
  const channels = [
    'store:get', 'store:set', 'store:delete',
    'dialog:openFolder', 'dialog:openFile', 'dialog:saveFile', 'dialog:showMessage',
    'shell:openExternal', 'shell:showItemInFolder',
    'metrics:increment', 'metrics:get',
    'sentry:setUser',
    'version:check', 'version:get', 'version:dismissUpdate',
  ] as const
  for (const ch of channels) { ipcMain.removeHandler(ch) }

  // Store operations
  ipcMain.handle('store:get', (_event, key: string) => {
    return store.get(key as any)
  })

  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    store.set(key as any, value as any)
    return true
  })

  ipcMain.handle('store:delete', (_event, key: string) => {
    store.delete(key as any)
    return true
  })

  // Dialog operations
  ipcMain.handle('dialog:openFolder', async (_event, defaultPath?: string | null) => {
    const startPath = defaultPath && defaultPath.length > 0
      ? defaultPath.replace(/^~/, os.homedir())
      : undefined
    const options: Electron.OpenDialogOptions = {
      properties: ['openDirectory'],
      ...(startPath && { defaultPath: startPath })
    }
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:openFile', async (_event, filters?: Electron.FileFilter[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:saveFile', async (_event, defaultPath?: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('dialog:showMessage', async (_event, options: Electron.MessageBoxOptions) => {
    const icon = getAppIcon()
    const optionsWithIcon: Electron.MessageBoxOptions = {
      ...options,
      icon: options.icon || icon
    }
    return dialog.showMessageBox(optionsWithIcon)
  })

  // Shell operations
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url)
    return true
  })

  ipcMain.handle('shell:showItemInFolder', (_event, path: string) => {
    shell.showItemInFolder(path)
    return true
  })

  // KAN-59: Clipboard IPC — reliable fallback for navigator.clipboard failures
  ipcMain.handle('clipboard:writeText', (_event, text: string) => {
    clipboard.writeText(text)
    return true
  })
  ipcMain.handle('clipboard:readText', () => {
    return clipboard.readText()
  })

  // KAN-62: Microphone permission IPC — check and request macOS mic access
  ipcMain.handle('microphone:getStatus', () => {
    if (process.platform === 'darwin') {
      return systemPreferences.getMediaAccessStatus('microphone')
    }
    return 'granted'
  })
  ipcMain.handle('microphone:requestAccess', async () => {
    if (process.platform === 'darwin') {
      return systemPreferences.askForMediaAccess('microphone')
    }
    return true
  })

  // Session metrics (from renderer)
  ipcMain.handle('metrics:increment', (_event, metric: keyof typeof sessionMetrics, value: number = 1) => {
    if (metric === 'responseTimesMs') {
      sessionMetrics.responseTimesMs.push(value)
    } else if (metric in sessionMetrics && typeof sessionMetrics[metric] === 'number') {
      (sessionMetrics[metric] as number) += value
    }
    return true
  })

  ipcMain.handle('metrics:get', () => {
    return {
      ...sessionMetrics,
      sessionDurationMs: Date.now() - sessionStartTime,
      sessionId,
    }
  })

  // User context (for Sentry)
  ipcMain.handle('sentry:setUser', (_event, userId: string, email?: string) => {
    setUserContext(userId, email)
    return true
  })

  // App version is registered in electron/ipc/commands.ts (initCommandHandlers)

  // Version checker
  ipcMain.handle('version:check', async () => {
    await checkAndNotifyUpdates(true)
    return lastVersionInfo
  })

  ipcMain.handle('version:get', () => {
    return {
      currentVersion: appVersion,
      lastVersionInfo
    }
  })

  ipcMain.handle('version:dismissUpdate', (_event, version: string) => {
    dismissedVersion = version
    store.set('dismissedVersion' as any, version)
    return true
  })
}

// Register main-process handlers
initMainProcessHandlers()

// Initialize history handlers
import { initHistoryHandlers } from './ipc/history'
initHistoryHandlers()

// Export for use in IPC handlers
export { mainWindow, store, sessionMetrics }


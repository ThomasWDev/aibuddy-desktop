import { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeImage, session } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

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
  setUserContext 
} from '../src/shared/sentry'

// Check if running in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Get app version
const appVersion = app.getVersion() || '1.0.0'

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
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    trackWindowEvent('focused')
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

  // Set CSP headers to allow API calls
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
          "connect-src 'self' https: wss:;"  // Allow ALL https connections
        ]
      }
    })
  })

  // Load the renderer
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Create application menu
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
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
          label: 'Documentation',
          click: () => {
            shell.openExternal('https://aibuddy.life/docs')
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('https://github.com/AIBuddyStudio/aibuddy-desktop/issues')
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

// App lifecycle
app.whenReady().then(() => {
  // Set app user model id for windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.aibuddy.desktop')
  }

  // Track session start
  trackSessionStart(sessionId)

  // Initialize all IPC handlers
  initAllIpcHandlers()

  createMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
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

// IPC Handlers - Store operations
ipcMain.handle('store:get', (_event, key: string) => {
  return store.get(key)
})

ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
  store.set(key, value)
  return true
})

ipcMain.handle('store:delete', (_event, key: string) => {
  store.delete(key)
  return true
})

// IPC Handlers - Dialog operations
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
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
  // Add app icon to dialog if not specified
  const icon = getAppIcon()
  const optionsWithIcon: Electron.MessageBoxOptions = {
    ...options,
    icon: options.icon || icon
  }
  return dialog.showMessageBox(optionsWithIcon)
})

// IPC Handlers - Shell operations
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url)
  return true
})

ipcMain.handle('shell:showItemInFolder', (_event, path: string) => {
  shell.showItemInFolder(path)
  return true
})

// IPC Handlers - Session metrics (from renderer)
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

// IPC Handlers - User context (for Sentry)
ipcMain.handle('sentry:setUser', (_event, userId: string, email?: string) => {
  setUserContext(userId, email)
  return true
})

// Export for use in IPC handlers
export { mainWindow, store, sessionMetrics }


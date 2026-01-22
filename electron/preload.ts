import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// Types for the exposed API
export interface ElectronAPI {
  // Store operations
  store: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<boolean>
    delete: (key: string) => Promise<boolean>
  }

  // Dialog operations
  dialog: {
    openFolder: () => Promise<string | null>
    openFile: (filters?: Electron.FileFilter[]) => Promise<string | null>
    saveFile: (defaultPath?: string) => Promise<string | null>
    showMessage: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>
  }

  // Shell operations
  shell: {
    openExternal: (url: string) => Promise<boolean>
    showItemInFolder: (path: string) => Promise<boolean>
  }

  // File system operations
  fs: {
    readFile: (path: string, encoding?: string) => Promise<string | Buffer>
    writeFile: (path: string, data: string | Buffer) => Promise<void>
    readDir: (path: string) => Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]>
    stat: (path: string) => Promise<{ isDirectory: boolean; isFile: boolean; size: number; mtime: number }>
    exists: (path: string) => Promise<boolean>
    mkdir: (path: string, recursive?: boolean) => Promise<void>
    rm: (path: string, recursive?: boolean) => Promise<void>
    rename: (oldPath: string, newPath: string) => Promise<void>
    copy: (src: string, dest: string) => Promise<void>
  }

  // Terminal operations
  terminal: {
    create: (options?: { cwd?: string; shell?: string }) => Promise<number>
    write: (id: number, data: string) => Promise<void>
    resize: (id: number, cols: number, rows: number) => Promise<void>
    kill: (id: number) => Promise<void>
    onData: (callback: (id: number, data: string) => void) => () => void
    onExit: (callback: (id: number, exitCode: number) => void) => () => void
  }

  // Git operations
  git: {
    status: (cwd: string) => Promise<unknown>
    diff: (cwd: string, options?: { staged?: boolean }) => Promise<string>
    log: (cwd: string, options?: { maxCount?: number }) => Promise<unknown[]>
    branch: (cwd: string) => Promise<{ current: string; all: string[] }>
    checkout: (cwd: string, branch: string) => Promise<void>
    commit: (cwd: string, message: string) => Promise<void>
    add: (cwd: string, files: string[]) => Promise<void>
    push: (cwd: string) => Promise<void>
    pull: (cwd: string) => Promise<void>
  }

  // RPC for AI agent communication
  rpc: {
    invoke: (route: string, input: unknown) => Promise<unknown>
    on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  }

  // App info
  app: {
    getVersion: () => Promise<string>
    getPlatform: () => string
    getArch: () => string
  }

  // Event listeners for menu commands
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  off: (channel: string, callback: (...args: unknown[]) => void) => void
}

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Store operations
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key)
  },

  // Dialog operations
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    openFile: (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('dialog:openFile', filters),
    saveFile: (defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
    showMessage: (options: Electron.MessageBoxOptions) => ipcRenderer.invoke('dialog:showMessage', options)
  },

  // Shell operations
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    showItemInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path)
  },

  // File system operations
  fs: {
    readFile: (path: string, encoding?: string) => ipcRenderer.invoke('fs:readFile', path, encoding),
    writeFile: (path: string, data: string | Buffer) => ipcRenderer.invoke('fs:writeFile', path, data),
    readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path),
    stat: (path: string) => ipcRenderer.invoke('fs:stat', path),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
    mkdir: (path: string, recursive?: boolean) => ipcRenderer.invoke('fs:mkdir', path, recursive),
    rm: (path: string, recursive?: boolean) => ipcRenderer.invoke('fs:rm', path, recursive),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    copy: (src: string, dest: string) => ipcRenderer.invoke('fs:copy', src, dest)
  },

  // Terminal operations
  terminal: {
    create: (options?: { cwd?: string; shell?: string }) => ipcRenderer.invoke('terminal:create', options),
    write: (id: number, data: string) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id: number, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    kill: (id: number) => ipcRenderer.invoke('terminal:kill', id),
    onData: (callback: (id: number, data: string) => void) => {
      const handler = (_event: IpcRendererEvent, id: number, data: string) => callback(id, data)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.removeListener('terminal:data', handler)
    },
    onExit: (callback: (id: number, exitCode: number) => void) => {
      const handler = (_event: IpcRendererEvent, id: number, exitCode: number) => callback(id, exitCode)
      ipcRenderer.on('terminal:exit', handler)
      return () => ipcRenderer.removeListener('terminal:exit', handler)
    }
  },

  // Git operations
  git: {
    status: (cwd: string) => ipcRenderer.invoke('git:status', cwd),
    diff: (cwd: string, options?: { staged?: boolean }) => ipcRenderer.invoke('git:diff', cwd, options),
    log: (cwd: string, options?: { maxCount?: number }) => ipcRenderer.invoke('git:log', cwd, options),
    branch: (cwd: string) => ipcRenderer.invoke('git:branch', cwd),
    checkout: (cwd: string, branch: string) => ipcRenderer.invoke('git:checkout', cwd, branch),
    commit: (cwd: string, message: string) => ipcRenderer.invoke('git:commit', cwd, message),
    add: (cwd: string, files: string[]) => ipcRenderer.invoke('git:add', cwd, files),
    push: (cwd: string) => ipcRenderer.invoke('git:push', cwd),
    pull: (cwd: string) => ipcRenderer.invoke('git:pull', cwd)
  },

  // RPC for AI agent communication
  rpc: {
    invoke: (route: string, input: unknown) => ipcRenderer.invoke('rpc:invoke', route, input),
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    }
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => process.platform,
    getArch: () => process.arch
  },

  // Generic event listeners for menu commands
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback as (...args: unknown[]) => void)
  }
} satisfies ElectronAPI)

// Type declaration for window object
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}


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
    openFolder: (defaultPath?: string | null) => Promise<string | null>
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
  // KAN-7: readFile returns Buffer when no encoding, string when encoding is specified
  fs: {
    readFile: (path: string, encoding?: string | null) => Promise<string | Buffer>
    // KAN-6/KAN-7/KAN-12 FIX: Return plain strings instead of Buffer to avoid "Buffer is not defined"
    readFileAsBase64: (path: string) => Promise<string>
    readFileAsText: (path: string, encoding?: string) => Promise<string>
    getFileSize: (path: string) => Promise<number>
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
    execute: (command: string, cwd?: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
    executeStreaming: (command: string, cwd?: string) => Promise<{ pid: number }>
    onOutput: (callback: (data: { type: string; text: string; command: string }) => void) => () => void
    onComplete: (callback: (data: { command: string; exitCode: number; stdout: string; stderr: string }) => void) => () => void
    onStream: (callback: (data: { pid: number; type: string; text: string }) => void) => () => void
    onStreamEnd: (callback: (data: { pid: number; exitCode: number }) => void) => () => void
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

  // Knowledge Base operations
  kb: {
    getProviders: () => Promise<unknown[]>
    getStats: () => Promise<unknown>
    isUnlocked: () => Promise<boolean>
    addProvider: (type: string, name?: string) => Promise<unknown>
    updateProvider: (id: string, updates: unknown) => Promise<unknown>
    deleteProvider: (id: string) => Promise<boolean>
    addServer: (providerId: string, name: string, ip: string, config?: unknown) => Promise<unknown>
    updateServer: (providerId: string, serverId: string, updates: unknown) => Promise<unknown>
    deleteServer: (providerId: string, serverId: string) => Promise<boolean>
    importDocument: (providerId: string, filename: string, content: string) => Promise<unknown>
    openFileDialog: () => Promise<{ filename: string; content: string; filePath: string } | null>
    readFilePath: (filePath: string) => Promise<unknown>
    readMultipleFiles: (filePaths: string[]) => Promise<unknown>
    unlock: (password: string) => Promise<boolean>
    lock: () => Promise<void>
    generateAIContext: () => Promise<string>
    getRelevantContext: (query: string) => Promise<string>
    openTerminalWithSsh: (sshCommand: string) => Promise<boolean>
  }

  // Environment detection
  environment: {
    detectEnvironment: () => Promise<unknown>
    getSummary: () => Promise<string>
  }

  // Chat history operations
  history: {
    getThreads: () => Promise<unknown[]>
    getThread: (threadId: string) => Promise<unknown>
    getActiveThread: () => Promise<unknown>
    createThread: (firstMessage?: string, workspacePath?: string) => Promise<unknown>
    setActiveThread: (threadId: string | null) => Promise<boolean>
    addMessage: (threadId: string, message: { role: 'user' | 'assistant', content: string, images?: unknown[], cost?: number, model?: string, tokensIn?: number, tokensOut?: number }) => Promise<unknown>
    updateMetadata: (threadId: string, metadata: unknown) => Promise<boolean>
    updateMessageFeedback: (threadId: string, messageId: string, feedback: 'up' | 'down' | null) => Promise<boolean>
    renameThread: (threadId: string, newTitle: string) => Promise<boolean>
    deleteThread: (threadId: string) => Promise<boolean>
    clearAll: () => Promise<boolean>
    search: (query: string) => Promise<unknown[]>
    export: (threadId: string) => Promise<string>
  }

  // Workspace-specific storage for rules, patterns, and context
  // Stores data in ~/.aibuddy/workspaces/{workspace-hash}/
  workspace: {
    // Get workspace data path
    getPath: (workspacePath: string) => Promise<string>
    // Rules management - project-specific rules to prevent regressions
    getRules: (workspacePath: string) => Promise<string>
    setRules: (workspacePath: string, rules: string) => Promise<boolean>
    appendRule: (workspacePath: string, rule: string) => Promise<boolean>
    // Test patterns - learned test patterns for this project
    getTestPatterns: (workspacePath: string) => Promise<string>
    setTestPatterns: (workspacePath: string, patterns: string) => Promise<boolean>
    appendTestPattern: (workspacePath: string, pattern: string) => Promise<boolean>
    // Fixes log - record of bugs fixed (don't repeat!)
    getFixesLog: (workspacePath: string) => Promise<string>
    appendFix: (workspacePath: string, fix: string) => Promise<boolean>
    // Generic workspace data
    getData: (workspacePath: string, key: string) => Promise<unknown>
    setData: (workspacePath: string, key: string, value: unknown) => Promise<boolean>
  }

  // Generic invoke for backwards compatibility
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>

  // App info
  app: {
    getVersion: () => Promise<string>
    getPlatform: () => string
    getArch: () => string
  }

  // Version checker
  version: {
    check: () => Promise<unknown>
    get: () => Promise<{ currentVersion: string; lastVersionInfo: unknown }>
    dismissUpdate: (version: string) => Promise<boolean>
    onUpdateAvailable: (callback: (versionInfo: unknown) => void) => () => void
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
    openFolder: (defaultPath?: string | null) => ipcRenderer.invoke('dialog:openFolder', defaultPath),
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
    readFile: (path: string, encoding?: string | null) => ipcRenderer.invoke('fs:readFile', path, encoding),
    // KAN-6/KAN-7/KAN-12 FIX: Return base64 string directly (avoids Buffer in renderer)
    readFileAsBase64: (path: string) => ipcRenderer.invoke('fs:readFileAsBase64', path),
    // KAN-6/KAN-12 FIX: Return text string directly (avoids Buffer in renderer)
    readFileAsText: (path: string, encoding?: string) => ipcRenderer.invoke('fs:readFileAsText', path, encoding),
    // KAN-6 FIX: Get file size without Buffer
    getFileSize: (path: string) => ipcRenderer.invoke('fs:getFileSize', path),
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
    },
    execute: (command: string, cwd?: string) => ipcRenderer.invoke('terminal:execute', command, cwd),
    executeStreaming: (command: string, cwd?: string) => ipcRenderer.invoke('terminal:executeStreaming', command, cwd),
    onOutput: (callback: (data: { type: string; text: string; command: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { type: string; text: string; command: string }) => callback(data)
      ipcRenderer.on('terminal:output', handler)
      return () => ipcRenderer.removeListener('terminal:output', handler)
    },
    onComplete: (callback: (data: { command: string; exitCode: number; stdout: string; stderr: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { command: string; exitCode: number; stdout: string; stderr: string }) => callback(data)
      ipcRenderer.on('terminal:complete', handler)
      return () => ipcRenderer.removeListener('terminal:complete', handler)
    },
    onStream: (callback: (data: { pid: number; type: string; text: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { pid: number; type: string; text: string }) => callback(data)
      ipcRenderer.on('terminal:stream', handler)
      return () => ipcRenderer.removeListener('terminal:stream', handler)
    },
    onStreamEnd: (callback: (data: { pid: number; exitCode: number }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { pid: number; exitCode: number }) => callback(data)
      ipcRenderer.on('terminal:streamEnd', handler)
      return () => ipcRenderer.removeListener('terminal:streamEnd', handler)
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

  // Knowledge Base operations
  kb: {
    getProviders: () => ipcRenderer.invoke('kb:getProviders'),
    getStats: () => ipcRenderer.invoke('kb:getStats'),
    isUnlocked: () => ipcRenderer.invoke('kb:isUnlocked'),
    addProvider: (type: string, name?: string) => ipcRenderer.invoke('kb:addProvider', type, name),
    updateProvider: (id: string, updates: unknown) => ipcRenderer.invoke('kb:updateProvider', id, updates),
    deleteProvider: (id: string) => ipcRenderer.invoke('kb:deleteProvider', id),
    addServer: (providerId: string, name: string, ip: string, config?: unknown) => 
      ipcRenderer.invoke('kb:addServer', providerId, name, ip, config),
    updateServer: (providerId: string, serverId: string, updates: unknown) => 
      ipcRenderer.invoke('kb:updateServer', providerId, serverId, updates),
    deleteServer: (providerId: string, serverId: string) => 
      ipcRenderer.invoke('kb:deleteServer', providerId, serverId),
    importDocument: (providerId: string, filename: string, content: string) => 
      ipcRenderer.invoke('kb:importDocument', providerId, filename, content),
    openFileDialog: () => ipcRenderer.invoke('kb:openFileDialog'),
    readFilePath: (filePath: string) => ipcRenderer.invoke('kb:readFilePath', filePath),
    readMultipleFiles: (filePaths: string[]) => ipcRenderer.invoke('kb:readMultipleFiles', filePaths),
    unlock: (password: string) => ipcRenderer.invoke('kb:unlock', password),
    lock: () => ipcRenderer.invoke('kb:lock'),
    generateAIContext: () => ipcRenderer.invoke('kb:generateAIContext'),
    getRelevantContext: (query: string) => ipcRenderer.invoke('kb:getRelevantContext', query),
    openTerminalWithSsh: (sshCommand: string) => ipcRenderer.invoke('kb:openTerminalWithSsh', sshCommand),
  },

  // Environment detection
  environment: {
    detectEnvironment: () => ipcRenderer.invoke('env:detect'),
    getSummary: () => ipcRenderer.invoke('env:getSummary'),
  },

  // Chat history operations
  history: {
    getThreads: () => ipcRenderer.invoke('history:getThreads'),
    getThread: (threadId: string) => ipcRenderer.invoke('history:getThread', threadId),
    getActiveThread: () => ipcRenderer.invoke('history:getActiveThread'),
    createThread: (firstMessage?: string, workspacePath?: string) => 
      ipcRenderer.invoke('history:createThread', firstMessage, workspacePath),
    setActiveThread: (threadId: string | null) => ipcRenderer.invoke('history:setActiveThread', threadId),
    addMessage: (threadId: string, message: { role: 'user' | 'assistant', content: string, images?: unknown[], cost?: number, model?: string, tokensIn?: number, tokensOut?: number }) => 
      ipcRenderer.invoke('history:addMessage', threadId, message),
    updateMetadata: (threadId: string, metadata: unknown) => 
      ipcRenderer.invoke('history:updateMetadata', threadId, metadata),
    updateMessageFeedback: (threadId: string, messageId: string, feedback: 'up' | 'down' | null) =>
      ipcRenderer.invoke('history:updateMessageFeedback', threadId, messageId, feedback),
    renameThread: (threadId: string, newTitle: string) => 
      ipcRenderer.invoke('history:renameThread', threadId, newTitle),
    deleteThread: (threadId: string) => ipcRenderer.invoke('history:deleteThread', threadId),
    clearAll: () => ipcRenderer.invoke('history:clearAll'),
    search: (query: string) => ipcRenderer.invoke('history:search', query),
    export: (threadId: string) => ipcRenderer.invoke('history:export', threadId),
  },

  // Workspace-specific storage for rules, patterns, and context
  workspace: {
    getPath: (workspacePath: string) => ipcRenderer.invoke('workspace:getPath', workspacePath),
    getRules: (workspacePath: string) => ipcRenderer.invoke('workspace:getRules', workspacePath),
    setRules: (workspacePath: string, rules: string) => ipcRenderer.invoke('workspace:setRules', workspacePath, rules),
    appendRule: (workspacePath: string, rule: string) => ipcRenderer.invoke('workspace:appendRule', workspacePath, rule),
    getTestPatterns: (workspacePath: string) => ipcRenderer.invoke('workspace:getTestPatterns', workspacePath),
    setTestPatterns: (workspacePath: string, patterns: string) => ipcRenderer.invoke('workspace:setTestPatterns', workspacePath, patterns),
    appendTestPattern: (workspacePath: string, pattern: string) => ipcRenderer.invoke('workspace:appendTestPattern', workspacePath, pattern),
    getFixesLog: (workspacePath: string) => ipcRenderer.invoke('workspace:getFixesLog', workspacePath),
    appendFix: (workspacePath: string, fix: string) => ipcRenderer.invoke('workspace:appendFix', workspacePath, fix),
    getData: (workspacePath: string, key: string) => ipcRenderer.invoke('workspace:getData', workspacePath, key),
    setData: (workspacePath: string, key: string, value: unknown) => ipcRenderer.invoke('workspace:setData', workspacePath, key, value),
  },

  // Generic invoke for backwards compatibility
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => process.platform,
    getArch: () => process.arch
  },

  // Version checker
  version: {
    check: () => ipcRenderer.invoke('version:check'),
    get: () => ipcRenderer.invoke('version:get'),
    dismissUpdate: (version: string) => ipcRenderer.invoke('version:dismissUpdate', version),
    onUpdateAvailable: (callback: (versionInfo: unknown) => void) => {
      const handler = (_event: IpcRendererEvent, versionInfo: unknown) => callback(versionInfo)
      ipcRenderer.on('update-available', handler)
      return () => ipcRenderer.removeListener('update-available', handler)
    }
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


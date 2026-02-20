/**
 * VS Code API Compatibility Shim
 * 
 * This module provides a compatibility layer that mimics the VS Code extension API,
 * allowing code originally written for VS Code extensions to run in the Electron desktop app.
 */

import { EventEmitter } from 'events'

// Get the Electron API from the preload script (use globalThis to avoid shadowing by local 'window' object)
const electronAPI = typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined' ? ((globalThis as any).window as any).electronAPI : null

// ============================================================================
// Types
// ============================================================================

export interface Uri {
  scheme: string
  authority: string
  path: string
  query: string
  fragment: string
  fsPath: string
  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri
  toString(): string
}

export interface Position {
  line: number
  character: number
}

export interface Range {
  start: Position
  end: Position
}

export interface TextDocument {
  uri: Uri
  fileName: string
  languageId: string
  version: number
  isDirty: boolean
  getText(range?: Range): string
  lineAt(line: number): { text: string; range: Range }
  lineCount: number
}

export interface TextEditor {
  document: TextDocument
  selection: { start: Position; end: Position }
  selections: { start: Position; end: Position }[]
}

export interface OutputChannel {
  name: string
  append(value: string): void
  appendLine(value: string): void
  clear(): void
  show(preserveFocus?: boolean): void
  hide(): void
  dispose(): void
}

export interface Terminal {
  name: string
  processId: Promise<number | undefined>
  sendText(text: string, addNewLine?: boolean): void
  show(preserveFocus?: boolean): void
  hide(): void
  dispose(): void
}

export interface ExtensionContext {
  subscriptions: { dispose(): void }[]
  workspaceState: Memento
  globalState: Memento & { setKeysForSync(keys: string[]): void }
  extensionPath: string
  extensionUri: Uri
  storagePath: string | undefined
  globalStoragePath: string
  logPath: string
}

export interface Memento {
  get<T>(key: string): T | undefined
  get<T>(key: string, defaultValue: T): T
  update(key: string, value: any): Promise<void>
  keys(): readonly string[]
}

export interface Disposable {
  dispose(): void
}

// ============================================================================
// URI Implementation
// ============================================================================

class UriImpl implements Uri {
  constructor(
    public scheme: string,
    public authority: string,
    public path: string,
    public query: string,
    public fragment: string
  ) {}

  get fsPath(): string {
    if (this.scheme === 'file') {
      return this.path
    }
    return this.path
  }

  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
    return new UriImpl(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority,
      change.path ?? this.path,
      change.query ?? this.query,
      change.fragment ?? this.fragment
    )
  }

  toString(): string {
    let result = ''
    if (this.scheme) {
      result += this.scheme + '://'
    }
    if (this.authority) {
      result += this.authority
    }
    result += this.path
    if (this.query) {
      result += '?' + this.query
    }
    if (this.fragment) {
      result += '#' + this.fragment
    }
    return result
  }

  static file(path: string): Uri {
    return new UriImpl('file', '', path, '', '')
  }

  static parse(value: string): Uri {
    const url = new URL(value)
    return new UriImpl(
      url.protocol.replace(':', ''),
      url.host,
      url.pathname,
      url.search.replace('?', ''),
      url.hash.replace('#', '')
    )
  }

  static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    const newPath = [base.path, ...pathSegments].join('/')
    return base.with({ path: newPath })
  }
}

// ============================================================================
// Event Emitter for VS Code-style events
// ============================================================================

class VSCodeEventEmitter<T> {
  private emitter = new EventEmitter()
  private eventName = 'event'

  get event(): (listener: (e: T) => void) => Disposable {
    return (listener: (e: T) => void) => {
      this.emitter.on(this.eventName, listener)
      return {
        dispose: () => {
          this.emitter.off(this.eventName, listener)
        }
      }
    }
  }

  fire(data: T): void {
    this.emitter.emit(this.eventName, data)
  }

  dispose(): void {
    this.emitter.removeAllListeners()
  }
}

// ============================================================================
// Output Channel Implementation
// ============================================================================

class OutputChannelImpl implements OutputChannel {
  private content: string[] = []
  private visible = false

  constructor(public name: string) {}

  append(value: string): void {
    this.content.push(value)
    console.log(`[${this.name}]`, value)
  }

  appendLine(value: string): void {
    this.content.push(value + '\n')
    console.log(`[${this.name}]`, value)
  }

  clear(): void {
    this.content = []
  }

  show(_preserveFocus?: boolean): void {
    this.visible = true
  }

  hide(): void {
    this.visible = false
  }

  dispose(): void {
    this.content = []
  }
}

// ============================================================================
// Terminal Implementation
// ============================================================================

class TerminalImpl implements Terminal {
  private terminalId: number | null = null
  private _processId: Promise<number | undefined>

  constructor(public name: string, private cwd?: string) {
    this._processId = this.initialize()
  }

  private async initialize(): Promise<number | undefined> {
    if (electronAPI) {
      this.terminalId = await electronAPI.terminal.create({ cwd: this.cwd })
      const info = await electronAPI.terminal.getInfo?.(this.terminalId)
      return info?.pid
    }
    return undefined
  }

  get processId(): Promise<number | undefined> {
    return this._processId
  }

  sendText(text: string, addNewLine = true): void {
    if (this.terminalId !== null && electronAPI) {
      electronAPI.terminal.write(this.terminalId, text + (addNewLine ? '\n' : ''))
    }
  }

  show(_preserveFocus?: boolean): void {
    // Terminal visibility is handled by the UI
  }

  hide(): void {
    // Terminal visibility is handled by the UI
  }

  dispose(): void {
    if (this.terminalId !== null && electronAPI) {
      electronAPI.terminal.kill(this.terminalId)
    }
  }
}

// ============================================================================
// Memento Implementation (for state storage)
// ============================================================================

class MementoImpl implements Memento {
  private cache = new Map<string, any>()
  private prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
    this.loadFromStore()
  }

  private async loadFromStore(): Promise<void> {
    if (electronAPI) {
      const data = await electronAPI.store.get(this.prefix)
      if (data && typeof data === 'object') {
        Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
          this.cache.set(key, value)
        })
      }
    }
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T
    }
    return defaultValue
  }

  async update(key: string, value: any): Promise<void> {
    if (value === undefined) {
      this.cache.delete(key)
    } else {
      this.cache.set(key, value)
    }
    
    if (electronAPI) {
      const data = Object.fromEntries(this.cache)
      await electronAPI.store.set(this.prefix, data)
    }
  }

  keys(): readonly string[] {
    return Array.from(this.cache.keys())
  }
}

// ============================================================================
// VS Code Namespace Implementations
// ============================================================================

// Window namespace
const window = {
  activeTextEditor: undefined as TextEditor | undefined,
  visibleTextEditors: [] as TextEditor[],
  terminals: [] as Terminal[],
  activeTerminal: undefined as Terminal | undefined,

  // Event emitters
  onDidChangeActiveTextEditor: new VSCodeEventEmitter<TextEditor | undefined>().event,
  onDidChangeVisibleTextEditors: new VSCodeEventEmitter<TextEditor[]>().event,
  onDidOpenTerminal: new VSCodeEventEmitter<Terminal>().event,
  onDidCloseTerminal: new VSCodeEventEmitter<Terminal>().event,
  onDidChangeActiveTerminal: new VSCodeEventEmitter<Terminal | undefined>().event,
  onDidChangeWindowState: new VSCodeEventEmitter<{ focused: boolean }>().event,

  state: { focused: true },

  createOutputChannel(name: string): OutputChannel {
    return new OutputChannelImpl(name)
  },

  createTerminal(options?: { name?: string; cwd?: string; shellPath?: string; env?: Record<string, string> }): Terminal {
    const terminal = new TerminalImpl(options?.name || 'Terminal', options?.cwd)
    this.terminals.push(terminal)
    return terminal
  },

  async showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
    if (electronAPI) {
      const result = await electronAPI.dialog.showMessage({
        type: 'info',
        message,
        buttons: items.length > 0 ? items : ['OK']
      })
      return items[result.response]
    }
    console.info(message)
    return undefined
  },

  async showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
    if (electronAPI) {
      const result = await electronAPI.dialog.showMessage({
        type: 'warning',
        message,
        buttons: items.length > 0 ? items : ['OK']
      })
      return items[result.response]
    }
    console.warn(message)
    return undefined
  },

  async showErrorMessage(message: string, ...items: string[]): Promise<string | undefined> {
    if (electronAPI) {
      const result = await electronAPI.dialog.showMessage({
        type: 'error',
        message,
        buttons: items.length > 0 ? items : ['OK']
      })
      return items[result.response]
    }
    console.error(message)
    return undefined
  },

  async showInputBox(options?: { prompt?: string; value?: string; placeHolder?: string; password?: boolean }): Promise<string | undefined> {
    // This will be handled by a custom React dialog in the renderer
    return new Promise((resolve) => {
      // Emit event for renderer to show input dialog
      if (electronAPI) {
        electronAPI.rpc.invoke('showInputBox', options).then(resolve as any)
      } else {
        resolve(prompt(options?.prompt || 'Enter value:') || undefined)
      }
    })
  },

  async showQuickPick<T extends { label: string }>(items: T[], options?: { placeHolder?: string; canPickMany?: boolean }): Promise<T | T[] | undefined> {
    // This will be handled by a custom React dialog in the renderer
    if (electronAPI) {
      return electronAPI.rpc.invoke('showQuickPick', { items, options }) as Promise<T | T[] | undefined>
    }
    return undefined
  },

  async showOpenDialog(options?: { canSelectFiles?: boolean; canSelectFolders?: boolean; canSelectMany?: boolean; filters?: { [name: string]: string[] } }): Promise<Uri[] | undefined> {
    if (electronAPI) {
      if (options?.canSelectFolders) {
        const path = await electronAPI.dialog.openFolder()
        return path ? [UriImpl.file(path)] : undefined
      } else {
        const path = await electronAPI.dialog.openFile()
        return path ? [UriImpl.file(path)] : undefined
      }
    }
    return undefined
  },

  async showSaveDialog(options?: { defaultUri?: Uri; filters?: { [name: string]: string[] } }): Promise<Uri | undefined> {
    if (electronAPI) {
      const path = await electronAPI.dialog.saveFile(options?.defaultUri?.fsPath)
      return path ? UriImpl.file(path) : undefined
    }
    return undefined
  },

  withProgress<R>(
    options: { location: any; title?: string; cancellable?: boolean },
    task: (progress: { report(value: { message?: string; increment?: number }): void }, token: { isCancellationRequested: boolean; onCancellationRequested: any }) => Promise<R>
  ): Promise<R> {
    const progress = {
      report: (value: { message?: string; increment?: number }) => {
        console.log(`[Progress] ${options.title}: ${value.message || ''} ${value.increment ? `(${value.increment}%)` : ''}`)
      }
    }
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: new VSCodeEventEmitter<void>().event
    }
    return task(progress, token)
  },

  createStatusBarItem(_alignment?: number, _priority?: number) {
    return {
      text: '',
      tooltip: '',
      command: undefined as string | undefined,
      show: () => {},
      hide: () => {},
      dispose: () => {}
    }
  },

  registerWebviewViewProvider(_viewId: string, _provider: any) {
    return { dispose: () => {} }
  }
}

// Workspace namespace
const workspace = {
  workspaceFolders: undefined as { uri: Uri; name: string; index: number }[] | undefined,
  name: undefined as string | undefined,
  rootPath: undefined as string | undefined,

  onDidChangeWorkspaceFolders: new VSCodeEventEmitter<{ added: { uri: Uri }[]; removed: { uri: Uri }[] }>().event,
  onDidOpenTextDocument: new VSCodeEventEmitter<TextDocument>().event,
  onDidCloseTextDocument: new VSCodeEventEmitter<TextDocument>().event,
  onDidChangeTextDocument: new VSCodeEventEmitter<{ document: TextDocument; contentChanges: any[] }>().event,
  onDidSaveTextDocument: new VSCodeEventEmitter<TextDocument>().event,

  getConfiguration(section?: string) {
    return {
      get: <T>(key: string, defaultValue?: T): T | undefined => {
        // Get from electron store
        if (electronAPI) {
          const fullKey = section ? `${section}.${key}` : key
          // This is synchronous for compatibility, but we should cache values
          return defaultValue
        }
        return defaultValue
      },
      update: async (key: string, value: any, _configurationTarget?: any) => {
        if (electronAPI) {
          const fullKey = section ? `${section}.${key}` : key
          await electronAPI.store.set(fullKey, value)
        }
      },
      has: (key: string): boolean => {
        return false
      }
    }
  },

  async openTextDocument(uri: Uri | string): Promise<TextDocument> {
    const path = typeof uri === 'string' ? uri : uri.fsPath
    if (electronAPI) {
      const content = await electronAPI.fs.readFile(path, 'utf-8')
      return {
        uri: typeof uri === 'string' ? UriImpl.file(uri) : uri,
        fileName: path,
        languageId: getLanguageId(path),
        version: 1,
        isDirty: false,
        getText: () => content as string,
        lineAt: (line: number) => {
          const lines = (content as string).split('\n')
          return {
            text: lines[line] || '',
            range: { start: { line, character: 0 }, end: { line, character: lines[line]?.length || 0 } }
          }
        },
        lineCount: (content as string).split('\n').length
      }
    }
    throw new Error('Cannot open document without Electron API')
  },

  async findFiles(include: string, _exclude?: string, _maxResults?: number): Promise<Uri[]> {
    // This would need a proper glob implementation
    console.log('findFiles called with:', include)
    return []
  },

  fs: {
    async readFile(uri: Uri): Promise<Uint8Array> {
      if (electronAPI) {
        const content = await electronAPI.fs.readFile(uri.fsPath)
        return new TextEncoder().encode(content as string)
      }
      throw new Error('Cannot read file without Electron API')
    },

    async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
      if (electronAPI) {
        await electronAPI.fs.writeFile(uri.fsPath, new TextDecoder().decode(content))
      }
    },

    async delete(uri: Uri, options?: { recursive?: boolean }): Promise<void> {
      if (electronAPI) {
        await electronAPI.fs.rm(uri.fsPath, options?.recursive)
      }
    },

    async rename(oldUri: Uri, newUri: Uri): Promise<void> {
      if (electronAPI) {
        await electronAPI.fs.rename(oldUri.fsPath, newUri.fsPath)
      }
    },

    async copy(source: Uri, target: Uri): Promise<void> {
      if (electronAPI) {
        await electronAPI.fs.copy(source.fsPath, target.fsPath)
      }
    },

    async createDirectory(uri: Uri): Promise<void> {
      if (electronAPI) {
        await electronAPI.fs.mkdir(uri.fsPath, true)
      }
    },

    async stat(uri: Uri): Promise<{ type: number; ctime: number; mtime: number; size: number }> {
      if (electronAPI) {
        const stat = await electronAPI.fs.stat(uri.fsPath)
        return {
          type: stat.isDirectory ? 2 : 1, // FileType.Directory = 2, FileType.File = 1
          ctime: stat.ctime,
          mtime: stat.mtime,
          size: stat.size
        }
      }
      throw new Error('Cannot stat file without Electron API')
    },

    async readDirectory(uri: Uri): Promise<[string, number][]> {
      if (electronAPI) {
        const entries = await electronAPI.fs.readDir(uri.fsPath)
        return entries.map((e: any) => [e.name, e.isDirectory ? 2 : 1])
      }
      return []
    }
  }
}

// Commands namespace
const commands = {
  registeredCommands: new Map<string, (...args: any[]) => any>(),

  registerCommand(command: string, callback: (...args: any[]) => any): Disposable {
    this.registeredCommands.set(command, callback)
    return {
      dispose: () => {
        this.registeredCommands.delete(command)
      }
    }
  },

  async executeCommand<T>(command: string, ...args: any[]): Promise<T | undefined> {
    const handler = this.registeredCommands.get(command)
    if (handler) {
      return handler(...args)
    }
    // Try to execute via Electron IPC
    if (electronAPI) {
      return electronAPI.rpc.invoke('command:execute', { command, args }) as Promise<T>
    }
    console.warn(`Command not found: ${command}`)
    return undefined
  },

  getCommands(): Promise<string[]> {
    return Promise.resolve(Array.from(this.registeredCommands.keys()))
  }
}

// Languages namespace
const languages = {
  registerCompletionItemProvider(_selector: any, _provider: any, ..._triggerCharacters: string[]) {
    return { dispose: () => {} }
  },

  registerHoverProvider(_selector: any, _provider: any) {
    return { dispose: () => {} }
  },

  registerDefinitionProvider(_selector: any, _provider: any) {
    return { dispose: () => {} }
  },

  getDiagnostics(_uri?: Uri) {
    return []
  }
}

// Env namespace
const env = {
  appName: 'AIBuddy Desktop',
  appRoot: '',
  language: navigator.language,
  machineId: '',
  sessionId: '',
  uriScheme: 'aibuddy',

  async openExternal(target: Uri): Promise<boolean> {
    if (electronAPI) {
      return electronAPI.shell.openExternal(target.toString())
    }
    ;(globalThis as any).open(target.toString(), '_blank')
    return true
  },

  clipboard: {
    async readText(): Promise<string> {
      return navigator.clipboard.readText()
    },
    async writeText(value: string): Promise<void> {
      await navigator.clipboard.writeText(value)
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLanguageId(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    php: 'php',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    sql: 'sql',
    sh: 'shellscript',
    bash: 'shellscript',
    zsh: 'shellscript',
    ps1: 'powershell',
    dockerfile: 'dockerfile'
  }
  return languageMap[ext || ''] || 'plaintext'
}

// ============================================================================
// Enums
// ============================================================================

const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15
}

const FileType = {
  Unknown: 0,
  File: 1,
  Directory: 2,
  SymbolicLink: 64
}

const StatusBarAlignment = {
  Left: 1,
  Right: 2
}

const ViewColumn = {
  Active: -1,
  Beside: -2,
  One: 1,
  Two: 2,
  Three: 3
}

const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
}

// ============================================================================
// Export the vscode shim
// ============================================================================

export const vscode = {
  Uri: UriImpl,
  window,
  workspace,
  commands,
  languages,
  env,
  ProgressLocation,
  FileType,
  StatusBarAlignment,
  ViewColumn,
  ConfigurationTarget,
  EventEmitter: VSCodeEventEmitter,
  Disposable: class implements Disposable {
    constructor(private callOnDispose: () => void) {}
    dispose() {
      this.callOnDispose()
    }
  }
}

export default vscode


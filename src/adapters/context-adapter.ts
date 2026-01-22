/**
 * Extension Context Adapter
 * 
 * Provides a VS Code ExtensionContext-compatible interface for the Electron desktop app.
 */

import { vscode, Uri, Memento, Disposable, ExtensionContext } from './vscode-shim'

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null

/**
 * Memento implementation using Electron Store
 */
class ElectronMemento implements Memento {
  private cache = new Map<string, any>()
  private initialized = false

  constructor(private prefix: string) {}

  async initialize(): Promise<void> {
    if (this.initialized) return
    
    if (electronAPI) {
      const data = await electronAPI.store.get(this.prefix)
      if (data && typeof data === 'object') {
        Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
          this.cache.set(key, value)
        })
      }
    }
    this.initialized = true
  }

  get<T>(key: string): T | undefined
  get<T>(key: string, defaultValue: T): T
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

/**
 * Global state with sync keys support
 */
class GlobalStateMemento extends ElectronMemento {
  private syncKeys: string[] = []

  setKeysForSync(keys: string[]): void {
    this.syncKeys = keys
  }

  getSyncKeys(): string[] {
    return this.syncKeys
  }
}

/**
 * Secret storage implementation
 */
class SecretStorage {
  private prefix = 'aibuddy-secrets'

  async get(key: string): Promise<string | undefined> {
    if (electronAPI) {
      const secrets = await electronAPI.store.get(this.prefix) as Record<string, string> | undefined
      return secrets?.[key]
    }
    return undefined
  }

  async store(key: string, value: string): Promise<void> {
    if (electronAPI) {
      const secrets = (await electronAPI.store.get(this.prefix) as Record<string, string>) || {}
      secrets[key] = value
      await electronAPI.store.set(this.prefix, secrets)
    }
  }

  async delete(key: string): Promise<void> {
    if (electronAPI) {
      const secrets = (await electronAPI.store.get(this.prefix) as Record<string, string>) || {}
      delete secrets[key]
      await electronAPI.store.set(this.prefix, secrets)
    }
  }
}

/**
 * Create an ExtensionContext-compatible object for the desktop app
 */
export async function createExtensionContext(): Promise<ExtensionContext & {
  secrets: SecretStorage
  asAbsolutePath(relativePath: string): string
}> {
  const workspaceState = new ElectronMemento('aibuddy-workspace-state')
  const globalState = new GlobalStateMemento('aibuddy-global-state')
  
  await workspaceState.initialize()
  await globalState.initialize()

  // Get app paths from Electron
  let extensionPath = ''
  let globalStoragePath = ''
  let logPath = ''

  if (electronAPI) {
    extensionPath = await electronAPI.app.getPath?.('userData') || ''
    globalStoragePath = extensionPath
    logPath = extensionPath + '/logs'
  }

  const subscriptions: Disposable[] = []

  const context: ExtensionContext & {
    secrets: SecretStorage
    asAbsolutePath(relativePath: string): string
  } = {
    subscriptions,
    workspaceState,
    globalState,
    extensionPath,
    extensionUri: vscode.Uri.file(extensionPath),
    storagePath: extensionPath + '/storage',
    globalStoragePath,
    logPath,
    secrets: new SecretStorage(),
    asAbsolutePath(relativePath: string): string {
      return extensionPath + '/' + relativePath
    }
  }

  return context
}

/**
 * Singleton context instance
 */
let contextInstance: Awaited<ReturnType<typeof createExtensionContext>> | null = null

export async function getExtensionContext(): Promise<Awaited<ReturnType<typeof createExtensionContext>>> {
  if (!contextInstance) {
    contextInstance = await createExtensionContext()
  }
  return contextInstance
}

/**
 * Initialize the context (call this early in app startup)
 */
export async function initializeContext(): Promise<void> {
  await getExtensionContext()
}


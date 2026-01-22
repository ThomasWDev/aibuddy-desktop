/**
 * Electron Bridge
 * 
 * Provides a unified interface for communicating with the Electron main process.
 * This replaces the VS Code webview postMessage API.
 */

type MessageHandler = (...args: unknown[]) => void

class ElectronBridge {
  private handlers = new Map<string, Set<MessageHandler>>()
  private electronAPI = (window as any).electronAPI

  constructor() {
    if (!this.electronAPI) {
      console.warn('Electron API not available - running in browser mode')
    }
  }

  /**
   * Check if running in Electron
   */
  get isElectron(): boolean {
    return !!this.electronAPI
  }

  /**
   * Send a message to the main process (like vscode.postMessage)
   */
  async postMessage<T = unknown>(message: { type: string; [key: string]: unknown }): Promise<T> {
    if (!this.electronAPI) {
      console.warn('Cannot post message - not in Electron')
      return undefined as T
    }

    return this.electronAPI.rpc.invoke(message.type, message) as Promise<T>
  }

  /**
   * Subscribe to messages from the main process
   */
  onMessage(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    // Set up Electron listener if not already done
    if (this.electronAPI) {
      const unsubscribe = this.electronAPI.on(type, (...args: unknown[]) => {
        this.handlers.get(type)?.forEach(h => h(...args))
      })

      return () => {
        this.handlers.get(type)?.delete(handler)
        unsubscribe()
      }
    }

    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  /**
   * File system operations
   */
  get fs() {
    return this.electronAPI?.fs || {
      readFile: async () => { throw new Error('Not in Electron') },
      writeFile: async () => { throw new Error('Not in Electron') },
      readDir: async () => [],
      stat: async () => { throw new Error('Not in Electron') },
      exists: async () => false,
      mkdir: async () => { throw new Error('Not in Electron') },
      rm: async () => { throw new Error('Not in Electron') },
      rename: async () => { throw new Error('Not in Electron') },
      copy: async () => { throw new Error('Not in Electron') }
    }
  }

  /**
   * Terminal operations
   */
  get terminal() {
    return this.electronAPI?.terminal || {
      create: async () => { throw new Error('Not in Electron') },
      write: async () => { throw new Error('Not in Electron') },
      resize: async () => { throw new Error('Not in Electron') },
      kill: async () => { throw new Error('Not in Electron') },
      onData: () => () => {},
      onExit: () => () => {}
    }
  }

  /**
   * Git operations
   */
  get git() {
    return this.electronAPI?.git || {
      status: async () => { throw new Error('Not in Electron') },
      diff: async () => '',
      log: async () => [],
      branch: async () => ({ current: '', all: [] }),
      checkout: async () => { throw new Error('Not in Electron') },
      commit: async () => { throw new Error('Not in Electron') },
      add: async () => { throw new Error('Not in Electron') },
      push: async () => { throw new Error('Not in Electron') },
      pull: async () => { throw new Error('Not in Electron') }
    }
  }

  /**
   * Dialog operations
   */
  get dialog() {
    return this.electronAPI?.dialog || {
      openFolder: async () => null,
      openFile: async () => null,
      saveFile: async () => null,
      showMessage: async () => ({ response: 0 })
    }
  }

  /**
   * Store operations (persistent storage)
   */
  get store() {
    return this.electronAPI?.store || {
      get: async () => undefined,
      set: async () => true,
      delete: async () => true
    }
  }

  /**
   * Shell operations
   */
  get shell() {
    return this.electronAPI?.shell || {
      openExternal: async (url: string) => {
        window.open(url, '_blank')
        return true
      },
      showItemInFolder: async () => false
    }
  }

  /**
   * App info
   */
  get app() {
    return this.electronAPI?.app || {
      getVersion: async () => '1.0.0',
      getPlatform: () => 'browser',
      getArch: () => 'unknown'
    }
  }
}

// Export singleton instance
export const electronBridge = new ElectronBridge()

// Also export for direct use
export default electronBridge


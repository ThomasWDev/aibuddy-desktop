/**
 * Terminal Adapter
 * 
 * Provides terminal functionality using node-pty in the main process
 * and xterm.js in the renderer process.
 */

import { EventEmitter } from 'events'

const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null

export interface TerminalOptions {
  name?: string
  cwd?: string
  shell?: string
  env?: Record<string, string>
}

export interface TerminalInstance {
  id: number
  name: string
  cwd: string
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  onData(callback: (data: string) => void): () => void
  onExit(callback: (exitCode: number) => void): () => void
}

export interface ExecutionResult {
  output: string
  exitCode: number
  duration: number
}

/**
 * Terminal Manager for the desktop app
 */
export class TerminalManager extends EventEmitter {
  private static instance: TerminalManager | null = null
  private terminals = new Map<number, TerminalInstance>()
  private dataListeners = new Map<number, Set<(data: string) => void>>()
  private exitListeners = new Map<number, Set<(exitCode: number) => void>>()
  private globalDataUnsubscribe: (() => void) | null = null
  private globalExitUnsubscribe: (() => void) | null = null

  private constructor() {
    super()
    this.setupGlobalListeners()
  }

  static getInstance(): TerminalManager {
    if (!TerminalManager.instance) {
      TerminalManager.instance = new TerminalManager()
    }
    return TerminalManager.instance
  }

  private setupGlobalListeners(): void {
    if (!electronAPI) return

    // Listen for terminal data from main process
    this.globalDataUnsubscribe = electronAPI.terminal.onData((id: number, data: string) => {
      const listeners = this.dataListeners.get(id)
      if (listeners) {
        listeners.forEach(callback => callback(data))
      }
      this.emit('data', id, data)
    })

    // Listen for terminal exit from main process
    this.globalExitUnsubscribe = electronAPI.terminal.onExit((id: number, exitCode: number) => {
      const listeners = this.exitListeners.get(id)
      if (listeners) {
        listeners.forEach(callback => callback(exitCode))
      }
      this.emit('exit', id, exitCode)
      
      // Cleanup
      this.terminals.delete(id)
      this.dataListeners.delete(id)
      this.exitListeners.delete(id)
    })
  }

  /**
   * Create a new terminal
   */
  async createTerminal(options: TerminalOptions = {}): Promise<TerminalInstance> {
    if (!electronAPI) {
      throw new Error('Electron API not available')
    }

    const id = await electronAPI.terminal.create({
      cwd: options.cwd,
      shell: options.shell,
      env: options.env
    })

    const terminal: TerminalInstance = {
      id,
      name: options.name || `Terminal ${id}`,
      cwd: options.cwd || process.cwd?.() || '',

      write: (data: string) => {
        electronAPI.terminal.write(id, data)
      },

      resize: (cols: number, rows: number) => {
        electronAPI.terminal.resize(id, cols, rows)
      },

      kill: () => {
        electronAPI.terminal.kill(id)
      },

      onData: (callback: (data: string) => void) => {
        if (!this.dataListeners.has(id)) {
          this.dataListeners.set(id, new Set())
        }
        this.dataListeners.get(id)!.add(callback)
        
        return () => {
          this.dataListeners.get(id)?.delete(callback)
        }
      },

      onExit: (callback: (exitCode: number) => void) => {
        if (!this.exitListeners.has(id)) {
          this.exitListeners.set(id, new Set())
        }
        this.exitListeners.get(id)!.add(callback)
        
        return () => {
          this.exitListeners.get(id)?.delete(callback)
        }
      }
    }

    this.terminals.set(id, terminal)
    this.emit('created', terminal)

    return terminal
  }

  /**
   * Execute a command and wait for completion
   */
  async executeCommand(
    command: string,
    options: {
      cwd?: string
      timeout?: number
      terminal?: TerminalInstance
    } = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    const timeout = options.timeout || 30000

    // Create a new terminal if not provided
    const terminal = options.terminal || await this.createTerminal({ cwd: options.cwd })
    
    return new Promise((resolve, reject) => {
      let output = ''
      let resolved = false

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true
          reject(new Error('Command execution timed out'))
        }
      }, timeout)

      // Capture output
      const unsubscribeData = terminal.onData((data) => {
        output += data
      })

      // Create completion marker
      const marker = `__AIBUDDY_DONE_${Date.now()}__`
      const exitCodeMarker = `__EXIT_`

      // Wrap command to capture exit code
      const wrappedCommand = process.platform === 'win32'
        ? `${command} & echo ${exitCodeMarker}%ERRORLEVEL%${marker}\r`
        : `${command}; echo "${exitCodeMarker}$?${marker}"\n`

      terminal.write(wrappedCommand)

      // Check for completion
      const checkInterval = setInterval(() => {
        if (output.includes(marker)) {
          clearInterval(checkInterval)
          clearTimeout(timeoutId)
          unsubscribeData()

          if (!resolved) {
            resolved = true

            // Extract exit code
            const exitCodeMatch = output.match(new RegExp(`${exitCodeMarker}(\\d+)${marker}`))
            const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 0

            // Clean output
            const cleanOutput = output
              .replace(new RegExp(`${exitCodeMarker}\\d+${marker}`), '')
              .replace(wrappedCommand, '')
              .trim()

            // Kill terminal if we created it
            if (!options.terminal) {
              terminal.kill()
            }

            resolve({
              output: cleanOutput,
              exitCode,
              duration: Date.now() - startTime
            })
          }
        }
      }, 100)
    })
  }

  /**
   * Get a terminal by ID
   */
  getTerminal(id: number): TerminalInstance | undefined {
    return this.terminals.get(id)
  }

  /**
   * Get all terminals
   */
  getAllTerminals(): TerminalInstance[] {
    return Array.from(this.terminals.values())
  }

  /**
   * Kill all terminals
   */
  killAll(): void {
    for (const terminal of this.terminals.values()) {
      terminal.kill()
    }
    this.terminals.clear()
    this.dataListeners.clear()
    this.exitListeners.clear()
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.killAll()
    this.globalDataUnsubscribe?.()
    this.globalExitUnsubscribe?.()
    this.removeAllListeners()
  }
}

// Export singleton instance
export const terminalManager = TerminalManager.getInstance()


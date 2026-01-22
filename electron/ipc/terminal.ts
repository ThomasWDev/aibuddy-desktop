import { ipcMain, BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import * as os from 'os'

interface TerminalInstance {
  id: number
  pty: pty.IPty
  cwd: string
}

// Store active terminal instances
const terminals = new Map<number, TerminalInstance>()
let terminalIdCounter = 0

/**
 * Get the default shell for the current platform
 */
function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

/**
 * Initialize terminal IPC handlers
 */
export function initTerminalHandlers(): void {
  // Create a new terminal
  ipcMain.handle('terminal:create', (_event, options?: { cwd?: string; shell?: string; env?: Record<string, string> }) => {
    const id = ++terminalIdCounter
    const shell = options?.shell || getDefaultShell()
    const cwd = options?.cwd || os.homedir()

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: {
          ...process.env,
          ...options?.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        } as Record<string, string>
      })

      // Store terminal instance
      terminals.set(id, {
        id,
        pty: ptyProcess,
        cwd
      })

      // Forward data to renderer
      ptyProcess.onData((data) => {
        const windows = BrowserWindow.getAllWindows()
        windows.forEach((win) => {
          win.webContents.send('terminal:data', id, data)
        })
      })

      // Handle exit
      ptyProcess.onExit(({ exitCode }) => {
        const windows = BrowserWindow.getAllWindows()
        windows.forEach((win) => {
          win.webContents.send('terminal:exit', id, exitCode)
        })
        terminals.delete(id)
      })

      return id
    } catch (error) {
      throw new Error(`Failed to create terminal: ${(error as Error).message}`)
    }
  })

  // Write data to terminal
  ipcMain.handle('terminal:write', (_event, id: number, data: string) => {
    const terminal = terminals.get(id)
    if (!terminal) {
      throw new Error(`Terminal ${id} not found`)
    }
    terminal.pty.write(data)
  })

  // Resize terminal
  ipcMain.handle('terminal:resize', (_event, id: number, cols: number, rows: number) => {
    const terminal = terminals.get(id)
    if (!terminal) {
      throw new Error(`Terminal ${id} not found`)
    }
    terminal.pty.resize(cols, rows)
  })

  // Kill terminal
  ipcMain.handle('terminal:kill', (_event, id: number) => {
    const terminal = terminals.get(id)
    if (!terminal) {
      return // Already killed
    }
    terminal.pty.kill()
    terminals.delete(id)
  })

  // Get terminal info
  ipcMain.handle('terminal:getInfo', (_event, id: number) => {
    const terminal = terminals.get(id)
    if (!terminal) {
      return null
    }
    return {
      id: terminal.id,
      cwd: terminal.cwd,
      pid: terminal.pty.pid
    }
  })

  // List all terminals
  ipcMain.handle('terminal:list', () => {
    return Array.from(terminals.values()).map((t) => ({
      id: t.id,
      cwd: t.cwd,
      pid: t.pty.pid
    }))
  })

  // Execute command and wait for completion
  ipcMain.handle('terminal:execute', async (_event, id: number, command: string, timeout = 30000): Promise<{
    output: string
    exitCode: number
  }> => {
    const terminal = terminals.get(id)
    if (!terminal) {
      throw new Error(`Terminal ${id} not found`)
    }

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
      const dataHandler = terminal.pty.onData((data) => {
        output += data
      })

      // Listen for command completion marker
      const marker = `__AIBUDDY_CMD_DONE_${Date.now()}__`
      const exitCodeMarker = `__AIBUDDY_EXIT_CODE_`

      // Write command with completion marker
      const wrappedCommand = process.platform === 'win32'
        ? `${command} & echo ${exitCodeMarker}%ERRORLEVEL%${marker}\r`
        : `${command}; echo "${exitCodeMarker}$?${marker}"\n`

      terminal.pty.write(wrappedCommand)

      // Check for completion marker in output
      const checkInterval = setInterval(() => {
        if (output.includes(marker)) {
          clearInterval(checkInterval)
          clearTimeout(timeoutId)
          dataHandler.dispose()

          if (!resolved) {
            resolved = true

            // Extract exit code
            const exitCodeMatch = output.match(new RegExp(`${exitCodeMarker}(\\d+)${marker}`))
            const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 0

            // Clean up output
            const cleanOutput = output
              .replace(new RegExp(`${exitCodeMarker}\\d+${marker}`), '')
              .replace(wrappedCommand, '')
              .trim()

            resolve({ output: cleanOutput, exitCode })
          }
        }
      }, 100)
    })
  })
}

/**
 * Cleanup all terminals on app quit
 */
export function cleanupTerminalHandlers(): void {
  for (const terminal of terminals.values()) {
    try {
      terminal.pty.kill()
    } catch {
      // Ignore errors during cleanup
    }
  }
  terminals.clear()
}

/**
 * Get active terminal count
 */
export function getActiveTerminalCount(): number {
  return terminals.size
}


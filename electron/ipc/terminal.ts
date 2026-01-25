import { ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as os from 'os'

interface TerminalInstance {
  id: number
  process: ChildProcess | null
  cwd: string
  output: string[]
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
 * Note: This is a simplified terminal implementation without node-pty
 * Full PTY support will be added in a future release
 */
export function initTerminalHandlers(): void {
  // Create a new terminal (simplified - just tracks state)
  ipcMain.handle('terminal:create', (_event, options?: { cwd?: string; shell?: string; env?: Record<string, string> }) => {
    const id = ++terminalIdCounter
    const cwd = options?.cwd || os.homedir()

    // Store terminal instance (without actual PTY)
    terminals.set(id, {
      id,
      process: null,
      cwd,
      output: []
    })

    // Send initial message
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send('terminal:data', id, `AIBuddy Terminal v1.0\r\nWorking directory: ${cwd}\r\n$ `)
    })

    return id
  })

  // Write data to terminal (execute command)
  ipcMain.handle('terminal:write', async (_event, id: number, data: string) => {
    const terminal = terminals.get(id)
    if (!terminal) {
      throw new Error(`Terminal ${id} not found`)
    }

    // If it's just a newline, execute the accumulated command
    if (data === '\r' || data === '\n') {
      const command = terminal.output.join('').trim()
      terminal.output = []

      if (command) {
        const windows = BrowserWindow.getAllWindows()
        
        // Echo the command
        windows.forEach((win) => {
          win.webContents.send('terminal:data', id, '\r\n')
        })

        try {
          // Execute the command
          const shell = getDefaultShell()
          const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command]
          
          const child = spawn(shell, shellArgs, {
            cwd: terminal.cwd,
            env: process.env as Record<string, string>,
            shell: false
          })

          terminal.process = child

          child.stdout?.on('data', (chunk) => {
            const output = chunk.toString().replace(/\n/g, '\r\n')
            windows.forEach((win) => {
              win.webContents.send('terminal:data', id, output)
            })
          })

          child.stderr?.on('data', (chunk) => {
            const output = chunk.toString().replace(/\n/g, '\r\n')
            windows.forEach((win) => {
              win.webContents.send('terminal:data', id, output)
            })
          })

          child.on('close', (code) => {
            terminal.process = null
            windows.forEach((win) => {
              win.webContents.send('terminal:data', id, `\r\n$ `)
            })
          })

          child.on('error', (err) => {
            windows.forEach((win) => {
              win.webContents.send('terminal:data', id, `\r\nError: ${err.message}\r\n$ `)
            })
          })
        } catch (error) {
          windows.forEach((win) => {
            win.webContents.send('terminal:data', id, `\r\nError: ${(error as Error).message}\r\n$ `)
          })
        }
      } else {
        // Empty command, just show prompt
        const windows = BrowserWindow.getAllWindows()
        windows.forEach((win) => {
          win.webContents.send('terminal:data', id, '\r\n$ ')
        })
      }
    } else if (data === '\x7f' || data === '\b') {
      // Backspace
      if (terminal.output.length > 0) {
        terminal.output.pop()
        const windows = BrowserWindow.getAllWindows()
        windows.forEach((win) => {
          win.webContents.send('terminal:data', id, '\b \b')
        })
      }
    } else if (data === '\x03') {
      // Ctrl+C - kill current process
      if (terminal.process) {
        terminal.process.kill('SIGINT')
        terminal.process = null
      }
      terminal.output = []
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        win.webContents.send('terminal:data', id, '^C\r\n$ ')
      })
    } else {
      // Regular character - accumulate and echo
      terminal.output.push(data)
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        win.webContents.send('terminal:data', id, data)
      })
    }
  })

  // Resize terminal (no-op for simplified implementation)
  ipcMain.handle('terminal:resize', (_event, _id: number, _cols: number, _rows: number) => {
    // No-op for simplified terminal
  })

  // Kill terminal
  ipcMain.handle('terminal:kill', (_event, id: number) => {
    const terminal = terminals.get(id)
    if (!terminal) {
      return // Already killed
    }
    if (terminal.process) {
      terminal.process.kill()
    }
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
      pid: terminal.process?.pid || null
    }
  })

  // List all terminals
  ipcMain.handle('terminal:list', () => {
    return Array.from(terminals.values()).map((t) => ({
      id: t.id,
      cwd: t.cwd,
      pid: t.process?.pid || null
    }))
  })

  // Execute command and wait for completion (with cwd support)
  ipcMain.handle('terminal:execute', async (_event, command: string, cwd?: string, timeout = 60000): Promise<{
    stdout: string
    stderr: string
    exitCode: number
  }> => {
    return new Promise((resolve, reject) => {
      const shell = getDefaultShell()
      const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command]
      
      let stdout = ''
      let stderr = ''
      let exitCode = 0

      const timeoutId = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeout/1000}s: ${command}`))
      }, timeout)

      const child = spawn(shell, shellArgs, {
        cwd: cwd || os.homedir(),
        env: process.env as Record<string, string>,
        shell: false
      })

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString()
      })

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString()
      })

      child.on('close', (code) => {
        clearTimeout(timeoutId)
        exitCode = code || 0
        resolve({ stdout, stderr, exitCode })
      })

      child.on('error', (err) => {
        clearTimeout(timeoutId)
        reject(err)
      })
    })
  })
}

/**
 * Cleanup all terminals on app quit
 */
export function cleanupTerminalHandlers(): void {
  for (const terminal of terminals.values()) {
    try {
      if (terminal.process) {
        terminal.process.kill()
      }
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

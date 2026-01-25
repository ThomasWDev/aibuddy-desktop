import { ipcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

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
  return process.env.SHELL || '/bin/zsh'
}

/**
 * Get enhanced environment with common SDK paths
 * This ensures tools like adb, gradle, flutter, etc. are available
 */
function getEnhancedEnvironment(): Record<string, string> {
  const homeDir = os.homedir()
  const env = { ...process.env } as Record<string, string>
  
  // Android SDK
  const androidSdkPaths = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(homeDir, 'Library/Android/sdk'),  // macOS default
    path.join(homeDir, 'Android/Sdk'),           // Linux default
    'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Android\\Sdk'  // Windows
  ]
  
  const androidHome = androidSdkPaths.find(p => p && fs.existsSync(p)) || ''
  if (androidHome) {
    env.ANDROID_HOME = androidHome
    env.ANDROID_SDK_ROOT = androidHome
  }
  
  // Java - prefer Java 17 for modern Android/Gradle compatibility
  const javaPaths = [
    process.env.JAVA_HOME,
    '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home',
    '/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home',
    '/Library/Java/JavaVirtualMachines/adoptopenjdk-17.jdk/Contents/Home',
    '/usr/lib/jvm/java-17-openjdk',
    '/usr/lib/jvm/temurin-17-jdk',
  ]
  
  const javaHome = javaPaths.find(p => p && fs.existsSync(p))
  if (javaHome) {
    env.JAVA_HOME = javaHome
  }
  
  // Flutter
  const flutterPaths = [
    process.env.FLUTTER_HOME,
    path.join(homeDir, 'flutter'),
    path.join(homeDir, 'development/flutter'),
    '/opt/flutter',
  ]
  
  const flutterHome = flutterPaths.find(p => p && fs.existsSync(p))
  if (flutterHome) {
    env.FLUTTER_HOME = flutterHome
  }
  
  // Build enhanced PATH
  const pathParts: string[] = [env.PATH || '']
  
  if (androidHome) {
    pathParts.push(path.join(androidHome, 'platform-tools'))
    pathParts.push(path.join(androidHome, 'emulator'))
    pathParts.push(path.join(androidHome, 'cmdline-tools/latest/bin'))
    pathParts.push(path.join(androidHome, 'tools/bin'))
  }
  
  if (javaHome) {
    pathParts.push(path.join(javaHome, 'bin'))
  }
  
  if (flutterHome) {
    pathParts.push(path.join(flutterHome, 'bin'))
  }
  
  // Common tool paths
  pathParts.push('/usr/local/bin')
  pathParts.push('/opt/homebrew/bin')
  pathParts.push(path.join(homeDir, '.nvm/versions/node/*/bin').replace('*', 'v20.0.0')) // Approximate
  pathParts.push(path.join(homeDir, 'bin'))
  
  env.PATH = pathParts.filter(Boolean).join(path.delimiter)
  
  return env
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
  // Now with enhanced environment and real-time output streaming
  ipcMain.handle('terminal:execute', async (_event, command: string, cwd?: string, timeout = 120000): Promise<{
    stdout: string
    stderr: string
    exitCode: number
  }> => {
    return new Promise((resolve, reject) => {
      const shell = getDefaultShell()
      // Use -l for login shell to load .zshrc/.bashrc, -i for interactive
      const shellArgs = process.platform === 'win32' 
        ? ['/c', command] 
        : ['-l', '-c', command]
      
      let stdout = ''
      let stderr = ''
      let exitCode = 0

      const timeoutId = setTimeout(() => {
        if (child && !child.killed) {
          child.kill('SIGTERM')
        }
        reject(new Error(`Command timed out after ${timeout/1000}s: ${command}`))
      }, timeout)

      // Get enhanced environment with SDK paths
      const enhancedEnv = getEnhancedEnvironment()
      
      console.log('[Terminal] Executing command:', command)
      console.log('[Terminal] Working directory:', cwd || os.homedir())
      console.log('[Terminal] ANDROID_HOME:', enhancedEnv.ANDROID_HOME || 'not set')
      console.log('[Terminal] JAVA_HOME:', enhancedEnv.JAVA_HOME || 'not set')

      const child = spawn(shell, shellArgs, {
        cwd: cwd || os.homedir(),
        env: enhancedEnv,
        shell: false
      })

      // Stream output to all windows in real-time
      const windows = BrowserWindow.getAllWindows()

      child.stdout?.on('data', (chunk) => {
        const text = chunk.toString()
        stdout += text
        // Send real-time output to renderer
        windows.forEach((win) => {
          win.webContents.send('terminal:output', { 
            type: 'stdout', 
            text,
            command 
          })
        })
      })

      child.stderr?.on('data', (chunk) => {
        const text = chunk.toString()
        stderr += text
        // Send real-time output to renderer
        windows.forEach((win) => {
          win.webContents.send('terminal:output', { 
            type: 'stderr', 
            text,
            command 
          })
        })
      })

      child.on('close', (code) => {
        clearTimeout(timeoutId)
        exitCode = code || 0
        console.log('[Terminal] Command completed with exit code:', exitCode)
        
        // Notify renderer that command completed
        windows.forEach((win) => {
          win.webContents.send('terminal:complete', { 
            command,
            exitCode,
            stdout: stdout.substring(0, 5000), // Limit for IPC
            stderr: stderr.substring(0, 2000)
          })
        })
        
        resolve({ stdout, stderr, exitCode })
      })

      child.on('error', (err) => {
        clearTimeout(timeoutId)
        console.error('[Terminal] Command error:', err.message)
        reject(err)
      })
    })
  })
  
  // Execute command with streaming output (for long-running commands)
  ipcMain.handle('terminal:executeStreaming', async (_event, command: string, cwd?: string): Promise<{
    pid: number
  }> => {
    const shell = getDefaultShell()
    const shellArgs = process.platform === 'win32' 
      ? ['/c', command] 
      : ['-l', '-c', command]
    
    const enhancedEnv = getEnhancedEnvironment()
    
    const child = spawn(shell, shellArgs, {
      cwd: cwd || os.homedir(),
      env: enhancedEnv,
      shell: false
    })
    
    const windows = BrowserWindow.getAllWindows()
    
    child.stdout?.on('data', (chunk) => {
      windows.forEach((win) => {
        win.webContents.send('terminal:stream', { 
          pid: child.pid,
          type: 'stdout', 
          text: chunk.toString()
        })
      })
    })
    
    child.stderr?.on('data', (chunk) => {
      windows.forEach((win) => {
        win.webContents.send('terminal:stream', { 
          pid: child.pid,
          type: 'stderr', 
          text: chunk.toString()
        })
      })
    })
    
    child.on('close', (code) => {
      windows.forEach((win) => {
        win.webContents.send('terminal:streamEnd', { 
          pid: child.pid,
          exitCode: code || 0
        })
      })
    })
    
    return { pid: child.pid || 0 }
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

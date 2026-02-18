import { ipcMain } from 'electron'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'

interface DirEntry {
  name: string
  isDirectory: boolean
  isFile: boolean
  path: string
}

interface FileStat {
  isDirectory: boolean
  isFile: boolean
  size: number
  mtime: number
  ctime: number
}

/**
 * Initialize file system IPC handlers
 */
export function initFileSystemHandlers(): void {
  // Remove any previously registered handlers to prevent "second handler" errors on dev reload
  const channels = [
    'fs:readFile', 'fs:readFileAsBase64', 'fs:readFileAsText', 'fs:getFileSize',
    'fs:writeFile', 'fs:readDir', 'fs:stat', 'fs:exists', 'fs:mkdir',
    'fs:rm', 'fs:rename', 'fs:copy', 'fs:watch', 'fs:unwatch', 'fs:readTree',
  ] as const
  for (const ch of channels) { ipcMain.removeHandler(ch) }

  // Read file contents
  // KAN-7 FIX: Don't default to 'utf-8' for binary files (images)
  // When encoding is undefined/null, return raw Buffer for binary compatibility
  ipcMain.handle('fs:readFile', async (_event, filePath: string, encoding?: BufferEncoding | null) => {
    try {
      if (encoding) {
        // Text mode - return string with specified encoding
        const content = await fs.readFile(filePath, encoding)
        return content
      } else {
        // Binary mode - return Buffer (for images, etc.)
        const buffer = await fs.readFile(filePath)
        return buffer
      }
    } catch (error) {
      throw new Error(`Failed to read file: ${(error as Error).message}`)
    }
  })

  // KAN-6/KAN-7/KAN-12 FIX: Read file and return as base64 string
  // This avoids Buffer serialization issues across IPC (Buffer becomes Uint8Array in renderer)
  // The renderer no longer needs Node.js Buffer - everything is returned as a plain string
  ipcMain.handle('fs:readFileAsBase64', async (_event, filePath: string) => {
    try {
      const buffer = await fs.readFile(filePath)
      return buffer.toString('base64')
    } catch (error) {
      throw new Error(`Failed to read file as base64: ${(error as Error).message}`)
    }
  })

  // KAN-6/KAN-12 FIX: Read file and return as UTF-8 text string
  // For code files - avoids Buffer in renderer
  ipcMain.handle('fs:readFileAsText', async (_event, filePath: string, encoding: BufferEncoding = 'utf-8') => {
    try {
      return await fs.readFile(filePath, encoding)
    } catch (error) {
      throw new Error(`Failed to read file as text: ${(error as Error).message}`)
    }
  })

  // KAN-6 FIX: Get file size without needing Buffer in renderer
  ipcMain.handle('fs:getFileSize', async (_event, filePath: string) => {
    try {
      const stats = await fs.stat(filePath)
      return stats.size
    } catch (error) {
      throw new Error(`Failed to get file size: ${(error as Error).message}`)
    }
  })

  // Write file contents
  ipcMain.handle('fs:writeFile', async (_event, filePath: string, data: string | Buffer) => {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(filePath, data, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to write file: ${(error as Error).message}`)
    }
  })

  // Read directory contents
  ipcMain.handle('fs:readDir', async (_event, dirPath: string): Promise<DirEntry[]> => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      return entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        path: path.join(dirPath, entry.name)
      }))
    } catch (error) {
      throw new Error(`Failed to read directory: ${(error as Error).message}`)
    }
  })

  // Get file/directory stats
  ipcMain.handle('fs:stat', async (_event, filePath: string): Promise<FileStat> => {
    try {
      const stats = await fs.stat(filePath)
      return {
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        size: stats.size,
        mtime: stats.mtimeMs,
        ctime: stats.ctimeMs
      }
    } catch (error) {
      throw new Error(`Failed to get stats: ${(error as Error).message}`)
    }
  })

  // Check if file/directory exists
  ipcMain.handle('fs:exists', async (_event, filePath: string): Promise<boolean> => {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  })

  // Create directory
  ipcMain.handle('fs:mkdir', async (_event, dirPath: string, recursive = true) => {
    try {
      await fs.mkdir(dirPath, { recursive })
    } catch (error) {
      throw new Error(`Failed to create directory: ${(error as Error).message}`)
    }
  })

  // Remove file or directory
  ipcMain.handle('fs:rm', async (_event, targetPath: string, recursive = false) => {
    try {
      await fs.rm(targetPath, { recursive, force: true })
    } catch (error) {
      throw new Error(`Failed to remove: ${(error as Error).message}`)
    }
  })

  // Rename file or directory
  ipcMain.handle('fs:rename', async (_event, oldPath: string, newPath: string) => {
    try {
      await fs.rename(oldPath, newPath)
    } catch (error) {
      throw new Error(`Failed to rename: ${(error as Error).message}`)
    }
  })

  // Copy file
  ipcMain.handle('fs:copy', async (_event, src: string, dest: string) => {
    try {
      await fs.copyFile(src, dest)
    } catch (error) {
      throw new Error(`Failed to copy: ${(error as Error).message}`)
    }
  })

  // Watch directory for changes
  ipcMain.handle('fs:watch', (_event, dirPath: string) => {
    // Return a watcher ID that can be used to stop watching
    const watcherId = Date.now().toString()
    
    try {
      const watcher = fsSync.watch(dirPath, { recursive: true }, (eventType, filename) => {
        _event.sender.send('fs:change', {
          watcherId,
          eventType,
          filename,
          path: filename ? path.join(dirPath, filename) : dirPath
        })
      })

      // Store watcher for cleanup
      watchers.set(watcherId, watcher)
      return watcherId
    } catch (error) {
      throw new Error(`Failed to watch directory: ${(error as Error).message}`)
    }
  })

  // Stop watching directory
  ipcMain.handle('fs:unwatch', (_event, watcherId: string) => {
    const watcher = watchers.get(watcherId)
    if (watcher) {
      watcher.close()
      watchers.delete(watcherId)
    }
  })

  // Read directory tree recursively (for file explorer)
  ipcMain.handle('fs:readTree', async (_event, dirPath: string, depth = 3): Promise<TreeNode[]> => {
    return readTreeRecursive(dirPath, depth, 0)
  })
}

// Store active watchers
const watchers = new Map<string, fsSync.FSWatcher>()

interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  children?: TreeNode[]
}

async function readTreeRecursive(dirPath: string, maxDepth: number, currentDepth: number): Promise<TreeNode[]> {
  if (currentDepth >= maxDepth) {
    return []
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const nodes: TreeNode[] = []

    // Sort: directories first, then files, alphabetically
    const sorted = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

    // Filter out hidden files and common ignored directories
    const filtered = sorted.filter((entry) => {
      if (entry.name.startsWith('.')) return false
      if (['node_modules', 'dist', 'build', '__pycache__', '.git'].includes(entry.name)) return false
      return true
    })

    for (const entry of filtered) {
      const fullPath = path.join(dirPath, entry.name)
      const node: TreeNode = {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      }

      if (entry.isDirectory()) {
        node.children = await readTreeRecursive(fullPath, maxDepth, currentDepth + 1)
      }

      nodes.push(node)
    }

    return nodes
  } catch (error) {
    console.error(`Error reading tree at ${dirPath}:`, error)
    return []
  }
}

// Cleanup watchers on app quit
export function cleanupFileSystemHandlers(): void {
  for (const watcher of watchers.values()) {
    watcher.close()
  }
  watchers.clear()
}


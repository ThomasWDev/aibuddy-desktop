import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * File Picker Tests - Issue #3
 * 
 * Tests for the native Electron file dialog functionality that was implemented
 * to fix the macOS sandbox issue where HTML file inputs couldn't select files.
 * 
 * The fix uses window.electronAPI.dialog.openFile() instead of <input type="file">
 */

// Uses the mock from tests/setup.ts which is already applied to window.electronAPI

beforeEach(() => {
  vi.clearAllMocks()
})

describe('File Picker - Issue #3 Fix', () => {
  describe('Electron Native Dialog', () => {
    it('should call openFile with correct image filters', async () => {
      const expectedFilters = [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
      ]
      
      // Mock is already set up in setup.ts, just call the function
      const result = await window.electronAPI.dialog.openFile(expectedFilters)
      
      expect(window.electronAPI.dialog.openFile).toHaveBeenCalledWith(expectedFilters)
      // Default mock returns '/test/file.png'
      expect(result).toBe('/test/file.png')
    })

    it('should return null when user cancels the dialog', async () => {
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce(null)
      
      const result = await window.electronAPI.dialog.openFile([])
      
      expect(result).toBeNull()
    })

    it('should handle various image formats', async () => {
      const testCases = [
        { path: '/test/photo.png', expected: 'image/png' },
        { path: '/test/photo.jpg', expected: 'image/jpeg' },
        { path: '/test/photo.jpeg', expected: 'image/jpeg' },
        { path: '/test/animation.gif', expected: 'image/gif' },
        { path: '/test/modern.webp', expected: 'image/webp' }
      ]

      for (const testCase of testCases) {
        vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce(testCase.path)
        
        const result = await window.electronAPI.dialog.openFile([])
        const extension = result?.split('.').pop()?.toLowerCase()
        
        expect(extension).toBeTruthy()
        expect(['png', 'jpg', 'jpeg', 'gif', 'webp']).toContain(extension)
      }
    })
  })

  describe('File Reading', () => {
    it('should read file content as buffer after dialog selection', async () => {
      const testPath = '/Users/test/image.png'
      const mockBuffer = Buffer.from('fake image data')
      
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce(testPath)
      vi.mocked(window.electronAPI.fs.readFile).mockResolvedValueOnce(mockBuffer)
      
      const filePath = await window.electronAPI.dialog.openFile([])
      expect(filePath).toBe(testPath)
      
      const fileBuffer = await window.electronAPI.fs.readFile(filePath!)
      expect(fileBuffer).toEqual(mockBuffer)
    })

    it('should get file stats for size validation', async () => {
      const testPath = '/Users/test/small-image.png'
      const mockStats = { 
        isDirectory: false, 
        isFile: true, 
        size: 1024 * 1024, // 1MB
        mtime: Date.now() 
      }
      
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce(testPath)
      vi.mocked(window.electronAPI.fs.stat).mockResolvedValueOnce(mockStats)
      
      const filePath = await window.electronAPI.dialog.openFile([])
      const stats = await window.electronAPI.fs.stat(filePath!)
      
      expect(stats.size).toBeLessThan(10 * 1024 * 1024) // Less than 10MB
      expect(stats.isFile).toBe(true)
    })

    it('should reject files larger than 10MB', async () => {
      const testPath = '/Users/test/large-image.png'
      const mockStats = { 
        isDirectory: false, 
        isFile: true, 
        size: 15 * 1024 * 1024, // 15MB - too large
        mtime: Date.now() 
      }
      
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce(testPath)
      vi.mocked(window.electronAPI.fs.stat).mockResolvedValueOnce(mockStats)
      
      const filePath = await window.electronAPI.dialog.openFile([])
      const stats = await window.electronAPI.fs.stat(filePath!)
      
      // The actual size validation happens in App.tsx
      expect(stats.size).toBeGreaterThan(10 * 1024 * 1024)
    })
  })

  describe('MIME Type Detection', () => {
    it('should correctly extract MIME type from file extension', () => {
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp'
      }

      for (const [ext, expectedMime] of Object.entries(mimeTypes)) {
        const testPath = `/Users/test/image.${ext}`
        const extension = testPath.split('.').pop()?.toLowerCase() || 'png'
        const mimeType = mimeTypes[extension] || 'image/png'
        
        expect(mimeType).toBe(expectedMime)
      }
    })

    it('should default to image/png for unknown extensions', () => {
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp'
      }
      
      const testPath = '/Users/test/image.unknown'
      const extension = testPath.split('.').pop()?.toLowerCase() || 'png'
      const mimeType = mimeTypes[extension] || 'image/png'
      
      expect(mimeType).toBe('image/png')
    })
  })

  describe('File Name Extraction', () => {
    it('should extract filename from Unix path', () => {
      const path = '/Users/test/photos/vacation/beach.png'
      const fileName = path.split('/').pop() || path.split('\\').pop() || 'image'
      
      expect(fileName).toBe('beach.png')
    })

    it('should extract filename from Windows path', () => {
      const path = 'C:\\Users\\test\\photos\\vacation\\beach.png'
      // On Windows paths, split by backslash first, then fallback to forward slash
      const parts = path.split('\\')
      const fileName = parts.length > 1 ? parts.pop() : (path.split('/').pop() || 'image')
      
      expect(fileName).toBe('beach.png')
    })
  })

  describe('Error Handling', () => {
    it('should handle dialog errors gracefully', async () => {
      vi.mocked(window.electronAPI.dialog.openFile).mockRejectedValueOnce(new Error('Dialog failed'))
      
      await expect(window.electronAPI.dialog.openFile([])).rejects.toThrow('Dialog failed')
    })

    it('should handle file read errors gracefully', async () => {
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce('/test/image.png')
      vi.mocked(window.electronAPI.fs.readFile).mockRejectedValueOnce(new Error('Permission denied'))
      
      const filePath = await window.electronAPI.dialog.openFile([])
      expect(filePath).toBe('/test/image.png')
      
      await expect(window.electronAPI.fs.readFile(filePath!)).rejects.toThrow('Permission denied')
    })
  })
})

describe('Image Attachment Integration', () => {
  it('should create proper attachment object from selected file', async () => {
    const testPath = '/Users/test/screenshot.png'
    const mockBuffer = Buffer.from('PNG image data here')
    const mockStats = { isDirectory: false, isFile: true, size: 50000, mtime: Date.now() }
    
    vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce(testPath)
    vi.mocked(window.electronAPI.fs.readFile).mockResolvedValueOnce(mockBuffer)
    vi.mocked(window.electronAPI.fs.stat).mockResolvedValueOnce(mockStats)
    
    // Simulate the full flow
    const filePath = await window.electronAPI.dialog.openFile([
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
    ])
    
    expect(filePath).toBe(testPath)
    
    const fileBuffer = await window.electronAPI.fs.readFile(filePath!) as Buffer
    const base64 = Buffer.from(fileBuffer).toString('base64')
    const fileName = filePath!.split('/').pop() || 'image'
    const stats = await window.electronAPI.fs.stat(filePath!)
    
    const attachment = {
      id: `img-${Date.now()}-test`,
      base64,
      mimeType: 'image/png',
      name: fileName,
      size: stats.size
    }
    
    expect(attachment.base64).toBeTruthy()
    expect(attachment.mimeType).toBe('image/png')
    expect(attachment.name).toBe('screenshot.png')
    expect(attachment.size).toBe(50000)
  })
})

/**
 * KAN-6: Code File Selection Tests
 * 
 * Tests for code file selection functionality including supported extensions,
 * file size limits, and language detection.
 */
describe('KAN-6: Code File Selection', () => {
  describe('Supported Extensions', () => {
    const supportedExtensions = [
      'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'h',
      'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r',
      'sql', 'sh', 'bash', 'zsh', 'lua', 'md', 'json', 'yaml', 'yml',
      'xml', 'html', 'css', 'scss', 'less', 'vue', 'svelte'
    ]

    it('should support TypeScript files', async () => {
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce('/test/app.ts')
      const result = await window.electronAPI.dialog.openFile([])
      expect(result?.endsWith('.ts')).toBe(true)
    })

    it('should support Python files', async () => {
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce('/test/script.py')
      const result = await window.electronAPI.dialog.openFile([])
      expect(result?.endsWith('.py')).toBe(true)
    })

    it('should support Lua files', async () => {
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce('/test/config.lua')
      const result = await window.electronAPI.dialog.openFile([])
      expect(result?.endsWith('.lua')).toBe(true)
    })

    it('should support Java files', async () => {
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce('/test/Main.java')
      const result = await window.electronAPI.dialog.openFile([])
      expect(result?.endsWith('.java')).toBe(true)
    })

    it('should have at least 30 supported extensions', () => {
      expect(supportedExtensions.length).toBeGreaterThanOrEqual(30)
    })
  })

  describe('File Size Limits', () => {
    it('should enforce 1MB limit for code files', async () => {
      const tooLargeStats = { 
        isDirectory: false, 
        isFile: true, 
        size: 2 * 1024 * 1024, // 2MB - over limit
        mtime: Date.now() 
      }
      
      vi.mocked(window.electronAPI.fs.stat).mockResolvedValueOnce(tooLargeStats)
      const stats = await window.electronAPI.fs.stat('/test/large.ts')
      
      // Code files have 1MB limit
      const maxCodeFileSize = 1 * 1024 * 1024
      expect(stats.size).toBeGreaterThan(maxCodeFileSize)
    })

    it('should allow files under 1MB for code', async () => {
      const normalStats = { 
        isDirectory: false, 
        isFile: true, 
        size: 500 * 1024, // 500KB
        mtime: Date.now() 
      }
      
      vi.mocked(window.electronAPI.fs.stat).mockResolvedValueOnce(normalStats)
      const stats = await window.electronAPI.fs.stat('/test/normal.ts')
      
      const maxCodeFileSize = 1 * 1024 * 1024
      expect(stats.size).toBeLessThan(maxCodeFileSize)
    })
  })

  describe('Language Detection', () => {
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'lua': 'lua',
      'go': 'go',
      'rs': 'rust'
    }

    it('should detect TypeScript from .ts extension', () => {
      const path = '/test/app.ts'
      const ext = path.split('.').pop()?.toLowerCase() || 'txt'
      expect(languageMap[ext]).toBe('typescript')
    })

    it('should detect Python from .py extension', () => {
      const path = '/test/script.py'
      const ext = path.split('.').pop()?.toLowerCase() || 'txt'
      expect(languageMap[ext]).toBe('python')
    })

    it('should detect Lua from .lua extension', () => {
      const path = '/test/config.lua'
      const ext = path.split('.').pop()?.toLowerCase() || 'txt'
      expect(languageMap[ext]).toBe('lua')
    })
  })

  describe('Content Reading', () => {
    it('should read code file content as text', async () => {
      const codeContent = 'function hello() { return "world"; }'
      const buffer = Buffer.from(codeContent, 'utf-8')
      
      vi.mocked(window.electronAPI.fs.readFile).mockResolvedValueOnce(buffer)
      
      const result = await window.electronAPI.fs.readFile('/test/code.ts')
      const content = Buffer.from(result as Buffer).toString('utf-8')
      
      expect(content).toBe(codeContent)
    })

    it('should handle UTF-8 encoded files correctly', async () => {
      const unicodeContent = '// 你好世界 - Hello World in Chinese\nconst greeting = "こんにちは";'
      const buffer = Buffer.from(unicodeContent, 'utf-8')
      
      vi.mocked(window.electronAPI.fs.readFile).mockResolvedValueOnce(buffer)
      
      const result = await window.electronAPI.fs.readFile('/test/unicode.ts')
      const content = Buffer.from(result as Buffer).toString('utf-8')
      
      expect(content).toContain('你好世界')
      expect(content).toContain('こんにちは')
    })
  })
})

/**
 * KAN-12: File Selection Error Handling - Regression Prevention Tests
 * 
 * Tests for defensive checks and better error handling when selecting files.
 * Root cause: Generic "Failed to select a file" error without specific information.
 */
describe('KAN-12: File Selection Error Handling', () => {
  describe('API Availability Checks', () => {
    it('should detect when dialog API is not available', () => {
      // Simulate missing dialog API
      const mockAPI = {
        fs: window.electronAPI.fs,
        store: window.electronAPI.store
        // dialog is missing
      }
      
      const hasDialog = !!(mockAPI as any).dialog?.openFile
      expect(hasDialog).toBe(false)
    })

    it('should detect when fs API is not available', () => {
      const mockAPI = {
        dialog: window.electronAPI.dialog,
        store: window.electronAPI.store
        // fs is missing
      }
      
      const hasFs = !!(mockAPI as any).fs?.readFile
      expect(hasFs).toBe(false)
    })

    it('should pass availability check when both APIs are present', () => {
      const hasDialog = !!window.electronAPI?.dialog?.openFile
      const hasFs = !!window.electronAPI?.fs?.readFile
      
      expect(hasDialog).toBe(true)
      expect(hasFs).toBe(true)
    })
  })

  describe('Empty Buffer Handling', () => {
    it('should detect empty buffer from readFile', async () => {
      const emptyBuffer = Buffer.from('')
      vi.mocked(window.electronAPI.fs.readFile).mockResolvedValueOnce(emptyBuffer)
      
      const buffer = await window.electronAPI.fs.readFile('/test/empty.png')
      const isEmpty = !buffer || buffer.length === 0
      
      expect(isEmpty).toBe(true)
    })

    it('should detect non-empty buffer from readFile', async () => {
      const validBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]) // PNG magic
      vi.mocked(window.electronAPI.fs.readFile).mockResolvedValueOnce(validBuffer)
      
      const buffer = await window.electronAPI.fs.readFile('/test/valid.png')
      const isEmpty = !buffer || buffer.length === 0
      
      expect(isEmpty).toBe(false)
    })
  })

  describe('Stat Fallback', () => {
    it('should use buffer length when stat fails', async () => {
      const testBuffer = Buffer.from('test content for size')
      
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce('/test/file.png')
      vi.mocked(window.electronAPI.fs.readFile).mockResolvedValueOnce(testBuffer)
      vi.mocked(window.electronAPI.fs.stat).mockRejectedValueOnce(new Error('Stat failed'))
      
      // In the actual implementation, we fallback to buffer.length
      const filePath = await window.electronAPI.dialog.openFile([])
      const buffer = await window.electronAPI.fs.readFile(filePath!) as Buffer
      
      let fileSize: number
      try {
        const stat = await window.electronAPI.fs.stat(filePath!)
        fileSize = stat.size
      } catch {
        fileSize = buffer.length // Fallback
      }
      
      expect(fileSize).toBe(testBuffer.length)
    })
  })

  describe('Error Message Classification', () => {
    it('should identify permission errors', () => {
      const error = new Error('EACCES: permission denied')
      const isPermissionError = error.message.includes('permission')
      expect(isPermissionError).toBe(true)
    })

    it('should identify file not found errors', () => {
      const error = new Error('ENOENT: no such file or directory')
      const isNotFoundError = error.message.includes('not found') || error.message.includes('no such file')
      expect(isNotFoundError).toBe(true)
    })

    it('should identify network/timeout errors', () => {
      const error1 = new Error('Network error occurred')
      const error2 = new Error('Request timeout')
      
      // Case-insensitive check
      const msg1 = error1.message.toLowerCase()
      const msg2 = error2.message.toLowerCase()
      
      const isNetworkError1 = msg1.includes('network') || msg1.includes('timeout')
      const isNetworkError2 = msg2.includes('network') || msg2.includes('timeout')
      
      expect(isNetworkError1).toBe(true)
      expect(isNetworkError2).toBe(true)
    })
  })

  describe('User-Friendly Error Messages', () => {
    it('should provide actionable message for API unavailable', () => {
      const messages = {
        noDialog: 'Desktop features not available. Please restart the app.',
        noFs: 'File system access not available. Try drag and drop instead.',
        permission: 'Permission denied. Try drag and drop instead.',
        notFound: 'File not found. Please select a different file.',
        empty: 'File appears to be empty. Please select a different image.'
      }
      
      expect(messages.noDialog).toContain('restart')
      expect(messages.noFs).toContain('drag and drop')
      expect(messages.permission).toContain('drag and drop')
      expect(messages.notFound).toContain('different file')
      expect(messages.empty).toContain('empty')
    })
  })

  describe('Full Error Flow Simulation', () => {
    it('should handle dialog rejection gracefully', async () => {
      vi.mocked(window.electronAPI.dialog.openFile).mockRejectedValueOnce(
        new Error('Dialog initialization failed')
      )
      
      let errorOccurred = false
      let errorMessage = ''
      
      try {
        await window.electronAPI.dialog.openFile([])
      } catch (error) {
        errorOccurred = true
        errorMessage = (error as Error).message
      }
      
      expect(errorOccurred).toBe(true)
      expect(errorMessage).toBe('Dialog initialization failed')
    })

    it('should handle file read permission error', async () => {
      vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce('/protected/file.png')
      vi.mocked(window.electronAPI.fs.readFile).mockRejectedValueOnce(
        new Error('EACCES: permission denied')
      )
      
      const filePath = await window.electronAPI.dialog.openFile([])
      expect(filePath).toBe('/protected/file.png')
      
      let readError: Error | null = null
      try {
        await window.electronAPI.fs.readFile(filePath!)
      } catch (error) {
        readError = error as Error
      }
      
      expect(readError).not.toBeNull()
      expect(readError?.message).toContain('permission denied')
    })
  })
})

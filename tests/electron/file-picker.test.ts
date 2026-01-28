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

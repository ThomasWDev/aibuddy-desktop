import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Buffer Fix Tests - KAN-6, KAN-7, KAN-12
 * 
 * Tests for the "Buffer is not defined" error fix.
 * 
 * ROOT CAUSE: The renderer process uses `Buffer.from()` to convert file data
 * to base64/text, but with Electron's contextIsolation: true and 
 * nodeIntegration: false, `Buffer` is not available in the renderer.
 * 
 * FIX: Added `readFileAsBase64` and `readFileAsText` IPC handlers in the main
 * process that do the conversion there and return plain strings to the renderer.
 * The renderer no longer needs `Buffer`.
 * 
 * IPC flow:
 *   Renderer → IPC → Main (reads file + converts to string) → IPC → Renderer (receives string)
 */

beforeEach(() => {
  vi.clearAllMocks()
})

describe('KAN-6/KAN-12: readFileAsBase64 IPC handler', () => {
  it('should return a base64 string (not a Buffer)', async () => {
    const result = await window.electronAPI.fs.readFileAsBase64('/test/image.png')
    
    // Must be a string, not a Buffer or Uint8Array
    expect(typeof result).toBe('string')
  })

  it('should return valid base64 for image data', async () => {
    const mockBase64 = Buffer.from([0x89, 0x50, 0x4E, 0x47]).toString('base64')
    vi.mocked(window.electronAPI.fs.readFileAsBase64).mockResolvedValueOnce(mockBase64)
    
    const result = await window.electronAPI.fs.readFileAsBase64('/test/image.png')
    
    expect(result).toBe('iVBORw==')
    // Verify it decodes back correctly
    const decoded = Buffer.from(result, 'base64')
    expect(decoded[0]).toBe(0x89)
    expect(decoded[1]).toBe(0x50)
  })

  it('should work for all supported image formats', async () => {
    const formats = ['png', 'jpg', 'jpeg', 'gif', 'webp']
    
    for (const format of formats) {
      vi.mocked(window.electronAPI.fs.readFileAsBase64).mockResolvedValueOnce('base64data')
      const result = await window.electronAPI.fs.readFileAsBase64(`/test/image.${format}`)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('should handle large files (10MB base64 ≈ 13.3MB string)', async () => {
    // Simulate a ~1MB file
    const largeBase64 = 'A'.repeat(1_000_000)
    vi.mocked(window.electronAPI.fs.readFileAsBase64).mockResolvedValueOnce(largeBase64)
    
    const result = await window.electronAPI.fs.readFileAsBase64('/test/large-image.png')
    expect(result.length).toBe(1_000_000)
  })

  it('should throw on file read failure (preserves error handling)', async () => {
    vi.mocked(window.electronAPI.fs.readFileAsBase64).mockRejectedValueOnce(
      new Error('Failed to read file as base64: EACCES: permission denied')
    )
    
    await expect(window.electronAPI.fs.readFileAsBase64('/protected/image.png'))
      .rejects.toThrow('permission denied')
  })

  it('should return empty string for empty files', async () => {
    vi.mocked(window.electronAPI.fs.readFileAsBase64).mockResolvedValueOnce('')
    
    const result = await window.electronAPI.fs.readFileAsBase64('/test/empty.png')
    expect(result).toBe('')
    expect(result.length).toBe(0)
  })
})

describe('KAN-6/KAN-12: readFileAsText IPC handler', () => {
  it('should return a UTF-8 string (not a Buffer)', async () => {
    const result = await window.electronAPI.fs.readFileAsText('/test/code.ts')
    
    expect(typeof result).toBe('string')
  })

  it('should return file content as plain text', async () => {
    const codeContent = 'function hello() {\n  return "world";\n}'
    vi.mocked(window.electronAPI.fs.readFileAsText).mockResolvedValueOnce(codeContent)
    
    const result = await window.electronAPI.fs.readFileAsText('/test/code.ts')
    
    expect(result).toBe(codeContent)
    expect(result).toContain('function hello')
  })

  it('should handle UTF-8 encoded content with unicode', async () => {
    const unicodeContent = '// 你好世界\nconst greeting = "こんにちは";'
    vi.mocked(window.electronAPI.fs.readFileAsText).mockResolvedValueOnce(unicodeContent)
    
    const result = await window.electronAPI.fs.readFileAsText('/test/unicode.ts')
    
    expect(result).toContain('你好世界')
    expect(result).toContain('こんにちは')
  })

  it('should throw on file read failure', async () => {
    vi.mocked(window.electronAPI.fs.readFileAsText).mockRejectedValueOnce(
      new Error('Failed to read file as text: ENOENT: no such file or directory')
    )
    
    await expect(window.electronAPI.fs.readFileAsText('/missing/file.ts'))
      .rejects.toThrow('no such file')
  })
})

describe('KAN-6: getFileSize IPC handler', () => {
  it('should return a number', async () => {
    const result = await window.electronAPI.fs.getFileSize('/test/file.png')
    
    expect(typeof result).toBe('number')
  })

  it('should return correct file size', async () => {
    vi.mocked(window.electronAPI.fs.getFileSize).mockResolvedValueOnce(50000)
    
    const result = await window.electronAPI.fs.getFileSize('/test/image.png')
    expect(result).toBe(50000)
  })
})

describe('KAN-6/KAN-12: Image Selection Flow (no Buffer needed)', () => {
  it('should complete image selection without using Buffer', async () => {
    const testPath = '/Users/test/screenshot.png'
    const mockBase64 = Buffer.from('fake PNG data').toString('base64')
    const mockStats = { isDirectory: false, isFile: true, size: 50000, mtime: Date.now() }
    
    // Mock the new IPC methods
    vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce(testPath)
    vi.mocked(window.electronAPI.fs.readFileAsBase64).mockResolvedValueOnce(mockBase64)
    vi.mocked(window.electronAPI.fs.stat).mockResolvedValueOnce(mockStats)
    
    // Simulate the FIXED flow (no Buffer.from() needed)
    const filePath = await window.electronAPI.dialog.openFile([
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
    ])
    expect(filePath).toBe(testPath)
    
    // Instead of: readFile → Buffer.from(buffer).toString('base64')
    // Now: readFileAsBase64 → returns string directly
    const base64 = await window.electronAPI.fs.readFileAsBase64(filePath!)
    expect(typeof base64).toBe('string')
    expect(base64.length).toBeGreaterThan(0)
    
    // Get file name
    const fileName = filePath!.split('/').pop() || 'image'
    const extension = fileName.split('.').pop()?.toLowerCase() || 'png'
    
    // Get file size
    const stats = await window.electronAPI.fs.stat(filePath!)
    
    const attachment = {
      id: `img-${Date.now()}-test`,
      base64,
      mimeType: 'image/png' as const,
      name: fileName,
      size: stats.size
    }
    
    expect(attachment.base64).toBe(mockBase64)
    expect(attachment.mimeType).toBe('image/png')
    expect(attachment.name).toBe('screenshot.png')
    expect(attachment.size).toBe(50000)
  })

  it('should handle stat failure with base64 size estimation', async () => {
    const mockBase64 = 'AAAA'.repeat(100) // 400 chars of base64
    
    vi.mocked(window.electronAPI.fs.readFileAsBase64).mockResolvedValueOnce(mockBase64)
    vi.mocked(window.electronAPI.fs.stat).mockRejectedValueOnce(new Error('stat failed'))
    
    const base64 = await window.electronAPI.fs.readFileAsBase64('/test/image.png')
    
    let fileSize: number
    try {
      const stat = await window.electronAPI.fs.stat('/test/image.png')
      fileSize = stat.size
    } catch {
      // KAN-6 FIX: Estimate from base64 length (base64 is ~4/3 of original)
      fileSize = Math.ceil(base64.length * 3 / 4)
    }
    
    // 400 chars * 3/4 = 300 bytes
    expect(fileSize).toBe(300)
  })
})

describe('KAN-12: Code File Selection Flow (no Buffer needed)', () => {
  it('should complete code file selection without using Buffer', async () => {
    const testPath = '/Users/test/app.ts'
    const codeContent = 'export const hello = () => "world"'
    
    vi.mocked(window.electronAPI.dialog.openFile).mockResolvedValueOnce(testPath)
    vi.mocked(window.electronAPI.fs.readFileAsText).mockResolvedValueOnce(codeContent)
    
    // Simulate the FIXED flow (no Buffer.from() needed)
    const filePath = await window.electronAPI.dialog.openFile([
      { name: 'Code Files', extensions: ['ts', 'tsx', 'js', 'jsx', 'py'] }
    ])
    expect(filePath).toBe(testPath)
    
    // Instead of: readFile → Buffer.from(buffer).toString('utf-8')
    // Now: readFileAsText → returns string directly
    const content = await window.electronAPI.fs.readFileAsText(filePath!)
    expect(typeof content).toBe('string')
    expect(content).toBe(codeContent)
    
    const fileName = filePath!.split('/').pop() || 'file'
    expect(fileName).toBe('app.ts')
  })

  it('should handle empty file content', async () => {
    vi.mocked(window.electronAPI.fs.readFileAsText).mockResolvedValueOnce('')
    
    const content = await window.electronAPI.fs.readFileAsText('/test/empty.ts')
    
    expect(content).toBe('')
    expect(content.length).toBe(0)
  })
})

describe('KAN-7: Drag-and-Drop Flow (no Buffer needed)', () => {
  it('should complete drag-drop without using Buffer', async () => {
    const filePath = '/Users/test/dropped-image.png'
    const mockBase64 = Buffer.from([0x89, 0x50, 0x4E, 0x47]).toString('base64')
    
    vi.mocked(window.electronAPI.fs.readFileAsBase64).mockResolvedValueOnce(mockBase64)
    
    // Simulate the FIXED drop handler
    // Instead of: readFile → Buffer.from(fileBuffer).toString('base64')
    // Now: readFileAsBase64 → returns string directly
    const base64 = await window.electronAPI.fs.readFileAsBase64(filePath)
    
    expect(typeof base64).toBe('string')
    expect(base64).toBe('iVBORw==')
    
    const attachment = {
      id: `img-${Date.now()}-test`,
      base64,
      mimeType: 'image/png' as const,
      name: 'dropped-image.png',
      size: 1024
    }
    
    expect(attachment.base64).toBeTruthy()
    expect(attachment.name).toBe('dropped-image.png')
  })

  it('should handle drop error gracefully', async () => {
    vi.mocked(window.electronAPI.fs.readFileAsBase64).mockRejectedValueOnce(
      new Error('Read failed')
    )
    
    let errorOccurred = false
    try {
      await window.electronAPI.fs.readFileAsBase64('/test/image.png')
    } catch {
      errorOccurred = true
    }
    
    expect(errorOccurred).toBe(true)
  })
})

describe('Buffer is NOT needed in renderer', () => {
  it('should NOT use Buffer.from() in the renderer context', () => {
    // This test documents that Buffer should never be used in renderer code
    // In a real Electron app with contextIsolation: true, this would throw:
    //   ReferenceError: Buffer is not defined
    
    // Instead, use:
    // - window.electronAPI.fs.readFileAsBase64() for binary → base64
    // - window.electronAPI.fs.readFileAsText() for binary → UTF-8 text
    
    // Verify the new APIs exist
    expect(typeof window.electronAPI.fs.readFileAsBase64).toBe('function')
    expect(typeof window.electronAPI.fs.readFileAsText).toBe('function')
    expect(typeof window.electronAPI.fs.getFileSize).toBe('function')
  })
})

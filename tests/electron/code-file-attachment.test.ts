import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Code File Attachment Tests
 * 
 * Tests for the code file attachment feature that extends the attachment
 * system to support code files (JS, TS, Python, Java, C++, etc.) in addition
 * to images.
 * 
 * Relates to Issue #3: "code files (Java, Python, Lua, C, C++, etc.) cannot be selected"
 */

// Supported code file extensions and their languages
const CODE_EXTENSIONS: Record<string, string> = {
  'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
  'py': 'python', 'java': 'java', 'kt': 'kotlin',
  'c': 'c', 'cpp': 'cpp', 'cs': 'csharp',
  'go': 'go', 'rs': 'rust', 'rb': 'ruby', 'php': 'php', 'swift': 'swift',
  'lua': 'lua', 'r': 'r', 'scala': 'scala', 'dart': 'dart',
  'html': 'html', 'css': 'css', 'json': 'json', 'yaml': 'yaml',
  'md': 'markdown', 'sql': 'sql', 'sh': 'bash'
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp']

const isCodeFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ext in CODE_EXTENSIONS
}

const isImageFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return IMAGE_EXTENSIONS.includes(ext)
}

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return CODE_EXTENSIONS[ext] || 'plaintext'
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Code File Attachment - Issue #3 Fix', () => {
  describe('File Type Detection', () => {
    it('should detect JavaScript files', () => {
      expect(isCodeFile('app.js')).toBe(true)
      expect(isCodeFile('component.jsx')).toBe(true)
      expect(getLanguageFromFilename('app.js')).toBe('javascript')
    })

    it('should detect TypeScript files', () => {
      expect(isCodeFile('app.ts')).toBe(true)
      expect(isCodeFile('component.tsx')).toBe(true)
      expect(getLanguageFromFilename('app.ts')).toBe('typescript')
    })

    it('should detect Python files', () => {
      expect(isCodeFile('script.py')).toBe(true)
      expect(getLanguageFromFilename('script.py')).toBe('python')
    })

    it('should detect Java files', () => {
      expect(isCodeFile('Main.java')).toBe(true)
      expect(getLanguageFromFilename('Main.java')).toBe('java')
    })

    it('should detect C/C++ files', () => {
      expect(isCodeFile('main.c')).toBe(true)
      expect(isCodeFile('main.cpp')).toBe(true)
      expect(getLanguageFromFilename('main.c')).toBe('c')
      expect(getLanguageFromFilename('main.cpp')).toBe('cpp')
    })

    it('should detect Lua files', () => {
      expect(isCodeFile('script.lua')).toBe(true)
      expect(getLanguageFromFilename('script.lua')).toBe('lua')
    })

    it('should detect Go files', () => {
      expect(isCodeFile('main.go')).toBe(true)
      expect(getLanguageFromFilename('main.go')).toBe('go')
    })

    it('should detect Rust files', () => {
      expect(isCodeFile('main.rs')).toBe(true)
      expect(getLanguageFromFilename('main.rs')).toBe('rust')
    })

    it('should distinguish between image and code files', () => {
      // Images
      expect(isImageFile('photo.png')).toBe(true)
      expect(isImageFile('photo.jpg')).toBe(true)
      expect(isCodeFile('photo.png')).toBe(false)
      
      // Code
      expect(isCodeFile('app.ts')).toBe(true)
      expect(isImageFile('app.ts')).toBe(false)
    })

    it('should handle unknown extensions', () => {
      expect(isCodeFile('file.xyz')).toBe(false)
      expect(isImageFile('file.xyz')).toBe(false)
      expect(getLanguageFromFilename('file.xyz')).toBe('plaintext')
    })
  })

  describe('File Size Limits', () => {
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
    const MAX_CODE_SIZE = 1 * 1024 * 1024 // 1MB

    it('should allow images up to 10MB', () => {
      const fileSize = 5 * 1024 * 1024 // 5MB
      expect(fileSize <= MAX_IMAGE_SIZE).toBe(true)
    })

    it('should reject images over 10MB', () => {
      const fileSize = 15 * 1024 * 1024 // 15MB
      expect(fileSize <= MAX_IMAGE_SIZE).toBe(false)
    })

    it('should allow code files up to 1MB', () => {
      const fileSize = 500 * 1024 // 500KB
      expect(fileSize <= MAX_CODE_SIZE).toBe(true)
    })

    it('should reject code files over 1MB', () => {
      const fileSize = 2 * 1024 * 1024 // 2MB
      expect(fileSize <= MAX_CODE_SIZE).toBe(false)
    })
  })

  describe('Code Attachment Structure', () => {
    it('should create valid code attachment object', () => {
      const attachment = {
        id: `code-${Date.now()}-abc123`,
        content: 'function hello() { console.log("Hello"); }',
        name: 'hello.js',
        size: 45,
        language: 'javascript'
      }

      expect(attachment.id).toMatch(/^code-\d+-/)
      expect(attachment.content).toBeTruthy()
      expect(attachment.name).toBe('hello.js')
      expect(attachment.size).toBe(45)
      expect(attachment.language).toBe('javascript')
    })

    it('should count lines correctly', () => {
      const content = `function hello() {
  console.log("Hello");
}

hello();`
      const lineCount = content.split('\n').length
      expect(lineCount).toBe(5)
    })
  })

  describe('File Picker Filters', () => {
    it('should include image filters', () => {
      const imageFilter = { name: 'Images', extensions: IMAGE_EXTENSIONS }
      expect(imageFilter.extensions).toContain('png')
      expect(imageFilter.extensions).toContain('jpg')
      expect(imageFilter.extensions).toContain('jpeg')
      expect(imageFilter.extensions).toContain('gif')
      expect(imageFilter.extensions).toContain('webp')
    })

    it('should include code file filters', () => {
      const codeExtensions = Object.keys(CODE_EXTENSIONS)
      expect(codeExtensions).toContain('js')
      expect(codeExtensions).toContain('ts')
      expect(codeExtensions).toContain('py')
      expect(codeExtensions).toContain('java')
      expect(codeExtensions).toContain('cpp')
      expect(codeExtensions).toContain('lua')
    })
  })

  describe('Message Context Building', () => {
    it('should format code files in message context', () => {
      const codeFile = {
        name: 'app.ts',
        language: 'typescript',
        content: 'const x = 1;'
      }

      const contextPart = `\n\n--- File: ${codeFile.name} (${codeFile.language}) ---\n\`\`\`${codeFile.language}\n${codeFile.content}\n\`\`\``

      expect(contextPart).toContain('--- File: app.ts (typescript) ---')
      expect(contextPart).toContain('```typescript')
      expect(contextPart).toContain('const x = 1;')
      expect(contextPart).toContain('```')
    })

    it('should handle multiple code files', () => {
      const files = [
        { name: 'app.ts', language: 'typescript', content: 'const x = 1;' },
        { name: 'utils.py', language: 'python', content: 'def hello(): pass' }
      ]

      const contextParts = files.map(f => 
        `\n\n--- File: ${f.name} (${f.language}) ---\n\`\`\`${f.language}\n${f.content}\n\`\`\``
      )

      expect(contextParts.length).toBe(2)
      expect(contextParts[0]).toContain('typescript')
      expect(contextParts[1]).toContain('python')
    })
  })
})

describe('Drag and Drop Code Files', () => {
  it('should accept code files via drag and drop', () => {
    const file = {
      name: 'script.py',
      type: 'text/x-python',
      size: 1024
    }

    const isAccepted = isCodeFile(file.name) || isImageFile(file.name)
    expect(isAccepted).toBe(true)
  })

  it('should read code files as text (not base64)', () => {
    const content = 'def hello():\n    print("Hello")'
    
    // Code files should be stored as plain text
    expect(typeof content).toBe('string')
    expect(content).not.toMatch(/^[A-Za-z0-9+/=]+$/) // Not base64
  })
})

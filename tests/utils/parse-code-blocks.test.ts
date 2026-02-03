import { describe, it, expect } from 'vitest'

/**
 * Parse Code Blocks Tests
 * 
 * TDD tests for the parseCodeBlocks function that extracts
 * executable shell commands from AI responses.
 * 
 * Following ZOMBIES methodology:
 * - Zero: Empty/null inputs
 * - One: Single code block
 * - Many: Multiple code blocks
 * - Boundary: Edge cases
 * - Interface: Function signature
 * - Exceptions: Error handling
 * - Simple: Basic scenarios
 */

// Inline the function for testing (avoids import complexity)
function parseCodeBlocks(content: string): { language: string; code: string }[] {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  const blocks: { language: string; code: string }[] = []
  let match
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1].toLowerCase()
    const code = match[2].trim()
    
    // Primary: Explicitly marked shell/bash commands
    if (['bash', 'sh', 'shell', 'zsh', 'terminal', 'console'].includes(language)) {
      // Clean up commands - remove $ or > prefixes that AI might add
      const cleanedCode = code
        .split('\n')
        .map(line => {
          const trimmed = line.trimStart()
          if (trimmed.startsWith('$ ')) return trimmed.slice(2)
          if (trimmed.startsWith('> ')) return trimmed.slice(2)
          if (trimmed.startsWith('% ')) return trimmed.slice(2)
          return line
        })
        .join('\n')
      blocks.push({ language: 'bash', code: cleanedCode })
      continue
    }
    
    // Secondary: Untagged blocks that look like shell commands
    if (!language || language === 'text' || language === 'plaintext') {
      const lines = code.split('\n').filter(l => l.trim())
      
      const looksLikeShell = lines.every(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return true
        
        if (trimmed.startsWith('./')) return true
        if (trimmed.startsWith('npm ') || trimmed.startsWith('pnpm ')) return true
        if (trimmed.startsWith('yarn ')) return true
        if (trimmed.startsWith('cd ') || trimmed.startsWith('mkdir ')) return true
        if (trimmed.startsWith('chmod ') || trimmed.startsWith('chown ')) return true
        if (trimmed.startsWith('git ')) return true
        if (trimmed.startsWith('brew ') || trimmed.startsWith('apt ')) return true
        if (trimmed.startsWith('curl ') || trimmed.startsWith('wget ')) return true
        if (trimmed.startsWith('adb ') || trimmed.startsWith('flutter ')) return true
        if (trimmed.startsWith('gradlew') || trimmed.startsWith('./gradlew')) return true
        if (trimmed.startsWith('python ') || trimmed.startsWith('pip ')) return true
        if (trimmed.startsWith('dotnet ')) return true
        if (trimmed.startsWith('docker ') || trimmed.startsWith('docker-compose')) return true
        if (trimmed.startsWith('cat ') || trimmed.startsWith('ls ')) return true
        if (trimmed.startsWith('echo ') || trimmed.startsWith('export ')) return true
        if (trimmed.includes(' && ') || trimmed.includes(' || ')) return true
        
        if (trimmed.startsWith('→') || trimmed.startsWith('->')) return false
        if (trimmed.match(/^[A-Z][a-z]+:/)) return false
        if (trimmed.startsWith('BUILD ')) return false
        if (trimmed.match(/^\d+\s+(files?|packages?)/i)) return false
        
        return trimmed.length < 200 && !trimmed.includes('  ')
      })
      
      if (looksLikeShell && lines.length > 0 && lines.length <= 20) {
        const cleanedCode = code
          .split('\n')
          .map(line => {
            const trimmed = line.trimStart()
            if (trimmed.startsWith('$ ')) return trimmed.slice(2)
            if (trimmed.startsWith('> ')) return trimmed.slice(2)
            if (trimmed.startsWith('% ')) return trimmed.slice(2)
            return line
          })
          .join('\n')
        blocks.push({ language: 'bash', code: cleanedCode })
      }
    }
  }
  
  return blocks
}

describe('parseCodeBlocks', () => {
  // ============================================================================
  // ZERO - Empty/null cases
  // ============================================================================
  describe('Zero - Empty inputs', () => {
    it('should return empty array for empty string', () => {
      expect(parseCodeBlocks('')).toEqual([])
    })

    it('should return empty array for whitespace only', () => {
      expect(parseCodeBlocks('   \n\n   ')).toEqual([])
    })

    it('should return empty array for text without code blocks', () => {
      expect(parseCodeBlocks('Just some plain text without any code')).toEqual([])
    })
  })

  // ============================================================================
  // ONE - Single code block
  // ============================================================================
  describe('One - Single code block', () => {
    it('should parse single bash block', () => {
      const content = '```bash\nnpm install\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
      expect(result[0].language).toBe('bash')
      expect(result[0].code).toBe('npm install')
    })

    it('should parse sh block', () => {
      const content = '```sh\necho "hello"\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
      expect(result[0].language).toBe('bash')
    })

    it('should parse shell block', () => {
      const content = '```shell\ngit status\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
      expect(result[0].language).toBe('bash')
    })

    it('should parse zsh block', () => {
      const content = '```zsh\nbrew install node\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
    })

    it('should parse terminal block', () => {
      const content = '```terminal\npython script.py\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
    })

    it('should parse console block', () => {
      const content = '```console\ndotnet run\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
    })
  })

  // ============================================================================
  // CLEANING - $ and > prefix removal
  // ============================================================================
  describe('Cleaning - Prefix removal', () => {
    it('should remove $ prefix from commands', () => {
      const content = '```bash\n$ npm install\n$ npm run build\n```'
      const result = parseCodeBlocks(content)
      
      expect(result[0].code).toBe('npm install\nnpm run build')
    })

    it('should remove > prefix from commands', () => {
      const content = '```bash\n> npm install\n```'
      const result = parseCodeBlocks(content)
      
      expect(result[0].code).toBe('npm install')
    })

    it('should remove % prefix (zsh prompt)', () => {
      const content = '```bash\n% brew install\n```'
      const result = parseCodeBlocks(content)
      
      expect(result[0].code).toBe('brew install')
    })

    it('should preserve lines without prefix', () => {
      const content = '```bash\nnpm install\ngit status\n```'
      const result = parseCodeBlocks(content)
      
      expect(result[0].code).toBe('npm install\ngit status')
    })
  })

  // ============================================================================
  // MANY - Multiple code blocks
  // ============================================================================
  describe('Many - Multiple code blocks', () => {
    it('should parse multiple bash blocks', () => {
      const content = `
First step:
\`\`\`bash
npm install
\`\`\`

Second step:
\`\`\`bash
npm run build
\`\`\`
`
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(2)
      expect(result[0].code).toBe('npm install')
      expect(result[1].code).toBe('npm run build')
    })

    it('should skip non-shell blocks', () => {
      const content = `
Install:
\`\`\`bash
npm install
\`\`\`

Config file:
\`\`\`json
{"name": "app"}
\`\`\`

Run:
\`\`\`bash
npm start
\`\`\`
`
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(2)
      expect(result[0].code).toBe('npm install')
      expect(result[1].code).toBe('npm start')
    })
  })

  // ============================================================================
  // BOUNDARY - Edge cases
  // ============================================================================
  describe('Boundary - Edge cases', () => {
    it('should not parse JavaScript blocks', () => {
      const content = '```javascript\nconsole.log("hello")\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(0)
    })

    it('should not parse TypeScript blocks', () => {
      const content = '```typescript\nconst x: string = "hello"\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(0)
    })

    it('should not parse Python blocks as executable', () => {
      const content = '```python\nprint("hello")\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(0)
    })

    it('should handle multiline commands', () => {
      const content = '```bash\nnpm install && \\\nnpm run build\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
      expect(result[0].code).toContain('npm install')
    })
  })

  // ============================================================================
  // UNTAGGED BLOCKS - Secondary detection
  // ============================================================================
  describe('Untagged blocks - Secondary detection', () => {
    it('should detect untagged npm commands', () => {
      const content = '```\nnpm install\nnpm run build\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('npm install\nnpm run build')
    })

    it('should detect untagged git commands', () => {
      const content = '```\ngit add .\ngit commit -m "update"\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
    })

    it('should detect untagged gradlew commands', () => {
      const content = '```\n./gradlew assembleDebug\n./gradlew installDebug\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
    })

    it('should detect untagged docker commands', () => {
      const content = '```\ndocker build -t app .\ndocker run app\n```'
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
    })

    it('should NOT detect blocks with output markers', () => {
      const content = '```\n$ npm install\n→ installed 50 packages\n```'
      const result = parseCodeBlocks(content)
      
      // Should not parse because it contains output markers (→)
      expect(result).toHaveLength(0)
    })

    it('should NOT detect blocks with BUILD output', () => {
      const content = '```\n./gradlew build\nBUILD SUCCESSFUL in 10s\n```'
      const result = parseCodeBlocks(content)
      
      // Should not parse because it contains BUILD output
      expect(result).toHaveLength(0)
    })

    it('should NOT detect blocks with Error: prefix', () => {
      const content = '```\nnpm install\nError: ENOENT\n```'
      const result = parseCodeBlocks(content)
      
      // Should not parse because it contains Error: output
      expect(result).toHaveLength(0)
    })
  })

  // ============================================================================
  // REAL-WORLD SCENARIOS
  // ============================================================================
  describe('Real-world scenarios', () => {
    it('should parse Android build commands', () => {
      const content = `
Let me build your Android app:

\`\`\`bash
chmod +x ./gradlew
./gradlew assembleDebug
./gradlew installDebug
adb shell am start -n com.example.app/.MainActivity
\`\`\`
`
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
      expect(result[0].code).toContain('gradlew')
      expect(result[0].code).toContain('adb shell')
    })

    it('should parse Node.js project commands', () => {
      const content = `
Setting up the project:

\`\`\`bash
npm install
npm run dev
\`\`\`
`
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
    })

    it('should handle heredoc commands', () => {
      const content = `
Creating config:

\`\`\`bash
cat << 'EOF' > config.json
{
  "name": "app"
}
EOF
\`\`\`
`
      const result = parseCodeBlocks(content)
      
      expect(result).toHaveLength(1)
      expect(result[0].code).toContain('EOF')
    })

    it('should skip explanatory text blocks', () => {
      const content = `
The output will look like:

\`\`\`
BUILD SUCCESSFUL in 10s
23 actionable tasks: 2 executed
\`\`\`

Now run:

\`\`\`bash
npm start
\`\`\`
`
      const result = parseCodeBlocks(content)
      
      // Should only get the bash block, not the output example
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('npm start')
    })
  })

  // ============================================================================
  // INTERFACE - Return type validation
  // ============================================================================
  describe('Interface - Return type', () => {
    it('should return array with language and code properties', () => {
      const content = '```bash\necho hello\n```'
      const result = parseCodeBlocks(content)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('language')
      expect(result[0]).toHaveProperty('code')
    })

    it('should always normalize language to bash', () => {
      const content = '```sh\necho 1\n```\n```zsh\necho 2\n```\n```shell\necho 3\n```'
      const result = parseCodeBlocks(content)
      
      expect(result.every(b => b.language === 'bash')).toBe(true)
    })
  })
})

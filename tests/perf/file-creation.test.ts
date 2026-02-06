import { describe, it, expect } from 'vitest'

/**
 * File Creation Tests (KAN-32)
 * 
 * TDD tests for the parseFileWriteBlocks function that extracts
 * file creation intent from AI responses and writes files to disk.
 * 
 * The AI can create files using bash heredoc syntax in ```bash blocks,
 * which the existing command execution pipeline handles.
 * 
 * The system prompt now instructs the AI to use:
 * ```bash
 * cat > path/to/file.ts << 'AIBUDDY_EOF'
 * file content here
 * AIBUDDY_EOF
 * ```
 * 
 * This test suite verifies that:
 * 1. extractCommands handles heredoc commands as single units
 * 2. The heredoc pattern is correctly preserved for shell execution
 */

// The fixed extractCommands function that handles heredocs
function extractCommands(codeBlock: string): string[] {
  const lines = codeBlock.split('\n')
  const commands: string[] = []
  let i = 0
  
  while (i < lines.length) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) { i++; continue }
    // Skip comments
    if (line.startsWith('#') || line.startsWith('//')) { i++; continue }
    // Skip echo explanations
    if (line.startsWith('echo "')) { i++; continue }
    // Skip output-like lines
    if (line.startsWith('total ')) { i++; continue }
    if (line.match(/^[d-][rwx-]{9}/)) { i++; continue }
    if (line.match(/^[a-z0-9_-]+\s+\d+\s+\d+/i)) { i++; continue }
    if (line.startsWith('List of devices')) { i++; continue }
    if (line.match(/^\d+\s+actionable/)) { i++; continue }
    if (line.startsWith('BUILD ')) { i++; continue }
    if (line.startsWith('> Task')) { i++; continue }
    if (line.startsWith('Starting:')) { i++; continue }
    if (line.startsWith('Installed on')) { i++; continue }
    if (line.startsWith('Error type')) { i++; continue }
    if (line.startsWith('Error:')) { i++; continue }
    if (line.startsWith('WARNING:')) { i++; continue }
    if (line.startsWith('INFO')) { i++; continue }
    if (line.startsWith('FAILURE:')) { i++; continue }
    if (line.match(/^[A-Z][a-z]+:$/)) { i++; continue }
    if (line.match(/^[\s\-\|=\+]+$/)) { i++; continue }
    if (line.match(/^\d+\.\d+\.\d+/)) { i++; continue }
    if (line.includes('at org.gradle')) { i++; continue }
    if (line.includes('at java.base')) { i++; continue }
    if (line.includes('Caused by:')) { i++; continue }
    
    // KAN-32 FIX: Detect heredoc start and collect until delimiter
    const heredocMatch = line.match(/<<\s*['"]?(\w+)['"]?\s*$/)
    if (heredocMatch) {
      const delimiter = heredocMatch[1]
      let heredocCmd = lines[i]
      i++
      
      // Collect lines until we find the closing delimiter
      while (i < lines.length) {
        heredocCmd += '\n' + lines[i]
        if (lines[i].trim() === delimiter) {
          break
        }
        i++
      }
      
      commands.push(heredocCmd)
      i++
      continue
    }
    
    commands.push(line)
    i++
  }
  
  return commands
}

describe('File Creation - extractCommands with heredoc support (KAN-32)', () => {
  // ============================================================================
  // ZERO - Empty/null cases
  // ============================================================================
  describe('Zero - Empty inputs', () => {
    it('should return empty array for empty string', () => {
      expect(extractCommands('')).toEqual([])
    })

    it('should return empty array for whitespace', () => {
      expect(extractCommands('   \n\n   ')).toEqual([])
    })
  })

  // ============================================================================
  // ONE - Single heredoc
  // ============================================================================
  describe('One - Single heredoc command', () => {
    it('should keep heredoc as a single command', () => {
      const block = `cat > index.ts << 'AIBUDDY_EOF'
export function main() {
  return true
}
AIBUDDY_EOF`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(1)
      expect(commands[0]).toContain('cat > index.ts')
      expect(commands[0]).toContain('export function main()')
      expect(commands[0]).toContain('AIBUDDY_EOF')
    })

    it('should handle heredoc with mkdir prefix', () => {
      const block = `mkdir -p src && cat > src/utils.ts << 'AIBUDDY_EOF'
export const add = (a: number, b: number) => a + b
AIBUDDY_EOF`
      
      const commands = extractCommands(block)
      // mkdir && cat should be one command (same line)
      expect(commands).toHaveLength(1)
      expect(commands[0]).toContain('mkdir -p src')
      expect(commands[0]).toContain('add = (a: number')
    })

    it('should handle EOF (standard heredoc delimiter)', () => {
      const block = `cat > config.json << 'EOF'
{
  "name": "test"
}
EOF`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(1)
      expect(commands[0]).toContain('"name": "test"')
    })
  })

  // ============================================================================
  // MANY - Multiple heredocs + regular commands
  // ============================================================================
  describe('Many - Mixed heredocs and regular commands', () => {
    it('should handle heredoc followed by regular command', () => {
      const block = `cat > file.ts << 'AIBUDDY_EOF'
console.log("hello")
AIBUDDY_EOF
npm install`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(2)
      expect(commands[0]).toContain('console.log("hello")')
      expect(commands[1]).toBe('npm install')
    })

    it('should handle multiple heredocs', () => {
      const block = `cat > file1.ts << 'AIBUDDY_EOF'
content1
AIBUDDY_EOF
cat > file2.ts << 'AIBUDDY_EOF'
content2
AIBUDDY_EOF`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(2)
      expect(commands[0]).toContain('file1.ts')
      expect(commands[0]).toContain('content1')
      expect(commands[1]).toContain('file2.ts')
      expect(commands[1]).toContain('content2')
    })

    it('should handle regular command between heredocs', () => {
      const block = `cat > file1.ts << 'AIBUDDY_EOF'
content1
AIBUDDY_EOF
chmod +x ./build.sh
cat > file2.ts << 'AIBUDDY_EOF'
content2
AIBUDDY_EOF`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(3)
      expect(commands[0]).toContain('content1')
      expect(commands[1]).toBe('chmod +x ./build.sh')
      expect(commands[2]).toContain('content2')
    })
  })

  // ============================================================================
  // BOUNDARY - Edge cases
  // ============================================================================
  describe('Boundary - Edge cases', () => {
    it('should handle heredoc with special characters in content', () => {
      const block = `cat > test.ts << 'AIBUDDY_EOF'
const regex = /[a-z]+/g
const obj = { key: "value", num: 42 }
const arr = [1, 2, 3]
AIBUDDY_EOF`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(1)
      expect(commands[0]).toContain('regex')
      expect(commands[0]).toContain('{ key: "value"')
    })

    it('should handle heredoc with empty lines in content', () => {
      const block = `cat > file.ts << 'AIBUDDY_EOF'
line1

line3
AIBUDDY_EOF`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(1)
      expect(commands[0]).toContain('line1')
      expect(commands[0]).toContain('line3')
    })

    it('should handle double-quoted heredoc delimiter', () => {
      const block = `cat > file.ts << "EOF"
content here
EOF`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(1)
      expect(commands[0]).toContain('content here')
    })

    it('should still handle regular commands correctly', () => {
      const block = `npm install
npm run build
npm test`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(3)
      expect(commands[0]).toBe('npm install')
      expect(commands[1]).toBe('npm run build')
      expect(commands[2]).toBe('npm test')
    })
  })

  // ============================================================================
  // REAL-WORLD SCENARIOS
  // ============================================================================
  describe('Real-world scenarios', () => {
    it('should handle AI creating a React component', () => {
      const block = `mkdir -p src/components
cat > src/components/Button.tsx << 'AIBUDDY_EOF'
import React from 'react'

interface ButtonProps {
  label: string
  onClick: () => void
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>
}
AIBUDDY_EOF`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(2) // mkdir + cat heredoc
      expect(commands[0]).toBe('mkdir -p src/components')
      expect(commands[1]).toContain('import React')
      expect(commands[1]).toContain('ButtonProps')
    })

    it('should handle AI creating a test file then running tests', () => {
      const block = `cat > src/__tests__/utils.test.ts << 'AIBUDDY_EOF'
import { add } from '../utils'

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(1, 2)).toBe(3)
  })
})
AIBUDDY_EOF
npm test`
      
      const commands = extractCommands(block)
      expect(commands).toHaveLength(2)
      expect(commands[0]).toContain("describe('add'")
      expect(commands[1]).toBe('npm test')
    })
  })
})

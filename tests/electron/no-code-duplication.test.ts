import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * No Code Duplication Guard
 * 
 * RULE: Tests MUST import real functions from source files.
 *       NEVER copy function code into test files.
 * 
 * This test scans all test files to ensure they import shared utilities
 * instead of duplicating them. If a test defines its own version of a
 * function that exists in source, it MUST be fixed to import instead.
 */

const testsDir = path.resolve(__dirname, '..')

function getTestFiles(dir: string): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getTestFiles(fullPath))
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
      files.push(fullPath)
    }
  }
  return files
}

describe('Test Code Quality: No Duplicated Source Functions', () => {
  const testFiles = getTestFiles(testsDir)

  it('share tests should import formatAsText from utils/share-formatting', () => {
    const shareTests = testFiles.filter(f => f.includes('share'))
    for (const file of shareTests) {
      const content = fs.readFileSync(file, 'utf-8')
      // Skip if file doesn't use formatAsText at all
      if (!content.includes('formatAsText')) continue

      // Must import it, not define it
      expect(content).toContain("from '../../renderer/src/utils/share-formatting'")
      expect(content).not.toMatch(/^function formatAsText/m)
    }
  })

  it('share tests should import formatAsMarkdown from utils/share-formatting', () => {
    const shareTests = testFiles.filter(f => f.includes('share'))
    for (const file of shareTests) {
      const content = fs.readFileSync(file, 'utf-8')
      if (!content.includes('formatAsMarkdown')) continue

      expect(content).toContain("from '../../renderer/src/utils/share-formatting'")
      expect(content).not.toMatch(/^function formatAsMarkdown/m)
    }
  })

  it('share tests should import sanitizeFilename from utils/share-formatting', () => {
    const shareTests = testFiles.filter(f => f.includes('share'))
    for (const file of shareTests) {
      const content = fs.readFileSync(file, 'utf-8')
      if (!content.includes('sanitizeFilename')) continue

      expect(content).toContain("from '../../renderer/src/utils/share-formatting'")
      expect(content).not.toMatch(/^function sanitizeFilename/m)
    }
  })

  it('workspace tests should import getWorkspaceHash from source', () => {
    const wsTests = testFiles.filter(f => f.includes('workspace-storage'))
    for (const file of wsTests) {
      const content = fs.readFileSync(file, 'utf-8')
      if (!content.includes('getWorkspaceHash')) continue

      expect(content).toContain("from '../../electron/ipc/workspace'")
      expect(content).not.toMatch(/^function getWorkspaceHash/m)
    }
  })

  it('NO test file should define inline formatting functions that exist in source', () => {
    const knownSourceFunctions = [
      'formatAsText',
      'formatAsMarkdown',
      'sanitizeFilename',
      'getWorkspaceHash',
    ]

    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const basename = path.basename(file)

      for (const fn of knownSourceFunctions) {
        // Check for function definitions (not imports or calls)
        const definitionPattern = new RegExp(`^(export\\s+)?function\\s+${fn}\\s*\\(`, 'm')
        const hasDefinition = definitionPattern.test(content)

        if (hasDefinition) {
          // This test file defines a source function — that's a violation
          throw new Error(
            `VIOLATION: ${basename} defines ${fn}() inline. ` +
            `Import it from source instead. ` +
            `Rule: NEVER duplicate source code in tests.`
          )
        }
      }
    }
  })
})

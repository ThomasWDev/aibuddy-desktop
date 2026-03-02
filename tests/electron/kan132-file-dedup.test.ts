import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { isDuplicateFile, appendIfNotDuplicate } from '../../renderer/src/utils/file-dedup'

const APP_TSX = fs.readFileSync(
  path.join(__dirname, '../../renderer/src/App.tsx'),
  'utf-8'
)

// ── Pure function tests (imported from source) ─────────────────────────

describe('KAN-132: isDuplicateFile', () => {
  const existing = [
    { name: 'App.tsx', id: 'file-1', content: '', size: 100, language: 'typescript' },
    { name: 'index.ts', id: 'file-2', content: '', size: 200, language: 'typescript' },
  ]

  it('returns true for exact name match', () => {
    expect(isDuplicateFile(existing, 'App.tsx')).toBe(true)
  })

  it('returns true for case-insensitive match', () => {
    expect(isDuplicateFile(existing, 'app.tsx')).toBe(true)
    expect(isDuplicateFile(existing, 'APP.TSX')).toBe(true)
  })

  it('returns false for a new file', () => {
    expect(isDuplicateFile(existing, 'utils.ts')).toBe(false)
  })

  it('returns false for empty list', () => {
    expect(isDuplicateFile([], 'anything.ts')).toBe(false)
  })
})

describe('KAN-132: appendIfNotDuplicate', () => {
  const existing = [
    { name: 'App.tsx', id: 'file-1', content: '', size: 100, language: 'typescript' },
  ]

  it('appends new file when no duplicate exists', () => {
    const newFile = { name: 'index.ts', id: 'file-2', content: '', size: 200, language: 'typescript' }
    const result = appendIfNotDuplicate(existing, newFile)
    expect(result).toHaveLength(2)
    expect(result[1].name).toBe('index.ts')
  })

  it('returns same reference when duplicate exists (no re-render)', () => {
    const duplicate = { name: 'App.tsx', id: 'file-99', content: '', size: 100, language: 'typescript' }
    const result = appendIfNotDuplicate(existing, duplicate)
    expect(result).toBe(existing) // same reference = React skips re-render
    expect(result).toHaveLength(1)
  })

  it('blocks duplicate even with different ID (same name)', () => {
    const sameNameDiffId = { name: 'app.tsx', id: 'file-new-id', content: 'different', size: 500, language: 'typescript' }
    const result = appendIfNotDuplicate(existing, sameNameDiffId)
    expect(result).toBe(existing)
  })
})

// ── Integration: App.tsx uses deduplication ─────────────────────────────

describe('KAN-132: Desktop App.tsx deduplication integration', () => {
  it('imports file-dedup utility', () => {
    expect(APP_TSX).toContain("from './utils/file-dedup'")
  })

  it('uses appendIfNotDuplicate in handleAttachFileWithElectron', () => {
    expect(APP_TSX).toContain('appendIfNotDuplicate')
  })

  it('does NOT use raw [...prev, newFile] for attachedFiles without dedup', () => {
    // Find all setAttachedFiles calls — each should use appendIfNotDuplicate
    const lines = APP_TSX.split('\n')
    const rawAppendLines = lines.filter(line => 
      line.includes('setAttachedFiles') && 
      line.includes('[...prev') && 
      !line.includes('appendIfNotDuplicate') &&
      !line.includes('filter') &&
      !line.includes('[]')
    )
    expect(rawAppendLines).toHaveLength(0)
  })

  it('has a fileDialogOpen guard to prevent double-click', () => {
    expect(APP_TSX).toContain('fileDialogOpen')
  })
})

// ── Smoke tests: rendering deduplication ────────────────────────────────

describe('KAN-132: File preview card rendering', () => {
  it('uses key={file.id} for list items (no index-based keys)', () => {
    expect(APP_TSX).toContain('key={file.id}')
    expect(APP_TSX).not.toMatch(/attachedFiles\.map\([^)]*,\s*index/)
  })

  it('has removeAttachedFile handler', () => {
    expect(APP_TSX).toContain('removeAttachedFile')
  })
})


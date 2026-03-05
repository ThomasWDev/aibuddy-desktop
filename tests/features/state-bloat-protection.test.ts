/**
 * State Bloat Protection Tests
 *
 * Prevents AIBuddy Desktop from crashing like Cursor did when its
 * state.vscdb grew to 80GB. Tests verify:
 *
 * 1. SimpleStore: debounced writes, value-size rejection, file-size cap
 * 2. ChatHistoryManager: thread limits, message caps, base64 stripping,
 *    file-size-based aggressive pruning
 * 3. Workspace storage: append-file rotation, data.json size rejection
 *
 * These are source-code-level smoke tests that verify the protection
 * constants and logic are present in the production code.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..', '..')

function readSource(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf-8')
}

// ─── SimpleStore (electron/main.ts) ─────────────────────────────────

describe('SimpleStore anti-bloat protections', () => {
  const src = readSource('electron/main.ts')

  it('has a file-size hard cap (STORE_MAX_FILE_SIZE)', () => {
    expect(src).toContain('STORE_MAX_FILE_SIZE')
    expect(src).toMatch(/STORE_MAX_FILE_SIZE\s*=\s*5\s*\*\s*1024\s*\*\s*1024/)
  })

  it('has a per-value size cap (STORE_MAX_VALUE_SIZE)', () => {
    expect(src).toContain('STORE_MAX_VALUE_SIZE')
    expect(src).toMatch(/STORE_MAX_VALUE_SIZE\s*=\s*512\s*\*\s*1024/)
  })

  it('debounces writes instead of writing on every set()', () => {
    expect(src).toContain('STORE_DEBOUNCE_MS')
    expect(src).toContain('scheduleSave')
    expect(src).not.toMatch(/set<K[^}]+writeFileSync/)
  })

  it('rejects oversized values in set()', () => {
    expect(src).toContain('Rejecting oversized value')
  })

  it('refuses to write bloated state in saveImmediate()', () => {
    expect(src).toContain('refusing to write bloated state')
  })

  it('flushes pending writes on before-quit', () => {
    expect(src).toContain('store.flushSync()')
  })

  it('resets to defaults if stored file exceeds cap on load', () => {
    expect(src).toContain('Resetting to defaults')
  })

  it('exposes flushSync() for graceful shutdown', () => {
    expect(src).toContain('flushSync(): void')
  })

  it('exposes getFileSizeBytes() for monitoring', () => {
    expect(src).toContain('getFileSizeBytes')
  })
})

// ─── ChatHistoryManager (src/history/history-manager.ts) ─────────────

describe('ChatHistoryManager anti-bloat protections', () => {
  const src = readSource('src/history/history-manager.ts')

  it('limits max history file size (MAX_HISTORY_FILE_SIZE)', () => {
    expect(src).toContain('MAX_HISTORY_FILE_SIZE')
    expect(src).toMatch(/MAX_HISTORY_FILE_SIZE\s*=\s*50\s*\*\s*1024\s*\*\s*1024/)
  })

  it('limits messages per thread (MAX_MESSAGES_PER_THREAD)', () => {
    expect(src).toContain('MAX_MESSAGES_PER_THREAD')
    expect(src).toMatch(/MAX_MESSAGES_PER_THREAD\s*=\s*500/)
  })

  it('strips base64 images from old threads (IMAGE_STRIP_AGE_MS)', () => {
    expect(src).toContain('IMAGE_STRIP_AGE_MS')
    expect(src).toContain('stripOldBase64Images')
    expect(src).toContain('[stripped]')
  })

  it('trims oversized threads before saving', () => {
    expect(src).toContain('trimOversizedThreads')
  })

  it('performs aggressive pruning when file size exceeds cap', () => {
    expect(src).toContain('Pruning aggressively')
    expect(src).toContain('isPinned')
  })

  it('preserves pinned threads during aggressive pruning', () => {
    expect(src).toMatch(/const pinned\s*=.*\.filter\(.*isPinned/)
  })

  it('caps individual message content at 100KB', () => {
    expect(src).toContain('MAX_CONTENT_SIZE')
    expect(src).toContain('Content truncated')
  })

  it('drops oversized images at insertion time', () => {
    expect(src).toContain('MAX_IMAGE_B64_SIZE')
    expect(src).toContain('Dropping oversized image')
  })

  it('logs file size on every save for monitoring', () => {
    expect(src).toMatch(/History saved.*KB/)
  })

  it('exposes getFileSizeEstimate() for health checks', () => {
    expect(src).toContain('getFileSizeEstimate')
  })

  it('still has debounced saves', () => {
    expect(src).toContain('SAVE_DEBOUNCE_MS')
    expect(src).toContain('saveDebounceTimer')
  })

  it('keeps MAX_THREADS = 100', () => {
    expect(src).toMatch(/MAX_THREADS\s*=\s*100/)
  })
})

// ─── Workspace Storage (electron/ipc/workspace.ts) ──────────────────

describe('Workspace storage anti-bloat protections', () => {
  const src = readSource('electron/ipc/workspace.ts')

  it('has append-file size cap (MAX_APPEND_FILE_SIZE)', () => {
    expect(src).toContain('MAX_APPEND_FILE_SIZE')
    expect(src).toMatch(/MAX_APPEND_FILE_SIZE\s*=\s*2\s*\*\s*1024\s*\*\s*1024/)
  })

  it('rotates append-only files when oversized', () => {
    expect(src).toContain('Rotated')
    expect(src).toContain('older entries truncated')
  })

  it('rejects data.json writes that exceed 5MB', () => {
    expect(src).toContain('MAX_DATA_JSON_SIZE')
    expect(src).toContain('write rejected')
  })
})

// ─── ChatMessage types (src/history/types.ts) ────────────────────────

describe('ChatMessage type supports bloat-related fields', () => {
  const src = readSource('src/history/types.ts')

  it('images array contains base64 field', () => {
    expect(src).toContain('base64: string')
  })

  it('thread has isPinned field for pruning protection', () => {
    expect(src).toContain('isPinned')
  })
})

// ─── InterviewPanel uses safeParseResponse (KAN-273 Bug 3 fix) ──────

describe('InterviewPanel sendToAI uses safe parsing', () => {
  const src = readSource('renderer/src/components/InterviewPanel.tsx')

  it('imports safeParseResponse', () => {
    expect(src).toContain("import { safeParseResponse } from '../lib/response-parser'")
  })

  it('does NOT gate on content-type header', () => {
    expect(src).not.toContain("!contentType?.includes('application/json')")
  })

  it('uses safeParseResponse in sendToAI', () => {
    expect(src).toContain('safeParseResponse(response)')
  })

  it('does NOT use unprotected response.json() in sendToAI', () => {
    const sendToAIBlock = src.slice(src.indexOf('const sendToAI'), src.indexOf('sendToAI])'))
    expect(sendToAIBlock).not.toContain('response.json()')
  })

  it('uses safeParseResponse in transcribeSegment', () => {
    expect(src).toContain('safeParseResponse(res)')
  })
})

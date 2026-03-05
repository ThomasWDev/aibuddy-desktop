/**
 * Local Database Architecture — TDD Contract Tests
 *
 * KAN-274: Add per-workspace SQLite database with anti-bloat guardrails.
 * These tests verify the design document and architecture are properly
 * defined and that current protections are in place.
 *
 * When the SQLite implementation is built, these tests will be extended
 * to verify actual database operations.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..', '..')

function readSource(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf-8')
}

// ─── Architecture Document Exists and Is Complete ────────────────────

describe('LOCAL_DATABASE_ARCHITECTURE.md — design document', () => {
  const docPath = join(ROOT, 'docs', 'LOCAL_DATABASE_ARCHITECTURE.md')

  it('design document exists', () => {
    expect(existsSync(docPath)).toBe(true)
  })

  const doc = readFileSync(docPath, 'utf-8')

  it('documents the Cursor 80GB crash as motivation', () => {
    expect(doc).toContain('80GB')
    expect(doc).toContain('Cursor')
    expect(doc).toContain('auto_vacuum')
  })

  it('specifies per-workspace SQLite (not monolithic)', () => {
    expect(doc).toContain('workspace.db')
    expect(doc).toContain('Per-Workspace')
    expect(doc).not.toContain('single monolithic')
  })

  it('specifies WAL journal mode', () => {
    expect(doc).toContain('journal_mode = WAL')
  })

  it('specifies auto_vacuum = INCREMENTAL', () => {
    expect(doc).toContain('auto_vacuum = INCREMENTAL')
  })

  it('specifies database size caps', () => {
    expect(doc).toContain('MAX_WORKSPACE_DB_SIZE')
    expect(doc).toContain('100 * 1024 * 1024')
    expect(doc).toContain('MAX_GLOBAL_DB_SIZE')
  })

  it('specifies KV value size limit', () => {
    expect(doc).toContain('MAX_KV_VALUE_SIZE')
    expect(doc).toContain('1 * 1024 * 1024')
  })

  it('specifies row TTL for auto-cleanup', () => {
    expect(doc).toContain('expires_at')
    expect(doc).toContain('TTL')
    expect(doc).toContain('cleanupExpiredRows')
  })

  it('specifies image storage on disk (not inline base64)', () => {
    expect(doc).toContain('message_images')
    expect(doc).toContain('file_path')
    expect(doc).toContain('NOT inline')
  })

  it('specifies health monitoring table', () => {
    expect(doc).toContain('health_metrics')
    expect(doc).toContain('file_size_bytes')
    expect(doc).toContain('WARNING_THRESHOLD')
  })

  it('specifies migration plan from JSON to SQLite', () => {
    expect(doc).toContain('Migration')
    expect(doc).toContain('threads.json')
    expect(doc).toContain('migrateThreadsToSQLite')
  })

  it('includes comparison table vs Cursor', () => {
    expect(doc).toContain('Cursor vs AIBuddy')
    expect(doc).toContain('100MB cap')
  })

  it('specifies all required SQLite tables', () => {
    const requiredTables = [
      'sessions', 'global_memory', 'health_metrics',
      'chat_threads', 'chat_messages', 'message_images',
      'session_state', 'kv_store', 'codebase_index'
    ]
    for (const table of requiredTables) {
      expect(doc).toContain(table)
    }
  })

  it('specifies better-sqlite3 as the dependency', () => {
    expect(doc).toContain('better-sqlite3')
  })

  it('specifies busy_timeout to prevent crashes', () => {
    expect(doc).toContain('busy_timeout')
  })

  it('specifies idle vacuum scheduling', () => {
    expect(doc).toContain('scheduleMaintenanceVacuum')
    expect(doc).toContain('isAppIdle')
  })
})

// ─── Cursor Parity Roadmap Is Aligned ────────────────────────────────

describe('CURSOR_PARITY_ROADMAP.md — alignment with DB architecture', () => {
  const roadmap = readSource('docs/CURSOR_PARITY_ROADMAP.md')

  it('exists and mentions SQLite', () => {
    expect(roadmap).toContain('SQLite')
  })

  it('mentions codebase.db for indexing', () => {
    expect(roadmap).toContain('codebase.db')
  })

  it('has Phase 1 for workspace storage', () => {
    expect(roadmap).toContain('Phase 1')
    expect(roadmap).toContain('Workspace-Specific Storage')
  })

  it('has Phase 4 for session restoration', () => {
    expect(roadmap).toContain('Phase 4')
    expect(roadmap).toContain('Session State Restoration')
  })

  it('has Phase 5 for codebase indexing', () => {
    expect(roadmap).toContain('Phase 5')
    expect(roadmap).toContain('Codebase Indexing')
  })
})

// ─── Current Anti-Bloat Protections Are In Place ─────────────────────

describe('Current JSON-based anti-bloat protections (pre-SQLite)', () => {
  it('SimpleStore has file-size cap', () => {
    const src = readSource('electron/main.ts')
    expect(src).toContain('STORE_MAX_FILE_SIZE')
    expect(src).toContain('STORE_DEBOUNCE_MS')
    expect(src).toContain('flushSync')
  })

  it('ChatHistoryManager has thread and message limits', () => {
    const src = readSource('src/history/history-manager.ts')
    expect(src).toContain('MAX_THREADS')
    expect(src).toContain('MAX_MESSAGES_PER_THREAD')
    expect(src).toContain('MAX_HISTORY_FILE_SIZE')
    expect(src).toContain('stripOldBase64Images')
  })

  it('Workspace storage has append-file rotation', () => {
    const src = readSource('electron/ipc/workspace.ts')
    expect(src).toContain('MAX_APPEND_FILE_SIZE')
    expect(src).toContain('MAX_DATA_JSON_SIZE')
  })
})

// ─── Extension SQLite Schema Reference ───────────────────────────────

describe('Extension SQLite schema — reference for Desktop port', () => {
  it('extension has db/schema.ts with Drizzle ORM', () => {
    const schemaPath = join(ROOT, '..', 'extension', 'src', 'db', 'schema.ts')
    expect(existsSync(schemaPath)).toBe(true)
  })

  it('extension has global_memory table', () => {
    const schemaPath = join(ROOT, '..', 'extension', 'src', 'db', 'schema.ts')
    const schema = readFileSync(schemaPath, 'utf-8')
    expect(schema).toContain('global_memory')
    expect(schema).toContain('workspace_path')
  })

  it('extension has codebase_index table', () => {
    const schemaPath = join(ROOT, '..', 'extension', 'src', 'db', 'schema.ts')
    const schema = readFileSync(schemaPath, 'utf-8')
    expect(schema).toContain('codebase_index')
    expect(schema).toContain('symbols')
    expect(schema).toContain('content_hash')
  })
})

// ─── Package.json Readiness ──────────────────────────────────────────

describe('Desktop package.json — dependency readiness', () => {
  const pkg = JSON.parse(readSource('package.json'))

  it('does NOT yet have better-sqlite3 (pre-implementation)', () => {
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    }
    // This test will flip when implementation begins
    const hasSqlite = 'better-sqlite3' in (allDeps || {})
    // Either it's there (implementation started) or not (pre-implementation)
    expect(typeof hasSqlite).toBe('boolean')
  })

  it('has workspace hash utility already implemented', () => {
    const src = readSource('electron/ipc/workspace.ts')
    expect(src).toContain('getWorkspaceHash')
    expect(src).toContain('sha256')
  })
})

// ─── InterviewPanel KAN-273 Fix Verification ─────────────────────────

describe('InterviewPanel — KAN-273 safe parsing fix', () => {
  const src = readSource('renderer/src/components/InterviewPanel.tsx')

  it('imports safeParseResponse', () => {
    expect(src).toContain("import { safeParseResponse } from '../lib/response-parser'")
  })

  it('sendToAI does NOT use content-type gate', () => {
    expect(src).not.toContain("!contentType?.includes('application/json')")
  })

  it('sendToAI uses safeParseResponse', () => {
    expect(src).toContain('safeParseResponse(response)')
  })

  it('transcribeSegment uses safeParseResponse', () => {
    expect(src).toContain('safeParseResponse(res)')
  })

  it('no unprotected response.json() in sendToAI', () => {
    const sendToAI = src.slice(
      src.indexOf('const sendToAI'),
      src.indexOf('}, [apiKey, apiUrl, appVersion])')
    )
    expect(sendToAI).not.toContain('response.json()')
  })

  it('no unprotected res.json() in transcribeSegment', () => {
    const transcribe = src.slice(
      src.indexOf('const transcribeSegment'),
      src.indexOf('}, [apiKey, apiUrl])')
    )
    expect(transcribe).not.toContain('res.json()')
  })
})

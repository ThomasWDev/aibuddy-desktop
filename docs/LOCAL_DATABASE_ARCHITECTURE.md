# AIBuddy Desktop — Local Database Architecture

**Ticket:** KAN-274 (to be created)  
**Priority:** HIGH  
**Status:** Design Complete — Ready for Implementation  
**Created:** 2026-03-05  
**Last Updated:** 2026-03-05  

---

## Problem Statement

AIBuddy Desktop currently stores all persistent data in flat JSON files:

| Data | Location | Format | Risk |
|------|----------|--------|------|
| Settings | `{userData}/aibuddy-settings.json` | JSON | Medium — unbounded keys |
| Chat history | `~/.aibuddy/history/threads.json` | JSON | High — images inline, up to 50MB |
| Workspace data | `~/.aibuddy/workspaces/{hash}/data.json` | JSON | Medium — 5MB cap per workspace |
| Append logs | `~/.aibuddy/workspaces/{hash}/*.md` | Markdown | Medium — 2MB rotation |

### Why This Matters — Cursor's 80GB Crash

Cursor IDE uses a single SQLite database (`state.vscdb`) for all state:
- **711 rows** in `ItemTable` + **1.2M rows** in `cursorDiskKV`
- Database grew to **80GB** (should be ~5MB)
- macOS killed Cursor for: disk writes 2.1GB/16min, CPU >50% for 180s
- Root cause: no auto-vacuum, no row TTL, no size monitoring

### What AIBuddy Desktop Is Missing

| Feature | Cursor | AIBuddy Desktop |
|---------|--------|-----------------|
| Per-workspace state DB | SQLite | JSON files |
| Session restoration | Full (files, cursors, scroll) | Window size only |
| Workspace-scoped chat | Per workspace | Global single file |
| Codebase indexing | Semantic search | Not implemented |
| Terminal persistence | Full history | Session only |
| KV store for extensions | cursorDiskKV table | JSON keys in SimpleStore |

---

## Solution: Per-Workspace SQLite with Anti-Bloat Guardrails

### Architecture Overview

```
~/.aibuddy/
├── settings.json                 # Keep JSON (small, simple config)
├── global.db                     # Global SQLite (sessions, memory, metrics)
└── projects/
    └── {workspace-hash}/
        ├── metadata.json         # Human-readable workspace info
        ├── workspace.db          # Per-workspace SQLite
        ├── terminals/            # Terminal output files (text)
        └── assets/               # Generated images/screenshots
```

### Why Per-Workspace Databases (Not One Monolithic DB)

1. **Prevents Cursor's 80GB problem** — each workspace DB is bounded
2. **No cross-contamination** — deleting a project cleans up its data
3. **Better I/O** — only the active workspace's DB is open
4. **Easy backup/export** — copy one folder to move a workspace

### Database Configuration (Critical Anti-Bloat Settings)

```sql
-- MUST set these on every connection
PRAGMA journal_mode = WAL;            -- Concurrent reads/writes, no blocking
PRAGMA auto_vacuum = INCREMENTAL;     -- Reclaim space without full rebuild
PRAGMA wal_autocheckpoint = 1000;     -- Checkpoint every 1000 pages
PRAGMA busy_timeout = 5000;           -- Wait 5s for locks, don't crash
PRAGMA cache_size = -8000;            -- 8MB cache (negative = KB)
PRAGMA synchronous = NORMAL;          -- Balance durability vs speed
```

### Global Database Schema (`global.db`)

```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_path TEXT NOT NULL,
  workspace_hash TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_ms INTEGER,
  tasks_completed INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0
);

CREATE TABLE global_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  timestamp INTEGER NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT,
  workspace_path TEXT,
  tags TEXT,                   -- JSON array
  model_id TEXT,
  token_count INTEGER,
  expires_at INTEGER,          -- Row TTL: auto-cleanup after 90 days
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE health_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  db_name TEXT NOT NULL,       -- 'global' or workspace hash
  file_size_bytes INTEGER NOT NULL,
  row_count INTEGER NOT NULL,
  free_pages INTEGER,
  page_count INTEGER
);

CREATE INDEX idx_global_memory_expires ON global_memory(expires_at);
CREATE INDEX idx_global_memory_workspace ON global_memory(workspace_path);
CREATE INDEX idx_health_metrics_db ON health_metrics(db_name, timestamp);
```

### Per-Workspace Database Schema (`workspace.db`)

```sql
CREATE TABLE chat_threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_pinned INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  total_tokens_in INTEGER DEFAULT 0,
  total_tokens_out INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  model TEXT
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  feedback TEXT CHECK(feedback IN ('up', 'down', NULL)),
  cost REAL,
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  response_time_ms INTEGER,
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
);

-- Images stored as REFERENCES to files, NOT inline base64
CREATE TABLE message_images (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  file_path TEXT NOT NULL,     -- Relative path in assets/
  mime_type TEXT NOT NULL,
  original_name TEXT,
  size_bytes INTEGER,
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
);

CREATE TABLE session_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),   -- Singleton row
  open_files TEXT,             -- JSON array of file paths
  active_file TEXT,
  editor_state TEXT,           -- JSON: {path: {line, col, scroll}}
  terminal_ids TEXT,           -- JSON array
  active_terminal_id INTEGER,
  active_thread_id TEXT,
  sidebar_open INTEGER DEFAULT 1,
  sidebar_width INTEGER DEFAULT 350,
  last_accessed INTEGER NOT NULL
);

CREATE TABLE kv_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER,          -- Row TTL for auto-cleanup
  size_bytes INTEGER NOT NULL  -- Track value size
);

CREATE TABLE codebase_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  symbols TEXT,                -- JSON array
  imports TEXT,                -- JSON array
  exports TEXT,                -- JSON array
  last_modified INTEGER NOT NULL,
  content_hash TEXT,
  indexed_at INTEGER NOT NULL
);

-- Indexes for query performance
CREATE INDEX idx_messages_thread ON chat_messages(thread_id, timestamp);
CREATE INDEX idx_kv_expires ON kv_store(expires_at);
CREATE INDEX idx_codebase_file_type ON codebase_index(file_type);
CREATE INDEX idx_codebase_file_path ON codebase_index(file_path);
```

---

## Anti-Bloat Guardrails (Lessons from Cursor)

### 1. Automatic Row Cleanup (TTL)

```typescript
// Run on every DB open + every 60 minutes while running
async function cleanupExpiredRows(db: Database): Promise<void> {
  const now = Date.now()
  db.run('DELETE FROM kv_store WHERE expires_at IS NOT NULL AND expires_at < ?', now)
  db.run('DELETE FROM global_memory WHERE expires_at IS NOT NULL AND expires_at < ?', now)
}
```

### 2. Database Size Monitoring

```typescript
const MAX_WORKSPACE_DB_SIZE = 100 * 1024 * 1024  // 100 MB per workspace
const MAX_GLOBAL_DB_SIZE = 50 * 1024 * 1024      // 50 MB global
const WARNING_THRESHOLD = 0.8                       // Warn at 80%

async function checkDbHealth(db: Database, maxSize: number): Promise<DbHealth> {
  const { page_count, page_size } = db.pragma('page_count')[0]
  const fileSize = page_count * page_size
  
  if (fileSize > maxSize) {
    // Emergency: drop oldest non-pinned threads, run incremental vacuum
    await emergencyPrune(db)
    db.pragma('incremental_vacuum(1000)')
  } else if (fileSize > maxSize * WARNING_THRESHOLD) {
    console.warn(`[DB] workspace.db at ${(fileSize/1024/1024).toFixed(1)}MB (${((fileSize/maxSize)*100).toFixed(0)}% of limit)`)
  }
  
  return { fileSize, maxSize, healthy: fileSize < maxSize }
}
```

### 3. Incremental Vacuum on Idle

```typescript
// Run when app is idle for 5+ minutes (not during active use)
function scheduleMaintenanceVacuum(db: Database): void {
  setInterval(() => {
    if (isAppIdle()) {
      db.pragma('incremental_vacuum(500)')  // Reclaim ~500 pages
      db.run('ANALYZE')                      // Update query planner stats
    }
  }, 5 * 60 * 1000)
}
```

### 4. KV Store Value Size Limit

```typescript
const MAX_KV_VALUE_SIZE = 1 * 1024 * 1024  // 1 MB per value

function kvSet(db: Database, key: string, value: string, ttlMs?: number): boolean {
  const sizeBytes = Buffer.byteLength(value, 'utf-8')
  if (sizeBytes > MAX_KV_VALUE_SIZE) {
    console.error(`[DB] KV value for "${key}" exceeds 1MB (${(sizeBytes/1024/1024).toFixed(1)}MB) — rejected`)
    return false
  }
  const expiresAt = ttlMs ? Date.now() + ttlMs : null
  db.run(
    'INSERT OR REPLACE INTO kv_store (key, value, updated_at, expires_at, size_bytes) VALUES (?, ?, ?, ?, ?)',
    key, value, Date.now(), expiresAt, sizeBytes
  )
  return true
}
```

### 5. Image Storage on Disk (NOT inline)

Unlike the current `threads.json` which stores base64 images inline:

```typescript
// WRONG (current): Store base64 in JSON — causes bloat
message.images = [{ base64: "iVBORw0KGgo..." }]  // 400KB per image!

// RIGHT (new): Store image file on disk, reference by path
const imagePath = `assets/${messageId}/${imageId}.png`
await fs.writeFile(path.join(workspaceDir, imagePath), imageBuffer)
db.run('INSERT INTO message_images (id, message_id, file_path, ...) VALUES (?, ?, ?, ...)')
```

---

## Migration Plan

### Phase 1: Add `better-sqlite3` Dependency

```bash
cd aibuddy-desktop && pnpm add better-sqlite3 && pnpm add -D @types/better-sqlite3
```

### Phase 2: Create DatabaseManager

```typescript
// src/db/database-manager.ts
class DatabaseManager {
  private globalDb: Database
  private workspaceDb: Map<string, Database>  // hash -> db
  
  openWorkspace(workspacePath: string): Database
  closeWorkspace(hash: string): void
  getGlobal(): Database
  runMaintenance(): void
  getHealth(): DbHealthReport
}
```

### Phase 3: Migrate Chat History

```typescript
// One-time migration: threads.json -> workspace.db
async function migrateThreadsToSQLite(threadsJson: ChatHistoryState): Promise<void> {
  for (const thread of threadsJson.threads) {
    const hash = getWorkspaceHash(thread.workspacePath || 'global')
    const db = dbManager.openWorkspace(thread.workspacePath || 'global')
    
    db.run('INSERT INTO chat_threads ...', thread)
    for (const msg of thread.messages) {
      db.run('INSERT INTO chat_messages ...', msg)
      // Extract images to disk
      if (msg.images) {
        for (const img of msg.images) {
          const filePath = saveImageToDisk(img.base64, hash, msg.id, img.id)
          db.run('INSERT INTO message_images ...', { ...img, file_path: filePath })
        }
      }
    }
  }
}
```

### Phase 4: Wire into Electron IPC

Replace `ChatHistoryManager` IPC calls with SQLite-backed versions.

### Phase 5: Session State Restoration

Save/restore open files, cursor positions, terminal state.

---

## Comparison: Cursor vs AIBuddy (After Implementation)

| Attribute | Cursor | AIBuddy Desktop |
|-----------|--------|-----------------|
| Database | 1 monolithic `state.vscdb` | Per-workspace `workspace.db` |
| Size control | None (grew to 80GB) | 100MB cap + auto-prune |
| Vacuum | Manual only | Auto incremental + idle vacuum |
| Row cleanup | None | TTL-based auto-expiry |
| Image storage | Base64 in DB | Files on disk |
| Monitoring | None | Health metrics table + console warnings |
| Recovery | Manual VACUUM + dump/restore | Auto-reset to defaults if corrupted |

---

## Dependencies

| Package | Purpose | Bundle Size |
|---------|---------|-------------|
| `better-sqlite3` | Native SQLite bindings | ~2MB (native addon) |
| `@types/better-sqlite3` | TypeScript types | Dev only |

Note: The extension uses `drizzle-orm/libsql` which is different. For Desktop, `better-sqlite3` 
is preferred because it's synchronous (simpler in Electron main process) and more battle-tested.

---

## Test Plan

TDD tests must cover:

1. **Database creation** — workspace.db created with correct schema
2. **WAL mode** — verify `PRAGMA journal_mode` returns `wal`
3. **Auto-vacuum** — verify `PRAGMA auto_vacuum` returns `2` (incremental)
4. **KV size rejection** — values over 1MB are rejected
5. **TTL cleanup** — expired rows are deleted
6. **Size monitoring** — warning at 80%, prune at 100%
7. **Image storage** — images saved to disk, not inline
8. **Migration** — threads.json successfully migrated to SQLite
9. **Session restore** — open files and cursor positions restored
10. **Concurrent access** — WAL handles read/write without blocking
11. **Corruption recovery** — corrupted DB recreated with warning
12. **Incremental vacuum** — file size decreases after vacuum

---

## Emergency: Free Locked DB to Prevent Crashes

If the database becomes locked or AIBuddy crashes due to DB contention:

```bash
# The cursor_db_swap script at /tmp/cursor_db_swap.sh can free a locked DB
# It performs a checkpoint, copies to temp, and swaps the DB file safely.
# Use when: AIBuddy or Cursor shows "database is locked" errors, or CPU spikes from WAL growth.

bash /tmp/cursor_db_swap.sh ~/.aibuddy/projects/<hash>/workspace.db
```

**Prevention built into the design:**
- WAL mode allows concurrent readers without blocking
- Incremental auto-vacuum prevents unbounded growth
- 100MB workspace cap triggers automatic pruning
- 50MB global cap triggers TTL cleanup
- Size monitoring at 80% threshold triggers warnings

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Schema design + anti-bloat guardrails | Design complete |
| Phase 2 | `better-sqlite3` integration + global.db | Not started |
| Phase 3 | Per-workspace DB creation + migration | Not started |
| Phase 4 | Thread/message migration from JSON | Not started |
| Phase 5 | Session restoration from SQLite | Not started |

**Dependency:** `better-sqlite3` must be added to `aibuddy-desktop/package.json`. electron-builder needs native module rebuild configuration.

---

## References

- Cursor crash reports: 80GB state.vscdb, 711 rows ItemTable, 1.2M cursorDiskKV
- Extension SQLite schema: `extension/src/db/schema.ts`
- Cursor Parity Roadmap: `aibuddy-desktop/docs/CURSOR_PARITY_ROADMAP.md`
- Anti-bloat protections: `aibuddy-desktop/tests/features/state-bloat-protection.test.ts`
- DB swap script: `/tmp/cursor_db_swap.sh` (emergency DB unlock)
- Electron App Stability: `ChatGPTIOS/docs/ELECTRON_APP_STABILITY_GUIDE.md`
- Modularization Guide: `aibuddy-desktop/docs/MODULARIZATION_GUIDE.md`

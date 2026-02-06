# AIBuddy Desktop - Cursor Parity Roadmap

**Last Updated:** January 29, 2026  
**Status:** Planning & TDD Tests Complete

---

## Executive Summary

This document outlines the features needed to bring AIBuddy Desktop to feature parity with Cursor IDE. The analysis is based on Cursor's internal workspace structure and behavior.

### Key Insight: Cursor's Workspace Management

Cursor stores workspace-specific data in:
```
~/.cursor/projects/{workspace-hash}/
```

Where `{workspace-hash}` is the workspace path with `/` replaced by `-`:
- Workspace: `/Users/tom/Documents/GitHub/iOS`
- Hash: `Users-tom-Documents-GitHub-iOS`

This directory contains:
- `agent-transcripts/` - AI conversation history
- `terminals/` - Terminal output and command history
- `assets/` - Generated images/screenshots
- `mcp-cache.json` - MCP server cache
- `session.json` - Session state

---

## Feature Comparison Matrix

| Feature | Cursor | AIBuddy Desktop | Priority | Status |
|---------|--------|-----------------|----------|--------|
| **Workspace Storage** | ✅ Per-workspace | ❌ Global | HIGH | 🔴 TODO |
| **Terminal Persistence** | ✅ Full history | ❌ Session only | HIGH | 🔴 TODO |
| **Workspace-Scoped Chat** | ✅ Per-workspace | ❌ Global | HIGH | 🔴 TODO |
| **Session Restoration** | ✅ Full state | ❌ Partial | MEDIUM | 🔴 TODO |
| **Codebase Indexing** | ✅ Semantic search | ❌ Not in Desktop | MEDIUM | 🔴 TODO |
| **Composer Mode** | ✅ Multi-file UI | ❌ Not in Desktop | MEDIUM | 🔴 TODO |
| **Model Selection** | ✅ Fast/Quality | ✅ Auto/Manual | - | ✅ DONE |
| **Chat History** | ✅ Full | ✅ Full | - | ✅ DONE |
| **Terminal Execution** | ✅ Full | ✅ Full | - | ✅ DONE |
| **Knowledge Base** | ✅ RAG | ✅ RAG | - | ✅ DONE |

---

## Phase 1: Workspace-Specific Storage (HIGH PRIORITY)

### Current State
- AIBuddy stores all data globally in `~/.aibuddy/`
- Chat history: `~/.aibuddy/history/threads.json`
- Settings: `~/.aibuddy-settings.json`

### Target State
```
~/.aibuddy/
├── settings.json              # Global settings
├── global-threads.json        # Threads not tied to workspace
└── projects/
    └── Users-tom-project/     # Per-workspace
        ├── metadata.json      # Workspace info
        ├── session.json       # Session state
        ├── threads/           # Chat threads
        │   └── thread-1.json
        ├── terminals/         # Terminal history
        │   └── 1.txt
        └── codebase.db        # Symbol index
```

### Implementation Steps
1. Create `WorkspaceStorageManager` class
2. Implement path hashing function
3. Add workspace detection on folder open
4. Migrate existing data to new structure
5. Update history manager to use workspace paths

### TDD Tests
- 25 tests in `tests/features/cursor-parity.test.ts`

---

## Phase 2: Terminal Output Persistence (HIGH PRIORITY)

### Current State
- Terminal output only exists during session
- Command history not persisted
- No terminal state restoration

### Target State
```typescript
// terminals/1.txt format (like Cursor)
---
pid: 12345
cwd: /Users/tom/project
last_command: npm test
last_exit_code: 0
---
$ npm install
Installing packages...
added 100 packages in 5s

$ npm test
> my-app@1.0.0 test
> vitest run
...
```

### Implementation Steps
1. Create `TerminalPersistence` class
2. Hook into terminal output events
3. Write to `terminals/{id}.txt` on output
4. Track command execution with exit codes
5. Restore terminal state on workspace open

### File Format
```typescript
interface TerminalFile {
  header: {
    pid: number
    cwd: string
    lastCommand: string
    lastExitCode: number
    running: boolean
    lastModified: number
  }
  commands: Array<{
    command: string
    exitCode: number
    timestamp: number
    duration?: number
  }>
  output: string
}
```

---

## Phase 3: Workspace-Scoped Chat History (HIGH PRIORITY)

### Current State
- All chat threads in single `threads.json`
- `workspacePath` field exists but not enforced
- No filtering by workspace

### Target State
- Threads stored in workspace directory
- Filter threads by current workspace
- Show global threads in all workspaces

### Implementation Steps
1. Add workspace filtering to `getThreads()`
2. Store new threads in workspace directory
3. Add "All Workspaces" filter option
4. Migrate existing threads on first access
5. Update HistorySidebar UI

### API Changes
```typescript
// Current
getThreads(): Promise<ChatThread[]>

// New
getThreads(options?: {
  workspacePath?: string
  includeGlobal?: boolean
}): Promise<ChatThread[]>
```

---

## Phase 4: Session State Restoration (MEDIUM PRIORITY)

### Current State
- Recent workspace saved
- No open files tracking
- No editor state restoration

### Target State
- Full session restoration on workspace open
- Open files with cursor positions
- Active terminal restoration
- Active chat thread restoration

### Session State Structure
```typescript
interface SessionState {
  workspacePath: string
  openFiles: string[]
  activeFile?: string
  editorState: {
    [path: string]: {
      cursorLine: number
      cursorColumn: number
      scrollTop: number
      selections: Selection[]
    }
  }
  terminalIds: number[]
  activeTerminalId?: number
  chatThreadId?: string
  sidebarOpen: boolean
  sidebarWidth: number
  lastAccessed: number
}
```

### Implementation Steps
1. Create `SessionManager` class
2. Save state on window close
3. Restore state on workspace open
4. Add "Restore Previous Session" prompt
5. Handle missing files gracefully

---

## Phase 5: Codebase Indexing (MEDIUM PRIORITY)

### Current State
- Extension has `codebase-indexer.ts`
- Desktop app has no indexing
- No semantic search UI

### Target State
- Background indexing on workspace open
- Symbol navigation panel
- Semantic search in chat
- Import/export tracking

### Port from Extension
```typescript
// Already in extension/src/agent/v1/memory/codebase-indexer.ts
class CodebaseIndexer {
  indexFile(filePath: string): Promise<void>
  searchSymbols(query: string): Promise<Symbol[]>
  findReferences(symbol: string): Promise<Reference[]>
  getFileOutline(filePath: string): Promise<Symbol[]>
}
```

### Implementation Steps
1. Port `CodebaseIndexer` to Desktop
2. Create SQLite database per workspace
3. Add background indexing on open
4. Implement file watcher for updates
5. Create symbol search UI

---

## Phase 6: Composer Mode (MEDIUM PRIORITY)

### Current State
- Extension has `MultiFileComposer`
- Desktop has no Composer UI
- No multi-file preview

### Target State
- Composer mode toggle
- Multi-file change preview
- Dependency-aware ordering
- Atomic apply/rollback

### Port from Extension
```typescript
// Already in extension/src/agent/v1/tools/composers/multi-file-composer.ts
class MultiFileComposer {
  plan(files: FileChange[]): ComposerPlan
  preview(plan: ComposerPlan): ChangePreview[]
  apply(plan: ComposerPlan): Promise<ApplyResult>
  rollback(plan: ComposerPlan): Promise<void>
}
```

### UI Components Needed
1. `ComposerPanel` - Main composer interface
2. `FileSelector` - Select files for editing
3. `ChangePreview` - Show diffs before applying
4. `ApplyProgress` - Progress indicator
5. `RollbackButton` - Undo changes

---

## Implementation Timeline

### Sprint 1 (Week 1-2): Foundation
- [ ] Implement `WorkspaceStorageManager`
- [ ] Create workspace path hashing
- [ ] Set up workspace directory structure
- [ ] Add workspace detection

### Sprint 2 (Week 3-4): Terminal & Chat
- [ ] Implement `TerminalPersistence`
- [ ] Migrate chat history to workspace
- [ ] Add workspace filtering
- [ ] Terminal state restoration

### Sprint 3 (Week 5-6): Session & Indexing
- [ ] Implement `SessionManager`
- [ ] Port `CodebaseIndexer`
- [ ] Add symbol search UI
- [ ] Background indexing

### Sprint 4 (Week 7-8): Composer
- [ ] Port `MultiFileComposer`
- [ ] Create Composer UI
- [ ] Implement preview/apply/rollback
- [ ] Integration testing

---

## Test Coverage

Current tests for Cursor parity features:
- **25 TDD tests** in `tests/features/cursor-parity.test.ts`
- Covers all 6 feature areas
- Ready for implementation

Run tests:
```bash
cd aibuddy-desktop && pnpm test tests/features/cursor-parity.test.ts
```

---

## References

- Cursor workspace structure: `~/.cursor/projects/`
- AIBuddy extension codebase indexer: `extension/src/agent/v1/memory/codebase-indexer.ts`
- AIBuddy extension composer: `extension/src/agent/v1/tools/composers/multi-file-composer.ts`
- Current history manager: `aibuddy-desktop/src/history/history-manager.ts`

---

## Questions for Product

1. **Migration**: Should we auto-migrate existing threads to workspace-specific storage?
2. **Global Threads**: Should users be able to create "global" threads visible in all workspaces?
3. **Session Prompt**: Should we prompt "Restore previous session?" or auto-restore?
4. **Indexing Scope**: Should we index `node_modules`? (Cursor doesn't by default)
5. **Composer Approval**: Should multi-file changes require explicit approval?

---

**Document Status:** Ready for implementation  
**Test Status:** 25 TDD tests passing  
**Next Action:** Begin Phase 1 implementation

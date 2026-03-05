# AIBuddy Desktop — Modularization Guide

**Created:** March 5, 2026
**Purpose:** Enable external developers to work on isolated logic modules without access to the full application. Developers can build and test their modules independently; reconstructing the full app from modules alone requires significant effort.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Security Model — What Stays Private](#security-model--what-stays-private)
3. [Module Map — What Can Be Shared](#module-map--what-can-be-shared)
4. [Isolation Strategy](#isolation-strategy)
5. [Package Extraction Plan](#package-extraction-plan)
6. [Developer Onboarding — External Contributor Setup](#developer-onboarding--external-contributor-setup)
7. [Git Repository Strategy](#git-repository-strategy)
8. [Adapter Pattern — Platform Decoupling](#adapter-pattern--platform-decoupling)
9. [Testing Requirements for Modules](#testing-requirements-for-modules)
10. [CI/CD for Modular Builds](#cicd-for-modular-builds)
11. [Module Boundary Enforcement](#module-boundary-enforcement)

---

## Architecture Overview

AIBuddy is a monorepo with two main apps and shared packages:

```
AICodingVS/                          ← Root monorepo (pnpm workspaces)
├── extension/                       ← VS Code Extension (~460 .ts files)
│   └── src/
│       ├── agent/v1/                ← AI Agent (tools, prompts, cognitive, planning)
│       ├── api/                     ← API providers (Anthropic, OpenAI, etc.)
│       ├── shared/                  ← Messages, constants, aibuddy API
│       ├── integrations/            ← Terminal, LSP, browser, editor
│       ├── parse-source-code/       ← Language parsers
│       └── utils/                   ← Sentry, Amplitude, fs, ripgrep
│
├── aibuddy-desktop/                 ← Desktop Electron App (separate Git submodule)
│   ├── electron/                    ← Main process + IPC handlers
│   │   └── ipc/                     ← commands, file-system, git, terminal, etc.
│   ├── renderer/                    ← React UI (App.tsx, components, hooks)
│   │   └── src/
│   │       ├── components/          ← AI Panel, Editor, History, Interview, etc.
│   │       ├── hooks/               ← useKnowledgeBase, useVoiceInput, etc.
│   │       └── lib/                 ← electron-bridge, response-parser, sentry
│   ├── src/                         ← Shared logic (adapters, agent, api, knowledge)
│   │   ├── adapters/                ← VS Code shims (context-adapter, terminal-adapter)
│   │   ├── agent/                   ← auto-mode-manager, smart-agent
│   │   ├── api/                     ← aibuddy-client
│   │   ├── constants/               ← urls, system-prompt
│   │   ├── core/                    ← agent-adapter, env-detector, git-handler
│   │   ├── history/                 ← history-manager
│   │   ├── knowledge/               ← document-parser, encryption, manager, ai-integration
│   │   └── services/                ← version-checker, web-research
│   └── tests/                       ← 146 test files, 3,445 tests
│
├── packages/                        ← Shared packages (npm workspaces)
│   ├── core/                        ← @aibuddy/core (AI client, detection, suggestions)
│   ├── prompts/                     ← @aibuddy/prompts (system prompts, TDD methodology)
│   ├── types/                       ← @aibuddy/types (shared TypeScript types)
│   └── ui/                          ← @aibuddy/ui (React components — planned)
│
└── aws-api/                         ← AWS Lambda backend (separate)
```

### Current Package Dependency Graph

```
@aibuddy/types          ← Zero dependencies (pure types)
    ↑
@aibuddy/prompts        ← depends on: dedent
    ↑
@aibuddy/core           ← depends on: @aibuddy/types
    ↑
extension/              ← depends on: @aibuddy/prompts (dynamic require of core)
aibuddy-desktop/        ← depends on: @aibuddy/prompts (workspace:*)
```

---

## Security Model — What Stays Private

### NEVER share with external developers

| Asset | Location | Risk |
|-------|----------|------|
| **AWS Infrastructure URLs** | `src/constants/urls.ts` (env vars) | Direct API access |
| **Sentry DSN** | `src/shared/sentry.ts`, `renderer/src/lib/sentry.ts` | Error data exposure |
| **Apple Signing Credentials** | CI secrets (`CSC_LINK`, `APPLE_TEAM_ID`, etc.) | Code signing compromise |
| **API Keys (user-stored)** | Electron `safeStorage` | User data theft |
| **Backend Lambda code** | `aws-api/`, `aibuddyapi/` | Full backend access |
| **WordPress integration** | Backend `handler.js` | Billing/credit system |
| **Electron main process** | `electron/main.ts` | Full app control |
| **IPC handlers** | `electron/ipc/` | File system, terminal access |
| **App.tsx** | `renderer/src/App.tsx` | Full app orchestration (5,300+ lines) |
| **CI/CD workflows** | `.github/workflows/` | Build pipeline |
| **`.env.local`** | Root | All secrets |

### Why this matters

Even with access to all the logic modules, an external developer cannot:
1. Run the app — they lack the Electron main process, IPC layer, and `App.tsx`
2. Connect to the backend — no AWS URLs, no API keys
3. Sign/notarize — no Apple credentials
4. Deploy — no CI/CD access
5. Access user data — no `safeStorage` keys

---

## Module Map — What Can Be Shared

### Tier 1: Safe to Extract (Zero secrets, pure logic)

| Module | Location | Lines | Purpose | Dependencies |
|--------|----------|-------|---------|--------------|
| **@aibuddy/types** | `packages/types/` | ~200 | Message, Queue, Project types | None |
| **@aibuddy/prompts** | `packages/prompts/` | ~1,500 | System prompts, TDD methodology, language-specific | `dedent` |
| **Knowledge Base** | `src/knowledge/` | ~800 | Document parsing, encryption, manager | Adapter interfaces |
| **History Manager** | `src/history/` | ~300 | Chat thread persistence | Adapter interfaces |
| **Response Parser** | `renderer/src/lib/response-parser.ts` | ~120 | Safe JSON parsing from API | None |
| **Document Parser** | `src/knowledge/document-parser.ts` | ~250 | PDF, text, code file parsing | None |
| **Encryption** | `src/knowledge/encryption.ts` | ~150 | AES-256 encryption for knowledge base | Node crypto |
| **Environment Detector** | `src/core/environment-detector.ts` | ~100 | Detect OS, platform, capabilities | None |
| **Version Checker** | `src/services/version-checker.ts` | ~100 | Compare semantic versions | None |

### Tier 2: Safe with Adapter Injection

| Module | Location | Lines | Needs Adapter For |
|--------|----------|-------|-------------------|
| **Smart Agent** | `src/agent/smart-agent.ts` | ~300 | AI client, file system |
| **Auto-Mode Manager** | `src/agent/auto-mode-manager.ts` | ~200 | Agent adapter |
| **Git Handler** | `src/core/git-handler.ts` | ~200 | Shell execution |
| **Web Research** | `src/services/web-research.ts` | ~150 | HTTP client |
| **AI Integration** | `src/knowledge/ai-integration.ts` | ~250 | AI client |

### Tier 3: Keep Private (App shell, secrets, infrastructure)

| Module | Reason |
|--------|--------|
| `electron/main.ts` | Full app entry, window management |
| `electron/ipc/*` | Direct file system, terminal, git access |
| `renderer/src/App.tsx` | Full app orchestration, API key handling |
| `src/constants/urls.ts` | AWS infrastructure endpoints |
| `src/api/aibuddy-client.ts` | Backend communication (uses secret URLs) |
| `src/shared/sentry.ts` | Sentry DSN, error tracking |
| `.github/workflows/` | CI/CD pipeline with signing secrets |

---

## Isolation Strategy

### The "Headless Module" Pattern

External developers work on **headless modules** — logic packages that:
1. Have **no UI** (no React components, no Electron APIs)
2. Accept **adapter interfaces** instead of concrete platform implementations
3. Are **fully testable** with mocked adapters
4. Ship as **npm packages** consumed by the private app shell

```
┌────────────────────────────────────────────────┐
│  PRIVATE (your repo only)                      │
│  ┌──────────────────────────────────────────┐  │
│  │ App Shell                                │  │
│  │ ├── electron/main.ts                     │  │
│  │ ├── electron/ipc/*                       │  │
│  │ ├── renderer/App.tsx                     │  │
│  │ ├── src/constants/urls.ts                │  │
│  │ ├── src/api/aibuddy-client.ts            │  │
│  │ └── .github/workflows/*                  │  │
│  └──────────────┬───────────────────────────┘  │
│                 │ imports                        │
│  ┌──────────────▼───────────────────────────┐  │
│  │ Adapter Implementations                  │  │
│  │ ├── src/adapters/context-adapter.ts      │  │
│  │ ├── src/adapters/terminal-adapter.ts     │  │
│  │ └── src/adapters/vscode-shim.ts          │  │
│  └──────────────┬───────────────────────────┘  │
└─────────────────┼──────────────────────────────┘
                  │ implements interfaces from
┌─────────────────▼──────────────────────────────┐
│  SHARED (external dev can access)              │
│  ┌──────────────────────────────────────────┐  │
│  │ @aibuddy/logic                           │  │
│  │ ├── knowledge/   (doc parser, encryption)│  │
│  │ ├── history/     (thread manager)        │  │
│  │ ├── agent/       (smart agent, auto-mode)│  │
│  │ ├── parsers/     (response-parser)       │  │
│  │ ├── core/        (env-detector, version) │  │
│  │ └── interfaces/  (adapter contracts)     │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ @aibuddy/prompts                         │  │
│  │ └── (system prompts, TDD methodology)    │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │ @aibuddy/types                           │  │
│  │ └── (shared TypeScript types)            │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

### What the external developer CANNOT do (by design)

1. **Cannot run the app** — No `electron/main.ts`, no `App.tsx`, no IPC handlers
2. **Cannot call the backend** — No AWS URLs (loaded from env vars they don't have)
3. **Cannot sign/deploy** — No Apple credentials, no CI workflows
4. **Cannot see user data** — No `safeStorage`, no Sentry DSN
5. **Cannot reconstruct the app** — Would need to:
   - Write an entire Electron main process from scratch
   - Build a 5,300-line React app shell from scratch
   - Discover/configure AWS infrastructure URLs
   - Implement the full IPC layer (8 handler files)
   - Build CI/CD with Apple signing
   - That's 6-12 months of work minimum

### What the external developer CAN do

1. **Improve knowledge base logic** — parsing, encryption, search, AI integration
2. **Improve chat history** — persistence, search, export, threading
3. **Improve agent logic** — planning, tool selection, auto-mode strategies
4. **Improve response parsing** — error handling, streaming, edge cases
5. **Add language support** — new language-specific prompts
6. **Run all module tests** — `pnpm test` works on the shared package

---

## Package Extraction Plan

### Phase 1: Create `@aibuddy/logic` (New Package)

Extract from `aibuddy-desktop/src/` into `packages/logic/`:

```
packages/logic/
├── src/
│   ├── interfaces/           ← Adapter contracts (NEW)
│   │   ├── ai-client.ts      ← IAIClient interface
│   │   ├── file-system.ts    ← IFileSystem interface
│   │   ├── terminal.ts       ← ITerminal interface
│   │   ├── secret-store.ts   ← ISecretStore interface
│   │   └── index.ts
│   │
│   ├── knowledge/            ← FROM src/knowledge/
│   │   ├── document-parser.ts
│   │   ├── encryption.ts
│   │   ├── manager.ts
│   │   ├── ai-integration.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── history/              ← FROM src/history/
│   │   ├── history-manager.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── agent/                ← FROM src/agent/
│   │   ├── smart-agent.ts
│   │   ├── auto-mode-manager.ts
│   │   └── index.ts
│   │
│   ├── parsers/              ← FROM renderer/src/lib/
│   │   ├── response-parser.ts
│   │   └── index.ts
│   │
│   ├── core/                 ← FROM src/core/ (safe parts only)
│   │   ├── environment-detector.ts
│   │   └── index.ts
│   │
│   ├── services/             ← FROM src/services/ (safe parts only)
│   │   ├── version-checker.ts
│   │   └── index.ts
│   │
│   └── index.ts              ← Public API
│
├── tests/                    ← All tests for the package
│   ├── knowledge/
│   ├── history/
│   ├── agent/
│   ├── parsers/
│   └── core/
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md                 ← Developer guide for this package
```

### Phase 2: Define Adapter Interfaces

```typescript
// packages/logic/src/interfaces/ai-client.ts
export interface IAIClient {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>
  validateKey(key: string): Promise<{ valid: boolean; credits?: number }>
}

// packages/logic/src/interfaces/file-system.ts
export interface IFileSystem {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
  readDir(path: string): Promise<string[]>
  stat(path: string): Promise<FileStat>
}

// packages/logic/src/interfaces/terminal.ts
export interface ITerminal {
  execute(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }>
}

// packages/logic/src/interfaces/secret-store.ts
export interface ISecretStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}
```

### Phase 3: Wire App Shell to Package

```typescript
// aibuddy-desktop/src/adapters/logic-wiring.ts (PRIVATE — stays in main repo)
import { KnowledgeManager, HistoryManager } from '@aibuddy/logic'
import { ElectronFileSystem } from './electron-fs-adapter'
import { ElectronSecretStore } from './electron-secret-adapter'
import { AIBuddyClient } from '../api/aibuddy-client'

// Inject real implementations into logic modules
export const knowledgeManager = new KnowledgeManager({
  fileSystem: new ElectronFileSystem(),
  aiClient: new AIBuddyClient(),
  secretStore: new ElectronSecretStore(),
})

export const historyManager = new HistoryManager({
  fileSystem: new ElectronFileSystem(),
})
```

---

## Developer Onboarding — External Contributor Setup

### What they receive

1. Access to `packages/logic/` repository (or a filtered fork)
2. Access to `packages/types/` (read-only or bundled)
3. Access to `packages/prompts/` (read-only or bundled)
4. A `README.md` with setup instructions
5. A `vitest.config.ts` for running tests
6. Mock adapter implementations for local testing

### Setup instructions for external dev

```bash
# Clone the logic package repo
git clone https://github.com/ThomasWDev/aibuddy-logic.git
cd aibuddy-logic

# Install dependencies
pnpm install

# Run tests (all should pass)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### They cannot

- `pnpm dev` (no app to start)
- Access any AWS endpoint (no URLs)
- See any UI code (no React components)
- Deploy anything (no CI/CD)

---

## Git Repository Strategy

### Option A: Separate Repo per Package (Recommended) — IMPLEMENTED

All repos created on GitHub (March 5, 2026):

| Repo | URL | Visibility | Status | Content |
|------|-----|------------|--------|---------|
| **aibuddy-logic** | https://github.com/ThomasWDev/aibuddy-logic | PRIVATE | ✅ Created + pushed | Interfaces, response parser, env detector, scaffolding for knowledge/history/agent/services |
| **aibuddy-types** | https://github.com/ThomasWDev/aibuddy-types | PRIVATE | ✅ Created + pushed | Shared TypeScript type definitions |
| **aibuddy-prompts** | https://github.com/ThomasWDev/aibuddy-prompts | PRIVATE | ✅ Created + pushed | System prompts, TDD methodology, language-specific prompts |
| **aibuddy-desktop** | https://github.com/ThomasWDev/aibuddy-desktop | PUBLIC | ✅ Existing | Desktop Electron app (app shell) |
| **AICodingVS** | https://github.com/Thomas-Woodfin/AICodingVS | PRIVATE | ✅ Existing | Root monorepo (extension + desktop + packages) |

**To grant external developer access:**

```bash
# Give external dev collaborator access to logic (read/write)
gh api repos/ThomasWDev/aibuddy-logic/collaborators/GITHUB_USERNAME -X PUT -f permission=push

# Give external dev read-only access to types and prompts
gh api repos/ThomasWDev/aibuddy-types/collaborators/GITHUB_USERNAME -X PUT -f permission=pull
gh api repos/ThomasWDev/aibuddy-prompts/collaborators/GITHUB_USERNAME -X PUT -f permission=pull

# NEVER give access to aibuddy-desktop or AICodingVS
```

**Benefits:**
- Granular access control per repo
- External dev sees ONLY logic code
- Can use GitHub branch protection + PR reviews
- CI runs only on the logic package

**How it connects:**
- Main monorepo uses `pnpm workspace:` to pull `@aibuddy/logic` (or git submodule)
- External dev opens PRs against `aibuddy-logic`
- You review, merge, and update the submodule/dependency in the main repo

### Option B: Filtered Fork with `.gitattributes` (Alternative)

Use `git filter-repo` to create a stripped fork:

```bash
git clone AICodingVS aibuddy-external
cd aibuddy-external
git filter-repo --path packages/logic --path packages/types --path packages/prompts
```

**Benefits:** Simpler (one repo), no submodule management
**Risks:** Harder to keep in sync; risk of accidentally exposing private files

### Option C: Monorepo with CODEOWNERS (Not Recommended)

Use GitHub CODEOWNERS to restrict who can modify which paths:

```
# .github/CODEOWNERS
*                           @ThomasWDev
packages/logic/             @ThomasWDev @external-dev
```

**Benefits:** No submodules, easy setup
**Risks:** External dev can still READ all code (GitHub doesn't support path-level read restrictions)

### Recommendation

**Option A is implemented.** It is the only approach that truly prevents the external developer from seeing the full app. Options B and C still expose code at the repo level.

---

## Adapter Pattern — Platform Decoupling

The adapter pattern is the foundation of safe modularization. Every module accepts interfaces, never concrete implementations.

### Example: Knowledge Manager (before vs after)

**BEFORE (tightly coupled):**
```typescript
// src/knowledge/manager.ts — imports Electron directly
import { app } from 'electron'
import * as fs from 'fs'
import { AIBuddyClient } from '../api/aibuddy-client'

export class KnowledgeManager {
  private basePath = app.getPath('userData')
  
  async parseDocument(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8')  // Direct fs
    const summary = await AIBuddyClient.summarize(content) // Direct API
    return summary
  }
}
```

**AFTER (adapter-injected):**
```typescript
// packages/logic/src/knowledge/manager.ts — pure interfaces
import { IFileSystem, IAIClient } from '../interfaces'

export class KnowledgeManager {
  constructor(
    private fs: IFileSystem,
    private ai: IAIClient,
    private basePath: string
  ) {}
  
  async parseDocument(filePath: string) {
    const content = await this.fs.readFile(filePath)
    const summary = await this.ai.chat([{ role: 'user', content: `Summarize: ${content}` }])
    return summary
  }
}
```

---

## Testing Requirements for Modules

### Rule: Every module must be 100% testable with mock adapters

```typescript
// packages/logic/tests/knowledge/manager.test.ts
import { KnowledgeManager } from '../../src/knowledge/manager'
import { IFileSystem, IAIClient } from '../../src/interfaces'

const mockFs: IFileSystem = {
  readFile: async (path) => 'mock document content',
  writeFile: async () => {},
  exists: async () => true,
  readDir: async () => ['file1.md', 'file2.txt'],
  stat: async () => ({ size: 1024, isDirectory: false, mtime: Date.now() }),
}

const mockAI: IAIClient = {
  chat: async () => ({ content: 'Summary of document', model: 'mock', tokens: 10 }),
  stream: async function* () { yield { content: 'chunk', done: false } },
  validateKey: async () => ({ valid: true, credits: 100 }),
}

describe('KnowledgeManager', () => {
  it('parses document using injected adapters', async () => {
    const km = new KnowledgeManager(mockFs, mockAI, '/tmp/test')
    const result = await km.parseDocument('test.md')
    expect(result.content).toBeDefined()
  })
})
```

### Test structure requirements

- Every public function must have at least 3 tests (happy path, error case, edge case)
- ZOMBIES methodology for bug-fix tests
- Mock adapters only — never import platform-specific code
- Tests must run without Electron, VS Code, or any platform SDK

---

## CI/CD for Modular Builds

### For the logic package (external dev's CI)

```yaml
# .github/workflows/ci.yml (in aibuddy-logic repo)
name: Logic Package CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test --coverage
      - name: Fail if coverage drops below 90%
        run: |
          COVERAGE=$(pnpm test --coverage --reporter=json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 90" | bc -l) )); then
            echo "Coverage dropped below 90%: $COVERAGE%"
            exit 1
          fi
```

### For the main app (your CI — unchanged)

The main CI already runs `pnpm test` in `aibuddy-desktop/` which picks up all tests. After extracting to `@aibuddy/logic`, the main CI adds:

```yaml
- name: Test logic package
  run: pnpm --filter @aibuddy/logic test
```

---

## Module Boundary Enforcement

### Automated tests to prevent leaks

The test file `tests/electron/module-boundary.test.ts` enforces that:

1. Logic modules never import from `electron/`, `renderer/`, or platform-specific code
2. No secrets (URLs, DSNs, API keys) appear in shared package source
3. Adapter interfaces have no concrete implementations in the logic package
4. All public functions in logic modules accept interfaces, not concrete types

These tests run in CI and block merges that violate module boundaries.

---

## Implementation Timeline

| Phase | Scope | Effort | Prerequisite |
|-------|-------|--------|-------------|
| **Phase 0** (Now) | Create `interfaces/` with adapter contracts, write boundary tests | 1 day | None |
| **Phase 1** | Extract `knowledge/`, `history/`, `parsers/` to `@aibuddy/logic` | 2-3 days | Phase 0 |
| **Phase 2** | Extract `agent/`, `core/`, `services/` | 2-3 days | Phase 1 |
| **Phase 3** | Create separate `aibuddy-logic` repo, set up CI | 1 day | Phase 2 |
| **Phase 4** | Onboard external developer, document contribution workflow | 1 day | Phase 3 |

**Total estimated time: 7-9 days**

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| External dev pushes breaking changes | PR review required; CI gates all merges |
| Secret accidentally committed to logic repo | Pre-commit hook scans for AWS URLs, DSNs, API keys |
| Module boundary violation | Automated boundary tests in CI |
| Performance regression from adapter indirection | Benchmark tests for hot paths (response parsing, history lookup) |
| External dev reverse-engineers app architecture | Logic modules are intentionally incomplete — no UI, no IPC, no main process |

---

## Quick Reference: Commands

```bash
# Run all logic package tests
cd packages/logic && pnpm test

# Run with coverage
cd packages/logic && pnpm test --coverage

# Type check
cd packages/logic && pnpm typecheck

# Run boundary enforcement tests
cd aibuddy-desktop && pnpm vitest run tests/electron/module-boundary.test.ts

# Full app test suite (owner only)
cd aibuddy-desktop && pnpm test
```

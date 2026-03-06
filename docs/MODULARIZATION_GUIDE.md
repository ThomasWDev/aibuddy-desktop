# AIBuddy Desktop — Modularization Guide

**Created:** March 5, 2026  
**Last Updated:** March 6, 2026  
**Purpose:** Enable external developers to work on isolated logic modules without access to the full application. Developers can build and test their modules independently; reconstructing the full app from modules alone requires significant effort.

---

## Table of Contents

1. [New Developer Quick Start](#new-developer-quick-start)
2. [Architecture Overview](#architecture-overview)
3. [How to Update a Shared Package](#how-to-update-a-shared-package)
4. [How to Update the Main Repo with Latest Packages](#how-to-update-the-main-repo-with-latest-packages)
5. [Automatic Release Pipeline](#automatic-release-pipeline)
6. [Security Model — What Stays Private](#security-model--what-stays-private)
7. [Module Map — What Can Be Shared](#module-map--what-can-be-shared)
8. [Isolation Strategy](#isolation-strategy)
9. [Package Extraction Plan](#package-extraction-plan)
10. [Developer Onboarding — External Contributor Setup](#developer-onboarding--external-contributor-setup)
11. [Git Repository Strategy](#git-repository-strategy)
12. [Adapter Pattern — Platform Decoupling](#adapter-pattern--platform-decoupling)
13. [Testing Requirements for Modules](#testing-requirements-for-modules)
14. [CI/CD for Modular Builds](#cicd-for-modular-builds)
15. [Module Boundary Enforcement](#module-boundary-enforcement)
16. [Related Documentation](#related-documentation)

---

## New Developer Quick Start

### Prerequisites

- **Node.js 20+** (LTS)
- **pnpm 9+** (`npm install -g pnpm`)
- macOS for desktop builds (code signing + notarization requires Apple tools)
- Git configured with your real name/email (never commit as an AI tool)

### First-time Setup

```bash
git clone git@github.com:Thomas-Woodfin/AICodingVS.git
cd AICodingVS
pnpm install                          # Installs all workspace packages

# Build shared packages FIRST (order matters)
cd packages/types && pnpm build       # @aibuddy/types
cd ../prompts && pnpm build           # @aibuddy/prompts (depends on types)
cd ../core && pnpm build              # @aibuddy/core (depends on types)

# Run tests to verify setup
cd ../../extension && pnpm test:unit  # Extension unit tests
cd ../aibuddy-desktop && pnpm test    # Desktop unit tests
cd ../aws-api && npx jest --forceExit # API tests
```

### Repository Layout

```
AICodingVS/                              Root monorepo (pnpm workspaces)
|-- extension/                           VS Code Extension (ships to Marketplace)
|-- aibuddy-desktop/                     Electron Desktop App (ships to App Store + downloads)
|   |-- electron/                        Main process (IPC handlers)
|   |-- renderer/                        React UI (App.tsx, components, hooks)
|   |-- src/                             Shared logic (adapters, agent, knowledge)
|   |-- tests/                           Vitest tests (5,199 — verified Mar 6, 2026)
|   +-- packages/prompts/                Local copy of @aibuddy/prompts
|-- packages/                            Shared packages (pnpm workspace:*)
|   |-- core/                            @aibuddy/core (202 tests, 17 source files)
|   |-- prompts/                         @aibuddy/prompts (system prompts — synced with external repo)
|   |-- types/                           @aibuddy/types (TypeScript types — synced with external repo)
|   +-- ui/                              @aibuddy/ui (React components, planned)
|-- aws-api/                             Lambda API backend (Jest, 186 tests)
|-- .github/workflows/                   CI/CD (5 workflows)
+-- docs/                                Cross-project documentation
```

### Key Docs Index

| Doc | Path | Covers |
|-----|------|--------|
| **This guide** | `aibuddy-desktop/docs/MODULARIZATION_GUIDE.md` | Packages, architecture, external contributors |
| **Desktop App Guide** | `aibuddy-desktop/DESKTOP_APP_GUIDE.md` | Build, run, debug the Electron app |
| **Shared Code Architecture** | `aibuddy-desktop/SHARED_CODE_ARCHITECTURE.md` | How code is shared between extension + desktop |
| **Local Database** | `aibuddy-desktop/docs/LOCAL_DATABASE_ARCHITECTURE.md` | SQLite per-workspace DB design |
| **Cursor Parity Roadmap** | `aibuddy-desktop/docs/CURSOR_PARITY_ROADMAP.md` | Feature roadmap for Cursor-level parity |
| **E2E Testing Kit** | `docs/E2E_TESTING_KIT.md` | All test suites, smoke tests, CI integration |
| **CI/CD Secrets** | `docs/CI_CD_SECRETS_REFERENCE.md` | GitHub Actions secrets, SSH keys, Apple certs |
| **API V2 Docs** | `aibuddyapi/API_V2_DOCUMENTATION.md` | Lambda API endpoints, auth, smart routing |
| **Release Process** | `docs/RELEASE_PROCESS.md` | Step-by-step release checklist |
| **Store Submission** | `aibuddy-desktop/STORE_SUBMISSION_GUIDE.md` | Mac App Store, Microsoft Store, Snap Store |
| **Backend Migration** | `BACKEND_MIGRATION.md` | WordPress to AWS Lambda migration history |
| **Known Issues** | `KNOWN_ISSUES.md` | All resolved/open issues with version history |
| **Apple API** | `docs/APPLE_APPSTORE_CONNECT_API.md` | App Store Connect, RevenueCat, Google Play |
| **Security Findings** | `CompassCare-Documentation/AIBUDDY_SECURITY_FINDINGS.md` | AWS account isolation, SSM, IAM |

---

## How to Update a Shared Package

When you add a feature or fix a bug in a shared package (`@aibuddy/prompts`, `@aibuddy/core`, `@aibuddy/types`), follow this workflow:

### Step 1: Make your changes

```bash
cd packages/prompts              # or packages/core, packages/types
# Edit source files in src/
```

### Step 2: Write tests first (TDD)

```bash
pnpm test                        # Run existing tests
# Write new tests for your feature
pnpm test                        # Confirm they fail (RED)
# Implement the feature
pnpm test                        # Confirm they pass (GREEN)
```

### Step 3: Build the package

```bash
pnpm build                       # tsup compiles to dist/ (cjs + esm + dts)
```

### Step 4: Test consumers

The extension and desktop app use `workspace:*` to link to packages. After building, verify they still work:

```bash
cd ../../extension && pnpm test:unit     # Extension picks up changes via workspace link
cd ../aibuddy-desktop && pnpm test       # Desktop picks up changes
```

### Step 5: Commit with ticket number

```bash
git add -A
git commit -m "KAN-XXX: Description of the change"
```

### Package Build Order (dependencies flow top-down)

```
1. @aibuddy/types     (no deps)       pnpm --filter @aibuddy/types build
2. @aibuddy/prompts   (depends: dedent) pnpm --filter @aibuddy/prompts build
3. @aibuddy/core      (peer: types)    pnpm --filter @aibuddy/core build
4. extension          (uses: prompts)  cd extension && pnpm compile
5. aibuddy-desktop    (uses: prompts)  cd aibuddy-desktop && pnpm build
```

---

## How to Update the Main Repo with Latest Packages

### For changes within the monorepo (most common)

Changes to `packages/*` are already part of the monorepo. pnpm workspaces automatically link them. Just commit, push to `main`, and the CI handles the rest.

```bash
# After making changes to packages/prompts + aibuddy-desktop
git add -A
git commit -m "KAN-XXX: Update prompts for new feature"
git push origin main             # Triggers automatic release pipeline
```

### For changes from external repos (aibuddy-logic, aibuddy-types, aibuddy-prompts)

External contributors push to separate repos. To pull their changes into the main monorepo:

```bash
# Option A: If using git submodule
cd packages/logic
git pull origin main
cd ../..
git add packages/logic
git commit -m "KAN-XXX: Update logic package from external PR"

# Option B: If using npm/pnpm package
pnpm update @aibuddy/logic       # Pulls latest version
pnpm test                        # Verify nothing broke
git commit -am "KAN-XXX: Update @aibuddy/logic to vX.Y.Z"
```

### Version Bump Rule

**Extension and Desktop versions MUST match.** Before pushing to main:

```bash
# Check current versions
node -e "console.log(require('./extension/package.json').version)"
node -e "console.log(require('./aibuddy-desktop/package.json').version)"

# If they don't match, bump both to the same version
cd extension && npm version patch --no-git-tag-version
cd ../aibuddy-desktop && npm version patch --no-git-tag-version
```

---

## Automatic Release Pipeline

When you push to `main` (or `master`), GitHub Actions automatically builds, tests, signs, and deploys everything.

### What Happens on Push to Main

```
Push to main
     |
     v
Phase 1: TESTS (parallel)
     |-- test-api         Jest tests for Lambda API (aws-api/)
     |-- test-extension   TypeScript check + Vitest unit tests
     +-- test-desktop     TypeScript check + Vitest unit tests
     |
     v (all tests must pass)
Phase 2: READ VERSION
     |-- Reads version from extension/package.json and aibuddy-desktop/package.json
     +-- Both MUST match
     |
     v
Phase 3: BUILD + PUBLISH (parallel)
     |-- publish-extension      Build VSIX -> publish to VS Code Marketplace
     |-- build-desktop-mac      macOS DMGs (ARM64 + x64) + MAS .pkg, signed + notarized
     |-- build-desktop-linux    AppImage + deb
     +-- build-desktop-windows  exe + msi
     |
     v
Phase 4: DEPLOY (parallel)
     |-- deploy-servers         SSH to Denver (3.132.25.123) + aibuddy.life (SiteGround)
     |-- create-github-release  GitHub Release with all platform artifacts
     +-- upload-app-store       MAS .pkg to App Store Connect / TestFlight
     |
     v
Phase 5: SUMMARY
     +-- Prints release summary with all URLs and versions
```

### Where Everything Gets Deployed

| Target | URL / Location | Deployed By |
|--------|----------------|-------------|
| **VS Code Marketplace** | `AIBuddyStudio.AIBuddy` | `vsce publish` (needs `VSCE_PAT`) |
| **GitHub Releases** | `github.com/Thomas-Woodfin/AICodingVS/releases` | `softprops/action-gh-release` |
| **Denver Downloads** | `denvermobileappdeveloper.com/downloads/aibuddy-desktop/` | SSH SCP to `3.132.25.123` |
| **aibuddy.life Downloads** | `aibuddy.life/downloads/latest/` | SSH SCP to SiteGround (port 18765) |
| **App Store Connect** | TestFlight / Mac App Store | `xcrun altool --upload-app` |

### Required GitHub Secrets

| Secret | Purpose | Status |
|--------|---------|--------|
| `MAC_CERTS_BASE64` | macOS code signing .p12 (base64) | Set |
| `MAC_CERTS_PASSWORD` | .p12 password | Set |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Set |
| `APPLE_ID` | Apple ID for notarization | Set |
| `APP_STORE_AUTH_KEY` | App Store Connect .p8 key (base64) | Set |
| `APP_STORE_KEY_ID` | App Store Connect Key ID | Set |
| `APP_STORE_ISSUER_ID` | App Store Connect Issuer ID | Set |
| `MAS_PROVISION_PROFILE` | Main app MAS provisioning profile | Set |
| `MAS_HELPERS_PROVISION_PROFILE` | Helper bundles MAS provisioning profile | Set |
| `DENVER_SSH_KEY` | SSH to Denver EC2 | Set |
| `AIBUDDY_SSH_KEY` | SSH to aibuddy.life SiteGround | Set |
| `VSCE_PAT` | VS Code Marketplace token | **Needs rotation** |

Full secret docs: `docs/CI_CD_SECRETS_REFERENCE.md`

### Workflow Files

| File | Trigger | What It Does |
|------|---------|-------------|
| `.github/workflows/release-on-master.yml` | Push to main | Full release pipeline (tests + build + deploy) |
| `.github/workflows/ci.yml` | PR to main | Tests only (extension + desktop + API) |
| `.github/workflows/deploy-extension.yml` | Manual | Publish extension to VS Code Marketplace |
| `.github/workflows/deploy-desktop.yml` | Tag `desktop-v*` / Manual | Build desktop + GitHub Release + App Store |
| `.github/workflows/deploy-denver.yml` | Manual | Denver site deploy via Capistrano |

### Known CI Issues

| Issue | Workaround |
|-------|------------|
| `VSCE_PAT` expired | Manual publish: `cd extension && vsce publish` |
| aibuddy.life SSH timeout | SiteGround firewall blocks GitHub IPs; manual SCP upload |
| App Store duplicate version | Auto-skipped; bump version in both package.json files |

---

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

1. Push access to **3 GitHub repos**: `aibuddy-logic`, `aibuddy-types`, `aibuddy-prompts`
2. Comprehensive `README.md` in each repo with TDD workflow, adapter pattern docs, and PR checklist
3. `vitest.config.ts` for running tests locally
4. Mock adapter examples for testing without any platform SDK
5. Assigned Jira tickets on the [Hire Programmers board](https://hire-programmers-team.atlassian.net)

### Setup instructions for external dev

```bash
# 1. Accept GitHub invitations (check email or github.com/notifications)

# 2. Clone all 3 repos
git clone https://github.com/ThomasWDev/aibuddy-logic.git
git clone https://github.com/ThomasWDev/aibuddy-types.git
git clone https://github.com/ThomasWDev/aibuddy-prompts.git

# 3. Install dependencies (each repo)
cd aibuddy-logic && pnpm install && pnpm test
cd ../aibuddy-types && pnpm install && pnpm typecheck
cd ../aibuddy-prompts && pnpm install && pnpm test

# 4. Check your Jira tickets
# Go to: https://hire-programmers-team.atlassian.net/jira/software/projects/KAN/board
# Filter by "Assignee = EH Tamvir"
```

### TDD workflow (required for all changes)

1. **RED** — Write a failing test in `tests/`
2. **GREEN** — Write minimum code in `src/` to pass
3. **REFACTOR** — Clean up while tests stay green
4. Create a PR with branch name `fix/KAN-XXX-description`
5. Every PR must pass: `pnpm test && pnpm typecheck`

### Jira workflow

1. Pick a ticket from "To Do" → move to "In Progress"
2. When fix is ready, move to **"In Review"** (NEVER "Done" — QA does that)
3. Add a comment with: root cause, fix description, test count, commit hash

### They cannot

- `pnpm dev` (no app to start)
- Access any AWS endpoint (no URLs)
- See any UI code (no React components)
- Deploy anything (no CI/CD)
- Access `aibuddy-desktop` or `AICodingVS` repos

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

### Active Collaborators

| GitHub User | Email | Jira Name | Access | Added |
|-------------|-------|-----------|--------|-------|
| **[@mtamvir](https://github.com/mtamvir)** | mtamvir@gmail.com | EH Tamvir (accountId: `5c519941c0567a194bdd5acc`) | push (all 3 repos) | March 5, 2026 |

**Invitation status:** All 3 repo invitations sent. Developer must accept via GitHub notification or email.

### Assigned Jira Tickets

| Ticket | Summary | Priority | Relates To |
|--------|---------|----------|------------|
| **KAN-185** | [Mac] Live Audio in Interview Mode Not Detecting Voice Input | High | `@aibuddy/logic` — audio/transcription parsing |
| **KAN-273** | [Mac] Transcription Error After Stopping Live Audio | Highest | `@aibuddy/logic` — response parser |
| **KAN-283** | Implement Skills Engine for Prompt Injection | Medium | `@aibuddy/prompts` — prompt composition |

### Commands used to grant access

```bash
# Push (read/write) access to all 3 module repos
gh api repos/ThomasWDev/aibuddy-logic/collaborators/mtamvir -X PUT -f permission=push
gh api repos/ThomasWDev/aibuddy-types/collaborators/mtamvir -X PUT -f permission=push
gh api repos/ThomasWDev/aibuddy-prompts/collaborators/mtamvir -X PUT -f permission=push

# NEVER give access to aibuddy-desktop or AICodingVS
```

**To add future developers:**

```bash
gh api repos/ThomasWDev/aibuddy-logic/collaborators/GITHUB_USERNAME -X PUT -f permission=push
gh api repos/ThomasWDev/aibuddy-types/collaborators/GITHUB_USERNAME -X PUT -f permission=push
gh api repos/ThomasWDev/aibuddy-prompts/collaborators/GITHUB_USERNAME -X PUT -f permission=push
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
# Build all shared packages (order matters)
pnpm --filter @aibuddy/types build
pnpm --filter @aibuddy/prompts build
pnpm --filter @aibuddy/core build

# Run all logic package tests
cd packages/core && pnpm test

# Run with coverage
cd packages/core && pnpm test --coverage

# Type check
cd packages/core && pnpm typecheck

# Run boundary enforcement tests
cd aibuddy-desktop && pnpm vitest run tests/electron/module-boundary.test.ts

# Full app test suite (owner only)
cd aibuddy-desktop && pnpm test

# Extension tests
cd extension && pnpm test:unit

# API tests (Lambda backend)
cd aws-api && npx jest --forceExit

# Build everything for release
cd extension && pnpm build:ci           # Extension: tests + VSIX
cd aibuddy-desktop && pnpm build:ci     # Desktop: tests + Electron build
```

---

## Related Documentation

| Category | Document | Path |
|----------|----------|------|
| **Architecture** | Shared Code Architecture | `aibuddy-desktop/SHARED_CODE_ARCHITECTURE.md` |
| **Architecture** | Local Database Architecture | `aibuddy-desktop/docs/LOCAL_DATABASE_ARCHITECTURE.md` |
| **Architecture** | Cursor Parity Roadmap | `aibuddy-desktop/docs/CURSOR_PARITY_ROADMAP.md` |
| **Architecture** | Backend Migration | `BACKEND_MIGRATION.md` |
| **Build/Deploy** | Desktop App Guide | `aibuddy-desktop/DESKTOP_APP_GUIDE.md` |
| **Build/Deploy** | Store Submission Guide | `aibuddy-desktop/STORE_SUBMISSION_GUIDE.md` |
| **Build/Deploy** | CI/CD Secrets Reference | `docs/CI_CD_SECRETS_REFERENCE.md` |
| **Build/Deploy** | Release Process | `docs/RELEASE_PROCESS.md` |
| **Testing** | E2E Testing Kit | `docs/E2E_TESTING_KIT.md` |
| **API** | API V2 Documentation | `aibuddyapi/API_V2_DOCUMENTATION.md` |
| **API** | Apple App Store Connect API | `docs/APPLE_APPSTORE_CONNECT_API.md` |
| **Security** | Security Findings | `CompassCare-Documentation/AIBUDDY_SECURITY_FINDINGS.md` |
| **Operations** | Known Issues | `KNOWN_ISSUES.md` |
| **Operations** | Extension Changelog | `extension/CHANGELOG.md` |

### Test Counts (March 6, 2026 — Post v1.5.97 session)

| Project | Framework | Tests | Files |
|---------|-----------|-------|-------|
| Extension (Vitest) | Vitest | 4,925 | 224 |
| Desktop (Vitest) | Vitest | 5,264 | 186 |
| Desktop (Playwright E2E) | Playwright | 90+ | 1 |
| Lambda API (Jest) | Jest | 186 | 6 |
| @aibuddy/core (Vitest) | Vitest | 202 | 12 |
| @aibuddy/prompts (Vitest) | Vitest | 174 | - |
| **Total** | | **~10,841+** | |

### External Repo Sync Status (March 6, 2026)

| External Repo | In-Tree Path | Sync Status |
|---------------|-------------|-------------|
| `ThomasWDev/aibuddy-types` | `packages/types/` | **IN SYNC** — `index.ts` md5 matches |
| `ThomasWDev/aibuddy-prompts` | `packages/prompts/` | **IN SYNC** — all .ts files match content |
| `ThomasWDev/aibuddy-logic` | `packages/core/` | **DIVERGED** — in-tree has 17 files + 12 test files (suggestions, tools, queue); external has 6 files + 2 test files (agent, parsers, services). In-tree is the canonical version with 202 tests. |

**Action:** `aibuddy-logic` needs re-sync from `packages/core/`. Run:
```bash
cp -R packages/core/src/* ~/Documents/GitHub/aibuddy-logic/src/
cp -R packages/core/tests/* ~/Documents/GitHub/aibuddy-logic/tests/
cd ~/Documents/GitHub/aibuddy-logic && pnpm test
```

### Lessons Learned (v1.5.96 Modularization Audit)

| Lesson | Detail |
|--------|--------|
| **Types and prompts are safe to share** | `@aibuddy/types` and `@aibuddy/prompts` are pure declarations with no side effects. They sync cleanly between in-tree and external repos. External devs can work on prompts without any app context. |
| **Core/logic diverges fast** | `packages/core` (in-tree) added suggestions, tools, queue, analytics modules after the initial `aibuddy-logic` extract. Always re-sync after adding features to `packages/core/`. |
| **14 files touch App.tsx** | KAN-7, 32, 33, 53, 95, 177, 179, 180, 181, 182, 183, 184, 189, 190 all modify `renderer/src/App.tsx`. Any modularization that extracts logic FROM App.tsx into a shared package must update all 14 test files. |
| **Shared test infrastructure is critical** | Desktop uses `tests/setup.ts` for global mocks (localStorage, electronAPI, fetch). Every new module must import from setup, never duplicate mocks. |
| **One commit per ticket enables traceability** | `git log --grep="KAN-136"` returns exactly one commit with the full fix. This makes `git bisect` reliable and Jira→code linking trivial. |
| **CI tests ≠ deploy success** | v1.5.96 CI: all 3 test jobs passed, all 3 build jobs passed, but 2 of 3 deploy steps failed (VSCE_PAT missing, SiteGround SSH blocked). Separate test health from deploy health in status dashboards. |

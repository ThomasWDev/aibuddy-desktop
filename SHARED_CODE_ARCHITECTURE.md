# AIBuddy Shared Code Architecture

## Overview

This document outlines the architecture for sharing code between:
- **AIBuddy VS Code Extension** (`/extension/`)
- **AIBuddy Desktop App** (`/aibuddy-desktop/`)

The goal is to **update logic once** and have it work in both apps.

---

## Current State

### VS Code Extension
- Full-featured AI coding assistant
- Uses VS Code APIs (`vscode.*`)
- Sentry + Amplitude analytics
- 1000+ files of logic

### Desktop App
- Electron-based standalone IDE
- Uses Electron APIs + custom shims
- Same AI backend (Claude via AIBuddy API)
- Reuses some extension code via adapters

---

## Recommended Architecture

### Option A: Monorepo with Shared Packages (Recommended)

```
/aibuddy/
├── packages/
│   ├── core/                    # Shared business logic
│   │   ├── src/
│   │   │   ├── ai/              # AI client, prompts, streaming
│   │   │   ├── tools/           # Tool definitions & handlers
│   │   │   ├── git/             # Git operations
│   │   │   ├── analytics/       # Sentry + Amplitude
│   │   │   ├── memory/          # Thread/workspace memory
│   │   │   └── utils/           # Shared utilities
│   │   └── package.json
│   │
│   ├── ui-components/           # Shared React components
│   │   ├── src/
│   │   │   ├── chat/
│   │   │   ├── editor/
│   │   │   └── common/
│   │   └── package.json
│   │
│   └── types/                   # Shared TypeScript types
│       ├── src/
│       └── package.json
│
├── apps/
│   ├── vscode-extension/        # VS Code specific code
│   │   ├── src/
│   │   │   ├── extension.ts     # Entry point
│   │   │   └── vscode-adapters/ # VS Code API adapters
│   │   └── package.json
│   │
│   └── desktop/                 # Electron specific code
│       ├── electron/            # Main process
│       ├── renderer/            # React UI
│       └── package.json
│
├── pnpm-workspace.yaml
└── package.json
```

### Benefits
- ✅ Single source of truth for business logic
- ✅ Type safety across packages
- ✅ Independent versioning
- ✅ Faster builds (only rebuild changed packages)
- ✅ Easy to add new platforms (web, CLI)

### Implementation Steps

1. **Create `@aibuddy/core` package**
   - Extract AI client logic
   - Extract tool definitions
   - Extract analytics (Sentry/Amplitude)
   - Extract memory system

2. **Create `@aibuddy/ui` package**
   - Extract React components
   - Use platform-agnostic APIs
   - Inject platform-specific behavior via props/context

3. **Create adapter interfaces**
   - `FileSystemAdapter` - abstract file operations
   - `TerminalAdapter` - abstract terminal operations
   - `EditorAdapter` - abstract editor operations
   - `SecretAdapter` - abstract secret storage

4. **Update apps to use packages**
   - VS Code extension imports from `@aibuddy/core`
   - Desktop app imports from `@aibuddy/core`
   - Both inject their platform-specific adapters

---

## Shared Code Candidates

### High Priority (Share Now)

| Module | Location | Effort | Impact |
|--------|----------|--------|--------|
| **Sentry/Analytics** | `extension/src/utils/sentry/` | Low | High |
| **AI Client** | `extension/src/api/` | Medium | High |
| **System Prompts** | `extension/src/agent/prompts/` | Low | High |
| **Tool Definitions** | `extension/src/agent/v1/tools/` | Medium | High |
| **Git Handler** | `extension/src/services/git/` | Low | Medium |
| **Memory System** | `extension/src/services/memory/` | Medium | Medium |

### Medium Priority (Share Later)

| Module | Location | Effort | Impact |
|--------|----------|--------|--------|
| **Chat Components** | `extension/webview-ui-vite/` | High | Medium |
| **Markdown Renderer** | `extension/webview-ui-vite/` | Medium | Medium |
| **Code Diff Viewer** | `extension/webview-ui-vite/` | Medium | Medium |

### Low Priority (Keep Separate)

| Module | Reason |
|--------|--------|
| Extension activation | VS Code specific |
| Webview provider | VS Code specific |
| Electron main process | Desktop specific |
| Window management | Desktop specific |

---

## Quick Win: Shared Analytics

The fastest way to share code is the analytics module. Here's how:

### Step 1: Create Shared Types

```typescript
// packages/core/src/analytics/types.ts
export interface AnalyticsConfig {
  sentryDsn: string
  amplitudeKey?: string
  appType: 'extension' | 'desktop'
  version: string
}

export interface BreadcrumbData {
  message: string
  category: string
  data?: Record<string, unknown>
  level?: 'info' | 'warning' | 'error'
}
```

### Step 2: Create Platform-Agnostic Analytics

```typescript
// packages/core/src/analytics/index.ts
import { AnalyticsConfig, BreadcrumbData } from './types'

export class Analytics {
  private config: AnalyticsConfig
  private sentryClient: any // Platform-specific
  
  constructor(config: AnalyticsConfig, sentryClient: any) {
    this.config = config
    this.sentryClient = sentryClient
  }
  
  trackAIRequest(data: AIRequestData): void {
    this.addBreadcrumb({
      message: `AI Request: ${data.model}`,
      category: 'ai.request',
      data,
    })
  }
  
  // ... other tracking methods
}
```

### Step 3: Platform Adapters

```typescript
// VS Code Extension
import * as Sentry from '@sentry/node'
import { Analytics } from '@aibuddy/core'

const analytics = new Analytics(config, Sentry)

// Desktop App
import * as Sentry from '@sentry/electron/main'
import { Analytics } from '@aibuddy/core'

const analytics = new Analytics(config, Sentry)
```

---

## Immediate Actions

### For Desktop App (Today)

1. ✅ Add Sentry initialization (DONE - see `src/shared/sentry.ts`)
2. ✅ Add breadcrumb tracking (DONE)
3. ⬜ Add Amplitude analytics
4. ⬜ Copy system prompts from extension

### For Shared Architecture (This Week)

1. ⬜ Create `packages/` directory structure
2. ⬜ Extract analytics to `@aibuddy/core`
3. ⬜ Extract AI client to `@aibuddy/core`
4. ⬜ Update both apps to use shared package

### For Full Monorepo (This Month)

1. ⬜ Set up pnpm workspaces
2. ⬜ Extract all shared modules
3. ⬜ Create adapter interfaces
4. ⬜ Update CI/CD for monorepo
5. ⬜ Document contribution workflow

---

## File Mapping

### Current → Shared

| Extension File | Shared Location |
|----------------|-----------------|
| `extension/src/utils/sentry/index.ts` | `packages/core/src/analytics/sentry.ts` |
| `extension/src/utils/amplitude.ts` | `packages/core/src/analytics/amplitude.ts` |
| `extension/src/api/providers/anthropic.ts` | `packages/core/src/ai/anthropic.ts` |
| `extension/src/agent/prompts/system.ts` | `packages/core/src/prompts/system.ts` |
| `extension/src/agent/v1/tools/*.ts` | `packages/core/src/tools/*.ts` |
| `extension/src/services/git/GitHandler.ts` | `packages/core/src/git/handler.ts` |
| `extension/src/services/memory/*.ts` | `packages/core/src/memory/*.ts` |

---

## Testing Shared Code

```bash
# Run tests for shared package
cd packages/core
pnpm test

# Run tests for all packages
pnpm -r test

# Type check all packages
pnpm -r typecheck
```

---

## Versioning Strategy

- Use **semantic versioning** for shared packages
- **Patch**: Bug fixes, no API changes
- **Minor**: New features, backward compatible
- **Major**: Breaking API changes

```json
// packages/core/package.json
{
  "name": "@aibuddy/core",
  "version": "1.0.0"
}

// apps/vscode-extension/package.json
{
  "dependencies": {
    "@aibuddy/core": "^1.0.0"
  }
}
```

---

## Questions to Resolve

1. **Build tool**: Turborepo vs Nx vs pnpm workspaces only?
2. **Publishing**: Publish to npm or keep internal?
3. **CI/CD**: Single pipeline or per-package?
4. **Testing**: Shared test utilities?

---

## Resources

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo](https://turbo.build/repo)
- [Nx](https://nx.dev/)
- [Electron + Monorepo](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)


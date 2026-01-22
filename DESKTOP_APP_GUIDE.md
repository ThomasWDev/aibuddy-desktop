# AIBuddy Desktop IDE - Complete Guide

**Version:** 1.0.0  
**Last Updated:** January 22, 2026  
**Repository:** https://github.com/ThomasWDev/aibuddy-desktop

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Development Setup](#development-setup)
5. [Building & Packaging](#building--packaging)
6. [Code Reuse from VS Code Extension](#code-reuse-from-vs-code-extension)
7. [IPC Handlers](#ipc-handlers)
8. [VS Code API Compatibility](#vs-code-api-compatibility)
9. [Sentry Integration](#sentry-integration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

AIBuddy Desktop is a standalone desktop IDE that reuses the core AI agent code from the AIBuddy VS Code extension. It provides:

- **Monaco Editor** - Same editor as VS Code
- **Integrated Terminal** - Full PTY support via node-pty
- **Git Integration** - Built-in Git operations via simple-git
- **AI Assistant** - Same AI agent as the VS Code extension
- **File Explorer** - Native file system access
- **Cross-Platform** - macOS, Windows, Linux support

### Key Differences from VS Code Extension

| Feature | VS Code Extension | Desktop App |
|---------|-------------------|-------------|
| Editor | VS Code's built-in | Monaco Editor |
| Terminal | VS Code's terminal | node-pty + xterm.js |
| File System | VS Code workspace API | Node.js fs module |
| IPC | vscode.postMessage | Electron IPC |
| Distribution | VS Code Marketplace | GitHub Releases |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AIBuddy Desktop Architecture                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐     IPC      ┌─────────────────────────────┐  │
│  │  Main Process   │◄────────────►│    Renderer Process         │  │
│  │  (Node.js)      │              │    (React + Monaco)         │  │
│  │                 │              │                             │  │
│  │  - File System  │              │  - Monaco Editor            │  │
│  │  - Terminal     │              │  - File Explorer            │  │
│  │  - Git          │              │  - AI Panel                 │  │
│  │  - Commands     │              │  - Terminal UI (xterm.js)   │  │
│  └─────────────────┘              └─────────────────────────────┘  │
│           │                                    │                    │
│           │                                    │                    │
│           ▼                                    ▼                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Shared Core (from VS Code Extension)            │  │
│  │                                                              │  │
│  │  - AI Agent v1 (agent/v1/)                                  │  │
│  │  - API Providers (api/providers/)                           │  │
│  │  - Language Prompts (prompts/language-specific/)            │  │
│  │  - Thread Memory (memory/)                                  │  │
│  │  - Tool Executors (tools/)                                  │  │
│  │  - Sentry/Logger (utils/sentry/, utils/logger/)             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **pnpm** (recommended) or npm
- **Git**

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/ThomasWDev/aibuddy-desktop.git
cd aibuddy-desktop

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Download Pre-built Binaries

Pre-built binaries will be available on [GitHub Releases](https://github.com/ThomasWDev/aibuddy-desktop/releases):

- **macOS**: `AIBuddy-Desktop-1.0.0-arm64.dmg` (Apple Silicon) / `AIBuddy-Desktop-1.0.0-x64.dmg` (Intel)
- **Windows**: `AIBuddy-Desktop-Setup-1.0.0.exe`
- **Linux**: `AIBuddy-Desktop-1.0.0.AppImage`

---

## Development Setup

### Project Structure

```
aibuddy-desktop/
├── electron/                 # Electron main process
│   ├── main.ts              # Main entry point
│   ├── preload.ts           # Preload script (IPC bridge)
│   └── ipc/                 # IPC handlers
│       ├── file-system.ts   # File operations
│       ├── terminal.ts      # Terminal (node-pty)
│       ├── git.ts           # Git operations (simple-git)
│       └── commands.ts      # Command registry
├── renderer/                 # React renderer
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   └── lib/             # Utilities
│   └── index.html
├── src/                      # Shared adapters
│   ├── adapters/
│   │   ├── vscode-shim.ts   # VS Code API compatibility
│   │   ├── context-adapter.ts
│   │   └── terminal-adapter.ts
│   ├── api/                 # API client
│   └── core/                # Core adapters
├── build/                    # Build configuration
│   └── electron-builder.yml
├── electron.vite.config.ts   # Vite configuration
├── package.json
└── tsconfig.json
```

### Running in Development

```bash
# Start with hot reload
pnpm dev

# Run type checking
pnpm typecheck

# Run linting
pnpm lint
```

---

## Building & Packaging

### Build for Current Platform

```bash
# Build the app
pnpm build

# Package for current platform
pnpm package
```

### Build for Specific Platforms

```bash
# macOS
pnpm package:mac

# Windows
pnpm package:win

# Linux
pnpm package:linux

# All platforms
pnpm package:all
```

### Output Locations

| Platform | Output |
|----------|--------|
| macOS | `dist/AIBuddy Desktop-1.0.0-arm64.dmg` |
| Windows | `dist/AIBuddy Desktop Setup 1.0.0.exe` |
| Linux | `dist/AIBuddy Desktop-1.0.0.AppImage` |

---

## Code Reuse from VS Code Extension

The desktop app reuses significant code from the VS Code extension:

### Directly Reused (Symlinked/Copied)

| Module | Path | Purpose |
|--------|------|---------|
| AI Agent | `extension/src/agent/v1/` | Core AI logic |
| API Providers | `extension/src/api/providers/` | Claude, OpenAI, etc. |
| Language Prompts | `extension/src/agent/v1/prompts/language-specific/` | .NET, React, etc. |
| Thread Memory | `extension/src/agent/v1/memory/` | Persistent context |
| Tool Executors | `extension/src/agent/v1/tools/` | File, terminal, etc. |
| Sentry | `extension/src/utils/sentry/` | Error tracking |
| Logger | `extension/src/utils/logger/` | Centralized logging |

### Adapted for Electron

| VS Code API | Desktop Equivalent |
|-------------|-------------------|
| `vscode.workspace.fs` | Node.js `fs` module |
| `vscode.window.createTerminal` | `node-pty` + `xterm.js` |
| `vscode.commands` | Electron IPC commands |
| `vscode.postMessage` | `ipcRenderer.invoke` |
| `vscode.ExtensionContext` | `ContextAdapter` class |

---

## IPC Handlers

### File System (`electron/ipc/file-system.ts`)

```typescript
// Available channels
'fs:readDir'      // Read directory contents
'fs:readFile'     // Read file content
'fs:writeFile'    // Write file content
'fs:createFile'   // Create new file
'fs:createDirectory' // Create directory
'fs:deletePath'   // Delete file/directory
'fs:openDialog'   // Open file dialog
'fs:saveDialog'   // Save file dialog
'fs:startWatch'   // Start file watcher
'fs:stopWatch'    // Stop file watcher
'fs:getWorkspacePath' // Get current workspace
'fs:setWorkspacePath' // Set workspace path
```

### Terminal (`electron/ipc/terminal.ts`)

```typescript
// Available channels
'terminal:create'    // Create new terminal
'terminal:runCommand' // Run command in terminal
'terminal:resize'    // Resize terminal
'terminal:kill'      // Kill terminal

// Events (from main to renderer)
'terminal:output'    // Terminal output data
'terminal:exit'      // Terminal exited
```

### Git (`electron/ipc/git.ts`)

```typescript
// Available channels
'git:status'    // Get git status
'git:diff'      // Get diff
'git:log'       // Get commit log
'git:commit'    // Create commit
'git:branch'    // List/create branches
'git:checkout'  // Checkout branch
'git:add'       // Stage files
'git:reset'     // Unstage files
'git:push'      // Push to remote
'git:pull'      // Pull from remote
```

---

## VS Code API Compatibility

The `vscode-shim.ts` provides a compatibility layer:

```typescript
import { vscode } from './adapters/vscode-shim'

// Works like VS Code API
vscode.window.showInformationMessage('Hello!')
vscode.workspace.fs.readFile(uri)
vscode.commands.registerCommand('myCommand', handler)
```

### Supported APIs

| API | Support Level |
|-----|---------------|
| `vscode.Uri` | ✅ Full |
| `vscode.workspace.fs` | ✅ Full |
| `vscode.window.showMessage*` | ✅ Full |
| `vscode.window.withProgress` | ✅ Full |
| `vscode.commands` | ✅ Full |
| `vscode.EventEmitter` | ✅ Full |
| `vscode.Disposable` | ✅ Full |
| `vscode.workspace.getConfiguration` | ⚠️ Partial |
| `vscode.languages` | ⚠️ Partial |

---

## Sentry Integration

The desktop app uses the same Sentry integration as the VS Code extension:

### Configuration

```typescript
// In electron/main.ts
import { initSentry } from '../extension/src/utils/sentry'

initSentry(contextAdapter)
```

### Breadcrumb Categories

Same as VS Code extension - see `KNOWN_ISSUES.md` for full list:

- `ai.request`, `ai.response`
- `tool.execution`, `tool.result`
- `user.chat`, `user.action`
- `git.operation`
- `file.operation`

### Sentry DSN

Uses the same DSN as the VS Code extension:
```
SENTRY_DSN=https://982b270aa75b24be5d77786b58929121@o1319003.ingest.us.sentry.io/4510695985774592
```

---

## Troubleshooting

### Common Issues

#### 1. `node-pty` Build Fails

```bash
# Rebuild native modules for Electron
pnpm postinstall
# or
npx electron-rebuild
```

#### 2. Monaco Editor Not Loading

Check that the renderer process has access to Monaco:
```typescript
// In renderer/src/components/editor/EditorArea.tsx
import Editor from '@monaco-editor/react'
```

#### 3. IPC Not Working

Ensure preload script is loaded:
```typescript
// In electron/main.ts
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  nodeIntegration: false
}
```

#### 4. File System Access Denied

Check entitlements for macOS:
```xml
<!-- build/entitlements.mac.plist -->
<key>com.apple.security.files.user-selected.read-write</key>
<true/>
```

### Debug Mode

```bash
# Run with DevTools open
pnpm dev

# Or set environment variable
DEBUG=electron-vite:* pnpm dev
```

### Logs Location

| Platform | Log Path |
|----------|----------|
| macOS | `~/Library/Logs/AIBuddy Desktop/` |
| Windows | `%APPDATA%/AIBuddy Desktop/logs/` |
| Linux | `~/.config/AIBuddy Desktop/logs/` |

---

## Related Documentation

| Document | Path | Purpose |
|----------|------|---------|
| VS Code Extension | `/Users/thomaswoodfin/Documents/GitHub/AICodingVS/extension/` | Source extension |
| Known Issues | `/Users/thomaswoodfin/Documents/GitHub/AICodingVS/KNOWN_ISSUES.md` | Bug tracking |
| Backend Migration | `/Users/thomaswoodfin/Documents/GitHub/AICodingVS/BACKEND_MIGRATION.md` | API architecture |
| API Keys | `/Users/thomaswoodfin/Documents/Hire-Programmers/tbl_site_2020/docs/API_KEYS_MASTER.md` | Credentials |
| Sentry Setup | See `KNOWN_ISSUES.md` | Error monitoring |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'feat: add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Contact:** support@aibuddy.life  
**Website:** https://aibuddy.life  
**GitHub:** https://github.com/ThomasWDev/aibuddy-desktop


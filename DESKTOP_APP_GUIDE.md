# AIBuddy Desktop IDE - Complete Guide

**Version:** 1.5.97  
**Last Updated:** March 7, 2026  
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
# Clone the MONOREPO (not just the desktop submodule)
git clone --recurse-submodules git@github.com:Thomas-Woodfin/AICodingVS.git
cd AICodingVS

# Install all workspace dependencies
pnpm install

# Build shared packages FIRST (order matters — dependencies flow top-down)
pnpm --filter @aibuddy/types build       # 1. Types (no deps)
pnpm --filter @aibuddy/prompts build     # 2. Prompts (depends: dedent)
pnpm --filter @aibuddy/core build        # 3. Core (peer: types)

# Start desktop development server
cd aibuddy-desktop
pnpm dev
```

**For the full developer onboarding guide** — including package update workflow, CI/CD pipeline, and release process — see `aibuddy-desktop/docs/MODULARIZATION_GUIDE.md`.

### Download Pre-built Binaries

**Download Page:** https://denvermobileappdeveloper.com/aibuddy-desktop/

Pre-built binaries are available:

- **macOS (Apple Silicon M1/M2/M3/M4)**: `AIBuddy-{version}-arm64.dmg`
- **macOS (Intel)**: `AIBuddy-{version}.dmg`
- **Windows (x64)**: `AIBuddy Setup {version}.exe` (NSIS installer)
- **Linux**: `AIBuddy-{version}.AppImage`, `.deb`

Also available on [GitHub Releases](https://github.com/ThomasWDev/aibuddy-desktop/releases)

### Installing a Production DMG (Local Testing)

**This is the standard way to test every new desktop build.** After installing, you can use **Cmd+Option+I** to open DevTools and see console logs, network requests, and errors live.

```bash
# 1. Kill any running AIBuddy instance FIRST
pkill -9 -f "AIBuddy" 2>/dev/null; sleep 2

# 2. Remove the old installation
rm -rf /Applications/AIBuddy.app

# 3. Mount the DMG (use -nobrowse to skip Finder)
#    Replace VERSION with the actual version (e.g. 1.5.65)
hdiutil attach release/AIBuddy-VERSION-arm64.dmg -nobrowse

# 4. Copy using ditto (preserves macOS extended attributes & code signatures)
# IMPORTANT: Use ditto, NOT cp -R (cp may strip codesign attributes)
ditto "/Volumes/AIBuddy VERSION-arm64/AIBuddy.app" "/Applications/AIBuddy.app"

# 5. Verify the installed version
plutil -p /Applications/AIBuddy.app/Contents/Info.plist | grep ShortVersion

# 6. Eject the DMG
hdiutil detach "/Volumes/AIBuddy VERSION-arm64"

# 7. Launch
open -a AIBuddy
```

### Installing on Windows

```powershell
# 1. Download the installer from GitHub Actions artifacts or the download page
#    File: "AIBuddy Setup 1.5.97.exe" (~94 MB, NSIS installer)

# 2. Run the installer
#    - Windows SmartScreen may warn "Windows protected your PC" (app is unsigned)
#    - Click "More info" → "Run anyway"

# 3. Choose install location (default: C:\Users\<user>\AppData\Local\Programs\AIBuddy)
#    - Desktop shortcut and Start Menu shortcut are created automatically

# 4. Launch AIBuddy from Start Menu or desktop shortcut
```

**Windows-Specific Notes:**

- **SmartScreen Warning**: The app is not yet code-signed with an EV certificate. Users will see a SmartScreen warning on first launch. Click "More info" → "Run anyway".
- **node-pty on Windows**: Terminal functionality uses `node-pty` which requires Windows build tools. The NSIS installer bundles pre-built native modules.
- **Log Location**: `%APPDATA%/AIBuddy Desktop/logs/`
- **DevTools**: Press `Ctrl+Shift+I` to open DevTools (equivalent of `Cmd+Option+I` on macOS)
- **Uninstall**: Use "Add or Remove Programs" in Windows Settings, or run the uninstaller from the Start Menu

### Installing on Linux

```bash
# AppImage (recommended — works on all distros)
chmod +x AIBuddy-{version}.AppImage
./AIBuddy-{version}.AppImage

# Debian/Ubuntu (.deb)
sudo dpkg -i AIBuddy-{version}.deb
```

### Testing Checklist (after every install)

1. **Version badge** -- Top-left should show `v{VERSION}` (e.g. `v1.5.65`)
2. **Open DevTools** -- Press **Cmd+Option+I** (or Menu → View → Toggle Developer Tools) to see console logs
3. **API connection** -- Console should show `[App] API URL configured:` and `[Sentry Renderer] ✅ Initialized`
4. **Credits loaded** -- Console should show `[App] Loaded cached credits:`
5. **Send a message** -- Type and send a test message; verify the AI responds
6. **Image paste** -- Paste an image (Cmd+V) and verify it compresses and attaches
7. **Open folder** -- Use Open Folder to load a project; verify terminal/file access works
8. **Check for crashes** -- If the window is blank/dark, check console for `TypeError` or other JS errors

### Viewing Logs at Runtime

| Method | How |
|--------|-----|
| **DevTools Console** | **Cmd+Option+I** → Console tab (shows renderer JS errors, API calls, breadcrumbs) |
| **DevTools Network** | **Cmd+Option+I** → Network tab (shows API request/response payloads and timing) |
| **Main process logs** | Launch from terminal: `/Applications/AIBuddy.app/Contents/MacOS/AIBuddy` (shows `[Renderer:warn]` and `[Renderer:error]` messages forwarded from the renderer) |
| **Sentry** | Errors are automatically sent to Sentry with breadcrumbs for post-mortem analysis |

**Common mistake:** If you `cp -R` while the old app is still running, macOS may silently keep the old binary. Always kill first, then remove, then copy.

**Why `ditto` instead of `cp -R`:** `ditto` preserves extended attributes, resource forks, and code signing metadata. `cp -R` can strip these, causing "damaged app" or Gatekeeper warnings.

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

### Build for Production (Full Pipeline)

```bash
# IMPORTANT: Always run tests before building
cd /Users/thomaswoodfin/Documents/GitHub/AICodingVS/aibuddy-desktop

# 1. Build the prompts package (dependency)
cd .. && pnpm --filter @aibuddy/prompts build && cd aibuddy-desktop

# 2. Run all tests (must pass)
npx vitest run

# 3. Build the renderer + main + preload
pnpm build

# 4. Package DMG (--publish never skips GitHub release upload)
npx electron-builder --mac --config --publish never

# Output: release/AIBuddy-{version}-arm64.dmg (Apple Silicon)
#         release/AIBuddy-{version}.dmg (Intel)
```

### Output Locations

| Platform | Output |
|----------|--------|
| macOS (Apple Silicon) | `release/AIBuddy-{version}-arm64.dmg` |
| macOS (Intel) | `release/AIBuddy-{version}.dmg` |
| Windows | `release/AIBuddy-{version}.exe` |
| Linux | `release/AIBuddy-{version}.AppImage` |

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
SENTRY_DSN=https://REDACTED@o1319003.ingest.us.sentry.io/REDACTED
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

#### 5. Windows SmartScreen Blocks Launch

The app is not yet signed with an EV code signing certificate. Windows SmartScreen will show "Windows protected your PC":
1. Click **More info**
2. Click **Run anyway**

To eliminate this warning permanently, a Windows EV code signing certificate is needed (`WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD` in CI secrets).

#### 6. Windows: Terminal Commands Fail

If terminal commands fail on Windows, ensure:
- PowerShell or cmd.exe is accessible on `PATH`
- `node-pty` native module was correctly bundled (check DevTools console for binding errors)

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

## Reviewing a folder on Desktop

When you want AIBuddy to **review or analyze a project that lives on your Desktop** (e.g. “review CourtEdge-NCAA-System folder on desktop”):

1. **Open that folder first.** All terminal commands run in the **currently opened workspace** only. If you have a different folder open, commands will run there instead.
2. Use **Open Folder on Desktop:** open the hamburger menu (⋮) → **Open Folder on Desktop**. The folder picker will start at your Desktop; select the project folder (e.g. `CourtEdge-NCAA-System`).
3. Then send your message (e.g. “review this folder, check today’s matchups and server errors”). The AI will run commands in the folder you just opened.

**Why “Downloads” might appear:** The app does not request “Downloads” by name. macOS may show a permission dialog the first time the app accesses a folder; the system can label it as “Downloads”, “Desktop”, or “Documents”. Using **Open Folder on Desktop** and selecting the correct folder ensures the first path you grant is the right one.

**Investigating a bad session in Sentry:** See `docs/SESSION_ANALYSIS_FOLDER_ON_DESKTOP.md` for how to list events and fetch breadcrumbs (e.g. `user.chat`, `ui.click`, `workspace`) to see which folder was open and which path was selected.

---

## Recent Fixes (v1.5.92 — March 4, 2026)

| Ticket | Issue | Fix Summary |
|--------|-------|-------------|
| KAN-191 | No "Delete All Chats" option | Added bulk delete button with native Electron dialog, 9 i18n keys, 34 locales. 17 TDD tests |
| KAN-180 | Token metrics lost after restart | Added missing fields to all 4 message hydration paths. 23 TDD tests |
| KAN-179 | No response time display | Added `responseTime` + `timestamp` to Message interface + metadata row. 21 TDD tests |
| KAN-21 | App not notarized (v2) | `notarize: false` + separate `xcrun notarytool submit` step. 35 TDD tests |
| KAN-178 | Voice dictation "Messages required" | Added `mode=transcribe` early routing in backend. 16 TDD tests |
| KAN-32 | File creation fails (v2) | `looksLikeShellCommand()` fallback for untagged code blocks. 41 TDD tests |
| KAN-33 | 2-minute response time (v2) | Full streaming pipeline: backend SSE + Lambda RESPONSE_STREAM + frontend reader. 39 TDD tests |
| KAN-95 | File attachment error (v3) | 6 Sentry-driven root causes fixed: array content, image transform, streaming rotation. 80 TDD tests |
| KAN-182 | File picker images-only | `mainWindow` + `multiSelections` + code file routing via `CODE_FILE_EXTENSIONS`. 22 TDD tests |
| KAN-181 | Tooltip hover flicker (v2) | CSS-only hover (`group-hover`), removed React state. 28 TDD tests |
| KAN-185 | Interview audio race condition | Timer only calls `stop()`, restart in `onstop` handler. 9 TDD tests |
| KAN-186 | Copy button broken | Electron clipboard fallback + "Copied!" feedback. 7 TDD tests |
| KAN-187 | No cost/tokens in interview mode | Metadata row with cost, tokens, response time, model badge. 18 TDD tests |
| KAN-188 | window.confirm behind overlay | Native `dialog.showMessage()` for interview mode clear. 7 TDD tests |
| KAN-189 | API Key Modal out of sync | Masked preview + dynamic titles on open. 4 TDD tests |
| KAN-190 | API Key chip not clickable | Changed `<span>` to `<button>` with settings click handler. 5 TDD tests |
| KAN-193 | AWS URLs exposed in source | All URLs → `process.env` config, secrets redacted. 15 TDD tests |
| CI | TypeScript errors blocking builds | Fixed 4 type errors in `App.tsx` + `aibuddy.ts`. All CI green |
| CI | Notarize config mismatch | `mac.notarize: false` + `APPLE_API_KEY_ISSUER` env var fix |

### Older Fixes (v1.5.76 – v1.5.87)

| Ticket | Issue | Fix Summary |
|--------|-------|-------------|
| KAN-53 | App skipped landing page on launch | Import + render `WelcomeScreen` when no workspace is loaded |
| KAN-54 | Simple prompts cost too much | Token-based sliding window (40K cap) + handoff doc only on first message |
| KAN-45 | File reported created but not on disk | Post-write verification + `path.join()` + workspace boundary enforcement |
| KAN-59 | Copy text not working on Mac | macOS app menu fix + Electron clipboard IPC fallback |
| KAN-62 | Microphone error recording voice | `systemPreferences.askForMediaAccess('microphone')` + IPC for status |
| KAN-95 | Server error with file attachment (v1) | Backend `transformImagesForProvider()` + truncation fix |
| KAN-17 | "Network error" on Voice Dictation | Replaced Web Speech API with `MediaRecorder` + backend Whisper transcription |
| KAN-97 | Share modal copy fails | Added `electronAPI.clipboard.writeText()` nested try-catch fallback |
| KAN-21 | App not notarized (v1) | Initial notarize config + CI env vars |
| KAN-96 | Separate image/file upload buttons | Unified Paperclip button with auto-detect routing |

### Voice Dictation Architecture (KAN-17)

The desktop app uses `MediaRecorder` + OpenAI Whisper for voice input (Web Speech API does not work in Electron):

1. `useVoiceInput.ts` hook captures audio via `MediaRecorder` (WebM/Opus)
2. Audio blob is converted to base64 and sent to `AIBUDDY_API_TRANSCRIBE_URL`
3. Backend `handleTranscription()` in `handler.js` calls OpenAI Whisper (`whisper-1`)
4. Transcript is returned and inserted into the chat input

The `InterviewPanel` uses the same pattern with 8-second auto-segmentation for continuous transcription.

### Notarization (KAN-21) — Updated March 4, 2026

macOS DMGs must be Apple-notarized to pass Gatekeeper. Our approach uses **two-phase signing**:

1. **Phase 1 — Code Signing** (electron-builder): `package.json` has `"notarize": false` (boolean). electron-builder 26.7.0 only accepts a boolean here. Signing uses `CSC_LINK` (base64 .p12) + `CSC_KEY_PASSWORD` + `APPLE_TEAM_ID`.
2. **Phase 2 — Notarization** (separate CI step): `xcrun notarytool submit` with `--key AuthKey.p8 --key-id $APPLE_API_KEY_ID --issuer $APPLE_API_KEY_ISSUER --wait`, followed by `xcrun stapler staple`.

**Why not electron-builder's built-in notarize?** electron-builder's notarize API changed between versions (object → boolean). The separate `xcrun notarytool` step gives full control over retries, logging, and env var naming.

| Env Var | Purpose |
|---------|---------|
| `CSC_LINK` | Base64-encoded .p12 signing certificate |
| `CSC_KEY_PASSWORD` | Certificate password |
| `APPLE_TEAM_ID` | Team ID for code signing |
| `APPLE_API_KEY_ID` | API key identifier for notarization |
| `APPLE_API_KEY_ISSUER` | Issuer UUID (note: `_KEY_` in name — electron-builder requires this exact format) |
| `APP_STORE_AUTH_KEY` | Base64-encoded AuthKey .p8 file |

**Local notarization**: `xcrun notarytool` with `AIBuddy-notarize` Keychain profile

**Lesson learned:** `APPLE_API_ISSUER` (without `_KEY_`) is wrong and causes electron-builder to fall back to `APPLE_APP_SPECIFIC_PASSWORD`. Always use `APPLE_API_KEY_ISSUER`.

### Clipboard (KAN-97)

`navigator.clipboard.writeText()` can fail in Electron's sandboxed renderer. Always use:
```typescript
try {
  await navigator.clipboard.writeText(text)
} catch {
  try {
    await (window as any).electronAPI?.clipboard?.writeText(text)
  } catch (err) {
    setError('Failed to copy')
  }
}
```

### Workspace Boundary Enforcement (KAN-45)

All file operations now enforce workspace boundaries. If the AI tries to access files outside the loaded workspace, it receives a clear error: `"Path is outside the current workspace. Please use the Open Folder button to load the target directory first."`

### Cost Control (KAN-54)

- **MAX_CONTEXT_TOKENS = 40,000** — Conversation history is token-capped before sending to the API
- **Handoff doc caching** — Large project handoff docs are only sent on the first message per conversation
- **Server guardrails** — AWS API caps at $2.00/request with model downgrade chain

---

## Related Documentation

| Document | Path | Purpose |
|----------|------|---------|
| VS Code Extension | `/Users/thomaswoodfin/Documents/GitHub/AICodingVS/extension/` | Source extension |
| Known Issues | `/Users/thomaswoodfin/Documents/GitHub/AICodingVS/KNOWN_ISSUES.md` | Bug tracking |
| Backend Migration | `/Users/thomaswoodfin/Documents/GitHub/AICodingVS/BACKEND_MIGRATION.md` | API architecture |
| API Keys | `/Users/thomaswoodfin/Documents/Hire-Programmers/tbl_site_2020/docs/API_KEYS_MASTER.md` | Credentials |
| Sentry Setup | See `KNOWN_ISSUES.md` | Error monitoring |
| Session analysis (folder on Desktop, Sentry breadcrumbs) | `docs/SESSION_ANALYSIS_FOLDER_ON_DESKTOP.md` | Debug “review folder on desktop” sessions |

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


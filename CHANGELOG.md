# AIBuddy Desktop - Change Log

All notable changes to AIBuddy Desktop will be documented in this file.

---

## [1.4.30] - 2026-01-24

### 🎯 Shared System Prompts Package

#### New: `@aibuddy/prompts` Integration
Desktop app now uses the shared `@aibuddy/prompts` package for system prompts:

| Component | Description |
|-----------|-------------|
| `@aibuddy/prompts` | New workspace dependency |
| `src/constants/system-prompt.ts` | Re-exports from shared package |
| `generateSystemPrompt()` | Context-aware prompt generation |
| `getLanguagePrompt()` | Language-specific expertise |

#### World-Class System Prompt
The shared prompt includes:

| Section | Description |
|---------|-------------|
| **AIBUDDY_IDENTITY** | Senior Principal Engineer expertise |
| **TDD_METHODOLOGY** | Mandatory Red → Green → Refactor workflow |
| **SENIOR_ENGINEER_APPROACH** | 4-step task checklist |
| **CODE_QUALITY_STANDARDS** | Quality hierarchy, SOLID principles |
| **COMMUNICATION_PROTOCOL** | Proactive, assumption-based style |

#### 10 Language-Specific Prompts
Each with best practices, patterns, and commands:

```
Node.js/TypeScript • React/Next.js • Flutter/Dart
Android/Kotlin • iOS/SwiftUI • .NET/C#
Python • Rust • Go • Solidity/Web3
```

### 🔍 Environment Detection

#### New: Environment Detector
- Detects installed tools, SDKs, and languages
- Priority languages: Node.js, React, Flutter, Android, iOS, .NET
- Standard languages: Python, Rust, Go, Ruby, PHP
- Blockchain: Solidity, Hardhat, Foundry
- IDEs: VS Code, Android Studio, Xcode
- File: `src/core/environment-detector.ts`

#### AI Context Injection
- Environment summary injected into system prompt
- AI knows what tools are installed before suggesting commands
- Prevents "command not found" errors

### 🏷️ Branding Updates

#### Removed Model-Specific Mentions
- Changed "Powered by Claude & DeepSeek" → "Powered by AIBuddy"
- Removed all user-facing mentions of specific AI models
- Unified branding across the application

### 📦 Architecture

#### Monorepo Integration
```
packages/prompts/           # Shared package (source of truth)
├── src/core/               # Core prompt components
├── src/languages/          # Language-specific prompts
└── src/system-prompt.ts    # Main generator

aibuddy-desktop/
└── src/constants/system-prompt.ts  # Re-exports from @aibuddy/prompts
```

---

## [1.4.29] - 2026-01-23

### 📚 Cloud Knowledge Base Feature

A major new feature that allows you to import and store your infrastructure documentation locally. Unlike Cursor, AIBuddy **remembers forever**!

#### Core Infrastructure
| Component | Description |
|-----------|-------------|
| `src/knowledge/types.ts` | Type definitions for providers, servers, credentials |
| `src/knowledge/encryption.ts` | AES-256-GCM encryption for sensitive data |
| `src/knowledge/manager.ts` | KnowledgeBaseManager with CRUD operations |
| `src/knowledge/cloud-provider-prompts.ts` | Specialized prompts for cloud providers |

#### UI Components
| Component | Description |
|-----------|-------------|
| `CloudKnowledgePanel.tsx` | Main panel for managing knowledge base |
| `ProviderCard.tsx` | Card displaying provider info and servers |
| `ImportDocumentModal.tsx` | Modal for importing documentation |

#### Features
- **Import Documentation**: Drop .md, .txt, .json, .yaml files
- **Auto-Detection**: Parses servers, API keys, domains, account IDs
- **Encrypted Storage**: Credentials stored with AES-256-GCM in `~/.aibuddy/`
- **Provider Management**: AWS, DigitalOcean, Cloudflare, Sentry, GitHub, etc.
- **SSH Integration**: Generate and copy SSH commands
- **AI Context**: Knowledge base auto-injected into AI prompts

#### Supported Providers
- ☁️ AWS
- 🌊 DigitalOcean
- 🌩️ Cloudflare
- 🐛 Sentry
- 🐙 GitHub
- 🔵 Bitbucket
- 🔥 Firebase
- ▲ Vercel
- 🌈 Google Cloud
- 🔷 Microsoft Azure
- And more...

#### How to Use
1. Click **📚 KB** button in the header
2. Click **📁 Browse Files** or **📋 Paste Text**
3. AIBuddy parses and shows detected infrastructure
4. Select a provider and click **Import**
5. AI now remembers your infrastructure forever!

---

## [1.4.28] - 2026-01-24

### Major UI/UX Overhaul 🎨

#### Simplified Child-Friendly Interface
Complete redesign focused on simplicity for young coders (8+ years old):

- **Removed cluttered panels** - No more confusing sidebar, terminal, file explorer
- **Single chat interface** - Just type what you want, AI does the rest
- **Big, colorful buttons** - Easy to understand and click
- **Hover tooltips** - Every button explains what it does

#### New Features

| Feature | Description |
|---------|-------------|
| **Credits Display** | Shows your AIBuddy credits in real-time (top right) |
| **Cost Tracking** | See how much each AI response costs |
| **Model Indicator** | Shows if Claude 🧠 or DeepSeek 🤖 responded |
| **Progress Status** | Visual feedback: Validating → Reading → Sending → Thinking → Done |
| **Low Credits Warning** | Red warning when credits < 5 |

#### Status Progress Steps
When you send a message, you see each step:
1. 🔑 Checking your API key...
2. 📂 Reading your files...
3. ☁️ Sending to AI...
4. 🧠 AI is thinking...
5. ✍️ Writing response...
6. ✅ Done!

### Bug Fixes 🐛

#### CORS Fix
- **Fixed:** "Failed to fetch" error when calling API
- **Cause:** Custom headers (`X-Requested-With`, `X-AIBuddy-API-Key`) not allowed by CORS
- **Solution:** Removed custom headers, API key sent in request body

#### Content Security Policy (CSP) Fix
- **Fixed:** Google Fonts and API calls blocked by CSP
- **Solution:** Updated CSP in both `index.html` and `main.ts` to allow:
  - `connect-src 'self' https: wss:` (all HTTPS connections)
  - `style-src-elem` for Google Fonts
  - `font-src` for Google Fonts

### Files Modified

| File | Change |
|------|--------|
| `renderer/src/App.tsx` | Complete rewrite - simplified single-page chat UI |
| `renderer/src/index.css` | Dark theme, removed Google Fonts import |
| `renderer/index.html` | Updated CSP, added Google Fonts link |
| `electron/main.ts` | Added session CSP headers |
| `renderer/src/components/layout/TopToolbar.tsx` | New horizontal toolbar |
| `renderer/src/components/layout/ActivityBar.tsx` | Simplified icons-only |

### Removed Components
- `WelcomeScreen.tsx` - No longer used (integrated into App.tsx)
- `AIPanel.tsx` - No longer used (integrated into App.tsx)
- `Sidebar.tsx` - Removed for simplicity
- `EditorArea.tsx` - Removed for simplicity
- `Panel.tsx` - Removed for simplicity

---

## Pending Tasks / TODO 📋

### 🔥 High Priority - Cloud Knowledge Base Feature
- [ ] **Create Knowledge Base UI** - Button to import cloud provider docs
- [ ] **Build Document Parser** - Parse markdown/text for server configs, API keys
- [ ] **Local Encrypted Storage** - Store credentials securely in `~/.aibuddy/`
- [ ] **AI Context Injection** - Auto-reference knowledge base before tasks
- [ ] **SSH Integration** - Connect to servers directly from app
- [ ] See full plan: `docs/CLOUD_KNOWLEDGE_BASE_PLAN.md`

### High Priority - Core Features
- [ ] Add file reading capability - show AI what files it's reading
- [ ] Add terminal command execution with user approval
- [ ] Add code editing with diff view
- [ ] Implement streaming responses for real-time output

### Medium Priority
- [ ] Add Amplitude analytics
- [ ] Copy system prompts from VS Code extension
- [ ] Copy cloud provider prompts from extension (`cloud-provider-prompts.ts`)
- [ ] Copy credential types from extension (`credential-types.ts`)
- [ ] Start monorepo setup with pnpm workspaces
- [ ] Create `@aibuddy/core` shared package

### Low Priority
- [ ] Add notification when Claude credits are low (admin alert)
- [ ] Add SMS 2FA for WordPress admin
- [ ] Set up Snapcraft token for Linux distribution
- [ ] Auto-discover `~/.ssh/config` and `~/.aws/credentials`

### Completed ✅
- [x] Fix CORS error for API calls
- [x] Fix CSP blocking Google Fonts
- [x] Add credits display
- [x] Add cost tracking per message
- [x] Add model indicator (Claude vs DeepSeek)
- [x] Add progress status steps
- [x] Simplify UI for child-friendliness
- [x] Add hover tooltips to all buttons
- [x] Remove cluttered panels

---

## [1.4.27] - 2026-01-23

### Critical Fixes 🔧

#### Sentry Module Fix
- **Fixed:** `Cannot find module '@sentry/node'` crash on app launch
- **Solution:** Replaced `@sentry/electron` with a lightweight HTTP-based Sentry implementation
- **Benefit:** No more native module issues with Electron's asar packaging

#### UI Improvements
- **Redesigned Welcome Screen** with modern gradient aesthetics
- **Removed:** Documentation and GitHub links (were pointing to wrong URLs)
- **Added:** "Buy Credits" button linking to https://aibuddy.life/pricing
- **Fixed:** Buttons now properly clickable (z-index and event handling fixed)
- **Updated:** Footer now shows "AIBuddy Desktop"
- **Updated:** All "Powered by" text now shows "Powered by AIBuddy"

#### Files Modified
| File | Change |
|------|--------|
| `src/shared/sentry.ts` | Replaced @sentry/electron with HTTP-based implementation |
| `renderer/src/lib/sentry.ts` | Replaced @sentry/electron/renderer with HTTP-based implementation |
| `renderer/src/components/welcome/WelcomeScreen.tsx` | Complete UI redesign |
| `package.json` | Removed @sentry/electron dependency |

---

## [1.4.20] - 2026-01-23

### DeepSeek R1/V3 Integration 🧠

#### New AI Models
AIBuddy Desktop now supports **DeepSeek R1 and V3** models alongside Claude Opus 4.5!

| Model | ID | Best For | Cost Savings |
|-------|-----|----------|--------------|
| DeepSeek R1 | `deepseek-reasoner` | Math, reasoning, proofs | **97% cheaper** |
| DeepSeek V3 | `deepseek-chat` | General chat | **98% cheaper** |

#### Smart Routing
The backend automatically routes requests based on task type:
- **Math/reasoning keywords** → DeepSeek R1
- **Agentic/tool keywords** → Claude Opus 4.5
- **Default** → Claude Opus 4.5

#### Files Modified
| File | Change |
|------|--------|
| `src/api/aibuddy-client.ts` | Added model mapping, task detection |

---

### Version Sync with Extension

- Synced version to 1.4.20 to match VS Code extension
- All platforms built and released

#### Downloads
| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `AIBuddy-1.4.20-arm64.dmg` |
| macOS (Intel) | `AIBuddy-1.4.20.dmg` |
| Windows | `AIBuddy-Setup-1.4.20.exe` |
| Linux x64 | `AIBuddy-1.4.20.AppImage` |
| Linux ARM64 | `AIBuddy-1.4.20-arm64.AppImage` |
| Linux DEB x64 | `aibuddy-desktop_1.4.20_amd64.deb` |
| Linux DEB ARM64 | `aibuddy-desktop_1.4.20_arm64.deb` |

---

## [1.0.0] - 2026-01-22

### Initial Release 🎉

#### Features
- Full desktop IDE built with Electron
- Monaco Editor for code editing
- Integrated terminal (node-pty + xterm.js)
- Git integration (simple-git)
- File explorer with tree view
- AI chat panel with Claude Opus 4.5
- Sentry error tracking

#### Technology Stack
| Component | Technology |
|-----------|------------|
| Framework | Electron 28 |
| Editor | Monaco Editor |
| Terminal | node-pty + xterm.js |
| Git | simple-git |
| UI | React + Tailwind CSS |
| Build | electron-vite |
| Analytics | Sentry |

#### Repository
- **GitHub:** https://github.com/ThomasWDev/aibuddy-desktop
- **Releases:** https://github.com/ThomasWDev/aibuddy-desktop/releases

#### Quick Start
```bash
pnpm install
pnpm dev
```

#### Build Commands
```bash
pnpm build           # Build the app
pnpm package:mac     # Package for macOS
pnpm package:win     # Package for Windows
pnpm package:linux   # Package for Linux
```

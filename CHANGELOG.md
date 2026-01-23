# AIBuddy Desktop - Change Log

All notable changes to AIBuddy Desktop will be documented in this file.

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


# AIBuddy Desktop

Your intelligent coding partner - now as a standalone desktop application.

![AIBuddy Desktop](https://aibuddy.life/images/desktop-preview.png)

## Features

- **Full IDE Experience**: Monaco editor with syntax highlighting, IntelliSense, and more
- **AI-Powered Coding**: Claude-powered assistant that understands your codebase
- **Integrated Terminal**: Built-in terminal with full shell support
- **Git Integration**: Commit, push, pull, and manage branches without leaving the app
- **Cross-Platform**: Available for Windows, macOS, and Linux

## Installation

### Download

Download the latest release for your platform:

- **macOS**: [AIBuddy-x.x.x.dmg](https://github.com/ThomasWDev/aibuddy-desktop/releases)
- **Windows**: [AIBuddy-x.x.x-Setup.exe](https://github.com/ThomasWDev/aibuddy-desktop/releases)
- **Linux**: [AIBuddy-x.x.x.AppImage](https://github.com/ThomasWDev/aibuddy-desktop/releases)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/ThomasWDev/aibuddy-desktop.git
cd aibuddy-desktop

# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Package for your platform
pnpm package
```

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Project Structure

```
aibuddy-desktop/
├── electron/           # Electron main process
│   ├── main.ts        # Main entry point
│   ├── preload.ts     # Preload script
│   └── ipc/           # IPC handlers
├── renderer/          # React renderer
│   └── src/
│       ├── components/
│       ├── hooks/
│       └── lib/
├── src/               # Shared code
│   ├── adapters/      # VS Code API shims
│   ├── api/           # API clients
│   └── core/          # Core logic
└── build/             # Build resources
```

### Scripts

```bash
# Development
pnpm dev              # Start in development mode
pnpm build            # Build for production

# Packaging
pnpm package          # Package for current platform
pnpm package:mac      # Package for macOS
pnpm package:win      # Package for Windows
pnpm package:linux    # Package for Linux
pnpm package:all      # Package for all platforms

# Testing
pnpm lint             # Run linter
pnpm typecheck        # Run type checker
```

## Architecture

AIBuddy Desktop is built with:

- **Electron**: Cross-platform desktop framework
- **React**: UI framework
- **Monaco Editor**: Code editor (same as VS Code)
- **xterm.js**: Terminal emulator
- **node-pty**: PTY for terminal
- **simple-git**: Git operations

The app reuses ~80% of the code from the AIBuddy VS Code extension, with adapters to replace VS Code-specific APIs.

## Configuration

Settings are stored in:

- **macOS**: `~/Library/Application Support/aibuddy-desktop/`
- **Windows**: `%APPDATA%/aibuddy-desktop/`
- **Linux**: `~/.config/aibuddy-desktop/`

## API Key

To use AIBuddy, you need an API key:

1. Sign up at [aibuddy.life](https://aibuddy.life)
2. Get your API key from the dashboard
3. Enter it in AIBuddy Desktop settings

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- **Documentation**: [aibuddy.life/docs](https://aibuddy.life/docs)
- **Issues**: [GitHub Issues](https://github.com/ThomasWDev/aibuddy-desktop/issues)
- **Discord**: [Join our community](https://discord.gg/aibuddy)

---

Made with ❤️ by [AIBuddy Studio](https://aibuddy.life)


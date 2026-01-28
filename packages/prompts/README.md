# @aibuddy/prompts

Shared system prompts for AIBuddy across all platforms.

## Installation

```bash
pnpm add @aibuddy/prompts
```

## Usage

### Basic Usage

```typescript
import { generateSystemPrompt } from '@aibuddy/prompts'

const prompt = generateSystemPrompt({
  workspacePath: '/path/to/project',
  projectType: 'React/TypeScript',
})
```

### With Environment Detection

```typescript
import { generateSystemPrompt, getLanguagePrompt } from '@aibuddy/prompts'

const prompt = generateSystemPrompt({
  workspacePath: '/path/to/project',
  projectType: 'Android/Kotlin',
  environmentSummary: `
## Development Environment
- Android Studio installed
- Kotlin 1.9.22
- Gradle 8.2
  `,
  languagePrompt: getLanguagePrompt('android'),
})
```

### Individual Components

```typescript
import {
  AIBUDDY_IDENTITY,
  TDD_METHODOLOGY,
  SENIOR_ENGINEER_APPROACH,
  CODE_QUALITY_STANDARDS,
  COMMUNICATION_PROTOCOL,
} from '@aibuddy/prompts'

// Use individual components for customization
const customPrompt = `${AIBUDDY_IDENTITY}\n\n${TDD_METHODOLOGY}`
```

### Language-Specific Prompts

```typescript
import {
  NODEJS_PROMPT,
  REACT_PROMPT,
  FLUTTER_PROMPT,
  ANDROID_PROMPT,
  IOS_PROMPT,
  DOTNET_PROMPT,
  PYTHON_PROMPT,
  RUST_PROMPT,
  GO_PROMPT,
  SOLIDITY_PROMPT,
} from '@aibuddy/prompts'
```

## Prompt Structure

The system prompt is composed of:

1. **Identity** - Who AIBuddy is and its mission
2. **TDD Methodology** - Mandatory test-driven development workflow
3. **Senior Engineer Approach** - Systematic task approach
4. **Code Quality Standards** - Quality hierarchy and best practices
5. **Communication Protocol** - How to communicate with users

## Security

The `knowledgeContext` parameter should NEVER contain sensitive information:
- ❌ IP addresses
- ❌ SSH credentials
- ❌ API keys
- ❌ Account IDs

Only include:
- ✅ Provider names (e.g., "AWS", "DigitalOcean")
- ✅ Server names (e.g., "Production Server")
- ✅ Region information (e.g., "us-east-2")

## Supported Languages

| Language | Prompt |
|----------|--------|
| Node.js / TypeScript | `NODEJS_PROMPT` |
| React / Next.js | `REACT_PROMPT` |
| Flutter / Dart | `FLUTTER_PROMPT` |
| Android / Kotlin | `ANDROID_PROMPT` |
| iOS / SwiftUI | `IOS_PROMPT` |
| .NET / C# | `DOTNET_PROMPT` |
| Python | `PYTHON_PROMPT` |
| Rust | `RUST_PROMPT` |
| Go | `GO_PROMPT` |
| Solidity / Web3 | `SOLIDITY_PROMPT` |

## License

MIT

